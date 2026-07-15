import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getNetwork } from "@/lib/network";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import { syncProfileFromOtherNetwork } from "@/lib/network-profile-sync";

// Prisma + CIP-8 verification need Node.
export const runtime = "nodejs";

/**
 * POST /api/auth/sync-profile
 *
 * Called by the /migrating page immediately after auth. If the current user
 * has no skills yet, attempts to copy them from the counterpart network's DB.
 * Always re-issues the JWT so the `onboarded` flag is fresh.
 */
export async function POST(request: NextRequest) {
  // Log DB config once per cold start so misconfigured env vars are immediately visible.
  console.log(`[sync-profile] DB config: DATABASE_URL_MAINNET=${!!process.env.DATABASE_URL_MAINNET} DATABASE_URL_PREPROD=${!!process.env.DATABASE_URL_PREPROD} DATABASE_URL=${!!process.env.DATABASE_URL}`);

  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { db } = auth;

  // Always re-fetch from DB — the JWT cached onboarded: false, but the DB may
  // have already been written by a concurrent sync on a previous tab/request.
  let user = await db.user.findUnique({ where: { id: auth.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If skills are already present, skip sync — just re-issue the JWT.
  if (!(user.teachSkill && user.learnSkill)) {
    const network = getNetwork(request);
    await syncProfileFromOtherNetwork(
      user.id,
      network,
      user.walletAddress ?? null,
      user.twitterId ?? null
    );
    // Re-fetch to pick up any fields written by the sync.
    user = (await db.user.findUnique({ where: { id: user.id } })) ?? user;
  }

  const onboarded = !!(user.teachSkill && user.learnSkill);
  const token = await signToken({
    id: user.id,
    email: user.email ?? "",
    name: user.name,
    onboarded,
  });

  const response = NextResponse.json({
    onboarded,
    teachSkill: user.teachSkill ?? null,
    learnSkill: user.learnSkill ?? null,
  });
  setAuthCookie(response, token);
  return response;
}
