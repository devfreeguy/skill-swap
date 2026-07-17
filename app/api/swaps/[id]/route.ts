import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/api";
import { getNetwork } from "@/lib/network";
import { emitToUser, emitToSwap } from "@/lib/socket";
import { verifyPaymentTx } from "@/lib/cardano/providers";
import { refundFee } from "@/lib/cardano/refund";
import { getFeeConfig } from "@/lib/cardano/fee";
import type { PrismaClient } from "@/app/generated/prisma/client";
import type { ActiveNetwork } from "@/lib/network";

// crypto (proof hashing) + on-chain fee settlement need the Node runtime.
export const runtime = "nodejs";

type FeeSwap = {
  id: string;
  status: string;
  feeTxHash: string | null;
  feeLovelace: number | null;
  refundAddress: string | null;
  paymentStatus: string | null;
};

/**
 * Refund the fee to the initiator after a decline. The fee was confirmed
 * optimistically at request time (decoded from the signed tx), so before moving
 * any money we RE-VERIFY on-chain that the fee tx actually landed — this is the
 * safety net against the rare dropped/double-spent tx. Best-effort, idempotent,
 * never throws:
 *   - fee already refunded            → no-op
 *   - fee not on-chain yet            → park at REFUND_PENDING (GET retries)
 *   - fee on-chain but too small/gone → mark FAILED, refund nothing
 *   - fee confirmed                   → submit the refund from the platform wallet
 */
async function issueDeclineRefund(
  swap: FeeSwap,
  db: PrismaClient,
  network: ActiveNetwork
): Promise<void> {
  const { PAYMENTS_ENABLED, PLATFORM_WALLET_ADDRESS, SWAP_FEE_LOVELACE } =
    getFeeConfig(network);
  if (!PAYMENTS_ENABLED || !swap.feeTxHash || !swap.refundAddress) return;
  if (swap.paymentStatus === "REFUNDED") return;

  const check = await verifyPaymentTx(
    swap.feeTxHash,
    PLATFORM_WALLET_ADDRESS,
    BigInt(swap.feeLovelace ?? SWAP_FEE_LOVELACE),
    network
  );
  if (check === "PENDING") {
    // Fee not on-chain yet — defer; a later GET on the declined swap retries.
    await db.swap.update({
      where: { id: swap.id },
      data: { paymentStatus: "REFUND_PENDING" },
    });
    return;
  }
  if (check === "INSUFFICIENT") {
    // The fee never actually landed (dropped / double-spent) — refund nothing.
    await db.swap.update({
      where: { id: swap.id },
      data: { paymentStatus: "FAILED" },
    });
    return;
  }

  try {
    const refundTxHash = await refundFee({
      toAddress: swap.refundAddress,
      lovelace: swap.feeLovelace ?? SWAP_FEE_LOVELACE,
      network,
    });
    await db.swap.update({
      where: { id: swap.id },
      data: { paymentStatus: "REFUNDED", refundTxHash },
    });
  } catch (e) {
    console.error("Swap fee refund failed:", swap.id, e);
    await db.swap.update({
      where: { id: swap.id },
      data: { paymentStatus: "REFUND_PENDING" },
    });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;
  const network = getNetwork(request);

  const { id } = await params;

  const swap = await db.swap.findUnique({
    where: { id },
    include: {
      initiator: {
        select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
      },
      receiver: {
        select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
      },
      deliveries: {
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          resourceLink: true,
          notes: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          submittedAt: true,
        },
      },
      proof: {
        select: {
          id: true,
          teachSkill: true,
          learnSkill: true,
          summary: true,
          metadataHash: true,
          chainTxHash: true,
          chainStatus: true,
          network: true,
          createdAt: true,
        },
      },
    },
  });

  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { PAYMENTS_ENABLED } = getFeeConfig(network);

  // Retry a refund that was deferred because the fee hadn't confirmed on-chain
  // at decline time, so the UI reflects the eventual REFUNDED / FAILED outcome.
  if (
    PAYMENTS_ENABLED &&
    swap.feeTxHash &&
    swap.status === "DECLINED" &&
    swap.paymentStatus === "REFUND_PENDING"
  ) {
    await issueDeclineRefund(swap, db, network);
    const fresh = await db.swap.findUnique({
      where: { id },
      select: { paymentStatus: true, refundTxHash: true },
    });
    if (fresh) {
      swap.paymentStatus = fresh.paymentStatus;
      swap.refundTxHash = fresh.refundTxHash;
    }
  }

  return NextResponse.json(swap);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;
  const network = getNetwork(request);
  const { PAYMENTS_ENABLED, SWAP_FEE_LOVELACE } = getFeeConfig(network);

  const { id } = await params;
  const body = await request.json();
  const { action } = body as {
    action: "accept" | "decline" | "complete" | "cancel";
  };

  const swap = await db.swap.findUnique({ where: { id } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isInitiator = swap.initiatorId === currentUser.id;
  const isReceiver = swap.receiverId === currentUser.id;

  if (!isInitiator && !isReceiver) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "accept") {
    if (!isReceiver) {
      return NextResponse.json(
        { error: "Only receiver can accept" },
        { status: 403 }
      );
    }
    if (swap.status !== "PENDING") {
      return NextResponse.json(
        { error: "Swap is not pending" },
        { status: 400 }
      );
    }

    // The fee was verified from the signed tx at request time, so acceptance is
    // instant — just a defensive check that it's in the expected state.
    if (
      PAYMENTS_ENABLED &&
      swap.feeTxHash &&
      swap.paymentStatus !== "CONFIRMED"
    ) {
      return NextResponse.json(
        { error: "The swap-fee payment couldn't be verified." },
        { status: 400 }
      );
    }

    const updated = await db.swap.update({
      where: { id },
      data: {
        status: "ACTIVE",
        ...(PAYMENTS_ENABLED && swap.feeTxHash
          ? { paymentStatus: "KEPT" }
          : {}),
      },
    });
    await db.notification.create({
      data: {
        userId: swap.initiatorId,
        type: "SWAP_ACCEPTED",
        message: `Your swap request was accepted!`,
        swapId: id,
      },
    });
    await db.message.create({
      data: {
        swapId: id,
        senderId: swap.receiverId,
        content: "Swap accepted",
        type: "SWAP_ACCEPTED",
      },
    });
    emitToUser(swap.initiatorId, "notification:new", {
      type: "SWAP_ACCEPTED",
      message: "Your swap request was accepted!",
      swapId: id,
    });
    emitToSwap(id, "swap:update");
    return NextResponse.json(updated);
  }

  if (action === "decline") {
    if (!isReceiver) {
      return NextResponse.json(
        { error: "Only receiver can decline" },
        { status: 403 }
      );
    }
    if (swap.status !== "PENDING") {
      return NextResponse.json(
        { error: "Swap is not pending" },
        { status: 400 }
      );
    }
    const updated = await db.swap.update({
      where: { id },
      data: { status: "DECLINED" },
    });

    // Declining is the only path that refunds the initiator's fee.
    await issueDeclineRefund(swap, db, network);

    await db.notification.create({
      data: {
        userId: swap.initiatorId,
        type: "SWAP_DECLINED",
        message: `Your swap request was declined.`,
        swapId: id,
      },
    });
    await db.message.create({
      data: {
        swapId: id,
        senderId: swap.receiverId,
        content: "Swap declined",
        type: "SWAP_DECLINED",
      },
    });
    emitToUser(swap.initiatorId, "notification:new", {
      type: "SWAP_DECLINED",
      message: "Your swap request was declined.",
      swapId: id,
    });
    emitToSwap(id, "swap:update");
    return NextResponse.json(updated);
  }

  if (action === "complete") {
    if (swap.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Swap must be active to mark complete" },
        { status: 400 }
      );
    }

    // Completion gate: a party may only confirm once they've delivered at least
    // one item. Since each side must deliver before confirming, "both confirmed"
    // also guarantees "both delivered" - the single, well-defined completion rule.
    const [myDeliveryCount, initiatorCount, receiverCount] = await Promise.all([
      db.delivery.count({ where: { swapId: id, userId: currentUser.id } }),
      db.delivery.count({ where: { swapId: id, userId: swap.initiatorId } }),
      db.delivery.count({ where: { swapId: id, userId: swap.receiverId } }),
    ]);

    if (myDeliveryCount === 0) {
      return NextResponse.json(
        { error: "Add at least one deliverable before confirming completion." },
        { status: 400 }
      );
    }

    const updateData: { initiatorDone?: boolean; receiverDone?: boolean } = {};
    if (isInitiator) updateData.initiatorDone = true;
    if (isReceiver) updateData.receiverDone = true;

    const updated = await db.swap.update({
      where: { id },
      data: updateData,
    });

    const bothDone =
      (isInitiator ? true : swap.initiatorDone) &&
      (isReceiver ? true : swap.receiverDone);
    const bothDelivered = initiatorCount > 0 && receiverCount > 0;

    if (bothDone && bothDelivered) {
      const existingProof = await db.proof.findUnique({
        where: { swapId: id },
      });

      if (!existingProof) {
        const [initiator, receiver, deliveries] = await Promise.all([
          db.user.findUnique({ where: { id: swap.initiatorId } }),
          db.user.findUnique({ where: { id: swap.receiverId } }),
          db.delivery.findMany({ where: { swapId: id } }),
        ]);

        const summary =
          deliveries.length > 0
            ? deliveries
                .map((d) => d.title || d.resourceLink || d.notes)
                .filter(Boolean)
                .join(" | ")
            : undefined;

        // Deterministic content hash anchored on-chain. Reproducible from
        // stored data (swap, participants, skills, deliverables) so the chain
        // record can be independently re-verified later.
        const proofPayload = {
          swap: id,
          initiator: swap.initiatorId,
          receiver: swap.receiverId,
          teach: swap.initiatorSkill ?? initiator?.teachSkill ?? "",
          learn: swap.receiverSkill ?? initiator?.learnSkill ?? "",
          deliverables: deliveries
            .map((d) => `${d.type}:${d.resourceLink ?? d.notes ?? d.title ?? ""}`)
            .sort(),
        };
        const metadataHash = crypto
          .createHash("sha256")
          .update(JSON.stringify(proofPayload))
          .digest("hex");

        await db.$transaction([
          db.swap.update({ where: { id }, data: { status: "COMPLETED" } }),
          // Proof is created off-chain immediately; the on-chain anchor is a
          // separate, retryable step (POST /api/swaps/[id]/anchor).
          db.proof.create({
            data: {
              swapId: id,
              userId: swap.initiatorId,
              teachSkill: swap.initiatorSkill ?? initiator?.teachSkill ?? "",
              learnSkill: swap.receiverSkill ?? initiator?.learnSkill ?? "",
              network,
              chainStatus: "PENDING",
              metadataHash,
              ...(summary && { summary }),
            },
          }),
          db.notification.createMany({
            data: [
              {
                userId: swap.initiatorId,
                type: "SWAP_COMPLETED",
                message: `Your swap with ${receiver?.name} is complete!`,
                swapId: id,
              },
              {
                userId: swap.receiverId,
                type: "SWAP_COMPLETED",
                message: `Your swap with ${initiator?.name} is complete!`,
                swapId: id,
              },
            ],
          }),
          db.message.create({
            data: {
              swapId: id,
              senderId: swap.initiatorId,
              content: "Swap completed",
              type: "PROOF_CREATED",
            },
          }),
        ]);

        emitToUser(swap.initiatorId, "notification:new", {
          type: "SWAP_COMPLETED",
          message: `Your swap with ${receiver?.name} is complete!`,
          swapId: id,
        });
        emitToUser(swap.receiverId, "notification:new", {
          type: "SWAP_COMPLETED",
          message: `Your swap with ${initiator?.name} is complete!`,
          swapId: id,
        });
        emitToSwap(id, "swap:update");

        return NextResponse.json({ ...updated, status: "COMPLETED" });
      }

      await db.swap.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
      emitToSwap(id, "swap:update");
      return NextResponse.json({ ...updated, status: "COMPLETED" });
    }

    // One side confirmed - let the other side's open swap view update live.
    emitToSwap(id, "swap:update");
    return NextResponse.json(updated);
  }

  if (action === "cancel") {
    if (swap.status !== "ACTIVE" && swap.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending or active swaps can be cancelled" },
        { status: 400 }
      );
    }

    const updated = await db.swap.update({
      where: { id },
      data: {
        status: "CANCELLED",
        // Cancelling is not a decline — the fee is not refunded.
        ...(PAYMENTS_ENABLED && swap.feeTxHash ? { paymentStatus: "KEPT" } : {}),
      },
    });

    const otherUserId = isInitiator ? swap.receiverId : swap.initiatorId;
    const cancelMessage = `${currentUser.name} cancelled the swap.`;
    await db.notification.create({
      data: {
        userId: otherUserId,
        type: "SWAP_DECLINED",
        message: cancelMessage,
        swapId: id,
      },
    });

    emitToUser(otherUserId, "notification:new", {
      type: "SWAP_DECLINED",
      message: cancelMessage,
      swapId: id,
    });
    emitToSwap(id, "swap:update");

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
