"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Alert, Button, Card } from "@heroui/react";
import { IconBrandX } from "@tabler/icons-react";
import Logo from "@/components/elements/Logo";
import { fadeUp, stagger } from "@/lib/animations";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

const WalletConnectButton = dynamic(
  () => import("@/components/elements/WalletConnectButton"),
  { ssr: false }
);

const ERROR_MESSAGES: Record<string, string> = {
  twitter_not_configured: "X sign-in isn't available right now. Try a wallet.",
  twitter_denied: "You cancelled the X authorization. Please try again.",
  twitter_invalid: "Something went wrong with X sign-in. Please try again.",
  twitter_state: "Your sign-in session expired. Please try again.",
  twitter_failed: "Couldn't sign you in with X. Please try again.",
};

export default function LoginPanel({ error }: { error?: string }) {
  const router = useRouter();
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => { if (!data.error) router.replace("/dashboard"); })
      .catch(() => {});
  }, [router]);

  function startTwitter() {
    window.location.href = "/api/auth/twitter";
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-background px-4 py-16">
      <motion.div
        className="w-full max-w-sm"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <Card className="shadow-md bg-surface border border-border rounded-2xl p-8 flex flex-col gap-6 overflow-visible">
            <div className="flex justify-center">
              <Logo />
            </div>

            <div className="flex flex-col gap-2 text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Welcome to SkillSwap
              </h1>
              <p className="text-sm text-muted">
                Connect your account to get started
              </p>
            </div>

            {errorMessage && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{errorMessage}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}

            <div className="flex flex-col gap-3">
              <Button
                onPress={startTwitter}
                className="w-full rounded-full bg-accent text-accent-foreground font-semibold"
              >
                <IconBrandX size={18} />
                Connect X Account
              </Button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <WalletConnectButton />
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </main>
  );
}
