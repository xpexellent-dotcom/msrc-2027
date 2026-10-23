-- ORG-062 / ENG-071. Disposable rollback-only retention proofs.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
select pg_temp.registration_settings('synthetic-retention');
select pg_temp.registration_settings('synthetic-retention-other');
insert into msrc_announcements.announcements(id,edition_key,subject_en,subject_ar,body_en,body_ar,segments,created_by)
values('fc000000-0000-4000-8000-000000000001','synthetic-retention','Synthetic','Synthetic','Synthetic','Synthetic',array['verified_participants'],gen_random_uuid()),
('fc000000-0000-4000-8000-000000000002','synthetic-retention-other','Synthetic','Synthetic','Synthetic','Synthetic',array['verified_participants'],gen_random_uuid());
-- Large audience demonstrates bounds on actual rows. No native accounts needed
-- for the frozen historical snapshots, and every email is synthetic.
do $$declare a msrc_announcements.announcements%rowtype;p jsonb;begin
 select * into a from msrc_announcements.announcements where edition_key='synthetic-retention';
 select jsonb_build_object('total',501,'recipients',jsonb_agg(jsonb_build_object('actorId',gen_random_uuid(),'email','synthetic-'||n||'@example.invalid'))) into p from generate_series(1,501) n;
 perform msrc_announcements.publish(a,p);
 insert into msrc_announcements.operations(edition_key,actor_id,operation_id,announcement_id,input_hash)
 values(a.edition_key,gen_random_uuid(),gen_random_uuid(),a.id,sha256('synthetic'::bytea));
end$$;
select is((msrc_announcements.purge_retained('synthetic-retention')->>'announcements')::integer,0,'Unset days purge nothing');
update msrc_registration.settings set conference_days=array[(now() at time zone 'Asia/Riyadh')::date] where edition_key='synthetic-retention';
select is((msrc_announcements.purge_retained('synthetic-retention')->>'inbox')::integer,0,'Before one-year window nothing is deleted');
update msrc_registration.settings set conference_days=array[((now() at time zone 'Asia/Riyadh')::date-interval '1 year'+interval '1 day')::date] where edition_key='synthetic-retention';
select is((msrc_announcements.purge_retained('synthetic-retention')->>'inbox')::integer,0,'Before the final-day anniversary in Riyadh nothing is deleted');
select throws_ok($$delete from msrc_announcements.announcements where edition_key='synthetic-retention'$$,'55000',null,'Direct parent deletion denied');
select throws_ok($$delete from msrc_announcements.recipients$$,'55000',null,'Direct snapshot deletion denied');
select throws_ok($$delete from msrc_announcements.inbox$$,'55000',null,'Direct inbox deletion denied');
select throws_ok($$delete from msrc_announcements.operations$$,'55000',null,'Direct operation deletion denied');
select throws_ok($$truncate msrc_announcements.inbox$$,'55000',null,'Inbox truncate denied');
set local role authenticated;
select throws_ok($$select msrc_announcements.purge_retained('synthetic-retention')$$,'42501',null,'Participants and staff cannot call private purge');
select throws_ok($$select public.msrc_announcements_maintenance('synthetic-retention')$$,'42501',null,'Maintenance cannot be called by a client');
reset role;
update msrc_registration.settings set conference_days=array[((now() at time zone 'Asia/Riyadh')::date-interval '2 years')::date,((now() at time zone 'Asia/Riyadh')::date-interval '1 year'+interval '1 day')::date] where edition_key='synthetic-retention';
select is((msrc_announcements.purge_retained('synthetic-retention')->>'inbox')::integer,0,'Latest conference day governs, not the first');
update msrc_registration.settings set conference_days=array[((now() at time zone 'Asia/Riyadh')::date-interval '2 years')::date] where edition_key='synthetic-retention';
update msrc_registration.settings set conference_days=array[((now() at time zone 'Asia/Riyadh')::date-interval '2 years')::date] where edition_key='synthetic-retention-other';
update msrc_staff.policy set enabled=true;
update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_outbox.settings set sweeps_enabled=true;
select is(public.msrc_announcements_maintenance('synthetic-retention')#>>'{retention,inbox}','500','Existing maintenance deletes at most 500 inbox rows');
select is((select count(*) from msrc_announcements.announcements where edition_key='synthetic-retention'),1::bigint,'Parent remains until its final child is purged');
select is((select count(*) from msrc_announcements.inbox),1::bigint,'Large batch leaves exactly one inbox row');
select is((select count(*) from msrc_announcements.retention_targets),0::bigint,'Transaction capability is removed after each run');
select throws_ok($$delete from msrc_announcements.inbox$$,'55000',null,'Same transaction cannot reuse the finished purge capability');
select is(public.msrc_announcements_maintenance('synthetic-retention')#>>'{retention,announcements}','1','Next maintenance run completes parent erasure');
select is((select count(*) from msrc_announcements.recipients),0::bigint,'Recipient snapshots fully purged');
select is((select count(*) from msrc_announcements.inbox),0::bigint,'Inbox fully purged');
select is((select count(*) from msrc_announcements.operations),0::bigint,'Dependent operation pointers purged');
select is((select count(*) from msrc_announcements.announcements where edition_key='synthetic-retention-other'),1::bigint,'Other edition remains untouched');
select is((select count(*) from msrc_outbox.messages where template_key='announcement'),501::bigint,'Outbox follows its independent retention policy');
select is(public.msrc_announcements_maintenance('synthetic-retention')#>>'{retention,announcements}','0','Repeated maintenance is idempotent');
select is((select count(*) from msrc_announcements.retention_audit),2::bigint,'Only productive batches create counts-only audit receipts');
select throws_ok($$delete from msrc_announcements.retention_audit$$,'55000',null,'Retention receipts are immutable');
select * from finish();
rollback;
