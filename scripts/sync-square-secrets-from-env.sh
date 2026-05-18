#!/usr/bin/env bash
# Sync SQUARE_* values from .env.square.local into GCP Secret Manager.
# Usage: ./scripts/sync-square-secrets-from-env.sh [.env.square.local]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/square-canonical-url.sh
source "$ROOT/scripts/lib/square-canonical-url.sh"

PROJECT="${GCP_PROJECT_ID:-torp-hub}"
REQUIRE_WEBHOOK_KEY=1
ENVFILE="$ROOT/.env.square.local"
for arg in "$@"; do
  case "$arg" in
    --without-webhook-key) REQUIRE_WEBHOOK_KEY=0 ;;
    *) ENVFILE="$arg" ;;
  esac
done
cd "$ROOT"

if [[ ! -f "$ENVFILE" ]]; then
  echo "File not found: $ENVFILE" >&2
  echo "Copy .env.square.example → .env.square.local and fill values." >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENVFILE"
set +a

if [[ -z "${SQUARE_WEBHOOK_NOTIFICATION_URL:-}" ]]; then
  export SQUARE_WEBHOOK_NOTIFICATION_URL="$(square_webhook_notification_url)"
  echo "Derived SQUARE_WEBHOOK_NOTIFICATION_URL=$SQUARE_WEBHOOK_NOTIFICATION_URL"
fi

REQUIRED=(
  SQUARE_ACCESS_TOKEN
  SQUARE_LOCATION_ID
  SQUARE_ENVIRONMENT
  SQUARE_WEBHOOK_NOTIFICATION_URL
)

OPTIONAL=(
  SQUARE_WEBHOOK_SIGNATURE_KEY
)

for NAME in "${REQUIRED[@]}"; do
  VAL="${!NAME:-}"
  if [[ -z "$VAL" ]]; then
    echo "Missing or empty $NAME in $ENVFILE" >&2
    if [[ "$NAME" == "SQUARE_LOCATION_ID" ]]; then
      echo "  Get it: node scripts/fetch-square-location-id.mjs" >&2
    fi
    exit 1
  fi
done

NAMES=("${REQUIRED[@]}")
if [[ "$REQUIRE_WEBHOOK_KEY" == "1" ]]; then
  if [[ -z "${SQUARE_WEBHOOK_SIGNATURE_KEY:-}" ]]; then
    echo "Missing SQUARE_WEBHOOK_SIGNATURE_KEY — create the Production webhook in Square first," >&2
    echo "  or run: $0 --without-webhook-key" >&2
    exit 1
  fi
  NAMES+=("SQUARE_WEBHOOK_SIGNATURE_KEY")
elif [[ -n "${SQUARE_WEBHOOK_SIGNATURE_KEY:-}" ]]; then
  NAMES+=("SQUARE_WEBHOOK_SIGNATURE_KEY")
fi

gcloud config set project "$PROJECT" >/dev/null

for NAME in "${NAMES[@]}"; do
  VAL="${!NAME}"
  if gcloud secrets describe "$NAME" --project "$PROJECT" &>/dev/null; then
    printf '%s' "$VAL" | gcloud secrets versions add "$NAME" --data-file=- --project "$PROJECT" >/dev/null
    echo "Updated secret: $NAME"
  else
    printf '%s' "$VAL" | gcloud secrets create "$NAME" --data-file=- --project "$PROJECT" >/dev/null
    echo "Created secret: $NAME"
  fi
done

echo "Square secret sync complete for project $PROJECT."
