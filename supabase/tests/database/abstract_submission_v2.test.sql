-- ENG-088 / ORG-068. Synthetic rollback-only permission and document boundary proofs.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
\ir ../support/profile-complete-fixtures.psql
\ir ../support/abstract-fixtures.psql

select is(public.msrc_abstracts_status('synthetic-v2')->>'documentVersion','2','Code-before-migration readiness handshake reports v2');
select ok(msrc_abstracts.submission_settings_ready(msrc_abstracts.settings_defaults()||jsonb_build_object('opensAt',clock_timestamp()-interval '1 day','closesAt',clock_timestamp()+interval '1 day')),'Submission windows do not require obsolete configurable taxonomy or PR-2 rubric settings');
select ok(not msrc_abstracts.submission_settings_ready(msrc_abstracts.settings_defaults()),'No default submission window');
select is(msrc_abstracts.word_count('{}'::jsonb),6,'All six fixed headings always count');
select is(msrc_abstracts.word_count(jsonb_set(pg_temp.abstract_document()->'body','{background}',to_jsonb(repeat('word ',334)))),350,'344 body words plus six headings total 350');
select ok(msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{body,background}',to_jsonb(repeat('word ',334))),'{}'::jsonb,true),'350 inclusive words valid without relying on settings taxonomy');
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{body,background}',to_jsonb(repeat('word ',335))),'{}'::jsonb,false),'351 inclusive words cannot even be saved');
select ok(msrc_abstracts.document_valid(pg_temp.abstract_document()||jsonb_build_object('title',repeat('word ',20)),'{}'::jsonb,true),'Twenty-word title accepted');
select ok(not msrc_abstracts.document_valid(pg_temp.abstract_document()||jsonb_build_object('title',repeat('word ',21)),'{}'::jsonb,false),'Twenty-one-word title cannot be saved');
select ok(not msrc_abstracts.document_valid(pg_temp.abstract_document()||'{"specialtyId":"other"}'::jsonb,'{}'::jsonb,false),'No Other specialty');
select ok(not msrc_abstracts.document_valid(pg_temp.abstract_document()||'{"studyTypeId":"configured-study"}'::jsonb,'{}'::jsonb,false),'Staff settings cannot extend the approved study types');
select ok(not msrc_abstracts.document_valid(pg_temp.abstract_document()||'{"studyTypeId":"other","studyTypeOther":""}'::jsonb,'{}'::jsonb,true),'Other study type requires explanation');
select ok(msrc_abstracts.document_valid(pg_temp.abstract_document()||'{"studyTypeId":"other","studyTypeOther":"Synthetic design"}'::jsonb,'{}'::jsonb,true),'Specified Other study type accepted');
select ok(not msrc_abstracts.document_valid(pg_temp.abstract_document()||jsonb_build_object('studyTypeOther',repeat('x',81)),'{}'::jsonb,false),'Other text bounded at 80');
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),array['body',field],'""'::jsonb),'{}'::jsonb,true),'Required section: '||field)
 from unnest(array['background','objectives','methods','results','limitations','conclusion']) field;
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),array[field],'false'::jsonb),'{}'::jsonb,true),'Required confirmation: '||field)
 from unnest(array['analysisComplete','authorityConfirmed','englishConfirmed','integrityConfirmed','singlePresenterConfirmed','oneSubmissionConfirmed']) field;
select ok(msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{supervisor,phone}','""'::jsonb),'{}'::jsonb,false),'Partial supervisor can be saved in draft');
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),array['supervisor',field],'""'::jsonb),'{}'::jsonb,true),'Supervisor required: '||field)
 from unnest(array['fullName','email','phone']) field;
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{supervisor,phone}','"0500000000"'::jsonb),'{}'::jsonb,true),'Supervisor phone requires E.164 at finalization');
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{supervisor,email}','"invalid"'::jsonb),'{}'::jsonb,true),'Supervisor email validated at finalization');
select ok(msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{supervisor,email}','"typing"'::jsonb),'{}'::jsonb,false),'Incomplete supervisor contact can autosave without losing a draft');
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{ethics,status}','"approved"'::jsonb),'{}'::jsonb,true),'Approved ethics requires IRB name and reference');
select ok(msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{ethics}','{"status":"approved","committee":"Synthetic IRB","reference":"SYN-123","explanation":""}'::jsonb),'{}'::jsonb,true),'Named ethics approval reference accepted');
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{ethics}','{"status":"exempt","committee":"","reference":"","explanation":""}'::jsonb),'{}'::jsonb,true),'Exemption requires reference or explanation');
select ok(msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{ethics}','{"status":"exempt","committee":"","reference":"SYN-EXEMPT","explanation":""}'::jsonb),'{}'::jsonb,true),'Committee exemption reference accepted');
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{ethics,explanation}','""'::jsonb),'{}'::jsonb,true),'Not-required ethics requires explanation');
select ok(not msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{registration,status}','"registered"'::jsonb),'{}'::jsonb,true),'Registered study requires registry and number');
select ok(msrc_abstracts.document_valid(jsonb_set(pg_temp.abstract_document(),'{registration}','{"status":"registered","registry":"Synthetic registry","number":"SYN-1"}'::jsonb),'{}'::jsonb,true),'Registry and registration number accepted');
select ok(not (pg_temp.abstract_packet() ?| array['supervisor','authors','ethics','registration','email','phone']),'Sanitized packet whitelist omits all private contact data');
select ok(not msrc_abstracts.packet_valid(pg_temp.abstract_packet()||jsonb_build_object('supervisor',pg_temp.abstract_document()->'supervisor'),pg_temp.abstract_document()),'Packet validator rejects contact object');
select ok(not msrc_abstracts.packet_valid(jsonb_set(pg_temp.abstract_packet(),'{body,background}',pg_temp.abstract_document()->'supervisor'->field),pg_temp.abstract_document()),'Supervisor canary excluded from packet text: '||field)
 from unnest(array['fullName','email','phone']) field;
select ok(msrc_abstracts.packet_valid(pg_temp.abstract_packet(),pg_temp.abstract_document()),'Clean six-section packet accepted');

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-v2');
insert into msrc_abstracts.settings(edition_key,version,configuration,enabled,evidence_ready) values('synthetic-v2',1,pg_temp.abstract_settings(),true,true);
insert into msrc_abstracts.settings_versions values('synthetic-v2',1,pg_temp.abstract_settings());
-- ENG-092: explicit synthetic similarity readiness, never a production default.
insert into msrc_abstracts.screening_settings(edition_key,version,similarity_threshold,actor_id,session_id) values('synthetic-v2',1,30,gen_random_uuid(),gen_random_uuid());
select pg_temp.registration_fixture(n,'synthetic-v2') from generate_series(9420,9431) n;
select pg_temp.complete_profile(n,'synthetic-v2') from generate_series(9420,9430) n;
update msrc_participant.profile_details p set student_status=status
 from (values(9420,'year_1'),(9421,'year_2'),(9422,'year_3'),(9423,'year_4'),(9424,'year_5'),(9425,'year_6'),(9426,'internship'),(9427,'clinical_placement'),(9428,'postgraduate'),(9429,'residency'),(9430,'faculty')) statuses(n,status)
 where p.actor_id=pg_temp.registration_actor(n);
create temporary table v2_drafts(n integer primary key,result jsonb);
insert into v2_drafts select n,public.msrc_abstracts_save_draft('synthetic-v2',pg_temp.registration_claims(n),null,0,pg_temp.abstract_document(),gen_random_uuid()) from generate_series(9420,9431) n;
select is(result->>'state','saved','Every actor may save one draft: '||n) from v2_drafts;
select is(result#>>'{submission,document,presentingAuthorId}',pg_temp.registration_actor(n)::text,'Presenter ID is the participant: '||n) from v2_drafts;
select is(public.msrc_abstracts_save_draft('synthetic-v2',pg_temp.registration_claims(9420),null,0,pg_temp.abstract_document(),gen_random_uuid())->>'state','conflict','Independent operation cannot create a second draft');
select is(public.msrc_abstracts_finalize('synthetic-v2',pg_temp.registration_claims(9431),(select (result#>>'{submission,id}')::uuid from v2_drafts where n=9431),1,gen_random_uuid())->>'state','profile_incomplete','Profile completeness precedes presenter eligibility');
select is(public.msrc_abstracts_finalize('synthetic-v2',pg_temp.registration_claims(n),(result#>>'{submission,id}')::uuid,1,gen_random_uuid())->>'state','presenter_ineligible','Ineligible completed profile: '||n) from v2_drafts where n between 9428 and 9430;
update msrc_abstracts.settings set evidence_ready=false where edition_key='synthetic-v2';
update msrc_abstracts.submissions set document=jsonb_set(document,'{body,results}','""'::jsonb) where actor_id=pg_temp.registration_actor(9420);
select is(public.msrc_abstracts_finalize('synthetic-v2',pg_temp.registration_claims(9420),(select (result#>>'{submission,id}')::uuid from v2_drafts where n=9420),1,gen_random_uuid())->>'state','invalid','Document validation remains enforced without an upload gate (ORG-070)');
update msrc_abstracts.submissions set document=jsonb_set(document,'{body,results}','"Synthetic results"'::jsonb) where actor_id=pg_temp.registration_actor(9420);
select is(public.msrc_abstracts_finalize('synthetic-v2',pg_temp.registration_claims(9420),(select (result#>>'{submission,id}')::uuid from v2_drafts where n=9420),1,gen_random_uuid())->>'state','finalized','Valid document finalizes with upload readiness false (ORG-070)');
select is(public.msrc_abstracts_finalize('synthetic-v2',pg_temp.registration_claims(n),(result#>>'{submission,id}')::uuid,1,gen_random_uuid())->>'state','finalized','Eligible status may finalize: '||n) from v2_drafts where n between 9421 and 9427;
select is((select count(*) from msrc_abstracts.snapshots),8::bigint,'Only eligible actors obtain immutable snapshots');
update msrc_abstracts.submissions set status='withdrawn' where actor_id=pg_temp.registration_actor(9420);
select is(public.msrc_abstracts_save_draft('synthetic-v2',pg_temp.registration_claims(9420),null,0,pg_temp.abstract_document(),gen_random_uuid())->>'state','submission_used','Withdrawal never restores the chance');
select is(public.msrc_abstracts_finalize('synthetic-v2',pg_temp.registration_claims(9420),(select (result#>>'{submission,id}')::uuid from v2_drafts where n=9420),1,gen_random_uuid())->>'state','submission_used','Withdrawn abstract cannot be finalized again');
update msrc_abstracts.submissions set status='rejected' where actor_id=pg_temp.registration_actor(9421);
select is(public.msrc_abstracts_save_draft('synthetic-v2',pg_temp.registration_claims(9421),null,0,pg_temp.abstract_document(),gen_random_uuid())->>'state','submission_used','Rejection never restores the chance');
select is(public.msrc_abstracts_finalize('synthetic-v2',pg_temp.registration_claims(9422),(select (result#>>'{submission,id}')::uuid from v2_drafts where n=9422),1,gen_random_uuid())->>'state','submission_used','Second independent finalization rejected');
update msrc_abstracts.settings set enabled=false where edition_key='synthetic-v2';
select is(public.msrc_abstracts_finalize('synthetic-v2',pg_temp.registration_claims(9431),(select (result#>>'{submission,id}')::uuid from v2_drafts where n=9431),1,gen_random_uuid())->>'state','closed','Window gate precedes incomplete profile');
select throws_ok($$update msrc_abstracts.snapshots set document=jsonb_set(document,'{supervisor,phone}','"+966599999999"'::jsonb)$$,'55000',null,'Supervisor contact is part of the immutable snapshot');
select throws_ok($$select msrc_abstracts.erase_supervisors(pg_temp.registration_actor(9420),'synthetic-v2')$$,'42501',null,'Retention cannot erase contacts before its existing authorization gate');
create temporary table original_science as select submission_id,version,document-'supervisor' document from msrc_abstracts.snapshots;
insert into msrc_registration.settings(edition_key,conference_days) values('synthetic-v2',array[(current_date-interval '2 years')::date]);
update msrc_participant.retention_policy set enabled=false;
select is(msrc_participant.profile_retention(),0,'Disabled retention does not erase contact data');
select ok(exists(select 1 from msrc_abstracts.snapshots where document#>>'{supervisor,email}'='supervisor-canary@example.invalid'),'Disabled retention preserves existing data');
update msrc_participant.retention_policy set enabled=true;
select ok(msrc_participant.profile_retention()>0,'Existing approved profile-retention path drains supervisor contacts');
select ok(not exists(select 1 from msrc_abstracts.submissions where document#>>'{supervisor,email}'<>''),'Private submission contact data erased');
select ok(not exists(select 1 from msrc_abstracts.snapshots where document#>>'{supervisor,email}'<>''),'Snapshot contact data erased under exact privacy exception');
select ok(not exists(select 1 from msrc_abstracts.operations where result::text like '%supervisor-canary@example.invalid%'),'Cached operation responses cannot resurrect erased contacts');
select ok(not exists(select 1 from msrc_abstracts.snapshots x join original_science o using(submission_id,version) where x.document-'supervisor'<>o.document),'Scientific snapshots remain byte-equivalent as jsonb after contact erasure');
select throws_ok($$update msrc_abstracts.snapshots set document=jsonb_set(document,'{title}','"Tampered"'::jsonb)$$,'55000',null,'Authorized privacy erasure never unlocks scientific fields');
select ok(not exists(select 1 from msrc_abstracts.audit where event='supervisor.erased' and details::text like '%Canary%'),'Erasure audit has no contact values');
-- Never-verified account cleanup already has an exact-transaction erasure proof.
select pg_temp.registration_fixture(9440,'synthetic-v2',false,true,interval '31 days');
insert into msrc_abstracts.submissions(id,edition_key,actor_id,version,document,word_count,status)
 values('e7a00000-0000-4000-8000-000000009440','synthetic-v2',pg_temp.registration_actor(9440),1,pg_temp.abstract_document(),18,'draft');
insert into msrc_abstracts.snapshots(submission_id,version,document,word_count,settings_version)
 values('e7a00000-0000-4000-8000-000000009440',1,pg_temp.abstract_document(),18,1);
insert into msrc_abstracts.operations values('synthetic-v2',pg_temp.registration_actor(9440),gen_random_uuid(),sha256('synthetic'::bytea),jsonb_build_object('submission',jsonb_build_object('document',pg_temp.abstract_document())));
-- Make this edition current again so the cleanup proof, rather than expiry,
-- establishes the scope of the narrowly allowed supervisor-only redaction.
update msrc_registration.settings set conference_days=array[current_date] where edition_key='synthetic-v2';
select ok((msrc_participant.cleanup_unverified(100,false)->>'deleted')::integer>=1,'Authorized existing account cleanup erases an expired never-verified account');
select ok(not exists(select 1 from auth.users where id=pg_temp.registration_actor(9440)),'The native account is erased');
select is((select document#>>'{supervisor,email}' from msrc_abstracts.submissions where actor_id=pg_temp.registration_actor(9440)),'','Account erasure drains private-record supervisor');
select is((select document#>>'{supervisor,email}' from msrc_abstracts.snapshots where submission_id='e7a00000-0000-4000-8000-000000009440'),'','Account erasure drains snapshot supervisor');
select ok(not exists(select 1 from msrc_abstracts.operations where actor_id=pg_temp.registration_actor(9440) and result::text like '%supervisor-canary@example.invalid%'),'Account erasure drains cached supervisor');
select * from finish();
rollback;
