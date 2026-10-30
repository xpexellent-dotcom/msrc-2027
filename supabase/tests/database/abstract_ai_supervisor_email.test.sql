-- ENG-091 / AI-01..06 / ORG-040/069. Rollback only; no provider or email.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
\ir ../support/abstract-fixtures.psql
\ir ../support/abstract-screening-fixtures.psql
\ir ../support/advisory-fixtures.psql
select ok(not has_function_privilege('service_role','public.msrc_staff_advisory_confirm_item(text,uuid,text,integer,text,uuid)','EXECUTE'),'Worker cannot confirm human scores');
select ok(not has_function_privilege('anon','public.msrc_staff_advisory_submission(text,uuid)','EXECUTE'),'Anonymous cannot see advisory or supervisor status');
select ok(not has_table_privilege('authenticated','msrc_abstracts.advisory_confirmations','SELECT,INSERT,UPDATE,DELETE'),'No direct confirmation access');
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-ai-supervisor');
select pg_temp.registration_staff_fixture(9600,'synthetic-ai-supervisor');
select pg_temp.registration_staff_fixture(9601,'synthetic-ai-supervisor','scientificAdministrator');
select pg_temp.registration_staff_fixture(9602,'synthetic-ai-supervisor','abstractReviewer');
select pg_temp.registration_fixture(9604,'synthetic-ai-supervisor');
select pg_temp.abstract_claims(9600);
select is(public.msrc_staff_research_save_settings('synthetic-ai-supervisor',0,pg_temp.screening_configuration())->>'state','ready','Fixed human rubric configured synthetically');
select pg_temp.advisory_submission(9601,'synthetic-ai-supervisor',9604);
select is(public.msrc_staff_advisory_submission('synthetic-ai-supervisor',pg_temp.advisory_id(9601))->>'enabled','false','Submission panel defaults off');
select is(public.msrc_staff_advisory_save_settings('synthetic-ai-supervisor',0,pg_temp.advisory_configuration())->>'state','updated','Explicit test configuration only');
select is(public.msrc_staff_advisory_start('synthetic-ai-supervisor',pg_temp.advisory_id(9602),array[pg_temp.advisory_id(9601)])->>'state','queued','Incumbent durable job starts');
create temporary table ai_supervisor_result(key text primary key,value jsonb);
insert into ai_supervisor_result values('claim',public.msrc_advisory_worker_claim(pg_temp.advisory_id(9699),1));
create function pg_temp.ai_supervisor_output() returns jsonb language sql stable as $$
 select jsonb_build_object('scores',(select jsonb_agg(jsonb_build_object('criterionId',r->>'id','value',3,'rationale','Synthetic evidence')) from jsonb_array_elements(msrc_abstracts.rubric_2027()) r),
 'gates',(select jsonb_agg(jsonb_build_object('gate',g,'observation','Scientific observation; human confirmation required')) from generate_series(1,6) g),
 'total',66.67,'model','deepseek-flash','promptVersion','staff-advisory-org069-v2');
$$;
select ok(msrc_abstracts.advisory_result_valid(pg_temp.ai_supervisor_output(),msrc_abstracts.rubric_2027(),'deepseek-flash'),'Fixed seven criteria and six observations valid');
select ok(not msrc_abstracts.advisory_result_valid(pg_temp.ai_supervisor_output()||'{"total":100}'::jsonb,msrc_abstracts.rubric_2027(),'deepseek-flash'),'Model cannot dictate total');
select ok(not msrc_abstracts.advisory_result_valid(pg_temp.ai_supervisor_output()||'{"decision":"accept"}'::jsonb,msrc_abstracts.rubric_2027(),'deepseek-flash'),'Outcome fields invalidate entire advisory');
select is(public.msrc_advisory_worker_finish(pg_temp.advisory_id(9699),(select (value->0->>'id')::uuid from ai_supervisor_result where key='claim'),(select (value->0->>'leaseToken')::uuid from ai_supervisor_result where key='claim'),pg_temp.ai_supervisor_output(),null)->>'state','completed','Advisory persists only as an advisory');
select is((select count(*) from msrc_abstracts.screenings),0::bigint,'AI cannot write screening gates');
select is((select count(*) from msrc_abstracts.assignments),0::bigint,'AI is never an independent reviewer');
select is((select count(*) from msrc_abstracts.decisions),0::bigint,'AI cannot write decisions');
select is((select count(*) from msrc_abstracts.supervisor_notifications),0::bigint,'AI alone never notifies a supervisor');
create function pg_temp.ai_supervisor_advisory() returns uuid language sql stable as $$select id from msrc_abstracts.advisory_records limit 1$$;
select pg_temp.abstract_claims(9602);
select is(public.msrc_staff_advisory_submission('synthetic-ai-supervisor',pg_temp.advisory_id(9601))->>'state','denied','Reviewer denied all staff suggestions');
select is(public.msrc_staff_advisory_confirm_item('synthetic-ai-supervisor',pg_temp.ai_supervisor_advisory(),'methodology',3,'Synthetic human reason',pg_temp.advisory_id(9603))->>'state','denied','Reviewer cannot use staff confirmation');
select pg_temp.abstract_claims(9604);
select is(public.msrc_staff_advisory_submission('synthetic-ai-supervisor',pg_temp.advisory_id(9601))->>'state','denied','Participant denied advisory and email status');
select pg_temp.abstract_claims(9601);
select is(public.msrc_staff_advisory_confirm_item('synthetic-ai-supervisor',pg_temp.ai_supervisor_advisory(),'methodology',3,'Synthetic human reason',pg_temp.advisory_id(9603))->>'state','updated','Scientific Administrator explicitly confirms one criterion');
select is(public.msrc_staff_advisory_confirm_item('synthetic-ai-supervisor',pg_temp.ai_supervisor_advisory(),'methodology',3,'Synthetic human reason',pg_temp.advisory_id(9603))->>'state','updated','Confirmation retries dedupe');
select is((select count(*) from msrc_abstracts.advisory_confirmations),1::bigint,'One explicit item confirmation');
select is((select actor_id from msrc_abstracts.advisory_confirmations),pg_temp.registration_actor(9601),'Human actor attributed');
select is((select marker from msrc_abstracts.advisory_confirmations),'AI-assisted','Human record marked AI-assisted');
select is((select count(*) from msrc_abstracts.assignments),0::bigint,'Confirmed staff score still cannot count as reviewer');
select is(public.msrc_staff_research_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,0,pg_temp.advisory_id(9604),pg_temp.screening_input())->>'state','updated','Human pending screening recorded');
select is((select count(*) from msrc_abstracts.supervisor_notifications),0::bigint,'Pending screening never queues email');
select pg_temp.abstract_claims(9600);
select is(public.msrc_staff_research_save_screening_settings('synthetic-ai-supervisor',0,null,100,null)->>'state','ready','Explicit synthetic threshold');
select is(public.msrc_staff_research_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,1,pg_temp.advisory_id(9605),pg_temp.screening_input()||'{"ethics":{"passed":false,"note":"Synthetic failure"},"failureDisposition":"correctable"}'::jsonb)->>'state','updated','Human failed screening recorded');
select is((select count(*) from msrc_abstracts.supervisor_notifications),0::bigint,'Failed screening never queues email');
select is(public.msrc_staff_advisory_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,2,pg_temp.advisory_id(9606),pg_temp.screening_input(),pg_temp.ai_supervisor_advisory(),null)->>'state','invalid','Null gate selection rejected');
select is(public.msrc_staff_advisory_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,2,pg_temp.advisory_id(9606),pg_temp.screening_input(),pg_temp.ai_supervisor_advisory(),array[]::text[])->>'state','invalid','Empty gate selection rejected');
select is(public.msrc_staff_advisory_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,2,pg_temp.advisory_id(9606),pg_temp.screening_input(),pg_temp.ai_supervisor_advisory(),array['G5',null])->>'state','invalid','Null gate item rejected');
select is(public.msrc_staff_advisory_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,2,pg_temp.advisory_id(9606),pg_temp.screening_input(),pg_temp.ai_supervisor_advisory(),array['G5','G5'])->>'state','invalid','Duplicate gate selection rejected');
select is(public.msrc_staff_advisory_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,2,pg_temp.advisory_id(9606),pg_temp.screening_input(),pg_temp.ai_supervisor_advisory(),array['G5','G7'])->>'state','invalid','External similarity gate cannot be AI-assisted');
select is(public.msrc_staff_advisory_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,2,pg_temp.advisory_id(9606),pg_temp.screening_input(),pg_temp.ai_supervisor_advisory(),array['G1','G2','G3','G4','G5','G6','G5'])->>'state','invalid','More than six gate selections rejected');
select is((select count(*) from msrc_abstracts.screenings),2::bigint,'Invalid selections create no screening round');
select is((select count(*) from msrc_abstracts.advisory_confirmations where screening_id is not null),0::bigint,'Invalid selections create no gate confirmations');
select is(public.msrc_staff_advisory_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,2,pg_temp.advisory_id(9606),pg_temp.screening_input(),pg_temp.ai_supervisor_advisory(),array['G5','G6'])->>'state','updated','Human selects and confirms AI-assisted screening items');
select is((select count(*) from msrc_abstracts.supervisor_notifications),1::bigint,'Human pass queues exactly one supervisor notification');
select is((select count(*) from msrc_abstracts.advisory_confirmations where screening_id is not null and marker='AI-assisted'),2::bigint,'Only individually selected gates linked to human screening');
select is(public.msrc_staff_advisory_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,2,pg_temp.advisory_id(9606),pg_temp.screening_input(),pg_temp.ai_supervisor_advisory(),array['G5','G6'])->>'state','updated','Human-pass retry returns original result');
select is(pg_temp.confirm_screening(pg_temp.advisory_id(9601)),'updated','Human can reconfirm without duplicate email');
select is((select count(*) from msrc_outbox.messages where template_key='abstract_supervisor'),1::bigint,'Retries and re-confirmation share one durable outbox identity');
select is((select recipient_email from msrc_outbox.messages where template_key='abstract_supervisor'),'supervisor-canary@example.invalid','Recipient taken from finalized snapshot');
select ok(msrc_abstracts.supervisor_eligible((select outbox_id from msrc_abstracts.supervisor_notifications)),'Send-time eligibility requires current human pass');
select is(public.msrc_staff_advisory_submission('synthetic-ai-supervisor',pg_temp.advisory_id(9601))->>'notification','draft_held','Staff can see held notification status');
update msrc_outbox.settings set delivery_enabled=true,daily_cap=1000;
select is(public.msrc_outbox_claim(pg_temp.advisory_id(9698),1,1000),'[]'::jsonb,'Even global delivery activation cannot release supervisor email');
select throws_ok($$update msrc_outbox.messages set delivery_hold=false where template_key='abstract_supervisor'$$,'23514',null,'No implicit real-delivery path');
select is(public.msrc_staff_research_confirm_screening('synthetic-ai-supervisor',pg_temp.advisory_id(9601),1,4,pg_temp.advisory_id(9607),pg_temp.screening_input()||'{"investigation":true,"investigationNote":"Synthetic investigation"}'::jsonb)->>'state','updated','Later investigation closes eligibility');
select ok(not msrc_abstracts.supervisor_eligible((select outbox_id from msrc_abstracts.supervisor_notifications)),'Eligibility rechecked after human status changes');
select is((select count(*) from msrc_abstracts.audit where event='supervisor.notification_queued'),1::bigint,'Notification enqueue audited once');
select throws_ok($$update msrc_abstracts.advisory_confirmations set marker='changed'$$,'55000',null,'Confirmations immutable');
select * from finish();
rollback;
