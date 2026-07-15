/**
 * Multi-provider Cardano access with automatic fallback.
 *
 * Submitting and confirming a transaction each try a chain of providers in
 * order and fall back to the next on failure:
 *
 *   Blockfrost (keyed) → Koios (free, no key) → Maestro (keyed, optional)
 *
 * All run server-side so API keys are never exposed to the browser.
 */

export type CardanoNetwork = "mainnet" | "preprod" | "preview";

interface TxOutput {
  address: string;
  lovelace: bigint;
}

interface Provider {
  name: string;
  submitTx(txHex: string): Promise<string>;
  isConfirmed(txHash: string): Promise<boolean>;
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

function blockfrost(network: CardanoNetwork): Provider | null {
  const key =
    network === "mainnet"
      ? (process.env.BLOCKFROST_API_KEY_MAINNET ?? process.env.BLOCKFROST_API_KEY)
      : (process.env.BLOCKFROST_API_KEY_PREPROD ?? process.env.BLOCKFROST_API_KEY);
  if (!key) return null;
  const base = `https://cardano-${network}.blockfrost.io/api/v0`;
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

function koios(network: CardanoNetwork): Provider {
  const host =
    network === "mainnet"
      ? "api.koios.rest"
      : network === "preprod"
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
      if (!row) return null;
      return (row.outputs ?? []).map((o) => ({
        address: o.payment_addr?.bech32 ?? "",
        lovelace: BigInt(o.value ?? "0"),
      }));
    },
  };
}

// ── Maestro (keyed, optional) ─────────────────────────────────────────────────

function maestro(network: CardanoNetwork): Provider | null {
  const key = process.env.MAESTRO_API_KEY;
  if (!key) return null;
  const base = `https://${network}.gomaestro-api.org/v1`;
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

function getProviders(network: CardanoNetwork): Provider[] {
  return [blockfrost(network), koios(network), maestro(network)].filter(
    (p): p is Provider => p !== null
  );
}

/** Submit a signed tx, trying each provider until one succeeds. */
export async function submitTx(
  txHex: string,
  network: CardanoNetwork = "preprod"
): Promise<{ txHash: string; provider: string }> {
  const errors: string[] = [];
  for (const p of getProviders(network)) {
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

export async function verifyPaymentTx(
  txHash: string,
  toAddress: string,
  minLovelace: bigint,
  network: CardanoNetwork = "preprod"
): Promise<PaymentCheck> {
  for (const p of getProviders(network)) {
    if (!p.getOutputs) continue;
    try {
      const outputs = await p.getOutputs(txHash);
      if (outputs === null) return "PENDING";
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
export async function isTxConfirmed(
  txHash: string,
  network: CardanoNetwork = "preprod"
): Promise<boolean> {
  for (const p of getProviders(network)) {
    try {
      if (await p.isConfirmed(txHash)) return true;
    } catch {
      // try next provider
    }
  }
  return false;
}
