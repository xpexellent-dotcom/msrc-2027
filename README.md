# MSRC 2027: start here

**Development handoff v1.0 | Prepared 29 September 2026 | Event timezone: Asia/Riyadh**

This folder contains the M1 foundation, M2 shared design system and M3 homepage/About previews alongside the original handoff. The English/Arabic preview runs without credentials or a database. Dates, venue and operational workflows remain unpublished or closed; the working brand and draft copy still need approval.

## Run locally

Use Node **24.21.0 LTS** (`.node-version`) and pnpm **11.19.0** (`packageManager`).
Install Node from its official distribution or your existing version manager, and install
the pinned pnpm with `npm install --global pnpm@11.19.0` if it is missing. Package versions
are exact and `pnpm-lock.yaml` is the reproducibility baseline.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [English](http://127.0.0.1:3000/en) or [Arabic](http://127.0.0.1:3000/ar).
The root redirects to English. Stop the terminal with Ctrl+C. No `.env.local` is needed.

The About page is available in [English](http://127.0.0.1:3000/en/about) and
[Arabic](http://127.0.0.1:3000/ar/about), with a visible draft notice. Its source-derived
purpose and audience descriptions still need editorial approval. The header, footer and
homepage introduction link to it. See the [feature contract](docs/features/about.md).

Review the component states at [English design system](http://127.0.0.1:3000/en/design-system)
or [Arabic design system](http://127.0.0.1:3000/ar/design-system). These routes are enabled
automatically in development. For a local production build or protected staging preview,
explicitly set the server-only `DESIGN_PREVIEW_ENABLED=true`; otherwise they return HTTP404.
They always return404 when `VERCEL_ENV=production`, even with that flag. The flag and
no-index responses are not authentication: protect any remote staging deployment separately.
The showcase has synthetic examples only and never submits or stores participant data.
`/design-system` is a gated alias to the English showcase. Both languages demonstrate
forms, dialogs, persistent dismissible toasts, table/pagination states, content composition
and shared navigation. File selection is an in-memory filename demo; no file is read or
uploaded. See [M2 component inventory and verification](docs/features/m2-components.md).

The homepage uses original static artwork. Only the design-system route uses the small,
silent synthetic motion fixture to demonstrate playback and fallback controls. Fonts are
self-hosted; there are no third-party embeds or external font requests.

On this Windows machine, a checksum-verified portable Node is already in the ignored
`.tools/node` directory. From the project root, run:

```powershell
. ./scripts/use-local-node.ps1
pnpm dev
# Or use the combined shortcut:
./scripts/start-local.ps1
```

The helper selects portable Node when present and normalizes this terminal's Windows
Path casing so pnpm finds local command shims. It makes no permanent system changes.
After copying/cloning to another computer, install the pinned runtime normally;
the `.tools` directory and dependency caches are deliberately not in Git.

## Verification commands

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm check` runs lint, route type generation/TypeScript, unit tests and production build.
Browser tests need the build first; they start and stop their own loopback production
server on port 3210 with the synthetic design preview explicitly enabled. Chromium desktop,
tablet and mobile cases cover both languages, keyboard/menu/focus behavior, enlarged text,
automated accessibility checks, media fallbacks, unknown routes and closed API operations.
Screenshots and axe findings are written to `test-results`; automated checks do not replace
manual accessibility or final Arabic editorial review.
`pnpm start` serves an existing production build on port 3000. Ports 3000 and 3210 must
be free. `pnpm test:watch` is available for iterative unit work.

This machine's browser download is in `.tools/playwright`; set
`$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.tools/playwright"` before browser tests here.
A normal `playwright install chromium` uses the default browser cache instead.

[CI](.github/workflows/ci.yml) defines frozen installs, application checks and local
database tests. It does not deploy. The [M2 implementation PR run](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36632458600)
passed, including security advisors and generated-type validation, in the user-authorized
private [development repository](https://github.com/xpexellent-dotcom/msrc-2027).
Actual results and limitations live in [PROGRESS.md](docs/PROGRESS.md) and the
[database/CI verification record](docs/reviews/m1-database-ci.md).

## Hosted Supabase — day-to-day connection

The user selected the existing managed `msrc` project for direct hosted access (ENG-006).
Docker is **not required** to start the app or connect to that project. This checkout has
an ignored `.env.local` containing only the verified project URL, existing publishable key,
and `NEXT_PUBLIC_SUPABASE_TARGET=hosted`. No database password or privileged key is used.

For a new clone, copy `.env.example` to `.env.local`, set target to `hosted`, and obtain
the HTTPS project URL and modern `sb_publishable_...` key from the authorized project's
Dashboard. Keep local/staging/production settings separate. Do not copy secrets into public
variables or commit the environment file. Then run:

```sh
pnpm db:verify-hosted
pnpm dev
```

The verification command only requests public Auth service settings, discards its response body,
and prints status without keys. It never reads table rows, creates users, sends emails or
changes data. It does not sign in or enable app authentication. A successful response proves
service connectivity and key acceptance, not Data API CRUD access, production readiness or RLS
coverage. The selected project's public schema was empty at inspection; no local fixture,
migration or seed is uploaded. Default clients expose no invented table types. Public
pages still render static content, and all 15 operational gates remain closed.

The normal CI workflow remains isolated and uses synthetic local Supabase on GitHub's
runner. It has no hosted project key. See [hosted connection notes](docs/features/hosted-supabase.md)
for verification, environment boundaries and rollback.

## Local Supabase — optional fixture testing on this PC

Install and start a Docker-compatible Linux container runtime. On Windows, use Docker
Desktop with its supported WSL2/Linux-container setup and complete any required restart.
Check `docker version` shows a running server before continuing. WSL 3.0.1 and Docker
Desktop 4.93.0 are now installed on this host. Windows requires a restart to activate
Virtual Machine Platform; Docker's first launch/terms and local engine verification are
still pending. Windows local fixture acceptance remains untested until those steps are
complete; the user has chosen hosted access for normal work. Hosted connectivity and
GitHub's Linux fixture results are distinct from a Windows local database pass.
The pinned project CLI is used; these commands must stay unlinked and local.

```sh
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 msrc2027-local
pnpm db:start
pnpm db:reset
pnpm db:lint
pnpm db:test
pnpm exec supabase db advisors --local --type security --level warn --fail-on error
pnpm db:env
pnpm db:integration
pnpm db:types
pnpm db:stop
```

Create the network once. It restricts published container ports to loopback. The start,
reset and pgTAP scripts explicitly use this same network so replacement/helper containers
can reach the local stack. Type generation runs in-process and needs no network flag.
`db:reset` deletes/reseeds this local development database; never use it with valuable
data. `db:types` prints generated types for comparison with the small hand-maintained
fixture contract. `db:stop` preserves local volumes. `db:start` and `db:status` print local
connection details and generated privileged keys; keep their output out of committed files
and shared logs. CI captures startup output privately and removes it without uploading it. Local Auth
infrastructure runs because the pinned CLI needs it to expose the publishable key.
Account sign-up, anonymous sign-in, application authentication and all operational
workflows remain disabled in the local stack. No hosted settings are changed by this setup.

`pnpm db:env` captures CLI status without printing it, rejects hosted references and
creates the ignored `.env.local` with only the validated loopback URL and publishable
key. It refuses to overwrite an existing file. If using this helper, do not copy the
example first. For manual setup, copy `.env.example` to `.env.local` and set only those
two local values and leave target blank or set it to `local`. Never add privileged keys to
`NEXT_PUBLIC_` variables. Local mode rejects remote endpoints; both modes reject secret
keys. The sample table contains
synthetic text only, with explicit read grants and RLS denying hidden rows and writes.
`pnpm db:integration` loads `.env.local` and exercises both actual client wrappers with
10 local Data API checks. It refuses hosted mode or a remote URL **before collecting tests**,
and the explicit local client factories enforce the same boundary before any request.
Missing configuration or an unavailable stack fails the command;
it is never reported as a skipped success. Restart `pnpm dev` after changing public
environment variables; production builds capture these values at build time.
See [local data notes](docs/features/local-data.md) for policy tests and current blockers.

Environment boundaries: local fixture tests use synthetic loopback services; hosted
access uses the explicitly selected project's public settings. Separate staging and
production projects/access remain release requirements before data workflows open. This
connection task does not authorize `supabase db push`, hosted resets, copying real data,
or executing local pgTAP SQL remotely. The public page and ordinary unit/E2E suite work
with all Supabase variables absent. CMS preview
configuration is server-only and does not enable editing or any operational workflow.

For a fresh Windows checkout with the pinned runtime installed:

```powershell
. ./scripts/use-local-node.ps1
pnpm install --frozen-lockfile
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
pnpm dev
```

See [the M1 verification report](docs/reviews/m1-foundation.md) for the complete file list,
commands actually executed, acceptance results and remaining host/CI setup.

## Next work

Use the hosted connection for normal development; Docker restart/setup is optional unless
you want to run fixture tests on this PC. CI retains those tests on GitHub's Linux runner.
Next, review and approve the existing homepage/About copy and Arabic translations.
The exact content/asset request list is in
[design-system feature notes](docs/features/design-system.md) and the
[media register](docs/MEDIA_REGISTER.md). Keep all workflow flags closed.
The user-authorized private repository is `xpexellent-dotcom/msrc-2027`. Institutional
custody, production ownership, plans, regions and external
approvals remain separate setup work. This local folder was initially opened from a
temporary preview directory; preserve the resulting project in a durable project location.
The separate Downloads handoff copy was inspected but not edited.

For a chat that accepts attachments but does not open local folders, attach `MSRC27_Codex_Context.md` as a consolidated reference and keep the complete ZIP available. A text upload provides context; it does not itself connect a repository or provision hosting. Keep the original PDFs available for visual review.

## Read in this order

| File | Purpose |
|---|---|
| [AGENTS.md](AGENTS.md) | Short persistent instructions for development |
| [docs/PROJECT_BRIEF.md](docs/PROJECT_BRIEF.md) | What MSRC is building and its boundaries |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Confirmed choices, conflicts, and remaining configuration |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Detailed product behavior with source requirement IDs |
| [docs/DESIGN_GUIDE.md](docs/DESIGN_GUIDE.md) | Working brand and interaction system |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Selected providers and recommended implementation structure |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones, releases, and the next development tasks |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Evidence-based current status and session handover |
| [docs/ACCEPTANCE_AND_RELEASE.md](docs/ACCEPTANCE_AND_RELEASE.md) | Required verification and release gates |
| [docs/backlog/README.md](docs/backlog/README.md) | PR-sized implementation issues across all 24 epics, separate Decision Required packets and source coverage |
| [docs/OWNERSHIP_AND_SETUP.md](docs/OWNERSHIP_AND_SETUP.md) | Accounts, custodians, environments, and setup checklist |
| [docs/MEDIA_REGISTER.md](docs/MEDIA_REGISTER.md) | Media location, selection, and publication requirements |
| [docs/SOURCE_REGISTER.md](docs/SOURCE_REGISTER.md) | What was reviewed and how conflicts were resolved |
| [docs/CONFERENCE_BACKGROUND.md](docs/CONFERENCE_BACKGROUND.md) | Page-referenced conference context from the Main File |

## What changed from the previous starter pack

- The latest live Development Specification v0.5 and updated Hackathon Draft are included as readable source snapshots.
- Confirmed provider and operating choices are distinguished from proposed framework choices, design defaults, and incomplete implementation.
- Existing playbook, prompts, and tracker are preserved as historical reference, with a shorter starting workflow above them.
- Event date/venue proposals, leadership differences, national-ID collection, WhatsApp use, and solo finalist accounting are explicitly tracked.
- Each milestone begins with an honest status. Blank tracking tables do not establish completed work.
- Full original Main File and generated brand-guide PDFs are included. The original Canva brand sheet is linked with a text snapshot that corroborates its palette and English fonts. Raw conference media is linked, not bundled.

## Source authority

The latest explicit organizer decisions govern. For this dated handoff, the live Development Specification v0.5 is the product baseline. Its defaults and TBD labels remain intact. The updated Hackathon Draft informs its competition rules, with source conflicts retained. The older conference PDF supplies background and proposals. The generated brand guide and starter pack supply working design and engineering recommendations.

These files are snapshots of the reviewed sources, not a live synchronization with Google Docs. If a source changes later, reconcile it into the current docs and record the change before using new behavior. Source coverage and gaps are listed in [SOURCE_REGISTER](docs/SOURCE_REGISTER.md).

## Working rhythm

Use one task per development chat: state the milestone or requirement IDs, implement a complete scoped change, inspect the result, run relevant checks, and update `PROGRESS.md` and any changed decisions. Routine reversible implementation can proceed within the assigned task. An unresolved business rule blocks the affected live workflow, while synthetic foundation and design work can continue.

Do not use the archived prompts as an instruction to build every feature at once. Begin with the foundation, then the design system and homepage. Public informational launch and operational feature opening are separate release decisions.

## Interface references

Current official guidance reviewed for this handoff:
- [Projects and chats](https://learn.chatgpt.com/docs/projects)
- [Using ChatGPT Work and Codex](https://learn.chatgpt.com/docs/use-chatgpt)
- [Project instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)

The desktop documentation supports local project folders and adding an existing ChatGPT chat to a Codex chat. An imported chat supplements the durable documents in this folder. Check the controls available in your selected surface before assuming a complete project import.
