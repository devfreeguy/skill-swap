import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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
        select: { id: true, name: true, avatarUrl: true },
      },
      receiver: {
        select: { id: true, name: true, avatarUrl: true },
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
    const other =
      swap.initiatorId === currentUser.id ? swap.receiver : swap.initiator;
    const lastMessage = swap.messages[0] ?? null;

    return {
      swapId: swap.id,
      status: swap.status,
      other,
      lastMessage,
      updatedAt: swap.updatedAt,
    };
  });

  return NextResponse.json(conversations);
}
