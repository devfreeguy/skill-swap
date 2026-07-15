import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { scoreMatch } from "@/lib/matching";

/**
 * Silent perfect-match lookup, called from the dashboard right after onboarding.
 * Returns the first PERFECT_MATCH candidate (mutual teach/learn overlap) or
 * null. Kept lean - no notifications, no writes.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  // No skills set → nothing to match against.
  if (!currentUser.teachSkill || !currentUser.learnSkill) {
    return NextResponse.json(null);
  }

  const candidates = await db.user.findMany({
    where: {
      id: { not: currentUser.id },
      teachSkill: { not: null },
      learnSkill: { not: null },
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      teachSkill: true,
      learnSkill: true,
    },
  });

  let best: { user: (typeof candidates)[number]; result: ReturnType<typeof scoreMatch> } | null =
    null;
  for (const candidate of candidates) {
    const result = scoreMatch(currentUser, candidate);
    if (result.type !== "PERFECT_MATCH") continue;
    if (!best || result.score > best.result.score) {
      best = { user: candidate, result };
    }
  }

  if (!best) return NextResponse.json(null);

  return NextResponse.json({
    id: best.user.id,
    name: best.user.name,
    avatarUrl: best.user.avatarUrl,
    teachSkill: best.user.teachSkill,
    learnSkill: best.user.learnSkill,
    teachOverlap: best.result.teachOverlap,
    learnOverlap: best.result.learnOverlap,
  });
}
