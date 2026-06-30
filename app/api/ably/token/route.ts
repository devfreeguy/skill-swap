import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api";
import { getAblyServer } from "@/lib/socket";
import { userChannel, swapChannel } from "@/lib/realtime-channels";

/**
 * Issues a scoped Ably token: the user may only subscribe to their own channel
 * and the channels of swaps they participate in. The Ably client hits this via
 * `authUrl` (same-origin, JWT cookie sent) and auto-refreshes, picking up newly
 * created swaps on the next token cycle.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const ably = getAblyServer();
  if (!ably) {
    return NextResponse.json({ error: "Ably not configured" }, { status: 503 });
  }

  const swaps = await prisma.swap.findMany({
    where: {
      OR: [{ initiatorId: currentUser.id }, { receiverId: currentUser.id }],
    },
    select: { id: true },
  });

  const capability: Record<string, string[]> = {
    [userChannel(currentUser.id)]: ["subscribe"],
  };
  for (const s of swaps) capability[swapChannel(s.id)] = ["subscribe"];

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: currentUser.id,
    capability: JSON.stringify(capability),
  });

  return NextResponse.json(tokenRequest);
}
