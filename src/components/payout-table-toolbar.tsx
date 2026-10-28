"use client";

import { cn } from "@/lib/cn";
import type { PayoutMatchFilter } from "@/lib/payouts-service";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

export type ToolbarFilters = {
  match: PayoutMatchFilter;
  page: number;
  from: string;
  to: string;
  min: string;
  max: string;
  q: string;
};

function buildQuery(
  f: Partial<ToolbarFilters>,
  base: ToolbarFilters,
): string {
  const v: ToolbarFilters = { ...base, ...f };
  const p = new URLSearchParams();
  if (v.match !== "all") p.set("match", v.match);
  if (v.page > 1) p.set("page", String(v.page));
  if (v.from) p.set("from", v.from);
  if (v.to) p.set("to", v.to);
  if (v.min) p.set("min", v.min);
  if (v.max) p.set("max", v.max);
  if (v.q) p.set("q", v.q);
  const s = p.toString();
  return s ? `?${s}` : "";
}

const inputCls =
  "rounded-lg border border-border bg-white px-2.5 py-1.5 text-sm text-text shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none focus:border-primary/60";

export type ToolbarLabels = {
  match: string;
  all: string;
  matched: string;
  review: string;
  from: string;
  to: string;
  min: string;
  max: string;
  search: string;
  apply: string;
  reset: string;
  previous: string;
  next: string;
  of: string;
  filtered: string;
  zero: string;
  one: string;
  many: string;
};

const DEFAULT_LABELS: ToolbarLabels = {
  match: "Match",
  all: "All",
  matched: "Matched",
  review: "Review",
  from: "From",
  to: "To",
  min: "Min (cents)",
  max: "Max (cents)",
  search: "Payout ID",
  apply: "Apply",
  reset: "Reset",
  previous: "Previous",
  next: "Next",
  of: "of",
  filtered: "filtered",
  zero: "0 payouts",
  one: "payout",
  many: "payouts",
};

export function PayoutTableToolbar({
  match,
  page,
  totalPages,
  total,
  pageSize,
  from,
  to,
  min,
  max,
  q,
  labels = DEFAULT_LABELS,
}: {
  match: PayoutMatchFilter;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  from: string;
  to: string;
  min: string;
  max: string;
  q: string;
  labels?: ToolbarLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [dFrom, setDFrom] = useState(from);
  const [dTo, setDTo] = useState(to);
  const [dMin, setDMin] = useState(min);
  const [dMax, setDMax] = useState(max);
  const [dQ, setDQ] = useState(q);

  const base: ToolbarFilters = { match, page, from, to, min, max, q };

  const apply = (e: FormEvent) => {
    e.preventDefault();
    const next = buildQuery(
      { from: dFrom, to: dTo, min: dMin, max: dMax, q: dQ, page: 1 },
      base,
    );
    startTransition(() => router.push(`${pathname}${next}`));
  };

  const reset = () => {
    setDFrom("");
    setDTo("");
    setDMin("");
    setDMax("");
    setDQ("");
    startTransition(() =>
      router.push(
        `${pathname}${buildQuery(
          { from: "", to: "", min: "", max: "", q: "", page: 1 },
          base,
        )}`,
      ),
    );
  };

  const tabs: { id: PayoutMatchFilter; label: string }[] = [
    { id: "all", label: labels.all },
    { id: "matched", label: labels.matched },
    { id: "review", label: labels.review },
  ];

  const hasFilters = Boolean(from || to || min || max || q);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex rounded-lg border border-border bg-surface p-0.5 shadow-sm"
          role="tablist"
          aria-label="Filter by match status"
        >
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`${pathname}${buildQuery({ match: t.id, page: 1 }, base)}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                match === t.id
                  ? "bg-primary-muted text-primary"
                  : "text-muted hover:bg-slate-50 hover:text-text",
              )}
              aria-current={match === t.id ? "true" : undefined}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>
              {total === 0
                ? labels.zero
                : `${(page - 1) * pageSize + 1}–${Math.min(
                    page * pageSize,
                    total,
                  )} ${labels.of} ${total}`}
            </span>
            <div className="flex items-center gap-1">
              <Link
                href={`${pathname}${buildQuery({ page: Math.max(1, page - 1) }, base)}`}
                className={cn(
                  "rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text shadow-sm transition-colors hover:bg-slate-50",
                  page <= 1 && "pointer-events-none opacity-40",
                )}
                aria-disabled={page <= 1}
              >
                {labels.previous}
              </Link>
              <span className="px-1 font-mono text-xs">
                {page} / {totalPages}
              </span>
              <Link
                href={`${pathname}${buildQuery({ page: Math.min(totalPages, page + 1) }, base)}`}
                className={cn(
                  "rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-text shadow-sm transition-colors hover:bg-slate-50",
                  page >= totalPages && "pointer-events-none opacity-40",
                )}
                aria-disabled={page >= totalPages}
              >
                {labels.next}
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            {total} {total === 1 ? labels.one : labels.many}
            {match !== "all" || hasFilters ? ` · ${labels.filtered}` : ""}
          </p>
        )}
      </div>

      <form
        onSubmit={apply}
        className="flex flex-wrap items-end gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-xs text-muted">
          <span>{labels.from}</span>
          <input
            type="date"
            value={dFrom}
            onChange={(e) => setDFrom(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          <span>{labels.to}</span>
          <input
            type="date"
            value={dTo}
            onChange={(e) => setDTo(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          <span>{labels.min}</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={dMin}
            onChange={(e) => setDMin(e.target.value)}
            className={cn(inputCls, "w-28")}
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          <span>{labels.max}</span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={dMax}
            onChange={(e) => setDMax(e.target.value)}
            className={cn(inputCls, "w-28")}
            placeholder="—"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
          <span>{labels.search}</span>
          <input
            type="text"
            value={dQ}
            onChange={(e) => setDQ(e.target.value)}
            className={cn(inputCls, "min-w-40 flex-1")}
            placeholder="po_…"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-hover"
          >
            {labels.apply}
          </button>
          {hasFilters ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted shadow-sm transition-colors hover:text-text"
            >
              {labels.reset}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
