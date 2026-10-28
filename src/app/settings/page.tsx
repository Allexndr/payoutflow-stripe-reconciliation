import { BankCsvUpload } from "@/components/bank-csv-upload";
import { BillingButtons } from "@/components/billing-buttons";
import { PlaidLinkButton } from "@/components/plaid-link-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { auth } from "@/auth";
import { getDb, isDatabaseConfigured, users } from "@/db";
import { getMessages } from "@/i18n";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const t = await getMessages();

  const sp = await searchParams;
  const stripeBanner = sp.stripe;
  const plaidBanner = sp.plaid;
  const billing = sp.billing;

  let stripeConnected = false;
  let plaidConnected = false;
  let email = session.user.email ?? "";
  let subTier = "free";
  let stripeCustomerId: string | null = null;

  if (isDatabaseConfigured()) {
    const db = getDb();
    const row = (
      await db.select().from(users).where(eq(users.id, session.user.id)).limit(1)
    )[0];
    stripeConnected = Boolean(row?.stripeAccountId);
    plaidConnected = Boolean(row?.plaidAccessToken);
    email = row?.email ?? email;
    subTier = row?.subTier ?? "free";
    stripeCustomerId = row?.stripeCustomerId ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {t.settings.title}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {t.settings.signedInAs}{" "}
          <span className="text-text">{email}</span>
        </p>
      </div>

      {stripeBanner === "connected" && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t.settings.stripe.connectedBanner}
        </p>
      )}
      {stripeBanner === "error" && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t.settings.stripe.errorBanner}
        </p>
      )}
      {plaidBanner === "connected" && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t.settings.bank.plaidConnectedBanner}
        </p>
      )}
      {billing === "success" && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t.settings.billing.successBanner}
        </p>
      )}
      {billing === "cancel" && (
        <p className="rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-muted">
          {t.settings.billing.cancelBanner}
        </p>
      )}

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-medium text-text">{t.settings.stripe.title}</h2>
            <p className="mt-1 text-sm text-muted">
              {t.settings.stripe.description}
            </p>
            <div className="mt-3">
              <Badge tone={stripeConnected ? "success" : "neutral"}>
                {stripeConnected
                  ? t.settings.stripe.connected
                  : t.settings.stripe.notConnected}
              </Badge>
            </div>
          </div>
          <Button variant="secondary" href="/api/stripe/connect">
            {stripeConnected
              ? t.settings.stripe.reconnect
              : t.settings.stripe.connect}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-medium text-text">{t.settings.bank.title}</h2>
            <p className="mt-1 text-sm text-muted">
              {t.settings.bank.plaidDescription}
            </p>
            <div className="mt-3">
              <Badge tone={plaidConnected ? "success" : "neutral"}>
                {plaidConnected
                  ? t.settings.bank.plaidLinked
                  : t.settings.bank.plaidNotLinked}
              </Badge>
            </div>
          </div>
          <PlaidLinkButton
            connectLabel={t.settings.bank.plaidConnect}
            preparingLabel={t.settings.bank.plaidPreparing}
            loadingTitle={t.settings.bank.plaidLoadingTitle}
            openTitle={t.settings.bank.plaidOpenTitle}
            notConfiguredMessage={t.settings.bank.plaidNotConfigured}
            saveFailedMessage={t.settings.bank.plaidSaveFailed}
          />
        </div>
      </Card>

      <Card>
        <h2 className="font-medium text-text">{t.settings.billing.title}</h2>
        <p className="mt-2 text-sm text-muted">
          {t.settings.billing.description}
        </p>
        <div className="mt-4">
          <BillingButtons
            hasCustomer={Boolean(stripeCustomerId)}
            tier={subTier}
            proLabel={t.settings.billing.pro}
            scaleLabel={t.settings.billing.scale}
            manageLabel={t.settings.billing.manage}
            currentPlanLabel={t.settings.billing.currentPlan}
            checkoutFailedLabel={t.settings.billing.checkoutFailed}
            portalFailedLabel={t.settings.billing.portalFailed}
          />
        </div>
        <Button variant="ghost" className="mt-6" href="/dashboard">
          {t.settings.back}
        </Button>
      </Card>

      <Card>
        <h2 className="font-medium text-text">{t.settings.bank.csvTitle}</h2>
        <p className="mt-2 text-sm text-muted">
          {t.settings.bank.csvDescription}
        </p>
        <div className="mt-4">
          <BankCsvUpload
            uploadLabel={t.settings.bank.csvLabel}
            ariaLabel={t.settings.bank.csvA11y}
            titleLabel={t.settings.bank.csvTitleHint}
            headersHint={t.settings.bank.csvHeadersHint}
            uploadFailedLabel={t.settings.bank.csvUploadFailed}
          />
        </div>
      </Card>

      <p className="text-center text-xs text-muted">
        <a className="hover:text-text" href="/privacy">
          {t.nav.privacy}
        </a>
        {" · "}
        <a className="hover:text-text" href="/terms">
          {t.nav.terms}
        </a>
      </p>
    </div>
  );
}
