# Architecture and implementation baseline

## Decisions versus recommendations

| Layer | Baseline | Authority |
|---|---|---|
| Application hosting | Managed Vercel | Selected, S1 INF-01 |
| Database, identity, private files | Managed Supabase | Selected, S1 INF-01 |
| Payment collection | Existing authorized KAU arrangement through a verified integration or approved reconciliation procedure | Selected P1; contract pending, PAY-01 to PAY-08 |
| Ownership | Organizational MSRC/RPClub accounts with institutional authorization | Selected O1; evidence/custodians pending |
| Web framework | Next.js App Router, TypeScript, Tailwind | Adopted for local M1 by explicit user task; ENG-001 in DECISIONS.md |
| Package management | pnpm with committed lockfile | Adopted for local M1; exact versions and compatibility notes in ENG-001 |
| Data environments | `ecemjggwlzqpjcwmchrl` is Production; synthetic database tests in isolated GitHub CI; local auth lab in memory | ORG-010; no hosted fixtures; new staff/session migration review-only |
| Managed Auth tests | Genuine password/authenticator-TOTP APIs and staff HTTP/cookie composition in disposable GitHub CI; private reject-email hook, no SMS configuration/hook/provider or paid hosted setup | ORG-016; executed receipts in PROGRESS; live email, recovery, named custodians and human UAT remain gates |
| Regular staff check | Password then a private user/session-bound application email receipt; no native AAL2; service-only issuance/consume and restrictive RLS predicate. Optional Windows loopback synthetic preview can send a code to the approved test self-inbox without disclosing it in API responses | ORG-015; production SMTP/sender unconfigured, review-only migrations, local preview and no deployment |
| Tests | Vitest, appropriate component tools, Playwright, database policy tests | Recommended tooling; verify compatibility at foundation time |
| Email, malware scanning, advisory assessment, analytics | Provider selection and approved configuration required | Unresolved CFG-10 |
| Versions, regions, plans, budget | Choose and record explicitly before relevant provisioning | Unresolved; no claims of Saudi hosting |

Do not substitute a new payment merchant or a third-party hosted video embed for the selected scope. Do not create paid resources simply because this document names a provider.

## Actual foundation layout and reserved boundaries

The M1 structure follows **Stage 2 — Architecture and security baseline / Establish
the application boundaries** in the archived
[development playbook](../sources/previous_starter_pack/MSRC27_Website_Development_Playbook.md).
The tree below distinguishes running code from reserved directories. Each reserved
directory contains only a `README.md`: it adds no executable route, handler, component,
database table or operational behavior. These placeholders preserve the intended feature
boundaries in a clean clone without implementing later milestones.

```text
src/
  app/
    [locale]/
      (preview)/             existing safe public homepage/About and loading boundary
      design-system/         existing local/staging component showcase
      (auth)/                closed loopback-only staff security lab; all deployments deny
      dashboard/             reserved
      reviewer/              reserved; future assessment screens English-only
      admin/                 reserved
      check-in/              reserved
      [...path]/             existing unavailable-route 404 boundary
      layout.tsx             existing English/Arabic document and shared shell
      error.tsx              existing localized sanitized error recovery
      not-found.tsx          existing localized not-found convention
    api/                     existing process health and closed-workflow denial only
    global-error.tsx          existing bilingual root-failure recovery
  components/
    ui/                      existing shared interface primitives
    brand/                   reserved
    forms/                   reserved
    data-display/            reserved
    feedback/                reserved
  content/                   existing typed public draft copy
  features/
    content/                 reserved
    auth/                    local synthetic email/authenticator lab and disabled TOTP provider contract
    registration/            reserved
    payments/                reserved
    submissions/             reserved
    review/                  reserved
    workshops/               reserved
    hackathon/               reserved
    three-minute-thesis/     reserved
    program/                 reserved
    attendance/              reserved
    surveys/                 reserved
    certificates/            reserved
  lib/
    supabase/                anonymous clients; server-only verified own-context adapter
    permissions/             BL-SEC-01 typed contract/evaluator; production reader pending
    validation/              reserved
    email/                   optional Windows loopback isolated staff-code test bridge; no production provider
    payments/                reserved
    jobs/                    reserved
    audit/                   reserved
    i18n.ts                  existing locale helpers and interface dictionary
    workflows.server.ts      existing hard-closed server guard
  config/                    existing typed unknown values and workflow identities
  styles/                    existing working design tokens and public preview styles
tests/                       existing Vitest unit and Playwright E2E suites
supabase/
  migrations/                CI foundation fixture plus closed private authorization schema
  schemas/                   reserved; declarative schema paths remain disabled
  seed.sql                   existing synthetic development records
  tests/                     existing pgTAP permission tests
scripts/                     existing Windows runtime/start helpers
docs/                        decisions, feature contracts, backlog and evidence
.github/                     existing CI definition; no deployment
```

Three deliberate naming/layout differences preserve the established code:

- The playbook's `(public)` group is the existing `(preview)` group. Its layout validates
  the locale before its loading boundary can stream, preserving real HTTP404 responses
  for unsupported locales. The group name is not a URL segment or a release approval.
- Tests remain at repository-root `tests/`, as configured by Vitest and Playwright and
  already used in CI, instead of duplicating the playbook's `src/tests/` directory.
- Locale utilities remain in `src/lib/i18n.ts`; an empty parallel `lib/i18n/` directory
  would duplicate an existing boundary without adding behavior.

Existing M2 and public previews are preserved, not rebuilt as part of M1 verification.
The playbook remains historical guidance: its example `FEATURE_CMS=true` does not
override the current requirement that every operational workflow, including CMS editing,
is closed. Its later cross-cutting schema suggestions do not authorize M1 account,
permission, content or operational tables. No secret key is needed for the anonymous
local data clients. Source v0.5 and explicit current task instructions take precedence.

Authenticated interfaces still require server and database checks. URL groups and hidden
buttons are organizational aids, not permission boundaries. Empty reserved folders are
not evidence that any later feature is implemented, tested or approved for release.

BL-AUTH-01 adds a [closed persisted context](features/persisted-authorization.md): private
account-access, scoped grant and audit metadata, plus a self-only current managed-session/
assurance lookup. The deployed historical migration used TOTP; earlier review-only SMS policy snapshots remain preserved. ORG-016's additive review override now requires password and verified email only for participants, ORG-015's private session-bound application email receipt for regular staff, and password then current authenticator TOTP for Super Admins. Its verified server adapter returns no resource facts, scientific assignments or operational authorization. Both readiness flags and session activation stay false.
The [staff security foundations](features/staff-security-foundations.md) add review-only database policy and a local synthetic email/authenticator lab. AUTH-05 retains participant72h maximum and privileged30min idle/8h absolute; refresh never restarts origin or counts as activity. Recovery/live lifecycle and feature-specific protected-resource integration remain gates.

Hosted deployment applies only reviewed application migrations; `foundation_samples` and
the seed remain isolated development/CI fixtures. Never run an unqualified hosted reset,
seed or full migration push. Successful empty-schema deployment does not settle staff
appointments, privacy/retention, annual isolation, custodians or production region approval.

## Data domains

Preserve the source's separate records. [S1 DAT-01 to DAT-04]

- Identity: managed account, profile, edition-scoped grants, scoped assignments, consent, privacy/support-request evidence.
- Science: submission, immutable version, author and affiliation order, PI/corresponding/presenter responsibility, attachments, administrative validation, rubric version, review assignment, conflict, human review, assessment suggestion, revision, prepared decision, publication batch, presentation allocation, judging, award.
- Operations: registration, order and item snapshots, payment attempts and official reconciliation evidence, refund progress, discounts/redemptions, workshop, holds, waitlists/offers, booking, ticket, daily/activity attendance and correction, workshop completion sign-off.
- Feedback and certificates: participant-linked survey completion ledger, separately stored unlinked answers, eligibility, template, release batch, protected certificate file, opaque verification code and validity.
- Content/communications: rooms/sessions/speakers, content revision/publication, media approval and consent evidence, sponsor inquiries, email jobs, audit events.
- Hackathon: project entry, solo/team mode, registered roster, pre-event review, committee acceptance, post-acceptance member confirmation, participant-level compulsory activity evidence.

The feedback domain requires a privacy-reviewed unlinking design. Merely putting identity and answers in separate tables is insufficient if tokens, mapping tables, timestamps, logs, or exports reconnect them. Do not invent a completion-token protocol without evaluating retry behavior and unlinkability. [CRT-02]

## Mutation contract

Every consequential operation should specify: actor and scope, allowed source state, server validation, new state, concurrency/idempotency behavior, audit record, queued notification, and recovery path. [API-01 to API-03]

Examples:
- Approval allocates an available seat atomically; financial completion is a separate condition for a confirmed ticket.
- A finalized submission is an immutable snapshot; a revision creates a new snapshot and re-review is explicitly decided.
- A decision may be prepared internally. Only authorized publication changes the applicant-visible outcome and creates decision emails.
- A workshop waitlist offer rechecks eligibility, overlap, approval, and financial completion before confirmation.
- Repeated scans cannot create duplicate attendance or satisfy another day.

Use server time for all deadlines. Store instants in UTC; display Asia/Riyadh. Allocate scarce seats transactionally and use explicit edit-version checks for competing updates.

## Integration boundaries

### KAU payments

Define a provider-independent adapter contract after reviewing the real KAU interface. During development use synthetic mock transactions and display their test status. Do not invent callback fields or webhook support. Positive-value confirmation requires authenticated official system evidence or authorized reconciliation against the KAU record, matching order, amount, currency, and reference. A redirect or uploaded receipt is insufficient. Late payment after hold expiry requires reconciliation/refund handling without overbooking. [PAY-04 to PAY-07]

### Email and jobs

Use durable persisted jobs with deduplication keys, bounded retries, delivery status, and authorized replay. Keep console/test-recipient mode in local/staging work. Transactional messages are English-only. Queued, provider-accepted, delivered, and failed states must be distinct. [EML-01 to EML-05]

ORG-016 removes authentication phone collection/verification and SMS. Participants require verified email/password, regular staff require the private exact-session application email check (not email OTP sign-in/native AAL2), and Super Admins require password plus managed authenticator TOTP. Current native factor/session/password proof must match; stale/phone/generic AAL2 evidence denies. There is no configured live SMTP/provider/sender or fallback development email. The local preview uses ephemeral test email messages and one-time transient QR/manual TOTP setup; no real messages are sent. English-only email and all privacy/location/recovery release gates remain.

### Advisory assessment

Use a separate job interface that receives approved sanitized science content and returns validated rubric-shaped suggestions. Keep disabled until provider/data/evaluation/cost approvals. Separate human independent reviews from suggestions and committee outcomes. Provider failure falls back to permitted human review. No model output may publish an outcome. [AI-01 to AI-06]

### Files and media

Separate confidential stage-one evidence, authorized stage-two materials, private media originals, and approved public derivatives. Use purpose-specific allowlists, quarantine and scanning, private storage, expiring authorized downloads, and version history. Blind reviewers never receive identity-bearing administrative evidence. [ABS-09 to ABS-15; SEC-03 to SEC-05; MED-01 to MED-04]

## Environments and configuration

| Environment | Data and integrations | Opening state |
|---|---|---|
| Local | Synthetic data; local database where supported; mock payments; console email | Test paths only |
| Preview/staging | Isolated test accounts/storage; recipient-restricted email; approved sandboxes/mocks | Restricted and excluded from indexing |
| Production | Approved ownership/regions/secrets/providers; real processing only after gates | Each workflow separately enabled |

Configuration must distinguish approved business values from engineering defaults. Suggested feature flags: auth, CMS editing, abstracts, advisory assessment, registration, payments, workshops, hackathon, 3MT, check-in, surveys, certificates. All operational flags start closed. Public static content rendering can work without enabling CMS editing. Enforce flags on server operations as well as interface controls.

Keep secret values outside the handoff and source control. Use an implementation-generated `.env.example` containing names and explanations only. A public client key is not a substitute for explicit table/storage grants and row-level authorization. Verify current official APIs, package/runtime support, and installed CLI help at implementation time. [S1 SEC-02/06; S5]

## Operational design before release

- Name responders for service, payment exceptions, queued email, submission failure, file scanning, and check-in.
- Back up database records and actual file objects separately; rehearse restoration of both.
- Preserve deletion/revocation instructions through restore and reconcile outstanding orders/submissions.
- Keep rollback instructions aware of newly received data; redeploying old code is different from discarding database writes.
- Separate annual operational data/configuration while retaining approved archive and certificate verification continuity.

The source's availability/performance/recovery values are objectives to test, not achieved results or provider guarantees. [INF-06 to INF-08; NFR-01 to NFR-03; ARC-02]

## Public content presentation boundary — ORG-005

The public website continues on the existing Next.js App Router, pinned dependencies
and locale layout. `src/content/conference-experiences.ts` contains presentation types,
bilingual copy and pure filters; `conference-catalogue.server.ts` is server-only and
owns the raw session/speaker/workshop/media catalogue. Server pages send only approved
records to interactive clients. Detail lookup also requires an approved record and
otherwise returns404. Do not move raw draft catalogues into a client-imported module.

Current catalogues are empty because publication data is not approved. Programme/media
filters use the URL and language switching preserves query/hash; no-result states do
not imply that future sessions or assets exist. Public media contracts distinguish
playable public files from restricted/pending records without asset URLs. They do not
implement recording entitlements, uploads or CMS editing. All existing server workflow
gates remain closed; information journeys perform no operational mutations.

ORG-006's `CinematicFilm` reframes the existing homepage hero rather than mounting a
second player. Local browser events communicate explicit viewing intent to `HeroMedia`;
the `#film` history state, inert reading layers, contained focus and restored opener
are presentation state only. No API, media entitlement or persisted record is added.
