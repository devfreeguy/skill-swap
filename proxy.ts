import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const protectedPaths = [
  "/dashboard",
  "/swaps",
  "/users",
  "/messages",
  "/profile",
  "/notifications",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("skillswap_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!payload.onboarded) {
    return NextResponse.redirect(new URL("/migrating", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/swaps/:path*",
    "/users/:path*",
    "/messages/:path*",
    "/profile/:path*",
    "/notifications/:path*",
  ],
};
