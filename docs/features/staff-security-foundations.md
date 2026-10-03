# BL-AUTH-05/06 â€” Closed staff authentication and session foundations

Requirements: AUTH-01/02/04/05/06, ROL-12, SEC-01/02/06, LOC-01/03, ACC-01, ERR-01. Current authority: ORG-015/016. Historical source and dated receipts in PROGRESS remain unchanged.

## Current policy and boundary

Participants: managed email/password and verified email only, no phone or MFA. Staff: password then private exact-user/session email receipt at native AAL1. Super Admins: password then current authenticator TOTP at native AAL2, with current factor ownership/status/session and password-before-TOTP proof. Strongest tier applies across editions. Phone/generic AAL2/email receipts cannot substitute for Super Admin MFA.

Preserve explicit grants/scopes, assignment/ownership, individual identity and closed workflows. No accounts/factors/grants are activated; operational and privileged readiness remain false.

ORG-016 removes active phone/SMS configuration, collection, fixtures, provider/sender/budget work and delivery hooks. Earlier SMS migrations remain snapshots; new review-only `20261003110812_authenticator_super_admin_policy.sql` supplies current policy. Deployed `20261002173712_persisted_authorization.sql` and earlier review migrations are unchanged and must not be blindly reapplied.

## Local synthetic preview

Branch `codex/email-authenticator-no-sms` disables Vercel Git deployment. Enable server-only `MSRC_AUTH_PREVIEW=synthetic`, clear deployment and hosted-client configuration, and start on loopback. Visit `/en/staff-security-preview` or `/ar/staff-security-preview`. Every Vercel environment denies the lab even with its flag.

Password login is simulated. Email codes appear only in an ephemeral test inbox at issuance. Super Admin enrollment returns transient QR/manual setup once; status/refresh never repeat it. Successful verification/terminal states clear setup/codes; reload loses setup and requires enrollment restart. Secrets/codes never enter logs, browser storage or audit. No real messages or accounts.

EN/AR/RTL, keyboard, Arabic digit normalization, paste/autofill, expiry/resend/delivery-failure/retry and generic errors are required. Emails stay English-only. QR scanning is optional; manual key/instructions support keyboard users.

Synthetic TOTP uses RFC6238 SHA-1/6digits/30s with adjacent-step tolerance and consumed-step tracking. Challenge/failure bounds are development values. Managed TOTP can accept a still-valid code across distinct unused challenges while denying consumed-challenge replay; do not claim stricter lab behavior as provider proof.

## Enforcement and sessions

The injected managed SDK adapter selects TOTP only; live client/routes/cookies remain unwired. Private staff email checking verifies bearer/trusted recipient, generates cryptographic single-use codes, stores only keyed hashes and binds approval to current user/session/email/password/grants. See [staff email feature](regular-staff-email-check.md).

Own-context RPCs omit phone fields and never activate sessions. Current native factor/session proof and the restrictive self-only `msrc_second_step_satisfied()` predicate deny password-only/stale/foreign evidence. Client metadata never grants approval. Future domain database/storage policies must test these predicates alongside grants/ownership/readiness before opening; storage stays disabled.

Participant72h absolute; privileged30min idle/8h absolute; equality expires and original managed creation time is authoritative. Refresh cannot reset origin or touch activity. Logout/suspension/email/role/factor change revoke applicable evidence. Recent-auth age/warning lead stay null; dependent actions closed.

## Verification and manual UAT

Current commands/counts/source/CI/visual receipts are in PROGRESS. Database runtime/RLS/ACL/advisors/generated types and genuine Auth tests run only in isolated GitHub CI. Local Docker/database is NOT TESTED by design.

1. Participant password simulation plus email check permits only the synthetic own-session probe at AAL1, without phone/MFA/staff access.
2. Staff password-only probe denies; newest email code passes at AAL1. Try wrong/expired/reused/replaced codes, quotas and delivery/audit failure.
3. Super Admin enrolls with authenticator QR/manual key; missing/wrong/stale proof denies. Verify then exercise reset/suspension/logout/expiry simulations.
4. Refresh preserves original deadline; a new login needs a fresh appropriate check. Confirm both locales, keyboard/Arabic digits and setup/code removal after success or reload.

Human devices/screen readers, cookie exchange, real delivery, actual private storage policies and approved recovery rehearsal are NOT TESTED/BLOCKED. Live SMTP/provider/sender is absent; no development-email fallback.

Recovery retains revoke/suspend first, distinct Super Admin approver/operator and in-person identity/appointment review. Named people, precise lost-email/authenticator evidence/procedure/rehearsal, recent-auth, warning lead, privacy/retention/location and release remain TBD. No live reset/invitation/grant changes.

## Rollback and next task

Stop the loopback lab and clear its opt-in; restart clears synthetic memory. Revert isolated review code if needed while preserving current policy; never reactivate the superseded SMS draft. No hosted rollback is needed; nothing was applied/deployed. Never delete audit history or push historical migrations.

Next: approve English email provider/sender and an allowlisted isolated delivery/cookie test setup. Operational access and recovery stay closed until independent gates pass.
