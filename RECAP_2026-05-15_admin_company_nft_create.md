# Recap — 2026-05-15 — admin-company: полный NFT create flow

## Что сделано

В `admin-company` (PC web, Vite + React 19) портирован полный flow создания NFT из мобильного `identity`, со всеми метаданными и on-chain mint через Phantom.

### Зависимости
Добавлены (с `--legacy-peer-deps` — у `mpl-toolbox@0.9` peer-range на umi 0.8.x, но рантайм работает с umi 1.5):
- `@metaplex-foundation/umi@^1.5.1`
- `@metaplex-foundation/umi-bundle-defaults@^1.5.1`
- `@metaplex-foundation/mpl-token-metadata@^3.4.0`
- `@metaplex-foundation/mpl-toolbox@^0.9.0`
- `@metaplex-foundation/umi-signer-wallet-adapters@^1.5.1`
- `@solana/web3.js@^1.98.4` (peer для `umi-eddsa-web3js`)
- `buffer`, `process` (Solana требует Node-polyfills в браузере)

### Файлы
- `admin-company/src/hooks/useUmi.ts` — портирован из identity, переведён на Vite-style env (`import.meta.env.VITE_SOLANA_RPC`).
- `admin-company/src/polyfills.ts` + импорт в `main.tsx`.
- `admin-company/vite.config.ts` — `define.global = 'globalThis'`, alias на `buffer`/`process/browser`, `optimizeDeps`.
- `admin-company/src/api.ts` — расширены `NFT` (tags, category, blockchain, royalty, metadataUri) и `Post` (nftImages, walletNftIds, blockchain, tags, etc.), `apiCreateNFT` теперь возвращает `metadataUri`.
- `admin-company/src/styles.css` — добавлен блок «NFT create flow»: mode-tabs, stepper, chip-row, drop-zone, toggle/switch, range slider, tag-badge, notice, progress-banner, wallet-pill, create-grid (2 колонки на ≥1100px).
- `admin-company/src/pages/NftsPage.tsx` — полностью переписан.

### NftsPage — структура
3 таба:
1. **Коллекция** — карточки NFT с edit/delete (как было).
2. **Создать** — 3-шаговый визард:
   - **Шаг 1 (Загрузка)**: drag&drop изображения / выбор файла / AI-генерация (Pollinations через `/api/ai/generate`), toggle «Создать как коллекцию» с multi-file picker, поля title/description/category (8 категорий) / теги (до 8).
   - **Шаг 2 (Чейн)**: блокчейн (Solana), слайдер роялти 0–30%, editions count.
   - **Шаг 3 (Цена)**: toggle forSale, валюта (SOL/UAH/USD/USDC), цена, кнопка «Выпустить».
   - Справа на ≥1100px sticky-preview-карточка с актуальными данными.
   - Phantom-кнопка справа от stepper (показывает `xxxx…yyyy` когда подключён).
3. **Массово (BIZ)** — batch upload с теми же метаданными (роялти, теги, valuta, цена для всех), grid превьюшек 6×N.

### Mint logic (parity с identity)
- Single 1-of-1: `apiCreateNFT(form)` → платформенный сбор отдельной TX → `createNft` с Phantom-подписью → `apiUpdateNFT(id, mintAddress)` → `apiCreatePost` в ленту.
- Multi-editions (N>1): `apiCreateEditionNFTs(form)` → одна Phantom-подпись через `signAllTransactions` для всех editions → batch confirm + record.
- Collection: `apiBatchCreateNFTs` (multipart) → mint каждого элемента → один объединённый post с массивами `nftImages`/`walletNftIds`.
- Платформенная комиссия летит отдельной TX (как в identity — иначе на devnet ловится `insufficient funds for rent` из-за пустого treasury).

### Verify
- `npx tsc -b` — 0 ошибок.
- `npx vite build` — 1153 модуля, ~1.6 MB bundle / 372 KB gzipped, успешно.

## Что НЕ портировано
- **Sell from wallet** — отдельный режим из identity не сделан. В admin-company существующий edit-modal уже позволяет включить `forSale`/`price`/`currency` для любого NFT — это покрывает 95% сценария. Если нужен dedicated визард — отдельная итерация.
- **Полноценный stylesheet под mobile в новых блоках** — десктоп-first, на узких экранах работает, но не вылизан.

## Известные нюансы
- Peer-range `mpl-toolbox` vs umi 1.5 — установлено через `--legacy-peer-deps`. В identity та же ситуация — рантайм совместим.
- Bundle 1.6 MB не сплитуется — можно вынести Solana-чанк через `manualChunks`, если стартовое время станет проблемой.
- `PLATFORM_TREASURY` захардкожен на devnet-адрес `2wZ2vKzRzY7ZxkRTRgTKVBDBVTqk1NfvGbQFgDxJAr9X` — тот же, что в identity. Перед mainnet — заменить в обоих местах.

## Следующее
- Прокликать в браузере на `:3002` с подключённым Phantom (devnet airdrop при необходимости).
- Если визард зайдёт — повторить sell-from-wallet flow (это просто фильтр уже-в-кошельке NFT + переход в edit).
- Code-split Solana-чанка если хочется быстрее first paint.
