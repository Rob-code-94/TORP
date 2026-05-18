#!/usr/bin/env bash
# Canonical TORP Cloud Run host for Square webhooks (stable even if you add a custom domain for users).
set -euo pipefail

export TORP_CLOUD_RUN_SERVICE="${TORP_CLOUD_RUN_SERVICE:-torp-cinematic-production-management}"
export TORP_GCP_PROJECT="${TORP_GCP_PROJECT:-torp-hub}"
export TORP_GCP_REGION="${TORP_GCP_REGION:-us-west1}"

# Fallback when gcloud is unavailable (matches docs/company-reference-from-google-doc.txt).
export TORP_CANONICAL_CLOUD_RUN_URL_FALLBACK="${TORP_CANONICAL_CLOUD_RUN_URL_FALLBACK:-https://torp-cinematic-production-management-483040408359.us-west1.run.app}"

square_canonical_base_url() {
  if [[ -n "${TORP_CANONICAL_CLOUD_RUN_URL:-}" ]]; then
    printf '%s' "${TORP_CANONICAL_CLOUD_RUN_URL%/}"
    return 0
  fi
  if command -v gcloud >/dev/null 2>&1; then
    local url
    if url="$(gcloud run services describe "$TORP_CLOUD_RUN_SERVICE" \
      --project "$TORP_GCP_PROJECT" \
      --region "$TORP_GCP_REGION" \
      --format='value(status.url)' 2>/dev/null)" && [[ -n "$url" ]]; then
      printf '%s' "${url%/}"
      return 0
    fi
  fi
  printf '%s' "${TORP_CANONICAL_CLOUD_RUN_URL_FALLBACK%/}"
}

square_webhook_notification_url() {
  printf '%s/api/webhooks/square' "$(square_canonical_base_url)"
}
