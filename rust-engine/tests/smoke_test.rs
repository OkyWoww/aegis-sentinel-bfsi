// Smoke tests for AegisSentinel BFSI Rule Engine & Bounded Window
#[cfg(test)]
mod tests {
    use std::time::Instant;
    use aegis_sentinel::models::{GeoLocation, ScoreRequest};
    use aegis_sentinel::engine::{RuleScorer, SlidingWindowEngine};

    #[tokio::test]
    async fn test_velocity_burst_detection() {
        let window_engine = SlidingWindowEngine::new(100, 64);
        let account_id = "acc_test_velocity".to_string();
        let base_ts = 1727608800;

        for i in 0..4 {
            let req = ScoreRequest {
                txn_id: format!("txn_{}", i),
                account_id: account_id.clone(),
                amount: 100000.0,
                currency: "IDR".to_string(),
                merchant_id: "merch_store".to_string(),
                channel: "MOBILE_BANKING".to_string(),
                device_id: "dev_1".to_string(),
                ts: base_ts + (i * 5),
                geo: Some(GeoLocation { lat: -6.2088, lon: 106.8456 }),
            };

            let (conf, history, is_new_dev) = window_engine.record_and_extract(&req).await;
            let resp = RuleScorer::evaluate(&req, &history, is_new_dev, conf, Instant::now());

            if i >= 3 {
                assert!(resp.reasons.contains(&"VELOCITY_BURST".to_string()));
            }
        }
    }

    #[tokio::test]
    async fn test_structuring_suspect_detection() {
        let window_engine = SlidingWindowEngine::new(100, 64);
        let account_id = "acc_test_structuring".to_string();
        let base_ts = 1727608800;

        // Transaction 1: Just below threshold (IDR 4.95M)
        let req1 = ScoreRequest {
            txn_id: "txn_s1".to_string(),
            account_id: account_id.clone(),
            amount: 4950000.0,
            currency: "IDR".to_string(),
            merchant_id: "merch_crypto_p2p".to_string(),
            channel: "MOBILE_BANKING".to_string(),
            device_id: "dev_s1".to_string(),
            ts: base_ts,
            geo: None,
        };
        let (conf1, hist1, is_new1) = window_engine.record_and_extract(&req1).await;
        let _ = RuleScorer::evaluate(&req1, &hist1, is_new1, conf1, Instant::now());

        // Transaction 2: Another transaction just below threshold within short interval
        let req2 = ScoreRequest {
            txn_id: "txn_s2".to_string(),
            account_id: account_id.clone(),
            amount: 4900000.0,
            currency: "IDR".to_string(),
            merchant_id: "merch_crypto_p2p".to_string(),
            channel: "MOBILE_BANKING".to_string(),
            device_id: "dev_s1".to_string(),
            ts: base_ts + 20,
            geo: None,
        };
        let (conf2, hist2, is_new2) = window_engine.record_and_extract(&req2).await;
        let resp2 = RuleScorer::evaluate(&req2, &hist2, is_new2, conf2, Instant::now());

        assert!(resp2.reasons.contains(&"STRUCTURING_SUSPECT".to_string()));
    }

    #[tokio::test]
    async fn test_sar_deterministic_fallback() {
        use std::sync::Arc;
        use aegis_sentinel::sar::{CircuitBreaker, GeminiSarClient};
        use aegis_sentinel::models::SarRequest;

        let cb = Arc::new(CircuitBreaker::new(3, std::time::Duration::from_secs(30)));
        let client = GeminiSarClient::new("".to_string(), "gemini-3.8-flash".to_string(), cb);

        let req = SarRequest {
            account: "acc_smoke_sar".to_string(),
            amount: 4950000.0,
            score: 100.0,
            verdict: "BLOCK".to_string(),
            velocity_count: 5,
            speed: 920.0,
            reasons: vec![
                "VELOCITY_BURST".to_string(),
                "STRUCTURING_SUSPECT".to_string(),
                "GEO_IMPOSSIBILITY".to_string(),
            ],
        };

        let response = client.generate_sar(&req).await;
        assert_eq!(response.source, "DETERMINISTIC_FALLBACK");
        assert!(response.executive_summary.contains("acc_smoke_sar"));
        assert!(response.typology_analysis.contains("structuring"));
        assert!(response.typology_analysis.contains("920"));
        assert!(!response.recommended_actions.is_empty());
    }

    #[test]
    fn test_sar_payload_deserialization() {
        use aegis_sentinel::models::SarRequest;

        let json_data = r#"{
            "account": "acc_json_test",
            "amount": 2500000.0,
            "score": 85.0,
            "decision": "BLOCK",
            "velocityCount": 4,
            "speed": 850.5,
            "reasons": ["VELOCITY_BURST", "GEO_IMPOSSIBILITY"]
        }"#;

        let req: SarRequest = serde_json::from_str(json_data).expect("Should deserialize successfully");
        assert_eq!(req.account, "acc_json_test");
        assert_eq!(req.verdict, "BLOCK");
        assert_eq!(req.velocity_count, 4);
        assert_eq!(req.speed, 850.5);
    }
}
