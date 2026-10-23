# O9 — Placeholder email banner and announcement retention, 23 October 2026

Branch: `claude/banner-retention`. Initial worktree clean. ORG-061/ENG-070 were
the highest used numbers; ORG-062 and ENG-071 are appended to DECISIONS.md.
Requirements: EML-01–05, LOC-01/03, PRV-03/05/06, SEC-01/02/06 and ACC-01.
PROGRESS.md is unchanged. Local commit authorized; no push, hosted migration,
settings seed, real email, participant opening or feature activation.

## Changes

- `scripts/build-email-banner.mjs` and `public/brand/email-banner.png`: plain
  600×338 PLACEHOLDER, purple/gold read from tokens.css, existing conference name,
  no photo, people or invented logo. Generated with installed sharp; visually
  inspected. Official art can replace this single PNG at the incumbent URL.
- `src/lib/email/participant-message.server.ts` and
  `src/features/announcements/staff-panel.tsx`: alt text `MSRC 2027`.
  Registration snapshots and `tests/staff-e2e/fixtures/email-previews.json`
  updated for the alt text only. Approved English bodies/legal text untouched.
- `src/features/announcements/staff-copy.ts`: clear EN/AR account label and
  explanation, including accounts without conference registration. Existing
  `verified_participants` key preserved for stored drafts/contracts.
- `src/lib/jobs/announcements.server.ts`: optional typed retention counts,
  strictly bounded and counts-only; older successful response still accepted.
  Missing-RPC `area-not-ready` fallback preserved.
- `docs/features/REGISTRATION_EMAILS.md`, `docs/MEDIA_REGISTER.md`,
  `docs/features/ANNOUNCEMENTS.md` and `docs/DECISIONS.md`: placeholder, audience,
  retention and independent outbox policy recorded.
- Tests: `tests/unit/email-banner.test.ts`,
  `tests/unit/announcement-maintenance.test.ts`, staff announcement/email-preview
  Playwright assertions, `supabase/tests/database/announcements.test.sql`,
  `supabase/tests/database/announcement-retention.test.sql`, and
  `tests/integration/announcement-concurrency.test.ts`.

## Migration and contracts

Pending migration: `20261023160000_announcement_retention.sql`; depends on the
existing pending announcements migration and preceding repository chain.
Not applied to hosted. Supabase CLI migration creation was attempted but failed
writing telemetry outside the writable workspace, even with telemetry disabled;
the SQL file was created directly after that failure.

Existing signatures preserved:

- `public.msrc_announcements_maintenance(edition_key text) returns jsonb`
  (service-role only); adds optional `retention` counts to the response.
- `msrc_announcements.audience(edition text)` returns
  `table(segment text, actor_id uuid, email text)`; global segment now includes
  every verified, undeleted, nonanonymous account with an outbox-valid address,
  including staff, signup-only and suspended accounts. Other segments preserve
  active-access checks. No participant profile/registration is required globally.
- New private `msrc_announcements.purge_retained(edition text) returns jsonb`.
  Private `retention_authorized(target uuid) returns boolean` and trigger guards
  support deletion; none is granted to API roles. Two forced-RLS tables hold
  transient transaction-bound targets and append-only counts-only purge receipts.

Expiry is strictly `now() > (max(conference_days)::timestamp + interval '1 year')
AT TIME ZONE 'Asia/Riyadh'`. Missing days purge nothing. Existing maintenance
calls retention before dispatch, under the same edition advisory lock; a settings
row lock protects against concurrent conference-day edits. Expired editions do
not dispatch scheduled announcements. Each run deletes at most 20 parents and
500 rows per inbox/recipient/operation table; parents wait for children. A
private transaction capability is removed before returning. Direct deletion,
updates to frozen snapshots and truncation remain denied. Outbox messages,
provider requests and tombstones follow their existing independent policy;
existing announcement audit history remains immutable. Existing runtime/outbox
maintenance gates still apply. No new scheduler.

## Verification

PATH starts with `C:\m\tools\bin`. Logs/screenshots are under ignored `.tools/`.

- PASS: `node scripts/build-email-banner.mjs`; visual inspection of raster and
  Arabic mobile announcement composition, including the longer label and banner.
- PASS: `pnpm lint` (zero warnings) and `pnpm typecheck` (route generation + tsc).
- PASS: `pnpm exec vitest run`: 106 files, 4,661 tests.
- PASS: `pnpm build`, including a successful final rebuild after the maintenance
  decoder change.
- PASS: full `pnpm exec playwright test -c playwright.staff.config.ts`:
  356 passed, 12 intentionally skipped, zero failures (9.8 minutes).
  Windows server teardown required stopping this run's two known web-server
  processes after all tests completed; runner then exited zero. An initial
  focused-run attempt before that cleanup failed because port 3220 was still
  occupied; the clean rerun below is the final result.
- PASS: focused final-build `pnpm exec playwright test -c
  playwright.staff.config.ts tests/staff-e2e/email-previews.spec.ts
  tests/staff-e2e/announcements.spec.ts`: 38 passed, 2 intentional desktop
  skips, zero failures. EN/AR desktop/mobile, axe, exact banner dimensions/alt,
  explicit audience hint, missing-migration/session and permission regressions.
  The same Windows teardown cleanup was needed after every test completed.
- PASS: final `pnpm lint`, `pnpm typecheck` and `git diff --check`.
- BLOCKED: requested `git checkout -- .impeccable/review/` hits the same Git
  metadata permission denial as staging. No review screenshots were regenerated:
  `git status --short .impeccable/review` is empty. New screenshots stay in `.tools/`.
- BLOCKED: local pgTAP, strict database lint and integration execution: no local
  Docker. Prepared 25 retention pgTAP assertions, updated audience assertions,
  and two new real concurrent-transaction cases (purge/purge and date extension).
  These are unexecuted CI proofs, not database PASS claims.

## Owner / Claude review

No new policy question remains. Review pending SQL/ACLs/trigger capabilities and
execute the migration chain, strict lint, pgTAP and integration races in disposable
CI before owner-approved hosted application. Review native Arabic and the
placeholder/bilingual DRAFT composition before sending. The one-file official
banner replacement remains pending the organizer-supplied asset. Existing
outbox/runtime gates and bilingual wording approval remain closed.

Local commit is **BLOCKED** by filesystem permissions: `git add --
scripts/build-email-banner.mjs` failed to create
`C:/m/msrc/.git/worktrees/codex-n8/index.lock` (Permission denied). This
worktree's Git metadata is outside the permitted writable root. No staged
changes, commit or push were made. Claude must stage and commit the reviewed
changes on the existing branch from a session with Git metadata write access.
