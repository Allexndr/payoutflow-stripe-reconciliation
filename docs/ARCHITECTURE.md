# Архитектура PayoutFlow

## Стек

| Слой | Технология |
|------|------------|
| Фреймворк | Next.js **16** (App Router, React Server Components где уместно) |
| Стили | Tailwind **v4** (`@import "tailwindcss"`), токены в `src/app/globals.css` |
| БД | **PostgreSQL** (целевой хостинг: Neon), **Drizzle ORM** (`src/db/schema.ts`, `drizzle.config.ts`) |
| Аутентификация | **Auth.js** v5 (`src/auth.ts`), стратегия **JWT**, Credentials provider |
| Платежи / Connect | **Stripe**: один секретный ключ для платформы; Connect OAuth для чтения connected account; Billing (Checkout, Portal) отдельно от Connect |
| Банк | **Plaid** Link + `transactions/sync`, токен в БД (опционально AES-GCM) |
| Email | **Resend** (алерты расхождений для Pro/Scale) |
| Аналитика | `@vercel/analytics` в `src/app/layout.tsx` |

## Структура каталогов (важное)

```
src/
├── app/                    # App Router: страницы + route handlers
│   ├── api/                # REST-подобные эндпоинты (см. API-REFERENCE.md)
│   ├── dashboard/          # Защищённые экраны
│   ├── settings/
│   ├── login/, register/
│   ├── privacy/, terms/
│   ├── layout.tsx          # Корневой layout, шрифты, Providers, Analytics
│   └── globals.css         # CSS-переменные темы, утилиты .pf-mesh и т.д.
├── auth.ts                 # Конфиг NextAuth: handlers, auth(), signIn, signOut
├── middleware.ts           # Auth + rate limit на /api/auth/*
├── components/             # UI: shell, header, формы, Plaid, billing, ui/*
├── lib/
│   ├── stripe.ts           # Ленивая инициализация Stripe SDK
│   ├── stripe-payouts.ts   # Загрузка payout + balance txns → payouts_cache
│   ├── plaid.ts, plaid-sync.ts
│   ├── payouts-service.ts  # getTierLimitedPayoutRows, listPayoutRowsForUser (фильтр/страницы), демо vs Stripe, лимит Free
│   ├── match.ts            # Чистая функция матчинга банка (канон — TZ §1.3)
│   ├── billing.ts          # Синхронизация подписки с users.sub_tier
│   ├── alerts.ts           # Email при discrepancy > 5% (Pro/Scale)
│   ├── email.ts
│   ├── token-crypto.ts     # Шифрование Plaid access token
│   ├── password.ts         # Argon2id + legacy bcrypt
│   ├── rate-limit.ts       # Upstash или in-memory для /api/auth
│   ├── demo-data.ts        # Демо payout/bank без Stripe
│   ├── parse-bank-csv.ts
│   └── format.ts
└── db/
    ├── index.ts            # getDb(), isDatabaseConfigured()
    └── schema.ts           # Drizzle-схема
```

## Слои ответственности

1. **UI (Server/Client)** — страницы запрашивают `auth()`, вызывают функции из `lib/*` или делают `fetch` к своим `/api/*`.
2. **Route handlers** (`app/api/**/route.ts`) — проверка сессии/webhook-подписи, вызов сервисов, JSON.
3. **Сервисы (`lib`)** — бизнес-логика без привязки к HTTP; матчинг и формат кэша — здесь.
4. **Drizzle** — единственный способ писать в Postgres (параметризованные запросы).

## Аутентификация и защита маршрутов

- **`src/auth.ts`**: Credentials → `authorize` грузит пользователя из БД, `verifyPassword` (динамический импорт argon2 внутри модуля `password.ts` — см. комментарии в файле про Edge).
- **`middleware.ts`**: оборачивает `auth()` из NextAuth; matcher: `/dashboard/*`, `/settings/*`, `/api/auth/*`. Для `/api/auth/*` дополнительно — **rate limit** (ключ по IP).
- **Защита страниц**: в `authorized` callback разрешён доступ к `/dashboard` и `/settings` только при сессии; API для чувствительных операций должны вызывать `auth()` и проверять `session.user.id` (см. аудит в API-REFERENCE).

## Поток: от регистрации до сверки

1. Регистрация → `POST /api/auth/register` → хеш пароля (Argon2id) → `users`.
2. Вход → Auth.js credentials → JWT-сессия.
3. Settings → Connect Stripe → OAuth → `users.stripe_account_id`.
4. Dashboard / refresh → `refreshStripePayoutsCache` → строки в `payouts_cache` с JSON `PayoutCachePayload`.
5. Plaid → exchange → опционально зашифрованный токен → `transactions/sync` → `bank_transactions`.
6. Отображение списка: чтение кэша + `matchPayoutToBank` для каждой строки против банковских транзакций пользователя.

## Stripe: два «мира»

- **Connect (connected account)** — чтение payout и balance transactions **клиента**; `stripe_account` в запросах API.
- **Платформа (Billing)** — подписка на сам продукт: Customers/Checkout/Portal на **аккаунте приложения**, не Connect. Webhook один endpoint, разные типы событий → см. `webhooks/stripe/route.ts`.

## Кэш payout и обновление

- Таблица `payouts_cache`: один ряд на пару `(user_id, payout_id)`, поле `data` — JSON с полями сумм, дат, строк breakdown.
- Обновление: по таймеру в `shouldRefreshPayoutCache` (~2 мин) при просмотре дашборда, кнопка «Sync Stripe», webhook `payout.*` на connected account.

## Соответствие ТЗ

Детали продуктовых решений и статус реализации — в [TZ.md](./TZ.md) (§1.3, §9).
