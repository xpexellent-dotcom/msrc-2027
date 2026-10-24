-- ENG-079; ADM-01..05. Synthetic rollback fixtures; never execute against hosted data.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
\ir ../support/abstract-fixtures.psql

select is((select count(*) from msrc_staff.reporting_audit),0::bigint,'Reporting migration seeds no personal data or receipts');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='msrc_staff.reporting_audit'::regclass),'Reporting audit forces RLS');
select is((select count(*) from pg_policies where schemaname='msrc_staff' and tablename='reporting_audit'),0::bigint,'Reporting audit has no client policies');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
 where has_table_privilege(name,'msrc_staff.reporting_audit','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'API roles have no direct audit access');
select ok(not exists(select 1 from pg_proc p where p.pronamespace='msrc_staff'::regnamespace and p.proname like 'reporting_%'
 and not('search_path=""'=any(p.proconfig))),'All reporting helpers pin empty search path');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.pronamespace='msrc_staff'::regnamespace and p.proname like 'reporting_%'
 and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),'Private reporting helpers have no API execute grants');
select is((select count(*) from pg_proc p where p.pronamespace='public'::regnamespace and p.proname like 'msrc_staff_dashboard%'
 and has_function_privilege('authenticated',p.oid,'EXECUTE')),4::bigint,'Authenticated callers reach four independently guarded reporting RPCs');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.pronamespace='public'::regnamespace and p.proname like 'msrc_staff_dashboard%'
 and a.grantee in(0,'anon'::regrole,'service_role'::regrole)),'No PUBLIC, anonymous or service-role reporting grants');
set local role anon;
select throws_ok($$select public.msrc_staff_dashboard('synthetic-reporting')$$,'42501',null,'Anonymous dashboard denied');
select throws_ok($$select public.msrc_staff_dashboard_find('synthetic-reporting','person@example.invalid')$$,'42501',null,'Anonymous lookup denied');
select throws_ok($$select public.msrc_staff_dashboard_export('synthetic-reporting','all')$$,'42501',null,'Anonymous export denied');
select throws_ok($$select public.msrc_staff_dashboard_audit('synthetic-reporting')$$,'42501',null,'Anonymous audit denied');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-reporting');
select pg_temp.registration_settings('synthetic-reporting-other');
do $$declare n integer;begin
 for n in 9901..9907 loop perform pg_temp.registration_fixture(n,'synthetic-reporting');end loop;
 perform pg_temp.registration_fixture(9908,'synthetic-reporting-other');
end$$;
-- Sessions are established in their own statements before any authorization RPC.
select pg_temp.registration_staff_fixture(9950,'synthetic-reporting');
select pg_temp.registration_staff_fixture(9951,'synthetic-reporting','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(9952,'synthetic-reporting','finance');
select pg_temp.registration_staff_fixture(9953,'synthetic-reporting','scientificAdministrator');
select pg_temp.registration_staff_fixture(9954,'synthetic-reporting','abstractReviewer');
select pg_temp.registration_staff_fixture(9955,'synthetic-reporting','hackathonReviewer');
select pg_temp.registration_staff_fixture(9956,'synthetic-reporting','threeMinuteThesisReviewer');
select pg_temp.registration_staff_fixture(9957,'synthetic-reporting','facultyJudge');
select pg_temp.registration_staff_fixture(9958,'synthetic-reporting','judgingCommittee');
select pg_temp.registration_staff_fixture(9959,'synthetic-reporting','checkInStaff');
select pg_temp.registration_staff_fixture(9960,'synthetic-reporting','contentMediaEditor');
select pg_temp.registration_staff_fixture(9961,'synthetic-reporting','sponsorshipPr');
select pg_temp.registration_staff_fixture(9962,'synthetic-reporting','registrationWorkshopAdministrator');
delete from msrc_staff_email.receipts where actor_id=pg_temp.registration_actor(9962);

-- Scope-specific fixtures must bind their email proof to the final grant set.
create function pg_temp.reporting_scoped_staff(n integer,role_name text,scope_kind text,scope_target text) returns void language plpgsql as $$
declare actor uuid:=pg_temp.registration_actor(n);sid uuid:=pg_temp.registration_session(n);challenge uuid:=gen_random_uuid();evidence jsonb;begin
 insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous)
 values(actor,'reporting-scoped-'||n||'@example.invalid',now(),'synthetic-staff-password',now(),now(),false);
 insert into msrc_authorization.account_access(actor_id,state,individually_identified) values(actor,'active',true);
 insert into msrc_staff.profiles(actor_id,name) values(actor,'Synthetic scoped reporting staff');
 insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,scope_target,grant_reason)
 values(actor,'synthetic-reporting',role_name,scope_kind,scope_target,'Synthetic scoped reporting fixture');
 insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(sid,actor,date_trunc('second',now()-interval '2 minutes'),now(),'aal1');
 insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 values(gen_random_uuid(),sid,'password',date_trunc('second',now()-interval '2 minutes'),date_trunc('second',now()-interval '2 minutes'));
 evidence:=msrc_staff_email.basis(actor,sid);
 insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at,state,verified_at)
 values(challenge,actor,sid,evidence->>'binding',repeat('a',64),repeat('a',64),now()-interval '1 minute',now()+interval '4 minutes','verified',now()-interval '30 seconds');
 insert into msrc_staff_email.receipts(session_id,actor_id,challenge_id,binding,verified_at)
 values(sid,actor,challenge,evidence->>'binding',now()-interval '30 seconds');
end$$;
select pg_temp.reporting_scoped_staff(9963,'registrationWorkshopAdministrator','resource','synthetic-one-resource');
select pg_temp.reporting_scoped_staff(9964,'abstractReviewer','assignment','e7910000-0000-4000-8000-000000000001');
select pg_temp.reporting_scoped_staff(9965,'abstractReviewer','assignment','e7910000-0000-4000-8000-000000000101');

insert into msrc_registration.requests(edition_key,actor_id,terms_version,status)
 select 'synthetic-reporting',pg_temp.registration_actor(n),'synthetic-terms',case when n=9907 then 'approved' else 'pending_approval' end
 from generate_series(9901,9907) n;
insert into msrc_registration.requests(edition_key,actor_id,terms_version,status)
 values('synthetic-reporting-other',pg_temp.registration_actor(9908),'synthetic-terms','approved');
-- Closed module fixtures need no operational settings values or enabled flags.
insert into msrc_abstracts.settings(edition_key,version,configuration) values('synthetic-reporting',1,pg_temp.abstract_settings());
insert into msrc_abstracts.settings_versions(edition_key,version,configuration) values('synthetic-reporting',1,pg_temp.abstract_settings());
insert into msrc_abstracts.submissions(id,edition_key,actor_id,version,document,status,reference,word_count)
 select ('e7900000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'synthetic-reporting',pg_temp.registration_actor(9901),1,
 pg_temp.abstract_document(),'submitted','SYNTHETIC-RPT-'||n,8 from generate_series(1,6) n;
insert into msrc_abstracts.snapshots(submission_id,version,document,word_count,settings_version)
 select id,1,document,8,1 from msrc_abstracts.submissions where edition_key='synthetic-reporting';
insert into msrc_abstracts.packets(submission_id,submission_version,packet,prepared_by)
 select id,1,pg_temp.abstract_packet(),pg_temp.registration_actor(9953) from msrc_abstracts.submissions where edition_key='synthetic-reporting';
insert into msrc_abstracts.assignments(id,edition_key,submission_id,submission_version,rubric_version,reviewer_id,status)
 select ('e7910000-0000-4000-8000-'||lpad(row_number() over(order by id)::text,12,'0'))::uuid,
 'synthetic-reporting',id,1,1,case when reference='SYNTHETIC-RPT-6' then pg_temp.registration_actor(9955) else pg_temp.registration_actor(9954) end,'completed'
 from msrc_abstracts.submissions where edition_key='synthetic-reporting';
insert into msrc_abstracts.assignments(id,edition_key,submission_id,submission_version,rubric_version,reviewer_id,status)
 select ('e7910000-0000-4000-8000-'||lpad((100+row_number() over(order by id))::text,12,'0'))::uuid,
 'synthetic-reporting',id,1,1,pg_temp.registration_actor(9965),'assigned'
 from msrc_abstracts.submissions where edition_key='synthetic-reporting' and reference in('SYNTHETIC-RPT-1','SYNTHETIC-RPT-2');
insert into msrc_workshops.settings(edition_key) values('synthetic-reporting');
insert into msrc_workshops.workshops(id,edition_key) values('e7920000-0000-4000-8000-000000000001','synthetic-reporting');
insert into msrc_workshops.bookings(id,workshop_id,actor_id,status)
 values('e7930000-0000-4000-8000-000000000001','e7920000-0000-4000-8000-000000000001',pg_temp.registration_actor(9901),'waitlisted');
insert into msrc_workshops.orders(booking_id,kind,price_minor,due_minor,currency,actor_id)
 values('e7930000-0000-4000-8000-000000000001','mock',0,0,'SAR',pg_temp.registration_actor(9901));
insert into msrc_competitions.settings(edition_key,kind,version,configuration) values('synthetic-reporting','hackathon',1,'{}'::jsonb);
insert into msrc_competitions.entries(id,edition_key,kind,lead_id,version,document,status)
 values('e7940000-0000-4000-8000-000000000001','synthetic-reporting','hackathon',pg_temp.registration_actor(9901),1,'{"title":"Synthetic reporting entry","pitch":"Synthetic pitch.","participationMode":"team","track":"translating_research","declarations":{"newIdea":true,"notPreviouslyEntered":true,"notPrizeWinning":true,"notFunded":true,"notCommerciallyLaunched":true,"authorityConfirmed":true}}'::jsonb,'accepted');
insert into msrc_competitions.roster(entry_id,actor_id,email,is_lead,confirmed)
 values('e7940000-0000-4000-8000-000000000001',pg_temp.registration_actor(9902),'registration-9902@example.invalid',false,true);

create function pg_temp.reporting_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',case when n=0 then '{}' else pg_temp.registration_claims(n)::text end,true);
end$$;
create function pg_temp.reporting_roles() returns setof text language plpgsql as $$
declare n integer;modules jsonb;expected jsonb;begin
 for n in 9950..9961 loop
 perform pg_temp.reporting_claim(n);
 return next ok(msrc_staff.authorize('synthetic-reporting',null,false) is not null,'Role matrix has genuinely assured staff session '||n);
 modules:=public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,modules}';
 expected:=case n
 when 9950 then '["registrations","accounts","orders","submissions","reviews","accepted","workshops","attendance","certificates","announcements","hackathon","three_minute_thesis","email_failures"]'::jsonb
 when 9951 then '["attendance","certificates","registrations","workshops"]'::jsonb
 when 9952 then '["orders"]'::jsonb
 when 9953 then '["accepted","hackathon","reviews","submissions","three_minute_thesis"]'::jsonb
 when 9958 then '["accepted","hackathon","three_minute_thesis"]'::jsonb
 when 9959 then '["attendance","workshops"]'::jsonb
 when 9960 then '[]'::jsonb when 9961 then '[]'::jsonb else '["reviews"]'::jsonb end;
 return next is(modules,expected,'Dashboard exposes only authorized module cards for role '||n);
 return next is(public.msrc_staff_dashboard_export('synthetic-reporting','all','aggregate')->>'state','ready','Role can export only its projected aggregate statistics '||n);
 if n<>9950 then
 return next is(public.msrc_staff_dashboard_find('synthetic-reporting','registration-9901@example.invalid')->>'state','denied','Participant lookup is Super Admin-only '||n);
 return next is(public.msrc_staff_dashboard_audit('synthetic-reporting')->>'state','denied','Unified audit is Super Admin-only '||n);
 return next is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','personal')->>'state','denied','Personal export is Super Admin-only '||n);
 end if;
 end loop;
end$$;
select * from pg_temp.reporting_roles();

select pg_temp.reporting_claim(9963);
select ok(msrc_staff.authorize('synthetic-reporting',null,false) is not null,'Narrow resource grant has valid staff session');
select is(public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,modules}','[]'::jsonb,'Narrow registration resource grant never becomes edition-wide statistics');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','operational')->>'state','denied','Narrow registration grant cannot export edition list');
select pg_temp.reporting_claim(9964);
select ok(msrc_staff.authorize('synthetic-reporting',null,false) is not null,'Assignment-scoped reviewer has valid staff session');
select is(public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,modules}','["reviews"]'::jsonb,'Assignment-scoped reviewer sees only own workload card');
select is(jsonb_array_length(public.msrc_staff_dashboard_export('synthetic-reporting','reviews','operational')->'rows'),0,'Assignment grant alone never exposes another assigned reviewer work');
select pg_temp.reporting_claim(9965);
select is(jsonb_array_length(public.msrc_staff_dashboard_export('synthetic-reporting','reviews','operational')->'rows'),1,'Reviewer own assignments still obey narrower assignment grant');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','reviews','operational')#>>'{rows,0,1}','e7910000-0000-4000-8000-000000000101','Assignment-scoped export includes only granted assignment');

select pg_temp.reporting_claim(0);
select is(public.msrc_staff_dashboard('synthetic-reporting')->>'state','denied','Missing identity cannot aggregate');
select pg_temp.reporting_claim(9901);
select is(public.msrc_staff_dashboard('synthetic-reporting')->>'state','denied','Participant has no organizer aggregates');
select pg_temp.reporting_claim(9962);
select is(public.msrc_staff_dashboard('synthetic-reporting')->>'state','denied','Missing exact-session regular-staff email evidence denies reporting');
select pg_temp.reporting_claim(9950);
select is(public.msrc_staff_dashboard('synthetic-reporting-other')->>'state','denied','Staff edition authority cannot aggregate another edition');
select is((select c->>'count' from jsonb_array_elements(public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,cells}') c where c->>'module'='accounts'),'7','Verified count excludes other-edition accounts');
select is((select c->>'count' from jsonb_array_elements(public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,cells}') c where c->>'module'='registrations' and c->>'value'='pending_approval'),'6','Super Admin sees exact registration partition');
select is((select c->>'count' from jsonb_array_elements(public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,cells}') c where c->>'module'='registrations' and c->>'value'='approved'),'1','Super Admin sees small cells without another edition leaking in');
select is((select c->>'count' from jsonb_array_elements(public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,cells}') c where c->>'module'='registrations' and c->>'value'='cancelled'),'0','Super Admin sees explicit zero cells');
select is((select c->>'count' from jsonb_array_elements(public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,cells}') c where c->>'module'='orders' and c->>'value'='mock_settled'),'1','Orders count only persisted mock settlement records');
set local role authenticated;
select is(public.msrc_staff_dashboard('synthetic-reporting')->>'state','ready','Actual authenticated API role executes guarded dashboard');
select throws_ok($$select * from msrc_staff.reporting_audit$$,'42501',null,'Authenticated role cannot bypass audit RPC projection');
reset role;
select pg_temp.reporting_claim(9951);
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_staff_dashboard('synthetic-reporting')#>'{dashboard,cells}') c where c->'count'<>'null'::jsonb),'Small and complementary dimension cells are suppressed for registrar');
select is(public.msrc_staff_dashboard('synthetic-reporting')#>>'{dashboard,suppressionThreshold}','5','Suppression threshold documented in RPC contract');
select is((select r->>3 from jsonb_array_elements(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','aggregate')->'rows') r where r->>2='pending_approval'),null::text,'CSV statistics suppress even six-person complementary cell');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','orders','operational')->>'state','denied','Registrar cannot export finance lists');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','operational')->'columns','["module","reference","status"]'::jsonb,'Minimal operational export excludes all identity fields');
select is(jsonb_array_length(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','operational','approved')->'rows'),1,'Operational export applies authorized state filter');
select pg_temp.reporting_claim(9952);
select is(public.msrc_staff_dashboard_export('synthetic-reporting','orders','operational')->>'state','ready','Finance can export only minimal mock-order operations');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','operational')->>'state','denied','Finance has no registration export access');
select pg_temp.reporting_claim(9954);
select is(jsonb_array_length(public.msrc_staff_dashboard_export('synthetic-reporting','reviews','operational')->'rows'),5,'Reviewer export contains only own assigned reviews');
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_staff_dashboard_export('synthetic-reporting','reviews','operational')->'rows') r
 where not exists(select 1 from msrc_abstracts.assignments a where a.id::text=r->>1 and a.reviewer_id=auth.uid())),'Reviewer cannot infer foreign assignment references from export');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','submissions','operational')->>'state','denied','Reviewer cannot export submission metadata');
select pg_temp.reporting_claim(9950);
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','personal')->'columns','["module","reference","status","actorId","name","email"]'::jsonb,'Personal exports require explicit Super Admin columns');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','all','personal')->>'state','invalid','Personal export requires explicit module');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','aggregate','approved')->>'state','invalid','Statistics cannot be differenced through arbitrary status subsets');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','personal','person@example.invalid')->>'state','denied','Arbitrary PII filter cannot enter audit receipts');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','personal','bogus')->>'state','denied','Unknown status refused');
select is(public.msrc_staff_dashboard_find('synthetic-reporting','REGISTRATION-9901@EXAMPLE.INVALID')->>'state','ready','Super Admin lookup uses case-insensitive exact email');
select is(jsonb_array_length(public.msrc_staff_dashboard_find('synthetic-reporting','registration-9901@example.invalid')->'matches'),1,'Lookup exact email has one participant');
select is(jsonb_array_length(public.msrc_staff_dashboard_find('synthetic-reporting','registration-9908@example.invalid')->'matches'),0,'Cross-edition participant lookup stays empty');
select is(public.msrc_staff_dashboard_find('synthetic-reporting','SYNTHETIC-RPT-1')#>>'{matches,0,actorId}',pg_temp.registration_actor(9901)::text,'Opaque abstract reference resolves participant');
select ok(exists(select 1 from jsonb_array_elements(public.msrc_staff_dashboard_find('synthetic-reporting','registration-9902@example.invalid')#>'{matches,0,records}') r
 where r->>'module'='hackathon' and r->>'reference'='e7940000-0000-4000-8000-000000000001'),'Team member email lookup includes shared competition entry');
select ok(exists(select 1 from jsonb_array_elements(public.msrc_staff_dashboard_find('synthetic-reporting','registration-9901@example.invalid')#>'{matches,0,records}') r where r->>'module'='orders'),'Lookup includes participant mock orders');
select is(public.msrc_staff_dashboard_find('synthetic-reporting',E'bad\nquery')->>'state','invalid','Lookup rejects multiline input');
select is(public.msrc_staff_dashboard_find('synthetic-reporting','')->>'state','invalid','Empty lookup rejected');
select ok(exists(select 1 from msrc_staff.reporting_audit where action='export.generate' and actor_id=pg_temp.registration_actor(9950)
 and session_id=pg_temp.registration_session(9950) and row_count=7 and filters='{"module":"registrations","kind":"personal","status":"all"}'::jsonb),'Personal export records actor, exact session, row count and filters');
select ok(exists(select 1 from msrc_staff.reporting_audit where action='participant.find' and row_count=1 and filters='{"queryKind":"email"}'::jsonb),'Lookup audit records count and query kind only');
select ok(not exists(select 1 from msrc_staff.reporting_audit where filters::text ~* 'example.invalid|Synthetic adult|manuscript|password|ciphertext|document_number'),'Audit stores no search terms, profiles, identifiers or exported content');
select throws_ok($$update msrc_staff.reporting_audit set row_count=0$$,'55000',null,'Reporting receipts cannot be edited');
select throws_ok($$delete from msrc_staff.reporting_audit$$,'55000',null,'Reporting receipts cannot be deleted');
select throws_ok($$truncate msrc_staff.reporting_audit$$,'55000',null,'Reporting receipts cannot be truncated');
create temporary table reporting_audit_snapshot as select count(*) n from msrc_staff.reporting_audit;
select is(public.msrc_staff_dashboard_audit('synthetic-reporting','reporting')->>'state','ready','Super Admin reads unified reporting timeline');
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_staff_dashboard_audit('synthetic-reporting','reporting')->'events') e where e->>'module'<>'reporting'),'Timeline module filter enforced');
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_staff_dashboard_audit('synthetic-reporting','all',pg_temp.registration_actor(9951))->'events') e where e->>'actorId'<>pg_temp.registration_actor(9951)::text),'Timeline actor filter enforced');
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_staff_dashboard_audit('synthetic-reporting','all',null,'export.generate')->'events') e where e->>'action'<>'export.generate'),'Timeline action filter enforced');
select is(jsonb_array_length(public.msrc_staff_dashboard_audit('synthetic-reporting','all',null,'',clock_timestamp()+interval '1 day',clock_timestamp()+interval '2 days')->'events'),0,'Timeline date filter excludes out-of-range events');
select is((select count(*) from msrc_staff.reporting_audit),(select n from reporting_audit_snapshot),'Audit timeline reads are read-only and do not shift offset pagination');
select is(public.msrc_staff_dashboard_audit('synthetic-reporting','unknown')->>'state','invalid','Unknown timeline module refused');
select is(public.msrc_staff_dashboard_audit('synthetic-reporting','all',null,'',null,null,-1)->>'state','invalid','Negative timeline offset refused');
select is(public.msrc_staff_dashboard_audit('synthetic-reporting','all',null,'',null,null,10001)->>'state','invalid','Oversized timeline offset refused');

-- Fresh authority is enforced for every request, independently of browser state.
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(9950)||'{"aal":"aal1"}'::jsonb)::text,true);end$$;
select is(public.msrc_staff_dashboard('synthetic-reporting')->>'state','denied','Super Admin dashboard requires native TOTP assurance');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','personal')->>'state','denied','Super Admin personal export requires native TOTP assurance');
update msrc_authorization.account_access set state='suspended' where actor_id=pg_temp.registration_actor(9951);
select pg_temp.reporting_claim(9951);
select is(public.msrc_staff_dashboard('synthetic-reporting')->>'state','denied','Suspended staff loses aggregate access immediately');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','operational')->>'state','denied','Suspended staff loses operational export immediately');
select pg_temp.reporting_claim(9950);
update msrc_staff.policy set enabled=false;
select is(public.msrc_staff_dashboard('synthetic-reporting')->>'state','denied','Closed staff policy denies dashboard');
select is(public.msrc_staff_dashboard_find('synthetic-reporting','registration-9901@example.invalid')->>'state','denied','Closed staff policy denies participant lookup');
select is(public.msrc_staff_dashboard_export('synthetic-reporting','registrations','personal')->>'state','denied','Closed staff policy denies exports');
select is(public.msrc_staff_dashboard_audit('synthetic-reporting')->>'state','denied','Closed staff policy denies audit');
select * from finish();
rollback;
