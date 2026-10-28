import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CommentsPanel } from "@/components/comments-panel";
import { ManualMatchPanel } from "@/components/manual-match-panel";
import { auth } from "@/auth";
import { getLocale, getMessages } from "@/i18n";
import { getReconciliationInsight } from "@/lib/ai-insight";
import { DEMO_BANK_TXNS } from "@/lib/demo-data";
import { formatMoney, formatDateYmd } from "@/lib/format";
import { matchPayoutToBank, rankCandidates } from "@/lib/match";
import {
  getBankTxnInputsForUser,
  getPayoutDetail,
} from "@/lib/payouts-service";
import {
  getOverride,
  listComments,
  listEvents,
} from "@/lib/overrides";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ payoutId: string }> };

type BreakdownTypeKey = keyof typeof BREAKDOWN_TYPE_FALLBACK;
const BREAKDOWN_TYPE_FALLBACK = {
  charge: "charge",
  refund: "refund",
  fee: "fee",
  adjustment: "adjustment",
  payout: "payout",
} as const;

export default async function PayoutDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getMessages();
  const locale = await getLocale();

  const { payoutId } = await params;
  const payout = await getPayoutDetail(session.user.id, payoutId);
  if (!payout) {
    notFound();
  }

  const bankInputs = payoutId.startsWith("po_demo_")
    ? DEMO_BANK_TXNS.map((tx) => ({
        id: tx.id,
        amountCents: tx.amountCents,
        date: tx.date,
        name: tx.name,
      }))
    : await getBankTxnInputsForUser(session.user.id);

  const [heuristic, override, comments, events] = await Promise.all([
    Promise.resolve(
      matchPayoutToBank(payout.expectedNetCents, payout.arrivalDate, bankInputs),
    ),
    getOverride(session.user.id, payoutId),
    listComments(session.user.id, payoutId),
    listEvents(session.user.id, {
      entity: "payout",
      entityId: payoutId,
      limit: 20,
    }),
  ]);

  const candidates = rankCandidates(
    payout.expectedNetCents,
    payout.arrivalDate,
    bankInputs,
    10,
  );

  const effectiveStatus: "matched" | "review" = override
    ? "matched"
    : heuristic.status === "matched"
      ? "matched"
      : "review";

  const effectiveBankTxnId: string | null = override
    ? override.bankTxnId
    : heuristic.status === "matched"
      ? heuristic.bankTxnId
      : null;

  const effectiveActualCents = effectiveBankTxnId
    ? Math.abs(
        bankInputs.find((b) => b.id === effectiveBankTxnId)?.amountCents ??
          payout.expectedNetCents,
      )
    : null;

  const insight = await getReconciliationInsight({
    payoutId: payout.id,
    expectedNetCents: payout.expectedNetCents,
    arrivalDate: payout.arrivalDate,
    txnCount: payout.txnCount,
    locale,
    messages: t,
    match: override
      ? {
          status: "matched",
          bankTxnId: override.bankTxnId,
          discrepancyRatio:
            effectiveActualCents != null && payout.expectedNetCents !== 0
              ? Math.abs(
                  (effectiveActualCents - payout.expectedNetCents) /
                    payout.expectedNetCents,
                )
              : 0,
          expectedCents: payout.expectedNetCents,
          actualCents: effectiveActualCents ?? payout.expectedNetCents,
        }
      : heuristic,
  });

  const lines =
    payout.lines.length > 0
      ? payout.lines
      : [
          {
            id: "—",
            type: "charge" as const,
            customer: "—",
            amountCents: payout.amountCents,
            feeCents: 0,
            netCents: payout.expectedNetCents,
          },
        ];

  const commentsForClient = comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  }));

  function localizeType(type: string): string {
    const key = type as BreakdownTypeKey;
    return (
      t.payoutDetail.breakdown.types[key] ??
      BREAKDOWN_TYPE_FALLBACK[key] ??
      type
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted hover:text-primary"
        >
          ← {t.payoutDetail.back}
        </Link>
        <h1 className="mt-4 font-mono text-xl font-semibold text-text">
          {payout.id}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {formatMoney(payout.amountCents, payout.currency, locale)} ·{" "}
          {t.payoutDetail.arrival} {formatDateYmd(payout.arrivalDate, locale)}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-medium text-text">
              {t.payoutDetail.bankMatchHeading}
            </h2>
            <Badge tone={effectiveStatus === "matched" ? "success" : "warning"}>
              {effectiveStatus === "matched"
                ? t.payoutDetail.statusMatched
                : t.payoutDetail.statusReview}
            </Badge>
            {override ? (
              <Badge tone="accent">{t.payoutDetail.manualTag}</Badge>
            ) : null}
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            {effectiveBankTxnId ? (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t.payoutDetail.bankTxn}</dt>
                  <dd className="font-mono text-xs text-text">
                    {effectiveBankTxnId}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">
                    {t.payoutDetail.expectedNetLabel}
                  </dt>
                  <dd className="font-mono">
                    {formatMoney(payout.expectedNetCents, "USD", locale)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t.payoutDetail.bankAmount}</dt>
                  <dd className="font-mono">
                    {effectiveActualCents != null
                      ? formatMoney(effectiveActualCents, "USD", locale)
                      : "—"}
                  </dd>
                </div>
                {override?.note ? (
                  <div>
                    <dt className="text-muted">
                      {t.payoutDetail.manualNote}
                    </dt>
                    <dd className="mt-1 text-text">{override.note}</dd>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted">
                {heuristic.status === "review" &&
                heuristic.reason === "no_candidate"
                  ? t.payoutDetail.noCandidateWindow
                  : t.payoutDetail.ambiguousCandidates}
              </p>
            )}
          </dl>
        </Card>

        <Card>
          <h2 className="text-sm font-medium text-text">
            {t.payoutDetail.totalsHeading}
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">
                {t.payoutDetail.expectedNetStripe}
              </dt>
              <dd className="font-mono">
                {formatMoney(payout.expectedNetCents, "USD", locale)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">{t.payoutDetail.payoutAmount}</dt>
              <dd className="font-mono">
                {formatMoney(payout.amountCents, "USD", locale)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-text">
            {t.payoutDetail.manualMatchHeading}
          </h2>
          <span className="text-xs text-muted">
            {t.payoutDetail.manualMatchHint}
          </span>
        </div>
        <div className="mt-4">
          <ManualMatchPanel
            payoutId={payout.id}
            expectedNetCents={payout.expectedNetCents}
            candidates={candidates.map((c) => ({
              id: c.id,
              amountCents: c.amountCents,
              date: c.date,
              name: c.name ?? null,
              daysDiff: c.daysDiff,
              amountDiffCents: c.amountDiffCents,
            }))}
            currentBankTxnId={effectiveBankTxnId}
            isManual={Boolean(override)}
            note={override?.note ?? null}
            locale={locale}
            labels={t.payoutDetail.manualMatch}
          />
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium text-text">
            {t.payoutDetail.aiInsightHeading}
          </h2>
          <Badge tone="accent">
            {insight.source === "hf"
              ? t.payoutDetail.aiSourceHf
              : t.payoutDetail.aiSourceFast}
          </Badge>
          <Badge tone={insight.confidence === "high" ? "success" : "warning"}>
            {insight.confidence === "high"
              ? t.payoutDetail.aiConfidenceHigh
              : t.payoutDetail.aiConfidenceMedium}
          </Badge>
        </div>
        <p className="mt-3 text-sm text-muted">{insight.summary}</p>
        <ul className="mt-3 space-y-1 text-sm text-text">
          {insight.actions.map((action) => (
            <li key={action} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-text">
          {t.payoutDetail.commentsHeading}
        </h2>
        <div className="mt-4">
          <CommentsPanel
            payoutId={payout.id}
            initial={commentsForClient}
            labels={t.payoutDetail.comments}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-text">
          {t.payoutDetail.breakdownHeading}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/90 text-xs uppercase text-muted">
                <th className="py-2 pr-4 font-medium">
                  {t.payoutDetail.breakdown.id}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t.payoutDetail.breakdown.type}
                </th>
                <th className="py-2 pr-4 font-medium">
                  {t.payoutDetail.breakdown.customer}
                </th>
                <th className="py-2 pr-4 text-right font-medium">
                  {t.payoutDetail.breakdown.amount}
                </th>
                <th className="py-2 pr-4 text-right font-medium">
                  {t.payoutDetail.breakdown.fee}
                </th>
                <th className="py-2 text-right font-medium">
                  {t.payoutDetail.breakdown.net}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-b border-border/50 text-text"
                >
                  <td className="py-2 pr-4 font-mono text-xs">{line.id}</td>
                  <td className="py-2 pr-4 text-muted">
                    {localizeType(line.type)}
                  </td>
                  <td className="py-2 pr-4">{line.customer}</td>
                  <td className="py-2 pr-4 text-right font-mono">
                    {formatMoney(line.amountCents, "USD", locale)}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-muted">
                    {formatMoney(line.feeCents, "USD", locale)}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatMoney(line.netCents, "USD", locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {events.length > 0 ? (
        <Card>
          <h2 className="text-sm font-medium text-text">
            {t.payoutDetail.activityHeading}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-4 border-b border-border/40 pb-2 last:border-0 last:pb-0"
              >
                <span className="text-text">{e.action}</span>
                <span className="text-xs text-muted">
                  {e.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
