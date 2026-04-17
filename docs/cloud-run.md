# Cloud Run (GitHub → Cloud Build) — “normal container” setup

This repo is intended to run as a **static Vite site** served from `dist/` inside a normal container (see `Dockerfile`).

## One-time GCP setup (per project)

Run these once in `torp-hub` (project id), from a machine where you’re authenticated as a project owner/editor:

```bash
gcloud config set project torp-hub

# APIs commonly required for Artifact Registry + Cloud Run + Cloud Build
gcloud services enable artifactregistry.googleapis.com run.googleapis.com cloudbuild.googleapis.com --project torp-hub

# Create an Artifact Registry Docker repo (name must match cloudbuild.yaml default `_AR_REPO`)
gcloud artifacts repositories create torp \
  --repository-format=docker \
  --location=us-west1 \
  --description="TORP container images" \
  --project torp-hub
```

## Cloud Build trigger (GitHub)

Create a trigger on `main` that runs **`cloudbuild.yaml`**.

Important:

- **Do not** configure Cloud Run to mount a GCS bucket for static assets for this app.
- In the Cloud Run service, remove any **GCSFuse / bucket-mounted volumes** and any **proxy-only** container images that existed only to serve a mounted build folder.
- Remove any unused environment variables (especially any **API keys**) from the Cloud Run service.

## What the build does

`cloudbuild.yaml`:

1. `docker build` using the repo root `Dockerfile`
2. pushes to: `us-west1-docker.pkg.dev/torp-hub/torp/torp-web:$SHORT_SHA`
3. deploys Cloud Run service `torp-cinematic-production-management` on port **8080**

## Manual deploy (optional)

If you want to deploy a local commit without waiting for triggers:

```bash
gcloud builds submit --project torp-hub --config cloudbuild.yaml .
```

## Troubleshooting

- If deploy fails with permission errors pushing images, grant Cloud Build’s service account **Artifact Registry Writer** on the repo’s project.
- If Cloud Run fails health checks, verify the service container port is **8080** and the image listens on **`$PORT`**.
