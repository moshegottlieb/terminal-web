#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Serve the built site locally with SPA fallback so client-side routes
# (e.g. /projects/sharkstats) work on direct load / refresh.
# Run ./build.sh first if dist/ is missing or stale.
# Extra args are passed through to `serve` (e.g. ./serve.sh -l 8080).

[ -d dist ] || { echo "dist/ not found — run ./build.sh first" >&2; exit 1; }

npx serve -s dist "$@"
