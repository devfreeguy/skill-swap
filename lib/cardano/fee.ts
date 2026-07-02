/**
 * Swap platform-fee configuration. Client-safe (plain env reads, no runtime
 * imports) so it can be imported from both the browser and the server.
 *
 * The initiator pays this fee when requesting a swap; it is refunded only if
 * the receiver declines (see POST /api/swaps and PATCH /api/swaps/[id]).
 */

/** Fee charged per swap request, in lovelace (1 ADA = 1_000_000 lovelace). */
export const SWAP_FEE_LOVELACE =
  Number(process.env.NEXT_PUBLIC_SWAP_FEE_LOVELACE) || 2_000_000;

/** Same fee expressed in ADA, for display. */
export const SWAP_FEE_ADA = SWAP_FEE_LOVELACE / 1_000_000;

/**
 * The platform's receive address (base/payment address, addr1…/addr_test1…).
 * Public so the browser can build the payment tx to it. When empty, payments
 * are disabled (local dev without a configured treasury).
 */
export const PLATFORM_WALLET_ADDRESS =
  process.env.NEXT_PUBLIC_PLATFORM_WALLET_ADDRESS ?? "";

/** Whether the swap fee is enforced (a platform address is configured). */
export const PAYMENTS_ENABLED = PLATFORM_WALLET_ADDRESS.length > 0;
