"use client";

import { Avatar } from "@heroui/react";
import {
  IconExternalLink,
  IconFileText,
} from "@tabler/icons-react";
import { useState } from "react";
import { cn, formatMessageTime } from "@/lib/utils";

export type MessageData = {
  id: string;
  senderId: string;
  content: string;
  type: string;
  metadata?: string | null;
  ciphertext?: string | null;
  nonce?: string | null;
  senderPublicKey?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl?: string | null };
};

type Props = {
  message: MessageData;
  isOwn: boolean;
  showAvatar: boolean;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LinkBubble({
  content,
  isOwn,
}: {
  content: string;
  isOwn: boolean;
}) {
  let hostname = "";
  try {
    hostname = new URL(content).hostname;
  } catch {
    /* not a valid URL, show as-is */
  }
  return (
    <a
      href={content}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm max-w-[280px] border transition-colors",
        isOwn
          ? "bg-accent text-accent-foreground border-accent/20 hover:bg-accent/90"
          : "bg-surface text-foreground border-border hover:border-accent/30"
      )}
    >
      <IconExternalLink size={14} className="shrink-0 opacity-70" />
      <div className="min-w-0">
        <p className="truncate font-medium text-xs">
          {hostname || content}
        </p>
        <p className="truncate text-[11px] opacity-60">{content}</p>
      </div>
    </a>
  );
}

function ImageBubble({
  fileUrl,
  content,
}: {
  fileUrl: string;
  content: string;
}) {
  const [enlarged, setEnlarged] = useState(false);
  return (
    <>
      <button
        onClick={() => setEnlarged(true)}
        className="block max-w-[240px] rounded-xl overflow-hidden border border-border hover:border-accent/40 transition-colors cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={content}
          className="max-h-[200px] w-full object-cover"
        />
      </button>

      {enlarged && (
        <div
          className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center p-6 cursor-zoom-out"
          onClick={() => setEnlarged(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={content}
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
}

function DocumentBubble({
  fileUrl,
  fileName,
  fileSize,
  isOwn,
}: {
  fileUrl: string;
  fileName?: string | null;
  fileSize?: number | null;
  isOwn: boolean;
}) {
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[280px] border transition-colors",
        isOwn
          ? "bg-accent text-accent-foreground border-accent/20 hover:bg-accent/90"
          : "bg-surface text-foreground border-border hover:border-accent/30"
      )}
    >
      <div
        className={cn(
          "size-9 rounded-lg flex items-center justify-center shrink-0",
          isOwn
            ? "bg-accent-foreground/10"
            : "bg-background border border-border"
        )}
      >
        <IconFileText
          size={16}
          className={isOwn ? "text-accent-foreground/80" : "text-accent"}
        />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{fileName ?? "Document"}</p>
        {fileSize != null && (
          <p className="text-xs opacity-60">{formatFileSize(fileSize)}</p>
        )}
      </div>
    </a>
  );
}

export default function MessageBubble({ message, isOwn, showAvatar }: Props) {
  const time = formatMessageTime(message.createdAt);

  const renderContent = () => {
    switch (message.type) {
      case "LINK":
        return <LinkBubble content={message.content} isOwn={isOwn} />;
      case "IMAGE":
        return message.fileUrl ? (
          <ImageBubble fileUrl={message.fileUrl} content={message.content} />
        ) : null;
      case "DOCUMENT":
        return message.fileUrl ? (
          <DocumentBubble
            fileUrl={message.fileUrl}
            fileName={message.fileName}
            fileSize={message.fileSize}
            isOwn={isOwn}
          />
        ) : null;
      default:
        return (
          <div
            className={cn(
              "px-4 py-2.5 rounded-2xl text-sm max-w-[320px] leading-relaxed break-words",
              isOwn
                ? "bg-accent text-accent-foreground rounded-br-sm"
                : "bg-surface text-foreground rounded-bl-sm"
            )}
          >
            {message.content}
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-full",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar placeholder (incoming only, keeps alignment even when hidden) */}
      {!isOwn && (
        <div className="size-7 shrink-0 self-end mb-5">
          {showAvatar && (
            <Avatar size="sm" className="size-7">
              {message.sender.avatarUrl && (
                <Avatar.Image
                  src={message.sender.avatarUrl}
                  alt={message.sender.name}
                />
              )}
              <Avatar.Fallback className="text-[10px] font-semibold">
                {message.sender.name.slice(0, 2).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
          )}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-1",
          isOwn ? "items-end" : "items-start"
        )}
      >
        {renderContent()}
        <span className="text-[11px] text-muted px-1">{time}</span>
      </div>
    </div>
  );
}
