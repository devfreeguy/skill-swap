import type { PrismaClient } from "@/app/generated/prisma/client";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Persist a single-use wallet-login challenge nonce. Backed by the
 * network-specific database so mainnet and preprod nonces are isolated.
 */
export async function storeNonce(nonce: string, db: PrismaClient): Promise<void> {
  await db.walletNonce.create({
    data: { nonce, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  await db.walletNonce.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

/**
 * Atomically consume a nonce: returns true only if it existed and had not
 * expired. The delete is the atomicity primitive — two concurrent consumes of
 * the same nonce can't both succeed.
 */
export async function consumeNonce(nonce: string, db: PrismaClient): Promise<boolean> {
  try {
    const deleted = await db.walletNonce.delete({ where: { nonce } });
    return deleted.expiresAt.getTime() > Date.now();
  } catch {
    return false;
  }
}
