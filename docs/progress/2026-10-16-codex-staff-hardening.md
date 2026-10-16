# Staff session and security hardening — local implementation, 16 October 2026

O9 receipt; ENG-044. Requirements: AUTH-02/03/04/05, ROL-10/12,
ADM-05, SEC-01/02/06, LOC-01/03. Implemented on `codex/staff-hardening`
at base `02873ec` (PR #88 registration foundation). No branch creation,
commit, push, PR, hosted SQL, environment/deployment change, invitation or real
email. Claude/planner-QA reviews, reruns checks, commits and opens the PR.
`docs/PROGRESS.md`, staff layout metadata and existing title assertions are
unchanged. PR #88's registration identity/reveal-reason controls remain intact.

## Findings, changes and acceptance evidence

| Item | Verified starting behavior and root cause | Implementation and coverage |
| --- | --- | --- |
| 1. Active read sessions | **Bug:** API/RSC observations consistently used non-activity context. Navigation and reading could therefore expire after 30 minutes even while working. The 30-minute idle/eight-hour absolute constants were already correct. | CSRF-protected `activity` POST records mounted navigation and trusted pointer/keyboard/wheel activity at bounded cadence. Timers alone remain observational. Reuses existing `msrc_session_activity` ACL; staff authorization precedes activity, participant behavior stays observation-only. Unit cases cover staff and Super Admin through two hours and two native refreshes, idle/absolute denial, missing CSRF/forged fields and DB refusal. EN/AR desktop/mobile accelerated two-hour browser cases pass, then prove unattended expiry. New SQL file covers authority, immutable origin, observations and expired/closed denial; DB execution blocked. |
| 2. Rotated tokens after admin work | **Bug:** refreshed tokens were emitted by selected GET/second-step branches; ordinary admin POST responses dropped the rotated pair. | Central response handling persists a successfully refreshed pair on action success, denial and later exception; preserves original deadline. Invalid refresh, changed actor/session and rejected current authorization clear/deny. Unit tests decode the resulting cookie and exercise the next request; null/throw/mismatched refresh never runs the admin mutation. A successful TOTP provider upgrade followed by failed audit completion still denies and may require fresh sign-in; no universal MFA-failure recovery claim. |
| 3. Logout | **Bug:** mutable DB readiness, CSRF claim and per-IP throttles preceded logout. Revocation calls were sequential, so one failure could skip the other. | Same-origin logout bypasses form freshness, quota and DB readiness. Cookie clearing succeeds when either/both revocations fail, with missing/expired cookies and stale/no form token. Expired access tokens may refresh only to revoke the same remote session; refresh failure still clears. Closed/unavailable application config accepts the explicit same-origin logout header and clears fixed cookie names without reading credentials or constructing a provider; remote revocation cannot then be attempted. Normal mutations retain CSRF and rate limits. UI permits logout without a form token and aborts outstanding restores. Unit failures/cross-origin denials and EN/AR no-token plus delayed-cookie browser regressions pass. |
| 4. Shared campus network | **Bug:** form claims, password attempts and email-code issuance each had a 20/IP/hour ceiling shared by all staff. Strict account controls were already present. | Raise only IP ceilings as below. New SQL covers 100 distinct staff, finite IP ceilings, form replay, account limits across IPs, rolling unlock and newest-email behavior. Existing email-cap fixture now tests 300 instead of 20. Integration cases race account/password/form reservations at the thresholds. SQL/integration execution blocked locally. |
| 5. Authenticator lockout | **Bug:** TOTP verification was audited but had no application account cooldown. | Private forced-RLS account/attempt tables and service-only begin/finish RPCs serialize provider work. Five failures lock for 15 minutes; account budget survives session/challenge changes, unlock is audited, success resets failures, and replay cannot count twice. Only one provider verification may be pending/account for 30 seconds. Provider uncertainty and expired interrupted reservations conservatively consume an attempt. Native successful TOTP proof is denied while locked. Handler unit failure paths pass; SQL and three added native cases cover real wrong-code lockout/unlock/audit, raw-native denial, concurrency/replay and failed-password audit visibility. Runtime DB/native execution blocked. Existing other-Super-Admin recovery remains required. |
| 6. Failed-password audit rows | **Bug:** failed provider login had no native actor; existing edition-filtered audit lost those failures. Existing Super Admin authorization, null-account display and RTL rendering were already correct. | Service-only failure recording resolves an existing attempted staff account privately; unknown account remains null. Failed credentials do not authenticate an actor: `actor_id` stays null even for a known target. Stored/projected data is time, attempted account if known, action/outcome and existing opaque IDs; no submitted email/password, raw IP or provider payload is retained in audit. Generic failure wording also covers ambiguous provider rejection. Added EN/AR labels, translated filters and known/unknown browser rows. SQL/native cases assert Super Admin visibility and ordinary-role denial; their runtime is blocked. |
| 7. Documentation | **Gap:** audit tables block DELETE and no complete purge procedure existed. Advisor baseline carried historical findings without concise object-specific exception reasons. | Backup/restore guide now covers all four audit sources, named row guards, reviewed UUID manifests, backup/restore rehearsal first, single transaction/count assertions/rollback, guard restoration, exports and restore suppression by 28 January 2028. No purge SQL was executed. Existing advisor baseline records intended 0008/0029 exceptions and reasons; disabled leaked-password protection remains a release gap, not a safe intentional control. Current hosted advisors were not queried. |

## Limits and unchanged boundaries

| Control | Chosen bound | Reason |
| --- | --- | --- |
| Form claims per HMAC IP | 12,000 / rolling hour | Synthetic sizing: 100 staff × one activity report plus one admin action/minute; activity traffic has its own headroom. |
| Password attempts per HMAC IP | 300 / rolling hour | Same cohort × three sign-ins/reconnections/hour. |
| Regular-staff email issues per HMAC IP | 300 / rolling hour | Same cohort × three code issues/hour, still constrained by each account and the approved daily email budget. |
| Password account budget | Unchanged: five pending/denied attempts / 15 minutes | One account cannot consume colleagues' account budgets; pending requests prevent concurrent overshoot. |
| Email account budget | Unchanged: resend 60s; three/15 minutes; ten/rolling 24h; five wrong entries then 15-minute cooldown; newest only | Preserves ORG-015 assurance and anti-abuse controls. The explicit current task narrowly changes only its old email IP ceiling. |
| TOTP account budget | Five failures, then 15-minute cooldown; one pending provider attempt/30s | Matches email failure threshold/cooldown and survives session rotation; conservative interrupted-attempt accounting. |

These are engineering abuse allowances, not an approved headcount, sending budget
or provider capacity. Direct managed-Auth wrong-code attempts still require
provider abuse-limit verification at activation; only portal attempts increment
the new counter. No email substitute for TOTP, self-recovery, minimum-two bypass,
client schema/table grant or workflow activation is added.

## Pending migration inventory

Apply nothing from this task without the owner's hosted-change routine and CI
evidence. All versions follow `20261016110000` and depend on PR #88's base.

1. `20261016110100_staff_session_activity.sql`: replace existing activity RPC;
   preserve current owner/ACL and participant fallback; no new client grants.
2. `20261016120000_staff_auth_hardening.sql`: private forced-RLS TOTP state,
   service-only reservation/completion/failure RPCs, native lock guard and audit
   enum extension. No API role receives private table access.
3. `20261016130000_staff_shared_network_limits.sql`: replace existing form,
   password and email issuance functions with the revised IP ceilings; preserve
   account locks/windows, readiness, daily email budget and service-only access.

New/replaced privileged functions use `search_path=''`. No existing historical
migration was edited. Local SQL inspection and separate-agent review found no
material issue; neither substitutes for database runtime evidence.

## Commands and observed results

Runtime: `C:\m\tools\bin` prepended to PATH; Node **24.21.0**, pnpm **11.19.0**.

| Check | Observed result |
| --- | --- |
| `pnpm exec eslint . --max-warnings=0` | **PASS**, full repository, zero warnings/errors. |
| `pnpm typecheck` | **PASS**, route type generation and TypeScript. Initial test-mock spread errors were corrected; final rerun passes. |
| `pnpm test` | **PASS**, **2,550 tests / 64 files**. |
| `pnpm build` | **PASS**, optimized production build and **81 generated pages**. Final build includes the trusted wheel/pointer/keyboard activity handler. |
| Staff browser suite, both committed projects | **PASS**, **42 passed / 6 skipped / 0 failed**, using the temporary local harness described below. Skips are mobile-only cases on desktop. |
| Password browser suite, enabled | **PASS**, **26 passed / 2 skipped / 0 failed**. Skips are mobile-only cases on desktop. |
| Password browser suite, server-closed | **PASS**, **6 passed / 0 skipped / 0 failed**. |
| Password browser suite, database-closed | **PASS**, **6 passed / 0 skipped / 0 failed**. |
| Combined browser result | **80 passed / 8 intentional skips / 0 failed**; no retries or timeout increases. |
| `git diff --check` | **PASS**. |
| `pnpm db:test` | **BLOCKED**, exits 1: local Postgres `ECONNREFUSED 127.0.0.1:54322`. Docker/local Supabase unavailable. No database assertion ran. |
| `pnpm exec vitest run --config vitest.staff.integration.config.ts` | **BLOCKED / NOT RUN locally**, needs disposable native Auth/database stack; three new native cases written. |
| `pnpm db:integration` and DB lint/advisors | **BLOCKED / NOT RUN locally**, same stack requirement. Shared-network concurrency cases written for CI; no hosted fallback. |
| Visual review | **PASS**, inspected four failed-password audit screenshots: EN/AR desktop and mobile. Browser tests include RTL, localized filtering, keyboard/mobile layouts and axe checks. Mobile audit table retains its existing horizontal scroll region. |

Clean builds began with `.next` absent. The tool rejected recursive deletion;
the verified task-local build directory was instead moved under ignored `.tools`
before each clean build. No stale `.next` output was reused.

### Browser harness and preserved failures

`netstat -ano -p tcp` verified no listener on **3210/3219**. An unrelated existing
Next process, PID **22004**, owns **3220**; it predates this task and was never
stopped or modified. Its `/health` response is not the synthetic provider stub.
The original `pnpm exec playwright test --config playwright.staff.config.ts`
therefore failed at provider startup with `EADDRINUSE`, before tests ran.

To run the complete same project/test selection, ignored local wrappers import
the committed staff/password configs and launch only this task's Next server on
3219. A Node preload supplies exactly the existing readiness-only provider stub
from `scripts/staff-ui-provider.mjs` in process. It accepts only the fixed
synthetic status request and refuses any other call to 3220, isolating the
unrelated server. Browser API fixtures remain synthetic. Commands used:

```powershell
$env:PATH = 'C:\m\tools\bin;' + $env:PATH
pnpm exec playwright test --config .tools/staff-hardening-evidence/playwright.staff-local.config.ts
pnpm exec playwright test --config .tools/staff-hardening-evidence/playwright.password-local.config.ts
$env:STAFF_PASSWORD_UI_GATE = 'server-closed'
pnpm exec playwright test --config .tools/staff-hardening-evidence/playwright.password-local.config.ts
$env:STAFF_PASSWORD_UI_GATE = 'database-closed'
pnpm exec playwright test --config .tools/staff-hardening-evidence/playwright.password-local.config.ts
```

The Windows runner waited during server teardown after every test result was
complete. Stopped only the exact task-started Next PID for each completed run;
the runners then exited **0** and emitted the counts above. No listener remains
on 3210/3219. PID 22004 remains untouched on 3220. For QA, run the committed
configs unchanged when their ports are free, or inspect/use the local wrappers.

Initial failed receipts remain under ignored
`.tools/staff-hardening-evidence/staff-results-initial-failure` and
`staff-results-clock-failure`: PR #88's reason-required Reveal test was stale,
and the new session test initially used a nonexistent `.staff-banner` locator.
Filled the required synthetic reveal reason and used the actual localized H1;
kept the assertions, retries and timeouts. Mobile/password fixtures now understand
the activity protocol; exact administrative-action assertions remain intact.
Final reports/results are in the same evidence folder; audit screenshots are in
`test-results/staff-evidence`. Initial CLI telemetry EPERM was resolved locally
with `SUPABASE_TELEMETRY_DISABLED=true` and `SUPABASE_HOME` under `supabase/.temp`;
no user-profile file or hosted resource was changed.

## Remaining gates and next owner/QA task

- Claude reviews this uncommitted diff, reruns the standard checks and obtains
  actual disposable SQL/RLS/native/concurrency CI results before committing or
  opening the stacked PR. Database success is not claimed here.
- **NOT TESTED:** real two-hour native/provider/inbox human UAT, physical devices,
  real assistive technology, hosted current advisors/settings, live invitations,
  real recovery and the audit-deletion SQL rehearsal/execution.
- No implementation clarification is outstanding. Before invitations, the owner
  still needs provider perimeter/rate-limit evidence, an approved combined email
  budget and the existing staff release/recovery gates. Assign the deletion and
  restore-suppression owner/reviewer before the 28 January 2028 deadline.

Related notes: [staff portal](../features/STAFF_PORTAL.md),
[activation](../features/STAFF_ACTIVATION_CHECKLIST.md),
[backup and audit deletion](../features/STAFF_BACKUP_RESTORE.md), and the existing
[advisor baseline](../features/PARTICIPANT_ACTIVATION_RUNBOOK.md).
