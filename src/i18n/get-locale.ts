import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE,
  isLocale,
  type Locale,
} from "./config";

/**
 * Parses `Accept-Language` and returns the first supported locale.
 * Falls back to `DEFAULT_LOCALE` when nothing matches.
 */
function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const entries = header
    .split(",")
    .map((part) => {
      const [tag, ...rest] = part.trim().split(";");
      const qStr = rest.find((s) => s.trim().startsWith("q="));
      const q = qStr ? Number(qStr.trim().slice(2)) : 1;
      return { tag: tag?.toLowerCase() ?? "", q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of entries) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}

/**
 * Resolves the active locale for the current request.
 * Priority: `pf_locale` cookie → `Accept-Language` → default (`en`).
 * Server-only helper — do not call from client components.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const hdrs = await headers();
  return parseAcceptLanguage(hdrs.get("accept-language"));
}

export { LOCALES };
