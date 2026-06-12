"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import { formatRelativeTime } from "@/lib/utils";
import { Button, Tabs } from "@heroui/react";
import {
  IconArrowsExchange,
  IconBellOff,
  IconCircleCheck,
  IconCircleX,
  IconShield,
  IconStars,
  IconTrophy,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationItem = {
  id: string;
  userId: string;
  swapId: string | null;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

type TabKey = "all" | "unread" | "swaps" | "proofs" | "system";

// ─── Config ───────────────────────────────────────────────────────────────────

const SWAP_TYPES = new Set([
  "SWAP_REQUEST",
  "SWAP_ACCEPTED",
  "SWAP_DECLINED",
  "SWAP_COMPLETED",
]);

type NotifConfig = {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  iconClass: string;
};

const NOTIFICATION_CONFIG: Record<string, NotifConfig> = {
  SWAP_REQUEST: {
    icon: IconArrowsExchange,
    title: "New Swap Request",
    iconClass: "text-accent",
  },
  SWAP_ACCEPTED: {
    icon: IconCircleCheck,
    title: "Swap Accepted",
    iconClass: "text-success",
  },
  SWAP_DECLINED: {
    icon: IconCircleX,
    title: "Swap Declined",
    iconClass: "text-danger",
  },
  SWAP_COMPLETED: {
    icon: IconTrophy,
    title: "Swap Completed",
    iconClass: "text-success",
  },
  PERFECT_MATCH: {
    icon: IconStars,
    title: "Perfect Match Found",
    iconClass: "text-warning",
  },
  PROOF_CREATED: {
    icon: IconShield,
    title: "Proof Created",
    iconClass: "text-accent",
  },
};

function getNavigationPath(n: NotificationItem): string {
  if (n.type === "PERFECT_MATCH") return "/users";
  if (n.swapId) return `/swaps/${n.swapId}`;
  return "/swaps";
}

function filterByTab(
  items: NotificationItem[],
  tab: TabKey
): NotificationItem[] {
  switch (tab) {
    case "unread":
      return items.filter((n) => !n.read);
    case "swaps":
      return items.filter((n) => SWAP_TYPES.has(n.type));
    case "proofs":
      return items.filter((n) => n.type === "PROOF_CREATED");
    case "system":
      return items.filter((n) => n.type === "PERFECT_MATCH");
    default:
      return items;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<TabKey>("all");
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications/read", { method: "PATCH" }).catch(() => {});
    setMarkingAll(false);
  }, []);

  const handleClick = useCallback(
    async (notification: NotificationItem) => {
      if (!notification.read) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, read: true } : n
          )
        );
        fetch(`/api/notifications/${notification.id}`, {
          method: "PATCH",
        }).catch(() => {});
      }
      router.push(getNavigationPath(notification));
    },
    [router]
  );

  if (loading) {
    return <LemniscateLoader loading text="Loading…" overlayOpacity={1} />;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Notifications
            </h1>
            <p className="text-sm text-muted mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "You're all caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              isPending={markingAll}
              onPress={handleMarkAllRead}
              className="shrink-0"
            >
              Mark All As Read
            </Button>
          )}
        </div>

        {/* Tabs + content */}
        <Tabs
          variant="secondary"
          selectedKey={selectedTab}
          onSelectionChange={(key) => setSelectedTab(key as TabKey)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Notification filters">
              <Tabs.Tab id="all">
                All
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="unread">
                Unread
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="swaps">
                Swaps
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="proofs">
                Proofs
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="system">
                System
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>

          <Tabs.Panel id="all" className="pt-4">
            <NotificationList
              items={filterByTab(notifications, "all")}
              onItemClick={handleClick}
            />
          </Tabs.Panel>
          <Tabs.Panel id="unread" className="pt-4">
            <NotificationList
              items={filterByTab(notifications, "unread")}
              onItemClick={handleClick}
            />
          </Tabs.Panel>
          <Tabs.Panel id="swaps" className="pt-4">
            <NotificationList
              items={filterByTab(notifications, "swaps")}
              onItemClick={handleClick}
            />
          </Tabs.Panel>
          <Tabs.Panel id="proofs" className="pt-4">
            <NotificationList
              items={filterByTab(notifications, "proofs")}
              onItemClick={handleClick}
            />
          </Tabs.Panel>
          <Tabs.Panel id="system" className="pt-4">
            <NotificationList
              items={filterByTab(notifications, "system")}
              onItemClick={handleClick}
            />
          </Tabs.Panel>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NotificationList({
  items,
  onItemClick,
}: {
  items: NotificationItem[];
  onItemClick: (n: NotificationItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <IconBellOff size={40} className="text-muted/30" />
        <p className="text-sm font-medium text-foreground">
          You&apos;re all caught up
        </p>
        <p className="text-xs text-muted">No new notifications right now.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
      {items.map((n) => (
        <NotificationCard key={n.id} notification={n} onClick={onItemClick} />
      ))}
    </div>
  );
}

function NotificationCard({
  notification,
  onClick,
}: {
  notification: NotificationItem;
  onClick: (n: NotificationItem) => void;
}) {
  const config: NotifConfig = NOTIFICATION_CONFIG[notification.type] ?? {
    icon: IconArrowsExchange,
    title: notification.type,
    iconClass: "text-muted",
  };
  const Icon = config.icon;

  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full flex items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-surface ${
        !notification.read ? "bg-accent/5" : "bg-background"
      }`}
    >
      <div className={`mt-0.5 shrink-0 ${config.iconClass}`}>
        <Icon size={20} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{config.title}</p>
        <p className="text-sm text-muted mt-0.5 leading-snug">
          {notification.message}
        </p>
        <p className="text-xs text-muted/60 mt-1.5">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>

      {!notification.read && (
        <div className="mt-1.5 shrink-0">
          <span className="block size-2 rounded-full bg-accent" />
        </div>
      )}
    </button>
  );
}
