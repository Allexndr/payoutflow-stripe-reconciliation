import { RegisterForm } from "@/components/auth/register-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale, getMessages } from "@/i18n";
import Link from "next/link";

export default async function RegisterPage() {
  const t = await getMessages();
  const locale = await getLocale();
  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent"
        aria-hidden
      />
      <div className="absolute right-4 top-4">
        <LanguageSwitcher current={locale} />
      </div>
      <Link
        href="/"
        className="relative mb-8 text-lg font-semibold tracking-tight text-text"
      >
        {t.common.appName}
      </Link>
      <Card className="relative w-full max-w-md">
        <h1 className="text-lg font-semibold text-text">
          {t.auth.registerTitle}
        </h1>
        <p className="mt-1 text-sm text-muted">{t.auth.registerSubtitle}</p>
        <div className="mt-6">
          <RegisterForm
            emailLabel={t.auth.emailLabel}
            passwordLabel={t.auth.passwordLabel}
            passwordHint={t.auth.passwordHint}
            createLabel={t.auth.createAccount}
            creatingLabel={t.auth.creatingAccount}
            fallbackError={t.auth.registrationFailed}
          />
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          {t.auth.haveAccount}{" "}
          <Button
            variant="ghost"
            href="/login"
            className="inline p-0 text-primary"
          >
            {t.auth.signInLink}
          </Button>
        </p>
      </Card>
    </div>
  );
}
