-- ENG-057 / Night-2 ACD; REG-02/04/06, ADM-01/02/05, DAT-03/04, SEC-01/02/06.
-- Disposable synthetic lifecycle only; no hosted execution. All changes roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-complete-history');
update msrc_registration.settings set offer_window_hours=24 where edition_key='synthetic-complete-history';
-- Native sessions are created in a separate statement before any guarded RPC.
do $$declare n integer;begin
 for n in 3101..3106 loop perform pg_temp.registration_fixture(n,'synthetic-complete-history');end loop;
 perform pg_temp.registration_staff_fixture(3201,'synthetic-complete-history');
 perform pg_temp.registration_staff_fixture(3202,'synthetic-complete-history','registrationWorkshopAdministrator');
 perform pg_temp.registration_staff_fixture(3203,'synthetic-complete-history','finance');
end$$;
do $$declare n integer;begin
 for n in 3101..3106 loop
 if pg_temp.registration_submit('synthetic-complete-history',n,md5(n::text)||md5(n::text))->>'state'<>'submitted' then
 raise exception 'Synthetic history submission failed';end if;end loop;
end$$;
create function pg_temp.history_id(n integer) returns uuid language sql stable as $$
 select id from msrc_registration.requests where edition_key='synthetic-complete-history' and actor_id=pg_temp.registration_actor(n);$$;
create function pg_temp.history_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',pg_temp.registration_claims(n)::text,true);end$$;
create function pg_temp.history_rows(n integer) returns jsonb language sql as $$
 select public.msrc_staff_registration_detail('synthetic-complete-history',pg_temp.history_id(n))#>'{detail,history}';$$;

select pg_temp.history_claim(3202);
select is(public.msrc_staff_registration_detail('synthetic-complete-history',pg_temp.history_id(3101))->>'historyVersion','1','Detail explicitly marks the complete history contract');
select is(public.msrc_staff_registration_waitlist('synthetic-complete-history',array[pg_temp.history_id(3101),pg_temp.history_id(3103),pg_temp.history_id(3104),pg_temp.history_id(3105)])#>>'{decided,waitlisted}','4','Registrar waitlists synthetic requests');
select is(public.msrc_staff_registration_offer('synthetic-complete-history',array[pg_temp.history_id(3101),pg_temp.history_id(3103),pg_temp.history_id(3104)])#>>'{decided,offered}','3','Registrar offers synthetic seats');
select is(public.msrc_registration_accept_offer('synthetic-complete-history',pg_temp.registration_claims(3101),pg_temp.history_id(3101),gen_random_uuid(),repeat('a',64))->>'state','updated','Participant accepts own offer');
select is(public.msrc_registration_cancel('synthetic-complete-history',pg_temp.registration_claims(3101),pg_temp.history_id(3101),gen_random_uuid())->>'state','updated','Participant cancels own approved seat');
select is(public.msrc_registration_decline_offer('synthetic-complete-history',pg_temp.registration_claims(3103),pg_temp.history_id(3103),gen_random_uuid())->>'state','updated','Participant declines own offer');
select is(public.msrc_staff_registration_approve('synthetic-complete-history',array[pg_temp.history_id(3102)])#>>'{decided,approved}','1','Registrar approves another request');
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second' where id=pg_temp.history_id(3104);
select is(public.msrc_staff_registration_detail('synthetic-complete-history',pg_temp.history_id(3104))#>>'{detail,request,status}','expired','Detail preserves existing automatic expiry behavior');

select is((select array_agg(item->>'event' order by item->>'event') from jsonb_array_elements(pg_temp.history_rows(3101)) item),
 array['request.cancelled','request.offer_accepted','request.offered','request.submitted','request.waitlisted','ticket.issued','ticket.revoked'],
 'Accepted and cancelled request includes the complete participant, staff and ticket lifecycle');
select ok((select bool_and(item->>'actorKind'='participant' and item->'performerName'='null'::jsonb)
 from jsonb_array_elements(pg_temp.history_rows(3101)) item where item->>'event' in('request.submitted','request.offer_accepted','request.cancelled')),
 'Participant actions are never mislabelled automatic or as the staff reading the history');
select ok((select bool_and(item->>'actorKind'='staff' and item->>'performerName'='Synthetic registration staff')
 from jsonb_array_elements(pg_temp.history_rows(3101)) item where item->>'event' in('request.waitlisted','request.offered')),
 'Staff decisions retain the named staff actor');
select is((select item->>'actorKind' from jsonb_array_elements(pg_temp.history_rows(3103)) item where item->>'event'='request.offer_declined'),'participant','Decline history names participant actor kind');
select is((select item->>'actorKind' from jsonb_array_elements(pg_temp.history_rows(3104)) item where item->>'event'='request.offer_expired'),'automatic','Offer expiry is automatic');
select is((select item->>'actorKind' from jsonb_array_elements(pg_temp.history_rows(3105)) item where item->>'event'='request.offered'),'automatic','Released-seat replacement offer is automatic');
select is((select item->>'actorKind' from jsonb_array_elements(pg_temp.history_rows(3102)) item where item->>'event'='request.approved'),'staff','Manual approval retains staff actor');
select ok((select bool_and(item->>'actorKind'='automatic' and item->'performerName'='null'::jsonb
 and item->'from'='null'::jsonb and item->'to'='null'::jsonb)
 from jsonb_array_elements(pg_temp.history_rows(3101)) item where item->>'event' like 'ticket.%'),
 'Ticket events are automatic and never invent historical request transitions');
select ok((select bool_and(a.occurred_at=case a.event when 'ticket.issued' then t.issued_at else t.revoked_at end)
 from msrc_registration.audit a join msrc_registration.tickets t on t.request_id=a.request_id where a.event in('ticket.issued','ticket.revoked')),
 'Ticket audit uses exact retained credential lifecycle timestamps');
select ok(not exists(select 1 from jsonb_array_elements(pg_temp.history_rows(3101)) with ordinality q(item,n)
 join jsonb_array_elements(pg_temp.history_rows(3101)) with ordinality next(item,n) on next.n=q.n+1
 where (q.item->>'at')::timestamptz < (next.item->>'at')::timestamptz
 or ((q.item->>'at')::timestamptz=(next.item->>'at')::timestamptz and q.item->>'id'<next.item->>'id')),
 'History remains newest first with a deterministic UUID tie-break');
select ok((select bool_and(item-array['id','event','actorKind','from','to','at','performerName']='{}'::jsonb)
 from jsonb_array_elements(pg_temp.history_rows(3101)) item),'History exposes only agreed fields');
select ok(not (pg_temp.history_rows(3101)::text ~ 'identity|ciphertext|secret|hash|msrc1[.]|example.invalid'),
 'History exposes no identity envelope, ticket credential, key or email');

-- A failed enclosing business transaction must leave no phantom ticket history.
create function pg_temp.history_rollback() returns void language plpgsql as $$begin
 begin
 perform public.msrc_staff_registration_approve('synthetic-complete-history',array[pg_temp.history_id(3106)]);
 if not exists(select 1 from msrc_registration.audit where request_id=pg_temp.history_id(3106) and event='ticket.issued') then
 raise exception using errcode='23514',message='Synthetic ticket history was not created';end if;
 raise exception using errcode='P0001',message='Synthetic business rollback';
 exception when raise_exception then null;end;
end$$;
select pg_temp.history_rollback();
select ok(not exists(select 1 from msrc_registration.audit where request_id=pg_temp.history_id(3106) and event in('ticket.issued','request.approved')),
 'Transaction rollback removes approval and ticket history together');
select is((select status from msrc_registration.requests where id=pg_temp.history_id(3106)),'pending_approval','Transaction rollback preserves request state');
create temporary table history_snapshot as select pg_temp.history_rows(3101) as value;
update msrc_registration.tickets set status=status where request_id=pg_temp.history_id(3101);
select is(pg_temp.history_rows(3101),(select value from history_snapshot),'Same-status ticket update and repeated reads never duplicate history');
select throws_ok($$insert into msrc_registration.audit(edition_key,target_actor,request_id,event,result)
 values('synthetic-complete-history',pg_temp.registration_actor(3101),pg_temp.history_id(3101),'ticket.issued','allowed')$$,
 '23505',null,'One-ticket lifecycle cannot duplicate issuance audit');
select throws_ok($$update msrc_registration.audit set occurred_at=clock_timestamp() where event='ticket.issued'$$,
 '55000',null,'Ticket history remains immutable');

-- Audit evidence for another target, another request, or a denied submission
-- cannot enter the allowed, request-bound projection.
insert into msrc_registration.audit(edition_key,target_actor,request_id,event,result)
 values('synthetic-complete-history',pg_temp.registration_actor(3102),pg_temp.history_id(3101),'request.submitted','allowed'),
 ('synthetic-complete-history',pg_temp.registration_actor(3101),pg_temp.history_id(3101),'request.submitted','denied');
select is(pg_temp.history_rows(3101),(select value from history_snapshot),'Projection excludes mismatched-target and denied evidence');
select pg_temp.history_claim(3201);
select is(pg_temp.history_rows(3101),(select value from history_snapshot),'Assured Super Admin sees the same history as registrar');
select pg_temp.history_claim(3203);
select is(public.msrc_staff_registration_detail('synthetic-complete-history',pg_temp.history_id(3101))->>'state','denied','Assured unrelated staff role cannot read complete history');
select pg_temp.history_claim(3101);
select is(public.msrc_staff_registration_detail('synthetic-complete-history',pg_temp.history_id(3101))->>'state','denied','Participant cannot read the staff history RPC');
set local role anon;
select throws_ok($$select public.msrc_staff_registration_detail('synthetic-complete-history',gen_random_uuid())$$,'42501',null,'Anonymous cannot execute history RPC');
reset role;
select ok(not has_function_privilege('authenticated','msrc_registration.ticket_audit_event()','EXECUTE')
 and not has_function_privilege('service_role','msrc_registration.ticket_audit_event()','EXECUTE'),
 'Ticket audit producer is not API-callable');
select ok((select 'search_path=""'=any(proconfig) from pg_proc where oid='msrc_registration.ticket_audit_event()'::regprocedure),
 'Ticket audit producer has an empty search path');
select * from finish();
rollback;
