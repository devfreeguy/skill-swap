"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Returns whether the current resolved theme is dark.
 * Defaults to `true` before the component mounts (SSR-safe)
 * to prevent a flash of incorrectly themed content.
 */
export function useIsDarkMode(): boolean {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return !mounted || theme === "dark";
}
