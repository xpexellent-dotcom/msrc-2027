# Development roadmap

**Status at handoff:** documentation prepared; implementation has not been verified. This order reconciles the previous starter pack with S1 v0.5. It retains the selected scope and opens each workflow only when its own dependencies are complete.

## Milestones

| ID | Deliverable | Minimum evidence before advancing |
|---|---|---|
| M0 | Ownership record, decision register, source baseline, task board | Named owners or explicit gaps; development may proceed with synthetic data |
| M1 | Reproducible local app, selected dependency versions, local data setup, test commands, CI definition | Clean install, local start, targeted tests and build run; untested remote checks labeled |
| M2 | Design tokens, shared components, English/Arabic, RTL, accessible motion and video states | Desktop/mobile/keyboard/RTL/reduced-motion visual review |
| M3 | Public route shell and homepage alpha with typed content | All planned public routes navigable; no invented event facts or open operational buttons |
| M4 | Staff identity and permissions, structured CMS, safe previews and media approval | Privileged MFA and access tests before CMS writes; translations and publication rules verified |
| M5 | Participant verification, profile, dashboard, support, shared role boundaries | OTP/recovery/session and own-record/denied-access tests pass |
| M6 | Abstract draft through administrative review, blinded review, revision and published decision | Complete human workflow and S1 REL-03 evidence; advisory assessment separately gated |
| M7 | Registration, official payment/reconciliation adapter, discounts, workshops/waitlists, ticket issuance/dashboard/revocation | Approval/payment/capacity failure paths; actual KAU evidence and REL-02 |
| M8 | Hackathon and separate 3MT modules | Each competition's approved rules and stage-specific gate; no guessed quotas/rubrics |
| M9 | Staff scanning, daily/activity evidence, workshop sign-off, event judging | Rehearsal on staff phones and tested outage procedure |
| M10 | Unlinked feedback with completion evidence, certificates, verification, archive/retention | Privacy/retry tests, eligibility/release/revoke tests, approved templates and retention |
| M11 | Final recovery rehearsal, monitoring/runbook consolidation, renewal and annual handover | Organizational sign-off and complete operational evidence |

**Dependency correction:** M4 includes staff authentication and authorization. The later M5 milestone expands participant account flows; CMS editing cannot be exposed while waiting for M5. Public read-only content is distinct from authenticated CMS administration.

Ticket issuance, dashboard access and revocation are required for M7 registration opening; M9 adds staff scanning and event evidence. Minimum monitoring, operational runbooks and tested recovery belong before each live release. M11 consolidates and rehearses them for final handover.

Attendance and retention schema decisions must be completed before evidence is collected, even if the certificate interface ships later. Design, source reconciliation, synthetic prototypes, and technical foundations can proceed while business inputs are pending.

## Release sequence

| Release | Candidate scope | Opening gate |
|---|---|---|
| A | Approved informational public site and secured content editing | REL-01; approved public copy/brand/ownership/privacy/contact |
| B | Accounts and complete human abstract workflow | REL-03 plus production identity/data processing approval |
| C | Registration, collection, discounts, workshop booking/waitlists and valid participant tickets | REL-02; verified KAU collection/reconciliation and financial terms |
| D | Hackathon and 3MT, independently opened | REL-04 and each stage's configuration |
| E | Event scanning, evidence and judging | Event portion of REL-05 |
| F | Feedback, certificates, archive, retention and annual transition | Certificate portion of REL-05, privacy controls, M11 handover |

The sequence is a recommended delivery order. Exact calendar dates depend on confirmed conference/application deadlines, available development capacity, and the operating team's decisions. No new delivery dates are promised by this package.

## First eight development tasks

| Task | Concrete work | Acceptance | Dependency |
|---|---|---|---|
| F01 | Inspect actual folder/repository/tooling; record baseline and available access | No existing work overwritten; runnable state and gaps reported | Handoff |
| F02 | Record framework/runtime/package choices; scaffold minimal app if absent | Clean local start and production build | F01 |
| F03 | Add English/Arabic route/layout structure, native direction, error/loading conventions | Route switches preserve intended destination; keyboard and RTL smoke review | F02 |
| F04 | Add typed configuration and closed operational feature flags | Server and UI refuse disabled operations; unknown dates/prices stay unknown | F02 |
| F05 | Establish local Supabase, synthetic seed strategy, safe client boundaries | Local-only connection verified or concrete environment blocker recorded | F02 |
| F06 | Add project scripts and appropriate CI definition | Checks actually executed locally; remote CI only claimed when observed | F02-F05 |
| F07 | Build tokens and shared header/footer/button/form states | Working design defaults labeled; accessible components reviewed | F03 |
| F08 | Build homepage and public content shell | Poster/video fallback; approved or clearly synthetic content; mobile/RTL review | F04, F07 |

F05 may run in parallel with visual work after agreeing client/configuration boundaries. Do not block a static design preview because a production integration is unavailable.

## Feature work template

Each issue should contain source requirement IDs, actor and permission scope, approved states, fields/validation, unresolved values, acceptance criteria, required failure tests, audit/email effects, language/accessibility behavior, release gate, owner, and rollback/data implications. Use [prompts/03_FEATURE_AND_REVIEW.md](../prompts/03_FEATURE_AND_REVIEW.md).

## Polish cycle

After each usable slice: inspect on mobile and desktop; check Arabic directionality and long labels; review keyboard/focus/errors; test slow/failed requests; optimize the largest measured bottleneck; correct approved copy; then record evidence. Avoid broad redesigns during submission, registration, and event-critical windows unless a specific problem requires one.

## Working ownership

Akram directs product choices and coordinates organizer decisions. Technical, scientific, finance, workshop, hackathon, privacy, and release roles must be assigned to named people in `OWNERSHIP_AND_SETUP.md`. Role labels here do not grant access or claim that those people have accepted responsibilities.
