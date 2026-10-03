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

Additive review-only migration `20261003110812_authenticator_super_admin_policy.sql` supersedes earlier SMS functions without rewriting snapshots or activating access. The additive read-only context correction is also review-only. Genuine managed password/staff receipt/HttpOnly-cookie composition now passes in disposable no-delivery CI; production Secure cookies and durable session storage remain gates. Storage stays disabled; actual private-object policies require later feature tests. [Official TOTP documentation](https://supabase.com/docs/guides/auth/auth-mfa/totp); [pinned GoTrue MFA source](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/mfa.go).

## Controls and unresolved configuration

Approved staff email controls remain6digits/5min,60s resend,3/account/15min,10/account/rolling24h,20/IP/hour,5wrong/code then15min account cooldown,newest only. Participant email defaults remain separate. TOTP protocol/lab bounds are not newly approved production abuse policy.

No approved production SMTP/provider/sender is configured. The organizer has separately
approved small English isolated self-recipient test emails through the private Windows
helper; do not repeat send-approval questions within that scope. One synthetic staff-code
message was SMTP-accepted, and the organizer subsequently reported that the preview works.
This does not approve production sending, other recipients or a provider configuration.
No Supabase development-email fallback is used.

Recovery preserves suspension/revocation first, in-person identity/appointment review, distinct Super Admin approver/operator, replacement verified email/authenticator, fresh password plus appropriate check, current-grant checks and safe restoration audit. Named individuals and precise verified evidence/procedure remain TBD. No live recovery/reset/address-change endpoint or inbox-only bypass.

Recent-auth age, warning lead, privacy/retention/location, production plan/region and release remain unresolved. The organizer-reported local preview result is partial human feedback; the exact device/locale/accessibility extent was not specified. Managed CI cookies and local test email are separately verified. Their combined native-login/real-inbox/human flow, screen readers, actual private storage and genuine recovery UAT remain NOT TESTED. Keep live staff access closed.

The closed authentication foundations are implemented and reviewable in PR25 stacked
on PR19; current executed receipts are in PROGRESS. The organizer requested finishing
these foundations without an additional synthetic recovery rehearsal. Recovery stays
a Super Admin responsibility with the existing distinct-person/in-person safeguards;
names, exact evidence/procedure and recent-auth age remain gates.

Before eventual activation, the dormant postgres-only maintenance helper needs complete
current session/idle/cutoff/password/TOTP/grant checks and enforcement of the actual
recent-auth age. It is currently closed by denied API execution, unconditional
factor-reset denial and the false-only readiness constraint. A nonnull timing value
or future configuration change alone would not establish a verified recovery path.

Next development item in the linked checklist: BL-PUB-06 Contact and BL-PUB-08
Privacy/Terms, starting with truthful bilingual closed scaffolds until controller,
contact and processing/location/retention facts and final copy are approved.
