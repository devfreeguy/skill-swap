import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teachSkill, learnSkill, id } = currentUser;

  const [teachMatches, learnMatches, perfectMatches] = await Promise.all([
    teachSkill
      ? prisma.user.findMany({
          where: { learnSkill: teachSkill, id: { not: id } },
          select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
        })
      : [],
    learnSkill
      ? prisma.user.findMany({
          where: { teachSkill: learnSkill, id: { not: id } },
          select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
        })
      : [],
    teachSkill && learnSkill
      ? prisma.user.findMany({
          where: {
            learnSkill: teachSkill,
            teachSkill: learnSkill,
            id: { not: id },
          },
          select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
        })
      : [],
  ]);

  return NextResponse.json({ teachMatches, learnMatches, perfectMatches });
}
