import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "skillswap_token";

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0 });
}

export function getAuthToken(request: NextRequest): string | undefined {
  return request.cookies.get(COOKIE_NAME)?.value;
}
