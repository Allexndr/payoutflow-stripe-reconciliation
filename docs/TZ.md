про# Техническое задание: PayoutFlow

**Версия:** 1.1  
**Продукт:** SaaS-сверка выплат Stripe с банковскими поступлениями (Plaid + CSV fallback).  
**Стек:** Next.js 16 (App Router), Vercel, Postgres (Neon), Drizzle ORM, Stripe Connect + Billing, Plaid Link, Auth.js.

---

## 1. Цели и границы MVP

### 1.1 Цель

Дать владельцу SMB **один экран**: какие payout’ы пришли в банк, из каких charge/fee/refund они сложены, где расхождение — без Excel.

### 1.2 Вне MVP (v1.x)

- Мульти-процессор (PayPal, Shopify)  
- AI-объяснение расхождений  
- Полноценные команды/роли (частично в Scale)

### 1.3 Канонические решения (зафиксировать в коде)

| Тема | Решение v1 |
|------|------------|
| Stripe Connect | **Standard** Connect: OAuth `stripe_connect` scope, храним `stripe_user_id` (connected account id). |
| Данные payout | `GET /v1/payouts` на connected account + `balance_transactions` с `payout` в цепочке; кэш в `payouts_cache`. |
| Plaid | **Transactions** продукт: Link → `item/public_token/exchange` → `transactions/sync` (или `transactions/get` в sandbox); токены в БД, **в prod — шифрование поля** (KMS или AES-256-GCM с `TOKEN_ENCRYPTION_KEY`). |
| Матчинг банка | Один алгоритм: окно дат **±3 календарных дня** от `payout.arrival_date` (UTC), сумма **±1%** от ожидаемого net; при нескольких кандидатах — минимальная \|Δсумма\|, затем минимальная \|Δдата\|. |
| Ожидаемый net | Сумма `net` по balance transactions, относящимся к payout (согласно данным Stripe; уточнение в коде по `payout` id / reporting category). |
| Биллинг продукта | Отдельный Stripe **платёжный аккаунт приложения** (не Connect-клиента): Checkout + Customer Portal; лимиты Free по **календарному месяцу UTC**. |

---

## 2. Пользовательские сценарии и UX

### 2.1 Онбординг (3 шага, без туториалов)

1. **Регистрация** — email + пароль (zod), опционально magic link позже.  
2. **Stripe** — одна кнопка «Подключить Stripe», OAuth return, сохранение `stripe_account_id`.  
3. **Банк** — Plaid Link (мобильный: поддержка OAuth банков + QR где доступно). После успеха — фоновая синхронизация транзакций и **первая таблица payout’ов** (скелетон ≤ 2 с).

### 2.2 Экраны

| Маршрут | Содержание |
|---------|------------|
| `/` | Лендинг: value prop, демо (видео/скрин), CTA, trust strip. |
| `/login`, `/register` | Минимальные формы, без лишних полей. |
| `/dashboard` | Метрики: сверено $, средняя Δ%, кол-во «Review»; таблица последних 30 payout’ов; фильтр статуса; мобильная карточная вьюха. |
| `/dashboard/payouts/[id]` | Breakdown: Charges / Fees / Refunds / Итог; блок «Bank match» с датой/суммой/статусом. |
| `/settings` | Stripe: подключить/отключить; Plaid: переподключить; Billing: план; экспорт истории; CSV bank fallback. |

### 2.3 UX-принципы (anti–cognitive load)

- **Один акцентный цвет** на действие (primary); предупреждения — отдельный токен, не кричащий.  
- **Пустые состояния:** пошаговые подсказки (подключить Stripe → банк), без модалок > 1 поля.  
- **Таблицы:** на мобильке карточки с теми же полями; сортировка по дате/сумме/статусу.  
- **Доступность:** видимый focus, `aria-label` на иконках, контраст WCAG AA для текста.  
- **Ошибки сети:** toast + retry, не молчаливый fail.  
- **Скелетоны** при загрузке списков и деталей.

### 2.4 Визуальная система (PayoutFlow)

**Актуальная тема:** светлая, «богатый» off-white фон (canvas / секции), фиолетово-синий primary, teal-акценты; mesh-hero и токены в **`src/app/globals.css`**. Шрифты: Geist Sans + Geist Mono для сумм/ID.

Подробности и структура UI: **[FRONTEND.md](./FRONTEND.md)**. Таблица токенов ниже — **историческая** (тёмная тема); при расхождении с кодом приоритет у `globals.css`.

| Токен (legacy ref.) | Было (тёмная тема) |
|---------------------|-------------------|
| `--canvas` | `#0B0F17` |
| `--primary` | teal CTA `#2DD4BF` |

---

## 3. Функциональные требования

### 3.1 US-1 — Stripe Connect

- OAuth; сохранение `stripe_account_id` у пользователя.  
- Webhook `payout.paid` / `payout.created` → очередь обновления кэша (или синхронный refresh по кнопке «Обновить»).

### 3.2 US-2 — Plaid

- Link, exchange, сохранение `access_token` (шифрование в prod).  
- CRON или on-demand: синхронизация транзакций за последние 90 дней, дедуп по `transaction_id`.

### 3.3 US-3 — Список payout’ов

Колонки: Payout ID, Amount, Expected arrival vs actual (если известно), # txns, Discrepancy %, Status (matched / review).

### 3.4 US-4 — Детализация + матчинг

- Таблица charge/fee/refund/net.  
- Матчинг с банком по алгоритму из §1.3.

### 3.5 US-5 — CSV

- Экспорт выбранных или всех отфильтрованных payout’ов для бухгалтерии.

### 3.6 US-6 — Алерты Pro

- Email при discrepancy > 5% (Resend/SendGrid); триггер после расчёта.

### 3.7 Биллинг

- **Free:** до 5 payout’ов / календарный месяц.  
- **Pro $19:** безлимит payout’ов, алерты.  
- **Scale $49:** + приоритетная поддержка (поле в БД), командные фичи позже.

---

## 4. Нефункциональные требования

- TTFB списка < 2 с при кэше; детальный breakdown — пагинация по balance txns если > 100.  
- Секреты только в env; логи без PAN/полного токена Plaid.  
- Rate limits Stripe: экспоненциальный backoff + кэш.

---

## 5. Схема БД (Postgres)

Таблицы: `users`, `payouts_cache`, `bank_transactions`, опционально `stripe_events` для идемпотентности webhooks.

Детали в `src/db/schema.ts`.

---

## 6. Тестирование

- Юнит: `matchPayoutToBank` — граничные случаи (несколько кандидатов, refund, разные TZ).  
- E2E: Stripe test mode + Plaid sandbox (отдельный job).  
- Нагрузка: 100 параллельных GET `/dashboard` (k6 или Artillery) — post-MVP.

---

## 7. Launch checklist

- [ ] Домен + SSL (Vercel)  
- [ ] Stripe live + Connect settings  
- [ ] Plaid production  
- [ ] Privacy Policy / ToS  
- [ ] PostHog или Vercel Analytics  
- [ ] Алерты на падение webhooks  

---

## 8. Навыки команды / агента

- Next.js App Router, Server Actions (по необходимости), TypeScript.  
- Stripe SDK (Connect + Billing), Plaid Node SDK.  
- Drizzle + Postgres, Zod.  
- Дизайн-система на Tailwind v4 + CSS variables.

---

*Документ является источником правды для реализации v1; изменения — через PR с обновлением версии секции.*

---

## 9. Статус реализации (репозиторий)

| Область | Статус |
|--------|--------|
| Дизайн-токены UI (светлая тема) | `src/app/globals.css`, см. [FRONTEND.md](./FRONTEND.md) |
| Регистрация / вход | Credentials + JWT, `register` API |
| Dashboard / детализация / CSV | Демо-данные + матчинг `src/lib/match.ts`; фильтр Matched/Review + пагинация (Pro/Scale) — `listPayoutRowsForUser`, `PayoutTableToolbar` |
| Stripe Connect OAuth + callback | `api/stripe/connect`, сохранение `stripe_account_id` |
| Webhook Stripe | Идемпотентность по `event_id`, заготовка refresh |
| Plaid Link + exchange | `link-token`, `exchange`, кнопка в Settings |
| Fetch live payouts из Stripe | `refreshStripePayoutsCache` — payouts + balance txns → `payouts_cache` |
| Plaid → `bank_transactions` | `transactions/sync` в `syncPlaidTransactionsForUser`, курсор в `users.plaid_txn_cursor` |
| Ручной sync | `POST /api/payouts/refresh`, `POST /api/plaid/sync`, кнопки на dashboard |
| Ручное подтверждение match | `POST/DELETE /api/payouts/[id]/match`, таблица `payout_matches`, UI `ManualMatchPanel` |
| Комментарии к payout | `GET/POST /api/payouts/[id]/comments`, таблица `payout_comments`, UI `CommentsPanel` |
| Аудит-лог | Таблица `payout_events`, helper `recordEvent()`, блок Activity на деталке |
| Фильтры на дашборде | `match`, `from`, `to`, `min`, `max`, `q` в `listPayoutRowsForUser` и `/api/payouts/export` |
| AI insight | `src/lib/ai-insight.ts`: эвристика + optional HF Inference API (env `HF_API_TOKEN`) |

**Сделано в коде:** шифрование Plaid (`TOKEN_ENCRYPTION_KEY` + `src/lib/token-crypto.ts`), Stripe Billing (Checkout + Portal + webhooks → `sub_tier` / `stripe_subscription_id`), лимит Free (5 строк в списке), Pro/Scale email при `discrepancyPercent > 5%` (Resend), обновление кэша payout по webhook `payout.*` на Connect account.

**Дополнительно в коде:** CSV fallback (`POST /api/bank/csv`, парсер `src/lib/parse-bank-csv.ts`), страницы `/privacy` и `/terms`, Vercel Analytics (`@vercel/analytics` в root layout).

**Опционально позже:** PostHog, очередь (Inngest/QStash) для webhook refresh, строгий лимит Free по календарному месяцу UTC, интеграции PayPal/Shopify/Square/QuickBooks/Xero/Slack — см. [INTEGRATIONS-SOURCES.md](./INTEGRATIONS-SOURCES.md).
