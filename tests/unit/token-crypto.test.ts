import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptToken, decryptToken } from "@/lib/token-crypto";

const ENV_KEY = "TOKEN_ENCRYPTION_KEY";

describe("token-crypto", () => {
  let original: string | undefined;

  beforeEach(() => {
    original = process.env[ENV_KEY];
    process.env[ENV_KEY] = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    if (original === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = original;
  });

  it("encrypts and decrypts round-trip", () => {
    const plain = "access-sandbox-abcd1234";
    const enc = encryptToken(plain);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc).not.toContain(plain);
    expect(decryptToken(enc)).toBe(plain);
  });

  it("produces a different ciphertext each call (fresh IV)", () => {
    const a = encryptToken("same-plain");
    const b = encryptToken("same-plain");
    expect(a).not.toBe(b);
  });

  it("treats legacy plaintext (no v1: prefix) as-is", () => {
    expect(decryptToken("legacy-plain-token")).toBe("legacy-plain-token");
  });

  it("does not throw on tampered payloads", () => {
    const enc = encryptToken("sensitive");
    /** Flip the last byte to break the GCM auth tag. */
    const tampered =
      enc.slice(0, -2) + (enc.slice(-2) === "AA" ? "AB" : "AA");
    const result = decryptToken(tampered);
    expect(result).not.toBe("sensitive");
  });

  it("falls back to plaintext mode when key is missing", () => {
    delete process.env[ENV_KEY];
    const out = encryptToken("no-key-mode");
    expect(out).toBe("no-key-mode");
    expect(decryptToken("no-key-mode")).toBe("no-key-mode");
  });
});
