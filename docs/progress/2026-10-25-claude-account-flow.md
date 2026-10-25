# Participant account flow and staff detail — 25 October 2026

Decision **ENG-083**. Branch `claude/account-flow`. `docs/PROGRESS.md` unchanged (O9 rule).

## Built
- Sign-up: first/last name, password confirmation, simplified password hint (EN/AR).
- Automatic continue to Verify email; live countdowns; 2-minute resend (UI and database).
- Bilingual branded code email (banner, English, Arabic RTL).
- Header "My profile" link for signed-in participants; email and member-since on My MSRC.
- Staff Participants: click a name for the full read-only record (API route
  `/api/staff-portal/participant-detail`, RPC `msrc_staff_participant_detail`).
- Migration `20261025160000_participant_account_flow.sql` (not applied to the hosted database).

## Checks
| Check | Result |
| --- | --- |
| `tsc`, `pnpm lint` | pass |
| Unit tests | 5,259 passed (adds participant-detail suite, bilingual email assertions) |
| pgTAP (local PGlite) | `participant_account_flow` 18/18, `participant_accounts` 75/75, `registration` 80/80; full suite shows only the known harness gaps |
| `pnpm build` | pass |
| Playwright participant / staff / registration entry | see PR |

## Remaining
- Owner OK to apply the migration after merge (until then the live site keeps the 60-second
  database limit, and staff detail and profile email show as unavailable).
