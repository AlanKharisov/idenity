use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Nft {
    pub id: String,
    pub title: String,
    pub description: String,
    pub image: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub blockchain: Option<String>,
    pub royalty: Option<f64>,
    pub owner_id: String,
    pub owner_name: String,
    pub price: Option<f64>,
    #[serde(default)]
    pub for_sale: bool,
    pub currency: Option<String>,
    pub created_at: String,
    /// Off-chain Metaplex metadata JSON URL (set at creation time).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata_uri: Option<String>,
    /// On-chain Solana mint address (set after client-side Umi mint).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mint_address: Option<String>,
    // ── Edition fields (absent on regular 1-of-1 NFTs) ────────────────────────
    /// Total print supply for a Master Edition (0 = this record IS the master).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edition_count: Option<u32>,
    /// Which print this is (0 = master, 1..N = individual prints).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edition_number: Option<u32>,
    /// ID of the master NFT record, present only on print-edition records.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub master_nft_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNftRequest {
    pub title: String,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub category: Option<String>,
    pub blockchain: String,
    pub royalty: f64,
    pub price: Option<f64>,
    pub currency: String,
    pub for_sale: bool,
    /// Number of on-chain editions to create (None or 1 = regular 1-of-1 mint).
    pub edition_count: Option<u32>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct BatchItemMeta {
    pub title: Option<String>,
    pub description: Option<String>,
    pub price: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchNftInput {
    pub blockchain: String,
    pub currency: String,
    pub royalty: f64,
    pub for_sale: bool,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub items: Vec<BatchItemMeta>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNftRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
    pub price: Option<f64>,
    pub for_sale: Option<bool>,
    pub currency: Option<String>,
    pub mint_address: Option<String>,
}

/// Response from `POST /api/nfts/editions`.
/// The frontend uses this to drive the on-chain Master Edition + printV1 calls.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEditionResponse {
    /// Firestore ID of the master NFT record.
    pub master_id:     String,
    /// Shared off-chain metadata URI (used for every on-chain mint).
    pub metadata_uri:  String,
    /// Firebase Storage URL of the uploaded image (used to create the feed post).
    pub image_url:     String,
    /// Firestore IDs of the N placeholder print-edition records (in order 1..N).
    pub edition_ids:   Vec<String>,
    /// How many print editions were requested.
    pub edition_count: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchUploadResponse {
    pub created: usize,
    pub failed: usize,
    pub results: Vec<BatchItemResult>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchItemResult {
    pub index: usize,
    pub id: Option<String>,
    pub status: String,
    pub message: Option<String>,
    /// Firebase Storage URL of the uploaded image.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_url: Option<String>,
    /// Off-chain Metaplex metadata JSON URL — present on success, absent on error.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata_uri: Option<String>,
}
