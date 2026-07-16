import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeMockDb, makeUser } from "../helpers/mock-db";

const mockDb = makeMockDb();
vi.mock("@/lib/prisma", () => ({
  default: mockDb,
  getPrisma: vi.fn(() => mockDb),
}));

vi.mock("@/lib/twitter", () => ({
  appBaseUrl: vi.fn(() => "http://localhost:3000"),
  exchangeCodeForToken: vi.fn(async () => "access-token"),
  fetchTwitterProfile: vi.fn(async () => ({
    id: "twitter-123",
    name: "Twitter User",
    username: "twitteruser",
    profileImageUrl: "https://pbs.twimg.com/profile_images/test.jpg",
  })),
  TWITTER_STATE_COOKIE: "x_oauth_state",
  TWITTER_VERIFIER_COOKIE: "x_oauth_verifier",
}));

vi.mock("@/lib/network-profile-sync", () => ({
  syncProfileFromOtherNetwork: vi.fn(async () => false),
}));

const { GET } = await import("@/app/api/auth/twitter/callback/route");

function callbackReq(params: Record<string, string> = {}, cookies = "") {
  const url = new URL("http://localhost:3000/api/auth/twitter/callback");
  url.searchParams.set("code", params.code ?? "auth-code");
  url.searchParams.set("state", params.state ?? "csrf-state");
  if (params.error) url.searchParams.set("error", params.error);
  return new NextRequest(url.toString(), {
    headers: {
      cookie:
        cookies ||
        "x_oauth_state=csrf-state; x_oauth_verifier=pkce-verifier; x-skillswap-network=preprod",
    },
  });
}

describe("GET /api/auth/twitter/callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to /login?error=twitter_denied when user cancels on X", async () => {
    const req = callbackReq({ error: "access_denied" });
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=twitter_denied");
  });

  it("redirects to /login when state cookie is missing (CSRF)", async () => {
    const req = callbackReq({}, "x-skillswap-network=preprod"); // no state cookie
    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login?error=twitter_state");
  });

  it("redirects to /dashboard for a returning fully-onboarded user", async () => {
    const user = makeUser({
      twitterId: "twitter-123",
      teachSkill: '["Python"]',
      learnSkill: '["React"]',
      accountType: "x",
    });
    mockDb.user.findUnique.mockResolvedValue(user);

    const res = await GET(callbackReq());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("redirects to /migrating for a returning user without skills", async () => {
    const user = makeUser({
      twitterId: "twitter-123",
      teachSkill: null,
      learnSkill: null,
      accountType: "x",
    });
    mockDb.user.findUnique.mockResolvedValue(user);

    const res = await GET(callbackReq());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/migrating");
  });

  it("redirects new user to /migrating when sync finds nothing", async () => {
    mockDb.user.findUnique
      .mockResolvedValueOnce(null) // no existing account
      .mockResolvedValueOnce(
        makeUser({ twitterId: "twitter-123", teachSkill: null, learnSkill: null, accountType: "x" })
      ); // re-fetch after sync
    mockDb.user.create.mockResolvedValue(
      makeUser({ twitterId: "twitter-123", teachSkill: null, learnSkill: null, accountType: "x" })
    );

    const res = await GET(callbackReq());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/migrating");
  });

  it("redirects new user to /dashboard when sync finds a full profile", async () => {
    const syncedUser = makeUser({
      twitterId: "twitter-123",
      teachSkill: '["Python"]',
      learnSkill: '["React"]',
      accountType: "x",
    });
    mockDb.user.findUnique
      .mockResolvedValueOnce(null)     // no existing account
      .mockResolvedValueOnce(syncedUser); // re-fetch after sync has written skills
    mockDb.user.create.mockResolvedValue(
      makeUser({ twitterId: "twitter-123", teachSkill: null, learnSkill: null, accountType: "x" })
    );

    const { syncProfileFromOtherNetwork } = await import("@/lib/network-profile-sync");
    vi.mocked(syncProfileFromOtherNetwork).mockResolvedValue(true);

    const res = await GET(callbackReq());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("sets the auth cookie on success", async () => {
    const user = makeUser({ twitterId: "twitter-123", accountType: "x" });
    mockDb.user.findUnique.mockResolvedValue(user);

    const res = await GET(callbackReq());
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("skillswap_token=");
  });

  it("clears the OAuth state and verifier cookies after callback", async () => {
    const user = makeUser({ twitterId: "twitter-123", accountType: "x" });
    mockDb.user.findUnique.mockResolvedValue(user);

    const res = await GET(callbackReq());
    const cookieHeader = res.headers.get("set-cookie") ?? "";
    // Both x_oauth_state and x_oauth_verifier must be expired
    expect(cookieHeader).toContain("x_oauth_state=");
    expect(cookieHeader).toContain("x_oauth_verifier=");
    // Max-Age=0 for both
    const parts = cookieHeader.split(",");
    const stateCookie = parts.find((p) => p.includes("x_oauth_state"));
    expect(stateCookie).toContain("Max-Age=0");
  });
});
