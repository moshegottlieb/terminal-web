#!/bin/bash
# Builds the site, uploads dist/ to S3, invalidates /index.html on CloudFront.
set -euo pipefail

S3_BUCKET="www.sharkfood.com"
CLOUDFRONT_DISTRIBUTION_ID="E2H76RSG93HSS5"
AWS_REGION="eu-central-1"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

./build.sh

echo ">>> Uploading to s3://$S3_BUCKET/"
# index.html goes last so the new version only flips once its assets exist
aws s3 sync dist/ "s3://$S3_BUCKET/" --region "$AWS_REGION" --exclude index.html --exclude "*.DS_Store"
aws s3 cp dist/index.html "s3://$S3_BUCKET/index.html" --region "$AWS_REGION"

echo ">>> Invalidating /index.html on $CLOUDFRONT_DISTRIBUTION_ID"
aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/index.html" >/dev/null

echo "Deployed -> https://sharkfood.com/"
