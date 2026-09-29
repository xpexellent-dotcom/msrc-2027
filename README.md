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
database tests. It does not deploy. Hosted CI has not run without an organizational
remote repository. Actual results and limitations live in [PROGRESS.md](docs/PROGRESS.md).

## Optional local Supabase

Install and start a Docker-compatible Linux container runtime. The supplied machine
does not currently have Docker available. The public app remains runnable without it.
The pinned project CLI is used; do not link a remote Supabase project for M1.

```sh
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 msrc2027-local
pnpm db:start
pnpm db:reset
pnpm db:lint
pnpm db:test
pnpm db:types
pnpm db:stop
```

Create the network once. It restricts published container ports to loopback.
`db:reset` deletes/reseeds this local development database; never use it with valuable
data. `db:types` prints generated types for comparison with the small hand-maintained
fixture contract. `db:stop` preserves local volumes. `db:status` provides local connection
details; keep its credential output out of committed files and shared logs.

To explicitly use the anonymous local clients, copy `.env.example` to `.env.local` and
set only the local URL and publishable key. Never add privileged keys to `NEXT_PUBLIC_`
variables. Clients reject remote endpoints and secret keys. The sample table contains
synthetic text only, with explicit read grants and RLS denying hidden rows and writes.
See [local data notes](docs/features/local-data.md) for policy tests and current blockers.

## Next work

Review and approve the homepage/About copy and Arabic translations, then continue one
public-content slice using confirmed inputs. The exact content/asset request list is in
[design-system feature notes](docs/features/design-system.md) and the
[media register](docs/MEDIA_REGISTER.md). Keep all workflow flags closed.
The organizational GitHub repository, production ownership, plans, regions and external
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
