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
# `.env.example` sets `VITE_FIREBASE_PROJECT_ID=torp-hub` by default. Fill the other `VITE_FIREBASE_*`
# values from Firebase → Project settings → your web app (same project as torp-hub).
npm run dev
```

## Deploy (GitHub → Cloud Build → Cloud Run)

The default Git branch is **`main`**. Configure the Cloud Build GitHub trigger to run on **push to `main`** so `git push origin main` rolls out a new Cloud Run revision after the build succeeds.

This repo includes:

- `Dockerfile`: Vite `npm run build` (needs `VITE_*` at **build** time) and **Express** in `server/index.mjs` to serve `dist/` plus `/api/health` and token smoke routes
- `cloudbuild.yaml`: Docker build with Secret Manager, push to Artifact Registry, deploy Cloud Run
- `firestore.rules` / `storage.rules` + `firebase.json` — deploy rules with Firebase CLI when ready

See: `docs/cloud-run.md`, `docs/build-secrets.md`, `docs/domain-hardening.md`

## Firebase emulators + HQ seed (optional local backend)

For HQ admin data against **Firestore / Auth emulators** instead of production:

1. Start emulators (project root): `npx firebase emulators:start --only auth,firestore` (add `--project torp-hub` if needed).
2. Point the app at emulators: set `VITE_FIREBASE_USE_EMULATOR=true` in `.env.local` (see `.env.example`).
3. Seed minimal crew docs for the tenant (requires emulator or credentials):

```bash
TORP_HQ_TENANT_ID=torp-default FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed:hq-firestore
# Optional: one linked demo client + project + planner row
TORP_HQ_TENANT_ID=torp-default FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 TORP_HQ_SEED_DEMO=1 npm run seed:hq-firestore
```

The seed writes **crew** plus **one sample document per HQ collection** so every list appears in the Firestore console (see [`docs/firestore-hq-bootstrap.md`](docs/firestore-hq-bootstrap.md)). Production writes require **`TORP_ALLOW_PROD_HQ_BOOTSTRAP=true`**.

**Canonical production Firebase project:** `torp-hub` — keep `VITE_FIREBASE_PROJECT_ID` and HQ seed commands aligned with this ID; always **`unset FIRESTORE_EMULATOR_HOST`** before seeding live Firestore (details in [`docs/firestore-hq-bootstrap.md`](docs/firestore-hq-bootstrap.md)).

Align Auth custom claims with [`scripts/seedAuthClaims.mjs`](scripts/seedAuthClaims.mjs) / [`scripts/seedFirebaseAuthUsers.mjs`](scripts/seedFirebaseAuthUsers.mjs). HQ routes read through [`docs/hq-data-source-matrix.md`](docs/hq-data-source-matrix.md). If the **Crew** directory stays empty, use [`docs/crew-directory-troubleshooting.md`](docs/crew-directory-troubleshooting.md).

## GCP project pinning (local dev convenience)

```bash
./scripts/gcp-use-torp-hub.sh
```
