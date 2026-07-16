"use client";

import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useNetworkContext } from "@/components/providers/NetworkProvider";
import type { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";
import type { AccountType } from "@/lib/account-type";
import { WALLET_ALREADY_LINKED_TO_X_ERROR } from "@/lib/account-type";

/**
 * Turn a wallet/library error (CIP-30 APIError, WrongNetworkTypeError, plain
 * Error, or string) into a clear, actionable message for the user.
 */
function normalizeWalletError(err: unknown): string {
  const raw =
    typeof err === "string"
      ? err
      : ((err as { info?: string })?.info ??
        (err as { message?: string })?.message ??
        (typeof (err as { toString?: () => string })?.toString === "function"
          ? (err as { toString: () => string }).toString()
          : ""));
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
    return `Please switch your wallet to the required network, then try again.`;
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
  const { limitNetwork } = useNetworkContext();
  const {
    isConnected,
    stakeAddress,
    signMessage,
    connect: rawConnect,
    enabledWallet,
  } = useCardano({
    limitNetwork: limitNetwork as NetworkType,
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
    [],
  );

  /**
   * Wraps the library's connect() which returns BEFORE the wallet is actually
   * connected (the underlying Wallet.connect() is fire-and-forget). This wrapper
   * returns a promise that only resolves after the onConnect callback fires,
   * ensuring signMessage is called only when the wallet is truly ready.
   */
  function connect(walletName: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      rawConnect(
        walletName,
        () => {
          // onConnect — wallet is now connected and authorized
          resolve();
        },
        (error) => {
          // onError — connection failed or was rejected
          reject(error);
        },
      );
    });
  }

  function setPhase(text: string, hint = "") {
    setLoadingText(text);
    setLoadingHint(hint);
  }

  function stopLoading() {
    setIsLoading(false);
    setPhase("");
  }

  /**
   * Credentials produced by wallet signing: the signature, public key, nonce,
   * and stake address. Passed to `onSigned` so the caller can complete auth or
   * linking.
   */
  interface WalletCredentials {
    signature: string;
    key: string;
    nonce: string;
    stakeAddress: string | undefined;
  }

  /**
   * Core, auth-agnostic flow: connect a wallet, fetch a nonce, and prove
   * ownership by signing it. Calls `onSigned` with the credentials and leaves
   * all routing/state decisions to the caller — this is the reusable building
   * block shared by login, registration, and wallet linking.
   */
  async function connectWallet(
    walletName: string,
    onSigned: (creds: WalletCredentials) => Promise<void>,
  ): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);
      setPhase(
        "Connecting wallet…",
        "Approve the connection request in your wallet pop-up.",
      );

      await connect(walletName);

      setPhase(
        "Awaiting signature…",
        "Open your wallet and sign the message to continue. This is free and won't move any ADA.",
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
          "No response from your wallet. Make sure it's unlocked and on the right network, then try again.",
        );
        stopLoading();
      }, 45_000);

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
              stakeAddress:
                stakeAddressRef.current ?? stakeAddress ?? undefined,
            });
          } catch (e) {
            setError(extractError(e));
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
        },
      );
    } catch (err) {
      setError(normalizeWalletError(err));
      stopLoading();
    }
  }

  /**
   * Connect a wallet, prove ownership with a signed nonce, then sign in if an
   * account already exists for the wallet - otherwise create one. Only used for
   * authentication (login / register), never for linking to an existing session.
   */
  async function connectAndAuth(walletName: string) {
    await connectWallet(
      walletName,
      async ({ signature, key, nonce, stakeAddress }) => {
        // 1) Try to sign in with an existing account.
        const loginRes = await fetch("/api/auth/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: stakeAddress,
            signature,
            key,
            nonce,
          }),
        });
        const loginData = await loginRes.json();

        if (loginRes.ok) {
          router.push(
            loginData.teachSkill && loginData.learnSkill
              ? "/dashboard"
              : "/migrating",
          );
          return;
        }

        // 2) No account linked to this wallet → create one with the same
        //    signature + nonce (the login route returns 404 before it consumes
        //    the nonce, so it's still valid here).
        if (loginRes.status === 404) {
          setPhase(
            "Creating your account…",
            "Setting up your SkillSwap profile…",
          );
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
            router.push("/migrating");
            return;
          }
          setError(
            regData.error ?? "Couldn't create your account. Please try again.",
          );
          return;
        }

        // Other failures (e.g. 401 signature verification failed, 403 wrong
        // account type). Never redirect to /migrating from here.
        setError(loginData.error ?? "Wallet sign-in failed. Please try again.");
      },
    );
  }

  /**
   * Connect a wallet and link it to the *currently authenticated* account.
   * Used by the mandatory wallet gate and onboarding. Calls `onSuccess` once
   * the wallet is bound so the caller can refresh/close the gate.
   *
   * If the wallet is already linked to another profile (in particular an 'x'
   * account), the server returns 409 with the canonical message and we surface
   * it — no redirection, no state change.
   */
  async function connectAndLink(walletName: string, onSuccess?: () => void) {
    await connectWallet(
      walletName,
      async ({ signature, key, nonce, stakeAddress }) => {
        const res = await fetch("/api/users/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: stakeAddress,
            signature,
            key,
            nonce,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          onSuccess?.();
          return;
        }
        // Surface the server's message verbatim (includes the "already linked to
        // another profile" rule). Do NOT navigate anywhere.
        setError(data.error ?? "Couldn't link your wallet. Please try again.");
      },
    );
  }

  function cancel() {
    if (signTimeoutRef.current) clearTimeout(signTimeoutRef.current);
    setError(null);
    stopLoading();
  }

  return {
    connectWallet,
    connectAndAuth,
    connectAndLink,
    cancel,
    isConnected,
    stakeAddress,
    enabledWallet,
    isLoading,
    loadingText,
    loadingHint,
    error,
  };
}

/** Pull a readable error string out of a thrown fetch/JSON error. */
function extractError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  if (typeof e === "string" && e.length > 0) return e;
  return "Couldn't reach the server. Check your connection and try again.";
}

export type { AccountType };
export { WALLET_ALREADY_LINKED_TO_X_ERROR };
