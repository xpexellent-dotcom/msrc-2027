# Registration

M7; REL-02. Account verification, manual approval, financial completion and admission remain separate. These are planned issues; the local foundation has no operational registration implementation.

<a id="bl-reg-01"></a>

## BL-REG-01 — Submit a registration request with published conditions

- **Source IDs:** REG-01, REG-02, REG-04, REG-05, AUTH-01, AUTH-06, PRV-02, PRV-03, PRV-05, PRV-06, DAT-03, TIM-01, API-01
- **Status:** Planned; production closed.
- **Purpose:** A verified participant requests attendance while understanding that a request does not confirm admission.
- **Scope:** Registration migration, owner-scoped draft/request service and bilingual form; record configured two-day declaration and applicable terms version; server gate incomplete event/admission/finance configuration. ORG-039 requires national ID or Iqama number, or passport number for international attendees, at registration for identity verification. Add strict access controls, encryption at rest if feasible and deletion one year after conference (by 28 January 2028). This is future implementation work; the policy-publication PR adds no field/schema/migration.
- **Exclusions:** Automatic admission, charging, competition eligibility, identifier collection at account creation and a public attendee directory. ORG-039 supersedes the national-ID exclusion for registration; ORG-025 replaces a separate publicity-consent product step with the approved registration notice.
- **Dependencies:** BL-FND-01; participant verified-account slice; privacy notice/version contract; [DR-CFG-01](DECISION_REQUIRED.md#dr-cfg-01), [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02).
- **Roles:** Participant; Registration/Workshop Administrator reads scoped requests.
- **States/transitions:** `draft` → `pending_approval`; no transition to `confirmed` on verification or form submission.
- **Data touched:** Registration, identity-verification number, internal attendee list, attendance declaration, terms acceptance, edition configuration; account referenced separately. Minimize access/logs/exports and never expose identifiers in public URLs, analytics or ordinary emails.
- **Acceptance criteria:** Server rejects unverified users and incomplete live settings; shows approved dates, prices, discount/cancellation rules and capacity before submission; retries create one request with a clear pending result.
- **English/Arabic:** Full translated labels, instructions and RTL; preserve entered data during locale change.
- **Accessibility:** Keyboard completion, explicit required labels, error summary/focus, readable conditions and non-color status.
- **Security/RLS:** Own drafts only; deny cross-account/edition reads and direct writes to approval/financial fields. Internal attendee/identity access only for individually authorized organizers by duty; deny reviewer, finance, media and scanner overreach. Assess feasible at-rest encryption and key custody without weakening RLS.
- **Audit/email:** Record submission actor/time and terms version; queue English receipt after commit with dashboard fallback; no sensitive form echo.
- **Automated tests:** Verified/unverified, closed configuration, request retry, forged owner/state and locale preservation; identifier validation and denied unrelated organizer/public access; no identifier leakage in logs/exports/URLs/analytics; one-year deletion boundary, controlled exports/files, backup-cycle and restore-suppression evidence.
- **Manual UAT:** Submit synthetic requests in both locales; inspect admission warning and terms evidence.
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
