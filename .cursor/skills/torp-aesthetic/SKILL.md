---
name: torp-aesthetic
description: Enforces TORP’s cinematic dark “zinc + white” visual language across landing and dashboard UI. Use when adding or changing React/Tailwind components, typography, motion, modals, marketing sections, or dashboard shells in this repo.
---

# TORP Aesthetic Skill

## Non‑negotiables (match the current codebase)

- **Palette**: near-black backgrounds (`bg-zinc-950`, `bg-black`, `bg-zinc-900`), subtle separation via `border-zinc-800/900`, body text `text-zinc-300/400`, muted labels `text-zinc-500/600`.
- **Primary CTA**: `bg-white text-black` with hover to `bg-zinc-200` (or subtle `hover:scale-105` on marketing CTAs).
- **Secondary surfaces**: `bg-zinc-900/30|50` cards with `border border-zinc-800` and `rounded-xl|rounded-2xl`.
- **Typography** (as configured in `index.html`):
  - **Display**: `Phosphate` → `Bebas Neue` → `Impact` for headings/buttons; default page casing is **uppercase** with tracking.
  - **Body / forms**: `Inter` for `p`, `input`, `textarea`, `select`, `.text-xs`, `.text-sm`, `.font-mono` (normal casing).
  - **Rule of thumb**: long copy + data tables + forms = Inter; big statements + nav + buttons = display.
- **Motion**: restrained; prefer `transition-colors`, `transition-opacity`, `transition-transform` with `duration-300`–`700`. Avoid bouncy easing unless it’s a deliberate “luxury” micro-interaction (like the hero scroll hint).

## Layout rhythm (landing)

- **Section spacing**: large vertical breathing room (`py-24`–`py-32`), generous horizontal padding (`px-4 md:px-12`).
- **Hero**: full viewport height, full-bleed media, bottom-heavy gradient overlay, oversized wordmark, subtle secondary line in zinc.
- **Trust ticker**: horizontal marquee, edge fades, duplicated items for seamless loop, zinc typography that brightens on hover.
- **Work grid**: column masonry (`columns-*` + `break-inside-avoid`) with hover media zoom + play affordance + small mono meta (year pill).

## Layout rhythm (HQ / dashboard)

- **Shell**: `bg-zinc-950 text-white`, fixed height, `border-zinc-800` separators, sticky top bar, muted sidebar labels that brighten on hover.
- **Data density**: cards for KPIs/charts; tables with zinc dividers; status chips only when semantically needed.

## Modals / overlays

- **Backdrop**: `fixed inset-0` + `bg-black/80|/90` + `backdrop-blur-*`.
- **Panel**: `bg-zinc-900|zinc-950`, `border-zinc-800`, `rounded-2xl`, `shadow-2xl`, close control top-right in `text-zinc-500 hover:text-white`.
- **Forms**: small uppercase labels with wide tracking; inputs `bg-zinc-900 border-zinc-800` and focus ring via `focus:border-white` (or subtle zinc shift in dense UI).

## Copy voice (brand)

- Confident, premium, partner-oriented (“engineer”, “partners”, “curated”, “authority”).
- Avoid startup-y hype words, excessive exclamation points, and rainbow gradients.

## Prompt templates (copy/paste)

### New landing section

Build a new TORP landing section consistent with existing modules in `App.tsx` (zinc palette, large type, thin borders). Use Tailwind utility classes only. Typography must respect the global rules in `index.html` (display uppercase for headings/buttons; Inter for paragraphs). Include: title, supporting paragraph, optional meta row, and a subtle border separation from adjacent sections.

### New dashboard page

Add a TORP HQ page using `DashboardLayout` patterns: `bg-zinc-950`, `border-zinc-800`, card surfaces `bg-zinc-900/50`, rounded `xl`, compact header typography, muted `text-zinc-400` nav states. Prefer monochrome structure; use color only for semantic status (success/warn/danger).

### Component polish pass

Refactor `[Component]` to match TORP visual language: remove off-palette blues/grays, normalize borders to zinc-800/900, unify radii (xl/2xl), unify hover transitions, align spacing to `8/12/16/24` rhythm, ensure form controls remain Inter-readable.

## Acceptance checklist (must pass)

- [ ] Uses zinc neutrals consistently; no random slate/stone/neutral unless justified.
- [ ] No light-mode sections unless explicitly requested.
- [ ] Headings/buttons feel “display”; paragraphs/forms feel “Inter”.
- [ ] Borders are thin, confident separators — not heavy frames everywhere.
- [ ] Motion is subtle; hover states are consistent across cards/buttons/icons.
- [ ] Modals match the established overlay/panel pattern.

## Practical note: Phosphate

`Phosphate` is referenced as a first-choice family, but it must be **licensed/self-hosted** with `@font-face` to render reliably. Until then, expect `Bebas Neue` to carry the look — do not “fix” this by switching to unrelated display fonts.
