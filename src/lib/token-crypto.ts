import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const PREFIX = "v1:";
const ALGO = "aes-256-gcm";
const IV_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;

function getKeyBytes(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw?.trim()) return null;
  const buf = Buffer.from(raw.trim(), "base64");
  if (buf.length === KEY_LEN) return buf;
  return scryptSync(raw, "payoutflow-salt", KEY_LEN);
}

export function encryptToken(plain: string): string {
  const key = getKeyBytes();
  if (!key) return plain;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64url");
}

/**
 * Decrypts Plaid access token, or returns legacy plaintext when not prefixed with `v1:`.
 */
export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }
  const key = getKeyBytes();
  if (!key) {
    console.warn(
      "[token-crypto] Encrypted token in DB but TOKEN_ENCRYPTION_KEY is not set",
    );
    return stored;
  }
  const raw = stored.slice(PREFIX.length);
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64url");
  } catch {
    return stored;
  }
  if (buf.length < IV_LEN + TAG_LEN + 1) return stored;
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  try {
    const dec = createDecipheriv(ALGO, key, iv);
    dec.setAuthTag(tag);
    return Buffer.concat([dec.update(data), dec.final()]).toString("utf8");
  } catch {
    return stored;
  }
}
