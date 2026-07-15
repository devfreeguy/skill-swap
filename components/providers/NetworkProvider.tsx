"use client";

import { createContext, useContext } from "react";
import type { ActiveNetwork } from "@/lib/network";

interface NetworkContextValue {
  network: ActiveNetwork;
  isMainnet: boolean;
  label: string;
  /** CIP-30 network id literal used by the wallet SDK */
  limitNetwork: "mainnet" | "testnet";
}

const defaults: NetworkContextValue = {
  network: "preprod",
  isMainnet: false,
  label: "Preprod Testnet",
  limitNetwork: "testnet",
};

const NetworkContext = createContext<NetworkContextValue>(defaults);

function buildValue(network: ActiveNetwork): NetworkContextValue {
  const isMainnet = network === "mainnet";
  return {
    network,
    isMainnet,
    label: isMainnet ? "Mainnet" : "Preprod Testnet",
    limitNetwork: isMainnet ? "mainnet" : "testnet",
  };
}

export function NetworkProvider({
  children,
  initialNetwork,
}: {
  children: React.ReactNode;
  initialNetwork: ActiveNetwork;
}) {
  return (
    <NetworkContext.Provider value={buildValue(initialNetwork)}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkContext(): NetworkContextValue {
  return useContext(NetworkContext);
}
