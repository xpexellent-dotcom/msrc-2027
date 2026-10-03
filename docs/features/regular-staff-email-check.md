# BL-AUTH-05/06 — Regular staff email-check amendment

ORG-015, 3 October 2026. AUTH-04/05, ROL-12, SEC-01/06, LOC-01, ACC-01, ERR-01.
PR25 includes the preceding PR19 foundation and this amendment, rebased onto current
main for one combined review. The original v0.5 source,
deployed authorization migration and preceding session migration remain unchanged.

## Current flow and conflicts

Regular staff use managed password sign-in followed by an application email code.
ORG-016 now requires Super Admin password plus authenticator TOTP; participants use managed
email/password and verified email only, without phone collection/verification or MFA. Any active Super Admin
grant across editions selects the stronger requirement. Role scope, ownership,
assignment checks, participant 72h absolute and staff 30min idle/8h absolute are preserved.
All operational flags and readiness stay false; no live accounts or grants are created.

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
The managed-cookie continuation exposed that PostgREST GET/HEAD uses a read-only
transaction: the earlier predicate's locking context could deny even a completed
staff session. Additive review migration
`20261003180734_readonly_authentication_context.sql` provides read-only observation
without creating state, extending activity, marking expiry or writing audit. Missing
initialized state denies. The trusted read-write context retains original initialization
and serialized mutation behavior. Role/ownership and current assurance must share
one statement snapshot; stable `public.msrc_read_access_context(text)` and
`public.msrc_second_step_satisfied()` are the RLS integration contract. Keep volatile
`public.msrc_access_context(text)` for the existing POST initialization/metadata path;
do not place that locking initializer inside a read policy.
Revocation committed after a statement begins affects subsequent statements, as with
normal database snapshots. Pure reads evaluate deadlines at `statement_timestamp()`:
a read admitted before expiry can finish afterward; the next statement denies, even
within the same open transaction. This never records activity or moves a deadline.
The unchanged locked server/write/consume paths still resample `clock_timestamp()`
after waits. No password, receipt, email, grant, native factor/session or revocation
proof is removed. See the
[PostgREST transaction contract](https://postgrest.org/en/stable/references/transactions.html).
The time/snapshot distinction follows PostgreSQL17's
[function volatility](https://www.postgresql.org/docs/17/xfunc-volatility.html) and
[current-time functions](https://www.postgresql.org/docs/17/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT).
The authenticated self-read projection retains the intentional SECURITY DEFINER
review exception: fixed empty search path, qualified private objects, own current
identity/session, authenticated-only execution and false readiness. Private observer
helpers have no client/service-role execution. Record advisor findings; do not hide
them by granting private-table access. This new projection is not deployed.
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
migration/reset/fixture or SMS is performed. The dated isolated self-recipient email
exception permits synthetic test-code delivery; it does not configure production email.
The existing review migration is executed
only in disposable GitHub CI; no Docker is required on the organizer's computer.

Set server-only `MSRC_AUTH_PREVIEW=synthetic`, clear deployment environment and start
the existing loopback lab with Node24/pnpm11.19.0. Paths `/en/staff-security-preview`
and `/ar/staff-security-preview`; select regular staff, Super Admin or participant.
The password step is explicitly simulated. By default email codes appear only in the
synthetic test inbox; Super Admin authenticator codes come from the transient QR/manual setup.
Regular staff have no native MFA enrollment or AAL2 claim. EN/AR/RTL, keyboard, paste/autofill,
expiry/resend, delivery/retry and email/role revocation states are covered. The lab
denies every Vercel environment, even if its opt-in flag is set. Restart clears memory.

Optional Windows test delivery uses server-only `MSRC_AUTH_PREVIEW_EMAIL=isolated`
and the privately configured `MSRC_ISOLATED_EMAIL_SELF_RECIPIENT`. The ignored local
`Send-IsolatedStaffCode.ps1` helper owns the confirmed self-recipient, existing private
DPAPI credential and persistent test-send reservations. Codes travel only through
bounded stdin, never arguments, logs, API responses or the preview inbox. EN/AR copy
directs the tester to the approved mailbox and exposes safe expiry/resend states.
Invalid mode, absent helper/configuration, CI/deployment, timeout or uncertain delivery
returns unavailable without a visible-code fallback or automatic retry. SMTP acceptance
is distinct from inbox receipt. This test dependency is intentionally outside Git and
CI; cloning the branch alone does not configure real test mail.

`managed-staff-lab.server.ts` composes genuine password sign-in, the existing private
email-check service and current database context behind an opaque HttpOnly/SameSite
cookie on a disposable CI loopback HTTP listener. Native access/refresh tokens remain
in bounded server memory. Host/Origin/socket IP, body/input bounds and no-cache headers
are enforced. It denies password-only access and rechecks current user/session/role,
receipt and immutable native timing before protected access and before/after refresh.
A new password login needs a new check. Logout first revokes private own-session state,
then requests native logout; native failure returns unavailable while the local cookie
and record are removed. Successful native logout and partial native failure are distinct
test cases. The CI factory rejects hosted/linked/deployed configuration and non-synthetic
allowlists. It creates no production Next route, session store, permission or SMTP setting.
Secure cookies and durable session-store/cache configuration remain production design
and release work; HTTP without Secure is restricted to the CI loopback listener.

## Verification and remaining gates

Current executed commands/results and exact CI receipts are in PROGRESS. The suite
covers password-only server/API/DB denial; incorrect/expired/reused/replaced codes;
resend/account/IP and attempt controls; exact user/session binding; refresh/new login;
revocation/email/grant changes; delivery/audit failure; and ORG-016 email-only participant/authenticator Super Admin policy. Managed API tests use synthetic identities, no-delivery hooks and
the actual GoTrue image recorded by CI; no SMS provider, delivery hook or phone-enrollment
flow is installed. A rejected phone-factor SQL fixture proves it cannot satisfy the
Super Admin authenticator policy. Accelerated clock fixtures are identified.
Local SQL is NOT TESTED; executed isolated delivery and managed HTTP/cookie results
are recorded separately in PROGRESS. Human inbox possession/login, devices/screen readers,
actual object-storage policies and recovery UAT remain NOT TESTED/BLOCKED. Storage is
disabled in CI: an unavailable object route establishes no private-object policy proof.

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
   inbox possession with managed login/cookies and recovery rehearsals remain unperformed gates.

For the optional private Windows email test, open the running inbox-mode preview at
`http://127.0.0.1:3221/en/staff-security-preview` (or `/ar/staff-security-preview`).
Choose regular staff, **Simulate staff password sign-in**, then **Send an isolated
test email code**. Check Inbox and Spam in the confirmed self-recipient mailbox for
the English subject **MSRC 2027 isolated staff sign-in code** and enter its six digits
in the preview within five minutes. Do not paste the code into chat. The preview
shows no code; delivery failure/expiry has accessible retry/resend guidance. Request
a fresh code for manual testing because the earlier automated code has expired.
Respect persistent cooldown/send reservations; do not reset them to force a retry.
This uses a simulated password/session with real test email. CI separately proves
managed password/database/cookies with no delivery; neither proves the combined
managed-login/real-inbox/human flow. Production authentication stays closed.

Recent-auth age, warning lead, privacy/retention/location, named recovery people,
verified recovery procedure, production plan/region and release approvals remain open.
ORG-016 retires Super Admin/participant SMS delivery and newest-SMS-challenge release work. Super Admin TOTP requires the current exact-session native factor proof. Native TOTP accepts a still-valid time-step code across distinct unused challenges; consumed-challenge replay is separately denied. This vendor protocol behavior must be explained during human UAT, not described as single-use email code behavior.

## Isolated sender diagnostic — 3 October 2026

Current result: isolated verified-TLS AUTH 235, SMTP acceptance and exact reviewed
message observed in Primary Inbox PASS after an account-address correction explicitly
confirmed by the organizer. Read-only Google Security inspection verified 2-Step ON.
The earlier 535 results rejected the earlier username/credential pair; the replacement
is valid for the corrected account in this test. No password change was needed.
Both local credentials and all eight attempt records are retained with private ACLs.
Targeted corrected-account 23 and existing AUTH89/readiness56/wrapper77/retry63 synthetic
checks passed in both PowerShell versions. Keep selected address details outside Git.
This completed sender readiness for the isolated test. The subsequent isolated staff
delivery/cookie slice is described above with current receipts in PROGRESS;
human login/accessibility UAT remains untested. Production email configuration and all
existing release gates are unchanged. Commands and history follow in PROGRESS.

Standing organizer approval covers small isolated test emails from/to the selected
Gmail inbox without repeated send-approval questions. Local credentials use Windows-user
encryption/private ACLs outside Git; fixed atomic attempt markers prevent blind repeats.
Preserve all earlier credential/attempt records; no secrets or provider text are logged.
Executed commands, earlier failures and synthetic diagnostic counts are in PROGRESS.
Sender readiness does not prove a managed staff login/email/cookie flow, native
participant email verification, recovery or production readiness.
No production mail adapter, SMTP configuration, readiness flag or Auth setting was
activated. Do not repeat approval questions for authorized isolated test mail. Existing security,
recovery, privacy/location, recent-auth, warning-lead and human UAT gates remain open.

## Foundation closeout and organizer feedback

The organizer reported that the isolated preview works and requested finishing the
foundations without an additional recovery rehearsal. Closed BL-AUTH-05/06 development
is implemented and verified, with current receipts in PROGRESS; no recovery page or
native reset adapter is added. The responsible recovery role is Super Admin, with
the existing distinct-person/in-person safeguards. Actual names and exact trusted
evidence/procedure remain unresolved.

Record the preview result as user-reported success. The exact device/locale/keyboard/
screen-reader extent was not supplied; combined genuine-managed-login/real-inbox human
UAT, genuine recovery and production/storage policy approval remain separate gates.
Live staff access, every operational workflow and all readiness stay closed.

Next checklist development item: BL-PUB-06 Contact and BL-PUB-08 Privacy/Terms, starting
with truthful bilingual closed scaffolds until controller/contact and approved legal
processing/location/retention facts are available. Rebased PR25 review against main is separate.

## Changed areas and execution boundary

| Area | Review files |
| --- | --- |
| Server email adapter | `src/features/auth/staff-email.server.ts`; optional Windows test bridge `src/lib/email/isolated-staff-preview.server.ts` |
| Policy and authorization | `src/config/authentication-policy.ts`, `src/lib/auth/session-policy.server.ts`, permission contracts/parsers/authorization and managed session adapter |
| Synthetic UI/API | Auth preview service, copy/components, `src/app/api/auth-preview/route.ts` |
| Current database amendment | `supabase/migrations/20261003110812_authenticator_super_admin_policy.sql` overrides current participant/Super Admin assurance; the earlier email/session review migrations remain unchanged. Database fixtures exercise the unchanged staff receipt and current authenticator predicate |
| Read-only assurance correction | `supabase/migrations/20261003180734_readonly_authentication_context.sql`; private snapshot observers and stable read projection for ordinary Data API RLS reads; prior migration snapshots preserved |
| Managed test harness | `scripts/prepare-ci-managed-auth.ts`, `src/features/auth/managed-staff-lab.server.ts`, managed-auth/email/cookie integration tests, unit/browser coverage and CI database-lint schema list |
| Review/deployment boundary | `vercel.json` branch deployment guard; current authentication requirements, decisions, progress and boundary notes |

The disposable CI render enables only authenticator TOTP and a private reject-email hook, with global signup disabled. Phone/SMS provider/environment overrides are rejected. Ordinary Supabase config is unchanged and no hosted project is used. Genuine TOTP enrollment/challenge/verification keeps factor secrets in process memory and computes RFC6238 test codes without logging them.
Official [TOTP documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp) and the pinned [managed MFA implementation](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/mfa.go) describe the protocol; CI records the actual image.

## Rollback and next smallest task

Revert code only within the isolated review environment as needed; an earlier SMS draft is superseded and must not become active policy. Stop the lab and clear its opt-in.
No hosted rollback is needed because nothing is applied or deployed. Disposable fixtures
disappear at teardown; never delete production audit history or push old migrations.
Next, complete human inbox/code-entry and EN/AR device/keyboard/screen-reader UAT in
the isolated preview, then document named distinct recovery custodians and rehearse the
approved revoke-first procedure. Recent-auth age and warning lead remain unset.
Before production delivery, approve concrete English provider/sender/custody, privacy/
location and durable session/cookie configuration. Keep recovery and live staff access
closed until their separate gates pass. Stop the preview and clear the email opt-in to
return to default synthetic delivery; preserve private credentials and attempt records.
