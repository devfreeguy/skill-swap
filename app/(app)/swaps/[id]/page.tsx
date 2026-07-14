"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import DeliverableItem from "@/components/swap/DeliverableItem";
import SwapProgressTracker, {
  type ProgressStep,
} from "@/components/swap/SwapProgressTracker";
import AddDeliverableModal from "@/components/swap/AddDeliverableModal";
import AnchorProofModal from "@/components/swap/AnchorProofModal";
import { parseSkills } from "@/lib/skills";
import { relativeTime } from "@/lib/utils";
import ExchangePair from "@/components/elements/ExchangePair";
import ParticipantCard from "@/components/swap/ParticipantCard";
import { subscribe, swapChannel } from "@/lib/realtime";
import type { DeliverableType } from "@/app/generated/prisma/client";
import {
  Alert,
  Button,
  Card,
  Chip,
  Separator,
} from "@heroui/react";
import {
  IconArrowLeft,
  IconArrowsExchange,
  IconBulb,
  IconCheck,
  IconFlag,
  IconMessage,
  IconPlus,
  IconShieldCheck,
  IconUpload,
  IconUserCheck,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SessionUser = { id: string; name: string };

type SwapParticipant = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

type Delivery = {
  id: string;
  userId: string;
  type: DeliverableType;
  title?: string | null;
  resourceLink?: string | null;
  notes?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  submittedAt: string;
};

type Proof = {
  id: string;
  teachSkill: string;
  learnSkill: string;
  adaTxHash?: string | null;
  summary?: string | null;
  metadataHash?: string | null;
  chainTxHash?: string | null;
  chainStatus?: string | null;
  network?: string | null;
  createdAt: string;
};

type Swap = {
  id: string;
  status: string;
  adaTxHash?: string | null;
  feeTxHash?: string | null;
  feeLovelace?: number | null;
  paymentStatus?: string | null;
  refundTxHash?: string | null;
  initiatorSkill?: string | null;
  receiverSkill?: string | null;
  createdAt: string;
  initiatorId: string;
  receiverId: string;
  initiatorDone: boolean;
  receiverDone: boolean;
  initiator: SwapParticipant;
  receiver: SwapParticipant;
  deliveries: Delivery[];
  proof?: Proof | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function txExplorerUrl(txHash: string, network?: string | null): string {
  const sub =
    network === "mainnet"
      ? ""
      : network === "preview"
        ? "preview."
        : "preprod.";
  return `https://${sub}cardanoscan.io/transaction/${txHash}`;
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SwapDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const swapId = params.id;

  const [me, setMe] = useState<SessionUser | null>(null);
  const [swap, setSwap] = useState<Swap | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [deliverOpen, setDeliverOpen] = useState(false);
  const deliverablesRef = useRef<HTMLDivElement>(null);

  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");

  const [anchorOpen, setAnchorOpen] = useState(false);

  function openDeliverModal() {
    setDeliverOpen(true);
  }

  async function loadSwap() {
    const [meRes, swapRes] = await Promise.all([
      fetch("/api/auth/me"),
      fetch(`/api/swaps/${swapId}`),
    ]);
    const [meData, swapData] = await Promise.all([
      meRes.json(),
      swapRes.json(),
    ]);
    if (meData.error) {
      router.replace("/login");
      return;
    }
    if (swapData.error) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setMe(meData);
    setSwap(swapData);
    setLoading(false);
  }

  useEffect(() => {
    loadSwap().catch(() => router.replace("/login"));
  }, [swapId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-trigger the action from the URL param once the swap has loaded, then
  // clear the param so refreshing or navigating back doesn't repeat it.
  useEffect(() => {
    const action = searchParams.get("action");
    if (!action || loading) return;
    if (action === "submit") {
      openDeliverModal();
    } else if (action === "deliverables") {
      deliverablesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    router.replace(`/swaps/${swapId}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Live swap updates - refetch when the other party accepts, delivers,
  // confirms, cancels, or the on-chain status changes.
  useEffect(() => {
    if (!swapId) return;
    return subscribe(swapChannel(swapId), "swap:update", () => {
      loadSwap().catch(() => {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapId]);

  async function handleAction(action: "accept" | "decline" | "complete") {
    setActionError("");
    setActionPending(true);
    try {
      const res = await fetch(`/api/swaps/${swapId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Action failed.");
        return;
      }
      await loadSwap();
    } catch {
      setActionError("Something went wrong.");
    } finally {
      setActionPending(false);
    }
  }

  async function removeDeliverable(deliveryId: string) {
    try {
      const res = await fetch(
        `/api/swaps/${swapId}/deliver?deliveryId=${deliveryId}`,
        { method: "DELETE" }
      );
      if (res.ok) await loadSwap();
    } catch {
      /* no-op - list re-renders on next load */
    }
  }

  // Auto-open the anchor modal the moment a swap becomes COMPLETED with a
  // pending proof — whether that's on initial load or via a live swap:update.
  useEffect(() => {
    if (
      swap?.status === "COMPLETED" &&
      swap.proof?.metadataHash &&
      (swap.proof.chainStatus === "PENDING" || swap.proof.chainStatus === "FAILED")
    ) {
      setAnchorOpen(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swap?.status, swap?.proof?.chainStatus]);

  // Silently poll for on-chain confirmation after the tx has been submitted.
  useEffect(() => {
    if (swap?.proof?.chainStatus !== "ANCHORING") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/swaps/${swapId}/anchor`);
        const data = await res.json();
        if (data.chainStatus === "ANCHORED") {
          clearInterval(interval);
          await loadSwap();
        }
      } catch { /* keep polling */ }
    }, 15_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swap?.proof?.chainStatus]);

  if (loading)
    return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;
  if (!me) return null;

  if (notFound || !swap) {
    return (
      <main className="flex-1 px-6 py-16 text-center">
        <p className="text-muted">Swap not found.</p>
        <Link
          href="/dashboard"
          className="text-success text-sm mt-2 inline-block hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </main>
    );
  }

  // ─── Derived state ──────────────────────────────────────────────────────────

  const isInitiator = me.id === swap.initiatorId;
  const isReceiver = me.id === swap.receiverId;
  const partner = isInitiator ? swap.receiver : swap.initiator;
  const myDeliveries = swap.deliveries.filter((d) => d.userId === me.id);
  const partnerDeliveries = swap.deliveries.filter(
    (d) => d.userId === partner.id,
  );
  const myDoneFlag = isInitiator ? swap.initiatorDone : swap.receiverDone;
  const partnerDoneFlag = isInitiator ? swap.receiverDone : swap.initiatorDone;

  const isPending = swap.status === "PENDING";
  const isActive = swap.status === "ACTIVE";
  const isCompleted = swap.status === "COMPLETED";
  const isDeclined = swap.status === "DECLINED";
  const iDelivered = myDeliveries.length > 0;
  const partnerDelivered = partnerDeliveries.length > 0;
  const bothDelivered = iDelivered && partnerDelivered;

  // Prefer the skills chosen at request time; fall back to a best guess for
  // legacy swaps created before skills were captured.
  const initiatorTeach =
    swap.initiatorSkill ?? parseSkills(swap.initiator.teachSkill)[0] ?? "Skills";
  const receiverTeach =
    swap.receiverSkill ?? parseSkills(swap.receiver.teachSkill)[0] ?? "Skills";
  const myOfferedSkill = isInitiator ? initiatorTeach : receiverTeach;
  const partnerOfferedSkill = isInitiator ? receiverTeach : initiatorTeach;

  // Swap-fee status chip (only when a fee was charged on this swap).
  const feeStatus: {
    label: string;
    color: "warning" | "success" | "accent" | "danger" | "default";
    txHash?: string | null;
  } | null = (() => {
    if (!swap.paymentStatus) return null;
    const ada = ((swap.feeLovelace ?? 0) / 1_000_000).toString();
    switch (swap.paymentStatus) {
      case "PENDING":
        return { label: `Fee ${ada} ADA · confirming`, color: "warning", txHash: swap.feeTxHash };
      case "CONFIRMED":
      case "KEPT":
        return { label: `Fee ${ada} ADA paid`, color: "accent", txHash: swap.feeTxHash };
      case "REFUND_PENDING":
        return { label: `Fee refund pending`, color: "warning", txHash: swap.feeTxHash };
      case "REFUNDED":
        return { label: `Fee ${ada} ADA refunded`, color: "success", txHash: swap.refundTxHash };
      case "FAILED":
        return { label: `Fee payment failed`, color: "danger", txHash: swap.feeTxHash };
      default:
        return null;
    }
  })();

  // Contextual "what to do now" guidance for the current state + role.
  let guideMessage: string | null = null;
  if (isPending && isReceiver) {
    guideMessage = "Review this request - accept to start the exchange, or decline.";
  } else if (isPending && isInitiator) {
    guideMessage = `Waiting for ${partner.name} to accept your request.`;
  } else if (isActive && !iDelivered) {
    guideMessage = "Add your deliverable(s) below, then confirm completion.";
  } else if (isActive && iDelivered && !myDoneFlag) {
    guideMessage = `Deliverables added. Confirm completion once you and ${partner.name} are done.`;
  } else if (isActive && myDoneFlag) {
    guideMessage = `You've confirmed - waiting for ${partner.name} to confirm.`;
  } else if (isCompleted && swap.proof?.chainStatus !== "ANCHORED") {
    guideMessage = "Swap complete. Anchor the proof on-chain to make it permanently verifiable.";
  } else if (isCompleted && swap.proof?.chainStatus === "ANCHORED") {
    guideMessage = "Verified on Cardano - this exchange is permanently recorded.";
  }

  // ─── Progress steps ─────────────────────────────────────────────────────────

  const progressSteps: ProgressStep[] = [
    {
      label: "Requested",
      icon: <IconArrowsExchange size={18} />,
      done: true,
      active: false,
    },
    {
      label: "Accepted",
      icon: <IconUserCheck size={18} />,
      done: isActive || isCompleted,
      active: isPending,
    },
    {
      label: "Deliverables",
      icon: <IconUpload size={18} />,
      done: isCompleted || bothDelivered,
      active: isActive && !bothDelivered,
    },
    {
      label: "Completed",
      icon: <IconFlag size={18} />,
      done: isCompleted,
      active: isActive && bothDelivered,
    },
  ];

  // ─── Activity feed (derived from real timestamps) ────────────────────────────

  type ActivityItem = {
    id: string;
    label: string;
    time: string;
    active: boolean;
  };
  const activityItems: ActivityItem[] = [];

  if (swap.proof) {
    activityItems.push({
      id: "completed",
      label: "Swap Completed",
      time: relativeTime(swap.proof.createdAt),
      active: true,
    });
  }

  [...swap.deliveries]
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )
    .forEach((d) => {
      const who = d.userId === me.id ? "You" : partner.name;
      activityItems.push({
        id: d.id,
        label: `${who} submitted a delivery`,
        time: relativeTime(d.submittedAt),
        active: d.userId !== me.id,
      });
    });

  activityItems.push({
    id: "created",
    label: "Swap Created",
    time: new Date(swap.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    active: false,
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0">
      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="flex-1 h-fit lg:overflow-y-auto px-6 py-6 flex flex-col gap-6 min-w-0">
        {/* Back + header */}
        <div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <IconArrowLeft className="size-5" /> <span>Dashboard</span>
          </Link>
          <div className="flex items-start justify-between gap-4 mt-3">
            <h1 className="text-2xl font-bold text-foreground leading-tight flex items-center gap-1.5 flex-wrap">
              <ExchangePair a={initiatorTeach} b={receiverTeach} />
              <span>Exchange</span>
            </h1>
            <Chip
              color={STATUS_COLOR[swap.status] ?? "default"}
              className="shrink-0 mt-1"
            >
              {swap.status.charAt(0) + swap.status.slice(1).toLowerCase()}
            </Chip>
          </div>
          <p className="text-sm text-muted mt-2">
            You teach{" "}
            <span className="text-foreground font-medium">{myOfferedSkill}</span>{" "}
            · You learn{" "}
            <span className="text-accent-foreground font-medium">
              {partnerOfferedSkill}
            </span>
          </p>
          {feeStatus && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <Chip size="sm" color={feeStatus.color}>
                {feeStatus.label}
              </Chip>
              {feeStatus.txHash && (
                <span className="text-muted font-mono">
                  {feeStatus.txHash.slice(0, 8)}…{feeStatus.txHash.slice(-4)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Contextual guidance */}
        {guideMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3">
            <IconBulb size={16} className="text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{guideMessage}</p>
          </div>
        )}

        {/* Declined notice */}
        {isDeclined && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                This swap request was declined.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {/* Error notice */}
        {actionError && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{actionError}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        {/* Participants */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Participants
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ParticipantCard participant={swap.initiator} role="Initiator" />
            <ParticipantCard participant={swap.receiver} role="Receiver" />
          </div>
        </section>

        {/* Swap Progress */}
        <Card className="h-min shadow-sm bg-surface border border-border rounded-2xl p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-foreground">
            Swap Progress
          </h2>
          <div className="overflow-x-auto">
            <SwapProgressTracker steps={progressSteps} />
          </div>
        </Card>

        {/* Deliverables - ACTIVE or COMPLETED */}
        {(isActive || isCompleted) && (
          <div ref={deliverablesRef} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* My Deliverables */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <IconUpload size={15} className="text-muted" />
                <h3 className="text-sm font-semibold text-foreground">
                  My Deliverables
                </h3>
                <Chip size="sm" color={iDelivered ? "success" : "default"}>
                  {myDeliveries.length}
                </Chip>
              </div>
              <div className="flex flex-col gap-2">
                {myDeliveries.map((d) => (
                  <DeliverableItem
                    key={d.id}
                    deliverable={d}
                    onRemove={isActive ? removeDeliverable : undefined}
                  />
                ))}
                {isActive && (
                  <button
                    onClick={openDeliverModal}
                    className="w-full border border-dashed border-border rounded-xl px-4 py-3 text-sm text-muted hover:text-foreground hover:border-success/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <IconPlus size={15} />
                    Add deliverable
                  </button>
                )}
                {myDeliveries.length === 0 && isCompleted && (
                  <p className="text-sm text-muted italic">
                    No deliverables submitted.
                  </p>
                )}
              </div>
            </section>

            {/* Partner Deliverables */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <IconCheck size={15} className="text-muted" />
                <h3 className="text-sm font-semibold text-foreground">
                  Partner Deliverables
                </h3>
                <Chip size="sm" color={partnerDelivered ? "success" : "default"}>
                  {partnerDeliveries.length}
                </Chip>
              </div>
              <div className="flex flex-col gap-2">
                {partnerDeliveries.length > 0 ? (
                  partnerDeliveries.map((d) => (
                    <DeliverableItem key={d.id} deliverable={d} />
                  ))
                ) : (
                  <div className="border border-dashed border-border rounded-xl px-4 py-6 text-center">
                    <p className="text-sm text-muted">
                      Waiting for {partner.name}&apos;s deliverables…
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ── Action sidebar (stacks below content on mobile) ──────────── */}
      <aside className="flex flex-col w-full lg:w-70 shrink-0 border-t border-border lg:border-t-0 lg:border-l px-5 py-6 gap-5 lg:overflow-y-auto">
        {/* ACTIONS */}
        <section>
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-3">
            Actions
          </p>
          <div className="flex flex-col gap-2">
            {isPending && isReceiver && (
              <>
                <Button
                  className="w-full bg-success text-success-foreground font-semibold"
                  onPress={() => handleAction("accept")}
                  isPending={actionPending}
                >
                  Accept Swap
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onPress={() => handleAction("decline")}
                  isPending={actionPending}
                >
                  Decline
                </Button>
              </>
            )}

            {isPending && isInitiator && (
              <Button variant="secondary" className="w-full" isDisabled>
                Awaiting Acceptance
              </Button>
            )}

            {isActive && (
              <>
                <Button
                  className="w-full bg-success text-success-foreground font-semibold"
                  onPress={openDeliverModal}
                >
                  <IconUpload size={15} />
                  Add Deliverable
                </Button>
                {bothDelivered ? (
                  <Link href={`/messages?swap=${swapId}`} className="block">
                    <Button variant="secondary" className="w-full">
                      <IconMessage size={15} />
                      Send Message
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button variant="secondary" className="w-full" isDisabled>
                      <IconMessage size={15} />
                      Send Message
                    </Button>
                    <p className="text-xs text-muted">
                      Messaging unlocks once both of you have added a
                      deliverable.
                    </p>
                  </>
                )}

                {myDoneFlag ? (
                  <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
                    <IconCheck size={14} />
                    <span>
                      You confirmed - waiting for {partner.name} to confirm.
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    isDisabled={!iDelivered}
                    onPress={() => handleAction("complete")}
                    isPending={actionPending}
                  >
                    <IconCheck size={15} />
                    Confirm Complete
                  </Button>
                )}
                {!iDelivered && (
                  <p className="text-xs text-muted">
                    Add at least one deliverable to confirm completion.
                  </p>
                )}
              </>
            )}

            {isCompleted && (
              <>
                {swap.proof?.chainStatus === "ANCHORED" ? (
                  <a
                    href={txExplorerUrl(
                      swap.proof.chainTxHash ?? "",
                      swap.proof.network,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="secondary" className="w-full">
                      <IconShieldCheck size={15} />
                      View On-Chain Proof
                    </Button>
                  </a>
                ) : swap.proof?.chainStatus === "ANCHORING" ? (
                  <Button variant="secondary" className="w-full" isDisabled>
                    <IconShieldCheck size={15} />
                    Confirming on-chain…
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-accent text-accent-foreground font-semibold"
                    onPress={() => setAnchorOpen(true)}
                  >
                    <IconShieldCheck size={15} />
                    {swap.proof?.chainStatus === "FAILED"
                      ? "Retry Anchor"
                      : "Anchor On-Chain"}
                  </Button>
                )}
              </>
            )}

            {isDeclined && (
              <Link href="/users" className="block">
                <Button className="w-full bg-success text-success-foreground font-semibold">
                  Find New Match
                </Button>
              </Link>
            )}
          </div>
        </section>

        <Separator />

        {/* PROOF RECORD */}
        <section id="proof-record">
          <Card className="shadow-sm bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">
                Proof Record
              </p>
              <IconShieldCheck size={17} className="text-success" />
            </div>
            <Separator />
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">Resources</span>
                <span className="text-sm font-medium text-foreground">
                  {swap.deliveries.length > 0
                    ? `${swap.deliveries.length} submission${swap.deliveries.length > 1 ? "s" : ""}`
                    : "None yet"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">On-Chain</span>
                <Chip
                  size="sm"
                  color={
                    swap.proof?.chainStatus === "ANCHORED"
                      ? "success"
                      : swap.proof?.chainStatus === "ANCHORING"
                        ? "warning"
                        : swap.proof?.chainStatus === "FAILED"
                          ? "danger"
                          : "default"
                  }
                >
                  {swap.proof?.chainStatus === "ANCHORED"
                    ? "Anchored"
                    : swap.proof?.chainStatus === "ANCHORING"
                      ? "Confirming"
                      : swap.proof?.chainStatus === "FAILED"
                        ? "Failed"
                        : "Not anchored"}
                </Chip>
              </div>
              {swap.proof?.chainTxHash && (
                <a
                  href={txExplorerUrl(
                    swap.proof.chainTxHash,
                    swap.proof.network,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent font-mono break-all leading-relaxed hover:underline"
                >
                  {swap.proof.chainTxHash.slice(0, 14)}…
                  {swap.proof.chainTxHash.slice(-8)}
                </a>
              )}
              {swap.proof?.summary && (
                <p className="text-xs text-muted leading-relaxed break-all">
                  {swap.proof.summary}
                </p>
              )}
            </div>
          </Card>
        </section>

        <Separator />

        {/* RECENT ACTIVITY */}
        <section>
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-4">
            Recent Activity
          </p>
          <div className="flex flex-col gap-4">
            {activityItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3">
                <span
                  className={`size-2 rounded-full shrink-0 mt-1.5 ${
                    item.active ? "bg-success" : "bg-muted/50"
                  }`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {item.label}
                  </p>
                  <p className="text-xs text-muted">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      {/* ── Add deliverable modal ─────────────────────────────────────── */}
      <AddDeliverableModal
        swapId={swapId}
        isOpen={deliverOpen}
        onOpenChange={setDeliverOpen}
        onSuccess={loadSwap}
      />

      {/* ── Anchor proof modal (auto-opens on completion; undismissable) ── */}
      {swap.proof?.metadataHash && (
        <AnchorProofModal
          swapId={swapId}
          metadataHash={swap.proof.metadataHash}
          network={swap.proof.network ?? "preprod"}
          isOpen={anchorOpen}
          onSubmitted={() => { setAnchorOpen(false); loadSwap(); }}
        />
      )}
    </div>
  );
}
