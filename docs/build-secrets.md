# Build-time `VITE_*` secrets (Cloud Build → Docker)

Vite inlines public Firebase web config at **`npm run build`**. The Docker `build` stage must receive these values. **Do not** bake them in the repo: use [Secret Manager](https://cloud.google.com/secret-manager) in project `torp-hub` (or your GCP project ID).

## Secret names (required)

Create six secrets; **secret id must match exactly** (used in `cloudbuild.yaml`):

| Secret id | Typical value (example) |
|-----------|------------------------|
| `VITE_FIREBASE_API_KEY` | Web API key from Firebase “Project settings” |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `torp-hub.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `torp-hub` |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `torp-hub.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase app config |
| `VITE_FIREBASE_APP_ID` | From Firebase app config |

## Create a secret (repeat per name)

```bash
export PROJECT=torp-hub
# Replace NAME and the value; never paste keys into public chat logs
echo -n "YOUR_VALUE" | gcloud secrets create VITE_FIREBASE_API_KEY --data-file=- --project "$PROJECT"
```

To add a new version: `gcloud secrets versions add VITE_FIREBASE_API_KEY --data-file=... --project=torp-hub`

## Grant Cloud Build access

The Cloud Build service account must **access** each secret (usually: `project-number@cloudbuild.gserviceaccount.com`):

- Role: `roles/secretmanager.secretAccessor` on the project or on each secret.

In console: **Secret Manager** → each secret → **Permissions** → grant the Cloud Build service account `Secret Manager Secret Accessor`.

## Local Docker build (optional)

Pass build args (values from your local `.env.local` for dev only):

```bash
docker build \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=... \
  # ...all six...
  -t torp:local .
```

## References

- [`cloudbuild.yaml`](../cloudbuild.yaml) — wiring for `availableSecrets` + `docker build --build-arg`
- [`../Dockerfile`](../Dockerfile) — `ARG` / `ENV` for Vite
