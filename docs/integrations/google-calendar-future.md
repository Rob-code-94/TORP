# Google Calendar API & OAuth (future / V2)

This document scopes a later phase when TORP should create or update events in a user’s Google Calendar without relying only on the TEMPLATE `open` link.

## Goals

- Optional **Connect Google** in HQ Settings: user authorizes read/write to selected calendar(s).
- **Push** new or updated schedule items (shoots, meetings) to the user’s calendar when a project-level sync toggle is on.
- **Refresh tokens** stored server-side (e.g. Cloud Functions + Firestore or a small backend) — never in localStorage for production.

## Suggested OAuth scopes

- `https://www.googleapis.com/auth/calendar.events` (create/update events) — or narrower if only inserting.

## Architecture notes

- Use **short-lived access tokens** + **refresh token** per user; rotate on re-auth.
- Map TORP `AdminShoot` / `AdminMeeting` `id` to `extendedProperties.private` or a description suffix to support **updates** and **deletes** on the Google side.
- Handle **revoked consent** and surface **reconnect** in Settings.
- **Private ICS feed** (for Apple &quot;Subscribe&quot;): separate signed URL per org that emits `text/calendar` for a date range; rate-limit and auth-guard.

## Risks

- Token leakage if stored incorrectly.
- User connects multiple Google accounts; need explicit **which calendar** to write to.
- Conflict when event edited in both TORP and Google — define **source of truth** (TORP usually wins, or “last write wins” with warnings).

## Out of scope for current MVP

The shipped app uses **client-side TEMPLATE links** and **.ics** download only; there is no OAuth or Calendar API in this repository yet.
