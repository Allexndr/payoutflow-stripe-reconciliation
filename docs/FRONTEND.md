# Фронтенд: маршруты и UI

## Страницы (App Router)

| Путь | Файл | Назначение |
|------|------|------------|
| `/` | `src/app/page.tsx` | Лендинг, публичный |
| `/login` | `app/login/page.tsx` | Форма входа + `LoginForm` |
| `/register` | `app/register/page.tsx` | Регистрация + `RegisterForm` |
| `/dashboard` | `app/dashboard/page.tsx` | Список payout, метрики, таблица + мобильные карточки. **Query:** `match=all\|matched\|review`, `page`, `from`, `to` (YYYY-MM-DD), `min`/`max` (cents), `q` (payout id substring). Компонент фильтра/пагинации: `components/payout-table-toolbar.tsx`. Значок **Manual** — рядом с matched, если это ручное подтверждение. |
| `/dashboard/payouts/[payoutId]` | `app/dashboard/payouts/[payoutId]/page.tsx` | Деталка: bank match (эвристика или manual), **Manual match panel** (выбор кандидата из top-N по `rankCandidates`), AI insight, **Comments**, breakdown, Activity (audit-log). |
| `/settings` | `app/settings/page.tsx` | Stripe, Plaid, биллинг, CSV |
| `/privacy`, `/terms` | `app/privacy/page.tsx`, `terms/page.tsx` | Юридические тексты |
| `not-found` | `app/not-found.tsx` | 404 |

Защищённые layout’ы: `dashboard/layout.tsx`, `settings/layout.tsx` — оборачивают в `AppShell` с `AppHeader`.

## Компоненты

| Компонент | Роль |
|-----------|------|
| `AppShell` | Хедер + `main` с отступами |
| `AppHeader` | Лого, Dashboard, Settings, Sign out (server component, `auth()`) |
| `DataRefreshBar` | Кнопки Sync Stripe / Sync bank (client, POST на API) |
| `PlaidLinkButton` | Получение link token, `react-plaid-link` |
| `BillingButtons` | Checkout Pro/Scale, Portal |
| `BankCsvUpload` | input file → `POST /api/bank/csv` |
| AI insight (server) | На деталке payout: блок `AI analyst insight` с summary + next actions (`src/lib/ai-insight.ts`) |
| `ManualMatchPanel` (client) | Выбор bank txn радио-группой, confirm/clear через `/api/payouts/[id]/match`. Использует `router.refresh()` для Server Components. |
| `CommentsPanel` (client) | Список + textarea, POST в `/api/payouts/[id]/comments`. Optimistic append + `router.refresh()`. |
| `PayoutTableToolbar` (client) | Tabs match + форма фильтров `from/to/min/max/q` (submit → `router.push`). |
| `ui/button`, `card`, `badge` | Примитивы; варианты в коде |

## Дизайн-система

- **Источник токенов:** `src/app/globals.css` — переменные `--canvas`, `--surface`, `--primary`, `--text`, `--muted`, акцент teal `--accent`, mesh `.pf-mesh`, секции `.pf-section-muted`.
- **Тема:** светлая, «богатый» off-white фон (не чистый `#fff` на весь экран); детали в комментариях в `globals.css`.
- **ТЗ §2.4** в `TZ.md` описывает старую тёмную палитру — актуальные значения в **`globals.css`** (при расхождении правит код).

## Адаптив

- Дашборд: таблица `hidden md:block`, карточки `md:hidden`.
- Хедер: часть подписей скрыта на узких экранах (`sm:inline`).

## Провайдеры

- `src/app/providers.tsx` — обёртка для клиентских провайдеров (SessionProvider и т.д., если используются).
