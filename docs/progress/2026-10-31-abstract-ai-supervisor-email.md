# abs7 receipt: closed AI advice and supervisor notification

31 October 2026. Worktree `C:/m/codex-abs7`, branch
`claude/abstract-ai-supervisor-email`, building on ENG-090 / `da4908d`
(unmerged PR #150). Decision: ENG-091 only. ORG-040 and ORG-069 are authority;
ORG-069 is referenced from the explicit task and owner rubric because it is
absent from this branch's register. `docs/features/abstract-rubric-authority.md`
was absent. No ORG entry was written.

## Implemented

- Extended the existing advisory request/parser, durable jobs, private records,
  staff handler and EN/AR screens. No second assessment workflow. The staff worker
  requires the seven ENG-090 criteria (integer 1–4, weights 20/15/20/15/10/10/10).
  It uses the same `packet_projection` as reviewers: title, six sections,
  specialty/study type and analysis-completion metadata. Frozen author,
  institution and supervisor-name canaries remain local leak-screening context.
  Identity, confidential ethics evidence and similarity reports are excluded.
- Added exactly G1–G6 observations, without pass/fail values. G1–G4 remain
  deterministic; absent identity/ethics evidence cannot be inferred from the
  blinded packet. Strict parsing rejects the entire output on extra fields,
  missing/duplicate gates or criteria, noninteger/out-of-range scores, identity
  echoes, malformed JSON, refusal or incomplete completion. Existing jobs retain
  bounded failure codes; no raw invalid provider output is retained or logged.
- Suggested totals use `abstractWeightedTotal` in code. PostgreSQL independently
  projects criterion/value pairs and uses ENG-090's shared formula, rounding once.
  The model cannot supply a total, gate, band or decision. New records retain
  validated observations, immutable scores and existing provider/model, prompt,
  snapshot/version and timestamp provenance.
- Scientific Administrators and Super Admins explicitly confirm each criterion
  with their own editable value/rationale. Separate immutable confirmations
  attribute actor/session, advisory ID and the literal `AI-assisted` marker.
  They never become assignments, independent reviewer cards, reviewer counts,
  human-review averages, bands or decisions. Individual observation-copy buttons
  fill human notes; G5/G6 pass/fail remains unselected until the human selects it.
  Assisted screening wraps the existing ENG-090 RPC and follows its lock order,
  CAS and operation-id retry behavior. Each selected gate links to the actual
  human screening record.
- Safer AI-03 policy: staff-only advice, including after reviewer submission.
  HTTP and SQL deny reviewer access, and the reviewer UI makes no advisory
  request. Dual staff/reviewer roles and authors/coauthors cannot use the new
  staff projection/confirmation paths. Reviewer visibility cannot be enabled.
  Disabled staff UI says **AI advisory not enabled** (with Arabic equivalent).
- The `screening.passed` immutable audit event atomically creates one existing
  outbox job per edition/submission/finalized snapshot. It checks the actual
  human actor/session and current screening. Failed/pending/AI-only results do
  not enqueue. Durable identities plus a unique notification tuple dedupe retries
  and later human re-confirmation. Recipient and substitutions come only from the
  finalized snapshot; no mutable current profile is used.
- Supervisor status is visible in each staff submission's advisory section.
  Eligibility checks the current human screening, submission version/state,
  recipient and snapshot payload before an attempted send/provider snapshot.
  The job is held by a SQL constraint, the ordinary outbox delivery gates, and
  the existing worker draft-template denial. Opening global email delivery alone
  cannot release these messages. No live release path was added.

## Rubric and notification authority

Read the owner file at
`C:/Users/XPEXCE~1/AppData/Local/Temp/claude/C--Users-XpExcellent-Desktop-msrc-2027/ed96f658-64af-4954-88bd-095a14c1f7ad/scratchpad/owner-abstract-rubric.txt`.
The renderer body and the independent golden fixture copy the exact block from
`Dear Dr. [Last Name],` through the final `Medical Students Research Conference
(MSRC'27)`, retaining line breaks. Only placeholders are substituted. HTML entity
escaping is applied to every substitution in both MIME parts; control characters
are rejected. No boilerplate is added to the owner body.

The snapshot stores only a full supervisor name. Use that full name in the
salutation; do not infer a culturally unreliable surname. Proposed subject:
**MSRC'27 abstract submission** — **PENDING OWNER APPROVAL**. This is supervisor
correspondence, so English-only follows ORG-059's non-participant transactional
email rule. The body describes initial evaluation, not final acceptance.

The owner document's older “accepted by the AI model” trigger is superseded by
the current explicit task: only the human-confirmed ENG-090 pass can enqueue.
Its older 300-word statement does not replace ENG-090/ORG-068's deterministic
350-word inclusive gate. This slice changes no word-limit or upload/window rule.

## DeepSeek verification and activation

Inspection found ENG-042's DeepSeek adapter already present in this branch;
there is no Anthropic transport file or SDK dependency to remove. Reused the
server-only fixed-endpoint fetch transport and updated its advisory schema/tests.
Official documentation searched and read on 31 October 2026:

- [First API call](https://api-docs.deepseek.com/): OpenAI-compatible base URL
  `https://api.deepseek.com`; documented models `deepseek-flash` and
  `deepseek-v4-pro`. Retain the existing explicit `deepseek-flash` allowlist;
  add no model fallback.
- [Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/):
  POST `/chat/completions`, Bearer credential, nonstreaming request and model
  response. The adapter sends `thinking: { type: "disabled" }` and no tools.
- [JSON output](https://api-docs.deepseek.com/guides/json_mode/):
  `response_format: { type: "json_object" }`, explicit JSON instruction/example
  and bounded `max_tokens`. JSON mode is not application-schema enforcement;
  empty/malformed content still fails local validation.

`DEEPSEEK_API_KEY` remains server-only; model and transport use existing approved
configuration patterns. Endpoint/header overrides remain refused rather than
permitting unreviewed destinations. No credential or provider request was used.
The existing data-handling disclosure in `docs/features/ai-assessment.md` and
`docs/features/ADVISORY_SCORING.md` retains **processing in the People's Republic
of China**. Disclosure is not approval. Data handling, committee evaluation,
budget and operating configuration remain activation gates; **AI stays OFF**.

## Verification

| Command / check | Observed result |
| --- | --- |
| `pnpm lint` | PASS, exit 0. An earlier run caught temporary editing scripts; they were removed and lint rerun successfully. |
| `pnpm typecheck` | PASS, exit 0 after final application source changes. |
| `pnpm exec vitest run` | PASS: 137 files, 5,589 tests. HTTP transport is mocked; no provider network calls. |
| `pnpm build` | PASS, exit 0; final application source compiled and all 140 static pages generated. |
| `pnpm exec playwright test --config=playwright.staff.config.ts tests/staff-e2e/research-workspace.spec.ts tests/staff-e2e/advisory-scoring.spec.ts --list` | PASS: 74 cases across desktop/mobile, EN/AR. Discovery only. |
| Same Playwright command without `--list` | BLOCKED: port `3220/health` occupied; waited several minutes and retried once, still occupied. Initial test-import issue was corrected by moving shared copy out of the React component; subsequent discovery passes. |
| `pnpm db:test` | BLOCKED before database access: CLI `EPERM` writing its user-home telemetry file. Docker and psql are also absent locally. No pgTAP execution claimed. |
| `pnpm db:lint` | BLOCKED by the same CLI telemetry restriction. `--fail-on warning` remains a CI gate. |
| Database integration/concurrency | NOT TESTED locally; restricted to disposable Linux CI. Existing advisory fixture was updated to the fixed rubric and remains server-only. |
| `git diff --check` | PASS; Git reports only existing CRLF-to-LF normalization notice for the appended decision file. |
| Hosted migrations, flags, real mail/provider calls, hardware/assistive technology | NOT TESTED / NOT PERFORMED. |

New unit coverage includes exact DeepSeek request shape, frozen-packet projection,
strict malformed-output rejection, code-computed total, neutral subject, full-name
fallback, escaping, and golden owner body. Handler tests cover role separation,
dual-role denial, schema/CSRF rejection, response minimization and missing RPCs.
New pgTAP source covers no AI gate/scorecard/decision mutation, human attribution,
immutable confirmations, pending/failed/no-AI email behavior, once-only human-pass
enqueue, retry/re-confirmation dedupe, snapshot recipient, status, eligibility,
delivery holds and authorization. Browser source includes disabled and enabled
synthetic advisory fixtures, individual confirmation, untouched pass/fail controls,
EN/AR/RTL and axe assertions. **Browser behavior and axe cleanliness are not
verified until this suite actually executes.**

## Remaining gates and next task

CI must run the migration, pgTAP, database lint/integration concurrency and the
74 staff browser cases. The owner must review the proposed subject. The existing
AI and transactional-email release gates remain separate and closed. No hosted
migration, settings seed, flag change, participant opening, real email, commit,
push or branch operation was performed. `docs/PROGRESS.md` and abs8's submission
window/file-upload work are untouched. Changes are left uncommitted for Claude.

## Database fix

31 October 2026 follow-up on `f4c7dee` (`wip abs7`), rebased onto PR #150 head
`4fd29ea`. ENG-091 / ENG-090, AI-01-04/06, ABS-12/15, REV-01 and SEC-01/02/06
remain the applicable requirements. No product decision changed.

Reproduced all reported failures with the supplied PGlite harness: supervisor
38/44, advisory 109/111, review 110/110 and screening/scoring 100/100.

- **Migration root cause:** `msrc_staff_advisory_confirm_screening` declares a
  local `k` and uses `#variable_conflict use_variable`. Its `unnest(items) k`
  validation therefore reads the initially NULL local variable rather than the
  selected gate. For a valid nonempty selection, `count(*)` differs from
  `count(distinct k)` (zero), returning `invalid` before human screening occurs.
  Both selection checks now reference the qualified `selected.item_key` column.
  The existing human-pass, notification, retry, attribution, hold and later
  investigation assertions pass without changing their expectations. Added
  coverage rejects NULL/empty selections, NULL items, duplicates, G7 and more
  than six items, and verifies invalid input creates no screenings/confirmations.
- **Advisory expectation correction:** the old privacy regex prohibited
  `specialtyId` and `studyTypeId`. ENG-091 explicitly reuses the approved blinded
  reviewer science packet, including study metadata (AI-02). Those two keys are
  legitimate. Retained and expanded identity/confidential-field canary checks,
  and added exact equality between the worker science and the approved packet
  after removing the explicitly enumerated worker control fields. Extra science
  fields, identity/contact/affiliation data and confidential evidence still fail.
- **Reviewer expectation correction:** ENG-091's staff-only policy returns
  exactly `{"state":"denied"}`. Accessing its absent `advisory` key produces SQL
  NULL, not JSON `null`; the old assertion expected the latter. The test now
  asserts the entire denial object, so any advisory projection or extra field
  fails. No reviewer access was restored.
- Preserved Claude's STABLE declarations for `advisory_gates_valid` and
  `advisory_configuration_valid`. No PL/pgSQL function was made IMMUTABLE.

Commands ran with Node `24.21.0` and pnpm `11.19.0`. PGlite commands ran from
`C:/m/pglite`; other commands ran from this worktree. Repeated "cannot find the
path" harness noise was filtered out.

| Command / check | Observed result |
| --- | --- |
| `& 'C:/Program Files/nodejs/node.exe' run.mjs C:/m/codex-abs7` | PASS: `ALL OK`; all source migrations replayed. |
| `& 'C:/Program Files/nodejs/node.exe' test.mjs C:/m/codex-abs7 abstract_ai_supervisor_email.test.sql advisory_scoring.test.sql abstract_review.test.sql abstract_screening_scoring.test.sql` | PASS: **52/52**, **112/112**, **110/110**, **100/100**, respectively; exit 0. |
| `pnpm lint` | PASS: ESLint, zero warnings, exit 0. |
| `pnpm typecheck` | PASS: generated route types and `tsc --noEmit`, exit 0. |
| `pnpm exec vitest run` | PASS: **137 files, 5,589 tests**, exit 0. |
| `pnpm build` | PASS: production compilation, TypeScript and **140 static pages**, exit 0. |
| `pnpm exec playwright test --config=playwright.staff.config.ts tests/staff-e2e/research-workspace.spec.ts tests/staff-e2e/advisory-scoring.spec.ts` | PASS: **74/74**, desktop/mobile EN/AR, including axe; zero retries, exit 0 (`74 passed (4.0m)`). Fixed ports were available. |
| `pnpm db:lint` | BLOCKED: CLI exits 1 on `EPERM` writing `C:/Users/XpExcellent/.supabase/telemetry.json.tmp.*`, before connecting to a database. Docker remains unavailable; PGlite has no plpgsql_check. Strict `--fail-on warning` lint requires CI. |
| `git diff --check` | PASS: exit 0. |

All 74 browser cases reported success before Windows web-server teardown stalled.
Stopped only this run's two fixture-server processes, identified by their startup
logs (Next.js PID 22920 and staff mock provider PID 36208), using
`Stop-Process -Id 22920,36208`. Playwright then completed normally with the above
summary and exit 0. No browser assertion, retry, timeout or port was changed.

PGlite uses auth/cron stubs; these passing local pgTAP assertions are not genuine
Supabase Auth, database integration/concurrency, or plpgsql_check evidence.
Those CI checks remain required. No hosted migration, seed, production setting,
feature activation, participant opening, real email/provider request, commit,
push or branch change was performed. `docs/DECISIONS.md`, `docs/PROGRESS.md` and
other task areas remain untouched. Fixes are left uncommitted for Claude.
