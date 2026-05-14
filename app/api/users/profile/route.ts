import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { uploadAvatar } from "@/lib/cloudinary";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";

export async function PATCH(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, teachSkill, learnSkill, teachSkills, learnSkills, avatarFile } = body;

  let avatarUrl = currentUser.avatarUrl;
  if (avatarFile) {
    avatarUrl = await uploadAvatar(avatarFile, currentUser.id);
  }

  // Arrays (from onboarding) take precedence over single-string values
  const finalTeachSkill =
    teachSkills !== undefined ? JSON.stringify(teachSkills) : teachSkill;
  const finalLearnSkill =
    learnSkills !== undefined ? JSON.stringify(learnSkills) : learnSkill;

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      ...(name !== undefined && { name }),
      ...(finalTeachSkill !== undefined && { teachSkill: finalTeachSkill }),
      ...(finalLearnSkill !== undefined && { learnSkill: finalLearnSkill }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
  });

  const response = NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    avatarUrl: updated.avatarUrl,
    teachSkill: updated.teachSkill,
    learnSkill: updated.learnSkill,
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
