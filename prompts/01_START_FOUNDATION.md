# First Codex task: foundation

Open the extracted handoff folder in Codex. Copy the block below. If there is an existing website repository, open that repository after merging the handoff documents and preserving existing instructions/code.

```text
Use this folder as the development handoff for MSRC 2027.

Read AGENTS.md, docs/PROJECT_BRIEF.md, docs/DECISIONS.md,
docs/PROGRESS.md, docs/ARCHITECTURE.md, and docs/ROADMAP.md.
Use sources/Development_Specification_v0.5.txt for the exact relevant
requirements. Treat sources/previous_starter_pack as historical reference.

Implement the local M1 engineering foundation. First inspect the actual
folder/repository, existing code, Git state, runtime, package manager, and
container availability. Preserve existing work. Do not assume the source
documents prove that hosting, a database, DNS, or a repository is configured.

For a new app, adopt and record the recommended Next.js App Router,
TypeScript, Tailwind, and pnpm baseline unless you find a concrete technical
incompatibility. Verify current official runtime requirements, dependency
versions, and CLI help before using commands. Pin relevant dependencies and
preserve the lockfile. Managed Vercel and managed Supabase are already selected
providers; exact production plans and regions remain unresolved.

Build the smallest runnable foundation with:
- a safe public placeholder page and shared layout;
- English/Arabic route and RTL structure;
- typed configuration that keeps unknown dates, prices, and capacities unset;
- server-enforced closed flags for operational workflows;
- safe environment-variable documentation with no real secrets;
- local Supabase setup and synthetic data where the environment supports it;
- separate browser/server data-client boundaries where applicable;
- error, loading, and not-found conventions;
- appropriate lint, typecheck, build, test and local database commands;
- a meaningful small smoke test and CI definition;
- clear README setup and verification instructions.

Do not implement registration, payment, abstracts, review, workshops,
hackathon, 3MT, scanning, or certificates in this task. Keep CMS editing
closed; public static content does not require exposing an admin interface.
Use synthetic development data, console/test email, and mocked payments.
Do not provision production services, change DNS, or send real emails.

Proceed with routine reversible setup and implementation. A missing
production decision should be recorded as a later release dependency,
not a reason to stop local foundation work. If a local tool is unavailable,
complete the independent work and explain the exact remaining blocker.

Run the available relevant checks and inspect the local result. Record what
passed, failed, was blocked, or was not tested. Update docs/PROGRESS.md and
the engineering decision record. Return the working result, how I can open
it, checks actually run, remaining setup, and the next smallest task.
```
