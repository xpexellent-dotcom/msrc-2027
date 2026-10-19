-- ENG-050; REG-02/04/05, ADM-01/02/05, ROL-07/10/12, PRV-03/05/06.
-- Disposable synthetic fixtures only. No hosted execution; every change rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok((select is_nullable='YES' and column_default is null from information_schema.columns
 where table_schema='msrc_registration' and table_name='settings' and column_name='offer_window_hours'),
 'Offer window is nullable with no default: no organizer duration is inferred');
select is((select count(*) from msrc_registration.settings),0::bigint,'Offers migration seeds no settings');
select ok(not exists(select 1 from pg_proc p where p.proname in('msrc_staff_registration_detail',
 'msrc_staff_registration_offer','msrc_registration_expire_offers','msrc_staff_registration_export')
 and not ('search_path=""'=any(p.proconfig))),'Every new guarded RPC has an empty search path');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname in('msrc_staff_registration_detail','msrc_staff_registration_offer',
 'msrc_registration_expire_offers','msrc_staff_registration_export')
 and a.grantee in(0,'anon'::regrole,'service_role'::regrole)),'No PUBLIC, anonymous or service-role execution grants');
select is((select count(*) from pg_proc p where p.pronamespace='public'::regnamespace
 and p.proname in('msrc_staff_registration_detail','msrc_staff_registration_offer',
 'msrc_registration_expire_offers','msrc_staff_registration_export')
 and has_function_privilege('authenticated',p.oid,'EXECUTE')),4::bigint,'Authenticated callers can reach all four guarded RPCs');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join (values('anon'),('authenticated'),('service_role')) r(name)
 where n.nspname='msrc_registration' and c.relkind='r'
 and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No new direct registration table access');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.pronamespace='msrc_registration'::regnamespace
 and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),
 'Private registration helpers remain unreachable by API roles');

set local role anon;
select throws_ok($$select public.msrc_staff_registration_detail('synthetic-staff-offers',gen_random_uuid())$$,'42501',null,'Anonymous cannot read detail');
select throws_ok($$select public.msrc_staff_registration_offer('synthetic-staff-offers',array[gen_random_uuid()])$$,'42501',null,'Anonymous cannot offer');
select throws_ok($$select public.msrc_registration_expire_offers('synthetic-staff-offers')$$,'42501',null,'Anonymous cannot expire');
select throws_ok($$select public.msrc_staff_registration_export('synthetic-staff-offers')$$,'42501',null,'Anonymous cannot export');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-staff-offers');
select pg_temp.registration_settings('synthetic-staff-offers-other');
-- Session creation MUST precede the RPC statement: observe_context compares its
-- immutable native origin with statement_timestamp(), not clock_timestamp().
do $$declare n integer;begin
 for n in 1..9 loop perform pg_temp.registration_fixture(n,'synthetic-staff-offers');end loop;
end$$;
do $$declare n integer;outcome jsonb;begin
 for n in 1..9 loop
  outcome:=pg_temp.registration_submit('synthetic-staff-offers',n,md5(n::text)||md5(n::text));
  if outcome->>'state'<>'submitted' then raise exception 'Synthetic offer request fixture failed';end if;
  update msrc_registration.requests set created_at='2026-10-01T00:00:00Z'::timestamptz+make_interval(secs=>n)
   where actor_id=pg_temp.registration_actor(n);
 end loop;
end$$;
insert into msrc_registration.requests(edition_key,actor_id,terms_version,document_type,identity_envelope,identity_hash,identity_masked,key_version)
 select 'synthetic-staff-offers-other',actor_id,terms_version,document_type,identity_envelope,identity_hash,identity_masked,key_version
 from msrc_registration.requests where edition_key='synthetic-staff-offers' and actor_id=pg_temp.registration_actor(1);
select pg_temp.registration_staff_fixture(100,'synthetic-staff-offers');
select pg_temp.registration_staff_fixture(101,'synthetic-staff-offers','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(102,'synthetic-staff-offers','finance');
select pg_temp.registration_staff_fixture(103,'synthetic-staff-offers','abstractReviewer');
select pg_temp.registration_staff_fixture(104,'synthetic-staff-offers','registrationWorkshopAdministrator');
do $$declare role_name text;n integer:=105;begin
 foreach role_name in array array['hackathonReviewer','threeMinuteThesisReviewer','scientificAdministrator',
  'judgingCommittee','facultyJudge','checkInStaff','contentMediaEditor','sponsorshipPr'] loop
  perform pg_temp.registration_staff_fixture(n,'synthetic-staff-offers',role_name);n:=n+1;
 end loop;
end$$;
delete from msrc_staff_email.receipts where actor_id=pg_temp.registration_actor(104);
create function pg_temp.offer_ids(variadic ns integer[]) returns uuid[] language sql stable as $$
 select array_agg(r.id order by x.ordinality) from unnest(ns) with ordinality x(n,ordinality)
 join msrc_registration.requests r on r.actor_id=pg_temp.registration_actor(x.n) and r.edition_key='synthetic-staff-offers';$$;
create function pg_temp.offer_id(n integer) returns uuid language sql stable as $$
 select r.id from msrc_registration.requests r where r.actor_id=pg_temp.registration_actor(n) and r.edition_key='synthetic-staff-offers';$$;
create function pg_temp.offer_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',case when n=0 then '{}' else pg_temp.registration_claims(n)::text end,true);
end$$;
create function pg_temp.offer_denials() returns setof text language plpgsql as $$
declare n integer;begin
 foreach n in array array[0,1,102,103,104,105,106,107,108,109,110,111,112] loop
  perform pg_temp.offer_claim(n);
  if n>=105 then
   return next ok(msrc_staff.authorize('synthetic-staff-offers',null,false) is not null,'Wrong-role caller has a valid assured session '||n);
  end if;
  return next is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->>'state','denied','Detail refuses caller '||n);
  return next is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(1))->>'state','denied','Offer refuses caller '||n);
  return next is(public.msrc_registration_expire_offers('synthetic-staff-offers')->>'state','denied','Expiry refuses caller '||n);
  return next is(public.msrc_staff_registration_export('synthetic-staff-offers')->>'state','denied','Export refuses caller '||n);
 end loop;
end$$;
select * from pg_temp.offer_denials();
select pg_temp.offer_claim(102);
select ok(msrc_staff.authorize('synthetic-staff-offers',array['finance']) is not null,'Wrong-role finance denial uses a genuinely assured session');
select pg_temp.offer_claim(103);
select ok(msrc_staff.authorize('synthetic-staff-offers',array['abstractReviewer']) is not null,'Wrong-role reviewer denial uses a genuinely assured session');
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(100)||'{"aal":"aal1"}'::jsonb)::text,true);end$$;
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->>'state','denied','Super Admin needs TOTP for detail');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(1))->>'state','denied','Super Admin needs TOTP for offer');
select is(public.msrc_registration_expire_offers('synthetic-staff-offers')->>'state','denied','Super Admin needs TOTP for expiry');
select is(public.msrc_staff_registration_export('synthetic-staff-offers')->>'state','denied','Super Admin needs TOTP for export');
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(101)||jsonb_build_object('session_id',pg_temp.registration_session(102)))::text,true);end$$;
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->>'state','denied','Detail cannot reuse another native session');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(1))->>'state','denied','Offer cannot reuse another native session');

-- Closed participant registration is independent of the staff tools.
update msrc_registration.settings set enabled=false where edition_key='synthetic-staff-offers';
select pg_temp.offer_claim(101);
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->>'state','ready','Assured registrar reads closed request detail');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'history','[]'::jsonb,'Pending request has no staff decision history');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',null)->>'state','denied','Null request ID is rejected');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',gen_random_uuid())->>'state','denied','Unknown request ID is rejected');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers-other',pg_temp.offer_id(1))->>'state','denied','Request detail enforces edition scope');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',
 (select id from msrc_registration.requests where edition_key='synthetic-staff-offers-other'))->>'state','denied','Detail cannot retrieve another edition request through an authorized edition');
select is(public.msrc_staff_registration_export('synthetic-staff-offers')->>'state','denied','Registration administrator cannot export');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers-other',pg_temp.offer_ids(1))->>'state','denied','Offer enforces edition scope');
select is(public.msrc_registration_expire_offers('synthetic-staff-offers-other')->>'state','denied','Expiry enforces edition scope');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers','{}'::uuid[])->>'state','denied','Empty offer selection is rejected');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',null)->>'state','denied','Null offer selection is rejected');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',array[null]::uuid[])->>'state','denied','Null offer member is rejected');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',array(select gen_random_uuid() from generate_series(1,101)))->>'state','denied','Offer batch larger than 100 unique IDs is rejected');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(1,1))->>'state','denied','Duplicate offer ID is rejected');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',array[pg_temp.offer_ids(1,2),pg_temp.offer_ids(3,4)])->>'state','denied','Multidimensional offer selection is rejected');
select is(public.msrc_staff_registration_waitlist('synthetic-staff-offers',pg_temp.offer_ids(1,2,3,4,5,6,7))->'decided'->>'waitlisted','7','Synthetic queue has seven manually waitlisted requests');
select is((select offer_window_hours from msrc_registration.settings where edition_key='synthetic-staff-offers'),null::integer,'Legacy waitlist hours do not populate the new offer window');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(1))->>'state','offer_window_not_set','Null offer window clearly refuses a seat offer');
select is((select count(*) from msrc_registration.audit where event='request.offered'),0::bigint,'Null offer window produces no successful offer audit');
select is((select status from msrc_registration.requests where id=pg_temp.offer_id(1)),'waitlisted','Null offer window leaves request unchanged');
select throws_ok($$update msrc_registration.settings set offer_window_hours=0 where edition_key='synthetic-staff-offers'$$,'23514',null,'Zero-hour offer window is invalid');
select throws_ok($$update msrc_registration.settings set offer_window_hours=-1 where edition_key='synthetic-staff-offers'$$,'23514',null,'Negative offer window is invalid');
update msrc_registration.settings set offer_window_hours=6,general_capacity=null where edition_key='synthetic-staff-offers';
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(1))->>'state','capacity_not_set','Missing capacity also refuses offers');
update msrc_registration.settings set general_capacity=2 where edition_key='synthetic-staff-offers';

-- Reversed input order must not defeat database oldest-first allocation.
select set_config('synthetic.offer_ids',pg_temp.offer_ids(3,2,1)::text,true);
select set_config('synthetic.offer_id',pg_temp.offer_id(1)::text,true);
set local role authenticated;
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',current_setting('synthetic.offer_id')::uuid)->>'state','ready',
 'Authenticated registrar executes detail through the real API grant');
select throws_ok($$select * from msrc_registration.requests$$,'42501',null,'Authenticated caller cannot bypass masked RPC projection');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',current_setting('synthetic.offer_ids')::uuid[])->'decided',
 '{"approved":0,"waitlisted":0,"offered":2,"skipped":1}'::jsonb,'Offer allocates only two available seats');
reset role;
select is((select array_agg(actor_id order by created_at,id) from msrc_registration.requests where status='offered'),
 array[pg_temp.registration_actor(1),pg_temp.registration_actor(2)],'Oldest eligible requests win regardless of input ordering');
select ok((select bool_and(offer_expires_at between decided_at+interval '6 hours'-interval '1 second' and decided_at+interval '6 hours'+interval '1 second')
 from msrc_registration.requests where status='offered'),'Offer expiry is based on database decision time and configured window');
select is((select count(*) from msrc_registration.audit where event='request.offered' and previous_status='waitlisted'
 and new_status='offered' and performer_id=pg_temp.registration_actor(101) and result='allowed'),2::bigint,'Each offer has immutable exact-transition performer evidence');
create temporary table offer_snapshot as select id,decided_at,offer_expires_at,updated_at from msrc_registration.requests where status='offered';
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(1,2,8,9))->'decided',
 '{"approved":0,"waitlisted":0,"offered":0,"skipped":4}'::jsonb,'Repeated offers and pending requests are skipped');
select ok(not exists(select 1 from offer_snapshot s join msrc_registration.requests r using(id)
 where r.decided_at is distinct from s.decided_at or r.offer_expires_at is distinct from s.offer_expires_at or r.updated_at is distinct from s.updated_at),
 'Repeated offer does not extend deadline or change decision timestamps');
select is((select count(*) from msrc_registration.audit where event='request.offered'),2::bigint,'Repeated offer does not duplicate audit');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',
 array[(select id from msrc_registration.requests where edition_key='synthetic-staff-offers-other'),gen_random_uuid()])->'decided'->>'skipped','2',
 'Unknown and other-edition IDs are skipped without touching their requests');
select is((select status from msrc_registration.requests where edition_key='synthetic-staff-offers-other'),'pending_approval','Cross-edition offer never changes another edition request');
select is(public.msrc_staff_registration('synthetic-staff-offers')->'registration'->'counts',
 '{"pending":2,"approved":2,"waitlisted":5,"offered":2,"expired":0,"capacity":2,"remaining":0}'::jsonb,'Offered count is separate while offers still hold seats');
select is(public.msrc_staff_registration_approve('synthetic-staff-offers',pg_temp.offer_ids(8))->'decided'->>'approved','0','Approval cannot consume seats held by offers');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'request',
 (select item from jsonb_array_elements(public.msrc_staff_registration('synthetic-staff-offers')->'registration'->'requests') item where item->>'id'=pg_temp.offer_id(1)::text),
 'Detail request is exactly the same masked projection as the queue');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'history'->0->>'from','waitlisted','Latest history row contains prior state');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'history'->0->>'to','offered','Latest history row contains next state');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'history'->1->>'to','waitlisted','History is newest first');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'history'->0->>'performerName','Synthetic registration staff','History resolves staff display name');
select ok((public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'history'->0) ?& array['id','from','to','at','performerName'],
 'History contains every agreed contract key');
select is(jsonb_array_length(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'history'),2,'History contains only this request decision rows');
select ok(not (public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))::text ~ 'ciphertext|identity_hash|identityEnvelope|authTag|identity_envelope'),
 'Detail/history expose no encrypted identity or duplicate digest');

-- Explicit expiry is idempotent, releases only elapsed offers and never auto-offers.
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second' where id=pg_temp.offer_id(1);
select pg_temp.offer_claim(102);
select is(public.msrc_registration_expire_offers('synthetic-staff-offers')->>'state','denied','Unauthorized finance cannot cause an expiry transition');
select is((select status from msrc_registration.requests where id=pg_temp.offer_id(1)),'offered','Denied expiry does not mutate the elapsed offer');
select pg_temp.offer_claim(101);
set local role authenticated;
select is(public.msrc_registration_expire_offers('synthetic-staff-offers')->>'expired','1','Registrar expires one elapsed offer');
reset role;
select is(public.msrc_registration_expire_offers('synthetic-staff-offers')->>'expired','0','Repeated expiry is idempotent');
select is((select count(*) from msrc_registration.audit where event='request.offer_expired' and previous_status='offered' and new_status='expired' and performer_id is null),1::bigint,'Expiry writes exactly one transition audit');
select is((select status from msrc_registration.requests where id=pg_temp.offer_id(2)),'offered','Unelapsed offer is retained');
select is((select status from msrc_registration.requests where id=pg_temp.offer_id(3)),'waitlisted','Released seat is not automatically offered to the next person');
select is(public.msrc_staff_registration('synthetic-staff-offers')->'registration'->'counts'->>'remaining','1','Expired offer releases its held seat');
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->'detail'->'history'->0->>'to','expired','Detail includes the newest expiry transition');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(1))->'decided'->>'offered','0','Expired terminal requests cannot be re-offered');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(3))->'decided'->>'offered','1','Staff can explicitly allocate the released seat');

-- Reads must sweep before their aggregate/projection snapshot, even when filtered.
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second' where id=pg_temp.offer_id(2);
select is(public.msrc_staff_registration('synthetic-staff-offers','','waitlisted')->'registration'->'counts'->>'offered','1','Filtered queue expires elapsed offers before counts');
select is((select status from msrc_registration.requests where id=pg_temp.offer_id(2)),'expired','Queue read performs explicit elapsed-offer transition');
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second' where id=pg_temp.offer_id(3);
select is(public.msrc_staff_summary('synthetic-staff-offers')->'summary'->'registration'->>'remaining','2','Summary expires elapsed offers before remaining count');
select is(public.msrc_staff_summary('synthetic-staff-offers')->'summary'->'registration'->>'expired','3','Summary includes every expired offer');
select is(public.msrc_staff_registration_offer('synthetic-staff-offers',pg_temp.offer_ids(4))->'decided'->>'offered','1','A further explicit staff offer succeeds');
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second' where id=pg_temp.offer_id(4);
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(4))->'detail'->'request'->>'status','expired','Detail read cannot display an elapsed offer as current');
select is((select count(*) from msrc_registration.audit where event='request.offered'),4::bigint,'Reads and expiry have never auto-offered another seat');
select is((select count(*) from msrc_outbox.messages),0::bigint,'Offer/expiry operations enqueue no email');
select throws_ok($$update msrc_registration.audit set new_status='waitlisted' where event='request.offered'$$,'55000',null,'Offer audit rows cannot be mutated');
select throws_ok($$delete from msrc_registration.audit where event='request.offer_expired'$$,'55000',null,'Expiry audit rows cannot be deleted');

-- Legacy unknown-deadline holds remain conservative; non-offer deadlines never expire.
update msrc_registration.requests set status='offered',offer_expires_at=null where id=pg_temp.offer_id(5);
update msrc_registration.requests set status='approved',offer_expires_at=clock_timestamp()-interval '1 day' where id=pg_temp.offer_id(6);
select is(public.msrc_registration_expire_offers('synthetic-staff-offers')->>'expired','0','Expiry does not release legacy unknown-deadline holds or approvals');
select is(public.msrc_staff_summary('synthetic-staff-offers')->'summary'->'registration'->>'remaining','0','Unknown-deadline offers and approvals continue holding seats');

-- All-row export is a separate TOTP-only boundary, with a durable row-count audit.
select pg_temp.offer_claim(100);
select is(public.msrc_staff_registration_detail('synthetic-staff-offers',pg_temp.offer_id(1))->>'state','ready','TOTP-valid Super Admin can read detail');
select is(public.msrc_staff_registration_export('synthetic-staff-offers-other')->>'state','denied','Export enforces edition scope');
select is(public.msrc_registration_priority_set('synthetic-staff-offers',pg_temp.registration_claims(100),pg_temp.registration_actor(7),true,'Synthetic export priority')->>'state',
 'updated','Synthetic priority designation for export');
-- Add >50 records without new auth sessions to exercise all-row export, including
-- a deleted account retained by the registration record. The regular list is capped.
do $$declare n integer;begin
 for n in 10..55 loop
  insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous)
   values(pg_temp.registration_actor(n),'registration-'||n||'@example.invalid',now(),'synthetic-export-only',now(),now(),false);
  insert into msrc_authorization.account_access(actor_id,state,individually_identified) values(pg_temp.registration_actor(n),'active',false);
  insert into msrc_participant.profiles(actor_id,name,privacy_version,state) values(pg_temp.registration_actor(n),'Synthetic export only','synthetic-registration-notice','verified');
  insert into msrc_registration.requests(edition_key,actor_id,terms_version,document_type,identity_envelope,identity_hash,identity_masked,key_version)
   values('synthetic-staff-offers',pg_temp.registration_actor(n),'synthetic-terms','national_id',
    jsonb_build_object('ciphertext',repeat('ab',10),'iv',repeat('cd',12),'authTag',repeat('ef',16),'keyVersion','synthetic-v1'),
    md5(n::text)||md5(n::text),repeat(chr(8226),6)||'0000','synthetic-v1');
 end loop;
end$$;
update auth.users set deleted_at=clock_timestamp() where id=pg_temp.registration_actor(55);
create temporary table export_result as select public.msrc_staff_registration_export('synthetic-staff-offers') as value;
select is((select value->>'state' from export_result),'ready','TOTP-valid Super Admin can export');
select is((select jsonb_array_length(value->'rows') from export_result),55,'Export includes all edition requests, exceeding queue limit');
select ok((select bool_and(item ?& array['name','email','status','priority','createdAt','decidedAt','identityMasked'])
 from export_result cross join lateral jsonb_array_elements(value->'rows') item),'Every export row has all required columns');
select ok((select bool_and(item - array['name','email','status','priority','createdAt','decidedAt','identityMasked']='{}'::jsonb)
 from export_result cross join lateral jsonb_array_elements(value->'rows') item),'Export exposes only its seven allowlisted fields');
select ok((select bool_and(item->>'identityMasked'=repeat(chr(8226),6)||'0000')
 from export_result cross join lateral jsonb_array_elements(value->'rows') item),'Every exported identity is masked');
select ok(not (select value::text ~ 'ciphertext|identity_hash|identityEnvelope|authTag|identity_envelope|document_type' from export_result),'Export never returns protected identity data');
select is((select item->>'priority' from export_result cross join lateral jsonb_array_elements(value->'rows') item
 where item->>'email'='registration-7@example.invalid'),'true','Export includes current priority flag');
select is((select row_count from msrc_registration.audit where event='registration.exported'),55::bigint,'Successful export writes its exact returned row count');
select is((select performer_id from msrc_registration.audit where event='registration.exported'),pg_temp.registration_actor(100),'Export audit records the Super Admin performer');
select ok((select request_id is null and target_actor is null and previous_status is null and new_status is null
 from msrc_registration.audit where event='registration.exported'),'Export audit is edition-level without identity details');
select is((select count(*) from msrc_registration.audit where event='identity.revealed'),0::bigint,'Export never invokes identity reveal');
set local role authenticated;
select is(public.msrc_staff_registration_export('synthetic-staff-offers')->>'state','ready','Authenticated Super Admin executes export through the real API grant');
reset role;
select is((select count(*) from msrc_registration.audit where event='registration.exported' and row_count=55),2::bigint,'Every export creates its own durable row-count audit');
select throws_ok($$update msrc_registration.audit set row_count=0 where event='registration.exported'$$,'55000',null,'Export row-count evidence is immutable');
select is((select count(*) from msrc_outbox.messages),0::bigint,'Detail/export produce no notification mail');

select * from finish();
rollback;
