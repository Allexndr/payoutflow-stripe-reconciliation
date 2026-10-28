import { PayoutTableToolbar } from "@/components/payout-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataRefreshBar } from "@/components/data-refresh-bar";
import { auth } from "@/auth";
import { formatMoney, formatPercent } from "@/lib/format";
import { getLocale, getMessages } from "@/i18n";
import {
  listPayoutRowsForUser,
  type PayoutMatchFilter,
} from "@/lib/payouts-service";
import { ArrowDownToLine, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function parseMatchParam(v: string | undefined): PayoutMatchFilter {
  if (v === "matched" || v === "review") return v;
  return "all";
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseYmd(v: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

function parseCents(v: string): number | undefined {
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

type SearchParams = Promise<{
  match?: string;
  page?: string;
  from?: string;
  to?: string;
  min?: string;
  max?: string;
  q?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getMessages();
  const locale = await getLocale();

  const sp = await searchParams;
  const match = parseMatchParam(str(sp.match));
  const pageRaw = parseInt(str(sp.page), 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const from = parseYmd(str(sp.from));
  const to = parseYmd(str(sp.to));
  const minStr = str(sp.min);
  const maxStr = str(sp.max);
  const minCents = parseCents(minStr);
  const maxCents = parseCents(maxStr);
  const q = str(sp.q).trim().slice(0, 64);

  const result = await listPayoutRowsForUser(session.user.id, {
    match,
    page,
    from: from || undefined,
    to: to || undefined,
    minCents,
    maxCents,
    q: q || undefined,
  });

  const { rows, metrics, total, page: safePage, pageSize, tierRowCount } =
    result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportParams = new URLSearchParams();
  if (match !== "all") exportParams.set("match", match);
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  if (minStr) exportParams.set("min", minStr);
  if (maxStr) exportParams.set("max", maxStr);
  if (q) exportParams.set("q", q);
  const exportHref = exportParams.toString()
    ? `/api/payouts/export?${exportParams.toString()}`
    : "/api/payouts/export";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            {t.dashboard.title}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            {t.dashboard.subtitle}
          </p>
        </div>
        <DataRefreshBar
          syncStripeLabel={t.dashboard.syncStripe}
          syncBankLabel={t.dashboard.syncBank}
          syncStripeTitle={t.dashboard.syncStripeTitle}
          syncBankTitle={t.dashboard.syncBankTitle}
          stripeFailedLabel={t.dashboard.stripeSyncFailed}
          bankFailedLabel={t.dashboard.bankSyncFailed}
        />
      </div>

      {tierRowCount === 0 && (
        <Card>
          <p className="text-sm text-muted">
            {t.dashboard.emptyConnect}{" "}
            <Link className="text-primary hover:underline" href="/settings">
              {t.dashboard.banner.connectCta}
            </Link>
          </p>
        </Card>
      )}

      {tierRowCount > 0 && total === 0 && (
        <Card>
          <p className="text-sm text-muted">
            {t.dashboard.empty}{" "}
            <Link
              className="font-medium text-primary hover:underline"
              href="/dashboard"
            >
              {t.dashboard.showAll}
            </Link>
          </p>
        </Card>
      )}

      {tierRowCount > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {t.dashboard.reconciledMatched}
            </span>
            <span className="font-mono text-2xl font-semibold text-text">
              {formatMoney(metrics.reconciledCents, "USD", locale)}
            </span>
            <span className="flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              {metrics.matchedCount} {t.dashboard.payoutsCount}
            </span>
          </Card>
          <Card className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {t.dashboard.avgDiscrepancy}
            </span>
            <span className="font-mono text-2xl font-semibold text-text">
              {metrics.matchedCount
                ? formatPercent(metrics.avgDiscrepancyRatio ?? 0, locale)
                : "—"}
            </span>
            <span className="text-xs text-muted">
              {t.dashboard.acrossMatched}
            </span>
          </Card>
          <Card className="flex flex-col justify-between gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted">
              {t.dashboard.exportCsv}
            </span>
            <Button
              variant="secondary"
              href={exportHref}
              className="w-full sm:w-auto"
            >
              <ArrowDownToLine className="h-4 w-4" aria-hidden />
              {t.dashboard.downloadCsv}
            </Button>
            {match !== "all" ? (
              <span className="text-xs text-muted">
                {t.dashboard.respectsFilter}
              </span>
            ) : null}
          </Card>
        </div>
      )}

      {tierRowCount > 0 && (
        <PayoutTableToolbar
          match={match}
          page={safePage}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          from={from}
          to={to}
          min={minStr}
          max={maxStr}
          q={q}
          labels={{
            match: t.dashboard.filters.match,
            all: t.dashboard.filters.all,
            matched: t.dashboard.filters.matched,
            review: t.dashboard.filters.review,
            from: t.dashboard.filters.from,
            to: t.dashboard.filters.to,
            min: t.dashboard.filters.minCents,
            max: t.dashboard.filters.maxCents,
            search: t.dashboard.filters.search,
            apply: t.dashboard.filters.apply,
            reset: t.dashboard.filters.reset,
            previous: t.dashboard.filters.previous,
            next: t.dashboard.filters.next,
            of: t.dashboard.filters.of,
            filtered: t.dashboard.filters.filtered,
            zero: t.dashboard.filters.zeroPayouts,
            one: t.dashboard.filters.payoutSingular,
            many: t.dashboard.filters.payoutPlural,
          }}
        />
      )}

      <div
        className="hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm md:block"
        hidden={rows.length === 0}
      >
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/90 text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">
                {t.dashboard.table.payoutId}
              </th>
              <th className="px-4 py-3 font-medium">
                {t.dashboard.table.amount}
              </th>
              <th className="px-4 py-3 font-medium">
                {t.dashboard.table.arrival}
              </th>
              <th className="px-4 py-3 font-medium">
                {t.dashboard.table.expected}
              </th>
              <th className="px-4 py-3 font-medium">
                {t.dashboard.table.txns}
              </th>
              <th className="px-4 py-3 font-medium">
                {t.dashboard.table.diff}
              </th>
              <th className="px-4 py-3 font-medium">
                {t.dashboard.table.status}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-border/60 transition-colors hover:bg-slate-50/80"
              >
                <td className="px-4 py-3 font-mono text-xs text-text">
                  <Link
                    className="text-primary hover:underline"
                    href={`/dashboard/payouts/${r.id}`}
                  >
                    {r.id}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-text">
                  {formatMoney(r.amountCents, r.currency, locale)}
                </td>
                <td className="px-4 py-3 text-muted">{r.arrivalDate}</td>
                <td className="px-4 py-3 text-muted">
                  {r.expectedArrivalDate}
                </td>
                <td className="px-4 py-3 font-mono text-muted">{r.txnCount}</td>
                <td className="px-4 py-3 font-mono text-muted">
                  {r.discrepancyPercent != null
                    ? `${r.discrepancyPercent.toFixed(2)}%`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    <Badge
                      tone={
                        r.matchStatus === "matched" ? "success" : "warning"
                      }
                    >
                      {r.matchStatus === "matched"
                        ? t.dashboard.totals.matched
                        : t.dashboard.totals.review}
                    </Badge>
                    {r.manual ? (
                      <Badge tone="accent">
                        {t.dashboard.table.manualBadge}
                      </Badge>
                    ) : null}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden" hidden={rows.length === 0}>
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/dashboard/payouts/${r.id}`}
            className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-border-strong hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs text-primary">{r.id}</span>
              <span className="inline-flex items-center gap-1">
                <Badge
                  tone={r.matchStatus === "matched" ? "success" : "warning"}
                >
                  {r.matchStatus === "matched"
                    ? t.dashboard.totals.matched
                    : t.dashboard.totals.review}
                </Badge>
                {r.manual ? (
                  <Badge tone="accent">{t.dashboard.table.manualBadge}</Badge>
                ) : null}
              </span>
            </div>
            <p className="mt-2 font-mono text-lg text-text">
              {formatMoney(r.amountCents, r.currency, locale)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t.dashboard.table.arrival} {r.arrivalDate} · {r.txnCount}{" "}
              {t.dashboard.table.txns.toLowerCase()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
