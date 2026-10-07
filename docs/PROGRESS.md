# Progress and session handover

## 8 October 2026 — Owner-change migration verified; first release stopped and closed

The organizer clarified that the privately updated value is a requested account
password change. [PR #46](https://github.com/xpexellent-dotcom/msrc-2027/pull/46)
is merged at main `2f677bedd9e1773508286cc5d8db79780801cc37`; all seven
substantive merged-main CI jobs passed in Foundation 37688971744, Staff
37688971725 and Participant 37688971851. [PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45)
remains draft. Its operator/setup work is separate from the deployed main source.

Fresh protected post-enrollment backup/restore, exact migration rollback,
actual operator rollback, and policy-only gate enable/close rehearsals passed.
The additional `20261007195540_staff_password_change.sql` committed and passed
same-transaction plus fresh catalog/data/history verification at 22:08:30.753 UTC
on 7 October. All eight earlier immutable history rows and existing native/app
data were preserved; history now contains nine original versions. No older file,
fixture, bootstrap or account was replayed.

The first owner-feature release STOPPED during readiness verification: its helper
treated the normal pending Vercel status from its own intentional build as a
failed prerequisite. No owner handoff or password change occurred. Verified
closure committed the new database boolean false first and only the new server
flag false second. The pinned closed deployment is READY/current Production;
fresh EN/AR Security404, anonymous staff denials, participant and all15
operational API closure checks passed at 22:14:29.953 UTC. Existing EN/AR staff
sign-in remains200/noindex/private with blank controls; navigation and robots
exclusion passed at 22:16:19.283 UTC. These anonymous checks do not establish a
current human password/TOTP session. The disposable clone was removed and all
protected backup/failed/successful evidence retained.

The account password remains unchanged. Normal own-device current-password/
TOTP rotation and new-password/TOTP verification are NOT PERFORMED. No second
account, self-reset, authenticator reset, real email or operational opening
occurred. See [the stopped execution record](features/STAFF_PASSWORD_RELEASE_EXECUTION.md)
for each migration, exact receipts, preserved failures, remaining release checks
and database-first rollback. Resumption requires a new reviewed attempt after
the readiness correction passes; never replay the committed migration or the
closed first release. The private helper correction now has independent source
review PASS and 42 synthetic readiness regressions PASS. It has not been used to
resume Production. Activation is stopped at the failed first release, with both
new gates false. Existing standing authorization remains in effect.

## 7 October 2026 — First-admin sign-in/TOTP verified; requested account password change not yet applied

ORG-046's persistent restricted setup authorization remains in effect. All six
reviewed hosted migrations genuinely committed and were verified individually;
history now contains eight original versions. The original persisted-authority
and Contact files were preserved/skipped, and the synthetic fixture was excluded.
The exact files, SHA-256 values, sanitized receipt labels and closure/rollback
procedure are in [the execution record](features/STAFF_SETUP_EXECUTION.md).

| Stage | Completed UTC, 2026-10-07 | Checks before/after ledger | History rows | Fresh live closure GETs |
| --- | --- | --- | ---: | --- |
| 1 | 17:35:06.547 | 675 / 675 PASS | 3 | 19/19 PASS |
| 2 | 17:37:13.819 | 940 / 940 PASS | 4 | 19/19 PASS |
| 3 | 17:37:56.931 | 940 / 940 PASS | 5 | 19/19 PASS |
| 4 | 17:40:16.049 | 995 / 995 PASS | 6 | 19/19 PASS |
| 5 | 17:41:54.220 | 1,610 / 1,610 PASS | 7 | 19/19 PASS |
| 6 | 17:45:32.098 | 2,338 / 2,338 PASS | 8 | 19/19 PASS |

Totals are 7,498 completed checks per pass and 14,996 across both passes, not
unique assertions. Final schema, explicit grants and native/application data
checks passed against the exact offline stages, retaining the dated cron-runtime
exception without rewriting history/scheduling. These are database/closure
receipts, not human password/TOTP, recovery, inbox or axe UAT.

- PASS, 17:34:59 UTC: exact operator/source head
  `06443f59532a011d4414d3360c413053e32463ae` has all six substantive CI checks plus
  Vercel SUCCESS: [foundation](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37657520910),
  [staff](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37657521041) and
  [participant](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37657521102).
  [PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45) remains draft.
  Production application is separately still merged main
  `bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`; restricted deployment evidence is below.
- PASS, 17:48:03.386 UTC: 15 selected staff-only native Auth settings PATCHed and
  verified by readback. Critical alternative admission/provider/notification flags
  remained disabled; final native schema/grants/data checks passed.
- PASS, 17:49:08.924 UTC: seven Production-only staff variables configured and
  verified by readback. Participant/test flags remain absent and existing Resend
  metadata is unchanged. Matching staff server/database cap is 36/day alongside
  unchanged Contact 60/day; both staff gates were closed at this checkpoint.
- PASS, 17:50:10.218 UTC: exactly one privately identified active Super Admin
  bootstrapped in the expected edition with immutable audit, while both staff
  gates were closed. At bootstrap completion there was no other user, invitation,
  native factor or session; pairing was false. Identity/credential values stay private.
- HISTORICAL START, 18:05:18.598 UTC: restricted first-admin onboarding under ORG-046.
  Native staff gate and Production server flag were enabled for the existing
  single account; pairing remains false and participant/all other operational
  gates remain off. This is not a password/TOTP pass.
- HISTORICAL PASS: restricted deployment created at 18:05:27.667 UTC, initially BUILDING
  while the previous serving deployment remained closed. At 18:06:31.656 UTC,
  `dpl_F2261YzD9AnzeoH3syXL9vANggtC` was verified READY at exact app SHA
  `bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`, with correct source/org/repository/
  project/owner-team binding and apex/www aliases. Safe receipt labels are
  `first-admin-onboarding-attempt`, `first-admin-deployment-created` and
  `first-admin-deployment-ready`.
- HISTORICAL PASS, 18:11:58.682 UTC, `first-admin-live-onboarding`: both EN/AR staff sign-in
  SSR pages returned 200 with localized headings/controls, correct lang/dir,
  noindex and no response cookie. Three anonymous People/Audit/Participants GETs
  returned 403 with exact denied responses and no private data. Participant plus
  15 operational APIs passed 16/16 exact closed-JSON/503/no-store/no-cookie checks.
  Both public locales have no staff links; robots disallows `/*/staff`.
  Actual browser observation confirms blank English inputs ready and Arabic
  localized heading/RTL/inputs ready. No axe, native-reader or human Auth pass is
  claimed by these observations.
- REVIEWED: final native advisors report 32 INFO
  [0008 private RLS/no-policy findings](https://github.com/supabase/splinter/blob/main/docs/0008_rls_enabled_no_policy.md)
  and 15 WARN
  [0029 authenticated security-definer execution findings](https://github.com/supabase/splinter/blob/main/docs/0029_authenticated_security_definer_function_executable.md)
  for guarded RPCs. Findings remain recorded; no ACL/RLS was widened to silence them.

HISTORICAL STOP: the person reported password sign-in failure. The exact original
onboarding transaction was proven ended; native staff `enabled=false` was then
written/verified first, and Production `STAFF_PORTAL_ENABLED=false` was
written/verified second. At 18:22:06.082 UTC, false-flag deployment
`dpl_84xySREwUbFjn3HdN7jojavpuqfe` was verified READY at exact app revision
`bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`, with owner/project and apex/www
aliases verified. Fresh live closure passed 19/19 at 18:24:29.004 UTC, safe receipt
`post-sign-in-failure-live-closure`. Both staff gates were false at this checkpoint. Previous
restricted READY/anonymous-boundary passes are historical and do not establish
a successful human sign-in.

Historical sanitized diagnosis: five native Auth logs during 18:11–18:24 UTC all returned
400 `invalid_credentials`, with no database/permission/hook errors reported.
A private in-memory bcrypt 5.0.0 comparison passed at 18:23:39.170 UTC: the staff
email/password saved at that historical checkpoint matched the stored account. No values/hashes were
displayed, no Auth session was created and no reset was performed by that check.
This does not establish what was entered in the failed human attempt.

The person clarified trying several passwords, including the database password;
the exact failed inputs remain unknown. At 18:35:46.666 UTC, one direct native
Supabase password attempt using the exact saved staff credentials PASSED HTTP 200.
The temporary test session was immediately logged out with local scope; native
readback verified zero sessions, one user, zero factors/invitations, false pairing,
zero recovery holds and participant/staff access closed. This establishes that
the saved account credentials work; it does not establish browser password/TOTP
or human-entry success. No values, tokens or sessions were displayed.

The login rate window naturally expired at 18:31:30.451242 UTC before this one
attempt; no counters were cleared/reset/bypassed. Preserve the single account,
immutable audits/history and zero factors/invitations/recovery holds with pairing
false. Continue only authorized first-person onboarding after the actual checks
pass; do not create/invite a second person without actual inputs. An unanswered
prompt or elapsed time is not completion.
Participant/all other operational workflows, wider paired-admin administration
and exports remain closed. No real email, extra account or paid resource occurred.

CURRENT RESUMPTION PASS: deliberately reviewed `first-admin-onboarding-resume-1`
began at 18:44:33.572 UTC. Fresh deployment
`dpl_3fLCso6cBALW2RiCQdKBJXZyfhSP` was created at 18:44:41.732 UTC and verified
READY/current serving Production at 18:45:50.502 UTC, with exact `bbb790f1`
application source, project/org/repository/owner and apex/www binding. At
18:46:02.033 UTC, `first-admin-onboarding-resume-1-live` PASSED: two EN/AR staff
sign-in/noindex checks, three anonymous privileged denials, 16 participant/
operational closed checks and public navigation/robots staff exclusion.

Historical pre-enrollment native snapshot PASSED at 18:47:06.987 UTC: one user/profile/
account/grant and one active Super Admin; factors, sessions, invitations, recovery
holds, admissions, participant profiles, staff email challenges and native OTP
all zero; cap 36/day and pairing false. Both current staff gates are true for
restricted onboarding of this existing single admin. Participant/generic readiness
stays false. Blank English browser refreshed for private handoff; human password/
TOTP input requested at 18:47 UTC was PENDING — NOT TESTED at that snapshot.

Independent operator-helper review caught the separate existing 20 form-events/
IP/hour ceiling and added a conservative pre-enable guard. Receipt checks require
strict booleans; counters were never reset/bypassed. No application/migration/
product code changed in this round. Native credentials and anonymous checks do
not complete human browser/TOTP or wider paired-admin acceptance.

CURRENT COMPLETION: the person reports completed own-device authenticator
enrollment and that staff sign-in works. This is manual human-reported completion.
Independent reviewed read-only native SQL PASSED at 18:58:37.866 UTC:

- One user/profile/account/grant and one active individually identified Super Admin.
- Verified TOTP factors 1, unverified 0, other factor types 0.
- Native staff/password/native-bound TOTP AAL2/live-observed strongest-assurance
  session counts each 1, describing the same completed flow. Current native
  authentication time matches last sign-in and profile last sign-in is recorded.
- Audited sign-in allowed, TOTP enrollment/challenge/verification completed each 1.
- Pairing false; staff gate true/cap 36; recovery/invitations/admissions/participant
  profiles/staff email challenges/native OTP all 0; participant/generic readiness false.

This proof inspected the person's completed flow without creating/entering
authenticator material. Actual signed-home DOM is NOT OBSERVED because the
person's staff tab is outside controlled browser inventory; no automated
signed-home DOM pass is claimed. Other-admin recovery, real inbox, paired-admin/
wider staff UAT, live axe and Arabic native-reader acceptance remain NOT COMPLETED.
Existing synthetic/CI checks are separate. Private credential/identity values are
not recorded, and no second account/invitation or operational workflow is opened.
Post-completion live receipt PASSED at 19:03:47.271 UTC:
`first-admin-onboarding-resume-1-after-human-live`, on the same serving deployment,
with two EN/AR SSR/noindex checks, three anonymous privileged denials, 16 participant/
operational closed checks and no public staff navigation/robots exclusion PASS.
Its explicit `strongAssuranceVerifiedByThisProbe=false` keeps anonymous HTTP proof
separate from the human report/read-only native strongest-assurance proof at
18:58:37.866 UTC. Fresh private-input ACL boolean PASSED for current-Windows-account
access only, with values/location withheld. At 19:06:15.068 UTC, reviewed read-only
bcrypt validation of the newly saved private password returned STOP: email matches
the account, password does not. No value/hash was displayed and no session,
mutation, reset or email resulted. Earlier matching receipts remain historical.
The completed human/native sign-in evidence remains valid. The person clarified
that the newly saved password is an intended account password change, rather than
the working password. That change has NOT BEEN APPLIED. The existing native guard
permits invitation admission and other-admin recovery only; it rejects ordinary
own-password changes even from a valid TOTP session. A separate reviewed
authenticated password-change flow is being prepared on a branch from current
main. It must retain the working authenticator, require fresh owner password/TOTP
proof, audit the change and revoke sessions. No self-recovery reset, bootstrap
replay, new account, email or additional hosted migration has occurred.

On failure with a known ended enabling transaction, immediately close native
`msrc_staff.policy.enabled`, keep/set `STAFF_PORTAL_ENABLED=false` and redeploy as
needed, then verify current/stale requests deny. For an uncertain original
enabling transaction, first prove the exact original attempt/backend ended using
the private attempt marker/PID/backend-start/transaction-start at full microsecond
precision; missing marker means STOP. Then verify persistent native false, so a
late original commit cannot reopen it; later deployment completion still denies
through that native gate. Preserve native guards/mail suppression, immutable audit/authority/
migration history, reservations, revocation and recovery holds. A new ROLLBACK does
not undo committed DDL; reconcile the original backend's unknown transaction
outcome before any replay or ledger repair. Use reviewed forward correction or
the [backup/restore reconciliation plan](features/STAFF_BACKUP_RESTORE.md).

Earlier checkpoints below are historical. This entry supersedes their pending/
blocked state only for the actual completed stages above; remaining human and
wider release gates are not implicitly passed.

Documentation validation at the completion checkpoint PASSED: 97 relative links
across the five changed records, six migration SHA-256 receipts, private-value
screening and whitespace checks. Exact revision
`3c0398995aff0e83990da6e290fddfff1033ab63` PASSED all six CI jobs and Vercel,
verified at 19:30:43 UTC: [foundation](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37672452948),
[staff](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37672452980),
[participant](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37672452993).
This later clarification entry requires its own checks; those receipts do not
certify an untested later revision. [PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45)
remains draft.

## 7 October 2026 — Private backup and restore proof; restricted setup continues

ORG-046 execution authorization persists. The corrected private database password
now authenticates as native `current_user=session_user=postgres`, with BYPASSRLS,
on the approved project's IPv4 session pooler. Direct IPv6 is unreachable from
this machine; no TLS check was disabled. The frontend certificate and hostname
are verified with `sslmode=verify-full`. `pg_stat_ssl` separately reports that the
pooler-to-database hop is not TLS; this is not claimed as end-to-end encryption.

- PASS (16:49:39 UTC): protected full PostgreSQL custom archive and password-free
  role backup, outside the repository and restricted to the current Windows
  account. Original archive hashes remain unchanged. The actual Free project
  still reports no managed backup; this locally held logical backup is not PITR
  or a provider-settings/credential backup.
- PASS: full restore into matching Supabase PostgreSQL `17.6.1.171`, network `none`,
  no published ports, native Unix socket only. The source owner/UTF8/ICU `en-US`
  locale is reproduced. Password-free roles, membership grantors/options and
  bootstrap role identity are preserved. No application/Auth account is created.
- PASS: all 17 catalog sections, 47 dumped tables inventoried, all application/native data
  compared, four sequence definitions and non-runtime values, 49 extension
  member-function owner/ACL checks, immutable guards, forced RLS, effective API
  grants, original migration rows, Contact job/configuration and data match.
  Standard dump extension-owner/initial-ACL limitations were resolved on the
  disposable clone by exact-version precreation and captured source ACL replay;
  the unchanged archive and its supplemental restore manifest are retained.
- PASS: the archive's 881 cron history rows match the live source prefix through
  the archived run ID. Only newer scheduled cron history and `runid_seq` are
  dated runtime deltas. Production scheduling/history was not changed, and clone
  history was not overwritten to force equality. See
  [the restore receipt and procedure](features/STAFF_BACKUP_RESTORE.md).
- PASS: Supabase Auth management and Vercel project/environment read requests
  accept the privately saved tokens. Current Production is still merged main
  `bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`. Both account flags are absent;
  the existing sensitive Resend key is configured but cannot be decrypted through
  the supported read API. No secret value was displayed or added to logs/source.
- PASS: reviewed bootstrap transport extension accepts only the actual approved
  session pooler/project username/5432 or matching direct target. Native identity
  is checked on every SQL connection; ambient libpq routing/options and unrelated
  secrets are excluded. Independent review passed after the allowlist fix.
  `vitest` ran 128 tests across bootstrap/staff/MFA suites, including 41 focused
  bootstrap cases; scoped ESLint, `tsc --noEmit`, inert invocation and whitespace
  checks passed. Draft PR/exact-head CI receipt follows separately.
- PASS (16:59:02 UTC): all six unchanged reviewed files executed sequentially on
  the restored **offline** clone as native postgres, with original-version local
  ledger entries and individual postchecks: 674, 939, 939, 994, 1,609 and 2,337
  assertions (7,492 total). Final inventory is 32 private tables, 92 MSRC functions,
  41 authored triggers and eight history entries. Every staged policy stays
  closed; native identities and application records stay empty. One checker
  originally compared JSON OID string `"10"` to a number; its type check was fixed,
  the already committed local stage was reverified without replay, then stages
  2–6 proceeded. This is catalog/data compatibility proof, not human Auth UAT.
- PASS (17:03:21 UTC): five real offline native bootstrap-guard cases. Correct
  postgres/current/session/database admits; wrong session user, a role label
  spoof, wrong database and wrong current role all stop with SQLSTATE 42501 before
  the subsequent statement. No mutation/account/email was used for these checks.
- PASS: private display-name syntax and normalized designated-person/given-name
  match. The input remains private and its actual identity values are not logged.
  Auth management/Vercel tokens are accepted. Hosted native Auth health reports
  GoTrue v2.197.0, matching the genuinely tested version. Fresh 17:06:32 UTC EN/AR
  staff and staff/participant API GET probes remain closed.
- PASS: the organizer's signed-in Resend dashboard was read without sending or
  changing settings. Free transactional plan: 0/100 daily used, 3/3,000 monthly,
  team rate limit ten requests/second, approved sender domain Verified, paid
  overage disabled. ORG-046's within-current-quota authority selects staff 36/day
  alongside Contact 60/day: 96/day and at most 2,976 over 31 days. First-admin
  TOTP uses zero transactional emails; other accounts/consumers stay out of scope.
  The same cap must be used server-side and in the staff database. No read-only
  Resend key is required; the authenticated dashboard supplies this evidence.
- CI FAIL / RESOLVING: draft [PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45)
  was created at `5e18365` through existing Git authorization after the connector
  reported insufficient write access. All three database/native jobs passed.
  Staff browser job 112910509071/run 37655941732 passed 25, skipped four and failed
  one desktop logout axe audit: the destination title streamed after axe started.
  Trace timing confirms this incomplete navigation barrier. The test-only fix
  waits for sign-in screen, localized heading and exact title before unchanged
  axe rules; EN/AR desktop/mobile targeted cases pass 4/4, scoped lint/whitespace
  pass. No retry, timeout or security assertion was weakened. Hosted setup stopped
  before migration 1; independent review and exact-head CI rerun follow.

Production at this checkpoint: the same two applied migrations; all six pending
files, settings changes, first-account bootstrap and human TOTP remain
NOT EXECUTED/NOT TESTED. No invitation, email, paid resource or extra account.
The earlier password-placeholder/transport failures are resolved without changing
Production credentials, access policy or flags.

Continue within the existing authorization after the remaining prerequisites
pass. Retain the private restore evidence; do not run blanket database push,
reset, seed or a replay against hosted native data. Current rollback requires no
hosted action because none was changed. For any later committed stage, keep both
staff gates closed and preserve audit/history; use a reviewed forward correction
or the documented restore/reconciliation plan, never a post-commit `ROLLBACK` or
manual weakening of guards.

## 7 October 2026 — Authorized Production staff setup: preflight blocked before migration 1

The organizer explicitly authorized the six pending migrations, staff-only
configuration and only their first Super Admin bootstrap/restricted onboarding,
without repeated manual execution approvals. Scope and continuing authorization
are recorded in ORG-046. Participant/other workflows and the two-admin safeguards
remain intact. No other account or invitation is authorized without actual inputs.

Freshly fetched main remains `bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`.
Open PR preflight found none; `codex/staff-production-setup` starts from that main.
All three merged-main push workflows are SUCCESS at that exact head: staff
37632935182, participant 37632935416 and foundation 37632935279. No application,
SQL, test or configuration source changes were needed by independent bootstrap/
interface/database review. This entry records prerequisites, not completed setup.

Observed read-only Production checks, 15:04–15:33 UTC on 7 October:

- PASS: designated Supabase project `ecemjggwlzqpjcwmchrl` is ACTIVE_HEALTHY in
  `ap-northeast-1`/Tokyo, matching the published location disclosure; native
  PostgreSQL 17.6 image release `17.6.1.171`, matching the M1 disposable rehearsal.
- PASS: `current_user=session_user=postgres`, native postgres BYPASSRLS true
  (superuser false), required Auth SELECT/UPDATE/REFERENCES rights true; all 21
  native columns and helper return types match the reviewed M1 assumptions.
- PASS: only `20261002173712` persisted authorization and `20261004114603`
  Contact are recorded. Pending schemas absent; users, sessions, factors,
  authority accounts, grants and audit are all zero. Four existing authority
  tables remain postgres-owned with enabled/forced RLS and no API private rights.
  Contact counters are zero and its five-minute expiry job remains active.
- PASS: all six pending SQL files match merged-main bytes and reviewed hashes.
  No file/statement/guard was modified and no synthetic seed was applied.
- REVIEWED: security advisor reports five INFO no-client-policy findings for
  intentionally private forced-RLS tables and one known authenticated own-context
  [SECURITY DEFINER warning (0029)](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
  The [no-policy information (0008)](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
  describes intentional client denial. No grants/RLS were widened to silence it.
- BLOCKED: the Supabase organization is Free and its authenticated project
  overview explicitly reports **Last backup: No backups**. No manual backup or
  successful restoration evidence/private backup destination has been supplied.
  No paid upgrade was purchased and no unsupported substitute was called a backup.
- INPUTS PARTIAL: the organizer-provided private file now contains an email and
  a password that satisfy the syntax/ten-character/72-byte checks. Values were
  never printed or copied to the repository. Native postgres connection and
  modern server/management credential references remain absent. A private
  backup destination/reference was requested and remains outstanding.
- NOT READY: `psql` is absent from the operator PATH; installing a trusted local
  runtime is a routine remedy within the authorization, not another approval gate.
  The reviewed bootstrap
  accepts only the matching direct native postgres TLS host, not a pooler/browser
  key. Do not attempt native identity creation before this operator path works.
- ACCESS PARTIAL: the Vercel connector returns 403 for the designated scope and
  no authenticated local CLI is available. The existing authenticated browser
  reaches the correct MSRC Hobby project and reads variable-name metadata without
  revealing secrets: no staff/participant enable flag or staff test mode; Resend
  entries exist. The connector failure does not establish loss of browser access
  or inherently require another Vercel credential; the authenticated browser may
  supply that management path. No browser settings or credentials were changed.
- PASS: seven fresh live GET checks at 15:33 UTC: EN/AR staff sign-in pages are
  404; staff and participant APIs under both language headers return exactly
  closed-state 503 responses without Set-Cookie; health returns 200 with
  `workflows="closed"`. The corrected probe uses the repository's actual API
  paths; no sign-in, enrollment or mutation request was sent.

Stopped before migration 1 on the actual failed backup check and missing private
operator inputs. **In Production, all six migrations, staff configuration/
enablement, bootstrap, sign-in and TOTP remain NOT EXECUTED/NOT TESTED.** The
completed disposable rehearsal is separate evidence. Hosted activity consists only
of the metadata/count reads above; no DDL/history write, settings/flag change,
account/factor/session creation, email or paid-resource operation occurred.
The authorization persists when these inputs/checks are resolved.

Independent documentation/security review and `git diff --check` PASS. The new
entries contain no actual identity or credential values. Only DECISIONS and
PROGRESS changed; functional tests were not rerun for these documentation-only
changes. Existing exact-head CI and the completed disposable rehearsal remain
separate evidence, not proof of hosted backup, configuration or human TOTP.

Resume by establishing a private supported backup and disposable restore proof,
native TLS/operator access and Supabase Admin credentials, plus a working service
management path. Reuse authenticated management access where available; do not
ask for fresh credentials or execution approval unless actually necessary.
Recheck target/ledger/definitions immediately before each single-file operation;
apply only the ordered reviewed six, inspect metadata/ACL/closed-policy and
preservation after each, then align only that original version. Do not use blanket
push/reset/seeds. Native hook/password/TOTP settings and staff values follow all
six verified guards. Keep both staff gates false for the sole bootstrap; only
then open its restricted onboarding. First-admin TOTP requires their own device;
do not generate a replacement identity or another administrator to bypass inputs.

Rollback for this stopped attempt: **nothing to undo**. For later authorized
execution, stop on the first error/unknown commit, establish the original backend
outcome before retry/history repair, retain committed schema/immutable history
and use reviewed forward correction or the verified backup/reconciliation plan.
If onboarding fails, close `msrc_staff.policy.enabled` immediately, set the server
staff flag false and redeploy; retain stable secrets, authority/audit, revocation
cutoffs and any partial native account/factor evidence. Do not drop guards,
erase users/history, waive the two-admin rule or self-reset to repair a failure.

## 7 October 2026 — Documentation PR and migration 1 execution packet

Opened [draft PR #44](https://github.com/xpexellent-dotcom/msrc-2027/pull/44)
from `codex/staff-activation-checklist` at requested commit
`9dfeea0522796626b0c9523c0bc647a5e7a5b450`, against current `main`
`2a991d2a13fa9b0b7f04877d2001ad95f134f136`. Open PR preflight found none.
GitHub confirms the initial diff is documentation only: PROGRESS, the staff guide
and activation checklist. The existing original checkout's work remains preserved.

Prepared [the migration 1 execution packet](features/STAFF_MIGRATION_01_PACKET.md)
for only `20261002193800_staff_mfa_session_foundations.sql`; the activation
checklist links to it. IDs: BL-AUTH-05/06, AUTH-04/05, ROL-12, SEC-01/02/06.
The immutable SQL at the requested revision has Git blob
`b16421c5e729c225716b87352de3aba6ead2e0ba`, 27,028 bytes, and SHA-256
`ca8571443fe0390f25772f3fbd6014ac17e959eb79f70c2067b143ddcabd8108`.
Committed and working-file bytes match; no migration was edited or generated.

The packet covers prerequisite/target/backup/compatibility review, catalog-only
pre/post checks, future one-file transaction and exact-version history alignment,
safe evidence and failure/unknown-commit handling. Every execution step remains
PENDING. It explicitly stops before migration 2, settings, onboarding or activation.
The 12:42–12:43 UTC hosted/live receipts below are dated prior evidence; this
preparation does not refresh them or execute the future preflight queries.

Static review distinguishes migration 1's intermediate historical phone/SMS
assurance from the final ORG-015/016 staff email/TOTP policy supplied later. Both
generic readiness flags remain constrained false; recency/warning values remain
NULL. No phone/SMS setup or interim login is authorized. The migration creates
four private forced-RLS tables, eight private functions and three new authenticated
RPCs, replaces access context and adds nine triggers. It creates no native Auth
table trigger or email hook. Own-context/logout RPC calls can write audit/session
state; they are excluded from read-only verification. Future referenced Auth-user
deletion and account-suspension effects are documented without altering safeguards.

PASS: independent technical/documentation review, exact hash/blob/byte comparison,
all nine migration inventory entries, 23 checklist and nine packet local links,
the 4-table/8-private-function/4-public-function/9-trigger inventory, and
`git diff --check`. The two SQL snippet blocks were inspected as catalog/count
SELECTs without execution; their runtime verification remains NOT RUN. All 56
activation and 21 packet operator checkboxes remain unchecked. The final prepared
diff contains four Markdown documentation files only: PROGRESS, staff guide,
activation checklist and execution packet.

Review clarified that schema-local default ACLs cannot remove global/default
PUBLIC execution; current private functions have explicit revocation. The packet
checks both ACL scopes and requires identifying the actual DDL backend before
execution, so unknown outcomes cannot be inferred from another connection's PID
or catalog absence. The historical migration is unchanged.

No hosted or local SQL, migration, history repair, native Auth request,
flags/settings change, bootstrap, real email or manual CI dispatch is performed.
Ordinary PR checks use the existing disposable synthetic workflows; their status
is separate from operator execution or hosted approval. No fresh database or
browser run is claimed for this documentation preparation.

## 7 October 2026 — Merged staff foundation, live closure and activation checklist

Scope: BL-AUTH-01, BL-AUTH-05/06 staff, BL-RPT-01/03; ORG-043/044/045.
Read-only verification and operator documentation only. No open PRs were found
before creating `codex/staff-activation-checklist` from freshly fetched
`origin/main`; the original checkout's local work remains preserved.

GitHub confirms [PR #43](https://github.com/xpexellent-dotcom/msrc-2027/pull/43)
merged at 12:35 UTC on 7 October, producing
`2a991d2a13fa9b0b7f04877d2001ad95f134f136`. This supersedes the earlier dated draft
status receipts. Code, migrations, scripts, tests and workflow files match the
verified final PR revision `315c2b8`; `git diff 315c2b8 origin/main -- src supabase
scripts tests .github` produces no changes.

Vercel's read-only deployment inspection confirms the live domain serves that
exact `main` commit: Production deployment `dpl_GbXLZzMsnb1eZTHtVcLXtJvRJDyY`,
READY, with `msrc2027.com` and `www.msrc2027.com` aliases. An encrypted environment
metadata listing, without decrypting values, contains no `STAFF_*` variables and
no participant enable flag. The server gate is therefore unset and closed.

Observed live results at 12:42–12:43 UTC / 15:42–15:43 Asia/Riyadh:

- PASS: `node .tools/verify-live-staff-closure.mjs` — 82 HTTP probes. Twelve EN/AR
  staff paths return 404 with no forms and noindex metadata. Nine staff API GET
  probes and all 18 action branches under each locale return 503 with exactly
  `{"state":"closed"}`, no Set-Cookie, private/no-store caching and noindex headers.
  HEAD/OPTIONS/PUT/PATCH/DELETE also fail closed. Action probes supply only an
  action label, no identity, password, code, target or delivery address; closure is
  checked before them and the deployed handler closes before provider construction.
- PASS: the same HTTP receipt covers four synthetic Auth-preview GET/POST denials
  (404), all fifteen generic operational API GET denials (503 WORKFLOW_CLOSED),
  and robots exclusions for `/*/staff` and `/api/`.
- PASS: real Chromium desktop and Pixel 7 browser visits — all 24 staff cases
  (six routes × two locales × two viewports) follow apex 308 to the same www path
  and return 404. No forms, private data, staff menu, staff links or public
  header/footer are rendered. EN is `lang=en` / LTR; AR is `lang=ar` / RTL with
  localized Arabic 404 content. Four public-home visits return 200 with no staff
  links. Staff responses have private/no-store caching, no-referrer and noindex
  metadata. Console errors are the expected 404 resource responses only.
- PASS: 28 ignored browser screenshots and sanitized HTTP/browser receipts saved
  under `test-results/staff-live-evidence/`; EN/AR desktop/mobile sign-in captures
  were visually reviewed. Authenticated live screens and live axe were NOT TESTED.
- PASS: read-only hosted migration ledger contains only
  `20261002173712_persisted_authorization.sql` and
  `20261004114603_contact_abuse_counters.sql`. A catalog-only SELECT confirms
  `msrc_staff`, `msrc_sessions` and `msrc_participant` schemas remain absent.
  None of the six pending #25/#39/#43 migrations was applied.

PASS: all three GitHub push-to-main workflows and all six check runs on the exact
merged SHA above have completed successfully; Vercel's commit status also passes.
Actual completed job logs establish:

- [Staff CI 37622051762](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37622051762):
  native job 112794463061 passes all 17 genuine cases and 818 SQL assertions;
  browser job 112794462590 passes 28 default-off and 26 enabled EN/AR cases,
  with four intentional desktop skips. Persistent partial-failure/interrupted
  recovery, fresh login/enrollment denial and other-admin restoration are covered.
- [Foundation CI 37622051990](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37622051990):
  database job 112794462630 passes 818 SQL assertions in eleven files and all
  75 integration cases in eight files. Application job 112794462516 passes
  lint/types, 2,207 units in 51 files, production build, 443 site-wide browser
  cases (25 intentional skips), 81 legacy staff cases and 44 Contact mock cases.
- [Participant CI 37622051702](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37622051702):
  native job 112794460388 passes 19 genuine cases and 818 SQL assertions;
  browser job 112794460258 passes 26 default-off and 54 enabled synthetic cases.
- All three database jobs report strict lint and security advisors clean; the
  actual native image is `public.ecr.aws/supabase/gotrue:v2.197.0`. These are
  disposable Linux results, not hosted migration or managed-project UAT.
  Optional hydration repetitions/five cold integration passes were SKIPPED.
  No CI rerun or workflow dispatch was issued by this verification.

Prepared [the activation checklist](features/STAFF_ACTIVATION_CHECKLIST.md), with
all nine repository migration files listed separately: one development-only
fixture excluded, two applied migrations to skip, and six missing migrations in
dependency order. It includes individual migration evidence, Production-only
variables, native Auth guards/hook, private first/second account onboarding,
durable recovery rehearsal, shared email budget, UAT and closure rollback.
Every operational checkbox remains pending; this document is not activation
authorization. The feature guide links to it and distinguishes code merge from
hosted application. No organizer decision or policy value changed.

PASS: independent source review, `node .tools/verify-staff-activation-docs.mjs`
and `git diff --check`: nine migration entries with the exact six/two/one
dispositions, 56 unchecked operational items, 22 resolving checklist file links
and no copied designated identities. Changes are limited to these three
documentation files; application code, migrations, tests and settings are unchanged.

NOT PERFORMED: hosted migration application, production settings or flags changes,
live bootstrap, account/factor/reset/grant changes, real emails, DNS or paid
resource changes. Human inbox/device/screen-reader/mutual-recovery UAT, approved
combined email forecast, recent-auth/warning timing and privacy/retention release
evidence remain gates. The next task is separately authorized operator rehearsal
and gate sign-off; staff, participants and operational access remain closed.

## 6 October 2026 — Arabic policy terminology consistency

Continued open [PR #42](https://github.com/xpexellent-dotcom/msrc-2027/pull/42) in the
attached clean policy worktree from `efe4988`; current main and unrelated local
work were preserved. Explicit organizer editorial follow-up is recorded under
ORG-037. IDs: BL-PUB-08, PRV-01/02, LOC-01/03, CMS-04, ACC-01.

Both Arabic source documents and their embedded rendered content now use
«مسابقة الأطروحة في ثلاث دقائق» (four occurrences), «ولائحته التنفيذية» (two),
and «الباحث الرئيسي» in the inflected sentence «للباحث الرئيسي» (one).
No other policy wording changed. Independent byte comparison confirmed both
embedded Arabic texts equal their Markdown sources, and English literals/source,
metadata, version 1.0 and effective date `2026-10-06` remain unchanged. The existing
legal-terminology assertion now follows the corrected organizer wording.

Verification with Node 24.21.0 / pnpm 11.19.0:

- PASS: `pnpm check` — lint/types, 2,043 unit tests/46 files, 65-page build.
- PASS: `pnpm exec playwright test tests/e2e/policies.spec.ts` — 18/18 cases,
  current/stable EN/AR desktop/tablet/phone pages, links, keyboard/RTL/zoom and
  24 policy axe scans with zero violations; existing header-button contrast
  manual-review records remain as documented in the initial publication entry.
- PASS: `node .tools/arabic-policy-render-verify.mjs` — eight Arabic current/stable
  phone/desktop visits, exact requested phrase counts, no stale phrases, unchanged
  v1.0/date, targeted screenshots. Source/header layout has not changed.
- PASS: source/diff audit — only the seven requested Arabic substitutions in each
  source/embedded set, no doubled prefixes, English and config unchanged.
- PASS: `git diff --check`; no account flag, hosted, migration or AI change.

Ignored evidence: `deliverables/policy-v1.0/arabic-consistency-check.log`,
`arabic-consistency-browser.log` and `arabic-consistency/verification.json` plus
phone/desktop section captures. Existing policy browser evidence is refreshed.
Hosted checks for the new PR head are reported separately in the PR; prior green
receipts remain historical. Human native-reader approval, physical devices and
live publication remain NOT TESTED. Next: review/merge the updated policy PR;
account and AI activation stay separate. Rollback: revert this editorial commit.


## 6 October 2026 — Approved Privacy Policy and Terms v1.0 publication

Started `codex/policy-v1-publication` from current `origin/main` at `60c5c7c`.
GitHub open-PR listing returned no open PRs before implementation; shared logs are
not feature overlap. Used an isolated managed worktree, preserving the original
checkout's local changes. Cherry-picked organizer source commit `48017fa` from
`docs/policy-text-v1` as `113b697`; the two English source files are unchanged.
Authority and supersession: ORG-037–042. IDs: BL-PUB-08, PRV-01–08, AUTH-01/06/08,
REG-01/05, AI-01–06, PAY-01/04/05, LOC-01/03, ACC-01, CMS-04, CFG-09/10/12, REL-01/06.

Published exact English wording with complete formal Modern Standard Arabic source
and equivalent section/list/table structure and localized links. The only source
header adaptation is displaying the requested version label and actual effective
date from `src/config/policies.ts`: `2026-10-06`, formatted using the existing EN/AR
Gregorian date style. Current and stable `/{en|ar}/{privacy|terms}/v1.0` pages share
approved content; short `/privacy`, `/terms` and `/v1.0` aliases select the site's
locale preference. Existing design and native section navigation remain; semantic
row/column table headers and LTR-isolated domains/emails support Arabic reading.
No public draft banners/placeholders/review notices remain. Retired dated-draft
URLs return 404. Production pages are indexable with sitemap/hreflang; preview/local
noindex protection remains.

`approvedParticipantPrivacy` now contains EN/AR v1.0 summaries and stable policy
links. Closed sign-up shows the summary/link without fields or provider requests.
Account flags, hosted migrations/settings, database readiness and activation steps
are unchanged. Faculty of Medicine, KAU controller/RPClub agency, registration-only
identity numbers/internal list, DeepSeek China, minimum age 18, password minimum 10,
never-verified deletion after 30 days, Arabic precedence and Faculty payment platform
are recorded in DECISIONS and related requirements/backlog. Registration identifier
controls/encryption if feasible/deletion, age enforcement/cleanup and the switch from
PR #40's disabled Anthropic adapter are separate tasks. No field, migration, payment,
AI transport, real message, hosted configuration, merge or production deployment.

Executed locally with Node 24.21.0 / pnpm 11.19.0:

| Check | Result and observed evidence |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS; pinned lockfile unchanged. |
| Final `pnpm check` | PASS; zero-warning lint, route types/tsc, 2,043 unit tests in 46 files, 65-page build. |
| `pnpm exec playwright test tests/e2e/policies.spec.ts tests/e2e/participant-closed.spec.ts tests/e2e/contact.spec.ts tests/e2e/public-shell.spec.ts tests/e2e/closed-workflows.spec.ts` | PASS; final 114/114, no failed/skipped/retried cases. Exact rendered EN paragraphs/lists/cells, AR structure/links, versions/dates, native keyboard/locale/hash navigation, 320px/200% text, closed accounts and APIs. |
| `pnpm exec playwright test --config playwright.participant.config.ts` | PASS; 54/54 synthetic desktop/tablet/mobile presentation and recovery cases; no real account/email/provider. |
| Policy/sign-up axe | PASS; 24 current/stable EN/AR desktop/tablet/phone policy scans and four closed sign-up scans had zero violations. Manual-review items retained; not a full human accessibility audit. |
| EN/AR phone/desktop screenshot review | PASS; heroes, complete tables and source clauses inspected. Date precedes the Privacy introduction; Arabic payment-domain punctuation isolated correctly. Table-only captures hide floating navigation overlays for unobscured evidence. |
| `VERCEL_ENV=production pnpm build` then local `node .tools/policy-production-verify.mjs` | PASS; eight policy routes HTTP 200 with index/follow, no X-Robots noindex, correct canonical/hreflang and shared date. Sitemap contains four localized policy entries, retired drafts 404, sign-up notice v1.0/no form, account API 503 closed/no cookie. |
| Official KAU EN/AR privacy link GETs | PASS; both HTTP 200. All internal policy links checked HTTP 200 by browser suite. |
| Source/scope/docs checks | PASS; four embedded Markdown strings match source files, exact EN body comparisons, original English source unchanged; no package/lockfile/Supabase/AI/workflow-flag diff; 156 relative doc file targets resolve (anchors not checked), 165 unique issue rows and unchanged 212 source-coverage rows. |

The first affected browser run passed 114/114. After the date-placement adjustment,
a second run passed 113/114 and caught a Contact test route-readiness race: URL
arrival preceded streamed title metadata, so axe scanned an empty title. Trace
proved the timing; added exact destination title/H1 assertions before axe and kept
all rules/assertions. Focused EN/AR desktop/tablet/mobile repeat passed 18/18, then
the final full affected set passed 114/114 after the Arabic bidi/evidence corrections.
No retry, sleep, timeout increase or weakened assertion. Existing Next NoFallbackError
server logs occur on deliberate invalid-route probes; asserted responses are 404 and
valid policy pages report no browser errors. Failure trace and diagnosis are retained.

Ignored local evidence: `deliverables/policy-v1.0/` (check/browser logs, 24 axe JSON,
full-page/hero/table EN/AR screenshots, retained Contact failure and production
verification JSON); normal Playwright reports contain the attached evidence.
Hosted CI is verified separately on the exact pushed PR head and reported in the PR
checks/task handoff; these local passes do not infer hosted success.

NOT TESTED: native Arabic reader/editorial approval, physical phones, screen reader,
Safari/Firefox, real inbox/processor/payment/data-deletion execution and hosted
workflow activation. Organizers should have a native Arabic reader review both
translations because Arabic Terms prevail; this publication task does not certify
that review. Next: merge/release the reviewed policy PR, then separately implement
approved registration identifier safeguards, age/30-day cleanup and DeepSeek switch
before opening their corresponding workflows. Rollback: revert this publication
commit; leave account/AI flags and hosted readiness unchanged. Feature handoff:
[Contact and policy publication](features/contact-privacy-terms.md).


## 5 October 2026 — PR #41 confirmed venue details and corrected map

Continued the attached `codex/organizer-copy-venue-numbering` worktree from
`447e589`; the branch was clean and the original checkout's work is preserved.
ORG-035/036 record the explicit organizer authority and supersede ORG-034's
empty visitor guidance, optional visa link and initial schematic presentation.
IDs: SCP-02, CFG-01, LOC-01/03, ACC-01, PRV-01/07, CMS-04 and REL-01.

The exact EN/AR 35–40-minute car estimate appears on taxi and rental only.
All six venue items render: Main Gate/Wing Gate, QR ticket, accessible parking,
organizer accessibility support with localized contact link, prayer/food and Wi-Fi.
The international note keeps UTC+3 and states attendee visa responsibility and
that MSRC cannot provide invitation letters; the visa URL field/link is removed.
The map combines airport/Haramain station, runs the railway south to Jeddah
Al-Sulaymaniyah, places the venue label beside its pin in the campus area and
names only Abdullah Sulayman St. Simplified phone labels preserve north-up,
sea-west geography in EN/AR. Existing dates/calendar/directions and pending
session/door/room status stay; no extra facility, route or schedule is inferred.

Final local verification (Node 24.21.0 / pnpm 11.19.0):

- PASS: `pnpm check` — lint, types, 2,042 units in 46 files and 65-page build; exit 0.
- PASS: affected Dates & venue, travel, organizer-public and public-shell Playwright
  suites — 62 passed, two duplicate matrix skips, zero failed/flaky; exit 0.
- PASS: exact six EN/AR items, taxi/rental estimate only, visa policy without a link,
  localized contact links, encoded map destinations and empty optional-field behavior.
- PASS: whole-label and shaped-line bounding boxes, line-stroke intersections and
  campus/pin containment at 320/360/390/430px EN/AR, with unmirrored SVG geography.
  The first run caught a phone north-letter/coast intersection; the north marker
  moved into the sea area, then the check and entire affected browser set reran.
- PASS: four travel all-request origin checks — zero third-party requests; four
  travel axe scans — zero violations, incomplete/manual-review items retained.
- PASS: four EN/AR phone/desktop screenshots and browser inspection; no browser
  errors. Independent React/source/scope and diff review pass. No retry/timeout
  increases or weaker assertions were used.
- NOT TESTED locally: physical devices, screen reader, actual provider routing or
  native database fixtures; isolated hosted CI verifies the latter independently.

Ignored evidence: `deliverables/venue-confirmed-2026-10-05/`, including screenshots,
axe JSON, final check/browser reports and retained first-failure evidence.
Exact pushed-head hosted receipts are maintained in PR #41/task handoff; verify
[PR checks](https://github.com/xpexellent-dotcom/msrc-2027/pull/41/checks) before
closing the task. Local passes do not establish hosted CI success.
See the [Getting there feature note](features/venue-travel.md) for configuration,
scope and evidence. No backend/schema/package/lockfile, hosted configuration,
workflow opening, real communication, merge or production publication.
Next: organizer visual review and separately confirmed session/door/room details.

## 5 October 2026 — PR #41 Getting there follow-up

Continued the attached `codex/organizer-copy-venue-numbering` worktree from
`f1eeb78`, preserving the original checkout's work. Draft
[PR #41](https://github.com/xpexellent-dotcom/msrc-2027/pull/41) was inspected:
the prior head's Foundation/Participant jobs and Vercel preview were green.
New explicit organizer decisions ORG-033/034 are dated 5 October and identify
the venue-sentence correction and the extension of the public page's scope.
IDs: SCP-02, CFG-01, LOC-01/03, ACC-01, PRV-01/07, CMS-04 and REL-01.

The location sentence now includes King Faisal Conference Center in EN/AR.
Getting there adds an original self-hosted responsive SVG schematic, airport
travel cards, encoded Google/Apple/Waze map choices and Saudi local time (UTC+3).
Optional typed travelTimes, entry gate, parking, entrances, accessibility, prayer,
food, Wi-Fi and official visa URL are empty and hidden, with no public placeholders.
No embed, map key/SDK, provider fetch/prefetch, coordinates or travel estimates.
Existing date/calendar/directions and pending session/door/room status stay.
Backend logic, workflow flags, permissions, package versions and lockfile stay.

Final local verification (Node 24.21.0 / pnpm 11.19.0):

- PASS: `pnpm check` — lint, types, 2,040 units in 46 files and 65-page build; exit 0.
- PASS: affected Dates & venue, travel, organizer-public and public-shell Playwright
  suites — 62 passed, two duplicate matrix skips, zero failed/flaky; exit 0.
- PASS: EN/AR provider destination encoding, all supplied/empty optional-field behavior,
  RTL, keyboard/language flow, calendar, existing closure and reduced motion checks.
- PASS: all-request origin monitoring from initial load through hydration, scrolling,
  map-link focus and locale navigation — zero third-party requests in four travel runs.
- PASS: four dedicated travel axe scans, zero violations; incomplete/manual-review
  items retained. Four phone/desktop EN/AR screenshots captured and visually reviewed.
- PASS: rendered SVG bounds/campus containment/pin-overlap checks, including 320px.
  Screenshot review found and corrected the initial portrait overlap; final check and
  affected browser suites were rerun. No test assertion, timeout or retry was weakened.
- PASS: independent React/source/scope review, agent-browser page check and diff checks.
- NOT TESTED locally: physical devices, screen reader, external provider routing or
  native database fixture suites. No database/authorization change.

Files/config contract and evidence are in the
[Getting there feature note](features/venue-travel.md). Ignored screenshot/axe/log
handoff: `deliverables/venue-travel-2026-10-05/` in this attached worktree. The exact
pushed-head hosted check receipt is maintained in PR #41/task handoff; verify
[PR checks](https://github.com/xpexellent-dotcom/msrc-2027/pull/41/checks) before closing
the task. No merge, production publication, real email or hosted configuration change.
Next: organizer review of visuals, then confirmed optional venue/visa guidance only.

## 5 October 2026 — Organizer public copy, confirmed venue and plain numbering

Listed open PRs first: none. Refreshed `origin/main` at `d1c643b`, then created
isolated branch `codex/organizer-copy-venue-numbering`. The original checkout's
modified logs, notes and outputs are preserved. Shared PROGRESS/DECISIONS logs do
not count as feature overlap. Explicit organizer decisions are ORG-030/031/032,
dated 5 October with the superseded public descriptions/TBD/presentation identified.
IDs: SCP-01/02, REG-01/02/03/05, PAY-03, WKS-02, TIM-01, CFG-01, DSN-02,
ACC-01, LOC-01/03, CMS-04 and REL-01.

Public EN/AR registration and workshop steps omit approval and discount details,
and tie a confirmed place to its confirmation email. Manual organizer approval,
discount support and workflow closure remain enforced by unchanged backend logic,
states/models and enforcement tests. The shared typed venue publishes King Faisal
Conference Center / مركز الملك فيصل للمؤتمرات, KAU, Jeddah, with the supplied
address, accessible Maps link, metadata, Event Place/PostalAddress and calendar
LOCATION. Session times, doors and rooms remain unannounced. Shared/source display
indices now use 1, 2, 3 / ١، ٢، ٣ and edition art 5 / ٥; date/time formatting stays.

Files and detailed evidence:
[organizer public decisions feature note](features/organizer-public-decisions-2026-10-05.md).
DECISIONS, PROJECT_BRIEF and REQUIREMENTS reconcile the new authority; original
source snapshots remain historical. No package/lockfile, database, permission,
hosted configuration, DNS, real email, workflow opening or production publication.

Observed verification (Node 24.21.0 / pnpm 11.19.0):

- PASS: `pnpm check` — lint, types, 2,031 tests in 45 files and 65-page build; exit 0.
- PASS: full `pnpm test:e2e --reporter=list,html,json` — 413 passed, 23 scope/matrix
  skips, zero failed/flaky; exit 0. Two earlier runs exposed an empty-programme test
  assumption and an existing Contact hydration race; both were corrected in tests
  without weakening assertions, extending timeouts or adding retries.
- PASS: separate auth and contact Playwright configs — 81 and 44 tests respectively,
  using local fixtures/mock providers; no real account or message operations.
- PASS: new EN/AR public registration/workshop forbidden-word regression, including
  collapsed FAQ answers, shared cards and metadata; email confirmation remains honest.
- PASS: 16 affected-page axe scans, zero violations; incomplete/manual-review items
  retained. This does not claim full WCAG certification.
- PASS: EN/AR 320/390/791/1440px numbering/overflow matrix, existing keyboard,
  enlarged-text, motion and scrolling coverage; 16 requested phone/desktop full-page
  screenshots captured and visually reviewed on this application build.
- PASS: independent scope/assertion review, agent-browser page verification and
  `git diff --check`. Negative policy-route 404 tests pass; framework
  `NoFallbackError` output from those requests remains in the browser server log.
- NOT TESTED: physical devices, screen reader, external Maps routing, native database
  fixture suites or hosted PR CI at local closeout. Evidence, reports/screenshots and
  prior failed-run traces are retained under ignored
  `deliverables/organizer-public-2026-10-05/` in the attached worktree.

Next: organizer review of the draft PR and bilingual screenshot handoff. Times,
rooms, prices and registration/payment readiness need their separate decisions and
release gates. Rollback reverts this branch's public application/content/test changes;
no database/hosted rollback is needed. Retain the explicit organizer decision record.

[Draft PR #41](https://github.com/xpexellent-dotcom/msrc-2027/pull/41) is open from
`codex/organizer-copy-venue-numbering`. Application/test verification above applies
to commit `0d521c9`; the subsequent closeout only records this PR link in documents.
Hosted CI remains pending, and no merge or production publication is claimed.

## 5 October 2026 — PR #40 review fixes

Updated the existing `codex/bl-ai-01-synthetic` branch for the requester's two review
findings (AI-02/04/06; ENG-018 clarification). The custom-header factory test clears
all CI/hosted markers and sets a local test environment before checking the header
guard. Separate coverage still refuses actual CI before SDK construction. The
original Foundation run failed only this assertion (2,000 other unit tests passed);
its database job and Participant accounts workflow passed.

Identity screening now blocks own author and institution names from the locked
snapshot, emails, phone numbers, licence numbers and IRB numbers. Generic EN/AR
institution words are allowed and produce the typed `generic_institution_mention`
warning in synchronous, Batch and evaluation provenance. No matched name or body
excerpt is recorded in warning metadata. The versioned synthetic corpus/report
now contains 29 cases, with EN/AR generic tertiary-hospital settings and named own
institution canaries. Human review remains available; activation stays closed.

Verification at review closeout (Node 24.21.0 / pnpm 11.19.0):

- PASS: final `pnpm check` with `CI=true` and `GITHUB_ACTIONS=true` — lint, types,
  2,027 unit tests in 44 files and the 65-page production build; exit 0.
- PASS: final focused adapter/harness run with both CI markers — 202 tests
  (127 adapter, 75 harness), including isolated header denial and actual CI refusal.
- PASS: native `pnpm ai:evaluate:mock` with both CI markers — report/corpus v2,
  29 rows: 12 validated mocked outputs, 17 manual states, 29 human-unassessed and
  two non-blocking warning rows. No provider client is constructed.
- PASS: diff review, safe report/client-bundle inspection and `git diff --check`.
- Hosted CI on the review commit is checked after push; the final status and exact
  head are recorded in PR #40. This local receipt does not claim a pending run passed.
- NOT TESTED: real API, real abstracts, committee suitability and live activation.
  No key, provider request, database/hosted configuration or workflow opening.

## 5 October 2026 — BL-AI-01 disabled Claude adapter and synthetic evaluation

Started after listing open PRs: none. Refreshed `origin/main` at `630e195`, then
created isolated branch `codex/bl-ai-01-synthetic`. The original checkout's
modified logs, untracked notes and output are preserved. Shared PROGRESS/DECISIONS
updates do not count as feature overlap. Source IDs: AI-01 through AI-06, PRV-07,
CFG-03/09/10 and REL-03; decision ENG-018.

The server-only advisory contract has a default-off flag, complete version-bound
approval requirements, allowlisted scientific payload and identity checks, fixed
system/rubric rules with untrusted user text, no tools, strict output validation,
stop-reason handling, safe metadata and manual-review continuity. Official SDK
0.131.0 is pinned with the lockfile. Individual requests use server-side refusal
fallback; Message Batches omit its unsupported parameter and preserve manual review
for refused/failed items. No SDK automatic retries or applicant outcome operation.

The fixed synthetic corpus and mocked evaluation harness cover study quality,
ongoing/varied designs, identity leaks, injections and malformed failures. The
placeholder rubric is `UNAPPROVED`; report model/human scores and disagreement fields
do not fabricate committee baselines. A separate local real-API script requires
explicit synthetic consent, a dedicated locally supplied key and bounded operating
configuration, refuses CI/hosted execution and accepts no real-abstract input.

Files: `src/lib/ai-assessment/`, `evaluation/ai-assessment/`, `scripts/ai-evaluate.ts`
and two unit suites; package/lockfile, native TypeScript import setting, empty environment examples, backlog status,
[feature/activation note](features/ai-assessment.md),
[acceptance matrix](features/ai-assessment-acceptance.md), DECISIONS and this log.
No migration, hosted configuration, key, real abstract, email or workflow opening.
The DeepSeek prototype is not used.

Executed verification uses Node 24.21.0 / pnpm 11.19.0:

| Command/check | Result | Evidence/limit |
| --- | --- | --- |
| GitHub open-PR list; fresh main/worktree preflight | PASS | No open PRs; base `630e195`; original user work preserved. |
| Official Anthropic docs and installed SDK source/types | PASS | Confirmed current JSON format/effort/fallback/Batch/cache shapes; documented Batch fallback incompatibility and unsupported numeric schema bounds. |
| Exact SDK install; `pnpm install --frozen-lockfile --offline` | PASS | SDK 0.131.0 pinned; updated lockfile accepted. |
| `pnpm audit --prod` | PASS | No known runtime dependency vulnerabilities reported at execution; not a security certification. |
| Final `pnpm check` | PASS | Zero-warning lint, route generation/TypeScript, 2,001 unit tests in 44 files, 65-page optimized production build; exit 0. Earlier check passed 1,999 tests before two real-factory guard regressions were added. |
| `pnpm exec vitest run tests/unit/ai-assessment-adapter.test.ts tests/unit/ai-assessment-harness.test.ts` | PASS | Final 176/176: 113 adapter and 63 harness tests. Disabled cases assert zero fetch/SDK/factory/config/authority/budget calls; permission, expiry/drift, concurrency budget, failure and stop-switch coverage. |
| `pnpm ai:evaluate:mock`; `pnpm ai:evaluate:synthetic --help` | PASS | Native Node CLI generated 25 rows: 10 validated mocked outputs, 15 manual cases, all 25 human baselines unassessed. Ignored report excludes abstracts, identity context and keys. |
| Native synthetic-submit command under `CI=true` with an invalid synthetic key | PASS | Expected exit 1 before dispatch, safe generic error; no provider request. Unit tests also deny actual CI/custom-header environment overrides before SDK construction. |
| Production client-chunk inspection; `git diff --check` | PASS | No Anthropic endpoint, fallback header, AI flag or synthetic-key references in `.next/static`; no whitespace errors. |
| Independent requirements/security review | PASS for this slice | Acceptance map finalized; all four BL-AI-01 acceptance criteria have executable coverage. No unresolved blocking finding. |
| Real synthetic API, real abstracts, committee scoring, provider billing/cache hits | NOT TESTED | No key or live model request; mock evidence does not establish scientific suitability. |
| Database/RLS and independent-draft/reveal UI | NOT TESTED | No schema or UI changes; BL-AI-02/03 integration remains separate. |
| Full browser suite and hosted CI | NOT TESTED at local closeout | No public UI or route changed. Existing permission/workflow units and production build passed; draft-PR CI runs separately. |

Review first reproduced missed hyphenated licence/IRB identifiers, coerced completion
status and impossible ISO dates. Those were corrected with regression coverage.
Successful fallback content, unsupported Batch fallback parameters, truthful serving
model provenance and inherited SDK endpoint/log/auth/header behavior were also
reviewed and hardened. The real SDK factory independently checks the actual hosted/CI
environment before import, even if a caller supplies a separate environment object.

Activation is still BLOCKED by the organizational account/key/budget controls,
approved committee rubric, Scientific Lead evaluation, privacy/data-flow/disclosure
approval and trusted authority/audit/durable-job/reviewer integrations. Human review
does not depend on this capability. Next: committee synthetic scoring and privacy
review, then a separately scoped BL-AI-02/03 integration. Rollback removes the
unused adapter/tools and SDK dependency; no public UI or database rollback is needed.

## 4 October 2026 — Staff Auth CI stability

Branch `codex/auth-ci-stability` starts at freshly fetched main `bc2fb87` (PR36 merged),
in an isolated worktree; original caller edits are preserved. No open PRs at preflight.
Shared logs do not count as overlap under the requester's clarified rule.

- AUTH-04/05, LOC-01, ERR-01: reproduced the lost keyboard activation with Next client
  scripts withheld. The enabled SSR button accepted Enter before listeners existed:
  zero start requests, no session, focus stayed on the button; the original heading
  focus assertion failed. Initial controls now stay disabled through hydration and
  initial status restoration. A deterministic regression holds both boundaries.
- SEC-01/06: reproduced PR36's SQLSTATE `40P01` with controlled scheduling in
  disposable CI. The cookie fixture held an exclusive `auth.identities` lock and
  waited for exclusive `auth.users`; managed Auth held `auth.users` for its insert
  and waited to insert `auth.identities`. Numeric backend attribution proves the
  cookie fixture is the requester, rather than a native Auth background process.
  Run `37216543432` cold pass five identifies `owner_policy` as the failed statement;
  four preceding passes succeeded, demonstrating why repetition alone cannot fix it.
  CLI2.118 pins Postgres17.6.1.171 and preloaded supautils3.4.3. Its CREATE POLICY
  grant check scans the postgres allowlist in identities/users order with exclusive
  locks retained to commit, even for an unrelated public fixture policy. See the
  [pinned hook](https://github.com/supabase/supautils/blob/v3.4.3/src/policy_grants.c#L155),
  [pinned allowlist](https://github.com/supabase/postgres/blob/17.6.1.171/ansible/files/postgresql_config/supautils.conf.j2#L2)
  and [upstream fix](https://github.com/supabase/supautils/commit/42cc7f0c4b2655ee3f70a834e253e6a79c66f1d6).
  Fixture DDL now runs before concurrent integration workers, with teardown after
  all workers. No retries, larger timeouts, assertion removal, suite serialization,
  production schema change or dependency upgrade is needed.
- Added opt-in `workflow_dispatch` `auth_stability`: five independent cold database
  resets with the original concurrent integration suites, and five browser repeats.
  This is fail-fast repeated verification, not retries after failure.
- PASS: Node24.21.0 frozen-lockfile install; lint; typecheck; 1,769 unit tests/42 files;
  production build. Post-fix browser: 180/180 focused checks (ten repeats per EN/AR
  flow and desktop/tablet/mobile), plus the full 81/81 staff suite. Fresh project
  servers preserve the existing 20/IP/hour quota; an initial combined repetition
  exhausted that quota and was stopped without changing limits or assertions.
  Initial isolated stability run `37214660390`: PASS five cold concurrent database
  suites, each 73/73, and 60 repeated EN/AR keyboard cases. These are samples, not
  evidence of a deadlock fix. Post-fix run `37216937368` at code head `6675fe9`:
  PASS all five cold concurrent suites, 73/73 each; PASS 60 repeated EN/AR keyboard
  cases plus lint/types/units/build. Normal PR database job `111479311913` also PASS;
  full public/browser regression remains running when this note is recorded.
  Local managed DB execution is BLOCKED: suites intentionally require a disposable
  GitHub-hosted Linux runner; the Windows Docker daemon is also unavailable.
- Separate PR: [37](https://github.com/xpexellent-dotcom/msrc-2027/pull/37).
  Participant preflight freshly fetched main remains `bc2fb87`; open PR37 is staff
  preview/fixture lifecycle/CI only, and PR38 changes only shared PROGRESS. No account
  implementation overlap. Next: BL-AUTH-02/03/04/06 participant/08 shell on a new
  branch from main. No hosted changes or real email.

## 4 October 2026 — Live QA after PR32–36, and a font-preload experiment

Checked the live site at main `bc2fb87` from the owner's Windows PC (Node 25.6.0, Playwright 1.63 Chromium and WebKit). No code changed.

- All 22 sitemap URLs (now including Contact), at 1366 px, on a Pixel 7 and on an iPhone 13 (WebKit): status 200, no console errors, no 4xx/5xx, no horizontal overflow. Axe WCAG 2.0–2.2 A/AA, plus `label-content-name-mismatch`, finds nothing, so the PR32 wordmark fix is live. The PR32 `MSRC Arabic Fallback` face is in the live CSS.
- Privacy and Terms (EN/AR) at both sizes: no axe violations, no console errors, no overflow; they and their dated drafts are `noindex` and left out of the sitemap. Registration and Submissions are `noindex` as well.
- Contact (EN/AR, Pixel 7), with every non-GET request blocked so nothing reached the live API. Submitting the empty form sends nothing. All four required fields are marked invalid, focus moves to Topic, and the summary alert appears. Before hydration the fieldset and button are server-rendered `disabled`, so a pre-hydration native submit cannot put the visitor's details into a GET query string. The honeypot is `hidden`, `aria-hidden` and `tabIndex=-1`.
- A link crawl from `/en` and `/ar` reached 36 internal URLs, all 200 with no redirects. External links (KAU privacy policy EN/AR) return 200.
- `/en/msrc-2027.ics` and `/ar/msrc-2027.ics`: `text/calendar`, served as an attachment, CRLF line endings, folded lines at most 75 octets with no UTF-8 sequence split, all-day 27–28 January (`DTEND` 29th), the same UID in both languages.
- `pnpm audit --prod`: no known vulnerabilities. `pnpm outdated`: next and eslint-config-next 16.3.7 → 16.3.8 (patch), vitest 5.0.3 and supabase 2.119.0 available; not updated here.
- CI: main's 14:51 UTC run failed in “Verify local-only synthetic staff security lab” and its 15:39 run passed; `codex/auth-ci-stability` is already working on this, so I left it alone.

Font-preload experiment, not adopted. Local production builds, Chromium with a Pixel 7 profile, 150 ms RTT, 1.6 Mbps, 4× CPU, cache off, median of 5 loads:

| Variant | /en FCP | /en LCP | /en CLS | /ar FCP | /ar LCP | /ar CLS |
| --- | --- | --- | --- | --- | --- | --- |
| main (Manrope, DM Sans, Inter preloaded) | 2040 | 3108 | 0.001 | 2024 | 3340 | 0.020 |
| Manrope only preloaded | 1848 | 2736 | 0.001 | 1976 | 2544 | 0.020 |
| DM Sans only preloaded | 1904 | 3072 | 0.001 | 1988 | 2772 | 0.020 |
| nothing preloaded | 1804 | 2256 | 0.034 | 1888 | 2440 | 0.020 |
| nothing preloaded, weight-aware DM Sans fallback | 1764 | 2284 | 0.034 | 1868 | 2416 | 0.020 |
| main with the poster at default priority | 2024 | 3100 | 0.001 | 2028 | 3352 | 0.020 |

The hero headline is DM Sans, not Manrope. On English pages LCP waits for DM Sans, and the 108 KB poster's `fetchPriority="high"` makes no measurable difference. Not preloading the Latin fonts brings both languages under the 2.5 s target, but on a slow phone the English headline is first drawn in the fallback. When DM Sans arrives, “Where curiosity” goes from one line to two and the hero moves about 55 px (CLS 0.034). At 412 px the line is within 3 px of wrapping, so no fallback metric override hides it reliably. Arabic pages pay for three Latin font preloads they barely use (only the wordmark is Latin above the fold), and dropping them would cut `/ar` LCP by about 0.8–0.9 s. `next/font` preloads per layout, not per locale, so an Arabic-only change needs Latin preloads chosen per locale, for example self-hosted files with a locale-specific `<link rel="preload">`. Left for a design decision; the measurement scripts are not committed.


## 4 October 2026 — BL-PUB-06 default-off Resend Contact delivery

Fresh fetch verified main `9971534` includes merged PR30 and PR32. Reused the attached
Contact worktree on new `codex/contact-resend-delivery`; preserved original caller edits
and untracked work. ORG-028/029 record the approved Contact provider/routing, reported
verified domain/Production-only restricted Sending key, default-off flag, counter-only
storage and global 60/day budget. No credential inspection, hosted SQL, production
configuration, merge, production deployment or real email is performed. No dependency was added.

Implemented direct server-only Resend fetch, fixed inbox/validated Reply-To/escaped
plaintext with language, signed 30-minute single-attempt token/minimum-fill time, strict
origin/Host/IP/byte validation and atomic private expiring HMAC counters. Review-only
migration `20261004114603_contact_abuse_counters.sql` adds forced-RLS counter storage,
service-only SECURITY INVOKER RPC and five-minute pg_cron expiry. No message database,
outbox, visitor acknowledgment, automatic retry or refund. Generic EN/AR states preserve
input in memory and require explicit recovery; mailto always remains. Vercel Preview
delivery is denied. Public factual Privacy copy describes conditional Contact processing;
personal names stay excluded and all final legal/Terms/photography placeholders remain.

Executed locally (Node24.19.0, pnpm11.19.0, Supabase CLI2.118.0):

- `pnpm check`: PASS lint/types, 1,750 units/41 files and 53-page production build. Initial
  fixture-only type failures were corrected. After adding 16 Host regressions, full
  `pnpm test` passes 1,766 units; `tsc --noEmit`, scoped lint and `pnpm build` pass again.
- Focused server units: 187 PASS, including byte bounds, timing/signature tampering,
  origins/Host, no forwarded-header spoofing, exact routing/plaintext, quota failures,
  nonce replay, provider timeout/no retry and privacy logging. Baseline Contact 133
  synthetic cases remain included in the full suite.
- `pnpm exec playwright test tests/e2e/contact.spec.ts tests/e2e/policies.spec.ts`:
 45 PASS, including EN/AR latest/dated drafts, desktop/tablet/mobile, axe/keyboard/
  enlarged text/no-JS/404. Existing Next `NoFallbackError` logs appear on deliberate
  invalid-route probes; asserted responses are 404 and valid pages show no browser errors.
- Agent-browser inspection: Arabic enabled synthetic form renders correctly with RTL,
  visible notice and no error overlay/console errors; closed English form controls remain
  disabled; navigation to home passes. First PowerShell reference quoting failed and was
  corrected. The enabled browser run exposed Next internal-URL hostname mismatch and
  a minimum-fill notice mismatch; both were fixed with regression coverage before rerun.
- `pnpm exec playwright test --config playwright.contact.config.ts`: 42/44 PASS after
  origin correction; the two remaining no-JS cases found a missing fallback instruction
  despite safe disabled controls. Replaced client-component noscript with visible SSR
  fallback text, rebuilt successfully and reran `--grep 'Enabled delivery without
  JavaScript'`: 2/2 PASS. Only loopback mocks/dummy keys are used. The complete 44-case
  final-head CI run and Preview receipts are recorded on the draft PR. GitHub CI also
  runs real SQL/RLS/atomic counter/cron integrations on a disposable runner; no local
  Docker is required or used.

Remaining decisions: confirm proposed 3/hour and 10/day independently for each IP/email and
3-second minimum-fill time; clarify provider/inbox retention/storage exception, privacy
locations/transfers and final wording. Vercel flag edits require redeploy and therefore
are not an instant runtime switch; Resend/inbox retain emails outside the application.
Hosted migration/configuration and real-human EN/AR/inbox/reply UAT remain NOT TESTED.
Authentication/session/role/readiness and other operational gates remain unchanged.
Exact owner-only apply/activation/rollback steps: [Contact runbook](features/contact-delivery.md).
Next smallest task: review the draft, apply only its Contact migration and complete the
configuration/processing/human-delivery checks, then turn on with a Production redeploy.

## 4 October 2026 — QA pass: 404 and error page alignment and buttons

Local production-build sweep (live site unreachable from the cloud sandbox): 24 public pages, EN/AR, 1366 px and Pixel 7, no broken links, console errors (other than the Vercel analytics scripts that only exist on Vercel), axe violations, unnamed controls or horizontal overflow. Changed:

| Found | Change |
| --- | --- |
| On the Arabic 404 the «٤٠٤» status line sat on the left edge while the heading, text and button started on the right: the paragraph carried `dir="ltr"` | The override is removed; Arabic-Indic digits need none. The line now starts on the same edge as the heading |
| The 404 and error pages used an older square `.action-link` button, unlike the pill buttons on every other page | They use the design-system `ButtonLink`/`Button`; `.action-link` is removed and `.message-actions` carries the spacing |
| The header's "Explore MSRC" ↗ pointed up-right on Arabic pages too, against the reading direction, while every other button arrow mirrors | The arrow takes the shared `directional-arrow` class, so it mirrors in Arabic and nudges on hover like the others |

Tests: `public-shell.spec.ts` 404 case now checks that the Arabic status line and heading share their right edge (failed at 559 px apart before the change) and that the way home is a site button. New `qa-regressions.spec.ts` case checks the header arrow is unmirrored in English and mirrored in Arabic. `pnpm lint`, `pnpm typecheck`, `pnpm build` PASS; `public-shell`, `closed-workflows`, `auth-preview-unavailable` 45/45 on Chromium desktop and mobile; `qa-regressions`, `design-system`, `premium-interface` 64/68, the 4 failures being the hero-film checks that need an H.264 codec this sandbox's Chromium lacks (they pass in CI).

Live check of www.msrc2027.com from the owner's Windows PC (Node 25.6.0, Playwright Chromium 1243, which reports H.264 as `probably` on Windows). Three fixes: the header wordmark’s accessible name, the Arabic fallback font, and Programme/Media filters dropping a quick second change.

- `curl` redirects: `http://msrc2027.com/` 308 → `https://msrc2027.com/` 308 → `https://www.msrc2027.com/`; `http://www.` 308 → `https://www.`; `/` 307 → `/en`, and 307 → `/ar` with `Accept-Language: ar-SA,ar;q=0.9`; `msrc-2027.vercel.app/en` 308 → `www…/en`; `/en/programme?x=1` 308 → `/en/program?x=1` (query kept); `/nope` and `/en/nope` 404. All as configured in `next.config.ts`.
- Headers on `/en`: HSTS `max-age=63072000` (no `includeSubDomains`/`preload`), CSP, COOP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` all present; prerendered and `X-Vercel-Cache: HIT`. Hero films and posters return `video/mp4`/`image/jpeg` with `Accept-Ranges: bytes` and the 30-day cache; fonts are `immutable`. `/en/opengraph-image` and `/ar/opengraph-image` 200 PNG.
- Hero film on the live site: desktop (1366 px) loads `hero-desktop-v1.mp4`, mobile (412 px) `hero-mobile-v1.mp4`; both play (about 4.8 s in after 5 s, 152 frames, no media error) on `/en` and `/ar`. With `prefers-reduced-motion: reduce` no video element is rendered. In the Claude desktop app's built-in Chrome 152 the film decodes (H.264 `probably`) and correctly stays paused while the page is hidden. Chrome and Edge are not installed on this PC, so neither was tried directly.
- Live sweep of the 20 sitemap URLs, 1366 px and Pixel 7, with axe (WCAG 2.0–2.2 A/AA): status 200, no console errors, no failed requests other than RSC prefetches cancelled when the page closed, no horizontal overflow, no axe violations.
- Lighthouse 12, mobile defaults (simulated Slow 4G, 4× CPU), 3 runs each against the live site: `/en` performance 91–94, LCP 2.95–2.98 s, CLS 0, TBT 89–207 ms; `/ar` performance 88, LCP 3.81–3.86 s, CLS 0, TBT 64–88 ms. Accessibility, best practices and SEO 100 on every run. The LCP element is now the first headline line (`Where curiosity` / `حيث يتحوّل الفضول`), not the poster, and 77–82 % of LCP is render delay (see the LCP timeline below). Both are over the NFR-02 2.5 s target. Compare with Speed Insights field data before deciding.
- Lighthouse's experimental label-in-name audit (axe `label-content-name-mismatch`) flagged the header wordmark: it showed "MSRC 2027 Fifth edition" but was named "MSRC 2027 home" / "الصفحة الرئيسية لمؤتمر MSRC 2027" (WCAG 2.5.3). Fixed in `site-header.tsx`: the `aria-label` is gone, a real space separates MSRC and 2027 (collapsed by the flex layout, so nothing moves; the link box is the same 98.6×48 px desktop and 90×48 px Pixel 7 in both languages), and a `.sr-only` suffix adds ", home page" / "، الصفحة الرئيسية". The name is now "MSRC 2027 Fifth edition, home page". axe reports 0 mismatches locally against 1 on live for EN/AR at both sizes. New `qa-regressions.spec.ts` case checks the name; it fails on the previous build and passes now.
- LCP timeline measured in real Chromium on the live site (Pixel 7, 150 ms RTT, 1.6 Mbps, 4× CPU): TTFB about 0.2 s, CSS (23 KB) arrives at about 1.6 s while sharing the line with three preloaded Latin fonts (110 KB together), and first paint is about 2.4 s. The headline lines then become LCP 0.1–0.9 s later as they reveal. Removing `opacity` from the `hero-line` keyframes made no measurable difference in Lighthouse (local build, 3 runs: `/en` 3.6 s before and after; `/ar` 4.5–4.7 s before, 4.1–4.5 s after), so it was not kept. The larger cost is the time to first paint.
- Live SEO metadata, all 20 sitemap URLs: each has its own title and description (no duplicates), a self-referencing canonical, en/ar/x-default alternates, the right `lang`/`dir`, og:locale and og:image per locale, and one `h1`. The homepage WebSite and Event JSON-LD parses. Nothing to change.
- WebKit (Playwright WebKit 2359, the closest available to Safari) on the live site, iPhone 13 and 1366 px, all 20 sitemap URLs: no console errors, no 4xx/5xx, no horizontal overflow, and the hero film plays on `/en` and `/ar`. Firefox could not be launched on this PC. A temporary WebKit project (not committed) running `public-shell`, `mobile-navigation`, `qa-regressions`, `about`, `dates-venue`, `countdown`, `conference-experience` locally: 120 passed, 12 failed. 9 failures are Tab-key checks, which fail because WebKit, like Safari by default, does not move focus to links with Tab. 3 vary between runs: WebKit logs a cancelled RSC prefetch as an "access control checks" console error, and the Media edition filter once read "all" in a newly opened tab. The new-tab case led to a real bug, below.
- Programme and Media filters lost a change made in quick succession. Each `change()` wrote every filter from the last render, and the address only reaches the render after React catches up, so a second change in that window put the first one back. Reproduced on the live site: setting edition 2026 and then kind recording in the same tick left `?kind=recording`, and day 2 plus a search left `?q=x`. Fixed in `conference-experiences.tsx`: `updateAddress` now writes only the filters that changed onto the current address. A stray invalid value already in the address stays there but still reads as "all". New `qa-regressions.spec.ts` case: before the fix `kind=recording`, after `edition=2026&kind=recording`. `eslint` PASS, `vitest run` 1420/1420, full `playwright test` 332 passed, 21 skipped, 0 failed.
- Local production build of this branch merged with main, on the same PC: full `playwright test` 326 passed, 21 skipped, 0 failed, including the hero-film checks that could not run in the cloud sandbox.
- Arabic layout shift when the webfont arrives: a live Lighthouse sweep of all 20 sitemap pages put `/ar/participate` at CLS 0.097, close to the 0.1 limit. Traced in Chromium (Pixel 7, 150 ms RTT, 1.6 Mbps, 4× CPU): when Noto Sans Arabic arrives at about 3.2 s, `.experience-lead` grows from one line to two and pushes the pathways down 86 px. The next/font automatic fallback for the Arabic face was `local(Arial)` with `size-adjust: 100%`. Averaged over the page's Arabic text, Noto is 1.20× (400) and 1.30× (700) the width of Arial's Arabic, but 0.95×/0.91× Tahoma. Fixed: `adjustFontFallback: false` on the Arabic face in `fonts.ts`, and a `MSRC Arabic Fallback` face in `tokens.css` (`local("Tahoma")`, `size-adjust: 107%`, Noto's ascent/descent scaled to match, Arabic code points only, so Latin text and 1ch are unchanged). The English-page language link (`system-ui`/Segoe UI) is unaffected and English pages still do not download the Arabic font. CLS measured the same way, Pixel 7 / iPhone 13 viewports, before → after on local builds: `/ar` 0.035/0.032 → 0.020/0.026, `/ar/participate` 0.095/0.057 → 0.000/0.000, `/ar/about` 0.015 → 0.001, `/ar/hackathon` 0.017 → 0.001, `/ar/3mt` 0.022 → 0.000; the other Arabic pages stay at or under 0.023. Lighthouse local `/ar/participate` CLS 0 (live 0.097). This only helps where Tahoma is installed (Windows, macOS); phones without it use their system Arabic font, as before, and were not measured on real devices. New `qa-regressions.spec.ts` case holds back the webfont and checks the lead keeps its height when it arrives: 28.1 px → 56.3 px before the fix, unchanged after. It skips where Tahoma is missing, as on Linux CI.
- After the wordmark change: `next build` PASS, `eslint . --max-warnings=0` PASS, `tsc --noEmit` PASS, `vitest run` 1420/1420; `public-shell`, `mobile-navigation`, `qa-regressions`, `design-system`, `premium-interface` 107 passed, 6 skipped on Chromium desktop, tablet and mobile.
- After the Arabic fallback change: `next build`, `eslint`, `tsc --noEmit` PASS, `vitest run` 1420/1420, full `playwright test` 328 passed, 21 skipped, 0 failed; `qa-regressions.spec.ts` 40/40 with the new case.

## 4 October 2026 — Organizer content intake workbook

Added an organizer spreadsheet template (`docs/content-intake/`) for speakers, sessions and
workshops, with a bilingual instructions sheet, Required/Optional labels, hints, one example
row per sheet, Approved/Draft and conference-day dropdowns, and whole-number seat checks.
`scripts/content-intake.ts` builds the template and checks a returned workbook against
PublicSpeaker/PublicSession/PublicWorkshop, reporting problems in plain language. It adds no
dependency (OOXML via node:zlib) and never edits the catalogue; publishing checked records stays
a reviewed change. Footer, i18n, sitemap and contact/privacy files are unchanged.

Executed locally (Node 25.6.0, repository binaries; pnpm not on PATH):

- `vitest run tests/unit/content-intake.test.ts`: PASS — 15 tests.
- `eslint . --max-warnings=0`: PASS.
- `tsc --noEmit` and full `vitest run`: only failure is the pre-existing missing local
  `qrcode` install (auth preview), unrelated to this change; CI installs from the lockfile.
- Independent read/fill/save of the template with exceljs 4.4.0 (scratch only, not a
  dependency); the saved copy is the third-party fixture the unit tests read.

NOT TESTED: opening the file in desktop Microsoft Excel, Google Sheets or LibreOffice.
Pending organizer review: Arabic instruction wording and the `/media/speakers/` portrait path.

## 4 October 2026 — PR30 public policy attribution review

Removed personal drafting/retention/request attributions from EN/AR Privacy/Terms,
shared draft notices and metadata. Public requests now say "Our privacy lead responds
within 30 days" and the equivalent Arabic role wording. ORG-027 records the amendment;
all named responsibility records remain in DECISIONS. Photography-publication wording
is unchanged and remains a placeholder for Emad. No policy effectiveness, retention,
Contact/auth/session/readiness or delivery gate changes.

The 20 targeted policy unit tests and scoped ESLint pass, including rendered EN/AR
latest/dated Privacy/Terms and metadata name-exclusion coverage. Rebased onto current
main bb63d73, which includes PR29 content intake and PR31 email runbook, preserving
the content-intake and Contact/review entries. Original caller work is preserved.

Executed on the combined revision (Node 24.19.0, pnpm 11.19.0):

- `pnpm check`: PASS — lint, typecheck, 1,579 unit tests / 39 files, 53-page build.
- `pnpm exec playwright test tests/e2e/policies.spec.ts`: PASS — 18 cases, including
  latest/dated EN/AR, desktop/tablet/mobile, axe, keyboard, enlarged text and 404s.
  Next logs `NoFallbackError` during invalid-route probes; asserted responses are 404
  and valid policy pages have no observed browser errors.
- `git diff --check`: PASS. Independent comparison confirms photography fact and
  publication-placeholder blocks are unchanged, existing named decision records are
  preserved, and no auth/Contact/session/readiness paths changed in the amendment.

Final-head CI receipts are recorded on the updated PR; no local database, production
configuration, real email or merge is performed by this review amendment. Real-human
policy/legal review remains NOT TESTED and final wording remains pending.

## 4 October 2026 — BL-PUB-06 Contact and BL-PUB-08 policy drafts

Fresh GitHub reads confirm PR25 merged into main 7361164a1277ba442744845450c14134e64a6293
and PR2/19 closed. Created the attached `contact-privacy-terms` worktree and branch
`codex/contact-privacy-terms` from that main; a second fetch still matches it. Original
checkout documentation edits and untracked files remain untouched.

- Contact now renders in EN/AR with the five requested visitor fields, nine ordered
  topic/tag mappings, accessible native disabled controls and mailto contact@msrc2027.com.
  Planned no-reply@msrc2027.com sender and validated Reply-To/derived subject are fixed
  configuration, with no provider or secrets. `/api/contact` rejects every standard
  method with 503 CONTACT_CLOSED before reading a request; no receiving, sending,
  storing, queueing or logging of form details. Server-only validation and a hidden
  honeypot are independent synthetic foundations, not active collection/spam protection.
- Privacy/Terms latest and `2026-10-04-draft` routes are bilingual, read-only, noindex,
  outside the sitemap and existing observability allowlist, with real 404s for unknown
  versions/locales. Organizer facts and every unapproved placeholder are visibly
  distinguished; there is no effective legal date or consent/terms acceptance UI.
- Footer links replace the three Soon chips. Registration stays closed and states
  that the event is photographed/recorded in EN/AR. ORG-021–026 record the organizer's
  fixed routing, Research Principles Club responsibility, retention, data requests,
  named wording/request owners, current analytics description and explicit publicity
  exclusion supersession. The notice-only publication decision is recorded without
  claiming a lawful basis; final Emad/institutional/privacy review remains pending.
- Updated relevant requirements, backlog/DR-CFG-09, three issue-index rows and
  [feature boundaries/rollback](features/contact-privacy-terms.md). Existing authentication,
  permissions/session policies, all 15 workflows/readiness, SQL and source snapshots
  are unchanged. No migration or provider/DNS/production change, real email or local
  Docker/database fixture work is performed.

Executed locally with bundled Node 24.19.0 and pnpm 11.19.0 (CI retains Node 24.21.0):

- `pnpm install --frozen-lockfile`: PASS; no dependency/lockfile changes.
- `pnpm check`: PASS — lint, route type generation/TypeScript, 1,562 unit tests across
  38 files and optimized production build with 53 generated pages. Earlier attempts
  found obsolete implemented-route and exact photography-copy expectations; corrected
  the test expectations and reran the complete command successfully.
- `pnpm exec playwright test`: initially 360 PASS, 21 existing explicit skips and nine
  failures from the same fieldset matcher assumption across the three viewports.
  Native fieldset closure was present; Playwright's disabled matcher applies to
  controls. Corrected fieldset checks to assert its native disabled attribute while
  retaining every input/button disabled and empty FormData/no-write assertion.
- `pnpm exec playwright test tests/e2e/contact.spec.ts`: PASS — all 27 corrected cases,
  16.3 seconds. The initial full run's remaining browser checks passed, including all
  18 new Privacy/Terms version/navigation/404/axe cases. Final clean full-suite and
  unchanged auth/database regressions are to be confirmed in this draft PR's CI;
  no local database or auth suite is claimed as run in this task.
- Cached agent-browser 0.38.2: EN Contact, AR Privacy/Contact and home render, no
  observed browser errors/overlay; desktop/390px RTL screenshots inspected. New
  browser tests cover 320px/enlarged text, keyboard, no-JS closure, EN/AR, no writes/
  storage, footer links and axe. Unknown static-version denials emit Next's internal
  NoFallbackError diagnostic while returning the asserted 404; no draft content leaks.
- Scoped lint after the browser matcher correction, `git diff --check`, distinct
  ORG IDs and CSV schema/preservation validation: PASS. CSV still has 165 unique rows
  and nine columns; only BL-PUB-06/08 and DR-CFG-09 changed.

NOT TESTED / release gates: real-human EN/AR/screen-reader/device/legal UAT; provider
delivery/bounce/retry tests; effective Privacy/Terms wording and translation approval;
lawful identifiable-publication review; actual processor/log/location/transfer inventory;
certificate two-year clock start, inbox/other retention and cleanup/restore handling;
live Contact abuse/CSRF/retention configuration. User-reported forwarding/filter tests
are separate evidence. The next smallest task is Emad's final EN/AR Privacy/Terms
wording/review with the responsible privacy/institutional owner; live Contact opening
requires an approved provider and a separate bounded delivery/control task. Rollback
is code/route/footer only, with no inquiry data or hosted migration to reverse.

## 4 October 2026 — PR25 rebased onto main including PR28

Rebased `codex/email-authenticator-no-sms` from cf1b60a onto current main
1cac8754cac41c49228f5074271fda22f16581a4 (PR28 included), replaying the complete
31-commit authentication stack. A local backup branch retains the previous head:
`codex/email-authenticator-no-sms-pre-main-20261004`. The force push uses an explicit
lease on the previously observed remote head; PR25 is retargeted to main for review.

Resolved DECISIONS and PROGRESS conflicts by retaining both public-site and auth
records. All 39 main progress entries remain, including the PR28 QA entry and the
authentication closeout. Main's public ORG-010–013 IDs are preserved; colliding auth
records now use ORG-017–020 with dated aliases. Current references and the obsolete
BL-AUTH-02/03/05/06 issue-index descriptions are reconciled. Historical progress,
source snapshots and all migration SQL remain unchanged.

Retained main's Arabic-first root redirect, indexing, canonical-domain/alias redirects,
structured data, calendar, manifest and public motion changes. CI still runs branch
checks through pull requests and push checks only on main, with the authentication
browser step and disposable managed database tests. Authentication branch Git
deployments remain disabled. No new application behavior or migration is introduced.

Executed locally on the combined tree (bundled Node 24.19.0, pnpm 11.19.0; CI keeps
the repository's Node 24.21.0 pin):

- `pnpm check`: PASS — lint, route type generation/TypeScript, 1405 unit tests across
  35 files, optimized production build with 43 generated pages.
- `pnpm exec playwright test --config playwright.auth.config.ts`: PASS — 75 tests,
  47.1 seconds; English/Arabic desktop/tablet/mobile, keyboard/accessibility, email
  failures/retry/session binding, authenticator setup/replay, revocation and immutable
  72-hour participant expiry. No delivery or hosted identity is used.
- `git diff --check`: PASS. Auth code/SQL/tests match the pre-rebase branch; selected
  public feature paths match main. Original source snapshots are unchanged.
- CSV validation: PASS — 165 unique issue records, nine columns; no duplicate canonical
  decision identifiers remain. Original checkout edits/untracked files are preserved.

Initial rebased head23e8c5b [CI37155624615](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37155624615)
passed lint/types/1405 units/build and the database job (505 SQL assertions, 63 native
integration tests against GoTrue v2.197.0), but the public browser job reported
323 passed, 1 failed and 21 explicit skips. The Arabic desktop chapter-bar test
started an empty 25ms sampling interval; a correct immediate destination update
could precede the first sample, omitting the already-verified starting chapter.
Captured the actual DOM starting value before the interval, preserving the exact
initial/destination sequence, focus/hash checks and timings. No application code
changes. `pnpm exec playwright test tests/e2e/chapter-bar.spec.ts
--project=chromium-desktop --grep 'chapter bar follows the reader' --repeat-each=5`:
PASS — all 10 English/Arabic repetitions, 25.0 seconds. The first CI auth browser
step was NOT RUN after the public-suite failure; local auth75 remains executed
evidence. The follow-up combined application/database CI is recorded separately
in the PR/checklist before merge.

No local database/Docker, hosted migration/reset/seed, production Auth,
deployment, real email/account/grant/reset or additional recovery rehearsal is performed.
Human UAT, actual Storage policies, production email/cookie/session-store custody,
recent-auth/warning timing, recovery and privacy/location approvals remain release gates.

PR supersession: PR2 head9e018ae is already an ancestor of main with zero unique
commits. PR19's only commit absent from the pre-rebase PR25 was the PR22 merge commit,
whose tree equals an included commit5977eb7; no unique implementation is lost. Recommend
closing PR19 after PR25 merges and is verified; PR2 is safe to close now. Neither is
closed in this task. Next development item remains BL-PUB-06 Contact + BL-PUB-08
Privacy/Terms, starting with truthful bilingual closed scaffolds pending approved facts.

Rollback: restore the local backup branch/history if needed before integration. No hosted
rollback is needed. Earlier receipt counts below describe their original heads, not this
rebased tree; the latest CI/checklist/PR identify the current review head.

## 3 October 2026 — Authentication foundation closeout

The organizer reported that the isolated preview works, confirmed Super Admin
responsibility for account recovery, and requested finishing these foundations
without an additional recovery rehearsal. Closed BL-AUTH-05/06 development is
implemented and verified; its production feature/release status remains Partial.
No rehearsal source, page, API, test, link or configuration change is retained.
Actual custodian names, exact trusted in-person identity/appointment evidence and
the verified procedure remain unresolved; distinct-person safeguards are preserved.

Continued `codex/email-authenticator-no-sms` from 5f06050; PR25 remains a draft stacked
on unmerged PR19 at 7dce160. Fresh main 1cac875 includes unrelated public-indexing/calendar
work, inspected by changed-file list and not merged into this auth closeout. The original
checkout's two modified docs and five untracked paths remain unchanged.

Updated eight relevant documentation/README files: DECISIONS, PROGRESS,
backlog/06-authentication, features/managed-authentication-plan,
features/regular-staff-email-check, features/staff-security-foundations,
src/features/auth/README and src/app/[locale]/(auth)/README.
No application behavior, policy value, dependency, migration or production setting
is changed. The active phone/SMS and obsolete cookie/delivery descriptions are corrected.
Historical sources/migrations and dated test receipts remain preserved.

Documentation validation: `git diff --check` PASS; no recovery-rehearsal source,
import, link or test configuration remains. No new runtime tests are needed for
these documentation-only changes.

Freshly inspected all four completed GitHub checks for 5f06050: push CI37146815235 and
PR CI37146818515 both PASS. The retained implementation passed lint/types, 1378 units,
42-page production build, 300 public + 75 auth browser tests with 3 existing skips,
strict migration lint, 505 SQL assertions, advisors/types and 63 native integrations.
Native/SQL execution remains isolated GitHub CI only; no local Docker/database run.
Existing denial tests cover private maintenance/factor reset; its false-only readiness
CHECK, postgres-only guard and denied API execution keep it closed. The future helper
needs complete current assurance and actual recent-auth age checks before activation.
No newly identified active bypass requires another schema change for this closeout.

Organizer-reported preview success is partial human feedback, without specified
device/locale/keyboard/screen-reader extent. Combined genuine managed/real-inbox human
UAT, genuine recovery, actual object-storage policies and production email/custody/
durable Secure-cookie setup remain NOT TESTED/BLOCKED. Every operational/readiness
flag stays false; participant 72h and staff 30min idle/8h absolute/native-origin policy,
roles, staff email checking and Super Admin authenticator policy remain unchanged.

Next development item from the freshly read linked checklist (sequence 3): BL-PUB-06
Contact and BL-PUB-08 Privacy/Terms. Start with truthful bilingual closed scaffolds;
approved controller/contact, processing/location/retention facts and final copy are
required before publication/data collection. This auth task does not implement them.
PR19/25 review and live-auth configuration/release approvals remain separate.

Remaining authentication decisions: recent-auth age, warning lead, named distinct
Super Admin recovery people and exact verified procedure/evidence, privacy/retention/
location, production plan/region/email provider/sender/custody/durable cookies, TOTP
abuse controls and human UAT/domain database/storage policy integration.
Rollback: revert this documentation-only closeout if needed; stop the existing local
lab/clear its opt-in to close the preview. Preserve private credentials/send records.
No hosted rollback is needed. No merge/deploy/send/hosted migration/reset/seed,
real account/grant/reset, spending or new operational module is performed.

## 3 October 2026 — Isolated staff code delivery and managed HTTP/cookies

Continued the organizer-authorized next slice on `codex/email-authenticator-no-sms`
from2593345, preserving original checkout edits/untracked work. Fresh remote main is
111292c; no unrelated public changes were merged into this stacked draft. PR25 remains
draft against PR19. No dependency or production configuration was changed. New schema
changes remain review-only and are exercised only on disposable GitHub runners.

Added optional Windows loopback staff test delivery with a private local helper,
existing encrypted replacement credential and the confirmed self-recipient outside Git.
Codes travel through bounded stdin and never appear in isolated API responses, UI
inbox, logs or audits. Safe delivery/expiry metadata and accessible EN/AR retry/resend
copy replace the displayed code in this mode. Invalid configuration/deployment/CI,
helper failure/timeout or uncertain SMTP acceptance denies without fallback or retry.
Default participant/synthetic-email and Super Admin QR/manual TOTP flows are unchanged.

Added a separate CI-only managed HTTP lab and17 integration cases. It composes genuine
password sign-in, existing private staff email receipts and current database context
behind opaque HttpOnly/SameSite/Path-scoped cookies; native tokens remain server-only.
Exact Host/Origin/socket IP/body bounds, no-cache responses, native session/identity/
role binding, before/after refresh checks and unchanged absolute/idle clocks are covered.
Logout first revokes private own-session state, then native Auth; partial native failure
returns unavailable while local state/cookies are cleared. Password-only direct Data
API access, replay/replacement/limits, new login, expiry, identity/grant/suspension and
successful/partial logout denial are tested in the disposable runner only.
No production Next login/API/action or server session store is enabled by this factory.

Executed locally: `pnpm lint` PASS; `pnpm typecheck` PASS; `pnpm test`1378/30files PASS;
`pnpm build`42pages PASS.23 new managed-lab boundary/factory units are included.
Windows helper pure validation/quota/template/gate checks41 PASS and private fixture
runtime checks118 PASS in each of PowerShell5.1 and7. Runtime coverage uses fake SMTP,
private synthetic encrypted fixtures, persistent reservations, restart/send limits,
competing processes, forced termination, ACL/junction rejection and unchanged original
credential/attempt metadata. No real credential values were read by fixture tests.
Database/native integration checks are NOT RUN locally; no Docker is required or used.
Auth browser suite75 PASS locally. Public browser run299 PASS/1 FAIL/3 existing skips;
the one Arabic mobile cinematic case passed its targeted rerun. CI37142177606 app job
passed lint/types/unit/build,300 public browser tests (3 existing skips) and75 auth
browser tests at00d1037. The loopback inbox-mode preview was also inspected after
simulated password login in EN/AR at1440/791/390px: correct direction, no horizontal
overflow, no page errors and no displayed email code. No email was sent by this check.
Its database job passed migration lint,393 SQL assertions, advisors and type generation,
then native integration56 PASS/7 FAIL. Existing46 native cases passed. The new cases
exposed a read-only Data API/RLS issue, a Fetch Host-header test normalization issue and
an expiry fixture correctly rejected by the immutable-origin guard. The corrections
and subsequently verified results follow; this first run did not pass integration.

Correction: additive review migration20261003180734 separates stable read-only
observation/own-role projection from the unchanged volatile POST initialization RPC.
`msrc_second_step_satisfied` and new `msrc_read_access_context` share the calling
statement snapshot for role plus receipt checks. Private observers preserve current
native password/email revision/grant fingerprint/TOTP precision/lifecycle and clocks;
missing initialized state denies. Independent static review found no additional concrete
blocker in this SQL slice; runtime verification followed in CI.
Added112 SQL assertions for readonly positive/denied reads, policy/receipt/factor
parity, permissions and unchanged session/receipt/audit state. One existing staff fixture
now explicitly calls the trusted initializer before expecting direct-read success.
Native HTTP tests use literal Host headers, age expiry fixtures before first observation
and add direct stale-bearer GET denial after suspension, email/grant changes and new login.
The corrected database suite was then exercised in disposable CI, not on this computer.
First corrected head2ce2e09 CI37144279613 reset passed, then strict database lint
rejected seven STABLE/VOLATILE clock-sampling warnings in the new read observers.
SQL assertions, advisors/types and native integration were skipped on that run.
The timing model was corrected without waiving warnings.
Pure observers now use one genuine statement-admission timestamp alongside their
MVCC snapshot. A read admitted before expiry may finish afterward; later statements
deny even within the same transaction. This changes no deadline or session activity.
Existing locked server/write/consume expiry checks still use actual time after waits.
The strict lint gate is retained. The delayed-boundary regression passed in CI below.
Atb0f7bf1 CI37145213167, migration reset and strict lint passed. SQL stopped during
new-fixture preparation because two synthetic actors were assigned the same changed
email, correctly rejected by native uniqueness. Existing393 assertions passed; the
new suite emitted13 assertions before this fixture error, so no full SQL/native
PASS is claimed for that run. Changed destinations are now unique per synthetic actor.
Atf0ebbd6 CI37145706902 strict lint,505 assertions, advisors and public type
generation PASS. Native integration62 PASS/1 FAIL: simultaneous-session direct-read
positive expected an owned row for its actor, but the resource fixture seeded only
actor0. Expanding this synthetic resource fixture to existing actors and asserting
positive direct reads before revocation makes those negative regressions meaningful.
No authorization/policy relaxation was needed.

At90a098c [CI37146079001](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37146079001)
database job111270233050 PASS: reset, strict migration lint,505 SQL assertions across
six files, security advisors, public type generation and63 native integration tests
across six files against actual GoTruev2.197.0. All18 existing synthetic actors have
owned protected rows, so logout, partial native logout failure, suspension, changed
email and grant revocation prove successful direct reads before denied reads afterward.
Simultaneous sessions prove verified1/password-only0; new login requires fresh proof.
Application job111270233209 also PASS: lint/types,1378 units,42-page production build,
300 public browser tests with3 existing skips and75 auth browser tests. Completed
application/database logs were inspected; the full code-head CI passed.
The CI server cookie lab remains separate from the actual local SMTP test below.

Executed the ignored local single-flow driver once at20:58 Riyadh on3October2026:
one English synthetic staff-code email was accepted by Gmail SMTP. The driver uses
simulated password/session evidence and the actual private sender helper, with the code
held only in memory. It proved API/UI code suppression, exact synthetic session binding,
wrong/reused/new-login denial, unchanged refresh origin and logout revocation; it does
not prove inbox possession. Human receipt of this new code message remains unconfirmed.
Loopback inbox/code-entry preview: http://127.0.0.1:3221/en/staff-security-preview
(Arabic under /ar). The automatically exercised code has expired; request a fresh code
for manual preview. Persistent local reservations remain; do not reset them to retry.

Automatic approval review rejected recursive cleanup of nine older private synthetic
helper-test folders after a Windows5.1 junction cleanup failure. They remain in place.
The corrected harness successfully cleaned all fixtures from its final runs. Original
credentials and eight earlier email-readiness attempt records were preserved.

All15 workflows and operational/privileged readiness remain false. No merge/deploy,
hosted migration/reset/fixture, real account/invitation/grant/reset, paid resource,
production Auth/SMTP or credential-in-CI change. Storage is disabled in CI; unavailable
object-route denial is not object-policy proof. Genuine managed Auth with real inbox
possession/browser/human UAT is NOT TESTED: local SMTP uses synthetic password/session
evidence, while native CI uses an in-memory no-delivery inbox. Production delivery,
durable cookie/session configuration, recovery and domain resource policies remain gates.

Next smallest task: human isolated inbox/code-entry plus EN/AR device/keyboard/
screen-reader UAT and named distinct recovery custodians/procedure/rehearsal. Recent-auth
age, warning lead, privacy/retention/location and live provider/sender/custody remain
unresolved. Rollback: stop the lab, clear email opt-in or revert isolated review code
without restoring superseded SMS policy; preserve private credentials/attempt history.
No hosted rollback is needed. Current feature details: regular-staff-email-check.md.

Changed areas in this continuation:

- Delivery: new `src/lib/email/isolated-staff-preview.server.ts`; auth preview service,
  contract, EN/AR copy and component; `src/lib/email/README.md`.
- Managed cookies: new `src/features/auth/managed-staff-lab.server.ts` and
  `tests/integration/managed-staff-cookie.test.ts`.
- Verification: new `tests/unit/isolated-staff-preview-delivery.test.ts`,
  `tests/unit/managed-staff-lab.test.ts`, updated auth-preview units/browser cases,
  new `supabase/tests/database/readonly_authentication.test.sql` and one explicit
  initialization in `regular_staff_email.test.sql`.
- Schema: additive `20261003180734_readonly_authentication_context.sql` only in this
  continuation. Prior migrations/source snapshots preserved; nothing hosted applied.
- Notes: ARCHITECTURE, DECISIONS, PROGRESS and regular-staff-email-check feature note.
  Private Windows delivery/launcher/fixture helpers remain ignored outside Git/CI.

Commands: application `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
`pnpm test:e2e` and the auth Playwright configuration. The local public run used an
ignored alternate-port configuration because3210 was occupied; no existing process was
stopped. Disposable CI alone runs `pnpm db:reset`, `pnpm db:lint`, `pnpm db:test`,
local security advisors, `pnpm db:types` and `pnpm db:integration`. The new migration was
created with installed Supabase CLI `migration new` after reading its help. Private
helper tests use `Test-IsolatedStaffCodeSynthetic.ps1` and
`Test-IsolatedStaffCodeDeliverySynthetic.ps1` in both PowerShell versions; the sole
actual code send used `Start-IsolatedStaffEmailPreview.ps1 -RunSingleFlowTest` once.

## 3 October 2026 — Isolated email readiness tests

Current result: **isolated SMTP authentication, acceptance and inbox delivery PASS**.
The organizer confirmed Google 2-Step Verification is on and requested another try.
Executed `Test-ReplacementEmailReadiness.ps1 -RunAuthorizedSecondReplacementTest`
once: exit 1, AUTH 535, no email attempted. This fixed extra attempt preserved all five
earlier records. Its 63 synthetic checks and the existing 77 wrapper checks passed in
both PowerShell versions; root independently reran 63. A malformed singleton-array
receipt is denied. Actual broad-ACL fixture mutation was blocked by Windows privilege
requirements; the prior-receipt ACL failure gate was tested by explicit injection.

Read-only inspection of the already-open Google Security page confirmed 2-Step is ON
and found that its account address differs from the earlier organizer-supplied address
used by every failed test. Flagged this conflict before changing the selected account.
The organizer explicitly confirmed the corrected sender/self-recipient for isolated
tests. Kept address details and credentials out of Git; changed only ignored local
helpers to carry that exact account through native AUTH, SMTP credentials and From/To.
Preserved old defaults/records for historical tests; new fixed corrected-account markers
prevent replay. Exact AUTH 235 in the same invocation remains required before sending.
Corrected-account 23, AUTH89, readiness56, first-wrapper77 and second-wrapper63 synthetic
checks PASS in both runtimes; root independently reran 23 before the real corrected test.
One synthetic test-directory bootstrap race failed initially; its rerun passed after
directory creation. This was fixture setup, not evidence of a transport/helper failure.

Executed `Test-ReplacementEmailReadiness.ps1 -RunConfirmedCorrectedAccountTest` once:
exit 0, verified-TLS **AUTH 235** followed by **SMTP accepted** the unchanged English
readiness message. Read-only Gmail Primary Inbox observation showed the exact subject
and complete reviewed body at 20:00 Riyadh on 3 October 2026. No additional email was
sent during that readiness diagnostic. Both credentials and all eight attempt records
retain private ACLs. This verifies
the replacement credential with the corrected account; earlier 535 results established
rejection of the earlier username/credential pair, not invalidity of the password alone.
Production Auth/SMTP/provider configuration, app runtime, CI secrets, migrations,
roles/grants and all operational/readiness flags remained unchanged at this diagnostic
stage. Staff OTP/cookie integration, recovery, participant delivery and human login/
accessibility UAT were then NOT TESTED; current separately executed SMTP/native-CI
results are above. The combined managed-login/real-inbox/human flow remains NOT TESTED.
That diagnostic head 7b7b48e CI37135487400 and 37135484961 was freshly verified PASS;
application/build/database/browser suites were not rerun locally for this diagnostic.

Replacement continuation: the organizer reported the replacement credential stored.
Executed `Store-ReplacementEmailTestCredential.ps1 -Status`: exit0, readable locally;
no network. Prepared ignored `Test-ReplacementEmailReadiness.ps1`, preserving both
credentials and all earlier attempt records. Its fixed new AUTH marker reserves one
probe; a separate fixed send marker can be used only after exact AUTH235 success in
the same invocation with the same replacement SecureString. Default invocation is
preparation only. Independent review and 77 targeted synthetic checks PASS in both
PowerShell 7.6.5 and Windows PowerShell 5.1; root independently reran 77 in PowerShell 7.
Coverage includes rejection/malformed/uncertain replies, no premature send, existing
markers/replay, callback failures/redaction, same secret and synthetic-record preservation.

Executed `Test-ReplacementEmailReadiness.ps1 -RunAuthorizedReplacementTest` once:
exit 1, **replacement AUTH 535**, no test email attempted. Retain the replacement AUTH
record; do not retry either rejected credential. A read-only SecureString comparison,
validated by 4 synthetic checks, confirmed the replacement differs from the original;
no password, ciphertext or digest was emitted. Safe presence/private-ACL checks confirm
both credentials, all four historical records and the replacement AUTH record remain;
no replacement email-send marker exists. Source re-review found no likely framing,
account-selection or storage defect. This proves Gmail rejected two different stored
credentials, not the reason for rejection. Requested mailbox-manager status checks:
current 2-Step Verification, exact-account replacement entry, any subsequent normal
Google-password change and any blocked sign-in/security alert. Google documents that
app passwords require 2-Step Verification and account-password changes revoke them:
https://support.google.com/accounts/answer/185833?hl=en . At that stage network attempts
stopped pending that information. SMTP acceptance/inbox delivery were BLOCKED, with no
production/app/CI credential or readiness changes. Prior docs-only branch e09f8e9
CI37133281956 and 37133278422 were freshly verified SUCCESS before this continuation.

The organizer selected a Gmail mailbox and reported its manager can help. A dedicated
app password was manually stored outside Git using Windows-user encryption and private
ACLs. Safe status confirmed it is readable locally; no credential was printed or added
to application/CI configuration. The organizer then explicitly authorized exactly one
English readiness message from/to that same mailbox, with the reviewed subject/body,
no OTP/account data, no automatic retry and no production changes. This is a narrow
exception to the earlier no-real-email scope, not production-provider approval.

Executed ignored local `Send-OneEmailReadinessTest.ps1 -SendApprovedOneTest` once under
Windows PowerShell 5.1: exit1, **FAIL / acceptance unconfirmed**. The private atomic
attempt receipt records `failed-or-uncertain` and blocks further attempts. Provider
details were withheld; the original cause was not retained. Do not claim credential
validation, SMTP acceptance or inbox delivery, and do not automatically resend.
The organizer subsequently reported that the message was not received after being
asked to check Inbox/Spam, and confirmed the app password was created under the
intended sender account. This is human feedback, not a recovered provider error.

Executed credential-free `Test-SmtpConnectionOnly.ps1`: exit0, TCP587 connection,
SMTP greeting, STARTTLS availability, TLS1.2 and default certificate validation PASS.
It made no AUTH/MAIL/RCPT/DATA request and used no credential. These results narrow the
connection investigation but do not establish why the approved send failed.
The send helper's prior14 fake-delivery checks passed in both PowerShell7.6.5 and
Windows PowerShell5.1; those are simulation evidence, not real delivery proof.
After the failed attempt, improved the ignored diagnostic helper to retain only a
fixed failure stage/category and bounded numeric SMTP status, and to distinguish
SMTP acceptance from a later local receipt failure. Prepared a distinct second-test
switch requiring separate approval and the original private failed/uncertain receipt;
its fixed atomic marker preserves the first and prevents further repeats. Final46
fake-delivery checks PASS in PowerShell7.6.5 and Windows PowerShell5.1, including
approval/receipt/replay denials and sensitive-text exclusion. Root independently
reran the Windows PowerShell5.1 suite.

The organizer then granted standing authorization for isolated test emails without
repeated questions. Interpreted within the reviewed sender/self-recipient test scope;
no production delivery or live staff/participant communications are approved. Executed
`Send-OneEmailReadinessTest.ps1 -SendApprovedSecondTest` once: exit1, stage`smtp-send`,
category`smtp`, status-1 (generic failure). The second private marker is retained and
SMTP acceptance remains unconfirmed. No blind retry; investigate the underlying
transport/runtime/credential issue without logging provider messages or secrets.

Extended safe diagnostics through generic SMTP wrappers: final56 fake checks PASS in
both runtimes, retaining only fixed category chains and defined numeric socket codes.
Prepared a fixed third runtime-comparison wrapper preserving both original markers:
79 fake-only checks PASS in both runtimes; root independently reran the PowerShell7
suite. Executed that third diagnostic once in PowerShell7.6.5: exit1, smtp-send,
category/chain`smtp`, SMTP530, no socket error. Gmail documents530 for authentication
required or STARTTLS required; the numeric code alone does not establish bad credentials.
Separate connection/TLS checks passed; sender authentication remains unverified.
Source: https://support.google.com/mail/answer/3726730?hl=en . The third marker remains.
Executed the TLS-enforced AUTH-only diagnostic once in PowerShell7.6.5: exit1,
**AUTH535 / credentials-rejected**. It performed no email submission. The server rejected
the currently stored credential; this is a sender setup blocker, not proof of the reason
(for example, revoked/incorrect credential or account configuration). AUTH marker retained.
Source-reviewed secure ordering/certificate/cleanup/no-email guards; root independently
ran87 fake checks before execution. Independent review found no security blocker but
flagged deadline accuracy; fixed remaining-time/monotonic bounds and final89 fake-only
checks PASS in both runtimes. The actual probe completed in1.4s before that repair.
No additional network retries with the rejected credential.
Prepared ignored `Store-ReplacementEmailTestCredential.ps1`: hidden manual input,
fixed separate replacement filename, Windows-user encryption/private ACLs, no overwrite
of the original credential or any marker, no network. Its38 synthetic checks PASS in
both runtimes; root independently reran PowerShell7. Safe replacement Status reported
absent at that point; the continuation above records actual entry and rejection.
Never request a credential through chat, command arguments or CI variables.

Production Auth/SMTP, hosted migrations, DNS, roles/grants and all operational/readiness
flags are unchanged. No application code changed; application/build/database/browser
suites were not rerun for this local diagnostic. Inbox receipt, real staff OTP/cookie
exchange, authenticator/recovery human UAT and production release remain unverified.
Local helper/credential/attempt files remain excluded from Git. No hosted rollback is
needed; preserve the attempt marker to prevent a repeat, and let the mailbox manager
revoke the dedicated credential if the test setup is retired.

Next smallest task: prepare the isolated staff password/email-check delivery and cookie
slice using synthetic identities, retaining exact-user/session/current-email/password/
grant assurance and the approved abuse/session controls. Test-inbox readiness is now
verified; production provider/configuration approval and live access remain separate.
Preserve both credentials and all attempt receipts; no further readiness retry is needed.
Small isolated self-recipient test emails are authorized without repeated approval;
production delivery, privacy/location, recovery and human login/cookie UAT remain gates.
Prepare isolated managed staff login/email delivery/cookie tests after sender readiness;
retain all policy, recovery, privacy/location, recent-auth and warning-lead gates.

## 3 October 2026 — ORG-016 removes phone/SMS; Super Admin authenticator MFA

Reviewed PR22 source at5977eb7, PR19's original base3e0f8a1, existing implementation and
ORG-013/014/015 before changes. Fresh remote main8482abf adds independent public mobile
work; no auth runtime changes were merged here. Preserved original checkout edits,
deployed migration20261002173712 and all earlier review migration/source snapshots.
Flagged outdated participant-phone/Super-Admin-SMS requirements before editing.
Recorded ORG-016; retired SMS provider/sender/budget/hook/phone recovery work.

Current policy: participant managed email/password plus verified email only, no phone
or MFA; regular staff password plus private exact-user/session email receipt at native
AAL1; Super Admin password then current authenticator TOTP at native AAL2. Roles/scopes,
strongest tier across editions, individual identity and all15 closed workflows/readiness
remain unchanged. Participant72h and privileged30min idle/8h absolute retain native
original-session origin; refresh cannot reset it or count as activity.

Removed active SMS config/provider/hook/inbox/static code and phone fixtures/UI/DTO
fields. Restored QR/manual authenticator setup and RFC6238 synthetic helper; setup is
returned once, transient, cleared after verification/terminal/reload and never logged
or stored in browser storage. Pinned qrcode1.5.4/@types1.5.6. Authentication emails stay
English-only; EN/AR/RTL UI and staff email single-use/limits/failure controls preserved.

New additive review-only20261003110812_authenticator_super_admin_policy.sql overrides
current assurance/context and closed maintenance attribution. Participants need current
verified email/password; Super Admins need signed and native exact-session password/TOTP
proof against current factor at full native precision, denying same-second stale factor
mutation. Expiry resamples after factor-lock waits. Prior migrations unchanged; no hosted
apply, reset/seed, production Auth, real messages/accounts/invites/grants/resets or spending.
Branch Git deployment remains disabled; local preview only.

Executed local: lint PASS; typecheck PASS; unit1301/28files PASS after fixing a
retired phone action in the participant test helper; production build42pages PASS.
Public browser300 PASS/3 existing skips; revised auth browser69 PASS. Local EN/AR
preview3220 and health200, correct RTL, no phone inputs/overflow/page errors at1440,
791 and390px; transient setup disappears on reload. QR/key/code captures are masked;
all12 responsive setup/reload captures were inspected.
No local Docker/database runtime is run.

PR25 is the new draft against current unmerged PR19. Initial isolated CI37120098412
atcf4963e passed lint/types/units/build and393 SQL assertions, database lint/advisors/
generated public types, but44/46 integrations passed: two genuine positive TOTP cases
failed because the draft used noncanonical AMR method mfa/totp. Pinned GoTruev2.197.0
uses totp. Corrected only current override/positive fixtures/SDK assertions, retaining
full-precision ordering. Corrected code6204db3 passed full
[CI37120525547](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37120525547):
lint/types,1301 units/28files,42-page production build,300 public+69 auth browser tests
with3 existing public skips;393 SQL assertions/5files and46 integrations/5files
(13 genuine managed Auth,17 staff email,10 local wrappers,4 denial,2 concurrency).
Database lint, security advisors (no issues), generated public types and shutdown PASS.
Completed application/database job logs inspected; actual GoTruev2.197.0.
Executed local commands: pnpm lint, pnpm typecheck, pnpm test, pnpm build,
pnpm test:e2e and pnpm exec playwright test --config playwright.auth.config.ts.
The disposable unlinked loopback GitHub runner additionally ran pnpm db:reset,
pnpm db:lint, pnpm db:test, security advisors, generated schema types and managed
integration tests; db:reset was never run against a hosted project or this computer.
The final receipt/documentation commit will receive its own CI check; the tested
code receipt above identifies the source tested without asserting an unrun later head.
This is a correction, not a
timestamp tolerance or reduced assurance policy. Historical migrations remain unchanged.
One visual diagnostic timeout printed a synthetic setup key; restarted the lab to revoke
all synthetic sessions and wrapped diagnostics to withhold sensitive browser errors.

TOTP provider behavior is distinct from email single-use: a still-valid native TOTP
time-step code can verify a distinct unused challenge; consumed-challenge replay denies.
The synthetic verifier's consumed-step guard is stricter lab behavior, not managed
provider proof. Production TOTP abuse controls/human UAT are not silently approved.

Live English SMTP/provider/sender is absent; console/test only, no development-email
fallback. Recovery retains revoke/suspend first, in-person identity/appointment review,
distinct Super Admin approver/operator; named people, precise lost-email/authenticator
evidence/procedure/rehearsal remain TBD. Recent-auth age/warning lead, privacy/retention/
location and production release remain unresolved. Human inbox/authenticator devices,
screen readers, cookie exchange, actual Storage policies and recovery are NOT TESTED.
Storage/CMS/operations stay closed. Inbox access may allow both password reset and
staff email-code receipt, weaker than authenticator MFA.

Current main also uses ORG-011 for a separate public decision, in addition to the already
recorded ORG-010 collision; preserve both auth/public meanings and reconcile IDs during
later integration without publishing intended-administrator login addresses.

Fresh GitHub status correction: PR22 had already merged into draft PR19 at10:23UTC,
with identical source at its new base7dce160. The earlier "draft PR22" handoff was stale.
Its historical title/body was restored after a brief mistaken amendment update.
Created codex/email-authenticator-no-sms for a new amendment PR against PR19's current
unmerged branch, preserving current main and both uncommitted original-checkout work
and review history. Both authentication review branches disable Git deployment.

Rollback: stop local lab/clear flag/restart to discard synthetic memory; revert only
isolated review code as needed, keeping latest policy and never activating the superseded
SMS draft. No hosted rollback is needed. Next smallest task: approve concrete English
email provider/sender and allowlisted isolated delivery/cookie configuration, then test
delivery and session enforcement while recovery and live access remain closed.

**Snapshot: 3 October 2026. Update this file after each development task.**

## 4 October 2026 — Contact form live in production

Requester-authorized activation, following `docs/features/contact-delivery.md`:

- **Hosted migration:** with explicit requester approval, Claude applied only `20261004114603_contact_abuse_counters.sql` to the Production Supabase project `msrc` (`ecemjggwlzqpjcwmchrl`) through the Supabase connector, as `postgres`. The history row the connector created under its own timestamp was renamed to `20261004114603`, so history matches the repository; no other migration was applied or recorded. Persisted authorization (`20261002173712`) remains the only earlier entry, and PR 25's staff/session migrations are still unapplied.
- **Read-only verification (PASS):** `attempt_buckets` has RLS enabled and forced. `anon` and `authenticated` have no schema, table or RPC access, and `service_role` can execute `msrc_contact_reserve_attempt`. `pg_cron` is installed with `msrc-contact-expiry` (`*/5 * * * *`, active, owner `postgres`). There were 0 counter rows before activation.
- **Configuration (requester, Vercel Production):** `RESEND_API_KEY` (Sending access, msrc2027.com), `CONTACT_SUPABASE_SECRET_KEY` (dedicated secret key `contact_vercel`), `CONTACT_SUPABASE_URL` and `CONTACT_SECURITY_SECRET`. First redeployed with delivery off (EN/AR closed, `503 CONTACT_CLOSED`, 26 public pages swept clean), then `CONTACT_DELIVERY_ENABLED=true` and a second redeploy. Rate and fill-time settings use the code defaults (3/hour, 10/day per IP and per email, 3 seconds), accepted by the requester.
- **Live checks:** `GET /api/contact?locale=en` returned `ready`. EN and AR forms render enabled with 9 topics and no console errors. Human tests by the requester: the EN Registration message arrived in the conference inbox from `MSRC 2027 <no-reply@msrc2027.com>` with the `[MSRC Registration]` subject tag, the Gmail label applied, `Test O'Brien & Co` shown unescaped (PR 35) and Reply-To set to the visitor's address. The AR Sponsors & partners message arrived and was labelled correctly with readable Arabic. PASS.
- **Subject format kept:** `<tag> <first line of the message, up to 80 characters>` (requester reviewed).
- **Requester decisions recorded:** contact emails in the Gmail inbox are deleted one year after the conference, matching registrations. Resend's US storage and 30-day retention go to the privacy-wording owner for the final Privacy text.
- **Rollback:** set `CONTACT_DELIVERY_ENABLED=false` (or remove it) and redeploy. For an emergency stop before the redeploy finishes, revoke the Resend key. Counters expire on their own.
- **Still open:** final Privacy/Terms wording; staff authentication email remains a separate gate (contact uses at most 60 of Resend's 100 daily free sends); provider, bounce and pg_cron health monitoring.

## 4 October 2026 — Contact email: send visitor text as written (follow-up to PR 34)

Review of PR 34 found that the text-only contact email HTML-escaped every field. Staff would have read `Sponsors &amp; partners` and `Research &amp; abstracts` in every email on those topics, and names such as O'Brien as `O&#39;Brien`. A text-only email has no HTML part, so mail clients already show `<` and `&` literally.

- `src/features/contact/delivery.server.ts`: `escapeContactText` removed; labels and visitor fields are sent as written. Validation still rejects header-breaking characters, the fixed sender, recipient and Reply-To rules are unchanged, and no `html` part is sent.
- `tests/unit/contact-delivery.test.ts`: topic labels contain no entities; `Sara O'Brien` and `Q&A <test> "quoted"` arrive unchanged, and no `html` property exists.

Verification: `pnpm check` PASS (ESLint, typegen/tsc, Vitest 1766/1766, build). `playwright.contact.config.ts` (mock provider and counters): 44/44. Delivery remains off in production.

## 3 October 2026 — ORG-015 narrow regular-staff email amendment

Reviewed current PR19 draft, main `59d82a6`, existing code and ORG-013/014 before edits.
During verification remote main advanced to `c10b2c5` through public-page PR21, with
no authentication runtime overlap. Its ORG-010 identifier collides with this draft's
Production designation; the integration note in DECISIONS preserves both meanings
for later reconciliation. This amendment stays stacked on PR19 and does not merge main.
Flagged the all-staff SMS/AAL2 assumption and absent approved email provider. Created
`codex/regular-staff-email` from PR19's `3e0f8a1`, preserving pending ORG-014 tests/docs
and original checkout's uncommitted work. Vercel Git deployment is explicitly disabled
for this branch; review is local and disposable CI only. No merge/deploy, production
Auth change, hosted migration/reset, invitation/live grant or real email/SMS.

Regular staff now require password plus a fresh verified-email application receipt.
Super Admin password/SMS MFA, participants' email/password plus email+phone verification
without MFA, role/scopes, 72h participant and 30min idle/8h staff limits are preserved.
The receipt binds exact managed user/session, current email/user/password/grant versions;
new login needs a fresh check, refresh cannot restart the origin. Email proof is not
Supabase MFA/AAL2; inbox compromise may allow password reset and receipt of the code.
All operational/readiness flags stay false. See the
[implementation, configuration, UAT and rollback note](features/regular-staff-email-check.md).

New additive review-only migration `20261002233353_regular_staff_email_check.sql` adds
four private forced-RLS evidence/revision/audit tables, narrow service RPCs and a self-only
current-auth predicate. Prior migrations and v0.5 source are unchanged. Approved staff
OTP limits are reused with atomic account/IP reservations, single-use/replacement,
committed attempt counters and fail-closed delivery/audit behavior. UI remains EN/AR/RTL;
authentication test email is English-only. No provider/sender/key/default SMTP is active.
Managed Auth refresh exposed that generic native user.updated_at changes despite
unchanged password/session proof. Receipts instead use a protected revision of relevant
email/confirmation/password changes; irrelevant timestamp changes preserve verification.

Checkpoint validation: `pnpm check` PASS (lint/types,1272 unit tests across27 files,
42-page production build); auth browser69/69 PASS across desktop/tablet/mobile,
including EN/AR keyboard/Axe/failure/retry. Twelve masked representative captures
plus four regular-staff scroll-zero captures inspected; no horizontal overflow.
`git diff --check` PASS. Isolated [CI37085497603](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37085497603)
at `ae62270` executes database reset/lint,378 assertions across5 SQL files, security
inspection (no findings), nonempty public type generation/strict compilation and44
integrations across5 files PASS. All17 regular-email and11 native Auth cases pass,
including refresh/new-login preservation, native password mutation, email/confirmation
away-and-back, direct permissions and concurrency. Actual runtime:
`public.ecr.aws/supabase/gotrue:v2.197.0`; shutdown PASS. Initial runs exposed and fixed
the generic user-version refresh bug and three CI fixture issues (phone-provider
resolver, internal-role impersonation and native hook message shape). No production
permission or policy was relaxed to repair those fixtures.
Application CI at `d9fb440` passed1269 units/300 public+69 auth browser tests with3
existing skips and production build; current local lint/types/1272 units/build pass
after the final wording/guard changes. Final-head application/CI receipts are recorded
on [draft PR22](https://github.com/xpexellent-dotcom/msrc-2027/pull/22) and the linked
checklist. Preview EN/AR and health each200, Arabic RTL verified; no GitHub deployment
at the corrected source head. Local database is NOT TESTED (no Docker requirement).
Real email/cookie delivery, storage-object policy integration, recovery and human UAT
remain NOT TESTED/BLOCKED. Storage is disabled, and no operational domain policy is
opened. SMTP/provider/sender, privacy/location, recent-auth age, warning lead, named
recovery custodians/evidence/rehearsal and production release remain gates. Recovery
retains distinct Super Admin approver/operator and in-person identity review.

Next smallest task: approve concrete isolated English email delivery configuration and
recipient/privacy scope, then wire/test the disabled adapter without enabling workflows.
Super Admin SMS direct-Auth newest-challenge/abuse controls remain a separate release
blocker. No production rollback is needed; revert the amendment and restart/stop the
memory lab, with disposable fixtures removed by runner teardown.

## 3 October 2026 — ORG-014 decisions and isolated managed Auth API tests

Organizer decisions now recorded: Saudi-only first delivery test, no existing SMS
service, RPClub contracting entity, Vonage/MSRC2027 conditional shortlist, approved
SMS control targets and recovery target (distinct Super Admin roles, in-person
identity review). Individual recovery custodians remain unnamed. Keep tests in
disposable GitHub CI; no paid hosted setup or SMS spending is authorized. Recent-auth
timing, warning lead, privacy/location and real-human UAT remain unresolved.
Details, provider qualification questions/cost illustrations, control enforcement
gaps and recovery sequence: [managed decision packet](features/managed-authentication-plan.md).

Reused clean PR19 worktree at `3e0f8a1` on `codex/staff-mfa-sessions`; remote main
reverified at `59d82a6`. Original checkout's uncommitted docs/reviews remain untouched.
Typed configuration records the approved targets, separates the provider/sender
shortlist from null active settings, and keeps spending/live/recovery gates closed.
All operational/readiness flags remain false. Source v0.5 and both migration files
are unchanged; no new migration, dependency, hosted resource or production mutation.

Added a CI-only Auth configuration preparer, ten environment/config rejection
checks, and genuine managed SDK/API integration coverage with synthetic identities.
Global signup stays disabled. Phone MFA uses a private test-only SMS hook/inbox;
email delivery is rejected. Generated codes/passwords/tokens/SQL diagnostics never
enter test snapshots/logs/artifacts. Hook/inbox objects clean up after execution;
all fixture state disappears with the disposable runner. The normal local Supabase
configuration stays unchanged, and the fixture harness refuses hosted/non-loopback
targets or a non-GitHub-hosted runner. CI records its actual GoTrue image/version.

Local `pnpm check` PASS: lint/types, 1083 unit tests across26 files and42-page
production build. Focused session-policy66/66 and CI config guard10/10 PASS.
`git diff --check` PASS. No browser code changed; automatic CI runs the existing
public and auth suites. Managed runtime/database execution is pending isolated CI
at this checkpoint; no local Docker/SQL was run. Exact final source/head CI and
protected Preview receipts are recorded on PR19 and the linked checklist.

Source review found two integration differences to test: managed participant
phone-change verification creates an OTP session, requiring a new email/password
sign-in for password proof; native phone MFA accepts older unexpired challenges.
Approved newest-challenge access and shared abuse limits need trusted hook/database
evidence; UI throttling/native AAL2 alone is insufficient. Current false readiness
keeps every operational action closed. These targets are not declared enforced.

Live SMS/managed-hosted delivery, application cookie exchange, actual recovery,
named-human devices/screen readers and UAT remain NOT TESTED/BLOCKED. Phone provider
qualification/registration/quote and future budget remain pending. Rollback: revert
this test/config/docs slice; disposable fixtures disappear on shutdown. No hosted
rollback is needed. Next smallest implementation: shared managed send/failure
controls and a trusted current-challenge assurance receipt before any live access.

## 3 October 2026 — ORG-013 participant verification and staff SMS policy

Explicit organizer override: participants require email+phone verification without MFA;
staff/admins use password then SMS OTP. Managed email/password remains primary sign-in.
ORG-013 supersedes current TOTP/optional-phone/no-SMS authentication requirements only;
the v0.5 source and dated earlier TOTP receipts below stay preserved. SMS outside
authentication, WhatsApp/push and other operational communications remain excluded.
The requester reported the earlier preview worked; new SMS/managed-provider/human
accessibility UAT is separate and remains unverified.

Fresh GitHub main is `59d82a6099166631722a8340db494fbb7506c430` (merged PR20);
PR19 remains open/draft/unmerged. Reused its isolated `staff-mfa-sessions` worktree/
`codex/staff-mfa-sessions` branch and merged current main (merge `0d7d727`), preserving
both auth and chapter-bar progress entries. Original main checkout's uncommitted
docs/reviews and the previous authorization worktree remain untouched.
Fresh main [CI37068248924](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37068248924)
reports success at59d82a6; this is a receipt check, not a new broad main runtime audit.

Current closed lab: simulated successful password step, separate participant email/SMS
verification with AAL1/no factor, and staff phone enrollment/challenge/verification with
SMS/AAL2. Ephemeral generated codes return only in the send response; server-held keyed
hashes, single-use/replacement/expiry, bounded retries, serialized verification/audit and
sanitized failure recovery. EN/AR/RTL, keyboard, Arabic digits, transient locale/retry
input and test inboxes replace QR/manual authenticator setup. No real password/phone
collection, delivery, account, invitation, grant or reset. Unused QR dependencies removed.

Authentication configuration records approved policy with live SMS provider/sender/budget/
expiry/resend/attempt/account/IP settings and recovery still unset. Server/database
assurance requires current password then exact managed `mfa/phone` proof and a current
verified phone factor. Participant email/phone confirmation grants no staff MFA. Trusted
adapter chooses SMS explicitly; AMR does not prove the delivery channel. Pending session
migration overrides the historical own-context RPC without changing/reapplying deployed
`20261002173712`. New `20261002193800` remains REVIEW ONLY. Participant72h and staff30min
idle/8h absolute remain; refresh never changes origin, staff cannot downgrade by edition.
All15 operational flags and both readiness flags remain false. No hosted mutation.

Verification checkpoint: `pnpm install --frozen-lockfile` PASS; `pnpm check` PASS with
lint/types/1073 units and42-page production build after review fixes. Full public browser
suite `pnpm test:e2e`:300 PASS/3 existing explicit skips; dedicated SMS browser initially
36 PASS, then expanded to48 for participant messages and periodic expiry/revocation
announcements. Expanded run42 PASS/6 test-fixture failures: a mock expiry was followed by
navigation that correctly restored the still-active real synthetic server session. Test
only corrected to restart from the displayed terminal state; final48/48 PASS (37.2s).
Auth error-context files contained test source only; credential-bearing automatic aria
snapshots/traces/screenshots are disabled, and explicit captures mask inbox/code fields.
All12 masked EN/AR staff/participant captures across desktop/tablet/mobile were inspected;
forms/RTL/overflow checks passed. A fixed-header position in some full-page screenshots is
a capture artifact, not certification of human screen-reader/device UAT.

Actual isolated database [PR CI37073654880](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37073654880)
job111058834913 at3f1c5ad PASS: `pnpm db:reset` LOCAL only, `pnpm db:lint` no schema
errors, `pnpm db:test` four files/260 assertions PASS, security-advisor check PASS,
public schema generated-types strict compile PASS, `pnpm db:integration` three files/16
tests PASS (including two actual parallel lifecycle tests), stack stop PASS. Logs were
decoded and inspected. Earlier database job111057383943 at3c2f362 also passed260/16;
SQL/application source is identical, only a browser fixture/progress entry changed.
Final documentation-only commit receives its own automatic application/database CI and
Preview checks; latest exact-head receipts are recorded on PR19 and the linked checklist.
Vercel Preview6819754422 at3f1c5ad reports success:
https://msrc-2027-hstb8t987-msrc2027.vercel.app. Authenticated Vercel runtime inspection
remains BLOCKED by protection/connector access. This lab intentionally rejects every
Vercel environment; local synthetic review is available instead. Rebuilt EN/AR preview
on127.0.0.1:3220 each returned200. No deployment protection bypass was opened.
Review also fixed reauthentication clearing code-attempt cooldowns; three new regressions
PASS. Independent SQL/TS/source review found no actionable issue; it executed no DB tests.
`git diff --check` PASS. Fresh production auth-lab page/API404 and health200 confirm the
existing production boundary; no production deployment changed. Local Docker/SQL is
intentionally NOT TESTED. Human screen-reader/device, actual SMS delivery,
managed cookie/refresh, lost/changed phone recovery and production configuration UAT
remain NOT TESTED/BLOCKED. Earlier successful PR19 TOTP CI is not proof of this override.

Remaining release inputs: SMS provider/sender/budget/operating controls; verified
phone-loss/change/reset procedure and recovery approver/operator; recent-auth age and
warning lead; privacy/retention/location; live security-email provider/sender; production
plan/region/operational approvals; two intended administrators. Login addresses remain
private. Next smallest task is approved isolated managed password→SMS integration/UAT.
Rollback: stop local lab/clear opt-in to discard ephemeral state; revert application changes
if needed. No production SQL rollback is needed because the new migration is unhosted.
Details and manual review steps: [feature note](features/staff-security-foundations.md).
## 3 October 2026 — QA pass: Arabic visitors at the root, Event search data, sitemap x-default

Live sweep of www.msrc2027.com after PR 27: all 20 public pages (EN/AR) at 1280 px Chromium, Pixel 7 Chromium and iPhone 13 WebKit return 200 with one h1, the right `lang`, no console errors, failed requests, broken images, unnamed controls or horizontal overflow; axe (WCAG 2.2 AA + best practice) reports no violations; all 24 linked URLs return 200. Security headers, the apex and `.vercel.app` 308s, robots and sitemap are as ORG-013 set them. Changed:

| Found | Change |
| --- | --- |
| `msrc2027.com/` sent every visitor to `/en`, including browsers set to Arabic (`Accept-Language: ar-SA,…`), although the whole public site exists in Arabic | A second edge redirect in `next.config.ts`: when the browser's first language is Arabic, `/` → `/ar` (307). Everyone else, and requests without the header, still get `/en`, so English stays the default (LOC-01). No cookie or function is involved; a visitor who switches language keeps using the `/en` or `/ar` links |
| The homepage had no structured data, so search engines could not show the conference as an event with its dates | `src/lib/structured-data.ts`: a schema.org `Event` on `/en` and `/ar` with the name, lead, confirmed dates (ORG-001), Jeddah/SA, the organizer line and the OG image. No venue (until `conferenceConfig.venue` is set), times, prices, offers or capacities. `<` is escaped in the JSON. A schema.org `WebSite` (name "MSRC 2027", the kicker as alternate name, root URL) sits alongside it, so Google can show the site name instead of the domain |
| English ICU writes a same-month range as "27 – 28 January 2027" (About, meta descriptions, link previews, the OG image) while the hand-written copy everywhere else says "27–28 January 2027" | `formatConferenceDateRange` closes the spaces around the en dash only between two digits, so a cross-month range keeps them ("31 January – 1 February"). Arabic was already «٢٧–٢٨» |
| The 404 and error pages still said "this page has not been added to the preview" and "Return to the preview" (AR «المعاينة»), and every link-preview card (WhatsApp, X, LinkedIn) carried a gold "WEBSITE PREVIEW" badge, although ORG-013 made the site public | 404/error copy now points to the home page in both languages; the card shows `msrc2027.com` in place of the badge. The footer's approval note is unchanged (kept by ORG-013) |
| CI ran twice for every pull-request commit (`push` and `pull_request`), as the 3 October landscape pass noted | `.github/workflows/ci.yml` runs on `push` to `main` only; branches are checked through their pull request, and `workflow_dispatch` remains |
| Search snippets: Home, About and Dates lead with the dates, but Programme, Speakers, Participate, Workshops, Hackathon, 3MT, Media, Registration and Submissions used only their one-line lead (e.g. "Discover the people behind the scientific programme.", 52 characters, with no when or where) | `conferenceDescription` (`src/lib/metadata.ts`) gives them "27–28 January 2027, Jeddah. …" (AR «٢٧–٢٨ يناير ٢٠٢٧، جدة. …»), also used for the link-preview description |
| Visitors could read the confirmed dates but not save them | **Add to calendar** under the two days on Dates & venue (EN «Add to calendar», AR «أضف إلى التقويم»). It is a plain download link to `/en/msrc-2027.ics` or `/ar/msrc-2027.ics`, prerendered and working without JavaScript: one all-day event, 27–28 January (DTEND 29, exclusive), Jeddah, a link back to the page, a shared UID and a fixed DTSTAMP. There are no times, venue, organizer or attendees until confirmed. RFC 5545 escaping and 75-octet folding are in `src/lib/calendar.ts`. This is not a personal schedule builder: it holds the published conference days only |
| `/manifest.webmanifest` returned 404, so Android "Add to Home screen" fell back to a generic name and icon | `src/app/manifest.ts`: "MSRC 2027", the brand ivory, `icon.svg` and the 180px icon, and `start_url: "/"` (opens Arabic or English by browser language). `display: "browser"`: a shortcut only, with no offline mode, install prompt or notifications |
| `/en/programme` and `/en/participation` (spelling and long-form aliases) answered 307 *temporary* from a server function on every hit | They are now permanent 308 edge redirects in `next.config.ts` (`/:locale(en|ar)/…`, query kept), and the two page files are removed. `/fr/programme` stays 404 |
| Pages list `hreflang="x-default"` but the sitemap did not | The sitemap adds `x-default` → English for each page, matching the pages |

Tests: new `calendar.test.ts` (dates, exclusive end, no times, escaping, folding) and two `dates-venue.spec.ts` cases (link, download name, content type, body; 15/15 across desktop, tablet and mobile, including the page's axe scan); new `page-descriptions.test.ts`; new `launch-copy.test.ts` keeps "preview" out of the EN/AR 404/error copy and the card; `conference-dates.test.ts` now expects the exact EN and AR ranges and a spaced cross-month range; `public-indexing.test.ts` covers eight `Accept-Language` values at the root (Arabic first → `/ar`; English first with Arabic later, French, `arn-CL` and none → `/en`) and the sitemap's alternates; new `structured-data.test.ts` checks the Event facts in both languages, the absence of unapproved fields and the script-tag escape.

Verification: `pnpm check` PASS (ESLint, typegen/`tsc`, Vitest 903/903, `next build`). The local production build answered `ar-SA,ar;q=0.9,en;q=0.8` → 307 `/ar`, `en-US,en;q=0.9,ar;q=0.8` and no header → 307 `/en`, and served the Event JSON-LD on `/ar` and none on `/en/about`. Playwright `public-shell` and `qa-regressions`, Chromium desktop and mobile: 56/56. WebKit desktop and iPhone, `dates-venue` + `public-shell`: 27 passed, 5 failed. All 5 are `toBeFocused()` after Tab, the known WebKit Tab-focus limit on this Windows host noted on 3 October. The new calendar cases passed 4/4 in WebKit. Firefox: NOT TESTED (does not launch on this host). Rich-result eligibility in Google's Rich Results Test: NOT TESTED (needs the deployed URL).

Found, not changed: every 404 (`/en/zzz`, `/fr`, `/en/speakers/unknown`) is served as Next's empty `<html id="__next_error__">` shell with status 404, and the localized 404 appears only once JavaScript runs (blank with JavaScript off, and blank for ~2 s on a slow phone). A minimal Next 16.3.7 app and 16.3.8 behave the same for `notFound()` from an on-demand page; only unmatched URLs get server HTML. `global-not-found` (experimental) does not help: every path matches `[locale]`, and that page is prerendered once, so it cannot be localized. A fix would mean dropping the catch-all and `dynamicParams = false` on the shared root layout, and it would still miss in-route `notFound()` calls. Left for a framework fix or a deliberate routing change.

Found, not changed: on a throttled phone, `/ar` scores LCP 2.4–3.3 s and CLS 0.035–0.051, against 0.001 for `/en`. The only shift is the hero headline. When Noto Sans Arabic (162 KB, not preloaded) replaces the fallback at about 3.8 s, it rewraps from two lines to three and the bottom-anchored hero moves up 63 px. This is within the 0.1 "good" limit and depends on the device's own Arabic fallback. Options are an Arabic-only preload (next/font preloads per layout, so English pages would pay 162 KB), `font-display: optional` (a design change on first visit), or reserving three lines. Compare with Speed Insights field data for `/ar` first.

Requester note: the Arabic-first root redirect reads LOC-01's "English is the default" as the fallback. If the default must apply to every root visit regardless of browser language, remove the `accept-language` rule in `next.config.ts`.

## 3 October 2026 — Public search indexing, preview notice removed, one domain (ORG-013)

Google listed msrc2027.com as "No information is available for this page": every deployment sent `robots.txt Disallow: /`, a noindex meta tag and `X-Robots-Tag: noindex`. At the requester's request:

- Production only:
  - `src/app/robots.ts` allows crawling, excludes API, staff and review routes, and links the sitemap.
  - `src/app/sitemap.ts` (new) lists 10 public pages × EN/AR with hreflang.
  - `localizedPageMetadata` sets `index, follow` from `indexable` (`src/lib/metadata.ts`).
  - The noindex header in `next.config.ts` applies to non-production builds only.
- Registration and submissions keep noindex. Unlisted routes inherit the layout's noindex.
- `next.config.ts` 308-redirects three production `.vercel.app` hosts to www, keeping the path and query.
- The "Development preview" banner, its styles and the header's banner offset are removed. The header rests at 1rem (0.75rem on phones) and the hero is a full 100svh. The layout's fallback title is now "MSRC 2027 | Medical Students Research Conference".

Verification:
- ESLint PASS; build PASS; Vitest 892/892, including new `tests/unit/public-indexing.test.ts` for production versus preview robots, sitemap, metadata, headers and redirects.
- Full Chromium run: 312 passed, 4 failed. The failures were `premium-interface` still expecting the banner and a hero height that subtracted it; both fixed. The affected specs then passed 169/169 (17 skipped by design).
- A production-mode build (`VERCEL_ENV=production`) served:
  - `robots.txt` with `Allow` and the sitemap, and a sitemap with EN/AR alternates;
  - `/en` as `index, follow` with no `X-Robots-Tag`, and registration as noindex;
  - `Host: msrc-2027.vercel.app` → 308 to `https://www.msrc2027.com/ar/program?x=1`, while a branch preview host returned 200.
- Requester next step: add www.msrc2027.com to Google Search Console and submit the sitemap.

## 3 October 2026 — Scroll-linked homepage motion and a larger opening headline (ORG-012)

After ORG-011 the requester found that phone titles arrive "immediately" in place, so the intended feel was lost. They asked for smooth transitions and fade-ins on phone and desktop, pointing to faithibiza.com (Lenis/GSAP scrubbed reveals), armor-bd.com (headings that light up word by word) and dibiconference.com (fade-ups). They also asked for a clear, large opening headline.

- `ScrollScenes` (`src/components/scroll-scenes.tsx`) replaces `ChapterTitles`. On each animation frame it writes changed values only:
  - `--scene` / `--scene-eased` on each chapter stage;
  - `--leave` on the hero.
- `src/styles/scroll-scenes.css` replaces `chapter-titles.css` and turns those values into transform and opacity.
- Titles rise into place while their words light up in reading order, scrubbed by scroll, so scrolling up reverses them exactly. They have no pins, holds, timers, replay state or added height.
- `SectionHeading chapter` again renders numbered word spans (`--i`, `--n`) with an `aria-label`. ORG-011's copy, header docking and 2.3–3.1rem phone titles are kept.
- `Reveal`: content still below the screen at hydration waits, then fades up over 1 s with a 90 ms cascade. Its children animate, so the `.reveal` element itself never hides.
- Hero: 700 weight and about 51px on a 390px phone (was 600, 37px), up to 8rem on desktop. Its lines rise out of a fold on load; the hero drifts and fades as the first screen scrolls away, and the film zooms 8%. Skipped in the film view.
- Fixed in testing:
  - Off-screen dimmed titles failed axe contrast, so a title wholly below the screen stays as rendered.
  - Desktop growth widened 791px tablets to 804px, so growth applies from 1100px only and stages clip sideways.
- Tests:
  - `chapter-titles.spec.ts` was rewritten for every chapter in EN/AR on desktop and phone. It checks that a title is lowered and dim on entry, in place and lit at the reading line, and identical on scrolling back. It also checks unchanged page height and width, one-phrase names, direct `#legacy` entry, reduced motion, the hero size and fade, and the content fade-up.
  - `premium-interface` now expects the 1 s fade-up.

Verification:
- ESLint, `next build` and Vitest 888/888 PASS.
- Full Chromium run: 310 passed, 21 skipped, 6 failed. The 6 were axe contrast on dimmed off-screen titles and the tablet overflow; both are fixed above.
- After the fixes, 137/137 passed across `design-system`, `public-shell`, `chapter-titles`, `premium-interface`, `qa-regressions` and `brand-motion` (8 skipped by design).
- WebKit desktop and iPhone: 97 passed, 7 failed. All 7 are known harness limits on this PC: an iPhone full-page screenshot over 32,767px after axe passed, Tab focus, and the synthetic video fixture. The new specs pass.

## 3 October 2026 — Mobile homepage scroll and design refinement (ORG-011)

Requester authorized improvements to Claude's latest mobile design, up/down scrolling
fixes and heading wording. Implementation starts from remote main c10b2c5 in the attached
`mobile-homepage-polish` worktree; the original checkout's local documentation is preserved.

- Reproduced at 390×844, normal motion: scrolling up 72 px left the settled programme
  heading stationary; seven persistent title runways added 1,506 px after copy shortening.
- Headings now enter as a complete centered phrase, with modest bounded scale and no
  sticky hold or extra layout height. Completed/started motion does not replay on reversal,
  resize or preference changes. Fast flicks and fragments arrive in the natural layout.
- Shorter equivalent EN/AR titles; restrained phone header/menu styling, docking hysteresis
  and actual-height menu/anchor clearance. Phone chapter bar remains removed.
- Final Node 24 `pnpm check` PASS: lint/types/build and 888/888 unit tests. Production
  Chromium affected suite: 149 PASS/29 intentional SKIP/1 browser load failure; that
  exact film case passed 3/3 isolated repeats. WebKit desktop/iPhone: 68 PASS/18 SKIP,
  with two test keyboard-policy assumptions corrected; six iPhone navigation cases
  then passed 6/6. All new chapter motion/zoom cases passed in both engines.
- Final focused Chromium mobile rerun under Node 24: 18/18 PASS after the test correction.
- Inspected EN/AR phone/desktop frames and measured ten layouts at 320–1280 px with
  no document overflow. Full failure/rerun evidence is retained in the feature note.
- Scope: public presentation only (DSN-01/02, ACC-01, LOC-01/03, CMS-04). No infrastructure,
  database, media-approval or operational release gate changes. Live publication pending.

Evidence, known limits and rollback: [feature note](features/mobile-homepage-polish.md).
Next: review the finished design on an actual phone, then publish the reviewed change.

## 3 October 2026 — QA pass: landscape phones, favicon, Arabic display numerals

Live sweep of www.msrc2027.com after PR 21: all 24 public pages (EN/AR) return 200 with no broken internal links; axe (WCAG 2.2 AA + best practice) reports no violations at 390 and 1280 px; no console errors, page errors or failed requests in Chromium desktop or WebKit iPhone; EN/AR pages have the same structure; content stays visible without JavaScript; security headers are intact. Fixed:

| Found | Change |
| --- | --- |
| A phone turned sideways is ~340 px tall, and the fixed floating header covered 25–26% of it while reading (12% in portrait) | Below 500 px of height in landscape, the header is slimmer (its bottom edge sits 68 px down instead of 88) and steps aside while scrolling down. It returns on any scroll up, near the top, while the menu is open, and when focus moves into it (`site-header.tsx` `data-tucked`; `public-interface.css`). Portrait phones, tablets and desktop are unchanged; reduced motion drops the slide. Menu links are 48 px there so more fit |
| `/favicon.ico` still returned the 404 page (the 30 September pass added `icon.svg` and `apple-icon` only); browsers, bookmarks and link unfurlers that ask for it got nothing | `src/app/favicon.ico` (16/32/48 px, rendered from `icon.svg`) |
| On Arabic pages the intro art's edition number and the 2026→2027 year art were the only Western digits | `formatIndex(5)` gives «٠٥»; new `formatYear` gives «٢٠٢٦» / «٢٠٢٧». The MSRC 2027 wordmarks stay Latin |
| The intro art's flow lines did not mirror in Arabic, so they ran through the edition number while the atom mark sat alone | `[dir="rtl"] .intro-visual > .flow-lines { transform: scaleX(-1) }`, the same approach as the hero scrim; EN and AR are now exact mirrors at 390 and 1280 px |

Tests (`tests/e2e/qa-regressions.spec.ts`): `/favicon.ico` is served; a short landscape screen tucks and restores the header (scroll up and focus); a portrait phone keeps it in view; the display art uses each language's digits and the Arabic intro lines are mirrored. Against production before this change, the favicon, landscape and digit tests fail and the portrait test passes.

Verification: ESLint (`--max-warnings=0`) and `tsc` PASS; `next build` PASS; Vitest 888/888. Rebased onto `main` with PR 23 (shared `site-header.tsx` scroll handler merged by hand; the landscape rules set `--header-top`, so PR 23's measured menu height stays correct). Full Playwright Chromium run after the rebase: 313 passed, 31 skipped (by design), 1 failed on a Windows `net::ERR_NO_BUFFER_SPACE` page load; that spec then passed 18/18 on its own. WebKit desktop/iPhone for `qa-regressions`, `mobile-navigation` and `chapter-titles`: 54 passed, 16 skipped. The new tests: Chromium desktop/mobile and WebKit desktop/iPhone, 3 repeats each, 48/48. Firefox: NOT TESTED (does not launch on this Windows host).

Not changed (left for the requester):
- `msrc-2027.vercel.app` serves a full copy of production (canonical tags point to www). Redirecting it in Vercel's Domains settings would keep shared links on www.msrc2027.com; it is also the fallback address if the iPhone certificate warning returns.
- On a throttled phone (1.6 Mbps, 4× CPU) LCP is ~3.0 s; the 108 KB mobile poster shares the line with ~175 KB of JS and three Latin font files. A WebP/AVIF poster would help most but is a new derivative of approved media, so it needs media sign-off.
- GitHub: PR 2 (`codex/hosted-supabase-connection`) has no commits that are not on `main`; the repository's website field still points to the vercel.app address; CI runs twice per PR commit (`push` and `pull_request` both fire).

## 3 October 2026 — Chapter titles replace the phone chapter bar (ORG-010)

PR 20 went live and the requester rejected the phone chapter bar. They asked for each section's title to arrive "big and centered", then shrink to its own size and settle back into place, smoothly.

- Below 1100px the chapter bar is gone (`src/styles/chapter-titles.css`; `chapter-bar.css` is deleted). `SectionJourney` keeps only its desktop job: the current chapter and the one-click underline.
- Phones (≤700px, one-column sections): `ChapterTitles` (`src/components/chapter-titles.tsx`) stages each chapter title while it is still below the screen. `SectionHeading chapter` wraps the heading in a stage and renders one span per word.
  - Measuring: the title is laid out large in a hidden copy, centred and rewrapped only within its own line breaks, up to 1.8× and fitting 80% of the screen below the header.
  - Pinning: the heading is `sticky` in its stage. A runway gives the hold room and keeps the section's content clear of the large title. It is 155–438 px per chapter on 375×667, 390×844 and 430×932 phones, EN and AR, which makes the phone page about 1,900–2,200 px longer at 390×844.
- The settle (WAAPI on `translate`/`scale`, 1.2 s) has three beats: shrink while centred, slide across, drop into the lines. Because the large layout keeps each line's words together, no two words cross. Scrolling through the hold can only hurry it: it completes by 85% of the runway.
- Text is never hidden; it is only enlarged. Titles stay as rendered without JavaScript, with reduced motion, from 701px, and for chapters on screen or above at load. Staging waits for `document.fonts.ready`. Only a new width re-stages; the iPhone toolbar changes only the height.
- Fixed during tuning:
  - Words collided mid-flight when the large layout rewrapped freely.
  - The centred eyebrow (a full-width flex row) widened the Arabic page, so the phone layout viewport grew to 895px and every later chapter was measured off-screen. Stages now clip horizontal overflow and the eyebrow fits its content.
  - A reveal animation could move a heading onto its pin after scrolling stopped; a 250 ms re-check runs while a staged title is on screen.
- Static layout is unchanged. With reduced motion, every heading's box, text width and section height matches production on a 390 px phone and at 1280 px, EN and AR. On phones the page is 96 px shorter, without the bar.
- Tests:
  - `tests/e2e/chapter-titles.spec.ts` (new) checks each of the seven chapters, EN/AR. Rising: large, centred, inside its stage, page not widened. Pinned: it settles to its own size, at the start edge, with its own line breaks. It also covers the hurry, staging only below the screen, the reduced-motion/wide-screen fallback, one-phrase accessible names and axe.
  - `chapter-bar.spec.ts` is now desktop-only and checks that tablets show no bar.
  - The four `brand-motion` and one `cinematic-film` cases that click the bar skip on phones.

Verification:
- ESLint (repo) and `tsc` PASS; `next build` PASS; Vitest 888/888.
- Full Playwright Chromium run: 295 passed, 21 skipped, and 1 failure. The failure was a load flake: hydration took over 5 s in `qa-regressions` "Step inside" (mobile). It passed 16/16 on its own, and the hydration waits in my specs now allow 15 s.
- After the last tweaks, a rebuild ran the affected specs (`chapter-titles`, `chapter-bar`, `qa-regressions`, `brand-motion`, `premium-interface`, `cinematic-film`): Chromium 107 passed, 19 skipped (by design). WebKit desktop and iPhone ran `chapter-titles`, `chapter-bar`, `qa-regressions` and `premium-interface`: 60 passed, 8 skipped (by design). All eight chapter-title cases ran on the iPhone profile.

## 2 October 2026 — Phone chapter bar redesigned after requester review (ORG-009, PR 20)

The requester tried PR 18's floating pill and side panel on an iPhone and rejected it. Reaching a chapter took two taps (open, then choose), the in-page 2×3 index still looked out of place, and the bar's appearance and chapter changes needed to be smooth. Desktop is fine as it is.

- Below 1100px the index is now one swipeable row of chapter chips. It sticks 8–9 px under the floating header (`5.6rem` on phones, `6rem` on tablets), styled as a second deck of the header card (`src/styles/chapter-bar.css`). The pill, panel, their styles and their spec are removed.
- A purple highlight sits behind the current chapter and glides between chips (transform/width transitions). The row slides the current chip into the middle; in RTL one formula works because `offsetLeft` and `scrollLeft` both run negative past the start edge.
- One tap jumps to a chapter through the existing `Link`/`activateNavigation` path. The tapped chapter takes the highlight at once and keeps it for up to 1.5 s, so it never steps through the chapters in between.
- The first time the bar scrolls into view, its chips glide in with a 45 ms stagger. They are hidden only when the bar was below the fold at hydration, so server HTML and an on-screen bar never blank. Docking adds the header's shadow and a short settling motion. Reduced motion removes all of it.
- On touch, the tapped chip keeps `:hover`, so the current chip pins its colours.
- Probes on iPhone, Android and iPad Mini profiles, EN/AR: one row; docked under the header; the highlight aligned with the current chip, which stays in view for all six chapters in both engines; and a tap trail of `#participate → #legacy` with nothing between. The chapter eyebrow lands 39 px below the bar on phones and 107–123 px on tablets.
- Numbering: the bar called "Plan your visit" 06, while its section eyebrow reads "07 / Plan your visit", because section 06 ("Shared purpose", partners) had no chip. At the requester's choice (3 October) the bar gains 06 Partners / «الشركاء», so every chip matches its eyebrow, now asserted for EN and AR. The desktop grid takes seven columns and stays one row at 1100, 1280 and 1440 px. `#partners` gains `tabIndex={-1}` like the other chapter sections.

Verification: ESLint and `tsc` PASS. `tests/e2e/chapter-bar.spec.ts` (new) passed with `brand-motion` and `cinematic-film`, which click the index right after load: Chromium 61 passed, 1 skipped; the new spec in WebKit desktop and iPhone passed 4/4. Full run: Vitest 888/888, Playwright Chromium 294 passed, 3 skipped (duplicate tablet cases), WebKit `qa-regressions` + `chapter-bar` 30/30.

## 2 October 2026 — Bounded BL-AUTH-05/06 closed staff security foundations

Requirements: AUTH-04/05, ROL-12, SEC-01/02/06, LOC-01, ACC-01, ERR-01.
New isolated managed worktree `staff-mfa-sessions` on `codex/staff-mfa-sessions`
starts at remote main `eb4c5a005e84a5626e0d6e5bbf01115087810aaf`. Original main
checkout's uncommitted docs/reviews and previous authorization worktree are preserved.
Fresh main [CI 37053006357](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37053006357)
reports success; GitHub Vercel status reports successful deployment. These receipts
supersede the supplied main 14a58fb handoff for the starting Git state. Remote main
was rechecked at finish and remains eb4c5a0; this branch is not merged.

ORG-010 designates `ecemjggwlzqpjcwmchrl` Production; ORG-011 records first intended
Super Admin and two TBD, withholding login addresses; ORG-012 replaces participant
24h with confirmed 72h absolute maximum while preserving the original v0.5 snapshot.
Privileged 30min idle/8h absolute, recent-auth age/warning null and recovery/privacy/
security-email gates are recorded in current requirements and typed configuration.
Fresh read-only hosted history still has only 20261002173712; aggregate accounts,
editions, access accounts, grants and grant audit rows are all 0. No hosted mutation.

Implemented local-only bilingual/RTL synthetic TOTP QR/manual enrollment/challenge,
failure/retry, assurance and session revocation scenarios. Server-generated keys and
opaque HttpOnly synthetic cookie, strict Origin/512-byte exact JSON actions, no-store,
deployment 404 and disabled managed MFA contract. Approved session policy/evaluator and
review-only migration 20261002193800 add private session evidence, immutable origin,
revocation cutoffs and safe append-only audit. Public heartbeat does not touch idle;
private activity awaits successful authorized domain transactions. Consequential
maintenance/reset stays closed with unresolved recent-auth/recovery and false readiness.
No staff account/grant/real factor/email or operational module is activated.

Dependencies added and pinned: qrcode 1.5.4 and @types/qrcode 1.5.6; lockfile committed.
Node 24.21.0/pnpm 11.19.0 verified. `pnpm install --frozen-lockfile` PASS. Initial
typecheck/build exposed test-helper/RPC typing errors, corrected. `pnpm check` PASS:
lint, types, 1049 unit cases and 42-page production build. Initial browser execution
was BLOCKED by missing pinned Chromium v1243; `pnpm exec playwright install chromium`
PASS. Dedicated auth browser suite: 27/27 PASS across desktop/tablet/mobile, both
languages, real generated TOTP, retry, keyboard and axe. Six masked visual captures
were inspected. Full local public suite: 294 PASS, 3 explicit skips, 2 failures in
existing film/countdown timing checks; `playwright test --last-failed` rerun: 2/2 PASS.
Complete implementation-source [PR CI 37058469415](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37058469415)
and [push CI 37058461928](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37058461928)
at ff9d1d981f7d995f9b6f7a7c304a88796fed8963 both PASS. Actual application/database logs
inspected: lint, typecheck, 1049 unit cases, 42-page build, 296 public browser PASS /
3 explicit skips, 27 auth browser PASS, four pgTAP files / 245 assertions, three Data API
integration files / 16 PASS. Two integrations execute simultaneous expiry and locked
suspension attempts using actual parallel database connections; neither restores activity
or duplicates revocation evidence. Staff policy cannot downgrade across configured editions;
factor deletion/stale assurance, unauthorized reset and malformed subject fail closed.
`pnpm db:lint`, local security advisors (No issues found), generated types/strict compile
and stack stop PASS. Earlier CI exposed a test-fixture guard incorrectly requiring an
explicit local target; it stopped before writes. Corrected to accept the validated local
default while preserving GitHub Actions, loopback, exact project/container restrictions.
Its two concurrency cases then executed and passed. Fixtures survive only in the disposable
CI runner's Docker volume until runner teardown. Final documentation-only commit receives
its own automatic CI/Preview checks; see PR 19 for the latest exact-head receipts.
Local Docker/SQL is intentionally NOT TESTED; synthetic SQL runs only in GitHub CI.
Vercel Preview deployment 6817194861 at ff9d1d9 reports success:
https://msrc-2027-3thiijfj4-msrc2027.vercel.app. Runtime inspection is
BLOCKED by Vercel login protection and connector authorization (403); no bypass opened.
Local EN/AR preview on 127.0.0.1:3220 returned 200. Existing production lab page/API
returned 404; `/api/health` returned 200/static-foundation/workflows closed.
Production was not redeployed by this task.

Scoped draft [PR 19](https://github.com/xpexellent-dotcom/msrc-2027/pull/19) is attached
for review. The linked checklist has confirmed organizer decisions updated; feature
completion remains partial. [Feature note](features/staff-security-foundations.md)
records files/migration, local run instructions, UAT/configuration and rollback.
All 15 workflow flags and operational/privileged readiness remain false. Human real-app
MFA, screen-reader/device review, live provider exchange, saved-draft recovery and
production data/region/recovery approvals remain open. Next smallest task is approval
of recovery/recent-auth settings and isolated managed Auth UAT, before domain/CMS access.

## 2 October 2026 — Chapter navigation follows the reader on phones (ORG-009)

The requester sent an iPhone screenshot: below 1100px the homepage chapter index (a 2×3 grid on phones) sits in the page and scrolls away, so it was out of reach while reading; desktop keeps it sticky. A floating pill now appears once the index has left the screen. It shows the current chapter and opens the six chapters in a side panel, a modal `<dialog>` from the inline end, mirrored in Arabic. `SectionJourney` owns both, reusing its current-chapter tracking and the `Link`/`activateNavigation` path. The new styles live in `src/styles/chapter-dock.css`.

- The pill is hidden at the top, inside the index, at the footer, during the film view and the main menu, and in print. At 1100px and above it never renders.
- The panel opens focused on its title, so it is announced by name with no ring on the close button. Tab reaches the close button and the links.
- Choosing a chapter closes the panel, updates the URL, glides there (jumps with reduced motion) and focuses the section; the heading lands 138–140 px clear of the floating header on a phone.
- Esc, the close button or the backdrop returns focus to the pill. Safari does not focus buttons on tap, so this is done explicitly.
- WebKit truncated the pill label under an ellipsis rule; the labels are short, so it was dropped.

Verification: `tests/e2e/chapter-dock.spec.ts` passes in Chromium desktop and mobile and in WebKit desktop and iPhone, EN/AR (8/8). It covers the pill state, panel side and focus, axe on the open panel, Esc focus return, chapter arrival and header clearance, and leaving at the footer.

## 2 October 2026 — PRs 13/14 verified live; permission checks fail closed; paragraph wrapping

PR 14 (carrying PR 13) was merged by the requester at 17:29 UTC as `2ae066f`; the production deployment completed at 17:30 UTC. Live checks against www.msrc2027.com:

- Uncached routes (`/en/media`, `/ar/program`, `/api/health`) answer via `bom1::bom1`; before the release they crossed to `bom1::iad1`.
- Hero film and posters carry `max-age=2592000, stale-while-revalidate=86400` (was `max-age=0, must-revalidate`).
- Analytics and Speed Insights scripts load on production. An automated browser sent no beacon and no write request. A signed-in desktop Chrome visit to `/ar` sent the pageview (200), and the Vercel dashboard (Production) then showed 1 visitor, Saudi Arabia, desktop, on `/ar`.
- `/ar/media`: 1ch measures 0.556em (0.5em before), and first-load desktop CLS is 0.018 (0.206 on production before the release).

Permission evaluator (BL-SEC-01, ENG-009): `switch (rule.check)` had no `default`, so a check kind added to the contract without a matching case would have fallen through to "allowed". A `default` branch now fails type-checking (`never`) and denies at runtime. To confirm, a temporary extra check kind in `contract.ts` made `tsc` fail with TS2322 at the new branch; it was then reverted. The 440 contract unit cases pass unchanged; the eight existing kinds behave as before.

Paragraph wrapping: on the live site 41 of 490 multi-word paragraphs and list items (desktop and phone, EN/AR, 12 pages each) ended with one word alone on the last line, among them «بحثية.» in a Submissions paragraph on phones. `p, li { text-wrap: pretty; }` beside the existing heading `balance` rule leaves 4, all English. Browsers without support keep greedy wrapping. An e2e check confirms the computed style where supported.

Flaky test: CI for this PR failed once in `cinematic-film.spec.ts` ("ar browser Forward reopens the film…"): expected scroll 4155, received 4102; the twin run passed. The test captured its origin before clicking, while the `#legacy` scroll can still glide with motion allowed and actionability can scroll before the click. Replaying it with 6× CPU throttling, the page moved 88–141 px between that capture and the real click, and the app restored exactly the click-time position in 12 of 12 runs. The test now captures the activation position as its participation-chapter twin does. The Forward tests passed 60/60 with 10 workers, and the whole film spec passed (27, 1 skipped).

## 2 October 2026 — Closed persisted authorization and reviewed deployment

Scope: requester authorizes checklist review, the next recommended engineering actions
and deployment of reviewed application schema/permissions. Read current source/backlog,
reviewed BL-SEC-01 PR15 at exact head `e297c86`, and merged it as `7ce3112` after the
final-head application/database CI had passed. The connector could read PR15 but its
ready-transition lacked integration permission; the already authorized Git Credential
Manager credential completed the transition and guarded merge. No credential was printed.

Implementing the smallest BL-AUTH-01 slice: private edition/account-access/scoped-grant/
audit metadata, a self-only current managed-session/TOTP RPC and a server-only bearer
identity/context adapter. No initial edition, account, grant or audit row; no participant
profile, domain schema, Storage bucket, invitation, email, staff UI, CMS or workflow opening.
The returned context has `session.active:false`, `operationalAccessReady:false` and
`privilegedAccessReady:false`; it cannot activate the earlier authorization evaluator.
Full domain AuthorityReader integration and AUTH-04/05 lifecycle enforcement remain later.

Fresh hosted preflight: selected project `msrc / ecemjggwlzqpjcwmchrl` has zero Auth users,
application tables/private authorization schemas and migration history. Asked whether this
project is development/staging or reserved for production, and for the three named Super
Admins. No answer is inferred; live data/staff activation stays closed under CFG-09/10/11.
Reviewed empty additive schema work creates no operational authority or participant data.

Initial checks: `pnpm typecheck` first found a nested parser narrowing error, corrected;
rerun PASS. `pnpm lint`, existing 739 unit tests and `pnpm build` (40 pages) PASS before
the new identity tests were added. Actual-schema SQL and final complete checks are pending;
hosted migration NOT YET APPLIED at this point. ENG-010 and the
[feature note](features/persisted-authorization.md) define acceptance and rollback.

The checklist was updated/read back at sequence14: PR15 reviewed/merged and BL-AUTH-01
in progress; no deployed schema or staff activation is claimed. Original checkout's
uncommitted documentation remains untouched; implementation uses the attached managed
authorization worktree on `codex/persisted-authorization`.

Next: run final application/actual-schema CI, adversarially review the migration, deploy
only the approved empty application migration, verify hosted ACL/RLS/anonymous denial
and record receipts. Do not upload the earlier synthetic foundation migration/seed.

Final local application verification: `pnpm check` PASS (lint, types,859 unit tests,
40-page production build). New coverage:103 identity/context cases and17 hosted-probe
cases. `pnpm test:e2e tests/e2e/closed-workflows.spec.ts tests/e2e/public-shell.spec.ts`
PASS:43 Chromium desktop/tablet/mobile cases including EN/AR/keyboard/axe/reduced motion.
Added66 actual-migration pgTAP assertions, including independent ACL/RLS, own-context,
current managed user/session/TOTP, grants/scopes/history and transactional audit failure.
`pnpm exec supabase test db supabase/tests/database/persisted_authorization.test.sql`
was attempted and BLOCKED by ECONNREFUSED at127.0.0.1:54322 (no local engine).
No hosted fixture was used. Database lint now includes public and private schema functions;
CLI help confirmed the comma-separated `--schema` argument. CI runtime result pending.

Read-only hosted role preflight confirmed `current_user` and `session_user` both postgres,
and zero managed accounts/public application tables. Independent security review found no
blocking issue in the closed migration/app boundary; real staff activation, named-human
maintenance attribution, account-status audits, full AUTH-05 lifecycle and actual MFA UAT
remain explicit follow-ups. TOTP factor name/status maintenance updates `updated_at`; the
current timestamp check conservatively requires fresh challenge evidence after those
changes. It does not replace future audited reset/recovery and session revocation.

Checklist factual refresh at sequence15: PR13 is still open/conflicted at632ed46, but its
latest CI37037534134/37037529901 and Preview6813734225 passed. Its Mumbai code and stale
Dubai wording/privacy review remain a separate PR13 follow-up. Fresh main7ce3112 CI
37038741543 passed and Production6813936431 succeeded. Live health returns200/no-store/
closed; full Vercel settings/complete live UAT are not claimed. No PR13 changes here.

Deployment receipt: [PR16](https://github.com/xpexellent-dotcom/msrc-2027/pull/16)
at `9ce0ef1` passed the full [workflow37041065012](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37041065012):
lint/types,859 units,40-page build,284 browser cases PASS/3 explicit skips,
176 pgTAP assertions (66 actual-schema +90 prior contract +20 foundation),10 client
integration tests, public/private schema lint, local security advisors, generated strict
types and stack shutdown. [Database job110951022267](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37041065012/job/110951022267)
actual logs show the new migrated-schema suite passed; no local PC Docker is needed.
The synthetic SQL suite was executed only in isolated GitHub CI and rolled back.

After independent review and the successful exact-source CI, the authorized Supabase
connector applied ONLY `persisted_authorization` to `msrc / ecemjggwlzqpjcwmchrl`.
Hosted history records version `20261002173712`; the committed migration filename was
aligned to that observed version without changing SQL. Original CLI-generated filename
was `20261002165850_persisted_authorization.sql`; SHA256 remains
`F1569BD4A58F17488094092D02BD78ABCF03BF0B500576B84D5B84E0A9EB39D5`.
No historical foundation fixture/seed, account, edition, grant or bucket was deployed.

Hosted verification executed the four read-only statements in
`supabase/verification/persisted_authorization.sql`: all4 private tables have enabled+
forced RLS; anon/authenticated/service_role schema/table/internal-function access is false;
only authenticated can execute the fixed-search-path own-context RPC. Aggregate counts
are all0: managed accounts, editions, account access, grants, grant audit and public tables.
Hosted history is1 migration. The real anonymous API probe returned HTTP401 with42501:
`node --env-file=<original checkout>/.env.local scripts/verify-hosted-authorization.mjs`
PASS. The original ignored environment was read without copying/printing its key.
`pnpm db:verify-authorization-hosted` is the reproducible normal-checkout command.

Hosted advisor results are NOT clean: security has1 WARN for the intentional authenticated
self-only SECURITY DEFINER RPC and4 INFO for private RLS/no policy; performance has3 INFO
for unused indexes on the empty schema. See the reviewed rationale and
[remediation reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
in the [feature note](features/persisted-authorization.md). Local CLI advisors reported
no findings, but do not supersede the hosted provider's newer advisor. No grants were
widened or indexes removed to silence findings. Before activation, review the narrow
exception again alongside actual staff/session/domain policies.

Production staff/participant workflow access remains closed. Named-human MFA/session/
recovery UAT, full AUTH-05 enforcement, authoritative domain resource readers, Storage
and retained-data/production approvals remain NOT TESTED/OPEN. Environment classification
and the three named Super Admins remain unanswered; no value was assumed. Next smallest
slice: BL-AUTH-05 controlled staff TOTP enrollment/recovery and session lifecycle, including
named performer/account-status audits, before BL-CMS-01 draft editing.

Final filename-alignment CI37042359894 at75795fac passed application and database jobs.
Before PR16 could merge, PR14 changed main to2ae066f. Merge preserves its Arabic font/
layout-shift fix, observability/cache/region changes and complete decision/progress records.
The authorization SQL remains unchanged. Combined-tree `pnpm install --frozen-lockfile`
and `pnpm check` PASS: lint/types,888 units and40-page production build.
`pnpm test:e2e tests/e2e/closed-workflows.spec.ts tests/e2e/public-shell.spec.ts tests/e2e/qa-regressions.spec.ts`
PASS:67 desktop/tablet/mobile EN/AR/keyboard/axe/reduced-motion/font/media cases.
Independent combined-tree authorization review found no blocking regression; git diff
check PASS. Final combined-source CI/Preview must pass before the guarded PR16 merge.

## 2 October 2026 — Arabic webfont: a steady `ch`, no layout jump

First visits to Arabic pages jumped when Noto Sans Arabic arrived: desktop CLS 0.208 on `/ar/media`, 0.065 on `/ar/dates-venue` and 0.011 on `/ar`, against 0.002 on English pages. The cause was the `ch` unit, not the letter shapes. The Arabic subset has no "0" glyph, so once it loaded as the first available font, browsers measured 1ch as 0.5em instead of the fallback's 0.556em (Arial's zero). Every `ch`-based measure (37 `max-inline-size`/`max-width` rules) narrowed by a tenth after first paint. Headings authored as two lines with `\n` («ملتقى / العقول الفضولية.», «كن جزءًا / من الفصل القادم.», «لحظات نعود إليها. / وأفكار تبقى معنا.») then broke again into three or four lines.

Change: one `declarations` entry gives the `next/font` Arabic face fontsource's Arabic-subset `unicode-range`, which leaves out the space. The fallback face then stays the first available font and 1ch never changes. The file draws no Latin character except the space, so Arabic spaces become 0.278em instead of 0.26em. A unit test fails if the range covers the space, a Latin digit or a letter. An e2e test checks that 1ch stays above 0.52em after the font loads, and that the three headings keep their authored two lines on desktop.

Layout shift on first load (local production build, median of 5): unthrottled desktop `/ar/media` 0.208 → 0.002, `/ar/dates-venue` 0.065 → 0.002, `/ar` 0.011 → 0.002. Slow 4G (1.6 Mbps, 150 ms) with 4× CPU: desktop `/ar/media` 0.199 → 0.018, `/ar/dates-venue` 0.068 → 0.006, phone `/ar` 0.020 → 0.003. English unchanged.

Not adopted: preloading the Arabic font on Arabic pages only (served from `public/`, since `next/font` exposes no URL). With the range fix in place it gave no CLS benefit under throttling and delayed LCP by 160–300 ms, because the 166 KB font competed with the hero poster.

Visible effect: Arabic measures now always use the width visitors saw before the font loaded. On desktop, 8 of 12 Arabic pages re-wrap, mostly to fewer lines; the three headings above show their authored two lines, as in English. On phones, 2 of 12 change: the home lead fits one line, and one Submissions paragraph wraps to three lines because of the wider spaces. No clipped text at 320 px or 1280 px, and no horizontal scroll at 320 or 375 px on any Arabic page.

Verification: ESLint and `tsc` PASS; Vitest 308/308; build PASS (the generated face carries the range); Playwright Chromium desktop/tablet/mobile 288 passed, 3 skipped; WebKit desktop and iPhone `qa-regressions` 24/24. Against production the new e2e test fails as expected: 1ch measures exactly 0.5em.

Also checked live after PR 12: 24 pages crawled with no broken link or anchor; axe finds no violations on `/en`, `/ar`, `/en/dates-venue` and `/ar/media` at 390 and 1280 px; the centred Step inside cue keeps at least 14.3:1 over every sampled film frame (4.5:1 needed).

Live LCP on a throttled phone (Slow 4G, 4× CPU) for reference: `/en` 2.6 s and `/ar` 3.0 s (the hero poster, already `fetchpriority=high`), About and Media about 1.9 s (the heading). NFR-02 asks for 2.5 s at p75 on agreed hardware and network; Speed Insights (ORG-008) will report the field values.

## 2 October 2026 — BL-SEC-01 authorization contract

- Requester authorized the next bounded engineering PR: 13-role/scope/current-authority
  contract, synthetic permission fixtures, failure/language/audit requirements and tests.
  Source IDs ROL-01–12, SEC-01/02/06, AT-02; ENG-009 and the
  [feature note](features/authorization-contract.md) record scope and integration gates.
- Implemented frozen purpose rules, server-only fresh-reader checks, generic bilingual
  errors, ownership/edition/track/function/assignment enforcement, current revocation,
  TOTP assurance, self/co-author/conflict denial, original-evidence restrictions and
  locked/unpublished/unavailable controls. No domain payload is returned.
- Added independently expected role/action unit matrix (440 targeted cases PASS) and
  rollback-contained SQL RLS/grants/view/function/private-metadata fixture. Existing CI
  automatically discovers both. Type-check initially found a union callback narrowing
  error; fixed and rerun PASS. Final review also separated review/event assignments and
  assignment-bound grant stages; 29 regression cases passed. Full local checks passed;
  SQL verification and full browser checks passed in isolated CI.
- No production identity/reader/grant system, migration, actual Storage/file link or audit
  writer implemented; all 15 operational workflows stay hard closed. Human/domain-owner,
  real identity/MFA/session and per-feature RLS/Storage UAT remain later release work.
- Worktree based on remote main `017220e` preserves the original checkout's uncommitted docs.
  No production service, DNS, secret, email, workflow opening or public-interface change.

Verification (Node 24.21.0/pnpm 11.19.0): locked install PASS; `pnpm check` PASS
(lint, types, 739 unit tests including 440 new cases, production build with 40 pages).
`pnpm test:e2e tests/e2e/closed-workflows.spec.ts tests/e2e/public-shell.spec.ts` PASS:
43 desktop/mobile Chromium tests, including EN/AR keyboard, axe and reduced motion.
`pnpm db:test` BLOCKED: connection refused at 127.0.0.1:54322; no running Docker
engine/WSL. Initial offline install missed an uncached font tarball; normal locked install
passed. [Draft PR15](https://github.com/xpexellent-dotcom/msrc-2027/pull/15) at code commit
`39877f2` has [database CI job110917372506](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030963194/job/110917372506)
PASS: actual logs show 110 pgTAP assertions (90 authorization +20 foundation), 10 Data API
integration tests, reset/lint/security advisors/generated strict types and stack shutdown.
Only the existing foundation migration was applied. [Vercel Preview](https://msrc-2027-czvn6thf8-msrc2027.vercel.app)
deployment 6812599008 reports success; no Production deployment or new UI. Fixtures do not
establish live grants. [PR workflow37030963194](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030963194)
and [push workflow37030920867](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37030920867)
both PASS at code commit `39877f2`. Application logs confirm lint/types, 739 unit tests,
40-page production build and 284 browser tests PASS /3 explicitly skipped.

CI commands actually executed: `pnpm install --frozen-lockfile`, `pnpm lint`,
`pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm exec playwright install --with-deps chromium`,
`pnpm test:e2e`; loopback Docker network creation, `pnpm db:start`, `pnpm db:reset`,
`pnpm db:lint`, `pnpm db:test`, `pnpm exec supabase db advisors --local --type security --level warn --fail-on error`,
`pnpm db:types` plus standalone strict `tsc`, `pnpm db:env`, `pnpm db:integration`,
`pnpm db:stop`. Security advisors returned no issues on the standing foundation schema
after fixture rollback; the advisor pass does not inspect the removed test schema or
validate hosted policies/actual Storage. `git diff --check` PASS.

The later documentation-only receipt commit does not change the tested code. No new
dependencies, migration, environment values or hosted configuration; no manual hosted setup.
Human/domain-owner and actual session/MFA/storage UAT NOT TESTED. Original user work preserved.

The feature checklist was updated and read back at sequence11: PR15 remains draft/partial
for live authorization; the synthetic contract and database results are linked, with M4
identity, persisted grants, TOTP, per-feature RLS and actual Storage access still pending.

Next smallest PR: BL-AUTH-01 current persisted grant/identity integration, followed by
BL-AUTH-05 privileged TOTP enrollment/recovery before CMS/staff activation. M3 legal/brand
content and affected-phone Safari diagnosis remain independent follow-ups.

## 2 October 2026 — Visitor analytics, Speed Insights and hosting efficiency (ORG-008)

PR 12 (the 1 October QA pass and ORG-007) was merged by the requester at 14:11 UTC as `017220e`. Live check: the hero caption is gone in both locales; the Step inside cue is 0 px off centre on desktop and phone; with motion allowed it glides (scroll samples 0→103→641→815→880→900 px) and focuses the dates band, with reduced motion it jumps; on phones the band stops 72 px below the top, clear of the header.

| Change | Why | Evidence |
|---|---|---|
| Vercel Web Analytics and Speed Insights, on the production deployment only | Requested; both were already enabled in the dashboard and waiting for the packages | A `VERCEL=1` build injects `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` once per page, reports route patterns (`/[locale]/media`) and registers the `beforeSend` hooks before any event. A normal build contains neither, so CI and local runs make no `/_vercel` requests |
| Addresses sent without query string or fragment; only public information pages counted; automated browsers send nothing | PRV-03; tests against deployments must not count as visits or make write requests | Six unit cases. With `navigator.webdriver` the probe recorded no non-GET request |
| Functions in `bom1` (Mumbai) instead of `iad1` (Washington, D.C.) | Requests from Saudi Arabia enter at the Mumbai edge; uncached pages then crossed to `iad1` and took 0.42–0.48 s to first byte versus about 0.21 s for cached pages | Live before: `/en/media`, `/ar/media`, `/en/program`, `/api/health` answered via `bom1::iad1`. `dxb1` (Dubai) is listed in the dashboard, but the first preview with it failed: "Invalid region" |
| Film and posters cached by browsers for 30 days | They were served `max-age=0, must-revalidate`, so every visit revalidated 2.8 MB before the hero could play | An e2e test checks all four files; pages keep their own caching |

Verification (Node 24.21.0): ESLint zero-warning, `next typegen` and `tsc` PASS; Vitest 305/305; `next build` PASS with and without `VERCEL=1` (40 pages, the same static and dynamic routes); Playwright Chromium desktop/tablet/mobile 286 passed, 3 skipped (duplicate tablet cases).

On the PR 13 preview, in a signed-in desktop Chrome: both scripts load with 200 from project-specific same-origin paths (Vercel sets them; `/_vercel/*` is only the fallback), and the pageview beacon returns 200. A client navigation to `/ar/program?day=2&email=…#session` sent the address `/ar/program`, without query, fragment or email. `/ar/media`, `/en/program` and `/api/health` answered via `bom1::bom1`, and `/media/` files carry the 30-day header. Afterwards, following ChatGPT's analytics review, collection was limited to the production deployment and to public information pages (`countedSections`); previews no longer load the scripts, so this preview evidence predates that change.

Vercel settings reviewed in the dashboard and left as they were: Fluid compute on; Node.js 24.x (matches `engines`); Prioritize Production Builds on; Vercel Authentication protects previews; source maps protected; Web Analytics and Speed Insights enabled; firewall bot protection off and AI crawlers allowed (a challenge would also stop link previews and automated QA). The Hobby plan allows one function region.

Worth considering with the requester (not changed):
- **Deployment Checks:** hold each production deployment until GitHub's "Foundation checks" pass, so a broken merge never reaches the public site. Production then updates about 8 minutes after a merge.
- **At the Pro upgrade:** Skew Protection (visitors with an open tab keep working across deploys), concurrent builds (two agents push branches), Spend Management alerts, longer log and analytics retention, custom analytics events (for example film plays), password-protected previews if outside reviewers need access.
- **Uptime alerts (INF-08):** an external monitor on `/api/health` with email alerts to named owners, such as Checkly from the Vercel Marketplace. This needs the organizers' own account.
- **Launch-time firewall:** consider Bot Protection in log mode first, and decide whether AI crawlers may read the public site.
- **Hobby allowances:** usage for 2 September–2 October was 1.02 GB fast data transfer, 20K CDN requests, 1.7K function invocations and 2 h 8 min build CPU, far inside the plan. Analytics and Speed Insights events count against monthly allowances too; check the Usage page as registration and the event approach.

Known issue measured in this pass: on a first visit, the Arabic webfont (166 KB, `preload: false`) swapped in after first paint and re-wrapped Arabic headings (desktop CLS 0.21 on `/ar/media`). Fixed in the section above.

## 1 October 2026 — QA pass: Arabic typography and wording, counted numbers, a test race

Live QA of www.msrc2027.com, before and after PR 11, and of `main` at `e70bf38`. Covered EN/AR on Chromium and WebKit (Safari and every iOS browser). Scope: CSS for a few hero labels, two display helpers, Arabic copy and tests. No date, clock rule, workflow, media, route or navigation change.

| Finding | Change |
|---|---|
| WebKit pulls letter-spaced Arabic apart. On phones the hero kicker «المؤتمر الخامس لأبحاث طلاب الطب» (0.09em, `!important`), the hero caption and the film provenance «نسخة ٢٠٢٦» (0.06–0.1em) showed broken joins on iPhones, at 10.1–10.6 px | `[lang="ar"]` overrides remove the tracking. Phone sizes rise to 0.75rem in Arabic only. A regression test fails if any Arabic word on six Arabic pages has non-zero letter-spacing; it failed on production before the fix |
| The nine new pages titled tabs and link cards with a bare label ("Programme", «البرنامج») | `siteTitle()` gives "Programme \| MSRC 2027", as on About and Dates & venue. Session and speaker detail pages use it too; they are NOT TESTED in a browser because no records are published yet (types and build only) |
| Film view: the title «فيلم مقدمة مؤتمر ٢٠٢٦» ("film of the introduction of conference 2026") differed from the media page's «الفيلم الافتتاحي», and the instructions said «اضغط Escape» and «بالمسافة أو الإدخال» | «الفيلم الافتتاحي لمؤتمر ٢٠٢٦». The instructions now use «مفتاح Esc» and «مفتاح المسافة أو الإدخال», as the hero video's do |
| English spelling: the site follows Oxford spelling ("Programme", "catalogue", "organizer", "finalized"), but the Dates & venue button read "Explore the program overview" and the homepage "Organised by …" | "programme overview", "Organized by …" |
| Homepage venue label «مكان انعقاد المؤتمر» versus «مقر المؤتمر» on Dates & venue and «المواعيد والمقر» in navigation | «مقر المؤتمر» |
| Six of the fifteen footer entries (Teams, Sponsors, Announcements, Contact, Privacy, Terms) are unpublished non-links. They differed from real links only by ivory versus pale lilac, so phone users tapped them to no effect. DECISIONS asks for "labelled non-links" | A visible "Soon" / «قريبًا» pill, which also joins the accessible name ("Contact Soon"). Arabic size 0.7rem, no tracking |
| Printing: browsers drop background colours, so light text on the dark sections and footer printed near-invisible. The fixed floating header repeats over every printed page in Chromium, and the hero filled the first page | `src/styles/print.css`: content in black on white, without the header, banner, chapter bar, footer, film and header clearance. A regression test checks four pages in print media and fails on production |
| A structural EN/AR parity check of all twelve public pages found matching headings, links, sections and controls. The only English-only text on an Arabic page was the speakers artwork label "MSRC / PERSPECTIVES"; the matching legacy artwork already uses «الفصل القادم» | «MSRC / وجهات نظر», untracked at 0.75rem in Arabic |
| ORG-007 (requested 2 October with an annotated screenshot): centre "Step inside", make it a scroll option with a smooth animation, and remove MSRC2026 | One centred cue with a gold segment looping down its line. A click glides to the dates band below the hero (`#essentials`), focusing it; reduced motion shows a static line and jumps. The hero caption is gone, while the film view and previous-edition section keep the MSRC 2026 identification. On phones the band stops below the floating header. Eight regression cases (EN/AR, both motion settings, desktop and mobile) |
| On phones the hero date/city line wrapped and left its "·" dangling at the end of the first line (EN/AR) | The two items stack under 700 px without the separator |
| The hero lead left a one-word last line («جديدة.», "discoveries.") | `text-wrap: pretty`. Chromium and WebKit now break at the sentence: «طلاب طب. أفكار نتشاركها. / واكتشافات جديدة.» and "Medical students. Shared ideas. / New discoveries." Browsers without support keep today's wrapping |
| Session and recording durations printed a fixed «دقيقة» after any number, so a 3MT talk would read «٣ دقيقة» | `formatMinutes()` uses CLDR counted forms in Arabic («دقيقة», «دقيقتان», «٣ دقائق», «٤٥ دقيقة»). English stays "45 min" |
| Programme and media result counts (live region) were built as number plus a fixed «نتائج» or "results", giving «١ نتائج», «٢ نتائج», «١١ نتائج» and "1 results" once records are published | `formatResultCount()` picks the CLDR category: «نتيجة واحدة», «نتيجتان», «٣ نتائج», «١١ نتيجة», «١٠٠ نتيجة», and "1 result" / "2 results". Twelve unit cases cover every Arabic category |
| The countdown's Arabic day unit used plural categories only, so the final day would read «٠ يومًا» and 100–102 days (from 17 October) «١٠٠ يومًا» | `countdownDayUnit()` takes the counted noun from CLDR unit parts: ٠ يوم, يومان, ٣ أيام, ١١ يومًا, ١٠٠ يوم |
| Countdown labels «اليوم الأول اليوم»; the timer's name read the ISO string `2027-01-27` digit by digit | «اليوم هو اليوم الأول/الثاني للمؤتمر»; «… حتى بداية يوم ٢٧ يناير ٢٠٢٧ …» and "Time until 27 January 2027 begins …" |
| Hackathon: «النموذج الأولي مشجّع» says the prototype is *encouraging* | «يُستحسن تقديم نموذج أولي، وهو اختياري.» |
| «بما فيهم المشاركون الدوليون» uses the form for things, not people | «بمن فيهم …» |
| Registration and workshop steps «أتمّ الدفع أو خصمًا …» told readers to "complete a discount" | «أتمّ الدفع أو استخدم خصمًا …» |
| «التفاصيل القادمة في الطريق» is redundant. The eyebrow «والحوار مستمر» opens with a conjunction. The new pages' breadcrumb «مسار التصفح» differs from About and Dates («مسار التنقل») | «المزيد من التفاصيل قريبًا», «الحوار مستمر», «مسار التنقل» |
| Homepage wording issues: «المعلمين» for educators reads as school teachers. «خطط لزيارتك» without shadda can read as a noun, and the chapter bar has «خطّط». The FAQ's «وبحد أقصى طلبين نهائيين …» is ungrammatical | «الأكاديميين», «خطّط لزيارتك», «ولكل باحث رئيسي طلبان نهائيان كحد أقصى …» (the submissions page wording) |
| Dates & venue: «أين نلتقي.» reads as a question, «مواعيد الجلسات لاحقًا.» is telegraphic, and a paragraph repeated its own button | «حيث نلتقي.», «مواعيد الجلسات تُعلَن لاحقًا.», «تعرّف إلى ما ينتظرك في المؤتمر.» |
| `countdown.spec.ts` (tab suspension) installed the fake clock 1 s before `pauseAt`. Real-time load and hydration made `pauseAt` land in the past on a busy machine (3 local failures) | The clock starts 30 s earlier, and the asserted values are unchanged. 108/108 repeated runs passed alongside another agent's suite |

Verification (Node 24.21.0):
- ESLint zero-warning, `next typegen` and `tsc` PASS.
- Vitest 299/299, including 18 day-unit, 11 minute and 12 result-count cases.
- `next build` PASS: 40 pages.
- Playwright Chromium desktop/tablet/mobile: 276 passed and 3 skipped (duplicate tablet cases). A single earlier 404-heading timeout happened under load; it passed 18/18 on repeat.
- WebKit desktop and iPhone, `qa-regressions` and `countdown`: 22/22.
- iPhone-profile screenshots confirm joined Arabic labels, the stacked date/city line and the sentence-level lead breaks.

Checked on the live redesign without change:
- **axe (WCAG 2.2 AA plus best practices):** no violations on Home and the nine new routes, in EN/AR at 390 and 1280 px. "Needs review" contrast items are text over the film or gradients.
- **Hero text over the 18.7 s film:** every text element was measured over 10 frames at 1440/1280/390 px. The worst case was 5.16:1 for the 42 px title on a phone (3:1 needed); small text was at least 5.91:1.
- **Layout shift on a phone (Slow 4G, 4× CPU):**
  - Before PR 11, the countdown in the hero swapped from the 110 px dates card to the 286 px clock at hydration: CLS 0.118 Arabic and 0.027 English. A stand-in was built and verified, then dropped because PR 11 moved the countdown below the first viewport.
  - Live now: 0.0006 English and 0.041 Arabic. The Arabic remainder is the 166 KB Noto Sans Arabic swap (`preload: false`, loading from about 1.3 s to 3.3 s), which reflows the hero title.
  - Suggested follow-up: preload it on Arabic pages only, or use a smaller static subset. `next/font` exposes no URL to preload, and preloading for every locale would cost English readers 166 KB.
- **Back navigation in WebKit:** a reader who scrolls to the footer, opens Dates & venue and presses Back returns to the same offset in both engines. Spec failures here come from Playwright scrolling the header link into view before clicking.
- **Other WebKit spec failures are test artifacts:**
  - Playwright's WebKit does not report `<video>` downloads to request listeners, so assertions that count film requests fail. The film itself plays: live desktop and iPhone profiles chose the right derivative, played at `readyState` 4 with no error, and the same 16 `cinematic-film` failures occur against production.
  - Safari's default Tab skips links.
  - iPhone full-page screenshots are over 32767 px.
  - Redirect headers are not exposed.
  - Cancelled RSC prefetches log "due to access control checks".
  - Filters changed before hydration are dropped; after hydration both filters persist in both engines.
- **Reduced motion:** with Windows "Animation effects" off, browsers report reduced motion and the site removes reveals as designed.
- **Headers and dependencies:** security headers present; `pnpm audit --prod` found no known vulnerabilities.

Deferred until after PR 11 and now moot or re-checked:
- PR 11 adds a Dates & venue link to the homepage's Plan your visit section, replacing the header-link idea.
- PR 11 replaced «النسخ السابقة» with «نسخة ٢٠٢٦».
- The «مكان»/«مقر» venue-label difference is now fixed (see the table above).

Known limitations (not changed):
- **404 pages:** every `notFound()` is answered with Next's empty error shell (`<html id="__next_error__">`). The localized page renders only with JavaScript, so a visitor without it sees a blank page. This needs a routing-level change such as `global-not-found`.
- **Link-preview card:** English on `/ar`, because the image renderer cannot read the WOFF2-only Arabic font package. A local feasibility render with a system TTF showed that `next/og` joins Arabic letters but lays words out left to right. A word-by-word row-reverse layout fixes the order. However, the static Noto Sans Arabic WOFF (`@fontsource/noto-sans-arabic` 5.3.0) fails the build with "lookupType: 5 - substFormat: 3 is not yet supported" in the bundled opentype parser, so the attempt was reverted with its dependency. Remaining options: another OFL Arabic font whose GSUB the parser accepts, or a committed PNG rendered by a browser. The benefit is small while robots block X/LinkedIn cards, and WhatsApp already shows the Arabic title and description.
- **404 rendering:** a not-found boundary placed beside the catch-all page still produced the error shell. Next 16 renders the not-found UI on the client for `notFound()` here. Server-rendered alternatives are a site-wide `global-not-found` page, which loses the localized shell, or request middleware, which adds a function to every request; neither was adopted.
- **GitHub (organizer settings):**
  - Stale PR 2 is still open, with its head already in `main`.
  - `main` is unprotected; consider requiring "Foundation checks" before merging.
  - Merged branches remain; GitHub can delete them automatically after merge.
- **Robots and preview titles:** `Disallow: /`, `noindex` and the "Development preview" titles are intentional until release approval. While `Disallow: /` stands, robots-respecting preview bots (X, LinkedIn) show no card.

## 1 October 2026 — Public refinements and authorized release (ORG-006)

- Latest explicit requester instruction: remove the permanent visible Pause button,
  open Watch in a clean nearly full-screen film view, improve the homepage chapter bar,
  simplify copy/actions, strengthen headings, replace the pale participation background,
  and publish the finished site. Supplied project instructions remain the baseline;
  the later scoped organizer decision is recorded as ORG-006.
- The same approved homepage film/player now has a clean cinema view with hidden
  reading/navigation layers, a close control, Escape/contained Tab, `#film` history,
  original scroll/focus restoration and preference-safe direct entry with deliberate
  Play recovery. Normal playback retains the accessible background interaction without
  a permanent visible Pause button. No asset was re-encoded or moved into a gallery use.
- Participation uses warm ivory and white cards. DM Sans/Noto Sans Arabic headings
  use stronger weights. The numbered chapter index follows the reading position and
  provides native anchors, with desktop header clearance and adaptive mobile columns.
  Dedicated pages have shorter copy and one clear destination per pathway/profile.
- Final source `pnpm check` PASS: zero-warning lint, route types/tsc, 258/258 unit
  tests and optimized build with40 generated pages. Targeted cinema/public-shell
  browser run PASS:60 passed/1 duplicate tablet case skipped,1.3minutes. Final exact-head
  hosted browser regression PASS:264 passed/3 duplicate skips/0 failures of267.
- Initial full browser run:246 passed/6 failed/3 duplicate cases skipped. Four failures
  were normalized homepage-link slash assertions; the two others found real chapter
  overflow at412px/200%text. Fixed adaptive columns/wrapping without clipping. Separate
  checks exposed asynchronous history focus restoration, Forward origin loss and live
  preference-change recovery; fixed these and added bilingual regressions.
- Subsequent267-case run:262 passed/2 failed/3 skipped. The two exact-scroll checks
  recorded the position during an entrance reveal, before Playwright recentered394px
  and activated Watch. Traces show the application restored the actual activation
  position correctly. Added trial actionability before measuring the expected position;
  exact URL/focus/scroll assertions remain. Focused mobile repeat PASS:6/6 across three
  repetitions per language. No product behavior was weakened or changed for this setup fix.
- The subsequent full rerun had263 passed/1 setup failure/3 skips. Trial scrolling
  could still move before the actual click under the full-suite timing. The regression
  now records the actual native click's URL/scroll in capture phase, before the React
  film handler, and checks exact restoration against that independent observation.
  The normal real click and all assertions remain; application source is unchanged.
- Actual-click restoration repeat PASS:12/12 desktop/mobile, three repetitions per
  language. Exact d878cd8 hosted CI36903651165 PASS:258 units,264 browsers/3 duplicate
  skips,20 pgTAP and10 integrations, both jobs successful. Local full run263/1/3 found
  a separate test timing gap: identical search/day values could pass on the prior
  language before the return navigation committed. Added explicit URL/document-language
  arrival waits and retained query/filter checks. The locale/filter repeat then passed
  12/12 desktop/mobile cases, followed by final c1f7273 CI36905277026 PASS both jobs:
  258 units/264 browsers/3 duplicate skips/20 pgTAP/10 integrations, lint/types/build
  and database security checks. d878cd8 remains separately recorded historical evidence.
- Targeted public-page review PASS:24 language/viewport combinations with normal and
  200%text, filters/reset focus and distinct links. Chapter repair PASS:20 EN/AR width/
  text combinations at320/390/412/791/1440px, no overflow and minimum48px targets.
  `node .tools/cinematic-release-review.mjs` PASS: six EN/AR desktop/tablet/mobile
  homepage/chapter/cinema journeys, HTTP200, correct ivory surface/700 heading weight,
  zero page errors/overflow;18 screenshots captured and desktop/mobile views inspected.
- Published through [PR11](https://github.com/xpexellent-dotcom/msrc-2027/pull/11),
  merged e70bf38abd5e6567c85f33b348f3224927c46745. Entire merge tree equals checked c1f7273
  (`git diff --exit-code` PASS). Vercel Production6791979347 succeeded at18:23:37UTC.
  Preview6791792610 built successfully; app UAT was blocked by existing Vercel Login.
- Live `node .tools/cinematic-release-review.mjs` PASS: six EN/AR desktop/tablet/mobile
  homepage/chapter/film journeys, correct ivory/700 headings, zero errors/overflow,
  18 screenshots with EN desktop/AR mobile participation/cinema inspected.
  `node .tools/cinematic-live-boundaries.mjs` PASS:24 public200 routes,14 private404
  paths,15 closed503/no-store gates, four EN/AR320/412px200% text layouts and two
  preference-safe media/filter/explicit-film-play journeys, no mutation requests.
- No new
  dependency, database/migration/RLS/grant, secret/environment, DNS, email, payment or
  hosted-resource configuration change. All15 operational gates stay closed; public
  information routes do not fake a submission or expose an unapproved catalogue.
  Physical devices, Safari/Firefox and human screen-reader/Arabic editorial review are
  NOT TESTED. Scope, commands, publication receipts and rollback:
  [latest handoff](features/cinematic-release-refinements.md).

## 1 October 2026 — Cinematic public website (ORG-005)

- Inspected the existing application, project brief/decisions/progress, relevant v0.5
  requirements, supplied brand guide and the four requested design references. Retained
  the installed/pinned Next.js architecture and working public/security behaviour.
  Existing PROGRESS entries and user work are preserved; no new dependency was needed.
- Implemented a viewport MSRC 2026 opening film, floating responsive navigation,
  preference-safe playback with visible Pause/Play, responsive posters and an editorial
  homepage narrative. Added flowing brand lines, reusable page/card/filter treatments,
  native FAQs, a separate date/countdown band and coherent EN/AR/RTL presentation.
- Added public programme, speakers, media, participation, registration, research,
  hackathon, workshops and 3MT information routes plus approved-record detail handlers.
  Filters are addressable; scientific text is English/LTR. Empty approved catalogues
  show announcement/no-result states. No synthetic speakers, sessions or playable
  recordings were substituted for missing approvals. Raw drafts remain server-only.
- Existing approved homepage derivatives are unchanged and are not reused as gallery
  or speaker assets. Venue, opening time, roster, sessions, sponsors, prices/windows
  and recording access remain unresolved. All 15 operational gates remain closed;
  information journeys do not submit participant records or show a fake success.
- Final `pnpm check` PASS: zero-warning lint, generated types, 258/258 unit tests and
  production build (40 generated pages plus dynamic handlers). `pnpm test:e2e` PASS:
  237 passed / 2 intentionally skipped duplicate matrix cases, 3.6 minutes, desktop,
  tablet and mobile Chromium. The desktop matrix itself covers 320/791/1440px EN/AR.
  Keyboard/focus, URL filters, locale/hash, text enlargement, axe, video loading,
  preference/denial/error recovery, and closed-workflow regressions passed.
- Earlier 206-case run: 171 passed / 33 failed / 2 skipped, including assertions for
  the superseded interface. Subsequent 239-case run: 224 passed / 13 failed / 2 skipped.
  Fixed real anchor clearance, skip-link/text/card/countdown reflow, same-route filter
  resets, Arabic edition digits and Next16.3.7 cached-route fragment duplication.
  Updated historical assertions and mobile navigation targets to the current interface;
  added regressions instead of removing the meaningful failure checks.
- `node .tools/public-visual-review.mjs`: 30 EN/AR desktop 1440×900, tablet 791×1000,
  mobile 390×844 route snapshots returned 200, zero page errors, no horizontal overflow.
  Desktop/mobile film and editorial layouts visually inspected. Screenshots are in
  ignored `deliverables/public-experience/`; the live local preview is at
  `http://127.0.0.1:3000/en` and `/ar` and opened in Codex.
- No database/migration/RLS/grant, environment/secrets, DNS, hosted resource, payment,
  real email or workflow-opening change. NOT TESTED: physical devices, Safari/Firefox,
  human screen-reader/Arabic editorial review and real catalogue/recording assets.
  This change has not been deployed. Next task: review the design and populate the
  approved catalogue/assets; operational workflows retain their separate milestones.
  Full scope, content replacement points and rollback: [handoff](features/cinematic-public-experience.md).

## 1 October 2026 — Brave motion diagnosis

- User reported missing navigation slides and section reveals in Brave. Read-only
  Windows SystemParametersInfo(SPI_GETCLIENTAREAANIMATION) returned success and FALSE:
  animation effects are disabled on this PC. No system preference was changed.
- Fresh installed Brave 154.1.96.60 test, with reduced-motion emulation explicitly reset
  to system defaults, reproduced the issue on the live site: reducedMotion=true,
  zero button transition duration, no navigation slide, and no section reveal.
- A separate motion-enabled comparison in the same isolated browser reproduced the
  working path: 180 ms feedback, actual 16 px / 400 ms Program slide and 400 ms reveal.
  Both loads returned 200; no page errors. User profile/existing tabs untouched.
  Command: `node .tools/media/brave-motion-diagnosis.mjs`; receipt is in ignored
  `deliverables/brave-motion-diagnosis/`. No application/deployment/database change.
- Earlier positive Chromium checks explicitly enabled motion; they did not establish
  the user's inherited preference. To view full motion, enable Windows Animation
  effects and reload: Reveal blocks completed under reduced motion do not replay on
  a preference change alone. Separate perceptibility issues (small early slides and
  grouped children revealing offscreen) remain follow-up presentation work.

## 1 October 2026 — Live desktop motion verification

- Read-only application audit requested after the premium release. Fresh live Chromium
  checks at 1440×900 passed in English and Arabic: 180 ms button fill/hover feedback,
  1 px lift, 98% press, one-time 400 ms section reveals, actual 16 px / 400 ms route
  and anchor slides (mirrored RTL), destination focus, and no page errors.
- Reduced-motion desktop check passed: UI travel is disabled while navigation/focus
  remain functional. Source confirms native wheel/keyboard scrolling and deliberately
  subtle content movement; the implementation is not a full-page swipe transition.
- Executed `node .tools/media/desktop-motion-audit.mjs` plus agent-browser live
  open/snapshot/About click/URL/error inspection. Initial CLI browser discovery and
  PowerShell ref quoting were corrected before the successful browser checks.
  Receipts, screenshots and EN/AR desktop recordings are in ignored
  `deliverables/desktop-motion-audit/`. No application or deployment change.
- NOT TESTED: Safari/Firefox, real-device or human screen-reader review; build/database
  checks were not rerun for this read-only audit. Code inspection found the anchor
  arrival helper assumes IntersectionObserver exists; that rare unsupported-browser
  fallback remains a follow-up and was not reproduced or fixed in this check.

## 1 October 2026 — Premium public interface (ORG-004)

- Scope: restored headline, one-line EN/AR introduction, self-hosted Manrope display
  titles, original research graphics, concise public prose, refined shared shell/actions,
  one-time staggered reveals and a sectioned ivory countdown. Only the top Development
  preview banner remains as a public draft notice; unknown/closed product states stay.
- Separate visible hero Pause UI removed; semantic background keyboard/tap pause remains,
  with persistent paused frame, focus and actual browser/error recovery. Existing montage
  assets unchanged. No workflow, database/migration/RLS, environment, DNS or email change.
- `pnpm check` PASS (lint/types,252 units, production build). First201-test E2E run197
  PASS/4 new reveal assertion failures. Actual finished transforms serialize as identity
  matrices; corrected focused16/16 and final full201/201 PASS. Final types/lint and frozen
  install PASS. Six-view local
  EN/AR desktop/mobile/320px+200% playback/pause/slides/countdown/reflow PASS; six public
  routes200, ten private404,15 workflows503/no-store. Visual screenshots inspected.
- Published through [PR9](https://github.com/xpexellent-dotcom/msrc-2027/pull/9), app main
  cbfe62a, after [CI36847305482](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36847305482)
  passed both jobs (252 units/201 browsers/20 pgTAP/10 integrations). Preview6781648361
  and Production6781771386 succeeded. Merged tree matches exact verified PR head9d9026a.
  Fresh live six-view EN/AR autoplay/background keyboard pause/slides/countdown/reflow
  PASS; six public routes200, ten private404,15 workflows503/no-store. Preview app UAT
  BLOCKED by Vercel Login; protection preserved. No `.env`, schema or media file staged.
  Full33-file list, source IDs, commands/results and rollback: [feature note](features/premium-public-interface.md).
- Final official branding/human Arabic/editorial/device/screen-reader/Safari/Firefox UAT
  and broader REL-01 remain open. All15 operational gates stay closed.

## 1 October 2026 — Requested homepage experience fixes (ORG-003)

- Scope: public muted autoplay without automatic still-mode preferences, clean mobile
  icons, controlled explicit navigation slides/native scrolling, a larger right-column
  D/H/M/S clock, and welcoming English/Arabic headline/lead. No operational feature,
  database/migration, environment, dependency, DNS or email change. All 15 gates remain closed.
- ORG-003 supersedes the automatic public still-image default diagnosed below. Browser
  autoplay denial retains manual Play; actual failed media retains a poster. Keyboard
  pause freezes the video frame; hidden tabs pause playback. UI reduced-motion
  alternatives remain. Approved source and derivative media are unchanged.
- The clock targets and labels the start of 27 January 2027 at 00:00 Asia/Riyadh.
  Conference opening time and venue remain unset; this display never opens workflows.
- Local evidence: `pnpm check` PASS (lint/types, 252 units, production build),
  `pnpm test:e2e` PASS (185 tests). Actual six-view EN/AR autoplay, keyboard pause,
  mobile/reflow and production private-route checks PASS. A visual 200% time-label
  refinement rebuilt successfully; 51 focused browser regressions and the six-view
  recheck PASS, including 15 closed/no-store workflow endpoints. Enlarged clock
  screenshots inspected; no horizontal overflow. Safari/Firefox/real-device/human UAT
  remain NOT TESTED for this task.
- Initial test-only TS2352 cast failure was corrected; prior diagnostic work is preserved.
- Published through [PR7](https://github.com/xpexellent-dotcom/msrc-2027/pull/7) to main
  da4b93e after [CI36798655620](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36798655620)
  passed both jobs, including 185 browser, 20 pgTAP and 10 client integration tests.
  Production6773615857 succeeded. Live six-view EN/AR autoplay/keyboard pause,
  mirrored400 ms slides/focus and clock/reflow PASS; six public routes200,
  ten private routes404 and all15 workflows503/no-store. Preview build passed;
  unauthenticated Preview browser UAT was blocked by Vercel login, protection unchanged.
- Exact scope, 29 changed paths, verification, limitations and rollback:
  [feature note](features/homepage-experience-fixes.md). Latest request explicitly
  reauthorizes pushing and publishing once the fixes are complete.

## 1 October 2026 — Live homepage still-image diagnosis

- Read-only browser inspection of `https://www.msrc2027.com/en` reproduced `Still image mode`: the hero had `data-media-state="poster"` and no video element. The inspected browser reported `prefers-reduced-motion: reduce = true`, with the document visible; no warning/error logs were returned. This establishes the trigger in the inspected browser, not in every visitor's device.
- Source inspection confirms `src/lib/media-policy.ts:53–56` deliberately prevents loading for reduced motion (DSN-01 / ACC-01). `src/components/hero-media.tsx` also omits the Play control in that state, and `src/styles/media.css` hides video under the same preference. Approved desktop/mobile MP4 paths remain configured in `src/content/public-site.ts`.
- No application, media, browser preference or deployment change. Tests/build were NOT RUN for this diagnostic-only task; normal-motion playback and other devices were NOT TESTED in this check.
- Suggested next task: retain the motion-safe default while providing an explicit, accessible visitor-initiated Play option, with matching policy/CSS and regression coverage. No organizer decision changed.

## Current evidence

| Item | Observed status |
|---|---|
| Main File PDF | Reviewed, including all-page visual coverage and extracted text |
| Live Development Specification v0.5 | Read and archived as a dated source snapshot |
| Updated Hackathon Draft | Read and reconciled; options and conflicts preserved |
| Brand guide and previous starter pack | Reviewed; recommendations distinguished from approvals |
| Original Canva brand reference sheet | Text read; palette and English font names corroborated, final brand approval still pending |
| 2026 media | ORG-002 derivatives/rights unchanged. ORG-006 removes the permanent visible Pause button and reframes the same homepage player into a nearly full-screen film view. Preference-safe entry, explicit Play, focus/history/close and poster recovery verified; other asset rights remain open. |
| Codex handoff documents and prompts | Prepared in this package |
| Domain / HTTPS | Fresh checks: www CNAME matches Vercel; HTTPS EN/AR Home/About return 200; HTTP/HTTPS apex resolve to https://www.msrc2027.com/en. Account custody/renewals remain unverified. |
| Git / application code | PR11 merged at e70bf38 after exact c1f7273 CI36905277026 passed both jobs; complete merge tree matches checked head. Production6791979347 succeeded. Prior release/source evidence remains preserved; custody/required-check enforcement remain separate work. |
| Local development installation | PASS: exact dependencies installed, frozen lockfile verified, portable Node24.21.0 selected for this host. |
| Windows container prerequisites | WSL3.0.1 and Docker Desktop4.93.0 installed; optional PC fixture tests still require restart/first launch. User now selected direct hosted access for normal work (ENG-006). |
| Vercel/Supabase projects / production secrets | Production6791979347 succeeded for e70bf38; fresh live EN/AR public page/film checks passed. Connector settings/drains remain NOT VERIFIED. Hosted Supabase evidence was not refreshed; no hosted data/settings or secrets changed. |
| Tests / CI / preview / production deployment | Local lint/types/258 units/build PASS; exact c1f7273 CI36905277026 PASS both jobs,264 browsers/3 duplicate skips/20 pgTAP/10 integrations. Preview6791792610 succeeded, protected app UAT blocked. Production6791979347/live six visual journeys,24 public200/14 private404/15 closed503 gates/four200% text layouts/two preference/filter/film journeys PASS. Retained failed runs/repairs in the latest feature note. Physical-device/human/Safari/Firefox review open. |
| KAU collection access / email sender | Not verified |
| Implementation backlog | Documentation:152 issues/24 epics/13 decision packets/212 source IDs mapped. ORG-005/006 public journeys and presentation are implemented; operational modules keep their distinct milestones. No operational gate opened. |

## Milestone status

| Milestone | Requirements/planning | Implementation | Release |
|---|---|---|---|
| M0 Governance | Baseline and decision register prepared; named owners/evidence pending | Organizational setup unverified | Pending |
| M1 Foundation | ENG-001/004/005/006 adopted; relevant source IDs retained | Foundation and isolated Linux database CI verified; Windows local stack optional and untested | Deployed foundation does not open operational or institutional approval gates |
| M2 Design system | ENG-007 palette/motion, ORG-005/006 public identity/refinement | Floating navigation, numbered chapters, ivory/white participation, stronger DM Sans/Arabic titles, flowing motifs and reusable public/filter/media treatments verified EN/AR; native scrolling and accessible motion/film behavior | Scoped presentation published; final brand/human review pending, production showcase closed |
| M3 Public alpha | Public sitemap; ORG-001 dates/ORG-002 media/ORG-005/006 presentation | EN/AR Home/About/Dates/Programme/Speakers/Media/Participate/Registration/Research/Hackathon/Workshops/3MT published at e70bf38, plus safe approved-record detail handlers and aliases; cinematic homepage and filters verified | Scoped public release complete. Final brand/copy, venue/start time, approved catalogues/assets and broader REL-01 open;15 operational gates closed |
| M4 Staff auth/CMS | Requirements defined | Not verified | Pending |
| M5 Participant auth | Requirements defined | Not verified | Pending |
| M6 Abstract/review | Detailed baseline; configuration gates remain | Not verified | Pending |
| M7 Registration/workshops | Detailed baseline; finance and capacity inputs remain | Not verified | Pending |
| M8 Competitions | Hackathon partly decided; 3MT configuration pending | Not verified | Pending |
| M9 Event operations | Required evidence identified; procedures pending | Not verified | Pending |
| M10 Certificates/archive | A1/S2 selected; templates/privacy implementation pending | Not verified | Pending |
| M11 Handover | Requirements identified | Not verified | Pending |

Do not convert this table to percentage completion without observable evidence. The earlier tracker is a blank template and does not establish implementation.

## Next task

M3 can continue now. Do not rebuild M1/M2/About or wait for optional Windows Docker.
The [checklist audit](reviews/checklist-audit-2026-10-01.md) records current source,
deployment, evidence gaps and the sequence agreed by the existing roadmap.

The user confirmed27–28January2027 and approved this18.7-second MSRC2026 montage;
ORG-001/002 preserve that authority. ORG-005/006's cinematic public pages and requested
refinements are now published and live-verified. Next: populate approved session/speaker/
workshop catalogues and official assets, then review bilingual copy and venue/time inputs.
Gallery rights and recording/access decisions remain separate. Operational work starts
with its existing milestone/decision contract; public presentation opens no workflow.

Next smallest content PR: approved contact/privacy/terms details and remaining public
informational routes, after receiving the responsible owners' wording. The
[BL-SEC-01](backlog/21-privacy-security.md#bl-sec-01) can proceed independently with
synthetic actors; M4 must establish staff grants/MFA before exposing CMS writes.

Before calling the existing draft an approved public release, resolve the public-draft
boundary, record approved copy/contact/privacy/terms, finish relevant human UAT, assign
custody/release/support owners and verify monitoring/recovery. Follow up the cancelled main
workflow, merge-check enforcement and stale PR2 as separate governance work. The current
user explicitly authorizes this release; no operational workflow opening follows from it.
Venue, start times, deadlines, prices and capacities remain gated.

Use the selected hosted Supabase connection for normal development. Windows Docker setup
is optional for PC fixture tests; GitHub retains isolated synthetic database verification.
Any hosted schema feature needs explicit grants/RLS and a reviewed migration, not a copy
of the local synthetic fixture. All operational gates remain closed. See
[hosted connection](features/hosted-supabase.md) for current evidence and
[database/CI verification](reviews/m1-database-ci.md) for earlier local-stack results.
The [implementation backlog](backlog/README.md), DR-CFG-11 ownership and DR-CFG-12
content/brand decisions remain available for later work; no decision was silently resolved.

## 1 October 2026 — Confirmed dates, countdown and authorized publication

**Release complete:** [PR5](https://github.com/xpexellent-dotcom/msrc-2027/pull/5)
merged at `d6e4be7deb98fd5b85d5cf2ff5cca5ead89f8180` after
[CI36793419169](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36793419169)
passed on `5a27e9cb766379099832b1093fbc283f5894360b`. GitHub recorded Vercel
Production deployment6772802242 as success. Actual browser checks of
[English](https://www.msrc2027.com/en) and [Arabic](https://www.msrc2027.com/ar),
their About/Dates routes, media/gates and complementary narrow/enlarged layouts
passed. Complete commands, exact evidence and file list are in the feature contract.
The merged main revision also passed
[CI36793777799](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36793777799).
This completion applies to the approved static date/media release, not all REL-01 gates.

Scope: publish the previously reviewed Brand/interface polish and approved MSRC2026 film,
set Day1 to27January2027 and Day2 to28January2027, add a homepage calendar-days countdown,
and reconcile Home/About/Dates/metadata, decisions and checklist. See
[feature contract](features/confirmed-dates-publication.md) for files, acceptance and rollback.
Source IDs include SCP-01/02, CFG-01/12, TIM-01, LOC-01/03, ACC-01, MED-01–04 and REL-01.

Dates remain date-only; no opening/session instant is invented. Current Riyadh calendar
determines before/Day1/Day2/after states and midnight refresh. Cached HTML contains static
dates; no-JS browsing remains readable. The new Dates & Venue page explicitly preserves
unknown venue/rooms/times. Home/About metadata and preview image share typed date values.

Only four approved media derivatives are public; source/recipe remain ignored/private.
Pause, inline muted playback, mobile crop, poster and motion/network/error fallbacks remain.
All15 operational flags stayfalse; no migration, data write, RLS/grant, hosted secret,
environment, DNS or real communication changes. Final brand/REL-01 decisions are separate.

First browser pass found a reproduced English ICU hydration mismatch and no-JS static
content hidden by streamed loading UI. Server-formatted date props and a loading boundary
scoped to the interactive showcase fix these; a layout guard preserves actual production404.
Normalized anchor selector and media-opacity timing assertions were repaired without
weakening expected outcomes. Initial suite stopped after74 tests; no full pass was claimed.

Executed: final pnpm check PASS (232 unit tests, lint, types, build); pnpm test:e2e PASS
(157/157 Chromium desktop/tablet/mobile,1.7minutes), including date boundaries/no-JS,
actual public film/preferences/failure and all closed-workflow regressions. Original/source-copy
hash checks PASS; both public videos fully decode; seven production preview/original paths
return404 with both flags set. Independent visual QA PASS:36 Home/About/Dates views across
EN/AR,1440/390/320px and normal/200% text, plus six actual-film keyboard pause/focus checks;
no console/page errors, overflow, glyph clipping or control/caption overlap. Reduced-motion
still and production404 guards passed. Evidence: ignored deliverables/m3-confirmed-dates.
Manual review found an enlarged Arabic skip-link/banner overlap missed by main-content
geometry checks; hiding now follows the link's own height, with keyboard regression tests.
Final157-case browser retest PASS, including the enlarged-text skip-link regression.
Remote CI36793419169 subsequently passed all application and isolated database checks;
the initial9-failure streamed-showcase test run was corrected without relaxing assertions.
Production6772802242 at d6e4be7 and live root/independent browser checks PASS.
No hosted data changed. See the feature contract for exact results and remaining UAT.

## 1 October 2026 — Brand/interface polish and private homepage film preview

Scope: complete the currently unblocked Brand/interface checklist work, improve English/
Arabic Home/About, refine button/section motion and prepare the user-supplied montage for
review before publication. Official brand assets remain pending; ENG-007 defaults retained.
No product workflow, database change, credential, dependency, hosted setting, deployment,
DNS change or real communication. Earlier audit/backlog edits are preserved.

Implemented: directional solid button fills and mirrored arrows/underlines, clearer
reading widths/spacing, enlarged-text recovery, optional native proximity scrolling with
free-scrolling/reduced-motion alternatives. Public Home/About retain synthetic artwork.

Prepared:18.7-second MSRC2026 muted loop with auditorium/audience/research discussion,
desktop1280×720 (2,762,552 B), mobile720×1280 (1,866,350 B) and JPEG still posters.
Original is read-only/unchanged. Four derivatives are private and ignored; server-enforced
development-only review pages and byte-range endpoints cannot serve footage in production
even with their flag enabled. Pause freezes the frame; mobile controls use a flow slot.

Actual final checks:
- PASS: `pnpm check` — ESLint, route type generation/TypeScript,213 unit tests, build.
- PASS: `pnpm test:e2e` with documented browser cache —112 Chromium desktop/tablet/mobile
  tests, including actual production-build preview denial and all15 closed API gates.
- PASS:25 independent actual-film checks for device source, pause/resume/focus, frozen
  frame, reduced motion/low bandwidth/failure, exact ranges and denied original paths.
- PASS:6 desktop/mobile EN/AR film views with zero Axe/console errors;30 views at200%
  text and8 mobile control-flow checks; source hash, full decode, no audio and faststart.
- PASS: `git diff --check`; original/derivatives ignored. Native checklist9 scoped patches
  applied at sequence2, separating technical preparation from pending publication approval.
- Earlier107/112 browser result exposed two real CSS defects and a computed-style test
  expectation; fixed and full suite rerun. One cache-path setup attempt and concurrent
  Turbopack HMR issue are recorded with recovery in the feature note.
- NOT RUN: database suite, remote CI/Preview/deployment for this UI/read-only media slice.
  Safari/Firefox, real-device/screen-reader UAT and final Arabic/brand/media review remain open.

Review at [English](http://127.0.0.1:3300/en/hero-preview) or
[Arabic](http://127.0.0.1:3300/ar/hero-preview), while the local server is running with
`LOCAL_MEDIA_PREVIEW_ENABLED=true`. Blank documentation added to `.env.example`; no hosted
environment changed. The Codex browser-open request was queued, so links are provided.
See [complete file list, commands, evidence, manual setup and rollback](features/brand-motion-media-preview.md)
and [media record](MEDIA_REGISTER.md#8-msrc2026-montage-local-review-candidate--1-october-2026).

Release: LOCAL REVIEW READY, UNPUBLISHED. Next inputs: official brand, organizer preview
review and per-asset clearance. Next code PR remains BL-PUB-02, honest bilingual Dates/Venue;
BL-SEC-01 synthetic permission contract can proceed independently. No migration rollback
is required; disable the local preview flag or revert only this slice's changes.

## 1 October 2026 — Feature checklist audit and sequence reconciliation

Audited and updated the user-linked [feature checklist](https://chatgpt.com/space/page_5962a54672888191869e3c6108c27678).
Its previous no-application/no-deployment assessment came from a different inspected
workspace and is superseded by current repository, CI and public HTTP/DNS evidence.
Reconciled confirmed abstract/hackathon choices and the AI-03 default with v0.5; kept
the separate AI prototype's20-test claim explicitly historical and outside this platform.

Read all checklist blocks and open comments (none); inspected current code, source,
decision and backlog records; independently checked24 epics/152 implementation issues/
13 decision packets/212 source IDs. Read GitHub PRs, commit comparison, CI jobs and
deployment receipts. Fast-forwarded the clean local checkout from706219d to existing
remote9e018ae, preserving all eight newer commits and their QA notes. No implementation
was authored by this audit. Full lint/type/unit/build/browser/database suites were not
rerun; CI conclusions were read and live read-only smoke checks were executed.

Fresh checks: four EN/AR Home/About responses200, three public design-system responses404,
all15 operational GET endpoints503 WORKFLOW_CLOSED, robots disallow all, sitemap404,
DNS CNAME matches Vercel and both apex protocols reach HTTPS www/en. One recorded Preview
redirected an unauthenticated design-system request to Vercel login; authenticated content
and full deployment settings remain unverified. Main-specific workflow was cancelled;
successful PR CI covers the same source commit, not that cancelled run.

Updated current progress, backlog status and the decision reconciliation note. Kept dated
historical results intact. M3 media/editorial work and BL-PUB-02 are unblocked; public
REL-01, CMS and all operational opening gates remain unmet. See the
[audit record](reviews/checklist-audit-2026-10-01.md) for commands, findings, next tickets,
scope and rollback. No reminders, production changes, secrets, emails or live data writes.

## 30 September 2026 — QA pass: Arabic polish, favicon, apex domain

Exploratory QA of the live preview (www.msrc2027.com, EN/AR, 1280/1100/390px) plus the
full local suite. Scope: copy/style/metadata only; no workflow, data or gate changed.

| Finding | Change |
|---|---|
| Arabic kicker/footer "مؤتمر أبحاث طلاب الطب الخامس" can read as "fifth medical students" | Now "المؤتمر الخامس لأبحاث طلاب الطب", matching the About page |
| Arabic hero, several headings and pathway titles were word-for-word translations | Rewritten as idiomatic MSA following the English meaning (for example "حيث يتحوّل الفضول / إلى اكتشاف.") |
| Mixed digit systems in Arabic (٠١ eyebrows, but 01–04 pathway and program numbers) | Shared `formatIndex` helper; unit test prevents Western digits returning to Arabic copy |
| "Not open yet" badge did not agree with its noun in Arabic | Masculine form for pathways (مسار), feminine form for participation (المشاركة) |
| About purpose item repeated its section title; footer "المحددة" note was unclear | Distinct item title; the note now says pages are "marked with a dot" (EN and AR) |
| Arabic labels rendered at 10–11px, visibly smaller than Latin at equal size | Arabic-only size lift for small labels (preview bar, eyebrows, badges, captions, footer) |
| `/favicon.ico` 404; tabs showed no icon, and there was no iOS home-screen icon | `src/app/icon.svg` monogram in the working palette, plus a matching static 180×180 `apple-icon` |
| English pages downloaded the 166 KB Arabic webfont only to draw the "العربية" switch label (≈40% of page bytes) | The label uses the system Arabic face; measured EN transfer 425 KB → 260 KB and CLS 0.0001 → 0 (390px, throttled). An e2e test guards it |
| No canonical, hreflang or link-preview metadata; shared links had no card | Per-page canonical and `en`/`ar`/`x-default` alternates, Open Graph/Twitter tags and a static 1200×630 card per locale (`[locale]/opengraph-image.tsx`); `noindex` is unchanged |
| No Content-Security-Policy or COOP header | Structural CSP (`base-uri`, `form-action`, `frame-ancestors`, `object-src`) and `Cross-Origin-Opener-Policy: same-origin`; script/style sources are left open until a nonce-based policy is designed. An e2e test covers the headers |
| Latin "MSRC 2027" spans on Arabic pages lacked `lang="en"`, and the Arabic 404 code used Western digits | `lang="en"` added for screen-reader pronunciation; Arabic 404 shows ٤٠٤ |
| Root `/` → `/en` ran as a serverless function in `iad1` with no caching: live TTFB 0.41–0.50s versus about 0.20s for `/en` from the Mumbai edge | Replaced `src/app/route.ts` with a `next.config.ts` temporary redirect answered at the edge; e2e asserts 307 → `/en` |
| axe best-practice sweep (EN/AR, home/About/404, 390 and 1280px): the preview banner sat outside any landmark (`region`) | Banner is a labelled region («حالة الموقع» / "Site status"); an e2e test now runs the axe best-practice rules on the four public pages. Arabic layouts at 320/768/1024px inspected with no overflow |
| Arabic skip link and retry wording | «انتقل إلى المحتوى الرئيسي» and the standard «أعد المحاولة» |
| Apex `msrc2027.com` had no DNS A record (only `www` resolved) | User-authorized: added `msrc2027.com` to the Vercel project (308 → www) and a Namecheap `@` A record to `216.198.79.1`; verified on the authoritative and public resolvers |

Verification (Node 24.21.0 portable, pnpm 11.19.0): ESLint PASS; typegen and `tsc` PASS;
Vitest 184/184 PASS (numeral and metadata tests added); `next build` PASS; Playwright 102/102 PASS
(preview-image, Arabic-webfont, security-header, root-redirect and axe best-practice tests added).

Cross-browser (local Playwright WebKit 26.6: Desktop Safari and iPhone 15 profiles). Every public
homepage/About check passes: rendering, overflow, axe, headers, preview image and 404s. The only failures
are the five keyboard tests that press Tab to reach links, because WebKit follows Safari's default of not
tabbing to links without Option+Tab, which is a browser preference rather than a site defect. The staff-only
design-system specs also hit harness limits (no WebM codec, 32,767px screenshot cap, radio arrow keys). The
reduced-motion test hard-coded port 3210 and now reads `baseURL`. Firefox: NOT TESTED, because the browser
cannot launch in this sandbox (`spawn UNKNOWN`).

Low-priority recommendation: Arabic pages discover Noto Sans Arabic without a preload. On throttled slow
mobile it finishes at about 2.4s, after the hero paints; on a fast 4G profile (40ms, 12Mbps) it finishes at
about 0.48s, before LCP (about 0.78s), so most visitors see no swap. A locale-specific preload would need a manual
`@font-face` outside `next/font/local` (a recorded decision), so it is left for review.
Local Playwright screenshots of AR 1280/1100/390px and About were inspected, with no horizontal
overflow or console errors. Arabic editorial approval is still required under CFG-12; these
are draft improvements, not approved copy.

## 30 September 2026 — Complete M2 component system

Implemented the current requested inventory without adding operational modules: expanded
tokens, shared Section/Link/ContentSplit/StatBlock/ProgramRow, extracted MobileNav/Footer,
native FormField/Select/Checkbox/Radio/FileUpload, Alert/EmptyState/LoadingSkeleton,
controlled Dialog/persistent Toast, semantic Table and pagination. Existing Container,
Header, Button, LanguageSwitch, SectionHeading, StatusBadge and local font setup are reused.
Both English/LTR and Arabic/RTL showcase routes include applicable states. Added gated
`/design-system` alias. All 15 operational flags remain closed; no live data access occurs.

ENG-007 records the latest palette/font/motion implementation decision. Drive metadata and
six root folders were readable again; no new media was downloaded or published. File
selection remains browser-memory-only. No migration, dependency, lockfile or environment
configuration changed. See [scope, full file inventory and rollback](features/m2-components.md).

Verification on the Windows checkout (Node24.21.0 / pnpm11.19.0):

| Command / inspection | Observed result |
|---|---|
| `pnpm check` (lint, route type generation, TypeScript, Vitest, production build) | PASS; final code run has 181 unit tests across 8 files; all routes built |
| `pnpm test:e2e` with local Chromium cache | PASS: 90 desktop/mobile/tablet cases, including 30 focused M2 cases; final full run51.4s |
| Initial 84-case browser run | 78 passed / 6 failed: native dialog Tab boundary plus a broad Arabic status selector |
| Expanded 90-case rerun | 88 passed / 2 failed: alias test expected an exact robots header but existing global config adds `noarchive`; corrected assertion to retain required directives |
| `node .tools/ci/verify-m2-production.mjs` | PASS: `/design-system`, `/en/design-system`, `/ar/design-system` all HTTP404 under `VERCEL_ENV=production`, even with preview flag true |
| `node .tools/ci/capture-m2.mjs` | PASS: English1440px/Arabic390px pages and dialogs rendered, no console errors/framework overlays |
| Screenshot inspection | English desktop and Arabic mobile overview, fields, table and dialog inspected; eight PNGs in ignored `.tools/verification/m2/` |
| `git diff --check`; scoped final test ESLint | PASS; no whitespace errors or lint findings |
| Hosted database/RLS mutation tests | NOT RUN: no database code/schema changed and this UI slice must not mutate live Supabase |
| Windows local database stack | NOT RUN: optional installed Docker still needs first-launch/restart setup; Linux CI provides the isolated fixture check |
| GitHub application/database CI | PASS: [PR run36632458600](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36632458600) on implementation commit `1c6be4e`; 181 unit /90 browser /20 pgTAP /10 integration tests; schema lint, security advisors and generated types passed |

The dialog now cycles available controls while excluding hidden/disabled controls, restores
focus on Escape/backdrop close and preserves native modality. Tests also cover anchor
smooth/instant behavior, touch targets, reduced motion, file clearing/no writes, table
boundaries, local/staging route headers, existing bilingual pages and closed endpoints.
Semantic text colour pairs meet4.5:1; tested control/focus pairs meet3:1. Gold-on-ivory remains
decorative. Automated axe checks include the full showcase and open dialogs.

Local preview: `http://127.0.0.1:3000/en/design-system` and `/ar/design-system`.
Reviewable change: [PR3](https://github.com/xpexellent-dotcom/msrc-2027/pull/3), stacked on
PR2. No PR was merged. A final independent code review found no actionable P1/P2 issues;
that review is separate from the executed tests above. A documentation-only follow-up
records the immutable implementation-run evidence and does not alter verified app code.
For a new terminal use the README. Remote staging requires explicit deployment protection;
no Vercel deployment or production publication was created. Screen readers, real devices,
Safari/Firefox and final Arabic editorial review are NOT TESTED in this slice. Rollback is
the component commit revert; no database action is required.

## 29 September 2026 — Direct hosted Supabase connection

The user requested direct use of live Supabase and supplied the `ecemjggwlzqpjcwmchrl`
API URL. Confirmed existing project `msrc`, ACTIVE_HEALTHY, region `ap-northeast-1`;
public tables and migration history empty; generated public schema empty; security advisor
returned no findings. This records the existing region, not institutional production approval.
No project, key, migration, data record, Auth/Storage setting or paid resource was created.

Added explicit hosted configuration, HTTPS/publishable-key validation, separate default empty
schema and guarded local fixture types, and a read-only hosted connection command. Kept all
15 flags closed. Wrote the existing publishable key and public settings to an ignored local
environment file without printing values. Public pages remain static and database-independent.

The initial Data API root metadata check returned HTTP401 (`Secret API key required`);
this was a restricted metadata endpoint, not a need to add privileged credentials. Switched
verification to public Auth service settings, which accepted the publishable key with HTTP200.
This endpoint creates no user/session or email. A separate constant `SELECT 1` passed through
the authorized connector. No table rows were requested. Local `db:integration` correctly
refused hosted settings before test collection (expected exit1). The per-client local guard
also rejects hosted targets before constructing a client.

Full application/CI evidence and remaining limits are recorded in the
[hosted connection feature note](features/hosted-supabase.md). ENG-006 supersedes the local-only
connection restriction and makes Windows Docker optional for ordinary hosted work. The
source specification, infrastructure ownership and operational release decisions remain intact.
Local verification passed lint/types/build, 158 final unit tests and all 60 EN/AR browser
cases. No page or live data workflow changed. GitHub reruns the isolated Linux database
suite on the associated hosted-connection PR; this never uses the hosted project key.

## 29 September 2026 — Windows runtime installation and hosted CI

The user authorized installation, database checks and CI, then explicitly requested creating
the repository on their GitHub account. Created private `xpexellent-dotcom/msrc-2027`, kept
the existing history and pushed `4f0f37d`. The user approved Git Credential Manager access
and completed GitHub email verification; no token entered source, documents or tool output.

WSL3.0.1 and Docker Desktop4.93.0 per-user installation both exited0. The official Docker
installer's signature and versioned SHA256 matched. Docker CLI29.8.1 is installed, but its
server probe fails because Windows requires a restart to activate Virtual Machine Platform.
No automatic reboot, Docker terms acceptance or managed production resource was performed.

The [initial hosted workflow](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36614744871)
passed in3m30s: application lint/type/unit/build/browser job and local Linux Supabase
startup/reset/lint/20 pgTAP/10 real-client checks/stop. This proves the isolated runner stack,
not this Windows engine. The extended [PR workflow](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36616046623)
also passed all checks and the added security-advisor/generated-type commands. The advisor
reported no issues at its warning/error threshold; generated types passed TypeScript. Manual
comparison matched all table shapes and found four empty schema registries whose key types
needed tightening to the generated form. Applied that compile-time-only correction. See the [verification record](reviews/m1-database-ci.md)
for exact commands, job links and non-failing CLI notices. [PR #1](https://github.com/xpexellent-dotcom/msrc-2027/pull/1)
preserves this focused change for review; no merge or release was performed.

Changed scope: CI verification steps, empty schema registry types, README and ownership/decision/progress/evidence notes.
No application UI, dependency/lockfile, migration, seed, operational flags or business values
changed. ENG-005 distinguishes authorized personal development custody from the unresolved
institutional production handover. Remaining Windows commands are listed above and in README.

## 29 September 2026 — M1-only reproducibility follow-up

Scope: audit and close engineering-foundation gaps in the existing repository. Preserve
M2/homepage/About and the backlog; implement no operational workflow or new public page.
Recorded ENG-004. Corrected local Auth infrastructure configuration so the pinned CLI can
provide its publishable key, while every signup setting and application auth gate stays
closed. Added a safe local-env helper, 20 unit checks, ten live-local client checks and
the database CI steps. Final review corrected reset/pgTAP custom-network flags and kept
credential-bearing CLI startup output out of CI logs. Added 29 README-only playbook
boundaries; these create no routes.
Updated Windows/local setup instructions and feature notes. No dependency, lockfile,
migration, source snapshot, production service, real credential or participant data changed.

Executed evidence:

- PASS: `pnpm install --frozen-lockfile`; `pnpm check` (lint, route types/TypeScript,
  **89 unit tests**, production build); no operational route appeared in the build.
- PASS: `pnpm test:e2e`, **60 tests in 36.8 seconds**, clean exit. An earlier run also
  passed all cases but Windows sandbox process cleanup stalled; only its verified owned
  server was stopped. The rerun with local process permissions resolved that limitation.
- PASS: fresh local Git clone with the current patch, no copied dependencies or environment
  files; frozen install downloaded 400 packages, `pnpm dev --port 3024` started, and eight
  English/Arabic desktop/mobile/navigation/closed-endpoint smoke checks passed. Screenshot
  evidence is in ignored `deliverables/m1-verification/`; the verification server was stopped.
- BLOCKED: `pnpm db:start` found neither Docker nor Podman; WSL is not installed. `pnpm db:env`
  failed safely without creating a file; `pnpm db:integration` exited 1 on missing local
  settings, so none of its ten live assertions executed. pgTAP/reset/lint/types remain unrun.
- NOT TESTED: hosted GitHub CI and deployment; no Git remote or production connection.
- Final file, whitespace, environment and credential-pattern checks are recorded in the
  [M1 review](reviews/m1-foundation.md). Such scans are scoped evidence, not a security certification.

Full command/result details, acceptance matrix, file inventory, remaining setup and rollback
are in [M1 verification](reviews/m1-foundation.md). Local app acceptance passed; local
database and hosted CI acceptance are explicitly outstanding. Preserve this checkout in a
durable project location because its current parent is a temporary preview directory.

## 29 September 2026 — Complete implementation backlog, documentation only

User scope: plan all 24 requested epics using the master context and v0.5, with small
PR-sized issues and a separate Decision Required list. No application code requested.

Created [docs/backlog](backlog/README.md): **152 implementation issues**, **13 decision
packets** and Markdown/CSV indexes. Each issue contains its title, source/status, purpose,
scope/exclusions/dependencies/roles, states/data, acceptance criteria, bilingual and
accessibility behavior, security/RLS, audit/email, automated tests/manual UAT, release gate,
owner type and explicit TBD blocking status. All 13 CFG question sets are retained verbatim;
confirmed choices and configurable defaults remain distinguished from unresolved inputs.
Existing M1/M2/homepage/About evidence is recorded as local completion with release gates.

Changed files: 24 epic documents, Decision Required, backlog README and validation evidence,
two CSV indexes, plus navigation/continuity updates in root README, DECISIONS, ROADMAP and
this PROGRESS file. No source snapshot, application code, migration, dependency, environment
variable, provider resource, DNS record or production state changed. No real messages or
external issues were created. No new organizer decision was made.

Executed documentation verification:

- PASS: all 24 epics, 165 unique issue bodies and all 19 required metadata fields plus titles.
- PASS: every cited source ID exists; all 212 source IDs covered, including implementation
  references for all 199 non-CFG requirements/acceptance IDs and separate CFG decision packets.
- PASS: no dangling exact issue references or cycles in the explicit implementation dependency
  graph; integration prerequisites remain in activation gates and need end-to-end evidence.
- PASS: 215 local Markdown links, 165 stable anchors and 13 verbatim CFG question sets.
- PASS: CSV row counts (165 issues / 212 source IDs), new-document whitespace checks and
  `git diff --check`; actual Git state/history inspected before work.
- Independent review fixed missing actual KAU handoff, live sender setup and annual data
  separation slices; tightened workshop overlap checks, split media processing and clarified
  implementation versus activation dependencies. See [validation record](backlog/VALIDATION.md).

Commands: inline PowerShell document/source parsers with `Get-Content`, `Get-ChildItem`,
`Test-Path`, `Export-Csv`, `Import-Csv`; reference/cycle checks over parsed results;
`git status --short`, `git log -3`, `git diff --check`.

Lint/typecheck/unit/browser/database tests/build: **NOT RUN for this documentation-only
task**. Prior results are not new passes. The recorded local database container blocker,
unverified hosted CI/infrastructure and pending manual accessibility/content checks remain.
No UI changed, so no new screenshot or preview test was required. Named decision owners and
due dates remain unassigned; production gates remain closed. Documentation rollback needs
no database or environment action. Next smallest tasks are listed above and in the backlog.

## 29 September 2026 — M1 local foundation

Requested outcome: the smallest reproducible local engineering foundation, preserving
the handoff and using synthetic data. Branch: local `main`. See ENG-001 in DECISIONS.md
and [foundation feature notes](features/foundation.md).

Source IDs: INF-01/02/04/05, SEC-01/02/06, ROL-01, LOC-01/02/03, CMS-04,
ACC-01, ERR-01, TIM-01, CFG-01/02/07/10/12, REL-01 through REL-06.

### Observed starting environment

- Working folder: Codex temporary preview copy `MSRC27_Codex_Handoff`; separate Downloads
  copy was read-only. No app, package manifest, lockfile, Git history or remote existed.
  No other local website repository was identified among registered projects.
- System Node25.6.0, npm11.8.0, pnpm11.19.0, Git2.53.0.windows.3 available. Docker,
  Podman and Supabase CLI not initially available. No hosting/database/DNS inferred.
- Verified and downloaded official Node24.21.0 Windows executable into ignored `.tools/node`.
  SHA256: `ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`.
  Pinned Supabase CLI installed as a project dev dependency. No system runtime replacement.

### Completed work

- Next App Router/React/TypeScript/Tailwind/pnpm baseline with exact direct dependencies,
  preserved lockfile, server-generated English/Arabic document direction, shared placeholder,
  skip link/language switch, loading, sanitized errors and genuine localized HTTP404s.
- Typed null conference settings and15 permanently closed server guards. Direct requests,
  spoofed roles, unsupported names, alternative methods and repeated/concurrent attempts are
  denied. No participant operations or real data are stored.
- Optional loopback-only browser/server data clients; CLI-generated local config, migration
  `20260929143136_foundation_samples.sql`, two synthetic fixtures and20 pgTAP assertions.
  No authentication, email delivery, storage or operational domains enabled locally.
- Environment example without secrets, loopback dev/start commands, README, frozen-install
  application/database CI with pinned actions. No hosted CI execution or deployment.
- Original AGENTS.md, consolidated context and all source files hash-checked against the
  Downloads handoff:13 files unchanged. Original source checksums remain historical; changed
  working documentation naturally differs from the handoff's SHA256SUMS.txt.

### Commands and observed evidence

All final application checks used Node24.21.0/pnpm11.19.0 on Windows, synthetic/no data,
and no environment credentials. In PowerShell, `. ./scripts/use-local-node.ps1` selects
the local runtime and fixes inherited PATH/Path casing for pnpm command resolution.

| Command / check | Result | Evidence / limitation |
|---|---|---|
| Runtime/package inspection; official docs/npm metadata; installed CLI `--help` | PASS | Versions pinned in package.json; compatibility choices in ENG-001. |
| `pnpm install --frozen-lockfile` | PASS | Fresh node_modules installation completed; exact lockfile accepted. |
| `pnpm install --frozen-lockfile --offline` | PASS | Final repeat on existing cache completed without changes. |
| `pnpm check` | PASS | Final lint with zero warnings, route type generation, tsc,41 unit cases, production build. |
| `pnpm test:e2e` with project browser path | PASS | Final28 cases,7.6s, exit0; production test server stopped automatically. |
| `pnpm audit --prod` | PASS | No known runtime dependency vulnerabilities reported by registry at execution. Not a security certification. |
| `pnpm dev` and in-app browser | PASS | Loopback3000, English/Arabic render; browser console inspection found no errors/warnings. |
| Visual inspection of6 production screenshots | PASS | Both languages at desktop1280, tablet791 and mobile393; no overflow after fix. |
| Supabase CLI help/init/migration generation | PASS | CLI2.118.0 generated config and migration name; no DB connection required. |
| Supabase startup | BLOCKED | `DockerLifecycleInspectError: docker: command not found (podman also not found)`. |
| Database reset/migration execution,20 policy assertions, lint/advisors, query, generated types | BLOCKED | Docker-compatible runtime missing. Hand-maintained fixture types not yet compared against DB. |
| Hosted CI/staging, Firefox/WebKit/real phones, full accessibility/load/recovery, runtime exception recovery | NOT TESTED | Outside observed local evidence; no remote configured or production target available. |

Browser evidence: ignored `playwright-report/index.html`, `test-results/.last-run.json`
and screenshots. The browser suite covers locale switching, keyboard skip, RTL, no forms,
reduced motion, unknown-route404, no-index headers, all15 workflow denials, method bypass,
spoofed role claims and concurrent/repeated denials. These are not capacity-allocation or
payment-concurrency tests: those workflows do not exist in M1.

Resolved setup/check failures: sandbox registry socket denial required approved network
execution; pnpm required explicit native resolver build permission; package-manager global
virtual-store defaults differed across contexts and are now explicitly disabled; Windows
PATH casing hid pnpm shims and is normalized only in the helper's process. Initial TypeScript
locale narrowing and one lint warning were corrected. A tablet overflow found visually was
fixed and added to coverage. Playwright now launches Next directly for reliable teardown;
final Windows run used approved execution so test-owned processes could be cleaned up.
Next's automatic AGENTS append was removed and disabled, restoring the original bytes.

### Remaining setup / release dependencies

- Technical owner (unassigned): install/start Docker-compatible runtime; run README local
  database commands, inspect API/RLS behavior and regenerate/compare types. No DB PASS claim yet.
- Organizational owner (unassigned): preserve this temporary project in a durable directory,
  establish organizational GitHub access/remote and observe hosted CI. Local automation Git
  identity is not an organizer or release approval.
- Re-evaluate ESLint9 compatibility/EOL before public release; current React/import plugins
  do not advertise ESLint10 support. No unsupported peer override was applied.
- CFG-09/10/11/12 ownership, privacy, regions, production services, final brand/content and
  public-launch evidence remain pending. All operational gates stay false, including CMS,
  advisory assessment, registration, payments and scientific/competition/event workflows.
- No real email, payment, cloud provisioning or DNS work was performed. There is no public
  launch approval and this synthetic foundation is not production-ready.

Next smallest task: F07 / M2 shared design primitives and bilingual component review.

## 29 September 2026 — M2 design system and focused M3 homepage

Requested outcome: a cinematic bilingual homepage preview and shared accessible UI
foundations. Continued the actual clean local M1 repository at `0d2f728`, preserving the
handoff and closed operational boundaries. Decision: ENG-002. Feature notes:
[design system](features/design-system.md). No remote or production service was added.

Source IDs: SCP-02, DSN-01/02, LOC-01/02/03, ACC-01, CMS-04, MED-01 through MED-04,
CFG-12; existing INF/SEC/REL foundation constraints remain in force.

### Implemented and inspected

- Working five-color tokens, locally served DM Sans/Inter/Noto Sans Arabic, semantic
  states, responsive containers/type, header/mobile navigation/footer/language switch,
  buttons/links, section headings and accessible field/status conventions.
- Focus, disabled, busy/loading, hover, press, error-summary/field validation and success
  states in the local/staging showcase. Only predefined synthetic choices are retained
  across language switches; scientific sample text remains English/LTR in Arabic.
- Homepage hero, conference introduction, four participation pathways, explicitly
  illustrative program rows, previous-edition context and full typed public sitemap.
  Empty sponsor/gallery sections are omitted. Dates/venue remain unconfirmed; no names,
  old sponsor logos, proposed dates, countdown, prices or capacities became public claims.
- Original abstract poster. No conference footage or final marks were available/cleared.
  Separate synthetic motion fixture exercises muted inline playback, pause/resume,
  reduced-motion/save-data/slow-network/hidden-tab rules and poster-on-error behavior.
- Server-only dynamic showcase gate, disabled by default in a production build and always
  disabled for Vercel production. All 15 operational gates remain closed, including CMS.
- Existing application CI automatically includes the new tests. No database/schema changes.

### Commands and observed results

All checks used Node 24.21.0 / pnpm 11.19.0 and local synthetic content, without credentials.

| Command / check | Result | Observed evidence / limit |
|---|---|---|
| Official font/media/test docs, registry metadata and local CLI help | PASS | Next local font API, pinned Fontsource packages 5.3.0, axe-core/playwright 4.13.0; font OFL notices retained. |
| Exact dependency installation; `pnpm install --frozen-lockfile --offline` | PASS | Updated lockfile accepted; final repeat completed with no changes. |
| `pnpm check` | PASS | Final ESLint zero warnings, route types/tsc, 69 unit cases and optimized production build. |
| `pnpm test:e2e` with local browser path | PASS | Final 45/45 Chromium cases, 27.1 seconds, exit 0; test-owned production server stopped. |
| Bilingual responsive/keyboard/RTL checks | PASS | Home at 1280, 791 and 412 CSS px; additional 320px checks. Menu Escape/refocus, skip link, native anchors, query/hash and synthetic choice preservation. |
| Text enlargement and overflow | PASS | 200% root text at desktop/tablet/mobile; heading clipping checks; narrow-phone legacy graphic bounds. |
| Eight axe WCAG 2.2 AA rule scans | PASS with scope limit | EN/AR homepage/showcase at desktop/mobile: zero violations. Gradient media text and decorative glyphs have manual-review records; this is not a full accessibility certification. |
| Contrast and visual review | PASS for current preview | Text combinations measured by axe include neutral 4.90:1, ink/gold 7.05:1, purple/ivory 12.20:1 and muted/ivory 5.93:1. Original poster/screenshots visually reviewed; focus ring corrected on dark showcase surface. |
| Media controls/failure/preferences | PASS | Synthetic video actually plays, pauses/resumes, and falls back after aborted fetch. Reduced-motion/data-saving modes request no video. Homepage requests no video or third-party fonts/embeds. |
| Actual production showcase denial | PASS | Local production server: EN/AR showcase HTTP404 without flag; EN/AR HTTP404 even with true flag when VERCEL_ENV=production. Owned test process stopped. |
| No-operation regression | PASS | Existing direct/method/spoofed-role/repeated/concurrent denials remain covered; demo form creates no POST or participant record. |
| Dev server / in-app preview | PASS | Loopback port 3000 renders current homepage; server restarted after dependency reinstallation. |
| Hosted CI/staging; Firefox/WebKit/real phones; screen readers; full WCAG audit | NOT TESTED | No hosted target/remote; local Chromium evidence only. Final human Arabic editorial review remains pending. |
| Real-footage frame contrast, crop, codecs and bandwidth measurements | NOT TESTED | No cleared final footage/poster exists. Synthetic fixture is not production media validation. |
| Local database execution | BLOCKED (unchanged from M1) | Docker/Podman unavailable; no DB changes in this task. |

Evidence: ignored `deliverables/m2-preview` contains named EN/AR desktop/tablet/mobile
full-page and entrance screenshots, 320px entrances, component screenshots, eight detailed
axe reports and `accessibility-summary.json`. `playwright-report/index.html` has the test
report. Tests regenerate artifacts; screenshots are not approval of final content.

Resolved findings: initial browser run passed 37/45. Four checks needed a form-scoped alert
selector because Next also provides a route announcer. Real enlarged-text header overflow
was fixed with wrapping; heading wrapping and narrow legacy artwork were checked. A gold
button's contrast was caught during the entrance fade, so text now remains fully opaque
during the 400ms/12px rise. The dark showcase focus ring now uses ivory. Final rerun passed.
The package-store mismatch was repaired with a local store and non-optimistic install checks.

### Remaining inputs and next task

CFG-12 still needs final MSRC/KAU marks, brand/typography approval, approved EN/AR copy,
hero/poster rights and selection, accurate past-edition captions/assets, approved program,
speaker/committee/sponsor content and legal/contact text. Exact delivery fields and asset
slots are in [MEDIA_REGISTER.md](MEDIA_REGISTER.md) and [design-system notes](features/design-system.md).
No public launch, real email, payment, production provisioning, DNS change or operational
opening occurred. The working folder remains a temporary Codex copy; preserve the archive
in a durable project location. Next smallest task: the approved bilingual About page slice.

## 29 September 2026 — M2 review and bilingual About page

Requested outcome: review the completed M2/homepage changes and continue with the bilingual
About page. Starting evidence: clean local `main` at `8f6d020`; foundation parent `0d2f728`.
Decision ENG-003; [review record](reviews/m2-homepage.md) and [About contract](features/about.md).

### Review result and scope

No actionable defects were found in the inspected M2 change. Source/content boundaries,
bilingual navigation, shared accessibility states, preview gating, media behavior and closed
operational routes were reviewed. Focused design-contract/media unit execution passed
28/28 cases. This review did not execute a database or certify unimplemented payment,
capacity, review-anonymity or data-retention workflows.

A meaningful browser coverage gap was closed: explicit user pause now gets tested across
reduced-motion on/off changes before resuming. This is a coverage improvement, not a claim
that a reproduced M2 bug was fixed. An independent inspection of the new About/navigation
slice also found no actionable defect; browser evidence is recorded separately below.

### Implemented slice

- `/en/about` and `/ar/about` provide localized metadata, semantic breadcrumbs, identity,
  purpose, intended community and working links to the homepage participation/program overview.
- Complete typed English/Arabic copy is adapted from source context in CONFERENCE_BACKGROUND
  (S3 pp1,4,13,17,33,37). A visible draft notice retains CFG-12. Audience context explicitly
  does not define eligibility; host institution does not establish an approved venue.
- Header/mobile/footer About links now reach the standalone page. The homepage introduction
  has a contextual About link. Current-page indication and current-page mobile menu focus
  are supported; language switching preserves the route, query and section.
- Reused M2 tokens and components; no new media, dependency, database/storage read, personal
  input, mutation, authentication, email, audit transition, operational state or durable job.
  All 15 operational guards and all unset business values remain unchanged.

Source IDs: SCP-01/02, LOC-01/02/03, CMS-04, DSN-01/02, ACC-01, CFG-12, REL-01.
Original AGENTS/source snapshots remain unchanged; no organizer decision was superseded.

### Executed verification

Node 24.21.0 and pnpm 11.19.0 were confirmed again. Dependencies and lockfile were unchanged.

| Command / check | Result | Evidence / limitation |
|---|---|---|
| M2 focused review unit command | PASS | 28/28 media-policy and design-contract tests, exit 0. |
| Scoped About ESLint | PASS | New content/page checked with zero warnings. |
| `pnpm check` | PASS | ESLint, Next route types/tsc, all 69 unit cases, optimized build; both About locales prerendered. |
| Scoped ESLint after final test adjustments | PASS | Updated About, media/navigation browser tests and content contract; zero warnings. |
| `pnpm test:e2e` | PASS | Final 60/60 Chromium cases, 38.5 seconds, exit 0; owned production test server stopped. |
| About browsing/navigation/content | PASS | Six language/viewport combinations; real 200 routes and /fr/about HTTP404, header/footer/breadcrumb/homepage CTAs, menu focus, locale/query/hash continuity, no operational form or POST. |
| Responsive and accessibility | PASS with scope limit | About at 1280/791/412 CSS px, extra 320px checks, 200% text and glyph bounds, keyboard/skip/focus, RTL and reduced motion. Six About axe scans plus eight retained M2 scans: zero violations. Manual/real-device audit still required. |
| Screenshot inspection | PASS | EN/AR About desktop/tablet/mobile and narrow entrances; current homepage with About link. No clipping, overlap or RTL issue found. About axe reports have no incomplete items; M2 reports retain their documented contrast-review caveats. |
| Media pause persistence and prior regressions | PASS | User pause survives reduced-motion toggle before explicit resume; previous media failure and workflow-denial regressions retained. |
| Live dev preview | PASS | In-app About route on loopback3000 renders; inspected console had no errors/warnings. |
| Database, hosted CI/deployment, real-device/Firefox/WebKit, screen reader/full WCAG audit | NOT TESTED in this task | No data changes. Prior DB execution remains BLOCKED by missing Docker/Podman; no remote deployment or broader audit performed. |

Initial browser run: 54/60 passed; six new navigation assertions expected a slash before the
homepage fragment although Next normalized the rendered href. Selectors were corrected to
the actual destination and still verify the resulting URL/visible target. No product behavior
was weakened. Final full rerun passed. Screenshot/accessibility evidence is saved in ignored
`deliverables/m3-about`; the complete browser report remains in `playwright-report`.

### Release state and remaining work

This remains a local unindexed draft. Final bilingual editorial review, institutional/organizer
naming approval, branding/media and all REL-01 public launch requirements remain open.
No production service, DNS, real email/payment, CMS or participation opening occurred.
The next bounded task is approved homepage/About copy refinement, followed by a Dates and
Venue content slice once its inputs are provided. Docker execution and durable organizational
repository ownership remain independent setup needs. Preserve the latest project archive
outside this temporary workspace for continuity.

## Session handover template

```markdown
### Date / task / branch or revision
Requested outcome:
Source requirement IDs:
Completed change:
Files and migrations:
Commands run and observed results:
Visual checks / preview:
Checks not run and why:
Decisions made or changed, with authority:
Outstanding blockers and owner:
Feature flags / configuration changes:
Release status and evidence:
Next smallest task:
```

## Evidence status vocabulary

- PASS: actual check performed with recorded evidence.
- FAIL: actual check found a defect.
- BLOCKED: named dependency prevents performing the check or opening the flow.
- NOT TESTED: no execution evidence yet.
- PROPOSED: design/engineering choice awaiting adoption or approval.
- SELECTED: organizer chose the approach; implementation/authorization still separately evidenced.

## Change log

- v1.0, 29 September 2026: consolidated current sources, added durable Codex instructions, corrected CMS identity sequencing, retained unresolved source conflicts, and prepared staged development prompts. No live application or infrastructure changes.

## 4 October 2026 — Closed BL-AUTH-02/03/04/06 participant/08 shell

The prerequisite staff CI fixes are separate [PR37](https://github.com/xpexellent-dotcom/msrc-2027/pull/37):
180 focused browser repetitions, full 81-case staff suite and five cold concurrent
73-case database runs passed without assertion removal, retries or longer timeouts.
Fresh participant preflight fetched main `bc2fb87`; open PR37 is staff CI/fixture work,
and PR38 only appends the shared PROGRESS log. Neither overlaps this implementation.
Created isolated `codex/participant-accounts` from that main; preserved caller work.

Implemented six EN/AR routes, transient value-preserving RTL forms, server-only
default-off flag and own account/name/closed-registration shell. Private reviewed
migration adds admission, notice receipts, HMAC single-use verification/reset codes,
expiry/replacement/failure/IP/account/global limits, transaction-bound native credential
operations and own admitted-session reads. Supabase manages passwords; native email
tokens and participant MFA cannot bypass the app protocol. Existing 72-hour session
policy, stronger roles and closed operational gates remain enforced. English branded
Resend templates and an unapplied custom SMTP/activation plan are included.

The current Privacy notice is still a draft: the approved registry stays null, so no
real signup can run even if the server flag is set. Database defaults are false/null/
null. No hosted migrations/settings, deployment, real user or communication occurred.

- PASS: locked install (Node24.21.0/pnpm11.19.0), final `pnpm check`: lint, typecheck,
  1,809 unit tests/42 files and 65-page production build. API review added regressions
  for retained-name recovery, thrown logout and timing-safe acknowledgement.
- PASS: final 36/36 flag-on synthetic presentation cases across EN/AR desktop/tablet/mobile,
  26/26 default-off raw route/API cases, keyboard/focus, 200% text and 18 axe scans with
  zero violations. No retries. Production default-off routes have no collection forms.
  A held sign-in/logout locale-switch regression first failed, then passed after the
  status effect refresh/abort fix; final build, scoped lint and TypeScript also PASS.
- PASS: disposable CI [37220100344](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37220100344)
  at `b8d1ddc`: reset, database lint, pgTAP, security advisors, 18/18 genuine native Auth
  cases and both browser jobs. The first native run found Admin insertion before metadata;
  the private reservation now binds the exact actor/email at INSERT, with staged SQL coverage.
- PASS: [37220910478](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37220910478)
  at `a554565`: both participant jobs, all 637 pgTAP assertions/8 files and 19/19 genuine
  native cases, including real handler→SDK→Data API signup/verify/login/reset/old-session
  denial. Only delivery is captured in memory. The response precedes account-dependent/
  provider work via bounded Next `after`, with flag rechecks and no retries.
  Code `fe5e39b` repeats the same native proof plus all 36 enabled/26 closed
  browser cases in [37221915493](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37221915493).
- PASS: final provider validation `6e19ca6` rejects passwords above the pinned Auth
  72-byte UTF-8 limit before signup or code consumption. All four ASCII/Arabic regressions
  first failed, then passed; final `pnpm check` passed all 1,809 tests. Disposable native
  job in [37224383368](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37224383368)
  passed 637 pgTAP assertions and 19 native cases, including a real handler reset using
  exactly 72 password bytes. Both participant CI jobs passed, repeating all 36 enabled/
  26 closed browser cases and 18 axe scans. This final change adds validation without
  changing UI flows. Subsequent documentation only clarifies policy/env matching and
  appends these evidence receipts.
- General CI [37220910506](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37220910506)
  FAIL: inherited `managed-staff-cookie` fixture `40P01` at main's old setup. PR37 fixes
  that independently and must land before the accounts PR's general database job can
  reliably pass. Participant-specific native/browser jobs are independent and pass.
  PASS combined validation [37221956183](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37221956183)
  at `4d96b2b`: exact participant code `fe5e39b` plus PR37 `68ee9fb`; 1,805 unit tests,
  401 public browser passes/23 intentional skips, 81 staff browser passes, 44 Contact
  passes, 637 pgTAP assertions and all 73 concurrent integration cases. Both CI jobs
  passed. This PR does not duplicate staff code or change the staff CI workflow.
  Local database execution remains BLOCKED
  by unavailable Docker and the disposable Linux/GitHub-only guard; skips are not evidence.
- Activation requires approved Privacy wording/version, five reviewed pending auth/
  participant migrations, native Auth/provider guards/settings, private Production
  environment, actual shared Resend quota/forecast approval and human inbox/recovery
  UAT. Exact steps, limits and rollback: [participant guide](features/PARTICIPANT_ACCOUNTS.md).

Draft [PR39](https://github.com/xpexellent-dotcom/msrc-2027/pull/39). Main was rechecked
at finish and remains `bc2fb87`. Appended shared records at file ends to avoid future
log conflicts with PR37/38. Next: land PR37, refresh the accounts base and review this
closed draft; activation remains separately gated. No hosted changes or real delivery.

## 5 October 2026 — PR39 password review and merged-main rebase

Organizer review raises the participant password minimum to ten Unicode characters
for sign-up, verification and reset; sign-in retains compatibility with shorter
existing passwords. The 72-byte UTF-8 maximum stays enforced. Short-password rejection
precedes native creation, form claims and code consumption. EN/AR hints and field
errors state the requirement, including on verification.

- PASS: all 59 participant unit cases, including nine-character ASCII/Arabic/emoji
  rejection, ten-character acceptance, existing shorter sign-in and the retained
  72-byte boundary. Nine short-password regressions first failed against the old rule
  and passed after the change.
- PASS: `pnpm check` after the review change: lint, TypeScript, 1,825 unit tests in
  42 files and the 65-page production build. EN/AR browser coverage is expanded to
  54 cases, preserving the existing 26 closed-route cases and axe checks.
- Native handler tests cover reuse of the same valid code after a rejected short
  password, exact ten-character acceptance, legacy shorter sign-in and the unchanged
  72-byte reset boundary. Execution uses disposable CI; local Docker remains unavailable.
- PR37 and PR38 are merged. The branch is rebased onto freshly fetched main `f106634`; their
  staff fixture/focus fixes and shared logs are retained. Final branch/head, full
  application/database CI and participant native/browser receipts are recorded in
  [PR39](https://github.com/xpexellent-dotcom/msrc-2027/pull/39).

This review does not change migration SQL, hosted Auth settings, Privacy approval,
the closed flag or operational readiness. Real users, inbox delivery and activation
remain unperformed. The activation guide records the future native minimum setting.

## 7 October 2026 — Closed staff portal foundation

Assigned scope: BL-AUTH-01, BL-AUTH-05/06 staff parts and BL-RPT-01/03 foundations;
AUTH-04/05, ROL-01/07/10/12, ADM-01/02/04/05, LOC-01/03, SEC-01/02/06.
Open PRs were listed before branch creation: **none**. #25 and #39 are merged into
the fetched `main`, while their hosted migrations remain pending per the organizer.
Shared logs were not counted as feature overlap. Started `codex/staff-portal-foundation`
from `origin/main` `d9215d0` in a new managed worktree. Original checkout modifications
and untracked evidence were preserved.

ORG-043/044/045 record the two-person Super Admin designation, invite-only access,
mutual recovery, closed staff boundary and future registration identifier masking.
Names are recorded only in DECISIONS; fixtures remain synthetic. Added EN/AR private
staff sign-in, TOTP QR/manual enrollment, session-bound staff email checks, roles-based
home/menu, Super Admin people/invitations/audit, and the minimal internal participant
account search. No public navigation links, indexing, analytics or exports. The
new private database policy defaults off; operational flags remain false. Native
identity admission is compatible with #25/#39 rather than weakening their guards.

The additive migration includes explicit private ACLs/forced RLS, immutable audit,
single-use 72-hour invitation admission, session revocation, serialized minimum-two
and self-action guards, and audited other-admin recovery. The registration identity
field is not added: the reusable masking/reveal component and server/database policy
are prepared, and actual reveal returns audited unavailable until registration is
built. Bootstrap is an inert operator script/procedure and has **not been run**.
[Staff activation guide](features/STAFF_PORTAL.md) lists exact pending migration
order, Production variables, bootstrap sequence, shared Resend volume, UAT and rollback.

Initial combined local checks on Node 24.21.0 / pnpm 11.19.0:

- PASS: `pnpm install --frozen-lockfile`; repository lockfile unchanged.
- PASS: `pnpm check`: lint, generated route types/TypeScript, 2,136 unit tests in
  48 files, and production build (77 generated pages).
- PASS: `git diff --check` at this checkpoint.
- BLOCKED locally: `docker info --format '{{.ServerVersion}}'` cannot connect to
  the Docker daemon. Database pgTAP, migration lint and genuine native tests are
  routed to disposable Linux CI; they are not marked passed by local skips.
- NOT TESTED at this checkpoint: final EN/AR browser/axe and exact-head CI;
  final receipts are appended below after execution.
- NOT TESTED: live bootstrap, human inbox/device/recovery/screen-reader UAT,
  real identifier storage/reveal, hosted migration application and activation.

No hosted migrations, production settings, real accounts, real invitations/email,
DNS, paid resources or operational activation were changed. Next task is review
of the closed draft and its exact-head evidence, followed by separately authorized
activation only after the documented gates pass.

### Staff draft and final local presentation receipts

Draft [PR43](https://github.com/xpexellent-dotcom/msrc-2027/pull/43) is open and
attached to this task. GitHub's connector denied PR creation (403); the existing
authenticated Git connection successfully created the requested draft. No new
account permission or production setting was changed.

- PASS: rebuilt combined `pnpm check`: lint/types, 2,145 unit cases in 49 files
  and the same 77-page build. Subsequent focused backend checks pass 68 cases.
- PASS: all 28 default-off EN/AR desktop/mobile raw page/API/navigation checks.
- PASS: `pnpm exec playwright test --config playwright.staff.config.ts`, all
  14 EN/AR desktop/mobile synthetic presentation flows, no retries, with axe
  scans reporting zero violations. Sign-in/invalid-code recovery, participant
  search, role-only menus, People controls, explicit masking/reveal interaction,
  audit search, invitation-fragment privacy and QR/manual setup are covered.
- PASS: 16 synthetic screenshots captured; English desktop People and Arabic
  mobile People were visually inspected. Native scroll and table regions remain
  usable; the staff shell suppresses public navigation and the inherited header gap.
- Initial browser failures were test locator assumptions (required markers,
  row headings, Next's separate route announcer) and a missing wait for the actual
  audit-search request. Assertions were corrected to the actual semantic elements
  and awaited request completion; no retries or timeout extensions were added.
- Review found and fixed background GETs renewing idle activity, native password-only
  replacement-authenticator enrollment, interrupted setup cleanup and recovery
  confirmation-time compatibility. Regression coverage retains the original
  native session/grant/factor invariants.
- Prepared: 14 genuine handler→managed Auth→SQL tests, the complete staff-role
  SQL denial matrix, invitation expiry/revocation/replay, and a serialized
  three-to-two concurrent demotion test. Only email delivery is captured in memory.
  Execution on the exact PR head is pending disposable CI; local Docker stays BLOCKED.

Real bootstrap, inbox delivery and human recovery/device UAT remain NOT TESTED;
registration identity collection/storage/reveal and exports remain future work.

### Staff parity, narrow layout and first database execution

- PASS: final combined `pnpm check` before this receipt: lint, TypeScript,
  2,190 unit cases in 50 files and production build (77 generated pages).
- PASS: final staff browser suite: 16 executed cases, two intentional desktop
  skips for the mobile-only checks, zero retries. Known audit action/result labels
  translate in EN/AR. At 320px, both locales pass native down/up scrolling,
  independently scrolling tables, keyboard invitation, 200% text and axe.
- The new English enlarged-text test found a real intrinsic-width overflow in
  the role picker. Explicit shrinkable/wrapping label text and a bounded fieldset
  fix the cause; document-width assertions are retained, with no overflow clipping.
- PASS on disposable CI `0226620`: staff browser job in
  [37545935691](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37545935691).
  Database reset applied the complete migration chain successfully, but strict
  lint FAIL found `bootstrap_first`'s parameter-shadowed `ON CONFLICT(actor_id)`.
  Fixed with the explicit `account_access_pkey` constraint. pgTAP/native checks
  were skipped after that failure, and are not treated as passed.
- The corrected SQL, parity and layout revision is being verified on a new exact
  PR head. Hosted migrations/settings and live bootstrap remain untouched.

### Staff native and concurrency checkpoint — 51bb9b0

- PASS: local `pnpm check`: lint, TypeScript, 2,193 unit cases in 51 files and
  the production build (77 generated pages).
- PASS: disposable staff CI [37548456654](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37548456654),
  native job 112558016017: complete migration reset, strict schema lint,
  765 pgTAP assertions in ten files, security advisors (no issues found), and
  all 14 genuine handler → GoTrue v2.197.0 → SQL cases.
- PASS: disposable foundation CI [37548456655](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37548456655),
  database job 112558228705: the same migration/SQL checks and all 74 integration
  cases, including simultaneous three-to-two Super Admin demotions and the
  persisted denial audit. Earlier new fixture UUIDs collided with an existing
  email-check fixture; unique namespaces fix the setup without changing assertions,
  timing, or adding retries.
- PASS: participant native regression job 112558016518 on the same source revision.
- Real GoTrue inserts a user before applying requested email confirmation in
  the same transaction. The new private guards now permit that staged insert
  only for its exact reserved actor/email and transaction; confirmed-email
  completion is still mandatory. Added isolated bootstrap/invitation SQL proofs.
- Final review is adding direct native staff token/change denial and UI recovery
  cases. Those changes require their own final receipts; this checkpoint does
  not claim them passed. Local Docker remains BLOCKED, and live bootstrap,
  hosted migration application, delivery/recovery UAT and activation remain
  NOT TESTED and unperformed.

### Staff final perimeter and UI recovery revision

- PASS: local final lint, route types/TypeScript and 2,196 unit cases in 51 files.
  Production rebuild passes with 77 generated pages.
- PASS: final `pnpm exec playwright test --config playwright.staff.config.ts`:
  24 executed cases, two intentional desktop skips, zero retries. EN/AR desktop
  and mobile now additionally cover invitation acceptance without automatic login,
  immediate private-view clearing during failed logout, no background restoration
  of that private view, and successful logout retry. Exact displayed audit action
  and result labels resolve to existing enum filters; ordinary searches are preserved.
  Existing RTL/keyboard/320px/200%-text/native-scroll/axe assertions remain passing.
- Added: narrow staff native token/change guards and Send Email suppression, with
  direct SQL proofs and two genuine native regressions (16 native cases total).
  Native account creation, TOTP and other-admin recovery retain the previously
  verified private reservation/transaction path. Final disposable CI for this new
  perimeter revision is pending; no result is inferred from the earlier 14-case pass.

### Staff verified implementation — c8f970a

- PASS: final staff workflow [37549201780](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37549201780)
  on `c8f970ad2cf41ef0263b8147e4cb96438a25b3f0`, both jobs successful.
- PASS: native job 112560382432: `pnpm db:reset`, `pnpm db:lint` (no schema
  errors), `pnpm db:test` (775 assertions, ten files), security advisors
  (no issues found), and `pnpm exec vitest run --config vitest.staff.integration.config.ts`
  (16 genuine cases, including direct email/phone/recovery/magic-link/OTP denial).
  Actual isolated GoTrue image: v2.197.0. Optional additional cold passes were
  SKIPPED, not represented as passed. All records and delivery capture are synthetic.
- PASS: browser job 112560382596: 28 default-off cases and the 24 active staff
  browser cases, with two intentional desktop skips, no retries and axe coverage.
- PASS: production client bundle search for `STAFF_PORTAL_ENABLED`,
  `STAFF_AUTH_SECURITY_SECRET`, `STAFF_SUPABASE_SECRET_KEY` and the dummy native
  secret key found no matches in `.next/static`. Final `git diff --check` passes.
- The broader Foundation and Participant workflows are still running at this
  receipt; inspect the draft PR check rollup for their final results. A following
  documentation-only receipt commit changes no implementation or tests.

Draft [PR43](https://github.com/xpexellent-dotcom/msrc-2027/pull/43) remains the
review handoff. Activation requires the documented migration, privacy, quota,
bootstrap and human UAT gates. Live bootstrap, hosted migration application,
production configuration changes and real email remain unperformed.

### PR43 follow-up — persistent recovery denial and mobile table actions

7 October 2026; BL-AUTH-05/06, AUTH-04/05, ROL-10/12, ADM-04/05, LOC-01/03.
PR43 remains draft. The organizer explicitly requires persistent database denial
during pending, failed or interrupted recovery, including committed authenticator
deletion followed by failed password rotation. All release flags stay closed.

The review-only staff migration now stores a durable private recovery hold before
provider work. Session/access contexts, staff admission and email checks, staff
RPCs, and native authenticator enrollment/verification deny while held. Provider
window expiry, fresh password sessions, refresh, reactivation and role edits do
not release it. A failed account reset cannot be downgraded to a factor-only reset.
Completion compares the latest operation under the existing authority/account
locks; stale callbacks and superseded invitation admissions cannot release a newer
hold. Successful full account reset stays held until its exact linked invitation
completes native password setting; fresh authenticator enrollment is still required.
The independently authorized successful factor-only path remains available.

Prepared genuine native coverage deletes the actual verified factor before injecting
only password-provider failure, then checks fresh portal login, raw native sessions,
refresh, enrollment, interruption, expiry and other-admin recovery. Raw native
password identity verification alone grants no session/access context or staff
authority while held. Added direct SQL durability/retry/CAS proofs and an account
lock concurrency regression. Existing historical migrations and provider timeouts,
rate limits and retry settings are preserved.

Mobile testing found the opened role editor exceeded its horizontal table region
in EN and AR. Its width and padding now follow the region width without clipping.
New action coverage exercises role changes and failures/retry, suspend/reactivate,
session revocation, minimum-two denial, other-admin reset/failure/retry, no self-reset,
and invitation resend/revoke, with keyboard/bounds/axe checks at 320px and 200% text.
People rows show a sanitized translated recovery-state badge and refresh after
failed reset. The badge is presentation only; database state enforces denial.

- PASS at this checkpoint: focused backend/projection/diagnostic tests (82 cases),
  scoped lint, TypeScript and `git diff --check`.
- BLOCKED locally: Docker cannot connect to `npipe:////./pipe/docker_engine`.
  Genuine native, pgTAP and database concurrency execution use disposable Linux CI.
- Pending: final combined local/browser checks and the new exact-head CI receipts.
- NOT TESTED/unperformed: hosted migration application, production settings,
  live bootstrap, real email and human recovery/inbox/device UAT.

### Recovery follow-up local verification

- PASS: `pnpm check`: lint, generated route types/TypeScript, 2,207 unit cases
  in 51 files and production build (77 generated pages).
- PASS: final `pnpm exec playwright test --config playwright.staff.config.ts`:
  26 active cases, four intentional desktop skips, zero retries. The new mobile
  action matrix runs in EN/AR at normal and 200% text, with actual field/button
  bounds, keyboard actions, native horizontal/down/up scrolling and axe.
- PASS: twelve new synthetic mobile action/role-choice screenshots captured;
  representative EN/AR enlarged-text role choices and Arabic action controls
  were visually inspected. Narrow row checkboxes/labels now stack for readable
  captions; existing whole-page width assertions remain intact.
- The first mobile matrix run's final scroll assertion assumed the heading was
  visible at document position zero under 200% text. The translated banner/topbar
  legitimately push it lower. The final test scrolls natively to the actual heading
  and retains heading-in-viewport and reverse-scroll assertions; it passes without
  retries or longer timeouts.
- PASS: static normalized-body comparison of four private function overrides
  against #25: unchanged except recovery hold checks. Earlier migration files and
  session policy values/signatures/ACLs remain unchanged.
- Prepared: 17 genuine native cases, including real factor deletion before password
  failure, expiry/interruption, fresh/refreshed denial, pending native TOTP proof
  denial and superseded native invitation admission. SQL and concurrency execution
  on the pushed revision is pending CI; local Docker remains BLOCKED.

### Recovery follow-up first disposable execution — 2dc2626

- PASS: native job 112759705037 in
  [37611545081](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37611545081):
  all 17 genuine native cases, including real factor deletion before password
  failure, durable pending/failed/expired denial, valid native TOTP proof denied
  without AAL2/AMR elevation, queued superseded admission denied, and other-admin
  restoration. Actual GoTrue v2.197.0; strict migration lint clean, 818 SQL
  assertions in eleven files pass, and security advisors report no issues.
- FAIL: browser job on that source: 28 closed checks pass; 25 enabled cases pass,
  four intentional desktop skips, one Arabic desktop invitation case scans axe
  before the replacement page's streamed document title commits. Wait for the
  actual home screen and final title before axe; retain the document-title rule,
  zero retries and existing timeout. Both new mobile action matrices pass in CI.
- FAIL: Foundation integration job 112759705105: 74 of 75 cases pass. Its new
  recovery test combines dependent mutation calls and a profile assertion in one
  SQL expression, allowing the subquery to observe the earlier statement snapshot.
  The pgTAP sequential transition proofs pass. Separate the dependent statements
  and retain every state/CAS assertion; do not alter production enforcement,
  concurrency timing, retries or timeout.
- The two test synchronization corrections require a new exact-revision CI run.
  No hosted settings/migrations, live bootstrap or real email have been performed.

### Recovery follow-up verified implementation — cdc921e

- PASS: [Staff CI 37612823110](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37612823110)
  on `cdc921e5fcbe4ff3cb9ec04041f20a0368a8397c`, both jobs successful.
  Native job 112763949912 verifies all 17 genuine cases on GoTrue v2.197.0:
  committed factor deletion/password failure, pending/failed/interrupted/expired
  holds, fresh and refreshed authorization/enrollment denial, valid pre-existing
  factor proof denied without AAL2/AMR elevation, stale queued native admission,
  and successful other-admin recovery. Strict lint is clean; 818 SQL assertions
  in eleven files pass; security advisors report no issues.
- PASS: staff browser job 112763949518: 28 default-off cases and 26 enabled
  cases, four intentional desktop skips, zero retries. Both mobile action matrices
  pass at normal/200% text with EN/AR, keyboard, bounded controls, native scrolling
  and axe. The final-home/document-title synchronization correction passes.
- PASS: [Foundation database job 112764505594](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37612823115/job/112764505594):
  migration reset, strict lint, the same 818 SQL assertions, clean advisors and all
  75 integration cases across eight files. Both concurrent staff-authority cases
  pass. The sequential retry/CAS correction passes without changing enforcement,
  assertions, timing or retry settings. Optional five cold fixture repetitions
  were SKIPPED by this workflow condition, not represented as passed.
- PASS: local combined lint/types/2,207-unit/build checks and final 26-case staff
  presentation suite recorded above. Local database execution remains BLOCKED.
- Broader application and Participant regressions are still running at this dated
  receipt; the draft PR check rollup records their final results. This following
  commit changes only these receipts; implementation and tests are unchanged.

PR43 remains draft for review. Release flags are closed; hosted migrations,
production settings, live bootstrap and real email remain untouched. Human inbox,
device and mutual-recovery UAT remain separate activation gates.
