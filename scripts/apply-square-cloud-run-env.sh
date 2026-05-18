#!/usr/bin/env bash
# Wire Square secrets + canonical webhook URL onto Cloud Run (runtime, not build-time).
# Prereq: ./scripts/sync-square-secrets-from-env.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/square-canonical-url.sh
source "$ROOT/scripts/lib/square-canonical-url.sh"

PROJECT="${GCP_PROJECT_ID:-torp-hub}"
SERVICE="${TORP_CLOUD_RUN_SERVICE:-torp-cinematic-production-management}"
REGION="${TORP_GCP_REGION:-us-west1}"
WEBHOOK_URL="$(square_webhook_notification_url)"

gcloud config set project "$PROJECT" >/dev/null

SECRETS=(
  "SQUARE_ACCESS_TOKEN=SQUARE_ACCESS_TOKEN:latest"
  "SQUARE_LOCATION_ID=SQUARE_LOCATION_ID:latest"
  "SQUARE_ENVIRONMENT=SQUARE_ENVIRONMENT:latest"
)

if gcloud secrets describe SQUARE_WEBHOOK_SIGNATURE_KEY --project "$PROJECT" &>/dev/null; then
  SECRETS+=("SQUARE_WEBHOOK_SIGNATURE_KEY=SQUARE_WEBHOOK_SIGNATURE_KEY:latest")
else
  echo "Note: SQUARE_WEBHOOK_SIGNATURE_KEY secret not found — webhooks will return 503 until you sync it." >&2
fi

# Notification URL is not secret — set explicitly so it always matches canonical run.app host.
gcloud run services update "$SERVICE" \
  --project "$PROJECT" \
  --region "$REGION" \
  --update-secrets="$(IFS=,; echo "${SECRETS[*]}")" \
  --update-env-vars="SQUARE_WEBHOOK_NOTIFICATION_URL=${WEBHOOK_URL}" \
  --quiet

echo "Cloud Run service updated: $SERVICE"
echo "  SQUARE_WEBHOOK_NOTIFICATION_URL=$WEBHOOK_URL"
echo ""
echo "Confirm Square Developer → Webhooks → Production uses the same notification URL."
