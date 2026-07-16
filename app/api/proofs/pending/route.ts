import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

/** Returns completed swaps where the current user is a participant and the proof still needs anchoring. */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: { id: userId }, db } = auth;

  const swaps = await db.swap.findMany({
    where: {
      OR: [{ initiatorId: userId }, { receiverId: userId }],
      status: "COMPLETED",
      proof: { chainStatus: { in: ["PENDING", "FAILED"] } },
    },
    include: {
      proof: {
        select: { metadataHash: true, network: true, chainStatus: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    swaps
      .filter((s) => s.proof?.metadataHash)
      .map((s) => ({
        swapId: s.id,
        metadataHash: s.proof!.metadataHash!,
        network: s.proof!.network ?? "preprod",
        chainStatus: s.proof!.chainStatus,
      }))
  );
}
