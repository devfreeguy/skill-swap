"use client";

import Logo from "@/components/elements/Logo";
import AppSidebar from "@/components/layouts/AppSidebar";
import { BOTTOM_NAV, isActivePath } from "@/components/layouts/nav";
import { AlertDialog, Avatar, Button, Dropdown, Label, toast } from "@heroui/react";
import { subscribe, userChannel } from "@/lib/realtime";
import { IconBell, IconLogout, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type ShellUser = { id: string; name: string; avatarUrl?: string | null };

type Props = {
  user: ShellUser;
  children: React.ReactNode;
};

/** Header avatar → dropdown with Profile + Logout. Logout opens a confirmation. */
function AccountMenu({
  user,
  onLogout,
}: {
  user: ShellUser;
  onLogout: () => void;
}) {
  const router = useRouter();
  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="Account menu"
        className="rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar size="sm">
          {user.avatarUrl && <Avatar.Image src={user.avatarUrl} alt={user.name} />}
          <Avatar.Fallback className="text-xs font-semibold">
            {user.name.slice(0, 2).toUpperCase()}
          </Avatar.Fallback>
        </Avatar>
      </Dropdown.Trigger>
      <Dropdown.Popover className="min-w-40">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "profile") router.push("/profile");
            else if (key === "logout") onLogout();
          }}
        >
          <Dropdown.Item id="profile" textValue="Profile">
            <IconUser className="size-4 shrink-0 text-muted" />
            <Label>Profile</Label>
          </Dropdown.Item>
          <Dropdown.Item id="logout" textValue="Logout" variant="danger">
            <IconLogout className="size-4 shrink-0 text-danger" />
            <Label>Log out</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const salutation =
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name.split(" ")[0]}`;
}

export default function AppShell({ user, children }: Props) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Read in callbacks without making them effect deps.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Real-time notification + message badges and toasts via the user's private
  // channel (Pusher, falling back to Ably). No polling.
  useEffect(() => {
    let cancelled = false;

    async function refreshMsg() {
      try {
        const res = await fetch("/api/messages/unread-count");
        const data = await res.json();
        if (!cancelled && typeof data?.count === "number") {
          setMsgUnread(data.count);
        }
      } catch {
        /* ignore */
      }
    }

    async function refreshNotif() {
      try {
        const res = await fetch("/api/notifications");
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setUnreadCount(data.filter((n: { read: boolean }) => !n.read).length);
        }
      } catch {
        /* ignore */
      }
    }

    refreshMsg();
    refreshNotif();

    const channel = userChannel(user.id);

    const offNotif = subscribe(channel, "notification:new", (payload) => {
      refreshNotif();
      const p = payload as { message?: string };
      if (p?.message) toast(p.message);
      window.dispatchEvent(new Event("rt:notification"));
    });

    const offMsg = subscribe(channel, "message:notify", (payload) => {
      refreshMsg();
      const p = payload as { senderName?: string };
      if (!pathnameRef.current.startsWith("/messages")) {
        toast(`New message from ${p?.senderName ?? "someone"}`);
      }
    });

    const onMsgRead = () => refreshMsg();
    const onNotifRead = () => refreshNotif();
    window.addEventListener("messages:read", onMsgRead);
    window.addEventListener("notifications:read", onNotifRead);

    return () => {
      cancelled = true;
      offNotif();
      offMsg();
      window.removeEventListener("messages:read", onMsgRead);
      window.removeEventListener("notifications:read", onNotifRead);
    };
  }, [user.id]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Even if the request fails, send the user to login; the cookie is
      // HttpOnly so we rely on the server clearing it.
    }
    window.location.href = "/login";
  }

  const [salutation, firstName] = greeting(user.name).split(", ");

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/*  Sidebar  */}
      <AppSidebar
        user={user}
        msgUnread={msgUnread}
        loggingOut={loggingOut}
        onLogout={() => setLogoutOpen(true)}
      />

      {/*  Mobile top header  */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-20 border-b border-border bg-background px-4 h-16 flex items-center justify-between">
        <Logo className="[&_h1]:hidden" />
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            className="relative block p-2 rounded-lg hover:bg-surface transition-colors text-muted hover:text-foreground"
          >
            <IconBell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-danger" />
            )}
          </Link>
          <AccountMenu user={user} onLogout={() => setLogoutOpen(true)} />
        </div>
      </header>

      {/*  Main column  */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden md:pt-0 pt-16 md:pb-0 pb-16">
        {/* Header (desktop only) */}
        <header className="hidden md:flex sticky top-0 z-10 bg-background border-b border-border px-6 py-3 items-center gap-4">
          <div className="flex items-center gap-3 ml-auto">
            <p className="text-sm text-muted hidden sm:block">
              {salutation},{" "}
              <span className="text-foreground font-medium">{firstName}</span>
            </p>

            <div className="relative">
              <Link
                href="/notifications"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                className="block p-2 rounded-lg hover:bg-surface transition-colors text-muted hover:text-foreground"
              >
                <IconBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-danger" />
                )}
              </Link>
            </div>

            <AccountMenu user={user} onLogout={() => setLogoutOpen(true)} />
          </div>
        </header>

        {/* Scroll region: normal pages scroll here; the chat page fills it
            exactly and manages its own internal scrolling. */}
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          {children}
        </div>
      </div>

      {/*  Mobile bottom navigation (icon-only)  */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background h-16 flex items-center justify-around px-2">
        {BOTTOM_NAV.map(({ label, icon: Icon, href }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`relative flex items-center justify-center size-11 rounded-xl transition-colors ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={22} stroke={1.75} />
              {href === "/messages" && msgUnread > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold">
                  {msgUnread > 9 ? "9+" : msgUnread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout confirmation — shared by the header menu and the sidebar */}
      <AlertDialog.Backdrop isOpen={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="warning" />
              <AlertDialog.Heading>Log out?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                You&apos;ll be signed out and need to reconnect your wallet to
                sign back in.
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary">
                Cancel
              </Button>
              <Button
                variant="danger"
                onPress={handleLogout}
                isPending={loggingOut}
                isDisabled={loggingOut}
              >
                Log out
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
}
