import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { storeNonce } from "@/lib/wallet-nonce-store";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";

export async function GET(request: NextRequest) {
  const nonce = randomBytes(32).toString("hex");
  const db = getPrisma(getNetwork(request));
  await storeNonce(nonce, db);
  return NextResponse.json({ nonce });
}
