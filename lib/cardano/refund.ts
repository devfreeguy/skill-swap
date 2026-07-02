/**
 * Server-side refund of a swap fee from the platform hot wallet.
 *
 * When a receiver declines a swap, the initiator's fee is returned. The
 * platform wallet (a mnemonic held only on the server) builds, signs, and
 * submits the refund tx via Blockfrost. Mesh + the mnemonic are loaded lazily
 * inside the Node runtime so nothing wallet-related is bundled elsewhere.
 *
 * Requires PLATFORM_WALLET_MNEMONIC and BLOCKFROST_API_KEY.
 */
import { IS_MAINNET } from "@/lib/cardano";

export async function refundFee(args: {
  toAddress: string;
  lovelace: number;
}): Promise<string> {
  const mnemonic = process.env.PLATFORM_WALLET_MNEMONIC;
  const blockfrostKey = process.env.BLOCKFROST_API_KEY;
  if (!mnemonic) {
    throw new Error("PLATFORM_WALLET_MNEMONIC is not configured");
  }
  if (!blockfrostKey) {
    throw new Error("BLOCKFROST_API_KEY is required to issue refunds");
  }

  const { MeshWallet, BlockfrostProvider, Transaction } = await import(
    "@meshsdk/core"
  );

  const provider = new BlockfrostProvider(blockfrostKey);
  const wallet = new MeshWallet({
    networkId: IS_MAINNET ? 1 : 0,
    fetcher: provider,
    submitter: provider,
    key: { type: "mnemonic", words: mnemonic.trim().split(/\s+/) },
  });
  await wallet.init();

  const tx = new Transaction({ initiator: wallet });
  tx.sendLovelace(args.toAddress, String(args.lovelace));

  const unsignedTx = await tx.build();
  const signedTx = await wallet.signTx(unsignedTx);
  return wallet.submitTx(signedTx);
}
