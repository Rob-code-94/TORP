# TORP Aesthetic Guide (Current Codebase)

This document describes the **actual** visual language implemented in this repository so new work stays consistent.

## Brand tone

- **Premium + cinematic**, but still “boutique professional” (clean, confident, not gimmicky).
- Copy tends toward authority language (“engineer”, “curated”, “partners”) rather than hype.

## Color + contrast

### Core neutrals (default)

- **Page background**: `bg-zinc-950` (also aligned to `body` background `#09090b` in `index.html`)
- **Elevated surfaces**: `bg-zinc-900`, `bg-zinc-900/30|50`
- **True black accents**: `bg-black` (footer / deep panels)
- **Separators**: `border-zinc-800`, `border-zinc-900`
- **Primary text**: `text-white`, `text-zinc-100`
- **Secondary text**: `text-zinc-400`, `text-zinc-500`, `text-zinc-600`

### Accent usage (sparingly)

Accents appear mainly for **semantic states** (paid/pending/overdue, success actions). If a feature is not “status-like”, keep it monochrome zinc/white.

## Typography

Global behavior is defined in `index.html` (Tailwind CDN + a small global CSS block).

### Display stack (marketing + headings + buttons)

- **Families**: `Phosphate → Bebas Neue → Impact → sans-serif`
- **Default page posture**: uppercase + slightly wide tracking on `body`
- **Headings/buttons**: explicitly re-enforced to display + uppercase

### Body stack (readability)

- **Family**: `Inter`
- **Applied to**: `p`, `input`, `textarea`, `select`, `.text-xs`, `.text-sm`, `.font-mono`, table cells (`td`, `th`)
- **Behavior**: normal casing + normal letter spacing

### Practical guidance for contributors

- **Big type / nav / buttons** → display feel is OK (often uppercase).
- **Long paragraphs, form fields, data-dense UI** → must read as Inter (normal case).

### Phosphate note (important)

`Phosphate` is referenced as a first-choice font, but **it is not self-hosted in-repo** right now. Browsers will typically render **`Bebas Neue`** until real font files + `@font-face` are added under license.

## Spacing + layout rhythm

### Landing page sections

- **Large vertical padding**: commonly `py-24`–`py-32`
- **Horizontal padding**: `px-4` mobile, `md:px-12` for wide sections
- **Content width**: constrain text blocks (`max-w-4xl`, `max-w-xl`) even when background is full-bleed

### Dashboard / HQ

- **Full-height shell**: `h-screen`, `overflow-hidden` outer, scroll inside `main`
- **Sidebar**: `w-64`, `border-r`, quiet label color `text-zinc-400` → `text-white` on hover
- **Header**: `h-16`, `border-b`, sticky top bar on main content

## Signature components (do not drift)

### Hero

- Full viewport height (`h-screen`), centered wordmark, full-bleed media, bottom-heavy gradient overlay.
- Subtle motion is OK (slow pulse / bounce for scroll hint), but keep it restrained.

### Trust ticker

- Horizontal marquee, duplicated items for seamless looping.
- Edge gradient fades to keep it feeling “premium”, not “banner-ad”.

### Work grid

- Column masonry (`columns-*` + `break-inside-avoid`) with hover zoom + play overlay.
- Small mono meta is part of the look (year pill, counts).

### Modals (login + contact)

- Dark scrim: `bg-black/80+` + blur
- Panel: `rounded-2xl`, `border-zinc-800`, `shadow-2xl`
- Form labels: small uppercase with tracking; inputs sit on `bg-zinc-900`

## Motion rules

- Prefer `transition-colors`, `transition-opacity`, `transition-transform`
- Durations typically `300ms`–`700ms`
- Avoid flashy multi-color animations and excessive parallax

## Iconography

- `lucide-react` icons are used as thin UI accents (usually zinc, brighten on hover).

## “Anti-drift” checklist before merging UI changes

- [ ] Still reads as **TORP zinc world** (no accidental light theme).
- [ ] Borders/radii match existing patterns (`border-zinc-800`, `rounded-xl|2xl`).
- [ ] Typography respects display vs Inter rules from `index.html`.
- [ ] CTA hierarchy preserved: white/black primary, zinc secondary.
- [ ] Motion stays subtle and consistent.
