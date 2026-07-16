/**
 * Server-side refund of a swap fee from the platform hot wallet.
 * Both mainnet and preprod use the same mnemonic (same wallet, different
 * network address). Requires PLATFORM_WALLET_MNEMONIC_{NETWORK} and
 * BLOCKFROST_API_KEY_{NETWORK}.
 */
import type { ActiveNetwork } from "@/lib/network";

export async function refundFee(args: {
  toAddress: string;
  lovelace: number;
  network: ActiveNetwork;
}): Promise<string> {
  const mnemonicKey =
    args.network === "mainnet"
      ? "PLATFORM_WALLET_MNEMONIC_MAINNET"
      : "PLATFORM_WALLET_MNEMONIC_PREPROD";
  const mnemonic =
    process.env[mnemonicKey] ?? process.env.PLATFORM_WALLET_MNEMONIC;
  if (!mnemonic) {
    throw new Error(`${mnemonicKey} is not configured`);
  }

  const blockfrostKey =
    args.network === "mainnet"
      ? (process.env.BLOCKFROST_API_KEY_MAINNET ?? process.env.BLOCKFROST_API_KEY)
      : (process.env.BLOCKFROST_API_KEY_PREPROD ?? process.env.BLOCKFROST_API_KEY);
  if (!blockfrostKey) {
    throw new Error("BLOCKFROST_API_KEY is required to issue refunds");
  }

  const { MeshWallet, BlockfrostProvider, Transaction } = await import(
    "@meshsdk/core"
  );

  const provider = new BlockfrostProvider(blockfrostKey);
  const wallet = new MeshWallet({
    networkId: args.network === "mainnet" ? 1 : 0,
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
