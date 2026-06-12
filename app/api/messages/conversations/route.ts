import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { scoreMatch } from "@/lib/matching";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const swaps = await prisma.swap.findMany({
    where: {
      OR: [{ initiatorId: currentUser.id }, { receiverId: currentUser.id }],
      status: { in: ["ACTIVE", "COMPLETED"] },
    },
    include: {
      initiator: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          teachSkill: true,
          learnSkill: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          teachSkill: true,
          learnSkill: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          type: true,
          createdAt: true,
          senderId: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const conversations = swaps.map((swap) => {
    const me =
      swap.initiatorId === currentUser.id ? swap.initiator : swap.receiver;
    const other =
      swap.initiatorId === currentUser.id ? swap.receiver : swap.initiator;
    const lastMessage = swap.messages[0] ?? null;
    const { type: matchType } = scoreMatch(me, other);

    return {
      swapId: swap.id,
      status: swap.status,
      other,
      myTeachSkill: me.teachSkill ?? null,
      lastMessage,
      matchType,
      updatedAt: swap.updatedAt,
    };
  });

  return NextResponse.json(conversations);
}
