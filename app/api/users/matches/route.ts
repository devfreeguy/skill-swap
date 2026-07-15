import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { scoreMatch } from "@/lib/matching";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const candidates = await db.user.findMany({
    where: {
      id: { not: currentUser.id },
      OR: [{ teachSkill: { not: null } }, { learnSkill: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      teachSkill: true,
      learnSkill: true,
    },
  });

  const results = candidates
    .map((c) => ({ ...c, ...scoreMatch(currentUser, c) }))
    .sort((a, b) => b.score - a.score);

  return NextResponse.json(results);
}
