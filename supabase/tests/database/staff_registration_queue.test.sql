-- ORG-055 / ENG-049. Disposable synthetic fixtures; every change rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_registration' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),4::bigint,
 'Queue keeps all registration tables under forced RLS');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join (values('anon'),('authenticated'),('service_role')) r(name)
 where n.nspname='msrc_registration' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
 'Queue exposes no direct registration table grants');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.pronamespace='msrc_registration'::regnamespace and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),
 'New private queue/count helpers have no PUBLIC or API execution grants');
select ok(not exists(select 1 from pg_proc p where p.proname in('msrc_staff_registration','msrc_staff_registration_approve',
 'msrc_staff_registration_waitlist','msrc_staff_priority','msrc_staff_summary') and not ('search_path=""'=any(p.proconfig))),
 'Every new public queue RPC pins the empty search path');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname in('msrc_staff_registration','msrc_staff_registration_approve','msrc_staff_registration_waitlist','msrc_staff_priority','msrc_staff_summary')
 and a.grantee in(0,'anon'::regrole,'service_role'::regrole)), 'Only authenticated callers have queue RPC execution grants');
select is((select count(*) from pg_proc p where p.pronamespace='public'::regnamespace
 and p.proname in('msrc_staff_registration','msrc_staff_registration_approve','msrc_staff_registration_waitlist','msrc_staff_priority','msrc_staff_summary')
 and has_function_privilege('authenticated',p.oid,'EXECUTE')),5::bigint,'Authenticated role has all five guarded queue RPCs');
select ok(has_function_privilege('service_role','public.msrc_registration_priority_set(text,jsonb,uuid,boolean,text)','EXECUTE')
 and not has_function_privilege('authenticated','public.msrc_registration_priority_set(text,jsonb,uuid,boolean,text)','EXECUTE'),
 'Existing priority mutation remains server-only with forwarded verified claims');
select is((select count(*) from msrc_registration.settings),0::bigint,'Queue migration seeds no settings or opens participant registration');

set local role anon;
select throws_ok($$select public.msrc_staff_registration('synthetic-staff-queue')$$,'42501',null,'Anonymous cannot execute queue read');
select throws_ok($$select public.msrc_staff_registration_approve('synthetic-staff-queue',array[gen_random_uuid()])$$,'42501',null,'Anonymous cannot approve');
select throws_ok($$select public.msrc_staff_registration_waitlist('synthetic-staff-queue',array[gen_random_uuid()])$$,'42501',null,'Anonymous cannot waitlist');
select throws_ok($$select public.msrc_staff_priority('synthetic-staff-queue')$$,'42501',null,'Anonymous cannot search priority');
select throws_ok($$select public.msrc_staff_summary('synthetic-staff-queue')$$,'42501',null,'Anonymous cannot inspect summary');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-staff-queue');
do $$declare n integer;outcome jsonb;begin
 for n in 1..9 loop
  perform pg_temp.registration_fixture(n,'synthetic-staff-queue');
  outcome:=pg_temp.registration_submit('synthetic-staff-queue',n,md5(n::text)||md5(n::text));
  if outcome->>'state'<>'submitted' then
   raise exception 'Queue participant fixture failed for % with %; context %; age proven %; verified profile %',n,outcome,
    public.msrc_registration_context('synthetic-staff-queue',pg_temp.registration_claims(n)),
    msrc_participant.age_proven(pg_temp.registration_actor(n)),
    exists(select 1 from msrc_participant.profiles p where p.actor_id=pg_temp.registration_actor(n) and p.state='verified');
  end if;
  update msrc_registration.requests set created_at='2026-10-01T00:00:00Z'::timestamptz+make_interval(secs=>n)
   where actor_id=pg_temp.registration_actor(n);
 end loop;
end$$;
-- A second edition is created only after the participant fixtures (session/admission helpers assume one configured edition).
select pg_temp.registration_settings('synthetic-staff-queue-other');
select pg_temp.registration_staff_fixture(100,'synthetic-staff-queue');
select pg_temp.registration_staff_fixture(101,'synthetic-staff-queue');
select pg_temp.registration_staff_fixture(102,'synthetic-staff-queue','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(103,'synthetic-staff-queue','finance');
select pg_temp.registration_staff_fixture(104,'synthetic-staff-queue','abstractReviewer');
select pg_temp.registration_staff_fixture(105,'synthetic-staff-queue','registrationWorkshopAdministrator');
delete from msrc_staff_email.receipts where actor_id=pg_temp.registration_actor(105);
create function pg_temp.queue_ids(variadic ns integer[]) returns uuid[] language sql stable as $$
 select array_agg(r.id order by x.ordinality) from unnest(ns) with ordinality x(n,ordinality)
 join msrc_registration.requests r on r.actor_id=pg_temp.registration_actor(x.n) and r.edition_key='synthetic-staff-queue';$$;
create function pg_temp.queue_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',case when n=0 then '{}' else pg_temp.registration_claims(n)::text end,true);
end$$;

-- Wrong-role callers possess genuine current sessions; role denial is not an MFA shortcut.
create function pg_temp.queue_denials() returns setof text language plpgsql as $$
declare n integer;ids uuid[]:=pg_temp.queue_ids(1);begin
 foreach n in array array[0,1,103,104,105] loop
  perform pg_temp.queue_claim(n);
  return next is(public.msrc_staff_registration('synthetic-staff-queue')->>'state','denied','Queue read refuses caller '||n);
  return next is(public.msrc_staff_registration_approve('synthetic-staff-queue',ids)->>'state','denied','Approve refuses caller '||n);
  return next is(public.msrc_staff_registration_waitlist('synthetic-staff-queue',ids)->>'state','denied','Waitlist refuses caller '||n);
  return next is(public.msrc_staff_priority('synthetic-staff-queue')->>'state','denied','Priority read refuses caller '||n);
 end loop;
end$$;
select * from pg_temp.queue_denials();
select pg_temp.queue_claim(103);
select ok(msrc_staff.authorize('synthetic-staff-queue',array['finance']) is not null,'Finance fixture has valid exact-session email assurance');
select is(public.msrc_staff_summary('synthetic-staff-queue')->'summary','{}'::jsonb,'Finance summary exposes no unauthorized counts');
select pg_temp.queue_claim(104);
select ok(msrc_staff.authorize('synthetic-staff-queue',array['abstractReviewer']) is not null,'Reviewer fixture has valid exact-session email assurance');
select is(public.msrc_staff_summary('synthetic-staff-queue')->'summary','{}'::jsonb,'Reviewer summary exposes no unauthorized counts');
select pg_temp.queue_claim(1);
select is(public.msrc_staff_summary('synthetic-staff-queue')->>'state','denied','Participant cannot read staff summary');
select pg_temp.queue_claim(0);
select is(public.msrc_staff_summary('synthetic-staff-queue')->>'state','denied','No-session summary denied');
select pg_temp.queue_claim(100);
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(100)||'{"aal":"aal1"}'::jsonb)::text,true);end$$;
select is(public.msrc_staff_registration('synthetic-staff-queue')->>'state','denied','Super Admin without AAL2 cannot read queue');
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',pg_temp.queue_ids(1))->>'state','denied','Super Admin without AAL2 cannot approve');
select is(public.msrc_staff_priority('synthetic-staff-queue')->>'state','denied','Super Admin without AAL2 cannot read priority');
select pg_temp.queue_claim(102);
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(102)||jsonb_build_object('session_id',pg_temp.registration_session(103)))::text,true);end$$;
select is(public.msrc_staff_registration('synthetic-staff-queue')->>'state','denied','Another native session cannot reuse registrar email assurance');

-- Staff work is independent of the participant's closed registration switch.
update msrc_registration.settings set enabled=false where edition_key='synthetic-staff-queue';
select pg_temp.queue_claim(102);
set local role authenticated;
select is(public.msrc_staff_registration('synthetic-staff-queue')->>'state','ready','Exact email-assured registrar can read a closed queue');
select is(public.msrc_staff_priority('synthetic-staff-queue')->>'state','denied','Registrar cannot read priority management');
select is(public.msrc_staff_registration('synthetic-staff-queue-other')->>'state','denied','Edition scope is enforced');
select is(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'counts',
 '{"pending":9,"approved":0,"waitlisted":0,"capacity":17,"remaining":17}'::jsonb,'Queue returns exact initial aggregate shape');
select is(jsonb_array_length(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'requests'),9,'Queue returns seeded requests');
select is(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'requests'->0->>'email','registration-9@example.invalid','Queue is newest first');
select is(jsonb_array_length(public.msrc_staff_registration('synthetic-staff-queue','REGISTRATION-3@')->'registration'->'requests'),1,'Email substring search is case insensitive');
select is(jsonb_array_length(public.msrc_staff_registration('synthetic-staff-queue','SYNTHETIC ADULT')->'registration'->'requests'),9,'Name substring search matches participants semantics');
select is(jsonb_array_length(public.msrc_staff_registration('synthetic-staff-queue','%')->'registration'->'requests'),0,'Search does not interpret SQL wildcard patterns');
select is(jsonb_array_length(public.msrc_staff_registration('synthetic-staff-queue','','approved')->'registration'->'requests'),0,'Status filter is applied');
select ok(not (public.msrc_staff_registration('synthetic-staff-queue')::text ~ 'ciphertext|identity_hash|identityEnvelope|authTag'),'Queue returns no identity envelope, digest or raw number');
select ok((public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'requests'->0) ?&
 array['id','actorId','name','email','status','priority','createdAt','decidedAt','identityMasked'],'Queue request includes every UI contract key');
select is(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'requests'->0->>'identityMasked',
 repeat(chr(8226),6)||'0000','Queue identity projection retains the mask');
select is(public.msrc_staff_registration('synthetic-staff-queue','','invented')->>'state','denied','Invalid status is denied at database boundary');
select is(public.msrc_staff_registration('synthetic-staff-queue',repeat('a',201))->>'state','denied','Oversized search denied');
select ok((public.msrc_staff_summary('synthetic-staff-queue')->'summary') ?& array['registration','participants'],'Registrar summary includes its two permitted areas');
select ok(not (public.msrc_staff_summary('synthetic-staff-queue')->'summary') ?| array['staff','auditLast24h','priority'],'Registrar summary excludes Super Admin areas');
reset role;

select pg_temp.queue_claim(100);
select is(public.msrc_staff_registration('synthetic-staff-queue')->>'state','ready','TOTP-assured Super Admin can read queue');
select is(public.msrc_staff_registration_approve('synthetic-staff-queue','{}'::uuid[])->>'state','denied','Empty approval selection denied');
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',null)->>'state','denied','Null approval selection denied');
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',array_fill(gen_random_uuid(),array[101]))->>'state','denied','Approval batch over 100 denied');
select is(public.msrc_staff_registration_waitlist('synthetic-staff-queue','{}'::uuid[])->>'state','denied','Empty waitlist selection denied');
select is(public.msrc_staff_registration_waitlist('synthetic-staff-queue',array[null]::uuid[])->>'state','denied','Null selection member denied');
update msrc_registration.settings set general_capacity=null where edition_key='synthetic-staff-queue';
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',pg_temp.queue_ids(1))->>'state','capacity_not_set','Missing capacity clearly refuses allocation');
select is(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'counts'->'remaining','null'::jsonb,'Missing capacity gives null remaining');
update msrc_registration.settings set general_capacity=2,payment_required=null where edition_key='synthetic-staff-queue';
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',pg_temp.queue_ids(1))->>'state','payment_configuration_required','Missing free-or-paid decision refuses allocation');
update msrc_registration.settings set payment_required=true,payment_window_hours=null where edition_key='synthetic-staff-queue';
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',pg_temp.queue_ids(1))->>'state','payment_configuration_required','Paid registration without payment window refuses allocation');
select is((select count(*) from msrc_registration.requests where status<>'pending_approval'),0::bigint,'Refused configuration makes no request changes');
select is((select count(*) from msrc_registration.audit where event='request.approved'),0::bigint,'Refused allocation creates no successful decision audit');
update msrc_registration.settings set payment_required=false where edition_key='synthetic-staff-queue';
select pg_temp.queue_claim(102);
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',pg_temp.queue_ids(3,2,1))->'decided',
 '{"approved":2,"waitlisted":0,"skipped":1}'::jsonb,'Registrar approval stops exactly at remaining capacity');
select is((select array_agg(actor_id order by created_at) from msrc_registration.requests where status='approved'),
 array[pg_temp.registration_actor(1),pg_temp.registration_actor(2)],'Allocation uses created order, not caller ID order');
select is((select count(*) from msrc_registration.requests where decided_at is not null),2::bigint,'Each decided request receives its decision timestamp');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(3)),'pending_approval','Overflow stays pending; no timed offer or implicit waitlist');
create temp table queue_approved_snapshot as select id,to_jsonb(r) as snapshot from msrc_registration.requests r where status='approved';
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',pg_temp.queue_ids(2,1))->'decided',
 '{"approved":0,"waitlisted":0,"skipped":2}'::jsonb,'Re-approving already approved requests is an idempotent skip');
select ok(not exists(select 1 from msrc_registration.requests r join queue_approved_snapshot saved using(id) where to_jsonb(r)<>saved.snapshot),
 'Replay leaves every request field, including decision time, unchanged');
select is((select count(*) from msrc_registration.audit where event='request.approved' and performer_id=pg_temp.registration_actor(102)
 and previous_status='pending_approval' and new_status='approved' and result='allowed'),2::bigint,'One actor and before/after audit row is written per approval, none on replay');
select is(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'counts'->>'remaining','0','Full capacity has zero remaining');
select is(public.msrc_staff_registration_waitlist('synthetic-staff-queue',pg_temp.queue_ids(1,3,4))->'decided',
 '{"approved":0,"waitlisted":2,"skipped":1}'::jsonb,'Registrar waitlists pending requests only');
select is(public.msrc_staff_registration_waitlist('synthetic-staff-queue',pg_temp.queue_ids(3,4))->'decided',
 '{"approved":0,"waitlisted":0,"skipped":2}'::jsonb,'Repeated waitlist is a no-op');
select is((select count(*) from msrc_registration.audit where event='request.waitlisted' and performer_id=pg_temp.registration_actor(102)
 and previous_status='pending_approval' and new_status='waitlisted' and result='allowed'),2::bigint,'One immutable before/after audit row per waitlist decision');
select is(public.msrc_staff_registration('synthetic-staff-queue','','waitlisted')->'registration'->'counts'->>'pending','5','Counts cover whole edition despite list filter');
select is(jsonb_array_length(public.msrc_staff_registration('synthetic-staff-queue','','waitlisted')->'registration'->'requests'),2,'Waitlisted status filter returns both decided requests');

-- A paid waitlisted approval holds a seat and receives a database-time deadline.
select pg_temp.queue_claim(100);
update msrc_registration.settings set general_capacity=3,payment_required=true,payment_window_hours=7 where edition_key='synthetic-staff-queue';
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',pg_temp.queue_ids(4,3))->'decided',
 '{"approved":1,"waitlisted":0,"skipped":1}'::jsonb,'Super Admin can allocate an existing waitlisted request');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(3)),'approved_awaiting_payment','Paid allocation uses awaiting-payment state');
select ok((select payment_due_at between decided_at+interval '7 hours'-interval '1 second' and decided_at+interval '7 hours'+interval '1 second'
 from msrc_registration.requests where actor_id=pg_temp.registration_actor(3)),'Paid deadline follows configured database-time payment window');
select is((select count(*) from msrc_registration.audit where event='request.approved' and performer_id=pg_temp.registration_actor(100)
 and previous_status='waitlisted' and new_status='approved_awaiting_payment'),1::bigint,'Paid approval audit preserves exact transition');

-- Existing provisional offers and confirmations consume seats even without this slice creating offers.
update msrc_registration.requests set status='offered' where actor_id=pg_temp.registration_actor(5);
update msrc_registration.requests set status='confirmed' where actor_id=pg_temp.registration_actor(6);
update msrc_registration.requests set status='cancelled' where actor_id=pg_temp.registration_actor(7);
update msrc_registration.requests set status='expired' where actor_id=pg_temp.registration_actor(8);
update msrc_registration.settings set general_capacity=5,payment_required=false where edition_key='synthetic-staff-queue';
select is(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'counts',
 '{"pending":1,"approved":5,"waitlisted":1,"capacity":5,"remaining":0}'::jsonb,'Four seat-holding statuses consume capacity; cancelled/expired/waitlisted do not');
select is(public.msrc_staff_registration_approve('synthetic-staff-queue',pg_temp.queue_ids(4,5,6,7,8,9))->'decided',
 '{"approved":0,"waitlisted":0,"skipped":6}'::jsonb,'Existing offers/confirmations cannot be displaced and terminal requests cannot be approved');
select is(public.msrc_staff_registration_waitlist('synthetic-staff-queue',pg_temp.queue_ids(5,6,7,8))->'decided',
 '{"approved":0,"waitlisted":0,"skipped":4}'::jsonb,'Waitlist cannot demote offers, confirmations or terminal requests');

-- Priority list/search and reason-bearing mutations are exclusively Super Admin.
select is(public.msrc_registration_priority_set('synthetic-staff-queue',pg_temp.registration_claims(102),pg_temp.registration_actor(9),true,'Synthetic duty')->>'state','denied','Registrar cannot designate priority');
select is(public.msrc_registration_priority_set('synthetic-staff-queue',pg_temp.registration_claims(103),pg_temp.registration_actor(9),false,'Synthetic removal')->>'state','denied','Finance cannot remove priority');
select is(public.msrc_registration_priority_set('synthetic-staff-queue',pg_temp.registration_claims(100),pg_temp.registration_actor(9),true,' ')->>'state','denied','Priority set requires a real reason');
select is(public.msrc_registration_priority_set('synthetic-staff-queue',pg_temp.registration_claims(100),pg_temp.registration_actor(9),true,'Synthetic organizing duty')->>'state','updated','Super Admin designates priority with reason');
select is(public.msrc_staff_registration('synthetic-staff-queue','registration-9@')->'registration'->'requests'->0->>'priority','true','Pending flagged request is identifiable in queue');
select is(public.msrc_staff_priority('synthetic-staff-queue')->>'state','ready','Super Admin can list priority');
select is(public.msrc_staff_priority('synthetic-staff-queue')->'priority'->'designations'->0->>'reason','Synthetic organizing duty','Priority projection returns saved reason');
select is(public.msrc_staff_priority('synthetic-staff-queue')->'priority'->'designations'->0->>'designatedByName','Synthetic registration staff','Priority projection resolves designator name');
select ok((public.msrc_staff_priority('synthetic-staff-queue')->'priority'->'designations'->0) ?&
 array['actorId','name','email','active','reason','designatedAt','designatedByName','removedAt'],'Priority row includes every UI contract key');
select is(jsonb_array_length(public.msrc_staff_priority('synthetic-staff-queue','REGISTRATION-2@')->'priority'->'candidates'),1,'Candidate search uses participant email semantics');
select is(jsonb_array_length(public.msrc_staff_priority('synthetic-staff-queue','REGISTRATION-2@')->'priority'->'designations'),0,'Priority designation search filters separately');
select ok(not (public.msrc_staff_priority('synthetic-staff-queue')::text ~ 'ciphertext|identity_hash|identityEnvelope|authTag'),'Priority candidates never expose protected identity data');
select is(public.msrc_registration_priority_set('synthetic-staff-queue',pg_temp.registration_claims(100),pg_temp.registration_actor(9),false,'')->>'state','denied','Priority removal also requires a reason');
select is(public.msrc_registration_priority_set('synthetic-staff-queue',pg_temp.registration_claims(100),pg_temp.registration_actor(9),false,'Synthetic duty ended')->>'state','updated','Super Admin removes priority with reason');
select is(public.msrc_staff_priority('synthetic-staff-queue')->'priority'->'designations'->0->>'active','false','Removed designation remains visible as history');
select ok(public.msrc_staff_priority('synthetic-staff-queue')->'priority'->'designations'->0->>'removedAt' is not null,'Removed designation exposes its removal timestamp');
select is(public.msrc_staff_registration('synthetic-staff-queue','registration-9@')->'registration'->'requests'->0->>'priority','false','Removed priority no longer flags request');
select is((select count(*) from msrc_registration.audit where event='priority.removed' and result='allowed' and reason='Synthetic duty ended'),1::bigint,'Removal reason remains in immutable audit');
select is(jsonb_array_length(public.msrc_staff_audit('synthetic-staff-queue','request.approved')->'rows'),3,'Existing staff audit area exposes the three registration approvals');
select ok(not (public.msrc_staff_audit('synthetic-staff-queue','request.approved')::text ~ 'ciphertext|identity_hash|identityEnvelope|authTag'),
 'Decision audit projection carries no protected identity material');
select ok((public.msrc_staff_summary('synthetic-staff-queue')->'summary') ?& array['registration','participants','staff','auditLast24h','priority'],'Super Admin summary includes every authorized count');
select is(public.msrc_staff_summary('synthetic-staff-queue')->'summary'->>'participants','9','Summary counts all participant accounts');
select is(public.msrc_staff_summary('synthetic-staff-queue')->'summary'->>'priority','0','Summary counts active priority only');
select ok((public.msrc_staff_summary('synthetic-staff-queue')->'summary'->>'auditLast24h')::integer>=5,'Summary includes recent durable decision audit activity');
select is((select count(*) from msrc_outbox.messages),0::bigint,'Staff decisions do not enqueue or send notification mail in this slice');

-- Extend read-only fixtures above fifty to prove bounded projection, independent aggregate totals.
do $$declare n integer;begin
 for n in 10..60 loop
  insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous)
   values(pg_temp.registration_actor(n),'registration-'||n||'@example.invalid',now(),'synthetic-list-only',now(),now(),false);
  insert into msrc_authorization.account_access(actor_id,state,individually_identified) values(pg_temp.registration_actor(n),'active',false);
  insert into msrc_participant.profiles(actor_id,name,privacy_version,state) values(pg_temp.registration_actor(n),'Synthetic list only','synthetic-registration-notice','verified');
  insert into msrc_registration.requests(edition_key,actor_id,terms_version,document_type,identity_envelope,identity_hash,identity_masked,key_version,created_at)
   values('synthetic-staff-queue',pg_temp.registration_actor(n),'synthetic-terms','national_id',
    jsonb_build_object('ciphertext',repeat('ab',10),'iv',repeat('cd',12),'authTag',repeat('ef',16),'keyVersion','synthetic-v1'),
    md5(n::text)||md5(n::text),repeat(chr(8226),6)||'0000','synthetic-v1','2026-10-01T00:00:00Z'::timestamptz+make_interval(secs=>n));
 end loop;
end$$;
select is(jsonb_array_length(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'requests'),50,'Queue limit is fifty');
select is(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'requests'->0->>'email','registration-60@example.invalid','Limited queue still returns newest first');
select is(public.msrc_staff_registration('synthetic-staff-queue')->'registration'->'counts'->>'pending','52','Counts are not limited to the fifty returned rows');
select is(jsonb_array_length(public.msrc_staff_priority('synthetic-staff-queue')->'priority'->'candidates'),50,'Candidate search is bounded to fifty');
select * from finish();
rollback;
