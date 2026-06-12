import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";

export async function DELETE(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updated = await prisma.user.update({
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
