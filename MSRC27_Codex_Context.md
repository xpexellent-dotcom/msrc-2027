# MSRC 2027: consolidated Codex context

Version 1.0 | 29 September 2026 | Asia/Riyadh

This single-file context contains the current working handoff and the full readable technical, hackathon and original-brand-text source snapshots. Use the ZIP for the original PDFs, separate editable documents, and previous starter pack. It is not a transcript of every historical chat and does not establish completed code or infrastructure.

For a local Codex project, extract the ZIP and use its root AGENTS.md and prompts/01_START_FOUNDATION.md. This consolidated copy is a portable context snapshot; after development begins, maintain the separate repository documents as the current working record.

Relative links below are expressed as package locations so this file can be uploaded alone.


---

# Included file: README.md

# MSRC 2027: start here

**Development handoff v1.0 | Prepared 29 September 2026 | Event timezone: Asia/Riyadh**

This folder gives Codex the current MSRC website requirements, design direction, source documents, unresolved decisions, and a practical sequence for starting development. It is a documentation handoff. No website code, database, hosting account, payment integration, repository, or deployment was created in this task.

## What to do now

1. Keep your existing ChatGPT project for conference planning and feedback.
2. Download and extract `MSRC27_Codex_Handoff.zip`.
3. Open the extracted `MSRC27_Codex_Handoff` folder as a local project in Codex. It can become the initial project folder, or the handoff documents can be merged into an existing website repository. Preserve any existing code and merge existing `AGENTS.md` instructions carefully.
4. Open prompts/01_START_FOUNDATION.md (package file: prompts/01_START_FOUNDATION.md), copy its prompt, and send it to Codex. It instructs Codex to read the handoff, inspect the actual environment, and build the local foundation with synthetic content and closed operational features.
5. Review the working local result. Use prompts/02_DESIGN_AND_HOMEPAGE.md (package file: prompts/02_DESIGN_AND_HOMEPAGE.md) for the next milestone.
6. Establish the organizational GitHub repository and save the code plus current documentation there. Repository creation and access setup are separate actions that have not been performed by this handoff.

For a chat that accepts attachments but does not open local folders, attach `MSRC27_Codex_Context.md` as a consolidated reference and keep the complete ZIP available. A text upload provides context; it does not itself connect a repository or provision hosting. Keep the original PDFs available for visual review.

## Read in this order

| File | Purpose |
|---|---|
| AGENTS.md (package file: AGENTS.md) | Short persistent instructions for development |
| docs/PROJECT_BRIEF.md (package file: docs/PROJECT_BRIEF.md) | What MSRC is building and its boundaries |
| docs/DECISIONS.md (package file: docs/DECISIONS.md) | Confirmed choices, conflicts, and remaining configuration |
| docs/REQUIREMENTS.md (package file: docs/REQUIREMENTS.md) | Detailed product behavior with source requirement IDs |
| docs/DESIGN_GUIDE.md (package file: docs/DESIGN_GUIDE.md) | Working brand and interaction system |
| docs/ARCHITECTURE.md (package file: docs/ARCHITECTURE.md) | Selected providers and recommended implementation structure |
| docs/ROADMAP.md (package file: docs/ROADMAP.md) | Milestones, releases, and the next development tasks |
| docs/PROGRESS.md (package file: docs/PROGRESS.md) | Evidence-based current status and session handover |
| docs/ACCEPTANCE_AND_RELEASE.md (package file: docs/ACCEPTANCE_AND_RELEASE.md) | Required verification and release gates |
| docs/OWNERSHIP_AND_SETUP.md (package file: docs/OWNERSHIP_AND_SETUP.md) | Accounts, custodians, environments, and setup checklist |
| docs/MEDIA_REGISTER.md (package file: docs/MEDIA_REGISTER.md) | Media location, selection, and publication requirements |
| docs/SOURCE_REGISTER.md (package file: docs/SOURCE_REGISTER.md) | What was reviewed and how conflicts were resolved |
| docs/CONFERENCE_BACKGROUND.md (package file: docs/CONFERENCE_BACKGROUND.md) | Page-referenced conference context from the Main File |

## What changed from the previous starter pack

- The latest live Development Specification v0.5 and updated Hackathon Draft are included as readable source snapshots.
- Confirmed provider and operating choices are distinguished from proposed framework choices, design defaults, and incomplete implementation.
- Existing playbook, prompts, and tracker are preserved as historical reference, with a shorter starting workflow above them.
- Event date/venue proposals, leadership differences, national-ID collection, WhatsApp use, and solo finalist accounting are explicitly tracked.
- Each milestone begins with an honest status. Blank tracking tables do not establish completed work.
- Full original Main File and generated brand-guide PDFs are included. The original Canva brand sheet is linked with a text snapshot that corroborates its palette and English fonts. Raw conference media is linked, not bundled.

## Source authority

The latest explicit organizer decisions govern. For this dated handoff, the live Development Specification v0.5 is the product baseline. Its defaults and TBD labels remain intact. The updated Hackathon Draft informs its competition rules, with source conflicts retained. The older conference PDF supplies background and proposals. The generated brand guide and starter pack supply working design and engineering recommendations.

These files are snapshots of the reviewed sources, not a live synchronization with Google Docs. If a source changes later, reconcile it into the current docs and record the change before using new behavior. Source coverage and gaps are listed in SOURCE_REGISTER (package file: docs/SOURCE_REGISTER.md).

## Working rhythm

Use one task per development chat: state the milestone or requirement IDs, implement a complete scoped change, inspect the result, run relevant checks, and update `PROGRESS.md` and any changed decisions. Routine reversible implementation can proceed within the assigned task. An unresolved business rule blocks the affected live workflow, while synthetic foundation and design work can continue.

Do not use the archived prompts as an instruction to build every feature at once. Begin with the foundation, then the design system and homepage. Public informational launch and operational feature opening are separate release decisions.

## Interface references

Current official guidance reviewed for this handoff:
- [Projects and chats](https://learn.chatgpt.com/docs/projects)
- [Using ChatGPT Work and Codex](https://learn.chatgpt.com/docs/use-chatgpt)
- [Project instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

The desktop documentation supports local project folders and adding an existing ChatGPT chat to a Codex chat. An imported chat supplements the durable documents in this folder. Check the controls available in your selected surface before assuming a complete project import.



---

# Included file: AGENTS.md

# MSRC 2027 project instructions

## Start

Read `docs/PROJECT_BRIEF.md`, `docs/DECISIONS.md`, and `docs/PROGRESS.md`. Then read the requirements and source sections relevant to the assigned task. The full product baseline is `sources/Development_Specification_v0.5.txt`; preserve its requirement IDs in issues and implementation notes.

Authority: current explicit organizer decisions > the latest reconciled product specification > this handoff's summaries > older proposal/design/playbook material. Never convert an option, example, estimate, engineering default, or TBD into an approved public claim. Log conflicts in `docs/DECISIONS.md`. `sources/previous_starter_pack/` is archived reference, not the current task list.

## Current starting state

This package contains documentation, source snapshots, and prompts. It does not establish that application code or infrastructure already exists. Inspect the repository and environment first, preserve user work, and report what actually exists. Use synthetic records for development. Start with the assigned milestone; do not implement all operational modules in one pass.

## Product rules

- Managed Vercel and managed Supabase are selected. Next.js App Router, TypeScript, Tailwind, and pnpm are recommended foundation choices, pending a recorded implementation decision. Verify supported runtime/package versions and current official APIs before installation; commit the resulting lockfile.
- Public browsing is open. Registration, orders, abstract submission, hackathon entries, 3MT, workshops, tickets, attendance, and certificates have distinct records and transitions.
- Public/auth/participant/non-review organizer interfaces support English and Arabic with full RTL. Scientific/project content stays English and LTR; reviewer and faculty-judge screens and transactional emails are English-only.
- Registration and workshop booking require manual approval even with a full discount. Use a mock payment adapter until the actual authorized KAU confirmation/reconciliation contract is supplied and approved.
- Research: 300 body words; ongoing work allowed; two finalized applications per PI per edition; no supervisor requirement until a research award winner is selected; confidential stage-one evidence is restricted to Super Admins.
- Hackathon: solo and preformed teams, maximum five team members, two specified tracks, no automatic team matching. Preserve unresolved solo quota and membership policies.
- Ordinary full conference certificate: both day check-ins plus general survey. No one-day certificate. Workshop certificate has its own booking/check-in/completion/survey requirements. Feedback answers must remain unlinked to participant completion evidence.
- Email-only platform communications. No national IDs, public attendee directory, public abstract search/directory, sponsor portal, personal schedule builder, full-site search, university SSO, SMS, WhatsApp integration, or push notifications.
- Advisory assessment cannot publish outcomes. It remains disabled until its provider, data handling, evaluation, and operating configuration are approved.

## Implementation

- Use the working design defaults in `docs/DESIGN_GUIDE.md` while final brand approval is pending. Keep native scrolling, reduced-motion support, accessible video controls, keyboard access, and Arabic layouts.
- Enforce authorization server-side and at the database/storage layer. Use explicit grants and RLS, assignment/ownership checks, private files, and individually identified privileged users with MFA. Never use user-editable metadata for authorization.
- Keep secrets server-side and out of documents, source control, logs, public environment variables, and client bundles.
- Validate mutations on the server. Use immutable submission/decision snapshots, transactional scarce-seat allocation, idempotency, audit records, and durable jobs where required.
- Keep operational workflows closed until their specific release gates pass. Do not invent dates, prices, capacities, review weights, payment callbacks, integration support, prizes, certificates, or legal approvals.
- Follow current official documentation and installed CLI help for version-sensitive commands. Archived setup commands are examples to recheck.

## Finish each task

Run checks proportionate to the change and required release gate. For functional/security changes include meaningful permission, failure, concurrency, and regression coverage. For reversible copy/style changes use targeted visual and content verification. Record commands and observed results; mark unrun checks as NOT TESTED or BLOCKED. Never call a mock payment or synthetic-data demo production-ready.

Update `docs/PROGRESS.md`, changed decisions, and relevant feature notes. Report the result, evidence, remaining blockers, and next task in plain language. Do not provision paid production resources, change DNS, open live workflows, or send real participant communications unless the current task authorizes those actions. Do not add repetitive permission gates to routine reversible implementation.



---

# Included file: docs/PROJECT_BRIEF.md

# Project brief

**MSRC 2027 | Handoff v1.0 | 29 September 2026**

## Purpose

Build the website and conference operations platform for the fifth Medical Students Research Conference at King Abdulaziz University, Jeddah. It should introduce the conference clearly, make approved participation paths easy to use, and give organizers reliable tools for scientific review and event operations. [S1 SCP-01 to SCP-07; S3]

Akram Awan is the project requester and has identified his role in conversation as conference co-leader and scientific committee leader. That is project context, not a verified public committee roster. The Main File's leadership chart differs and must be reconciled before publishing people or titles. [S6; S3 p14]

## Current facts and their status

| Item | Baseline | Status |
|---|---|---|
| Edition | Fifth MSRC, 2027, KAU, Jeddah | Conference context |
| Domain | `msrc2027.com` | Purchase reported by user; current DNS, renewal, and account control not inspected |
| Event length | Two-day conference | Product baseline |
| Date and venue | Main File proposes 27-28 January 2027 and two venue options | Final dates/venue remain CFG-01; do not publish as confirmed |
| Ownership | MSRC/RPClub organizational accounts with institutional authorization, O1 | Selected model; custodians/authorization evidence pending |
| Hosting and data | Managed Vercel plus managed Supabase | Selected; actual projects/plans/regions/access not verified |
| Payments | Authorized KAU arrangement, P1 | Selected route; actual interface and finance rules pending |
| Main product reference | Development Specification v0.5 | Current live source reviewed on 29 September 2026 |
| Build status | Documentation handoff prepared | Application/infrastructure implementation not established by sources |

## Audiences and outcomes

- Visitors can understand the event, browse program/workshop information, discover speakers/sponsors, and find participation rules without signing in.
- Participants can use one verified account while tracking separate attendance registration, payments, submissions, competitions, workshop bookings, tickets, and certificates.
- Scientific staff can validate, assign, review, request revisions, publish decisions, allocate presentations, and administer judging with confidentiality.
- Operations staff can approve admission, manage capacity/waitlists, reconcile payments, scan valid tickets, record activity evidence, and release certificates.
- Editors and PR staff can update approved public content, media, and sponsor inquiries through scoped interfaces.

## Committed product areas

1. Bilingual public conference website and structured CMS.
2. Verified participant accounts and dashboards.
3. Manually approved registration, orders, discounts, authorized KAU collection, and workshop bookings.
4. Abstract submission, blinded review, revisions, decisions, oral/poster allocation, and separate event judging.
5. Hackathon with two tracks and solo/team entries; separate postgraduate 3MT pathway.
6. QR tickets, daily and activity-specific attendance evidence, surveys, certificates, reporting, and archive.
7. Advisory assessment with separate approval and evaluation gates, plus email jobs, audit records, privacy controls, backup/recovery, and annual handover.

These remain delivery scope even when released at different times. Staging does not turn later modules into optional enhancements. [S1 SCP-07]

## Deliberate scope exclusions

Public attendee lists; public abstracts/research search; full-site search; attendee networking/messaging; sponsor self-service accounts; personal schedule building; native mobile apps; automatic team matching; university SSO; SMS/WhatsApp/push integrations. National IDs are excluded. Third-party video embeds and public gallery download buttons are excluded. Dark mode is outside committed scope. [S1 SCP-05, AUTH-06, MED-01/04, DSN-02]

Program filters, read-only My Bookings, restricted dashboard search, and single-certificate verification remain in scope and must not be removed by those exclusions.

## Experience direction

The user wants a cinematic video homepage inspired by Slush, clear information organization inspired by ESC Congress, clean transitions, natural scrolling, and responsive buttons. Exact palette, fonts, timings, and final assets are working defaults until brand approval. Use the 2026 media source only after selection and permission review. [S6; S4; S1 DSN-01/02]

## Scale assumptions

Planning estimates: 15,000+ visitors, about 1,000 attendees, 300-400 abstracts, 30-40 reviewers/judges, and 3-10 administrative accounts. They are not confirmed admission limits. Exactly three named website Super Admins are required before production. The workshop estimate of 30-100 registrations and hackathon solo finalist accounting remain unresolved. Load scenarios and service objectives are defined in the source and require measurement. [S1 SCP-06, ROL-10, NFR-01 to NFR-03]

## First deliverable to build

A reproducible local application foundation followed by a bilingual design system and homepage preview using clearly labeled synthetic content. Operational features remain closed. The initial goal is to validate structure, visual direction, responsiveness, language behavior, and the development workflow before implementing sensitive participation flows.

## References

Source IDs are defined in SOURCE_REGISTER.md (package file: docs/SOURCE_REGISTER.md). Detailed rules are in REQUIREMENTS.md (package file: docs/REQUIREMENTS.md); blockers are in DECISIONS.md (package file: docs/DECISIONS.md). This brief is a navigation layer, not a substitute for the full specification.



---

# Included file: docs/DECISIONS.md

# MSRC 2027 decision and configuration register

Snapshot: 29 September 2026. This register records source-confirmed choices, working defaults, unresolved details and publication gates. It does not certify institutional approval, provisioning, implementation or test completion.

Primary source: **S1 Development Specification v0.5**, modified 2026-09-29 11:30:21 UTC / 14:30:21 Asia/Riyadh. Current source snapshot (package file: docs/../sources/Development_Specification_v0.5.txt).

Supporting source: **S2 Hackathon Draft**, modified 2026-09-29 11:09:52 UTC / 14:09:52 Asia/Riyadh. Current source snapshot (package file: docs/../sources/Hackathon_Draft.txt).

## 1. How to interpret status

| Status | Meaning |
| --- | --- |
| SELECTED / REQUIRED | Current source carries the choice as the implementation baseline. Dependent business settings and external approvals may remain open. |
| DEFAULT | Adopted engineering starting value explicitly marked in S1, changeable by authorized documented configuration. |
| WORKING DESIGN DEFAULT | Corroborated by S8 original brand-sheet text or extended by S4/S5; usable for a draft, still requires final approval under CFG-12. |
| RECOMMENDED | Implementation suggestion, not an approved product requirement. |
| OPEN | An unresolved input, owner, approval, conflict or configuration value. Keep the affected production stage closed. |
| SOURCE PROPOSAL | A source option/example/tentative statement. Do not publish or implement it as a confirmed rule. |
| EXCLUDED | Outside current committed product scope unless the user explicitly approves a scope change. |

S1 supersedes conflicting older planning assumptions in S3/Main PDF and S5/starter. S2 Sections 2-7 support answered hackathon choices, while its questions/options remain open. If a later user decision changes a requirement, record its date, rationale if needed and affected IDs here, update the relevant documents and tests, and obtain the corresponding real-world approval evidence where required.

Named final owners and due dates are **unassigned unless explicitly recorded**. Functional owner roles below come from S1, not invented staff appointments. A planned date or instruction to secure approval is not evidence of approval.

## 2. Selected architecture and governance

| Decision | Status | Current rule | Still required | S1 IDs |
| --- | --- | --- | --- | --- |
| O1 ownership | SELECTED | MSRC/RPClub-managed organizational repository, domain and service/billing/recovery accounts with institutional authorization; delegated developer access. | Authorization evidence, continuing custodian/backup, organizational access, renewal/release/support ownership. | INF-03, CFG-11 |
| Application hosting | SELECTED | Managed Vercel. | Plan, region/data-flow assessment, organization/team access, budget, provisioning and launch evidence. No Saudi-location claim. | INF-01/02, CFG-10 |
| Database/auth/files | SELECTED | Managed Supabase PostgreSQL, managed authentication and private storage. | Plan/region/data locations, organization access, approved RLS/storage, backup and recovery setup. | INF-01/02, SEC-02, CFG-10 |
| Framework | RECOMMENDED | Next.js App Router + TypeScript + Tailwind from S5. | Foundation review of installed/current compatible versions; record architecture choice. S1 leaves framework open. | INF-01 |
| Development tooling | RECOMMENDED | pnpm, local Supabase when supported, Vitest/Playwright/appropriate database-policy tests from S5. | Verify host support/tool versions and needs. Not commitments to purchased services. | INF-04/05, REL-06 |
| P1 payments | SELECTED | Existing authorized KAU collection arrangement, isolated adapter. | Responsible unit/payee/system, real integration or approved official-report reconciliation, amounts/methods/tax/refunds/references and evidence. No webhook/API assumed. | PAY-01/04/05, CFG-02 |
| Three site Super Admins | REQUIRED | Exactly three individually named website Super Admin accounts before production. | Names, verified identity, appropriate grants/MFA/offboarding; distinct from infrastructure owners. | ROL-10/12, CFG-11 |
| Production data locations | OPEN | No exact region selected; no assumption that managed providers are Saudi-hosted. | Full database/storage/auth/app/backups/email/model/logs flows and required approvals. Synthetic development can proceed. | INF-02, PRV-07 |
| Legal controller | OPEN | O1 operational owner does not settle legal controller identity. | Controller/contact/legal bases/institutional evidence, processor/transfer/retention policy. | PRV-01/02, CFG-09 |
| Email/scanning/assessment/analytics | OPEN | Separate approved configuration needed. | Provider/data terms/evaluation/quotas/secrets/budget. Analytics has no selected provider. | INF-01, CFG-10 |

The source selects providers and intended ownership; it does not create accounts, paid plans, cloud resources, production credentials, an approved legal relationship or a functioning sender.

## 3. Confirmed product choices

| Decision | Current rule | IDs / source |
| --- | --- | --- |
| Participation pathways | Separate registration, abstracts, hackathon, 3MT and workshop states linked to one account. Co-authors are not attendees automatically. | SCP-03, REG-01/08 |
| Admission | Every registration manual approval, including full discounts. Default approve before financial completion; confirm/ticket only when both exist. | REG-02/03, PAY-03 |
| Workshop dependency | Manual approval and payment/valid discount, plus confirmed conference registration before confirming workshop. | WKS-02 |
| Email verification | Six-digit numeric code; managed email/password. No university SSO. | AUTH-01/02 |
| Privileged access | Individual accounts, authenticator-app MFA and data/API enforcement, no role assumption from interface visibility. | AUTH-04, ROL-01/12 |
| Interface language | English-default bilingual public/participant/non-review organizer UI and Arabic RTL. | LOC-01/03 |
| Scientific language | Scientific/project text English-only, LTR scientific fields in Arabic UI. Reviewer/judge assessment English-only. | LOC-02/03 |
| Email language/channel | All platform transactional messages English-only and email-only. | LOC-03, EML-01 |
| General support | Existing Gmail category routes and website form, no general helpdesk. Sponsors have restricted tracked inquiry records. | SUP-01/03, SPN-02 |
| Stage-one abstract | 300 body words, ordinary/case templates and ongoing studies, two finalized submissions/PI, stage-one applicable IRB + supplied similarity report only. | ABS-01/04/07/09 |
| Research supervisor | Required ONLY after research award winner selection, not submission, acceptance, presentation allocation or nomination. | ABS-08 |
| Review/anonymity | Assigned blinded pre-event review; event judging separate. Human scores and advisory assessment separate, committee publishes authorized outcomes. | REV-01/05/07/10, AI-01/03 |
| Original administrative evidence | IRB/similarity original downloads restricted to Super Admins under selected policy. | ROL-11 |
| C3 hackathon entries | Solo entrants compete independently and preformed teams up to five; no matching, cross-university teams; one team/person and project/team. | HAC-01 |
| Hackathon tracks | Translating research into practice; Advancing medical student research. Accepted track locked. | HAC-02 |
| Hackathon material/review | English title/pitch, 300-word pitch, optional prototype, new ideas, two independent reviewer assignments. Detailed quorum/rubric/files remain open. | HAC-04/05/06/09 |
| Hackathon event | Compulsory orientation and day-one mentoring; day-two pitch/judging/awards. All team members at finals for awards. Five-minute pitch + three-minute Q&A, closed panel. | HAC-08/09 |
| A1 attendance | One valid check-in on each conference day; no checkout/hours. Workshops add their own check-in and authorized completion sign-off. | CHK-03 |
| Full conference certificate | BOTH daily check-ins + general survey. No one-day ordinary certificate. | CRT-01/03 |
| Workshop certificate | Confirmed booking + workshop check-in + completion sign-off + workshop survey, independently of earning full conference certificate. | CRT-01 |
| S2 feedback | Participant-linked survey completion; unlinked answers with no retained identity map or correlatable log/token/metadata path. Method awaits approval/tests. | CRT-02 |
| Certificate issuance | Automatic eligibility/preparation, authorized template/signature/release batch, then automated issue/email. Role/competition evidence separate. | CRT-03/04 |
| CMS | Structured forms, fixed layout, draft/preview/publish/unpublish/recover; ordinary content can publish by authorized publisher, media requires explicit approval. | CMS-01/02 |
| CMS prerequisite | Staff identity/permissions must exist before exposing CMS editing, even if participant registration is built later. | ROL-01/09/12, CMS-01, SEC-01/02; implementation dependency |
| Media | Approved direct storage uploads/optimized derivatives, no third-party embeds. Permission and asset rights before publication. Optional publicity refusal does not invalidate attendance. | MED-01/03 |
| Archive/editions | Reuse code, keep annual operational databases/storage/config separate, no automatic account/submission/consent transfer. | ARC-01/02 |

## 4. Hackathon and source conflicts

| Conflict / ambiguity | Source evidence | Governing behavior until resolved | Who decides / dependent gate |
| --- | --- | --- | --- |
| National ID and phone | S2 5.1 requests national ID and phone in profiles. S1 AUTH-06/PRV-03 exclude ID and make phone conditional; HAC-10 and CFG-13 explicitly flag conflict. | Keep national ID excluded and phone optional/conditional. Add neither silently; any future change requires explicit purpose/access/retention approval. | Hackathon + privacy/technical owners; production hackathon profile collection. |
| WhatsApp group | S2 6.1 mentions online orientation with WhatsApp group. S1 EML-01 confirms email-only platform and HAC-10 flags discrepancy. | No WhatsApp integration/automated notifications or automatic phone sharing. Decide separately whether an optional external organizer-run group exists. | Hackathon + operations/privacy owners; participant onboarding. |
| Solo finalist quota | S2 4.3 states eight teams per track, sixteen teams total; C3 also permits solo competition. | Do not assume extra solo spaces or sixteen people. One project per solo/team consuming an entry is only S1 HAC-07 proposal, not approved. | Hackathon lead; ranking/selection publication. |
| Eligibility | S2 3.1 broad university student/intern sentence remains labelled Options, even though international eligibility and no-healthcare-member answers are clear. | Preserve answered choices, withhold final broad eligibility rule until approved. | Hackathon lead; application opening. |
| Cross-mode duplicates | One team/person and project/team does not resolve entering solo plus a team or multiple solo projects. | Implement configurable validation boundaries, keep affected application behavior gated. | Hackathon lead; application opening. |
| Member invitation timing | S2 3.4 says accounts verified on registering, member invitation acceptance after participation acceptance. | Separate roster, competition acceptance and post-acceptance confirmation. Do not block initial review awaiting later confirmation. | Timing selected in HAC-03; owner must set editing/window/locks/refusal rules. |
| Originality checking | S2 5.2 intends AI plagiarism check to ensure creativity, but lacks provider, method, standard or human process. | Declarations/manual review now; no claim that automated checking proves originality. Production tool remains approval-dependent. | Scientific/hackathon/privacy/technical owners; check activation/selection. |
| Recording | S2 7.4 says most likely recordings restricted, while backup recording is a possible demo fallback. | Tentative wording is not a final ban. No automatic recording/publication; approve fairness, privacy and media policy. | Hackathon/operations/media owners; finals. |
| Final scoring/prizes/fees/IP/certificates | S2 Sections 8-12 contain illustrative weights/options/questions. | No 25/20/20/15/10/10 rubric, judge count, prizes, fee, ownership promise or certificate rule becomes live through inference. | Functional owners in CFG-05; each dependent stage. |
| Research vs hackathon rules | Similar 300-word limits and shared software can hide track differences. | Research author/supervisor/file/rubric rules do not automatically apply to hackathon/3MT. | Track owners; relevant forms/review/awards. |

## 5. Main PDF and prior-work reconciliation

S3 is valuable conference background. Its proposals and roster drafts need confirmation before becoming current public content. See CONFERENCE_BACKGROUND.md (package file: docs/CONFERENCE_BACKGROUND.md).

| Older source detail | Current interpretation | Required action |
| --- | --- | --- |
| S3 page 15 proposes 27-28 January 2027. | SOURCE PROPOSAL. S1 SCP-01/CFG-01 still leave exact dates open. | Leadership confirms exact event dates; then configure countdown, deadlines, public copy and operational windows. Do not publish the proposed date as confirmed. |
| S3 page 15 lists King Faisal Conference Center / University Hospital theater as venue options. | SOURCE OPTIONS. S1 leaves venue/rooms/capacities open. | Confirm one approved venue and actual rooms/capacities/accessibility, then update content/booking/program. |
| S3 page 14 chart names Abdulrahman Ismail scientific leader and Fatimah Al Farhah organizational leader; S6 context identifies Akram as conference co-leader/scientific lead. | UNRESOLVED ROSTER DIFFERENCE. Draft chart and user role context do not establish final public organization or account grants. | Ask leadership to confirm names, titles, hierarchy and public roster before publishing; separately verify role grants. |
| S2 footer references Development Specification v0.4. | HISTORICAL SOURCE POINTER. The live technical document is now v0.5 and already reconciles current S2 answers. | Use S1 v0.5 for construction and preserve S2 answered choices without treating its old footer as priority. |
| S5 recommends framework/testing/tooling and milestone order. | RECOMMENDATIONS. S1 confirms providers and product scope, not exact frontend framework. | Record chosen framework at foundation. Move staff auth/permissions ahead of active CMS editing. |
| S8 original Canva reference and S4/S5 website guidance. | SOURCE-CORROBORATED WORKING DESIGN DEFAULTS. S8 text confirms the palette and English fonts; its uncertainty note and CFG-12 keep final approval open. Arabic font/motion remain S4 extensions. | Draft consistently with current defaults; obtain final CFG-12 approval and production source assets. |
| Earlier discussion said logo/visuals absent. | Historical state; later brand/Main materials now exist, but no final approved production asset set has been verified. | Use DESIGN_GUIDE.md (package file: docs/DESIGN_GUIDE.md) and MEDIA_REGISTER.md (package file: docs/MEDIA_REGISTER.md), distinguish illustrative/source assets from approved production media. |
| Project mentions purchased msrc2027.com. | User-reported domain ownership, not independently verified registrar/DNS access/renewal custody. | Verify organizational control, DNS access and renewal/recovery responsibility under CFG-11 before launch. |

## 6. Design defaults and required boundaries

| Item | Status | Value / boundary |
| --- | --- | --- |
| Video homepage, conference hierarchy, responsive buttons | REQUIRED | S1 DSN-01. Cinematic entry with clear usable content/action. |
| Scroll and motion accessibility | REQUIRED | Normal native keyboard/touch/wheel behavior; pause, poster, muted hero, reduced-motion and low-bandwidth fallback. |
| Inspiration references | USER PREFERENCE, S6 | Slush homepage video and ESC Congress information layout. Record inspiration, do not claim current audit or copy branded assets. |
| Palette | SOURCE-CORROBORATED WORKING DEFAULT, S8/S4/S5 | Royal purple #3B1E6D; warm gold #C9A24A; ivory #F8F6F0; lilac #DCCFF0; ink #1F1930. |
| Typography | SOURCE-CORROBORATED ENGLISH / WORKING ARABIC DEFAULT | DM Sans 600/700 headings/buttons and Inter 400/500 body corroborated by S8; Noto Sans Arabic added by S4. Final approval/licensing open. |
| Motion/touch | WORKING DESIGN DEFAULT, S4/S5 | Button transition 180 ms, hover lift 1-2 px, press scale 98%; reveal 400 ms/up to 12 px; working 44 px touch target. Respect reduced motion. |
| Brand approval | OPEN, CFG-12 | Exact marks/fonts/assets/video/poster/content/translations and all final approval. Textual illustrative logo is not final source mark. |
| Dark mode | EXCLUDED FROM COMMITTED SCOPE | Requires separate explicit approval to add. |

See DESIGN_GUIDE.md (package file: docs/DESIGN_GUIDE.md) for implementation detail. Working visual values may change during review without silently changing product or accessibility requirements.

## 7. Engineering defaults to preserve

These are source defaults and service objectives, not measured production performance or external mandates.

| IDs | DEFAULT / objective |
| --- | --- |
| AUTH-02 | OTP ten minutes; resend cooldown 60 seconds; <=3 issued/email/15 minutes; <=5 failed attempts/code. |
| AUTH-03 | Additional challenge/cooldown after five failed password attempts/15 minutes, no permanent lock. |
| AUTH-05 | Participant absolute 24h; privileged idle 30min/absolute 8h; recent auth for sensitive actions. |
| AUTH-08 | Remove abandoned unverified accounts after seven days only if no required record prevents cleanup. |
| ABS-04 | Whitespace tokens with letter/digit; no-space hyphenated term one word; shared client/server implementation. |
| ABS-07 | Withdrawn finalized research entries continue counting within two-per-PI cap unless logged exception. |
| ABS-09, ABS-14 | Stage-one administrative PDFs 10 MB/file; authorized stage-two PDF/DOCX/PPTX 50 MB/file. |
| REV-08 | Revision window 14 calendar days after request publication, exact timestamp and audited extension. |
| AI-03 | Human independent draft assessment before revealing advisory suggestion; model excluded from human average. |
| MED-04 | Gallery input JPEG/PNG/WebP and MP4/WebM; exact technical limits/codecs budget open. |
| PRV-05 | Ordinary participant retention one year after conference; separate justified exceptions/verification period. |
| INF-07 | Ordinary recovery objective <=24h data loss/4h restore; critical database <=15min loss/1h restore, subject to plan/budget/test. File targets separate. |
| NFR-01 | 100 active registration/submission users baseline, 1,000 public browsers stress with documented operation mix. |
| NFR-02 | Agreed-mobile p75 LCP <=2.5s and typical internal API p95 <=1s, exclusions/test conditions recorded. |
| NFR-03 | 99.9% monthly availability objective, no planned critical-window maintenance. |
| TIM-01 | Store UTC, show Asia/Riyadh with timezone label; server-authoritative deadlines. |

## 8. Complete configuration and approval gates

Every CFG item below retains the full S1 statement. All named accountable owners/approvers and target due dates remain **unassigned** in this handoff unless a later recorded decision supplies them. Suggested implementation sequence is in ROADMAP.md (package file: docs/ROADMAP.md), not a fabricated calendar.

| Gate | Functional owner in S1 | Named owner | Due date | Production boundary |
| --- | --- | --- | --- | --- |
| CFG-01 | Conference leadership | Unassigned | Unassigned | Registration opening |
| CFG-02 | Finance / leadership | Unassigned | Unassigned | Relevant paid or discounted registration opening |
| CFG-03 | Scientific lead | Unassigned | Unassigned | Relevant submission/review stage |
| CFG-04 | Scientific / award lead | Unassigned | Unassigned | Event judging / award release |
| CFG-05 | Hackathon lead | Unassigned | Unassigned | Each relevant hackathon stage |
| CFG-06 | 3MT lead | Unassigned | Unassigned | 3MT opening |
| CFG-07 | Workshop lead | Unassigned | Unassigned | Workshop opening |
| CFG-08 | Operations / certificate lead | Unassigned | Unassigned | Event operations / certificate release |
| CFG-09 | Organizational / privacy owner | Unassigned | Unassigned | Production data collection |
| CFG-10 | Technical owner with privacy / scientific approval | Unassigned | Unassigned | Production provisioning / relevant integration activation |
| CFG-11 | Club / leadership | Unassigned | Unassigned | Production deployment |
| CFG-12 | Design / content lead | Unassigned | Unassigned | Public launch |
| CFG-13 | Hackathon plus privacy / operations / technical owners | Unassigned | Unassigned | Affected collection / communication / selection behavior |

S2 mentions Aisha for flow/schedule coordination and Reem for faculty/judges/mentors. Those draft operational mentions do not resolve the final owner/approver rows above, exact identities or security grants.

### CFG-01

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-01. Conference leadership: exact event dates/venue, general capacity, admission categories, manual approval owners, decision turnaround, payment/seat-hold deadlines, and handling of capacity-pending requests. Gate: registration opening.

### CFG-02

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-02. Finance/leadership. CONFIRMED: P1, use the authorized KAU payment arrangement. REMAINING: responsible KAU unit/contact, exact system and official payee, integration documentation/access or authorized report-based reconciliation, order references, currency/prices/tax treatment, methods actually enabled, student-discount evidence/limits, refunds/cancellations and their authority, settlement reporting, and dependent-booking rules. Test the actual confirmation process; do not assume API/webhook support. Gate: relevant paid or discounted registration opening.

### CFG-03

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-03. Scientific lead: specialty codes, study-type choices, corresponding-author eligibility, keyword requirements, rubric criteria/scales, ongoing-study treatment, required review count, acceptance threshold, tie/disagreement rules, similarity provider/settings, and final-material requirements/deadlines. Gate: the relevant submission/review stage.

### CFG-04

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-04. Scientific/award lead: award categories, event-judging rubric/ties, supervisor details/evidence required ONLY from selected research winners, verification responsibility, and response deadline. Gate: event judging and award release.

### CFG-05

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-05. Hackathon lead. CARRIED FORWARD: C3 solo/team competition, no matching, maximum five per team, cross-university teams, two named tracks locked after acceptance, title plus 300-word pitch, new ideas only, two independent reviewer assignments, compulsory orientation/day-one mentoring/day-two finals, idea-plus-pitch minimum, optional prototype, and five-minute pitch plus three-minute Q&A. REMAINING: final eligibility wording, cross-mode duplicate rules, member editing/confirmation/lock policy, solo inclusion in the eight-per-track finalist limit, detailed forms/files/references, dates, review quorum/rubrics, recording/spoken-language policy, fees/inclusions, prizes, IP terms, and hackathon certificate evidence. Resolve CFG-13 source discrepancies. Gate: each relevant hackathon stage. [H1]

### CFG-06

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-06. 3MT lead: postgraduate eligibility, presenter limits, form/file requirements, stage deadlines, presentation rules, judge/rubric configuration, and certificate/award evidence. Gate: 3MT opening.

### CFG-07

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-07. Workshop lead: catalog, rooms, per-workshop capacity, price, reserved seats, approval responsibility, hold/offer windows, deadlines, prerequisites, cancellation handling, and whether the 30–100 estimate is per workshop or total. Gate: workshop opening.

### CFG-08

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-08. Operations/certificate lead. CONFIRMED: A1 daily check-in; full conference certificate requires BOTH days plus general survey; NO one-day certificate; workshop certificate requires its booking/check-in/completion sign-off/survey, independently of earning the full conference certificate. S2 feedback is unlinked while completion is tracked. REMAINING: sign-off owners/procedure, survey questions/deadlines and privacy-tested unlinking method, templates/signatures, role/competition certificate rules, release authority, correction handling, and outage contingency. Gate: event operations and certificate release.

### CFG-09

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-09. Organizational/privacy owner: record legal controller/contact and institutional approval evidence under the selected O1 model. Finalize field purposes, media/minor policies, notices/legal bases, processor contracts, actual locations/transfer assessment, retention exceptions, request handling, certificate-verification lifespan, and S2 metadata/log separation. Resolve the hackathon's requested national ID/phone fields against the existing minimal-profile policy before opening its form; national ID remains excluded pending an explicit decision and approved handling. Gate: production data collection.

### CFG-10

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-10. Technical owner with privacy/scientific approval. CONFIRMED: managed Vercel + managed Supabase. REMAINING: approved plans/regions and complete data-flow assessment, KAU payment integration details, email sender/DNS, assessment provider/data terms/evaluation, hackathon originality-check procedure, malware scanning, storage/backups, throughput/quotas, monitoring, and monthly/event budget including video delivery. Use synthetic development data while production location/processing approvals are pending. Gate: production provisioning or relevant integration activation.

### CFG-11

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-11. Club/leadership. CONFIRMED: O1 MSRC/RPClub-managed organization accounts with institutional authorization. REMAINING: authorization evidence, named continuing custodian and backup owner, organizational repository/domain/Vercel/Supabase/billing access, DNS/recovery controls, three website Super Admins, release approver, support/incident coverage, renewal responsibility, and annual handover. Infrastructure ownership and website Super Admin roles remain separate. Gate: production deployment.

### CFG-12

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-12. Design/content lead: logo/brand system, English/Arabic fonts, homepage video/poster, approved speaker/committee/sponsor assets, translations, public-page content, media permissions, and archive/domain continuity. Gate: public launch.

### CFG-13

**State: OPEN REMAINING INPUTS. Named owner: Unassigned. Due date: Unassigned.**

CFG-13. Hackathon lead with privacy/operations/technical owners. SOURCE RECONCILIATION REQUIRED: (a) requested national ID and phone/profile fields versus current exclusions/conditional fields; (b) the draft's WhatsApp group versus confirmed email-only platform communications, including whether any external group is optional; (c) whether solo projects consume the stated eight-team-per-track/sixteen-team finalist quota; (d) broader eligibility still labelled Options; (e) originality-check method and human decision process. Do not silently resolve these or activate the affected collection/communication/selection behavior. [H1, Sections 3–6]

## 9. Source links and snapshot discipline

- [S1 Development Specification v0.5](https://docs.google.com/document/d/12LjPNVdnI10eC8ul9I-NZcBGj8a0Y3r7qcrgs-PoACo), modified 2026-09-29T11:30:21.017Z.
- [S2 Hackathon Draft](https://docs.google.com/document/d/1eVBuk33QhS-UDbic17Vh06M5RaqA1RzdRRoxGP7NZ7M), modified 2026-09-29T11:09:52.079Z.
- [S7 2026 media folder, Without frame](https://drive.google.com/drive/folders/1wkez3zex5RiTc3dM85s9QLO07rpLrsEu), folder metadata modified 2026-01-25T17:28:42.121Z; accessible metadata checked 29 September 2026. Rights, consent and selected hero quality have not been established by listing.

The snapshots describe the source state read for this handoff. If live documents later change, read the current source, reconcile affected requirements, and record the change rather than merging historical proposals automatically.

## 10. Change record template

Use this only when a real decision is made:

- Decision ID / affected requirement IDs:
- Actual decision date and source:
- Previous rule or open question:
- New approved rule:
- Named decision owner / approver:
- Evidence and remaining external approvals:
- Affected documents / configuration / tests:
- Gate opened or still closed:
- Implemented by / verification evidence:

No approvals, completion marks, due dates, staff identities or production launch state have been filled by inference.




---

# Included file: docs/REQUIREMENTS.md

# MSRC 2027 implementation requirements

Snapshot: 29 September 2026. Status: implementation baseline, not evidence of a built or launched system.

**Primary authority: S1, Development Specification v0.5**, last modified 2026-09-29 11:30:21 UTC (14:30:21 Riyadh). Read the full specification (package file: docs/../sources/Development_Specification_v0.5.txt) whenever a condensed rule needs detail. S2, Hackathon Draft (package file: docs/../sources/Hackathon_Draft.txt), modified 11:09:52 UTC the same day, supplements answered hackathon choices. S1 explicitly reconciles its open questions and conflicts. Older S3/Main PDF and S5/starter content do not override S1.

MUST means required behavior. DEFAULT means an adopted, configurable engineering starting value. TBD means unresolved business configuration or approval. Use DECISIONS.md (package file: docs/DECISIONS.md) for every gate and conflict. Develop with synthetic data while production approval or configuration remains pending. All selected functions remain delivery scope; sequencing their releases does not remove them.

## Navigation

1. [Scope and public pages](#1-scope-and-public-pages)
2. [Roles and access](#2-roles-and-access)
3. [Identity, language and accessibility](#3-identity-language-and-accessibility)
4. [Registration and payments](#4-registration-and-payments)
5. [Research submissions](#5-research-submissions)
6. [Review, decisions and assessment](#6-review-decisions-and-assessment)
7. [Hackathon and 3MT](#7-hackathon-and-3mt)
8. [Workshops and program](#8-workshops-and-program)
9. [Attendance, surveys and certificates](#9-attendance-surveys-and-certificates)
10. [Communication and public content](#10-communication-and-public-content)
11. [Administration, data and services](#11-administration-data-and-services)
12. [Privacy, security and operations](#12-privacy-security-and-operations)
13. [Release requirements](#13-release-requirements)
14. [Acceptance tests](#14-acceptance-tests)

## 1. Scope and public pages

| IDs | Required behavior |
| --- | --- |
| SCP-01 | Two-day MSRC conference, parallel sessions, general attendance, abstract research with oral/poster allocation, postgraduate 3MT, hackathon, workshops, keynotes, exhibitions, sponsors, post-event archives. Actual dates, venue, rooms and capacity remain configuration gates. |
| SCP-02 | Home; About; Dates and Venue; Program; Speakers; Workshops; Participation and Submission Guidelines; Teams/Committees/Board; Sponsors and Sponsorship; Gallery/Past Editions; Announcements; FAQ; Contact; Privacy; Terms. Public information and workshop availability require no login. |
| SCP-03 | Verified-user dashboard for registrations/payments, submissions/revisions, workshop bookings/waitlists, QR tickets and certificates. Registration, research, hackathon and 3MT are distinct workflows sharing one account. Co-author listing creates no registration. |
| SCP-04, SCP-07 | Delivery scope includes manual approvals, paid/fully discounted orders, human review and advisory assessment, committee dashboards, live judging, email automation, scans, survey-based certificates, CMS, audits and reports. Certificate release can follow initial public launch; evidence/retention design must exist before collection. |
| SCP-06 | Planning estimates: 15,000+ visitors, about 1,000 attendees, 300-400 abstracts, 30-40 reviewers/judges and 3-10 administrative accounts. The 30-100 workshop figure needs clarification as total or per workshop. These are estimates, not capacity commitments. |

**Explicit exclusions (SCP-05, DSN-02, CHK-05, REV-10):** public attendee directory; public abstracts or research search; sponsor accounts/self-service upload; user-built personal schedules; full-site search; attendee messaging/networking; native mobile apps; automatic team matching; university SSO; SMS, WhatsApp or push integrations. My Bookings is a read-only list of actual bookings. Program filters and private administrative search remain required. Dark mode and live public leaderboards are not committed. Full offline scanning synchronization remains gated, not promised.

## 2. Roles and access

All grants are additive and limited by edition, assignment, track or operational function. Enforce permissions on the server, database and storage, including direct requests. Login alone grants no general database access (ROL-01).

| IDs / role | Allowed scope and limits |
| --- | --- |
| ROL-02 Participant | Own permitted profile fields, registration/orders, drafts/revisions, bookings/tickets/certificates. No other participants' records, unpublished decisions, reviewer identities, scores or confidential comments. |
| ROL-03 Abstract Reviewer | Only assigned anonymized submission version and rubric. Declare conflicts/decline, save/submit/amend while open. No author names, contact details, affiliations, administrative evidence, peer reviews or peer completion status in returned data. |
| ROL-04 Hackathon / 3MT Reviewer | Assignment-scoped sanitized packets and scoring. Identity-bearing team names/identifiers also anonymized. In-person event judging is a separate stage. |
| ROL-05 Scientific Administrator | Validate, assign, configure rubric, request revision, resolve disagreements, prepare/publish authorized decisions and allocate oral/poster format. Identity access only where duties require it; original evidence access follows ROL-11. |
| ROL-06 Judging Committee / Faculty Judge | Committee categorizes accepted work and assigns judges. Judge accesses assigned event materials, declares conflicts, scores and amends before lock. Separate records from acceptance review. |
| ROL-07 Registration / Workshop Administrator | Manual approvals, capacity, reserved seats, holds/waitlists and necessary attendance records. Finance grant handles orders/reconciliation/discounts/authorized refunds. Neither gives scientific content or full personal exports. |
| ROL-08 Check-in Staff | Assigned days/workshops, minimum name/registration reference/ticket validity/check-in details. No submissions, licence data, finance, unrestricted participant lists or approval/refund powers. |
| ROL-09 Content/Media Editor; Sponsorship/PR | Assigned content and uploads, with explicit approved media publication. PR manages sponsor records/inquiries and permitted follow-up. General support remains email-based. |
| ROL-10 Super Admin | Exactly three named accounts before production. Roles/security/integrations/full personal exports/audits/exceptional actions. Infrastructure ownership remains organizational and separate from this website role. |
| ROL-11 Confidential evidence | IRB and similarity originals/downloads restricted to Super Admins. Scientific admin receives validation outcomes. Any original-evidence grant needs separate approved, logged policy change. Judge access to presentation files is a different class. |
| ROL-12 All privileged accounts | Individually identifiable; MFA required; no self/conflicted reviews. Offboarding removes grants and invalidates applicable sessions. Roles, overrides, downloads, exports and publication auditable. |

## 3. Identity, language and accessibility

- **AUTH-01:** Managed email/password accounts. Verified email before submitting, registering, paying or booking. No special KAU authentication. Normalize unique email without public account-enumeration responses.
- **AUTH-02:** Six-digit numeric verification. DEFAULT ten-minute validity, 60-second resend cooldown, at most three issued codes/email/15 minutes, five failed entries/code. Replacement invalidates prior code; single-use and protected at rest. Account/IP limits and accessible anti-bot controls cover issuance, entry and recovery.
- **AUTH-03:** Progressive password throttling. DEFAULT five failed attempts/15 minutes before further challenge/cooldown, no permanent lockout. Generic reset response, expiring single-use credentials, recovery/session-revocation tests.
- **AUTH-04:** Authenticator-app TOTP MFA for privileged roles, with enrollment, recovery and audited reset. Enforce privileged operations at API/data layer; email verification is not the second factor.
- **AUTH-05:** DEFAULT participant absolute session 24 hours; privileged screens idle 30 minutes and absolute eight hours. Recent authentication for sensitive changes, warn before expiry and preserve saved drafts. Server-side logout/suspension/factor-reset/revocation behavior must be tested.
- **AUTH-06:** Required name/email. Professional category when relevant to chosen path; institution/academic level conditional. Country/city/phone optional unless an approved purpose requires them. Licence conditional on approved professional purpose, never universal for students/non-medical participants. **National ID excluded.**
- **AUTH-07, AUTH-08:** Permitted profile corrections; email change/deletion through verified support. Reverify replacement email, assess retention exceptions, revoke access appropriately. DEFAULT remove abandoned unverified accounts after seven days only where no retained operational record requires them. Never log passwords/codes.
- **LOC-01:** English-default bilingual public pages, authentication, participant dashboard, navigation, form labels/instructions/errors/support, and non-review organizer interfaces. Arabic RTL and language switches preserve entered data.
- **LOC-02, LOC-03:** All submitted scientific/project text, hackathon, 3MT and final-presentation content English-only and LTR even in Arabic views. Proper names retain correct spelling. Reviewer/judge assessment screens English-only. **All transactional emails English-only.**
- **ACC-01:** WCAG 2.2 AA target. Verify keyboard/focus, semantic structure, labels/errors, contrast, resizing, screen-reader feedback and RTL. OTP paste/autofill and alternatives to camera-only admission/inaccessible CAPTCHA. Honor reduced motion.

## 4. Registration and payments

### Registration

REG-01 through REG-08 define:

1. General attendance can include students, non-medical guests, faculty, professionals and external/international attendees. Scientific eligibility is separate.
2. Every request begins pending manual approval, including fully discounted users. Account verification and request submission do not confirm admission.
3. Workflow: verified account → registration request → pending approval → organizer approval → payment due or valid zero-value order → confirmed registration → ticket.
4. Distinct registration states: draft, pending_approval, rejected, approved_awaiting_payment, confirmed, cancelled, expired. Financial states are separate. Record actors/timestamps and reasons for exceptions, rejection, cancellation or overrides.
5. Require configured two-day attendance declaration/terms; show dates/prices/discount/cancellation/capacity conditions. Close registration until dates, capacity, approver and financial setup are complete.
6. Approval atomically allocates available capacity or explicit capacity-pending queue. Pending requests guarantee no seat. Approved unpaid reservations expire at configured deadline, release capacity and notify.
7. Dashboard shows ID/state/payment action/expiry/ticket/support. No admission from pending, rejected, cancelled, expired, refunded-and-revoked or suspended entitlement.
8. Eligible verified users may submit research before paid attendance. Presenter/team/winner attendance obligations must be published before decisions; no retrospective hidden charge.

### Financial behavior

| IDs | Requirement |
| --- | --- |
| PAY-01 | P1 authorized KAU collection arrangement selected. Conference/workshops paid products with promotional codes including 100% university-student discount. Exact payee/system/owner/interface/prices/currency/methods/evidence/tax/refund authority remain gated. No independent merchant or provided API assumed. |
| PAY-02, PAY-03 | Server-calculated immutable item/price/discount/tax/currency/total snapshot in integer minor units. Validate discount eligibility, activation/expiry/product/group/per-user/global limits, default no stacking and race-safe usage. Full discount creates completed zero-value order without card charge, while still requiring manual approval. |
| PAY-04, PAY-05 | After approval, hand off through KAU-confirmed interface. Isolate a payment adapter; start with synthetic tests. Authenticated system confirmation or authorized official-record reconciliation must match order/amount/currency/reference. Browser return, screenshot or user assertion proves no payment. Do not invent signed webhooks if system lacks them. |
| PAY-05, PAY-06 | Separate attempt/approval/order/entitlement. Retry/out-of-order events cannot duplicate credit/tickets/bookings. Ambiguous matches enter reconciliation queue. Late payment after expired seat enters available-seat/refund exception, never overbooks. Finance sees failed/pending/success/refund/partial/dispute states and audit. |
| PAY-07 | Cancellation is separate from refund. Track requested/approved/submitted-to-KAU/confirmed-refunded as appropriate, official references and audit. Refund only eligible paid amount; zero orders have no monetary refund. Publish entitlement revocation, seat release, discount restoration and dependent-booking rules. |
| PAY-08 | Publish seller/contact/currency/prices/inclusions/refund/receipt information before collection. Card numbers/security codes never enter MSRC database, logs or email. Finance permissions exclude scientific reports/unnecessary profile fields. Payment communications email-only. |

## 5. Research submissions

| IDs | Requirement |
| --- | --- |
| ABS-01 | Undergraduate/postgraduate, interns/residents, practitioners and faculty from any institution including international institutions; completed and incomplete/ongoing studies eligible. Do not demand invented completed results. |
| ABS-02, ABS-03 | Title, specialty, study type, completion status, body, ordered authors/affiliations, PI, corresponding author, presenter where known, ethics, conflict/funding declarations/evidence. Configurable keywords. Ordinary template: Background, Aim, Methods, Results/Current Progress, Conclusion/Current Implications. Case report: Background/Context, Case Presentation, Discussion, Outcome, Conclusion. |
| ABS-04 | Maximum 300 combined body words. Exclude title/authors/affiliations/keywords/generated headings. DEFAULT count whitespace-separated tokens containing letter/digit; no-space hyphen expression is one. Same live and server counter, server rejects >300. No stage-one body references/tables/figures. |
| ABS-05, ABS-06 | Multiple author affiliations; no scientific author-count cap. Submitter, PI, first/corresponding/presenting author separate. Corresponding-author eligibility awaits scientific lead. Co-authors need no accounts. Submitter confirms authority; co-author emails are informational/invitational, create no registration/order/account/public profile. Correction route required. |
| ABS-07 | Two finalized stage-one applications per PI per edition. Drafts and co-authorship alone do not count. Block third attempt without disqualifying first two. Withdrawn submissions still count by default; logged authorized exceptions. No overall abstract-cap implied. |
| ABS-08 | Supervisor not required for submission, review, acceptance, presentation allocation or nomination. Only selected research award winner activates required supervisor validation, status winner_pending_supervisor. Does not cancel normal acceptance. Evidence/deadline configured before awards. |
| ABS-09 through ABS-11 | Stage one: abstract/data plus applicable IRB/ethics and mandatory similarity report only. DEFAULT PDF only, 10 MB/file. No presentation/poster/supplements/general attachments. Distinguish supplied approval from declared not-required/exempt with explanation. Study type alone does not waive ethics. Case consent distinct from ethics approval. No patient identifiers. Current <=20% similarity target needs approved provider/settings; higher/unverifiable flags require human validation/revision, never automatic plagiarism verdict/rejection. |
| ABS-12, ABS-13 | Draft/resume across devices, visible autosave status/error, preview/explicit finalize, timestamped immutable text/author/declaration/file snapshot. Locked except authorized reopen/revision. Preserve files used for prior review. Internal random ID plus unique stable edition/specialty display reference, concurrency-safe and unchanged after reclassification. Reference not access secret. |
| ABS-14, ABS-15 | Authorized stage two for accepted/conditional/requested final materials. Configured PDF/PPTX/DOCX, DEFAULT 50 MB/file. Additional/legacy formats require allowlist approval; executable/macro formats excluded. Per-format templates/counts/deadlines. Administrative evidence private/separate from presentation files. Reviewers sanitized content, judges only assigned approved materials. |

## 6. Review, decisions and assessment

- **REV-01:** Blind applicant identity in UI, APIs, filenames/properties, notifications and downloads. Check identifying text before assignment. Applicants cannot see reviewers/confidential material. Live judge seeing presenter does not waive pre-event blindness.
- **REV-02 through REV-04:** Manually assign 1-5 eligible reviewers, keyed to submission/rubric versions. Finalize quorum/scales/thresholds before opening. Missing/declined is not zero. Conflicts withdraw/reassign. Draft/submit/amend before lock. Reviewer cannot see peer progress/scores. Abstract criteria equally weighted unless versioned policy changes; preserve denominators, rules for inapplicable criteria/ongoing studies.
- **REV-05:** Scores inform committee judgment. No automatic threshold publishes outcome. Authorized reason for override. Committee allocates oral/poster.
- **REV-06:** States: draft, submitted, administrative_review, scientific_review, revision_requested, conditionally_accepted, accepted, rejected, withdrawn, revision_expired, final_material_received. Format/final-material completion separate from acceptance.
- **REV-07:** Prepare decisions internally, preview batch/outcomes/emails, correct, explicitly publish. Only published transitions update participant dashboard/send outcome. Internal changes are confidential.
- **REV-08, REV-09:** Revision request defines allowed edits/files and safe applicant instructions. DEFAULT 14 calendar days from publication with exact cutoff. Finalize revision on website; email reply is insufficient. Expired/voided is not scientific rejection. Logged extension/reopen. New snapshot; admin explicitly determines which reviews need repetition. Withdrawal stops outstanding review/model jobs but does not cancel separately purchased attendance.
- **REV-10:** Separate event-judging assignments/rubric/scores/locks/ties/award authorization. Selected research award winner additionally meets ABS-08 supervisor condition.
- **AI-01:** Advisory assessment separate from deterministic validation, similarity, human review and committee publication. Administrative readiness → assessment job → human review → committee → publication. Failure preserves submission and manual review.
- **AI-02:** Only approved sanitized scientific content/study metadata transmitted. No names/email/phone/affiliation/licence/IRB/similarity files; inspect identifiers embedded in body.
- **AI-03:** DEFAULT reviewer first enters independent draft, then sees suggestion, confirms/changes final score with substantive override reasons. Human, model and final decisions separate; model excluded from human average absent explicit policy change.
- **AI-04 through AI-06:** Version provider/model/rubric/prompt/submission/time/validated structured output/human follow-up. Submission content untrusted. It cannot alter rules, invoke tools, reveal secrets or publish. Production requires provider/location/retention/training/confidentiality/cost/disclosure approvals and committee-example evaluation. Test ongoing studies, identity leakage, injection, unsupported claims, malformed/failure outputs. Bounded retry/cost, queue/error/manual states and disable switch. No automatic rejection on failure.

## 7. Hackathon and 3MT

TRK-01 requires separate schema, eligibility, dates, files, states, review/rubrics and event scoring for both pathways. Shared identity/draft/version/email/permissions do not transfer research-specific rules automatically.

| IDs | Hackathon requirement |
| --- | --- |
| HAC-01 | C3 solo competition plus preformed teams, no matching. Entry records mode/project/lead/roster; solo one participant, team up to five. Cross-university allowed, one team/person and project/team. Cross-mode duplicates/multiple solo entry rules unresolved. |
| HAC-02 | Working MSRC 2027 Hackathon; Research-to-impact. Exactly two tracks: Translating research into practice; Advancing medical student research. Own problem and defend feasibility/application; accepted track locked. No healthcare member required and international eligible. Broad student/intern eligibility sentence still Options, needs final wording. |
| HAC-03 | Participants verify accounts at sign-up/registration. Distinguish application roster, committee acceptance and post-acceptance invitation confirmation. Do not require later confirmation to enter initial review. Secure invitations, deduplicated resend, auditable membership. Editing/cutoffs/refusal/no-response/solo-team changes gated. |
| HAC-04 | Title and English pitch <=300 words, track/participants. Problem/users/solution/innovation/approach/feasibility/impact/progress guidance may become prompts or separate fields only after decision. Optional support files except applicable IRB, prototype evidence if applicable, final presentation later. References/appendix required but format/word-count treatment open. |
| HAC-05 | New ideas only; no previously pitched/entered, prizewinning, funded or commercially launched projects. Declarations and human review. Intended AI-assisted originality check remains unconfigured; no automatic novelty guarantee. Participant AI/outside-assistance policy open. |
| HAC-06, HAC-07 | Eligibility and two independent reviewer assignments, blinded. Quorum/scale/criteria/ranking undecided. Eight finalist teams/track, sixteen total; solo quota accounting unresolved. Counting each solo/team as one entry is only proposed. Exact dates unresolved. |
| HAC-08 | Structured off-campus preparation and online orientation, day-one on-site mentoring, day-two on-site pitch/judging/awards. All listed stages compulsory, all team participants at finals for award eligibility. Individual evidence, no teammate scan credit. Fair mentoring; evidence/exception procedures gated. |
| HAC-09 | Minimum idea + pitch; prototype encouraged. Five-minute pitch + three-minute Q&A, closed judging. Written English. Spoken language/final files/locks/presenter count/overruns pending. Approved failed-demo fallback can use recording/screenshots/PDF. Recording restriction tentative, no auto recording/publication. |
| HAC-10, HAC-11 | National ID remains excluded, phone conditional. Platform email-only despite source WhatsApp mention; optional external group and phone sharing unresolved. Fees, final rubric, judges/ties/panels, solo/team awards, prizes, budget/partners/IP/publicity/certificates open. Separate manual conference/workshop approval still applies. No research-supervisor rule inheritance. |

**TMT-01, TMT-02:** Dedicated postgraduate 3MT path with title, project/study narrative, presenter, affiliation, declarations, outcomes and final material. English content/assessment. Exact eligibility/evidence/limits/files/presentation/slide rules, stages, judge count/rubric and certificate/award evidence are gated. Do not imply affiliation with an external competition or import rules from its name.

## 8. Workshops and program

- **WKS-01:** Public bilingual title/description/instructor/room/times/capacity/remaining seats/eligibility/price/deadline. Separate reserved seats, active holds, confirmed bookings; no participant names.
- **WKS-02:** Manual approval, then completed payment/valid discount. Confirmed conference registration required for workshop confirmation. Multiple non-overlapping workshops allowed; browsing public.
- **WKS-03, WKS-04:** Server timestamp of valid request determines first-come order. Defined approval/payment hold, explicit extension, expiry. Transactional capacity/discount allocation and one winner for concurrent last seat. Reserved seats count and require reason/release deadline.
- **WKS-05:** Waitlist free of charge. Next eligible receives timed offer; acceptance rechecks approval/payment/eligibility/conflicts. Offer is not automatic payment/booking. Expired/declined passes once.
- **WKS-06:** Overlap when start A < end B and start B < end A. Adjacent allowed absent configured transfer buffer. Overlapping waitlist okay; held/confirmed place cannot conflict. Recheck on offer acceptance.
- **WKS-07:** Audit and notify cancellation/removal/time/capacity changes. Changed schedule conflict enters resolution. Never reduce capacity below allocations without reconciliation.
- **PRG-01:** Managed days/parallel sessions/rooms/speakers/categories/descriptions, day/category/room filters, event timezone. Notify booked/assigned users of relevant changes; authorized major announcement may email all. No schedule builder.

## 9. Attendance, surveys and certificates

- **CHK-01, CHK-02:** Unpredictable revocable/reissuable QR entitlement, no personal/financial data encoded and display references are not secrets. Phone-compatible scoped camera scanner/manual lookup. Outcomes include valid/already checked/wrong day or activity/pending/unpaid/cancelled/revoked/unknown.
- **CHK-03, CHK-04:** A1 one valid daily check-in each conference day; no checkout/hours requirement. Separate workshop check-in and authorized completion sign-off. Per-member hackathon/role evidence where needed. Record participant/entitlement/day/activity/server time/scanner/result/corrections; duplicates no extra credit. Corrections preserve original and reason.
- **CHK-05:** Online baseline. Choose/rehearse outage fallback before event, minimal protected roster/manual logging/reconciliation. Offline synchronization not promised; disconnected devices cannot guarantee current revocation.

| IDs | Certificate and survey rule |
| --- | --- |
| CRT-01 | Full two-day certificate: BOTH daily check-ins + general survey. No one-day ordinary certificate. Workshop: confirmed workshop booking + workshop check-in + authorized completion sign-off + its survey, independent of earning full conference certificate. No measured/accredited hours implied. |
| CRT-02 | S2 stores participant-linked completion separately from feedback with no retained identity linkage via account, response mapping, reusable token, request log/shared key, IP or precisely correlatable metadata. Avoid identifying free text/small demographic risks. Durable retry awards completion once without linking answers. Approve survey questions/deadlines/retention/unlinking method before enablement. Follow-up contact separate. |
| CRT-03, CRT-04 | Ordinary templates only Full Two-Day Conference Attendance and Workshop Participation. Research presenter/reviewer/speaker/organizer/hackathon/3MT certificates need separate evidence/release approvals. Co-authors get no attendance/presenter entitlement automatically. Calculate/prepare automatically, admin approves template/signature/release batch, then generation/issue/email automatic. |
| CRT-05, CRT-06 | Opaque unique verification code; public single-certificate page only minimum name/type/edition/activity/validity, rate-limited and non-enumerable. No directory/contact/licence/score. Verify corrections, revoke/reissue auditable, original replaced status. Protected links for speakers without account. Private download and public verification retention defined separately. |

## 10. Communication and public content

- **EML-01 through EML-05:** All platform notifications email-only and English-only, including verification/recovery/approval/payment/submission/revision/publication/co-author/team invitations/workshop/schedule/certificate events. Verified branded sender, candidate noreply@msrc2027.com plus monitored Reply-To; actual address/provider/DNS not yet configured. SPF/DKIM/DMARC checked. Durable deduplicated jobs, bounded backoff/replay/error visibility, bounce tracking and dashboard fallback. Preview/test/escape templates; never leak another user's fields. Optional announcements honor preferences. Test 300-400 decision and ~1,000 attendee batches. Queued is not delivered.
- **SUP-01 through SUP-03:** General form categories/name/email/reference/message sent through verified sender and validated Reply-To, spam protection, no sensitive echo. Existing routes to test: MSRC27kau+generalinquiry@gmail.com; MSRC27kau+scientificinquiry@gmail.com; MSRC27kau+hackathon@gmail.com; MSRC27kau+workshop@gmail.com; MSRC27kau+sponsor@gmail.com; MSRC27kau+technical@gmail.com. Exact configured destinations, no arbitrary recipient. Shared-inbox labels are routing, not access boundaries. No general helpdesk status system. Sponsor consumer email domains permitted.
- **SPN-01, SPN-02:** Approved packages/tiers/logos/descriptions/booths managed by PR/admin, no sponsor portal/uploads. Prospectus sent by organizers/KAU via email, not assumed public download. Restricted inquiry company/contact/email/optional phone-role/interest/message, owner/status new/assigned/contacted/closed, acknowledgment and team email.
- **CMS-01 through CMS-04:** Structured no-code editing of home/dates/countdown/About/announcements/speakers/program/workshops/sponsors/committees/FAQ/contact/gallery, fixed layouts. Draft/preview/publish/unpublish/deletion recovery and revisions/audit. Authorized ordinary publisher can publish; explicit media approval required. Scheduled publishing optional. Public speaker/committee fields approved; private contact separated, no speaker accounts or assumed international-speaker category. Controlled translations, no broken switches/private preview indexing/API exposure.
- **MED-01 through MED-04:** Direct approved-storage image/video uploads, albums by edition/activity, no third-party embeds. Explicit publication/rights/consent with wording/version/purpose/subjects/grant-withdrawal/evidence. Registration consent not blanket bystander permission. No-photo/withdrawal/removal process; optional publicity refusal does not cancel paid attendance. Private originals as justified and optimized derivatives. DEFAULT JPEG/PNG/WebP, MP4/WebM, exact sizes/codecs/durations/budget gated. No public download button; never claim copying impossible.
- **DSN-01, DSN-02:** Video-led homepage, clear information hierarchy, restrained transitions/micro-interactions/responsive buttons. Preserve normal scroll behavior. Poster, muted video/pause, reduced motion and low-bandwidth fallback; never delay registration access. Define bilingual fonts/color/spacing/components/form states/motion and approved marks. Brand/hero approval pending; no committed dark mode.
- **ARC-01, ARC-02:** Close event participation after event; retain approved summaries/statistics/speakers/sponsors/winners/consented media. No public abstracts/directory. Private certificates/public verification according to approved retention. Reuse code, separate annual databases/storage/config; no automatic accounts/submissions/consents transfer. Plan domain/archive/verification ownership across handover.

## 11. Administration, data and services

- **ADM-01 through ADM-05:** Permission-scoped statistics/dashboards and private search/filter for registrations/orders/reconciliation/submissions/review/acceptance/bookings/attendance/email/sponsors/certificate readiness. Consequential bulk actions confirmed. CSV/Excel exports for reports; full personal exports Super Admin-only, other grants minimal/aggregate. Expiring protected export and spreadsheet-injection neutralization. Immutable protected audit actor/action/target/time/result/old-new/reason for sensitive actions; Super Admin-only access. Logs exclude passwords/OTP/secrets/card data/unnecessary manuscripts/profiles; audit versus public release notes separate.
- **DAT-01:** Account/profile/edition grants/staff assignments/consents/privacy request evidence. General email support need not become helpdesk database.
- **DAT-02:** Track config, submission/immutable version, author/affiliation/responsibility, attachments/validation, versioned rubrics, assignment/conflict/review/model assessment, revision/decision/publication, presentation/judging/award.
- **DAT-03:** Registration/orders/items/official KAU confirmation-refund-discounts; workshops/holds/waitlist/offer/bookings; sessions/rooms/speakers; tickets/individual attendance/corrections/completion sign-off; survey completion and **separate unlinked feedback**; certificates/verification; sponsor/content/media/email/audit. Hackathon mode, roster and post-acceptance confirmations separate. Feedback has no participant foreign key/correlation map.
- **DAT-04:** Enforce foreign keys and unique normalized email, edition reference, active booking/seat, provider event/transaction, invitation, certificate token, notification key. Stable IDs/timestamps/immutable snapshots and retention-aware deletion.
- **API-01:** Each domain mutation defines permission, source state, validation, resulting state, audit and notification. Cover drafting/finalization/withdraw/revise, teams/confirmation, review/locking, publish, registration/KAU reconciliation/refund, seats/waitlist, attendance/sign-off, unlinked survey, consent/media, certificates and scoped exports. Do not audit feedback payload in identity-linked records.
- **API-02, API-03:** Server-authoritative price/capacity/time/identity, idempotent finalization/checkout/callback/booking/scan/publication, optimistic edits and transactional seats. Durable bounded-retry/deduplicated authorized-replay jobs for mail/assessment/scanning/certificates/exports/cleanup. Distinguish accepted processing from completion; rolled-back mutations send no event.

## 12. Privacy, security and operations

- **PRV-01 through PRV-04:** Named legal controller/contact/processors/purposes/legal bases and institutional evidence before production collection. O1 does not establish controller approval. Version notice/terms and separate optional media/announcements. Exclude national IDs/patient identifiers and only purpose-approved licence. Verified access/correction/deletion/consent requests with evidence and retention assessment; no instant delete button does not remove rights process.
- **PRV-05 through PRV-08:** DEFAULT ordinary participant retention one year after event, with separately approved financial/scientific/audit/media/verification exceptions. Cleanup database/files/media/exports/logs/backup expiry; restored data reapplies deletion/revocation. Map actual locations of database/storage/backups/app/email/model/analytics/logs and approved transfer safeguards; provider region is not compliance proof. Public media notice/rights/removal, respect contractual attribution even without credit feature. Ongoing research confidentiality.
- **SEC-01, SEC-02:** HTTPS, managed password/session controls, validation/encoding/appropriate CSRF/rate limits/accessible bot protection, ownership/assignment authorization. Supabase RLS on exposed tables/storage, sanitized reviewer data separated, no roles from editable metadata, server-only secrets/service keys; explicit view/function/direct-API tests.
- **SEC-03 through SEC-05:** Authenticated-purpose upload validation by allowlist/MIME/signature/size/malware, generated names/private quarantine/signed expiring delivery. Block executables/macros/arbitrary archives; failed scanning never publishes. Distinct stage limits, deadline requires completed upload/finalization (scan may complete after). Remediation preserves history. Hidden download controls are not confidentiality protection.
- **SEC-06, SEC-07:** Provider secret stores/rotation, pinned dependencies/reviewed changes/redacted logs, actual revoked privileges. Named incident/privacy owners for containment/evidence/access/recovery/notification assessment. Security/restore/critical-failure tests gate launch.
- **INF-01 through INF-03:** Selected managed Vercel + managed Supabase, authorized KAU collection, organization ownership O1. Framework/plans/regions/other providers unselected/unprovisioned. No Saudi-hosting assumption. Synthetic development may proceed, production locations/approvals gated. Domain/repository/teams/billing/recovery organizational with continuing/backup custodians, delegated developer access, separate site Super Admins.
- **INF-04 through INF-06:** Isolated development/staging/production secrets/data/keys, test payment/email restrictions and protected/noindex previews. Source control/reviews/tests/migrations/release approver and rollback without dropping new records. Back up database **and storage objects separately** and prove restoration. Handover schema/runbooks/access/billing/jobs/renewals.
- **INF-07, INF-08:** DEFAULT ordinary recovery objectives 24-hour maximum data loss/four-hour restoration; critical registration/deadline/event windows target 15-minute database loss/one-hour restore, budget/plan/test dependent; file target separate. Not guarantees. Monitor availability/submission/queue/payment/email/access/file-scan/check-in failures with named email responders; production never relies on a chat session.
- **NFR-01 through NFR-03:** Baseline 100 active registration/submission users; stress 1,000 public browsers with documented authenticated mix. DEFAULT agreed-mobile p75 LCP <=2.5s; normal internal API p95 <=1s excluding external/uploads/jobs. Report conditions/error rates and approved exceptions. 99.9% monthly availability objective; no planned critical-window maintenance. Cache public/static, never private personalized responses.
- **TIM-01, TIM-02:** UTC instants, Asia/Riyadh display with label. Separate auditable opening/deadline settings per workflow. Server finalize before cutoff; pre-open browser grants no late entitlement. Retain drafts and clear closed state. Authorized scoped extension records actor/reason/cutoff/notifications.
- **ERR-01, ERR-02:** Explicit recoverable states for auth/upload/autosave/edit conflict/full/expired/payment/deadline/access errors. Preserve saved work/reference/support. Retry-safe behavior and durable jobs; no false success or leaked diagnostic/private information.

## 13. Release requirements

REL-01 through REL-06 and CFG-01 through CFG-13 are release gates, not blanket blockers on safe synthetic construction.

| Gate | Evidence before opening |
| --- | --- |
| REL-01 Public site | Approved brand/content/bilingual participant navigation, accessibility, working contact/privacy/terms, secured CMS, ownership, monitoring and tested backups. Does not open incomplete participation forms. |
| REL-02 Registration/workshop | Business configuration, named approvers, KAU contract and actual confirmation procedure, financial/refund/discount rules, email, race-safe seats and ticket rejection tests. |
| REL-03 Research/review | Final fields/ethics/similarity/upload controls/PI cap/rubrics/quorum/anonymity/revision/release. Assessment additionally provider/privacy approval and evaluation; manual fallback. |
| REL-04 Hackathon/3MT | Develop known hackathon rules now; close affected stages until remaining eligibility/membership/solo-cap/source conflicts/schema/dates/terms resolved. Separate 3MT configuration. |
| REL-05 Event/certificates | Correct schedules/staff/devices/attendance and sign-off/judging/outage; then approved templates/surveys/unlinking/retention/verification/release/corrections. Separate role/competition evidence. |
| REL-06 Per-feature done | Implemented requirement; permission/state and relevant bilingual/accessibility/failure tests; audited notification behavior; staging acceptance; named operational owner/runbook; verified production configuration. |

## 14. Acceptance tests

The following are the complete S1 AT-01 through AT-18 acceptance statements, retained for implementation traceability. Their presence means required tests, not completed tests.

### AT-01 Identity.

A visitor can browse public pages. An unverified account cannot submit, register for payment, or book. An expired/reused code fails; resend and attempt limits work; valid verification succeeds once. Password recovery and privileged MFA are tested without SMS.

### AT-02 Authorization.

A participant cannot obtain another user's record by changing an ID. Reviewers cannot retrieve author identity or administrative evidence through UI, API, file links, exports, or metadata. Check-in, finance, media, and sponsorship permissions do not leak scientific/private profile data. Revoked roles fail on direct requests.

### AT-03 Approval.

Ordinary and 100%-discount registrations remain pending until a named organizer approves. Approval without payment/zero-order completion does not issue a ticket. Rejection, expiry, cancellation, and revocation produce the defined states and notification behavior.

### AT-04 Payments.

Test the actual authorized KAU interface or approved official-record reconciliation. Forged/mismatched confirmations and manipulated client prices fail. Repeated/out-of-order confirmations cannot duplicate payment credit, tickets, bookings, discounts, or refunds. A browser return or receipt screenshot alone cannot confirm payment. Late confirmation after hold expiry cannot overbook, and a refund request is not displayed as a completed refund before official confirmation.

### AT-05 Capacity.

Simultaneous requests for the final conference/workshop seat allocate at most one place. Reserved seats and active holds reduce availability correctly. Hold expiry and cancellation release exactly once. Admin approval cannot exceed capacity.

### AT-06 Waitlists.

No charge occurs on joining a waitlist. The next eligible participant receives a time-limited offer. Decline/expiry advances it once; acceptance rechecks approval, payment, eligibility, and overlap. Stale links cannot claim an already allocated seat.

### AT-07 Abstract rules.

Accept an eligible ongoing study with explicitly unavailable results and no supervisor. Enforce 300 body words with excluded metadata, both ordinary and case-report templates, English scientific content, and the two-finalized-applications-per-PI rule. A third attempt does not disqualify the existing two.

### AT-08 File stages.

Stage one accepts only applicable IRB and similarity-report PDFs within limits; it rejects presentation files. Stage two accepts configured PDF/DOCX/PPTX only after authorization. Spoofed, oversized, malicious, and macro-enabled files are rejected/quarantined. Replacing a file preserves the reviewed snapshot.

### AT-09 Review and AI.

Conflicted/unassigned reviewers cannot score. Required review quorum excludes missing scores. AI failures and injected manuscript instructions cannot publish a decision. Human independent scores, model suggestions, rubric versions, and overrides remain distinct. Provider transmission excludes prohibited identity/evidence fields.

### AT-10 Decisions and revisions.

Prepared decisions remain hidden until authorized batch publication. Only published changes trigger applicant emails, without duplicate deliveries. A revised submission must be finalized within its 14-day window or an audited extension. Expiry and email replies alone do not count as revised submission.

### AT-11 Winner condition.

Nomination and ordinary acceptance work without supervisor information. Only selecting a research award winner activates the supervisor requirement; award finalization waits for validation without cancelling the research acceptance.

### AT-12 Tracks.

A solo entrant can submit/compete without joining a team; a five-person hackathon team is allowed and a sixth member is rejected. Cross-university teams are accepted. Verify accounts at registration and request member acceptance at the post-acceptance stage. Repeated invitations do not duplicate membership. Enforce the two tracks, acceptance lock, 300-word pitch, optional prototype, and two independent reviewer assignments without applying unapproved rubric weights. Solo-capacity accounting, cross-mode duplicates, and other unresolved settings block the relevant stage until configured. 3MT retains its own rules; pre-event identities remain hidden.

### AT-13 Check-in.

Pending/unpaid/revoked, wrong-day, and wrong-workshop credentials fail. Duplicate scans do not add credit or satisfy the other conference day. Ordinary check-in does not require checkout. Workshop completion sign-off is a separate restricted, audited action. Missing hackathon-member attendance is not filled from a teammate's scan. Manual lookup/corrections and the selected outage procedure are tested on staff phones.

### AT-14 Certificates and feedback.

Full conference eligibility requires BOTH daily check-ins and the general survey; a one-day attendee receives no ordinary conference certificate. A booked workshop attendee with workshop check-in, completion sign-off, and its survey may earn that workshop certificate without earning the two-day certificate. Missing evidence blocks issuance, and generation cannot bypass administrator release. S2 completion retry tests award credit once while response records, exports, mappings, and logs retain no account-to-answer link. Public verification and revocation/reissue expose only intended certificate details.

### AT-15 Content and consent.

Unapproved media cannot publish. Consent refusal is not treated as registration rejection. Removal requests unpublish controlled assets as designed. General content publishing, private previews, bilingual pages, reduced motion, and keyboard/error handling behave as specified.

### AT-16 Reliability.

Retry after browser closure does not duplicate a submission or payment. Autosave failures are visible. Load tests meet the agreed profile/targets, queues handle decision/announcement batches, and no success message misrepresents delivery. Document measured results and any approved exceptions.

### AT-17 Recovery and privacy.

Restore both database and stored files into an isolated environment, reconcile identifiers/payments, reapply deletion/revocation records, and verify recovery time/data-loss results. Test conditional licence collection, data-request handling, export permissions, and retention cleanup with synthetic records.

### AT-18 Handover.

Verify O1 organizational ownership and authorization evidence, named custodians, selected managed Vercel/Supabase environments and approved locations, KAU collection responsibility, production/staging isolation, secret access, role offboarding, renewals, critical-window support, and completed gate values. Record an accountable sign-off for each opened workflow. Unresolved national ID/WhatsApp source discrepancies cannot silently enable new collection or automated channels.




---

# Included file: docs/DESIGN_GUIDE.md

# MSRC 2027 website design guide

Snapshot: 29 September 2026. This guide separates required experience behavior from working visual defaults. Final logo, typography, footage, public content and brand approval remain open under S1 CFG-12.

Primary references: Development Specification v0.5 (package file: docs/../sources/Development_Specification_v0.5.txt), section 15 and CFG-12 (S1); Website Brand Guide (package file: docs/../sources/MSRC27_Website_Brand_Guide.pdf), pages 1-2 (S4); prior development pack (S5); visible project conversation (S6); original [MSRC27 brand reference sheet in Canva](https://www.canva.com/d/zrujOnVYUtutnfB), with text snapshot (package file: docs/../sources/MSRC27_Brand_Reference_Canva.txt) (S8).

## 1. Design intent and status

Build a cinematic, clear conference website for The 5th Medical Students Research Conference at King Abdulaziz University, Jeddah. The public experience should communicate the event and opportunities quickly, while participant and organizer screens prioritize clear states, actions and deadlines.

| Decision | Status | Source |
|---|---|---|
| Video-led homepage, clear conference hierarchy, clean transitions and responsive buttons | REQUIRED | S1 DSN-01 |
| Native wheel, touch and keyboard scrolling | REQUIRED | S1 DSN-01 |
| Muted decorative video, poster, pause control, reduced-motion behavior and low-bandwidth alternative | REQUIRED | S1 DSN-01 |
| English default and full Arabic RTL in the applicable interfaces | REQUIRED | S1 LOC-01/03 |
| Scientific/project content in English/LTR inside either interface language; reviewer/judge assessment screens in English | REQUIRED | S1 LOC-02/03 |
| WCAG 2.2 AA accessibility target | REQUIRED TARGET | S1 ACC-01 |
| Cinematic homepage inspiration from [Slush](https://slush.org/) | USER PREFERENCE | S6 |
| General information-layout inspiration from [ESC Congress](https://www.escardio.org/events/congresses/esc-congress/) | USER PREFERENCE | S6 |
| Exact palette and English fonts below | SOURCE-CORROBORATED WORKING DEFAULT | S8 text; S4/S5 |
| Arabic font, motion timing and component styling below | WORKING DEFAULT | S4; carried into S5 |
| Final MSRC/KAU marks, footage, fonts, translations and public content | OPEN PUBLIC-LAUNCH GATE | S1 DSN-02, CFG-12 |

The inspiration links record the user's preferences. This handoff does not claim a fresh audit of either site's current implementation. Carry over the cinematic entrance and clear content organization through original MSRC layouts and assets.

## 2. Working palette

The original Canva reference sheet's text explicitly lists these five values, corroborating the generated brand guide. S8 was read as text, not visually inspected; its metadata reports an update on 29 September 2026 at 12:16:35 UTC. It also contains the tentative note "Not sure but this was in the previous designs...." Final brand approval remains open under CFG-12. Use these source-backed values as the working build baseline until the design/content owner confirms the system.

| Token | Hex | Intended use |
|---|---|---|
| Royal purple | `#3B1E6D` | Headings, primary actions, active navigation |
| Warm gold | `#C9A24A` | Main hero action, restrained accents, key details |
| Ivory | `#F8F6F0` | Reading surfaces, forms and schedules |
| Soft lilac | `#DCCFF0` | Selected tabs and supporting surfaces |
| Deep ink | `#1F1930` | Body text, video overlays and footer |

Use CSS tokens so approved refinements propagate consistently. Define semantic states for errors, success, warning, information, disabled controls and focus when building components; those additional color values are currently unselected.

S4 page 1 reports these contrast ratios: ivory on purple 12.20:1; ink on gold 7.06:1; gold on solid purple 5.49:1; gold on ivory 2.22:1. Recheck the actual rendered combinations. Gold on ivory is decorative rather than ordinary body text. Check text over representative bright and dark video frames, including the paused poster.

## 3. Working typography and identity

| Use | Working default |
|---|---|
| English headings and buttons | DM Sans 600/700 |
| English body, dates and schedules | Inter 400/500 |
| Arabic interface | Noto Sans Arabic |
| Body baseline | 16-18 px with generous line height |
| Tracking | Normal body tracking; spaced capitals only for short English labels |

S8 explicitly names DM Sans SemiBold/Bold for headings and Inter Regular/Medium for body text. Noto Sans Arabic, body sizing and tracking guidance are extensions in S4, rather than details corroborated by S8. Final font approval and font licensing remain part of brand delivery. Test Arabic glyphs and weight parity on real bilingual screens. Do not force Latin tracking conventions onto Arabic.

Use source logos with original proportions and approved colors. Keep institutional marks in a clear logo strip. The brand PDF's clear space of 25% of mark height is a proposal; official mark guidance takes precedence. Do not treat the text wordmark in the illustrative PDF as the final MSRC 2027 logo.

Use one quiet wave motif at section edges and the footer. Typography, photography, spacing and hierarchy should carry the composition. The starter pack recommends an editorial feel and avoiding generic medical-blue styling, stock-doctor imagery, excessive gradients, glassmorphism and repeated card grids. Dark mode is outside committed scope under S1 DSN-02.

## 4. Homepage and information hierarchy

The following sequence is a working composition from S5. Adjust it around approved content and the current stage of the conference:

1. Video/poster hero with conference identity and one clear primary action.
2. Approved date and location summary, or clear forthcoming information.
3. Purpose and conference highlights.
4. Scientific program preview and approved featured speakers.
5. Research, hackathon and 3MT opportunities.
6. Important dates with server-consistent Asia/Riyadh presentation.
7. Past-edition legacy and approved historical media.
8. Sponsors and institutional marks.
9. Relevant final action and footer.

The public site must also support the required About, Dates/Venue, Program, Speakers, Workshops, Participation/Submission Guidelines, Teams/Committees/Board, Sponsors/Sponsorship, Gallery/Past Editions, Announcements, FAQ, Contact, Privacy and Terms pages (S1 SCP-02). The original Canva sheet includes a sample Research Programme with times. Treat that as reference-sheet sample content, not the approved 2027 schedule.

Build the useful minimum for each approved page. Hide empty editorial sections, use honest forthcoming states, and keep navigation working. Do not turn planning estimates, prior-edition speakers, old sponsors, draft prizes, unconfirmed dates or a screenshot's Register button into current public facts or live workflows. All public information and workshop availability remain browseable without login.

## 5. Hero implementation

Build in this order:

1. Static poster, semantic text, responsive crop and working navigation/action.
2. Keyboard-accessible pause/resume control and a stable still-image mode.
3. Reduced-motion and low-bandwidth behavior.
4. Approved compressed muted video.
5. Mobile crops, loading checks, frame contrast and performance review.

Working visual treatment: ink/purple overlay, ivory heading, restrained gold primary action and optional secondary informational link. The action should match the currently open workflow. During the informational release, it can lead to approved program or participation information. Decorative media must never delay access to content or registration.

The brand PDF's desktop illustration uses an image identified as past-edition material from Main File page 12. It is a design illustration, not a selected or cleared hero asset. See MEDIA_REGISTER.md (package file: docs/MEDIA_REGISTER.md) for actual media status.

## 6. Motion, layout and interaction

| Behavior | Working default or required boundary |
|---|---|
| Scrolling | Native browser wheel, touch, drag and keyboard behavior; no scroll hijacking |
| Anchor movement | Smooth only when appropriate; respect reduced motion |
| Button feedback | 180 ms transition; 1-2 px hover lift; 98% press scale |
| Reveals | One 400 ms fade with up to 12 px rise |
| Reduced motion | Remove nonessential transforms/reveals and show a static hero |
| Touch controls | Working minimum 44 px targets |
| Keyboard | Visible focus, logical order, accessible menus/dialogs |
| Content resilience | Content remains available if media or animation fails |

Motion timings and dimensions are defaults from S4/S5, not final institutional brand rules. Repeated reveals, scroll-driven blocking and media-dependent navigation would violate the intended experience.

Use responsive type, generous whitespace, editorial content splits and program rows. Stack entry points on small screens. Operational forms need visible labels, field-level feedback, error summaries, saved-state feedback and clear recovery actions. Do not convey a state solely through color.

## 7. Bilingual behavior

English is the default. Public, authentication, participant and non-review organizer interfaces support Arabic with full RTL. Submission form instructions, labels and errors follow that bilingual interface requirement. The scientific/project content itself must be English and its fields remain LTR inside Arabic pages. Author names and official institution names may retain their correct original spelling. Reviewer and faculty-judge assessment screens are English-only; transactional emails are English-only (S1 LOC-01/02/03).

Use logical layout properties, mirrored directional navigation where meaningful, and controlled handling for email addresses, codes, numbers and mixed-language names. Preserve form data and workflow state on language changes. Required public fields need translations or a deliberately configured fallback; do not ship broken switches or mixed-language navigation (S1 CMS-04).

Arabic parity includes mobile menus, form errors, tables, dates, statuses, dialogs and empty states. The RTL version should receive the same layout review as English. The accessibility target is WCAG 2.2 AA; assess keyboard, focus, semantics, labels, contrast, text resizing and screen-reader feedback as well as visual layout (S1 ACC-01).

## 8. Components and visual review

Start with tokens, type, container/section, header, mobile navigation, footer, buttons, links, language switch, hero, section heading, program row and content split. Add speaker/sponsor components and form/status/table controls when their slices need them. Keep layout fixed and content structured for the CMS (S1 CMS-01).

Maintain a development/staging component page demonstrating English/LTR and Arabic/RTL, desktop/mobile, focus, disabled, loading, error and empty states. Secure any private content or privileged demonstrations. A CMS editor requires staff authentication and authorization before being enabled, even when participant signup is scheduled for a later milestone.

For each significant visual slice, record representative desktop/mobile and LTR/RTL screenshots, keyboard and reduced-motion checks, and any unfinished content. Use proportionate checks for small copy/style changes. Public launch still requires the gate below.

## 9. Design and media launch gate

- [ ] Design/content owner approves logo, palette, fonts and public composition.
- [ ] Required English/Arabic content and translations are approved.
- [ ] Dates, venue, speakers, sponsors, committees and CTA destinations are correct for 2027.
- [ ] Final hero poster/video and gallery assets have explicit publication approval and permissions.
- [ ] Native scrolling, keyboard focus, mobile layouts and reduced motion pass review.
- [ ] Hero text remains readable across frames and still-image modes.
- [ ] Closed operational features show accurate informational states.
- [ ] Draft previews remain private and unindexed.
- [ ] Approved media derivatives load efficiently; original files remain appropriately restricted.
- [ ] Privacy/contact/removal routes and archive responsibilities are configured.

This checklist implements S1 DSN-01/02, MED-01/04, CMS-04, CFG-12 and the public-release gate. Its items remain unverified until implementation and approval evidence is recorded.



---

# Included file: docs/ARCHITECTURE.md

# Architecture and implementation baseline

## Decisions versus recommendations

| Layer | Baseline | Authority |
|---|---|---|
| Application hosting | Managed Vercel | Selected, S1 INF-01 |
| Database, identity, private files | Managed Supabase | Selected, S1 INF-01 |
| Payment collection | Existing authorized KAU arrangement through a verified integration or approved reconciliation procedure | Selected P1; contract pending, PAY-01 to PAY-08 |
| Ownership | Organizational MSRC/RPClub accounts with institutional authorization | Selected O1; evidence/custodians pending |
| Web framework | Next.js App Router, TypeScript, Tailwind | Recommended in S5, not a confirmed product mandate |
| Package management | pnpm with committed lockfile | Recommended in S5 |
| Local data environment | Local Supabase with a compatible container runtime | Recommended in S5; verify machine support |
| Tests | Vitest, appropriate component tools, Playwright, database policy tests | Recommended tooling; verify compatibility at foundation time |
| Email, malware scanning, advisory assessment, analytics | Provider selection and approved configuration required | Unresolved CFG-10 |
| Versions, regions, plans, budget | Choose and record explicitly before relevant provisioning | Unresolved; no claims of Saudi hosting |

Do not substitute a new payment merchant or a third-party hosted video embed for the selected scope. Do not create paid resources simply because this document names a provider.

## Recommended application layout

Use one maintainable codebase with feature boundaries. The layout below is a proposal for the foundation, not evidence of files already built.

```text
src/app/[locale]/          public, auth, dashboard, admin, reviewer, check-in routes
src/components/           shared accessible interface and brand components
src/features/             content, accounts, submissions, review, registration,
                          orders, workshops, hackathon, 3mt, attendance,
                          surveys, certificates, reporting
src/lib/                  permissions, database clients, validation, i18n,
                          payment adapter, email, durable jobs, audit
supabase/                 migration history, seed data, policies, database tests
tests/                    scoped integration and end-to-end coverage
docs/                     product decisions, feature contracts, release evidence
```

Authenticated interfaces still require server and database checks. URL groups and hidden buttons are organizational aids, not permission boundaries.

## Data domains

Preserve the source's separate records. [S1 DAT-01 to DAT-04]

- Identity: managed account, profile, edition-scoped grants, scoped assignments, consent, privacy/support-request evidence.
- Science: submission, immutable version, author and affiliation order, PI/corresponding/presenter responsibility, attachments, administrative validation, rubric version, review assignment, conflict, human review, assessment suggestion, revision, prepared decision, publication batch, presentation allocation, judging, award.
- Operations: registration, order and item snapshots, payment attempts and official reconciliation evidence, refund progress, discounts/redemptions, workshop, holds, waitlists/offers, booking, ticket, daily/activity attendance and correction, workshop completion sign-off.
- Feedback and certificates: participant-linked survey completion ledger, separately stored unlinked answers, eligibility, template, release batch, protected certificate file, opaque verification code and validity.
- Content/communications: rooms/sessions/speakers, content revision/publication, media approval and consent evidence, sponsor inquiries, email jobs, audit events.
- Hackathon: project entry, solo/team mode, registered roster, pre-event review, committee acceptance, post-acceptance member confirmation, participant-level compulsory activity evidence.

The feedback domain requires a privacy-reviewed unlinking design. Merely putting identity and answers in separate tables is insufficient if tokens, mapping tables, timestamps, logs, or exports reconnect them. Do not invent a completion-token protocol without evaluating retry behavior and unlinkability. [CRT-02]

## Mutation contract

Every consequential operation should specify: actor and scope, allowed source state, server validation, new state, concurrency/idempotency behavior, audit record, queued notification, and recovery path. [API-01 to API-03]

Examples:
- Approval allocates an available seat atomically; financial completion is a separate condition for a confirmed ticket.
- A finalized submission is an immutable snapshot; a revision creates a new snapshot and re-review is explicitly decided.
- A decision may be prepared internally. Only authorized publication changes the applicant-visible outcome and creates decision emails.
- A workshop waitlist offer rechecks eligibility, overlap, approval, and financial completion before confirmation.
- Repeated scans cannot create duplicate attendance or satisfy another day.

Use server time for all deadlines. Store instants in UTC; display Asia/Riyadh. Allocate scarce seats transactionally and use explicit edit-version checks for competing updates.

## Integration boundaries

### KAU payments

Define a provider-independent adapter contract after reviewing the real KAU interface. During development use synthetic mock transactions and display their test status. Do not invent callback fields or webhook support. Positive-value confirmation requires authenticated official system evidence or authorized reconciliation against the KAU record, matching order, amount, currency, and reference. A redirect or uploaded receipt is insufficient. Late payment after hold expiry requires reconciliation/refund handling without overbooking. [PAY-04 to PAY-07]

### Email and jobs

Use durable persisted jobs with deduplication keys, bounded retries, delivery status, and authorized replay. Keep console/test-recipient mode in local/staging work. Transactional messages are English-only. Queued, provider-accepted, delivered, and failed states must be distinct. [EML-01 to EML-05]

### Advisory assessment

Use a separate job interface that receives approved sanitized science content and returns validated rubric-shaped suggestions. Keep disabled until provider/data/evaluation/cost approvals. Separate human independent reviews from suggestions and committee outcomes. Provider failure falls back to permitted human review. No model output may publish an outcome. [AI-01 to AI-06]

### Files and media

Separate confidential stage-one evidence, authorized stage-two materials, private media originals, and approved public derivatives. Use purpose-specific allowlists, quarantine and scanning, private storage, expiring authorized downloads, and version history. Blind reviewers never receive identity-bearing administrative evidence. [ABS-09 to ABS-15; SEC-03 to SEC-05; MED-01 to MED-04]

## Environments and configuration

| Environment | Data and integrations | Opening state |
|---|---|---|
| Local | Synthetic data; local database where supported; mock payments; console email | Test paths only |
| Preview/staging | Isolated test accounts/storage; recipient-restricted email; approved sandboxes/mocks | Restricted and excluded from indexing |
| Production | Approved ownership/regions/secrets/providers; real processing only after gates | Each workflow separately enabled |

Configuration must distinguish approved business values from engineering defaults. Suggested feature flags: auth, CMS editing, abstracts, advisory assessment, registration, payments, workshops, hackathon, 3MT, check-in, surveys, certificates. All operational flags start closed. Public static content rendering can work without enabling CMS editing. Enforce flags on server operations as well as interface controls.

Keep secret values outside the handoff and source control. Use an implementation-generated `.env.example` containing names and explanations only. A public client key is not a substitute for explicit table/storage grants and row-level authorization. Verify current official APIs, package/runtime support, and installed CLI help at implementation time. [S1 SEC-02/06; S5]

## Operational design before release

- Name responders for service, payment exceptions, queued email, submission failure, file scanning, and check-in.
- Back up database records and actual file objects separately; rehearse restoration of both.
- Preserve deletion/revocation instructions through restore and reconcile outstanding orders/submissions.
- Keep rollback instructions aware of newly received data; redeploying old code is different from discarding database writes.
- Separate annual operational data/configuration while retaining approved archive and certificate verification continuity.

The source's availability/performance/recovery values are objectives to test, not achieved results or provider guarantees. [INF-06 to INF-08; NFR-01 to NFR-03; ARC-02]



---

# Included file: docs/ROADMAP.md

# Development roadmap

**Status at handoff:** documentation prepared; implementation has not been verified. This order reconciles the previous starter pack with S1 v0.5. It retains the selected scope and opens each workflow only when its own dependencies are complete.

## Milestones

| ID | Deliverable | Minimum evidence before advancing |
|---|---|---|
| M0 | Ownership record, decision register, source baseline, task board | Named owners or explicit gaps; development may proceed with synthetic data |
| M1 | Reproducible local app, selected dependency versions, local data setup, test commands, CI definition | Clean install, local start, targeted tests and build run; untested remote checks labeled |
| M2 | Design tokens, shared components, English/Arabic, RTL, accessible motion and video states | Desktop/mobile/keyboard/RTL/reduced-motion visual review |
| M3 | Public route shell and homepage alpha with typed content | All planned public routes navigable; no invented event facts or open operational buttons |
| M4 | Staff identity and permissions, structured CMS, safe previews and media approval | Privileged MFA and access tests before CMS writes; translations and publication rules verified |
| M5 | Participant verification, profile, dashboard, support, shared role boundaries | OTP/recovery/session and own-record/denied-access tests pass |
| M6 | Abstract draft through administrative review, blinded review, revision and published decision | Complete human workflow and S1 REL-03 evidence; advisory assessment separately gated |
| M7 | Registration, official payment/reconciliation adapter, discounts, workshops/waitlists, ticket issuance/dashboard/revocation | Approval/payment/capacity failure paths; actual KAU evidence and REL-02 |
| M8 | Hackathon and separate 3MT modules | Each competition's approved rules and stage-specific gate; no guessed quotas/rubrics |
| M9 | Staff scanning, daily/activity evidence, workshop sign-off, event judging | Rehearsal on staff phones and tested outage procedure |
| M10 | Unlinked feedback with completion evidence, certificates, verification, archive/retention | Privacy/retry tests, eligibility/release/revoke tests, approved templates and retention |
| M11 | Final recovery rehearsal, monitoring/runbook consolidation, renewal and annual handover | Organizational sign-off and complete operational evidence |

**Dependency correction:** M4 includes staff authentication and authorization. The later M5 milestone expands participant account flows; CMS editing cannot be exposed while waiting for M5. Public read-only content is distinct from authenticated CMS administration.

Ticket issuance, dashboard access and revocation are required for M7 registration opening; M9 adds staff scanning and event evidence. Minimum monitoring, operational runbooks and tested recovery belong before each live release. M11 consolidates and rehearses them for final handover.

Attendance and retention schema decisions must be completed before evidence is collected, even if the certificate interface ships later. Design, source reconciliation, synthetic prototypes, and technical foundations can proceed while business inputs are pending.

## Release sequence

| Release | Candidate scope | Opening gate |
|---|---|---|
| A | Approved informational public site and secured content editing | REL-01; approved public copy/brand/ownership/privacy/contact |
| B | Accounts and complete human abstract workflow | REL-03 plus production identity/data processing approval |
| C | Registration, collection, discounts, workshop booking/waitlists and valid participant tickets | REL-02; verified KAU collection/reconciliation and financial terms |
| D | Hackathon and 3MT, independently opened | REL-04 and each stage's configuration |
| E | Event scanning, evidence and judging | Event portion of REL-05 |
| F | Feedback, certificates, archive, retention and annual transition | Certificate portion of REL-05, privacy controls, M11 handover |

The sequence is a recommended delivery order. Exact calendar dates depend on confirmed conference/application deadlines, available development capacity, and the operating team's decisions. No new delivery dates are promised by this package.

## First eight development tasks

| Task | Concrete work | Acceptance | Dependency |
|---|---|---|---|
| F01 | Inspect actual folder/repository/tooling; record baseline and available access | No existing work overwritten; runnable state and gaps reported | Handoff |
| F02 | Record framework/runtime/package choices; scaffold minimal app if absent | Clean local start and production build | F01 |
| F03 | Add English/Arabic route/layout structure, native direction, error/loading conventions | Route switches preserve intended destination; keyboard and RTL smoke review | F02 |
| F04 | Add typed configuration and closed operational feature flags | Server and UI refuse disabled operations; unknown dates/prices stay unknown | F02 |
| F05 | Establish local Supabase, synthetic seed strategy, safe client boundaries | Local-only connection verified or concrete environment blocker recorded | F02 |
| F06 | Add project scripts and appropriate CI definition | Checks actually executed locally; remote CI only claimed when observed | F02-F05 |
| F07 | Build tokens and shared header/footer/button/form states | Working design defaults labeled; accessible components reviewed | F03 |
| F08 | Build homepage and public content shell | Poster/video fallback; approved or clearly synthetic content; mobile/RTL review | F04, F07 |

F05 may run in parallel with visual work after agreeing client/configuration boundaries. Do not block a static design preview because a production integration is unavailable.

## Feature work template

Each issue should contain source requirement IDs, actor and permission scope, approved states, fields/validation, unresolved values, acceptance criteria, required failure tests, audit/email effects, language/accessibility behavior, release gate, owner, and rollback/data implications. Use prompts/03_FEATURE_AND_REVIEW.md (package file: docs/../prompts/03_FEATURE_AND_REVIEW.md).

## Polish cycle

After each usable slice: inspect on mobile and desktop; check Arabic directionality and long labels; review keyboard/focus/errors; test slow/failed requests; optimize the largest measured bottleneck; correct approved copy; then record evidence. Avoid broad redesigns during submission, registration, and event-critical windows unless a specific problem requires one.

## Working ownership

Akram directs product choices and coordinates organizer decisions. Technical, scientific, finance, workshop, hackathon, privacy, and release roles must be assigned to named people in `OWNERSHIP_AND_SETUP.md`. Role labels here do not grant access or claim that those people have accepted responsibilities.



---

# Included file: docs/PROGRESS.md

# Progress and session handover

**Snapshot: 29 September 2026. Update this file after each development task.**

## Current evidence

| Item | Observed status |
|---|---|
| Main File PDF | Reviewed, including all-page visual coverage and extracted text |
| Live Development Specification v0.5 | Read and archived as a dated source snapshot |
| Updated Hackathon Draft | Read and reconciled; options and conflicts preserved |
| Brand guide and previous starter pack | Reviewed; recommendations distinguished from approvals |
| Original Canva brand reference sheet | Text read; palette and English font names corroborated, final brand approval still pending |
| 2026 media folder | Readable metadata inspected; no footage downloaded or rights cleared |
| Codex handoff documents and prompts | Prepared in this package |
| Domain purchase | Reported in project conversation; current account/DNS/renewal not inspected |
| GitHub repository / application code | Not inspected or created in this task |
| Local development installation | Not performed |
| Vercel/Supabase projects / production secrets | Not inspected or provisioned |
| Tests / CI / preview / production deployment | Not run or established by this task |
| KAU collection access / email sender | Not verified |

## Milestone status

| Milestone | Requirements/planning | Implementation | Release |
|---|---|---|---|
| M0 Governance | Baseline and decision register prepared; named owners/evidence pending | Organizational setup unverified | Pending |
| M1 Foundation | Starting prompt prepared | Not verified | Pending |
| M2 Design system | Working defaults prepared; final approval pending | Not verified | Pending |
| M3 Public alpha | Page scope defined | Not verified | Pending |
| M4 Staff auth/CMS | Requirements defined | Not verified | Pending |
| M5 Participant auth | Requirements defined | Not verified | Pending |
| M6 Abstract/review | Detailed baseline; configuration gates remain | Not verified | Pending |
| M7 Registration/workshops | Detailed baseline; finance and capacity inputs remain | Not verified | Pending |
| M8 Competitions | Hackathon partly decided; 3MT configuration pending | Not verified | Pending |
| M9 Event operations | Required evidence identified; procedures pending | Not verified | Pending |
| M10 Certificates/archive | A1/S2 selected; templates/privacy implementation pending | Not verified | Pending |
| M11 Handover | Requirements identified | Not verified | Pending |

Do not convert this table to percentage completion without observable evidence. The earlier tracker is a blank template and does not establish implementation.

## Next task

Use `prompts/01_START_FOUNDATION.md`. Inspect the actual development folder, record the engineering choices, and implement M1 using synthetic content. Final event dates, production payment credentials, final judging rubrics, and the logo are not prerequisites for this reversible local foundation.

## Session handover template

```markdown
### Date / task / branch or revision
Requested outcome:
Source requirement IDs:
Completed change:
Files and migrations:
Commands run and observed results:
Visual checks / preview:
Checks not run and why:
Decisions made or changed, with authority:
Outstanding blockers and owner:
Feature flags / configuration changes:
Release status and evidence:
Next smallest task:
```

## Evidence status vocabulary

- PASS: actual check performed with recorded evidence.
- FAIL: actual check found a defect.
- BLOCKED: named dependency prevents performing the check or opening the flow.
- NOT TESTED: no execution evidence yet.
- PROPOSED: design/engineering choice awaiting adoption or approval.
- SELECTED: organizer chose the approach; implementation/authorization still separately evidenced.

## Change log

- v1.0, 29 September 2026: consolidated current sources, added durable Codex instructions, corrected CMS identity sequencing, retained unresolved source conflicts, and prepared staged development prompts. No live application or infrastructure changes.



---

# Included file: docs/ACCEPTANCE_AND_RELEASE.md

# Acceptance and release evidence

This file preserves S1 section 22 release gates. The complete eighteen acceptance scenarios are in REQUIREMENTS.md (package file: docs/REQUIREMENTS.md) and source section 24. No application check was performed during handoff compilation.

## Current release gates

REL-01. Public-site gate: approved branding/core content, bilingual participant navigation, accessibility checks, working contact/privacy/terms, secured CMS, verified ownership, monitoring, and tested backups. An informational public launch does not authorize opening unfinished participation workflows.

REL-02. Registration/workshop gate: prices, capacity, manual approvers, hold/payment windows, discounts, named KAU collection owner and verified integration/reconciliation contract, refund rules, tested email, race-safe allocation, and valid-ticket enforcement. All critical payment/approval failure scenarios must pass before accepting real money or issuing tickets. Selecting P1 does not bypass proof of the actual collection and confirmation procedure.

REL-03. Submission/review gate: final field schemas, study-stage templates, ethics/similarity policy, upload security, submission limits, reviewed rubric/quorum, reviewer anonymity, revision logic, and decision release controls. AI production use additionally requires provider/privacy approval and a recorded assessment evaluation; manual review remains the failure fallback.

REL-04. The hackathon's two tracks, solo/team participation, five-member maximum, and answered event structure may now guide development. Remaining eligibility wording, cross-mode membership rules, finalist-capacity accounting, source conflicts, form/file details, deadlines, and public terms must be resolved before the affected stages open. 3MT retains its separate unresolved settings. Keep clear not-yet-open states and do not replace unapproved rubric/fee/prize options with invented values.

REL-05. Event gate: correct program/rooms, valid rosters/tickets, trained staff, device tests, daily check-in and workshop completion-sign-off procedures, hackathon compulsory-activity evidence, judging configuration, and rehearsed outage handling. Certificate gate: approved full two-day/workshop templates, survey question sets/deadlines, tested S2 unlinking and completion handling, retention/public verification policy, administrator release, and correction/revocation tests. Ordinary eligibility is defined in CRT-01, not deferred as an unknown attendance threshold. Role/competition certificates require separate approval.

REL-06. Definition of done for each feature: requirement implemented; permission and state-transition tests passed; relevant Arabic/English/accessibility checks passed; failure paths tested; audit/email behavior verified; staging acceptance recorded; operational owner/runbook assigned; and production configuration verified. A successful demonstration of the happy path alone is insufficient.

## Evidence record for each gate

| Requirement | Status | Actual evidence | Owner | Remaining action |
|---|---|---|---|---|
| Applicable REL / AT ID | NOT TESTED | Add command/result, preview, configuration or approval record | Assign | State concrete next check |

Use PASS only after actual execution/inspection. Use FAIL for an observed defect, BLOCKED for a named dependency, and NOT TESTED when no check has run. Record the revision, environment, data type, date, and operator. A mock proves behavior under its simulated contract; it does not establish real KAU payment integration.

## Acceptance map

| Source test | Area |
|---|---|
| AT-01 | Identity, verification, recovery and MFA |
| AT-02 | Authorization and confidentiality |
| AT-03 | Approval and admission entitlement |
| AT-04 | Actual KAU confirmation/reconciliation and refunds |
| AT-05 | Concurrent seat allocation and release |
| AT-06 | Waitlists and stale offers |
| AT-07 | Abstract eligibility, body limit and PI limit |
| AT-08 | Distinct upload stages, security and snapshots |
| AT-09 | Review conflicts, quorum and advisory assessment |
| AT-10 | Published decisions and revisions |
| AT-11 | Winner-only supervisor requirement |
| AT-12 | Hackathon solo/team rules and independent 3MT |
| AT-13 | Daily/activity scanning and completion evidence |
| AT-14 | Certificate eligibility and feedback unlinking |
| AT-15 | Content approval, consent and accessible bilingual UI |
| AT-16 | Retry behavior, queues, load and reliability |
| AT-17 | Database/object restore, requests and retention |
| AT-18 | Organizational ownership, access and annual handover |

## Proportionate development verification

For a code slice, run the relevant build/type/lint checks and tests needed to resolve its concrete risks. Permission-sensitive work needs denied-access tests. Capacity/payment work needs concurrency and retry tests. Submission/review work needs versioning/anonymity tests. A small copy or style change normally needs targeted content/visual checks. Complete all applicable release gates before opening the affected workflow.

## Release record

```markdown
Release / exact revision:
Scope and workflow flags:
Approver / operational owner:
Environment and actual target:
Completed REL / AT evidence:
Outstanding limitations:
Migrations and configuration changes:
Smoke-check results:
Monitoring and incident coverage:
Rollback / data reconciliation:
Next review:
```

A public informational release does not open registration, collection, submissions, or other incomplete operational flows. The full selected scope remains on the roadmap.



---

# Included file: docs/OWNERSHIP_AND_SETUP.md

# Ownership and setup checklist

This is a setup register, not evidence that accounts or integrations already exist. O1 organizational ownership, managed Vercel/Supabase, and P1 KAU collection are selected in S1. Named owners and institutional evidence still need recording.

## Account and responsibility register

| Item | Required record | Current status |
|---|---|---|
| Domain and DNS | Registrar account custodian, organization control, renewal date/responsibility, recovery and DNS access | User reports purchase of msrc2027.com; live status unverified |
| Repository | Organizational GitHub owner, repository URL, access roles, reviewed-change policy | No repository inspected or created |
| Vercel | Organizational team/project, plan, region/data flows, billing and recovery | Provider selected; provisioning unverified |
| Supabase | Organizational owner, isolated staging/production projects, regions/plans, backups/access | Provider selected; provisioning unverified |
| KAU collection | Responsible unit/contact, official payee/system, authorized confirmation or report-reconciliation procedure | Route selected; details pending CFG-02 |
| Email | Provider, branded sender, monitored Reply-To, tested inbox routes, DNS verification | Candidate configuration only; no sender verified |
| Continuing custodian | Name, acceptance of role, access and annual handover responsibility | Unassigned in this handoff |
| Backup custodian | Name, recovery responsibilities and access | Unassigned |
| Release approver | Name and scope of authority | Unassigned |
| Website Super Admins | Exactly three named individually identified accounts; MFA and recovery | Names pending; roles distinct from infrastructure owners |
| Scientific/hackathon/3MT/workshop/finance/privacy/operations owners | Named accountable people for each CFG group | Role labels only; assign in DECISIONS |
| Event support | Contact, cover schedule, outage and escalation ownership | Pending |

No passwords, API keys, recovery codes, session tokens, or private credentials belong in this register. Keep approved access in the organization's chosen credential/access system.

## Local setup sequence

1. Open the handoff folder or existing repository in Codex and run the starting prompt.
2. Inspect the computer/environment before installing anything. Record operating system, existing code, Git state, runtime/package manager, and available container tooling.
3. Verify current official framework requirements and select compatible supported runtime/dependency versions. The old starter's `Node.js 20+`, `@latest`, Corepack, and CLI commands are historical examples, not a version audit for this handoff.
4. Record the engineering stack decision, generate the application and scripts, and commit the lockfile when repository access is established.
5. Use local synthetic data and mock integrations. If local containers are unavailable, document the blocker and continue frontend/configuration work while arranging an approved isolated development environment.
6. Produce readable instructions for starting, building, testing, and resetting only the local synthetic environment. Do not run resets against an unverified database target.
7. Add a reviewed-change workflow and appropriate CI. Distinguish a CI file written from a remote run observed to pass.

## Production setup sequence

1. Complete named organizational ownership, recovery, billing and authorization evidence.
2. Review actual service data flows, plans, processing regions and required approvals before production provisioning.
3. Establish isolated staging and production configuration; keep operational flags closed.
4. Verify email sender/domain controls and tested support destinations.
5. Obtain the actual KAU integration/reconciliation process before enabling payment collection. Test synthetic/sandbox outcomes, mismatches, duplicates, failures and late settlement.
6. Rehearse database and object-file restoration, role offboarding, and incident handling.
7. Obtain the named release decision for the specific approved site/workflow. Configure domain/DNS only as part of an authorized deployment task.
8. Record release evidence, renewal ownership, monitoring coverage, rollback and annual transition instructions.

## Support routing from current specification

These are source-defined destinations to configure and test, not mailboxes verified by this handoff. Labels in the shared inbox do not enforce committee access controls. [S1 SUP-01 to SUP-03]

| Category | Destination |
|---|---|
| General | MSRC27kau+generalinquiry@gmail.com |
| Scientific | MSRC27kau+scientificinquiry@gmail.com |
| Hackathon | MSRC27kau+hackathon@gmail.com |
| Workshop | MSRC27kau+workshop@gmail.com |
| Sponsor | MSRC27kau+sponsor@gmail.com |
| Technical | MSRC27kau+technical@gmail.com |

`noreply@msrc2027.com` is a candidate sender convention in S1 EML-02. Domain ownership alone does not establish a working sender or mailbox. All platform notifications are email-only, with English transactional templates.



---

# Included file: docs/MEDIA_REGISTER.md

# MSRC 2027 media register

Snapshot: 29 September 2026. Sources: S1 Development Specification v0.5 section 15 and CFG-12; S3 Main File PDF; S4 generated brand guide; S6 visible project conversation; S7 connected Drive metadata inventory; S8 original Canva brand reference sheet.

The supplied media folder is readable through the connected Drive integration. Its listing was inspected without downloading or viewing the individual photo/video assets. No hero clip, crop, poster or gallery selection has been approved through this handoff.

## 1. Source collection

Primary folder: [Without frame](https://drive.google.com/drive/folders/1wkez3zex5RiTc3dM85s9QLO07rpLrsEu), supplied by the user as MSRC 2026 footage for website development. Folder modified timestamp returned by Drive: 25 January 2026. This timestamp does not establish each asset's date or rights.

The 29 September inventory listed six immediate folders and inspected up to 100 direct children per folder. Counts below are returned metadata counts, not a recursive total. Four folders reached the limit and may have more items. Nested photo/video folders were identified but not fully inventoried.

| Folder | Direct items returned | Observed metadata | Inventory limitation |
|---|---:|---|---|
| [Rania Al alshaikh](https://drive.google.com/drive/folders/1-F6IOCi_i8KSvjqPYQjCzmwZccXq43Do) | 100 | 59 JPEG, 40 HEIF, one Video folder | Reached limit; nested folder not fully inspected |
| [Jana](https://drive.google.com/drive/folders/1nam2lYGLZVclN5RJ0LdDVd7KndwajdLn) | 100 | 100 JPEG | Reached limit |
| [Mohammed jalal](https://drive.google.com/drive/folders/10_npBxlLrDyLTMbYvCpDXTc60iXsa0m3) | 2 | Pic and Video folders | Nested contents not fully inspected |
| [Sanaa Refai](https://drive.google.com/drive/folders/1Gu9WY-Jo_O4rySvmuORP0KSyMOMVIa5r) | 100 | 100 QuickTime videos | Reached limit |
| [Majed](https://drive.google.com/drive/folders/1MLDyhCfPlseNtKf1UnPdgTYtE29d9vII) | 58 | 11 QuickTime videos, 47 HEIF | Direct listing only |
| [Habibah](https://drive.google.com/drive/folders/1lgL4JZSobpI5Ui1f96SxF4dy0Gg_3Wob) | 100 | 4 QuickTime videos, 96 JPEG | Reached limit |

Identified nested collections:

- [Rania Video](https://drive.google.com/drive/folders/1blR_E3ScnFnVa4H6kycKMF6QehhvNcAu).
- [Mohammed Pic](https://drive.google.com/drive/folders/1c20_tb1Pnpe3dme6b-jGY-6APwy1JP2b).
- [Mohammed Video](https://drive.google.com/drive/folders/1YvrfupumH2eK9EFRsC9RcePui7WHGIbL).

Read access is established for the inventory reviewed. It does not establish publication rights, bystander consent, permission to repurpose every clip, or future unauthenticated access. Preserve folder access controls; do not make the collection public as a shortcut for website delivery.

## 2. Deliverable register

| Asset or group | Current status | Intended next use |
|---|---|---|
| Final MSRC 2027 logo and variants | Required input; final source/approval unverified | Header, footer, metadata and event branding |
| Approved KAU/institutional marks | Source files and usage guidance required | Institutional strip and approved placements |
| Source brand reference sheet | Located in Canva; text read and palette/English fonts corroborated; visual review and final approval pending | Confirm final identity and source assets |
| Generated Website Brand Guide | Two pages reviewed; working direction | Development defaults; see DESIGN_GUIDE.md (package file: docs/DESIGN_GUIDE.md) |
| Main File PDF imagery | Historical/reference material; not a cleared asset collection | Identify candidates and request/use proper originals |
| Drive past-edition photos/videos | Partial metadata inventory only | Shortlist after visual review and rights check |
| Homepage hero video | Not selected, edited, optimized or approved | Select authentic footage and create responsive derivatives |
| Homepage poster | Not selected or approved | Build static-first hero before video integration |
| Speaker/committee portraits | 2027 approval and source files required | Approved profiles; no private contact data |
| Sponsor logos | 2027 participation and logo approval required | Current sponsor tiers and profiles |
| Gallery albums | Not selected or published | Approved edition/activity albums |

The brand PDF's mockup identifies its photo as a past-edition image from Main File page 12. That illustrates a visual direction. Do not extract it as the final hero simply because it appears in the guide. Past-edition people, figures and organizations must not be presented as confirmed 2027 participation.

Original reference: [MSRC27 brand reference sheet](https://www.canva.com/d/zrujOnVYUtutnfB), Canva design `DAHWgMSGq3E`, text snapshot (package file: docs/../sources/MSRC27_Brand_Reference_Canva.txt) (S8). Metadata reports an update on 29 September 2026 at 12:16:35 UTC. Its text confirms the five palette values plus DM Sans and Inter; it also includes a tentative note about previous designs. It was read without visual inspection or edits. Sample Research Programme times are reference content, not a confirmed 2027 program. Noto Sans Arabic remains a working extension from S4. CFG-12 still requires final brand approval.

## 3. Media handling requirements

Preserve S1 MED-01 through MED-04:

- Organizers upload to approved storage. The baseline excludes third-party video embeds.
- Display only explicitly approved assets. Ordinary copy publishing permission does not remove the separate media approval action.
- Keep justified originals private and serve optimized derivatives, thumbnails and responsive images/video.
- Accepted gallery input defaults are JPEG/PNG/WebP and MP4/WebM. The observed HEIF and QuickTime files are source material requiring compatibility review and conversion before deployment.
- Exact file sizes, durations, codecs, resolution variants and storage budget remain configurable decisions.
- Record use rights and consent evidence, purpose, wording/version, subject/group coverage, grant or withdrawal status, and approval.
- Registration publicity consent cannot be assumed to cover bystanders. Minor-participant handling remains a policy gate.
- Optional publicity refusal does not invalidate paid attendance. Provide the approved no-photo, withdrawal and removal processes.
- An approved removal unpublishes controlled assets and invalidates relevant delivery caches where supported. No claim is made that independent third-party copies can all be erased.
- Do not add a public photo-download button. Publicly displayed media remains technically copyable.

## 4. Working hero selection and approval process

1. Finish the bounded inventory as needed and shortlist clips with clear event atmosphere, research activity, presentations and human interaction. Review their content before selection.
2. Check resolution, orientation, stability, exposure and usable duration. Choose framing that leaves a readable title/action area on desktop and mobile.
3. Record the source file IDs and time ranges. Confirm rights, consent coverage and any visible marks or sensitive content.
4. Prepare a short muted sequence and matching still poster. Preserve private source originals; produce optimized display copies.
5. Review overlay contrast across representative frames. Check text and buttons with video paused, absent or still loading.
6. Implement pause/resume, reduced-motion still mode, low-bandwidth fallback and mobile crops. Public actions must work before the video loads.
7. Record content/media approval, approved derivatives and intended placements. Publish only after the applicable launch gate is complete.

Video duration, file budget and codec settings are unselected. Determine them from the actual footage, browser support, quality and measured page performance, then record the chosen configuration.

## 5. Per-asset record template

Use one record for each selected asset and link derivatives to its original:

| Field | Required record |
|---|---|
| Internal asset ID | Stable identifier |
| Source | Drive file ID/link or supplied original, original filename, owner/source |
| Edition/activity | 2026/2027 or verified year; opening, presentations, workshops, hackathon, awards, closing |
| Content description | What is visible; factual context and any unresolved identification |
| Technical properties | Format, dimensions, duration where applicable, size |
| Rights and consent | Purpose, terms/version, subject/group coverage, grant/withdrawal status and evidence reference |
| Publication approval | Status, authorized approver, time and approved placements |
| Derivatives | Poster, desktop/mobile crop, thumbnail, encoded versions and storage keys |
| Accessibility | Appropriate alt text, caption/transcript if content requires it, decorative role where applicable |
| Retention/removal | Owner, applicable retention, withdrawal request and cache/unpublish record |

Suggested operational states: `discovered`, `shortlisted`, `rights_pending`, `approved`, `published`, `withdrawn`, `archived`. These are a proposed implementation model, not a replacement for approved permission policies.

## 6. Media release checklist

- [ ] Each public asset has known source, intended use and explicit approval.
- [ ] Rights/consent cover the actual people, edition and new website purpose.
- [ ] Final logo/sponsor/institutional mark usage is approved.
- [ ] A poster and functional content appear independently of video loading.
- [ ] Muted playback, pause, reduced-motion and low-bandwidth modes work.
- [ ] Mobile crops, frame contrast and loading performance are checked.
- [ ] Private originals and drafts cannot be fetched through public APIs or links.
- [ ] Required alt text/captions and bilingual presentation are complete.
- [ ] Removal and withdrawal can unpublish controlled assets and derivatives.
- [ ] Original and derivative backup/restore responsibilities are recorded.

No media publication, conversion, artwork generation or Drive permission changes were performed while compiling this handoff.



---

# Included file: docs/CONFERENCE_BACKGROUND.md

# MSRC 2027 conference background

Reviewed: 29 September 2026. Source: **S3**, MSRC27 Main File (package file: docs/../sources/MSRC27_Main_File.pdf). Page numbers below refer to PDF page positions, not its table of contents.

This file preserves conference context for design, copy, and future planning. A statement appearing in the planning PDF is evidence of source content, not proof of final approval. The current technical specification **S1 v0.5** and the handoff decision records govern website behavior when they differ from S3.

## Identity and purpose

| Topic | Source-backed context | Source |
|---|---|---|
| Event | The 5th Medical Students Research Conference, MSRC27, 2027 edition | S3 pp1,13 |
| Arabic name | المؤتمر الخامس لأبحاث طلاب الطب | S3 p13 |
| Host | Faculty of Medicine, King Abdulaziz University | S3 pp1,13 |
| Organizer | Research Principles Club / نادي مبادئ البحث العلمي | S3 pp4,13 |
| Character | Student-led medical conference supporting research, collaboration, and innovation among future healthcare professionals | S3 p33 |
| Purpose | Help students present research, exchange knowledge, develop scientific communication, connect with researchers, and create solutions to healthcare challenges | S3 p13 |
| Main audience | Undergraduate medical students, interns, residents, postgraduate students, and faculty interested in student research | S3 pp17,33,37 |
| Broader pillars | Scientific research, arts and innovation, student volunteering | S3 p13 |
| Research interests | Healthcare quality and efficiency, prevention, healthcare access, digital transformation, and health innovation | S3 p13 |

The club also lists Research Summer School (RSS), Journal Club, and Future Pioneers among its initiatives (S3 p4). These can provide organizational context; they do not automatically become website navigation items or registration flows.

The source prints `MSRC2027.COM` and the social handle `@Research__PC` (S3 p4). Confirm the correct account URL before linking a public social icon.

## Program context

The planning PDF includes these event formats (S3 pp15,17,21):

- Opening and closing sessions.
- Oral research presentations and a poster exhibition.
- Scientific discussions or debates and expert talks.
- Research workshops, with methodology, statistics, and ethics identified as possible subjects.
- A hackathon focused broadly on improving healthcare.
- Annual research recognition through MSRC Awards.

These establish the program's intended breadth. They do not provide a finalized session timetable, confirmed speakers, capacities, workshop catalog, or approved 2027 prize amounts. Current requirements determine which formats receive active website features.

The source describes student volunteers handling applications, logistics, communication, registration, certificates, and event reporting, with faculty participating in scientific review (S3 pp17-26). This is organizational background, not an application permission model. Use the roles and access rules in the current technical requirements.

## Previous editions

The figures below are reported by S3. Keep each figure attached to its year and original metric. They can support an archive or an approved heritage section after editorial review. They are not 2027 forecasts, attendance capacity, or confirmed sponsor commitments.

| Edition | Date | Reported visitors | Research and program context | Source |
|---|---|---:|---|---|
| 1st, 2023 | 19 January 2023 | 350+ | 120 abstracts; 55 accepted research entries; 15 oral presentations; 40 posters; 2 research workshops | S3 p5 |
| 2nd, 2024 | 18 February 2024 | 600+ | 190+ abstracts; 78 accepted research entries; 48 oral presentations; 30 posters; 9 inventions/community-service projects; 20+ artworks; 2 scientific debates | S3 p7 |
| 3rd, 2025 | 30 April 2025 | 800+ | 313+ abstracts; 168 research entries comprising 11 oral, 71 short oral, and 86 posters; 8 workshops; 2 expert-talk sessions | S3 p9 |
| 4th, 2026 | 25-26 January 2026 | 2,257 | 256+ abstracts; 83 accepted research entries comprising 34 oral, 9 three-minute thesis, and 40 posters; 209+ student volunteers; 2 workshops | S3 p11 |

S3 p9 also lists **303 accepted participations** in 2025. This is a different metric from the **168 research entries** and must not be relabeled as 303 accepted research abstracts.

Past themes were Founding Day in 2024, sustainability in health in 2025, and `تمكين باحثي اليوم لمستقبل الغد` in 2026 (S3 pp7,9,11). None is established here as the 2027 slogan.

Archive photo collages appear on S3 pp6,8,10,12 for the 2023-2026 editions respectively. Use them to identify desired shots. Original media quality, reuse approval, captions, and accurate year labels should be established before publishing assets.

## Planning proposals retained for continuity

| Item | What S3 contains | Required treatment |
|---|---|---|
| Date | 27-28 January 2027, explicitly labeled proposed (p15) | Keep tentative. Do not create a live countdown or a confirmed event-date claim from this source. |
| Venue | King Faisal Conference Center and University Hospital theater listed under proposed location (p15) | Keep as options until the current decision record confirms a venue. A booking task on p21 is not a completed booking. |
| Ambassadors | Continuation of the ambassador program is proposed (p33); previous edition reported 9 ambassadors and 100,000+ announcement views (p34) | Preserve as planning context. The previous poster on p35 is not a 2027 roster. |
| Awards | Student, postgraduate, faculty/department, and research-grant categories appear (pp30-31) | Current approved scope and scoring rules take precedence; do not implement legacy rubrics from this PDF. |
| Sponsorship | Diamond, Gold, Silver, and Bronze package concepts with draft amounts appear (p38) | Publish only currently approved offers and benefits. Historical partners are not confirmed 2027 sponsors. |
| Accreditation | CME and extracurricular-hour approval are assigned tasks (p21) | Do not claim granted accreditation or approved hours based on a task list. |

## Source conflicts and content safeguards

- **Legacy submission policy:** S3 p24 includes a 300-word abstract limit, two submissions per principal investigator, rejection of incomplete research, and a faculty/physician supervision requirement. These are legacy source rules. S1 v0.5 overrides them where the current specification differs. Do not copy this policy into forms, validation, acceptance emails, or public guidance without consulting the current requirements.
- **Review automation:** S3 p25 describes an AI-based evaluation step and subsequent faculty review. This does not establish a website integration, permission to send abstracts to external services, or authority to automate final decisions. Follow current approved workflow and human decision ownership.
- **Leadership:** S3 p14 contains a partly unfinished roster and names that differ from the current project context. Obtain the approved current roster before publishing names, portraits, or titles.
- **Awards history:** S3 p30 describes awards as occurring for the second consecutive year, while earlier-edition pages already report award participation. Avoid the ordinal claim until corrected.
- **Brand availability:** A conference emblem and purple/gold visual system are visible throughout S3. Use the dedicated current design guide for digital tokens and approved assets. Embedded document fonts and low-resolution logos do not establish web-font rights or supply production-ready logo files.

S3 supplies no final 2027 registration fees, public application deadlines, complete schedule, confirmed speaker roster, workshop capacities, live contact inbox, approved sponsor roster, or final tagline. Keep unconfirmed fields configurable and use honest unpublished states.




---

# Included file: docs/SOURCE_REGISTER.md

# Source register and reconciliation record

**Reviewed 29 September 2026. This is a dated development handoff, not a synchronized mirror of every project chat or connected document.**

## Sources actually reviewed

| ID | Source and location | Observed version/status | Treatment |
|---|---|---|---|
| S1 | [Development Specification](https://docs.google.com/document/d/12LjPNVdnI10eC8ul9I-NZcBGj8a0Y3r7qcrgs-PoACo); included text (package file: docs/../sources/Development_Specification_v0.5.txt) | v0.5, modified 29 Sep 2026 11:30:21 UTC / 14:30:21 Riyadh; one tab, 26 sections | Current product baseline; MUST, DEFAULT and TBD labels retained |
| S2 | [Hackathon Draft](https://docs.google.com/document/d/1eVBuk33QhS-UDbic17Vh06M5RaqA1RzdRRoxGP7NZ7M); included text (package file: docs/../sources/Hackathon_Draft.txt) | Working v0.1 with updated answers, modified 29 Sep 2026 11:09:52 UTC / 14:09:52 Riyadh; one tab | Answered Sections 2-7 incorporated by S1; later options/questions and conflicts remain unresolved |
| S3 | MSRC27 Main File PDF (package file: docs/../sources/MSRC27_Main_File.pdf) and extracted text (package file: docs/../sources/MSRC27_Main_File_extracted.txt) | User-supplied current attachment; 75 pages | Conference/background/proposal source; all-page visual coverage; substantive text through p38, decorative p39, blank purple pp40-75 |
| S4 | Website Brand Guide PDF (package file: docs/../sources/MSRC27_Website_Brand_Guide.pdf) | Generated 2-page guide, dated source retrieved 29 Sep 2026; visually reviewed | Working website design extension, not final brand sign-off |
| S5 | Previous starter pack (package file: docs/../sources/previous_starter_pack) | Playbook, prompts, tracker and original ZIP, created 29 Sep 2026 | Engineering recommendations and staged plan; ZIP content matches standalone markdown files byte-for-byte; blank tracker proves no build progress |
| S6 | Visible project conversation notes (package file: docs/../sources/PROJECT_CONTEXT_NOTES.md) | Context supplied to this conversation | User intent/preferences and prior artifact breadcrumbs; not a complete transcript export |
| S7 | [MSRC 2026 media source](https://drive.google.com/drive/folders/1wkez3zex5RiTc3dM85s9QLO07rpLrsEu); media register (package file: docs/MEDIA_REGISTER.md) | Folder named Without frame; read-only metadata inspection, six photographer folders; bounded child samples | Confirms observed file/folder access and media formats; partial inventory, no content selection/download/permission clearance |
| S8 | [Original Canva brand reference sheet](https://www.canva.com/d/zrujOnVYUtutnfB); included text (package file: docs/../sources/MSRC27_Brand_Reference_Canva.txt) | MSRC27 brand reference sheet, design DAHWgMSGq3E, one page; modified 29 Sep 2026 12:16:35 UTC / 15:16:35 Riyadh | Text read directly from existing design; corroborates palette and English font names; font uncertainty and example schedule remain nonfinal |

S1 and S2 text snapshots preserve the readable paragraph content returned by the current document read. Their source links remain available for layout and future edits. Original Google Docs files were not modified. S8 is a text snapshot, not a Canva PDF export; the existing Canva design was not changed. Source PDFs are retained unchanged.

## Authority and conflict rules

1. Apply current explicit organizer instructions within their scope.
2. Use the latest reconciled development specification for product rules; S1 v0.5 is the reviewed baseline here.
3. Keep Hackathon Draft answers with their source status and the reconciliation in S1. An option, tentative comment, example rubric, or stale footer is not a new approved decision.
4. Use S3 for event context, prior editions and proposals. Where it differs from current behavior, S1 controls implementation.
5. Use S8 for source identity guidance and S4 for website-specific extensions. Final brand approval remains CFG-12.
6. Use S5 as engineering/design guidance. Its assertions of approval are bounded by the primary sources; recommendations do not establish user selection or completed implementation.

If a newer source conflicts with this handoff, record source, date, owner and changed requirement before updating behavior. Preserve historical snapshots and make the current decision explicit.

## Reconciliation completed

| Difference | Handoff treatment |
|---|---|
| Main File excludes incomplete research and requires a supervisor generally | S1 allows ongoing studies and requires supervisor data only for selected research award winners |
| Main File contains proposed January dates and venue choices | Kept tentative; no live countdown or confirmed venue claim |
| Main File leadership chart differs from requester role context | Public roster remains pending approved current names/titles |
| Older material has rubric/award/sponsor examples | Preserved as background; no unapproved values placed in operational configuration |
| Hackathon national-ID request | Existing exclusion remains until an explicit approved policy change |
| Hackathon WhatsApp group mention | Platform remains email-only; possible external group is a separate unresolved operational decision |
| Eight finalist teams per track with solo entry allowed | Solo place accounting remains open; no guessed capacity allocation |
| Broad hackathon eligibility remains labeled Options | Final publication wording gated |
| Starter labels complete framework stack and styling approved | Managed providers selected; framework/tooling recommended; palette/fonts corroborated as working reference, final design approval pending |
| Starter places CMS before participant auth | Staff identity/MFA/authorization included as a prerequisite to CMS editing |
| Shorthand says submissions English-only | Participant labels/errors remain bilingual; scientific content English/LTR; assessment screens and transactional emails English-only |
| Blank tracker and staged prompts | No completed code, infrastructure, tests or releases inferred |
| Older setup commands include version-sensitive instructions | Reverify supported versions and CLI help during implementation |

## Coverage boundaries

- This package captures the accessible sources above and visible project context. It is not a verbatim export of every historical ChatGPT conversation.
- The named original brand PDF was not found as a separate file in the bounded search; the corresponding original Canva design was found and its text reviewed.
- Source media is linked and partially inventoried. Its individual photo/video content and rights were not reviewed, and raw footage is not bundled.
- Main File text extraction is a reading aid. Use the unchanged PDF for exact visual content and Arabic layout.
- No live website, GitHub repository, registrar account, DNS, Vercel/Supabase account, payment system, email sender, or production credential was inspected in this compilation task.
- No current provider pricing, hosting-region guarantee, package-version guarantee, legal approval, accredited hours, or production readiness is asserted.
- Source legal/privacy requirements are preserved as project requirements. Final institution/controller decisions and actual processing assessments remain open in CFG-09/10.
- Unrelated user study, investment, personal, and other business projects are intentionally outside the MSRC handoff.

## How to keep the handoff current

Update `DECISIONS.md` when an authorized decision changes. Update the affected requirement, design/configuration note and progress record. Regenerate a dated source snapshot when the live document is revised. Keep source hashes for provenance; a matching hash proves identical bytes, not business approval.

## Official Codex guidance used for handoff structure

- [Projects and chats](https://learn.chatgpt.com/docs/projects): local code folders, project context and durable checked-in guidance.
- [Use ChatGPT](https://learn.chatgpt.com/docs/use-chatgpt): Work and Codex capabilities and developer views.
- [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md): project instruction discovery.

These pages were fetched and reviewed in the preceding recommendation on 29 September 2026. Interface availability may depend on the selected surface. This package uses ordinary files so the requirements can travel with the code.



---

# Included file: docs/HANDOFF_VALIDATION.md

# Handoff validation

Validation date: 29 September 2026. This checks the documentation package, not the unbuilt application.

| Check | Result |
|---|---|
| Primary current source read | Development Specification v0.5, all 26 sections, captured as readable text |
| Hackathon current source read | Updated draft captured; answered choices separated from options/questions |
| Main File coverage | All 75 pages visually covered; background and legacy-rule conflicts recorded |
| Brand evidence | Generated guide visually reviewed; original Canva sheet text corroborates palette/English fonts |
| Prior starter pack | Standalone markdown and ZIP contents match byte-for-byte |
| CFG traceability | All 13 source configuration statements retained in DECISIONS |
| Acceptance traceability | All 18 source acceptance statements retained in REQUIREMENTS; formatting changes only |
| Authored Markdown structure | Local file links resolve and code fences balance |
| Source PDF preservation | Packaged Main File and brand PDF hashes match retrieved originals |
| Independent policy review | No critical product-rule contradiction found; CMS authentication, ticket sequencing, early operational readiness and brand provenance corrected |
| Archive integrity | ZIP contents checked after packaging; SHA256SUMS.txt records included file hashes |

No build, unit/integration/end-to-end test, database migration, live payment check, website deployment, DNS change, or infrastructure provisioning was performed in this task. The progress file records those items as unverified. Operational checks must be executed during the relevant implementation and release stages.



---

# Included file: prompts/01_START_FOUNDATION.md

# First Codex task: foundation

Open the extracted handoff folder in Codex. Copy the block below. If there is an existing website repository, open that repository after merging the handoff documents and preserving existing instructions/code.

```text
Use this folder as the development handoff for MSRC 2027.

Read AGENTS.md, docs/PROJECT_BRIEF.md, docs/DECISIONS.md,
docs/PROGRESS.md, docs/ARCHITECTURE.md, and docs/ROADMAP.md.
Use sources/Development_Specification_v0.5.txt for the exact relevant
requirements. Treat sources/previous_starter_pack as historical reference.

Implement the local M1 engineering foundation. First inspect the actual
folder/repository, existing code, Git state, runtime, package manager, and
container availability. Preserve existing work. Do not assume the source
documents prove that hosting, a database, DNS, or a repository is configured.

For a new app, adopt and record the recommended Next.js App Router,
TypeScript, Tailwind, and pnpm baseline unless you find a concrete technical
incompatibility. Verify current official runtime requirements, dependency
versions, and CLI help before using commands. Pin relevant dependencies and
preserve the lockfile. Managed Vercel and managed Supabase are already selected
providers; exact production plans and regions remain unresolved.

Build the smallest runnable foundation with:
- a safe public placeholder page and shared layout;
- English/Arabic route and RTL structure;
- typed configuration that keeps unknown dates, prices, and capacities unset;
- server-enforced closed flags for operational workflows;
- safe environment-variable documentation with no real secrets;
- local Supabase setup and synthetic data where the environment supports it;
- separate browser/server data-client boundaries where applicable;
- error, loading, and not-found conventions;
- appropriate lint, typecheck, build, test and local database commands;
- a meaningful small smoke test and CI definition;
- clear README setup and verification instructions.

Do not implement registration, payment, abstracts, review, workshops,
hackathon, 3MT, scanning, or certificates in this task. Keep CMS editing
closed; public static content does not require exposing an admin interface.
Use synthetic development data, console/test email, and mocked payments.
Do not provision production services, change DNS, or send real emails.

Proceed with routine reversible setup and implementation. A missing
production decision should be recorded as a later release dependency,
not a reason to stop local foundation work. If a local tool is unavailable,
complete the independent work and explain the exact remaining blocker.

Run the available relevant checks and inspect the local result. Record what
passed, failed, was blocked, or was not tested. Update docs/PROGRESS.md and
the engineering decision record. Return the working result, how I can open
it, checks actually run, remaining setup, and the next smallest task.
```



---

# Included file: prompts/02_DESIGN_AND_HOMEPAGE.md

# Second Codex task: design system and homepage

Use after the foundation has a runnable baseline. Copy the block below.

```text
Continue MSRC 2027 from the current repository and docs/PROGRESS.md.
Read AGENTS.md, docs/DESIGN_GUIDE.md, docs/MEDIA_REGISTER.md,
docs/PROJECT_BRIEF.md, and the relevant S1 design/language requirements.

Implement M2 and a focused M3 homepage preview. Use the documented palette,
fonts, and motion values as working defaults. They are not final brand approval.
Preserve the user's cinematic video entrance, clear conference information
hierarchy, natural scrolling, and responsive buttons.

Build shared tokens, containers, typography, header, mobile navigation,
footer, language switch, buttons, section headings, and accessible form/status
foundations. Make a local/staging design-system route. Include focus, disabled,
loading, hover, press, validation and reduced-motion states.

Build a strong homepage using editorial spacing and approved or clearly
synthetic content: hero, concise introduction, participation pathways,
program preview, previous-edition context, and appropriate sponsor/media
sections when content exists. Preserve the required full public sitemap in
typed content/navigation, without filling empty pages with invented facts.

Use English and Arabic layouts. Scientific content stays English/LTR, while
participant form labels and instructions are bilingual. Keep native scrolling.
For hero video provide muted inline playback, an accessible pause control,
poster, reduced-motion fallback and low-bandwidth behavior. If cleared footage
or final logos are absent, make a polished static placeholder and record the
asset slot. Do not publish unreviewed 2026 footage or use a third-party embed.

Keep dates, countdowns, registration/payment/submission buttons and other
operational actions in honest unpublished/not-yet-open states. Proposed
27-28 January dates, venue options, old sponsors and roster names are not
approved public content.

Inspect desktop and mobile layouts, Arabic RTL, keyboard navigation, focus,
contrast, reduced motion, and media fallback behavior. Run the relevant build
checks. Update progress and list the exact content/assets needed next.
Return screenshots or a working local preview when available.
```



---

# Included file: prompts/03_FEATURE_AND_REVIEW.md

# Reusable feature, review, and continuity prompts

## Implement one feature

Replace the bracketed fields before sending.

```text
Continue MSRC 2027. Read AGENTS.md and docs/PROGRESS.md.
Implement [FEATURE] using source requirement IDs [IDS] from v0.5.
The intended milestone/release is [MILESTONE/RELEASE].

Read the relevant source sections and decision register. Define the actor,
scope, source states, validation, resulting states, audit/email effects,
privacy/retention implications, and acceptance criteria in a short feature
note. Preserve unresolved business values as closed configuration gates.

Implement one complete, reviewable slice using the current stack. Include
the relevant server/database/storage authorization, failure and recovery
states, concurrency/idempotency, language/accessibility behavior, immutable
records, and durable jobs. Tests should address real behavior and risks.

Run relevant checks, inspect the result, and update docs/PROGRESS.md.
Report evidence, blocked decisions, release state, and the next task.
```

## Review a change

```text
Review [BRANCH/CHANGE] against source requirement IDs [IDS].
Prioritize incorrect behavior, authorization leaks, data loss, payment/capacity
errors, review anonymity, accessibility, and source-rule drift.
Check both permitted and forbidden actions. Distinguish code inspection from
executed tests. Return findings with the affected file, scenario, consequence,
and concrete fix. Make routine scoped fixes that this task authorizes and
record meaningful verification. Do not broaden the product scope.
```

## Resume work in a new chat

```text
Resume MSRC 2027 in this repository. Read AGENTS.md, docs/PROGRESS.md,
docs/DECISIONS.md, and the latest relevant feature notes. Inspect actual Git
state and recent changes. Summarize what is completed with evidence, what is
blocked, and the next smallest unblocked task. Continue that task within the
current milestone using synthetic data unless a live task is explicitly
authorized. Do not assume old chat context or document checkboxes prove a
deployed feature.
```

## Apply a new organizer decision

```text
New organizer decision: [EXACT DECISION].
Source/date/approver: [SOURCE].
Update docs/DECISIONS.md and affected current requirements. Preserve the old
source snapshot and log what was superseded. Identify affected code, tests,
content, configuration, migrations and release gates. Implement the authorized
scope, keeping unrelated flows unchanged. Update progress with evidence.
```



---

# Included file: prompts/04_RELEASE_AND_POLISH.md

# Release and polish prompts

## Audit a release candidate

```text
Audit MSRC 2027 release candidate [REVISION] for [SPECIFIC WORKFLOW].
Read docs/ACCEPTANCE_AND_RELEASE.md, current decisions and exact source IDs.
For each applicable gate, record PASS, FAIL, BLOCKED or NOT TESTED, evidence,
owner, and remediation. Verify ownership, production configuration, relevant
permissions, bilingual/RTL/accessibility, failure paths, email, monitoring,
backup/restore, and the operational runbook. Never infer payment readiness
from a mock or consent/privacy readiness from a selected provider.
Prepare a concrete release and rollback checklist. Do not open the workflow
unless the current task authorizes that action and its requirements are met.
```

## Publish an approved release

```text
Publish the approved [PUBLIC SITE / WORKFLOW] release at [APPROVED REVISION]
using the established organizational deployment target. First verify the
recorded release evidence and any environment differences. Keep other
operational flags closed. Execute the authorized deployment steps, run
production smoke checks, and record the actual URL, revision, feature flags,
observed results, known limitations and rollback path. Stop and explain any
material mismatch between the approved candidate and the deployment target.
```

## Polish an existing experience

```text
Improve [PAGE OR FLOW] in the current MSRC 2027 build.
Inspect the actual result on desktop/mobile and English/Arabic before editing.
Prioritize concrete usability, visual hierarchy, copy, keyboard/accessibility,
motion, media performance, and failure-state issues. Preserve the approved
brand and product rules. Implement a focused set of improvements, compare the
result, run relevant checks, and update progress. Avoid unrelated rewrites.
```



---

# Included file: sources/PROJECT_CONTEXT_NOTES.md

# Visible MSRC project context

This is a curated note from the project context supplied to this conversation, not a complete exported transcript. Current source documents control their own contents and later confirmed decisions supersede older planning statements.

## User-originated context

- The project is the 2027 edition of the Medical Students Research Conference at King Abdulaziz University.
- The user reports purchasing `msrc2027.com`. Registrar ownership, DNS, renewal and hosting were not independently inspected in this handoff.
- The user wants a clean website and intends to develop it iteratively, with features added or removed through discussion.
- The user likes the video homepage direction at https://slush.org/ and the general information layout at https://www.escardio.org/events/congresses/esc-congress/ . These are stated inspirations, not audited or copied implementations.
- The desired interactions include clean transitions, pleasant natural scrolling, and satisfying button feedback.
- The user supplied an updated MSRC27 brand reference sheet and the 2026 media folder for development: https://drive.google.com/drive/folders/1wkez3zex5RiTc3dM85s9QLO07rpLrsEu . The original Canva brand sheet was subsequently found and read as S8.
- The user asked for complete development stages, prompts, setup, progress tracking, publishing and later polishing. The existing starter pack is preserved as S5.
- The user updated the technical requirements document and Hackathon Draft. Their current contents were fetched as S1/S2; this note does not reconstruct them from old chat excerpts.
- The user describes his MSRC role as conference co-leader and scientific committee leader. Source roster discrepancies remain open for public content.
- On 29 September 2026 the user asked whether to move the project to Codex, then authorized preparing the recommended reconciled handoff.

## Intended workflow

Keep planning and organizer discussion in the existing ChatGPT project. Keep code and approved development documentation together in a version-controlled repository used by Codex. Transfer concise persistent instructions plus detailed source references. Preserve resolved choices, working defaults, open decisions and old source proposals distinctly.

## Artifacts identified in project history and reviewed here

- MSRC27 (Main File).pdf
- MSRC27_Website_Brand_Guide.pdf
- MSRC27_Website_Development_Starter_Pack.zip
- MSRC27_Website_Development_Playbook.md
- MSRC27_AI_Development_Prompts.md
- MSRC27_Project_Progress_Tracker.md
- Current Google development specification and Hackathon Draft
- Original MSRC27 brand reference sheet in Canva

See `docs/SOURCE_REGISTER.md` from the package root for provenance and coverage. The handoff contains no assumption that every old conversation is automatically visible in a new Codex project.



---

# Included file: sources/Development_Specification_v0.5.txt

MSRC 2027 Website

Development Specification v0.5

Purpose: implementation baseline for the public website and conference operations platform.

Authority: the organizer's latest selections confirm O1 organizational ownership, managed Vercel + managed Supabase, P1 authorized KAU payment collection, C3 solo and team hackathon entries, A1 attendance evidence with no one-day certificate, and S2 unlinked feedback with separately tracked completion. Answered items from the updated Hackathon Draft [H1] inform Section 9. Its options, examples, tentative statements, and conflicts remain identified as such. Selecting an approach does not certify implementation, available integrations, or completed institutional approvals.

Reading key: MUST identifies a required behavior. DEFAULT identifies an adopted engineering starting value that an authorized owner can change through documented configuration. TBD identifies an unresolved business value or approval, listed in Section 23. A dependent workflow must remain closed until its required TBDs are resolved.

1. Product scope and delivery baseline

SCP-01. The platform MUST support the two-day MSRC 2027 conference, parallel sessions, general attendance, research abstracts with oral/poster allocation, postgraduate Three Minute Thesis (3MT), hackathon tracks, workshops, keynotes, exhibitions, sponsors, and post-conference archives. Actual event dates, venue, rooms, and capacities are configuration gates, not assumed facts.

SCP-02. Public pages MUST include Home, About, Dates and Venue, Program, Speakers, Workshops, Participation and Submission Guidelines, Teams/Committees/Board, Sponsors and Sponsorship, Gallery/Past Editions, Announcements, FAQ, Contact, Privacy, and Terms. Public information and workshop availability MUST be accessible without login.

SCP-03. Verified users MUST have a dashboard for registrations and payments, submissions and revisions, workshop bookings/waitlists, QR tickets, and certificates. Registration, research submission, hackathon participation, and 3MT MUST be distinct workflows connected to one account. Listing someone as a co-author MUST NOT register them for attendance.

SCP-04. Operational scope includes manually approved registration, paid and fully discounted orders, review and AI-assessment workflows, restricted committee dashboards, event judging, email automation, QR scanning, survey-based certificate eligibility, content administration, audit trails, and reporting.

SCP-05. Out of scope: public attendee directories; public abstracts or research search; sponsor accounts/self-service uploads; user-built personal schedules; full-site search; attendee messaging/networking; native mobile apps; automatic team matching; university SSO; SMS, WhatsApp, or push notifications. My Bookings is a read-only list of booked activities, not a schedule builder. Program filters remain in scope.

SCP-06. Planning estimates are 15,000+ visitors, approximately 1,000 attendees, 300–400 abstracts, 30–40 reviewers/judges, and 3–10 administrative accounts. The stated 30–100 workshop registrations must be clarified as total or per workshop. Hackathon application volume remains TBD; its draft specifies eight finalist teams per track, sixteen total, with solo-place accounting unresolved under HAC-07. Estimates and finalist quotas MUST NOT be confused with general admission limits or numbers of individual participants.

SCP-07. All selected functions remain delivery scope. Certificates may be released after initial public launch, but attendance, eligibility evidence, and retention design MUST be implemented before their data is collected. Each operational feature MUST be tested before its own opening date. Section 22 defines release gates rather than silently downgrading selected features to enhancements.

2. Roles and permission boundaries

ROL-01. Permissions MUST be additive and scoped to an edition, track, assignment, or operational function. Being logged in MUST NOT grant general database access. Authorization MUST be enforced on the server and data layer, not only by hiding interface controls. [R4, R5]

ROL-02. Participant: manage their own permitted profile fields, registrations, orders, drafts, revisions, bookings, tickets, and certificates. They MUST NOT see another participant's personal records, unpublished decisions, reviewer identities, scores, or confidential comments.

ROL-03. Abstract Reviewer: access only assigned anonymized submissions and the relevant rubric; declare conflicts, decline assignments, save and submit reviews, and amend them while the review is open. No author names, contact details, affiliations, administrative evidence, peer reviews, or peer-review status may be returned to this role.

ROL-04. Hackathon Reviewer and 3MT Reviewer: assignment-scoped access to the relevant track's sanitized review packet and scoring interface. Applicant identities MUST remain hidden in reviewer views. Team identifiers presented for review MUST be anonymized where they identify applicants. Track-specific judging that occurs in person is distinguished from this pre-event review.

ROL-05. Scientific Administrator: validate submissions, manage assignments and rubric configuration, request revisions, resolve review disagreements, prepare decisions, allocate oral/poster formats, and publish authorized scientific outcomes. Access to author details is limited to duties requiring them; administrative evidence access follows ROL-11.

ROL-06. Judging Committee: categorize accepted presentations, assign faculty judges, and manage judging readiness within assigned categories. Faculty Judge: view assigned event materials, declare conflicts, submit event-day scores, and amend them before locking. Event judging and awards MUST use separate score records from abstract acceptance review.

ROL-07. Registration/Workshop Administrator: process manual approvals, manage capacity and reserved seats, resolve bookings/waitlists, and inspect necessary attendance records. Finance permission: inspect orders, payment reconciliation, discounts, and authorized refunds. Neither permission grants scientific-review content or full profile exports.

ROL-08. Check-in Staff: use the scanning interface for assigned days/workshops; see the minimum name, registration identifier, ticket validity, and check-in information needed at entry. They MUST NOT browse submissions, licence numbers, finance records, or unrestricted participant lists.

ROL-09. Content/Media Editor: manage assigned public content and upload media. Media publication requires an explicit authorized approval. Sponsorship/PR: manage sponsor profiles, tiers, inquiry records, and permitted follow-up. General support remains an email workflow, not an internal helpdesk.

ROL-10. Exactly three named Super Admin accounts MUST be designated before production. Super Admins manage roles, security settings, integrations, personal-data exports, audit access, and exceptional actions. Organizational owners retain authority; the developer receives delegated technical access rather than personal ownership of the platform.

ROL-11. Confidential IRB and similarity-report downloads are restricted to Super Admins under the selected policy. Scientific administrators may see validation outcomes; if they need the original evidence, a separately approved, logged permission change is required. Assigned judges may receive presentation files, which are a different document class. No role receives unrestricted access by implication.

ROL-12. All administrative, reviewer, judge, and check-in accounts MUST be individually identifiable. Privileged access requires MFA. A participant who is also a reviewer MUST NOT review their own submission or a conflicted assignment. Staff offboarding MUST remove grants and invalidate applicable sessions. Role changes, overrides, downloads, exports, and decision publication MUST be auditable.

3. Authentication, profiles, language, and accessibility

AUTH-01. Accounts MUST use email and password with managed authentication. Public browsing requires no account; submitting, registering, paying, or booking requires verified email. KAU accounts receive no special authentication path. Duplicate accounts using the same normalized email MUST be prevented without exposing whether an email belongs to another user through public responses.

AUTH-02. Email verification MUST use a six-digit numeric code. DEFAULT: ten-minute validity, 60-second resend cooldown, at most three issued codes per email within 15 minutes, and at most five failed entries per code. Issuing a replacement invalidates the previous code. Codes are single-use and protected at rest. Account/IP rate limits and accessible anti-bot protection MUST cover issuance, entry, and password recovery.

AUTH-03. Failed-password attempts MUST trigger progressive throttling. DEFAULT: five failed attempts within 15 minutes before an additional challenge/cooldown. This MUST NOT become a permanent account lockout. Password-reset requests return a generic response, use expiring single-use credentials, and support session revocation after recovery. Rate limits and recovery steps require automated tests.

AUTH-04. MFA MUST use an authenticator-app time-based code for privileged roles, with documented enrollment, factor-loss recovery, and audited reset. The app generates the code locally; this does not introduce SMS or another notification channel. Email verification alone MUST NOT be treated as the required second factor for privileged operations. Supabase supports authenticator-app MFA, but enforcement must also cover APIs and database access. [R3]

AUTH-05. DEFAULT session limits: participants, 24-hour absolute session lifetime; privileged screens, 30-minute idle timeout and eight-hour absolute lifetime. Sensitive actions require recent authentication. Warn before timeout where possible and retain saved drafts. The developer MUST enforce the configured policy server-side and test logout, suspension, factor reset, and revoked-session behavior rather than assuming an interface logout immediately invalidates every token.

AUTH-06. Name and email are required. Professional category is required when selecting an applicable participation path; institution and academic level are conditional on that category. Country/city and phone are optional unless an approved operational purpose makes them necessary. Medical licence number is conditional on an approved professional purpose, never mandatory for students or non-medical attendees. National ID collection is excluded.

AUTH-07. Users may correct permitted profile fields. Email changes and account/data deletion are handled through verified support requests rather than immediate self-service actions. A changed email MUST be reverified before becoming the account credential. A deletion request MUST follow retention exceptions and revoke access; it MUST NOT erase financial obligations or required audit evidence without assessment.

AUTH-08. DEFAULT: remove abandoned unverified accounts after seven days, provided no retained operational record requires them. The deletion job MUST not delete verified users or records with an approved retention obligation. Account recovery and cleanup actions MUST be logged without retaining passwords or codes.

LOC-01. Public pages, authentication, participant dashboard, navigation, form instructions/labels, errors, and participant support interfaces MUST support English and Arabic. English is the default. Arabic views use full RTL layout; users can change their interface language without losing entered data.

LOC-02. All submitted scientific/project content, including abstracts, hackathon narratives, 3MT material, and stage-two presentation content, MUST be English-only. Scientific-content fields remain LTR inside Arabic pages. Author names and official institution names may retain their correct original spelling. Interface language MUST NOT be confused with submission language.

LOC-03. Reviewer and faculty-judge assessment screens are English-only. Non-review organizer interfaces follow the bilingual interface requirement. Transactional emails are English-only, consistent with the answered email-language requirement; they may link to the selected participant interface language. Public and participant translation coverage MUST be checked before launch.

ACC-01. The accessibility target is WCAG 2.2 AA. Test keyboard access, visible focus, semantic headings, meaningful labels, error association, contrast, text resizing, screen-reader feedback, and Arabic directionality. Codes must support paste/autofill. Mandatory animations, camera-only admission, and inaccessible CAPTCHA must have alternatives. Honor reduced-motion preferences. [R6]

4. General attendance registration and approval

REG-01. General attendance is open to students, non-medical attendees, faculty, healthcare professionals, and external/international participants. Eligibility for research competitions remains separately defined. Account creation, general registration, payment, and attendance MUST remain separate records and states.

REG-02. Every registration MUST start as pending manual approval. Approval is never automatic, including for a 100% discounted order. The registration interface MUST explain that submitting the form or verifying email does not confirm admission.

REG-03. Adopted workflow: verified account → registration request → pending approval → organizer approval → payment due or valid zero-value order → confirmed registration → ticket. Approval occurs before payment collection by default. Both approval and financial completion MUST exist before confirmation. An organizer rejection before payment creates no charge.

REG-04. State vocabulary: draft, pending_approval, rejected, approved_awaiting_payment, confirmed, cancelled, and expired. Payment has its own states. Approval records MUST include actor and timestamp; rejection, cancellation, expiry exceptions, and manual overrides require a reason. Participants receive the published outcome by email and in their dashboard.

REG-05. Collect an attendance declaration for the configured two-day event and acceptance of applicable terms. Show approved dates, price, discount conditions, cancellation/refund rules, and capacity status before submission. Registration MUST remain closed while event dates, admission capacity, approval responsibility, or financial configuration is incomplete.

REG-06. Pending requests do not themselves guarantee admission. Approval MUST atomically allocate an available seat or place the request in an explicit capacity-pending queue. The administrator may never approve beyond capacity. Approved unpaid reservations expire after a configured payment deadline, releasing capacity and notifying the participant. Approval/payment deadlines are business settings in Section 23.

REG-07. The dashboard MUST show registration ID, current status, payment action where applicable, approval/payment expiry, ticket availability, and support route. QR credentials are issued only for confirmed registration. A pending, rejected, cancelled, expired, refunded-and-revoked, or suspended entitlement MUST not admit the user.

REG-08. Research submission is independent of paid attendance. A verified user may submit eligible work without buying attendance first. Rules for required attendance by accepted presenters, winners, or teams MUST be published before decisions are released; no hidden payment prerequisite may be added retrospectively.

5. Orders, payments, discounts, and refunds

PAY-01. Selected collection route: the existing, authorized KAU payment arrangement (P1), rather than a new independent MSRC merchant account. Conference attendance and workshops remain paid products with promotional codes, including a 100% university-student discount. The responsible KAU unit, exact collection system, recipient account, supported integration, prices, currency, enabled payment methods, discount evidence/limits, receipt/tax treatment, settlement reporting, and refund authority must be documented before live collection. The selected route is not evidence that an API or credentials have been supplied.

PAY-02. Orders MUST retain a server-calculated snapshot of items, base price, discount, taxes where applicable, currency, and final amount. Monetary values MUST use integer minor units appropriate to the configured currency. Client-supplied amounts or discount eligibility MUST never be trusted.

PAY-03. A full discount MUST create a completed zero-value order after eligibility validation, without requiring a card or gateway charge. It still consumes applicable discount usage and requires manual registration/workshop approval. Codes MUST support activation/expiry, allowed products, per-user/global limits, eligible groups, and non-stacking by default. Usage allocation must be race-safe.

PAY-04. After manual registration/booking approval, positive-value orders MUST use the authorized KAU collection interface. Implement hosted checkout, a payment link, or another collection method only when KAU confirms the supported interface and its order-reference behavior. Card numbers and security codes MUST NOT enter MSRC storage, logs, or email. A redirect, uploaded receipt image, or participant assertion does not prove payment. Confirmation requires an authenticated system result or an authorized reconciliation against an official KAU collection record, matched to order, amount, currency, and transaction/reference.

PAY-05. Payment attempts, approvals, orders, and entitlements MUST remain separate. Isolate the KAU integration behind a payment adapter and develop it initially with synthetic/test transactions. Use signed callbacks or authenticated status retrieval only if the actual KAU system supports them; do not invent a webhook contract. If an approved official-report reconciliation process is required instead, document the authorized operator, evidence reference, matching rule, timing, and audit trail before launch. Repeated or out-of-order confirmations must not duplicate payment credit, tickets, or bookings. Unmatched/ambiguous records enter a visible reconciliation queue.

PAY-06. Payment completion after seat expiry MUST NOT overbook. Place the order into an exception workflow for available-seat reconciliation or refund according to the published policy. Finance staff must see failed, pending, successful, refunded, partially refunded, and disputed transactions with an audit trail.

PAY-07. Cancellation and refund are separate actions. Refund requests follow the approved KAU authority and collection-system procedure; an MSRC request is not evidence that funds were returned. Record requested, approved, submitted-to-KAU, and confirmed-refunded outcomes as applicable, with official references and an audit trail. The refunded amount must not exceed the eligible paid amount. Zero-value orders do not generate monetary refunds. Admission revocation, workshop release, discount restoration, and dependent-booking effects require explicit published rules.

PAY-08. Before taking money, publish the seller identity, contact route, currency/prices, included activities, cancellation policy, refund conditions, and applicable receipt/invoice information. Finance access MUST exclude scientific reports and unnecessary profile fields. Receipts and all payment communications are email-only.

6. Abstract submission, authorship, and file stages

ABS-01. Abstract applicants may be undergraduate or postgraduate students, interns/residents, healthcare practitioners, or faculty from any institution, including international institutions. Completed and incomplete/ongoing studies are eligible. The system MUST NOT require completed results as a condition for every submission.

ABS-02. Required structured data: title, research specialty, study type, completion status, abstract body, ordered author list, each author's affiliations, designated principal investigator, corresponding author, presenting author where known, ethics status, conflict-of-interest declaration, funding declaration, and required administrative evidence. Keywords are supported; their required count is a configurable scientific setting.

ABS-03. For ordinary research, use Background, Aim, Methods, Results/Current Progress, and Conclusion/Current Implications. For an ongoing study, clearly label unavailable results and stage of progress; do not require invented findings. For case reports, use Background/Context, Case Presentation, Discussion, Outcome, and Conclusion. The relevant template is selected by study type.

ABS-04. The combined submitted body MUST not exceed 300 words. Title, author information, affiliations, keywords, and interface-generated headings are excluded. Client and server MUST use the same counter. DEFAULT rule: count whitespace-separated tokens containing a letter or digit; a hyphenated expression without spaces is one token. Display a live total and reject a server-validated total above 300. References, tables, and figures are not accepted in the stage-one abstract body.

ABS-05. Authors may have multiple affiliations; there is no scientific author-count cap. Technical anti-abuse payload limits must not silently impose one. The submitter, principal investigator, first author, corresponding author, and presenter are separate fields. The scientific lead must confirm corresponding-author eligibility, including whether the first author may hold that role, before the form opens. Do not infer this responsibility automatically from author order. Co-authors need no accounts merely to be listed.

ABS-06. The submitter MUST confirm authority to provide co-author data and submit the work. Co-author email messages are informational/invitational and do not create attendance, paid orders, accounts, or public profiles. Incorrect co-author information must have a correction route.

ABS-07. Retain the two-submission-per-principal-investigator rule from the participation terms. Count finalized stage-one applications within the edition, not drafts or co-authorship alone. Block an attempted third application with a clear explanation rather than automatically disqualifying the existing two. Withdrawn applications remain counted by default; any authorized exception requires a reason. No overall conference-wide abstract submission cap is implied by this rule.

ABS-08. A research supervisor is NOT required at initial submission, review, acceptance, presentation allocation, or award nomination. Supervisor information becomes mandatory ONLY when a nominee is selected as an award winner. Missing supervisor information must not block ordinary participation or distort scientific scoring. The award record enters winner_pending_supervisor until the award administrator validates the required details. Evidence and response deadline are configured before award results are released.

ABS-09. Stage one accepts only the abstract text/data and two administrative supporting-file classes: IRB/ethics documentation where applicable and a plagiarism/similarity report. No stage-one presentations, posters, research supplements, figures, or general attachments are allowed. DEFAULT: PDF only for those reports, maximum 10 MB per file.

ABS-10. Ethics status MUST distinguish approval provided from a declared not-required/exempt basis. Where approval is required, the evidence must be supplied. A study-type selection alone MUST NOT automatically waive ethics review. Where documentation is not applicable, require an explanation for administrative validation. Patient-identifying data is prohibited; case-report consent and research ethics approval are distinct matters. [R10]

ABS-11. A similarity report MUST be supplied. The current policy target is no more than 20%; approved provider/report settings remain TBD. The system flags values above the threshold or unverifiable reports for human administrative action or revision. It MUST NOT call a percentage proof of plagiarism or automatically reject scientifically on that percentage alone. The baseline includes report upload/manual validation, not an assumed external plagiarism-checking integration. [R7]

ABS-12. Applicants MUST be able to save drafts, resume across sessions/devices, preview, and explicitly submit. Autosave must show saving/saved/error states. Final submission records a timestamp and immutable snapshot of text, author data, declarations, and attachments. Finalized work is locked except through an authorized reopen or revision request. Replacing a file must not erase the material attached to an earlier review.

ABS-13. Each submission receives an internal random identifier and a stable display reference such as MSRC27-CA-0001. Specialty codes and sequences must be unique within the edition and safely allocated concurrently. Reclassification does not change an issued reference. Display references MUST NOT function as access credentials.

ABS-14. Stage two opens only for the accepted/conditionally accepted submission or an explicitly authorized final-material request. Allow presentation/poster files in PDF, PPTX, and DOCX, subject to the requested deliverable. DEFAULT maximum: 50 MB per file. Legacy DOC/PPT and additional formats require an approved allowlist change; macro-enabled or executable formats are prohibited. Stage-two templates, counts, deliverables, and deadlines are configured per presentation type.

ABS-15. Stage-one administrative files remain private and separate from stage-two presentation files. Reviewers receive sanitized review content, not identity-bearing reports. Assigned event judges receive only the approved material necessary for judging. Applicant-visible version history is not required, but submitted snapshots and replacement audit records MUST be retained under the approved retention schedule.

7. Review, revisions, decisions, and awards

REV-01. Scientific review is blinded to applicant identity. Reviewer pages, API responses, file names, document properties where exposed, notifications, and downloadable review packets MUST omit applicant names, contact details, and identifying affiliations. Check body text for identifying disclosures before assignment. Reviewer identities and confidential review material are also hidden from applicants. Event-day judges may naturally see the presenter; that is a separate stage, not an exception to pre-event reviewer anonymity.

REV-02. Administrators assign one to five eligible reviewers manually. Each assignment is tied to a submission version and rubric version. Required completed-review count, scoring scale, acceptance threshold, and any track-specific criteria must be finalized before reviewing opens. Do not interpret missing or declined reviews as zero scores.

REV-03. Reviewers MUST declare or flag conflicts, decline assignments, save drafts, submit criterion scores/comments/recommendations, and edit before the review lock deadline. Conflicted assignments are withdrawn and reassigned. Administrators can track their completion status; reviewers cannot see other reviewers' status or scores.

REV-04. Abstract criteria are equally weighted unless a formally versioned rubric changes this policy. Calculate a review total from its applicable criteria, then aggregate valid completed human reviews using the approved rule. Preserve component values and denominators. Handling of not-applicable criteria and ongoing studies must be specified in the rubric, not improvised by the model or developer.

REV-05. Committee decisions use scores plus scientific review, with the scientific lead resolving disagreement and ethical concerns. No automated threshold alone publishes acceptance/rejection. Overrides of the calculated recommendation require an authorized actor and recorded reason. Oral/poster allocation is a committee decision, not an applicant-selected submission category.

REV-06. Workflow vocabulary: draft, submitted, administrative_review, scientific_review, revision_requested, conditionally_accepted, accepted, rejected, withdrawn, revision_expired, and final_material_received. Record the presentation format and stage-two completion separately from scientific acceptance. Reopening or receiving a file does not automatically change an acceptance decision.

REV-07. Internal decision preparation and publication MUST be separate events even where status names are shared. Authorized staff can prepare a batch, preview affected references/outcomes/emails, correct it, and explicitly publish. Only published transitions update applicant dashboards and trigger decision emails. Internal edits, provisional scores, and confidential notes do not send applicant notifications.

REV-08. A revision request must specify the permitted fields/files and applicant-facing instructions without disclosing confidential reviewer material. The default deadline is 14 calendar days from publication of the request, with an exact timestamp displayed. The applicant must submit the revised version by that deadline; an email reply alone is not completion. Expiry sets revision_expired/voided, not scientific rejection. Authorized extensions and reopening are logged.

REV-09. Each revision creates a new snapshot. Prior reviews remain linked to the version assessed. The scientific administrator must explicitly decide which reviews need repeating; stale scores must not silently become scores of revised work. Withdrawals stop outstanding review/assessment jobs and retain history, but do not automatically cancel separately purchased attendance.

REV-10. Event judging MUST have separate assignments, criteria, scorecards, lock times, tie handling, and award approval. The judging committee assigns accepted work to faculty judges and categories. An award outcome requires authorized confirmation and, for a research winner, ABS-08 supervisor validation before the award is finalized. No public live leaderboard is included by default.

8. AI-assisted abstract assessment

AI-01. AI assessment is advisory, distinct from deterministic form validation, similarity checking, independent human review, and final committee approval. The intended sequence is submission → administrative readiness checks → AI assessment job → human review → committee decision → authorized publication. A failed AI job MUST NOT lose a submission or prevent a permitted manual review.

AI-02. Each assessment uses a locked rubric and submission snapshot. Send only approved, sanitized scientific content and needed study metadata. Do not send author/account names, email, phone, affiliations, licence data, IRB documents, or similarity reports. Identifying text within the abstract must be checked rather than assuming removal of profile fields guarantees anonymity.

AI-03. DEFAULT reviewer experience: enter an independent draft assessment before revealing the model's suggested assessment. The reviewer then confirms or changes their final scores and records substantive override reasons. Human scores, AI suggestions, and final committee decisions must remain separate records; AI scores are excluded from the human-review average unless a later explicit policy approves a different formula.

AI-04. Store the model/provider identifier, model version where available, rubric/prompt version, submission version, assessment timestamp, validated output, and human follow-up. Outputs must use a validated structured schema with allowed criteria/ranges. Treat submission text as untrusted input: embedded instructions cannot change system rules, access tools, expose secrets, or publish decisions.

AI-05. The provider, data-processing location, retention/training terms, confidentiality controls, costs, and applicant disclosure require approval before live use. Reviewers must not upload manuscripts independently to external tools. ICMJE confidentiality and transparency guidance informs this control; it is a benchmark, not a claim of journal accreditation. [R8]

AI-06. Before activation, test against committee-scored examples, including incomplete studies, different study types, identifying text, prompt-injection attempts, unsupported claims, and failed/malformed outputs. Record disagreement and override patterns. A queued/error/manual-review state, bounded retries, cost limit, and administrator disable switch are required. AI unavailability must never cause automatic rejection.

9. Hackathon and Three Minute Thesis

TRK-01. Hackathon and 3MT MUST be distinct submission types with their own eligibility, form schema, deadlines, attachments, stage transitions, review assignments, rubrics, final materials, and event-judging records. Reuse shared accounts, draft saving, versioning, notifications, and permission infrastructure without assuming abstract rules apply to every competition.

HAC-01. Confirmed participation model: both solo competitors and preformed teams may submit and compete (C3). Solo applicants are not a team-matching pool and are not required to join a team. Model a competition entry with participation_mode, project, submitting lead, and participant roster: one participant for solo; a maximum of five for a team. The draft permits cross-university teams, one team per person, and one project per team. Cross-mode duplicate participation and multiple solo-entry rules still require an explicit policy; do not infer them from the team rule. Automatic team matching remains excluded. [H1, Sections 3.2–3.3]

HAC-02. Working identity: MSRC 2027 Hackathon, theme Research-to-impact. Configure exactly two tracks: (1) Translating research into practice, using published research to develop practical, evidence-based solutions to healthcare challenges; (2) Advancing medical student research, improving how medical students conduct, collaborate on, and contribute to research. Entries bring their own problems and defend the applicability/feasibility of their proposed solutions. The accepted track is locked after acceptance. The draft says a healthcare member is not required and international applicants are eligible; its broader student/intern eligibility sentence remains labelled Options and needs final publication approval. [H1, Sections 2–3.1]

HAC-03. All listed participants verify their accounts while signing up/registering for the hackathon. The draft places invitation acceptance AFTER receiving hackathon participation acceptance. Therefore distinguish the registered application roster, committee acceptance, and subsequent member confirmation; do not make post-acceptance confirmation a prerequisite for initial review. Invitations must not disclose projects to unrelated people, and resends must not duplicate members. Editing permissions, membership-change cutoff, confirmation window, refusal/no-response handling, and approved solo-to-team changes remain configuration gates. Membership and authorized changes are auditable. [H1, Section 3.4]

HAC-04. Initial submission includes an entry title and an English pitch field limited to 300 words, with track and participant details. The draft's list of problem/users/solution/innovation/approach/feasibility/impact/progress is starting guidance; confirm whether these are prompts within the pitch or separate required fields before publishing the form. Supporting documents are optional, except applicable ethics/IRB evidence. Prototype evidence is supplied where applicable, and final presentation files belong to the later stage. Require references and an appendix as stated in the draft; their format and treatment relative to the pitch word limit remain TBD. This is a hackathon-specific rule, not automatic inheritance of abstract-stage restrictions. [H1, Sections 5.1–5.3]

HAC-05. Eligible projects must be new ideas, not previously pitched/entered in hackathons, prize-winning, funded, or commercially launched projects. Record the relevant declarations and route doubts to the authorized selection team. The draft intends AI-assisted plagiarism/originality checking, but names no provider, method, evidential standard, or decision procedure. Preserve that intention as pending implementation approval; no automated service is assumed to prove creativity or novelty. Any approved check must have documented data handling and human assessment of flags. Rules on participant use of AI/outside assistance remain open in Section 11 of the source. [H1, Sections 5.2, 11.1]

HAC-06. Initial selection includes eligibility checking and assignment of two independent reviewers per application. Keep this separate from final event judging and preserve blinded pre-event access. The draft leaves selection criteria, minimum completed-review count, score scale, and ranking/capacity rules undecided; finalize these before reviewing opens. Do not copy the illustrative final-rubric percentages or research-abstract weights into live scoring. Publish decisions and final-material requests only through the authorized release process. [H1, Sections 5.4, 8]

HAC-07. The source states a finalist capacity of eight teams per track, sixteen teams total. It does not define whether solo entries consume those places. The public cap and ranking implementation must explicitly resolve this before selection opens. PROPOSED, not yet approved: count each solo project and each team project as one entry within the same eight-per-track limit. Do not assume extra unlimited solo places or treat sixteen as the number of individual participants. Exact application/confirmation/preparation/final-upload deadlines remain TBD. [H1, Section 4]

HAC-08. Planned journey: structured off-campus preparation and online orientation, on-site mentoring on conference day one, then on-site pitches, judging, and awards on day two. The draft makes all listed stages compulsory and requires all participants to attend on-site finals to qualify for awards. Record required activity evidence per participant rather than giving every member attendance credit from one team scan. Allocate mentoring time fairly across entries. Detailed attendance evidence and exception rules require approval before participant onboarding. [H1, Sections 4, 6]

HAC-09. Minimum final output is the idea plus a pitch; a prototype is encouraged, not required. Each pitch is five minutes followed by three minutes of questions, assessed by a closed judging panel. Written materials remain English-only; spoken pitch/Q&A language, final file list, submission lock, presenter count, timekeeping, and overrun treatment remain TBD. A backup recording, screenshots, or PDF walkthrough can replace a failed live demo under the approved fairness procedure. The source's likely recording restriction is tentative, not an adopted blanket ban. Do not record or publish pitches automatically. [H1, Section 7]

HAC-10. Source conflict register: Section 5.1 requests national ID and phone/profile information, while AUTH-06 and PRV-03 exclude national ID and make phone conditional. National ID remains excluded until the organizer explicitly resolves the discrepancy and approves its purpose/access/retention; do not add it silently. Section 6.1 mentions a WhatsApp group, whereas the confirmed website is email-only. Keep automated platform communication email-only. Whether an external organizer-run group will exist, and whether it is optional, remains an operational question; do not automatically share participant numbers. [H1, Sections 5.1, 6.1]

HAC-11. Separate hackathon fees/inclusions, final rubrics, judge count, cross-panel comparison, tie rules, solo-versus-team award treatment, prize distribution, budgets, partners, IP terms, publicity permissions, and hackathon-specific certificate evidence remain unresolved. The source's options/examples are not commitments. Conference admission and workshop bookings remain separate manually approved workflows. Research-supervisor award rules do not automatically apply to hackathon winners. [H1, Sections 8–12]

TMT-01. 3MT is a dedicated postgraduate participation path, not an abstract presentation-format option. Support title, study/project narrative, presenter, affiliation, required declarations, review outcome, and final presentation material with English content and an English reviewer interface.

TMT-02. Exact postgraduate eligibility/evidence, participation limits, initial file requirements, presentation rules, slide/file limits, rubric, judge count, qualification stages, and certificate/award rules remain with the 3MT lead. Those settings are required before opening the relevant stage. Do not imply affiliation with an external competition or import rules merely from the name.

10. Workshop booking and program scheduling

WKS-01. Public workshop records MUST contain bilingual title/description, instructor, room/location, start/end time, capacity, remaining bookable seats, eligibility, price, and booking deadline. Capacity calculations distinguish administrator-reserved seats, active holds, and confirmed bookings. No participant names are exposed publicly.

WKS-02. Workshops require manual approval as specified in the draft, then completed payment or a validated full discount before booking confirmation. Confirmed conference registration is required to confirm a workshop place. Browsing does not require login. Multiple workshops are allowed provided the attendee's active holds/confirmed bookings do not overlap.

WKS-03. First-come-first-served order is determined by the server-recorded valid booking request, not the order in which staff click approve. A seat is provisionally held for a defined approval/payment window. The administrator must accept or reject it within that window or record an authorized extension. Holds must expire rather than block capacity indefinitely.

WKS-04. Capacity allocation, release, and discount redemption MUST be transactional and race-safe. When the last place is requested concurrently, at most one allocation succeeds. Declined, cancelled, or expired requests release their hold. Staff-reserved seats count against capacity and require a recorded reason and release deadline.

WKS-05. When capacity is unavailable, offer a waitlist entry without charging. On release, offer the next eligible person a time-limited place, record acceptance, complete any required approval and payment, then confirm. An offer is not an automatic charge or confirmed booking. Expired/declined offers pass to the next eligible person. Recheck eligibility and time conflicts at offer acceptance.

WKS-06. Overlap exists when start A < end B and start B < end A. Adjacent workshops are allowed unless a published transfer buffer is configured. A waitlist entry may exist for an overlapping workshop, but confirmation cannot create a conflict. Approval and payment must not bypass this validation.

WKS-07. Cancellations, workshop removal, time changes, and capacity edits require audit records and affected-user emails. A schedule change creating a conflict must enter a resolution workflow, not silently retain conflicting bookings. Capacity cannot be lowered below existing allocations without explicit reconciliation.

PRG-01. The program MUST be dynamically managed with days, parallel sessions, rooms, speakers, categories, descriptions, and day/category/room filtering. Show times in the event timezone. There is no user-built schedule feature; My Bookings lists actual registrations. Notify booked/assigned participants of relevant changes; major general changes may use an authorized conference-wide email.

11. QR tickets, check-in, and attendance evidence

CHK-01. Issue a unique, unpredictable QR credential for confirmed admission. It references an entitlement rather than embedding email, phone, licence number, or financial information. Sequential registration/submission references are not ticket secrets. Reissued/revoked credentials must be distinguished from current valid credentials.

CHK-02. The phone-compatible staff interface MUST request camera access securely, offer manual reference lookup with appropriate authorization, and show valid, already checked in, wrong activity/day, pending/unpaid, cancelled/revoked, and unknown-ticket outcomes. Staff access is limited to assigned entry points and minimum attendee information.

CHK-03. Selected attendance model A1: staff record one valid check-in for each conference day. Ordinary conference certificates do not require checkout or tracked hours. Workshops record their own check-in plus explicit completion confirmation by an authorized instructor/organizer. Keep individual activity events with participant, activity/day, timestamp, and staff identity; repeated scans do not create duplicate credit or attendance on a missing day. Hackathon compulsory activities and presentation/role evidence are recorded separately when required.

CHK-04. Each event records entitlement, activity/day, server time, scanner identity, result, and correction history. Authorized manual corrections require a reason and preserve the original record. Administrators can view live counts. Check-in staff cannot issue refunds, approve admission, or modify certificate criteria.

CHK-05. Online scanning is the baseline. Before the event, operations must choose and test an outage procedure. Full offline synchronization remains a gated feature, not a promised capability. A controlled minimal roster/manual-check-in fallback must protect data, record staff/time, and reconcile duplicate/conflicting entries after connectivity returns. Offline acceptance cannot claim real-time revocation checks across disconnected devices.

12. Surveys and certificates

CRT-01. Ordinary participant certificates have exactly two selected pathways. Full two-day conference attendance requires valid check-in on BOTH conference days plus completion of the general conference survey. No one-day attendance certificate is issued. Workshop participation requires a confirmed workshop booking, workshop check-in, authorized instructor/organizer completion confirmation, and completion of that workshop's survey. Workshop certificate eligibility does not additionally require earning the full two-day conference certificate. These records establish the specified participation evidence, not measured hours or accredited professional credit.

CRT-02. Selected survey model S2: retain participant-linked completion evidence for the relevant survey, but store feedback without a retained account-to-response link. Neither administrators nor ordinary exports may recover an identity through a response ID mapping, reusable token, request log, or shared join key. Do not store names, email, account IDs, IP addresses, or precise correlated request identifiers with answers. Assess metadata, free-text identification, small demographic groups, and logs before describing the design as anonymous. Submission/retry handling must durably accept valid feedback and record completion without duplicate completion credit or retaining a linkage. Approve question sets, deadlines, retention, and the technical unlinking method before enabling surveys; personal follow-up uses a separate contact route.

CRT-03. The selected ordinary-participant templates are Full Two-Day Conference Attendance and Workshop Participation only. Do not create a one-day variant. Existing research-presenter, reviewer, speaker, organizer, hackathon, and 3MT role/competition certificates remain separate approval-dependent pathways; this ordinary-attendance selection does not establish their eligibility or cancel them by implication. Each needs its own evidence rule and release approval. Non-attending co-authors do not automatically receive attendance or presenter certificates. Hackathon certificate conditions remain open in its draft Section 12.

CRT-04. The system calculates eligibility and prepares certificate generation automatically. Authorized administrators approve the template/signature and release batch; release then generates/issues eligible certificates and emails recipients automatically. Automatic processing does not remove the approval gate. Never imply accredited hours or professional credit without an approved entitlement to state them.

CRT-05. Certificates MUST have a unique opaque verification code and a public single-certificate verification page showing only the necessary recipient name, certificate type, edition/activity, and validity. No public directory, email, phone, licence number, or score is exposed. Rate-limit lookups and prevent predictable enumeration.

CRT-06. Support verified name-correction requests, revocation, and reissue with an audit trail. The original certificate must show revoked/replaced status when applicable. Speakers without accounts may receive a protected certificate-delivery link. Define private download access and public verification retention separately before issuance.

13. Email delivery and support

EML-01. All platform notifications MUST be email-only: verification, password recovery, registration/approval/rejection, payment/receipt events, submission receipt, revisions, published decisions, co-author/team invitations, workshop offers/bookings/cancellations, reminders, schedule changes, and certificate release. No SMS provider, WhatsApp integration, or push notification service is included.

EML-02. Configure a transactional email provider and verified branded sender on the approved domain. Candidate address convention: noreply@msrc2027.com, with an appropriate monitored Reply-To. Domain ownership, exact senders, provider, DNS access, and SPF/DKIM/DMARC configuration must be verified during implementation. A domain name alone does not establish a functioning mailbox or sender.

EML-03. Persist outbound jobs with event, recipient, template/version, deduplication key, attempt count, and delivery state. Retries must be bounded with backoff; exhausted jobs require administrator attention. Duplicate provider callbacks must not create duplicate messages. Do not hold a registration or submission request open while a bulk email batch sends.

EML-04. Staff MUST preview and send test templates before activation. Template variables are validated and escaped; missing recipient-specific data cannot become another participant's data. Track delivery failures/bounces and preserve a dashboard fallback for critical outcomes. Nonessential announcements follow communication preferences; essential account and participation messages remain operational.

EML-05. Size and test delivery for a 300–400-decision batch and approximately 1,000 attendee announcements, including provider quotas and a documented delivery target. Track queued-to-provider and provider-delivery states separately. A successfully queued email must not be described as delivered.

SUP-01. General support uses a website form and the existing single main inbox with category labels. Routes: MSRC27kau+generalinquiry@gmail.com; MSRC27kau+scientificinquiry@gmail.com; MSRC27kau+hackathon@gmail.com; MSRC27kau+workshop@gmail.com; MSRC27kau+sponsor@gmail.com; MSRC27kau+technical@gmail.com. Configure exact tested destinations, not arbitrary user-supplied recipients.

SUP-02. Form fields are category, name, email, related reference where applicable, and message. Send from the platform's verified sender with the validated user address as Reply-To. Apply spam controls and avoid echoing sensitive submission content in messages. General support creates no internal helpdesk ticket/status workflow; committee assignment happens through email.

SUP-03. Labels in a shared inbox are organizational routing, not committee-level access controls. Only authorized personnel may access the inbox. Business-email addresses are recommended for sponsors, never enforced by blocking consumer domains. Sponsorship inquiry tracking is the explicit exception described in Section 14.

14. Sponsorship, speakers, and public content administration

SPN-01. Public sponsor content includes approved packages, tiers, names/logos, descriptions, and booth details. PR/authorized administrators manage this content; sponsors have no portal or direct upload access. The sponsorship prospectus is sent by organizers/university through email rather than assumed to be a public download.

SPN-02. Sponsor inquiry fields include company, contact person, work/contact email, optional phone/job title, sponsorship interest, and message. Persist a restricted inquiry record, email the designated team, and acknowledge receipt. Track owner and statuses such as new, assigned, contacted, and closed. Only this inquiry category needs internal status tracking.

CMS-01. Authorized organizers MUST edit homepage copy, dates/countdown, About, announcements, speakers, program, workshops, sponsor profiles, committees/board, FAQ, contact information, and gallery through structured forms without code deployments. Fixed component layouts protect the design; arbitrary page-builder functionality is not required.

CMS-02. Support drafts, preview, publication, unpublication, and recovery of deleted content. Ordinary content may be published directly by its authorized publisher without a second approval. Media requires an explicit approval action. Capture content revisions and audit changes; scheduling of publication is optional until assigned a business requirement.

CMS-03. Speaker profiles contain approved name, title, institution, biography, photograph, professional links, and linked sessions. Speakers need no accounts. Private contact information is stored separately and excluded from public responses. Committee/board records follow the same approval/privacy principles. No separate international-speaker category is assumed.

CMS-04. Arabic/English public fields must have required translations or a clearly controlled fallback. Do not publish broken language switches or silently mixed navigation. Draft/preview content must be inaccessible through public search indexes or unauthenticated content APIs.

15. Media, visual design, and archive behavior

MED-01. Organizers upload images and videos directly to approved storage; third-party video embeds are excluded from the baseline. Albums support edition and activity categories, including opening, presentations, workshops, hackathon, awards, and closing. Public display includes only explicitly approved assets.

MED-02. Media consent is required. Record the permission wording/version, purpose, subject or group permissions where applicable, grant/withdrawal status, and evidence. Publication must be gated by valid permission and asset-use rights. Consent at registration must not be assumed to cover every bystander; identifiable non-registrants need the approved event process. Minor-participant handling remains an explicit policy gate.

MED-03. Declining optional publicity consent MUST NOT silently invalidate paid attendance. Provide an operational no-photo/withdrawal process and a route to request removal. Approved removal unpublishes the controlled asset and invalidates relevant delivery caches where supported; no promise is made to erase independent third-party copies.

MED-04. Preserve originals privately where justified and serve optimized display derivatives, thumbnails, responsive images, and appropriately encoded video. DEFAULT accepted gallery inputs: JPEG/PNG/WebP and MP4/WebM; exact upload sizes, duration limits, codecs, and storage budget must be configured. No public photo-download button is provided, but displayed media cannot be represented as technically impossible to copy.

DSN-01. Use a video-led homepage, clear conference information hierarchy, clean transitions, responsive button states, and controlled micro-interactions. Scrolling must retain normal keyboard, touch, and wheel behavior. Provide a static video poster, muted playback, a pause control, reduced-motion behavior, and a low-bandwidth fallback; decorative video must not delay registration access.

DSN-02. The design system must define English/Arabic fonts, colors, spacing, components, form states, motion limits, and approved KAU/MSRC branding. Logo, video, final assets, and brand approval are delivery inputs. Dark mode is not part of the committed scope unless separately approved.

ARC-01. After the event, close participation actions and retain approved public summaries, statistics, speakers, sponsors, consented media, and approved winners. Do not publish abstracts or an attendee directory. Private certificate access and public verification remain available for their approved retention periods. Archive behavior must not retain every personal record indefinitely.

ARC-02. Reuse the codebase for future editions but keep annual operational databases/storage/configuration separate, as selected in the draft. Public historical pages may coexist. No automatic transfer of participant accounts, submissions, or consent to a new edition is implied. Domain continuity, archive routing, and certificate verification ownership must survive annual committee handover.

16. Administration, reporting, and audit

ADM-01. Provide scoped dashboards for registrations by state, verified accounts, orders and exceptions, submissions by track/specialty/stage, review workload and completion, accepted work, workshop holds/occupancy/waitlists, attendance, email failures, sponsor inquiries, and certificate readiness. Counts must respect the viewer's permission scope.

ADM-02. Administrators can search/filter the records needed for their duties. Search in private dashboards is distinct from the excluded public full-site/abstract search. Actions include assignment, approval, revision, decision preparation/release, booking resolution, content publication, and permitted exports, with confirmation for consequential bulk changes.

ADM-03. Reports must support final conference statistics and CSV/Excel export. Full personal-data exports are Super Admin-only. Other roles receive aggregate or specifically authorized minimal operational views; generic administrator status does not grant profile export. Export files must use protected, expiring access and neutralize spreadsheet formula injection in untrusted text.

ADM-04. Audit records must include actor, action, target, timestamp, result, relevant previous/new values, and reason where required. Include role changes, approvals, overrides, decision publication, evidence downloads, refunds, consent changes, export generation, and attendance/certificate corrections. Audit access is Super Admin-only, and ordinary administrators cannot edit or delete their own audit records.

ADM-05. Logs must exclude passwords, OTPs, secrets, card data, and unnecessary full manuscript/profile content. Configure a retention period and access policy. Product changelogs are separate from security/audit records and may expose only non-sensitive release information.

17. Logical data model and service contracts

DAT-01. Core identity records: account, participant profile, edition-scoped role grants, staff assignments, consent records, and support/privacy request records. General inquiry content need not become a helpdesk table merely because privacy requests require processing evidence.

DAT-02. Scientific records: track configuration, submission, immutable submission version, ordered authors and affiliations, author responsibility assignments, attachment/version, evidence-validation result, rubric/version, review assignment, conflict declaration, human review, AI assessment, revision request, decision, publication batch, presentation allocation, judging assignment/scorecard, and award record.

DAT-03. Operations records: conference registration, order/order item, KAU payment attempt/official confirmation or reconciliation evidence, refund, discount/redemption, workshop, seat hold, waitlist entry/offer, booking, room/session/speaker, ticket, participant-level attendance event/correction, workshop completion sign-off, survey completion ledger, separate unlinked feedback records, certificate template/eligibility/release/verification, sponsor/inquiry, public content/revisions, media/album, email job/delivery event, and audit event. Feedback has no foreign key or retained correlation mapping to participant/completion records. Hackathon entries additionally require solo/team mode, registered roster, and post-acceptance member-confirmation states.

DAT-04. Enforce foreign keys and appropriate uniqueness: normalized account email; edition/reference; user/workshop active booking; provider event/transaction identity; invitation identity; active seat allocation; certificate verification token; and notification deduplication key. Use stable internal identifiers, creation/update timestamps, and immutable decision/submission snapshots. Deletion and anonymization follow Section 18 rather than indiscriminate cascade deletion.

API-01. Backend operations must explicitly cover draft save/finalize/withdraw/revise; solo/team entry and post-acceptance membership confirmation; review assignment/submission/locking; decision preparation/publication; registration approval; KAU collection handoff/reconciliation/refund tracking; seat allocation/waitlist offers; scan/correction/workshop completion sign-off; unlinked feedback submission with separate completion evidence; consent/publication; certificate release/verification; and scoped reporting/export. Each operation declares permissions, allowed source state, validation, resulting state, audit event, and notification behavior. Feedback payloads must not enter identity-linked audit logs.

API-02. Mutating operations use server-authoritative prices, capacity, deadlines, and identity. Use idempotency keys for final submission, checkout, webhook processing, booking, scanning, and publication. Use optimistic concurrency for competing edits and transactional allocation for scarce seats. Return stable error codes and user-safe messages without revealing unrelated records.

API-03. Long-running work uses durable jobs: email, AI assessment, file scanning, certificate generation, report export, and cleanup. Jobs require retry limits, deduplication, visibility, and authorized replay. The successful user response must distinguish accepted-for-processing from completed work. No notification is sent for a database mutation that rolled back.

18. Privacy, consent, retention, and research confidentiality

PRV-01. Identify the legal data controller, approved contact channel, processors, purposes, and applicable legal bases before collecting production data. The Research Principles Club/MSRC operational ownership statement does not itself settle the legal controller. Document KAU approvals or confirmation that no additional institutional restrictions apply; do not treat an unanswered institutional check as approval.

PRV-02. Implement a privacy notice covering account/participation, authorship data, payments, review and AI assessment, attendance, certificates, surveys, publicity, service providers, transfers, retention, and rights. Record notice/terms versions. Photography/publicity permission and optional announcements must be separate from necessary registration processing. Saudi PDPL rights and transfer conditions inform the implementation; detailed applicability must be recorded before launch. [R9, R11]

PRV-03. Minimize data. Do not collect national IDs or patient-identifying health records. Collect medical licence numbers only for the specifically approved professional purpose. Restrict access by duty, and avoid exposing personal data in URLs, analytics, exports, public certificate search, or ordinary email bodies.

PRV-04. Support verified access, correction, deletion/destruction, and applicable consent-withdrawal requests. Record receipt, identity verification, decision, exceptions, actions, and response. Lack of an instant delete button is not absence of a request process. Publicity withdrawal and account deletion are different requests and must not be conflated.

PRV-05. DEFAULT ordinary participant-data retention: one year from conference end. This is the baseline, not a universal deletion rule. Before collection, separately approve financial record obligations, scientific/award audit needs, media permission evidence, anonymous aggregates, and minimal certificate verification retention. Each exception needs purpose, fields, duration, and owner; indefinite retention is not an implied default.

PRV-06. Scheduled cleanup must cover database records, private files, derivative media where applicable, exports, logs, and backup expiry. Where retention is justified, restrict processing rather than claiming the data was deleted. Preserve only non-identifying aggregate statistics after anonymization. A restore procedure must reapply deletion/revocation records so erased data is not silently returned to normal use.

PRV-07. Map actual data flows and locations for database, storage, backups, application processing, email, AI provider, analytics, and logs. Cross-border processing requires documented assessment and applicable safeguards under the Saudi rules. Consent alone must not be treated as a universal transfer authorization. Region selection is a technical setting, not proof of compliance. [R1, R11]

PRV-08. Add a public photography notice plus recorded publication permission, copyright/asset-use validation, and a removal workflow. No photographer-credit feature is required by product scope, but contractual attribution/use restrictions still need to be honored. Research confidentiality continues after rejection, withdrawal, or event completion.

19. Security and file protection

SEC-01. Use HTTPS, managed password security, protected sessions, input validation, output encoding, CSRF protections where applicable, rate limiting, accessible anti-bot controls, and least-privilege authorization. Protect both interface routes and direct API/storage access. Every sensitive record must be checked against ownership, assignment, and scope. [R4]

SEC-02. With Supabase, enable row-level security on exposed tables and explicitly authorize permitted rows/operations. Keep identity-bearing records separate from sanitized reviewer data. User-editable metadata must not control roles. Secret/service-role keys remain server-only; publishable client access does not justify broad grants. Views/functions and storage policies need explicit security tests. [R5]

SEC-03. Upload controls must check authenticated purpose, exact extension allowlist, MIME/content signature, size, and malware status. Use generated storage names, private buckets, quarantine until cleared, and expiring authorized access. Block executables, macro-enabled Office files, and arbitrary archives. Failed scanning must not publish a file. Keep metadata and scan results without exposing confidential originals. [R12]

SEC-04. Stage-one PDF reports and stage-two PDF/DOCX/PPTX files must follow their distinct size/purpose rules. File acceptance before a deadline is based on completed upload/finalization at the server; a background security scan may finish later. A rejected file generates a remediation status and notice, not silent replacement or deletion of the submission history.

SEC-05. A preview does not prevent copying. Do not claim that hiding a download button protects confidentiality; authorization and private delivery are the controls. Signed links must expire, and unauthorized users must not obtain them. Never expose stage-one evidence to blind reviewers through a preview endpoint.

SEC-06. Protect secrets in the provider's secret store/environment controls, rotate credentials during handover or incidents, pin dependencies, and require reviewed production changes. Production diagnostic logs and error monitoring must redact sensitive content. Staff suspension must revoke relevant privileges even where an old token still exists.

SEC-07. Maintain an incident procedure with named operational/privacy owners, containment, evidence preservation, access revocation, recovery, and assessment of required notifications. This document does not assert a completed security assessment; permission tests, backup restoration, and critical failure tests are launch gates.

20. Hosting, environments, and operational ownership

INF-01. Selected platform: managed Vercel for the web application and managed Supabase for PostgreSQL, authentication, and private storage. Saudi self-hosting and university-provided application hosting are not the selected baseline. Framework, provider plans, and exact regions remain implementation/configuration decisions. Payment uses the selected authorized KAU arrangement; email, file scanning, assessment services, and any analytics require their own approved configuration. No cloud project, paid plan, or production credential is created by this specification.

INF-02. The providers are selected, but no exact data region is selected and Saudi hosting must not be assumed. Confirm actual locations and data flows for application processing, database, authentication, files, backups, email, assessment services, and logs against current provider documentation and institutional requirements before production provisioning. Development and demonstrations may proceed with synthetic data while these approvals are pending. Record approval evidence separately from the organizer's selection of managed Vercel and Supabase. [R1]

INF-03. Selected ownership model O1: MSRC/RPClub-managed organizational repository and service accounts with institutional authorization. Keep msrc2027.com, the repository, Vercel team, Supabase organization, billing, and recovery arrangements under organizational control with named individual custodians and delegated developer access. Designate a continuing custodian for annual handover and a backup owner; verify registrar/DNS control and renewal responsibility. Website Super Admin permissions are separate from infrastructure ownership. Named custodians and evidence of institutional authorization remain to be recorded; neither is implied by selecting O1.

INF-04. Maintain development, staging, and production environments with separate data, secrets, provider keys, and access. Staging uses test accounts, sandbox payments, and email recipient restrictions. Do not copy live participant data into staging without an approved minimized/sanitized process. Preview deployments must not expose private content or become indexed.

INF-05. Deployment requires source control, reviewed changes, automated tests, database migrations, and a named release approver. Record configuration and migration changes; keep a tested rollback/recovery path. Database rollback must not discard newly received orders/submissions without reconciliation. Technical handover includes runbooks, credentials ownership, billing, schema/migrations, job monitoring, and renewal obligations.

INF-06. Back up database records and actual storage objects separately. Supabase database backups retain storage metadata, not the stored file contents, so restoring the database alone does not recover deleted files. Maintain a tested object-backup/restore process and verify the chosen plan supports the approved recovery targets. [R2]

INF-07. DEFAULT recovery targets: maximum 24-hour data loss and four-hour service restoration during ordinary periods. For registration deadlines and event operations, target no more than 15-minute database loss and one-hour restoration, subject to approved infrastructure/budget and demonstrated tests. File-recovery targets must be specified separately. These are engineering objectives, not provider guarantees.

INF-08. Monitor service availability, failed final submissions, queue backlog, payment exceptions, email failures, unauthorized-access attempts, file-scan failures, and check-in errors. Send operational alerts by email to named owners. Schedule daily/critical-window checks, rehearse restoration before launch, and define who responds during the event. The website does not rely on this chat to monitor production.

21. Performance, time, reliability, and error handling

NFR-01. Baseline load test: 100 concurrent active registration/submission users. Stress scenario: 1,000 concurrent public browsers with an explicitly documented mix of authenticated operations. These reconcile the draft's two different concurrency figures as test scenarios, not measured demand. Actual workshop/hackathon peaks and provider quotas must be confirmed.

NFR-02. DEFAULT targets on agreed mobile hardware/network: public-page Largest Contentful Paint at or below 2.5 seconds at the 75th percentile; ordinary internal API responses at or below one second at the 95th percentile, excluding uploads and external/background work. Report test conditions, error rate, and result, not only averages. The organizer must approve any measured exception before opening the affected flow.

NFR-03. Target 99.9% monthly application availability, with no planned maintenance during published opening/deadline/event windows. This is a service objective rather than a promise of zero downtime. Static content should use caching/CDN delivery without caching private dashboards or exposing personalized API responses.

TIM-01. Store instants in UTC and display event deadlines/times in Asia/Riyadh with the timezone label. Forms open/close according to server time. Conference, workshop, abstract, hackathon, 3MT, review, revision, final-upload, and survey/certificate deadlines are separately configurable and auditable.

TIM-02. A form opened before a deadline does not reserve the right to finalize after it. Accept only a server-completed finalization before the configured deadline; retain drafts and show a clear closed message. Authorized extensions must state scope, new cutoff, actor, reason, and whether notifications are sent. No browser-clock workaround may bypass the rule.

ERR-01. Handle expired verification, duplicate registration, failed/oversized uploads, failed autosave, simultaneous edits, full workshops, expired offers, failed/ambiguous payments, missed deadlines, withdrawn assignments, and inaccessible records explicitly. Preserve valid saved work and give a reference/support route. Avoid generic success states while required downstream actions failed.

ERR-02. Use optimistic edit-version checks, retry-safe mutation identifiers, and durable job status. A closed browser must not duplicate a charge/submission on retry. A provider outage cannot silently discard an accepted request. Applicants see a recoverable status; staff see diagnostic details without leaking secrets or other participants' information.

22. Delivery gates and definition of done

REL-01. Public-site gate: approved branding/core content, bilingual participant navigation, accessibility checks, working contact/privacy/terms, secured CMS, verified ownership, monitoring, and tested backups. An informational public launch does not authorize opening unfinished participation workflows.

REL-02. Registration/workshop gate: prices, capacity, manual approvers, hold/payment windows, discounts, named KAU collection owner and verified integration/reconciliation contract, refund rules, tested email, race-safe allocation, and valid-ticket enforcement. All critical payment/approval failure scenarios must pass before accepting real money or issuing tickets. Selecting P1 does not bypass proof of the actual collection and confirmation procedure.

REL-03. Submission/review gate: final field schemas, study-stage templates, ethics/similarity policy, upload security, submission limits, reviewed rubric/quorum, reviewer anonymity, revision logic, and decision release controls. AI production use additionally requires provider/privacy approval and a recorded assessment evaluation; manual review remains the failure fallback.

REL-04. The hackathon's two tracks, solo/team participation, five-member maximum, and answered event structure may now guide development. Remaining eligibility wording, cross-mode membership rules, finalist-capacity accounting, source conflicts, form/file details, deadlines, and public terms must be resolved before the affected stages open. 3MT retains its separate unresolved settings. Keep clear not-yet-open states and do not replace unapproved rubric/fee/prize options with invented values.

REL-05. Event gate: correct program/rooms, valid rosters/tickets, trained staff, device tests, daily check-in and workshop completion-sign-off procedures, hackathon compulsory-activity evidence, judging configuration, and rehearsed outage handling. Certificate gate: approved full two-day/workshop templates, survey question sets/deadlines, tested S2 unlinking and completion handling, retention/public verification policy, administrator release, and correction/revocation tests. Ordinary eligibility is defined in CRT-01, not deferred as an unknown attendance threshold. Role/competition certificates require separate approval.

REL-06. Definition of done for each feature: requirement implemented; permission and state-transition tests passed; relevant Arabic/English/accessibility checks passed; failure paths tested; audit/email behavior verified; staging acceptance recorded; operational owner/runbook assigned; and production configuration verified. A successful demonstration of the happy path alone is insufficient.

23. Decision status, business configuration, and approvals

Record confirmed selections separately from remaining operational inputs and external approvals. Confirmed: O1 MSRC/RPClub management with institutional authorization; managed Vercel + managed Supabase; P1 KAU collection; C3 solo/team hackathon entries; A1 daily check-in with full two-day and workshop certificates only; S2 unlinked feedback with tracked completion. These choices permit development with synthetic data. A dependent production workflow remains closed until its listed configuration, evidence, and approvals are complete. Source proposals and engineering defaults retain their labels.

CFG-01. Conference leadership: exact event dates/venue, general capacity, admission categories, manual approval owners, decision turnaround, payment/seat-hold deadlines, and handling of capacity-pending requests. Gate: registration opening.

CFG-02. Finance/leadership. CONFIRMED: P1, use the authorized KAU payment arrangement. REMAINING: responsible KAU unit/contact, exact system and official payee, integration documentation/access or authorized report-based reconciliation, order references, currency/prices/tax treatment, methods actually enabled, student-discount evidence/limits, refunds/cancellations and their authority, settlement reporting, and dependent-booking rules. Test the actual confirmation process; do not assume API/webhook support. Gate: relevant paid or discounted registration opening.

CFG-03. Scientific lead: specialty codes, study-type choices, corresponding-author eligibility, keyword requirements, rubric criteria/scales, ongoing-study treatment, required review count, acceptance threshold, tie/disagreement rules, similarity provider/settings, and final-material requirements/deadlines. Gate: the relevant submission/review stage.

CFG-04. Scientific/award lead: award categories, event-judging rubric/ties, supervisor details/evidence required ONLY from selected research winners, verification responsibility, and response deadline. Gate: event judging and award release.

CFG-05. Hackathon lead. CARRIED FORWARD: C3 solo/team competition, no matching, maximum five per team, cross-university teams, two named tracks locked after acceptance, title plus 300-word pitch, new ideas only, two independent reviewer assignments, compulsory orientation/day-one mentoring/day-two finals, idea-plus-pitch minimum, optional prototype, and five-minute pitch plus three-minute Q&A. REMAINING: final eligibility wording, cross-mode duplicate rules, member editing/confirmation/lock policy, solo inclusion in the eight-per-track finalist limit, detailed forms/files/references, dates, review quorum/rubrics, recording/spoken-language policy, fees/inclusions, prizes, IP terms, and hackathon certificate evidence. Resolve CFG-13 source discrepancies. Gate: each relevant hackathon stage. [H1]

CFG-06. 3MT lead: postgraduate eligibility, presenter limits, form/file requirements, stage deadlines, presentation rules, judge/rubric configuration, and certificate/award evidence. Gate: 3MT opening.

CFG-07. Workshop lead: catalog, rooms, per-workshop capacity, price, reserved seats, approval responsibility, hold/offer windows, deadlines, prerequisites, cancellation handling, and whether the 30–100 estimate is per workshop or total. Gate: workshop opening.

CFG-08. Operations/certificate lead. CONFIRMED: A1 daily check-in; full conference certificate requires BOTH days plus general survey; NO one-day certificate; workshop certificate requires its booking/check-in/completion sign-off/survey, independently of earning the full conference certificate. S2 feedback is unlinked while completion is tracked. REMAINING: sign-off owners/procedure, survey questions/deadlines and privacy-tested unlinking method, templates/signatures, role/competition certificate rules, release authority, correction handling, and outage contingency. Gate: event operations and certificate release.

CFG-09. Organizational/privacy owner: record legal controller/contact and institutional approval evidence under the selected O1 model. Finalize field purposes, media/minor policies, notices/legal bases, processor contracts, actual locations/transfer assessment, retention exceptions, request handling, certificate-verification lifespan, and S2 metadata/log separation. Resolve the hackathon's requested national ID/phone fields against the existing minimal-profile policy before opening its form; national ID remains excluded pending an explicit decision and approved handling. Gate: production data collection.

CFG-10. Technical owner with privacy/scientific approval. CONFIRMED: managed Vercel + managed Supabase. REMAINING: approved plans/regions and complete data-flow assessment, KAU payment integration details, email sender/DNS, assessment provider/data terms/evaluation, hackathon originality-check procedure, malware scanning, storage/backups, throughput/quotas, monitoring, and monthly/event budget including video delivery. Use synthetic development data while production location/processing approvals are pending. Gate: production provisioning or relevant integration activation.

CFG-11. Club/leadership. CONFIRMED: O1 MSRC/RPClub-managed organization accounts with institutional authorization. REMAINING: authorization evidence, named continuing custodian and backup owner, organizational repository/domain/Vercel/Supabase/billing access, DNS/recovery controls, three website Super Admins, release approver, support/incident coverage, renewal responsibility, and annual handover. Infrastructure ownership and website Super Admin roles remain separate. Gate: production deployment.

CFG-12. Design/content lead: logo/brand system, English/Arabic fonts, homepage video/poster, approved speaker/committee/sponsor assets, translations, public-page content, media permissions, and archive/domain continuity. Gate: public launch.

CFG-13. Hackathon lead with privacy/operations/technical owners. SOURCE RECONCILIATION REQUIRED: (a) requested national ID and phone/profile fields versus current exclusions/conditional fields; (b) the draft's WhatsApp group versus confirmed email-only platform communications, including whether any external group is optional; (c) whether solo projects consume the stated eight-team-per-track/sixteen-team finalist quota; (d) broader eligibility still labelled Options; (e) originality-check method and human decision process. Do not silently resolve these or activate the affected collection/communication/selection behavior. [H1, Sections 3–6]

24. Acceptance tests and release evidence

AT-01 Identity. A visitor can browse public pages. An unverified account cannot submit, register for payment, or book. An expired/reused code fails; resend and attempt limits work; valid verification succeeds once. Password recovery and privileged MFA are tested without SMS.

AT-02 Authorization. A participant cannot obtain another user's record by changing an ID. Reviewers cannot retrieve author identity or administrative evidence through UI, API, file links, exports, or metadata. Check-in, finance, media, and sponsorship permissions do not leak scientific/private profile data. Revoked roles fail on direct requests.

AT-03 Approval. Ordinary and 100%-discount registrations remain pending until a named organizer approves. Approval without payment/zero-order completion does not issue a ticket. Rejection, expiry, cancellation, and revocation produce the defined states and notification behavior.

AT-04 Payments. Test the actual authorized KAU interface or approved official-record reconciliation. Forged/mismatched confirmations and manipulated client prices fail. Repeated/out-of-order confirmations cannot duplicate payment credit, tickets, bookings, discounts, or refunds. A browser return or receipt screenshot alone cannot confirm payment. Late confirmation after hold expiry cannot overbook, and a refund request is not displayed as a completed refund before official confirmation.

AT-05 Capacity. Simultaneous requests for the final conference/workshop seat allocate at most one place. Reserved seats and active holds reduce availability correctly. Hold expiry and cancellation release exactly once. Admin approval cannot exceed capacity.

AT-06 Waitlists. No charge occurs on joining a waitlist. The next eligible participant receives a time-limited offer. Decline/expiry advances it once; acceptance rechecks approval, payment, eligibility, and overlap. Stale links cannot claim an already allocated seat.

AT-07 Abstract rules. Accept an eligible ongoing study with explicitly unavailable results and no supervisor. Enforce 300 body words with excluded metadata, both ordinary and case-report templates, English scientific content, and the two-finalized-applications-per-PI rule. A third attempt does not disqualify the existing two.

AT-08 File stages. Stage one accepts only applicable IRB and similarity-report PDFs within limits; it rejects presentation files. Stage two accepts configured PDF/DOCX/PPTX only after authorization. Spoofed, oversized, malicious, and macro-enabled files are rejected/quarantined. Replacing a file preserves the reviewed snapshot.

AT-09 Review and AI. Conflicted/unassigned reviewers cannot score. Required review quorum excludes missing scores. AI failures and injected manuscript instructions cannot publish a decision. Human independent scores, model suggestions, rubric versions, and overrides remain distinct. Provider transmission excludes prohibited identity/evidence fields.

AT-10 Decisions and revisions. Prepared decisions remain hidden until authorized batch publication. Only published changes trigger applicant emails, without duplicate deliveries. A revised submission must be finalized within its 14-day window or an audited extension. Expiry and email replies alone do not count as revised submission.

AT-11 Winner condition. Nomination and ordinary acceptance work without supervisor information. Only selecting a research award winner activates the supervisor requirement; award finalization waits for validation without cancelling the research acceptance.

AT-12 Tracks. A solo entrant can submit/compete without joining a team; a five-person hackathon team is allowed and a sixth member is rejected. Cross-university teams are accepted. Verify accounts at registration and request member acceptance at the post-acceptance stage. Repeated invitations do not duplicate membership. Enforce the two tracks, acceptance lock, 300-word pitch, optional prototype, and two independent reviewer assignments without applying unapproved rubric weights. Solo-capacity accounting, cross-mode duplicates, and other unresolved settings block the relevant stage until configured. 3MT retains its own rules; pre-event identities remain hidden.

AT-13 Check-in. Pending/unpaid/revoked, wrong-day, and wrong-workshop credentials fail. Duplicate scans do not add credit or satisfy the other conference day. Ordinary check-in does not require checkout. Workshop completion sign-off is a separate restricted, audited action. Missing hackathon-member attendance is not filled from a teammate's scan. Manual lookup/corrections and the selected outage procedure are tested on staff phones.

AT-14 Certificates and feedback. Full conference eligibility requires BOTH daily check-ins and the general survey; a one-day attendee receives no ordinary conference certificate. A booked workshop attendee with workshop check-in, completion sign-off, and its survey may earn that workshop certificate without earning the two-day certificate. Missing evidence blocks issuance, and generation cannot bypass administrator release. S2 completion retry tests award credit once while response records, exports, mappings, and logs retain no account-to-answer link. Public verification and revocation/reissue expose only intended certificate details.

AT-15 Content and consent. Unapproved media cannot publish. Consent refusal is not treated as registration rejection. Removal requests unpublish controlled assets as designed. General content publishing, private previews, bilingual pages, reduced motion, and keyboard/error handling behave as specified.

AT-16 Reliability. Retry after browser closure does not duplicate a submission or payment. Autosave failures are visible. Load tests meet the agreed profile/targets, queues handle decision/announcement batches, and no success message misrepresents delivery. Document measured results and any approved exceptions.

AT-17 Recovery and privacy. Restore both database and stored files into an isolated environment, reconcile identifiers/payments, reapply deletion/revocation records, and verify recovery time/data-loss results. Test conditional licence collection, data-request handling, export permissions, and retention cleanup with synthetic records.

AT-18 Handover. Verify O1 organizational ownership and authorization evidence, named custodians, selected managed Vercel/Supabase environments and approved locations, KAU collection responsibility, production/staging isolation, secret access, role offboarding, renewals, critical-window support, and completed gate values. Record an accountable sign-off for each opened workflow. Unresolved national ID/WhatsApp source discrepancies cannot silently enable new collection or automated channels.

25. Privacy notice implementation copy

Status: working publication copy. Replace bracketed controller/contact/processor/retention fields and complete the Section 23 privacy approval before publishing. Do not display unresolved brackets to participants.

Who manages your information. [Legal controller name] manages personal information for MSRC 2027. Questions and privacy requests can be sent to [verified privacy contact]. The notice applies to website accounts, event participation, submissions, reviews, payments, attendance, certificates, and approved conference media.

Information we use. We use the information needed for your selected activity, such as your name, email, role/institution, registration details, submission and author information, payment references, attendance records, and certificate eligibility. Professional licence details are requested only where we explain a relevant professional purpose. We do not request national ID details or patient-identifying research material through this platform.

Purposes and access. We use this information to administer accounts and applications, review work, process approved bookings/payments, communicate outcomes, record attendance, issue certificates, provide support, and protect the service. Access is limited by role. Public abstract and attendee directories are not provided. Essential communications are sent by email; optional announcements follow your recorded preferences. [Insert approved purpose-to-legal-basis statement.]

Research assessment. Submitted work is confidential. Authorized reviewers receive anonymized review material. Where approved AI-assisted assessment is used, the submission notice identifies the tool/purpose and the scientific information processed. Human reviewers and the committee retain decision responsibility. [Insert approved provider, processing location, retention, and confidentiality arrangements before enabling AI assessment.]

Service providers and locations. Approved providers process only the information needed for hosting, storage, authentication, email, payments, security, and any enabled assessment services. [Identify providers/categories and applicable locations.] Any processing outside Saudi Arabia must follow the approved safeguards and applicable transfer requirements. Card details are handled by the payment provider rather than stored by the conference website.

Photos and videos. Publicity permission is requested separately and recorded. You may decline optional publicity or contact us to withdraw permission/request removal of controlled published material. This does not automatically cancel your registration. [Insert the approved on-site no-photo procedure and any minor-participant rules.]

Retention and certificates. Ordinary participant data is retained for one year after the conference unless a stated financial, scientific, security, or other lawful retention need applies. [Insert the approved exceptions and durations.] Minimal certificate verification details remain available for [approved verification period]. Your account records completion of the applicable survey for certificate eligibility. Feedback is stored without a retained link between your account and your answers. Avoid identifying yourself or others in free-text feedback. The implementation and its logs must be checked against this separation before this notice is published.

Your requests. You may contact us to request access, correction, deletion/destruction, or withdrawal of applicable consent, subject to the law and justified retention requirements. We verify requests, explain any applicable limits, and record the response. An account-deletion request is handled through support; the absence of an instant deletion button does not remove this process.

26. Technical and governance references

References support the specifically marked technical/legal statements. Product requirements and defaults are MSRC design decisions, not claims that the cited organizations mandate every implementation detail. Recheck changing provider documentation and applicable regulations before deployment.

[R1] Supabase: Available regions and data residency.

[R2] Supabase: Database backups and exclusion of stored file objects.

[R3] Supabase: Multi-factor authentication and server/data-layer enforcement.

[R4] OWASP: Authorization Cheat Sheet.

[R5] Supabase: Row-level security.

[R6] W3C: Web Content Accessibility Guidelines 2.2.

[R7] Crossref: Understanding your Similarity Report.

[R8] ICMJE: Use of Artificial Intelligence in Publishing.

[R9] SDAIA: Personal Data Protection Law.

[R10] ICMJE: Protection of Research Participants.

[R11] SDAIA: Regulation on Personal Data Transfer Outside the Kingdom.

[R12] OWASP: File Upload Cheat Sheet.

[H1] Hackathon Draft, working draft v0.1 with updated answers. Sections 2–7 provide answered planning details; options, examples, tentative statements, and unresolved conflicts remain identified in Section 9 and CFG-13 of this specification. Source document: 



---

# Included file: sources/Hackathon_Draft.txt

Hackathon Draft

MSRC 2027 | King Abdulaziz University | Working draft v0.1

A planning document for us to agree on the hackathon before publishing its rules. The existing MSRC website decisions are carried over below. Everything labelled as an option, example, or proposal is for discussion, not an approved commitment.

Start with Sections 2–5. Add answers under each question, then record the agreed direction and owner at the end of each section. Dates, capacities, partners, prizes, and fees remain undecided unless we confirm them.

1. Overview and existing decisions

Context: The hackathon is part of MSRC 2027 at KAU. The conference is planned as a two-day event, but the hackathon's preparation period and event schedule are still open. [S1: SCP-01, CFG-05]

Platform: Applications will run through the MSRC website as a separate pathway from conference registration, abstracts, and 3MT. The planned setup includes a project, submitting lead, invited members, drafts, review, decisions, and final materials. Automatic team matching is excluded. [S1: TRK-01, HAC-01–04]

Language and review: Public and participant interfaces are Arabic/English. Project submissions and assessment screens are English-only. Pre-event reviewers must not see applicant identities; live event judging is a separate stage. [S1: LOC-01–03, ROL-04]

Communication and attendance: Platform notifications are email-only, in English. Conference registration requires manual approval and is separate from hackathon acceptance. The current specification lists MSRC27kau+hackathon@gmail.com as the hackathon inquiry route, to be tested before launch. [S1: REG-02–03, EML-01, SUP-01]

Rules still needed: Tracks, eligibility, solo/team model, team limits, deadlines, submission requirements, scoring, awards, and certificate criteria. Research-abstract word limits, scoring weights, and supervisor rules must not automatically be applied to the hackathon. [S1: TRK-01, CFG-05]

2. Purpose, theme, and tracks

2.1 What do we mainly want participants to achieve?

Turn research into practical and innovative solutions.

Come up with innovative tools and ideas to improve research in medicine.

Build and demonstrate prototypes if possible.

Targeted outcome is a mix of learning and innovation.

2.2 What should the overall theme be?

Research-to-impact

Working name: MSRC 2027 Hackathon.

2.3 Do we want one open category or several tracks?

Two focused tracks. 

1. Translating research into practice: Students can use published research to develop practical, evidence-based solutions to real-world healthcare challenges.

2. Advancing medical student research: Students can develop innovative ideas to improve how medical students conduct, collaborate on, and contribute to research, strengthening its quality and impact on healthcare.

2.4 Where will the challenges come from?

Teams will bring their own problems, and discuss potential solutions and their applicability and feasibility, and will defend the implementation of such solutions.

Can teams switch tracks after acceptance? No, whatever track a team is accepted into will be the one they will participate in during the conference.

3. Eligibility and team rules

3.1 Who can participate?

Options: University students (and interns) across Saudi Arabia, from any specialty.

Is a healthcare member required? No

Are international applicants eligible? Yes

3.2 How will people enter, and how large should teams be?

Both pre-formed teams and solo applicants are allowed. 

Solo applicants will not be matched to an existing team. 

Maximum number of members in a team will be 5. 

3.3 What membership rules should we set?

One team per person.

One project per team.

Should cross-university teams be allowed? Yes, it will be allowed.

3.4 When must members accept invitations, and who can edit?

All members will verify accounts while signing up and registering for the hackathon, and will accept the invitation after receiving acceptance to hackathon participation. 

4. Format, timing, and capacity

4.1 How should the hackathon fit around the two-day conference?

Hackathon will be scheduled on the second day (both pitch and judging).

Off-campus preparation followed by on-site pitch with a presentation during the conference. All details regarding the competition will be provided at a sufficient time period prior to the hackathon.

How do we avoid conflicts with research presentations and key sessions? Refer to leader of flow and schedule (Aisha).

4.2 What attendance model can we support?

Off-campus preparation with mandatory on-site finals. 

Are all members required on-site, or only a minimum number? All teams present with all participants attending in order to qualify for awards.

Will work happen in daytime sessions or include extended hours, subject to venue approval?

4.3 How many teams can we realistically support?

8 teams per track, 16 teams total. 

4.4 What are the key dates and response windows?

All TBD soon.

Applications open [TBD], applications close [TBD], decisions [TBD], team confirmation [TBD], preparation [TBD], event [TBD], final upload [TBD], awards [TBD]. 

5. Application and selection

5.1 What should the initial form ask for?

Personal information, including name, national ID, email, number, university, and specialty will all be provided in applicants’ profiles created on the website.

Starting fields: project title, track, problem, target users, proposed solution, innovation, technical approach, feasibility, expected impact, current progress, and team details. 

One field will be for the title, another will be for the pitch, with a 300-word limit provided.

Participants will be able to upload documents to support their pitch or idea, but this is not a requirement.

5.2 What stage of project can enter?

New ideas only for the hackathon. Applicants’ ideas will be checked to ensure that they have not been pitched in previous hackathons. An AI-assisted plagiarism checker will be employed to ensure creativity. 

Are previously entered, prize-winning, funded, or commercially launched projects eligible? No, only new ideas.

What must teams declare about existing work and contributions made during this event? They should cite references and add an appendix at the end.

5.3 Which supporting documents are actually needed?

Ethics or IRB document if necessary.

Prototype evidence of applicable.

Final presentation files belong to the later stage. 

5.4 How will we shortlist and confirm teams?

Eligibility check plus two independent reviewers for each applicant. 

What selection criteria, minimum completed reviews, and capacity rule apply? To be decided before the conference.

6. Participant journey and mentoring

6.1 What happens between acceptance and the final pitch?

Online orientation with whatsapp group → on-site mentoring during first day → pitch on second day→ awards on second day. 

A structured preparation period will be provided. 

Which stages are compulsory? All stages are compulsory.

6.2 What mentors do we need, and how do we allocate their time?

Mentors will be provided and will meet applicants on the first day.

Finding mentors will be the task of leader of faculty and judges (Reem).

Mentors will mentor all teams fairly and with equal treatment.

How much contact time is guaranteed equally? The first day of the conference will be spent with the mentors for an allocated time period.

6.3 Which sessions and resources should we provide?

Look into getting a specific course to sponsor the hackathon.

Mentoring session will be provided the day before the hackathon.

7. Final deliverables and pitching

7.1 What is the minimum final output?

Minimum output is the idea plus the pitch.

Prototype is not required but encouraged.

7.2 What must teams submit, and when does it lock?

To be decided before conference.

7.3 How long should each pitch and discussion be?

5-minute pitch + 3-minute questions.

Set the speaking order, timekeeping rule, number of presenters, and treatment of overruns. 

Written materials stay English-only; decide the spoken pitch and audience-question language separately.

7.4 Who sees the projects, and what is the demo fallback?

A closed judging panel will be responsible for judging all the pitches.

What can be recorded or published with permission? Most likely, all recording will be restricted during the hackathon.

A backup recording, screenshots, or a PDF walkthrough can replace a failed live demo without unfair advantage.

8. Judging and awards decisions

8.1 What should the final rubric reward?

Illustrative weights only: clinical/problem relevance 25%, feasibility 20%, innovation 20%, evidence and validation 15%, safety and responsible use 10%, pitch clarity 10%. Total: 100%. Options: adapt this / equal weights / different rubrics for idea and prototype categories. Are any safety or originality issues disqualifying regardless of score?

8.2 How will judging work across rounds and tracks?

Keep selection scores separate from event scores. Options: final round starts fresh / a published combination of event rounds. Do all teams pitch to the same panel, or are there track panels? Define the scoring scale, missing-score handling, and any cross-panel comparison before judging begins.

8.3 Who judges, and how are conflicts or ties handled?

Options: three / five judges per panel, with clinical, research, technical, and implementation expertise as appropriate. Require conflict declarations and reassignment. Tie options: priority criterion / additional independent judge / documented panel discussion. Who approves the final winners?

8.4 What feedback and review route will participants receive?

Options: short written feedback for finalists / brief feedback for all reviewed teams. Keep reviewer identities, peer scores, and confidential notes private. Should procedural complaints have a short response window? Name the decision owner and distinguish process errors from disagreement with a score.

Agreed direction / notes: ____________________    Owner: ____________________

9. Fees, prizes, partners, and budget

9.1 Is hackathon participation free or paid, and what does it include?

Options: free entry / a separate hackathon fee / included with conference registration. Define conference access, workshops, meals, and any student discount separately. Hackathon acceptance must not silently confirm conference admission or bypass manual registration approval. Decide cancellation and refund conditions before collecting payment.

9.2 What prizes can we actually commit to?

Options: first–third overall / one winner per track / overall winners plus a special award. Prize types: cash, in-kind support, mentoring, or an agreed incubation pathway. Confirm funding, eligibility, team prize distribution, and payment responsibility before advertising amounts or benefits.

9.3 Which partners would add useful support?

Options: a university innovation unit, clinical departments, research groups, healthcare organizations, or technology partners. What do we need from each: challenges, mentors, judges, venue, tools, or funding? Sponsorship must not buy influence over selection or scoring. No partner is confirmed in this draft.

9.4 What is the budget ceiling and minimum viable version?

Fill in SAR amounts: prizes [TBD], venue/equipment [TBD], food [TBD], materials/software [TBD], media/printing [TBD], travel support [TBD], contingency [TBD], total [TBD]. What is already covered by MSRC? If funding is lower than expected, do we reduce team count, extras, or format?

Agreed direction / notes: ____________________    Owner: ____________________

10. Organizing team and event operations

10.1 Who owns each part, and who has final approval?

Assign: hackathon lead, scientific/challenge lead, applications and reviewers, mentors, judging, operations, sponsorship/finance, marketing, website liaison, and participant support. Which decisions need conference leadership or KAU approval? Assign a backup for critical roles.

10.2 What venue and participant support are needed?

Decide: working area, team tables, power, Wi-Fi, presentation room, quiet/prayer breaks, accessibility arrangements, catering, and permitted working hours. Will out-of-city participants arrange their own travel/accommodation, or is any support funded? Confirm room access and booking ownership.

10.3 How will we handle problems on the day?

Set owners for check-in, late arrival, absent teammates, mentor/judge cancellation, technical failures, safety incidents, and complaints. Agree a controlled fallback for internet, upload, or presentation failures, with a way to record and reconcile any manual decisions.

Agreed direction / notes: ____________________    Owner: ____________________

11. Originality, safety, ownership, and media

11.1 What are the rules on AI tools and outside assistance?

Options: allowed with disclosure / allowed within defined limits. Require teams to explain their own contribution, prior work, third-party assets, and AI-generated material. What assistance is permitted from mentors? Who investigates plagiarism, misrepresentation, or undisclosed external work?

11.2 What data and testing are allowed?

Existing platform boundary: no patient-identifying records. Proposed event approach: use synthetic or properly authorized public data and simulated demonstrations, not real clinical deployment. Who checks evidence permissions, ethics applicability, prototype safety, and unsupported clinical claims? Any real-world testing needs a separate approved pathway.

11.3 What ownership and confidentiality terms should apply?

Proposal for institutional review: teams retain their work, while MSRC receives limited permission for agreed judging and publicity uses. What rights do sponsors or partners request? Who reviews the terms before publication? Do participants need a warning that public pitches are not confidential? Do not promise patents, ownership outcomes, or adoption.

11.4 What can be photographed, recorded, or published?

Media publication needs the existing consent and approval process. Decide permissions for team photos, pitch recordings, prototype images, and short winner descriptions separately from full submissions. Who handles no-photo requests and withdrawal? Avoid publishing confidential content or assuming consent from every person shown.

Agreed direction / notes: ____________________    Owner: ____________________

12. Certificates and follow-up

12.1 What earns a participation or winner certificate?

Options for participation evidence: required session attendance + a completed final submission / those requirements plus a feedback survey. Define member-level evidence and any minimum attendance rule. Distinguish participant, finalist, winner, mentor, judge, and organizer certificates; do not automatically copy general conference rules.

12.2 What happens to promising projects afterwards?

Options: recognition only / an approved showcase / a follow-up mentoring session / referral to a confirmed development partner. Who owns follow-up, and what can realistically be promised? Define what we will record, such as completed projects, feedback, and agreed next steps, without claiming unverified impact.

12.3 Who signs off and releases the outcomes?

Assign the award approver, certificate wording/signature owner, and person responsible for checking names, member eligibility, results, and release timing. Confirm the publication and correction process before sending emails or announcing winners.

Agreed direction / notes: ____________________    Owner: ____________________

13. Decisions to close before applications open

Start by agreeing the purpose and tracks, eligible participants, team rules, event format/capacity, application requirements, selection process, and budget. Then close the full public rules: dates, fees and inclusions, deliverables, scoring, prizes, certificates, and participant terms.

For each resolved item, record: decision, rationale if needed, owner, approval status, and where it must be reflected in the website or participant guide. Use Pending / Proposed / Agreed / Needs approval as plain-text status labels.

Decision: ____________________    Status: ____________________

Owner / approver: ____________________    Next action: ____________________

Questions still needing input: ____________________________________________________________

Website handoff: Send the agreed rules to the technical lead to update the hackathon configuration and participant pages. Applications should remain closed until the required settings and approvals are complete. [S1: REL-04, CFG-05]

Source context

[S1] MSRC 2027 Website - Development Specification v0.4, particularly Section 9 and CFG-05. This is the current planning baseline, not evidence that the platform is implemented or that institutional approvals are complete.

Reference document: 



---

# Included file: sources/MSRC27_Brand_Reference_Canva.txt

Source: MSRC27 brand reference sheet, Canva design DAHWgMSGq3E
View: https://www.canva.com/d/zrujOnVYUtutnfB
Modified: 2026-09-29T12:16:35Z
Retrieved: 29 September 2026, text only. No design edits or PDF export.

MSRC27
The 5th Medical Students Research Conference
MSRC27 Brand Theme
The 5th Medical Students Research Conference
Royal Purple - #3B1E6D
Warm Gold - #C9A24A
Ivory White - #F8F6F0
Soft Lilac - #DCCFF0
Deep Ink - #1F1930
Aa
Aa
Use generous tracking, strong hierarchy, and high contrast for clarity and impact.
Not sure but this was in the previous designs....
DM Sans SemiBold / Bold
abcdefghijklmnopqrstuvwxyz0123456789 !@#$%^&*()
Headings:
Inter Regular / Medium
abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz 0123456789
Body:
Usage Rules
DoDont
Brand - Color Scheme
Colour System
Main
LOGO
1. Title Card Example
2. Information Card Example
Background & Gradient
Research Programme
09:00 – 10:00
Plenary Session
10:30 – 12:00
Oral Presentations
13:30 – 15:00
Poster Presentations
