# Staff portal activation checklist — preparation only

BL-AUTH-01, BL-AUTH-05/06 staff parts, BL-RPT-01/03; AUTH-04/05,
ROL-01/07/10/12, ADM-01/02/04/05, LOC-01/03, SEC-01/02/06, REL-06.

**Activation is not authorized or performed by this document. Every operational
checkbox below is PENDING.** Preparing or merging this checklist does not apply
migrations, change hosted settings, enable flags, bootstrap accounts, send real
email, or approve another workflow. Record completed actions only after separate
authorization and actual evidence; retain the exact revision, environment,
operator and approver in the release record.

Authority is [DECISIONS](../DECISIONS.md), especially ORG-015/016/019/041 and
ORG-043/044/045, followed by the reconciled [requirements](../REQUIREMENTS.md)
and [source specification](../../sources/Development_Specification_v0.5.txt).
The source's historical three-Super-Admin requirement is superseded by ORG-043.
The designated people and bootstrap order appear **only in DECISIONS**; privately
supplied verified identities are required at activation. Do not reproduce their
names, emails or credentials in this checklist, code, fixtures, logs or tickets.

Use this alongside the [staff foundation guide](STAFF_PORTAL.md),
[first-account procedure](STAFF_BOOTSTRAP.md) and
[release evidence format](../ACCEPTANCE_AND_RELEASE.md). Historical draft/review-only
wording in earlier receipts describes those checkpoints. PR #43 is merged into
`main` at `2a991d2`; merge is separate from hosted migration application and
permission to open access.

## 1. Current read-only baseline

The preparation audit on 7 October 2026 establishes closure, not activation.
Full current receipts and outstanding checks belong in [PROGRESS](../PROGRESS.md).
Reverify this baseline immediately before any separately authorized operation.

| Inspection | Observed state |
| --- | --- |
| Hosted migration history | Only `20261002173712_persisted_authorization` and `20261004114603_contact_abuse_counters` are recorded applied. |
| Hosted private schemas | `msrc_staff`, `msrc_sessions` and `msrc_participant` are absent. The pending Auth/staff foundation is not deployed to the database. |
| Vercel Production | Deployment `dpl_GbXLZzMsnb1eZTHtVcLXtJvRJDyY` is READY at merged `main` revision `2a991d2`. Deployment readiness does not open staff access. |
| Merged-main CI | All three push workflows and six checks on `2a991d2` pass; actual job receipts are in PROGRESS. Disposable native/SQL/browser coverage is separate from hosted application and human activation UAT. |
| Encrypted environment metadata | No `STAFF_*` variables or `PARTICIPANT_ACCOUNTS_ENABLED` exist. An existing `RESEND_API_KEY` secret is present; its value was not read. |
| Live HTTP closure | At 12:42:14 UTC, 82 probes passed: EN/AR staff pages denied, staff reads/mutations/methods closed, synthetic Auth-preview APIs denied, and domain workflows closed. Canonical redirects were accounted for. |
| Live browser closure | Twenty-four staff cases across six routes, EN/AR and desktop/mobile reached the localized closed page; four public-home cases had no staff links. No staff forms or private shell were exposed. |
| Actions performed by preparation | No hosted migrations/settings, environment changes, live bootstrap, real invitations, real recovery or real email. |

## 2. Approval and custody before execution

- [ ] **PENDING:** Record explicit authorization for the exact staff-only scope,
  reviewed application/SQL revision, target project, execution window, named
  operator, organizational custodians and incident/rollback owner. Ownership and
  delegated infrastructure access must satisfy CFG-11 and AT-18; site roles do
  not confer Supabase/Vercel ownership.
- [ ] **PENDING:** Independently verify the two distinct designated people and
  their privately supplied emails against ORG-043. Agree the other-Super-Admin
  identity-check and recovery procedure from ORG-044, including a safe way to
  contact the other person when portal access is lost. Self-service staff account
  recovery and public staff signup remain unavailable.
- [ ] **PENDING:** Verify actual application, database/Auth/storage, backup,
  email, diagnostics and support-processing locations, processor terms, transfer
  safeguards and institutional authority against approved Privacy/Terms v1.0.
  Approved policy text does not prove current provider locations or actual
  retention/restore controls. Record the remaining privacy/request-handling and
  native Arabic-reader approvals required for this scope.
- [ ] **PENDING:** Review staff profile, invitation, audit, abuse-counter and
  native-provider retention/backup handling. Assign verified-request and
  offboarding owners; preserve immutable authority/audit records according to
  approved obligations. Do not invent deletion exceptions or claim that future
  participant cleanup is implemented by this staff release.
- [ ] **PENDING:** Confirm the actual provider plan, combined email forecast,
  approved hard caps and operating budget in section 7. A configured key or
  source estimate is not permission to send real messages.
- [ ] **PENDING:** Assign owners for the migration, native Auth perimeter,
  recovery, privacy, email and bilingual/accessibility acceptance evidence below.
  Record PASS/FAIL/BLOCKED/NOT TESTED with actual evidence, not an assumed pass.

## 3. Exact migration inventory and dependency order

This is the complete nine-file inventory on the reviewed merged revision. Apply
only the six missing files, one at a time, in the numbered order below **after
separate operator authorization**. The two applied entries are SKIP; the synthetic
fixture is DO NOT APPLY. Reconcile any drift before proceeding.

| Local file | Disposition | Purpose / dependency |
| --- | --- | --- |
| [20260929143136_foundation_samples.sql](../../supabase/migrations/20260929143136_foundation_samples.sql) | **DO NOT APPLY** to hosted Production | Synthetic foundation examples only. Its absence from hosted history is deliberate; do not mark it applied. |
| [20261002173712_persisted_authorization.sql](../../supabase/migrations/20261002173712_persisted_authorization.sql) | **SKIP — applied; reverify** | Persisted accounts, edition-scoped grants, immutable grant audit and private authorization prerequisite. |
| [20261002193800_staff_mfa_session_foundations.sql](../../supabase/migrations/20261002193800_staff_mfa_session_foundations.sql) | **PENDING 1 — #25** | Native session origin, privileged idle/absolute limits, revocation and session/security audit. Requires persisted authorization. |
| [20261002233353_regular_staff_email_check.sql](../../supabase/migrations/20261002233353_regular_staff_email_check.sql) | **PENDING 2 — #25** | Exact-session staff email challenges/receipts, limits, identity revision and native guards. Requires step 1. |
| [20261003110812_authenticator_super_admin_policy.sql](../../supabase/migrations/20261003110812_authenticator_super_admin_policy.sql) | **PENDING 3 — #25** | Current strongest all-edition assurance; Super Admin native authenticator evidence. Requires step 2. |
| [20261003180734_readonly_authentication_context.sql](../../supabase/migrations/20261003180734_readonly_authentication_context.sql) | **PENDING 4 — #25** | Readonly persisted authorization/session evidence without activity renewal. Requires step 3. |
| [20261004114603_contact_abuse_counters.sql](../../supabase/migrations/20261004114603_contact_abuse_counters.sql) | **SKIP — applied; reverify** | Independent Contact counters/expiry job. Preserve them; no staff operation requires reapplying or altering Contact. |
| [20261004164034_participant_accounts.sql](../../supabase/migrations/20261004164034_participant_accounts.sql) | **PENDING 5 — #39** | Private participant identity/admission compatibility and native email/token guards used by staff. Requires steps 1–4. Participant readiness remains false. |
| [20261006224926_staff_portal_foundation.sql](../../supabase/migrations/20261006224926_staff_portal_foundation.sql) | **PENDING 6 — #43** | Private staff profiles/invitations/bootstrap/audit, administration/minimum-two controls, native staff perimeter and durable recovery holds. Requires all Auth steps above; staff readiness defaults false. |

### Apply and prove each individual file

- [ ] **PENDING:** Keep `STAFF_PORTAL_ENABLED` unset/false and, once present,
  `msrc_staff.policy.enabled=false` throughout schema preparation. Keep participant
  readiness and unrelated workflow gates closed. Confirm actual backup coverage
  and tested restoration appropriate to the approved recovery objectives; do not
  infer coverage from the selected managed provider.
- [ ] **PENDING:** Check the exact hosted project, `current_user=postgres`,
  migration ledger and existing schema/ACL/trigger definitions against the
  approved file. Record the file's revision/hash and safe metadata. Compare the
  hosted native Auth schema/version with the tested GoTrue contract; CI on
  GoTrue v2.197.0 is not proof of a matching managed deployment.
- [ ] **PENDING:** Execute **one complete reviewed file** as native `postgres`
  in one transaction, using the authorized SQL Editor or private PostgreSQL
  operator connection. Use `BEGIN;`, the full file, then `COMMIT;`; stop on the
  first error and roll back. If using `psql`, use `-X`, `ON_ERROR_STOP=1` and
  `--single-transaction` with only that file. Supply credentials privately, with
  TLS and approved connection controls; never in command arguments, transcripts
  or screenshots. No hosted synthetic fixtures, seeds, blanket migration push
  or database reset are permitted by this checklist.
- [ ] **PENDING:** After a successful commit, inspect only safe metadata:
  expected objects and function signatures, owner/search-path definitions,
  forced RLS, explicit grants, immutable audit protection and native triggers.
  Check that ordinary `anon`, `authenticated` and `service_role` roles have no
  direct private-table privileges; only the intended RPC entry points receive
  execution rights. Service identity is not authorization for a staff action.
- [ ] **PENDING:** Reconcile that **one executed version** into hosted migration
  history only after its SQL and metadata checks succeed. Manual SQL does not
  itself prove ledger alignment. The pinned CLI supports `migration repair
  <version> --status applied --linked` and `migration list --linked`; recheck its
  installed help and the privately authenticated linked target at execution.
  History repair records state and does not execute SQL. Never repair all local
  versions to conceal missing SQL or the intentionally excluded fixture.
- [ ] **PENDING:** Verify the new ledger row, continued application closure and
  preserved earlier objects before starting the next numbered file. Record the
  operator, timestamp, target, revision, commit/rollback outcome and metadata
  evidence for each file separately. If SQL committed but ledger recording
  failed, inspect and reconcile that specific state; do not blindly rerun DDL.
- [ ] **PENDING:** Review security-advisor findings, including existing narrow
  `SECURITY DEFINER` findings, against intended grants and forced RLS. Do not add
  table/schema privileges to silence a finding. Any missing prerequisite,
  unexpected owner/trigger/ACL, divergent definition or unexplained ledger entry
  stops the sequence with both staff gates closed; use a reviewed correction.

### Closed-state evidence after all six files

- [ ] **PENDING:** Confirm `msrc_staff.policy`: `enabled=false`,
  `email_daily_limit=NULL`, `bootstrap_completed=false` and
  `bootstrap_pairing_completed=false` before authorized configuration/bootstrap.
  Confirm no staff profile, real identity, edition grant or invitation was
  created by migration application.
- [ ] **PENDING:** Confirm `msrc_participant.policy` remains
  `enabled=false`, `privacy_version=NULL`, `email_daily_limit=NULL`, and
  `PARTICIPANT_ACCOUNTS_ENABLED` remains unset/false. Its migration is a staff
  prerequisite, not participant activation; participant retention cleanup and
  release gates remain separate.
- [ ] **PENDING:** Preserve `msrc_sessions.policy` defaults: privileged idle
  1,800 seconds, absolute 28,800 seconds, participant absolute 259,200 seconds.
  `recent_auth_max_age_seconds` and `warning_lead_seconds` remain unresolved NULL
  settings. Do not invent values or claim warning/recent-auth UAT. Its generic
  `operational_access_ready` and `privileged_access_ready` remain false and are
  constrained false; they are not staff activation switches.
- [ ] **PENDING:** Confirm private staff/session/participant schemas stay outside
  exposed API schemas, with explicit public RPC grants. Validate denial through
  direct native/PostgREST entry points as well as the application; UI hiding and
  JWT/user-editable role metadata are not authorization.

## 4. Native Auth settings and perimeter

Configure or change managed settings only under the separately approved operator
plan. The repository's local `supabase/config.toml` and disposable CI setup are
not evidence of hosted settings.

- [ ] **PENDING:** Verify native email/password authentication and confirmed
  email requirements; public native signup, anonymous/social/passwordless/phone
  entry and SMS remain disabled. Enable/verify native authenticator TOTP as
  required by the approved Super Admin flow. No alternate provider route may
  admit staff outside bootstrap/invitation or the other-admin recovery protocol.
- [ ] **PENDING:** Apply the approved ten-character native password minimum
  during authorized configuration. Verify application password creation/reset
  counts at least ten Unicode codepoints with a 72-byte UTF-8 maximum, including
  Arabic, while password sign-in preserves legacy compatibility. Do not replace
  this with an invented password rule.
- [ ] **PENDING:** After all prerequisite guards are present, configure the
  managed **Send Email database hook** to
  `msrc_participant.suppress_native_email(jsonb)` using the final #43 definition.
  Retain only its required `supabase_auth_admin` schema-usage/execution grants,
  with no private-table grants. The hook suppresses native mail; the application
  owns Resend invitation and code delivery. No native SMTP/provider fallback is
  an acceptable workaround for a guard failure.
- [ ] **PENDING:** Inspect the installed staff identity/surface/token guards on
  `auth.users` and `auth.one_time_tokens`, the native factor guard on
  `auth.mfa_factors`, and the TOTP claim guard on `auth.mfa_amr_claims`. Preserve
  the compatible #39 participant guards, managed credential hashing and proven
  staged Admin creation/confirmation transaction. Do not remove a trigger or
  grant broad native access to make an enrollment or reset succeed.
- [ ] **PENDING:** Verify raw native signup, email change, phone change, recovery,
  magic-link and email-OTP paths cannot create staff authority, stage alternate
  credentials or retain native one-time tokens. Existing/absent recovery responses
  remain enumeration-safe and no request reaches a native mail provider. Include
  genuine native verification during a recovery hold, not just mocked SDK errors.
- [ ] **PENDING:** Record managed Auth limits/settings and confirm the reused
  password and staff-code protections. ORG-015 regular-staff codes are six digits,
  five minutes, newest only, 60-second resend spacing, three/account/15 minutes,
  ten/account/rolling 24 hours, twenty/IP/hour, and five failed checks followed by
  the approved 15-minute cooldown. No new rate-limit values are approved here.

## 5. Production environment and independent staff gates

The authoritative resolver is
[config.server.ts](../../src/features/staff-portal/config.server.ts); the API
also checks [msrc_staff_status](../../supabase/migrations/20261006224926_staff_portal_foundation.sql)
against its configured cap. All variables below are server-side. Never copy
credentials into this file, `.env.example`, a public variable or client bundle.

| Variable | Pending approved configuration |
| --- | --- |
| `STAFF_PORTAL_ENABLED` | Unset/false until the separately authorized onboarding/activation window; only the exact string `true` opens this gate. |
| `STAFF_AUTH_SECURITY_SECRET` | Stable private random 32-byte secret encoded as 64 hexadecimal characters; approved custody and rotation procedure. |
| `STAFF_SUPABASE_URL` | Exactly `https://ecemjggwlzqpjcwmchrl.supabase.co`, the designated Production target. |
| `STAFF_SUPABASE_PUBLISHABLE_KEY` | Matching project's modern `sb_publishable_...` key. |
| `STAFF_SUPABASE_SECRET_KEY` | Matching project's modern private `sb_secret_...` key, server secret storage only. |
| `STAFF_AUTH_EMAIL_DAILY_LIMIT` | Approved positive staff cap, exactly equal to `msrc_staff.policy.email_daily_limit`; value is still TBD. |
| `STAFF_EDITION_KEY` | Reviewed current edition identifier matching persisted grant scopes; do not copy the synthetic test edition. |
| `RESEND_API_KEY` | Existing shared sending key, with verified domain, authorized custody and actual quota/budget evidence. Secret presence alone is insufficient. |

- [ ] **PENDING:** Configure required values privately in **Vercel Production**
  only, retaining `STAFF_PORTAL_ENABLED=false` during preparation. The resolver
  requires `VERCEL=1` and `VERCEL_ENV=production` and accepts only the approved
  apex/www origins. Preview remains unavailable even with copied Production
  values; do not weaken the resolver for staging acceptance.
- [ ] **PENDING:** Keep `STAFF_PORTAL_TEST_MODE` absent on Vercel. Its fixed
  loopback providers, dummy keys, edition and cap belong only to synthetic tests.
  Keep staff-security previews closed on Vercel as their independent
  code requires. Do not use test-mode configuration as Production settings.
- [ ] **PENDING:** Set only the approved private staff email cap while database
  readiness is false. Verify its exact match with the server value. Database
  readiness requires `msrc_staff.policy.enabled=true` and a non-NULL cap; the
  server flag alone is insufficient. A missing/mismatched dependency fails closed.
- [ ] **PENDING:** Review secret stability/rotation effects: the staff secret
  protects encrypted session cookies and keyed invitation/code/abuse hashes.
  Treat rotation and outstanding invitations/sessions as an approved incident or
  handover operation; do not silently regenerate it on deploy.
- [ ] **PENDING:** Verify no participant, registration, finance, payment, review,
  check-in, content, advisory AI or export workflow opens with these changes.
  “Coming soon” menu entries only describe role scope. Current generic domain
  gates remain closed in [workflows.server.ts](../../src/lib/workflows.server.ts).

## 6. Restricted first/second-account onboarding

This stage creates real accounts and the second person's real invitation. It is
**PENDING and requires separate explicit authorization**. Complete schema,
privacy/provider/custody review and disposable synthetic rehearsal first. A
Production-only restricted onboarding window is necessary for actual portal
enrollment; it is not approval for wider staff invitations or domain workflows.

- [ ] **PENDING:** Review the exact
  [bootstrap-first-staff.ts](../../scripts/bootstrap-first-staff.ts) revision
  against [STAFF_BOOTSTRAP](STAFF_BOOTSTRAP.md). Keep both staff gates false for
  operator creation. The script is inert without `--execute-bootstrap`; it must
  never run in CI, a request handler or as a recovery workaround.
- [ ] **PENDING:** Supply only private operator process inputs:
  `STAFF_BOOTSTRAP_EMAIL`, `STAFF_BOOTSTRAP_DISPLAY_NAME`,
  `STAFF_BOOTSTRAP_EDITION_KEY`, `STAFF_BOOTSTRAP_PASSWORD`,
  `STAFF_BOOTSTRAP_DATABASE_URL`, `STAFF_BOOTSTRAP_APPROVED_PROJECT_REF`,
  `SUPABASE_URL`, `SUPABASE_SECRET_KEY`. These bootstrap Auth names intentionally
  differ from the application's `STAFF_SUPABASE_*` names. Verify the approved
  matching HTTPS Auth project/direct `db.<ref>.supabase.co` native `postgres`
  connection, TLS and the script's ten-second connection deadline. Transfer the
  one-time password using the approved private channel; record no secret input.
- [ ] **PENDING:** The operator deliberately executes the reviewed procedure
  for the **first person in ORG-043**. Verify the exact actor/email reservation,
  managed credential creation and immutable bootstrap completion evidence.
  There must be one individually identified active edition Super Admin account,
  no pre-existing verified authenticator, and mandatory first-sign-in enrollment.
  Bootstrap sends no email. Partial failure stays closed for private inspection;
  do not blindly rerun or delete authority/history to retry.
- [ ] **PENDING:** For the authorized restricted onboarding window, enable only
  `msrc_staff.policy.enabled` with the approved cap, then set the server flag to
  exact `true` and redeploy. Verify the Production deployment, both gates and
  domain closure. The first person signs in with their privately supplied
  temporary password and enrolls/verifies their own authenticator through QR or
  the manual alternative. Password-only authority must remain denied.
- [ ] **PENDING:** The first Super Admin invites the **second person in ORG-043**
  with their independently supplied email and the edition Super Admin role. The
  English transactional invitation has one single-use link and a 72-hour expiry.
  The second person sets their own password and enrolls/verifies their own TOTP.
- [ ] **PENDING:** Verify distinct actor IDs, correct edition grants, active
  account states and independently verified native factors. The initial
  `bootstrap_pairing_completed` transition must follow genuine second enrollment;
  do not set it manually. Wider administration is restricted before this initial
  pair is enrolled. After pairing, recovery may temporarily require enrollment
  while maintaining the two active account/grant minimum.
- [ ] **PENDING:** Complete approved human inbox/device and mutual-recovery
  acceptance in section 8. Close both staff gates again if acceptance is incomplete
  or fails. Record final wider-staff approval before sending additional real
  invitations; initial pairing is not a substitute for the release sign-off.

## 7. Shared email volume and provider acceptance

| Staff event | Send accounting |
| --- | --- |
| Invitation, replacement/resend, full account-recovery invitation | One English transactional email per send. A replacement invalidates the older link. |
| New regular-staff password session | One session-bound code email; code resends add sends. |
| Super Admin TOTP sign-in/enrollment or factor-only reset | No staff code email. Inviting the second Super Admin still sends one invitation. |
| Operator first-account bootstrap | No email from the bootstrap script. |

- [ ] **PENDING:** Approve actual daily/monthly demand: invitations + invitation
  resends + regular-staff password-session codes + code resends + full account
  recovery invitations. Staff counts, resend demand and peak concurrency are TBD;
  source planning estimates are not approved demand or capacity.
- [ ] **PENDING:** Add Contact, participant and every future sender/inbound-mail
  consumer to the same account/team forecast. Staff invitations and staff codes
  share the staff database reservation cap. Separate keys do not create separate
  provider quota; failed/uncertain delivery reservations are not permission to
  bypass the cap.
- [ ] **PENDING:** Inspect actual Resend account plan, current remaining quota,
  sender verification, rate-limit behavior and approved budget privately. The
  [published Resend limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
  refreshed on 7 October 2026 are Free 100 emails/UTC day, 3,000/month and an
  initial team-wide ten requests/second; inbound mail also consumes quota.
  These are not verified limits/remaining capacity for this account. Contact's
  existing 60/day cap would leave at most 40/day for **all other consumers** on
  Free; 40 is not an approved staff cap. The synthetic harness's 40 must not be
  copied as a business decision.
- [ ] **PENDING:** Record the approved staff cap and combined hard-cap/forecast
  analysis before configuring the equal server/database values. Record any
  purchased-plan approval separately; this checklist authorizes no purchase,
  account/DNS change or capacity assumption.
- [ ] **PENDING:** In the separately authorized acceptance window, verify real
  inbox receipt from `MSRC 2027 <no-reply@msrc2027.com>`, English-only content,
  one invitation link, 72-hour expiry, no codes/tokens/provider details in logs,
  and safe failure/rate-limit behavior. Provider acceptance is not inbox receipt;
  synthetic capture is not human inbox UAT. Do not expose real links or QR secrets
  in evidence artifacts.

## 8. Acceptance before wider staff use

Run failure injection and concurrency tests only with disposable synthetic
accounts. Never replay CI fixtures against hosted Production. Gather actual
human identity/provider/inbox/device evidence during the separately approved
onboarding/rehearsal window, and record its distinct scope. Code CI and live
default-off probes do not establish this acceptance.

- [ ] **PENDING:** **Invitations/admission:** prove expiry, revoke, replacement,
  replay and consume races; genuine managed creation/update remains bound to the
  exact reservation/transaction. Verify password-only access, wrong second step,
  missing/stale receipts, delivery failure and native alternate paths all deny.
- [ ] **PENDING:** **Roles/server denial:** exercise all twelve staff roles and
  role combinations against current persisted scopes, including a person with a
  Super Admin grant in another edition. Validate contract-driven menus and direct
  API/RPC denial, not only hidden buttons. People/audit require Super Admin;
  participants require Super Admin or edition-scoped
  `registrationWorkshopAdministrator`. Revoked roles take effect immediately
  with stale signed sessions. No public signup or participant-cookie staff access.
- [ ] **PENDING:** **Minimum/self-protection:** two active Super Admin accounts
  and grants cannot be reduced below two. Prove serialized concurrent demotion
  with three synthetic Super Admins, and denial/audit of self-demotion,
  self-suspension and self-reset. The initial restricted bootstrap is the only
  one-account exception; do not suspend a recovery target to evade the minimum.
- [ ] **PENDING:** **Session lifecycle:** verify 30-minute privileged idle and
  eight-hour absolute expiry, original native session origin across refresh,
  logout/all-session revocation, suspension/password/factor changes and grant
  revocation. Background status/profile/area reads must not renew idle activity;
  denied actions must not renew it. Test current and readonly contexts and direct
  server access. Recent-auth age and warning-lead settings remain TBD and require
  a separate decision/implementation; current strongest assurance is mandatory
  for every privileged action.
- [ ] **PENDING:** **Durable mutual recovery:** the other currently authorized
  Super Admin records actor, target and reason before provider work; sessions
  revoke and a private hold commits first. Prove pending, failed and interrupted
  work stays denied after the five-minute operation expiry, password login,
  token refresh, role maintenance and reactivation. A native password may still
  prove identity; it must not admit the portal or produce current/readonly
  session/authority/profile evidence or permit authenticator enrollment/proof.
- [ ] **PENDING:** **Partial account-reset failure:** use genuine synthetic
  verified-factor deletion that commits, then fail only password rotation.
  Verify old-password identity cannot restore staff access before or after
  reservation expiry, fresh/refreshed factor enrollment is denied, and a valid
  pre-existing-factor proof during a hold cannot produce AAL2/TOTP claims.
  Verify an incomplete account reset cannot downgrade to factor-only recovery.
- [ ] **PENDING:** **Recovery restoration and races:** only the other Super
  Admin's current authorized retry can complete. Successful factor-only reset
  permits fresh enrollment; successful full reset remains `awaiting_invitation`
  until the latest operation's linked invitation completes native password
  setting, followed by fresh TOTP. Failed delivery, expired/revoked/replaced
  links, older callbacks and superseded native admissions must not release a
  newer hold. Prove concurrent hold/enrollment ordering and stale completion
  denial. Expired interrupted work receives an immutable terminal event on retry.
- [ ] **PENDING:** **Audits/minimized participants:** verify actor/action/target/
  timestamp/result, relevant safe previous/new role/status values and required
  reason, including denied actions and recovery transitions. Audit records remain
  immutable and viewer access scoped to Super Admin; no passwords, codes,
  invitation digests, factor secrets or provider payloads are shown. Participant
  search returns only the authorized name/email/status/created projection.
- [ ] **PENDING:** **Identifier boundary/export denial:** confirm masking by
  default as `••••••1234` and explicit audited Super Admin reveal. There is no
  registration identifier field or full value in this foundation; current reveal
  audits unavailable and returns no identifier. ORG-039 permits future collection
  at registration but does not implement storage/encryption/deletion here. Keep
  registration, identity collection and every bulk export closed.
- [ ] **PENDING:** **EN/AR/accessibility:** non-review staff screens retain Arabic
  RTL and English LTR, localized denial/recovery states and usable mobile row
  actions at 320px and 200% text. Verify keyboard/focus, QR manual alternative,
  screen-reader labels, native horizontal/down/up scrolling, reduced motion and
  axe. Reviewer/faculty-judge assessment screens remain English/LTR. Record human
  native-reader, actual-device and screen-reader review separately from automation.
- [ ] **PENDING:** **Public isolation/closure regression:** repeat pages/API/
  unsupported-method/Preview/default-off checks in EN/AR; confirm no staff links
  or public sign-up, noindex/robots exclusion, private/no-store responses and no
  public analytics on staff screens. Repeat closed-domain probes while staff is
  enabled. A staff session must not open unfinished operational modules.

## 9. Final approval, evidence and fail-closed rollback

- [ ] **PENDING:** Record the release decision using
  [ACCEPTANCE_AND_RELEASE](../ACCEPTANCE_AND_RELEASE.md): exact revision, target,
  named approver/operator, staff-only flag scope, all six migration receipts,
  native settings/hook/RLS/ACL evidence, actual budget/cap, pair enrollment and
  human privacy/recovery/inbox/accessibility UAT. Record unresolved blockers and
  monitoring/incident ownership. No PENDING or failed required gate becomes an
  implicit approval because the code merged or CI passed.
- [ ] **PENDING:** On final explicit approval, verify both staff gates and the
  exact Production deployment, perform approved staff-only smoke checks, and
  reconfirm participant/domain/export closure. Authorize additional invitations
  only within the recorded scope. Do not describe this foundation as activation
  of registration, finance, review, check-in or content.
- [ ] **PENDING:** Rehearse closure using the approved operator plan: disable
  `msrc_staff.policy.enabled`, set `STAFF_PORTAL_ENABLED=false` and redeploy,
  then verify current/stale staff requests deny. Existing in-flight provider
  work needs reconciliation; a flag change cannot recall an email already sent.
  Revoke staff sessions as authorized and retain partial-operation evidence.
- [ ] **PENDING:** If recovery fails, keep the target's durable hold and let the
  other Super Admin retry the audited required mode. Never clear
  `recovery_state`, current-operation pointers, pairing state, revocation cutoffs
  or grants manually to regain access. Do not repurpose first-account bootstrap.
- [ ] **PENDING:** Preserve immutable audit, authority and migration history and
  the independent Contact counters/cleanup job. Schema removal, grant restoration,
  native-trigger changes or restoring a backup requires a separately reviewed
  corrective plan/migration with data reconciliation. Stop and keep closed on
  unexpected state; do not falsify migration history or widen RLS/ACLs.

No operational checkbox is completed by this preparation. The next action is
organizer review of the remaining approvals and evidence, followed by separately
authorized operator execution of the agreed stages.
