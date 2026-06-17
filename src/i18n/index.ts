import { getLocale } from "./get-locale";
import en, { type Messages } from "./dictionaries/en";
import ru from "./dictionaries/ru";
import kk from "./dictionaries/kk";
import type { Locale } from "./config";

const DICTIONARIES: Record<Locale, Messages> = { en, ru, kk };

/** Server-only helper: returns the dictionary for the current request. */
export async function getMessages(): Promise<Messages> {
  const locale = await getLocale();
  return DICTIONARIES[locale];
}

/** For places that already resolved the locale. */
export function messagesFor(locale: Locale): Messages {
  return DICTIONARIES[locale];
}

export { getLocale };
export type { Messages };
export * from "./config";
