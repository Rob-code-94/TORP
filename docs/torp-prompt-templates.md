# TORP Prompt Templates (For Cursor)

These templates are aligned to the **current implementation** (Tailwind utilities + the global font rules in `index.html`).

## Global preface (prepend to most UI prompts)

You are building UI for TORP.

Visual requirements:
- Dark, cinematic, boutique-professional: near-black zinc backgrounds, thin zinc borders, high-contrast white typography.
- Primary CTA: white background, black text.
- Typography: display stack for headings/buttons; Inter for paragraphs/forms/small text. Do not uppercase long body copy.
- Motion: subtle transitions only.

Tech requirements:
- React + TypeScript + Tailwind utility classes (this repo uses Tailwind CDN config in `index.html`).
- Use `lucide-react` for icons.

## Modular landing map (build order)

1. `Hero` — full viewport, full-bleed media, bottom-heavy gradient, massive TORP wordmark, subtle scroll hint.
2. `TrustTicker` — infinite marquee, edge fades, duplicated items.
3. `WorkGrid` — column masonry portfolio with hover play overlay + mono meta.
4. `Philosophy` — large bold statement + calmer supporting paragraph.
5. `CTA + Footer` — minimal footer + HQ access; contact modal entry points.

## Prompt: Hero (module 01)

Build `Hero` as a full-screen section:
- `h-screen w-full overflow-hidden bg-zinc-950`
- Background: background **video** is preferred (muted, autoplay, playsinline) with a poster/fallback image; if video isn’t available, use a cinematic still image as temporary fallback.
- Overlay: bottom-heavy gradient to `zinc-950` (stronger at bottom, transparent toward top).
- Title: `TORP` at extremely large sizes (`text-[15vw]` down to `md:text-[12vw]`), `font-black`, `tracking-tighter`, white.
- Subtitle: small, spaced, zinc-muted line (Inter-friendly).
- Add bottom-center “Scroll to Explore” hint with subtle bounce.

## Prompt: Trust ticker (module 02)

Build a trust ticker section:
- Full width, `border-y border-zinc-900`, `bg-zinc-950`, `py-6`, `overflow-hidden`
- Edge fades using left/right gradients
- Horizontally scrolling row of brand names
- Duplicate the array 2–3× for seamless looping
- Typography: `text-2xl font-bold text-zinc-700`, `tracking-widest`, `uppercase`, hover brightens to white

## Prompt: Work grid (module 03)

Build a portfolio grid using **column masonry** (match repo):
- `columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8`
- Each item: `break-inside-avoid`, `bg-zinc-900`, `overflow-hidden`
- Use variable aspect ratios (`aspect-video`, `aspect-[9/16]`, `aspect-square`)
- Hover: image scales slightly, opacity increases, play button fades in, light blur scrim

Note: If you intentionally want CSS Grid “dense packing”, treat that as a **variant**—the current shipped look is column masonry.

## Prompt: Philosophy (module 04)

Create a philosophy section:
- `py-32`, `bg-zinc-950`, `border-t border-zinc-900`
- Large headline (`text-3xl md:text-5xl`, `font-bold`, tight leading)
- Secondary line in `text-zinc-500`
- Supporting paragraph in `text-lg text-zinc-400` with relaxed leading (Inter)

## Prompt: Contact overlay (module 05)

Add a contact modal:
- Trigger buttons open a modal with `fixed inset-0`, `bg-black/90`, `backdrop-blur-md`
- Panel: `bg-zinc-950 border border-zinc-800 rounded-2xl p-8 max-w-lg`
- Fields: name/email, **event type** select, **duration** select, vision textarea
- Submit button: full width white/black

## Prompt: HQ dashboard shell

Build a dashboard layout:
- `flex h-screen bg-zinc-950 text-white overflow-hidden`
- Sidebar: `w-64`, `border-r border-zinc-800`, quiet nav buttons with hover `bg-zinc-900`
- Main: sticky top header, `border-b`, content area `p-8`
- Cards: `bg-zinc-900/50 border border-zinc-800 rounded-xl`

## Inspiration references (directional, not literal)

- Snack Media: social proof ticker + tight “authority” presentation
- Thibaut.cool: whitespace, gallery-like labeling, “breakdown” feeling (use subtle meta + calm secondary lines)
- Studio 44: strategic language + bold headers + partner positioning
