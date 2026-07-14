import { withTimeout } from "@/lib/cardano/timeout";

const ENABLE_TIMEOUT_MS = 30_000;
const SIGN_TIMEOUT_MS = 120_000;

/**
 * Build and sign the swap-fee payment with the user's connected wallet
 * (CIP-30, via Mesh). Returns the signed CBOR — which the server submits
 * through the provider fallback chain — plus the wallet's change address, which
 * we store as the refund target (the DB only keeps the stake address, which
 * can't receive ADA). Mesh is imported lazily so it never lands in the
 * SSR/server bundle.
 */
export async function buildAndSignFeeTx(args: {
  walletName: string;
  toAddress: string;
  lovelace: string;
}): Promise<{ signedTx: string; refundAddress: string }> {
  const { BrowserWallet, Transaction } = await import("@meshsdk/core");

  const wallet = await withTimeout(
    BrowserWallet.enable(args.walletName),
    ENABLE_TIMEOUT_MS,
    "Wallet did not respond. Make sure your extension is unlocked and try again."
  );
  const refundAddress = await wallet.getChangeAddress();

  const tx = new Transaction({ initiator: wallet });
  tx.sendLovelace(args.toAddress, args.lovelace);

  const unsignedTx = await tx.build();
  const signedTx = await withTimeout(
    wallet.signTx(unsignedTx),
    SIGN_TIMEOUT_MS,
    "Wallet timed out while signing. Check the extension popup and try again."
  );

  return { signedTx, refundAddress };
}
