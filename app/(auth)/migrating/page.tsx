"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@heroui/react";
import Logo from "@/components/elements/Logo";
import { useNetworkContext } from "@/components/providers/NetworkProvider";
import { fadeUp, stagger } from "@/lib/animations";

type Phase = "migrating" | "success" | "error";

export default function MigratingPage() {
  const router = useRouter();
  const { label } = useNetworkContext();
  const [phase, setPhase] = useState<Phase>("migrating");
  const [dots, setDots] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);

  async function attemptMigration() {
    setPhase("migrating");
    cancelledRef.current = false;
    try {
      const res = await fetch("/api/auth/sync-profile", { method: "POST" });

      if (cancelledRef.current) return;

      if (res.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await res.json();
      if (cancelledRef.current) return;

      if (data.onboarded) {
        setPhase("success");
        // Small pause so the user sees the success state, then go to dashboard.
        await new Promise((r) => setTimeout(r, 900));
        if (!cancelledRef.current) router.replace("/dashboard");
      } else {
        // No skills on either network — new user, forward to onboarding silently.
        if (!cancelledRef.current) router.replace("/onboarding");
      }
    } catch {
      if (!cancelledRef.current) setPhase("error");
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    attemptMigration();
    return () => { cancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ellipsis = ".".repeat(dots);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center gap-8 text-center px-6 max-w-sm"
      >
        <motion.div variants={fadeUp}>
          <Logo />
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-col items-center gap-5">
          {phase === "migrating" && (
            <>
              <div className="relative w-12 h-12">
                <span className="absolute inset-0 rounded-full border-2 border-success/20" />
                <span className="absolute inset-0 rounded-full border-t-2 border-success animate-spin" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold tracking-tight">
                  Migrating to {label}
                  <span className="inline-block w-5 text-left">{ellipsis}</span>
                </h2>
                <p className="text-sm text-muted">
                  Checking for your profile on the previous network…
                </p>
              </div>
            </>
          )}

          {phase === "success" && (
            <>
              <div className="text-3xl">✓</div>
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-success">Profile migrated!</h2>
                <p className="text-sm text-muted">Taking you to your dashboard…</p>
              </div>
            </>
          )}

          {phase === "error" && (
            <>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-base font-semibold">Migration error</h2>
                <p className="text-sm text-muted leading-relaxed">
                  Something went wrong while migrating. You can retry or continue
                  without migrating.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                <Button
                  variant="primary"
                  size="sm"
                  onPress={attemptMigration}
                  className="w-full"
                >
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => router.replace("/onboarding")}
                  className="w-full"
                >
                  Continue without migrating
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
