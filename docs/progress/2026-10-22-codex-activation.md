# O9 — Opening activation package

22 October 2026; ENG-060. Worktree `C:\m\codex-activation`, existing branch
`claude/activation`, starting HEAD `f3d70530c890a9a33911ed59f9cb595ed2cd8f1e`.
The starting worktree was clean. Changes remain uncommitted for Claude.
`docs/PROGRESS.md` is unchanged. No hosted connection, migration application,
settings seed, feature activation, real email, branch, commit or push occurred.
No production secret values were read, printed or stored.

## Result

- [ACTIVATION](../runbooks/ACTIVATION.md) gives the ordered owner procedure,
  current-inventory environment table, exact formats and sources, native-role
  SQL/check/undo steps, final registration switch, and human go/no-go checks.
  It incorporates the owner's paid-plan/25-version report without representing
  that report as a live audit. Official Resend and Vercel documentation is cited.
- `scripts/activation/generate-keys.mjs` uses only Node built-ins and no network.
  It emits new random keys to the owner's terminal, writes no file by default,
  and permits only exclusive new files outside this repository, resolving parent
  symlinks/junctions. `--include-existing` covers initial staff/Contact setup;
  it does not authorize replacing installed keys. Windows ACL custody is explicit.
- The drain cron is now `*/5 * * * *` for the owner-reported Vercel Pro plan.
  Existing Bearer authentication, GET/POST behavior, inert HEAD and closed gates
  are unchanged. With the current batch of ten this is at most 120 attempts/hour.
- The Super Admin-only EN/AR Launch readiness page computes its checklist on the
  server, shows no environment values, and has no activation control. Counts,
  configured dates/capacity in Riyadh time, a two-day check, policy/budget checks,
  required function capabilities, staff roles, backup authenticator and final
  database Closed/Open state are shown. Last drain remains explicitly unobservable
  because no durable heartbeat exists; the owner checks invocation logs.
- Missing optional RPCs show `area-not-ready` and preserve valid sessions.
  Unexpected aggregate fields and conflicting settings snapshots fail closed.
  The environment evaluator also rejects production test transports, mismatched
  editions, reused cron/monitor credentials and invalid crypto key combinations.
- Corrected the older participant runbook's stale `privacy_version='1.0'` to
  `v1.0`, and reconciled the runbooks' old daily-cron wording. No policy text changed.

## Migration and contracts

The sole new pending migration is
`supabase/migrations/20261022171108_staff_launch_readiness.sql`.
No historical migration was modified. Against the owner's reported 25-version
ledger, separate reviewed application would add version 26.

`public.msrc_staff_launch_readiness(edition_key text) returns jsonb` is callable
only by `authenticated`, with independent native Super Admin, current edition,
exact-session TOTP and READ COMMITTED checks. It takes the shared staff-authority
lock, reads policies and counts, checks 25 prerequisite RPC signatures and calls
only the constant no-data health ping. Apart from `state`, its leaves are
booleans/counts. It returns no person identifiers, addresses, factors, dates,
settings secrets, message contents or credentials, and changes no operational data.

The existing `GET /api/staff-portal?area=launch-readiness` gains the new area and
`StaffResponse.launchReadiness` projection. `StaffArea`, `StaffScreen`, menu/copy
and `StaffLaunchReadiness` types are extended. The existing registration-settings
RPC supplies only the entered date/capacity summary; its history is not returned
by this area. There is no new mutation, participant API or activation endpoint.
Environment entries carry a static name and presence/validity/enabled booleans,
plus a server-selected status. The configured settings summary remains private.

## Verification

Commands used Node 24 and pnpm 11.19.0 with `C:\m\tools\bin` first on PATH.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | PASS, exit 0; no lint warnings/errors. |
| `pnpm typecheck` | PASS, exit 0; route generation and TypeScript. |
| `pnpm exec vitest run` | PASS: 3,701 tests, 83 files. Initial run had 1 failure / 3,700 passes: the exact Super Admin summary expectation lacked the added readiness action. Updated the expectation, retaining the assertion; full rerun passed. |
| Focused new environment/key tests | PASS: 85 tests, including real config-validator compatibility, absent/malformed/boundary matrix, independent keys, default no-file behavior, explicit output, overwrite refusal and in-repository/junction refusal. Generated test values stayed captured in subprocess memory and disposable test files, never tool output. |
| Readiness handler/page unit tests | PASS: 47 tests covering all non-Super-Admin roles, anonymous/native-session/TOTP denial, no environment reads on denial, missing RPCs, malformed/private extra data, no mutation, two-day checks and budget mismatch. |
| `pnpm build` | PASS, exit 0; fresh production build after final UI edits, including the dynamic locale readiness route. |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS, exit 0: 194 passed, 12 intentional device-specific skips, zero failures/retries (7.4m). All 12 new readiness cases pass. Uses only local ports 3219/3220 and synthetic fixtures. Windows server teardown needed the bounded cleanup described below. |
| `git diff --check` | PASS, exit 0, including the final implementation checkpoint. |
| Required SQL signature source audit | PASS: 25 exact signatures match the migration source chain. This is not execution proof. |
| pgTAP / database lint | BLOCKED locally: no Docker/database runtime. 69 new pgTAP assertions prepared for CI; no hosted substitute attempted. |
| Native database integration/concurrency | BLOCKED locally. Three new cases in `tests/integration/staff-launch-readiness-concurrency.test.ts` are discovered by the existing CI suite: queued read after actual Super Admin demotion, REPEATABLE READ rejection, SERIALIZABLE rejection. Lock observation uses `pg_locks`/`pg_stat_activity` barriers, fresh sessions and existing native guards. |
| EN/AR desktop/mobile visual review | PASS: four captured readiness pages reviewed; no clipping, RTL/long environment-name issues or missing final switch. New page cases include 14 clean axe scans, including 320px/200% mobile text. |
| `git checkout -- .impeccable/review/` | BLOCKED by read-only shared `.git` worktree index (`index.lock` permission denied). No files there were regenerated or changed; `git diff --exit-code -- .impeccable/review/ docs/PROGRESS.md` PASS. New screenshots are only under ignored `.tools/launch-readiness/`. No restoration is needed. |
| Live provider, hosted SQL/flags, inbox, physical scanner, recovery, restore and load | NOT TESTED; no authorization to execute these operations in this task. |

Only the staff browser suite was changed. Other browser-suite configuration and
port 3210 are untouched. Initial failed unit output is retained under ignored
`.tools/activation/vitest-initial.log`; lint/typecheck logs are alongside it.
PowerShell labels native stderr as `NativeCommandError` in redirected logs even
for successful command announcements; the process exit status was zero and the
tools reported no findings. The browser report/traces stay in ignored normal
Playwright output locations.

After all 206 cases finished, Playwright stalled while stopping its two local
web servers. Both servers were still listening. Stopped only this run's known
provider/Next PIDs (36488/7096, logged when launched); the unchanged test command
then finalized its report and exited 0. No test was interrupted, skipped or
retried for this cleanup, and port 3210 was untouched. The normal suite summary
and `.last-run.json` are the final evidence. This was local runner teardown,
not a reason to loosen assertions, add retries or increase timeouts.

Independent review found and corrected two SQL fixture mistakes before CI:
duplicate verified-factor insertion violated the native authenticator guard, and
suspending a backup with only two active admins violated the minimum-admin guard.
Tests now assert the factor guard, preserve an additional unverified-factor admin
for suspension cases, and use session revocation for the final reader denial.
These corrections were statically reviewed; they are not a pgTAP pass claim.

## Owner decisions and Claude review

1. Run database lint, pgTAP and integration coverage in disposable CI; review the
   one pending migration and exact-source CI before any hosted application.
2. Confirm the actual paid Resend tier, remaining monthly budget and existing
   shared staff/Contact usage. The proposed P=1000/B=1000 caps are temporary
   opening-day recommendations only. Sustaining both daily for a month exceeds
   Pro's entry allowance; the app has no monthly budget enforcement. Approve a
   post-opening budget and measured worker throughput before GO.
3. Supply the still-required legacy waitlist/confirm-seat durations and threshold
   through Registration settings. Confirm the early list, named rota, independent
   backup Super Admin authenticator/recovery, privacy/custody/restore and native
   Auth/load gates. Do not turn suggested values into approved settings.
4. The owner's real signup test needs an owned address distinct from their staff
   login. Enabling participant accounts permits public signup; there is no private
   production bypass. Registration opens last in the approved opening window.
   Scanner acceptance rehearsal uses isolated synthetic tickets; a production scan
   creates real attendance, even for a future selected configured day.

## Changed files

- Configuration/documentation: `.env.example`, `vercel.json`, `docs/DECISIONS.md`,
  this receipt, `docs/runbooks/ACTIVATION.md`, `docs/runbooks/OPENING_NIGHT.md`,
  `docs/runbooks/MONITORING.md`, `docs/features/REGISTRATION.md`,
  `docs/features/PARTICIPANT_ACTIVATION_RUNBOOK.md`.
- Generator/evaluator: `scripts/activation/generate-keys.mjs`,
  `src/lib/activation/readiness.ts`.
- Page/UI/server: `src/app/[locale]/staff/launch-readiness/page.tsx`,
  `src/features/staff-portal/launch-readiness-contract.server.ts`,
  `src/features/staff-portal/launch-readiness-copy.ts`,
  `src/features/staff-portal/launch-readiness-panel.tsx`, `copy.ts`, `handler.server.ts`,
  `menu.ts`, `registration-contract.server.ts`, `staff-page.tsx`,
  `staff-portal.tsx`, `ui-contract.ts` in that feature directory;
  `src/styles/staff-console.css`.
- Database: the one migration above and
  `supabase/tests/database/staff_launch_readiness.test.sql`.
- Tests: `tests/unit/activation.test.ts`,
  `tests/unit/staff-launch-readiness.test.ts`,
  `tests/unit/staff-launch-readiness-page.test.ts`,
  `tests/unit/staff-action-summary.test.ts`,
  `tests/staff-e2e/launch-readiness.spec.ts`,
  `tests/integration/staff-launch-readiness-concurrency.test.ts`.
