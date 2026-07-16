import { NextRequest, NextResponse } from "next/server";
import verifySignature from "@cardano-foundation/cardano-verify-datasignature";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import { consumeNonce } from "@/lib/wallet-nonce-store";

// CIP-8 verification (cardano-verify-datasignature) needs Node APIs.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, walletAddress, signature, key, nonce, email } = body;

  if (!name || !walletAddress || !signature || !key || !nonce) {
    return NextResponse.json(
      { error: "name, walletAddress, signature, key, and nonce are required" },
      { status: 400 }
    );
  }

  if (!(await consumeNonce(nonce))) {
    return NextResponse.json(
      { error: "Invalid or expired nonce" },
      { status: 401 }
    );
  }

  // Verify the CIP-8 signature proves the wallet owning `walletAddress`
  // signed this exact nonce before creating the account.
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

  const existingWallet = await prisma.user.findUnique({ where: { walletAddress } });
  if (existingWallet) {
    const message =
      existingWallet.accountType === "x"
        ? "This wallet is already linked to another profile."
        : "Wallet already linked to an account";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }
  }

  const user = await prisma.user.create({
    data: {
      name,
      email: email || null,
      walletAddress,
      accountType: "wallet",
    },
  });

  const token = await signToken({ id: user.id, email: user.email ?? "", name: user.name, onboarded: false });
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
