"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LOCALES,
  LOCALE_LABELS,
  type Locale,
} from "@/i18n/config";
import { Globe } from "lucide-react";

type Props = {
  current: Locale;
  /** `minimal` renders just a select; `pill` wraps it in a rounded badge with icon. */
  variant?: "minimal" | "pill";
  ariaLabel?: string;
};

export function LanguageSwitcher({
  current,
  variant = "pill",
  ariaLabel = "Change language",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<Locale>(current);

  async function onChange(next: Locale) {
    setValue(next);
    try {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
    } catch {
      /** Cookie failed — keep UI consistent; reverting on next refresh. */
    }
    startTransition(() => {
      router.refresh();
    });
  }

  const selectClasses =
    variant === "pill"
      ? "appearance-none bg-transparent pr-5 pl-1 text-xs font-medium text-muted focus:outline-none"
      : "rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted focus:outline-none";

  const wrapperClasses =
    variant === "pill"
      ? "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-xs text-muted backdrop-blur-sm"
      : "inline-flex items-center";

  return (
    <label className={wrapperClasses} aria-label={ariaLabel}>
      {variant === "pill" && (
        <Globe className="h-3.5 w-3.5 text-muted" aria-hidden />
      )}
      <select
        className={selectClasses}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          void onChange(next);
        }}
      >
        {LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc].native}
          </option>
        ))}
      </select>
    </label>
  );
}
