# Registration settings (closed implementation)

ENG-053, ORG-055/056; REG-01–08, ADM-01/04/05, ROL-10/12, SEC-01/02/06,
TIM-01/02, CFG-01, LOC-01/03, ACC-01.

The EN/AR staff route `/{locale}/staff/registration-settings` lets a Super Admin
enter a complete edition configuration, review the before/after changes, and
confirm a save. The existing native identity and exact-session TOTP gates apply
independently in the handler and database. Registration administrators cannot
read or save settings. The screen and menu remain behind the existing closed
staff portal configuration.

## Contracts

- `GET /api/staff-portal?area=registration-settings` returns the authenticated
  shell plus `registrationSettings`: `settings` (nullable), `settingsComplete`,
  `participantAccountsReady`, and `history` (latest 20 saves).
- `POST /api/staff-portal` accepts action `registration-settings-save`, the
  existing form token, `changes` (an allowlisted object with database field names),
  and a UUID `operationId`. The edition comes from trusted server configuration.
- RPCs: `public.msrc_staff_registration_settings(edition_key text)` and
  `public.msrc_staff_registration_settings_save(edition_key text, changes jsonb,
  operation_id uuid)`, both returning `jsonb`.
- Each history entry has `id`, `operationId`, `performerId`, `performerName`,
  `at`, and `changes`, keyed by field with `before` and `after` values. Database
  metadata is stripped by a strict server projection before reaching the UI.
- Safe errors include `invalid-input`, `capacity-below-held`,
  `enable-not-allowed-here`, `operation-conflict`, `denied` and `area-not-ready`.
  Missing read or save RPCs do not sign the owner out. Reusing an operation ID
  with the same actor and payload returns its receipt without another audit;
  a different actor or payload is refused.

## Configuration and release boundaries

Dates are entered/displayed in Riyadh time and converted using an explicit
UTC+03:00 offset. The early window populates both the priority and legacy early
access pairs. This preserves the existing completeness function without adding
a second owner-entered early window. Minimum age is fixed at 18.

Every save must satisfy the existing CHECK constraints and `settings_complete()`.
The legacy waitlist offer and confirm-your-seat timings are therefore required,
even though confirm-your-seat is a later step. `offer_window_hours` remains
optional under the existing database rules, but offers cannot run while it is
unset. Paid attendance conditionally requires `payment_window_hours`. Workshop
capacity is outside this screen and is preserved.

Free attendance is selected only in an unsaved new draft. Dates, capacity,
terms version, closing time, offer duration and legacy timings have no proposed
value silently persisted or prefilled. The owner enters the values. Capacity
2,000 remains pending owner confirmation.

Saving uses READ COMMITTED and the same settings-row lock as approvals/offers.
The save RPC raises SQLSTATE `25001` for any other isolation level at function
entry, before authorization, validation, operation replay or any lock. Thus
REPEATABLE READ and SERIALIZABLE cannot bypass the guard through an early return.
The seat count includes approved, approved-awaiting-payment, offered and
confirmed requests. It cannot fall below those holders. First-time settings
creation also serializes on the edition parent. Authority is checked again
after a lock wait. Invalid/incomplete saves roll back atomically, including
initial row creation. Audit rows are private, forced-RLS and append-only.

`enabled` is read-only in the screen. The save RPC refuses `enabled=true`.
It never opens registration or activates another workflow. The participant
readiness indicator describes the existing database participant-policy guard;
application configuration, human UAT and release approval remain separate.

No migration or setting has been applied to hosted infrastructure. No
participant workflow, email, scheduler or feature switch is enabled by this
source change. Database execution is a CI gate, as the local environment has no
Docker runtime. See the [O9 receipt](../progress/2026-10-20-codex-registration-settings.md)
for observed checks and owner review points.

## ENG-053 isolation regression, 20 October 2026

The isolation test reused actor 1601 after the lock-wait expiry test durably
revoked its session. Restoring the policy did not clear revocation, so the
save returned `denied` before reaching its old isolation guard. The guard now
runs first. Expiry has its own actor and verifies durable revocation; each
isolation test has fresh actors, an edition and a committed replay receipt.
Both isolation levels must raise `25001` while the settings row remains locked,
including denied, invalid, enabling, replay and conflict calls, with unchanged
settings/history. The other settings concurrency assertions remain intact.

Local checks on Node 24.21.0 / pnpm 11.19.0: `pnpm lint`, `pnpm typecheck`,
`pnpm exec vitest run` (3,107 tests / 69 files) and `git diff --check` PASS.
Database execution is NOT TESTED locally; the new regressions require disposable
CI. `docs/PROGRESS.md` is unchanged and no commit was made.
