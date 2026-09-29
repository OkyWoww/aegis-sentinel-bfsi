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
}
