# Firestore HQ bootstrap (console visibility)

## Canonical Firebase project (TORP production)

- **GCP / Firebase project ID:** `torp-hub` (Firebase console display name **TORPv1**).
- **Database:** Cloud Firestore **(default)** — this is the database shown in the Firebase console for `torp-hub`.
- **Web app env:** `VITE_FIREBASE_PROJECT_ID` (and related `VITE_FIREBASE_*` in `.env.local`) must match **`torp-hub`** so the UI reads/writes the same project as HQ seed scripts.

**Before any production seed or Admin SDK script targeting live Firestore:** run **`unset FIRESTORE_EMULATOR_HOST`** and confirm it is empty (`echo "$FIRESTORE_EMULATOR_HOST"`). If this variable is still set from local emulator work, the Admin SDK may send writes to the **emulator** instead of Cloud Firestore, and the cloud console will look empty.

For Application Default Credentials, pin the project explicitly:

```bash
export GCLOUD_PROJECT=torp-hub
```

## Collection vs document

- One **collection** per entity type at the top level of the default database (for example **`crew`**, **`clients`**, **`hqProjects`**).
- Each **record** is a **document** inside that collection (for example crew doc IDs `cr-4`, `cr-6`).
- Crew members do **not** each get their own collection; they share **`crew`**.

See also [**HQ data source matrix**](hq-data-source-matrix.md) for routes and getters. If HQ **Crew** lists are empty in the app, see [**Crew directory troubleshooting**](crew-directory-troubleshooting.md).

## Why run bootstrap?

Firestore only shows a collection name in the console after **at least one document** exists there. The seed script writes:

1. **Several real crew documents** into **`crew`** (Rob, William, Jayden, staff).
2. **One minimal sample document per other HQ collection** so every CRM-related list appears when you browse Data (marked with `hqBootstrapPlaceholder: true` unless using the demo graph).
3. Optionally (**`TORP_HQ_SEED_DEMO=1`**): one linked client + project + planner row so relationships are obvious.

Collection IDs match [`HQ_COLLECTION`](../data/hqFirestoreService.ts):  
`crew`, `clients`, `hqProjects`, `plannerItems`, `shoots`, `meetings`, `hqActivity`, `hqProjectAssets`, `hqInvoices`, `hqProposals`, `hqExpenses`, `hqDeliverables`, `hqRisks`, `hqBlockers`, `hqDependencies`, `hqChangeOrders`, `hqStorageOpsEvents`.

Every document includes **`tenantId`** (default **`torp-default`** via `TORP_HQ_TENANT_ID`), aligned with Auth custom claims and [`firestore.rules`](../firestore.rules).

## Commands

**Emulator (recommended)**

```bash
# Terminal 1
npx firebase emulators:start --only firestore,auth

# Terminal 2 — project ID must match your firebase.json / `.firebaserc`
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export TORP_HQ_TENANT_ID=torp-default
# Optional: linked demo client/project/planner
export TORP_HQ_SEED_DEMO=1

npm run seed:hq-firestore
```

**Production** (`torp-hub` live Firestore — use only after rules deploy and intentional tenant ID):

```bash
unset FIRESTORE_EMULATOR_HOST
export GCLOUD_PROJECT=torp-hub
export TORP_ALLOW_PROD_HQ_BOOTSTRAP=true
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json   # project_id in JSON must be torp-hub
export TORP_HQ_TENANT_ID=torp-default   # must match Auth token tenantId
# optional: export TORP_HQ_SEED_DEMO=1
npm run seed:hq-firestore
```

Or with **gcloud** ADC (same project pin):

```bash
unset FIRESTORE_EMULATOR_HOST
gcloud config set project torp-hub
export GCLOUD_PROJECT=torp-hub
export TORP_ALLOW_PROD_HQ_BOOTSTRAP=true
export TORP_HQ_TENANT_ID=torp-default
npm run seed:hq-firestore
```

Without **`FIRESTORE_EMULATOR_HOST`** and without **`TORP_ALLOW_PROD_HQ_BOOTSTRAP=true`**, the script **refuses** to run (protects against accidental prod writes).

## Removing placeholders later

In the console or a script, delete documents where **`hqBootstrapPlaceholder == true`**, or delete known bootstrap doc IDs (for example `bootstrap-clients`, `proj-bootstrap`, `_bootstrap-hqInvoices` pattern — see `scripts/seedHqFirestore.mjs` for exact IDs).

Do **not** delete real crew rows (`cr-4`, etc.) unless you intend to.

## Troubleshooting

- **`firebase emulators:exec` fails — Java not found:** The Firestore emulator needs a JRE. Install Java or run `firebase emulators:start --only firestore` in one terminal and the seed command in another with `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.
- **Script exits immediately:** You must set **`FIRESTORE_EMULATOR_HOST`** (emulator) or **`TORP_ALLOW_PROD_HQ_BOOTSTRAP=true`** (production opt-in).
- **`invalid_grant` / `invalid_rapt` when writing to Cloud Firestore:** Application Default Credentials expired or need re-auth. Run `gcloud auth application-default login` (or use a **service account JSON** with `GOOGLE_APPLICATION_CREDENTIALS` whose `project_id` is `torp-hub` and that has Firestore write access).
