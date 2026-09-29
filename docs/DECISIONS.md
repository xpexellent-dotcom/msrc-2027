# MSRC 2027 decision and configuration register

Snapshot: 29 September 2026. This register records source-confirmed choices, working defaults, unresolved details and publication gates. It does not certify institutional approval, provisioning, implementation or test completion.

Primary source: **S1 Development Specification v0.5**, modified 2026-09-29 11:30:21 UTC / 14:30:21 Asia/Riyadh. [Current source snapshot](../sources/Development_Specification_v0.5.txt).

Supporting source: **S2 Hackathon Draft**, modified 2026-09-29 11:09:52 UTC / 14:09:52 Asia/Riyadh. [Current source snapshot](../sources/Hackathon_Draft.txt).

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
| Development tooling | ADOPTED FOR M1 | pnpm with lockfile, Vitest/Playwright and local Supabase fixture/policy tests; see ENG-001. | Docker unavailable on inspected host; database execution and remote CI still need evidence. | INF-04/05, REL-06 |
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

S3 is valuable conference background. Its proposals and roster drafts need confirmation before becoming current public content. See [CONFERENCE_BACKGROUND.md](CONFERENCE_BACKGROUND.md).

| Older source detail | Current interpretation | Required action |
| --- | --- | --- |
| S3 page 15 proposes 27-28 January 2027. | SOURCE PROPOSAL. S1 SCP-01/CFG-01 still leave exact dates open. | Leadership confirms exact event dates; then configure countdown, deadlines, public copy and operational windows. Do not publish the proposed date as confirmed. |
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
