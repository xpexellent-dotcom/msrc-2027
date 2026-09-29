# Surveys

M10 delivery, with S2 privacy and retention design completed before dependent data collection. Participant-linked completion and unlinked feedback are separate. The backlog does not select an unlinking algorithm or claim anonymity before assessment.

<a id="bl-srv-01"></a>

## BL-SRV-01 — Prove an approved S2 unlinking and retry design

- **Source IDs:** CRT-02, DAT-03, API-01, PRV-02, PRV-03, PRV-05, ADM-05, AT-14
- **Status:** Planned; technical unlinking method awaiting approval.
- **Purpose:** Participants can give feedback without administrators recovering their identity through a retained technical linkage.
- **Scope:** Short design/threat-model PR plus synthetic proof fixture for the proposed method; inventory answer/completion stores, logs, tokens, timing/metadata, exports, backups and replay behavior; obtain recorded privacy/technical approval.
- **Exclusions:** Production feedback collection, calling pseudonymized answers anonymous, reusable account-response maps and invented demographic suppression thresholds.
- **Dependencies:** BL-SEC-01; privacy retention/data-flow work; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08), [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).
- **Roles:** Privacy owner; security/backend engineer; authorized survey owner; Super Admin as an adversarial access scenario.
- **States/transitions:** Candidate design → assessed evidence → approved method or unresolved blocker; no survey-enabled state until approval.
- **Data touched:** Synthetic answer/completion/token/log fixtures and design evidence only; no real respondents.
- **Acceptance criteria:** No retained shared join key, response map, reusable token, account/IP/email/name or precise correlated request identifier joins answers to identity; assess free text, small groups and metadata; demonstrate durable acceptance/retry without duplicate credit or retained linkage.
- **English/Arabic:** Assess both-language free text and translated anonymity/privacy explanations; participant instructions must make no unsupported claim.
- **Accessibility:** Design supports accessible non-timed completion and retry, without forcing tracking-based challenges.
- **Security/RLS:** Threat model includes service/admin/log/backup/export access; isolation is not merely hidden UI or RLS over an existing identity map.
- **Audit/email:** Identity-linked audit must never contain feedback payload/response IDs; no feedback contents in email or diagnostics.
- **Automated tests:** Synthetic correlation inspection, schema/log/export contract tests, replay/partial-failure proof and absence of forbidden identity fields.
- **Manual UAT:** Privacy/security reviewers attempt re-identification with authorized administrator exports/logs and assess wording.
- **Release gate:** REL-05, REL-06; recorded S2 method/retention approval before surveys enable.
- **Owner type:** Privacy/security engineer with technical and survey owners.
- **TBD blocked:** Design/proof investigation unblocked; production method adoption blocked by CFG-08/09 approval.

<a id="bl-srv-02"></a>

## BL-SRV-02 — Configure and render approved bilingual questionnaires

- **Source IDs:** CRT-02, CRT-01, CMS-04, TIM-01, ACC-01, LOC-01
- **Status:** Planned; question sets and deadlines unresolved.
- **Purpose:** Participants receive the correct general or workshop survey with clear privacy instructions and accessible questions.
- **Scope:** Versioned approved survey definition and bilingual rendering, general/workshop association, server-enforced window and explicit separate contact route for personal follow-up.
- **Exclusions:** Invented questions/required demographics, author-identifying feedback fields, changing ordinary certificate criteria and embedded support-case tracking.
- **Dependencies:** BL-SRV-01; survey-owner authorization; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08), [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09); support route.
- **Roles:** Participant; explicitly authorized survey-configuring administrator under approved grant; privacy/content reviewer.
- **States/transitions:** Draft question/version → approved active window → closed; answer draft remains local UI state until approved submission service accepts it.
- **Data touched:** Survey definition/version, translations, associated edition/workshop, configured window and approved privacy wording.
- **Acceptance criteria:** Missing approval/questions/window/unlinking configuration keeps live survey closed; correct survey is distinguishable; free-text instructions discourage self-identification; server rejects submissions after configured cutoff.
- **English/Arabic:** Every question, option, error and instruction bilingual/RTL; response language itself must not become an identity join.
- **Accessibility:** Semantic fieldsets, programmatic labels, keyboard navigation, error summary and screen-reader review; no unnecessary countdown pressure.
- **Security/RLS:** Only authorized scoped configuration writes; public/participant reads cannot expose drafts or other answers; reject arbitrary additional identity fields.
- **Audit/email:** Audit definition approval/version only; any English invitation links to locale-aware UI and carries no answer identifier.
- **Automated tests:** Translation completeness, wrong/closed survey, unapproved definition, field allowlist, keyboard validation and locale data preservation.
- **Manual UAT:** Survey/privacy owner inspects synthetic English/Arabic general and workshop forms on mobile and screen reader.
- **Release gate:** REL-05/06; approved questions, windows, retention and S2 method.
- **Owner type:** Full-stack/accessibility engineer with survey/privacy owners.
- **TBD blocked:** Synthetic form shell unblocked; actual questionnaire and production windows blocked by CFG-08/09.

<a id="bl-srv-03"></a>

## BL-SRV-03 — Durably accept unlinked feedback and separate completion evidence

- **Source IDs:** CRT-02, DAT-03, API-01, API-02, API-03, ERR-02, AT-14
- **Status:** Planned; depends on approved BL-SRV-01 method.
- **Purpose:** A valid feedback submission counts toward eligibility even when a request is retried, without making answers identifiable.
- **Scope:** Implement approved unlinking protocol, separate feedback store and participant completion ledger, bounded recovery/retry and owner-readable completion state; no answer-to-person reconciliation tool.
- **Exclusions:** Foreign key/shared join key between answers and completion, payload-bearing identity audit, admin re-identification and claims of delivery before durable acceptance.
- **Dependencies:** BL-SRV-01 approved method; BL-SRV-02; participant verification; durable job/recovery infrastructure and privacy retention policy.
- **Roles:** Participant sees own completion; authorized survey analyst sees only approved unlinked feedback; administrators cannot recover answer identity.
- **States/transitions:** Valid submission → durable accepted feedback plus single completion credit using approved protocol; interrupted requests → safe retry/recovery; no invented ordering shortcut that loses one side.
- **Data touched:** Unlinked feedback, survey/version, separately participant-linked completion ledger and non-correlating recovery artifacts permitted by approved design.
- **Acceptance criteria:** Crash/retry cannot lose accepted feedback or multiply completion; participant sees truthful processing/completed outcome; no retained token/log/metadata path reconnects stores, including after export/restore.
- **English/Arabic:** Bilingual submission/retry/completion messages; preserve entered answers in safe UI retry behavior.
- **Accessibility:** Announce durable completion/error with keyboard recovery; preserve valid inputs; no motion/camera-only mechanism.
- **Security/RLS:** Separate grants and query surfaces; own-completion only; no participant answer browsing; direct API/table access cannot bypass identity-field exclusion.
- **Audit/email:** Audit only permitted completion/service events without feedback payload or correlating identifiers; no email echo of answers.
- **Automated tests:** Fault injection at protocol boundaries, duplicates/concurrent retry, wrong-user ledger access, log/schema/export correlation checks and restore regression.
- **Manual UAT:** Submit, disconnect and retry synthetic feedback; privacy reviewer attempts correlation while certificate readiness sees one completion.
- **Release gate:** REL-05/06, AT-14; approved method plus executed unlinking/failure evidence.
- **Owner type:** Backend/database engineer with independent privacy/security review.
- **TBD blocked:** Full implementation depends on CFG-08/09 method approval; synthetic contract tests and fixtures may proceed.
