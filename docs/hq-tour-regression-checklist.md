# HQ Tour Regression Checklist

Use this after any layout or tour-step change.

## Global checks

- [ ] Tour opens from Product guide `Quick tour` on `/hq/admin`.
- [ ] Tour opens from Product guide `Quick tour` on `/hq/staff`.
- [ ] Progress shows numeric `current / total` (no placeholder tokens).
- [ ] Popover text is readable and does not clip.
- [ ] Closing tour returns control without page horizontal scroll.
- [ ] Verify at 320, 375, 390, and desktop widths.

## Command tour

- [ ] Steps appear for shell + quick actions + KPI + priority feed + storage ops.
- [ ] Missing optional targets are skipped without crashing the tour.
- [ ] Final step gives a clear next action.

## Projects tour

- [ ] Tour launched on `/hq/admin/projects` shows header/search/view modes.
- [ ] Stage-lane and open-detail steps work when those elements are present.
- [ ] If current view hides a target, tour continues without failure.

## Planner tour

- [ ] Tour launched on `/hq/admin/planner` shows header/quick-calendar/view modes.
- [ ] Main-content step works in list, board, and calendar modes.
- [ ] Task-actions step appears in board mode and is skipped safely otherwise.

## Crew tab tour

- [ ] Tour launched on `/hq/admin/crew` shows header/filters/list.
- [ ] PM read-only behavior is explained.

## Financials tour

- [ ] Tour launched on `/hq/admin/financials` shows header/KPIs/filters/table/proposals.
- [ ] PM hidden-access case does not start unavailable steps.

## Clients tour

- [ ] Tour launched on `/hq/admin/clients` shows header/filters/list/drawer.
- [ ] Missing drawer target is skipped safely when closed.

## Settings tour

- [ ] Tour launched on admin and staff settings covers header/tabs/content.
- [ ] Mobile pill tabs and desktop side tabs are both validated.

## Project detail tours

- [ ] Admin/PM detail tour covers header, tabs, and content.
- [ ] Staff detail tour covers limited tabs only.

## Staff home tour

- [ ] Tour launched on `/hq/staff` covers profile, availability, assignments, projects, and call sheets.
- [ ] No assigned-data scenarios still complete without failure.

## Role checks

- [ ] Admin account can complete Command, Projects, Planner tours.
- [ ] PM account can complete tours with role-limited elements skipped.
- [ ] Staff account can complete staff-home and staff-settings tours.
- [ ] No staff/client route unexpectedly starts an admin-only pack.
