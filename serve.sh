#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Build, then serve the built site locally with SPA fallback so client-side
# routes (e.g. /projects/sharkstats) work on direct load / refresh.
# Extra args are passed through to `serve` (e.g. ./serve.sh -l 8080).

./build.sh

npx serve -s dist "$@"
