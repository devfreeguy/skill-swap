"use client";

import React from "react";
import { Button, Separator, Tooltip } from "@heroui/react";
import AddDeliverableModal from "@/components/swap/AddDeliverableModal";
import {
  IconArrowsExchange,
  IconCheck,
  IconCode,
  IconExternalLink,
  IconFile,
  IconFileText,
  IconPhoto,
  IconShieldCheck,
  IconUpload,
} from "@tabler/icons-react";
import Link from "next/link";
import { parseSkills } from "@/lib/skills";
import { cn } from "@/lib/utils";

export type ExchangeSwap = {
  id: string;
  status: string;
  adaTxHash?: string | null;
  initiatorSkill?: string | null;
  receiverSkill?: string | null;
  initiatorDone?: boolean;
  receiverDone?: boolean;
  proof?: { id: string; chainStatus?: string | null; chainTxHash?: string | null; network?: string | null } | null;
  initiatorId: string;
  receiverId: string;
  initiator: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    teachSkill?: string | null;
    learnSkill?: string | null;
    publicKey?: string | null;
  };
  receiver: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    teachSkill?: string | null;
    learnSkill?: string | null;
    publicKey?: string | null;
  };
};

export type RecentFile = {
  id: string;
  type: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl?: string | null };
};

type Props = {
  swap: ExchangeSwap;
  currentUserId: string;
  recentFiles: RecentFile[];
  onComplete?: () => Promise<void>;
  onDeliverableAdded?: () => void;
};

function cardanoExplorerUrl(txHash: string, network?: string | null): string {
  const sub = network === "mainnet" ? "" : network === "preview" ? "preview." : "preprod.";
  return `https://${sub}cardanoscan.io/transaction/${txHash}`;
}

const STATUS_TEXT: Record<string, { label: string; dotClass: string; textClass: string }> = {
  ACTIVE: { label: "Active", dotClass: "bg-accent", textClass: "text-accent" },
  COMPLETED: { label: "Completed", dotClass: "bg-accent", textClass: "text-accent" },
  PENDING: { label: "Pending", dotClass: "bg-warning", textClass: "text-warning" },
  DECLINED: { label: "Declined", dotClass: "bg-danger", textClass: "text-danger" },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ExchangeContextPanel({
  swap,
  currentUserId,
  recentFiles,
  onComplete,
  onDeliverableAdded,
}: Props) {
  const [completing, setCompleting] = React.useState(false);
  const [completeError, setCompleteError] = React.useState("");
  const [deliverOpen, setDeliverOpen] = React.useState(false);

  const isInitiator = swap.initiatorId === currentUserId;
  const me = isInitiator ? swap.initiator : swap.receiver;
  const other = isInitiator ? swap.receiver : swap.initiator;

  // Prefer the skills chosen at request time; fall back to user-profile skills.
  const myTeach = (isInitiator ? swap.initiatorSkill : swap.receiverSkill)
    ?? parseSkills(me.teachSkill)[0]
    ?? "-";
  const myLearn = (isInitiator ? swap.receiverSkill : swap.initiatorSkill)
    ?? parseSkills(other.teachSkill)[0]
    ?? "-";

  const myDone = isInitiator ? (swap.initiatorDone ?? false) : (swap.receiverDone ?? false);
  const isActive = swap.status === "ACTIVE";
  const isCompleted = swap.status === "COMPLETED";
  const hasProof = isCompleted && swap.proof?.chainStatus === "ANCHORED";

  const swapIdShort = `SWP-${swap.id.slice(-4).toUpperCase()}`;
  const statusInfo = STATUS_TEXT[swap.status] ?? {
    label: swap.status,
    dotClass: "bg-muted",
    textClass: "text-muted",
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Swap ID card */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-muted">ID: {swapIdShort}</span>
          <span
            className={cn(
              "text-xs font-semibold flex items-center gap-1.5",
              statusInfo.textClass
            )}
          >
            <span
              className={cn("size-1.5 rounded-full inline-block", statusInfo.dotClass)}
            />
            {statusInfo.label}
          </span>
        </div>

        <Separator />

        {/* You Teach */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">
            You Teach
          </p>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
              <IconCode size={13} className="text-accent" />
            </div>
            <span className="text-sm font-semibold text-foreground truncate">
              {myTeach}
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <IconArrowsExchange size={14} className="text-muted" />
        </div>

        {/* You Learn */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">
            You Learn
          </p>
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
              <IconCode size={13} className="text-muted" />
            </div>
            <span className="text-sm font-semibold text-foreground truncate">
              {myLearn}
            </span>
          </div>
        </div>

        {/* Complete Swap button */}
        {isActive && onComplete && (
          <>
            <Separator />
            {myDone ? (
              <div className="flex items-center gap-2 text-xs text-success">
                <IconCheck size={13} />
                You confirmed — waiting for partner
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  className="w-full bg-success text-success-foreground font-semibold"
                  isPending={completing}
                  isDisabled={completing}
                  onPress={async () => {
                    setCompleting(true);
                    setCompleteError("");
                    try {
                      await onComplete();
                    } catch (e) {
                      setCompleteError(
                        e instanceof Error ? e.message : "Something went wrong."
                      );
                    } finally {
                      setCompleting(false);
                    }
                  }}
                >
                  Mark as Complete
                </Button>
                {completeError && (
                  <p className="text-[11px] text-danger">{completeError}</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-3">
          Quick Actions
        </p>
        <div className="flex flex-col gap-2">
          <Link href={`/swaps/${swap.id}?action=deliverables`}>
            <div className="w-full flex items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground hover:border-accent/30 transition-colors group cursor-pointer">
              <IconFileText size={15} className="text-muted shrink-0" />
              <span className="flex-1 font-medium">View Deliverables</span>
              <IconExternalLink
                size={13}
                className="text-muted group-hover:text-accent transition-colors"
              />
            </div>
          </Link>

          {isActive && (
            <button
              type="button"
              onClick={() => setDeliverOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground hover:border-accent/30 transition-colors group cursor-pointer"
            >
              <IconUpload size={15} className="text-muted shrink-0" />
              <span className="flex-1 font-medium text-left">Submit Deliverable</span>
            </button>
          )}

          {hasProof ? (
            <a
              href={cardanoExplorerUrl(swap.proof!.chainTxHash!, swap.proof!.network)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="w-full flex items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground hover:border-accent/30 transition-colors group cursor-pointer">
                <IconShieldCheck size={15} className="text-accent shrink-0" />
                <span className="flex-1 font-medium">View Proof (Cardano)</span>
                <IconExternalLink size={13} className="text-muted group-hover:text-accent transition-colors" />
              </div>
            </a>
          ) : (
            <Tooltip>
              <Tooltip.Trigger>
                <div
                  aria-disabled="true"
                  className="w-full flex items-center gap-3 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-muted opacity-50 cursor-not-allowed"
                >
                  <IconShieldCheck size={15} className="text-muted shrink-0" />
                  <span className="flex-1 font-medium">
                    View Proof (Cardano)
                  </span>
                  <IconExternalLink size={13} className="text-muted" />
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {isCompleted ? "Anchoring on-chain — check back shortly" : "Available after completion"}
              </Tooltip.Content>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Recent Files */}
      {recentFiles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-muted font-semibold">
              Recent Files
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {recentFiles.slice(0, 4).map((file) => (
              <a
                key={file.id}
                href={file.fileUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 bg-surface border border-border rounded-xl hover:border-accent/30 transition-colors group"
              >
                <div className="size-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                  {file.type === "IMAGE" ? (
                    <IconPhoto size={14} className="text-accent" />
                  ) : (
                    <IconFile size={14} className="text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {file.fileName ?? file.content}
                  </p>
                  <p className="text-[11px] text-muted">
                    {file.fileSize != null
                      ? `${formatFileSize(file.fileSize)} · `
                      : ""}
                    {formatShortDate(file.createdAt)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <AddDeliverableModal
        swapId={swap.id}
        isOpen={deliverOpen}
        onOpenChange={setDeliverOpen}
        onSuccess={onDeliverableAdded}
      />
    </div>
  );
}
