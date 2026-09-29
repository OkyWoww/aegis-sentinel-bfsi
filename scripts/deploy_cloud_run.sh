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
