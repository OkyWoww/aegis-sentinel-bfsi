# AegisSentinel BFSI - Specification Pack v2
**Team:** LogicForge AI  
**Track:** Google Cloud AI Builder Cup 2026 (BFSI Track)  
**Target Project:** `genai-track3-coffee` (Region: `us-central1`)  
**Core Stack:** Rust (Axum, Tokio), Google Cloud Run, Firebase Hosting, Firestore, Gemini 3.8 Flash

---

## 1. Executive Summary & Problem Statement
* **Problem:** Sistem fraud detection perbankan modern terbentur dua ekstrem: rule-engine konvensional yang kaku & mudah dievasi, atau pipeline machine learning/LLM yang sangat lambat (latensi ratusan ms) dan boros komputasi. Pembuatan narasi *Suspicious Activity Report* (SAR) secara manual memakan waktu 30-45 menit per kasus.
* **Solution:** AegisSentinel BFSI memisahkan jalur *hot-path scoring* murni in-memory di Rust (P99 server-side < 10ms) dengan jalur asinkron *SAR Narrative Generation* menggunakan Gemini 3.8 Flash terstruktur dan Firestore audit logs.
* **Cost Constraint:** 100% Zero-Cost Architecture (memanfaatkan jatah Cloud Run Always Free Tier 1 di `us-central1`, Firebase Hosting, dan Firestore Spark/Blaze free quota).

---

## 2. Arsitektur Sistem & Data Flow

```text
 Client / Simulator / k6
        │  POST /v1/score  (Header: x-api-key)
        ▼
 ┌─────────────────────────────────────────────┐
 │ Firebase Hosting (Dashboard + Rewrites)     │──► Firestore (Read-Only via Firebase SDK + Rules)
 └───────────────┬─────────────────────────────┘        ▲
                 │ Rewrites: /v1/*                      │ Asynchronous Batch Write
                 ▼                                      │ (REST + OAuth gcp_auth)
 ┌──────────────────────── Cloud Run (Rust Engine, 1 Instance) ─┴───────────────┐
 │ Axum HTTP Engine                                                             │
 │  ├─ POST /v1/score ──► FeatureExtractor ──► Moka Cache (In-Memory Window)     │
 │  │                          │                  (50k Accounts, TTI 15m)       │
 │  │                          ▼                                                │
 │  │                     Rule Scorer ───────► Decision (ALLOW / REVIEW / BLOCK)│
 │  │                          │                                                │
 │  │                          ▼ (Non-blocking try_send)                        │
 │  │                   Persistence Queue ───► Firestore REST Batch Flusher     │
 │  │                                          (Daily Hard Budget Guard: 10k)   │
 │  │                                                                           │
 │  └─ POST /v1/sar ────► SAR Service ───────► Circuit Breaker (Threshold/429)  │
 │                             │                         ├─ [Closed] ──► Gemini │
 │                             │                         └─ [Open]   ──► Fallback│
 │                             ▼                                                │
 │                        sar_reports Collection (Firestore)                    │
 └──────────────────────────────────────────────────────────────────────────────┘
 * Mode Benchmark: CLI Flag `--benchmark-mode` bypass Persistence & SAR (Noop Engine)
```

---

## 3. Analisis Wald: Single Point of Failure (SPOF) & Mitigasi Inversi

| Titik Lemah Fatal (*Engine Failure*) | Risiko Nyata | Mitigasi Arsitektur |
| --- | --- | --- |
| **State Reset (Scale-to-Zero)** | Cold start menghapus riwayat sliding window memori, velocity transaksi kembali nol. | Pasang `max-instances=1`, sertakan metrik `window_confidence` (0.0-1.0) di response JSON agar engine tidak diam-diam over-confident saat cold start. |
| **Quota Burst (Gemini 429)** | Trafik burst menyebabkan rate-limit 429 dan demo live macet total. | Circuit Breaker 3-strike state machine + fallback otomatis ke *rule-based deterministic narrative* bertanda `narrative_source: "rule_based_fallback"`. |
| **Pembengkakan Biaya Firestore** | Benchmark k6 menembus 20k write/hari kuota gratis. | Hard write budget guard di level aplikasi (maksimal 10.000 writes/hari) + bypass total via `--benchmark-mode`. |
| **Throttling CPU Cloud Run** | CPU dipotong di luar active request, background flusher tertahan. | Non-blocking bounded channel dengan *flush-on-request* fallback & test case khusus (T-12). |

---

## 4. Spesifikasi API & Kontrak Data

### 4.1. `POST /v1/score`

* **Request Body:**

```json
{
  "txn_id": "txn_89234812",
  "account_id": "acc_091238",
  "amount": 4950000.0,
  "currency": "IDR",
  "merchant_id": "merch_crypto_p2p",
  "channel": "MOBILE_BANKING",
  "device_id": "dev_android_9918",
  "ts": 1727608800,
  "geo": {"lat": -6.2088, "lon": 106.8456}
}
```

* **Response Body (HTTP 200):**

```json
{
  "txn_id": "txn_89234812",
  "score": 85,
  "decision": "BLOCK",
  "reasons": ["VELOCITY_BURST", "STRUCTURING_SUSPECT", "NEW_DEVICE"],
  "window_confidence": 0.95,
  "processing_time_us": 84
}
```

* **Header Khusus:** `x-processing-time-us: 84`

### 4.2. `POST /v1/sar`

* **Request Body:** `{"case_id": "case_txn_89234812"}`
* **Response Body (HTTP 200):**

```json
{
  "case_id": "case_txn_89234812",
  "risk_rating": "CRITICAL",
  "narrative_source": "gemini",
  "narrative": "Akun acc_091238 terdeteksi melakukan 4 transaksi beruntun tepat di bawah batas pelaporan AML dalam jeda < 30 detik menggunakan perangkat baru...",
  "red_flags": ["VELOCITY_BURST", "STRUCTURING_SUSPECT"],
  "recommended_action": "FREEZE_ACCOUNT_AND_FILE_STR"
}
```

---

## 5. Konfigurasi Environment & Deploy

```env
# Server
PORT=8080
RUST_LOG=info
SCORE_API_KEY=your_secure_api_key_here

# GCP & Gemini
FIRESTORE_PROJECT=genai-track3-coffee
GEMINI_API_KEY=your_ai_studio_api_key
GEMINI_MODEL=gemini-3.8-flash

# Engine Parameters
WINDOW_MAX_ACCOUNTS=50000
WINDOW_CAPACITY=64
WRITE_BUDGET_DAILY=10000
BENCHMARK_MODE=0
```

### Deploy Command (Cloud Run):

```bash
#!/usr/bin/env bash
set -e

PROJECT_ID="genai-track3-coffee"
REGION="us-central1"
SERVICE_NAME="aegis-sentinel"

echo "Deploying AegisSentinel BFSI to Cloud Run (${PROJECT_ID})..."

gcloud run deploy "$SERVICE_NAME" \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --source ./rust-engine \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 80 \
  --cpu 1 \
  --memory 256Mi \
  --set-env-vars GEMINI_MODEL="gemini-3.8-flash" \
  --set-env-vars FIRESTORE_PROJECT="$PROJECT_ID" \
  --set-env-vars BENCHMARK_MODE="0" \
  --set-env-vars GEMINI_API_KEY="$GEMINI_API_KEY" \
  --set-env-vars SCORE_API_KEY="$SCORE_API_KEY"
```

---

## 6. Implementation Task Checklist (SDD Execution)

* [ ] **T-01: Scaffolding & Cargo Setup:** Inisialisasi workspace Rust, `Cargo.toml`, dan pastikan `cargo check` clean.
* [ ] **T-02: Window & Feature Engine:** Implementasi bounded ring-buffer per akun menggunakan `moka` + unit test temporal velocity.
* [ ] **T-03: Rule Scorer & Criterion:** Implementasi bobot skor, scoring reasons, dan validasi baseline Criterion (< 100µs).
* [ ] **T-04: Axum API Routes:** Route `/v1/score`, middleware logging latensi, dan header `x-processing-time-us`.
* [ ] **T-05: Circuit Breaker & Fallback:** State machine circuit breaker untuk proteksi error 429 dan kuota habis.
* [ ] **T-06: Gemini SAR Structured Client:** Integrasi REST endpoint Gemini dengan validasi skema JSON ketat.
* [ ] **T-07: Firestore Writer & Budget Guard:** Flusher batch REST Firestore dengan auth via `gcp_auth` dan hard budget cap 10k.
* [ ] **T-08: Benchmark Mode:** CLI flag `--benchmark-mode` untuk pengujian k6 tanpa merusak kuota cloud.
* [ ] **T-09: Multi-Stage Dockerfile:** Build binary statis musl dengan base `distroless/static-debian12`.
* [ ] **T-10: Cloud Run Deployment:** Deploy ke GCP project `genai-track3-coffee` region `us-central1`.
* [ ] **T-11: Firebase Dashboard & Rules:** UI HTML/JS statis di Firebase Hosting untuk audit visual live.
* [ ] **T-12: Verification & Smoke Test:** Pengujian end-to-end payload transaksi fraud dan verifikasi log.
