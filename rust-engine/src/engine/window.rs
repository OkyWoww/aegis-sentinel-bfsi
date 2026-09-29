use std::collections::VecDeque;
use std::sync::Arc;
use std::time::Duration;
use moka::sync::Cache;
use crate::models::{GeoLocation, ScoreRequest};

#[derive(Debug, Clone)]
pub struct TransactionSnapshot {
    pub txn_id: String,
    pub amount: f64,
    pub device_id: String,
    pub ts: i64,
    pub geo: Option<GeoLocation>,
}

#[derive(Debug, Clone)]
pub struct AccountWindow {
    pub ring_buffer: VecDeque<TransactionSnapshot>,
    pub capacity: usize,
    pub created_at_ts: i64,
}

impl AccountWindow {
    pub fn new(capacity: usize, current_ts: i64) -> Self {
        Self {
            ring_buffer: VecDeque::with_capacity(capacity),
            capacity,
            created_at_ts: current_ts,
        }
    }

    pub fn push(&mut self, snap: TransactionSnapshot) {
        if self.ring_buffer.len() >= self.capacity {
            self.ring_buffer.pop_front();
        }
        self.ring_buffer.push_back(snap);
    }

    /// Calculate window confidence (0.0 to 1.0) to address Wald SPOF:
    /// Mitigate cold-start scale-to-zero memory wipe by signalling engine certainty
    pub fn calculate_confidence(&self) -> f32 {
        let count = self.ring_buffer.len();
        match count {
            0 => 0.1,
            1 => 0.45,
            2 => 0.70,
            3 => 0.85,
            4 => 0.92,
            _ => 0.98,
        }
    }
}

pub struct SlidingWindowEngine {
    cache: Cache<String, Arc<tokio::sync::RwLock<AccountWindow>>>,
    window_capacity: usize,
}

impl SlidingWindowEngine {
    pub fn new(max_capacity: u64, window_capacity: usize) -> Self {
        let cache = Cache::builder()
            .max_capacity(max_capacity)
            .time_to_idle(Duration::from_secs(15 * 60)) // 15-minute sliding window TTI
            .build();

        Self {
            cache,
            window_capacity,
        }
    }

    pub async fn get_or_create_window(&self, account_id: &str, current_ts: i64) -> Arc<tokio::sync::RwLock<AccountWindow>> {
        if let Some(win) = self.cache.get(account_id) {
            win
        } else {
            let win = Arc::new(tokio::sync::RwLock::new(AccountWindow::new(self.window_capacity, current_ts)));
            self.cache.insert(account_id.to_string(), Arc::clone(&win));
            win
        }
    }

    pub async fn record_and_extract(
        &self,
        req: &ScoreRequest,
    ) -> (f32, Vec<TransactionSnapshot>, bool) {
        let win_lock = self.get_or_create_window(&req.account_id, req.ts).await;
        let mut win = win_lock.write().await;

        let is_new_device = !win.ring_buffer.is_empty() && 
            !win.ring_buffer.iter().any(|s| s.device_id == req.device_id);

        let history: Vec<TransactionSnapshot> = win.ring_buffer.iter().cloned().collect();
        let confidence = win.calculate_confidence();

        win.push(TransactionSnapshot {
            txn_id: req.txn_id.clone(),
            amount: req.amount,
            device_id: req.device_id.clone(),
            ts: req.ts,
            geo: req.geo.clone(),
        });

        (confidence, history, is_new_device)
    }
}
