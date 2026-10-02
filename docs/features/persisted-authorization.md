# BL-AUTH-01 — Closed persisted identity and grant foundation

Source: v0.5 ROL-01–12, AUTH-04/05, SEC-01/02/06, ARC-02, AT-02.
Engineering decision: ENG-010. This extends the reviewed BL-SEC-01 contract.

## Smallest slice and exclusions

Persist technical edition, account-access, scoped grant and grant-audit metadata in a
private schema. Verify a supplied managed bearer identity on the server, then read a
minimal current context through a self-only database function. Database maintenance
can create an immutable grant or revoke it; neither a browser nor a service-role API
client receives permission to maintain those records. No initial account or grant is
installed. This is a closed prerequisite for M4, not an activated staff permission system.

Excluded: sign-up/sign-in interfaces, invitations, account or Super Admin creation,
MFA enrollment/recovery, staff session activation, role editing, scientific assignments,
participant profiles, domain records, uploads/buckets, CMS editing/publication, all
operational workflows, emails, paid provisioning and production-data collection.

The requester authorizes deploying the reviewed schema and permissions to the existing
selected Supabase project. Environment classification and the three named Super Admins
have been requested. No organizational appointment, privacy approval, production region
or retention duration is inferred. Those decisions remain CFG-09/10/11 release gates.

## Actor, scope and states

- Managed identity is verified with `auth.getUser(accessToken)` on each call. User-editable
  metadata, request roles and cached sessions never supply authority.
- Context is limited to the caller's current account/session and own edition-scoped
  grants. No email, other actor, resource owner, co-author, assignment packet or scientific
  data is returned. Future domain readers must resolve these facts through protected
  server/database authorization, not caller-supplied context.
- Account access defaults suspended and not individually identified. Grant absence denies;
  an active grant may become irreversibly revoked. Changing identity or scope requires a
  replacement grant. Grants across editions remain separate.
- Existing tokens cannot preserve access after account suspension, grant revocation,
  session removal or TOTP factor removal. Trusted JWT assurance is checked against current
  managed database evidence; email verification is not privileged MFA.
- Operational access remains explicitly closed in this context. AUTH-05's configurable
  absolute/idle/recent-authentication enforcement, logout/recovery, MFA lifecycle and
  human UAT must land before staff activation. Token refresh is not user activity.

## Validation, audit, privacy and recovery

Only known role/scope variants and nonempty scoped identifiers are accepted. Private
tables use explicit revoked grants and forced RLS. The narrow public function has a fixed
search path, explicit object qualification and authenticated-only execution. Anonymous
callers and direct table reads/writes are denied. The server adapter validates the returned
shape and identity again, fails closed and exposes generic errors without provider details,
tokens, claims or user content.

Grant creation/revocation writes an audit event in the same transaction. Audit mutation
and grant rewriting are rejected. Maintenance events identify the actual database role;
this is not a named human identity or staff appointment. Named performer evidence and
audited account activation/suspension must be added to the future authorized staff
bootstrap/administration flow. An audit failure rolls back the grant operation. No email
is emitted. No maintenance grant/account mutation is executed on the hosted project here.

Metadata contains opaque managed IDs and permission scope references only. No national
ID, participant collection field, scientific file, card data or content log is introduced.
Privacy retention, institutional custody and annual database/storage/configuration
separation remain later gates; edition columns alone do not settle ARC-02.

## Acceptance and verification

Automated acceptance covers own-context isolation, absent/invalid session, stale-factor
and revoked-grant denial, suspension and metadata spoofing; malformed RPC results and
provider failure; scope constraints, immutable grants/audit, direct anonymous/authenticated
table denial and transactional audit behavior. Synthetic SQL fixtures run in an isolated
CI database and roll back. They must not be replayed unchanged against the hosted project.

There is no new UI. Existing bilingual EN/AR generic denied/unavailable copy, RTL,
keyboard access and reduced motion remain unchanged. Future role and MFA interfaces
require bilingual keyboard/screen-reader UAT; reviewer assessments remain English.

Hosted acceptance: migration history matches the committed schema, private tables have
forced RLS and no client privileges, only the own-context function is exposed, anonymous
execution is denied, no accounts/grants/test records are installed, and security advisors
are inspected. Authenticated real-human session/MFA and staff duties are NOT TESTED until
authorized identities and enrollment are available. All 15 workflow flags must stay false.

## Files, environment and rollback

One additive migration, one actual-schema SQL test, server-only identity/context modules,
unit tests and current documentation/backlog status. Database lint now includes both
public and private authorization functions. Existing CI discovers the tests;
no new dependency, credential, environment variable, public route or UI is needed.

Complete changed-file inventory (17 files):

| Purpose | Files |
|---|---|
| Closed context and verified server adapter | `src/lib/permissions/persisted-context.ts`; `src/lib/supabase/identity.server.ts` |
| Database migration, actual-schema tests and read-only hosted inspection | `supabase/migrations/20261002173712_persisted_authorization.sql`; `supabase/tests/database/persisted_authorization.test.sql`; `supabase/verification/persisted_authorization.sql` |
| Reproducible hosted denial probe and command/type declaration | `package.json`; `scripts/verify-hosted-authorization.mjs`; `scripts/verify-hosted-authorization.d.mts` |
| Unit behavior | `tests/unit/persisted-identity.test.ts`; `tests/unit/hosted-authorization-verification.test.ts` |
| Setup, decisions, progress and backlog | `README.md`; `docs/ARCHITECTURE.md`; `docs/DECISIONS.md`; `docs/PROGRESS.md`; `docs/backlog/06-authentication.md`; `docs/backlog/ISSUE_INDEX.csv`; `docs/features/persisted-authorization.md` |

The committed `.github/workflows/ci.yml` is unchanged; it runs the new suites through
existing commands. The lockfile and environment example are unchanged because this slice
adds no dependency or environment setting. All workflow gates remain hard closed.

Apply only this reviewed application migration to the selected hosted project. The earlier
`foundation_samples` migration and seed are development/CI fixtures; never run hosted
`db:reset`, `db:push` or seed commands blindly. No database password or service key is needed
through the authorized Supabase connector.

`supabase/verification/persisted_authorization.sql` is the read-only hosted catalog/count
check. It never installs a fixture or lists personal rows. Read-only hosted verification
is separate from the synthetic allowed/denied test suite executed in isolated CI.
With the existing ignored hosted `.env.local`, `pnpm db:verify-authorization-hosted` checks
actual anonymous Data API denial without Docker, a database password or a service key.
It must return the permission-denied SQL code; a missing migration or bad key is a failure.

Rollback first closes/revokes the public RPC and reverts the server adapter. Preserve any
audit/security records; do not drop tables or rewrite migration history once data exists.
An empty-schema removal requires a separately reviewed reverse migration. No destructive
rollback is performed by this task.

Executed results and deployment receipts are recorded in PROGRESS. This note defines the
acceptance contract; it does not assert that an unrun check passed.

## Hosted advisor exception

The hosted security advisor reports
[0029 authenticated SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
for the self-context RPC. This is an intentional narrow exception: an invoker cannot read
private managed sessions/factors without widening table access. Fixed empty search path,
qualified objects, authenticated-only execution, current own managed identity/session,
minimized own projections and literal closed readiness flags bound the exception. No
private mutation RPC or domain record is exposed. Preserve this finding for security review
before staff activation; do not claim a clean hosted advisor result or add broad grants.
The function is directly callable through Supabase RPC; its own database checks provide
the boundary. The server adapter does not replace that boundary.

Four INFO findings for private RLS with no policy reflect intentional default denial;
three unused-index INFO findings reflect the empty deployment. They are recorded rather
than "fixed" by opening policies or deleting permission/FK indexes.
