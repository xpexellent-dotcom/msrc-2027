# Closed workshop booking — ENG-074

WKS-01–07, CHK-03/04 and the workshop evidence portion of CRT-01 are implemented
as a separate workshop domain, linked to confirmed conference registration.
Public browsing, workshop booking and conference admission remain distinct.

The starting audit found an inert `src/features/workshops` boundary, an empty
approved public workshop catalogue and a separate CMS programme-session editor.
The existing registration module already supplies native session checks,
server-only participant transport, manual decisions, offers, maintenance and
held outbox patterns. Attendance currently records conference-day evidence;
workshops need separate activity evidence and completion sign-off.

The implementation priorities are database allocation/authority, participant and
staff projections with missing-migration readiness handling, then permission,
failure, concurrency and bilingual UI verification. No production data or
configuration is used as a fixture.

| Requirement | Boundary |
| --- | --- |
| WKS-01 | Separate bilingual operational records; remaining seats never include names. Unset required values close booking. |
| WKS-02/03 | Confirmed admission, server request time, expiring provisional allocation, explicit staff approval, then mock payment or validated full discount. |
| WKS-04 | Serialized database allocation and release; reasoned expiring staff reservations count against capacity. |
| WKS-05 | FCFS waitlist and time-limited offers; eligibility and overlap rechecked on acceptance. |
| WKS-06 | Strict interval overlap with configured buffer; adjacent slots allowed at zero buffer. |
| WKS-07 | Audited removal/cancellation/time/capacity changes, held notice jobs and explicit conflict resolution; no capacity reduction below allocations. |
| CHK-03/04 | Separate workshop check-in and authorized completion events, staff identity, server times and workshop counts. |
| CRT-01 | Read-only completion evidence; workshop survey and certificate issuance remain separate future modules. |
| PRG-01 | My Bookings contains actual requests, holds, offers and bookings; no schedule builder. |

The migration is review-only and must pass disposable Linux CI: reset, strict
database lint, pgTAP and integration races. Local UI/unit evidence cannot prove
database concurrency. The [receipt](../progress/2026-10-24-claude-workshop-booking.md)
records actual commands and results.

The new English `workshop_notice` v1 contains only an allowlisted event, workshop
title, booking UUID and optional deadline. It accepts no participant name,
identity document, caller URL, raw HTML or arbitrary email body. The preview
renderer escapes supplied text and renders deadlines in Asia/Riyadh. Every notice
is DRAFT; SQL holds delivery and the worker independently refuses it, including a
pre-existing provider snapshot. Existing participant templates remain bilingual.

Separate immutable workshop orders retain the configured price/currency and mock,
free or full-discount settlement snapshot. A later workshop edit cannot rewrite
the prior settlement. Mock payment never produces a real payment receipt.
One durable booking record per participant/workshop retains terminal history;
cancelling a booking does not erase or silently replace it with a fresh request.

Staff prepare records at `/{locale}/staff/workshops`; participant records appear
inside `/{locale}/my-msrc`. Workshop-type CMS programme sessions stay editorial
records, without allocation authority. Public availability comes from an uncached,
published-only server endpoint after hydration; `/en/workshops` and `/ar/workshops`
remain SSG. Staff policy save cannot activate a closed booking or mock-payment
switch. Entirely unset drafts can be prepared without registration settings.

The trusted certificates module can call
`msrc_workshop_completion_evidence(edition_key, actor_id, workshop_id)` through
the service-only transport. It returns confirmed-booking, check-in and completion
evidence with staff/timestamps and conflict status. `participationEvidenceComplete`
does not include workshop survey evidence and never grants a certificate.

The existing authenticated outbox drain calls workshop maintenance only with
the workshop and participant runtime gates enabled. Workshop expiry does not
depend on a positive email cap; expiry and held email enqueue can happen while
delivery remains closed. No scheduler is added. Missing RPCs return
`area-not-ready` without ending participant/staff sessions.

PostgreSQL implementation reference: [Read Committed snapshots](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED)
and [transaction locks](https://www.postgresql.org/docs/current/explicit-locking.html).
The implementation and race tests must recheck state after lock acquisition.

Release remains blocked on organizer-owned workshop metadata and operating
policy, instructor/organizer authority, reviewed migration application, template
approval, independent runtime/database activation, delivery approval and human
EN/AR/device UAT. None is supplied or activated by Task n11.
