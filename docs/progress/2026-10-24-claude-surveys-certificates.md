# Task n12 — Surveys and certificates — 24 October 2026

Decision **ENG-075**. Requirements **CRT-01..06**, **AT-14**, related CHK-03/04,
WKS-01/07, SEC-01/02/06 and LOC-01/03. Worktree `C:\m\codex-n12`, existing
branch `claude/surveys-certificates`, built on the workshop-booking work already
present. Leave all changes uncommitted for Claude. `docs/PROGRESS.md` is unchanged.
No branch/commit/push, hosted migration/settings seed, feature activation,
participant opening or real email occurred.

## Starting audit and implementation

Read AGENTS, PROJECT_BRIEF, current decisions/progress, DESIGN_GUIDE and v0.5
section 12 plus attendance/workshop requirements. The starting worktree was clean.
Attendance uses the existing tickets/attendance tables and configured
`conference_days`. The prior workshop task provides confirmed booking, separate
check-in/completion and conflict evidence; that remains the authority for workshop
eligibility. Registration supplies current native-session locking and server-only
participant transport. The outbox supplies durable held jobs and an authenticated
drain. The certificate feature directory was previously an inert placeholder.

Implemented:

- Review-only `20261024130000_surveys_certificates.sql`: private forced-RLS
  tables, no client table policies/grants, explicit RPC grants, empty definer
  search paths, READ COMMITTED guards, scoped current staff authority and
  participant native-session/account locks. Settings and workflows default off;
  no survey questions, prices, dates, capacity, people, signature or approvals
  are seeded.
- Empty editable bilingual survey templates with rating scales, single choices
  and short text. Approved question sets and explicit deadlines precede
  publication. Completed question sets cannot be rewritten. Answers contain
  only survey/question/value/date; completion contains only survey/account
  membership. No response grouping/mapping, reusable token, submission audit,
  operation fingerprint or precise answer timestamp is retained. Retries accept
  the first committed submission once and add no completion credit or answers.
  Detected self-identifying name/email, email/IP/UUID text is rejected; the form
  warns against identifying content and points personal follow-up to Contact.
- Exactly two ordinary kinds. Conference requires both valid configured-day
  check-ins plus the general survey. Workshop requires its confirmed booking,
  check-in, authorized completion and survey; it does not require the full
  conference certificate. Preview excludes already pending/issued certificates
  and matches current account restrictions. Missing evidence is explained EN/AR.
- Super Admin template/signature approval and batch release; edits reset
  approval. Both actions require the reviewed template version under the row
  lock, and the dialog retains that version; stale review cannot approve an
  unseen edit. Immutable release/template snapshots, operation IDs and separate
  durable PDF leases preserve retries. Current account/evidence is rechecked
  before delayed issuance, so undone attendance cannot slip through. Interrupted
  rendering leaves pending work recoverable by the existing authenticated drain.
- Server-generated single-page purple/gold PLACEHOLDER PDFs, embedded Latin and
  Arabic fonts, recipient/type/edition/activity/opaque code and approved text
  signature. PDFKit 0.20.2 and PDF-only static Inter/Noto Sans Arabic 5.3.0 were
  verified and pinned with the lockfile. Existing variable fonts failed an actual
  Fontkit-subsetting test; static fonts resolved it. Next traces the two fonts
  into both generation routes and keeps PDFKit server-external.
- Private bounded PDF bytes in PostgreSQL, owner-only download through My MSRC;
  no public bucket/download token. Minimal public EN/AR verification shows only
  name/type/edition/activity/validity using opaque 64-hex codes, no directory.
  Rate counters retain an HMAC IP bucket without code/response/actor linkage.
  Metadata and headers enforce noindex/noarchive, private/no-store and
  no-referrer; the route remains outside public analytics.
- Participant correction requests, authorized staff rejection/revocation and
  Super Admin approval/reissue. The original stays replaced/revoked with audit.
  Role/competition certificates remain an explicit separately approved extension
  point. No ordinary one-day certificate, hours field or accreditation claim.
- English `certificate_notice` v1 DRAFT messages queue transactionally only when
  a PDF issues. SQL hold and independent worker denial prevent delivery,
  including frozen snapshots. ENG-075 records the task's narrow English-email
  override; other participant messages retain ORG-059 bilingual behavior.
- Bilingual participant and staff screens, empty-survey editing, counts without
  answers tied to identities, eligibility preview, template approval/release,
  corrections/revocations, RTL, keyboard controls, bounded mobile table scroller
  and centered release dialog. Missing pending RPCs show area-not-ready and keep
  sessions. My MSRC navigation remains gated.
- Separate unset feedback/private-download/public-verification retention values;
  expiry denies reads. Bounded feedback/PDF deletion runs in the incumbent drain,
  without installing a scheduler. CI includes strict certificate-schema lint,
  the new browser suite and isolated database-concurrency cases.

## Privacy and release limits

The tested unlinking boundary is the **application schema/API**, including
application Super Admins: they cannot read raw answer storage or recover a
response mapping. This does not erase physical PostgreSQL `xmin`, WAL/backups,
infrastructure logs or arbitrary identifying free text. Unrestricted database
operators could correlate physical transactions. Approving the unlinking threat
model, log access/suppression/retention and small-group/question review is a
separate activation gate; `unlinking_approved` remains false. Do not represent
this closed implementation as anonymous against database operators.

Public verification and PDF access expiry are separate. Certificate identity and
audit redaction beyond that expiry still needs approved privacy policy before
issuance; expiration is not claimed to delete every identity record. Approved
questions/deadlines, retention, signature/artwork, English email wording,
independent database/runtime enablement, participant release gates and human
inbox/device UAT all remain unopened. No mock or synthetic flow is production
evidence. [Feature notes](../features/SURVEYS_CERTIFICATES.md).

## Verification actually observed

Final commands/results are recorded below. Full managed Supabase database checks
require disposable Linux CI; this machine has no local Docker stack.

| Result | Command / evidence |
| --- | --- |
| PASS | `pnpm check`: ESLint without warnings, generated route types/TypeScript, **4,902 Vitest cases in 113 files**, production build with **120 generated pages**. Final log `.tools/n12-check.log`. |
| PASS | `pnpm exec vitest run tests/unit/certificate-contracts.test.ts tests/unit/certificates-server.test.ts tests/unit/certificates-staff.test.ts tests/unit/staff-action-summary.test.ts`: **124 cases**. Includes all-role server permissions, current-session/CSRF/origin gates, missing-RPC session preservation, private download, minimal verification, DRAFT worker denial, lease recovery, review-version validation and bounded PDF generation. |
| PASS | `pnpm install --frozen-lockfile --ignore-scripts`; Node **24.21.0**, pnpm **11.19.0** match the engines. Temporary PDF-review tooling is not retained in the root dependency manifest/lockfile. |
| PASS | PostgreSQL parser: **63 migration statements**, **177 pgTAP file statements** after removing psql include directives. This proves syntax, not live Supabase behavior. |
| PASS | `node .tools/sql-parser/smoke.cjs`: actual migration/PLpgSQL in isolated PGlite with compatibility stubs for incumbent dependencies. Asserted survey submit/retry, identifying-text rejection, missing/stale review versions, release, generation, evidence undo, newline-free PDF download, five-field verification, correction/replacement and retention. Log `.tools/sql-parser/smoke.log`. This does not prove native Supabase authority, RLS integration or concurrency. |
| PASS | `cmd /c "node .tools/certificates/servers.mjs run > .tools/certificates/playwright-final.log 2>&1"`: **24 passed, 18.2 seconds, exit 0**, zero skips/retries. Same canonical test file/projects/ports, using a local server-lifecycle helper as explained below. EN/AR desktop and 360px mobile; verification privacy/noindex/revoked/replaced/rate limits, all three survey types and reload, missing migrations, staff approval/release/version binding, preserved retry IDs, modal bounds and keyboard table scrolling. |
| PASS | **14 final browser PNGs** under `test-results/certificates/`: verification, active survey and batch review in both languages/viewports, plus EN/AR mobile eligibility scrollers. Independent visual review confirmed RTL, heading hierarchy, centered/bounded modal, readable fields and no page overflow. |
| PASS | `node --conditions=react-server .tools/pdf-review/render.mjs`: two synthetic one-page PDF samples rendered via Mozilla PDF.js and visually inspected in EN/Arabic-name variants. Samples and PNGs remain in `.tools/pdf-review/`. Unit coverage also generates long mixed-script names without extra pages. |
| PASS | `git diff --check`; `git diff --exit-code -- docs/PROGRESS.md`; existing branch remains `claude/surveys-certificates`. Generated `next-env.d.ts` reference churn restored after final checks. |
| BLOCKED / NOT RUN | Managed Supabase `pnpm db:test`, `pnpm db:lint` (`--fail-on warning`) and `CERTIFICATE_DB_TESTS=true pnpm exec vitest run --config vitest.integration.config.ts tests/integration/certificate-concurrency.test.ts`. No local Docker. **126 pgTAP assertions** and **six real concurrency cases** are prepared for CI, not reported as passed. |
| Collection only | Isolated integration collection via `.tools/certificate-integration-collect.config.ts` collects six cases, intentionally SKIPPED outside the guarded Linux GitHub CI stack. |
| NOT TESTED | Hosted migration, deployment, production verification, real inbox delivery, real participants, physical phones and assistive-technology/PDF-reader UAT. |

The first canonical Playwright attempt completed all 24 assertions but hung while
Windows attempted descendant-process teardown; stopping only the four exact owned
fixture services allowed it to print the summary, with shell exit 1. Its log remains
`.tools/certificates/playwright.log`. The initial local lifecycle experiment then
lost detached servers when its execution ended, producing connection failures
before assertions; `.tools/certificates/playwright-manual-initial.log` is retained.
The final helper keeps direct child handles alive while awaiting the runner and
stops those exact four owned children afterward. Final runner exit was 0. No
assertions, retries, timeouts or fixed ports were weakened; canonical CI retains
normal Linux webserver lifecycle behavior. No unrelated jobs were stopped.

The new isolated CI cases cover concurrent completion retry, batch deduplication,
exclusive generation leases, revoke-before-finish, finish-before-revoke and a
template edit holding the lock before stale approval/release. Browser mocks and
the PostgreSQL WASM compatibility smoke do not substitute for those checks.

Next task: run the new migration, strict lint, pgTAP and six concurrency cases in
disposable Linux CI and review any failures before integration. Operational
activation remains a separate privacy/retention/question/template/email and human
release review; all gates stay closed.
