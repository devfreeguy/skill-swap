import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { parseSkills } from "@/lib/skills";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const { searchParams } = new URL(request.url);
  const skill = searchParams.get("skill");

  const users = await prisma.user.findMany({
    where: {
      id: { not: currentUser.id },
      OR: [{ teachSkill: { not: null } }, { learnSkill: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      teachSkill: true,
      learnSkill: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (skill) {
    const q = skill.toLowerCase();
    return NextResponse.json(
      users.filter((u) =>
        [...parseSkills(u.teachSkill), ...parseSkills(u.learnSkill)].some((s) =>
          s.toLowerCase().includes(q)
        )
      )
    );
  }

  return NextResponse.json(users);
}
