# Night-3 Task 6 — advisory abstract scoring (O9)

Date: 23 October 2026. Branch: `claude/night3-6`. Continued the committed partial
slice at `0da2517` after reading AGENTS, the project brief, decisions, progress,
AI-01–06 and the existing DeepSeek/Task 5 implementation. ENG-068 was already
reserved for this task; it is still the highest ENG number, so the continuation
keeps that reservation. `docs/PROGRESS.md` is untouched.

## Delivered, still closed

Science now has a bilingual Advisory scoring tab for Scientific Administrators
and Super Admins, with private separate scores/rationales, a counts/error-only
run log and descriptive calibration against matching completed human scorecards.
Results are labelled **AI advisory, not a decision**. They never change human
scores, averages, decisions or publication and are never projected to authors.
Reviewer reveal defaults OFF, is Super Admin controlled, and also requires a
completed independent review and current eligible assignment.

Runtime and DB activation remain separate and off. Budget/operating values have
no defaults. Queuing requires the complete worker configuration, explicit limits
and estimate, and approved data-handling/evaluation/operating evidence references.
The staff notice identifies processing in the People's Republic of China.
Nothing changes approved public legal text or ORG-057 email wording; no new email
template is added.

Durable jobs freeze abstract/rubric versions and deduplicate that tuple. Operation
IDs, serial budget reservations, current-day dispatch limits, fenced leases,
bounded chunks and retry/backoff prevent duplicate writes and silent overspending
of the entered estimate. Invalid or identifying responses are discarded whole.
Provider-side billing and model quality remain activation evidence, not claims
proved by mock tests.

The continuation closed a privacy gap in the partial implementation: frozen
author names/affiliations and submitter profile names now reach only the private
worker's local identity screen. The outgoing request still contains only title,
body and rubric. Both transmitted text and returned rationales are screened.
Missing/empty screening context fails closed. It is never copied into provider
metadata, staff responses, logs or result provenance. Staff packet inspection
remains necessary; pattern/name screening does not prove anonymity.

The UI clears selections, operation ID and processing acknowledgement after a
fresh read, removes recovered error messages, preserves successful action feedback
and binds reviewer records to their assignment. Missing RPCs show
`area-not-ready` without signing staff out. Full operating readiness now includes
the independent worker database credentials and authenticated cron secret.
The settings decoder and UI compare decimal cost reservations exactly, so an
entered `0.1` estimate with three attempts fits an entered `0.3` cap; genuine
excess is still refused without a rounding tolerance. PostgreSQL numeric remains
the final concurrent budget authority.
Criterion validation also accepts every Task 5 criterion identifier, including
initial `_` / `-`, while preserving the stricter generic prompt/snapshot/model
reference rules. Roundtrip tests retain missing/unknown/extra-criterion rejection.

No hosted migrations/settings/seeds, participant opening, real email, live AI
calls, flag activation, branch creation, commits or pushes were performed.
New continuation work is uncommitted for Claude.

## Migration, RPCs and contracts

Pending migration: `supabase/migrations/20261023051815_advisory_scoring.sql`.
Adds five private forced-RLS tables under `msrc_abstracts`:
`advisory_settings`, `advisory_runs`, `advisory_jobs`, `advisory_records`,
`advisory_daily_usage`. Runs/records are immutable; API roles have no direct table
grants. Every exposed function pins `search_path=''` and checks READ COMMITTED at
entry, before authorization/early returns.

All RPCs return JSONB:

| RPC | Signature | Caller |
| --- | --- | --- |
| `msrc_staff_advisory_workspace` | `(edition_key text)` | Scientific Administrator / Super Admin |
| `msrc_staff_advisory_save_settings` | `(edition_key text, expected_version integer, configuration jsonb)` | Scientific Administrator budgets; Super Admin all settings |
| `msrc_staff_advisory_start` | `(edition_key text, operation_id uuid, submission_ids uuid[])` | Scientific Administrator / Super Admin |
| `msrc_staff_advisory_calibration` | `(edition_key text)` | Scientific Administrator / Super Admin |
| `msrc_staff_advisory_reviewer` | `(edition_key text, assignment_id uuid)` | Current assigned eligible reviewer, with independent reveal gates |
| `msrc_advisory_worker_claim` | `(p_worker_id uuid, p_batch_size integer)` | Service role only |
| `msrc_advisory_worker_finish` | `(p_worker_id uuid, p_job_id uuid, p_lease_token uuid, p_result jsonb, p_error_code text)` | Service role only |

`advisory-contract.ts` adds settings, candidates, criterion scores, immutable
records, safe run/error summaries, strict response decoders and `save-settings` /
`start` payloads. `calibration.ts` adds validated matched-pair metrics: Pearson,
range-normalized absolute/signed differences and exact agreement, globally and
per criterion/rubric version. Missing pairs are excluded; one/constant score pairs
have undefined correlation. There is no invented passing threshold.

Worker claims add mandatory private `identity: {authorNames, institutions}`
screening context. That field is absent from public staff/participant contracts.
The worker preserves safe error categories and only emits
claimed/completed/retry/failed/stale counts. The existing transport now classifies
429/network/5xx for durable retry, cancels non-success bodies and exposes no raw
provider diagnostics. Explicit refusals cannot become advisory scores.

Routes: `/api/staff-portal/advisory`, `/api/jobs/advisory/drain`.
The source cron entry reuses the existing five-minute cadence and stays inert
without independent runtime/DB gates. New blank server environment documentation:
`AI_ASSESSMENT_SUPABASE_URL` and `AI_ASSESSMENT_SUPABASE_SECRET_KEY`; existing
`AI_ASSESSMENT_ENABLED`, `DEEPSEEK_API_KEY` and `CRON_SECRET` are also required.

## Verification

Every command used `C:\m\tools\bin` first on PATH. Observed Node `v24.21.0`,
pnpm `11.19.0`. No dependency installation or lockfile change was needed.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | PASS — zero warnings/errors. |
| Targeted ESLint after the QR test-setup correction | PASS — `pnpm exec eslint tests/unit/check-in-decoder.test.ts --max-warnings=0`. |
| `pnpm typecheck` | PASS — route generation and TypeScript. |
| `pnpm exec vitest run` | PASS — 98 files, 4,392 tests on final source (9.92s). |
| `pnpm build` | PASS — production build, 112 generated pages. |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS — final fresh build: 324 passed, 12 intentional desktop skips, zero failures/retries (336 collected, 10.6m). All 34 advisory executions passed. |
| `git diff --check` | PASS — no whitespace errors at the latest recorded check. |
| `git checkout -- .impeccable/review/` | BLOCKED — linked Git index is outside the writable root (`index.lock`: permission denied). The directory already has no tracked or untracked diff, so no restore is needed. |
| DB reset / `pnpm db:lint` / pgTAP / native integration | BLOCKED locally — Docker and psql are unavailable; 111 new pgTAP assertions prepared, none executed here. |
| Isolated advisory concurrency integration | BLOCKED locally — 14 authored cases wired into disposable Linux CI with `ADVISORY_DB_TESTS=true`; not executed here. |
| Other browser configurations | NOT TESTED — this slice changes only staff browser tests. Existing research/reviewer journeys are included in the full staff suite. |

Failure receipts are retained:

- Initial full unit run alongside the production build: 4,362 passed, one existing
  QR fallback test exceeded its unchanged five-second limit (6.829s). The full
  unchanged suite passed sequentially after the build (4.98s total). Concurrent
  compilation is the observed resource-contention context; no retry/timeout or
  QR assertion changes were made.
- A later full unit run overlapping lint and the previous staff run had the same
  QR import timeout (4,373 passed, one failed, 17.97s in that case). After those
  processes completed, that full candidate suite passed all 4,374 unchanged cases.
  Keep CPU-heavy local checks sequential; no retries or longer limits were added.
- The last criterion-ID candidate also exposed the existing QR dependency import
  deadline in a sequential run: 4,391 passed, one failed (10.286s in that case).
  Root cause: the real decoder's cold Vitest transforms ran inside the frame
  assertion deadline. The test file now resolves both real pinned dependencies
  during module setup; production lazy loading, the actual generated QR/blank
  frame/default-decoder assertions, retry count and timeout remain unchanged.
  The resulting final full unit run passes all 4,392 tests.
- The full CSP-corrected pre-decimal candidate passed 320 with 12 intentional
  skips. A later decimal candidate was interrupted with Ctrl+C after the desktop
  advisory cases passed because the criterion-ID compatibility change required a
  new build. It is not claimed as a completed suite; final browser evidence follows.
- Initial staff run: 318 passed, 12 intentional desktop skips, two failed. The
  two new mobile 200% text cases attempted a nonce-less
  inline style tag and correctly triggered the existing CSP guard. The test
  helper now awaits fonts and uses CSSOM text sizing, exactly as the existing
  mobile action suite does. CSP, text sizing, no-overflow, cost/selection and axe
  assertions remain intact. Initial diagnostics are retained under
  `test-results/advisory-initial-failures/` before the full rerun.

After every initial, intermediate and final test case had finished, Windows test-server shutdown stalled
before reporting. Stopping only that run's two printed server PIDs released the
reporter and its correct failing exit code. No test worker or owner app was
stopped. This is a local teardown limitation, separate from the CSP failures.
The final reporter exited 0 after the same targeted cleanup; no additional
assertion was skipped or test worker interrupted in that final run. The requested
`git checkout -- .impeccable/review/` could not create the linked worktree index
lock outside the writable root. That directory already has no tracked/untracked
changes, so no baseline restoration is necessary. It and `docs/PROGRESS.md` have
no diff. Final `git diff --check` passes.

New coverage includes default-off/absent configuration, data minimization,
known-name/institution/email/phone canaries, strict schema/refusal/model/finish
handling, budget validation, idempotency, missing migrations, full worker
readiness, disabled-in-flight responses, failed acknowledgements and safe logs.
SQL coverage adds role/ACL/RLS/author invisibility, same-version calibration,
immutable record checks, lease/backoff/day limits and strict output validation.
The result validator is STABLE because its polymorphic JSON builder is STABLE.
Calibration returns a complete cohort within its decoder bound or `unavailable`
on overflow; it never computes metrics from the old silent 10,000-pair cutoff.
The CI integration suite uses real independent connections for budget contention,
duplicate starts, leases, completions, disable and withdrawal races, plus seven
isolation guards. It imports no provider transport.

Staff browser cases mock presentation/adapter outcomes and block provider calls.
All 34 final advisory executions passed (EN/AR × desktop/mobile), including the
exact decimal-cap regression. The complete staff-run result is recorded above.
They exercise EN/AR, desktop/mobile, 200% text, keyboard tabs, budget reservation,
stale selections, separate runtime/DB switches, blank owner configuration,
reviewer visibility, missing-RPC recovery and axe/CSP. Eight run/calibration
screenshots across EN/AR and both devices were visually inspected: no overlapping
content or page overflow. The final Arabic 200% text snapshot was also inspected.
Screenshots use `testInfo.outputPath()` under
`test-results/staff/`; their data is synthetic. Tables scroll within labelled
regions on phones. The inherited table-header wrapping is cosmetic.

The source API details were rechecked against official DeepSeek
[Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion/),
[JSON Output](https://api-docs.deepseek.com/guides/json_mode/),
[models](https://api-docs.deepseek.com/quick_start/pricing/),
[rate limits](https://api-docs.deepseek.com/quick_start/rate_limit/) and
[errors](https://api-docs.deepseek.com/quick_start/error_codes/) on 23 October.
The existing Flash endpoint/JSON-mode choices remain supported. No numerical
prices are seeded. See the [feature note](../features/ADVISORY_SCORING.md) for
current provider details and the calibration/budget interpretation.

## Files in the completed slice

Compared with the checkout's `origin/main`, including the inherited partial work:

- UI/navigation: `src/app/[locale]/staff/layout.tsx`,
  `src/features/staff-portal/{advisory-client.ts,advisory-contract.ts,advisory-copy.ts,advisory-handler.server.ts,advisory-panel.tsx,research-panel.tsx,science-workspace.tsx,staff-portal.tsx}`,
  `src/styles/staff-advisory.css`.
- Server/provider: `src/app/api/staff-portal/advisory/route.ts`,
  `src/app/api/jobs/advisory/drain/route.ts`,
  `src/lib/ai-assessment/{advisory.server.ts,calibration.ts,contracts.ts,deepseek.server.ts,request.server.ts}`,
  `src/lib/jobs/{advisory-config.server.ts,advisory-route.server.ts,advisory.server.ts}`.
- Database: the migration above,
  `supabase/tests/database/{advisory_scoring.test.sql,persisted_authorization.test.sql}`,
  `supabase/tests/support/advisory-fixtures.psql`.
- Tests: `tests/staff-e2e/advisory-scoring.spec.ts`,
  `tests/unit/{advisory-worker.test.ts,ai-advisory-calibration.test.ts,ai-advisory-scoring.test.ts,staff-advisory-handler.test.ts}`,
  `tests/unit/check-in-decoder.test.ts` (cold dependency setup only),
  `tests/integration/advisory-concurrency.test.ts`.
- Configuration/docs: `.env.example`, `.github/workflows/ci.yml`, `vercel.json`,
  `docs/DECISIONS.md`, `docs/features/ai-assessment.md`,
  `docs/features/ADVISORY_SCORING.md` and this receipt.

## Owner questions / Claude review / next task

- Review and commit the uncommitted continuation, then run disposable reset,
  strict lint, pgTAP/advisors and all 14 new integration cases before considering
  this pending migration. Local UI/unit results do not prove database behavior.
- Review forced-RLS/ACLs, immutable version links, author/coauthor invisibility,
  private screening context, atomic reservations and worker lease fencing.
- Review the shared QR test's dependency-only setup correction; it changes no
  production camera code or assertions, retries or timeouts.
- Supply approved data-handling/disclosure and PRC transfer/retention/training
  evidence, actual evaluation corpus and committee human baselines, numerical
  budgets/currency, conservative provider cost estimates and operating custody.
  No threshold, rubric values, provider entitlement or approval is inferred.
- Review the Arabic staff wording and descriptive calibration interpretation.
  Any go/no-go remains an owner decision; neither correlation nor evidence-field
  completion automatically activates scoring.
- Review worker deployment/cadence, account spend controls and re-evaluation when
  the provider alias/model changes. No live activation is part of this task.

Next task: Claude reviews/commits the source and runs the isolated database CI
gate. Hosted application and activation require separate owner authorization
after the notice, evaluation, budget and operating evidence is complete.
