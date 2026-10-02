# MSRC 2027 decision and configuration register

Source baseline: 29 September 2026; evidence reconciliation updated 1 October 2026. This register records source-confirmed choices, working defaults, unresolved details and publication gates. It does not certify institutional approval, provisioning, implementation or test completion.

Primary source: **S1 Development Specification v0.5**, modified 2026-09-29 11:30:21 UTC / 14:30:21 Asia/Riyadh. [Current source snapshot](../sources/Development_Specification_v0.5.txt).

Supporting source: **S2 Hackathon Draft**, modified 2026-09-29 11:09:52 UTC / 14:09:52 Asia/Riyadh. [Current source snapshot](../sources/Hackathon_Draft.txt).

Planning companion: [Decision Required backlog](backlog/DECISION_REQUIRED.md) maps every CFG-01–CFG-13 packet to actionable questions and affected release gates. Creating that backlog resolved no organizer decision and changed no confirmed choice, default, source snapshot or production configuration.

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
| Framework | ADOPTED FOR M1 | Next.js App Router + TypeScript + Tailwind under the explicit foundation task; versions in ENG-001 below. | Final public and operational release gates remain closed. | INF-01 |
| Development tooling | ADOPTED FOR M1 | pnpm with lockfile, Vitest/Playwright and local Supabase fixture/policy tests; see ENG-001/005/006. | Isolated Linux database CI verified; optional Windows engine still untested. Current evidence and remaining merge-check enforcement are in PROGRESS. | INF-04/05, REL-06 |
| P1 payments | SELECTED | Existing authorized KAU collection arrangement, isolated adapter. | Responsible unit/payee/system, real integration or approved official-report reconciliation, amounts/methods/tax/refunds/references and evidence. No webhook/API assumed. | PAY-01/04/05, CFG-02 |
| Three site Super Admins | REQUIRED | Exactly three individually named website Super Admin accounts before production. | Names, verified identity, appropriate grants/MFA/offboarding; distinct from infrastructure owners. | ROL-10/12, CFG-11 |
| Production data locations | OPEN | No exact region selected; no assumption that managed providers are Saudi-hosted. | Full database/storage/auth/app/backups/email/model/logs flows and required approvals. Synthetic development can proceed. | INF-02, PRV-07 |
| Legal controller | OPEN | O1 operational owner does not settle legal controller identity. | Controller/contact/legal bases/institutional evidence, processor/transfer/retention policy. | PRV-01/02, CFG-09 |
| Email/scanning/assessment/analytics | OPEN | Separate approved configuration needed. | Provider/data terms/evaluation/quotas/secrets/budget. Analytics has no selected provider. | INF-01, CFG-10 |

The source selects providers and intended ownership; it does not create accounts, paid plans, cloud resources, production credentials, an approved legal relationship or a functioning sender.

## 3. Confirmed product choices

| Decision | Current rule | IDs / source |
| --- | --- | --- |
| Event dates | Day 1: 27 January 2027; Day 2: 28 January 2027. Confirmed by the project requester on 1 October 2026; date-only approval, no inferred start times or workflow windows. | SCP-01, CFG-01, TIM-01; ORG-001 below |
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

S3 is valuable conference background. Its proposals and roster drafts need confirmation before becoming current public content. See [CONFERENCE_BACKGROUND.md](CONFERENCE_BACKGROUND.md).

| Older source detail | Current interpretation | Required action |
| --- | --- | --- |
| S3 page 15 proposes 27-28 January 2027. | The source proposal is preserved. ORG-001, the explicit user decision of 1 October 2026, now confirms those two calendar dates and supersedes their former unresolved status. | Publish confirmed dates and the labelled date countdown. Venue, start times and separate operational windows still require their own decisions. |
| S3 page 15 lists King Faisal Conference Center / University Hospital theater as venue options. | SOURCE OPTIONS. S1 leaves venue/rooms/capacities open. | Confirm one approved venue and actual rooms/capacities/accessibility, then update content/booking/program. |
| S3 page 14 chart names Abdulrahman Ismail scientific leader and Fatimah Al Farhah organizational leader; S6 context identifies Akram as conference co-leader/scientific lead. | UNRESOLVED ROSTER DIFFERENCE. Draft chart and user role context do not establish final public organization or account grants. | Ask leadership to confirm names, titles, hierarchy and public roster before publishing; separately verify role grants. |
| S2 footer references Development Specification v0.4. | HISTORICAL SOURCE POINTER. The live technical document is now v0.5 and already reconciles current S2 answers. | Use S1 v0.5 for construction and preserve S2 answered choices without treating its old footer as priority. |
| S5 recommends framework/testing/tooling and milestone order. | RECOMMENDATIONS. S1 confirms providers and product scope, not exact frontend framework. | Record chosen framework at foundation. Move staff auth/permissions ahead of active CMS editing. |
| S8 original Canva reference and S4/S5 website guidance. | SOURCE-CORROBORATED WORKING DESIGN DEFAULTS. S8 text confirms the palette and English fonts; its uncertainty note and CFG-12 keep final approval open. Arabic font/motion remain S4 extensions. | Draft consistently with current defaults; obtain final CFG-12 approval and production source assets. |
| Earlier discussion said logo/visuals absent. | Historical state; later brand/Main materials now exist, but no final approved production asset set has been verified. | Use [DESIGN_GUIDE.md](DESIGN_GUIDE.md) and [MEDIA_REGISTER.md](MEDIA_REGISTER.md), distinguish illustrative/source assets from approved production media. |
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

See [DESIGN_GUIDE.md](DESIGN_GUIDE.md) for implementation detail. Working visual values may change during review without silently changing product or accessibility requirements.

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

Every CFG item below retains the full S1 statement. All named accountable owners/approvers and target due dates remain **unassigned** in this handoff unless a later recorded decision supplies them. Suggested implementation sequence is in [ROADMAP.md](ROADMAP.md), not a fabricated calendar.

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

**State: PARTIALLY RESOLVED — event dates confirmed by ORG-001; remaining inputs OPEN. Named operating owner: Unassigned. Due date: Unassigned.**

CFG-01. Conference leadership: exact event dates/venue, general capacity, admission categories, manual approval owners, decision turnaround, payment/seat-hold deadlines, and handling of capacity-pending requests. Gate: registration opening.

Current reconciliation (1 October 2026): Day 1 is **27 January 2027** and Day 2 is **28 January 2027**. The statement above remains the preserved v0.5 question set, not a claim that these dates are still undecided. Venue, rooms, capacities, admission categories, approval owners/turnaround, payment/seat-hold policy and capacity-pending handling remain open. Event/session start times and separate registration, submission, review, workshop, competition and certificate windows are not supplied by this date decision. Registration remains closed.

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

## 11. ENG-001 — local M1 engineering baseline, 29 September 2026

Authority: the user's explicit first foundation task authorizes adopting the recommended
stack and routine reversible local implementation. This is an engineering decision;
it does not appoint organizational owners or approve a public launch.

Actual inspection found documents only, no package manifest, app, local Git history or
configured remote. The only registered local MSRC project is this working handoff.
The separate Downloads folder also contained handoff documents. A new local `main`
repository was initialized; no remote was created or cloud infrastructure inspected.
Original instructions and sources were preserved. Next.js automatic AGENTS additions
are disabled with its installed `agentRules: false` option.

| Choice | Exact baseline | Reason / limitation |
|---|---|---|
| Runtime | Node 24.21.0 LTS | Official Node release metadata and SHA256 checked. Installed system Node25.6.0 is outside Vitest5's supported range. Portable local Node is ignored by Git; system installation unchanged. |
| Package manager | pnpm11.19.0 | Available compatible tool, pinned via packageManager; frozen lockfile and explicit native build allowlist. Settings live in pnpm-workspace.yaml. |
| Framework/UI | Next16.3.7, React/React DOM19.3.0 | Registry versions and current official App Router docs checked. Default Node runtime and Turbopack; no experimental locale routing. |
| Styling | Tailwind and @tailwindcss/postcss4.3.3 | Working handoff palette, native scrolling, no external asset/font requests. System fonts are an M1 fallback; final typography remains CFG-12. |
| TypeScript/lint | TypeScript5.9.3; ESLint9.39.5; eslint-config-next16.3.7 | Current TypeScript7 exceeds parser's supported <6.1 range; React/import lint plugins still declare ESLint9 compatibility. ESLint9 reports end-of-support: re-evaluate supported lint stack before public release. No peer bypass was used. |
| Tests | Vitest5.0.2, Playwright1.63.0 | Node24 compatible; unit and Chromium desktop/tablet/mobile checks, separate Docker database policy suite. |
| Data | Supabase CLI2.118.0, supabase-js2.117.2, local Postgres17 config | Clients optional, loopback/public-key only, separate browser/server modules. SSR auth/cookie refresh deferred to M4 because there are no sessions in M1. |
| Unknown business values | Typed nulls | CFG-01/02/07/10 dates, venue, prices, capacities and regions remain unset. |
| Operational release | All15 gates hard-closed | Server-only guards reject requests regardless of role claims/environment. No feature business logic or operational tables. CMS editing and advisory assessment remain closed. |

Official checks: [Next installation](https://nextjs.org/docs/app/getting-started/installation),
[i18n](https://nextjs.org/docs/app/guides/internationalization),
[Node releases](https://nodejs.org/en/about/previous-releases),
[pnpm settings](https://pnpm.io/settings),
[Tailwind Next setup](https://tailwindcss.com/docs/installation/framework-guides/nextjs),
official npm registry package metadata, installed CLI help, and Supabase references in
[local-data.md](features/local-data.md). Exact pins are in package.json; transitive
versions/integrities are in pnpm-lock.yaml. The exact Next16.3.7 package family was
accepted despite pnpm's freshness window after inspecting official metadata; the
version-specific exceptions are visible in pnpm-workspace.yaml. Future changes are
strictly checked rather than silently widening these exceptions.

Local data start is BLOCKED by missing Docker/Podman. This does not block the static
app. No alternative production provider, hosted database, new region or paid plan is
inferred. Email has no live adapter and remains console/test-only policy; payment has
no live adapter and remains mock-only policy until its later authorized milestone.
Local Git commits use an explicit automation identity when no user Git identity is
configured; this is not a named organizer approval. External CFG/REL gates stay closed.

## 12. ENG-002 — M2 design system and focused M3 preview, 29 September 2026

Authority: the user's explicit second task authorizes the reversible local design system
and homepage preview. Source IDs: SCP-02, DSN-01/02, LOC-01/02/03, ACC-01, CMS-04,
MED-01 through MED-04, CFG-12. This decision adopts working design defaults; it does not
approve a final brand, translation, public launch or media publication.

- Use the five documented colors, DM Sans for English headings/buttons, Inter for English
  body text and Noto Sans Arabic for Arabic. Self-host variable WOFF2 assets with `next/font/local`
  from exact Fontsource packages5.3.0. OFL1.1 notices are retained in `docs/licenses`.
- Adopt additional semantic colors solely as engineering defaults: success `#245D45` on
  `#E9F2EB`, error `#A02935` on `#FFF0F0`, warning `#755119` on `#F4EDDB`, information purple
  on `#EBE3F4`. Use written state labels as well as color. Keep native scrolling,180ms
  button feedback and a single400ms/12px entrance; remove nonessential motion on request.
- Use an original abstract SVG poster and provisional text identity while approved MSRC/KAU
  marks and conference footage are absent. The homepage video stays `null`. A61KB silent
  four-second original geometry animation is authorized as a clearly labelled synthetic
  component test fixture only. No2026 source footage was downloaded or reused.
- Keep the full15-entry future public sitemap typed. Existing homepage section destinations
  are links; unpublished entries are labelled non-links. Missing standalone pages return404.
  No invented schedule, dates, prices, speakers, sponsor roster or capacity values are added.
- The server-rendered showcase is allowed in development or with an explicit server-only
  flag on local/protected staging; `VERCEL_ENV=production` always denies it. It contains no
  private/admin data or operational actions. Deployment protection remains a separate gate.
- The synthetic form retains only one of two predefined choices in sessionStorage, allowing
  language switching without retaining personal/research data. Scientific sample text remains
  English/LTR. Real participant forms, authentication and CMS are outside this milestone.
- Decorative video enhancement uses local approved paths only, muted inline playback,
  explicit pause/resume, poster on error, reduced-motion and save-data/slow-connection
  fallbacks. Network Information API support varies; unsupported browsers cannot report
  connection speed. Final footage codecs/crops/size budget and frame contrast remain open.
- Added exact `@axe-core/playwright4.13.0` for automated accessibility evidence. Package pins
  and the lockfile are preserved. Disabled pnpm optimistic repeat installs so dependency-store
  configuration is checked after this machine's old global-store metadata was discovered.

Current API references reviewed: installed Next font documentation and
[Next font optimization](https://nextjs.org/docs/app/getting-started/fonts),
[Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing),
[Fontsource variable fonts](https://fontsource.org/docs/getting-started/variable),
[React external store hook](https://react.dev/reference/react/useSyncExternalStore),
[MDN media play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play) and
[data-saving preference](https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData).
Registry metadata and local tool help were checked before package/CLI use.

Verification is recorded in PROGRESS.md. All15 operational gates remain false. M3 is a
homepage preview only; full public content, final brand/media approval and deployment are pending.

## 13. ENG-003 — bilingual About preview after M2 review, 29 September 2026

Authority: the user explicitly requested review of the completed M2/homepage changes and
continuation with the bilingual About page. This authorizes local implementation and review,
not final content approval, new organizer policy, infrastructure changes or public launch.

- Add `/en/about` and `/ar/about` as the next SCP-02 public-content slice, reusing M2
  components and the current pinned stack. No dependencies, database/storage schema,
  authentication, operational transitions, media assets or jobs are added.
- Draft English/Arabic identity, purpose and audience copy from the source context recorded
  in CONFERENCE_BACKGROUND.md (S3 pp1,4,13,17,33,37). Show an explicit draft notice. Host
  institution is not an approved venue; community descriptions are not eligibility criteria.
  No source snapshot or organizer decision is superseded.
- Header/footer About links now reach the standalone page; a contextual homepage link
  provides the same destination. Language switching retains the page/query/section. Unknown
  routes/locales remain 404. The homepage introduction anchor remains available.
- Retain all 15 closed operational gates and the null dates, venue, price/capacity values.
  No legal, editorial, brand, media or institutional approval is inferred. The preview stays
  unindexed and local; a future remote draft still needs approved deployment protection.
- M2 code review found no actionable defect. Extend one media browser regression to verify
  that a visitor's pause survives reduced-motion changes; do not mislabel this coverage gap
  as a proven implementation failure.

Affected requirements: SCP-01/02, LOC-01/02/03, CMS-04, DSN-01/02, ACC-01, CFG-12,
REL-01. See [About feature contract](features/about.md), [M2 review](reviews/m2-homepage.md)
and the current PROGRESS entry for executed checks. All production gates remain closed.

## 14. ENG-004 — M1 reproducibility audit, 29 September 2026

Authority: explicit user request to ensure M1 only. Preserve existing M2/About code and
all product exclusions; no new operational feature or organizer decision is authorized.

- Retain the pinned stack and lockfile. Add only the playbook's missing README-only
  boundaries; keep the established `(preview)` group, root `tests/` and `lib/i18n.ts`
  with the reasons recorded in ARCHITECTURE. Empty folders are not feature completion.
- Correct local Supabase's key prerequisite: CLI 2.118.0 exposes its publishable key only
  with the local Auth service enabled. Enable that infrastructure container, while global
  and email signup, anonymous sign-in and the application's auth workflow stay disabled.
  No account, cookie/session feature, SMTP provider, storage or hosted connection is added.
- Add an explicit safe local-env helper and a separate live-local integration suite for
  both existing data-client wrappers. Capture status privately; copy only local public
  values; reject linked projects/privileged keys and refuse existing-file overwrite.
- Pass the same loopback-bound network to startup, reset and pgTAP. The pinned CLI's
  reset/test paths otherwise choose its default network instead of the custom one;
  in-process type generation explicitly rejects the network flag and stays unchanged.
- Extend the database CI job with local environment generation and the 10 integration
  checks after migration/seed/pgTAP. The application CI contract remains lint/types/unit/
  build/E2E. Capture credential-bearing startup output in a restrictive temporary file,
  print only sanitized status and delete the file without uploading it. A workflow
  definition or local run is not a passed hosted GitHub run.
- Docker/Podman and WSL are absent on this host, and no Git remote is configured. Those
  prevent executing local database acceptance and hosted CI respectively. They do not
  authorize production provisioning or fabricated passes. No new migration is required.

Relevant requirements: INF-01/04/05, SEC-01/02/06, ROL-01, ERR-01, REL-06. See
[M1 audit](reviews/m1-foundation.md) for commands, evidence, file list and remaining steps.
The implementation follows the [pinned CLI source](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/status-values.ts)
and installed CLI help. All 15 operational flags and unknown business values are unchanged.

## 15. ENG-005 — Windows runtime and private GitHub verification, 29 September 2026

Authority: user explicitly requested Docker/WSL installation and database/CI verification,
then asked to create the repository on their own GitHub account. The user separately
approved Git Credential Manager's displayed OAuth access and completed GitHub's security
verification. Credentials are handled by the credential manager, never copied into source.

- Install WSL 3.0.1 and verified Docker Desktop 4.93.0 per-user, using its WSL2/Linux
  backend. No automatic restart or Docker terms acceptance. Windows reports a required
  restart to activate Virtual Machine Platform; local engine/database checks remain pending.
- Create private development repository `xpexellent-dotcom/msrc-2027`, preserve all five
  existing commits and set it as origin. No collaborator, paid plan, production service,
  public repository, DNS record or platform email change. Personal development custody is
  expressly authorized; institutional production custody remains an unresolved release gate.
- Execute the committed workflow on GitHub's Ubuntu runner. Its local synthetic Supabase
  stack is separate from this Windows installation and all managed production projects.
- Add the already-documented local security-advisor and generated-type commands to CI.
  Findings and generated fixture types are review evidence; neither command prints keys.
  Advisor warnings remain visible while its error threshold fails the job.
- Compare generated fixture types with the checked-in contract. Match the four empty
  schema registries to the generated empty-key form; this tightens compile-time keys
  without changing the migration or runtime behavior.

No business requirement, operational flag, dependency pin, migration or application page
changes. See [database/CI verification](reviews/m1-database-ci.md) for evidence and limits.

## 16. ENG-006 — Direct hosted Supabase connection, 29 September 2026

Authority: the user explicitly requested direct use of live Supabase and supplied
`https://ecemjggwlzqpjcwmchrl.supabase.co`. This supersedes the M1 local-only connection
restriction and the requirement to finish Windows Docker setup before continuing normal
development. It does not authorize any operational workflow or unrelated hosted mutation.

- Connect to existing project `msrc` / `ecemjggwlzqpjcwmchrl`, observed ACTIVE_HEALTHY
  in `ap-northeast-1`. Its actual region is evidence of the existing project, not a new
  institutional data-residency approval. The project was not provisioned by this task.
- Use its existing enabled modern publishable key in ignored `.env.local`, with explicit
  hosted target and HTTPS origin validation. Retrieve no secret/service-role key or DB
  password. No schema/table/row/Auth/Storage setting is changed; no local fixture is deployed.
- The hosted public schema and migration history were empty on inspection. Supabase's
  security advisor returned no findings; empty-schema checks do not prove future policies.
  Default client types expose no tables. Only explicit guarded local factories expose the
  synthetic fixture contract for CI tests.
- Keep local reset/seed/pgTAP commands strictly local and make integration tests reject
  hosted settings before collection or client construction. Use a separate read-only
  metadata request for hosted connectivity. The GitHub workflow keeps synthetic containers;
  Docker on this Windows PC becomes optional for daily development.
- Preserve all 15 closed flags, source snapshots and unresolved business values. Separate
  staging/production data and access (INF-04), ownership, region approval, backups and
  release authorization remain gates before operational use. No paid plan, DNS, Vercel
  deployment, real emails or account workflow is added.

Relevant source requirements: INF-01/04/05, SEC-01/02/06, REL-06. See
[hosted connection contract](features/hosted-supabase.md) for actual verification and rollback.

## 17. ENG-007 — Complete M2 component system, 30 September 2026

Authority: the current user request to implement M2 using the approved MSRC visual system.
Adopt the specified five colours, DM Sans / Inter / Noto Sans Arabic, native scrolling,
180 ms feedback, 1 px hover lift, 98% press and 400 ms one-time reveal as the M2
implementation baseline. This supersedes the earlier provisional implementation status
of those exact values in ENG-002; it does not approve final marks, public copy or media.
Semantic state colours, spacing, radii and shadows remain configurable engineering tokens.

Complete the shared native-control library and bilingual synthetic showcase. Extract the
existing footer/mobile navigation without introducing product workflows. Keep both locale
routes and add the gated `/design-system` English alias. Local development is permitted;
remote staging requires the explicit server flag and separately configured deployment
protection. Vercel production refuses all showcase entry points even if the flag is set.

Use native modal dialog behavior, persistent dismissible toast announcements and static
loading skeletons. Keep reveal text opaque while it moves to preserve contrast. Only
explicit same-page link activation requests smooth scrolling; reduced motion jumps directly.
FileUpload is a file-selector UI only: no reading, persistence, storage or upload endpoint.

The user reconfirmed the MSRC2026 Drive folder for future hero, highlights, gallery and
mobile-poster selection. Metadata access was verified again; final per-asset review and
publication clearance remain open. No footage was copied into the app in M2.

Relevant source IDs: DSN-01/02, LOC-01/02/03, ACC-01, MED-01/02/03/04, CFG-12,
CMS-04, INF-04. No migrations, dependency changes, new environment values, Supabase
mutations, live workflow release or deployment are part of this slice.

## 18. Checklist reconciliation — 1 October 2026 (no new product decision)

Authority: the user's request to audit and update the
[feature checklist](https://chatgpt.com/space/page_5962a54672888191869e3c6108c27678).
Its earlier architecture and completion statements do not supersede v0.5 or current
ENG-001/005/006/007. Current implementation/hosting evidence is recorded in
[PROGRESS](PROGRESS.md) and the [audit](reviews/checklist-audit-2026-10-01.md).

- The Page mentioned a later AI-proposal/committee-approval design without an exact
  organizer decision source, date or approver. Record that as an unreconciled reference,
  not a replacement policy. AI-03 remains the configurable default: independent human
  draft before advisory reveal; separate human/model/committee records; no model score
  in the human average absent an explicit later policy. DR-CFG-03/10 stay open. The
  separate prototype and its historical20-test claim do not select DeepSeek or prove
  integration, data-processing approval, calibration or platform permissions.
- ABS-01/04/07/08/09–11 and HAC-01/02/04/05/06/08/09 contain settled baseline rules;
  the checklist now separates them from remaining DR-CFG-03/04/05/13 inputs. 3MT
  retains its separate DR-CFG-06 gate. No scientific value or rule was invented.
- Hosting/DNS and a successful Production deployment are observed engineering facts,
  not proof of REL-01 or CFG-09/10/11/12 institutional, privacy, content or media approval.
  Public Home/About drafts are accessible. Noindex is not privacy. A responsible
  approver must resolve the public-draft boundary and release evidence; this audit
  changes no deployment protection, DNS, environment variable or operational flag.
- The M3 continuation and parallel BL-SEC-01 contract are unblocked; M4 staff identity,
  grants and MFA precede CMS writes. Static public content need not expose the editor.
  ENG-006 continues to make Windows Docker optional for daily hosted development.

Rollback is documentation-only. Preserve earlier source snapshots and later human edits;
no schema, data, infrastructure or product behavior changes accompany this reconciliation.

## 19. ENG-008 — Provisional interface polish and local film review, 1 October 2026

Authority: the user's current Brand/interface checklist, motion and montage request.
Official brand information is expected next; retain ENG-007 colours/fonts/motion rather
than inventing final marks or changing the public content approvals. Slush supplies the
video-first reference and ESC Congress the information-hierarchy reference; neither
licenses reuse of their assets, copy or operational claims.

- Improve the shared English/Arabic Home/About hierarchy and directional button feedback.
  Keep native scrolling. Interpret guided section movement as optional CSS `y proximity`
  settling on large/tall screens, explicit anchor links and a free-scrolling toggle; no
  wheel/touch/key cancellation or mandatory stops. Disable snapping for reduced motion.
- Prepare a roughly19-second proposal from the user-supplied MSRC2026 montage: audience,
  auditorium and research discussion with short dissolves and a seamless loop. Encode
  desktop/mobile versions and posters as private local review derivatives; preserve the
  original. The measured18.7-second duration and codecs/budgets are candidate engineering
  settings for this cut, not final conference media policy.
- Serve only four allowlisted derivatives through a loopback development process with
  `LOCAL_MEDIA_PREVIEW_ENABLED=true`. A production build or Vercel production context
  denies the preview and media endpoints even when the flag is enabled. Keep all real
  footage outside `public/` and ignored by Git. Public Home/About retain safe artwork.
- Preview before publication is an explicit user requirement. Selection, encoding and
  technical checks do not approve identifiable people, scientific posters/slides, marks,
  captions or rights/consent for public use. CFG-12/MED-02 remain open; final brand, copy
  and media owner approval must be recorded before any release.

Relevant source IDs: DSN-01/02, LOC-01/03, ACC-01, MED-01/02/03/04, CMS-04, CFG-12,
INF-04, REL-01. No operational gate, schema, dependency pin, hosted environment, service
or DNS changes. See [feature record](features/brand-motion-media-preview.md) for evidence,
manual setup, verification limits and rollback.

## 20. ORG-001 — Confirmed conference dates, 1 October 2026

**Status: CONFIRMED calendar dates; related operating inputs remain OPEN.**

- **Source/date/approver:** The current explicit instruction from the project requester in this chat, 1 October 2026. The requester provides the organizer decision; no additional staff identity or institutional approval is inferred.
- **Exact decision:** “The dates are confirmed add a countdown on the frontpage and also update everything related: Day 1: 27th of January; Day 2: 28th of January. Also publish and push all the updates after.” The year is **2027**, from the current MSRC 2027 edition context.
- **Approved values:** `2027-01-27` for Day 1 and `2027-01-28` for Day 2, displayed bilingually in the event's Asia/Riyadh timezone. Public calendar-date copy and a homepage countdown are authorized.
- **Superseded:** Only the exact-event-date TBD in SCP-01/CFG-01 and the former source-proposal-only treatment of S3 page 15. The original Development Specification v0.5, Main File and historical engineering/task notes stay unchanged as dated evidence. Historical null-date statements describe their earlier snapshots and are superseded for current configuration by this entry.
- **Countdown convention:** Show calendar days until Day 1 using the current Asia/Riyadh calendar date and date-only typed configuration. Do not invent a doors opening or first-session instant to produce an hours/minutes/seconds clock. Use honest Day 1, Day 2 and finished display states once the corresponding calendar dates arrive; never show negative countdown values. No application cutoff or operational workflow transition follows from this public display.
- **Affected requirements and work:** SCP-01, CFG-01, CMS-01, TIM-01, LOC-01/03, ACC-01 and DSN-01; typed event configuration, English/Arabic Home/About/date notices, countdown boundary/localization/accessibility tests, project brief, current requirements and DR-CFG-01. No migration, grant, RLS or email change is required for public date copy. CMS editing remains closed.
- **Release boundary:** The user authorizes pushing/publishing the reviewed date/interface changes. This date decision does not settle venue, schedule times, admission capacity, prices, registration/submission/workshop windows, payment integration, media rights/consent, final brand or unrelated approvals. Every operational workflow remains closed behind its existing gate; REL-01 and the remaining CFG packets retain their independent requirements.
- **Audit/email and rollback:** This versioned decision record is the change evidence; no participant email or operational mutation follows from it. A rollback can restore the prior public UI/configuration without deleting this confirmed decision or changing stored participant data.

Implementation and executed verification are recorded in [PROGRESS.md](PROGRESS.md) by the date-countdown slice.

## 21. ORG-002 — Public use of the reviewed MSRC2026 homepage montage, 1 October 2026

**Status: PUBLIC HOMEPAGE USE AUTHORIZED; push/deployment and live verification pending.**

Authority: the project requester's explicit approval in the current chat on 1 October
2026 of the reviewed **18.7-second MSRC2026 montage**, including the people and research
posters shown, for public homepage use. The requester also explicitly authorized pushing
and publishing the current updates. This is the supplied organizer approval evidence;
no independent legal/institutional review or named media custodian is inferred.

- Approved placement: the decorative English/Arabic homepage hero, with a visible
  **MSRC2026 previous-edition** caption. The approval covers this reviewed cut, desktop
  and mobile crops and their still-image fallbacks; it does not approve the entire Drive
  collection, a gallery, new footage, new crops or 2027 participation claims.
- Supersession: ENG-008 and the initial Brand/film feature note correctly recorded local
  review only. Their earlier no-publication status is superseded for these four approved
  derivatives by this later explicit decision. Preserve their historical commands,
  results and source records. Other media, final marks, branding, translations, privacy
  procedures and REL-01 evidence retain their independent requirements.
- Public derivative paths: `public/media/msrc2026/hero-desktop-v1.mp4`,
  `hero-mobile-v1.mp4`, `poster-desktop-v1.jpg` and `poster-mobile-v1.jpg`.
  Publish the compressed silent derivative files only, retaining their reviewed encoding
  and crops; no third-party embed or audio track. Pause/resume, reduced-motion,
  low-bandwidth, failure and responsive still modes remain required.
- Original protection: the Drive item and ignored read-only source copy remain unchanged
  and are never public assets. Original SHA256 is
  `2b2b82e05c11e0eeeacfef60efed222f1cfba439003e210b9c521202ea90372c`.
  Private manifests and encoding recipes are not copied into `public/`.
- Keep `/en/hero-preview`, `/ar/hero-preview` and `/api/preview-media/*` development-only.
  Their production404 boundary remains intact after public derivative approval.
  `LOCAL_MEDIA_PREVIEW_ENABLED` is not a production publication switch.
- Affected IDs: MED-01/02/03/04, DSN-01/02, LOC-01/03, ACC-01, CMS-02/04, CFG-12,
  INF-04/05, REL-01. This versioned record is the approval audit reference; no participant
  email, database/storage mutation, grant/RLS change or operational publication follows.
  CMS editing and all 15 operational workflow flags remain closed.
- Verification/release: technical verification and actual GitHub/Vercel/live results belong
  in the current feature record and PROGRESS. Authorization is not evidence that a push or
  deployment has already completed, nor a blanket REL-01 or institutional brand sign-off.
- Withdrawal/rollback: the scoped app change can restore the synthetic hero or prior
  deployment and remove public derivative references. Removing the local-review flag
  closes only local review, not the approved public hero. Handle controlled derivative
  unpublication/cache invalidation when required; no promise to erase third-party copies.
  Named removal, retention and backup responsibilities remain to be assigned.

See [MEDIA_REGISTER.md](MEDIA_REGISTER.md) for the per-asset reconciliation. The original
v0.5 and earlier source snapshots stay unchanged.

## ORG-003 — Homepage playback and presentation corrections

- Status: CONFIRMED scoped requester instruction, 1 October 2026, current chat.
- Public Home must attempt muted inline autoplay and remove its automatic `Still image
  mode`. This supersedes the earlier DSN-01 working preference policy only for the public
  homepage: reduced-motion, data-saving and slow-network preferences no longer suppress
  its video. Preserve translated Pause/Play controls, frozen paused frames, hidden-tab
  pause, browser-denied autoplay recovery and a poster for actual media failure. Synthetic
  design-system fixtures retain their preference-safe default. The source snapshot is
  preserved; this explicit exception is not an unnoticed source-rule change.
- Remove awkward mobile arrow glyphs, add controlled navigation slides, and retain native
  scrolling. Other UI animations retain reduced-motion alternatives and visible focus.
- Enlarge the Day 1 countdown with days, hours, minutes and seconds on the desktop right.
  Engineering display boundary: 27 January 2027 at 00:00 Asia/Riyadh, explicitly labelled
  as the start of the date. This is not approval of a conference opening time; that value
  remains unset. ORG-001's approved dates are unchanged.
- Replace the hero title/lead with welcoming English/Arabic copy. This authorizes the
  requested presentation refinement, not full institutional brand/editorial REL-01 sign-off.
- Earlier push/publication authorization remains applicable. No operational workflow,
  CMS editing, migration, privilege, real email, production secret or DNS change follows.
  ORG-002's original and approved derivative files remain unchanged.
- Affected IDs: DSN-01/02, ACC-01, LOC-01/03, MED-01/04, TIM-01, CFG-01/12, REL-01.
  Scope, verification, recovery and rollback are in
  [the feature note](features/homepage-experience-fixes.md).

## ORG-004 — Concise premium public interface, 1 October 2026

- Status: CONFIRMED scoped requester instruction in the current chat. Restore the exact
  English title “Where curiosity becomes discovery.”, shorten the welcome to a single
  line, replace repetitive prose with visual elements, add restrained animation, and
  give the countdown its own premium background. Apply equivalent Arabic/RTL treatment.
- Remove the separate visible hero Pause control and repeated public draft/disclaimer
  blocks. Retain the single top Development preview banner, factual previous-edition
  identification, honest unknown venue/session fields and closed action states. This
  does not approve a schedule, institution-wide brand, roster, prices or other TBD values.
- Supersedes ORG-003's hero wording and visible Pause/Play UI; ORG-002's caption is now
  the concise MSRC2026 / نسخة ٢٠٢٦ provenance label. Media authorization remains limited
  to the original four homepage derivatives; originals/crops/encoding are unchanged.
- Public motion is stopped through a semantic background interaction with bilingual
  accessible naming, native Space/Enter activation, durable pause and visible keyboard
  focus. No permanent text/icon control is rendered. Browser autoplay refusal can expose
  temporary Play recovery; actual media failure keeps the approved poster. Human
  screen-reader/device review remains required because this interaction is less visually
  discoverable. Synthetic showcase fixtures keep their original explicit controls.
- Display typography engineering choice: exact self-hosted Manrope5.3.0 Latin variable
  font for public English titles; existing DM Sans actions, Inter body and Noto Sans Arabic
  remain. This is a working visual refinement authorized by the font request, pending
  final institutional brand assets. Original SVG line art is decorative, not data or a logo.
- Native scrolling, reduced-motion UI, existing400 ms directional navigation slides,
 180 ms button feedback,44 px targets and visible focus stay. Viewport reveals occur
  once, have short child stagger, and never hide content before JavaScript.
- Publication/push authorization from the current sequence persists. No workflow, CMS,
  secret/environment, Supabase/schema/grant/RLS, real email or DNS change. All15 workflow
  gates remain closed. Unknown conference opening time stays null; the timer continues
  to use the start of the confirmed date in Riyadh, with its exact target accessible.
- IDs: DSN-01/02, ACC-01, LOC-01/03, MED-01/04, TIM-01, CFG-01/12, SCP-02, REL-01.
  Implementation, checks, limitations and rollback: [feature note](features/premium-public-interface.md).

## ORG-005 — Cinematic public website and dedicated journeys

- Status: CONFIRMED scoped requester instruction, 1 October 2026, current chat.
  Design and implement the public experience using the supplied brand, the existing
  architecture and four named references. This authorizes public presentation work;
  operational release gates, approvals and data processing stay separate.
- Retain the supplied purple/gold/ivory/lilac/ink palette, current self-hosted fonts,
  accurate text wordmark and approved MSRC2026 homepage derivatives. Original flowing
  SVG lines connect editorial sections and future portrait treatments. Final official
  MSRC/KAU marks and institutional brand/copy sign-off remain pending.
- Homepage: viewport film, floating centred navigation, concise identity and two actions,
  followed by purpose, participation, programme, speakers, previous-edition highlights,
  partners, practical information and FAQs. Move the existing date-boundary countdown
  below the film; its target and confirmed dates are unchanged.
- Current explicit request supersedes ORG-003's automatic preference override and
  ORG-004's hidden pause interaction. Home again respects reduced motion and data-saving
  preferences, with a discreet visible bilingual Pause/Play button, frozen paused frame,
  hidden-tab pause, browser autoplay recovery and responsive poster fallback. Other
  nonessential movement also respects reduced motion; scrolling stays native.
- Add working public information destinations for programme, speakers, media,
  participation, registration, research, hackathon, workshops and 3MT in EN/AR.
  Preserve English/LTR scientific content and honest announcement/closed states.
  Registration is not open; research submission cannot be offered as an active action.
- Engineering choice: typed content records and a server-only approved-publication
  boundary. Only approved records enter client props or resolve session/speaker detail
  URLs. Query filters are addressable and survive language changes. No CMS integration,
  operational form or recording access entitlement is inferred from this interface.
- No invented venue, opening time, roster, sessions, sponsors, prices, capacity, deadline
  or recording policy. No new asset rights, gallery permission, paid resource, database,
  migration, grants/RLS, secrets/environment, DNS or participant communication change.
  All15 operational gates remain closed.
- IDs: SCP-01/02/03/05, DSN-01/02, PRG-01, CMS-01/02/04, MED-01 to MED-04,
  LOC-01 to LOC-03, ACC-01, TIM-01, CFG-01/12, REG-02/03, ABS-01/04/07/08/09,
  HAC-01/02/04, WKS-01/02, REL-01. See [handoff](features/cinematic-public-experience.md).

## ORG-006 — Public refinements and authorized publication, 1 October 2026

- Status: CONFIRMED scoped requester instruction in the current chat. The latest
  explicit organizer request authorizes the requested design refinements and publication
  when their implementation and verification are complete. This authorizes this public
  presentation/release; it does not resolve unrelated product or institutional gates.
- The supplied project instructions and specification remain the baseline for factual
  accuracy, permissions, English/Arabic interfaces, English/LTR scientific content and
  operational separation. The latest requester decision supersedes ORG-005's permanent
  visible Pause/Play treatment: remove that button from the normal homepage, retain the
  accessible semantic background interaction, keyboard focus, durable pause, preference-safe
  poster behavior, hidden-tab pause and browser/error recovery. Temporary Play recovery
  remains available when playback requires it.
- Watch opens a nearly full-screen view of the same approved homepage film, with its
  reading/navigation layers hidden while open. Retain an accessible close action,
  keyboard interaction, Escape/Tab handling, `#film` URL and browser Back/Forward behavior,
  and restoration of scroll/focus. Direct-link entry respects motion/data preferences
  until the visitor explicitly chooses Play. This is not a second gallery asset/player.
- Make the chapter index numbered and useful, with native anchors and current-reading
  states. Use warm ivory/white participation surfaces, stronger supplied DM Sans heading
  weights with Noto Sans Arabic/RTL parity, shorter public copy and fewer repeated actions.
  Existing dates, useful FAQ/programme facts, working journeys and the 3MT anchor stay.
- Existing ORG-002 assets, source originals, crops, encoding and rights scope are unchanged.
  No other footage, gallery, portrait, logo, recording policy or publication permission is
  approved by inference. Final official brand/media/editorial inputs remain open.
- All 15 workflow gates remain closed. No CMS or operational form is enabled; no application,
  approval, payment, booking, attendance or certificate result follows from these pages.
  No database/schema/migration/grant/RLS, secret/environment, package, email, domain/DNS
  or paid hosted-resource configuration change is part of this task.
- Verification: `pnpm check` PASS and exact c1f7273 [CI36905277026](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36905277026)
  PASS both jobs (258 units/264 browsers/3 duplicate skips/20 pgTAP/10 integrations).
  [PR11](https://github.com/xpexellent-dotcom/msrc-2027/pull/11) merged at e70bf38;
  the complete tree matches the checked head. Vercel Production6791979347 succeeded.
  Live EN/AR six visual journeys,24 public routes,14 private404 paths,15 closed gates,
  four enlarged-text layouts and two reduced-motion/filter/film journeys passed.
  Preview app UAT remained blocked by existing Vercel Login; production was independently
  checked. Earlier ORG-005 evidence remains historical. See the feature note for commands,
  exact receipts, retained failed runs and untested physical-device/human review.
- Affected IDs: SCP-01/02/03/05, DSN-01/02, ACC-01, LOC-01/02/03, CMS-01/04,
  MED-01 to MED-04, PRG-01, TIM-01, CFG-01/12, REG-02/03, ABS-04/07/08/09,
  HAC-01/02/04, WKS-01/02, REL-01. See the
  [latest refinement/release note](features/cinematic-release-refinements.md).
  [ORG-005's original note](features/cinematic-public-experience.md) remains unchanged as
  a dated baseline; the presentation supersession is scoped to the changes above.

## ORG-007 — Hero scroll cue and caption, 2 October 2026

- Status: CONFIRMED explicit requester instruction in the current chat, with an annotated
  homepage screenshot: make the Step inside button "more centralized and a scroll option
  with a smooth animation when you scroll down", and remove MSRC2026.
- One centred Step inside / «اكتشف الأجواء» cue replaces the left-aligned link and right-hand
  caption. A gold segment loops down its line. Activation scrolls to the dates band directly
  below the hero (`#essentials`) through the existing explicit-navigation helper, which glides
  smoothly and moves focus to the band. With reduced motion, the line is static and the
  scroll jumps, as DESIGN_GUIDE and AGENTS require. On phones the band stops below the
  floating header.
- Supersedes ORG-004's concise hero label (MSRC2026 / نسخة ٢٠٢٦) on the homepage hero only.
  The film view keeps its translated MSRC 2026 identification, and the previous-edition
  section still names MSRC 2026, so the footage stays identified as the previous edition.
  ORG-002 files, crops, encoding and rights scope are unchanged; development-only preview
  captions still render.
- Affected IDs: SCP-01, DSN-01/02, ACC-01, LOC-02, MED-01/04.

## ENG-009 — BL-SEC-01 synthetic authorization contract, 2 October 2026

- Status: engineering implementation choice; no product permission or release decision changed.
  Authority: requester accepted BL-SEC-01 as the next complete engineering PR and said to begin.
- Adopt frozen purpose-sized role/scope rules, a server-only fresh AuthorityReader contract,
  independent synthetic allowed/denied tests and a transaction-rolled-back pgTAP fixture.
  Scope IDs and scientific ownership must be present; undefined actions/scopes deny.
- Source ROL-01–12/SEC-01/02/AT-02 remain authoritative. Require current grants/session,
  individual staff identity and trusted AAL2/TOTP. Unresolved conflict remains a denial after
  assignment withdrawal; an active duplicate cannot clear it. Original evidence requires
  scoped MFA Super Admin access plus clearance, not participant ownership or generic admin.
  REV-10 pre-event review and event-day judging use separate assignment kinds, including
  assignment-bound grants; holding both roles does not merge stages.
- Check-in/category/content duties use explicit function/resource bindings. Scientific packet,
  participant, score, file and operational projections remain separate. Purpose names/technical
  fixture metadata do not define approved production fields or domain tables.
- No production reader, hosted migration, bucket, credential, account, named staff appointment,
  actual file link, audit/email job or live endpoint is introduced. All 15 workflow gates closed.
  PRIVACY/provider/custody/identity/session/annual-isolation and per-feature REL gates remain.
- [Feature contract](features/authorization-contract.md) records fixtures, audit/language/error
  behavior, verification limits and rollback. BL-AUTH-01/05 must integrate current persisted
  grants/managed identity/TOTP before M4 staff or CMS activation.

## ENG-010 — Closed persisted authorization foundation, 2 October 2026

- Authority: requester asks to review the feature checklist, continue its next actions and
  deploy the reviewed application schema/permissions, asking about uncertain choices.
  This authorizes the bounded additive hosted migration; it does not open product workflows.
- Reviewed BL-SEC-01 PR15 at exact head `e297c86` was merged as `7ce3112` after its final
  application and isolated database CI passed. Original checkout changes are preserved
  in place; implementation continues in the attached managed worktree.
- Adopt private persisted edition/account-access/scoped-grant/audit metadata and a minimal
  own-context RPC. Its narrow definer boundary is needed to inspect private managed Auth
  session/factor records; fixed search path and authenticated-only execution are required.
  No browser/service-role table maintenance, user-metadata roles or initial grants.
- Verify bearer identity through managed `getUser` each call, then validate fresh own RPC
  context. No complete domain AuthorityReader, resource ownership, reviewer identities,
  profile fields, assignments or operational records are exposed or inferred.
- Context operational/privileged readiness and session activation remain false. AUTH-05
  session limits/recent authentication and AUTH-04 enrollment/recovery must be implemented
  and tested before staff activation. No timeout is invented; refresh is not user activity.
- Existing selected Supabase project `ecemjggwlzqpjcwmchrl` is verified empty before this
  change. Environment classification and exactly three named Super Admins were requested;
  CFG-09/10/11 production/privacy/custody gates remain open. No account, email, secret,
  paid resource, synthetic hosted record or workflow activation is authorized here.
- Apply only the reviewed application migration, not the earlier local foundation fixture
  or seed. Current database/CI receipts and deployment state are recorded in PROGRESS and
  the [feature note](features/persisted-authorization.md).
- Deployed after source review and exact-source full CI: hosted version20261002173712,
  four private forced-RLS tables, authenticated-only minimized own-context RPC, zero rows.
  Real anonymous API denial passed. Aligned the migration filename to provider history
  without changing its reviewed SQL. Hosted 0029 definer warning is an intentional bounded
  exception, independently reviewed against current official guidance; retain and re-review
  before staff activation. No RLS/table grant is widened to silence it.

## ORG-008 — Visitor analytics, Speed Insights and hosting efficiency, 2 October 2026

- Status: CONFIRMED explicit requester instruction in the current chat. The requester sent a
  screenshot of Vercel's Web Analytics setup page ("Can you do this"), then asked to optimize
  the Vercel hosting settings for efficiency, enable Speed Insights and add other useful
  settings or integrations; a Pro plan may follow at publication. This is the approved
  analytics configuration that INF-01 requires.
- Vercel Web Analytics (`@vercel/analytics` 2.0.1) and Speed Insights
  (`@vercel/speed-insights` 2.0.0) load on the production deployment only
  (`VERCEL_ENV=production`): previews, local and CI builds render neither, and only Vercel
  serves their scripts (from project-specific same-origin paths). Both are cookieless and
  send their beacons to the site's own origin. Before anything is sent, the page address
  loses its query string and fragment (PRV-03), and automated browsers
  (`navigator.webdriver`) send nothing, so test runs against a deployment neither count as
  visits nor make write requests.
- Only public information pages are counted: the locale home and the sections listed in
  `countedSections` (`src/lib/vercel-observability.ts`), with one slug segment under
  programme and speakers. Future account, review and organizer areas, 404s and internal
  previews send nothing; a unit test fails when a new public page folder is not listed, so
  each addition is deliberate. This follows ChatGPT's 2 October analytics review (public
  routes only, no previews, no query strings).
- The referrer is sent by Vercel's script, not by `beforeSend`. The site's
  `Referrer-Policy: no-referrer` leaves internal navigations without one, and browsers send
  other sites' origins only by default.
- Data flow (PRV-07): Vercel receives the page path and route pattern, referrer, country,
  and device, browser and OS class, plus Core Web Vitals. Visitors are counted by a hash that
  rotates daily, not by a cookie or a stored IP address. Vercel processes this outside Saudi
  Arabia. The cross-border assessment remains with the organizers; this decision claims no
  compliance. The Privacy page must describe both services before it is published.
- Speed Insights reports field p75 LCP, CLS and INP per route: the evidence NFR-02 asks for
  (public-page LCP ≤ 2.5 s at p75).
- Functions run in `bom1` (Mumbai) instead of the default `iad1` (Washington, D.C.), set in
  `vercel.json`. Requests from the organizer's connection in Saudi Arabia enter Vercel at
  the Mumbai edge, and uncached pages (programme, media, 404s, health) then crossed to `iad1`:
  0.42–0.48 s to first byte, against about 0.21 s for CDN-cached pages. `dxb1` (Dubai)
  appears in the dashboard, but a deployment with it failed with "Invalid region" on this
  plan. No public function
  reads Supabase or personal data. This is a latency setting, not a production
  data-location approval (INF-02, CFG-10): review it together with the Supabase region
  (`ap-northeast-1` today) before any personal-data workflow opens.
- The approved film and posters under `/media/` may be cached by browsers for 30 days
  (`max-age=2592000, stale-while-revalidate=86400`) instead of being revalidated on every
  visit (NFR-03). Replacement media must ship under a new file name.
- Dashboard settings checked and left as they were: Fluid compute on, Node.js 24.x,
  Prioritize Production Builds on, Vercel Authentication on previews, protected source maps,
  Web Analytics and Speed Insights enabled, firewall bot protection off (a challenge would
  also stop link previews and automated QA). Plan-dependent options are listed in PROGRESS.
- Affected IDs: INF-01/02/08, PRV-03/07, NFR-02/03, CFG-10.

## ORG-009 — Chapter navigation on phones and tablets, 2 October 2026

- Status: CONFIRMED explicit requester instruction in the current chat, with an iPhone
  screenshot of the homepage chapter index. On phones the second navigation bar "isn't
  convenient": on desktop it follows the reader, but on a phone "when you scroll it's kinda
  just gone". The requester suggested a sidebar, leaving the form open.
- First version (PR 18), now superseded: a floating pill that opened a side panel. The
  requester tried it on an iPhone and rejected it the same evening. The panel needed two taps
  to reach a chapter, the 2×3 index still looked out of place on a phone, and the bar's
  appearance and chapter changes were not smooth. The requester asked for something "smooth
  and convenient", perhaps on the side or centred, with creative freedom, and noted that
  the desktop version is fine.
- Current version (PR 20): below 1100px the chapter index is one swipeable row of chapter
  chips that sticks under the floating header, as the desktop bar does. It is styled as a
  second deck of the header card. A purple highlight glides to the current chapter, and the
  row slides that chip to the middle (mirrored in Arabic). One tap goes to any chapter, and the
  highlight moves straight there rather than through each chapter between. The first time the
  bar scrolls into view its chips glide in one after another; docking under the header settles
  it with a short motion and the header's shadow. At 1100px and above nothing changes.
- Reduced motion: no entrance, settle, glide or slide, and the scroll jumps (DESIGN_GUIDE).
- Affected IDs: SCP-01, DSN-01/02, ACC-01, LOC-02.
