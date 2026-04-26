# Calendar Sync — Confirmed Decisions

These are the locked-in answers for the three open questions raised in the
calendar integration plan §9. Implementation under `functions/src/calendar/`
follows them; revisit only with explicit product sign-off.

## 1. Time zone source for events pushed to Google

**Decision:** TORP stores `date` (YMD) and `callTime` / `startTime` (HH:MM) as
strings without an attached time zone. Server-side helpers (`triggers.ts`,
`loader.ts`) interpret those strings as UTC and emit ISO timestamps. We do this
because:

- Existing call sheets, exported ICS files, and the Planner UI already treat
  the time string as wall-clock time.
- Google's web/iOS/Android clients render `dateTime` plus `timeZone: "UTC"`
  consistently as the same wall-clock once the user picks their local TZ in
  Google.
- Adding per-shoot or per-user TZ resolution is an explicit V2 follow-up,
  tracked in the Gap report.

**Consequence:** When TORP later stores a real time zone on shoots/meetings,
the helper functions in `loader.ts` and `triggers.ts` (`isoFromYmdHm`) are the
single place to update. No Firestore migrations are needed since the Google
side is recomputed from the source TORP entity on every push.

## 2. Default calendar selection

**Decision:** All pushed events go to the user's `primary` Google calendar
(`calendarId: 'primary'`) for MVP. The connection document tracks the chosen
`calendarId` so a future "pick a sub-calendar" UI can flip it without code
changes.

**Consequence:** OAuth scope is limited to `calendar.events.owned` (writes to
the authorizing user's calendar) plus `calendar.freebusy`. We never read other
calendars or attendees. The Integrations card explicitly states "Push my TORP
events to Google" as the user-facing description.

## 3. Disconnect cleanup behaviour

**Decision:** Disconnecting from Google **does** remove the local sync
mappings (`calendarSyncMappings/*`) and revokes the refresh token, but
**does not** delete events that were previously pushed to Google. Reasoning:

- Removing events the user might have edited or shared in Google would feel
  destructive; keeping them lets the user clean up at their own pace in
  Google.
- The dropped sync mappings mean the next time the user reconnects we treat
  the sync as fresh (idempotent re-create with new external IDs). Old copies
  remain orphaned, but Google de-duplicates by event ID, not by content.
- The disconnect dialog wording (`GoogleCalendarCard.tsx`) tells the user that
  existing Google copies stay where they are and can be deleted manually.

If a customer later asks for a "wipe my calendar" path, add a one-shot
`forceDeletePushedEvents` callable that iterates `calendarSyncMappings` for
that uid before deletion — straightforward extension of `deleteEventForUser`.
