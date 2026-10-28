# Источники интеграций

Справочник: **куда идти и что брать** для подключения каждой внешней системы. Один файл — один провайдер. Пишем сюда: где создать приложение, какой scope/разрешения, какие env-ключи, какие webhooks. Используем, когда приходит тикет "внедри X".

> **Правила:**
> - Все ключи кладём только в `.env.local` (или секреты Vercel). Никогда не в git.
> - Любой обмен токенами/секретами в БД шифруем (см. `src/lib/token-crypto.ts`).
> - Все webhook-эндпоинты верифицируем подписью до того, как прочитать тело.

---

## Stripe Connect (уже интегрировано)

- **Консоль:** https://dashboard.stripe.com/settings/connect
- **OAuth redirect:** `https://<host>/api/stripe/connect/callback`
- **Env:**
  - `STRIPE_SECRET_KEY` — начинается с `sk_live_` / `sk_test_`
  - `STRIPE_CLIENT_ID` — `ca_...`
  - `STRIPE_WEBHOOK_SECRET` — `whsec_...`
- **Webhook events:** `payout.*`, `checkout.session.completed`, `customer.subscription.*`.
- **Файлы:** `src/lib/stripe.ts`, `src/lib/stripe-payouts.ts`, `src/app/api/stripe/*`, `src/app/api/webhooks/stripe/route.ts`.

## Stripe Billing (уже интегрировано)

- **Продукт/цены:** создать в том же аккаунте, взять `price_...` и задать в конфиге тарифов.
- **Env:** `STRIPE_PRICE_PRO`, `STRIPE_PRICE_SCALE`.
- **Файлы:** `src/lib/billing.ts`, `src/app/api/billing/*`.

## Plaid (уже интегрировано)

- **Консоль:** https://dashboard.plaid.com/
- **Где создать продукт:** Team settings → Keys. Включить product **Transactions**.
- **Env:**
  - `PLAID_CLIENT_ID`
  - `PLAID_SECRET` (sandbox/development/production — разные)
  - `PLAID_ENV` = `sandbox` | `development` | `production`
  - `TOKEN_ENCRYPTION_KEY` — base64 32 байта для AES-GCM шифрования `access_token`
- **Файлы:** `src/lib/plaid.ts`, `src/lib/plaid-sync.ts`, `src/app/api/plaid/*`.

---

## PayPal (план)

- **Консоль:** https://developer.paypal.com/dashboard/applications/live
- **Нужен продукт:** _REST API apps_ → создать приложение → получить `Client ID` + `Secret`.
- **Env (план):**
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_CLIENT_SECRET`
  - `PAYPAL_ENV` = `sandbox` | `live`
- **API базы:** `https://api-m.sandbox.paypal.com` / `https://api-m.paypal.com`.
- **Что слушать (webhooks):**
  - `PAYMENT.PAYOUTSBATCH.SUCCESS` — завершение payout batch
  - `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` / `PAYMENT.PAYOUTS-ITEM.FAILED` — по каждой строке
  - Endpoint: `POST /api/webhooks/paypal`, верификация через `Verify Webhook Signature` API.
- **Для сверки нужно:** список payouts (ACH/SEPA) + balance transactions.
  - `POST /v2/payments/captures/{id}/refund` — для refund reconciliation
  - `GET /v1/reporting/transactions` — **главный endpoint для сверки** (до 31 дня за запрос).
- **Ссылки:**
  - https://developer.paypal.com/docs/api/transaction-search/v1/
  - https://developer.paypal.com/api/rest/webhooks/
- **Сложности:** пагинация по `next_page`, мультивалюта, `transaction_status` коды (`S`, `P`, `V`, `D`).

---

## Shopify (план)

Интересует Shopify как **источник выручки**: сопоставить Shopify payouts ↔ Shopify transactions ↔ банк.

- **Консоль:** https://partners.shopify.com/ (создать Partner-аккаунт → App → Create app → _Custom/Public_).
- **Scopes нужные для сверки:**
  - `read_orders`
  - `read_shopify_payments_payouts`
  - `read_shopify_payments_disputes`
  - `read_all_orders` (для архива > 60 дней — нужно одобрение Shopify)
- **Env (план):**
  - `SHOPIFY_API_KEY`
  - `SHOPIFY_API_SECRET`
  - Для каждого магазина храним `shop_domain` + `access_token` (шифруем через `token-crypto`).
- **Нужные endpoints:**
  - `GET /admin/api/2024-10/shopify_payments/payouts.json`
  - `GET /admin/api/2024-10/shopify_payments/balance/transactions.json`
  - `GET /admin/api/2024-10/orders.json?financial_status=paid`
- **Webhooks:** `payouts/paid`, `disputes/create`, `orders/paid` — `POST /api/webhooks/shopify`. Верифицировать `X-Shopify-Hmac-Sha256`.
- **Ссылки:**
  - https://shopify.dev/docs/api/admin-rest/2024-10/resources/payouts
  - https://shopify.dev/docs/apps/build/authentication-authorization

---

## Square (опционально)

- **Консоль:** https://developer.squareup.com/apps
- **Auth:** OAuth 2.0 (если не single merchant — нужен редирект).
- **Env:**
  - `SQUARE_APPLICATION_ID`
  - `SQUARE_APPLICATION_SECRET`
  - `SQUARE_ENV` = `sandbox` | `production`
- **Endpoints для сверки:**
  - `GET /v2/payouts`
  - `GET /v2/payouts/{id}/entries`
  - `GET /v2/settlements` (legacy)
- **Webhooks:** `payout.sent`, `payout.failed`.
- **Ссылка:** https://developer.squareup.com/reference/square/payouts-api

---

## QuickBooks Online / Xero (бухгалтерия)

Нужны для синхронизации подтверждённых matches как журнал-ентри.

### QuickBooks Online

- **Консоль:** https://developer.intuit.com/app/developer/myapps
- **Auth:** OAuth 2.0 + realm_id.
- **Env:** `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_ENV` (`sandbox`/`production`).
- **Scopes:** `com.intuit.quickbooks.accounting`.
- **Что писать:** `JournalEntry` с линиями Stripe/PayPal payouts → bank account.
- **Ссылка:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry

### Xero

- **Консоль:** https://developer.xero.com/app/manage
- **Auth:** OAuth 2.0 PKCE.
- **Env:** `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`.
- **Scopes:** `accounting.transactions`, `accounting.reports.read`.
- **Что писать:** `BankTransaction` + `ManualJournal`.
- **Ссылка:** https://developer.xero.com/documentation/api/accounting/overview

---

## Slack (уведомления)

- **Консоль:** https://api.slack.com/apps → Create New App → From scratch.
- **OAuth scopes:** `chat:write`, `incoming-webhook`, `channels:read` (или достаточно `incoming-webhook`, если только postMessage в настроенный канал).
- **Env:**
  - `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET` — если распространяем через OAuth.
  - Или per-workspace: `SLACK_WEBHOOK_URL` (хранится в БД по пользователю/организации).
- **Куда шлём:** алерты о discrepancy > threshold, новые review payouts, failed sync.
- **Формат:** Block Kit (заголовок + fields + action button в наш dashboard).
- **Ссылка:** https://api.slack.com/messaging/webhooks

---

## Email (уже интегрировано через Resend)

- **Консоль:** https://resend.com/domains
- **Env:** `RESEND_API_KEY`, `RESEND_FROM`.
- **Файл:** `src/lib/email.ts`, `src/lib/alerts.ts`.
- **Альтернативы:** Postmark (`POSTMARK_TOKEN`), SendGrid.

---

## Аналитика

- **Vercel Analytics** — подключено, env не нужен, достаточно `@vercel/analytics`.
- **PostHog (план):**
  - **Консоль:** https://app.posthog.com/project/settings.
  - **Env:** `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`.
  - События: `payout_viewed`, `match_confirmed`, `csv_uploaded`, `plan_upgraded`, `alert_sent`.

## Очередь задач (план)

Нужна чтобы `POST /api/payouts/refresh` и Plaid sync не вис на 15+ секундах в hot path.

- **Inngest** — https://app.inngest.com/ (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`). Идеально для Next.js.
- **QStash (Upstash)** — уже используем Upstash для rate-limit, можно доставлять webhooks.
  - Env: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`.

---

## Rate limiting / Cache (уже интегрировано)

- **Upstash Redis:** https://console.upstash.com/redis
- **Env:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **Файлы:** `src/lib/rate-limit.ts`.

## AI / LLM

- **Hugging Face Inference API** (уже интегрировано как опция):
  - **Токен:** https://huggingface.co/settings/tokens
  - **Env:** `HF_API_TOKEN`, `HF_LLM_MODEL` (например `google/flan-t5-small`), `HF_INFERENCE_URL`.
  - **Fallback:** локальная эвристика в `src/lib/ai-insight.ts`.
- **OpenAI API (опционально):**
  - https://platform.openai.com/api-keys
  - Env: `OPENAI_API_KEY`, `OPENAI_MODEL`. Модель класса `gpt-4o-mini` хватает для 3-строчных выводов.

---

## Процесс добавления новой интеграции

1. Создать приложение в консоли провайдера, записать sandbox/test ключи.
2. Обновить этот файл: консоль, scopes, env, webhooks.
3. Добавить ключи в `.env.example` (пустыми).
4. Завести модуль `src/lib/<provider>.ts` с клиентом и типами.
5. Если нужны webhooks — `src/app/api/webhooks/<provider>/route.ts` с верификацией подписи.
6. Если токены live — шифровать через `src/lib/token-crypto.ts`.
7. Описать новые поля БД (если нужны) в `schema.ts` + `DATA-AND-FLOWS.md`.
8. Обновить `API-REFERENCE.md` и `OPERATIONS.md`.
