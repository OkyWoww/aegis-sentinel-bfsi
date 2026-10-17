#!/usr/bin/env bash
set -euo pipefail

# Root launcher for web-sandbox/deploy-web.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/web-sandbox/deploy-web.sh" "$@"
