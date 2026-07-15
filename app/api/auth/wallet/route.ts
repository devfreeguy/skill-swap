import { NextRequest, NextResponse } from "next/server";
import verifySignature from "@cardano-foundation/cardano-verify-datasignature";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import { consumeNonce } from "@/lib/wallet-nonce-store";

// CIP-8 verification (cardano-verify-datasignature) needs Node APIs.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { walletAddress, signature, key, nonce } = body;

  if (!walletAddress || !signature || !key || !nonce) {
    return NextResponse.json(
      { error: "walletAddress, signature, key, and nonce are required" },
      { status: 400 }
    );
  }

  const db = getPrisma(getNetwork(request));

  const user = await db.user.findUnique({ where: { walletAddress } });
  if (!user) {
    return NextResponse.json(
      { error: "Wallet not linked to any account" },
      { status: 404 }
    );
  }

  // Nonce must have been issued by /api/auth/wallet/nonce and is single-use.
  if (!(await consumeNonce(nonce, db))) {
    return NextResponse.json(
      { error: "Invalid or expired nonce" },
      { status: 401 }
    );
  }

  // Verify the CIP-8 signature proves the wallet owning `walletAddress`
  // signed this exact nonce.
  let verified = false;
  try {
    verified = verifySignature(signature, key, nonce, walletAddress);
  } catch {
    verified = false;
  }
  if (!verified) {
    return NextResponse.json(
      { error: "Signature verification failed" },
      { status: 401 }
    );
  }

  const token = await signToken({ id: user.id, email: user.email ?? "", name: user.name, onboarded: !!(user.teachSkill && user.learnSkill) });
  const response = NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    teachSkill: user.teachSkill,
    learnSkill: user.learnSkill,
    walletAddress: user.walletAddress,
  });
  setAuthCookie(response, token);
  return response;
}
