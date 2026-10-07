# Staff migration 01 — operator review packet

**Status: NOT EXECUTED. Every operator checkbox is PENDING.** This documentation
request authorizes preparation and review only. It authorizes no local/hosted SQL
execution, migration-history repair, settings/flag change, bootstrap, enrollment,
invitation, reset or email. Execution requires a separate explicit authorization
for the single file identified below, its target, operator and migration window.

Scope: BL-AUTH-05/06 foundations, AUTH-04/05, ROL-12, SEC-01/02/06, REL-06.
[DECISIONS](../DECISIONS.md) remains authoritative. This packet is the first
schema-preparation step in the [activation checklist](STAFF_ACTIVATION_CHECKLIST.md),
not the complete staff release gate or permission to execute its later stages.

## Exact artifact and target

| Item | Review input |
| --- | --- |
| Only candidate file | [20261002193800_staff_mfa_session_foundations.sql](../../supabase/migrations/20261002193800_staff_mfa_session_foundations.sql) |
| Migration version | `20261002193800` — pending migration 1 of #25 |
| Reviewed documentation/source revision | `9dfeea0522796626b0c9523c0bc647a5e7a5b450` on `codex/staff-activation-checklist` |
| Merged application/source base | `2a991d2a13fa9b0b7f04877d2001ad95f134f136` on `origin/main`; SQL is unchanged between these revisions |
| Git blob | `b16421c5e729c225716b87352de3aba6ead2e0ba` |
| Exact file size | 27,028 bytes |
| SHA-256 of reviewed file bytes | `ca8571443fe0390f25772f3fbd6014ac17e959eb79f70c2067b143ddcabd8108` |
| Designated target | Supabase Production project `ecemjggwlzqpjcwmchrl`, per ORG-017; operator must independently verify it |
| Sole application-schema prerequisite | [20261002173712_persisted_authorization.sql](../../supabase/migrations/20261002173712_persisted_authorization.sql), already recorded applied; verify definitions, do not reapply |
| Independent applied migration | [20261004114603_contact_abuse_counters.sql](../../supabase/migrations/20261004114603_contact_abuse_counters.sql); not a dependency and must remain unchanged |

The file hash is an identity check, not execution approval. Stop if the approved
revision, bytes/hash, target or prerequisite differs. Do not edit or normalize
the SQL during execution. The synthetic foundation sample must remain absent
from hosted application/history. Migration 2 and all later Auth/staff migrations
are excluded from this packet, as are Contact changes and blanket `db push`,
`db reset`, seeds and automatic directory execution.

## Prior baseline — fresh operator verification required

The earlier preparation record is dated 7 October 2026; its live HTTP closure
checkpoint is **12:42:14 UTC**. Hosted catalog/history reads in that preparation
record were not rerun for this packet. These observations are historical inputs,
not a current preflight pass:

- Only `20261002173712_persisted_authorization` and
  `20261004114603_contact_abuse_counters` were recorded applied.
- `msrc_sessions`, `msrc_staff` and `msrc_participant` were absent.
- Production at merged `main` was READY but staff pages/API/domain workflows
  remained closed. Environment metadata had no `STAFF_*` variables or
  `PARTICIPANT_ACCOUNTS_ENABLED`; no secret values were inspected.
- No hosted migration/settings, live account creation, real recovery or real
  email was performed. Current receipts and exact-head CI are in
  [PROGRESS](../PROGRESS.md).

- [ ] **PENDING:** Recheck these facts immediately before the separately approved
  migration window. Require both absence of `msrc_sessions` and absence of ledger
  version `20261002193800`; either unexpected presence stops ordinary application
  and enters the reconciliation procedure below.
- [ ] **PENDING:** Confirm `STAFF_PORTAL_ENABLED` and
  `PARTICIPANT_ACCOUNTS_ENABLED` remain unset/false and all unrelated domain gates
  remain closed. `msrc_staff.policy` does not exist at this stage: do not create
  or enable a replacement gate. Do not change Vercel/Auth/email settings to apply
  this schema file.

## Impact of migration 1 alone

This intermediate snapshot is **not the final staff assurance policy**. It still
checks verified participant phone and privileged password + native phone factor/
`mfa/phone` evidence, and its access projection can describe `sms`. ORG-016 retires
that policy; later reviewed #25 migrations replace it with no participant phone,
regular-staff session email checking and Super Admin TOTP. Do not activate or
configure SMS/phone providers to satisfy this intermediate snapshot. Applying
only migration 1 cannot enable the current staff portal.

The existing strict application parser rejects this intermediate phone/SMS
projection where the final authentication-tier/staff-email shape is required.
Server/domain gates remain closed independently. Do not weaken parsers or gates
as a workaround; subsequent migrations need their own reviewed execution packets.

| Object change | Exact migration-1 scope |
| --- | --- |
| Private schema and tables | `msrc_sessions`: `policy`, `session_state`, `actor_revocations`, `security_audit`; all four tables enable and force RLS, with no client policies/table/sequence grants. |
| Inserted data | One policy row only: participant absolute 259,200 seconds; privileged idle 1,800; privileged absolute 28,800; recent-auth/warning NULL; both readiness values false. No identity, edition, role, factor, session, revocation or audit fixture is seeded. |
| Private functions | Eight: `guard_session_state`, `audit_session_state`, `guard_actor_revocation`, `audit_actor_revocation`, `guard_audit`, `account_suspension`, `revoke_actor_sessions`, `own_context`. |
| Public entry points | Three new authenticated-only functions: `msrc_session_context(text)`, `msrc_session_activity(text)`, `msrc_session_logout(text)`; replaces the already applied `msrc_access_context(text)`. No `anon` or `service_role` execution grant. |
| Triggers | Eight on the new private tables, plus `account_access_suspend_sessions` AFTER UPDATE on existing `msrc_authorization.account_access`. No trigger is created on a native Auth table. |
| Foreign keys | `session_state.actor_id` and `actor_revocations.actor_id` reference `auth.users(id)` with ON DELETE RESTRICT. No `auth.sessions` FK: native session deletion stays possible. Future observed/revoked actors can therefore constrain native user deletion. |
| Other effects | Two non-primary indexes, four primary-key indexes, schema default-ACL statements, explicit revocation on current private objects and a transaction-commit `NOTIFY pgrst` schema reload. No email/provider settings or native enrollment/recovery/hook implementation. |

Both generic readiness columns have `CHECK (NOT ...)`; they cannot be enabled
by configuration. Recent-auth age and warning lead remain NULL/TBD. The private
consequential-maintenance helper remains closed and refuses factor-reset recovery.
The final #43 recovery hold, invitation/bootstrap, staff email delivery and native
perimeter are not present after migration 1 alone.

**This migration is not entirely inert.** Its authenticated context/activity/access
functions invoke a volatile checker that can create lifecycle/audit rows or mark
expiry, and logout can revoke the caller's session. Suspension updates acquire
account/session locks and record revocation/audit. A `SELECT` of these functions
is not a read-only catalog check. Do not call them, supply JWT claims, log in,
change an account or replay synthetic fixtures as hosted verification in this
packet. Public observations do not extend idle activity, and returned domain
readiness/session-active remains false.

## Prerequisite and compatibility review

- [ ] **PENDING:** Record separate migration-1 approval, exact artifact/target,
  organizational operator, window, incident owner and rollback/reconciliation
  owner. This schema-only approval does not require opening the portal or sending
  messages, and is not approval of the full activation checklist.
- [ ] **PENDING:** Verify a native `postgres` connection with both `current_user`
  and `session_user` equal to `postgres`, intended database/project and TLS.
  Verify the role's BYPASSRLS/superuser capability and required Auth-table
  read/row-lock/reference rights; private object ownership follows the executor
  and forced RLS must not break the reviewed definer contract.
  Use approved private credential handling; no credentials in command arguments,
  source, transcripts, screenshots or diagnostic output.
- [ ] **PENDING:** Verify actual backup/restore coverage and an approved failure
  plan before DDL. Record restoration evidence and expected effects on independent
  Contact data/history; provider selection and successful CI do not prove backups.
- [ ] **PENDING:** Inspect the applied prerequisite's four private tables,
  constraints/scopes, forced RLS, ACL/default ACL, immutable grant/audit triggers,
  `prevent_history_truncate()` and existing `public.msrc_access_context(text)`
  against its exact reviewed definition. Save only safe aggregate/catalog evidence.
  The existing context function is intentionally replaced by migration 1; it must
  not already contain a later override or unexplained local patch.
- [ ] **PENDING:** Verify native `auth.users`, `auth.sessions`, `auth.mfa_factors`
  columns/types and `auth.uid()`/`auth.jwt()` compatibility used by this file.
  Inspect native schema/version without user, credential, factor-secret, token
  or provider-payload rows. Compare actual managed Auth/PostgreSQL versions with
  the reviewed source and disposable CI; GoTrue v2.197.0 full-chain CI is not a
  fresh managed-target compatibility proof.
- [ ] **PENDING:** Review DDL locking, existing callers of the replaced context
  function, the account-suspension trigger and future user-deletion restrictions.
  Approve and record connection/lock/statement/idle-transaction deadlines for
  the actual target version before execution; this document invents no timeout
  values. Establish how the approved tool records the **exact DDL connection's**
  backend PID, backend-start and attempt UTC time, and how the incident operator
  safely inspects that identified backend without query text. A separate preflight
  or pooled SQL Editor request can use a different connection; its PID is not DDL
  evidence. If the tool cannot establish the original execution backend/outcome,
  stop before DDL. Stop on unapproved lock contention or compatibility uncertainty.

### Read-only preflight SQL for later operator review

**NOT EXECUTED.** These are catalog/count `SELECT`s, not a runnable migration.
Run only in a separately authorized native-operator read-only transaction.
Missing objects/columns, privilege errors, unexpected rows or changed definitions
are failures to investigate, not reasons to skip a check. Query output must remain
metadata/aggregates; do not attach identity rows or native payloads.

```sql
select current_user, session_user, current_database(),
       current_setting('server_version') as postgres_version;

select rolname, rolsuper, rolbypassrls
from pg_roles where rolname='postgres';
-- Require native postgres identity and a role that can bypass forced RLS.

select object, has_table_privilege('postgres',object,'SELECT') as may_select,
       has_table_privilege('postgres',object,'UPDATE') as may_row_lock
from (values('auth.users'),('auth.sessions'),('auth.mfa_factors')) required(object);
select has_table_privilege('postgres','auth.users','REFERENCES') as may_reference_users;
-- All true: native reads/locking and the two auth.users references need these rights.

select version, name
from supabase_migrations.schema_migrations
order by version;
-- Expected prior ledger: only persisted authorization + Contact counters.

select to_regnamespace('msrc_authorization') as prerequisite_schema,
       to_regnamespace('msrc_sessions') as candidate_schema,
       to_regnamespace('msrc_staff') as later_staff_schema,
       to_regnamespace('msrc_participant') as later_participant_schema,
       to_regprocedure('public.msrc_access_context(text)') as prerequisite_rpc,
       to_regprocedure('public.msrc_session_context(text)') as new_context_rpc,
       to_regprocedure('public.msrc_session_activity(text)') as new_activity_rpc,
       to_regprocedure('public.msrc_session_logout(text)') as new_logout_rpc;
-- Prerequisite schema/RPC present; the candidate/later schemas and new RPCs absent.

select signature, to_regprocedure(signature) as resolved
from (values
  ('auth.uid()'), ('auth.jwt()'),
  ('msrc_authorization.prevent_history_truncate()'),
  ('pg_catalog.gen_random_uuid()')
) required(signature);
-- All must resolve with compatible return types/definitions.

with expected(schema_name, table_name, column_name) as (
  select 'auth', 'users', unnest(array[
    'id','deleted_at','email','email_confirmed_at','phone','phone_confirmed_at',
    'is_anonymous','banned_until'])
  union all
  select 'auth', 'sessions', unnest(array[
    'id','user_id','created_at','not_after','factor_id','aal'])
  union all
  select 'auth', 'mfa_factors', unnest(array[
    'id','user_id','factor_type','status','phone','created_at','updated_at'])
)
select e.*, c.data_type, c.udt_schema, c.udt_name
from expected e
left join information_schema.columns c
  on c.table_schema=e.schema_name and c.table_name=e.table_name
 and c.column_name=e.column_name
order by e.schema_name,e.table_name,e.column_name;
-- No missing column/type; compare UUID/time/boolean/text-or-enum compatibility.

select c.relname, pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='msrc_authorization' and c.relkind='r'
order by c.relname;
-- Exactly account_access, edition_config, grant_audit, role_grants;
-- postgres owner, both RLS flags true. Inspect definitions/ACLs against prerequisite.

select p.oid::regprocedure as signature, pg_get_userbyid(p.proowner) as owner,
       p.prosecdef, p.provolatile, p.proconfig, pg_get_functiondef(p.oid) as definition
from pg_proc p
where p.oid in (
  to_regprocedure('msrc_authorization.prevent_history_truncate()'),
  to_regprocedure('public.msrc_access_context(text)')
);
-- Compare complete definitions to the applied prerequisite, not later migrations.

select 'edition_config' as object, count(*) as rows from msrc_authorization.edition_config
union all select 'account_access', count(*) from msrc_authorization.account_access
union all select 'role_grants', count(*) from msrc_authorization.role_grants
union all select 'grant_audit', count(*) from msrc_authorization.grant_audit;
-- Preserve aggregate baseline; no IDs, reasons, claims, emails or grant edits.
```

## One-file transaction — future execution only

- [ ] **PENDING:** With separate explicit authorization and passing preflight,
  execute only the complete hashed file as native `postgres` in one transaction.
  In the approved SQL Editor use `BEGIN;`, the full file, then `COMMIT;`, with
  stop-on-error behavior and approved transaction deadlines. Do not concatenate
  later files or silently omit/change statements.
- [ ] **PENDING:** If the operator uses `psql`, supply its approved connection
  privately, then use the reviewed one-file form below. `-X` avoids startup-file
  surprises, `ON_ERROR_STOP` stops on an error, and `--single-transaction` wraps
  this file. Check the installed client/target-major documentation and approved
  timeout handling before use. The command below has **NOT BEEN RUN**.

```text
psql -X --set=ON_ERROR_STOP=1 --single-transaction --file=supabase/migrations/20261002193800_staff_mfa_session_foundations.sql
```

[PostgreSQL psql reference](https://www.postgresql.org/docs/current/app-psql.html)
and [transaction reference](https://www.postgresql.org/docs/current/sql-begin.html)
support this format. No connection string/password belongs in this command or
evidence. If using `--single-transaction`, do not add a separate wrapper to the
file. The final schema-cache notification takes effect at commit; it is not mail.

- [ ] **PENDING:** Record the transaction outcome before doing anything else.
  A successful SQL commit must be proved by catalog checks below; a network error
  or missing success message is not proof of rollback. Keep all gates closed.
  Do not update migration history until commit and metadata verification succeed.

## Post-commit metadata checks — migration 1 only

**NOT EXECUTED.** Run catalog/count checks in an authorized read-only transaction,
never the volatile public/private context helpers. Compare against migration 1,
not the final six-file schema or final TOTP/email projections.

```sql
select c.relname, pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity, c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='msrc_sessions' and c.relkind='r'
order by c.relname;
-- Exactly actor_revocations, policy, security_audit, session_state;
-- owner postgres and both RLS flags true for all four.

select count(*) as client_policies
from pg_policies where schemaname='msrc_sessions';
-- Zero. No private client policies are added.

select singleton, participant_absolute_seconds, privileged_idle_seconds,
       privileged_absolute_seconds, recent_auth_max_age_seconds,
       warning_lead_seconds, operational_access_ready, privileged_access_ready
from msrc_sessions.policy;
-- One row: true,259200,1800,28800,NULL,NULL,false,false.

select 'session_state' as object, count(*) as rows from msrc_sessions.session_state
union all select 'actor_revocations', count(*) from msrc_sessions.actor_revocations
union all select 'security_audit', count(*) from msrc_sessions.security_audit;
-- SQL seeds zero rows in all three. Unexpected observations require inspection,
-- not deletion or a manufactured clean result.

select c.relname, k.conname, pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='msrc_sessions'
order by c.relname,k.conname;
-- Compare all constraints to the file, including false-only policy checks,
-- immutable/revocation state rules and two auth.users ON DELETE RESTRICT FKs.

select tablename, indexname, indexdef
from pg_indexes where schemaname='msrc_sessions'
order by tablename,indexname;
-- Four PK indexes plus session_state_actor and security_audit_actor.

select n.nspname, c.relname, t.tgname, t.tgenabled,
       pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where not t.tgisinternal and (n.nspname='msrc_sessions'
  or (n.nspname='msrc_authorization' and c.relname='account_access'))
order by n.nspname,c.relname,t.tgname;
-- Eight new private triggers + account_access_suspend_sessions (enabled O).
-- Preserve any pre-existing prerequisite trigger; compare definitions below.

select p.oid::regprocedure as signature, pg_get_userbyid(p.proowner) as owner,
       l.lanname, p.prosecdef, p.provolatile, p.proconfig,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
join pg_language l on l.oid=p.prolang
where n.nspname='msrc_sessions'
   or (n.nspname='public' and p.proname in (
     'msrc_session_context','msrc_session_activity','msrc_session_logout',
     'msrc_access_context'))
order by n.nspname,p.proname,p.oid;
-- Exactly eight private + four public signatures listed below; all postgres,
-- volatility v and fixed empty search_path. Only private own_context and
-- all four public entry points are SECURITY DEFINER; seven private helpers invoker.

select r.name as api_role, has_schema_privilege(r.name,'msrc_sessions','USAGE') as schema_usage,
       c.relname, has_table_privilege(r.name,c.oid,
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as any_table_right
from (values('anon'),('authenticated'),('service_role')) r(name)
cross join pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='msrc_sessions' and c.relkind='r'
order by r.name,c.relname;
-- Every schema/table boolean false. Inspect complete ACLs as well.

select r.name as api_role, p.oid::regprocedure as signature,
       has_function_privilege(r.name,p.oid,'EXECUTE') as may_execute
from (values('anon'),('authenticated'),('service_role')) r(name)
cross join pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='msrc_sessions'
   or (n.nspname='public' and p.proname in (
     'msrc_session_context','msrc_session_activity','msrc_session_logout',
     'msrc_access_context'))
order by r.name,n.nspname,p.proname,p.oid;
-- All private executions false. Public: authenticated true; anon/service_role false.

select n.nspname, n.nspacl
from pg_namespace n where n.nspname='msrc_sessions';
select c.relname, c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='msrc_sessions' order by c.relname;
select p.oid::regprocedure as signature, p.proacl
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='msrc_sessions'
   or (n.nspname='public' and p.proname in (
     'msrc_session_context','msrc_session_activity','msrc_session_logout',
     'msrc_access_context'))
order by p.oid::regprocedure::text;
select pg_get_userbyid(d.defaclrole) as owner,
       coalesce(n.nspname,'<global>') as default_scope,
       d.defaclobjtype, d.defaclacl
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
where d.defaclrole='postgres'::regrole
  and (d.defaclnamespace=0 or n.nspname='msrc_sessions')
order by default_scope,d.defaclobjtype;
-- Inspect postgres global + schema-local defaults together, including implicit
-- defaults when rows are absent. Current private-function rights are denied by
-- the file's explicit REVOKE ALL ON ALL FUNCTIONS, not schema defaults alone.
```

Per-schema defaults add to global defaults and cannot remove global/default
`PUBLIC EXECUTE`. An absent schema-local function-default row does not prove
future functions lack that grant. Migration 1 explicitly revokes execution on
all eight current private functions; verify those effective ACLs separately.
Future functions require their own explicit privilege review. See
[PostgreSQL ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html).
Do not change the historical migration or global defaults within this packet.

Expected private signatures are:
`guard_session_state()`, `audit_session_state()`, `guard_actor_revocation()`,
`audit_actor_revocation()`, `guard_audit()`, `account_suspension()`,
`revoke_actor_sessions(uuid,uuid,uuid,text)`, `own_context(text,boolean)`.
The first six return `trigger`, revocation returns `void`, context returns `jsonb`.
Public context/activity/access each accept `text` and return `jsonb`; logout
accepts `text` and returns `boolean`. No overload or additional function is expected.

Expected new private triggers are `session_state_guard`, `session_state_audit`,
`actor_revocation_guard`, `actor_revocation_audit`, `security_audit_append_only`,
`security_audit_no_truncate`, `session_state_no_truncate`,
`actor_revocations_no_truncate`. The last three call the existing prerequisite
`msrc_authorization.prevent_history_truncate()`; others call the matching private
helpers. Verify trigger timing/events/row-vs-statement and full definitions against
the file. M1 creates no trigger on `auth.users` or another Auth table.

- [ ] **PENDING:** Review every metadata result against the exact file and confirm
  prerequisite definitions/aggregate counts, native Auth definitions and independent
  Contact objects/history are preserved except the specified replaced RPC and
  added account-suspension trigger. Record and resolve unexpected results privately;
  do not widen privileges or erase evidence to produce an expected count.
- [ ] **PENDING:** Confirm both readiness checks remain false-only, NULL recency/
  warning values unchanged, no identity seeded, later schemas absent, all app flags
  still off, and staff/public/domain closure unaffected. Do not exercise real staff
  sessions or email to demonstrate this schema preparation.

## Single-version ledger recording — after proof only

- [ ] **PENDING:** Once successful SQL commit and all postchecks are proved, use
  the separately approved authenticated CLI/ledger procedure to record **only
  `20261002193800`**. The pinned Supabase CLI is 2.118.0; its repair/list help was
  inspected locally, without executing a linked operation. Recheck installed help
  and independently verify the private linked target before use; no CLI upgrade
  is part of this packet.

```text
pnpm exec supabase migration repair 20261002193800 --status applied --linked
pnpm exec supabase migration list --linked
```

These future commands are **NOT EXECUTED**. Use private credential prompts/store;
do not pass passwords or token-bearing connection strings as arguments. History
repair does not execute SQL. Do not record migration 2+, re-record an applied
prerequisite/Contact file, or mark the synthetic fixture applied.

- [ ] **PENDING:** Recheck safe ledger metadata: exactly one added version,
  `20261002193800`; earlier entries preserved and later versions still absent.
  Save the single-file execution/postcheck/ledger evidence and explicit continuing
  closure. Stop here; migration 2 requires a separate reviewed packet/authorization.

## Failure handling and review evidence

- [ ] **PENDING:** **Preflight or compatibility failure:** execute nothing. Record
  the unmet dependency/definition/hash/target/backup/locking condition and keep
  flags off. Do not add grants, create a missing prerequisite piecemeal, enable
  phone/SMS, configure hooks or apply a later migration as an unreviewed repair.
- [ ] **PENDING:** **Failure before a confirmed commit:** stop on the first SQL
  error or approved timeout, roll back the transaction where possible, and verify
  the original execution transaction has ended before interpreting fresh catalog
  and ledger state. Record only approved safe backend PID/state/transaction-start/
  backend-start diagnostics, never query text or other sessions' data. Do not
  blindly terminate a backend. Then inspect through an authorized read-only connection.
  Do not repair history or proceed to another file. DDL/NOTIFY in the failed
  transaction must not be treated as committed work.
- [ ] **PENDING:** **Unknown commit outcome:** a disconnect, timeout or missing
  response requires the approved operator to establish whether the original
  transaction is still running, committed or rolled back before any retry. Absence
  from a new connection does not prove rollback while original DDL is uncommitted.
  Preserve safe execution-backend evidence and wait/escalate under the approved
  incident plan; never blindly kill other backends. Reconcile catalog/definitions
  and ledger only after the original transaction's outcome is established.
  If complete objects match but the ledger is absent, prove the commit and
  use only the one-version recording procedure. If schema/ledger is partial,
  divergent or contradictory, stop for a reviewed corrective plan; this file's
  CREATE statements are not an idempotent retry mechanism.
- [ ] **PENDING:** **SQL committed but ledger recording failed:** leave gates off,
  retain committed objects/evidence, investigate the precise history failure and
  retry only authorized single-version recording after renewed proof. Do not
  rerun SQL, mark unrelated versions applied or fake a clean ledger.
- [ ] **PENDING:** **Postcheck/impact failure after commit:** keep closure, preserve
  audit/session/revocation and existing authority/Contact history, and escalate for
  a separately reviewed forward correction or restoration/reconciliation plan.
  A new `ROLLBACK` cannot undo already committed DDL.
  Do not drop Auth/authority/session triggers, weaken RLS/ACLs, rewrite revocation
  cutoffs, reset accounts or manually replace the old RPC to make checks pass.
- [ ] **PENDING:** Record sanitized evidence: revision/file hash, intended target,
  operator/approver via approved private records, UTC times, success/rollback/
  unknown outcome, SQLSTATE-only failure summary, safe catalog/count results,
  backup/compatibility approval and resulting ledger versions. No user rows,
  credentials, JWTs, invitation/code/QR secrets, raw provider payloads or full
  credential-bearing diagnostics belong in repository evidence.

### Existing tests and their limits

Review [session_foundations.test.sql](../../supabase/tests/database/session_foundations.test.sql),
[persisted_authorization.test.sql](../../supabase/tests/database/persisted_authorization.test.sql)
and [session-concurrency.test.ts](../../tests/integration/session-concurrency.test.ts)
for RLS/ACL/immutable lifecycle, idle/absolute/revocation, no public idle renewal,
suspension and transaction/locking assertions. They are synthetic disposable
tests, not hosted verification scripts.

Current merged-main CI applies the full local migration chain, so its final
email/TOTP, native-guard and recovery assertions do **not** prove migration-1-only
staging or its historical phone/SMS behavior. Migration-1-only execution/rehearsal
and all packet SQL remain **NOT RUN**. No new test run is claimed for this
documentation preparation; source/hash/link/packet review is separate evidence.

Final review must approve only this bounded schema change with continuing closure,
or identify the specific remaining blocker. No operator checkbox is completed by
this packet, and no subsequent migration or operational activation follows
automatically from its review or merge.
