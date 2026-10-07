# Restricted staff Production setup — execution record

**Latest checkpoint, 8 October:** the original six setup migrations and first
account remain completed. The organizer clarified the private password mismatch
as a request for normal account rotation. Additional migration
`20261007195540_staff_password_change.sql` is committed and verified, bringing
history to nine original versions. Its first release stopped at the pending-build
readiness check and was closed database-first; the closed serving deployment and
fresh live boundaries passed. Existing restricted staff sign-in remains enabled;
the requested account password is unchanged. Current results and rollback are in
[the separate owner-change execution record](STAFF_PASSWORD_RELEASE_EXECUTION.md).
The checkpoint below preserves the earlier setup history.**

**7 October 2026 checkpoint: all six migrations COMMITTED AND VERIFIED; history
contains eight original versions. Staff-only settings and exactly one first-admin
bootstrap are COMPLETED AND VERIFIED; bootstrap occurred with both staff gates
closed. After the reported input failures, verified closure and a successful
direct native credential test, reviewed restricted resumption is now READY and
its live boundaries have PASSED. Both staff gates are true for the existing single
admin with pairing false. The person reports completed sign-in/own-device
authenticator enrollment; independent read-only native verification PASSED at
18:58:37.866 UTC with one verified TOTP factor and one bound AAL2 staff session.
Signed-home DOM was not observed through the controlled browser inventory.
The subsequently updated private credential does not match the account;
credential-dependent operator steps are STOPPED pending private reconciliation.
Participant and other operational gates remain closed.**

Scope: BL-AUTH-01/05/06, BL-RPT-01/03, ROL-10/12, AUTH-04/05, SEC-01/02/06,
INF-02/03, CFG-10/11 and REL-06. The persistent execution authority is
[ORG-046](../DECISIONS.md#org-046--authorized-restricted-first-admin-production-setup-7-october-2026).
It supersedes the earlier preparation-only restrictions for this specific setup;
it does not require another approval between successful authorized stages.
Stop on failed checks, drift, missing private inputs, unapproved costs or unresolved
policy decisions. Designated identities remain only in
[ORG-043](../DECISIONS.md#org-043--two-distinct-super-admins-7-october-2026).

Only the designated first Super Admin may be bootstrapped from private inputs.
No second account or invitation is authorized without its actual supplied inputs.
Restricted first-account onboarding preserves the minimum-two, no-self-demotion,
no-self-suspension and other-Super-Admin recovery safeguards. Participant accounts,
registration, finance, review, check-in, content, exports and all other operational
workflows remain closed. This record contains no private paths, credentials,
identity values, authenticator seeds, codes, cookies or raw provider diagnostics.

## Revisions and target

| Item | Recorded state |
| --- | --- |
| Reviewed operator/source revision | `06443f59532a011d4414d3360c413053e32463ae` on `codex/staff-production-setup` |
| Production application revision at this checkpoint | Merged `main` `bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`; distinct from the reviewed operator revision |
| Historical restricted Production deployment | `dpl_F2261YzD9AnzeoH3syXL9vANggtC`, verified READY at 18:06:31.656 UTC with the exact application SHA and source/org/repository/project/owner-team binding; apex and www aliases verified |
| Historical failure closure | Native `msrc_staff.policy.enabled=false` verified first; Production `STAFF_PORTAL_ENABLED=false` verified second. False-flag deployment `dpl_84xySREwUbFjn3HdN7jojavpuqfe` READY at 18:22:06.082 UTC, exact application SHA/owner/project/apex/www verified; fresh live closure 19/19 PASS at 18:24:29.004 UTC. |
| Current restricted resumption | `dpl_3fLCso6cBALW2RiCQdKBJXZyfhSP` READY/current serving Production at 18:45:50.502 UTC, exact application SHA/project/org/repository/owner/apex/www verified. Restricted staff gates true; participant/generic readiness false; first-admin manual completion reported and independently native-verified. |
| Review | [Draft PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45); not a claim that its application revision is deployed |
| Database target | The designated Supabase Production project in ORG-017; target/native identity independently verified by the operator |
| Previously applied files | `20261002173712_persisted_authorization.sql` and `20261004114603_contact_abuse_counters.sql`; both SKIPPED for this sequence, preserved without reapplication |
| Source identity | The six exact files below are unchanged from merged `main`; hashes identify reviewed bytes, not an alternative execution authorization |
| Synthetic fixture | Excluded from hosted execution; no synthetic seed/history entry applied |

## Sanitized prerequisite receipts

| Prerequisite | Observed result and limit |
| --- | --- |
| Backup and restore | **PASS:** protected full logical archive and password-free roles; restored to an isolated matching Supabase PostgreSQL `17.6.1.171` with native/application catalog and data agreement. Originals and supplemental restore manifest retained privately. See [the actual backup/restore receipt](STAFF_BACKUP_RESTORE.md). This is not managed backup, PITR or a backup of provider settings/credentials. |
| Native operator and transport | **PASS:** approved project/session-pooler target on 5432; actual native `current_user=session_user=postgres`, required rights and BYPASSRLS verified. Frontend certificate/hostname verification uses `verify-full`; the observed pooler-to-database hop is not TLS, so no end-to-end encryption claim is made. |
| Six-stage compatibility | **PASS, offline only:** exact reviewed files applied sequentially to the restored isolated clone with individual postchecks. Policies stayed closed and identities remained empty. This is compatibility evidence, not hosted completion or human Auth UAT. |
| Operator bootstrap code | **PASS:** independent review of exact target binding, native identity guard before each SQL operation, explicit TLS root handling and minimal child environment. Ambient libpq routing/options and unrelated application/bootstrap secrets are excluded. Script remains inert without deliberate execution. See [bootstrap procedure](STAFF_BOOTSTRAP.md). |
| Exact-head CI | **PASS, verified 17:34:59 UTC:** six substantive checks at `06443f5`, plus Vercel deployment status. [Foundation](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37657520910), [staff](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37657521041) and [participant](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37657521102). Vercel success is separate from the Production application revision above. |
| Existing email plan/quota | **PASS, read only:** Free transactional plan, verified sender domain, 0/100 daily and 3/3,000 monthly used at the recorded dashboard checkpoint; ten requests/second team limit and paid overage disabled. Matching staff server/database cap is configured at 36/day alongside unchanged Contact 60/day within the existing quota. First-admin TOTP requires zero transactional emails; no sending occurred. |
| Private inputs | **PASS:** required operator and first-person inputs accepted privately; values remain outside the repository and are not reproduced here. No additional identity is supplied by this record. |

The quota observation is dated evidence, not an unlimited delivery guarantee.
Recheck actual shared usage before any future authorized mail. The organizer's
within-existing-limits authority does not permit paid purchases or bypassing caps.

## Six-file hosted execution ledger

Execute one complete reviewed file at a time, verify its exact stage, reconcile
its committed transaction and record only that original version before proceeding.
Never use blanket push/reset, seeds, automatic directory execution or blind replay.
The following SHA-256 values are for the reviewed file bytes.

| Stage | Exact file | SHA-256 | Hosted result |
| --- | --- | --- | --- |
| 1 — #25 | [20261002193800_staff_mfa_session_foundations.sql](../../supabase/migrations/20261002193800_staff_mfa_session_foundations.sql) | `ca8571443fe0390f25772f3fbd6014ac17e959eb79f70c2067b143ddcabd8108` | **COMMITTED AND VERIFIED** |
| 2 — #25 | [20261002233353_regular_staff_email_check.sql](../../supabase/migrations/20261002233353_regular_staff_email_check.sql) | `a2d4dff16a5f38f1493a346f941bbab1534ae12afdd78dd045494545183e5ffa` | **COMMITTED AND VERIFIED** |
| 3 — #25 | [20261003110812_authenticator_super_admin_policy.sql](../../supabase/migrations/20261003110812_authenticator_super_admin_policy.sql) | `215ad60fe8c0623bf4f268009528a6f9cd532d7a5307e752c6bc6b915bf64683` | **COMMITTED AND VERIFIED** |
| 4 — #25 | [20261003180734_readonly_authentication_context.sql](../../supabase/migrations/20261003180734_readonly_authentication_context.sql) | `66b7143fcdfb5a706fb091d4daf97f15e93969669955cd2d31c742a36b9c214e` | **COMMITTED AND VERIFIED** |
| 5 — #39 | [20261004164034_participant_accounts.sql](../../supabase/migrations/20261004164034_participant_accounts.sql) | `b6c07808801fbe1aeb4fa051a97a3a1a857ef585990bd3d0156ae69117216ebd` | **COMMITTED AND VERIFIED** |
| 6 — #43 | [20261006224926_staff_portal_foundation.sql](../../supabase/migrations/20261006224926_staff_portal_foundation.sql) | `da00ebd1d0b73bf093ce727ef0fe6da51a96e7291d0d3c197c3316a68d1ccade` | **COMMITTED AND VERIFIED** |

### Observed hosted stage verification

The operator reported a genuine commit and verified original-version ledger for
each completed stage. Counts are separate post-commit passes before and after
ledger recording; they are not distinct assertion totals. The 19 closure probes
are fresh read-only live GETs after each stage, not human sign-in or axe UAT.

| Stage | Before ledger | After ledger | History rows after stage | Live closure GETs |
| --- | ---: | ---: | ---: | --- |
| 1 | 675 PASS | 675 PASS | 3 | 19/19 PASS |
| 2 | 940 PASS | 940 PASS | 4 | 19/19 PASS |
| 3 | 940 PASS | 940 PASS | 5 | 19/19 PASS |
| 4 | 995 PASS | 995 PASS | 6 | 19/19 PASS |
| 5 | 1,610 PASS | 1,610 PASS | 7 | 19/19 PASS |
| 6 | 2,338 PASS | 2,338 PASS | 8 | 19/19 PASS |

Each verification pass totals **7,498 completed checks** across the six stages;
both passes total **14,996 completed checks**, not unique assertions. Final catalog,
explicit grants and native/application data checks passed. Exact offline-stage
agreement retains the dated cron-runtime exception; no scheduling/history was
rewritten to force equality.

Final history contains exactly eight original versions: the two preserved baseline
versions and all six stages above. No blanket push, reset, synthetic seed, fixture
history or reapplication of either original file occurred.

| Stage | Completed UTC, 2026-10-07 | Safe receipt label |
| --- | --- | --- |
| 1 | 17:35:06.547 | `production-stage-1-receipt` |
| 2 | 17:37:13.819 | `production-stage-2-receipt` |
| 3 | 17:37:56.931 | `production-stage-3-receipt` |
| 4 | 17:40:16.049 | `production-stage-4-receipt` |
| 5 | 17:41:54.220 | `production-stage-5-receipt` |
| 6 | 17:45:32.098 | `production-stage-6-receipt` |

Labels identify retained operator evidence without exposing private locations,
identity rows or raw diagnostics. All six receipt outcomes are PASS.

### Migration 1 — actual hosted receipt

- **COMMITTED:** the complete reviewed migration-1 file genuinely committed on the
  designated native database connection. This is hosted execution, separate from
  the earlier disposable rehearsal.
- **PASS:** 675 stage assertions after DDL commit and before ledger recording;
  another 675 after ledger recording. These are two verification passes, not
  1,350 distinct assertions. Catalog and native/application data match the exact
  offline stage, with the dated cron-runtime exception recorded separately.
- **PASS, stage-1 checkpoint:** history contained exactly three original versions: persisted
  authorization `20261002173712`, staff session foundation `20261002193800` and
  Contact counters `20261004114603`. Later versions were absent at that checkpoint;
  the current final ledger result is recorded above.
- **PASS:** 19 fresh live read-only GET closure probes; staff, participant and other
  operational workflow access remains closed. These probes are not password/TOTP,
  recovery, inbox, native-reader or axe UAT.
- **PASS:** completed at 17:35:06.547 UTC; safe receipt label
  `production-stage-1-receipt`, with private paths and raw rows excluded.

Migration 1 alone is an intermediate assurance snapshot. Its historical phone/SMS
projection is replaced by later reviewed stages; do not configure phone/SMS or
enable access to satisfy that intermediate shape. Keep both generic
`msrc_sessions.policy` readiness values false. `msrc_staff.policy` was absent until
stage 6 and was installed with `enabled=false`; its later restricted enablement
is recorded below. No substitute gate was created. The
[migration-1 packet](STAFF_MIGRATION_01_PACKET.md) retains its original preparation
context; this dated execution receipt supersedes its NOT EXECUTED checkpoint for
stage 1 only under ORG-046.

### Completed stage receipt checklist

For each stage, record actual UTC time, verified file/hash and native
target, confirmed transaction outcome, stage assertion count/result, matching
catalog/data and explicit dated runtime exceptions, original-version ledger
result, still-closed policies and fresh closure probes. Only an observed success
may replace PENDING. Offline rehearsal counts do not complete a hosted row.

- [x] **COMMITTED AND VERIFIED:** Stage 2 transaction, both 940-assertion passes,
  original-version ledger and 19 closure GETs.
- [x] **COMMITTED AND VERIFIED:** Stage 3 transaction, both 940-assertion passes,
  original-version ledger and 19 closure GETs.
- [x] **COMMITTED AND VERIFIED:** Stage 4 transaction, both 995-assertion passes,
  original-version ledger and 19 closure GETs.
- [x] **COMMITTED AND VERIFIED:** Stage 5 transaction, both 1,610-assertion passes,
  original-version ledger and 19 closure GETs.
- [x] **COMMITTED AND VERIFIED:** Stage 6 transaction, both 2,338-assertion passes,
  original-version ledger and 19 closure GETs.

## Staff-only settings and closed-gate bootstrap

| Operation | Completed UTC, 2026-10-07 | Actual result | Safe receipt label |
| --- | --- | --- | --- |
| Staff-only native Auth settings | 17:48:03.386 | **PASS:** 15 selected fields PATCHed and verified by readback; critical alternative admission/provider/notification flags remained disabled. Final native schema/grants/data checks passed. | `auth-settings-completed` |
| Closed staff Vercel settings | 17:49:08.924 | **PASS, historical checkpoint:** seven Production-only staff variables configured and verified by readback; participant/test flags absent, existing Resend metadata unchanged. Both staff gates were closed. | `vercel-settings-completed` |
| First-admin bootstrap | 17:50:10.218 | **PASS:** exactly one privately identified active Super Admin in the expected edition, with immutable bootstrap audit. At this checkpoint, no other user, invitation, factor or session; pairing false. Performed with both staff gates closed. | `first-admin-bootstrap-completed` |

The seven Production-only variable names are `STAFF_PORTAL_ENABLED`,
`STAFF_AUTH_SECURITY_SECRET`, `STAFF_SUPABASE_URL`,
`STAFF_SUPABASE_PUBLISHABLE_KEY`, `STAFF_SUPABASE_SECRET_KEY`,
`STAFF_EDITION_KEY` and `STAFF_AUTH_EMAIL_DAILY_LIMIT`. Secret/identity values are
excluded. Both staff gates were false during configuration and bootstrap, then
enabled for the initial restricted attempt, verified false after its reported
sign-in failure, then enabled for the reviewed resumption below. Server and
database staff caps match at 36/day.
Existing Contact remains at 60/day. No participant/test flag or existing Resend
value was changed. Deployment evidence is recorded separately from environment
readback.
The linked bootstrap procedure's earlier NOT BEEN RUN checkpoint is historical;
the dated `first-admin-bootstrap-completed` receipt records its actual execution
under ORG-046 without changing its admission/recovery safeguards.

- [x] **COMPLETED AND VERIFIED:** All six hosted stages before staff admission.
- [x] **COMPLETED AND VERIFIED:** Staff-only Auth settings/readback and final native
  guards, with participant/other workflow closure preserved.
- [x] **COMPLETED AND VERIFIED:** Matching positive staff server/database cap and
  expected edition; verified existing quota retained without purchasing a plan.
- [x] **COMPLETED AND VERIFIED:** Only the first designated Super Admin bootstrapped
  and audited while both staff gates were closed.

### Historical restricted deployment and anonymous boundary receipts

| Operation | UTC, 2026-10-07 | Actual state | Safe receipt label |
| --- | --- | --- | --- |
| Restricted first-admin onboarding attempt | 18:05:18.598 | **STARTED:** reviewed native staff gate and Production server flag enabled under ORG-046 for the existing single account; pairing remains false. This is not a password/TOTP pass. | `first-admin-onboarding-attempt` |
| Restricted deployment creation | 18:05:27.667 | **CREATED:** initially BUILDING; previous serving deployment remained closed at this checkpoint. | `first-admin-deployment-created` |
| Restricted deployment readiness | 18:06:31.656 | **PASS — READY:** exact application SHA, source/org/repository/project/owner-team and apex/www aliases verified for the deployment identified above. | `first-admin-deployment-ready` |

Both staff gates were true for this initial restricted attempt; its subsequent
closure and reviewed resumption are recorded below. Exactly the existing first account remains in scope, pairing
remains false and minimum-two/self-protection/recovery controls remain intact.
Participant and all other operational policies/flags stay off. Deployment
readiness and anonymous boundaries do not prove human Auth.

- [x] **HISTORICAL PASS:** Restricted staff gates configured under ORG-046
  and exact Production deployment READY with verified aliases.
- [x] **HISTORICAL PASS:** Anonymous live boundary verification against this serving
  deployment at 18:11:58.682 UTC, safe receipt `first-admin-live-onboarding`:
  two EN/AR server-rendered staff sign-in pages returned 200 with localized
  headings/controls, matching language/direction, noindex and no response cookie;
  anonymous People/Audit/Participants requests returned 403 with exact denied
  responses and no private data. Participant plus 15 operational API GETs passed
  16/16 exact expected closed JSON/503/no-store/no-cookie checks. Both public
  locales contain no staff links and robots retains `Disallow: /*/staff`.
- [x] **HISTORICAL PASS:** Actual browser observation of blank English sign-in inputs ready,
  and Arabic localized heading/RTL/inputs ready. These are presentation/control
  observations, not axe, native-reader, sign-in or authenticator UAT.
- [ ] **HISTORICAL HOLD:** Device-enrollment input was requested asynchronously at
  18:12 UTC, then held during closure. The current input request is recorded in
  the later resumption checkpoint below.
  Only the person may enroll their own authenticator and provide its current code;
  no elapsed time or unanswered prompt is treated as completion.
- [ ] **HISTORICAL PENDING SNAPSHOT:** Before completion, the person needed to enroll their own authenticator from the private QR
  screen and supplies their own current code. Record password/TOTP outcome without
  seed, code, password, session or identity details.
- [ ] **HISTORICAL PENDING SNAPSHOT:** Verify restricted first-admin admission and strongest assurance,
  server/database role checks, revocation and idle/absolute policy. Do not claim
  peer recovery availability, completed pairing or wider acceptance with one admin.

### Historical input failure, verified closure and native credential diagnosis

The person reported that password sign-in failed. At that historical checkpoint,
human browser password sign-in had not passed and authenticator TOTP was NOT TESTED. Sanitized native
diagnosis and credential-input clarification are recorded below; no cause is
assumed from the reported UI failure and no credentials or raw provider
diagnostics are reproduced here.

- **PASS:** the exact original onboarding transaction was proven ended before
  closure. The operator then wrote and verified native
  `msrc_staff.policy.enabled=false` first, followed by Production
  `STAFF_PORTAL_ENABLED=false` and verified readback second.
- **HISTORICAL PASS, 18:22:06.082 UTC:** false-flag deployment
  `dpl_84xySREwUbFjn3HdN7jojavpuqfe` READY at exact application revision
  `bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`, with owner/project and apex/www
  aliases verified. Both staff gates were false at this checkpoint.
- **HISTORICAL PASS, 18:24:29.004 UTC:** fresh live closure 19/19, safe receipt label
  `post-sign-in-failure-live-closure`.
- **HISTORICAL OBSERVATION:** five native Auth log events during 18:11–18:24 UTC all returned
  HTTP 400 `invalid_credentials`; no database, permission or hook errors were
  reported. This is the observed rejection category, not proof of what the person
  entered.
- **HISTORICAL PASS, 18:23:39.170 UTC:** private in-memory bcrypt 5.0.0 comparison proved the
  staff email/password saved at that checkpoint matched the stored account. No values or
  hashes were displayed; the comparison created no Auth session and performed no
  reset. It does not establish successful human password sign-in.
- **CLARIFIED:** the person tried several passwords, including the database
  password. The exact inputs in each failed attempt remain unknown; do not
  attribute every failure to a particular value.
- **PASS, 18:35:46.666 UTC:** one direct native Supabase password attempt using
  the exact saved staff credentials returned HTTP 200. The temporary test session
  was immediately logged out with local scope. Native readback verified zero
  sessions, one user, zero factors/invitations, false pairing, zero recovery
  holds, and both participant and staff access closed. This establishes that the
  saved account credentials work; it is not browser password/TOTP or human-entry
  verification. No credential, response token, session or identity value is shown.
- **NATURAL EXPIRY:** the recorded login rate-limit window expired at
  18:31:30.451242 UTC before this single attempt. No counter was cleared, reset
  or bypassed.
- **PRESERVED:** the single account, original migration/history and immutable
  audits remain. No account/authenticator reset occurred; no extra account or
  invitation was created. Native factors and invitations remain zero, pairing
  remains false and recovery/minimum-two safeguards remain intact.
- **LIMIT:** resumption remains only the authorized first-person onboarding.
  Persistent ORG-046 authority does not permit bypassing checks or treating pending
  human browser/TOTP verification as complete.

### Resumption and pre-enrollment snapshots

| Receipt | UTC, 2026-10-07 | Actual result |
| --- | --- | --- |
| `first-admin-onboarding-resume-1` | 18:44:33.572 | Deliberately reviewed restricted resumption began after diagnosis and natural rate-window expiry. |
| Resumption deployment creation | 18:44:41.732 | Fresh deployment `dpl_3fLCso6cBALW2RiCQdKBJXZyfhSP` created. |
| Resumption deployment readiness | 18:45:50.502 | **PASS:** READY and current serving Production; exact `bbb790f1` application source, project/org/repository/owner and apex/www verified. |
| `first-admin-onboarding-resume-1-live` | 18:46:02.033 | **PASS:** two EN/AR staff sign-in/noindex checks, three anonymous privileged denials, 16 participant/operational closed checks, public navigation without staff links and robots exclusion. |
| Pre-enrollment read-only native baseline | 18:47:06.987 | **HISTORICAL SNAPSHOT PASS:** one user/profile/account/grant and one active Super Admin; factors/sessions/invitations/recovery holds/admissions/participant profiles/staff email challenges/native OTP all zero. Staff cap 36/day and pairing false. |

Both staff gates are currently true only for restricted onboarding of the existing
single admin; participant and generic readiness remain false. The English browser
was refreshed with blank inputs for the private handoff. Human password/TOTP input
was requested at 18:47 UTC and was **PENDING — NOT TESTED at that snapshot**. Neither native
credential diagnosis nor anonymous boundary checks establish a completed human
browser/TOTP flow or paired-admin acceptance.

Independent operator-helper review identified a separate existing ceiling of
20 form events per IP/hour and added a conservative pre-enable guard. Receipt
checks require strict booleans; no counters were reset or bypassed. No application,
migration or other product code changed in this round. The later human report and
independent native completion proof are recorded next.

### Current completion — manual human report and independent native PASS

The person reports completed own-device enrollment and that staff sign-in works.
This is **manual human-reported completion**. At 18:58:37.866 UTC, reviewed
read-only native SQL independently verified the completed flow; it did not create
or enter authenticator material.

| Native evidence | Observed result |
| --- | --- |
| Identity/authority | One user/profile/account/grant and one active individually identified Super Admin. |
| Authenticators | Verified TOTP factors 1; unverified factors 0; other factor types 0. |
| Session/assurance | Native staff sessions 1; native password sessions 1; native-bound TOTP AAL2 sessions 1; live observed strongest-assurance sessions 1. These counts describe the same completed staff flow, not four separate sessions. |
| Native sign-in binding | Current native authentication time matches last sign-in; profile last sign-in recorded, both true. |
| Audited steps | Sign-in allowed 1; TOTP enrollment completed 1; TOTP challenge completed 1; TOTP verification completed 1. |
| Closed scope | Pairing false; staff gate true/cap 36; recovery/invitations/admissions/participant profiles/staff email challenges/native OTP all 0. Participant and generic readiness false. |

- [x] **PASS — manual report:** First-person password sign-in and own-device
  authenticator enrollment/verification completed.
- [x] **PASS — independent read-only native evidence, 18:58:37.866 UTC:** One current
  password-plus-native-TOTP AAL2 staff session, audited completion and recorded sign-in.
- **NOT OBSERVED:** Actual signed-home DOM; the person's staff tab is outside the
  controlled browser inventory. No automated signed-home DOM pass is claimed.
- **NOT COMPLETED:** Other-admin recovery, real inbox, paired-admin/wider staff
  UAT, live axe and Arabic native-reader acceptance. Existing synthetic/CI tests
  remain separate evidence and do not complete these gates.

- **PASS, 19:03:47.271 UTC:** source-reviewed read-only post-completion live receipt
  `first-admin-onboarding-resume-1-after-human-live` on the same serving deployment:
  two EN/AR SSR/noindex checks, three anonymous privileged denials, 16 participant/
  operational closed checks, public navigation without staff links and robots
  exclusion. `strongAssuranceVerifiedByThisProbe=false`: this anonymous probe does
  not establish strongest assurance; that comes from the separate human report
  and read-only native proof at 18:58:37.866 UTC.
- **PASS:** fresh private-input ACL boolean confirms access only for the current
  Windows account; values and private location withheld.
- **STOP, 19:06:15.068 UTC:** independently reviewed read-only bcrypt comparison
  of the newly saved private input confirms the email matches but password does
  not. Values/hashes remain withheld; no Auth session, mutation, reset or email
  was created. Safe receipt: `current-private-account-password-validation`.
  The previous matching receipts remain historical. Completed human/native
  sign-in evidence remains valid. The person subsequently clarified that the new
  private value is an intended account password change. It has NOT BEEN APPLIED.
  Existing native guards deny ordinary owner password updates and permit only
  invitation admission or other-admin recovery. A separate authenticated owner
  change flow is being prepared for review, with fresh password/TOTP proof,
  retained authenticator, audit and session revocation. No self-recovery reset,
  bootstrap replay, new hosted migration, additional account or email resulted.

The [activation checklist](STAFF_ACTIVATION_CHECKLIST.md) and
[staff foundation](STAFF_PORTAL.md) retain the wider release/UAT requirements.
No completed step created a second person, sent an invitation, opened participant
accounts or released any operational module/export.

## Native advisor review

The observed final native security advisor results are **32 INFO 0008** findings
for intentionally private forced-RLS tables without client policies, and
**15 WARN 0029** findings for reviewed authenticated-only guarded
`SECURITY DEFINER` RPCs. These findings remain recorded; they are not claimed to
have disappeared. No RLS policy, table privilege or broader function ACL was
introduced to silence them.

The official Supabase remediation references are
[0008 — RLS enabled without policies](https://github.com/supabase/splinter/blob/main/docs/0008_rls_enabled_no_policy.md)
and [0029 — authenticated execution of a security-definer function](https://github.com/supabase/splinter/blob/main/docs/0029_authenticated_security_definer_function_executable.md).
The former describes direct API denial when policies are absent; that denial is
intentional for these private tables. The latter requires per-function review:
retain only required explicit execution grants and validated, bounded operations.
Here the reviewed RPC bodies enforce current native identity/assurance and
server/database authority. Do not widen access or weaken guards to clear an advisor.

## Stop, closure and reconciliation

1. Stop subsequent stages on any failure or uncertain transaction. Preserve
   private evidence and sanitized SQLSTATE/result metadata. No blind DDL replay,
   reset, history deletion or repair to make a failed check appear successful.
2. For a known ended enabling transaction, **immediately set
   `msrc_staff.policy.enabled=false`** on an activation/security failure. Also set
   the server-only `STAFF_PORTAL_ENABLED=false` and redeploy; verify current/stale
   staff requests deny. If the original enabling transaction's outcome is
   uncertain, first prove that the exact original attempt/backend transaction
   ended, using its private attempt marker, PID, backend start and transaction
   start at full microsecond precision. A missing marker is STOP, not permission
   to guess or replay. Then write and verify persistent native closure; an
   unresolved late original commit must not overwrite it. A deployment that later
   becomes READY cannot override the verified database `enabled=false` gate.
   Before stage 6, leave the absent staff policy absent, retain generic readiness
   false and keep the server flag off. Keep participant/unrelated gates off.
3. Closure does not undo committed DDL or recall an email. Retain every installed
   native guard and email suppression hook, immutable audit/authority/migration
   history, revocation cutoffs, bootstrap/invitation reservations and durable
   recovery holds. Do not weaken minimum-two/self-protection, clear a recovery
   hold or repurpose first-account bootstrap. Preserve independent Contact
   counters, cleanup configuration and legitimate scheduled history.
4. On connection loss or an unknown outcome, reconcile the **original backend's
   transaction** first. A fresh connection, absent object/ledger row or missing
   success message does not prove rollback while the original transaction may
   still be active. Verify its ended commit/rollback outcome and exact committed
   definitions/data/history before choosing any retry or original-version ledger
   reconciliation. See [the migration packet's failure procedure](STAFF_MIGRATION_01_PACKET.md).
5. A later `ROLLBACK` cannot undo a committed migration. Use a reviewed forward
   correction or the [provider-compatible restore/reconciliation plan](STAFF_BACKUP_RESTORE.md),
   with post-backup data and separately held provider settings/credentials
   reconciled. Never blindly restore into managed native schemas/roles or delete
   audit/history. Recheck guards, RLS, explicit grants, mail suppression and closure
   before resuming the existing authorized sequence.

This checkpoint records first-admin manual sign-in/TOTP completion and independent
native proof. It does not complete other-admin recovery, real-inbox, paired-admin,
live axe, Arabic native-reader or operational UAT.
