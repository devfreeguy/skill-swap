import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeUser } from "../helpers/mock-db";
import { authedRequest, anonRequest } from "../helpers/request";
import { verifyToken } from "@/lib/jwt";

const mockDb = makeMockDb();
vi.mock("@/lib/prisma", () => ({
  default: mockDb,
  getPrisma: vi.fn(() => mockDb),
}));

vi.mock("@/lib/network-profile-sync", () => ({
  syncProfileFromOtherNetwork: vi.fn(async () => false),
  crossNetworkStakeAddr: vi.fn(() => null),
}));

const { POST } = await import("@/app/api/auth/sync-profile/route");

describe("POST /api/auth/sync-profile", () => {
  beforeEach(() => vi.resetAllMocks());

  it("returns 401 when unauthenticated", async () => {
    const req = anonRequest("/api/auth/sync-profile", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user is not found in DB", async () => {
    // Call 1: getCurrentUser (requireAuth) passes with a valid user from JWT
    // Call 2: route's own findUnique returns null → 404
    mockDb.user.findUnique
      .mockResolvedValueOnce(makeUser())
      .mockResolvedValueOnce(null);
    const req = await authedRequest("/api/auth/sync-profile", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns onboarded: true and re-issues JWT when user already has skills", async () => {
    const user = makeUser({ teachSkill: '["Python"]', learnSkill: '["React"]' });
    mockDb.user.findUnique.mockResolvedValue(user);

    const req = await authedRequest("/api/auth/sync-profile", { method: "POST" });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.onboarded).toBe(true);

    // JWT must be re-issued in the Set-Cookie header
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("skillswap_token=");
  });

  it("re-issued JWT has onboarded: true embedded", async () => {
    const user = makeUser({ teachSkill: '["Python"]', learnSkill: '["React"]' });
    mockDb.user.findUnique.mockResolvedValue(user);

    const req = await authedRequest("/api/auth/sync-profile", {
      method: "POST",
      onboarded: false, // old JWT says false
    });
    const res = await POST(req);

    const rawCookie = res.headers.get("set-cookie") ?? "";
    const tokenMatch = rawCookie.match(/skillswap_token=([^;]+)/);
    expect(tokenMatch).not.toBeNull();
    const token = tokenMatch![1];
    const payload = await verifyToken(token);
    expect(payload!.onboarded).toBe(true);
  });

  it("returns onboarded: false when sync finds nothing", async () => {
    const user = makeUser({ teachSkill: null, learnSkill: null });
    // Call 1: getCurrentUser (requireAuth) auth check
    // Call 2: route's own findUnique (null skills → triggers sync)
    // Call 3: re-fetch after syncProfileFromOtherNetwork (sync found nothing → still null)
    mockDb.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(user);

    const { syncProfileFromOtherNetwork } = await import("@/lib/network-profile-sync");
    vi.mocked(syncProfileFromOtherNetwork).mockResolvedValue(false);

    const req = await authedRequest("/api/auth/sync-profile", {
      method: "POST",
      onboarded: false,
    });
    const res = await POST(req);
    const data = await res.json();

    expect(data.onboarded).toBe(false);
  });
});
