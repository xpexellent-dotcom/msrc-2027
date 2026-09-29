# M1 database and CI verification — 29 September 2026

## Scope

Provide the requested Windows Docker/WSL prerequisites, execute the documented local-only
database checks where supported, create the user-authorized private GitHub repository and
run the committed workflow. Preserve M2/About, all 15 closed operational gates and every
business TBD. No managed Supabase/Vercel resource, DNS, live payment or participant email.
Requirements: INF-01/02/04/05, SEC-01/02/06, ROL-01 and REL-06; decision ENG-005.

## Repository and hosted evidence

Created [xpexellent-dotcom/msrc-2027](https://github.com/xpexellent-dotcom/msrc-2027) as
**private**, without generating replacement README/license files. Pushed the complete
existing five-commit history; original head is `4f0f37d97943c61a71be5ec5299661319d0ca3b5`.
The user explicitly approved Git Credential Manager's displayed access and completed
GitHub's email verification. No credential was printed, entered into a document or uploaded.
The connector does not have repository access; normal Git credential handling performed
the push and authenticated CI reads. No permissions for other people were changed.

**Initial workflow PASS:** [run 36614744871](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36614744871),
triggered by the initial main push, completed successfully in 3m 30s.

| Hosted Ubuntu check | Observed result |
|---|---|
| Frozen dependency install | PASS in both jobs |
| Lint / route types / TypeScript / unit tests / production build | PASS; 89 unit tests |
| Playwright browser suite | PASS, all 60 cases; see job log/artifact for evidence |
| Local loopback Docker network / Supabase start | PASS; startup credential output withheld |
| Migration reset and synthetic seed | PASS |
| Database lint | PASS, `No schema errors found` |
| pgTAP grants/RLS tests | PASS, one file / 20 assertions |
| Safe local environment generation | PASS, no keys printed |
| Actual browser/server client Data API integration | PASS, ten assertions |
| Local stack stop | PASS |

Database job: [109564774354](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36614744871/job/109564774354).
Application job: [109564774681](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36614744871/job/109564774681).
Browser evidence is attached to the run as `browser-smoke-results` (seven-day retention).
Sanitized local evidence is in ignored `deliverables/m1-ci-verification/`.

This follow-up adds the previously documented security-advisor and generated-type commands
to the database job. Their new run/results must be recorded after execution; the initial
workflow above did not contain those two steps. Generated public-schema types are compared
semantically with the handwritten fixture contract, not byte-for-byte formatting/helper aliases.

## Windows installation and blocker

Preflight: Windows 11 Pro x64 build 26200, virtualization enabled in firmware, SLAT present,
31.6 GB RAM and approximately 263 GB free. LanmanServer was already running/Automatic.
No container runtime, GitHub CLI or WSL distribution existed at the start of this follow-up.

| Command/action | Observed result |
|---|---|
| Elevated `wsl.exe --install --no-distribution --web-download` | Exit 0; installed WSL 3.0.1 and enabled Virtual Machine Platform. Windows explicitly requires restart. No Linux user distribution was added. |
| `wsl --version` | WSL 3.0.1.0, kernel 6.18.40.1-1, default version 2 |
| Docker Desktop official installer signature/hash | Valid Docker Inc signature; SHA256 matched official versioned checksum |
| `Docker Desktop Installer.exe install --user --backend=wsl-2 --no-windows-containers --quiet` | Exit 0; per-user Docker Desktop 4.93.0.240920 installed |
| Installed `docker --version` | Docker 29.8.1, build 4a63305 |
| `docker version` | Client present; server probe exit 1 because the engine has not started |
| `wsl --status` | WSL2 cannot start before the required virtualization-component restart |
| `git remote add origin`, `git push --set-upstream origin main` | PASS; private remote created and initial history pushed |
| CLI `db advisors --help` / `db:types --help` | Verified against installed pinned Supabase CLI 2.118.0 before adding the steps |

Installer SHA256:
`c139124c9cf71477dc565c3c0ea5a18f90b93d68ebe9aaa848a065960416c0bc`.
Installed Desktop: `%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe`.
CLI: `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin\docker.exe`.
Existing terminals may need the CLI directory added to their process PATH or a new terminal.

No automatic reboot, Docker Desktop first launch or license acceptance was performed.
The Windows local database commands remain BLOCKED by restart/first launch. No local
database reset was attempted without a running, verified disposable stack. `.env.local`
remains absent here. Successful hosted database tests are not a Windows engine pass.

References reviewed: [Microsoft WSL installation](https://learn.microsoft.com/en-us/windows/wsl/install),
[WSL command options](https://learn.microsoft.com/en-us/windows/wsl/basic-commands),
[Docker Windows installation](https://docs.docker.com/desktop/setup/install/windows-install/),
[Docker versioned checksum](https://desktop.docker.com/win/main/amd64/240920/checksums.txt).

## Resume after restart

1. Save open work and restart Windows. Launch Docker Desktop and complete its first-run
   terms if accepted. Wait until its Linux engine is running. Recheck `wsl --status` and
   `docker version`; a client-only result is insufficient.
2. In this repository, select Node using `. ./scripts/use-local-node.ps1`. Create/inspect
   `msrc2027-local` as described in README and verify its host-binding option is 127.0.0.1.
3. Run `pnpm db:start`, privately capture its credential-bearing output, and inspect
   published ports. Then run `db:reset`, `db:lint`, `db:test`, the documented security
   advisor command, `db:env`, `db:integration` and `db:types`. Only reset this synthetic stack.
4. Start the app with the generated local public variables, inspect EN/AR pages, and run
   relevant app checks. Stop the stack with `pnpm db:stop`, preserving volumes.
5. Record the Windows results separately from hosted CI. Keep every workflow closed.

## Change and rollback boundaries

Application files, dependency pins/lockfile, migrations, seed and operational flags are
unchanged. Repository changes in this follow-up are CI verification steps and setup/evidence
documentation. Reverting that focused commit/PR does not remove the private repository,
credential-manager login or Windows installation. Those are deliberate user-authorized
setup changes; removal would be a separate request, not an automatic cleanup operation.

Changed files: `.github/workflows/ci.yml`, `README.md`, `docs/DECISIONS.md`,
`docs/OWNERSHIP_AND_SETUP.md`, `docs/PROGRESS.md`, `docs/features/local-data.md` and this
`docs/reviews/m1-database-ci.md`. No migrations or environment templates changed.
