import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseSkills } from "@/lib/skills";

/**
 * Public endpoint — platform-wide aggregate stats for the landing page.
 * No authentication required.
 */
export async function GET() {
  const [proofs, completedSwaps, usersWithSkills] = await Promise.all([
    prisma.proof.count(),
    prisma.swap.count({ where: { status: "COMPLETED" } }),
    prisma.user.findMany({
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
