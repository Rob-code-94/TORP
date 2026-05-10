# Landing vs HQ vs client portal

## URLs

| Path | Surface |
|------|---------|
| `/` | Public marketing (`components/landing/`) |
| `/hq` | Redirects to `/hq/login` or `/hq/admin` / `/hq/staff` |
| `/hq/login` | Staff / admin demo sign-in |
| `/hq/admin` | Admin command center (index) |
| `/hq/admin/projects` | Project list |
| `/hq/admin/projects/:projectId` | Project profile (tabs) |
| `/hq/admin/planner` | Cross-project planner (list / board / calendar) |
| `/hq/admin/financials` | Invoices & proposals (Firestore-backed via finance repo) |
| `/hq/admin/crew` | Crew directory (Firestore + sync mirror) |
| `/hq/admin/clients` | Client profiles (Firestore + sync mirror) |
| `/hq/admin/settings` | Admin & org settings (placeholders) |
| `/hq/staff` | Crew dashboard (Firestore + sync mirror) |
| `/portal/login` | Client demo sign-in |
| `/portal` | Client portal (demo / scoped views) |

## Code layout

- **`components/landing/`** — marketing only; no auth, no CRM reads.
- **`components/hq/`** — internal HQ entry, [`admin/AdminLayout`](components/hq/admin/AdminLayout.tsx) (nested admin routes), and staff login.
- **HQ data layer** — [`docs/hq-data-source-matrix.md`](hq-data-source-matrix.md): [`HqFirestoreProvider`](../components/hq/HqFirestoreProvider.tsx), [`data/hqFirestoreService.ts`](../data/hqFirestoreService.ts), [`data/hqSyncDirectory.ts`](../data/hqSyncDirectory.ts); mutations via `hq*Ops` / `hq*Crud` modules and [`data/adminProjectsApi.ts`](../data/adminProjectsApi.ts).
- **`components/portal/`** — client portal entry and shell for `/portal`.
- **`components/dashboard/`** — shared dashboard views (admin / staff / client content).
- **`lib/auth.tsx`** — session (demo today; Firebase in a later phase).
