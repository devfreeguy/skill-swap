import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { getPusherServer } from "@/lib/socket";
import { userChannel, swapChannel } from "@/lib/realtime-channels";

/**
 * Authorizes a client's subscription to a private Pusher channel. A user may
 * only subscribe to their own user channel, or a swap channel they participate
 * in. Pusher posts `socket_id` + `channel_name` as form-encoded data.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const form = await request.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");
  if (!socketId || !channel) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  let allowed = false;

  if (channel === userChannel(currentUser.id)) {
    allowed = true;
  } else if (channel.startsWith("private-swap-")) {
    const swapId = channel.slice("private-swap-".length);
    if (channel === swapChannel(swapId)) {
      const swap = await prisma.swap.findUnique({
        where: { id: swapId },
        select: { initiatorId: true, receiverId: true },
      });
      allowed =
        !!swap &&
        (swap.initiatorId === currentUser.id ||
          swap.receiverId === currentUser.id);
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json(
      { error: "Pusher not configured" },
      { status: 503 }
    );
  }

  const authResponse = pusher.authorizeChannel(socketId, channel);
  return NextResponse.json(authResponse);
}
