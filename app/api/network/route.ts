import { NextRequest, NextResponse } from "next/server";
import { setNetworkCookie } from "@/lib/network";
import type { ActiveNetwork } from "@/lib/network";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const network: ActiveNetwork = body.network === "mainnet" ? "mainnet" : "preprod";
  const res = NextResponse.json({ network });
  setNetworkCookie(res, network);
  return res;
}
