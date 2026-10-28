import { describe, it, expect } from "vitest";
import {
  matchPayoutToBank,
  rankCandidates,
  type BankTxnInput,
} from "@/lib/match";

const ARRIVAL = "2026-04-05";

function bank(
  overrides: Partial<BankTxnInput> & Pick<BankTxnInput, "id" | "amountCents" | "date">,
): BankTxnInput {
  return { name: "STRIPE", ...overrides };
}

describe("matchPayoutToBank", () => {
  it("returns matched on exact amount/date", () => {
    const res = matchPayoutToBank(100_000, ARRIVAL, [
      bank({ id: "t1", amountCents: 100_000, date: ARRIVAL }),
    ]);
    expect(res.status).toBe("matched");
    if (res.status === "matched") {
      expect(res.bankTxnId).toBe("t1");
      expect(res.discrepancyRatio).toBe(0);
    }
  });

  it("accepts negative bank amount (money-in)", () => {
    const res = matchPayoutToBank(100_000, ARRIVAL, [
      bank({ id: "t1", amountCents: -100_000, date: ARRIVAL }),
    ]);
    expect(res.status).toBe("matched");
  });

  it("returns no_candidate when date is outside ±3 days", () => {
    const res = matchPayoutToBank(100_000, ARRIVAL, [
      bank({ id: "t1", amountCents: 100_000, date: "2026-04-10" }),
    ]);
    expect(res.status).toBe("review");
    if (res.status === "review") expect(res.reason).toBe("no_candidate");
  });

  it("returns no_candidate when amount differs by more than 1%", () => {
    const res = matchPayoutToBank(100_000, ARRIVAL, [
      bank({ id: "t1", amountCents: 102_000, date: ARRIVAL }),
    ]);
    expect(res.status).toBe("review");
  });

  it("accepts within 1% tolerance", () => {
    const res = matchPayoutToBank(100_000, ARRIVAL, [
      bank({ id: "t1", amountCents: 100_900, date: ARRIVAL }),
    ]);
    expect(res.status).toBe("matched");
  });

  it("returns ambiguous when two candidates tie on score", () => {
    const res = matchPayoutToBank(100_000, ARRIVAL, [
      bank({ id: "t1", amountCents: 100_000, date: ARRIVAL }),
      bank({ id: "t2", amountCents: 100_000, date: ARRIVAL }),
    ]);
    expect(res.status).toBe("review");
    if (res.status === "review") {
      expect(res.reason).toBe("ambiguous");
      expect(res.candidates?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });

  it("tie-breaks by amount delta first, then day delta", () => {
    const res = matchPayoutToBank(100_000, ARRIVAL, [
      bank({ id: "far-closer-amount", amountCents: 100_000, date: "2026-04-07" }),
      bank({ id: "near-off-amount", amountCents: 100_500, date: ARRIVAL }),
    ]);
    expect(res.status).toBe("matched");
    if (res.status === "matched") expect(res.bankTxnId).toBe("far-closer-amount");
  });

  it("never matches on empty bank txns", () => {
    const res = matchPayoutToBank(100_000, ARRIVAL, []);
    expect(res.status).toBe("review");
  });

  it("handles expectedNetCents = 0 gracefully (tolerance floor)", () => {
    const res = matchPayoutToBank(0, ARRIVAL, [
      bank({ id: "t1", amountCents: 0, date: ARRIVAL }),
    ]);
    expect(res.status).toBe("matched");
    if (res.status === "matched") expect(res.discrepancyRatio).toBe(0);
  });
});

describe("rankCandidates", () => {
  it("includes rows within relaxed ±7 days / ±10% window", () => {
    const candidates = rankCandidates(100_000, ARRIVAL, [
      bank({ id: "close", amountCents: 101_000, date: ARRIVAL }),
      bank({ id: "loose", amountCents: 109_000, date: "2026-04-11" }),
      bank({ id: "way-off-amount", amountCents: 200_000, date: ARRIVAL }),
      bank({ id: "way-off-date", amountCents: 100_000, date: "2026-05-01" }),
    ]);
    const ids = candidates.map((c) => c.id);
    expect(ids).toContain("close");
    expect(ids).toContain("loose");
    expect(ids).not.toContain("way-off-amount");
    expect(ids).not.toContain("way-off-date");
  });

  it("limits and sorts by score ascending", () => {
    const list = Array.from({ length: 15 }, (_, i) =>
      bank({
        id: `t${i}`,
        amountCents: 100_000 + i * 10,
        date: ARRIVAL,
      }),
    );
    const candidates = rankCandidates(100_000, ARRIVAL, list, 5);
    expect(candidates).toHaveLength(5);
    const scores = candidates.map((c) => c.score);
    const sorted = [...scores].sort((a, b) => a - b);
    expect(scores).toEqual(sorted);
  });
});
