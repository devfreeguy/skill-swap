import { buildProofMetadata, PROOF_LABEL } from "@/lib/cardano/proof-metadata";
import { withTimeout } from "@/lib/cardano/timeout";

const ENABLE_TIMEOUT_MS = 30_000;
const SIGN_TIMEOUT_MS = 120_000;

/**
 * Build and sign the on-chain proof transaction with the user's connected
 * wallet (CIP-30, via Mesh). Returns the signed CBOR hex, which the server
 * submits through the provider fallback chain. Mesh is imported lazily so it
 * never ends up in the SSR/server bundle.
 */
export async function buildAndSignProofTx(args: {
  walletName: string;
  swapId: string;
  hash: string;
  network: string;
}): Promise<string> {
  const { BrowserWallet, Transaction } = await import("@meshsdk/core");

  const wallet = await withTimeout(
    BrowserWallet.enable(args.walletName),
    ENABLE_TIMEOUT_MS,
    "Wallet did not respond. Make sure your extension is unlocked and try again."
  );

  const metadata = buildProofMetadata({
    swapId: args.swapId,
    hash: args.hash,
    network: args.network,
  });

  const tx = new Transaction({ initiator: wallet });
  tx.setMetadata(Number(PROOF_LABEL), metadata);

  const unsignedTx = await tx.build();
  return withTimeout(
    wallet.signTx(unsignedTx),
    SIGN_TIMEOUT_MS,
    "Wallet timed out while signing. Check the extension popup and try again."
  );
}
