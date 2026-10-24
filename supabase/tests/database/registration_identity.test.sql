-- ORG-064 / ENG-073; synthetic rollback-only identity and retention regression.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-identity');
select pg_temp.registration_settings('synthetic-identity-other');
select pg_temp.registration_fixture(1,'synthetic-identity');
select pg_temp.registration_fixture(2,'synthetic-identity');
select pg_temp.registration_fixture(3,'synthetic-identity-other');
select pg_temp.registration_staff_fixture(100,'synthetic-identity','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(101,'synthetic-identity','checkInStaff');
select pg_temp.registration_staff_fixture(102,'synthetic-identity','abstractReviewer');
select pg_temp.registration_staff_fixture(103,'synthetic-identity');
select is(msrc_registration.normalize_document('national_id','١٢٣٤٥٦٧٨٩٠'),'1234567890','Arabic-Indic national ID');
select is(msrc_registration.normalize_document('iqama','۲۳۴۵۶۷۸۹۰۱'),'2345678901','Eastern Arabic-Indic Iqama');
select is(msrc_registration.normalize_document('passport',' ab١٢٣ '),'AB123','Passport normalized uppercase and digits');
select is(msrc_registration.normalize_document('national_id','2345678901'),null::text,'National ID requires 1 prefix');
select is(msrc_registration.normalize_document('iqama','1234567890'),null::text,'Iqama requires 2 prefix');
select is(msrc_registration.normalize_document('passport','AB12'),null::text,'Passport minimum five');
select is(msrc_registration.normalize_document('passport',repeat('A',21)),null::text,'Passport maximum twenty');
select is(msrc_registration.normalize_document('passport','AB/123'),null::text,'Passport rejects punctuation');
select is(public.msrc_registration_submit('synthetic-identity',pg_temp.registration_claims(1),'national_id','2345678901','synthetic-terms')->>'state','denied','RPC validates before write');
select is(public.msrc_registration_submit('synthetic-identity',pg_temp.registration_claims(1),'national_id','١٢٣٤٥٦٧٨٩٠','synthetic-terms')->>'state','submitted','Own new request with required identity');
select is((select i.document_number from msrc_registration.identity_documents i join msrc_registration.requests r on r.id=i.request_id where r.actor_id=pg_temp.registration_actor(1)),'1234567890','Stored separately and normalized');
select is(public.msrc_registration_submit('synthetic-identity',pg_temp.registration_claims(2)||jsonb_build_object('session_id',pg_temp.registration_session(1)),'passport','FAKE2222','synthetic-terms')->>'state','denied','Cannot use another participant session');
select is(public.msrc_registration_submit('synthetic-identity',pg_temp.registration_claims(1),'passport','FAKE2222','synthetic-terms')->>'state','submitted','Retry retains original request');
select is((select count(*) from msrc_registration.identity_documents),1::bigint,'Retry cannot replace own identifier or create duplicates');
select ok(not exists(select 1 from msrc_registration.requests where identity_envelope is not null or identity_hash is not null or key_version is not null),'New requests have no ciphertext, hash or key');
-- Preexisting request lacking identity is still valid and not forced to recollect.
insert into msrc_registration.requests(edition_key,actor_id,terms_version) values('synthetic-identity',pg_temp.registration_actor(2),'synthetic-terms');
select is(public.msrc_registration_submit('synthetic-identity',pg_temp.registration_claims(2),'passport','FAKE2222','synthetic-terms')->>'state','submitted','Existing request remains valid');
select is(public.msrc_registration_submit('synthetic-identity-other',pg_temp.registration_claims(3),'passport','OTHER333','synthetic-terms')->>'state','submitted','Other edition isolated');

do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(100)::text,true);end$$;
set local role authenticated;
select is(public.msrc_staff_registration_detail('synthetic-identity',(select (public.msrc_staff_registration('synthetic-identity','','all')->'registration'->'requests'->0->>'id')::uuid))->>'state','ready','Registration administrator reads detail');
reset role;
-- Bind each target explicitly server-side for reliable ordering-independent assertions.
create function pg_temp.identity_request(n integer) returns uuid language sql as $$select id from msrc_registration.requests where actor_id=pg_temp.registration_actor(n);$$;
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(100)::text,true);end$$;
select is(public.msrc_staff_registration_detail('synthetic-identity',pg_temp.identity_request(1))->'detail'->'identity'->>'documentNumber','1234567890','Admin detail alone contains full number');
select is(public.msrc_staff_registration_detail('synthetic-identity',pg_temp.identity_request(2))->'detail'->'identity','null'::jsonb,'Legacy request identity is Not provided');
select ok(not (public.msrc_staff_registration('synthetic-identity','','all')::text like '%1234567890%'),'List never exposes full identifier');
select ok(not (public.msrc_staff_participants('synthetic-identity','')::text like '%1234567890%'),'Participant list never exposes full identifier');
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(103)::text,true);end$$;
select is(public.msrc_staff_registration_detail('synthetic-identity',pg_temp.identity_request(1))->'detail'->'identity'->>'documentType','national_id','Super Admin detail has document type');
select is(public.msrc_staff_launch_readiness('synthetic-identity')->'requiredRpcs'->>'registration','true','Launch readiness recognizes the new private identity contract');
select is(public.msrc_staff_registration_detail('synthetic-identity',pg_temp.identity_request(3))->>'state','denied','Registration detail denies a request from another edition');
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(101)::text,true);end$$;
select is(public.msrc_staff_registration_detail('synthetic-identity',pg_temp.identity_request(1))->>'state','denied','Check-in staff denied');
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(102)::text,true);end$$;
select is(public.msrc_staff_registration_detail('synthetic-identity',pg_temp.identity_request(1))->>'state','denied','Reviewer denied');
set local role anon;
select throws_ok($$select * from msrc_registration.identity_documents$$,'42501',null,'Anon cannot read private identities');
select throws_ok($$select public.msrc_staff_registration_detail('synthetic-identity',gen_random_uuid())$$,'42501',null,'Anon cannot call staff detail');
reset role;
set local role authenticated;
select throws_ok($$select * from msrc_registration.identity_documents$$,'42501',null,'Authenticated client cannot read private identities');
select throws_ok($$select public.msrc_registration_submit('synthetic-identity','{}'::jsonb,'passport','FAKE123','synthetic-terms')$$,'42501',null,'Participant cannot forge server claims');
select throws_ok($$insert into msrc_registration.identity_documents values(gen_random_uuid(),'synthetic-identity','passport','FAKE123')$$,'42501',null,'Participant cannot write another request');
reset role;
-- Synthetic historical envelope really exists before purge; no decryption required.
update msrc_registration.requests set document_type='national_id',
 identity_envelope=jsonb_build_object('ciphertext',repeat('ab',10),'iv',repeat('cd',12),'authTag',repeat('ef',16),'keyVersion','synthetic-v1'),
 identity_hash=repeat('a',64),identity_masked=repeat(chr(8226),6)||'0000',key_version='synthetic-v1'
 where id=pg_temp.identity_request(2);
select is(msrc_registration.purge_identity('synthetic-identity')->>'deleted','0','Unset conference days purge nothing');
update msrc_registration.settings set conference_days=array[((now() at time zone 'Asia/Riyadh')::date-interval '1 year'+interval '1 day')::date] where edition_key='synthetic-identity';
select is(msrc_registration.purge_identity('synthetic-identity')->>'deleted','0','Before anniversary purges nothing');
update msrc_registration.settings set conference_days=array[((now() at time zone 'Asia/Riyadh')::date-interval '1 year'-interval '1 day')::date] where edition_key='synthetic-identity';
update msrc_outbox.settings set sweeps_enabled=true;
select is(public.msrc_registration_confirmation_maintenance('synthetic-identity')->>'state','updated','Existing maintenance runs identity purge after anniversary');
select is((select deleted from msrc_registration.identity_retention_audit where edition_key='synthetic-identity'),1,'After anniversary maintenance deletes identifiers');
select is((select count(*) from msrc_registration.identity_documents where edition_key='synthetic-identity'),0::bigint,'All expired edition identifiers removed');
select is((select count(*) from msrc_registration.identity_documents where edition_key='synthetic-identity-other'),1::bigint,'Other editions untouched');
select is((select count(*) from msrc_registration.requests where edition_key='synthetic-identity'),2::bigint,'Registration requests remain valid after purge');
select ok(not exists(select 1 from msrc_registration.requests where edition_key='synthetic-identity' and (identity_masked is not null or identity_hash is not null or identity_envelope is not null)),'Purge also removes masks and historical protection fields');
select is(msrc_registration.purge_identity('synthetic-identity')->>'deleted','0','Purge idempotent');
select is((select count(*) from msrc_registration.identity_retention_audit),1::bigint,'Counts-only audit emitted once for actual deletion');
select throws_ok($$update msrc_registration.identity_retention_audit set deleted=999$$,'55000',null,'Retention audit immutable');
select ok(not exists(select 1 from pg_policies where schemaname='msrc_registration'),'No client policies added');
select * from finish();
rollback;
