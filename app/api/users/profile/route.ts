import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { uploadAvatar } from "@/lib/cloudinary";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const [user, completedSwaps, proofsEarned] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        teachSkill: true,
        learnSkill: true,
        walletAddress: true,
        createdAt: true,
      },
    }),
    prisma.swap.count({
      where: {
        status: "COMPLETED",
        OR: [{ initiatorId: currentUser.id }, { receiverId: currentUser.id }],
      },
    }),
    prisma.proof.count({
      where: { userId: currentUser.id },
    }),
  ]);

  return NextResponse.json({
    ...user,
    completedSwaps,
    proofsEarned,
    reputationScore: completedSwaps * 10,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const body = await request.json();
  const { name, email, bio, teachSkill, learnSkill, teachSkills, learnSkills, avatarFile } = body;

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
      ...(email !== undefined && { email: email || null }),
      ...(bio !== undefined && { bio: bio || null }),
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
    bio: updated.bio,
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
