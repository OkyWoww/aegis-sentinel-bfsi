use crate::models::{Decision, GeoLocation, ScoreRequest, ScoreResponse};
use super::window::TransactionSnapshot;

pub struct RuleScorer;

impl RuleScorer {
    /// Pure in-memory scoring path with deterministic execution under 100µs
    pub fn evaluate(
        req: &ScoreRequest,
        history: &[TransactionSnapshot],
        is_new_device: bool,
        confidence: f32,
        start_instant: std::time::Instant,
    ) -> ScoreResponse {
        let mut score: u32 = 0;
        let mut reasons = Vec::new();

        // 1. Velocity Burst: More than 3 transactions within 30 seconds
        let recent_30s_count = history
            .iter()
            .filter(|s| req.ts - s.ts <= 30 && req.ts >= s.ts)
            .count();
        if recent_30s_count >= 3 {
            score += 45;
            reasons.push("VELOCITY_BURST".to_string());
        }

        // 2. AML Structuring Suspect: Transactions clustered just beneath 5,000,000 threshold within 15 mins (900s)
        let is_structuring_candidate = req.amount >= 4_500_000.0 && req.amount < 5_000_000.0;
        if is_structuring_candidate {
            let prior_structuring = history
                .iter()
                .filter(|s| s.amount >= 4_500_000.0 && s.amount < 5_000_000.0 && (req.ts - s.ts).abs() <= 900)
                .count();
            if prior_structuring >= 1 {
                let add_score = if prior_structuring >= 2 { 45 } else { 35 };
                score += add_score;
                reasons.push("STRUCTURING_SUSPECT".to_string());
            }
        }

        // 3. New Device Fingerprint Anomaly
        if is_new_device {
            score += 15;
            reasons.push("NEW_DEVICE".to_string());
        }

        // 4. Geo-Velocity / Impossible Travel (Speed > 800 km/h)
        if let (Some(curr_geo), Some(last_snap)) = (&req.geo, history.last()) {
            if let Some(prev_geo) = &last_snap.geo {
                let time_diff_hrs = ((req.ts - last_snap.ts).abs() as f64) / 3600.0;
                if time_diff_hrs > 0.001 {
                    let dist_km = Self::haversine_distance(curr_geo, prev_geo);
                    let speed_kmh = dist_km / time_diff_hrs;
                    if speed_kmh > 800.0 && dist_km > 50.0 {
                        score += 50;
                        reasons.push("GEO_IMPOSSIBILITY".to_string());
                    }
                }
            }
        }

        // 5. Crypto P2P High Risk Channel combination
        if (req.merchant_id.contains("crypto") || req.merchant_id.contains("p2p")) && score >= 30 {
            score += 10;
            reasons.push("HIGH_RISK_MERCHANT".to_string());
        }

        // Cap score at 100
        if score > 100 {
            score = 100;
        }

        // Decision thresholding: ALLOW < 50, REVIEW 50..=79, BLOCK >= 80
        let decision = if score >= 80 {
            Decision::Block
        } else if score >= 50 {
            Decision::Review
        } else {
            Decision::Allow
        };

        let processing_time_us = start_instant.elapsed().as_micros() as u64;

        ScoreResponse {
            txn_id: req.txn_id.clone(),
            score,
            decision,
            reasons,
            window_confidence: confidence,
            processing_time_us,
        }
    }

    fn haversine_distance(g1: &GeoLocation, g2: &GeoLocation) -> f64 {
        let r = 6371.0; // Earth radius in km
        let d_lat = (g2.lat - g1.lat).to_radians();
        let d_lon = (g2.lon - g1.lon).to_radians();
        let lat1 = g1.lat.to_radians();
        let lat2 = g2.lat.to_radians();

        let a = (d_lat / 2.0).sin().powi(2)
            + lat1.cos() * lat2.cos() * (d_lon / 2.0).sin().powi(2);
        let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());
        r * c
    }
}
