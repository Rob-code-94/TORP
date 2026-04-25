# Responsive Validation (No Horizontal Page Scroll)

Date: 2026-04-25

## Scope

Aligned screens:

- `components/hq/admin/AdminLayout.tsx`
- `components/hq/admin/AdminProjects.tsx`
- `components/hq/admin/AdminProjectDetail.tsx`
- `components/hq/admin/AdminPlanner.tsx`
- `components/hq/admin/PlannerCalendar.tsx`

## Applied changes

- Added mobile drawer navigation for Admin routes (`Menu` button + slide-over + backdrop close).
- Reduced root padding on mobile (`p-4 sm:p-6`) and header spacing (`px-4 sm:px-6`).
- Added `min-w-0` to key containers to prevent flex child overflow.
- Kept wide-content overflow local to component wrappers (`overflow-x-auto`) for table/grid-heavy modules.
- Tightened several table minimum widths to reduce unnecessary horizontal space on small screens.

## Scoped horizontal overflow exceptions (intentional)

These are allowed, local scroll regions (not page-level):

- `AdminProjects` table (`min-w-[680px]`) inside `overflow-x-auto`.
- `AdminProjectDetail` planner table (`min-w-[720px]`) and invoices table (`min-w-[500px]`) inside `overflow-x-auto`.
- `AdminPlanner` list table (`min-w-[760px]`) inside `overflow-x-auto`.
- `PlannerCalendar` week grid (`min-w-[700px]`) inside `overflow-x-auto`.
- Existing financial and crew dense tables remain component-scoped `overflow-x-auto`.

## Breakpoint checklist

- `320`: no root/page horizontal scroll path introduced; mobile drawer provides nav access.
- `375`: no root/page horizontal scroll path introduced; key controls wrap/stack.
- `390`: no root/page horizontal scroll path introduced; key controls wrap/stack.
- `768`: desktop sidebar transition and content spacing remain stable.
- `1024+`: desktop layout unchanged; collapsible sidebar behavior preserved.

## Verification commands

- Build: `npm run build` (pass)
- Overflow audit: searched admin files for `min-w-*` and `overflow-x-*` to confirm overflow is scoped.

## PRJ-003 / PRJ-005 implementation notes

### Component task map

- `AdminProjects`
  - Added list/board/calendar mode toggles.
  - Added mobile card view with equivalent open/select actions.
  - Added saved views, stage filter, and bulk-action controls with role gates.
- `AdminProjectDetail`
  - Added sticky context bar with stage transition control.
  - Added explicit tabs for `Deliverables` and `Controls`.
  - Added per-tab state harness (loading/empty/error/success) for UI state QA.
- `AdminLayout`
  - Added PM-aware shell labels/avatar badges.

### Responsive QA checklist (completed)

- [x] At `320`, projects list is card-first and bulk controls wrap without page overflow.
- [x] At `375`, board overflow is confined to local panel (`overflow-x-auto`), not page root.
- [x] At `390`, detail sticky actions remain reachable and tab controls wrap.
- [x] Desktop and mobile both expose project open, filtering, and stage visibility.

## Projects Round Two regression checks

### Scope

- `components/hq/admin/AdminProjectWizard.tsx`
- `components/hq/admin/AdminProjects.tsx`
- `components/hq/admin/AdminClients.tsx`
- `components/hq/HQLogin.tsx`

### Round Two checks

- Added dual-path client flow in project wizard:
  - existing client selection,
  - inline quick-create client,
  - detour to Clients tab with draft restore on return.
- Added explicit `Bulk Edit` mode gate:
  - checkboxes hidden until mode is enabled,
  - bulk action tray only appears in bulk mode,
  - exiting mode or changing filters/views clears selection state.
- Simplified HQ login options to Admin + Crew only.

### Mobile guardrail pass

- `320`: wizard quick-create fields stack cleanly; sticky footer actions remain visible.
- `375`: Projects header controls wrap; bulk mode toggle remains reachable.
- `390`: list rows remain readable with/without bulk mode; no page-level overflow introduced.

### Validation

- Build: `npm run build` (pass after round-two changes).

## Projects UI polish pass checks

### Scope

- `components/hq/admin/AdminProjects.tsx`
- `components/hq/admin/AdminProjectWizard.tsx`

### Confirmed behaviors

- Added drag-and-drop support for project cards in Board view with stage transition guardrail feedback.
- Archived lane now renders only when stage filter is set to `Archived`.
- Removed Save View controls; current view mode and stage filter now persist until user switches.
- Wizard stage dropdown labels use capitalized display labels and exclude Archived for new project creation.
- Wizard budget field now uses a `$` prefix with numeric sanitization.
- Due date control uses dark color scheme styling for improved calendar icon visibility.

### Mobile/overflow audit

- `320`: board remains locally scrollable inside lane container; no page-level horizontal scroll introduced.
- `375`: control row wraps cleanly without clipping; bulk mode and stage filter remain reachable.
- `390`: wizard step 2 fields remain readable and operable with currency/date styling.

## Project Detail functional pass (PD-001 to PD-008)

### Scope

- `components/hq/admin/AdminProjectDetail.tsx`
- `data/adminMock.ts`
- `types.ts`

### Functional parity checks

- Removed bottom debug tab-state strip from `AdminProjectDetail`.
- Added practical in-tab CRUD controls for:
  - Planner (task add/update/complete/delete),
  - Schedule (shoot day add/edit/delete),
  - Assets and Deliverables (create/update/delete),
  - Controls (risk/blocker/dependency add + resolve toggles),
  - Financials (expense add, invoice create/status update, change-order request).
- Added Overview staffing panel with owner context and assigned crew add/remove interactions.
- Extended mock mutation paths to emit activity entries for all key tab mutations.

### Mobile/overflow QA

- `320`: project-detail tab controls and create forms stack cleanly; no page-level horizontal overflow.
- `375`: planner/invoice wide tables stay in local `overflow-x-auto` containers.
- `390`: controls and finance action rows wrap without clipping; all action buttons remain reachable.

## Project Detail deep audit pass

### Scope

- `components/hq/admin/AdminProjectDetail.tsx`
- `data/adminMock.ts`
- `data/adminProjectsApi.ts`

### Functional status matrix

- `Overview`:
  - Working now: team assignment add/remove, summary display, next milestone display.
  - Working now: hybrid narrative editing (manual edit/save + optional auto-suggest draft + save confirmation).
- `Brief`:
  - Working now: manual edit/save/cancel for brief + goals.
- `Planner`:
  - Working now: add task, mark done/undo, move column, delete.
- `Schedule`:
  - Working now: add shoot day, quick location edit, delete.
- `Assets`:
  - Working now: add asset metadata record, visibility toggle, delete.
  - Deferred: binary upload/storage pipeline (metadata CRUD only in mock pass).
- `Deliverables`:
  - Working now: add deliverable, approve/reopen, delete.
  - Guard retained: transition to `delivered` still checks required deliverables.
- `Controls`:
  - Working now: add/resolve/reopen risks, blockers, and dependencies.
- `Financials`:
  - Working now: request change order, add expense, add invoice, invoice status update (role-gated).
  - Budget source: project budget set from project profile/create flow, displayed as source of truth in detail.
- `Activity`:
  - Working now: key mutations across tabs emit activity events; filter/watch/read controls still operational.

### Deep-pass mobile/overflow verification

- `320`: sticky project identity stays visible while scrolling; action rows stack safely.
- `375`: tab actions and inline forms remain reachable; no page-level horizontal overflow.
- `390`: sticky identity + sticky context controls coexist without clipping and preserve touch access.

## Planner + Schedule workflow upgrade pass

### Scope

- `components/hq/admin/AdminProjectDetail.tsx`
- `data/adminMock.ts`
- `types.ts`

### Functional checks

- Planner now uses explicit status dropdowns: `To Do`, `In Progress`, `Client Review`, `Done`.
- Removed legacy `Mark done` and `Move column` actions from planner rows.
- Added planner `Open` editor for task title, description, reference link, due date, and assignee.
- Schedule now supports two creation flows:
  - shoot items (`Add Shoot Day`)
  - meeting items (`Add Meeting`)
- Added schedule item `Open` editor for date/time/location/description and participants.
- Assignment guardrails now enforce project-team-only assignees/participants across planner and schedule mutations.

### Mobile/overflow checks

- `320`: planner task editor and schedule forms stack vertically with no page-level horizontal overflow.
- `375`: status dropdowns and row actions remain reachable; schedule editors preserve touch targets.
- `390`: participant chips wrap correctly inside schedule editor; sticky headers remain usable.
