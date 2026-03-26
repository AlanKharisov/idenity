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
}
