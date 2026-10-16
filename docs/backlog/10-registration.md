# Registration

M7; REL-02. Account verification, internal approval, any financial completion and admission remain separate. ORG-051 and ENG-043 authorize the closed slice-1 foundation described in [REGISTRATION](../features/REGISTRATION.md). Existing issue statuses below are retained; the dated feature/progress receipts distinguish implemented foundation from unbuilt later transitions. Production registration remains closed.

16 October 2026 reconciliation: ORG-051 confirms general capacity 2,000 as private
per-edition configuration, early/general opening, waitlist, countdown, confirm-seat
and organizing-team/volunteer priority. Every number/window is a setting; none is
seeded in production. Free versus paid and all operating instants remain unresolved.
The older BL-REG-01 conditions are not publication authority for prices, discounts,
approval or capacity: current public copy says “Reserve your seat” and gives a
neutral request receipt. ORG-039/041 govern identity and age; published Terms v1.0
§§3–5, REG item 6, CHK-01/02 and ADM bulk-action safeguards remain authoritative.
The registration foundation builds only the request; future slices below do not
authorize opening it. Pending workshop capacity is 50 per-workshop or total, not
an approved default. Proposed durations/groups/thresholds in ORG-051 are synthetic
test values only. Wallet passes remain later work.

<a id="bl-reg-01"></a>

## BL-REG-01 — Submit a registration request with published conditions

- **Source IDs:** REG-01, REG-02, REG-04, REG-05, AUTH-01, AUTH-06, PRV-02, PRV-03, PRV-05, PRV-06, DAT-03, TIM-01, API-01
- **Status:** Planned; production closed.
- **Purpose:** A verified participant requests attendance while understanding that a request does not confirm admission.
- **Scope:** Slice 1 builds the private migration, guarded owner request service and bilingual form; record accepted current Terms and reuse the immutable 18+ declaration. Gate incomplete required settings/current session and database-time priority/general windows. ORG-039 requires national ID/Iqama or international passport for registration identity verification; ENG-043 chooses AES-256-GCM, a separate duplicate HMAC, masked projections and audited Super Admin reveal. Deletion by 28 January 2028 remains a later purge/restore release gate. The earlier policy-publication PR added no field; this separately authorized closed slice does.
- **Exclusions:** Automatic admission, charging, competition eligibility, identifier collection at account creation and a public attendee directory. ORG-039 supersedes the national-ID exclusion for registration; ORG-025 replaces a separate publicity-consent product step with the approved registration notice.
- **Dependencies:** BL-FND-01; participant verified-account slice; privacy notice/version contract; [DR-CFG-01](DECISION_REQUIRED.md#dr-cfg-01), [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02).
- **Roles:** Verified participant submits own request; any later scoped staff view exposes only the mask; Super Admin reasoned reveal is separate.
- **States/transitions:** Slice 1 creates only `pending_approval`; no transition to `confirmed` on verification or form submission. Later draft/rejection/allocation transitions require their reviewed slices.
- **Data touched:** Registration, identity-verification number, internal attendee list, attendance declaration, terms acceptance, edition configuration; account referenced separately. Minimize access/logs/exports and never expose identifiers in public URLs, analytics or ordinary emails.
- **Acceptance criteria:** Server/database reject unverified users, absent 18+ proof, stale/wrong sessions, incomplete required settings and ineligible time windows. Public request copy says “Reserve your seat” with a neutral receipt, never internal approval, discounts, prices, capacities or operating dates; published Terms remain linked. Retried/concurrent submissions return one request without allocating a seat.
- **English/Arabic:** Full translated labels, instructions and RTL; preserve entered data during locale change.
- **Accessibility:** Keyboard completion, explicit required labels, error summary/focus, readable conditions and non-color status.
- **Security/RLS:** Forced RLS and no client table grants; owner/session/edition checked in guarded RPCs. No browser writes to approval/financial fields. Mask ordinary staff identity access and deny reviewer, finance, media and scanner overreach. Versioned encryption/key custody follows ENG-043 without weakening server/database authority.
- **Audit/email:** Record submission actor/time and Terms version; no number/digest/key in audit or ordinary logs. Slice 1 sends no inline email; a durable post-commit English receipt/outbox belongs to slice 2.
- **Automated tests:** Verified/unverified, closed configuration, request retry, forged owner/state and locale preservation; identifier validation and denied unrelated organizer/public access; no identifier leakage in logs/exports/URLs/analytics; one-year deletion boundary, controlled exports/files, backup-cycle and restore-suppression evidence.
- **Manual UAT:** Submit synthetic requests in both locales; inspect neutral receipt, current Terms evidence, RTL and keyboard/axe behavior. Local database-dependent execution is BLOCKED if Supabase/Docker is unavailable.
- **Release gate:** REL-02, REL-06; privacy approval before production collection.
- **Owner type:** Full-stack engineer with registration lead and privacy reviewer.
- **TBD blocked:** Synthetic implementation unblocked; production submission blocked by CFG-01/02/09.

<a id="bl-reg-02"></a>

## BL-REG-02 — Manually approve requests with atomic seat allocation

- **Source IDs:** REG-02, REG-03, REG-04, REG-06, ROL-07, DAT-04, API-02, AT-03, AT-05
- **Status:** Planned.
- **Purpose:** Authorized staff can approve eligible requests without overbooking, including requests receiving a full discount.
- **Scope:** Scoped approval/rejection action, seat-allocation transaction and explicit capacity-pending queue; optimistic versions and reason capture.
- **Exclusions:** Auto-approval, assuming pending requests reserve seats, payment collection and invented queue priorities.
- **Dependencies:** BL-REG-01; BL-AUTH-01; BL-SEC-01; approved capacity/approval responsibility and queue policy from [DR-CFG-01](DECISION_REQUIRED.md#dr-cfg-01).
- **Roles:** Registration/Workshop Administrator; Super Admin exceptional actions; Participant sees own outcome.
- **States/transitions:** `pending_approval` → `approved_awaiting_payment` only with allocation; otherwise explicit capacity-pending outcome; `pending_approval` → `rejected` with reason. Queue vocabulary awaits approved policy.
- **Data touched:** Registration, approval evidence, admission allocation, capacity configuration, queue entry.
- **Acceptance criteria:** Competing approvals for one remaining seat yield at most one allocation; full discount still requires a recorded human approval; rejection creates no charge; stale edits cannot overwrite newer decisions.
- **English/Arabic:** Bilingual organizer and participant views; English outcome emails.
- **Accessibility:** Keyboard staff actions, clear confirmation/reason field, live status and error focus.
- **Security/RLS:** Edition-scoped approver permission and MFA enforced server/database; Finance and participants cannot approve themselves.
- **Audit/email:** Actor/time, prior/resulting status and reason on rejection/override; notification outbox commits with outcome.
- **Automated tests:** Last-seat races, repeat approval, stale version, full-discount denial, role/edition negatives and rollback without email.
- **Manual UAT:** Two staff approve competing requests; inspect capacity-pending message and audit evidence.
- **Release gate:** REL-02, REL-06; AT-03/05 passing.
- **Owner type:** Backend/database engineer with registration operations lead.
- **TBD blocked:** Synthetic allocation tests unblocked; live approval blocked by CFG-01, including queue handling.

<a id="bl-reg-03"></a>

## BL-REG-03 — Expire unpaid reservations and process reasoned cancellation

- **Source IDs:** REG-04, REG-06, REG-07, PAY-06, PAY-07, TIM-01, ERR-02, API-03
- **Status:** Planned.
- **Purpose:** Capacity is released predictably when approval/payment windows end, without losing late financial evidence.
- **Scope:** Configured deadline enforcement, durable expiry job, authorized cancellation action and entitlement-revocation event; isolate financial consequences for payment reconciliation.
- **Exclusions:** Invented hold duration, automatic monetary refund, silent workshop cancellation and late-payment overbooking.
- **Dependencies:** BL-REG-02; agreed late-payment/refund event contract and ticket revocation contract; [DR-CFG-01](DECISION_REQUIRED.md#dr-cfg-01), [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02). Land expiry and closed exception handoff before implementing its payment consumer.
- **Roles:** Registration/Workshop Administrator; Finance for monetary effects; Participant reads own outcome.
- **States/transitions:** Unpaid `approved_awaiting_payment` → `expired`; authorized eligible registration → `cancelled`; exception handling retains original financial records.
- **Data touched:** Registration, allocation, configured deadline, cancellation/expiry reason, durable job and entitlement reference.
- **Acceptance criteria:** Exactly one capacity release under repeated/concurrent expiry; confirmed payment racing expiry is reconciled atomically; late payment enters exception handling; dependent booking effects execute only approved policy.
- **English/Arabic:** Localized expiry/cancellation messages and explicitly labelled Asia/Riyadh times.
- **Accessibility:** Remaining action and support route understandable without a live countdown; status announced after action.
- **Security/RLS:** Only scoped operators/jobs may change state; participants cannot alter deadlines or restore entitlements.
- **Audit/email:** Preserve actor or job identity, time, reason, prior/new state; deduplicated English expiry/cancellation email after commit.
- **Automated tests:** Expiry/payment race, duplicated job, unauthorized extension/cancel, clock boundary, failed job replay and dependent-policy closure.
- **Manual UAT:** Expire synthetic reservations, reconcile a late payment and verify revoked ticket rejection.
- **Release gate:** REL-02, REL-06; BL-PAY-05, BL-PAY-06 and BL-CHK-01 integrated and tested; published cancellation/financial consequences required before activation.
- **Owner type:** Backend engineer with registration and finance leads.
- **TBD blocked:** Synthetic workflow unblocked; live deadlines and consequences blocked by CFG-01/02.

<a id="bl-reg-04"></a>

## BL-REG-04 — Confirm eligible admission and show a truthful participant dashboard

- **Source IDs:** REG-03, REG-07, SCP-03, ROL-02, DAT-03, API-02, AT-03
- **Status:** Planned.
- **Purpose:** Participants can see whether they are approved, financially complete and actually entitled to a ticket.
- **Scope:** Confirmation service joining separate approval and financial evidence; owner dashboard with registration ID, state, due action, expiry, ticket and support route; issue credential through BL-CHK-01.
- **Exclusions:** Treating redirects/receipts as payment proof, attendee directory, co-author admission and scanning UI.
- **Dependencies:** BL-REG-02, BL-REG-03; BL-PAY-02, BL-PAY-04; BL-CHK-01; participant authentication and support route.
- **Roles:** Participant; scoped Registration/Workshop Administrator; payment service.
- **States/transitions:** `approved_awaiting_payment` → `confirmed` only with valid approval, financial completion and active allocation; payment states stay independent.
- **Data touched:** Registration, approval/allocation references, completed order reference, entitlement and ticket reference.
- **Acceptance criteria:** Paid-but-unapproved and approved-but-unpaid requests cannot confirm; valid zero-value order plus approval can confirm; repeated triggers issue one entitlement; revoked/suspended entitlements never admit.
- **English/Arabic:** Entire participant status/action/help flow bilingual and RTL; financial references retain readable direction.
- **Accessibility:** Status text and headings, keyboard ticket access, accessible pending/error states and minimum touch targets.
- **Security/RLS:** Participant queries cannot read other registrations/orders/tickets; privileged session suspension blocks access despite stale tokens.
- **Audit/email:** Atomic confirmation audit/outbox; English confirmation without embedding ticket secrets in logs.
- **Automated tests:** Every approval/payment combination, duplicate/out-of-order triggers, allocation expiry, cross-account dashboard and revoked ticket.
- **Manual UAT:** Compare pending, rejected, unpaid, zero-value confirmed and cancelled accounts in English/Arabic.
- **Release gate:** REL-02, REL-06; ticket issuance and revocation must pass before opening registration.
- **Owner type:** Full-stack engineer with registration lead.
- **TBD blocked:** Synthetic dashboard unblocked; production confirmation inherits CFG-01/02 gates.

<a id="bl-reg-05"></a>

## BL-REG-05 — Preserve research independence and publish attendance obligations

- **Source IDs:** REG-08, REG-01, SCP-03, SCP-05, CMS-04, REL-03, REL-04
- **Status:** Planned.
- **Purpose:** Eligible researchers can submit without buying attendance and know any approved presenter/winner/team attendance obligation before outcomes are published.
- **Scope:** Explicit independent-submission policy checks and versioned public obligation content linked from affected decision/release gates.
- **Exclusions:** Invented presenter fees, retroactive payment conditions, automatic attendee status for authors and personal schedule building.
- **Dependencies:** Abstract finalization/release and competition release contracts; structured bilingual content; [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03), [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05), [DR-CFG-06](DECISION_REQUIRED.md#dr-cfg-06).
- **Roles:** Participant; Scientific Administrator; competition lead; authorized content publisher.
- **States/transitions:** Submission eligibility remains independent of registration/payment state; obligation content draft → authorized publication before affected outcomes.
- **Data touched:** Versioned attendance-obligation content and release evidence; no new financial state.
- **Acceptance criteria:** Unpaid verified eligible user can submit; an unpublished attendance obligation cannot silently become a release condition; co-authorship creates no registration.
- **English/Arabic:** Obligations bilingual; scientific submission content remains English/LTR.
- **Accessibility:** Clear readable policy links and headings; no inaccessible document-only explanation.
- **Security/RLS:** Publication restricted; participants cannot edit policy or bypass scientific eligibility; no cross-domain privilege expansion.
- **Audit/email:** Audit policy version/publication; any published outcome email uses approved English wording, not a new hidden demand.
- **Automated tests:** Unpaid submission allowed, role-negative publication and release preflight missing-policy cases.
- **Manual UAT:** Research and registration leads inspect a submit-without-attendance journey and proposed outcome communication.
- **Release gate:** REL-03/04 for relevant outcomes; REL-06.
- **Owner type:** Product/full-stack engineer with scientific and competition owners.
- **TBD blocked:** Independence enforcement unblocked; attendance-obligation publication blocked until relevant owner decisions exist.

<a id="bl-reg-06"></a>

## BL-REG-06 — General waitlist and timed seat offers

- **Source IDs:** REG-04/06/07, TIM-01/02, API-02/03, DAT-03/04, AT-05; ORG-051, ENG-043.
- **Status:** Planned; production closed.
- **Purpose:** Preserve capacity and make released seats available through the approved waiting-list policy.
- **Scope:** General waitlist, deterministic approved ordering, atomic seat claim, private expiry timestamps and timed offers. Read/claim checks use database time; schedulers only sweep. Each seat claim is one Postgres RPC.
- **Exclusions:** An invented queue order, automatic ticket/admission, payment implementation and workshop waitlists.
- **Dependencies:** BL-REG-01/02/03; durable email outbox; DR-CFG-01; approved offer/queue policy and configured duration.
- **Roles:** Scoped registration operator, Super Admin for reasoned exceptions, participant for own allowed claim.
- **States/transitions:** Eligible request → `waitlisted` → `offered` → allowed claim outcome; expired offer releases once without silently extending a deadline.
- **Data touched:** Queue position/order evidence, seat allocation, `offer_expires_at`, audit and outbox; identity remains masked.
- **Acceptance criteria:** Competing claims cannot exceed configured capacity; exact expiry and duplicate claims are deterministic; cancelled/expired offers cannot claim even before a sweep.
- **English/Arabic:** Participant and non-review staff UI bilingual/RTL; neutral public wording, English email only.
- **Accessibility:** Keyboard claim and readable expiry text; countdown is never the only deadline evidence.
- **Security/RLS:** Ownership and current edition-scoped authority at every read/claim; no client table grants.
- **Audit/email:** Immutable offer/claim/expiry/release evidence; deduplicated post-commit outbox.
- **Automated tests:** Last-seat races, duplicate/late offers, role/owner negatives, clock boundaries and worker outage/replay.
- **Manual UAT:** Competing synthetic claims and elapsed offer without running the sweeper.
- **Release gate:** REL-02/06 plus approved queue policy and configured durations.
- **Owner type:** Backend/database engineer with registration operations lead.
- **TBD blocked:** Synthetic implementation unblocked; production ordering, deadlines and notifications need CFG-01 evidence.

<a id="bl-reg-07"></a>

## BL-REG-07 — Early access and opening countdown using server time

- **Source IDs:** REG-01/05, TIM-01/02, LOC-01/03, ACC-01, SEC-01; ORG-051.
- **Status:** Planned; production closed.
- **Purpose:** Admit eligible participants during the configured early-access window and show a truthful opening countdown.
- **Scope:** Approved early-access proof/codes and groups, edition-scoped start/end settings, countdown anchored to server time and database-enforced access. Organizing-team priority remains the separate BL-REG-11 designation.
- **Exclusions:** Invented groups, 72-hour production default, browser-clock authority, granting access from a public flag or code possession without server validation.
- **Dependencies:** BL-REG-01; DR-CFG-01; approved proof/group policy; durable jobs for any later authorized code delivery.
- **Roles:** Eligible participant; specifically authorized operator issues/revokes access.
- **States/transitions:** Not open → eligible early access → general opening → closed, using configured half-open windows.
- **Data touched:** Private eligibility/proof, code digest if approved, settings, clock anchor and audit.
- **Acceptance criteria:** Altering browser time/query/env cannot open registration; invalid/replayed/expired proof fails; null settings stay closed.
- **English/Arabic:** Bilingual RTL countdown and neutral accessible opening state; scientific content unaffected.
- **Accessibility:** Readable date/time fallback and restrained live announcements; reduced motion respected.
- **Security/RLS:** No client-readable proof secrets; verified participant/session and database-time recheck on submit.
- **Audit/email:** Minimal issuance/revocation/redemption evidence; delivery through durable outbox only.
- **Automated tests:** Boundary/server-clock cases, group/code negatives, replay/races, EN/AR countdown and keyboard/axe.
- **Manual UAT:** Synthetic early/general transitions with a deliberately wrong browser clock.
- **Release gate:** REL-02/06 and approved eligibility/proof/window settings.
- **Owner type:** Full-stack/security engineer with registration lead.
- **TBD blocked:** Synthetic work unblocked; production groups, proof and dates remain undecided.

<a id="bl-reg-08"></a>

## BL-REG-08 — Internal bulk approval with atomic seat allocation

- **Source IDs:** REG-02/03/06, ADM-01/02/04, API-01/02, AT-05; ORG-051, ENG-043.
- **Status:** Planned; production closed.
- **Purpose:** Authorized staff process selected requests safely without overbooking.
- **Scope:** Private staff queue, bounded selection, consequential-action confirmation, per-record result and atomic allocation through the same authority as individual approval.
- **Exclusions:** Public approval wording, automatic approval, invented batch limits, bypassing payment or privileged identity reveal.
- **Dependencies:** BL-REG-01/02/06; staff session authority; durable outbox; approved operator scope/queue policy.
- **Roles:** Edition-scoped Registration/Workshop Administrator; Super Admin only for approved exceptions/exports.
- **States/transitions:** Eligible `pending_approval` requests → allowed approved/waitlisted outcome; stale/ineligible rows report safe individual failures.
- **Data touched:** Request version/status, allocations, scoped selection, audit and outbox.
- **Acceptance criteria:** Bulk/individual races preserve capacity and one outcome per request; stale selection never overrides cancellation or expiry; identity values remain masked.
- **English/Arabic:** Private non-review staff UI bilingual/RTL; no new public copy about internal processing.
- **Accessibility:** Keyboard selection/confirmation and understandable per-record result summary.
- **Security/RLS:** Recheck session, role, edition and source state inside each atomic mutation; no financial/export privilege implied.
- **Audit/email:** Actor, selected targets, resulting states and exceptional reason; committed outcomes enqueue deduplicated email.
- **Automated tests:** Competing bulk/individual actions, revoked role, cross-edition selection, duplicate requests and rollback/outbox failure.
- **Manual UAT:** Synthetic mixed-state selection, last-seat competition and partial safe result display.
- **Release gate:** REL-02/06; ADM consequential-action safeguards and operator policy.
- **Owner type:** Full-stack/database engineer with registration operations lead.
- **TBD blocked:** Synthetic work unblocked; live operating responsibility and queue policy remain CFG-01 decisions.

<a id="bl-reg-09"></a>

## BL-REG-09 — Participant self-cancellation under published Terms §4

- **Source IDs:** REG-04/07, PAY-07/08, API-01/02/03, ADM-04, CHK-01/02; Terms v1.0 §4, ORG-051.
- **Status:** Planned; production closed.
- **Purpose:** Participants can cancel eligible own requests without claiming that a refund has already occurred.
- **Scope:** Owner-scoped cancellation, explicit consequences, atomic seat release and ticket revocation events; financial handoff follows published Terms and any later approved integration.
- **Exclusions:** Invented refund eligibility/deadlines, automatic monetary return, editing Terms or silent cancellation of workshop bookings.
- **Dependencies:** BL-REG-03/04/06; BL-CHK-01; durable outbox; separately approved payment/dependent-booking contract if relevant.
- **Roles:** Participant for own eligible cancellation; finance/registration roles retain separately scoped exception handling.
- **States/transitions:** Allowed own request → `cancelled`; repeated cancellation returns the same outcome.
- **Data touched:** Request, cancellation evidence, allocation release and revocation/outbox references; financial history retained separately.
- **Acceptance criteria:** Cancellation/claim/payment races cannot restore admission or release twice; UI distinguishes cancellation request/state from returned funds.
- **English/Arabic:** Bilingual RTL confirmation using published Terms links and neutral status wording.
- **Accessibility:** Keyboard action, descriptive consequences, focused outcome and recovery/support route.
- **Security/RLS:** Native owner/session and source-state check; cross-account or forged financial changes fail.
- **Audit/email:** Actor/time, previous/new state and permitted reason; deduplicated English outcome email after commit.
- **Automated tests:** Owner/role negatives, repeated/concurrent cancellation, ticket refusal, late financial evidence and dependent-policy closure.
- **Manual UAT:** Synthetic pending and entitled cases in both locales with expected consequences.
- **Release gate:** REL-02/06; approved lifecycle and financial consequences where applicable.
- **Owner type:** Full-stack engineer with registration/finance owners.
- **TBD blocked:** Synthetic work unblocked; any unresolved consequences beyond published Terms remain gated.

<a id="bl-reg-10"></a>

## BL-REG-10 — Confirm your seat and release unanswered places to the waitlist

- **Source IDs:** REG-06/07, TIM-01/02, API-02/03, DAT-03/04, EML-01; ORG-051, ENG-043.
- **Status:** Planned; production closed.
- **Purpose:** Obtain the participant's timely attendance confirmation and release eligible unanswered allocations.
- **Scope:** Settings-driven invitation lead time/response window, single atomic confirmation RPC, database-time expiry, exactly-once release to the general waitlist and durable reminders.
- **Exclusions:** Seven-day/72-hour production defaults, schedulers extending eligibility, invented ticket/refund consequences and workshop logic.
- **Dependencies:** BL-REG-04/06; durable outbox/jobs; approved response/expiry/consequence policy and configured lead/response settings.
- **Roles:** Participant for own response; authorized registration job/operator for approved expiry/release.
- **States/transitions:** Eligible allocated place → response due → confirmed response or expired/released outcome under the approved policy; do not conflate request receipt with seat confirmation.
- **Data touched:** Invitation/response timestamps, response expiry, immutable response/release evidence, allocation and outbox.
- **Acceptance criteria:** Confirming at/after expiry fails even before a sweep; duplicate response/release is idempotent; competing claim/confirm/cancel cannot overbook.
- **English/Arabic:** Bilingual RTL participant response; English email with explicit configured deadline.
- **Accessibility:** Keyboard confirmation and readable deadline fallback without relying on live countdown.
- **Security/RLS:** Current owner/session, edition and state checks inside one database transaction.
- **Audit/email:** Durable response/invitation/expiry/release evidence and deduplicated post-commit English email.
- **Automated tests:** Before/at/after expiry, worker downtime/replay, duplicate response and cancellation/release races.
- **Manual UAT:** Synthetic answer/no-answer cases and a stopped scheduler across expiry.
- **Release gate:** REL-02/06; confirmed operating settings and complete ticket/waitlist integration.
- **Owner type:** Backend/full-stack engineer with registration operations lead.
- **TBD blocked:** Synthetic work unblocked; timing and consequences require owner decisions.

<a id="bl-reg-11"></a>

## BL-REG-11 — Organizing-team and volunteer priority

- **Source IDs:** REG-01/05, WKS-01/03/04, ROL-10/12, ADM-04, SEC-01/02; ORG-051, ENG-043.
- **Status:** Planned; production closed.
- **Purpose:** Give owner-designated organizing-team members and volunteers early registration and first pick of workshop seats.
- **Scope:** Per-edition participant designation, Super Admin-only set/remove RPC with nonblank reason, actor/timestamps and immutable audit; private server-side lookup for registration and future workshop booking. Slice 1 builds the designation and registration-window check only.
- **Exclusions:** Self-service designation, public roster flag, auto-qualification from Team page/profile text, invented qualification/evidence rules and workshop allocation logic in this slice.
- **Dependencies:** Verified participant account; staff Super Admin session authority; BL-REG-01; configured priority/general windows; owner qualification/verification procedure before live use.
- **Roles:** Super Admin only assigns/removes; participant cannot read/write designation; future workshop service receives minimal boolean authority.
- **States/transitions:** Unset → designated → removed, retaining reasoned history; only designated accounts may request during the configured priority window, while all eligible accounts may during general opening.
- **Data touched:** Edition/account designation, setter/remover, reason/timestamps and immutable audit; no identity plaintext.
- **Acceptance criteria:** Wrong role/edition or blank reason fails; set/remove audited; designation revocation immediately affects new claims; retries cannot add duplicate active designation.
- **English/Arabic:** Any authorized private controls/errors bilingual/RTL; add no public volunteer copy beyond approved homepage benefits.
- **Accessibility:** Labelled reason/action controls and readable audit outcome; keyboard-only operation when later UI is built.
- **Security/RLS:** Forced RLS, no client grants, guarded RPC and current Super Admin assurance; authorization never derives from editable user metadata.
- **Audit/email:** Record reason and prior/resulting designation; no real or inline email from slice 1.
- **Automated tests:** Wrong-role/reason denial, set/remove audit, non-designated/flagged priority access, general-window equality, server lookup and FK/RLS/grant checks.
- **Manual UAT:** Super Admin designates/removes synthetic accounts; compare priority/general request eligibility.
- **Release gate:** REL-02/06 and approved roster qualification/verification/custody procedure; workshop priority has independent WKS release gates.
- **Owner type:** Backend/security engineer with owner and workshop/registration leads.
- **TBD blocked:** Synthetic designation and registration checks unblocked; exact qualifying roster, verification method and operational owner remain open.
