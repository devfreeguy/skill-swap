const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface NonceEntry {
  nonce: string;
  expiresAt: number;
}

const store = new Map<string, NonceEntry>();

export function storeNonce(nonce: string): void {
  store.set(nonce, { nonce, expiresAt: Date.now() + TTL_MS });
}

export function consumeNonce(nonce: string): boolean {
  const entry = store.get(nonce);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(nonce);
    return false;
  }
  store.delete(nonce);
  return true;
}
