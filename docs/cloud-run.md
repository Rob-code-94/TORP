# Cloud Run (GitHub → Cloud Build) — container with Vite + API shell

The **Dockerfile** does two things:

1. **Build** — `npm run build` with `VITE_FIREBASE_*` (must be build args, usually from [Secret Manager](build-secrets.md)).
2. **Run** — `node server/index.mjs` serves `dist/`, `GET /api/health`, and token routes under `/api/v1/`.

| Endpoint | Purpose |
|----------|--------|
| `GET /api/health` | Load balancer / quick smoke (no auth) |
| `GET /api/v1/whoami` | Decode `Authorization: Bearer` Firebase ID token (requires Admin SDK; uses ADC on Cloud Run) |
| `GET /api/v1/tenant-only/ping` | Example **403** if `tenantId` claim is missing (tenant guard) |
| `GET /api/square/health` | Square connection health (ADMIN Bearer token) |
| `POST /api/square/link-by-email` | Link CRM client to Square customer by email |
| `POST /api/square/ensure-customer` | Link by email, or create in Square directory if missing (auto on new client) |
| `POST /api/square/sync-client` | Refresh one client’s `billing` from Square |
| `POST /api/square/sync-location` | Sync all linked clients from recent location invoices |
| `GET /api/square/activity` | Invoice + payment history for a linked client |
| `POST /api/webhooks/square` | Square invoice webhooks (HMAC, no auth) |

**Cloud Run runtime:** the default service account must verify Firebase ID tokens via Admin SDK. If Square or `whoami` returns `invalid_token` while signed in, check Cloud Run logs for `insufficient permission` and run once:

```bash
chmod +x scripts/grant-cloud-run-firebase-auth.sh
./scripts/grant-cloud-run-firebase-auth.sh
```

This grants `roles/firebaseauth.admin` to `483040408359-compute@developer.gserviceaccount.com`. Redeploy or wait for the next revision if needed.

## Square billing (runtime env — separate TORP merchant)

Set these on the Cloud Run service (Secret Manager or console env vars). **Do not** reuse IW Capital credentials.

| Variable | Purpose |
|----------|---------|
| `SQUARE_ACCESS_TOKEN` | Square API access token |
| `SQUARE_LOCATION_ID` | Location used for invoice/payment search |
| `SQUARE_ENVIRONMENT` | `sandbox` or omit for production |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Webhook signature key from Square Developer |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | Exact public URL registered in Square (e.g. `https://<service-url>/api/webhooks/square`) |

Register the webhook in [Square Developer](https://developer.squareup.com/) for invoice events. The notification URL must match `SQUARE_WEBHOOK_NOTIFICATION_URL` character-for-character (including `https` and no trailing slash mismatch).

Square sync writes `squareCustomerId`, nested `billing`, and `billingSquareSyncedAt` on `clients` documents. Manual project invoicing remains in `hqInvoices`.

### Canonical Square webhook URL (always use Cloud Run `run.app`)

Use the **current Cloud Run service URL** for Square, not a custom domain, even if both hostnames serve the same app:

```text
https://torp-cinematic-production-management-483040408359.us-west1.run.app/api/webhooks/square
```

Print the latest value (falls back to the URL above if `gcloud` is offline):

```bash
./scripts/print-square-webhook-url.sh
```

Full setup (Secret Manager, Square Developer checklist, custom-domain policy): [square-setup.md](square-setup.md).

## One-time GCP setup (per project)

Run these once in `torp-hub` (project id), from a machine where you’re authenticated as a project owner/editor:

```bash
gcloud config set project torp-hub

# APIs commonly required for Artifact Registry + Cloud Run + Cloud Build
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com --project torp-hub

# If needed: Artifact Registry repo `cloud-run-source-deploy` (often created by Cloud Run / first deploy).
# Only create if it does not already exist:
# gcloud artifacts repositories describe cloud-run-source-deploy --location=us-west1 --project=torp-hub
```

## Cloud Build trigger (GitHub) — you set this in the console

1. **Cloud Build → Triggers →** your GitHub trigger (or create one).
2. **Event:** Push to branch **`main`** (this repo’s default branch).
3. **Configuration:** **Cloud Build configuration file (yaml or json)** → path `cloudbuild.yaml` (repository root).
4. **Service account:** default Cloud Build SA is fine if it has permission to push to Artifact Registry and deploy Cloud Run (see Troubleshooting).

After a push, **Cloud Build → History** should show a new build within ~1–2 minutes; **Cloud Run → Revisions** should show a new revision when the build finishes.

Important:

- **Do not** configure Cloud Run to mount a GCS bucket for static assets for this app.
- In the Cloud Run service, remove any **GCSFuse / bucket-mounted volumes** and any **proxy-only** container images that existed only to serve a mounted build folder.
- Remove any unused environment variables (especially any **API keys**) from the Cloud Run service.

## What the build does

`cloudbuild.yaml`:

1. `docker build` with **Secret Manager** → `--build-arg` for all required `VITE_*` (see [build-secrets.md](build-secrets.md))
2. pushes to: `us-west1-docker.pkg.dev/torp-hub/cloud-run-source-deploy/torp/torp-cinematic-production-management:$BUILD_ID`
3. deploys Cloud Run service `torp-cinematic-production-management` on port **8080** (serves app + API)

If the build fails on “permission denied” for secrets, grant the **Cloud Build** service account `roles/secretmanager.secretAccessor` on the six secrets.

## Manual deploy (optional)

If you want to deploy a local commit without waiting for triggers:

```bash
gcloud builds submit --project torp-hub --config cloudbuild.yaml .
```

## Troubleshooting

- If deploy fails with permission errors pushing images, grant Cloud Build’s service account **Artifact Registry Writer** on the repo’s project.
- If Cloud Run fails health checks, verify the service container port is **8080** and the image listens on `**$PORT`**.

