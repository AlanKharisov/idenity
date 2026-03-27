use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Extension, Json,
};
use chrono::Utc;
use serde_json::json;
use std::sync::Arc;
use uuid::Uuid;

use crate::{
    errors::{ApiResult, AppError},
    middleware::auth::AuthenticatedUser,
    models::{BatchItemResult, BatchNftInput, BatchUploadResponse, CreateEditionResponse, CreateNftRequest, Nft, TransferNftRequest, UpdateNftRequest},
    notification_helpers,
    services::StorageClient,
    AppState,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn ext_from_ct(ct: &str) -> &str {
    match ct {
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        _ => "jpg",
    }
}

/// Load the `nfts` array from `marki_wallets/{uid}`.
async fn load_nfts(state: &AppState, uid: &str) -> ApiResult<Vec<Nft>> {
    let doc = state
        .firestore
        .get("marki_wallets", uid)
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))?
        .unwrap_or_else(|| json!({ "nfts": [] }));

    let nfts: Vec<Nft> = doc
        .get("nfts")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    Ok(nfts)
}

/// Persist the `nfts` array back to `marki_wallets/{uid}`.
async fn save_nfts(state: &AppState, uid: &str, nfts: &[Nft]) -> ApiResult<()> {
    state
        .firestore
        .update("marki_wallets", uid, &json!({ "nfts": nfts }))
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))?;
    Ok(())
}

/// Upload image bytes to Firebase Storage and return the public URL.
async fn upload_nft_image(
    state: &AppState,
    owner_id: &str,
    nft_id: &str,
    bytes: Vec<u8>,
    content_type: &str,
) -> ApiResult<String> {
    let ext = ext_from_ct(content_type);
    let path = StorageClient::nft_path(owner_id, nft_id, ext);
    state
        .storage
        .upload(&path, bytes, content_type)
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// `GET /api/nfts/mint-info`
/// Returns the caller's lifetime mint count and whether this next mint will
/// incur a platform commission (kicks in from the 4th mint onward).
/// Commission = 1 % of the typical Metaplex mint cost (~0.012 SOL ≈ 12 000 000 lamports).
pub async fn get_mint_info(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
) -> ApiResult<Json<serde_json::Value>> {
    let doc = state
        .firestore
        .get("marki_wallets", &auth.uid)
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))?
        .unwrap_or_else(|| json!({}));

    let mint_count = doc.get("mintCount").and_then(|v| v.as_u64()).unwrap_or(0);

    // First 3 mints are free (only gas). Commission starts on the 4th.
    let commission_lamports: u64 = if mint_count >= 3 { 120_000 } else { 0 };

    Ok(Json(json!({
        "mintCount":          mint_count,
        "isFree":             mint_count < 3,
        "commissionLamports": commission_lamports,
    })))
}

/// `GET /api/nfts`
pub async fn get_nfts(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
) -> ApiResult<Json<Vec<Nft>>> {
    let nfts = load_nfts(&state, &auth.uid).await?;
    Ok(Json(nfts))
}

/// `GET /api/nfts/:id`
pub async fn get_nft(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
    Path(nft_id): Path<String>,
) -> ApiResult<Json<Nft>> {
    let nfts = load_nfts(&state, &auth.uid).await?;
    let nft = nfts
        .into_iter()
        .find(|n| n.id == nft_id)
        .ok_or_else(|| AppError::NotFound(format!("NFT {} not found", nft_id)))?;
    Ok(Json(nft))
}

/// `POST /api/nfts`
/// Multipart body: `image` (file) + `metadata` (JSON string).
pub async fn create_nft(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
    mut multipart: Multipart,
) -> ApiResult<(StatusCode, Json<Nft>)> {
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut image_ct = "image/jpeg".to_owned();
    let mut meta: Option<CreateNftRequest> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let name = field.name().unwrap_or("").to_owned();
        match name.as_str() {
            "image" => {
                image_ct = field
                    .content_type()
                    .unwrap_or("image/jpeg")
                    .to_owned();
                image_bytes = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|e| AppError::BadRequest(e.to_string()))?
                        .to_vec(),
                );
            }
            "metadata" => {
                let text = field
                    .text()
                    .await
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                meta = Some(
                    serde_json::from_str(text.trim())
                        .map_err(|e| AppError::BadRequest(format!("Invalid metadata JSON: {}", e)))?,
                );
            }
            _ => {
                // Drain unrecognised fields to keep the multipart stream healthy.
                let _ = field.bytes().await;
            }
        }
    }

    let bytes = image_bytes
        .ok_or_else(|| AppError::BadRequest("Missing 'image' field".to_owned()))?;
    let req = meta.ok_or_else(|| AppError::BadRequest("Missing 'metadata' field".to_owned()))?;

    // Fetch owner name from profile.
    let user_doc = state
        .firestore
        .get("users", &auth.uid)
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))?;
    let owner_name = user_doc
        .as_ref()
        .and_then(|d| d.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_owned();

    let nft_id = Uuid::new_v4().to_string();
    let image_url = upload_nft_image(&state, &auth.uid, &nft_id, bytes, &image_ct).await?;

    // Build the off-chain Metaplex metadata JSON and upload it to Firebase Storage
    // so the frontend can hand `metadataUri` straight to Umi's `createNft()`.
    let metadata_json = json!({
        "name":        req.title,
        "symbol":      "",
        "description": req.description,
        "image":       image_url,
        "attributes": [
            { "trait_type": "Category",    "value": req.category.as_deref().unwrap_or("Art") },
            { "trait_type": "Blockchain",  "value": "Solana" }
        ],
        "properties": {
            "files":    [{ "uri": image_url, "type": image_ct }],
            "category": "image"
        }
    });
    let metadata_bytes = serde_json::to_vec(&metadata_json)
        .map_err(|e| AppError::BadRequest(format!("Failed to serialise metadata: {}", e)))?;
    let metadata_path = StorageClient::metadata_path(&auth.uid, &nft_id);
    let metadata_uri = state
        .storage
        .upload(&metadata_path, metadata_bytes, "application/json")
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))?;

    let nft = Nft {
        id: nft_id,
        title: req.title.clone(),
        description: req.description,
        image: image_url,
        tags: req.tags,
        category: req.category,
        blockchain: Some(req.blockchain),
        royalty: Some(req.royalty),
        owner_id: auth.uid.clone(),
        owner_name,
        price: req.price,
        for_sale: req.for_sale,
        currency: Some(req.currency),
        created_at: Utc::now().to_rfc3339(),
        metadata_uri: Some(metadata_uri),
        mint_address: None,
        edition_count: None,
        edition_number: None,
        master_nft_id: None,
    };

    let mut nfts = load_nfts(&state, &auth.uid).await?;
    nfts.push(nft.clone());
    save_nfts(&state, &auth.uid, &nfts).await?;

    // Increment the lifetime mint counter (freemium gate tracked here).
    // Non-fatal: a failure should not block the successful mint response.
    let wallet_doc = state
        .firestore
        .get("marki_wallets", &auth.uid)
        .await
        .ok()
        .flatten()
        .unwrap_or_else(|| json!({}));
    let new_count = wallet_doc.get("mintCount").and_then(|v| v.as_u64()).unwrap_or(0) + 1;
    let _ = state
        .firestore
        .update("marki_wallets", &auth.uid, &json!({ "mintCount": new_count }))
        .await;

    notification_helpers::notify_nft_created(&state.firestore, &auth.uid, &req.title).await;

    Ok((StatusCode::CREATED, Json(nft)))
}

/// `POST /api/nfts/batch`
/// Multipart body: multiple `images[]` fields + one `metadata` JSON field.
pub async fn batch_create_nfts(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
    mut multipart: Multipart,
) -> ApiResult<Json<BatchUploadResponse>> {
    // Collect all files first, then process.
    let mut files: Vec<(Vec<u8>, String)> = Vec::new(); // (bytes, content_type)
    let mut batch_meta: Option<BatchNftInput> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let name = field.name().unwrap_or("").to_owned();
        match name.as_str() {
            "metadata" => {
                let text = field
                    .text()
                    .await
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                batch_meta = Some(
                    serde_json::from_str(text.trim())
                        .map_err(|e| AppError::BadRequest(format!("Invalid metadata: {}", e)))?,
                );
            }
            // Accept both "images[]" (PHP-style) and plain "images"
            n if n == "images[]" || n == "images" => {
                let ct = field
                    .content_type()
                    .unwrap_or("image/jpeg")
                    .to_owned();
                let bytes = field
                    .bytes()
                    .await
                    .map_err(|e| AppError::BadRequest(e.to_string()))?
                    .to_vec();
                if !bytes.is_empty() {
                    files.push((bytes, ct));
                }
            }
            _ => {
                // Drain unrecognised fields to keep the multipart stream healthy.
                let _ = field.bytes().await;
            }
        }
    }

    if files.is_empty() {
        return Err(AppError::BadRequest("No image files provided".to_owned()));
    }

    let shared = batch_meta
        .ok_or_else(|| AppError::BadRequest("Missing 'metadata' field".to_owned()))?;

    // Fetch owner name once.
    let user_doc = state
        .firestore
        .get("users", &auth.uid)
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))?;
    let owner_name = user_doc
        .as_ref()
        .and_then(|d| d.get("name"))
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_owned();

    let mut nfts = load_nfts(&state, &auth.uid).await?;
    let mut results: Vec<BatchItemResult> = Vec::with_capacity(files.len());
    let mut created = 0usize;
    let mut failed = 0usize;

    for (index, (bytes, ct)) in files.into_iter().enumerate() {
        let item_meta = shared.items.get(index);
        let title = item_meta
            .and_then(|m| m.title.as_deref())
            .map(str::to_owned)
            .unwrap_or_else(|| format!("NFT #{}", index + 1));
        let description = item_meta
            .and_then(|m| m.description.as_deref())
            .unwrap_or("")
            .to_owned();
        let price = item_meta.and_then(|m| m.price).or(None);

        let nft_id = Uuid::new_v4().to_string();
        match upload_nft_image(&state, &auth.uid, &nft_id, bytes, &ct).await {
            Ok(image_url) => {
                // Generate and upload the off-chain Metaplex metadata JSON so the
                // frontend can pass `metadataUri` straight into Umi's `createNft()`.
                let metadata_json = json!({
                    "name":        title,
                    "symbol":      "",
                    "description": description,
                    "image":       image_url,
                    "attributes":  [{ "trait_type": "Blockchain", "value": "Solana" }],
                    "properties":  {
                        "files":    [{ "uri": image_url, "type": ct }],
                        "category": "image"
                    }
                });
                let metadata_bytes = serde_json::to_vec(&metadata_json)
                    .map_err(|e| AppError::BadRequest(format!("Failed to serialise metadata: {}", e)))?;
                let metadata_path = StorageClient::metadata_path(&auth.uid, &nft_id);
                let metadata_uri = state
                    .storage
                    .upload(&metadata_path, metadata_bytes, "application/json")
                    .await
                    .map_err(|e| AppError::Firebase(e.to_string()))?;

                let nft = Nft {
                    id: nft_id.clone(),
                    title: title.clone(),
                    description,
                    image: image_url.clone(),
                    tags: shared.tags.clone(),
                    category: None,
                    blockchain: Some(shared.blockchain.clone()),
                    royalty: Some(shared.royalty),
                    owner_id: auth.uid.clone(),
                    owner_name: owner_name.clone(),
                    price,
                    for_sale: shared.for_sale,
                    currency: Some(shared.currency.clone()),
                    created_at: Utc::now().to_rfc3339(),
                    metadata_uri: Some(metadata_uri.clone()),
                    mint_address: None,
                    edition_count: None,
                    edition_number: None,
                    master_nft_id: None,
                };
                nfts.push(nft);
                results.push(BatchItemResult {
                    index,
                    id: Some(nft_id),
                    status: "ok".to_owned(),
                    message: None,
                    image_url: Some(image_url),
                    metadata_uri: Some(metadata_uri),
                });
                created += 1;
            }
            Err(e) => {
                results.push(BatchItemResult {
                    index,
                    id: None,
                    status: "error".to_owned(),
                    message: Some(e.to_string()),
                    image_url: None,
                    metadata_uri: None,
                });
                failed += 1;
            }
        }
    }

    // Persist all successfully created NFTs in one write.
    if created > 0 {
        save_nfts(&state, &auth.uid, &nfts).await?;
        notification_helpers::notify_batch_created(&state.firestore, &auth.uid, created).await;
    }

    Ok(Json(BatchUploadResponse { created, failed, results }))
}

/// `PUT /api/nfts/:id`
pub async fn update_nft(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
    Path(nft_id): Path<String>,
    Json(body): Json<UpdateNftRequest>,
) -> ApiResult<Json<Nft>> {
    let mut nfts = load_nfts(&state, &auth.uid).await?;

    let nft = nfts
        .iter_mut()
        .find(|n| n.id == nft_id)
        .ok_or_else(|| AppError::NotFound(format!("NFT {} not found", nft_id)))?;

    if let Some(v) = body.title        { nft.title = v; }
    if let Some(v) = body.description  { nft.description = v; }
    if let Some(v) = body.tags         { nft.tags = v; }
    if let Some(v) = body.category     { nft.category = Some(v); }
    if let Some(v) = body.price        { nft.price = Some(v); }
    if let Some(v) = body.for_sale     { nft.for_sale = v; }
    if let Some(v) = body.currency     { nft.currency = Some(v); }
    if let Some(v) = body.mint_address { nft.mint_address = Some(v); }

    let updated = nft.clone();
    save_nfts(&state, &auth.uid, &nfts).await?;
    Ok(Json(updated))
}

/// `DELETE /api/nfts/:id`
pub async fn delete_nft(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
    Path(nft_id): Path<String>,
) -> ApiResult<StatusCode> {
    let mut nfts = load_nfts(&state, &auth.uid).await?;
    let len_before = nfts.len();
    nfts.retain(|n| n.id != nft_id);

    if nfts.len() == len_before {
        return Err(AppError::NotFound(format!("NFT {} not found", nft_id)));
    }

    save_nfts(&state, &auth.uid, &nfts).await?;
    Ok(StatusCode::NO_CONTENT)
}

// ─────────────────────────────────────────────────────────────────────────────

/// `POST /api/nfts/editions`
///
/// Creates one Master Edition NFT record plus N print-edition placeholder
/// records in Firestore, all sharing a single uploaded image and metadata JSON.
///
/// The frontend is responsible for the on-chain work:
///   1. `createNft(…, { maxSupply: some(N) })` — registers the Master Edition.
///   2. `printV1(…)` × N                       — mints each print edition.
///   3. `PUT /api/nfts/:id { mintAddress }`     — saves each on-chain address.
///
/// Multipart body: `image` (file) + `metadata` (JSON, must include `editionCount`).
pub async fn create_edition_nfts(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
    mut multipart: Multipart,
) -> ApiResult<(StatusCode, Json<CreateEditionResponse>)> {
    let mut image_bytes: Option<Vec<u8>> = None;
    let mut image_ct = "image/jpeg".to_owned();
    let mut meta: Option<CreateNftRequest> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        let name = field.name().unwrap_or("").to_owned();
        match name.as_str() {
            "image" => {
                image_ct    = field.content_type().unwrap_or("image/jpeg").to_owned();
                image_bytes = Some(
                    field.bytes().await
                        .map_err(|e| AppError::BadRequest(e.to_string()))?.to_vec(),
                );
            }
            "metadata" => {
                let text = field.text().await
                    .map_err(|e| AppError::BadRequest(e.to_string()))?;
                meta = Some(
                    serde_json::from_str(text.trim())
                        .map_err(|e| AppError::BadRequest(format!("Invalid metadata JSON: {}", e)))?,
                );
            }
            _ => { let _ = field.bytes().await; }
        }
    }

    let bytes = image_bytes
        .ok_or_else(|| AppError::BadRequest("Missing 'image' field".into()))?;
    let req   = meta
        .ok_or_else(|| AppError::BadRequest("Missing 'metadata' field".into()))?;

    // edition_count must be ≥ 2 for this endpoint to make sense.
    let edition_count = req.edition_count
        .filter(|&n| n >= 2)
        .ok_or_else(|| AppError::BadRequest(
            "Field 'editionCount' must be an integer ≥ 2".into()
        ))?
        .min(100); // hard cap: 100 editions per request

    // Fetch owner display name.
    let user_doc  = state.firestore.get("users", &auth.uid).await
        .map_err(|e| AppError::Firebase(e.to_string()))?;
    let owner_name = user_doc.as_ref()
        .and_then(|d| d.get("name")).and_then(|v| v.as_str())
        .unwrap_or("Unknown").to_owned();

    // Upload the shared image once.
    let master_id = Uuid::new_v4().to_string();
    let image_url = upload_nft_image(&state, &auth.uid, &master_id, bytes, &image_ct).await?;

    // Build and upload the shared off-chain metadata JSON.
    let metadata_json = json!({
        "name":        req.title,
        "symbol":      "",
        "description": req.description,
        "image":       image_url,
        "attributes": [
            { "trait_type": "Category",    "value": req.category.as_deref().unwrap_or("Art") },
            { "trait_type": "Blockchain",  "value": "Solana" },
            { "trait_type": "Edition",     "value": format!("1 of {}", edition_count) }
        ],
        "properties": {
            "files":    [{ "uri": image_url, "type": image_ct }],
            "category": "image"
        }
    });
    let metadata_bytes = serde_json::to_vec(&metadata_json)
        .map_err(|e| AppError::BadRequest(e.to_string()))?;
    let metadata_path = StorageClient::metadata_path(&auth.uid, &master_id);
    let metadata_uri  = state.storage
        .upload(&metadata_path, metadata_bytes, "application/json")
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))?;

    let now = Utc::now().to_rfc3339();

    // ── Master Edition record (edition_number = 0) ─────────────────────────────
    let master = Nft {
        id:             master_id.clone(),
        title:          req.title.clone(),
        description:    req.description.clone(),
        image:          image_url.clone(),
        tags:           req.tags.clone(),
        category:       req.category.clone(),
        blockchain:     Some(req.blockchain.clone()),
        royalty:        Some(req.royalty),
        owner_id:       auth.uid.clone(),
        owner_name:     owner_name.clone(),
        price:          req.price,
        for_sale:       req.for_sale,
        currency:       Some(req.currency.clone()),
        created_at:     now.clone(),
        metadata_uri:   Some(metadata_uri.clone()),
        mint_address:   None,
        edition_count:  Some(edition_count),
        edition_number: Some(0),
        master_nft_id:  None,
    };

    // ── Print-edition placeholder records (edition_number = 1..N) ─────────────
    let mut edition_ids: Vec<String> = Vec::with_capacity(edition_count as usize);
    let mut all_nfts = load_nfts(&state, &auth.uid).await?;
    all_nfts.push(master.clone());

    for n in 1..=edition_count {
        let eid = Uuid::new_v4().to_string();
        edition_ids.push(eid.clone());
        all_nfts.push(Nft {
            id:             eid,
            title:          format!("{} #{}", req.title, n),
            edition_number: Some(n),
            master_nft_id:  Some(master_id.clone()),
            // Inherit everything else from master
            mint_address:   None,
            edition_count:  None, // only master carries the total
            ..master.clone()
        });
    }

    save_nfts(&state, &auth.uid, &all_nfts).await?;

    // Increment lifetime mint counter (non-fatal).
    let wallet_doc = state.firestore.get("marki_wallets", &auth.uid).await
        .ok().flatten().unwrap_or_else(|| json!({}));
    let new_count = wallet_doc.get("mintCount").and_then(|v| v.as_u64()).unwrap_or(0) + 1;
    let _ = state.firestore
        .update("marki_wallets", &auth.uid, &json!({ "mintCount": new_count }))
        .await;

    notification_helpers::notify_nft_created(&state.firestore, &auth.uid, &req.title).await;

    Ok((StatusCode::CREATED, Json(CreateEditionResponse {
        master_id,
        metadata_uri,
        image_url,
        edition_ids,
        edition_count,
    })))
}

/// `POST /api/nfts/:id/transfer`
///
/// Off-chain ownership sync called by the buyer immediately after an on-chain
/// Solana transaction confirms. Does NOT touch balances — the SOL already moved
/// on-chain. Steps:
///   a) Remove the NFT from `marki_wallets/{seller_id}`.
///   b) Stamp the record with the buyer's uid/name and `for_sale = false`.
///   c) Append it to `marki_wallets/{buyer_uid}`.
///   d) Set `forSale = false` on the corresponding `posts` document so the
///      listing can no longer be purchased.
pub async fn transfer_nft(
    State(state): State<Arc<AppState>>,
    Extension(auth): Extension<AuthenticatedUser>,
    Path(nft_id): Path<String>,
    Json(body): Json<TransferNftRequest>,
) -> ApiResult<Json<serde_json::Value>> {
    let buyer_uid = &auth.uid;

    if buyer_uid == &body.seller_id {
        return Err(AppError::BadRequest("Cannot transfer an NFT to yourself".to_owned()));
    }

    // ── a) Remove NFT from seller's wallet ────────────────────────────────────
    let mut seller_nfts = load_nfts(&state, &body.seller_id).await?;
    let pos = seller_nfts
        .iter()
        .position(|n| n.id == nft_id)
        .ok_or_else(|| AppError::NotFound(format!("NFT {} not found in seller wallet", nft_id)))?;
    let seller_nft = seller_nfts.remove(pos);
    save_nfts(&state, &body.seller_id, &seller_nfts).await?;

    // ── b) Fetch buyer's display name ─────────────────────────────────────────
    let buyer_doc = state
        .firestore
        .get("users", buyer_uid)
        .await
        .map_err(|e| AppError::Firebase(e.to_string()))?;
    let buyer_name = buyer_doc
        .as_ref()
        .and_then(|d| d.get("name").and_then(|v| v.as_str()))
        .unwrap_or("Unknown")
        .to_owned();

    // Build the new record with updated ownership.
    let new_id = Uuid::new_v4().to_string();
    let transferred = Nft {
        id:         new_id.clone(),
        owner_id:   buyer_uid.clone(),
        owner_name: buyer_name,
        for_sale:   false,
        price:      None,
        ..seller_nft
    };

    // ── c) Append to buyer's wallet ───────────────────────────────────────────
    let mut buyer_nfts = load_nfts(&state, buyer_uid).await?;
    buyer_nfts.push(transferred);
    save_nfts(&state, buyer_uid, &buyer_nfts).await?;

    // ── d) Mark post as sold (non-fatal: listing may already be gone) ─────────
    let _ = state
        .firestore
        .update("posts", &body.post_id, &json!({ "forSale": false }))
        .await;

    Ok(Json(json!({
        "success":  true,
        "newNftId": new_id,
    })))
}
