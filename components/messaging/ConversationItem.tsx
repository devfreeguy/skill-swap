"use client";

import { Avatar, Chip } from "@heroui/react";
import { IconArrowsExchange } from "@tabler/icons-react";
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
  const { other, lastMessage, matchType, updatedAt, myTeachSkill, status } =
    conversation;

  const myTeach = parseSkills(myTeachSkill)[0];
  const theirTeach = parseSkills(other.teachSkill)[0];
  const skillsLine =
    myTeach && theirTeach
      ? `${myTeach} ↔ ${theirTeach}`
      : myTeach || theirTeach || null;

  const preview = lastMessage
    ? (MSG_PREVIEW[lastMessage.type] ?? lastMessage.content)
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
          "bg-surface border-l-[3px] border-l-accent pl-[13px] hover:bg-surface"
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
          <span className="text-[11px] text-muted shrink-0">{timestamp}</span>
        </div>

        {matchType === "PERFECT_MATCH" && (
          <Chip
            size="sm"
            className="text-[10px] h-4 px-1.5 bg-accent/10 text-accent w-fit font-bold tracking-wide rounded-full"
          >
            PERFECT MATCH
          </Chip>
        )}

        {skillsLine && (
          <div className="flex items-center gap-1 text-xs text-muted mt-0.5">
            <IconArrowsExchange size={11} className="shrink-0 text-accent/60" />
            <span className="truncate">{skillsLine}</span>
          </div>
        )}

        {preview && (
          <p className="text-xs text-muted truncate leading-relaxed mt-0.5">
            {preview}
          </p>
        )}
      </div>

      {/* Unread badge placeholder */}
      <div className="shrink-0 mt-1">
        {/* Always 0 for now — build the slot */}
      </div>
    </button>
  );
}
