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
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(swaps);
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { receiverId, adaTxHash } = body;

  if (!receiverId) {
    return NextResponse.json(
      { error: "receiverId is required" },
      { status: 400 },
    );
  }

  const swap = await prisma.swap.create({
    data: {
      initiatorId: currentUser.id,
      receiverId,
      ...(adaTxHash ? { adaTxHash } : {}),
      status: "PENDING",
    },
  });

  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "SWAP_REQUEST",
      message: `${currentUser.name} wants to swap skills with you!`,
      swapId: swap.id,
    },
  });

  return NextResponse.json(swap, { status: 201 });
}
