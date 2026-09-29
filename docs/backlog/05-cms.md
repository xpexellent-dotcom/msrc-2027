# CMS

M4 privileged authentication and authorization precede editing. The existing static preview does not expose a CMS.

<a id="bl-cms-01"></a>

## BL-CMS-01 — Add a scoped structured content draft editor
- **Source IDs:** CMS-01, ROL-09, ROL-01, SEC-02, DAT-03.
- **Status:** Planned; CMS server flag closed.
- **Purpose:** Let authorized editors maintain approved page structures without code deployments.
- **Scope:** One reusable typed content/revision model and bilingual homepage/About draft form; fixed component layouts, optimistic revision checks and assigned-content access.
- **Exclusions:** Public editor, page builder, publishing, all domain-specific forms in one PR.
- **Dependencies:** BL-AUTH-01; BL-AUTH-05; BL-FND-06; BL-SEC-01.
- **Roles:** Assigned Content/Media Editor; authorized Super Admin.
- **States/transitions:** New draft → saved draft revision; stale save rejected with recovery.
- **Data touched:** Structured public-content drafts and immutable revision metadata.
- **Acceptance criteria:** Editor sees/edits assigned content only; concurrent save cannot overwrite silently; fixed schema rejects unsupported markup/layout fields.
- **English/Arabic:** Bilingual organizer form and paired public fields; language switch preserves draft.
- **Accessibility:** Keyboard editor, labelled controls, saved/error announcements and focus recovery.
- **Security/RLS:** Server and row policies enforce edition/content assignment and MFA; draft reads denied publicly.
- **Audit/email:** Audit editor/action/target/revision; no publication or participant email on save.
- **Automated tests:** Assigned/unassigned/no-MFA writes, malformed rich text and stale revisions.
- **Manual UAT:** Two editors race a save; anonymous user probes draft URL/API.
- **Release gate:** M4; staff authentication before editing; REL-01 secured CMS.
- **Owner type:** Full-stack CMS engineer.
- **TBD blocked:** Synthetic editor no; named staff/publisher grants DR-CFG-11.

<a id="bl-cms-02"></a>

## BL-CMS-02 — Implement preview, publication, unpublication and recovery
- **Source IDs:** CMS-02, CMS-04, ADM-04, API-02, REL-01.
- **Status:** Planned.
- **Purpose:** Separate private editorial work from deliberate public publication.
- **Scope:** Authorized preview and publisher transition for structured content, revision history, recoverable deletion and public cache invalidation.
- **Exclusions:** Mandatory second approval for ordinary content, scheduled publishing, media approval bypass.
- **Dependencies:** BL-CMS-01; BL-FND-06.
- **Roles:** Assigned editor; explicitly authorized publisher.
- **States/transitions:** Draft → published → unpublished; deleted content → recovered draft; preview does not publish.
- **Data touched:** Content revision/publication pointer, deletion/recovery and audit events.
- **Acceptance criteria:** Publisher previews exact version; retry does not duplicate publication; deleted/unpublished content vanishes from public API/cache; recovery does not silently republish.
- **English/Arabic:** Publication checks translations/fallback; bilingual organizer feedback.
- **Accessibility:** Preview/banner clearly distinguishes draft; keyboard confirmation and focus restoration.
- **Security/RLS:** Authenticated scoped preview; publisher-only transitions; no-index alone never protects drafts.
- **Audit/email:** Audit actor, revision, old/new publication and reason where required; no automatic applicant emails.
- **Automated tests:** Direct draft denial, stale publish, duplicate request, unpublish/cache and recover-to-draft.
- **Manual UAT:** Editor without publish grant fails; publisher corrects a preview then publishes intended version.
- **Release gate:** REL-01 secured CMS and content approval.
- **Owner type:** CMS/backend engineer.
- **TBD blocked:** Technical transitions no; live publisher identity DR-CFG-11 and approved copy DR-CFG-12.

<a id="bl-cms-03"></a>

## BL-CMS-03 — Extend structured forms and enforce translation completeness
- **Source IDs:** CMS-01, CMS-04, LOC-01, TIM-01.
- **Status:** Planned.
- **Purpose:** Maintain remaining informational pages through consistent validated content forms.
- **Scope:** Reuse draft/publish machinery for dates/venue, announcements, FAQ, guidelines and contact details; translated fields and controlled fallback rules; domain-specific program/workshops remain their own slices.
- **Exclusions:** Arbitrary HTML pages, automatically setting business deadlines from editorial prose, silent mixed-language navigation.
- **Dependencies:** BL-CMS-01; BL-CMS-02; approved fallback rule DR-CFG-12.
- **Roles:** Assigned editor; publisher.
- **States/transitions:** Incomplete draft → translation-ready revision → eligible for publication; missing required translations block publish.
- **Data touched:** Typed editorial records, locale fields, approved fallback metadata.
- **Acceptance criteria:** Structured schema covers listed page types; operational dates remain server configuration authority; fallback is explicit and no broken language switch is emitted.
- **English/Arabic:** Bilingual editing instructions and locale previews; scientific guidance text identifies English-only input.
- **Accessibility:** Locale tabs/fields keyboard accessible; validation names missing language and field.
- **Security/RLS:** Scoped records/versions only; validated URLs/rich text; public projections exclude drafts.
- **Audit/email:** Audit edits and publication; no emails on draft changes.
- **Automated tests:** Missing translation, fallback enforcement, invalid date/link and unauthorized record update.
- **Manual UAT:** Editor publishes each supported content shape in both language previews.
- **Release gate:** REL-01 each page's approved content.
- **Owner type:** CMS engineer with bilingual editor.
- **TBD blocked:** Schema work no; fallback/copy approval DR-CFG-12; actual dates DR-CFG-01.

<a id="bl-cms-04"></a>

## BL-CMS-04 — Manage public profiles with separated private contacts
- **Source IDs:** CMS-03, SPN-01, ROL-09, MED-02, PRV-03.
- **Status:** Planned.
- **Purpose:** Let authorized staff maintain people/sponsor profiles without leaking contact records.
- **Scope:** Typed speaker/committee/sponsor profile forms, approved image reference, professional links and session/booth references; private contacts in a separate restricted record/projection.
- **Exclusions:** Speaker/sponsor login, sponsor upload portal, unapproved public roster or packages.
- **Dependencies:** BL-CMS-01; BL-CMS-02; BL-CMS-05 for approved media; domain session references.
- **Roles:** Assigned Content/Media Editor; Sponsorship/PR; publisher.
- **States/transitions:** Draft profile → approved public version; private contact update does not publish contact data.
- **Data touched:** Public biography/tier/profile, private contact record and media permissions.
- **Acceptance criteria:** Public API never selects private contact columns; scoped editor cannot read unrelated contacts; only cleared image and approved profile reach publication.
- **English/Arabic:** Translated biography/descriptions with accurate original names; organizer forms bilingual.
- **Accessibility:** Image alternatives and field errors required where applicable; logical focus across paired-language forms.
- **Security/RLS:** Distinct contact/profile policies; no broad join exposing contacts through public views.
- **Audit/email:** Audit profile/contact changes and publication; prospectus delivery remains explicit organizer email.
- **Automated tests:** Public/private projection, role/assignment denial and unapproved-image publish rejection.
- **Manual UAT:** PR and editor test each other's restricted scope and preview public fields.
- **Release gate:** REL-01 approved profiles/media and privacy policy.
- **Owner type:** Full-stack CMS engineer.
- **TBD blocked:** Synthetic work no; approved current profiles/packages DR-CFG-12 and contact retention DR-CFG-09.

<a id="bl-cms-05"></a>

## BL-CMS-05 — Gate media approval and consent withdrawal
- **Source IDs:** MED-01, MED-02, MED-03, PRV-08, CMS-02, ADM-04.
- **Status:** Planned; asset slots documented, no clearance assumed.
- **Purpose:** Publish only assets with valid permission and provide a workable removal process.
- **Scope:** Media rights/consent evidence record, explicit approval action, publication eligibility and withdrawal/unpublication/cache invalidation; no-photo/removal procedure.
- **Exclusions:** Assuming registration covers bystanders/minors; forcing publicity consent for paid attendance; promising deletion of third-party copies.
- **Dependencies:** BL-AUTH-01; BL-SEC-01; approved media/minor policy DR-CFG-09/12.
- **Roles:** Media editor; authorized media approver; privacy/removal operator.
- **States/transitions:** Rights unverified → evidence reviewed → explicitly approved → published; withdrawal/removal approval → controlled publication revoked.
- **Data touched:** Asset rights, permission wording/version/purpose/evidence, subject/group grant/withdrawal and publication record.
- **Acceptance criteria:** Missing/withdrawn permission blocks publication; nonregistrant and minor policy accounted for; optional refusal leaves attendance entitlement untouched.
- **English/Arabic:** Permission/removal instructions and organizer UI bilingual; evidence retains original language.
- **Accessibility:** Accessible consent choice, removal request route and text status; no checkbox preselection disguises consent.
- **Security/RLS:** Restricted evidence, scoped approval permission; ordinary editor cannot approve own media unless explicitly granted that role.
- **Audit/email:** Audit approval/withdrawal/removal; send English operational removal response only under verified process.
- **Automated tests:** Missing/withdrawn rights denial, cache revocation and consent refusal without attendance effect.
- **Manual UAT:** Rights owner walks through identifiable bystander, minor-policy gate and removal request.
- **Release gate:** REL-01 before media publication; CFG-09/12.
- **Owner type:** CMS engineer with privacy/media rights owner.
- **TBD blocked:** Production permission/minors/removal policy yes — DR-CFG-09/12; synthetic state machine no.

<a id="bl-cms-06"></a>

## BL-CMS-06 — Add authorized direct media intake and quarantine
- **Source IDs:** MED-01, MED-04, SEC-03, SEC-05, API-03.
- **Status:** Planned.
- **Purpose:** Let organizers submit media for validation without exposing originals or unsafe uploads.
- **Scope:** Reuse shared private-upload security for authorized media-purpose intake, generated storage names, quarantine, content-signature/size checks and scan/remediation states; hand cleared objects to later processing.
- **Exclusions:** Derivative encoding, album/public delivery (BL-CMS-08), third-party embeds, arbitrary archives, public originals and unlimited uploads.
- **Dependencies:** BL-CMS-05; shared private-upload security; BL-FND-04; DR-CFG-10/12 technical limits.
- **Roles:** Assigned media editor; processing worker; anonymous reader of approved derivative.
- **States/transitions:** Uploaded/quarantined → scan-cleared and eligible for processing; failed scan stays private with remediation; clearance alone never publishes.
- **Data touched:** Private original object, intake/scan metadata and rights references.
- **Acceptance criteria:** Default gallery formats JPEG/PNG/WebP/MP4/WebM accepted only within approved limits; failed scanning cannot publish; retry does not duplicate original or bypass quarantine; secure-upload core is reused rather than reimplemented.
- **English/Arabic:** Album labels/alternatives and errors bilingual; locale does not change asset authorization.
- **Accessibility:** Labelled file control, keyboard retry/remove, announced progress/failure and purpose/limit explanation.
- **Security/RLS:** Bucket policies enforce purpose/assignment; signed original access expires and is authorized per request.
- **Audit/email:** Audit upload/approval/private access as required; processing failures visible to editor, no mass email.
- **Automated tests:** Spoofed MIME/extension, oversize, denied object access, scan failure, duplicate finalization and clearance-without-publication denial.
- **Manual UAT:** Upload allowed synthetic formats, interrupt upload/scan, recover and inspect private-origin protection.
- **Release gate:** REL-01 media/security/performance; provider/limits approved before live uploads.
- **Owner type:** Storage/media engineer.
- **TBD blocked:** Synthetic pipeline no; codecs/sizes/durations/storage budget/scanner DR-CFG-10/12.

<a id="bl-cms-07"></a>

## BL-CMS-07 — Implement the restricted sponsorship inquiry workflow
- **Source IDs:** SPN-02, SUP-03, ROL-09, EML-03, PRV-03.
- **Status:** Planned.
- **Purpose:** Give PR a trackable sponsorship queue while general support remains email-only.
- **Scope:** Validated company/contact/email/interest/message form with optional phone/job title; restricted persisted inquiry, owner assignment and new/assigned/contacted/closed status management.
- **Exclusions:** General helpdesk, consumer-email-domain blocking, sponsor accounts/uploads, unrestricted contact exports.
- **Dependencies:** BL-FND-05; BL-AUTH-01; BL-SEC-01; DR-CFG-09/10.
- **Roles:** Prospective sponsor; assigned Sponsorship/PR staff.
- **States/transitions:** New inquiry → assigned → contacted → closed; authorized reassignment preserves history.
- **Data touched:** Sponsor inquiry, contact, assigned owner, status and notification metadata.
- **Acceptance criteria:** Submission persists before acknowledging queued email; retry creates no duplicate acknowledgment; only assigned/authorized PR can inspect or change inquiry; optional fields remain optional.
- **English/Arabic:** Bilingual public form and PR UI; receipt/follow-up transactional templates English-only.
- **Accessibility:** Labelled fields, error summary, keyboard status/assignment controls and preserved failed input.
- **Security/RLS:** Server validation/spam limits; inquiry rows restricted by authorized PR scope; no public listing.
- **Audit/email:** Audit assignment/status changes; email designated team and acknowledge receipt using approved sender; no hidden bulk mail.
- **Automated tests:** Duplicate submission, optional fields, role/owner denial, header injection and email failure recovery.
- **Manual UAT:** Test sponsor submission, PR assignment/follow-up/closure and unrelated staff denial with synthetic contacts.
- **Release gate:** REL-01 plus privacy/sender readiness before live inquiry collection.
- **Owner type:** Full-stack engineer with PR owner.
- **TBD blocked:** Synthetic workflow no; live retention/recipients/sender DR-CFG-09/10/11.

<a id="bl-cms-08"></a>

## BL-CMS-08 — Process cleared media into approved gallery derivatives
- **Source IDs:** MED-01, MED-03, MED-04, DSN-01, API-03, NFR-02.
- **Status:** Planned.
- **Purpose:** Deliver responsive images/video while retaining private originals and explicit publication permission.
- **Scope:** Durable derivative/thumbnail generation from cleared intake, edition/activity album metadata, configured video encoding/poster profiles and approved public derivative projection with cache invalidation.
- **Exclusions:** Rebuilding upload security, third-party embeds, public original access/download buttons, claims displayed media cannot be copied.
- **Dependencies:** BL-CMS-06; BL-CMS-05; BL-FND-04; approved encode/size/duration/budget profile DR-CFG-10/12.
- **Roles:** Restricted processing worker; assigned media editor; explicit media approver; public derivative reader.
- **States/transitions:** Cleared original → processing → ready private derivative; valid rights plus explicit approval → published derivative; withdrawal → public delivery revoked.
- **Data touched:** Derivative objects, poster/thumbnail, album category/edition, processing metadata and approved-publication reference.
- **Acceptance criteria:** Retry produces one effective derivative set; failed processing leaves original private and editor informed; only rights-valid approved output is public; removed assets invalidate controlled delivery caches; configured output fits measured mobile budget.
- **English/Arabic:** Bilingual album labels, alternatives and processing/status administration; RTL does not change media authorization.
- **Accessibility:** Appropriate image alternatives, video captions where needed, poster/pause/reduced-motion fallback and keyboard gallery navigation.
- **Security/RLS:** Worker may read only authorized cleared sources; public reads only approved derivative projection; guessed original/object IDs remain denied.
- **Audit/email:** Audit approval/removal and authorized replay; editor processing alert through English operational email if configured, never bulk public messages.
- **Automated tests:** Worker retry/failure, uncleared input rejection, unpublished/withdrawn delivery denial, cache revocation and derivative metadata privacy.
- **Manual UAT:** Process synthetic bright/dark footage/images, inspect both language/mobile views and revoke a published asset.
- **Release gate:** REL-01 media approval, security and measured performance before public delivery.
- **Owner type:** Media/storage engineer with accessibility and rights reviewers.
- **TBD blocked:** Synthetic processing no; actual codec/limits/storage-delivery budget and rights DR-CFG-10/12.
