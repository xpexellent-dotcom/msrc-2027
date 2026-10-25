-- ENG-083: participant account flow follow-up. Disposable synthetic data only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok(not has_function_privilege('anon','public.msrc_staff_participant_detail(text,uuid)','EXECUTE')
 and not has_function_privilege('service_role','public.msrc_staff_participant_detail(text,uuid)','EXECUTE'),'Participant detail is not callable anonymously or by the service role');
select ok(has_function_privilege('authenticated','public.msrc_participant_account_details()','EXECUTE')
 and not has_function_privilege('anon','public.msrc_participant_account_details()','EXECUTE'),'Own account details need a signed-in session');
select ok(not exists(select 1 from pg_proc p where p.proname in('msrc_staff_participant_detail','msrc_participant_account_details','msrc_participant_email_begin')
 and not('search_path=""'=any(p.proconfig))),'New and changed functions pin an empty search path');

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-flow');
select pg_temp.registration_fixture(8301,'synthetic-flow');
select pg_temp.registration_fixture(8302,'synthetic-flow');
select pg_temp.registration_staff_fixture(8401,'synthetic-flow');
select pg_temp.registration_staff_fixture(8402,'synthetic-flow','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(8403,'synthetic-flow','checkInStaff');
select pg_temp.registration_submit('synthetic-flow',8301,md5('8301')||md5('8301'));

create function pg_temp.claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);end$$;

-- Staff detail: same roles as the participants list.
select pg_temp.claim(8403);
select is(public.msrc_staff_participant_detail('synthetic-flow',pg_temp.registration_actor(8301))->>'state','denied','Check-in staff cannot open participant details');
select pg_temp.claim(8301);
select is(public.msrc_staff_participant_detail('synthetic-flow',pg_temp.registration_actor(8302))->>'state','denied','A participant cannot open another participant');
select pg_temp.claim(8402);
select is(public.msrc_staff_participant_detail('synthetic-flow',pg_temp.registration_actor(8301))->>'state','ready','Registration/workshop administrators can open details');
select pg_temp.claim(8401);
create temporary table detail as select public.msrc_staff_participant_detail('synthetic-flow',pg_temp.registration_actor(8301))->'participant' p;
select is((select p->>'email' from detail),'registration-8301@example.invalid','Detail includes the account email');
select is((select p->>'status' from detail),'verified','Detail reports the account status');
select ok((select p->>'verifiedAt' from detail) is not null and (select p->>'createdAt' from detail) is not null,'Detail includes created and verified times');
select is((select p#>>'{registration,status}' from detail),(select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(8301) and edition_key='synthetic-flow'),'Detail includes the registration request');
select ok((select p->'registration' ? 'identityMasked' from detail) and (select p::text from detail) !~ 'identity_envelope|identity_hash|secret','Identity stays masked; no envelope, hash or secret');
select is((select jsonb_typeof(p->'workshops')||jsonb_typeof(p->'submissions')||jsonb_typeof(p->'competitions')||jsonb_typeof(p->'certificates') from detail),'arrayarrayarrayarray','Activity lists are always arrays');
select is(public.msrc_staff_participant_detail('synthetic-flow',pg_temp.registration_actor(8302))#>>'{participant,registration}',null,'No registration shows as empty');
select is(public.msrc_staff_participant_detail('synthetic-flow',gen_random_uuid())->>'state','not_found','Unknown participants are not found');
select ok(exists(select 1 from msrc_staff.audit where action='participants_read' and target_id=pg_temp.registration_actor(8301) and result='allowed'),'Opening details is audited with the participant as target');

-- Own account details.
select pg_temp.claim(8301);
select is(public.msrc_participant_account_details()->>'email','registration-8301@example.invalid','A participant sees their own email');
select pg_temp.claim(8401);
select is(public.msrc_participant_account_details(),null,'A staff session has no participant details');

-- Two-minute gap between codes for the same address.
reset role;
select pg_temp.claim(0);
insert into msrc_participant.limit_events(kind,subject_hash,nonce_hash,occurred_at) values('issue_email',repeat('c',64),repeat('d',64),clock_timestamp()-interval '90 seconds');
select is(public.msrc_participant_email_begin('fresh-flow@example.invalid','verify_email',gen_random_uuid(),repeat('a',64),repeat('c',64),repeat('e',64),'Synthetic','synthetic-registration-notice')->>'state','denied','A second code within 2 minutes is refused');
select * from finish();
rollback;
