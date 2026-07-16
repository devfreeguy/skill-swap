import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "@/lib/jwt";

describe("JWT utilities", () => {
  const payload = {
    id: "user-123",
    email: "test@example.com",
    name: "Test User",
    onboarded: true,
  };

  it("signs a token and verifies it back", async () => {
    const token = await signToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature

    const verified = await verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified!.id).toBe(payload.id);
    expect(verified!.email).toBe(payload.email);
    expect(verified!.name).toBe(payload.name);
    expect(verified!.onboarded).toBe(true);
  });

  it("returns null for a garbage token", async () => {
    expect(await verifyToken("not.a.token")).toBeNull();
  });

  it("returns null for an empty string", async () => {
    expect(await verifyToken("")).toBeNull();
  });

  it("preserves onboarded: false", async () => {
    const token = await signToken({ ...payload, onboarded: false });
    const verified = await verifyToken(token);
    expect(verified!.onboarded).toBe(false);
  });

  it("handles empty email (wallet users)", async () => {
    const token = await signToken({ ...payload, email: "" });
    const verified = await verifyToken(token);
    expect(verified!.email).toBe("");
  });
});
