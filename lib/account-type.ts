import { PrismaClient } from "@/app/generated/prisma/client";

/**
 * The identity provider a user originally signed up with.
 *
 *   'x'      — created via X (Twitter) OAuth
 *   'wallet' — created via a Cardano wallet signature
 *   'email'  — created via email + password
 *
 * Account type is immutable after signup: a user may only authenticate with
 * the provider they used to create their account. This is enforced on every
 * link/login path so a wallet that belongs to an X account can never be used
 * to authenticate as (or be hijacked into) a different account.
 */
export type AccountType = "x" | "wallet" | "email";

export const WALLET_ALREADY_LINKED_TO_X_ERROR =
  "This wallet is already linked to another profile.";

interface LinkCheck {
  /** True if the request can proceed. */
  ok: boolean;
  /** Present when ok === false. */
  error?: string;
  /** The existing owner of the wallet, if any. */
  existing?: { id: string; accountType: string | null };
}

/**
 * Pre-flight validation for linking a wallet to an account. Call BEFORE any
 * state change (nonce consumption, signature check, or DB write) so we never
 * mutate data or trigger a redirect on an invalid link.
 *
 * Rules:
 *  1. A wallet already linked to another user is rejected.
 *  2. A wallet already linked to an 'x' account is rejected with the canonical
 *     "already linked to another profile" message — an X account's wallet must
 *     not be taken over by (or used to log in as) a different account.
 *  3. Linking a wallet to the user that already owns it is a no-op (ok).
 */
export async function checkWalletLinkable(
  db: PrismaClient,
  walletAddress: string,
  currentUserId: string
): Promise<LinkCheck> {
  const existing = await db.user.findUnique({ where: { walletAddress } });

  if (!existing) return { ok: true };

  // Same account — re-linking its own wallet is harmless.
  if (existing.id === currentUserId) return { ok: true, existing };

  // Wallet already bound to a different account.
  if (existing.accountType === "x") {
    // Central migration rule: X accounts own their wallet; it cannot be
    // reassigned. Surface the same message regardless of requester type.
    return { ok: false, error: WALLET_ALREADY_LINKED_TO_X_ERROR, existing };
  }

  return {
    ok: false,
    error: "This wallet is already linked to another account.",
    existing,
  };
}
