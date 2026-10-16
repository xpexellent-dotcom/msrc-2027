# BL-AI-01 and synthetic evaluation acceptance map

Source authority: `Development_Specification_v0.5.txt` AI-01 through AI-06,
PRV-02/03/07, CFG-03/09/10 and REL-03, plus
`docs/backlog/09-ai-assessment.md#bl-ai-01`. ORG-040 selects DeepSeek with China
processing; ENG-042 (16 October 2026) replaces ENG-018's Anthropic transport.
**AI stays disabled.** The provider switch approves neither real manuscript
processing nor a scientific rubric, production configuration or live activation.

## Evidence boundaries

The tests exercise the server contract with mocked `fetch`/provider factories.
They establish no scientific accuracy, account entitlement, real API compatibility,
provider billing or institutional/privacy approval. No real API call is part of
this task or CI. The fixed rubric is `UNAPPROVED`; simulated scores and unassessed
human baselines stay distinct from committee evaluation. Observed commands/counts
are recorded in [PROGRESS](../PROGRESS.md); the coverage map is not a test receipt.

## Acceptance map

| Requirement / BL-AI-01 criterion | Required evidence in this slice | Integration boundary |
| --- | --- | --- |
| Disabled adapter makes no external request; AI-01/05 | Default-off flag, absent/invalid configuration, six missing/stale/revoked/mismatched approvals, rejected authority/MFA, budget denial and audit failure prevent dispatch. Configuration/approval digest and flag changes between gates prevent later dispatch. Disabled assertions include zero fetch/provider-factory calls. | Trusted approval storage, atomic accounting and durable auditing need production integrations. |
| Strict operating configuration; CFG-03/09/10 | Exact keys reject old `provider: "anthropic"`, effort, wrong/requested/serving models and additional fields. Digest binds all operating values, key fingerprint and fixed transport. | Engineering model selection and fixtures grant no organizer approval. |
| Payload contains only approved fields; AI-02, PRV-03/07 | Only title, specialty, study type, completion status and abstract body enter the user message. Applicant/account/snapshot IDs, local identity context, contacts, affiliations, licence/IRB/evidence never enter request body or metadata. | Database ownership and immutable snapshot lookup remain BL-REV prerequisites. |
| Identifying body text is checked; AI-02 | Own author/institution names from the snapshot, email, telephone, licence and IRB identifiers block dispatch. Generic EN/AR institution wording creates safe warning categories without matching text. Malformed snapshots/scalars/dates are rejected. | Pattern/name checks are screening, not anonymity proof; privacy-approved inspection remains necessary. |
| Untrusted content and structured output; AI-04 | Fixed rules/rubric in system, sanitized scientific JSON in user, explicit JSON mode/schema instruction, disabled thinking and no tools. Local validation rejects missing/extra criteria/fields, nonfinite/out-of-range scores, invalid types/JSON and empty/oversized comments. | Mocks establish request isolation and fail-closed behavior, not universal real-model injection resistance. Chat JSON mode supplies no schema guarantee. |
| Finish reason and model handling; AI-04 | Exactly one choice; `stop` parses, `length` is incomplete, `content_filter` is refusal, all other/unknown reasons are incomplete. Malformed/multiple choices are invalid. Stop reasons are handled before content. Unexpected model/tool content cannot produce accepted advice. | Returned model is checked against the single serving allowlist; the current model ID is not an immutable version pin. |
| Reasoning is excluded; AI-04, PRV-03 | Returned `reasoning_content` is never consumed or retained in accepted output, provenance, audit or evaluation report. | Thinking is explicitly disabled even though provider default is enabled. |
| Transport failure and credential control; AI-01/06, PRV-07 | Fixed official endpoint, timeout, zero retries, no redirects/ambient credentials or body logging. Non-2xx, timeout and network error become `provider_unavailable`. Endpoint/header override attempts are refused; Authorization uses the validated config key only. | No test uses a real key or sends a provider request. Provider-side automatic caching remains a privacy gate. |
| Manual review and unsupported batch; AI-01/06 | Every failure preserves human-only review and never sends an applicant decision. Batch submit/collect returns `batch_unsupported` with zero fetch calls, without sync loops, including after local harness guards. | Durable queued/recovery work and any future batch integration are separate tasks. |
| Provenance and human independence; AI-03/04 | `provider: "deepseek"`, requested/served model, prompt/rubric/snapshot versions, timestamp and safe warnings remain validated; no raw output/key/reasoning. Model/human values stay separate; missing human scores are unassessed. | Persistence/RLS is BL-AI-02; independent draft/reveal, override record and UI/API permissions are BL-AI-03. |
| Evaluation and activation; AI-05/06 | All 29 synthetic corpus expectations, mock outcomes, missing human baselines, versioned comparison validation and safe report fields remain tested. Dedicated synthetic key/consent/spend/budget and local-only/CI/hosted guards remain. Arbitrary input/receipts are refused; submit/collect never dispatch. | Scientific Lead must supply actual baselines and judge disagreements; no invented pass threshold. Privacy/terms/China transfer and six matching approvals remain required. |

## Executable coverage

`tests/unit/ai-assessment-adapter.test.ts` covers activation/manual continuity,
exact configuration and digest/approval races, authority/MFA/budget/audit failures,
locked snapshot identity and generic institution canaries, request role separation,
finish reasons, choice/model/schema validation, discarded reasoning, transport
failure/timeout/no retries, override refusal, config-only authentication and
unsupported batches. Existing sanitizer, immutability and safe-warning assertions
remain applicable after replacing provider-specific assertions.

`tests/unit/ai-assessment-harness.test.ts` covers the fixed 29 cases, mock outcomes,
human/model separation, comparison/provenance validation, dedicated local key and
consent/spend/budget controls, CI/hosted denial, arbitrary-input refusal and batch
unsupported without provider calls. The header guard is tested with hosted markers
cleared so each independent denial is exercised.

The mock CLI report is synthetic evidence only. No live model quality, billing,
cache-hit behavior, committee calibration, provider terms or reviewer/browser UAT
is claimed. Current PASS/FAIL/BLOCKED/NOT TESTED receipts belong in PROGRESS.

## Separately gated work

BL-AI-02 jobs, database deduplication/leases/retries, current-version and withdrawal
checks, shared budget accounting, protected persistence, audited activation,
assignment/admin RLS and recovery UI remain integration work. BL-AI-03 independent
draft/reveal/finalization and permissions are separate. BL-AI-04 requires scientific
and privacy approval of actual processing, China transfers, confidentiality,
retention/training/caching, budget, disclosure and committee evaluation.

See the [DeepSeek verification and activation note](ai-assessment.md) for official
URLs checked on 16 October 2026 and explicit NOT VERIFIED facts. Technical tests
cannot supply these approvals or open operational workflows.
