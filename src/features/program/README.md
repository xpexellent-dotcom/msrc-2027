# Program feature boundary

PRG-01 / CMS-01..04: the Night-3 content editor supplies organizer-authored published sessions and speakers through `src/features/content`. Existing public programme, speaker cards and detail pages use that service-only projection with per-collection static fallbacks. The static catalogue remains empty until content is supplied; development fixtures are synthetic and are never seeded.

The public filters preserve authored days, Riyadh times, room, format, ordering and published speaker links. This does not add a personal schedule builder, workshop bookings or any participant workflow. See the content feature notes for caching, revalidation and the pending migration boundary.

## ENG-076 — schedule publishing (PRG-01)

Reuse `20261023022851_staff_content_editor.sql`; no schedule migration is needed.
Only the existing published snapshot projection supplies public sessions and linked
speakers. Empty/unavailable collections retain the announcement state. List and
detail pages retain the 60-second content cache and existing publish/withdraw tags.

Native GET filters and day links preserve URL state without JavaScript. With
JavaScript, filter changes update the URL immediately. Each day contains chronological
start/end slots, with parallel rooms grouped together. Riyadh clocks use fixed UTC+3
arithmetic and explicit Arabic digits, without ICU. English scientific titles remain
LTR even on Arabic pages. No dates, rooms, times or people are seeded.

The staff editor previews the current loaded session drafts (including unsaved edits),
warns on same-day/same-room overlap and explains reversed/equal end times. Adjacent
sessions do not overlap. This is advisory across the loaded draft collection; it is
not a database lock or a guarantee against another editor's concurrent changes.
The existing server and SQL publication guards continue rejecting invalid ranges.

My Bookings navigation is shown only after the account endpoint confirms a signed-in
participant, and only when the existing account flag is enabled. The authenticated
dashboard has a closed workshop-bookings section: the workshop module has no actual
booking backend in this checkout. No session save/favourite/enrol action is added.

### Change notification hook — documentation only

Future integration point: after a successful committed session publication or
withdrawal, compare the old/new immutable published snapshots by item ID/version.
Relevant changes include day, clocks, room, speaker assignments and cancellation.
Resolve booked/assigned participants through the future authorized workshop and
assignment records, then enqueue bilingual email through the approved outbox with
an idempotency key containing edition, item, published version and recipient.
Never derive recipients from program filters or browsing. Require the independent
email/privacy/booking release gates and keep authorization in the server/database.
No hook executes, recipient list is created or email is sent here. Authorized
conference-wide changes remain the announcements module's responsibility.
