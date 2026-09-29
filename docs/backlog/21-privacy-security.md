# Privacy and security

These issues establish reusable controls; each feature PR must apply and test them to its own records. A completed control is not approval to collect production data. Source: [Development Specification v0.5](../../sources/Development_Specification_v0.5.txt). Named owners and approval dates remain unassigned.

<a id="bl-sec-01"></a>

## BL-SEC-01 — Define the server and RLS authorization contract

- **Source IDs:** ROL-01, ROL-02, ROL-03, ROL-04, ROL-05, ROL-06, ROL-07, ROL-08, ROL-09, ROL-10, ROL-11, ROL-12, SEC-01, SEC-02, AT-02.
- **Status:** Planned; M1 synthetic-table policies do not establish operational permissions.
- **Purpose:** Give each feature a reviewable permission boundary before exposing sensitive records.
- **Scope:** Record operation-by-role, edition, ownership, assignment and MFA requirements; create synthetic policy fixtures and a reusable denied-access test contract. Extend the matrix in each feature PR.
- **Exclusions:** Implementing all future domain tables; blanket access for authenticated users; roles from editable metadata.
- **Dependencies:** Foundation schema/test harness; staff and participant identity contracts from authentication.
- **Roles:** All defined roles; Super Admin administers grants, not infrastructure ownership.
- **States/transitions:** No grant → scoped grant → revoked grant; assignment withdrawal removes access; role combinations remain additive within scope.
- **Data touched:** Permission specification, synthetic role/assignment fixtures, grant-policy tests.
- **Acceptance criteria:** Every role has explicit allowed/denied operations; original IRB/similarity evidence remains Super Admin-only; old-token and direct-ID requests fail after applicable revocation.
- **English/Arabic:** Staff permission explanations bilingual; reviewer assessment remains English-only.
- **Accessibility:** Permission-denied and unavailable states expose clear headings and keyboard-reachable recovery.
- **Security/RLS:** Test server, table, view/function and storage boundaries independently; explicit grants plus RLS; default deny undefined operations.
- **Audit/email:** Specify role-change and exceptional-access audit events; no new notification channel or automatic grant email assumed.
- **Automated tests:** Cross-user, cross-edition, unassigned, conflicted, downgraded and unauthenticated matrix cases; permitted owner/assignee controls.
- **Manual UAT:** Security reviewer follows the same record through each authorized and unauthorized role.
- **Release gate:** M4 prerequisite; REL-06 for each sensitive feature.
- **Owner type:** Security engineer with domain owner review.
- **TBD blocked:** No for synthetic contract work; named production staff and grants require [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).

<a id="bl-sec-02"></a>

## BL-SEC-02 — Protect the first authenticated mutation boundary

- **Source IDs:** SEC-01, API-01, API-02, ERR-01, ERR-02, ACC-01, AT-02.
- **Status:** Planned; existing closed flags are not a full authenticated mutation defense.
- **Purpose:** Reject forged or malformed writes without losing legitimate saved work.
- **Scope:** Apply a shared validation/error contract, applicable CSRF/origin defense, output encoding, abuse controls and safe request references to one authenticated profile mutation; reuse it in later features.
- **Exclusions:** Invented domain fields; enabling registration; replacing feature-specific authorization or transaction rules.
- **Dependencies:** BL-SEC-01; authentication profile mutation; foundation safe-error contract.
- **Roles:** Participant; privileged actor only through separately scoped mutations.
- **States/transitions:** Valid source state → validated committed change; invalid/stale/unauthorized input → no change and actionable failure.
- **Data touched:** Permitted profile fields, edit version, minimal abuse/security diagnostics.
- **Acceptance criteria:** Client identity and authorization claims cannot override server context; hostile markup is inert; stale edits do not overwrite newer data; failed writes never return success.
- **English/Arabic:** Localized safe errors and preserved entered values; stable internal error codes independent of locale.
- **Accessibility:** Linked error summary, field descriptions, focus management and accessible anti-bot fallback.
- **Security/RLS:** Direct API requests face the same checks as UI submissions; origin checks complement authenticated authorization and RLS.
- **Audit/email:** Record consequential mutation outcome without payload secrets; no email for rolled-back work.
- **Automated tests:** Invalid schema, forged identity, cross-origin where applicable, stored/reflected markup, concurrent edit and retry cases.
- **Manual UAT:** Keyboard submission with validation failure, session expiry and recoverable retry in both languages.
- **Release gate:** Before first production mutation; REL-06.
- **Owner type:** Full-stack engineer with security review.
- **TBD blocked:** No for reusable synthetic implementation; privacy-approved production fields require [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).

<a id="bl-sec-03"></a>

## BL-SEC-03 — Quarantine and scan one private upload class

- **Source IDs:** SEC-03, SEC-04, ABS-09, ABS-14, API-03, AT-08.
- **Status:** Planned.
- **Purpose:** Accept eligible files without making unscanned or hostile content available.
- **Scope:** First implement stage-one administrative PDF upload, generated object names, authenticated purpose/size/signature checks, durable scan job and remediation status; expose an extensible policy for later stage-two formats.
- **Exclusions:** Accepting presentation files at stage one; arbitrary archives; macro-enabled files; selecting an unapproved scanner or changing source size defaults.
- **Dependencies:** BL-SEC-01; durable jobs foundation; abstract attachment/version record; private storage configuration.
- **Roles:** Authorized submitting participant; scanning service; Super Admin for original evidence.
- **States/transitions:** Authorized upload → quarantined → cleared or rejected/scan-failed; failed scanning never becomes public or reviewer-accessible.
- **Data touched:** Private file object, attachment version, MIME/signature evidence, scan result/job, immutable submission references.
- **Acceptance criteria:** Completed upload/finalization before cutoff establishes timeliness while scan may finish later; rejection creates remediation without silently replacing reviewed history; later formats obey separate stage rules.
- **English/Arabic:** Bilingual upload/status instructions; scientific filenames/content are not translated.
- **Accessibility:** File-picker alternative to drag/drop, announced progress/errors and keyboard retry.
- **Security/RLS:** Authenticate purpose on upload and job execution; quarantine inaccessible to participants after disallowed state changes and to reviewers throughout.
- **Audit/email:** Audit allowed file actions without file contents; English remediation notice through durable deduplicated jobs.
- **Automated tests:** Spoofed MIME, oversized PDF, executable, malicious fixture, scan timeout, duplicate callback and late finalization; use safe synthetic scanner fixtures.
- **Manual UAT:** Submit, fail scan and remediate a synthetic file while confirming earlier versions remain traceable.
- **Release gate:** REL-03 uploads; apply adapted controls before other private uploads.
- **Owner type:** Backend/security engineer.
- **TBD blocked:** Synthetic adapter unblocked; live scanning requires [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), stage details [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03).

<a id="bl-sec-04"></a>

## BL-SEC-04 — Issue expiring private file access after authorization

- **Source IDs:** SEC-02, SEC-05, ROL-03, ROL-04, ROL-11, ROL-12, PRV-03, AT-02.
- **Status:** Planned.
- **Purpose:** Let authorized users retrieve a permitted file without disclosing other document classes or identities.
- **Scope:** One server-authorized download/preview endpoint for cleared private attachments; distinct administrative evidence and presentation policies; expiring links and no sensitive URL metadata.
- **Exclusions:** Public bucket delivery, permanent links, download-button hiding as security, copying prevention claims.
- **Dependencies:** BL-SEC-01; BL-SEC-03; authentication session/MFA enforcement.
- **Roles:** Owner where permitted; assigned faculty judge for presentation materials; Super Admin only for original administrative evidence.
- **States/transitions:** Authorized active record/cleared file → short-lived access; expired session, withdrawn assignment or unauthorized class → deny new link issuance.
- **Data touched:** Attachment class/version, object reference, grant/assignment, minimal download audit.
- **Acceptance criteria:** Blind reviewers cannot obtain originals through endpoints, previews, exports or metadata; expired links fail; signed-link lifetime/revocation limitations are documented and tested.
- **English/Arabic:** Bilingual participant/staff errors; reviewer/judge assessment interface English-only.
- **Accessibility:** Named download controls, format/size text and understandable expiry/retry flow.
- **Security/RLS:** Check current server authorization before signing; storage denies public/raw access; test direct object paths and cross-edition requests.
- **Audit/email:** Audit confidential downloads with actor/class/reference; never store a reusable signed URL in audit or email.
- **Automated tests:** Allowed owner/judge/admin cases; denied reviewer, changed ID, expired URL, revoked role and quarantined file.
- **Manual UAT:** Inspect network responses as each role and attempt direct-link reuse after expiry.
- **Release gate:** Before any sensitive file delivery; REL-03 and REL-06.
- **Owner type:** Backend/security engineer.
- **TBD blocked:** No for synthetic implementation; actual storage/location approvals require [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).

<a id="bl-sec-05"></a>

## BL-SEC-05 — Version privacy notices and separate consent purposes

- **Source IDs:** PRV-01, PRV-02, PRV-03, PRV-08, MED-02, MED-03, DAT-01, AT-15.
- **Status:** Planned; public draft text is not a finalized privacy notice.
- **Purpose:** Record what a person agreed to without making optional publicity a condition of attendance.
- **Scope:** Versioned notice/terms references and consent-purpose ledger; approved bilingual notice rendering; distinct publicity and optional-announcement choices with withdrawal evidence.
- **Exclusions:** Inventing legal controller, legal basis or minor policy; requiring national ID; implementing the separate gallery publication workflow.
- **Dependencies:** BL-SEC-01; authentication identity; CMS controlled publication; approved privacy content.
- **Roles:** Participant; authorized privacy owner; Content/Media Editor sees only necessary permission outcomes.
- **States/transitions:** Notice version published → acknowledgement recorded; optional permission granted/declined → withdrawn; attendance remains governed by its own states.
- **Data touched:** Notice/terms versions, purpose, subject where applicable, permission wording, timestamps and supporting evidence.
- **Acceptance criteria:** No unresolved bracket text reaches public notice; publicity refusal does not reject registration; account deletion and publicity withdrawal remain distinct; bystander/minor consent is not inferred from another attendee.
- **English/Arabic:** Reviewed equivalent public notices and controls; preserve language and exact accepted version.
- **Accessibility:** Separate clearly labeled choices, no precondition ambiguity, keyboard and screen-reader confirmation.
- **Security/RLS:** Participants access their own evidence; editors receive minimal publication eligibility; consent text cannot inject markup.
- **Audit/email:** Audit purpose/version/status changes without unnecessary message contents; English confirmation only when approved workflow calls for it.
- **Automated tests:** Independent consent choices, historical version preservation, withdrawal, denied cross-user reads and refusal without registration side effects.
- **Manual UAT:** Privacy/content reviewers compare both language versions and trace no-photo/removal instructions.
- **Release gate:** REL-01 notices; production collection gate PRV-01/02.
- **Owner type:** Privacy owner with full-stack/content engineers.
- **TBD blocked:** Production publication requires [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09) and media assets/policy in [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12); synthetic ledger work unblocked.

<a id="bl-sec-06"></a>

## BL-SEC-06 — Process one verified privacy request end to end

- **Source IDs:** PRV-04, AUTH-07, PRV-05, DAT-01, ROL-10, AT-17.
- **Status:** Planned.
- **Purpose:** Give people a verified access/correction/deletion or consent-withdrawal route with accountable handling.
- **Scope:** Restricted privacy-request record and operator workflow for receipt, identity verification, scoped decision, execution evidence and response; exercise a synthetic access request first.
- **Exclusions:** General support helpdesk; instant destructive account deletion; national-ID collection for verification; unrestricted participant exports.
- **Dependencies:** BL-SEC-01; BL-SEC-05; support contact route; approved request/retention handling.
- **Roles:** Requesting participant; designated privacy handler with explicitly authorized access; Super Admin for personal-data export authority.
- **States/transitions:** Received → verification pending/verified → approved, partially fulfilled or declined with reason → actions recorded → response sent; vocabulary to be finalized in feature note.
- **Data touched:** Minimal request reference, verification evidence, scoped action log, retention exceptions, protected response artifact where needed.
- **Acceptance criteria:** Unverified requester cannot obtain another person's data; justified retained data is described as restricted, not deleted; publicity and account actions can be handled independently.
- **English/Arabic:** Bilingual request instructions/status; transactional response email English, approved accessible detailed response as required.
- **Accessibility:** Keyboard-readable request status and explicit support alternative; response documents remain readable.
- **Security/RLS:** Restricted request visibility; reauthenticate sensitive operator/export actions; private expiring delivery.
- **Audit/email:** Record receipt, verification, decision, exceptions, actions and response; omit secret verification material from routine logs.
- **Automated tests:** Forged identity, cross-user access, retained-record exception, duplicate fulfillment and permission revocation.
- **Manual UAT:** Privacy owner fulfills synthetic access and correction cases, and explains a partial deletion with legitimate retention.
- **Release gate:** Before production data collection; AT-17 and REL-06.
- **Owner type:** Privacy operations owner with backend engineer.
- **TBD blocked:** Live request policy and named handler require [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09); synthetic workflow unblocked.

<a id="bl-sec-07"></a>

## BL-SEC-07 — Build a retention inventory and dry-run planner

- **Source IDs:** PRV-05, PRV-06, AUTH-08, CRT-05, CRT-06, DAT-04, AT-17.
- **Status:** Planned.
- **Purpose:** Make deletion scope reviewable before any cleanup removes records.
- **Scope:** Data-class retention catalog with purpose, fields, owner, trigger, duration and exceptions; dry-run plan across database, private objects, exports, media derivatives and logs.
- **Exclusions:** Executing deletion; treating the one-year ordinary participant default as universal; inventing certificate verification lifespan or financial retention.
- **Dependencies:** BL-SEC-01; approved privacy retention decisions; domain record inventories; conference-end configuration.
- **Roles:** Privacy owner; technical operator; domain custodian; Super Admin for restricted review.
- **States/transitions:** Candidate records → retention eligible/exception restricted/unresolved blocked; dry run changes no participant data.
- **Data touched:** Retention policy versions, minimal candidate references, approved exceptions, backup-expiry inventory.
- **Acceptance criteria:** Ordinary participant one-year default remains labeled; unverified seven-day cleanup respects obligations; each exception has approved fields/purpose/duration/owner; no missing date is guessed.
- **English/Arabic:** Bilingual operator explanations; policy identifiers stable across locales.
- **Accessibility:** Candidate tables have headings and meaningful status text, not color-only classifications.
- **Security/RLS:** Candidate reports are restricted and minimize personal data; no public export path.
- **Audit/email:** Audit policy approval and dry-run invocation/results; approved operational alert only, no automatic deletion email assumed.
- **Automated tests:** Boundary dates, missing end date, legal hold/exception, object references and unverified account with required records.
- **Manual UAT:** Privacy/domain owners reconcile sample candidates with each approved policy.
- **Release gate:** Catalog approved before collection; dry-run evidence before BL-SEC-08 activation.
- **Owner type:** Privacy owner and data engineer.
- **TBD blocked:** Catalog schema/fixtures unblocked; live decisions require [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).

<a id="bl-sec-08"></a>

## BL-SEC-08 — Execute approved cleanup with restore suppression evidence

- **Source IDs:** PRV-06, DAT-04, API-03, INF-06, AT-17.
- **Status:** Planned.
- **Purpose:** Apply approved retention without silently recreating deleted or revoked data during recovery.
- **Scope:** One cleanup class initially: approved ordinary participant records and associated permitted private objects; durable retry, restriction/anonymization where required, and minimal deletion/revocation replay records.
- **Exclusions:** Unconditional cascade deletion; deleting records under exceptions; claiming immediate purge from immutable backups; a new indefinite retention exception for cleanup evidence.
- **Dependencies:** BL-SEC-07; BL-DEP-04; approved minimal suppression-record fields/access/lifetime; durable jobs.
- **Roles:** Authorized cleanup service; privacy owner; recovery operator under restricted access.
- **States/transitions:** Approved candidate → queued → restricted/anonymized/deleted or retryable failure; restore remains isolated until suppression/revocation reconciliation completes.
- **Data touched:** Selected records/objects, minimal job outcomes and approved replay evidence; backup expiry records.
- **Acceptance criteria:** Retry does not double-act or break retained financial/scientific links; partial object failure is visible; restored deleted data cannot return to normal processing; retained aggregates are non-identifying.
- **English/Arabic:** Bilingual restricted operator results; participant-facing request outcomes follow BL-SEC-06.
- **Accessibility:** Progress, failures and replay actions are textually labeled and keyboard operable.
- **Security/RLS:** Narrow job grants, no unrestricted client deletion; suppression evidence restricted and itself retention-governed.
- **Audit/email:** Minimal action counts/references, never erased payload copies; failed jobs alert authorized owners by email.
- **Automated tests:** Retry/partial failure, preserved exceptions, orphan prevention, restore replay and suppression-ledger access denial.
- **Manual UAT:** Restore a synthetic backup after cleanup and verify deleted/revoked records remain unavailable.
- **Release gate:** AT-17 before cleanup activation; REL-06.
- **Owner type:** Data/backend engineer with privacy approval.
- **TBD blocked:** Synthetic work unblocked; destructive live schedule/fields require [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09), backup method [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).

<a id="bl-sec-09"></a>

## BL-SEC-09 — Record processing locations and provider approval evidence

- **Source IDs:** PRV-01, PRV-07, INF-01, INF-02, CFG-09, CFG-10.
- **Status:** Planned; managed providers selected, plans/regions unverified.
- **Purpose:** Make each external transmission and storage location reviewable before production provisioning.
- **Scope:** Versioned data-flow inventory for app, database, auth, storage, backups, email, AI if enabled, analytics if selected, payment, scanners and logs; record current official evidence and approval status.
- **Exclusions:** Assuming Saudi hosting; equating selected region or consent with legal approval; buying plans or activating integrations in this planning slice.
- **Dependencies:** Governance controller/authorization evidence; selected integration designs; [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09), [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).
- **Roles:** Technical owner, privacy owner, scientific owner for assessment; institutional approver where required.
- **States/transitions:** Proposed flow → documented assessment → approved or blocked; changes require renewed review of affected processing.
- **Data touched:** Data categories, purposes, destinations, subprocessors, transfer safeguards, approval references; no participant data.
- **Acceptance criteria:** Every proposed service maps what leaves which boundary and why; unclear regions/terms stay unresolved; selected Vercel/Supabase choices remain confirmed rather than reopened by default.
- **English/Arabic:** Public provider/transfer notice summarized in both languages after approval; internal evidence can retain original language.
- **Accessibility:** Inventory and approval evidence use structured readable tables and descriptive links.
- **Security/RLS:** Identify service credentials, minimum scopes and prohibited payload fields; document RLS-bypass implications of service roles.
- **Audit/email:** Version changes and approver evidence retained; no participant email or data transmission.
- **Automated tests:** Later configuration checks reject an enabled integration with missing required approved settings; inventory link/schema checks.
- **Manual UAT:** Privacy/technical owners trace one synthetic record across all enabled processing services.
- **Release gate:** INF-02/PRV-07 before provisioning/processing; relevant REL gate for activation.
- **Owner type:** Technical owner and privacy/governance owner.
- **TBD blocked:** Evidence-gathering unblocked; approval and provisioning blocked by the linked decisions.

<a id="bl-sec-10"></a>

## BL-SEC-10 — Rehearse incident containment and evidence handling

- **Source IDs:** SEC-06, SEC-07, ROL-12, INF-08, REL-06, AT-18.
- **Status:** Planned.
- **Purpose:** Ensure a security incident reaches an accountable owner with a tested containment path.
- **Scope:** One tabletop and synthetic exercise for a compromised staff credential: revoke grants/sessions, rotate affected credentials, preserve restricted evidence, recover and assess required notices.
- **Exclusions:** Claiming completed penetration certification; automatic legal-notification rules or invented deadlines; real destructive incident simulation.
- **Dependencies:** BL-SEC-01; BL-DEP-03; BL-DEP-05; named response/privacy coverage and approved communication route.
- **Roles:** Technical incident owner, privacy owner, infrastructure custodian, Super Admin within website scope.
- **States/transitions:** Suspected incident → triaged → contained → recovered → reviewed; notification necessity assessed by authorized owners.
- **Data touched:** Restricted incident reference, minimal evidence, grant/session/secret rotation records, corrective actions.
- **Acceptance criteria:** Old staff tokens cannot regain revoked data access; evidence access is controlled; procedure lists owner/backup and escalation channels; recovery reconciles affected writes before reopening.
- **English/Arabic:** Bilingual staff-facing incident instructions; external notices follow approved language/legal process; platform alerts remain email-only.
- **Accessibility:** Runbook is searchable readable text with clear steps; no color-only severity or inaccessible attachments.
- **Security/RLS:** Verify actual revocation at API/database/storage; preserve evidence without leaking secrets into tickets/logs.
- **Audit/email:** Timestamp containment/access/recovery actions; email named owners without sensitive payloads; participant notice only when authorized.
- **Automated tests:** Revoked-session denial, disabled integration behavior and secret/log redaction regressions.
- **Manual UAT:** Named operator and backup execute the exercise and record gaps before launch.
- **Release gate:** Minimum response runbook before every live REL gate; full handover updates it later.
- **Owner type:** Security/operations engineer with privacy owner.
- **TBD blocked:** Synthetic exercise unblocked; live coverage/notice decisions require [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).
