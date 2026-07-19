#!/bin/bash
# Builds the site, uploads dist/ to S3, invalidates /index.html on CloudFront.
set -euo pipefail

S3_BUCKET="www.sharkfood.com"
CLOUDFRONT_DISTRIBUTION_ID="E2H76RSG93HSS5"
AWS_REGION="eu-central-1"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Refuse to deploy anything that isn't committed and pushed
if [ -n "$(git status --porcelain)" ]; then
    echo "error: working tree is not clean — commit or stash first" >&2
    exit 1
fi
git fetch -q origin
if [ -n "$(git rev-list "@{u}..HEAD" 2>/dev/null)" ]; then
    echo "error: local commits not pushed — push first" >&2
    exit 1
fi

./build.sh

echo ">>> Uploading to s3://$S3_BUCKET/"
# index.html goes last so the new version only flips once its assets exist
aws s3 sync dist/ "s3://$S3_BUCKET/" --region "$AWS_REGION" --exclude index.html --exclude "*.DS_Store"
# no-cache so browsers always revalidate index.html; assets are immutable under their hash dir
aws s3 cp dist/index.html "s3://$S3_BUCKET/index.html" --region "$AWS_REGION" \
    --cache-control "no-cache, must-revalidate"

echo ">>> Invalidating /index.html on $CLOUDFRONT_DISTRIBUTION_ID"
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/index.html" >/dev/null

HASH=$(git rev-parse --short HEAD)
echo ">>> Removing old version directories (keeping $HASH)"
for prefix in $(aws s3api list-objects-v2 --bucket "$S3_BUCKET" --delimiter / \
        --query 'CommonPrefixes[].Prefix' --output text --region "$AWS_REGION"); do
    dir="${prefix%/}"
    # only git-short-hash directories are versions; downloads/ etc. are not hex
    if [[ "$dir" =~ ^[0-9a-f]{7,12}$ && "$dir" != "$HASH" ]]; then
        aws s3 rm "s3://$S3_BUCKET/$prefix" --recursive --region "$AWS_REGION" >/dev/null
        echo "    removed $dir"
    fi
done

echo "Deployed -> https://sharkfood.com/"
