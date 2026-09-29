# Hackathon

M8 application/selection and M9 event operation, with independent stage gates. Confirmed C3, two named tracks, five-person maximum and answered event rules remain fixed baseline choices. Broader eligibility, cross-mode duplicates, solo quota accounting, membership policy, rubrics, fees/prizes/IP and several final-material settings remain unresolved. This backlog does not apply abstract rules to hackathon by analogy.

<a id="bl-hac-01"></a>

## BL-HAC-01 — Model independent solo and preformed-team entries

- **Source IDs:** HAC-01, HAC-02, HAC-10, AUTH-06, AT-12.
- **Status:** Planned; live application closed.
- **Purpose:** A solo entrant or preformed team can represent its project without being forced into a matching pool.
- **Scope:** Entry participation_mode, project, submitting lead and roster; one participant for solo, maximum five for teams; one team/person and one project/team; cross-university support; exactly the two source-named tracks and acceptance lock.
- **Exclusions:** Automatic matching, national IDs, compulsory phone without approved purpose, invented broader eligibility, inferred solo-plus-team/multiple-solo policy.
- **Dependencies:** BL-FND-01; participant verification; BL-SEC-01; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05), [DR-CFG-13](DECISION_REQUIRED.md#dr-cfg-13).
- **Roles:** Participant/entry lead; authorized hackathon administrator; privacy owner governs profile fields.
- **States/transitions:** Configured eligible draft becomes a registered application only with verified roster accounts; track remains editable only before acceptance under approved permissions, then locks.
- **Data touched:** Entry, project, lead, verified participant links, participation mode and track; no national ID.
- **Acceptance criteria:** Solo path works independently; five team members allowed and sixth rejected server-side; cross-university roster accepted; conflicting team membership prevented transactionally; unresolved cross-mode rules keep affected live actions closed.
- **English/Arabic:** Participant/admin chrome bilingual; project material English/LTR; names may retain original script.
- **Accessibility:** Keyboard roster editing, labelled participation/track choices, errors tied to affected member, mobile/RTL layout.
- **Security/RLS:** Lead/member/admin scope explicit; membership changes server-authorized; enumeration-resistant account lookup; no blanket roster access by login.
- **Audit/email:** Audit membership/mode/track changes; no automatic WhatsApp/phone sharing; any permitted notices English email.
- **Automated tests:** Solo/team shapes, sixth-member denial, concurrent duplicate-team membership, accepted-track lock, cross-owner entry read and prohibited profile fields.
- **Manual UAT:** Register synthetic solo and cross-university team; verify no team-match step and no unsupported eligibility promise.
- **Release gate:** REL-04 application stage plus production privacy gate.
- **Owner type:** Full-stack/database engineer with hackathon/privacy leads.
- **TBD blocked:** Live eligibility/cross-mode/member policy yes, CFG-05/CFG-13; confirmed model and synthetic validations no.

<a id="bl-hac-02"></a>

## BL-HAC-02 — Confirm accepted team membership without blocking initial review

- **Source IDs:** HAC-03, HAC-01, EML-03, AT-12.
- **Status:** Planned.
- **Purpose:** Verified listed participants can confirm an accepted entry without invitation retries creating duplicate members or exposing projects.
- **Scope:** Distinguish initial verified application roster, committee acceptance and post-acceptance member confirmation; protected invitation tokens, idempotent resend/acceptance; configured member edits, cutoffs and refusal/no-response handling.
- **Exclusions:** Requiring post-acceptance confirmation before initial review, unapproved solo-to-team conversion, automatic team matching, unrestricted invite-link project access.
- **Dependencies:** BL-HAC-01, BL-HAC-06; durable email jobs; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05).
- **Roles:** Entry lead; intended verified participant; authorized hackathon administrator for approved exceptions.
- **States/transitions:** Registered roster can be reviewed before later confirmation; published competition acceptance enables the configured confirmation request; confirmed/refused/unanswered outcomes follow the approved membership policy.
- **Data touched:** Registered roster snapshot, acceptance event, scoped invitations, member response and edit/lock history.
- **Acceptance criteria:** Only intended verified member can accept; resends do not duplicate roster membership; expired/revoked invite cannot change membership; approved edit window enforced server-side; initial review does not wait for future confirmations.
- **English/Arabic:** Bilingual participant/admin invitation screens; English email; scientific project content English/LTR only when recipient has authorized access.
- **Accessibility:** Keyboard confirmation, understandable link-expiry recovery, clear response state, no inaccessible CAPTCHA-only flow.
- **Security/RLS:** Bind token to entry/member/purpose; prevent unrelated recipient access; recheck current membership/acceptance on use; store token safely.
- **Audit/email:** Audit issuance, replacement, member response and authorized edits; English invitations deduplicated with delivery status distinct from confirmation.
- **Automated tests:** Forwarded/expired/reused invitation, resend race, duplicate membership, stale acceptance, initial-review independence and role revocation.
- **Manual UAT:** Review unconfirmed registered roster, publish acceptance, confirm from intended member and attempt from unrelated account.
- **Release gate:** REL-04 post-acceptance onboarding with approved confirmation/refusal/lock policy.
- **Owner type:** Full-stack/security engineer with hackathon lead.
- **TBD blocked:** Live confirmation behavior yes, CFG-05; safe synthetic invitation flow no.

<a id="bl-hac-03"></a>

## BL-HAC-03 — Save and finalize a hackathon-specific pitch snapshot

- **Source IDs:** HAC-04, HAC-05, LOC-02, TIM-02, ERR-02, AT-12.
- **Status:** Planned.
- **Purpose:** Entrants can submit an English title and bounded pitch with the correct hackathon materials and declarations.
- **Scope:** Draft/preview/idempotent finalization; 300-word English pitch; new-idea declarations; configured references/appendix treatment, applicable ethics evidence and optional supporting/prototype materials; immutable version and explicit server deadline.
- **Exclusions:** Invented eight required subfields, inherited abstract-only upload restrictions, mandatory prototype, initial final-presentation upload, automatic originality verdict.
- **Dependencies:** BL-HAC-01; private-upload and durable-job foundations; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05).
- **Roles:** Entry lead submits; verified roster scope follows approved policy; authorized hackathon administrator validates readiness.
- **States/transitions:** Editable draft becomes a finalized application snapshot once configured validation and deadline pass; failed/late submit retains draft and clear recovery/status.
- **Data touched:** Title, English pitch, references/appendix, track, declarations, permitted private attachments, immutable roster/project snapshot and submission event.
- **Acceptance criteria:** Server rejects pitch above 300 words; optional prototype absence passes; missing approved required evidence fails; no unapproved references/appendix word-count assumption; retries produce one final version.
- **English/Arabic:** Participant labels/instructions/errors bilingual; scientific/project fields English/LTR; English submission receipt.
- **Accessibility:** Live word count, semantic preview, labelled file requirements, announced autosave/error, keyboard finalization and RTL focus order.
- **Security/RLS:** Lead/editing scope checked on server; private files with scanning/allowlists; immutable finalized record and deadline enforcement; no identities in public URLs.
- **Audit/email:** Record finalization and replacements; one durable English receipt with dashboard fallback; no real messages in synthetic environments.
- **Automated tests:** 300/301 pitch, absent prototype, configured references rules, spoofed files, lost-response retry, late finalization and unapproved member editing.
- **Manual UAT:** Solo/team draft resume, submit without prototype, correct invalid evidence and inspect locked snapshot.
- **Release gate:** REL-04 approved application schema/files/eligibility/dates and privacy handling.
- **Owner type:** Full-stack engineer with hackathon/scientific owner.
- **TBD blocked:** Live form yes, CFG-05/CFG-13 and scanning CFG-10; synthetic snapshot workflow no.

<a id="bl-hac-04"></a>

## BL-HAC-04 — Validate eligibility and route originality concerns to humans

- **Source IDs:** HAC-02, HAC-05, HAC-10, CFG-13.
- **Status:** Planned.
- **Purpose:** Selection staff can distinguish confirmed new-idea declarations from unresolved eligibility and checking policy.
- **Scope:** Recorded checks against approved eligibility; declarations excluding previously pitched/entered, prize-winning, funded or commercially launched projects; concern notes and authorized human disposition; optional originality adapter kept disabled.
- **Exclusions:** Claim that AI proves novelty, assumed plagiarism service, public accusation, national-ID collection, inferred participant AI/outside-assistance policy.
- **Dependencies:** BL-HAC-03; BL-AUTH-01; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05), [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), [DR-CFG-13](DECISION_REQUIRED.md#dr-cfg-13).
- **Roles:** Authorized hackathon selection administrator; privacy/scientific owners approve any originality method; entry lead receives authorized requests only.
- **States/transitions:** Finalized application receives administrative validation; unresolved concern is held for human action, not an automated adverse scientific decision.
- **Data touched:** Eligibility/declaration outcomes, restricted human notes, evidence references, procedure version and any approved advisory output separately.
- **Acceptance criteria:** Missing policy keeps the dependent stage closed; declared concerns reach authorized human review; no external manuscript transmission occurs by default; broader eligibility remains unpublished until approved.
- **English/Arabic:** Administrative/participant workflow bilingual; project evidence English/LTR; pre-event reviewer material sanitized English.
- **Accessibility:** Clear textual concern status, keyboard validation controls, accessible correction instructions without confidential-note leakage.
- **Security/RLS:** Restricted validation scope and least-privilege evidence access; no unapproved provider egress or participant-ID expansion.
- **Audit/email:** Audit validation/overrides with reason; English applicant requests only through authorized publication; no automated rejection email from originality flags.
- **Automated tests:** Disabled adapter no-network, unconfigured policy denial, unauthorized note read, declaration checks and flagged output unable to publish.
- **Manual UAT:** Evaluate synthetic disputed originality with human decision; inspect what entrant and reviewer can see.
- **Release gate:** REL-04 eligibility/originality procedure and privacy approval before affected selection work.
- **Owner type:** Hackathon lead with security/full-stack engineer and privacy owner.
- **TBD blocked:** Live eligibility/originality implementation yes, CFG-05/CFG-10/CFG-13; declarations and synthetic human routing no.

<a id="bl-hac-05"></a>

## BL-HAC-05 — Assign two independent blinded hackathon reviews

- **Source IDs:** HAC-06, ROL-04, REV-01, AT-12.
- **Status:** Planned.
- **Purpose:** Each ready entry receives the required independent reviewer assignments without applying an invented final rubric.
- **Scope:** Two independent pre-event assignments; sanitized solo/team packet; conflict/decline/reassignment; configured hackathon selection rubric and completed-review quorum; versioned reviewer scorecards.
- **Exclusions:** Importing abstract weights or illustrative final-rubric percentages, assuming two assignments means an approved completion quorum, identifiable team names, event-judge score reuse.
- **Dependencies:** BL-HAC-04; BL-REV-02 and assignment/scorecard infrastructure; approved hackathon settings.
- **Roles:** Authorized hackathon selection administrator; assigned Hackathon Reviewer with individual MFA.
- **States/transitions:** Ready entry receives two eligible independent assignments; conflict/decline withdraws assignment; completed scores contribute only under approved quorum/aggregation configuration.
- **Data touched:** Sanitized packet, submission/rubric versions, two assignments, conflicts, independent scores/comments and readiness.
- **Acceptance criteria:** Solo and team entries both receive two distinct eligible assignments; no peer-status/identity exposure; missing reviews never become zero; unconfigured rubric/quorum blocks live score completion/selection.
- **English/Arabic:** Reviewer assessment English-only; selection administration bilingual; scientific pitch English/LTR.
- **Accessibility:** Keyboard scorecards, labelled scales, visible save/error/lock state and accessible packet structure.
- **Security/RLS:** Track/edition/assignment scope, self/conflict denial, revoked assignment blocked on direct requests; private evidence excluded from sanitized packet.
- **Audit/email:** Audit assignment/conflict/score amendments; English sanitized assignment notices; no applicant outcome until authorized publication.
- **Automated tests:** Exactly two distinct assignment requirement, self-review, team identity canaries, revoked role, missing-score handling and rubric-version binding.
- **Manual UAT:** Review synthetic solo/team packets as separate reviewers; decline and replace one assignment without peer visibility.
- **Release gate:** REL-04 hackathon review rubric/quorum/anonymity approved and tested.
- **Owner type:** Full-stack/security engineer with hackathon selection lead.
- **TBD blocked:** Live reviewing yes, CFG-05; reusable synthetic assignment/access tests no.

<a id="bl-hac-06"></a>

## BL-HAC-06 — Publish selection only after resolving solo finalist accounting

- **Source IDs:** HAC-06, HAC-07, HAC-02, REV-07, CFG-13.
- **Status:** Planned; live capacity selection blocked.
- **Purpose:** Entrants receive authorized selection results that respect the approved interpretation of track capacity.
- **Scope:** Configured ranking/tie/capacity policy; preserve source eight-teams-per-track/sixteen-team statement without assuming solo treatment; prepared batch preview, explicit publication, accepted-track lock and final-material request hooks.
- **Exclusions:** Unlimited extra solo places, treating sixteen as people, silently adopting one-entry-per-solo/team proposal, invented acceptance score or dates.
- **Dependencies:** BL-HAC-05; BL-REV-05 publication infrastructure; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05), [DR-CFG-13](DECISION_REQUIRED.md#dr-cfg-13).
- **Roles:** Authorized hackathon selection publisher; selection lead approves configuration; applicant sees only own published outcome.
- **States/transitions:** Prepared decision stays private; explicit publish records selected outcome and locks accepted track; downstream confirmation/final request opens only under configured stage policy.
- **Data touched:** Selection configuration version, ranked readiness evidence, decision batch, publication event, track lock and notification jobs.
- **Acceptance criteria:** Missing solo accounting blocks publication and public capacity claim; concurrent batches cannot exceed approved allocation; preview/output agree; retry cannot duplicate notices or membership invitations.
- **English/Arabic:** Participant/admin results bilingual; project content English; English email only, without reviewer identities or scores.
- **Accessibility:** Accessible batch review, clear published/private status, keyboard confirmation and applicant dashboard fallback.
- **Security/RLS:** Publisher grant/MFA/edition scope; no client capacity override; participants cannot retrieve prepared or other-entry outcomes.
- **Audit/email:** Audit capacity interpretation/version, overrides and publish actor; English outcome emails only after publish and deduplicated.
- **Automated tests:** Null solo policy blocks, approved synthetic policy boundary/concurrent batches, stale preview, duplicate publication and accepted-track mutation denial.
- **Manual UAT:** Mix synthetic solo/team finalists; confirm gate blocks before configuration and counts according to a clearly synthetic approved-test policy afterward.
- **Release gate:** REL-04 selection gate, including CFG-13 quota reconciliation and authorized release.
- **Owner type:** Hackathon lead with database/full-stack engineer and QA.
- **TBD blocked:** Live selection yes, CFG-05/CFG-13; gated publication infrastructure no.

<a id="bl-hac-07"></a>

## BL-HAC-07 — Collect final pitch material without requiring a prototype

- **Source IDs:** HAC-08, HAC-09, HAC-11, TIM-02.
- **Status:** Planned.
- **Purpose:** Accepted entrants can prepare the required idea-plus-pitch final deliverable and recover fairly from demo failure.
- **Scope:** Accepted-entry final-material request, approved file list/count/lock, versioned private uploads, optional prototype, requested backup material under approved fairness procedure; display confirmed five-minute pitch and three-minute Q&A.
- **Exclusions:** Invented presenter count/file formats/spoken-language/overrun rules, mandatory prototype, automatic recording or publication, converting tentative recording restriction into a ban.
- **Dependencies:** BL-HAC-06; private-upload foundation; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05).
- **Roles:** Authorized accepted-entry lead/member under approved editing policy; hackathon administrator; assigned final judges receive necessary approved files.
- **States/transitions:** Authorized request opens final upload; valid completion records material version; configured deadline/lock closes edits; demo fallback follows recorded authorized procedure.
- **Data touched:** Request, final pitch files, optional prototype/backup references, versions, lock and fallback approval.
- **Acceptance criteria:** Idea plus pitch is sufficient under confirmed minimum; file/type/window validation server-side; no prototype absence rejection; replacements preserve judged version; backup evidence is not publicly published by upload.
- **English/Arabic:** Participant/admin chrome bilingual; written project materials English; spoken language remains unset until approved.
- **Accessibility:** Keyboard uploads, accessible requirements checklist, clear timezone/lock status and equivalent usable backup format under approved procedure.
- **Security/RLS:** Accepted-entry/request checks; private scanned uploads; assignment-scoped final-judge access; no administrative identity/evidence leakage to pre-event reviewers.
- **Audit/email:** Audit requests/replacements/lock/fallback exception; English request/reminder email; media publication requires its separate approval.
- **Automated tests:** Nonaccepted access denial, deadline race, forbidden files, no-prototype success, version retention and unauthorized publication attempt.
- **Manual UAT:** Submit final pitch with no prototype; simulate failed live demo and use an approved synthetic fallback procedure.
- **Release gate:** REL-04 final-material stage and REL-05 event fairness/recording/media procedure.
- **Owner type:** Full-stack engineer with hackathon/event operations lead.
- **TBD blocked:** Live final collection yes, CFG-05; request/version/access scaffolding no.

<a id="bl-hac-08"></a>

## BL-HAC-08 — Track each member's compulsory hackathon activities

- **Source IDs:** HAC-08, CHK-03, CHK-04, HAC-10, REL-05.
- **Status:** Planned.
- **Purpose:** Operations can verify required preparation/orientation, day-one mentoring and day-two finals without granting a whole team credit from one scan.
- **Scope:** Per-participant compulsory-activity evidence; fair mentoring allocation under approved procedure; minimum staff interface; restricted reasoned correction and exception record; finals attendance readiness for awards.
- **Exclusions:** Implied attendance hours, teammate-proxy credit, automatic conference attendance credit, invented exception rules, WhatsApp integration or phone sharing.
- **Dependencies:** BL-HAC-02; shared attendance/check-in evidence services; program activity records; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05), [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Individually assigned Check-in Staff/activity organizer; authorized hackathon operations lead; participant sees own necessary completion status.
- **States/transitions:** Missing activity evidence becomes recorded per verified participant; correction preserves original event and reason; incomplete required finals attendance blocks award readiness under approved rules.
- **Data touched:** Participant/activity links, server timestamp, recorder identity, evidence/correction, mentoring allocation and award-readiness result.
- **Acceptance criteria:** One member's scan changes only that member; duplicates add no credit; all required participants must satisfy approved finals evidence; conference/workshop records remain distinct.
- **English/Arabic:** Participant/staff/operations interface bilingual; English operational emails; activity scientific materials English.
- **Accessibility:** Phone/keyboard operation, text outcomes, manual authorized alternative to camera, large touch targets and RTL tests.
- **Security/RLS:** Activity/edition/staff scope and minimum identity view; no scientific files or finance data; corrections require explicit authority.
- **Audit/email:** Audit record/correction/exception with original retained; English reminders/outage follow-up only when authorized; no implicit group-channel membership.
- **Automated tests:** Member isolation, duplicate scan, wrong activity/staff, correction history, incomplete-team award readiness and concurrent evidence retry.
- **Manual UAT:** Run synthetic solo and five-person team through activities, miss one member, and rehearse approved outage reconciliation.
- **Release gate:** REL-05 approved evidence/exception/fair-allocation/outage procedures and staff/device rehearsal.
- **Owner type:** Event operations/hackathon lead with full-stack engineer and QA.
- **TBD blocked:** Live evidence/exception procedures yes, CFG-05/CFG-08/CFG-13; per-person technical isolation no.

<a id="bl-hac-09"></a>

## BL-HAC-09 — Collect separately configured hackathon final scorecards

- **Source IDs:** HAC-09, HAC-11, ROL-06, REL-05.
- **Status:** Planned; final scoring closed.
- **Purpose:** A closed judging panel can evaluate finals using an approved rubric without rewriting selection scores.
- **Scope:** Independent event assignments/rubric/scorecards/lock; configured judge count and cross-panel comparison/ties; final-readiness check; shared event-scoring adapter for hackathon.
- **Exclusions:** Draft illustrative weights/prizes/budgets, research-supervisor winner requirement, automatic certificate eligibility, public leaderboard or automatic pitch recording.
- **Dependencies:** BL-HAC-07, BL-HAC-08; BL-REV-08 event-score infrastructure; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05).
- **Roles:** Assigned hackathon final judges; judging committee; authorized hackathon event administrator.
- **States/transitions:** Assigned final score is drafted, submitted and locked under approved rules; incomplete/conflicted scoring remains unresolved under the configured readiness rules, separate from initial selection.
- **Data touched:** Event judge assignments, distinct rubric/scores, conflict/tie records, lock history and readiness references.
- **Acceptance criteria:** Unconfigured rubric/judge/tie rules block live scoring; conflicted/unassigned judge cannot score; lock prevents stale amendments; event scores cannot overwrite initial selection.
- **English/Arabic:** Final assessment UI English-only; participant/non-review administration bilingual; written project content English; spoken pitch policy remains gated.
- **Accessibility:** Keyboard/mobile judging, visible lock/save errors, accessible award preview and status without color dependence.
- **Security/RLS:** Judge assignment and MFA enforced; committee category scope; no participant access to confidential scores or pre-event administrative evidence.
- **Audit/email:** Audit assignments, scores/amendments/locks and tie-resolution actions; English judge notices; score completion sends no applicant award email.
- **Automated tests:** Unassigned/conflicted scoring, lock race, unapproved configuration rejection, missing-score handling and score-record separation.
- **Manual UAT:** Rehearse a synthetic final with incomplete scores, conflict and tie; inspect locked event records separately from selection review.
- **Release gate:** REL-05 judging rules/device rehearsal and REL-04 approved hackathon terms.
- **Owner type:** Hackathon/judging lead with full-stack/security engineer.
- **TBD blocked:** Live judging yes, CFG-05; reusable isolated event score architecture no.

<a id="bl-hac-10"></a>

## BL-HAC-10 — Release hackathon awards with per-member evidence and approved terms

- **Source IDs:** HAC-08, HAC-11, CRT-03, REV-07, REL-05.
- **Status:** Planned; awards and competition certificate evidence gates closed.
- **Purpose:** The authorized hackathon team can publish approved outcomes without promising unresolved prizes or certificate entitlements.
- **Scope:** Approved solo-versus-team award/prize/IP/evidence configuration; finals attendance readiness for every required member; private result preparation/preview, explicit release and minimal certificate-evidence handoff.
- **Exclusions:** Draft illustrative prizes/budgets, research-supervisor requirement, automatic certificate issue, automatic pitch recording/publication, conference registration/payment changes.
- **Dependencies:** BL-HAC-08, BL-HAC-09; shared authorized publication service; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05), [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Authorized hackathon award publisher; designated evidence verifier; certificate administrator with independent release authority.
- **States/transitions:** Award/result remains prepared and private until approved evidence and explicit publication; missing member attendance leaves readiness incomplete; certificate consideration retains a separate release gate.
- **Data touched:** Award configuration version, per-member activity evidence references, approval/reason, publication snapshot and certificate-evidence handoff.
- **Acceptance criteria:** Missing rules/evidence prevent release; one teammate's scan cannot satisfy the roster; preview matches published outcome; retry releases once; certificate handoff cannot issue a certificate itself.
- **English/Arabic:** Participant/non-review administration bilingual; written project/result material English as applicable; English transactional result email.
- **Accessibility:** Accessible evidence checklist, textual missing-member status, keyboard preview/confirm and clear published/pending result.
- **Security/RLS:** Award publisher MFA/scope separate from judge scoring; participant sees only authorized own-entry result; certificate handoff omits confidential scores and private files.
- **Audit/email:** Audit evidence corrections, exceptional approvals and release; one English outcome event; certificate email only after its own authorized batch release.
- **Automated tests:** Missing member, reused team attendance, unconfigured award terms, unauthorized publish, duplicate/stale-preview release and no automatic certificate/registration mutation.
- **Manual UAT:** Prepare synthetic solo/team awards with one absent member, correct evidence through authorized procedure and verify release/certificate separation.
- **Release gate:** REL-05 approved hackathon award/evidence procedure and independent competition-certificate gate.
- **Owner type:** Hackathon/event lead with full-stack/privacy engineer.
- **TBD blocked:** Live award/prize/IP and certificate rules yes, CFG-05/CFG-08; gated publication/evidence integration no.
