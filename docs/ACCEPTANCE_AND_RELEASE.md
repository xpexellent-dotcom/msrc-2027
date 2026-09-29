# Acceptance and release evidence

This file preserves S1 section 22 release gates. The complete eighteen acceptance scenarios are in [REQUIREMENTS.md](REQUIREMENTS.md) and source section 24. No application check was performed during handoff compilation.

## Current release gates

REL-01. Public-site gate: approved branding/core content, bilingual participant navigation, accessibility checks, working contact/privacy/terms, secured CMS, verified ownership, monitoring, and tested backups. An informational public launch does not authorize opening unfinished participation workflows.

REL-02. Registration/workshop gate: prices, capacity, manual approvers, hold/payment windows, discounts, named KAU collection owner and verified integration/reconciliation contract, refund rules, tested email, race-safe allocation, and valid-ticket enforcement. All critical payment/approval failure scenarios must pass before accepting real money or issuing tickets. Selecting P1 does not bypass proof of the actual collection and confirmation procedure.

REL-03. Submission/review gate: final field schemas, study-stage templates, ethics/similarity policy, upload security, submission limits, reviewed rubric/quorum, reviewer anonymity, revision logic, and decision release controls. AI production use additionally requires provider/privacy approval and a recorded assessment evaluation; manual review remains the failure fallback.

REL-04. The hackathon's two tracks, solo/team participation, five-member maximum, and answered event structure may now guide development. Remaining eligibility wording, cross-mode membership rules, finalist-capacity accounting, source conflicts, form/file details, deadlines, and public terms must be resolved before the affected stages open. 3MT retains its separate unresolved settings. Keep clear not-yet-open states and do not replace unapproved rubric/fee/prize options with invented values.

REL-05. Event gate: correct program/rooms, valid rosters/tickets, trained staff, device tests, daily check-in and workshop completion-sign-off procedures, hackathon compulsory-activity evidence, judging configuration, and rehearsed outage handling. Certificate gate: approved full two-day/workshop templates, survey question sets/deadlines, tested S2 unlinking and completion handling, retention/public verification policy, administrator release, and correction/revocation tests. Ordinary eligibility is defined in CRT-01, not deferred as an unknown attendance threshold. Role/competition certificates require separate approval.

REL-06. Definition of done for each feature: requirement implemented; permission and state-transition tests passed; relevant Arabic/English/accessibility checks passed; failure paths tested; audit/email behavior verified; staging acceptance recorded; operational owner/runbook assigned; and production configuration verified. A successful demonstration of the happy path alone is insufficient.

## Evidence record for each gate

| Requirement | Status | Actual evidence | Owner | Remaining action |
|---|---|---|---|---|
| Applicable REL / AT ID | NOT TESTED | Add command/result, preview, configuration or approval record | Assign | State concrete next check |

Use PASS only after actual execution/inspection. Use FAIL for an observed defect, BLOCKED for a named dependency, and NOT TESTED when no check has run. Record the revision, environment, data type, date, and operator. A mock proves behavior under its simulated contract; it does not establish real KAU payment integration.

## Acceptance map

| Source test | Area |
|---|---|
| AT-01 | Identity, verification, recovery and MFA |
| AT-02 | Authorization and confidentiality |
| AT-03 | Approval and admission entitlement |
| AT-04 | Actual KAU confirmation/reconciliation and refunds |
| AT-05 | Concurrent seat allocation and release |
| AT-06 | Waitlists and stale offers |
| AT-07 | Abstract eligibility, body limit and PI limit |
| AT-08 | Distinct upload stages, security and snapshots |
| AT-09 | Review conflicts, quorum and advisory assessment |
| AT-10 | Published decisions and revisions |
| AT-11 | Winner-only supervisor requirement |
| AT-12 | Hackathon solo/team rules and independent 3MT |
| AT-13 | Daily/activity scanning and completion evidence |
| AT-14 | Certificate eligibility and feedback unlinking |
| AT-15 | Content approval, consent and accessible bilingual UI |
| AT-16 | Retry behavior, queues, load and reliability |
| AT-17 | Database/object restore, requests and retention |
| AT-18 | Organizational ownership, access and annual handover |

## Proportionate development verification

For a code slice, run the relevant build/type/lint checks and tests needed to resolve its concrete risks. Permission-sensitive work needs denied-access tests. Capacity/payment work needs concurrency and retry tests. Submission/review work needs versioning/anonymity tests. A small copy or style change normally needs targeted content/visual checks. Complete all applicable release gates before opening the affected workflow.

## Release record

```markdown
Release / exact revision:
Scope and workflow flags:
Approver / operational owner:
Environment and actual target:
Completed REL / AT evidence:
Outstanding limitations:
Migrations and configuration changes:
Smoke-check results:
Monitoring and incident coverage:
Rollback / data reconciliation:
Next review:
```

A public informational release does not open registration, collection, submissions, or other incomplete operational flows. The full selected scope remains on the roadmap.
