import { auth } from "@/auth";
import { getPlaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = getPlaidClient();
  if (!client) {
    return NextResponse.json(
      { error: "Plaid is not configured" },
      { status: 503 },
    );
  }

  const res = await client.linkTokenCreate({
    user: { client_user_id: session.user.id },
    client_name: "PayoutFlow",
    products: [Products.Transactions],
    country_codes: [CountryCode.Us],
    language: "en",
  });

  return NextResponse.json({ link_token: res.data.link_token });
}
