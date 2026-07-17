import { NextRequest, NextResponse } from "next/server";
import {
  appBaseUrl,
  buildAuthorizeUrl,
  createPkcePair,
  createState,
  redirectUri,
  TWITTER_STATE_COOKIE,
  TWITTER_VERIFIER_COOKIE,
} from "@/lib/twitter";

// PKCE generation uses Node's crypto.
export const runtime = "nodejs";

/**
 * Starts the X (Twitter) OAuth2 flow: generates a state + PKCE pair, stashes
 * them in short-lived HttpOnly cookies, then redirects the browser to X's
 * authorize screen. The callback route verifies state + verifier on return.
 */
export async function GET(request: NextRequest) {
  if (!process.env.TWITTER_CLIENT_ID) {
    return NextResponse.redirect(
      `${appBaseUrl(request)}/login?error=twitter_not_configured`
    );
  }

  const state = createState();
  const { verifier, challenge } = createPkcePair();
  const uri = redirectUri(request);

  const response = NextResponse.redirect(buildAuthorizeUrl(state, challenge, uri));

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10, // 10 minutes to complete the round-trip
  };
  response.cookies.set(TWITTER_STATE_COOKIE, state, cookieOptions);
  response.cookies.set(TWITTER_VERIFIER_COOKIE, verifier, cookieOptions);

  return response;
}
