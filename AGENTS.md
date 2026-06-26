# AGENTS.md

## Cursor Cloud specific instructions

TORP is a Vite + React + TypeScript single-page app (root of repo). Supporting pieces:

- `functions/` — Firebase Cloud Functions (separate `package.json`; its own `npm install`, build with `npm run build` = `tsc`).
- `server/index.mjs` — Express shell used only for the production container (`npm start`) and the Square `/api/*` billing routes. Not used by `npm run dev`.
- Firebase (Auth + Firestore + Functions + Storage) is the backend. Locally this is provided by the Firebase emulators.

### Lint / test / build (standard commands live in `package.json` + `README.md`)

- Tests: `npm test` (Vitest). This is the only thing CI (`.github/workflows/ci.yml`) runs.
- Launch gate: `npm run test:launch-gates` (forbids demo/mock auth helpers in runtime code).
- There is **no `lint` or typecheck npm script**. The production build uses esbuild (no type-checking). Running `tsc --noEmit` at the repo root surfaces pre-existing type errors in some test files and in `functions/` — it is *not* a project gate, so do not treat those as regressions.
- Production build: `npm run build`. `vite.config.ts` **fails the build** unless `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` are set (use `.env.local`).

### Running the app locally (dev mode)

- `npm run dev` serves the SPA on port **8080**.
- The public marketing site (`/`) works with no backend. **HQ (`/hq/*`) and client portal (`/portal/*`) sign-in always requires real Firebase Auth** — the demo `loginAs` path is blocked in runtime code by the launch gate, so you cannot log in without Firebase. Use the emulators below for any HQ/portal work.

### Local backend = Firebase emulators (non-obvious gotchas)

- Emulator ports are **hardcoded** in `lib/firebase.ts`: auth `9099`, firestore `8080`, functions `5001`, storage `9199`. `firebase.json` has a matching `emulators` block.
- **Port collision:** the Firestore emulator uses `8080`, which is also Vite's default dev port. When running emulators, start Vite on a different port: `npm run dev -- --port 5173`. The browser still talks to the emulators on their fixed ports.
- Create `.env.local` (gitignored) with the `VITE_FIREBASE_*` values (any non-empty placeholders are fine for emulators) plus `VITE_FIREBASE_USE_EMULATOR=true`. Keep `VITE_FIREBASE_PROJECT_ID=torp-hub` so it matches the seed scripts.
- Start emulators: `npx -y firebase-tools@latest emulators:start --only auth,firestore,functions --project torp-hub`. Java is required (present on the VM). The "not authenticated" CLI warning is harmless for emulator-only use.
- Seed data (tenant is `torp-default`, project is `torp-hub`):
  - Auth users: `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 GOOGLE_CLOUD_PROJECT=torp-hub node scripts/seedFirebaseAuthUsers.mjs`
  - Firestore HQ data: `GOOGLE_CLOUD_PROJECT=torp-hub TORP_HQ_TENANT_ID=torp-default FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 TORP_HQ_SEED_DEMO=1 npm run seed:hq-firestore`
- Seeded HQ logins (see `lib/demoHqUsers.ts` / `scripts/seedFirebaseAuthUsers.mjs`): `info@torp.life` / `Admin1234` (admin), `staff@torp.life` / `Staff1234` (staff).
- To inspect Firestore directly past security rules, the emulator accepts an owner bypass token, e.g. `curl -H "Authorization: Bearer owner" "http://127.0.0.1:8080/v1/projects/torp-hub/databases/(default)/documents/hqProjects"`.
