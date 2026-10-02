# BL-AUTH-05/06 — Closed SMS authentication and session foundations

Requirements: AUTH-01/02/04/05/06, ROL-12, SEC-01/02/06, LOC-01, ACC-01, ERR-01.
Authority: bounded organizer task, 2 October 2026; ORG-010/011/012, superseding
authentication decision ORG-013 (3 October 2026), and ENG-011's continuing closed boundaries.

## Scope and release state

Participants use managed email/password and must verify email **and phone**, without MFA.
Staff/admins use password **then SMS OTP** as phone MFA. Verification does not grant a role.
This local review lab uses synthetic identities, a simulated successful password step and
an ephemeral test inbox. It collects no real password/phone and sends no SMS or email.
It creates no managed account, invitation, grant, live factor, reset or operational record.
Participant signup, CMS, registration, submissions, payments, reviews, workshops, check-in
and certificates remain excluded. All 15 operational flags and both readiness flags stay false.

Production Supabase `ecemjggwlzqpjcwmchrl` is isolated from all test data. The deployed
`20261002173712_persisted_authorization.sql` stays unchanged and is never reapplied.
The unmerged `20261002193800_staff_mfa_session_foundations.sql` remains **review-only**;
it overrides the historical TOTP assurance helper and own-context RPC within the same
additive session migration. Only GitHub's disposable synthetic stack runs it.
No hosted migration or reset/seed/full historical push is performed.

## Local preview and failure recovery

Use Node 24.x and pinned pnpm 11.19.0. On this machine add the original checkout's
`.tools/node` directory to PATH, then dot-source `scripts/use-local-node.ps1`.
Run `pnpm install --frozen-lockfile`, set server-only `MSRC_AUTH_PREVIEW=synthetic`,
clear `VERCEL_ENV` and run `pnpm dev`. Next binds to 127.0.0.1. Open
`/en/staff-security-preview` or `/ar/staff-security-preview`. Configure no hosted database.
The persistent local review server uses `http://127.0.0.1:3220`; automated auth tests use 3211.

Start a synthetic participant session; send/verify the separate email and SMS codes from
the test inbox. Both markers are required for the own-session synthetic probe, which stays
AAL1 with no MFA factor. Start staff mode; the password step is explicitly simulated, then
enroll/challenge a synthetic phone factor and verify its SMS code for a synthetic AAL2 probe.
The inbox code appears only in that send response, never in status, URLs, audit events,
browser storage or logs. Server memory stores keyed code hashes. Codes are random,
single-use, invalidated on replacement, expiring and protected by serialized verification
and bounded failed attempts. Lab limits are engineering test bounds, **not approved live
SMS policy**. Restart discards all synthetic identities, factors, inboxes and sessions.

English/Arabic instructions, full RTL, LTR code entry, Arabic digit normalization,
keyboard/paste/autofill, focus/status/error handling and retry support are required.
Transient entered data survives an in-app locale change and recoverable request failure;
reload clears it. Provider/audit failure returns sanitized feedback and denies assurance.
Saved-draft recovery belongs to its later workflow; no unsaved input is promised durable.

## Transport and provider boundary

Page/API require exact opt-in, loopback Host and no deployment environment. Every Vercel
environment returns 404 even if the flag is set; a local production build can run the lab.
POST requires matching Origin, JSON, an exact action allowlist and a 512-byte body ceiling.
Client actor/time/role/factor overposting is rejected. Opaque HttpOnly SameSite=Strict
cookie is API-scoped and never returned in JSON. Responses are private/no-store; the
route is excluded from indexing and production analytics.

The injectable typed Supabase SDK adapter enrolls a **phone** factor, challenges with
`channel: "sms"`, and verifies without exposing provider credentials/errors. There is no
live client or reset/unenroll operation. `MANAGED_STAFF_MFA_READY` remains false.
Provider success does not establish authorization. Official
[phone MFA](https://supabase.com/docs/guides/auth/auth-mfa/phone),
[phone verification](https://supabase.com/docs/guides/auth/phone-login) and
[session documentation](https://supabase.com/docs/guides/auth/sessions) informed the contract;
installed SDK types check it. Primary phone OTP is distinct from privileged phone MFA.
Managed `mfa/phone` AMR identifies the factor, not SMS versus WhatsApp delivery; the
trusted adapter, approved configuration and real delivery UAT must enforce SMS-only transport.
Full live SDK/cookie/refresh exchange and phone change/loss recovery remain closed.

## Session and database evidence

ORG-012 keeps participant 72h absolute from original managed session creation; any active
staff grant selects 30min idle/8h absolute across editions. Refresh, challenge and activity
cannot move that origin; context/refresh reads do not count as activity. Equality expires.
Checks use current managed account/session, revocation cutoff, token expiry and not-after.
Participants require current managed email and phone confirmations without MFA. Staff
require individual identity, password AMR followed by current verified phone-MFA AMR,
factor ownership/lifecycle and AAL2. Old TOTP, generic/primary SMS OTP, stale/out-of-order
proof or factor deletion cannot preserve staff assurance. Logout, suspension/offboarding
or factor-reset-revoked sessions deny. Sensitive actions deny while recent-auth age is unset.

Private `msrc_sessions` tables hold policy, immutable origin/server activity, revocation
cutoffs and append-only safe audit references with forced RLS and denied client table grants.
Narrow own-context/logout RPCs have fixed search paths and explicit execution grants.
Public heartbeat observes only while closed; the private activity primitive is reserved
for future successful authorized domain transactions. No resource facts or operational
authorization are returned. Audit failure rolls back security transitions. Maintenance
attribution references do not establish an approved live human reset operator.

## Changed-files map

| Area | Files | Purpose |
| --- | --- | --- |
| Preview/provider/code service | `src/features/auth/mfa-contract.ts`, `mfa-provider.server.ts`, `preview.server.ts`, `sms-test.server.ts` | Separate participant verification and ordered staff SMS MFA; ephemeral hashed codes and sanitized adapter. Obsolete TOTP/QR code and dependency removed. |
| UI/transport | `src/app/[locale]/(auth)/staff-security-preview/page.tsx`; `src/app/api/auth-preview/route.ts`; `src/lib/auth-preview.server.ts`; `src/features/auth/staff-security-copy.ts`, `staff-security-preview.tsx`; `src/styles/staff-security-preview.css` | Local guarded lab, separate synthetic inboxes, EN/AR/RTL and failure/retry states. |
| Policy/identity | `src/config/authentication-policy.ts`, `session-policy.ts`; `src/lib/auth/session-policy.server.ts`; `src/lib/supabase/session.server.ts`; `src/lib/permissions/contract.ts`, `persisted-context.ts`, `authorize.server.ts` | Approved policy with unresolved settings null; current verification/password/phone assurance and fixed origin. |
| Review-only SQL | `supabase/migrations/20261002193800_staff_mfa_session_foundations.sql`; `supabase/tests/database/session_foundations.test.sql`, `persisted_authorization.test.sql`, `authorization_contract.test.sql` | Private policy/revocation/audit, historical helper override, real-schema permission and lifecycle assertions. |
| Coverage | Auth/provider/session/identity/authorization unit tests; `tests/e2e/staff-security.spec.ts`, `auth-preview-unavailable.spec.ts`; `tests/integration/session-concurrency.test.ts`, `session-denial.test.ts`; `playwright.auth.config.ts`; `.github/workflows/ci.yml` | Ordered assurance, verification, single-use/failure/concurrency/revocation and local-only UI. Auth traces/screenshots/failure snapshots disabled to protect visible test codes. |
| Docs/dependencies | `AGENTS.md`; current requirements, decisions, architecture, progress, auth backlog/index and feature notes; `package.json`, `pnpm-lock.yaml` | ORG-013 supersession and gates; original source snapshot preserved; unused QR dependencies removed. |

## Verification, UAT and configuration

Executed commands and source-specific CI/Preview receipts are in PROGRESS. Earlier dated
TOTP receipts verify that earlier implementation only. The requester reported its preview
worked; this does not establish the new SMS flow or real delivery. Local SQL is deliberately
**NOT TESTED**: no Docker requirement on this computer. Isolated GitHub CI runs migrations,
pgTAP, strict generated types, Data API integration and actual parallel connection races.
Fixtures require GitHub Actions, validated loopback and the exact isolated project/container;
they disappear at disposable runner teardown. Private forced-RLS tables intentionally have
no client policies. SECURITY DEFINER own-context RPCs remain a reviewed advisory exception.

Human screen-reader/device and managed-provider UAT remain **NOT TESTED**. Before release:

- [ ] Review EN/AR with keyboard and screen reader: focus/announcements, RTL, code paste/autofill, Arabic digits, locale change and input retained after recoverable transport failure.
- [ ] Participant email only and phone only each deny; both verified allow only the synthetic own-session probe, with AAL1, no MFA factor or staff access.
- [ ] Test staff password then SMS on named phones in an isolated approved managed environment; confirm SMS-only delivery and reject primary OTP/TOTP/missing or out-of-order password proof.
- [ ] Verify replaced/reused/expired/invalid codes, approved abuse/resend behavior, delivery failure and recovery after throttling.
- [ ] Refresh a participant token and confirm its original 72h deadline; exercise staff 30min idle/8h absolute expiry, logout, suspension and factor-change/reset revocation.
- [ ] Rehearse lost/changed phone and recovery only after approved approver/operator/procedure; no silent password-recovery fallback.
- [ ] Restart the local lab and confirm old synthetic identities/sessions disappear.

Live delivery/enrollment, cookie/refresh exchange, phone recovery/reset, security-email
delivery and staff activation are **BLOCKED**. Remaining decisions: SMS provider/sender/
budget and expiry/resend/attempt/account/IP controls; phone-loss/change/reset procedure and
recovery approver/operator; recent-auth age and warning lead; privacy/retention/location;
security-email provider/sender; production plan/region/operational approvals; two intended
Super Admins. Administrator login addresses remain private. Console/test email and synthetic
SMS only; no real communication or hosted mutation is performed.

## Rollback and next slice

Stop the local process and clear `MSRC_AUTH_PREVIEW`; memory-only state disappears.
Revert branch application changes if needed. No production schema rollback is required
because the session migration is unhosted. Recreate the isolated CI stack rather than
delete retained production evidence. Future hosted migration requires review and explicit
authorization with a data-aware rollback plan; never blindly push historical migrations.

Next smallest task: approve SMS provider/operating and verified recovery/recent-auth
settings, then integrate and test managed password → SMS in an isolated approved Auth
environment with named-human delivery/lifecycle UAT. Later bounded tasks implement participant
signup and domain activity/AuthorityReader/RLS. Keep staff grants/CMS and operations closed.
