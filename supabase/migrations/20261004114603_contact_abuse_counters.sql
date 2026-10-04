-- BL-PUB-06 / SUP-02 / PRV-03 / SEC-01: review-only Contact abuse counters.
-- No contact message, raw address, IP, account, provider response or delivery log.
create schema msrc_contact;
revoke all on schema msrc_contact from public, anon, authenticated, service_role;
grant usage on schema msrc_contact to service_role;

create table msrc_contact.attempt_buckets (
  bucket text not null check (bucket in ('ip_hour','ip_day','email_hour','email_day','global_day','nonce')),
  subject_hash text not null check (subject_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  expires_at timestamptz not null,
  attempt_count integer not null check (attempt_count between 1 and 60),
  primary key (bucket, subject_hash, window_start),
  check (expires_at > window_start),
  check (window_start <= clock_timestamp()),
  check (bucket <> 'nonce' or (window_start = '1970-01-01 00:00:00+00'::timestamptz and attempt_count = 1)),
  check (bucket <> 'nonce' or expires_at <= clock_timestamp() + interval '30 minutes'),
  check (bucket = 'nonce' or expires_at - window_start in (interval '1 hour', interval '24 hours')),
  check (bucket <> 'global_day' or subject_hash = repeat('0',64))
);
create index attempt_buckets_expiry on msrc_contact.attempt_buckets(expires_at);
alter table msrc_contact.attempt_buckets enable row level security;
alter table msrc_contact.attempt_buckets force row level security;
revoke all on all tables in schema msrc_contact from public, anon, authenticated, service_role;
grant select, insert, update on msrc_contact.attempt_buckets to service_role;
alter default privileges in schema msrc_contact revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema msrc_contact revoke execute on functions from public, anon, authenticated, service_role;

create function msrc_contact.reject_counter_refund() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.bucket is distinct from old.bucket or new.subject_hash is distinct from old.subject_hash
    or new.window_start is distinct from old.window_start then
    raise exception using errcode = '42501', message = 'Contact counter identity is immutable.';
  end if;
  if old.expires_at > pg_catalog.clock_timestamp()
    and (new.attempt_count < old.attempt_count or new.expires_at is distinct from old.expires_at) then
    raise exception using errcode = '42501', message = 'Contact counter refund or extension denied.';
  end if;
  return new;
end;
$$;
revoke all on function msrc_contact.reject_counter_refund() from public, anon, authenticated, service_role;
create trigger no_contact_counter_refund before update on msrc_contact.attempt_buckets
  for each row execute function msrc_contact.reject_counter_refund();

create function public.msrc_contact_reserve_attempt(
  p_ip_hash text,
  p_email_hash text,
  p_nonce_hash text,
  p_nonce_expires_at timestamptz,
  p_ip_hour_limit integer default 3,
  p_ip_day_limit integer default 10,
  p_email_hour_limit integer default 3,
  p_email_day_limit integer default 10
) returns jsonb
language plpgsql security invoker
set search_path = ''
set timezone = 'UTC'
set lock_timeout = '2s'
as $$
declare
  v_now timestamptz;
  v_hour timestamptz;
  v_day timestamptz;
  v_bucket record;
  v_count integer;
  v_retry integer := 0;
begin
  -- Execution grants and the native database role, never caller JWT metadata.
  if current_user <> 'service_role' then
    raise exception using errcode = '42501', message = 'Contact reservation denied.';
  end if;
  if p_ip_hash is null or p_ip_hash !~ '^[0-9a-f]{64}$'
    or p_email_hash is null or p_email_hash !~ '^[0-9a-f]{64}$'
    or p_nonce_hash is null or p_nonce_hash !~ '^[0-9a-f]{64}$'
    or p_nonce_expires_at is null or not isfinite(p_nonce_expires_at)
    or p_ip_hour_limit is null or p_ip_hour_limit not between 1 and 60
    or p_ip_day_limit is null or p_ip_day_limit not between 1 and 60
    or p_email_hour_limit is null or p_email_hour_limit not between 1 and 60
    or p_email_day_limit is null or p_email_day_limit not between 1 and 60
    or p_ip_hour_limit > p_ip_day_limit or p_email_hour_limit > p_email_day_limit then
    raise exception using errcode = '22023', message = 'Invalid Contact reservation.';
  end if;

  -- One fixed lock and projectwide cap across instances/regions. No caller scope.
  -- A lock outage/timeout raises and rolls back: never permit a fallback send.
  perform pg_catalog.pg_advisory_xact_lock(20272706, 60);
  v_now := pg_catalog.clock_timestamp();
  if p_nonce_expires_at <= v_now or p_nonce_expires_at > v_now + interval '30 minutes' then
    raise exception using errcode = '22023', message = 'Invalid Contact reservation.';
  end if;
  v_hour := pg_catalog.date_trunc('hour', v_now at time zone 'UTC') at time zone 'UTC';
  v_day := pg_catalog.date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC';

  if exists(select 1 from msrc_contact.attempt_buckets
    where bucket = 'nonce' and subject_hash = p_nonce_hash and expires_at > v_now) then
    return jsonb_build_object('allowed',false,'retry_after_seconds',0,'reason','replayed');
  end if;

  -- Read/lock existing rows before creating any, so denied bot attempts cannot
  -- accumulate zero-count hashes. Expired rows do not affect current admission.
  for v_bucket in select * from (values
    ('ip_hour',p_ip_hash,v_hour,v_hour+interval '1 hour',p_ip_hour_limit),
    ('ip_day',p_ip_hash,v_day,v_day+interval '24 hours',p_ip_day_limit),
    ('email_hour',p_email_hash,v_hour,v_hour+interval '1 hour',p_email_hour_limit),
    ('email_day',p_email_hash,v_day,v_day+interval '24 hours',p_email_day_limit),
    ('global_day',repeat('0',64),v_day,v_day+interval '24 hours',60)
  ) as desired(bucket,subject_hash,window_start,expires_at,attempt_limit)
  loop
    v_count := null;
    select attempt_count into v_count from msrc_contact.attempt_buckets
      where bucket = v_bucket.bucket and subject_hash = v_bucket.subject_hash
        and window_start = v_bucket.window_start and expires_at > v_now
      for update;
    if coalesce(v_count,0) >= v_bucket.attempt_limit then
      v_retry := greatest(v_retry,ceil(extract(epoch from v_bucket.expires_at-v_now))::integer);
    end if;
  end loop;
  if v_retry > 0 then
    return jsonb_build_object('allowed',false,'retry_after_seconds',v_retry,'reason','limited');
  end if;

  for v_bucket in select * from (values
    ('ip_hour',p_ip_hash,v_hour,v_hour+interval '1 hour'),
    ('ip_day',p_ip_hash,v_day,v_day+interval '24 hours'),
    ('email_hour',p_email_hash,v_hour,v_hour+interval '1 hour'),
    ('email_day',p_email_hash,v_day,v_day+interval '24 hours'),
    ('global_day',repeat('0',64),v_day,v_day+interval '24 hours')
  ) as desired(bucket,subject_hash,window_start,expires_at)
  loop
    insert into msrc_contact.attempt_buckets(bucket,subject_hash,window_start,expires_at,attempt_count)
      values(v_bucket.bucket,v_bucket.subject_hash,v_bucket.window_start,v_bucket.expires_at,1)
      on conflict(bucket,subject_hash,window_start) do update
        set attempt_count = case when msrc_contact.attempt_buckets.expires_at <= v_now then 1
          else msrc_contact.attempt_buckets.attempt_count+1 end,
          expires_at = excluded.expires_at;
  end loop;
  insert into msrc_contact.attempt_buckets(bucket,subject_hash,window_start,expires_at,attempt_count)
    values('nonce',p_nonce_hash,'1970-01-01 00:00:00+00',p_nonce_expires_at,1)
    on conflict(bucket,subject_hash,window_start) do update
      set expires_at = excluded.expires_at, attempt_count = 1;
  return jsonb_build_object('allowed',true,'retry_after_seconds',0,'reason','allowed');
end;
$$;
revoke all on function public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer)
  to service_role;

-- Physical deletion, independently scheduled. At most five minutes' nominal lag
-- after expiry; downtime/backups and operations monitoring remain release gates.
create function msrc_contact.cleanup_expired() returns integer
language plpgsql security invoker set search_path = '' as $$
declare removed integer;
begin
  delete from msrc_contact.attempt_buckets where expires_at <= pg_catalog.clock_timestamp();
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function msrc_contact.cleanup_expired() from public, anon, authenticated, service_role;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('msrc-contact-expiry','*/5 * * * *','select msrc_contact.cleanup_expired();');

comment on table msrc_contact.attempt_buckets is
  'Private short-lived HMAC hashes and attempt counts only. No inquiry, identity or provider outcomes. No refund path.';
comment on function public.msrc_contact_reserve_attempt(text,text,text,timestamptz,integer,integer,integer,integer) is
  'Service-only atomic Contact reservation; fixed UTC windows, one projectwide 60/day cap and one-attempt nonce. No delivery.';
