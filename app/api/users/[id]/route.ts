import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getPrisma(getNetwork(request));

  const [user, completedSwaps, proofs] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        teachSkill: true,
        learnSkill: true,
        createdAt: true,
      },
    }),
    db.swap.count({
      where: {
        OR: [{ initiatorId: id }, { receiverId: id }],
        status: "COMPLETED",
      },
    }),
    db.proof.findMany({
      where: {
        swap: { OR: [{ initiatorId: id }, { receiverId: id }] },
      },
      select: {
        id: true,
        teachSkill: true,
        learnSkill: true,
        chainStatus: true,
        chainTxHash: true,
        network: true,
        createdAt: true,
        anchoredAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    completedSwaps,
    proofsEarned: proofs.length,
    reputationScore: completedSwaps * 10,
    proofs,
  });
}
