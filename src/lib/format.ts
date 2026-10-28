import { DEFAULT_LOCALE, LOCALE_INTL_TAG, type Locale } from "@/i18n/config";

function tag(locale?: Locale): string {
  return LOCALE_INTL_TAG[locale ?? DEFAULT_LOCALE];
}

export function formatMoney(cents: number, currency = "USD", locale?: Locale) {
  return new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatPercent(ratio: number, locale?: Locale) {
  return new Intl.NumberFormat(tag(locale), {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(ratio);
}

export function formatDate(iso: string | Date, locale?: Locale) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(tag(locale), {
    dateStyle: "medium",
  }).format(d);
}

/** Avoid timezone shifts for `YYYY-MM-DD` from APIs */
export function formatDateYmd(ymd: string, locale?: Locale) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat(tag(locale), { dateStyle: "medium" }).format(
    new Date(y, m - 1, d),
  );
}
