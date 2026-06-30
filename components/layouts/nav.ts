import {
  IconBell,
  IconCompass,
  IconLayoutDashboard,
  IconMessageCircle,
  IconUser,
} from "@tabler/icons-react";

export type NavItem = {
  label: string;
  icon: typeof IconBell;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: IconLayoutDashboard, href: "/dashboard" },
  { label: "Discover", icon: IconCompass, href: "/users" },
  { label: "Messages", icon: IconMessageCircle, href: "/messages" },
  { label: "Notifications", icon: IconBell, href: "/notifications" },
  { label: "Profile", icon: IconUser, href: "/profile" },
];

// Mobile bottom navbar - icon-only. Notifications live in the header bell.
export const BOTTOM_NAV: NavItem[] = [
  { label: "Dashboard", icon: IconLayoutDashboard, href: "/dashboard" },
  { label: "Discover", icon: IconCompass, href: "/users" },
  { label: "Messages", icon: IconMessageCircle, href: "/messages" },
  { label: "Profile", icon: IconUser, href: "/profile" },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}
