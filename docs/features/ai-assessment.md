# Disabled advisory assessment and synthetic evaluation

BL-AI-01; AI-01 through AI-06, PRV-07, CFG-03/09/10, REL-03. Provider design:
ENG-018, 5 October 2026. This foundation is advisory and disabled. The DeepSeek
prototype is not used. There are no real abstracts, credentials, hosted changes,
reviewer screens or applicant outcomes in this change.

## Adapter boundary

`src/lib/ai-assessment/` contains the server-only contract, sanitizer, request and
response validation, and official Anthropic SDK transport. The payload contains
only title, specialty, study type, completion status and abstract body. Local
author and institution context is used to check for identifying text and is never
included in the provider payload. Email, telephone, author-name, institution,
licence and IRB canaries block dispatch and return safe categories, without quoting
the identifying text. Pattern and known-name checks are a screening aid; privacy
approval still requires inspection of representative residual leaks and false flags.

The locked snapshot and rubric remain associated with the result. Manuscript text
is JSON-encoded in a user turn as untrusted data. Fixed rules and the rubric are in
the system prompt; the model has no tools. The output schema requires one score and
short rationale for each configured criterion, plus an overall comment. Local
validation rejects unknown/missing criteria, invalid JSON, extra fields, invalid
types, empty/oversized explanations and scores outside their rubric range.

The adapter checks `stop_reason` before reading content. Refusal, truncation,
provider outage and invalid output yield no accepted score. Manual review remains
available; nothing here rejects, ranks, publishes or calculates a human average.
AI-03 independent human draft/reveal and separate human follow-up records belong to
BL-AI-03; they are not implemented by this adapter.

Provenance identifies provider, requested and serving model, prompt/rubric versions,
locked snapshot and assessment time. Changes to the approved configuration require
fresh matching evidence. Approval digests also bind the credential fingerprint,
evaluated serving-model allowlist and fixed SDK/endpoint/timeout/retry/cache policy.
Unknown serving models cannot supply an accepted score. Safe audit events omit manuscript, raw provider output,
identity context and keys. SDK automatic retries are disabled. Production authority,
atomic budget reservation and durable audit storage must be supplied by trusted
server integrations; there is no browser-configurable activation path.

## Verified Anthropic API design

- Official `@anthropic-ai/sdk` 0.131.0; `claude-opus-5-5`.
- `thinking: { type: "adaptive" }` and explicit `output_config.effort`.
- `output_config.format: { type: "json_schema", schema: ... }` with required
  properties and `additionalProperties: false`. Numeric bounds and string lengths
  are described in the provider schema and enforced locally because those raw
  schema constraints are unsupported by Anthropic.
- Individual requests use `client.beta.messages.create` with `fallbacks: "default"`
  and `betas: ["server-side-fallback-2026-07-01"]`. The actual serving model is
  recorded. Privacy, scientific evaluation and budget approval must cover default
  refusal routing, rather than treating the primary model as the only processor.
- Bulk requests use Message Batches creation, retrieval and streamed results,
  correlated by `custom_id`, without relying on result order. Anthropic explicitly
  does not support `fallbacks` in batch items. Refused/failed items remain manual
  review; they are not automatically resubmitted.
- Only fixed system/rubric blocks have explicit cache breakpoints. No abstract
  breakpoint is added. Cache hits depend on prefix length, TTL and batch scheduling;
  a cache directive is not evidence of a cache hit or a zero-retention guarantee.
  Batch workspace access and provider result retention require separate privacy review.

Official documentation checked for this task:
[structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs),
[adaptive thinking and effort](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost),
[refusal fallback and Batch incompatibility](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback),
[Message Batches](https://platform.claude.com/docs/en/build-with-claude/batch-processing),
[prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
Installed SDK source/types were checked alongside these pages. No live response or
actual model availability is claimed.

## Activation requires all of the following

1. An organizational Anthropic account/workspace with verified custodians,
   model entitlement, billing owner and approved service terms. An existing account
   or subscription is not assumed by this implementation.
2. A restricted server-side API key stored outside the repository and browser.
   Agree rotation, revocation, incident handling and access audit. Never use a
   `NEXT_PUBLIC_` secret or paste a key into an approval document.
3. An approved numerical budget cap, account/workspace spend controls, current
   price ceilings, token/request limits, timeout and maximum batch size. A trusted
   atomic reservation must prevent concurrent dispatch from overspending the
   approved budget. SDK retries stay off; any later retry policy needs approval.
4. The committee's approved, versioned rubric replacing the `UNAPPROVED` placeholder,
   including each criterion/range and treatment of ongoing/incomplete studies.
   No weights, selection threshold or numerical acceptance threshold is invented.
5. Scientific Lead evaluation of committee-scored examples across study types and
   failures. Record disagreements, unsupported claims, overrides, limitations,
   exact corpus/model/prompt/rubric versions and approval. Mock scores do not satisfy
   this gate. Reassess provider/model/prompt/rubric changes and default fallback routing.
6. Privacy/institutional approval of confidentiality, controller and processors,
   locations/transfers, training and retention terms, Batch workspace visibility and
   result retention, caching, logs, deletion/requests and approved bilingual applicant
   disclosure. Screening does not establish anonymization or legal approval.
7. Trusted approval evidence bound to the exact operating configuration, with
   approver/evidence references and validity/revocation. Privileged individually
   identified execution, required MFA and server/database authorization must be
   implemented, alongside private assessment storage and durable safe auditing.
8. BL-AI-02 durable jobs/idempotency, superseded/withdrawn snapshot protection,
   recovery/cost accounting; BL-AI-03 assignment-safe independent draft and reveal;
   BL-AI-04 evaluation/approval evidence and REL-03/06 checks. These are separate
   integration release dependencies, not completed by contract unit tests.
9. Only after those gates pass, an authorized operator sets server-only
   `AI_ASSESSMENT_ENABLED=true` with the complete approved configuration. The flag
   alone, a key alone, malformed evidence, or an unapproved rubric cannot dispatch.
   This PR does not supply or enable a production configuration or worker.

## Evaluation and reporting

The fixed corpus under `evaluation/ai-assessment/` is artificial and contains about
25 strong, weak, ongoing, identity-leaking, injection and malformed cases. Its rubric
is conspicuously `UNAPPROVED`. Unit tests run a mocked provider only. Reports preserve
per-criterion model and human scores, disagreement and override fields, provenance
and failures. Actual human scores remain absent until supplied; synthetic comparison
values are labelled synthetic. There is no fabricated committee approval/pass threshold.

The local CLI has its own explicit synthetic-only boundary, dedicated local key,
run consent and budget controls. It cannot accept an arbitrary abstract file or real
submission and refuses CI and hosted environments. See the corpus README for exact
commands and report schema. No real API evaluation was executed for this task.

## Disable, evidence and remaining work

Unset `AI_ASSESSMENT_ENABLED` to stop new adapter dispatch; revoke/expire the matching
configuration evidence or remove the key as appropriate. Keep human review available.
A submitted provider batch can already be processing; disabling local dispatch does
not erase it or establish cancellation. Operators must inspect/cancel it in the approved
provider workspace and follow the approved retention procedure. Durable shutdown,
recovery and persistence UAT belong to BL-AI-02/04.

[Acceptance/test matrix](ai-assessment-acceptance.md) names the executable coverage
and its limits. Current commands/results are in [PROGRESS](../PROGRESS.md). Next:
committee rubric and scoring, privacy/data-flow review, then the separately scoped
durable-job and reviewer integration. Rollback removes this unused module/evaluation
tool and SDK dependency; no database migration or public UI rollback is needed.
