-- ORG-055/056 / ENG-053. Disposable synthetic settings and identities only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select is((select count(*) from msrc_registration.settings),0::bigint,'No registration settings are seeded');
select is((select count(*) from msrc_registration.settings_audit),0::bigint,'No settings history is seeded');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='msrc_registration.settings_audit'::regclass),'Settings audit has forced RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) roles(name)
 where has_table_privilege(roles.name,'msrc_registration.settings_audit','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'API roles have no direct audit access');
select ok(not exists(select 1 from pg_proc p where p.proname in('msrc_staff_registration_settings','msrc_staff_registration_settings_save','staff_settings_result')
 and not ('search_path=""'=any(p.proconfig))),'Settings functions have empty search paths');
select is((select count(*) from pg_proc p where p.pronamespace='public'::regnamespace
 and p.proname in('msrc_staff_registration_settings','msrc_staff_registration_settings_save')
 and has_function_privilege('authenticated',p.oid,'EXECUTE')),2::bigint,'Guarded RPCs have authenticated grants');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname in('msrc_staff_registration_settings','msrc_staff_registration_settings_save','staff_settings_result')
 and a.grantee in(0,'anon'::regrole,'service_role'::regrole)),'No anonymous, PUBLIC or service-role function grants');
select ok(not has_function_privilege('authenticated','msrc_registration.staff_settings_result(text)','EXECUTE'),'Projection helper is private');
set local role anon;
select throws_ok($$select public.msrc_staff_registration_settings('synthetic-settings')$$,'42501',null,'Anonymous cannot read settings');
select throws_ok($$select public.msrc_staff_registration_settings_save('synthetic-settings','{}'::jsonb,gen_random_uuid())$$,'42501',null,'Anonymous cannot save settings');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-settings'),('synthetic-settings-other');
select pg_temp.registration_staff_fixture(1500,'synthetic-settings');
select pg_temp.registration_staff_fixture(1501,'synthetic-settings');
select pg_temp.registration_staff_fixture(1502,'synthetic-settings','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(1503,'synthetic-settings','finance');
select pg_temp.registration_fixture(1504,'synthetic-settings');
create function pg_temp.settings_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',case when n=0 then '{}' else pg_temp.registration_claims(n)::text end,true);end$$;
create function pg_temp.settings_input() returns jsonb language sql immutable as $$select '{
 "terms_version":"synthetic-settings-terms","payment_required":false,"general_capacity":17,
 "priority_start_at":"2040-02-01T20:00:00+03:00","priority_end_at":"2040-02-02T20:00:00+03:00",
 "general_opening_at":"2040-02-02T20:00:00+03:00","closing_at":"2040-02-03T20:00:00+03:00",
 "offer_window_hours":13,"waitlist_offer_hours":11,"confirm_seat_lead_days":0,
 "confirm_seat_response_hours":7,"places_remaining_threshold":0,"minimum_age":18}'::jsonb;$$;
create function pg_temp.settings_save(patch jsonb,operation uuid default gen_random_uuid()) returns jsonb language sql as $$
 select public.msrc_staff_registration_settings_save('synthetic-settings',patch,operation);$$;
create function pg_temp.settings_denials() returns setof text language plpgsql as $$declare n integer;begin
 foreach n in array array[0,1502,1503,1504] loop
 perform pg_temp.settings_claim(n);
 if n in(1502,1503) then return next ok(msrc_staff.authorize('synthetic-settings',null,false) is not null,'Wrong-role staff has a valid assured session '||n);end if;
 return next is(public.msrc_staff_registration_settings('synthetic-settings')->>'state','denied','Read rejects unauthorized caller '||n);
 return next is(pg_temp.settings_save(pg_temp.settings_input())->>'state','denied','Save rejects unauthorized caller '||n);
 end loop;end$$;
select * from pg_temp.settings_denials();
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(1500)||'{"aal":"aal1"}'::jsonb)::text,true);end$$;
select is(public.msrc_staff_registration_settings('synthetic-settings')->>'state','denied','Read requires Super Admin TOTP');
select is(pg_temp.settings_save(pg_temp.settings_input())->>'state','denied','Save requires Super Admin TOTP');
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(1500)||jsonb_build_object('session_id',pg_temp.registration_session(1501)))::text,true);end$$;
select is(pg_temp.settings_save(pg_temp.settings_input())->>'state','denied','Another native session cannot supply TOTP assurance');
select pg_temp.settings_claim(1500);
select is(public.msrc_staff_registration_settings('synthetic-settings-other')->>'state','denied','Read enforces edition role scope');
select is(public.msrc_staff_registration_settings_save('synthetic-settings-other',pg_temp.settings_input(),gen_random_uuid())->>'state','denied','Save enforces edition role scope');
select is(public.msrc_staff_registration_settings('synthetic-settings')->'settings','null'::jsonb,'Missing settings returns null rather than denial');
select is(public.msrc_staff_registration_settings('synthetic-settings')->>'settingsComplete','false','Absent settings are incomplete');
select is(public.msrc_staff_registration_settings('synthetic-settings')->'history','[]'::jsonb,'Absent settings have empty history');
select is(public.msrc_staff_registration_settings('synthetic-settings')->>'participantAccountsReady','true','Read derives participant readiness from database gates');
update msrc_participant.policy set enabled=false;
select is(public.msrc_staff_registration_settings('synthetic-settings')->>'participantAccountsReady','false','Closed participant policy is reported independently');
update msrc_participant.policy set enabled=true;
select is(pg_temp.settings_save('{"terms_version":"incomplete"}'::jsonb)->>'state','invalid','Incomplete initial save is refused');
select is((select count(*) from msrc_registration.settings where edition_key='synthetic-settings'),0::bigint,'Invalid first save rolls back its settings row');
select is(pg_temp.settings_save(pg_temp.settings_input()||'{"enabled":true}'::jsonb)->>'state','enable_not_allowed_here','First save cannot open registration');
set local role authenticated;
select is(pg_temp.settings_save(pg_temp.settings_input(),'e7300000-0000-4000-8000-000000001500')->>'state','updated','Assured Super Admin can create complete settings through authenticated RPC');
select throws_ok($$select * from msrc_registration.settings$$,'42501',null,'Authenticated caller cannot read settings table');
select throws_ok($$select * from msrc_registration.settings_audit$$,'42501',null,'Authenticated caller cannot read audit table');
reset role;
select is((select enabled from msrc_registration.settings where edition_key='synthetic-settings'),false,'Save keeps registration closed');
select is(public.msrc_staff_registration_settings('synthetic-settings')->>'settingsComplete','true','Saved settings satisfy authoritative completeness');
select is((select priority_start_at from msrc_registration.settings where edition_key='synthetic-settings'),'2040-02-01T17:00:00Z'::timestamptz,'Riyadh input is stored as the correct timestamptz instant');
select ok((select early_access_start_at=priority_start_at and early_access_end_at=priority_end_at from msrc_registration.settings where edition_key='synthetic-settings'),'Legacy early window mirrors priority window');
select is((select changes->'general_capacity' from msrc_registration.settings_audit where edition_key='synthetic-settings'),'{"before":null,"after":17}'::jsonb,'Create audit records field-level before and after values');
select is((select performer_id from msrc_registration.settings_audit where edition_key='synthetic-settings'),pg_temp.registration_actor(1500),'Audit records the exact saving Super Admin');
select is(pg_temp.settings_save('{"enabled":true}'::jsonb)->>'state','enable_not_allowed_here','Updating cannot open registration');
select is(pg_temp.settings_save('{"terms_version":"synthetic-revised"}'::jsonb,'e7300000-0000-4000-8000-000000001501')->>'state','updated','Partial patch may merge into a complete saved configuration');
select is((select changes from msrc_registration.settings_audit where operation_id='e7300000-0000-4000-8000-000000001501'),
 '{"terms_version":{"before":"synthetic-settings-terms","after":"synthetic-revised"}}'::jsonb,'Update audit lists only the actual changed field');
select is(pg_temp.settings_save(pg_temp.settings_input(),'e7300000-0000-4000-8000-000000001500')->>'state','updated','Exact operation replay succeeds');
select is((select terms_version from msrc_registration.settings where edition_key='synthetic-settings'),'synthetic-revised','Replay cannot overwrite a newer saved value');
select is((select count(*) from msrc_registration.settings_audit where edition_key='synthetic-settings'),2::bigint,'Replay creates no extra audit row');
select is(pg_temp.settings_save('{"general_capacity":19}'::jsonb,'e7300000-0000-4000-8000-000000001500')->>'state','operation_conflict','Operation UUID cannot be reused with changed input');
select pg_temp.settings_claim(1501);
select is(pg_temp.settings_save(pg_temp.settings_input(),'e7300000-0000-4000-8000-000000001500')->>'state','operation_conflict','Operation UUID cannot be reused by another Super Admin');
select pg_temp.settings_claim(1500);

create function pg_temp.settings_validation() returns setof text language plpgsql as $$declare patch jsonb;field text;begin
 for patch in select value from jsonb_array_elements('[null,[],{},true,{"invented":1},{"edition_key":"other"},
 {"updated_at":"2040-01-01T00:00:00Z"},{"default_workshop_capacity":1},{"enabled":null},{"enabled":"true"},
 {"terms_version":""},{"terms_version":" padded "},{"terms_version":3},{"payment_required":"false"},
 {"general_capacity":0},{"general_capacity":-1},{"general_capacity":1.5},{"general_capacity":"17"},{"general_capacity":2147483648},
 {"offer_window_hours":0},{"waitlist_offer_hours":0},{"confirm_seat_lead_days":-1},{"confirm_seat_response_hours":0},
 {"places_remaining_threshold":-1},{"minimum_age":17},{"minimum_age":19},{"minimum_age":null},{"payment_window_hours":0},
 {"priority_start_at":"infinity"},{"priority_start_at":"2040-02-01T20:00"},{"priority_start_at":"2040-99-01T00:00:00Z"},
 {"priority_start_at":"2040-02-02T20:00:00+03:00"},{"priority_end_at":"2040-02-03T20:00:00+03:00"},
 {"closing_at":"2040-02-02T20:00:00+03:00"},{"early_access_start_at":"2040-01-01T20:00:00+03:00"},
 {"payment_required":true}]'::jsonb) loop
 return next is(pg_temp.settings_save(patch)->>'state','invalid','Invalid settings patch is refused: '||patch::text);
 end loop;
 foreach field in array array['terms_version','payment_required','general_capacity','priority_start_at','priority_end_at',
 'general_opening_at','closing_at','confirm_seat_lead_days','confirm_seat_response_hours','places_remaining_threshold'] loop
 return next is(pg_temp.settings_save(jsonb_build_object(field,null))->>'state','invalid','Completeness refuses null '||field);
 end loop;
 return next is(pg_temp.settings_save(jsonb_build_object('terms_version',repeat('x',129)))->>'state','invalid','Terms version cannot exceed CHECK length');
 return next is(pg_temp.settings_save('{"terms_version":"ignored"}'::jsonb,null)->>'state','invalid','Operation UUID is required');
end$$;
select * from pg_temp.settings_validation();
select is((select count(*) from msrc_registration.settings_audit where edition_key='synthetic-settings'),2::bigint,'Invalid attempts create no successful-save audit');
select is((select terms_version from msrc_registration.settings where edition_key='synthetic-settings'),'synthetic-revised','Invalid attempts leave prior settings unchanged');
select is(pg_temp.settings_save('{"payment_required":true,"payment_window_hours":9}'::jsonb)->>'state','updated','Paid settings require an explicit positive payment window');
select is(pg_temp.settings_save('{"payment_required":false,"payment_window_hours":null,"offer_window_hours":null}'::jsonb)->>'state','updated','Free attendance allows null payment window and optional offer duration');
select is(public.msrc_staff_registration_settings('synthetic-settings')->>'settingsComplete','true','Optional offer duration does not change existing completeness contract');
select throws_ok($$update msrc_registration.settings_audit set changes='{}'::jsonb$$,'55000','Staff audit is append-only.','Settings audit cannot be rewritten');
select throws_ok($$delete from msrc_registration.settings_audit$$,'55000','Staff audit is append-only.','Settings audit cannot be deleted');
select throws_ok($$truncate msrc_registration.settings_audit$$,'55000','Staff audit is append-only.','Settings audit cannot be truncated');
do $$declare n integer;begin for n in 1..21 loop
 perform pg_temp.settings_save(jsonb_build_object('terms_version','synthetic-history-'||n));end loop;end$$;
select is(jsonb_array_length(public.msrc_staff_registration_settings('synthetic-settings')->'history'),20,'Read returns only the last twenty saves');
select is(public.msrc_staff_registration_settings('synthetic-settings')->'history'->0->'changes'->'terms_version'->>'after','synthetic-history-21','History is newest first');
select is(public.msrc_staff_registration_settings('synthetic-settings')->'history'->19->'changes'->'terms_version'->>'after','synthetic-history-2','History cutoff excludes older saves');
select ok((public.msrc_staff_registration_settings('synthetic-settings')->'history'->0) ?& array['id','operationId','performerId','performerName','at','changes'],'History contains the public contract keys');
select ok(not (public.msrc_staff_registration_settings('synthetic-settings')->'history'->0) ? 'request_changes','Internal idempotency payload is not exposed');

-- All four seat-holding statuses count; cancelled/expired/waitlisted do not.
select pg_temp.registration_settings('synthetic-settings-held');
select pg_temp.registration_staff_fixture(1510,'synthetic-settings-held');
do $$declare n integer;begin for n in 1511..1517 loop perform pg_temp.registration_fixture(n,'synthetic-settings-held');end loop;end$$;
do $$declare n integer;begin for n in 1511..1517 loop
 if pg_temp.registration_submit('synthetic-settings-held',n,md5(n::text)||md5(n::text))->>'state'<>'submitted' then raise exception 'Seat fixture failed';end if;
 end loop;end$$;
update msrc_registration.requests set status=case actor_id
 when pg_temp.registration_actor(1511) then 'approved' when pg_temp.registration_actor(1512) then 'approved_awaiting_payment'
 when pg_temp.registration_actor(1513) then 'offered' when pg_temp.registration_actor(1514) then 'confirmed'
 when pg_temp.registration_actor(1515) then 'waitlisted' when pg_temp.registration_actor(1516) then 'cancelled' else 'expired' end,
 payment_due_at=clock_timestamp()+interval '1 hour' where edition_key='synthetic-settings-held';
select pg_temp.settings_claim(1510);
select is(public.msrc_staff_registration_settings_save('synthetic-settings-held','{"general_capacity":3}'::jsonb,gen_random_uuid())->>'state','capacity_below_held','Capacity below all current seat holders is refused');
select is((select general_capacity from msrc_registration.settings where edition_key='synthetic-settings-held'),17,'Refused capacity leaves settings unchanged');
select is((select count(*) from msrc_registration.settings_audit where edition_key='synthetic-settings-held'),0::bigint,'Refused capacity does not create save audit');
select is(public.msrc_staff_registration_settings_save('synthetic-settings-held','{"general_capacity":4}'::jsonb,gen_random_uuid())->>'state','updated','Capacity equal to held seats is allowed');
select is((select enabled from msrc_registration.settings where edition_key='synthetic-settings-held'),true,'Ordinary save preserves an existing external registration switch');
select is(public.msrc_staff_registration_settings_save('synthetic-settings-held','{"enabled":true}'::jsonb,gen_random_uuid())->>'state','enable_not_allowed_here','Even redundant true input is refused at this boundary');
select is(public.msrc_staff_registration_settings_save('synthetic-settings-held','{"enabled":false}'::jsonb,gen_random_uuid())->>'state','updated','Explicit closure is safe and audited');

select * from finish();
rollback;
