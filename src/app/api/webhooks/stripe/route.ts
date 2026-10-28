import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getDb, isDatabaseConfigured, stripeWebhookEvents, users } from "@/db";
import { runDiscrepancyAlertsForUser } from "@/lib/alerts";
import {
  handleCheckoutSessionCompleted,
  syncUserFromSubscription,
} from "@/lib/billing";
import { refreshStripePayoutsCache } from "@/lib/stripe-payouts";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whSecret) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (isDatabaseConfigured()) {
    const db = getDb();
    const inserted = await db
      .insert(stripeWebhookEvents)
      .values({ eventId: event.id })
      .onConflictDoNothing()
      .returning({ id: stripeWebhookEvents.id });

    if (inserted.length === 0) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  try {
    await dispatchStripeEvent(event);
  } catch (e) {
    console.error("[webhook] handler error:", e);
  }

  return NextResponse.json({ received: true });
}

async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutSessionCompleted(session);
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncUserFromSubscription(sub);
      break;
    }
    case "payout.paid":
    case "payout.created":
    case "payout.updated": {
      const account =
        typeof event.account === "string" ? event.account : undefined;
      if (!account) break;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeAccountId, account))
        .limit(1);
      if (!user) break;

      try {
        await refreshStripePayoutsCache(user.id, account);
        await runDiscrepancyAlertsForUser(user.id);
      } catch (e) {
        console.error("[webhook] payout refresh failed:", e);
      }
      break;
    }
    default:
      break;
  }
}
