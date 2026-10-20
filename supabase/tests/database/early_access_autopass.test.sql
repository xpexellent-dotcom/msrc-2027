-- ORG-056 / ENG-051; REG-01/02/04/05, ADM-01/02/05, ROL-10/12, PRV-03/05/06.
-- Disposable synthetic fixtures only; no hosted execution or settings seed.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok((select relrowsecurity and relforcerowsecurity from pg_class
 where oid='msrc_registration.early_access_entries'::regclass),'Early-access emails have forced RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) role_name(name)
 where has_table_privilege(role_name.name,'msrc_registration.early_access_entries','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
 'No API role has direct early-access email access');
select is((select count(*) from msrc_registration.early_access_entries),0::bigint,'Migration seeds no emails');
select is((select count(*) from msrc_registration.settings),0::bigint,'Migration seeds no settings');
select ok(not exists(select 1 from pg_proc p where p.proname in('msrc_staff_early_access',
 'msrc_staff_early_access_add','msrc_staff_early_access_remove') and not ('search_path=""'=any(p.proconfig))),
 'Every early-access RPC uses an empty search path');
select is((select count(*) from pg_proc p where p.pronamespace='public'::regnamespace
 and p.proname in('msrc_staff_early_access','msrc_staff_early_access_add','msrc_staff_early_access_remove')
 and has_function_privilege('authenticated',p.oid,'EXECUTE')),3::bigint,'All three guarded RPCs have the authenticated grant');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname in('msrc_staff_early_access','msrc_staff_early_access_add','msrc_staff_early_access_remove')
 and a.grantee in(0,'anon'::regrole,'service_role'::regrole)),
 'Early-access RPCs have no PUBLIC, anonymous or service-role grants');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.pronamespace='msrc_registration'::regnamespace
 and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),
 'Private eligibility helpers have no API execution grants');
set local role anon;
select throws_ok($$select public.msrc_staff_early_access('synthetic-early-access')$$,'42501',null,'Anonymous cannot read emails');
select throws_ok($$select public.msrc_staff_early_access_add('synthetic-early-access',array['synthetic@example.invalid'])$$,'42501',null,'Anonymous cannot add emails');
select throws_ok($$select public.msrc_staff_early_access_remove('synthetic-early-access',array[gen_random_uuid()])$$,'42501',null,'Anonymous cannot remove emails');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-early-access');
select pg_temp.registration_settings('synthetic-early-access-other');
select pg_temp.registration_fixture(601,'synthetic-early-access');
select pg_temp.registration_fixture(602,'synthetic-early-access',false);
select pg_temp.registration_fixture(603,'synthetic-early-access');
select pg_temp.registration_fixture(604,'synthetic-early-access');
select pg_temp.registration_fixture(605,'synthetic-early-access');
select pg_temp.registration_fixture(606,'synthetic-early-access');
-- Native session creation precedes every RPC statement (observe_context timing).
select pg_temp.registration_staff_fixture(700,'synthetic-early-access');
select pg_temp.registration_staff_fixture(701,'synthetic-early-access','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(702,'synthetic-early-access','finance');
select is(pg_temp.registration_submit('synthetic-early-access',605,repeat('c',64))->>'state','submitted','Existing-request fixture is submitted');
create function pg_temp.early_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',case when n=0 then '{}' else pg_temp.registration_claims(n)::text end,true);
end$$;
create function pg_temp.early_id(address text) returns uuid language sql stable as $$
 select e.id from msrc_registration.early_access_entries e where e.edition_key='synthetic-early-access' and e.email=address;$$;
create function pg_temp.early_denials() returns setof text language plpgsql as $$declare n integer;begin
 foreach n in array array[0,601,701,702] loop
  perform pg_temp.early_claim(n);
  if n in(701,702) then
   return next ok(msrc_staff.authorize('synthetic-early-access',null,false) is not null,'Wrong-role caller has a valid assured session '||n);
  end if;
  return next is(public.msrc_staff_early_access('synthetic-early-access')->>'state','denied','List refuses caller '||n);
  return next is(public.msrc_staff_early_access_add('synthetic-early-access',array['denied@example.invalid'])->>'state','denied','Add refuses caller '||n);
  return next is(public.msrc_staff_early_access_remove('synthetic-early-access',array[gen_random_uuid()])->>'state','denied','Remove refuses caller '||n);
 end loop;
end$$;
select * from pg_temp.early_denials();
select is((select count(*) from msrc_registration.early_access_entries),0::bigint,'Denied callers cannot add a list entry');
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(700)||'{"aal":"aal1"}'::jsonb)::text,true);end$$;
select is(public.msrc_staff_early_access('synthetic-early-access')->>'state','denied','Super Admin list requires TOTP');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array['denied@example.invalid'])->>'state','denied','Super Admin add requires TOTP');
select is(public.msrc_staff_early_access_remove('synthetic-early-access',array[gen_random_uuid()])->>'state','denied','Super Admin removal requires TOTP');
do $$begin perform set_config('request.jwt.claims',(pg_temp.registration_claims(700)||jsonb_build_object('session_id',pg_temp.registration_session(701)))::text,true);end$$;
select is(public.msrc_staff_early_access('synthetic-early-access')->>'state','denied','TOTP claims cannot reuse another native session');
select pg_temp.early_claim(700);
select is(public.msrc_staff_early_access('synthetic-early-access-other')->>'state','denied','List enforces edition role scope');
select is(public.msrc_staff_early_access_add('synthetic-early-access-other',array['scope@example.invalid'])->>'state','denied','Add enforces edition role scope');
select is(public.msrc_staff_early_access_remove('synthetic-early-access-other',array[gen_random_uuid()])->>'state','denied','Remove enforces edition role scope');
select is(public.msrc_staff_early_access('synthetic-early-access',repeat('x',201))->>'state','denied','Oversized list search denied');
select is(public.msrc_staff_early_access_add('synthetic-early-access','{}'::text[])->>'state','denied','Empty email batch denied');
select is(public.msrc_staff_early_access_add('synthetic-early-access',null)->>'state','denied','Null email batch denied');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array[null]::text[])->>'state','denied','Null email member denied');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array_fill('synthetic@example.invalid'::text,array[501]))->>'state','denied','More than 500 input emails denied before deduplication');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array[['a@example.invalid','b@example.invalid']])->>'state','denied','Multidimensional email batch denied');
select is(public.msrc_staff_early_access_remove('synthetic-early-access','{}'::uuid[])->>'state','denied','Empty removal batch denied');
select is(public.msrc_staff_early_access_remove('synthetic-early-access',array[null]::uuid[])->>'state','denied','Null removal member denied');
select is(public.msrc_staff_early_access_remove('synthetic-early-access',array_fill(gen_random_uuid(),array[501]))->>'state','denied','Oversized removal batch denied');

set local role authenticated;
select is(public.msrc_staff_early_access('synthetic-early-access')->>'state','ready','Exact-session Super Admin reads through real API role');
select throws_ok($$select * from msrc_registration.early_access_entries$$,'42501',null,'Authenticated client cannot read private email storage directly');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array['  REGISTRATION-601@EXAMPLE.INVALID  ',
 'registration-601@example.invalid','registration-602@example.invalid','registration-605@example.invalid',
 'registration-606@example.invalid','future-person@example.invalid','bad-address','a@@example.invalid','a b@example.invalid'])->>'added','5',
 'Mixed bulk input normalizes emails, deduplicates, and accepts people without accounts');
reset role;
select is((select email from msrc_registration.early_access_entries where id=pg_temp.early_id('registration-601@example.invalid')),
 'registration-601@example.invalid','Email storage is lower-case and trimmed');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array['bad-address','a@@example.invalid','a b@example.invalid'])->'invalid',
 '["bad-address","a@@example.invalid","a b@example.invalid"]'::jsonb,'Every invalid email is reported to the caller');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array[repeat('a',243)||'@example.invalid'])->>'added','0','Normalized email longer than 254 is not accepted');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array['line'||chr(10)||'@example.invalid'])->>'added','0','Email control characters are not accepted');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array['REGISTRATION-601@example.invalid','registration-601@example.invalid'])->>'added','0','Duplicate active re-add is idempotent');
select is((select count(*) from msrc_registration.audit where event='early_access.added' and result='allowed'),5::bigint,'Exactly one addition audit per changed email');
select is((select count(*) from msrc_registration.audit a join msrc_registration.early_access_entries e on e.id=a.early_access_entry_id
 where a.event='early_access.added' and a.performer_id=pg_temp.registration_actor(700)),5::bigint,'Addition audit records entry UUID and exact staff performer');
select ok(not exists(select 1 from msrc_registration.audit a where a.event like 'early_access.%'
 and (to_jsonb(a)::text like '%@%' or a.request_id is not null or a.target_actor is not null)),
 'List audit contains no raw email, participant identity, or fabricated request');
select ok(exists(select 1 from jsonb_array_elements(public.msrc_staff_audit('synthetic-early-access','early_access.added')->'rows') item
 where item->>'action'='early_access.added'
 and item#>>'{details,earlyAccessEntryId}'=pg_temp.early_id('registration-601@example.invalid')::text
 and item::text not like '%@%'),'Private staff audit projects the opaque list entry UUID without its email');
select is(public.msrc_staff_early_access('synthetic-early-access','REGISTRATION-601@')->'earlyAccess'->'entries'->0->>'hasAccount','true','Verified participant email is recognized case-insensitively');
select is(public.msrc_staff_early_access('synthetic-early-access','registration-601@')->'earlyAccess'->'entries'->0->>'hasRequest','false','Account without a request is identified');
select is(public.msrc_staff_early_access('synthetic-early-access','registration-605@')->'earlyAccess'->'entries'->0->>'hasRequest','true','Existing edition request is identified');
select is(public.msrc_staff_early_access('synthetic-early-access','registration-602@')->'earlyAccess'->'entries'->0->>'hasAccount','false','Unverified mailbox is not a verified participant account');
select is(public.msrc_staff_early_access('synthetic-early-access','future-person@')->'earlyAccess'->'entries'->0->>'hasAccount','false','Pre-account list entry is supported');
select is(jsonb_array_length(public.msrc_staff_early_access('synthetic-early-access','%')->'earlyAccess'->'entries'),0,'List search treats SQL wildcard characters literally');
select ok((public.msrc_staff_early_access('synthetic-early-access')->'earlyAccess'->'entries'->0) ?&
 array['id','email','addedAt','addedByName','hasAccount','hasRequest'],'List exposes every agreed contract field');
select is(public.msrc_staff_early_access('synthetic-early-access')->'earlyAccess'->'entries'->0->>'addedByName',
 'Synthetic registration staff','List resolves the adding staff name');
select throws_ok($$update msrc_registration.early_access_entries set email=' Mixed@Example.invalid ' where email='registration-601@example.invalid'$$,
 '23514',null,'Storage constraint rejects bypassing canonical email normalization');

-- This list opens only the configured priority window and confers no legacy priority.
update msrc_registration.settings set priority_start_at=clock_timestamp()+interval '1 hour',
 priority_end_at=clock_timestamp()+interval '2 hours',general_opening_at=clock_timestamp()+interval '3 hours'
 where edition_key='synthetic-early-access';
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(601))->>'state','closed','Listed verified email cannot submit before early access begins');
update msrc_registration.settings set priority_start_at=clock_timestamp()-interval '1 hour',priority_end_at=clock_timestamp()+interval '1 hour'
 where edition_key='synthetic-early-access';
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(601))->>'state','open','Listed verified email opens during early-access window');
select ok(not msrc_registration.priority_active('synthetic-early-access',pg_temp.registration_actor(601)),
 'Email-list membership does not grant organizing-team priority or workshop first pick');
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(602))->>'state','denied','Listed unverified email remains ineligible');
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(603))->>'state','closed','Unlisted verified account remains closed during early access');
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(603)||
 '{"email":"registration-601@example.invalid","email_verified":true}'::jsonb)->>'state','closed','Client-supplied email claims cannot impersonate a listed native email');
select is(pg_temp.registration_submit('synthetic-early-access',603,repeat('d',64))->>'state','closed','Submit independently denies an unlisted account');
select ok(not msrc_registration.early_access_active('synthetic-early-access',pg_temp.registration_actor(602)),
 'Private email-list eligibility independently requires current native email verification');
select is(public.msrc_registration_priority_set('synthetic-early-access',pg_temp.registration_claims(700),pg_temp.registration_actor(604),true,'Synthetic organizing duty')->>'state','updated','Existing organizing-team priority can still be assigned');
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(604))->>'state','open','Legacy organizing-team priority still admits an unlisted participant');
select is(pg_temp.registration_submit('synthetic-early-access',604,repeat('e',64))->>'state','submitted','Legacy priority submit remains valid');
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(601))->>'state','open','Listed participant has a valid preflight before removal');
select pg_temp.early_claim(700);
select is(public.msrc_staff_early_access_remove('synthetic-early-access',array[pg_temp.early_id('registration-601@example.invalid')])->>'removed','1','Super Admin removes active list entry');
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(601))->>'state','closed','Removal immediately revokes early-window eligibility');
select is(pg_temp.registration_submit('synthetic-early-access',601,repeat('f',64))->>'state','closed','Submit rechecks removal rather than trusting an earlier open context');
select is((select count(*) from msrc_registration.requests where actor_id=pg_temp.registration_actor(601)),0::bigint,'Revoked preflight creates no request');
select is(jsonb_array_length(public.msrc_staff_early_access('synthetic-early-access','registration-601@')->'earlyAccess'->'entries'),0,'Inactive entry is omitted from list');
select is(public.msrc_staff_early_access_remove('synthetic-early-access',array[pg_temp.early_id('registration-601@example.invalid'),gen_random_uuid()])->>'removed','0','Removal replay and unknown entry are idempotent');
select ok((select not active and removed_at is not null and removed_by=pg_temp.registration_actor(700)
 from msrc_registration.early_access_entries where id=pg_temp.early_id('registration-601@example.invalid')),'Removed entry retains staff and timestamp');
create temporary table early_removed_identity as select id from msrc_registration.early_access_entries where email='registration-601@example.invalid';
select is(public.msrc_staff_early_access_add('synthetic-early-access',array['REGISTRATION-601@EXAMPLE.INVALID'])->>'added','1','Removed email can be reactivated');
select is(pg_temp.early_id('registration-601@example.invalid'),(select id from early_removed_identity),'Reactivation preserves entry identity');
select ok((select active and removed_at is null and removed_by is null from msrc_registration.early_access_entries where email='registration-601@example.invalid'),'Reactivation clears current removal fields');
select is((select count(*) from msrc_registration.audit where event='early_access.removed' and result='allowed'),1::bigint,'Removal replay writes no duplicate audit');
select is((select count(*) from msrc_registration.audit where event='early_access.added' and result='allowed'),6::bigint,'Reactivation writes one new addition audit');
select is(pg_temp.registration_submit('synthetic-early-access',601,repeat('f',64))->>'state','submitted','Reactivated verified email submits a pending request');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(601)),'pending_approval','Early access only permits a request; it does not approve or allocate a seat');
update msrc_registration.settings set priority_start_at=clock_timestamp()-interval '2 hours',priority_end_at=clock_timestamp()-interval '1 hour'
 where edition_key='synthetic-early-access';
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(601))->>'state','closed','List does not open a gap between early and general windows');
update msrc_registration.settings set general_opening_at=clock_timestamp()-interval '30 minutes' where edition_key='synthetic-early-access';
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(603))->>'state','open','General window still admits unlisted verified accounts');
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(601))->>'state','open','Listed verified account remains eligible during the general window');
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(602))->>'state','denied','General window still denies unverified accounts');
update msrc_registration.settings set closing_at=clock_timestamp()-interval '1 second' where edition_key='synthetic-early-access';
select is(public.msrc_registration_context('synthetic-early-access',pg_temp.registration_claims(601))->>'state','closed','Email list cannot override registration closing time');

-- Full accepted bulk boundary, deterministic newest-first list, and its 200-row cap.
select pg_temp.registration_staff_fixture(703,'synthetic-early-access-other');
select pg_temp.early_claim(703);
select is(public.msrc_staff_early_access_add('synthetic-early-access-other',array['other-edition@example.invalid'])->>'added','1',
 'Separate edition has its own authorized list fixture');
select set_config('synthetic.other_early_id',(select id::text from msrc_registration.early_access_entries
 where edition_key='synthetic-early-access-other' and email='other-edition@example.invalid'),true);
select pg_temp.early_claim(700);
select is(public.msrc_staff_early_access_remove('synthetic-early-access',array[
 pg_temp.early_id('future-person@example.invalid'),pg_temp.early_id('future-person@example.invalid'),
 current_setting('synthetic.other_early_id')::uuid])->>'removed','1',
 'Duplicate removal IDs cause one transition and another edition ID is skipped');
select ok((select active from msrc_registration.early_access_entries where id=current_setting('synthetic.other_early_id')::uuid),
 'Removal cannot change an email entry in another edition');
select is(public.msrc_staff_early_access_remove('synthetic-early-access',array[
 pg_temp.early_id('future-person@example.invalid'),pg_temp.early_id('future-person@example.invalid')])->>'removed','0',
 'Duplicate removal replay remains a no-op');
select is(public.msrc_staff_early_access_add('synthetic-early-access',array(select 'list-'||n::text||'@example.invalid' from generate_series(1,500) n))->>'added','500','Exactly 500 valid emails are accepted in one batch');
update msrc_registration.early_access_entries set added_at='2026-10-01T00:00:00Z'::timestamptz
 where edition_key='synthetic-early-access';
update msrc_registration.early_access_entries set added_at='2026-10-02T00:00:00Z'::timestamptz where email='list-500@example.invalid';
select is(jsonb_array_length(public.msrc_staff_early_access('synthetic-early-access')->'earlyAccess'->'entries'),200,'List is capped at 200 active entries');
select is(public.msrc_staff_early_access('synthetic-early-access')->'earlyAccess'->'entries'->0->>'email','list-500@example.invalid','Newest addition appears first');
select throws_ok($$update msrc_registration.audit set performer_id=null where event='early_access.added'$$,'55000',null,'Early-access addition audit is immutable');
select throws_ok($$delete from msrc_registration.audit where event='early_access.removed'$$,'55000',null,'Early-access removal audit cannot be deleted');

-- Expiry alone triggers replacements; existing free seats are not bulk-filled.
select pg_temp.registration_settings('synthetic-autopass');
do $$declare n integer;begin
 for n in 801..810 loop perform pg_temp.registration_fixture(n,'synthetic-autopass');end loop;
end$$;
select pg_temp.registration_staff_fixture(900,'synthetic-autopass');
do $$declare n integer;outcome jsonb;begin
 for n in 801..810 loop
  outcome:=pg_temp.registration_submit('synthetic-autopass',n,md5(n::text)||md5(n::text));
  if outcome->>'state'<>'submitted' then raise exception 'Synthetic automatic-offer fixture failed';end if;
 end loop;
end$$;
update msrc_registration.requests set status='waitlisted',created_at='2026-10-01T00:00:00Z'::timestamptz
 where edition_key='synthetic-autopass';
update msrc_registration.requests set created_at='2026-10-02T00:00:00Z'::timestamptz where actor_id=pg_temp.registration_actor(810);
update msrc_registration.requests set status='offered',offer_expires_at=clock_timestamp()-interval '1 second'
 where actor_id in(pg_temp.registration_actor(801),pg_temp.registration_actor(802));
update msrc_registration.requests set status='approved_awaiting_payment',payment_due_at=clock_timestamp()+interval '1 hour' where actor_id=pg_temp.registration_actor(803);
update msrc_registration.requests set status='confirmed' where actor_id=pg_temp.registration_actor(804);
update msrc_registration.requests set status='approved' where actor_id=pg_temp.registration_actor(805);
update msrc_registration.requests set status='offered',offer_expires_at=clock_timestamp()+interval '1 hour' where actor_id=pg_temp.registration_actor(806);
update msrc_registration.settings set general_capacity=7,offer_window_hours=24,enabled=false where edition_key='synthetic-autopass';
create temporary table auto_expected as select id from msrc_registration.requests where edition_key='synthetic-autopass' and status='waitlisted'
 order by created_at,id limit 2;
select pg_temp.early_claim(900);
select is(public.msrc_staff_registration_expire_offers('synthetic-autopass'),'{"state":"updated","expired":2,"offered":2}'::jsonb,
 'Two expired offers create two replacements even when a third seat is free');
select is((select array_agg(id order by id) from msrc_registration.requests where edition_key='synthetic-autopass' and status='offered' and actor_id<>pg_temp.registration_actor(806)),
 (select array_agg(id order by id) from auto_expected),'Automatic allocation follows created_at and UUID tie-break order');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(810)),'waitlisted','Later request cannot overtake earlier waitlisted requests');
select is((select count(*) from msrc_registration.requests where edition_key='synthetic-autopass' and status in('approved','approved_awaiting_payment','offered','confirmed')),6::bigint,
 'Automatic allocation counts all four seat-holding states and only replaces released seats');
select ok((select bool_and(r.offer_expires_at between r.decided_at+interval '24 hours'-interval '1 second' and r.decided_at+interval '24 hours'+interval '1 second')
 from msrc_registration.requests r join auto_expected e using(id)),'Automatic expiry follows database time plus configured offer duration');
select is((select count(*) from msrc_registration.audit where edition_key='synthetic-autopass' and event='request.offered'
 and performer_id is null and previous_status='waitlisted' and new_status='offered' and result='allowed'),2::bigint,
 'Automatic replacements each write one NULL-performer transition audit');
select is((select count(*) from msrc_registration.audit where edition_key='synthetic-autopass' and event='request.offer_expired' and performer_id is null),2::bigint,
 'Each expired offer has an automatic expiry audit');
create temporary table auto_snapshot as select id,decided_at,offer_expires_at,updated_at from msrc_registration.requests where edition_key='synthetic-autopass';
select is(public.msrc_staff_registration_expire_offers('synthetic-autopass'),'{"state":"updated","expired":0,"offered":0}'::jsonb,
 'Repeated sweep neither fills the pre-existing vacancy nor repeats replacements');
select ok(not exists(select 1 from msrc_registration.requests r join auto_snapshot s using(id)
 where r.decided_at is distinct from s.decided_at or r.offer_expires_at is distinct from s.offer_expires_at or r.updated_at is distinct from s.updated_at),
 'Idempotent sweep cannot extend deadlines or change timestamps');
select is((select count(*) from msrc_registration.audit where edition_key='synthetic-autopass' and event='request.offered'),2::bigint,'Idempotent sweep creates no additional offer audit');
select is(public.msrc_staff_registration_offer('synthetic-autopass',array[(select id from msrc_registration.requests where edition_key='synthetic-autopass' and status='waitlisted' order by created_at,id limit 1)])->'decided'->>'offered','1',
 'Staff can explicitly allocate the other free seat');
select is((select count(*) from msrc_registration.audit where edition_key='synthetic-autopass' and event='request.offered' and performer_id is null),2::bigint,
 'Explicit staff offer does not trigger any extra automatic offer');
update msrc_registration.settings set offer_window_hours=null where edition_key='synthetic-autopass';
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second' where actor_id=pg_temp.registration_actor(806);
select is(public.msrc_staff_registration_expire_offers('synthetic-autopass'),'{"state":"updated","expired":1,"offered":0}'::jsonb,
 'Null offer window still expires elapsed offers but cannot create a replacement');
select is((select count(*) from msrc_registration.requests where edition_key='synthetic-autopass' and status='waitlisted'),1::bigint,
 'Null-window automatic hand-on leaves the waiting request unchanged');
update msrc_registration.settings set offer_window_hours=24,general_capacity=5 where edition_key='synthetic-autopass';
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second'
 where id=(select id from auto_expected order by id limit 1);
select is(public.msrc_staff_registration_expire_offers('synthetic-autopass'),'{"state":"updated","expired":1,"offered":0}'::jsonb,
 'A released offer cannot be replaced when other seat holders exhaust reduced capacity');
update msrc_registration.settings set general_capacity=null where edition_key='synthetic-autopass';
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second'
 where id=(select id from auto_expected order by id desc limit 1);
select is(public.msrc_staff_registration_expire_offers('synthetic-autopass'),'{"state":"updated","expired":1,"offered":0}'::jsonb,
 'Missing capacity also prevents replacement while preserving expiry enforcement');
select is((select count(*) from msrc_outbox.messages),0::bigint,'Email list and automatic offers enqueue no communications');
select * from finish();
rollback;
