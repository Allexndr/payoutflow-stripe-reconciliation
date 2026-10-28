# Документация PayoutFlow

**Назначение:** единая точка входа для понимания продукта, архитектуры и деталей реализации — чтобы дорабатывать проект без потери контекста.

| Документ | Содержание |
|----------|------------|
| **[TZ.md](./TZ.md)** | Продуктовое ТЗ: цели MVP, сценарии, канонические решения (Stripe/Plaid/матчинг), статус фич. **Источник правды по продукту.** |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Стек, структура репозитория, слои, потоки данных (auth → dashboard → Stripe/Plaid), ключевые модули. |
| **[DATA-AND-FLOWS.md](./DATA-AND-FLOWS.md)** | Схема БД, формат `payouts_cache.data`, алгоритм матчинга, демо vs live. |
| **[API-REFERENCE.md](./API-REFERENCE.md)** | Все HTTP API: метод, авторизация, тело/ответы, связанные файлы. |
| **[FRONTEND.md](./FRONTEND.md)** | Маршруты UI, компоненты, дизайн-токены (`globals.css`), адаптив. |
| **[OPERATIONS.md](./OPERATIONS.md)** | Переменные окружения, деплой, webhooks, безопасность, типичные проблемы. |
| **[SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md)** | Чеклист перед продом и OWASP-ориентированные пункты. |
| **[PRODUCT-VISION-ROLES.md](./PRODUCT-VISION-ROLES.md)** | Зрелость сверки, типичный backlog, модель org/ролей, матрица прав, связь с тарифами. |
| **[INTEGRATIONS-SOURCES.md](./INTEGRATIONS-SOURCES.md)** | Куда идти, какие ключи, какие webhooks для Stripe/Plaid/PayPal/Shopify/Square/QuickBooks/Xero/Slack/HF/OpenAI. |
| **[TESTING.md](./TESTING.md)** | Vitest (unit + pentest) + Playwright (E2E), команды, что чем покрыто. |
| **[I18N.md](./I18N.md)** | i18n-архитектура: cookie + `Accept-Language`, как добавить новый язык, где хранятся словари. |

**Быстрый старт для разработчика:** корневой [README.md](../README.md) → `.env.example` → `npx drizzle-kit push` → `npm run dev`.

**Имя продукта в коде и UI:** PayoutFlow. Репозиторий может называться иначе (`stipr-sverka`).

## Как поддерживать эту документацию

1. **Новая фича** — обновить `TZ.md` (§9 статус), при необходимости `ARCHITECTURE.md` / `DATA-AND-FLOWS.md` / `API-REFERENCE.md`.
2. **Новый API route** — строка в `API-REFERENCE.md`, упоминание потока в `ARCHITECTURE.md` если меняется логика.
3. **Смена схемы БД** — `schema.ts` + раздел таблиц в `DATA-AND-FLOWS.md`.
4. **Секреты и деплой** — `OPERATIONS.md` и `.env.example` в синхроне.
5. **Крупный рефакторинг папок** — обновить дерево в `ARCHITECTURE.md`.
