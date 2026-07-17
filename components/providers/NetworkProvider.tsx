"use client";

import { createContext, useContext, useState } from "react";
import type { ActiveNetwork } from "@/lib/network";

interface NetworkContextValue {
  network: ActiveNetwork;
  isMainnet: boolean;
  label: string;
  /** CIP-30 network id literal used by the wallet SDK */
  limitNetwork: "mainnet" | "testnet";
  setNetwork: (network: ActiveNetwork) => Promise<void>;
}

const defaults: NetworkContextValue = {
  network: "preprod",
  isMainnet: false,
  label: "Preprod Testnet",
  limitNetwork: "testnet",
  setNetwork: async () => {},
};

const NetworkContext = createContext<NetworkContextValue>(defaults);

function buildValue(network: ActiveNetwork) {
  const isMainnet = network === "mainnet";
  return {
    network,
    isMainnet,
    label: isMainnet ? "Mainnet" : "Preprod Testnet",
    limitNetwork: (isMainnet ? "mainnet" : "testnet") as "mainnet" | "testnet",
  };
}

export function NetworkProvider({
  children,
  initialNetwork,
}: {
  children: React.ReactNode;
  initialNetwork: ActiveNetwork;
}) {
  const [network, setNetworkState] = useState<ActiveNetwork>(initialNetwork);

  async function setNetwork(next: ActiveNetwork) {
    await fetch("/api/network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ network: next }),
    });
    setNetworkState(next);
  }

  return (
    <NetworkContext.Provider value={{ ...buildValue(network), setNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkContext(): NetworkContextValue {
  return useContext(NetworkContext);
}
