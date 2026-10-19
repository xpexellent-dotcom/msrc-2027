# Registration slice 3b — staff backend, 19 October 2026 (O9)

Implementation on the existing `codex/registration-slice3b` branch in
`C:\m\codex-slice3b`, initially clean at
`c99a08f836ae1ed240cc0d51e4bd895e404ae374`. All changes remain uncommitted.
ENG-050 is appended to DECISIONS. Claude owns console UI integration; no `.tsx`,
`copy.ts`, `console-copy.ts`, `src/styles` or `docs/PROGRESS.md` edits are part of
this backend task. No hosted migration/settings, participant opening, real email,
branch, commit or push was performed.

Requirements: REG-01–08, ADM-01/02/04/05, ROL-07/10/12, PRV-03/05/06,
SEC-01/02/06, TIM-01/02, LOC-01/03. Preserve ENG-043/044/046/049 and existing
server/database authorization, forced RLS, private projections and session gates.

## Backend and database contract

One pending migration:
`supabase/migrations/20261019120000_staff_registration_offers_export.sql`.
It follows `20261017120000_staff_registration_queue.sql`; earlier migrations are
unchanged. All new public RPCs return `jsonb` and recheck current staff authority.

| RPC signature | Result |
| --- | --- |
| `msrc_staff_registration_detail(edition_key text, request_id uuid)` | `state: 'ready', detail: { request, history }`, or `denied` |
| `msrc_staff_registration_offer(edition_key text, request_ids uuid[])` | `state: 'updated', decided: { approved: 0, waitlisted: 0, offered, skipped }, registration`; safe configuration/denial state otherwise |
| `msrc_registration_expire_offers(edition_key text)` | `state: 'updated', expired: number`, or `denied`; only elapsed nonnull offered deadlines transition |
| `msrc_staff_registration_export(edition_key text)` | `state: 'ready', rows` for all edition requests, with audited row count; Super Admin only |

Offer allocation requires READ COMMITTED, acquires the same edition settings row
lock as approval, rechecks staff authority after waiting, then processes selected
eligible requests by `created_at,id`. Nullable `offer_window_hours` has no default
or backfill, including from reserved `waitlist_offer_hours`. Null returns
`offer_window_not_set`, mapped to HTTP 409 `offer-window-not-set`. No approved
duration or release policy is inferred.

Expiry is an audited `offered` → `expired` transition under that lock; repeat
expiry leaves timestamps and audit unchanged. Expiry runs before relevant staff
reads/counts and allocation. Released seats are not automatically offered to the
next person. Legacy offers with null expiry retain their seats. Payment deadlines
are unchanged. There is no scheduler, participant acceptance (slice 5), or email/
outbox producer (slice 4).

Detail exposes the queue's masked request plus immutable transition history,
newest first. Export exposes only name, email, status, priority, created/decided
timestamps and masked identity. It never retrieves/decrypts ciphertext. Every
successful export writes `registration.exported` with row count. New transition
events and export have EN/AR audit labels. Existing audited reveal is unchanged.

## HTTP/UI integration

- GET `?area=registration-detail&requestId=<uuid>` returns
  `registrationDetail: { request, history }`. Missing/other-edition requests are
  denied without confirming existence. Reject missing/malformed UUIDs, duplicate
  parameters, and unrelated search/status parameters.
- POST `registration-offer` uses existing CSRF/origin/session safeguards and
  1–100 distinct UUID `requestIds`, with the existing optional status filter.
  Refresh the active query/filter after its unfiltered mutation response.
- GET `?area=registration-export` returns a CSV attachment for a TOTP-valid Super
  Admin. Other roles get 403. Headers: `text/csv; charset=utf-8`, attachment
  filename and `Cache-Control: no-store`; body starts with UTF-8 BOM. Quote/escape
  every cell and prefix `'` to values starting `=`, `+`, `-`, `@`, tab or CR.
- Missing read functions return HTTP 503 `area-not-ready`; the staff session is
  retained. Render the new HTTP 409 `offer-window-not-set` state in EN/AR. Older
  queue projections normalize absent new counts to zero and expiry to null;
  unexpected fields or malformed masks remain rejected.
- `approved` remains the total number of seat holders, including `offered`.
  `offered` is a subset; do not add them. `expired` is a non-seat-holding total.
  Display database UTC deadlines in Asia/Riyadh with its timezone label.

## Verification

Commands use `C:\m\tools\bin` first on PATH: observed Node `v24.21.0` and pnpm
`11.19.0`. Logs are retained locally under `.tools/registration-slice3b/`.

| Check | Result |
| --- | --- |
| `pnpm lint` | PASS, exit 0; no lint warnings/errors |
| `pnpm typecheck` | PASS, exit 0; route types generated and TypeScript clean |
| `pnpm exec vitest run` | PASS, 2,977 tests in 68 files; exit 0 |
| `git diff --check` | PASS, exit 0 |
| pgTAP, strict database lint, database concurrency | BLOCKED locally: no Docker/local Supabase; disposable CI required |
| UI/browser and human UAT | NOT TESTED by this backend task; planner integration required |
| Hosted migration/production verification | NOT TESTED / not authorized by this task |

The targeted handler/audit/backend/session-hardening run also passed 373 tests in
four files. Coverage includes all-role denial, UUID/batch validation, missing-RPC
fallback, 409 mapping, masked detail/history, Arabic CSV/BOM/headers, all six
formula prefixes, embedded quotes/newlines, more than 50 export rows, empty
exports, rejected unexpected/plaintext fields and refreshed session cookies.

The new pgTAP specification covers every current role, exact-session/TOTP
assurance, private grants, null/no-default duration, oldest-first allocation,
capacity, immutable transition history, repeat expiry, count freshness, no
automatic offer/email, and all-row masked export with immutable row-count audit.
Eight additional cases use the existing CI-invoked concurrency file: offer/offer
last-seat contention, expiry/reallocation, offer/approval contention, session
expiry while waiting, isolation refusal, and queue/detail/summary lock ordering.
These SQL/concurrency assertions are prepared, **not locally executed**.

Review caught a lock inversion introduced by entering expiry after initial
session authorization. Queue/detail/summary now acquire the shared staff-authority
lock before authorization can lock account/session rows. The new contention
proofs hold exclusive authority and check that the waiting reader has not locked
the actor account. Replaced functions and tests were independently reviewed.

An initial typecheck exposed the new API areas being included in `StaffMenuKey`
and older typed browser fixtures lacking additive fields. A type-only `menu.ts`
exclusion keeps detail/export out of navigation, and fixtures now include zero
counts/null deadlines. The final full checks above pass after these corrections.
No component, style or copy file was edited. `backend.server.ts` is unchanged:
its existing `msrc_staff_*` allowlist already accepts the three handler-called
RPCs, and expiry executes within database functions.

## Changed files

- `supabase/migrations/20261019120000_staff_registration_offers_export.sql`
- `supabase/tests/database/staff_registration_offers_export.test.sql`
- `supabase/tests/database/staff_registration_queue.test.sql`
- `src/features/staff-portal/handler.server.ts`
- `src/features/staff-portal/registration-contract.server.ts`
- `src/features/staff-portal/validation.server.ts`
- `src/features/staff-portal/ui-contract.ts`
- `src/features/staff-portal/audit-labels.ts`
- `src/features/staff-portal/menu.ts` (type-only API-area exclusion)
- `tests/unit/staff-registration-queue.test.ts`
- `tests/unit/staff-audit-labels.test.ts`
- `tests/integration/staff-registration-concurrency.test.ts`
- `tests/staff-e2e/staff-console.spec.ts` (typed fixture fields only)
- `docs/DECISIONS.md` (ENG-050 appended)
- `docs/features/REGISTRATION.md`
- `docs/progress/2026-10-19-codex-registration-slice3b.md` (this O9 receipt)

Next: combine with Claude's console UI, run disposable Linux CI pgTAP/strict lint/
concurrency and EN/AR UI verification. Organizer offer duration/release behavior,
slice 4 notifications, slice 5 acceptance and all existing activation gates remain
open prerequisites. A source implementation and unit checks do not open registration.
