# Announcements execution receipt

Date: 23 October 2026. Worktree: `C:\m\codex-emails`.
Branch: `claude/bilingual-emails`; starting commit `f6388cf`.
Decisions recorded: ORG-061 and ENG-070 (highest prior IDs: ORG-059, ENG-067).
Requirements: EML-01–05, LOC-01/03, ACC-01, ROL-10/12, PRV-03/05/06,
SEC-01/02/06 and AT-16. `docs/PROGRESS.md` was not edited.

The specific task overrides the common uncommitted-only rule and authorizes a
local commit on the existing branch, without push. The commit is BLOCKED:
`git add -- src/features/announcements` failed because this sandbox cannot create
`C:/m/msrc/.git/worktrees/codex-emails/index.lock` (`Permission denied`). Git storage
is outside the writable workspace. No staging, commit or push occurred; Claude
must commit the preserved files. No hosted migrations, seeds, settings, flags,
participant opening, new scheduler, real email or push are authorized/performed.

## Implemented behavior

- Only an exact-session, TOTP-assured Super Admin can manage announcements.
  The tab, server handler and database independently restrict access.
- EN/AR composition, live structured email preview using the existing frame,
  exact shared renderer HTML/plain-text preview, masked segment counts, explicit
  exact-count dialog, optimistic edits, operation-ID sends/schedules/cancels,
  safe uncertain-send retry and outbox-backed history.
- One materialized live audience is compared with the preview token and frozen
  atomically with one outbox message and one inbox row per unique account.
  Immutable recipient/audit/operation records prevent history rewriting.
- Due schedules use the existing authenticated outbox drain. Audience changes or
  lost author authority return them to draft for review. Editing a schedule clears
  its previous authorization, token and time and requires a fresh preview.
- A private, server-rendered My MSRC inbox shows the current locale first, native
  disclosure for the other language, paragraphs, Riyadh dates and private read
  state. Reading and language disclosure work without JavaScript. Marking read is
  optional JavaScript with session-bound CSRF, origin checks and rate limits.
- Missing pending RPCs produce area-not-ready and preserve the existing session.
- `announcement` v1 reuses the existing banner/bilingual renderer, English then
  Arabic. The layout is DRAFT: SQL holds and a worker gate prevent delivery.
  Technical bounds are 90 UTF-16 units per subject and 3,500 per body, matching
  database and server validation and the existing 64 KiB provider snapshot.
  No unsubscribe, preference storage, tracking, SMS, WhatsApp or push is added.

Signup profiles are global and create no edition membership or participant role
grant. Therefore the literal “all verified participants” segment includes all
verified participant accounts, including signup-only accounts. Business and staff
segments use the selected edition. An optional owner clarification was requested;
this explicit assumption does not invent membership records. Empty data sources
are not offered. Accepted-presenter status is written by published decisions only.

The existing CSP forbids embedded frames. The staff email preview follows the
existing escaped React preview frame, with exact renderer source/plain text
available privately; it does not relax CSP or execute received email HTML.
ORG-057 English wording, public legal text and prior migrations are unchanged.

## Migration and contracts

New pending migration: `supabase/migrations/20261023145926_announcements.sql`,
created with the installed Supabase CLI `migration new` command. Private schema
`msrc_announcements`: `announcements`, `recipients`, `inbox`, `operations`, `audit`.
All five tables force RLS; API roles have no direct schema/table access.
All public entries check READ COMMITTED before authority work; SECURITY DEFINER
functions use an empty search path and qualified private objects.

The new migration requires earlier pending branch migrations, particularly
`20261023040912_abstract_submission_review.sql` (`msrc_abstracts` and held outbox
support). Do not apply this file alone to the 26-migration hosted baseline.
The full pending chain needs Claude/owner review in repository order.

The prepared database assertions and concurrency tests were not executed locally;
the passing UI/unit checks below do not replace those release gates.

Authenticated staff RPCs, Super Admin only:

```text
msrc_staff_announcements_list(edition_key text) -> jsonb
msrc_staff_announcement_save(edition_key text, input jsonb) -> jsonb
msrc_staff_announcement_preview(edition_key text, announcement_id uuid, expected_version integer) -> jsonb
msrc_staff_announcement_send(edition_key text, announcement_id uuid, expected_version integer, preview_token text, operation_id uuid, scheduled_at timestamptz default null) -> jsonb
msrc_staff_announcement_cancel(edition_key text, announcement_id uuid, expected_version integer, operation_id uuid) -> jsonb
```

Service-role only, with server/bound-claims guards:

```text
msrc_participant_announcements(edition_key text, session_claims jsonb, announcement_id uuid default null, mark_read boolean default false) -> jsonb
msrc_announcements_maintenance(edition_key text) -> jsonb
```

The private `msrc_outbox.enqueue(text,text,integer,text,text,jsonb)` signature is
unchanged. It adds the validated held `announcement` template; existing
registration semantics and the separate abstract decision producer are preserved.
The generic public enqueue continues to reject business templates.

Contract additions: typed audience segment union; bilingual draft/history row,
version/status, schedule/authority error and recipient/sent/failed aggregates;
masked preview token/count/sample response; save/preview/send/cancel/render
actions; participant own-inbox language pairs, published/read timestamps and
readiness/error states; maintenance `{state:'updated',started,needsReview}`.
Both retryable and permanent outbox failures count as failed in history.

## Verification

All commands prepend `C:\m\tools\bin` to PATH. Node 24 and pnpm 11.19.0 use the
existing lockfile; no dependency installation or new package was required.

| Check | Observed result |
|---|---|
| `pnpm lint` | PASS, zero warnings |
| `pnpm typecheck` | PASS, generated route types and TypeScript |
| `pnpm exec vitest run` | PASS, 4,262 tests in 99 files |
| `pnpm build` | PASS, 114 generated pages, new private routes included |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS in isolated port-mapped copy: 314 passed, 12 intentional skips, zero failures/retries. Original shared-port run failed; diagnostics below |
| `pnpm exec playwright test -c playwright.participant.config.ts` | PASS, 164 passed, four intentional skips, zero retries; 16 new inbox cases |
| `git diff --check` | PASS at current checkpoint; repeated at finish |
| Supabase status/local database availability | BLOCKED, Docker unavailable (`EPERM ... uv_spawn 'docker'`) |
| `pnpm exec supabase db lint --local --schema msrc_announcements --level warning --fail-on warning` | BLOCKED, local PostgreSQL refused `127.0.0.1:54322` |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/announcement-concurrency.test.ts` | BLOCKED, requires a running loopback Supabase stack; zero cases executed |
| pgTAP `announcements.test.sql` | NOT TESTED locally, 108 prepared assertions; requires disposable CI |
| Genuine database concurrency | NOT TESTED locally, seven prepared cases; wired to a separate cold CI reset |
| Hosted migration/activation, real inbox delivery and physical devices | NOT TESTED / not performed |

Database cases cover role denial, native exact-session assurance, all source
segments, masked/deduplicated preview, live status/audience drift, content CAS,
immutable snapshots, operation retries, draft holds, read isolation, scheduled
editing, due-time audience/author changes, Unicode bounds and failed aggregates.
The seven integration cases cover identical/different-operation double sends,
send-vs-edit, waiting-session assurance revocation, waiting recipient drift and both stronger
isolation levels. They use fresh synthetic fixtures and refuse hosted targets.

Initial diagnostics are retained under `.tools/announcements/`:

- The first unit run had 4,222 passes and one existing QR fallback timeout while
  concurrent compiler processes were active. No assertion, retry or timeout was
  changed. Its isolated 18-case file passed, followed by complete clean unit runs.
- Initial lint/type checks caught an unused test variable, a test type union,
  an in-progress screen union and a hook startup lint error; all were corrected.
- The first staff startup found port 3220 occupied. A subsequent read-only probe
  showed it had become free; no owner process was stopped or reused.
- The first staff run exposed four desktop assertion cases selecting Next's
  route announcer alongside the product
  error. The locators were scoped to the announcements panel, retaining exact
  error text assertions. No application failure was suppressed.
- The later staff mobile run suffered shared-port replacement: trace requests at
  15:23:05 UTC failed all hydration assets with connection refusals. A later
  response served JS files `1bb8gu2g1c9bt.js` and `1gm3wt_e-7cap.js`, neither of
  which exists in this checkout's build. Those files had 15:20 UTC modification
  times; this build's files were generated at 15:17 UTC. The old menu omitted
  Announcements and old email copy reappeared. The final six cases could not
  connect at all. A fresh ignored source copy with unique ports is used to
  separate the rerun from other worktrees. Assertions/retries/timeouts are kept.
- Participant assertions completed with 164 passes and four skips, but Windows
  webserver teardown remained waiting. After all 168 cases were accounted for,
  only this run's documented Next PID 36516 was stopped. Playwright then emitted
  its successful summary and exited 0. No owner app was stopped.

Unit and browser fixtures are synthetic UI/transport evidence, not native Auth,
database execution or production proof. Axe checks cover both new screens in
English and Arabic, including the exact-count confirmation dialog. Screenshot
and final browser results are recorded after completion.

Isolated verification uses `.tools/ann-run`, app port 3279 and provider port 3280.
`pnpm --config.verifyDepsBeforeRun=false build` passed there with 114 generated
pages and independent build ID `2SknvzZ0yoRD4l14YbmLC`. The root build remains
`BmGJGODMENERmWRJR0JC6`. The command-only pnpm verification override permits reuse
of the already installed dependency junction; no install or package change occurs.
The SHA256 manifest covers 467 copied files: 459 are byte-identical and eight
differ only by exact loopback port substitutions in test configuration, test
expectations and the corresponding local-only allowlists. All assertions, retries
and timeout values are preserved. Original source/build files are unchanged.

The complete isolated command was
`pnpm --config.verifyDepsBeforeRun=false exec playwright test -c playwright.staff.config.ts`
from `.tools/ann-run`: **314 passed, 12 skipped, exit 0** (7.9 minutes including
cleanup). All 326 configured cases were accounted for before stopping only this
run's logged Next/provider PIDs 35380/36268 to release Windows teardown. The
temporary copied Playwright configuration was removed afterward. The source
copy/hash manifest and full initial/final logs remain under ignored `.tools/`.

The isolated suite already passed all 24 new announcement cases across EN/AR and
desktop/phone, including the previously ambiguous error assertions. Participant
verification passed all 16 new inbox cases. Representative staff composition and
confirmation screenshots, Arabic desktop inbox and EN/AR phone inbox screenshots
were visually inspected. Eight staff and eight participant screenshots are
retained in `.tools/announcements/`. `git diff --name-only -- .impeccable/review`
was empty: no approved screenshots were regenerated or required restoration.
Final `git diff --check` passed. The complete changed-file inventory is 47 files.

Current primary references consulted: [Supabase database functions](https://supabase.com/docs/guides/database/functions)
and [PostgreSQL READ COMMITTED behavior](https://www.postgresql.org/docs/current/transaction-iso.html).
The Supabase skill security checklist and React best-practices review were applied.
The Supabase changelog markdown fetch was unavailable; no library/API upgrade was
performed and implementation follows the installed repository patterns.

## Owner and Claude review

Review the migration and run the 108 SQL assertions, strict database lint,
advisors and seven races in disposable CI before considering hosted application.
Approve the DRAFT bilingual email layout and native Arabic copy before a separate
delivery activation change. Confirm whether the global verified-account segment
should remain as implemented and decide inbox/snapshot retention before live use.
No retention period or optional communication preference is invented.

Feature notes: [ANNOUNCEMENTS.md](../features/ANNOUNCEMENTS.md).

## Changed files

The complete file inventory follows; isolated build sources, logs and screenshots
under ignored `.tools/` are verification artifacts and are not source changes.
- `.github/workflows/ci.yml`
- `docs/DECISIONS.md`
- `docs/features/ANNOUNCEMENTS.md`
- `docs/progress/2026-10-23-claude-announcements.md`
- `package.json`
- `src/app/[locale]/(auth)/my-msrc/page.tsx`
- `src/app/[locale]/staff/announcements/page.tsx`
- `src/app/[locale]/staff/layout.tsx`
- `src/app/api/announcements/route.ts`
- `src/app/api/jobs/outbox/drain/route.ts`
- `src/app/api/staff-portal/announcements/route.ts`
- `src/features/announcements/contracts.ts`
- `src/features/announcements/participant-backend.server.ts`
- `src/features/announcements/participant-contracts.ts`
- `src/features/announcements/participant-copy.ts`
- `src/features/announcements/participant-handler.server.ts`
- `src/features/announcements/participant-inbox.tsx`
- `src/features/announcements/participant-page-state.server.ts`
- `src/features/announcements/participant-security.server.ts`
- `src/features/announcements/staff.css`
- `src/features/announcements/staff-client.ts`
- `src/features/announcements/staff-copy.ts`
- `src/features/announcements/staff-handler.server.ts`
- `src/features/announcements/staff-panel.tsx`
- `src/features/participant-accounts/participant-form.tsx`
- `src/features/participant-accounts/participant-page.tsx`
- `src/features/staff-portal/copy.ts`
- `src/features/staff-portal/menu.ts`
- `src/features/staff-portal/staff-page.tsx`
- `src/features/staff-portal/staff-portal.tsx`
- `src/features/staff-portal/ui-contract.ts`
- `src/lib/email/announcement.server.ts`
- `src/lib/email/outbox.server.ts`
- `src/lib/jobs/announcements.server.ts`
- `src/lib/jobs/outbox-route.server.ts`
- `src/styles/participant-accounts.css`
- `supabase/migrations/20261023145926_announcements.sql`
- `supabase/tests/database/announcements.test.sql`
- `tests/integration/announcement-concurrency.test.ts`
- `tests/participant-e2e/announcements.spec.ts`
- `tests/staff-e2e/announcements.spec.ts`
- `tests/unit/announcement-email.test.ts`
- `tests/unit/announcement-maintenance.test.ts`
- `tests/unit/participant-announcements.test.ts`
- `tests/unit/participant-email-drafts.test.ts`
- `tests/unit/staff-action-summary.test.ts`
- `tests/unit/staff-announcements-handler.test.ts`
