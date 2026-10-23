# Night-3 Task 5 — abstract submission and staff review

Date: 23 October 2026. Worktree: `C:\m\codex-night3`. Decision: ENG-065.
Local source changes only, left uncommitted for Claude. The initial worktree was
clean and already contained Tasks 1–4. `docs/PROGRESS.md` is unchanged.

## Result and boundaries

The closed slice adds participant drafts/preview/finalization, scientific
settings and assignment, anonymous reviewer packets and scorecards, internal
decisions and explicit publication batches with held DRAFT English email jobs.
Requirements and release gates are detailed in
[ABSTRACT_REVIEW.md](../features/ABSTRACT_REVIEW.md).

No hosted migration or setting, seed, feature activation, participant opening,
real email, branch, commit or push was performed. No uploads or storage access
were added. Existing approved public legal text and ORG-057 email wording are
unchanged. Super Admin settings access is explicit; scientific/reviewer actions
require their own role, and scoring requires the current assignment.

## Migration and RPC contract

New, pending migration:
`supabase/migrations/20261023040912_abstract_submission_review.sql`.
It creates private forced-RLS `msrc_abstracts` tables for settings and their
versions, submissions, snapshots, ordered authors, anonymous packets, reviewer
affiliation declarations, assignments, scorecard history, decisions, batches,
publications, operation receipts, actor-scoped mutation limits and audit. There
are no client table grants. Decisions freeze the exact completed scorecard
versions; publication refuses a changed basis and requires a new decision.
There are 15 new private tables and 19 new public RPC entry points.

All RPCs return `jsonb`. `SECURITY DEFINER` functions pin `search_path=''`.
Participant calls are service-role-only, forwarding verified session claims;
staff calls use the current authenticated native session and independently
check the edition-scoped role and exact-session assurance.

| RPC | Parameters |
| --- | --- |
| `msrc_abstracts_status` | `edition_key text` |
| `msrc_abstracts_me` | `edition_key text, session_claims jsonb` |
| `msrc_abstracts_save_draft` | `edition_key text, session_claims jsonb, submission_id uuid, expected_version integer, document jsonb, operation_id uuid` |
| `msrc_abstracts_finalize` | `edition_key text, session_claims jsonb, submission_id uuid, expected_version integer, operation_id uuid` |
| `msrc_staff_research_settings` | `edition_key text` |
| `msrc_staff_research_save_settings` | `edition_key text, expected_version integer, settings jsonb` |
| `msrc_staff_research_list` | `edition_key text` |
| `msrc_staff_research_submission` | `edition_key text, submission_id uuid` |
| `msrc_staff_research_prepare_packet` | `edition_key text, submission_id uuid, expected_version integer, packet jsonb, attestation boolean` |
| `msrc_staff_research_declare_affiliations` | `edition_key text, affiliations text[]` |
| `msrc_staff_research_reviewers` | `edition_key text` |
| `msrc_staff_research_assign` | `edition_key text, submission_id uuid, reviewer_id uuid` |
| `msrc_staff_research_auto_assign` | `edition_key text, submission_id uuid` |
| `msrc_staff_research_queue` | `edition_key text` |
| `msrc_staff_research_packet` | `edition_key text, assignment_id uuid` |
| `msrc_staff_research_review_response` | `edition_key text, assignment_id uuid, response text, reason text` |
| `msrc_staff_research_scorecard` | `edition_key text, assignment_id uuid, expected_version integer, scorecard jsonb, submit boolean` |
| `msrc_staff_research_decision` | `edition_key text, submission_id uuid, expected_version integer, outcome text, reason text, instructions text, revision_deadline timestamptz` |
| `msrc_staff_research_batch` | `edition_key text, decision_ids uuid[], operation_id uuid, action text` |

The existing `msrc_outbox_claim(p_worker_id uuid, p_batch_size integer,
p_daily_cap integer)` signature remains unchanged. Its query excludes the new
`delivery_hold` jobs. Source comparison confirmed that the previous function
body is preserved except for that filter. A constraint prevents DRAFT abstract
jobs from entering `sending`/`sent`; the worker also refuses this template.

## Application contracts

- `GET/POST /api/abstracts`: strict participant document/settings/submission
  projections; save/finalize with expected version and operation ID; session-bound
  form token, bounded JSON, same-origin checks, rate limiting, private caching
  headers and safe missing-RPC state. `/[locale]/abstracts` and the gated My MSRC
  link use this boundary. `ABSTRACT_SUBMISSIONS_ENABLED` is unset by default.
- `GET/POST /api/staff-portal/research`: settings, science list/detail, eligible
  reviewers, own queue and packet; named mutations for settings, packet,
  affiliation declaration, assignment, scoring, conflict/decline, decisions and
  batch prepare/publish. Input and output allowlists prevent raw provider JSON
  from reaching the browser.
- `AbstractDocument`, `AbstractSettings`, `AbstractSubmission`, `AbstractResponse`
  and the matching `Research*` contracts preserve English scientific content,
  version identity and role-specific fields. Participants receive only published
  decision instructions/deadlines; reviewers receive no author identities or
  peer scorecards. Missing functions retain the authenticated shell.
- `abstract_decision` v1 is a DRAFT, English-only outbox template accepting only
  `reference`, `outcome`, `instructions` and `revision_deadline`.

## Check receipts

Environment observed: Node `v24.21.0`, pnpm `11.19.0`, installed Next `16.3.8`.
`C:\m\tools\bin` was placed first on PATH for package commands. No dependency
installation or runtime upgrade was made. Current Supabase changelog, function
security and RLS documentation were reviewed; the September PostgreSQL changes
concern legacy ciphers/special indexes/operators not introduced by this slice.

Initial checkpoints (not substitutes for final checks):

- PASS: focused email/outbox Vitest, 108 tests in two files.
- PASS: initial `pnpm lint`, `pnpm typecheck`, and `git diff --check`.
- FAIL, corrected: first full `pnpm exec vitest run`, 4,087 passed and three
  failed in 94 files. Two assertions required action guidance for the newly
  built science/review areas; one required an explicit analytics exclusion for
  the new private abstracts route. Existing assertions were retained.
- PASS: initial `pnpm build`, 112 generated pages.
- BLOCKED: first `pnpm db:lint` attempt stopped before database access because
  the installed CLI tried to write telemetry outside this writable worktree
  (`EPERM` under `C:\Users\XpExcellent\.supabase`). Local Docker is unavailable.

Final verification checkpoints:

| Check | Result | Observed evidence |
| --- | --- | --- |
| `pnpm lint` | PASS | Exit 0, no warnings; `lint-final5.log` |
| `pnpm typecheck` | PASS | Exit 0; `typecheck-final5.log` |
| `pnpm exec vitest run` | PASS | 4,111 tests / 94 files; `vitest-final5.log` |
| `pnpm build` | PASS | Exit 0, 112 generated pages; `build-final5.log` |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS | 290 passed / 12 intentional profile skips; native exit 0; `staff-browser-final5.log` |
| `pnpm exec playwright test -c playwright.abstracts.config.ts` | PASS | 24 passed; native exit 0; `participant-abstracts-browser-final4.log` |
| `pnpm exec playwright test -c playwright.participant.config.ts` | PASS | 148 passed / 4 intentional profile skips; native exit 0; `participant-browser-final.log` |
| `git diff --check` | PASS | No whitespace errors |
| `pnpm db:lint` with `DO_NOT_TRACK=1` | BLOCKED | Local PostgreSQL connection refused at `127.0.0.1:54322`; `database-lint-final.log` |
| `pnpm db:test` with `DO_NOT_TRACK=1` | BLOCKED | Same unavailable local database; `pgtap-final.log` |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/abstract-concurrency.test.ts` | BLOCKED | Configuration rejects absent local Supabase/loopback settings before collection; `concurrency-final.log` |
| `git checkout -- .impeccable/review/` | BLOCKED | Read-only Git worktree metadata rejects `index.lock`; subsequent diff verifies no screenshot changes to restore |

Logs are local ignored artifacts in `.tools/night3-abstracts/`. Database commands
used the installed CLI's `DO_NOT_TRACK=1` option after the initial telemetry
permission error. Native database verification remains BLOCKED; no hosted
database was accessed.

The first staff browser run completed all 298 reported cases but hung during
Windows teardown and was interrupted. A fresh build and complete final rerun
followed. Playwright's Windows shell-tree cleanup leaves its directly launched
Node test servers alive; terminating only the known test-server PIDs after the
last case releases the runner's normal summary. This is local process cleanup,
not a test retry or increased timeout.

The first new abstract browser run reported 20 passed / 4 failed: a test's broad
alert locator also matched Next's route announcer. The assertion now targets
the editor's alert. Application behavior and the failure assertions are retained.
The next complete staff run reported 284 passed / 6 failed / 12 skipped.
All six failures were mobile Science actions: an absolute screen-reader-only
table heading escaped the unpositioned horizontal scroll container, expanding
a 412px viewport's document to 586px and breaking hit testing. Positioning that
container fixed the actual geometry. Permanent EN/AR width assertions and an
ordinary click regression were added; no forced clicks or retries were used.
A fresh build preceded the complete corrected staff rerun.
That rerun reported 288 passed / 2 failed / 12 skipped: axe correctly detected
the read-only score table lacked keyboard access on mobile. Its scroll wrapper
now has a localized accessible name and focus target. The regression tabs into
it and verifies real arrow-key scrolling before the unchanged axe assertion.
The failure screenshots/traces were preserved in ignored
`.tools/night3-abstracts/failure4-*` directories.

- PASS: targeted research staff browser suite, **24/24**, native exit 0, after
  the final build; `research-browser-final5.log`.
- PASS: complete final staff suite, **290 passed / 12 intentional profile skips**,
  native exit 0, **6.6 minutes**; `staff-browser-final5.log`. All 24 new research
  cases passed, including the EN/AR keyboard-scroll, geometry and axe regressions.
- PASS: `pnpm exec playwright test -c playwright.abstracts.config.ts`, **24/24**,
  native exit 0, including EN/AR desktop/mobile and axe;
  `participant-abstracts-browser-final4.log`.
- PASS: `pnpm exec playwright test -c playwright.participant.config.ts`,
  **148 passed / 4 intentional profile skips**, native exit 0. Includes eight
  default-off abstract API/page/verified-shell checks across EN/AR and four
  device profiles; `participant-browser-final.log`.
- Supplemental only: a PostgreSQL WASM harness created the migration and ran
  **110 SQL assertions** using simplified dependency/authority/assertion stubs.
  This is not native Supabase, pgTAP authorization proof, strict database lint
  or concurrency evidence. **110 native pgTAP assertions and 10 genuine
  multi-connection integration cases are authored but BLOCKED locally.**

New mobile participant form/preview screenshots are in
`test-results/abstract-submissions/`; Science/settings/scorecard/summary captures
are in `test-results/abstracts/`. They were visually inspected alongside axe.
The Windows teardown diagnosis is preserved in `windows-teardown-probe.json`:
`taskkill /T /F` returns Access denied for an owned synthetic process; direct
termination of that owned process succeeds. No unrelated process was stopped.
The requested screenshot restore command was attempted again after the final
suite and remained blocked by the read-only Git index. Final read-only diff
checks confirm `.impeccable/review/` and `docs/PROGRESS.md` are unchanged.

## Changed files

55 source/configuration/documentation/test files are changed or new.

- Database: `supabase/migrations/20261023040912_abstract_submission_review.sql`,
  `supabase/tests/database/abstract_review.test.sql`,
  `supabase/tests/support/abstract-fixtures.psql`, and
  `tests/integration/abstract-concurrency.test.ts`.
- Participant: `src/features/submissions/` contracts, validation, frozen Unicode
  ranges, server handlers/backend/security/page state, workspace, copy and README;
  `src/app/[locale]/(preview)/abstracts/page.tsx`, `src/app/api/abstracts/route.ts`,
  `src/styles/abstract-submissions.css`, and gated link changes in the existing
  participant form/page.
- Staff: `src/features/staff-portal/research-contract.ts`, `research-client.ts`,
  `research-copy.ts`, `research-panel.tsx`, and `research-handler.server.ts`,
  the research API route, staff menu/page/shell
  and action copy, Review layout/metadata, and `src/styles/staff-research.css`.
- Delivery/privacy: `src/lib/email/outbox.server.ts`,
  `src/lib/jobs/outbox.server.ts`, `src/lib/content-security-policy.ts`,
  and `.env.example`.
- Verification: `playwright.abstracts.config.ts`, `scripts/abstracts-ui-provider.mjs`,
  abstract fixtures/browser/unit tests, staff research browser/unit tests,
  `tests/participant-e2e/abstracts-closed.spec.ts`,
  existing staff-console/action-summary/CSP/analytics assertions, `package.json`
  lint schema, and CI workflows `ci.yml` / `participant-accounts.yml`.
- Documentation: ENG-065 in `docs/DECISIONS.md`,
  `docs/features/ABSTRACT_REVIEW.md`, and this O9 receipt.

CI now runs the abstract browser suite and isolates the new concurrency suite
behind a fresh database reset with `ABSTRACT_DB_TESTS=true`. Existing pgTAP
discovery picks up the new rollback suite. These are authored CI checks, not
claims of a CI run in this uncommitted task.

## Owner / Claude review

- Run disposable database reset, strict lint, pgTAP and integration/concurrency
  tests before considering the migration; local browser results do not prove SQL.
- Approve actual scientific settings and the supported scoring policy explicitly.
  No dates, specialties, study types, rubric values or review count are seeded.
- Resolve the private evidence/virus-scanning workflow, privacy/retention and
  corresponding-author validation before opening submissions.
- Review declared PI email reconciliation and affiliation aliases: locks prevent
  races for the same canonical declared key, not identity fraud across aliases.
- Review Arabic form wording and the new DRAFT English decision template.
- Review new schema/RPC ACLs, immutable version links, batch atomicity and the
  held outbox constraint before separately authorized hosted application.
- Commit remains Claude's responsibility; all workflow and email gates stay closed.

Next task: Claude reviews and commits this diff, then runs the isolated native
database gate in CI and resolves findings before hosted application. Evidence scanning/storage,
actual scientific configuration and approved DRAFT email wording precede a
separate owner-authorized release; none is activated by this task.
