<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# TORP

TORP is a Vite + React + TypeScript app (Tailwind via CDN in `index.html`).

## Run locally

Prerequisites: Node.js 20+

```bash
npm install
cp .env.example .env.local
# Fill `VITE_*` from Firebase → Project settings (Project ID must match the console, e.g. torp-hub).
npm run dev
```

## Deploy (GitHub → Cloud Build → Cloud Run)

This repo includes:

- `Dockerfile`: Vite `npm run build` (needs `VITE_*` at **build** time) and **Express** in `server/index.mjs` to serve `dist/` plus `/api/health` and token smoke routes
- `cloudbuild.yaml`: Docker build with Secret Manager, push to Artifact Registry, deploy Cloud Run
- `firestore.rules` / `storage.rules` + `firebase.json` — deploy rules with Firebase CLI when ready

See: `docs/cloud-run.md`, `docs/build-secrets.md`, `docs/domain-hardening.md`

## GCP project pinning (local dev convenience)

```bash
./scripts/gcp-use-torp-hub.sh
```
