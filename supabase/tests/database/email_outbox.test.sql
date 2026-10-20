-- BL-FND-04/05, BL-DEP-08: synthetic durable outbox, no external requests.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select ok((select not delivery_enabled and not sweeps_enabled and daily_cap=0 from msrc_outbox.settings),'Delivery, sweeps and daily quota ship closed');
select ok((select max_attempts=5 and lease_seconds=120 and backoff_base_seconds=60 and backoff_max_seconds=3600
 and retry_window_seconds=82800 and terminal_retention_days=30 and sweep_batch_size=100 from msrc_outbox.settings),'Private proposed defaults match ENG-046');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_outbox' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),4::bigint,'All four private tables force RLS');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join(values('anon'),('authenticated'),('service_role')) r(name)
 where n.nspname='msrc_outbox' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
 'No API role has any outbox table grants');
select ok(not exists(select 1 from pg_namespace n cross join(values('anon'),('authenticated'),('service_role')) r(name)
 where n.nspname='msrc_outbox' and has_schema_privilege(r.name,n.oid,'USAGE')),'Private schema is unavailable to all API roles');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(p.proacl) a
 where n.nspname='msrc_outbox' and (a.grantee=0 or a.grantee in('anon'::regrole,'authenticated'::regrole,'service_role'::regrole))),
 'Private functions have no PUBLIC or API execution grants');
select is((select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'msrc_outbox_%' and p.prosecdef and p.proowner='postgres'::regrole
 and p.proconfig @> array['search_path=""']),5::bigint,'Five postgres-owned empty-path outbox RPCs include the read-only monitor');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(p.proacl) a
 where n.nspname='public' and p.proname like 'msrc_outbox_%' and (a.grantee=0 or a.grantee in('anon'::regrole,'authenticated'::regrole))),
 'All public RPCs revoke PUBLIC and client execution');
select ok((select username='postgres' and active and schedule='*/5 * * * *' and command='select msrc_outbox.sweep();'
 from cron.job where jobname='msrc-outbox-sweep'),'Cron is postgres-owned, local SQL only and calls the guarded sweep');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='msrc_outbox' or (n.nspname='public' and p.proname like 'msrc_outbox_%'))
 and p.prosrc ~ 'net[.]http|pg_net'),'Outbox functions require no pg_net or database HTTP calls');

set local role anon;
select throws_ok($$select public.msrc_outbox_claim(gen_random_uuid(),1,1)$$,'42501',null,'Anonymous callers cannot claim');
select throws_ok($$select msrc_outbox.health()$$,'42501',null,'Anonymous callers cannot inspect health');
select throws_ok($$select * from msrc_outbox.messages$$,'42501',null,'Anonymous callers cannot read messages');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_outbox_enqueue('forbidden','synthetic_notice',1,'en','synthetic@example.invalid','{"reference":"test"}')$$,
 '42501',null,'Authenticated callers cannot enqueue');
select throws_ok($$select msrc_outbox.health()$$,'42501',null,'Authenticated callers cannot inspect health');
select throws_ok($$update msrc_outbox.settings set delivery_enabled=true$$,'42501',null,'Authenticated callers cannot activate delivery');
reset role;
set local role service_role;
select throws_ok($$select * from msrc_outbox.messages$$,'42501',null,'Service role cannot bypass RPCs to inspect messages');
select throws_ok($$select msrc_outbox.sweep()$$,'42501',null,'Service role cannot run operator sweeps');
select throws_ok($$select msrc_outbox.health()$$,'42501',null,'Service role cannot inspect operator health');
reset role;

create function pg_temp.enqueue(n integer) returns jsonb language sql as $$
 select public.msrc_outbox_enqueue('synthetic/'||n,'synthetic_notice',1,'en','synthetic-'||n||'@example.invalid',jsonb_build_object('reference','synthetic_'||n));
$$;
create function pg_temp.claim() returns jsonb language sql as $$
 select public.msrc_outbox_claim('c6160000-0000-4000-8000-000000000001',1,1000)->0;
$$;
create function pg_temp.finish(c jsonb,outcome text,error_class text default null) returns boolean language sql as $$
 select (public.msrc_outbox_finish((c->>'id')::uuid,'c6160000-0000-4000-8000-000000000001',
  (c->>'lease_token')::uuid,outcome,case when outcome='sent' then 'synthetic_provider_id' else null end,error_class)->>'acknowledged')::boolean;
$$;
create function pg_temp.prepare(c jsonb) returns jsonb language sql as $$
 select public.msrc_outbox_prepare((c->>'id')::uuid,'c6160000-0000-4000-8000-000000000001',(c->>'lease_token')::uuid,
  jsonb_build_object('from','MSRC 2027 <no-reply@msrc2027.com>','to',jsonb_build_array(c->>'recipient_email'),'subject','Synthetic outbox test','text','Synthetic only','html','<p>Synthetic only</p>'));
$$;

set local role service_role;
select is(public.msrc_outbox_enqueue('service-synthetic','synthetic_notice',1,'ar','service@example.invalid','{"reference":"service"}')->>'created',
 'true','Service role may enqueue a synthetic reserved-Arabic-locale message');
select is(public.msrc_outbox_claim(gen_random_uuid(),1,1000),'[]'::jsonb,'Database delivery switch blocks claims');
reset role;
truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
create temporary table original as select pg_temp.enqueue(1) as value;
select is((select value->>'created' from original),'true','First enqueue creates a durable identity and row');
select is(pg_temp.enqueue(1)->>'id',(select value->>'id' from original),'Same idempotency key returns original message id');
select is(pg_temp.enqueue(1)->>'created','false','Duplicate enqueue reports no new message');
select is((select count(*) from msrc_outbox.messages),1::bigint,'Duplicate key produces exactly one row');
select throws_ok($$select public.msrc_outbox_enqueue('synthetic/1','synthetic_notice',1,'en','changed@example.invalid','{"reference":"synthetic_1"}')$$,
 '22023','Outbox idempotency conflict.','A reused key cannot change its recipient');
select throws_ok($$select public.msrc_outbox_enqueue('real-address','synthetic_notice',1,'en','person@example.com','{"reference":"synthetic"}')$$,
 '22023',null,'Real recipient domains are rejected by SQL');
select throws_ok($$select public.msrc_outbox_enqueue('business','registration',1,'en','synthetic@example.invalid','{"reference":"synthetic"}')$$,
 '22023',null,'No unapproved business template can enqueue');
select throws_ok($$select public.msrc_outbox_enqueue('extra-payload','synthetic_notice',1,'en','synthetic@example.invalid','{"reference":"synthetic","secret":"no"}')$$,
 '22023',null,'Payload accepts only exact synthetic template variables');
select throws_ok($$select public.msrc_outbox_enqueue('missing-payload','synthetic_notice',1,'en','synthetic@example.invalid','{}')$$,
 '22023',null,'Missing template variable is rejected');
create function pg_temp.rollback_enqueue() returns void language plpgsql as $$begin
 begin
  perform pg_temp.enqueue(99);
  raise exception using errcode='P0001',message='Synthetic domain transaction rollback';
 exception when raise_exception then null;end;
end$$;
select pg_temp.rollback_enqueue();
select is((select count(*) from msrc_outbox.messages),1::bigint,'Domain transaction rollback also removes its message');
select is((select count(*) from msrc_outbox.identities),1::bigint,'Domain transaction rollback also removes its idempotency identity');
select ok((select bool_and(p.proowner='postgres'::regrole and p.proconfig @> array['search_path=""']) from pg_proc p
 join pg_namespace n on n.oid=p.pronamespace where n.nspname='msrc_outbox'),'Every private function is postgres-owned with an empty search path');
update msrc_outbox.settings set delivery_enabled=true;
select is(public.msrc_outbox_claim(gen_random_uuid(),1,1000),'[]'::jsonb,'Zero configured daily cap blocks claims even when delivery switch is on');
update msrc_outbox.settings set daily_cap=10;
select is(public.msrc_outbox_claim(gen_random_uuid(),1,0),'[]'::jsonb,'Runtime zero cap also closes admission');
create temporary table first_claim as select pg_temp.claim() as value;
select is((select value->>'attempt_count' from first_claim),'1','First claim increments durable attempt count');
select ok((select value->>'lease_token' is not null and value->>'provider_idempotency_key' like 'msrc-outbox/%' from first_claim),'Claim includes a fencing token and stable provider key');
select is((select attempt_count from msrc_outbox.daily_attempts),1,'Claim reserves one nonrefundable UTC-day attempt');
select is(public.msrc_outbox_claim(gen_random_uuid(),10,1000),'[]'::jsonb,'A live lease cannot be claimed again');
select throws_ok($$select public.msrc_outbox_finish((select (value->>'id')::uuid from first_claim),
 'c6160000-0000-4000-8000-000000000001',(select (value->>'lease_token')::uuid from first_claim),'sent','synthetic_provider_id')$$,
 '55000','Outbox provider request required.','A send cannot complete without a durable request snapshot');
select pg_temp.prepare((select value from first_claim));
select throws_ok($$select public.msrc_outbox_prepare((select (value->>'id')::uuid from first_claim),
 'c6160000-0000-4000-8000-000000000001',(select (value->>'lease_token')::uuid from first_claim),
 '{"from":"MSRC 2027 <no-reply@msrc2027.com>","to":["synthetic-1@example.invalid"],"subject":"Changed","text":"Synthetic only","html":"<p>Synthetic only</p>"}')$$,
 '22023','Outbox provider request is immutable.','Retries cannot change a previously persisted provider request');
create temporary table first_finish as select public.msrc_outbox_finish((value->>'id')::uuid,
 'c6160000-0000-4000-8000-000000000001',(value->>'lease_token')::uuid,'retryable',null,'timeout') as value from first_claim;
select is((select (value->>'acknowledged')::boolean from first_finish),true,'Timeout can be persisted as retryable');
select is((select value->>'status' from first_finish),'failed_retryable','Finish reports the persisted retryable state');
select ok((select status='failed_retryable' and last_error_class='timeout' and next_attempt_at between updated_at+interval '60 seconds'
 and updated_at+interval '75 seconds' from msrc_outbox.messages),'First retry gets exponential base delay with bounded positive jitter');
select is(public.msrc_outbox_claim(gen_random_uuid(),1,1000),'[]'::jsonb,'Backoff prevents an immediate second attempt');
update msrc_outbox.messages set next_attempt_at=clock_timestamp()-interval '1 second';
create temporary table second_claim as select pg_temp.claim() as value;
select is((select value->>'attempt_count' from second_claim),'2','Due retry receives the next durable attempt');
select is((select value->>'provider_idempotency_key' from second_claim),(select value->>'provider_idempotency_key' from first_claim),'Retry preserves the provider idempotency key');
select is((select value->'provider_request' from second_claim),(select provider_request from msrc_outbox.messages),'Retry receives the exact persisted request');
select is(pg_temp.finish((select value from first_claim),'sent'),false,'Old attempt cannot acknowledge a newer lease');
select is(pg_temp.finish((select value from second_claim),'permanent','provider_validation'),true,'Validation failure becomes permanent');
select ok((select status='failed_permanent' and last_error_class='provider_validation' and completed_at is not null
 and claimed_by is null and lease_token is null and lease_expires_at is null from msrc_outbox.messages),'Terminal failure clears every lease field');

truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
select pg_temp.enqueue(2);
create temporary table expired_claim as select pg_temp.claim() as value;
update msrc_outbox.messages set lease_expires_at=clock_timestamp()-interval '1 second';
select throws_ok($$select pg_temp.prepare((select value from expired_claim))$$,'55000',null,'Expired owner cannot prepare a provider request');
select is(pg_temp.finish((select value from expired_claim),'retryable','transport'),false,'Expired owner cannot complete its old lease');
create temporary table reclaimed as select pg_temp.claim() as value;
select is((select value->>'attempt_count' from reclaimed),'2','Expired lease is reclaimable without enabling sweeps');
select isnt((select value->>'lease_token' from reclaimed),(select value->>'lease_token' from expired_claim),'Reclaim rotates its fencing token');
select is((select attempt_count from msrc_outbox.daily_attempts),2,'Lease recovery charges another conservative attempt');
select pg_temp.prepare((select value from reclaimed));
select is(pg_temp.finish((select value from reclaimed),'sent'),true,'Prepared reclaimed message can complete');
select is(pg_temp.finish((select value from reclaimed),'sent'),false,'Repeated completion is a harmless false result');

truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
update msrc_outbox.settings set max_attempts=1;
select pg_temp.enqueue(3);
create temporary table last_claim as select pg_temp.claim() as value;
create temporary table last_finish as select public.msrc_outbox_finish((value->>'id')::uuid,
 'c6160000-0000-4000-8000-000000000001',(value->>'lease_token')::uuid,'retryable',null,'transport') as value from last_claim;
select is((select (value->>'acknowledged')::boolean from last_finish),true,'Final failed attempt is recorded');
select is((select value->>'status' from last_finish),'failed_permanent','Finish reports permanent exhaustion even when caller requested retryable');
select ok((select status='failed_permanent' and last_error_class='max_attempts' from msrc_outbox.messages),'Attempt exhaustion becomes permanent instead of scheduling another retry');
select is(public.msrc_outbox_claim(gen_random_uuid(),1,1000),'[]'::jsonb,'Exhausted message never claims again');
select ok((select bool_and(msrc_outbox.backoff_seconds(n,60,3600) between least(60*power(2,n-1),3600) and least(75*power(2,n-1),3600))
 from generate_series(1,10) n cross join generate_series(1,50)),'All 500 sampled exponential delays stay inside jitter and maximum bounds');

truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
update msrc_outbox.settings set max_attempts=5,daily_cap=2;
select pg_temp.enqueue(n) from generate_series(4,6) n;
select is(jsonb_array_length(public.msrc_outbox_claim(gen_random_uuid(),10,1000)),2,'A small database daily cap bounds a larger batch');
select is(public.msrc_outbox_claim(gen_random_uuid(),10,1000),'[]'::jsonb,'Exhausted UTC-day budget blocks later claims');
select is((select count(*) from msrc_outbox.messages where status='queued'),1::bigint,'Quota denial leaves unclaimed work queued');
select is((select attempt_count from msrc_outbox.daily_attempts),2,'Budget never exceeds its configured cap');
select throws_ok($$select public.msrc_outbox_claim(gen_random_uuid(),11,2)$$,'22023',null,'Oversized per-run claim batches are denied');

truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
update msrc_outbox.settings set daily_cap=10;
select pg_temp.enqueue(7);
select pg_temp.enqueue(8);
create temporary table stuck as select pg_temp.claim() as value;
update msrc_outbox.messages set lease_expires_at=clock_timestamp()-interval '1 second' where status='sending';
update msrc_outbox.messages set status='failed_permanent',completed_at=clock_timestamp()-interval '31 days' where status='queued';
select is(msrc_outbox.sweep(),'{"released":0,"failed":0,"purged":0}'::jsonb,'Disabled sweeps release, fail and purge nothing');
select is((select count(*) from msrc_outbox.messages),2::bigint,'Disabled sweeps preserve even old terminal rows');
select is((select count(*) from msrc_outbox.messages where status='sending'),1::bigint,'Disabled sweeps preserve expired leases');
update msrc_outbox.settings set sweeps_enabled=true;
select is(msrc_outbox.sweep(),'{"released":1,"failed":0,"purged":1}'::jsonb,'Enabled sweep releases a stuck lease and purges an old terminal row');
select ok((select status='failed_retryable' and last_error_class='lease_expired' and claimed_by is null
 and next_attempt_at between updated_at+interval '60 seconds' and updated_at+interval '75 seconds' from msrc_outbox.messages),'Swept leases get backoff and lose their old fencing fields');
select is(pg_temp.enqueue(8)->>'created','false','A purged key retains its deduplication tombstone');
select is(pg_temp.enqueue(8)->>'status','failed_permanent','A purged duplicate reports the retained final status');
select is((select count(*) from msrc_outbox.messages),1::bigint,'Re-enqueue after purge cannot recreate a delivered logical message');
select throws_ok($$select public.msrc_outbox_enqueue('synthetic/8','synthetic_notice',1,'en','other@example.invalid','{"reference":"synthetic_8"}')$$,
 '22023',null,'Purged key still rejects changed content');
update msrc_outbox.messages set attempt_count=5;
select is(msrc_outbox.sweep()->>'failed','1','Sweep marks messages exceeding the max attempts permanently failed');
select is((select last_error_class from msrc_outbox.messages),'max_attempts','Sweep stores only a classified max-attempt error');

truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
select pg_temp.enqueue(9);
select pg_temp.claim();
update msrc_outbox.messages set lease_expires_at=clock_timestamp()-interval '1 second',first_attempt_at=clock_timestamp()-interval '23 hours 1 second';
select is(public.msrc_outbox_claim(gen_random_uuid(),1,1000),'[]'::jsonb,'Messages outside the 23-hour provider safety horizon cannot resend');
select ok((select status='failed_permanent' and last_error_class='idempotency_window_expired' from msrc_outbox.messages),'Expired provider horizon is a permanent ambiguous-delivery stop');
create temporary table health as select * from msrc_outbox.health();
select is((select array_agg(attname::text order by attnum) from pg_attribute where attrelid='pg_temp.health'::regclass and attnum>0 and not attisdropped),
 array['queued','oldest_queued_age_seconds','failures_last_24h'],'Operator health contains only three aggregate fields');
select ok((select queued=0 and oldest_queued_age_seconds=0 and failures_last_24h=1 from health),'Health counts latest classified message failures without recipient data');

-- Validate the purge boundary and bound independently of lease/max-attempt work.
truncate msrc_outbox.messages,msrc_outbox.identities,msrc_outbox.daily_attempts;
select pg_temp.enqueue(n) from generate_series(10,12) n;
update msrc_outbox.messages set status='cancelled',completed_at=statement_timestamp()-interval '31 days';
update msrc_outbox.settings set sweep_batch_size=1;
select is(msrc_outbox.sweep()->>'purged','1','Terminal purge obeys its operator batch bound');
select is((select count(*) from msrc_outbox.messages),2::bigint,'Bounded purge leaves remaining terminal work for a later run');
update msrc_outbox.settings set sweep_batch_size=100;
create function pg_temp.retention_boundary() returns jsonb language plpgsql as $$begin
 update msrc_outbox.messages set completed_at=statement_timestamp()-interval '30 days';
 return msrc_outbox.sweep();
end$$;
select is(pg_temp.retention_boundary()->>'purged','0','A terminal row at the exact retention boundary is retained');
select is((select count(*) from msrc_outbox.identities),3::bigint,'Terminal cancellation purge preserves every identity tombstone');

select * from finish();
rollback;
