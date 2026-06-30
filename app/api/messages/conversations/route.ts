import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { scoreMatch } from "@/lib/matching";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

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

  const CHAT_TYPES = ["TEXT", "LINK", "IMAGE", "DOCUMENT"];

  const conversations = swaps.map((swap) => {
    const me =
      swap.initiatorId === currentUser.id ? swap.initiator : swap.receiver;
    const other =
      swap.initiatorId === currentUser.id ? swap.receiver : swap.initiator;
    const lastMessage = swap.messages[0] ?? null;
    const { type: matchType } = scoreMatch(me, other);

    // Unread when the latest chat message is from the other party and newer
    // than the last time I opened this conversation.
    const myLastReadAt =
      swap.initiatorId === currentUser.id
        ? swap.initiatorLastReadAt
        : swap.receiverLastReadAt;
    const unread =
      !!lastMessage &&
      lastMessage.senderId !== currentUser.id &&
      CHAT_TYPES.includes(lastMessage.type) &&
      (!myLastReadAt ||
        new Date(lastMessage.createdAt) > new Date(myLastReadAt));

    return {
      swapId: swap.id,
      status: swap.status,
      other,
      myTeachSkill: me.teachSkill ?? null,
      lastMessage,
      matchType,
      unread,
      updatedAt: swap.updatedAt,
    };
  });

  return NextResponse.json(conversations);
}
