"use client";

import { useEffect, useState } from "react";

/**
 * Returns the smart destination for landing-page CTAs:
 * - `/dashboard` when a valid session exists
 * - `/login` otherwise (also the SSR-safe default)
 */
export function useAuthDest(): "/login" | "/dashboard" {
  const [dest, setDest] = useState<"/login" | "/dashboard">("/login");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setDest("/dashboard");
      })
      .catch(() => {});
  }, []);

  return dest;
}
