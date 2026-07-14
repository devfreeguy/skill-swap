"use client";

import { Button, Modal, Separator } from "@heroui/react";
import { IconShieldCheck } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { CARDANO_LIMIT_NETWORK } from "@/lib/cardano";
import dynamic from "next/dynamic";

const WalletConnectButton = dynamic(
  () => import("@/components/elements/WalletConnectButton"),
  { ssr: false }
);

interface Props {
  swapId: string;
  metadataHash: string;
  network: string;
  isOpen: boolean;
  /**
   * Called immediately after the signed tx is submitted to the chain.
   * The parent should close the modal — confirmation polling runs silently
   * in the background (the swap page polls while chainStatus === "ANCHORING").
   */
  onSubmitted: () => void;
}

export default function AnchorProofModal({
  swapId,
  metadataHash,
  network,
  isOpen,
  onSubmitted,
}: Props) {
  const { enabledWallet } = useCardano({ limitNetwork: CARDANO_LIMIT_NETWORK });
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  // Reset state whenever the modal opens for a (possibly different) swap.
  useEffect(() => {
    if (isOpen) { setSigning(false); setError(""); }
  }, [isOpen, swapId]);

  async function sign() {
    if (!enabledWallet) return;
    setError("");
    setSigning(true);
    try {
      const { buildAndSignProofTx } = await import("@/lib/cardano/anchor-client");
      const signedTx = await buildAndSignProofTx({
        walletName: enabledWallet,
        swapId,
        hash: metadataHash,
        network,
      });
      const res = await fetch(`/api/swaps/${swapId}/anchor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedTx }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Anchor failed. Please try again.");
        return;
      }
      // Tx submitted — hand off to silent background polling and close.
      onSubmitted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signing was cancelled or failed.");
    } finally {
      setSigning(false);
    }
  }

  const noWallet = !enabledWallet;

  return (
    <Modal.Backdrop
      isOpen={isOpen}
      isDismissable={false}
      isKeyboardDismissDisabled
      variant="blur"
    >
      <Modal.Container>
        <Modal.Dialog className="sm:max-w-md">
          <Modal.Header>
            <Modal.Icon className="bg-accent/10 text-accent">
              <IconShieldCheck className="size-5" />
            </Modal.Icon>
            <Modal.Heading>Anchor Your Proof On-Chain</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="flex flex-col gap-4">
            {noWallet ? (
              <>
                <p className="text-sm text-muted leading-relaxed">
                  Your swap is complete! The final step is signing a small
                  Cardano transaction that permanently records this exchange
                  on-chain. Connect your wallet to continue.
                </p>
                <Separator />
                <WalletConnectButton mode="login" />
              </>
            ) : (
              <>
                <p className="text-sm text-muted leading-relaxed">
                  Your swap is complete. Signing this transaction records the
                  proof on the Cardano blockchain — a permanent, verifiable
                  record of your skill exchange. This step is required for
                  every completed swap.
                </p>
                {error && <p className="text-sm text-danger">{error}</p>}
              </>
            )}
          </Modal.Body>

          {!noWallet && (
            <Modal.Footer>
              <Button
                className="w-full bg-accent text-accent-foreground font-semibold"
                onPress={sign}
                isPending={signing}
                isDisabled={signing}
              >
                <IconShieldCheck size={15} />
                {signing ? "Waiting for signature…" : "Sign & Anchor"}
              </Button>
            </Modal.Footer>
          )}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
