# Public site

All pages are browseable without login. Publish approved information only; a preview is not public launch approval.

Current implementation and deployment evidence is in the [1 October 2026 checklist audit](../reviews/checklist-audit-2026-10-01.md); the full public sitemap is still incomplete.

<a id="bl-pub-01"></a>

## BL-PUB-01 — Preserve homepage and bilingual About preview evidence
- **Source IDs:** SCP-01, SCP-02, DSN-01, LOC-01, ACC-01, CFG-12.
- **Status:** Preview implemented, merged and deployed at 9e018ae — fresh English/Arabic Home and About HTTP checks returned 200; approved final bilingual copy remains outstanding.
- **Purpose:** Introduce the conference honestly before operational workflows open.
- **Scope:** Existing hero, introduction, participation pathways, program preview, previous-edition context and source-derived About content; obtain copy approval and apply only approved corrections.
- **Exclusions:** Invented dates, sponsors, roster names, capacity, active registration or cleared-media claims.
- **Dependencies:** BL-DSN-01; [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12).
- **Roles:** Anonymous visitor; content approver.
- **States/transitions:** Draft/local preview → approved public copy; operations remain independently closed.
- **Data touched:** Static bilingual content and media-slot references; no participant data.
- **Acceptance criteria:** Approved EN/AR copy preserves host/conference identity and distinguishes audience from eligibility; no unknown value becomes a public fact; About remains linked from header/footer/home.
- **English/Arabic:** Equivalent approved meaning, Arabic RTL and locale-preserving navigation.
- **Accessibility:** Existing keyboard, narrow-screen, zoom and reduced-motion checks retained; manual Arabic/screen-reader review still needed.
- **Security/RLS:** No login or database required for static content; no admin action exposed.
- **Audit/email:** Git copy history; no emails.
- **Automated tests:** Existing content, route, browser and axe checks; regression tests only for changed behavior.
- **Manual UAT:** Content owner reads both pages in both languages at desktop/mobile widths.
- **Release gate:** M3 preview achieved; REL-01 public approval remains open.
- **Owner type:** Content/UI engineer with bilingual editor.
- **TBD blocked:** Final content approval yes — DR-CFG-12; the existing deployed draft is not evidence that REL-01 is complete.

<a id="bl-pub-02"></a>

## BL-PUB-02 — Add an honest Dates and Venue page
- **Source IDs:** SCP-02, TIM-01, CFG-01, CFG-12.
- **Status:** Planned; next bounded public-content preview candidate.
- **Purpose:** Let visitors find approved timing/location without relying on historical proposals.
- **Scope:** Locale routes and typed read-only date/venue content; explicit unpublished state until approved fields exist; timezone labels and accessible venue text when supplied.
- **Exclusions:** Publishing proposed 27–28 January dates or venue options; invented transport/accessibility facilities; countdown to an unset date.
- **Dependencies:** BL-PUB-01; typed configuration; DR-CFG-01 and DR-CFG-12.
- **Roles:** Anonymous visitor; content approver.
- **States/transitions:** Unpublished details → reviewed configured details → public read-only page.
- **Data touched:** Event date/time and venue content; no location tracking.
- **Acceptance criteria:** Null values render honest forthcoming text; approved values agree with server configuration; no live registration control is enabled by content publication.
- **English/Arabic:** Bilingual venue/instructions and full RTL; dates carry Asia/Riyadh label.
- **Accessibility:** Semantic date/location text; directions never depend solely on a map/image.
- **Security/RLS:** Public query returns published fields only; no arbitrary external embed.
- **Audit/email:** Content changes audited when CMS-backed; no page-view email.
- **Automated tests:** Null, partial and approved configuration; locale links and unpublished-record denial.
- **Manual UAT:** Confirm venue wording/directions with organizer and check mobile/RTL.
- **Release gate:** REL-01 published copy approval; registration remains separately gated.
- **Owner type:** Public-site engineer with content lead.
- **TBD blocked:** Unpublished preview no; actual details DR-CFG-01/12.

<a id="bl-pub-03"></a>

## BL-PUB-03 — Render approved speakers and committee profiles
- **Source IDs:** SCP-02, CMS-03, CMS-04, ROL-09.
- **Status:** Planned.
- **Purpose:** Show approved contributors without exposing private contacts or draft rosters.
- **Scope:** Read-only Speakers and Teams/Committees/Board routes using shared approved-profile presentation, professional links and linked published sessions.
- **Exclusions:** Speaker accounts, separate international-speaker category, historical names assumed current.
- **Dependencies:** BL-CMS-04; BL-PGM-01; DR-CFG-12.
- **Roles:** Visitor; Content/Media Editor.
- **States/transitions:** Published profile appears; unpublished/recovered draft stays hidden.
- **Data touched:** Public profile projections and session references; private contacts excluded.
- **Acceptance criteria:** Empty rosters show honest content status; public responses contain no private-contact fields; draft linked sessions never leak.
- **English/Arabic:** Approved translations or explicit controlled fallback; proper names preserve correct spelling.
- **Accessibility:** Logical headings, useful image alternatives, descriptive professional links.
- **Security/RLS:** Public reads restricted to published projections even through direct API.
- **Audit/email:** CMS audit only; browsing creates no email.
- **Automated tests:** Draft/private-field exclusion, unavailable session, locale and empty-roster rendering.
- **Manual UAT:** Profile owner/content reviewer confirms biography, image rights and both layouts.
- **Release gate:** REL-01 profile/content/media approval.
- **Owner type:** UI/content engineer.
- **TBD blocked:** Synthetic layout no; names, permissions and translations DR-CFG-12.

<a id="bl-pub-04"></a>

## BL-PUB-04 — Publish versioned participation guidance and FAQ
- **Source IDs:** SCP-02, REG-08, ABS-01, ABS-08, TRK-01, CMS-04.
- **Status:** Planned.
- **Purpose:** Explain each independent participation pathway and its current availability.
- **Scope:** Guidelines and FAQ routes with approved source-linked rules, scientific English-content guidance and per-pathway unavailable states.
- **Exclusions:** Submission forms, invented fees/prizes/eligibility or automatic inheritance of abstract rules by competitions.
- **Dependencies:** BL-CMS-01; domain-approved rules and relevant DR-CFG decisions.
- **Roles:** Public visitor; prospective participant; content/scientific leads.
- **States/transitions:** Draft guidance → approved published version; changes preserve version/approval evidence.
- **Data touched:** Bilingual public guidance and rule-version references.
- **Acceptance criteria:** Research may precede paid attendance; ongoing work allowed; supervisor required only for selected research winners; hackathon/3MT rules separately labelled; closed actions remain closed.
- **English/Arabic:** Instructions bilingual; examples/scientific input requirements English/LTR.
- **Accessibility:** Semantic question headings and visible answers or keyboard-operable disclosure controls; readable rule lists.
- **Security/RLS:** No unpublished eligibility/rubric data returned; public content cannot open backend gates.
- **Audit/email:** Content publication audit; no notification unless a separately approved event requires one.
- **Automated tests:** Rule-content regressions, missing translations and closed-action link tests.
- **Manual UAT:** Each domain lead validates its guidance before opening its stage.
- **Release gate:** REL-01 and corresponding REL-02/03/04 published terms gate.
- **Owner type:** Content engineer with domain leads.
- **TBD blocked:** Layout no; live guidance depends on DR-CFG-02/03/05/06/07/12 as applicable.

<a id="bl-pub-05"></a>

## BL-PUB-05 — Add announcements and complete honest public navigation
- **Source IDs:** SCP-02, SCP-05, CMS-01, CMS-04, LOC-01.
- **Status:** Partial — typed 15-page sitemap exists; most routes remain unpublished.
- **Purpose:** Make approved updates discoverable without dead links or invented filler pages.
- **Scope:** Announcement index/detail for published records and route-availability wiring for the full required sitemap; link only implemented routes or explicit unavailable states.
- **Exclusions:** Full-site search, announcement email campaigns, hidden admin links, fabricated dates/content.
- **Dependencies:** BL-CMS-01; BL-CMS-02; existing typed navigation.
- **Roles:** Anonymous visitor; content publisher.
- **States/transitions:** Draft announcement → publication → unpublication; route availability follows implemented/approved content.
- **Data touched:** Announcement public projection, locale slugs and navigation availability.
- **Acceptance criteria:** All 15 required destinations remain represented; unknown/unpublished detail URLs return safe not-found; switching language preserves available context.
- **English/Arabic:** Both index/detail and navigation translated with controlled fallback policy.
- **Accessibility:** Heading/date semantics, keyboard navigation and mobile-menu focus remain correct.
- **Security/RLS:** Public direct reads exclude drafts/deleted revisions; unpublication removes public cached copy.
- **Audit/email:** Publisher action audit; no automatic bulk email from editing content.
- **Automated tests:** Published/draft/not-found, locale mapping and sitemap completeness checks.
- **Manual UAT:** Follow every available navigation item on mobile and desktop in both languages.
- **Release gate:** REL-01 content approval.
- **Owner type:** Public-site engineer.
- **TBD blocked:** Technical slice no; final announcement copy DR-CFG-12.

<a id="bl-pub-06"></a>

## BL-PUB-06 — Implement categorized email-only Contact support
- **Source IDs:** SUP-01, SUP-02, SUP-03, EML-01, EML-04, PRV-03, ACC-01.
- **Status:** Planned; live delivery closed.
- **Purpose:** Route visitor questions to the approved main inbox without creating a helpdesk product.
- **Scope:** Category/name/email/related-reference/message form, server validation, accessible anti-spam, fixed tested category recipients and validated Reply-To through the email outbox.
- **Exclusions:** Arbitrary recipient input, general inquiry ticket/status database, confidential manuscript echo, phone messaging.
- **Dependencies:** BL-FND-05; BL-SEC-01; approved recipient/sender configuration DR-CFG-10/11.
- **Roles:** Visitor; authorized shared-inbox personnel.
- **States/transitions:** Validated inquiry → queued delivery → delivery/failure handling; success text reports queue acceptance accurately.
- **Data touched:** Minimum transient inquiry/job data under approved retention; no general helpdesk record.
- **Acceptance criteria:** Exact SUP-01 category routes are configuration-verified; malicious headers/recipient injection denied; shared inbox labels are not presented as committee access controls; consumer email domains accepted.
- **English/Arabic:** Bilingual form/errors/status; outgoing operational emails English-only, preserving original user message.
- **Accessibility:** Label/error association, keyboard anti-bot alternative, status announcement and input preservation.
- **Security/RLS:** Rate limits, CSRF where applicable, output/header validation and minimal staff access to jobs.
- **Audit/email:** Restricted delivery metadata without sensitive message in ordinary logs; test adapter until sender approved.
- **Automated tests:** Category allowlist, injection/spam, retry/deduplication and unavailable-provider outcomes.
- **Manual UAT:** Send allowlisted tests to every approved category and confirm inbox routing/access.
- **Release gate:** REL-01 contact route plus privacy/email setup before public collection.
- **Owner type:** Full-stack engineer with support owner.
- **TBD blocked:** Console implementation no; live sender, routing tests and retention DR-CFG-09/10/11.

<a id="bl-pub-07"></a>

## BL-PUB-07 — Show approved sponsors and sponsorship information
- **Source IDs:** SCP-02, SPN-01, SPN-02, ROL-09, MED-02.
- **Status:** Planned.
- **Purpose:** Explain approved sponsorship opportunities without inventing partners or providing sponsor accounts.
- **Scope:** Public approved sponsor/tier/description/booth projections and sponsorship inquiry entry point; empty content remains honest.
- **Exclusions:** Old sponsors presented as current; sponsor portal/uploads; assuming prospectus is a public download.
- **Dependencies:** BL-CMS-04; BL-CMS-07; DR-CFG-12.
- **Roles:** Visitor; prospective sponsor; Sponsorship/PR.
- **States/transitions:** Approved sponsor profile appears; withdrawal/unpublication removes it; inquiry follows its separate workflow.
- **Data touched:** Public sponsor content/media; private inquiry/contact data excluded.
- **Acceptance criteria:** Only approved logos/packages shown; prospectus remains organizer-sent email unless separately approved; no empty decorative sponsor grid invents affiliation.
- **English/Arabic:** Bilingual sponsor description/navigation; names retain approved form.
- **Accessibility:** Logo alternatives, descriptive links and responsive hierarchy; no color-only tier distinction.
- **Security/RLS:** Direct public query cannot return sponsor contacts or inquiries.
- **Audit/email:** Profile publication audit; inquiry email handled only by BL-CMS-07.
- **Automated tests:** Draft/contact exclusion, missing sponsor state and inquiry route availability.
- **Manual UAT:** PR verifies agreement, approved artwork and displayed tier/booth claims.
- **Release gate:** REL-01 sponsor/media approval.
- **Owner type:** Public-site engineer with PR lead.
- **TBD blocked:** Synthetic page no; approved current sponsors/packages DR-CFG-12.

<a id="bl-pub-08"></a>

## BL-PUB-08 — Render approved Privacy and Terms versions
- **Source IDs:** SCP-02, PRV-01, PRV-02, PRV-08, PAY-08, MED-02.
- **Status:** Planned; legal/controller text not approved.
- **Purpose:** Let people read applicable notices before providing data or buying participation.
- **Scope:** Read-only versioned bilingual Privacy/Terms routes, approved contact route and photography notice; expose version identifier for later consent records.
- **Exclusions:** Inventing legal bases/controller/retention obligations, legal certification or default publicity consent.
- **Dependencies:** BL-SEC privacy-policy issues; DR-CFG-09; payment terms DR-CFG-02; BL-CMS-02.
- **Roles:** Visitor; privacy owner; authorized publisher.
- **States/transitions:** Draft legal text → approved effective version → superseded retained version.
- **Data touched:** Notice/terms versions and publication evidence; no consent collection in this slice.
- **Acceptance criteria:** No placeholder policy permits live collection; necessary processing and optional publicity/announcements distinguished; approved seller/refund terms included before taking money.
- **English/Arabic:** Approved equivalents in both languages; no machine translation treated as legal approval.
- **Accessibility:** Headings, anchors and readable plain text; mobile/zoom and long Arabic paragraphs checked.
- **Security/RLS:** Only approved public policy versions exposed; edits restricted and audited.
- **Audit/email:** Publication/version changes audited; downstream re-consent/notification only under approved policy.
- **Automated tests:** Required version/contact fields, draft denial and language routing.
- **Manual UAT:** Privacy/finance owners verify actual processing/collection behavior matches notices.
- **Release gate:** REL-01 public legal/contact gate and before production collection/payment.
- **Owner type:** Content engineer with institutional privacy/legal owner.
- **TBD blocked:** Final copy yes — DR-CFG-09/02; layout and unpublished state unblocked.

<a id="bl-pub-09"></a>

## BL-PUB-09 — Render consented galleries and a closed post-event archive
- **Source IDs:** SCP-02, ARC-01, ARC-02, MED-01, MED-03, MED-04, PRV-08.
- **Status:** Planned; no historical footage cleared for this site.
- **Purpose:** Preserve approved conference history while closing participation and protecting private records.
- **Scope:** Public gallery/past-edition read model by edition/activity and explicit archived edition state; approved summaries/statistics/winners only; retain private certificate access separately.
- **Exclusions:** Public abstracts, attendee directory, photo-download button, copying accounts/consent automatically to next edition.
- **Dependencies:** BL-CMS-05; BL-CMS-08; approved archive/continuity contract; DR-CFG-09/12. Archive implementation precedes the final handover rehearsal.
- **Roles:** Visitor; content/media editor; archive custodian.
- **States/transitions:** Approved media/public summary → published archive; withdrawn media → unpublished; archived edition closes actions while permitted verification remains.
- **Data touched:** Public derivatives/album metadata, approved aggregate summaries and edition routing.
- **Acceptance criteria:** Unapproved/withdrawn originals never served; operational actions close after configured archive transition; public history does not imply indefinite private retention or uncopyable images.
- **English/Arabic:** Bilingual album labels/summary and full RTL; approved scientific titles remain English where applicable.
- **Accessibility:** Descriptive image alternatives, keyboard gallery controls and reduced-motion/media fallbacks.
- **Security/RLS:** Private originals and past operational records remain protected; cache invalidation follows withdrawal.
- **Audit/email:** Audit archive/publication/removal actions; no routine visitor email.
- **Automated tests:** Withdrawn asset denial, archive action closure, separate-edition access and retained verification route behavior.
- **Manual UAT:** Rights owner reviews each published set; next-year operator follows historical links without private access.
- **Release gate:** REL-01 for gallery; REL-05, approved retention/continuity and BL-HND-04 acceptance before post-event handover is complete.
- **Owner type:** Public-site engineer with archive/content custodian.
- **TBD blocked:** Synthetic layout no; rights, summaries, continuity and retention DR-CFG-09/11/12.
