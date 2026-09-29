use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use chrono::Utc;
use tokio::sync::RwLock;

pub struct BudgetGuard {
    daily_limit: u32,
    write_counter: AtomicU32,
    last_reset_day: Arc<RwLock<u32>>,
}

impl BudgetGuard {
    pub fn new(daily_limit: u32) -> Self {
        let current_day = Utc::now().format("%j").to_string().parse().unwrap_or(0);
        Self {
            daily_limit,
            write_counter: AtomicU32::new(0),
            last_reset_day: Arc::new(RwLock::new(current_day)),
        }
    }

    /// Check and reserve write capacity. Returns true if permitted within daily budget.
    pub async fn try_reserve(&self, count: u32) -> bool {
        self.check_day_rollover().await;

        let current = self.write_counter.load(Ordering::Relaxed);
        if current + count > self.daily_limit {
            return false;
        }

        self.write_counter.fetch_add(count, Ordering::Relaxed);
        true
    }

    pub fn current_usage(&self) -> u32 {
        self.write_counter.load(Ordering::Relaxed)
    }

    pub fn remaining_budget(&self) -> u32 {
        let used = self.current_usage();
        self.daily_limit.saturating_sub(used)
    }

    async fn check_day_rollover(&self) {
        let current_day: u32 = Utc::now().format("%j").to_string().parse().unwrap_or(0);
        let mut last_day = self.last_reset_day.write().await;
        if *last_day != current_day {
            *last_day = current_day;
            self.write_counter.store(0, Ordering::Relaxed);
            tracing::info!(day = current_day, "Daily Firestore write budget reset to 0");
        }
    }
}
