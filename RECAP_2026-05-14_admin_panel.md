# Recap — 2026-05-14 — Admin panel for company applications

## What
Built a working admin panel for moderating company verification requests. Three moderation actions live: **approve**, **reject**, **ban** (plus **unban** as a release valve). Lives in `admin/` as a fresh Vite + React 19 + TS app, separate from the main `identity/` user app but sharing Firebase project `idenity-e7f29`.

## Why this was needed
Before today, `POST /api/profile/:uid/request-approval` auto-approved every company instantly — meaning the "Company verification" flow in `ProfilePage.tsx` was theatre. The submitted fields (`companyName`, `registrationNumber`, `contactEmail`, `description`) were sent by the client but discarded by the backend. There was no rejection path, no ban path, no way to view pending applications.

## Backend changes (`api/`)

### Model (`src/models/user.rs`)
Added to `UserData`:
- `banned: bool` (default false)
- `company_name`, `registration_number`, `contact_email`, `business_description` — the application payload
- `approval_requested_at`, `reviewed_at`, `reviewed_by` — audit trail
- `approval_status: Option<String>` — denormalized convenience field (`"pending" | "approved" | "rejected" | "banned"`) so the Firestore admin list query can use a single equality filter (Firestore composite-index limits)
- `rejection_reason`, `ban_reason`

Added request bodies: `RequestApprovalRequest` and `ModerationRequest`.

### Config (`src/config.rs`)
New `ADMIN_UIDS` env var (comma-separated Firebase UIDs) → `Config::admin_uids: Vec<String>` + `Config::is_admin(uid)` helper.

### Handlers
- `src/handlers/profile.rs` — `request_approval` rewritten: validates input, blocks banned users from re-applying, writes the full application + `pendingApproval=true` + `approvalStatus="pending"` instead of auto-approving.
- `src/handlers/admin.rs` — new module:
  - `GET  /api/admin/me` — admin ping
  - `GET  /api/admin/companies?status={pending|approved|rejected|banned|all}` — list (Firestore structured query, orderBy `approvalRequestedAt` desc, limit 200)
  - `GET  /api/admin/companies/:uid` — single record
  - `POST /api/admin/companies/:uid/approve`
  - `POST /api/admin/companies/:uid/reject` — body `{ reason }`
  - `POST /api/admin/companies/:uid/ban` — body `{ reason }`, refuses to ban self
  - `POST /api/admin/companies/:uid/unban`
  - Admin gate: each handler calls `ensure_admin()` which checks `auth.uid` against `ADMIN_UIDS`. Routes are mounted in the regular protected sub-router so the Firebase JWT middleware still runs first.

### Routes (`src/routes/mod.rs`)
Wired the seven new admin routes after the existing notification routes.

Cargo check passes clean — `cargo check` finishes in ~5s with no warnings related to our changes.

## Frontend (`admin/`)

Fresh Vite + React 19 + TS app, served on port 3001 by default. Tech choice was Vite (not CRA) because the main `identity/` app is on react-scripts 5 and pulling that overhead into an admin tool felt wrong.

Files:
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- `src/firebase.ts` — Firebase config copy-pasted from the main app (same project)
- `src/api.ts` — fetch wrapper with Bearer token from Firebase Auth, typed `Company` + endpoints
- `src/Login.tsx` — email/password sign-in via Firebase Auth
- `src/App.tsx` — auth-state listener, admin gate (calls `/api/admin/me`; renders an error screen with the user's UID if not in `ADMIN_UIDS`), tab bar (Pending / Approved / Rejected / Banned / All), card list, action wiring
- `src/CompanyCard.tsx` — application card: company name, contact info, business description, audit timestamps, action buttons depending on current status
- `src/ReasonModal.tsx` — generic confirm-with-reason modal; reason is required for ban, optional for reject
- `src/styles.css` — dark theme (matches Marki feel: `#0b0f14` background, blue primary `#4f8cff`)
- `.env.example` — `VITE_API_URL` defaults to prod `https://idenity-backend.duckdns.org`

`npm run build` produces a clean 367 KB JS bundle (97 KB gzipped). `tsc --noEmit` passes.

## Operational notes

To grant admin access:
1. Sign up / sign in to the main app with the desired email so a Firebase UID exists.
2. Copy the UID from Firebase console (or from `auth.currentUser.uid` in the main app).
3. Set on the API host: `ADMIN_UIDS=uid1,uid2,uid3` and restart `idenity-api`.
4. Open `admin/` (`npm run dev` → `http://localhost:3001`) and sign in with the same email/password.

If the user is signed in but not in the allowlist, the UI shows a clear error screen with the UID that needs adding — no silent failures.

## What I did *not* do (intentional)

- **No `isAdmin` field migration.** Per Alan's choice, admin gating is env-only — keeps Firestore clean, no risk of a stray Firestore rule exposing the flag client-side.
- **No notifications back to the user when rejected/banned.** The fields are stored (`rejectionReason`, `banReason`) so the main app can surface them on the Profile screen later, but I didn't touch `ProfilePage.tsx` — the main app already reads `companyApproved` / `pendingApproval` and that's enough for the user-visible state machine to mostly work. Worth a small follow-up to show the rejection reason in the user-facing UI.
- **No pagination.** Limit is 200 on the backend query. If/when applications cross that, add cursor-based pagination — Firestore supports `startAfter` cheaply.
- **No bulk actions.** One-at-a-time approve/reject/ban.

## Open follow-ups
- Surface `rejectionReason` / `banReason` in `identity/src/pages/ProfilePage.tsx` so rejected users actually see *why*.
- Consider a "request additional info" intermediate state — right now reject is terminal-ish (user has to resubmit from scratch).
- Pagination once application volume crosses ~200.
