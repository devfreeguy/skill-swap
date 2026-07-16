import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import {
  appBaseUrl,
  exchangeCodeForToken,
  fetchTwitterProfile,
  TWITTER_STATE_COOKIE,
  TWITTER_VERIFIER_COOKIE,
} from "@/lib/twitter";

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

  // Find the linked account, or create one from the X profile.
  let user = await prisma.user.findUnique({
    where: { twitterId: profile.id },
  });

  let isNew = false;
  if (!user) {
    user = await prisma.user.create({
      data: {
        twitterId: profile.id,
        name: profile.name || profile.username,
        avatarUrl: profile.profileImageUrl,
        accountType: "x",
      },
    });
    isNew = true;
  }

  const onboarded = isOnboarded(user);
  const token = await signToken({
    id: user.id,
    email: user.email ?? "",
    name: user.name,
    onboarded,
  });

  const destination =
    isNew || !onboarded ? "/onboarding" : "/dashboard";
  const response = NextResponse.redirect(`${appBaseUrl()}${destination}`);
  setAuthCookie(response, token);

  // Clear the one-time OAuth cookies.
  response.cookies.set(TWITTER_STATE_COOKIE, "", { maxAge: 0, path: "/" });
  response.cookies.set(TWITTER_VERIFIER_COOKIE, "", { maxAge: 0, path: "/" });

  return response;
}
