-- ENG-054. Synthetic records, keys and recipients only; no delivery; rollback.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='msrc_registration.tickets'::regclass),'Tickets force RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
 where has_table_privilege(r.name,'msrc_registration.tickets','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No API role reads or mutates ticket storage');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname in('msrc_registration_ticket','msrc_staff_registration_approve_tickets') and p.pronamespace='public'::regnamespace
 and a.grantee in(0,'anon'::regrole,'authenticated'::regrole)),'New ticket and keyed approval RPCs have no browser execution');
select ok(has_function_privilege('service_role','public.msrc_registration_ticket(text,jsonb,text)','EXECUTE')
 and has_function_privilege('service_role','public.msrc_staff_registration_approve_tickets(text,jsonb,uuid[],text)','EXECUTE'),'Server role may invoke bounded ticket RPCs');
select ok((select not delivery_enabled and not sweeps_enabled and daily_cap=0 from msrc_outbox.settings),'Ticket/email migration leaves delivery, sweeps and cap closed');
select is((select count(*) from msrc_registration.tickets),0::bigint,'Migration creates no ticket backfill or participant records');
select throws_ok($$select public.msrc_outbox_enqueue('forged-registration','registration_approved',1,'en','synthetic@example.invalid','{}'::jsonb)$$,
 '22023','Business outbox producer required.','Generic service enqueue cannot impersonate registration transitions');
select ok(not msrc_outbox.registration_message_valid('registration_offered',1,'en','synthetic@example.invalid','{"offer_expires_at":"tomorrow"}'::jsonb),'Offer template refuses invented or invalid deadlines');
select ok(not msrc_outbox.registration_message_valid('registration_received',1,'en','synthetic@example.invalid','{"token":"secret"}'::jsonb),'Registration payload refuses QR secrets and extra fields');
select ok(not msrc_outbox.registration_message_valid('registration_received',1,'ar','synthetic@example.invalid','{}'::jsonb),'Business template records are English only');

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-tickets');
select pg_temp.registration_settings('synthetic-tickets-other');
do $$declare n integer;begin
 for n in 1701..1708 loop perform pg_temp.registration_fixture(n,'synthetic-tickets');end loop;
end$$;
select pg_temp.registration_staff_fixture(1801,'synthetic-tickets');
select pg_temp.registration_staff_fixture(1802,'synthetic-tickets','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(1803,'synthetic-tickets','finance');
create function pg_temp.ticket_ids(variadic ns integer[]) returns uuid[] language sql stable as $$
 select array_agg(r.id order by x.ordinality) from unnest(ns) with ordinality x(n,ordinality)
 join msrc_registration.requests r on r.actor_id=pg_temp.registration_actor(x.n) and r.edition_key='synthetic-tickets';$$;
create function pg_temp.ticket_approval(staff integer,variadic ns integer[]) returns jsonb language sql as $$
 select public.msrc_staff_registration_approve_tickets('synthetic-tickets',pg_temp.registration_claims(staff),pg_temp.ticket_ids(variadic ns),repeat('a',64));$$;
create function pg_temp.own_ticket(n integer) returns jsonb language sql as $$
 select public.msrc_registration_ticket('synthetic-tickets',pg_temp.registration_claims(n),repeat('a',64));$$;
do $$declare n integer;begin
 for n in 1701..1707 loop perform pg_temp.registration_submit('synthetic-tickets',n,md5(n::text)||md5(n::text));end loop;
end$$;
select is((select count(*) from msrc_outbox.messages where template_key='registration_received'),7::bigint,'Each submitted request atomically queues one receipt');
select is(pg_temp.registration_submit('synthetic-tickets',1701,md5('1701')||md5('1701'))->>'state','submitted','Repeated submit succeeds idempotently');
select is((select count(*) from msrc_outbox.messages where template_key='registration_received'),7::bigint,'Repeated submit creates no duplicate message');
select is(pg_temp.own_ticket(1701),' {"state":"ready","ticket":null}'::jsonb,'Pending request has no ticket');

set local role anon;
select throws_ok($$select public.msrc_registration_ticket('synthetic-tickets','{}'::jsonb,repeat('a',64))$$,'42501',null,'Anonymous cannot fetch tickets');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_registration_ticket('synthetic-tickets','{}'::jsonb,repeat('a',64))$$,'42501',null,'Browser cannot supply arbitrary participant claims');
select throws_ok($$select public.msrc_staff_registration_approve_tickets('synthetic-tickets','{}'::jsonb,array[gen_random_uuid()],repeat('a',64))$$,'42501',null,'Browser cannot supply a ticket signing key');
reset role;
select is(pg_temp.ticket_approval(1701,1701)->>'state','denied','Participant cannot approve itself through service boundary');
select is(pg_temp.ticket_approval(1803,1701)->>'state','denied','Finance cannot issue tickets through service boundary');
select is(public.msrc_staff_registration_approve_tickets('synthetic-tickets',pg_temp.registration_claims(1801)||'{"aal":"aal1"}'::jsonb,
 pg_temp.ticket_ids(1701),repeat('a',64))->>'state','denied','Missing Super Admin assurance blocks approval and ticket');
select is(public.msrc_staff_registration_approve_tickets('synthetic-tickets',pg_temp.registration_claims(1801),pg_temp.ticket_ids(1701),null)->>'state',
 'area_not_ready','Missing application key fails closed before approval');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(1701)),'pending_approval','Missing key changes no business state');
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(1801)::text,true);
 perform set_config('msrc_registration.ticket_key','',true);
 perform set_config('synthetic.ticket_request_id',(pg_temp.ticket_ids(1701))[1]::text,true);end$$;
set local role authenticated;
select is(public.msrc_staff_registration_approve('synthetic-tickets',array[current_setting('synthetic.ticket_request_id')::uuid])->>'state','area_not_ready','Stale authenticated approval cannot bypass ticket issuance');
reset role;
do $$begin perform set_config('request.jwt.claims','{}',true);end$$;
select is(pg_temp.ticket_approval(1802,1701,1702)->'decided'->>'approved','2','Assured registration administrator atomically issues bulk tickets');
select is(current_setting('request.jwt.claims'),'{}','Keyed approval restores incoming claims');
select is(current_setting('msrc_registration.ticket_key'),'','Keyed approval does not retain application secret in transaction setting');
select is((select count(*) from msrc_registration.tickets),2::bigint,'One ticket per approved participant');
select is((select count(*) from msrc_outbox.messages where template_key='registration_approved'),2::bigint,'One seat email per newly issued ticket');
select is(pg_temp.ticket_approval(1801,1701,1702)->'decided'->>'approved','0','Repeated bulk approval changes no requests');
select is((select count(*) from msrc_registration.tickets),2::bigint,'Repeated bulk approval creates no tickets');
select is((select count(*) from msrc_outbox.messages where template_key='registration_approved'),2::bigint,'Repeated bulk approval creates no notifications');
create temporary table ticket_snapshot as select pg_temp.own_ticket(1701) as value;
select is((select value->'ticket'->>'status' from ticket_snapshot),'issued','Own-ticket RPC returns issued status');
select ok((select value->'ticket'->>'token' ~ '^msrc1\.[a-f0-9-]{36}\.[a-f0-9]{64}$' from ticket_snapshot),'QR token is opaque random ticket ID plus cryptographic secret');
select ok((select value->'ticket'->>'referenceCode' ~ '^[A-F0-9]{12}$' from ticket_snapshot),'Human reference is a bounded non-secret code');
select ok((select value::text !~ 'registration-1701|@|Synthetic|actorId|requestId|identity|ciphertext' from ticket_snapshot),'QR and participant result contain no personal or identity data');
select ok((select t.secret_hash=sha256(convert_to(split_part((select value->'ticket'->>'token' from ticket_snapshot),'.',3),'UTF8'))
 from msrc_registration.tickets t where t.request_id=(pg_temp.ticket_ids(1701))[1]),'Storage contains only the hash of QR secret');
select ok(not exists(select 1 from information_schema.columns where table_schema='msrc_registration' and table_name='tickets'
 and column_name in('token','secret','ticket_secret','application_secret','email','name')),'Ticket storage has no plaintext secret or personal-data column');
select is(pg_temp.own_ticket(1701),(select value from ticket_snapshot),'Ticket credential remains stable between fetches');
update msrc_registration.requests set status='approved_awaiting_payment',payment_due_at=clock_timestamp()+interval '1 hour'
 where actor_id=pg_temp.registration_actor(1701);
select is(pg_temp.own_ticket(1701)->>'state','unavailable','Unexpected non-entitled status cannot release an issued credential');
update msrc_registration.requests set status='confirmed' where actor_id=pg_temp.registration_actor(1701);
select isnt(pg_temp.own_ticket(1702)->'ticket'->>'token',(select value->'ticket'->>'token' from ticket_snapshot),'Different participants receive different credentials');
select is(public.msrc_registration_ticket('synthetic-tickets',pg_temp.registration_claims(1701),repeat('b',64))->>'state','unavailable','Wrong application key releases no credential');
select is(public.msrc_registration_ticket('synthetic-tickets',pg_temp.registration_claims(1701)||jsonb_build_object('session_id',pg_temp.registration_session(1702)),repeat('a',64))->>'state',
 'denied','Another participant session cannot fetch the owners ticket');
select is(public.msrc_registration_ticket('synthetic-tickets-other',pg_temp.registration_claims(1701),repeat('a',64))->'ticket','null'::jsonb,'Other edition cannot reveal the ticket');
select is(pg_temp.own_ticket(1801)->>'state','denied','Staff session cannot impersonate participant ticket access');
update msrc_registration.settings set closing_at=clock_timestamp()-interval '1 second' where edition_key='synthetic-tickets';
select is(pg_temp.own_ticket(1701)->'ticket'->>'status','issued','Own ticket remains available after registration closing');
update msrc_registration.settings set closing_at=clock_timestamp()+interval '1 day',enabled=false where edition_key='synthetic-tickets';
select is(pg_temp.own_ticket(1701)->>'state','closed','Registration switch still closes participant ticket endpoint');
update msrc_registration.settings set enabled=true where edition_key='synthetic-tickets';
do $$begin perform set_config('msrc_registration.ticket_key',repeat('a',64),true);end$$;
update msrc_registration.requests set status='confirmed' where actor_id=pg_temp.registration_actor(1701);
select is(pg_temp.own_ticket(1701),(select value from ticket_snapshot),'Later confirmation preserves the exact issued ticket');
select is((select count(*) from msrc_outbox.messages where template_key='registration_approved'),2::bigint,'Later confirmation sends no duplicate seat email');
select throws_ok($$insert into msrc_registration.tickets(request_id,secret_hash) values((pg_temp.ticket_ids(1701))[1],decode(repeat('a',64),'hex'))$$,
 '23505',null,'Database uniqueness independently forbids a second edition ticket');

-- Ticket and outbox identity/message must disappear together with their business write.
create function pg_temp.ticket_rollback() returns void language plpgsql as $$begin
 begin
 perform pg_temp.ticket_approval(1801,1703);
 if not exists(select 1 from msrc_registration.tickets where request_id=(pg_temp.ticket_ids(1703))[1])
 or not exists(select 1 from msrc_outbox.messages where template_key='registration_approved' and recipient_email='registration-1703@example.invalid') then
 raise exception using errcode='23514',message='Rollback fixture never produced its ticket and message';end if;
 raise exception using errcode='P0001',message='Synthetic rollback';
 exception when raise_exception then null;end;
 begin
 perform pg_temp.registration_submit('synthetic-tickets',1708,md5('1708')||md5('1708'));
 if not exists(select 1 from msrc_outbox.messages where template_key='registration_received' and recipient_email='registration-1708@example.invalid') then
 raise exception using errcode='23514',message='Rollback fixture never produced its submission message';end if;
 raise exception using errcode='P0001',message='Synthetic rollback';
 exception when raise_exception then null;end;
end$$;
select pg_temp.ticket_rollback();
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(1703)),'pending_approval','Rollback restores pending request');
select is((select count(*) from msrc_registration.tickets),2::bigint,'Rollback removes transient ticket');
select is((select count(*) from msrc_outbox.messages),9::bigint,'Rollback removes both submission and approval emails');
select is((select count(*) from msrc_outbox.identities),9::bigint,'Rollback removes deduplication identities too');
select ok(not exists(select 1 from msrc_registration.requests where actor_id=pg_temp.registration_actor(1708)),'Rollback removes submitted business request');

create function pg_temp.fail_seat_message() returns trigger language plpgsql as $$begin
 if new.template_key='registration_approved' and new.recipient_email='registration-1706@example.invalid' then
 raise exception using errcode='22023',message='Synthetic enqueue failure';end if;return new;end$$;
create trigger synthetic_seat_failure before insert on msrc_outbox.messages for each row execute function pg_temp.fail_seat_message();
do $$begin perform set_config('msrc_registration.ticket_key','',true);perform set_config('request.jwt.claims','{}',true);end$$;
select throws_ok($$select pg_temp.ticket_approval(1801,1706)$$,'22023','Synthetic enqueue failure','Outbox failure aborts the approval transaction');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(1706)),'pending_approval','Outbox failure leaves participant pending');
select is((select count(*) from msrc_registration.tickets),2::bigint,'Outbox failure cannot leave a ticket behind');
select is(current_setting('msrc_registration.ticket_key'),'','Failure restores the transient ticket key');
select is(current_setting('request.jwt.claims'),'{}','Failure restores the original session claims');
drop trigger synthetic_seat_failure on msrc_outbox.messages;
do $$begin perform set_config('msrc_registration.ticket_key',repeat('a',64),true);end$$;
update auth.users set email_confirmed_at=null where id=pg_temp.registration_actor(1707);
select throws_ok($$select pg_temp.ticket_approval(1801,1707)$$,'P0002',null,'A no-longer-verified native mailbox cannot receive a new event message');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(1707)),'pending_approval','Unverified recipient failure also rolls back ticket approval');
update auth.users set email_confirmed_at=clock_timestamp() where id=pg_temp.registration_actor(1707);

update msrc_registration.requests set status='cancelled' where actor_id=pg_temp.registration_actor(1701);
select is(pg_temp.own_ticket(1701)->'ticket'->>'status','revoked','Cancellation atomically revokes issued ticket');
select is(pg_temp.own_ticket(1701)->'ticket'->'token','null'::jsonb,'Revoked ticket never returns QR token');
create temporary table revoked_snapshot as select to_jsonb(t) as value from msrc_registration.tickets t where request_id=(pg_temp.ticket_ids(1701))[1];
update msrc_registration.requests set status='cancelled' where actor_id=pg_temp.registration_actor(1701);
select is((select to_jsonb(t) from msrc_registration.tickets t where request_id=(pg_temp.ticket_ids(1701))[1]),(select value from revoked_snapshot),'Repeated cancellation preserves revocation evidence');
update msrc_registration.requests set status='expired' where actor_id=pg_temp.registration_actor(1702);
select is(pg_temp.own_ticket(1702)->'ticket'->>'status','revoked','Expiry revokes an issued ticket');

do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(1801)::text,true);end$$;
select is(public.msrc_staff_registration_waitlist('synthetic-tickets',pg_temp.ticket_ids(1703,1704,1705))->'decided'->>'waitlisted','3','Waitlist event runs through existing bounded RPC');
select is((select count(*) from msrc_outbox.messages where template_key='registration_waitlisted'),3::bigint,'Each waitlist transition queues exactly one notice');
select is(public.msrc_staff_registration_waitlist('synthetic-tickets',pg_temp.ticket_ids(1703,1704,1705))->'decided'->>'waitlisted','0','Repeated waitlist is a no-op');
select is((select count(*) from msrc_outbox.messages where template_key='registration_waitlisted'),3::bigint,'Repeated waitlist queues no notice');
update msrc_registration.settings set general_capacity=1,offer_window_hours=24 where edition_key='synthetic-tickets';
update msrc_registration.requests set created_at='2026-10-01T00:00:00Z'::timestamptz+make_interval(secs=>right(actor_id::text,4)::integer)
 where actor_id in(pg_temp.registration_actor(1703),pg_temp.registration_actor(1704),pg_temp.registration_actor(1705));
select is(public.msrc_staff_registration_offer('synthetic-tickets',pg_temp.ticket_ids(1703))->'decided'->>'offered','1','Manual offer reserves a seat and enqueues atomically');
select is((select count(*) from msrc_outbox.messages where template_key='registration_offered'),1::bigint,'Manual offer queues exactly one message');
select is((select (payload->>'offer_expires_at')::timestamptz from msrc_outbox.messages where template_key='registration_offered'),
 (select offer_expires_at from msrc_registration.requests where actor_id=pg_temp.registration_actor(1703)),'Offer email uses the actual recorded deadline');
select is(public.msrc_staff_registration_offer('synthetic-tickets',pg_temp.ticket_ids(1703))->'decided'->>'offered','0','Repeated offer is a no-op');
select is((select count(*) from msrc_outbox.messages where template_key='registration_offered'),1::bigint,'Repeated offer queues no duplicate');
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second' where actor_id=pg_temp.registration_actor(1703);
select is(public.msrc_staff_registration_expire_offers('synthetic-tickets')->>'expired','1','Expiry performs one transition');
select is((select count(*) from msrc_outbox.messages where template_key='registration_expired'),1::bigint,'Offer expiry queues exactly one expiry notice');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(1704)),'offered','Expiry automatically offers next waitlisted participant');
select is((select count(*) from msrc_outbox.messages where template_key='registration_offered'),2::bigint,'Automatic replacement offer queues its own email');
select is(public.msrc_staff_registration_expire_offers('synthetic-tickets')->>'expired','0','Repeated expiry is a no-op');
select is((select count(*) from msrc_outbox.messages where template_key='registration_expired'),1::bigint,'Repeated expiry queues no duplicate');
select is((select count(*) from msrc_outbox.messages where template_key='registration_offered'),2::bigint,'Repeated expiry does not duplicate replacement message');
select is((select count(*) from msrc_registration.tickets),2::bigint,'Waitlists and offers never issue admission tickets');
select is(public.msrc_staff_registration_detail('synthetic-tickets',(pg_temp.ticket_ids(1701))[1])->'detail'->'request'->>'ticketStatus','revoked','Staff detail exposes revoked indicator');
select ok(not (public.msrc_staff_registration('synthetic-tickets')::text ~ 'msrc1[.]|secret_hash|referenceCode|ticket_secret'),'Staff queue exposes neither credential nor hash');
select ok((select bool_and(locale='en' and recipient_email like '%@example.invalid' and payload::text !~ 'msrc1|secret|identity|email') from msrc_outbox.messages),'Stored template inputs are English-only and contain no personal data or QR credential');
select is(public.msrc_outbox_claim(gen_random_uuid(),10,1000),'[]'::jsonb,'New real-recipient capability does not open delivery');
-- Future paid confirmation must issue a ticket; a bare approved status under a
-- paid policy is insufficient. Direct operator transitions here are test-only.
update msrc_registration.settings set payment_required=true,payment_window_hours=24 where edition_key='synthetic-tickets';
update msrc_registration.requests set status='approved' where actor_id=pg_temp.registration_actor(1706);
select ok(not exists(select 1 from msrc_registration.tickets where request_id=(pg_temp.ticket_ids(1706))[1]),'Bare approval under a paid policy cannot issue a ticket');
select ok(not exists(select 1 from msrc_outbox.messages where template_key='registration_approved' and recipient_email='registration-1706@example.invalid'),'Bare paid approval cannot send a seat entitlement message');
update msrc_registration.requests set status='confirmed' where actor_id=pg_temp.registration_actor(1706);
select is(pg_temp.own_ticket(1706)->'ticket'->>'status','issued','Future confirmed entitlement issues a ticket through the same trigger');
select is((select count(*) from msrc_outbox.messages where template_key='registration_approved' and recipient_email='registration-1706@example.invalid'),1::bigint,'Future confirmation queues exactly one seat message');
select is(public.msrc_staff_registration_detail('synthetic-tickets',(pg_temp.ticket_ids(1706))[1])->'detail'->'request'->>'ticketStatus','issued','Staff detail exposes issued indicator');
select * from finish();
rollback;
