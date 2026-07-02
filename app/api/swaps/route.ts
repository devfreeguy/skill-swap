import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { emitToUser } from "@/lib/socket";
import { submitTx } from "@/lib/cardano/providers";
import { signedTxPaysAtLeast } from "@/lib/cardano/fee-verify";
import {
  PAYMENTS_ENABLED,
  PLATFORM_WALLET_ADDRESS,
  SWAP_FEE_LOVELACE,
} from "@/lib/cardano/fee";

// Submitting the fee payment tx runs on Node.
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const swaps = await prisma.swap.findMany({
    where: {
      OR: [{ initiatorId: currentUser.id }, { receiverId: currentUser.id }],
    },
    include: {
      initiator: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          teachSkill: true,
          learnSkill: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          teachSkill: true,
          learnSkill: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(swaps);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const body = await request.json();
  const { receiverId, initiatorSkill, receiverSkill, adaTxHash, signedPaymentTx, refundAddress } =
    body;

  if (!receiverId) {
    return NextResponse.json(
      { error: "receiverId is required" },
      { status: 400 },
    );
  }

  if (!initiatorSkill || !receiverSkill) {
    return NextResponse.json(
      { error: "Please choose which skills to exchange." },
      { status: 400 },
    );
  }

  // One conversation per pair at a time: block a new swap if there's already a
  // pending or active one with this person (in either direction). Concurrent
  // swaps with *different* people are still allowed.
  const ongoing = await prisma.swap.findFirst({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      OR: [
        { initiatorId: currentUser.id, receiverId },
        { initiatorId: receiverId, receiverId: currentUser.id },
      ],
    },
    select: { id: true },
  });
  if (ongoing) {
    return NextResponse.json(
      {
        error:
          "You already have an ongoing swap with this person. Complete it before starting another.",
        swapId: ongoing.id,
      },
      { status: 409 },
    );
  }

  // Don't allow re-swapping the same skill pair you've already completed with
  // this person (a different skill exchange with them later is fine). The pair
  // is matched in both directions.
  const alreadyExchanged = await prisma.swap.findFirst({
    where: {
      status: "COMPLETED",
      OR: [
        { initiatorId: currentUser.id, receiverId, initiatorSkill, receiverSkill },
        {
          initiatorId: receiverId,
          receiverId: currentUser.id,
          initiatorSkill: receiverSkill,
          receiverSkill: initiatorSkill,
        },
      ],
    },
    select: { id: true },
  });
  if (alreadyExchanged) {
    return NextResponse.json(
      {
        error:
          "You've already completed this skill exchange with this person. Pick different skills.",
      },
      { status: 409 },
    );
  }

  // Platform fee: only after all the "can this swap even be created" guards
  // pass do we take payment, so we never move money for a request we'd reject.
  // The initiator's wallet already built + signed a tx paying the fee to the
  // platform address. We decode that signed tx and verify its outputs *here* —
  // no waiting for on-chain confirmation — so a valid fee lets the swap proceed
  // instantly. A signed tx can't be tampered with, so its outputs are
  // trustworthy; the decline refund path re-verifies on-chain before paying
  // anything back, which covers the rare dropped/double-spent tx.
  let feeFields: {
    feeTxHash?: string;
    feeLovelace?: number;
    refundAddress?: string;
    paymentStatus?: string;
  } = {};

  if (PAYMENTS_ENABLED) {
    if (!signedPaymentTx || !refundAddress) {
      return NextResponse.json(
        { error: "A signed swap-fee payment is required." },
        { status: 400 },
      );
    }

    const paysEnough = await signedTxPaysAtLeast(
      signedPaymentTx,
      PLATFORM_WALLET_ADDRESS,
      BigInt(SWAP_FEE_LOVELACE),
    );
    if (!paysEnough) {
      return NextResponse.json(
        { error: "The swap-fee payment is invalid or too small." },
        { status: 400 },
      );
    }

    let feeTxHash: string;
    try {
      ({ txHash: feeTxHash } = await submitTx(signedPaymentTx));
    } catch {
      return NextResponse.json(
        { error: "Couldn't submit the swap-fee payment. Please try again." },
        { status: 502 },
      );
    }
    feeFields = {
      feeTxHash,
      feeLovelace: SWAP_FEE_LOVELACE,
      refundAddress,
      // Verified from the signed tx itself — the receiver can accept right away.
      paymentStatus: "CONFIRMED",
    };
  }

  const swap = await prisma.swap.create({
    data: {
      initiatorId: currentUser.id,
      receiverId,
      initiatorSkill,
      receiverSkill,
      ...(adaTxHash ? { adaTxHash } : {}),
      ...feeFields,
      status: "PENDING",
    },
  });

  const requestMessage = `${currentUser.name} wants to learn ${receiverSkill} and will teach you ${initiatorSkill}.`;
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "SWAP_REQUEST",
      message: requestMessage,
      swapId: swap.id,
    },
  });

  emitToUser(receiverId, "notification:new", {
    type: "SWAP_REQUEST",
    message: requestMessage,
    swapId: swap.id,
  });

  return NextResponse.json(swap, { status: 201 });
}
