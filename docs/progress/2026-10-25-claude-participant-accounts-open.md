# Participant accounts opened — 25 October 2026

ACTIVATION.md B3, owner-approved ("Open now"). `docs/PROGRESS.md` unchanged (O9 rule).

## Configuration
- Supabase Auth: native signup off; Send Email hook enabled to
  `msrc_participant.suppress_native_email`; minimum password length 10;
  leaked-password protection on (Pro). Custom SMTP set to Resend
  (`smtp.resend.com:465`, user `resend`, sender `MSRC 2027 <no-reply@msrc2027.com>`);
  the owner entered a dedicated Resend key. Participant codes still go through the
  Resend API, not SMTP, while the hook is active.
- Database: `msrc_participant.policy` enabled, privacy `v1.0`, daily cap 1000;
  retention on with 30-day unverified cleanup. `msrc_participant_status()` reports
  every readiness flag true.
- Vercel: `PARTICIPANT_ACCOUNTS_ENABLED=true`; production redeployed
  (`dpl_7PzNsfhsz4DSYq2yojwtUkWYpUsh`, commit `cadeb02`).

## Verification
- `/en/sign-up`, `/ar/sign-up`, `/en/sign-in`, `/ar/sign-in` return 200;
  `/api/participant-accounts` reports `ready`.
- Owner test with two aliases (EN and AR): codes received, both accounts verified,
  both signed in and out. Database: 2 verified profiles, 2 consumed codes.
- A first attempt with the owner's staff login email produced no email, as designed:
  staff identities cannot become participants and the acknowledgement is generic.

## Still closed
Registration, abstracts, competitions, workshops, transactional outbox delivery.

## Undo
ACTIVATION.md B3 "Undo": set the policy flag false, set the Vercel flag false,
redeploy, then confirm the EN/AR paths are closed.
