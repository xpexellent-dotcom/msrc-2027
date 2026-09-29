# Reporting

Scoped operational reporting is delivered alongside each operational milestone, not deferred until the event ends. Final statistics follow the archive/privacy release. Counts, searches, exports and audit inspection have distinct authorization rules.

<a id="bl-rpt-01"></a>

## BL-RPT-01 — Add scoped dashboard/search query boundaries

- **Source IDs:** ADM-01, ADM-02, ROL-01, ROL-07, ROL-08, ROL-09, SCP-05, SEC-02
- **Status:** Planned; populated projections depend on each module.
- **Purpose:** Staff can find the records needed for their duties without obtaining general administrator access to all data.
- **Scope:** Reusable scoped dashboard/query contract plus a first registration-state projection; declare each later domain projection as a bounded extension delivered with that module. Required coverage: verified accounts, orders/exceptions, submissions by track/specialty/stage, reviews, accepted work, holds/occupancy/waitlists, attendance, email failures, sponsor inquiries and certificate readiness.
- **Exclusions:** One giant all-domain implementation PR, public search, attendee/abstract directories, profile export and scanner access to broad lists.
- **Dependencies:** BL-AUTH-01; BL-SEC-01; BL-REG-01 first projection; domain services for subsequent projections.
- **Roles:** Duty-scoped scientific/registration/workshop/Finance/content/PR staff; Super Admin; Check-in Staff only assigned minimal entry views.
- **States/transitions:** Read-only projection of current source states; search/filter never performs mutation. Consequential bulk changes stay in their own authorized feature with confirmation.
- **Data touched:** Allowlisted projections/aggregate counts and permitted filter fields; no new canonical operational state.
- **Acceptance criteria:** API applies scope before counts/search; no unauthorized result/count leakage; pagination/filter allowlists validated; first registration projection shows correct states; later domain coverage is tracked explicitly.
- **English/Arabic:** Non-review organizer dashboards bilingual/RTL; reviewer/faculty assessment remains English-only.
- **Accessibility:** Semantic tables/headings, keyboard filters, explicit empty/error/loading states and accessible pagination.
- **Security/RLS:** Projection grants and row filters tested per role/edition/track; user metadata never selects permissions.
- **Audit/email:** Read queries do not emit participant emails; privacy-minimized access/abuse logging; consequential actions audited by their owning service.
- **Automated tests:** Role-by-projection allow/deny matrix, count inference, injection/filter limits, pagination and stale-role denial.
- **Manual UAT:** Each staff role compares allowed dashboard fields with actual duties; test mobile/Arabic.
- **Release gate:** Applicable module REL gate and REL-06; no dashboard grants implied by generic administrator label.
- **Owner type:** Full-stack/database engineer with each operational owner.
- **TBD blocked:** Synthetic first projection unblocked; future domain data/role assignments depend on module configuration, not invented reporting permissions.

<a id="bl-rpt-02"></a>

## BL-RPT-02 — Generate protected CSV/Excel exports with explicit personal-data authority

- **Source IDs:** ADM-03, ROL-10, DAT-04, API-03, SEC-05, PRV-03, AT-17
- **Status:** Planned.
- **Purpose:** Authorized staff can obtain necessary reports while preventing broad personal-data extraction and malicious spreadsheet formulas.
- **Scope:** First export slice for minimal registration operations; explicit field/export-class allowlists, durable generation, formula-injection neutralization, protected expiring delivery and configured cleanup; extend templates only with the respective module's reviewed scope.
- **Exclusions:** Full profile export for generic admins, public files, unrestricted SQL/query builder and invented retention durations.
- **Dependencies:** BL-RPT-01; durable jobs/private storage; BL-AUTH-01; privacy export/retention policy from [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).
- **Roles:** Super Admin exclusively for full personal-data exports; other roles only explicitly authorized minimal operational/aggregate views.
- **States/transitions:** Authorized request → queued generation → ready private file or recoverable failure → expired/cleaned delivery; queued is not completed.
- **Data touched:** Export request/scope/field definition, minimal source projection, file/job and delivery/cleanup metadata.
- **Acceptance criteria:** Recheck grants during generation/download; export cannot exceed caller's rows/fields; hostile cell prefixes remain inert in CSV and Excel; link expiry enforced; failed/repeated jobs do not publish duplicate or partial files.
- **English/Arabic:** Bilingual request/status UI and agreed column labels; Arabic data/encoding preserved; source scientific text remains unchanged.
- **Accessibility:** Accessible export controls/progress and usable table alternative where appropriate; file column headings meaningful.
- **Security/RLS:** Duty-specific permission plus server/database scope; revoked role cannot use old link; protected expiring access; no arbitrary requested profile columns.
- **Audit/email:** Audit requester, purpose/scope, result, download where applicable; email only safe English availability notice if configured, never bulk data attachment by default.
- **Automated tests:** Formula injection including whitespace/control prefixes, role/field negatives, revoked grant, expired link, job retry and cleanup.
- **Manual UAT:** Open synthetic hostile/Arabic export in supported spreadsheet tools and verify minimal role views.
- **Release gate:** Relevant module gate, REL-06 and privacy export/retention approval.
- **Owner type:** Backend/security engineer with privacy/operations owner.
- **TBD blocked:** Synthetic engine unblocked; real export purpose/fields/retention and role grants require CFG-09/11.

<a id="bl-rpt-03"></a>

## BL-RPT-03 — Inspect immutable consequential-action audit records

- **Source IDs:** ADM-04, ADM-05, ROL-10, ROL-12, API-01, SEC-06
- **Status:** Planned.
- **Purpose:** Super Admins can reconstruct consequential actions without ordinary administrators editing their own audit trail or exposing secrets.
- **Scope:** Audit event contract, append-only controlled write path and Super Admin-only paginated inspection; first approval event integration, with role changes, overrides, decisions, downloads, refunds, consent, exports and corrections integrated by their owning slices.
- **Exclusions:** One PR reimplementing every business action, editable user activity feed, product changelog as audit substitute and feedback payload/identity linkage.
- **Dependencies:** BL-AUTH-01; BL-SEC-01; BL-REG-02 first action; privacy/log retention policy and privileged audit access.
- **Roles:** Individually identified acting staff/services append through authorized business operations; Super Admin exclusively inspects audit.
- **States/transitions:** Committed or safely recorded denied consequential action → immutable event; no ordinary update/delete transition.
- **Data touched:** Actor, action, target, timestamp, result, necessary previous/new values, required reason and event provenance.
- **Acceptance criteria:** Required fields and reason captured for first approval; rolled-back mutation cannot look successful; ordinary admin cannot edit/delete/read audit; redact passwords/OTPs/secrets/card/manuscript/profile excess; survey answers never enter identity-linked audit.
- **English/Arabic:** Bilingual Super Admin inspection labels/filters; retained event codes stable across locales.
- **Accessibility:** Keyboard pagination/filtering, semantic before/after table and readable timestamps/status.
- **Security/RLS:** Narrow append interface and Super Admin read grants; protect integrity from client inserts/updates; retention/deletion uses separately controlled policy.
- **Audit/email:** Audit viewing/export actions under approved policy; no participant email from audit browsing; audit storage failures are visible, not silently ignored.
- **Automated tests:** Append/read/edit/delete permission matrix, reason enforcement, rollback result, redaction, tampered actor and identity-linked feedback exclusion.
- **Manual UAT:** Super Admin reconstructs a synthetic approval/override; ordinary administrator attempts access/modification.
- **Release gate:** REL-06 with each consequential feature; retention/access configuration before real data.
- **Owner type:** Backend/security engineer with accountable Super Admin/privacy owner.
- **TBD blocked:** Synthetic contract unblocked; named custodians and log retention/access policy require CFG-09/11.

<a id="bl-rpt-04"></a>

## BL-RPT-04 — Publish approved non-identifying final conference statistics

- **Source IDs:** ADM-03, ARC-01, PRV-05, PRV-06, CRT-02, CMS-04
- **Status:** Planned.
- **Purpose:** Organizers can report conference outcomes and preserve approved public statistics without turning private records into a directory.
- **Scope:** Versioned aggregate calculation/report from authorized domain projections, privacy review of small groups/metadata, approved bilingual publication snapshot and CSV/Excel aggregate output through BL-RPT-02.
- **Exclusions:** Public attendee/abstract lists, identifying survey joins, invented suppression threshold, fabricated attendance claims and indefinite raw-data retention.
- **Dependencies:** BL-RPT-01, BL-RPT-02; relevant final domain states; archive publication workflow; [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09), [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12).
- **Roles:** Authorized reporting administrator prepares; privacy/content approvers approve public projection; public visitor reads approved aggregates.
- **States/transitions:** Draft aggregate report → reviewed/approved publication snapshot → public aggregate; later correction creates a new version with retained provenance.
- **Data touched:** Aggregate counts, approved denominator/definition, snapshot/version, publication evidence; feedback analyzed only in unlinked form.
- **Acceptance criteria:** Counts distinguish registrations, financial orders, attendance and certificates; no participant/respondent re-identification through small groups or joins; publish only approved aggregates; underlying personal retention is not extended by the report.
- **English/Arabic:** Bilingual labels/method notes and RTL tables; clear definitions rather than untranslated abbreviations.
- **Accessibility:** Semantic tables/text equivalents for charts, sufficient contrast and keyboard export access.
- **Security/RLS:** Private aggregate preparation scoped; public endpoint only approved snapshot; raw records and draft report inaccessible anonymously.
- **Audit/email:** Audit calculation version, review/publication/correction actor; no participant email by default and no feedback payload in audit.
- **Automated tests:** Known synthetic denominators, source-state separation, unpublished projection denial, forbidden personal fields and formula-safe aggregate export.
- **Manual UAT:** Reporting/privacy owners verify sample totals, disclosure risk and bilingual public rendering.
- **Release gate:** Archive/public-content approval plus REL-06; retention/aggregation policy approved.
- **Owner type:** Data/full-stack engineer with reporting/privacy/content owners.
- **TBD blocked:** Synthetic aggregation unblocked; public fields/aggregation privacy rules/final content blocked by CFG-09/12.
