# Staff migration 01 — disposable rehearsal receipt

**Status: rehearsal PENDING. Production execution remains NOT EXECUTED.**
The organizer authorized this isolated rehearsal after merging
[PR #44](https://github.com/xpexellent-dotcom/msrc-2027/pull/44) on 7 October 2026.
Merged source: `bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`.
This authorization covers no hosted SQL, configuration/flag changes, accounts,
bootstrap, Auth requests or email.

Requirement IDs: BL-AUTH-05/06, AUTH-04/05, ROL-12, SEC-01/02/06, REL-06.
The [operator packet](STAFF_MIGRATION_01_PACKET.md) remains the production review
input; none of its operator checkboxes is completed by a disposable rehearsal.

## Scope and method

The sole pending application migration is
[20261002193800_staff_mfa_session_foundations.sql](../../supabase/migrations/20261002193800_staff_mfa_session_foundations.sql):
Git blob `b16421c5e729c225716b87352de3aba6ead2e0ba`, 27,028 bytes, SHA-256
`ca8571443fe0390f25772f3fbd6014ac17e959eb79f70c2067b143ddcabd8108`.
The migration and prerequisite source files are unchanged.

The rehearsal stages the byte-identical local Supabase configuration, empty
application-migration directory and zero-byte seed file on a disposable GitHub
Ubuntu runner. Native Auth initialization creates its provider schema; no Auth
users, identities, sessions or factors are created. No hosted project link,
credentials, environment pull, Auth settings preparation or application flag
is supplied. The broader user-creating suites are skipped for this manual mode.

The reviewed persisted-authorization migration and already-applied independent
Contact migration reproduce the prerequisite baseline. The foundation sample,
Auth migrations 2–4, participant migration and staff-portal migration are excluded.
The Contact migration is baseline setup only; it performs no email delivery.
Both packet SQL blocks run as read-only catalog/count transactions. The harness
checks the candidate transaction and records only its own disposable history.

Local Windows execution is BLOCKED: the Docker daemon probe returned a missing
`docker_engine` pipe and WSL reported no installed distribution. Evidence is
therefore from disposable Linux CI, not a local Windows database run.

## Observed results

Runtime execution and its receipt are **PENDING**. Static preparation checks PASS:
exact migration hash, unchanged application/configuration files, workflow YAML,
manual-mode isolation, pinned actions, shell syntax and independent scope review.
No database runtime pass is claimed by these preparation checks.

## Remaining production prerequisites for migration 1

All remain **PENDING** and require a separately authorized production window:

- Exact single-file authorization, independently verified target and native
  operator, window, incident owner and reconciliation/restoration owner.
- Fresh hosted ledger/catalog verification: only the two approved applied
  migrations, candidate schema/version absent, unchanged prerequisite and Contact
  definitions, reviewed file hash, and no later overrides or synthetic fixture.
- Actual managed PostgreSQL/Auth version, column/type and function compatibility;
  disposable native images do not establish the managed target's state.
- Native `current_user=session_user=postgres`, BYPASSRLS capability and necessary
  Auth SELECT/row-lock/REFERENCES privileges, using approved TLS and private
  credential custody.
- Verified backup and restoration coverage, including independent Contact data
  and migration history; approved DDL lock/statement/connection deadlines and
  review of callers and user-deletion restrictions.
- A tool that identifies the exact DDL connection's PID/backend-start/attempt
  time and safely establishes its transaction outcome after interruption.
  A different preflight connection or catalog absence alone is insufficient.
- Continuing application/domain closure and flags off. No phone/SMS configuration
  or login is allowed to satisfy migration 1's historical intermediate policy.

After a future approved commit, the operator must independently verify the exact
catalog, forced RLS, effective/current/global/default ACLs, immutable definitions,
policy values and safe aggregates, preserve prerequisite/Contact state, then
record only version `20261002193800` and stop. Migration 2 requires its own review
and authorization. Production readiness is not inferred from this rehearsal.

User-dependent session expiry, suspension, factor deletion, fresh login,
authenticator enrollment and recovery are outside this no-account rehearsal.
Full-chain CI remains separate evidence. Production backups, TLS, load/locking,
actual backend interruption and provider acceptance are not proved here.
