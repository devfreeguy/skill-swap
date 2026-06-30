import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const user = auth.user;

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    teachSkill: user.teachSkill,
    learnSkill: user.learnSkill,
    walletAddress: user.walletAddress,
  });
}
