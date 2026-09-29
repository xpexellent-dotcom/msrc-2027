# M1 foundation verification — 29 September 2026

## Scope and outcome

This follow-up audits the existing M1 foundation and fixes local reproducibility gaps.
The prior M2/homepage/About work and implementation backlog are preserved. No registration,
submission, payment, workshop, review, check-in, attendance or certificate feature was built.
All 15 operational flags, including authentication and CMS editing, remain false. Unknown
dates, venue, prices, capacities and production regions remain null.

Local application checks passed. **M1 acceptance is not complete:** this Windows host lacks
Docker/Podman and WSL, and the repository has no Git remote for a hosted CI run. The app's
credential-free public start is verified; live local database integration is not.

Source: Development Specification v0.5, INF-01/02/04/05, SEC-01/02/06, ROL-01,
LOC-01/02/03, CMS-04, ACC-01, ERR-01 and REL-01 through REL-06. Engineering choices are
recorded in [ENG-004](../DECISIONS.md). No organizer decision or source snapshot changed.

## Changes

- Retained Next.js App Router, TypeScript, Tailwind, ESLint, `src/`, `@/*`, pnpm,
  Vitest, Playwright, existing denial-only API boundaries and safe public previews.
- Added 29 README-only folder reservations matching the historical playbook. The existing
  route/test/i18n differences are explained in [ARCHITECTURE](../ARCHITECTURE.md).
  Reserved folders contain no route handler, feature component or database implementation.
- Fixed a local setup defect: the pinned Supabase CLI only exposes `PUBLISHABLE_KEY` when
  its Auth service runs. Enabled that local infrastructure service; global/email signup,
  anonymous sign-in and the application authentication gate remain disabled. No account,
  SMTP sender, cookie/session flow or hosted connection was added. See the
  [pinned CLI implementation](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/status-values.ts).
- Added `pnpm db:env`: privately captures local CLI status, validates only the loopback
  URL and publishable key, refuses hosted references and an existing `.env.local`, and
  withholds raw status/errors. Its 20 unit tests cover public-value allowlisting, malformed,
  remote, privileged and injected values, plus preservation of existing files.
- Added separate `pnpm db:integration`: ten Data API assertions exercise the actual browser
  and server wrappers against the public/hidden synthetic seed and denied write privileges.
  Missing local configuration fails the command. Added these steps to the database CI job.
- Final independent review caught credential-bearing CLI startup output in CI. The startup
  step now captures both streams into a restrictive temporary file, emits only sanitized
  status and deletes the file without uploading it. Local start/status output stays private.
- Corrected reset and pgTAP scripts to use startup's `msrc2027-local` network. Pinned CLI
  source shows that otherwise reset replacement containers and the pgTAP helper choose a
  different default network. Type generation runs in-process and rejects the network flag,
  so its command is unchanged. These fixes remain pending live container verification.
  Sources: [reset network](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/db-bootstrap/local-container-inputs.ts),
  [database recreation](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/db-bootstrap/recreate-local-database.ts),
  [pgTAP runner](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/test-db.handler.ts),
  [in-process type generation](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/commands/gen/types/types.handler.ts).
- Updated Windows setup, local environment explanations, decisions and continuity notes.

No dependency version or lockfile changed. Runtime remains Node 24.21.0 and pnpm 11.19.0.
Next is 16.3.7 and Supabase CLI is 2.118.0. No production integration was configured.

## Acceptance evidence

| Acceptance criterion | Result and limit |
|---|---|
| Clean checkout installs and starts using README | PASS: fresh local Git clone plus the pending M1 patch; 400 packages downloaded with zero reused; dev server ready in 708 ms. No dependency/environment directory copied. This is not a clone from a remote organization. |
| Local Supabase starts | BLOCKED: Docker and Podman unavailable; WSL not installed. Configuration and migration exist, but containers did not start. |
| App uses actual local environment variables | BLOCKED: helper and guards tested with synthetic values; live local API assertions did not execute. Static app works with both variables absent. |
| CI passes | NOT TESTED: checked-in application/database jobs reviewed; action commit references checked. No Git remote or hosted run. Local application job commands passed. |
| Production build passes | PASS: `pnpm build` within `pnpm check`. No operational route was added by folder reservations. |
| No secrets committed | Targeted current-source/history scan and tracked-environment inspection recorded below; only `.env.example` tracked, and no real credential supplied or generated. Not an exhaustive secret-scanner certification. |
| No workflow enabled | PASS: unchanged 15 false flags; unit checks and direct API E2E denial tests passed, including malformed/concurrent requests and alternate methods. |

## Commands actually executed

Commands ran from the project root unless a clone is identified. Windows commands selected
the pinned runtime with `. ./scripts/use-local-node.ps1`; browser tests used
`$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.tools/playwright"` for this host's ignored cache.

| Command or inspection | Observed result |
|---|---|
| `git status --short`, `git log`, `git remote -v` | Starting tree clean at `5073427`; prior foundation/design/About/backlog commits preserved; no remote. |
| `node --version`, `pnpm --version`, `pnpm exec next --version` | 24.21.0, 11.19.0, 16.3.7. |
| `Get-Command` and common Docker/Podman binary path checks; `wsl --status` | Neither container runtime installed/found; WSL reports not installed. |
| Installed `supabase --version`, `supabase start --help` and command help/source inspection | CLI 2.118.0 and local network flag confirmed. Initial sandbox denial of user-level CLI state was resolved with local-tool permission; container blocker persisted. |
| `pnpm install --frozen-lockfile` | PASS; existing root install consistent with the lockfile. |
| `pnpm check` | PASS: ESLint, Next route generation/TypeScript, 89 unit tests across four files, production build. |
| `pnpm test:e2e` | PASS: final run 60 Chromium desktop/tablet/mobile cases in 36.8 seconds, exit 0. |
| Earlier `pnpm test:e2e` run | All 60 cases passed, but Windows sandbox child-process cleanup stalled. Only the verified owned test server was stopped; the run exited 0 after 5.1 minutes. The subsequent permitted run above completed normally. |
| `pnpm db:start` | Exit 1: `DockerLifecycleInspectError`, `docker command not found (podman also not found)`. No local stack started. |
| `pnpm db:env` | Exit 1 with sanitized start-Docker guidance; no `.env.local` created. |
| `pnpm db:integration` | Exit 1: two setup hooks failed for missing local settings, ten test bodies skipped. This is BLOCKED, not an integration pass. |
| `git clone --no-hardlinks --no-local` into ignored `.tools/m1-clean-verify-20260929-211410` and apply current patch | PASS; no `node_modules`, `.env.local`, `.tools` or store copied. |
| Clone `pnpm install --frozen-lockfile` | PASS in 31.4 seconds, 400 downloaded/zero reused. Initial sandbox npm-download EACCES was resolved by running the same command with approved download access. No dependency changes. |
| Clone `pnpm dev --port 3024` | PASS; loopback server ready in 708 ms, later stopped. Source/clone lockfile SHA256 hashes matched. |
| `node .tools/verify-m1-clean-clone.mjs` | PASS after fixing the ignored harness's missing browser baseURL: eight HTTP, EN/AR, direction, desktop/mobile, language-switch and workflow-denial checks. No page/console errors or horizontal overflow. |
| Folder inspection | PASS: 29 new playbook boundaries contain README files only. |
| Parse `.github/workflows/ci.yml` with installed `js-yaml` | PASS: both jobs parsed; read-only repository permissions and private startup capture checked. Bash execution of this step remains untested on this Windows host. |
| `pnpm db:reset --help`, `pnpm db:test --help` | PASS: installed CLI accepts the corrected scripts and documents the global network flag. No database mutation/test was executed by help. |
| Final `pnpm check` after configuration fixes | PASS again: lint, type-check, 89 unit tests and production build. No app UI changed after the 60-case E2E run. |

Final source checks: `git diff --check` passed. A filename-only credential-pattern scan
covered 183 current source files and all four pre-existing Git revisions: no private-key
blocks, Supabase access/secret-key-shaped values or long JWTs matched. Only `.env.example`
is tracked; `.env.local` is absent. This targeted scan does not detect every possible secret
format. Lockfile, migrations, seed and pgTAP files were confirmed unchanged.

The browser verification used installed Playwright because `agent-browser` was unavailable.
The nested local clone emitted a warning that its parent's workspace file was ignored; its
own configuration was used. Color-environment warnings in Playwright were non-fatal.

**Not executed:** local migration/reset, 20 pgTAP policy assertions, database lint/advisors,
generated-type comparison, successful live-client integration, hosted GitHub CI or deployment.
Runtime exception-recovery remains untested; conventions are inspected without adding an
intentional public crash endpoint. Automated accessibility results do not replace assistive
technology testing, final Arabic review or final brand/media approval.

## Files, migrations and evidence

The complete [file inventory](m1-files.csv) lists every source-controlled/current source
file and whether this task added, modified or preserved it. It includes this report and
the inventory itself. Ignored runtime caches, environment files and evidence are excluded.
The changed paths also appear in [the M1 change list](m1-changed-files.md).

**Migrations: none added or modified.** The existing synthetic-only migration remains
`supabase/migrations/20260929143136_foundation_samples.sql`, with `supabase/seed.sql` and
`supabase/tests/database/001_foundation.test.sql`. It uses explicit read grants and RLS;
no operational schema or accounts exist. No database was modified by this follow-up.

Local, ignored evidence:

- `deliverables/m1-verification/clean-clone-verification.md`: detailed clean-clone record.
- `deliverables/m1-verification/clean-clone-smoke.json`: structured eight-check result.
- `deliverables/m1-verification/clean-clone-en-desktop.png`: English desktop screenshot.
- `deliverables/m1-verification/clean-clone-ar-mobile.png`: Arabic mobile screenshot.
- `test-results/` and `playwright-report/`: latest 60-case run and screenshot/accessibility attachments.

## Remaining setup and next PR

Next recommended PR: **complete M1 local database and hosted CI verification**
(BL-FND-02 plus BL-FND-03 CI evidence). It needs no operational feature.

1. Preserve this temporary checkout in a durable local project location. Install/start
   Docker Desktop with supported WSL2/Linux containers, including any required OS restart;
   verify `docker version` shows its server. No system installation was attempted here.
2. Follow [README](../../README.md): create the loopback-bound Docker network once; run
   `pnpm db:start`, `db:reset`, `db:lint`, `db:test`, `db:env`, `db:integration`, `db:types`.
   Inspect generated types against the committed fixture contract. Use only disposable
   synthetic data because reset deletes/reseeds that local database.
3. Start the app with the generated local public variables and verify both language routes.
   Capture all 20 pgTAP and ten real-wrapper assertion results. Stop via `pnpm db:stop`.
4. Put the repository in the authorized organizational GitHub location, run the committed
   workflow and record its actual URL/result. No remote name/account or hosted pass is assumed.

Production plans/regions, ownership, payment contract, content/assets and business TBDs
remain later release gates. No production service, DNS, real email or payment was touched.

## Rollback

Revert the single M1 follow-up commit to remove its helper/tests, CI additions, documentation
and README-only reservations. Existing M1/M2/About code remains in the parent commit.
There is no migration rollback or production action. On a host that later creates local
containers, stop them before reverting configuration; preserve any existing `.env.local`
rather than deleting user settings. Verification clones/caches are ignored local artifacts.
