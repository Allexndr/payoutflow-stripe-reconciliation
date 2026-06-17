import { auth } from "@/auth";
import { isDatabaseConfigured } from "@/db";
import { addComment, listComments } from "@/lib/overrides";
import { getPayoutDetail } from "@/lib/payouts-service";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ payoutId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { payoutId } = await params;
  const items = await listComments(session.user.id, payoutId);
  return NextResponse.json({ items });
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }
  const { payoutId } = await params;
  const payout = await getPayoutDetail(session.user.id, payoutId);
  if (!payout) {
    return NextResponse.json({ error: "Payout not found" }, { status: 404 });
  }

  const raw = (await req.json().catch(() => null)) as { body?: unknown } | null;
  const body =
    raw && typeof raw.body === "string" ? raw.body.trim() : "";
  if (!body) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  if (body.length > 2000) {
    return NextResponse.json({ error: "body too long" }, { status: 400 });
  }

  const item = await addComment(session.user.id, payoutId, body);
  return NextResponse.json({ item }, { status: 201 });
}
