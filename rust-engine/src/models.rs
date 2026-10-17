use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeoLocation {
    pub lat: f64,
    pub lon: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreRequest {
    pub txn_id: String,
    pub account_id: String,
    pub amount: f64,
    pub currency: String,
    pub merchant_id: String,
    pub channel: String,
    pub device_id: String,
    pub ts: i64,
    #[serde(default)]
    pub geo: Option<GeoLocation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Decision {
    Allow,
    Review,
    Block,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreResponse {
    pub txn_id: String,
    pub score: u32,
    pub decision: Decision,
    pub reasons: Vec<String>,
    pub window_confidence: f32,
    pub processing_time_us: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SarRequest {
    #[serde(default)]
    pub account: String,
    #[serde(default)]
    pub amount: f64,
    #[serde(default)]
    pub score: f64,
    #[serde(default, alias = "decision")]
    pub verdict: String,
    #[serde(default, alias = "velocityCount")]
    pub velocity_count: usize,
    #[serde(default)]
    pub speed: f64,
    #[serde(default)]
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RiskRating {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SarResponse {
    pub executive_summary: String,
    pub typology_analysis: String,
    pub recommended_actions: Vec<String>,
    pub source: String, // "GEMINI_3.8_FLASH_LIVE" or "DETERMINISTIC_FALLBACK"
}
