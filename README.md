# idenity

A full-stack product identity platform combining digital ownership, marketplace workflows, QR/NFC verification, and company operations.

[Web application](https://alankharisov.github.io/idenity/)

## Overview

idenity connects a consumer-facing product and NFT experience with the operational tools companies need to create, distribute, and verify digital product records. The repository is a monorepo containing a Rust API, a React/Capacitor client, and a dedicated administration interface.

## Core capabilities

- Firebase-backed registration and authenticated API access.
- Create, edit, transfer, and batch-generate NFT-style product records.
- Marketplace purchase and cash-on-delivery workflows.
- Company CRM views for orders and product operations.
- Delivery creation, tracking, checkpoints, and receipt confirmation.
- QR and NFC binding and verification.
- Posts, likes, comments, and user notifications.
- Administrative company approval, rejection, banning, and access checks.
- AI-assisted image generation and Solana integration points.
- Android packaging through Capacitor.

## Architecture

```text
identity/                         admin/
React + TypeScript               React + TypeScript + Vite
Consumer and company app         Platform administration
        │                                  │
        └──────── Firebase ID token ───────┘
                           │
                           ▼
                    api/ (Rust + Axum)
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
        Firebase Auth   Firestore     Storage
                                           │
                                      Solana / external
                                      service integrations
```

### Repository layout

```text
.
├── api/               # Rust/Axum REST API
├── identity/          # Main React app and Capacitor Android project
├── admin/             # Vite-based administration interface
├── Dockerfile         # API container image
├── render.yaml        # Render service definition
└── Cargo.toml         # Rust workspace configuration
```

## Technology

### Backend

- Rust
- Axum and Tokio
- Firebase Authentication REST integration
- Firestore and Firebase Storage REST APIs
- JSON Web Tokens
- Docker and Render configuration

### Frontend and mobile

- React
- TypeScript
- Vite and Create React App/Rewired
- Firebase web SDK
- Capacitor
- Solana and Metaplex libraries

## API overview

Most routes require a Firebase ID token.

| Area | Representative endpoints |
|---|---|
| Health | `GET /health` |
| Registration | `POST /api/auth/register` |
| NFTs/products | `/api/nfts`, `/api/nfts/batch`, `/api/nfts/:id/transfer` |
| Feed | `/api/posts`, `/api/posts/:id/like`, `/api/posts/:id/comments` |
| Marketplace | `/api/marketplace/buy`, `/api/marketplace/cod` |
| Orders and deliveries | `/api/cod-orders`, `/api/deliveries/*` |
| NFC | `/api/nfc/bind`, `/api/nfc/verify` |
| Notifications | `/api/notifications/*` |
| Administration | `/api/admin/companies/*` |
| AI | `POST /api/ai/generate` |

## Run locally

### Prerequisites

- Rust and Cargo
- Node.js and npm
- A Firebase project with Authentication, Firestore, and Storage

### 1. Configure the API

```bash
cp api/.env.example api/.env
```

Populate the local file without committing real values:

| Variable | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID` | Firebase/Google Cloud project |
| `FIREBASE_API_KEY` | Firebase web API key used for Auth REST calls |
| `FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service-account JSON supplied as a secret |
| `SOLANA_RPC_URL` | Solana RPC endpoint |
| `PORT` | API port; defaults to `8080` |
| `ALLOWED_ORIGIN` | Single browser origin allowed by CORS |
| `ADMIN_UIDS` | Comma-separated Firebase UIDs with admin access |

```bash
cd api
cargo run
```

### 2. Run the main application

```bash
cd identity
cp .env.example .env
npm ci --legacy-peer-deps
npm start
```

The legacy peer-dependency flag is currently required by the locked Metaplex dependency set.

### 3. Run the administration interface

```bash
cd admin
cp .env.example .env
npm ci
npm run dev
```

## Build verification

```bash
cargo check --locked
npm run build --prefix admin
npm run build --prefix identity
```

The Rust API and both frontends build successfully in the audited revision. The main frontend currently emits lint warnings, and its dependency tree needs a separate security and compatibility upgrade.

## Deployment

- Main web app: GitHub Pages at [alankharisov.github.io/idenity](https://alankharisov.github.io/idenity/).
- API: Docker/Render configuration is included in `Dockerfile` and `render.yaml`.
- Android: Capacitor scripts are available in `identity/package.json`.

The Pages site returned HTTP 200 during the latest audit. The backend hostname configured in the clients did not respond during that check, so this README does not claim that the production API is currently healthy.

## Demo and screenshots

Real product captures should be added for:

- marketplace and product detail;
- NFT/product creation;
- CRM and delivery workflows;
- admin company review;
- QR/NFC verification;
- Android/mobile layout.

## Security

- Never commit `api/.env` or service-account JSON.
- Restrict Firebase client keys to the required APIs, applications, and domains.
- Enforce Firebase Security Rules and App Check where applicable.
- Keep `ADMIN_UIDS` and service-account credentials in the deployment secret manager.
- Secret scanning and push protection should be enabled for this public repository.

## Status

Active product prototype with working build paths for the API, administration interface, web client, and Android wrapper. Production backend availability and dependency remediation remain open operational tasks.

## My contribution

I authored and maintain the architecture and implementation represented in this repository: Rust API development, Firebase services, React clients, marketplace and CRM flows, QR/NFC verification, blockchain integration, containerisation, and deployment configuration. The commit history is authored under variants of my name, Alan Kharisov.

