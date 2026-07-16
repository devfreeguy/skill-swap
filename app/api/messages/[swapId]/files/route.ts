import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ swapId: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { user: currentUser, db } = auth;

  const { swapId } = await params;

  const swap = await db.swap.findUnique({ where: { id: swapId } });
  if (!swap) {
    return NextResponse.json({ error: "Swap not found" }, { status: 404 });
  }

  const isParticipant =
    swap.initiatorId === currentUser.id || swap.receiverId === currentUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const files = await db.message.findMany({
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
