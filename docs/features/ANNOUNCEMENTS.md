# Announcements — closed implementation

Authority: ORG-061/062/063 and ENG-070/071/072, extending ORG-059's bilingual participant emails.
Requirements: EML-01–05, LOC-01/03, ACC-01, ROL-10/12, SEC-01/02/06,
PRV-03/05/06 and AT-16. The current organizer decision makes these essential
communications with no opt-out, unsubscribe link or preference record.

Only Super Admins can access the Announcements tab or write, edit, preview,
schedule, cancel and send. Server handlers and database RPCs recheck the exact
session and existing TOTP assurance. Other staff roles have no access even if
they know a route or function name. Staff chrome is English/Arabic with RTL.

The author supplies an English subject/body and Arabic subject/body. These are
plain text with paragraphs, never raw HTML. The technical limits are 90 UTF-16
units per subject and 3,500 per body, fitting the existing 64 KiB provider snapshot.
There is no automatic translation. The shared renderer escapes content and uses
the ORG-062 plain branded PLACEHOLDER banner, complete English, a divider, then complete
Arabic with RTL. The live staff email frame previews this same renderer.

## Private layout approval

Template: `announcement`, version `1`, locale stored as `en`; both languages are
included in every composition. Payload has exactly `subject_en`, `subject_ar`,
`body_en`, `body_ar`. The subject combines both authored subjects. No unsubscribe
or tracking link is added. Authored URLs remain plain text. The renderer inserts
no participant-specific fields, bearer tokens, recipient lists or identifiers;
the Super Admin remains responsible for the plain text they author.

ORG-063 replaces the permanent announcement DRAFT gate with a private per-edition
layout approval, **false by default**. A current Super Admin uses an audited,
idempotent RPC through the staff screen to approve or withdraw approval. This is
safer than a direct settings UPDATE: SQL rechecks exact-session TOTP and current
authority, serializes changes against publication and records the actor/session.
Direct client table access remains denied. No approval is seeded or activated by
this implementation. Registration and abstract emails keep their independent
DRAFT status; ORG-057's wording and approved public legal text are unchanged.

When approval is off, publication behaves as before: recipients and inbox rows
are created atomically and announcement email remains held. When approval is on,
only **new publications** receive immutable `announcement_delivery='approved'`
proof and enqueue without a hold. Approval is evaluated at actual publication,
including scheduled dispatch. Disabling approval affects future publications;
use the global outbox switches to stop already queued approved email.

All old held messages remain held permanently. Approval never updates their hold,
payload, provider request or release proof. There is no bulk-release action. A
later communication requires a separately reviewed new announcement and audience
preview; publishing it creates a new recipient/inbox snapshot.

The worker requires database release proof, failing closed for older or malformed
claim responses. The existing Resend outbox is the only delivery transport.
Announcement claims require database `delivery_enabled`, positive database/runtime
daily caps and `sweeps_enabled`. Provider preparation rechecks database delivery and
sweep switches against the reserved attempt; runtime `OUTBOX_ENABLED`, production
Resend configuration and the authenticated drain must also be ready.
Neither layout approval nor enqueue means an email has been delivered.

## Send a test to myself

The Super Admin selects a saved draft with no unsaved changes and chooses “Send a
test to myself”. SQL binds its version and derives the only destination from the
acting account's current verified Auth address; the request has no recipient
field. A test renders the exact saved English/Arabic subject/body and shared
banner, without a test prefix or alternate template. It can be reviewed before
layout approval using immutable `announcement_delivery='self_test'` proof, while
obeying all the same global delivery gates and caps.

Tests create one outbox message, no recipient snapshot and no inbox row. They
leave announcement content/version/state and recipient totals unchanged. Durable
operation IDs make uncertain retries reuse the same result, and a serialized
actor-wide rolling-hour limit admits at most three distinct tests, across all
editions. The audit records the actor/session and operation without an address.
The staff screen says clearly when delivery is off and no email will arrive;
queued tests wait for later owner-authorized activation and still consume the
normal daily attempt budget if delivered. Review queued tests before activation.

## Audience and snapshot

Multi-select segments are drawn from real current data only: all verified
accounts; registration pending, approved, confirmed, waitlisted and offered;
finalized abstract submitters; accepted presenters; reviewers; check-in staff;
all active staff. Empty/unbacked segments are not offered. Final recipients must
still have verified email; all segments except the global verified-account
segment also require active account access. Overlapping selections are
deduplicated by account before any outbox/inbox rows are created.

Signup profiles currently have no edition membership or participant role grant.
ORG-062 defines “All verified accounts” across the platform, including staff and
signup-only accounts without a registration or profile. Registration, abstract
and staff segments remain edition-scoped.

A private preview returns each segment count, the deduplicated total and up to
five masked addresses. Its token binds the announcement version, authored content
and one materialized recipient set including the current addresses. The dialog
shows the exact previewed total. Send requires that token and an operation UUID.
Any changed audience or content requires another preview. Optimistic versions
reject competing edits. Row locks and durable operation IDs prevent double sends.

Successful send freezes an immutable recipient snapshot and atomically enqueues
one outbox message and inserts one inbox row per account. A transaction failure
rolls back the entire operation. Queued and held counts do not mean delivered.
History shows the state, recipient total and sent/failed aggregates from outbox
messages or their retained deduplication tombstones.

For scheduled announcements, no recipients are frozen before dispatch. The
existing authenticated five-minute outbox drain processes due announcements,
rechecks the author and compares the live audience to the authorized preview.
A change returns the announcement to draft with a review-required reason. A
revoked author cannot dispatch. No scheduler is created, seeded or enabled.
Delivery remains subject to the existing database/runtime outbox switches and
daily caps; a large audience drains over time after separate approval/activation.

## Participant inbox

My MSRC server-renders the current participant's own announcements newest first.
The reader's locale is first; a native disclosure exposes the other language.
Paragraphs and dates are readable without JavaScript. Read state is private and
bound to the verified session; it does not track email opens or delivery.
The service-role RPC accepts server-validated participant claims and rechecks
identity/session ownership in SQL. Client roles cannot call it or query the
private tables directly. Pending RPCs produce area-not-ready without signing out.

## Database and contracts

Pending migration: `20261023145926_announcements.sql`. Private schema:
`msrc_announcements`; tables: `announcements`, `recipients`, `inbox`, `operations`,
`audit`. Every table has forced RLS and denied direct access for public, anon,
authenticated and service-role clients. Snapshot, operation and audit history
are append-only; published content is immutable. SECURITY DEFINER entry points
use an empty search path. The READ COMMITTED guard precedes authorization.

This migration depends on preceding branch migrations, including
`20261023040912_abstract_submission_review.sql` and its held outbox support.
It cannot be applied alone to the owner's 26-migration hosted baseline.
Claude must review the pending chain in repository order; no hosted application
is part of this task.

Staff RPCs use the existing authenticated staff boundary:

- `msrc_staff_announcements_list(edition_key text)`
- `msrc_staff_announcement_save(edition_key text, input jsonb)`
- `msrc_staff_announcement_preview(edition_key text, announcement_id uuid, expected_version integer)`
- `msrc_staff_announcement_send(edition_key text, announcement_id uuid, expected_version integer, preview_token text, operation_id uuid, scheduled_at timestamptz default null)`
- `msrc_staff_announcement_cancel(edition_key text, announcement_id uuid, expected_version integer, operation_id uuid)`
- `msrc_staff_announcement_delivery_status(edition_key text)`
- `msrc_staff_announcement_layout_approval(edition_key text, approved boolean, operation_id uuid)`
- `msrc_staff_announcement_test_send(edition_key text, announcement_id uuid, expected_version integer, operation_id uuid)`

Server-only RPCs:

- `msrc_participant_announcements(edition_key text, session_claims jsonb, announcement_id uuid default null, mark_read boolean default false)`
- `msrc_announcements_maintenance(edition_key text)`

Staff contracts add typed segments, announcement rows, preview tokens/counts,
status/error results and mutations. Participant contracts add the two language
pairs, published/read timestamps and ready/area-not-ready/denied results.
Missing migration errors use the established readiness fallback.

## Review and activation

No hosted migrations, seeds, settings, feature flags, participant access, scheduler
activation, real email, commit or push have been performed for ORG-063. Changes
remain uncommitted for Claude. Owner/Claude review must cover the complete pending
migration chain, permissions, SQL test and race evidence in disposable CI, native
Arabic copy and announcement layout before any separate activation.

The release migration is `20261024100000_announcement_release.sql` (pending).
After review/deployment and separately authorized migration application, keep
global delivery off, inspect the exact preview, and approve the layout with the
Super Admin action. If an owner-authorized human self-test is needed, review
queued jobs and separately approve the provider budget, processing/location,
sender, authenticated drain and global switches before sending; verify actual
inbox receipt in English/Arabic. The approval RPC never changes global switches.
No activation step is executed by this task.
ORG-062 now sets announcement, snapshot and inbox retention to one year after
the last configured conference day. Pending migration
`20261023160000_announcement_retention.sql` extends the existing server-only
`msrc_announcements_maintenance(edition_key text) returns jsonb`; its response
adds `retention: { announcements, recipients, inbox, operations }` counts. The
server maintenance contract accepts these bounded counts as an optional field
so the preceding migration still works. No participant/staff RPC signature
changes. Missing-RPC readiness handling remains unchanged. The private
`purge_retained(edition text)` helper
is not exposed to API roles.

No conference days means no purge. The deadline is the final conference date plus one calendar year at midnight
in Asia/Riyadh; no announcements for that
edition are dispatched by maintenance after expiry. Runs delete at most 20
parents and 500 rows per child table (inbox, recipients, dependent operation
pointers). Existing runtime and database maintenance/sweep gates still apply;
no activation is performed here. Parents remain until children are gone;
repeated/concurrent runs are idempotent under the existing edition lock. Counts-only retention receipts
are append-only; existing operational audit history remains. Outbox messages
and immutable provider requests follow their existing independent terminal
retention policy, including the existing treatment of held/pending messages.

The staff label is “All verified accounts” / “جميع الحسابات ذات البريد الإلكتروني
الموثّق”. The stored key `verified_participants` is retained for compatibility.
It includes verified staff and signup-only accounts without requiring a profile,
registration or active-access record. Suspended, deleted and anonymous accounts, and addresses
that cannot pass the existing outbox email validation are excluded. Other
segments still require active access. ORG-062 supersedes the older
participant-only segment description.

See [the execution receipt](../progress/2026-10-23-claude-announcements.md) for
commands, actual results and outstanding database/human checks.
The retention/banner follow-up is recorded in
[its receipt](../progress/2026-10-23-claude-banner-retention.md).
The release-path evidence is recorded in
[its receipt](../progress/2026-10-24-claude-announcement-release.md).
