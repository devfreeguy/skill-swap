import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { submitTx, isTxConfirmed } from "@/lib/cardano/providers";
import { emitToSwap } from "@/lib/socket";

// Provider submission/confirmation runs on Node.
export const runtime = "nodejs";

async function loadParticipantSwap(id: string, userId: string) {
  const swap = await prisma.swap.findUnique({
    where: { id },
    include: { proof: true },
  });
  if (!swap) return { error: "Swap not found", status: 404 as const };
  const isParticipant =
    swap.initiatorId === userId || swap.receiverId === userId;
  if (!isParticipant) return { error: "Forbidden", status: 403 as const };
  return { swap };
}

/**
 * Anchor a completed swap's proof on-chain. The client builds + signs the
 * metadata tx with their wallet and posts the signed CBOR here; we submit it
 * through the provider fallback chain and record the tx hash.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const { id } = await params;
  const { signedTx } = (await request.json()) as { signedTx?: string };
  if (!signedTx) {
    return NextResponse.json({ error: "signedTx is required" }, { status: 400 });
  }

  const result = await loadParticipantSwap(id, currentUser.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { swap } = result;

  if (swap.status !== "COMPLETED" || !swap.proof) {
    return NextResponse.json(
      { error: "Swap must be completed before anchoring." },
      { status: 400 }
    );
  }
  if (swap.proof.chainStatus === "ANCHORED") {
    return NextResponse.json({
      chainStatus: "ANCHORED",
      chainTxHash: swap.proof.chainTxHash,
    });
  }

  let txHash: string;
  try {
    ({ txHash } = await submitTx(signedTx));
  } catch {
    await prisma.proof.update({
      where: { swapId: id },
      data: { chainStatus: "FAILED" },
    });
    return NextResponse.json(
      { error: "Couldn't submit the proof transaction. Please try again." },
      { status: 502 }
    );
  }

  const updated = await prisma.proof.update({
    where: { swapId: id },
    data: { chainTxHash: txHash, chainStatus: "ANCHORING", anchoredAt: null },
  });

  emitToSwap(id, "swap:update");

  return NextResponse.json({
    chainStatus: updated.chainStatus,
    chainTxHash: txHash,
  });
}

/** Poll confirmation status; flips ANCHORING → ANCHORED once on-chain. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const { id } = await params;
  const result = await loadParticipantSwap(id, currentUser.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const proof = result.swap.proof;
  if (!proof) {
    return NextResponse.json({ error: "No proof to anchor" }, { status: 404 });
  }

  if (
    proof.chainStatus === "ANCHORING" &&
    proof.chainTxHash &&
    (await isTxConfirmed(proof.chainTxHash))
  ) {
    const updated = await prisma.proof.update({
      where: { swapId: id },
      data: { chainStatus: "ANCHORED", anchoredAt: new Date() },
    });
    emitToSwap(id, "swap:update");
    return NextResponse.json({
      chainStatus: "ANCHORED",
      chainTxHash: updated.chainTxHash,
    });
  }

  return NextResponse.json({
    chainStatus: proof.chainStatus,
    chainTxHash: proof.chainTxHash,
  });
}
