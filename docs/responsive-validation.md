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
