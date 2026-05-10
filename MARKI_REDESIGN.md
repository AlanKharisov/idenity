# MarkIdentity — Redesign (2026-05-09)

Світла тема + смарагдовий акцент `#10b981`, шрифти Manrope + JetBrains Mono.
Виконано на основі дизайн-пакета `MarkIdentity Redesign.html` з claude.ai/design.

## Дизайн-система

- **Tokens** — `src/styles/tokens.css` — кольори, поверхні, тіні, бордери, primary/danger/warn, dark-режим через `[data-theme="dark"]`.
- **Шрифти** — Manrope 400-800 + JetBrains Mono 400-600 (підключені у `public/index.html`). Прибрав Roboto/Alata.
- **Кнопки** — `.btn` (pill, 999px), `.btn-primary` smaragd, `.btn-ghost`, `.btn-outline`.
- **Картки** — `.card` (16px radius), `.field` для інпутів, `.chip` / `.chip-active`.
- **Bottom nav** — пілки 6 кнопок, центральна `Add` як виділений зелений квадрат.

## Бренд

- `src/components/brand/Brand.tsx` — `BrandGlyph` (літера M в скругленому квадраті) + `BrandLogo` (sm/md/lg/xl).
- `src/components/brand/Icon.tsx` — 30 SVG-іконок (Home, Wallet, Plus, CRM, Bell, User, Heart, Share, Lock, Shield, Sparkle, Check, Arrow*, Camera, Upload, Settings, Globe, Logout, Truck, Pin, QR, X, More, Send, Receive, Filter, Menu, Refresh, Comment, Chevron*).
- `src/components/brand/index.ts` — реекспорт.

## Перероблені екрани

| Файл | Що зроблено |
|---|---|
| `SplashScreen.tsx` | Темний градієнт + светящаяся M-glyph + анімація прогрес-бару + версія знизу |
| `WelcomeScreen.tsx` | 3 фіче-картки (Shield/Lock/Sparkle) + CTA «Get started» |
| `AuthScreen.tsx` | Чистий вертикальний макет, `.field`-інпути, social-buttons G/f/, перемикач login↔signup |
| `HomePage.tsx` | Pill-search + chip-фільтри + `.card`-пости + drawer історії перегляду |
| `WalletPage.tsx` | Градієнтна balance-card (Send/Receive/Buy) + horizontal wallets row + grid 2×N з NFT |
| `AddNFTPage.tsx` | Стилі замінено на дизайн-токени (логіку mint/edit/batch/AI зберіг недоторканою) |
| `CrmPage.tsx` | Light theme tabs + light cards для замовлень/доставок/NFC, статус-бейджі через primary tokens |
| `AlertsPage.tsx` | Chip-фільтри + bg `--primary-faint` для непрочитаних, mono price badges |
| `ProfilePage.tsx` | Header-картка з аватаром + `.card`-список Account + іконкові ряди + Security/Company overlays |
| `NFTViewerPage.tsx` | Light theme + QR-toggle (Icon.QR), zoom-pill, owner/created/price meta footer |

## Інфраструктура

- `App.tsx` — `bottom-nav` тепер використовує `Icon` компоненти; центральна `add` як `.nav-add` пілка; loading-spinner через `.spinner`.
- `index.css` — імпортує `tokens.css`.
- `styles/App.css` — спрощено до layout-обгорток (page/screen/app-content); видалив старий gradient background, пурпурно-зелені правила і Roboto/Alata.
- Видалено дублікат `src/App.css`.

## Не торкав

- API-клієнт, auth-контекст, mint-flow (single + multi-edition + collection + batch), NFC, COD-orders, useUmi, Phantom-зв'язок — все працює як раніше.
- `CreateWalletPage`, `WalletSettingsPage`, `CryptoWalletsPage`, `BuyModal`, `HistoryView` — не редизайнив (будуть автоматично виглядати краще завдяки токенам, але не переверстував).

## Перевірки

- `tsc --noEmit` — 0 помилок.
- `npx react-scripts build` — успішно (369 kB JS, 2.47 kB CSS gz). Лишилися 4 ESLint-warning'и, всі pre-existing і не від редизайну.

## Наступні кроки (на майбутнє)

1. Перевірити в реальному браузері та пройти всі флоу (mint, sell, buy, NFC, COD).
2. Доредизайнити CreateWalletPage / WalletSettingsPage / CryptoWalletsPage / BuyModal / HistoryView у тому ж стилі.
3. Додати темний режим через `data-theme="dark"` атрибут (токени вже готові, потрібен тільки toggle у Profile).
4. Замінити QR-генерацію в NFTViewerPage на бекендовий ендпоінт замість клієнтського QRCode.toDataURL для більшої контрольованості.
