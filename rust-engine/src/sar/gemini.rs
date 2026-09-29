use std::sync::Arc;
use reqwest::Client;
use serde_json::json;
use crate::models::{RiskRating, SarResponse};
use super::circuit_breaker::CircuitBreaker;

pub struct GeminiSarClient {
    client: Client,
    api_key: String,
    model: String,
    circuit_breaker: Arc<CircuitBreaker>,
}

impl GeminiSarClient {
    pub fn new(api_key: String, model: String, circuit_breaker: Arc<CircuitBreaker>) -> Self {
        Self {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(8))
                .build()
                .unwrap_or_default(),
            api_key,
            model,
            circuit_breaker,
        }
    }

    pub async fn generate_sar(&self, case_id: &str, account_id: &str, reasons: &[String], amount: f64) -> SarResponse {
        // Wald Mitigation: Check circuit breaker state before calling external Gemini endpoint
        if !self.circuit_breaker.can_execute().await {
            tracing::warn!(case_id, "Circuit Breaker OPEN: Using deterministic rule-based fallback");
            return self.deterministic_fallback(case_id, account_id, reasons, amount);
        }

        // If no API key configured, use fallback directly
        if self.api_key.is_empty() {
            return self.deterministic_fallback(case_id, account_id, reasons, amount);
        }

        let endpoint = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, self.api_key
        );

        let system_instruction = "You are an expert Anti-Money Laundering (AML) Compliance Officer for a licensed BFSI entity in Indonesia. Return strict JSON according to the schema provided.";
        let prompt = format!(
            "Analyze suspicious case {} for account {}. Flagged reasons: {:?}. Transaction amount: IDR {}. Produce an official SAR report narrative in Bahasa Indonesia, risk rating (CRITICAL, HIGH, MEDIUM, LOW), red flags list, and recommended regulatory action.",
            case_id, account_id, reasons, amount
        );

        let body = json!({
            "systemInstruction": {
                "parts": [{ "text": system_instruction }]
            },
            "contents": [{
                "parts": [{ "text": prompt }]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "case_id": { "type": "STRING" },
                        "risk_rating": { "type": "STRING", "enum": ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
                        "narrative": { "type": "STRING" },
                        "red_flags": { "type": "ARRAY", "items": { "type": "STRING" } },
                        "recommended_action": { "type": "STRING" }
                    },
                    "required": ["case_id", "risk_rating", "narrative", "red_flags", "recommended_action"]
                }
            }
        });

        match self.client
            .post(&endpoint)
            .header("x-goog-api-key", &self.api_key)
            .json(&body)
            .send()
            .await
        {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    if let Ok(json_res) = resp.json::<serde_json::Value>().await {
                        if let Some(text_content) = json_res
                            .pointer("/candidates/0/content/parts/0/text")
                            .and_then(|t| t.as_str())
                        {
                            // Strip potential markdown codeblock formatting ```json ... ```
                            let clean_text = text_content
                                .trim()
                                .trim_start_matches("```json")
                                .trim_start_matches("```")
                                .trim_end_matches("```")
                                .trim();

                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(clean_text) {
                                self.circuit_breaker.record_success().await;
                                return SarResponse {
                                    case_id: case_id.to_string(),
                                    risk_rating: match parsed.get("risk_rating").and_then(|r| r.as_str()) {
                                        Some("CRITICAL") => RiskRating::Critical,
                                        Some("HIGH") => RiskRating::High,
                                        Some("MEDIUM") => RiskRating::Medium,
                                        _ => RiskRating::Low,
                                    },
                                    narrative_source: "gemini".to_string(),
                                    narrative: parsed.get("narrative").and_then(|n| n.as_str()).unwrap_or("").to_string(),
                                    red_flags: parsed.get("red_flags").and_then(|rf| rf.as_array())
                                        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
                                        .unwrap_or_else(|| reasons.to_vec()),
                                    recommended_action: parsed.get("recommended_action").and_then(|a| a.as_str()).unwrap_or("FREEZE_ACCOUNT_AND_FILE_STR").to_string(),
                                };
                            }
                        }
                    }
                }

                // If error status e.g. 429 rate limit or 5xx
                self.circuit_breaker.record_failure().await;
                self.deterministic_fallback(case_id, account_id, reasons, amount)
            }
            Err(err) => {
                tracing::error!(%err, "Gemini SAR request error");
                self.circuit_breaker.record_failure().await;
                self.deterministic_fallback(case_id, account_id, reasons, amount)
            }
        }
    }

    /// Wald Mitigation: Guaranteed zero-latency, reliable deterministic fallback
    pub fn deterministic_fallback(&self, case_id: &str, account_id: &str, reasons: &[String], amount: f64) -> SarResponse {
        let reasons_str = reasons.join(", ");
        let narrative = format!(
            "Akun {} terdeteksi melakukan transaksi sebesar IDR {:.2} dengan indikasi pola anomali ({}) beruntun di bawah batas pelaporan AML dalam jeda singkat. Terpicu oleh rule engine deterministik (fallback mode aktif).",
            account_id, amount, reasons_str
        );

        let risk_rating = if reasons.iter().any(|r| r == "VELOCITY_BURST" || r == "STRUCTURING_SUSPECT") {
            RiskRating::Critical
        } else {
            RiskRating::High
        };

        SarResponse {
            case_id: case_id.to_string(),
            risk_rating,
            narrative_source: "rule_based_fallback".to_string(),
            narrative,
            red_flags: reasons.to_vec(),
            recommended_action: "FREEZE_ACCOUNT_AND_FILE_STR".to_string(),
        }
    }
}
