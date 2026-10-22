# Registration — closed foundation and staff queue

22 October 2026: ENG-059 adds participant journey polish and EN/AR 360/390px
and desktop regression coverage. Request/approval wording, identity-format
guidance, opening labels, direction isolation and keyboard completion are
reviewed in [the journey review](../reviews/participant-journey-2026-10-22.md).
No migration, RPC, API contract or authorization change is part of this review.

Current extension: [My registration](#my-registration-task-4--eng-055)
adds participant status, offer acceptance, decline and self-cancellation on top
of the existing tickets and transactional email events.
Earlier slice descriptions below are historical where superseded by ORG-056
and the appended current sections. Participant registration and delivery remain closed.

Authority: ORG-051 and ENG-043 in [DECISIONS](../DECISIONS.md). Requirement mapping:
REG-01–08, AUTH-01/06, CHK-01/02, ADM-01–05, DAT-03/04, API-01–03, TIM-01/02,
PRV-03/05/06, SEC-01/02/06, LOC-01/03, ACC-01, REL-02/06. Published Terms v1.0
§§3–5 and ORG-039/041 remain authoritative; this document adds no legal wording.

This slice supplies a private request/data-protection foundation and a bilingual
request form behind independent server/database gates. It ships **closed**.
Submitting a request creates only `pending_approval`; it allocates no seat,
confirms no admission and sends no email inline. Proposed later workflows below
are not implemented by this slice. Synthetic fixtures are development evidence,
not production configuration or launch approval.

## Delivery slices

| Slice | Scope |
| --- | --- |
| 1 — this change | Decisions/settings, private requests and identity protection, audited organizing-team/volunteer designation, neutral EN/AR request form, guarded Super Admin identity reveal |
| 2 | Durable transactional email outbox and bounded, deduplicated jobs |
| 3 — staff backend implemented | Private staff queue, bulk approval, serialized seat allocation, manual waitlist, organizing-team priority and scoped counts. Timed offers and export remain separate work. |
| 4 — Tasks 3–4 implemented | QR ticket, six DRAFT transactional email templates, atomic outbox events, closed cron bridge, participant status/countdown, offer acceptance, decline and self-cancellation. Early access uses ORG-056's email list. |
| 5 | Confirm-your-seat response and release of unanswered allocations to the waitlist |

Payments, if the owner selects paid registration, and workshop booking are
separate. Wallet passes are later work. No staff queue/bulk-action UI, ticket,
countdown, early-access code issuance, email delivery, waitlist offer, allocation,
self-cancellation or confirm-seat action is exposed by slice 1.

Backlog: [BL-REG-01–11](../backlog/10-registration.md) and
[BL-ABS-09 accepted-work export](../backlog/07-abstract-submission.md#bl-abs-09).
Existing backlog status values are retained; the dated progress note reports
implemented source and actual checks separately.

## Decisions and unresolved configuration

ORG-051 records the owner's 5 October confirmation of 2,000 general seats, waiting
list, early access before general opening, opening countdown and confirm-your-seat.
The owner's 15 October decision gives organizing-team members and volunteers early
registration and first pick of workshop seats. Capacities/windows are private
settings, not public constants; the migration inserts no settings.

The 50-workshop-seat figure is **pending confirmation as per-workshop or total**
under [DR-CFG-07](../backlog/DECISION_REQUIRED.md#dr-cfg-07). No workshop capacity
default is approved. Early access of 72 hours, suggested groups (KAU students,
past attendees, club members), confirm-seat email seven days before with a
72-hour response, 24-hour waitlist offers and a remaining-place threshold of 400
are **proposed, not approved**. Only labelled synthetic fixtures may use them.
Free versus paid, prices, all opening instants, early-access proof, workshop count
and financial rules beyond published Terms are not decided. The historical paid
product description does not answer the current free-versus-paid question.

## Private settings

`msrc_registration.settings` is edition-scoped, forced-RLS and inaccessible to
client table reads/writes. No organizer UI or client setting mutation is added.
The independent database policy is `enabled`, default false. Missing rows or
required null/malformed/inconsistent values close registration. Instants are
`timestamptz`; database time is authoritative, with start-inclusive/end-exclusive
windows. Displayed dates/times, when later approved, must identify Asia/Riyadh.

| Setting | Purpose and request-readiness rule |
| --- | --- |
| `enabled` | Independent database policy; must be true |
| `terms_version` | Accepted current Terms version; must match the approved server version |
| `payment_required` | Explicit free/paid decision; null closes, no inferred default |
| `general_capacity` | Approved admission limit; positive and present, never a slice-1 allocation |
| `default_workshop_capacity` | Nullable pending DR-CFG-07; not required to submit a general request and grants no workshop entitlement |
| `early_access_start_at`, `early_access_end_at` | Required configured early-access interval before general opening; codes/groups are later work and do not admit requests in slice 1 |
| `priority_start_at`, `priority_end_at` | Required configured organizing-team/volunteer interval; current designation required during this interval |
| `general_opening_at`, `closing_at` | Required general interval and final closing boundary |
| `waitlist_offer_hours` | Required positive offer duration for later timed offers |
| `confirm_seat_lead_days` | Required configured invitation lead time for slice 5 |
| `confirm_seat_response_hours` | Required positive response duration for slice 5 |
| `places_remaining_threshold` | Required private threshold for later approved count display |
| `minimum_age` | Must be 18: the existing immutable declaration proves only the approved 18+ assertion, not a birth date or another numeric threshold |
| `payment_window_hours` | Required positive duration only when `payment_required=true`; nullable for an explicit free configuration |

All business values above are nullable at rest so missing organizer choices can be
represented honestly. A required value being null closes the gate; the pending
workshop default and a free configuration's payment duration are deliberately
non-required. Production is not populated from fixtures. Approved unpaid requests
will use nullable `payment_due_at` and database-time expiry under REG item 6;
this slice creates no approval or payment window.

## Gate and participant request

Registration opens only when all of these conditions hold together:

1. The server-only value `REGISTRATION_ENABLED` is exactly `"true"`.
2. Participant-account readiness and its independent server/database/session
   gates are satisfied. Reuse the existing verified account and immutable 18+
   declaration from [age and retention](PARTICIPANT_AGE_RETENTION.md), not editable
   user metadata. That declaration is self-attestation, not independent age proof.
3. The private database registration policy is enabled and every required setting
   is present/valid, including explicit Terms and free/paid configuration.
4. Current database time is in the configured priority window for a currently
   designated participant, or in the general window for any otherwise eligible
   participant, before final closing. Slice 1 admits no other early-access group.

`NEXT_PUBLIC_REGISTRATION_ENABLED` cannot open anything. All other workflows stay
hard-closed even when their environment names are `"true"`. With the registration
flag absent, `/api/workflows/registration` retains its closed 503 response and the
page retains the incumbent closed presentation (HTTP 200); no registration number
is parsed/stored. Missing database
capability or keys fails closed rather than falling back to an older schema.
Registration remains noindex and excluded from public analytics.

An eligible participant opens “Reserve your seat”, chooses national ID, Iqama or
passport, enters its number, accepts the current Terms and submits. ORG-039 limits
this identity collection to conference registration; no authentication or hackathon
field is added. The server derives the account/edition/current Terms, validates
the document and acceptance, encrypts the number and calls one guarded request
RPC. The database rechecks native managed identity, exact session, verified email,
current account/age authority, readiness and time. Claimed actor/state/Terms values
from a browser are not authority. A successful double submission returns the
existing request, not a second row or seat.

The API reuses participant-session refresh for a near-expiry native token. It
requires the same actor and exact native session and preserves the original
absolute deadline. Server rendering observes only and never consumes a refresh
token. A client session recheck exposes no identity fields until private readiness
has succeeded; failed or changed-session refresh clears the cookie and denies.
Registration CSRF evidence is bound to the origin/account/session and supports
idempotent retries. Fresh per-attempt nonce claims retain the existing shared
database IP limits; request uniqueness is enforced independently in PostgreSQL.

New participant labels/errors/receipt are translated EN/AR, with Arabic RTL and
LTR document-number entry where appropriate. Use existing form/error/focus tokens
and keyboard affordances; never retain the entered number in a URL, analytics,
localStorage, console or ordinary success response. Public wording is neutral:
request receipt does not promise admission or expose internal approval, discounts,
prices, capacity or operating dates. No new volunteer public wording is added.

## Private data and states

The additive schema is `msrc_registration`. Its `settings`, `requests`,
`priority_designations` and immutable `audit` tables all force RLS. Revoke table
and schema access from PUBLIC/anon/authenticated; client roles have no direct
grants. Foreign keys have covering indexes. Registration uses guarded SECURITY
DEFINER entry points with empty `search_path`, explicit qualified objects and
current session-context authority following `msrc_staff.authorize`.

`requests` stores an edition/account reference, request ID, `pending_approval`
status, accepted Terms version and timestamps, plus document type, masked value,
encrypted envelope, duplicate digest and key version. Database uniqueness enforces
one request per account per edition and duplicate document protection; a retry
returns the existing request without changing its accepted snapshot. Slice 1
cannot write allocation, payment, ticket or confirmation evidence.

Reserve vocabulary for later `approved`, `approved_awaiting_payment` (only if
paid), `waitlisted`, `offered`, `confirmed`, `cancelled` and `expired` transitions.
The v0.5 draft/rejection vocabulary remains historical baseline; future transition
work must reconcile any additional states explicitly. Never use a status label
alone as a ticket/seat/financial entitlement. Cancellation/resubmission policy
cannot weaken per-account uniqueness without a separately reviewed transition.

## Identity encryption and duplicate protection

Choose **application-level AES-256-GCM**. The application encrypts before writing
the database; a database backup contains no decrypt key. This uses Node's native
cryptography without an additional encryption service or key inside the same
database backup. GCM supplies authenticated encryption; each encryption uses a new
random 12-byte IV and a 16-byte tag. Bind edition, actor, document type and key
version as authenticated additional data so a substituted envelope fails closed.
Store ciphertext/IV/tag as hex and retain a per-record key version.

Normalize document input consistently before encryption/deduplication. A separate
**HMAC-SHA-256** secret hashes edition + document type + normalized number for
duplicate detection. A raw digest of a low-entropy identifier would be guessable;
the separate keyed secret prevents an offline database-only dictionary check.
The mask is the only ordinary display projection. Do not expose ciphertext,
duplicate digests or key material in participant/ordinary staff responses.
An accepted four-character passport is fully masked; longer values display only
the final four characters after six masking bullets. A mask never contains the
complete accepted identifier.

Server-only names, never secret values:

- `REGISTRATION_IDENTITY_ENCRYPTION_KEYS`: JSON map of key-version labels to
  independently generated 32-byte keys encoded as 64 hex characters.
- `REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION`: the key-version label used for
  new encrypted records; the label is not a secret.
- `REGISTRATION_IDENTITY_HMAC_SECRET`: a separate independent 32-byte secret,
  encoded as 64 hex characters, stable across ordinary cipher-key rotations.

The owner generates each key/secret using a cryptographically secure random
number generator, such as Node `crypto.randomBytes(32)`, independently. Never
derive one secret from the other, a password, an identity number, a UUID or a
public environment value. No real key is generated, printed, committed, uploaded
or added to Vercel by this task. Synthetic test keys are disposable and cannot
authorize hosted processing.

## Custody, rotation and restoration

Before activation, the owner stores the production keyring and HMAC secret as
**Sensitive** server-only Vercel Production environment variables and retains a
separately encrypted offline copy with two named people. ENG-043 names the
intended two-person handoff in [DECISIONS](../DECISIONS.md#eng-043--closed-registration-authority-identity-protection-and-priority-16-october-2026),
preserving ORG-043's names-only-in-that-register rule. The owner must confirm both
custodians' responsibilities and document both acceptances; their website roles
do not establish completed key custody. Offline custody must include all retained
versioned cipher keys, the active label and the separate HMAC secret, with
restricted access and recoverable encryption credentials. Evidence records
version labels/custodians/drill outcome, never values.

Cipher-key rotation adds a new CSPRNG key under a new version, preserves every
old decrypt key, then changes only the active version for new writes. A controlled
audited re-encryption operation may later decrypt old records using their stored
version and encrypt under the new key with a new IV/AAD. Do not discard an old key
until no retained row or restorable retained backup requires it, or until the
approved deletion policy intentionally makes those records unrecoverable. Test
that a record written under the old version still decrypts after the new version
becomes active. A missing version or altered IV/tag/ciphertext/AAD fails closed.

Keep the HMAC secret stable during cipher rotation so existing document digests
remain comparable. HMAC-secret replacement needs a separate controlled migration
with old/new digest lookup and backfill before cutover; simply replacing the
secret would lose duplicate detection against existing records. Do not rotate it
by overwriting configuration in isolation. Neither re-encryption nor HMAC backfill
is a worker built by slice 1.

A restore drill must restore an encrypted record, its metadata and stored key
version into an isolated disposable environment, retrieve the independently held
offline keyring/HMAC secret, and decrypt through the same server function. Use a
known synthetic encrypted record included in the tested backup and verify its
expected plaintext in memory without logging the number. Prove an older-version
record remains readable after switching the active version; prove a missing key
and a tampered record fail safely; verify the recovered HMAC still finds the
same duplicate. Record only version labels and pass/fail evidence. A catalog
restore without decryption proves no key recovery. Apply the latest independently
retained erasure/suppression evidence before any restored environment can open;
restore never reinstates expired/deleted identity data for live use.

## Masking and audited Super Admin reveal

Ordinary staff views receive masked values only. Full reveal requires the existing
staff boundary with a current Super Admin session/assurance, exact edition/target,
and a nonblank reason. The reason-bearing overload obtains real encrypted data
only after authorization and durable reveal audit, then the server decrypts it
using that record's key version. Legacy reasonless calls return no identifier.
Wrong roles, missing reasons, unavailable records/keys and decryption failures
never return plaintext. Audit actor/target/time/action/result/reason, never the
number, ciphertext, digest or key. Every reveal attempt is audited at the guarded
boundary; an allowed encrypted-data access remains visible even if later
application decryption fails. Staff must not enter an identity number or other
unnecessary personal data in the reason; the free-text reason is not automatically
classified as containing an identifier.

The existing identity-reveal stub is extended additively; older migration snapshots
remain unchanged. A reveal grants neither export access nor registration approval.
Sensitive responses remain private/no-store and are never persisted in browser
storage. Super Admin-only full personal exports remain a separate ADM-03 feature.

## Organizing-team and volunteer designation

`priority_designations` associates a participant account with an edition. **Super
Admin only** may set or remove it through the guarded, audited RPC. Require a
reason, record actor/timestamps and previous/resulting designation, preserve
immutable audit history, and recheck current native staff session/TOTP authority.
No self-service field, public flag, client table grant or rule inferred from the
public Team page is accepted. Reasons belong only in private authorized evidence.

During the configured priority interval, the request RPC checks the current
designation; non-designated accounts are refused. During the general interval,
all otherwise eligible accounts can request. Server lookup is available for the
future workshop slice to implement first pick; it creates no workshop record,
seat hold, entitlement or promise now. Qualification, roster verification and
operating responsibility require organizer answers before actual designation.
Do not infer early-access eligibility for KAU/past attendee/club groups from this
flag; those groups are proposed and their proof is unresolved.

## Retention and rollout

ORG-039/041 and approved Privacy v1.0 require deletion of registration identifiers
by **28 January 2028**. A later purge PR must cover ciphertext, masks, keyed digests,
controlled exports/files, backup overwrite cycles and restore suppression. This
slice adds no purge job, hosted cron or exception to approved retention. Any
financial/audit retention exception needs explicit authority; encrypted storage
is not a reason to retain the identifier indefinitely.

Migration: `20261016110000_registration_foundation.sql` — **pending — owner applies
with the hosted change routine; requires `20261008160137_participant_age_retention.sql`
first**. The timestamp is after `20261013205046`, but the registration SQL does not
depend on the cleanup-scheduler migration. It seeds no settings or keys and applies
nothing to the hosted database. Review migration history and the exact reviewed
file, backup/restore/custody evidence, RLS/grants/indexes and synthetic checks
through the existing owner routine; never blanket-push/reset the hosted database.

Keep `REGISTRATION_ENABLED` absent/false and database policy false. Do not add
Vercel settings. Before a separately authorized launch, complete all five slices,
approved operating settings/free-paid/proof/priority decisions, durable email and
ticket/allocation/cancellation/confirm-seat evidence, actual participant readiness,
privacy/location/key custody/deletion/restore evidence and human EN/AR UAT. A
merged application or green synthetic suite alone does not open registration.

The new RESTRICT foreign keys are explicitly integrated into the existing
participant-erasure inventory. Registration/priority history produces the
existing `retained_account` hold reason, preserving the retention audit constraint.
Other unknown incoming foreign keys still fail closed. The existing helper OID
is preserved so prepared cleanup/security callers retain the new boundary.

## Verification and organizer questions

Run SQL RLS/ACL/index/role/session/age/verification, idempotent concurrency,
null-setting/time-boundary/priority/reveal/audit tests; encryption/HMAC/mask/rotation
unit tests; default-off and synthetic enabled EN/AR desktop/mobile keyboard/axe
flows. Test all other workflows remain closed with their env names `"true"`.
If Docker/local Supabase is unavailable, retain the SQL/concurrency/database-backed
flow specifications and mark their execution **BLOCKED locally**, not passed.
The loopback synthetic-provider browser suite can verify the actual SSR/API/crypto
and EN/AR interface independently; it does not prove database or native Auth enforcement. The
performance-advisor/unindexed-FK check is likewise blocked without the database.
Actual command results/counts are in the O9
[progress note](../progress/2026-10-16-codex-registration-foundation.md).

Remaining organizer answers: free versus paid and its financial contract; opening,
early-access and priority instants; approved duration/threshold values; who qualifies
for priority and how the roster is verified/maintained; early-access proof/groups;
50 workshop seats per workshop or total and catalog/count; queue/offer/confirm-seat
consequences; remaining operating owners; key-custodian acceptance and recovery
drill evidence. Published Terms control existing refunds language; do not invent
additional rules. None of these questions prevents closed synthetic implementation.

## Staff queue slice 3 — ORG-055

Engineering decision: [ENG-049](../DECISIONS.md#eng-049--closed-staff-registration-queue-and-allocation-17-october-2026).
Migration: `20261017120000_staff_registration_queue.sql`. No settings are seeded,
participant/account gate is opened, email is sent/enqueued, or hosted database is
changed. The planner owns the parallel console UI.

`GET /api/staff-portal?area=registration&query=...&status=all` uses the existing
private staff session. `q` remains an alias for `query`; sending both or repeated
parameters is invalid. Status accepts the eight request states or `all` (default).
Search is a literal case-insensitive name/email substring, with no wildcard
semantics. Results are newest first, up to 50, and expose the active priority flag,
decision timestamp and mask only. Counts cover the entire edition, independent
of search/status. `approved` counts all seat holders, not just the literal status.

POST `registration-approve` and `registration-waitlist` require 1–100 distinct
UUID `requestIds`, existing CSRF/origin protections, and current Super Admin or
registration/workshop administrator authority. Approval locks the edition settings
row before allocation, rechecks current session authority after waiting, and
processes `created_at,id` oldest first. `approved`, `approved_awaiting_payment`,
`offered` and `confirmed` hold seats. Unknown IDs, other editions, ineligible states
and capacity overflow count as `skipped`; this does not change them to waitlisted.
Approval is idempotent, and waitlisting only moves pending requests. Both return
`decided: { approved, waitlisted, skipped }` and a fresh unfiltered registration
projection. The UI should refresh its current filter after a mutation.

Missing capacity yields HTTP 409 `capacity-not-set`; missing `payment_required`
or paid `payment_window_hours` yields `payment-configuration-required`. Explicit
free approval stores `approved`; explicit paid approval stores
`approved_awaiting_payment` and a database-time deadline. No elapsed deadline
silently frees a seat. Future expiry/offer/confirmation writers must use the same
settings lock and explicit transitions. READ COMMITTED is required for allocation;
other transaction isolation levels are refused rather than risking stale counts.

Super Admin-only `area=priority` returns `{ designations, candidates }` (each up
to 50), including inactive designations and private reasons, with the same
name/email search. `priority-set` / `priority-remove` require `targetId` and a
trimmed 1–300 character reason without control characters. The server reuses
`msrc_registration_priority_set` with only claims from the native-verified exact
Super Admin session; browser metadata is never a role or designation source.

`area=summary` returns only readable areas: registration counts and total visible
participants for registrars/Super Admins; staff, active priority and audit events
in the last 24 hours for Super Admins. Other authorized staff receive an empty
summary. Counts match existing area visibility, including historical/revoked
staff memberships listed by People; they are not estimates from a 50-row list.

RPCs: `msrc_staff_registration`, `msrc_staff_registration_approve`,
`msrc_staff_registration_waitlist`, `msrc_staff_priority`, `msrc_staff_summary`.
They require authenticated native sessions and database authorization. Private
helpers/tables remain ungranted with forced RLS and empty function search paths.
Registration audit now includes `request.approved` and `request.waitlisted`, plus
the existing submission/priority/reveal evidence in the Super Admin audit area.

Next: merge the parallel EN/AR console, run disposable CI database tests and the
last-seat contention/expired-session tests, then slice 4 reviewed notification
templates and atomic ENG-046 outbox enqueue. No synthetic template is wired to
business decisions. Timed offers require approved duration/release behavior;
export, admission email, QR tickets and participant actions remain outside this
backend slice. Observed checks and UI integration blockers are in the
[O9 receipt](../progress/2026-10-17-codex-registration-queue.md).

## Staff queue slice 3b — detail, offers and export

Engineering decision: [ENG-050](../DECISIONS.md#eng-050--closed-staff-registration-detail-offers-and-masked-export-19-october-2026).
One pending migration, `20261019120000_staff_registration_offers_export.sql`,
extends the preceding queue slice. This supersedes that slice's deferral of staff
offers/export only; participant acceptance, notification and activation remain
separate. No hosted migration or setting is changed.

`GET /api/staff-portal?area=registration-detail&requestId=<uuid>` returns
`registrationDetail: { request, history }` for a current registration/workshop
administrator or Super Admin. `request` has the list's masked projection plus
`offerExpiresAt: string | null`. History contains `{ id, from, to, at,
performerName }` for immutable request transitions, newest first. An absent or
other-edition request is denied without disclosing whether it exists. The full
identity reveal remains its separate reasoned, audited Super Admin action.

POST `registration-offer` takes the same `requestIds` (1–100 distinct UUIDs),
form token and optional status filter as approval. Only `waitlisted` requests
can become `offered`. Process the selected eligible requests oldest first under
the edition settings lock, count all four seat-holding states, and skip unknown,
other-edition, already-decided or excess requests. Return
`decided: { approved: 0, waitlisted: 0, offered, skipped }` and a fresh unfiltered
registration projection; refresh the UI's active filter afterward.

`offer_window_hours` is nullable, has no default, and is not copied from the older
reserved `waitlist_offer_hours` field. Null returns HTTP 409
`offer-window-not-set`. Neither the fixture duration nor the older field approves
a live duration. Capacity must also be set; offers make no free/paid choice and
do not start payment, confirmation, ticketing or email.

The explicit `msrc_staff_registration_expire_offers(edition_key)` transition releases
elapsed nonnull offers idempotently. Queue/detail/export reads, summary counts
and allocation refresh expiry before projecting counts or allocating seats.
It shares the settings lock and current authorization checks; READ COMMITTED is
required. It never advances the next waitlisted person. Staff choose who gets the
next offer. Release behavior remains pending organizer confirmation. There is no
cron/job or participant acceptance endpoint. A legacy null expiry keeps holding
its seat. Payment expiry remains outside this change.

`counts.offered` and `counts.expired` are edition totals. `counts.approved`
continues to mean all seat holders, including `offered`; never add the two to
calculate occupied seats. `remaining` remains clamped at zero or null when
capacity is unset.

`GET /api/staff-portal?area=registration-export` is Super Admin-only with valid
TOTP. Download all edition requests with name, email, status, priority, created/
decided timestamps and the identity mask. Every export writes an immutable
`registration.exported` audit with its row count. CSV uses a UTF-8 BOM, quoted
cells, escaped embedded quotes, attachment disposition and no-store headers.
Prefix a single quote to values beginning `=`, `+`, `-`, `@`, tab or CR to prevent
spreadsheet formulas. The export never retrieves ciphertext or decrypts identity.

The UI must render `offer-window-not-set` in EN/AR and treat missing read RPCs as
HTTP 503 `area-not-ready`, leaving the session intact. Offer deadlines are stored
as UTC instants; display them in Asia/Riyadh with a timezone label. New audit
labels cover `request.offered`, `request.offer_expired` and
`registration.exported`. Slice 4 adds reviewed English templates and atomic
outbox enqueue; slice 5 adds participant confirm-your-seat. Disposable database
verification and observed local checks are recorded in the
[slice 3b O9 receipt](../progress/2026-10-19-codex-registration-slice3b.md).

## Early-access email list and automatic offer hand-on (ORG-056 / ENG-051)

The pending `20261020120000_early_access_list_autopass.sql` migration supersedes
the preceding **staff choose after expiry** default. Under the existing edition
settings lock, each elapsed offer releases its seat and can offer it to the next
waitlisted request in `created_at,id` order. The number offered cannot exceed
either released seats or available capacity. An invocation that expires nothing
does not fill vacancies. Automatic offers have NULL audit performers and deadlines
from database time plus `offer_window_hours`. A null window prevents replacement
offers; recorded elapsed deadlines still expire. All four existing seat-holding
states remain counted. Existing staff reads trigger this operation; there is no
new background scheduler, email producer or participant acceptance endpoint.

Super Admins with exact-session TOTP can maintain a private per-edition email
list before accounts exist. Entries use lowercase, space-trimmed email addresses;
active duplicate additions and repeated removals are no-ops. Re-adding a removed
email reactivates its existing entry and records a new change. Forced RLS and
absence of client grants protect the list. Audit evidence references the opaque
entry ID, never a copied email. The list contains up to 200 active entries per
search, newest first, with verified participant-account and registration-request
existence indicators. Addition accepts 1–500 emails and reports invalid entries
while applying valid entries; removal accepts 1–500 entry UUIDs and treats
duplicates, unknown IDs and already removed entries as no-ops.

During `priority_start_at <= database_time < priority_end_at`, existing
organizing-team priority **or** an active list match against the participant's
current verified `auth.users.email` permits an otherwise eligible registration
request. Submission rechecks this under the settings lock at READ COMMITTED;
removing an entry before that check revokes its early-window eligibility. General
opening, closing, account assurance, age, settings readiness and feature gates
retain their existing behavior. Email-list membership never grants workshop
priority, a seat, registration approval or admission.

ORG-056 approves free general attendance (`payment_required=false`), early access
on 15 November 2026 at 20:00 Asia/Riyadh, general registration on 18 November 2026
at 20:00 Asia/Riyadh, and a 24-hour offer window. The owner enters these settings:
`priority_start_at=2026-11-15T17:00:00Z`,
`priority_end_at=general_opening_at=2026-11-18T17:00:00Z`,
`offer_window_hours=24`. These documentation examples do not seed, default or
activate anything. The legacy `early_access_*`/`waitlist_offer_hours` completeness
fields are unchanged; no automatic settings backfill is introduced. Workshop
pricing, windows and booking remain separate.

Exact HTTP/TypeScript contracts, UI obligations and executed versus blocked checks
are in the [backend receipt](../progress/2026-10-20-codex-early-access-autopass.md).

Task 1b / ENG-052 integrates the EN/AR `/staff/early-access` screen with the
Super Admin menu, page guard and API area. Pasted addresses are normalized and
deduplicated before sending `emails`; the server validates them again and returns
`invalid` entries for correction. Result text uses actual `added` / `removed`
counts, including duplicate/no-op results. Removal sends `entryIds`. Account and
request columns describe existing records without creating accounts or sending
invitations. Search refreshes the active list after changes and clears selection;
bulk removal is limited to displayed rows. Current read failures take precedence
over old success text, including a failed refresh after a successful mutation.

The handler and HTTP RPC adapter distinguish missing functions (`area-not-ready`)
from other failures (`unavailable`), preserving the staff session. EN/AR browser
coverage exercises these states, role restrictions, partial invalid results,
individual/bulk removal, search and axe on desktop/mobile. New concurrency cases
cover duplicate additions/removals; database execution remains a CI gate. See the
[integration receipt](../progress/2026-10-20-codex-early-access-integration.md) for
observed checks. The existing migration and auto-pass behavior are unchanged.

Task 2 / ENG-053 adds the Super Admin-only EN/AR
`/staff/registration-settings` screen. Owner-entered settings require explicit
before/after confirmation, complete validation, the existing allocation lock,
and immutable save history. Legacy early dates mirror the priority window on
save; no automatic backfill or seed is performed. Registration remains a
read-only switch here, and enabling is refused. See the
[settings feature note](registration-settings.md) for RPC/HTTP contracts and
the [Task 2 receipt](../progress/2026-10-20-codex-registration-settings.md) for
local checks, blocked database execution and owner review points.

## Tickets and transactional email (Task 3 / ENG-054)

Migration `20261020140000_registration_tickets_emails.sql` adds forced-RLS
`msrc_registration.tickets`. The unique request foreign key inherits the existing
participant/edition uniqueness. The ticket contains an independent random UUID,
secret hash, status and issuance/revocation timestamps. No plaintext secret or key
is stored. Free approval and confirmation issue the ticket in the business
transaction; bulk approval uses the same trigger. Repeats preserve it, and
cancellation/expiry revoke it permanently. Offers alone do not issue tickets.
This follows the current Task 3/ORG-056 free-registration rule over the older
v0.5 confirmed-only wording. Existing rows are not backfilled.

The guarded service-only RPCs are:

```sql
msrc_staff_registration_approve_tickets(
  edition_key text, session_claims jsonb, request_ids uuid[], ticket_secret text
) returns jsonb
msrc_registration_ticket(
  edition_key text, session_claims jsonb, ticket_secret text
) returns jsonb
```

Approval binds only server-verified native claims, reuses current staff role and
exact-session assurance, serializes on the existing edition capacity lock, and
restores transient claims/key settings on every exit. The older authenticated
approval RPC returns `area_not_ready` without the private key context. The
application does not fall back to it when the new RPC is missing.

The own-ticket RPC uses the current verified account and exact session; caller
input cannot choose another participant. It returns
`{state:'ready', ticket:null|{status,referenceCode,token}}`. `status` is `issued`
or `revoked`; revoked tokens are null. Closed, denied and unavailable states are
explicit. A current participant may read their existing ticket after submission
closes while the independent registration/account policy remains enabled.
It never enables registration. The 12-character uppercase reference is a display
aid, not a secret or unique manual-entry authorization credential.

`REGISTRATION_TICKET_SECRET` is a separate random 32-byte key encoded as 64 hex
characters. Keep it server-only, independent of identity/cookie keys, out of logs
and database settings/backups. The secret derived with HMAC-SHA-256 over
`msrc-ticket-v1:<random UUID>` is reproducible for its owner; PostgreSQL checks its
SHA-256 hash. The token is `msrc1.<UUID>.<secret>`. The short reference is derived
from the UUID. It contains no identity data. Restoring a database does not restore
the application key: the owner must retain it under the existing restricted key
custody process before activation. Missing or wrong keys fail closed. Key rotation,
reissue and reconciliation of pre-migration approvals require a later reviewed
operation, not overwriting the environment key or minting duplicate tickets.

GET `/api/registration/ticket` supplies
`{state:'ready',ticket:null|{status,referenceCode,qrDataUrl}}` with private/no-store
headers after independent server and database checks. Other states are `closed`,
`denied`, `area-not-ready` and `unavailable`; missing migrations preserve the
session. The server validates the exact projection and HMAC, then uses installed
`qrcode` to create a PNG data URL. The EN/AR `/registration/ticket` page displays
the QR, reference, status and registration link. No external QR service, token URL,
analytics event, browser storage or email attachment is used. The data URL itself
encodes a private credential and must be treated accordingly.

Staff queue/detail contracts add `ticketStatus: null|'issued'|'revoked'`, with
missing old-schema fields normalized to null. Staff never receive a ticket ID,
secret hash, token or QR. EN/AR queue rows and details show issued/revoked badges.

The request trigger atomically enqueues the five v1 DRAFT templates documented
in [REGISTRATION_EMAILS.md](REGISTRATION_EMAILS.md): submission receipt, seat
approved, offered (including auto-pass), waitlisted, offer expired. Stable request
event keys deduplicate retries; offer keys additionally identify their deadline.
An exception/rollback removes the request transition, ticket and queued message
together. The generic outbox enqueue RPC remains synthetic-only. Registration
recipients come from Auth, not browser input; all automated tests use
`@example.invalid`. Queued does not mean sent or delivered.

O10 GET uses the existing authenticated drain, with no work while delivery is off.
The source cron is daily for the unresolved Vercel plan; a five-minute schedule
requires confirmed Pro/Enterprise before live activation. All delivery switches
remain off and both caps remain zero. Full wording, plan constraints, environment
names and activation checks are in the email note. Task 4 below adds offer
acceptance using the same issuance/enqueue transaction.

Check-in remains later work. A scanner must verify the secret hash **and** live
ticket revocation, registration entitlement, account authority and assigned
activity/day before admitting anyone. No public verification RPC or permissive
stub is added here. A QR image, signature or staff indicator alone is not check-in
validation. CI database, real inbox and device/UAT evidence remain release gates;
see the [Task 3 receipt](../progress/2026-10-20-codex-registration-slice4.md).

### Task 3 fixture review — 20 October 2026

The native participant guard forbids clearing a verified mailbox, including
during a pending verification operation. The ticket/email pgTAP case now creates
a never-verified signup through `registration_fixture(..., false)`. It verifies
RPC submission denial, then attempts an otherwise valid direct request insertion
to exercise the event trigger's independent recipient check (`P0002`). The
statement rolls back; request, ticket, message and deduplication checks prove
there are no business side effects. The existing approval enqueue-failure test
continues to cover approval/ticket rollback. REG-02/07 and EML-03/04 are preserved.

Static review covered the new early-access, settings and ticket/email SQL suites,
the other three changed registration SQL suites, their shared fixture helper,
the full changed staff-registration integration suite and direct Auth updates in
the remaining integration fixtures. No other blocked fixture step was found.
The six changed SQL suites all use `no_plan()` and one `finish()`, including
the loop-generated assertions; no fixed plan count needs adjustment.
Production guards and migrations are unchanged. Local lint, typecheck and all
3,171 unit tests pass; pgTAP and database integration execution remain pending
disposable Supabase CI.

## My registration (Task 4 / ENG-055)

`/[locale]/registration` renders the signed-in participant's current request on
the server, with EN/AR status text, full RTL and mobile controls. The existing
closed public journey remains when the runtime/account registration gates are
off. My MSRC links to this screen when the runtime registration gate is enabled.
No flag is enabled by this task.

The own view distinguishes not requested (scheduled, early-access eligible or
not eligible, open, closed), pending approval, waitlisted, offered, approved,
cancelled and expired. Existing confirmed and payment-pending records have safe
explicit presentation; this task builds no payment action or confirm-seat stage.
No waitlist position is exposed. REG-05 authorizes capacity status, whereas
WKS-01's exact workshop counts do not authorize general registration counts.
Only `fewPlacesLeft` leaves the server, true when the configured threshold is
non-null and remaining seats are at or below it. Approved/confirmed views use
Task 3's private PNG QR and reference; cancelled/expired views expose no QR.

Review-only migration:
`20261020150000_participant_registration_self_service.sql`.
New service-role-only RPCs (all return `jsonb`):

```sql
msrc_registration_me(edition_key text, session_claims jsonb)
msrc_registration_accept_offer(edition_key text, session_claims jsonb,
  request_id uuid, operation_id uuid, ticket_secret text)
msrc_registration_decline_offer(edition_key text, session_claims jsonb,
  request_id uuid, operation_id uuid)
msrc_registration_cancel(edition_key text, session_claims jsonb,
  request_id uuid, operation_id uuid)
```

Own status returns only `state`, `request:{id,status,createdAt,offerExpiresAt}|null`,
`window:{state,eligible,opensAt}`, `fewPlaces` and `serverNow`. HTTP handlers
keep the database request ID private and resolve it themselves before mutations.
Clients cannot choose an actor, session, request, ticket secret or target state.
The mutation returns `updated`, `expired`, `conflict`, `closed`, `denied` or
`area_not_ready`. An immutable, forced-RLS `participant_operations` table binds
each operation ID to edition, verified actor, request and action; reuse with a
different action conflicts. No API role receives direct table access.

Acceptance runs under the shared edition settings lock and checks actual database
time after waiting; only a live offered free seat can become approved. The existing
trigger issues one ticket and enqueues `registration_approved` in that same
transaction. Decline cancels an offered request; self-cancel accepts pending,
waitlisted, offered and approved states after an explicit UI confirmation. Both
record a fixed participant reason in the audit. Cancelling an occupied seat
revokes the ticket and offers only the released seat to the next waitlisted
request in `created_at,id` order, using the same helper as expiry. Pending and
waitlist cancellation do not allocate a seat. Cancellation emits the sixth v1
DRAFT English template, `registration_cancelled`. Failures roll back the action,
audit, ticket, operation receipt and outbox changes together.

Status reads can expire the current participant's elapsed offer and hand on that
seat after exact-session and ownership checks. They cannot expire another
participant's offer. A countdown is rendered from `serverTime` and advances with
a monotonic display clock; zero requests a fresh server status and never changes
entitlement locally. Existing request management and ticket viewing survive the
submission closing time or incomplete submission settings. Independent runtime,
database, participant/privacy, age and exact-session gates continue to apply.

GET/POST `/api/registration/me` use private/no-store responses. GET returns
`MyRegistrationResponse`: ready data (`registration`, `window`, `fewPlacesLeft`,
`serverTime`, `formToken`, `ticket`) or closed, denied, area-not-ready, unavailable,
invalid_input or limited. POST accepts exactly
`{action:'accept'|'decline'|'cancel', operationId, formToken}`. The action token
is origin/actor/session-bound with a fixed 30-minute expiry and is separate from
the collection form's anti-bot token. Existing participant mutation rate limits
apply. Success returns a new canonical ready snapshot; conflict/expiry returns
that snapshot with `outcome` and HTTP 409. Missing RPCs preserve a valid login
and display area-not-ready, including the earlier collection/ticket handlers.

Verification and blockers: [Task 4 receipt](../progress/2026-10-20-codex-my-registration.md).
No hosted migration, settings seed, workflow activation, email delivery, branch,
commit or push was performed. The current Supabase
[function security and execution guidance](https://supabase.com/docs/guides/database/functions)
was checked for explicit grants and empty search paths. CI database evidence,
owner wording/Arabic review and all existing activation gates remain required.

## Complete staff request history — ENG-057 / Night-2 ACD, 22 October 2026

Review-only migration `20261022120000_staff_registration_complete_history.sql`
replaces `public.msrc_staff_registration_detail(edition_key text, request_id uuid)`
(returns `jsonb`) without widening its registration-administrator / Super Admin
authorization. The existing expiry sweep and settings lock remain; READ COMMITTED
is checked at function entry. Missing functions and older detail RPCs show
`area-not-ready` and preserve the staff session.

The RPC now returns `historyVersion: 1` beside `state` and `detail`. Each history
row contains `{id, event, actorKind, from, to, at, performerName}`. `event` is one
of `request.submitted`, `request.approved`, `request.waitlisted`, `request.offered`,
`request.offer_expired`, `request.offer_accepted`, `request.offer_declined`,
`request.cancelled`, `ticket.issued` or `ticket.revoked`. `actorKind` is
`participant`, `automatic` or `staff`; only staff actors carry `performerName`.
Submission and ticket events retain null `from`/`to` values. The projection
rejects unknown fields, invalid transitions, mismatched actor kinds, duplicate
IDs and out-of-order timestamps. The private EN/AR timeline labels every event
and actor, including automatic offers, with newest events first.

Ticket lifecycle changes previously retained timestamps in `tickets` but emitted
no registration audit row. A private `ticket_audit_event()` trigger now writes
issuance/revocation audit evidence in the same transaction, with automatic actors
and exactly the ticket's stored timestamps. A unique request/event index prevents
duplicate ticket evidence. The migration also backfills these two facts for
existing tickets from `issued_at` and `revoked_at`. It does not infer historical
request states, staff names, credential values or notification events. This
backfill is an owner review point before any separately authorized hosted replay;
it issues no tickets and enqueues no messages. Identity/credential fields remain
excluded from detail and history.

Coverage adds complete synthetic lifecycle pgTAP, rollback, immutable/deduplicated
ticket evidence, role/target filtering, exact timestamps and ordering. Existing
CI concurrency cases now assert one ticket audit per competing approval or
cancellation. Additional CI cases check the isolation guard before early returns
and replay the migration's actual backfill statements twice against synthetic
pre-audit tickets, checking exact timestamps and unchanged business/outbox data.
The EN/AR browser detail test covers every label, actor, RTL,
overflow and axe. Database execution and database lint remain CI-only because
this checkout has no local Docker. No hosted migration, settings seed, participant
opening, feature activation or real email is part of this change.
