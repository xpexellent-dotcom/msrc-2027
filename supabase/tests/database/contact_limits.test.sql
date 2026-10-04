-- BL-PUB-06 / SUP-02 / SEC-01 / PRV-03: synthetic, transaction-rolled-back proof.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
truncate msrc_contact.attempt_buckets;

select has_table('msrc_contact','attempt_buckets','Hash-only Contact counters exist');
select columns_are('msrc_contact','attempt_buckets',array['bucket','subject_hash','window_start','expires_at','attempt_count'],
  'Counters store only bucket/hash/count/times, without inquiry or outcome');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='msrc_contact.attempt_buckets'::regclass),'RLS is enabled and forced');
select ok(not (select prosecdef from pg_proc where oid='public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)'::regprocedure),'Public RPC is SECURITY INVOKER');
select ok(not has_function_privilege('anon','public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)','execute'),'Anonymous RPC execution denied');
select ok(not has_function_privilege('authenticated','public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)','execute'),'Authenticated RPC execution denied');
select ok(has_function_privilege('service_role','public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)','execute'),'Service role can reserve');
select ok(not has_table_privilege('anon','msrc_contact.attempt_buckets','select,insert,update,delete'),'Anonymous has no counter privileges');
select ok(not has_table_privilege('authenticated','msrc_contact.attempt_buckets','select,insert,update,delete'),'Authenticated has no counter privileges');
select ok(not has_table_privilege('service_role','msrc_contact.attempt_buckets','delete'),'Service role cannot refund through DELETE');
select ok(not has_function_privilege('service_role','msrc_contact.cleanup_expired()','execute'),'Cleanup is not exposed to service/browser RPC');
select ok(exists(select 1 from pg_extension where extname='pg_cron'),'Physical expiry has pg_cron available');
select ok(exists(select 1 from cron.job where jobname='msrc-contact-expiry' and active
  and schedule='*/5 * * * *' and command='select msrc_contact.cleanup_expired();'),'Physical hash expiry is scheduled every five minutes');

set local role anon;
select throws_ok($$select * from msrc_contact.attempt_buckets$$,'42501','permission denied for schema msrc_contact','Anonymous direct read denied');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes')$$,
  '42501','permission denied for function msrc_contact_reserve_attempt','Anonymous direct RPC denied');
reset role;
set local role authenticated;
set local request.jwt.claims='{"role":"service_role","user_metadata":{"role":"super_admin"}}';
select throws_ok($$select * from msrc_contact.attempt_buckets$$,'42501','permission denied for schema msrc_contact','Authenticated direct read denied');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes')$$,
  '42501','permission denied for function msrc_contact_reserve_attempt','Metadata/claims do not authorize browser RPC');
reset role;
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes')$$,
  '42501','Contact reservation denied.','Invoker rejects a non-service native role');

-- Temporarily grant only within this test transaction to verify independent RLS.
grant usage on schema msrc_contact to anon,authenticated;
grant select,insert,update,delete on msrc_contact.attempt_buckets to anon,authenticated;
set local role anon;
select is_empty($$select * from msrc_contact.attempt_buckets$$,'RLS independently denies anonymous reads');
select throws_ok($$insert into msrc_contact.attempt_buckets values('nonce',repeat('a',64),'1970-01-01 00:00:00+00',now()+interval '10 minutes',1)$$,
  '42501','new row violates row-level security policy for table "attempt_buckets"','RLS independently denies anonymous insertion');
reset role;
set local role authenticated;
select is_empty($$select * from msrc_contact.attempt_buckets$$,'RLS independently denies authenticated reads');
select throws_ok($$insert into msrc_contact.attempt_buckets values('nonce',repeat('a',64),'1970-01-01 00:00:00+00',now()+interval '10 minutes',1)$$,
  '42501','new row violates row-level security policy for table "attempt_buckets"','RLS independently denies authenticated insertion');
reset role;

set local role service_role;
select throws_ok($$select public.msrc_contact_reserve_attempt('raw-ip',repeat('b',64),repeat('c',64),now()+interval '20 minutes')$$,
  '22023','Invalid Contact reservation.','Raw IP cannot be persisted');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),'visitor@example.invalid',repeat('c',64),now()+interval '20 minutes')$$,
  '22023','Invalid Contact reservation.','Raw email cannot be persisted');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('C',64),now()+interval '20 minutes')$$,
  '22023','Invalid Contact reservation.','Nonce requires bounded lowercase hex');
select throws_ok($$select public.msrc_contact_reserve_attempt(null,repeat('b',64),repeat('c',64),now()+interval '20 minutes')$$,
  '22023','Invalid Contact reservation.','Missing hash fails closed');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()-interval '1 second')$$,
  '22023','Invalid Contact reservation.','Expired nonce fails closed');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '31 minutes')$$,
  '22023','Invalid Contact reservation.','Nonce retention cannot exceed thirty minutes');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),'infinity'::timestamptz)$$,
  '22023','Invalid Contact reservation.','Infinite nonce expiry denied');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes',0,10,3,10)$$,
  '22023','Invalid Contact reservation.','Disabled/unbounded abuse settings fail closed');
select throws_ok($$select public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes',3,61,3,10)$$,
  '22023','Invalid Contact reservation.','Limits cannot exceed global hard cap');
select is((public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes')->>'allowed')::boolean,true,'First reservation admitted');
select is((select count(*) from msrc_contact.attempt_buckets),6::bigint,'Successful reservation atomically stores five counters and nonce');
select is((select sum(attempt_count) from msrc_contact.attempt_buckets),6::bigint,'Each bucket starts at one');
select is(public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes'),
  '{"allowed":false,"retry_after_seconds":0,"reason":"replayed"}'::jsonb,'Same token cannot authorize a second provider attempt');
select is((select sum(attempt_count) from msrc_contact.attempt_buckets),6::bigint,'Replay increments nothing');
select is((public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('d',64),now()+interval '20 minutes')->>'allowed')::boolean,true,'Second default reservation admitted');
select is((public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('e',64),now()+interval '20 minutes')->>'allowed')::boolean,true,'Third default reservation admitted');
select is(public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('f',64),now()+interval '20 minutes')->>'reason','limited','Fourth per-IP/email hour reservation denied');
select ok((public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('f',64),now()+interval '20 minutes')->>'retry_after_seconds')::integer between 1 and 3600,'Hour denial gives bounded positive retry delay');
select is((select sum(attempt_count) from msrc_contact.attempt_buckets),18::bigint,'Rate denial makes no partial increments, nonce or zero-count hashes');
reset role;

-- Counter boundaries are database UTC even if the caller uses a non-UTC zone.
set local timezone='Pacific/Auckland';
select ok(not exists(select 1 from msrc_contact.attempt_buckets where bucket like '%day'
  and window_start at time zone 'UTC' <> date_trunc('day',window_start at time zone 'UTC')),'Daily windows start at UTC midnight');
select ok(not exists(select 1 from msrc_contact.attempt_buckets where bucket like '%hour'
  and window_start at time zone 'UTC' <> date_trunc('hour',window_start at time zone 'UTC')),'Hourly windows start at a UTC hour');
select ok(not exists(select 1 from msrc_contact.attempt_buckets where bucket like '%day' and expires_at-window_start <> interval '24 hours'),'Daily windows are exactly twenty-four hours without DST drift');
set local timezone='UTC';

-- No-provider-outcome/refund path: accepted attempts remain charged.
set local role service_role;
select throws_ok($$delete from msrc_contact.attempt_buckets$$,'42501','permission denied for table attempt_buckets','No DELETE refund privilege');
select throws_ok($$update msrc_contact.attempt_buckets set attempt_count=2 where bucket='global_day'$$,
  '42501','Contact counter refund or extension denied.','Direct trusted-service UPDATE cannot refund live counters');
select throws_ok($$update msrc_contact.attempt_buckets set expires_at=clock_timestamp()+interval '25 minutes' where bucket='nonce'$$,
  '42501','Contact counter refund or extension denied.','Direct trusted-service UPDATE cannot extend live nonce retention');
reset role;
insert into msrc_contact.attempt_buckets values('ip_hour',repeat('9',64),date_trunc('hour',now())-interval '2 hours',date_trunc('hour',now())-interval '1 hour',60);
select is(msrc_contact.cleanup_expired(),1,'Physical cleanup removes expired counter rows');
select is((select count(*) from msrc_contact.attempt_buckets where subject_hash=repeat('9',64)),0::bigint,'Expired hash is physically absent');
select is((select count(*) from msrc_contact.attempt_buckets where bucket='nonce'),3::bigint,'Cleanup preserves unexpired one-attempt nonces');
truncate msrc_contact.attempt_buckets;

-- A day limit can bind independently of a higher hour limit after prior hours.
insert into msrc_contact.attempt_buckets values('ip_day',repeat('a',64),date_trunc('day',now()),date_trunc('day',now())+interval '24 hours',10);
set local role service_role;
select is(public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes')->>'reason','limited','Per-IP day cap binds independently');
select ok((public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes')->>'retry_after_seconds')::integer between 1 and 86400,'Day denial gives bounded retry delay');
reset role;
select is((select count(*) from msrc_contact.attempt_buckets),1::bigint,'A denied new email/hash creates no rows');
truncate msrc_contact.attempt_buckets;
insert into msrc_contact.attempt_buckets values('email_day',repeat('b',64),date_trunc('day',now()),date_trunc('day',now())+interval '24 hours',10);
set local role service_role;
select is(public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes')->>'reason','limited','Per-email day cap binds independently');
reset role;
truncate msrc_contact.attempt_buckets;
set local role service_role;
do $$begin
  for i in 1..60 loop
    if not (public.msrc_contact_reserve_attempt(lpad(to_hex(i),64,'0'),lpad(to_hex(i+100),64,'0'),lpad(to_hex(i+200),64,'0'),clock_timestamp()+interval '20 minutes',60,60,60,60)->>'allowed')::boolean then
      raise exception 'Synthetic sixty-attempt cap assertion failed.';
    end if;
  end loop;
end$$;
select is(public.msrc_contact_reserve_attempt(repeat('a',64),repeat('b',64),repeat('c',64),now()+interval '20 minutes',60,60,60,60)->>'reason','limited','Sixty-first projectwide provider attempt denied');
select is((select attempt_count from msrc_contact.attempt_buckets where bucket='global_day' and expires_at>clock_timestamp()),60,'Global cap is fixed at sixty');
select is((select count(*) from msrc_contact.attempt_buckets where bucket='nonce'),60::bigint,'Global denial adds no nonce');
reset role;
select * from finish();
rollback;
