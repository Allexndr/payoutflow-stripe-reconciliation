import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { getDb, users } from "@/db";
import { getStripe } from "@/lib/stripe";

export type BillingTier = "free" | "pro" | "scale";

export function tierFromStripePriceId(priceId: string | undefined): BillingTier {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  if (priceId === process.env.STRIPE_PRICE_SCALE) return "scale";
  return "pro";
}

export async function syncUserFromSubscription(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) {
    console.warn(
      "[billing] No user for customer",
      customerId,
      subscription.id,
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const paid =
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "past_due";
  const tier: BillingTier = paid ? tierFromStripePriceId(priceId) : "free";

  await db
    .update(users)
    .set({
      stripeSubscriptionId:
        subscription.status === "canceled" ? null : subscription.id,
      subTier: tier,
    })
    .where(eq(users.id, user.id));
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.mode !== "subscription") return;
  const userId = session.metadata?.userId;
  if (!userId) return;

  const stripe = getStripe();
  if (!stripe) return;

  const customerId = session.customer as string;
  const subId = session.subscription as string;
  if (!customerId || !subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  const priceId = sub.items.data[0]?.price.id;
  const tier = tierFromStripePriceId(priceId);

  const db = getDb();
  await db
    .update(users)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subId,
      subTier: tier,
    })
    .where(eq(users.id, userId));
}
