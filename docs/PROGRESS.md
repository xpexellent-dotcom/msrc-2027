# Progress and session handover

**Snapshot: 30 September 2026. Update this file after each development task.**

## Current evidence

| Item | Observed status |
|---|---|
| Main File PDF | Reviewed, including all-page visual coverage and extracted text |
| Live Development Specification v0.5 | Read and archived as a dated source snapshot |
| Updated Hackathon Draft | Read and reconciled; options and conflicts preserved |
| Brand guide and previous starter pack | Reviewed; recommendations distinguished from approvals |
| Original Canva brand reference sheet | Text read; palette and English font names corroborated, final brand approval still pending |
| 2026 media folder | Readable metadata inspected; no footage downloaded or rights cleared |
| Codex handoff documents and prompts | Prepared in this package |
| Domain purchase | Reported in project conversation; current account/DNS/renewal not inspected |
| Git / application code | User-authorized private repository xpexellent-dotcom/msrc-2027 created; original five-commit history pushed, origin configured. Institutional production custody remains pending. |
| Local development installation | PASS: exact dependencies installed, frozen lockfile verified, portable Node24.21.0 selected for this host. |
| Windows container prerequisites | WSL3.0.1 and Docker Desktop4.93.0 installed; optional PC fixture tests still require restart/first launch. User now selected direct hosted access for normal work (ENG-006). |
| Vercel/Supabase projects / production secrets | Existing hosted Supabase `msrc` selected by user and connected using its publishable key only. Public schema/migrations empty; no hosted mutation. Vercel not provisioned; no privileged credentials used. |
| Tests / CI / preview / production deployment | Hosted-connection local checks PASS: lint/types/build, 158 final unit tests, 60 browser cases, live service/key check and hosted-test refusal. Earlier Linux database workflow36617162980 passed20 pgTAP/10 integration/advisors/types. Current PR retains that isolated CI. Optional Windows engine untested; no deployment. |
| KAU collection access / email sender | Not verified |
| Implementation backlog | Documentation complete: 152 implementation issues across 24 epics, 13 Decision Required packets; all 212 source IDs mapped. No additional feature implemented or gate opened. |

## Milestone status

| Milestone | Requirements/planning | Implementation | Release |
|---|---|---|---|
| M0 Governance | Baseline and decision register prepared; named owners/evidence pending | Organizational setup unverified | Pending |
| M1 Foundation | ENG-001/004/005/006 adopted; relevant source IDs retained | Hosted connection configured/verified; synthetic Linux database CI retained. Windows local stack optional and untested | Connection foundation only; operational and production release gates remain closed |
| M2 Design system | ENG-007 selects the requested palette/fonts/motion for implementation | Full requested component inventory and bilingual showcase implemented; local verification recorded below | Local/protected-staging preview only; final content/media/human accessibility review pending |
| M3 Public alpha | Full sitemap retained in typed content | Homepage and bilingual About previews implemented; remaining standalone public pages pending | Public launch not approved |
| M4 Staff auth/CMS | Requirements defined | Not verified | Pending |
| M5 Participant auth | Requirements defined | Not verified | Pending |
| M6 Abstract/review | Detailed baseline; configuration gates remain | Not verified | Pending |
| M7 Registration/workshops | Detailed baseline; finance and capacity inputs remain | Not verified | Pending |
| M8 Competitions | Hackathon partly decided; 3MT configuration pending | Not verified | Pending |
| M9 Event operations | Required evidence identified; procedures pending | Not verified | Pending |
| M10 Certificates/archive | A1/S2 selected; templates/privacy implementation pending | Not verified | Pending |
| M11 Handover | Requirements identified | Not verified | Pending |

Do not convert this table to percentage completion without observable evidence. The earlier tracker is a blank template and does not establish implementation.

## Next task

Next smallest PR: select a bounded set of MSRC2026 candidate assets from the reconfirmed
Drive source, record source IDs, intended hero/highlight/gallery/poster placements, captions
and rights/consent evidence, then propose compressed derivatives for review. Do not publish
unreviewed footage. Bilingual homepage/About editorial approval also remains open.

Use the selected hosted Supabase connection for normal development. Windows Docker setup
is optional for PC fixture tests; GitHub retains isolated synthetic database verification.
Any hosted schema feature needs explicit grants/RLS and a reviewed migration, not a copy
of the local synthetic fixture. All operational gates remain closed. See
[hosted connection](features/hosted-supabase.md) for current evidence and
[database/CI verification](reviews/m1-database-ci.md) for earlier local-stack results.
The [implementation backlog](backlog/README.md), DR-CFG-11 ownership and DR-CFG-12
content/brand decisions remain available for later work; no decision was silently resolved.

## 30 September 2026 — Complete M2 component system

Implemented the current requested inventory without adding operational modules: expanded
tokens, shared Section/Link/ContentSplit/StatBlock/ProgramRow, extracted MobileNav/Footer,
native FormField/Select/Checkbox/Radio/FileUpload, Alert/EmptyState/LoadingSkeleton,
controlled Dialog/persistent Toast, semantic Table and pagination. Existing Container,
Header, Button, LanguageSwitch, SectionHeading, StatusBadge and local font setup are reused.
Both English/LTR and Arabic/RTL showcase routes include applicable states. Added gated
`/design-system` alias. All 15 operational flags remain closed; no live data access occurs.

ENG-007 records the latest palette/font/motion implementation decision. Drive metadata and
six root folders were readable again; no new media was downloaded or published. File
selection remains browser-memory-only. No migration, dependency, lockfile or environment
configuration changed. See [scope, full file inventory and rollback](features/m2-components.md).

Verification on the Windows checkout (Node24.21.0 / pnpm11.19.0):

| Command / inspection | Observed result |
|---|---|
| `pnpm check` (lint, route type generation, TypeScript, Vitest, production build) | PASS; final code run has 181 unit tests across 8 files; all routes built |
| `pnpm test:e2e` with local Chromium cache | PASS: 90 desktop/mobile/tablet cases, including 30 focused M2 cases; final full run51.4s |
| Initial 84-case browser run | 78 passed / 6 failed: native dialog Tab boundary plus a broad Arabic status selector |
| Expanded 90-case rerun | 88 passed / 2 failed: alias test expected an exact robots header but existing global config adds `noarchive`; corrected assertion to retain required directives |
| `node .tools/ci/verify-m2-production.mjs` | PASS: `/design-system`, `/en/design-system`, `/ar/design-system` all HTTP404 under `VERCEL_ENV=production`, even with preview flag true |
| `node .tools/ci/capture-m2.mjs` | PASS: English1440px/Arabic390px pages and dialogs rendered, no console errors/framework overlays |
| Screenshot inspection | English desktop and Arabic mobile overview, fields, table and dialog inspected; eight PNGs in ignored `.tools/verification/m2/` |
| `git diff --check`; scoped final test ESLint | PASS; no whitespace errors or lint findings |
| Hosted database/RLS mutation tests | NOT RUN: no database code/schema changed and this UI slice must not mutate live Supabase |
| Windows local database stack | NOT RUN: optional installed Docker still needs first-launch/restart setup; Linux CI provides the isolated fixture check |
| GitHub application/database CI | Pending publication of this M2 branch |

The dialog now cycles available controls while excluding hidden/disabled controls, restores
focus on Escape/backdrop close and preserves native modality. Tests also cover anchor
smooth/instant behavior, touch targets, reduced motion, file clearing/no writes, table
boundaries, local/staging route headers, existing bilingual pages and closed endpoints.
Semantic text colour pairs meet4.5:1; tested control/focus pairs meet3:1. Gold-on-ivory remains
decorative. Automated axe checks include the full showcase and open dialogs.

Local preview: `http://127.0.0.1:3000/en/design-system` and `/ar/design-system`.
For a new terminal use the README. Remote staging requires explicit deployment protection;
no Vercel deployment or production publication was created. Screen readers, real devices,
Safari/Firefox and final Arabic editorial review are NOT TESTED in this slice. Rollback is
the component commit revert; no database action is required.

## 29 September 2026 — Direct hosted Supabase connection

The user requested direct use of live Supabase and supplied the `ecemjggwlzqpjcwmchrl`
API URL. Confirmed existing project `msrc`, ACTIVE_HEALTHY, region `ap-northeast-1`;
public tables and migration history empty; generated public schema empty; security advisor
returned no findings. This records the existing region, not institutional production approval.
No project, key, migration, data record, Auth/Storage setting or paid resource was created.

Added explicit hosted configuration, HTTPS/publishable-key validation, separate default empty
schema and guarded local fixture types, and a read-only hosted connection command. Kept all
15 flags closed. Wrote the existing publishable key and public settings to an ignored local
environment file without printing values. Public pages remain static and database-independent.

The initial Data API root metadata check returned HTTP401 (`Secret API key required`);
this was a restricted metadata endpoint, not a need to add privileged credentials. Switched
verification to public Auth service settings, which accepted the publishable key with HTTP200.
This endpoint creates no user/session or email. A separate constant `SELECT 1` passed through
the authorized connector. No table rows were requested. Local `db:integration` correctly
refused hosted settings before test collection (expected exit1). The per-client local guard
also rejects hosted targets before constructing a client.

Full application/CI evidence and remaining limits are recorded in the
[hosted connection feature note](features/hosted-supabase.md). ENG-006 supersedes the local-only
connection restriction and makes Windows Docker optional for ordinary hosted work. The
source specification, infrastructure ownership and operational release decisions remain intact.
Local verification passed lint/types/build, 158 final unit tests and all 60 EN/AR browser
cases. No page or live data workflow changed. GitHub reruns the isolated Linux database
suite on the associated hosted-connection PR; this never uses the hosted project key.

## 29 September 2026 — Windows runtime installation and hosted CI

The user authorized installation, database checks and CI, then explicitly requested creating
the repository on their GitHub account. Created private `xpexellent-dotcom/msrc-2027`, kept
the existing history and pushed `4f0f37d`. The user approved Git Credential Manager access
and completed GitHub email verification; no token entered source, documents or tool output.

WSL3.0.1 and Docker Desktop4.93.0 per-user installation both exited0. The official Docker
installer's signature and versioned SHA256 matched. Docker CLI29.8.1 is installed, but its
server probe fails because Windows requires a restart to activate Virtual Machine Platform.
No automatic reboot, Docker terms acceptance or managed production resource was performed.

The [initial hosted workflow](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36614744871)
passed in3m30s: application lint/type/unit/build/browser job and local Linux Supabase
startup/reset/lint/20 pgTAP/10 real-client checks/stop. This proves the isolated runner stack,
not this Windows engine. The extended [PR workflow](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36616046623)
also passed all checks and the added security-advisor/generated-type commands. The advisor
reported no issues at its warning/error threshold; generated types passed TypeScript. Manual
comparison matched all table shapes and found four empty schema registries whose key types
needed tightening to the generated form. Applied that compile-time-only correction. See the [verification record](reviews/m1-database-ci.md)
for exact commands, job links and non-failing CLI notices. [PR #1](https://github.com/xpexellent-dotcom/msrc-2027/pull/1)
preserves this focused change for review; no merge or release was performed.

Changed scope: CI verification steps, empty schema registry types, README and ownership/decision/progress/evidence notes.
No application UI, dependency/lockfile, migration, seed, operational flags or business values
changed. ENG-005 distinguishes authorized personal development custody from the unresolved
institutional production handover. Remaining Windows commands are listed above and in README.

## 29 September 2026 — M1-only reproducibility follow-up

Scope: audit and close engineering-foundation gaps in the existing repository. Preserve
M2/homepage/About and the backlog; implement no operational workflow or new public page.
Recorded ENG-004. Corrected local Auth infrastructure configuration so the pinned CLI can
provide its publishable key, while every signup setting and application auth gate stays
closed. Added a safe local-env helper, 20 unit checks, ten live-local client checks and
the database CI steps. Final review corrected reset/pgTAP custom-network flags and kept
credential-bearing CLI startup output out of CI logs. Added 29 README-only playbook
boundaries; these create no routes.
Updated Windows/local setup instructions and feature notes. No dependency, lockfile,
migration, source snapshot, production service, real credential or participant data changed.

Executed evidence:

- PASS: `pnpm install --frozen-lockfile`; `pnpm check` (lint, route types/TypeScript,
  **89 unit tests**, production build); no operational route appeared in the build.
- PASS: `pnpm test:e2e`, **60 tests in 36.8 seconds**, clean exit. An earlier run also
  passed all cases but Windows sandbox process cleanup stalled; only its verified owned
  server was stopped. The rerun with local process permissions resolved that limitation.
- PASS: fresh local Git clone with the current patch, no copied dependencies or environment
  files; frozen install downloaded 400 packages, `pnpm dev --port 3024` started, and eight
  English/Arabic desktop/mobile/navigation/closed-endpoint smoke checks passed. Screenshot
  evidence is in ignored `deliverables/m1-verification/`; the verification server was stopped.
- BLOCKED: `pnpm db:start` found neither Docker nor Podman; WSL is not installed. `pnpm db:env`
  failed safely without creating a file; `pnpm db:integration` exited 1 on missing local
  settings, so none of its ten live assertions executed. pgTAP/reset/lint/types remain unrun.
- NOT TESTED: hosted GitHub CI and deployment; no Git remote or production connection.
- Final file, whitespace, environment and credential-pattern checks are recorded in the
  [M1 review](reviews/m1-foundation.md). Such scans are scoped evidence, not a security certification.

Full command/result details, acceptance matrix, file inventory, remaining setup and rollback
are in [M1 verification](reviews/m1-foundation.md). Local app acceptance passed; local
database and hosted CI acceptance are explicitly outstanding. Preserve this checkout in a
durable project location because its current parent is a temporary preview directory.

## 29 September 2026 — Complete implementation backlog, documentation only

User scope: plan all 24 requested epics using the master context and v0.5, with small
PR-sized issues and a separate Decision Required list. No application code requested.

Created [docs/backlog](backlog/README.md): **152 implementation issues**, **13 decision
packets** and Markdown/CSV indexes. Each issue contains its title, source/status, purpose,
scope/exclusions/dependencies/roles, states/data, acceptance criteria, bilingual and
accessibility behavior, security/RLS, audit/email, automated tests/manual UAT, release gate,
owner type and explicit TBD blocking status. All 13 CFG question sets are retained verbatim;
confirmed choices and configurable defaults remain distinguished from unresolved inputs.
Existing M1/M2/homepage/About evidence is recorded as local completion with release gates.

Changed files: 24 epic documents, Decision Required, backlog README and validation evidence,
two CSV indexes, plus navigation/continuity updates in root README, DECISIONS, ROADMAP and
this PROGRESS file. No source snapshot, application code, migration, dependency, environment
variable, provider resource, DNS record or production state changed. No real messages or
external issues were created. No new organizer decision was made.

Executed documentation verification:

- PASS: all 24 epics, 165 unique issue bodies and all 19 required metadata fields plus titles.
- PASS: every cited source ID exists; all 212 source IDs covered, including implementation
  references for all 199 non-CFG requirements/acceptance IDs and separate CFG decision packets.
- PASS: no dangling exact issue references or cycles in the explicit implementation dependency
  graph; integration prerequisites remain in activation gates and need end-to-end evidence.
- PASS: 215 local Markdown links, 165 stable anchors and 13 verbatim CFG question sets.
- PASS: CSV row counts (165 issues / 212 source IDs), new-document whitespace checks and
  `git diff --check`; actual Git state/history inspected before work.
- Independent review fixed missing actual KAU handoff, live sender setup and annual data
  separation slices; tightened workshop overlap checks, split media processing and clarified
  implementation versus activation dependencies. See [validation record](backlog/VALIDATION.md).

Commands: inline PowerShell document/source parsers with `Get-Content`, `Get-ChildItem`,
`Test-Path`, `Export-Csv`, `Import-Csv`; reference/cycle checks over parsed results;
`git status --short`, `git log -3`, `git diff --check`.

Lint/typecheck/unit/browser/database tests/build: **NOT RUN for this documentation-only
task**. Prior results are not new passes. The recorded local database container blocker,
unverified hosted CI/infrastructure and pending manual accessibility/content checks remain.
No UI changed, so no new screenshot or preview test was required. Named decision owners and
due dates remain unassigned; production gates remain closed. Documentation rollback needs
no database or environment action. Next smallest tasks are listed above and in the backlog.

## 29 September 2026 — M1 local foundation

Requested outcome: the smallest reproducible local engineering foundation, preserving
the handoff and using synthetic data. Branch: local `main`. See ENG-001 in DECISIONS.md
and [foundation feature notes](features/foundation.md).

Source IDs: INF-01/02/04/05, SEC-01/02/06, ROL-01, LOC-01/02/03, CMS-04,
ACC-01, ERR-01, TIM-01, CFG-01/02/07/10/12, REL-01 through REL-06.

### Observed starting environment

- Working folder: Codex temporary preview copy `MSRC27_Codex_Handoff`; separate Downloads
  copy was read-only. No app, package manifest, lockfile, Git history or remote existed.
  No other local website repository was identified among registered projects.
- System Node25.6.0, npm11.8.0, pnpm11.19.0, Git2.53.0.windows.3 available. Docker,
  Podman and Supabase CLI not initially available. No hosting/database/DNS inferred.
- Verified and downloaded official Node24.21.0 Windows executable into ignored `.tools/node`.
  SHA256: `ba4e6d110e8c1592a1ecd390f6b05f3da124b13871a5be62b341a07a853c6c32`.
  Pinned Supabase CLI installed as a project dev dependency. No system runtime replacement.

### Completed work

- Next App Router/React/TypeScript/Tailwind/pnpm baseline with exact direct dependencies,
  preserved lockfile, server-generated English/Arabic document direction, shared placeholder,
  skip link/language switch, loading, sanitized errors and genuine localized HTTP404s.
- Typed null conference settings and15 permanently closed server guards. Direct requests,
  spoofed roles, unsupported names, alternative methods and repeated/concurrent attempts are
  denied. No participant operations or real data are stored.
- Optional loopback-only browser/server data clients; CLI-generated local config, migration
  `20260929143136_foundation_samples.sql`, two synthetic fixtures and20 pgTAP assertions.
  No authentication, email delivery, storage or operational domains enabled locally.
- Environment example without secrets, loopback dev/start commands, README, frozen-install
  application/database CI with pinned actions. No hosted CI execution or deployment.
- Original AGENTS.md, consolidated context and all source files hash-checked against the
  Downloads handoff:13 files unchanged. Original source checksums remain historical; changed
  working documentation naturally differs from the handoff's SHA256SUMS.txt.

### Commands and observed evidence

All final application checks used Node24.21.0/pnpm11.19.0 on Windows, synthetic/no data,
and no environment credentials. In PowerShell, `. ./scripts/use-local-node.ps1` selects
the local runtime and fixes inherited PATH/Path casing for pnpm command resolution.

| Command / check | Result | Evidence / limitation |
|---|---|---|
| Runtime/package inspection; official docs/npm metadata; installed CLI `--help` | PASS | Versions pinned in package.json; compatibility choices in ENG-001. |
| `pnpm install --frozen-lockfile` | PASS | Fresh node_modules installation completed; exact lockfile accepted. |
| `pnpm install --frozen-lockfile --offline` | PASS | Final repeat on existing cache completed without changes. |
| `pnpm check` | PASS | Final lint with zero warnings, route type generation, tsc,41 unit cases, production build. |
| `pnpm test:e2e` with project browser path | PASS | Final28 cases,7.6s, exit0; production test server stopped automatically. |
| `pnpm audit --prod` | PASS | No known runtime dependency vulnerabilities reported by registry at execution. Not a security certification. |
| `pnpm dev` and in-app browser | PASS | Loopback3000, English/Arabic render; browser console inspection found no errors/warnings. |
| Visual inspection of6 production screenshots | PASS | Both languages at desktop1280, tablet791 and mobile393; no overflow after fix. |
| Supabase CLI help/init/migration generation | PASS | CLI2.118.0 generated config and migration name; no DB connection required. |
| Supabase startup | BLOCKED | `DockerLifecycleInspectError: docker: command not found (podman also not found)`. |
| Database reset/migration execution,20 policy assertions, lint/advisors, query, generated types | BLOCKED | Docker-compatible runtime missing. Hand-maintained fixture types not yet compared against DB. |
| Hosted CI/staging, Firefox/WebKit/real phones, full accessibility/load/recovery, runtime exception recovery | NOT TESTED | Outside observed local evidence; no remote configured or production target available. |

Browser evidence: ignored `playwright-report/index.html`, `test-results/.last-run.json`
and screenshots. The browser suite covers locale switching, keyboard skip, RTL, no forms,
reduced motion, unknown-route404, no-index headers, all15 workflow denials, method bypass,
spoofed role claims and concurrent/repeated denials. These are not capacity-allocation or
payment-concurrency tests: those workflows do not exist in M1.

Resolved setup/check failures: sandbox registry socket denial required approved network
execution; pnpm required explicit native resolver build permission; package-manager global
virtual-store defaults differed across contexts and are now explicitly disabled; Windows
PATH casing hid pnpm shims and is normalized only in the helper's process. Initial TypeScript
locale narrowing and one lint warning were corrected. A tablet overflow found visually was
fixed and added to coverage. Playwright now launches Next directly for reliable teardown;
final Windows run used approved execution so test-owned processes could be cleaned up.
Next's automatic AGENTS append was removed and disabled, restoring the original bytes.

### Remaining setup / release dependencies

- Technical owner (unassigned): install/start Docker-compatible runtime; run README local
  database commands, inspect API/RLS behavior and regenerate/compare types. No DB PASS claim yet.
- Organizational owner (unassigned): preserve this temporary project in a durable directory,
  establish organizational GitHub access/remote and observe hosted CI. Local automation Git
  identity is not an organizer or release approval.
- Re-evaluate ESLint9 compatibility/EOL before public release; current React/import plugins
  do not advertise ESLint10 support. No unsupported peer override was applied.
- CFG-09/10/11/12 ownership, privacy, regions, production services, final brand/content and
  public-launch evidence remain pending. All operational gates stay false, including CMS,
  advisory assessment, registration, payments and scientific/competition/event workflows.
- No real email, payment, cloud provisioning or DNS work was performed. There is no public
  launch approval and this synthetic foundation is not production-ready.

Next smallest task: F07 / M2 shared design primitives and bilingual component review.

## 29 September 2026 — M2 design system and focused M3 homepage

Requested outcome: a cinematic bilingual homepage preview and shared accessible UI
foundations. Continued the actual clean local M1 repository at `0d2f728`, preserving the
handoff and closed operational boundaries. Decision: ENG-002. Feature notes:
[design system](features/design-system.md). No remote or production service was added.

Source IDs: SCP-02, DSN-01/02, LOC-01/02/03, ACC-01, CMS-04, MED-01 through MED-04,
CFG-12; existing INF/SEC/REL foundation constraints remain in force.

### Implemented and inspected

- Working five-color tokens, locally served DM Sans/Inter/Noto Sans Arabic, semantic
  states, responsive containers/type, header/mobile navigation/footer/language switch,
  buttons/links, section headings and accessible field/status conventions.
- Focus, disabled, busy/loading, hover, press, error-summary/field validation and success
  states in the local/staging showcase. Only predefined synthetic choices are retained
  across language switches; scientific sample text remains English/LTR in Arabic.
- Homepage hero, conference introduction, four participation pathways, explicitly
  illustrative program rows, previous-edition context and full typed public sitemap.
  Empty sponsor/gallery sections are omitted. Dates/venue remain unconfirmed; no names,
  old sponsor logos, proposed dates, countdown, prices or capacities became public claims.
- Original abstract poster. No conference footage or final marks were available/cleared.
  Separate synthetic motion fixture exercises muted inline playback, pause/resume,
  reduced-motion/save-data/slow-network/hidden-tab rules and poster-on-error behavior.
- Server-only dynamic showcase gate, disabled by default in a production build and always
  disabled for Vercel production. All 15 operational gates remain closed, including CMS.
- Existing application CI automatically includes the new tests. No database/schema changes.

### Commands and observed results

All checks used Node 24.21.0 / pnpm 11.19.0 and local synthetic content, without credentials.

| Command / check | Result | Observed evidence / limit |
|---|---|---|
| Official font/media/test docs, registry metadata and local CLI help | PASS | Next local font API, pinned Fontsource packages 5.3.0, axe-core/playwright 4.13.0; font OFL notices retained. |
| Exact dependency installation; `pnpm install --frozen-lockfile --offline` | PASS | Updated lockfile accepted; final repeat completed with no changes. |
| `pnpm check` | PASS | Final ESLint zero warnings, route types/tsc, 69 unit cases and optimized production build. |
| `pnpm test:e2e` with local browser path | PASS | Final 45/45 Chromium cases, 27.1 seconds, exit 0; test-owned production server stopped. |
| Bilingual responsive/keyboard/RTL checks | PASS | Home at 1280, 791 and 412 CSS px; additional 320px checks. Menu Escape/refocus, skip link, native anchors, query/hash and synthetic choice preservation. |
| Text enlargement and overflow | PASS | 200% root text at desktop/tablet/mobile; heading clipping checks; narrow-phone legacy graphic bounds. |
| Eight axe WCAG 2.2 AA rule scans | PASS with scope limit | EN/AR homepage/showcase at desktop/mobile: zero violations. Gradient media text and decorative glyphs have manual-review records; this is not a full accessibility certification. |
| Contrast and visual review | PASS for current preview | Text combinations measured by axe include neutral 4.90:1, ink/gold 7.05:1, purple/ivory 12.20:1 and muted/ivory 5.93:1. Original poster/screenshots visually reviewed; focus ring corrected on dark showcase surface. |
| Media controls/failure/preferences | PASS | Synthetic video actually plays, pauses/resumes, and falls back after aborted fetch. Reduced-motion/data-saving modes request no video. Homepage requests no video or third-party fonts/embeds. |
| Actual production showcase denial | PASS | Local production server: EN/AR showcase HTTP404 without flag; EN/AR HTTP404 even with true flag when VERCEL_ENV=production. Owned test process stopped. |
| No-operation regression | PASS | Existing direct/method/spoofed-role/repeated/concurrent denials remain covered; demo form creates no POST or participant record. |
| Dev server / in-app preview | PASS | Loopback port 3000 renders current homepage; server restarted after dependency reinstallation. |
| Hosted CI/staging; Firefox/WebKit/real phones; screen readers; full WCAG audit | NOT TESTED | No hosted target/remote; local Chromium evidence only. Final human Arabic editorial review remains pending. |
| Real-footage frame contrast, crop, codecs and bandwidth measurements | NOT TESTED | No cleared final footage/poster exists. Synthetic fixture is not production media validation. |
| Local database execution | BLOCKED (unchanged from M1) | Docker/Podman unavailable; no DB changes in this task. |

Evidence: ignored `deliverables/m2-preview` contains named EN/AR desktop/tablet/mobile
full-page and entrance screenshots, 320px entrances, component screenshots, eight detailed
axe reports and `accessibility-summary.json`. `playwright-report/index.html` has the test
report. Tests regenerate artifacts; screenshots are not approval of final content.

Resolved findings: initial browser run passed 37/45. Four checks needed a form-scoped alert
selector because Next also provides a route announcer. Real enlarged-text header overflow
was fixed with wrapping; heading wrapping and narrow legacy artwork were checked. A gold
button's contrast was caught during the entrance fade, so text now remains fully opaque
during the 400ms/12px rise. The dark showcase focus ring now uses ivory. Final rerun passed.
The package-store mismatch was repaired with a local store and non-optimistic install checks.

### Remaining inputs and next task

CFG-12 still needs final MSRC/KAU marks, brand/typography approval, approved EN/AR copy,
hero/poster rights and selection, accurate past-edition captions/assets, approved program,
speaker/committee/sponsor content and legal/contact text. Exact delivery fields and asset
slots are in [MEDIA_REGISTER.md](MEDIA_REGISTER.md) and [design-system notes](features/design-system.md).
No public launch, real email, payment, production provisioning, DNS change or operational
opening occurred. The working folder remains a temporary Codex copy; preserve the archive
in a durable project location. Next smallest task: the approved bilingual About page slice.

## 29 September 2026 — M2 review and bilingual About page

Requested outcome: review the completed M2/homepage changes and continue with the bilingual
About page. Starting evidence: clean local `main` at `8f6d020`; foundation parent `0d2f728`.
Decision ENG-003; [review record](reviews/m2-homepage.md) and [About contract](features/about.md).

### Review result and scope

No actionable defects were found in the inspected M2 change. Source/content boundaries,
bilingual navigation, shared accessibility states, preview gating, media behavior and closed
operational routes were reviewed. Focused design-contract/media unit execution passed
28/28 cases. This review did not execute a database or certify unimplemented payment,
capacity, review-anonymity or data-retention workflows.

A meaningful browser coverage gap was closed: explicit user pause now gets tested across
reduced-motion on/off changes before resuming. This is a coverage improvement, not a claim
that a reproduced M2 bug was fixed. An independent inspection of the new About/navigation
slice also found no actionable defect; browser evidence is recorded separately below.

### Implemented slice

- `/en/about` and `/ar/about` provide localized metadata, semantic breadcrumbs, identity,
  purpose, intended community and working links to the homepage participation/program overview.
- Complete typed English/Arabic copy is adapted from source context in CONFERENCE_BACKGROUND
  (S3 pp1,4,13,17,33,37). A visible draft notice retains CFG-12. Audience context explicitly
  does not define eligibility; host institution does not establish an approved venue.
- Header/mobile/footer About links now reach the standalone page. The homepage introduction
  has a contextual About link. Current-page indication and current-page mobile menu focus
  are supported; language switching preserves the route, query and section.
- Reused M2 tokens and components; no new media, dependency, database/storage read, personal
  input, mutation, authentication, email, audit transition, operational state or durable job.
  All 15 operational guards and all unset business values remain unchanged.

Source IDs: SCP-01/02, LOC-01/02/03, CMS-04, DSN-01/02, ACC-01, CFG-12, REL-01.
Original AGENTS/source snapshots remain unchanged; no organizer decision was superseded.

### Executed verification

Node 24.21.0 and pnpm 11.19.0 were confirmed again. Dependencies and lockfile were unchanged.

| Command / check | Result | Evidence / limitation |
|---|---|---|
| M2 focused review unit command | PASS | 28/28 media-policy and design-contract tests, exit 0. |
| Scoped About ESLint | PASS | New content/page checked with zero warnings. |
| `pnpm check` | PASS | ESLint, Next route types/tsc, all 69 unit cases, optimized build; both About locales prerendered. |
| Scoped ESLint after final test adjustments | PASS | Updated About, media/navigation browser tests and content contract; zero warnings. |
| `pnpm test:e2e` | PASS | Final 60/60 Chromium cases, 38.5 seconds, exit 0; owned production test server stopped. |
| About browsing/navigation/content | PASS | Six language/viewport combinations; real 200 routes and /fr/about HTTP404, header/footer/breadcrumb/homepage CTAs, menu focus, locale/query/hash continuity, no operational form or POST. |
| Responsive and accessibility | PASS with scope limit | About at 1280/791/412 CSS px, extra 320px checks, 200% text and glyph bounds, keyboard/skip/focus, RTL and reduced motion. Six About axe scans plus eight retained M2 scans: zero violations. Manual/real-device audit still required. |
| Screenshot inspection | PASS | EN/AR About desktop/tablet/mobile and narrow entrances; current homepage with About link. No clipping, overlap or RTL issue found. About axe reports have no incomplete items; M2 reports retain their documented contrast-review caveats. |
| Media pause persistence and prior regressions | PASS | User pause survives reduced-motion toggle before explicit resume; previous media failure and workflow-denial regressions retained. |
| Live dev preview | PASS | In-app About route on loopback3000 renders; inspected console had no errors/warnings. |
| Database, hosted CI/deployment, real-device/Firefox/WebKit, screen reader/full WCAG audit | NOT TESTED in this task | No data changes. Prior DB execution remains BLOCKED by missing Docker/Podman; no remote deployment or broader audit performed. |

Initial browser run: 54/60 passed; six new navigation assertions expected a slash before the
homepage fragment although Next normalized the rendered href. Selectors were corrected to
the actual destination and still verify the resulting URL/visible target. No product behavior
was weakened. Final full rerun passed. Screenshot/accessibility evidence is saved in ignored
`deliverables/m3-about`; the complete browser report remains in `playwright-report`.

### Release state and remaining work

This remains a local unindexed draft. Final bilingual editorial review, institutional/organizer
naming approval, branding/media and all REL-01 public launch requirements remain open.
No production service, DNS, real email/payment, CMS or participation opening occurred.
The next bounded task is approved homepage/About copy refinement, followed by a Dates and
Venue content slice once its inputs are provided. Docker execution and durable organizational
repository ownership remain independent setup needs. Preserve the latest project archive
outside this temporary workspace for continuity.

## Session handover template

```markdown
### Date / task / branch or revision
Requested outcome:
Source requirement IDs:
Completed change:
Files and migrations:
Commands run and observed results:
Visual checks / preview:
Checks not run and why:
Decisions made or changed, with authority:
Outstanding blockers and owner:
Feature flags / configuration changes:
Release status and evidence:
Next smallest task:
```

## Evidence status vocabulary

- PASS: actual check performed with recorded evidence.
- FAIL: actual check found a defect.
- BLOCKED: named dependency prevents performing the check or opening the flow.
- NOT TESTED: no execution evidence yet.
- PROPOSED: design/engineering choice awaiting adoption or approval.
- SELECTED: organizer chose the approach; implementation/authorization still separately evidenced.

## Change log

- v1.0, 29 September 2026: consolidated current sources, added durable Codex instructions, corrected CMS identity sequencing, retained unresolved source conflicts, and prepared staged development prompts. No live application or infrastructure changes.
