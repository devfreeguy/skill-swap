import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { signToken } from "@/lib/jwt";
import { proxy } from "@/proxy";

async function makeReq(path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["cookie"] = `skillswap_token=${token}`;
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("proxy middleware", () => {
  it("allows unprotected paths without a token", async () => {
    const res = await proxy(await makeReq("/login"));
    expect(res.status).toBe(200); // NextResponse.next()
  });

  it("allows /migrating without a token", async () => {
    const res = await proxy(await makeReq("/migrating"));
    expect(res.status).toBe(200);
  });

  it("redirects to /login when no token on protected path", async () => {
    const res = await proxy(await makeReq("/dashboard"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects to /login with an invalid token", async () => {
    const res = await proxy(await makeReq("/dashboard", "garbage-token"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects to /migrating when token has onboarded: false", async () => {
    const token = await signToken({
      id: "u1",
      email: "",
      name: "Test",
      onboarded: false,
    });
    const res = await proxy(await makeReq("/dashboard", token));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/migrating");
  });

  it("allows through when token has onboarded: true", async () => {
    const token = await signToken({
      id: "u1",
      email: "",
      name: "Test",
      onboarded: true,
    });
    const res = await proxy(await makeReq("/dashboard", token));
    expect(res.status).toBe(200);
  });

  it("protects all registered paths", async () => {
    const token = await signToken({
      id: "u1",
      email: "",
      name: "Test",
      onboarded: false,
    });
    const paths = [
      "/swaps/abc",
      "/users",
      "/messages",
      "/profile",
      "/notifications",
    ];
    for (const path of paths) {
      const res = await proxy(await makeReq(path, token));
      expect(res.status, `${path} should redirect`).toBe(307);
    }
  });
});
