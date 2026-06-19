import { NetworkType } from "@cardano-foundation/cardano-connect-with-wallet-core";

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
export const CARDANO_LIMIT_NETWORK: NetworkType = IS_MAINNET
  ? NetworkType.MAINNET
  : NetworkType.TESTNET;

const NETWORK_LABELS: Record<CardanoNetwork, string> = {
  mainnet: "Mainnet",
  preprod: "Preprod Testnet",
  preview: "Preview Testnet",
};

export const CARDANO_NETWORK_LABEL = NETWORK_LABELS[CARDANO_NETWORK];
