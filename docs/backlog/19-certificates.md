# Certificates

M10; REL-05. Ordinary eligibility is decided: full two-day conference attendance and workshop participation are the only ordinary pathways. No one-day certificate or unapproved accredited-hours claim may be introduced. Role/competition certificates remain separate approval-dependent scope.

<a id="bl-crt-01"></a>

## BL-CRT-01 — Calculate ordinary eligibility from independent evidence

- **Source IDs:** CRT-01, CRT-03, CHK-03, DAT-03, SCP-07, AT-14
- **Status:** Planned.
- **Purpose:** Participants and release staff can see precisely which confirmed evidence is present or missing for each ordinary certificate.
- **Scope:** Server eligibility evaluator and private readiness view for Full Two-Day Conference Attendance and Workshop Participation, with versioned evidence references and recalculation on corrections.
- **Exclusions:** One-day variant, attendance-hour/professional-credit inference, automatic co-author certificates and implementing unresolved role/competition criteria.
- **Dependencies:** BL-ATT-01, BL-ATT-02, BL-ATT-03; BL-WKS-03; BL-SRV-03; retention decisions [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).
- **Roles:** Participant own readiness; authorized certificate release administrator within approved scope.
- **States/transitions:** Incomplete evidence → eligible preparation when exact required evidence exists; correction → recalculated readiness; eligibility alone does not issue.
- **Data touched:** Day-one/day-two check-in, general survey completion, workshop confirmed booking/check-in/sign-off/survey completion, eligibility evidence snapshot.
- **Acceptance criteria:** Conference requires both days plus general survey; workshop requires its four independent records and does not require full conference certificate; missing any requisite blocks that pathway; unlinked answers are never queried.
- **English/Arabic:** Bilingual readiness labels, missing-evidence explanation and RTL layout.
- **Accessibility:** Semantic checklist with text states, accessible links to available actions and no color-only readiness.
- **Security/RLS:** Owner/scoped staff queries; deny other participants and direct client eligibility edits; survey answer store inaccessible to evaluator.
- **Audit/email:** Record eligibility rule/evidence version for release traceability; no issue/release email on readiness calculation alone.
- **Automated tests:** Full truth tables for two pathways, missing-day/one-day rejection, workshop independence, co-author denial and corrected evidence recalculation.
- **Manual UAT:** Inspect synthetic participants covering each missing evidence case and independent workshop eligibility.
- **Release gate:** REL-05/06, AT-14; ordinary criteria are confirmed, not an unresolved threshold.
- **Owner type:** Backend engineer with certificate/operations owner.
- **TBD blocked:** Ordinary evaluator unblocked; production evidence availability/retention remain gated. Separate role/competition adapters are BL-CRT-06, BL-CRT-07, BL-CRT-08, BL-CRT-09, BL-CRT-10 and BL-CRT-11.

<a id="bl-crt-02"></a>

## BL-CRT-02 — Prepare approved versioned templates and private generation

- **Source IDs:** CRT-03, CRT-04, CRT-06, SEC-03, SEC-05, API-03
- **Status:** Planned; final templates/signatures pending.
- **Purpose:** Staff can inspect an accurate certificate preview from an approved template without prematurely issuing it.
- **Scope:** Template/signature version record, authorized approval evidence, synthetic preview and private generation job with deterministic input snapshot and bounded retry.
- **Exclusions:** Invented signatures/accreditation, public unissued files, one-day template and treating template approval as batch release.
- **Dependencies:** BL-CRT-01; private storage/durable jobs; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08), [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12).
- **Roles:** Authorized certificate administrator; designated template/signature approver; Participant has no preview of others.
- **States/transitions:** Draft template → approved immutable version; eligible input → private generated preview/preparation; issuance remains separately closed.
- **Data touched:** Template/version, signature approval reference, recipient display name, certificate type/activity, generation job and private file.
- **Acceptance criteria:** No generation for unapproved live template; retries use same snapshot; names/types fit without truncation; private generated files cannot be listed/downloaded anonymously; no unsupported credit statement.
- **English/Arabic:** Bilingual management UI; render approved template languages and Arabic names correctly. Final certificate-language wording requires owner approval, not an inferred rule.
- **Accessibility:** Accessible preview details/text alternative and readable document layout; management controls keyboard accessible.
- **Security/RLS:** Private buckets, scoped generation/download, expiring authorized links and no client template/signature tampering.
- **Audit/email:** Audit template approval/version and generation attempts; no recipient email before authorized release.
- **Automated tests:** Unapproved template gate, job retry/deduplication, wrong-owner file access, font/name rendering fixtures and input snapshot integrity.
- **Manual UAT:** Approver inspects synthetic long English/Arabic names, document print rendering and approved signature placement.
- **Release gate:** REL-05/06; approved templates/signatures and private-delivery/retention configuration.
- **Owner type:** Full-stack/document-generation engineer with certificate approver.
- **TBD blocked:** Synthetic renderer unblocked; live templates/signatures/language and retention blocked by CFG-08/09/12.

<a id="bl-crt-03"></a>

## BL-CRT-03 — Release approved batches through durable issuance and email

- **Source IDs:** CRT-04, API-02, API-03, EML-03, EML-04, ADM-04, AT-14
- **Status:** Planned.
- **Purpose:** Eligible recipients receive certificates automatically only after an authorized administrator releases the specific batch.
- **Scope:** Batch preparation/impact preview, approved template/evidence snapshot, explicit release command, deduplicated generation/issuance/email workers and failure/replay dashboard.
- **Exclusions:** Unapproved automatic release, issuing ineligible records, sending attachments/public URLs indiscriminately and equating queueing with delivery.
- **Dependencies:** BL-CRT-01, BL-CRT-02, BL-CRT-04; durable email and private delivery; release authority from [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Explicitly authorized certificate release administrator with MFA; Participant own issued certificate.
- **States/transitions:** Prepared eligible batch → authorized release → generation/issuance processing → issued or visible recoverable failure; email queued/provider states tracked separately.
- **Data touched:** Release batch/approver, eligibility/template snapshots, certificate/verification record, private file, job/delivery events.
- **Acceptance criteria:** Recheck stale eligibility before issue; duplicate release/replay produces one intended certificate and email; partial failure resumes safely; live flag, template, authority and retention gates enforced server-side.
- **English/Arabic:** Bilingual administrator/participant progress and errors; certificate-release email English-only with locale-aware access link.
- **Accessibility:** Accessible batch impact table, explicit confirmation, keyboard replay and status announcements.
- **Security/RLS:** Scope/MFA verified for release and replay; participant cannot self-release; private certificate delivery is owner-authorized.
- **Audit/email:** Immutable release actor/time/template/evidence and job outcomes; English post-issue email deduplicated; no email for rollback/unissued file.
- **Automated tests:** Unauthorized/repeated release, changed evidence, partial generation/email failure, replay and recipient-isolation tests.
- **Manual UAT:** Release a synthetic mixed-readiness batch, inject failure, recover and verify only eligible recipients receive one certificate.
- **Release gate:** REL-05/06, AT-14; approved release authority, sender and correction/revocation path.
- **Owner type:** Backend/full-stack engineer with certificate operations owner.
- **TBD blocked:** Synthetic pipeline unblocked; live release blocked by CFG-08/09/10.

<a id="bl-crt-04"></a>

## BL-CRT-04 — Verify one certificate publicly without creating a directory

- **Source IDs:** CRT-05, CRT-06, SCP-05, PRV-03, PRV-05, DAT-04, SEC-01
- **Status:** Planned.
- **Purpose:** A recipient can share a verification code that confirms one certificate's validity with minimal public information.
- **Scope:** Unique opaque verification code, rate-limited single-certificate lookup and public validity projection; private download remains independent.
- **Exclusions:** Search/directory/bulk lookup, predictable sequential tokens, email/phone/licence/score disclosure and unapproved indefinite retention.
- **Dependencies:** BL-CRT-02; agreed issued/revoked/replaced certificate record contract with synthetic fixtures; [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09) verification fields/retention and privacy notice. Build lookup before the batch issuance producer.
- **Roles:** Public verifier with exact code; Participant; authorized certificate administrator.
- **States/transitions:** Issued current certificate → valid verification; revoked/replaced certificate → explicit corresponding validity; unknown code → safe not-found response.
- **Data touched:** Opaque code/protected lookup record, necessary recipient name, type, edition/activity and validity only.
- **Acceptance criteria:** Lookup returns only source-permitted minimal fields; unknown tokens cannot enumerate recipients; verification exposes no private file or account endpoint; approved expiry/retention policy applied separately from downloads.
- **English/Arabic:** Bilingual lookup/result and RTL; names retained accurately in their approved form.
- **Accessibility:** Labelled code entry, keyboard submit, accessible error/validity text and no scan-only requirement.
- **Security/RLS:** Public projection narrowly authorized; rate limiting and non-predictable codes; deny collection listing and protected columns even by direct API.
- **Audit/email:** Privacy-minimized abuse telemetry without unnecessary identity/token exposure; no verification lookup email.
- **Automated tests:** Projection allowlist, enumeration/rate limit, revoked/replaced/unknown codes, private-download denial and retention expiry.
- **Manual UAT:** Verify one synthetic certificate in both locales and inspect network responses for excluded data.
- **Release gate:** REL-05/06; BL-CRT-03 issuance integration, approved minimal verification retention and privacy disclosure before live exposure.
- **Owner type:** Full-stack/security engineer with privacy/certificate owner.
- **TBD blocked:** Synthetic endpoint unblocked; live exposure/retention blocked by CFG-09.

<a id="bl-crt-05"></a>

## BL-CRT-05 — Correct names, revoke and reissue with protected delivery

- **Source IDs:** CRT-06, CRT-04, PRV-04, ADM-04, API-02, SEC-05
- **Status:** Planned.
- **Purpose:** Verified recipients and authorized staff can fix mistakes without leaving an old certificate appearing valid.
- **Scope:** Verified correction request handling, reasoned revocation/reissue transaction, original/replacement chain and protected expiring delivery for approved speakers without accounts.
- **Exclusions:** Unverified name changes, overwriting original issue history, permanent public download links and changing certificate eligibility by support action.
- **Dependencies:** BL-CRT-03, BL-CRT-04; verified support/privacy request process; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08), [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).
- **Roles:** Verified recipient; authorized certificate administrator; approved non-account speaker recipient.
- **States/transitions:** Issued → revoked or replaced with reason; approved name correction → new issue linked to original; original verification reflects revocation/replacement.
- **Data touched:** Verified request evidence, old/new certificate name/version, replacement relationship, delivery credential and audit.
- **Acceptance criteria:** Concurrent/repeated correction cannot create multiple current replacements; old verification updates; protected speaker link expires and cannot reveal other files; download and verification retention treated separately.
- **English/Arabic:** Bilingual request/admin/status UI; English delivery/correction email; Arabic names preserved accurately.
- **Accessibility:** Labelled correction form, accessible document/verification result and keyboard protected-link flow.
- **Security/RLS:** Verify requester's identity and scope; MFA for administrative changes; expiring least-privilege delivery; no unauthenticated arbitrary certificate fetch.
- **Audit/email:** Preserve reason, actor, original/new reference and delivery result; deduplicated English correction/reissue notice after commit.
- **Automated tests:** Unverified request denial, stale/concurrent reissue, old validity, expired/wrong delivery token and private-file isolation.
- **Manual UAT:** Correct a synthetic Arabic name, revoke another certificate and test an approved speaker delivery scenario.
- **Release gate:** REL-05/06; approved correction authority, retention and tested revocation.
- **Owner type:** Full-stack engineer with certificate/privacy owner.
- **TBD blocked:** Synthetic lifecycle unblocked; live procedure and delivery/verification retention blocked by CFG-08/09.

<a id="bl-crt-06"></a>

## BL-CRT-06 — Add the approved research-presenter certificate evidence rule

- **Source IDs:** CRT-03, ABS-08, REV-10, REL-05
- **Status:** Planned; pathway evidence approval pending.
- **Purpose:** Eligible research presenters receive their separately approved certificate without granting attendance/presenter credit to every co-author.
- **Scope:** One presenter-evidence adapter and approved template mapping into the existing readiness/release pipeline; keep its gate closed until the rule is recorded.
- **Exclusions:** Automatic co-author credit, invented presentation threshold and requiring a supervisor for ordinary presentation.
- **Dependencies:** BL-CRT-01, BL-CRT-02, BL-CRT-03; verified presentation evidence; [DR-CFG-04](DECISION_REQUIRED.md#dr-cfg-04), [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Scientific Administrator supplies scoped evidence; authorized certificate administrator releases; individual presenter receives.
- **States/transitions:** Unconfigured pathway → closed; approved rule + validated presenter evidence → ready for independent release.
- **Data touched:** Presenter/activity evidence reference, approved rule/template version and eligibility result.
- **Acceptance criteria:** Rule explicitly identifies qualifying evidence; co-author listing alone fails; supervisor requirement remains restricted to selected research award winners.
- **English/Arabic:** Bilingual readiness/admin UI; scientific evidence English/LTR; template wording separately approved.
- **Accessibility:** Accessible missing-evidence text and approved document rendering.
- **Security/RLS:** Scoped evidence projection; evaluator cannot retrieve confidential IRB/review material.
- **Audit/email:** Record rule/evidence/release provenance; English issue email through shared release pipeline only.
- **Automated tests:** Approved evidence pass, non-presenting co-author fail, absent-rule closure, no supervisor prerequisite and unauthorized release.
- **Manual UAT:** Scientific owner validates synthetic presenter/co-author cases and template.
- **Release gate:** REL-05/06; presenter evidence/template/release approval.
- **Owner type:** Backend engineer with scientific/certificate owner.
- **TBD blocked:** Concrete adapter blocked by CFG-04/08 evidence approval; closed gate can be prepared independently.

<a id="bl-crt-07"></a>

## BL-CRT-07 — Add the approved reviewer certificate evidence rule

- **Source IDs:** CRT-03, ROL-03, ROL-04, REV-03, REL-05
- **Status:** Planned; qualifying reviewer evidence pending.
- **Purpose:** Reviewers receive a separately approved acknowledgement without leaking assignments, applicants or confidential scores.
- **Scope:** One reviewer-evidence adapter and approved template mapping using a minimal verified service-evidence projection.
- **Exclusions:** Invented review-count threshold, publishing reviewer identities to applicants and automatic ordinary attendance credit.
- **Dependencies:** BL-CRT-01, BL-CRT-02, BL-CRT-03; completed-review evidence; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Relevant scientific administrator verifies service; authorized certificate administrator releases; reviewer receives.
- **States/transitions:** Unconfigured rule → closed; approved qualifying evidence → ready for authorized release.
- **Data touched:** Reviewer service-evidence reference, approved rule/version, certificate mapping; no manuscript or score payload.
- **Acceptance criteria:** Only approved evidence qualifies; assignment alone does not satisfy an invented completion rule; certificate process reveals no applicant/assignment details publicly.
- **English/Arabic:** Bilingual certificate-management/readiness UI; reviewer assessment screens remain English-only.
- **Accessibility:** Textual eligibility explanation and readable approved certificate document.
- **Security/RLS:** Minimal role-scoped evidence; reviewer cannot self-grant service completion or publish a certificate.
- **Audit/email:** Rule/evidence/release trace; English issuance notice via deduplicated shared pipeline.
- **Automated tests:** Missing/invalid evidence, unconfigured gate, cross-reviewer access and confidential-field exclusion.
- **Manual UAT:** Scientific owner checks eligible/ineligible synthetic reviewer cases without exposing review content.
- **Release gate:** REL-05/06; approved reviewer rule/template/release authority.
- **Owner type:** Backend engineer with scientific/certificate owner.
- **TBD blocked:** Evidence adapter blocked by CFG-08 rule; no qualifying count inferred.

<a id="bl-crt-08"></a>

## BL-CRT-08 — Add the approved speaker certificate evidence rule

- **Source IDs:** CRT-03, CRT-06, CMS-03, REL-05
- **Status:** Planned; speaker evidence approval pending.
- **Purpose:** Eligible speakers, including those without accounts, receive approved certificates through protected delivery.
- **Scope:** One speaker-evidence adapter/template mapping using verified speaker/activity evidence and BL-CRT-05 protected delivery.
- **Exclusions:** Requiring speaker accounts, treating a public profile as proof of completed service and public certificate-file links.
- **Dependencies:** BL-CRT-02, BL-CRT-03, BL-CRT-05; approved program/speaker evidence; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Authorized program/evidence verifier; certificate administrator; approved speaker recipient.
- **States/transitions:** Unconfigured rule → closed; verified qualifying speaker evidence → ready for approved release and protected delivery.
- **Data touched:** Speaker/activity evidence, minimal private delivery contact, approved rule/template and eligibility record.
- **Acceptance criteria:** Only the approved evidence qualifies; private contact stays out of public profile/verification; non-account recipient can access only their issued file through expiring authorization.
- **English/Arabic:** Bilingual management UI; English delivery email; certificate wording/language approved separately.
- **Accessibility:** Accessible protected-link flow, readable document and alternative support route.
- **Security/RLS:** Private speaker contact separated; evidence/release grants explicit; delivery token cannot list files.
- **Audit/email:** Rule/evidence/release and delivery audit without token leakage; deduplicated English email.
- **Automated tests:** Missing rule/evidence, public-contact leakage, expired/wrong recipient token and duplicate issue.
- **Manual UAT:** Program owner verifies synthetic no-account speaker delivery and certificate wording.
- **Release gate:** REL-05/06; speaker evidence/template and delivery retention approval.
- **Owner type:** Backend engineer with program/certificate/privacy owner.
- **TBD blocked:** Concrete evidence rule blocked by CFG-08; private retention/delivery approvals remain CFG-09.

<a id="bl-crt-09"></a>

## BL-CRT-09 — Add the approved organizer certificate evidence rule

- **Source IDs:** CRT-03, ROL-10, ROL-12, REL-05
- **Status:** Planned; organizer service evidence unresolved.
- **Purpose:** Organizers receive approved role certificates based on verified service, not simply possessing an administrative login.
- **Scope:** One organizer-evidence adapter and approved template mapping with explicit verifier/release authority.
- **Exclusions:** Invented service duration/count, automatically certifying all role grants and self-approved exceptional awards.
- **Dependencies:** BL-CRT-01, BL-CRT-02, BL-CRT-03; verified organizer service record; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).
- **Roles:** Authorized service verifier and certificate releaser; named organizer recipient.
- **States/transitions:** Unconfigured rule → closed; approved verified evidence → ready for independent release.
- **Data touched:** Minimal organizer/service evidence reference, verifier, approved rule/template and readiness.
- **Acceptance criteria:** Website privilege alone does not create eligibility; rule and verifier are recorded; revoked staff access does not erase retained legitimate service history or grant release power.
- **English/Arabic:** Bilingual management/readiness; approved name/title wording; English issue email.
- **Accessibility:** Readable eligibility states and approved document layout in supported scripts.
- **Security/RLS:** Service verification/release uses explicit grants and MFA; protect evidence from self-editing and cross-edition access.
- **Audit/email:** Preserve verifier/rule/release provenance; shared English issue pipeline with deduplication.
- **Automated tests:** Role-without-evidence, unauthorized self-verification, missing rule, cross-edition access and revoked-staff mutation.
- **Manual UAT:** Leadership validates synthetic eligible/ineligible organizers and release responsibilities.
- **Release gate:** REL-05/06; approved organizer evidence/template/release authority.
- **Owner type:** Backend engineer with leadership/certificate owner.
- **TBD blocked:** Adapter blocked by CFG-08/11 evidence and authority decisions.

<a id="bl-crt-10"></a>

## BL-CRT-10 — Add the approved hackathon certificate evidence rule

- **Source IDs:** CRT-03, HAC-08, HAC-11, REL-05
- **Status:** Planned; hackathon certificate conditions unresolved.
- **Purpose:** Eligible individual hackathon participants receive the approved certificate without crediting absent members from a team event.
- **Scope:** One hackathon certificate adapter/template mapping consuming approved participant-level compulsory-activity and role/outcome evidence.
- **Exclusions:** Invented attendance exceptions, team-wide credit from one scan, supervisor condition inherited from research awards and assumed award/certificate equivalence.
- **Dependencies:** BL-CRT-01, BL-CRT-02, BL-CRT-03; hackathon participant evidence; [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05), [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Authorized hackathon evidence verifier; certificate releaser; individual solo/team participant.
- **States/transitions:** Unconfigured certificate rule → closed; approved individual evidence → ready for independent release.
- **Data touched:** Individual entry/roster/activity evidence references, approved rule/template version and eligibility result.
- **Acceptance criteria:** Exact approved certificate rule governs; one member's evidence cannot fill another's gaps; solo/team pathways remain supported; ordinary attendance certificates stay separate.
- **English/Arabic:** Bilingual readiness/admin UI; project content English/LTR and reviewer assessment English-only.
- **Accessibility:** Explicit missing activity evidence and accessible document/issue controls.
- **Security/RLS:** Scoped minimal evidence query; no confidential reviewer packet or team contact export.
- **Audit/email:** Record individual evidence/rule/release provenance; English issue notice through shared pipeline.
- **Automated tests:** Missing member activity, solo/team examples under approved rule, absent configuration and cross-entry denial.
- **Manual UAT:** Hackathon owner validates synthetic present/absent members and approved exceptions, if any.
- **Release gate:** REL-05/06; explicit hackathon certificate evidence/template approval.
- **Owner type:** Backend engineer with hackathon/certificate owner.
- **TBD blocked:** Concrete rule adapter blocked by CFG-05/08; no draft condition promoted by inference.

<a id="bl-crt-11"></a>

## BL-CRT-11 — Add the approved 3MT certificate evidence rule

- **Source IDs:** CRT-03, TMT-01, TMT-02, REL-05
- **Status:** Planned; 3MT certificate conditions unresolved.
- **Purpose:** Eligible postgraduate 3MT participants receive their separately approved certificate without importing another competition's rules.
- **Scope:** One 3MT evidence adapter/template mapping using the approved participation/outcome evidence contract.
- **Exclusions:** External competition rules, inherited hackathon/research criteria, invented award thresholds and implicit full-conference certification.
- **Dependencies:** BL-CRT-01, BL-CRT-02, BL-CRT-03; 3MT evidence contract; [DR-CFG-06](DECISION_REQUIRED.md#dr-cfg-06), [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Authorized 3MT evidence verifier; certificate releaser; eligible 3MT participant.
- **States/transitions:** Unconfigured rule → closed; approved qualifying evidence → ready for separate authorized release.
- **Data touched:** 3MT participant/activity/outcome evidence reference, approved rule/template and readiness result.
- **Acceptance criteria:** Missing 3MT rule fails closed; evidence qualifies only the approved pathway; scientific acceptance/outcome is not redefined by certificate preparation.
- **English/Arabic:** Bilingual readiness/admin UI; scientific material and assessment remain English/LTR.
- **Accessibility:** Accessible missing-evidence explanation, keyboard release controls and readable approved document.
- **Security/RLS:** Minimal scope-limited evidence access; participants cannot self-certify or retrieve other entrants' material.
- **Audit/email:** Rule/evidence/release audit; English issuance email after common release gate.
- **Automated tests:** Approved evidence matrix, absent rule, cross-track misclassification and owner/role denials.
- **Manual UAT:** 3MT lead approves synthetic eligible/ineligible cases and certificate wording.
- **Release gate:** REL-05/06; independent 3MT evidence/template approval.
- **Owner type:** Backend engineer with 3MT/certificate owner.
- **TBD blocked:** Concrete adapter blocked by CFG-06/08; competition name does not resolve policy.
