import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";
import { parseSkills } from "@/lib/skills";

/**
 * Public endpoint — returns the most common skills across all user profiles.
 * Counts every occurrence of each skill in both teachSkill and learnSkill
 * columns, then returns the top results sorted by frequency descending.
 */
export async function GET(request: NextRequest) {
  const db = getPrisma(getNetwork(request));

  const users = await db.user.findMany({
    where: {
      OR: [{ teachSkill: { not: null } }, { learnSkill: { not: null } }],
    },
    select: { teachSkill: true, learnSkill: true },
  });

  const counts = new Map<string, number>();
  for (const u of users) {
    for (const skill of [
      ...parseSkills(u.teachSkill),
      ...parseSkills(u.learnSkill),
    ]) {
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
  }

  const top = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  return NextResponse.json(top);
}
