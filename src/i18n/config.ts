export const LOCALES = ["en", "ru", "kk"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "pf_locale";

export const LOCALE_LABELS: Record<Locale, { native: string; english: string; flag: string }> = {
  en: { native: "English", english: "English", flag: "EN" },
  ru: { native: "Русский", english: "Russian", flag: "RU" },
  kk: { native: "Қазақша", english: "Kazakh", flag: "KZ" },
};

/** Intl BCP-47 tag used by number/date formatters. */
export const LOCALE_INTL_TAG: Record<Locale, string> = {
  en: "en-US",
  ru: "ru-RU",
  kk: "kk-KZ",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
