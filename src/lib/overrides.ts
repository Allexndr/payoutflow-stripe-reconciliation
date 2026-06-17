import { and, eq, inArray } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  payoutComments,
  payoutEvents,
  payoutMatches,
} from "@/db";

export type PayoutOverride = {
  payoutId: string;
  bankTxnId: string;
  note: string | null;
  createdAt: Date;
};

export type PayoutComment = {
  id: string;
  body: string;
  createdAt: Date;
};

export type PayoutEvent = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  meta: unknown;
  createdAt: Date;
};

/**
 * Return map from payoutId -> manual override for the given user.
 * Empty map if DB is not configured or there are no overrides.
 */
export async function getOverridesMap(
  userId: string,
  payoutIds?: string[],
): Promise<Map<string, PayoutOverride>> {
  const result = new Map<string, PayoutOverride>();
  if (!isDatabaseConfigured()) return result;
  const db = getDb();

  const rows = await (payoutIds && payoutIds.length > 0
    ? db
        .select()
        .from(payoutMatches)
        .where(
          and(
            eq(payoutMatches.userId, userId),
            inArray(payoutMatches.payoutId, payoutIds),
          ),
        )
    : db.select().from(payoutMatches).where(eq(payoutMatches.userId, userId)));

  for (const r of rows) {
    result.set(r.payoutId, {
      payoutId: r.payoutId,
      bankTxnId: r.bankTxnId,
      note: r.note,
      createdAt: r.createdAt,
    });
  }
  return result;
}

export async function getOverride(
  userId: string,
  payoutId: string,
): Promise<PayoutOverride | null> {
  const map = await getOverridesMap(userId, [payoutId]);
  return map.get(payoutId) ?? null;
}

export async function setOverride(
  userId: string,
  payoutId: string,
  bankTxnId: string,
  note: string | null,
): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured");
  }
  const db = getDb();
  await db
    .insert(payoutMatches)
    .values({ userId, payoutId, bankTxnId, note })
    .onConflictDoUpdate({
      target: [payoutMatches.userId, payoutMatches.payoutId],
      set: { bankTxnId, note, createdAt: new Date() },
    });
  await recordEvent(userId, {
    entity: "payout",
    entityId: payoutId,
    action: "match.confirmed",
    meta: { bankTxnId, note: note ?? null },
  });
}

export async function clearOverride(
  userId: string,
  payoutId: string,
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  await db
    .delete(payoutMatches)
    .where(
      and(
        eq(payoutMatches.userId, userId),
        eq(payoutMatches.payoutId, payoutId),
      ),
    );
  await recordEvent(userId, {
    entity: "payout",
    entityId: payoutId,
    action: "match.cleared",
    meta: null,
  });
}

export async function listComments(
  userId: string,
  payoutId: string,
): Promise<PayoutComment[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select()
    .from(payoutComments)
    .where(
      and(
        eq(payoutComments.userId, userId),
        eq(payoutComments.payoutId, payoutId),
      ),
    );
  return rows
    .map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.createdAt,
    }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function addComment(
  userId: string,
  payoutId: string,
  body: string,
): Promise<PayoutComment> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured");
  }
  const db = getDb();
  const [inserted] = await db
    .insert(payoutComments)
    .values({ userId, payoutId, body })
    .returning();
  await recordEvent(userId, {
    entity: "payout",
    entityId: payoutId,
    action: "comment.added",
    meta: { commentId: inserted!.id },
  });
  return {
    id: inserted!.id,
    body: inserted!.body,
    createdAt: inserted!.createdAt,
  };
}

export async function recordEvent(
  userId: string,
  event: {
    entity: string;
    entityId: string;
    action: string;
    meta: unknown;
  },
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  try {
    await db.insert(payoutEvents).values({
      userId,
      entity: event.entity,
      entityId: event.entityId,
      action: event.action,
      meta: event.meta as never,
    });
  } catch (e) {
    console.error("[audit] record failed", e);
  }
}

export async function listEvents(
  userId: string,
  opts: { entity?: string; entityId?: string; limit?: number } = {},
): Promise<PayoutEvent[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const conds = [eq(payoutEvents.userId, userId)];
  if (opts.entity) conds.push(eq(payoutEvents.entity, opts.entity));
  if (opts.entityId) conds.push(eq(payoutEvents.entityId, opts.entityId));
  const rows = await db
    .select()
    .from(payoutEvents)
    .where(and(...conds));
  return rows
    .map((r) => ({
      id: r.id,
      entity: r.entity,
      entityId: r.entityId,
      action: r.action,
      meta: r.meta as unknown,
      createdAt: r.createdAt,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, opts.limit ?? 100);
}
