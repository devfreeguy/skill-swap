"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import { Avatar, Card, Chip } from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Swap = {
  id: string;
  status: string;
  createdAt: string;
  initiatorId: string;
  initiator: { id: string; name: string; avatarUrl?: string | null };
  receiver: { id: string; name: string; avatarUrl?: string | null };
};

const STATUS_COLOR: Record<
  string,
  "warning" | "success" | "accent" | "danger" | "default"
> = {
  PENDING: "warning",
  ACTIVE: "success",
  COMPLETED: "accent",
  DECLINED: "danger",
  CANCELLED: "default",
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function SwapsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/swaps").then((r) => r.json()),
    ])
      .then(([me, swapData]) => {
        if (me.error) {
          router.replace("/login");
          return;
        }
        setUserId(me.id);
        setSwaps(Array.isArray(swapData) ? swapData : []);
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (loading)
    return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;
  if (!userId) return null;

  const active = swaps.filter(
    (s) => s.status === "PENDING" || s.status === "ACTIVE",
  );
  const past = swaps.filter(
    (s) => s.status !== "PENDING" && s.status !== "ACTIVE",
  );

  function SwapRow({ s }: { s: Swap }) {
    const other = s.initiatorId === userId ? s.receiver : s.initiator;
    return (
      <Link href={`/swaps/${s.id}`}>
        <Card className="bg-surface border border-border rounded-xl p-4 flex items-center gap-4 hover:border-accent/30 transition-colors">
          <Avatar size="sm">
            {other.avatarUrl && (
              <Avatar.Image src={other.avatarUrl} alt={other.name} />
            )}
            <Avatar.Fallback>
              {other.name.slice(0, 2).toUpperCase()}
            </Avatar.Fallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{other.name}</p>
            <p className="text-xs text-muted">{relativeTime(s.createdAt)}</p>
          </div>
          <Chip color={STATUS_COLOR[s.status] ?? "default"} size="sm">
            {s.status}
          </Chip>
        </Card>
      </Link>
    );
  }

  return (
    <main className="flex-1 px-6 py-6 flex flex-col gap-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">My Swaps</h1>

      {active.length === 0 && past.length === 0 && (
        <Card className="bg-surface border border-border rounded-2xl p-12 text-center text-muted">
          No swaps yet.{" "}
          <Link href="/users" className="text-success underline">
            Discover people
          </Link>{" "}
          to start one.
        </Card>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Active
          </h2>
          {active.map((s) => (
            <SwapRow key={s.id} s={s} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            History
          </h2>
          <div className="opacity-75">
            {past.map((s) => (
              <SwapRow key={s.id} s={s} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
