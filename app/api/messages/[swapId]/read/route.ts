import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireParticipantSwap } from "@/lib/api";

/** Mark a conversation as read for the current user (resets its unread count). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ swapId: string }> }
) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const { db } = auth;

  const { swapId } = await params;
  const result = await requireParticipantSwap(swapId, auth.user.id, db);
  if (result.response) return result.response;

  const isInitiator = result.swap.initiatorId === auth.user.id;
  await db.swap.update({
    where: { id: swapId },
    data: isInitiator
      ? { initiatorLastReadAt: new Date() }
      : { receiverLastReadAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
