-- ENG-060 / O9. Disposable synthetic accounts only; every change rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok(has_function_privilege('authenticated','public.msrc_staff_launch_readiness(text)','EXECUTE'),
 'Authenticated callers can reach the independently guarded readiness RPC');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.oid='public.msrc_staff_launch_readiness(text)'::regprocedure
 and a.grantee in(0,'anon'::regrole,'service_role'::regrole)),
 'PUBLIC, anonymous and service roles have no readiness execution grant');
select ok((select p.prosecdef and p.proowner='postgres'::regrole
 and p.proconfig @> array['search_path=""'] and p.provolatile='v'
 from pg_proc p where p.oid='public.msrc_staff_launch_readiness(text)'::regprocedure),
 'The guarded postgres definer has an empty search path and permits authority locking');
select is((select p.proargnames from pg_proc p where p.oid='public.msrc_staff_launch_readiness(text)'::regprocedure),
 array['edition_key'],'PostgREST receives the documented edition_key argument');
select ok(strpos(pg_get_functiondef('public.msrc_staff_launch_readiness(text)'::regprocedure),
 'current_setting(''transaction_isolation'')')<strpos(pg_get_functiondef('public.msrc_staff_launch_readiness(text)'::regprocedure),
 'msrc_staff.authorize('),'READ COMMITTED guard precedes authorization and denied returns');
select ok(not exists(select 1 from msrc_participant.policy where enabled)
 and not exists(select 1 from msrc_participant.retention_policy where enabled)
 and not exists(select 1 from msrc_outbox.settings where delivery_enabled or sweeps_enabled or daily_cap<>0)
 and not exists(select 1 from msrc_registration.settings where enabled),
 'The migration leaves every release switch closed');

set local role anon;
select throws_ok($$select public.msrc_staff_launch_readiness('synthetic-readiness')$$,'42501',null,
 'Anonymous calls fail before reading launch data');
reset role;
set local role service_role;
select throws_ok($$select public.msrc_staff_launch_readiness('synthetic-readiness')$$,'42501',null,
 'Service role cannot impersonate a native Super Admin');
reset role;
set local role authenticated;
select is(public.msrc_staff_launch_readiness('synthetic-readiness'),' {"state":"denied"}'::jsonb,
 'An authenticated role without a native session learns no launch data');
reset role;

update msrc_staff.policy set enabled=true,email_daily_limit=1000;
update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
select pg_temp.registration_settings('synthetic-readiness');
select pg_temp.registration_settings('synthetic-readiness-other');
insert into msrc_authorization.edition_config(edition_key) values('synthetic-readiness-empty');
select pg_temp.registration_staff_fixture(2400,'synthetic-readiness');
select pg_temp.registration_staff_fixture(2401,'synthetic-readiness');
select pg_temp.registration_staff_fixture(2402,'synthetic-readiness','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(2403,'synthetic-readiness','checkInStaff');
select pg_temp.registration_staff_fixture(2404,'synthetic-readiness','finance');
select pg_temp.registration_fixture(2405,'synthetic-readiness');
select pg_temp.registration_staff_fixture(2406,'synthetic-readiness-other');
select pg_temp.registration_staff_fixture(2407,'synthetic-readiness','registrationWorkshopAdministrator');
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values(pg_temp.registration_actor(2400),'synthetic-readiness-empty','superAdmin','edition','Synthetic readiness scope');
create function pg_temp.readiness_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);end$$;
create function pg_temp.readiness() returns jsonb language sql as $$
 select public.msrc_staff_launch_readiness('synthetic-readiness');$$;

-- Fixtures are committed to the preceding statement before native session checks.
select pg_temp.readiness_claim(2402);
select ok(msrc_staff.authorize('synthetic-readiness',null,false) is not null,'Approver has a valid assured staff session');
select is(pg_temp.readiness(),'{"state":"denied"}'::jsonb,'Registration approvers cannot read launch readiness');
select pg_temp.readiness_claim(2403);
select is(pg_temp.readiness(),'{"state":"denied"}'::jsonb,'Check-in staff cannot read launch readiness');
select pg_temp.readiness_claim(2404);
select is(pg_temp.readiness(),'{"state":"denied"}'::jsonb,'Finance cannot read launch readiness');
select pg_temp.readiness_claim(2405);
select is(pg_temp.readiness(),'{"state":"denied"}'::jsonb,'Participants cannot read launch readiness');
select pg_temp.readiness_claim(2406);
select is(pg_temp.readiness(),'{"state":"denied"}'::jsonb,'Another edition Super Admin cannot read launch readiness');
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(2400)||'{"aal":"aal1"}'::jsonb)::text,true);end$$;
select is(pg_temp.readiness(),'{"state":"denied"}'::jsonb,'A Super Admin without TOTP assurance is denied');
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(2400)||jsonb_build_object('session_id',pg_temp.registration_session(2401)))::text,true);end$$;
select is(pg_temp.readiness(),'{"state":"denied"}'::jsonb,'Another native session cannot supply Super Admin TOTP');
select pg_temp.readiness_claim(2400);
set local role authenticated;
select is(pg_temp.readiness()->>'state','ready','Exact-session Super Admin can read through the authenticated RPC');
select throws_ok($$select * from msrc_outbox.settings$$,'42501',null,'Readiness grants no direct private settings access');
select throws_ok($$select * from auth.mfa_factors$$,'42501',null,'Readiness grants no factor rows or secrets');
reset role;
select is(public.msrc_staff_launch_readiness('synthetic-readiness-empty')->>'registrationSettingsComplete','false',
 'An edition without a registration settings row is incomplete');
select is(public.msrc_staff_launch_readiness('synthetic-readiness-empty')->>'registrationEnabled','false',
 'An edition without settings is closed');
select is(public.msrc_staff_launch_readiness('synthetic-readiness-empty')->>'earlyAccessCount','0',
 'An edition without settings has an explicit zero early list count');

update msrc_participant.policy set enabled=false,privacy_version=null,email_daily_limit=null;
update msrc_participant.retention_policy set enabled=false;
update msrc_registration.settings set enabled=false where edition_key='synthetic-readiness';
select is(pg_temp.readiness()->>'participantAccountsEnabled','false','Participant policy is independently closed');
select is(pg_temp.readiness()->>'participantPolicyComplete','false','Absent approved privacy version and budget are incomplete');
select is(pg_temp.readiness()->>'participantEmailDailyLimit','0','Absent participant budget is reported as zero');
select is(pg_temp.readiness()->>'retentionEnabled','false','Retention remains an independent release check');
select is(pg_temp.readiness()->>'outboxDeliveryEnabled','false','Delivery is closed by default');
select is(pg_temp.readiness()->>'outboxSweepsEnabled','false','Sweeps are closed by default');
select is(pg_temp.readiness()->>'outboxDailyCap','0','Outbox has no spend budget by default');
select is(pg_temp.readiness()->>'registrationSettingsComplete','true','Settings completeness does not claim registration is open');
select is(pg_temp.readiness()->>'registrationEnabled','false','Registration switch reports closed');
select is(pg_temp.readiness()->>'conferenceDaysSet','false','No conference days are invented');
select is(pg_temp.readiness()->>'conferenceDayCount','0','Unconfigured conference days have zero count');
update msrc_participant.policy set enabled=true,privacy_version='v1.0',email_daily_limit=123;
update msrc_participant.retention_policy set enabled=true;
update msrc_outbox.settings set delivery_enabled=true,sweeps_enabled=true,daily_cap=456;
update msrc_registration.settings set enabled=true,conference_days=array[date '2040-01-01',date '2040-01-02']
 where edition_key='synthetic-readiness';
select is(pg_temp.readiness()->>'participantAccountsEnabled','true','Participant enablement is read from persisted policy');
select is(pg_temp.readiness()->>'participantPolicyComplete','true','Approved v1.0 notice and positive budget are complete');
select is(pg_temp.readiness()->>'participantEmailDailyLimit','123','Participant email budget is an aggregate numeric value');
select is(pg_temp.readiness()->>'retentionEnabled','true','Retention enablement is read from persisted policy');
select is(pg_temp.readiness()->>'outboxDeliveryEnabled','true','Delivery enablement is read independently');
select is(pg_temp.readiness()->>'outboxSweepsEnabled','true','Sweep enablement is read independently');
select is(pg_temp.readiness()->>'outboxDailyCap','456','The configured outbox cap is reported exactly');
select is(pg_temp.readiness()->>'registrationEnabled','true','The final switch can report open without changing it');
select is(pg_temp.readiness()->>'conferenceDaysSet','true','Explicit owner-entered dates satisfy conference-day presence');
select is(pg_temp.readiness()->>'conferenceDayCount','2','Only the count of conference days is returned by this RPC');
update msrc_participant.policy set privacy_version='synthetic-unapproved';
select is(pg_temp.readiness()->>'participantPolicyComplete','false','A different nonempty notice is not silently treated as approved v1.0');
update msrc_participant.policy set privacy_version='v1.0';

select is(pg_temp.readiness()->'staffCounts','{"superAdmin":2,"registrationWorkshopAdministrator":2,"checkInStaff":1,"finance":1,
 "abstractReviewer":0,"hackathonReviewer":0,"threeMinuteThesisReviewer":0,"scientificAdministrator":0,"judgingCommittee":0,
 "facultyJudge":0,"contentMediaEditor":0,"sponsorshipPr":0}'::jsonb,
 'All operational roles receive distinct active edition-granted staff counts');
select is(pg_temp.readiness()->>'superAdminsWithAuthenticatorCount','2','Two distinct active Super Admins have verified TOTP factors');
select is(pg_temp.readiness()->>'secondSuperAdminWithAuthenticator','true','Two verified authenticator holders meet the backup gate');
select throws_ok($$insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values(gen_random_uuid(),pg_temp.registration_actor(2401),'totp','verified',now()-interval '5 minutes',now()-interval '5 minutes')$$,
 '42501','Authenticator replacement requires another Super Admin.','The existing native guard refuses a duplicate verified factor');
select is(pg_temp.readiness()->>'superAdminsWithAuthenticatorCount','2','Rejected duplicate factors do not inflate the distinct admin count');
update auth.mfa_factors set status='unverified' where user_id=pg_temp.registration_actor(2401);
select is(pg_temp.readiness()->>'superAdminsWithAuthenticatorCount','1','Unverified factors do not satisfy backup authenticator readiness');
select is(pg_temp.readiness()->>'secondSuperAdminWithAuthenticator','false','One verified authenticator holder is not enough');
update auth.mfa_factors set status='verified' where user_id=pg_temp.registration_actor(2401);
-- Preserve the minimum-two-active-admin guard while testing an unavailable backup.
select pg_temp.registration_staff_fixture(2408,'synthetic-readiness');
update auth.mfa_factors set status='unverified' where user_id=pg_temp.registration_actor(2408);
update msrc_authorization.account_access set state='suspended' where actor_id=pg_temp.registration_actor(2401);
select is(pg_temp.readiness()->'staffCounts'->>'superAdmin','2','Suspended accounts are excluded from staffing counts');
select is(pg_temp.readiness()->>'secondSuperAdminWithAuthenticator','false','Suspended backup Super Admin cannot satisfy readiness');
update msrc_authorization.account_access set state='active' where actor_id=pg_temp.registration_actor(2401);
update auth.users set banned_until=clock_timestamp()+interval '1 hour' where id=pg_temp.registration_actor(2401);
select is(pg_temp.readiness()->>'secondSuperAdminWithAuthenticator','false','A native-banned backup Super Admin cannot satisfy readiness');
update auth.users set banned_until=null where id=pg_temp.registration_actor(2401);
update msrc_staff.profiles set recovery_state='pending',recovery_action='reset_authenticator',recovery_operation=gen_random_uuid()
 where actor_id=pg_temp.registration_actor(2401);
select is(pg_temp.readiness()->>'secondSuperAdminWithAuthenticator','false','A recovery-held backup Super Admin cannot satisfy readiness');
update msrc_staff.profiles set recovery_state='none',recovery_action=null,recovery_operation=null
 where actor_id=pg_temp.registration_actor(2401);
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,scope_target,grant_reason)
 values(pg_temp.registration_actor(2404),'synthetic-readiness','registrationWorkshopAdministrator','function','synthetic-only','Synthetic scope exclusion');
select is(pg_temp.readiness()->'staffCounts'->>'registrationWorkshopAdministrator','2',
 'A function-scoped grant cannot satisfy edition-level registration staffing');
update msrc_authorization.role_grants set state='revoked',revoked_at=clock_timestamp(),revocation_reason='Synthetic revoked approver'
 where actor_id=pg_temp.registration_actor(2407) and role_name='registrationWorkshopAdministrator';
select is(pg_temp.readiness()->'staffCounts'->>'registrationWorkshopAdministrator','1','Revoked approvers are excluded');
update msrc_authorization.account_access set individually_identified=false where actor_id=pg_temp.registration_actor(2403);
select is(pg_temp.readiness()->'staffCounts'->>'checkInStaff','0','An unidentified staff account cannot satisfy scanner staffing');
update msrc_authorization.account_access set individually_identified=true where actor_id=pg_temp.registration_actor(2403);

insert into msrc_registration.early_access_entries(edition_key,email,added_by) values
 ('synthetic-readiness','launch-one@example.invalid',pg_temp.registration_actor(2400)),
 ('synthetic-readiness','launch-two@example.invalid',pg_temp.registration_actor(2400)),
 ('synthetic-readiness-other','launch-other@example.invalid',pg_temp.registration_actor(2406));
update msrc_registration.early_access_entries set active=false,removed_at=clock_timestamp(),removed_by=pg_temp.registration_actor(2400)
 where email='launch-two@example.invalid';
select is(pg_temp.readiness()->>'earlyAccessCount','1','Only active entries in the authorized edition are counted');
select is(pg_temp.readiness()->>'healthReady','true','The bounded no-data database ping executes');
select is(pg_temp.readiness()->>'lastOutboxDrainObservable','false','No latest drain success is invented without a run ledger');
select ok(not exists(select 1 from jsonb_each(pg_temp.readiness()->'requiredRpcs') p where p.value<>'true'::jsonb),
 'The full migration chain exposes every required RPC signature');
alter function public.msrc_registration_accept_offer(text,jsonb,uuid,uuid,text) rename to msrc_registration_accept_offer_readiness_fixture;
select is(pg_temp.readiness()->'requiredRpcs'->>'registration','false','A missing required action is detected without invoking a mutation');
alter function public.msrc_registration_accept_offer_readiness_fixture(text,jsonb,uuid,uuid,text) rename to msrc_registration_accept_offer;
alter function public.msrc_health_check() rename to msrc_health_check_readiness_fixture;
select is(pg_temp.readiness()->'requiredRpcs'->>'health','false','Missing health RPC is shown explicitly');
select is(pg_temp.readiness()->>'healthReady','false','Missing health RPC fails closed without crashing the checklist');
alter function public.msrc_health_check_readiness_fixture() rename to msrc_health_check;

create temporary table readiness_before as select jsonb_build_object(
 'participant',(select to_jsonb(p) from msrc_participant.policy p),
 'retention',(select to_jsonb(p) from msrc_participant.retention_policy p),
 'outbox',(select to_jsonb(s) from msrc_outbox.settings s),
 'registration',(select to_jsonb(s) from msrc_registration.settings s where s.edition_key='synthetic-readiness'),
 'session',(select to_jsonb(s) from msrc_sessions.session_state s where s.session_id=pg_temp.registration_session(2400)),
 'attempts',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from msrc_outbox.daily_attempts a),
 'messages',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from msrc_outbox.messages m)) as snapshot;
create temporary table readiness_result as select pg_temp.readiness() as value;
select ok((with recursive nodes(value) as (
 select value-'state' from readiness_result
 union all select child.value from nodes n
 cross join lateral jsonb_each(case when jsonb_typeof(n.value)='object' then n.value else '{}'::jsonb end) child
 ) select not exists(select 1 from nodes where jsonb_typeof(value) not in('object','boolean','number'))),
 'Apart from the state discriminator, every projected leaf is a boolean or count');
select is((select jsonb_build_object(
 'participant',(select to_jsonb(p) from msrc_participant.policy p),
 'retention',(select to_jsonb(p) from msrc_participant.retention_policy p),
 'outbox',(select to_jsonb(s) from msrc_outbox.settings s),
 'registration',(select to_jsonb(s) from msrc_registration.settings s where s.edition_key='synthetic-readiness'),
 'session',(select to_jsonb(s) from msrc_sessions.session_state s where s.session_id=pg_temp.registration_session(2400)),
 'attempts',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from msrc_outbox.daily_attempts a),
 'messages',(select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from msrc_outbox.messages m))),
 (select snapshot from readiness_before),'Readiness changes no settings, session activity, queue records or sending budget');
select msrc_staff.revoke(pg_temp.registration_actor(2400),pg_temp.registration_actor(2401));
select is(pg_temp.readiness(),'{"state":"denied"}'::jsonb,'A subsequently revoked reader loses readiness access immediately');

select * from finish();
rollback;
