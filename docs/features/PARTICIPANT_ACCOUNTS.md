# Participant accounts — closed release and activation guide

Scope: BL-AUTH-02/03/04, BL-AUTH-06 participant sessions, and BL-AUTH-08 dashboard
shell. Current authority is ORG-016 (email/password, verified email, no authentication
phone/SMS or participant MFA) and ORG-019 (72-hour absolute participant session).
Account creation never opens registration or any other operational workflow.

## Implemented boundary

Sign-up collects name, normalized email and password only. Existing and unknown
addresses receive the same public sign-up/recovery response. The account profile is
private and owner-scoped; the dashboard shows account state, profile name and
“Registration not open yet”. English and Arabic forms retain values during locale
switching, and Arabic uses RTL with LTR email/code entry. Transactional emails are
English-only, from `MSRC 2027 <no-reply@msrc2027.com>`.

Routes are `/{en|ar}/sign-up`, `sign-in`, `verify-email`, `forgot-password`,
`reset-password` and `my-msrc`, backed by `/api/participant-accounts`.

Supabase manages users, password hashing, password authentication and native sessions.
The organizer's password minimum is ten Unicode codepoints for sign-up, verification
password selection and password reset. Sign-in keeps compatibility with existing
shorter native passwords and does not apply the new creation minimum. Every password
request respects the pinned provider's 72-byte UTF-8 maximum, including Arabic input.
Length validation precedes user creation and code consumption; a rejected short
password does not burn a valid verification/reset code. The native handler suite
checks nine-codepoint rejection, exactly ten-codepoint acceptance, shorter existing
sign-in and a reset at the 72-byte boundary.
[Pinned Auth password limit](https://github.com/supabase/auth/blob/v2.197.0/internal/api/password.go).

The application controls six-digit verification/reset codes because the required
five-failures-per-code and three-emails-per-15-minute controls need a shared database
boundary. Codes are single-use, expire after the source-default ten minutes, and newer
codes replace older ones; resend waits 60 seconds. Protected hashes, account/IP limits,
delivery state and atomic consumption prevent replay across requests. Provider failures
do not trigger an automatic resend.

Sign-up/resend/recovery acknowledgement precedes all account-dependent work through
Next.js `after`; existing and unknown addresses cannot be distinguished by password
hashing or email-provider latency. Form-token and public expiry timestamps share the
request clock. The callback rechecks readiness and performs one bounded attempt within
the route's 60-second execution budget. This is not a durable delivery queue or a
promise that mail was sent; interrupted/failed work requires a fresh explicit request
under the same abuse limits. Verify the deployed post-response lifecycle during UAT.
[Next.js `after`](https://nextjs.org/docs/app/api-reference/functions/after),
[OWASP recovery response guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

Supabase Admin mutations require private database
admission. Public native signup and unauthorized identity changes remain denied;
native email OTP/recovery returns a generic response while suppressing delivery and
redeemable credentials. Native tokens alone do not authorize the participant profile.

Creation is authorized by a private, expiring reservation bound to the exact random
actor ID, email and approved notice. Supabase Auth `v2.197.0` inserts the native user
before applying requested Admin app metadata. An optional reservation marker can
corroborate the private record and is stripped afterward; metadata never supplies
authorization. The disposable native suite tests this actual ordering.
[Pinned GoTrue creation sequence](https://github.com/supabase/auth/blob/v2.197.0/internal/api/admin.go#L455-L522).

The server-only `PARTICIPANT_ACCOUNTS_ENABLED` flag defaults off. Database readiness
also defaults false, and the approved Privacy notice registry is null. The published
`2026-10-04-draft` is a draft without an effective date; it must not be presented as
approved or used to admit a real account. Synthetic approved-notice fixtures are
restricted to loopback/disposable tests. Closed routes announce that accounts are
coming soon and admit no real users.

The existing database/session contract enforces verified email, an active account,
current native session and the immutable 72-hour origin. Refresh cannot restart that
clock. Password recovery invalidates previous sessions. Operational readiness stays
false; staff assurance and recovery policies are separate.

An already verified native owner may change their own password. That identity revision
invalidates earlier application session receipts and outstanding codes. If the owner
change wins a race with a pending code reset, recovery fails safely and requires a
fresh code. An active stronger grant in any edition closes participant access and
participant recovery.

## Requirement mapping

| Backlog | Source requirements | This slice |
| --- | --- | --- |
| BL-AUTH-02 | AUTH-01/06, DAT-01/04, SEC-01, LOC-01 | Minimum fields, managed password auth, generic duplicate handling, own profile |
| BL-AUTH-03 | AUTH-02, ACC-01, EML-01, SEC-01 | Six-digit protected, expiring, replacement/single-use verification and abuse controls |
| BL-AUTH-04 | AUTH-03/05, SEC-01, EML-01, ERR-01 | Generic throttled code recovery, native password update and old-session denial |
| BL-AUTH-06 participant part | AUTH-05, ROL-12, SEC-06, ERR-01; ORG-019 | Server/database 72-hour absolute admission and revocation |
| BL-AUTH-08 shell only | SCP-03, ROL-02, DAT-03, LOC-01, ERR-01 | Owner-scoped account/name/closed-registration state; no domain actions |

## Exact activation prerequisites

1. Approve final EN/AR Privacy wording, effective/version identifier, collection/legal
   basis, processor/location/transfer handling, retention and support/recovery custody.
   Add the immutable approved notice to the registry and display that exact version at
   sign-up. A flag alone cannot approve the current draft.
   Review the participant security-record retention/cleanup procedure before live use;
   the current migration does not install an automatic participant cleanup job.
2. Review and apply the pending migrations **in this order**, using the normal reviewed
   release procedure. Do not bulk-push unrelated pending migrations:

   - `20261002193800_staff_mfa_session_foundations.sql`
   - `20261002233353_regular_staff_email_check.sql`
   - `20261003110812_authenticator_super_admin_policy.sql`
   - `20261003180734_readonly_authentication_context.sql`
   - `20261004164034_participant_accounts.sql`

   The persisted-authorization and Contact migrations were separately verified on hosted
   state. Recheck migration history, ACL/forced-RLS, false operational readiness and
   native Auth guards before release. This branch applies nothing to hosted Supabase.
3. Configure Production-only private application credentials and approved email budget;
   keep the participant flag false while verifying configuration. No `NEXT_PUBLIC_`
   secret, preview delivery key, real-recipient fixture, or credential-bearing log.
4. Confirm Supabase email/password is enabled, public self-signup remains disabled,
   email confirmation is required, phone/SMS and anonymous/social/passwordless entry
   stay disabled, and native verification/recovery delivery is suppressed. During
   activation, set Supabase Auth's minimum password length to `10` and verify its
   creation/password-change policy against the server's ten-codepoint minimum and
   72-byte ceiling, including Arabic input and existing shorter-password sign-in.
   The pinned native setting supplies a secondary ten-byte UTF-8 floor; it does not
   reproduce the Arabic/emoji character count. The application server enforces the
   stricter ten-Unicode-codepoint rule for sign-up, verification and reset. Provider
   configuration supplements server validation; it does not replace it.
   No hosted password setting changes in this branch.
   [Supabase password settings](https://supabase.com/docs/guides/auth/password-security).
   Keep the
   custom-code database guards active. Configure the Send Email hook to the reviewed
   `msrc_participant.suppress_native_email` function while app-owned codes are used;
   its participant response suppresses native delivery and preserves generic recovery.
   Stage Supabase Auth's Resend custom SMTP settings and English native templates as
   detailed below, retaining the suppression hook. SMTP is then dormant for current
   participant code delivery, which continues through the Resend API. Test direct
   provider endpoints as well as the application; frontend visibility is not an
   authorization control.
5. Complete disposable migration/RLS/native-API tests and EN/AR keyboard/RTL/axe tests.
   Then run separately authorized human inbox, second-device reset/revocation,
   screen-reader and mobile UAT. API acceptance alone is not inbox delivery.
6. Through the reviewed database-owner release procedure, configure the singleton
   `msrc_participant.policy` row: `privacy_version` must exactly match the approved
   repository notice, and `email_daily_limit` must exactly match
   `PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT` within the database range `1..100000`. This range
   is a technical bound, not approved sending capacity. Set `enabled=true` only after
   the preceding gates pass, then set `PARTICIPANT_ACCOUNTS_ENABLED=true` in Production
   with a redeploy. Any budget/notice mismatch leaves the application closed.
   Registration and every operational release gate remain closed.

### Required server environment

| Variable | Activation value |
| --- | --- |
| `PARTICIPANT_ACCOUNTS_ENABLED` | Unset/false until every gate passes; then exactly `true` |
| `PARTICIPANT_AUTH_SECURITY_SECRET` | Stable private 64-hex secret for session-cookie encryption and OTP/counter/form HMAC; custodied and rotated with a reviewed plan |
| `PARTICIPANT_SUPABASE_URL` | `https://ecemjggwlzqpjcwmchrl.supabase.co` |
| `PARTICIPANT_SUPABASE_PUBLISHABLE_KEY` | Selected project's modern `sb_publishable_...` key |
| `PARTICIPANT_SUPABASE_SECRET_KEY` | Private modern `sb_secret_...` key; never exposed to the browser or used as a JWT bearer |
| `PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT` | Approved hard cap fitting actual shared quota/forecast; `1..100000`, exactly matching `msrc_participant.policy.email_daily_limit` |
| `PARTICIPANT_EDITION_KEY` | Existing intended edition identifier; no invented edition or operational window |
| `RESEND_API_KEY` | Existing verified-domain Sending-only key, stored privately |

`PARTICIPANT_ACCOUNTS_TEST_MODE` is for the strict loopback test harness only. It uses
dummy credentials, provider `127.0.0.1:3218` and app `127.0.0.1:3216`; it must never be
set on Vercel. A real approved Privacy version is a reviewed repository record, not an
environment variable, and must match the database notice value. Changing a flag or
secret cannot fabricate approval. Verify Vercel Production environment and redeploy
after authorized configuration changes.

## Supabase custom SMTP through Resend — plan only

No hosted SMTP or Auth setting is changed by this work. During the authorized staged
activation, configure custom SMTP and its English native templates with the existing
Resend setup while retaining the Send Email suppression hook and database token
guards. The hook overrides native SMTP delivery, so current participant codes continue
through the Resend API. SMTP configuration alone does not switch that delivery path.
Replace the suppression path for future native SMTP delivery only after equivalent
expiry, replay, failure limits, enumeration, revocation and native-endpoint tests pass.
[Supabase Send Email hook behavior](https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook#email-sending-behavior).

In the selected Production project's Authentication email settings, the staged owner
configuration is:

| Setting | Value |
| --- | --- |
| Sender name | `MSRC 2027` |
| Sender email | `no-reply@msrc2027.com` |
| SMTP host | `smtp.resend.com` |
| SMTP port | `465`, implicit TLS |
| Username | `resend` |
| Password | Private Resend Sending-only key restricted to the verified domain |

Resend requires a verified sending domain and API key; SMTP and API share limits.
Recheck DKIM/SPF/DMARC and key custody without changing DNS in this task.
[Resend SMTP documentation](https://resend.com/docs/send-with-smtp).

For the future native path, customize Confirm signup and Reset password templates in
English to display `{{ .Token }}` as a six-digit code, with the matching configured
expiry and instructions to return to MSRC. Do not use a magic-link URL. Keep secure
email-change handling and restrict Site URL/redirects to approved production routes.
Custom SMTP initially has a separate Supabase email-rate limit; set an approved value
that fits the shared Resend budget. Confirm settings through the current dashboard and
test the complete native path before enabling it.
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Email volume and operations

As checked on 4 October 2026, Resend Free allows 100 transactional emails per UTC day
and 3,000 per month. The team-level API rate is 10 requests/second; inbound mail and all
other applications also consume shared quotas. Actual account plan and remaining usage
must be verified at activation. [Resend limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits),
[pricing](https://resend.com/pricing).

Contact's existing hard cap is 60/day. On Free that leaves **at most 40 authentication
emails/day**, before any other usage. Each verification request/resend and password
reset consumes a send; 1,000 participants would require at least 1,000 verification
messages before retries/recovery. That source planning scenario is not approved demand
or an account-cap decision. Agree the actual signup peak, resend/reset allowance,
monthly total, hard application cap and budget/plan before activation. No paid upgrade
is provisioned here. Separate keys do not create separate team quota.

The source email defaults are distinct from the added engineering limits: form tokens
are single-use with 20 claims/IP/hour; issuance is 20/IP/hour; code consumption is
30/IP/15 minutes; password login admits five failed/pending attempts/email/15 minutes
and 20 attempts/IP/hour. Approve these release bounds and the global email cap before
opening; they are not conference capacity or organizer-approved demand.

Monitor quota, accepted/delivered/bounced mail, native-bypass denials and the approved
retention procedure using redacted operational evidence. Keep codes, passwords, token values,
addresses and personal form contents out of logs/analytics. Review provider/inbox
retention and location in the approved Privacy notice.

To close accounts, turn database readiness off, set the participant flag false and
redeploy; preserve migration/audit history. If urgent delivery interruption is needed,
the credential custodian can revoke the dedicated authentication key while considering
other consumers. Removing the schema requires a separate reviewed migration after
session/account and retention responsibilities are resolved.

Executed checks and exact receipts are recorded in PROGRESS and the draft PR. Local
Windows cannot execute the guarded native database suite without the disposable Linux
runner; local import/type checks are not database evidence. Hosted settings/migrations,
real users, real delivery and human UAT remain unperformed in this slice.
