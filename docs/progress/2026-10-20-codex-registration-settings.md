# Task 2 — Registration settings (ENG-053)

20 October 2026. Built on the clean `C:\m\codex-early` worktree containing
ENG-051/052 and the early-access console. Read AGENTS.md, the project brief,
decisions, progress, relevant REG/CFG/TIM requirements, and incumbent staff and
registration code. ENG-052 was the highest number before reserving ENG-053.
`docs/PROGRESS.md` is unchanged under O9. Work remains uncommitted for Claude.

## Delivered

- EN/AR `src/app/[locale]/staff/registration-settings/page.tsx` and Super Admin
  menu entry, using the existing staff console, native scrolling and RTL.
- Native fields with explicit Riyadh-local date conversion, free selected only
  in an unsaved draft, fixed read-only age 18, and a read-only registration
  switch. No dates, capacities or offer durations are prefilled or seeded.
- Keyboard/screen-reader accessible inline confirmation with before/after
  values, focus restoration on cancel, retained drafts after failures, and a
  stable UUID for a retried save. Polling does not replace an edited draft.
- Saved-state readiness for settings completeness, participant database policy,
  registration switch, and migration availability. Missing read/save RPCs show
  `area-not-ready` without losing the signed-in shell.
- Last 20 immutable saves with performer, time and field-level before/after
  history. Display uses Riyadh time in both languages.

## Migration and contracts

Review-only migration:
`supabase/migrations/20261020130000_staff_registration_settings.sql`.

```sql
public.msrc_staff_registration_settings(edition_key text) returns jsonb
public.msrc_staff_registration_settings_save(
  edition_key text, changes jsonb, operation_id uuid
) returns jsonb
```

The private `msrc_registration.settings_audit` table has forced RLS, no client
table grants, append-only triggers, and an edition/operation unique key. The
private result helper is not client callable. Both public RPCs independently
enforce Super Admin exact-session TOTP. No client-callable
`public.msrc_registration_*` function is added.

The save locks the allocation settings row, requires READ COMMITTED, rechecks
authority after waiting, validates actual table CHECKs and the existing
`settings_complete()` gate, and refuses capacity below all current seat holders.
Initial creation also locks the edition parent. Invalid/incomplete saves roll
back their row changes. A replay returns the existing operation receipt without
another audit or overwriting later saves; changed payload/actor reuse is refused.
`enabled=true` always returns `enable-not-allowed-here`.

Added UI contracts: area/screen `registration-settings`, action
`registration-settings-save`, payload `changes`/`operationId`, response
`registrationSettings`/`operationId`, typed settings/audit/view records, and
states `capacity-below-held`, `enable-not-allowed-here`, `operation-conflict`.
The existing missing-RPC transport is reused; strict projections bind edition,
operation, allowed fields and history. Malformed data is unavailable, not a
successful save. Existing CSRF, origin, limits and native session gates remain.

ENG-053 records the legacy mapping: `early_access_start_at/end_at` always mirror
`priority_start_at/end_at`. Legacy waitlist and confirm-your-seat values remain
required because the existing completeness function requires them; the form
explains that confirmation belongs to a later step. Offer duration remains
optional under that function, but unset duration blocks offers. Paid selection
shows the conditional payment-window requirement without configuring payments.

## Checks and evidence

Runtime: Node **24.21.0**, pnpm **11.19.0**, with `C:\m\tools\bin` first on PATH.
Local logs and synthetic screenshots: `.tools/registration-settings/`.

| Check | Observed result |
|---|---|
| `pnpm lint` | PASS, no ESLint warnings/errors |
| `pnpm typecheck` | PASS, generated route types and TypeScript |
| `pnpm exec vitest run` | PASS, **3,107 tests / 69 files**, including 70 new settings cases |
| `pnpm build` | PASS, **105 generated pages**, new settings route dynamic |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS, **134 passed / 8 intentional desktop skips / 0 failed / 0 retries**, exit 0; fresh build used, ports 3219/3220 |
| Settings-only browser follow-up | PASS, **30 passed / 2 intentional desktop skips / 0 failed / 0 retries**, exit 0; includes stronger refusal/draft/retry assertions and form screenshots |
| New settings axe checks | PASS, **34 scans**, zero violations across EN/AR desktop/mobile and 320px/200% text |
| `git diff --check` | PASS |
| `git checkout -- .impeccable/review/` | BLOCKED: worktree index-lock permission denied (exit 128); `git diff --quiet -- .impeccable/review/` PASS (exit 0), so no review screenshots need restoration |
| pgTAP | BLOCKED locally; **119 assertions prepared**, no local Docker/Postgres runtime |
| Database lint / migration execution | BLOCKED locally; CI only, no result inferred from TypeScript tests |
| Genuine DB integration | BLOCKED locally; **six new concurrency/isolation cases** in existing CI-invoked staff registration suite |
| Hosted migration/settings, real inbox/device/screen-reader UAT | NOT TESTED / not performed |

The first full unit run had 3,103 pass / two fail: the Super Admin action-summary
expectation omitted the new tool, and an unused `settings.saved` general-audit
label had been added despite the dedicated audit table. Updated the exact
summary expectation and removed the nonexistent general-audit label. The final
full run above passes with all assertions retained. Additional review fixed
uppercase operation UUID normalization and invalid-capacity error precedence.

Browser coverage includes EN/AR desktop and phone entry, empty/new settings,
Riyadh conversion, readonly age/switch, free/paid validation, confirmation and
cancel focus, history, wrong-role denial, missing read/save RPCs, capacity and
operation-conflict failures, 320px width and 200% text, and axe scans. The
presentation fixture is synthetic; it does not establish database behavior.
EN/AR desktop confirmation, Arabic mobile confirmation, English desktop form
and Arabic mobile form screenshots were visually inspected. No other browser suite/config or participant/public code
was changed.

Both browser runs finished every test but stalled during Windows webserver
teardown, matching the Task 1b receipt. After all case results were written,
the test-owned listeners were verified by port, process start time and Node
path, then stopped using `Stop-Process`. The full run's listeners were
38476/39368; the follow-up's were 13820/13632. Both runners then emitted their
successful summaries and exited 0. No retry/timeout/configuration was changed
and no owner application process was stopped. Port 3210 was not used.

Database coverage includes grants/RLS, wrong roles, missing/wrong-session TOTP,
edition scope, every field and completeness requirement, timestamp ordering,
closed switch, capacity, atomic rollback, immutable before/after audit,
idempotency, last-20 ordering, and account readiness. Concurrency cases cover
both lock orders against allocation, duplicate operations, session expiry
while waiting, initial creation and REPEATABLE READ refusal.

Official references checked: [Supabase database functions](https://supabase.com/docs/guides/database/functions),
[JavaScript RPC](https://supabase.com/docs/reference/javascript/rpc),
[PostgreSQL explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html),
and [date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html).

## Owner and Claude review

Owner must confirm capacity (2,000 remains tentative) and supply the approved
terms version, closing time, places-remaining threshold, legacy waitlist offer
duration, and confirm-your-seat lead/response values. ORG-056 already supplies
free attendance, the November early/general window and a 24-hour offer; the
owner enters those values after the separate migration/release review.

Claude should review the new migration and database CI results before any
hosted application, review Arabic copy, and check the required legacy fields
against the later confirm-your-seat step. The complete-save requirement means
the owner cannot persist an incomplete draft. Participant application config,
human UAT and explicit registration opening remain separate release work.

No hosted changes, settings seed, feature activation, participant opening,
real email, scheduler, branch, commit or push was performed. Implementation and
file grouping are also documented in [the feature note](../features/registration-settings.md).

## Changed files

- Route: `src/app/[locale]/staff/registration-settings/page.tsx`.
- New staff modules under `src/features/staff-portal/`:
  `registration-settings-panel.tsx`, `registration-settings-copy.ts`,
  `registration-settings-validation.ts`, `registration-settings-contract.server.ts`.
- Existing staff modules updated: `handler.server.ts`, `validation.server.ts`,
  `ui-contract.ts`, `menu.ts`, `staff-page.tsx`, `staff-portal.tsx`, `copy.ts`.
- Styles: `src/styles/staff-console.css`.
- Database: the migration above and
  `supabase/tests/database/staff_registration_settings.test.sql`.
- Tests: `tests/unit/staff-registration-settings.test.ts`,
  `tests/unit/staff-portal-menu.test.ts`, `tests/unit/staff-action-summary.test.ts`,
  `tests/staff-e2e/registration-settings.spec.ts`,
  `tests/integration/staff-registration-concurrency.test.ts`.
- Documentation: `docs/DECISIONS.md`, `docs/features/REGISTRATION.md`,
  `docs/features/registration-settings.md`, and this O9 receipt.
