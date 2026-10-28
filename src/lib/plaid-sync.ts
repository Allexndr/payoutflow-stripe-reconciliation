import { and, eq, sql } from "drizzle-orm";
import { bankTransactions, getDb, users } from "@/db";
import { getPlaidClient } from "@/lib/plaid";
import { decryptToken } from "@/lib/token-crypto";
import type { Transaction } from "plaid";

function mapTxn(userId: string, t: Transaction) {
  return {
    userId,
    plaidTxnId: t.transaction_id,
    amountCents: Math.round(t.amount * 100),
    txnDate: t.date,
    name: t.merchant_name ?? t.name ?? null,
  };
}

/**
 * Full / incremental Plaid `transactions/sync` into `bank_transactions`.
 */
export async function syncPlaidTransactionsForUser(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.plaidAccessToken) {
    return { ok: false, error: "no_plaid_token" };
  }

  const accessToken = decryptToken(user.plaidAccessToken);

  const client = getPlaidClient();
  if (!client) {
    return { ok: false, error: "plaid_not_configured" };
  }

  let cursor: string | undefined = user.plaidTxnCursor ?? undefined;
  let iterations = 0;

  while (iterations < 50) {
    iterations += 1;
    const axiosRes = await client.transactionsSync({
      access_token: accessToken,
      cursor,
    });

    const data = axiosRes.data;

    for (const t of [...data.added, ...data.modified]) {
      const row = mapTxn(userId, t);
      await db
        .insert(bankTransactions)
        .values(row)
        .onConflictDoUpdate({
          target: [bankTransactions.userId, bankTransactions.plaidTxnId],
          set: {
            amountCents: sql`excluded.amount_cents`,
            txnDate: sql`excluded.txn_date`,
            name: sql`excluded.name`,
          },
        });
    }

    for (const rem of data.removed) {
      await db
        .delete(bankTransactions)
        .where(
          and(
            eq(bankTransactions.userId, userId),
            eq(bankTransactions.plaidTxnId, rem.transaction_id),
          ),
        );
    }

    cursor = data.next_cursor;
    await db
      .update(users)
      .set({ plaidTxnCursor: cursor ?? null })
      .where(eq(users.id, userId));

    if (!data.has_more) break;
  }

  return { ok: true };
}
