# Direct hosted Supabase connection

Requirements: INF-01/04/05, SEC-01/02/06, REL-06. Authority: current user request and
selected project URL; decision ENG-006. Scope is connection setup, not a product release.

## Contract

- Actor: developer configuring the platform; public pages remain anonymous and static.
- Purpose: use the existing managed Supabase project without running Docker on this PC.
- States: absent settings -> static preview; valid explicit hosted settings -> anonymous
  data client; invalid/partial/wrong-target settings -> sanitized error before requests.
- Configuration: `NEXT_PUBLIC_SUPABASE_TARGET=hosted`, exact HTTPS project origin and
  modern publishable key in ignored `.env.local`. Default/blank target remains `local` for
  existing CI. Production builds inline public values, so rebuild after changing them.
- Data touched: read-only project/schema/migration/advisor metadata, public Auth service
  settings and a constant database probe. No table rows, migrations, seed, users, sessions, buckets, grants or RLS
  policies are written. No real data is copied into development or test environments.
- Roles/security: existing anonymous Data API access only; no privileged key, session
  persistence, automatic refresh or callback detection. Server fetches use `no-store`.
  Hosted default types match the observed empty public schema. Local fixture factories
  require explicit `local` and reject hosted settings before construction.
- Audit/email: no consequential product action or transactional email. Git and this
  decision record track the setup; provider requests may appear in provider logs.
- Language/accessibility: no user-facing UI change. Existing EN/AR/RTL/accessibility
  regression checks apply; no new form, status page or admin interface is exposed.
- Exclusions: registration, submission, payments, review, check-in, certificates, CMS
  editing, auth workflows, hosted schema changes, DNS, deployment and paid provisioning.

## Selected project and setup

Project `msrc`, reference `ecemjggwlzqpjcwmchrl`, API
`https://ecemjggwlzqpjcwmchrl.supabase.co`, region `ap-northeast-1`, ACTIVE_HEALTHY.
The user supplied the API URL. Metadata inspection found no public tables or migration
history; generated public types also contain no views/functions/enums/composite types.
Security advisors returned `lints: []`. No record content was queried.

An existing enabled modern publishable key was obtained through the authorized connector
and written without printing it to a newly created, ignored `.env.local`. The file also
contains the public URL and explicit target. A new clone needs those public settings
copied from the authorized Dashboard; no GitHub Actions secret is required. Vercel has
not been configured or deployed by this task.

## Verification

Run `pnpm db:verify-hosted` to make one bounded GET of `/auth/v1/settings` with the
publishable key. Redirects are rejected and response bodies are discarded. A 200 response
confirms service reachability/key acceptance, not Data API CRUD access, RLS tests or feature readiness. Failure reports
status and sanitized guidance; never dump a raw response or request header.

Local test isolation has two layers: integration configuration validates a local target
and loopback URL before test collection, and each local fixture factory repeats that
restriction. `pnpm db:reset`, pgTAP/lint/type commands retain explicit `--local`; local
fixture SQL must never be sent through the hosted SQL editor or connector.

Observed execution on 29 September 2026:

| Check | Result |
|---|---|
| Supabase project/schema/migration/generated-type/advisor reads | PASS; selected project healthy, empty public schema/history and zero returned security findings |
| Initial REST root metadata probe | HTTP401: `Secret API key required`; did not add a secret key or weaken project settings |
| `pnpm db:verify-hosted` | PASS, HTTP200 from public service settings with the existing publishable key; no records read or written |
| Connector `SELECT 1 AS connection_ok` | PASS, returned 1; no table query |
| `pnpm db:integration` with hosted settings | Expected exit1 before collection; refusal verified, no fixture SQL or Data API mutations executed |
| `pnpm check` | PASS: lint, route types/TypeScript, 157 unit tests and production build with hosted public settings |
| Final diagnostic hardening | Scoped ESLint and full `pnpm test` PASS, **158 tests** after adding response-stream error redaction coverage |
| `pnpm test:e2e` | PASS, **60 cases in 39.3s** across EN/AR desktop/tablet/mobile; existing accessibility, closed-operation, media and keyboard assertions |
| Independent safety review | No blocking issue; response cancellation diagnostics sanitized and covered by the final test |
| Git whitespace, changed-doc relative links and environment exclusion | PASS; `.env.local` ignored and excluded from source control |
| Windows local database engine | NOT TESTED; optional PC container setup still needs restart/first launch |

The associated GitHub PR runs the committed application and synthetic database workflow;
its checks provide the hosted-run conclusion for the final pushed commit. Hosted database
RLS/CRUD behavior is NOT TESTED because this task introduces no hosted tables or grants.

Changed files: `.env.example`, `README.md`, `package.json`, `vitest.integration.config.ts`,
`src/lib/supabase/config.ts`, `browser.ts`, `server.ts`, `unconfigured-database.types.ts`,
`scripts/verify-hosted-supabase.mjs`, its `.d.mts` declaration,
`tests/unit/hosted-config.test.ts`, `tests/unit/hosted-verification.test.ts`,
`tests/integration/local-supabase.test.ts`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`,
`docs/OWNERSHIP_AND_SETUP.md`, `docs/PROGRESS.md`, `docs/features/local-data.md` and this
feature note. No dependency versions, lockfile, migration or workflow definition changed.

## Remaining release gates and rollback

Docker/WSL are already installed but need Windows restart/first launch for optional PC
fixture tests. Hosted app work does not depend on that. GitHub continues to test a fresh
synthetic Linux Supabase stack without a hosted key. No host test is relabeled as passed.

No migration is needed or applied. Revert the hosted-connection PR and remove the three
Supabase public settings from the ignored environment file (preserving other user settings)
to restore the no-database public preview. This does not delete or change the hosted project.
No key was created or rotated, so there is no new credential to revoke. Avoid deleting
the project or rolling back database data as part of a code rollback.

Before product data flows are added, generate types from the approved schema, implement
explicit grants/RLS and allowed/denied tests, isolate staging from production, and resolve
ownership, processing region, privacy, backup and release approvals. No technical connection
opens any of these gates.

Official guidance reviewed: [securing Data API clients](https://supabase.com/docs/guides/database/secure-data),
[publishable keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys),
[environment separation](https://supabase.com/docs/guides/deployment/managing-environments).
