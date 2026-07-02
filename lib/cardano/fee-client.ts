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

  const wallet = await BrowserWallet.enable(args.walletName);
  const refundAddress = await wallet.getChangeAddress();

  const tx = new Transaction({ initiator: wallet });
  tx.sendLovelace(args.toAddress, args.lovelace);

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);

  return { signedTx, refundAddress };
}
