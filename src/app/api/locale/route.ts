import { NextResponse } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export async function POST(req: Request) {
  let value: unknown;
  try {
    const json = await req.json();
    value = (json as { locale?: unknown })?.locale;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isLocale(value)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale: value });
  res.cookies.set({
    name: LOCALE_COOKIE,
    value,
    path: "/",
    maxAge: ONE_YEAR_SEC,
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}
