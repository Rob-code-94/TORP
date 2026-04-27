# Build-time `VITE_*` secrets (Cloud Build → Docker → Cloud Run)

Vite inlines public Firebase web config at **`npm run build`**. The Docker `build` stage must receive these values. **Do not** bake them in the repo: use [Secret Manager](https://cloud.google.com/secret-manager) in project `torp-hub` (or your GCP project ID). Local builds read [.env.local](../.env.local) (git-ignored); cloud builds read Secret Manager via [`cloudbuild.yaml`](../cloudbuild.yaml).

## How it all fits together

```
git push main
   │
   ▼
GitHub trigger  rmgpgab-torp-cinematic-production-management-us-west1-Rob-corvz
   trigger ID:  200a582f-9573-4908-be5a-0afa1d8e9084
   filename:    cloudbuild.yaml
   serviceAcct: 483040408359-compute@developer.gserviceaccount.com
   │
   ▼
Cloud Build executes cloudbuild.yaml:
   1. Pull six VITE_FIREBASE_* values from Secret Manager into env
   2. docker build  --build-arg VITE_FIREBASE_*  →  ARG/ENV in Dockerfile  →  npm run build
   3. docker push to Artifact Registry (us-west1-docker.pkg.dev/torp-hub/cloud-run-source-deploy)
   4. gcloud run deploy torp-cinematic-production-management (us-west1)
   │
   ▼
Cloud Run serves the new revision; bundle now contains Firebase web config
```

The Vite build itself fails fast if any of the four required vars (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`) are missing — see the `torp-require-firebase-env-on-build` plugin in [`vite.config.ts`](../vite.config.ts).

## Secret names (required)

Create six secrets; **secret id must match exactly** (used in [`cloudbuild.yaml`](../cloudbuild.yaml)):

| Secret id | Typical value (example) |
|-----------|------------------------|
| `VITE_FIREBASE_API_KEY` | Web API key from Firebase "Project settings" |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `torp-hub.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `torp-hub` |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `torp-hub.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase app config |
| `VITE_FIREBASE_APP_ID` | From Firebase app config |

## Create or rotate a secret

The fastest way to push every value from `.env.local` into Secret Manager (creates the secret if missing, otherwise adds a new version):

```bash
./scripts/sync-vite-secrets-from-env.sh torp-hub
```

To do it by hand for a single secret:

```bash
export PROJECT=torp-hub
echo -n "YOUR_VALUE" | gcloud secrets create VITE_FIREBASE_API_KEY --data-file=- --project "$PROJECT"
# subsequent rotations:
echo -n "NEW_VALUE" | gcloud secrets versions add VITE_FIREBASE_API_KEY --data-file=- --project "$PROJECT"
```

After rotating, re-run the trigger (a fresh build is required to inline the new value):

```bash
gcloud builds triggers run rmgpgab-torp-cinematic-production-management-us-west1-Rob-corvz \
  --project=torp-hub --branch=main
```

## Grant Cloud Build access

The trigger runs as `483040408359-compute@developer.gserviceaccount.com` (the project's compute-default service account). It needs `roles/secretmanager.secretAccessor` on each secret. Idempotent grant:

```bash
SA="483040408359-compute@developer.gserviceaccount.com"
for s in VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID \
         VITE_FIREBASE_STORAGE_BUCKET VITE_FIREBASE_MESSAGING_SENDER_ID VITE_FIREBASE_APP_ID; do
  gcloud secrets add-iam-policy-binding "$s" \
    --project=torp-hub \
    --member="serviceAccount:$SA" \
    --role="roles/secretmanager.secretAccessor" --quiet
done
```

If builds fail with `secretmanager.versions.access` **denied**, open **Cloud Build → your build → Details** and confirm `serviceAccount`. Older projects sometimes show `PROJECT_NUMBER@cloudbuild.gserviceaccount.com` instead of the compute SA — grant the role to whichever account the build actually used.

## Trigger configuration (must remain set)

The trigger must keep `filename: cloudbuild.yaml`. If it ever shows an inline `build:` block again, every push will silently produce a Cloud Run revision whose Vite bundle has empty `import.meta.env.VITE_FIREBASE_*` and the HQ Integrations page will display "Coming Soon" again.

Inspect:

```bash
gcloud builds triggers describe rmgpgab-torp-cinematic-production-management-us-west1-Rob-corvz \
  --project=torp-hub --format='value(filename,build)'
# expected:  cloudbuild.yaml<TAB><empty>
```

Re-apply the file-driven config from a freshly exported YAML if needed:

```bash
gcloud builds triggers describe rmgpgab-torp-cinematic-production-management-us-west1-Rob-corvz \
  --project=torp-hub --format=yaml > /tmp/trigger.yaml
# remove the `build:` block, remove `createTime` / `id`, add `filename: cloudbuild.yaml`
gcloud builds triggers import --source=/tmp/trigger.yaml --project=torp-hub
```

## Local Docker build (optional)

Pass build args (values from your local `.env.local`):

```bash
docker build \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=... \
  --build-arg VITE_FIREBASE_PROJECT_ID=... \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=... \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg VITE_FIREBASE_APP_ID=... \
  -t torp:local .
```

## Troubleshooting: HQ Integrations page shows "Coming Soon"

If the Integrations cards display the "Coming Soon" badge on the deployed site, the Vite bundle is missing Firebase config. Walk through these checks in order:

1. **Confirm the served bundle is missing the values** (cheap, deterministic):

   ```bash
   URL="$(gcloud run services describe torp-cinematic-production-management \
     --project=torp-hub --region=us-west1 --format='value(status.url)')"
   INDEX=$(curl -s "$URL" | grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' | head -1)
   curl -s "$URL$INDEX" | grep -c 'AIzaSy'                # expect: >= 1
   curl -s "$URL$INDEX" | grep -c 'firebaseapp.com'       # expect: >= 1
   ```

   If those counts are `0`, the bundle was built without secrets — continue.

2. **Inspect the most recent build's `availableSecrets`**:

   ```bash
   gcloud builds list --project=torp-hub --limit=1 \
     --format='value(id,status,availableSecrets.secretManager[].env)'
   ```

   `availableSecrets` must list all six `VITE_FIREBASE_*` env names. If empty, the trigger lost its `filename: cloudbuild.yaml` setting (see the trigger configuration section above).

3. **Verify trigger SA has access** to each secret (re-run the IAM loop above).

4. **Force a rebuild**:

   ```bash
   gcloud builds triggers run rmgpgab-torp-cinematic-production-management-us-west1-Rob-corvz \
     --project=torp-hub --branch=main
   ```

5. **Repeat step 1**. The new bundle hash should change and the grep counts should now be `>= 1`. Hard-reload the live `/hq/settings/integrations` page (or use an incognito window) to pick up the fresh asset.

## References

- [`cloudbuild.yaml`](../cloudbuild.yaml) — `availableSecrets` + `docker build --build-arg` wiring
- [`Dockerfile`](../Dockerfile) — `ARG` / `ENV` for Vite
- [`vite.config.ts`](../vite.config.ts) — `torp-require-firebase-env-on-build` plugin (fail-fast guard)
- [`scripts/sync-vite-secrets-from-env.sh`](../scripts/sync-vite-secrets-from-env.sh) — push `.env.local` into Secret Manager
- [`lib/firebase.ts`](../lib/firebase.ts) — `isFirebaseConfigured()` (this is what flips Integrations from real → "Coming Soon" when config is missing)
