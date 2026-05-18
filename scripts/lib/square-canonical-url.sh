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
  # Prefer stable fallback: gcloud status.url can return a different hostname (e.g. ks75xiqola-uw.a.run.app)
  # than the URL registered in Square; HMAC verification requires an exact string match.
  printf '%s' "${TORP_CANONICAL_CLOUD_RUN_URL_FALLBACK%/}"
}

square_webhook_notification_url() {
  printf '%s/api/webhooks/square' "$(square_canonical_base_url)"
}
