import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default async function TermsPage() {
  const t = await getMessages();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Button variant="ghost" href="/" className="mb-8 -ml-2">
        ← {t.common.home}
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight text-text">
        {t.terms.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{t.terms.lastUpdated}</p>

      <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="font-medium text-text">{t.terms.agreementHeading}</h2>
          <p className="mt-2">{t.terms.agreement}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.terms.serviceHeading}</h2>
          <p className="mt-2">{t.terms.service}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.terms.accountsHeading}</h2>
          <p className="mt-2">{t.terms.accounts}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.terms.feesHeading}</h2>
          <p className="mt-2">{t.terms.fees}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.terms.disclaimerHeading}</h2>
          <p className="mt-2">{t.terms.disclaimer}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.terms.liabilityHeading}</h2>
          <p className="mt-2">{t.terms.liability}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.terms.changesHeading}</h2>
          <p className="mt-2">{t.terms.changes}</p>
        </section>
      </div>

      <p className="mt-12 text-center text-xs text-muted">
        <Link className="text-primary hover:underline" href="/privacy">
          {t.terms.linkToPrivacy}
        </Link>
      </p>
    </div>
  );
}
