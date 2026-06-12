"use client";

import Logo from "@/components/elements/Logo";
import { Button } from "@heroui/react";
import {
  IconBell,
  IconCompass,
  IconLayoutDashboard,
  IconMessageCircle,
  IconSettings,
  IconSwitchHorizontal,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
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

export default function AppSidebar({ children }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar */}
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
              className="w-full font-semibold bg-success text-success-foreground hover:bg-success/90"
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
                      ? "bg-success/10 text-success font-medium"
                      : "text-muted hover:text-foreground hover:bg-surface"
                  }`}
                >
                  <Icon size={18} stroke={1.75} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 border-b border-border bg-background px-4 h-12 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-3 text-sm text-muted">
          <Link href="/users">Discover</Link>
          <Link href="/swaps">Swaps</Link>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:pt-0 pt-12 min-w-0">{children}</div>
    </div>
  );
}
