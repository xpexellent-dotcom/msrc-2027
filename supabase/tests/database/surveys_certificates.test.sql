-- ENG-075; CRT-01..06, AT-14. Disposable synthetic fixtures; always rolled back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
\ir ../support/workshop-fixtures.psql

select is((select count(*) from msrc_certificates.settings),0::bigint,'No activation or retention settings seeded');
select is((select count(*) from msrc_certificates.surveys),0::bigint,'No invented surveys or questions seeded');
select is((select count(*) from msrc_certificates.templates),0::bigint,'No approval/signature seeded');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='msrc_certificates' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'Every certificates table forces RLS');
select is((select count(*) from pg_policies where schemaname='msrc_certificates'),0::bigint,'No client table policies');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name) where has_schema_privilege(r.name,'msrc_certificates','USAGE')),'No API role can use private schema, including application Super Admin');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated'),('service_role')) r(name) where n.nspname='msrc_certificates' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No API raw data grants');
select ok(not exists(select 1 from pg_proc p where p.pronamespace='msrc_certificates'::regnamespace and p.prosecdef and not('search_path=""'=any(p.proconfig))),'Every definer pins empty search_path');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.pronamespace='msrc_certificates'::regnamespace and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),'All private helpers ungranted');
select ok(not has_function_privilege('authenticated','public.msrc_certificates_participant_manage(text,jsonb,jsonb)','EXECUTE'),'Cannot forge participant claims through client RPC');
select ok(has_function_privilege('service_role','public.msrc_certificates_participant_manage(text,jsonb,jsonb)','EXECUTE'),'Participant transport is service-only');
select ok(not has_function_privilege('authenticated','public.msrc_certificates_verify(text,text)','EXECUTE'),'Verification uses rate-limited server boundary');
select ok(not has_function_privilege('authenticated','public.msrc_certificates_generation_claim(uuid,integer)','EXECUTE'),'Generation server-only');
select results_eq($$select column_name::text from information_schema.columns where table_schema='msrc_certificates' and table_name='answers' order by ordinal_position$$,
 $$values('survey_id'::text),('question_id'::text),('value'::text),('answer_date'::text)$$,'S2 answers contain only categorical survey/question, value, date');
select results_eq($$select column_name::text from information_schema.columns where table_schema='msrc_certificates' and table_name='completions' order by ordinal_position$$,
 $$values('survey_id'::text),('actor_id'::text)$$,'S2 completion stores no response ID, token, date or correlated timestamp');
select is((select count(*) from pg_constraint where conrelid='msrc_certificates.answers'::regclass and contype='f'),0::bigint,'S2 answers have no FK edge/path to actors');
select ok(not exists(select 1 from pg_index where indrelid='msrc_certificates.answers'::regclass and indisunique),'S2 answers have no response identity/grouping key');
select ok(not exists(select 1 from information_schema.columns where table_schema='msrc_certificates' and column_name~'(hours|accredit|cme)'),'No hours/accreditation fields');
set local role anon;
select throws_ok($$select public.msrc_staff_certificates_read('synthetic-certificates')$$,'42501',null,'Anonymous staff read denied');
select throws_ok($$select public.msrc_certificates_verify(repeat('a',64),repeat('b',64))$$,'42501',null,'Anonymous cannot bypass server rate key');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-certificates');
select pg_temp.workshop_settings('synthetic-certificates');
update msrc_registration.settings set conference_days=array[date '2040-01-01',date '2040-01-02'] where edition_key='synthetic-certificates';
do $$declare n integer;begin for n in 7511..7513 loop perform pg_temp.registration_fixture(n,'synthetic-certificates');end loop;end$$;
select pg_temp.registration_staff_fixture(7591,'synthetic-certificates');
select pg_temp.registration_staff_fixture(7592,'synthetic-certificates','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(7593,'synthetic-certificates','checkInStaff');
select pg_temp.registration_staff_fixture(7594,'synthetic-certificates','abstractReviewer');
do $$declare n integer;begin for n in 7511..7513 loop perform pg_temp.registration_submit('synthetic-certificates',n,md5(n::text)||md5(n::text));end loop;end$$;
update msrc_registration.requests set status='confirmed' where edition_key='synthetic-certificates';
insert into msrc_registration.tickets(request_id,secret_hash)
 select r.id,sha256(convert_to(r.id::text,'UTF8')) from msrc_registration.requests r where r.edition_key='synthetic-certificates'
 and not exists(select 1 from msrc_registration.tickets t where t.request_id=r.id);
insert into msrc_registration.attendance(ticket_id,conference_day,performer_id,method)
 select t.id,date '2040-01-01',pg_temp.registration_actor(7593),'scan' from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id where r.edition_key='synthetic-certificates';
insert into msrc_registration.attendance(ticket_id,conference_day,performer_id,method)
 select t.id,date '2040-01-02',pg_temp.registration_actor(7593),'scan' from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id where r.edition_key='synthetic-certificates' and r.actor_id in(pg_temp.registration_actor(7512),pg_temp.registration_actor(7513));
select pg_temp.workshop_fixture('synthetic-certificates',75,0,3);
insert into msrc_workshops.bookings(workshop_id,actor_id,status,approved_at,approved_by,payment_kind,paid_at,checked_in_at,checked_in_by)
 values(pg_temp.workshop_id(75),pg_temp.registration_actor(7511),'confirmed',clock_timestamp(),pg_temp.registration_actor(7592),'free',clock_timestamp(),clock_timestamp(),pg_temp.registration_actor(7593));

create function pg_temp.certificate_staff(n integer,input jsonb) returns jsonb language plpgsql as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);
 result:=public.msrc_staff_certificates_manage('synthetic-certificates',input||jsonb_build_object('operationId',coalesce(input->>'operationId',gen_random_uuid()::text)));
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;
create function pg_temp.certificate_read(n integer) returns jsonb language plpgsql as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);
 result:=public.msrc_staff_certificates_read('synthetic-certificates');
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;
select is(pg_temp.certificate_read(7593)->>'state','denied','Check-in staff cannot view certificate identities');
select is(pg_temp.certificate_read(7594)->>'state','denied','Reviewer cannot view certificate identities');
select is(pg_temp.certificate_read(7592)->>'state','ready','Authorized nonreview staff can inspect eligibility');
select is(pg_temp.certificate_staff(7592,jsonb_build_object('action','saveTemplate'))->>'state','denied','Only Super Admin edits templates');
select is(pg_temp.certificate_staff(7592,jsonb_build_object('action','release'))->>'state','denied','Only Super Admin releases');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','settings','settings',jsonb_build_object('enabled',true,'surveysEnabled',true)))->>'state','closed','Staff cannot activate closed workflow');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','saveSurvey','survey',jsonb_build_object('kind','conference','workshopId',null,'titleEn','Synthetic general survey','titleAr','استبيان تجريبي','version',0,'published',false,'deadline',null,'questions','[]'::jsonb)))->>'state','saved','Empty editable conference survey has no invented questions');
select is((select questions from msrc_certificates.surveys where kind='conference'),'[]'::jsonb,'Empty survey template retained');
select ok(not (select published from msrc_certificates.surveys where kind='conference'),'Empty template remains unpublished');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','saveSurvey','survey',jsonb_build_object('id',(select id from msrc_certificates.surveys where kind='conference'),'kind','conference','workshopId',null,'titleEn','Synthetic general survey','titleAr','استبيان تجريبي','version',1,'published',true,'deadline',clock_timestamp()+interval '1 day','questions','[]'::jsonb)))->>'state','invalid','Cannot publish empty question set');
update msrc_certificates.settings set enabled=true,surveys_enabled=true,unlinking_approved=true,feedback_retention_days=30,download_retention_days=30,verification_retention_days=365;
update msrc_certificates.surveys set published=true,deadline=clock_timestamp()+interval '1 day',questions='[{"id":"rating","type":"rating_scale","labelEn":"Synthetic rating","labelAr":"تقييم تجريبي","required":true,"scaleMin":1,"scaleMax":7},{"id":"text","type":"short_text","labelEn":"Synthetic text","labelAr":"نص تجريبي","required":false}]'::jsonb where kind='conference';
insert into msrc_certificates.surveys(edition_key,kind,workshop_id,title_en,title_ar,published,deadline,questions)
 values('synthetic-certificates','workshop',pg_temp.workshop_id(75),'Synthetic workshop survey','استبيان ورشة تجريبي',true,clock_timestamp()+interval '1 day',
 '[{"id":"choice","type":"single_choice","labelEn":"Synthetic choice","labelAr":"اختيار تجريبي","required":true,"options":[{"value":"a","labelEn":"Synthetic A","labelAr":"تجريبي أ"},{"value":"b","labelEn":"Synthetic B","labelAr":"تجريبي ب"}]}]'::jsonb);
create function pg_temp.certificate_survey(n integer,kind text,answers jsonb) returns jsonb language sql as $$
 select public.msrc_certificates_participant_manage('synthetic-certificates',pg_temp.registration_claims(n),jsonb_build_object('action','submitSurvey','surveyId',(select s.id from msrc_certificates.surveys s where s.kind=$2),'answers',$3));
$$;
select is(public.msrc_certificates_participant_read('synthetic-certificates',pg_temp.registration_claims(7511)||jsonb_build_object('session_id',pg_temp.registration_session(7512)))->>'state','denied','Foreign session cannot read participant evidence');
select is(pg_temp.certificate_survey(7511,'conference','{}'::jsonb)->>'state','invalid','Missing required answer does not grant completion');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":9}'::jsonb)->>'state','invalid','Out-of-scale answer rejected');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"extra":"bad"}'::jsonb)->>'state','invalid','Unknown question rejected');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"text":"me@example.invalid"}'::jsonb)->>'state','identifying_text','Email rejected from free text');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"text":"192.0.2.1"}'::jsonb)->>'state','identifying_text','IP rejected from free text');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"text":"2001:db8::1"}'::jsonb)->>'state','identifying_text','Compressed IPv6 rejected from free text');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"text":"fe80::1"}'::jsonb)->>'state','identifying_text','Link-local IPv6 rejected from free text');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"text":"::1"}'::jsonb)->>'state','identifying_text','Loopback IPv6 rejected from free text');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"text":"2001:db8:1234:5678:90ab:cdef:1234:5678"}'::jsonb)->>'state','identifying_text','Expanded IPv6 rejected from free text');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"text":"Synthetic adult"}'::jsonb)->>'state','identifying_text','Known profile name rejected from free text');
select is(pg_temp.certificate_survey(7511,'conference',jsonb_build_object('rating',3,'text',pg_temp.registration_actor(7511)::text))->>'state','identifying_text','Account UUID rejected from free text');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3,"text":"Synthetic unlinked feedback"}'::jsonb)->>'state','completed','Valid feedback and completion accepted atomically');
select is((select count(*) from msrc_certificates.answers),2::bigint,'Answers stored separately per question');
select is((select count(*) from msrc_certificates.completions),1::bigint,'One completion credit');
select is((select count(*) from msrc_certificates.operations where actor_id=pg_temp.registration_actor(7511)),0::bigint,'No participant response fingerprint or idempotency mapping retained');
select is((select count(*) from msrc_certificates.audit where performer_id=pg_temp.registration_actor(7511)),0::bigint,'No correlated submission audit');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":5}'::jsonb)->>'state','completed','Retry is idempotent even when values differ');
select is((select count(*) from msrc_certificates.answers),2::bigint,'Retry inserts no duplicate feedback');
select is((select count(*) from msrc_certificates.completions),1::bigint,'Retry grants credit once');
select ok((select bool_and(answer_date=(clock_timestamp() at time zone 'Asia/Riyadh')::date) from msrc_certificates.answers),'Answers coarsened to Riyadh date');
select ok((msrc_certificates.eligibility('synthetic-certificates',pg_temp.registration_actor(7511),'conference')->'reasons') ? 'both_days_required','One day plus survey still ineligible');
select ok((msrc_certificates.eligibility('synthetic-certificates',pg_temp.registration_actor(7512),'conference')->'reasons') ? 'general_survey_required','Both days without survey ineligible');
select is(pg_temp.certificate_survey(7513,'conference','{"rating":4}'::jsonb)->>'state','completed','Two-day attendee completes general survey');
select is(msrc_certificates.eligibility('synthetic-certificates',pg_temp.registration_actor(7513),'conference')->>'eligible','true','Both days plus general survey eligible');
update auth.users set banned_until=clock_timestamp()+interval '1 day' where id=pg_temp.registration_actor(7513);
select is(msrc_certificates.eligibility('synthetic-certificates',pg_temp.registration_actor(7513),'conference')->>'eligible','false','Preview eligibility rejects currently banned account like release');
update auth.users set banned_until=null where id=pg_temp.registration_actor(7513);
select is(pg_temp.certificate_survey(7511,'workshop','{"choice":"a"}'::jsonb)->>'state','completed','Booked workshop attendee completes relevant survey');
select ok((msrc_certificates.eligibility('synthetic-certificates',pg_temp.registration_actor(7511),'workshop',pg_temp.workshop_id(75))->'reasons') ? 'workshop_completion_required','Workshop without completion confirmation ineligible');
update msrc_workshops.bookings set completed_at=clock_timestamp(),completed_by=pg_temp.registration_actor(7592) where workshop_id=pg_temp.workshop_id(75);
select is(msrc_certificates.eligibility('synthetic-certificates',pg_temp.registration_actor(7511),'workshop',pg_temp.workshop_id(75))->>'eligible','true','Workshop eligibility independent of full conference certificate');
select ok(not (pg_temp.certificate_read(7591)::text~'Synthetic unlinked feedback'),'Even Super Admin projection contains no feedback answer values');
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_certificates_participant_read('synthetic-certificates',pg_temp.registration_claims(7511))->'surveys') s where s ? 'completionCount'),'Participant has no small-group completion counts');

insert into msrc_certificates.templates(edition_key,kind,title_en,title_ar,signature) values
 ('synthetic-certificates','conference','Full Two-Day Conference Attendance','حضور المؤتمر لكلا اليومين','Synthetic signature'),
 ('synthetic-certificates','workshop','Workshop Participation','المشاركة في ورشة عمل','Synthetic signature');
select throws_ok($$insert into msrc_certificates.templates(edition_key,kind,title_en,title_ar) values('synthetic-certificates','one_day','One day','يوم واحد')$$,'23514',null,'No one-day or role/competition template kinds');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','release','templateId',(select id from msrc_certificates.templates where kind='conference'),'expectedVersion',1,'workshopId',null))->>'state','approval_required','Release cannot bypass signature/template approval');
select is((select count(*) from msrc_certificates.certificates),0::bigint,'No certificate before release approval');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','approveTemplate','templateId',(select id from msrc_certificates.templates where kind='conference')))->>'state','conflict','Approval must bind the template version shown');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','approveTemplate','templateId',(select id from msrc_certificates.templates where kind='conference'),'expectedVersion',2))->>'state','conflict','Approval rejects a stale/unseen template version');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','approveTemplate','templateId',(select id from msrc_certificates.templates where kind='conference'),'expectedVersion',1))->>'state','saved','Super Admin approves the viewed signature/template version');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','release','templateId',(select id from msrc_certificates.templates where kind='conference'),'workshopId',null))->>'state','conflict','Release requires the version shown in preview');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','release','templateId',(select id from msrc_certificates.templates where kind='conference'),'expectedVersion',2,'workshopId',null))->>'state','conflict','Release rejects stale/unseen template version');
create temp table certificate_results(key text primary key,value jsonb);
insert into certificate_results values('release',pg_temp.certificate_staff(7591,jsonb_build_object('action','release','operationId','b7500000-0000-4000-8000-000000000001','templateId',(select id from msrc_certificates.templates where kind='conference'),'expectedVersion',1,'workshopId',null)));
select is((select value->>'count' from certificate_results where key='release'),'1','Release prepares exactly eligible two-day attendee');
select is((select status from msrc_certificates.certificates where kind='conference'),'pending','Durable pending generation before PDF success');
select ok(not exists(select 1 from jsonb_array_elements(pg_temp.certificate_read(7591)->'eligibility') e where e->>'actorId'=pg_temp.registration_actor(7513)::text and e->>'kind'='conference'),'Staff pending-release preview excludes already pending certificate');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','release','operationId','b7500000-0000-4000-8000-000000000001','templateId',(select id from msrc_certificates.templates where kind='conference'),'expectedVersion',1,'workshopId',null)),(select value from certificate_results where key='release'),'Release retry preserves exact receipt');
select is((select count(*) from msrc_certificates.certificates),1::bigint,'Idempotent release issues no duplicate');
select is(public.msrc_certificates_verify((select code from msrc_certificates.certificates),repeat('c',64))->>'state','not_found','Pending PDF is not publicly valid');
insert into certificate_results values('claim',public.msrc_certificates_generation_claim('b7500000-0000-4000-8000-000000000002',10));
select is(jsonb_array_length(public.msrc_certificates_generation_claim('b7500000-0000-4000-8000-000000000003',10)),0,'Concurrent worker cannot take live generation lease');
update msrc_registration.attendance a set undone_at=clock_timestamp(),undone_by=pg_temp.registration_actor(7593),undo_reason='Synthetic evidence correction before generation'
 from msrc_registration.tickets t,msrc_registration.requests r where a.ticket_id=t.id and t.request_id=r.id and r.actor_id=pg_temp.registration_actor(7513) and a.conference_day=date '2040-01-02';
select is(public.msrc_certificates_generation_finish((select id from msrc_certificates.certificates),'b7500000-0000-4000-8000-000000000002',((select value from certificate_results where key='claim')->0->>'leaseToken')::uuid,encode(convert_to('%PDF-1.7 synthetic','UTF8'),'base64'))->>'state','ineligible','Evidence undone after release cannot issue a certificate');
select is((select status from msrc_certificates.certificates),'pending','Failed live eligibility preserves recoverable pending generation');
update msrc_registration.attendance a set undone_at=null,undone_by=null,undo_reason=null
 from msrc_registration.tickets t,msrc_registration.requests r where a.ticket_id=t.id and t.request_id=r.id and r.actor_id=pg_temp.registration_actor(7513) and a.conference_day=date '2040-01-02';
select is(public.msrc_certificates_generation_finish((select id from msrc_certificates.certificates),'b7500000-0000-4000-8000-000000000002',gen_random_uuid(),encode(convert_to('%PDF-1.7 synthetic','UTF8'),'base64'))->>'state','denied','Foreign lease cannot issue');
select is(public.msrc_certificates_generation_finish((select id from msrc_certificates.certificates),'b7500000-0000-4000-8000-000000000002',((select value from certificate_results where key='claim')->0->>'leaseToken')::uuid,encode(convert_to('%PDF-1.7 synthetic'||repeat('x',100),'UTF8'),'base64'))->>'state','issued','Valid generation atomically stores private PDF and held notice');
select is((select count(*) from msrc_outbox.messages where template_key='certificate_notice' and delivery_hold and status='queued'),1::bigint,'English certificate email queued under independent DRAFT hold');
select is((select locale from msrc_outbox.messages where template_key='certificate_notice'),'en','Requested certificate email English only');
select is(public.msrc_certificates_download('synthetic-certificates',pg_temp.registration_claims(7511),(select id from msrc_certificates.certificates))->>'state','not_found','Other participant cannot download by ID');
select is(public.msrc_certificates_download('synthetic-certificates',pg_temp.registration_claims(7513),(select id from msrc_certificates.certificates))->>'state','ready','Recipient can privately download');
select ok(strpos(public.msrc_certificates_download('synthetic-certificates',pg_temp.registration_claims(7513),(select id from msrc_certificates.certificates))->>'pdfBase64',chr(10))=0,'Private PDF base64 omits PostgreSQL line wraps');
insert into certificate_results values('verify',public.msrc_certificates_verify((select code from msrc_certificates.certificates),repeat('d',64)));
select results_eq($$select jsonb_object_keys(value) from certificate_results where key='verify' order by 1$$,
 $$values('activity'::text),('certificate_type'::text),('edition'::text),('recipient_name'::text),('validity'::text)$$,'Public projection exposes exactly five approved fields');
select is((select value->>'validity' from certificate_results where key='verify'),'valid','Issued certificate publicly valid');
select ok((select code~'^[a-f0-9]{64}$' from msrc_certificates.certificates),'Opaque 244-bit random code prevents predictable enumeration');
do $$begin for n in 1..30 loop perform public.msrc_certificates_verify(repeat('0',64),repeat('e',64));end loop;end$$;
select is(public.msrc_certificates_verify(repeat('0',64),repeat('e',64))->>'state','rate_limited','Verification rate limited across codes within bucket');
select is((select count(*) from information_schema.columns where table_schema='msrc_certificates' and table_name='verify_limits' and column_name~'(code|actor|email|response|ip)'),0::bigint,'Abuse counters contain no raw code/IP or actor/response');

select is(public.msrc_certificates_participant_manage('synthetic-certificates',pg_temp.registration_claims(7511),jsonb_build_object('action','requestCorrection','certificateId',(select id from msrc_certificates.certificates),'requestedName','Synthetic corrected name'))->>'state','not_found','Cannot correct another recipient certificate');
select is(public.msrc_certificates_participant_manage('synthetic-certificates',pg_temp.registration_claims(7513),jsonb_build_object('action','requestCorrection','certificateId',(select id from msrc_certificates.certificates),'requestedName','Synthetic corrected name'))->>'state','saved','Recipient requests verified name correction');
select is(pg_temp.certificate_staff(7592,jsonb_build_object('action','approveCorrection','correctionId',(select id from msrc_certificates.corrections),'reason','Synthetic verified name evidence'))->>'state','denied','Non-Super Admin cannot release replacement');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','approveCorrection','correctionId',(select id from msrc_certificates.corrections),'reason','Synthetic verified name evidence'))->>'state','reissued','Verified correction revokes original and prepares replacement with audit');
select is((select count(*) from msrc_certificates.certificates),2::bigint,'Correction creates separate certificate');
select is(public.msrc_certificates_verify((select code from msrc_certificates.certificates where status='replaced'),repeat('f',64))->>'validity','replaced','Original public verification shows replaced');
select is((select recipient_name from msrc_certificates.certificates where status='pending'),'Synthetic corrected name','Replacement freezes approved name');
select isnt((select code from msrc_certificates.certificates where status='pending'),(select code from msrc_certificates.certificates where status='replaced'),'Replacement gets new opaque code');
insert into certificate_results values('replacementClaim',public.msrc_certificates_generation_claim('b7500000-0000-4000-8000-000000000002',10));
select is(public.msrc_certificates_generation_finish((select id from msrc_certificates.certificates where status='pending'),'b7500000-0000-4000-8000-000000000002',((select value from certificate_results where key='replacementClaim')->0->>'leaseToken')::uuid,encode(convert_to('%PDF-1.7 synthetic replacement','UTF8'),'base64'))->>'state','issued','Replacement generated through same durable issuance path');
select is(pg_temp.certificate_staff(7592,jsonb_build_object('action','revoke','certificateId',(select id from msrc_certificates.certificates where status='issued'),'reason','Synthetic certificate revocation'))->>'state','revoked','Authorized staff can revoke with reason');
select is(public.msrc_certificates_verify((select code from msrc_certificates.certificates where status='revoked'),repeat('1',64))->>'validity','revoked','Revoked public verification remains revoked');
select is(public.msrc_certificates_download('synthetic-certificates',pg_temp.registration_claims(7513),(select id from msrc_certificates.certificates where status='revoked'))->>'state','not_found','Revoked private download blocked');
select throws_ok($$update msrc_certificates.certificates set recipient_name='Changed' where status='replaced'$$,'42501',null,'Original recipient snapshot immutable');
select throws_ok($$update msrc_certificates.certificates set status='issued' where status='revoked'$$,'42501',null,'Revocation cannot be reversed');
select throws_ok($$delete from msrc_certificates.audit$$,'55000',null,'Audit append-only');
select ok(exists(select 1 from msrc_certificates.audit where event='correction.approveCorrection'),'Correction/reissue audited');
select ok(exists(select 1 from msrc_certificates.audit where event='certificate.revoked'),'Revocation audited');
select throws_ok($$update msrc_outbox.messages set delivery_hold=false where template_key='certificate_notice'$$,'23514',null,'DRAFT mail cannot be unheld through generic outbox state');

select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','approveTemplate','templateId',(select id from msrc_certificates.templates where kind='workshop'),'expectedVersion',1))->>'state','saved','Workshop template independently approved');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','release','templateId',(select id from msrc_certificates.templates where kind='workshop'),'expectedVersion',1,'workshopId',pg_temp.workshop_id(75)))->>'count','1','Release workshop certificate for one-day conference attendee with all workshop evidence');
insert into certificate_results values('workshopClaim',public.msrc_certificates_generation_claim('b7500000-0000-4000-8000-000000000002',10));
select is(public.msrc_certificates_generation_finish((select id from msrc_certificates.certificates where kind='workshop'),'b7500000-0000-4000-8000-000000000002',((select value from certificate_results where key='workshopClaim')->0->>'leaseToken')::uuid,encode(convert_to('%PDF-1.7 synthetic workshop','UTF8'),'base64'))->>'state','issued','Workshop generates and issues through same approved path');
select is(public.msrc_certificates_download('synthetic-certificates',pg_temp.registration_claims(7511),(select id from msrc_certificates.certificates where kind='workshop'))->>'state','ready','Workshop recipient can download without full two-day certificate');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','saveTemplate','template',jsonb_build_object('id',(select id from msrc_certificates.templates where kind='workshop'),'kind','workshop','version',1,'titleEn','Workshop Participation','titleAr','المشاركة في ورشة عمل','signature','Synthetic revised signature')))->>'state','saved','Editing a previously viewed template increments version and clears approval');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','approveTemplate','templateId',(select id from msrc_certificates.templates where kind='workshop'),'expectedVersion',1))->>'state','conflict','A stale approval cannot approve a signature edited after preview');
select is(pg_temp.certificate_staff(7591,jsonb_build_object('action','release','templateId',(select id from msrc_certificates.templates where kind='workshop'),'expectedVersion',1,'workshopId',pg_temp.workshop_id(75)))->>'state','conflict','A stale release cannot release a template edited after preview');
update msrc_certificates.certificates set download_until=clock_timestamp()-interval '1 second' where kind='workshop';
select is(public.msrc_certificates_download('synthetic-certificates',pg_temp.registration_claims(7511),(select id from msrc_certificates.certificates where kind='workshop'))->>'state','not_found','Private PDF access expires independently');
select is(public.msrc_certificates_verify((select code from msrc_certificates.certificates where kind='workshop'),repeat('3',64))->>'validity','valid','Public verification outlives private PDF policy where configured');
select is(public.msrc_certificates_maintenance()->>'pdfsPurged','1','Bounded maintenance deletes expired private PDF bytes');
select ok((select pdf is null and status='issued' from msrc_certificates.certificates where kind='workshop'),'Expired PDF purge preserves public validity record');
update msrc_certificates.certificates set verify_until=clock_timestamp()-interval '1 second' where kind='workshop';
select is(public.msrc_certificates_verify((select code from msrc_certificates.certificates where kind='workshop'),repeat('4',64))->>'state','not_found','Public verification retention enforced independently');

insert into msrc_certificates.answers(survey_id,question_id,value,answer_date) values((select id from msrc_certificates.surveys where kind='conference'),'text','"Synthetic expired feedback"'::jsonb,(clock_timestamp() at time zone 'Asia/Riyadh')::date-31);
select is(public.msrc_certificates_maintenance()->>'feedbackPurged','1','Bounded maintenance purges feedback by configured coarse-date retention');
select is((select count(*) from msrc_certificates.completions),3::bigint,'Feedback purge preserves participant completion evidence');
update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=pg_temp.registration_session(7511);
select is(public.msrc_certificates_participant_read('synthetic-certificates',pg_temp.registration_claims(7511))->>'state','denied','Current native session expiry denies read despite forwarded unexpired JWT');
select is(pg_temp.certificate_survey(7511,'conference','{"rating":3}'::jsonb)->>'state','denied','Native expiry prevents replayed completion read/mutation');
update auth.sessions set not_after=null where id=pg_temp.registration_session(7511);
update msrc_certificates.settings set enabled=false;
select is(public.msrc_certificates_participant_read('synthetic-certificates',pg_temp.registration_claims(7511))->>'state','closed','Disabled database gate closes participant area');
select is(public.msrc_certificates_verify((select code from msrc_certificates.certificates where status='revoked'),repeat('2',64))->>'state','not_found','Closed edition exposes no certificate identity');

select * from finish();
rollback;
