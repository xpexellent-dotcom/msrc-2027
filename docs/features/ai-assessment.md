# Disabled advisory assessment and synthetic evaluation

BL-AI-01; AI-01 through AI-06, PRV-02/03/07, CFG-03/09/10, REL-03.
ORG-040 selects DeepSeek, with processing in the People's Republic of China.
ENG-042 (16 October 2026) replaces ENG-018's Anthropic transport with the
server-only DeepSeek adapter. **AI remains disabled.** The switch supplies no
credential, approved production configuration, route, worker, persistence,
reviewer screen or applicant outcome. The historical DeepSeek prototype is not
imported. Published disclosure is independent of permission to dispatch.

## Adapter boundary

`src/lib/ai-assessment/` contains the server-only contract, sanitizer, request and
response validation, and plain `fetch` transport. The payload contains only title,
specialty, study type, completion status and abstract body. Applicant, account and
snapshot identifiers are never sent. The locked snapshot remains associated with
the local result, without becoming provider metadata or `user_id`.

Local author and institution context screens identifying text and never enters
the provider payload. Email, telephone, the submission's own author and institution
names, licence numbers and IRB numbers block dispatch. Failures contain safe
categories rather than matching text. Generic institution words such as university,
hospital and college of medicine, including Arabic equivalents, are non-blocking
warnings. Provenance stores only their allowlisted category, without a body excerpt.
Screening is an aid; privacy approval still requires inspection of residual leaks
and false flags.

Fixed rules and the versioned rubric are in one system message. The five sanitized
scientific fields are JSON-encoded as untrusted data in one user message. No tools,
streaming, fallback routing, betas or application cache directives are supplied.
The request uses `response_format: { type: "json_object" }` and explicitly asks for
JSON using the assessment schema. Local `validateAssessmentOutput` remains the
authority for exact criterion coverage, finite in-range scores, required short
rationales, overall comment, exact keys and valid types.

Exactly one response choice is required. Its `finish_reason` is checked before
reading content: `stop` permits parsing, `length` becomes `incomplete_output`, and
`content_filter` becomes `refusal`. Every other reason, including `tool_calls`,
`insufficient_system_resource`, `aborted` and unknown future reasons, becomes
`incomplete_output`. Malformed/multiple choices, malformed JSON, unexpected tool
content and invalid schema/ranges become `invalid_output`. A returned model outside
the approved `servingModelIds` is rejected. Only final answer `content` is consumed;
`reasoning_content` is ignored and never copied to outputs, reports or provenance.

Failures leave permitted manual review available and never reject, rank or publish
an application. AI-03 independent draft/reveal and separate human follow-up records
belong to BL-AI-03. Model scores never enter a human average.

## Transport and approval binding

`deepseek.server.ts` uses the fixed official
`https://api.deepseek.com/chat/completions` endpoint, one 60-second bounded attempt,
zero automatic retries, `redirect: "error"` and `credentials: "omit"`. Non-2xx,
network failure and timeout return `provider_unavailable`; provider exception and
request/response bodies are not logged. Authorization is a Bearer token from the
validated configuration only; `DEEPSEEK_API_KEY` is not an implicit transport input.
Environment endpoint/header overrides (`DEEPSEEK_BASE_URL`, `DEEPSEEK_API_BASE`,
`DEEPSEEK_CUSTOM_HEADERS`, `DEEPSEEK_HEADERS` and legacy `ANTHROPIC_CUSTOM_HEADERS`)
are refused.

Configuration requires the exact DeepSeek keys, provider literal `deepseek`, the
single requested/serving model `deepseek-flash` and explicit `thinking: "disabled"`.
Legacy Anthropic provider/effort fields are invalid. The strict schema and digest
bind every operating value, including the credential fingerprint, model allowlist,
thinking setting, rubric, budget and fixed transport policy. All six independent
approval kinds (provider, privacy, scientific lead, rubric, budget and activation)
must match the configuration, remain current and be rechecked between gates.
The default-off flag, persisted privileged authority/MFA, atomic budget reservation,
safe audit and configuration/approval digest rechecks remain required. Disabling,
revocation or a changed operating value prevents later dispatch.

Provenance records `provider: "deepseek"`, requested/serving model, prompt/rubric
versions, local locked snapshot, assessment time and safe screening categories.
Safe audit events omit manuscripts, raw provider output, identity context and keys.
Production authority, atomic budget reservation and durable audit storage must come
from trusted integrations; this module creates no browser activation path.

Batch submission and collection return manual review with `batch_unsupported`,
without a provider request. Sync-call loops do not emulate a batch. This is an
explicitly unsupported capability even if an official batch API becomes available;
adoption would need separate design, approval and tests.

## DeepSeek API verification

Checked **16 October 2026**, using official DeepSeek documentation and official
search-indexed documentation where direct page retrieval failed. These are API
documentation facts, not evidence of account entitlement, a successful real request,
scientific quality, contractual approval or production readiness. No real DeepSeek
API call was made.

| Topic | Verified documentation and implementation choice |
| --- | --- |
| Base URL and model IDs | [Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/) lists OpenAI-format base URL `https://api.deepseek.com`, current IDs `deepseek-flash` and `deepseek-v4-pro`, and versions DeepSeek-V4.1-Flash and DeepSeek-V4-Pro-0813. Only `deepseek-flash` is allowlisted here; deprecated aliases and the other current model are refused. This ID is not an immutable version pin. |
| Endpoint and JSON support | [Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/) documents `POST /chat/completions` and `response_format` types `text`/`json_object`; JSON mode needs an explicit JSON instruction. The selected endpoint does not document `json_schema`. The separate [Responses API](https://api-docs.deepseek.com/api/create-response/) documents `json_schema`, but is outside this adapter. JSON mode alone does not validate the assessment schema; local strict validation stays mandatory. |
| Finish reasons and choices | [Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/) lists `stop`, `length`, `content_filter`, `tool_calls`, `insufficient_system_resource` and `aborted`, with response choices and final `message.content`. The fail-closed mapping above is an application decision. |
| Thinking and reasoning | [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode/) documents default-enabled thinking, explicit `thinking.type` enabled/disabled, and `reasoning_content` beside final `content`. Without tools, earlier reasoning need not be resent. This single-turn adapter explicitly disables thinking and discards any returned reasoning; it does not retain or display chain-of-thought. |
| Batch API | No official batch endpoint was found in the reviewed [API reference](https://api-docs.deepseek.com/api/create-chat-completion/) navigation or official-domain batch searches. An official batch API's existence is **NOT VERIFIED**; absence from these references is not proof none exists. Batch remains deliberately unsupported with zero calls. |
| Rate limits | [Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/) lists account-level concurrency of 2500 for Flash and 500 for Pro, with excess requests receiving 429. It describes non-streaming blank-line keepalives and closure after ten minutes if inference has not started. These provider ceilings do not set the application's approved budget or throughput; the adapter's timeout remains 60 seconds. |
| Error codes | [Error Codes](https://api-docs.deepseek.com/quick_start/error_codes/) documents 400 invalid format, 401 authentication, 402 balance, 422 parameters, 429 rate limit, 500 server error and 503 overload. Direct retrieval failed; the official indexed page supplied these values. The transport returns the same safe unavailable category for every non-2xx, without retrying or exposing bodies. |
| Retention/caching statements | [Context Caching](https://api-docs.deepseek.com/guides/kv_cache/) describes disk caching enabled by default, best-effort hits and unused-cache clearance usually within hours to days. Direct retrieval failed; the official indexed page supplied this statement. Omitting cache directives does **not** disable provider caching or establish zero retention. |
| Training and contractual retention | A no-training guarantee, complete retention/deletion schedule, request-log retention and binding institutional processing terms were **NOT VERIFIED** from the reviewed API documentation. The [FAQ entry](https://api-docs.deepseek.com/faq/) redirects to an official static page whose content was unavailable to this review. Privacy owners must obtain and approve actual terms, confidentiality, cache handling, locations and China transfer safeguards before activation. |

## Activation prerequisites (unchanged)

1. An authorized organizational DeepSeek account, verified custodians, billing
   owner, model entitlement and approved processing terms. An existing subscription
   or credential is not assumed.
2. A restricted server-only key outside the repository/browser; approved rotation,
   revocation, incident handling and access audit. Never put a key in approval notes.
3. Approved numerical budget cap, account spend controls, conservative current
   price ceilings, token/request limits and timeout. Trusted atomic reservations
   must prevent concurrent overspending. No retries or batch activation are implied.
4. The committee's approved versioned rubric, replacing the `UNAPPROVED` fixture,
   with criteria/ranges and ongoing-study treatment. No weights or acceptance
   threshold are invented.
5. Scientific Lead evaluation against actual committee-scored examples, recording
   disagreements, unsupported claims, overrides, limitations and exact corpus,
   model, prompt and rubric versions. Reassess provider/model/prompt/rubric changes;
   mocked scores do not satisfy this gate.
6. Privacy/institutional approval of confidentiality, processors, locations and
   transfers, training/retention, automatic caching, logs, deletion/requests and
   approved bilingual applicant disclosure. Screening is not proof of anonymity.
7. Trusted, version-bound approvals with named evidence and validity/revocation;
   individually identified privileged execution, required MFA, server/database
   authorization, private storage and durable safe audit.
8. BL-AI-02 jobs/idempotency, superseded/withdrawn snapshot protection, recovery and
   cost accounting; BL-AI-03 assignment-safe independent draft/reveal; BL-AI-04
   evaluation/approval and REL-03/06 evidence. Contract unit tests do not complete
   these integration dependencies.
9. Only after those gates pass may an authorized operator enable server-only
   `AI_ASSESSMENT_ENABLED=true` with complete approved configuration. A flag, key,
   placeholder rubric or technical test result alone cannot enable dispatch.

## Evaluation, disable and remaining work

The built-in 29-case corpus under `evaluation/ai-assessment/` is artificial, with
strong/weak/ongoing studies, varied study types, identity leaks, injections and
malformed inputs/outputs. EN/AR privacy pairs allow generic institution wording
while blocking the submission's own identity; scientific submissions stay English.
Its rubric is `UNAPPROVED`. Tests and `ai:evaluate:mock` use mocked providers only.
Reports keep model scores, human scores, disagreements and override fields distinct.
Actual human scores remain unassessed until supplied; synthetic comparison values
are explicitly labelled, without a fabricated pass threshold.

The CLI retains its dedicated `AI_SYNTHETIC_API_KEY`, explicit synthetic consent,
local-only/CI/hosted guards and budget controls. It accepts only this fixed corpus.
Its submit/collect commands stop with `batch_unsupported` and never dispatch; no
sync loop or live synthetic run is introduced. See the corpus README for commands.

Unset `AI_ASSESSMENT_ENABLED` or revoke/expire matching evidence to stop new
application dispatch, and keep human review available. Credential revocation and
provider-side retention handling require the approved account procedure; stopping
dispatch is not proof remote data was erased. Durable recovery/shutdown UAT remains
BL-AI-02/04 work.

[Acceptance/test matrix](ai-assessment-acceptance.md) describes executable coverage
and limits; current observed commands and counts are in the [progress note](../progress/2026-10-16-codex-deepseek-adapter.md).
Next are committee rubric/calibration, privacy/data-flow and terms review, then the
separate durable-job and reviewer integrations. No public policy, UI or database
migration changes form part of this transport switch.
