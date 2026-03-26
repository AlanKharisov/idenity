use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Comment {
    pub id: String,
    pub user_id: String,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub text: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Post {
    pub id: String,
    pub user_id: String,
    pub user_name: String,
    pub user_avatar: Option<String>,
    pub nft_image: String,
    pub title: String,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub likes: i64,
    #[serde(default)]
    pub liked_by: Vec<String>,
    #[serde(default)]
    pub comments: Vec<Comment>,
    pub created_at: String,
    #[serde(default)]
    pub for_sale: bool,
    pub price: Option<f64>,
    pub currency: Option<String>,
    pub wallet_nft_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePostRequest {
    pub nft_image: String,
    pub title: String,
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub for_sale: bool,
    pub price: Option<f64>,
    pub currency: Option<String>,
    pub wallet_nft_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddCommentRequest {
    pub text: String,
}
