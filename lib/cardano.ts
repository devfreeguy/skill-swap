// Type-only import: erased at compile time so this module never pulls the
// wallet-core runtime (which touches `window` at eval) into the server bundle.
import type { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";

export type CardanoNetwork = "preprod" | "preview" | "mainnet";

/**
 * Resolve the configured Cardano network from NEXT_PUBLIC_CARDANO_NETWORK.
 * Defaults to "preprod" (testnet) when unset or invalid.
 */
function resolveNetwork(value: string | undefined): CardanoNetwork {
  if (value === "mainnet" || value === "preprod" || value === "preview") {
    return value;
  }
  return "preprod";
}

export const CARDANO_NETWORK: CardanoNetwork = resolveNetwork(
  process.env.NEXT_PUBLIC_CARDANO_NETWORK
);

export const IS_MAINNET = CARDANO_NETWORK === "mainnet";

/**
 * The wallet library (CIP-30) only distinguishes mainnet vs testnet by network
 * id, so preprod and preview both map to NetworkType.TESTNET. The preprod/preview
 * distinction is display-only.
 */
// NetworkType is a string enum ("mainnet" | "testnet"); using the literal
// values keeps this free of the runtime import while staying type-correct.
export const CARDANO_LIMIT_NETWORK: NetworkType = (
  IS_MAINNET ? "mainnet" : "testnet"
) as NetworkType;

const NETWORK_LABELS: Record<CardanoNetwork, string> = {
  mainnet: "Mainnet",
  preprod: "Preprod Testnet",
  preview: "Preview Testnet",
};

export const CARDANO_NETWORK_LABEL = NETWORK_LABELS[CARDANO_NETWORK];
