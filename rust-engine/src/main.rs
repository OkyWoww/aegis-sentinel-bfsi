use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;
use axum::{
    extract::State,
    http::{header, HeaderMap, StatusCode},
    response::{Html, IntoResponse},
    routing::{get, post},
    Json, Router,
};
use clap::Parser;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use aegis_sentinel::{
    AppConfig, BudgetGuard, CircuitBreaker, FirestoreFlusher, GeminiSarClient,
    RuleScorer, SlidingWindowEngine,
    SarRequest, ScoreRequest,
};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct CliArgs {
    /// Enable benchmark mode (bypasses persistence queue and SAR generation for k6 load tests)
    #[arg(long, default_value_t = false)]
    benchmark_mode: bool,
}

#[derive(Clone)]
pub struct AppState {
    config: Arc<AppConfig>,
    window_engine: Arc<SlidingWindowEngine>,
    flusher: Arc<FirestoreFlusher>,
    sar_client: Arc<GeminiSarClient>,
    #[allow(dead_code)]
    circuit_breaker: Arc<CircuitBreaker>,
    #[allow(dead_code)]
    budget_guard: Arc<BudgetGuard>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let args = CliArgs::parse();
    let config = Arc::new(AppConfig::from_env(args.benchmark_mode));

    tracing::info!(
        port = config.port,
        benchmark_mode = config.benchmark_mode,
        "Starting AegisSentinel BFSI Rust Engine"
    );

    let window_engine = Arc::new(SlidingWindowEngine::new(
        config.window_max_accounts,
        config.window_capacity,
    ));

    let budget_guard = Arc::new(BudgetGuard::new(config.write_budget_daily));

    let (flusher, _flusher_task) = FirestoreFlusher::new(
        config.firestore_project.clone(),
        Arc::clone(&budget_guard),
        config.benchmark_mode,
    );
    let flusher = Arc::new(flusher);

    let circuit_breaker = Arc::new(CircuitBreaker::new(
        3, // 3 consecutive strikes trip circuit
        std::time::Duration::from_secs(30), // 30-second cooldown
    ));

    let sar_client = Arc::new(GeminiSarClient::new(
        config.gemini_api_key.clone(),
        config.gemini_model.clone(),
        Arc::clone(&circuit_breaker),
    ));

    let state = AppState {
        config: Arc::clone(&config),
        window_engine,
        flusher,
        sar_client,
        circuit_breaker,
        budget_guard,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(index_handler))
        .route("/health", get(health_check))
        .route("/healthz", get(health_check))
        .route("/v1/score", post(score_handler))
        .route("/v1/sar", post(sar_handler))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("AegisSentinel listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn index_handler() -> impl IntoResponse {
    Html(include_str!("../../web-sandbox/public/index.html"))
}

async fn health_check() -> impl IntoResponse {
    (StatusCode::OK, "OK - AegisSentinel BFSI Engine")
}

/// Hot-path transaction scoring route: target P99 < 10ms (Rule evaluation < 100µs)
async fn score_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    payload_res: Result<Json<ScoreRequest>, axum::extract::rejection::JsonRejection>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let start_instant = Instant::now();

    // Validate API Key header (x-api-key) first before body parsing
    let api_key = headers
        .get("x-api-key")
        .and_then(|h| h.to_str().ok())
        .unwrap_or_default();

    if !state.config.api_key.is_empty() && api_key != state.config.api_key {
        return Err((StatusCode::UNAUTHORIZED, "Invalid or missing x-api-key header".to_string()));
    }

    let Json(payload) = payload_res.map_err(|err| {
        (StatusCode::BAD_REQUEST, format!("Invalid JSON payload: {}", err))
    })?;

    // 1. Sliding Window & Feature Extraction
    let (confidence, history, is_new_device) = state
        .window_engine
        .record_and_extract(&payload)
        .await;

    // 2. Pure in-memory Rule Scoring
    let response = RuleScorer::evaluate(&payload, &history, is_new_device, confidence, start_instant);

    // 3. Non-blocking audit persistence dispatch (bypassed if benchmark mode)
    state.flusher.queue_record(&response, payload.ts);

    let proc_us = response.processing_time_us;

    let mut res_headers = HeaderMap::new();
    res_headers.insert("x-processing-time-us", proc_us.to_string().parse().unwrap());
    res_headers.insert(header::CONTENT_TYPE, "application/json".parse().unwrap());

    Ok((StatusCode::OK, res_headers, Json(response)))
}

/// Asynchronous Suspicious Activity Report (SAR) Narrative Generation Route (Proxy to Gemini with Fallback)
async fn sar_handler(
    State(state): State<AppState>,
    payload_res: Result<Json<SarRequest>, axum::extract::rejection::JsonRejection>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let Json(payload) = payload_res.map_err(|err| {
        (StatusCode::BAD_REQUEST, format!("Invalid JSON payload: {}", err))
    })?;

    let response = state.sar_client.generate_sar(&payload).await;

    Ok((StatusCode::OK, Json(response)))
}
