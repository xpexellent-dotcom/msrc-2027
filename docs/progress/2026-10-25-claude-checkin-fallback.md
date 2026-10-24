# Check-in outage fallback — 25 October 2026

Decision **ENG-082**, requirement **CHK-05**. Branch `claude/checkin-fallback`.
`docs/PROGRESS.md` unchanged (O9 rule).

## Built

- Migration `supabase/migrations/20261025140000_checkin_fallback.sql` (not applied
  to the hosted database):
  - shared entitlement helpers, used by the redefined `msrc_staff_checkin`;
  - `msrc_staff_checkin_roster` (Super Admin, reference and name only, audited count);
  - `msrc_staff_checkin_offline_import` (Super Admin, 2,000 rows, idempotent
    operation ID, per-row audit, never overwrites online records);
  - `offline` attendance method, `offline_recorder` column, `offline_imports`
    receipts (forced RLS, append-only) and an `offline` running count.
- Route `/api/staff-portal/check-in-fallback`: GET roster CSV, POST import. Requires
  the Super Admin role with valid TOTP session; form token claimed before import.
- EN/AR **Outage fallback** section in Staff portal → Check-in, visible to Super
  Admins only: roster download, paste or open CSV, row check, reconcile, results
  table with review list.
- Runbook `docs/runbooks/CHECKIN_OUTAGE.md`.

## Checks

| Check | Result |
| --- | --- |
| `tsc --noEmit` | pass |
| `pnpm lint` | pass |
| Unit (`check-in-fallback`, `staff-check-in`) | 91 passed |
| `pnpm build` | pass |
| Playwright staff `check-in.spec.ts` (desktop + mobile, EN/AR) | 30 passed |
| pgTAP `checkin_fallback.test.sql`, updated `checkin_attendance.test.sql` | NOT TESTED locally (Docker not running); runs in CI |

## Remaining

- Owner OK to apply the migration to the hosted database after merge.
- Organizers to confirm who exports the roster and how it is stored and destroyed.
