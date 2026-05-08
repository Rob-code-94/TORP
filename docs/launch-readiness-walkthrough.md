# Launch Readiness Walkthrough

This checklist is the source of truth for auth-first launch validation (financial flows deferred).

## Test Matrix

- Viewports: `320`, `375`, `390`, `768`, `1440`
- Roles: `ADMIN`, `PROJECT_MANAGER`, `STAFF`, `CLIENT`
- Required states per screen: `loading`, `empty`, `error`, `success`

## Route Inventory

### Public
- [ ] `/` landing renders and primary CTAs route correctly.

### HQ auth and role entry
- [ ] `/hq` redirects by signed-in role.
- [ ] `/hq/login` signs in via Firebase only, with actionable auth errors.
- [ ] `/hq/login` auto-redirects authenticated staff/admin/PM users (no login form flash).
- [ ] Refreshing or reopening browser keeps authenticated HQ users signed in on the same machine.

### HQ Admin (non-financial)
- [ ] `/hq/admin` command center renders for admin/PM and denies unauthorized users.
- [ ] `/hq/admin/projects` list, filters, and empty/error handling.
- [ ] `/hq/admin/projects/:projectId` detail screen state coverage.
- [ ] `/hq/admin/planner` list/board/calendar mode behavior.
- [ ] `/hq/admin/crew` load and failure handling.
- [ ] `/hq/admin/clients` load and failure handling.
- [ ] `/hq/admin/settings` and nested settings routes.

### HQ Staff
- [ ] `/hq/staff` dashboard.
- [ ] `/hq/staff/call-sheet/:shootId/print` print view and permission checks.
- [ ] `/hq/staff/settings/profile`
- [ ] `/hq/staff/settings/integrations`
- [ ] `/hq/staff/settings/notifications`
- [ ] `/hq/staff/settings/security`

### Portal
- [ ] `/portal/login` signs in via Firebase client account only.
- [ ] `/portal/login` auto-redirects authenticated users to role-correct destination.
- [ ] `/portal` renders client dashboard and handles no-data case.
- [ ] Refreshing or reopening browser keeps authenticated portal users signed in on the same machine.

## Guardrail Checks

- [ ] No page-level horizontal scroll at `320`, `375`, `390`.
- [ ] Equivalent mobile path exists for every desktop-critical action.
- [ ] Permission denied states are explicit and recoverable.

## Sign-off

- [ ] Product sign-off
- [ ] Engineering sign-off
- [ ] QA sign-off
