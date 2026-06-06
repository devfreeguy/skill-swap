import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const swap = await prisma.swap.findUnique({
    where: { id },
    include: {
      initiator: {
        select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
      },
      receiver: {
        select: { id: true, name: true, avatarUrl: true, teachSkill: true, learnSkill: true },
      },
      deliveries: {
        select: { id: true, userId: true, resourceLink: true, notes: true, submittedAt: true },
      },
      proof: {
        select: { id: true, teachSkill: true, learnSkill: true, adaTxHash: true, summary: true, createdAt: true },
      },
    },
  });

  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(swap);
}

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
      return NextResponse.json(
        { error: "Only receiver can accept" },
        { status: 403 }
      );
    }
    if (swap.status !== "PENDING") {
      return NextResponse.json(
        { error: "Swap is not pending" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Only receiver can decline" },
        { status: 403 }
      );
    }
    if (swap.status !== "PENDING") {
      return NextResponse.json(
        { error: "Swap is not pending" },
        { status: 400 }
      );
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
    if (swap.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Swap must be active to mark complete" },
        { status: 400 }
      );
    }

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
      const existingProof = await prisma.proof.findUnique({
        where: { swapId: id },
      });

      if (!existingProof) {
        const [initiator, receiver, deliveries] = await Promise.all([
          prisma.user.findUnique({ where: { id: swap.initiatorId } }),
          prisma.user.findUnique({ where: { id: swap.receiverId } }),
          prisma.delivery.findMany({ where: { swapId: id } }),
        ]);

        const summary =
          deliveries.length > 0
            ? deliveries.map((d) => d.resourceLink).join(" | ")
            : undefined;

        await prisma.$transaction([
          prisma.swap.update({ where: { id }, data: { status: "COMPLETED" } }),
          prisma.proof.create({
            data: {
              swapId: id,
              userId: swap.initiatorId,
              teachSkill: initiator?.teachSkill ?? "",
              learnSkill: initiator?.learnSkill ?? "",
              adaTxHash: swap.adaTxHash ?? "",
              ...(summary && { summary }),
            },
          }),
          prisma.notification.createMany({
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
          }),
        ]);

        return NextResponse.json({ ...updated, status: "COMPLETED" });
      }

      await prisma.swap.update({
        where: { id },
        data: { status: "COMPLETED" },
      });
      return NextResponse.json({ ...updated, status: "COMPLETED" });
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
