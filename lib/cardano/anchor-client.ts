import { buildProofMetadata, PROOF_LABEL } from "@/lib/cardano/proof-metadata";

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

  const wallet = await BrowserWallet.enable(args.walletName);

  const metadata = buildProofMetadata({
    swapId: args.swapId,
    hash: args.hash,
    network: args.network,
  });

  const tx = new Transaction({ initiator: wallet });
  tx.setMetadata(Number(PROOF_LABEL), metadata);

  const unsignedTx = await tx.build();
  return wallet.signTx(unsignedTx);
}
