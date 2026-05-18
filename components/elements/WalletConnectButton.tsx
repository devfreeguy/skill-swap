"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Popover,
  TextField,
  Label,
  Input,
  Modal,
} from "@heroui/react";
import Image from "next/image";
import { useEffect } from "react";
import { useCardano } from "@cardano-foundation/cardano-connect-with-wallet";
import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";
import { useWalletAuth } from "@/hooks/useWalletAuth";
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
  mode?: "login" | "register";
}

export default function WalletConnectButton({
  mode = "login",
}: WalletConnectButtonProps) {
  const { isConnected, stakeAddress, disconnect } = useCardano({
    limitNetwork: NetworkType.MAINNET,
  });
  const { connectAndAuth, registerWithWallet, isLoading, loadingText, error } =
    useWalletAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [originalPath, setOriginalPath] = useState("");

  const wallets = getAvailableWallets();

  const isFormOpen =
    mode === "register" && selectedWallet !== null && !isConnected;

  useEffect(() => {
    if (isFormOpen) {
      setOriginalPath(window.location.pathname);
      window.history.pushState(null, "", "/onboarding");
    }
  }, [isFormOpen]);

  function handleCloseModal() {
    setSelectedWallet(null);
    if (originalPath) {
      window.history.pushState(null, "", originalPath);
      setOriginalPath("");
    }
  }

  function handleWalletSelect(walletId: string) {
    setIsOpen(false);
    if (mode === "login") {
      connectAndAuth(walletId);
    } else {
      setSelectedWallet(walletId);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    setNameError("");
    if (!selectedWallet) return;
    await registerWithWallet(selectedWallet, name.trim(), email.trim());
  }

  return (
    <>
      <LemniscateLoader
        loading={isLoading}
        text={loadingText}
        overlayOpacity={0.6}
      />

      <Modal>
        <Modal.Backdrop
          isOpen={isFormOpen}
          onOpenChange={(open) => !open && handleCloseModal()}
          className="bg-black/80"
        >
          <Modal.Container className="items-center justify-center p-4">
            <Modal.Dialog className="bg-surface border border-border w-full max-w-md p-6 rounded-2xl relative shadow-2xl">
              <Modal.Header className="flex flex-col gap-1 text-center mb-6 mt-2">
                <Modal.Heading className="text-2xl font-bold text-foreground">
                  Complete Onboarding
                </Modal.Heading>
                
                <p className="text-sm text-muted">
                  Please provide your details to finish registration.
                </p>
                
                <Modal.CloseTrigger className="absolute right-4 top-4 z-10 size-8" />
              </Modal.Header>

              <Modal.Body>
                <form
                  onSubmit={handleRegisterSubmit}
                  className="flex flex-col gap-4"
                >
                  <TextField
                    name="name"
                    type="text"
                    value={name}
                    onChange={setName}
                    isRequired
                    isInvalid={!!nameError}
                    className="w-full"
                  >
                    <Label>Full Name</Label>
                    <Input placeholder="Your name" className="bg-background" />
                  </TextField>

                  <TextField
                    name="email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    className="w-full"
                  >
                    <Label>Email (optional)</Label>
                    <Input
                      placeholder="you@example.com"
                      className="bg-background"
                    />
                  </TextField>

                  {(error || nameError) && (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>
                          {error || nameError}
                        </Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    isPending={isLoading}
                    isDisabled={isLoading}
                    className="w-full rounded-full bg-accent text-accent-foreground font-semibold mt-2"
                  >
                    {isLoading ? "Creating account…" : "Sign & Create Account"}
                  </Button>
                </form>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {isConnected && stakeAddress ? (
        <div className="flex items-center gap-2 w-full">
          <div className="flex-1 px-4 py-2 rounded-full border border-border text-sm text-foreground bg-transparent truncate">
            {truncateAddress(stakeAddress)}
          </div>
          <Button
            variant="outline"
            className="rounded-full border-border text-foreground shrink-0"
            onPress={() => disconnect()}
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 w-full">
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

          {mode === "login" && error && (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}
        </div>
      )}
    </>
  );
}
