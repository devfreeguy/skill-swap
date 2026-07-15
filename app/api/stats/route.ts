import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";
import { parseSkills } from "@/lib/skills";

/**
 * Public endpoint — platform-wide aggregate stats for the landing page.
 * No authentication required.
 */
export async function GET(request: NextRequest) {
  const db = getPrisma(getNetwork(request));

  const [proofs, completedSwaps, usersWithSkills] = await Promise.all([
    db.proof.count(),
    db.swap.count({ where: { status: "COMPLETED" } }),
    db.user.findMany({
      where: {
        OR: [{ teachSkill: { not: null } }, { learnSkill: { not: null } }],
      },
      select: { teachSkill: true, learnSkill: true },
    }),
  ]);

  const skillSet = new Set<string>();
  for (const u of usersWithSkills) {
    for (const s of [
      ...parseSkills(u.teachSkill),
      ...parseSkills(u.learnSkill),
    ]) {
      skillSet.add(s);
    }
  }

  return NextResponse.json({
    contributions: proofs,
    exchanges: completedSwaps,
    skills: skillSet.size,
  });
}
