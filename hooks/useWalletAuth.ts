"use client";

import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CARDANO_LIMIT_NETWORK, CARDANO_NETWORK_LABEL } from "@/lib/cardano";

/**
 * Turn a wallet/library error (CIP-30 APIError, WrongNetworkTypeError, plain
 * Error, or string) into a clear, actionable message for the user.
 */
function normalizeWalletError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : (err as { info?: string })?.info ??
        (err as { message?: string })?.message ??
        (typeof (err as { toString?: () => string })?.toString === "function"
          ? (err as { toString: () => string }).toString()
          : "");
  const msg = String(raw ?? "");
  const lower = msg.toLowerCase();
  const code = (err as { code?: number })?.code;
  const name = (err as { name?: string })?.name;

  // Wrong Cardano network (mainnet vs testnet mismatch)
  if (
    name === "WrongNetworkTypeError" ||
    lower.includes("wrongnetworktype") ||
    lower.includes("testnet") ||
    lower.includes("wrong network")
  ) {
    return `Please switch your wallet to ${CARDANO_NETWORK_LABEL}, then try again.`;
  }

  // Wallet is locked
  if (lower.includes("lock")) {
    return "Your wallet is locked. Unlock it in the wallet extension, then try again.";
  }

  // dApp not connected / no account authorized for this origin
  if (
    lower.includes("no account found") ||
    lower.includes("reconnect") ||
    lower.includes("not connected") ||
    lower.includes("not been granted") ||
    lower.includes("enable the dapp")
  ) {
    return "This wallet isn't connected to SkillSwap yet. Open your wallet, connect/authorize this site, then try again.";
  }

  // User declined the connection or signature request
  // (CIP-30: APIError.Refused = -3, DataSignError.UserDeclined = 3)
  if (
    code === -3 ||
    code === 3 ||
    lower.includes("declined") ||
    lower.includes("denied") ||
    lower.includes("rejected") ||
    lower.includes("cancel")
  ) {
    return "You declined the request in your wallet. Approve it to continue.";
  }

  // No wallet available
  if (lower.includes("not installed") || lower.includes("no wallet")) {
    return "No Cardano wallet detected. Install Nami, Eternl, or Lace and try again.";
  }

  // Fallback - surface the real message if we have one, otherwise generic.
  return msg
    ? `Wallet error: ${msg}`
    : "Something went wrong connecting your wallet. Please try again.";
}

export function useWalletAuth() {
  const { isConnected, stakeAddress, signMessage, connect, enabledWallet } =
    useCardano({
      limitNetwork: CARDANO_LIMIT_NETWORK,
    });
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [loadingHint, setLoadingHint] = useState("");
  const [error, setError] = useState<string | null>(null);

  // `stakeAddress` populates a render AFTER connect() resolves, so a flow that
  // started pre-connection closes over a stale `undefined`. Mirror it into a
  // ref and read that at sign time so a fresh connect uses the real address.
  const stakeAddressRef = useRef<string | undefined>(stakeAddress ?? undefined);
  useEffect(() => {
    stakeAddressRef.current = stakeAddress ?? undefined;
  }, [stakeAddress]);

  // Backstop sign timeout, held in a ref so it can be cleared if the component
  // unmounts mid-sign (avoids a setState on an unmounted component).
  const signTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (signTimeoutRef.current) clearTimeout(signTimeoutRef.current);
    },
    []
  );

  function setPhase(text: string, hint = "") {
    setLoadingText(text);
    setLoadingHint(hint);
  }

  function stopLoading() {
    setIsLoading(false);
    setPhase("");
  }

  /**
   * Shared flow: connect a wallet, fetch a nonce, and prove ownership by
   * signing it. On success calls `onSigned` with the credentials; the caller
   * decides what to do with them (sign in, register, or link to an account).
   */
  async function runSignedFlow(
    walletName: string,
    onSigned: (creds: {
      signature: string;
      key: string;
      nonce: string;
      stakeAddress: string | undefined;
    }) => Promise<void>
  ) {
    try {
      setIsLoading(true);
      setError(null);
      setPhase(
        "Connecting wallet…",
        "Approve the connection request in your wallet pop-up."
      );

      await connect(walletName);

      setPhase(
        "Awaiting signature…",
        "Open your wallet and sign the message to continue. This is free and won't move any ADA."
      );
      const nonceRes = await fetch("/api/auth/wallet/nonce");
      if (!nonceRes.ok) {
        setError("Couldn't start a secure session. Please try again.");
        stopLoading();
        return;
      }
      const { nonce } = await nonceRes.json();

      // The hook's signMessage is fire-and-forget (it does NOT await the wallet
      // signing), so resolve everything from its callbacks. A timeout backstops
      // the case where the wallet never responds (e.g. locked) so the loader
      // can't spin forever - but normal signing won't false-trigger it.
      let settled = false;
      signTimeoutRef.current = setTimeout(() => {
        if (settled) return;
        settled = true;
        setError(
          "Couldn't get a signature from your wallet. Make sure it's unlocked and connected to this site, then try again."
        );
        stopLoading();
      }, 90_000);

      signMessage(
        nonce,
        async (signature, key) => {
          if (settled) return;
          settled = true;
          if (signTimeoutRef.current) clearTimeout(signTimeoutRef.current);
          try {
            setPhase("Verifying…", "Confirming your wallet signature…");
            await onSigned({
              signature: signature ?? "",
              key: key ?? "",
              nonce,
              // Use the ref, not the closed-over value, so a fresh connect
              // resolves to the real stake address rather than a stale undefined.
              stakeAddress: stakeAddressRef.current ?? stakeAddress ?? undefined,
            });
          } catch {
            setError(
              "Couldn't reach the server. Check your connection and try again."
            );
          } finally {
            stopLoading();
          }
        },
        (err) => {
          if (settled) return;
          settled = true;
          if (signTimeoutRef.current) clearTimeout(signTimeoutRef.current);
          setError(normalizeWalletError(err));
          stopLoading();
        }
      );
    } catch (err) {
      setError(normalizeWalletError(err));
      stopLoading();
    }
  }

  /**
   * Connect a wallet, prove ownership with a signed nonce, then sign in if an
   * account already exists for the wallet - otherwise create one. Works the
   * same regardless of which page (login or register) triggered it.
   */
  async function connectAndAuth(walletName: string) {
    await runSignedFlow(
      walletName,
      async ({ signature, key, nonce, stakeAddress }) => {
        // 1) Try to sign in with an existing account.
        const loginRes = await fetch("/api/auth/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: stakeAddress, signature, key, nonce }),
        });
        const loginData = await loginRes.json();

        if (loginRes.ok) {
          router.push(
            loginData.teachSkill && loginData.learnSkill
              ? "/dashboard"
              : "/onboarding"
          );
          return;
        }

        // 2) No account linked to this wallet → create one with the same
        //    signature + nonce (the login route returns 404 before it consumes
        //    the nonce, so it's still valid here).
        if (loginRes.status === 404) {
          setPhase("Creating your account…", "Setting up your SkillSwap profile…");
          const defaultName = `Cardano User ${(stakeAddress ?? "").slice(-6)}`;
          const regRes = await fetch("/api/auth/register/wallet", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: defaultName,
              walletAddress: stakeAddress,
              signature,
              key,
              nonce,
            }),
          });
          const regData = await regRes.json();
          if (regRes.ok) {
            router.push("/onboarding");
            return;
          }
          setError(regData.error ?? "Couldn't create your account. Please try again.");
          return;
        }

        // Other failures (e.g. 401 signature verification failed)
        setError(loginData.error ?? "Wallet sign-in failed. Please try again.");
      }
    );
  }

  /**
   * Connect a wallet and link it to the *currently authenticated* account.
   * Used by the mandatory wallet gate and onboarding. Calls `onSuccess` once
   * the wallet is bound so the caller can refresh/close the gate.
   */
  async function connectAndLink(walletName: string, onSuccess?: () => void) {
    await runSignedFlow(
      walletName,
      async ({ signature, key, nonce, stakeAddress }) => {
        const res = await fetch("/api/users/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress: stakeAddress, signature, key, nonce }),
        });
        const data = await res.json();
        if (res.ok) {
          onSuccess?.();
          return;
        }
        setError(data.error ?? "Couldn't link your wallet. Please try again.");
      }
    );
  }

  return {
    connectAndAuth,
    connectAndLink,
    isConnected,
    stakeAddress,
    enabledWallet,
    isLoading,
    loadingText,
    loadingHint,
    error,
  };
}
