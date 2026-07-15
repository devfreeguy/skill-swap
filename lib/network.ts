import { NextRequest, NextResponse } from "next/server";

export type ActiveNetwork = "mainnet" | "preprod";
export const NETWORK_COOKIE = "x-skillswap-network";
export const DEFAULT_NETWORK: ActiveNetwork = "preprod";

export function getNetwork(request: NextRequest): ActiveNetwork {
  const val = request.cookies.get(NETWORK_COOKIE)?.value;
  return val === "mainnet" ? "mainnet" : "preprod";
}

export function setNetworkCookie(
  response: NextResponse,
  network: ActiveNetwork
): void {
  response.cookies.set(NETWORK_COOKIE, network, {
    httpOnly: false, // must be readable by client JS
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export function clearNetworkCookie(response: NextResponse): void {
  response.cookies.set(NETWORK_COOKIE, "", { maxAge: 0, path: "/" });
}
