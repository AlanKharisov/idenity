# Recap — Git push 2026-05-10

## Что сделано
- Закоммичено и запушено на `origin/master` (commit `1462a3b`).
- 106 файлов: +7437 / −5134.
- Содержание: новые API-handlers (`ai`, `cod_orders`, `deliveries`, `nfc`) + модель `delivery`; Capacitor Android-проект; дизайн-токены `tokens.css`; редизайн страниц (Home, Profile, Wallet, Auth, Welcome, Splash, AddNFT, Alerts, BuyModal, NFTViewer); новая `CrmPage`; компоненты `brand/`; `contentModeration` util; заметки `MARKI_CRM.md`, `MARKI_REDESIGN.md`.

## Что остановило перед пушем (важно!)
В рабочем дереве были опасные файлы, попадавшие под `git add`:
1. **`identity/android/app/markidentity-release.keystore`** — приватный ключ для подписи Android-релиза. Утечка = любой может подписать «твоё» приложение.
2. **`identity/android/local.properties`** — путь к локальному SDK, прямо помечен «must NOT be checked in».
3. **`identity/android/app/build/`, `identity/android/build/`** — 34 МБ артефактов сборки.
4. **`identity/android/app/src/main/assets/public/`** — 8.5 МБ скопированной web-сборки (генерируется `npx cap sync`).

## Решение
- Capacitor сгенерировал `identity/android/.gitignore`, но строки `*.jks` / `*.keystore` были закомментированы — **раскомментировал их**.
- Проверил `git check-ignore`: все 5 опасных путей теперь игнорируются.
- Просканировал `build.gradle`, `capacitor.config.ts` и markdown-заметки на секреты — чисто (есть только упоминание `NP_API_KEY` как TODO).

## Состояние сейчас
- `master` синхронизирован с `origin/master`, рабочее дерево чистое.
- Keystore остался локально, в репозитории его нет. **Сделай резервную копию keystore вне репо** — без него не пересобрать релиз с тем же подписанием (Play Store не пустит апдейт с другим ключом).

## Следующие шаги (по `MARKI_CRM.md`)
- Получить и положить `NP_API_KEY` в `Config` (`api/src/config.rs`).
- Реализовать реальный `POST /api/deliveries/:id/sync-novaposhta` поверх `getStatusDocuments` Nova Poshta.
