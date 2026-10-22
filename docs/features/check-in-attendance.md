# Online check-in and daily attendance

ENG-058; BL-CHK-02/03 and BL-ATT-01/03. Source requirements: CHK-01–05,
CRT-01, ROL-08/10/12, DAT-03/04, SEC-01/02/06, LOC-01/03, ACC-01.
The v0.5 specification has no ATT-prefixed IDs.

The closed staff Check-in screen supports native or lazy QR decoding and
manual ticket references. Staff select a configured conference day and may
record an entry label. A label does not grant assigned-entry authorization.
Only a current `checkInStaff` or Super Admin edition grant and the existing
native session assurance permit scanning. The participant never calls the
staff RPCs and cannot write attendance directly.

`conference_days date[]` is nullable and owner-entered in Registration
settings; no dates are seeded or prefilled. The scanner selects today's date
in Asia/Riyadh only when configured. Registration completeness is unchanged.
Each ticket/day has one effective check-in, with server time, performer,
entry-point label and `scan`/`manual_code` method. Simultaneous scanners lock
the same request/ticket before inserting, so a retry reports the existing
time and performer. Reference collisions fail to `not_found`.
Contended attendee-authority rows produce a retryable `unavailable` result;
the native staff session is rechecked after lock waits. Passive count polling
does not renew staff idle time.

The attendance audit stores outcome and correction snapshots without ticket
credentials, submitted unknown references, identity documents or participant
contact data. Super Admin undo requires a bounded reason and retains the row
and original audit facts; a later scan can reactivate that same daily row.
The per-native-session engineering abuse bound is 120 scan/undo attempts per
60 seconds. Counts expose totals and method subtotals only.

RPC contracts:

- `msrc_staff_checkin(edition_key text, ticket_token_or_reference text, conference_day date, entry_point text)`
- `msrc_staff_checkin_undo(edition_key text, attendance_id uuid, reason text)`
- `msrc_staff_attendance_summary(edition_key text, day date)`; null day reads configuration with zero counts.
- `msrc_registration_attendance(edition_key text, session_claims jsonb)`; service role only, bound to the verified participant session.

Scan outcomes are `checked_in`, `already_checked_in`, `revoked`, `not_found`,
`wrong_day`, and `not_approved`; error states do not imply attendance.
The staff HTTP contract projects only the attendance ID, timestamp and staff
performer for successful/duplicate outcomes. Counts and configured days use
`checkIn`; outcomes use `checkInResult`. Participant attendance projects only
`conferenceDay` and nullable `checkedInAt`. Missing optional RPCs preserve
sessions and show `area-not-ready`.

Only the scanner document permits same-origin camera and screen wake lock.
Entering or leaving that route performs document navigation so the browser
receives the matching Permissions-Policy. Camera activation still requires
HTTPS and an explicit action; wake lock additionally requires opt-in and an
active camera. Other documents retain the existing camera denial.

My registration shows separate daily evidence. Both days plus the general
survey are still required for an ordinary conference certificate. Workshop
completion, competition evidence, surveys and certificate issuance are separate.

Before live use: owner configuration, disposable CI database/lint/concurrency
proofs, physical HTTPS camera and wake-lock testing, native Arabic review,
and Decision 19's assigned entry points/staff/outage backup/reconciliation
remain gates. No offline acceptance or roster download is implemented.

See [the task receipt](../progress/2026-10-22-codex-b.md) for observed checks.
