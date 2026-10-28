import { and, eq } from "drizzle-orm";
import {
  bankTransactions,
  getDb,
  isDatabaseConfigured,
  payoutsCache,
  users,
} from "@/db";
import { DEMO_BANK_TXNS, DEMO_PAYOUTS, type DemoPayout } from "@/lib/demo-data";
import type { BankTxnInput } from "@/lib/match";
import { matchPayoutToBank } from "@/lib/match";
import { getOverridesMap, type PayoutOverride } from "@/lib/overrides";
import {
  cachePayloadToDemoPayout,
  type PayoutCachePayload,
  refreshStripePayoutsCache,
  shouldRefreshPayoutCache,
} from "@/lib/stripe-payouts";
import { getStripe } from "@/lib/stripe";

export type PayoutRow = {
  id: string;
  amountCents: number;
  currency: string;
  arrivalDate: string;
  expectedArrivalDate: string;
  status: "paid" | "pending";
  txnCount: number;
  expectedNetCents: number;
  matchStatus: "matched" | "review";
  discrepancyPercent: number | null;
  source: "stripe" | "demo";
  /** True when the matched state was confirmed manually by the user. */
  manual: boolean;
};

export type PayoutMatchFilter = "all" | "matched" | "review";

export type ListPayoutOptions = {
  /** Filter table rows; KPI metrics always use full tier-limited set. */
  match?: PayoutMatchFilter;
  page?: number;
  /** Pro/Scale only; Free is always one page of at most 5 rows. */
  pageSize?: number;
  /** Inclusive ISO date YYYY-MM-DD */
  from?: string;
  /** Inclusive ISO date YYYY-MM-DD */
  to?: string;
  /** Minimum arrival amount (cents). */
  minCents?: number;
  /** Maximum arrival amount (cents). */
  maxCents?: number;
  /** Free-text payout id substring (case-insensitive). */
  q?: string;
};

export type PayoutDashboardMetrics = {
  matchedCount: number;
  reviewCount: number;
  reconciledCents: number;
  /** Average |discrepancy %| over matched rows, 0–1 scale for formatPercent */
  avgDiscrepancyRatio: number | null;
};

export type ListPayoutResult = {
  rows: PayoutRow[];
  /** Rows after match filter (for current page view). */
  total: number;
  page: number;
  pageSize: number;
  metrics: PayoutDashboardMetrics;
  /** Payout rows visible for tier before match filter (for empty-filter UX). */
  tierRowCount: number;
};

const DEFAULT_PAGE_SIZE_PRO = 20;

async function getUser(userId: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  return (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];
}

function demoBankInputs(): BankTxnInput[] {
  return DEMO_BANK_TXNS.map((t) => ({
    id: t.id,
    amountCents: t.amountCents,
    date: t.date,
    name: t.name,
  }));
}

function ymdFromDb(d: string | Date): string {
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Plaid-synced bank rows only (no demo mix-in for live Stripe accounts). */
export async function getBankTxnInputsForUser(
  userId: string,
): Promise<BankTxnInput[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(bankTransactions)
    .where(eq(bankTransactions.userId, userId));
  return rows.map((r) => ({
    id: r.plaidTxnId,
    amountCents: r.amountCents,
    date: ymdFromDb(r.txnDate as string | Date),
    name: r.name,
  }));
}

function matchToRow(
  p: {
    id: string;
    amountCents: number;
    currency: string;
    arrivalDate: string;
    expectedArrivalDate: string;
    status: "paid" | "pending";
    txnCount: number;
    expectedNetCents: number;
  },
  bank: BankTxnInput[],
  source: "stripe" | "demo",
  override: PayoutOverride | undefined,
): PayoutRow {
  if (override) {
    const txn = bank.find((b) => b.id === override.bankTxnId);
    const actualMag = txn ? Math.abs(txn.amountCents) : p.expectedNetCents;
    const discrepancy =
      p.expectedNetCents !== 0
        ? Math.abs((actualMag - p.expectedNetCents) / p.expectedNetCents) * 100
        : 0;
    return {
      id: p.id,
      amountCents: p.amountCents,
      currency: p.currency,
      arrivalDate: p.arrivalDate,
      expectedArrivalDate: p.expectedArrivalDate,
      status: p.status,
      txnCount: p.txnCount,
      expectedNetCents: p.expectedNetCents,
      matchStatus: "matched",
      discrepancyPercent: discrepancy,
      source,
      manual: true,
    };
  }

  const m = matchPayoutToBank(p.expectedNetCents, p.arrivalDate, bank);
  const matchStatus = m.status === "matched" ? "matched" : "review";
  const discrepancyPercent =
    m.status === "matched" ? Math.abs(m.discrepancyRatio * 100) : null;

  return {
    id: p.id,
    amountCents: p.amountCents,
    currency: p.currency,
    arrivalDate: p.arrivalDate,
    expectedArrivalDate: p.expectedArrivalDate,
    status: p.status,
    txnCount: p.txnCount,
    expectedNetCents: p.expectedNetCents,
    matchStatus,
    discrepancyPercent,
    source,
    manual: false,
  };
}

/** Free: last 5 payouts by arrival date; Pro/Scale: all (up to cache limit). */
function applyFreeTierLimit(
  rows: PayoutRow[],
  subTier: string | undefined,
): PayoutRow[] {
  const sorted = [...rows].sort((a, b) =>
    b.arrivalDate.localeCompare(a.arrivalDate),
  );
  if (subTier === "pro" || subTier === "scale") return sorted;
  return sorted.slice(0, 5);
}

function computeMetrics(rows: PayoutRow[]): PayoutDashboardMetrics {
  const matched = rows.filter((r) => r.matchStatus === "matched");
  const reviewCount = rows.filter((r) => r.matchStatus === "review").length;
  const reconciledCents = matched.reduce((s, r) => s + r.amountCents, 0);
  const avgDisc =
    matched.length > 0
      ? matched.reduce((s, r) => s + (r.discrepancyPercent ?? 0), 0) /
        matched.length /
        100
      : null;
  return {
    matchedCount: matched.length,
    reviewCount,
    reconciledCents,
    avgDiscrepancyRatio: avgDisc,
  };
}

async function loadStripeCachePayloads(
  userId: string,
): Promise<PayoutCachePayload[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(payoutsCache)
    .where(eq(payoutsCache.userId, userId));
  const payloads = rows.map((r) => r.data as PayoutCachePayload);
  return payloads.sort((a, b) => b.arrivalDate.localeCompare(a.arrivalDate));
}

/**
 * All payout rows visible for this user after Free-tier cap (5) or full list (Pro/Scale).
 * Used by alerts and CSV export of the full visible set.
 */
export async function getTierLimitedPayoutRows(
  userId: string,
): Promise<PayoutRow[]> {
  const user = await getUser(userId);
  const stripeReady = Boolean(user?.stripeAccountId && getStripe());

  const overrides = await getOverridesMap(userId);

  if (!stripeReady) {
    const rows = DEMO_PAYOUTS.map((p) =>
      matchToRow(p, demoBankInputs(), "demo", overrides.get(p.id)),
    );
    return applyFreeTierLimit(rows, user?.subTier ?? "free");
  }

  try {
    if (await shouldRefreshPayoutCache(userId, 120_000)) {
      await refreshStripePayoutsCache(userId, user!.stripeAccountId!);
    }
  } catch (e) {
    console.error("[payouts] Stripe refresh failed:", e);
  }

  const payloads = await loadStripeCachePayloads(userId);
  const bank = await getBankTxnInputsForUser(userId);

  if (payloads.length === 0) {
    return [];
  }

  const rows = payloads.map((payload) =>
    matchToRow(
      {
        id: payload.payoutId,
        amountCents: payload.amountCents,
        currency: payload.currency,
        arrivalDate: payload.arrivalDate,
        expectedArrivalDate: payload.expectedArrivalDate,
        status: payload.status,
        txnCount: payload.txnCount,
        expectedNetCents: payload.expectedNetCents,
      },
      bank,
      "stripe",
      overrides.get(payload.payoutId),
    ),
  );
  return applyFreeTierLimit(rows, user?.subTier ?? "free");
}

function applyRowFilters(
  rows: PayoutRow[],
  options: ListPayoutOptions | undefined,
): PayoutRow[] {
  let out = rows;
  const match = options?.match ?? "all";
  if (match !== "all") out = out.filter((r) => r.matchStatus === match);
  if (options?.from) out = out.filter((r) => r.arrivalDate >= options.from!);
  if (options?.to) out = out.filter((r) => r.arrivalDate <= options.to!);
  if (typeof options?.minCents === "number") {
    out = out.filter((r) => r.amountCents >= options.minCents!);
  }
  if (typeof options?.maxCents === "number") {
    out = out.filter((r) => r.amountCents <= options.maxCents!);
  }
  if (options?.q) {
    const q = options.q.toLowerCase();
    out = out.filter((r) => r.id.toLowerCase().includes(q));
  }
  return out;
}

/**
 * Dashboard: tier-limited rows, optional match filter, pagination (Pro/Scale).
 * KPI `metrics` are computed from the full tier-limited set (ignores filters).
 */
export async function listPayoutRowsForUser(
  userId: string,
  options?: ListPayoutOptions,
): Promise<ListPayoutResult> {
  const user = await getUser(userId);
  const tierRows = await getTierLimitedPayoutRows(userId);
  const metrics = computeMetrics(tierRows);

  const filtered = applyRowFilters(tierRows, options);
  const total = filtered.length;

  const isPaid =
    user?.subTier === "pro" || user?.subTier === "scale";
  const pageSize = isPaid
    ? Math.min(100, Math.max(5, options?.pageSize ?? DEFAULT_PAGE_SIZE_PRO))
    : Math.min(5, total || 1);

  const page = Math.max(1, options?.page ?? 1);
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, maxPage);
  const start = (safePage - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize);

  return {
    rows,
    total,
    page: safePage,
    pageSize,
    metrics,
    tierRowCount: tierRows.length,
  };
}

export async function getPayoutDetail(
  userId: string,
  payoutId: string,
): Promise<DemoPayout | null> {
  if (payoutId.startsWith("po_demo_")) {
    return DEMO_PAYOUTS.find((p) => p.id === payoutId) ?? null;
  }

  if (!isDatabaseConfigured()) return null;

  const db = getDb();
  const row = (
    await db
      .select()
      .from(payoutsCache)
      .where(
        and(
          eq(payoutsCache.userId, userId),
          eq(payoutsCache.payoutId, payoutId),
        ),
      )
      .limit(1)
  )[0];

  const data = row?.data as PayoutCachePayload | undefined;
  if (!data) return null;
  return cachePayloadToDemoPayout(data);
}
