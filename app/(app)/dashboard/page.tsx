"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import { parseSkills } from "@/lib/skills";
import type { MatchType } from "@/lib/matching";
import { Avatar, Button, Card, Chip, Separator } from "@heroui/react";
import { IconArrowRight, IconBolt, IconCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SessionUser = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

type MatchUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
  score: number;
  type: MatchType;
  teachOverlap: string[];
  learnOverlap: string[];
};

type SwapUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

type Swap = {
  id: string;
  status: string;
  createdAt: string;
  adaTxHash?: string | null;
  initiatorId: string;
  initiator: SwapUser;
  receiver: SwapUser;
};

type Notification = {
  id: string;
  read: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function matchPercent(score: number): number {
  return Math.min(50 + score * 15, 99);
}

function firstSkill(raw?: string | null): string {
  return parseSkills(raw)[0] ?? "—";
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-accent",
  PENDING: "bg-warning",
  COMPLETED: "bg-accent",
  DECLINED: "bg-danger",
  CANCELLED: "bg-muted",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

const ACTION_LABEL: Record<string, string> = {
  ACTIVE: "Open",
  PENDING: "Review",
  COMPLETED: "Details",
  DECLINED: "Details",
  CANCELLED: "Details",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted leading-tight">
          {label}
        </p>
        <span className="text-muted shrink-0">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${valueClass ?? "text-foreground"}`}>
        {value}
      </p>
    </Card>
  );
}

function MatchCard({ match }: { match: MatchUser }) {
  const pct = matchPercent(match.score);
  const teachSkills = parseSkills(match.teachSkill);
  const learnSkills = parseSkills(match.learnSkill);
  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-accent/40 transition-colors">
      <div className="flex justify-end">
        <span className="inline-flex items-center gap-1 text-xs font-semibold bg-surface border border-accent/40 text-accent rounded-full px-2.5 py-1">
          <IconBolt size={12} />
          {pct}% Match
        </span>
      </div>
      <div className="flex items-center gap-3 -mt-2">
        <Avatar size="md">
          {match.avatarUrl && (
            <Avatar.Image src={match.avatarUrl} alt={match.name} />
          )}
          <Avatar.Fallback className="font-semibold">
            {match.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{match.name}</p>
          {teachSkills.length > 0 && (
            <p className="text-xs text-muted">{teachSkills.join(", ")}</p>
          )}
        </div>
      </div>
      <Separator />
      <div className="flex flex-col gap-2 text-xs">
        {teachSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="uppercase tracking-wider text-muted font-semibold w-14 shrink-0">
              Teaches
            </span>
            {teachSkills.slice(0, 2).map((s) => (
              <Chip key={s} size="sm" color="default" className="text-xs">
                {s}
              </Chip>
            ))}
          </div>
        )}
        {learnSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="uppercase tracking-wider text-muted font-semibold w-14 shrink-0">
              Wants
            </span>
            <span className="text-accent font-medium">
              {learnSkills.slice(0, 2).join(", ")}
            </span>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-auto">
        <Link href={`/users/${match.id}`} className="flex-1">
          <Button variant="secondary" size="sm" className="w-full">
            View Profile
          </Button>
        </Link>
        <Link href={`/users/${match.id}`} className="flex-1">
          <Button
            size="sm"
            className="w-full font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Request
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function DiscoverMoreCard() {
  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 flex flex-col items-center justify-center gap-3 min-h-55 hover:border-accent/40 transition-colors">
      <p className="text-muted text-sm font-medium">Discover More</p>
      <Link href="/users">
        <Button variant="secondary" size="sm">
          Browse All
        </Button>
      </Link>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/users/matches").then((r) => r.json()),
      fetch("/api/swaps").then((r) => r.json()),
    ])
      .then(([me, matchData, swapData]) => {
        if (me.error) {
          router.replace("/login");
          return;
        }
        setUser(me);
        setMatches(Array.isArray(matchData) ? matchData : []);
        setSwaps(Array.isArray(swapData) ? swapData : []);
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (loading)
    return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;
  if (!user) return null;

  const teachCount = parseSkills(user.teachSkill).length;
  const learnCount = parseSkills(user.learnSkill).length;
  const completedCount = swaps.filter((s) => s.status === "COMPLETED").length;

  const topMatches = matches.slice(0, 2);
  const activeSwaps = swaps
    .filter(
      (s) =>
        s.status !== "COMPLETED" &&
        s.status !== "DECLINED" &&
        s.status !== "CANCELLED",
    )
    .slice(0, 5);
  const recentHistory = swaps
    .filter((s) => s.status === "COMPLETED")
    .slice(0, 4);

  return (
    <main className="flex-1 px-6 py-6 flex flex-col gap-8">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Completed Exchanges"
          value={completedCount}
          icon={<IconCheck size={18} />}
        />
        <StatCard
          label="Skills Taught"
          value={teachCount}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          }
        />
        <StatCard
          label="Skills Learned"
          value={learnCount}
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          }
        />
        {/* TODO: reputation not in real DB — placeholder */}
        <StatCard
          label="Reputation Score"
          value="—"
          valueClass="text-accent"
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          }
        />
      </div>

      {/* Suggested Matches */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Suggested Matches
          </h2>
          <Link
            href="/users"
            className="text-sm text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
          >
            View All <IconArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {topMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
          <DiscoverMoreCard />
        </div>
      </section>

      {/* Active Swaps + Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Active Swaps
            </h2>
            <Link
              href="/swaps"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              View all
            </Link>
          </div>
          <Card className="bg-surface border border-border rounded-2xl overflow-hidden">
            {activeSwaps.length === 0 ? (
              <div className="p-8 text-center text-muted text-sm">
                No active swaps.{" "}
                <Link href="/users" className="text-accent hover:underline">
                  Find someone to swap with.
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        "Partner",
                        "Skills Exchanged",
                        "Status",
                        "Last Activity",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs uppercase tracking-wider text-muted font-semibold px-4 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeSwaps.map((s, i) => {
                      const isInit = s.initiatorId === user.id;
                      const other = isInit ? s.receiver : s.initiator;
                      const mySkill = firstSkill(
                        isInit ? s.initiator.teachSkill : s.receiver.teachSkill,
                      );
                      const theirSkill = firstSkill(
                        isInit ? s.receiver.teachSkill : s.initiator.teachSkill,
                      );
                      return (
                        <tr
                          key={s.id}
                          className={`${i < activeSwaps.length - 1 ? "border-b border-border" : ""} hover:bg-background/50 transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Avatar size="sm">
                                {other.avatarUrl && (
                                  <Avatar.Image
                                    src={other.avatarUrl}
                                    alt={other.name}
                                  />
                                )}
                                <Avatar.Fallback className="text-xs font-semibold">
                                  {other.name.slice(0, 2).toUpperCase()}
                                </Avatar.Fallback>
                              </Avatar>
                              <span className="font-medium text-foreground">
                                {other.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {mySkill} ↔ {theirSkill}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className={`size-2 rounded-full ${STATUS_DOT[s.status] ?? "bg-muted"}`}
                              />
                              <span
                                className={
                                  s.status === "ACTIVE"
                                    ? "text-accent text-xs font-medium"
                                    : s.status === "PENDING"
                                      ? "text-warning text-xs font-medium"
                                      : "text-muted text-xs"
                                }
                              >
                                {STATUS_LABEL[s.status] ?? s.status}
                              </span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {relativeTime(s.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/swaps/${s.id}`}>
                              <span className="text-accent text-sm font-medium hover:underline">
                                {ACTION_LABEL[s.status] ?? "Open"}
                              </span>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recent History
          </h2>
          {recentHistory.length === 0 ? (
            <Card className="bg-surface border border-border rounded-2xl p-6 text-center text-muted text-sm">
              Completed swaps will appear here.
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {recentHistory.map((s) => {
                const isInit = s.initiatorId === user.id;
                const other = isInit ? s.receiver : s.initiator;
                const myTeach = firstSkill(
                  isInit ? s.initiator.teachSkill : s.receiver.teachSkill,
                );
                return (
                  <Card
                    key={s.id}
                    className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        Taught {myTeach} to {other.name}
                      </p>
                      <span className="text-xs text-muted shrink-0">
                        {formatMonth(s.createdAt)}
                      </span>
                    </div>
                    {s.adaTxHash ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs text-success">
                          <IconCheck size={13} /> Verified on Cardano
                        </div>
                        <p className="text-xs text-muted font-mono truncate">
                          Tx: {s.adaTxHash.slice(0, 8)}...
                          {s.adaTxHash.slice(-4)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted">No tx hash recorded</p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
