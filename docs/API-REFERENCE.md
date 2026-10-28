# Справочник API (Route Handlers)

Все пути относительно базового URL приложения. Где не указано — `Content-Type: application/json` для JSON.

## Auth.js

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| * | `/api/auth/[...nextauth]` | — | NextAuth: signin, signout, session, CSRF и т.д. |
| POST | `/api/auth/register` | — | Регистрация: `{ email, password }`, Zod; rate limit в middleware. |

Файл: `src/app/api/auth/[...nextauth]/route.ts`, `register/route.ts`.

## Stripe Connect

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| GET | `/api/stripe/connect` | Сессия | Редирект на OAuth Stripe Connect. |
| GET | `/api/stripe/connect/callback` | — | OAuth callback; пишет `stripe_account_id`, редирект в Settings. |

`src/lib/stripe.ts`, `connect/route.ts`, `connect/callback/route.ts`.

## Stripe webhooks

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/api/webhooks/stripe` | Подпись `Stripe-Signature` | `runtime: nodejs`. События: `checkout.session.completed`, `customer.subscription.updated/deleted`, `payout.paid/created/updated` (с `event.account` = connected account). Идемпотентность через `stripe_webhook_events`. |

Секрет: `STRIPE_WEBHOOK_SECRET`. Один endpoint на платформу: и Billing, и Connect payout.

## Payouts

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/api/payouts/refresh` | Сессия | Перезагрузка кэша payout из Stripe для текущего пользователя; нужен `stripe_account_id`. После — `runDiscrepancyAlertsForUser`. |
| GET | `/api/payouts/export` | Сессия | CSV экспорт tier-лимитированного набора. Query: **`match`** = `matched` \| `review`; **`from` / `to`** = `YYYY-MM-DD`; **`min` / `max`** = cents; **`q`** = подстрока payout id. Все фильтры комбинируются с AND. |
| POST | `/api/payouts/[payoutId]/match` | Сессия | Подтвердить конкретный bank txn как match для payout. Body: `{ bankTxnId: string, note?: string }`. Переопределяет эвристику, пишет запись в `payout_matches` и событие `match.confirmed` в `payout_events`. |
| DELETE | `/api/payouts/[payoutId]/match` | Сессия | Снять ручное подтверждение (остаётся эвристический результат). Событие `match.cleared`. |
| GET | `/api/payouts/[payoutId]/comments` | Сессия | Список комментариев по payout (asc по `createdAt`). |
| POST | `/api/payouts/[payoutId]/comments` | Сессия | Добавить комментарий. Body: `{ body: string }` (1–2000 символов). Событие `comment.added`. |

Дашборд: query **`match`**, **`page`**, **`from`**, **`to`**, **`min`**, **`max`**, **`q`** — см. [FRONTEND.md](./FRONTEND.md).

## Plaid

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/api/plaid/link-token` | Сессия | Создание link token для Plaid Link (клиент). |
| POST | `/api/plaid/exchange` | Сессия | Обмен `public_token` → access token в БД. |
| POST | `/api/plaid/sync` | Сессия | `transactions/sync` → `bank_transactions`. |

## Bank CSV

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/api/bank/csv` | Сессия | `multipart/form-data`, поле `file`; парсинг `parse-bank-csv.ts`, лимит размера в route. |

## Billing

| Метод | Путь | Auth | Описание |
|-------|------|------|----------|
| POST | `/api/billing/checkout` | Сессия | Тело `{ tier: "pro" \| "scale" }` → Stripe Checkout Session, metadata `userId`. |
| POST | `/api/billing/portal` | Сессия | Customer Portal для `stripe_customer_id`. |

---

**Правило:** любой эндпоинт с бизнес-данными пользователя должен вызывать `auth()` и сверять `session.user.id` с сущностями в БД. Webhook проверяет подпись, не сессию.
