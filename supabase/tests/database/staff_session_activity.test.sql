-- AUTH-04/05, ROL-12, SEC-01/02: synthetic deliberate activity and observer bounds.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select ok(not has_function_privilege('anon','public.msrc_session_activity(text)','EXECUTE'),'Anonymous activity is denied');
select ok(not has_function_privilege('service_role','public.msrc_session_activity(text)','EXECUTE'),'Secret-key callers cannot invent a staff activity identity');
select is((select proconfig from pg_proc where oid='public.msrc_session_activity(text)'::regprocedure),array['search_path=""'],'Activity wrapper has an empty search path');
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-staff-activity');
insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous)
 values('c4100000-0000-4000-8000-000000000001','activity@example.invalid',now(),'synthetic-hash',now(),now(),false);
insert into msrc_authorization.account_access(actor_id,state,individually_identified)
 values('c4100000-0000-4000-8000-000000000001','active',true);
insert into msrc_staff.profiles(actor_id,name) values('c4100000-0000-4000-8000-000000000001','Synthetic activity staff');
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values('c4100000-0000-4000-8000-000000000001','synthetic-staff-activity','superAdmin','edition','Synthetic activity test');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values('c4300000-0000-4000-8000-000000000001','c4100000-0000-4000-8000-000000000001','totp','verified',now()-interval '10 hours',now()-interval '10 hours');
insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id) values
 ('c4200000-0000-4000-8000-000000000001','c4100000-0000-4000-8000-000000000001',date_trunc('second',now()-interval '2 hours'),now(),'aal2','c4300000-0000-4000-8000-000000000001'),
 ('c4200000-0000-4000-8000-000000000002','c4100000-0000-4000-8000-000000000001',date_trunc('second',now()-interval '2 hours'),now(),'aal2','c4300000-0000-4000-8000-000000000001'),
 ('c4200000-0000-4000-8000-000000000003','c4100000-0000-4000-8000-000000000001',date_trunc('second',now()-interval '8 hours 1 minute'),now(),'aal2','c4300000-0000-4000-8000-000000000001');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),id,'password',created_at,created_at from auth.sessions where id::text like 'c4200000%';
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),id,'totp',created_at+interval '1 second',created_at+interval '1 second' from auth.sessions where id::text like 'c4200000%';
insert into msrc_sessions.session_state(session_id,actor_id,started_at,last_activity_at)
 select id,user_id,created_at,created_at from auth.sessions where id::text like 'c4200000%';
-- These accelerated history fixtures represent earlier deliberate activity,
-- never a native session origin rewrite or relaxed production timeout.
update msrc_sessions.session_state set last_activity_at=now()-interval '20 minutes'
 where session_id in('c4200000-0000-4000-8000-000000000001','c4200000-0000-4000-8000-000000000003');
create function pg_temp.activity_claims(suffix text,assurance text default 'aal2') returns void language plpgsql as $$
 declare sid text:='c4200000-0000-4000-8000-00000000000'||suffix;
 begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub','c4100000-0000-4000-8000-000000000001','role','authenticated','session_id',sid,
  'aal',assurance,'exp',extract(epoch from now()+interval '1 hour'),
  'amr',(select jsonb_agg(jsonb_build_object('method',authentication_method,'timestamp',floor(extract(epoch from updated_at::timestamptz)))) from auth.mfa_amr_claims where session_id::text=sid))::text,true);
 end$$;
do $$begin perform pg_temp.activity_claims('1');end$$;
set local role authenticated;
select is(public.msrc_staff_profile('synthetic-staff-activity')->>'actorId','c4100000-0000-4000-8000-000000000001','A two-hour native session with recent deliberate activity remains authorized');
select ok((public.msrc_session_activity('synthetic-staff-activity')->>'sessionPolicySatisfied')::boolean,'Exact-session strongest proof renews idle time');
reset role;
select ok((select last_activity_at>now()-interval '1 minute' from msrc_sessions.session_state where session_id='c4200000-0000-4000-8000-000000000001'),'Activity advances last activity to current database time');
select is((select started_at from msrc_sessions.session_state where session_id='c4200000-0000-4000-8000-000000000001'),date_trunc('second',now()-interval '2 hours'),'Activity preserves immutable native session origin');
create temp table activity_observed as select last_activity_at from msrc_sessions.session_state where session_id='c4200000-0000-4000-8000-000000000001';
set local role authenticated;
select is((public.msrc_staff_profile('synthetic-staff-activity')#>>'{session,timing,absoluteExpiresAt}')::timestamptz,date_trunc('second',now()-interval '2 hours')+interval '8 hours','Profile after activity retains the original eight-hour absolute deadline');
do $$begin perform public.msrc_staff_profile('synthetic-staff-activity');perform public.msrc_session_context('synthetic-staff-activity');end$$;
reset role;
select is((select last_activity_at from msrc_sessions.session_state where session_id='c4200000-0000-4000-8000-000000000001'),(select last_activity_at from activity_observed),'Background profile/context reads do not renew idle time');
do $$begin perform pg_temp.activity_claims('1','aal1');end$$;
set local role authenticated;
select is(public.msrc_session_activity('synthetic-staff-activity'),null::jsonb,'Password-only Super Admin activity cannot substitute for authenticator proof');
reset role;
do $$begin perform pg_temp.activity_claims('2');end$$;
set local role authenticated;
select is(public.msrc_session_activity('synthetic-staff-activity'),null::jsonb,'Activity cannot resurrect an already idle-expired session');
reset role;
do $$begin perform pg_temp.activity_claims('3');end$$;
set local role authenticated;
select is(public.msrc_session_activity('synthetic-staff-activity'),null::jsonb,'Activity cannot bypass absolute expiry even with recent prior activity');
reset role;
do $$begin perform pg_temp.activity_claims('1');end$$;
update msrc_staff.policy set enabled=false;
set local role authenticated;
select is(public.msrc_session_activity('synthetic-staff-activity'),null::jsonb,'Closed database readiness denies deliberate activity');
reset role;
select * from finish();
rollback;
