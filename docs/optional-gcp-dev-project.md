# Optional: second GCP project for dev vs prod (plan: `create-env-projects`)

You are on **one** project `torp-hub` today. Add a second project (e.g. `torp-hub-dev`) when you need stricter separation:

- Mistakes in rules or test data do not hit production Firestore/Storage/Auth.
- You can use cheaper/safer defaults in dev and production-grade tightening only in `torp-hub`.

**Copy/paste (outline)**

1. **GCP** → new project `torp-hub-dev` (or similar), billing as needed.
2. **Firebase** → “Add project” or link existing — enable Firestore, Storage, add web app, copy a **separate** `firebaseConfig` for dev `.env.local` / dev secrets.
3. **CI:** separate Cloud Build trigger or separate substitution set; dev secrets in dev project’s Secret Manager.
4. **Auth:** add dev `localhost` and dev preview hosts to the **dev** project’s authorized domains (not the prod list).

**Do not** create one Firebase project per end customer for MVP; use multi-tenancy in one prod project (see [tenant-model.md](tenant-model.md)).
