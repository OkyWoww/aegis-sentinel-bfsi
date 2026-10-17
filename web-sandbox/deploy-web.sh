#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------------------
# AegisSentinel BFSI - Web Sandbox Deployment Script
# Target: Firebase Hosting (Spark Plan - Zero Billing)
# -------------------------------------------------------------

# Ensure script is executed inside web-sandbox directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(basename "$SCRIPT_DIR")" != "web-sandbox" ]]; then
  if [[ -d "$SCRIPT_DIR/web-sandbox" ]]; then
    cd "$SCRIPT_DIR/web-sandbox"
  fi
else
  cd "$SCRIPT_DIR"
fi

echo "==========================================================="
echo " AegisSentinel BFSI — Web Sandbox Deployment (Spark Plan)  "
echo "==========================================================="

# 1. Validate required environment variables
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-aegis-sentinel-bfsi-11b46}"
echo "[+] Target Firebase Project ID: ${FIREBASE_PROJECT_ID}"

# 2. Inject FIREBASE_PROJECT_ID into .firebaserc
echo "[+] Configuring .firebaserc for project: ${FIREBASE_PROJECT_ID}..."
cat <<EOF > .firebaserc
{
  "projects": {
    "default": "${FIREBASE_PROJECT_ID}"
  }
}
EOF

# 3. Prepare public/index.html from index.template.html (zero client-side secrets)
echo "[+] Syncing index.template.html into public/index.html (secure zero-secret sandbox)..."
mkdir -p public
cp index.template.html public/index.html

echo "[+] Created public/index.html (server-side proxy architecture)."

# 4. Deploy using npx firebase-tools
echo "[+] Deploying to Firebase Hosting (--only hosting)..."
npx --yes firebase-tools deploy --only hosting

echo "==========================================================="
echo "[+] Deployment completed successfully!"
echo "==========================================================="
