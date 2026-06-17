# Security checklist (PayoutFlow / Vercel / Neon)

Индекс всей документации: [README.md](./README.md).

Используй перед деплоем. Ниже — «practical evil reviewer» чеклист под этот стек (Next.js App Router, Auth.js, Drizzle + Neon Postgres, Stripe, Plaid). Каждый пункт помечен: ✅ — реализовано, ⚠️ — частично / требует ручной настройки при деплое, ❌ — не реализовано.

## Pre-deploy quick list (как просил пользователь)

| # | Пункт | Статус | Где живёт в коде |
|---|---|---|---|
| 1 | Пароли хэшируются (Argon2id) | ✅ | `src/lib/password.ts` (+ fallback bcrypt для legacy) |
| 2 | HTTPS включён | ⚠️ прод | Vercel даёт HTTPS по умолчанию, HSTS — `next.config.ts` (только при `NODE_ENV=production`) |
| 3 | `.env` в `.gitignore` | ✅ | `.gitignore` строка `.env*` |
| 4 | Rate limiting на логин/регистрацию | ✅ | `src/middleware.ts` + `src/lib/rate-limit.ts` (20 req/min per IP, Upstash или in-memory) |
| 5 | RLS‑политики настроены | ⚠️ app-level | Нет физических PG policies, но все запросы идут с `eq(table.userId, session.user.id)` — IDOR протестирован (`tests/security/api-validation.test.ts`) |
| 6 | Все API‑роуты защищены проверкой пользователя | ✅ | 14/14 application‑роутов требуют `auth()`; webhooks (`/api/webhooks/stripe`) используют подпись Stripe |
| 7 | Нет чувствительных данных в JWT | ✅ | `src/auth.ts` → `jwt()` кладёт только `user.id`; `session()` отдаёт только `id + email` |
| 8 | Валидация всех форм | ✅ | Zod в `register`, `plaid/exchange`, `billing/checkout`; кастомные guards в `match` / `comments` |
| 9 | `npm audit` чистый | ⚠️ 4 moderate dev-only | Остался `esbuild <0.24.3` внутри `drizzle-kit` (devDependency). Прод бандл не затрагивается. См. ниже. |
| 10 | Тестовый аккаунт проверен | ⚠️ ручная проверка | Playwright-скрипт покрывает landing + auth redirects (`tests/e2e/auth.spec.ts`) |

Дополнение из треда (CSP + CORS):

| # | Пункт | Статус | Где |
|---|---|---|---|
| 11 | CSP‑заголовки | ✅ | `next.config.ts` → `Content-Security-Policy` с `default-src 'self'`, whitelist для Plaid / Stripe / Vercel |
| 12 | `X-Frame-Options` / `frame-ancestors` | ✅ | `SAMEORIGIN` в `next.config.ts` |
| 13 | `X-Content-Type-Options: nosniff` | ✅ | `next.config.ts` |
| 14 | `Referrer-Policy` | ✅ | `strict-origin-when-cross-origin` |
| 15 | `Permissions-Policy` | ✅ | camera/mic/geo отключены |
| 16 | CORS — нет `* + credentials` | ✅ | CORS не включён вообще (same-origin), Auth.js cookies `HttpOnly Secure SameSite=Lax` |

## Тесты, которые запускаются как regression

```bash
npm run lint
npm run test           # vitest: unit + security
npm run test:e2e       # playwright (нужно `npx playwright install chromium` один раз)
npm run build
```

Покрытие:
- **Unit**: `tests/unit/*.test.ts` — матчер (9 кейсов), CSV‑парсер (6), Argon2/bcrypt (6), AES‑GCM token‑crypto (5), rate‑limit (2). 30 тестов, все зелёные.
- **Security (pentest style)**: `tests/security/api-validation.test.ts` — 401 без сессии, 404 IDOR, отказ по размеру/пустоте тела, нельзя привязать чужой `bankTxnId`, note обрезается до 500 символов, комментарии ограничены 2000. 9 тестов, все зелёные.
- **E2E Playwright**: `tests/e2e/` — лендинг рендерится, `/dashboard` и `/settings` без сессии → редирект на `/login`, страница логина имеет email+password input, security‑заголовки в ответе.

## OWASP-aligned (расширенный)

### Секреты и git

- [x] `.env*` в `.gitignore` — проверено
- [x] Нет hardcoded секретов в `src/` — `rg -i "(secret|password|token|api[_-]?key)\s*[:=]\s*['\"]"` без совпадений
- [x] Приватные ключи на сервере; `NEXT_PUBLIC_*` — только публичные
- [ ] Включить secret‑scan в CI (Gitleaks / TruffleHog) — PR-level, см. `.github/workflows/ci.yml`
- [x] `TOKEN_ENCRYPTION_KEY` используется для AES‑256‑GCM Plaid access‑token’ов (`src/lib/token-crypto.ts`), GCM auth‑tag проверяется, tampered payload не расшифровывается (тест `tests/unit/token-crypto.test.ts`)

### Аутентификация и access control

- [x] Auth.js (Credentials) с Argon2id
- [x] Пароли >= 8 символов (`zod` в `register`), <= 128
- [x] Rate‑limit на `/api/auth/*` (20/min per IP)
- [x] Все чувствительные эндпоинты проверяют `session.user.id` на бэке, не только UI
- [x] Object-level checks: все запросы к БД идут с `userId = session.user.id` — IDOR закрыт на уровне сервиса (`src/lib/payouts-service.ts`, `src/lib/overrides.ts`)
- [x] Нет дефолтных/админских кред
- [x] JWT содержит только `id + email`, токен подписан `AUTH_SECRET`

### Ввод / вывод

- [x] Drizzle ORM — параметризованные запросы, нет ручной конкатенации SQL
- [x] Нет `eval` / `new Function` — `rg` пусто
- [x] Нет `dangerouslySetInnerHTML` с user input — весь user‑input (`note`, `body` в комментариях) рендерится React'ом с авто‑escape
- [x] CSV‑загрузка: `multipart/form-data` required, `Content-Length <= 2 MB`, только поле `file`, разбор текста не исполняет формулы
- [x] `note` обрезается до 500 символов, `comment.body` — до 2000
- [x] `bankTxnId` проверяется на принадлежность пользователю перед записью override

### Инфраструктура

- [x] `NODE_ENV=production` на Vercel → debug‑режим выключен
- [x] Стек‑трейсы не отдаются клиенту (`NextResponse.json({ error: "..." })` — только generic сообщения)
- [x] HSTS активируется только в прод
- [x] Security headers: CSP + X‑Frame‑Options + X‑Content‑Type‑Options + Referrer‑Policy + Permissions‑Policy
- [x] Stripe webhook: signature verification (`stripe.webhooks.constructEvent`) + идемпотентность (`stripeWebhookEvents.eventId` UNIQUE)
- [x] Neon/Postgres: TLS обязателен; отдельный DB user рекомендуется (документировано в `OPERATIONS.md`)

### Зависимости

- [x] `package-lock.json` коммитится
- [x] `next` обновлён до `16.2.4` (фикс высокого GHSA‑q4gf‑8mx6‑v5v3 — DoS Server Components)
- [x] `plaid` обновлён до `42.1.0` (фикс SSRF в axios < 1.15.0 + follow-redirects)
- [ ] Оставшиеся 4 moderate из `npm audit`: `drizzle-kit → @esbuild-kit → esbuild@<=0.24.2`. Это **devDependency** (миграции) — прод‑бандл (Vercel) не затрагивается, эксплойт (dev‑server на 127.0.0.1) неактуален на проде. Безопасный фикс — dist‑upgrade `drizzle-kit` (major), отложен, чтобы не ломать миграции прямо сейчас.
- [x] Проверил вручную все зависимости в `package.json` — названия настоящие, без typosquatting: `next`, `next-auth`, `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `argon2`, `bcryptjs`, `stripe`, `plaid`, `react-plaid-link`, `@upstash/ratelimit`, `@upstash/redis`, `@vercel/analytics`, `zod`, `lucide-react`, `clsx`, `tailwind-merge`, `tailwindcss`, `@tailwindcss/postcss`, `vitest`, `@playwright/test`
- [ ] Dependabot / Renovate в CI — плановое улучшение

### Логи, мониторинг

- [x] Логов с паролями / токенами нет — проверено `rg console.(log|info|warn|error|debug)`; в `console.error` уходят только generic сообщения и exception без чувствительных полей
- [x] Rate‑limit покрывает sign‑in flow (`/api/auth/*`) — защита от brute force
- [ ] Alerting на всплески 4xx/5xx — отложено (планируется Sentry / Vercel logs + notifier)

### Web‑specific

- [x] Cookies: HttpOnly + Secure + SameSite=Lax (Auth.js defaults в prod)
- [x] CORS — same‑origin, `Access-Control-Allow-Origin: *` нигде не установлен
- [x] WebSocket не используется

### Платёжные данные

- [x] PAN / CVV не хранятся — всё через Stripe (PCI‑DSS на них)
- [x] Plaid access‑token шифруется в БД (AES‑256‑GCM), `TOKEN_ENCRYPTION_KEY` из env, legacy plaintext поддерживается для миграции

## Incident response (минимум)

- Ротация `AUTH_SECRET` → все JWT инвалидируются (пользователи логинятся заново)
- Ротация `TOKEN_ENCRYPTION_KEY` → Plaid access tokens становятся нечитаемыми; пользователю нужно переподключить банк (по дизайну)
- Stripe webhook secret: ротация в Dashboard → обновить `STRIPE_WEBHOOK_SECRET` на Vercel
- Plaid: revoke item (POST /item/remove) → в UI: кнопка Disconnect bank

## Быстрый self-check перед deploy

```bash
npm run lint && npm run test && npm audit --omit=dev && npm run build
# + один ручной проход:
#   1) register -> login -> dashboard
#   2) /api/payouts/po_demo_1/match без session => 401
#   3) /dashboard без session => redirect /login
```
