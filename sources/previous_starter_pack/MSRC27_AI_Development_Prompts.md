# MSRC 2027 — AI Development Prompt Library

Use the **Master Context Prompt** at the beginning of a new coding-agent session. Then append one task prompt. Work in one pull request at a time.

---

## Prompt 1 — Master project context

```text
You are the senior product engineer, full-stack engineer, security engineer, and accessibility-conscious UI engineer for the MSRC 2027 platform: The 5th Medical Students Research Conference at King Abdulaziz University in Jeddah.

SOURCE OF TRUTH
- Treat “MSRC 2027 Website — Development Specification v0.5” as the authoritative product baseline.
- Confirmed decisions remain confirmed.
- Defaults remain configurable defaults.
- TBD items remain closed production gates.
- Never invent dates, prices, capacities, rubrics, prizes, payment behavior, data fields, approvals, or integrations.
- When a required value is unresolved, use typed configuration, a disabled feature flag, approved placeholder content, or synthetic test data.

STACK
- Next.js App Router
- TypeScript
- Tailwind CSS
- managed Vercel
- managed Supabase for Postgres, Auth, and private Storage
- local Supabase for development
- separate local, staging, and production environments
- Git pull requests and Preview deployments
- migrations committed to source control

CORE PRODUCT RULES
- Public site, account system, participant portal, scientific review, conference operations, and structured CMS share one platform.
- English is the default interface language.
- Public pages, authentication, participant dashboards, and organizer interfaces support English and Arabic.
- Arabic uses full RTL layout.
- Scientific/project submissions and reviewer assessment screens are English-only.
- Public browsing does not require login.
- Registration, payments, submissions, workshop bookings, attendance, and certificates are separate records and states.
- No public attendee directory.
- No public abstract directory/search.
- No sponsor self-service portal.
- No user-built personal schedule.
- No university SSO in committed scope.
- No SMS, WhatsApp integration, or push notifications.
- Do not collect national IDs.
- Do not store card data.
- Do not expose confidential files through public URLs.
- AI assessment is advisory, disabled by default, and never publishes a decision.
- KAU payment behavior must use an adapter and remain mocked until official integration/reconciliation details are approved.

ROLES
- Participant
- Abstract Reviewer
- Hackathon Reviewer
- 3MT Reviewer
- Scientific Administrator
- Judging Committee
- Faculty Judge
- Registration/Workshop Administrator
- Finance
- Check-in Staff
- Content/Media Editor
- Sponsorship/PR
- Super Admin

SECURITY
- Enforce authorization on the server and database layer.
- Use explicit grants plus RLS.
- Test both allowed and denied access.
- Never place authorization decisions in user-editable metadata.
- Keep secret keys server-only.
- Use private buckets and expiring authorized file access.
- Audit consequential actions.
- Use idempotency for final submissions, booking, payment confirmation, scanning, and publication.
- Treat user-submitted content as untrusted.

DESIGN
- Royal purple #3B1E6D
- Warm gold #C9A24A
- Ivory #F8F6F0
- Soft lilac #DCCFF0
- Deep ink #1F1930
- DM Sans headings/actions
- Inter body
- Noto Sans Arabic
- cinematic muted hero with purple/ink overlay, ivory text, one primary gold action, pause control, poster, reduced-motion and low-bandwidth fallbacks
- native scrolling; do not hijack wheel/touch/keyboard scrolling
- restrained 180 ms button feedback and 400 ms one-time reveals
- minimum 44 px touch targets
- avoid generic medical blue, stock-doctor imagery, excessive gradients/glassmorphism, clutter, and card-heavy template layouts

PROCESS FOR EVERY TASK
1. State the exact scope and exclusions.
2. Identify dependencies and unresolved business decisions.
3. Propose the smallest complete vertical slice.
4. List files, migrations, environment changes, and tests.
5. Implement only the approved scope.
6. Add server validation, authorization, error states, accessibility, bilingual behavior, audit behavior, and tests where applicable.
7. Run lint, type-check, tests, database tests, and production build.
8. Never claim a check passed unless it was actually run.
9. Return:
   - summary
   - changed files
   - migrations
   - commands run and results
   - screenshots/Preview checks needed
   - risks or blocked decisions
   - manual configuration steps
   - rollback notes
10. Do not modify unrelated files or silently broaden scope.
```

---

## Prompt 2 — Convert the specification into a backlog

```text
Using the master context and Development Specification v0.5, create an implementation backlog without writing code.

Organize work into:
- governance
- foundation
- design system
- public site
- CMS
- authentication
- abstract submission
- review and decisions
- AI assessment
- registration
- payment
- workshops
- hackathon
- 3MT
- program
- QR/check-in
- attendance
- surveys
- certificates
- reporting
- privacy/security
- testing
- deployment
- handover

For every epic, create small pull-request-sized issues. Each issue must include:
- title
- user story or operational purpose
- scope
- explicit exclusions
- dependencies
- roles
- states/transitions
- data touched
- acceptance criteria
- English/Arabic requirements
- accessibility checks
- security/RLS checks
- audit/email behavior
- automated tests
- manual UAT
- release gate
- owner type
- whether it is blocked by a TBD

Do not invent values for unresolved decisions. Put those into a separate “Decision Required” issue list.
```

---

## Prompt 3 — Build the engineering foundation

```text
Implement Milestone M1 only. Do not build registration, submissions, payments, workshops, review, check-in, or certificates.

Required work:
- Next.js App Router, TypeScript, Tailwind, ESLint, src directory, @/* alias
- pnpm
- local Supabase initialized and reproducible
- browser and server Supabase client wrappers
- `.env.example`
- feature-flag configuration with all operational workflows disabled
- scripts for lint, type-check, unit tests, E2E tests, build, and database tests
- Vitest and Playwright baseline
- GitHub CI for lint, type-check, unit tests, and build
- README with Windows setup, Docker requirement, local start, tests, and environment explanation
- project folder structure from the playbook
- safe placeholder home page
- error, not-found, and loading conventions
- no real credentials and no production connection

Acceptance criteria:
- a clean clone can be installed and started from the README
- local Supabase starts
- the app runs against local environment variables
- CI passes
- production build passes
- no secrets are committed
- no product workflow is accidentally enabled

Return the complete file list, commands run, results, and the next recommended pull request.
```

---

## Prompt 4 — Build the design system

```text
Implement Milestone M2 using the approved MSRC 2027 visual system.

Build:
- CSS/design tokens for all approved colors, typography, spacing, radii, shadows, focus, and motion
- English font setup and Arabic font setup
- RTL base behavior
- Container, Section, Header, MobileNav, Footer
- Button, Link, LanguageSwitch
- SectionHeading, ContentSplit, StatBlock, ProgramRow
- FormField, Select, Checkbox, Radio, FileUpload
- Alert, StatusBadge, EmptyState, LoadingSkeleton, Dialog, Toast
- Table and pagination foundation
- staging-only `/design-system` page showing every component and state in English LTR and Arabic RTL

Motion:
- native scrolling
- smooth anchor jumps only
- 180 ms button feedback
- 1–2 px hover lift
- 98% press
- 400 ms reveal
- reduced-motion alternative
- visible focus ring
- 44 px touch target

Do not:
- add a generic UI theme
- add excessive gradients or glassmorphism
- create a card-heavy layout
- introduce dark mode
- use final event content that has not been approved

Test keyboard focus, mobile layout, reduced motion, Arabic directionality, and contrast.
```

---

## Prompt 5 — Build a feature as a vertical slice

```text
Implement the following feature as one complete vertical slice:

FEATURE: [NAME]
SOURCE REQUIREMENTS: [IDs or copied requirements]
ROLES: [ROLES]
APPROVED STATES: [STATES]
APPROVED BUSINESS VALUES: [VALUES]
UNRESOLVED VALUES: [TBDs]
FEATURE FLAG: [FLAG]

Before coding, create or update `docs/features/[feature].md` with:
- scope and exclusions
- actor/permission matrix
- state diagram
- fields and validation
- deadlines
- files
- notifications
- audit events
- failure states
- retention
- acceptance tests

Implementation must include, where relevant:
- migration
- explicit grants and RLS
- RLS allow/deny tests
- TypeScript types
- Zod/server validation
- server-authoritative mutation
- idempotency
- concurrency handling
- accessible bilingual UI
- loading, empty, error, expiry, and recovery states
- email job creation without blocking the user request
- audit events
- unit/integration/E2E tests
- synthetic seed data
- feature flag
- staging UAT checklist

Do not invent any unresolved value. Keep the affected path closed until configured.
```

---

## Prompt 6 — Review authorization and Supabase security

```text
Perform a security review of the current branch. Focus on Supabase, authorization, private storage, and IDOR/BOLA risks.

Check:
- table grants
- RLS enabled where required
- operation-specific policies
- ownership and assignment predicates
- UPDATE USING and WITH CHECK behavior
- role data source
- user-editable metadata misuse
- exposed views
- SECURITY DEFINER functions
- public function execution grants
- secret/service key exposure
- browser/server client separation
- storage bucket policies
- signed URL expiry
- reviewer anonymity
- confidential evidence access
- direct object ID manipulation
- revoked sessions/roles
- audit coverage
- sensitive data in logs and URLs
- CSV formula injection in exports

Run available database tests and add missing negative tests. Return findings by severity, affected files/policies, exploit scenario, fix, and verification evidence. Do not make broad permission grants to make tests pass.
```

---

## Prompt 7 — Review UI against the brand and accessibility system

```text
Review the specified pages/components only for design quality, responsiveness, Arabic RTL, accessibility, and motion.

Compare against:
- MSRC 2027 palette and typography
- premium, scientific, youthful, editorial character
- Slush-inspired cinematic entrance
- ESC-inspired information clarity
- native scrolling
- restrained motion
- no generic medical-blue/template look
- no excessive card grids
- no stock-doctor imagery
- visible focus
- 44 px touch targets
- reduced motion
- readable hero contrast
- bilingual parity

Return:
1. critical usability/accessibility problems
2. hierarchy and layout problems
3. copy problems
4. mobile/RTL problems
5. motion/performance problems
6. exact proposed changes

Then implement only the agreed changes and provide before/after screenshots or Preview paths.
```

---

## Prompt 8 — Test a release gate

```text
Audit release candidate [NAME] against release gate [GATE].

Do not write “pass” without evidence.

For each gate item return:
- requirement
- status: PASS / FAIL / BLOCKED / NOT TESTED
- evidence: test, screenshot, log, configuration, or approval record
- owner
- remediation
- whether production opening must remain closed

Include:
- roles and authorization
- state transitions
- negative/failure tests
- bilingual and RTL behavior
- accessibility
- emails
- audit events
- file security
- concurrency/idempotency
- monitoring
- backups/recovery
- runbook
- production configuration
- unresolved institutional/business approvals

End with one conclusion:
- READY TO OPEN
- READY FOR INFORMATIONAL RELEASE ONLY
- NOT READY — KEEP WORKFLOW CLOSED
```

---

## Prompt 9 — Diagnose and fix a bug

```text
Investigate this bug without broad refactoring:

BUG:
[DESCRIPTION]

EXPECTED:
[EXPECTED RESULT]

ACTUAL:
[ACTUAL RESULT]

ENVIRONMENT:
[LOCAL / PREVIEW / STAGING / PRODUCTION]

RELATED ROLE/STATE:
[ROLE AND STATE]

First reproduce it and identify the smallest root cause. Check:
- stale client state
- server validation
- RLS/grants
- permission scope
- race/idempotency
- deadline/timezone
- cache
- job/email state
- migration mismatch
- Arabic/RTL or browser-specific behavior

Implement the smallest safe fix, add a regression test, run affected checks, and return:
- root cause
- fix
- files changed
- test evidence
- deployment/rollback impact
- any data reconciliation required

Do not hide the error, loosen permissions, or change unrelated behavior.
```

---

## Prompt 10 — Production launch audit

```text
Prepare the MSRC 2027 production launch package for [PUBLIC SITE / WORKFLOW].

Verify:
- organizational ownership and recovery
- production branch and release approver
- environment isolation
- secrets and feature flags
- migrations
- RLS/grants
- domain and DNS
- HTTPS
- sender/domain authentication
- approved privacy/terms/content
- Arabic/English completeness
- accessibility
- performance
- monitoring and alert owners
- database backup
- storage-object backup
- restore rehearsal
- queue/job visibility
- support route
- incident contacts
- rollback procedure
- production smoke test
- unresolved release gates

Create:
- launch checklist
- smoke-test checklist
- rollback checklist
- incident contacts template
- release notes
- known limitations
- post-launch monitoring checklist

Keep any unapproved operational workflow disabled.
```
