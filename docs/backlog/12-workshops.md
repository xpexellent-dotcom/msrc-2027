# Workshops

M7; REL-02. Workshop approval, financial completion, conference entitlement and activity evidence remain separate. No workshop capacity, price, room or time is inferred from planning estimates.

<a id="bl-wks-01"></a>

## BL-WKS-01 — Publish a bilingual workshop catalog with truthful availability

- **Source IDs:** WKS-01, WKS-02, SCP-02, CMS-01, CMS-04, TIM-01
- **Status:** Planned.
- **Purpose:** Visitors can understand approved workshop details and availability without signing in.
- **Scope:** Typed workshop record/read model and public detail/list views for bilingual title/description, instructor, room, times, capacity, remaining bookable seats, eligibility, price and deadline; unpublished state when inputs are incomplete.
- **Exclusions:** Invented workshops/instructors, personal attendee lists, booking mutation and reserved-seat identities.
- **Dependencies:** Structured CMS publication contract; BL-FND-01; [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07), [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12).
- **Roles:** Visitor; authorized workshop/content publisher.
- **States/transitions:** Draft workshop → authorized public information; booking availability remains independently gated.
- **Data touched:** Workshop, room/instructor references, public configuration and aggregate allocation counts.
- **Acceptance criteria:** Available seats distinguish reserved seats, active holds and confirmed bookings; only published approved fields appear; unavailable capacity does not expose participant names; displayed times identify Asia/Riyadh.
- **English/Arabic:** Complete bilingual fields or explicitly controlled fallback; RTL layout and localized availability.
- **Accessibility:** Semantic lists/detail headings, readable times/prices, keyboard links and textual full/closed status.
- **Security/RLS:** Anonymous reads limited to published projection; deny draft/private instructor/contact/allocation rows.
- **Audit/email:** Audit publisher changes through CMS; no email from public browsing.
- **Automated tests:** Published/draft projection, allocation arithmetic, translation gate, missing settings and anonymous access negatives.
- **Manual UAT:** Compare English/Arabic detail on mobile with synthetic full/available/closed workshops.
- **Release gate:** REL-01 for public information; REL-02 separately for booking; REL-06.
- **Owner type:** Full-stack engineer with workshop/content lead.
- **TBD blocked:** Synthetic catalog unblocked; real catalog publication blocked by CFG-07/12.

<a id="bl-wks-02"></a>

## BL-WKS-02 — Allocate first-come workshop holds transactionally

- **Source IDs:** WKS-02, WKS-03, WKS-04, WKS-06, DAT-04, API-02, TIM-01, AT-05
- **Status:** Planned.
- **Purpose:** Valid requests obtain fair provisional holds without races or hidden overbooking.
- **Scope:** Verified request endpoint, server ordering, atomic seat hold, overlap checks against both the participant's existing active holds and confirmed bookings, and configured approval/payment expiry; duplicate request protection.
- **Exclusions:** Ordering by staff approval clicks, indefinite holds, inventing hold length and treating a hold as confirmed attendance.
- **Dependencies:** BL-WKS-01; participant verification; BL-SEC-01; [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07).
- **Roles:** Participant; Registration/Workshop Administrator; expiry job.
- **States/transitions:** Valid request → time-limited provisional hold when capacity permits; decline/cancel/expiry → released hold; no capacity → waitlist option.
- **Data touched:** Booking request/server timestamp, workshop allocation/hold, expiry, participant workshop interval references.
- **Acceptance criteria:** Last-seat requests allocate at most one hold; first-come ordering uses server-valid request; a new hold cannot overlap an existing active hold or confirmed booking, including concurrent hold/confirmation transactions; adjacent intervals allowed absent an approved transfer buffer; retries do not duplicate allocation.
- **English/Arabic:** Bilingual hold/expiry/conflict instructions with labelled time zone; English notifications.
- **Accessibility:** Focused conflict errors, clear hold status/time without color or countdown dependence, keyboard recovery.
- **Security/RLS:** Owner-only requests; server-authoritative capacity/deadline/identity; participants cannot edit hold order or expiry.
- **Audit/email:** Record allocation/release reason and actor/job; durable English hold/expiry messages after commit.
- **Automated tests:** Concurrent last seat, hold versus active hold, hold versus existing confirmed booking, concurrent hold/confirmation overlap, adjacent boundaries, retry, deadline race and RLS denials.
- **Manual UAT:** Simultaneous synthetic requests; verify first-come ordering and capacity recovery after expiry.
- **Release gate:** REL-02, REL-06; AT-05 and actual hold policy.
- **Owner type:** Backend/database engineer with workshop lead.
- **TBD blocked:** Synthetic transactions unblocked; live hold durations/capacity/transfer buffer policy blocked by CFG-07.

<a id="bl-wks-03"></a>

## BL-WKS-03 — Approve and confirm bookings only when all prerequisites hold

- **Source IDs:** WKS-02, WKS-03, WKS-06, PAY-03, REG-03, API-02, ROL-07
- **Status:** Planned.
- **Purpose:** A participant receives a workshop place only after manual approval, valid financial completion and confirmed conference registration.
- **Scope:** Scoped approval/rejection/authorized extension, final confirmation transaction and read-only My Bookings status/detail; recheck allocation, conference entitlement and interval conflict at confirmation.
- **Exclusions:** Full-discount auto-approval, personal schedule builder, bypass via payment success and unapproved extensions.
- **Dependencies:** BL-WKS-02; BL-REG-04; BL-PAY-02, BL-PAY-04; [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07).
- **Roles:** Participant; Registration/Workshop Administrator; Finance controls financial evidence separately.
- **States/transitions:** Held request → manual approval → payment/valid zero-value order → confirmed booking only with confirmed conference registration; rejection/expiry releases hold.
- **Data touched:** Booking, approval actor/time, extension reason/deadline, order reference and conference entitlement reference.
- **Acceptance criteria:** Each missing prerequisite blocks confirmation; a full discount still needs manual approval; late payment/conflict cannot bypass seat validation; My Bookings displays own actual records only.
- **English/Arabic:** Complete participant/organizer booking UI in both locales; scientific content, if linked, remains LTR.
- **Accessibility:** Clear prerequisite explanation, keyboard reason/extension form, meaningful pending/confirmed status and mobile targets.
- **Security/RLS:** Assigned approver permission and MFA; participant cannot forge conference confirmation/payment or approve own request.
- **Audit/email:** Approval/rejection/extension audit; deduplicated English booking outcome email; rollback sends no success notification.
- **Automated tests:** Prerequisite matrix, zero-value pending approval, expired hold, simultaneous conflicting confirmation and role/owner negatives.
- **Manual UAT:** Approve and confirm synthetic bookings with missing conference admission and valid zero-value payment.
- **Release gate:** REL-02, REL-06; approvers, payment and hold rules configured.
- **Owner type:** Full-stack engineer with workshop and registration leads.
- **TBD blocked:** Synthetic prerequisite enforcement unblocked; live operations inherit CFG-01/02/07.

<a id="bl-wks-04"></a>

## BL-WKS-04 — Offer released seats through an eligible time-limited waitlist

- **Source IDs:** WKS-05, WKS-06, WKS-04, API-02, API-03, AT-06
- **Status:** Planned.
- **Purpose:** Participants can join a full workshop's waitlist without being charged and accept a released place fairly.
- **Scope:** Waitlist entry, ordered eligible offer job, expiring offer acceptance/decline and progression; revalidate eligibility, entitlement, conflicts and capacity at acceptance.
- **Exclusions:** Charging on waitlisting/offering, automatic confirmation, treating overlapping waitlist interest as an active booking and invented offer duration.
- **Dependencies:** BL-WKS-02, BL-WKS-03; durable jobs/email; [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07).
- **Roles:** Participant; Registration/Workshop Administrator; authorized offer worker.
- **States/transitions:** Waitlisted → offered → accepted then required approval/payment/confirmation; expired/declined offer → next eligible person.
- **Data touched:** Waitlist entry/order, offer/deadline, acceptance reference, hold and notification job.
- **Acceptance criteria:** Offer alone grants no booking/charge; one valid offer consumes one available allocation; stale offers cannot be accepted; overlap permitted on waitlist but cannot survive confirmation; duplicate jobs produce one active offer.
- **English/Arabic:** Bilingual offer, expiry and conflict recovery views; English email links return to locale-aware UI.
- **Accessibility:** Clear offer deadline/time zone, keyboard accept/decline and status announcements without countdown dependence.
- **Security/RLS:** Only intended account can accept its current offer; staff access scoped; client cannot reorder queue or extend offer.
- **Audit/email:** Preserve offer/accept/expire/decline actions with no phantom notifications on rollback; English offer/reminder/outcome jobs deduplicated.
- **Automated tests:** Competing workers/acceptance, expired offer, missed email, changed eligibility/conflict, skip ineligible candidate and unauthorized acceptance.
- **Manual UAT:** Release a synthetic seat, expire first offer and accept next; inspect financial and approval steps remain pending.
- **Release gate:** REL-02, REL-06; AT-06 and offer policy approval.
- **Owner type:** Backend/full-stack engineer with workshop lead.
- **TBD blocked:** Synthetic waitlist engine unblocked; live offer windows and detailed eligibility policy blocked by CFG-07.

<a id="bl-wks-05"></a>

## BL-WKS-05 — Manage staff-reserved seats without hiding capacity

- **Source IDs:** WKS-01, WKS-04, WKS-07, ROL-07, ADM-04, API-02
- **Status:** Planned.
- **Purpose:** Operations can reserve approved seats while maintaining accurate capacity and an accountable release deadline.
- **Scope:** Restricted reservation/release actions, reason/deadline validation, expiry worker and aggregate availability integration.
- **Exclusions:** Invisible capacity, indefinite reservation, approval beyond capacity and fabricated reserved-seat quotas.
- **Dependencies:** BL-WKS-01, BL-WKS-02; BL-AUTH-01; [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07).
- **Roles:** Scoped Registration/Workshop Administrator; authorized reservation expiry job.
- **States/transitions:** Available capacity → reasoned timed reservation → released or explicitly reconciled allocation; no implicit participant confirmation.
- **Data touched:** Reserved-seat allocation, reason, creator, release deadline, workshop capacity and audit event.
- **Acceptance criteria:** Reserved seats count against availability; concurrent reservation/request cannot exceed capacity; reason/deadline required; repeated release changes capacity once.
- **English/Arabic:** Bilingual administrative labels, deadline interpretation and public aggregate status.
- **Accessibility:** Keyboard reservation form/table, non-color allocation classes and actionable conflict errors.
- **Security/RLS:** Assigned workshop scope and MFA; ordinary editors, Finance and participants cannot reserve seats.
- **Audit/email:** Audit reservation, release, extension and reason; no participant email unless their existing allocation is explicitly affected.
- **Automated tests:** Last-seat race with booking, missing reason/deadline, duplicate release, scope denial and public projection privacy.
- **Manual UAT:** Reserve/release synthetic seats and verify public availability and staff evidence match.
- **Release gate:** REL-02, REL-06; reservation authority/deadline policy approved.
- **Owner type:** Backend engineer with workshop operations lead.
- **TBD blocked:** Synthetic reservation controls unblocked; live quotas/authority/deadlines blocked by CFG-07.

<a id="bl-wks-06"></a>

## BL-WKS-06 — Resolve cancellation, removal and schedule/capacity changes

- **Source IDs:** WKS-07, WKS-06, WKS-04, PAY-07, EML-01, API-02
- **Status:** Planned.
- **Purpose:** Affected participants receive explicit resolution when a workshop change invalidates their booking or creates a conflict.
- **Scope:** Versioned workshop edit/cancellation action, impact preview, capacity-floor protection, conflict-resolution record and event dispatch to waitlist/refund workflows according to approved rules.
- **Exclusions:** Silent conflicting bookings, reducing capacity below allocations without reconciliation and declaring refunds automatically paid.
- **Dependencies:** BL-WKS-03, BL-WKS-04, BL-WKS-05; BL-PAY-06; [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02), [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07).
- **Roles:** Registration/Workshop Administrator; Finance for financial consequences; Participant sees own impact.
- **States/transitions:** Proposed change → validated impact/resolution → committed change; conflicting affected booking → explicit resolution workflow; authorized cancellation → released allocation.
- **Data touched:** Workshop revision, impacted booking/hold, resolution reason, allocation release and financial consequence reference.
- **Acceptance criteria:** Lowering capacity below allocations is rejected absent explicit reconciliation; overlap uses strict interval rule; changed schedules never silently retain conflicts; replay cannot double-release or duplicate email.
- **English/Arabic:** Bilingual impact notices and resolution UI; English affected-user email.
- **Accessibility:** Accessible impact table and confirmation, explicit previous/new times and keyboard recovery.
- **Security/RLS:** Scoped mutation permission; preview exposes only necessary affected data; Finance and workshop roles retain separate powers.
- **Audit/email:** Audit old/new values, actor/reason and resolutions; durable affected-user email on committed cancellation/time change.
- **Automated tests:** Capacity reduction, adjacent/overlapping time edits, concurrent booking/edit, duplicate cancellation and rollback notifications.
- **Manual UAT:** Move synthetic workshop into a conflict and resolve according to approved policy; inspect participant and finance records.
- **Release gate:** REL-02, REL-06; published cancellation/change consequences required.
- **Owner type:** Full-stack engineer with workshop and finance leads.
- **TBD blocked:** Synthetic impact checks unblocked; live cancellation/refund/resolution policy blocked by CFG-02/07.
