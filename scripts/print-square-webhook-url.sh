#!/usr/bin/env bash
# Prints the canonical Square webhook URL for Square Developer + SQUARE_WEBHOOK_NOTIFICATION_URL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=scripts/lib/square-canonical-url.sh
source "$ROOT/scripts/lib/square-canonical-url.sh"

BASE="$(square_canonical_base_url)"
WEBHOOK="$(square_webhook_notification_url)"

echo "Canonical Cloud Run base URL:"
echo "  $BASE"
echo ""
echo "Square webhook notification URL (register this in Square Developer → Webhooks):"
echo "  $WEBHOOK"
echo ""
echo "Set on Cloud Run:"
echo "  SQUARE_WEBHOOK_NOTIFICATION_URL=$WEBHOOK"
