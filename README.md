<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TORP

TORP is a Vite + React + TypeScript app (Tailwind via CDN in `index.html`).

## Run locally

Prerequisites: Node.js 20+

```bash
npm install
npm run dev
```

## Deploy (GitHub → Cloud Build → Cloud Run)

This repo includes:

- `Dockerfile`: builds `dist/` and serves it on `0.0.0.0:$PORT` (Cloud Run compatible)
- `cloudbuild.yaml`: builds/pushes an image to Artifact Registry and deploys Cloud Run

See: `docs/cloud-run.md`

## GCP project pinning (local dev convenience)

```bash
./scripts/gcp-use-torp-hub.sh
```
