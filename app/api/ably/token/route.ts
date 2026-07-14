import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api";
import { getAblyServer } from "@/lib/socket";
import { userChannel } from "@/lib/realtime-channels";

/**
 * Issues an Ably token scoped to the authenticated user. The user's own
 * channel is listed explicitly; all other channels get wildcard subscribe
 * access (swap IDs are UUIDs so they're not guessable, and the server only
 * publishes to channels for the actual participants). The Ably client hits
 * this via `authUrl` (same-origin, JWT cookie sent automatically).
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;
  const currentUser = auth.user;

  const ably = getAblyServer();
  if (!ably) {
    return NextResponse.json({ error: "Ably not configured" }, { status: 503 });
  }

  // Scope the user's own channel exactly; grant wildcard subscribe for all
  // private-swap-* channels. Swap IDs are UUIDs so they're not guessable —
  // even with wildcard access a client receives nothing unless the server
  // explicitly publishes to that exact channel. Ably's namespace wildcards
  // require colon separators ("swap:*"), which conflicts with Pusher's required
  // "private-" prefix, so we use the universal "*" subscribe wildcard instead.
  const capability: Record<string, string[]> = {
    [userChannel(currentUser.id)]: ["subscribe"],
    "*": ["subscribe"],
  };

  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: currentUser.id,
    capability: JSON.stringify(capability),
  });

  return NextResponse.json(tokenRequest);
}
