# Decision Required

These 13 decision issues map one-to-one to the full CFG-01–CFG-13 source register. They are decision packets, not one large implementation PR each. Resolve subquestions incrementally and link each approval to the affected small implementation issue. A packet stays open while required subquestions remain unanswered. No named approver, due date, value or approval is invented here.

Confirmed choices remain confirmed: O1 organization-managed custody with institutional authorization; managed Vercel + managed Supabase; P1 authorized KAU collection; C3 solo and team hackathon participation; A1 daily evidence with both-day conference and independent workshop certificate paths; S2 unlinked feedback plus linked completion. Defaults remain configurable defaults in [DECISIONS](../DECISIONS.md), not fresh unanswered business questions. The current explicit no-national-ID/email-only constraints remain in force.

Every decision needs source, date, accountable approver, exact wording, affected configuration/content/tests, preserved superseded text and release implications. Named owners and due dates are **unassigned**. Functional owner types below are responsibility categories, not appointments. Store confidential approval evidence in authorized restricted custody; put safe references in Git. Authoring this backlog resolves none of these decisions.

ORG-016 removes all authentication phone collection/verification and SMS. Participants use verified email/password without MFA, regular staff retain ORG-015 password plus private exact-session email checking, and Super Admins use authenticator TOTP. SMS provider/sender/budget approvals are retired. Live English email provider/sender, privacy/location/retention, named recovery people and verified lost-email/authenticator procedure remain gates. Recovery preserves distinct Super Admin approver/operator and in-person review; recent-auth age and warning lead stay TBD. Synthetic preview/no-delivery CI can proceed; staff activation/reset stays closed. Source question sets below remain verbatim.

<a id="dr-cfg-01"></a>

## DR-CFG-01 — Approve event and admission operating inputs
- **Source IDs:** CFG-01, SCP-01, REG-05, REG-06, TIM-01, CMS-01.
- **Status:** Partially resolved — ORG-001 records the project requester's 1 October 2026 confirmation of Day 1 on 27 January 2027 and Day 2 on 28 January 2027. Remaining operating questions stay open.
- **Purpose:** Obtain evidenced decisions for the remaining venue, admission categories/capacity, approvers, turnaround and reservation policy so the affected stage can be implemented and opened honestly. Confirmed calendar dates no longer block public date copy/countdown.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Venue options and attendance estimates are not approved facts. Date confirmation supplies no doors/session start times or registration/submission/workshop opening/deadline settings, and does not activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Conference leadership; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to dates/venue and registration issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Conference leadership reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Registration opening remains closed. Calendar-date publication/countdown is authorized by ORG-001; venue publication and all remaining operational release requirements are still gated.
- **Owner type:** Conference leadership; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for packet closure, venue publication and affected live operational stages; no for confirmed calendar-date copy/countdown. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-01. Conference leadership: exact event dates/venue, general capacity, admission categories, manual approval owners, decision turnaround, payment/seat-hold deadlines, and handling of capacity-pending requests. Gate: registration opening.

<a id="dr-cfg-02"></a>

## DR-CFG-02 — Confirm the authorized KAU collection and financial contract
- **Source IDs:** CFG-02, PAY-01, PAY-04, PAY-05, PAY-07, PAY-08.
- **Status:** Partial — ORG-042 selects the Faculty of Medicine payment platform (`lms.waqf.org.sa`) and v1.0 supplies payment/refund wording; actual interface/confirmation/reconciliation, finance authority, amounts and remaining contract evidence stay open.
- **Purpose:** Obtain an evidenced decision for official payee/system owner, actual confirmation evidence and complete published commercial terms so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** P1 is confirmed; do not choose an independent merchant, assume webhooks, choose currency/prices, or count an MSRC refund request as returned funds. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Finance and conference leadership; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to registration, payment and workshops issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Finance and conference leadership reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Relevant paid or discounted registration/workshop opening.
- **Owner type:** Finance and conference leadership; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-02. Finance/leadership. CONFIRMED: P1, use the authorized KAU payment arrangement. REMAINING: responsible KAU unit/contact, exact system and official payee, integration documentation/access or authorized report-based reconciliation, order references, currency/prices/tax treatment, methods actually enabled, student-discount evidence/limits, refunds/cancellations and their authority, settlement reporting, and dependent-booking rules. Test the actual confirmation process; do not assume API/webhook support. Gate: relevant paid or discounted registration opening.

<a id="dr-cfg-03"></a>

## DR-CFG-03 — Approve scientific configuration by submission/review stage
- **Source IDs:** CFG-03, ABS-02, ABS-11, ABS-14, REV-02, REV-04.
- **Status:** Decision Required — open; no new organizer approval recorded.
- **Purpose:** Obtain an evidenced decision for submission schema choices, evidence validation settings, reviewer quorum/rubric and final materials so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Do not reopen ongoing-study eligibility, the 300-word body cap, two-finalized-applications-per-PI rule, or add a supervisor at submission. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Scientific lead; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to abstracts, human review and revisions issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Scientific lead reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Each affected submission, review or final-material stage.
- **Owner type:** Scientific lead; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-03. Scientific lead: specialty codes, study-type choices, corresponding-author eligibility, keyword requirements, rubric criteria/scales, ongoing-study treatment, required review count, acceptance threshold, tie/disagreement rules, similarity provider/settings, and final-material requirements/deadlines. Gate: the relevant submission/review stage.

<a id="dr-cfg-04"></a>

## DR-CFG-04 — Approve event judging and research-winner validation
- **Source IDs:** CFG-04, ABS-08, REV-10.
- **Status:** Decision Required — open; no new organizer approval recorded.
- **Purpose:** Obtain an evidenced decision for award categories, judging/ties, selected-winner supervisor evidence and validation responsibility so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Do not require supervisor information from nominees or ordinary accepted presenters, or invent prizes, weights and judge counts. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Scientific and award lead; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to event judging and research awards issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Scientific and award lead reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Event judging and award release.
- **Owner type:** Scientific and award lead; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-04. Scientific/award lead: award categories, event-judging rubric/ties, supervisor details/evidence required ONLY from selected research winners, verification responsibility, and response deadline. Gate: event judging and award release.

<a id="dr-cfg-05"></a>

## DR-CFG-05 — Approve remaining hackathon rules by stage
- **Source IDs:** CFG-05, HAC-01, HAC-03, HAC-04, HAC-06, HAC-07, HAC-08, HAC-09, HAC-11.
- **Status:** Decision Required — open; no new organizer approval recorded.
- **Purpose:** Obtain an evidenced decision for eligibility/membership, quota treatment, schema, dates, review, finals and award/certificate policy so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Retain C3, maximum five/team, two named tracks and confirmed journey/pitch rules. Do not adopt illustrative rubric weights, extra solo places or tentative recording bans. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Hackathon lead; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to hackathon entry, selection, preparation, finals and awards issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Hackathon lead reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Each affected hackathon stage.
- **Owner type:** Hackathon lead; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-05. Hackathon lead. CARRIED FORWARD: C3 solo/team competition, no matching, maximum five per team, cross-university teams, two named tracks locked after acceptance, title plus 300-word pitch, new ideas only, two independent reviewer assignments, compulsory orientation/day-one mentoring/day-two finals, idea-plus-pitch minimum, optional prototype, and five-minute pitch plus three-minute Q&A. REMAINING: final eligibility wording, cross-mode duplicate rules, member editing/confirmation/lock policy, solo inclusion in the eight-per-track finalist limit, detailed forms/files/references, dates, review quorum/rubrics, recording/spoken-language policy, fees/inclusions, prizes, IP terms, and hackathon certificate evidence. Resolve CFG-13 source discrepancies. Gate: each relevant hackathon stage. [H1]

<a id="dr-cfg-06"></a>

## DR-CFG-06 — Approve the independent postgraduate 3MT rulebook
- **Source IDs:** CFG-06, TMT-01, TMT-02, TRK-01.
- **Status:** Decision Required — open; no new organizer approval recorded.
- **Purpose:** Obtain an evidenced decision for eligibility/evidence, participant limits, forms, stages, files, judging and certificate/award rules so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Do not import external competition affiliation, slide rules, timing rules or abstract/hackathon criteria from the name. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** 3MT lead; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to 3mt application, review and event judging issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** 3MT lead reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Each relevant 3MT stage before opening.
- **Owner type:** 3MT lead; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-06. 3MT lead: postgraduate eligibility, presenter limits, form/file requirements, stage deadlines, presentation rules, judge/rubric configuration, and certificate/award evidence. Gate: 3MT opening.

<a id="dr-cfg-07"></a>

## DR-CFG-07 — Approve workshop catalog and seat lifecycle rules
- **Source IDs:** CFG-07, WKS-01, WKS-03, WKS-04, WKS-05, WKS-06.
- **Status:** Decision Required — open; no new organizer approval recorded.
- **Purpose:** Obtain an evidenced decision for per-workshop capacity/rooms/prices, reservations, approvers, deadlines and offer/cancellation policy so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Manual approval, confirmed conference registration and race-safe allocation are required. The 30–100 figure is an ambiguous estimate, not an implemented cap. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Workshop lead; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to workshops, holds and waitlists issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Workshop lead reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Workshop booking opening.
- **Owner type:** Workshop lead; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-07. Workshop lead: catalog, rooms, per-workshop capacity, price, reserved seats, approval responsibility, hold/offer windows, deadlines, prerequisites, cancellation handling, and whether the 30–100 estimate is per workshop or total. Gate: workshop opening.

<a id="dr-cfg-08"></a>

## DR-CFG-08 — Approve operations, survey unlinking and certificate release inputs
- **Source IDs:** CFG-08, CHK-05, CRT-01, CRT-02, CRT-03, CRT-04, CRT-06.
- **Status:** Decision Required — open; no new organizer approval recorded.
- **Purpose:** Obtain an evidenced decision for evidence/sign-off procedures, outage handling, surveys, signatures/templates, role certificates and correction/release authority so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Do not reopen A1/S2, add a one-day certificate, require full-conference eligibility for a workshop certificate, or infer accredited hours. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Operations and certificate lead with privacy reviewer; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to attendance, surveys, certificates and event operations issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Operations and certificate lead with privacy reviewer reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Event procedures and each survey/certificate release.
- **Owner type:** Operations and certificate lead with privacy reviewer; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-08. Operations/certificate lead. CONFIRMED: A1 daily check-in; full conference certificate requires BOTH days plus general survey; NO one-day certificate; workshop certificate requires its booking/check-in/completion sign-off/survey, independently of earning the full conference certificate. S2 feedback is unlinked while completion is tracked. REMAINING: sign-off owners/procedure, survey questions/deadlines and privacy-tested unlinking method, templates/signatures, role/competition certificate rules, release authority, correction handling, and outage contingency. Gate: event operations and certificate release.

<a id="dr-cfg-09"></a>

## DR-CFG-09 — Approve privacy, collection, retention and transfer policy
- **Source IDs:** CFG-09, PRV-01, PRV-02, PRV-03, PRV-04, PRV-05, PRV-06, PRV-07, PRV-08.
- **Status:** Partial — ORG-037–042 approve v1.0 English wording, Faculty controller, registration identifiers, age/retention/language, DeepSeek China and Faculty payment platform; actual processing safeguards and release evidence remain open.
- **Purpose:** Obtain an evidenced decision for controller/purposes, actual processing, legal notices, field minimization, rights requests and retention/transfer evidence so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** O1 alone is not institutional release evidence. Patient-identifying records remain excluded. ORG-039 supersedes the national-ID exclusion for conference registration only, with strict controls and one-year deletion; no sign-up/hackathon identifier field is authorized by this policy PR. Consent alone does not approve transfers. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Faculty of Medicine, KAU is controller; Research Principles Club organizes/handles data on its behalf (ORG-038). Emad Khoja's wording role, Abdulrahman Ismail's retention decision and Akram Awan's request role remain historical/internal records; ORG-037 supplies approved v1.0 English wording. Operational institutional evidence remains pending; engineers record decisions without certifying compliance.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to all data collection, media, feedback, retention and verification issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Organizational privacy owner and institutional authority reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Before production data collection or new processing.
- **Owner type:** Organizational privacy owner and institutional authority; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-09. Organizational/privacy owner: record legal controller/contact and institutional approval evidence under the selected O1 model. Finalize field purposes, media/minor policies, notices/legal bases, processor contracts, actual locations/transfer assessment, retention exceptions, request handling, certificate-verification lifespan, and S2 metadata/log separation. Resolve the hackathon's requested national ID/phone fields against the existing minimal-profile policy before opening its form; national ID remains excluded pending an explicit decision and approved handling. Gate: production data collection.

Reconciliation, 6 October 2026: the verbatim source question is historical.
ORG-037–042 resolve the related wording/controller/registration identity/age/retention/
provider/platform questions. Identifier implementation, native Arabic review, actual
processor/transfer safeguards, request/cleanup/backup/restore and S2 evidence remain
open. This does not authorize live collection or hosted activation.

<a id="dr-cfg-10"></a>

## DR-CFG-10 — Approve service plans, locations and integration contracts
- **Source IDs:** CFG-10, INF-01, INF-02, INF-06, INF-07, EML-02, AI-05, AI-06, SEC-03.
- **Status:** Partial — ORG-040 selects DeepSeek processing in the People's Republic of China and ORG-042 identifies the Faculty payment platform; actual provider terms/transfer safeguards, plans/budgets and integration/activation evidence stay open.
- **Purpose:** Obtain an evidenced decision for provider configuration/contracts, data flows, email/scanning/assessment, recovery, quotas and operating budget so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Managed Vercel/Supabase remain selected; no Saudi region, API, AI provider, scan service, file recovery target or budget is assumed. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Technical owner with privacy and scientific approval; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to deployment and external service adapters issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Technical owner with privacy and scientific approval reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Production provisioning or each relevant integration activation.
- **Owner type:** Technical owner with privacy and scientific approval; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-10. Technical owner with privacy/scientific approval. CONFIRMED: managed Vercel + managed Supabase. REMAINING: approved plans/regions and complete data-flow assessment, KAU payment integration details, email sender/DNS, assessment provider/data terms/evaluation, hackathon originality-check procedure, malware scanning, storage/backups, throughput/quotas, monitoring, and monthly/event budget including video delivery. Use synthetic development data while production location/processing approvals are pending. Gate: production provisioning or relevant integration activation.

<a id="dr-cfg-11"></a>

## DR-CFG-11 — Confirm institutional authorization and continuing custodians
- **Source IDs:** CFG-11, INF-03, ROL-10, ROL-12, SEC-07.
- **Status:** Decision Required — partially resolved by ORG-017/018 (formerly auth ORG-010/011, 2 October 2026): selected Supabase project designated Production; first intended website Super Admin designated privately, second/third TBD. No invitation/account/grant activation; custody, recovery and operating approvals remain open.
- **Purpose:** Obtain an evidenced decision for authorization evidence, organization accounts, named primary/backup custodians, three website super admins and operating coverage so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Do not equate website Super Admin with billing/domain custody or treat draft roster names as approved appointments. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Club and conference leadership; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to governance, deployment and handover issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Club and conference leadership reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Production deployment and privileged operating access.
- **Owner type:** Club and conference leadership; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-11. Club/leadership. CONFIRMED: O1 MSRC/RPClub-managed organization accounts with institutional authorization. REMAINING: authorization evidence, named continuing custodian and backup owner, organizational repository/domain/Vercel/Supabase/billing access, DNS/recovery controls, three website Super Admins, release approver, support/incident coverage, renewal responsibility, and annual handover. Infrastructure ownership and website Super Admin roles remain separate. Gate: production deployment.

<a id="dr-cfg-12"></a>

## DR-CFG-12 — Approve brand, bilingual public content and media rights
- **Source IDs:** CFG-12, DSN-01, DSN-02, CMS-04, MED-02, ARC-02.
- **Status:** Decision Required — open; no new organizer approval recorded.
- **Purpose:** Obtain an evidenced decision for final marks/fonts/video/poster, current profiles/sponsors, translations, public copy and archive continuity so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** Working palette/fonts/motion remain defaults; old footage/logos/sponsors and proposed dates are not cleared/current content. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Design/content lead with asset rights owners; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to design system, public site and media/cms issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Design/content lead with asset rights owners reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Public launch and each asset/content publication.
- **Owner type:** Design/content lead with asset rights owners; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-12. Design/content lead: logo/brand system, English/Arabic fonts, homepage video/poster, approved speaker/committee/sponsor assets, translations, public-page content, media permissions, and archive/domain continuity. Gate: public launch.

<a id="dr-cfg-13"></a>

## DR-CFG-13 — Reconcile the hackathon source conflicts explicitly
- **Source IDs:** CFG-13, HAC-02, HAC-05, HAC-07, HAC-10, AUTH-06, PRV-03, EML-01.
- **Status:** Partial — ORG-039 resolves conference-registration identity verification and supersedes the blanket national-ID exclusion for that purpose only. Hackathon-specific collection, WhatsApp, solo quota, eligibility and originality questions remain open.
- **Purpose:** Obtain an evidenced decision for the five enumerated conflicts in cfg-13, recording what is confirmed versus still proposed so the affected stage can be implemented and opened honestly.
- **Scope:** Resolve every remaining input in the authoritative source text below, preserving its confirmed choices; record partial resolutions individually.
- **Exclusions:** No identifier collection in authentication/hackathon forms (ORG-039's approved national ID/Iqama/passport purpose is conference registration only), authentication phone collection/verification or SMS, automatic WhatsApp sharing/integration, inferred solo quota, broad Options eligibility or automatic originality verdict. This issue does not itself implement or activate a workflow.
- **Dependencies:** Named accountable approver; relevant source/contract/policy evidence; [current decision register](../DECISIONS.md). Coordinate related CFG packets without silently deciding them.
- **Roles:** Hackathon lead with privacy, operations and technical owners; product engineer records the result. Named owner/approver: unassigned.
- **States/transitions:** Open question → evidence gathered → exact decision approved and recorded; unanswered subquestions remain open and their live gates closed. These are planning statuses, not product state enums.
- **Data touched:** Decision record, safe approval references, requirements, affected issue links and typed configuration specification; no production records or secrets.
- **Acceptance criteria:** Each required subquestion has an approved exact value/policy or is explicitly still open; record source/date/approver and supersession; map changes to hackathon and cross-cutting privacy/communication rules issues and tests. Close this packet only when its required questions are resolved; never infer approval from silence.
- **English/Arabic:** Identify every affected bilingual label/instruction/public notice; approve translations before publication. Scientific/project content and reviewer assessment remain English/LTR; transactional emails English-only.
- **Accessibility:** Decision must preserve accessible alternatives and error/recovery behavior; review affected wording/controls with accessibility owner before release.
- **Security/RLS:** Review minimum data, access scope, storage/retention and permission consequences; decisions cannot silently weaken server/database authorization or existing exclusions. No grants changed by this document.
- **Audit/email:** Version the decision and approval evidence references; identify downstream audit/English email changes. No real messages are sent to obtain or announce this decision by this task.
- **Automated tests:** After approval, add configuration/transition boundary tests to affected issues; validate no unresolved value enables its gate. This decision PR itself checks source IDs, links and required fields.
- **Manual UAT:** Hackathon lead with privacy, operations and technical owners reviews exact wording, affected-stage examples and exclusions; demonstrate one allowed and one still-blocked example with synthetic data.
- **Release gate:** Affected collection, communication, eligibility, originality checking or selection stage.
- **Owner type:** Hackathon lead with privacy, operations and technical owners; product/technical owner coordinates implementation.
- **TBD blocked:** Yes for closure and affected live stages. Evidence gathering, documentation and independent synthetic implementation remain unblocked.

Authoritative question set (v0.5; retained verbatim):

> CFG-13. Hackathon lead with privacy/operations/technical owners. SOURCE RECONCILIATION REQUIRED: (a) requested national ID and phone/profile fields versus current exclusions/conditional fields; (b) the draft's WhatsApp group versus confirmed email-only platform communications, including whether any external group is optional; (c) whether solo projects consume the stated eight-team-per-track/sixteen-team finalist quota; (d) broader eligibility still labelled Options; (e) originality-check method and human decision process. Do not silently resolve these or activate the affected collection/communication/selection behavior. [H1, Sections 3–6]

Reconciliation, 6 October 2026: ORG-039 supersedes the national-ID exclusion for
conference registration identity verification only. It creates no hackathon-entry
field; the remaining CFG-13 conflicts and unrelated phone-purpose decisions stay open.
