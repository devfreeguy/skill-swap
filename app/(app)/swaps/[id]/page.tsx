"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import DeliverableItem from "@/components/swap/DeliverableItem";
import SwapProgressTracker, {
  type ProgressStep,
} from "@/components/swap/SwapProgressTracker";
import { parseSkills } from "@/lib/skills";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  Input,
  Label,
  Modal,
  Separator,
  TextArea,
  TextField,
} from "@heroui/react";
import {
  IconArrowLeft,
  IconArrowsExchange,
  IconCheck,
  IconFlag,
  IconMessage,
  IconShieldCheck,
  IconUpload,
  IconUserCheck,
} from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  resourceLink: string;
  notes?: string | null;
  submittedAt: string;
};

type Proof = {
  id: string;
  teachSkill: string;
  learnSkill: string;
  adaTxHash: string;
  summary?: string | null;
  createdAt: string;
};

type Swap = {
  id: string;
  status: string;
  adaTxHash?: string | null;
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

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Participant Card (swap-context: shows both parties) ──────────────────────

function ParticipantCard({
  participant,
  role,
}: {
  participant: SwapParticipant;
  role: "Initiator" | "Receiver";
}) {
  const teach = parseSkills(participant.teachSkill);
  const learn = parseSkills(participant.learnSkill);

  return (
    <Card className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar size="md">
          {participant.avatarUrl && (
            <Avatar.Image src={participant.avatarUrl} alt={participant.name} />
          )}
          <Avatar.Fallback className="text-sm font-semibold">
            {participant.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        <div>
          <p className="font-semibold text-foreground">{participant.name}</p>
          <p className="text-xs text-muted">{role}</p>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-2">
            Teaching
          </p>
          <div className="flex flex-wrap gap-1">
            {teach.length > 0 ? (
              teach.map((s) => (
                <Chip key={s} size="sm">
                  {s}
                </Chip>
              ))
            ) : (
              <span className="text-xs text-muted">—</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-muted uppercase mb-2">
            Learning
          </p>
          <div className="flex flex-wrap gap-1">
            {learn.length > 0 ? (
              learn.map((s) => (
                <Chip
                  key={s}
                  size="sm"
                  className="border border-success/40 text-success"
                >
                  {s}
                </Chip>
              ))
            ) : (
              <span className="text-xs text-muted">—</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SwapDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const swapId = params.id;

  const [me, setMe] = useState<SessionUser | null>(null);
  const [swap, setSwap] = useState<Swap | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [deliverOpen, setDeliverOpen] = useState(false);
  const [resourceLink, setResourceLink] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState("");

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

  async function submitDelivery() {
    if (!resourceLink.trim()) {
      setDeliveryError("Please enter a resource link.");
      return;
    }
    setDeliveryError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/swaps/${swapId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceLink: resourceLink.trim(), notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeliveryError(data.error || "Delivery failed.");
        return;
      }
      setDeliverOpen(false);
      setResourceLink("");
      setNotes("");
      await loadSwap();
    } catch {
      setDeliveryError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return <LemniscateLoader loading text="Loading..." overlayOpacity={1} />;
  if (!me) return null;

  if (notFound || !swap) {
    return (
      <main className="flex-1 px-6 py-16 text-center">
        <p className="text-muted">Swap not found.</p>
        <Link
          href="/swaps"
          className="text-success text-sm mt-2 inline-block hover:underline"
        >
          ← Back to Swaps
        </Link>
      </main>
    );
  }

  // ─── Derived state ──────────────────────────────────────────────────────────

  const isInitiator = me.id === swap.initiatorId;
  const isReceiver = me.id === swap.receiverId;
  const partner = isInitiator ? swap.receiver : swap.initiator;
  const myDelivery = swap.deliveries.find((d) => d.userId === me.id);
  const partnerDelivery = swap.deliveries.find((d) => d.userId === partner.id);
  const myDoneFlag = isInitiator ? swap.initiatorDone : swap.receiverDone;

  const isPending = swap.status === "PENDING";
  const isActive = swap.status === "ACTIVE";
  const isCompleted = swap.status === "COMPLETED";
  const isDeclined = swap.status === "DECLINED";
  const bothDelivered = swap.deliveries.length >= 2;

  const initiatorTeach = parseSkills(swap.initiator.teachSkill)[0] ?? "Skills";
  const receiverTeach = parseSkills(swap.receiver.teachSkill)[0] ?? "Skills";
  const swapTitle = `${initiatorTeach} ↔ ${receiverTeach} Exchange`;

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
    <div className="flex flex-1 min-h-0">
      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6 min-w-0">
        {/* Back + header */}
        <div>
          <Link
            href="/swaps"
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <IconArrowLeft className="size-5" /> <span>Swaps</span>
          </Link>
          <div className="flex items-start justify-between gap-4 mt-3">
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              {swapTitle}
            </h1>
            <Chip
              color={STATUS_COLOR[swap.status] ?? "default"}
              className="shrink-0 mt-1"
            >
              {swap.status.charAt(0) + swap.status.slice(1).toLowerCase()}
            </Chip>
          </div>
        </div>

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

        {/* Mobile-only: accept/decline for pending receiver */}
        {isPending && isReceiver && (
          <div className="flex gap-3 lg:hidden">
            <Button
              className="flex-1 bg-success text-success-foreground font-semibold"
              onPress={() => handleAction("accept")}
              isPending={actionPending}
            >
              Accept
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onPress={() => handleAction("decline")}
              isPending={actionPending}
            >
              Decline
            </Button>
          </div>
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
        <Card className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-6">
            Swap Progress
          </h2>
          <div className="overflow-x-auto">
            <SwapProgressTracker steps={progressSteps} />
          </div>
        </Card>

        {/* Deliverables — ACTIVE or COMPLETED */}
        {(isActive || isCompleted) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* My Deliverables */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <IconUpload size={15} className="text-muted" />
                <h3 className="text-sm font-semibold text-foreground">
                  My Deliverables
                </h3>
              </div>
              <div className="flex flex-col gap-2">
                {myDelivery && (
                  <>
                    <DeliverableItem
                      type="link"
                      title={myDelivery.resourceLink}
                      subtitle={myDelivery.resourceLink}
                      href={myDelivery.resourceLink}
                    />
                    {myDelivery.notes && (
                      <DeliverableItem
                        type="notes"
                        title="Session Notes"
                        subtitle={myDelivery.notes}
                      />
                    )}
                  </>
                )}
                {isActive && (
                  <button
                    onClick={() => setDeliverOpen(true)}
                    className="w-full border border-dashed border-border rounded-xl px-4 py-3 text-sm text-muted hover:text-foreground hover:border-success/40 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="text-base leading-none font-light">+</span>
                    {myDelivery ? "Update Resource" : "Upload Resource"}
                  </button>
                )}
                {!myDelivery && isCompleted && (
                  <p className="text-sm text-muted italic">
                    No deliverable submitted.
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
                {partnerDelivery && !isCompleted && (
                  <Chip size="sm" color="warning">
                    Pending
                  </Chip>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {partnerDelivery ? (
                  <>
                    <DeliverableItem
                      type="link"
                      title={partnerDelivery.resourceLink}
                      subtitle={`Added ${relativeTime(partnerDelivery.submittedAt)}`}
                      href={partnerDelivery.resourceLink}
                    />
                    {partnerDelivery.notes && (
                      <DeliverableItem
                        type="notes"
                        title="Session Notes"
                        subtitle={partnerDelivery.notes}
                      />
                    )}
                    {isActive && (
                      <div className="flex gap-2 mt-1">
                        {!myDoneFlag ? (
                          <>
                            <Button
                              className="flex-1 bg-success text-success-foreground font-semibold"
                              size="sm"
                              onPress={() => handleAction("complete")}
                              isPending={actionPending}
                            >
                              Approve
                            </Button>
                            {/* TODO: Request Changes requires messaging API */}
                            <Button
                              variant="secondary"
                              size="sm"
                              isDisabled
                              className="flex-1"
                            >
                              Request Changes
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-success py-1">
                            <IconCheck size={14} />
                            <span>You approved this delivery</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="border border-dashed border-border rounded-xl px-4 py-6 text-center">
                    <p className="text-sm text-muted">
                      Waiting for partner&apos;s delivery…
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ── Right sidebar ────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-l border-border px-5 py-6 gap-5 overflow-y-auto">
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
                  onPress={() => setDeliverOpen(true)}
                >
                  <IconUpload size={15} />
                  Submit Deliverable
                </Button>
                {/* TODO: messaging API not implemented */}
                <Button variant="secondary" className="w-full" isDisabled>
                  <IconMessage size={15} />
                  Send Message
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  isDisabled={myDoneFlag}
                  onPress={() => handleAction("complete")}
                  isPending={actionPending}
                >
                  <IconCheck size={15} />
                  {myDoneFlag ? "Marked Complete" : "Mark Complete"}
                </Button>
              </>
            )}

            {isCompleted && (
              <Button
                variant="secondary"
                className="w-full"
                onPress={() =>
                  document
                    .getElementById("proof-record")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <IconShieldCheck size={15} />
                View Proof
              </Button>
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
          <Card className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
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
                <Chip size="sm" color={swap.adaTxHash ? "success" : "warning"}>
                  {swap.adaTxHash ? "Submitted" : "Pending"}
                </Chip>
              </div>
              {swap.adaTxHash && (
                <p className="text-xs text-muted font-mono break-all leading-relaxed">
                  {swap.adaTxHash.slice(0, 14)}…{swap.adaTxHash.slice(-8)}
                </p>
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

      {/* ── Delivery modal ───────────────────────────────────────────── */}
      <Modal.Backdrop isOpen={deliverOpen} onOpenChange={setDeliverOpen}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Submit Deliverable</Modal.Heading>
              <p className="text-sm text-muted mt-1">
                Share a link to your work as proof of delivery.
              </p>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col gap-4 p-1">
                <TextField className="w-full" isRequired>
                  <Label>Resource Link</Label>
                  <Input
                    placeholder="https://github.com/..."
                    value={resourceLink}
                    onChange={(e) => setResourceLink(e.target.value)}
                    type="url"
                  />
                </TextField>
                <TextField className="w-full">
                  <Label>Notes (optional)</Label>
                  <TextArea
                    placeholder="Describe what you delivered..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </TextField>
                {deliveryError && (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>{deliveryError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Cancel
              </Button>
              <Button
                className="bg-success text-success-foreground font-semibold"
                onPress={submitDelivery}
                isPending={submitting}
              >
                Submit
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
