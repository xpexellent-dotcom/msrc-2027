# Synthetic advisory assessment evaluation

AI-01–AI-06 / BL-AI-01. Every title, abstract, number, author and institution in
`corpus.ts` is invented for testing. This is the only permitted corpus for the local
runner. It accepts no manuscript file, URL, alternative dataset or arbitrary prompt.
The 25 cases cover strong/weak studies, ongoing studies, different study designs,
unsupported claims, six identity leaks, three injection attempts and malformed input.
Mock cases additionally simulate refusal, truncation, malformed JSON, missing criteria,
out-of-range scores and provider failure. Identity leaks and malformed scientific input
are screened locally and are never submitted, including in the live synthetic run.

The fixed rubric is `UNAPPROVED-synthetic-v1`. Its three 0–4 ranges are engineering
fixtures, not committee weights, eligibility rules, acceptance thresholds or approval.
No local synthetic run can activate the production adapter. The production adapter
still needs its own complete, approved configuration and approval evidence.

## Mocked run (no key or network)

Use the repository's pinned Node 24 and pnpm. The `react-server` condition allows the
server-only modules in a native Node CLI; `.ts` imports work with Node's type stripping.

```powershell
pnpm ai:evaluate:mock
pnpm exec vitest run tests/unit/ai-assessment-harness.test.ts
```

The report is saved to `deliverables/ai-assessment/mock-report.json` (Git ignored).
Tests run every case against a mocked provider. Mocks establish plumbing and safe
fallback behavior; they do not establish real-model scientific accuracy or resistance
to prompt injection. No numerical pass threshold is fabricated.

## Optional real API run on these synthetic examples only

No real API run has been performed for this implementation. Never run this command in
CI or hosted deployments. `CI`, GitHub Actions, Vercel and other hosted environment
markers are denied before client creation; production environment and inherited custom
Anthropic headers are also denied. Do not add the live command to any CI workflow.

Use a locally supplied, restricted account key in `AI_SYNTHETIC_API_KEY`. The ordinary
`ANTHROPIC_API_KEY` variable does not authorize this runner. Set the provider Console
account/workspace spend limit first, then acknowledge that local setup by setting
`AI_SYNTHETIC_SPEND_LIMIT_CONFIGURED=yes`. Supply the key through a local environment
mechanism; never put it in a command argument, shell history, report, receipt or repository.

The required monetary values have no defaults. Check current Anthropic pricing and
provide conservative input/output USD-per-million ceilings that also cover cache
writes. The runner reserves conservatively using twice the serialized request byte
size plus provider-framing reserve and the explicit output-token bound. The reservation
must fit the supplied budget. This is a local upper estimate, not a hard invoice cap;
provider Console controls, actual billing and quotas still need operator review.
Output is limited to 512–4096 tokens per case. SDK retries and live automatic resubmission
are disabled. Adaptive thinking always receives the explicitly selected effort.

```powershell
# Replace each angle-bracket value with a locally chosen numeric value after pricing review.
pnpm ai:evaluate:synthetic submit --live-synthetic --budget-usd <cap> --input-price-ceiling <USD-per-million> --output-price-ceiling <USD-per-million> --max-tokens <512-to-4096> --effort medium
pnpm ai:evaluate:synthetic collect --live-synthetic --run-id <UUID-returned-by-submit>
```

Submission uses the official SDK's `client.messages.batches.create`. It first writes a
local reservation intent, then a receipt containing the batch ID and corpus/request
hashes. It sends only sanitized scientific fields for the built-in cases. The fixed
system/rubric prompt has cache controls; batch requests use the one-hour cache duration.
Cache hits are best effort and are never assumed in the reservation. The account key
is excluded from all files. The SDK endpoint is fixed to `https://api.anthropic.com`,
logging is off and requests have a 30-second timeout.

`collect` verifies the local receipt's corpus, model, prompt, rubric, request hashes,
run ID and reservation before accessing the API. It makes a bounded status check and
returns if pending; rerun `collect` later with the same run ID. It never submits a new
batch. Results are matched by `custom_id`, not order. Unknown/duplicate IDs are denied;
missing, canceled, expired, errored, refused, truncated or invalid outputs remain manual.
The response stop reason is handled before content is parsed. Reports record the
requested model and the actual returned model separately; an unexpected model is not
accepted as a score. A key or raw provider exception is never printed.

Anthropic documents that server-side refusal fallback is unsupported in Message Batches.
The synchronous application adapter uses documented server-side refusal fallback;
the bulk runner omits fallback settings and routes any refusal to manual review.
If submission is interrupted or returns an ambiguous network error, inspect the
reservation intent and reconcile the batch in Console before starting another run.
Do not automatically rerun `submit`: the provider may already have accepted it.

## Report and scientific-lead comparison

`report.ts` produces one row per case with input-screening expectation, outcome/failure,
criterion ranges, model scores/rationales, human independent/final scores, differences,
override reasons and versioned provenance. Human values initially remain `null` and
`UNASSESSED`. Mock scores are explicitly artificial model fixtures, never human baselines.

To compare a scientific lead's independently entered scores, pass `humanAssessments`
to `runMockedEvaluation` or `createEvaluationReport` in a reviewed local comparison task.
Each record must name a built-in case ID, snapshot/rubric versions, source
`scientific_lead`, an evidence-reference identifier and every criterion's independent
and final score. For a changed final score, supply an override reason. Artificial test
comparisons use `synthetic_test_fixture`; aggregates keep these sources separate.
This input supplies scores only and cannot add or replace abstracts. Do not disclose
personal reviewer identities in the report. Reports reject mismatched provenance,
incomplete case sets, duplicate or out-of-range scores. Disagreement is descriptive;
the scientific lead sets evaluation criteria and judges suitability separately.

The report grants no activation approval, makes no committee decision, excludes model
scores from human averages and leaves manual review available for every row.

## Remaining activation evidence

Live participant-manuscript assessment needs an authorized organizational Anthropic
account and server-only key, provider terms/location/retention/training review, approved
confidentiality and EN/AR disclosure, approved budget cap and ledger, the committee rubric,
scientific-lead evaluation with actual human baselines, privacy approval, trusted
version-bound activation approval, authorized MFA operator, and operational recovery/
disable/retention controls. The DeepSeek prototype is not used. See
`docs/features/ai-assessment.md` for the separate application activation gates.

Official references checked for this implementation:
[Message Batches](https://platform.claude.com/docs/en/build-with-claude/batch-processing),
[structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs),
[prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching),
[refusals and fallback](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback).
