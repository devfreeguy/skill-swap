import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { getNetwork } from "@/lib/network";
import type { User, PrismaClient } from "@/app/generated/prisma/client";

type AuthGuard =
  | { user: User; db: PrismaClient; response?: undefined }
  | { user?: undefined; db?: undefined; response: NextResponse };

/** Resolve the current user and network DB, or return a 401 response. */
export async function requireAuth(request: NextRequest): Promise<AuthGuard> {
  const network = getNetwork(request);
  const db = getPrisma(network);
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, db };
}

type SwapGuard =
  | {
      swap: { id: string; initiatorId: string; receiverId: string; status: string };
      response?: undefined;
    }
  | { swap?: undefined; response: NextResponse };

/**
 * Load a swap and confirm the user participates in it, or return the right
 * error response (404 / 403).
 */
export async function requireParticipantSwap(
  swapId: string,
  userId: string,
  db: PrismaClient
): Promise<SwapGuard> {
  const swap = await db.swap.findUnique({
    where: { id: swapId },
    select: { id: true, initiatorId: true, receiverId: true, status: true },
  });
  if (!swap) {
    return {
      response: NextResponse.json({ error: "Swap not found" }, { status: 404 }),
    };
  }
  if (swap.initiatorId !== userId && swap.receiverId !== userId) {
    return {
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { swap };
}
