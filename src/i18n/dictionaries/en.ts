const messages = {
  common: {
    appName: "PayoutFlow",
    signIn: "Sign in",
    signOut: "Sign out",
    getStarted: "Get started",
    home: "Home",
    back: "Back",
    cancel: "Cancel",
    save: "Save",
    apply: "Apply",
    reset: "Reset",
    loading: "Loading…",
    saving: "Saving…",
    comingSoon: "Coming soon",
    language: "Language",
    yes: "Yes",
    no: "No",
  },
  nav: {
    dashboard: "Dashboard",
    settings: "Settings",
    privacy: "Privacy",
    terms: "Terms",
  },
  landing: {
    badge: "Stripe + bank reconciliation for growing teams",
    h1a: "Stop reconciling payouts in",
    h1b: "spreadsheets",
    subtitle:
      "Connect Stripe and your bank once. Every payout — charges, fees, refunds — matched to bank deposits. Clear status, no noise.",
    ctaPrimary: "Start free",
    ctaSecondary: "I have an account",
    tagline: "Free: 5 payouts visible · Pro from $19 · Demo works without a card",
    features: {
      stripeTitle: "One-click Stripe",
      stripeDesc:
        "Standard Connect OAuth. We store only what we need to fetch payouts and balance transactions.",
      bankTitle: "Bank match",
      bankDesc:
        "Plaid brings in real bank transactions; we match by amount and date window. CSV upload as fallback.",
      secureTitle: "No raw card data",
      secureDesc:
        "Tokens encrypted at rest in production. PCI scope stays with Stripe and Plaid.",
    },
    bullets: {
      heading: "Built for operators who ship",
      ui: "Calm UI — tables and cards that read well on phone and desktop",
      sorting: "Sortable payouts with discrepancy % at a glance",
      csv: "CSV export your accountant will actually use",
      pro: "Pro: email when a payout drifts more than 5%",
    },
    specNote: "Product spec",
    footerDisclaimer: "Not affiliated with Stripe Inc.",
  },
  auth: {
    emailLabel: "Email",
    passwordLabel: "Password",
    signingIn: "Signing in…",
    creatingAccount: "Creating account…",
    createAccount: "Create account",
    loginTitle: "Sign in",
    loginSubtitle: "Welcome back.",
    registerTitle: "Create your account",
    registerSubtitle: "Free tier: 5 payouts visible, demo works without a card.",
    noAccount: "No account?",
    haveAccount: "Have an account?",
    createAccountLink: "Create one",
    signInLink: "Sign in",
    invalidCredentials: "Invalid email or password.",
    registrationFailed: "Registration failed.",
    accountCreated: "Account created. Sign in below.",
    passwordHint: "At least 8 characters.",
  },
  notFound: {
    code: "404",
    title: "Page not found",
  },
  dashboard: {
    title: "Payouts",
    subtitle:
      "Reconciliation status per payout. Free plan lists up to 5 recent payouts; Pro/Scale see full cache with pagination. Sync refreshes Stripe data; bank match uses Plaid or CSV.",
    upgradeBanner: "You are on the Free plan: only the 5 most recent payouts are visible.",
    upgradeCta: "Upgrade",
    empty: "No payouts match this filter.",
    showAll: "Show all",
    emptyConnect:
      "No payouts loaded. Connect Stripe in Settings, then use Sync Stripe. Link your bank and run Sync bank for live matching.",
    exportCsv: "Export CSV",
    downloadCsv: "Download CSV",
    respectsFilter: "Respects current filter",
    reconciledMatched: "Reconciled (matched)",
    avgDiscrepancy: "Avg discrepancy",
    payoutsCount: "payouts",
    acrossMatched: "Across matched rows (tier)",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    syncStripe: "Sync Stripe",
    syncBank: "Sync bank",
    syncStripeTitle: "Re-fetch payouts from Stripe into cache",
    syncBankTitle: "Pull latest bank transactions from Plaid",
    stripeSyncFailed: "Stripe sync failed",
    bankSyncFailed: "Bank sync failed",
    totals: {
      all: "All",
      matched: "Matched",
      review: "Review",
      manual: "Manual",
    },
    filters: {
      match: "Match",
      all: "All",
      matched: "Matched",
      review: "Review",
      from: "From",
      to: "To",
      minCents: "Min (cents)",
      maxCents: "Max (cents)",
      search: "Payout ID",
      page: "Page",
      apply: "Apply",
      reset: "Reset",
      previous: "Previous",
      next: "Next",
      of: "of",
      filtered: "filtered",
      zeroPayouts: "0 payouts",
      payoutSingular: "payout",
      payoutPlural: "payouts",
      filterAriaLabel: "Filter by match status",
    },
    table: {
      payoutId: "Payout",
      amount: "Amount",
      arrival: "Arrival",
      expected: "Expected",
      txns: "Txns",
      diff: "Δ%",
      status: "Status",
      manualBadge: "Manual",
    },
    banner: {
      connectPrompt:
        "Connect your bank to see real deposits matched against your Stripe payouts.",
      connectCta: "Go to Settings",
    },
  },
  payoutDetail: {
    back: "Back to payouts",
    arrival: "Arrival",
    bankMatchHeading: "Bank match",
    totalsHeading: "Totals",
    manualMatchHeading: "Manual match",
    manualMatchHint:
      "Pick the bank line and confirm — it overrides the heuristic match.",
    aiInsightHeading: "AI analyst insight",
    aiSourceHf: "Enhanced AI",
    aiSourceFast: "Fast AI",
    aiConfidenceHigh: "high confidence",
    aiConfidenceMedium: "medium confidence",
    commentsHeading: "Comments",
    breakdownHeading: "Breakdown",
    activityHeading: "Activity",
    summary: "Summary",
    expected: "Expected net",
    actual: "Actual (bank)",
    discrepancy: "Discrepancy",
    status: "Status",
    bankMatch: "Bank match",
    manualTag: "Manual",
    manualNote: "Note",
    reviewReason: "Reason",
    noMatch: "No matching bank transaction yet.",
    bankTxn: "Bank txn",
    expectedNetLabel: "Expected net",
    bankAmount: "Bank amount",
    expectedNetStripe: "Expected net (Stripe)",
    payoutAmount: "Payout amount",
    noCandidateWindow:
      "No bank transaction within ±3 days and ±1% of expected net.",
    ambiguousCandidates:
      "Multiple possible matches — confirm manually below.",
    statusMatched: "Matched",
    statusReview: "Review",
    manualMatch: {
      title: "Manual match resolver",
      subtitle:
        "Pick the bank transaction that actually settled this payout. Heuristic suggestions are on top.",
      expectedPrefix: "Expected net:",
      chooseBankLine: "Choose the bank line that pays this payout and confirm.",
      noCandidates:
        "No bank candidates within ±7 days / ±10%. Run Sync bank or upload a CSV.",
      current: "Current",
      exact: "Exact",
      unnamed: "(unnamed bank txn)",
      noteLabel: "Note (optional)",
      notePlaceholder: "e.g. confirmed against BofA statement page 2",
      confirm: "Confirm match",
      confirming: "Saving…",
      clear: "Clear override",
      clearing: "Clearing…",
      saveError: "Could not save confirmation",
      clearError: "Could not clear",
    },
    breakdown: {
      id: "ID",
      type: "Type",
      customer: "Customer",
      amount: "Amount",
      fee: "Fee",
      net: "Net",
      types: {
        charge: "charge",
        refund: "refund",
        fee: "fee",
        adjustment: "adjustment",
        payout: "payout",
      },
    },
    noActivity: "No events yet.",
    comments: {
      empty: "No comments yet. Leave an accounting note for audit trail.",
      placeholder: "Add a note…",
      post: "Post",
      posting: "…",
      saveError: "Could not save comment",
    },
  },
  settings: {
    title: "Settings",
    subtitle: "Manage your Stripe, bank, billing and account preferences.",
    signedInAs: "Signed in as",
    stripe: {
      title: "Stripe",
      description:
        "Connect with Standard Connect OAuth to read payouts and balance transactions.",
      connect: "Connect Stripe",
      reconnect: "Reconnect Stripe",
      connected: "Connected",
      notConnected: "Not connected",
      disconnect: "Disconnect",
      connectedBanner: "Stripe account connected successfully.",
      errorBanner:
        "Stripe connection failed. Check keys and redirect URL in the Stripe dashboard.",
    },
    bank: {
      title: "Bank (Plaid)",
      plaidDescription:
        "Link your business account so we can match payouts to bank deposits. Tokens are stored encrypted in production.",
      plaidConnect: "Connect bank (Plaid)",
      plaidPreparing: "Preparing Plaid…",
      plaidLoadingTitle: "Loading bank link…",
      plaidOpenTitle: "Open Plaid Link to choose your institution",
      plaidNotConfigured: "Plaid is not configured.",
      plaidSaveFailed: "Could not save bank connection.",
      plaidLinked: "Linked",
      plaidNotLinked: "Not linked",
      plaidConnectedBanner: "Bank linked via Plaid.",
      csvTitle: "Bank CSV (fallback)",
      csvLabel: "Upload bank CSV",
      csvA11y: "Upload bank CSV",
      csvTitleHint:
        "Replace previous CSV import; requires Date and Amount columns",
      csvHeadersHint:
        "Headers should include Date and Amount (optional: Description). Replaces any earlier CSV import for this account.",
      csvDescription:
        "If Plaid does not cover your bank, export a CSV with columns Date, Amount, and optionally Description. This replaces any previous CSV import for your account.",
      csvUploadFailed: "Upload failed",
    },
    billing: {
      title: "Billing",
      description:
        "Free includes the 5 most recent payouts in the list. Pro and Scale unlock the full list, discrepancy email alerts (>5%), and priority support (Scale).",
      currentPlan: "Current plan",
      pro: "Pro — $19/mo",
      scale: "Scale — $49/mo",
      manage: "Manage subscription",
      checkoutFailed: "Checkout failed",
      portalFailed: "Portal failed",
      successBanner:
        "Subscription updated. It may take a few seconds for your plan to refresh.",
      cancelBanner: "Checkout canceled — no charges were made.",
    },
    account: {
      title: "Account",
      email: "Email",
    },
    back: "Back to dashboard",
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: April 8, 2026",
    overviewHeading: "Overview",
    overview:
      "PayoutFlow (\"we\", \"us\") helps you reconcile Stripe payouts with your bank. This policy describes what we collect, why, and your choices.",
    dataHeading: "Data we process",
    dataAccount:
      "Account: email and authentication data you provide at sign-up.",
    dataStripe:
      "Stripe: connected account identifiers and payout-related data we fetch via Stripe APIs, as permitted by your connection.",
    dataPlaidPrefix: "Plaid / bank: access tokens and transaction metadata needed to match payouts; tokens are encrypted when",
    dataPlaidSuffix: "is configured.",
    dataCsv:
      "Optional CSV uploads you provide for bank lines (processed only to run reconciliation).",
    legalHeading: "Legal bases & retention",
    legal:
      "We process data to deliver the service you request and, where applicable, for legitimate interests in operating and securing the product. We retain data as long as your account is active and for a short period afterward for backups and legal compliance, unless a longer period is required by law.",
    subprocessorsHeading: "Subprocessors",
    subprocessors:
      "We rely on infrastructure and payment partners (e.g. hosting, Stripe, Plaid, email delivery). Their processing is governed by their terms and, where applicable, standard contractual clauses.",
    rightsHeading: "Your rights",
    rights:
      "Depending on your jurisdiction, you may have rights to access, correct, delete, or export your data, and to object to certain processing. Contact us using the details you use for support to exercise these rights.",
    contactHeading: "Contact",
    contact:
      "Questions about this policy: use your account email and reach out through the support channel listed in the product.",
    linkToTerms: "Terms of Service",
  },
  terms: {
    title: "Terms of Service",
    lastUpdated: "Last updated: April 8, 2026",
    agreementHeading: "Agreement",
    agreement:
      "By using PayoutFlow (\"Service\"), you agree to these terms. If you use the Service on behalf of a company, you represent that you have authority to bind that company.",
    serviceHeading: "The Service",
    service:
      "We provide tools to connect third-party financial services (such as Stripe and Plaid), display payout information, and help reconcile transactions. We do not provide legal, tax, or accounting advice. You remain responsible for your books and compliance obligations.",
    accountsHeading: "Accounts & security",
    accounts:
      "You are responsible for safeguarding credentials and for activity under your account. Notify us promptly of unauthorized use.",
    feesHeading: "Fees",
    fees:
      "Paid plans are billed according to the pricing presented at checkout (Stripe). You authorize us and our payment partners to charge your payment method on file for applicable fees.",
    disclaimerHeading: "Disclaimer",
    disclaimer:
      'The Service is provided "as is" without warranties of any kind, to the maximum extent permitted by law. We do not warrant uninterrupted or error-free operation.',
    liabilityHeading: "Limitation of liability",
    liability:
      "To the maximum extent permitted by law, our total liability arising out of or related to the Service is limited to the amounts you paid us in the twelve months before the claim, or fifty US dollars, whichever is greater.",
    changesHeading: "Changes",
    changes:
      "We may update these terms. We will post the revised version with an updated date. Continued use after changes constitutes acceptance.",
    linkToPrivacy: "Privacy Policy",
  },
  languageSwitcher: {
    label: "Language",
    change: "Change language",
  },
  aiInsight: {
    matchedTitle: "AI reconciliation verdict: healthy match",
    matchedSummary:
      "This payout is already reconciled with a bank transaction inside the configured date and amount window.",
    matchedActionKeep: "Keep as matched; difference is {{delta}} ({{deltaPct}}%).",
    matchedActionTemplate:
      "Use this payout as a template when reviewing similar future cases.",
    noCandidateTitle:
      "AI reconciliation verdict: no bank candidate found",
    noCandidateSummary:
      "No transaction matched the payout in the current tolerance (±3 days, ±1%). This is often timing drift, payout split/merge, or manual bank movement.",
    noCandidateAction1: "Run Sync bank first, then re-check this payout.",
    noCandidateAction2:
      "Search bank lines in a wider date window (up to +7 days) and close amount to expected net.",
    noCandidateAction3:
      "If still missing, mark as exception and add an accounting note.",
    ambiguousTitle: "AI reconciliation verdict: ambiguous candidates",
    ambiguousSummary:
      "Multiple bank transactions look equally plausible. Manual confirmation is required to prevent silent mismatch.",
    ambiguousAction1:
      "Prioritize the candidate with the closest amount to expected net.",
    ambiguousAction2:
      "If amounts tie, choose the transaction with date closest to arrival date.",
    ambiguousAction3:
      "Add a short note after manual selection for audit clarity.",
  },
} as const;

/** Widen literal string values from `messages` so other locales can assign their own strings. */
type Widen<T> = T extends string
  ? string
  : { [K in keyof T]: Widen<T[K]> };

export type Messages = Widen<typeof messages>;

const widened: Messages = messages;
export default widened;
