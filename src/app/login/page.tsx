import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { getLocale, getMessages } from "@/i18n";
import Link from "next/link";
import { Suspense } from "react";

export default async function LoginPage() {
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
      <div className="relative mb-8 text-center">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-text"
        >
          {t.common.appName}
        </Link>
      </div>
      <Card className="relative w-full max-w-md">
        <h1 className="text-lg font-semibold text-text">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-muted">{t.auth.loginSubtitle}</p>
        <div className="mt-6">
          <Suspense
            fallback={<p className="text-sm text-muted">{t.common.loading}</p>}
          >
            <LoginForm
              emailLabel={t.auth.emailLabel}
              passwordLabel={t.auth.passwordLabel}
              signInLabel={t.common.signIn}
              signingInLabel={t.auth.signingIn}
              invalidMessage={t.auth.invalidCredentials}
              createdMessage={t.auth.accountCreated}
            />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          {t.auth.noAccount}{" "}
          <Button
            variant="ghost"
            href="/register"
            className="inline p-0 text-primary"
          >
            {t.auth.createAccountLink}
          </Button>
        </p>
      </Card>
    </div>
  );
}
