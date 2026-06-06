import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { resourceLink, notes } = body as {
    resourceLink: string;
    notes?: string;
  };

  if (!resourceLink) {
    return NextResponse.json(
      { error: "resourceLink is required" },
      { status: 400 }
    );
  }

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  if (swap.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Swap must be active to submit delivery" },
      { status: 400 }
    );
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const delivery = await prisma.delivery.upsert({
    where: { swapId_userId: { swapId: id, userId: currentUser.id } },
    create: { swapId: id, userId: currentUser.id, resourceLink, notes },
    update: { resourceLink, notes },
  });

  const deliveryCount = await prisma.delivery.count({
    where: {
      swapId: id,
      userId: { in: [swap.initiatorId, swap.receiverId] },
    },
  });

  if (deliveryCount >= 2) {
    try {
      const allDeliveries = await prisma.delivery.findMany({
        where: { swapId: id },
      });
      const summary = allDeliveries
        .map((d) => d.resourceLink)
        .filter(Boolean)
        .join(" | ");

      const [initiator, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: swap.initiatorId } }),
        prisma.user.findUnique({ where: { id: swap.receiverId } }),
      ]);

      await prisma.$transaction([
        prisma.swap.update({
          where: { id },
          data: { status: "COMPLETED" },
        }),
        prisma.proof.create({
          data: {
            swapId: id,
            userId: swap.initiatorId,
            teachSkill: initiator?.teachSkill ?? "",
            learnSkill: initiator?.learnSkill ?? "",
            adaTxHash: swap.adaTxHash ?? "",
            summary,
          },
        }),
        prisma.notification.createMany({
          data: [
            {
              userId: swap.initiatorId,
              type: "SWAP_COMPLETED",
              message: `Your swap with ${receiver?.name} is complete! Both deliveries received.`,
            },
            {
              userId: swap.receiverId,
              type: "SWAP_COMPLETED",
              message: `Your swap with ${initiator?.name} is complete! Both deliveries received.`,
            },
          ],
        }),
      ]);

      return NextResponse.json({ delivery, completed: true });
    } catch {
      return NextResponse.json({ delivery, completed: true });
    }
  }

  return NextResponse.json({ delivery, completed: false, awaitingOther: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const swap = await prisma.swap.findUnique({ where: { id } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const delivery = await prisma.delivery.findUnique({
    where: { swapId_userId: { swapId: id, userId: currentUser.id } },
  });

  return NextResponse.json(delivery);
}
