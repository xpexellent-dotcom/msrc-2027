# QR / check-in

Ticket issuance, access validation and revocation belong to M7 / REL-02 before admission opens. The staff scanning interface and rehearsals belong to M9 / REL-05. Delaying scanning must not delay secure ticket semantics.

<a id="bl-chk-01"></a>

## BL-CHK-01 — Issue, retrieve, reissue and revoke opaque admission credentials

- **Source IDs:** CHK-01, REG-07, ROL-02, DAT-03, DAT-04, SEC-01, AT-03
- **Status:** Planned; required before registration launch.
- **Purpose:** A confirmed participant receives a credential that proves an active entitlement without exposing personal or financial information.
- **Scope:** Ticket/credential migration, cryptographically unpredictable credential generation, owner-only delivery, rotation and revocation; integrate the registration-confirmed event without issuing on payment alone.
- **Exclusions:** Sequential references as secrets, embedded email/phone/licence/card data, public ticket lists and scanning UI.
- **Dependencies:** BL-REG-02 approval/allocation contract; BL-PAY-04 financial evidence; BL-SEC-01; agreed confirmation-event schema. Build with synthetic confirmed entitlements before registration producer integration.
- **Roles:** Participant retrieves own ticket; scoped authorized operations can reissue/revoke; server issues from confirmed entitlement.
- **States/transitions:** Confirmed active entitlement → current credential; reissue → old credential invalid/new current credential; revocation/suspension → no valid admission.
- **Data touched:** Entitlement, credential identity/protected token representation, issuance/rotation/revocation history and owner reference.
- **Acceptance criteria:** One current credential per intended entitlement; repeated issue events do not multiply admission rights; pending/rejected/unpaid/cancelled/expired/revoked/suspended entitlement cannot validate; QR contains no unnecessary personal data.
- **English/Arabic:** Bilingual ticket/status/help, readable reference in RTL; English issuance email.
- **Accessibility:** Keyboard ticket retrieval, accessible validity description and authorized manual-lookup alternative to QR/camera use.
- **Security/RLS:** Owner/scoped staff only; deny credential enumeration/cross-account fetch; protected delivery and logs exclude reusable secrets.
- **Audit/email:** Audit issue/reissue/revoke actor/reason; durable English availability notice after commit without leaking token into diagnostics.
- **Automated tests:** Entitlement matrix, issue retry, token unpredictability/uniqueness checks, old-token rejection, suspension and RLS negatives.
- **Manual UAT:** Confirm a synthetic participant, rotate ticket and verify old/new results; inspect encoded contents.
- **Release gate:** REL-02, REL-06, AT-03; BL-REG-04 confirmation producer integration must pass before live ticket issuance.
- **Owner type:** Backend/security engineer with registration lead.
- **TBD blocked:** Synthetic lifecycle unblocked; live issuing inherits CFG-01/02 and approved revocation consequences.

<a id="bl-chk-02"></a>

## BL-CHK-02 — Provide an accessible assigned-entry scanning interface

- **Source IDs:** CHK-02, ROL-08, ROL-12, ACC-01, LOC-01, SEC-01
- **Status:** Planned.
- **Purpose:** Named check-in staff can admit attendees from a phone while seeing only entry-relevant information.
- **Scope:** Responsive camera permission/scan interface and authorized manual reference lookup; assignment context; clearly distinct valid, duplicate, wrong activity/day, pending/unpaid, cancelled/revoked and unknown outcomes.
- **Exclusions:** Unrestricted attendee browsing, financial/submission/licence access, admission approval and promised full offline sync.
- **Dependencies:** BL-CHK-01, BL-CHK-03; BL-AUTH-01 with MFA; assigned entry points/activities from event operations.
- **Roles:** Individually identified Check-in Staff scoped to assigned day/workshop; operations trainer.
- **States/transitions:** Ready → permission/lookup/scan in progress → explicit result or recoverable error; UI cannot grant entitlement.
- **Data touched:** Minimal attendee name, registration reference, ticket validity and assigned check-in result; camera data not retained as attendee media.
- **Acceptance criteria:** Camera denial still permits authorized manual lookup; wrong assignment blocks action; repeated scans clearly report existing credit; timeout does not claim success; no unrelated participant data returned.
- **English/Arabic:** Full bilingual staff UI/RTL with readable ticket references.
- **Accessibility:** Keyboard/manual path, labelled camera controls, large touch targets, visible focus and text/audio-independent result announcements.
- **Security/RLS:** MFA and current assignment checked at API/data layer; suspended staff token denied; manual lookup rate limited and minimized.
- **Audit/email:** Persist scan outcome under BL-CHK-03; no per-scan participant email unless later explicitly approved.
- **Automated tests:** Camera-denied/manual path, assignment denial, minimal payload, stale session, duplicate/result announcements and mobile RTL.
- **Manual UAT:** Train staff on approved phones/browsers with camera grant/denial, poor connectivity and printed/digital codes.
- **Release gate:** REL-05, REL-06; device and staff rehearsal required.
- **Owner type:** Frontend/accessibility engineer with check-in operations lead.
- **TBD blocked:** Synthetic UI unblocked; event deployment blocked by CFG-01/08/11 assignment/device/procedure decisions.

<a id="bl-chk-03"></a>

## BL-CHK-03 — Record scans atomically against current entitlement and activity

- **Source IDs:** CHK-02, CHK-03, CHK-04, API-02, DAT-04, ROL-08, AT-13
- **Status:** Planned.
- **Purpose:** Concurrent or retried scans create one correct attendance credit and never admit revoked or wrong-day tickets.
- **Scope:** Idempotent scan command, current entitlement/assignment checks, server-time result recording and uniqueness per participant/activity/day; preserve unsuccessful scan outcome safely.
- **Exclusions:** Client-authoritative date/identity, cross-day credit, checkout/hour tracking and refund/approval powers for scanners.
- **Dependencies:** BL-CHK-01; BL-ATT-01 evidence schema; staff assignment/MFA; configured event dates and activity definitions.
- **Roles:** Assigned Check-in Staff; server scan service.
- **States/transitions:** Valid current entitlement + correct activity → one attendance event; duplicate → already checked in; invalid/wrong scope → denial without attendance credit.
- **Data touched:** Entitlement, scan request/result, participant/activity/day event, server time and scanner identity.
- **Acceptance criteria:** Simultaneous devices yield one credit; duplicate request returns stable result; revocation race cannot create an unauthorized admission under defined transaction boundary; a day-one scan cannot credit day two.
- **English/Arabic:** Stable result codes map to translated staff messages; identifiers stay directionally readable.
- **Accessibility:** API result supports explicit text outcomes and recoverable references for the accessible scanner UI.
- **Security/RLS:** Server/database validate current grants and entitlement; scanner cannot edit past events, admit another activity or enumerate broad rosters.
- **Audit/email:** Retain scanner, entitlement, activity, server time, result and request identity without exposing ticket secret; no automatic per-scan email.
- **Automated tests:** Concurrent scans, request retry, revoked/old ticket, wrong day/activity, lost-response retry, suspended staff and direct-table denial.
- **Manual UAT:** Two devices scan one synthetic ticket together, then attempt wrong-day and revoked tickets.
- **Release gate:** REL-05, REL-06; AT-13 passing.
- **Owner type:** Backend/database engineer with security and check-in leads.
- **TBD blocked:** Core synthetic service unblocked; live date/activity configuration and outage boundary blocked by CFG-01/08.

<a id="bl-chk-04"></a>

## BL-CHK-04 — Rehearse a minimal controlled outage fallback

- **Source IDs:** CHK-05, CHK-04, ROL-08, PRV-03, SEC-07, REL-05, AT-13
- **Status:** Planned; outage procedure not approved.
- **Purpose:** Operations can handle connectivity failure with an explicit privacy-conscious procedure and later reconciliation.
- **Scope:** Decision-backed minimal fallback roster/manual record format, protected access/expiry, named staff/time capture, duplicate/conflict reconciliation and rehearsal evidence.
- **Exclusions:** Full offline synchronization, real-time cross-device revocation claims while disconnected and unrestricted exported attendee directory.
- **Dependencies:** BL-CHK-01, BL-CHK-03; BL-ATT-03 correction service; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08), privacy/operations approval and incident owner.
- **Roles:** Authorized assigned Check-in Staff; Registration/Workshop Administrator; privacy/operations owner.
- **States/transitions:** Online unavailable → approved controlled fallback → reconciled verified records/corrections after connection returns; unresolved conflicts remain visible.
- **Data touched:** Approved minimal temporary roster, staff/time evidence, reconciliation record, attendance correction; retention/cleanup evidence.
- **Acceptance criteria:** Procedure states revocation limitations and authority; retains minimum data only; reconciliation preserves original entries and resolves duplicates without extra credit; temporary data cleanup follows approved policy.
- **English/Arabic:** Bilingual staff instructions and participant failure/help messages.
- **Accessibility:** Non-camera/non-network assisted path, readable print/mobile fallback and clear staff instructions.
- **Security/RLS:** Fallback restricted to assigned staff/activity; roster protected/expiring with audited access; no broad offline database copy.
- **Audit/email:** Record outage declaration, roster access and correction actors/reasons; no invented mass notification channel.
- **Automated tests:** Reconciliation duplicate/conflict/invalid entitlement cases, expired roster access and cross-assignment denial; procedure-only elements documented as manual checks.
- **Manual UAT:** Disconnect approved devices, execute procedure, restore connection, reconcile and verify data disposal.
- **Release gate:** REL-05, REL-06; rehearsed approved fallback required before event.
- **Owner type:** Operations engineer with check-in, security and privacy leads.
- **TBD blocked:** Reconciliation fixtures unblocked; actual fallback behavior blocked by CFG-08/09 approval.
