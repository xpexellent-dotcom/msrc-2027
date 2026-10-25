-- ENG-082 / CHK-05. Outage roster and offline reconciliation. Disposable synthetic data only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='msrc_registration.offline_imports'::regclass),'Offline import receipts force RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
 where has_table_privilege(r.name,'msrc_registration.offline_imports','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'API roles cannot touch offline import receipts');
select ok(not exists(select 1 from pg_proc p where p.proname in('msrc_staff_checkin_roster','msrc_staff_checkin_offline_import','checkin_ticket_outcome','checkin_attendee_active')
 and not('search_path=""'=any(p.proconfig))),'Fallback functions pin empty search paths');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname in('msrc_staff_checkin_roster','msrc_staff_checkin_offline_import','checkin_ticket_outcome','checkin_attendee_active')
 and a.grantee in(0,'anon'::regrole,'service_role'::regrole)),'No public, anonymous or service-role fallback grants');
select ok(not has_function_privilege('authenticated','msrc_registration.checkin_attendee_active(uuid)','EXECUTE')
 and not has_function_privilege('authenticated','msrc_registration.checkin_ticket_outcome(boolean,text,text)','EXECUTE'),'Shared entitlement helpers stay private');
set local role anon;
select throws_ok($$select public.msrc_staff_checkin_roster('synthetic-fallback',current_date)$$,'42501',null,'Anonymous cannot export a roster');
select throws_ok($$select public.msrc_staff_checkin_offline_import('synthetic-fallback',current_date,gen_random_uuid(),'[]'::jsonb)$$,'42501',null,'Anonymous cannot import');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-fallback');
do $$declare n integer;begin for n in 8101..8106 loop perform pg_temp.registration_fixture(n,'synthetic-fallback');end loop;end$$;
select pg_temp.registration_staff_fixture(8201,'synthetic-fallback');
select pg_temp.registration_staff_fixture(8202,'synthetic-fallback','checkInStaff');
select pg_temp.registration_staff_fixture(8203,'synthetic-fallback','registrationWorkshopAdministrator');
do $$declare n integer;begin for n in 8101..8106 loop perform pg_temp.registration_submit('synthetic-fallback',n,md5(n::text)||md5(n::text));end loop;end$$;
update msrc_registration.requests set status='approved' where edition_key='synthetic-fallback';
update msrc_registration.requests set status='cancelled' where actor_id=pg_temp.registration_actor(8102);
update msrc_registration.requests set status='approved_awaiting_payment',payment_due_at=clock_timestamp()+interval '1 hour' where actor_id=pg_temp.registration_actor(8103);
update msrc_authorization.account_access set state='suspended' where actor_id=pg_temp.registration_actor(8104);

create function pg_temp.ref(n integer) returns text language sql stable as $$
 select upper(substr(replace(t.id::text,'-',''),1,12)) from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
 where r.actor_id=pg_temp.registration_actor(n) and r.edition_key='synthetic-fallback';$$;
create function pg_temp.claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);end$$;
create function pg_temp.riyadh(offset_days integer) returns date language sql volatile as $$
 select (clock_timestamp() at time zone 'Asia/Riyadh')::date+offset_days;$$;
create function pg_temp.sheet_row(n integer,clock text,recorder text default 'AK') returns jsonb language sql stable as $$
 select jsonb_build_object('reference',pg_temp.ref(n),'time',clock,'recorder',recorder);$$;
create temporary table fallback_ops(name text primary key,id uuid not null default gen_random_uuid());
insert into fallback_ops(name) values('first'),('second'),('today'),('future'),('shape');

select pg_temp.claim(8201);
select is(public.msrc_staff_registration_settings_save('synthetic-fallback',jsonb_build_object('conference_days',jsonb_build_array(pg_temp.riyadh(-1),pg_temp.riyadh(0),pg_temp.riyadh(1))),gen_random_uuid())->>'state','updated','Owner configures yesterday, today and tomorrow');

-- Permissions: only a Super Admin may export or import.
select pg_temp.claim(8202);
select is(public.msrc_staff_checkin_roster('synthetic-fallback',pg_temp.riyadh(0))->>'state','denied','Check-in staff cannot export the roster');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(0),gen_random_uuid(),jsonb_build_array(pg_temp.sheet_row(8101,'08:00')))->>'state','denied','Check-in staff cannot import offline records');
select pg_temp.claim(8203);
select is(public.msrc_staff_checkin_roster('synthetic-fallback',pg_temp.riyadh(0))->>'state','denied','Registration administrators cannot export the roster');
select pg_temp.claim(8101);
select is(public.msrc_staff_checkin_roster('synthetic-fallback',pg_temp.riyadh(0))->>'state','denied','Participants cannot export the roster');
select is((select count(*) from msrc_registration.attendance),0::bigint,'Denied calls create no attendance');

-- Roster: same entitlement as online scanning, reference and name only.
select pg_temp.claim(8201);
select is(public.msrc_staff_checkin_roster('synthetic-fallback',pg_temp.riyadh(5))->>'state','wrong_day','Roster refuses an unconfigured day');
create temporary table roster as select public.msrc_staff_checkin_roster('synthetic-fallback',pg_temp.riyadh(0)) as result;
select is((select result->>'state' from roster),'ready','Super Admin exports the roster');
select is((select array_agg(e->>'reference' order by e->>'reference') from roster,jsonb_array_elements(result->'rows') e),
 (select array_agg(pg_temp.ref(n) order by pg_temp.ref(n)) from unnest(array[8101,8105,8106]) n),'Roster lists only admissible tickets');
select ok(not exists(select 1 from roster,jsonb_array_elements(result->'rows') e where (select array_agg(k order by k) from jsonb_object_keys(e) k)<>array['name','reference']),'Roster rows carry only reference and name');
select ok((select result::text from roster) !~ '@|msrc1\.|secret|FAKE','Roster carries no email, credential or identity document');
select ok(exists(select 1 from msrc_registration.attendance_audit where event='roster_export' and result='exported' and snapshot='{"count":3}'::jsonb
 and performer_id=pg_temp.registration_actor(8201) and conference_day=pg_temp.riyadh(0)),'Roster export is audited with a count only');
-- Parity: online scanning reaches the same decision for every excluded attendee.
select pg_temp.claim(8202);
select is(public.msrc_staff_checkin('synthetic-fallback',pg_temp.ref(8102),pg_temp.riyadh(0),null)->>'state','revoked','Excluded cancelled ticket is revoked online too');
select is(public.msrc_staff_checkin('synthetic-fallback',pg_temp.ref(8103),pg_temp.riyadh(0),null)->>'state','not_approved','Excluded unpaid ticket is refused online too');
select is(public.msrc_staff_checkin('synthetic-fallback',pg_temp.ref(8104),pg_temp.riyadh(0),null)->>'state','not_approved','Excluded suspended attendee is refused online too');
select is(public.msrc_staff_checkin('synthetic-fallback',pg_temp.ref(8105),pg_temp.riyadh(-1),'Synthetic door')->>'state','checked_in','Listed attendee checks in online on day one');

-- Offline reconciliation for yesterday.
select pg_temp.claim(8201);
create temporary table first_import as select public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(-1),(select id from fallback_ops where name='first'),
 jsonb_build_array(pg_temp.sheet_row(8101,'08:30','AK'),pg_temp.sheet_row(8105,'08:40'),pg_temp.sheet_row(8102,'08:45'),pg_temp.sheet_row(8103,'08:50'),
 jsonb_build_object('reference','FFFFFFFFFFFF','time','08:55','recorder','AK'),pg_temp.sheet_row(8106,'25:00'),pg_temp.sheet_row(8101,'09:00'),pg_temp.sheet_row(8106,'23:59','Synthetic Volunteer'),
 pg_temp.sheet_row(8104,'09:10'))) as result;
select is((select result->>'state' from first_import),'ready','Super Admin reconciles an offline sheet');
select is((select result->'outcomes' from first_import),'["checked_in","already_checked_in","revoked","not_approved","not_found","invalid","already_checked_in","checked_in","not_approved"]'::jsonb,'Each row receives the online entitlement outcome');
select is((select result->'counts' from first_import),'{"invalid":1,"revoked":1,"not_found":1,"checked_in":2,"not_approved":2,"already_checked_in":2}'::jsonb,'Outcome counts are returned');
select is((select row(method,performer_id,offline_recorder,checked_in_at)::text from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
 where upper(substr(replace(t.id::text,'-',''),1,12))=pg_temp.ref(8101) and a.conference_day=pg_temp.riyadh(-1)),
 row('offline',pg_temp.registration_actor(8201),'AK',(pg_temp.riyadh(-1)+time '08:30') at time zone 'Asia/Riyadh')::text,'Offline row keeps method, uploader, recorder and Riyadh paper time');
select is((select row(method,performer_id,entry_point,offline_recorder)::text from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
 where upper(substr(replace(t.id::text,'-',''),1,12))=pg_temp.ref(8105) and a.conference_day=pg_temp.riyadh(-1)),
 row('manual_code',pg_temp.registration_actor(8202),'Synthetic door',null::text)::text,'Online attendance is never overwritten');
select is((select count(*) from msrc_registration.attendance where conference_day=pg_temp.riyadh(-1)),3::bigint,'Duplicates and refused rows add no attendance');
select ok((select checked_in_at from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
 where upper(substr(replace(t.id::text,'-',''),1,12))=pg_temp.ref(8106) and a.conference_day=pg_temp.riyadh(-1))
 =(pg_temp.riyadh(-1)+time '23:59') at time zone 'Asia/Riyadh','Late paper time stays on its conference day');
select is((select count(*) from msrc_registration.attendance_audit where event='offline_import' and snapshot->>'operationId'=(select id::text from fallback_ops where name='first')),9::bigint,'Every row is audited');
select ok(not exists(select 1 from msrc_registration.attendance_audit where to_jsonb(attendance_audit)::text like '%FFFFFFFFFFFF%'),'Unknown references are not retained');
select ok(exists(select 1 from msrc_registration.offline_imports where operation_id=(select id from fallback_ops where name='first') and row_count=9
 and counts=(select result->'counts' from first_import) and outcomes::text !~ '[A-F0-9]{12}'),'Receipt stores counts and outcomes without references');
select is(public.msrc_staff_attendance_summary('synthetic-fallback',pg_temp.riyadh(-1))->'counts','{"checkedIn":3,"scan":0,"manualCode":1,"offline":2}'::jsonb,'Running counts separate offline records');

-- Idempotency.
create temporary table replay as select public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(-1),(select id from fallback_ops where name='first'),
 jsonb_build_array(pg_temp.sheet_row(8101,'08:30'),pg_temp.sheet_row(8105,'08:40'),pg_temp.sheet_row(8102,'08:45'),pg_temp.sheet_row(8103,'08:50'),
 jsonb_build_object('reference','FFFFFFFFFFFF','time','08:55','recorder','AK'),pg_temp.sheet_row(8106,'25:00'),pg_temp.sheet_row(8101,'09:00'),pg_temp.sheet_row(8106,'23:59'),pg_temp.sheet_row(8104,'09:10'))) as result;
select is((select result->>'state' from replay),'replayed','Replaying the batch ID is recognized');
select is((select result-'state' from replay),(select result-'state' from first_import),'Replay returns the saved outcomes and counts');
select is((select count(*) from msrc_registration.attendance_audit where event='offline_import'),9::bigint,'Replay adds no audit or attendance');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(-1),(select id from fallback_ops where name='first'),jsonb_build_array(pg_temp.sheet_row(8101,'08:30')))->>'state','conflict','A batch ID cannot be reused for different rows');
select pg_temp.claim(8201);

-- Online scanning recognizes an offline record.
select pg_temp.claim(8202);
select is(public.msrc_staff_checkin('synthetic-fallback',pg_temp.ref(8101),pg_temp.riyadh(-1),null)#>>'{attendance,method}','offline','Online scan reports the offline record without duplicating it');
select pg_temp.claim(8201);
select is(public.msrc_staff_checkin_undo('synthetic-fallback',(select a.id from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
 where upper(substr(replace(t.id::text,'-',''),1,12))=pg_temp.ref(8101) and a.conference_day=pg_temp.riyadh(-1)),'Synthetic paper error')->>'state','undone','Super Admin can undo an offline record');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(-1),(select id from fallback_ops where name='second'),jsonb_build_array(pg_temp.sheet_row(8101,'08:30')))->'outcomes','["previously_undone"]'::jsonb,'An undone record is listed for review, not restored');
select pg_temp.claim(8202);
select is(public.msrc_staff_checkin('synthetic-fallback',pg_temp.ref(8101),pg_temp.riyadh(-1),null)#>>'{attendance,method}','manual_code','A later online check-in restores attendance');
select ok((select offline_recorder is null from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
 where upper(substr(replace(t.id::text,'-',''),1,12))=pg_temp.ref(8101) and a.conference_day=pg_temp.riyadh(-1)),'Online re-entry clears the offline recorder');

-- Time and shape bounds.
select pg_temp.claim(8201);
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(0),(select id from fallback_ops where name='today'),jsonb_build_array(pg_temp.sheet_row(8106,'23:59:59')))->'outcomes','["checked_in"]'::jsonb,'Today can be reconciled');
select ok((select checked_in_at<=clock_timestamp() from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
 where upper(substr(replace(t.id::text,'-',''),1,12))=pg_temp.ref(8106) and a.conference_day=pg_temp.riyadh(0)),'Recorded times are never in the future');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(1),(select id from fallback_ops where name='future'),jsonb_build_array(pg_temp.sheet_row(8105,'08:00')))->>'state','wrong_day','A day that has not started cannot be reconciled');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(5),gen_random_uuid(),jsonb_build_array(pg_temp.sheet_row(8105,'08:00')))->>'state','wrong_day','An unconfigured day cannot be reconciled');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(0),(select id from fallback_ops where name='shape'),
 '[5,{"reference":"A1B2C3D4E5F6"},{"reference":"A1B2C3D4E5F6","time":"08:00","recorder":"AK","extra":1}]'::jsonb)->'outcomes','["invalid","invalid","invalid"]'::jsonb,'Malformed rows are listed, never applied');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(0),gen_random_uuid(),'[]'::jsonb)->>'state','invalid','An empty batch is refused');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(0),gen_random_uuid(),(select jsonb_agg(pg_temp.sheet_row(8105,'08:00')) from generate_series(1,2001)))->>'state','invalid','More than 2000 rows are refused');
select is(public.msrc_staff_checkin_offline_import('synthetic-fallback',pg_temp.riyadh(0),null,jsonb_build_array(pg_temp.sheet_row(8105,'08:00')))->>'state','invalid','A batch ID is required');
select throws_ok($$update msrc_registration.offline_imports set row_count=1$$,'55000',null,'Import receipts are append-only');
select throws_ok($$insert into msrc_registration.attendance(ticket_id,conference_day,performer_id,method) select t.id,date '2040-01-01',pg_temp.registration_actor(8201),'offline' from msrc_registration.tickets t limit 1$$,
 '23514',null,'Storage cannot hold an offline row without a recorder');
select * from finish();
rollback;
