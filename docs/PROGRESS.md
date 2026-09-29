# Progress and session handover

**Snapshot: 29 September 2026. Update this file after each development task.**

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
| Git / application code | Inspected: no existing local repository/app; new local main repository and M1 code created. No remote configured. |
| Local development installation | PASS: exact dependencies installed, frozen lockfile verified, portable Node24.21.0 selected for this host. |
| Vercel/Supabase projects / production secrets | Not inspected or provisioned |
| Tests / CI / preview / production deployment | Local lint/types/41 unit/build/28 browser checks PASS. CI defined but remote NOT TESTED. Local preview running; no deployment. |
| KAU collection access / email sender | Not verified |

## Milestone status

| Milestone | Requirements/planning | Implementation | Release |
|---|---|---|---|
| M0 Governance | Baseline and decision register prepared; named owners/evidence pending | Organizational setup unverified | Pending |
| M1 Foundation | ENG-001 adopted; relevant source IDs retained | Local app PASS; Docker database execution BLOCKED; CI defined | Local preview only; all production gates closed |
| M2 Design system | Working defaults prepared; final approval pending | Not verified | Pending |
| M3 Public alpha | Page scope defined | Not verified | Pending |
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

Implement F07 / M2: shared design tokens and accessible components, with English/Arabic
desktop/mobile review. Preserve closed workflows and unset business values. Independently,
install/start an approved local Docker-compatible runtime to execute the prepared database
tests. Establish the organizational repository and ownership separately; no production
business decision blocks local visual work.

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
