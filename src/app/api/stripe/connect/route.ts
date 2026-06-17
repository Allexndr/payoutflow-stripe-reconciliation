import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  const base = baseUrl;
  if (!clientId) {
    return NextResponse.json(
      { error: "STRIPE_CONNECT_CLIENT_ID is not set" },
      { status: 503 },
    );
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: `${base}/api/stripe/connect/callback`,
    state: session.user.id,
  });

  const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(url);
}
