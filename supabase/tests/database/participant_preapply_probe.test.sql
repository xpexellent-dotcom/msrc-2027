-- AUTH-01/08 / PRV-05/08 / SEC-01/06. Execute the actual owner probe locally.
-- This disposable CI database already has the full migration chain: the probe's
-- exact-nine ledger / retention-absent checks correctly print FAIL here. This
-- test proves executable read-only SQL and no changes, not hosted pre-apply PASS.
-- No personal rows or secret values are read/exported; snapshots hash metadata,
-- private policy configuration and aggregate subject/native-user counts only.
\set ON_ERROR_STOP on
\o /dev/null

SELECT md5(jsonb_build_object(
 'versions',(SELECT jsonb_agg(version::text ORDER BY version::text) FROM supabase_migrations.schema_migrations),
 'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner::text,nspacl::text) ORDER BY nspname)
   FROM pg_namespace WHERE starts_with(nspname,'msrc_')),
 'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text)
   ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE starts_with(n.nspname,'msrc_')),
 'columns',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull)
   ORDER BY n.nspname,c.relname,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace WHERE starts_with(n.nspname,'msrc_') AND a.attnum>0 AND NOT a.attisdropped),
 'functions',(SELECT md5(string_agg(pg_get_functiondef(p.oid),E'\n' ORDER BY n.nspname,p.proname,p.oid))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE starts_with(n.nspname,'msrc_') AND p.prokind='f'),
 'participant_gate',(SELECT to_jsonb(p) FROM msrc_participant.policy p WHERE singleton),
 'retention_gate',(SELECT to_jsonb(p) FROM msrc_participant.retention_policy p WHERE singleton),
 'owned_jobs',(SELECT jsonb_agg(jsonb_build_array(jobid,jobname,schedule,command,username,database,active) ORDER BY jobid)
   FROM cron.job WHERE username='postgres'),
 'subjects',(SELECT count(*) FROM msrc_participant.subject_refs),
 'native_users',(SELECT count(*) FROM auth.users)
)::text) AS probe_before
\gset

-- \ir resolves from this test file's directory. Suppress its twelve PASS/FAIL
-- rows because pg_prove expects only TAP on stdout. Its errors still stop psql.
\ir ../support/participant-age-retention-pre-apply.psql

SELECT md5(jsonb_build_object(
 'versions',(SELECT jsonb_agg(version::text ORDER BY version::text) FROM supabase_migrations.schema_migrations),
 'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner::text,nspacl::text) ORDER BY nspname)
   FROM pg_namespace WHERE starts_with(nspname,'msrc_')),
 'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text)
   ORDER BY n.nspname,c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE starts_with(n.nspname,'msrc_')),
 'columns',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull)
   ORDER BY n.nspname,c.relname,a.attnum) FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace WHERE starts_with(n.nspname,'msrc_') AND a.attnum>0 AND NOT a.attisdropped),
 'functions',(SELECT md5(string_agg(pg_get_functiondef(p.oid),E'\n' ORDER BY n.nspname,p.proname,p.oid))
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE starts_with(n.nspname,'msrc_') AND p.prokind='f'),
 'participant_gate',(SELECT to_jsonb(p) FROM msrc_participant.policy p WHERE singleton),
 'retention_gate',(SELECT to_jsonb(p) FROM msrc_participant.retention_policy p WHERE singleton),
 'owned_jobs',(SELECT jsonb_agg(jsonb_build_array(jobid,jobname,schedule,command,username,database,active) ORDER BY jobid)
   FROM cron.job WHERE username='postgres'),
 'subjects',(SELECT count(*) FROM msrc_participant.subject_refs),
 'native_users',(SELECT count(*) FROM auth.users)
)::text) AS probe_after
\gset
\o

begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select is(:'probe_after'::text,:'probe_before'::text,
 'Executing the actual read-only pre-apply probe preserves committed migration ledger, schema/function definitions, gates, owned cron jobs and aggregate identity counts');
select is(current_setting('transaction_read_only'),'off',
 'The probe rolled back its read-only transaction so the following test transaction is writable');
select * from finish();
rollback;
