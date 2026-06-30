import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import type { User } from "@/app/generated/prisma/client";

/**
 * Shared API-route guards. These replace the auth + participant-check blocks
 * that were copy-pasted into nearly every route.
 *
 * Note on "generic CRUD": Prisma already *is* a type-safe CRUD layer
 * (`prisma.x.findMany/create/update/delete`). Wrapping it in a generic
 * read/write/update/delete function would throw away that per-model typing, so
 * we centralize the genuinely repeated *authorization* logic instead.
 */

type AuthGuard =
  | { user: User; response?: undefined }
  | { user?: undefined; response: NextResponse };

/** Resolve the current user, or a 401 response to return. */
export async function requireAuth(request: NextRequest): Promise<AuthGuard> {
  const user = await getCurrentUser(request);
  if (!user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user };
}

type SwapGuard =
  | {
      swap: { id: string; initiatorId: string; receiverId: string; status: string };
      response?: undefined;
    }
  | { swap?: undefined; response: NextResponse };

/**
 * Load a swap and confirm the user participates in it, or return the right
 * error response (404 / 403). For routes needing related data, query the swap
 * with includes separately after this check passes.
 */
export async function requireParticipantSwap(
  swapId: string,
  userId: string
): Promise<SwapGuard> {
  const swap = await prisma.swap.findUnique({
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
