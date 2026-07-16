import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { setAuthCookie, clearAuthCookie, getAuthToken } from "@/lib/cookies";
import { NextRequest } from "next/server";

function makeResponse() {
  return NextResponse.json({});
}

describe("Cookie utilities", () => {
  describe("setAuthCookie", () => {
    it("sets skillswap_token as HttpOnly with path /", () => {
      const res = makeResponse();
      setAuthCookie(res, "my-token");
      const header = res.headers.get("set-cookie") ?? "";
      expect(header).toContain("skillswap_token=my-token");
      expect(header.toLowerCase()).toContain("httponly");
      expect(header).toContain("Path=/");
    });

    it("sets Max-Age to 7 days", () => {
      const res = makeResponse();
      setAuthCookie(res, "token");
      const header = res.headers.get("set-cookie") ?? "";
      expect(header).toContain("Max-Age=604800"); // 60*60*24*7
    });
  });

  describe("clearAuthCookie", () => {
    it("sets Max-Age=0 to expire the cookie", () => {
      const res = makeResponse();
      clearAuthCookie(res);
      const header = res.headers.get("set-cookie") ?? "";
      expect(header).toContain("Max-Age=0");
    });

    it("includes path / so the cookie is cleared site-wide", () => {
      const res = makeResponse();
      clearAuthCookie(res);
      const header = res.headers.get("set-cookie") ?? "";
      // Without path=/ the browser would not clear the cookie set on path=/
      expect(header).toContain("Path=/");
    });
  });

  describe("getAuthToken", () => {
    it("reads the token from the request cookie", () => {
      const req = new NextRequest("http://localhost/api/test", {
        headers: { cookie: "skillswap_token=abc123" },
      });
      expect(getAuthToken(req)).toBe("abc123");
    });

    it("returns undefined when cookie is absent", () => {
      const req = new NextRequest("http://localhost/api/test");
      expect(getAuthToken(req)).toBeUndefined();
    });
  });
});
