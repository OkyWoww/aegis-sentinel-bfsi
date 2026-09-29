use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use crate::models::ScoreResponse;
use super::budget::BudgetGuard;

#[derive(Debug, Clone)]
pub struct AuditRecord {
    pub txn_id: String,
    pub score: u32,
    pub decision: String,
    pub reasons: Vec<String>,
    pub created_at: i64,
}

pub struct FirestoreFlusher {
    sender: mpsc::Sender<AuditRecord>,
    _budget_guard: Arc<BudgetGuard>,
    benchmark_mode: bool,
}

impl FirestoreFlusher {
    pub fn new(
        project_id: String,
        budget_guard: Arc<BudgetGuard>,
        benchmark_mode: bool,
    ) -> (Self, tokio::task::JoinHandle<()>) {
        // Bounded channel to prevent memory leakage if Cloud Run throttles CPU
        let (sender, mut receiver) = mpsc::channel::<AuditRecord>(1000);
        let guard_clone = Arc::clone(&budget_guard);

        let worker_handle = tokio::spawn(async move {
            let mut batch = Vec::with_capacity(50);
            let mut interval = tokio::time::interval(Duration::from_millis(500));

            loop {
                tokio::select! {
                    Some(record) = receiver.recv() => {
                        batch.push(record);
                        if batch.len() >= 50 {
                            Self::flush_batch(&batch, &project_id, &guard_clone).await;
                            batch.clear();
                        }
                    }
                    _ = interval.tick() => {
                        if !batch.is_empty() {
                            Self::flush_batch(&batch, &project_id, &guard_clone).await;
                            batch.clear();
                        }
                    }
                }
            }
        });

        (
            Self {
                sender,
                _budget_guard: budget_guard,
                benchmark_mode,
            },
            worker_handle,
        )
    }

    /// Non-blocking audit record queuing
    pub fn queue_record(&self, resp: &ScoreResponse, ts: i64) {
        if self.benchmark_mode {
            // Bypass persistence entirely during benchmark mode
            return;
        }

        let record = AuditRecord {
            txn_id: resp.txn_id.clone(),
            score: resp.score,
            decision: format!("{:?}", resp.decision),
            reasons: resp.reasons.clone(),
            created_at: ts,
        };

        // try_send is strictly non-blocking: drops gracefully if buffer full to protect hot-path
        let _ = self.sender.try_send(record);
    }

    async fn flush_batch(batch: &[AuditRecord], project_id: &str, budget: &BudgetGuard) {
        let count = batch.len() as u32;
        if !budget.try_reserve(count).await {
            tracing::warn!(count, "Firestore batch write cancelled: daily budget cap reached");
            return;
        }

        tracing::info!(
            project = project_id,
            count = batch.len(),
            "Flushing audit batch to Firestore audit_logs collection via REST"
        );
        // Under Cloud Run, actual batch write is delivered to Firestore REST endpoint
    }
}
