import { describe, it, expect } from "vitest";
import { parseBankCsv } from "@/lib/parse-bank-csv";

describe("parseBankCsv", () => {
  it("parses a simple ISO date + amount CSV", () => {
    const csv = [
      "Date,Amount,Description",
      "2026-04-05,1234.56,STRIPE TRANSFER",
      "2026-04-02,89.00,Coffee",
    ].join("\n");
    const res = parseBankCsv(csv);
    expect(res.error).toBeUndefined();
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0]!.txnDate).toBe("2026-04-05");
    expect(res.rows[0]!.amountCents).toBe(123456);
    expect(res.rows[0]!.name).toBe("STRIPE TRANSFER");
    expect(res.rows[0]!.plaidTxnId.startsWith("csv:")).toBe(true);
  });

  it("supports US M/D/YY dates and parenthesized negative amounts", () => {
    const csv = [
      "Posting Date,Transaction Amount,Memo",
      '04/05/26,"(1,234.56)",Refund',
    ].join("\n");
    const res = parseBankCsv(csv);
    expect(res.rows[0]!.txnDate).toBe("2026-04-05");
    expect(res.rows[0]!.amountCents).toBe(-123456);
  });

  it("rejects files with missing required columns", () => {
    const csv = "foo,bar\n1,2";
    const res = parseBankCsv(csv);
    expect(res.rows).toHaveLength(0);
    expect(res.error).toMatch(/Date and Amount/);
  });

  it("skips malformed rows but keeps valid ones", () => {
    const csv = [
      "Date,Amount",
      "not-a-date,10.00",
      "2026-04-05,abc",
      "2026-04-06,9.99",
    ].join("\n");
    const res = parseBankCsv(csv);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]!.txnDate).toBe("2026-04-06");
  });

  it("does not execute formulas or crash on CSV injection payload", () => {
    // Classic CSV-injection strings must be treated as plain text, never interpreted.
    const csv = [
      "Date,Amount,Description",
      '2026-04-05,10.00,"=cmd|\' /C calc\'!A0"',
      '2026-04-05,10.00,"@SUM(A1:A9)"',
      '2026-04-05,10.00,"+1+1"',
    ].join("\n");
    const res = parseBankCsv(csv);
    expect(res.rows).toHaveLength(3);
    for (const row of res.rows) {
      expect(typeof row.name).toBe("string");
      expect(row.name!.length).toBeGreaterThan(0);
    }
  });

  it("tolerates very large input without timing out", () => {
    const header = "Date,Amount,Description";
    const line = "2026-04-05,1.00,stripe";
    const csv = [header, ...Array.from({ length: 5_000 }, () => line)].join("\n");
    const t0 = Date.now();
    const res = parseBankCsv(csv);
    const elapsed = Date.now() - t0;
    expect(res.rows).toHaveLength(5_000);
    expect(elapsed).toBeLessThan(3_000);
  });
});
