# Task n11 — Workshop booking — 24 October 2026

Decision **ENG-074**. Requirements **WKS-01–07**, related **CHK-03/04**, **CRT-01**
evidence and **PRG-01**. Worktree `C:\m\codex-n11`, existing branch
`claude/workshop-booking`. All changes are uncommitted. `docs/PROGRESS.md` is
unchanged. No branch, commit, push, hosted migration/settings, production flag,
participant opening or real email action was performed.

## Starting audit and chosen scope

Read AGENTS, PROJECT_BRIEF, DECISIONS, PROGRESS, DESIGN_GUIDE and the relevant
v0.5 requirements. The worktree initially had no changes. Node **24.21.0** and
pnpm **11.19.0** match the repository engines; no dependencies were installed.

Workshop code was an inert feature README and an empty public catalogue.
`PublicWorkshop` and the existing rail already provided the public presentation.
CMS workshop-type programme sessions are editorial records, not allocations.
Registration already supplied manual decisions, service-only participant claims,
native staff assurance, FCFS offers, mock/discount boundaries and held outbox
patterns. `20261022130000_checkin_attendance.sql` records conference-day evidence;
workshop check-in/completion remain separate activity evidence.

Priority order: implement scarce-seat/authority rules in PostgreSQL, connect
bounded participant/staff projections and missing-migration readiness, then add
permission, failure, overlap, expiry, concurrency and bilingual UI checks.
No operational date, price, capacity, person or policy value was inferred from
examples or older plans. All fixture values are explicitly synthetic.

## Implemented

- Additive review-only migration
  `supabase/migrations/20261024120000_workshop_booking.sql`: private
  `msrc_workshops` schema, nullable configuration, default-off booking and mock
  payment switches, forced RLS without client policies, explicit RPC grants,
  empty definer search paths and READ COMMITTED guards.
- Participant mutations reuse registration's locked current-session check,
  including forwarded-claims expiry, native/absolute deadlines and native
  session/state row locks; foreign/expired native sessions have SQL regressions.
- Bilingual workshop records and scoped manager editor. Required unset values
  keep booking closed. Safe draft preparation does not need registration
  settings. Only Super Admins prepare policy; staff RPCs cannot activate closed
  booking/payment switches.
- Server-recorded request order, expiring provisional holds, manual approval
  even for free/full-discount places, mock settlement or authorized full-discount
  validation, then confirmation. Immutable separate order/settlement snapshots
  preserve configured amounts/currency; mock payment collects no money.
- Transactional allocation under registration-policy and workshop-edition locks;
  reservations require a reason/release deadline and count against capacity.
  Capacity/NULL reduction below active allocations is guarded in the RPC and
  by a database trigger.
- Ordered waitlist, expiring offers, acceptance and current eligibility,
  confirmed conference registration and overlap checks. Adjacent slots work at
  an explicitly configured zero buffer. New requests cannot bypass an older
  eligible queue entry after the bounded offer sweep reaches its limit.
- Audited cancellation, removal, time/capacity edits and extensions. Time
  conflicts enter a persistent resolution list; unresolved conflicts block
  confirmation/check-in/completion and future participation evidence. Required
  workshop titles cannot be cleared after booking history exists, preserving
  affected-user notices.
- English `workshop_notice` v1 DRAFT messages queue atomically in the existing
  outbox. SQL delivery hold and the worker independently deny sending, including
  frozen provider snapshots. This is the task's scoped English-email override,
  recorded in ENG-074; other participant templates remain bilingual.
- Existing authenticated outbox drain calls service-only workshop maintenance.
  Expiry does not require a positive email cap; no scheduler was added or enabled.
  Derived expired holds and active-only reservation reads keep counts accurate
  before persistence by maintenance.
- Workshop check-in and separate authorized organizer/assigned-instructor
  completion, staff/server timestamps and workshop counts. Service-only
  `msrc_workshop_completion_evidence(edition_key,actor_id,workshop_id)` exposes
  confirmed-booking/check-in/completion/conflict facts. It neither supplies a
  survey nor grants a certificate or hours.
- EN/AR My MSRC My Bookings: actual requests, holds, approvals, waitlist entries,
  offers, confirmed/terminal records and activity evidence. No schedule builder.
  One durable record per participant/workshop retains terminal history.
- EN/AR staff workshop editor, queue, reasoned decisions/extensions/cancellations,
  reservations, offers, conflict resolution and counts. A dedicated workshop-read
  permission keeps navigation consistent with the independently tested matrix.
  Check-in staff cannot manage admission, bookings, discounts or policy.
- Public published-only live availability without names or login. The safe
  uncached endpoint updates the existing rail after hydration; both public
  workshop pages remain SSG. Missing pending RPCs show area-not-ready and retain
  participant/staff sessions. Strict projections discard/reject private data.
- Browser retries preserve operation IDs on uncertain outcomes. Runtime flags
  are blank in `.env.example`; enabled values exist only in the synthetic
  participant Playwright fixture configuration.

## Verification actually run

| Result | Command / evidence |
| --- | --- |
| PASS | Final `pnpm check`: ESLint without warnings, generated route types and TypeScript, **4,797 Vitest cases in 110 files**, production build with **116 generated pages**. |
| PASS | `pnpm exec vitest run tests/unit/workshop-emails.test.ts tests/unit/workshop-maintenance.test.ts` during implementation; final full suite also includes those cases. |
| PASS | Participant, public projection, staff handler, native-session, CSRF, input/output privacy, missing-RPC, DRAFT-worker and retry tests in the final unit suite. |
| PASS | Independent authorization matrix includes workshop role/scope, wrong-edition, revocation, assurance and separation-of-authority checks. |
| PASS | `pnpm exec playwright test --config playwright.staff.config.ts tests/staff-e2e/workshop-bookings.spec.ts --list`: **16 cases collect**. Collection is not execution. |
| PASS | `pnpm exec playwright test --config playwright.participant.config.ts tests/participant-e2e/workshop-bookings.spec.ts --list`: **32 cases collect**. Collection is not execution. |
| PASS | `git diff --check`; `git diff --exit-code -- docs/PROGRESS.md`; branch remains `claude/workshop-booking`. Generated Next type-reference churn was restored. |
| BLOCKED | `pnpm exec playwright test --config playwright.participant.config.ts tests/participant-e2e/workshop-bookings.spec.ts`: occupied **3216** (`/en/sign-up`), same result on one delayed retry. Other jobs were not stopped and no port/reuse workaround was introduced. |
| BLOCKED | `pnpm exec playwright test --config playwright.staff.config.ts tests/staff-e2e/workshop-bookings.spec.ts`: occupied **3220** (`/health`), same result on one delayed retry. |
| BLOCKED | Local database execution: `docker info --format '{{.ServerVersion}}'` reports Docker is not recognized. As specified by the task, migration reset, `supabase db lint --fail-on warning`, pgTAP and integration races are reserved for disposable Linux CI. They were **not run locally**. |
| NOT TESTED | Screenshot/visual review, actual browser axe/keyboard/mobile/200%-text journeys, physical devices, real inbox and operational UAT. Browser tests could not start; no screenshots are claimed. |
| NOT RUN | Hosted operations and exact-revision CI. This task forbids commits/pushes and hosted execution. |

The first full unit runs exposed four then one integration expectation failures
as the new workshop tool was wired into the staff menu. They were corrected by
adding a dedicated permission rule and updating the independent purpose matrix
and current tool summaries, preserving the existing assertions. Final full
verification passes. Independent SQL review also corrected nullable instructor
authorization after check-in, PL/pgSQL alias ambiguity, bounded-sweep FCFS,
notice-title preservation and draft preparation without registration settings;
pgTAP regressions were added, but execution remains blocked locally.

## Prepared CI evidence

`supabase/tests/database/workshop-booking.test.sql` and its disposable support
fixture prepare 140 assertions for permissions, all required nullable gates, FCFS, holds/expiry,
manual approval/full discount, reservations, adjacent/buffer overlap, offer
acceptance rechecks, capacity guards, immutable audit/order/idempotency records,
removal/change notices and separate check-in/completion/evidence.

`tests/integration/workshop-concurrency.test.ts` adds six deterministic
transaction-barrier cases: last seat, duplicate operation, overlapping requests
by one participant, request after concurrent conference cancellation, revoked
staff native assurance while waiting, and capacity reduction after allocation.
They refuse hosted/non-loopback/non-Linux/non-disposable configuration. The
Foundation workflow adds a cold reset and explicit `WORKSHOP_DB_TESTS=true`
command, and strict lint includes `msrc_workshops`.

The existing Participant and Staff workflows discover the new EN/AR browser
files automatically. Screenshot output `.tools/workshops/` is included in their
CI artifact upload. Test collection confirms 48 cases across desktop, tablet and
phone projects, including anonymous public counts, unset draft fields, holds,
waitlist/offers, approval/mock payment, reasoned staff actions, conflict handling,
independent completion, retry identity, RTL, axe and enlarged text.

## Remaining blockers and next work

1. Claude should review and commit the uncommitted slice, then obtain disposable
   CI migration/lint/pgTAP/concurrency and browser receipts. Any SQL or browser
   failure remains unresolved until that execution; static review/unit tests
   do not prove PostgreSQL behavior or rendered layout.
2. Review captured EN/AR desktop/phone screenshots and complete keyboard,
   enlarged-text, device and human workflow UAT when the fixed ports are free.
3. Keep all workflows closed. A separate authorized release still needs actual
   workshop metadata, approval/payment/offer windows and eligibility policy,
   instructor authority, template approval and independent activation gates.
   Workshop survey and certificate issuance are future modules.

Feature detail: [WORKSHOP_BOOKING.md](../features/WORKSHOP_BOOKING.md).
