import { and, eq, notInArray, sql } from "drizzle-orm";
import Stripe from "stripe";
import { getDb, payoutsCache } from "@/db";
import type { DemoLine, DemoPayout } from "@/lib/demo-data";
import { getStripe } from "@/lib/stripe";

export type PayoutCachePayload = {
  version: 1;
  payoutId: string;
  amountCents: number;
  currency: string;
  arrivalDate: string;
  expectedArrivalDate: string;
  status: "paid" | "pending";
  txnCount: number;
  expectedNetCents: number;
  lines: DemoLine[];
};

function unixToYmd(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function lineTypeFromStripe(type: string): DemoLine["type"] {
  if (type.includes("refund")) return "refund";
  if (
    type === "stripe_fee" ||
    type === "stripe_fx_fee" ||
    type.includes("fee")
  ) {
    return "fee";
  }
  return "charge";
}

function mapBalanceTransaction(
  bt: Stripe.BalanceTransaction,
): DemoLine | null {
  if (bt.type === "payout") return null;

  const lineType = lineTypeFromStripe(bt.type);
  let customer = bt.description ?? bt.id;
  const src = bt.source;
  if (typeof src === "object" && src && "object" in src) {
    const obj = src as { object?: string };
    if (obj.object === "charge") {
      const ch = src as Stripe.Charge;
      customer =
        ch.billing_details?.name ||
        ch.receipt_email ||
        ch.description ||
        customer;
    }
  }

  return {
    id: bt.id,
    type: lineType,
    customer,
    amountCents: bt.amount,
    feeCents: bt.fee,
    netCents: bt.net,
  };
}

async function listBalanceTransactionsForPayout(
  stripe: Stripe,
  connectedAccountId: string,
  payoutId: string,
): Promise<Stripe.BalanceTransaction[]> {
  const all: Stripe.BalanceTransaction[] = [];
  let starting_after: string | undefined;

  for (;;) {
    const page = await stripe.balanceTransactions.list(
      {
        payout: payoutId,
        limit: 100,
        starting_after,
        expand: ["data.source"],
      },
      { stripeAccount: connectedAccountId },
    );
    all.push(...page.data);
    if (!page.has_more) break;
    const last = page.data[page.data.length - 1];
    if (!last) break;
    starting_after = last.id;
  }

  return all;
}

function fallbackLines(p: Stripe.Payout): DemoLine[] {
  return [
    {
      id: `${p.id}_net`,
      type: "charge" as const,
      customer: "Payout summary",
      amountCents: p.amount,
      feeCents: 0,
      netCents: p.amount,
    },
  ];
}

export function cachePayloadToDemoPayout(payload: PayoutCachePayload): DemoPayout {
  return {
    id: payload.payoutId,
    amountCents: payload.amountCents,
    currency: payload.currency,
    arrivalDate: payload.arrivalDate,
    expectedArrivalDate: payload.expectedArrivalDate,
    status: payload.status,
    txnCount: payload.txnCount,
    expectedNetCents: payload.expectedNetCents,
    lines: payload.lines,
  };
}

export async function shouldRefreshPayoutCache(
  userId: string,
  maxAgeMs: number,
): Promise<boolean> {
  const db = getDb();
  const row = await db
    .select({
      latest: sql<string | null>`max(${payoutsCache.fetchedAt})`,
    })
    .from(payoutsCache)
    .where(eq(payoutsCache.userId, userId));
  const latest = row[0]?.latest;
  if (!latest) return true;
  return Date.now() - new Date(latest).getTime() > maxAgeMs;
}

/**
 * Fetches up to 30 payouts + balance transactions and upserts `payouts_cache`.
 */
export async function refreshStripePayoutsCache(
  userId: string,
  connectedAccountId: string,
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const list = await stripe.payouts.list(
    { limit: 30 },
    { stripeAccount: connectedAccountId },
  );

  const db = getDb();

  for (const p of list.data) {
    const bts = await listBalanceTransactionsForPayout(
      stripe,
      connectedAccountId,
      p.id,
    );
    const lines = bts
      .map(mapBalanceTransaction)
      .filter((x): x is DemoLine => x !== null);

    const sumNet = bts.reduce((s, bt) => s + bt.net, 0);
    const arrivalTs = p.arrival_date ?? p.created;
    const arrivalDate = unixToYmd(arrivalTs);
    const status: "paid" | "pending" = p.status === "paid" ? "paid" : "pending";

    const payload: PayoutCachePayload = {
      version: 1,
      payoutId: p.id,
      amountCents: p.amount,
      currency: (p.currency || "usd").toUpperCase(),
      arrivalDate,
      expectedArrivalDate: arrivalDate,
      status,
      txnCount: bts.length,
      expectedNetCents: sumNet !== 0 ? sumNet : p.amount,
      lines: lines.length > 0 ? lines : fallbackLines(p),
    };

    await db
      .insert(payoutsCache)
      .values({
        userId,
        payoutId: p.id,
        data: payload,
      })
      .onConflictDoUpdate({
        target: [payoutsCache.userId, payoutsCache.payoutId],
        set: {
          data: sql`excluded.data`,
          fetchedAt: new Date(),
        },
      });
  }

  const fetchedIds = list.data.map((p) => p.id);
  if (fetchedIds.length > 0) {
    await db
      .delete(payoutsCache)
      .where(
        and(
          eq(payoutsCache.userId, userId),
          notInArray(payoutsCache.payoutId, fetchedIds),
        ),
      );
  }
}
