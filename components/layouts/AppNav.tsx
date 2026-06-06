"use client";

import Logo from "@/components/elements/Logo";
import { Avatar, Button } from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  user: { name: string; avatarUrl?: string | null };
};

export default function AppNav({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const linkClass = (href: string) =>
    `text-sm transition-colors ${
      pathname.startsWith(href)
        ? "text-foreground font-medium"
        : "text-muted hover:text-foreground"
    }`;

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/dashboard">
          <Logo />
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/dashboard" className={linkClass("/dashboard")}>
            Dashboard
          </Link>
          <Link href="/users" className={linkClass("/users")}>
            Discover
          </Link>
          <Link href="/swaps" className={linkClass("/swaps")}>
            Swaps
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Avatar size="sm">
            {user.avatarUrl && (
              <Avatar.Image src={user.avatarUrl} alt={user.name} />
            )}
            <Avatar.Fallback>{user.name.slice(0, 2).toUpperCase()}</Avatar.Fallback>
          </Avatar>
          <Button variant="secondary" size="sm" onPress={logout}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}
