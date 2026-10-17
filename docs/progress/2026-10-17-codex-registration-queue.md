# ORG-055 — staff registration queue backend, 17 October 2026

Backend implementation on existing `codex/registration-queue`; no commit, push or
branch created. Initial worktree clean. Actual HEAD and remote main were both
`3ac79d91e6e3d9c38760998e1963b9e4b5d9028b`, ahead of the supplied `148ac5f`
snapshot. Verified with `git rev-parse HEAD origin/main` and
`git -c http.sslBackend=openssl ls-remote origin refs/heads/main`; the ordinary
Schannel remote probe failed with `SEC_E_NO_CREDENTIALS`. ENG-049 was free and is
recorded in DECISIONS. Claude records ORG-055 and owns the parallel console UI.
This is the O9 receipt; `docs/PROGRESS.md` was not edited.

Requirements: REG-01–08, ADM-01/02/04/05, ROL-07/10/12, PRV-03/05/06,
SEC-01/02/06, LOC-01/03; existing ORG-051 and ENG-043/044/046 boundaries retained.

## Implemented

- Exact requested UI types/actions/fields in `ui-contract.ts`; optional registration
  status filter in GET; both requested `query` and incumbent `q` search supported.
  Reject duplicate parameters, both aliases together, invalid status, malformed
  UUIDs, duplicate IDs and batches outside 1–100. Existing origin/CSRF, native
  identity, exact session, current-role and private/no-store boundaries remain.
- Queue/decisions require registrar or Super Admin at server and database layers.
  Priority list/candidates/set/remove require Super Admin. Existing priority setter
  receives only claims from the verified native exact-session TOTP identity,
  through its existing service-role transport; browser metadata is not forwarded.
- Strict response projections validate fields, masks, counts and batch totals.
  Summary only includes areas the current caller may read. Masked identity stays
  masked; the reasoned, audited Super Admin reveal path is unchanged.
- One additive migration, `20261017120000_staff_registration_queue.sql`, adds
  `decided_at`, checked audit transitions, five authenticated RPCs and two private
  ungranted helpers. Existing forced RLS and no table grants remain. All functions
  pin an empty search path. Existing staff audit now includes registration events,
  with all six registration event labels in EN/AR.
- Approval locks the edition settings row, then counts all held seats and processes
  selected eligible requests oldest first (`created_at,id`). Seat holders:
  `approved`, `approved_awaiting_payment`, `offered`, `confirmed`. An existing offer
  conservatively holds a provisional seat; none is created here. Overflow and
  ineligible/other-edition/unknown IDs are skipped, without implicit waitlisting.
  Repeated decisions preserve timestamps and audit. Waitlist only moves pending.
- Allocation requires READ COMMITTED and rechecks session authority after waiting
  for settings. Explicit free configuration yields `approved`; paid configuration
  yields `approved_awaiting_payment` plus the existing configured payment window.
  Null capacity and incomplete payment settings return explicit safe states.
  Expired deadlines do not silently release capacity in this slice.
- No notification is sent or enqueued. The outbox supports only synthetic notices
  and recipients today. Reviewed business templates and atomic approval/waitlist
  notification enqueue are slice 4; timed offers need approved duration/release
  semantics. All participant and delivery switches remain unchanged/closed.

## Database contract

| RPC | Arguments | Result |
| --- | --- | --- |
| `msrc_staff_registration` | `edition_key`, `search=''`, `status_filter='all'` | `state:'ready', registration:{requests,counts}` |
| `msrc_staff_registration_approve` | `edition_key`, `request_ids:uuid[]` | `state:'updated', decided, registration` or safe configuration/denial state |
| `msrc_staff_registration_waitlist` | `edition_key`, `request_ids:uuid[]` | `state:'updated', decided, registration` |
| `msrc_staff_priority` | `edition_key`, `search=''` | `state:'ready', priority:{designations,candidates}` |
| `msrc_staff_summary` | `edition_key` | `state:'ready', summary` with role-filtered counts |
| Existing `msrc_registration_priority_set` | `edition_key`, `session_claims`, `target_actor`, `active`, `reason` | `state:'updated'` or denied |

The staff HTTP API returns `authenticated` for successful area GETs, as before;
`updated` for mutations. Missing capacity is HTTP 409 `capacity-not-set`; missing
free/paid choice or required paid window is HTTP 409 `payment-configuration-required`.
`counts.approved` includes all four seat-holding states, `remaining` is clamped at
zero or null if capacity is unset. Lists cap at 50; counts are unfiltered totals.
Mutation responses contain an unfiltered list, so the UI must reload its selected
status/query after a decision. Other authorized staff receive an empty summary,
not invented zero counts for areas they cannot read.

## Verification receipts

All commands prepend `C:\m\tools\bin` to PATH, using pinned Node 24 / pnpm 11.19.0.

| Command/check | Observed result |
| --- | --- |
| `pnpm install --frozen-lockfile` (first command) | PASS; lockfile up to date, already installed, no dependency/lockfile changes |
| `pnpm exec eslint . --max-warnings=0` | PASS; zero diagnostics |
| `pnpm exec vitest run tests/unit/staff-registration-queue.test.ts` | PASS; 90 new queue/priority/summary/security tests |
| Audit label tests | PASS; 57 cases, including EN/AR registration enum coverage |
| `pnpm test` | PASS; 2,893 tests across 68 files, zero failures/skips |
| `pnpm typecheck` | FAIL; nine errors in existing UI contract consumers only, detailed below; no backend/new test diagnostics |
| `pnpm build` with `.next` absent | FAIL; production compilation succeeded (12.3s), TypeScript then failed on the same nine UI consumer errors; no completed production build |
| `git diff --check` | PASS; no whitespace errors |
| Migration application / pgTAP / `supabase db lint --fail-on warning` | BLOCKED locally; Docker/Supabase unavailable; 121 assertions authored, zero executed locally |
| CI-only staff registration integration | BLOCKED locally; two cases authored, zero executed locally |
| Staff browser/UI/native UAT | NOT TESTED; Claude owns changing UI and existing staff e2e specs; no screenshot files rewritten |
| Hosted DB/configuration/production/CI | NOT TESTED; no hosted changes or CI submission performed |

Direct recursive deletion of the verified workspace `.next` path was rejected by
tool policy. A reversible alternative succeeded: moved it to the previously absent,
ignored `.tools/registration-queue-next-backup` directory, then built with no `.next`.
The ignored old cache backup remains. No deletion was attempted outside the
workspace. A delegated Supabase CLI help call also failed while trying to write
telemetry outside the permitted workspace; the explicitly requested migration was
created directly, and no database execution is claimed.

The pgTAP suite covers forced RLS/ACLs; anonymous/participant/reviewer/finance
denial; correct registrar email assurance and Super Admin TOTP; exact-session and
edition checks; closed participant registration; missing configuration; oldest
eligible allocation, all four seat states, full-row no-op replay, waitlisting,
paid deadlines, audit, reasoned priority changes, private candidate searches,
50-row limits and aggregate totals. Prepared assertion count is 101 top-level
assertions plus 20 returned by the denial matrix.

The integration suite requires an unlinked Linux GitHub CI loopback stack and a
dedicated cold reset, added with insertion-only changes to `.github/workflows/ci.yml`.
First test holds a successful last-seat approval transaction, observes the competing
approval actually blocked on a database lock, then explicitly releases it and checks
exactly one durable seat/audit. Second test observes an authorized registrar waiting,
shortens disposable session policy to expire the session, releases the lock and
checks denial with no allocation. It settles transactions and restores policy in
cleanup. Fixed release sleeps were replaced after static review; retries/timeouts
were not increased. Existing workflow lint steps already cover public/private
registration and outbox schemas.

## Required UI handoff and next work

The exact expanded contract deliberately remains intact. Do not weaken its types
to make this backend-only branch build against the old UI.

1. `copy.ts:21,40`: EN/AR navigation objects need `priority`; their current
   `StaffMenuKey` type also inherits `summary`. In `menu.ts`, exclude `summary`
   from menu keys because it is the home aggregate area, or deliberately supply
   matching labels. Add registration/priority screen headings in EN/AR.
2. `staff-portal.tsx:176,206`: render the new screens and index only complete
   heading/navigation dictionaries. These type gaps also surface at existing
   `tests/staff-e2e/staff-portal.spec.ts:292` (two diagnostics) and
   `tests/unit/staff-portal-menu.test.ts:26`. These files were not edited here.
3. `staff-client.ts`: extend GET options with optional
   `status?: StaffRegistrationStatus | 'all'` and forward it for registration.
   Show `capacity-not-set` / `payment-configuration-required` responses; preserve
   selection/filter behavior after mutation and display per-action skipped counts.
4. Merge the parallel UI work locally, rerun lint/types/tests/build and UI EN/AR/RTL
   checks, then run disposable CI pgTAP/lint/concurrency. Keep production gates
   closed. Follow with slice 4 reviewed notification templates/transactional enqueue;
   no timed offers, export or participant activation is authorized by this receipt.
