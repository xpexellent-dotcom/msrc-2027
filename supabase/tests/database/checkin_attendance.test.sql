-- ENG-058; CHK-01..05, BL-ATT-01/03, CRT-01. Disposable synthetic data only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok(not exists(select 1 from pg_class where oid in('msrc_registration.attendance'::regclass,
 'msrc_registration.attendance_audit'::regclass,'msrc_registration.checkin_limits'::regclass)
 and not(relrowsecurity and relforcerowsecurity)),'Attendance, audit and limits force RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
 cross join (values('msrc_registration.attendance'),('msrc_registration.attendance_audit'),('msrc_registration.checkin_limits')) t(name)
 where has_table_privilege(r.name,t.name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'API roles cannot read or mutate attendance tables');
select ok(not exists(select 1 from pg_proc p where p.proname in('msrc_staff_checkin','msrc_staff_checkin_undo',
 'msrc_staff_attendance_summary','msrc_registration_attendance','checkin_rate_limit','checkin_result')
 and not ('search_path=""'=any(p.proconfig))),'Attendance definers use empty search paths');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname in('msrc_staff_checkin','msrc_staff_checkin_undo','msrc_staff_attendance_summary','msrc_registration_attendance')
 and a.grantee in(0,'anon'::regrole)),'No public or anonymous attendance RPC grants');
select ok(has_function_privilege('service_role','public.msrc_registration_attendance(text,jsonb)','EXECUTE')
 and not has_function_privilege('authenticated','public.msrc_registration_attendance(text,jsonb)','EXECUTE'),'Participant attendance is server-only');
select ok(not exists(select 1 from msrc_registration.settings where conference_days is not null),'Migration seeds no conference days');
select ok(msrc_registration.conference_days_valid(null::date[]),'Unconfigured days remain nullable');
select ok(not msrc_registration.conference_days_valid(array[]::date[]),'Empty configured days are invalid');
select ok(not msrc_registration.conference_days_valid(array[date '2040-01-02',date '2040-01-01']),'Days must be sorted');
select ok(not msrc_registration.conference_days_valid(array[date '2040-01-01',date '2040-01-01']),'Duplicate days are invalid');
select ok(not msrc_registration.conference_days_valid(array[null::date]),'Null members are invalid');
select ok(not msrc_registration.conference_days_valid(array[date 'infinity']),'Infinite dates are invalid');
select ok(not msrc_registration.conference_days_valid(array(select date '2040-01-01'+i from generate_series(0,31) i)),'Engineering array bound is enforced');

set local role anon;
select throws_ok($$select public.msrc_staff_checkin('synthetic-checkin','ABCDEF012345','2040-01-01',null)$$,'42501',null,'Anonymous cannot scan');
reset role;
set local role service_role;
select throws_ok($$select public.msrc_staff_checkin('synthetic-checkin','ABCDEF012345','2040-01-01',null)$$,'42501',null,'Service role cannot impersonate native staff');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-checkin');
select pg_temp.registration_settings('synthetic-checkin-other');
do $$declare n integer;begin for n in 7101..7105 loop perform pg_temp.registration_fixture(n,'synthetic-checkin');end loop;end$$;
select pg_temp.registration_staff_fixture(7201,'synthetic-checkin');
select pg_temp.registration_staff_fixture(7202,'synthetic-checkin');
select pg_temp.registration_staff_fixture(7203,'synthetic-checkin','checkInStaff');
select pg_temp.registration_staff_fixture(7204,'synthetic-checkin','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(7205,'synthetic-checkin','checkInStaff');
do $$declare n integer;begin for n in 7101..7104 loop perform pg_temp.registration_submit('synthetic-checkin',n,md5(n::text)||md5(n::text));end loop;end$$;
update msrc_registration.requests set status='approved' where edition_key='synthetic-checkin';
update msrc_registration.requests set status='cancelled' where actor_id=pg_temp.registration_actor(7102);
update msrc_registration.requests set status='approved_awaiting_payment',payment_due_at=clock_timestamp()+interval '1 hour'
 where actor_id=pg_temp.registration_actor(7103);
create function pg_temp.checkin_credential(n integer,scan boolean default true) returns text language sql stable as $$
 select case when scan then 'msrc1.'||t.id::text||'.'||msrc_registration.ticket_secret(t.id,repeat('a',64))
 else upper(substr(replace(t.id::text,'-',''),1,12)) end from msrc_registration.tickets t
 join msrc_registration.requests r on r.id=t.request_id where r.actor_id=pg_temp.registration_actor(n) and r.edition_key='synthetic-checkin';$$;
create function pg_temp.checkin_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);end$$;
create function pg_temp.checkin(n integer,day date default date '2040-01-01',scan boolean default true) returns jsonb language sql as $$
 select public.msrc_staff_checkin('synthetic-checkin',pg_temp.checkin_credential(n,scan),day,'Synthetic entry');$$;

select pg_temp.checkin_claim(7201);
select is(public.msrc_staff_attendance_summary('synthetic-checkin',null)->'conferenceDays','null'::jsonb,'Unset conference day configuration is explicit');
select is(pg_temp.checkin(7101)->>'state','wrong_day','No implicit published dates are seeded or accepted');
select is(public.msrc_staff_registration_settings_save('synthetic-checkin','{"conference_days":["2040-01-01","2040-01-02"]}'::jsonb,gen_random_uuid())->>'state','updated','Owner can configure two distinct conference days');
select is(public.msrc_staff_registration_settings('synthetic-checkin')->'settings'->'conference_days','["2040-01-01","2040-01-02"]'::jsonb,'Owner settings projection includes dates');
select is(public.msrc_staff_registration_settings_save('synthetic-checkin','{"conference_days":["2040-02-30"]}'::jsonb,gen_random_uuid())->>'state','invalid','Impossible calendar dates fail settings validation');
select is(public.msrc_staff_registration_settings_save('synthetic-checkin','{"conference_days":["2040-01-02","2040-01-01"]}'::jsonb,gen_random_uuid())->>'state','invalid','Unsorted save is rejected');
select is(public.msrc_staff_registration_settings_save('synthetic-checkin','{"conference_days":["2040-01-01","2040-01-01"]}'::jsonb,gen_random_uuid())->>'state','invalid','Duplicate save is rejected');
select is(public.msrc_staff_registration_settings_save('synthetic-checkin','{"conference_days":"2040-01-01"}'::jsonb,gen_random_uuid())->>'state','invalid','Scalar date setting is rejected');
select ok(exists(select 1 from msrc_registration.settings_audit where edition_key='synthetic-checkin' and changes ? 'conference_days'),'Owner day changes are audited');
select pg_temp.checkin_claim(7101);
select is(pg_temp.checkin(7101)->>'state','denied','Participant cannot scan own ticket');
select is(public.msrc_staff_attendance_summary('synthetic-checkin','2040-01-01')->>'state','denied','Participant cannot access running counts');
select pg_temp.checkin_claim(7204);
select is(pg_temp.checkin(7101)->>'state','denied','Registration administrators do not inherit check-in authority');
select pg_temp.checkin_claim(7203);
select is(public.msrc_staff_checkin('synthetic-checkin-other',pg_temp.checkin_credential(7101),'2040-01-01',null)->>'state','denied','Edition authority is enforced');
select is(public.msrc_staff_checkin('synthetic-checkin','ABCDEF012345','2040-01-01',null)->>'state','not_found','Unknown manual reference is not found');
select is(public.msrc_staff_checkin('synthetic-checkin','malformed-qr','2040-01-01',null)->>'state','not_found','Malformed credential fails closed');
select is(public.msrc_staff_checkin('synthetic-checkin',left(pg_temp.checkin_credential(7101),43)||repeat('0',64),'2040-01-01',null)->>'state','not_found','Forged QR secret cannot check in');
select is(pg_temp.checkin(7102)->>'state','revoked','Revoked/cancelled credential is rejected');
select is(pg_temp.checkin(7103)->>'state','not_approved','Pending payment entitlement is rejected');
update msrc_authorization.account_access set state='suspended' where actor_id=pg_temp.registration_actor(7104);
select is(pg_temp.checkin(7104)->>'state','not_approved','Suspended participant cannot use an issued credential');
update msrc_authorization.account_access set state='active' where actor_id=pg_temp.registration_actor(7104);
update auth.users set banned_until=clock_timestamp()+interval '1 hour' where id=pg_temp.registration_actor(7104);
select is(pg_temp.checkin(7104)->>'state','not_approved','Native banned participant cannot use an issued credential');
update auth.users set banned_until=null where id=pg_temp.registration_actor(7104);
select is(pg_temp.checkin(7101,'2040-01-03')->>'state','wrong_day','Unconfigured conference day is rejected');
select is(public.msrc_staff_checkin('synthetic-checkin',pg_temp.checkin_credential(7101),'2040-01-01',repeat('x',121))->>'state','invalid','Overlong entry point is rejected');
create temporary table first_attendance as select pg_temp.checkin(7101) as result;
select is((select result->>'state' from first_attendance),'checked_in','Exact-session check-in staff can scan a valid credential');
select is((select result#>>'{attendance,performerId}' from first_attendance),pg_temp.registration_actor(7203)::text,'Result identifies the original staff performer');
select is((select result#>>'{attendance,method}' from first_attendance),'scan','QR method is recorded');
select is(pg_temp.checkin(7101)->>'state','already_checked_in','Repeat scan is idempotent');
select is(pg_temp.checkin(7101)->'attendance',(select result->'attendance' from first_attendance),'Repeat returns original time and performer');
select is((select count(*) from msrc_registration.attendance),1::bigint,'Repeated scans grant exactly one attendance row');
select is(public.msrc_staff_attendance_summary('synthetic-checkin','2040-01-01')->'counts','{"checkedIn":1,"scan":1,"manualCode":0}'::jsonb,'Running counts expose only aggregate day evidence');
create temporary table scan_activity_before_poll as select last_activity_at from msrc_sessions.session_state where session_id=pg_temp.registration_session(7203);
select is(public.msrc_staff_attendance_summary('synthetic-checkin',null)->>'state','ready','Passive summary can refresh configuration');
select is((select last_activity_at from msrc_sessions.session_state where session_id=pg_temp.registration_session(7203)),
 (select last_activity_at from scan_activity_before_poll),'Passive count polling never extends staff idle activity');
select is(public.msrc_staff_attendance_summary('synthetic-checkin','2040-01-02')->'counts','{"checkedIn":0,"scan":0,"manualCode":0}'::jsonb,'Day one never grants day two attendance');
select is(public.msrc_staff_attendance_summary('synthetic-checkin','2040-01-03')->>'state','wrong_day','Summary refuses an unconfigured day');
select is(pg_temp.checkin(7101,'2040-01-02',false)->>'state','checked_in','Manual reference independently records day two');
select is(public.msrc_staff_attendance_summary('synthetic-checkin','2040-01-02')->'counts','{"checkedIn":1,"scan":0,"manualCode":1}'::jsonb,'Manual path is separately counted');
select is((select count(*) from msrc_registration.attendance),2::bigint,'One participant can hold both day records');
select is(public.msrc_staff_checkin_undo('synthetic-checkin',(select (result#>>'{attendance,id}')::uuid from first_attendance),'Synthetic mistake')->>'state','denied','Check-in staff cannot undo');
select pg_temp.checkin_claim(7201);
select is(public.msrc_staff_checkin_undo('synthetic-checkin',(select (result#>>'{attendance,id}')::uuid from first_attendance),'')->>'state','invalid','Correction requires a nonblank reason');
select throws_ok($$update msrc_registration.attendance set undone_at=clock_timestamp(),undone_by=pg_temp.registration_actor(7201),undo_reason=null$$,
 '23514',null,'Storage cannot represent a correction with a null reason');
select is(public.msrc_staff_checkin_undo('synthetic-checkin',(select (result#>>'{attendance,id}')::uuid from first_attendance),'Synthetic mistaken scan')->>'state','undone','Super Admin can correct a mistake');
select is(public.msrc_staff_checkin_undo('synthetic-checkin',(select (result#>>'{attendance,id}')::uuid from first_attendance),'Synthetic mistaken scan')->>'state','already_undone','Undo retries are idempotent');
select is((select checked_in_at::text from msrc_registration.attendance where id=(select (result#>>'{attendance,id}')::uuid from first_attendance)),
 (select (result#>>'{attendance,checkedInAt}')::timestamptz::text from first_attendance),'Undo preserves the original attendance timestamp');
select is(public.msrc_staff_attendance_summary('synthetic-checkin','2040-01-01')->'counts','{"checkedIn":0,"scan":0,"manualCode":0}'::jsonb,'Undo removes active attendance credit');
select ok(exists(select 1 from msrc_registration.attendance_audit where event='undo' and result='undone'
 and reason='Synthetic mistaken scan' and snapshot->>'checked_in_at' is not null),'Correction history preserves original record and reason');
select is(pg_temp.checkin(7101)->>'state','checked_in','A valid later scan restores corrected attendance');
select is(pg_temp.checkin(7101)->'attendance'->>'id',(select result#>>'{attendance,id}' from first_attendance),'Re-entry reuses the unique ticket/day row');
select is((select count(*) from msrc_registration.attendance),2::bigint,'Re-entry never duplicates attendance rows');
select ok(exists(select 1 from msrc_registration.attendance_audit where result='checked_in'
 and snapshot->>'performer_id'=pg_temp.registration_actor(7203)::text),'Immutable audit retains original staff identity after re-entry');
select throws_ok($$update msrc_registration.attendance_audit set result='not_found'$$,'55000','Staff audit is append-only.','Original audit evidence cannot be overwritten');
select ok(not exists(select 1 from msrc_registration.attendance_audit where to_jsonb(attendance_audit)::text like '%msrc1.%'
 or to_jsonb(attendance_audit)::text like '%secret_hash%'),'Audit never records QR credentials or hashes');
select is(public.msrc_staff_checkin_undo('synthetic-checkin',gen_random_uuid(),'Synthetic unknown')->>'state','not_found','Unknown attendance correction is not found');

select is(jsonb_array_length(public.msrc_registration_attendance('synthetic-checkin',pg_temp.registration_claims(7101))->'days'),2,'Participant sees configured per-day records');
select ok((public.msrc_registration_attendance('synthetic-checkin',pg_temp.registration_claims(7101))#>>'{days,0,checkedInAt}') is not null,'Own checked-in date is visible');
select is(public.msrc_registration_attendance('synthetic-checkin',pg_temp.registration_claims(7105))->'days',
 '[{"conferenceDay":"2040-01-01","checkedInAt":null},{"conferenceDay":"2040-01-02","checkedInAt":null}]'::jsonb,'Another participant sees no attendance belonging to someone else');
select ok(public.msrc_registration_attendance('synthetic-checkin',pg_temp.registration_claims(7101))::text !~ 'performer|entryPoint|ticket|secret|reason','Participant projection excludes staff and credential data');
select is(public.msrc_registration_attendance('synthetic-checkin',pg_temp.registration_claims(7203))->>'state','denied','Staff claims cannot impersonate participant attendance');
select is(public.msrc_registration_attendance('synthetic-checkin',pg_temp.registration_claims(7101)||jsonb_build_object('session_id',pg_temp.registration_session(7105)))->>'state','denied','Participant reader binds exact session ownership');
update msrc_registration.settings set enabled=false where edition_key='synthetic-checkin';
select is(public.msrc_registration_attendance('synthetic-checkin',pg_temp.registration_claims(7101))->>'state','closed','Participant attendance remains behind the independent registration gate');
select pg_temp.checkin_claim(7201);
select is(pg_temp.checkin(7104)->>'state','checked_in','Staff may check already-issued tickets after registration closes');

delete from msrc_staff_email.receipts where actor_id=pg_temp.registration_actor(7205);
select pg_temp.checkin_claim(7205);
select is(pg_temp.checkin(7101)->>'state','denied','Staff without exact-session email proof cannot scan');
select pg_temp.checkin_claim(7203);
update msrc_registration.checkin_limits set attempts=120,window_started_at=clock_timestamp() where session_id=pg_temp.registration_session(7203);
select is(pg_temp.checkin(7101)->>'state','rate_limited','Database rate limit is per native staff session');
select pg_temp.checkin_claim(7201);
select is(pg_temp.checkin(7101)->>'state','already_checked_in','One scanner limit does not block a different staff session');
update msrc_registration.checkin_limits set window_started_at=clock_timestamp()-interval '61 seconds' where session_id=pg_temp.registration_session(7203);
select pg_temp.checkin_claim(7203);
select is(pg_temp.checkin(7101)->>'state','already_checked_in','Per-session rate window recovers after its bounded interval');
select ok(exists(select 1 from msrc_registration.attendance_audit where result='rate_limited'),'Rate-limit outcome is audited without credential material');
update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=pg_temp.registration_session(7203);
select is(pg_temp.checkin(7101)->>'state','denied','Expired native staff session cannot scan');
select * from finish();
rollback;
