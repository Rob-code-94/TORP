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
