import { NextRequest, NextResponse } from "next/server";
import verifySignature from "@cardano-foundation/cardano-verify-datasignature";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import { consumeNonce } from "@/lib/wallet-nonce-store";
import { checkWalletLinkable } from "@/lib/account-type";

// CIP-8 verification needs Node APIs.
export const runtime = "nodejs";

/**
 * Link a Cardano wallet to the *currently authenticated* account. Used by the
 * mandatory wallet gate and onboarding: the user proves ownership of the wallet
 * (signed nonce) and we bind its stake address to their existing user row.
 *
 * Account-type invariant: a wallet that already belongs to an 'x' account can
 * never be linked to another account, so we validate before any state change.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const body = await request.json();
  const { walletAddress, signature, key, nonce } = body;

  if (!walletAddress || !signature || !key || !nonce) {
    return NextResponse.json(
      { error: "walletAddress, signature, key, and nonce are required" },
      { status: 400 }
    );
  }

  // Pre-flight: reject an already-linked wallet (esp. one owned by an 'x'
  // account) BEFORE consuming the nonce or verifying the signature. No state
  // is changed on failure.
  const linkCheck = await checkWalletLinkable(
    prisma,
    walletAddress,
    currentUser.id
  );
  if (!linkCheck.ok) {
    return NextResponse.json({ error: linkCheck.error }, { status: 409 });
  }

  // Single-use nonce issued by /api/auth/wallet/nonce.
  if (!consumeNonce(nonce)) {
    return NextResponse.json(
      { error: "Invalid or expired nonce" },
      { status: 401 }
    );
  }

  // Prove the wallet owning `walletAddress` signed this exact nonce.
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

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      walletAddress,
      // Linking a wallet upgrades a non-wallet account to 'wallet' so the user
      // can subsequently authenticate via this wallet (matching signup type).
      accountType: currentUser.accountType ?? "wallet",
    },
  });

  const response = NextResponse.json({
    id: updated.id,
    name: updated.name,
    walletAddress: updated.walletAddress,
  });

  const token = await signToken({
    id: updated.id,
    email: updated.email ?? "",
    name: updated.name,
    onboarded: !!(updated.teachSkill && updated.learnSkill),
  });
  setAuthCookie(response, token);

  return response;
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      walletAddress: null,
      // Detaching the wallet reverts the account to its original signup type.
      accountType: currentUser.accountType === "wallet" ? null : currentUser.accountType,
    },
  });

  const response = NextResponse.json({ success: true });

  const token = await signToken({
    id: updated.id,
    email: updated.email ?? "",
    name: updated.name,
    onboarded: !!(updated.teachSkill && updated.learnSkill),
  });
  setAuthCookie(response, token);

  return response;
}
