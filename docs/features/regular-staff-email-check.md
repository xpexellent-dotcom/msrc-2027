# BL-AUTH-05/06 — Regular staff email-check amendment

ORG-015, 3 October 2026. AUTH-04/05, ROL-12, SEC-01/06, LOC-01, ACC-01, ERR-01.
This is a narrow amendment to the unmerged PR19 foundation. The original v0.5 source,
deployed authorization migration and preceding session migration remain unchanged.

## Current flow and conflicts

Regular staff use managed password sign-in followed by an application email code.
ORG-016 now requires Super Admin password plus authenticator TOTP; participants use managed
email/password and verified email only, without phone collection/verification or MFA. Any active Super Admin
grant across editions selects the stronger requirement. Role scope, ownership,
assignment checks, participant 72h absolute and staff 30min idle/8h absolute are preserved.
All operational flags and readiness stay false; no accounts or live grants are created.

Before edits, the code/draft required SMS/AAL2 for every staff role. Supabase email OTP
is a passwordless primary sign-in method, not native MFA; this implementation never
calls it or counts two sign-in calls as proof of both steps. Regular-staff approval
remains at native AAL1 and has its own private receipt. Access to an inbox may enable
both password reset and receipt of this code, so this is weaker than authenticator MFA.
It does not replace or reduce Super Admin MFA.

## Server and database boundary

`staff-email.server.ts` verifies the exact bearer using managed `getUser` before decoding
its user/session identifiers. It generates a cryptographically random six-digit code,
UUID challenge and server-keyed HMAC bound to user/session/challenge/code. Trusted
service RPCs recheck current native session, password AMR, verified email, individual
identity, account state, strongest role, grants and lifecycle on every transition.
Delivery uses only the current trusted recipient, with an English template. The
adapter returns IDs/expiry and generic status, never a recipient, code or provider error.
No live route, provider, key or default email service is configured.

Review migration `20261002233353_regular_staff_email_check.sql` adds private forced-RLS
challenge, receipt, identity-revision and append-only safe audit tables. API roles cannot read/write them;
only three narrow service RPCs reserve issuance, acknowledge test delivery and consume
a matching hash. An undelivered/failed challenge cannot approve access. Wrong attempts
commit their counters; audit failure rolls back verification. Transactional account/IP
locks serialize quotas and code consumption. Replacement supersedes prior challenges.
The receipt binds user, exact native session, current managed email and protected identity revision,
full password AMR and immutable grant history. Email/password/grant changes invalidate
it, including change-away-and-back. New login needs a new check; token refresh does not.
The revision changes only when managed email, email confirmation or password changes.
It stores a counter and password-change time, never an address or password material.
The executed managed refresh test showed that general `auth.users.updated_at` also
changes on refresh, so that general timestamp cannot serve as an identity revision.
Relevant password changes require a new native password authentication before a code
can be issued. The native-user trigger does not acquire account/session/grant locks.
Native account/session revocation, suspension, idle/absolute expiry and logout deny.
Deadline checks observe current time after lock waits; supporting session-state and
actor-revocation guards use the same transition clock. This preserves the existing
limits and prevents a waiting request from accepting an expired code or missing a
login created before suspension completes. A lost delivery acknowledgement can
cancel pending/sent evidence, never an already verified receipt. If storage remains
uncertain, the adapter returns unavailable without disclosing a challenge identifier;
future live transport must recover verification acknowledgement via current context.

Existing closed APIs/pages/actions continue using authorization and workflow gates.
Own-context RPCs expose this separate check, never an active operational identity.
`msrc_second_step_satisfied()` provides a self-only current authentication predicate
for restrictive RLS alongside role/scope/ownership and readiness. It is not a grant.
The isolated SQL fixture proves owner policy alone cannot bypass the added check.
No live domain table/bucket/action is opened. Storage is disabled in this foundation;
actual object-policy integration remains a future feature gate, not inferred from a
disabled-route denial. Future domain features must install and test their restrictive
database/storage policy before opening their workflow.

## Controls and recovery

Reuse ORG-014's approved staff control targets: six digits/five minutes, 60-second
resend, three/account/15 minutes, ten/account/rolling24h, twenty/IP/hour and five
failed entries then 15-minute cooldown. Account limits survive session/email changes.
Raw codes/IPs are never persisted or audited. Safe audit contains IDs/events/times only.
Participant email-verification defaults remain distinct. ORG-016 retires all SMS targets; native TOTP/test bounds are not approved live abuse controls.

No approved production SMTP/provider/sender is present. Live email delivery remains
BLOCKED; do not rely on Supabase development email. Lost-email/address changes stay
closed: revoke/suspend first, in-person identity/appointment review by a distinct
Super Admin approver and operator, approved replacement-email verification, fresh
password session and email check, current grants and safe restoration audit. Named
people, exact evidence/procedure and recent-auth timing remain TBD; no email-only
support override, password-reset bypass or self-service address change is introduced.

## Review and local preview

Branch `codex/email-authenticator-no-sms` disables Vercel Git deployment in `vercel.json` to
honor this task's no-deploy instruction. No merge, production Auth change, hosted
migration/reset/fixture, real email or SMS is performed. The new migration is executed
only in disposable GitHub CI; no Docker is required on the organizer's computer.

Set server-only `MSRC_AUTH_PREVIEW=synthetic`, clear deployment environment and start
the existing loopback lab with Node24/pnpm11.19.0. Paths `/en/staff-security-preview`
and `/ar/staff-security-preview`; select regular staff, Super Admin or participant.
The password step is explicitly simulated. Email codes appear only in the test inbox; Super Admin authenticator codes come from the transient QR/manual setup.
Regular staff have no native MFA enrollment or AAL2 claim. EN/AR/RTL, keyboard, paste/autofill,
expiry/resend, delivery/retry and email/role revocation states are covered. The lab
denies every Vercel environment, even if its opt-in flag is set. Restart clears memory.

## Verification and remaining gates

Current executed commands/results and exact CI receipts are in PROGRESS. The suite
covers password-only server/API/DB denial; incorrect/expired/reused/replaced codes;
resend/account/IP and attempt controls; exact user/session binding; refresh/new login;
revocation/email/grant changes; delivery/audit failure; and ORG-016 email-only participant/authenticator Super Admin policy. Managed API tests use synthetic identities, no-delivery hooks and
the actual GoTrue image recorded by CI; no SMS hook/provider/phone fixtures are installed. Accelerated clock fixtures are identified.
Local SQL is NOT TESTED; real delivery, cookie exchange, human devices/screen readers,
actual object-storage policies and recovery UAT remain NOT TESTED/BLOCKED.

Manual review can use the local synthetic lab without contacting a provider:

1. Select regular staff and start the simulated password login. The protected probe
   must deny until the fresh test-inbox email code is verified; successful proof
   remains AAL1 and every operational workflow remains closed.
2. Try an incorrect code, immediate resend, expired/replaced/reused code and the
   provider/audit failure simulations. Check clear recovery feedback with keyboard,
   paste and Arabic digit entry in both locales; confirm email text stays English.
3. Refresh and compare the original absolute deadline. Start a new login and verify
   it needs another email check. Exercise logout, suspension and email/role-change
   simulations and confirm previous access is denied.
4. Select participant and Super Admin modes to confirm their existing verification
   and authenticator-MFA steps. This checks the lab only; named-human device, screen-reader,
   actual inbox delivery/cookie and recovery rehearsals remain unperformed gates.

Recent-auth age, warning lead, privacy/retention/location, named recovery people,
verified recovery procedure, production plan/region and release approvals remain open.
ORG-016 retires Super Admin/participant SMS delivery and newest-SMS-challenge release work. Super Admin TOTP requires the current exact-session native factor proof. Native TOTP accepts a still-valid time-step code across distinct unused challenges; consumed-challenge replay is separately denied. This vendor protocol behavior must be explained during human UAT, not described as single-use email code behavior.

## Changed areas and execution boundary

| Area | Review files |
| --- | --- |
| Server email adapter | `src/features/auth/staff-email.server.ts` |
| Policy and authorization | `src/config/authentication-policy.ts`, `src/lib/auth/session-policy.server.ts`, permission contracts/parsers/authorization and managed session adapter |
| Synthetic UI/API | Auth preview service, copy/components, `src/app/api/auth-preview/route.ts` |
| Current database amendment | `supabase/migrations/20261003110812_authenticator_super_admin_policy.sql` overrides current participant/Super Admin assurance; the earlier email/session review migrations remain unchanged. Database fixtures exercise the unchanged staff receipt and current authenticator predicate |
| Managed test harness | `scripts/prepare-ci-managed-auth.ts`, managed-auth/email integration tests, unit/browser coverage and CI database-lint schema list |
| Review/deployment boundary | `vercel.json` branch deployment guard; current authentication requirements, decisions, progress and boundary notes |

The disposable CI render enables only authenticator TOTP and a private reject-email hook, with global signup disabled. Phone/SMS provider/environment overrides are rejected. Ordinary Supabase config is unchanged and no hosted project is used. Genuine TOTP enrollment/challenge/verification keeps factor secrets in process memory and computes RFC6238 test codes without logging them.
Official [TOTP documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp) and the pinned [managed MFA implementation](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/mfa.go) describe the protocol; CI records the actual image.

## Rollback and next smallest task

Revert code only within the isolated review environment as needed; an earlier SMS draft is superseded and must not become active policy. Stop the lab and clear its opt-in.
No hosted rollback is needed because nothing is applied or deployed. Disposable fixtures
disappear at teardown; never delete production audit history or push old migrations.
Before any real regular-staff test, approve a concrete English email provider/sender,
recipient allowlist, privacy/location and delivery configuration, then wire/test the
disabled server adapter in an isolated environment. Keep recovery and live staff access
closed until their separate gates pass.
