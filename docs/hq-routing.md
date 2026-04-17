# Landing vs HQ vs client portal

## URLs

| Path | Surface |
|------|---------|
| `/` | Public marketing (`components/landing/`) |
| `/hq` | Redirects to `/hq/login` or `/hq/admin` / `/hq/staff` |
| `/hq/login` | Staff / admin demo sign-in |
| `/hq/admin` | Admin dashboard (mock) |
| `/hq/staff` | Crew dashboard (mock) |
| `/portal/login` | Client demo sign-in |
| `/portal` | Client portal (mock) |

## Code layout

- **`components/landing/`** — marketing only; no auth, no CRM reads.
- **`components/hq/`** — internal HQ entry and shells for `/hq/*`.
- **`components/portal/`** — client portal entry and shell for `/portal`.
- **`components/dashboard/`** — shared dashboard views (admin / staff / client content).
- **`lib/auth.tsx`** — session (demo today; Firebase in a later phase).
