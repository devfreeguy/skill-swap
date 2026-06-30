import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

/**
 * End-to-end encryption for swap messages.
 *
 * Keys are derived deterministically from a wallet signature (Cardano Ed25519
 * signatures are deterministic), so the same keypair is reproducible on any
 * device the user connects the wallet to - no stored secret, no passphrase.
 * The private key never leaves the browser; the server only stores ciphertext.
 *
 * NaCl `box` uses a Curve25519 ECDH shared secret that is identical for both
 * participants, so a single pair encrypts AND decrypts in both directions:
 * always use (partnerPublicKey, mySecretKey). That also lets a sender read
 * back their own messages.
 */

export type E2EKeyPair = {
  publicKey: string; // base64
  secretKey: Uint8Array;
};

const DERIVE_MESSAGE = "SkillSwap E2E messaging key v1";

let cached: E2EKeyPair | null = null;

const toB64 = (b: Uint8Array) => naclUtil.encodeBase64(b);
const fromB64 = (s: string) => naclUtil.decodeBase64(s);

function utf8ToHex(s: string): string {
  return Array.from(naclUtil.decodeUTF8(s))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveSeed(walletName: string): Promise<Uint8Array> {
  const { BrowserWallet } = await import("@meshsdk/core");
  const wallet = await BrowserWallet.enable(walletName);
  const used = await wallet.getUsedAddresses();
  const address = used[0] ?? (await wallet.getChangeAddress());
  const sig = await wallet.signData(address, utf8ToHex(DERIVE_MESSAGE));
  // Deterministic signature → sha512 → first 32 bytes seed the box keypair.
  const hash = nacl.hash(naclUtil.decodeUTF8(sig.signature));
  return hash.slice(0, 32);
}

/**
 * Derive (once per session) the user's messaging keypair and publish the public
 * key so partners can encrypt to them. Cached in memory after first derive.
 */
export async function getMyKeyPair(walletName: string): Promise<E2EKeyPair> {
  if (cached) return cached;
  const seed = await deriveSeed(walletName);
  const kp = nacl.box.keyPair.fromSecretKey(seed);
  cached = { publicKey: toB64(kp.publicKey), secretKey: kp.secretKey };

  // Best-effort publish; not fatal if it fails.
  fetch("/api/users/public-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicKey: cached.publicKey }),
  }).catch(() => {});

  return cached;
}

export function encryptMessage(
  plaintext: string,
  partnerPublicKey: string,
  myKeyPair: E2EKeyPair
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const box = nacl.box(
    naclUtil.decodeUTF8(plaintext),
    nonce,
    fromB64(partnerPublicKey),
    myKeyPair.secretKey
  );
  return { ciphertext: toB64(box), nonce: toB64(nonce) };
}

export function decryptMessage(
  ciphertext: string,
  nonce: string,
  partnerPublicKey: string,
  myKeyPair: E2EKeyPair
): string | null {
  try {
    const opened = nacl.box.open(
      fromB64(ciphertext),
      fromB64(nonce),
      fromB64(partnerPublicKey),
      myKeyPair.secretKey
    );
    return opened ? naclUtil.encodeUTF8(opened) : null;
  } catch {
    return null;
  }
}
