# abs8 — Staff abstract submission window and upload gate

Date: 31 October 2026. Decision: **ENG-092** only. Authority: ORG-058,
ORG-068 / ENG-088 and ORG-069 / ENG-090. Requirements: ABS-02/09–15,
CFG-03/10, SEC-01/02/06, PRV-03–06, LOC-01–03, TIM-01/02 and ACC-01.

## Scope and starting evidence

- Worktree `C:/m/codex-abs8`, branch `claude/abstract-submission-window`, starting
  from `da4908d` / ENG-090 (PR #150, not assumed merged). Initial worktree clean.
- Read AGENTS, PROJECT_BRIEF, DECISIONS, PROGRESS, the source ABS requirements,
  abstract feature notes, existing settings/RPCs, staff research editor and
  participant/public CTA code. `docs/PROGRESS.md` was read and remains untouched.
- Existing storage: `msrc_abstracts.settings.configuration.opensAt/closesAt`,
  `enabled`, `evidence_ready`, shared version, settings history and abstract audit.
  Dates already had a general science editor; there was no staff switch control
  or combined opening-readiness checklist. The old CTA used a public calendar
  date independently of the saved operational window.
- ORG-058 publishes dates without times; the owner reaffirmed their accuracy on
  31 October. ORG-069's entry is not present in this branch; this slice cites it
  through the task authority and ENG-090's reconciled implementation. No ORG
  entry is invented or edited. No abs7 AI-advisory or supervisor-email code changed.

## Implemented

The staff research workspace has a bilingual Submission window section. Scientific
Administrators read it; only Super Admins save dates and Accept submissions.
The new RPC uses the incumbent settings row, expected-version CAS, advisory/row
locking, immutable settings versions and an actor/session-bound `window.saved`
audit. The legacy settings RPC also protects changed dates with Super Admin
authority and explicit UTC. Forced RLS, no client table policies, exact-session
staff checks, TOTP authority and READ COMMITTED guards are retained.

Inputs/display use Asia/Riyadh. Transport/storage explicitly use UTC; partial,
ambiguous, invalid or reversed date ranges are rejected on the server and in SQL.
The published-date button fills local form state only, leaving the switch and
database untouched. Suggested instants, using the owner's permitted times:

| Item | Asia/Riyadh | UTC |
|---|---|---|
| Opening, inclusive | 23 November 2026, 00:00 | `2026-11-22T21:00:00.000Z` |
| Closing, exclusive | 13 December 2026, 23:59 | `2026-12-13T20:59:00.000Z` |

The incumbent `[open, close)` interval is preserved. The minute beginning at
23:59 on closing day is outside the window; no midnight or end-of-minute extension
is inferred. No suggested time is pre-saved or seeded.

The read-only checklist reports each saved gate and its reason: enabled switch,
ordered dates, current time within the window, evidence/upload readiness, latest
screening similarity threshold, participant account policy, privacy notice,
email allowance, retention enforcement and server flags/configuration. Server
privacy/email configuration is compared with the database where available.
Clearing the latest screening threshold cannot inherit an older saved threshold;
SQL finalization enforces that gate under the same settings-row lock used by
screening settings saves.

The public CTA retains its client/server pattern. `/api/abstracts/window` returns
only state and saved dates with no-store headers, no cookies or private identity.
A narrow server-only status reader can observe the public schedule while account
flags remain off; it has no login, refresh, email or mutation operations. During
the window, all independent gates must pass before the CTA offers submission.
Before it, the CTA/private page shows the saved opening instant; after it, closed.
The CTA re-observes on focus, participant events and every minute. SQL remains
authoritative at mutation time. Public calendar copy and the incumbent temporary
preview-review rendering behavior are retained; no new dynamic public page
dependency was added. Missing RPCs/contracts show area-not-ready, keeping sessions.

## Upload decision and exact remaining blockers

**Keep the evidence/virus-scanning gate closed.** ORG-068 item 7 and ENG-088 use
ethics approval/exemption references and study/trial-registration text fields.
They do not require ethics/registration uploads. However, ABS-09/11 still require
a separate similarity-report supporting file. ENG-090's external-report
attestation/reference and internal similarity score do not remove that file
requirement. ABS-14 also retains separate stage-two final-material files.

The migration clarifies `evidence_ready` accordingly and retains the transactional
database `evidence_gate` refusal. Existing confidential stage-one evidence access
remains Super Admin only (ABS-15); blinded reviewer/AI packets and other upload
workflows are unchanged. The staff note no longer calls ethics references uploads.

Missing before that gate can be reviewed for release:

1. An abstract-specific private similarity-report upload/storage flow and metadata
   linked to the correct submission/version, with authorized ownership/access.
2. Quarantine and malware-scanning integration with authenticated, durable scan
   verdicts; fail-closed handling of infected, failed, timed-out and pending scans.
3. Approved report/provider and validation/release handling, including applicable
   transport allowlists/limits, replacement provenance and immutable snapshots.
4. Tested access isolation, safe release/download behavior, retention/deletion
   and audit, including failure and concurrency evidence. Confidential evidence
   must never enter reviewer/AI packets or ordinary staff access.

No scanning infrastructure, storage bucket, upload endpoint, hosted migration,
settings seed, feature activation or real mail was created in this task. Existing
account/email/privacy/retention, Arabic review, legal-copy reconciliation and
production release gates remain independent blockers.

## Verification

Runtime observed: Node `v24.21.0`, pnpm `11.19.0`; no package installation or lockfile
change. Logs are local ignored files at the worktree root.

| Check | Command / evidence | Result |
|---|---|---|
| Lint | `pnpm lint`; `.tools-abs8-lint.log` | PASS |
| Types | `pnpm typecheck`; `.tools-abs8-typecheck.log` | PASS |
| Full unit suite | `pnpm test`; `.tools-abs8-unit.log` | PASS — 5,613 tests, 138 files |
| Production build | `pnpm build`; `.tools-abs8-build.log` | PASS |
| Staff research | `pnpm exec playwright test --config playwright.staff.config.ts research-workspace.spec.ts`; `.tools-abs8-staff-final.log` | PASS — 40 tests |
| Abstracts | `pnpm exec playwright test --config playwright.abstracts.config.ts`; `.tools-abs8-abstracts-final.log` | PASS — 106 tests, 2 intentional width-matrix skips |
| Final staff copy/RTL polish | Same staff command; `.tools-abs8-staff-polish.log` | PASS — 40 tests |
| Isolated technical timestamps | Staff command with `--grep window`; `.tools-abs8-staff-timestamps.log` | PASS — 8 EN/AR desktop/mobile cases, axe clean |
| Patch whitespace | `git diff --check` | PASS |
| pgTAP | `pnpm db:test` | BLOCKED / NOT RUN — no local Docker; disposable CI required |
| SQL lint | `pnpm db:lint` (`--fail-on warning`) | BLOCKED / NOT RUN — disposable CI required |
| Real database concurrency | CI command `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/abstract-concurrency.test.ts` | BLOCKED / NOT RUN — Linux disposable CI only |
| Hosted migration/activation, real accounts/inboxes, hardware/AT | Outside this task | NOT TESTED / NOT PERFORMED |

New unit coverage includes Riyadh/UTC day/year/leap-day boundaries, invalid dates,
exclusive closing, every readiness gate, latest-state projections, role-bound
server saves, missing-RPC fallback and public schedule observation without
activation. pgTAP adds Super Admin-only dates/switch, CAS, invalid ranges/ambiguous
timezones, audit immutability, window/switch/evidence/threshold finalization gates
and all-ready success. Existing fixtures explicitly opt into synthetic similarity
readiness where needed. Genuine two-connection CI tests add window-save CAS/audit
and switch-off versus waiting-finalization races alongside the incumbent
window-closing/finalization race. These SQL proofs are written, **not claimed run**.

Browser coverage includes EN/AR staff controls, suggested fill without save,
UTC payload, read-only scientific-role access, all readiness rows, axe, RTL,
desktop/mobile layouts, and before/during/after/missing-capability CTA states.
Existing draft/finalize, profile, one-chance, preview-review and research-review
journeys passed. Captures are in
`test-results/abstract-consumers/{en,ar}-submission-window-{staff-desktop,staff-mobile}.png`.
English desktop and Arabic mobile captures were visually reviewed; the latter
prompted explicit LTR isolation for technical timestamps.

Initial browser attempts are not hidden: the staff provider port was occupied,
then a test import of a UI component failed to resolve Next's link module. Shared
copy was moved to a plain module. Initial new CTA tests used a test ID omitted by
the existing disabled-link component and sampled entrance animation during axe;
they now use the stable class and reduced-motion state. Corrected full suites
passed with no retries. On Windows, after all cases completed, only the fixture
server PIDs printed by these runs were stopped to allow runner cleanup; both
corrected runners exited 0. Other jobs' processes were preserved.

## Delivery and next task

All work is uncommitted on the supplied branch. Only migration
`20261031140000_abstract_submission_window.sql` is added. ENG-092 is appended;
no ORG entries or `docs/PROGRESS.md` edits, commits, pushes or branches.

Next: Claude reviews/commits this slice and obtains disposable-CI pgTAP, SQL lint
and concurrency results. Reconcile any later ORG-069 source amendment explicitly.
Keep hosted windows, upload readiness, accounts, delivery and all release flags
closed until their separate evidence and authorization exist.

## Database fix

Follow-up on `claude/abstract-submission-window`, starting at `4771608` (`wip
abs8`) over PR #150 head `4fd29ea`. Requirements ABS-12/15, CFG-03/10,
SEC-01/02/06 and TIM-01/02 remain governed by ENG-092. Fixes remain uncommitted;
`docs/PROGRESS.md` and `docs/DECISIONS.md` are unchanged.

Confirmed Claude's existing duplicate-tail removal: migration
`20261031140000_abstract_submission_window.sql` has one transaction, one copy of
each intended function, and its sole `commit;` at line 185. The retained settings
RPC preserves the fixed rubric, Super Admin window authority, UTC validation,
CAS, row locks, settings history and audit. Participant settings/finalization and
status retain the latest similarity threshold and upload readiness gates. No
PL/pgSQL function in this migration is marked IMMUTABLE.

Both reported foreign-key aborts were reproduced. The parent settings save was
returning `invalid`: the shared fixture serialized timestamptz values using the
database's `Etc/GMT-3` timezone, while ENG-092 requires explicit UTC window input.
The fixture now formats opening/closing instants as UTC `Z` strings. Parent rows
are consequently created through the existing asserted settings RPC before the
dependent screening settings inserts; no constraint or production gate changed.

The screening suite then exposed a stale CAS expectation: its synthetic readiness
setup already appended screening settings versions 1 and 2. The subsequent
asserted Super Admin save now expects version 2 instead of 0. Assertions and
security/failure coverage remain intact, including unset-threshold closure,
immutable history, reviewer isolation and investigation/decision gates.

Runtime: Node `v24.21.0`, pnpm `11.19.0`; no dependencies or lockfile changed.
Commands below ran from this worktree unless their directory is stated.

| Check | Command / evidence | Result |
|---|---|---|
| Migration replay | In `C:/m/pglite`: `& 'C:/Program Files/nodejs/node.exe' run.mjs C:/m/codex-abs8`; `.tools-abs8-database-replay.log` | PASS — `ALL OK` |
| Seven database files | In `C:/m/pglite`: `& 'C:/Program Files/nodejs/node.exe' test.mjs C:/m/codex-abs8 abstract_submission_window.test.sql abstract_submission_v2.test.sql participant_profile_complete.test.sql organizer_dashboards.test.sql research_judging_awards.test.sql abstract_review.test.sql abstract_screening_scoring.test.sql`; `.tools-abs8-database-final.log` | PASS — 663/663 assertions |
| UTC timezone cross-check | Temporary copy of the same harness with `SET TIME ZONE 'UTC'` before running review and screening files; `.tools-abs8-database-utc.log` | PASS — 110/110 and 100/100; original run uses `Etc/GMT-3` |
| Lint | `pnpm lint`; `.tools-abs8-database-fix-lint.log` | PASS |
| Types | `pnpm typecheck` (`next typegen && tsc --noEmit`); `.tools-abs8-database-fix-typecheck.log` | PASS |
| Full unit suite | `pnpm test`; `.tools-abs8-database-fix-unit.log` | PASS — 5,613 tests / 138 files |
| Production build | `pnpm build`; `.tools-abs8-database-fix-build.log` | PASS |
| Staff research | `pnpm exec playwright test --config playwright.staff.config.ts research-workspace.spec.ts`; `.tools-abs8-database-fix-staff.log` | PASS — 40 tests; exit 0 |
| Abstracts | `pnpm exec playwright test --config playwright.abstracts.config.ts`; `.tools-abs8-database-fix-abstracts.log` | PASS — 106 tests, 2 intentional width-matrix skips; exit 0 |
| Patch whitespace | `git diff --check` | PASS |
| Native Supabase pgTAP, strict database lint and integration/concurrency tests | `pnpm db:test`, `pnpm db:lint`, `pnpm db:integration` | BLOCKED / NOT RUN — Docker unavailable; disposable CI remains authoritative |

PGlite assertion counts: submission window 31/31; submission v2 107/107; complete
participant profile 72/72; organizer dashboards 147/147; research judging/awards
96/96; abstract review 110/110; screening/scoring 100/100. These are local PGlite
results using Supabase stubs, not native Supabase, plpgsql_check or genuine
multi-connection concurrency evidence. No known harness-only failure needed to be
excluded from these seven files. Temporary diagnostic harness copies were removed.

Both browser suites used zero retries and completed every case before Windows
fixture-server cleanup stalled. Stopped only the five server PIDs printed by
these runs (26388, 29660, 32548, 36556, 36000); both runners then summarized their
passing results and exited 0. No other jobs' processes were stopped.

Next: Claude reviews/commits the uncommitted changes and runs disposable CI for
native database lint, pgTAP and concurrency. Hosted migrations/settings, release
flags, participant opening and real communications remain untouched and closed.

## ORG-070 similarity check

abs9 on `claude/abstract-submission-window`, starting at merge `0992d60`
(PR #152). Owner authority: "I'd prefer we do the similarity check ourselves."
ORG-070 is appended to the decision register, superseding ABS-09/11's participant
similarity-report upload and AT-08's stage-one similarity PDF requirement. It also
records the owner's Terms v1.1 review (PR #149) and approval of ENG-091's supervisor
email subject "MSRC'27 abstract submission". ENG-092 is renamed and reconciled.
No decision numbers are renumbered; unrelated decision entries are unchanged.

Only the unmerged `20261031140000_abstract_submission_window.sql` is edited.
Stage-one participant settings/readiness, status and finalization no longer
depend on `evidence_ready` or upload/virus-scanning readiness. Organizers retain
Gate 7; its latest similarity threshold must be saved before opening and remains
a database finalization guard. A latest null threshold cannot inherit an older
value. Window/switch, profile/eligibility, one-chance, authorization, immutable
snapshot/audit and idempotency checks remain. Existing row locks still serialize
threshold changes and finalization. No external plagiarism-provider integration
is assumed or approved.

The EN/AR staff checklist drops the upload gate and retains the threshold row.
Staff guidance and participant preparation help now explain organizer-run
similarity checks; ethics and study registration remain reference text under
ORG-068 item 7 / ENG-088. The form already had no report-upload field. Feature
notes and the submissions README are reconciled. AGENTS.md's Research bullet
already has no report-upload requirement, so it is unchanged. Published EN/AR
Terms contain no participant similarity-report upload requirement and are
unchanged. Existing confidential stage-one evidence stays Super Admin only;
reviewer/AI projections and ABS-14 stage-two file requirements are unchanged.
The upload gate and its file-workflow code are retained without activation.
Arabic changes remain pending human language review.

Merged-migration verification: function-name intersection between migrations
20261031130000 and 20261031140000 is empty; the latter does not overwrite
ENG-091's screening/advisory functions or supervisor-event trigger. Migrations
20261031120000 and 20261031130000 are unchanged. Full replay and the advisory /
supervisor pgTAP suites pass together. No PL/pgSQL function is declared
IMMUTABLE in 20261031140000, and no function parameter was added or left unused
by this change. Native plpgsql_check remains a CI check, not a local pass.

Runtime: Node `v24.21.0`, pnpm `11.19.0`; no dependencies or lockfile changes.
Commands run from this worktree unless the harness directory is stated.

| Check | Command / local log | Result |
| --- | --- | --- |
| Full migration replay | In `C:/m/pglite`: `& 'C:/Program Files/nodejs/node.exe' run.mjs C:/m/codex-abs8`; `.tools-abs9-database-replay.log` | PASS — `ALL OK` |
| Nine database suites together | `& 'C:/Program Files/nodejs/node.exe' C:/m/pglite/test.mjs C:/m/codex-abs8 abstract_submission_window.test.sql abstract_submission_v2.test.sql abstract_review.test.sql abstract_screening_scoring.test.sql abstract_ai_supervisor_email.test.sql advisory_scoring.test.sql participant_profile_complete.test.sql organizer_dashboards.test.sql research_judging_awards.test.sql`; `.tools-abs9-database-tests.log` | PASS — 829/829 assertions |
| Targeted readiness units | `pnpm exec vitest run tests/unit/submission-window.test.ts tests/unit/submission-window-server.test.ts`; `.tools-abs9-targeted-unit.log` | PASS — 39 tests |
| Lint | `pnpm lint`; `.tools-abs9-lint.log` | PASS, exit 0 |
| Types | `pnpm typecheck`; `.tools-abs9-typecheck.log` | PASS, exit 0 |
| Full unit suite | `pnpm test`; `.tools-abs9-unit.log` | PASS — 5,647 tests / 139 files, exit 0 |
| Production build | `pnpm build`; `.tools-abs9-build.log` | PASS, exit 0 |
| Staff research browser suite | `pnpm exec playwright test --config playwright.staff.config.ts research-workspace.spec.ts`; `.tools-abs9-staff.log` | PASS — 48 tests, exit 0 |
| Abstract browser suite | `pnpm exec playwright test --config playwright.abstracts.config.ts`; `.tools-abs9-abstracts.log` | PASS — 106 tests, 2 intentional skips, exit 0 |
| Native Supabase pgTAP, strict database lint, integration/concurrency | `pnpm db:test`, `pnpm db:lint`, `pnpm db:integration` | BLOCKED / NOT RUN — Docker unavailable; disposable CI required |
| Hosted migrations/settings, participant opening, real mail, physical-device/inbox UAT | Outside this task | NOT TESTED / NOT PERFORMED |

PGlite counts: submission window 34/34, submission v2 106/106, abstract review
110/110, screening/scoring 100/100, AI/supervisor email 52/52, advisory scoring
112/112, participant profile 72/72, organizer dashboards 147/147, research awards
96/96. None of the known harness-only failures required exclusion. These are
stubbed local PGlite results, not native Supabase or multi-connection proofs.

New database assertions prove finalization without uploads while upload readiness
stays false, missing/latest-cleared threshold denial, switch-off denial and
before/after-window denial. Invalid document, profile, eligibility, ownership,
snapshot/audit and other existing assertions remain. Readiness unit regressions
ignore absent/false/true legacy upload readiness while retaining every remaining
gate. Browser fixtures retain legacy evidence-error handling for code deployed
ahead of database migration; normal journeys use upload readiness false.

Both Playwright configs used zero retries and completed all active cases before
Windows fixture-server cleanup stalled. Stopped only the five server PIDs printed
by these runs (14072, 13848, 7232, 32052, 17920), after checking their process names
and start times. Both runners then summarized their results and exited 0. No port
conflict or suite retry was needed; other jobs' processes were preserved.

EN/AR desktop/mobile staff captures are under
`test-results/abstract-consumers/{en,ar}-submission-window-{staff-desktop,staff-mobile}.png`.
English desktop and Arabic mobile captures were visually inspected: the upload
row is absent, the G7 threshold remains, controls fit and Arabic remains RTL.
PASS: final `git diff --check`.

All changes remain uncommitted. No commits, pushes, branches, hosted migrations,
settings seeds, live flags, participants or real communications.
`docs/PROGRESS.md` is untouched. Next: Claude reviews/commits and obtains native
disposable-CI SQL lint, pgTAP and concurrency evidence before any separate release.
