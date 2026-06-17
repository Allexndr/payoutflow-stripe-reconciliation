# Testing

Индекс: [docs/README.md](./README.md).

В проекте три уровня автоматических проверок: **линт**, **юнит + pentest** (Vitest), **E2E** (Playwright). Плюс CI-workflow `.github/workflows/ci.yml`.

## Команды

| Команда | Что делает |
|---|---|
| `npm run lint` | ESLint (Next.js + TypeScript) |
| `npm run test` | Все Vitest-тесты (unit + security). Без сети, без БД. |
| `npm run test:unit` | Только `tests/unit/**` |
| `npm run test:security` | Только `tests/security/**` (pentest-style) |
| `npm run test:e2e` | Playwright против `next dev` на 127.0.0.1:3100. Один раз заранее: `npx playwright install chromium` |
| `npm run test:all` | `lint && test && build` — для pre‑push |
| `npm run build` | Next.js production build |

## Покрытие Vitest

### `tests/unit/match.test.ts` — ядро матчинга
- exact / negative amount / ±3 дня / ±1% tolerance
- no_candidate / ambiguous (два кандидата с одинаковым score)
- tie-break: меньшая разница в сумме важнее разницы в днях
- `rankCandidates`: относительное окно ±7 дней / ±10%, сортировка, лимит

### `tests/unit/parse-bank-csv.test.ts`
- ISO и M/D/YY даты, parenthesized negative amounts
- отказ при отсутствии колонок Date/Amount
- пропуск битых строк, сохранение валидных
- CSV-injection payload (`=cmd`, `@SUM`, `+1+1`) сохраняется как текст, не интерпретируется
- 5000 строк парсится < 3 сек

### `tests/unit/password.test.ts`
- Argon2id для новых хэшей (`$argon2id$...`)
- verify успешный / неуспешный
- обратная совместимость с bcrypt (`$2a$...`) — legacy-хэши продолжают проверяться
- malformed argon2-хэш не кидает исключение, а возвращает `false`
- разный salt для одной и той же строки

### `tests/unit/token-crypto.test.ts`
- AES‑256‑GCM round-trip
- уникальный IV на каждый вызов
- легаси plaintext (без префикса `v1:`) проходит насквозь
- tampered ciphertext не расшифровывается (GCM auth-tag fail)
- если ключ не задан → поведение noop

### `tests/unit/rate-limit.test.ts`
- 20 allowed / 21-й блокируется
- bucket'ы независимы по identifier

### `tests/security/api-validation.test.ts` — pentest style
Мокаются `@/auth`, `@/db`, `@/lib/overrides`, `@/lib/payouts-service`. Проверяется реальная логика route-handler'ов:
- `POST /api/payouts/[id]/match` без сессии → **401**, без записи в БД
- тот же endpoint, но `getPayoutDetail` отдаёт `null` (чужой payout) → **404**, без записи (IDOR)
- отсутствующий/пустой `bankTxnId` → **400**
- `bankTxnId` длиной 200 символов → **400** (anti‑abuse)
- `bankTxnId`, которого нет в ledger пользователя → **400** (IDOR на уровне txn)
- `note` длиной 2000 символов → сохраняется обрезанным до **500**
- `POST /comments` пустое тело → **400**
- тело >2000 → **400**
- без сессии → **401**

## Playwright (`tests/e2e/`)

Файлы:
- `landing.spec.ts` — `/` рендерится с CTA
- `auth.spec.ts` — `/dashboard` и `/settings` без сессии → редирект на `/login`; форма логина имеет email+password
- `security-headers.spec.ts` — в ответе есть CSP, X‑Frame‑Options, X‑Content‑Type‑Options, Referrer‑Policy; `/api/payouts/export` без сессии → 307/401/403

Локальный запуск:

```bash
npx playwright install chromium   # один раз
npm run test:e2e
```

Playwright поднимает `next dev -p 3100` через `webServer` в `playwright.config.ts` и ставит `AUTH_SECRET=playwright-test-secret`. Для CI ту же роль играет `.github/workflows/ci.yml` job `e2e`.

## CI (`.github/workflows/ci.yml`)

Три job'а:
1. **test** — `npm ci → lint → test → build → npm audit --omit=dev`
2. **e2e** — Playwright + chromium
3. **secret-scan** — Gitleaks по истории коммитов

## Чего пока НЕ покрыто тестами (и почему)

- **Реальная БД** — Neon вызывается только в интеграционных путях (register, actual payouts list). Юнит‑тесты мокают БД. Интеграционный тест с test‑Neon — в backlog.
- **Stripe webhook** — подпись проверяется `stripe.webhooks.constructEvent`; тест потребовал бы валидный signed payload, пока покрыто вручную в sandbox.
- **Plaid exchange** — требует валидный sandbox public token; проверяется вручную.

Эти пробелы перечислены в `docs/SECURITY-CHECKLIST.md` как «ручные проверки перед деплоем».
