# Firebase Authentication — when you are ready (deferred)

Use this when you enable sign-in (plan checklist **C**).

1. **Firebase console** → your project → **Build** → **Authentication** → **Get started**.
2. **Sign-in method** → enable **Email/Password** (or the providers you need).
3. **Settings** → **Authorized domains** — add the **host only** (no `https://`, no path) for every place the app is opened in the browser:
   - `localhost` (Vite is usually `http://localhost:5173` — the host is `localhost`, often pre-added)
   - **Cloud Run:** add the hostname from the service URL, e.g. `torp-....us-west1.run.app` (each region/service URL may differ)
   - **Custom domain** (e.g. `app.torp.life` or `www.…`) after you map DNS to Cloud Run or hosting
   - **Preview** hosts (Vercel/Netlify) if you use them for the same Firebase web app
4. If sign-in fails with a message about **unauthorized domain**, the current tab’s host is not in this list. Add it, save, and retry.
5. The **origin** the user types (scheme + host + port in dev) must be allowed, or sign-in and redirects will fail.
6. (Optional) **Custom claims** for `tenantId` and `role` — set from a trusted server path (e.g. Admin SDK, callable function) after the user and tenant exist.
7. **Create HQ users in bulk (local script):** after Email/Password is on, from the repo run `npm run seed:firebase-users` with a service account or `gcloud auth application-default login` (see header comment in [`../scripts/seedFirebaseAuthUsers.mjs`](../scripts/seedFirebaseAuthUsers.mjs)). This creates/updates `info@`, `william@`, `jp@`, and `staff@` with passwords that match `lib/demoHqUsers.ts` and sets `role` (and `crewId` for staff) claims. Then run `scripts/seedAuthClaims.mjs` only if you need to refresh claims for **additional** emails without touching passwords.

**Cross-links**

- Web client config: [`../lib/firebase.ts`](../lib/firebase.ts)
- Token verification on the server: [`../server/index.mjs`](../server/index.mjs) (`/api/v1/whoami`)
