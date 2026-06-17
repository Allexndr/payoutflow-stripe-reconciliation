import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db";
import { runDiscrepancyAlertsForUser } from "@/lib/alerts";
import { syncPlaidTransactionsForUser } from "@/lib/plaid-sync";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const result = await syncPlaidTransactionsForUser(session.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "sync_failed" },
      { status: 400 },
    );
  }

  await runDiscrepancyAlertsForUser(session.user.id);

  return NextResponse.json({ ok: true });
}
