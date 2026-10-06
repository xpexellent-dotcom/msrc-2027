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
| Event dates | Day 1: 27 January 2027; Day 2: 28 January 2027 | Confirmed by the project requester in the current chat on 1 October 2026; see ORG-001 in DECISIONS |
| Venue and schedule | King Faisal Conference Center / مركز الملك فيصل للمؤتمرات, King Abdulaziz University, Jeddah; Abdullah Sulayman St, Jeddah 22254 | Venue confirmed 5 October 2026 by ORG-031; rooms, doors/session times and workflow windows remain unset |
| Ownership | MSRC/RPClub organizational accounts with institutional authorization, O1 | Selected model; custodians/authorization evidence pending |
| Hosting and data | Managed Vercel plus managed Supabase | Project ecemjggwlzqpjcwmchrl designated Production by ORG-017; production plan/region/privacy/operational approvals unresolved; synthetic data isolated |
| Payments | Faculty of Medicine payment platform, `lms.waqf.org.sa`, under P1 | Selected by ORG-042 on 6 October 2026; actual interface, confirmation/reconciliation and finance rules remain pending |
| Policies and controller | Approved Privacy Policy and Terms v1.0 English source; Faculty of Medicine, KAU as controller, Research Principles Club acting on its behalf | ORG-037/038, 6 October 2026; full Arabic translation accompanies publication, with native-reader review requested; operational activation remains separate |
| Main product reference | Development Specification v0.5 | Current live source reviewed on 29 September 2026 |
| Build status | Next.js foundation, bilingual public pages and closed persisted authority implemented | Current receipts in PROGRESS; BL-AUTH-05/06 add a local synthetic preview and review-only session migration; live staff/operational access stays closed |

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

Public attendee lists; public abstracts/research search; full-site search; attendee networking/messaging; sponsor self-service accounts; personal schedule building; native mobile apps; automatic team matching; university SSO; SMS/WhatsApp/push integrations. ORG-016 (3 October 2026) removes authentication phone collection and verification and retires SMS provider/sender/budget work. Participants use managed email/password and verified email without MFA. Regular staff use ORG-015 password plus a server/database enforced exact-session application email check at AAL1; Super Admins use password plus authenticator TOTP. Inbox access may allow password reset and code receipt; staff email checking is weaker than authenticator MFA. Live authentication email configuration, recovery, privacy/location, named custodians and UAT remain gates. ORG-039 (6 October 2026) supersedes the national-ID exclusion for conference registration: collect national ID or Iqama number, or passport number for international attendees, for identity verification, with an internal attendee list accessible only to authorized organizers. The registration field remains backlog work with strict access control, encryption at rest if feasible and deletion one year after the conference. Third-party video embeds and public gallery download buttons are excluded. Dark mode is outside committed scope. [S1 SCP-05, AUTH-01/04/06, PRV-03/05/06, MED-01/04, DSN-02; ORG-015/016/039]

Program filters, read-only My Bookings, restricted dashboard search, and single-certificate verification remain in scope and must not be removed by those exclusions.

ORG-041 confirms minimum age 18, passwords of at least 10 characters, deletion after
30 days for accounts whose email is never verified, and the Arabic Terms prevailing
if versions differ. ORG-040 selects DeepSeek, processing in the People's Republic of
China, for future advisory AI; PR #40's Anthropic adapter must be switched before
activation. AI and accounts remain closed pending their independent release gates.

## Experience direction

The user wants a cinematic video homepage inspired by Slush, clear information organization inspired by ESC Congress, clean transitions, natural scrolling, and responsive buttons. Exact palette, fonts, timings, and final assets are working defaults until brand approval. Use the 2026 media source only after selection and permission review. [S6; S4; S1 DSN-01/02]

## Scale assumptions

Planning estimates: 15,000+ visitors, about 1,000 attendees, 300-400 abstracts, 30-40 reviewers/judges, and 3-10 administrative accounts. They are not confirmed admission limits. ORG-043 (7 October 2026) designates two distinct website Super Admins and requires at least two active accounts after the restricted first-account bootstrap. Names are recorded only in DECISIONS. Staff are invite-only; lost Super Admin access is reset by the other Super Admin (ORG-044). The workshop estimate of 30-100 registrations and hackathon solo finalist accounting remain unresolved. Load scenarios and service objectives are defined in the source and require measurement. [S1 SCP-06, ROL-10, NFR-01 to NFR-03; ORG-043/044]

## First deliverable to build

A reproducible local application foundation followed by a bilingual design system and homepage preview using clearly labeled synthetic content. Operational features remain closed. The initial goal is to validate structure, visual direction, responsiveness, language behavior, and the development workflow before implementing sensitive participation flows.

## References

Source IDs are defined in [SOURCE_REGISTER.md](SOURCE_REGISTER.md). Detailed rules are in [REQUIREMENTS.md](REQUIREMENTS.md); blockers are in [DECISIONS.md](DECISIONS.md). This brief is a navigation layer, not a substitute for the full specification.
