"use client";

import Logo from "@/components/elements/Logo";
import { Avatar, Button } from "@heroui/react";
import {
  IconBell,
  IconCompass,
  IconLayoutDashboard,
  IconMessageCircle,
  IconSearch,
  IconSettings,
  IconSwitchHorizontal,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  user: { name: string; avatarUrl?: string | null };
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { label: "Dashboard", icon: IconLayoutDashboard, href: "/dashboard" },
  { label: "Discover", icon: IconCompass, href: "/users" },
  { label: "Swaps", icon: IconSwitchHorizontal, href: "/swaps" },
  { label: "Messages", icon: IconMessageCircle, href: "/messages" },
  { label: "Notifications", icon: IconBell, href: "/notifications" }, // TODO: notifications page
  { label: "Profile", icon: IconUser, href: "/profile" }, // TODO: profile page
  { label: "Settings", icon: IconSettings, href: "#" }, // TODO: settings page not built yet
];

function greeting(name: string): string {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name.split(" ")[0]}`;
}

export default function AppShell({ user, children }: Props) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUnreadCount(data.filter((n: { read: boolean }) => !n.read).length);
        }
      })
      .catch(() => {});
  }, []);

  const [salutation, firstName] = greeting(user.name).split(", ");

  return (
    <div className="flex min-h-dvh bg-background">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-background sticky top-0 h-dvh">
        <div className="flex flex-col gap-1 p-4 h-full">
          {/* Logo */}
          <div className="mb-4">
            <Logo />
            <p className="text-xs text-muted ml-2 -mt-1">Cardano Network</p>
          </div>

          {/* CTA */}
          <Link href="/users" className="mb-3">
            <Button
              className="w-full font-semibold "
              size="sm"
            >
              Start New Swap
            </Button>
          </Link>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 flex-1">
            {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
              const active =
                href !== "#" &&
                (href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href));
              return (
                <Link
                  key={label}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    active
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  }`}
                >
                  <Icon size={18} stroke={1.75} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom user */}
          <div className="pt-3 border-t border-border flex items-center gap-2">
            <Avatar size="sm">
              {user.avatarUrl && (
                <Avatar.Image src={user.avatarUrl} alt={user.name} />
              )}
              <Avatar.Fallback className="text-xs font-semibold">
                {user.name.slice(0, 2).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
            <span className="text-sm text-foreground font-medium truncate">
              {user.name.split(" ")[0]}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 border-b border-border bg-background px-4 h-12 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-3 text-sm text-muted">
          <Link href="/users">Discover</Link>
          <Link href="/swaps">Swaps</Link>
        </nav>
      </div>

      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:pt-0 pt-12 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center gap-4">
          <div className="flex-1 max-w-sm relative">
            <IconSearch
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search skills, members, tags..."
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-success/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <p className="text-sm text-muted hidden sm:block">
              {salutation},{" "}
              <span className="text-foreground font-medium">{firstName}</span>
            </p>

            <div className="relative">
              <button className="p-2 rounded-lg hover:bg-surface transition-colors text-muted hover:text-foreground">
                <IconBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-danger" />
                )}
              </button>
            </div>

            <Avatar size="sm">
              {user.avatarUrl && (
                <Avatar.Image src={user.avatarUrl} alt={user.name} />
              )}
              <Avatar.Fallback className="text-xs font-semibold">
                {user.name.slice(0, 2).toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
