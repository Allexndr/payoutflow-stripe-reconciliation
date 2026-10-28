"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, formatDateYmd } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ManualMatchCandidate = {
  id: string;
  amountCents: number;
  date: string;
  name: string | null;
  daysDiff: number;
  amountDiffCents: number;
};

export type ManualMatchLabels = {
  expectedPrefix: string;
  chooseBankLine: string;
  noCandidates: string;
  current: string;
  exact: string;
  unnamed: string;
  noteLabel: string;
  notePlaceholder: string;
  confirm: string;
  confirming: string;
  clear: string;
  clearing: string;
  saveError: string;
  clearError: string;
};

type Props = {
  payoutId: string;
  expectedNetCents: number;
  candidates: ManualMatchCandidate[];
  currentBankTxnId: string | null;
  isManual: boolean;
  note: string | null;
  locale: Locale;
  labels: ManualMatchLabels;
};

export function ManualMatchPanel({
  payoutId,
  expectedNetCents,
  candidates,
  currentBankTxnId,
  isManual,
  note,
  locale,
  labels,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(currentBankTxnId);
  const [draftNote, setDraftNote] = useState(note ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/payouts/${encodeURIComponent(payoutId)}/match`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bankTxnId: selected, note: draftNote }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(body?.error ?? labels.saveError);
        return;
      }
      router.refresh();
    });
  };

  const clear = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/payouts/${encodeURIComponent(payoutId)}/match`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setError(labels.clearError);
        return;
      }
      setSelected(null);
      setDraftNote("");
      router.refresh();
    });
  };

  if (candidates.length === 0) {
    return <p className="text-sm text-muted">{labels.noCandidates}</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        {labels.expectedPrefix}{" "}
        <span className="font-mono text-text">
          {formatMoney(expectedNetCents, "USD", locale)}
        </span>
        . {labels.chooseBankLine}
      </p>

      <ul className="space-y-2">
        {candidates.map((c) => {
          const active = selected === c.id;
          return (
            <li key={c.id}>
              <label
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                  active
                    ? "border-primary bg-primary-muted/50"
                    : "border-border bg-surface hover:border-border-strong",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name={`match-${payoutId}`}
                  value={c.id}
                  checked={active}
                  onChange={() => setSelected(c.id)}
                  className="mt-1 accent-[var(--primary)]"
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-primary">
                      {c.id}
                    </span>
                    {currentBankTxnId === c.id && isManual ? (
                      <Badge tone="accent">{labels.current}</Badge>
                    ) : null}
                    {c.daysDiff === 0 && c.amountDiffCents === 0 ? (
                      <Badge tone="success">{labels.exact}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-text">
                    {c.name ?? labels.unnamed}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatDateYmd(c.date, locale)} · Δ{c.daysDiff}d · Δ
                    {formatMoney(c.amountDiffCents, "USD", locale)}
                  </p>
                </div>
                <span className="font-mono text-sm text-text">
                  {formatMoney(Math.abs(c.amountCents), "USD", locale)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <label className="block text-xs text-muted">
        {labels.noteLabel}
        <textarea
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value.slice(0, 500))}
          rows={2}
          placeholder={labels.notePlaceholder}
          className="mt-1 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm text-text shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none focus:border-primary/60"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={confirm}
          disabled={pending || !selected || selected === currentBankTxnId}
        >
          {pending ? labels.confirming : labels.confirm}
        </Button>
        {isManual ? (
          <Button
            variant="ghost"
            onClick={clear}
            disabled={pending}
            className="text-muted hover:text-danger"
          >
            {pending ? labels.clearing : labels.clear}
          </Button>
        ) : null}
        {error ? (
          <span className="text-sm text-danger" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}
