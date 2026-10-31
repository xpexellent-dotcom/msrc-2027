# ENG-090 — Abstract screening and scoring

31 October 2026. Worktree `C:/m/codex-abs6`, branch
`claude/abstract-screening-scoring`, starting head `a16ab09`. Work remains
uncommitted. No branch, commit or push operation was performed.

Authority is the owner's abs6 task, ORG-069 (recorded by a parallel PR), and
ORG-068 / ENG-088. This task creates **ENG-090 only**, appending it to DECISIONS;
it neither writes ORG-069 nor edits PROGRESS.md. Requirements ABS-04/10/11/12/15,
REV-01–09, AI-01–06, LOC-01–03 and SEC-01/02/06 apply. No SCR-prefixed IDs were
found in the supplied v0.5 specification; none were invented.

The owner-supplied `owner-abstract-rubric.txt` was read in full from the exact
scratchpad path in the task. SHA-256:
`C3AAECF226AC5182467E4F4908F5B38D1D58BD75CD400D4459BF0E121E9D0F48`.
Its English anchors are retained with paragraph wrapping normalized. The PDF's
300-word wording is superseded by ORG-068's **350 including six headings**.
AI acceptance language in the source is not authoritative; it does not authorize
an adapter, assessment, decision or notification. Approved Terms v1.0's earlier
research wording still needs its separate owner/legal reconciliation.

## What existed and what changed

The checkout already had the private `msrc_abstracts` schema, immutable finalized
snapshots and author rows, sanitized packets, assignment/conflict/affiliation
checks, scorecard histories, human decisions, immutable decision bases, explicit
batch preview/publication and held decision email jobs. ENG-088 supplied the
six-section document, authoritative presenter binding, supervisor privacy,
20-word title and 350-word inclusive tokenizer. Existing staff admission, native
session checks, exact-session staff email assurance / Super Admin TOTP, CSRF,
no-store responses and missing-RPC handling were reused.

The new migration extends those objects and replaces their existing RPCs rather
than introducing another review or decision system. New append-only private
tables hold screening settings, screening rounds, seven gate rows per round and
explicit additional-review requests. All force RLS, have no client policies or
table/schema grants, and reject updates/deletes/truncation. Public staff RPCs
independently authorize current edition roles/sessions. Privileged functions pin
an empty search path; private helpers have no client execute grants. This follows
the [official Supabase function security guidance](https://supabase.com/docs/guides/database/functions).

G1–G4 are computed in SQL from the immutable finalized document, not current
profile data or client totals. G4 uses the presenter identity already bound from
the authoritative account/profile at finalization, supervisor name/email,
co-author names, specialty, study type and a separate 20-word title. G3 retains
the incumbent countable-result completeness rule; it does not claim to judge
scientific validity. G5 adds ORG-068 ethics/registration completeness and staff
confirmation with a note; G6 records relevance with the fixed specialty. No
confidential ethics/registration original or identifying matching-abstract body
is projected to the scientific checklist. Supervisor contacts remain separate
from every reviewer/AI packet under the existing ORG-068 rule.

Confirmations append an immutable round and seven gate rows with actor, time,
notes and failure disposition. Status is pending, passed, failed_correctable or
failed_final. A staff reason is required for a failed mandatory gate's disposition.
An integrity/ethics investigation is separate; resolving it requires a note.
The edition-then-target lock order, expected sequence/version and operation-ID
digest serialize competing staff confirmations and deduplicate lost-success
retries. Gates cannot be passed by a reviewer, participant, AI or client total.

Seven code/DB constants implement weights **20 / 15 / 20 / 15 / 10 / 10 / 10**,
integer scores **1–4**, and `Σ weight × (score − 1) / 3`. The complete reviewer
total is rounded once to two decimals; the aggregate is the unrounded mean of
valid completed reviewer totals. Components, totals, immutable per-card rule tags,
operating-settings versions and actual human decisions remain distinct. Legacy
cards are retained and excluded from the new aggregate until independently
rescored under `msrc2027_org069`; historical snapshots/settings/card rows are not
rewritten. The prior assigned deadline still applies. New assignments freeze the
explicitly saved review settings current at assignment, allowing staff to finish
review configuration after finalization without changing the submitted snapshot.
The obsolete acceptance scalar, keyword and ongoing/corresponding-author settings
do not gate current human scoring; new recommendations read only the Super Admin
band settings. The old acceptance scalar is no longer an editable staff control.

The pilot uses two independent reviewers in the incumbent assignment model.
Authorized staff can explicitly request additional review, with a count/reason,
using the existing REV-02 range up to five. Quorum, summaries and decision checks
then require the requested number; assignment/conflict/blinding checks are reused.
The staff overview includes per-criterion highest-minus-lowest disagreement.

Bands have **no default row**. The UI's 85 / 60 / 55 suggestions fill a draft only;
the acceptance threshold must be entered explicitly before bands can be saved.
Every recommendation says **Provisional — pilot required** in EN/AR. Only a Super
Admin can save bands, similarity threshold or optional oral capacity. For oral
eligibility, **every reviewer** must score Methodology and Results at least 3;
averaging away one reviewer's lower score is not allowed. An explicitly supplied
oral capacity routes overflow to poster. A tie spanning that capacity boundary
routes to additional review, without a UUID-based scientific tie-break. No oral
capacity is invented. Borderline work likewise routes to additional review.
Recommendations never prepare, publish, allocate or send an actual outcome.

Only Scientific Administrators and Super Admins can confirm screening and maintain
scientific decisions. This explicitly supersedes ENG-065's older read-only
scientific-mutation limit for a Super Admin. Reviewer scoring still requires the
reviewer role, its current assignment and passed screening. Existing decisions
and batch publication recheck investigations, screening, quorum and exact review
basis. A human may prepare a rejection for a failed_final mandatory gate without
scientific cards. An unresolved investigation still blocks that final decision.
Changing screening invalidates an earlier prepared decision's frozen basis.

## Similarity, privacy and inactive settings

No existing migration enabled `pg_trgm`. The migration checks
`pg_available_extensions` and uses pg_trgm when available, locating its actual
extension schema. It is listed by the
[Supabase extension catalog](https://supabase.com/docs/guides/database/extensions);
the function semantics follow the
[Postgres pg_trgm reference](https://www.postgresql.org/docs/current/pgtrgm.html).
If unavailable, SQL uses normalized three-token shingle Jaccard. No service,
provider account, literature crawl or network plagiarism request is introduced.

Compare scientific body text against all other same-edition records (including
drafts and retained withdrawn records) and previously accepted abstracts held
in the database. The current target uses its finalized snapshot; other finalized
records use snapshots, and drafts use their current document. Self-matches are
excluded. Show the five highest matches as reference/title/edition/version/score,
without author/contact fields or matching bodies. The 0–100 threshold is unset
until a Super Admin explicitly saves it; comparison uses strictly less than the
threshold, without rounding the comparison. A staff external-report attestation
and reference are independently required for G7. Threshold unset or report
unchecked cannot pass screening. An internal percentage is a signal for human
review, not proof of plagiarism or an automatic rejection.

Similarity is rechecked for scoring and final decisions, so a later draft,
submission or threshold change cannot silently preserve an obsolete pass.
Settings changes that only affect bands do not unnecessarily invalidate a
similarity confirmation. A materialized cohort computes screening and summaries
once per staff-list recommendation pass, avoiding repeated peer-cohort scans.
Performance on a real corpus remains NOT TESTED.

The staff checklist, matches, settings, status, disagreement and recommendation
copy support EN/AR with RTL; scientific content remains English/LTR. Review
packets and seven-criterion scorecards, including the owner's English anchors,
remain English/LTR within either staff route. New Arabic is DRAFT for owner/native
reader review. Strict handler projections exclude screening, settings, identity,
supervisor contacts, confidential originals and peer cards from blind packets.
New RPCs use the incumbent optionalRpc / StaffRpcMissingError pattern and show
area-not-ready without signing staff out when code precedes the hosted migration.

## Extension points and exclusions

`msrc_abstracts.audit` emits `screening.passed` with submission ID, snapshot version,
round ID and sequence. The later supervisor-email PR can consume this immutable
event, deduplicating by edition/submission/snapshot and rechecking current
eligibility. This task creates no email job, template or supervisor notification.
Correctability records do not open a participant edit/revision/resubmission path
or restore the ORG-068 submission chance.

AI scoring, the DeepSeek switch, a new submission-window settings screen and file
uploads are excluded. Advisory/provider application code and its independent
gates are unchanged. One existing advisory database test now seeds an explicit
historical rubric fixture after proving new staff saves reject arbitrary weights;
it retains its legacy advisory assertions without changing AI behavior. Existing
window controls remain; only the rubric/scoring portion of their editor changes.
Existing private-evidence, privacy/retention, policy, delivery, human pilot and
workflow release gates remain. No hosted migration or setting was applied, no
flag default was changed, and no real participant communication was sent.

## Verification

Node 24.21.0 and pnpm 11.19.0 were used. Commands below ran locally; database CI,
production, real accounts, real reports and physical-device UAT are not inferred
from synthetic browser checks. Logs are retained under `.tools/abs6/`.

| Command | Observed result |
| --- | --- |
| `pnpm lint` | PASS, zero warnings. |
| `pnpm typecheck` | PASS. |
| `pnpm test` | PASS: 5,556 tests across 136 files. |
| `pnpm build` | PASS, optimized production build. |
| `pnpm exec playwright test --config playwright.staff.config.ts --reporter=list` | FAIL: 427 passed, 12 configured skips, 1 Chromium `net::ERR_NO_BUFFER_SPACE` navigation failure before the unrelated Arabic early-access authorization journey loaded the application. No retry/timeouts/assertions were changed. Its isolated desktop/mobile recheck passed below. |
| `pnpm exec playwright test --config playwright.staff.config.ts tests/staff-e2e/research-workspace.spec.ts tests/staff-e2e/staff-console.spec.ts --grep 'research-workspace\|ar a registration administrator cannot see or open early-access controls' --reporter=list` | PASS: 34 tests; 32 latest EN/AR desktop/mobile research cases, all with clean axe, plus both isolated early-access authorization cases. |
| `pnpm exec playwright test --config playwright.abstracts.config.ts --reporter=list` | PASS: 86 passed, 2 configured skips. |
| `pnpm exec playwright test --config playwright.research-judging.config.ts --reporter=list` | PASS: 46 tests. |
| `pnpm db:test` | BLOCKED before database execution: Supabase CLI telemetry write outside the workspace was denied (`EPERM`); local Docker is unavailable. |
| `pnpm db:lint` | BLOCKED by the same CLI/sandbox condition; no database lint pass is claimed. |
| `pnpm exec vitest run --config vitest.integration.config.ts tests/integration/abstract-concurrency.test.ts` | BLOCKED at configuration load: running local Supabase/loopback settings are absent. Disposable Linux CI is required. |
| `git diff --check` | PASS. |

The shared SQL/TS vectors cover all-poor/fair/good/excellent, each isolated weight
and a mixed card; TS also exhausts all 16,384 valid score combinations. SQL pgTAP
adds 350/351 words including headings, 20/21 title words, sections/results,
ethics/registration completeness, role denials, inactive/unset settings, weighted
totals, band boundaries 84.99/85, 59.99/60, 54.99/55, every-reviewer oral floors,
external attestation, immutable audit, failed-gate rejection, investigations,
blinded packets, additional quorum and idempotency/CAS. The SQL half of parity
and these assertions are authored, **not executed locally**.

The full staff run preceded the final removal of the unused acceptance scalar
from the research editor. The latest research build then passed the 34-case run,
including the new paired-review disagreement/additional-review fixtures. Do not
describe the full staff run as green or substitute a targeted rerun for CI.

The existing multi-connection abstract integration suite is adapted to two
reviewers and screened fixtures. It adds two different scientific staff racing
to confirm one finalized version, expecting one immutable round/seven gates and
one conflict. Earlier scorecard, assignment, quorum, publication, stale-basis,
native-session and participant chance races are retained. No local integration
pass is claimed. The standard disposable CI job already targets this test file.

Initial browser failures are retained in the earlier log files: nested select /
populated-textarea label lookup, ambiguous Arabic pass text and a discarded G5
note on investigation changes were corrected. The final journey covers unset
threshold, explicit save, passed confirmation, internal matches, investigation,
resolution/correctable failure, inactive suggested bands and explicit band save.
Scorecard cases cover all seven fields, anchors, draft/submit, blinding, EN/AR
entry, RTL chrome and axe. The paired-review cases show a provisional band and
all seven criterion differences, then request an additional reviewer without
making a decision. All 32 latest research cases ran axe with zero violations.
Assertions and timeout/retry policies were retained. Screenshots are retained
locally in `test-results/abstract-consumers/`; English mobile and Arabic desktop
screening captures were visually inspected. Physical devices/assistive technology
and a native-reader Arabic review remain NOT TESTED.
Windows Playwright web-server helper processes remained alive after case
completion; only the exact helper PIDs captured from this task's own server logs
were stopped to let teardown finish. Other jobs/processes were not stopped.

## Remaining gates and next work

1. Claude reviews and commits the uncommitted diff, then disposable CI must execute
   the migration, pgTAP, database lint and real multi-connection tests. These remain
   blocking backend verification; authored tests are not passing receipts.
2. Run the owner-required blinded pilot and review EN/AR wording before choosing
   provisional thresholds or any oral capacity. Suggestions remain inactive.
3. Keep hosted application/configuration and participant/delivery switches closed
   until their separate owner-controlled release gates pass. Supervisor-email
   consumption, external evidence workflow and AI/provider work stay separate PRs.

## Claude review fixes (31 October 2026)

- Local PGlite migration replay found a real PL/pgSQL parse error in
  `msrc_staff_research_confirm_screening`: a `CASE … THEN` inside an `IF`
  condition ends the condition at the first `THEN`. The `CASE` is now
  parenthesized. The full migration chain then replays (`ALL OK`).
- `abstract_review.test.sql` test 29 sent the old settings payload, so it was
  rejected as `invalid` before reaching the stale-version check. It now sends the
  current screening configuration and gets the expected `conflict`.
- PGlite pgTAP (harness, not CI): abstract_review 110/110,
  abstract_screening_scoring 100/100, abstract_submission_v2 107/107,
  advisory_scoring 111/111, announcements 110/110, organizer_dashboards 147/147,
  participant_profile 76/76, participant_profile_complete 72/72,
  research_judging_awards 96/96. Database lint and the multi-connection
  integration test still need CI.
