#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Generate a short hash for cache busting
HASH=$(git rev-parse --short HEAD 2>/dev/null || date +%s)

echo "Building with hash: $HASH"

# Clean dist
rm -rf dist
mkdir -p "dist/$HASH"

# Type check
echo "Type checking..."
npx tsc --noEmit

# Bundle TypeScript
echo "Bundling..."
npx esbuild src/main.ts --bundle --outfile="dist/$HASH/main.js" --target=es2020

# Copy assets into versioned directory (rewrite absolute font paths)
sed "s|url('/fonts/|url('/$HASH/fonts/|g" style.css > "dist/$HASH/style.css"
cp -r content "dist/$HASH/content"
cp -r fonts "dist/$HASH/fonts"
cp -r img "dist/$HASH/img"
cp -r themes "dist/$HASH/themes"
cp manifest.json "dist/$HASH/manifest.json"
cp logo192.png "dist/$HASH/logo192.png"
cp logo512.png "dist/$HASH/logo512.png"

# Copy root-level files (must be at site root)
cp favicon.ico dist/
cp robots.txt dist/
[ -f bimi.svg ] && cp bimi.svg dist/

# Generate index.html with versioned paths
sed -e "s|href=\"/style.css\"|href=\"/$HASH/style.css\"|" \
    -e "s|src=\"/dist/main.js\"|src=\"/$HASH/main.js\"|" \
    -e "s|href=\"/manifest.json\"|href=\"/$HASH/manifest.json\"|" \
    -e "s|href=\"/logo192.png\"|href=\"/$HASH/logo192.png\"|" \
    -e "s|</head>|  <script>var ASSET_BASE=\"/$HASH/\";</script>\n</head>|" \
    index.html > dist/index.html

echo "Build complete -> dist/ (hash: $HASH)"
echo "Deploy: upload dist/ to S3, invalidate only /index.html on CloudFront"
