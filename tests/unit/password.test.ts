import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("produces an argon2id hash, never stores plain text", async () => {
    const hash = await hashPassword("CorrectHorseBatteryStaple-123");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(hash).not.toContain("CorrectHorseBatteryStaple-123");
  });

  it("verifies a matching password", async () => {
    const hash = await hashPassword("s3cret-pass!");
    expect(await verifyPassword(hash, "s3cret-pass!")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("s3cret-pass!");
    expect(await verifyPassword(hash, "wrong")).toBe(false);
    expect(await verifyPassword(hash, "")).toBe(false);
  });

  it("keeps legacy bcrypt hashes verifiable (backward compat)", async () => {
    const bcrypt = await import("bcryptjs");
    const bcryptHash = await bcrypt.hash("legacyPass!1", 10);
    expect(bcryptHash.startsWith("$2")).toBe(true);
    expect(await verifyPassword(bcryptHash, "legacyPass!1")).toBe(true);
    expect(await verifyPassword(bcryptHash, "wrong")).toBe(false);
  });

  it("returns false for malformed argon2 hash instead of throwing", async () => {
    expect(await verifyPassword("$argon2id$not-a-real-hash", "whatever")).toBe(
      false,
    );
  });

  it("each call produces a unique salted hash for the same password", async () => {
    const a = await hashPassword("same-pass-1");
    const b = await hashPassword("same-pass-1");
    expect(a).not.toBe(b);
    expect(await verifyPassword(a, "same-pass-1")).toBe(true);
    expect(await verifyPassword(b, "same-pass-1")).toBe(true);
  });
});
