-- AUTH-04/05, ROL-12, SEC-01/06. Disposable CI only; all fixtures roll back.
-- Real READ ONLY transactions model ordinary PostgREST table GET/HEAD, with
-- owner/role authorization AND the separate restrictive authentication policy.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join lateral aclexplode(p.proacl) a
  where (n.nspname,p.proname) in (('msrc_staff_email','observe_basis'),
    ('msrc_staff_email','observe_valid_receipt'),('msrc_sessions','observe_context'),
    ('msrc_sessions','observe_access_context')) and a.grantee=0),
  'Private read observers have no PUBLIC execution');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
  cross join (values('msrc_staff_email.observe_basis(uuid,uuid)'),
    ('msrc_staff_email.observe_valid_receipt(uuid,uuid)'),('msrc_sessions.observe_context(text)'),
    ('msrc_sessions.observe_access_context(text)')) f(name)
  where has_function_privilege(r.name,f.name,'EXECUTE')),
  'No API role can invoke private observers with arbitrary identities');
select ok(not exists(select 1 from (values('anon'),('service_role')) r(name)
  cross join (values('public.msrc_read_access_context(text)'),('public.msrc_second_step_satisfied()')) f(name)
  where has_function_privilege(r.name,f.name,'EXECUTE')),
  'Anonymous and service API roles cannot call own read predicates');
select ok(has_function_privilege('authenticated','public.msrc_read_access_context(text)','EXECUTE')
  and has_function_privilege('authenticated','public.msrc_second_step_satisfied()','EXECUTE'),
  'Only identified authenticated callers have the public own read contract');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname,p.proname) in (('msrc_staff_email','observe_basis'),
    ('msrc_staff_email','observe_valid_receipt'),('msrc_sessions','observe_context'),
    ('msrc_sessions','observe_access_context'),('public','msrc_read_access_context'),
    ('public','msrc_second_step_satisfied')) and p.provolatile='s' and p.prosecdef
    and p.proowner='postgres'::regrole and p.proconfig @> array['search_path=""']),
  6::bigint,'Authentication and grant observation use secured STABLE statement snapshots');
select is((select provolatile::text from pg_proc where oid='public.msrc_access_context(text)'::regprocedure),
  'v','Existing write context remains VOLATILE for POST initialization');

create temporary table read_cases(name text primary key, actor uuid not null, sid uuid not null,
  tier text not null, age interval not null, with_receipt boolean not null);
insert into read_cases
select item.name,('91000000-0000-4000-8000-'||lpad(item.n::text,12,'0'))::uuid,
  ('92000000-0000-4000-8000-'||lpad(item.n::text,12,'0'))::uuid,item.tier,item.age,item.receipt
from (values
  (1,'valid-staff','staff',interval '1 minute',true),
  (2,'password-only','staff',interval '1 minute',false),
  (3,'missing-state','staff',interval '1 minute',true),
  (4,'changed-email','staff',interval '1 minute',true),
  (5,'changed-password','staff',interval '1 minute',true),
  (6,'changed-grant','staff',interval '1 minute',true),
  (7,'suspended','staff',interval '1 minute',true),
  (8,'logout','staff',interval '1 minute',true),
  (9,'idle-expired','staff',interval '31 minutes',false),
  (10,'absolute-expired','staff',interval '8 hours 1 minute',false),
  (11,'participant','participant',interval '71 hours',false),
  (12,'participant-expired','participant',interval '72 hours',false),
  (13,'admin-totp','super_admin',interval '1 minute',false),
  (14,'admin-stale-factor','super_admin',interval '1 minute',false),
  (15,'admin-password','super_admin',interval '1 minute',false),
  (16,'native-expired','staff',interval '1 minute',true),
  (17,'email-unverified','staff',interval '1 minute',true),
  (18,'actor-cutoff','staff',interval '1 minute',true),
  (19,'native-password-missing','staff',interval '1 minute',true),
  (20,'changed-email-back','staff',interval '1 minute',true),
  (21,'admin-signed-only','super_admin',interval '1 minute',false),
  (22,'admin-phone','super_admin',interval '1 minute',false)
) item(n,name,tier,age,receipt);
insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,is_anonymous)
  select actor,'readonly-'||name||'@example.invalid',now()-interval '7 days',
    now()-interval '7 days',now()-interval '7 days',false from read_cases;
insert into msrc_authorization.edition_config(edition_key)
  values('synthetic-read-2027'),('synthetic-read-other');
insert into msrc_authorization.account_access(actor_id,state,individually_identified)
  select actor,'active',true from read_cases;
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
  select actor,'synthetic-read-2027',case tier when 'participant' then 'participant'
    when 'super_admin' then 'superAdmin' else 'contentMediaEditor' end,'edition',
    'Disposable readonly authentication test' from read_cases;
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
  select sid,actor,(case when name='admin-phone' then 'phone' else 'totp' end)::auth.factor_type,
    'verified',now()-interval '5 minutes',now()-interval '5 minutes'
  from read_cases where tier='super_admin' and name<>'admin-password';
insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id)
  select sid,actor,now()-age,now(),case when tier='super_admin' and name<>'admin-password'
    then 'aal2'::auth.aal_level else 'aal1'::auth.aal_level end,
    case when tier='super_admin' and name<>'admin-password' then sid else null end from read_cases;
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
  select gen_random_uuid(),sid,'password',now()-age,now()-age from read_cases;
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
  select gen_random_uuid(),sid,case when name='admin-phone' then 'mfa/phone' else 'totp' end,
    now()-interval '30 seconds',now()-interval '30 seconds'
  from read_cases where tier='super_admin' and name not in ('admin-password','admin-signed-only');

-- Trusted fixture helper writes only request claims, never provider or application state.
create function pg_temp.read_claims(case_name text) returns void language plpgsql as $$
declare fixture read_cases%rowtype; methods jsonb;
begin
  select * into strict fixture from read_cases where name=case_name;
  methods := jsonb_build_array(jsonb_build_object('method','password','timestamp',
    floor(extract(epoch from now()-fixture.age))));
  if fixture.tier='super_admin' and fixture.name<>'admin-password' then
    methods := methods || jsonb_build_array(jsonb_build_object('method',
      case when fixture.name='admin-phone' then 'mfa/phone' else 'totp' end,
      'timestamp',floor(extract(epoch from now()-interval '30 seconds'))));
  end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',fixture.actor,
    'role','authenticated','session_id',fixture.sid,'exp',floor(extract(epoch from now()+interval '1 hour')),
    'aal',case when fixture.tier='super_admin' and fixture.name<>'admin-password' then 'aal2' else 'aal1' end,
    'amr',methods)::text,true);
end; $$;

select pg_temp.read_claims('valid-staff');
set local role authenticated;
select is(public.msrc_read_access_context('synthetic-read-2027'),null::jsonb,
  'Pure observation cannot initialize absent native-origin history');
select is(public.msrc_second_step_satisfied(),false,'Missing state denies before write initialization');
select ok(public.msrc_access_context('synthetic-read-2027') @>
  '{"actor":{"session":{"active":false,"authenticationTier":"staff","staffEmailVerified":false}},"operationalAccessReady":false,"privilegedAccessReady":false}'::jsonb,
  'Existing POST context still initializes password-only closed metadata');
reset role;
select is((select started_at from msrc_sessions.session_state where session_id=(select sid from read_cases where name='valid-staff')),
  (select created_at from auth.sessions where id=(select sid from read_cases where name='valid-staff')),
  'Write initialization preserves exact immutable native login origin');
-- Aged origins are installed with matching native evidence before observation.
-- No state guard is bypassed or history backdated after it has been initialized.
insert into msrc_sessions.session_state(session_id,actor_id,started_at,last_activity_at)
  select s.id,s.user_id,s.created_at,s.created_at from auth.sessions s join read_cases c on c.sid=s.id
    where c.name not in ('valid-staff','missing-state');
update msrc_sessions.session_state set last_activity_at=now()-interval '1 minute'
  where session_id=(select sid from read_cases where name='absolute-expired');
-- A distinct new login for the same staff user has its own immutable state and
-- native password proof; it deliberately receives no copy of the old receipt.
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
  select '92000000-0000-4000-8000-000000000099',actor,now()-interval '1 minute',now(),'aal1'
  from read_cases where name='valid-staff';
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
  values(gen_random_uuid(),'92000000-0000-4000-8000-000000000099','password',now()-interval '1 minute',now()-interval '1 minute');
insert into msrc_sessions.session_state(session_id,actor_id,started_at,last_activity_at)
  select id,user_id,created_at,created_at from auth.sessions where id='92000000-0000-4000-8000-000000000099';
-- Exercise the actual trusted delivery/consume contract; hashes are synthetic,
-- not email codes. Each isolated account/IP reserves just one challenge.
do $$declare c read_cases%rowtype; issued jsonb; delivered jsonb; consumed jsonb; challenge uuid;
begin
  for c in select * from read_cases where with_receipt loop
    challenge := ('93000000-0000-4000-8000-'||right(c.sid::text,12))::uuid;
    issued := public.msrc_staff_email_begin(c.actor,c.sid,challenge,repeat('a',64),
      encode(sha256(convert_to(c.name,'UTF8')),'hex'));
    delivered := public.msrc_staff_email_delivery(c.actor,c.sid,challenge,true);
    consumed := public.msrc_staff_email_consume(c.actor,c.sid,challenge,repeat('a',64));
    if issued->>'state' is distinct from 'issued' or delivered->>'state' is distinct from 'ok'
      or consumed->>'state' is distinct from 'verified' then
      raise exception 'Synthetic readonly receipt fixture preparation failed.';
    end if;
  end loop;
end$$;
select pg_temp.read_claims('valid-staff');
select is(msrc_staff_email.observe_basis((select actor from read_cases where name='valid-staff'),
  (select sid from read_cases where name='valid-staff')),
  msrc_staff_email.basis((select actor from read_cases where name='valid-staff'),
  (select sid from read_cases where name='valid-staff')),
  'Pure staff binding equals existing locked binding for unchanged native evidence');
select is(msrc_sessions.observe_context('synthetic-read-2027'),
  msrc_sessions.own_context('synthetic-read-2027',false),
  'Pure staff observation matches complete existing policy and exact session evidence');
select is(public.msrc_read_access_context('synthetic-read-2027'),public.msrc_access_context('synthetic-read-2027'),
  'Pure own role projection equals initialized closed write context');

-- Native refresh changes neither current password identity nor immutable lifetime.
update auth.sessions set updated_at=now(),refreshed_at=now()
  where id in (select sid from read_cases where name in ('valid-staff','participant'));
update auth.users set email='changed-readonly@example.invalid'
  where id in (select actor from read_cases where name in ('changed-email','changed-email-back'));
update auth.users set email='readonly-changed-email-back@example.invalid'
  where id=(select actor from read_cases where name='changed-email-back');
update auth.users set encrypted_password='synthetic-changed-password-hash'
  where id=(select actor from read_cases where name='changed-password');
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
  select actor,'synthetic-read-other','checkInStaff','edition','Disposable binding change' from read_cases where name='changed-grant';
update msrc_authorization.account_access set state='suspended'
  where actor_id=(select actor from read_cases where name='suspended');
update msrc_sessions.session_state set revoked_at=clock_timestamp(),revocation_cause='logout'
  where session_id=(select sid from read_cases where name='logout');
update auth.sessions set not_after=now()-interval '1 second'
  where id=(select sid from read_cases where name='native-expired');
update auth.users set email_confirmed_at=null where id=(select actor from read_cases where name='email-unverified');
insert into msrc_sessions.actor_revocations(actor_id,revoked_before,cause,performed_by_db_role)
  select actor,clock_timestamp(),'factor_reset','postgres' from read_cases where name='actor-cutoff';
delete from auth.mfa_amr_claims where session_id=(select sid from read_cases where name='native-password-missing')
  and authentication_method='password';
update auth.mfa_factors set updated_at=now()-interval '20 seconds'
  where id=(select sid from read_cases where name='admin-stale-factor');

create table public.synthetic_read_auth(owner_id uuid not null,label text not null);
insert into public.synthetic_read_auth select actor,name from read_cases;
insert into public.synthetic_read_auth select actor,'foreign-owner' from read_cases where name='password-only';
alter table public.synthetic_read_auth enable row level security;
alter table public.synthetic_read_auth force row level security;
grant select on public.synthetic_read_auth to authenticated;
create policy owner_and_role on public.synthetic_read_auth for select to authenticated using
  (owner_id=(select auth.uid()) and exists(select 1 from
    jsonb_array_elements(public.msrc_read_access_context('synthetic-read-2027')->'grants') grant_row
    where grant_row->>'role' in ('contentMediaEditor','superAdmin')));
create policy exact_authentication on public.synthetic_read_auth as restrictive for select to authenticated
  using((select public.msrc_second_step_satisfied()));
create temporary table read_before as select
  (select jsonb_agg(to_jsonb(s) order by session_id) from msrc_sessions.session_state s) states,
  (select count(*) from msrc_sessions.security_audit) session_audits,
  (select count(*) from msrc_staff_email.audit) email_audits,
  (select jsonb_agg(to_jsonb(r) order by actor_id) from msrc_sessions.actor_revocations r) revocations,
  (select jsonb_agg(to_jsonb(r) order by session_id) from msrc_staff_email.receipts r) receipts;

-- All remaining authentication, metadata and RLS calls execute in a real read-only
-- transaction. pgTAP uses only temporary test bookkeeping, permitted by PostgreSQL.
set transaction read only;
select is(current_setting('transaction_read_only'),'on','Normal table GET transaction mode is actually enforced');
select pg_temp.read_claims('valid-staff');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),true,'Valid exact-session email receipt works in read-only evaluation');
select ok(public.msrc_read_access_context('synthetic-read-2027') @>
  '{"actor":{"session":{"active":false,"assurance":"aal1","staffEmailVerified":true}},"operationalAccessReady":false,"privilegedAccessReady":false}'::jsonb,
  'Read-only metadata keeps staff email proof separate from AAL2 and readiness closed');
select is((select count(*) from public.synthetic_read_auth),1::bigint,
  'Ordinary SELECT combines positive authentication with current role and ownership');
select is((select count(*) from public.synthetic_read_auth where label='foreign-owner'),0::bigint,
  'Verified staff authentication cannot bypass row ownership');
select is(jsonb_array_length(public.msrc_read_access_context('synthetic-read-other')->'grants'),0,
  'Read projection remains edition scoped without downgrading strongest authentication tier');
select is(public.msrc_read_access_context('unknown-edition'),null::jsonb,'Unknown edition fails closed during direct reads');
reset role;
select is(extract(epoch from ((msrc_sessions.observe_context('synthetic-read-other')#>>'{timing,absoluteExpiresAt}')::timestamptz
  -(msrc_sessions.observe_context('synthetic-read-other')#>>'{timing,startedAt}')::timestamptz)),
  28800::numeric,'Other edition retains the 8-hour strongest staff absolute cap');
select is(extract(epoch from ((msrc_sessions.observe_context('synthetic-read-other')#>>'{timing,idleExpiresAt}')::timestamptz
  -(msrc_sessions.observe_context('synthetic-read-other')#>>'{timing,lastActivityAt}')::timestamptz)),
  1800::numeric,'Other edition retains the 30-minute staff idle cap');

select pg_temp.read_claims('password-only');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Password-only staff remain denied');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'password-only: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','staff_email_check_required','password-only: complete original failure reason is preserved');

select pg_temp.read_claims('missing-state');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Even a verified receipt cannot initialize missing native-origin state');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'missing-state: direct owner/role database read remains denied');
reset role;

select pg_temp.read_claims('changed-email');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Current verified email change invalidates the prior receipt');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'changed-email: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','staff_email_check_required','changed-email: complete original failure reason is preserved');

select pg_temp.read_claims('changed-password');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Password change invalidates earlier native primary proof');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'changed-password: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','password_auth_required','changed-password: complete original failure reason is preserved');

select pg_temp.read_claims('changed-grant');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'A changed grant fingerprint invalidates earlier staff receipt');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'changed-grant: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','staff_email_check_required','changed-grant: complete original failure reason is preserved');

select pg_temp.read_claims('suspended');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Account suspension denies old authentication and owner rows');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'suspended: direct owner/role database read remains denied');
reset role;

select pg_temp.read_claims('logout');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Logout revocation denies the old exact-session receipt');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'logout: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','session_revoked','logout: complete original failure reason is preserved');

select pg_temp.read_claims('idle-expired');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Staff idle deadline denies before any observation could touch activity');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'idle-expired: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','idle_expired','idle-expired: complete original failure reason is preserved');

select pg_temp.read_claims('absolute-expired');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Staff 8-hour absolute deadline denies despite recent activity');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'absolute-expired: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','absolute_expired','absolute-expired: complete original failure reason is preserved');

select pg_temp.read_claims('participant-expired');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Participant equality at 72 hours expires');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'participant-expired: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','absolute_expired','participant-expired: complete original failure reason is preserved');

select pg_temp.read_claims('admin-stale-factor');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Factor mutation invalidates earlier native TOTP evidence');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'admin-stale-factor: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','mfa_required','admin-stale-factor: complete original failure reason is preserved');

select pg_temp.read_claims('admin-password');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Super Admin password-only login still requires authenticator MFA');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'admin-password: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','mfa_required','admin-password: complete original failure reason is preserved');

select pg_temp.read_claims('native-expired');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Expired native provider session denies independently of application receipt');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'native-expired: direct owner/role database read remains denied');
reset role;

select pg_temp.read_claims('email-unverified');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Current unverified account email denies access');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'email-unverified: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','account_verification_required','email-unverified: complete original failure reason is preserved');

select pg_temp.read_claims('actor-cutoff');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Factor-reset actor cutoff revokes old session authentication');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'actor-cutoff: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','session_revoked','actor-cutoff: complete original failure reason is preserved');

select pg_temp.read_claims('native-password-missing');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Signed staff password claim cannot replace missing native proof');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'native-password-missing: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','password_auth_required','native-password-missing: complete original failure reason is preserved');

select pg_temp.read_claims('changed-email-back');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Changing email away and back cannot revive the old receipt');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'changed-email-back: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','staff_email_check_required','changed-email-back: complete original failure reason is preserved');

select pg_temp.read_claims('admin-signed-only');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Signed TOTP claim cannot replace native exact-session TOTP proof');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'admin-signed-only: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','mfa_required','admin-signed-only: complete original failure reason is preserved');

select pg_temp.read_claims('admin-phone');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Phone assurance cannot replace authenticator-app Super Admin MFA');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'admin-phone: direct owner/role database read remains denied');
reset role;
select is(msrc_sessions.observe_context('synthetic-read-2027')->>'reason','mfa_required','admin-phone: complete original failure reason is preserved');

select pg_temp.read_claims('participant');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),true,'Participant verified email/password still needs no MFA or phone');
select ok(public.msrc_read_access_context('synthetic-read-2027') @>
  '{"actor":{"session":{"authenticationTier":"participant","assurance":"aal1","staffEmailVerified":false,"active":false}},"operationalAccessReady":false,"privilegedAccessReady":false}'::jsonb,
  'Participant contract remains unchanged after native refresh');
select is((select count(*) from public.synthetic_read_auth),0::bigint,
  'Participant authentication alone does not grant a protected staff role');
reset role;
select is(extract(epoch from ((msrc_sessions.observe_context('synthetic-read-2027')#>>'{timing,absoluteExpiresAt}')::timestamptz
  -(msrc_sessions.observe_context('synthetic-read-2027')#>>'{timing,startedAt}')::timestamptz)),
  259200::numeric,'Native refresh cannot extend the participant 72-hour absolute lifetime');

select pg_temp.read_claims('admin-totp');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),true,'Current password plus exact native TOTP still satisfies Super Admin MFA');
select ok(public.msrc_read_access_context('synthetic-read-2027') @>
  '{"actor":{"session":{"authenticationTier":"super_admin","assurance":"aal2","factor":"totp","staffEmailVerified":false,"active":false}},"operationalAccessReady":false,"privilegedAccessReady":false}'::jsonb,
  'Super Admin authenticator assurance and operational gates remain unchanged');
select is((select count(*) from public.synthetic_read_auth),1::bigint,
  'Native TOTP permits only the explicit synthetic Super Admin owner/role row');
reset role;

select pg_temp.read_claims('valid-staff');
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,
  '{session_id}','"92000000-0000-4000-8000-000000000099"'::jsonb)::text,true);
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Another initialized login of the same user needs a fresh email check');
select is((select count(*) from public.synthetic_read_auth),0::bigint,'A receipt cannot be borrowed by another current session');
reset role;
select pg_temp.read_claims('valid-staff');
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,
  '{session_id}','"92000000-0000-4000-8000-000000000002"'::jsonb)::text,true);
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'A foreign managed session cannot be bound to the signed user');
select is(public.msrc_read_access_context('synthetic-read-2027'),null::jsonb,'Foreign user/session metadata fails closed');
reset role;
select pg_temp.read_claims('valid-staff');
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,
  '{amr}','[{"method":"otp","timestamp":0}]'::jsonb)::text,true);
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Primary email OTP sign-in never proves the required password step');
select is(public.msrc_read_access_context('synthetic-read-2027'),null::jsonb,'Non-password login cannot obtain even staff setup metadata');
reset role;
select pg_temp.read_claims('valid-staff');
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,
  '{exp}',to_jsonb(extract(epoch from now()-interval '1 second')))::text,true);
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'An expired signed access token cannot use a valid receipt');
reset role;
select pg_temp.read_claims('valid-staff');
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,
  '{session_id}','"invalid-session"'::jsonb)::text,true);
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Malformed signed session evidence returns generic denial');
select is(public.msrc_read_access_context('synthetic-read-2027'),null::jsonb,'Malformed session metadata returns null without mutation');
reset role;
select pg_temp.read_claims('valid-staff');
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,
  '{amr}','{}'::jsonb)::text,true);
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Malformed AMR cannot bypass native password requirements');
reset role;
select pg_temp.read_claims('valid-staff');
select set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,
  '{aal}','"unknown"'::jsonb)::text,true);
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Unrecognized managed assurance fails closed');
reset role;

select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Missing caller identity denies direct authentication');
select is(public.msrc_read_access_context('synthetic-read-2027'),null::jsonb,'Missing caller identity exposes no metadata');
select throws_ok($$select msrc_sessions.observe_context('synthetic-read-2027')$$,'42501',null,
  'Client cannot inspect private session policy internals');
select throws_ok($$select msrc_staff_email.observe_basis(null,null)$$,'42501',null,
  'Client cannot obtain private recipient or receipt binding evidence');
select throws_ok($$select count(*) from msrc_staff_email.receipts$$,'42501',null,
  'Read-only preview adds no direct receipt table grants');
reset role;
set local role anon;
select throws_ok($$select public.msrc_read_access_context('synthetic-read-2027')$$,'42501',null,
  'Anonymous read context is denied');
reset role;
set local role service_role;
select throws_ok($$select public.msrc_read_access_context('synthetic-read-2027')$$,'42501',null,
  'Service role cannot impersonate an own read caller');
reset role;

select is((select jsonb_agg(to_jsonb(s) order by session_id) from msrc_sessions.session_state s),
  (select states from read_before),'All positive and denied direct reads leave origins, activity and revocation unchanged');
select is((select count(*) from msrc_sessions.security_audit),(select session_audits from read_before),
  'Direct GET observation creates no session audit writes');
select is((select count(*) from msrc_staff_email.audit),(select email_audits from read_before),
  'Direct GET observation creates no email audit writes');
select is((select jsonb_agg(to_jsonb(r) order by actor_id) from msrc_sessions.actor_revocations r),
  (select revocations from read_before),'Read checks never alter irreversible actor cutoffs');
select is((select jsonb_agg(to_jsonb(r) order by session_id) from msrc_staff_email.receipts r),
  (select receipts from read_before),'Read checks never create, replace or rewrite email approval');
select is((select count(*) from msrc_sessions.session_state where session_id=(select sid from read_cases where name='missing-state')),
  0::bigint,'Repeated direct reads never create missing immutable login state');
select ok((select revoked_at is null from msrc_sessions.session_state where session_id=(select sid from read_cases where name='idle-expired')),
  'Read-only expiry denies immediately without a hidden persistence attempt');
select pg_temp.read_claims('valid-staff');
select ok(not (public.msrc_read_access_context('synthetic-read-2027')::text ~ 'recipient|binding|code_hash|passwordAt'),
  'Public read metadata exposes no email recipient, code hash or private proof binding');
select * from finish();
rollback;
