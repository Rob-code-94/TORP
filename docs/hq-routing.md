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
| `/hq/admin/financials` | Invoices & proposals (mock) |
| `/hq/admin/crew` | Crew directory (mock) |
| `/hq/admin/clients` | Client profiles (mock) |
| `/hq/admin/settings` | Admin & org settings (placeholders) |
| `/hq/staff` | Crew dashboard (mock) |
| `/portal/login` | Client demo sign-in |
| `/portal` | Client portal (mock) |

## Code layout

- **`components/landing/`** — marketing only; no auth, no CRM reads.
- **`components/hq/`** — internal HQ entry, [`admin/AdminLayout`](components/hq/admin/AdminLayout.tsx) (nested admin routes), and staff login.
- **`data/adminMock.ts`** — mock CRM data for admin (swap for Firebase later).
- **`components/portal/`** — client portal entry and shell for `/portal`.
- **`components/dashboard/`** — shared dashboard views (admin / staff / client content).
- **`lib/auth.tsx`** — session (demo today; Firebase in a later phase).
