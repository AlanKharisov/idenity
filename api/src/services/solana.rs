use anyhow::{Context, Result};
use serde_json::json;

/// Provides Solana-specific operations: address validation (pure, no network)
/// and balance fetching (via the configured JSON-RPC endpoint).
pub struct SolanaService {
    rpc_url: String,
    http: reqwest::Client,
}

impl SolanaService {
    pub fn new(rpc_url: String) -> Self {
        SolanaService {
            rpc_url,
            http: reqwest::Client::new(),
        }
    }

    // ── Address validation ────────────────────────────────────────────────────

    /// Return `true` if `address` is a valid Solana public key.
    ///
    /// A valid Solana address is a base58-encoded 32-byte Ed25519 public key.
    /// This check is pure (no network call) and runs in the `POST /api/wallets/crypto`
    /// handler before any Firestore write.
    pub fn is_valid_address(&self, address: &str) -> bool {
        match bs58::decode(address).into_vec() {
            Ok(bytes) => bytes.len() == 32,
            Err(_) => false,
        }
    }

    // ── Balance fetching ──────────────────────────────────────────────────────

    /// Fetch the confirmed SOL balance for `address` via the Solana JSON-RPC.
    ///
    /// Returns the balance in **SOL** (not lamports).
    /// `1 SOL = 1_000_000_000 lamports`.
    pub async fn get_balance(&self, address: &str) -> Result<f64> {
        let body = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [
                address,
                { "commitment": "confirmed" }
            ]
        });

        let resp = self
            .http
            .post(&self.rpc_url)
            .json(&body)
            .send()
            .await
            .context("Solana RPC request failed")?;

        if !resp.status().is_success() {
            let err_body = resp.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Solana RPC HTTP error: {}", err_body));
        }

        let result: serde_json::Value = resp
            .json()
            .await
            .context("Failed to parse Solana RPC response")?;

        // The RPC may return an application-level error even with HTTP 200.
        if let Some(err) = result.get("error") {
            return Err(anyhow::anyhow!("Solana RPC error: {}", err));
        }

        let lamports = result["result"]["value"]
            .as_u64()
            .context("Missing or invalid 'value' in Solana getBalance response")?;

        Ok(lamports as f64 / 1_000_000_000.0)
    }

    /// Fetch balances for multiple addresses concurrently using
    /// `getMultipleAccounts` — more efficient than individual calls when
    /// refreshing several wallets at once.
    ///
    /// Returns a `Vec` of `(address, balance_sol)` in the same order as the
    /// input slice.  Addresses that fail to resolve are returned with `0.0`.
    pub async fn get_balances_batch(&self, addresses: &[&str]) -> Vec<(String, f64)> {
        // Fire all requests concurrently with tokio::join-style collect.
        let futures: Vec<_> = addresses
            .iter()
            .map(|addr| {
                let addr = addr.to_string();
                async move {
                    let balance = self.get_balance(&addr).await.unwrap_or(0.0);
                    (addr, balance)
                }
            })
            .collect();

        futures::future::join_all(futures).await
    }
}
