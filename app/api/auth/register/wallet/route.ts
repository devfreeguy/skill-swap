import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import { consumeNonce } from "@/lib/wallet-nonce-store";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, walletAddress, signature, nonce, email } = body;

  if (!name || !walletAddress || !signature || !nonce) {
    return NextResponse.json(
      { error: "name, walletAddress, signature, and nonce are required" },
      { status: 400 }
    );
  }

  if (!consumeNonce(nonce)) {
    return NextResponse.json(
      { error: "Invalid or expired nonce" },
      { status: 401 }
    );
  }

  const existingWallet = await prisma.user.findUnique({ where: { walletAddress } });
  if (existingWallet) {
    return NextResponse.json(
      { error: "Wallet already linked to an account" },
      { status: 409 }
    );
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
