# Tenant model (torp-hub)

## Principles

- **One** Firebase/GCP project; customers are **not** split by project.
- Isolation is **data + token claims**: every protected record and API call is scoped to a `tenantId`.
- **Source of truth**
  - **Identity:** Firebase Auth (`uid`, `email`).
  - **Scoping:** custom claims `tenantId` (and optional `role`) — set via Admin SDK or a secure bootstrap (see `scripts/seedAuthClaims.mjs` as a pattern).
- **Data layout (recommended)**
  - Top-level: `tenants/{tenantId}/...` for tenant-owned Firestore data.
  - Or a `tenantId` field on every document; rules in `firestore.rules` must match the chosen pattern.

## Roles (initial)

- `ADMIN` — platform / HQ operations (align with existing `functions` callable checks).
- Extend with `STAFF`, `CLIENT`, etc. as product needs; keep a single `role` string or map to a small set in code.

## API contract

- **Browser → Cloud Run:** `Authorization: Bearer <Firebase ID token>`.
- **Server** (`/api/v1/whoami`): decodes `tenantId` / `role` for debugging; future routes must **reject** if `tenantId` is missing for tenant-scoped operations.

## Next decisions (when you add real modules)

- Path convention vs `tenantId` on each document.
- How new organizations are onboarded and how the first `ADMIN` is created.
- Whether `tenantId` in claims is always set before any Firestore user access (recommended once Auth is on).

See also: [`../lib/tenant.ts`](../lib/tenant.ts).
