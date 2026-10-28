import { auth } from "@/auth";
import { and, eq, like } from "drizzle-orm";
import { NextResponse } from "next/server";
import { bankTransactions, getDb, isDatabaseConfigured } from "@/db";
import { runDiscrepancyAlertsForUser } from "@/lib/alerts";
import { parseBankCsv } from "@/lib/parse-bank-csv";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 2 MB)" },
      { status: 400 },
    );
  }

  const text = await file.text();
  const parsed = parseBankCsv(text);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const db = getDb();
  const userId = session.user.id;

  await db
    .delete(bankTransactions)
    .where(
      and(
        eq(bankTransactions.userId, userId),
        like(bankTransactions.plaidTxnId, "csv:%"),
      ),
    );

  for (const row of parsed.rows) {
    await db.insert(bankTransactions).values({
      userId,
      plaidTxnId: row.plaidTxnId,
      amountCents: row.amountCents,
      txnDate: row.txnDate,
      name: row.name,
    });
  }

  await runDiscrepancyAlertsForUser(userId);

  return NextResponse.json({ ok: true, imported: parsed.rows.length });
}
