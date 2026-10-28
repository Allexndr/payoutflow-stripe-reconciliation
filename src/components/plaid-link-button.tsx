"use client";

import { Button } from "@/components/ui/button";
import { usePlaidLink } from "react-plaid-link";
import { useCallback, useEffect, useState } from "react";

type Props = {
  connectLabel: string;
  preparingLabel: string;
  loadingTitle: string;
  openTitle: string;
  notConfiguredMessage: string;
  saveFailedMessage: string;
};

export function PlaidLinkButton({
  connectLabel,
  preparingLabel,
  loadingTitle,
  openTitle,
  notConfiguredMessage,
  saveFailedMessage,
}: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/plaid/link-token", { method: "POST" });
      if (!res.ok) {
        if (!cancelled) setMessage(notConfiguredMessage);
        return;
      }
      const data = (await res.json()) as { link_token?: string };
      if (!cancelled && data.link_token) setToken(data.link_token);
    })();
    return () => {
      cancelled = true;
    };
  }, [notConfiguredMessage]);

  const onSuccess = useCallback(
    async (publicToken: string) => {
      setMessage(null);
      const res = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_token: publicToken }),
      });
      if (!res.ok) {
        setMessage(saveFailedMessage);
        return;
      }
      window.location.href = "/settings?plaid=connected";
    },
    [saveFailedMessage],
  );

  const { open, ready } = usePlaidLink({
    token: token,
    onSuccess,
  });

  if (message && !token) {
    return (
      <p className="text-sm text-muted" role="status">
        {message}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        onClick={() => open()}
        disabled={!ready || !token}
        title={!token ? loadingTitle : openTitle}
      >
        {ready && token ? connectLabel : preparingLabel}
      </Button>
      {message && (
        <p className="text-sm text-danger" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
