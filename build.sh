#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Use hash for production, empty for dev
if [ "${1:-}" = "--dev" ]; then
  HASH=""
  SUBDIR=""
  echo "Building dev..."
else
  HASH=$(git rev-parse --short HEAD 2>/dev/null || date +%s)
  SUBDIR="$HASH/"
  echo "Building with hash: $HASH"
fi

# Clean dist
rm -rf dist
mkdir -p "dist/$SUBDIR"

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc

# Move compiled JS into the target directory
mv dist/main.js "dist/${SUBDIR}main.js"

# Copy assets
if [ -n "$HASH" ]; then
  sed "s|url('/fonts/|url('/$HASH/fonts/|g" style.css > "dist/${SUBDIR}style.css"
else
  cp style.css dist/
fi
cp content.json "dist/${SUBDIR}content.json"
cp -r fonts "dist/${SUBDIR}fonts"
cp -r img "dist/${SUBDIR}img"
cp -r themes "dist/${SUBDIR}themes"

# Copy root-level files
cp favicon.ico dist/
cp robots.txt dist/
cp logo192.png dist/
cp logo512.png dist/
cp manifest.json dist/
[ -f bimi.svg ] && cp bimi.svg dist/

# Generate index.html
if [ -n "$HASH" ]; then
  sed -e "s|href=\"/style.css\"|href=\"/$HASH/style.css\"|" \
      -e "s|src=\"/dist/main.js\"|src=\"/$HASH/main.js\"|" \
      -e "s|</head>|  <script>var ASSET_BASE=\"/$HASH/\";</script>\n</head>|" \
      index.html > dist/index.html
else
  sed -e "s|src=\"/dist/main.js\"|src=\"/main.js\"|" \
      index.html > dist/index.html
fi

echo "Build complete -> dist/"
