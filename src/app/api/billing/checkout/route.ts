import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, isDatabaseConfigured, users } from "@/db";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const bodySchema = z.object({
  tier: z.enum(["pro", "scale"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
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

  const priceId =
    parsed.data.tier === "pro"
      ? process.env.STRIPE_PRICE_PRO
      : process.env.STRIPE_PRICE_SCALE;

  if (!priceId) {
    return NextResponse.json(
      { error: "STRIPE_PRICE_PRO / STRIPE_PRICE_SCALE not set in env" },
      { status: 503 },
    );
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user?.email) {
    return NextResponse.json({ error: "User email missing" }, { status: 400 });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/settings?billing=success`,
    cancel_url: `${base}/settings?billing=cancel`,
    metadata: { userId: user.id },
    subscription_data: {
      metadata: { userId: user.id },
    },
    ...(user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: user.email }),
  });

  if (!checkout.url) {
    return NextResponse.json(
      { error: "Checkout URL missing" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: checkout.url });
}
