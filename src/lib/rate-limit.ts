import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Auth endpoints: 20 requests / minute per IP (sign-in, callbacks, register).
 * Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (free tier) for production.
 * Without Upstash, a minimal in-memory limiter applies (best-effort on serverless).
 */

const WINDOW_MS = 60_000;
const MAX = 20;

type Bucket = { count: number; reset: number };
const memory = new Map<string, Bucket>();

function memoryLimit(identifier: string): { success: boolean } {
  const now = Date.now();
  const b = memory.get(identifier);
  if (!b || now > b.reset) {
    memory.set(identifier, { count: 1, reset: now + WINDOW_MS });
    return { success: true };
  }
  if (b.count >= MAX) return { success: false };
  b.count += 1;
  return { success: true };
}

let edgeRatelimit: Ratelimit | null = null;

function getEdgeRatelimit(): Ratelimit | null {
  if (edgeRatelimit) return edgeRatelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  edgeRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX, "1 m"),
    analytics: true,
    prefix: "payoutflow:auth",
  });
  return edgeRatelimit;
}

export async function limitAuthRequest(
  identifier: string,
): Promise<{ success: boolean }> {
  const rl = getEdgeRatelimit();
  if (rl) {
    const res = await rl.limit(identifier);
    return { success: res.success };
  }
  return memoryLimit(identifier);
}
