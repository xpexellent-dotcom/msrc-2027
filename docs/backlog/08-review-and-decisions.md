# Review and decisions

M6 pre-event review and M9 event judging have separate records and release gates. These issues are planned. Local test rubrics must be explicitly synthetic; source defaults are configurable defaults, not an approved live rubric. Prepared decisions remain private until an authorized publication event.

<a id="bl-rev-01"></a>

## BL-REV-01 — Version rubrics and aggregate completed human reviews

- **Source IDs:** REV-02, REV-04, REV-05, CFG-03, AT-09.
- **Status:** Planned.
- **Purpose:** Scientific staff can reproduce recommendations from the actual rubric and completed reviews used at the time.
- **Scope:** Versioned criteria/scales, applicability and ongoing-study treatment; equal weighting baseline unless formally changed; approved aggregation/quorum configuration; explicit missing/declined review handling.
- **Exclusions:** Invented thresholds/tie rules, interpreting missing scores as zero, AI scores in human averages, automatic acceptance or publication.
- **Dependencies:** BL-AUTH-01; BL-SEC-01; [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03).
- **Roles:** Scientific Administrator configures within grants; Scientific Lead approves scientific settings; reviewer receives relevant locked version.
- **States/transitions:** Editable rubric configuration becomes a locked version for assignments; subsequent change creates a new version rather than rewriting assessed records.
- **Data touched:** Rubric versions, criterion/scoring definitions, components, denominators, aggregation provenance and readiness result.
- **Acceptance criteria:** An incomplete quorum displays incomplete rather than a fabricated score; calculation preserves applicable denominators; existing assignments retain rubric version after configuration changes.
- **English/Arabic:** Scientific rubric/reviewer material English; administration chrome and configuration explanations bilingual.
- **Accessibility:** Labelled numeric inputs with explicit scale/error text; semantic score tables and non-color readiness states.
- **Security/RLS:** Only granted scientific administrators change configuration; reviewers cannot alter rubrics or access peer aggregates; validate ranges server-side.
- **Audit/email:** Audit rubric/threshold/version changes and override reasons; no applicant email from calculations or draft configuration.
- **Automated tests:** Missing/declined scores, not-applicable criteria under approved rules, equal weighting default, version immutability and unauthorized configuration writes.
- **Manual UAT:** Reproduce a synthetic total by hand; change rubric and inspect existing assignments; verify no applicant sees provisional calculations.
- **Release gate:** REL-03 approved rubric, quorum, ongoing-study and disagreement settings.
- **Owner type:** Scientific lead with full-stack engineer and QA.
- **TBD blocked:** Live scoring yes, CFG-03; versioning and synthetic calculation tests no.

<a id="bl-rev-02"></a>

## BL-REV-02 — Generate an identity-safe review packet

- **Source IDs:** REV-01, ABS-15, ROL-03, ROL-04, AI-02, AT-02.
- **Status:** Planned.
- **Purpose:** An assigned pre-event reviewer receives only the scientific content required for their assessment.
- **Scope:** Explicit sanitized projection bound to a submission snapshot; check body identity disclosures; safe filenames/document properties, API fields, notification variables and export/download payloads; administrator readiness review.
- **Exclusions:** Identity-bearing administrative reports, author/affiliation/contact fields, identifiable team labels, blanket claim that profile-field removal guarantees anonymity.
- **Dependencies:** BL-ABS-06, BL-ABS-05; approved private-file foundation; BL-SEC-01.
- **Roles:** Scientific Administrator prepares readiness; assigned Abstract/Hackathon/3MT Reviewer reads relevant packet; participant cannot inspect reviewer records.
- **States/transitions:** Submitted snapshot is withheld from assignment until the sanitized packet is ready; changed source requires a new packet bound to the new version.
- **Data touched:** Sanitized scientific projection, version link, readiness outcomes and private derived files where used.
- **Acceptance criteria:** Test identities cannot be recovered from UI, JSON, filename, file metadata or email; reviewer cannot request raw source instead; packet identifies scientific version without exposing personal identifiers.
- **English/Arabic:** Review packets and reviewer screens English-only; administrative readiness controls bilingual; preserve scientific LTR.
- **Accessibility:** Semantic document structure, readable tables, keyboard-accessible review material; provide accessible text where a supported file needs it.
- **Security/RLS:** Assignment/track/version/edition scoped view or API; deny underlying identity tables and evidence objects; revoked assignment invalidates retrieval.
- **Audit/email:** Audit privileged source/derived-file access; notifications contain sanitized references only; no applicant notifications during packet preparation.
- **Automated tests:** Seed identity canaries in all source fields and metadata, attempted raw-ID substitution, expired link and revoked-assignment access.
- **Manual UAT:** Review synthetic identity-bearing text/files before and after sanitization as each track's reviewer; inspect network/download metadata.
- **Release gate:** REL-03/REL-04 pre-event anonymity evidence, including direct access tests.
- **Owner type:** Security/full-stack engineer with scientific administrator.
- **TBD blocked:** Technical projection no; actual sanitization approval and live processing depend on CFG-03/CFG-05/CFG-06 and CFG-09 as applicable.

<a id="bl-rev-03"></a>

## BL-REV-03 — Assign reviewers and withdraw conflicted assignments

- **Source IDs:** REV-02, REV-03, ROL-03, ROL-12, AT-09.
- **Status:** Planned.
- **Purpose:** Scientific staff can obtain eligible independent reviews without self-review or conflict leakage.
- **Scope:** Manual one-to-five abstract reviewer assignments bound to snapshot/rubric; conflict declaration and decline; withdraw/reassign conflicted assignments; staff-only completion tracking.
- **Exclusions:** Automatic matching, copying abstract assignment limits into other tracks, peer review/status disclosure, participant-role privilege escalation.
- **Dependencies:** BL-REV-01, BL-REV-02; BL-AUTH-01; individual privileged MFA/grants.
- **Roles:** Scientific Administrator assigns; Abstract Reviewer accepts permitted work or flags conflict/declines; dual participant/reviewer accounts remain restricted.
- **States/transitions:** Assignment is available for review until declined, conflicted/withdrawn or completed; replacement is a distinct assignment with history preserved.
- **Data touched:** Assignment, submission/rubric versions, reviewer identity, conflict/decline reason and administrative completion status.
- **Acceptance criteria:** Self/conflicted reviewers cannot score; withdrawal revokes direct packet/score access; replacement does not reuse stale scores; only staff see cross-reviewer completion.
- **English/Arabic:** Staff assignment interface bilingual; reviewer conflict/assignment screen English-only.
- **Accessibility:** Keyboard assignment selection and conflict forms; announced reassignment/status; no color-only progress indicators.
- **Security/RLS:** Server verifies eligibility, scope and role/MFA; prevent duplicate active assignment and assignment-ID substitution; separate participant and reviewer projections.
- **Audit/email:** Audit assign/decline/conflict/withdraw/reassign events; English deduplicated assignment notices without author identities or peer status.
- **Automated tests:** Self-review, conflict, cross-edition role, duplicate assign race, revoked assignment while form is open and forbidden peer-status reads.
- **Manual UAT:** Assign then withdraw during a review; sign in as an applicant who also reviews and confirm separation.
- **Release gate:** REL-03 approved assignment/quorum settings plus REL-06 permission tests.
- **Owner type:** Full-stack/security engineer with scientific lead.
- **TBD blocked:** Synthetic assignment flow no; live reviewers/quorum/criteria depend on CFG-03 and actual role grants.

<a id="bl-rev-04"></a>

## BL-REV-04 — Save and submit independent reviewer scorecards

- **Source IDs:** REV-03, REV-04, ROL-03, TIM-01, TIM-02, ERR-01, AT-09.
- **Status:** Planned.
- **Purpose:** A reviewer can complete assigned scoring with reliable drafts and a clearly enforced review lock.
- **Scope:** Per-criterion scores/comments/recommendation, conflict recheck, optimistic draft saves, validated final submission, permitted amendments before server lock, completion status for staff.
- **Exclusions:** Peer scores/status, author identity, committee decision publication, edits after lock without an authorized scoped reopening.
- **Dependencies:** BL-REV-01, BL-REV-03; configured review window; draft/idempotency primitives.
- **Roles:** Assigned Abstract Reviewer; Scientific Administrator sees permitted completion/assessment details.
- **States/transitions:** Assignment review draft becomes submitted; amendments before lock create recorded updates; locked or withdrawn assignment rejects stale saves.
- **Data touched:** Human scorecard components, comments/recommendation, versions, completion timestamp and applicable denominator.
- **Acceptance criteria:** Required/range validation uses assigned rubric version; repeated submit creates one completed review; saving failures remain visible; missing reviews never become zeros.
- **English/Arabic:** Reviewer interface and all assessment content English-only; staff completion views bilingual.
- **Accessibility:** Labelled criteria/ranges, accessible error summary, keyboard score entry, visible autosave and lock warning, usable zoom.
- **Security/RLS:** Assignment/version/MFA checks on each save/submit; prevent submitting another reviewer's scorecard or injecting committee/publication fields.
- **Audit/email:** Audit completed/amended/locked scorecards with safe references; no applicant email; optional configured reminders use English durable jobs.
- **Automated tests:** Scale boundary validation, duplicate submit, concurrent stale edits, cutoff race, withdrawn conflict, forbidden peer access and model-score exclusion from human averages.
- **Manual UAT:** Reviewer completes, reloads, amends before lock and attempts after lock; verify preserved draft on recoverable failure.
- **Release gate:** REL-03 approved rubric/window/quorum and REL-06 review recovery evidence.
- **Owner type:** Full-stack engineer and scientific QA reviewer.
- **TBD blocked:** Live review yes, CFG-03; synthetic flow no.

<a id="bl-rev-05"></a>

## BL-REV-05 — Prepare, preview and explicitly publish scientific decisions

- **Source IDs:** REV-05, REV-06, REV-07, EML-03, EML-04, EML-05, AT-10.
- **Status:** Planned.
- **Purpose:** The authorized scientific team can release correct outcomes once, after reviewing the affected applicants and messages.
- **Scope:** Internal decision preparation; authorized reasoned overrides; separate oral/poster allocation; batch reference/outcome/email preview; atomic publication record plus applicant projection and durable outbox.
- **Exclusions:** Threshold-only automatic publication, provisional score emails, reviewer identities/confidential notes in applicant views, sending live emails during development.
- **Dependencies:** BL-REV-01, BL-REV-04; BL-AUTH-01; durable email foundation and approved send configuration.
- **Roles:** Scientific Administrator/authorized scientific publisher; Scientific Lead resolves disagreement; Participant sees only own published outcome.
- **States/transitions:** Internally prepared outcome remains hidden; explicit authorized publish makes its transition applicant-visible; publication retry is idempotent. Scientific acceptance and presentation format remain separate.
- **Data touched:** Decision snapshot, reason/approval, presentation allocation, publication batch, applicant-visible outcome and outbox jobs.
- **Acceptance criteria:** Preview matches immutable published payload; invalid/missing approval fails entire intended transaction; internal edits send nothing; duplicate publication cannot duplicate outcomes or receipt events; delivery is not falsely claimed.
- **English/Arabic:** Staff and participant UI bilingual; scientific reasons/content English where applicable; all transactional emails English with locale-aware links.
- **Accessibility:** Keyboard batch preview/confirmation, explicit per-reference outcome text, accessible error summary and persistent dashboard fallback.
- **Security/RLS:** Separate prepare/publish authority server-side; edition scope/MFA; participant cannot retrieve prepared outcomes, peer records or confidential reasoning.
- **Audit/email:** Audit actor, batch and overrides; only published events enqueue decision email; template escape/recipient isolation and delivery-failure reporting required.
- **Automated tests:** Prepared-data leak attempts, revoked publisher, changed-preview/version conflict, duplicate/out-of-order retry and 300–400 synthetic decision job batch.
- **Manual UAT:** Preview mixed outcomes, correct one, publish once, inspect participant isolation and bounced-email dashboard fallback.
- **Release gate:** REL-03 authorized release owner and REL-06 publication/email evidence.
- **Owner type:** Full-stack engineer with scientific lead and QA.
- **TBD blocked:** Live decision criteria/authority and sender yes, CFG-03/CFG-10/CFG-11; mock publication no.

<a id="bl-rev-06"></a>

## BL-REV-06 — Publish bounded revision requests and enforce their deadlines

- **Source IDs:** REV-07, REV-08, TIM-01, TIM-02, AT-10.
- **Status:** Planned.
- **Purpose:** An applicant knows exactly what may change and when a revised submission must be completed.
- **Scope:** Permitted fields/files and sanitized applicant instructions; default 14-calendar-day deadline from request publication; exact Asia/Riyadh display; scoped audited extensions/reopening; expiration processing.
- **Exclusions:** Copying confidential review notes wholesale, treating email replies as resubmission, automatic scientific rejection at expiry, client-clock extensions.
- **Dependencies:** BL-REV-05; BL-ABS-06; deadline and durable-job foundation.
- **Roles:** Scientific Administrator requests/extends within authority; Participant revises own permitted material.
- **States/transitions:** Published request produces revision_requested; uncompleted expiry produces revision_expired/voided rather than rejected; authorized extension records a new cutoff.
- **Data touched:** Revision request, editable scope, instructions, publication instant, deadline, extension history and expiry event.
- **Acceptance criteria:** Countdown/window begins on publication, not internal preparation; stale open form cannot finalize past cutoff; extension records actor/reason/scope/notification choice; original snapshot remains intact.
- **English/Arabic:** Bilingual revision status/instructions chrome and timezone labels; English/LTR scientific edits; English revision emails.
- **Accessibility:** Clear deadline text without countdown dependence, keyboard access, linked allowed-field errors and focus on expiry message.
- **Security/RLS:** Owner/request-scope enforcement per field/file; only authorized staff extend; reject hidden-field edits and unsanctioned reopen.
- **Audit/email:** Publish one English revision notification; audit extensions/expiry and notification decision; email reply never mutates submission state.
- **Automated tests:** Publication-relative 14-day default, exact cutoff/UTC conversion, scoped edits, expiry/extension race, stale links and deduplicated reminders.
- **Manual UAT:** Receive request, edit allowed fields, attempt a prohibited change, simulate expiry and authorized extension in both locales.
- **Release gate:** REL-03 configured revision procedure and REL-06 boundary evidence.
- **Owner type:** Full-stack engineer with scientific lead.
- **TBD blocked:** Technical default window no; actual production request authority and related scientific settings follow CFG-03.

<a id="bl-rev-07"></a>

## BL-REV-07 — Finalize revisions without reusing stale assessments

- **Source IDs:** REV-09, ABS-12, REV-02, ERR-02, AT-10.
- **Status:** Planned.
- **Purpose:** Staff and reviewers can distinguish original and revised work and reassess only explicitly selected reviews.
- **Scope:** Idempotent revised snapshot finalization within scope/cutoff; stable application identity; explicit administrator reassessment decision; previous review/AI results retain original version bindings.
- **Exclusions:** Automatic copying scores onto revised work, deleting older evidence, resetting PI submission count, implicit acceptance from receiving revision.
- **Dependencies:** BL-REV-06, BL-REV-02, BL-REV-03; BL-ABS-06.
- **Roles:** Participant finalizes revision; Scientific Administrator chooses reassessment; assigned reviewer evaluates newly assigned version.
- **States/transitions:** Valid revision_requested work becomes a new submitted version for administrative/scientific processing; prior results remain historical until an explicit current-version assessment is completed.
- **Data touched:** New immutable snapshot, request link, reassessment instructions, assignments and assessment version links.
- **Acceptance criteria:** Retry creates one revised version; expired revision cannot finalize; staff explicitly select repeated reviews; aggregation rejects prior-version scores for new work; original reference/history survives.
- **English/Arabic:** Applicant/staff workflow bilingual; scientific content and reviewer reassessment English/LTR.
- **Accessibility:** Accessible revision preview and changed-field explanation; keyboard finalization; visible reassessment/version status.
- **Security/RLS:** Owner plus valid revision request; immutable old snapshots; reviewer access limited to assigned version, never underlying author/admin evidence.
- **Audit/email:** Audit revision finalize/reassessment decisions; one English receipt for finalization; later decisions use BL-REV-05 publication, not automatic email on score reuse.
- **Automated tests:** Duplicate finalize, race at deadline, old-score aggregate denial, replaced-file snapshot retention and assignment version mismatch.
- **Manual UAT:** Revise a scored application and confirm old score remains historical; assign one reviewer to the new version and inspect packet.
- **Release gate:** REL-03 version isolation and REL-06 failure/retry evidence.
- **Owner type:** Full-stack/database engineer with scientific operations.
- **TBD blocked:** Synthetic version workflow no; live reassessment policy/criteria require CFG-03.

<a id="bl-rev-08"></a>

## BL-REV-08 — Score accepted work through separate event judging records

- **Source IDs:** REV-10, ROL-06, ROL-12, CFG-04, REL-05.
- **Status:** Planned.
- **Purpose:** The judging committee can evaluate accepted presentations without changing pre-event acceptance scores.
- **Scope:** Accepted-work category assignment; faculty-judge assignments/conflict declaration; event rubric/scorecards; amendment until lock; explicit tie/readiness handling for award preparation.
- **Exclusions:** Reusing abstract-review score records, public live leaderboard, invented award categories/rubrics/ties, automatically finalized awards.
- **Dependencies:** BL-REV-05; BL-ABS-08; BL-AUTH-01; [DR-CFG-04](DECISION_REQUIRED.md#dr-cfg-04).
- **Roles:** Judging Committee manages assigned categories/readiness; assigned Faculty Judge scores; authorized award administrator prepares outcomes.
- **States/transitions:** Accepted presentation becomes event-assigned; draft event score becomes submitted and then locked; unresolved conflicts/ties prevent readiness under approved configuration.
- **Data touched:** Event categories, assignments, material grants, rubric versions, distinct scorecards, locks and conflict records.
- **Acceptance criteria:** Abstract acceptance remains unchanged by event scores; conflicted/unassigned judge cannot score; lock blocks amendments; only requested necessary presentation material is exposed.
- **English/Arabic:** Judging committee non-review management bilingual; Faculty Judge assessment interface and scientific material English-only.
- **Accessibility:** Mobile/keyboard score entry, large labelled controls, explicit save/lock status, contrast and screen-reader score tables.
- **Security/RLS:** Category/assignment/MFA scope, no confidential administrative evidence, no unrestricted participant exports; version validation on save/lock.
- **Audit/email:** Audit assignments, score amendments, locks and exceptional actions; English assignment/reminder emails; no public results until award authorization.
- **Automated tests:** Cross-category access denial, COI, lock race, independent score tables, unauthorized file retrieval and incomplete readiness.
- **Manual UAT:** Faculty judges complete synthetic event scoring on phones; committee resolves a configured tie and checks score separation.
- **Release gate:** REL-05 trained judges, configured categories/rubric/ties/locks and event rehearsal.
- **Owner type:** Full-stack engineer with judging committee and event QA.
- **TBD blocked:** Live event scoring yes, CFG-04; synthetic independent records no.

<a id="bl-rev-09"></a>

## BL-REV-09 — Require supervisor validation only for selected research winners

- **Source IDs:** ABS-08, REV-10, AT-11, CFG-04.
- **Status:** Planned.
- **Purpose:** A selected research winner supplies required supervisor evidence without burdening other applicants or changing scientific acceptance.
- **Scope:** Authorized winner selection, winner_pending_supervisor state, configured details/evidence/deadline request, restricted validation, explicit award finalization and release.
- **Exclusions:** Supervisor requirement at submission/review/acceptance/allocation/nomination; cancelling research acceptance for missing details; copying this requirement to hackathon/3MT.
- **Dependencies:** BL-REV-08; BL-REV-05 publication pattern; approved private-file pipeline; [DR-CFG-04](DECISION_REQUIRED.md#dr-cfg-04).
- **Roles:** Authorized award administrator selects/validates; selected research winner provides requested evidence; committee authorizes award release.
- **States/transitions:** Nomination alone creates no supervisor obligation; selected winner enters winner_pending_supervisor; validation permits explicit award finalization; overdue/missing evidence stays unresolved under approved procedure.
- **Data touched:** Separate award record, selection approval, supervisor details/evidence, validation outcome and award-release event.
- **Acceptance criteria:** Every earlier research stage works without supervisor data; final award cannot bypass required validation; missing information leaves ordinary acceptance untouched; no guessed post-deadline award forfeiture rule.
- **English/Arabic:** Participant/administrator request workflow bilingual; research material English/LTR; English transactional notifications.
- **Accessibility:** Accessible conditional request with explanation, deadline/timezone, keyboard upload and clear validation errors.
- **Security/RLS:** Collect only configured necessary details; winner/award scope; private evidence access by explicitly approved verifier; participant cannot self-validate or finalize.
- **Audit/email:** Audit selection, evidence validation and award release; English request/reminder/result email through idempotent authorized events.
- **Automated tests:** No requirement at five earlier stages, selected-winner gate, unauthorized validator, duplicate release and acceptance unchanged when evidence absent.
- **Manual UAT:** Nominate one applicant and select another; verify only the selected winner receives the request and award cannot finalize early.
- **Release gate:** REL-05 award categories, evidence/verifier/deadline and result-release approval.
- **Owner type:** Scientific/award lead with full-stack/privacy engineer.
- **TBD blocked:** Live award handling yes, CFG-04; conditional state and synthetic tests no.
