"use client";

import Logo from "@/components/elements/Logo";
import ThemeToggle from "@/components/elements/ThemeToggle";
import { Avatar } from "@heroui/react";
import { useNetworkContext } from "@/components/providers/NetworkProvider";
import { NAV_ITEMS, isActivePath } from "@/components/layouts/nav";
import { IconLogout } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  user: { name: string; avatarUrl?: string | null };
  msgUnread: number;
  notifUnread: number;
  loggingOut: boolean;
  onLogout: () => void;
};

/** Desktop sidebar: logo, CTA, primary nav (with unread badge), and user/logout. */
export default function AppSidebar({
  user,
  msgUnread,
  notifUnread,
  loggingOut,
  onLogout,
}: Props) {
  const pathname = usePathname();
  const { isMainnet, label } = useNetworkContext();

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-background sticky top-0 h-dvh">
      <div className="flex flex-col gap-1 p-4 h-full">
        {/* Logo */}
        <div className="mb-4">
          <Logo />
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map(({ label: navLabel, icon: Icon, href }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={navLabel}
                href={href}
                className={`flex items-center gap-3 pl-3 pr-3 py-2.5 rounded-lg text-sm transition-all duration-150 border-l-[3px] ${
                  active
                    ? "border-accent bg-accent/10 text-accent font-semibold"
                    : "border-transparent text-muted hover:text-foreground hover:bg-surface-secondary"
                }`}
              >
                <Icon size={18} stroke={active ? 2 : 1.75} />
                <span className="flex-1">{navLabel}</span>
                {href === "/messages" && msgUnread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                    {msgUnread > 99 ? "99+" : msgUnread}
                  </span>
                )}
                {href === "/notifications" && notifUnread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-danger text-white text-[10px] font-bold">
                    {notifUnread > 99 ? "99+" : notifUnread}
                  </span>
                )}
              </Link>
            );
          })}

          {!isMainnet && (
            <span className="inline-flex items-center mx-2 px-2.5 py-1 rounded-md text-[11px] font-medium text-muted border border-border bg-background w-fit">
              {label}
            </span>
          )}
        </nav>

        {/* Bottom user */}
        <div className="pt-3 border-t border-border flex items-center gap-2">
          <Link
            href="/profile"
            aria-label="Profile"
            className="flex items-center gap-2 flex-1 min-w-0 rounded-lg p-1 -m-1 hover:bg-surface-secondary transition-colors"
          >
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
          </Link>

          <ThemeToggle />

          <button
            onClick={onLogout}
            disabled={loggingOut}
            aria-label="Log out"
            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-surface-secondary transition-colors disabled:opacity-50"
          >
            <IconLogout size={18} stroke={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}
