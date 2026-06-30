/**
 * Shape of the on-chain proof metadata. Kept tiny and within Cardano's 64-byte
 * per-string limit: only a content hash goes on-chain, the full proof stays in
 * the DB and can be re-hashed to verify the chain record. Client-safe (no Node
 * APIs) so it can be imported in the browser to build the tx metadata.
 */

export const PROOF_LABEL = process.env.NEXT_PUBLIC_PROOF_LABEL || "5757";

export type ProofMetadata = {
  p: "skillswap";
  v: number;
  swap: string;
  hash: string;
  net: string;
};

export function buildProofMetadata(args: {
  swapId: string;
  hash: string;
  network: string;
}): ProofMetadata {
  return {
    p: "skillswap",
    v: 1,
    swap: args.swapId,
    hash: args.hash,
    net: args.network,
  };
}
