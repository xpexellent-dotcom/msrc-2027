# Testing

Feature PRs retain their own unit, authorization, database and failure tests. These issues add shared evidence and cross-feature acceptance journeys; they do not postpone testing until the end. Test fixtures are synthetic. Current local evidence is in [PROGRESS.md](../PROGRESS.md); hosted CI and actual database execution are not implied by a test definition.

<a id="bl-tst-01"></a>

## BL-TST-01 — Make the acceptance inventory executable

- **Source IDs:** AT-01, AT-02, AT-12, REL-06, SEC-02, ROL-12, AUTH-01, AUTH-04.
- **Status:** Partial foundation: application and isolated database jobs passed in PR CI 36734074148 at 9e018ae; operational identity/policy cases remain pending and optional Windows database replay is unverified.
- **Purpose:** Show which requirement has executed evidence and which remains blocked or untested.
- **Scope:** Map each AT requirement to its owning feature tests and artifact; add one verified/unverified/privileged-MFA journey and reusable role/edition/assignment fixtures as authentication becomes available.
- **Exclusions:** Rebuilding existing local smoke tests; declaring all AT requirements passed from one journey; production test data.
- **Dependencies:** Authentication slices; BL-SEC-01; working local Supabase/container runner or approved CI runner.
- **Roles:** Participant, one privileged role, unauthenticated visitor; remaining role fixtures declared for owning suites.
- **States/transitions:** Unverified → verified once; expired/reused code → rejected; revoked privileged grant → denied despite earlier session.
- **Data touched:** Synthetic identity/grant fixtures, requirement-to-test manifest and observed test artifacts.
- **Acceptance criteria:** Manifest differentiates PASS/FAIL/BLOCKED/NOT TESTED; each AT has a concrete suite owner; track fixtures retain unresolved gates rather than using invented production rules.
- **English/Arabic:** Identity journey in both locales; track scientific inputs/reviewer screens preserve English boundaries.
- **Accessibility:** Verification supports paste/autofill and keyboard errors; automated accessibility checks do not claim full WCAG conformance.
- **Security/RLS:** Execute both allowed and denied direct requests, including database policies and old-token revocation.
- **Audit/email:** Assert no secret/code in artifacts; mail stays in console/test sink and evidence distinguishes queued from sent.
- **Automated tests:** Identity journey, role fixture isolation and manifest validity; reuse feature tests for all remaining AT coverage.
- **Manual UAT:** Engineer confirms missing database/runtime evidence is visibly blocked and cannot satisfy release checklist.
- **Release gate:** REL-06 continuously; identity prerequisites before each operational opening.
- **Owner type:** QA/full-stack engineer.
- **TBD blocked:** Local identity tests unblocked once code/runtime exists; production staff/assurance configuration requires [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).

<a id="bl-tst-02"></a>

## BL-TST-02 — Verify the human scientific review release journey

- **Source IDs:** AT-07, AT-08, AT-09, AT-10, AT-11, REV-08, REL-03, ERR-02.
- **Status:** Planned; scientific operational code not verified.
- **Purpose:** Prove finalization, blind review, revision and publication preserve scientific rules and applicant confidentiality.
- **Scope:** One synthetic abstract journey spanning ongoing-study submission, immutable review packet, revision, prepared decision and authorized batch publication; reuse feature-level upload, cap and winner-condition tests.
- **Exclusions:** Invented rubric/quorum values for production; enabling AI; replacing separate competition suites.
- **Dependencies:** Abstract, review/decision and email slices; BL-SEC-03; BL-SEC-04; synthetic configured test rubric explicitly labeled as fixture.
- **Roles:** Participant/PI, assigned reviewer, Scientific Administrator, Super Admin for original evidence.
- **States/transitions:** Draft → finalized → review → revision requested → revised/finalized → prepared decision → published outcome; alternate expired revision stays unfinalized.
- **Data touched:** Synthetic submissions/versions, assignments/reviews, revision deadline, publication batch and test email jobs.
- **Acceptance criteria:** Ongoing work needs no supervisor; identities/original evidence stay hidden from reviewers; missing reviews do not count as zero; unpublished outcome stays private; published revision uses 14-calendar-day default or audited extension.
- **English/Arabic:** Applicant controls/errors bilingual, scientific content and reviewer assessment English/LTR; outcome email English.
- **Accessibility:** Test keyboard validation, file remediation, status announcements and focus after revision errors.
- **Security/RLS:** Assigned reviewer allowed, conflicted/unassigned roles denied; participant cannot read scores/unpublished decisions.
- **Audit/email:** Assert immutable snapshots and publication audit; no email on draft decision or rollback; duplicate release cannot duplicate notification.
- **Automated tests:** Journey plus expired cutoff, concurrent finalize/retry, third-finalization cap, no-supervisor-until-winner and AI-unavailable manual fallback regressions from owning suites.
- **Manual UAT:** Scientific owner reviews anonymized packet/network metadata and compares published applicant result to approved release batch.
- **Release gate:** REL-03; test configuration is not scientific approval.
- **Owner type:** QA engineer with scientific lead.
- **TBD blocked:** Synthetic journey unblocked after feature slices; live stage acceptance requires [DR-CFG-03](DECISION_REQUIRED.md#dr-cfg-03), awards [DR-CFG-04](DECISION_REQUIRED.md#dr-cfg-04).

<a id="bl-tst-03"></a>

## BL-TST-03 — Race the final seat through approval and reconciliation

- **Source IDs:** AT-03, AT-04, AT-05, AT-06, REL-02, API-02, ERR-02.
- **Status:** Planned; operational registration/payment/workshops absent.
- **Purpose:** Demonstrate that retries and concurrent money/seat events cannot overbook or falsely confirm participation.
- **Scope:** One integrated last-seat scenario covering manual approval, payment or valid zero-order completion, hold expiry, waitlist offer and ticket entitlement; exercise the actual approved adapter separately before live opening.
- **Exclusions:** Real charges in automated suites; assuming KAU callbacks; choosing hold durations, currency, refund policy or prices.
- **Dependencies:** Registration, payment, workshop/waitlist and ticket issuance slices; database test runner; mock adapter and approved-contract test harness.
- **Roles:** Participant, Registration/Workshop Administrator, Finance, Check-in Staff for entitlement denial only.
- **States/transitions:** Pending approval → approved awaiting financial completion → confirmed only when both gates pass; expiry/cancellation releases once; late confirmation enters defined exception handling without overbooking.
- **Data touched:** Synthetic registration/order/confirmation, discount, seat hold, booking, offer and ticket records.
- **Acceptance criteria:** Two concurrent claimants obtain at most one last seat; 100% discount still needs approval; stale offer cannot claim; repeated/out-of-order confirmations or refunds cannot duplicate credit/entitlements.
- **English/Arabic:** Equivalent approval, waiting, expiry and payment-exception messages; server amounts independent of locale formatting.
- **Accessibility:** Progress and capacity failures announced without focus loss; retry controls keyboard operable.
- **Security/RLS:** Client price/identity and forged receipt/browser-return confirmation rejected; Finance cannot read confidential submissions.
- **Audit/email:** Audit authority/reason and exact transitions; event deduplication prevents duplicate notices; no email for rolled-back allocation.
- **Automated tests:** Database concurrency barrier tests, repeated/stale official confirmation, unauthorized approval/refund, offer expiry and dependent booking cancellation.
- **Manual UAT:** Finance demonstrates actual authorized confirmation/reconciliation evidence with approved test records; organizer verifies final-seat and refund exception procedures.
- **Release gate:** REL-02 and valid-ticket gate before real money/admission.
- **Owner type:** QA/backend engineer with Finance and operations.
- **TBD blocked:** Synthetic races unblocked after slices; actual contract/configuration tests require [DR-CFG-01](DECISION_REQUIRED.md#dr-cfg-01), [DR-CFG-02](DECISION_REQUIRED.md#dr-cfg-02), [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07).

<a id="bl-tst-04"></a>

## BL-TST-04 — Verify attendance, feedback unlinking and certificate release

- **Source IDs:** AT-13, AT-14, CRT-01, CRT-02, CRT-03, CRT-04, CRT-05, CRT-06, CHK-05, REL-05.
- **Status:** Planned.
- **Purpose:** Prove correct certificate eligibility without creating an identity-to-feedback link.
- **Scope:** One synthetic attendee journey with two daily check-ins and general survey, plus one workshop-only certificate case; inspect response records, completion ledger, jobs, exports and logs for prohibited correlation.
- **Exclusions:** One-day ordinary certificate; hours-based attendance; invented role/competition eligibility; promising full offline synchronization.
- **Dependencies:** Check-in, attendance, survey and certificate slices; approved S2 unlinking design; event outage procedure.
- **Roles:** Participant, assigned Check-in Staff, authorized workshop completion signer, certificate release administrator, privacy reviewer.
- **States/transitions:** Evidence incomplete → eligible/prepared → authorized batch release → issued; correction/revocation/reissue preserves original status; duplicate scan gives no new credit.
- **Data touched:** Synthetic entitlements, activity/correction evidence, separate feedback/completion, eligibility, release/verification records and scrubbed logs.
- **Acceptance criteria:** Both days plus general survey required; workshop pathway works independently with all four requirements; response retries grant completion once without retained linkage; prepared certificates cannot escape release gate.
- **English/Arabic:** Bilingual participant/staff navigation and accessible errors; English transactional email; approved template language configuration preserved.
- **Accessibility:** Manual lookup alternative to camera; phone keyboard/focus; certificate/verification reading order and text validity status.
- **Security/RLS:** Reject wrong-day/workshop, unpaid/revoked tickets and unauthorized sign-off; public lookup exposes only permitted single-certificate fields.
- **Audit/email:** Corrections preserve reason/original evidence; feedback contents and correlatable identity never enter audit; release email deduplicated.
- **Automated tests:** Duplicate/concurrent scans, missing day/sign-off, completion retry, linkage inspection, unauthorized release, verification enumeration and revocation/reissue.
- **Manual UAT:** Operations rehearses selected outage reconciliation on staff phones; privacy reviewer inspects logs/metadata and free-text/small-group risks.
- **Release gate:** REL-05 event and certificate gates separately; attendance criteria are confirmed, not TBD.
- **Owner type:** QA/security engineer with operations and privacy owners.
- **TBD blocked:** Synthetic eligibility cases unblocked; live survey/privacy/outage/template decisions require [DR-CFG-08](DECISION_REQUIRED.md#dr-cfg-08), [DR-CFG-09](DECISION_REQUIRED.md#dr-cfg-09).

<a id="bl-tst-05"></a>

## BL-TST-05 — Record bilingual accessibility acceptance for one release slice

- **Source IDs:** LOC-01, LOC-02, LOC-03, ACC-01, DSN-01, DSN-02, MED-03, AT-15, REL-01, REL-06.
- **Status:** Partial: local homepage/About/design-system Chromium and axe evidence exists; broader browsers, real devices and screen-reader acceptance remain untested.
- **Purpose:** Make each opened user journey usable in both interface languages and with assistive technology.
- **Scope:** Establish a repeatable manual/browser acceptance record, first for homepage/About and navigation; extend the same checklist in each new feature PR.
- **Exclusions:** Claiming full WCAG conformance from axe; redesigning approved layouts; translating scientific assessment or transactional emails into Arabic.
- **Dependencies:** Implemented release slice; approved translations/content; design-system focus/status primitives.
- **Roles:** Visitor, participant, relevant staff; accessibility tester.
- **States/transitions:** Loading, empty, enabled, disabled, validation error, success and unavailable states; locale switch preserves valid entered data where required.
- **Data touched:** Synthetic form entries, screenshots, browser/device matrix and defect records; no personal participant data.
- **Acceptance criteria:** RTL layout and English scientific islands stay correct; keyboard sequence, visible focus, 200% resize/narrow layout, contrast, screen-reader names, reduced motion and media fallback are inspected; unresolved violations block affected release.
- **English/Arabic:** Test equivalent meaning and full RTL, including long Arabic labels, numeric/date presentation and language switch destinations.
- **Accessibility:** WCAG 2.2 AA target; test native scrolling, pause control, poster/low-bandwidth fallback, minimum working touch targets and no camera-only dependency.
- **Security/RLS:** Accessibility fallback cannot reveal unauthorized content or bypass closed server flags; draft preview stays private.
- **Audit/email:** Retain evidence without PII; no production email required for public-page checks.
- **Automated tests:** Axe plus behavioral focus/menu/language/media-state tests; automated results retain manual-review caveats.
- **Manual UAT:** Real phone and representative desktop/browser/screen-reader checks with recorded versions and failures, not an assumed universal pass.
- **Release gate:** REL-01 and REL-06 for every opened slice.
- **Owner type:** Accessibility-focused QA/UI engineer with Arabic content reviewer.
- **TBD blocked:** Existing preview audit unblocked; final brand/assets/translations require [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12).

<a id="bl-tst-06"></a>

## BL-TST-06 — Measure load, queue failure and deadline boundaries

- **Source IDs:** NFR-01, NFR-02, NFR-03, TIM-01, TIM-02, ERR-01, ERR-02, EML-05, API-03, AT-16.
- **Status:** Planned; no measured production load or provider-quota evidence.
- **Purpose:** Replace performance assumptions with repeatable results before opening a busy deadline flow.
- **Scope:** Reusable synthetic load profile with one implemented registration/submission journey; public-browser stress; failure injection for one durable queue; report time boundaries and measured latency/error distributions.
- **Exclusions:** Load against production without authorization; invented demand/capacity; claiming provider SLA equals application availability; real bulk mail.
- **Dependencies:** Implemented target flow; staging isolation; durable jobs; approved test conditions/quotas and fake external services.
- **Roles:** Performance engineer; technical owner; domain release owner approves measured exceptions.
- **States/transitions:** Accepted processing → completed/retryable failure/exhausted; before deadline → server-finalized or closed retained draft; retry after browser close preserves exactly one result.
- **Data touched:** Synthetic requests/jobs, scrubbed telemetry, test conditions, percentile/error reports, audited extension fixtures.
- **Acceptance criteria:** Run 100 active-user baseline and 1,000 public-browser stress with stated authenticated mix; evaluate default p75 LCP ≤2.5s and ordinary API p95 ≤1s on agreed conditions; distinguish upload/external work and queue acceptance/delivery.
- **English/Arabic:** Include both locale payloads; display deadlines with Asia/Riyadh label while storing UTC.
- **Accessibility:** Slow/error states preserve saved work and accessible retry; motion fallback does not depend on fast connections.
- **Security/RLS:** Authenticated load uses separate scoped users; private responses must never enter shared cache; load artifacts redact sensitive payloads.
- **Audit/email:** Test decision-batch/announcement queues using 300–400 and about 1,000 synthetic recipients; report target/quotas only when approved; email sink prevents real sends.
- **Automated tests:** Server cutoff/boundary/extension, competing edits, accepted-job outage/replay, queue deduplication and performance scripts with documented thresholds.
- **Manual UAT:** Owner reviews percentiles/errors, budget/quota limits and any exception before affected flow opens.
- **Release gate:** AT-16 and relevant REL gate; critical windows forbid planned maintenance under NFR-03.
- **Owner type:** Performance/backend engineer and technical operations owner.
- **TBD blocked:** Local profiles unblocked; staging quotas/budget/conditions and actual peak settings require [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), [DR-CFG-07](DECISION_REQUIRED.md#dr-cfg-07), [DR-CFG-05](DECISION_REQUIRED.md#dr-cfg-05).

<a id="bl-tst-07"></a>

## BL-TST-07 — Restore isolated database and objects with reconciliation

- **Source IDs:** AT-17, AT-18, INF-05, INF-06, INF-07, PRV-06, SEC-07, REL-06.
- **Status:** Planned; no executed backup/restore evidence and local database runtime blocked on inspected host.
- **Purpose:** Demonstrate recoverability without losing acknowledged submissions or resurrecting deleted/revoked access.
- **Scope:** One isolated restore rehearsal from a synthetic database backup plus separately backed-up storage objects; reconcile post-backup accepted writes and deletion/revocation evidence; record actual loss/restoration measurements.
- **Exclusions:** Restoring live data into ordinary staging; claiming database backup contains file bytes; destructive rollback that discards newer orders/submissions.
- **Dependencies:** BL-DEP-04; BL-SEC-08; release rollback plan; approved recovery environment and file targets.
- **Roles:** Recovery operator, technical owner, privacy owner; Finance/scientific owner for reconciliation sign-off.
- **States/transitions:** Backup selected → isolated restore → integrity/reconciliation checks → owner approval to recover service; failed checks remain isolated.
- **Data touched:** Synthetic database/object snapshots, restore manifests, accepted-write ledger references, suppression/revocation records and measurements.
- **Acceptance criteria:** Restored IDs/file bytes match; reconciled payments/submissions retain evidence; erased/revoked records stay unavailable; results compare with labeled ordinary 24h/4h and critical database 15min/1h objectives, plus separately approved file targets.
- **English/Arabic:** Restored bilingual records and content render correctly; runbook usable by designated operator.
- **Accessibility:** Recovery status and operator instructions are structured readable text; post-restore smoke includes accessible public/error pages.
- **Security/RLS:** Isolation, keys, grants and storage privacy revalidated before exposure; production secrets/data never copied casually.
- **Audit/email:** Audit restore access and reconciliations; alert only approved operational test recipients; no replayed participant emails.
- **Automated tests:** Object integrity, referential consistency, revoked-session/policy checks, suppression replay and email/job deduplication after restore.
- **Manual UAT:** Primary and backup operators execute runbook, record timed evidence and decide whether demonstrated targets meet release needs.
- **Release gate:** Before REL-01 and before critical operational releases; repeat after material recovery changes.
- **Owner type:** SRE/data engineer with domain/privacy owners.
- **TBD blocked:** Synthetic local rehearsal unblocked when runtime exists; provider plan/file targets/custodians require [DR-CFG-10](DECISION_REQUIRED.md#dr-cfg-10), [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11).
