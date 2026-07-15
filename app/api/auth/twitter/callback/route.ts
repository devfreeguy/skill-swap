import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import {
  appBaseUrl,
  exchangeCodeForToken,
  fetchTwitterProfile,
  TWITTER_STATE_COOKIE,
  TWITTER_VERIFIER_COOKIE,
} from "@/lib/twitter";
import { syncProfileFromOtherNetwork } from "@/lib/network-profile-sync";

// Token exchange + profile fetch run on Node.
export const runtime = "nodejs";

function loginError(reason: string): NextResponse {
  return NextResponse.redirect(`${appBaseUrl()}/login?error=${reason}`);
}

/** Profile is incomplete until the user has a name and both skill fields. */
function isOnboarded(user: {
  name: string | null;
  teachSkill: string | null;
  learnSkill: string | null;
}): boolean {
  return !!(user.name && user.teachSkill && user.learnSkill);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) return loginError("twitter_denied");
  if (!code || !state) return loginError("twitter_invalid");

  const expectedState = request.cookies.get(TWITTER_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(TWITTER_VERIFIER_COOKIE)?.value;

  if (!expectedState || !verifier || state !== expectedState) {
    return loginError("twitter_state");
  }

  let profile;
  try {
    const accessToken = await exchangeCodeForToken(code, verifier);
    profile = await fetchTwitterProfile(accessToken);
  } catch {
    return loginError("twitter_failed");
  }

  const network = getNetwork(request);
  const db = getPrisma(network);

  // Find the linked account, or create one from the X profile.
  let user = await db.user.findUnique({
    where: { twitterId: profile.id },
  });

  let isNew = false;
  if (!user) {
    user = await db.user.create({
      data: {
        twitterId: profile.id,
        name: profile.name || profile.username,
        avatarUrl: profile.profileImageUrl,
      },
    });
    isNew = true;

    // Silently copy profile from the other network's DB (best-effort).
    await syncProfileFromOtherNetwork(user.id, network, null, profile.id);

    // Re-fetch to pick up any synced fields.
    user = (await db.user.findUnique({ where: { id: user.id } })) ?? user;
  }

  const onboarded = isOnboarded(user);
  const token = await signToken({
    id: user.id,
    email: user.email ?? "",
    name: user.name,
    onboarded,
  });

  // New users on this network always go through /migrating so the sync API
  // can run synchronously with a visible loading state. Returning onboarded
  // users go straight to the dashboard.
  const destination = isNew || !onboarded ? "/migrating" : "/dashboard";
  const response = NextResponse.redirect(`${appBaseUrl()}${destination}`);
  setAuthCookie(response, token);

  // Clear the one-time OAuth cookies.
  response.cookies.set(TWITTER_STATE_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(TWITTER_VERIFIER_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
