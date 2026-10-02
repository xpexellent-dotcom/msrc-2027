-- BL-AUTH-05/06 isolated CI only. All synthetic identities, factors and audits roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select has_schema('msrc_sessions','Session metadata has its own private schema');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='msrc_sessions' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),
  4::bigint,'All session tables enable and force RLS');
select is((select count(*) from pg_policies where schemaname='msrc_sessions'),0::bigint,'Private tables have no client policies');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
  where has_schema_privilege(r.name,'msrc_sessions','USAGE')),'API roles have no private schema access');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
  cross join (values('policy'),('session_state'),('actor_revocations'),('security_audit')) t(name)
  where has_table_privilege(r.name,'msrc_sessions.'||t.name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
  'API roles cannot read or change session metadata');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join lateral aclexplode(p.proacl) a where n.nspname='msrc_sessions' and a.grantee=0),
  'Private functions have no PUBLIC grants');
select is((select to_jsonb(p)-'singleton' from msrc_sessions.policy p),
  '{"participant_absolute_seconds":259200,"privileged_idle_seconds":1800,"privileged_absolute_seconds":28800,"recent_auth_max_age_seconds":null,"warning_lead_seconds":null,"operational_access_ready":false,"privileged_access_ready":false}'::jsonb,
  'Only approved values are configured; dependent settings and readiness remain closed');
select is((select count(*) from msrc_sessions.session_state),0::bigint,'Migration installs no application sessions');
select is((select count(*) from msrc_sessions.actor_revocations),0::bigint,'Migration revokes no real actors');
select is((select count(*) from msrc_sessions.security_audit),0::bigint,'Migration installs no audit fixtures');
select throws_ok($$update msrc_sessions.policy set privileged_access_ready=true$$,'23514',null,'Readiness cannot be opened by configuration');
select throws_ok($$update msrc_sessions.policy set participant_absolute_seconds=259201$$,'23514',null,'Participant cap cannot exceed 72 hours');
select throws_ok($$update msrc_sessions.policy set privileged_idle_seconds=1801$$,'23514',null,'Staff idle cannot exceed 30 minutes');
select throws_ok($$update msrc_sessions.policy set privileged_absolute_seconds=28801$$,'23514',null,'Staff absolute cannot exceed 8 hours');

insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,is_anonymous) values
 ('71000000-0000-4000-8000-000000000001','session-participant@example.invalid',now(),now(),now(),false),
 ('71000000-0000-4000-8000-000000000002','session-staff@example.invalid',now(),now(),now(),false),
 ('71000000-0000-4000-8000-000000000003','session-other@example.invalid',now(),now(),now(),false);
insert into msrc_authorization.edition_config(edition_key) values('synthetic-session-2027');
insert into msrc_authorization.account_access(actor_id,state,individually_identified) values
 ('71000000-0000-4000-8000-000000000001','active',true),
 ('71000000-0000-4000-8000-000000000002','active',true),
 ('71000000-0000-4000-8000-000000000003','active',false);
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason) values
 ('71000000-0000-4000-8000-000000000001','synthetic-session-2027','participant','edition','Synthetic session test'),
 ('71000000-0000-4000-8000-000000000002','synthetic-session-2027','superAdmin','edition','Synthetic session test');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values
 ('73000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002','totp','verified',now()-interval '5 minutes',now()-interval '5 minutes');
insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id) values
 ('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000001',now()-interval '71 hours',now(),'aal1',null),
 ('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000002',now()-interval '1 minute',now(),'aal2','73000000-0000-4000-8000-000000000002'),
 ('72000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000001',now()-interval '72 hours',now(),'aal1',null),
 ('72000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000002',now()-interval '30 minutes',now(),'aal2','73000000-0000-4000-8000-000000000002'),
 ('72000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000002',now()-interval '8 hours',now(),'aal2','73000000-0000-4000-8000-000000000002'),
 ('72000000-0000-4000-8000-000000000006','71000000-0000-4000-8000-000000000003',now(),now(),'aal1',null),
 ('72000000-0000-4000-8000-000000000007','71000000-0000-4000-8000-000000000001',now(),now(),'aal1',null);

create function pg_temp.session_claims(actor text default '71000000-0000-4000-8000-000000000001',
  sid text default '72000000-0000-4000-8000-000000000001',aal text default 'aal1',
  totp_age interval default interval '30 seconds') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sid,
    'aal',aal,'exp',extract(epoch from now()+interval '1 hour'),
    'amr',case when aal='aal2' then jsonb_build_array(jsonb_build_object('method','totp',
      'timestamp',floor(extract(epoch from now()-totp_age)))) else '[]'::jsonb end)::text,true);
end; $$;

set local role anon;
select throws_ok($$select public.msrc_session_context('synthetic-session-2027')$$,'42501',null,'Anonymous context is denied');
select throws_ok($$select public.msrc_session_activity('synthetic-session-2027')$$,'42501',null,'Anonymous activity is denied');
select throws_ok($$select public.msrc_session_logout('synthetic-session-2027')$$,'42501',null,'Anonymous logout is denied');
reset role;
set local role service_role;
select throws_ok($$select public.msrc_session_context('synthetic-session-2027')$$,'42501',null,'Service role is not an own-session caller');
select throws_ok($$select count(*) from msrc_sessions.security_audit$$,'42501',null,'Service role cannot read safe audit metadata');
reset role;
do $$begin perform pg_temp.session_claims(); end$$;
set local role authenticated;
select throws_ok($$update msrc_sessions.policy set participant_absolute_seconds=999999$$,'42501',null,'Client policy override denied');
select throws_ok($$select msrc_sessions.revoke_actor_sessions(null,null,null,'factor_reset')$$,'42501',null,'Client factor-reset invocation denied');
select ok(public.msrc_session_context('synthetic-session-2027') @>
 '{"sessionPolicySatisfied":true,"privileged":false,"operationalAccessReady":false,"privilegedAccessReady":false}'::jsonb,
 '71-hour participant passes policy without operational activation');
select is(public.msrc_session_context('unknown-edition'),null::jsonb,'Unknown edition fails closed');
reset role;
select is((select last_activity_at=started_at from msrc_sessions.session_state where session_id='72000000-0000-4000-8000-000000000001'),true,'Read does not record activity');
update auth.sessions set updated_at=now(),refreshed_at=now() where id='72000000-0000-4000-8000-000000000001';
set local role authenticated;
select ok(public.msrc_session_context('synthetic-session-2027') @> '{"sessionPolicySatisfied":true}'::jsonb,'Provider refresh leaves valid policy intact');
select ok(public.msrc_session_activity('synthetic-session-2027') @> '{"sessionPolicySatisfied":true}'::jsonb,'Public activity foundation observes valid policy');
reset role;
select is((select last_activity_at=started_at from msrc_sessions.session_state where session_id='72000000-0000-4000-8000-000000000001'),true,'Public heartbeat cannot extend idle evidence while operational access is closed');
select ok(msrc_sessions.own_context('synthetic-session-2027',true) @> '{"sessionPolicySatisfied":true}'::jsonb,
 'Private future domain activity primitive rechecks valid policy before touch');
select is((select started_at from msrc_sessions.session_state where session_id='72000000-0000-4000-8000-000000000001'),
 (select created_at from auth.sessions where id='72000000-0000-4000-8000-000000000001'),'Activity never restarts absolute origin');
select ok((select last_activity_at>started_at from msrc_sessions.session_state where session_id='72000000-0000-4000-8000-000000000001'),'Only application activity advances idle evidence');

do $$begin perform pg_temp.session_claims(sid=>'72000000-0000-4000-8000-000000000003'); end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','absolute_expired','Participant equality at 72 hours expires');
select is(public.msrc_session_activity('synthetic-session-2027')->>'reason','session_revoked','Activity cannot restart an expired session');
reset role;
select ok((select revoked_at is not null from msrc_sessions.session_state where session_id='72000000-0000-4000-8000-000000000003'),'Policy expiry persists irreversible revocation');

do $$begin perform pg_temp.session_claims('71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000004','aal2'); end$$;
set local role authenticated;
select is(public.msrc_session_activity('synthetic-session-2027')->>'reason','idle_expired','Staff idle equality expires before activity touch');
reset role;
select is((select last_activity_at=started_at from msrc_sessions.session_state where session_id='72000000-0000-4000-8000-000000000004'),true,'Expired activity never advances idle evidence');
do $$begin perform pg_temp.session_claims('71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000005','aal2'); end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','absolute_expired','Staff absolute equality at 8 hours expires');
reset role;

do $$begin perform pg_temp.session_claims('71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','aal2'); end$$;
set local role authenticated;
select ok(public.msrc_session_context('synthetic-session-2027') @> '{"sessionPolicySatisfied":true,"mfaValid":true,"privileged":true}'::jsonb,
 'Individually identified staff with current verified session TOTP passes closed policy');
reset role;
update auth.sessions set updated_at=now(),refreshed_at=now() where id='72000000-0000-4000-8000-000000000002';
select is((select last_activity_at=started_at from msrc_sessions.session_state where session_id='72000000-0000-4000-8000-000000000002'),true,'Staff token refresh is not idle activity');
do $$begin perform pg_temp.session_claims('71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','aal1'); end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','mfa_required','Staff AAL1 lacks required MFA');
reset role;
do $$begin perform pg_temp.session_claims('71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','aal2',interval '10 minutes'); end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','mfa_required','TOTP proof predating factor/session is stale');
reset role;
do $$begin perform pg_temp.session_claims('71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','aal2'); end$$;
update auth.mfa_factors set status='unverified',updated_at=now() where id='73000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','mfa_required','Factor reset invalidates old AAL2');
reset role;
update auth.mfa_factors set status='verified',updated_at=now() where id='73000000-0000-4000-8000-000000000002';
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','mfa_required','Reverification does not restore old MFA timestamp');
reset role;
update auth.mfa_factors set updated_at=now()-interval '5 minutes' where id='73000000-0000-4000-8000-000000000002';
select throws_ok($$select msrc_sessions.revoke_actor_sessions('71000000-0000-4000-8000-000000000001',
 '71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','factor_reset')$$,
 '55000','Factor recovery procedure is not configured.','Factor-loss reset remains closed even to private maintenance');
select throws_ok($$select msrc_sessions.revoke_actor_sessions('71000000-0000-4000-8000-000000000001',
 '71000000-0000-4000-8000-000000000003','72000000-0000-4000-8000-000000000006','security')$$,
 '42501','Verified named maintenance actor is required.','Unidentified/nonstaff maintenance actor denied');
select throws_ok($$select msrc_sessions.revoke_actor_sessions('71000000-0000-4000-8000-000000000001',
 '71000000-0000-4000-8000-000000000002','72000000-0000-4000-8000-000000000002','security')$$,
 '55000','Consequential session maintenance is closed.','Unresolved recent-auth policy and readiness keep consequential maintenance closed');

do $$begin perform pg_temp.session_claims(sid=>'72000000-0000-4000-8000-000000000002'); end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027'),null::jsonb,'Foreign managed session is denied');
reset role;
do $$begin perform pg_temp.session_claims(sid=>'malformed'); end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027'),null::jsonb,'Malformed session fails closed');
reset role;

do $$begin perform pg_temp.session_claims(); end$$;
update msrc_authorization.account_access set state='suspended' where actor_id='71000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','session_revoked','Suspension revokes old session immediately');
reset role;
update msrc_authorization.account_access set state='active' where actor_id='71000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','session_revoked','Reactivation cannot restore pre-suspension session');
reset role;
do $$begin perform pg_temp.session_claims(sid=>'72000000-0000-4000-8000-000000000007'); end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','session_revoked','Suspension cutoff catches old unobserved session');
reset role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('72000000-0000-4000-8000-000000000008','71000000-0000-4000-8000-000000000001',statement_timestamp(),statement_timestamp(),'aal1');
do $$begin perform pg_temp.session_claims(sid=>'72000000-0000-4000-8000-000000000008'); end$$;
set local role authenticated;
select ok(public.msrc_session_context('synthetic-session-2027') @> '{"sessionPolicySatisfied":true}'::jsonb,'Fresh login after reactivation recovers policy');
select is(public.msrc_session_logout('synthetic-session-2027'),true,'Own logout persists application revocation');
select is(public.msrc_session_context('synthetic-session-2027')->>'reason','session_revoked','Unchanged bearer is denied after logout');
reset role;
delete from auth.sessions where id='72000000-0000-4000-8000-000000000008';
set local role authenticated;
select is(public.msrc_session_context('synthetic-session-2027'),null::jsonb,'Provider logout session deletion also denies unchanged bearer');
reset role;

select throws_ok($$update msrc_sessions.session_state set started_at=statement_timestamp()$$,
 '55000','Session origin and revocation are immutable.','Refresh cannot rewrite absolute origin');
select throws_ok($$update msrc_sessions.security_audit set cause='security'$$,
 '55000','Security audit is append-only.','Security audit mutation denied');
select throws_ok($$delete from msrc_sessions.security_audit$$,
 '55000','Security audit is append-only.','Security audit deletion denied');
select throws_ok($$truncate msrc_sessions.security_audit$$,'55000','Authority history cannot be truncated.','Audit truncate denied');
select ok((select count(*)>0 and bool_and(event in ('session.observed','session.revoked','actor.sessions.revoked'))
 from msrc_sessions.security_audit),'Safe lifecycle audit evidence exists');
select ok(not exists(select 1 from information_schema.columns where table_schema='msrc_sessions'
 and column_name in ('email','password','secret','factor_secret','code','token','payload','reason')),
 'Security tables have no secret/code/token/free-form fields');

-- An audit failure must roll back observation and cannot produce a satisfied session.
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('72000000-0000-4000-8000-000000000009','71000000-0000-4000-8000-000000000001',statement_timestamp(),statement_timestamp(),'aal1');
create function pg_temp.reject_security_audit() returns trigger language plpgsql as $$
begin raise exception using errcode='55000',message='Synthetic audit outage.'; end; $$;
create trigger synthetic_reject_security_audit before insert on msrc_sessions.security_audit
for each row execute function pg_temp.reject_security_audit();
do $$begin perform pg_temp.session_claims(sid=>'72000000-0000-4000-8000-000000000009'); end$$;
set local role authenticated;
select throws_ok($$select public.msrc_session_context('synthetic-session-2027')$$,'55000','Synthetic audit outage.','Audit outage fails closed');
reset role;
select is((select count(*) from msrc_sessions.session_state where session_id='72000000-0000-4000-8000-000000000009'),0::bigint,'Failed audit rolls back session observation');
drop trigger synthetic_reject_security_audit on msrc_sessions.security_audit;
set local role authenticated;
select ok(public.msrc_session_context('synthetic-session-2027') @> '{"sessionPolicySatisfied":true}'::jsonb,'Retry after audit recovery succeeds safely');
reset role;

select * from finish();
rollback;
