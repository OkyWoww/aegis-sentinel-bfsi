use std::sync::Arc;
use reqwest::Client;
use serde_json::json;
use crate::models::{SarRequest, SarResponse};
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
                .timeout(std::time::Duration::from_secs(12))
                .build()
                .unwrap_or_default(),
            api_key,
            model,
            circuit_breaker,
        }
    }

    pub async fn generate_sar(&self, req: &SarRequest) -> SarResponse {
        // Wald Mitigation: Check circuit breaker state before calling external Gemini endpoint
        if !self.circuit_breaker.can_execute().await {
            tracing::warn!(account = %req.account, "Circuit Breaker OPEN: Using deterministic fallback");
            return self.deterministic_fallback(req);
        }

        // Determine active Gemini API Key (environment variable takes precedence)
        let active_key = std::env::var("GEMINI_API_KEY")
            .ok()
            .filter(|k| !k.trim().is_empty())
            .unwrap_or_else(|| self.api_key.clone());

        // Fallback immediately if key is missing or unconfigured
        if active_key.is_empty() || active_key.starts_with("__") || active_key.contains("your-api-key") {
            tracing::info!(account = %req.account, "No valid Gemini API key configured: Using deterministic fallback");
            return self.deterministic_fallback(req);
        }

        let endpoint = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            self.model, active_key
        );

        let system_instruction = "You are an expert Anti-Money Laundering (AML) Compliance Officer for a licensed BFSI entity. Return strict JSON according to the schema provided.";
        let prompt = format!(
            "Analyze suspicious transaction case for Account: {}.\n\
             Transaction Amount: IDR {:.2}.\n\
             Evaluated Risk Score: {:.0}/100 (Verdict: {}).\n\
             Triggered Anomaly Reasons: {:?}.\n\
             Window Velocity: {} transactions in 5 minutes.\n\
             Geo-Velocity Speed: {:.1} km/h.\n\
             Produce a formal Suspicious Activity Report (SAR) in English strictly conforming to the requested JSON schema with executive_summary, typology_analysis, and recommended_actions.",
            req.account, req.amount, req.score, req.verdict, req.reasons, req.velocity_count, req.speed
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
                        "executive_summary": { "type": "STRING" },
                        "typology_analysis": { "type": "STRING" },
                        "recommended_actions": {
                            "type": "ARRAY",
                            "items": { "type": "STRING" }
                        }
                    },
                    "required": ["executive_summary", "typology_analysis", "recommended_actions"]
                }
            }
        });

        match self.client
            .post(&endpoint)
            .header("Content-Type", "application/json")
            .header("x-goog-api-key", &active_key)
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
                            let clean_text = text_content
                                .trim()
                                .trim_start_matches("```json")
                                .trim_start_matches("```")
                                .trim_end_matches("```")
                                .trim();

                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(clean_text) {
                                self.circuit_breaker.record_success().await;

                                let executive_summary = parsed.get("executive_summary")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("No executive summary provided.")
                                    .to_string();

                                let typology_analysis = parsed.get("typology_analysis")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("No typology analysis provided.")
                                    .to_string();

                                let recommended_actions = parsed.get("recommended_actions")
                                    .and_then(|v| v.as_array())
                                    .map(|arr| arr.iter().filter_map(|s| s.as_str().map(String::from)).collect())
                                    .unwrap_or_else(|| vec![
                                        "Place a temporary hold on the related account in line with SOP".to_string(),
                                        "File a Suspicious Transaction Report (STR) with PPATK/FinCEN".to_string(),
                                    ]);

                                return SarResponse {
                                    executive_summary,
                                    typology_analysis,
                                    recommended_actions,
                                    source: "GEMINI_3.8_FLASH_LIVE".to_string(),
                                };
                            }
                        }
                    }
                }

                tracing::warn!(status = %status, "Gemini API returned non-success or unparseable JSON, failing over to deterministic fallback");
                self.circuit_breaker.record_failure().await;
                self.deterministic_fallback(req)
            }
            Err(err) => {
                tracing::error!(%err, "Gemini SAR request error, failing over to deterministic fallback");
                self.circuit_breaker.record_failure().await;
                self.deterministic_fallback(req)
            }
        }
    }

    /// Wald Mitigation: Guaranteed zero-latency, reliable deterministic fallback
    pub fn deterministic_fallback(&self, req: &SarRequest) -> SarResponse {
        let mut typology_points: Vec<String> = Vec::new();
        let mut actions = vec![
            "Place a temporary hold on the related account in line with the suspicious-transaction handling SOP".to_string(),
            "Send a Request for Information (RFI) to the customer to clarify the transaction".to_string(),
        ];

        if req.reasons.iter().any(|r| r == "STRUCTURING_SUSPECT") {
            typology_points.push(
                "AML structuring / smurfing indicator: repeated transactions just below the mandatory reporting threshold (IDR 5,000,000), consistent with an attempt to avoid cash-transaction reporting.".to_string()
            );
            actions.push("File a Suspicious Transaction Report (STR) with the Financial Intelligence Unit (PPATK)".to_string());
        }

        if req.reasons.iter().any(|r| r == "GEO_IMPOSSIBILITY") {
            typology_points.push(format!(
                "Geo-velocity / impossible-travel indicator: access moved at {:.1} km/h (threshold > 800 km/h), consistent with account takeover (ATO), proxy bypass, or session hijack.",
                req.speed
            ));
            actions.push("Reset banking credentials and revoke all active bearer session tokens".to_string());
        }

        if req.reasons.iter().any(|r| r == "VELOCITY_BURST") {
            typology_points.push(format!(
                "Velocity burst indicator: abnormal transaction frequency, {} transactions in the active sliding window, beyond a normal behavioral profile.",
                req.velocity_count
            ));
            actions.push("Apply adaptive rate limiting on the customer's payment gateway API".to_string());
        }

        if req.reasons.iter().any(|r| r == "NEW_DEVICE_OR_MODIFIED_ENV") {
            typology_points.push(
                "Device anomaly indicator: unrecognized device or modified environment (emulator, rooted device, or spoofed user-agent).".to_string()
            );
            actions.push("Require biometric step-up authentication (liveness detection) at the next login".to_string());
        }

        if req.reasons.iter().any(|r| r == "HIGH_VALUE_THRESHOLD_EXCEEDED") {
            typology_points.push(format!(
                "High-value indicator: transaction amount of IDR {:.2} exceeds the expected range for a standard customer risk profile.",
                req.amount
            ));
            actions.push("Request Level-2 Compliance Supervisor approval".to_string());
        }

        if typology_points.is_empty() {
            typology_points.push("The transaction pattern requires compliance review based on the internal deterministic scoring rules.".to_string());
        }

        let reasons_str = if req.reasons.is_empty() {
            "none".to_string()
        } else {
            req.reasons.join(", ")
        };

        let executive_summary = format!(
            "[VERIFIED TELEMETRY FROM LOCAL ENGINE] Suspicious case detected on account {} with a transaction of IDR {:.2} (risk score {:.0}/100, verdict {}). The deterministic rule engine identified {} active anomaly signal(s): {}. No typology is assumed beyond the signals that actually fired.",
            req.account, req.amount, req.score, req.verdict, req.reasons.len(), reasons_str
        );

        let typology_analysis = typology_points.join(" ");

        SarResponse {
            executive_summary,
            typology_analysis,
            recommended_actions: actions,
            source: "DETERMINISTIC_FALLBACK".to_string(),
        }
    }
}
