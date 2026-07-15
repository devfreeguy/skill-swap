"use client";

import { ThemeProvider } from "next-themes";
import { Toast } from "@heroui/react";
import { NetworkProvider } from "@/components/providers/NetworkProvider";
import type { ActiveNetwork } from "@/lib/network";

export function Providers({
  children,
  initialNetwork,
}: {
  children: React.ReactNode;
  initialNetwork: ActiveNetwork;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Toast.Provider />
      <NetworkProvider initialNetwork={initialNetwork}>{children}</NetworkProvider>
    </ThemeProvider>
  );
}
