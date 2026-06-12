"use client";

import { Button } from "@heroui/react";
import {
  IconFile,
  IconLink,
  IconPaperclip,
  IconPhoto,
  IconSend,
  IconX,
} from "@tabler/icons-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { MessageData } from "./MessageBubble";

type Props = {
  swapId: string;
  currentUser: { id: string; name: string; avatarUrl?: string | null };
  onSent: (message: MessageData) => void;
};

type AttachMode = null | "link";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export default function MessageComposer({
  swapId,
  currentUser,
  onSent,
}: Props) {
  const [text, setText] = useState("");
  const [attachMode, setAttachMode] = useState<AttachMode>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const imageRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  async function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function send(opts: {
    content: string;
    type: string;
    fileData?: string;
    fileName?: string;
    fileSize?: number;
  }) {
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/${swapId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send");
        return;
      }
      onSent(data as MessageData);
      setText("");
      setAttachMode(null);
      setLinkInput("");
    } catch {
      setError("Something went wrong");
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  async function handleSendText() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    await send({ content: trimmed, type: "TEXT" });
  }

  async function handleSendLink() {
    const trimmed = linkInput.trim();
    if (!trimmed || sending) return;
    await send({ content: trimmed, type: "LINK" });
  }

  async function handleFile(file: File, type: "IMAGE" | "DOCUMENT") {
    if (file.size > MAX_FILE_BYTES) {
      setError("File exceeds 5 MB limit");
      return;
    }
    setError("");
    setUploading(true);
    const fileData = await toBase64(file);
    await send({
      content: file.name,
      type,
      fileData,
      fileName: file.name,
      fileSize: file.size,
    });
  }

  return (
    <div className="border-t border-border bg-background shrink-0">
      {/* Error bar */}
      {error && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs text-danger bg-danger/5 border-b border-danger/10">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")}>
            <IconX size={12} />
          </button>
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="px-4 py-2 text-xs text-muted bg-surface border-b border-border animate-pulse">
          Uploading file…
        </div>
      )}

      {/* Inline link input */}
      {attachMode === "link" && (
        <div className="px-4 py-2 flex items-center gap-2 border-b border-border bg-surface">
          <IconLink size={14} className="text-muted shrink-0" />
          <input
            type="url"
            placeholder="Paste a URL…"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) handleSendLink();
              if (e.key === "Escape") {
                setAttachMode(null);
                setLinkInput("");
              }
            }}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            autoFocus
          />
          <button
            onClick={() => {
              setAttachMode(null);
              setLinkInput("");
            }}
            className="text-muted hover:text-foreground transition-colors"
          >
            <IconX size={14} />
          </button>
          <Button
            size="sm"
            className="bg-accent text-accent-foreground font-semibold shrink-0"
            onPress={handleSendLink}
            isPending={sending}
            isDisabled={!linkInput.trim() || sending}
          >
            Send
          </Button>
        </div>
      )}

      {/* Composer row */}
      <div className="px-4 py-3 flex items-end gap-2.5">
        {/* Attach button + menu */}
        <div className="relative">
          <button
            onClick={() => setAttachMenuOpen((v) => !v)}
            className={cn(
              "size-9 rounded-xl flex items-center justify-center transition-colors",
              attachMenuOpen
                ? "bg-surface text-foreground"
                : "text-muted hover:text-foreground hover:bg-surface"
            )}
            aria-label="Attach file"
          >
            <IconPaperclip size={18} />
          </button>

          {attachMenuOpen && (
            <div className="absolute bottom-12 left-0 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[160px] z-10">
              <button
                onClick={() => {
                  setAttachMode("link");
                  setAttachMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-surface transition-colors"
              >
                <IconLink size={14} className="text-muted" />
                Attach Link
              </button>
              <button
                onClick={() => {
                  setAttachMenuOpen(false);
                  imageRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-surface transition-colors"
              >
                <IconPhoto size={14} className="text-muted" />
                Attach Image
              </button>
              <button
                onClick={() => {
                  setAttachMenuOpen(false);
                  docRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-surface transition-colors"
              >
                <IconFile size={14} className="text-muted" />
                Attach Document
              </button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={imageRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "IMAGE");
              e.target.value = "";
            }}
          />
          <input
            ref={docRef}
            type="file"
            accept=".pdf,.docx,.pptx"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f, "DOCUMENT");
              e.target.value = "";
            }}
          />
        </div>

        {/* Text input */}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !sending) {
              e.preventDefault();
              handleSendText();
            }
          }}
          placeholder="Type a message…"
          className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent/50 transition-colors"
        />

        {/* Send button */}
        <Button
          onPress={handleSendText}
          isPending={sending}
          isDisabled={!text.trim() || sending}
          className="size-10 rounded-xl bg-accent text-accent-foreground p-0 shrink-0 flex items-center justify-center"
          aria-label="Send"
        >
          <IconSend size={16} />
        </Button>
      </div>
    </div>
  );
}
