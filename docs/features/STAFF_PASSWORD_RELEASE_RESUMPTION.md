# Owner password-change release — authorized resumption

ORG-046/047/048; BL-AUTH-01/05/06, BL-RPT-01/03, SEC-01/02/06.

The organizer authorizes finishing the reviewed release on 8 October 2026. The
[stopped first attempt](STAFF_PASSWORD_RELEASE_EXECUTION.md) remains an immutable
historical checkpoint. Its additional migration is already committed; neither
that migration nor any earlier migration or bootstrap is replayed. This record
will distinguish each observed resumption stage from preparation and human UAT.

**Current checkpoint, 8 October: separate read-only post-closure evidence confirms
the committed owner password change, retained verified authenticator identity,
old-session revocation and a fresh password/TOTP application session. The frozen
completion-verifier STOP remains preserved. Both password-change gates are closed;
restricted staff sign-in remains available. No second change or automatic reopening
occurred.**

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
| Bound private owner handoff | 01:49:14.148 | Handoff bound to this attempt and READY deployment. The owner subsequently reported completion. |
| Frozen completion verifier | 11:41:54.513 | STOP preserved; the historical factor-timestamp equality was too strict after a normal TOTP challenge. Its nonzero child result was discarded, so the original receipt alone cannot identify the failed predicate. |
| Same-operation database-first closure | 11:42:30.376 | PASS; both new password-change gates false, original transaction ended and all other settings retained. |
| Owned closed serving deployment | 11:44:15.946 | READY/aliases PASS at `dpl_4rWinUKT5XVaRM16hu22Q9DJqytZ`, exact reviewed main. |
| Separate post-closure native evidence | 12:01:51.918 | CAPTURED and independently reviewed: committed/audited operation, exact revision, same verified factor identity, all old sessions revoked/absent and a fresh native/app password/TOTP session within existing limits. No password or seed value read/compared; original STOP unchanged. |
| Fresh GET-only closure | 12:03:11.275 | PASS, 27 anonymous requests: Security unavailable, EN/AR sign-in/private/noindex/RTL intact, privileged denials, participant and all 15 operational APIs closed. |

The stopped verifier compared the factor's current `updated_at` with the reservation's
historical snapshot. GoTrue's [factor challenge](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/models/factor.go)
uses `UpdateOnly`, whose [storage implementation](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/storage/dial.go)
automatically updates that timestamp. The separate diagnostic keeps the failed
historical equality visible and verifies retained identity/creation chronology,
verified TOTP status, current-factor native AMR and actual application lifecycle
independently. It makes no plaintext-seed equality or private-DOM claim. Frozen
sources and failed receipts are unchanged.

An initial closed GET probe expected locale attributes on Security's global
not-found document. Next may emit the exact neutral `__next_error__` document
without those attributes when the root layout is bypassed. That STOP is retained.
The separately reviewed correction accepts that precise neutral 404 or a correctly
localized document, still requires no staff UI/form/input and private/noindex
responses, and keeps strict EN/AR/RTL on the actual sign-in. Syntax and 22 pure
regressions passed before the successful fresh probe.

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

The owner reported completing the change and new-password/TOTP sign-in. Separate
post-closure read-only evidence confirms those committed/current-session facts,
the retained verified authenticator identity and old-session revocation. The
frozen verifier remains STOPPED; its failed record is not overwritten or relabelled.

Both password-change gates are false and the owned closed serving deployment and
fresh anonymous boundaries passed. Existing restricted staff sign-in remains
available for the single identified Super Admin, with pairing false. Reopening
password changes requires a new reviewed attempt with corrected retention
verification; the completed password change, migration and bootstrap must not be
replayed. Signed-home DOM and live axe remain NOT TESTED. No other account,
authenticator reset, real email or unrelated operational opening occurred.

Merged main subsequently advanced to
`fbddf28ea68cea2370cf4704a6b8029566cb007c` through public-site QA only, with no
staff/server/authorization/migration changes. This branch reconciles that source
while preserving both progress histories. The `2f677b...` closure record remains
historical evidence at its observed time; current serving deployment metadata is
verified in a separate record without reopening a gate.
