# Custom domain, TLS, and production hardening

## Custom domain (Cloud Run + branded URL)

1. **Map DNS** (at your DNS host): create the records Google Cloud gives you (often **A/AAAA** for domain mapping, or **CNAME** to `ghs.googlehosted.com` for certain setups — follow the **Cloud Run** “Manage custom domain” wizard).
2. **Cloud Run** → your service → **Manage custom domains** → add domain → verify ownership if prompted.
3. **Wait for certificate provisioning** (managed TLS).
4. **Firebase Auth** → **Authorized domains** — add the **exact** host users will type (e.g. `app.yourco.com`).

**SPA routing:** this repo serves `index.html` for non-API paths (see `server/index.mjs`).

## CORS and APIs

- Same-origin: browser `fetch` to `/api/...` on the same host needs no CORS.
- If you add a **separate API** hostname, configure `cors` on Express and add that origin in Firebase/Auth as needed.

## Hardening checklist

- [ ] Firestore/Storage rules deployed: `npx -y firebase-tools@latest deploy --only firestore:rules,storage` (from repo root, project selected)
- [ ] **Logs / errors:** Cloud Run logging; alert on 5xx spikes
- [ ] **Backups:** Firestore PITR / export policy per org policy; Storage lifecycle for temp uploads
- [ ] **Key rotation:** plan for Vite build secrets in Secret Manager and authorized domains
- [ ] (Optional) [App Check](app-check-optional.md)

## Cloud Build service health

- Trigger runs on the correct branch; build logs show a successful `docker build` and deploy revision.
