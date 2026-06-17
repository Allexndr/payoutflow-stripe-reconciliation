"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useState } from "react";

type Props = {
  hasCustomer: boolean;
  tier: string;
  proLabel: string;
  scaleLabel: string;
  manageLabel: string;
  currentPlanLabel: string;
  checkoutFailedLabel: string;
  portalFailedLabel: string;
};

export function BillingButtons({
  hasCustomer,
  tier,
  proLabel,
  scaleLabel,
  manageLabel,
  currentPlanLabel,
  checkoutFailedLabel,
  portalFailedLabel,
}: Props) {
  const [loading, setLoading] = useState<null | "pro" | "scale" | "portal">(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function checkout(t: "pro" | "scale") {
    setLoading(t);
    setError(null);
    const r = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: t }),
    });
    const data = (await r.json()) as { url?: string; error?: string };
    setLoading(null);
    if (!r.ok) {
      setError(data.error ?? checkoutFailedLabel);
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  async function portal() {
    setLoading("portal");
    setError(null);
    const r = await fetch("/api/billing/portal", { method: "POST" });
    const data = (await r.json()) as { url?: string; error?: string };
    setLoading(null);
    if (!r.ok) {
      setError(data.error ?? portalFailedLabel);
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={loading !== null}
          onClick={() => checkout("pro")}
        >
          {loading === "pro" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {proLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading !== null}
          onClick={() => checkout("scale")}
        >
          {loading === "scale" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          {scaleLabel}
        </Button>
        {hasCustomer && (
          <Button
            type="button"
            variant="ghost"
            disabled={loading !== null}
            onClick={portal}
          >
            {loading === "portal" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {manageLabel}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted">
        {currentPlanLabel}: <span className="text-text">{tier}</span>
      </p>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
