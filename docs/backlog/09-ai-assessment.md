# AI assessment

Separate approval-dependent M6 capability. Human review can open with this capability disabled. Assessment is advisory; it is not deterministic validation, originality checking, or a decision publisher. ORG-040 (6 October 2026) selects DeepSeek, processing in the People's Republic of China, superseding ENG-018's Claude provider choice. PR #40's built `@anthropic-ai/sdk`/`claude-opus-5-5` adapter remains unchanged in the policy-publication PR. Switch it to DeepSeek in separate work before activation; keep AI disabled. The historical DeepSeek prototype is not adopted automatically. [Implementation and activation notes](../features/ai-assessment.md).

<a id="bl-ai-01"></a>

## BL-AI-01 — Define a disabled advisory adapter with sanitized inputs

- **Source IDs:** AI-01, AI-02, AI-05, PRV-07, CFG-10.
- **Status:** Disabled Anthropic adapter and synthetic harness implemented; DeepSeek switch required by ORG-040 before activation. Live processing/integration remain blocked. Existing evidence is specific to the built adapter: [test matrix](../features/ai-assessment-acceptance.md).
- **Purpose:** The platform can isolate approved scientific assessment from confidential identity/evidence and from the decision authority.
- **Scope:** Server-only adapter contract, explicit activation gate, locked snapshot/rubric input, allowlisted scientific fields, body identity checks, provider configuration validation and synthetic implementation. Backlog task: switch the transport/configuration/provenance to DeepSeek under ORG-040, preserving disabled defaults and all confidentiality/manual-review controls; verify actual official APIs, terms/retention/training, China transfer safeguards, model/rubric/budget settings and repeat provider-specific synthetic/evaluation checks before activation. No provider code changes in the policy PR.
- **Exclusions:** Live real-manuscript calls, independent reviewer uploads to external tools, author/account/contact/affiliation/licence data, IRB/similarity evidence, automatic publication. A separate opt-in local script accepts only the fixed synthetic corpus; it is never run in CI.
- **Dependencies:** BL-REV-01, BL-REV-02; BL-SEC-01; [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).
- **Roles:** Scientific/privacy owners approve processing; authorized integration administrator configures; reviewers use approved in-platform results only.
- **States/transitions:** Disabled remains the default; only complete approved configuration can permit live dispatch; absent/invalid configuration routes to permitted manual review.
- **Data touched:** Sanitized snapshot/rubric reference, provider configuration and approval evidence; secret credentials remain server-only.
- **Acceptance criteria:** Disabled adapter makes no external request; payload contains only approved fields; identifying body text is checked; manually reviewing work does not require a successful AI run.
- **English/Arabic:** Participant/non-review administrator disclosure and status bilingual; scientific payload/reviewer material English; no automatic translation into provider requests.
- **Accessibility:** Accessible disclosure and status messages; manual path remains visible without a model-dependent control.
- **Security/RLS:** Server activation checks and privileged MFA; provider credentials never in browser/logs; restrict assessment rows to intended assignment/admin scope.
- **Audit/email:** Audit activation/config changes and dispatch metadata without manuscript/secret logging; no applicant decision emails from adapter calls.
- **Automated tests:** Disabled no-network assertion, locked-snapshot author/institution and contact/licence/IRB canaries, EN/AR generic institution warnings in provenance, malformed configuration, denied activation and manual-review continuity. PR #40 review narrows institution blocking to the submission's own names; generic study-setting wording is allowed (ENG-018).
- **Manual UAT:** Inspect synthetic payload and browser bundle; disable mid-workflow and continue human review.
- **Release gate:** Separate AI gate within REL-03: approved provider/terms/location/disclosure plus evaluation evidence.
- **Owner type:** Full-stack/security engineer with scientific and privacy owners.
- **TBD blocked:** Live transmission yes, CFG-10 and CFG-09; adapter contract/synthetic tests no.

<a id="bl-ai-02"></a>

## BL-AI-02 — Process assessment jobs with bounded recovery and validated provenance

- **Source IDs:** AI-01, AI-04, AI-06, ERR-02, AT-09.
- **Status:** Planned.
- **Purpose:** Assessment failure or hostile manuscript text cannot lose a submission or execute privileged actions.
- **Scope:** Durable queued/error/manual-review handling; bounded retry/cost limits from approved configuration; idempotent snapshot/rubric job; validated structured criterion/range output; model/prompt/version/timestamp provenance; administrator disable switch.
- **Exclusions:** Model tools with publication/data-access authority, unlimited retry/cost, treating malformed output as a score, inferred plagiarism/novelty proof.
- **Dependencies:** BL-AI-01; durable-job foundation; approved retry/cost configuration before activation.
- **Roles:** Restricted worker service; integration administrator handles exhausted jobs; scientific staff can select permitted manual review.
- **States/transitions:** Queued job completes with validated advisory output or enters recoverable error/manual-review state; withdrawn/superseded jobs cannot attach current results.
- **Data touched:** Assessment job/deduplication key, attempts, sanitized input version, validated output, provider/model/rubric/prompt versions, safe error category and cost accounting.
- **Acceptance criteria:** Injected text cannot alter tools/system rules; malformed/out-of-range output is rejected; retries do not create multiple effective results; switch halts further dispatch; AI failure never rejects the application.
- **English/Arabic:** Non-review administration status bilingual; reviewer output/scientific content English-only; safe error explanations available without raw provider response.
- **Accessibility:** Textual job status, keyboard retry/manual-route action, announced failure and no indefinite spinner.
- **Security/RLS:** Least-privilege worker; validate job ownership/version before write; no secrets/raw manuscripts in logs or participant projections.
- **Audit/email:** Audit dispatch, validated completion, exhaustion and administrator actions; operational alerts by email only; no applicant outcome from job completion.
- **Automated tests:** Injection/malformed output, outage, bounded retries, disable during queue, duplicate worker, withdrawal/version race and cost-limit stop.
- **Manual UAT:** Simulate provider timeout/schema failure; inspect administrator recovery and continuing human assessment.
- **Release gate:** AI activation gate and REL-06 failure/recovery evidence; provider limits must be approved.
- **Owner type:** Full-stack/platform engineer with security QA.
- **TBD blocked:** Synthetic worker no; live provider/output/cost limits yes, CFG-10.

<a id="bl-ai-03"></a>

## BL-AI-03 — Reveal suggestions only after an independent human draft

- **Source IDs:** AI-03, AI-04, REV-04, AT-09.
- **Status:** Planned.
- **Purpose:** Reviewers retain independent judgment and can explain substantive departures from advisory suggestions.
- **Scope:** Documented default independent draft before AI reveal; explicit reveal permission checked server-side; human confirmation/change with substantive override reason; separate human/model/committee records.
- **Exclusions:** AI values pre-filling initial assessment, inclusion in human-review average, disclosure of peer review status/scores, model-generated final decisions.
- **Dependencies:** BL-REV-04, BL-AI-02; approved rubric and reveal policy.
- **Roles:** Assigned reviewer drafts/reveals/confirms; Scientific Administrator inspects authorized follow-up; Participant cannot read advisory/private scores.
- **States/transitions:** Independent human draft enables permitted advisory reveal; reviewer then confirms or updates their own final assessment; unavailable AI still allows permitted completion.
- **Data touched:** Independent human draft, reveal timestamp, advisory result reference, final human scores and substantive change/reason record.
- **Acceptance criteria:** Direct API access cannot reveal suggestions before draft requirement; final human average excludes model scores; reviewer can complete when AI is absent; retained records reproduce which version was revealed.
- **English/Arabic:** Reviewer UI and assessment English-only; non-review administrator summaries bilingual; no participant-facing score disclosure.
- **Accessibility:** Semantic comparison, keyboard reveal, clear distinction between human and model values, non-color-only provenance labels.
- **Security/RLS:** Assignment/MFA/version checks plus reveal condition in API/data projection; prohibit cross-reviewer draft access.
- **Audit/email:** Audit reveal/finalization/substantive overrides; no applicant email or publication from reveal; retain safe provenance under approved retention.
- **Automated tests:** Direct pre-draft reveal denial, cross-assignment access, unavailable AI, changed rubric/snapshot, separate aggregate and required substantive reason behavior.
- **Manual UAT:** Draft without suggestions, reveal and change score with reason; repeat with failed AI and verify completion remains possible.
- **Release gate:** AI gate within REL-03 and independent-review acceptance evidence.
- **Owner type:** Full-stack engineer with scientific lead and accessibility QA.
- **TBD blocked:** Synthetic reveal flow no; live model and final rubric yes, CFG-03/CFG-10.

<a id="bl-ai-04"></a>

## BL-AI-04 — Record evaluation evidence and controlled activation approval

- **Source IDs:** AI-05, AI-06, REL-03, AT-09, CFG-10.
- **Status:** Planned.
- **Purpose:** Scientific/privacy owners can decide whether an approved advisory setup is suitable before any real manuscripts are transmitted.
- **Scope:** Versioned committee-scored evaluation cases, incomplete and varied study types, identity leakage/injection/unsupported claims/malformed failures; disagreement/override report; operating budget and rollback/disable runbook; explicit activation evidence.
- **Exclusions:** Invented acceptance score, claiming evaluation proves scientific correctness, automatic activation after technical tests, independent external manuscript uploads.
- **Dependencies:** BL-AI-01, BL-AI-02, BL-AI-03; [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03), [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).
- **Roles:** Scientific Lead owns evaluation judgment; privacy owner approves data handling; technical owner operates; release approver records activation.
- **States/transitions:** Disabled configuration becomes eligible for explicit activation only after approved evaluation and processing evidence; changed provider/model/prompt/rubric requires recorded reassessment and remains gated where evidence no longer applies.
- **Data touched:** Synthetic/approved evaluation corpus, committee baselines, run versions/results, approval evidence, budget/disable procedure; no unapproved real submissions.
- **Acceptance criteria:** Report names actual corpus/config and failures; human-only fallback rehearsed; no fabricated numerical pass threshold; approval and outstanding limitations remain visible before enablement.
- **English/Arabic:** Evaluation/scientific examples English; bilingual participant disclosure approved separately; operating notes usable by responsible staff.
- **Accessibility:** Reviewer evaluation includes keyboard/screen-reader comparison and clear unavailable state; approval artifacts have semantic headings/tables.
- **Security/RLS:** Restricted evaluation artifacts; approved corpus purpose/retention; no secrets; unauthorized users cannot enable assessment or inspect manuscript examples.
- **Audit/email:** Record approvers/config versions and activation/disable events; operational approval notices English email where sent; no applicant outcome email.
- **Automated tests:** Reproducible evaluation harness, injection/identity canaries, schema/range failures, manual fallback and production gate rejection without evidence.
- **Manual UAT:** Committee evaluates representative disagreements; privacy owner inspects payload/location terms; operator exercises disable and exhausted-job response.
- **Release gate:** Separate REL-03 AI approval; manual scientific review is not blocked merely by this unresolved capability.
- **Owner type:** Scientific lead, privacy owner and platform/security engineer.
- **TBD blocked:** Live evaluation criteria, provider/terms/location/cost approval yes, CFG-03/CFG-09/CFG-10; synthetic failure evaluation no.
