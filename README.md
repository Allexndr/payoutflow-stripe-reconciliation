# PayoutFlow

Stripe payout reconciliation MVP: Connect → Plaid → dashboard with match status and CSV export.

- **Документация для разработки (архитектура, API, данные, деплой):** [docs/README.md](./docs/README.md)
- **Продуктовое ТЗ:** [docs/TZ.md](./docs/TZ.md)
- **Stack:** Next.js 16, Tailwind v4, Drizzle + Neon, Auth.js, Stripe, Plaid

## Quick start

```bash
npm install
cp .env.example .env.local
# Set DATABASE_URL (Neon), AUTH_SECRET, then:
npx drizzle-kit push
npm run dev
```

Register at `/register`, then open `/dashboard`.

- **Without Stripe Connect:** demo payouts and demo bank fixtures for matching.
- **With Stripe:** payouts are loaded into `payouts_cache` from the Stripe API (auto-refresh about every 2 minutes). Matching uses **only** rows in `bank_transactions` from **Plaid** or from a **CSV upload** in Settings (columns: Date, Amount, optional Description).

- **Analytics:** [Vercel Web Analytics](https://vercel.com/analytics) — enable the Analytics tab on your Vercel project (component is already in `layout.tsx`).

- **Legal:** `/privacy` and `/terms` — review with counsel before production.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npx drizzle-kit push` | Apply schema to Postgres |
| `npx drizzle-kit studio` | Open Drizzle Studio |

## Production notes

- Set `AUTH_SECRET`, Stripe Connect `client_id` + redirect URL, and Plaid webhook URLs as in `docs/TZ.md`.
- Encrypt `plaid_access_token` at rest before going live.
