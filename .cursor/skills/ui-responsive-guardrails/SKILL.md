---
name: ui-responsive-guardrails
description: Enforces no horizontal page scroll and mobile-complete behavior for TORP UI work. Use when building or editing React/Tailwind screens, tables, calendars, shells, and navigation.
---

# UI Responsive Guardrails

## Mission

Ship interfaces that avoid horizontal page scrolling and keep all core actions reachable on mobile.

- Horizontal overflow should be exceptional and locally scoped.
- Vertical scrolling is acceptable for long content.
- Mobile and desktop must support the same core feature flow.

## Pre-build checklist

- Verify target screen at widths: `320`, `375`, `390`, `768`, `1024+`.
- Confirm no page-level horizontal scroll at each width.
- Confirm key actions/navigation remain reachable on mobile.
- Confirm desktop-only sidebar has mobile drawer/sheet/menu equivalent.

## Layout patterns

- Prefer responsive stacking before fixed widths:
  - `flex-col sm:flex-row`
  - `grid-cols-1 md:grid-cols-*`
- Add `min-w-0` to flex/grid children that contain long text or tables.
- Use truncation for long labels (`truncate`, `line-clamp-*`) plus `title` where needed.
- Break dense horizontal control rows into wrapped groups on mobile.

## Overflow policy

- Default: no horizontal overflow at the page/root level.
- Allowed exception: truly wide content (tables, timelines, planner grids).
- For exceptions, wrap only the component in a bordered container with `overflow-x-auto`.
- Keep surrounding page content static (no body-level sideways pan).

## Mobile nav pattern (required when sidebar exists)

- Desktop: persistent sidebar can remain.
- Mobile: show a top-bar menu button that opens a drawer/sheet with the same routes.
- Ensure drawer supports close via backdrop, close button, and route selection.

## Verification template (add in completion notes)

- `320`: no horizontal page scroll, nav reachable, actions reachable.
- `375`: no horizontal page scroll, nav reachable, actions reachable.
- `390`: no horizontal page scroll, nav reachable, actions reachable.
- `768`: responsive transition behaves as expected.
- `1024+`: desktop layout unchanged, sidebar behavior intact.

## Common fixes

- Replace `w-*` with `w-full` + max-width wrappers.
- Move non-critical metadata below primary line on small screens.
- Convert multi-column cards to single-column below `md`.
- For wide tables: keep `min-w-*` but place table in `overflow-x-auto` wrapper.
