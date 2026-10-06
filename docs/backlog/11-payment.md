# Payment

M7; REL-02. P1, the authorized KAU arrangement, is selected. ORG-042 (6 October 2026) identifies the Faculty of Medicine payment platform, `lms.waqf.org.sa`, as the payment/receipt/refund platform. The actual interface and official confirmation/reconciliation process remain unresolved. Every implementation starts with synthetic transactions and a mock adapter; no API or webhook is assumed. Policy publication changes no payment code or live workflow.

<a id="bl-pay-01"></a>

## BL-PAY-01 — Create immutable server-priced order snapshots

- **Source IDs:** PAY-01, PAY-02, DAT-03, DAT-04, API-02, PRV-03
- **Status:** Planned.
- **Purpose:** Finance and participants can rely on the exact approved amount and product terms for each order.
- **Scope:** Order/item migration and server calculation with integer minor units for configured currency; snapshot base price, discount, applicable taxes and final amount.
- **Exclusions:** Invented prices/currency/tax, mutable historical totals, card fields and live collection.
- **Dependencies:** BL-FND-01; BL-SEC-01; approved financial configuration from [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02).
- **Roles:** Participant owns order view; Finance has duty-scoped access; server creates snapshots.
- **States/transitions:** Order preparation → retained priced snapshot; financial completion remains a separate verified transition, not a client-set flag.
- **Data touched:** Order, order item, configured product/price/tax version and owner/edition references.
- **Acceptance criteria:** Client price/discount/currency tampering has no effect; unsupported/missing monetary configuration closes live checkout; later price edits cannot alter existing snapshots; rounding follows approved currency precision.
- **English/Arabic:** Bilingual order labels and price explanations; numbers/references readable in RTL.
- **Accessibility:** Semantic item totals and error summary; no amount communicated only by color.
- **Security/RLS:** Own-order reads; Finance minimal fields; deny client writes to totals/status and unauthorized cross-edition access.
- **Audit/email:** Audit order creation and adjustments through separate records; no payment receipt until verified completion.
- **Automated tests:** Tampered totals, zero/positive cases, currency precision, configuration closure, snapshot immutability and RLS negatives.
- **Manual UAT:** Finance compares synthetic calculations against approved example fixtures once supplied.
- **Release gate:** REL-02, REL-06; CFG-02 configuration before live orders.
- **Owner type:** Backend/database engineer with finance owner.
- **TBD blocked:** Synthetic calculation engine unblocked; production monetary values blocked by CFG-02.

<a id="bl-pay-02"></a>

## BL-PAY-02 — Redeem discounts and complete eligible zero-value orders

- **Source IDs:** PAY-03, REG-02, WKS-02, DAT-04, API-02, AT-03, AT-05
- **Status:** Planned.
- **Purpose:** Eligible participants receive valid discounts without bypassing human admission or workshop approval.
- **Scope:** Restricted code configuration, activation/expiry, product/group eligibility, per-user/global limits, non-stacking default and transactional redemption; complete validated zero-value orders without a gateway.
- **Exclusions:** Invented student evidence rules, card collection, automatic admission and unapproved restoration on cancellation.
- **Dependencies:** BL-PAY-01; verified participant account; [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02).
- **Roles:** Participant redeems; Finance manages authorized discount configuration; approvers remain separate.
- **States/transitions:** Eligible code validation → atomic usage allocation → completed zero-value order when amount is zero; approval state unchanged.
- **Data touched:** Discount policy/version, redemption, order snapshot and minimal approved eligibility evidence.
- **Acceptance criteria:** Exactly one remaining redemption succeeds under races; expired/wrong-product/ineligible codes fail safely; zero-value order consumes usage and never requires card details; approval is still required.
- **English/Arabic:** Localized conditions, errors and financial status; English email events.
- **Accessibility:** Labelled code field, keyboard redemption, text error/live result, no inaccessible eligibility proof instructions.
- **Security/RLS:** Server verifies eligibility; participants cannot read other redemptions or enumerate protected eligibility evidence; scoped Finance writes.
- **Audit/email:** Log policy changes and redemption result without unnecessary evidence contents; post-commit outcome email where needed, not duplicate approval email.
- **Automated tests:** Redemption races/retries, per-user/global limits, non-stacking, expiry boundary, zero-value/manual-approval combinations and forged eligibility.
- **Manual UAT:** Finance and registration staff inspect synthetic full-discount and invalid-code journeys.
- **Release gate:** REL-02, REL-06; eligibility/limit/refund-restoration policy approved.
- **Owner type:** Backend engineer with finance and registration leads.
- **TBD blocked:** Synthetic validation unblocked; live evidence, eligibility limits and restoration rules blocked by CFG-02.

<a id="bl-pay-03"></a>

## BL-PAY-03 — Isolate KAU collection behind a mock-first adapter

- **Source IDs:** PAY-01, PAY-04, PAY-05, REG-03, API-01, API-02, ERR-01
- **Status:** Planned; no live contract supplied.
- **Purpose:** Approved participants can enter the authorized collection flow when its real interface is confirmed, without coupling application records to an invented gateway.
- **Scope:** Adapter boundary, separate payment-attempt record, synthetic success/failure/timeout scenarios and idempotent approved-order handoff; explicit closed live adapter.
- **Exclusions:** New merchant account, assumed webhook/API, real payment calls, card storage and interpreting redirect return as proof.
- **Dependencies:** BL-PAY-01; BL-REG-02 and the agreed workshop approval contract; [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02), [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10). Use synthetic approved-order fixtures before workshop producer integration.
- **Roles:** Participant; Finance; server payment adapter.
- **States/transitions:** Approved positive-value order → attempt initiated → pending/result reported by mock; no entitlement confirmation from browser return.
- **Data touched:** Order reference, payment attempt, adapter correlation/idempotency record; no card data.
- **Acceptance criteria:** Unapproved/zero-value orders cannot launch collection; retries reuse intended attempt; timeout preserves recoverable status; live adapter refuses activation without reviewed contract/configuration.
- **English/Arabic:** Bilingual pre-handoff and recovery UI; external interface language capability is verified rather than promised.
- **Accessibility:** Keyboard handoff, clear external destination/return status and recoverable failure instructions.
- **Security/RLS:** Server-owned reference/amount, owner authorization, redacted logs and secret-only adapter credentials when later configured.
- **Audit/email:** Audit attempt creation/result; no receipt or success email for redirect/assertion alone.
- **Automated tests:** Direct unapproved call, amount tampering, duplicate retry, interrupted return, timeout and disabled live adapter.
- **Manual UAT:** Finance rehearses each synthetic outcome; later inspect actual KAU sandbox or authorized reconciliation procedure.
- **Release gate:** REL-02, REL-06; live activation requires documented interface and official confirmation proof; BL-WKS-03 integration must pass before workshop collection opens.
- **Owner type:** Integration engineer with authorized KAU/finance owner.
- **TBD blocked:** Mock implementation unblocked; real adapter implementation is BL-PAY-08 and remains blocked by CFG-02/10 evidence.

<a id="bl-pay-04"></a>

## BL-PAY-04 — Authenticate and reconcile official payment confirmation

- **Source IDs:** PAY-04, PAY-05, DAT-04, API-02, ROL-07, AT-04
- **Status:** Planned; supported confirmation mechanism unresolved.
- **Purpose:** Only official matched KAU evidence grants financial completion, exactly once.
- **Scope:** Contract-neutral confirmation processor and synthetic fixtures; after approval implement the supported authenticated result or authorized official-report reconciliation path, with a visible unmatched/ambiguous queue.
- **Exclusions:** Receipt-image proof, participant assertions, invented callback signatures and automatic approximate matching.
- **Dependencies:** BL-PAY-01, BL-PAY-03; BL-AUTH-01; [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02) must define operator, evidence, reference matching and timing.
- **Roles:** Authorized Finance reconciler; authenticated integration identity if actually supported; Participant reads own financial result.
- **States/transitions:** Pending attempt/order → financially completed only after order, amount, currency and transaction/reference match; ambiguous evidence → reconciliation queue without entitlement.
- **Data touched:** Official evidence reference, transaction identity, order/payment result, reconciliation action and exception.
- **Acceptance criteria:** Duplicate/out-of-order evidence grants one credit; wrong amount/currency/reference cannot confirm; record provenance and authorized operator; atomic outbox prevents rolled-back confirmation emails.
- **English/Arabic:** Bilingual Finance queue and participant outcomes; official evidence content retained without invented translation.
- **Accessibility:** Accessible comparison table and match/error labels; keyboard resolution and confirmation of consequential actions.
- **Security/RLS:** Finance-scoped evidence access; participant and registration roles cannot confirm payment; authenticate actual integration and reject forged/replayed evidence.
- **Audit/email:** Immutable confirmation/reconciliation history with actor/source/reference; deduplicated English receipt only after completion.
- **Automated tests:** Valid, forged, duplicated, stale, wrong-reference/currency/amount, partial failure and concurrent confirmation cases.
- **Manual UAT:** Authorized KAU/finance owner proves the actual confirmation/reconciliation path and audits one ambiguous case before money is accepted.
- **Release gate:** REL-02, REL-06; AT-04 with actual approved procedure, not just mocks.
- **Owner type:** Backend/integration engineer with finance owner.
- **TBD blocked:** Synthetic core unblocked; concrete official-proof integration and live confirmation blocked by CFG-02.

<a id="bl-pay-05"></a>

## BL-PAY-05 — Resolve late and ambiguous payment exceptions without overbooking

- **Source IDs:** PAY-05, PAY-06, REG-06, WKS-04, ERR-01, API-02, ADM-01
- **Status:** Planned.
- **Purpose:** Finance can recover a payment received after capacity expiry without silently granting unavailable admission or losing the payment.
- **Scope:** Restricted exception queue, race-safe available-seat recheck and authorized resolution dispatch under approved reconciliation/refund policy.
- **Exclusions:** Automatic overbooking, unapproved refund/reallocation priorities and erasing failed attempts.
- **Dependencies:** BL-PAY-04; BL-REG-03; BL-WKS-02; BL-PAY-06; [DR-CFG-01](DECISION_REQUIRED.md#dr-cfg-01), [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02), [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07).
- **Roles:** Finance; Registration/Workshop Administrator for capacity decision within scope.
- **States/transitions:** Official payment after expired allocation → exception; authorized resolution → newly validated available allocation or refund process, never implicit confirmation.
- **Data touched:** Payment exception, official evidence, allocation reference, resolution reason and refund reference.
- **Acceptance criteria:** Financial completion alone cannot restore expired seats; concurrent resolution allocates once or leaves a visible exception; operator sees failed/pending/successful/refunded/partially refunded/disputed financial outcomes without conflating admission.
- **English/Arabic:** Bilingual exception labels and participant support explanation; English operational emails.
- **Accessibility:** Clear actionable exception summary, keyboard filters and non-color priority/status.
- **Security/RLS:** Finance cannot alter scientific data; capacity resolution requires corresponding scoped grant; participant reads only safe own outcome.
- **Audit/email:** Record original event, resolution actor/reason and financial/allocation changes; notify participant after durable resolution.
- **Automated tests:** Expiry/confirmation races, full capacity, repeat resolution, split-role denial and failed resolution rollback.
- **Manual UAT:** Finance and registration staff rehearse a paid-after-expiry case with zero spare seats.
- **Release gate:** REL-02, REL-06; published exception/refund handling required.
- **Owner type:** Backend engineer with finance and operations leads.
- **TBD blocked:** Synthetic queue unblocked; live resolution rules blocked by CFG-01/02/07.

<a id="bl-pay-06"></a>

## BL-PAY-06 — Track authorized refunds separately from cancellation

- **Source IDs:** PAY-07, PAY-06, REG-07, DAT-03, ADM-04, AT-04
- **Status:** Planned.
- **Purpose:** Staff and participants can distinguish a refund request from money actually returned by KAU.
- **Scope:** Refund ledger and restricted actions with official references; amount ceilings; execute separately approved admission revocation, seat release, discount restoration and dependent-booking effects.
- **Exclusions:** Claiming an MSRC request returns money, monetary refunds for zero-value orders and invented cancellation policy.
- **Dependencies:** BL-PAY-04; BL-CHK-01; agreed exception-to-refund request contract; approved KAU authority/procedure and consequence matrix from [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02). Refund tracking can land before the exception queue calls it.
- **Roles:** Authorized Finance; approved refund authority; operations roles only for permitted consequences.
- **States/transitions:** `requested` → `approved` → `submitted-to-KAU` → `confirmed-refunded` where applicable; cancellation remains independent.
- **Data touched:** Refund amount/reference/history, original payment, official confirmation and separate entitlement/allocation effects.
- **Acceptance criteria:** Cumulative refunds cannot exceed eligible paid amount; repeated official evidence has one effect; only verified return is labelled refunded; zero-value orders create no monetary refund.
- **English/Arabic:** Bilingual participant/Finance status explanations; English payment emails.
- **Accessibility:** Explicit amount/status text, accessible confirmation/reason form and recoverable failure state.
- **Security/RLS:** Scoped Finance permission and MFA; participants cannot approve refunds; external evidence read access minimized.
- **Audit/email:** Preserve actor, reason, amount, official reference and every transition; notify without overstating return status.
- **Automated tests:** Over-refund/concurrent partial refunds, zero-value denial, duplicate return evidence, unauthorized approval and consequence idempotency.
- **Manual UAT:** KAU/finance owner rehearses partial refund and cancellation with dependent workshop booking under approved policy.
- **Release gate:** REL-02, REL-06; official refund authority, published consequences and BL-PAY-05 exception integration required for live resolution.
- **Owner type:** Backend engineer with finance/KAU owner.
- **TBD blocked:** Synthetic ledger unblocked; live execution and entitlement consequences blocked by CFG-02.

<a id="bl-pay-07"></a>

## BL-PAY-07 — Publish financial terms and deliver truthful receipts

- **Source IDs:** PAY-08, PAY-01, EML-01, EML-04, ROL-07, CMS-04, ADM-03
- **Status:** Planned.
- **Purpose:** Participants know who collects money and what they buy, while Finance sees only the information necessary to account for it.
- **Scope:** Versioned bilingual seller/contact/product/currency/cancellation/refund/receipt content; participant receipt view and English email template bound to verified financial snapshot; minimal Finance order view.
- **Exclusions:** Invented tax invoice claims, legal approval by engineering, scientific report access and full profile exports.
- **Dependencies:** BL-PAY-01, BL-PAY-04, BL-PAY-06; durable email service; approved terms from [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02); privacy/content approval.
- **Roles:** Participant; Finance; authorized publisher and financial approver.
- **States/transitions:** Draft terms/template → authorized publication; completed verified payment → queued receipt → provider delivery result tracked separately.
- **Data touched:** Terms/template versions, minimal recipient/order summary and email job/delivery evidence.
- **Acceptance criteria:** Live collection stays closed without required financial disclosures; receipt uses retained server snapshot; queued is not described as delivered; Finance cannot retrieve scientific reports or unnecessary profile fields.
- **English/Arabic:** Financial UI and published terms bilingual/RTL; receipts and payment communications English-only.
- **Accessibility:** Semantic totals, readable policy headings, screen-reader receipt text and useful plain email content.
- **Security/RLS:** Only owner/authorized Finance accesses receipts; templates escape untrusted values and cannot leak another recipient's data.
- **Audit/email:** Audit publication and receipt event; email deduplication, bounce/failure visibility and dashboard fallback.
- **Automated tests:** Missing disclosure gate, receipt snapshot consistency, template injection/missing variable, wrong-recipient and Finance-access negatives.
- **Manual UAT:** Finance approves sample receipts/disclosures; test both locales and failed email fallback.
- **Release gate:** REL-02, REL-06; approved receipt/tax treatment and tested sender.
- **Owner type:** Full-stack/content engineer with finance and privacy reviewers.
- **TBD blocked:** Synthetic views/templates unblocked; publication and receipt wording blocked by CFG-02/09/12 and sender CFG-10.

<a id="bl-pay-08"></a>

## BL-PAY-08 — Implement the officially supported KAU collection handoff

- **Source IDs:** PAY-01, PAY-04, PAY-05, PAY-08, REG-03, AT-04, CFG-02, CFG-10
- **Status:** Planned; actual adapter implementation blocked until the official interface, payee and reference contract are supplied and approved.
- **Purpose:** An approved participant can pay through the selected authorized KAU arrangement while MSRC retains trustworthy order correlation and separate confirmation.
- **Scope:** Implement the approved hosted checkout, payment link or other documented collection method behind BL-PAY-03; pass only permitted order/reference data; enforce configured destination, amount/currency and approved-order eligibility; provide recoverable handoff/return behavior and connect official confirmation to BL-PAY-04.
- **Exclusions:** New merchant account, invented API/webhook/signature, card handling by MSRC, granting entitlement from browser return and production activation based only on mocks.
- **Dependencies:** BL-PAY-01, BL-PAY-03, BL-PAY-04, BL-PAY-07; approved KAU interface/access or official collection instructions and order-reference contract; [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02), [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10).
- **Roles:** Approved Participant; authorized KAU/Finance owner; delegated integration engineer; restricted server integration identity only where the actual interface requires one.
- **States/transitions:** Approved positive-value order with valid allocation → authorized collection handoff/attempt; return, timeout or interruption → truthful pending/recoverable status; only BL-PAY-04 official matched confirmation changes financial completion.
- **Data touched:** Retained priced order, approved collection destination/configuration, order-reference correlation, attempt/idempotency record and safe external result reference; no card data.
- **Acceptance criteria:** Actual documented interface carries the required order/reference correctly; unapproved, expired-allocation and zero-value cases cannot launch payment; destination/amount/reference tampering fails; retry behavior follows verified system capabilities without duplicate collection; browser return never confirms payment.
- **English/Arabic:** Bilingual MSRC handoff/return/error/help UI; verify and document external interface language support rather than promising it; English transactional notifications only.
- **Accessibility:** Keyboard handoff and return, clearly identified external destination, actionable timeout/cancellation state and documented external accessibility findings with approved assistance route where required.
- **Security/RLS:** Server checks owner, approval, current allocation and permitted destination; secrets remain server-only if used; validate any supported callback/status mechanism from official documentation; least-privilege access and redacted logs.
- **Audit/email:** Record safe handoff/attempt/configuration provenance; no receipt or successful-payment email until BL-PAY-04 confirms official evidence; never email card data or reusable integration secrets.
- **Automated tests:** Adapter contract tests from official examples; forged destination/amount/reference; duplicate initiation, cancelled/expired approval, interruption/retry and forged return; confirmation/reconciliation fixtures shared with BL-PAY-04.
- **Manual UAT:** Authorized KAU/Finance owner exercises the supported test environment or approved end-to-end validation procedure; verify actual payee, order matching, failure/return handling and official confirmation/reconciliation, retaining evidence without participant secrets.
- **Release gate:** REL-02/REL-06 and AT-04 using the actual approved collection and BL-PAY-04 confirmation path; published terms, refund/exception handling and registration/workshop ticket prerequisites must pass before live collection is enabled.
- **Owner type:** Integration/security engineer with authorized KAU and Finance owners.
- **TBD blocked:** Yes, CFG-02 official collection interface/payee/references/access and CFG-10 integration/configuration approval; BL-PAY-03 mock work remains independent. This backlog does not authorize real transactions.
