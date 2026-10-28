"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  syncStripeLabel: string;
  syncBankLabel: string;
  syncStripeTitle: string;
  syncBankTitle: string;
  stripeFailedLabel: string;
  bankFailedLabel: string;
};

export function DataRefreshBar({
  syncStripeLabel,
  syncBankLabel,
  syncStripeTitle,
  syncBankTitle,
  stripeFailedLabel,
  bankFailedLabel,
}: Props) {
  const [loading, setLoading] = useState<null | "stripe" | "plaid">(null);
  const [error, setError] = useState<string | null>(null);

  async function runStripe() {
    setLoading("stripe");
    setError(null);
    const r = await fetch("/api/payouts/refresh", { method: "POST" });
    setLoading(null);
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      setError(j.error ?? stripeFailedLabel);
      return;
    }
    window.location.reload();
  }

  async function runPlaid() {
    setLoading("plaid");
    setError(null);
    const r = await fetch("/api/plaid/sync", { method: "POST" });
    setLoading(null);
    if (!r.ok) {
      const j = (await r.json()) as { error?: string };
      setError(j.error ?? bankFailedLabel);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={loading !== null}
          onClick={runStripe}
          title={syncStripeTitle}
        >
          {loading === "stripe" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {syncStripeLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading !== null}
          onClick={runPlaid}
          title={syncBankTitle}
        >
          {loading === "plaid" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {syncBankLabel}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
