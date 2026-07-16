import { getPrisma } from "@/lib/prisma";
import type { ActiveNetwork } from "@/lib/network";

// ── Minimal bech32 implementation for stake address cross-network conversion ──

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const CHARSET_MAP: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) CHARSET_MAP[CHARSET[i]] = i;

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const r: number[] = [];
  for (const c of hrp) r.push(c.charCodeAt(0) >> 5);
  r.push(0);
  for (const c of hrp) r.push(c.charCodeAt(0) & 31);
  return r;
}

function createChecksum(hrp: string, words: number[]): number[] {
  const mod =
    polymod([...hrpExpand(hrp), ...words, 0, 0, 0, 0, 0, 0]) ^ 1;
  return [0, 1, 2, 3, 4, 5].map((i) => (mod >> (5 * (5 - i))) & 31);
}

function decodeBech32(str: string): { hrp: string; words: number[] } | null {
  const lower = str.toLowerCase();
  const sep = lower.lastIndexOf("1");
  if (sep < 1 || sep + 7 > lower.length) return null;
  const hrp = lower.slice(0, sep);
  const data: number[] = [];
  for (let i = sep + 1; i < lower.length; i++) {
    const v = CHARSET_MAP[lower[i]];
    if (v === undefined) return null;
    data.push(v);
  }
  if (polymod([...hrpExpand(hrp), ...data]) !== 1) return null;
  return { hrp, words: data.slice(0, -6) };
}

function encodeBech32(hrp: string, words: number[]): string {
  const checksum = createChecksum(hrp, words);
  return hrp + "1" + [...words, ...checksum].map((w) => CHARSET[w]).join("");
}

/** Convert 5-bit words to 8-bit bytes (bech32 → raw bytes). */
function wordsToBytes(words: number[]): number[] | null {
  let acc = 0, bits = 0;
  const result: number[] = [];
  for (const w of words) {
    acc = (acc << 5) | w;
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      result.push((acc >> bits) & 0xff);
    }
  }
  // Any leftover bits must be zero (padding) — otherwise malformed.
  if (bits >= 5 || (acc << (8 - bits)) & 0xff) return null;
  return result;
}

/** Convert 8-bit bytes to 5-bit words (raw bytes → bech32). */
function bytesToWords(bytes: number[]): number[] {
  let acc = 0, bits = 0;
  const result: number[] = [];
  for (const b of bytes) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result.push((acc >> bits) & 0x1f);
    }
  }
  if (bits > 0) result.push((acc << (5 - bits)) & 0x1f);
  return result;
}

/**
 * Convert a Cardano stake address to the equivalent address on the other network.
 * The 28-byte stake key hash is identical on both networks; only the one-byte
 * network header (0xE1 for mainnet, 0xE0 for preprod/testnet) and the bech32
 * HRP differ.
 */
export function crossNetworkStakeAddr(
  addr: string,
  targetNetwork: ActiveNetwork
): string | null {
  try {
    const decoded = decodeBech32(addr);
    if (!decoded) return null;

    // Convert 5-bit words → bytes so we can patch the network header byte.
    const bytes = wordsToBytes(decoded.words);
    if (!bytes || bytes.length < 2) return null;

    // Cardano stake address header: mainnet = 0xE1, preprod/testnet = 0xE0
    const newHeader = targetNetwork === "mainnet" ? 0xe1 : 0xe0;
    const newBytes = [newHeader, ...bytes.slice(1)];

    // Re-encode bytes → 5-bit words → bech32 with new HRP.
    const newHrp = targetNetwork === "mainnet" ? "stake" : "stake_test";
    return encodeBech32(newHrp, bytesToWords(newBytes));
  } catch {
    return null;
  }
}

const PROFILE_FIELDS = [
  "name",
  "avatarUrl",
  "bio",
  "teachSkill",
  "learnSkill",
  "publicKey",
  "twitterId",
] as const;

/** Extract the 28-byte stake key hash from any bech32 stake address. */
function extractStakeKeyHash(addr: string): string | null {
  try {
    const decoded = decodeBech32(addr);
    if (!decoded) return null;
    const bytes = wordsToBytes(decoded.words);
    if (!bytes || bytes.length < 29) return null;
    return Buffer.from(bytes.slice(1, 29)).toString("hex");
  } catch {
    return null;
  }
}

const PROFILE_SELECT = Object.fromEntries(
  [...PROFILE_FIELDS, "id" as const].map((f) => [f, true])
);

/**
 * When a user signs in to a network where no profile exists, attempt to
 * migrate their profile from the alternative network — but ONLY if the
 * alternative network contains a fully onboarded profile (both teachSkill
 * and learnSkill are set).
 *
 * This enforces strict dataset isolation between mainnet and testnet by
 * default. The sole exception is the one-time profile migration described
 * above. All other data types (swaps, proofs, messages, etc.) remain
 * isolated. This function never overwrites existing data on the current
 * network because it should only be called for newly created users.
 *
 * Uses three strategies in order: twitterId, converted wallet address,
 * stake key hash scan (handles any address format differences).
 *
 * Returns true if skills were found (user is now onboarded).
 */
export async function syncProfileFromOtherNetwork(
  newUserId: string,
  network: ActiveNetwork,
  walletAddress: string | null,
  twitterId: string | null
): Promise<boolean> {
  try {
    const otherNetwork: ActiveNetwork = network === "mainnet" ? "preprod" : "mainnet";
    const otherDb = getPrisma(otherNetwork);

    let otherUser: Record<string, unknown> | null = null;

    // Strategy 1: Twitter users share the same twitterId across networks.
    if (twitterId) {
      otherUser = (await otherDb.user.findFirst({
        where: { twitterId },
        select: PROFILE_SELECT,
      })) as Record<string, unknown> | null;
      console.log(`[sync] twitterId=${twitterId} → ${otherUser ? "found" : "not found"}`);
    }

    // Strategy 2: Converted bech32 wallet address (same key hash, different header/HRP).
    if (!otherUser && walletAddress) {
      const otherAddr = crossNetworkStakeAddr(walletAddress, otherNetwork);
      console.log(`[sync] wallet ${walletAddress.slice(0, 20)}… → converted ${otherAddr?.slice(0, 25) ?? "null"}`);
      if (otherAddr) {
        otherUser = (await otherDb.user.findFirst({
          where: { walletAddress: { equals: otherAddr, mode: "insensitive" } },
          select: PROFILE_SELECT,
        })) as Record<string, unknown> | null;
        console.log(`[sync] converted-addr lookup → ${otherUser ? "found" : "not found"}`);
      }
    }

    // Strategy 3: Stake key hash scan — works even if the stored address format
    // differs (e.g. different network byte, casing, or encoding variant).
    if (!otherUser && walletAddress) {
      const myHash = extractStakeKeyHash(walletAddress);
      if (myHash) {
        const candidates = (await otherDb.user.findMany({
          where: { walletAddress: { not: null } },
          select: PROFILE_SELECT,
        })) as Array<Record<string, unknown>>;
        const match = candidates.find((u) => {
          const addr = u.walletAddress;
          if (typeof addr !== "string") return false;
          return extractStakeKeyHash(addr) === myHash;
        });
        otherUser = match ?? null;
        console.log(`[sync] key-hash scan (${candidates.length} users) → ${otherUser ? "found" : "not found"}`);
      }
    }

    if (!otherUser) {
      console.log(`[sync] no match in ${otherNetwork} DB (wallet=${walletAddress?.slice(0, 20)}, twitterId=${twitterId})`);
      return false;
    }

    // ── Strict dataset isolation ──────────────────────────────────────────
    // Only migrate profile data if the alternative network has a fully
    // onboarded user (both teachSkill AND learnSkill are set). This ensures
    // we never merge partial/incomplete datasets across environments.
    if (!otherUser.teachSkill || !otherUser.learnSkill) {
      console.log(
        `[sync] ${otherNetwork} user found but NOT fully onboarded ` +
        `(teachSkill=${!!otherUser.teachSkill}, learnSkill=${!!otherUser.learnSkill}) — skipping`
      );
      return false;
    }

    // Copy every non-null field. Copy even partial profiles so name/avatar
    // pre-fill on onboarding if skills haven't been set yet.
    const fieldsToCopy = PROFILE_FIELDS.filter(
      (f) => otherUser![f] !== undefined && otherUser![f] !== null && otherUser![f] !== ""
    );
    console.log(`[sync] copying [${fieldsToCopy.join(", ")}] teachSkill=${otherUser.teachSkill ?? "null"}`);

    if (fieldsToCopy.length > 0) {
      const db = getPrisma(network);
      await db.user.update({
        where: { id: newUserId },
        data: Object.fromEntries(fieldsToCopy.map((f) => [f, otherUser![f]])),
      });
    }

    return true;
  } catch (err) {
    console.error(`[sync] failed:`, err);
    return false;
  }
}