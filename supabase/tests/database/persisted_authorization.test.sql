-- BL-SEC-01 / ROL-01..12 / SEC-01/02/06 / AUTH-04.
-- Actual migrated schema, isolated synthetic Auth rows; every fixture/grant rolls back.
-- This tests observational identity metadata, never operational AUTH-05 readiness.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(66);

select has_schema('msrc_authorization', 'Authority metadata uses an unexposed private schema');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='msrc_authorization' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),
  4::bigint, 'All four private tables enable and force RLS');
select is((select count(*) from pg_policies where schemaname='msrc_authorization'),
  0::bigint, 'No broad private RLS policies exist');
select ok(not exists(select 1 from (values ('anon'), ('authenticated'), ('service_role')) r(name)
  where has_schema_privilege(r.name, 'msrc_authorization', 'USAGE')),
  'API roles have no private schema access');
select ok(not exists(select 1 from (values ('anon'), ('authenticated'), ('service_role')) r(name)
  cross join (values ('edition_config'), ('account_access'), ('role_grants'), ('grant_audit')) t(name)
  where has_table_privilege(r.name, 'msrc_authorization.'||t.name, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
  'API roles have no private table privileges, including service role');
select ok(has_function_privilege('authenticated', 'public.msrc_access_context(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.msrc_access_context(text)', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.msrc_access_context(text)', 'EXECUTE'),
  'Only authenticated API role can execute the own-context RPC');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
  where p.oid='public.msrc_access_context(text)'::regprocedure and a.grantee=0 and a.privilege_type='EXECUTE'),
  'RPC has no PUBLIC execution grant');
select ok((select p.prosecdef and p.proconfig @> array['search_path=""']::text[]
  from pg_proc p where p.oid='public.msrc_access_context(text)'::regprocedure),
  'Narrow definer RPC has a fixed empty search path');
select is((select count(*) from msrc_authorization.edition_config), 0::bigint, 'Migration seeds no edition scope');
select is((select count(*) from msrc_authorization.account_access), 0::bigint, 'Migration activates no accounts');
select is((select count(*) from msrc_authorization.role_grants), 0::bigint, 'Migration grants no authority');

-- Provider-managed structures are seeded only inside this isolated transaction.
insert into auth.users(id,email,email_confirmed_at,phone,phone_confirmed_at,created_at,updated_at,is_anonymous)
values
 ('30000000-0000-4000-8000-000000000001','synthetic-participant@example.invalid',now()-interval '1 day','+15550003001',now(),now(),now(),false),
 ('30000000-0000-4000-8000-000000000002','synthetic-staff@example.invalid',now()-interval '1 day','+15550003002',now(),now(),now(),false),
 ('30000000-0000-4000-8000-000000000003','synthetic-default@example.invalid',now()-interval '1 day','+15550003003',now(),now(),now(),false);
insert into auth.mfa_factors(id,user_id,factor_type,status,phone,created_at,updated_at)
values ('50000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',
 'phone','verified','+15550005002',now()-interval '5 minutes',now()-interval '5 minutes');
insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id)
values
 ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',now(),now(),'aal1',null),
 ('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',now()-interval '4 minutes',now(),'aal2','50000000-0000-4000-8000-000000000002'),
 ('40000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003',now(),now(),'aal1',null);
insert into msrc_authorization.edition_config(edition_key) values ('synthetic-2027'), ('synthetic-2026');
insert into msrc_authorization.account_access(actor_id,state,individually_identified) values
 ('30000000-0000-4000-8000-000000000001','active',true),
 ('30000000-0000-4000-8000-000000000002','active',true);
insert into msrc_authorization.account_access(actor_id) values ('30000000-0000-4000-8000-000000000003');
insert into msrc_authorization.role_grants(id,actor_id,edition_key,role_name,scope_kind,track,scope_target,grant_reason)
values
 ('60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','synthetic-2027','participant','edition',null,null,'Synthetic test grant'),
 ('60000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','synthetic-2027','participant','track','research','track-alpha','Synthetic test grant'),
 ('60000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','synthetic-2027','participant','assignment',null,'assignment-alpha','Synthetic test grant'),
 ('60000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','synthetic-2027','participant','function',null,'function-alpha','Synthetic test grant'),
 ('60000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','synthetic-2027','participant','resource',null,'resource-alpha','Synthetic test grant'),
 ('60000000-0000-4000-8000-000000000006','30000000-0000-4000-8000-000000000002','synthetic-2027','superAdmin','edition',null,null,'Synthetic test staff grant'),
 ('60000000-0000-4000-8000-000000000007','30000000-0000-4000-8000-000000000001','synthetic-2026','participant','edition',null,null,'Synthetic other edition');

create function pg_temp.claims(actor text default '30000000-0000-4000-8000-000000000001',
  sid text default '40000000-0000-4000-8000-000000000001', assurance text default 'aal1',
  methods jsonb default '[]'::jsonb) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('sub',actor,'role','authenticated',
    'session_id',sid,'aal',assurance,'amr',jsonb_build_array(jsonb_build_object('method','password',
      'timestamp',(select floor(extract(epoch from created_at)) from auth.sessions where id::text=sid))) || methods,'exp',extract(epoch from now()+interval '1 hour'))::text,true);
end; $$;

select ok((select state='suspended' and not individually_identified from msrc_authorization.account_access
  where actor_id='30000000-0000-4000-8000-000000000003'), 'Account defaults are suspended and not individually identified');
select is((select count(*) from msrc_authorization.grant_audit where event='grant.created'),
  7::bigint, 'Every maintenance grant appends its immutable audit entry');
select ok((select bool_and(performed_by_db_role='postgres' and reason like 'Synthetic%') from msrc_authorization.grant_audit),
  'Audit identifies DB maintenance and records supplied synthetic reasons');

set local role anon;
select throws_ok($$select public.msrc_access_context('synthetic-2027')$$,'42501',
 'permission denied for function msrc_access_context','Anonymous RPC execution is denied');
reset role;
set local role service_role;
select throws_ok($$select count(*) from msrc_authorization.role_grants$$,'42501',
 'permission denied for schema msrc_authorization','Service role cannot read private authority');
reset role;
do $$begin perform pg_temp.claims(); end$$;
set local role authenticated;
select throws_ok($$insert into msrc_authorization.account_access(actor_id,state) values
 ('30000000-0000-4000-8000-000000000003','active')$$,'42501',
 'permission denied for schema msrc_authorization','Clients cannot activate accounts');
select throws_ok($$update msrc_authorization.role_grants set state='revoked'$$,'42501',
 'permission denied for schema msrc_authorization','Clients cannot rewrite authority');
select is(public.msrc_access_context('synthetic-2027')->'principal',
 '{"userId":"30000000-0000-4000-8000-000000000001","sessionId":"40000000-0000-4000-8000-000000000001"}'::jsonb,
 'Own principal is tied to the current managed session');
select is(jsonb_array_length(public.msrc_access_context('synthetic-2027')->'grants'), 5,
 'Only own current grants for the requested edition are returned');
select is(public.msrc_access_context('synthetic-2027')#>'{grants,1,scope}',
 '{"kind":"track","track":"research","trackId":"track-alpha"}'::jsonb, 'Track scope uses the typed contract');
select is(public.msrc_access_context('synthetic-2027')#>'{grants,2,scope}',
 '{"kind":"assignment","assignmentId":"assignment-alpha"}'::jsonb, 'Assignment scope returns only an opaque reference');
select is(public.msrc_access_context('synthetic-2027')#>'{grants,3,scope}',
 '{"kind":"function","functionId":"function-alpha"}'::jsonb, 'Function scope uses the typed contract');
select is(public.msrc_access_context('synthetic-2027')#>'{grants,4,scope}',
 '{"kind":"resource","resourceId":"resource-alpha"}'::jsonb, 'Resource scope is opaque, without resource facts');
select ok(public.msrc_access_context('synthetic-2027') @>
 '{"schemaVersion":1,"operationalAccessReady":false,"privilegedAccessReady":false,"actor":{"session":{"active":false,"assurance":"aal1","factor":null}}}'::jsonb,
 'A valid identity never activates operational or privileged access');
select ok(public.msrc_access_context('synthetic-2027')::text !~ 'email"|raw_user_meta_data|raw_app_meta_data|factor_id|secret|synthetic-staff|30000000-0000-4000-8000-000000000002',
 'Context excludes personal fields, secrets and other actor identifiers');
select is(public.msrc_access_context('unknown-edition'), null::jsonb, 'Unknown edition scope fails closed');
reset role;

do $$begin perform pg_temp.claims(sid=>'not-a-session'); end$$;
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Malformed session UUID fails closed');
reset role;
do $$begin perform pg_temp.claims(sid=>'40000000-0000-4000-8000-000000000002'); end$$;
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Another user session cannot establish a principal');
reset role;
do $$begin perform pg_temp.claims(); perform set_config('request.jwt.claims',
 (current_setting('request.jwt.claims')::jsonb - 'session_id')::text,true); end$$;
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Missing session claim fails closed');
reset role;
do $$begin perform pg_temp.claims(); perform set_config('request.jwt.claims',
 jsonb_set(current_setting('request.jwt.claims')::jsonb,'{exp}',to_jsonb(extract(epoch from now()-interval '1 minute')))::text,true); end$$;
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Expired token is rejected even with an extant session');
reset role;
do $$begin perform pg_temp.claims(); perform set_config('request.jwt.claims',
 jsonb_set(current_setting('request.jwt.claims')::jsonb,'{exp}','"not-numeric"'::jsonb)::text,true); end$$;
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Malformed expiry fails closed without throwing');
reset role;
do $$begin perform pg_temp.claims(); end$$;
update auth.sessions set not_after=now()-interval '1 minute' where id='40000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Managed session expiry invalidates unchanged claims');
reset role;
update auth.sessions set not_after=null where id='40000000-0000-4000-8000-000000000001';
update auth.users set email_confirmed_at=null where id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Unverified email cannot establish a verified context');
reset role;
update auth.users set email_confirmed_at=now(),banned_until=now()+interval '1 hour' where id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Live user ban invalidates unchanged claims');
reset role;
update auth.users set banned_until=null,deleted_at=now() where id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Deleted user cannot return a context');
reset role;
update auth.users set deleted_at=null where id='30000000-0000-4000-8000-000000000001';
update msrc_authorization.account_access set state='suspended' where actor_id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,
 'Suspension revocation denies current grants without trusting stale claims');
reset role;
update msrc_authorization.account_access set state='active' where actor_id='30000000-0000-4000-8000-000000000001';
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('40000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001',statement_timestamp(),statement_timestamp(),'aal1');
do $$begin perform pg_temp.claims(sid=>'40000000-0000-4000-8000-000000000004'); end$$;
update auth.users set raw_user_meta_data='{"role":"superAdmin","state":"active","aal":"aal2"}',
 raw_app_meta_data='{"roles":["superAdmin"]}' where id='30000000-0000-4000-8000-000000000001';
set local role authenticated;
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_access_context('synthetic-2027')->'grants') g
 where g->>'role'<>'participant'), 'User and app metadata cannot create privileged grants');
reset role;

do $$begin perform pg_temp.claims('30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','aal2',
 jsonb_build_array(jsonb_build_object('method','mfa/phone','timestamp',floor(extract(epoch from now()-interval '3 minutes'))))); end$$;
set local role authenticated;
select ok(public.msrc_access_context('synthetic-2027') @>
 '{"actor":{"session":{"active":false,"assurance":"aal2","factor":"sms"}},"privilegedAccessReady":false}'::jsonb,
 'Current verified phone MFA is observed but cannot activate privileged work');
reset role;
update auth.mfa_factors set status='unverified' where id='50000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Stale AAL2 token fails after factor invalidation');
reset role;
update auth.mfa_factors set status='verified' where id='50000000-0000-4000-8000-000000000002';
update auth.sessions set aal='aal1' where id='40000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Session assurance downgrade invalidates stale AAL2 claims');
reset role;
update auth.sessions set aal='aal2' where id='40000000-0000-4000-8000-000000000002';
update auth.mfa_factors set updated_at=now() where id='50000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Factor update requires fresh phone MFA provenance');
reset role;
update auth.mfa_factors set updated_at=now()-interval '5 minutes' where id='50000000-0000-4000-8000-000000000002';
do $$begin perform pg_temp.claims('30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','aal2',
 '[{"method":"mfa/phone","timestamp":"not-numeric"}]'::jsonb); end$$;
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Nonnumeric AMR timestamp does not establish phone MFA');
reset role;
do $$begin perform pg_temp.claims('30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','aal2',
 jsonb_build_array(jsonb_build_object('method','otp','timestamp',floor(extract(epoch from now()))))); end$$;
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Email OTP is not staff phone MFA');
reset role;

select throws_ok($$update msrc_authorization.role_grants set role_name='superAdmin'
 where id='60000000-0000-4000-8000-000000000001'$$,'55000','Only irreversible grant revocation is permitted.',
 'An existing grant cannot be promoted or rewritten');
select throws_ok($$delete from msrc_authorization.role_grants where id='60000000-0000-4000-8000-000000000001'$$,
 '55000','Grant history is immutable.','Grant deletion is denied even to maintenance');
select throws_ok($$update msrc_authorization.role_grants set state='revoked',revocation_reason=' '
 where id='60000000-0000-4000-8000-000000000001'$$,'23514',null,'Revocation requires a nonempty reason');
update msrc_authorization.role_grants set state='revoked',revocation_reason='Synthetic revocation'
 where id='60000000-0000-4000-8000-000000000001';
select is((select count(*) from msrc_authorization.grant_audit where grant_id='60000000-0000-4000-8000-000000000001'),
 2::bigint,'Revocation appends audit without overwriting grant creation');
select ok((select event='grant.revoked' and reason='Synthetic revocation' from msrc_authorization.grant_audit
 where grant_id='60000000-0000-4000-8000-000000000001' and event='grant.revoked'), 'Revocation audit records its reason');
do $$begin perform pg_temp.claims(sid=>'40000000-0000-4000-8000-000000000004'); end$$;
set local role authenticated;
select is(jsonb_array_length(public.msrc_access_context('synthetic-2027')->'grants'),4,
 'Revocation disappears from own context immediately with unchanged claims');
reset role;
select throws_ok($$update msrc_authorization.role_grants set state='active',revoked_at=null,revocation_reason=null
 where id='60000000-0000-4000-8000-000000000001'$$,'55000','Only irreversible grant revocation is permitted.',
 'Revoked grants cannot be restored');
select throws_ok($$insert into msrc_authorization.grant_audit(grant_id,actor_id,edition_key,event,role_name,scope_kind,reason,performed_by_db_role)
 values('60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','synthetic-2027','grant.created','superAdmin','edition','Forged','postgres')$$,
 '55000','Grant audit is append-only.','Direct audit fabrication is denied');
select throws_ok($$update msrc_authorization.grant_audit set reason='Rewritten'$$,
 '55000','Grant audit is append-only.','Audit updates are denied');
select throws_ok($$delete from msrc_authorization.grant_audit$$,
 '55000','Grant audit is append-only.','Audit deletion is denied');
select throws_ok($$truncate msrc_authorization.role_grants cascade$$,
 '55000','Authority history cannot be truncated.','Grant TRUNCATE is denied even to maintenance');
select throws_ok($$truncate msrc_authorization.grant_audit$$,
 '55000','Authority history cannot be truncated.','Audit TRUNCATE is denied even to maintenance');
select throws_ok($$insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values('30000000-0000-4000-8000-000000000001','synthetic-2027','inventedRole','edition','Synthetic invalid role')$$,
 '23514',null,'Unknown roles cannot be persisted');
select throws_ok($$insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,track,scope_target,grant_reason)
 values('30000000-0000-4000-8000-000000000001','synthetic-2027','participant','track',null,'scope','Synthetic missing track')$$,
 '23514',null,'A NULL track cannot pass the scoped grant CHECK');
select throws_ok($$insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,scope_target,grant_reason)
 values('30000000-0000-4000-8000-000000000001','synthetic-2027','participant','resource','','Synthetic empty scope')$$,
 '23514',null,'Resource identifiers cannot be empty');
select throws_ok($$insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values('30000000-0000-4000-8000-000000000002','synthetic-2027','superAdmin','edition','Synthetic duplicate')$$,
 '23505',null,'Duplicate active scopes cannot multiply authority');

-- Temporarily give SQL privileges to isolate the independently enforced RLS boundary.
-- A failed audit insert must roll back the grant in the same statement/transaction.
alter table msrc_authorization.grant_audit add constraint synthetic_audit_failure
  check (reason <> 'Synthetic audit failure') not valid;
select throws_ok($$insert into msrc_authorization.role_grants(id,actor_id,edition_key,role_name,scope_kind,scope_target,grant_reason)
 values('60000000-0000-4000-8000-000000000009','30000000-0000-4000-8000-000000000002','synthetic-2027','superAdmin','function','audit-failure-duty','Synthetic audit failure')$$,
 '23514',null,'Audit failure rejects the consequential grant write');
select is((select count(*) from msrc_authorization.role_grants where id='60000000-0000-4000-8000-000000000009'),
 0::bigint,'The failed audit leaves no partially committed authority');
alter table msrc_authorization.grant_audit drop constraint synthetic_audit_failure;

grant usage on schema msrc_authorization to authenticated;
grant select,insert on msrc_authorization.account_access to authenticated;
set local role authenticated;
select is((select count(*) from msrc_authorization.account_access),0::bigint,
 'Forced RLS independently hides private accounts when SELECT is granted');
select throws_ok($$insert into msrc_authorization.account_access(actor_id) values ('30000000-0000-4000-8000-000000000003')$$,
 '42501','new row violates row-level security policy for table "account_access"','RLS independently denies account activation writes');
reset role;
revoke usage on schema msrc_authorization from authenticated;
revoke select,insert on msrc_authorization.account_access from authenticated;
delete from auth.sessions where id='40000000-0000-4000-8000-000000000004';
set local role authenticated;
select is(public.msrc_access_context('synthetic-2027'),null::jsonb,'Removed managed session rejects a previously valid token');
reset role;
select is((select count(*) from public.foundation_samples),2::bigint,'The existing foundation sample remains intact');
select * from finish();
rollback;
