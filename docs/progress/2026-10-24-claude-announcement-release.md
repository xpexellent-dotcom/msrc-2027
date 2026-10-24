# Announcement email release path — 24 October 2026

Branch: `claude/announcement-release`; starting HEAD:
`7768300c6e780220c114dc53040f3e069a28ed26`. The worktree was clean before
implementation. Changes remain **uncommitted** for Claude; no push.

Authority: current task and ORG-063/ENG-072, reserved at the end of
`docs/DECISIONS.md` after checking ORG-062/ENG-071 were the highest used numbers.
Requirements: EML-01–05, LOC-01/03, ACC-01, ROL-10/12, SEC-01/02/06,
PRV-03/05/06 and AT-16. Read AGENTS.md, project brief, decisions, progress,
the five requested email/announcement feature notes, the email setup runbook,
and relevant source requirements and announcement/outbox migrations.
`docs/PROGRESS.md` was read and **not edited**, as explicitly instructed.

## Result

- Added pending migration `20261024100000_announcement_release.sql`. Private
  per-edition `delivery_settings.layout_approved` defaults false; an absent row
  also means false. No settings rows are seeded. Both new private tables force
  RLS and deny direct API-role access.
- Chose the exact-session Super Admin RPC over an owner-run SQL UPDATE. The
  RPC rechecks current TOTP/session authority after waiting for locks, serializes
  with publication, and records actor, session, operation ID and decision in an
  immutable audit. Retrying the same operation cannot apply it twice or reuse it
  with different input. The staff EN/AR screen has explicit approval/revocation
  confirmation; it never changes any global outbox setting.
- With approval off, new publication retains the incumbent hold. With approval
  on, only newly published email has immutable `announcement_delivery='approved'`
  proof and no hold. Scheduled publication uses the approval at dispatch time.
  Every already-held message remains held permanently; no release action is
  provided. A trigger prevents later changes to announcement hold/proof. Revoking
  approval controls future publication; use global switches to pause already
  approved queued messages.
- “Send a test to myself” accepts only a saved draft ID, expected version and
  operation ID. SQL selects the acting Super Admin's current verified Auth
  address under an identity lock, without trusting JWT email or a destination
  supplied by the browser. The frozen four-field bilingual payload uses the
  existing renderer/banner and existing Resend outbox transport. No test prefix
  or alternative email composition is added.
- Self-tests can inspect the layout before approval using explicit immutable
  `self_test` proof. They enqueue one message, leave the draft/version and
  recipient totals unchanged, and create **no recipient or inbox rows**. Actor-wide
  advisory locking and audit enforce three distinct tests per rolling hour
  across editions; uncertain retries retain the same operation/message.
- Announcement claim and provider preparation respect the global database
  delivery/sweep switches; the ordinary database/runtime caps, production Resend
  gates and authenticated drain still apply. Tests consume the normal attempt
  budget. Missing/invalid SQL release proof fails closed in the worker and claim
  decoder. Registration and abstract DRAFT gates stay intact.
- The staff screen reports database and server runtime readiness without exposing
  configuration. EN/AR warnings say delivery is off and no email will arrive,
  including tests. Successful enqueue is described as queued, never delivered.
  New RPCs use the existing optional-RPC/`StaffRpcMissingError` area-not-ready
  behavior and preserve staff sign-in while migrations are pending.

The announcement email already had no literal DRAFT prefix in its subject/body;
removed its static DRAFT approval metadata and updated announcement-only gate
copy. No registration/abstract wording or approval changed. No new provider,
scheduler, hosted setting, migration, seed, flag activation, participant opening
or real email occurred.

## Verification

Environment: Windows PowerShell, Node `v24.21.0`, pnpm `11.19.0`.

| Command/check | Observed result |
| --- | --- |
| Initial targeted `pnpm exec vitest run …` | BLOCKED by missing installed dependencies (`ERR_PNPM_VERIFY_DEPS_BEFORE_RUN`); resolved by locked install below. |
| `pnpm install --frozen-lockfile` | PASS; 433 packages, no lockfile/version changes. |
| `pnpm exec vitest run tests/unit/outbox.test.ts tests/unit/announcement-email.test.ts tests/unit/registration-emails.test.ts tests/unit/abstract-decision-email.test.ts` | PASS: 4 files, 195 tests. |
| `pnpm lint` | PASS, exit 0, zero warnings. |
| `pnpm typecheck` (`next typegen && tsc --noEmit`) | PASS, exit 0. |
| `pnpm test` | PASS: 106 files, 4,687 tests. |
| `pnpm build` | PASS, exit 0; compiled, TypeScript completed, all 114 static pages generated. |
| `pnpm exec playwright test --config playwright.staff.config.ts tests/staff-e2e/announcements.spec.ts` | PASS: 36 cases, exit 0, zero retries; Windows webserver cleanup required the scoped intervention below. |
| Mobile visual inspection | PASS: inspected both EN/AR `test-queued` screenshots; release controls, warnings and bilingual preview fit without horizontal clipping. |
| `git diff --check` | PASS at implementation checkpoint; repeated at final handoff. |
| Database migration reset/lint, pgTAP, database integrations/concurrency | BLOCKED locally by the task's no-Docker/CI-only boundary; NOT RUN. No CI was triggered or claimed. |
| Hosted/provider delivery, actual mailbox receipt, native Arabic/hardware UAT | NOT TESTED; remain separate owner-authorized release gates. |

The build/type generator's incidental `next-env.d.ts` path change was restored
to its starting contents after checks, leaving no generated-file change.

Playwright reported each of the 36 cases successful, then stalled in Windows
webserver teardown. Its installed launcher catches failures from `taskkill` and
waits for child closure without a timeout. Both test servers were still listening
on loopback (Next PID 16220/port 3219; mock PID 21912/port 3220), matching this run's
start time. Ran **only** `Stop-Process -Id 16220,21912 -Force -ErrorAction Stop`;
the original command then completed with `36 passed (4.6m)` and exit 0. No runner,
assertion, retry or timeout setting was changed, and the tests were not rerun.
This is browser-case PASS with a local Windows cleanup limitation, not proof that
unattended Windows teardown is healthy. Report: `playwright-staff-report/index.html`.

Added **65 rollback-only pgTAP assertions** in
`supabase/tests/database/announcement-release.test.sql`: default off, forced RLS
and ACLs, Super Admin/session-only approval and audit, new holds/release, permanent
old holds, own current address, exact saved bilingual payload, unchanged draft,
zero recipient/inbox rows, replay/conflicts/quota, and global gates/budget.
Fixtures explicitly enable `msrc_staff.policy` with `email_daily_limit=1000`.

Added **five** CI-only concurrency cases to the existing announcement integration
suite: simultaneous test replay, the actor's last hourly slot across editions,
session evidence revoked while waiting, and both approval/publication lock orders.
The READ COMMITTED guard matrix includes all new staff RPCs. The existing
disposable CI workflow already runs this file; no workflow activation is added.
Independent static review found no blocking issue; this is not SQL execution.

Browser cases include approval/revocation confirmation, saved-only tests,
delivery-off copy, stable retry IDs, visible rate limits, EN/AR/RTL and axe checks.
They run against loopback UI mocks, with no production database or email access.
Ignored evidence: `.tools/announcements/staff-{en,ar}-staff-{desktop,mobile}-{compose,confirm,test-queued}.png`.

## Remaining release gates / next task

Claude reviews and commits these uncommitted changes, then obtains exact-revision
disposable CI evidence for migration reset, strict DB lint, all pgTAP and database
integration/concurrency tests. Do not apply this migration alone against an old
hosted baseline: review the entire pending migration chain in order.

Keep layout approval and all global delivery flags/caps off until the owner
separately authorizes activation, approves the rendered layout/provider budget
and processing/sender/drain configuration, reviews queued self-tests, and verifies
a small real self-test's actual inbox receipt. Old held audience messages are
never silently released. See `docs/features/ANNOUNCEMENTS.md` for the release path.
