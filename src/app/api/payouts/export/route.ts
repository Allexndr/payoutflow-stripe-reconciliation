import { auth } from "@/auth";
import {
  getTierLimitedPayoutRows,
  type PayoutMatchFilter,
} from "@/lib/payouts-service";
import { NextResponse } from "next/server";

function parseMatch(raw: string | null): PayoutMatchFilter {
  if (raw === "matched" || raw === "review") return raw;
  return "all";
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function parseAmount(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const match = parseMatch(searchParams.get("match"));
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));
  const minCents = parseAmount(searchParams.get("min"));
  const maxCents = parseAmount(searchParams.get("max"));
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  let rows = await getTierLimitedPayoutRows(session.user.id);
  if (match !== "all") rows = rows.filter((r) => r.matchStatus === match);
  if (from) rows = rows.filter((r) => r.arrivalDate >= from);
  if (to) rows = rows.filter((r) => r.arrivalDate <= to);
  if (minCents != null) rows = rows.filter((r) => r.amountCents >= minCents);
  if (maxCents != null) rows = rows.filter((r) => r.amountCents <= maxCents);
  if (q) rows = rows.filter((r) => r.id.toLowerCase().includes(q));

  const header =
    "payout_id,amount_cents,currency,arrival_date,expected_arrival,txn_count,match_status,discrepancy_pct,manual\n";
  const lines = rows.map((r) =>
    [
      r.id,
      r.amountCents,
      r.currency,
      r.arrivalDate,
      r.expectedArrivalDate,
      r.txnCount,
      r.matchStatus,
      r.discrepancyPercent?.toFixed(2) ?? "",
      r.manual ? "1" : "0",
    ].join(","),
  );
  const csv = header + lines.join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="payoutflow-payouts.csv"',
    },
  });
}
