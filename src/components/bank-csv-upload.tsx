"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

type Props = {
  uploadLabel: string;
  ariaLabel: string;
  titleLabel: string;
  headersHint: string;
  uploadFailedLabel: string;
};

export function BankCsvUpload({
  uploadLabel,
  ariaLabel,
  titleLabel,
  headersHint,
  uploadFailedLabel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setPending(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("file", file);

    const res = await fetch("/api/bank/csv", {
      method: "POST",
      body: fd,
    });
    const data = (await res.json()) as {
      ok?: boolean;
      imported?: number;
      error?: string;
    };
    setPending(false);

    if (!res.ok) {
      setMessage(data.error ?? uploadFailedLabel);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-label={ariaLabel}
        onChange={onChange}
        disabled={pending}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        title={titleLabel}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="h-4 w-4" aria-hidden />
        )}
        {uploadLabel}
      </Button>
      <p className="text-xs text-muted">{headersHint}</p>
      {message && (
        <p className="text-sm text-muted" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
