import { describe, it, expect, vi, beforeEach } from "vitest";
import { authedRequest } from "../helpers/request";
import { makeMockDb, makeUser } from "../helpers/mock-db";

const mockDb = makeMockDb();
vi.mock("@/lib/prisma", () => ({
  default: mockDb,
  getPrisma: vi.fn(() => mockDb),
}));

const { POST } = await import("@/app/api/auth/logout/route");

describe("POST /api/auth/logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.user.findUnique.mockResolvedValue(makeUser());
  });

  it("returns 200", async () => {
    const req = await authedRequest("/api/auth/logout", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("clears the skillswap_token cookie with Max-Age=0", async () => {
    const req = await authedRequest("/api/auth/logout", { method: "POST" });
    const res = await POST(req);
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toContain("skillswap_token=");
    expect(header).toContain("Max-Age=0");
  });

  it("clears the cookie on path / (site-wide)", async () => {
    const req = await authedRequest("/api/auth/logout", { method: "POST" });
    const res = await POST(req);
    const header = res.headers.get("set-cookie") ?? "";
    expect(header).toContain("Path=/");
  });
});
