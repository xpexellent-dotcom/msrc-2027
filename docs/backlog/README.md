# MSRC 2027 implementation backlog

**Planning baseline: 29 September 2026; status reconciled 1 October 2026. 152 implementation issues across 24 epics, plus 13 separate Decision Required packets. No application implementation is authorized by this backlog alone.**

Read [Development Specification v0.5](../../sources/Development_Specification_v0.5.txt), [master context](../../MSRC27_Codex_Context.md), [current decisions](../DECISIONS.md), [progress](../PROGRESS.md) and [roadmap](../ROADMAP.md) together. The master context preserves the original handoff; current Git/code/progress supersede its historical statement that no app existed. Explicit current organizer decisions govern, then the reconciled specification. Source proposals, estimates and old starter material never become approved product values.

The output of this task is documentation only: issue descriptions, decision questions, indexes and verification evidence. No application code, migrations, environment configuration, real messages, cloud provisioning or external issue creation is part of it. The existing local application remains unchanged.

## Browse the backlog

| # | Epic | Implementation issues | Milestone / sequencing |
|---|---|---:|---|
| 1 | [Governance](01-governance.md) | 3 | M0; every release |
| 2 | [Foundation](02-foundation.md) | 6 | M1; shared operational prerequisites |
| 3 | [Design system](03-design-system.md) | 3 | M2; all UI releases |
| 4 | [Public site](04-public-site.md) | 9 | M3; archive after event |
| 5 | [CMS](05-cms.md) | 8 | M4 |
| 6 | [Authentication](06-authentication.md) | 9 | M4 privileged security; M5 participants |
| 7 | [Abstract submission](07-abstract-submission.md) | 8 | M6 |
| 8 | [Review and decisions](08-review-and-decisions.md) | 9 | M6; M9 judging |
| 9 | [AI assessment](09-ai-assessment.md) | 4 | M6 optional activation gate |
| 10 | [Registration](10-registration.md) | 5 | M7 |
| 11 | [Payment](11-payment.md) | 8 | M7 |
| 12 | [Workshops](12-workshops.md) | 6 | M7 |
| 13 | [Hackathon](13-hackathon.md) | 10 | M8; M9 finals |
| 14 | [3MT](14-3mt.md) | 6 | M8; M9 finals |
| 15 | [Program](15-program.md) | 3 | M3 public read; M9 operations |
| 16 | [QR/check-in](16-qr-check-in.md) | 4 | M7 credentials; M9 scanning |
| 17 | [Attendance](17-attendance.md) | 3 | Design before collection; M9 capture |
| 18 | [Surveys](18-surveys.md) | 3 | Design before collection; M10 opening |
| 19 | [Certificates](19-certificates.md) | 11 | Design before collection; M10 release |
| 20 | [Reporting](20-reporting.md) | 4 | As each domain opens |
| 21 | [Privacy/security](21-privacy-security.md) | 10 | Before affected data collection; ongoing |
| 22 | [Testing](22-testing.md) | 7 | Per issue and per release |
| 23 | [Deployment](23-deployment.md) | 8 | Before every live release |
| 24 | [Handover](24-handover.md) | 5 | Minimum runbooks before release; M11 consolidation |

- [Decision Required — all 13 CFG packets](DECISION_REQUIRED.md): exact unanswered question sets, accountable owner types and affected gates. Named people and due dates remain unassigned.
- [Issue index CSV](ISSUE_INDEX.csv): ID/title/file/status/source/dependencies/release/owner/TBD for triage. Complete issue bodies remain in the Markdown files.
- [Source coverage CSV](SOURCE_COVERAGE.csv): all 212 normative, configuration and acceptance IDs in v0.5 map to implementation or decision issues. This is planning traceability, not evidence of implementation or full semantic correctness.
- [Backlog verification](VALIDATION.md): executed documentation checks and their limitations.

## Issue contract and scope control

Each issue title is its heading. Each body provides purpose, bounded scope, explicit exclusions, dependencies, roles, states/transitions, data touched, acceptance criteria, English/Arabic behavior, accessibility, security/RLS, audit/email, automated tests, manual UAT, release gate, owner type and TBD blocking status. Source IDs and observed/planned status are additional fields. Every implementation issue is intended as one reviewable PR; if discovery makes it materially larger, split at its documented transition/interface boundary before coding and preserve source/gate links.

An issue's **Dependencies** describe implementation prerequisites. A **Release gate** may require downstream producers/consumers, real service evidence, editorial approval or a wider end-to-end rehearsal. Land agreed closed contracts and synthetic fixtures first; integrating both sides is required before activation. The explicit issue-ID dependency graph is checked for cycles; named dependencies still require engineering review when the issue is picked up. Examples: grant checks can land before MFA enrollment but privileged access stays closed; ticket issuance can use a synthetic confirmed entitlement before the registration producer is connected; refund tracking can precede the exception queue.

**TBD blocked** distinguishes a blocked live stage from unblocked technical work. A null value or missing approval must keep the affected server/database operation closed. A mock or configurable engineering default is not a production decision. States quoted from v0.5 retain their meaning; descriptive technical job/planning states are implementation proposals, not invented commercial or scientific policies.

No schema/migration filenames or new environment secrets are fabricated in advance. The **Data touched** and scope identify the intended change surface; the feature PR must list its concrete files, migrations and safe environment names before implementation, run relevant checks, and update progress. Use current official APIs and installed CLI help when that future task changes dependencies or integrations.

## Current evidence, not assumed completion

Current evidence is reconciled in the [1 October checklist audit](../reviews/checklist-audit-2026-10-01.md). Earlier dated validation and engineering records remain historical evidence.

- The private [GitHub repository](https://github.com/xpexellent-dotcom/msrc-2027) exists; `main` was observed at `9e018ae`. PRs #1, #3 and #4 are merged. PR #2 remains open although its implementation is already in `main`; it is not a missing feature prerequisite.
- M1 application and isolated local Supabase verification passed in [PR CI run 36734074148](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36734074148) at `9e018ae`, including both application and database jobs. The separate `main` run `36734737705` was cancelled, not passed. Windows Docker replay remains unverified and is optional for daily hosted development under ENG-006; Linux CI supplies the synthetic database evidence.
- M2's complete shared component inventory and bilingual Home/About preview are implemented. Recorded QA reports 184 unit and 102 browser tests passing; these suites were **not rerun for this documentation audit**. Recorded WebKit public-page checks passed with keyboard/design-system failures or limitations still identified; Firefox, full assistive-technology and real-device coverage remain incomplete.
- GitHub production deployment `6762942669` succeeded for `9e018ae`. Fresh HTTP checks found English/Arabic Home and About returning 200 on `www.msrc2027.com`; all three design-system routes returned 404. `robots.txt` returns a crawl-disallow policy, page response headers carry noindex, and `sitemap.xml` returns 404. Apex HTTP/HTTPS redirects reach `www.msrc2027.com/en`; the observed `www` CNAME matches `faa763cc393bee28.vercel-dns-017.com`. Serving the draft site does not satisfy the full REL-01 approval gate.
- One recorded Preview (`8xk97f37l`) redirected an unauthenticated request to Vercel login. Authenticated showcase access was not tested. GitHub's branch API reports `main` with `protected=false`; this does not independently audit all rulesets, so required merge-check enforcement remains unverified. Organizational custody remains open. The Vercel connector returned 403, so project settings were not verified. Hosted Supabase health/schema was not refreshed in this audit.
- The approved palette/fonts/motion are the ENG-007 implementation baseline. Final marks, bilingual editorial approval, rights-cleared media and public release evidence remain open under DR-CFG-12. Authentication, structured CMS, live email, payments and operational modules remain unimplemented/closed; this issue list and the successful deployment do not open them.

## Smallest next tasks and release order

1. **Begin M3 content preparation now:** shortlist the user-selected MSRC2026 media by source ID, proposed placement, rights/consent and caption; obtain bilingual Home/About copy approval through [DR-CFG-12](DECISION_REQUIRED.md#dr-cfg-12). Selection is not publication clearance. Existing safe static media remains in place until assets are approved.
2. **Next bounded coding PR:** [BL-PUB-02](04-public-site.md#bl-pub-02) — Dates and Venue's honest unpublished preview. Actual dates/venue stay unset; missing decisions do not block this closed public-information slice.
3. **Independent security work:** [BL-SEC-01](21-privacy-security.md#bl-sec-01) — turn the documented role rules into a concrete permission contract and denied-access matrix using synthetic actors. M4 staff grants, identity and MFA must precede CMS writes; M5 participant accounts do not defer that prerequisite.
4. **Close release-governance gaps:** [BL-GOV-02](01-governance.md#bl-gov-02), [BL-DEP-02](23-deployment.md#bl-dep-02) and [DR-CFG-11](DECISION_REQUIRED.md#dr-cfg-11) cover custody, named release owners and protected required checks. Complete REL-01's copy/contact/privacy/terms, accessibility, monitoring and recovery evidence before treating the deployed draft as an approved informational release. Optional Windows database replay is not the next-work blocker.

Choose one issue for the next coding task; this list is not an instruction to implement all four now. There are no invented calendar deadlines, effort estimates, priorities derived from business urgency, named assignees, prices or capacities.

| Release | Required dependency shape |
|---|---|
| Public information — REL-01 | Approved bilingual content/brand/contact/privacy/terms, accessible layout, secured CMS if exposed, ownership/monitoring/recovery. Static information may exist without an editor UI. |
| Human scientific workflow — REL-03 | Verified identity/privacy plus configured submission/evidence/anonymity/rubric/quorum/revision/publication. AI approval is separate and cannot block permitted manual review. |
| Registration/workshops — REL-02 | Manual approval/capacity/hold/discount policy, actual authorized KAU confirmation or reconciliation, refunds, sender and ticket issuance/revocation all proven before opening. |
| Competitions — REL-04 | Each competition's own approved eligibility/forms/stages/review/quotas. No guessed solo accounting or imported 3MT rulebook. |
| Event operations — REL-05 | Approved program/rooms/rosters, valid entitlements, staff/device/outage rehearsals, per-person evidence, workshop sign-off and separate judging. |
| Surveys/certificates/archive — REL-05 | A1 evidence, privacy-tested S2 unlinking, approved questions/templates/signatures/release/correction/retention and durable issuance. Evidence/retention design occurs before collection, even if UI ships later. |
| Every release — REL-06 | Permission/failure/concurrency/accessibility/language evidence, audit/email behavior, operational owner, production configuration, minimum runbook and tested recovery. M11 consolidates rather than postpones these. |

## Non-negotiable planning boundaries

Keep public browsing open and records independent: accounts, admission, orders/payment attempts, submissions/reviews, workshop holds/bookings, tickets, attendance, surveys and certificates. Manual approval applies even to full discounts. ORG-042 selects the Faculty of Medicine payment platform (`lms.waqf.org.sa`); payment stays behind the mock KAU adapter until the actual contract is approved. ORG-039 supersedes the national-ID exclusion for conference registration: identity verification uses national ID/Iqama, or international passport, with authorized internal attendee access, strict controls, encryption at rest if feasible and one-year deletion; field implementation remains backlog work. No card storage, public attendee or abstract directory, sponsor portal, schedule builder, automatic team matching, SSO, SMS/WhatsApp/push integration, or AI-published decision. ORG-037 approves Privacy/Terms v1.0 publication and participant notice; accounts remain closed. ORG-040 selects DeepSeek in China, requiring a separate switch from the disabled Anthropic adapter before activation.

Public/auth/participant/non-review organizer interfaces are English/Arabic with full RTL. Scientific/project input remains English/LTR, including within Arabic screens; reviewer/faculty assessment and transactional emails are English-only. Audit/email entries never authorize sending messages as part of this planning task.

## Maintenance and rollback

After an implementation PR, update its status with observed evidence and update [PROGRESS](../PROGRESS.md); do not silently mark an epic or release complete. A decision updates [DECISIONS](../DECISIONS.md) and the linked DR issue with approval evidence while preserving v0.5. Regenerate the two CSV indexes after issue/source changes and repeat structural/link/coverage checks.

Rollback of this task is documentation-only: restore the changed documentation from the prior Git checkpoint or revert the dedicated backlog commit after preserving later document edits. There is no migration, data rollback or environment rollback. External issue import, named assignment, deployment and opening workflows require their own task.
