#!/usr/bin/env bash
set -euo pipefail

# TORP Google Cloud defaults (project id)
PROJECT_ID="${TORP_GCP_PROJECT_ID:-torp-hub}"

# Make gcloud non-interactive (avoids "(y/N)?" hangs in automation)
export CLOUDSDK_CORE_DISABLE_PROMPTS=1

echo "Using GCP project: ${PROJECT_ID}"

gcloud config set project "${PROJECT_ID}"

# Optional: ensure Resource Manager API is enabled (safe to run repeatedly)
gcloud services enable cloudresourcemanager.googleapis.com --project "${PROJECT_ID}" >/dev/null

echo "Active gcloud configuration:"
gcloud config list --format='text(core.project,core.account)'
