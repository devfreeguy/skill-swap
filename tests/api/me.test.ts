import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeMockDb, makeUser } from "../helpers/mock-db";
import { authedRequest, anonRequest } from "../helpers/request";

const mockDb = makeMockDb();

vi.mock("@/lib/prisma", () => ({
  default: mockDb,
  getPrisma: vi.fn(() => mockDb),
}));

// Import after mock
const { GET } = await import("@/app/api/auth/me/route");

describe("GET /api/auth/me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    const req = anonRequest("/api/auth/me");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns user fields including onboarded when authenticated", async () => {
    const user = makeUser({ teachSkill: '["Python"]', learnSkill: '["React"]' });
    mockDb.user.findUnique.mockResolvedValue(user);

    const req = await authedRequest("/api/auth/me");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe(user.id);
    expect(data.walletAddress).toBe(user.walletAddress);
    expect(data.onboarded).toBe(true);
  });

  it("returns onboarded: false when skills are missing", async () => {
    const user = makeUser({ teachSkill: null, learnSkill: null });
    mockDb.user.findUnique.mockResolvedValue(user);

    const req = await authedRequest("/api/auth/me", { onboarded: false });
    const res = await GET(req);
    const data = await res.json();

    expect(data.onboarded).toBe(false);
  });

  it("returns onboarded: false when only one skill is set", async () => {
    const user = makeUser({ teachSkill: '["Python"]', learnSkill: null });
    mockDb.user.findUnique.mockResolvedValue(user);

    const req = await authedRequest("/api/auth/me");
    const res = await GET(req);
    const data = await res.json();

    expect(data.onboarded).toBe(false);
  });
});
