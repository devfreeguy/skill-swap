import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";

export async function GET(request: NextRequest) {
  const db = getPrisma(getNetwork(request));

  const [total, swaps] = await Promise.all([
    db.swap.count({ where: { status: "COMPLETED" } }),
    db.swap.findMany({
      where: { status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 3,
      select: {
        id: true,
        initiatorSkill: true,
        receiverSkill: true,
        completedAt: true,
        initiator: { select: { name: true } },
        receiver: { select: { name: true } },
        proof: { select: { chainStatus: true } },
      },
    }),
  ]);

  const records = swaps.map((swap, i) => ({
    id: `#${String(total - i).padStart(5, "0")}`,
    skill: swap.initiatorSkill ?? swap.receiverSkill ?? "Skill Exchange",
    initiatorName: swap.initiator.name,
    receiverName: swap.receiver.name,
    completedAt: swap.completedAt?.toISOString() ?? new Date().toISOString(),
    verified: swap.proof?.chainStatus === "ANCHORED",
  }));

  return NextResponse.json(records);
}
