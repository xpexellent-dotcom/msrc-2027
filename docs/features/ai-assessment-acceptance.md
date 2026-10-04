# BL-AI-01 and synthetic evaluation acceptance map

Source authority: `Development_Specification_v0.5.txt` AI-01 through AI-06 and
`docs/backlog/09-ai-assessment.md#bl-ai-01`. The organizer's 5 October 2026 task
selects the Claude API and `claude-opus-5-5` for this disabled foundation. It does
not approve real manuscript processing, a scientific rubric or live activation.

## Evidence boundaries

The checks below exercise the server contract and mocked provider. They do not
establish scientific accuracy, production authorization, actual API compatibility,
cache hits, provider billing or institutional/privacy approval. Live synthetic API
execution is deliberately excluded from CI and has not been performed by this task.
The fixed placeholder rubric is labelled `UNAPPROVED`; simulated scores and empty
human baselines must remain visibly distinct from committee-scored evaluation.

## Acceptance map

| Requirement / BL-AI-01 criterion | Required evidence in this slice | Integration boundary |
| --- | --- | --- |
| Disabled adapter makes no external request; AI-01/05 | Mock request/client spies remain untouched with the default flag, missing key/config, incomplete approval, changed evidence, unapproved rubric or rejected budget. | Approval records need an authorized storage/source before production integration. |
| Payload contains only approved fields; AI-02 | Payload contains title, specialty, study type, completion status and abstract body only. Author/account/contact/affiliation/licence/evidence fields and identity-check context never enter either provider turn or batch metadata. Locked snapshot validation rejects malformed inputs. | Submission ownership and immutable database snapshot lookup are BL-REV prerequisites. |
| Identifying body text is checked; AI-02 | Email, phone, supplied author-list names, institutions, licence and IRB canaries are flagged before dispatch. Rejections return safe categories, not leaked text. | Pattern/name checks are conservative screening, not proof of anonymity; privacy-approved human inspection remains necessary. |
| Manual review does not require AI success; AI-01/06 | Disabled, configuration failure, identity warning, refusal, truncation, provider error, invalid JSON/schema/ranges, expired/cancelled batch and missing results all preserve permitted manual review and never issue an applicant decision. | No reviewer UI, outcome publisher or applicant email is added. |
| Untrusted abstracts cannot change system rules, invoke tools or publish; AI-04 | Fixed rules and rubric stay in system text; the five scientific fields are JSON data in a user turn. Injection strings cannot add roles/system messages/tools. Unexpected tool output is rejected. | Mock tests show isolation and failure handling; they cannot establish that a real model ignores every injection. |
| Structured criterion/range output; AI-04 | Exact criterion coverage, finite in-range scores, short nonempty rationales and overall comment are validated after the stop reason. Schema-invalid output is rejected. | The API wire schema uses supported JSON Schema features; numerical/string limits are enforced locally. |
| Provenance; AI-04 | Accepted advice records provider, requested/served model, prompt/rubric version, locked snapshot ID and assessment timestamp. Failure reports retain safe metadata without provider responses or keys. | Assessment persistence, assignment RLS and audit transactions remain BL-AI-02 integration work. |
| Human independence; AI-03 | Report separates model and human values; unset human scores are represented as unassessed and never fabricated. No automatic decision or human-average adjustment is exposed. | Independent draft before reveal, substantive override records, API permissions and UI remain BL-AI-03. |
| Evaluation and activation; AI-05/06 | Approximately 25 synthetic cases cover strong/weak/ongoing studies, varied study types, identity leaks, injections and malformed inputs/outputs. Reproducible mock reports include failures, provenance, human/model comparison fields and limitations. | Scientific Lead must supply human baselines, examine disagreements/overrides and explicitly judge suitability; no numerical pass threshold is invented. |
| Local-only real synthetic harness; AI-05/06 | No key in source, docs or outputs; explicit local opt-in/key/config required; CI blocks before SDK/network; built-in synthetic corpus only. Leak/malformed input cases do not dispatch. | Locally running it is a separate deliberate action; it never permits real abstracts or opens the website's assessment gate. |
| Batch, caching and fallback request design | Mock SDK requests demonstrate Batch API bulk dispatch, fixed system/rubric cache markers, adaptive thinking and explicit effort. Synchronous calls carry server-side fallback and its exact beta header; stop reasons are handled before content. | Anthropic documents that server-side fallback is unavailable in Batches; batch refusals use manual review. Real cache hits are unverified. |

## Executable coverage and observed checks

`tests/unit/ai-assessment-adapter.test.ts` covers the four BL-AI-01 acceptance
criteria through the actual adapter contract:

- `BL-AI-01 activation and manual-review continuity`: exact default-off flag,
  incomplete/malformed/version-mismatched/revoked/expired approvals, unapproved
  rubric, persisted scoped authority, TOTP, atomic budget denial, audit failure,
  disable during work and provider failure. Disabled rows assert zero global
  fetch, SDK, factory, configuration, authority and budget calls.
- `BL-AI-01 allowlist and identity canaries`: the five transmitted fields,
  removed account/evidence fields, safe audit metadata, all six identity
  categories, Arabic digits, repeated IRB labels, non-body leaks, malformed
  snapshots, coerced scalar rejection and capture before asynchronous work.
- `AI-04 untrusted content and structured response`: fixed system/user
  separation, no tools, supported JSON schema, adaptive effort, caching,
  refusal/truncation content getters kept unread, exact output coverage/ranges,
  malformed JSON, tool rejection, actual approved fallback model and provenance.
- `AI-06 bulk dispatch and stop switch` and `server-only official SDK transport`:
  approved batch bounds, random IDs, mixed-leak denial, scoped receipts,
  pending/refused/invalid/missing/duplicate/unknown results, disable, correct
  stable/beta SDK calls, pinned API endpoint, key-only auth and silent logging.

`tests/unit/ai-assessment-harness.test.ts` covers all 25 corpus input expectations,
mock provider outcomes, human/model separation and missing baselines, versioned
comparison validation, dedicated local key/consent/spend/budget guards, CI/hosted
denial, unsupported arbitrary inputs, Batch request settings, unordered result
collection, altered receipts, scope denial and mocked CI execution without a key.

Observed during independent review:

- PASS: `pnpm exec vitest run tests/unit/ai-assessment-adapter.test.ts tests/unit/ai-assessment-harness.test.ts`
  — final focused review passed 176 tests (113 adapter and 63 harness) in two files,
  including the real factory's actual-environment denial; no provider request.
- PASS: `node --conditions=react-server scripts/ai-evaluate.ts mock` — 25 rows,
  ten completed fixture outputs, 15 manual states, all 25 human baselines unassessed.
  The ignored report contains no abstract bodies, identity canaries or key fields.
- PASS after correction: native sanitizer probes block all six corpus identity
  canaries, reject an array completion status and reject an impossible calendar
  date. Licence/IRB identifiers and scalar/date validation first failed these
  probes and were repaired with regression coverage.
- NOT TESTED: real API requests/model entitlement, real-model scientific quality,
  billing, actual cache hits, committee-scored evaluation and reviewer/browser UAT.
  Production approval and the deferred integration gates remain BLOCKED.

Repository-wide checks, final branch/head and review receipts belong in
`docs/PROGRESS.md`; this focused matrix does not imply those checks were run.

## Separately gated work

BL-AI-02 durable jobs, database deduplication/leases/retries, current-version and
withdrawal checks, shared budget accounting, protected persistence, audited
activation, assignment/admin RLS and recovery UI are not completed by a server
contract. BL-AI-03 independent-draft/reveal/finalization UI and its permissions are
also separate. BL-AI-04 scientific/privacy approval must include actual provider
and fallback processing, locations, retention/training/confidentiality terms,
budget, disclosure and committee evaluation; technical tests cannot grant it.

## Official API references checked for this design

- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
  describes `output_config.format`, supported schema features and refusal/truncation
  exceptions. Unsupported score-range constraints are enforced by local validation.
- [Refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback)
  documents `server-side-fallback-2026-07-01`, served-model provenance and the Batch
  incompatibility. The SDK's generated Batch types do not override this restriction.
- [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing)
  describes per-item results and asynchronous cancellation/cache limitations.
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
  describes fixed-prefix cache markers, model-dependent minimum lengths and usage
  fields. A marked prefix alone does not prove it was cached.
- [Effort](https://platform.claude.com/docs/en/build-with-claude/effort)
  documents explicit `output_config.effort` for adaptive Opus 5.5 thinking.

Observed command receipts and final test status are recorded in `docs/PROGRESS.md`.
