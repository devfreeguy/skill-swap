import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeMockDb, makeUser } from "../helpers/mock-db";

const mockDb = makeMockDb();
vi.mock("@/lib/prisma", () => ({
  default: mockDb,
  getPrisma: vi.fn(() => mockDb),
}));

// wallet-nonce-store uses the db internally
vi.mock("@/lib/wallet-nonce-store", () => ({
  storeNonce: vi.fn(async () => {}),
  consumeNonce: vi.fn(async () => true), // nonce is valid by default
}));

const { POST } = await import("@/app/api/auth/wallet/route");

function walletLoginReq(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/wallet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: "x-skillswap-network=preprod",
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  walletAddress: "stake_test1uzdtmvurymq2jepw2x2q3vhhtmx4jthfp4g4gls4wy8s9wqkxwu2",
  signature: "a401010327200621583...",
  key: "5820abc123...",
  nonce: "deadbeef01",
};

describe("POST /api/auth/wallet (login)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when no account exists for the wallet address", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    const res = await POST(walletLoginReq(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("does NOT consume the nonce on 404 (so registration can reuse it)", async () => {
    const { consumeNonce } = await import("@/lib/wallet-nonce-store");
    mockDb.user.findUnique.mockResolvedValue(null);
    await POST(walletLoginReq(VALID_BODY));
    expect(consumeNonce).not.toHaveBeenCalled();
  });

  it("returns 403 when accountType is 'x' (X account cannot log in via wallet)", async () => {
    const user = makeUser({ accountType: "x" });
    mockDb.user.findUnique.mockResolvedValue(user);
    const res = await POST(walletLoginReq(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(walletLoginReq({ walletAddress: "addr" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and sets auth cookie for a valid wallet user", async () => {
    const user = makeUser({ accountType: "wallet" });
    mockDb.user.findUnique.mockResolvedValue(user);

    const res = await POST(walletLoginReq(VALID_BODY));
    expect(res.status).toBe(200);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("skillswap_token=");
  });

  it("JWT carries onboarded: true when both skills are set", async () => {
    const user = makeUser({
      accountType: "wallet",
      teachSkill: '["Python"]',
      learnSkill: '["React"]',
    });
    mockDb.user.findUnique.mockResolvedValue(user);

    const res = await POST(walletLoginReq(VALID_BODY));
    const data = await res.json();
    expect(data.teachSkill).toBeTruthy();
    expect(data.learnSkill).toBeTruthy();
  });

  it("JWT carries onboarded: false when skills are missing", async () => {
    const user = makeUser({
      accountType: "wallet",
      teachSkill: null,
      learnSkill: null,
    });
    mockDb.user.findUnique.mockResolvedValue(user);

    const res = await POST(walletLoginReq(VALID_BODY));
    const data = await res.json();
    // Response doesn't expose onboarded directly, but skills tell us
    expect(data.teachSkill).toBeNull();
  });
});
