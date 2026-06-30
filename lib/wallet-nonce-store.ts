import prisma from "./prisma";

const TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Persist a single-use wallet-login challenge nonce. Backed by the database
 * (not in-memory) so the challenge survives server restarts and is shared
 * across all serverless instances — issuing on one and verifying on another
 * works. Expired rows are garbage-collected opportunistically on each issue.
 */
export async function storeNonce(nonce: string): Promise<void> {
  await prisma.walletNonce.create({
    data: { nonce, expiresAt: new Date(Date.now() + TTL_MS) },
  });
  await prisma.walletNonce.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

/**
 * Atomically consume a nonce: returns true only if it existed and had not
 * expired. The delete is the atomicity primitive — two concurrent consumes of
 * the same nonce can't both succeed (the second finds no row), so a nonce is
 * usable at most once. A missing nonce throws P2025, which we treat as invalid.
 */
export async function consumeNonce(nonce: string): Promise<boolean> {
  try {
    const deleted = await prisma.walletNonce.delete({ where: { nonce } });
    return deleted.expiresAt.getTime() > Date.now();
  } catch {
    return false;
  }
}
