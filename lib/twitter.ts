import crypto from "crypto";

/**
 * Twitter / X OAuth2 (Authorization Code + PKCE) helpers.
 *
 * We use X as a raw OAuth2 identity provider - no NextAuth. The flow:
 *   1. /api/auth/twitter         → build authorize URL, redirect to X
 *   2. X redirects back          → /api/auth/twitter/callback?code=…&state=…
 *   3. callback exchanges code    → access token → GET /2/users/me
 *   4. callback issues our own skillswap_token JWT cookie
 */

const AUTHORIZE_URL = "https://x.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.x.com/2/oauth2/token";
const USERS_ME_URL =
  "https://api.x.com/2/users/me?user.fields=profile_image_url,name,username";

// Identity-only scopes. `tweet.read` is required alongside `users.read`.
const SCOPES = ["tweet.read", "users.read"];

export const TWITTER_STATE_COOKIE = "x_oauth_state";
export const TWITTER_VERIFIER_COOKIE = "x_oauth_verifier";

export type TwitterProfile = {
  id: string;
  name: string;
  username: string;
  profileImageUrl: string | null;
};

function base64url(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Resolve the app base URL (no trailing slash) used to build the callback. */
export function appBaseUrl(): string {
  const url = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

export function redirectUri(): string {
  return `${appBaseUrl()}/api/auth/twitter/callback`;
}

/** A random URL-safe value for the OAuth `state` (CSRF) parameter. */
export function createState(): string {
  return base64url(crypto.randomBytes(24));
}

/** PKCE: returns a verifier and its S256 challenge. */
export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier, challenge };
}

export function buildAuthorizeUrl(state: string, challenge: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.TWITTER_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    scope: SCOPES.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/** Exchange an authorization code for an access token. */
export async function exchangeCodeForToken(
  code: string,
  verifier: string
): Promise<string> {
  const clientId = process.env.TWITTER_CLIENT_ID ?? "";
  const clientSecret = process.env.TWITTER_CLIENT_SECRET ?? "";

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    code_verifier: verifier,
    client_id: clientId,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };
  // Confidential clients authenticate the token request with HTTP Basic auth.
  if (clientSecret) {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${basic}`;
  }

  const res = await fetch(TOKEN_URL, { method: "POST", headers, body });
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status})`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Token exchange returned no access_token");
  }
  return data.access_token;
}

/** Fetch the authenticated user's profile from the X API. */
export async function fetchTwitterProfile(
  accessToken: string
): Promise<TwitterProfile> {
  const res = await fetch(USERS_ME_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch X profile (${res.status})`);
  }
  const { data } = (await res.json()) as {
    data?: {
      id: string;
      name: string;
      username: string;
      profile_image_url?: string;
    };
  };
  if (!data?.id) {
    throw new Error("X profile response missing user id");
  }
  return {
    id: data.id,
    name: data.name,
    username: data.username,
    // X returns a `_normal` (48px) thumbnail by default - request the original.
    profileImageUrl: data.profile_image_url
      ? data.profile_image_url.replace("_normal", "")
      : null,
  };
}
