import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { limitAuthRequest } from "@/lib/rate-limit";

describe("limitAuthRequest (in-memory fallback)", () => {
  const ORIGINAL = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (ORIGINAL.UPSTASH_REDIS_REST_URL !== undefined)
      process.env.UPSTASH_REDIS_REST_URL = ORIGINAL.UPSTASH_REDIS_REST_URL;
    if (ORIGINAL.UPSTASH_REDIS_REST_TOKEN !== undefined)
      process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows up to 20 requests per identifier in a minute, blocks the 21st", async () => {
    const key = `test-${Date.now()}-${Math.random()}`;
    const results: boolean[] = [];
    for (let i = 0; i < 22; i++) {
      results.push((await limitAuthRequest(key)).success);
    }
    const allowed = results.filter(Boolean).length;
    const blocked = results.length - allowed;
    expect(allowed).toBe(20);
    expect(blocked).toBe(2);
  });

  it("buckets are independent per identifier", async () => {
    const a = `a-${Date.now()}`;
    const b = `b-${Date.now()}`;
    for (let i = 0; i < 20; i++) await limitAuthRequest(a);
    expect((await limitAuthRequest(a)).success).toBe(false);
    expect((await limitAuthRequest(b)).success).toBe(true);
  });
});
