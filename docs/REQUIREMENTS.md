# MSRC 2027 implementation requirements

Source snapshot: 29 September 2026; current requirements reconciled through organizer decisions ORG-037–042 on 6 October 2026. Status: implementation baseline, not evidence of a built or launched system.

**Primary authority: S1, Development Specification v0.5**, last modified 2026-09-29 11:30:21 UTC (14:30:21 Riyadh). Read the [full specification](../sources/Development_Specification_v0.5.txt) whenever a condensed rule needs detail. [S2, Hackathon Draft](../sources/Hackathon_Draft.txt), modified 11:09:52 UTC the same day, supplements answered hackathon choices. S1 explicitly reconciles its open questions and conflicts. Older S3/Main PDF and S5/starter content do not override S1.

MUST means required behavior. DEFAULT means an adopted, configurable engineering starting value. TBD means unresolved business configuration or approval. Use [DECISIONS.md](DECISIONS.md) for every gate and conflict. Develop with synthetic data while production approval or configuration remains pending. All selected functions remain delivery scope; sequencing their releases does not remove them.

ORG-001 in [DECISIONS.md](DECISIONS.md) confirms Day 1 on **27 January 2027** and Day 2 on **28 January 2027**. ORG-031 (5 October 2026) confirms **King Faisal Conference Center / مركز الملك فيصل للمؤتمرات**, King Abdulaziz University, Jeddah, at Abdullah Sulayman St, Jeddah 22254. These supersede only the event-date and venue TBDs in SCP-01/CFG-01. Preserve the v0.5 source snapshot; rooms, capacities, doors/session times and individual workflow deadlines remain unresolved. ORG-030 supersedes public registration/workshop approval and discount descriptions, while retaining backend enforcement.

ORG-037 approves the English Privacy Policy and Terms v1.0 source for exact publication
with a complete Arabic translation; a native Arabic reader review is requested.
ORG-038–042 supersede the older controller, identifier exclusion, AI-provider,
unverified-retention and payment-platform notes as described below. The v0.5 source
and dated decisions remain historical evidence. Publication approves the participant
privacy notice only; accounts, registration, AI and hosted activation stay closed.

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
| SCP-01 | Two-day MSRC conference, parallel sessions, general attendance, abstract research with oral/poster allocation, postgraduate 3MT, hackathon, workshops, keynotes, exhibitions, sponsors, post-event archives. Day 1 is 27 January 2027; Day 2 is 28 January 2027 (ORG-001), at King Faisal Conference Center, King Abdulaziz University, Jeddah (ORG-031). Rooms and capacity remain configuration gates; no session start times are inferred. |
| SCP-02 | Home; About; Dates and Venue; Program; Speakers; Workshops; Participation and Submission Guidelines; Teams/Committees/Board; Sponsors and Sponsorship; Gallery/Past Editions; Announcements; FAQ; Contact; Privacy; Terms. Public information and workshop availability require no login. |
| SCP-03 | Verified-user dashboard for registrations/payments, submissions/revisions, workshop bookings/waitlists, QR tickets and certificates. Registration, research, hackathon and 3MT are distinct workflows sharing one account. Co-author listing creates no registration. |
| SCP-04, SCP-07 | Delivery scope includes manual approvals, paid/fully discounted orders, human review and advisory assessment, committee dashboards, live judging, email automation, scans, survey-based certificates, CMS, audits and reports. Certificate release can follow initial public launch; evidence/retention design must exist before collection. |
| SCP-06 | Planning estimates: 15,000+ visitors, about 1,000 attendees, 300-400 abstracts, 30-40 reviewers/judges and 3-10 administrative accounts. The 30-100 workshop figure needs clarification as total or per workshop. These are estimates, not capacity commitments. |

- **SCP-05:** Public attendee/abstract directories, public research search, sponsor self-service accounts, personal schedules, full-site search, attendee messaging/networking, native mobile apps, automatic team matching, university SSO, SMS/WhatsApp/push integrations remain excluded. ORG-016 removes all authentication phone collection/verification. My Bookings remains a read-only list of actual bookings; program filters and private administrative search remain required. Dark mode/live public leaderboards are not committed. Offline scanning remains gated.

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
| ROL-10 Super Admin | ORG-043 supersedes the historical three-account requirement: two distinct designated accounts, at least two active after restricted first-account bootstrap. Names only in DECISIONS. No self-demotion/suspension or self-reset; another Super Admin handles recovery (ORG-044). Roles/security/integrations/full personal exports/audits/exceptional actions remain separately scoped and gated. Infrastructure ownership remains organizational and separate from this website role. |
| ROL-11 Confidential evidence | IRB and similarity originals/downloads restricted to Super Admins. Scientific admin receives validation outcomes. Any original-evidence grant needs separate approved, logged policy change. Judge access to presentation files is a different class. |
| ROL-12 All privileged accounts | Individually identifiable; regular staff password plus private exact-session email check (ORG-015); Super Admins password plus authenticator TOTP (ORG-016). No self/conflicted reviews. Offboarding removes grants and invalidates applicable sessions. Roles, overrides, downloads, exports and publication auditable. |

## 3. Identity, language and accessibility

- **AUTH-01:** Managed email/password accounts with verified email only (ORG-016); no participant phone verification or MFA. Minimum age 18 to create an account or participate (ORG-041). Public browsing requires no account. No special KAU authentication. Normalize unique email without public enumeration. Verification alone grants no operational entitlement.
- **AUTH-02:** Six-digit numeric participant email verification: source DEFAULT ten-minute validity,60s resend,at most3/email/15min,5 failures/code, replacement invalidation/single use/protected storage and account/IP controls. ORG-015 regular-staff additional check separately uses approved6digits/5min,60s resend,3/account/15min,10/rolling24h,20/IP/hour,5 failures then15min cooldown,newest only. ORG-016 removes all phone/SMS verification, provider/sender/budget/hook requirements. Native TOTP/test bounds are not an approved production abuse policy. Direct managed/API bypass prevention and live email configuration/UAT remain gates.
- **AUTH-03:** Progressive password throttling. DEFAULT five failed attempts/15 minutes before further challenge/cooldown, no permanent lockout. Generic reset response, expiring single-use credentials, recovery/session-revocation tests.
- **AUTH-04:** Regular staff require password then a fresh verified-email code, with a private receipt bound to exact user/session/current email/password/grants (ORG-015). This is not Supabase MFA/AAL2 or email OTP sign-in. Password-only access denies at server/API/database/storage gates. New login requires a fresh check; refresh does not. Super Admins require password then current verified authenticator TOTP MFA (ORG-016); phone factors, generic AAL2 or an email receipt cannot substitute. Participants have verified email/password without MFA. ORG-043/044 designate two distinct Super Admins (names only in DECISIONS), invite-only staff and recovery by the other Super Admin, never self-reset; revoke first, verify identity, audit the provider operation and require fresh password/appropriate second step. This supersedes the older separate approver/operator TBD. Recent-auth timing, processing/retention implementation, provider/inbox/recovery rehearsal and live release remain gates. Inbox compromise may enable both password reset and code receipt: staff email checking is weaker than authenticator MFA. English transactional delivery uses the existing Resend sender per ORG-044; this closed foundation sends only to synthetic test inboxes. No paid resources, production setting changes, real email or hosted migration apply.
- **AUTH-05:** CONFIRMED organizer override ORG-019 (formerly auth ORG-012, 2 October 2026): authenticated participant absolute session maximum 72 hours; public visitors browse without login. Privileged screens retain idle 30 minutes and absolute eight hours. Token refresh never restarts the absolute origin. Recent authentication for sensitive changes, warn before expiry where possible and preserve already saved drafts; recent-auth maximum age and warning lead remain TBD, with dependent actions closed. Server/database logout/suspension/factor-reset/revocation behavior must be tested. The original v0.5 source snapshot retains its historical 24-hour default.
- **AUTH-06:** Required account name/email; ORG-016 removes authentication phone collection/verification. Approved participant privacy notice is Privacy Policy v1.0 (ORG-037); retention/access/transfer/recovery implementation remains a production gate. Professional category when relevant; institution/academic level conditional. Country/city optional. Licence conditional on approved professional purpose, never universal for students/non-medical participants. ORG-039 supersedes the national-ID exclusion for conference registration only: collect national ID or Iqama number, or passport number for international attendees, for identity verification. Do not add an account-profile or registration field in this policy PR. ORG-041 confirms passwords of at least 10 characters; current creation/reset validation remains unchanged.
- **AUTH-07, AUTH-08:** Permitted profile corrections; email change/deletion through verified support. Reverify replacement email, assess retention exceptions, revoke access appropriately. ORG-041 supersedes the seven-day source default: accounts whose email is never verified are deleted after 30 days and are unusable until verification. Cleanup implementation and verification remain backlog work before activation. Never log passwords/codes.
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
5. Require configured two-day attendance declaration/terms; show dates/prices/cancellation/capacity conditions. ORG-030 (5 October 2026) supersedes public approval-process and discount descriptions: eligible KAU students receive discount information directly from organizers. Keep backend approval and discount enforcement unchanged. Close registration until dates, capacity, approver and financial setup are complete.
6. Approval atomically allocates available capacity or explicit capacity-pending queue. Pending requests guarantee no seat. Approved unpaid reservations expire at configured deadline, release capacity and notify.
7. Dashboard shows ID/state/payment action/expiry/ticket/support. No admission from pending, rejected, cancelled, expired, refunded-and-revoked or suspended entitlement.
8. Eligible verified users may submit research before paid attendance. Presenter/team/winner attendance obligations must be published before decisions; no retrospective hidden charge.

ORG-039 requires national ID/Iqama number, or passport number for international
attendees, at conference registration for identity verification. The internal attendee
list is accessible only to authorized organizers and has no public directory. Add this
to BL-REG-01 without implementing the field in the policy PR: strict server/database
access control, encryption at rest if feasible, no unnecessary logs/exports/email,
and deletion one year after the conference (by 28 January 2028). Registration remains
closed until REL-02 and the identifier protection/deletion checks pass.

### Financial behavior

| IDs | Requirement |
| --- | --- |
| PAY-01 | P1 authorized KAU collection arrangement selected: Faculty of Medicine payment platform, `lms.waqf.org.sa` (ORG-042). Conference/workshops paid products with promotional codes including 100% university-student discount. Payee account/finance authority, interface, prices/currency/methods/evidence/tax/refund execution remain gated. No independent merchant or provided API assumed. |
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

ORG-040 selects DeepSeek, with processing in the People's Republic of China, and
supersedes ENG-018's Anthropic provider choice. PR #40's built Anthropic adapter is
unchanged in this publication PR. Add the switch to BL-AI-01 before activation,
rechecking provider APIs, scientific-only payload/privacy screening, structured
output/provenance, failure/manual-review behavior, terms/transfers, budget and
committee evaluation. AI remains disabled; the historical DeepSeek prototype is not
adopted automatically.

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
| HAC-10, HAC-11 | ORG-039 supersedes the national-ID exclusion for conference registration identity verification only; it does not add a hackathon-entry identifier field. No authentication phone collection/verification under ORG-016; unrelated optional phone purposes stay separately gated. Platform email-only despite source WhatsApp mention; optional external group and phone sharing unresolved. Fees, final rubric, judges/ties/panels, solo/team awards, prizes, budget/partners/IP/publicity/certificates open. Separate manual conference/workshop approval still applies. No research-supervisor rule inheritance. |

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

- **EML-01 through EML-05:** Platform notifications remain email-only and English-only, including verification/recovery/approval/payment/submission/revision/publication/co-author/team/workshop/schedule/certificate events. ORG-016 retires the authentication SMS exception. ORG-028/029 approve a Contact-only Resend adapter from MSRC 2027 <no-reply@msrc2027.com> to the fixed contact inbox, with validated visitor Reply-To, escaped plaintext/language and no visitor acknowledgment. Domain verification and Production-only Sending key are organizer-reported; server delivery is default-off, reviewed counters/configuration/processing and human delivery checks precede activation. This does not authorize authentication SMTP or other notifications. Durable deduplicated jobs, bounded retry/replay/error visibility, bounce tracking and dashboard fallback remain future delivery requirements. Test/escape templates, no other-user leakage. Optional announcements honor preferences. Test300–400 decision/~1,000 attendee batches; queued is not delivered.
- **SUP-01 through SUP-03:** ORG-021 supersedes source Gmail plus-address routes with nine ordered topics/tags: General `[MSRC General]`, Registration `[MSRC Registration]`, Research & abstracts `[MSRC Abstracts]`, Workshops `[MSRC Workshops]`, Hackathon `[MSRC Hackathon]`, 3MT `[MSRC 3MT]`, Sponsors & partners `[MSRC Sponsors]`, Website & account support `[MSRC Support]`, Privacy & data requests `[MSRC Privacy]`. All route to `contact@msrc2027.com`; subject `<tag> <short summary>`; Reply-To is the server-validated visitor email. Fields: topic/name/email/optional related reference/message. Accessible anti-spam has no third-party CAPTCHA; no sensitive echo, arbitrary recipient or general helpdesk status system. Consumer email domains accepted; shared-inbox labels do not establish access controls. Default-off retains the exact disabled form and before-input API rejection. ORG-028/029 add an opt-in Production-only Resend fetch with signed minimum-fill/single-use tokens, strict origins and bounded input; forced-RLS expiring HMAC IP/email/nonce counters, atomic hour/day admission and hard 60/day cap. No inquiry content is retained in app/DB/logs/analytics; logs contain outcome/topic only. Provider uncertainty never automatically retries. Confirm proposed 3/hour and 10/day and 3-second minimum, external provider/inbox processing/retention/location, review/apply only the Contact migration and perform human delivery UAT before opening.
- **SPN-01, SPN-02:** Approved packages/tiers/logos/descriptions/booths managed by PR/admin, no sponsor portal/uploads. Prospectus sent by organizers/KAU via email, not assumed public download. Restricted inquiry company/contact/email/optional phone-role/interest/message, owner/status new/assigned/contacted/closed, acknowledgment and team email.
- **CMS-01 through CMS-04:** Structured no-code editing of home/dates/countdown/About/announcements/speakers/program/workshops/sponsors/committees/FAQ/contact/gallery, fixed layouts. Draft/preview/publish/unpublish/deletion recovery and revisions/audit. Authorized ordinary publisher can publish; explicit media approval required. Scheduled publishing optional. Public speaker/committee fields approved; private contact separated, no speaker accounts or assumed international-speaker category. Controlled translations, no broken switches/private preview indexing/API exposure.
- **MED-01 through MED-04:** Direct approved-storage image/video uploads, albums by edition/activity, no third-party embeds. ORG-025 records the organizer's registration-notice-only decision for identifiable publication, superseding the separate optional-publicity consent product assumption; no consent checkbox is added. Notice alone is not evidence of a lawful basis or blanket bystander permission. Final publication wording, institutional/privacy review, asset rights, subject/purpose/version evidence and removal handling remain release gates. Private originals as justified and optimized derivatives. DEFAULT JPEG/PNG/WebP, MP4/WebM, exact sizes/codecs/durations/budget gated. No public download button; never claim copying impossible.
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

- **PRV-01 through PRV-04:** ORG-038 identifies the Faculty of Medicine, KAU as controller and Research Principles Club acting on its behalf, superseding ORG-022's ambiguity. ORG-037 approves exact English Privacy Policy and Terms v1.0 with complete Arabic translation, top version/effective date from one publication-date value, indexable latest/stable routes and EN/AR sitemap alternates. The old dated snapshot is unlinked publicly and noindex if retained. Set the participant notice to v1.0 with EN/AR summary/link, while accounts remain closed. Arabic Terms prevail (ORG-041); native-reader review is requested. ORG-024 request contact/topic, response within 30 days and owner Akram Awan remain internal operational decisions. Keep patient identifiers excluded and licence purpose-limited; ORG-039 allows conference-registration national ID/Iqama, or international passport, with authorized internal attendee access only. Operational request handling, institutional evidence, actual processing/transfer safeguards and recovery remain gates. Contact retains ORG-028/029's separate default-off boundary and expiring HMAC counters; policy publication sends no email or creates an inquiry copy. Optional announcement preferences remain unchanged.
- **PRV-05 through PRV-08:** Approved v1.0 wording supersedes related ORG-023 TBDs: accounts, registrations including identity numbers and research submissions deleted one year after the conference, by 28 January 2028; minimal certificate verification record (name, certificate number, date) retained until 28 January 2029; Contact inbox messages deleted one year after conference; Resend sent emails retained 30 days; spam-prevention codes up to 24 hours; never-verified accounts deleted after 30 days; published media until removed. Deletion covers controlled exports/files, provider backups follow routine overwrite cycles, and restore suppression remains an implementation gate. Unspecified financial/audit exceptions require explicit approval; do not infer them from a working default. Map and verify actual database/storage/backups/app/email/model/analytics/logs locations and transfer safeguards against the approved policy. ORG-037 supplies photography-publication/legal-basis/removal wording, superseding the related placeholder description; rights validation and removal execution remain gates. Respect contractual attribution even without credit feature. Ongoing research confidentiality.
- **SEC-01, SEC-02:** HTTPS, managed password/session controls, validation/encoding/appropriate CSRF/rate limits/accessible bot protection, ownership/assignment authorization. Supabase RLS on exposed tables/storage, sanitized reviewer data separated, no roles from editable metadata, server-only secrets/service keys; explicit view/function/direct-API tests.
- **SEC-03 through SEC-05:** Authenticated-purpose upload validation by allowlist/MIME/signature/size/malware, generated names/private quarantine/signed expiring delivery. Block executables/macros/arbitrary archives; failed scanning never publishes. Distinct stage limits, deadline requires completed upload/finalization (scan may complete after). Remediation preserves history. Hidden download controls are not confidentiality protection.
- **SEC-06, SEC-07:** Provider secret stores/rotation, pinned dependencies/reviewed changes/redacted logs, actual revoked privileges. Named incident/privacy owners for containment/evidence/access/recovery/notification assessment. Security/restore/critical-failure tests gate launch.
- **INF-01 through INF-03:** Selected managed Vercel + managed Supabase, authorized KAU collection, organization ownership O1. Framework/plans/regions/other providers unselected/unprovisioned. No Saudi-hosting assumption. Synthetic development may proceed, production locations/approvals gated. Domain/repository/teams/billing/recovery organizational with continuing/backup custodians, delegated developer access, separate site Super Admins.
- **INF-04 through INF-06:** Isolated development/staging/production secrets/data/keys, test payment/email restrictions and protected/noindex previews. Source control/reviews/tests/migrations/release approver and rollback without dropping new records. Back up database **and storage objects separately** and prove restoration. Handover schema/runbooks/access/billing/jobs/renewals.
- **INF-07, INF-08:** DEFAULT ordinary recovery objectives 24-hour maximum data loss/four-hour restoration; critical registration/deadline/event windows target 15-minute database loss/one-hour restore, budget/plan/test dependent; file target separate. Not guarantees. Monitor availability/submission/queue/payment/email/access/file-scan/check-in failures with named email responders; production never relies on a chat session.
- **NFR-01 through NFR-03:** Baseline 100 active registration/submission users; stress 1,000 public browsers with documented authenticated mix. DEFAULT agreed-mobile p75 LCP <=2.5s; normal internal API p95 <=1s excluding external/uploads/jobs. Report conditions/error rates and approved exceptions. 99.9% monthly availability objective; no planned critical-window maintenance. Cache public/static, never private personalized responses.
- **TIM-01, TIM-02:** UTC instants, Asia/Riyadh display with label. ORG-001 approves calendar dates only: the homepage countdown expresses days until 27 January 2027 using the Asia/Riyadh calendar date, with Day 1/Day 2/finished display states. Do not turn a calendar date into an approved doors/session opening instant, registration/submission deadline or attendance rule. Separate auditable opening/deadline settings per workflow remain unset until approved; real configured instants follow the UTC requirement. Server finalize before cutoff; pre-open browser grants no late entitlement. Retain drafts and clear closed state. Authorized scoped extension records actor/reason/cutoff/notifications.
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

A visitor can browse public pages. Participants require password and verified email only; no phone/MFA or verification-based entitlement. Expired/reused/replaced email codes and quota failures deny. Regular staff require a current exact-session application email receipt; password-only/foreign-session/changed-email/grant evidence cannot bypass it. Super Admins require password then current verified authenticator TOTP; phone/primary OTP/generic AAL2/email receipts or stale factors cannot substitute. Recovery/offboarding revoke applicable sessions. Synthetic preview and no-delivery CI do not establish real email or production readiness.

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

Verify O1 organizational ownership and authorization evidence, named custodians, selected managed Vercel/Supabase environments and approved locations, Faculty payment confirmation/reconciliation, production/staging isolation, secret access, role offboarding, renewals, critical-window support, and completed gate values. Record an accountable sign-off for each opened workflow. ORG-039 resolves registration identifier collection with strict access/deletion controls; it creates no authentication/hackathon field or workflow opening. Unresolved WhatsApp and unrelated source conflicts cannot silently enable new collection or automated channels.
