-- ENG-077 / TRK-01, HAC-01..11, TMT-01..02, CFG-13. Rollback-only synthetic tests.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
\ir ../support/abstract-fixtures.psql

-- ORG-065: hackathon entries carry references, links and the framework declarations.
create function pg_temp.competition_document(mode text default 'team') returns jsonb language sql immutable as $$
 select jsonb_build_object('title','Synthetic project','pitch','Synthetic English project pitch','participationMode',mode,'track','translating_research',
 'references','Synthetic reference list','links','[]'::jsonb,
 'declarations','{"previouslyPresented":false,"competitionEntered":false,"prizeReceived":false,"fundingReceived":false,"commercialized":false,"aiUsed":false,"originalityPermissions":true,"rulesAcknowledged":true,"ethicsApplicable":false,"mediaNoticeAcknowledged":true,"authorityConfirmed":true,"historyDetails":"","aiTools":"","teamContributions":"Synthetic shared contributions"}'::jsonb);$$;
create function pg_temp.tmt_document() returns jsonb language sql immutable as $$
 select '{"title":"Synthetic postgraduate project","narrative":"Synthetic study narrative","presenter":"Canary Presenter","affiliation":"Canary Institute","declarations":{"postgraduate":true,"authorityConfirmed":true}}'::jsonb;$$;
-- Hackathon settings start from the preloaded framework rubrics; 3MT keeps a synthetic rubric.
create function pg_temp.competition_settings(kind text default 'hackathon') returns jsonb language plpgsql stable as $$
declare c jsonb:=case when kind='hackathon' then msrc_competitions.hackathon_defaults() else msrc_competitions.settings_defaults() end;k text;begin
 for k in select jsonb_object_keys(c) loop if c->k='null'::jsonb then c:=jsonb_set(c,array[k],to_jsonb('Synthetic approved policy'::text));end if;end loop;
 c:=c||jsonb_build_object('opensAt',clock_timestamp()-interval '1 day','closesAt',clock_timestamp()+interval '1 day','reviewDeadline',clock_timestamp()+interval '3 days',
 'finalDeckLockAt',clock_timestamp()+interval '5 days','rosterConfirmationDeadline',clock_timestamp()+interval '4 days','whatsappSupportUrl',null,
 'soloConsumesFinalistQuota',true,'finalistCapPerTrack',1,'minimumReviews',2,'thirdReviewDifference',5,'requiredActivities','["orientation","mentoring","finals"]'::jsonb);
 if kind='hackathon' then
 return c||jsonb_build_object('judgeCount',3,'selectionScoreMin',1,'selectionScoreMax',5);
 end if;
 return c||jsonb_build_object('judgeCount',1,'selectionScoreMin',0,'selectionScoreMax',10,'trackLabels',null,'trackDescriptions',null,
 'selectionCriteria','[{"id":"synthetic-selection","label":"Synthetic selection","min":0,"max":10}]'::jsonb,
 'finalRubric','[{"id":"synthetic-final","label":"Synthetic final","min":1,"max":5}]'::jsonb);
end$$;
create function pg_temp.competition_mutate(n integer,action text,payload jsonb,kind text default 'hackathon') returns jsonb language plpgsql as $$begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);
 return public.msrc_staff_competitions_mutate('synthetic-competitions',kind,action,payload,gen_random_uuid());
end$$;

select is((select count(*) from msrc_competitions.settings),0::bigint,'No competition settings seeded');
select ok(not exists(select 1 from pg_class c where c.relnamespace='msrc_competitions'::regnamespace and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'All private competition tables force RLS');
select ok(not exists(select 1 from pg_policies where schemaname='msrc_competitions'),'No client policies');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name) where has_schema_privilege(name,'msrc_competitions','USAGE')),'No API schema access');
select ok(not exists(select 1 from pg_class c cross join(values('anon'),('authenticated'),('service_role')) r(name) where c.relnamespace='msrc_competitions'::regnamespace and c.relkind='r' and has_table_privilege(name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No direct API table privileges');
select ok(not exists(select 1 from pg_proc p where p.pronamespace='msrc_competitions'::regnamespace and p.prosecdef and not('search_path=""'=any(p.proconfig))),'Definers pin empty search path');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.pronamespace='msrc_competitions'::regnamespace and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),'No helper execute grants');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.pronamespace='public'::regnamespace and p.proname like 'msrc_competitions_%' and a.grantee in(0,'anon'::regrole,'authenticated'::regrole)),'Participant and scanner functions service-only');
select is(public.msrc_competitions_status('synthetic-competitions')->>'enabled','false','Absent settings close all competition workflows');
select to_regclass('storage.buckets') is not null and to_regclass('storage.objects') is not null as msrc_has_storage \gset
\if :msrc_has_storage
select is((select public from storage.buckets where id='msrc-competition-files'),false,'Supporting and final files bucket private');
select ok(not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and permissive='PERMISSIVE' and coalesce(qual,'')||coalesce(with_check,'') like '%msrc-competition-files%'),'No permissive direct client file access policy');
select is((select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname='msrc_competitions_no_client_objects' and permissive='RESTRICTIVE'),1::bigint,'Restrictive storage denial protects against future broad policies');
\endif
set local role anon;
select throws_ok($$select public.msrc_staff_competitions_data('synthetic-competitions','hackathon','list')$$,'42501',null,'Anonymous staff denied');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_competitions_me('synthetic-competitions','{}'::jsonb)$$,'42501',null,'Clients cannot forge participant claims');
select throws_ok($$select public.msrc_competitions_scan_result(gen_random_uuid(),true)$$,'42501',null,'Participant and reviewer cannot declare scanned files clean');
reset role;
select is(msrc_competitions.word_count('one two-three ... 123'),3,'Server shares client word-token rules');
select is(msrc_competitions.word_count(U&'one\00a0two\2003three\FEFFfour'),4,'ECMAScript Unicode whitespace agrees with client');
select is(msrc_competitions.word_count(U&'one\0085two\200Bthree'),1,'Non-ECMAScript separators do not increase count');
select ok(msrc_competitions.document_valid(pg_temp.competition_document(),'hackathon',true),'Hackathon-specific fields valid');
select ok(msrc_competitions.document_valid(pg_temp.tmt_document(),'three_minute_thesis',true),'Separate postgraduate path valid');
select ok(not msrc_competitions.document_valid(pg_temp.competition_document(),'three_minute_thesis',true),'Abstract or hackathon schema never applied to 3MT');
select ok(msrc_competitions.document_valid(pg_temp.competition_document()||jsonb_build_object('pitch',repeat('word ',300)),'hackathon',true),'300 English pitch words allowed');
select ok(not msrc_competitions.document_valid(pg_temp.competition_document()||jsonb_build_object('pitch',repeat('word ',301)),'hackathon',true),'301 words rejected server-side');
select ok(msrc_competitions.document_valid(pg_temp.competition_document()||'{"track":"advancing_research"}'::jsonb,'hackathon',true),'Second specified track allowed');
select ok(not msrc_competitions.document_valid(pg_temp.competition_document()||'{"track":"third_track"}'::jsonb,'hackathon',true),'Only two tracks');
select ok(not msrc_competitions.document_valid(pg_temp.competition_document()||'{"track":null}'::jsonb,'hackathon',false),'Null track rejected without SQL three-valued bypass');
select ok(not msrc_competitions.document_valid(pg_temp.competition_document()||'{"participationMode":null}'::jsonb,'hackathon',false),'Null participation mode rejected');
select ok(not msrc_competitions.document_valid(pg_temp.competition_document()||'{"nationalId":"forbidden"}'::jsonb,'hackathon',true),'No national ID field');
select ok(not msrc_competitions.document_valid(pg_temp.competition_document()||'{"phone":"forbidden"}'::jsonb,'hackathon',true),'No phone field');
select ok(not msrc_competitions.document_valid(jsonb_set(pg_temp.competition_document(),'{declarations,newIdea}','false'::jsonb),'hackathon',true),'Originality declarations required for submission');
select ok(not msrc_competitions.stage_ready(msrc_competitions.settings_defaults(),'hackathon','entry'),'Unset entry policies close stage');
select ok(not msrc_competitions.stage_ready(msrc_competitions.settings_defaults(),'hackathon','selection'),'Unset selection policies close stage');
select ok(not msrc_competitions.stage_ready(msrc_competitions.settings_defaults(),'hackathon','judging'),'Unset final policies close judging');
select ok(msrc_competitions.stage_ready(pg_temp.competition_settings(),'hackathon','selection'),'Explicit synthetic selection settings complete');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings()||'{"soloConsumesFinalistQuota":null}'::jsonb,'hackathon','selection'),'Solo quota has no default');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings()||'{"pitchPromptStructure":null}'::jsonb,'hackathon','entry'),'Pitch prompt structure unresolved closes entry');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings()||'{"membershipAfterSubmission":null}'::jsonb,'hackathon','membership'),'Membership changes have no default');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings()||'{"selectionCriteria":null}'::jsonb,'hackathon','selection'),'Missing selection rubric closes review');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings()||'{"minimumReviews":null}'::jsonb,'hackathon','selection'),'Review minimum never assumed');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings()||'{"finalTieRules":null}'::jsonb,'hackathon','judging'),'Tie rule never assumed');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings('three_minute_thesis')||'{"eligibilityEvidence":null}'::jsonb,'three_minute_thesis','entry'),'3MT eligibility evidence no default');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings('three_minute_thesis')||'{"participationLimits":null}'::jsonb,'three_minute_thesis','entry'),'3MT limits no default');
select ok(not msrc_competitions.stage_ready(pg_temp.competition_settings('three_minute_thesis')||'{"judgeCount":null}'::jsonb,'three_minute_thesis','judging'),'3MT judge count no default');

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-competitions');
select pg_temp.registration_fixture(n,'synthetic-competitions') from generate_series(9401,9407) n;
select pg_temp.registration_staff_fixture(9500,'synthetic-competitions');
select pg_temp.registration_staff_fixture(9501,'synthetic-competitions','scientificAdministrator');
select pg_temp.registration_staff_fixture(9502,'synthetic-competitions','hackathonReviewer');
select pg_temp.registration_staff_fixture(9503,'synthetic-competitions','hackathonReviewer');
select pg_temp.registration_staff_fixture(9504,'synthetic-competitions','facultyJudge');
select pg_temp.registration_staff_fixture(9505,'synthetic-competitions','finance');
select pg_temp.registration_staff_fixture(9506,'synthetic-competitions','threeMinuteThesisReviewer');
select pg_temp.registration_staff_fixture(9507,'synthetic-competitions','judgingCommittee');
select pg_temp.registration_staff_fixture(9508,'synthetic-competitions','facultyJudge');
select pg_temp.registration_staff_fixture(9509,'synthetic-competitions','facultyJudge');

select is(pg_temp.competition_mutate(9505,'settings',jsonb_build_object('expectedVersion',0,'settings',pg_temp.competition_settings()))->>'state','denied','Finance denied settings');
select is(pg_temp.competition_mutate(9501,'settings',jsonb_build_object('expectedVersion',0,'settings',pg_temp.competition_settings()))->>'state','denied','Scientific administrator cannot decide Super Admin policies');
select is(pg_temp.competition_mutate(9500,'settings',jsonb_build_object('expectedVersion',0,'settings',pg_temp.competition_settings()))->>'state','updated','Super Admin saves explicit settings');
select is((select enabled from msrc_competitions.settings where kind='hackathon'),false,'Saving does not activate');
select is((select evidence_ready from msrc_competitions.settings where kind='hackathon'),false,'Saving cannot bypass evidence');
select is((select files_ready from msrc_competitions.settings where kind='hackathon'),false,'Saving cannot bypass private-file review');
select is(pg_temp.competition_mutate(9500,'settings',jsonb_build_object('expectedVersion',0,'settings',pg_temp.competition_settings()))->>'state','conflict','Settings compare-and-swap');
select is(public.msrc_competitions_save_draft('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',null,0,pg_temp.competition_document(),gen_random_uuid())->>'state','closed','Disabled DB workflow denies draft');
update msrc_competitions.settings set enabled=true,evidence_ready=true where kind='hackathon';
create temporary table competition_result(key text primary key,value jsonb);
insert into competition_result values('team',public.msrc_competitions_save_draft('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',null,0,pg_temp.competition_document(),'e7900000-0000-4000-8000-000000000901'));
select is((select value->>'state' from competition_result where key='team'),'saved','Verified lead creates draft');
select is(public.msrc_competitions_save_draft('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',null,0,pg_temp.competition_document(),'e7900000-0000-4000-8000-000000000901')->'entry',(select value->'entry' from competition_result where key='team'),'Idempotent same operation creates one entry');
select is((select count(*) from msrc_competitions.entries),1::bigint,'One entry after retry');
select is((select used from msrc_competitions.mutation_limits where actor_id=pg_temp.registration_actor(9401)),2,'Cached operation retry does not consume mutation budget');
select is((select count(*) from msrc_competitions.roster),1::bigint,'Lead automatically in roster');
select is(public.msrc_competitions_submit('synthetic-competitions',pg_temp.registration_claims(9402),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),1,gen_random_uuid())->>'state','denied','Foreign participant cannot submit');
select is(public.msrc_competitions_save_draft('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),0,pg_temp.competition_document(),gen_random_uuid())->>'state','conflict','Stale document save denied');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),1,'invite','registration-9402@example.invalid',null,gen_random_uuid())->>'state','invited','Verified member invited');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),2,'invite','registration-9402@example.invalid',null,gen_random_uuid())->>'state','invited','Resend never duplicates roster');
select is((select count(*) from msrc_competitions.roster),2::bigint,'Repeated invitation does not duplicate');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9402),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),2,'confirm',null,null,gen_random_uuid())->>'state','profile_required','ORG-065: an invited member completes the private profile before accepting');
select is((public.msrc_competitions_me('synthetic-competitions',pg_temp.registration_claims(9402))#>>'{entries,0,invitationAccepted}'),'false','ORG-065: an invited member sees the pending invitation before accepting');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),2,'invite','registration-9403@example.invalid',null,gen_random_uuid())->>'state','invited','Third member');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),3,'invite','registration-9404@example.invalid',null,gen_random_uuid())->>'state','invited','Fourth member');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),4,'invite','registration-9405@example.invalid',null,gen_random_uuid())->>'state','invited','Fifth member');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,'invite','registration-9406@example.invalid',null,gen_random_uuid())->>'state','full','Sixth member rejected');
select is((select count(*) from msrc_competitions.roster),5::bigint,'Max five including submitting lead');
select throws_ok($$insert into msrc_competitions.roster(entry_id,actor_id,email) select id,pg_temp.registration_actor(9406),'registration-9406@example.invalid' from msrc_competitions.entries limit 1$$,'23514',null,'Database trigger also enforces maximum five');
select is(public.msrc_competitions_file_action('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,'reserve',null,'{"name":"synthetic.pdf","mime":"application/pdf","size":32,"stage":"supporting"}'::jsonb,gen_random_uuid())->>'state','closed','Files closed pending approved private-storage gate');
select is(public.msrc_competitions_submit('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,gen_random_uuid())->>'state','profile_required','ORG-065: submission waits for every member profile');
select is(public.msrc_competitions_hackathon_action('synthetic-competitions',pg_temp.registration_claims(n),'profile',null,null,
 '{"university":"Synthetic University","fieldOfStudy":"Synthetic Medicine","phone":"+966 500 000 000","enrolledInSaudiUniversity":true}'::jsonb,gen_random_uuid())->>'state','profile_saved','ORG-065: participant '||n||' saves the private hackathon profile') from generate_series(9401,9407) n;
select is(public.msrc_competitions_submit('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,gen_random_uuid())->>'state','roster_incomplete','ORG-065: submission waits until every invited member accepts');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(n),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,'confirm',null,null,gen_random_uuid())->>'state','confirmed','ORG-065: member '||n||' accepts the invitation') from generate_series(9402,9405) n;
select is(public.msrc_competitions_submit('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,gen_random_uuid())->>'state','submitted','Lead submits once every member has accepted');
select is((select count(*) from msrc_competitions.snapshots),1::bigint,'Immutable document/roster/file snapshot retained');
select throws_ok($$update msrc_competitions.snapshots set document='{}'::jsonb$$,'55000',null,'Submitted snapshot immutable');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9401),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,'invite','registration-9406@example.invalid',null,gen_random_uuid())->>'state','locked','Post-submission membership never silently changes');
insert into competition_result values('solo',public.msrc_competitions_save_draft('synthetic-competitions',pg_temp.registration_claims(9406),'hackathon',null,0,pg_temp.competition_document('solo'),gen_random_uuid()));
select throws_ok($$insert into msrc_competitions.roster(entry_id,actor_id,email) select (value->'entry'->>'id')::uuid,pg_temp.registration_actor(9407),'registration-9407@example.invalid' from competition_result where key='solo'$$,'23514',null,'Solo exactly one participant');

select is(pg_temp.competition_mutate(9502,'affiliations','{"affiliations":["Independent synthetic institution A"]}'::jsonb)->>'state','updated','Reviewer affiliation declaration');
select is(pg_temp.competition_mutate(9503,'affiliations','{"affiliations":["Independent synthetic institution B"]}'::jsonb)->>'state','updated','Second reviewer affiliation declaration');
select is(pg_temp.competition_mutate(9500,'eligibility',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'eligibility','eligible','reason','Synthetic eligibility evidence reviewed'))->>'state','updated','ORG-065: eligibility officers or Super Admins record hackathon eligibility');
select is(pg_temp.competition_mutate(9501,'prepare_packet',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'packet','{"title":"Synthetic adult","pitch":"Sanitized project","narrative":"","track":"translating_research"}'::jsonb,'attestation',true))->>'state','invalid','Known participant identity rejected in blinded packet');
select is(pg_temp.competition_mutate(9501,'prepare_packet',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'packet','{"title":"Sanitized synthetic project","pitch":"Sanitized English pitch","narrative":"","track":"translating_research"}'::jsonb,'attestation',true))->>'state','prepared','Human-sanitized blind packet prepared');
select is(pg_temp.competition_mutate(9501,'assign',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'reviewerId',pg_temp.registration_actor(9502)))->>'state','assigned','First independent reviewer');
select is(pg_temp.competition_mutate(9501,'assign',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'reviewerId',pg_temp.registration_actor(9502)))->>'state','duplicate','Cannot duplicate independent reviewer');
select is(pg_temp.competition_mutate(9501,'select',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'outcome','accept','rank',1,'tieResolution','Synthetic explicit tie resolution','reason','Synthetic selection'))->>'state','reviews_incomplete','Unfilled second assignment blocks selection');
select is(pg_temp.competition_mutate(9501,'assign',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'reviewerId',pg_temp.registration_actor(9503)))->>'state','assigned','Second independent reviewer');
select pg_temp.abstract_claims(9502);
select ok(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','queue')::text !~ 'registration-|Synthetic adult|roster|lead_id|reviewBasis','Reviewer sees blinded packet without roster, identity or other reviews');
select is(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','list')->>'state','denied','Reviewer cannot list unblinded entries');
select is(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','export')->>'state','denied','Reviewer export denied');
select is(pg_temp.competition_mutate(9502,'review',jsonb_build_object('assignmentId',(select id from msrc_competitions.assignments where reviewer_id=pg_temp.registration_actor(9503)),'expectedVersion',1,'scorecard','{"scores":[{"criterionId":"problem_relevance","value":4},{"criterionId":"innovation_fit","value":4},{"criterionId":"feasibility_development","value":4},{"criterionId":"evidence_rationale","value":4}],"comments":"Independent review"}'::jsonb,'submit',true))->>'state','denied','Foreign reviewer scorecard denied');
select is(pg_temp.competition_mutate(9502,'review',jsonb_build_object('assignmentId',(select id from msrc_competitions.assignments where reviewer_id=pg_temp.registration_actor(9502)),'expectedVersion',1,'scorecard','{"scores":[{"criterionId":"problem_relevance","value":4},{"criterionId":"innovation_fit","value":4},{"criterionId":"feasibility_development","value":4},{"criterionId":"evidence_rationale","value":4}],"comments":"Pre-event confidential canary"}'::jsonb,'submit',true))->>'state','updated','First completed independent card');
select is(pg_temp.competition_mutate(9502,'review',jsonb_build_object('assignmentId',(select id from msrc_competitions.assignments where reviewer_id=pg_temp.registration_actor(9502)),'expectedVersion',2,'scorecard','{"scores":[],"comments":"Cannot erase completed score"}'::jsonb,'submit',false))->>'state','locked','Completed review immutable');
select is(pg_temp.competition_mutate(9503,'review',jsonb_build_object('assignmentId',(select id from msrc_competitions.assignments where reviewer_id=pg_temp.registration_actor(9503)),'expectedVersion',1,'scorecard','{"scores":[{"criterionId":"problem_relevance","value":4},{"criterionId":"innovation_fit","value":4},{"criterionId":"feasibility_development","value":4},{"criterionId":"evidence_rationale","value":3}],"comments":"Second independent review"}'::jsonb,'submit',true))->>'state','updated','Second completed independent card');
select is(pg_temp.competition_mutate(9501,'select',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'outcome','accept','rank',1,'tieResolution','Synthetic explicit tie resolution','reason','Synthetic committee decision'))->>'state','prepared','Committee prepares immutable decision without publication');
select is((select status from msrc_competitions.entries where id=(select (value->'entry'->>'id')::uuid from competition_result where key='team')),'review','Prepared decision leaves participant status unchanged');
select is(pg_temp.competition_mutate(9501,'publish_selection',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'decisionId',(select id from msrc_competitions.decisions)))->>'state','selected','Explicit release publishes exact frozen review basis');
select is(public.msrc_competitions_member_action('synthetic-competitions',pg_temp.registration_claims(9402),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,'confirm',null,null,gen_random_uuid())->>'state','confirmed','Accepted-stage member confirmation stays individual');
select is((select count(*) from msrc_competitions.roster where confirmed),4::bigint,'Only the four invited members hold their own acceptance');
select is(public.msrc_competitions_hackathon_action('synthetic-competitions',pg_temp.registration_claims(9402),'finalist_confirm',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,'{}'::jsonb,gen_random_uuid())->>'state','roster_incomplete','ORG-065: only the lead confirms the finalist roster');
select is(public.msrc_competitions_hackathon_action('synthetic-competitions',pg_temp.registration_claims(9401),'finalist_confirm',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),5,'{}'::jsonb,gen_random_uuid())->>'state','finalist_confirmed','ORG-065: lead confirms the finalist roster');
-- The scanned final deck stands in for the private-file flow, which has its own storage-gated checks below.
update msrc_competitions.settings set files_ready=true where kind='hackathon';
insert into msrc_competitions.files(entry_id,name,stage,object_path,mime,byte_size,state) values((select (value->'entry'->>'id')::uuid from competition_result where key='team'),'final.pdf','final','synthetic-competitions/final-deck.pdf','application/pdf',32,'clean');
select pg_temp.abstract_claims(9507);
select ok(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','list')::text !~ 'Pre-event confidential canary|reviewBasis|decision|tieResolution','Judging committee accepted-only projection hides pre-event reviews and prepared decisions');
select is(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','judge_queue')->>'state','denied','Committee role does not grant judge-card authority');
select is(pg_temp.competition_mutate(9501,'panel',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'judgeIds',jsonb_build_array(pg_temp.registration_actor(9504),pg_temp.registration_actor(9508),pg_temp.registration_actor(9509))))->>'state','assigned','Separate closed panel setup with the framework minimum of three judges');
update msrc_competitions.settings set files_ready=false where kind='hackathon';
select pg_temp.abstract_claims(9504);
select is(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','queue')->>'state','denied','Judge cannot read pre-event reviews');
select is(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','list')->>'state','denied','Judge cannot read committee list and rankings');
select ok(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','judge_queue')::text !~ 'Pre-event confidential canary|reviewBasis|reviewerId|selectionCriteria|score_total','Final judges receive no pre-event reviews');
select is(pg_temp.competition_mutate(9504,'judge',jsonb_build_object('assignmentId',(select id from msrc_competitions.judge_assignments where judge_id=pg_temp.registration_actor(9504)),'expectedVersion',1,'scorecard','{"scores":[{"criterionId":"problem_need","value":4},{"criterionId":"evidence_rationale","value":4},{"criterionId":"innovation_fit","value":4},{"criterionId":"feasibility_implementation","value":4},{"criterionId":"impact_sustainability","value":4},{"criterionId":"pitch_communication","value":4},{"criterionId":"qa_defense","value":4}],"comments":"Synthetic event assessment"}'::jsonb,'submit',true))->>'state','updated','Event card uses distinct final rubric');
select is(pg_temp.competition_mutate(9504,'judge',jsonb_build_object('assignmentId',(select id from msrc_competitions.judge_assignments where judge_id=pg_temp.registration_actor(9504)),'expectedVersion',2,'scorecard','{"scores":[],"comments":"Cannot erase final score"}'::jsonb,'submit',false))->>'state','locked','Completed event card immutable');
select throws_ok($$update msrc_competitions.judging_materials set files='[]'::jsonb$$,'55000',null,'Judging files snapshot immutable');
select is(pg_temp.competition_mutate(9501,'outcome',jsonb_build_object('entryId',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),'expectedVersion',5,'outcome','Synthetic recorded outcome','reason','Synthetic decision'))->>'state','invalid','ORG-065: hackathon outcomes are winner or finalist only');
select is(pg_temp.competition_mutate(9501,'outcome',jsonb_build_object('entryId',(select (value->'entry'->>'id')::uuid from competition_result where key='team'),'expectedVersion',5,'outcome','finalist','reason','Synthetic decision'))->>'state','reviews_incomplete','ORG-065: every panel judge scores before an outcome');
select is(pg_temp.competition_mutate(n,'judge',jsonb_build_object('assignmentId',(select id from msrc_competitions.judge_assignments where judge_id=pg_temp.registration_actor(n)),'expectedVersion',1,'scorecard','{"scores":[{"criterionId":"problem_need","value":4},{"criterionId":"evidence_rationale","value":4},{"criterionId":"innovation_fit","value":4},{"criterionId":"feasibility_implementation","value":4},{"criterionId":"impact_sustainability","value":4},{"criterionId":"pitch_communication","value":4},{"criterionId":"qa_defense","value":4}],"comments":"Synthetic panel assessment"}'::jsonb,'submit',true))->>'state','updated','Panel judge '||n||' completes the final rubric') from unnest(array[9508,9509]) n;
select is(pg_temp.competition_mutate(9501,'outcome',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'outcome','finalist','reason','Synthetic decision'))->>'state','evidence_gate','No team-wide activity credit');
select is(pg_temp.competition_mutate(9501,'activity',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'participantId',pg_temp.registration_actor(9401),'activity','orientation','evidence','Synthetic individual scan'))->>'state','updated','Evidence stored for individual participant');
select is((select count(*) from msrc_competitions.activity_evidence),1::bigint,'One scan gives one person one activity');
select is(pg_temp.competition_mutate(9501,'outcome',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'outcome','finalist','reason','Synthetic decision'))->>'state','evidence_gate','Remaining people and activities still block outcome');
select is(pg_temp.competition_mutate(9501,'activity',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='team'),'expectedVersion',5,'participantId',pg_temp.registration_actor(9407),'activity','orientation','evidence','Synthetic foreign scan'))->>'state','invalid','Cannot credit non-member');
select throws_ok($$delete from msrc_competitions.audit$$,'55000',null,'Audit immutable');
select pg_temp.abstract_claims(9505);
select is(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','export')->>'state','denied','Finance cannot export private competition content');
select pg_temp.abstract_claims(9501);
select is(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','export')->>'state','ready','Authorized export only');

-- Conflicts remove access immediately and do not turn into independent completed reviews.
select is(public.msrc_competitions_submit('synthetic-competitions',pg_temp.registration_claims(9406),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='solo'),1,gen_random_uuid())->>'state','submitted','Separate solo project submitted');
select is(pg_temp.competition_mutate(9500,'eligibility',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='solo'),'expectedVersion',1,'eligibility','eligible','reason','Synthetic check'))->>'state','updated','Solo eligibility independent');
select is(pg_temp.competition_mutate(9501,'prepare_packet',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='solo'),'expectedVersion',1,'packet','{"title":"Sanitized solo project","pitch":"Independent synthetic solo pitch","narrative":"","track":"translating_research"}'::jsonb,'attestation',true))->>'state','prepared','Solo blinded packet');
select is(pg_temp.competition_mutate(9501,'assign',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='solo'),'expectedVersion',1,'reviewerId',pg_temp.registration_actor(9502)))->>'state','assigned','Conflict fixture assignment');
select is(pg_temp.competition_mutate(9502,'conflict',jsonb_build_object('assignmentId',(select a.id from msrc_competitions.assignments a where a.entry_id=(select (value->'entry'->>'id')::uuid from competition_result where key='solo')),'expectedVersion',1,'reason','Synthetic declared relationship'))->>'state','updated','Reviewer declares conflict');
select pg_temp.abstract_claims(9502);
select is(public.msrc_staff_competitions_data('synthetic-competitions','hackathon','queue')->'assignments','[]'::jsonb,'Conflict and accepted projects unavailable to reviewer');
select is(pg_temp.competition_mutate(9501,'assign',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='solo'),'expectedVersion',1,'reviewerId',pg_temp.registration_actor(9502)))->>'state','coi','Conflicted reviewer cannot be reassigned');

-- 3MT has distinct settings, evidence, form and reviewer role, with no inherited 300-word rule.
select is(pg_temp.competition_mutate(9500,'settings',jsonb_build_object('expectedVersion',0,'settings',pg_temp.competition_settings('three_minute_thesis')),'three_minute_thesis')->>'state','updated','3MT settings independent of hackathon');
select is(public.msrc_competitions_save_draft('synthetic-competitions',pg_temp.registration_claims(9407),'three_minute_thesis',null,0,pg_temp.tmt_document(),gen_random_uuid())->>'state','closed','3MT remains disabled after settings save');
update msrc_competitions.settings set enabled=true,evidence_ready=true where kind='three_minute_thesis';
insert into competition_result values('tmt',public.msrc_competitions_save_draft('synthetic-competitions',pg_temp.registration_claims(9407),'three_minute_thesis',null,0,pg_temp.tmt_document()||jsonb_build_object('narrative',repeat('study ',301)),gen_random_uuid()));
select is((select value->>'state' from competition_result where key='tmt'),'saved','3MT narrative has its own configured limits, not hackathon pitch limit');
select is(public.msrc_competitions_submit('synthetic-competitions',pg_temp.registration_claims(9407),'three_minute_thesis',(select (value->'entry'->>'id')::uuid from competition_result where key='tmt'),1,gen_random_uuid())->>'state','submitted','Postgraduate path submission');
select is(pg_temp.competition_mutate(9501,'eligibility',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='tmt'),'expectedVersion',1,'eligibility','eligible','reason','Synthetic postgraduate evidence'),'three_minute_thesis')->>'state','updated','3MT lead-controlled eligibility evidence');
select is(pg_temp.competition_mutate(9501,'prepare_packet',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='tmt'),'expectedVersion',1,'packet','{"title":"Sanitized postgraduate study","pitch":"","narrative":"Sanitized scientific narrative","track":null}'::jsonb,'attestation',true),'three_minute_thesis')->>'state','prepared','3MT own blind narrative packet');
select is(pg_temp.competition_mutate(9506,'affiliations','{"affiliations":["CANARY institute"]}'::jsonb,'three_minute_thesis')->>'state','updated','3MT reviewer affiliation');
select is(pg_temp.competition_mutate(9501,'assign',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='tmt'),'expectedVersion',1,'reviewerId',pg_temp.registration_actor(9506)),'three_minute_thesis')->>'state','coi','Normalized postgraduate institutional conflict blocks assignment');
select is(pg_temp.competition_mutate(9501,'assign',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='tmt'),'expectedVersion',1,'reviewerId',pg_temp.registration_actor(9503)),'three_minute_thesis')->>'state','denied','Hackathon reviewer role cannot review postgraduate entry');

-- Private-file authorization is rechecked even on an idempotent signing-grant replay.
insert into competition_result values('files',public.msrc_competitions_save_draft('synthetic-competitions',pg_temp.registration_claims(9407),'hackathon',null,0,pg_temp.competition_document('solo'),gen_random_uuid()));
update msrc_competitions.settings set files_ready=true where kind='hackathon';
insert into competition_result values('file-grant',public.msrc_competitions_file_action('synthetic-competitions',pg_temp.registration_claims(9407),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='files'),1,'reserve',null,'{"name":"synthetic.pdf","mime":"application/pdf","size":32,"stage":"supporting"}'::jsonb,'e7900000-0000-4000-8000-000000000999'));
select is((select value->>'state' from competition_result where key='file-grant'),'reserved','Private optional document reservation');
select is(public.msrc_competitions_file_action('synthetic-competitions',pg_temp.registration_claims(9406),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='files'),1,'read',(select (value->>'fileId')::uuid from competition_result where key='file-grant'),'{}'::jsonb,gen_random_uuid())->>'state','denied','Foreign participant cannot retrieve arbitrary file');
select is(public.msrc_competitions_file_action('synthetic-competitions',pg_temp.registration_claims(9407),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='files'),1,'read',(select (value->>'fileId')::uuid from competition_result where key='file-grant'),'{}'::jsonb,gen_random_uuid())->>'state','unavailable','Quarantined file cannot be read');
select is(public.msrc_competitions_file_action('synthetic-competitions',pg_temp.registration_claims(9407),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='files'),1,'reserve',null,'{"name":"synthetic.pdf","mime":null,"size":32,"stage":"supporting"}'::jsonb,gen_random_uuid())->>'state','invalid','Null MIME does not pass SQL null checks');
update msrc_competitions.settings set files_ready=false where kind='hackathon';
select is(public.msrc_competitions_file_action('synthetic-competitions',pg_temp.registration_claims(9407),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='files'),1,'reserve',null,'{"name":"synthetic.pdf","mime":"application/pdf","size":32,"stage":"supporting"}'::jsonb,'e7900000-0000-4000-8000-000000000999')->>'state','closed','Closing file gate prevents cached reservation from minting a fresh URL');
select is(public.msrc_competitions_submit('synthetic-competitions',pg_temp.registration_claims(9407),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='files'),1,gen_random_uuid())->>'state','evidence_gate','Quarantine prevents submitting unsafe optional attachment');
update msrc_competitions.settings set files_ready=true where kind='hackathon';
\if :msrc_has_storage
insert into storage.objects(bucket_id,name,metadata) select 'msrc-competition-files',value->>'path','{"size":32,"mimetype":"application/pdf"}'::jsonb from competition_result where key='file-grant';
select is(public.msrc_competitions_scan_result((select (value->>'fileId')::uuid from competition_result where key='file-grant'),true)->>'state','updated','Synthetic trusted scanner records object-matched clean state');
select is((select count(*) from msrc_competitions.audit where event='file.scan_result'),1::bigint,'Scan transitions audited immutably');
select is(pg_temp.competition_mutate(9502,'file_read',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='files'),'fileId',(select value->>'fileId' from competition_result where key='file-grant')))->>'state','denied','Blinded reviewer cannot obtain supporting-file path');
select is(pg_temp.competition_mutate(9501,'file_read',jsonb_build_object('entryId',(select value->'entry'->>'id' from competition_result where key='files'),'fileId',(select value->>'fileId' from competition_result where key='file-grant')))->>'state','ready','Authorized science staff may retrieve clean private evidence');
select is(public.msrc_competitions_file_action('synthetic-competitions',pg_temp.registration_claims(9407),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='files'),1,'read',(select (value->>'fileId')::uuid from competition_result where key='file-grant'),'{}'::jsonb,'e7900000-0000-4000-8000-000000000998')->>'state','available','Owner reads only object-approved clean private file');
update msrc_competitions.settings set files_ready=false where kind='hackathon';
select is(public.msrc_competitions_file_action('synthetic-competitions',pg_temp.registration_claims(9407),'hackathon',(select (value->'entry'->>'id')::uuid from competition_result where key='files'),1,'read',(select (value->>'fileId')::uuid from competition_result where key='file-grant'),'{}'::jsonb,'e7900000-0000-4000-8000-000000000998')->>'state','closed','Cached clean-file read grant cannot bypass newly closed file gate');
\endif

select * from finish();
rollback;
