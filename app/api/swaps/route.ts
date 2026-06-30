import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { emitToUser } from "@/lib/socket";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

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
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const body = await request.json();
  const { receiverId, initiatorSkill, receiverSkill, adaTxHash } = body;

  if (!receiverId) {
    return NextResponse.json(
      { error: "receiverId is required" },
      { status: 400 },
    );
  }

  if (!initiatorSkill || !receiverSkill) {
    return NextResponse.json(
      { error: "Please choose which skills to exchange." },
      { status: 400 },
    );
  }

  // One conversation per pair at a time: block a new swap if there's already a
  // pending or active one with this person (in either direction). Concurrent
  // swaps with *different* people are still allowed.
  const ongoing = await prisma.swap.findFirst({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      OR: [
        { initiatorId: currentUser.id, receiverId },
        { initiatorId: receiverId, receiverId: currentUser.id },
      ],
    },
    select: { id: true },
  });
  if (ongoing) {
    return NextResponse.json(
      {
        error:
          "You already have an ongoing swap with this person. Complete it before starting another.",
        swapId: ongoing.id,
      },
      { status: 409 },
    );
  }

  // Don't allow re-swapping the same skill pair you've already completed with
  // this person (a different skill exchange with them later is fine). The pair
  // is matched in both directions.
  const alreadyExchanged = await prisma.swap.findFirst({
    where: {
      status: "COMPLETED",
      OR: [
        { initiatorId: currentUser.id, receiverId, initiatorSkill, receiverSkill },
        {
          initiatorId: receiverId,
          receiverId: currentUser.id,
          initiatorSkill: receiverSkill,
          receiverSkill: initiatorSkill,
        },
      ],
    },
    select: { id: true },
  });
  if (alreadyExchanged) {
    return NextResponse.json(
      {
        error:
          "You've already completed this skill exchange with this person. Pick different skills.",
      },
      { status: 409 },
    );
  }

  const swap = await prisma.swap.create({
    data: {
      initiatorId: currentUser.id,
      receiverId,
      initiatorSkill,
      receiverSkill,
      ...(adaTxHash ? { adaTxHash } : {}),
      status: "PENDING",
    },
  });

  const requestMessage = `${currentUser.name} wants to learn ${receiverSkill} and will teach you ${initiatorSkill}.`;
  await prisma.notification.create({
    data: {
      userId: receiverId,
      type: "SWAP_REQUEST",
      message: requestMessage,
      swapId: swap.id,
    },
  });

  emitToUser(receiverId, "notification:new", {
    type: "SWAP_REQUEST",
    message: requestMessage,
    swapId: swap.id,
  });

  return NextResponse.json(swap, { status: 201 });
}
