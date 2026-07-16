"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Chip, Popover } from "@heroui/react";
import Image from "next/image";
import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import { useNetworkContext } from "@/components/providers/NetworkProvider";
import LemniscateLoader from "@/components/layouts/Loader";
import { truncateAddress } from "@/lib/utils";
import type { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";

type WalletInfo = {
  name: string;
  id: string;
  icon?: string;
};

// 0 = testnet (preprod/preview), 1 = mainnet, null = unknown (not yet authorized)
type NetworkId = 0 | 1 | null;

function getAvailableWallets(): WalletInfo[] {
  if (typeof window === "undefined") return [];
  const cardano = (window as unknown as { cardano?: Record<string, { name?: string; icon?: string }> }).cardano;
  if (!cardano) return [];
  return ["nami", "eternl", "lace", "flint", "vespr", "begin", "typhon"]
    .filter((key) => cardano[key])
    .map((key) => ({ id: key, name: cardano[key].name || key, icon: cardano[key].icon }));
}

/**
 * Silently probe a wallet's network using CIP-30.
 * Only calls enable() if isEnabled() returns true — never triggers an auth popup.
 * Returns null if the wallet isn't yet authorized or if the check fails.
 */
async function probeWalletNetwork(walletId: string): Promise<NetworkId> {
  try {
    const cardano = (window as unknown as { cardano?: Record<string, { isEnabled: () => Promise<boolean>; enable: () => Promise<{ getNetworkId: () => Promise<number> }> }> }).cardano;
    if (!cardano?.[walletId]) return null;
    const already = await cardano[walletId].isEnabled();
    if (!already) return null;
    const api = await cardano[walletId].enable();
    const id = await api.getNetworkId();
    return (id === 0 || id === 1) ? id : null;
  } catch {
    return null;
  }
}

interface WalletConnectButtonProps {
  mode?: "login" | "register" | "link";
  onLinked?: () => void;
}

export default function WalletConnectButton({
  mode = "login",
  onLinked,
}: WalletConnectButtonProps) {
  const { isMainnet, label, limitNetwork } = useNetworkContext();
  const expectedNetworkId: NetworkId = isMainnet ? 1 : 0;

  const { isConnected, disconnect } = useCardano({
    limitNetwork: limitNetwork as NetworkType,
  });
  const {
    connectAndAuth,
    connectAndLink,
    cancel,
    stakeAddress,
    enabledWallet,
    isLoading,
    loadingText,
    loadingHint,
    error,
  } = useWalletAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [walletNetworks, setWalletNetworks] = useState<Record<string, NetworkId>>({});
  const autoTriggered = useRef(false);
  // Set when the user explicitly clicks "Disconnect" — prevents the auto-trigger
  // from re-firing if the wallet extension reconnects on its own.
  const userDisconnected = useRef(false);

  const wallets = getAvailableWallets();

  function runWalletFlow(walletId: string) {
    if (mode === "link") {
      connectAndLink(walletId, onLinked);
    } else {
      connectAndAuth(walletId);
    }
  }

  function handleWalletSelect(walletId: string) {
    setIsOpen(false);
    autoTriggered.current = true;
    userDisconnected.current = false;
    runWalletFlow(walletId);
  }

  // Auto-sign when wallet is already connected on page load.
  useEffect(() => {
    if (!isConnected) {
      autoTriggered.current = false;
      return;
    }
    // Don't auto-trigger if the user explicitly clicked Disconnect.
    if (userDisconnected.current) return;
    if (autoTriggered.current || !enabledWallet) return;
    autoTriggered.current = true;
    runWalletFlow(enabledWallet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, enabledWallet]);

  // When the picker opens, silently probe each wallet's network via CIP-30.
  // Only runs if the wallet is already enabled (no popup triggered).
  useEffect(() => {
    if (!isOpen || wallets.length === 0) return;
    let cancelled = false;
    Promise.all(
      wallets.map(async (w) => {
        const netId = await probeWalletNetwork(w.id);
        return [w.id, netId] as [string, NetworkId];
      })
    ).then((results) => {
      if (cancelled) return;
      setWalletNetworks(Object.fromEntries(results));
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const errorAlert = error ? (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{error}</Alert.Description>
      </Alert.Content>
    </Alert>
  ) : null;

  return (
    <>
      <LemniscateLoader
        loading={isLoading}
        text={loadingText}
        hint={loadingHint}
        overlayOpacity={0.92}
        onCancel={cancel}
      />

      {isConnected && stakeAddress ? (
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-muted">Network</span>
            <Chip size="sm" color={isMainnet ? "success" : "warning"}>
              {label}
            </Chip>
          </div>
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 px-4 py-2 rounded-full border border-border text-sm text-foreground bg-transparent truncate">
              {truncateAddress(stakeAddress)}
            </div>
            <Button
              variant="outline"
              className="rounded-full border-border text-foreground shrink-0"
              onPress={() => {
                userDisconnected.current = true;
                autoTriggered.current = false;
                disconnect();
              }}
              isDisabled={isLoading}
            >
              Disconnect
            </Button>
          </div>
          {errorAlert}
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {/* App's required network — shown before the picker so the user knows what to set up */}
          <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">Required network</p>
              <p className="text-xs text-muted mt-0.5">
                Your wallet must be on <span className="font-semibold text-foreground">{label}</span> before connecting.
              </p>
            </div>
            <Chip size="sm" color={isMainnet ? "success" : "warning"}>
              {label}
            </Chip>
          </div>

          <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger>
              <Button
                variant="outline"
                fullWidth
                className="rounded-full border-border text-foreground"
                isPending={isLoading}
                isDisabled={isLoading}
              >
                <Image
                  src="/icons/cardano-ada-logo.svg"
                  alt="Cardano"
                  width={16}
                  height={16}
                />
                {isLoading ? "Connecting…" : "Continue with Cardano Wallet"}
              </Button>
            </Popover.Trigger>

            <Popover.Content className="w-80 border border-accent/30 p-2 md:p-3">
              <Popover.Dialog>
                <Popover.Heading>Select a wallet</Popover.Heading>
                <p className="mt-1 text-xs text-muted">
                  Step 1: connect &nbsp;→&nbsp; Step 2: sign a free verification message
                </p>

                <div className="mt-3 flex flex-col gap-1">
                  {wallets.length === 0 ? (
                    <p className="text-sm text-muted py-2 text-center">
                      No Cardano wallets found.
                      <br />
                      Install Nami, Eternl, or Lace to continue.
                    </p>
                  ) : (
                    wallets.map((w) => {
                      const netId = walletNetworks[w.id] ?? null;
                      const netKnown = netId !== null && netId !== undefined;
                      const wrongNetwork = netKnown && netId !== expectedNetworkId;
                      const netLabel = netId === 1 ? "Mainnet" : netId === 0 ? (isMainnet ? "Testnet" : "Preprod") : null;

                      return (
                        <div key={w.id}>
                          <button
                            type="button"
                            onClick={() => !wrongNetwork && handleWalletSelect(w.id)}
                            disabled={wrongNetwork}
                            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors text-left ${
                              wrongNetwork
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-accent/10 cursor-pointer"
                            }`}
                          >
                            {w.icon && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={w.icon}
                                alt={w.name}
                                width={24}
                                height={24}
                                className="rounded-md shrink-0"
                              />
                            )}
                            <span className="text-sm font-medium text-foreground flex-1">
                              {w.name}
                            </span>
                            {netLabel && (
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                  wrongNetwork
                                    ? "bg-danger/10 text-danger border-danger/20"
                                    : "bg-success/10 text-success border-success/20"
                                }`}
                              >
                                {netLabel}
                              </span>
                            )}
                          </button>
                          {wrongNetwork && (
                            <p className="text-[11px] text-danger px-3 pb-1.5 -mt-0.5">
                              Switch to {label} in your wallet settings first.
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>

          {errorAlert}
        </div>
      )}
    </>
  );
}
