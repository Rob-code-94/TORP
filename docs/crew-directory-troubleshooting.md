# Crew directory empty — troubleshooting

HQ Crew reads Firestore collection **`crew`** (scoped by **`tenantId`**) via [`HqFirestoreProvider`](../components/hq/HqFirestoreProvider.tsx) → [`subscribeHqOrgData`](../data/hqFirestoreService.ts). If the table shows **“No people match your filters”** with Craft **All** and Status **All**, the in-memory directory is empty—usually environment or Auth claims, not the row filters.

## Manual ops checklist (Firebase Console vs app “mirror”)

The UI is **not** a raw mirror of everything under Firestore in the console. HQ loads each collection with `where('tenantId', '==', <your ID token’s tenantId>)` in the **same GCP project** as **`VITE_FIREBASE_PROJECT_ID`**. Work through these steps in order when you see empty lists or **`permission-denied`**:

1. **Confirm the Firebase project** — Build-time env ([`lib/firebase.ts`](../lib/firebase.ts)) must match the project where you open Firestore in the console (same **`VITE_FIREBASE_PROJECT_ID`**).
2. **Confirm Auth custom claims** — Firebase Console → Authentication → your user → **Custom claims** must include a string **`tenantId`** (e.g. `torp-default`) and a valid **`role`**. Use [`scripts/seedFirebaseAuthUsers.mjs`](../scripts/seedFirebaseAuthUsers.mjs) with `TORP_HQ_TENANT_ID` aligned to Firestore data, **or** ensure the **`ensureTenantClaim`** callable succeeds for non-seeded accounts ([`lib/auth.tsx`](../lib/auth.tsx)).
3. **Align Firestore documents** — Every HQ doc (`crew`, **`shoots`**, `clients`, etc.) needs a **`tenantId` field** equal to that claim (see [`scripts/seedHqFirestore.mjs`](../scripts/seedHqFirestore.mjs)). If Auth was seeded with one tenant and data with another, reads fail across **all** collections that mismatch—not only one collection.
4. **Deploy rules** — Run `npm run deploy:rules` (or CI) so deployed [`firestore.rules`](../firestore.rules) match the repo.
5. **Refresh the ID token** — Sign out and sign in after changing claims or rules (or clear site data if the banner persists).
6. **Rose HQ banner** — If [`HqFirestoreListenerBanner`](../components/hq/HqFirestoreListenerBanner.tsx) appears, it aggregates **every** listener that failed; the remediation text uses one sample error because **`permission-denied`** usually shares one root cause (project / token / rules / doc `tenantId`). A single collection name in older messaging was only **which listener fired first**—not proof that only that collection is misconfigured.

Related: [crew-mirror.md](crew-mirror.md), [hq-data-source-matrix.md](hq-data-source-matrix.md).

## 1. Confirm you are running a build that includes tenant scope wiring

The client must resolve tenant from JWT claims for Firebase sessions ([`resolveHqTenantScopeForFirestore`](../data/hqTenant.ts) in [`HqFirestoreProvider`](../components/hq/HqFirestoreProvider.tsx)).

- **Local:** From repo root, `grep -r resolveHqTenantScopeForFirestore components/hq data/hqTenant.ts` should show hits.
- **Hosted:** Redeploy after merging changes so Cloud Run / Hosting serves a new bundle. An older revision will not include this behavior.

## 2. Amber banner under the admin header

If [`HqTenantClaimBanner`](../components/hq/HqTenantClaimBanner.tsx) appears on `/hq/admin/*`, the session has **no `tenantId` on the user object** (missing JWT claim). Firestore rules require [`hasTenant()`](../firestore.rules)—crew reads are denied until fixed.

**Remediation:**

1. **Sign out** and **sign back in** (refreshes the ID token).
2. Seed Auth users + claims (same tenant as Firestore docs):

   ```bash
   export TORP_HQ_TENANT_ID=torp-default
   export GCLOUD_PROJECT=torp-hub   # if using ADC
   npm run seed:firebase-users
   ```

3. If the claim still never appears: deploy or verify the **`ensureTenantClaim`** callable ([`functions/src/auth/tenantClaim.ts`](../functions/src/auth/tenantClaim.ts)) in the **same region** as the web app (`us-central1` by default in [`lib/firebase.ts`](../lib/firebase.ts)). Check the browser console for `[torp.auth] ensureTenantClaim failed`.

## 3. Align web env with seeded Firebase project

[`lib/firebase.ts`](../lib/firebase.ts) reads **`VITE_FIREBASE_PROJECT_ID`** at build time. It **must** match the project where [`seedHqFirestore.mjs`](../scripts/seedHqFirestore.mjs) wrote **`crew`** (production: **`torp-hub`**).

**Symptom:** Login works, but Firebase console for **that** project shows **no** `crew` docs (docs exist only in another project).

**Fix:** Copy web config from Firebase → Project settings → Your apps into `.env.local` (local) or Secret Manager / Cloud Build (deploy). See [`docs/build-secrets.md`](build-secrets.md).

## 4. Browser DevTools

| Observation | Likely cause |
|-------------|----------------|
| Console: `permission-denied` / `Missing or insufficient permissions` on Firestore | Deployed [`firestore.rules`](../firestore.rules), wrong **tenantId** on token vs docs, or wrong project |
| No errors, still empty | Wrong **project** in `VITE_FIREBASE_PROJECT_ID`, or **no documents** in `crew` for that project |
| Works after sign-out/sign-in only | Stale token before **`tenantId`** claim was added |

Filter DevTools Network tab by **Firestore** or search console for **`FirebaseError`**.

## 5. Firebase console sanity check

In the project matching **`VITE_FIREBASE_PROJECT_ID`**:

- Open **Firestore → Data → `crew`**.
- Expect documents such as **`cr-4`**, **`cr-5`**, **`cr-6`** (from seed).
- Each document should include **`tenantId`** (default **`torp-default`** unless you overrode `TORP_HQ_TENANT_ID`).

## 6. Emulator vs production seed confusion

If **`FIRESTORE_EMULATOR_HOST`** was set when running seed scripts, data may have been written to the **emulator**, not Cloud—production console stays empty.

Before seeding **live** Firestore:

```bash
unset FIRESTORE_EMULATOR_HOST
echo "$FIRESTORE_EMULATOR_HOST"   # should be empty
```

See [Firestore HQ bootstrap](firestore-hq-bootstrap.md).

## 7. “Phantom” crew row in Admin vs Firestore console

If **Save** showed a new crew member in the HQ Admin list but **no matching document** appeared under Firestore → **`crew`** for the same project, the client may have updated **in-memory state** without completing a Cloud write—often because **`tenantId`** was missing from the ID token while Firebase was configured. The app now **fails the save with an error** instead of leaving a misleading row. If counts still disagree after a successful save, re-check **tenant scope**, **`VITE_FIREBASE_PROJECT_ID`**, and **rules** as in the sections above.

## When to change application code

If **custom claims include `tenantId`**, **`VITE_FIREBASE_PROJECT_ID`** matches **`torp-hub`**, **rules are deployed**, and **`crew`** documents exist—but listeners still fail—capture the exact **Firestore error** and compare deployed rules to the repo. Otherwise resolve Auth, env, and seeding first.
