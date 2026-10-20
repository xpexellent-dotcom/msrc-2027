-- ENG-056: native disposable database only; no external requests or real email.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.oid in('public.msrc_health_check()'::regprocedure,'public.msrc_outbox_monitor()'::regprocedure)
 and a.grantee in(0,'anon'::regrole,'authenticated'::regrole)),
 'Neither monitoring RPC is executable by PUBLIC, anonymous or authenticated callers');
select ok(has_function_privilege('service_role','public.msrc_health_check()','EXECUTE')
 and has_function_privilege('service_role','public.msrc_outbox_monitor()','EXECUTE'),
 'Only the service API role receives monitoring execution');
select ok((select bool_and(p.provolatile='s' and p.proconfig @> array['search_path=""'] and p.proowner='postgres'::regrole)
 from pg_proc p where p.oid in('public.msrc_health_check()'::regprocedure,'public.msrc_outbox_monitor()'::regprocedure)),
 'Both RPCs are stable, postgres-owned and have an empty search path');
select ok(not (select prosecdef from pg_proc where oid='public.msrc_health_check()'::regprocedure),
 'The no-data ping requires no definer privilege');

set local role anon;
select throws_ok($$select public.msrc_health_check()$$,'42501',null,'Anonymous callers cannot invoke the database ping directly');
select throws_ok($$select public.msrc_outbox_monitor()$$,'42501',null,'Anonymous callers cannot read counts');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_health_check()$$,'42501',null,'Signed-in callers cannot invoke the database ping directly');
select throws_ok($$select public.msrc_outbox_monitor()$$,'42501',null,'Signed-in participants and staff cannot bypass the monitor secret');
reset role;

truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
set local role service_role;
select is(public.msrc_health_check(),true,'The service role can verify database execution');
select is(public.msrc_outbox_monitor(),'{"counts":{"queued":0,"sending":0,"sent":0,"failed_retryable":0,"failed_permanent":0,"cancelled":0},"oldestPendingAgeSeconds":0}'::jsonb,
 'An empty queue reports explicit zero states and age');
select throws_ok($$select * from msrc_outbox.messages$$,'42501',null,'Monitoring grants do not expose private message rows');
reset role;

select public.msrc_outbox_enqueue('monitor/'||n::text,'synthetic_notice',1,'en',
 'monitor-'||n::text||'@example.invalid',jsonb_build_object('reference','monitor_'||n::text))
 from generate_series(1,6) n;
update msrc_outbox.messages set created_at=statement_timestamp()-interval '10 minutes'
 where recipient_email='monitor-1@example.invalid';
update msrc_outbox.messages set status='sending',claimed_by=gen_random_uuid(),lease_token=gen_random_uuid(),
 lease_expires_at=statement_timestamp()+interval '2 minutes' where recipient_email='monitor-2@example.invalid';
update msrc_outbox.messages set status='sent',completed_at=statement_timestamp() where recipient_email='monitor-3@example.invalid';
update msrc_outbox.messages set status='failed_retryable',created_at=statement_timestamp()-interval '20 minutes'
 where recipient_email='monitor-4@example.invalid';
update msrc_outbox.messages set status='failed_permanent',completed_at=statement_timestamp() where recipient_email='monitor-5@example.invalid';
update msrc_outbox.messages set status='cancelled',completed_at=statement_timestamp() where recipient_email='monitor-6@example.invalid';
create temporary table before_monitor as select to_jsonb(m) snapshot from msrc_outbox.messages m;
create temporary table monitor_result(value jsonb);
grant insert on table pg_temp.monitor_result to service_role;
set local role service_role;
insert into pg_temp.monitor_result values(public.msrc_outbox_monitor());
reset role;
select is((select value->'counts' from monitor_result),'{"queued":1,"sending":1,"sent":1,"failed_retryable":1,"failed_permanent":1,"cancelled":1}'::jsonb,
 'The monitor independently counts each retained-message state');
select ok((select (value->>'oldestPendingAgeSeconds')::bigint between 1200 and 1210 from monitor_result),
 'Pending age includes retryable work instead of hiding retries');
select is((select array_agg(k order by k) from monitor_result,jsonb_object_keys(value) k),
 array['counts','oldestPendingAgeSeconds'],'The database projection has no message, recipient or provider fields');
select is((select jsonb_agg(snapshot order by snapshot->>'id') from before_monitor),
 (select jsonb_agg(to_jsonb(m) order by m.id) from msrc_outbox.messages m),
 'Monitoring cannot mutate claims, attempts, timestamps or message content');
select ok((select not delivery_enabled and not sweeps_enabled and daily_cap=0 from msrc_outbox.settings),
 'Monitoring does not enable delivery, sweeps or spend');
select is((select count(*) from msrc_outbox.daily_attempts),0::bigint,'Monitoring consumes no provider attempt budget');

select * from finish();
rollback;
