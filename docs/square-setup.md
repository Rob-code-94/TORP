# Square billing setup (TORP merchant)

TORP uses a **single canonical Cloud Run URL** for Square webhooks. If you later map a custom domain (e.g. `app.torp.life`) to the same service, **keep Square registered on the `run.app` URL** unless you update both Square and `SQUARE_WEBHOOK_NOTIFICATION_URL` together.

## Canonical URLs

| Purpose | URL |
|---------|-----|
| Site (current production) | `https://torp-cinematic-production-management-483040408359.us-west1.run.app` |
| Square webhook (register in Square + Cloud Run) | `https://torp-cinematic-production-management-483040408359.us-west1.run.app/api/webhooks/square` |

Confirm the host is still correct:

```bash
./scripts/print-square-webhook-url.sh
```

If `gcloud` returns a different `status.url`, update [`.env.square.example`](../.env.square.example) fallback in [`scripts/lib/square-canonical-url.sh`](../scripts/lib/square-canonical-url.sh) or set `TORP_CANONICAL_CLOUD_RUN_URL` when running scripts.

## 1. Credentials (local)

1. Copy [`.env.square.example`](../.env.square.example) → `.env.square.local` (git-ignored).
2. Fill production token (from Square Developer → your TORP app → Credentials → Production).
3. Get **Location ID** (not the street address):

   ```bash
   node scripts/fetch-square-location-id.mjs
   ```

   Set `SQUARE_LOCATION_ID` in `.env.square.local`.

4. Leave `SQUARE_WEBHOOK_SIGNATURE_KEY` empty until step 2.

## 2. Square Developer — Production webhook

1. [Square Developer](https://developer.squareup.com/console/en/apps) → your TORP app → **Webhooks** → **Production**.
2. **Notification URL** — paste exactly (from `./scripts/print-square-webhook-url.sh`):

   `https://torp-cinematic-production-management-483040408359.us-west1.run.app/api/webhooks/square`

3. Subscribe to **invoice** events (`invoice.created`, `invoice.updated`, `invoice.published`, `invoice.payment_made`, or equivalent).
4. Copy **Webhook signature key** → `SQUARE_WEBHOOK_SIGNATURE_KEY` in `.env.square.local`.

Do **not** change this URL when you add a custom domain for users. Custom domains are for browsers only unless you deliberately re-register the webhook.

## 3. GCP Secret Manager + Cloud Run

After `gcloud auth login`:

```bash
# Before the Square webhook exists (signature key empty):
./scripts/sync-square-secrets-from-env.sh --without-webhook-key
./scripts/apply-square-cloud-run-env.sh

# After you add the Production webhook and copy the signature key into .env.square.local:
./scripts/sync-square-secrets-from-env.sh
./scripts/apply-square-cloud-run-env.sh
```

Grant the Cloud Run runtime service account `roles/secretmanager.secretAccessor` on each `SQUARE_*` secret if updates fail.

## 4. Verify

1. Open TORP → **Settings → Integrations → Square** → **Refresh status** (admin).
2. **Clients** → edit client → **Link from email** / **Sync from Square**.
3. **Financials → Square collections**.
4. In Square, update a test invoice; confirm Firestore `clients.billing` updates and `square_webhook_events` gets a dedup doc.

## Sandbox (optional)

Use sandbox token/location/signature key and `SQUARE_ENVIRONMENT=sandbox` in `.env.square.local`, sync secrets, and create a **Sandbox** webhook subscription with the **same** `run.app` notification URL path.

## Security

- Never commit `.env.square.local` or live tokens.
- Do not use the `Square Keys` filename for secrets (git-ignored); use `.env.square.local`.
- If tokens were ever committed, rotate them in Square Developer and update Secret Manager.

See also: [cloud-run.md](cloud-run.md) (API routes and env table).
