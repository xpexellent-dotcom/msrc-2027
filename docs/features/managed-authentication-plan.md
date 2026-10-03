# BL-AUTH-05/06 â€” Managed authentication test and decision packet

Current authority: ORG-015/016, 3 October 2026. Requirements: AUTH-01/02/04/05/06, ROL-12, SEC-01/06, LOC-01/03, ERR-01, CFG-09/10/11. Original v0.5 source and historical decisions remain preserved.

## Approved scope and retired work

Participants: managed email/password and verified email only, no phone collection/verification or MFA. Regular staff: password followed by a private exact-user/session application email receipt at native AAL1. Super Admins: password followed by current authenticator TOTP at native AAL2, with accessible QR/manual setup and EN/AR/RTL instructions. Strongest tier applies across editions; verification grants no role or operational entitlement.

ORG-016 retires the Saudi SMS test, RPClub/Vonage/MSRC2027 shortlist, sender registration, SMS budget/control/hook and phone-recovery work. No SMS provider or paid phone-MFA add-on is needed. Prior research/quotes are historical, not current purchases or blockers.

Preserve participant72h absolute and privileged30min idle/8h absolute. Refresh never restarts origin or counts as activity. Every operational/readiness gate stays false.

## Isolated managed tests

Use the existing unlinked loopback Supabase stack in disposable GitHub-hosted Linux CI. No Docker on the organizer computer or hosted reset/seed/migration push. Global signup is disabled; only TOTP and a private reject-email hook are enabled. No phone provider, static OTP, SMS hook/inbox or delivery credentials. Synthetic fixtures disappear at teardown.

Genuine password/TOTP enroll/challenge/verify/refresh/logout APIs keep secrets and computed RFC6238 test codes only in process memory. Cover password-only, missing/wrong/stale/foreign factor, generic assurance, unauthorized reset, factor deletion, account suspension, session expiry and refresh origin. Staff private email tests retain trusted recipient, single-use/replacement/account/IP quotas, exact-session/email/password/grant binding, failure recovery and direct Data API/RLS denials.

GoTrue may accept a still-valid TOTP time-step code across distinct unused challenges; consumed-challenge replay denies. The local synthetic verifier also tracks consumed steps, a stricter lab behavior, not proof of managed global one-use TOTP. Do not conflate this with single-use staff email codes. Actual image and executed results are in PROGRESS.

Additive review-only migration `20261003110812_authenticator_super_admin_policy.sql` supersedes earlier SMS functions without rewriting snapshots or activating access. Storage remains disabled; actual private-object policies and application cookie exchange require later feature tests. [Official TOTP documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp); [pinned GoTrue MFA source](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/mfa.go).

## Controls and unresolved configuration

Approved staff email controls remain6digits/5min,60s resend,3/account/15min,10/account/rolling24h,20/IP/hour,5wrong/code then15min account cooldown,newest only. Participant email defaults remain separate. TOTP protocol/lab bounds are not newly approved production abuse policy.

No approved production SMTP/provider/sender is configured. English-only console/test email, no development-email fallback. Before any real test, approve a concrete provider/sender, allowlisted recipients and privacy/location configuration.

Recovery preserves suspension/revocation first, in-person identity/appointment review, distinct Super Admin approver/operator, replacement verified email/authenticator, fresh password plus appropriate check, current-grant checks and safe restoration audit. Named individuals, precise evidence/procedure/rehearsal remain TBD. No live recovery/reset/address-change endpoint or inbox-only bypass.

Recent-auth age, warning lead, privacy/retention/location, production plan/region and release remain unresolved. Human inbox/authenticator devices, screen readers, cookie exchange, real delivery/private-storage/recovery UAT are NOT TESTED. Keep live staff access closed.

Next smallest task: approve English email provider/sender and isolated allowlisted configuration, then test delivery and cookie/session enforcement. Recovery and production remain separately gated.
