import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";

const protectedPaths = [
  "/dashboard",
  "/discover",
  "/swaps",
  "/profile",
  "/notifications",
];

export async function middleware(request: NextRequest) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/discover/:path*",
    "/swaps/:path*",
    "/profile/:path*",
    "/notifications/:path*",
  ],
};
