"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import { parseSkills } from "@/lib/skills";
import { firstSkill, relativeTime } from "@/lib/utils";
import type { MatchType } from "@/lib/matching";
import FirstRunGuide from "@/components/elements/FirstRunGuide";
import ExchangePair from "@/components/elements/ExchangePair";
import StatCard from "@/components/dashboard/StatCard";
import MatchCard from "@/components/dashboard/MatchCard";
import DiscoverMoreCard from "@/components/dashboard/DiscoverMoreCard";
import { Avatar, Button, Card, Modal } from "@heroui/react";
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
  feeLovelace?: number | null;
  paymentStatus?: string | null;
  initiatorSkill?: string | null;
  receiverSkill?: string | null;
  initiatorId: string;
  initiator: SwapUser;
  receiver: SwapUser;
};

type PerfectMatch = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// One-line swap-fee status, mirroring the swap detail page. Returns null when no
// fee was charged (payments disabled, or a legacy swap).
function feeLine(s: Swap): { label: string; className: string } | null {
  if (!s.paymentStatus) return null;
  const ada = ((s.feeLovelace ?? 0) / 1_000_000).toString();
  switch (s.paymentStatus) {
    case "PENDING":
      return { label: `Fee ${ada} ADA confirming`, className: "text-warning" };
    case "CONFIRMED":
    case "KEPT":
      return { label: `Fee ${ada} ADA paid`, className: "text-muted" };
    case "REFUND_PENDING":
      return { label: "Fee refund pending", className: "text-warning" };
    case "REFUNDED":
      return { label: `Fee ${ada} ADA refunded`, className: "text-success" };
    case "FAILED":
      return { label: "Fee payment failed", className: "text-danger" };
    default:
      return null;
  }
}


// ─── Page ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [matches, setMatches] = useState<MatchUser[]>([]);
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState(true);
  const [perfectMatch, setPerfectMatch] = useState<PerfectMatch | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/users/matches").then((r) => r.json()),
      fetch("/api/swaps").then((r) => r.json()),
    ])
      .then(([me, matchData, swapData]) => {
        if (cancelled) return;
        if (me.error) {
          router.replace("/login");
          return;
        }
        setUser(me);
        setMatches(Array.isArray(matchData) ? matchData : []);
        const swapList: Swap[] = Array.isArray(swapData) ? swapData : [];
        setSwaps(swapList);
        setLoading(false);

        // Perfect-match prompt — shown once ever per account (localStorage
        // key is user-scoped so multiple accounts on the same device don't
        // interfere, and re-registering with the same browser starts fresh).
        const hasActiveSwaps = swapList.some(
          (s) => s.status === "ACTIVE" || s.status === "PENDING",
        );
        const pmKey = `pm_shown_${me.id}`;
        const alreadyShown = localStorage.getItem(pmKey) === "1";
        if (!hasActiveSwaps && !alreadyShown) {
          fetch("/api/users/perfect-match")
            .then((r) => r.json())
            .then((pm: PerfectMatch | null) => {
              if (cancelled) return;
              if (pm && pm.id) {
                setPerfectMatch(pm);
                setMatchModalOpen(true);
                localStorage.setItem(pmKey, "1");
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading)
    return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;
  if (!user) return null;

  const teachCount = parseSkills(user.teachSkill).length;
  const learnCount = parseSkills(user.learnSkill).length;
  const completedCount = swaps.filter((s) => s.status === "COMPLETED").length;

  const topMatches = matches.slice(0, 2);
  // The dashboard is now the single home for swaps (no separate /swaps page),
  // so show them all rather than a capped preview.
  const activeSwaps = swaps.filter(
    (s) =>
      s.status !== "COMPLETED" &&
      s.status !== "DECLINED" &&
      s.status !== "CANCELLED",
  );
  const recentHistory = swaps.filter(
    (s) =>
      s.status === "COMPLETED" ||
      s.status === "DECLINED" ||
      s.status === "CANCELLED",
  );

  return (
    <main className="flex-1 px-6 py-6 flex flex-col gap-8">
      <FirstRunGuide />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
        {/* TODO: reputation not in real DB - placeholder */}
        <StatCard
          label="Reputation Score"
          value="-"
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
              <>
                {/* Table - tablet/desktop. Columns never wrap; the container
                    scrolls horizontally if content overflows. */}
                <div className="hidden md:block overflow-x-auto">
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
                            className="text-left text-xs uppercase tracking-wider text-muted font-semibold px-4 py-3 whitespace-nowrap"
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
                        const mySkill =
                          (isInit ? s.initiatorSkill : s.receiverSkill) ??
                          firstSkill(
                            isInit
                              ? s.initiator.teachSkill
                              : s.receiver.teachSkill,
                          );
                        const theirSkill =
                          (isInit ? s.receiverSkill : s.initiatorSkill) ??
                          firstSkill(
                            isInit
                              ? s.receiver.teachSkill
                              : s.initiator.teachSkill,
                          );
                        return (
                          <tr
                            key={s.id}
                            className={`${i < activeSwaps.length - 1 ? "border-b border-border" : ""} hover:bg-background/50 transition-colors`}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
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
                            <td className="px-4 py-3 text-muted whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <ExchangePair a={mySkill} b={theirSkill} />
                                {(() => {
                                  const fee = feeLine(s);
                                  return fee ? (
                                    <span className={`text-[11px] ${fee.className}`}>
                                      {fee.label}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
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
                            <td className="px-4 py-3 text-muted whitespace-nowrap">
                              {relativeTime(s.createdAt)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
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

                {/* Card list - mobile (responsive alternative to the table) */}
                <div className="md:hidden flex flex-col divide-y divide-border">
                  {activeSwaps.map((s) => {
                    const isInit = s.initiatorId === user.id;
                    const other = isInit ? s.receiver : s.initiator;
                    const mySkill =
                      (isInit ? s.initiatorSkill : s.receiverSkill) ??
                      firstSkill(
                        isInit ? s.initiator.teachSkill : s.receiver.teachSkill,
                      );
                    const theirSkill =
                      (isInit ? s.receiverSkill : s.initiatorSkill) ??
                      firstSkill(
                        isInit ? s.receiver.teachSkill : s.initiator.teachSkill,
                      );
                    return (
                      <Link
                        key={s.id}
                        href={`/swaps/${s.id}`}
                        className="flex items-center gap-3 p-4 hover:bg-background/50 transition-colors"
                      >
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
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {other.name}
                          </p>
                          <p className="text-xs text-muted truncate">
                            <ExchangePair a={mySkill} b={theirSkill} />
                          </p>
                          {(() => {
                            const fee = feeLine(s);
                            return fee ? (
                              <span className={`text-[11px] ${fee.className} truncate`}>
                                {fee.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`size-2 rounded-full ${STATUS_DOT[s.status] ?? "bg-muted"}`}
                            />
                            <span className="text-xs text-muted">
                              {STATUS_LABEL[s.status] ?? s.status}
                            </span>
                          </span>
                          <span className="text-xs text-muted">
                            {relativeTime(s.createdAt)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recent History
          </h2>
          {recentHistory.length === 0 ? (
            <Card className="bg-surface border border-border rounded-2xl p-6 text-center text-muted text-sm">
              Past swaps will appear here.
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {recentHistory.map((s) => {
                const isInit = s.initiatorId === user.id;
                const other = isInit ? s.receiver : s.initiator;
                const myTeach = firstSkill(
                  isInit ? s.initiator.teachSkill : s.receiver.teachSkill,
                );
                const fee = feeLine(s);
                const title =
                  s.status === "COMPLETED"
                    ? `Taught ${myTeach} to ${other.name}`
                    : s.status === "DECLINED"
                      ? `Swap with ${other.name} declined`
                      : `Swap with ${other.name} cancelled`;
                return (
                  <Card
                    key={s.id}
                    className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {title}
                      </p>
                      <span className="text-xs text-muted shrink-0">
                        {formatMonth(s.createdAt)}
                      </span>
                    </div>
                    {s.status === "COMPLETED" &&
                      (s.adaTxHash ? (
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
                      ))}
                    {fee && (
                      <p className={`text-xs ${fee.className}`}>{fee.label}</p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Perfect-match prompt */}
      {perfectMatch && (
        <Modal.Backdrop
          isOpen={matchModalOpen}
          onOpenChange={setMatchModalOpen}
          variant="blur"
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-105">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-accent/10 text-accent">
                  <IconBolt className="size-5" />
                </Modal.Icon>
                <Modal.Heading>Perfect Match Found! ⚡</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
                  We found someone who teaches what you want to learn and wants
                  to learn what you teach.
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface p-4">
                  <Avatar size="md">
                    {perfectMatch.avatarUrl && (
                      <Avatar.Image
                        src={perfectMatch.avatarUrl}
                        alt={perfectMatch.name}
                      />
                    )}
                    <Avatar.Fallback className="font-semibold">
                      {perfectMatch.name.slice(0, 2).toUpperCase()}
                    </Avatar.Fallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {perfectMatch.name}
                    </p>
                    <p className="text-xs text-muted">
                      Teaches{" "}
                      <span className="text-foreground font-medium">
                        {firstSkill(perfectMatch.teachSkill)}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      Wants{" "}
                      <span className="text-accent font-medium">
                        {firstSkill(perfectMatch.learnSkill)}
                      </span>
                    </p>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button slot="close" variant="secondary">
                  Maybe Later
                </Button>
                <Button
                  onPress={() => router.push(`/users/${perfectMatch.id}`)}
                  className="bg-accent text-accent-foreground font-semibold"
                >
                  View Profile
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </main>
  );
}
