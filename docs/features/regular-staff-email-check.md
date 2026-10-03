# BL-AUTH-05/06 — Regular staff email-check amendment

ORG-015, 3 October 2026. AUTH-04/05, ROL-12, SEC-01/06, LOC-01, ACC-01, ERR-01.
This is a narrow amendment to the unmerged PR19 foundation. The original v0.5 source,
deployed authorization migration and preceding session migration remain unchanged.

## Current flow and conflicts

Regular staff use managed password sign-in followed by an application email code.
Super Admins retain password plus SMS phone MFA; participants retain managed
email/password and both email/phone verification without MFA. Any active Super Admin
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
challenge, receipt and append-only safe audit tables. API roles cannot read/write them;
only three narrow service RPCs reserve issuance, acknowledge test delivery and consume
a matching hash. An undelivered/failed challenge cannot approve access. Wrong attempts
commit their counters; audit failure rolls back verification. Transactional account/IP
locks serialize quotas and code consumption. Replacement supersedes prior challenges.
The receipt binds user, exact native session, current managed email/user version,
full password AMR and immutable grant history. Email/password/grant changes invalidate
it, including change-away-and-back. New login needs a new check; token refresh does not.
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
Participant email-verification defaults and all Super Admin SMS targets remain distinct.

No approved production SMTP/provider/sender is present. Live email delivery remains
BLOCKED; do not rely on Supabase development email. Lost-email/address changes stay
closed: revoke/suspend first, in-person identity/appointment review by a distinct
Super Admin approver and operator, approved replacement-email verification, fresh
password session and email check, current grants and safe restoration audit. Named
people, exact evidence/procedure and recent-auth timing remain TBD; no email-only
support override, password-reset bypass or self-service address change is introduced.

## Review and local preview

Branch `codex/regular-staff-email` disables Vercel Git deployment in `vercel.json` to
honor this task's no-deploy instruction. No merge, production Auth change, hosted
migration/reset/fixture, real email or SMS is performed. The new migration is executed
only in disposable GitHub CI; no Docker is required on the organizer's computer.

Set server-only `MSRC_AUTH_PREVIEW=synthetic`, clear deployment environment and start
the existing loopback lab with Node24/pnpm11.19.0. Paths `/en/staff-security-preview`
and `/ar/staff-security-preview`; select regular staff, Super Admin or participant.
The password step is explicitly simulated and test codes appear only in the test inbox.
Regular staff have no SMS enrollment or AAL2 claim. EN/AR/RTL, keyboard, paste/autofill,
expiry/resend, delivery/retry and email/role revocation states are covered. The lab
denies every Vercel environment, even if its opt-in flag is set. Restart clears memory.

## Verification and remaining gates

Current executed commands/results and exact CI receipts are in PROGRESS. The suite
covers password-only server/API/DB denial; incorrect/expired/reused/replaced codes;
resend/account/IP and attempt controls; exact user/session binding; refresh/new login;
revocation/email/grant changes; delivery/audit failure; and unchanged participant and
Super Admin policy. Managed API tests use synthetic identities, no-delivery hooks and
the actual GoTrue image recorded by CI. Accelerated clock fixtures are identified.
Local SQL is NOT TESTED; real delivery, cookie exchange, human devices/screen readers,
actual object-storage policies and recovery UAT remain NOT TESTED/BLOCKED.

Recent-auth age, warning lead, privacy/retention/location, named recovery people,
verified recovery procedure, production plan/region and release approvals remain open.
Super Admin native SMS still needs shared direct-Auth abuse controls and a trusted
newest-challenge receipt: native older unexpired challenges remain a release blocker.
The regular-staff email amendment does not silently resolve those separate gates.

## Rollback and next smallest task

Revert this amendment to restore the prior draft flow; stop the lab and clear its opt-in.
No hosted rollback is needed because nothing is applied or deployed. Disposable fixtures
disappear at teardown; never delete production audit history or push old migrations.
Before any real regular-staff test, approve a concrete English email provider/sender,
recipient allowlist, privacy/location and delivery configuration, then wire/test the
disabled server adapter in an isolated environment. Keep recovery and live staff access
closed until their separate gates pass.
