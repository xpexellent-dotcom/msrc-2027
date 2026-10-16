# Synthetic advisory assessment evaluation

AI-01–AI-06 / BL-AI-01; ORG-040. Every title, abstract, number, author and institution
in `corpus.ts` is invented for testing. This fixed corpus is the only permitted input.
The runner accepts no manuscript file, URL, alternative dataset or arbitrary prompt.

The 29 cases cover strong/weak and ongoing studies, varied study designs, unsupported
claims, eight identity leaks, three injection attempts and malformed input. Two EN/AR
privacy canaries retain a generic tertiary-hospital setting in Jeddah with the typed
`generic_institution_mention` warning; matching the same phrase to local institution
identity still blocks it in unit coverage. Named fictional submitter institutions in
EN/AR are also blocked. Arabic cases test screening only; production scientific
submissions remain English. Identity leaks and malformed inputs are screened locally.

The fixed rubric is `UNAPPROVED-synthetic-v1`. Its three 0–4 ranges are engineering
fixtures, not committee weights, eligibility rules, acceptance thresholds or approval.
The request model is `deepseek-flash`, with thinking disabled and JSON object mode.
Strict local validation supplies the criterion/range/shape contract. Mock responses use
DeepSeek Chat Completions choices and finish reasons; they additionally simulate refusal,
truncation, malformed JSON, missing criteria, out-of-range scores and provider failure.
The parser discards reasoning content. Only validated answer fields reach the report.

## Mocked run (no key or network)

Use the repository's pinned Node 24 and pnpm. The `react-server` condition permits
server-only modules in the native Node CLI; `.ts` imports use Node type stripping.

```powershell
pnpm ai:evaluate:mock
pnpm exec vitest run tests/unit/ai-assessment-harness.test.ts
```

The report is saved to `deliverables/ai-assessment/mock-report.json` (Git ignored).
Tests run all cases against a mocked provider. Eleven screened cases never reach that
mock. The expected fixture report has 29 rows: 12 completed, 17 manual-review states,
and 29 unassessed human baselines. This establishes plumbing and safe fallback behavior;
it does not establish real-model scientific accuracy or prompt-injection resistance.
No numerical suitability threshold is fabricated.

## Real synthetic batch execution is unsupported

DeepSeek bulk dispatch and collection are deliberately unsupported in this adapter.
Both existing `submit` and `collect` commands return `manual_review` with reason
`batch_unsupported`. They make zero provider calls, create no reservations, intents,
batch IDs or receipts, and do not read old Anthropic receipts or result streams.
They never emulate batches with synchronous calls. No real API run has been performed.
Any future provider batch transport or separate synchronous synthetic runner requires
explicit implementation and evaluation work; it cannot reuse historical receipts as
DeepSeek approval. Current official API findings are recorded, with the verification
date and source URLs, in [the feature note](../../docs/features/ai-assessment.md#deepseek-api-verification).

The retained unsupported commands still reject CI/hosted execution, production mode,
missing local consent, absent dedicated key, unacknowledged spend limits, arbitrary
inputs, malformed arguments and inherited base-URL/header overrides. The only key
variable accepted by these consent guards is `AI_SYNTHETIC_API_KEY`; ordinary
`DEEPSEEK_API_KEY` and old `ANTHROPIC_API_KEY` do not authorize them. No key is put in a
command argument, shell history, receipt, report or source file. No new provider SDK
or live-client factory exists in this runner.

The unsupported `submit` command retains an explicit local cost preview: callers must
supply `--live-synthetic`, positive bounded `--budget-usd`, `--input-price-ceiling`,
`--output-price-ceiling`, `--max-tokens` (512–4096) and `--thinking disabled`. The preview
uses twice the serialized request byte size plus framing reserve, and the output-token
bound, without assuming cache discounts. It rejects a preview over the chosen cap; no
money is reserved and nothing is sent. This is an engineering estimate, not a billing
cap or pricing approval. The unsupported `collect` command accepts only
`--live-synthetic --run-id <UUID>` and ignores any historical receipt. Do not run either
command as a way to obtain model scores.

## Report and scientific-lead comparison

`report.ts` produces one row per built-in case with screening expectation, outcome and
failure, criterion ranges, model scores/rationales, human independent/final scores,
differences, override reasons and versioned provenance. Provider labels are
`mock_deepseek` for deterministic fixtures and `deepseek` for unsupported manual-only
batch artifacts. Requested and returned models are separate; unexpected returned models
cannot produce accepted scores. Provenance includes safe warning categories, never the
matching institution phrase, abstract excerpt, key, provider body or reasoning content.
Unknown, duplicate, missing or fabricated warnings and extra provenance fields fail.

Human values initially remain `null` and `UNASSESSED`. Mock scores are artificial model
fixtures, never human baselines. To compare independently entered scores, pass
`humanAssessments` to `runMockedEvaluation` or `createEvaluationReport` in a reviewed
local comparison task. Each record must name a built-in case ID, snapshot/rubric
versions, source `scientific_lead`, an evidence-reference identifier and every
criterion's independent and final score. Changed final scores require an override
reason. Artificial comparisons use `synthetic_test_fixture`; aggregates keep those
sources separate. This input supplies scores only and cannot add or replace abstracts.
Do not disclose personal reviewer identities in reports. Mismatched provenance,
incomplete case sets, duplicate or out-of-range scores are rejected. Disagreement is
descriptive; the scientific lead sets evaluation criteria and judges suitability.

The report grants no activation approval, makes no committee decision, excludes model
scores from human averages and leaves manual review available for every row.

## Remaining activation evidence

AI stays disabled. A local mock run cannot activate the application adapter. Real
participant-manuscript assessment still needs an authorized organizational DeepSeek
account and server-only key, terms/location/retention/training review, China transfer
safeguards, confidentiality and EN/AR disclosure, approved budget cap and durable ledger,
committee rubric, scientific-lead evaluation with human baselines, six version-bound
approvals, authorized operator and operational recovery/disable/retention controls.
The historical DeepSeek prototype is not adopted. See
[the feature note](../../docs/features/ai-assessment.md) for the independent activation
gates and current official API evidence. Technical tests grant no processing approval.
