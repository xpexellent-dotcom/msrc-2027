-- ENG-078 / REV-06/07/10, ABS-08, CFG-04. Disposable synthetic rollback only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
\ir ../support/abstract-fixtures.psql

create temporary table event_ids(key text primary key,id uuid not null);
create function pg_temp.event_id(k text) returns uuid language sql stable as $$select id from event_ids where key=k$$;
create function pg_temp.event_write(n integer,act text,p jsonb,op uuid default gen_random_uuid()) returns jsonb language plpgsql as $$begin
 perform pg_temp.abstract_claims(n);return public.msrc_staff_research_event_write('synthetic-event',act,p,op);end$$;
create function pg_temp.event_payload(k text default 'one') returns jsonb language sql stable as $$
 select jsonb_build_object('submissionId',pg_temp.event_id(k),'expectedVersion',1);$$;
create function pg_temp.event_read(n integer,v text) returns jsonb language plpgsql as $$begin
 perform pg_temp.abstract_claims(n);return public.msrc_staff_research_event_read('synthetic-event',v);end$$;
create function pg_temp.event_card() returns jsonb language sql immutable as $$
 select '{"scores":[{"criterionId":"event-only","value":4}],"comments":"Independent event assessment"}'::jsonb;$$;

select is((select count(*) from msrc_research_event.settings),0::bigint,'No research judging settings seeded');
select ok(not exists(select 1 from pg_class c where c.relnamespace='msrc_research_event'::regnamespace and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'Every research-event table forces RLS');
select ok(not exists(select 1 from pg_policies where schemaname='msrc_research_event'),'No client policies on private event data');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name) where has_schema_privilege(name,'msrc_research_event','USAGE')),'Private schema has no API access');
select ok(not exists(select 1 from pg_class c cross join(values('anon'),('authenticated'),('service_role')) r(name) where c.relnamespace='msrc_research_event'::regnamespace and c.relkind='r' and has_table_privilege(name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No direct API access to research-event tables');
select ok(not exists(select 1 from pg_proc p where p.pronamespace='msrc_research_event'::regnamespace and p.prosecdef and not('search_path=""'=any(p.proconfig))),'Definers pin empty search path');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.pronamespace='msrc_research_event'::regnamespace and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),'No helper execute grants');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.pronamespace='public'::regnamespace and p.proname like 'msrc_research_event_%' and a.grantee in(0,'anon'::regrole,'authenticated'::regrole)),'Participant event RPCs are server-only');
set local role anon;
select throws_ok($$select public.msrc_staff_research_event_read('synthetic-event','settings')$$,'42501',null,'Anonymous staff access denied');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_research_event_me('synthetic-event','{}'::jsonb)$$,'42501',null,'Clients cannot forge participant claims');
reset role;
select ok(msrc_research_event.settings_valid(msrc_research_event.defaults(),false),'Empty research-specific rubric is editable');
select ok(not msrc_research_event.settings_valid(msrc_research_event.defaults(),true),'Empty rubric and policy leave judging closed');
select is(msrc_research_event.defaults()->'categories','[]'::jsonb,'No award names or prizes invented');

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-event');
select pg_temp.registration_fixture(9501,'synthetic-event');
select pg_temp.registration_fixture(9502,'synthetic-event');
select pg_temp.registration_staff_fixture(9601,'synthetic-event');
select pg_temp.registration_staff_fixture(9602,'synthetic-event','scientificAdministrator');
select pg_temp.registration_staff_fixture(9603,'synthetic-event','judgingCommittee');
select pg_temp.registration_staff_fixture(9604,'synthetic-event','facultyJudge');
select pg_temp.registration_staff_fixture(9605,'synthetic-event','facultyJudge');
select pg_temp.registration_staff_fixture(9606,'synthetic-event','finance');
select pg_temp.registration_staff_fixture(9607,'synthetic-event','facultyJudge');
select pg_temp.registration_staff_fixture(9608,'synthetic-event','facultyJudge');

select is(pg_temp.event_read(9606,'settings')->>'state','denied','Finance cannot read scientific settings');
select is(pg_temp.event_read(9604,'list')->>'state','denied','Judge cannot read committee progress or other judges scores');
select is(pg_temp.event_read(9604,'judge_queue')->>'state','closed','Absent configuration closes judge access');
select is(pg_temp.event_write(9603,'settings',jsonb_build_object('expectedVersion',0,'settings',msrc_research_event.defaults()))->>'state','denied','Committee cannot change administrator settings');
select is(pg_temp.event_write(9602,'settings',jsonb_build_object('expectedVersion',0,'settings',msrc_research_event.defaults()))->>'state','updated','Scientific administrator may save an empty editable rubric');
select is((select enabled from msrc_research_event.settings where edition_key='synthetic-event'),false,'Saving settings never activates release gate');
select is((select evidence_ready from msrc_research_event.settings where edition_key='synthetic-event'),false,'Saving settings never asserts evidence approval');
select is(pg_temp.event_write(9601,'settings',jsonb_build_object('expectedVersion',0,'settings',msrc_research_event.defaults()))->>'state','conflict','Settings reject stale version');
create temporary table event_config as select msrc_research_event.defaults()||jsonb_build_object('rubric','[{"id":"event-only","label":"Synthetic event criterion","min":1,"max":5}]'::jsonb,
 'judgeCount',1,'tieRule','Synthetic committee adjudication, with recorded rationale','categories','[{"id":"event-category","label":"Synthetic event award"}]'::jsonb,
 'lockAt',clock_timestamp()+interval '2 days','supervisorDeadline',clock_timestamp()+interval '4 days','supervisorEvidence','Synthetic participant confirmation and administrator validation') value;
select ok(msrc_research_event.settings_valid((select value from event_config),true),'Explicit synthetic event settings complete');
select ok(not msrc_research_event.settings_valid((select value from event_config)||'{"rubric":[]}'::jsonb,true),'No rubric keeps judging closed');
select ok(not msrc_research_event.settings_valid((select value from event_config)||'{"judgeCount":null}'::jsonb,true),'No judge count keeps judging closed');
select ok(not msrc_research_event.settings_valid((select value from event_config)||'{"tieRule":null}'::jsonb,true),'No tie rule keeps judging closed');
select ok(not msrc_research_event.settings_valid((select value from event_config)||'{"categories":[]}'::jsonb,true),'No award categories keeps judging closed');
select ok(not msrc_research_event.settings_valid((select value from event_config)||'{"rubric":[{"id":"bad","label":"Bad","min":2,"max":1}]}'::jsonb,true),'Invalid score ranges rejected');
select is(pg_temp.event_write(9601,'settings',jsonb_build_object('expectedVersion',1,'settings',(select value from event_config)))->>'state','updated','Super Admin saves explicit synthetic settings');
select is(pg_temp.event_read(9604,'judge_queue')->>'state','closed','Complete settings alone never open judging');

-- Accepted synthetic snapshots and pre-event reviewer canary. No real applications or emails.
insert into msrc_abstracts.settings(edition_key,version,configuration) values('synthetic-event',1,pg_temp.abstract_settings());
insert into msrc_abstracts.settings_versions values('synthetic-event',1,pg_temp.abstract_settings());
insert into event_ids values('one',gen_random_uuid()),('two',gen_random_uuid()),('unpublished',gen_random_uuid());
insert into msrc_abstracts.submissions(id,edition_key,actor_id,version,document,status,reference,word_count,finalized_at)
 select id,'synthetic-event',pg_temp.registration_actor(case when key='two' then 9502 else 9501 end),1,
 pg_temp.abstract_document(key||'@example.invalid'),'accepted','SYN-EVENT-'||key,7,clock_timestamp() from event_ids;
insert into msrc_abstracts.snapshots(submission_id,version,document,word_count,settings_version)
 select id,1,pg_temp.abstract_document(key||'@example.invalid'),7,1 from event_ids;
insert into msrc_abstracts.packets(submission_id,submission_version,packet,prepared_by)
 select id,1,pg_temp.abstract_packet(),pg_temp.registration_actor(9602) from event_ids;
insert into msrc_abstracts.decisions(id,submission_id,submission_version,outcome,reason,instructions,actor_id,review_basis)
 select gen_random_uuid(),id,1,'accept','PRE-EVENT REVIEWER SECRET','Synthetic accepted',pg_temp.registration_actor(9602),'{}'::jsonb from event_ids;
insert into msrc_abstracts.batches(id,edition_key,decision_ids,actor_id)
 select 'e7800000-0000-4000-8000-000000096001','synthetic-event',array_agg(id),pg_temp.registration_actor(9602) from msrc_abstracts.decisions where submission_id in(select id from event_ids where key<>'unpublished');
insert into msrc_abstracts.publications(decision_id,batch_id)
 select id,'e7800000-0000-4000-8000-000000096001' from msrc_abstracts.decisions where submission_id in(select id from event_ids where key<>'unpublished');
insert into msrc_abstracts.assignments(edition_key,submission_id,submission_version,rubric_version,reviewer_id,status,scorecard,score_total)
 values('synthetic-event',pg_temp.event_id('one'),1,1,pg_temp.registration_actor(9607),'completed','{"reviewerSecret":"PRE-EVENT REVIEWER SECRET"}'::jsonb,99);
select is(pg_temp.event_write(9602,'allocate',pg_temp.event_payload()||'{"format":"oral"}'::jsonb)->>'state','closed','Allocation is closed before independent release approval');
update msrc_research_event.settings set enabled=true,evidence_ready=true where edition_key='synthetic-event';
select is(pg_temp.event_write(9602,'allocate',pg_temp.event_payload('unpublished')||'{"format":"oral"}'::jsonb)->>'state','denied','Unpublished acceptance is not final accepted work');
select is(pg_temp.event_write(9603,'allocate',pg_temp.event_payload()||'{"format":"oral"}'::jsonb)->>'state','denied','Committee cannot change presentation format');
select is(pg_temp.event_write(9602,'allocate',pg_temp.event_payload()||'{"format":"oral"}'::jsonb,'e7900000-0000-4000-8000-000000096001')->>'state','prepared','Staff prepare oral allocation');
select is(pg_temp.event_write(9602,'allocate',pg_temp.event_payload()||'{"format":"oral"}'::jsonb,'e7900000-0000-4000-8000-000000096001')->>'state','prepared','Same idempotency key replays without another allocation');
select is((select count(*) from msrc_research_event.allocations),1::bigint,'Idempotent retry has one allocation');
select is(public.msrc_research_event_me('synthetic-event',pg_temp.registration_claims(9501))->'entries'->0->'presentationFormat','null'::jsonb,'Prepared presentation format hidden from participant');
insert into event_ids values('allocation',(select id from msrc_research_event.allocations));
select is(pg_temp.event_write(9602,'publish_allocation',pg_temp.event_payload()||jsonb_build_object('allocationId',pg_temp.event_id('allocation')))->>'state','published','Publication is an explicit separate action');
select is(public.msrc_research_event_me('synthetic-event',pg_temp.registration_claims(9501))->'entries'->0->>'presentationFormat','oral','Participant sees only published format');
select is(pg_temp.event_write(9602,'allocate',pg_temp.event_payload()||'{"format":"poster"}'::jsonb)->>'state','prepared','Prepared format may be corrected');
select is(public.msrc_research_event_me('synthetic-event',pg_temp.registration_claims(9501))->'entries'->0->>'presentationFormat','oral','Unpublished correction does not change released format');
select is(pg_temp.event_write(9602,'publish_allocation',pg_temp.event_payload()||jsonb_build_object('allocationId',pg_temp.event_id('allocation')))->>'state','conflict','Stale allocation cannot be republished');
select is(pg_temp.event_write(9603,'assign',pg_temp.event_payload()||jsonb_build_object('categoryId','event-category','judgeId',pg_temp.registration_actor(9607)))->>'state','coi','Pre-event reviewer cannot also judge that research');
select is(pg_temp.event_write(9603,'assign',pg_temp.event_payload()||jsonb_build_object('categoryId','event-category','judgeId',pg_temp.registration_actor(9604)))->>'state','assigned','Judging committee assigns own separate event card');
insert into event_ids values('assignment-one',(select id from msrc_research_event.assignments where judge_id=pg_temp.registration_actor(9604)));
select is(pg_temp.event_read(9605,'judge_queue')->'assignments','[]'::jsonb,'Unassigned judge sees no other judge packet or card');
select ok(pg_temp.event_read(9604,'judge_queue')::text !~ 'PRE-EVENT|reviewerSecret|Identity Canary|ethics|author|score_total','Judge packet contains no pre-event assessments or confidential identities');
select is(pg_temp.event_write(9605,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-one'),'expectedVersion',1,'scorecard',pg_temp.event_card(),'submit',true))->>'state','denied','Foreign judge cannot write card');
select is(pg_temp.event_write(9604,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-one'),'expectedVersion',1,'scorecard','{"scores":[],"comments":"Draft"}'::jsonb,'submit',true))->>'state','invalid','Incomplete card cannot count as a completed judgment');
select is(pg_temp.event_write(9604,'conflict',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-one'),'expectedVersion',1,'reason','Synthetic declared conflict'))->>'state','updated','Judge declares conflict independently');
select is(pg_temp.event_read(9604,'judge_queue')->'assignments','[]'::jsonb,'Conflicted judge loses packet access');
select is(pg_temp.event_write(9604,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-one'),'expectedVersion',2,'scorecard',pg_temp.event_card(),'submit',true))->>'state','denied','Conflict prevents scoring');
select is(pg_temp.event_write(9603,'reassign',pg_temp.event_payload()||jsonb_build_object('assignmentId',pg_temp.event_id('assignment-one'),'categoryId','event-category','judgeId',pg_temp.registration_actor(9605)))->>'state','assigned','Committee replaces conflicted judge');
insert into event_ids values('assignment-two',(select id from msrc_research_event.assignments where judge_id=pg_temp.registration_actor(9605)));
select is(pg_temp.event_write(9601,'settings',jsonb_build_object('expectedVersion',2,'settings',(select value from event_config)||'{"judgeCount":2}'::jsonb))->>'state','locked','Assigned rubric and judge count are frozen');
select is(pg_temp.event_write(9601,'settings',jsonb_build_object('expectedVersion',2,'settings',(select value from event_config)||'{"supervisorEvidence":"Updated synthetic validation policy"}'::jsonb))->>'state','updated','Winner-validation policy remains editable without changing judging rubric');
select is(pg_temp.event_write(9603,'prepare_award',pg_temp.event_payload()||'{"categoryId":"event-category","reason":"Synthetic selection","tieResolution":"Synthetic rule applied"}'::jsonb)->>'state','reviews_incomplete','Award preparation needs completed judge cards');
update msrc_research_event.settings set configuration=jsonb_set(configuration,'{lockAt}',to_jsonb(clock_timestamp()-interval '1 minute')) where edition_key='synthetic-event';
select is(pg_temp.event_write(9605,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-two'),'expectedVersion',1,'scorecard',pg_temp.event_card(),'submit',true))->>'state','locked','Configured event lock prevents scoring');
update msrc_research_event.settings set configuration=jsonb_set(configuration,'{lockAt}',(select value->'lockAt' from event_config)) where edition_key='synthetic-event';
select is(pg_temp.event_write(9605,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-two'),'expectedVersion',1,'scorecard',pg_temp.event_card(),'submit',true))->>'state','updated','Independent judge submits research-specific card');
select is(pg_temp.event_write(9605,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-two'),'expectedVersion',2,'scorecard',pg_temp.event_card(),'submit',true))->>'state','updated','ROL-06 permits independently versioned amendments before lock');
select is(pg_temp.event_write(9603,'prepare_award',pg_temp.event_payload()||'{"categoryId":"event-category","reason":"Synthetic selection","tieResolution":"Synthetic rule applied"}'::jsonb)->>'state','prepared','Committee prepares award from completed event basis');
insert into event_ids values('withdrawn-award',(select id from msrc_research_event.awards));
select is(pg_temp.event_write(9603,'withdraw_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('withdrawn-award'),'reason','Synthetic corrected selection'))->>'state','withdrawn','Committee can withdraw an unconfirmed prepared selection');
select is(public.msrc_research_event_me('synthetic-event',pg_temp.registration_claims(9501))->'entries'->0->'supervisorRequest','null'::jsonb,'Withdrawn selection exposes no supervisor request');
select is(pg_temp.event_write(9602,'confirm_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('withdrawn-award'),'validationReason','Synthetic validation'))->>'state','conflict','Withdrawn selection cannot confirm');
select is(pg_temp.event_write(9603,'prepare_award',pg_temp.event_payload()||'{"categoryId":"event-category","reason":"Synthetic revised selection","tieResolution":"Synthetic rule applied"}'::jsonb)->>'state','prepared','Committee prepares replacement after withdrawal');
insert into event_ids values('first-award',(select w.id from msrc_research_event.awards w where not exists(select 1 from msrc_research_event.award_changes x where x.award_id=w.id)));
select is(public.msrc_research_event_me('synthetic-event',pg_temp.registration_claims(9501))->'entries'->0->'award','null'::jsonb,'Prepared award is not published');
select is(pg_temp.event_write(9602,'confirm_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('first-award'),'validationReason','Synthetic validation'))->>'state','supervisor_required','Participant-confirmed supervisor required before award confirmation');
select is(pg_temp.event_write(9602,'publish_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('first-award')))->>'state','confirmation_required','Cannot publish an unconfirmed award');
select is(pg_temp.event_write(9605,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-two'),'expectedVersion',3,'scorecard',jsonb_set(pg_temp.event_card(),'{scores,0,value}','5'::jsonb),'submit',true))->>'state','updated','Permitted later amendment retains an immutable prior award basis');
select is(pg_temp.event_write(9602,'confirm_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('first-award'),'validationReason','Synthetic validation'))->>'state','reviews_incomplete','Changed scorecard invalidates preparation even with completed quorum');
select is(pg_temp.event_write(9605,'conflict',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-two'),'expectedVersion',4,'reason','Synthetic later discovered conflict'))->>'state','updated','Conflict can be declared after scorecard submission');
select is(pg_temp.event_write(9602,'confirm_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('first-award'),'validationReason','Synthetic validation'))->>'state','reviews_incomplete','Late conflict invalidates prepared award basis');
select is(pg_temp.event_write(9603,'reassign',pg_temp.event_payload()||jsonb_build_object('assignmentId',pg_temp.event_id('assignment-two'),'categoryId','event-category','judgeId',pg_temp.registration_actor(9608)))->>'state','assigned','Unconfirmed preparation allows conflict repair');
insert into event_ids values('assignment-three',(select id from msrc_research_event.assignments where judge_id=pg_temp.registration_actor(9608)));
select is(pg_temp.event_write(9608,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-three'),'expectedVersion',1,'scorecard',pg_temp.event_card(),'submit',true))->>'state','updated','Replacement judge independently completes card');
select is(pg_temp.event_write(9603,'prepare_award',pg_temp.event_payload()||'{"categoryId":"event-category","reason":"Synthetic corrected selection","tieResolution":"Synthetic rule reapplied"}'::jsonb)->>'state','prepared','Repreparation creates a fresh immutable award basis');
insert into event_ids values('current-award',(select w.id from msrc_research_event.awards w where not exists(select 1 from msrc_research_event.award_changes x where x.award_id=w.id)));
select is((select count(*) from msrc_research_event.awards),3::bigint,'Previous withdrawn and superseded awards retained as history');
select is(pg_temp.event_write(9602,'confirm_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('first-award'),'validationReason','Synthetic validation'))->>'state','conflict','Superseded award ID cannot confirm');
select is(public.msrc_research_event_supervisor('synthetic-event',pg_temp.registration_claims(9501),pg_temp.event_id('first-award'),'{"name":"Synthetic Supervisor","affiliation":"Synthetic Faculty","email":"supervisor@example.invalid","confirmed":true}'::jsonb,gen_random_uuid())->>'state','conflict','Participant cannot complete an obsolete supervisor request');
select is(public.msrc_research_event_supervisor('synthetic-event',pg_temp.registration_claims(9502),pg_temp.event_id('current-award'),'{"name":"Synthetic Supervisor","affiliation":"Synthetic Faculty","email":"supervisor@example.invalid","confirmed":true}'::jsonb,gen_random_uuid())->>'state','denied','Another participant cannot provide winner supervisor details');
select is(public.msrc_research_event_supervisor('synthetic-event',pg_temp.registration_claims(9501),pg_temp.event_id('current-award'),'{"name":"Synthetic Supervisor","affiliation":"Synthetic Faculty","email":"supervisor@example.invalid","confirmed":false}'::jsonb,gen_random_uuid())->>'state','invalid','Participant must explicitly confirm supervisor details');
select is(public.msrc_research_event_supervisor('synthetic-event',pg_temp.registration_claims(9501),pg_temp.event_id('current-award'),'{"name":"Synthetic Supervisor","affiliation":"Synthetic Faculty","email":"supervisor@example.invalid","confirmed":true}'::jsonb,'e7900000-0000-4000-8000-000000096002')->>'state','saved','Selected participant privately confirms supervisor');
select is(public.msrc_research_event_supervisor('synthetic-event',pg_temp.registration_claims(9501),pg_temp.event_id('current-award'),'{"name":"Synthetic Supervisor","affiliation":"Synthetic Faculty","email":"supervisor@example.invalid","confirmed":true}'::jsonb,'e7900000-0000-4000-8000-000000096002')->>'state','saved','Supervisor retry replays safely');
select is((select count(*) from msrc_research_event.supervisors),1::bigint,'Supervisor idempotency creates one private record');
select ok(pg_temp.event_read(9603,'list')::text !~ 'supervisor@example.invalid|Synthetic Faculty','Ordinary committee cannot see private supervisor details');
select ok(pg_temp.event_read(9602,'list')::text ~ 'supervisor@example.invalid','Authorized scientific administrator can validate supervisor details');
select is(pg_temp.event_write(9603,'confirm_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('current-award'),'validationReason','Synthetic validation'))->>'state','denied','Committee prepares but cannot confirm awards');
select is(pg_temp.event_write(9602,'confirm_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('current-award'),'validationReason','Synthetic validation'))->>'state','confirmed','Authorized validation confirms current award');
select is(pg_temp.event_write(9608,'judge',jsonb_build_object('assignmentId',pg_temp.event_id('assignment-three'),'expectedVersion',2,'scorecard',pg_temp.event_card(),'submit',true))->>'state','locked','Confirmed category freezes further score amendments');
select is(public.msrc_research_event_me('synthetic-event',pg_temp.registration_claims(9501))->'entries'->0->'award','null'::jsonb,'Confirmation does not publish award');
select is(pg_temp.event_write(9603,'withdraw_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('current-award'),'reason','Synthetic withdrawal'))->>'state','locked','Confirmed award cannot be withdrawn as a prepared outcome');
select is(pg_temp.event_write(9602,'publish_award',pg_temp.event_payload()||jsonb_build_object('awardId',pg_temp.event_id('current-award')))->>'state','published','Award requires explicit authorized publication');
select is(public.msrc_research_event_me('synthetic-event',pg_temp.registration_claims(9501))->'entries'->0->'award'->>'label','Synthetic event award','Participant sees the published award only');
select is(public.msrc_research_event_me('synthetic-event',pg_temp.registration_claims(9502))->'entries'->0->'award','null'::jsonb,'Other participant sees no foreign award');
select throws_ok($$update msrc_research_event.audit set event='rewritten'$$,'55000',null,'Research judging audit is immutable');
select throws_ok($$delete from msrc_research_event.awards$$,'55000',null,'Award snapshots are immutable');
select throws_ok($$truncate msrc_research_event.award_changes$$,'55000',null,'Award correction history cannot be truncated');
select ok(exists(select 1 from msrc_research_event.audit where event='staff.allocate'),'Presentation allocation is audited');
select ok(exists(select 1 from msrc_research_event.audit where event='staff.conflict'),'Conflict declarations are audited');
select ok(exists(select 1 from msrc_research_event.audit where event='staff.publish_award'),'Award publication is audited');
select * from finish();
rollback;
