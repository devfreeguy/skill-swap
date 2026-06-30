"use client";

import LemniscateLoader from "@/components/layouts/Loader";
import NotificationList from "@/components/notifications/NotificationList";
import type { NotificationItem } from "@/components/notifications/NotificationCard";
import { Button, Tabs } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type TabKey = "all" | "unread" | "swaps" | "proofs" | "system";

// ─── Config ───────────────────────────────────────────────────────────────────

const SWAP_TYPES = new Set([
  "SWAP_REQUEST",
  "SWAP_ACCEPTED",
  "SWAP_DECLINED",
  "SWAP_COMPLETED",
]);

function getNavigationPath(n: NotificationItem): string {
  if (n.type === "PERFECT_MATCH") return "/users";
  if (n.swapId) return `/swaps/${n.swapId}`;
  return "/dashboard";
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

  const loadNotifications = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadNotifications();
    // Live: AppShell broadcasts a window event when a notification arrives.
    const onNotif = () => loadNotifications();
    window.addEventListener("rt:notification", onNotif);
    return () => window.removeEventListener("rt:notification", onNotif);
  }, [loadNotifications]);

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications/read", { method: "PATCH" }).catch(() => {});
    window.dispatchEvent(new Event("notifications:read"));
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
        })
          .then(() => window.dispatchEvent(new Event("notifications:read")))
          .catch(() => {});
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

