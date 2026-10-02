-- Read-only deployment inspection. No fixtures, resets, credentials or personal rows.
-- Run through the authorized hosted SQL connection after the reviewed migration.
select n.nspname as schema_name, c.relname as table_name,
  c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced,
  has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as anon_access,
  has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as authenticated_access,
  has_table_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as service_role_access
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'msrc_authorization' and c.relkind = 'r'
order by c.relname;

select n.nspname as schema_name, p.proname as function_name,
  p.prosecdef as security_definer, p.proconfig as fixed_configuration,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'msrc_authorization'
  or (n.nspname = 'public' and p.proname = 'msrc_access_context')
order by n.nspname, p.proname;

select has_schema_privilege('anon', 'msrc_authorization', 'USAGE') as anon_schema_access,
  has_schema_privilege('authenticated', 'msrc_authorization', 'USAGE') as authenticated_schema_access,
  has_schema_privilege('service_role', 'msrc_authorization', 'USAGE') as service_role_schema_access;

-- Aggregate counts only. Empty deployment must contain no activation/test records.
select (select count(*) from auth.users) as managed_accounts,
  (select count(*) from msrc_authorization.edition_config) as editions,
  (select count(*) from msrc_authorization.account_access) as access_accounts,
  (select count(*) from msrc_authorization.role_grants) as grants,
  (select count(*) from msrc_authorization.grant_audit) as grant_audits,
  (select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE') as public_application_tables;
