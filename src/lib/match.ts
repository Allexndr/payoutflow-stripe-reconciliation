/**
 * Canonical match rules (see docs/TZ.md §1.3):
 * - Date window: ±3 calendar days from payout arrival (UTC midnight boundaries simplified to date strings)
 * - Amount: ±1% of expected net (in cents)
 * - Tie-break: smallest |Δamount|, then smallest |Δdays|
 */

export type BankTxnInput = {
  id: string;
  amountCents: number;
  date: string; // YYYY-MM-DD
  name?: string | null;
};

export type MatchResult =
  | {
      status: "matched";
      bankTxnId: string;
      discrepancyRatio: number;
      expectedCents: number;
      actualCents: number;
    }
  | {
      status: "review";
      reason: "no_candidate" | "ambiguous";
      expectedCents: number;
      candidates?: { id: string; score: number }[];
    };

function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}

export type ScoredCandidate = {
  id: string;
  amountCents: number;
  date: string;
  name?: string | null;
  daysDiff: number;
  amountDiffCents: number;
  /** Lower is better. */
  score: number;
};

/**
 * Returns top-N bank transactions within a relaxed window, scored.
 * Used by the payout detail UI so a human can pick manually.
 * Window is a bit wider than {@link matchPayoutToBank} to aid edge cases.
 */
export function rankCandidates(
  expectedNetCents: number,
  arrivalDateIso: string,
  bankTxns: BankTxnInput[],
  limit = 8,
): ScoredCandidate[] {
  const arrival = parseYmd(arrivalDateIso.slice(0, 10));
  const scored: ScoredCandidate[] = [];
  for (const t of bankTxns) {
    const d = parseYmd(t.date);
    const days = Math.abs(dayDiff(d, arrival));
    if (days > 7) continue;
    const bankMag = Math.abs(t.amountCents);
    const amountDiff = Math.abs(bankMag - expectedNetCents);
    /** Include candidates within 10% for manual review. */
    if (amountDiff > Math.max(1000, Math.abs(expectedNetCents) * 0.1)) continue;
    scored.push({
      id: t.id,
      amountCents: t.amountCents,
      date: t.date,
      name: t.name ?? null,
      daysDiff: days,
      amountDiffCents: amountDiff,
      score: amountDiff * 1000 + days,
    });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit);
}

export function matchPayoutToBank(
  expectedNetCents: number,
  arrivalDateIso: string,
  bankTxns: BankTxnInput[],
): MatchResult {
  const arrival = parseYmd(arrivalDateIso.slice(0, 10));
  const tol = Math.max(1, Math.round(Math.abs(expectedNetCents) * 0.01));

  type Scored = {
    txn: BankTxnInput;
    amountDiff: number;
    days: number;
    score: number;
  };

  const scored: Scored[] = [];

  for (const txn of bankTxns) {
    const d = parseYmd(txn.date);
    const days = Math.abs(dayDiff(d, arrival));
    if (days > 3) continue;
    /** Plaid: negative = money in; we match on absolute magnitude */
    const bankMag = Math.abs(txn.amountCents);
    const amountDiff = Math.abs(bankMag - expectedNetCents);
    if (amountDiff > tol) continue;
    const score = amountDiff * 1000 + days;
    scored.push({ txn, amountDiff, days, score });
  }

  if (scored.length === 0) {
    return {
      status: "review",
      reason: "no_candidate",
      expectedCents: expectedNetCents,
    };
  }

  scored.sort((a, b) => a.score - b.score);
  const best = scored[0]!;
  const second = scored[1];

  if (second && second.score === best.score) {
    return {
      status: "review",
      reason: "ambiguous",
      expectedCents: expectedNetCents,
      candidates: scored.slice(0, 3).map((s) => ({
        id: s.txn.id,
        score: s.score,
      })),
    };
  }

  const actualMag = Math.abs(best.txn.amountCents);
  const discrepancyRatio =
    expectedNetCents === 0
      ? 0
      : Math.abs(actualMag - expectedNetCents) / Math.abs(expectedNetCents);

  return {
    status: "matched",
    bankTxnId: best.txn.id,
    discrepancyRatio,
    expectedCents: expectedNetCents,
    actualCents: actualMag,
  };
}
