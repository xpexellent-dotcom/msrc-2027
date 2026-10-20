# Task 1b — early-access list and auto-pass integration

20 October 2026. Worktree `C:\m\codex-early`; existing branch
`codex/early-access-autopass`; starting and final HEAD
`3525177fddd682ba593dde827796ae3f78e3d957`. Initial worktree was clean. ENG-051's
backend and Claude's UI were already committed/merged. This task leaves all new
changes uncommitted for Claude. ENG-052 was reserved after checking the register's
highest used number, ENG-051. Authority: current Task 1b, ORG-055/056; requirements
REG-01–08, ADM-01/02/04/05, ROL-07/10/12, PRV-03/05/06, SEC-01/02/06,
LOC-01/03 and ACC-01.

No hosted migrations/settings/seeds, participant opening, real email, deployment,
feature activation, branch creation, commit or push. Test flags are confined to
the existing synthetic local Playwright processes. `docs/PROGRESS.md` and all
migrations are unchanged. The earlier backend receipt remains historical evidence.

## Result and changed files

- `src/features/staff-portal/ui-contract.ts`: add `early-access` to `StaffScreen`.
- `staff-portal.tsx`: import/render `EarlyAccessPanel` with `view.earlyAccess`,
  shared search, `act` and `setDecidedText`; add area/title routing. Current errors
  take precedence over old result text, and explicit searches clear old feedback.
- `staff-page.tsx`: include early access in the server page's role projection.
  Existing `menu.ts` already restricts it to Super Admins through
  `security.grant.manage`; the API/RPC independently enforce authority.
- `early-access-panel.tsx`: use server `added`/`removed` counts; clear selections
  on search and restrict bulk removal to displayed entries; prevent wrapped
  removal labels. Existing normalization, invalid-entry correction, account and
  request indicators remain intact.
- `copy.ts`, `console-copy.ts`: EN/AR built-tool action guidance and exact result
  wording, including zero added for duplicates. No dates or operating settings
  were introduced.
- `tests/unit/staff-action-summary.test.ts`: updated expected Super Admin guidance.
- `tests/unit/staff-registration-queue.test.ts`: four added cases through the real
  HTTP RPC adapter and handler with mocked HTTP responses: read/add/remove mapping,
  partial invalid results, missing RPC versus outage, and session preservation.
- `tests/staff-e2e/staff-console.spec.ts`: fixture and 24 new executions across
  EN/AR desktop/mobile; console file now has 62 cases. Covers normalized paste,
  invalid return/result text, duplicate count, individual/bulk removal, account/
  request columns, search, hidden-selection prevention, Super Admin-only controls,
  missing read/add/remove RPCs, failed-refresh feedback and recovery, with axe.
- `tests/integration/staff-registration-concurrency.test.ts`: two additional
  disposable-CI cases for simultaneous normalized duplicate additions and removals,
  each requiring one transition/audit. Existing auto-pass and removal-versus-submit
  concurrency proofs are retained; audit assertions are scoped to the tested entry.
- `docs/DECISIONS.md`, `docs/features/REGISTRATION.md`, and this O9 receipt.

## Contracts and migration

No new migration or backend contract change was needed. Retained migration:
`supabase/migrations/20261020120000_early_access_list_autopass.sql`.
All RPCs below return `jsonb`:

| Signature | Result |
| --- | --- |
| `public.msrc_staff_early_access(edition_key text, search text default '')` | `{state:'ready', earlyAccess:{entries:[...]}}` |
| `public.msrc_staff_early_access_add(edition_key text, emails text[])` | `{state:'updated', added:number, invalid:string[]}` |
| `public.msrc_staff_early_access_remove(edition_key text, entry_ids uuid[])` | `{state:'updated', removed:number}` |
| `public.msrc_staff_registration_expire_offers(edition_key text)` | `{state:'updated', expired:number, offered:number}` |

HTTP/TypeScript: `StaffScreen` gains `early-access`; existing `StaffArea` already
includes it. GET `?area=early-access&q=<search>` returns `earlyAccess.entries` with
`id`, `email`, `addedAt`, `addedByName`, `hasAccount`, `hasRequest`. The handler also
accepts the existing `query` alias. POST `early-access-add` sends `emails:string[]`;
POST `early-access-remove` sends `entryIds:string[]`, mapped to RPC `entry_ids`.
Results use `invalid:string[]`, `added` and `removed`. Existing form-token, origin,
session, TOTP and batch-size validation remain. Missing functions return HTTP 503
`area-not-ready`; other provider failures return `unavailable`, without logout.

Auto-pass SQL is unchanged: staff-triggered expiry uses the edition settings lock,
offers at most the released/available seats in `created_at,id` order, and preserves
capacity and idempotency. No scheduler, participant acceptance or notification
producer is added. Approved settings remain owner-entered, never code defaults.

## Observed checks

All commands used `C:\m\tools\bin` first on PATH: Node `v24.21.0`, pnpm `11.19.0`.
Logs are under `.tools/early-access-integration/`.

| Check | Final observed result | Evidence |
| --- | --- | --- |
| `pnpm lint` | PASS, exit 0 | `lint-final.log` |
| `pnpm typecheck` | PASS, exit 0 | `typecheck-final.log` |
| `pnpm exec vitest run` | PASS, 3,024 tests / 68 files | `vitest-final.log` |
| `pnpm build` | PASS, 103 generated pages; early-access route included | `build-final.log` |
| `pnpm exec playwright test -c playwright.staff.config.ts` after fresh build | PASS, 104 passed / 6 intentional desktop skips / 0 failed / 0 retries; exit 0 | `staff-playwright-final.log` |
| New early-access browser cases | PASS, 24 executions; 12 new axe scans with zero violations | Included in full staff result |
| Closed-route/API smoke on isolated local port 3319 | PASS, 5 cases: EN/AR 404/no form/noindex plus closed GET/add/remove API 503, no cookies | `closed-smoke.mjs`, `closed-smoke.log` |
| Visual review | PASS, all four EN/AR desktop/mobile early-access captures inspected; RTL and LTR emails preserved | `.tools/staff-console/{en,ar}-early-access-{staff-desktop,staff-mobile}.png` |
| `git diff --check` | PASS, exit 0 | Final worktree check |
| `git checkout -- .impeccable/review/` | BLOCKED: worktree index lock permission denied; no screenshots in that directory changed | `git diff --quiet -- .impeccable/review/` PASS, exit 0 |
| pgTAP, strict database lint and genuine DB/concurrency integration | BLOCKED locally: Docker executable absent | Must run in disposable Linux CI |
| Human inbox/device/assistive-technology UAT; hosted application/activation | NOT TESTED / not performed | Separate release gates |

Only the staff browser suite was modified. The main, staff and staff-password
Playwright configs were inspected; no other browser suite/config was changed or
run. Port 3210 was not used. The separate closed HTTP smoke used 3319 and
terminated its own server.

Initial failures were retained: typecheck caught a fixture literal-array inference
(`string` versus `not-an-email`), fixed with an explicit `string[]`; the first full
browser run had 96 passes, 4 failures, 6 skips because an unscoped alert locator
also matched Next's route announcer. Scope now targets the staff workspace and
preserves the denial assertion. Initial log and traces are retained in
`staff-playwright.log` / `initial-staff-results/`; no retry or timeout was increased.

Both local browser runs finished their tests but stalled during Windows webserver
teardown. After all case results were written, the two test-owned listener PIDs
on 3219/3220 were verified by port, start time and Node path, then stopped with
`Stop-Process`; the runner emitted its summary and final exit code. The final
run exited 0. Playwright's installed Windows cleanup ignores `taskkill` failures
and waits for closure; the specific cleanup failure remains unproven. No shared
configuration/dependencies or owner app process was changed.

Independent source review found the hidden-selection and stale-feedback issues;
both were fixed and covered by passing regressions. Final source review is clean.

## Owner and Claude handoff

No new product question blocks this integration. ORG-056's approver names and
opening-night support rota remain owner questions. Activation still needs separate
authorization, migration/DB evidence, owner-entered settings and relevant release
gates; the existing auto-pass sweep runs on staff activity, not a scheduler.

Claude should review the EN/AR UI/result wording, the two new database concurrency
fixtures and this receipt, then commit the uncommitted changes and obtain disposable
Linux CI evidence for the existing migration chain, pgTAP, strict lint and integration
tests. No hosted or participant-ready claim follows from these local mocks.
