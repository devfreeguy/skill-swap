import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swapId: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const { swapId } = await params;

  const swap = await prisma.swap.findUnique({ where: { id: swapId } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const files = await prisma.message.findMany({
    where: {
      swapId,
      type: { in: ["IMAGE", "DOCUMENT"] },
    },
    include: {
      sender: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(files);
}
