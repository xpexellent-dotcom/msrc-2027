# 2026-10-17 — Staff authenticator sign-in hotfix (claude/totp-hotfix)

## Problem
Production Super Admin authenticator (TOTP) sign-in failed after #90 (ENG-044). The deployed handler calls
`msrc_staff_totp_begin` / `msrc_staff_totp_finish` (migration `20261016120000`) and `msrc_staff_login_failure`,
but the hosted database's last applied migration is `20261007195540_staff_password_change`, so these functions do not exist.
PostgREST answers 404 `PGRST202`, the RPC helper threw, and every verification ended as `unavailable`.

## Fix
- `backend.server.ts`: a 404 with code `PGRST202` now throws `StaffRpcMissingError`; every other failure stays a generic outage.
- `handler.server.ts`: only for that error, TOTP verification falls back to the pre-ENG-044 path (provider verify, then the
  `msrc_staff_auth_event` audit, then the persisted-session recheck). A failed sign-in closes its attempt with the pre-ENG-044
  `msrc_staff_login_finish(null, null)` call. Once the migrations are applied, the lockout path is used automatically.
- Any other reservation failure still fails closed.

## Checks (Node 24.21.0)
- ESLint 0 warnings, typecheck, unit tests 2,899 / 2,899 (5 new), `git diff --check`.
- Staff browser suite: 64 passed / 6 skipped / 0 failed.
- Hosted function list read-only (pg_proc): confirmed the three functions are absent. No hosted changes made.

## Owner follow-up
Applying the pending migrations in order (with a backup first) restores the 5-attempt lockout and the failed-sign-in audit.
