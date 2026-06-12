"use client";

import { ThemeProvider } from "next-themes";
import { Toast } from "@heroui/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Toast.Provider />
      {children}
    </ThemeProvider>
  );
}
