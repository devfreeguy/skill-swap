import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import {
  appBaseUrl,
  exchangeCodeForToken,
  fetchTwitterProfile,
  redirectUri,
  TWITTER_STATE_COOKIE,
  TWITTER_VERIFIER_COOKIE,
} from "@/lib/twitter";
import { syncProfileFromOtherNetwork } from "@/lib/network-profile-sync";

// Token exchange + profile fetch run on Node.
export const runtime = "nodejs";

function loginError(reason: string, request: NextRequest): NextResponse {
  return NextResponse.redirect(`${appBaseUrl(request)}/login?error=${reason}`);
}

/** Profile is onboarded when both skill fields are set (matches wallet routes). */
function isOnboarded(user: {
  teachSkill: string | null;
  learnSkill: string | null;
}): boolean {
  return !!(user.teachSkill && user.learnSkill);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) return loginError("twitter_denied", request);
  if (!code || !state) return loginError("twitter_invalid", request);

  const expectedState = request.cookies.get(TWITTER_STATE_COOKIE)?.value;
  const verifier = request.cookies.get(TWITTER_VERIFIER_COOKIE)?.value;

  if (!expectedState || !verifier || state !== expectedState) {
    return loginError("twitter_state", request);
  }

  let profile;
  try {
    const accessToken = await exchangeCodeForToken(code, verifier, redirectUri(request));
    profile = await fetchTwitterProfile(accessToken);
  } catch {
    return loginError("twitter_failed", request);
  }

  const network = getNetwork(request);
  const db = getPrisma(network);

  // Find the linked account, or create one from the X profile.
  let user = await db.user.findUnique({
    where: { twitterId: profile.id },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        twitterId: profile.id,
        name: profile.name || profile.username,
        avatarUrl: profile.profileImageUrl,
        accountType: "x",
      },
    });

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

  // Route purely on onboarded status — sync already ran above for new users,
  // so if skills were copied the user is onboarded and goes straight to dashboard.
  const destination = onboarded ? "/dashboard" : "/migrating";
  const response = NextResponse.redirect(`${appBaseUrl(request)}${destination}`);
  setAuthCookie(response, token);

  // Clear the one-time OAuth cookies.
  response.cookies.set(TWITTER_STATE_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(TWITTER_VERIFIER_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
