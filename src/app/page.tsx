import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale, getMessages } from "@/i18n";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Shield,
  Sparkles,
  Table2,
} from "lucide-react";

export default async function HomePage() {
  const t = await getMessages();
  const locale = await getLocale();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="font-semibold tracking-tight text-text">
            {t.common.appName}
          </span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher current={locale} variant="minimal" />
            <Button variant="ghost" href="/login">
              {t.common.signIn}
            </Button>
            <Button href="/register">{t.common.getStarted}</Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="pf-mesh" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 md:pb-28 md:pt-20">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t.landing.badge}
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-text md:text-5xl md:leading-[1.08]">
              {t.landing.h1a}{" "}
              <span className="bg-gradient-to-r from-primary to-[#7c6cf0] bg-clip-text text-transparent">
                {t.landing.h1b}
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted md:text-[1.125rem]">
              {t.landing.subtitle}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Button
                href="/register"
                className="px-6 py-3 text-base shadow-md shadow-primary/15"
              >
                {t.landing.ctaPrimary}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="secondary"
                href="/login"
                className="px-6 py-3 text-base"
              >
                {t.landing.ctaSecondary}
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted">{t.landing.tagline}</p>
          </div>
        </section>

        <section className="pf-section-muted border-b border-border/60 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 md:grid-cols-3">
            <Card>
              <Building2
                className="mb-3 h-8 w-8 text-primary"
                strokeWidth={1.5}
                aria-hidden
              />
              <h2 className="font-semibold text-text">
                {t.landing.features.stripeTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t.landing.features.stripeDesc}
              </p>
            </Card>
            <Card>
              <Table2
                className="mb-3 h-8 w-8 text-accent"
                strokeWidth={1.5}
                aria-hidden
              />
              <h2 className="font-semibold text-text">
                {t.landing.features.bankTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t.landing.features.bankDesc}
              </p>
            </Card>
            <Card>
              <Shield
                className="mb-3 h-8 w-8 text-success"
                strokeWidth={1.5}
                aria-hidden
              />
              <h2 className="font-semibold text-text">
                {t.landing.features.secureTitle}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t.landing.features.secureDesc}
              </p>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-text md:text-3xl">
            {t.landing.bullets.heading}
          </h2>
          <ul className="mx-auto mt-10 max-w-lg space-y-4 text-muted">
            {[
              t.landing.bullets.ui,
              t.landing.bullets.sorting,
              t.landing.bullets.csv,
              t.landing.bullets.pro,
            ].map((text) => (
              <li key={text} className="flex gap-3 text-sm leading-relaxed">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  aria-hidden
                />
                {text}
              </li>
            ))}
          </ul>
          <p className="mt-12 text-center text-sm text-muted">
            {t.landing.specNote}:{" "}
            <code className="rounded-md border border-border bg-surface-elevated px-2 py-0.5 font-mono text-xs text-text">
              docs/TZ.md
            </code>
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-canvas-subtle/50 py-10 text-center text-xs text-muted">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <a className="transition-colors hover:text-text" href="/privacy">
            {t.nav.privacy}
          </a>
          <a className="transition-colors hover:text-text" href="/terms">
            {t.nav.terms}
          </a>
        </div>
        <p className="mt-3">
          © {new Date().getFullYear()} {t.common.appName} ·{" "}
          {t.landing.footerDisclaimer}
        </p>
      </footer>
    </div>
  );
}
