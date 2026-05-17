# 2026-05-17 — admin-company: batch mint fix (editions ×10)

## Контекст

На партии 10 editions ловилось три ошибки одна за другой:

1. `429 Too many requests` — публичный RPC `api.devnet.solana.com` режет ~5-10 req/s на IP.
2. `Transaction simulation failed: insufficient funds for rent` — комиссионный перевод на казну.
3. `TransactionExpiredBlockheightExceededError` — главная. Подписанные tx протухали к концу цикла.

## Корень

В `admin-company/src/pages/NftsPage.tsx` ветка editions (`numEditions > 1`):

- Все N транзакций подписывались **одним общим blockhash** (`sharedBlockhash`).
- Phantom подписывал их пакетом (отличный UX, один клик).
- Но дальше шёл **последовательный** цикл `send → confirm → apiUpdateNFT` для каждой.
- Blockhash валиден ~150 слотов ≈ 60 сек. К 8-10 транзакциям окно закрывалось → expired.
- 429 от RPC только усугубляли: `confirmTransaction` полла́ил, ловил 429, добавлял задержки.

## Что сделано

### `NftsPage.tsx`

- Добавлен `rpcWithRetry<T>(fn, label, attempts=5)` — экспонент. backoff на 429.
- `sendCommission` обёрнут в retry — комиссия больше не пропадает молча от rate limit.
- Ветка editions переписана:
  - `Promise.allSettled` для `sendTransaction` всех N (внутри окна валидности blockhash).
  - `Promise.allSettled` для `confirmTransaction` всех отправленных.
  - Каждый вызов под retry-обёрткой.
  - Частичные провалы не убивают всю операцию: пишем `mintAddress` только для успешных, публикуем пост только для успешных, в title — `(X/N editions)` если были потери.
  - Понятное сообщение об ошибке, если всё провалилось.

### `useUmi.ts`

- Добавлен warning в консоль, если `VITE_SOLANA_RPC` не задан.
- Комментарий: для продакшена / batch mint обязательно Helius/QuickNode/Triton.

## Что осталось / open

- **RPC**: без платного endpoint батчи всё равно будут давиться. Поставить Helius free tier (~50 req/s) в `.env`:
  ```
  VITE_SOLANA_RPC=https://devnet.helius-rpc.com/?api-key=...
  ```
- **Casino rent**: проблема `insufficient funds for rent` — на адресе казны `2wZ2vKzRzY7ZxkRTRgTKVBDBVTqk1NfvGbQFgDxJAr9X` либо 0 SOL и `commissionLamports` < rent-exempt минимума (~0.00089 SOL), либо у юзера в кошельке слишком мало SOL. Залить казне один раз ~0.002 SOL и проверить, что `commissionLamports` из `apiGetMintInfo` ≥ rent-exempt.
- **Collection ветка** (lines 377-406) тоже последовательная, но там каждый mint получает свежий blockhash, так что expired ей не грозит. RPC limits — да. По-хорошему её тоже подружить с параллельной отправкой, но это пакет Phantom-подтверждений × N кликов или separate refactor.

## Файлы

- `admin-company/src/pages/NftsPage.tsx` — главный фикс
- `admin-company/src/hooks/useUmi.ts` — warning про RPC

---

# Часть 2: Выделение admin-company в отдельный продукт

## Что сделано

- `admin-company/` была полностью untracked в монорепо (никогда не была в git). Инициализирован свой repo: `git init -b main`, первый коммит `ab56e0e`.
- Добавлены: `.gitignore` (node_modules, dist, .env.local, .vercel), `vercel.json` (Vite framework + SPA rewrites), `README.md`, расширенный `.env.example` с `VITE_SOLANA_RPC`.
- `npm run build` проходит чисто (1.9MB → 465KB gzip).
- Git identity: `Alan <alankharisov@gmail.com>` (из глобального конфига).

## Что осталось руками (gh/vercel CLI не установлены)

### 1. Создать репо на GitHub

→ https://github.com/new
- Name: `admin-company` (или другое)
- Owner: `AlanKharisov`
- Private/Public — на твой выбор
- **БЕЗ** README/gitignore/license (у нас уже есть)

### 2. Запушить из `/home/alan/idenity/admin-company`

```bash
git remote add origin git@github.com:AlanKharisov/admin-company.git
git push -u origin main
```

### 3. Подключить Vercel

→ https://vercel.com/new — импортировать репо.
Framework Preset подхватится из `vercel.json` (Vite).

В **Environment Variables** добавить:
| Key | Value |
| --- | --- |
| `VITE_API_URL` | `https://idenity-backend.duckdns.org` |
| `VITE_SOLANA_RPC` | Helius/QuickNode URL (без него batch mint будет 429) |

### 4. Добавить домен Vercel в Firebase

→ https://console.firebase.google.com/project/idenity-e7f29/authentication/settings → **Authorized domains** → добавить `<project>.vercel.app`. Иначе Firebase Auth откажет в логине.

## Заметки

- Monorepo `/home/alan/idenity` всё ещё видит `admin-company/` как untracked. Это нормально — внутри теперь свой `.git`. Если мешает, можно добавить `admin-company/` в `idenity/.gitignore`, но это уже на твоё усмотрение.
- Бэкенд (Rust/Axum) оставлен как есть на `duckdns.org`. Незакоммиченные изменения в `api/` (новый `admin.rs` и др.) — на потом, когда будем переезжать на AWS.
