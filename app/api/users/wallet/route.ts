import { NextRequest, NextResponse } from "next/server";
import verifySignature from "@cardano-foundation/cardano-verify-datasignature";
import { requireAuth } from "@/lib/api";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import { consumeNonce } from "@/lib/wallet-nonce-store";

// CIP-8 verification needs Node APIs.
export const runtime = "nodejs";

/**
 * Link a Cardano wallet to the *currently authenticated* account. Used by the
 * mandatory wallet gate and onboarding: the user proves ownership of the wallet
 * (signed nonce) and we bind its stake address to their existing user row.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const body = await request.json();
  const { walletAddress, signature, key, nonce } = body;

  if (!walletAddress || !signature || !key || !nonce) {
    return NextResponse.json(
      { error: "walletAddress, signature, key, and nonce are required" },
      { status: 400 }
    );
  }

  // Single-use nonce issued by /api/auth/wallet/nonce.
  if (!(await consumeNonce(nonce, db))) {
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

  // Reject a wallet already bound to a different account.
  const existing = await db.user.findUnique({ where: { walletAddress } });
  if (existing && existing.id !== currentUser.id) {
    return NextResponse.json(
      { error: "This wallet is already linked to another account." },
      { status: 409 }
    );
  }

  const updated = await db.user.update({
    where: { id: currentUser.id },
    data: { walletAddress },
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
  const { user: currentUser, db } = auth;

  const updated = await db.user.update({
    where: { id: currentUser.id },
    data: { walletAddress: null },
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
