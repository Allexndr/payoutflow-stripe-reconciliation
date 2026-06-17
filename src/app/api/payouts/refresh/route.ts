import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured, users } from "@/db";
import { runDiscrepancyAlertsForUser } from "@/lib/alerts";
import { refreshStripePayoutsCache } from "@/lib/stripe-payouts";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.stripeAccountId) {
    return NextResponse.json(
      { error: "Connect Stripe in Settings first." },
      { status: 400 },
    );
  }

  try {
    await refreshStripePayoutsCache(session.user.id, user.stripeAccountId);
    await runDiscrepancyAlertsForUser(session.user.id);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Stripe request failed. Check keys and account access." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
