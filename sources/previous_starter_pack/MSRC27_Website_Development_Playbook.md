# MSRC 2027 Website — Development Playbook

**Project:** The 5th Medical Students Research Conference, King Abdulaziz University, Jeddah  
**Working baseline:** Development Specification v0.5  
**Architecture baseline:** Next.js App Router + TypeScript + Tailwind CSS + managed Vercel + managed Supabase  
**Delivery principle:** Build and release the platform in gated vertical slices. Do not open a workflow merely because its interface exists.

---

## 1. What is being built

This is one platform with several independently released products:

1. **Public conference website**
   - Home
   - About
   - Dates and venue
   - Scientific program
   - Speakers
   - Workshops
   - Participation and submission guidelines
   - Teams, committees, and board
   - Sponsors and sponsorship
   - Gallery and past editions
   - Announcements
   - FAQ
   - Contact
   - Privacy and terms

2. **Participant portal**
   - Account and verified email
   - General conference registration
   - Payments and discounts
   - Abstract submission and revisions
   - Hackathon participation
   - Three Minute Thesis participation
   - Workshop bookings and waitlists
   - QR tickets
   - Certificates

3. **Scientific operations**
   - Administrative validation
   - Reviewer assignments
   - Blinded review
   - Revisions
   - Decision preparation and publication
   - Oral/poster allocation
   - Event-day judging
   - Awards

4. **Conference operations**
   - Program and room management
   - Check-in and attendance evidence
   - Workshop completion
   - Surveys
   - Certificate eligibility and release
   - Reporting and exports

5. **Content and governance**
   - Structured CMS
   - Media approval
   - Sponsors and inquiries
   - Roles and permissions
   - Audit trail
   - Privacy, retention, and annual handover

These products share one design system, account system, edition configuration, permission model, audit layer, notification system, and deployment process. They do not need to launch simultaneously.

---

## 2. Non-negotiable product rules

- English is the default interface language.
- Public pages, authentication, participant dashboards, and organizer interfaces are bilingual.
- Arabic uses a full RTL layout.
- Scientific/project submissions and reviewer assessment screens remain English-only.
- Public browsing does not require an account.
- Registration, submissions, competition entries, workshop bookings, and payments are separate records and state machines.
- Listing a co-author does not register that person for attendance.
- No public attendee directory.
- No public abstract search or abstract directory.
- No sponsor self-service portal.
- No user-built personal schedule.
- No university SSO in the committed scope.
- No SMS, WhatsApp integration, or push notifications in the platform.
- Do not collect national IDs.
- Do not store card details.
- All privileged access is individually identifiable and auditable.
- Every public or private workflow must remain closed until its business configuration and release gate are complete.
- Unresolved values must remain configuration gates or disabled feature flags. Never invent them.

---

## 3. Recommended release model

### Release A — Public informational launch

Release the public website without opening participation workflows.

**Includes**
- Brand system
- Bilingual navigation
- Public page structure
- Homepage
- Contact
- Privacy and terms
- Announcements
- Speakers, sponsors, program previews, and gallery when approved
- SEO, social metadata, accessibility, performance, monitoring, and backups

**Does not include**
- Live registration
- Live payments
- Live submissions
- Live workshop bookings
- Live certificates

This release creates a real public presence while preserving the release gates of operational workflows.

### Release B — Accounts and scientific submissions

Open verified accounts and the first approved participation workflow.

**Recommended first operational slice**
- Account creation
- Email verification
- Participant profile
- Dashboard shell
- Abstract drafts
- Final abstract submission
- Administrative validation
- Blinded review
- Revisions
- Decision publication

Build AI assessment only after the complete human workflow is reliable. Keep it disabled behind a feature flag until provider, privacy, evaluation, and cost approvals are complete.

### Release C — Registration, payments, and workshops

Open only after KAU confirms the real collection and reconciliation process.

**Includes**
- Manual registration approval
- Capacity allocation
- Payment adapter
- Full-discount order flow
- Ticket issuance
- Workshop holds
- Approval
- Payment
- Waitlists
- Time-conflict prevention

Develop first against a synthetic `MockPaymentAdapter`. Replace it with a real `KAUPaymentAdapter` only from approved integration documentation.

### Release D — Hackathon and 3MT

Use common account, drafts, notifications, review, and judging infrastructure, but preserve separate rules and state machines.

Hackathon can proceed from its confirmed rules while unresolved finalist accounting, eligibility wording, detailed rubric, fees, prizes, IP, and certificate rules remain gated.

3MT remains closed until its own eligibility, form, presentation, judging, and certificate rules are approved.

### Release E — Event operations

**Includes**
- QR tickets
- Mobile check-in interface
- Daily attendance
- Workshop check-in and completion sign-off
- Hackathon activity evidence
- Event judging
- Outage procedures
- Live operational dashboards

### Release F — Surveys, certificates, archive, and handover

**Includes**
- Survey completion ledger
- Unlinked feedback storage
- Certificate eligibility
- Administrator release
- Public verification
- Revocation and reissue
- Post-event archive
- Retention jobs
- Annual handover package

---

## 4. Milestone roadmap

| Milestone | Main output | Exit gate |
|---|---|---|
| M0 — Governance | Ownership, decision register, project board, release approver | Repository/domain/providers have named organizational custodians |
| M1 — Engineering foundation | Local app, local database, CI, environments, repository standards | A clean baseline builds locally and deploys to Preview |
| M2 — Design system | Tokens, typography, layout, components, motion, RTL | Approved design-system page on desktop, mobile, keyboard, and RTL |
| M3 — Public site alpha | Route shell and homepage/page structures | All public routes exist and work without login |
| M4 — CMS and public beta | Structured content editing, preview, publication, media approval | Editors can safely update approved public content |
| M5 — Auth and participant shell | Verification, profile, dashboard, permissions | Identity and authorization tests pass |
| M6 — Abstract and review | Submission, snapshots, files, blinded review, revisions, decisions | Submission/review release gate passes |
| M7 — Registration and workshops | Approval, capacity, payment adapter, tickets, bookings, waitlists | Real payment and capacity failure tests pass |
| M8 — Competitions | Hackathon and 3MT modules | Each competition passes its own rule/configuration gate |
| M9 — Event operations | QR scanning, attendance, judging, outage process | Full event rehearsal passes |
| M10 — Certificates and archive | Surveys, certificates, verification, archive, retention | Certificate and privacy gates pass |
| M11 — Handover | Runbooks, credentials, billing, recovery, annual transition | Organizational owner signs off |

---

## 5. Stage-by-stage workflow

## Stage 0 — Governance and decision control

### Tasks

- Create an organizational GitHub repository.
- Confirm organizational ownership of:
  - `msrc2027.com`
  - DNS and registrar
  - GitHub organization/repository
  - Vercel team/project
  - Supabase organization/projects
  - billing
  - recovery email and MFA
- Name:
  - continuing infrastructure custodian
  - backup custodian
  - release approver
  - three website Super Admins
- Create a decision register covering every unresolved CFG item.
- Assign one accountable owner and due date to each unresolved decision.
- Create a risk register.
- Separate confirmed decisions, defaults, proposals, and TBDs.

### Deliverables

- `docs/OWNERSHIP.md`
- `docs/DECISIONS.md`
- `docs/RISK_REGISTER.md`
- `docs/RELEASE_GATES.md`
- `docs/ROLE_MATRIX.md`
- `docs/DATA_FLOW.md`
- GitHub Project board
- branch protection rules

### Exit criteria

- Development can proceed using synthetic data.
- No unresolved item is silently converted into production behavior.
- Production accounts are not personally owned by a temporary developer.

---

## Stage 1 — Engineering foundation

### Workstation setup

Install:

- Git
- Node.js 20+
- pnpm through Corepack
- Docker Desktop or another Docker-compatible runtime
- VS Code or another editor
- GitHub CLI, optional
- Vercel CLI, optional

### Create the application

```bash
corepack enable

pnpm create next-app@latest msrc2027-platform \
  --ts \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd msrc2027-platform
```

### Install core dependencies

```bash
pnpm add -E @supabase/supabase-js @supabase/ssr
pnpm add zod react-hook-form @hookform/resolvers

pnpm add -D -E supabase
pnpm add -D vitest @testing-library/react @testing-library/jest-dom @playwright/test
```

Commit the lockfile. Do not automatically upgrade dependencies during critical submission, registration, or event windows.

### Initialize local Supabase

```bash
pnpm exec supabase init
pnpm exec supabase start
pnpm exec supabase --help
```

Commit the `supabase/` directory.

### Initial repository scripts

Add scripts for:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:test": "supabase test db"
  }
}
```

Confirm current CLI help before adding version-specific database commands.

### Environment strategy

Use:

- Local application + local Supabase
- Preview deployments for feature branches
- Isolated staging Supabase project
- Isolated production Supabase project
- Separate secrets, storage, email mode, and payment mode

Suggested `.env.example`:

```dotenv
APP_ENV=local
NEXT_PUBLIC_SITE_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

EMAIL_MODE=console
PAYMENT_MODE=mock

FEATURE_CMS=true
FEATURE_AUTH=false
FEATURE_ABSTRACTS=false
FEATURE_AI_ASSESSMENT=false
FEATURE_REGISTRATION=false
FEATURE_PAYMENTS=false
FEATURE_WORKSHOPS=false
FEATURE_HACKATHON=false
FEATURE_3MT=false
FEATURE_CHECK_IN=false
FEATURE_CERTIFICATES=false
```

Rules:

- Never commit real secret values.
- Never expose secret/service credentials through `NEXT_PUBLIC_*`.
- Keep production feature flags closed until a release gate passes.
- Restrict Preview deployments before private data or organizer interfaces appear.

### Branching model

- `main` — production
- `staging` — integrated staging candidate
- `feature/<ticket>-<name>` — normal work
- `fix/<ticket>-<name>` — bug fixes
- `hotfix/<ticket>-<name>` — urgent production fixes

Require a pull request, passing checks, and review before merging to `main`.

### Exit criteria

- A new developer can clone the repository and start the app from the README.
- Local Supabase starts successfully.
- CI runs lint, type-check, tests, and production build.
- A feature branch produces a Preview deployment.
- `main` is protected.
- No participant data is present.

---

## Stage 2 — Architecture and security baseline

### Establish the application boundaries

Recommended structure:

```text
src/
  app/
    [locale]/
      (public)/
      (auth)/
      dashboard/
      reviewer/
      admin/
      check-in/
    api/
  components/
    ui/
    brand/
    forms/
    data-display/
    feedback/
  features/
    content/
    auth/
    registration/
    payments/
    submissions/
    review/
    workshops/
    hackathon/
    three-minute-thesis/
    program/
    attendance/
    surveys/
    certificates/
  lib/
    supabase/
    permissions/
    validation/
    email/
    payments/
    jobs/
    audit/
    i18n/
  config/
  styles/
  tests/

supabase/
  migrations/
  schemas/
  seed.sql
  tests/

docs/
.github/
```

### First database foundation

Create only the cross-cutting tables needed by many modules:

- `editions`
- `profiles`
- `role_grants`
- `staff_assignments`
- `feature_flags`
- `system_settings`
- `audit_events`
- `content_entries`
- `content_revisions`
- `media_assets`
- `media_approvals`

Do not create every future table in one enormous migration.

### Security requirements

For every table:

1. Decide whether it belongs in an exposed or private schema.
2. Set explicit database grants.
3. Enable RLS where applicable.
4. Write one policy per operation.
5. Test both allowed and denied access.
6. Test direct URL/ID manipulation.
7. Ensure role assignment cannot be changed through user-editable metadata.
8. Keep secret credentials server-only.
9. Use private storage for confidential files.
10. Log consequential actions.

### Required documentation before feature coding

For every module, document:

- actors
- permissions
- states
- allowed transitions
- fields
- validation
- deadlines
- files
- emails
- audit events
- failure states
- retention
- acceptance tests

### Exit criteria

- The central permission model exists.
- Negative authorization tests pass.
- Database migrations reproduce the local environment.
- Synthetic seed data creates the main roles.
- No “admin” flag in editable profile data controls access.

---

## Stage 3 — Design system

### Visual foundation

Use the approved system:

- Royal purple `#3B1E6D`
- Warm gold `#C9A24A`
- Ivory `#F8F6F0`
- Soft lilac `#DCCFF0`
- Deep ink `#1F1930`

Typography:

- DM Sans 600/700 for English headings and actions
- Inter 400/500 for English body text, dates, and schedules
- Noto Sans Arabic for Arabic content

### Component inventory

Build and approve:

- Container
- Section
- Header
- Mobile navigation
- Footer
- Button variants
- Text link
- Language switch
- Hero
- Section heading
- Content split
- Stat block
- Program/session row
- Speaker profile
- Sponsor strip
- Announcement item
- Accordion
- Tabs
- Form field
- Select
- Checkbox/radio
- File upload
- Step indicator
- Status badge
- Alert
- Empty state
- Loading skeleton
- Dialog
- Table
- Pagination
- Toast
- Error summary

Avoid a generic card-heavy layout. Use typography, spacing, imagery, and editorial composition.

### Motion rules

- Native browser scrolling
- Smooth anchor jumps only
- No scroll hijacking
- 180 ms button interaction
- 1–2 px hover lift
- 98% pressed scale
- 400 ms one-time section reveal
- 12 px rise and short fade
- visible focus ring
- reduced-motion alternative
- 44 px minimum touch targets

### Hero implementation order

1. Static poster and correct content hierarchy
2. Responsive crop
3. Pause control
4. Reduced-motion behavior
5. Low-bandwidth fallback
6. Optimized muted video
7. Contrast testing across representative frames

Do not make the registration or main navigation depend on video loading.

### Design review route

Create a protected staging-only `/design-system` page containing all components and states in:

- English LTR
- Arabic RTL
- mobile
- desktop
- keyboard focus
- error/disabled/loading states

### Exit criteria

- Design lead approves the staging design-system route.
- All core components work in RTL.
- Contrast, focus, touch targets, and reduced motion pass.
- No content page has invented final content.

---

## Stage 4 — Public website alpha

### Route map

```text
/[locale]
/[locale]/about
/[locale]/dates-venue
/[locale]/program
/[locale]/speakers
/[locale]/workshops
/[locale]/participate
/[locale]/participate/abstracts
/[locale]/participate/hackathon
/[locale]/participate/three-minute-thesis
/[locale]/teams
/[locale]/sponsors
/[locale]/gallery
/[locale]/announcements
/[locale]/faq
/[locale]/contact
/[locale]/privacy
/[locale]/terms
```

### Homepage sequence

1. Cinematic hero
2. Conference identity, date, and location
3. Purpose and positioning
4. Conference highlights
5. Scientific program preview
6. Featured speakers
7. Research and competition opportunities
8. Important dates
9. Previous editions and legacy
10. Sponsors and institutional marks
11. Main call to action
12. Footer

### Alpha rules

- Build with approved placeholder/synthetic content.
- Mark closed workflows clearly.
- Do not create dead buttons.
- Do not publish unresolved dates as facts.
- Keep public content accessible without login.
- Add metadata, sitemap, robots configuration, and social preview.
- Use optimized images and a static hero poster before final video.

### Exit criteria

- Every public route exists.
- Navigation works in both languages.
- No login is needed to browse program/workshop availability.
- Broken and unpublished content is not indexable.
- Mobile and keyboard checks pass.

---

## Stage 5 — Structured CMS and public launch

### CMS scope

Editors manage structured records rather than arbitrary page-builder blocks:

- homepage sections
- dates and countdown
- About
- announcements
- speakers
- program
- workshops
- sponsors
- committees and board
- FAQs
- contact information
- gallery and albums

### Workflow

- draft
- preview
- publish
- unpublish
- restore deleted content
- revision history
- media approval

Media publication requires explicit approval even when ordinary copy can be published by an authorized editor.

### Public-site release gate

Before production launch:

- branding approved
- content approved
- English and Arabic navigation complete
- privacy and terms complete
- contact route tested
- CMS secured
- media permissions checked
- accessibility tested
- performance tested
- monitoring enabled
- database and storage backup process tested
- ownership and release approval recorded

### Exit criteria

- Editors can update approved content without code deployment.
- Draft previews are private and not indexed.
- Public launch does not accidentally open unfinished forms.

---

## Stage 6 — Authentication and participant dashboard

### Build order

1. Account creation
2. Email/password sign-in
3. Six-digit verification flow
4. Resend and attempt limits
5. Password recovery
6. Session handling
7. Participant profile
8. Language persistence
9. Dashboard shell
10. Privileged MFA
11. Staff role assignment and offboarding

### Dashboard sections

- Overview
- Registration
- Payments
- Submissions
- Workshop bookings
- Tickets
- Certificates
- Profile
- Support

Only display a module when it is enabled and relevant.

### Security requirements

- Server-side permission checks
- Database-layer enforcement
- Generic account-recovery responses
- No account enumeration
- Recent authentication for sensitive actions
- Privileged MFA
- auditable role changes
- revoked staff access tested directly

### Exit criteria

- Unverified users cannot register, submit, pay, or book.
- Participants cannot access another participant’s records.
- Privileged routes fail for revoked roles.
- English/Arabic switching does not lose form data.

---

## Stage 7 — Abstract submission and scientific review

### Applicant vertical slice

- Eligibility screen
- Study-type selection
- Structured abstract template
- Live 300-word count
- Authors and multiple affiliations
- PI, corresponding author, and presenter fields
- Ethics status
- Similarity report
- Allowed administrative files
- Autosave
- preview
- final submission
- immutable submitted snapshot
- stable display reference
- withdrawal
- revision request
- revised snapshot
- stage-two final materials

### Administrative vertical slice

- readiness validation
- evidence validation outcome
- specialty categorization
- anonymized packet generation
- reviewer assignment
- conflict/decline handling
- review tracking
- decision preparation
- batch preview
- authorized publication
- oral/poster allocation
- final-material request

### Reviewer vertical slice

- assigned submissions only
- identity-free content
- rubric version
- draft review
- submitted review
- edit until lock
- conflict declaration
- decline

### AI assessment

Implement last, not first.

Required controls:

- disabled feature flag by default
- approved provider and processing terms
- sanitized scientific content only
- locked prompt/rubric/version
- structured validated output
- prompt-injection resistance
- retries and error state
- cost limit
- administrator disable switch
- no automatic acceptance or rejection
- human independent assessment before revealing AI suggestion

### Exit criteria

- Submission, reviewer, revision, and decision acceptance tests pass.
- Reviewer identities and applicant identities remain protected.
- Failed AI processing does not block human review.
- Files and prior snapshots remain traceable.

---

## Stage 8 — Registration, payment, and workshops

### Registration state machine

```text
draft
→ pending_approval
→ approved_awaiting_payment
→ confirmed
→ cancelled / expired
```

Rejection is a separate terminal outcome. Payment states remain separate.

### Payment architecture

Create:

```text
PaymentAdapter
├── MockPaymentAdapter
└── KAUPaymentAdapter
```

The KAU implementation remains disabled until the responsible unit supplies an approved confirmation/reconciliation method.

Requirements:

- server-calculated amounts
- integer minor units
- zero-value completed orders for valid full discounts
- idempotent confirmation
- no card data in MSRC systems
- no screenshot-based confirmation
- reconciliation queue
- refund states separate from refund request
- late-payment exception after seat expiry

### Workshop architecture

- public catalog
- capacity
- reserved seats
- request timestamp
- manual approval
- temporary hold
- payment/full discount
- confirmed booking
- overlap validation
- waitlist
- time-limited offer
- cancellation
- schedule-change resolution

### Exit criteria

- Concurrent last-seat tests allocate at most one seat.
- A pending or unpaid person receives no valid QR ticket.
- Waitlisting creates no charge.
- Approval cannot exceed capacity.
- The real KAU process has been tested before real money is accepted.

---

## Stage 9 — Hackathon and 3MT

### Shared competition engine

Reuse:

- account
- drafts
- versions
- attachments
- invitations
- notifications
- assignments
- rubrics
- decisions
- final materials
- judging
- awards
- audit

Do not reuse abstract-specific rules automatically.

### Hackathon confirmed baseline

- Research-to-impact theme
- two tracks
- solo or preformed team
- no automatic team matching
- up to five participants in a team
- cross-university teams
- title
- English 300-word pitch
- new ideas only
- two independent pre-event reviewers
- orientation
- day-one mentoring
- day-two final pitch
- five-minute pitch
- three-minute Q&A
- idea and pitch required
- prototype encouraged, not required

Keep unresolved finalist accounting, cross-mode duplicate rules, detailed files, rubric, fees, prizes, IP, recording, spoken language, and certificate evidence closed behind configuration gates.

### 3MT

Create the technical module only after the lead approves:

- eligibility
- evidence
- form
- file limits
- stages
- presentation rules
- rubric
- judges
- awards
- certificate evidence

### Exit criteria

- Solo and team behavior pass separate tests.
- A sixth team member is rejected.
- Pre-event reviewer views remain anonymized.
- No national ID or automated WhatsApp behavior is introduced.

---

## Stage 10 — QR, attendance, surveys, and certificates

### QR and check-in

- opaque unpredictable credential
- entitlement-based, not personal-data payload
- phone-compatible secure camera access
- manual lookup alternative
- correct outcomes for invalid, wrong day, unpaid, revoked, duplicate, and unknown tickets
- staff scope by day/activity
- audit and correction history
- rehearsed outage procedure

### Attendance

- one valid conference check-in per day
- no checkout requirement for ordinary attendance
- workshop check-in
- separate workshop completion sign-off
- individual hackathon activity evidence where required

### Surveys

Keep two systems separate:

1. participant-linked completion ledger
2. feedback answers without retained account-to-answer linkage

Do not put participant identifiers into answer records, exports, logs, or correlation mappings.

### Certificates

- full two-day conference attendance only
- no one-day ordinary certificate
- workshop certificate from its own evidence path
- separate role/competition certificates
- eligibility calculation
- administrator release
- opaque public verification code
- correction
- revocation
- reissue

### Exit criteria

- Full event rehearsal passes on actual staff phones.
- Duplicate scans do not create duplicate credit.
- Survey retry gives completion once without linking answers.
- Certificates cannot be issued before approval.
- Public verification exposes only approved fields.

---

## Stage 11 — Quality, security, and operational readiness

### Automated checks on every pull request

- lint
- type-check
- unit tests
- database/RLS tests
- production build
- selected integration tests
- dependency review

### Staging checks

- end-to-end workflows
- English and Arabic
- LTR and RTL
- keyboard
- screen-reader feedback
- reduced motion
- mobile devices
- uploads
- direct-ID attacks
- role revocation
- email jobs
- audit events
- load tests
- backup restore

### Required test families

- happy path
- invalid input
- unauthorized access
- expired deadline
- duplicate request
- retry after browser close
- race condition
- provider outage
- email failure
- file scan failure
- rollback/recovery
- Arabic layout
- accessibility
- mobile check-in

### Exit criteria

A feature is not done because the happy path works. It is done when:

- requirement is implemented
- permissions pass
- state transitions pass
- Arabic/English checks pass
- accessibility passes
- failure paths pass
- audit/email behavior passes
- staging UAT is recorded
- runbook and owner exist
- production configuration is verified

---

## Stage 12 — Publishing workflow

For every change:

1. Create a ticket.
2. Write acceptance criteria.
3. Create a feature branch.
4. Implement the smallest complete slice.
5. Run local checks.
6. Open a pull request.
7. Review code, migrations, RLS, UI, and tests.
8. Use the Preview deployment.
9. Merge into `staging`.
10. Run integrated staging UAT.
11. Record release-gate evidence.
12. Merge into `main`.
13. Vercel creates the production deployment.
14. Run production smoke tests.
15. Monitor errors and queues.
16. Roll back immediately if a critical failure appears.
17. Complete post-release notes and ownership handoff.

Never apply an unreviewed production database change directly from an AI agent.

---

## Stage 13 — Polish and optimization

Polish in this order:

### 1. Information clarity

- remove repeated copy
- make deadlines and states unmistakable
- improve Arabic/English equivalence
- improve calls to action
- eliminate dead ends

### 2. Workflow usability

- autosave feedback
- progress indicators
- error summaries
- recovery after interruption
- mobile forms
- accessible uploads
- confirmation screens

### 3. Visual refinement

- final conference footage
- responsive cropping
- editorial spacing
- speaker and sponsor media
- controlled wave motif
- refined hover/press/focus states
- balanced desktop/mobile composition

### 4. Accessibility

- keyboard order
- focus visibility
- semantic headings
- labels and errors
- screen-reader announcements
- contrast
- text resizing
- reduced motion
- Arabic directionality

### 5. Performance

- video compression and poster
- image sizing and responsive delivery
- server rendering and caching
- bundle review
- slow-query review
- loading skeletons
- low-bandwidth behavior

### 6. Operational efficiency

- bulk actions with preview and confirmation
- clear reviewer workload
- visible failed jobs
- reconciliation queues
- exports
- event-day shortcuts
- scanner usability

### 7. Evidence-led refinement

Use:

- support inquiries
- failed form events
- abandonment by step
- accessibility findings
- device/browser issues
- organizer feedback
- event rehearsal findings

Do not collect unnecessary personal data for analytics.

---

## 6. Recommended first implementation cycle

### PR-001 — Repository and quality baseline

- Next.js project
- README
- scripts
- lint/type-check/test/build
- branch rules
- issue templates
- `.env.example`

### PR-002 — Local Supabase and environments

- Supabase initialization
- local seed
- environment wrappers
- separate browser/server clients
- migration workflow documentation
- no production connection

### PR-003 — Core data and security foundation

- editions
- profiles
- role grants
- audit events
- feature flags
- RLS and grant tests

### PR-004 — Brand tokens and global styles

- palette
- fonts
- spacing
- typography
- focus
- motion
- reduced motion
- RTL base

### PR-005 — Core components

- buttons
- links
- container
- section
- forms
- alerts
- status
- navigation
- footer

### PR-006 — Bilingual route shell

- English default
- Arabic RTL
- language switch
- route structure
- not-found and error pages

### PR-007 — Public homepage static skeleton

- poster-led hero
- page narrative
- approved placeholder content
- no live participation forms
- mobile and reduced-motion behavior

### PR-008 — Remaining public page shells

- all public routes
- sitemap
- metadata
- privacy/terms placeholders clearly marked private until complete

Only after these eight pull requests should account and operational modules begin.

---

## 7. Progress measurement

Use evidence-based progress per feature:

| Score | Meaning |
|---|---|
| 0% | No approved ticket |
| 20% | Requirements, states, and acceptance criteria approved |
| 40% | Schema and interface skeleton implemented |
| 60% | Happy path works locally |
| 75% | Permission, failure, and concurrency tests pass |
| 90% | Staging UAT and operational review pass |
| 100% | Production release, smoke test, monitoring, and runbook complete |

Never report a feature as 100% because its screen looks finished.

---

## 8. Final definition of success

The finished platform should feel cinematic and premium publicly, but boringly reliable operationally.

A visitor should understand the conference and opportunities without logging in. A participant should always know what they submitted, what state it is in, what action is required, and what deadline applies. A reviewer should see only assigned anonymized work. An organizer should have controlled, auditable tools rather than database access. Event staff should be able to admit people quickly without seeing unnecessary data. The next MSRC team should inherit organizational accounts, documentation, migrations, runbooks, and a recoverable system rather than a developer’s personal project.
