"use client";

import dynamic from "next/dynamic";
import { Modal } from "@heroui/react";
import { IconWallet } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNetworkContext } from "@/components/providers/NetworkProvider";

const WalletConnectButton = dynamic(
  () => import("@/components/elements/WalletConnectButton"),
  { ssr: false }
);

/**
 * App-wide gate: a connected wallet is mandatory (it signs the on-chain proof
 * and derives the messaging keys). Any authenticated account without a
 * `walletAddress` - e.g. pre-existing X/email users - gets a non-dismissible
 * modal until they link one. Renders nothing once a wallet is present.
 */
export default function WalletGate() {
  const { isMainnet, label } = useNetworkContext();
  const [needsWallet, setNeedsWallet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || data?.error) return;
        if (!data.walletAddress) setNeedsWallet(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!needsWallet) return null;

  return (
    <Modal.Backdrop
      isOpen
      isDismissable={false}
      isKeyboardDismissDisabled
      variant="blur"
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <IconWallet className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Connect your wallet to continue</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            <p className="text-sm text-muted leading-relaxed">
              SkillSwap requires a Cardano wallet. It signs the on-chain proof
              for your completed swaps and secures your end-to-end encrypted
              messages. You can&apos;t access the app until one is linked.
            </p>
            {!isMainnet && (
              <p className="text-xs text-muted">
                You&apos;re on <strong>{label}</strong> - you can
                get free test ADA from a faucet to cover the tiny proof fee.
              </p>
            )}
            <WalletConnectButton
              mode="link"
              onLinked={() => window.location.reload()}
            />
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
