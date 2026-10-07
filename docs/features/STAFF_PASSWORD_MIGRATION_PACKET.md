# Owner password-change migration execution packet

Preparation only. No hosted SQL or configuration is executed by this packet.
This is an additional migration after the six individually completed setup
migrations, not a retry or replacement of those files. Read
[the feature/release guide](STAFF_PASSWORD_CHANGE.md) first.

File: `supabase/migrations/20261007195540_staff_password_change.sql`.
Record the exact reviewed Git commit, file bytes and SHA-256 at execution time.
Use the original version `20261007195540` for history; never modify older applied
versions or include the synthetic sample migration.

## Prerequisites

- Reviewed merged source and green exact-head application, database, genuine
  native Auth, participant regression and EN/AR/mobile/axe checks. Stop on failures
  or incomplete checks. Independently review the transient protected-marker and
  deferred-commit enforcement, including the pinned native Auth statement order.
- Exact approved Supabase/Vercel targets and current original eight-version
  hosted ledger. Preserve Auth, Contact, RLS/grants, email suppression, recovery
  holds, factor/session evidence, provider notifications and quota settings.
- Fresh protected backup and isolated restore proof covering the now-enrolled
  account. Pre-bootstrap backup evidence alone is insufficient. Keep restored
  identity/factor material private and isolated; no email or real user creation.
- Explicit `STAFF_PASSWORD_CHANGE_ENABLED=false` in Production before execution.
  The new database column must be absent before first application; it defaults
  false. Existing restricted staff access may remain as authorized. Participant
  and operational readiness must remain false throughout this sequence.
- Native operator connection with verified target/identity/TLS, bounded lock and
  statement timeouts, and an exact attempt/backend marker stored privately.
  No credential-bearing connection strings, hashes, identities or provider
  payloads belong in shell output, CI artifacts or this document.

## Read-only preflight

Run through the approved native operator, with values limited to the following
catalog/count/boolean output. Do not call context/activity, reservation or
password-change RPCs for read-only verification.

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SELECT current_user = 'postgres' AND session_user = 'postgres' AS native_operator;
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
SELECT to_regclass('msrc_staff.password_changes') IS NULL AS owner_table_absent;
SELECT NOT EXISTS (
  SELECT 1 FROM pg_attribute
  WHERE attrelid = 'msrc_staff.policy'::regclass
    AND attname = 'password_change_enabled' AND NOT attisdropped
) AS new_gate_absent;
SELECT count(*) AS users FROM auth.users;
SELECT count(*) AS profiles FROM msrc_staff.profiles;
SELECT count(*) AS verified_totp FROM auth.mfa_factors
  WHERE factor_type::text = 'totp' AND status::text = 'verified';
SELECT enabled, bootstrap_completed, bootstrap_pairing_completed
  FROM msrc_staff.policy WHERE singleton;
SELECT NOT enabled AS participant_closed FROM msrc_participant.policy WHERE singleton;
SELECT NOT operational_access_ready AND NOT privileged_access_ready AS operational_closed
  FROM msrc_sessions.policy WHERE singleton;
ROLLBACK;
```

Compare the sanitized counts and booleans to the latest independently verified
restricted state, allowing expected session expiry/activity without claiming a
current live session from an older receipt. Unexpected users/factors/grants,
recovery holds, existing new objects, settings or ledger versions mean STOP and
reconciliation. Existing new objects do not prove a prior attempt ended.

## One-file execution and verification

1. Validate file bytes/hash and the exact attempt/native backend. Run only this
   file in a native transaction, with `lock_timeout='5s'` and
   `statement_timeout='60s'`. No fixture, seed, reset or other migration.
2. Verify the new gate is false, one new private table enables and forces RLS
   with no client policies, clients have no table/schema privileges, and only
   `authenticated` can call begin while only `service_role` can call result.
   Inspect all new functions for fixed search paths and explicit revoked PUBLIC
   execution. The status function preserves existing staff readiness semantics.
3. Verify both new native triggers exist, the commit trigger is enabled,
   deferrable and initially deferred, and existing invitation, participant,
   recovery, token/mail and session guards remain. Inspect changed guard
   definitions against the reviewed source; name-only checks are insufficient.
4. Verify preflight account/factor/grant/closure counts and existing Auth/Contact
   schema/data/grants remain identical except the reviewed new catalog changes.
   The migration seeds no account, factor, reservation or password change.
5. Record only the exact original version in the hosted migration ledger under
   the provider-compatible procedure, then verify the schema and ledger again.
   Preserve the eight prior original versions and all immutable history. Commit
   only after the bounded checks pass; record the sanitized outcome privately.
6. Fresh post-commit catalog checks and current/stale request denial must pass
   before any later separately gated owner UI handoff. Applying the migration
   does not enable the feature or change the account password.

Useful post-application read-only assertions:

```sql
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SELECT NOT password_change_enabled AS owner_change_closed
  FROM msrc_staff.policy WHERE singleton;
SELECT count(*) = 0 AS no_changes_seeded FROM msrc_staff.password_changes;
SELECT relrowsecurity AND relforcerowsecurity AS private_rls
  FROM pg_class WHERE oid = 'msrc_staff.password_changes'::regclass;
SELECT NOT EXISTS (
  SELECT 1 FROM pg_policies
  WHERE schemaname = 'msrc_staff' AND tablename = 'password_changes'
) AS no_client_policy;
SELECT NOT has_table_privilege('anon', 'msrc_staff.password_changes', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'msrc_staff.password_changes', 'SELECT')
  AND NOT has_table_privilege('service_role', 'msrc_staff.password_changes', 'SELECT')
  AS no_client_table_access;
SELECT has_function_privilege('authenticated', 'public.msrc_staff_password_change_begin(text,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.msrc_staff_password_change_begin(text,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('service_role', 'public.msrc_staff_password_change_begin(text,uuid)', 'EXECUTE')
  AS begin_grants;
SELECT has_function_privilege('service_role', 'public.msrc_staff_password_change_result(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.msrc_staff_password_change_result(uuid)', 'EXECUTE')
  AND NOT has_function_privilege('anon', 'public.msrc_staff_password_change_result(uuid)', 'EXECUTE')
  AS result_grants;
SELECT tgenabled = 'O' AND tgdeferrable AND tginitdeferred AS deferred_commit_guard
  FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass
  AND tgname = 'staff_password_commit' AND NOT tgisinternal;
SELECT NOT enabled AS participant_closed FROM msrc_participant.policy WHERE singleton;
SELECT NOT operational_access_ready AND NOT privileged_access_ready AS operational_closed
  FROM msrc_sessions.policy WHERE singleton;
ROLLBACK;
```

## Failure handling

Stop subsequent actions on failure; retain private attempt and sanitized
SQLSTATE/check evidence. A missing response, new connection or absent history row
does not prove rollback while the original backend may still be running. Prove
the exact original PID/backend-start/transaction-start outcome before retry or
ledger repair. Do not replay DDL, terminalize an in-flight operation or add a
ledger row merely to make history look successful.

For known committed state, keep/close the new database gate first and server gate
second, deploy if needed, and verify closure. Preserve the deferred guard,
immutable reservation/audit/history, revoked sessions, retained authenticators
and peer-recovery holds. A later ROLLBACK does not undo committed DDL or a password
change. Use a reviewed forward correction or managed restore with post-backup
security/data reconciliation; never restore an obsolete password to bypass
other-admin recovery. No email, new account or participant/operational activation
is part of this packet.
