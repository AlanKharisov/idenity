# Recap — 2026-05-14 — Admin Company (Web CRM for approved companies)

## What
Built a responsive web business panel at `admin-company/` for users whose company has been approved via `/admin` (the admin tool built earlier today). Single-domain Firebase auth, automatic access gate based on `companyApproved` / `roles`, sidebar layout on desktop and bottom-nav on mobile. Vite + React 19 + TS, no extra runtime deps beyond `firebase`.

Eight pages live, all wired to the existing Rust API — no backend changes required.

## Access flow (the thing the user explicitly asked for)
1. User signs into the main `identity` mobile app and submits a company-verification request from the Profile screen.
2. Admin (the panel I built earlier) sees the application in `/admin` Pending tab and clicks **Approve**.
3. Approve sets `companyApproved=true` on the user's Firestore doc.
4. User opens `admin-company` in browser → signs in with the same Google account → `hasCompanyAccess()` returns true → full panel unlocks.

If the user is signed in but not approved yet, they land on an `AccessDenied` screen that lets them submit the application directly from the web (no need to bounce back to the mobile app). Banned accounts get a terminal screen with the ban reason.

The four states the gate handles:
- `banned` → blocked screen with reason
- `pendingApproval` → "Заявка на рассмотрении" screen with a "проверить статус" reload
- `approved` OR has company roles (owner/manager/controller/courier) → full panel
- neither → in-place application form (mirrors mobile Profile flow)

## Pages built (all functional, not stubs)

1. **Dashboard** — 5 tiles (pending orders / in delivery / completed / NFT count / unread notifications) that double as nav shortcuts. "Recent deliveries" table.
2. **CRM** — three tabs:
   - **Orders**: pending COD orders + an Accept-Order modal with carrier choice (self vs Nova Poshta), tracking number, optional courier/controller assignment, optional NFC pre-binding. Falls into Deliveries on success.
   - **Deliveries**: filterable list + side-panel detail with status change, checkpoint creation, Nova Poshta sync button (only if `carrierType === 'nova_poshta'`), customer-receipt confirmation, full checkpoint history.
   - **NFC**: bind-form (pick NFT from your inventory, paste UID) + verify-form (paste UID, returns NFT+owner+autoconfirm flag).
3. **NFTs** — grid of own NFTs (image, title, on-sale badge, NFC badge), edit modal (title/description/forSale/price/currency), delete, single-create form with file upload. Batch/Editions left as a clearly-marked notice card pointing users to the mobile app until Phantom wallet adapter is ported to the web (see follow-ups).
4. **Marketplace** — own listings as cards (image, title, price, delete=unlist). Create-listing modal that picks from your existing NFTs.
5. **Feed** — text post composer, post cards with like/comment/delete, latest-3 comments inline.
6. **Wallets** — Marki wallet block (editable email, fingerprint toggle, balance tiles per currency) + crypto wallets list (add Solana address with label, refresh balance, delete).
7. **Notifications** — list with read/unread visual, individual mark-read + delete, bulk mark-all.
8. **Profile** — three cards: profile form (name/username/bio/location/deliveryAddress + avatar upload), security (change password), company info (read-only summary of what admin approved).

## Stack & layout choices

- **Vite + React 19 + TS** — same as `admin/`. No bundler config beyond `@vitejs/plugin-react`.
- **No router**: state-based page switch through `useState<PageId>`. The app is small enough that URL routing wasn't worth the dep; if we later need shareable links (e.g. "go to delivery /d/123"), swap in `react-router` then.
- **Layout**: CSS grid shell. `>860px` shows a fixed sidebar; below that, sidebar collapses and a fixed 5-icon bottom nav appears (Dashboard / CRM / NFTs / Marketplace / Profile — the four other pages are reachable from desktop sidebar; on mobile, low-frequency pages [Feed, Wallets, Notifications] are deferred to a follow-up "more" sheet — currently only via desktop).
- **Styling**: hand-rolled CSS variables matching the admin tool's dark theme. No Tailwind/CSS-in-JS — keeps bundle tight (108 KB gzipped) and avoids a learning surface for whoever picks this up later.
- **Icons**: inline SVG component map. Avoids a 50KB icon-pack dep for the dozen icons used.

## What I deliberately deferred

- **Solana on-chain mint (batch + editions)**. The mobile app uses `@metaplex-foundation/umi` + a Phantom-adapter via Capacitor. On web, Phantom is a browser extension and the umi-signer setup is different. Porting it correctly needs ~200 lines + testing, and the user-impact today is small (single-NFT create works through the backend's existing flow). Notice card on the NFT page tells the user. The frontend `apiClient` already exposes `apiBatchCreateNFTs` and `apiCreateEditionNFTs` — only the wallet-signing UI is missing.
- **Marketplace buy flow** (the buyer side). Company panel is seller-focused; buyers buy from the mobile app or future public web. Left out intentionally.
- **Mobile bottom-nav for 8 destinations**. 5 fits a bottom bar cleanly; cramming all 8 needed a "more" overflow that wasn't worth one iteration. Sidebar still works on tablets in landscape.
- **NFT detail page** (image zoom, attributes, transfer history). Card grid + edit modal cover 80% of need; deep view can come later.

## Operational

```bash
cd admin-company
cp .env.example .env.local      # or use the included .env.local pointing to localhost:8090
npm install
npm run dev                     # → http://localhost:3002
```

Same Firebase project as the main app (`idenity-e7f29`), so Google sign-in works with existing accounts out of the box. No new Firebase auth providers required.

For prod deploy: `npm run build` → static `dist/` (416 KB minified, 108 KB gzipped). Drop on any static host. Set `VITE_API_URL=https://idenity-backend.duckdns.org` (the prod backend) at build time.

## Open follow-ups

- **Port Solana mint flow to the web** (Phantom adapter + umi). Largest single piece of remaining work; gate any new ‘bulk NFT' features behind it.
- **Mobile "more" sheet** for the 4 destinations not in bottom-nav.
- **NFT detail page** with attributes/history.
- **Real-time** — currently every action reloads via `apiListXxx`. Notifications + new orders would benefit from polling or SSE. Polling every 60s as a stopgap is one config change.
- **Surface rejection/ban reasons in the main mobile app's ProfilePage** — already noted in the previous recap, still open. Backend writes them, but `identity/src/pages/ProfilePage.tsx` doesn't read.

## Files touched

```
admin-company/
├── .env.example
├── .env.local
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── AccessDenied.tsx
    ├── App.tsx
    ├── Login.tsx
    ├── Shell.tsx
    ├── api.ts
    ├── auth.tsx
    ├── firebase.ts
    ├── icons.tsx
    ├── main.tsx
    ├── styles.css
    ├── vite-env.d.ts
    └── pages/
        ├── CrmPage.tsx
        ├── Dashboard.tsx
        ├── FeedPage.tsx
        ├── MarketplacePage.tsx
        ├── NftsPage.tsx
        ├── NotificationsPage.tsx
        ├── ProfilePage.tsx
        └── WalletsPage.tsx
```

No backend or main-app changes.
