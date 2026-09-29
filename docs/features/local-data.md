# M1 local data foundation

Requirement references: **INF-01, INF-02, INF-04, INF-05, SEC-01, SEC-02, SEC-06, REL-06**. This is a synthetic development fixture, not an implementation of the operational data domains in DAT-01 to DAT-04.

Latest verification: [hosted workflow 36614744871](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/36614744871)
passed local Linux Supabase startup/reset/lint, all 20 pgTAP assertions and all ten
actual-client integration checks. WSL and Docker Desktop are now installed on Windows;
the required restart and Docker first launch remain pending. Earlier missing-container
entries below are historical. See [current verification](../reviews/m1-database-ci.md).

## Boundaries

The public placeholder works without a database or environment file. `src/lib/supabase/browser.ts` and `server.ts` provide separate optional anonymous data clients. The Next.js `client-only` and `server-only` markers prevent the modules being imported into the wrong application layer. The server client is created per call and disables fetch caching. Both clients disable session persistence, refresh and URL session detection. Staff/participant authentication, cookie handling, storage, email delivery and payments are outside M1.

Both clients accept only a loopback HTTP origin and a local `sb_publishable_...` key. They return `null` when both settings are absent, and reject incomplete settings, remote URLs, URL credentials, paths, query strings, fragments, secret keys and legacy JWT keys. A remote endpoint needs an explicit later implementation change and release review. This validation is an accident-prevention boundary; database permissions remain the authority for data access.

Only these optional values belong in the ignored `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Prefer `pnpm db:env` after starting the local stack. It captures CLI status privately,
rejects hosted project references and extracts only a validated loopback API URL and
**publishable** key. It refuses an existing `.env.local`; preserve and review that file
manually instead of overwriting user work. The public-prefixed names intentionally make
these values available to the browser. Never place database passwords, secret/service-role
keys, tokens or SMTP credentials in a public-prefixed variable. Do not copy CLI status
output into committed documents or logs. The helper disables telemetry, isolates local CLI
state in ignored `supabase/.temp` and ignores ambient hosted credentials/binary overrides.

## Synthetic fixture and permissions

`public.foundation_samples` contains a public sample and a hidden sample. These are generic text records with no participant, institution, event, price, capacity, date or identity data. The public sample is explicitly labelled synthetic and is not used as public conference content.

The migration enables and forces RLS, revokes inherited table grants, and grants only SELECT to `anon` and `authenticated`. The SELECT policy permits rows with `is_public = true`. Neither role can insert, update or delete. No privileged client, SECURITY DEFINER function, view, file bucket, account or permission-management interface is added.

The pgTAP suite checks public versus hidden visibility, denial of all three mutation types for both client roles, and resistance to user-editable JWT metadata. It also temporarily grants mutation privileges inside its rolled-back transaction to verify that RLS independently denies writes. Tests create their own fixtures and roll everything back. There is no production state transition or scarce-resource allocation in M1, so concurrency and operational workflow tests belong to the relevant later milestone.

`database.types.ts` is a small hand-maintained fixture contract until a running local stack can generate the types. Regenerate and compare before extending the schema; TypeScript types never grant database access.

## Verification and release status

The pinned CLI generated `supabase/config.toml` and `supabase/migrations/20260929143136_foundation_samples.sql`.
The configuration uses local Postgres 17, the Data API and Studio, with automatic Data API
grants disabled. The M1 audit found that CLI 2.118.0 omits `PUBLISHABLE_KEY` when Auth is
disabled. The local Auth infrastructure is therefore now enabled, while global/email
sign-up and anonymous sign-in remain disabled, no accounts are seeded and the application
auth flag stays false. Email delivery, storage, Realtime, Edge Functions and analytics
remain disabled. This is a local client-key prerequisite, not an authentication feature.
The unchanged SQL was authored in the generated migration because no local database was
available for interactive schema iteration.

Original M1 commands (historical evidence; see the current [audit report](../reviews/m1-foundation.md)):

| Check | Observed result |
| --- | --- |
| Official npm metadata | `@supabase/supabase-js` 2.117.2 requires Node >=22; CLI 2.118.0 selected and installed. |
| `supabase --version` and help for init/migration new/start/reset/test/lint/gen types/stop/advisors | PASS on CLI 2.118.0, using the installed Windows shim. |
| `supabase init` and `supabase migration new foundation_samples` | PASS; generated the configuration and named migration. |
| `supabase start --network-id msrc2027-local` | BLOCKED: `DockerLifecycleInspectError`; `docker: command not found (podman also not found)`. |
| `pnpm exec eslint src/lib/supabase --max-warnings=0` | PASS under Node 24.21.0. |
| Reset/migration execution, pgTAP, database lint/advisors, API queries and generated-type comparison | BLOCKED by the absent Docker-compatible runtime; not executed. |

CLI startup also writes its user-level `.supabase` configuration/telemetry state. The Codex filesystem sandbox initially denied that write; approved local-tool execution succeeded. This was separate from the persistent missing-container blocker. See `docs/PROGRESS.md` for the complete application test/build evidence.

After installing and starting a Docker-compatible runtime, create a loopback-bound network once, then run the scripts from the project root:

```sh
docker network create -o com.docker.network.bridge.host_binding_ipv4=127.0.0.1 msrc2027-local
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:lint
pnpm db:env
pnpm db:integration
pnpm exec supabase db advisors --local --type security --level warn --fail-on error
pnpm db:types
pnpm db:stop
```

`db:reset` discards this project's local database and restores the migrations/fixtures; use it only for disposable synthetic data. Start, reset and pgTAP explicitly use the same loopback-bound `msrc2027-local` network; the pinned CLI otherwise defaults replacement/helper containers to a different network. `db:types` runs in-process, rejects the network flag and prints generated types for comparison, rather than overwriting the working contract on a failed command. `db:stop` retains local data volumes. All database targets are explicitly local. The app does not require this stack to render.

The dedicated integration suite loads `.env.local` only for its explicit command and
uses both actual client factories for 10 Data API checks: public seed read, hidden-row
denial and denied INSERT/UPDATE/DELETE per factory. Mutation probes cannot alter seeded
rows even if grants regress. No synthetic user/account or application debug route is added.
Twenty unit checks cover key filtering, remote/privileged/injected-value rejection and
preservation of an existing environment file. Unit success is not live database evidence.

CI includes the database checks on a Docker-capable runner. Startup prints generated local privileged keys, so CI captures both streams privately, prints only sanitized status and removes the temporary file without uploading it. Keep local `db:start` and `db:status` output private as well. A committed workflow is a definition, not evidence of a successful hosted run. No project was linked, provisioned, migrated or queried remotely. Production plans, regions, organizational access, data-flow/privacy approvals, backups, and every operational workflow release gate remain unresolved or closed.

## Official references checked on 29 September 2026

- [Local development and container prerequisites](https://supabase.com/docs/guides/local-development)
- [Database migrations and synthetic seed workflow](https://supabase.com/docs/guides/local-development/database-migrations)
- [Explicit grants and RLS](https://supabase.com/docs/guides/api/securing-your-api)
- [Database policy testing](https://supabase.com/docs/guides/local-development/testing/overview)
- [JavaScript client initialization](https://supabase.com/docs/reference/javascript/initializing)
- [Supabase changelog](https://supabase.com/changelog)
- [Pinned CLI status implementation and publishable-key prerequisite](https://github.com/supabase/cli/blob/v2.118.0/apps/cli/src/command-internal/status-values.ts)
- [Extension version pinning change](https://supabase.com/changelog/extension-version-pinning-ignored): pgTAP installation uses the available default extension version, with no `VERSION` clause.

The current Postgres minor-release advisory concerns ltree indexes, legacy pgcrypto ciphers, btree_gist floating-point indexes and custom selectivity operators. This fixture uses none of these features. Hosted service changes do not establish which database image has actually run locally; verify the CLI-managed image when containers become available.
