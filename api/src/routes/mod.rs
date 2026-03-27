use axum::{
    extract::DefaultBodyLimit,
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;

use crate::{
    handlers::{auth, marketplace, notifications, nfts, posts, profile, wallets},
    middleware::auth::auth_middleware,
    AppState,
};

/// Build the full `/api` router.
/// Public routes (no auth required): `POST /api/auth/register`
/// All other routes require a valid Firebase Bearer token.
pub fn api_router(state: Arc<AppState>) -> Router<Arc<AppState>> {
    // ── Protected routes ──────────────────────────────────────────────────────
    let protected = Router::new()
        // Auth
        .route("/auth/me", get(auth::me))
        // Profile
        .route("/profile/:uid", get(profile::get_profile))
        .route("/profile/:uid", put(profile::update_profile))
        .route("/profile/:uid/avatar", post(profile::upload_avatar)
            .layer(DefaultBodyLimit::max(5 * 1024 * 1024)))   // 5 MB for avatar
        .route("/profile/:uid/password", put(profile::change_password))
        .route("/profile/:uid/approval", put(profile::set_approval))
        .route("/profile/:uid/request-approval", post(profile::request_approval))
        // Marki wallet
        .route("/wallets/marki", get(wallets::get_marki_wallet))
        .route("/wallets/marki/fingerprint", put(wallets::update_fingerprint))
        .route("/wallets/marki/email", put(wallets::update_email))
        // Crypto wallets (Phantom only)
        .route("/wallets/crypto", get(wallets::get_crypto_wallets))
        .route("/wallets/crypto", post(wallets::add_crypto_wallet))
        .route("/wallets/crypto/:id", delete(wallets::remove_crypto_wallet))
        .route("/wallets/crypto/:id/balance", put(wallets::refresh_wallet_balance))
        // NFTs — isolated in their own sub-router so matchit's radix tree
        // resolves static segments (/mint-info, /batch) in a self-contained
        // scope and can never conflate them with the dynamic /:id parameter.
        .nest("/nfts", Router::new()
            .route("/",          get(nfts::get_nfts))
            .route("/",          post(nfts::create_nft)
                .layer(DefaultBodyLimit::max(20 * 1024 * 1024)))   // 20 MB per NFT
            .route("/mint-info", get(nfts::get_mint_info))
            .route("/batch",     post(nfts::batch_create_nfts)
                .layer(DefaultBodyLimit::max(100 * 1024 * 1024)))  // 100 MB for batch
            .route("/:id",       get(nfts::get_nft))
            .route("/:id",       put(nfts::update_nft))
            .route("/:id",       delete(nfts::delete_nft))
        )
        // Posts / feed
        .route("/posts", get(posts::get_posts))
        .route("/posts", post(posts::create_post))
        .route("/posts/:id", delete(posts::delete_post))
        .route("/posts/:id/like", post(posts::like_post))
        .route("/posts/:id/comments", post(posts::add_comment))
        // Marketplace
        .route("/marketplace/buy", post(marketplace::buy_nft))
        .route("/marketplace/cod", post(marketplace::buy_nft_cod))
        // Notifications
        .route("/notifications", get(notifications::get_notifications))
        .route("/notifications/read-all", put(notifications::mark_all_read))
        .route("/notifications/:id/read", put(notifications::mark_read))
        .route("/notifications/:id", delete(notifications::delete_notification))
        // Attach auth middleware to ALL routes in this sub-router.
        .layer(middleware::from_fn_with_state(
            state.clone(),
            auth_middleware,
        ));

    // ── Public routes ─────────────────────────────────────────────────────────
    let public = Router::new().route("/auth/register", post(auth::register));

    Router::new().merge(protected).merge(public)
}
