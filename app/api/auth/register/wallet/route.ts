import { NextRequest, NextResponse } from "next/server";
import verifySignature from "@cardano-foundation/cardano-verify-datasignature";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import { consumeNonce } from "@/lib/wallet-nonce-store";
import { syncProfileFromOtherNetwork } from "@/lib/network-profile-sync";

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

  const network = getNetwork(request);
  const db = getPrisma(network);

  if (!(await consumeNonce(nonce, db))) {
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

  const existingWallet = await db.user.findUnique({ where: { walletAddress } });
  if (existingWallet) {
    const message =
      existingWallet.accountType === "x"
        ? "This wallet is already linked to another profile."
        : "Wallet already linked to an account";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  if (email) {
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 }
      );
    }
  }

  const user = await db.user.create({
    data: {
      name,
      email: email || null,
      walletAddress,
      accountType: "wallet",
    },
  });

  // Silently copy profile from the other network's DB (best-effort).
  await syncProfileFromOtherNetwork(user.id, network, walletAddress, null);

  // Re-fetch to pick up any synced fields (e.g. teachSkill, learnSkill).
  const finalUser = await db.user.findUnique({ where: { id: user.id } }) ?? user;

  const token = await signToken({ id: finalUser.id, email: finalUser.email ?? "", name: finalUser.name, onboarded: !!(finalUser.teachSkill && finalUser.learnSkill) });
  const response = NextResponse.json({
    id: finalUser.id,
    name: finalUser.name,
    email: finalUser.email,
    avatarUrl: finalUser.avatarUrl,
    teachSkill: finalUser.teachSkill,
    learnSkill: finalUser.learnSkill,
    walletAddress: finalUser.walletAddress,
  });
  setAuthCookie(response, token);
  return response;
}
