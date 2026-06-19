"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Button, Chip, Popover } from "@heroui/react";
import Image from "next/image";
import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { useWalletAuth } from "@/hooks/useWalletAuth";
import {
  CARDANO_LIMIT_NETWORK,
  CARDANO_NETWORK_LABEL,
  IS_MAINNET,
} from "@/lib/cardano";
import LemniscateLoader from "@/components/layouts/Loader";

type WalletInfo = {
  name: string;
  id: string;
  icon?: string;
};

function getAvailableWallets(): WalletInfo[] {
  if (typeof window === "undefined") return [];
  const cardano = (window as any).cardano;
  if (!cardano) return [];
  const supported = [
    "nami",
    "eternl",
    "lace",
    "flint",
    "vespr",
    "begin",
    "typhon",
  ];
  return supported
    .filter((key) => cardano[key])
    .map((key) => ({
      id: key,
      name: cardano[key].name || key,
      icon: cardano[key].icon,
    }));
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

interface WalletConnectButtonProps {
  /**
   * Kept for call-site compatibility. The wallet flow now signs in if an
   * account exists and creates one otherwise, regardless of mode.
   */
  mode?: "login" | "register";
}

export default function WalletConnectButton(_props: WalletConnectButtonProps) {
  const { isConnected, disconnect } = useCardano({
    limitNetwork: CARDANO_LIMIT_NETWORK,
  });
  const {
    connectAndAuth,
    stakeAddress,
    enabledWallet,
    isLoading,
    loadingText,
    loadingHint,
    error,
  } = useWalletAuth();
  const [isOpen, setIsOpen] = useState(false);
  // Guards the auto-auth effect so it runs once per connection (not on every
  // re-render). Reset when the wallet disconnects so a reconnect retries.
  const autoTriggered = useRef(false);

  const wallets = getAvailableWallets();

  function handleWalletSelect(walletId: string) {
    setIsOpen(false);
    autoTriggered.current = true;
    connectAndAuth(walletId);
  }

  // As soon as a wallet is connected (freshly or already-connected on load),
  // automatically request the signature and sign in / sign up. No manual step.
  useEffect(() => {
    if (!isConnected) {
      autoTriggered.current = false;
      return;
    }
    if (autoTriggered.current || !enabledWallet) return;
    autoTriggered.current = true;
    connectAndAuth(enabledWallet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, enabledWallet]);

  const networkBadge = (
    <div className="flex items-center justify-center gap-2">
      <span className="text-xs text-muted">Network</span>
      <Chip size="sm" color={IS_MAINNET ? "success" : "warning"}>
        {CARDANO_NETWORK_LABEL}
      </Chip>
    </div>
  );

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
      />

      {isConnected && stakeAddress ? (
        <div className="flex flex-col gap-2 w-full">
          {networkBadge}
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1 px-4 py-2 rounded-full border border-border text-sm text-foreground bg-transparent truncate">
              {truncateAddress(stakeAddress)}
            </div>
            <Button
              variant="outline"
              className="rounded-full border-border text-foreground shrink-0"
              onPress={() => disconnect()}
              isDisabled={isLoading}
            >
              Disconnect
            </Button>
          </div>
          {errorAlert}
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
          {networkBadge}
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

                <div className="mt-3 flex flex-col gap-1">
                  {wallets.length === 0 ? (
                    <p className="text-sm text-muted py-2 text-center">
                      No Cardano wallets found.
                      <br />
                      Install Nami, Eternl, or Lace to continue.
                    </p>
                  ) : (
                    wallets.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => handleWalletSelect(w.id)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-accent/10 transition-colors text-left cursor-pointer"
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
                        <span className="text-sm font-medium text-foreground">
                          {w.name}
                        </span>
                      </button>
                    ))
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
