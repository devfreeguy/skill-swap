/**
 * Multi-provider Cardano access with automatic fallback.
 *
 * Submitting and confirming a transaction each try a chain of providers in
 * order and fall back to the next on failure, so a single provider outage
 * doesn't break on-chain proof anchoring:
 *
 *   Blockfrost (keyed) → Koios (free, no key) → Maestro (keyed, optional)
 *
 * All run server-side so API keys are never exposed to the browser.
 */

export type CardanoNetwork = "mainnet" | "preprod" | "preview";

export const NETWORK: CardanoNetwork = ((): CardanoNetwork => {
  const v = process.env.NEXT_PUBLIC_CARDANO_NETWORK;
  return v === "mainnet" || v === "preprod" || v === "preview" ? v : "preprod";
})();

interface TxOutput {
  address: string;
  lovelace: bigint;
}

interface Provider {
  name: string;
  /** Submit a CBOR-hex signed tx; resolves to the tx hash. */
  submitTx(txHex: string): Promise<string>;
  /** Whether the tx is on-chain (confirmed in a block). */
  isConfirmed(txHash: string): Promise<boolean>;
  /**
   * The tx's outputs once it's on-chain, or `null` if the tx isn't visible yet
   * (still pending / not found). Optional — only providers that can resolve
   * outputs implement it.
   */
  getOutputs?(txHash: string): Promise<TxOutput[] | null>;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

// ── Blockfrost ────────────────────────────────────────────────────────────────

function blockfrost(): Provider | null {
  const key = process.env.BLOCKFROST_API_KEY;
  if (!key) return null;
  const base = `https://cardano-${NETWORK}.blockfrost.io/api/v0`;
  return {
    name: "blockfrost",
    async submitTx(txHex) {
      const res = await fetch(`${base}/tx/submit`, {
        method: "POST",
        headers: { project_id: key, "Content-Type": "application/cbor" },
        body: hexToBytes(txHex) as unknown as BodyInit,
      });
      if (!res.ok) throw new Error(`blockfrost submit ${res.status}`);
      return (await res.json()) as string;
    },
    async isConfirmed(txHash) {
      const res = await fetch(`${base}/txs/${txHash}`, {
        headers: { project_id: key },
      });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`blockfrost tx ${res.status}`);
      return true;
    },
    async getOutputs(txHash) {
      const res = await fetch(`${base}/txs/${txHash}/utxos`, {
        headers: { project_id: key },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`blockfrost utxos ${res.status}`);
      const data = (await res.json()) as {
        outputs: { address: string; amount: { unit: string; quantity: string }[] }[];
      };
      return data.outputs.map((o) => ({
        address: o.address,
        lovelace: BigInt(
          o.amount.find((a) => a.unit === "lovelace")?.quantity ?? "0"
        ),
      }));
    },
  };
}

// ── Koios (free, no key) ──────────────────────────────────────────────────────

function koios(): Provider {
  const host =
    NETWORK === "mainnet"
      ? "api.koios.rest"
      : NETWORK === "preprod"
        ? "preprod.koios.rest"
        : "preview.koios.rest";
  const base = `https://${host}/api/v1`;
  return {
    name: "koios",
    async submitTx(txHex) {
      const res = await fetch(`${base}/submittx`, {
        method: "POST",
        headers: { "Content-Type": "application/cbor" },
        body: hexToBytes(txHex) as unknown as BodyInit,
      });
      if (!res.ok) throw new Error(`koios submit ${res.status}`);
      // Koios returns the tx hash as a quoted JSON string.
      return (await res.json()) as string;
    },
    async isConfirmed(txHash) {
      const res = await fetch(`${base}/tx_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _tx_hashes: [txHash] }),
      });
      if (!res.ok) throw new Error(`koios tx_status ${res.status}`);
      const rows = (await res.json()) as {
        tx_hash: string;
        num_confirmations: number | null;
      }[];
      const row = rows.find((r) => r.tx_hash === txHash);
      return !!row && (row.num_confirmations ?? 0) > 0;
    },
    async getOutputs(txHash) {
      const res = await fetch(`${base}/tx_info`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _tx_hashes: [txHash] }),
      });
      if (!res.ok) throw new Error(`koios tx_info ${res.status}`);
      const rows = (await res.json()) as {
        tx_hash: string;
        outputs: { payment_addr?: { bech32?: string }; value: string }[];
      }[];
      const row = rows.find((r) => r.tx_hash === txHash);
      if (!row) return null; // not on-chain yet
      return (row.outputs ?? []).map((o) => ({
        address: o.payment_addr?.bech32 ?? "",
        lovelace: BigInt(o.value ?? "0"),
      }));
    },
  };
}

// ── Maestro (keyed, optional) ─────────────────────────────────────────────────

function maestro(): Provider | null {
  const key = process.env.MAESTRO_API_KEY;
  if (!key) return null;
  const base = `https://${NETWORK}.gomaestro-api.org/v1`;
  return {
    name: "maestro",
    async submitTx(txHex) {
      const res = await fetch(`${base}/submit/tx`, {
        method: "POST",
        headers: { "api-key": key, "Content-Type": "application/cbor" },
        body: hexToBytes(txHex) as unknown as BodyInit,
      });
      if (!res.ok) throw new Error(`maestro submit ${res.status}`);
      return (await res.text()).replace(/"/g, "");
    },
    async isConfirmed(txHash) {
      const res = await fetch(`${base}/transactions/${txHash}`, {
        headers: { "api-key": key },
      });
      if (res.status === 404) return false;
      if (!res.ok) throw new Error(`maestro tx ${res.status}`);
      return true;
    },
  };
}

function providers(): Provider[] {
  return [blockfrost(), koios(), maestro()].filter(
    (p): p is Provider => p !== null
  );
}

/** Submit a signed tx, trying each provider until one succeeds. */
export async function submitTx(
  txHex: string
): Promise<{ txHash: string; provider: string }> {
  const errors: string[] = [];
  for (const p of providers()) {
    try {
      const txHash = await p.submitTx(txHex);
      return { txHash, provider: p.name };
    } catch (e) {
      errors.push(`${p.name}: ${(e as Error).message}`);
    }
  }
  throw new Error(`All providers failed to submit: ${errors.join("; ")}`);
}

export type PaymentCheck = "CONFIRMED" | "PENDING" | "INSUFFICIENT";

/**
 * Verify that `txHash` pays at least `minLovelace` to `toAddress` on-chain.
 *
 *   CONFIRMED    — tx is on-chain and pays ≥ minLovelace to the address
 *   INSUFFICIENT — tx is on-chain but pays too little (or nothing) there
 *   PENDING      — tx not visible on-chain yet, or no provider could resolve it
 *
 * The caller treats PENDING as "check again later" and only acts on the
 * terminal CONFIRMED / INSUFFICIENT results.
 */
export async function verifyPaymentTx(
  txHash: string,
  toAddress: string,
  minLovelace: bigint
): Promise<PaymentCheck> {
  for (const p of providers()) {
    if (!p.getOutputs) continue;
    try {
      const outputs = await p.getOutputs(txHash);
      if (outputs === null) return "PENDING"; // reached provider; tx not yet on-chain
      const paid = outputs
        .filter((o) => o.address === toAddress)
        .reduce((sum, o) => sum + o.lovelace, BigInt(0));
      return paid >= minLovelace ? "CONFIRMED" : "INSUFFICIENT";
    } catch {
      // try the next provider
    }
  }
  return "PENDING";
}

/** True if any provider reports the tx as confirmed on-chain. */
export async function isTxConfirmed(txHash: string): Promise<boolean> {
  for (const p of providers()) {
    try {
      if (await p.isConfirmed(txHash)) return true;
    } catch {
      // try next provider
    }
  }
  return false;
}
