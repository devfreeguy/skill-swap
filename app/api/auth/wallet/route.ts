import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { walletAddress, signature, nonce } = body;

  if (!walletAddress || !signature || !nonce) {
    return NextResponse.json(
      { error: "walletAddress, signature, and nonce are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { walletAddress } });
  if (!user) {
    return NextResponse.json(
      { error: "Wallet not linked to any account" },
      { status: 404 }
    );
  }

  if (user.walletNonce !== nonce) {
    return NextResponse.json({ error: "Invalid nonce" }, { status: 401 });
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
