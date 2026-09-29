use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

pub struct CircuitBreaker {
    state: Arc<RwLock<CircuitState>>,
    consecutive_failures: AtomicU32,
    failure_threshold: u32,
    cooldown_period: Duration,
    last_failure_time: Arc<RwLock<Option<Instant>>>,
}

impl CircuitBreaker {
    pub fn new(failure_threshold: u32, cooldown_period: Duration) -> Self {
        Self {
            state: Arc::new(RwLock::new(CircuitState::Closed)),
            consecutive_failures: AtomicU32::new(0),
            failure_threshold,
            cooldown_period,
            last_failure_time: Arc::new(RwLock::new(None)),
        }
    }

    /// Check if a request can be executed through the circuit breaker
    pub async fn can_execute(&self) -> bool {
        let mut state_guard = self.state.write().await;
        match *state_guard {
            CircuitState::Closed => true,
            CircuitState::Open => {
                let last_time = self.last_failure_time.read().await;
                if let Some(t) = *last_time {
                    if t.elapsed() >= self.cooldown_period {
                        *state_guard = CircuitState::HalfOpen;
                        return true;
                    }
                }
                false
            }
            CircuitState::HalfOpen => true,
        }
    }

    pub async fn record_success(&self) {
        let mut state_guard = self.state.write().await;
        self.consecutive_failures.store(0, Ordering::Relaxed);
        *state_guard = CircuitState::Closed;
    }

    pub async fn record_failure(&self) {
        let failures = self.consecutive_failures.fetch_add(1, Ordering::Relaxed) + 1;
        let mut last_time = self.last_failure_time.write().await;
        *last_time = Some(Instant::now());

        if failures >= self.failure_threshold {
            let mut state_guard = self.state.write().await;
            *state_guard = CircuitState::Open;
            tracing::warn!(failures, "Circuit Breaker TRIP: Switched to OPEN state");
        }
    }

    pub async fn current_state(&self) -> CircuitState {
        *self.state.read().await
    }

    pub fn failure_count(&self) -> u32 {
        self.consecutive_failures.load(Ordering::Relaxed)
    }
}
