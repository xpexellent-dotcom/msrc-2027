# Staff migration 01 — disposable rehearsal receipt

**Status: disposable rehearsal PASS. Production execution remains NOT EXECUTED.**
The organizer authorized this isolated rehearsal after merging
[PR #44](https://github.com/xpexellent-dotcom/msrc-2027/pull/44) on 7 October 2026.
Merged source: `bbb790f1c70d4f770ddc221a3cde8f6f01edbab2`.
This authorization covers no hosted SQL, configuration/flag changes, accounts,
bootstrap, account/authentication flow requests or email.

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

The opt-in [workflow](../../.github/workflows/staff-portal.yml) runs the
[harness](../../scripts/rehearse-staff-migration-one.ts) only in GitHub-hosted
Linux CI using its own runner-temporary paths:

```text
node scripts/rehearse-staff-migration-one.ts --workdir "$MSRC_REHEARSAL_WORKDIR" --evidence "$MSRC_REHEARSAL_EVIDENCE"
```

Native initialization/health checks are infrastructure traffic. No account
signup, sign-in, enrollment, recovery or user-dependent Auth API flow is called.

Local Windows execution is BLOCKED: the Docker daemon probe returned a missing
`docker_engine` pipe and WSL reported no installed distribution. Evidence is
therefore from disposable Linux CI, not a local Windows database run.

## Observed results

PASS on [GitHub Actions run 37636073539](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37636073539),
[job 112842535255](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37636073539/job/112842535255),
at source `f34fe416fa452138ef83a89e22f7d9129bf1cf5a` on
`codex/staff-migration-one-rehearsal`. The runtime receipt completed at
**14:23:08 UTC on 7 October 2026**; disposal/configuration proof followed at
**14:23:12 UTC**. Both broader suites were SKIPPED, not counted as passed.

| Check | Observed result |
| --- | --- |
| Runtime | Supabase CLI 2.118.0; PostgreSQL 17.6, image `public.ecr.aws/supabase/postgres:17.6.1.171`; native Auth image `public.ecr.aws/supabase/gotrue:v2.197.0`. |
| Exact input and configuration | All three source hashes matched; source and staged configuration remained byte-identical. Configuration SHA-256 `9555f9bae1ee67776df9cccdf75ca03a651242268074aacd4d236ccf979df89b`; packet SHA-256 `091f4507544cf6154a59899ec84d8affa4ea2f5fd8ce121631aba44721cf26cb`. |
| Packet queries | All 25 distinct catalog/count queries succeeded: 11 preflight and 14 postchecks. Repetition after rollback/replay produced 50 read-only packet-query executions total, alongside additional harness checks. |
| Assertions | 228 passed, including native PostgreSQL identity/privileges, 21 Auth columns/types, helper return types, catalog/ACL matrices and empty data. |
| Candidate schema | Four postgres-owned tables with enabled/forced RLS, zero client policies, eight private/four public functions, nine triggers, six indexes and twenty constraints including two Auth-user RESTRICT foreign keys. |
| Effective permissions | All private API schema/table/function privileges denied; only authenticated execution on the four intended public entry points. Current ACLs and both global/schema default metadata were inspected. No context/logout function was invoked. |
| Policy | One row: participant absolute 259,200s, privileged idle 1,800s and absolute 28,800s; both readiness values false; recency/warning NULL. No flag/readiness update was attempted. |
| Rollback | Whole candidate followed by injected division-by-zero failed with SQLSTATE `22012`; original execution backend ended; every preflight result and local ledger matched the baseline. |
| Replay | Reapplying the committed candidate failed at duplicate schema with SQLSTATE `42P06`; original execution backend ended; every postcheck result and local ledger remained unchanged. |
| Identity boundary | Eight native identity/session/factor/token tables were empty at all five checkpoints. Authority, application session, revocation and security-audit tables remained empty; no account, edition or role fixture was created. |
| Preservation and local history | Independent Contact function/ACL/job metadata and empty counters remained unchanged. Local history contained only `20261002173712`, `20261002193800`, `20261004114603`; the new version was recorded after commit/postcheck proof. |
| Exclusions | No synthetic foundation sample or later Auth/staff/participant schema. No hosted SQL/links, account/authentication flow requests, bootstrap, provider settings or emails. |
| Disposal | Local DB/Auth containers and DB volume proven absent after `stop --no-backup`; source/staged configuration still matched; the own loopback network was removed. |

The sanitized [artifact 11488462226](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37636073539/artifacts/11488462226)
contains the summary, all four packet-query receipts, five identity-count
checkpoints, helper types and Contact catalog baseline; retention is seven days.
The source, script, durable result summary here and job logs identify the run
independently of that temporary artifact. A local copy is in ignored
`test-results/staff-migration-one-rehearsal/`.

Local preparation checks PASS: focused ESLint, TypeScript `tsc --noEmit`, workflow
YAML/shell syntax, exact hashes, whitespace and independent technical/privacy
review. A Windows invocation was rejected by the guard before database access.
Downloaded receipts were independently compared: preflight equals post-rollback,
postcheck equals post-replay, source hashes match and all identity counts are zero.

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
Local ledger markers use SQL INSERT, not the future hosted CLI repair command;
that command and its linked-target custody are NOT REHEARSED here. Original
connections end before rollback/replay reconciliation; an ambiguous/dangling
commit is NOT SIMULATED. Full-chain CI remains separate evidence. Production
backups, TLS, load/locking, actual backend interruption and provider acceptance
are not proved here.
