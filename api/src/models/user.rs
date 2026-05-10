use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserData {
    pub uid: String,
    pub name: String,
    pub username: String,
    pub email: String,
    pub phone: Option<String>,
    pub avatar: Option<String>,
    pub location: Option<String>,
    pub bio: Option<String>,
    pub created_at: String,
    #[serde(default)]
    pub company_approved: bool,
    pub delivery_address: Option<String>,
    #[serde(default)]
    pub pending_approval: bool,
    /// Any combination of: `owner`, `manager`, `controller`, `courier`, `customer`.
    /// Empty array == plain customer (legacy users default to this).
    #[serde(default)]
    pub roles: Vec<String>,
    /// uid of the company-owner this user reports to (when role is courier/manager/controller).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub company_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterRequest {
    pub uid: String,
    pub name: String,
    pub username: String,
    pub email: String,
    pub phone: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub username: Option<String>,
    pub bio: Option<String>,
    pub location: Option<String>,
    pub delivery_address: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangePasswordRequest {
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetApprovalRequest {
    pub approved: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRolesRequest {
    pub roles: Vec<String>,
    pub company_id: Option<String>,
}
