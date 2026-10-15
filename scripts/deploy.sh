#!/usr/bin/env bash
# Upload public/ to the site bucket and invalidate the CloudFront cache.
#
# Usage: SITE_BUCKET=... CLOUDFRONT_DISTRIBUTION_ID=... scripts/deploy.sh
# Both values are outputs of the matching environment in the infra repo:
#   terraform output -raw bucket_name
#   terraform output -raw distribution_id
set -euo pipefail

: "${SITE_BUCKET:?SITE_BUCKET is required}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?CLOUDFRONT_DISTRIBUTION_ID is required}"

SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)/public"

echo "==> Syncing static assets to s3://${SITE_BUCKET}"
# Everything except HTML: cache at the edge and in browsers for a day.
aws s3 sync "${SRC_DIR}" "s3://${SITE_BUCKET}" \
  --delete \
  --exclude "*.html" \
  --cache-control "public, max-age=86400"

echo "==> Syncing HTML to s3://${SITE_BUCKET}"
# HTML: always revalidate so new deploys show up immediately.
aws s3 sync "${SRC_DIR}" "s3://${SITE_BUCKET}" \
  --delete \
  --exclude "*" \
  --include "*.html" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "public, max-age=0, must-revalidate"

echo "==> Invalidating CloudFront distribution ${CLOUDFRONT_DISTRIBUTION_ID}"
aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_DISTRIBUTION_ID}" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text
