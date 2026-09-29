# Abstract submission

M6 / scientific release REL-03. These are planned issues, not evidence of completed functionality. Shared identity, private-file and durable-job foundations are prerequisites; production collection remains closed until its privacy and scientific inputs are approved. Scientific content is English/LTR even within the Arabic participant interface.

<a id="bl-abs-01"></a>

## BL-ABS-01 — Add the structured abstract draft and shared word counter

- **Source IDs:** ABS-01, ABS-02, ABS-03, ABS-04, LOC-02, AT-07.
- **Status:** Planned; synthetic implementation permitted.
- **Purpose:** An applicant can describe completed or ongoing research using the appropriate structured template.
- **Scope:** Typed draft fields; ordinary research and case-report sections; completion status; configured specialty/study-type choices and keyword policy; shared client/server 300-body-word counter using the documented default token rule.
- **Exclusions:** Final submission, attachment uploads, invented results, references/tables/figures in the body, live unapproved choice lists.
- **Dependencies:** BL-FND-01; verified participant identity; [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03).
- **Roles:** Participant; Scientific Administrator owns form configuration.
- **States/transitions:** New work becomes an editable draft; invalid fields prevent progression without deleting valid input.
- **Data touched:** Draft scientific fields, configuration version, completion status; no supervisor field.
- **Acceptance criteria:** Ongoing work can explicitly state unavailable results; ordinary/case sections differ correctly; only body tokens count; 300 passes and 301 fails on the server; missing required scientific configuration keeps the live form closed.
- **English/Arabic:** Labels/help/errors bilingual; all scientific inputs English/LTR; preserve entered content on locale change.
- **Accessibility:** Programmatic section labels, live counter announcement without excessive chatter, linked error summary, keyboard review at 200% zoom.
- **Security/RLS:** Owner-only drafts; validate allowed fields, template and counts server-side; treat text as untrusted, never rendered HTML.
- **Audit/email:** Record configuration changes through privileged audit; no email for keystrokes or validation failures.
- **Automated tests:** Counter edge cases including hyphens and excluded metadata; template constraints; forged client count; cross-owner draft denial.
- **Manual UAT:** Complete an ongoing study and a case report in both UI languages; check long text and correction after an error.
- **Release gate:** REL-03 submission configuration and production privacy approval; synthetic UI may remain gated in staging.
- **Owner type:** Full-stack engineer with scientific lead and accessibility reviewer.
- **TBD blocked:** Technical draft work no; live form yes, CFG-03 choice lists/keyword policy and CFG-09 collection approval.

<a id="bl-abs-02"></a>

## BL-ABS-02 — Persist resumable drafts with visible conflict and autosave recovery

- **Source IDs:** ABS-12, ROL-02, ERR-01, ERR-02, AT-16.
- **Status:** Planned.
- **Purpose:** An applicant can continue work across devices without silently losing or overwriting a newer draft.
- **Scope:** Owner-scoped draft persistence, optimistic version checks, saving/saved/error feedback, explicit preview, retry-safe save and recovery after interrupted requests.
- **Exclusions:** Finalization, offline-first synchronization, public draft links, applicant-facing historical version browser.
- **Dependencies:** BL-ABS-01; verified participant identity; server validation and database grants/RLS.
- **Roles:** Participant owns their draft; support receives references rather than confidential body text.
- **States/transitions:** Draft remains editable through saving, saved and recoverable error UI states; stale version produces an explicit conflict.
- **Data touched:** Draft body/metadata, version number, timestamps and owner; finalized snapshots remain outside this slice.
- **Acceptance criteria:** Reload and second-device resume recover the last acknowledged save; stale writes cannot overwrite it; failed save never displays saved; preview matches persisted content.
- **English/Arabic:** Bilingual autosave/conflict messages and preview chrome; English/LTR scientific text retained across locale switches.
- **Accessibility:** Non-blocking live save status, keyboard-accessible conflict recovery, focus retained during autosave.
- **Security/RLS:** Owner and edition checks on every read/write; reject mass assignment of owner, status or privileged fields; avoid bodies in logs.
- **Audit/email:** Technical save diagnostics contain safe identifiers; no draft/autosave emails or redundant consequential-action audit entries.
- **Automated tests:** Parallel-tab stale writes, interrupted response with retry, owner mismatch, closed/session-expired save, persisted preview fidelity.
- **Manual UAT:** Edit from two browsers, disconnect/reconnect, expire the session and recover without losing valid local input.
- **Release gate:** REL-03 and REL-06; demonstrate recovery before submission opening.
- **Owner type:** Full-stack engineer and QA engineer.
- **TBD blocked:** Technical work no; live access follows CFG-03/CFG-09 submission and privacy gates.

<a id="bl-abs-03"></a>

## BL-ABS-03 — Model ordered authors and explicit submission authority

- **Source IDs:** ABS-02, ABS-05, ABS-06, SCP-03, PRV-03.
- **Status:** Planned.
- **Purpose:** A submitter can accurately represent authorship without creating attendance or accounts for co-authors.
- **Scope:** Ordered authors with multiple affiliations; separate submitter, PI, first author, corresponding author and known presenter; authority declaration; scoped correction request route for incorrect co-author information.
- **Exclusions:** Scientific author-count cap, inferred corresponding author, automatic accounts/registration/orders/public profiles, supervisor requirement.
- **Dependencies:** BL-ABS-01, BL-ABS-02; [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03); approved co-author-data notice.
- **Roles:** Participant submitter; Scientific Administrator for authorized corrections; co-author as data subject, not an automatically provisioned account.
- **States/transitions:** Draft author edits remain editable; finalized-author correction follows an authorized recorded correction/reopen path, preserving the original snapshot.
- **Data touched:** Ordered names, affiliations, author-role links, necessary contact fields, authority declaration and correction record.
- **Acceptance criteria:** Author order does not silently set corresponding-author eligibility; multiple affiliations work; payload anti-abuse limits do not become a scientific author cap; corrections do not rewrite reviewed snapshots.
- **English/Arabic:** Bilingual role labels/declarations/instructions; official names/institutions may retain original script; scientific role semantics unchanged.
- **Accessibility:** Keyboard author reordering with announced position; labelled repeated fields and errors tied to the correct author.
- **Security/RLS:** Author rows inherit submission ownership; limited duty-scoped staff corrections; no searchable public co-author database.
- **Audit/email:** Audit consequential post-finalization corrections. Approved informational/invitational co-author emails are English and deduplicated; no attendance confirmation implied.
- **Automated tests:** Role separation, affiliation ordering, direct foreign-author-row access denial, correction snapshot preservation and invitation retry deduplication.
- **Manual UAT:** Submitter differs from PI and first author; international institution names; co-author correction without account creation.
- **Release gate:** REL-03 and approved field purposes/privacy notice before collection.
- **Owner type:** Full-stack engineer with scientific/privacy owners.
- **TBD blocked:** Live corresponding-author validation and data collection yes, CFG-03/CFG-09; synthetic schema/UI work no.

<a id="bl-abs-04"></a>

## BL-ABS-04 — Upload only private stage-one administrative evidence

- **Source IDs:** ABS-09, ABS-15, ROL-11, AT-08, SEC-03, SEC-04.
- **Status:** Planned.
- **Purpose:** An applicant supplies the permitted ethics and similarity evidence without exposing it to reviewers or the public.
- **Scope:** Bind the shared private upload pipeline to IRB/ethics and similarity-report classes; PDF-only/10 MB default per file; safe metadata/status; replacement creates a new object/version.
- **Exclusions:** Stage-one presentations, posters, figures, supplements or generic attachments; public object URLs; Scientific Administrator access to originals by implication.
- **Dependencies:** BL-ABS-02; BL-SEC-01 and approved private-upload/quarantine foundation; [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).
- **Roles:** Participant uploader; Super Admin for confidential-original downloads; scientific staff receive validation outcomes only.
- **States/transitions:** Completed permitted uploads may bind to the timely finalized snapshot while a background scan is pending; quarantine blocks access/readiness until cleared. Rejected scans create visible remediation rather than deleting submitted history.
- **Data touched:** Private objects, evidence class, content checks, safe object identifiers, versions and submission association.
- **Acceptance criteria:** Extension alone cannot admit a spoofed PDF; oversize/forbidden classes fail; server-completed upload/finalization determines timeliness even if scanning finishes later; replacement preserves assessed evidence; originals require authorized expiring access.
- **English/Arabic:** Bilingual upload instructions/status/error recovery; source document content is not translated automatically.
- **Accessibility:** File-picker alternative to drag/drop; announced upload progress/failure; keyboard replace/cancel; clear allowed types and limits.
- **Security/RLS:** Private bucket and ownership/edition checks; restricted original download grant with MFA; reviewer and ordinary scientific-admin direct URL attempts fail.
- **Audit/email:** Audit original downloads and consequential replacements with safe metadata; no file contents in logs/emails; no upload email required.
- **Automated tests:** MIME/signature mismatch, oversize, forbidden attachment, timely finalization with pending scan, rejected-scan remediation, quarantine denial, expired authorized URL, cross-owner access and replacement retention.
- **Manual UAT:** Upload/replace valid synthetic evidence, interrupt transfer and inspect denied access as reviewer and Scientific Administrator.
- **Release gate:** REL-03 upload policy plus configured malware service and tested private storage.
- **Owner type:** Full-stack/security engineer.
- **TBD blocked:** Synthetic integration no; live uploads yes, CFG-09 retention and CFG-10 scanning/storage approval.

<a id="bl-abs-05"></a>

## BL-ABS-05 — Validate ethics and similarity evidence without automated rejection

- **Source IDs:** ABS-10, ABS-11, ROL-05, ROL-11, AT-08.
- **Status:** Planned.
- **Purpose:** Authorized staff can record administrative readiness while distinguishing evidence concerns from a scientific decision.
- **Scope:** Approval-provided versus not-required/exempt declarations and explanations; separate case-report consent; Super Admin original-evidence validation; outcome visible to scientific staff; human flags for unverifiable or above-target similarity reports.
- **Exclusions:** Automatic ethics waiver by study type, automatic scientific rejection from a percentage, plagiarism-proof claims, assumed external similarity integration.
- **Dependencies:** BL-ABS-04; BL-AUTH-01; [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03).
- **Roles:** Participant provides declarations; Super Admin inspects originals; Scientific Administrator acts on recorded validation outcomes.
- **States/transitions:** Submitted work enters administrative_review; readiness permits the scientific-review path; concerns route to authorized correction/revision handling rather than auto-rejection.
- **Data touched:** Ethics basis, evidence validation result, human notes, reported similarity and provider/settings provenance; confidential originals stay separate.
- **Acceptance criteria:** Required ethics evidence cannot be waived by case/study type alone; unavailable/not-applicable evidence requires explanation; above 20% current policy target or unverifiable report creates a human action item.
- **English/Arabic:** Applicant and non-review administration bilingual; scientific material English; sanitized applicant instructions separate from confidential notes.
- **Accessibility:** Labelled validation decisions, textual concern status, accessible evidence-review navigation and linked correction instructions.
- **Security/RLS:** Original access remains Super Admin-only unless separately approved/logged; reject privileged readiness changes from participants or reviewers.
- **Audit/email:** Record validator, outcome and reason; applicant email only through authorized published request, never from internal notes.
- **Automated tests:** Required versus exempt ethics combinations, patient-data warning handling, similarity flags without rejection, original-access denial, internal-note exclusion.
- **Manual UAT:** Validate synthetic exempt/required ethics and unverifiable reports; confirm scientific staff can work from outcomes without originals.
- **Release gate:** REL-03 approved evidence policy and responsibility before administrative processing opens.
- **Owner type:** Scientific lead with security/full-stack engineer.
- **TBD blocked:** Live validation yes, CFG-03 provider/report settings and CFG-09 handling; synthetic workflow no.

<a id="bl-abs-06"></a>

## BL-ABS-06 — Finalize one immutable application with race-safe PI limits

- **Source IDs:** ABS-07, ABS-12, ABS-13, TIM-01, TIM-02, ERR-02, AT-07, AT-16.
- **Status:** Planned.
- **Purpose:** A verified applicant receives one trustworthy submission receipt, reference and locked snapshot.
- **Scope:** Server-completed finalization transaction; two finalized applications per PI per edition; stable concurrently allocated reference; immutable text/authors/declarations/evidence snapshot; durable deduplicated receipt event.
- **Exclusions:** Counting drafts/co-authorship as applications, disqualifying existing two on a third attempt, global abstract cap, browser-clock eligibility.
- **Dependencies:** BL-ABS-01, BL-ABS-03, BL-ABS-04; configured submission window; durable email jobs and stable server-side PI identity association designed without requiring co-author accounts.
- **Roles:** Verified Participant; scientific owner configures scope/window; authorized exception role records PI-limit reason.
- **States/transitions:** Valid draft becomes submitted exactly once before the server cutoff; invalid/late/third attempt remains a recoverable draft with explanation.
- **Data touched:** Snapshot, PI-count reservation, edition/reference sequence, idempotency key, submission timestamp and email outbox record.
- **Acceptance criteria:** Concurrent finalizations cannot exceed two for the same PI; retry returns the same submission/reference; withdrawn applications count by default; reclassification cannot change reference; receipt does not claim delivery merely on queueing.
- **English/Arabic:** Bilingual validation and receipt screen; scientific snapshot English/LTR; transactional receipt English with locale-aware dashboard link.
- **Accessibility:** Keyboard preview/explicit submit, clear confirmation, live failure notice, focus on unresolved validation without losing data.
- **Security/RLS:** Transaction rechecks owner, verified identity, window, configuration and attachments; references never grant access; reject direct status/snapshot writes.
- **Audit/email:** Audit finalization and authorized limit exceptions; enqueue one English receipt atomically; safe delivery state visible in dashboard.
- **Automated tests:** Two concurrent last-slot PI attempts, retry after lost response, late completion, reference collision, withdrawn-count behavior and denied snapshot mutation.
- **Manual UAT:** Finalize valid ongoing research; retry after browser closure; attempt a third application and confirm first two unchanged.
- **Release gate:** REL-03 configured submission rules and REL-06 transactional/recovery evidence.
- **Owner type:** Full-stack/database engineer with scientific lead and QA.
- **TBD blocked:** Technical transaction/PI association design no; live specialty/reference, author-role settings and submission window require CFG-03 approval.

<a id="bl-abs-07"></a>

## BL-ABS-07 — Support withdrawal and explicitly authorized reopening

- **Source IDs:** ABS-07, ABS-12, REV-06, REV-09, TIM-02.
- **Status:** Planned.
- **Purpose:** An applicant or authorized scientific actor can stop or correct work without erasing history or unrelated attendance.
- **Scope:** Allowed withdrawal action; cancel outstanding review/assessment work; audited, scoped reopening with reason and deadline; retain finalized PI count unless an authorized exception applies.
- **Exclusions:** Deleting submitted snapshots, cancelling paid registration, automatic acceptance changes, silent deadline extensions.
- **Dependencies:** BL-ABS-06; BL-REV-03 assignment handling; cancellable durable-job foundation.
- **Roles:** Participant for permitted own withdrawal; Scientific Administrator for authorized reopen; privileged exception owner where required.
- **States/transitions:** Eligible active submission becomes withdrawn; an authorized reopen enables only its recorded scope/window and preserves prior scientific outcome/history until an explicit decision changes it.
- **Data touched:** Submission state/history, reopen scope/cutoff/reason, assignment/job cancellation markers and retained snapshots.
- **Acceptance criteria:** A worker rechecks withdrawal before applying output; late job result cannot revive work; reopening does not silently publish a new decision; attendance/order records remain unchanged.
- **English/Arabic:** Bilingual applicant/admin confirmations and consequences; scientific material English/LTR.
- **Accessibility:** Descriptive confirmation, focus return, keyboard cancellation, visible irreversibility/history explanation without relying on color.
- **Security/RLS:** Server-side transition allowlist and edition-scoped role; owner cannot self-reopen locked work; revoked staff grants cannot override cutoff.
- **Audit/email:** Log actor, reason, scope, prior/resulting state; send configured English withdrawal/reopen notification through deduplicated jobs when authorized.
- **Automated tests:** Withdraw/job race, stale assignment writes, unauthorized reopen, PI count retained, unrelated registration unchanged and extension boundary.
- **Manual UAT:** Withdraw while a synthetic job runs; scoped reopen from staff account; inspect applicant and staff histories.
- **Release gate:** REL-03, with permitted transition policy and staff procedure recorded.
- **Owner type:** Full-stack engineer with scientific operations owner.
- **TBD blocked:** Technical safeguards no; live discretionary reopen/exception ownership and windows need scientific configuration under CFG-03.

<a id="bl-abs-08"></a>

## BL-ABS-08 — Open stage-two materials only through an authorized request

- **Source IDs:** ABS-14, ABS-15, REV-06, ROL-06, ROL-11, SEC-04, AT-08.
- **Status:** Planned.
- **Purpose:** Accepted or explicitly invited applicants can supply the correct final material without changing acceptance or exposing administrative evidence.
- **Scope:** Request-specific deliverable/type/count/deadline configuration; accepted/conditionally accepted or explicit authorized-request eligibility; PDF/PPTX/DOCX allowlist and 50 MB default; immutable requested-material version and replacement audit.
- **Exclusions:** Stage-one upload expansion, DOC/PPT/macro-enabled executables, automatic acceptance from upload, invented templates/counts, public downloads.
- **Dependencies:** BL-ABS-04, BL-ABS-06; BL-REV-05; shared private file pipeline; [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03).
- **Roles:** Requested Participant; Scientific Administrator; assigned event Faculty Judge receives approved necessary presentation material only.
- **States/transitions:** Authorized request opens its upload window; accepted material records final_material_received/stage-two completion separately from scientific acceptance; expiry closes upload without rewriting the decision.
- **Data touched:** Final-material request, presentation type, private objects/snapshots, completeness state and submission link.
- **Acceptance criteria:** Unrequested/unaccepted uploads fail unless explicit authorization exists; server-completed upload/finalization must meet cutoff, though background scanning may finish later; rejected scans show remediation; earlier assessed files survive replacement; judges never receive IRB/similarity originals.
- **English/Arabic:** Bilingual request/upload interface; English/LTR scientific material; judge view English-only.
- **Accessibility:** Accessible requested-file checklist, keyboard upload/replace, clear rejection and deadline timezone announcement.
- **Security/RLS:** Ownership plus request-scope/time checks; private separate document class; assignment-scoped expiring judge access with revoked-role denial.
- **Audit/email:** Audit requests/replacements/downloads; authorized request/reminder emails English and deduplicated; internal upload checks do not publish decisions.
- **Automated tests:** Unauthorized/expired request, spoofed/macro file, per-deliverable allowlist, snapshot retention, judge misassignment and acceptance-state independence.
- **Manual UAT:** Accepted oral/poster synthetic cases, conditional/request exception, replacement after review and expired upload.
- **Release gate:** REL-03 final-material settings plus REL-05 judging access readiness.
- **Owner type:** Full-stack/security engineer with scientific lead.
- **TBD blocked:** Live stage two yes, CFG-03 deliverables/templates/deadlines and CFG-10 scanning; synthetic boundary work no.
