import Pusher from "pusher-js";
import * as Ably from "ably";

export { userChannel, swapChannel } from "@/lib/realtime-channels";

/**
 * Client realtime with provider fallback. The server publishes each event to
 * exactly one provider (Pusher, falling back to Ably); the client subscribes to
 * BOTH, so it receives the event whichever provider carried it. All handlers are
 * idempotent (they refetch or dedupe by id), so no extra de-duplication needed.
 *
 * Private-channel auth: Pusher via /api/pusher/auth, Ably via /api/ably/token
 * (both same-origin, so the JWT cookie is sent automatically).
 */

let pusher: Pusher | null = null;
let pusherOff = false;
function getPusher(): Pusher | null {
  if (pusherOff) return null;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) {
    pusherOff = true;
    return null;
  }
  if (!pusher) {
    pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "mt1",
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusher;
}

let ably: Ably.Realtime | null = null;
let ablyOff = false;
function getAbly(): Ably.Realtime | null {
  if (ablyOff) return null;
  if (process.env.NEXT_PUBLIC_ABLY_ENABLED !== "true") {
    ablyOff = true;
    return null;
  }
  if (!ably) {
    ably = new Ably.Realtime({ authUrl: "/api/ably/token" });
  }
  return ably;
}

export type RealtimeHandler = (data: unknown) => void;

/**
 * Subscribe to `event` on `channel` across every configured provider.
 * Returns a cleanup that removes the handlers.
 */
export function subscribe(
  channel: string,
  event: string,
  handler: RealtimeHandler
): () => void {
  const cleanups: Array<() => void> = [];

  const p = getPusher();
  if (p) {
    try {
      const ch = p.subscribe(channel);
      ch.bind(event, handler);
      cleanups.push(() => {
        try { ch.unbind(event, handler); } catch { /* ignore */ }
      });
    } catch {
      // Channel in failed state (auth error) — fall through to Ably fallback
    }
  }

  const a = getAbly();
  if (a) {
    const ch = a.channels.get(channel);
    const wrapped = (msg: Ably.Message) => handler(msg.data);
    ch.subscribe(event, wrapped);
    cleanups.push(() => ch.unsubscribe(event, wrapped));
  }

  return () => cleanups.forEach((fn) => fn());
}
