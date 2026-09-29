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
| Local data environment | Local Supabase with a compatible container runtime | Recommended in S5; verify machine support |
| Tests | Vitest, appropriate component tools, Playwright, database policy tests | Recommended tooling; verify compatibility at foundation time |
| Email, malware scanning, advisory assessment, analytics | Provider selection and approved configuration required | Unresolved CFG-10 |
| Versions, regions, plans, budget | Choose and record explicitly before relevant provisioning | Unresolved; no claims of Saudi hosting |

Do not substitute a new payment merchant or a third-party hosted video embed for the selected scope. Do not create paid resources simply because this document names a provider.

## Recommended application layout

Use one maintainable codebase with feature boundaries. The layout below is a proposal for the foundation, not evidence of files already built.

```text
src/app/[locale]/          public, auth, dashboard, admin, reviewer, check-in routes
src/components/           shared accessible interface and brand components
src/features/             content, accounts, submissions, review, registration,
                          orders, workshops, hackathon, 3mt, attendance,
                          surveys, certificates, reporting
src/lib/                  permissions, database clients, validation, i18n,
                          payment adapter, email, durable jobs, audit
supabase/                 migration history, seed data, policies, database tests
tests/                    scoped integration and end-to-end coverage
docs/                     product decisions, feature contracts, release evidence
```

Authenticated interfaces still require server and database checks. URL groups and hidden buttons are organizational aids, not permission boundaries.

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
