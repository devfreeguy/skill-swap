import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { MessageType } from "@/app/generated/prisma/client";

// Only real chat messages count toward "unread" - not system events.
const CHAT_TYPES: MessageType[] = [
  MessageType.TEXT,
  MessageType.LINK,
  MessageType.IMAGE,
  MessageType.DOCUMENT,
];

/**
 * Total unread chat messages for the current user across all conversations,
 * plus the most recent one (for the new-message toast). "Unread" = a message
 * from the other party newer than the user's last open of that conversation.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const swaps = await db.swap.findMany({
    where: {
      OR: [{ initiatorId: currentUser.id }, { receiverId: currentUser.id }],
    },
    select: {
      id: true,
      initiatorId: true,
      initiatorLastReadAt: true,
      receiverLastReadAt: true,
    },
  });

  const conditions = swaps.map((s) => {
    const isInit = s.initiatorId === currentUser.id;
    const lastRead = isInit ? s.initiatorLastReadAt : s.receiverLastReadAt;
    return {
      swapId: s.id,
      senderId: { not: currentUser.id },
      type: { in: CHAT_TYPES },
      ...(lastRead ? { createdAt: { gt: lastRead } } : {}),
    };
  });

  if (conditions.length === 0) {
    return NextResponse.json({ count: 0, latest: null });
  }

  const unread = await db.message.findMany({
    where: { OR: conditions },
    select: {
      id: true,
      swapId: true,
      createdAt: true,
      sender: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const latest = unread[0]
    ? {
        id: unread[0].id,
        swapId: unread[0].swapId,
        senderName: unread[0].sender.name,
      }
    : null;

  return NextResponse.json({ count: unread.length, latest });
}
