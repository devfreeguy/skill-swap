"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import ConversationItem, {
  type ConversationData,
} from "@/components/messaging/ConversationItem";
import ExchangeContextPanel, {
  type ExchangeSwap,
  type RecentFile,
} from "@/components/messaging/ExchangeContextPanel";
import MessageBubble, {
  type MessageData,
} from "@/components/messaging/MessageBubble";
import MessageComposer from "@/components/messaging/MessageComposer";
import SystemEvent from "@/components/messaging/SystemEvent";
import { cn, formatDaySeparator, isSameDay } from "@/lib/utils";
import { parseSkills } from "@/lib/skills";
import { Avatar, Drawer } from "@heroui/react";
import {
  IconArrowLeft,
  IconArrowsExchange,
  IconDotsVertical,
  IconMessageCircle,
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type SessionUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  teachSkill?: string | null;
  learnSkill?: string | null;
};

const SYSTEM_EVENT_TYPES = new Set([
  "SWAP_ACCEPTED",
  "SWAP_DECLINED",
  "SESSION_SCHEDULED",
  "DELIVERABLE_SUBMITTED",
  "PROOF_CREATED",
  "VERIFICATION_COMPLETED",
]);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const router = useRouter();

  const [me, setMe] = useState<SessionUser | null>(null);
  const [conversations, setConversations] = useState<ConversationData[]>([]);
  const [selectedSwapId, setSelectedSwapId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [swapData, setSwapData] = useState<ExchangeSwap | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);

  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [contextDrawerOpen, setContextDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/messages/conversations").then((r) => r.json()),
    ])
      .then(([meData, convData]) => {
        if (meData.error) {
          router.replace("/login");
          return;
        }
        setMe(meData);
        setConversations(Array.isArray(convData) ? convData : []);
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectConversation = useCallback(async (swapId: string) => {
    setSelectedSwapId(swapId);
    setMobileView("chat");
    setChatLoading(true);
    setMessages([]);
    setSwapData(null);
    setRecentFiles([]);

    const [chatRes, filesRes] = await Promise.all([
      fetch(`/api/messages/${swapId}`).then((r) => r.json()),
      fetch(`/api/messages/${swapId}/files`).then((r) => r.json()),
    ]);

    setSwapData(chatRes.swap ?? null);
    setMessages(Array.isArray(chatRes.messages) ? chatRes.messages : []);
    setRecentFiles(Array.isArray(filesRes) ? filesRes : []);
    setChatLoading(false);
  }, []);

  const handleMessageSent = useCallback((msg: MessageData) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  if (loading) {
    return <LemniscateLoader loading text="Loading…" overlayOpacity={1} />;
  }
  if (!me) return null;

  const filteredConversations = conversations.filter((c) =>
    c.other.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.swapId === selectedSwapId);

  // Skills line for header
  const headerMyTeach = swapData
    ? parseSkills(
        swapData.initiatorId === me.id
          ? swapData.initiator.teachSkill
          : swapData.receiver.teachSkill
      )[0]
    : null;
  const headerTheirTeach = swapData
    ? parseSkills(
        swapData.initiatorId === me.id
          ? swapData.receiver.teachSkill
          : swapData.initiator.teachSkill
      )[0]
    : null;
  const headerSkillsLine =
    headerMyTeach && headerTheirTeach
      ? `${headerMyTeach} ↔ ${headerTheirTeach}`
      : null;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Panel 1: Conversation List ──────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col w-full lg:w-72 shrink-0 border-r border-border bg-background",
          mobileView === "chat" ? "hidden lg:flex" : "flex"
        )}
      >
        {/* List header */}
        <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground mb-3">Messages</h2>
          <div className="relative">
            <IconSearch
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search conversations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted outline-none focus:border-accent/50 transition-colors"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 gap-3 text-center">
              <IconMessageCircle size={40} className="text-muted/30" />
              <p className="text-sm text-muted">
                {search ? "No conversations match." : "No messages yet."}
              </p>
              {!search && (
                <Link
                  href="/users"
                  className="text-xs text-accent hover:underline"
                >
                  Find someone to swap with →
                </Link>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ConversationItem
                key={conv.swapId}
                conversation={conv}
                isSelected={conv.swapId === selectedSwapId}
                onSelect={() => selectConversation(conv.swapId)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Panel 2: Active Conversation ────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0",
          mobileView === "list" ? "hidden lg:flex" : "flex"
        )}
      >
        {!selectedSwapId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
            <IconMessageCircle size={52} className="text-muted/20" />
            <p className="text-muted text-sm">
              Select a conversation to start messaging
            </p>
          </div>
        ) : chatLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted text-sm animate-pulse">Loading…</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
              {/* Back (mobile) */}
              <button
                onClick={() => setMobileView("list")}
                className="lg:hidden shrink-0 text-muted hover:text-foreground transition-colors"
                aria-label="Back to conversations"
              >
                <IconArrowLeft size={20} />
              </button>

              {selectedConv && (
                <>
                  {/* Avatar + info */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar size="sm">
                        {selectedConv.other.avatarUrl && (
                          <Avatar.Image
                            src={selectedConv.other.avatarUrl}
                            alt={selectedConv.other.name}
                          />
                        )}
                        <Avatar.Fallback className="text-xs font-semibold">
                          {selectedConv.other.name.slice(0, 2).toUpperCase()}
                        </Avatar.Fallback>
                      </Avatar>
                      {swapData?.status === "ACTIVE" && (
                        <span className="absolute bottom-0 right-0 size-2 rounded-full bg-accent border-2 border-background" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {selectedConv.other.name}
                      </p>
                      {headerSkillsLine && (
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <IconArrowsExchange
                            size={10}
                            className="shrink-0 text-accent/60"
                          />
                          <span className="truncate">{headerSkillsLine}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    <Link
                      href={`/swaps/${selectedSwapId}`}
                      className="hidden sm:block text-xs font-medium text-muted hover:text-foreground transition-colors px-3 py-1.5 border border-border rounded-lg hover:border-accent/30"
                    >
                      View Swap
                    </Link>
                    {/* Context drawer toggle (tablet + mobile) */}
                    <button
                      onClick={() => setContextDrawerOpen(true)}
                      className="lg:hidden p-2 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
                      aria-label="Exchange context"
                    >
                      <IconDotsVertical size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-muted">
                    No messages yet. Say hello!
                  </p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isOwn = msg.senderId === me.id;
                  const isSystemEvent = SYSTEM_EVENT_TYPES.has(msg.type);
                  const prevMsg = messages[i - 1];
                  const showDaySeparator =
                    !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);
                  const showAvatar =
                    !isOwn &&
                    (!prevMsg || prevMsg.senderId !== msg.senderId);

                  return (
                    <Fragment key={msg.id}>
                      {showDaySeparator && (
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted font-medium shrink-0">
                            {formatDaySeparator(msg.createdAt)}
                          </span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      )}

                      {isSystemEvent ? (
                        <SystemEvent
                          type={msg.type}
                          swapId={selectedSwapId!}
                        />
                      ) : (
                        <div
                          className={cn(
                            "flex",
                            isOwn ? "justify-end" : "justify-start"
                          )}
                        >
                          <MessageBubble
                            message={msg}
                            isOwn={isOwn}
                            showAvatar={showAvatar}
                          />
                        </div>
                      )}
                    </Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer — only for ACTIVE swaps */}
            {swapData?.status === "ACTIVE" ? (
              <MessageComposer
                swapId={selectedSwapId!}
                currentUser={me}
                onSent={handleMessageSent}
              />
            ) : swapData ? (
              <div className="px-4 py-3 border-t border-border bg-surface text-center text-xs text-muted">
                This swap is{" "}
                {swapData.status.toLowerCase()}. Messaging is only available on
                active swaps.
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ── Panel 3: Exchange Context (desktop only) ─────────────────────── */}
      {selectedSwapId && swapData && (
        <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border px-5 py-5 overflow-y-auto">
          <ExchangeContextPanel
            swap={swapData}
            currentUserId={me.id}
            recentFiles={recentFiles}
          />
        </aside>
      )}

      {/* ── Context Drawer (tablet + mobile) ─────────────────────────────── */}
      {selectedSwapId && swapData && (
        <Drawer.Backdrop
          isOpen={contextDrawerOpen}
          onOpenChange={setContextDrawerOpen}
          variant="blur"
        >
          <Drawer.Content placement="right">
            <Drawer.Dialog className="max-w-xs w-full">
              <Drawer.CloseTrigger />
              <Drawer.Header>
                <Drawer.Heading>Exchange Context</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body>
                <ExchangeContextPanel
                  swap={swapData}
                  currentUserId={me.id}
                  recentFiles={recentFiles}
                />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      )}
    </div>
  );
}
