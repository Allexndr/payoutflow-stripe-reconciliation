import { Button } from "@/components/ui/button";
import { getMessages } from "@/i18n";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default async function PrivacyPage() {
  const t = await getMessages();
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Button variant="ghost" href="/" className="mb-8 -ml-2">
        ← {t.common.home}
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight text-text">
        {t.privacy.title}
      </h1>
      <p className="mt-2 text-sm text-muted">{t.privacy.lastUpdated}</p>

      <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="font-medium text-text">{t.privacy.overviewHeading}</h2>
          <p className="mt-2">{t.privacy.overview}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.privacy.dataHeading}</h2>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>{t.privacy.dataAccount}</li>
            <li>{t.privacy.dataStripe}</li>
            <li>
              {t.privacy.dataPlaidPrefix}{" "}
              <code className="font-mono text-xs text-text">
                TOKEN_ENCRYPTION_KEY
              </code>
              {t.privacy.dataPlaidSuffix}
            </li>
            <li>{t.privacy.dataCsv}</li>
          </ul>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.privacy.legalHeading}</h2>
          <p className="mt-2">{t.privacy.legal}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">
            {t.privacy.subprocessorsHeading}
          </h2>
          <p className="mt-2">{t.privacy.subprocessors}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.privacy.rightsHeading}</h2>
          <p className="mt-2">{t.privacy.rights}</p>
        </section>
        <section>
          <h2 className="font-medium text-text">{t.privacy.contactHeading}</h2>
          <p className="mt-2">{t.privacy.contact}</p>
        </section>
      </div>

      <p className="mt-12 text-center text-xs text-muted">
        <Link className="text-primary hover:underline" href="/terms">
          {t.privacy.linkToTerms}
        </Link>
      </p>
    </div>
  );
}
