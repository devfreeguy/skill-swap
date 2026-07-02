/**
 * Decode a signed payment tx (CBOR hex) and confirm it pays at least
 * `minLovelace` to `toAddress`. This lets the server validate the swap fee
 * *synchronously at request time* — reading the tx's own outputs — instead of
 * waiting ~20-60s for on-chain confirmation. A signed tx can't be altered
 * without invalidating it, so its outputs are trustworthy.
 *
 * Mesh's serializer (bundled CSL/CST) is imported lazily so it never lands in a
 * non-Node bundle. Any parse failure is treated as "does not pay" (reject).
 */
export async function signedTxPaysAtLeast(
  signedTxHex: string,
  toAddress: string,
  minLovelace: bigint
): Promise<boolean> {
  const { cst } = await import("@meshsdk/core");

  let outputs;
  try {
    const tx = cst.Serialization.Transaction.fromCbor(
      signedTxHex as unknown as Parameters<
        typeof cst.Serialization.Transaction.fromCbor
      >[0]
    );
    outputs = tx.body().outputs();
  } catch {
    return false; // unparseable → reject
  }

  let paid = BigInt(0);
  for (const output of outputs) {
    let address: string;
    try {
      address = output.address().toBech32();
    } catch {
      continue;
    }
    if (address === toAddress) {
      paid += output.amount().coin();
    }
  }
  return paid >= minLovelace;
}
