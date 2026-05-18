#!/usr/bin/env bash
# Grant Cloud Run runtime SA permission to verify Firebase ID tokens (Admin SDK).
set -euo pipefail

PROJECT="${GCP_PROJECT_ID:-torp-hub}"
SA="${TORP_CLOUD_RUN_SA:-483040408359-compute@developer.gserviceaccount.com}"

echo "Granting roles/firebaseauth.admin to $SA on $PROJECT"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:$SA" \
  --role="roles/firebaseauth.admin" \
  --quiet >/dev/null

echo "Done. New Cloud Run revisions can verify Bearer tokens on /api/square/* and /api/v1/whoami."
