"use client";

import { Avatar, Chip } from "@heroui/react";
import { IconArrowsExchange, IconCircleCheck } from "@tabler/icons-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { parseSkills } from "@/lib/skills";

export type ConversationOther = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

export type LastMessage = {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  senderId: string;
} | null;

export type ConversationData = {
  swapId: string;
  status: string;
  other: ConversationOther;
  myTeachSkill: string | null;
  lastMessage: LastMessage;
  matchType: string;
  unread: boolean;
  updatedAt: string;
};

type Props = {
  conversation: ConversationData;
  isSelected: boolean;
  onSelect: () => void;
};

const MSG_PREVIEW: Record<string, string> = {
  SWAP_ACCEPTED: "✓ Swap accepted",
  SWAP_DECLINED: "Swap declined",
  DELIVERABLE_SUBMITTED: "↑ Deliverable submitted",
  PROOF_CREATED: "✓ Swap completed",
  VERIFICATION_COMPLETED: "✓ Verification complete",
  SESSION_SCHEDULED: "Session scheduled",
  LINK: "🔗 Link shared",
  IMAGE: "🖼 Image",
  DOCUMENT: "📄 Document",
};

export default function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}: Props) {
  const { other, lastMessage, updatedAt, myTeachSkill, status, unread } =
    conversation;
  const isCompleted = status === "COMPLETED";

  const myTeach = parseSkills(myTeachSkill)[0];
  const theirTeach = parseSkills(other.teachSkill)[0];

  const skillSwaps = (
    <Chip className="max-w-full">
      {myTeach && theirTeach ? (
        <span className="truncate flex items-center gap-2">
          {theirTeach}
          <IconArrowsExchange size={11} className="shrink-0 text-accent/60" />
          {myTeach}
        </span>
      ) : (
        <span className="truncate">{theirTeach || myTeach || null}</span>
      )}
    </Chip>
  );

  // Encrypted text messages have no server-readable content, so fall back to a
  // generic indicator rather than showing an empty preview.
  const preview = lastMessage
    ? (MSG_PREVIEW[lastMessage.type] ??
      (lastMessage.content || "🔒 New message"))
    : null;

  const timestamp = lastMessage
    ? formatRelativeTime(lastMessage.createdAt)
    : formatRelativeTime(updatedAt);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-4 py-3.5 flex items-start gap-3 border-b border-border transition-colors hover:bg-surface/60",
        isSelected &&
          "bg-surface border-l-[3px] border-l-accent pl-[13px] hover:bg-surface",
        !isSelected && unread && "border-l-2 border-l-accent pl-[14px]",
        isCompleted && "opacity-60",
      )}
    >
      {/* Avatar with active indicator */}
      <div className="relative shrink-0 mt-0.5">
        <Avatar size="md">
          {other.avatarUrl && (
            <Avatar.Image src={other.avatarUrl} alt={other.name} />
          )}
          <Avatar.Fallback className="text-sm font-semibold">
            {other.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
        {status === "ACTIVE" && (
          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-accent border-2 border-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground truncate">
            {other.name}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted shrink-0">
            {isCompleted && (
              <IconCircleCheck size={12} className="text-success" />
            )}
            {timestamp}
          </span>
        </div>

        {/* {matchType === "PERFECT_MATCH" && (
          <Chip
            size="sm"
            className="text-[10px] h-4 px-1.5 bg-accent/10 text-accent w-fit font-bold tracking-wide rounded-full"
          >
            PERFECT MATCH
          </Chip>
        )} */}

        {preview && (
          <p
            className={cn(
              "text-xs truncate leading-relaxed mt-0.5",
              unread ? "text-foreground font-medium" : "text-muted",
            )}
          >
            {preview}
          </p>
        )}

        {skillSwaps}
      </div>
    </button>
  );
}
