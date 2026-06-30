import Pusher from "pusher";
import Ably from "ably";
import { userChannel, swapChannel } from "@/lib/realtime-channels";

/**
 * Server-side realtime publishing with provider fallback (works on Vercel
 * serverless - no persistent server). Publishes to the first available provider
 * and falls back to the next on failure (e.g. rate limit):
 *
 *   Pusher → Ably
 *
 * Every event is published to exactly ONE provider; the client subscribes to
 * both, so it receives the event regardless of which provider carried it.
 */

let pusherClient: Pusher | null = null;
export function getPusherServer(): Pusher | null {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET
  ) {
    return null;
  }
  if (!pusherClient) {
    pusherClient = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER ?? "mt1",
      useTLS: true,
    });
  }
  return pusherClient;
}

let ablyClient: Ably.Rest | null = null;
export function getAblyServer(): Ably.Rest | null {
  if (!process.env.ABLY_API_KEY) return null;
  if (!ablyClient) ablyClient = new Ably.Rest(process.env.ABLY_API_KEY);
  return ablyClient;
}

type Provider = {
  name: string;
  trigger: (channel: string, event: string, payload: unknown) => Promise<void>;
};

function providers(): Provider[] {
  const list: Provider[] = [];
  const p = getPusherServer();
  if (p) {
    list.push({
      name: "pusher",
      trigger: async (channel, event, payload) => {
        await p.trigger(channel, event, payload);
      },
    });
  }
  const a = getAblyServer();
  if (a) {
    list.push({
      name: "ably",
      trigger: async (channel, event, payload) => {
        await a.channels.get(channel).publish(event, payload);
      },
    });
  }
  return list;
}

async function emit(
  channel: string,
  event: string,
  payload: unknown
): Promise<void> {
  for (const provider of providers()) {
    try {
      await provider.trigger(channel, event, payload ?? {});
      return;
    } catch {
      // fall back to the next provider
    }
  }
}

/**
 * Push to a user's private channel (notifications, message badge/toast).
 * Fire-and-forget: realtime is a best-effort enhancement over the DB (the
 * source of truth), so a dropped event is non-fatal and never blocks the route.
 */
export function emitToUser(
  userId: string,
  event: string,
  payload?: unknown
): void {
  void emit(userChannel(userId), event, payload);
}

/** Push to a swap's private channel (live chat + swap updates). Fire-and-forget. */
export function emitToSwap(
  swapId: string,
  event: string,
  payload?: unknown
): void {
  void emit(swapChannel(swapId), event, payload);
}
