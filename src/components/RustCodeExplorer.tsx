import React, { useState } from 'react';
import { Terminal, Copy, Check, Code2, Server } from 'lucide-react';

const SNIPPETS: { title: string; filename: string; language: string; code: string }[] = [
  {
    title: 'Axum HTTP Routes & Latency Header',
    filename: 'rust-engine/src/main.rs',
    language: 'rust',
    code: `// Hot-path transaction scoring route: target P99 < 10ms (Rule evaluation < 100µs)
async fn score_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<ScoreRequest>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let start_instant = Instant::now();

    // Validate API Key header (x-api-key)
    let api_key = headers.get("x-api-key").and_then(|h| h.to_str().ok()).unwrap_or_default();
    if !state.config.api_key.is_empty() && api_key != state.config.api_key {
        return Err((StatusCode::UNAUTHORIZED, "Invalid or missing x-api-key header".to_string()));
    }

    // 1. Sliding Window & Feature Extraction
    let (confidence, history, is_new_device) = state.window_engine.record_and_extract(&payload).await;

    // 2. Pure in-memory Rule Scoring (< 100µs)
    let response = RuleScorer::evaluate(&payload, &history, is_new_device, confidence, start_instant);

    // 3. Non-blocking audit persistence dispatch (bypassed if benchmark mode)
    state.flusher.queue_record(&response, payload.ts);

    let mut res_headers = HeaderMap::new();
    res_headers.insert("x-processing-time-us", response.processing_time_us.to_string().parse().unwrap());
    Ok((StatusCode::OK, res_headers, Json(response)))
}`,
  },
  {
    title: 'Sliding Window Ring Buffer & Confidence',
    filename: 'rust-engine/src/engine/window.rs',
    language: 'rust',
    code: `pub struct AccountWindow {
    pub ring_buffer: VecDeque<TransactionSnapshot>,
    pub capacity: usize,
    pub created_at_ts: i64,
}

impl AccountWindow {
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
}`,
  },
  {
    title: 'Circuit Breaker 3-Strike State Machine',
    filename: 'rust-engine/src/sar/circuit_breaker.rs',
    language: 'rust',
    code: `pub async fn can_execute(&self) -> bool {
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
}`,
  },
  {
    title: 'Cloud Run Multi-Stage Dockerfile',
    filename: 'rust-engine/Dockerfile',
    language: 'dockerfile',
    code: `FROM rust:1.80-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static
COPY Cargo.toml ./
COPY . .
RUN cargo build --release --target x86_64-unknown-linux-musl

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/aegis-sentinel /aegis-sentinel
ENV PORT=8080
ENV RUST_LOG=info
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/aegis-sentinel"]`,
  },
  {
    title: 'Gemini SAR REST Client & Markdown Stripping',
    filename: 'rust-engine/src/sar/gemini.rs',
    language: 'rust',
    code: `let body = json!({
    "contents": [{ "parts": [{ "text": prompt }] }],
    "generationConfig": {
        "responseMimeType": "application/json",
        "temperature": 0.2,
        "responseSchema": { ... }
    }
});

let resp = self.client.post(&endpoint)
    .header("x-goog-api-key", &self.api_key)
    .json(&body)
    .send().await?;

// Strip potential markdown codeblock formatting \`\`\`json ... \`\`\`
let clean_text = text_content
    .trim()
    .trim_start_matches("\`\`\`json")
    .trim_start_matches("\`\`\`")
    .trim_end_matches("\`\`\`")
    .trim();

let parsed: Value = serde_json::from_str(clean_text)?;`,
  },
  {
    title: 'Cloud Run Production Deployment Command',
    filename: 'scripts/deploy_cloud_run.sh',
    language: 'bash',
    code: `#!/usr/bin/env bash
set -e

PROJECT_ID="genai-track3-coffee"
REGION="us-central1"
SERVICE_NAME="aegis-sentinel"

echo "Deploying AegisSentinel BFSI to Cloud Run (\${PROJECT_ID})..."

gcloud run deploy "$SERVICE_NAME" \\
  --project "$PROJECT_ID" \\
  --region "$REGION" \\
  --source ./rust-engine \\
  --allow-unauthenticated \\
  --min-instances 0 \\
  --max-instances 1 \\
  --concurrency 80 \\
  --cpu 1 \\
  --memory 256Mi \\
  --set-env-vars GEMINI_MODEL="gemini-2.5-flash" \\
  --set-env-vars FIRESTORE_PROJECT="$PROJECT_ID" \\
  --set-env-vars BENCHMARK_MODE="0" \\
  --set-env-vars GEMINI_API_KEY="$GEMINI_API_KEY" \\
  --set-env-vars SCORE_API_KEY="$SCORE_API_KEY"`,
  },
];

export const RustCodeExplorer: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const active = SNIPPETS[selectedIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
              <Code2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Rust Engine &amp; Cloud Deployment Skeleton
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Arsitektur modul Rust siap deploy ke Google Cloud Run (musl static binary + distroless)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Navigation tabs */}
        <div className="lg:col-span-4 space-y-1.5">
          {SNIPPETS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition ${
                selectedIdx === idx
                  ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40 font-semibold'
                  : 'bg-slate-950/50 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
              }`}
            >
              <div className="font-medium text-slate-200">{s.title}</div>
              <div className="text-[10px] font-mono text-slate-500 mt-0.5">{s.filename}</div>
            </button>
          ))}
        </div>

        {/* Code viewer */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/60">
            <span className="text-xs font-mono text-cyan-400 font-semibold">
              {active.filename}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-800/80 px-2 py-1 rounded transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Tersalin' : 'Salin Kode'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[350px]">
            <code>{active.code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
