"use client";

import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useWalletAuth() {
  const { isConnected, stakeAddress, signMessage, connect } = useCardano({
    limitNetwork: NetworkType.MAINNET,
  });
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function connectAndAuth(walletName: string) {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingText("Connecting wallet…");

      await connect(walletName);

      setLoadingText("Awaiting signature…");
      const nonceRes = await fetch("/api/users/nonce");
      const { nonce } = await nonceRes.json();

      await signMessage(
        nonce,
        async (signature) => {
          setLoadingText("Signing in…");
          const res = await fetch("/api/auth/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: stakeAddress,
              signature,
              nonce,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            setError(data.message ?? "Wallet auth failed");
            return;
          }

          router.push(data.teachSkill && data.learnSkill ? "/dashboard" : "/onboarding");
        },
        (err) => {
          setError("Signing failed. Please try again.");
          console.error(err);
        }
      );
    } catch (err) {
      setError("Failed to connect wallet.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  }

  async function registerWithWallet(
    walletName: string,
    name: string,
    email: string
  ) {
    try {
      setIsLoading(true);
      setError(null);
      setLoadingText("Connecting wallet…");

      await connect(walletName);

      setLoadingText("Awaiting signature…");
      const nonceRes = await fetch("/api/auth/wallet/nonce");
      if (!nonceRes.ok) {
        setError("Failed to get nonce. Please try again.");
        return;
      }
      const { nonce } = await nonceRes.json();

      await signMessage(
        nonce,
        async (signature) => {
          setLoadingText("Creating account…");
          const res = await fetch("/api/auth/register/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              walletAddress: stakeAddress,
              signature,
              nonce,
              email: email || undefined,
            }),
          });

          if (!res.ok) {
            const data = await res.json();
            setError(data.error ?? "Registration failed");
            return;
          }

          router.push("/onboarding");
        },
        (err) => {
          setError("Signing failed. Please try again.");
          console.error(err);
        }
      );
    } catch (err) {
      setError("Failed to connect wallet.");
      console.error(err);
    } finally {
      setIsLoading(false);
      setLoadingText("");
    }
  }

  return {
    connectAndAuth,
    registerWithWallet,
    isConnected,
    stakeAddress,
    isLoading,
    loadingText,
    error,
  };
}
