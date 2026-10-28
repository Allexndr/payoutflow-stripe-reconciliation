import { auth } from "@/auth";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured, users } from "@/db";

export async function GET(req: Request) {
  const session = await auth();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  const base =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (err) {
    return NextResponse.redirect(
      new URL(`/settings?stripe=error&message=${encodeURIComponent(err)}`, base),
    );
  }

  if (!session?.user?.id || !code || state !== session.user.id) {
    return NextResponse.redirect(new URL("/login", base));
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.redirect(new URL("/settings?stripe=error", base));
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.redirect(new URL("/settings?stripe=error", base));
  }

  const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_secret: secret,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    stripe_user_id?: string;
    error?: string;
  };

  if (!tokenRes.ok || !tokenJson.stripe_user_id) {
    return NextResponse.redirect(
      new URL(
        `/settings?stripe=error&message=${encodeURIComponent(tokenJson.error ?? "token")}`,
        base,
      ),
    );
  }

  const db = getDb();
  await db
    .update(users)
    .set({ stripeAccountId: tokenJson.stripe_user_id })
    .where(eq(users.id, session.user.id));

  return NextResponse.redirect(new URL("/settings?stripe=connected", base));
}
