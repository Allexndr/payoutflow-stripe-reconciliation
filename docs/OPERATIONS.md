# Эксплуатация и окружение

## Переменные

Полный список с комментариями — **`.env.example`** в корне репозитория.

Критичные группы:

| Группа | Переменные | Заметки |
|--------|------------|---------|
| Приложение | `NEXT_PUBLIC_APP_URL` | Базовый URL для редиректов OAuth и ссылок |
| БД | `DATABASE_URL` | Neon Postgres (SSL) |
| Auth | `AUTH_SECRET` | Обязателен в проде; без него `/api/auth/session` падает |
| Rate limit | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Рекомендуется для прод: единый лимит по IP на serverless |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_CLIENT_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_SCALE` | Connect redirect URI настраивается в Dashboard Stripe |
| Plaid | `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` | sandbox / production |
| Шифрование | `TOKEN_ENCRYPTION_KEY` | 32 байта base64 для Plaid token at rest |
| Почта | `RESEND_API_KEY`, `RESEND_FROM` | Алерты Pro/Scale |
| AI (optional) | `HF_API_TOKEN`, `HF_LLM_MODEL`, `HF_INFERENCE_URL` | Лёгкие AI-insights для payout detail; при недоступности работает локальный heuristic fallback |

`src/lib/env.ts` — частичная Zod-валидация (не все ключи из .env).

## Команды

```bash
npm run dev          # dev server
npm run build        # production build
npx drizzle-kit push # применить схему к БД (нужен для новых таблиц payout_matches / payout_comments / payout_events)
npx drizzle-kit studio
```

> После добавления/апдейта таблиц в `src/db/schema.ts` всегда прогонять `drizzle-kit push` на каждом окружении.

## Webhooks Stripe

1. В Dashboard создать endpoint на `https://<домен>/api/webhooks/stripe`.
2. Выбрать события: Billing (`checkout.session.completed`, `customer.subscription.*`) и Connect (`payout.paid`, `payout.created`, `payout.updated`) при необходимости.
3. Скопировать signing secret в `STRIPE_WEBHOOK_SECRET`.

## Деплой (типично Vercel)

- Подключить репозиторий, задать env в UI.
- Убедиться, что `AUTH_SECRET` и `DATABASE_URL` заданы.
- После смены домена — обновить redirect URI в Stripe и Plaid.

## Безопасность

См. **[SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md)** (Argon2, rate limit, заголовки в `next.config.ts`, секреты не в git).

## Известные нюансы

- **Middleware / proxy:** Next 16 может предупреждать о переходе с `middleware.ts` на `proxy` — следить за релизными заметками Next.js.
- **Argon2 и Edge:** в `password.ts` нет top-level импорта нативного `argon2`, чтобы не ломать Edge-бандл; логика хеширования выполняется в Node (register / authorize).

## Тесты

В ТЗ заложены юнит-тесты на `matchPayoutToBank` и E2E — в репозитории могут отсутствовать; при добавлении — описать в этом файле или в `README` CI.

## Интеграции на будущее

Справочник по источникам и ключам для PayPal, Shopify, Square, QuickBooks Online, Xero, Slack, PostHog и очередей (Inngest/QStash) — **[INTEGRATIONS-SOURCES.md](./INTEGRATIONS-SOURCES.md)**. Добавлять новые интеграции по процедуре, описанной в конце этого файла.
