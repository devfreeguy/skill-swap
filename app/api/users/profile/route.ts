import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { uploadAvatar } from "@/lib/cloudinary";

export async function PATCH(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, teachSkill, learnSkill, avatarFile } = body;

  let avatarUrl = currentUser.avatarUrl;
  if (avatarFile) {
    avatarUrl = await uploadAvatar(avatarFile, currentUser.id);
  }

  const updated = await prisma.user.update({
    where: { id: currentUser.id },
    data: {
      ...(name !== undefined && { name }),
      ...(teachSkill !== undefined && { teachSkill }),
      ...(learnSkill !== undefined && { learnSkill }),
      ...(avatarUrl !== undefined && { avatarUrl }),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    avatarUrl: updated.avatarUrl,
    teachSkill: updated.teachSkill,
    learnSkill: updated.learnSkill,
    walletAddress: updated.walletAddress,
  });
}
