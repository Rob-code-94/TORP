#!/usr/bin/env bash
# Syncs the six VITE_FIREBASE_* values from .env.local into GCP Secret Manager.
# Usage: GCP_PROJECT_ID=torp-hub ./scripts/sync-vite-secrets-from-env.sh [.env.local]
set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-torp-hub}"
ENVFILE="${1:-.env.local}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ENVFILE" ]]; then
  echo "File not found: $ENVFILE" >&2
  exit 1
fi

NAMES=(
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_STORAGE_BUCKET
  VITE_FIREBASE_MESSAGING_SENDER_ID
  VITE_FIREBASE_APP_ID
)

gcloud config set project "$PROJECT" >/dev/null

for NAME in "${NAMES[@]}"; do
  line="$(grep -E "^${NAME}=" "$ENVFILE" | head -1)" || { echo "Missing $NAME in $ENVFILE" >&2; exit 1; }
  VAL="${line#${NAME}=}"
  VAL="${VAL%$'\r'}"
  if [[ -z "$VAL" ]]; then
    echo "Empty $NAME" >&2
    exit 1
  fi
  if gcloud secrets describe "$NAME" --project "$PROJECT" &>/dev/null; then
    printf '%s' "$VAL" | gcloud secrets versions add "$NAME" --data-file=- --project "$PROJECT" >/dev/null
    echo "Updated: $NAME"
  else
    printf '%s' "$VAL" | gcloud secrets create "$NAME" --data-file=- --project "$PROJECT" >/dev/null
    echo "Created: $NAME"
  fi
done

echo "Secret sync complete for project $PROJECT."
