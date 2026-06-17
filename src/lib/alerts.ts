import { and, eq } from "drizzle-orm";
import { discrepancyAlerts, getDb, users } from "@/db";
import { sendDiscrepancyAlertEmail } from "@/lib/email";
import { getTierLimitedPayoutRows } from "@/lib/payouts-service";

const THRESHOLD_PCT = 5;

/**
 * Pro / Scale: email once per payout when matched discrepancy exceeds threshold.
 */
export async function runDiscrepancyAlertsForUser(userId: string): Promise<void> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.email) return;
  if (user.subTier !== "pro" && user.subTier !== "scale") return;

  const rows = await getTierLimitedPayoutRows(userId);

  for (const row of rows) {
    if (row.discrepancyPercent == null || row.discrepancyPercent <= THRESHOLD_PCT) {
      continue;
    }

    const existing = (
      await db
        .select()
        .from(discrepancyAlerts)
        .where(
          and(
            eq(discrepancyAlerts.userId, userId),
            eq(discrepancyAlerts.payoutId, row.id),
          ),
        )
        .limit(1)
    )[0];
    if (existing) continue;

    const sent = await sendDiscrepancyAlertEmail(
      user.email,
      row.id,
      row.discrepancyPercent,
    );
    if (sent) {
      await db.insert(discrepancyAlerts).values({ userId, payoutId: row.id });
    }
  }
}
