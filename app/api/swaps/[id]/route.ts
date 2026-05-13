import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body as { action: "accept" | "decline" | "complete" };

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isInitiator = swap.initiatorId === currentUser.id;
  const isReceiver = swap.receiverId === currentUser.id;

  if (!isInitiator && !isReceiver) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "accept") {
    if (!isReceiver) {
      return NextResponse.json({ error: "Only receiver can accept" }, { status: 403 });
    }
    const updated = await prisma.swap.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
    await prisma.notification.create({
      data: {
        userId: swap.initiatorId,
        type: "SWAP_ACCEPTED",
        message: `Your swap request was accepted!`,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "decline") {
    if (!isReceiver) {
      return NextResponse.json({ error: "Only receiver can decline" }, { status: 403 });
    }
    const updated = await prisma.swap.update({
      where: { id },
      data: { status: "DECLINED" },
    });
    await prisma.notification.create({
      data: {
        userId: swap.initiatorId,
        type: "SWAP_DECLINED",
        message: `Your swap request was declined.`,
      },
    });
    return NextResponse.json(updated);
  }

  if (action === "complete") {
    const updateData: { initiatorDone?: boolean; receiverDone?: boolean } = {};
    if (isInitiator) updateData.initiatorDone = true;
    if (isReceiver) updateData.receiverDone = true;

    const updated = await prisma.swap.update({
      where: { id },
      data: updateData,
    });

    const bothDone =
      (isInitiator ? true : swap.initiatorDone) &&
      (isReceiver ? true : swap.receiverDone);

    if (bothDone) {
      const [initiator, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: swap.initiatorId } }),
        prisma.user.findUnique({ where: { id: swap.receiverId } }),
      ]);

      const completed = await prisma.swap.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      await prisma.proof.create({
        data: {
          swapId: id,
          userId: currentUser.id,
          teachSkill: initiator?.teachSkill ?? "",
          learnSkill: initiator?.learnSkill ?? "",
          adaTxHash: swap.adaTxHash ?? "",
        },
      });

      await prisma.notification.createMany({
        data: [
          {
            userId: swap.initiatorId,
            type: "SWAP_COMPLETED",
            message: `Your swap with ${receiver?.name} is complete!`,
          },
          {
            userId: swap.receiverId,
            type: "SWAP_COMPLETED",
            message: `Your swap with ${initiator?.name} is complete!`,
          },
        ],
      });

      return NextResponse.json(completed);
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
