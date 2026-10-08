# Owner password-change release — authorized resumption

ORG-046/047/048; BL-AUTH-01/05/06, BL-RPT-01/03, SEC-01/02/06.

The organizer authorizes finishing the reviewed release on 8 October 2026. The
[stopped first attempt](STAFF_PASSWORD_RELEASE_EXECUTION.md) remains an immutable
historical checkpoint. Its additional migration is already committed; neither
that migration nor any earlier migration or bootstrap is replayed. This record
will distinguish each observed resumption stage from preparation and human UAT.

**Current checkpoint, 8 October: the new gate-only release is READY and its
anonymous live boundaries passed. The private owner handoff is bound to this
attempt. Human password rotation, new-password/TOTP sign-in and independent
native completion verification remain PENDING; these release checks do not prove
an account-password change or old-session revocation.**

## Reviewed source and private input contract

The application remains merged main
`2f677bedd9e1773508286cc5d8db79780801cc37` from
[PR #46](https://github.com/xpexellent-dotcom/msrc-2027/pull/46).
[PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45) remains draft and
contains the separate operator/setup records. All nine original migration versions
are listed individually in the stopped execution record; this attempt makes no
schema or history change.

The private operator file remains outside Git and restricted to the current
Windows account. Inputs use explicit `FIELD=literal-value` entries. Labels belong
before the equals sign. No plain-line fallback, quote removal, escape expansion,
Unicode normalization or password trimming is permitted. Invalid UTF-8, duplicate
fields, nested recognizable labels, ambiguous legacy content and wrong routing
reject with values withheld. Provider checks require no staff account password;
the owner enters the current password and a fresh replacement only in their own
browser/password manager. The unused older password comparator and one-shot
provisioning tools are not part of this release chain.

Observed preparation: 66 pure parser regressions, 17 attempt/namespace/source-binding
regressions and 42 corrected readiness regressions passed (125 total). Focused
shared-sign-in/authorization contract tests passed 761 test cases in six files.
Independent source review checks the new gate-only transaction, exact previous
transaction reconciliation, scoped provider paths, failure closure and private
input consumption. No production execution is implied by these source checks.

The operator/setup record at draft PR #45 head
`6c140284fb7797590b276518ddfb53a6aa48f1e9` separately has all seven substantive
CI jobs and Vercel PASS. The serving application source remains the reviewed
merged-main revision above; the operator record is not a different deployed app.

## Execution sequence and evidence

1. Validate named private inputs without displaying values and check their
   account-only ACL. Stop for missing inputs or an ambiguous format.
2. Freshly verify main and all seven CI checks, approved Supabase/Vercel project,
   native Auth perimeter/health, nine original ledger versions, retained backup
   and restore proof, the closed first operation and its exact ended native
   transaction, currently serving closed deployment/aliases, both new gates false,
   one active owner/retained factor, no password operation or other account, and
   all participant/operational closures.
3. Create a separate protected attempt manifest and immutable records. Bind the
   complete reviewed operator/verifier source chain by hashes; reject missing or
   changed manifests, sources, operation, target or receipt attribution.
4. Enable only the existing database password-change boolean in a marked native
   transaction, using the reviewed advisory/history lock and policy compare-and-set.
   Compare all other catalog/data, preserve the nine-version ledger, prove the
   exact transaction ended and capture fresh committed state. No DDL, history
   INSERT, bootstrap, user creation, factor change or Auth request occurs here.
5. Enable only the Production server flag and request a deployment pinned to the
   reviewed main. The exact owned INITIALIZING/QUEUED/BUILDING deployment may wait;
   an owned READY deployment also waits while its verified same-commit Vercel or
   Preview status is still progressing. Other failed/unknown/source-mismatched
   states stop. Release READY requires all seven strict CI checks, current serving target,
   exact source/project/team and apex/www aliases with no pending observation.
6. Verify anonymous EN/AR sign-in/Security, noindex/private responses, robots/public
   navigation exclusion, server denial and all unrelated workflow closures. Bind
   the private owner handoff timestamp to this attempt and READY deployment.
7. The owner privately performs fresh current-password/TOTP sign-in and opens
   Security immediately. Submit a fresh replacement and matching confirmation
   within the existing two-minute admission window, then sign in with the new
   password and the retained authenticator. No values or setup screen enter logs
   or chat. Do not create a new authenticator.
8. After the human reports completion, use a bound read-only native projection
   to verify committed reservation/audit, identity revision, retained factor and
   role, revocation cutoff, absence/revocation of old sessions and a fresh valid
   password/TOTP session. Repeat anonymous closure probes. Human own-device
   completion and native evidence remain distinct from a controlled signed-DOM
   or live-axe check; do not claim an unperformed check.

### Observed resumption checkpoints

All completion times in this table are **UTC on 8 October 2026**. PASS applies
only to the stated check. The protected attempt manifest and source chain are
now initialized and frozen; the stopped first release retains its own records.

| Stage | Completed UTC | Observed result |
| --- | --- | --- |
| Initial named-input check | Historical, before resumption | STOP for missing named fields and ambiguous legacy format. Values were withheld and no hosted action occurred at that checkpoint. |
| Corrected private inputs and ACL | Before hosted preflight | PASS: canonical named fields and approved routing validated; access is limited to the current Windows account. No private values or location are recorded. |
| Fresh hosted preflight | 01:36:58.477 | PASS: reviewed prerequisite readbacks completed for the new attempt. One active Super Admin and the retained verified authenticator remain in scope; pairing is false and unrelated workflows stay closed. |
| Gate-only database enable | 01:39:27.070 | COMMITTED AND VERIFIED: only the existing password-change policy boolean enabled. No DDL, migration/history replay or INSERT, bootstrap, account creation or email. Nine original history versions retained. |
| Production server flag and pinned deployment | 01:40:22.733 | New server flag enabled; deployment `dpl_GMjimH6Y9HcLuWiqCvTPiwwNtaEx` created at reviewed source `2f677bedd9e1773508286cc5d8db79780801cc37`. Creation alone is not serving readiness. |
| Owned serving deployment | 01:42:51.210 | READY verified at the exact reviewed application source, with all seven main CI checks, owned project/team and apex/www aliases. |
| GET-only live boundary checks | 01:46:41.963 | PASS, 44/44: anonymous EN/AR sign-in/Security, noindex/private responses, robots/public navigation exclusion, anonymous privileged denials, participant and all 15 operational APIs closed, and native GoTrue `v2.197.0`. No Auth login or password change is proved by this probe. |
| Bound private owner handoff | 01:49:14.148 | Handoff bound to this attempt and READY deployment. The human question is pending: current-password/TOTP, fresh replacement with confirmation, then new-password/TOTP using the same retained authenticator. |
| Human rotation and native completion proof | PENDING | No account-password change or resulting old-session revocation is claimed. Human completion, fresh native assurance, signed-home DOM and live axe remain separate uncompleted checks. |

## Failure handling and rollback

Any failed or unknown mutation outcome first reconciles the exact new native
PID/backend-start/transaction-start. Do not retry a migration, bootstrap, gate,
deployment or password request automatically. Preserve every failed receipt.

Genuine release or post-READY verification failures invoke the same new operation's
database-first closure: commit/read back the new database flag false, then only
the new server flag false, request a pinned closed deployment when necessary and
verify actual READY/current aliases and live closure. Invalid arguments or an
unbound READY receipt stop before any closure write. Existing staff gates, account,
authenticator, immutable security migration, audit and revocation records remain.

Closing a feature does not undo a committed password. Never restore the obsolete
password, delete/re-enroll the authenticator, self-reset the account or bypass the
other-admin recovery/two-admin rules. Other accounts, SMTP/notifications, quotas,
paid resources, participant workflows and operational settings remain outside
this release. Expected email volume is zero.

## Shared sign-in and role boundaries

There is one EN/AR staff sign-in route/API and no role picker or public staff
sign-up. The current native session and live database grants determine whether
the second step is the regular staff email check or Super Admin TOTP. Menus use
the permission contract; privileged APIs and RLS re-read current authority rather
than trusting browser visibility or JWT role claims. The tested role matrix
denies People/audit/admin tools to non-Super-Admin roles and allows the internal
participant list only to Super Admin and registration/workshop administration.

Review/faculty-judge workspaces remain unbuilt and closed; their future screens
are English/LTR. This release creates no extra staff role/account. The current
single-edition setup is verified; a future multi-edition login must explicitly
bind admission to the configured edition rather than choosing an older grant.

## Current checkpoint

The earlier missing-field/format check is historical and has been corrected.
Canonical input/ACL validation, fresh preflight, committed gate-only enable,
Production server flag, pinned serving READY deployment, 44 anonymous live
boundary checks and bound private handoff have passed as recorded above. Both
password-change gates are now enabled for the existing single Super Admin;
one verified authenticator is retained and pairing remains false.

Human current-password/TOTP entry, fresh replacement, new-password/TOTP sign-in
and the subsequent bound read-only native completion projection are **PENDING**.
No password-change completion, old-session revocation, controlled signed-home
DOM or live-axe pass is inferred from the release receipts. No migration/bootstrap
replay, other account, factor reset, real email or unrelated operational opening
occurred. Participant and all other operational workflows remain closed.
