# 2026-10-19 — Staff sign-in fixes (claude/staff-signin-fixes)

Owner report: opening Organizing-team priority signed them out ("Access could not be verified"), and an
authenticator code entered after the challenge lapsed needed a manual "start new" before it could be accepted.

## Fixes
- **Pending database tools no longer sign staff out.** The hosted database does not yet have the registration/queue
  migrations, so `msrc_staff_priority` and `msrc_staff_registration` are missing. The handler now answers
  `area-not-ready` (503) for a PostgREST `PGRST202`, and the console keeps the signed-in view when any area read fails
  (`area-not-ready`, `unavailable`, `denied`), explaining the failure in the feedback region (EN/AR). Only the session
  read decides sign-in state; the server still enforces every permission.
- **Authenticator codes always check against a fresh challenge.** `verify-totp` issues and audits a new Supabase
  challenge for the session's bound factor immediately before verification, so an expired displayed challenge never
  blocks a current code. The factor binding is unchanged. If no fresh challenge can be issued, nothing is verified (503).

## Checks (Node 24.21.0)
- ESLint 0 warnings, typecheck, unit 2,902 / 2,902 (3 new), `git diff --check`.
- Clean production build, then staff browser suite: 68 passed / 6 skipped / 0 failed (4 new: EN/AR desktop/mobile).
- Note: the staff suite runs `next start`, so it needs a fresh `pnpm build`; the 17 Oct hotfix's local staff run used an
  older build (its CI build and checks were green).
