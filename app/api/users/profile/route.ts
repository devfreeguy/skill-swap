import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { uploadAvatar } from "@/lib/cloudinary";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/cookies";
import { syncProfileToOtherNetwork } from "@/lib/network-profile-sync";
import { getNetwork } from "@/lib/network";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const [user, completedSwaps, proofsEarned] = await Promise.all([
    db.user.findUnique({
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
    db.swap.count({
      where: {
        status: "COMPLETED",
        OR: [{ initiatorId: currentUser.id }, { receiverId: currentUser.id }],
      },
    }),
    db.proof.count({
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
  const { user: currentUser, db } = auth;

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

  const profileData = {
    ...(name !== undefined && { name }),
    ...(email !== undefined && { email: email || null }),
    ...(bio !== undefined && { bio: bio || null }),
    ...(finalTeachSkill !== undefined && { teachSkill: finalTeachSkill }),
    ...(finalLearnSkill !== undefined && { learnSkill: finalLearnSkill }),
    ...(avatarUrl !== undefined && { avatarUrl }),
  };

  const updated = await db.user.update({
    where: { id: currentUser.id },
    data: profileData,
  });

  // Dual-write: keep profile in sync with the other network (best-effort).
  void syncProfileToOtherNetwork(
    currentUser.id,
    getNetwork(request),
    profileData,
    currentUser.walletAddress ?? null,
    currentUser.twitterId ?? null
  );

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
