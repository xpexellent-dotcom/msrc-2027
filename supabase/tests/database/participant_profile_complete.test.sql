-- ENG-087 / ORG-067. Synthetic rollback-only completeness, privacy and submission gates.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
\ir ../support/abstract-fixtures.psql
\ir ../support/profile-complete-fixtures.psql

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-profile-complete');
insert into msrc_abstracts.settings(edition_key,version,configuration,enabled,evidence_ready)
 values('synthetic-profile-complete',1,pg_temp.abstract_settings(),true,true);
select pg_temp.registration_fixture(n,'synthetic-profile-complete') from generate_series(8701,8707) n;
select pg_temp.complete_profile(n,'synthetic-profile-complete') from generate_series(8701,8702) n;
select pg_temp.registration_staff_fixture(8791,'synthetic-profile-complete','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(8792,'synthetic-profile-complete','checkInStaff');

create function pg_temp.profile_input() returns jsonb language sql immutable as $$
 select jsonb_build_object('institutionId',null,'institutionOther','Synthetic Institute','status','year_4',
 'arabicName','اسم مشارك تجريبي','nationality','SA','gender','female','dateOfBirth','1990-01-01','city','Synthetic city','phone','+966500000000',
 'interests','["synthetic-specialty"]'::jsonb,'identity',null,'removeIdentity',false);
$$;
create function pg_temp.profile_save(input jsonb,version integer default 1,n integer default 8701) returns jsonb language sql as $$
 select public.msrc_participant_profile_save('synthetic-profile-complete',pg_temp.registration_claims(n),input,version);
$$;

select ok(msrc_participant.profile_complete(pg_temp.registration_actor(8701),'synthetic-profile-complete'),'Every required field plus configured interest completes the profile');
select is(public.msrc_participant_profile_complete('synthetic-profile-complete',pg_temp.registration_claims(8701))->>'complete','true','Server-only own-profile completion RPC mirrors SQL');
select is(public.msrc_participant_profile_complete('synthetic-profile-complete',pg_temp.registration_claims(8703))->>'complete','false','An empty private profile is incomplete');
select ok(not msrc_participant.profile_complete(pg_temp.registration_actor(8701),'another-edition'),'Completion is bound to the edition');
select ok(not msrc_participant.unknown_erasure_reference(),'New personal columns preserve the reviewed erasure inventory');
set local role authenticated;
select throws_ok($$select public.msrc_participant_profile_complete('synthetic-profile-complete','{}'::jsonb)$$,'42501',null,'Clients cannot call completion RPC with forged claims');
select throws_ok($$select identity_envelope from msrc_participant.profile_details$$,'42501',null,'Participants cannot read stored identity envelopes directly');
reset role;
select ok(not has_table_privilege('service_role','msrc_participant.profile_details','SELECT'),'Even server transport has no direct identity table grant');
select ok(not exists(select 1 from pg_policy where polrelid='msrc_participant.profile_details'::regclass),'Profile identity has no client RLS policies');
select ok((select c.relrowsecurity and c.relforcerowsecurity from pg_class c where c.oid='msrc_participant.profile_details'::regclass),'Existing profile table still forces RLS');
select ok(not (msrc_participant.profile_projection(pg_temp.registration_actor(8701)) ?| array['identityEnvelope','identityLookup','identityNumber']),'Owner projection excludes ciphertext, HMAC and full identity number');
select is(msrc_participant.profile_projection(pg_temp.registration_actor(8701))->>'identityLast4','0000','Owner receives only masked identity suffix');

-- Each scalar and the active private picture are independently required.
create function pg_temp.missing_profile_fields() returns setof text language plpgsql as $$
declare field text;original msrc_participant.profile_details%rowtype;begin
 select p.* into original from msrc_participant.profile_details p where p.actor_id=pg_temp.registration_actor(8701);
 foreach field in array array['institution_other','student_status','arabic_name','nationality','gender','date_of_birth','city','phone','avatar_object'] loop
  execute format('update msrc_participant.profile_details set %I=null where actor_id=$1',field) using original.actor_id;
  return next ok(not msrc_participant.profile_complete(original.actor_id,'synthetic-profile-complete'),'Missing '||field||' blocks completion');
  update msrc_participant.profile_details p set institution_other=original.institution_other,student_status=original.student_status,
   arabic_name=original.arabic_name,nationality=original.nationality,gender=original.gender,date_of_birth=original.date_of_birth,
   city=original.city,phone=original.phone,avatar_object=original.avatar_object where p.actor_id=original.actor_id;
 end loop;
end$$;
select * from pg_temp.missing_profile_fields();
update msrc_participant.avatar_objects set state='delete' where actor_id=pg_temp.registration_actor(8701);
select ok(not msrc_participant.profile_complete(pg_temp.registration_actor(8701),'synthetic-profile-complete'),'A removed private image cannot satisfy completion');
update msrc_participant.avatar_objects set state='active' where actor_id=pg_temp.registration_actor(8701);
update msrc_participant.profile_details set specialty_interests='{}'::text[] where actor_id=pg_temp.registration_actor(8701);
select ok(not msrc_participant.profile_complete(pg_temp.registration_actor(8701),'synthetic-profile-complete'),'Configured specialties require at least one current choice');
update msrc_abstracts.settings set configuration=jsonb_set(configuration,'{specialties}','[]'::jsonb) where edition_key='synthetic-profile-complete';
select ok(msrc_participant.profile_complete(pg_temp.registration_actor(8701),'synthetic-profile-complete'),'An unavailable specialty list does not block completion');
update msrc_abstracts.settings set configuration=pg_temp.abstract_settings() where edition_key='synthetic-profile-complete';
update msrc_participant.profile_details set specialty_interests=array['retired-specialty'] where actor_id=pg_temp.registration_actor(8701);
select ok(not msrc_participant.profile_complete(pg_temp.registration_actor(8701),'synthetic-profile-complete'),'A retired specialty does not satisfy configured choices');
update msrc_participant.profile_details set specialty_interests=array['synthetic-specialty'] where actor_id=pg_temp.registration_actor(8701);

select is(pg_temp.profile_save('{"interests":[]}'::jsonb,0,8703)->>'state','ready','A participant can still save an entirely partial profile');
select is(public.msrc_participant_profile_complete('synthetic-profile-complete',pg_temp.registration_claims(8703))->>'complete','false','Partial saves do not claim completion');
select is(pg_temp.profile_save('{"interests":[],"phone":"+6831234"}'::jsonb,1,8703)->>'state','ready','Shorter international numbering plans remain valid E.164 contact data');
select is(pg_temp.profile_save(pg_temp.profile_input(),0)->>'state','conflict','Expected-version guard protects concurrent edits');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"institutionId":"king-abdulaziz"}'::jsonb)->>'state','invalid','Institution picker and Other cannot both be set');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"institutionId":"invented-school","institutionOther":null}'::jsonb)->>'state','invalid','Unknown institution slug is rejected by the RPC');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"nationality":"ZZ"}'::jsonb)->>'state','invalid','Nationality must be an actual ISO 3166-1 alpha-2 country');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"gender":"other"}'::jsonb)->>'state','invalid','Gender uses the owner-approved single-select choices');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"status":"medical_student"}'::jsonb)->>'state','invalid','Retired status is not accepted by the new save contract');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"arabicName":"English name"}'::jsonb)->>'state','invalid','Arabic full name must contain Arabic letters');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"arabicName":"اسم English"}'::jsonb)->>'state','invalid','Arabic name does not accept Latin name text');
select is(pg_temp.profile_save(pg_temp.profile_input()||jsonb_build_object('dateOfBirth',((statement_timestamp() at time zone 'UTC')::date-interval '18 years'+interval '1 day')::date::text))->>'state','invalid','A person one day below 18 is rejected');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"dateOfBirth":"2000-02-30"}'::jsonb)->>'state','invalid','Impossible calendar dates are rejected');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"dateOfBirth":"infinity"}'::jsonb)->>'state','invalid','Nonfinite dates cannot satisfy the age rule');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"phone":"0500000000"}'::jsonb)->>'state','invalid','Phone requires an E.164 country prefix');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"phone":"+966 500000000"}'::jsonb)->>'state','invalid','Phone is stored in normalized E.164 form');
select is(pg_temp.profile_save(pg_temp.profile_input()||jsonb_build_object('city',repeat('x',81)))->>'state','invalid','City is bounded to 80 characters');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"identityNumber":"1234567890"}'::jsonb)->>'state','invalid','No raw identity-number input is accepted by the database RPC');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"identity":{"type":"passport","envelope":"plaintext","lookup":"bad","last4":"1234"}}'::jsonb)->>'state','invalid','An unencrypted identity payload is rejected');
select is(pg_temp.profile_save(pg_temp.profile_input()||jsonb_build_object('identity',jsonb_build_object('type','passport','envelope','v1:synthetic:YWJjZGVmZ2hpamts:YWJjZGVmZ2hpamtsbW5vcA==:U1lOVEhFVElDX0VOVkVMT1BF','lookup',lpad(to_hex(8702),64,'0'),'last4','0000')))->>'state','conflict','Identity HMAC uniqueness is enforced without disclosing the other account');
select is(pg_temp.profile_save(pg_temp.profile_input()||jsonb_build_object('dateOfBirth',((statement_timestamp() at time zone 'UTC')::date-interval '18 years')::date::text))->>'state','ready','A person exactly 18 can save');
select is(msrc_participant.profile_projection(pg_temp.registration_actor(8701))->>'identityLast4','0000','Unchanged identity remains masked after scalar save');
select is(pg_temp.profile_save(pg_temp.profile_input()||'{"removeIdentity":true}'::jsonb,2)->>'state','ready','Participant can explicitly remove a saved identity while retaining a partial profile');
select ok(not msrc_participant.profile_complete(pg_temp.registration_actor(8701),'synthetic-profile-complete'),'Removing identity blocks later submissions');
select ok((select identity_envelope is null and identity_lookup is null and identity_last4 is null from msrc_participant.profile_details where actor_id=pg_temp.registration_actor(8701)),'Identity removal erases envelope, HMAC and suffix atomically');

-- Authorized organizers use only the established audited participant detail.
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(8791)::text,true);end$$;
select is(public.msrc_staff_participant_detail('synthetic-profile-complete',pg_temp.registration_actor(8702))#>>'{participant,optionalProfile,identityLast4}','0000','Existing audited staff detail includes the masked suffix');
select ok(public.msrc_staff_participant_detail('synthetic-profile-complete',pg_temp.registration_actor(8702))::text !~ 'identityEnvelope|identityLookup|U1lOVEhFVElDX0VOVkVMT1BF','Staff detail never exposes the protected envelope or lookup digest');
select ok(exists(select 1 from msrc_staff.audit where action='participants_read' and target_id=pg_temp.registration_actor(8702) and result='allowed'),'Masked staff identity reads retain their immutable audit');
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(8792)::text,true);end$$;
select is(public.msrc_staff_participant_detail('synthetic-profile-complete',pg_temp.registration_actor(8702))->>'state','denied','Check-in-only staff cannot access private profile/identity fields');
do $$begin perform set_config('request.jwt.claims','{}',true);end$$;

-- Actual finalization RPCs must reject incomplete actors without snapshots.
create temporary table profile_gate_result(kind text primary key,result jsonb);
insert into profile_gate_result values('abstract',public.msrc_abstracts_save_draft('synthetic-profile-complete',pg_temp.registration_claims(8705),null,0,pg_temp.abstract_document(),gen_random_uuid()));
select is((select result->>'state' from profile_gate_result where kind='abstract'),'saved','Incomplete profile does not prevent saving an abstract draft');
select is(public.msrc_abstracts_finalize('synthetic-profile-complete',pg_temp.registration_claims(8705),(select (result#>>'{submission,id}')::uuid from profile_gate_result where kind='abstract'),1,gen_random_uuid())->>'state','profile_incomplete','Abstract finalization enforces the distinct profile-incomplete state');
select is((select count(*) from msrc_abstracts.snapshots),0::bigint,'Blocked abstract creates no immutable submission snapshot');
select pg_temp.complete_profile(8705,'synthetic-profile-complete');
update msrc_participant.profile_details set student_status='year_6' where actor_id=pg_temp.registration_actor(8705);
select is(public.msrc_abstracts_finalize('synthetic-profile-complete',pg_temp.registration_claims(8705),(select (result#>>'{submission,id}')::uuid from profile_gate_result where kind='abstract'),1,gen_random_uuid())->>'state','finalized','Completing the profile permits otherwise-authorized abstract finalization');

insert into msrc_competitions.settings(edition_key,kind,version,configuration,enabled,evidence_ready)
 select 'synthetic-profile-complete',kind,1,pg_temp.profile_competition_settings(kind),true,true from unnest(array['hackathon','three_minute_thesis']) kind;
insert into profile_gate_result values('hackathon',public.msrc_competitions_save_draft('synthetic-profile-complete',pg_temp.registration_claims(8706),'hackathon',null,0,
 '{"title":"Synthetic project","pitch":"Synthetic English pitch","participationMode":"solo","track":"translating_research","references":"Synthetic reference","links":[],"declarations":{"previouslyPresented":false,"competitionEntered":false,"prizeReceived":false,"fundingReceived":false,"commercialized":false,"aiUsed":false,"originalityPermissions":true,"rulesAcknowledged":true,"ethicsApplicable":false,"mediaNoticeAcknowledged":true,"authorityConfirmed":true,"historyDetails":"","aiTools":"","teamContributions":"Synthetic individual contribution"}}'::jsonb,gen_random_uuid()));
insert into profile_gate_result values('three_minute_thesis',public.msrc_competitions_save_draft('synthetic-profile-complete',pg_temp.registration_claims(8707),'three_minute_thesis',null,0,
 '{"title":"Synthetic postgraduate project","narrative":"Synthetic study narrative","presenter":"Synthetic Presenter","affiliation":"Synthetic Institute","declarations":{"postgraduate":true,"authorityConfirmed":true}}'::jsonb,gen_random_uuid()));
select is((select result->>'state' from profile_gate_result where kind='hackathon'),'saved','Incomplete profile permits saving a Hackathon draft');
select is((select result->>'state' from profile_gate_result where kind='three_minute_thesis'),'saved','Incomplete profile permits saving a 3MT draft');
select is(public.msrc_competitions_submit('synthetic-profile-complete',pg_temp.registration_claims(8706),'hackathon',(select (result#>>'{entry,id}')::uuid from profile_gate_result where kind='hackathon'),1,gen_random_uuid())->>'state','profile_incomplete','Hackathon submit enforces profile completeness independently of its own eligibility profile');
select is(public.msrc_competitions_submit('synthetic-profile-complete',pg_temp.registration_claims(8707),'three_minute_thesis',(select (result#>>'{entry,id}')::uuid from profile_gate_result where kind='three_minute_thesis'),1,gen_random_uuid())->>'state','profile_incomplete','3MT submit enforces the same complete-profile requirement');
select is((select count(*) from msrc_competitions.snapshots),0::bigint,'Neither blocked competition creates a final snapshot');
select pg_temp.complete_profile(n,'synthetic-profile-complete') from generate_series(8706,8707) n;
insert into msrc_competitions.hackathon_profiles(edition_key,actor_id,university,field_of_study,phone,enrolled_in_saudi_university)
 values('synthetic-profile-complete',pg_temp.registration_actor(8706),'Synthetic University','Synthetic Medicine','+966500000000',true);
select is(public.msrc_competitions_submit('synthetic-profile-complete',pg_temp.registration_claims(8706),'hackathon',(select (result#>>'{entry,id}')::uuid from profile_gate_result where kind='hackathon'),1,gen_random_uuid())->>'state','submitted','A completed profile permits otherwise-authorized Hackathon submission');
select is(public.msrc_competitions_submit('synthetic-profile-complete',pg_temp.registration_claims(8707),'three_minute_thesis',(select (result#>>'{entry,id}')::uuid from profile_gate_result where kind='three_minute_thesis'),1,gen_random_uuid())->>'state','submitted','A completed profile permits otherwise-authorized 3MT submission');
select is(pg_temp.registration_submit('synthetic-profile-complete',8704)->>'state','submitted','Conference registration remains independent of profile completion');

-- Existing erasure and deadline maintenance remove every identity artifact.
select pg_temp.registration_fixture(8710,'synthetic-profile-complete',false,true,interval '31 days');
select pg_temp.complete_profile(8710,'synthetic-profile-complete');
select ok((msrc_participant.cleanup_unverified(100,false)->>'deleted')::integer>=1,'Existing never-verified account cleanup accepts the reviewed extended profile');
select ok(not exists(select 1 from msrc_participant.profile_details where actor_id=pg_temp.registration_actor(8710)),'Account erasure removes all new fields, ciphertext and HMAC');
select is((select state from msrc_participant.avatar_objects where actor_id=pg_temp.registration_actor(8710)),'delete','Account erasure still queues private image bytes');
update msrc_registration.settings set conference_days=array[(current_date-interval '2 years')::date] where edition_key='synthetic-profile-complete';
select ok(msrc_participant.profile_retention()>=1,'Configured conference-plus-one-year retention covers the new encrypted identity');
select is((select count(*) from msrc_participant.profile_details where edition_key='synthetic-profile-complete'),0::bigint,'Retention leaves no encrypted identity, lookup or scalar profile rows');
select ok(not msrc_participant.profile_complete(pg_temp.registration_actor(8702),'synthetic-profile-complete'),'An expired profile cannot satisfy a later submission');
select * from finish();
rollback;
