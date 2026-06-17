import { auth } from "@/auth";
import { isDatabaseConfigured } from "@/db";
import {
  clearOverride,
  setOverride,
} from "@/lib/overrides";
import { getBankTxnInputsForUser, getPayoutDetail } from "@/lib/payouts-service";
import { DEMO_BANK_TXNS } from "@/lib/demo-data";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ payoutId: string }> };

type ConfirmBody = {
  bankTxnId?: unknown;
  note?: unknown;
};

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

  const raw = (await req.json().catch(() => null)) as ConfirmBody | null;
  if (!raw || typeof raw.bankTxnId !== "string" || raw.bankTxnId.length === 0) {
    return NextResponse.json(
      { error: "bankTxnId is required" },
      { status: 400 },
    );
  }
  if (raw.bankTxnId.length > 128) {
    return NextResponse.json({ error: "bankTxnId too long" }, { status: 400 });
  }

  const bank = payoutId.startsWith("po_demo_")
    ? DEMO_BANK_TXNS
    : await getBankTxnInputsForUser(session.user.id);
  const exists = bank.some((t) => t.id === raw.bankTxnId);
  if (!exists) {
    return NextResponse.json(
      { error: "Bank transaction not found in your ledger" },
      { status: 400 },
    );
  }

  const note =
    typeof raw.note === "string" && raw.note.trim().length > 0
      ? raw.note.trim().slice(0, 500)
      : null;

  await setOverride(session.user.id, payoutId, raw.bankTxnId, note);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { payoutId } = await params;
  await clearOverride(session.user.id, payoutId);
  return NextResponse.json({ ok: true });
}
