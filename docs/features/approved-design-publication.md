# Approved design publication

The requester approved the reviewed EN/AR demo and explicitly asked to bring it
into the live version on 11 October 2026. This approval covers the demonstrated
public design, selected event photographs and city derivative. It does not open
registration, accounts, payments, submissions, bookings or other operations.

## Runtime audit

- The historical `(preview)` route-group name does not restrict public pages.
  Its layout validates the locale only. The homepage and public information pages
  render the approved components in genuine Production without preview flags.
- The opening film already uses approved `/media/msrc2026/` derivatives. Selected
  photographs, artwork and cropped Jeddah footage live under `/media/msrc-demo/`.
  Keep these stable URLs; the directory name is not a runtime permission gate.
- No widening of `preview.server.ts`, `media-policy.ts`, private media API,
  authentication, authorization, content publication or workflow gates is needed.
  Do not enable preview flags in Production as a means of publishing this design.
- `/design-system`, localized component workshops, `/hero-preview` and unpublished
  montage delivery remain denied on Production even if preview flags are set.
  Private originals stay outside `public/`; only selected public derivatives ship.
- Approved public metadata retains canonical EN/AR links and Production-only
  indexing. Public navigation uses Program and Our Team; the removed About route
  remains absent. Workshop/speaker/catalogue records still require publication
  approval; synthetic fixtures are not introduced into public data.

## Content boundaries retained

- The graphic **7 CME** remains visibly and accessibly illustrative. The pending
  accreditation language and structured event facts are unchanged.
- Anonymous speaker/team artwork does not establish an approved 2027 roster.
  Pending names, sessions, workshops, sponsors, prices and operational dates are
  not converted into confirmed information by this design approval.
- Historical figures preserve the scopes and organizer labels in ENG-026.
  Selected photos preserve the provenance recorded in `docs/media/`.
- Ticket and brochure actions stay unavailable while their approved destinations
  or assets are missing. Contact delivery, participant accounts and operational
  workflows retain their independent server-side release gates.

## Verification

`tests/unit/approved-design-publication.test.ts` renders the actual homepage in
both locales with Production environment and no preview flags, checks selected
public asset presence, checks the illustrative CME distinction, and directly
checks denied private review pages with preview flags enabled. Existing media,
catalogue, workflow, contact and account boundary suites remain authoritative for
their separate areas. Build, deployment and live-route receipts belong in the
release entry in `docs/PROGRESS.md`; this audit itself is not deployment evidence.

Observed local checks on 11 October 2026:

- **PASS:** `pnpm exec vitest run tests/unit/approved-design-publication.test.ts
  tests/unit/media-preview.test.ts tests/unit/media-policy.test.ts
  tests/unit/design-contracts.test.ts tests/unit/public-catalogue.test.ts`:
  80 tests across five files, exit 0.
- **PASS:** targeted ESLint for the new test and two comment-only component/content
  edits, with `--max-warnings=0`, no findings.
- Build, hosted configuration, deployment and live HTTP checks are outside this
  focused route audit; no live result is inferred from these local checks.

## Release browser coverage and capacity

The public suite now contains 640 cases. Foundation CI partitions the same suite
across three independent runners using Playwright's native `--shard=1/3`, `2/3`
and `3/3` options. Each runner retains the 20-minute job budget, one browser worker,
zero retries and the existing assertions and test limits. This addresses growing
suite duration without extending timeouts or dropping checks. Each shard builds
the same revision and uploads a uniquely named `public-browser-results-{shard}`
artifact. Matrix failures do not cancel the other shards' diagnostic evidence.

The existing `Lint, types, unit, build, browser smoke` status retains lint, types,
unit tests, build and the full synthetic staff authentication suite. Manual
`auth_stability` runs retain their existing repeated staff checks and omit the
public matrix. Release review must require all three public shard statuses as
well as the existing application and other workflow checks; the application
status alone no longer includes public browser coverage. Repository protection
settings are not changed.

Local validation on 11 October 2026:

- **PASS:** installed YAML parser accepted the workflow; assertions confirmed
  the three-shard matrix, unchanged application status name, full staff command
  and unchanged 20-minute job limits.
- **PASS:** Playwright `--list` reports 214, 213 and 213 cases. Comparing case
  identities against the full listing confirms all 640 appear exactly once,
  with no omissions, duplicates or extra cases. This listing is not a test run.
- **PASS:** all nine targeted staff locale/draft-preservation cases, across
  desktop, tablet and mobile, after migrating three stale language-switch clicks
  to the existing responsive header helper. All draft, storage, assurance and
  transport-failure assertions remain intact. Evidence:
  `.tools/release-staff-locale-browser.log`; no rebuild or retries.
- **PASS:** scoped staff-test ESLint and workflow/test whitespace checks.
- Hosted execution of the new matrix is **PENDING** until the exact-head CI
  receipt in `docs/PROGRESS.md` confirms its result.

## Public regression reconciliation

The first hosted public run exposed two stale design assertions and one real
Arabic styling defect before its job budget expired. The local diagnostic run
reproduced all six affected desktop cases; evidence is retained in
`.tools/release-accessibility-diagnosis.log`.

- The enabled gold-button selector had greater specificity than its Arabic
  override, leaving Arabic text at `-0.16px` letter spacing. Matching the enabled
  state in the Arabic rule restores zero spacing. The original assertion still
  scans Arabic words across all six public routes, unchanged.
- The readability check included the newly added, explicitly `aria-hidden`
  ambient illustration. Its intentional 0.65 opacity and static 180-degree
  rotation are decorative composition, not hidden content or motion. Readable
  Reveal content retains the strict visible/full-opacity assertions. Reduced
  motion now additionally checks the artwork and its descendants for no
  animation or transition, while allowing its static composition.
- Keyword heading markup expresses authored line breaks with `<br>`, which
  `textContent` omits. The Arabic font regression counts those explicit breaks
  alongside newlines and still requires rendered lines to match exactly. Font
  loading, the `1ch` metric, and desktop line-count assertions remain intact.

After the combined source build, **PASS:** the complete `premium-interface` and
`qa-regressions` files produced **68 passed / two intentional mobile skips** in
1.7 minutes, with one worker and zero retries. The skipped cases are explicitly
desktop keyboard traversal tests; both desktop cases passed. These files are
configured for desktop and mobile, not the tablet subset. Command:
`pnpm exec playwright test tests/e2e/premium-interface.spec.ts
tests/e2e/qa-regressions.spec.ts --reporter=list
--output=.tools/release-public-regressions-results` with `CI=true`.
Log: `.tools/release-public-regressions.log`. Scoped ESLint and whitespace checks
also passed. Hosted results remain separate from this local receipt.
