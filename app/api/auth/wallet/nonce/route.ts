import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { storeNonce } from "@/lib/wallet-nonce-store";

export async function GET() {
  const nonce = randomBytes(32).toString("hex");
  storeNonce(nonce);
  return NextResponse.json({ nonce });
}
