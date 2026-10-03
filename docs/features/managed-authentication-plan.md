# BL-AUTH-05/06 — Managed authentication test and decision packet

Date: 3 October 2026. Requirements: AUTH-01/02/04/05/06, ROL-12, SEC-01/06,
LOC-01, ACC-01, ERR-01, INF-02/04, CFG-09/10/11. This packet records proposed
choices separately from organizer approval and executed verification.

## Confirmed scope

ORG-013: participants use email/password and verify email and phone, without MFA.
ORG-015 replaces regular-staff SMS with password followed by a private exact-session
email check; Super Admins retain SMS phone MFA. See the
[email amendment](regular-staff-email-check.md) for the current regular-staff server,
database, controls and recovery contract. Supabase email OTP sign-in is not MFA and
is not used. No approved live email provider/sender exists; test delivery only.
ORG-012 keeps participant
72h absolute and staff 30min idle/8h absolute, measured from original session creation.
The organizer reported the current synthetic preview works and selected **Saudi
numbers only for the first test**. This does not restrict the eventual conference
audience or establish real SMS, accessibility or managed-provider UAT.

ORG-014: the organizer reports no existing SMS service, designates RPClub as the
contracting entity, shortlists Vonage with proposed sender `MSRC2027`, approves the
control/recovery targets below and chooses disposable GitHub CI testing for now.
Actual vendor eligibility, registered sender and paid spending approval remain
pending. Administrator login addresses and credentials stay out of this packet.
Production `ecemjggwlzqpjcwmchrl`, deployed authorization migration, grants and
all operational/readiness flags remain unchanged. No real email/SMS or hosted reset.

## Provider and sender decision

Organizer-approved shortlist: **Vonage SMS API**, a native Supabase integration, subject to a written
confirmation that it can register a Saudi domestic sender for the contracting entity.
If that fails, obtain a Saudi provider contract and use the supported Supabase Send
SMS Hook. This is a shortlist, not a purchase, registration or approved integration.

Proposed sender: `MSRC2027`, subject to entity authorization and carrier registration.
Saudi sender registration is required; do not assume a generic or numeric sender
can substitute. Twilio's published Saudi guidelines say it cannot register sender
IDs for Saudi-based domestic brands. Its separate Verify product does not establish
that MSRC has an eligible approved sender.

Obtain before selecting a provider:

- Legal contracting entity and authority to use the sender; written domestic-brand eligibility.
- Sender application/evidence, registration fee, lead time and supported Saudi carriers.
- SMS-only transactional route, per-segment price, taxes/fees, failed-send charges and support.
- Test account limits and allowed recipients; hard budget stop and abuse reporting capability.
- Processing locations, subprocessors, retention, deletion and the contract for the privacy review.

No vendor messages are sent by this task. The organizer can supply a quotation or
explicitly authorize contacting the chosen vendor. Credentials must use secure
provider configuration, never chat, repository, checklist, logs or public env vars.

Sources checked 3 October 2026:
[Supabase phone MFA](https://supabase.com/docs/guides/auth/auth-mfa/phone),
[Send SMS Hook](https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook),
[Vonage Saudi restrictions](https://api.support.vonage.com/hc/en-us/articles/204017033-Saudi-Arabia-SMS-Features-and-Restrictions),
[Vonage sender registration](https://api.support.vonage.com/hc/en-us/articles/9092597969436-Global-Sender-ID-Portal-FAQs),
[Twilio Saudi guidelines](https://www.twilio.com/en-us/guidelines/sa/sms).

## Hosted cost and environment approval

Read-only inspection found one connected organization, `World oF sesios`, on Free,
with two running projects. No suitable MSRC development project exists in that list;
the unrelated existing project is not a test target. Hosted organization selection
is deferred under the explicit CI-only testing choice. The initial organization
question no longer blocks this slice. This does not authorize an organization upgrade.

Hosted phone MFA requires Pro/Team and the Advanced MFA Phone add-on: first enabled
project US$75/month (US$0.1027/hour), additional enabled projects US$10/month. SMS
provider fees are separate. The Supabase spend cap does **not** cover this add-on.
Pro starts at US$25/month; paid organizations receive a shared US$10 compute credit.
Under all-month Micro assumptions, a separate Pro organization with one development
project is approximately US$100/month before SMS/taxes/fees/overages. Upgrading the
connected organization and running its two existing projects plus a third Micro
development project is approximately US$120/month under the same assumptions.
These are illustrations, not an account quote or approved budget. An organization
upgrade affects all its projects. Obtain account-specific `get_cost` and explicit
cost confirmation before provisioning, then separately confirm any plan/MFA purchase.

Paid test setup is deferred by the organizer. Hosted region, allowed recipients,
SMS budget ceiling and deletion date remain pending for a future hosted slice.
Privacy/location approval remains unresolved; no hosted
region or real-human phone collection is inferred. Disposable CI can test managed
Auth APIs without a hosted project, provider account, real phone or delivery.

Sources:
[Advanced MFA Phone billing](https://supabase.com/docs/guides/platform/manage-your-usage/advanced-mfa-phone),
[billing model](https://supabase.com/docs/guides/platform/billing-on-supabase),
[compute pricing](https://supabase.com/docs/guides/platform/manage-your-usage/compute).

## Approved OTP control targets — enforcement still required

The organizer approved six numeric digits, five-minute expiry,
60-second resend cooldown, at most three sends per phone/account per 15 minutes,
ten per day, twenty per IP per hour, and five failed entries followed by a
15-minute cooldown. Only the newest challenge may authorize access. Limits must
survive sign-in/session/IP changes as applicable and use atomic counters, generic
errors, accessible retry and minimal safe audit metadata. Each daily cap uses a
rolling 24-hour window. No permanent lockout. Typed configuration records these
targets while active provider/sender remain null and live readiness remains false.

Managed behavior must be tested separately. Supabase phone MFA documents code
validity up to five minutes and **successive codes remaining valid until expiry**.
The synthetic lab's replacement invalidation is not proof of this managed behavior.
Application UI/gateway throttling alone is insufficient where the public managed
Auth endpoints can be called directly. Required hooks/database assurance must deny
bypass before release. Participant verification settings and MFA challenge settings
are distinct; do not assume configuring one controls the other. Pending enforcement
evidence, delivery and all dependent live access remain closed.

The source review identifies these concrete implementation gates:

- A Send SMS hook must atomically reserve phone/account/IP quotas on every managed
  send path. Use authoritative `sms.phone`, not `user.phone`; always send SMS.
  Current hook payload does not identify a caller-requested delivery channel.
- MFA verification hooks expose factor/user/result, but no challenge ID. A
  factor/account-wide failure cooldown can be conservative; exact per-challenge
  accounting and participant primary-OTP failure enforcement need further work.
- Super Admin access needs a trusted assurance receipt binding actor, managed session,
  approved factor, exact current challenge and native full-precision AMR evidence.
  Native AAL2 alone must not authorize application access. Define cross-device
  replacement semantics before activating this receipt.
- Factor replacement/removal must follow the approved manual recovery and factor
  binding policy, even if native managed self-service endpoints permit a change.

These are source findings, not executed control-enforcement tests. Reviewed native
Auth source at commit
[`ce9a8eee`](https://github.com/supabase/auth/blob/ce9a8eee0cc042be8c7a42981a7ddae631e41d91/internal/api/mfa.go),
[hook payloads](https://github.com/supabase/auth/blob/ce9a8eee0cc042be8c7a42981a7ddae631e41d91/internal/hooks/v0hooks/v0hooks.go),
[MFA verification hook](https://supabase.com/docs/guides/auth/auth-hooks/mfa-verification-hook)
and [native rate limits](https://supabase.com/docs/guides/auth/rate-limits).
CI records its actual GoTrue image/version separately; the reviewed source is not
proof of a particular deployed image.

## Approved phone change/loss recovery target — operators and rehearsal pending

Keep recovery closed while recent-auth timing, custodians or verification evidence
are unresolved. Never use password reset or access to email alone to bypass staff MFA.
Do not collect national ID documents, passwords or OTPs as recovery evidence.

1. Super Admin phone loss/change request immediately suspends privileged access and revokes the
   account's applicable sessions. Record a restricted request reference and reason.
2. A named approver verifies the staff appointment and identity using an approved
   in-person verification procedure. The requester cannot approve their
   own reset. A distinct named operator executes the approved reset.
3. Revoke old phone factors/session assurance and require a new password sign-in
   plus new-phone SMS enrollment. Recheck current scoped grants before restoring
   any access. Deny all other sessions and stale tokens throughout.
4. Audit approver/operator/request/outcome references without codes, full phone,
   passwords or identity documents. Send an English security notice only through
   the separately approved email service; console/test email for this task.
5. Participant phone changes require the approved recent-auth and verified-email
   process plus verification of the replacement phone. If possession of the old
   phone is lost, use the approved manual identity procedure and revoke sessions;
   do not treat participant phone verification as MFA or grant staff authority.

The organizer approved this target and selected **Super Admin** for both roles,
with distinct people and **in-person** identity review. Individual approver/operator
appointments and exact verification evidence/rehearsal remain TBD. This does not
authorize a live reset or release; recent-auth-dependent changes stay closed.
ORG-015 regular-staff email loss/change retains these approval, in-person identity,
revocation and audit controls, with verified replacement email plus a fresh password
session/email check. Exact evidence and custodians remain unresolved; no live email
change/recovery endpoint or inbox-only bypass is introduced.

## Smallest independent integration slice

Use the existing disposable GitHub CI Supabase stack and genuine managed Auth APIs.
Keep public signup disabled; create only uniquely scoped synthetic fixture identities.
Phone challenge delivery goes to a private test-only SMS hook/inbox, never a provider.
The test consumes generated inbox codes into memory and withholds credential-bearing
SDK/SQL output. Cleanup removes the inbox/hooks; all fixture identities and immutable
safe audit evidence disappear with the disposable stack/runner teardown.
CI-only configuration must refuse any hosted project, non-loopback API or non-test
container. No Docker installation or database reset is needed on the user's computer.

Verify actual password/AAL1 then phone-MFA/AAL2 and AMR, missing/wrong/stale factor,
participant verification without MFA, logout/refresh origin, suspension/reset denial,
and provider/hook failure. Existing SQL clock/concurrency tests continue to cover
72h/8h/idle boundaries; accelerated fixtures must be identified as such. Report
executed API checks separately from hosted delivery, browser cookie exchange,
approved controls/recovery and real-human UAT. No new hosted migration is authorized.

Files: `scripts/prepare-ci-managed-auth.ts` injects runner-only configuration;
`tests/unit/ci-managed-auth-config.test.ts` checks rejection of hosted/unexpected
targets; `tests/integration/managed-auth.test.ts` uses the pinned SDK and actual
GoTrue APIs; `.github/workflows/ci.yml` prepares the isolated stack and records
its Auth image. The normal `supabase/config.toml` is unchanged. The ORG-014 API test slice added no migration,
dependency, provider credential or hosted project. ORG-015 separately adds the review-only
regular-staff email migration; previous migrations remain unchanged.

Commands: local `pnpm check` for lint/types/units/build, then automatic isolated
GitHub CI `pnpm db:reset` (explicit **local** target only), `pnpm db:lint`,
`pnpm db:test`, security advisors, generated-type compile, `pnpm db:env`,
`pnpm db:integration` and stack stop. The managed integration command is not run
on this computer; the harness explicitly requires a GitHub-hosted Linux runner,
the exact repository/container and loopback origin. CI test spacing is one second
to keep test duration bounded; it does not validate the approved 60-second live
cooldown or production quotas. Accelerated expiry fixture writes only CI records.

## Release and rollback

Recent-auth timing, warning lead, privacy/location and real-human UAT remain open.
The live security-email provider/sender and production plan/release gates also remain
open. Keep all operational and privileged readiness false. No participant signup,
CMS or downstream workflow is added by this test slice.

Rollback independent CI changes by reverting the test/harness commit; ephemeral
fixtures disappear on cleanup/stack shutdown. No hosted or production rollback is
needed. A future hosted test requires an approved exact cost, organization, region,
recipient allowlist, configuration record, minimal schema plan and teardown plan.
