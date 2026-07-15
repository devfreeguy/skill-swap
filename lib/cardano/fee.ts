import type { ActiveNetwork } from "@/lib/network";

/** Fee charged per swap request, in lovelace. */
export const SWAP_FEE_LOVELACE =
  Number(process.env.NEXT_PUBLIC_SWAP_FEE_LOVELACE) || 2_000_000;

/** Same fee in ADA, for display. */
export const SWAP_FEE_ADA = SWAP_FEE_LOVELACE / 1_000_000;

/** Per-network fee configuration. */
export function getFeeConfig(network: ActiveNetwork) {
  const addressKey =
    network === "mainnet"
      ? process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS_MAINNET
      : process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS_PREPROD;

  const PLATFORM_WALLET_ADDRESS =
    addressKey ?? process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS ?? "";

  return {
    PLATFORM_WALLET_ADDRESS,
    SWAP_FEE_LOVELACE,
    SWAP_FEE_ADA,
    PAYMENTS_ENABLED: PLATFORM_WALLET_ADDRESS.length > 0,
  };
}

// Legacy single-network exports (default to preprod env vars).
// @deprecated — use getFeeConfig(network) in API routes.
export const PLATFORM_WALLET_ADDRESS =
  process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS ?? "";
export const PAYMENTS_ENABLED = PLATFORM_WALLET_ADDRESS.length > 0;
