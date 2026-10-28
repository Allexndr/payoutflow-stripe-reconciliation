import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isDatabaseConfigured, users } from "@/db";
import { getPlaidClient } from "@/lib/plaid";
import { runDiscrepancyAlertsForUser } from "@/lib/alerts";
import { syncPlaidTransactionsForUser } from "@/lib/plaid-sync";
import { encryptToken } from "@/lib/token-crypto";

export const runtime = "nodejs";

const bodySchema = z.object({
  public_token: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const client = getPlaidClient();
  if (!client) {
    return NextResponse.json({ error: "Plaid not configured" }, { status: 503 });
  }

  const exchange = await client.itemPublicTokenExchange({
    public_token: parsed.data.public_token,
  });

  const accessToken = encryptToken(exchange.data.access_token);
  const itemId = exchange.data.item_id;

  const db = getDb();
  await db
    .update(users)
    .set({
      plaidAccessToken: accessToken,
      plaidItemId: itemId,
      plaidTxnCursor: null,
    })
    .where(eq(users.id, session.user.id));

  await syncPlaidTransactionsForUser(session.user.id);
  await runDiscrepancyAlertsForUser(session.user.id);

  return NextResponse.json({ ok: true });
}
