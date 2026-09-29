# Attendance

M9 implementation; evidence contracts and retention must be agreed before dependent collection opens. A1 is confirmed: one valid check-in on each day, with separate workshop and competition evidence; ordinary attendance does not measure hours.

<a id="bl-att-01"></a>

## BL-ATT-01 — Define immutable daily/activity evidence and readiness queries

- **Source IDs:** CHK-03, CHK-04, DAT-03, DAT-04, CRT-01, SCP-07, TIM-01
- **Status:** Planned.
- **Purpose:** Downstream eligibility uses trustworthy distinct day/activity records rather than a single attendance checkbox.
- **Scope:** Attendance event schema, unique credit constraint, server-time/scanner provenance and participant/authorized staff evidence read model; contract for scan command BL-CHK-03.
- **Exclusions:** Checkout, attendance hours, one-day certificate pathway and automatic credit for registration/payment or co-authorship.
- **Dependencies:** BL-SEC-01; registration/ticket identifiers; [DR-CFG-01](DECISION_REQUIRED.md#dr-cfg-01) dates; [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09) retention.
- **Roles:** Participant reads own permitted evidence; scoped Registration/Workshop Administrator; assigned scanner via validated service.
- **States/transitions:** No credit → validated immutable day/activity event; later correction overlays history rather than deleting the original.
- **Data touched:** Participant, entitlement/activity/day references, server timestamp, scanner identity, result and correction link.
- **Acceptance criteria:** Day-one and day-two evidence are distinct; duplicate same-day credit impossible; workshop and compulsory competition events never substitute for general-day evidence; calculated readiness names missing evidence.
- **English/Arabic:** Participant/organizer evidence views bilingual with explicit Asia/Riyadh labels.
- **Accessibility:** Semantic evidence list with written missing/present states; screen-reader-friendly timestamps.
- **Security/RLS:** Own/scoped rows only; deny direct participant creation and scanner modification of past events.
- **Audit/email:** Original provenance immutable; corrections audited separately; no attendance email requirement is invented.
- **Automated tests:** Unique participant/day/activity, missing-day combinations, separated workshop records, unauthorized writes and edition isolation.
- **Manual UAT:** Inspect synthetic zero/one/two-day records and confirm workshop credit cannot fill a missing conference day.
- **Release gate:** REL-05/06; approved collection/retention design before real attendance data.
- **Owner type:** Database/backend engineer with operations and privacy leads.
- **TBD blocked:** A1 evidence implementation unblocked; live dates/retention require CFG-01/09, not a new attendance threshold.

<a id="bl-att-02"></a>

## BL-ATT-02 — Record authorized workshop completion independently of check-in

- **Source IDs:** CHK-03, CRT-01, DAT-03, API-01, ROL-07, CFG-08
- **Status:** Planned.
- **Purpose:** Workshop certificates require actual approved completion evidence in addition to booking and entry.
- **Scope:** Completion sign-off record and scoped roster/action for approved instructor/organizer, preserving separate workshop check-in and booking references.
- **Exclusions:** Treating a scan as completion, inventing instructional thresholds, requiring full two-day certificate and granting instructors broad administrator rights.
- **Dependencies:** BL-ATT-01; BL-WKS-03; BL-CHK-03; [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08) sign-off authority/procedure.
- **Roles:** Explicitly authorized instructor/organizer within assigned workshop; Participant reads own evidence; Registration/Workshop Administrator within grant.
- **States/transitions:** No completion evidence → authorized signed completion record; correction requires BL-ATT-03 with retained history.
- **Data touched:** Workshop booking/check-in references, completion sign-off, signer, time and approved procedure version.
- **Acceptance criteria:** Check-in alone does not mark completion; unauthorized instructor cannot sign another workshop; repeated sign-off gives one credit; eligibility can distinguish missing booking/check-in/completion/survey.
- **English/Arabic:** Bilingual sign-off UI and participant evidence; instructor names kept as approved content.
- **Accessibility:** Keyboard roster selection/action, clear reason/result feedback and confirmation for consequential bulk sign-off if approved.
- **Security/RLS:** Explicit activity-scoped grant and MFA; participant, unrelated instructor and general check-in staff cannot sign completion.
- **Audit/email:** Audit signer/time/result and correction reasons; no automatic certificate/email until independent release gate.
- **Automated tests:** Missing check-in/booking handling under approved procedure, duplicate sign-off, cross-workshop denial and eligibility separation.
- **Manual UAT:** Authorized instructor signs a synthetic workshop roster and verifies unsigned/check-in-only participants remain ineligible.
- **Release gate:** REL-05/06; named sign-off owner and procedure approved.
- **Owner type:** Full-stack engineer with workshop operations lead.
- **TBD blocked:** Schema and denied-access tests unblocked; actual sign-off validation/procedure blocked by CFG-08.

<a id="bl-att-03"></a>

## BL-ATT-03 — Correct attendance with preserved history and scoped live counts

- **Source IDs:** CHK-04, CHK-05, ADM-01, ADM-04, ROL-07, ROL-08, AT-13
- **Status:** Planned.
- **Purpose:** Authorized operations staff can repair documented errors and monitor attendance without erasing the original scan or exposing broad participant data.
- **Scope:** Reasoned correction command, optimistic version/concurrency protection, effective-evidence query and scoped activity/day counts; controlled fallback reconciliation integration.
- **Exclusions:** Deleting original events, scanner self-escalation, changing certificate criteria and unrestricted personal-data exports.
- **Dependencies:** BL-ATT-01, BL-ATT-02; BL-AUTH-01; approved correction authority/procedure in [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08).
- **Roles:** Authorized Registration/Workshop Administrator or explicitly approved exceptional authority; Check-in Staff retain scan-only duties.
- **States/transitions:** Original recorded evidence → appended reasoned correction → recalculated effective credit/count; conflicting correction rejected for explicit resolution.
- **Data touched:** Attendance event, correction original/new values, actor/time/reason, derived scoped count and eligibility invalidation event.
- **Acceptance criteria:** Original record remains inspectable; correction requires reason and authorized scope; duplicate/conflicting offline records cannot double-credit; dependent eligibility recalculates without silently issuing/revoking certificates.
- **English/Arabic:** Bilingual comparison/reason/status UI and locale-aware timestamps.
- **Accessibility:** Accessible before/after table, reason labels, confirmation and explicit resolution error.
- **Security/RLS:** Restricted correction grants and MFA; audit inspection remains Super Admin-only; counts respect scope and reveal no attendee directory.
- **Audit/email:** Immutable correction event; participant communication only under approved correction procedure, through English email; no raw survey data involved.
- **Automated tests:** Missing reason, role/scope denial, stale version, retry, count recalculation and duplicate fallback correction.
- **Manual UAT:** Correct a synthetic wrong-day record, preserve its original and inspect certificate-readiness impact.
- **Release gate:** REL-05/06; correction/outage rehearsal and authorization approved.
- **Owner type:** Backend/full-stack engineer with operations lead.
- **TBD blocked:** Synthetic correction mechanics unblocked; live correction authority and notification procedure blocked by CFG-08.
