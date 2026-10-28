# Данные и потоки

## Таблицы (Drizzle: `src/db/schema.ts`)

### `users`

| Поле | Назначение |
|------|------------|
| `id` | UUID PK |
| `email` | Уникальный логин |
| `password_hash` | Argon2id (новые) или bcrypt (старые) |
| `stripe_account_id` | ID connected account после Connect OAuth |
| `plaid_access_token` | Секрет Plaid; в prod желательно шифровать (`TOKEN_ENCRYPTION_KEY` + `token-crypto.ts`) |
| `plaid_item_id` | Item из Plaid |
| `plaid_txn_cursor` | Курсор для `transactions/sync` |
| `sub_tier` | `free` \| `pro` \| `scale` |
| `stripe_customer_id` | Customer на **платформенном** Stripe для биллинга |
| `stripe_subscription_id` | Активная подписка Billing |

### `payouts_cache`

- Уникальность: `(user_id, payout_id)`.
- `data` — JSON, тип **`PayoutCachePayload`** (`src/lib/stripe-payouts.ts`):
  - `version: 1`
  - `payoutId`, `amountCents`, `currency`, `arrivalDate`, `expectedArrivalDate`, `status`, `txnCount`, `expectedNetCents`
  - `lines[]` — breakdown (charge/fee/refund), структура совместима с демо `DemoLine`

Любое изменение формата — bump `version` и миграция чтения в `cachePayloadToDemoPayout` / местах десериализации.

### `bank_transactions`

- Банковские строки после Plaid или CSV.
- `plaid_txn_id`: для CSV используется префикс `csv:…` (см. `bank/csv` route).
- Уникальность `(user_id, plaid_txn_id)`.

### `stripe_webhook_events`

- Идемпотентность: `event_id` уникален; повтор webhook не обрабатывает бизнес-логику второй раз.

### `discrepancy_alerts`

- Одна запись на `(user_id, payout_id)` после отправки email о расхождении (Pro/Scale).

### `payout_matches`

- Ручные подтверждения: одна запись на `(user_id, payout_id)`, `bank_txn_id` указывает на конкретную строку из `bank_transactions`.
- При наличии записи переопределяет эвристический матчинг в `payouts-service.matchToRow` (флаг `manual: true` на строке).
- `note` — до 500 символов, хранится как есть.

### `payout_comments`

- Свободные заметки по payout (журнал бухгалтерии). Без уникальности, сортировка по `created_at`.
- Лимит на body: 2000 символов, triming и slice на сервере.

### `payout_events`

- Аудит-лог действий: `entity/entityId/action`, JSON `meta`. Основа под SOC2 (кто подтвердил матч, когда снял override).
- Сейчас пишется: `match.confirmed`, `match.cleared`, `comment.added`.
- Новые действия добавлять через `recordEvent()` из `src/lib/overrides.ts`.

## Демо vs Live

| Условие | Поведение |
|---------|-----------|
| Нет `DATABASE_URL` | БД-функции отключены; регистрация/логин с БД не работают как в проде |
| Нет Stripe или нет `stripe_account_id` у пользователя | Список payout на дашборде строится из **`demo-data.ts`** + демо-банк для матчинга |
| Есть Connect + Stripe SDK | Кэш из API Stripe → `payouts_cache`; матчинг только по **`bank_transactions`** пользователя (не смешивается с демо-банком) |

## Алгоритм матчинга (`src/lib/match.ts`)

Канон совпадает с **TZ §1.3**:

1. Окно **±3 календарных дня** от даты arrival payout (строка `YYYY-MM-DD`, UTC через `parseYmd`).
2. Сумма банка: берётся **|amountCents|** (входящее в Plaid часто отрицательное).
3. Допуск по сумме: **±1%** от `expectedNetCents` (минимум 1 цент в формуле `tol`).
4. Оценка кандидата: `score = amountDiff * 1000 + days` (меньше — лучше).
5. Если лучший кандидат не уникален по `score` → `review`, reason `ambiguous`.
6. Если кандидатов нет → `review`, `no_candidate`.

`discrepancyRatio` при matched используется для процента на UI и алертов.

## Биллинг

- `sub_tier` обновляется из webhooks `customer.subscription.*` и после `checkout.session.completed` (`lib/billing.ts`).
- Лимит **Free** на UI: последние **5** payout по дате в списке (`applyFreeTierLimit` в `payouts-service.ts`). Полный «5 payout за календарный месяц» в ТЗ — **ещё не реализован** (см. TZ §9).

## Список payout на дашборде (`payouts-service.ts`)

- **`getTierLimitedPayoutRows(userId)`** — полный набор строк после лимита тарифа (5 или все из кэша), с посчитанным матчингом и применёнными overrides из `payout_matches`. Используется: алерты, CSV, внутри списка.
- **`listPayoutRowsForUser(userId, options?)`** — для UI. Опции:
  - `match`: `all` \| `matched` \| `review`
  - `from`, `to` — `YYYY-MM-DD`, фильтр по `arrivalDate`
  - `minCents`, `maxCents` — границы `amountCents`
  - `q` — case-insensitive подстрока payout id
  - `page` (Pro/Scale), `pageSize` (до 100)
  Метрики KPI (reconciled $, avg Δ%) считаются по **полному tier-набору**, без учёта фильтров таблицы.
- Пагинация: у Free один «экран» (до 5 строк); у Pro/Scale — страницы по 20 по умолчанию.

## Ручной resolve match

1. Пользователь открывает payout detail — сервер зовёт `rankCandidates(expectedNet, arrival, bankTxns, 10)` (окно ±7 дней, ±10%) и показывает **ManualMatchPanel**.
2. Отправка `POST /api/payouts/[id]/match` с `{ bankTxnId, note? }` → `setOverride()` пишет в `payout_matches` и `payout_events` (`match.confirmed`).
3. Следующий рендер дашборда/detail: `matchToRow` видит override и помечает строку `manual: true` + `matchStatus: matched`, с `discrepancyPercent`, посчитанным относительно реальной банковской суммы.
4. `DELETE` — `clearOverride()`, событие `match.cleared`.

## Алерты (`lib/alerts.ts`)

- Только `pro` / `scale`.
- Если для payout `discrepancyPercent > 5` и записи в `discrepancy_alerts` ещё нет — письмо через Resend и вставка строки.
