import { NextRequest, NextResponse } from "next/server";
import { setNetworkCookie } from "@/lib/network";
import { clearAuthCookie } from "@/lib/cookies";
import type { ActiveNetwork } from "@/lib/network";

/**
 * Switch the active network (mainnet / preprod) and log the user out.
 * Logout is required because wallet addresses encode the network in their
 * bech32 prefix — the same user has a different address on each network,
 * so the JWT from one network is not valid on the other.
 */
export async function POST(request: NextRequest) {
  const { network } = (await request.json()) as { network?: string };
  if (network !== "mainnet" && network !== "preprod") {
    return NextResponse.json(
      { error: "network must be 'mainnet' or 'preprod'" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true });
  setNetworkCookie(response, network as ActiveNetwork);
  clearAuthCookie(response);
  return response;
}
