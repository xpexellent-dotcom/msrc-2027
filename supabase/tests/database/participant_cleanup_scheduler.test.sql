-- AUTH-08 / PRV-02/04/05/08 / ORG-041. Synthetic, disposable fixtures only.
-- Settings, cron definitions/history, identities and the temporary role all roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select is((select enabled from msrc_participant.policy),false,'Participant accounts are still closed after scheduler installation');
select is((select enabled from msrc_participant.retention_policy),false,'The scheduler does not activate retention');
select is((select count(*) from msrc_participant.scheduler_settings),1::bigint,'Exactly one private scheduler settings row is seeded');
select is((select cleanup_batch_size from msrc_participant.scheduler_settings),100,'The proposed cleanup default is a modest bounded batch');
select is((select cron_history_days from msrc_participant.scheduler_settings),7,'The proposed cron history default is seven days');
select ok((select cleanup_schedule='0 0 * * *' and staff_purge_schedule='15 * * * *' and history_purge_schedule='30 0 * * *'
 from msrc_participant.scheduler_settings),'Daily cleanup, hourly staff purge and daily history purge defaults are recorded privately');
select is((select count(*) from cron.job where jobname in
 ('msrc-participant-unverified-cleanup','msrc-staff-abuse-purge','msrc-cron-history-purge')),3::bigint,'All three named jobs exist');
select ok((select bool_and(username='postgres' and database=current_database() and active) from cron.job where jobname in
 ('msrc-participant-unverified-cleanup','msrc-staff-abuse-purge','msrc-cron-history-purge')),'All three jobs run as postgres in this database');
select ok((select bool_and(j.schedule=case j.jobname when 'msrc-participant-unverified-cleanup' then s.cleanup_schedule
 when 'msrc-staff-abuse-purge' then s.staff_purge_schedule else s.history_purge_schedule end)
 from cron.job j cross join msrc_participant.scheduler_settings s where j.jobname in
 ('msrc-participant-unverified-cleanup','msrc-staff-abuse-purge','msrc-cron-history-purge')),'Installed cadences match the private settings');
select is((select regexp_replace(command,'\s','','g') from cron.job where jobname='msrc-participant-unverified-cleanup'),
 'selectmsrc_participant.run_cleanup_job();','The scheduled cleanup uses the guarded aggregate worker wrapper');
select is((select regexp_replace(command,'\s','','g') from cron.job where jobname='msrc-staff-abuse-purge'),
 'selectmsrc_participant.purge_staff_abuse();','The staff job calls only the private purge');
select is((select regexp_replace(command,'\s','','g') from cron.job where jobname='msrc-cron-history-purge'),
 'selectmsrc_participant.purge_cron_history();','The history job calls only the private purge');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_participant' and c.relname in('scheduler_settings','retention_ledger')
 and (not c.relrowsecurity or not c.relforcerowsecurity)),'Scheduler settings and receipts force RLS');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join(values('anon'),('authenticated'),('service_role'),('supabase_auth_admin')) r(name)
 where n.nspname='msrc_participant' and c.relname in('scheduler_settings','retention_ledger')
 and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'Client and native API credentials cannot read or forge settings or receipts');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='msrc_participant' and p.proname in
 ('run_cleanup_job','purge_staff_abuse','purge_cron_history','scheduler_health','export_retention_ledger')
 and (p.prosecdef or p.proowner<>'postgres'::regrole or not coalesce(p.proconfig @> array['search_path=""'],false))),
 'Every operator function is a postgres-owned invoker with an empty search path');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 cross join lateral aclexplode(p.proacl) a where n.nspname='msrc_participant' and p.proname in
 ('run_cleanup_job','purge_staff_abuse','purge_cron_history','scheduler_health','export_retention_ledger')
 and (a.grantee=0 or a.grantee in('anon'::regrole,'authenticated'::regrole,'service_role'::regrole,'supabase_auth_admin'::regrole))),
 'PUBLIC and API roles have no operator-function grants');

create temporary table scheduler_defaults as select * from msrc_participant.scheduler_settings;
update msrc_participant.scheduler_settings set cleanup_schedule='5 1 * * *',staff_purge_schedule='25 * * * *',history_purge_schedule='35 1 * * *';
select ok((select bool_and(j.schedule=case j.jobname when 'msrc-participant-unverified-cleanup' then s.cleanup_schedule
 when 'msrc-staff-abuse-purge' then s.staff_purge_schedule else s.history_purge_schedule end and j.username='postgres')
 from cron.job j cross join msrc_participant.scheduler_settings s where j.jobname in
 ('msrc-participant-unverified-cleanup','msrc-staff-abuse-purge','msrc-cron-history-purge')),'An operator settings update reschedules the existing postgres jobs');
select is((select count(*) from cron.job where jobname in
 ('msrc-participant-unverified-cleanup','msrc-staff-abuse-purge','msrc-cron-history-purge')),3::bigint,'Rescheduling creates no duplicate jobs');
update msrc_participant.scheduler_settings s set cleanup_schedule=d.cleanup_schedule,staff_purge_schedule=d.staff_purge_schedule,
 history_purge_schedule=d.history_purge_schedule from scheduler_defaults d;
select throws_ok($$update msrc_participant.scheduler_settings set cleanup_batch_size=0$$,'23514',null,'A zero cleanup batch is rejected');
select throws_ok($$update msrc_participant.scheduler_settings set cleanup_batch_size=1001$$,'23514',null,'An oversized cleanup batch is rejected');
select throws_ok($$update msrc_participant.scheduler_settings set cron_history_days=0$$,'23514',null,'A zero history retention period is rejected');

-- Actual runtime denials accompany ACL inspection; settings and receipts stay private.
set local role anon;
select throws_ok($$select msrc_participant.scheduler_health()$$,'42501',null,'Anonymous callers cannot inspect scheduler health');
select throws_ok($$select msrc_participant.export_retention_ledger()$$,'42501',null,'Anonymous callers cannot export receipts');
select throws_ok($$select msrc_participant.run_cleanup_job()$$,'42501',null,'Anonymous callers cannot run cleanup');
select throws_ok($$select msrc_participant.cleanup_unverified(100,false)$$,'42501',null,'Anonymous callers cannot invoke the underlying worker');
select throws_ok($$select msrc_participant.purge_staff_abuse()$$,'42501',null,'Anonymous callers cannot purge staff counters');
select throws_ok($$select msrc_participant.purge_cron_history()$$,'42501',null,'Anonymous callers cannot purge job history');
reset role;
set local role authenticated;
select throws_ok($$select msrc_participant.scheduler_health()$$,'42501',null,'Authenticated callers cannot inspect scheduler health');
select throws_ok($$select msrc_participant.export_retention_ledger()$$,'42501',null,'Authenticated callers cannot export receipts');
select throws_ok($$select msrc_participant.run_cleanup_job()$$,'42501',null,'Authenticated callers cannot run cleanup');
select throws_ok($$select msrc_participant.cleanup_unverified(100,false)$$,'42501',null,'Authenticated callers cannot invoke the underlying worker');
select throws_ok($$select msrc_participant.purge_staff_abuse()$$,'42501',null,'Authenticated callers cannot purge staff counters');
select throws_ok($$select msrc_participant.purge_cron_history()$$,'42501',null,'Authenticated callers cannot purge job history');
reset role;
set local role service_role;
select throws_ok($$select msrc_participant.scheduler_health()$$,'42501',null,'Service credentials cannot inspect scheduler health');
select throws_ok($$select msrc_participant.export_retention_ledger()$$,'42501',null,'Service credentials cannot export receipts');
select throws_ok($$select msrc_participant.run_cleanup_job()$$,'42501',null,'Service credentials cannot run cleanup');
select throws_ok($$select msrc_participant.cleanup_unverified(100,false)$$,'42501',null,'Service credentials cannot invoke the underlying worker');
select throws_ok($$select msrc_participant.purge_staff_abuse()$$,'42501',null,'Service credentials cannot purge staff counters');
select throws_ok($$select msrc_participant.purge_cron_history()$$,'42501',null,'Service credentials cannot purge job history');
reset role;

-- Temporary EXECUTE/USAGE grants reach the explicit current_user guard rather
-- than merely failing schema/ACL access. All grants and this role roll back.
-- Supabase's local postgres is NOSUPERUSER, so do not use SESSION AUTHORIZATION.
create role scheduler_session_probe noinherit nologin nosuperuser;
grant scheduler_session_probe to postgres;
grant usage on schema public,extensions to scheduler_session_probe;
grant usage on schema msrc_participant to scheduler_session_probe;
grant execute on function msrc_participant.scheduler_health(),msrc_participant.export_retention_ledger(timestamptz),
 msrc_participant.run_cleanup_job(),
 msrc_participant.purge_staff_abuse(),msrc_participant.purge_cron_history() to scheduler_session_probe;
set local role scheduler_session_probe;
select throws_ok($$select msrc_participant.scheduler_health()$$,'42501','Native scheduler health operator required.',
 'An accidental EXECUTE grant still cannot bypass the native health operator guard');
select throws_ok($$select msrc_participant.export_retention_ledger()$$,'42501','Native ledger export operator required.',
 'An accidental EXECUTE grant still cannot bypass the native ledger operator guard');
select throws_ok($$select msrc_participant.run_cleanup_job()$$,'42501','Native cleanup operator required.',
 'An accidental EXECUTE grant still cannot bypass the native cleanup operator guard');
select throws_ok($$select msrc_participant.purge_staff_abuse()$$,'42501','Native purge operator required.',
 'An accidental EXECUTE grant still cannot bypass the native staff purge guard');
select throws_ok($$select msrc_participant.purge_cron_history()$$,'42501','Native history purge operator required.',
 'An accidental EXECUTE grant still cannot bypass the native history purge guard');
reset role;

create function pg_temp.scheduler_actor(n integer) returns uuid language sql immutable as $$
 select ('ca100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;$$;
create function pg_temp.scheduler_admission(n integer) returns uuid language sql immutable as $$
 select ('ca200000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;$$;
create function pg_temp.scheduler_email(n integer) returns text language sql immutable as $$
 select 'scheduler-fixture-'||n::text||'@example.invalid';$$;
create function pg_temp.scheduler_fixture(n integer,age interval) returns uuid language plpgsql as $$
 declare actor uuid:=pg_temp.scheduler_actor(n);begin
 if public.msrc_participant_signup_reserve(actor,pg_temp.scheduler_admission(n),pg_temp.scheduler_email(n),
  'Synthetic scheduler adult','synthetic-scheduler-notice',true)->>'state'<>'reserved' then
  raise exception 'Synthetic scheduler admission failed';end if;
 insert into auth.users(id,email,encrypted_password,created_at,updated_at,is_anonymous,raw_app_meta_data)
  values(actor,pg_temp.scheduler_email(n),'synthetic-native-hash',clock_timestamp()-age,clock_timestamp(),false,
  '{"provider":"email","providers":["email"]}');
 return actor;end$$;
update msrc_participant.policy set enabled=true,privacy_version='synthetic-scheduler-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
select pg_temp.scheduler_fixture(1,interval '31 days');
select pg_temp.scheduler_fixture(2,interval '29 days');
select pg_temp.scheduler_fixture(4,interval '40 days');
select pg_temp.scheduler_fixture(5,interval '31 days');
insert into msrc_participant.retention_holds(actor_id,reason) values(pg_temp.scheduler_actor(5),'legal');
-- Historical native proof is synthetic; no admission or provider request is made.
insert into auth.users(id,email,encrypted_password,email_confirmed_at,created_at,updated_at,is_anonymous)
 values(pg_temp.scheduler_actor(3),pg_temp.scheduler_email(3),'synthetic-historical-hash',
 now()-interval '99 days',now()-interval '100 days',now(),false);
insert into msrc_participant.profiles(actor_id,name,privacy_version,state)
 values(pg_temp.scheduler_actor(3),'Synthetic historical verified','synthetic-scheduler-notice','pending');
select is((select count(*) from msrc_participant.retention_ledger where actor_id=pg_temp.scheduler_actor(3) and event='ever_verified'),
 1::bigint,'An interrupted native-confirmed account receives one ever-verified receipt');
update msrc_participant.retention_policy set enabled=false;
create temporary table closed_cleanup as select msrc_participant.run_cleanup_job() as value;
select is((select value from closed_cleanup),'{"state":"closed","scanned":0,"eligible":0,"deleted":0,"held":0,"failed":0}'::jsonb,
 'The scheduled cleanup is a closed aggregate-only no-op with retention disabled');
select is((select count(*) from auth.users where id in(pg_temp.scheduler_actor(1),pg_temp.scheduler_actor(2),pg_temp.scheduler_actor(3),
 pg_temp.scheduler_actor(4),pg_temp.scheduler_actor(5))),5::bigint,'Disabled scheduled cleanup deletes no synthetic account');
select is((select count(*) from msrc_participant.cleanup_jobs),0::bigint,'Disabled cleanup creates no erasure evidence');
update msrc_participant.retention_policy set enabled=true;
create temporary table cleanup_preview as select msrc_participant.cleanup_unverified(100,true) as value;
select is((select value->>'state' from cleanup_preview),'preview','Explicit dry-run reports preview');
select is((select value->>'eligible' from cleanup_preview),'2','Dry-run sees only the two old unverified accounts without a hold');
select is((select value->>'held' from cleanup_preview),'1','The retained legal exception is held');
select is((select value->>'deleted' from cleanup_preview),'0','Dry-run reports zero deletion');
select is((select array_agg(k order by k) from cleanup_preview cross join lateral jsonb_object_keys(value) k),
 array['deleted','eligible','failed','held','scanned','state'],'Dry-run returns only state and aggregate counts');
select ok((select bool_and(jsonb_typeof(value->k)='number') from cleanup_preview
 cross join(values('scanned'),('eligible'),('deleted'),('held'),('failed')) numeric_key(k)),'All dry-run measures are numeric counts');
select is((select count(*) from auth.users where id in(pg_temp.scheduler_actor(1),pg_temp.scheduler_actor(2),pg_temp.scheduler_actor(3),
 pg_temp.scheduler_actor(4),pg_temp.scheduler_actor(5))),5::bigint,'Dry-run leaves every synthetic native identity intact');
select is((select count(*) from msrc_participant.cleanup_jobs),0::bigint,'Dry-run leaves no cleanup job');
select is((select count(*) from msrc_participant.retention_ledger where event='account_erased'),0::bigint,'Dry-run creates no deletion receipt');
update msrc_participant.scheduler_settings set cleanup_batch_size=1;
select is(msrc_participant.run_cleanup_job()->>'deleted','1','The scheduled worker respects the private one-account batch');
select ok(not exists(select 1 from auth.users where id=pg_temp.scheduler_actor(4))
 and exists(select 1 from auth.users where id=pg_temp.scheduler_actor(1)),'The oldest eligible account is removed before the next batch');
update msrc_participant.scheduler_settings set cleanup_batch_size=100;
select is(msrc_participant.run_cleanup_job()->>'deleted','1','A later enabled batch erases the remaining old unverified eligible account');
select ok(not exists(select 1 from auth.users where id in(pg_temp.scheduler_actor(1),pg_temp.scheduler_actor(4)))
 and (select count(*) from auth.users where id in(pg_temp.scheduler_actor(2),pg_temp.scheduler_actor(3),pg_temp.scheduler_actor(5)))=3,
 'Young unverified, ever-verified and held accounts survive enabled scheduled cleanup');
select is(msrc_participant.run_cleanup_job()->>'deleted','0','Scheduled replay does not create a second erasure');

create temporary table exported_receipts as select * from msrc_participant.export_retention_ledger();
select is((select array_agg(attname::text order by attnum) from pg_attribute where attrelid='pg_temp.exported_receipts'::regclass
 and attnum>0 and not attisdropped),array['actor_id','event','occurred_at'],'Export contains exactly the three allowed pseudonymous receipt fields');
select is((select array_agg(format_type(atttypid,atttypmod) order by attnum) from pg_attribute
 where attrelid='pg_temp.exported_receipts'::regclass and attnum>0 and not attisdropped),
 array['uuid','text','timestamp with time zone'],'Receipt fields have UUID, event and timestamp types');
select is((select count(*) from exported_receipts where actor_id in(pg_temp.scheduler_actor(1),pg_temp.scheduler_actor(4)) and event='account_erased'),
 2::bigint,'The operator export includes exactly one receipt for each committed deletion');
select is((select count(*) from exported_receipts where actor_id=pg_temp.scheduler_actor(3) and event='ever_verified'),
 1::bigint,'The operator export preserves ever-verified evidence for the retained actor');
select is((select count(*) from exported_receipts where actor_id in(pg_temp.scheduler_actor(2),pg_temp.scheduler_actor(5))),
 0::bigint,'Young pending and legally held actors have no invented verification or deletion receipt');
select ok(not exists(select 1 from exported_receipts r where r.event='account_erased' and not exists(select 1
 from msrc_participant.subject_refs s where s.actor_id=r.actor_id and s.erased_at=r.occurred_at)),
 'Deletion receipt times match the committed immutable tombstone');
select is((select count(*) from msrc_participant.export_retention_ledger((select occurred_at from exported_receipts
 where actor_id=pg_temp.scheduler_actor(4) and event='account_erased')) where actor_id=pg_temp.scheduler_actor(4) and event='account_erased'),
 1::bigint,'The export cutoff is inclusive so a checkpoint timestamp cannot lose its receipt');
select is((select count(*) from msrc_participant.export_retention_ledger(clock_timestamp()+interval '1 day')),
 0::bigint,'A future export checkpoint returns no receipt');
select ok(not exists(select actor_id,event from exported_receipts group by actor_id,event having count(*)>1),
 'Repeated cleanup/observation never duplicate an actor event');
select throws_ok($$update msrc_participant.retention_ledger set occurred_at=clock_timestamp() where actor_id=pg_temp.scheduler_actor(1)$$,
 '55000',null,'Receipt timestamps cannot be rewritten');
select throws_ok($$delete from msrc_participant.retention_ledger where actor_id=pg_temp.scheduler_actor(1)$$,
 '55000',null,'Deletion receipts cannot be deleted');
select throws_ok($$truncate msrc_participant.retention_ledger$$,'55000',null,'Receipt history cannot be truncated');
select throws_ok($$insert into msrc_participant.retention_ledger(actor_id,event,occurred_at)
 values(pg_temp.scheduler_actor(2),'ever_verified',clock_timestamp())$$,'42501',null,
 'An operator cannot invent ever-verified evidence for an unverified account');
select throws_ok($$insert into msrc_participant.retention_ledger(actor_id,event,occurred_at)
 values(pg_temp.scheduler_actor(5),'account_erased',clock_timestamp())$$,'42501',null,
 'An operator cannot invent a deletion receipt for a held account');

-- A real worker failure must roll back its receipt as well as its native deletion.
select pg_temp.scheduler_fixture(6,interval '31 days');
select pg_temp.scheduler_fixture(7,interval '40 days');
create function pg_temp.reject_scheduler_erasure() returns trigger language plpgsql as $$begin
 if old.actor_id=pg_temp.scheduler_actor(6) then raise exception using errcode='55000',message='Synthetic deletion failure';end if;
 return old;end$$;
create trigger zz_synthetic_scheduler_failure before delete on msrc_participant.profiles
 for each row execute function pg_temp.reject_scheduler_erasure();
select throws_ok($$select msrc_participant.run_cleanup_job()$$,'55000','Cleanup batch failed; changes rolled back.',
 'A failed scheduled actor erasure fails the cron command with a constant non-personal error');
select is((select count(*) from msrc_participant.retention_ledger where actor_id=pg_temp.scheduler_actor(6)),0::bigint,
 'An interrupted atomic deletion creates no outside-ledger receipt');
select ok(exists(select 1 from auth.users where id=pg_temp.scheduler_actor(6))
 and exists(select 1 from msrc_participant.subject_refs where actor_id=pg_temp.scheduler_actor(6) and erased_at is null),
 'Failed cleanup preserves the complete native identity and unerased subject');
select is((select count(*) from msrc_participant.cleanup_jobs where actor_id=pg_temp.scheduler_actor(6)),0::bigint,
 'A scheduled batch failure rolls back its bounded per-actor worker evidence as well as deletion');
select ok(exists(select 1 from auth.users where id=pg_temp.scheduler_actor(7))
 and not exists(select 1 from msrc_participant.retention_ledger where actor_id=pg_temp.scheduler_actor(7)),
 'A later actor failure also rolls back the earlier successful actor deletion and its receipt');
drop trigger zz_synthetic_scheduler_failure on msrc_participant.profiles;
select is(msrc_participant.run_cleanup_job()->>'deleted','2','A fresh successful batch retry completes both actor deletions');
select is((select count(*) from msrc_participant.retention_ledger where actor_id=pg_temp.scheduler_actor(6) and event='account_erased'),
 1::bigint,'Only the committed retry contributes one deletion receipt');

-- Keep the exact cutoff fixture and its purge in the SAME statement. The function
-- uses statement_timestamp(), avoiding a test that races the wall clock by microseconds.
create function pg_temp.staff_purge_fixture() returns jsonb language plpgsql as $$begin
 insert into msrc_staff.limit_events(id,kind,subject_hash,occurred_at) values
 ('ca300000-0000-4000-8000-000000000001','login',repeat('a',64),statement_timestamp()-interval '24 hours 1 microsecond'),
 ('ca300000-0000-4000-8000-000000000002','login',repeat('b',64),statement_timestamp()-interval '24 hours'),
 ('ca300000-0000-4000-8000-000000000003','form',repeat('c',64),statement_timestamp()-interval '23 hours');
 insert into msrc_staff.login_attempts(id,email_hash,ip_hash,created_at,state) values
 ('ca400000-0000-4000-8000-000000000001',repeat('a',64),repeat('d',64),statement_timestamp()-interval '24 hours 1 microsecond','denied'),
 ('ca400000-0000-4000-8000-000000000002',repeat('b',64),repeat('e',64),statement_timestamp()-interval '24 hours','pending'),
 ('ca400000-0000-4000-8000-000000000003',repeat('c',64),repeat('f',64),statement_timestamp()-interval '23 hours','admitted');
 return msrc_participant.purge_staff_abuse();end$$;
create temporary table staff_purge_result as select pg_temp.staff_purge_fixture() as value;
select is((select value from staff_purge_result),'{"limitEvents":1,"loginAttempts":1}'::jsonb,
 'Staff purge reports only removed aggregate counts');
select ok(not exists(select 1 from msrc_staff.limit_events where id='ca300000-0000-4000-8000-000000000001')
 and not exists(select 1 from msrc_staff.login_attempts where id='ca400000-0000-4000-8000-000000000001'),
 'Both staff abuse tables remove a row strictly older than twenty-four hours');
select is((select count(*) from msrc_staff.limit_events where id in
 ('ca300000-0000-4000-8000-000000000002','ca300000-0000-4000-8000-000000000003')),2::bigint,
 'Staff limit events at the exact boundary and within twenty-four hours remain');
select is((select count(*) from msrc_staff.login_attempts where id in
 ('ca400000-0000-4000-8000-000000000002','ca400000-0000-4000-8000-000000000003')),2::bigint,
 'Staff login attempts at the exact boundary and within twenty-four hours remain');

select cron.schedule('msrc-synthetic-scheduler-health','0 0 1 1 *','select 1;');
select cron.schedule('msrc-synthetic-no-history','0 0 1 1 *','select 1;');
select cron.schedule('synthetic-unrelated-history','0 0 1 1 *','select 1;');
insert into cron.job_run_details(jobid,runid,database,username,command,status,return_message,start_time,end_time)
 select j.jobid,991013000001,current_database(),'postgres','select ''private@example.invalid'';',
 'succeeded','Synthetic personal detail must never be exported',statement_timestamp()-interval '2 hours',statement_timestamp()-interval '2 hours'+interval '1 minute'
 from cron.job j where j.jobname='msrc-synthetic-scheduler-health';
insert into cron.job_run_details(jobid,runid,database,username,command,status,return_message,start_time,end_time)
 select j.jobid,991013000002,current_database(),'postgres','select ''private@example.invalid'';',
 'failed','Synthetic private failure detail',statement_timestamp()-interval '1 hour',statement_timestamp()-interval '1 hour'+interval '1 minute'
 from cron.job j where j.jobname='msrc-synthetic-scheduler-health';
insert into cron.job_run_details(jobid,runid,database,username,command,status,return_message,start_time,end_time)
 select j.jobid,991013000003,current_database(),'postgres','select 1;',
 'failed','Synthetic older failure',statement_timestamp()-interval '25 hours',statement_timestamp()-interval '25 hours'+interval '1 minute'
 from cron.job j where j.jobname='msrc-synthetic-scheduler-health';
create temporary table health_result as select * from msrc_participant.scheduler_health();
select is((select count(*) from health_result),(select count(*) from cron.job where jobname like 'msrc-%'),
 'Health covers every msrc job including Contact and jobs without runs');
select is((select array_agg(attname::text order by attnum) from pg_attribute where attrelid='pg_temp.health_result'::regclass
 and attnum>0 and not attisdropped),array['job_name','last_run','last_success','failures_last_24h'],
 'Health exposes exactly job name, last run, last success and aggregate failure count');
select is((select last_run from health_result where job_name='msrc-synthetic-scheduler-health'),
 (select start_time from cron.job_run_details where runid=991013000002),'Health reports the latest run timestamp');
select is((select last_success from health_result where job_name='msrc-synthetic-scheduler-health'),
 (select end_time from cron.job_run_details where runid=991013000001),'Health reports the last successful completion timestamp');
select is((select failures_last_24h from health_result where job_name='msrc-synthetic-scheduler-health'),1::bigint,
 'Health counts recent failures and excludes failures older than twenty-four hours');
select ok((select last_run is null and last_success is null and failures_last_24h=0 from health_result where job_name='msrc-synthetic-no-history'),
 'A job with no retained history is represented by null timestamps and zero failures');
select ok(not exists(select 1 from health_result where job_name='synthetic-unrelated-history'),
 'Operator health does not include unrelated jobs');
select ok(not exists(select 1 from health_result r where to_jsonb(r)::text like '%private@example.invalid%'
 or to_jsonb(r)::text like '%Synthetic private%'),'Health never exposes command or provider/exception messages');

create function pg_temp.history_purge_fixture() returns integer language plpgsql as $$
 declare days integer;begin
 select cron_history_days into days from msrc_participant.scheduler_settings;
 insert into cron.job_run_details(jobid,runid,database,username,command,status,start_time,end_time)
 select j.jobid,v.runid,current_database(),'postgres','select 1;',v.status,
 statement_timestamp()-make_interval(days=>days)-interval '1 hour',v.ended
 from cron.job j cross join(values
 (991013000004::bigint,'succeeded',statement_timestamp()-make_interval(days=>days)-interval '1 microsecond'),
 (991013000005::bigint,'failed',statement_timestamp()-make_interval(days=>days)),
 (991013000006::bigint,'succeeded',statement_timestamp()-make_interval(days=>days)+interval '1 microsecond'),
 (991013000007::bigint,'running',null::timestamptz)) v(runid,status,ended)
 where j.jobname='msrc-synthetic-scheduler-health';
 insert into cron.job_run_details(jobid,runid,database,username,command,status,start_time,end_time)
 select j.jobid,991013000008,current_database(),'postgres','select 1;','failed',
 statement_timestamp()-make_interval(days=>days)-interval '1 hour',statement_timestamp()-make_interval(days=>days)-interval '1 microsecond'
 from cron.job j where j.jobname='synthetic-unrelated-history';
 return msrc_participant.purge_cron_history();end$$;
update msrc_participant.scheduler_settings set cron_history_days=2;
create temporary table history_purge_result as select pg_temp.history_purge_fixture() as removed;
select is((select removed from history_purge_result),2,'History purge removes only expired terminal rows across job names');
select ok(not exists(select 1 from cron.job_run_details where runid in(991013000004,991013000008)),
 'Old terminal history is removed for both msrc and unrelated jobs');
select is((select count(*) from cron.job_run_details where runid in(991013000005,991013000006)),2::bigint,
 'History at the exact N-day boundary and recent terminal history remain');
select ok(exists(select 1 from cron.job_run_details where runid=991013000007 and status='running'),
 'An old in-progress job history row remains observable');
select is((select count(*) from cron.job_run_details where runid in(991013000001,991013000002,991013000003)),3::bigint,
 'Health evidence newer than the history retention limit remains');
select ok(exists(select 1 from auth.users where id=pg_temp.scheduler_actor(2))
 and exists(select 1 from msrc_participant.profiles where actor_id=pg_temp.scheduler_actor(3)),
 'Housekeeping purges never erase participant identities or profiles');

select * from finish();
rollback;
