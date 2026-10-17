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
if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "[-] ERROR: Environment variable GEMINI_API_KEY is not set." >&2
  echo "    Please run:" >&2
  echo "    export GEMINI_API_KEY=\"your-gemini-api-key\"" >&2
  echo "    export FIREBASE_PROJECT_ID=\"your-firebase-project-id\"" >&2
  echo "    ./deploy-web.sh" >&2
  exit 1
fi

if [ -z "${FIREBASE_PROJECT_ID:-}" ]; then
  echo "[-] ERROR: Environment variable FIREBASE_PROJECT_ID is not set." >&2
  echo "    Please run:" >&2
  echo "    export GEMINI_API_KEY=\"your-gemini-api-key\"" >&2
  echo "    export FIREBASE_PROJECT_ID=\"your-firebase-project-id\"" >&2
  echo "    ./deploy-web.sh" >&2
  exit 1
fi

echo "[+] Validation passed: GEMINI_API_KEY and FIREBASE_PROJECT_ID are present."

# 2. Inject FIREBASE_PROJECT_ID into .firebaserc
echo "[+] Configuring .firebaserc for project: ${FIREBASE_PROJECT_ID}..."
cat <<EOF > .firebaserc
{
  "projects": {
    "default": "${FIREBASE_PROJECT_ID}"
  }
}
EOF

# 3. Inject GEMINI_API_KEY from index.template.html into public/index.html using sed
echo "[+] Injecting GEMINI_API_KEY into public/index.html..."
mkdir -p public

# Escape special sed characters (& and |) in key if any
ESCAPED_KEY=$(printf '%s\n' "$GEMINI_API_KEY" | sed -e 's/[\/&]/\\&/g')
sed "s|__GEMINI_API_KEY__|${ESCAPED_KEY}|g" index.template.html > public/index.html

echo "[+] Created public/index.html (git-ignored for security)."

# 4. Deploy using npx firebase-tools
echo "[+] Deploying to Firebase Hosting (--only hosting)..."
npx --yes firebase-tools deploy --only hosting

echo "==========================================================="
echo "[+] Deployment completed successfully!"
echo "==========================================================="
