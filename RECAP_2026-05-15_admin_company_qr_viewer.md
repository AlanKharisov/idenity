# Recap — 2026-05-15 — admin-company: QR-deeplink viewer

## Зачем
Сканом QR на товаре открыть страницу в admin-company с фото и всеми метаданными,
которые юзер сохранил при создании NFT.

## Что добавил

### Новые файлы
- `admin-company/src/pages/NftViewerPage.tsx` — страница-просмотр.
  - Принимает `source: { kind: 'id', id } | { kind: 'nfc', uid }`.
  - Для `id` — `apiGetNFT(id)`.
  - Для `nfc` — `apiVerifyNfc(uid)` → даёт `nftId` + `ownerName`, дальше `apiGetNFT`.
  - Показывает: главное фото (контейн), title, бэйджи (on sale / on-chain / NFC / category / scan OK),
    описание, теги, метаданные (категория, блокчейн, роялти, валюта, цена, owner, createdAt),
    блок «On-chain» (mint address → Solana Explorer, metadata URI → JSON, NFC UID),
    блок «Атрибуты» (если есть в `attributes[]`).
  - Отдельный layout без Shell — это «лендинг» товара, не админская страница.

### Изменения
- `admin-company/src/App.tsx`:
  - Читает `?nft=ID` или `?nfc=UID` из URL на mount.
  - Слушает `popstate` (если юзер жмёт back/forward).
  - Если viewer-source задан → рендерит `NftViewerPage` вместо Shell.
  - `closeViewer` чистит query через `history.replaceState`.
- `admin-company/src/pages/NftsPage.tsx`:
  - В `NftCard` добавлена кнопка `QR` рядом с «Изменить»/«Удалить».
  - Новая `QrModal`: генерит QR через `qrcode` npm, показывает превью, даёт «Скопировать» URL и «Скачать PNG».
  - URL для QR: `{origin}/?nfc={uid}` если есть NFC binding, иначе `{origin}/?nft={id}`.
- `admin-company/src/icons.tsx` — добавил `Icon.QrCode`.
- `admin-company/src/styles.css` — блок `.viewer-*` (1080px центр, 460×1fr сетка ≥900px,
  `meta-table` с разделителями, `attr-grid` auto-fill, mobile-fallback в одну колонку).

### Deps
- `qrcode@^1.5.4` + `@types/qrcode@^1.5.6` (всё через `--legacy-peer-deps`).

## Flow

**Создание QR:**
1. Юзер на странице «NFT» → карточка → кнопка `QR`.
2. Открывается модалка с PNG-QR-кодом + копируемая ссылка.
3. «Скачать PNG» → файл `qr-<title>.png` 320×320, можно печатать на упаковку.

**Сканирование:**
1. Скан QR → браузер открывает `https://admin-host/?nft=ID`.
2. Если не залогинен → стандартный Login (admin-company всегда требует auth).
3. После login → автоматически рендерится `NftViewerPage` (URL хранит source).
4. Кнопка «← Закрыть» → `setViewer(null)` + чистит query → возврат в Dashboard.

## Verify
- `npx tsc -b` — 0 ошибок.
- `npx vite build` — 1303→1303 модуля (qrcode добавил ~10 KB gzip), сборка OK.

## Что НЕ сделано
- QR не привязан к auth-токену — кто угодно с ссылкой и аккаунтом увидит NFT.
  Для admin-company это нормально (все пользователи внутри компании доверены),
  но если потребуется публичный лендинг — нужен отдельный публичный route без auth.
- Нет deeplink-обработки в самом identity-приложении (мобилка) — там у user'ов своя QR-логика через NFC.

## Что дальше при желании
- Кнопка «QR» в edit-modal тоже (сейчас только в карточке).
- Группа QR-codes для всей коллекции (бэтч-печать) — генерить N PNG в zip.
- На viewer-странице — кнопка «Поделиться» с native share API.
