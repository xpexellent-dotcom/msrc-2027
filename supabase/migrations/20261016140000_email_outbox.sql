-- BL-FND-04/05, BL-DEP-08, EML/API/ERR/DAT; ENG-046.
-- Closed synthetic foundation only. No business callers, HTTP jobs, pg_net or email.
do $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native migration operator required.';
 end if;
end$$;

create schema msrc_outbox;
revoke all on schema msrc_outbox from public,anon,authenticated,service_role;
alter default privileges in schema msrc_outbox revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema msrc_outbox revoke execute on functions from public,anon,authenticated,service_role;

create table msrc_outbox.settings (
 singleton boolean primary key default true check(singleton),
 delivery_enabled boolean not null default false,
 sweeps_enabled boolean not null default false,
 daily_cap integer not null default 0 check(daily_cap between 0 and 100000),
 max_attempts integer not null default 5 check(max_attempts between 1 and 10),
 lease_seconds integer not null default 120 check(lease_seconds between 60 and 600),
 backoff_base_seconds integer not null default 60 check(backoff_base_seconds between 1 and 600),
 backoff_max_seconds integer not null default 3600 check(backoff_max_seconds between 600 and 21600),
 retry_window_seconds integer not null default 82800 check(retry_window_seconds between 3600 and 82800),
 terminal_retention_days integer not null default 30 check(terminal_retention_days between 1 and 365),
 sweep_batch_size integer not null default 100 check(sweep_batch_size between 1 and 1000),
 check(backoff_base_seconds<=backoff_max_seconds)
);
insert into msrc_outbox.settings(singleton) values(true);

-- Nonreversible digests prevent a purged logical message from being re-enqueued.
-- Neither raw idempotency keys nor recipient/payload survive terminal-row purge.
create table msrc_outbox.identities (
 key_hash bytea primary key check(octet_length(key_hash)=32),
 id uuid not null unique default gen_random_uuid(),
 input_hash bytea not null check(octet_length(input_hash)=32),
 terminal_status text check(terminal_status in('sent','failed_permanent','cancelled'))
);
create table msrc_outbox.messages (
 id uuid primary key references msrc_outbox.identities(id) on delete restrict,
 template_key text not null check(template_key='synthetic_notice'),
 template_version integer not null check(template_version=1),
 locale text not null check(locale in('en','ar')),
 recipient_email text not null check(recipient_email ~ '^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$'),
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload=jsonb_build_object('reference',payload->'reference')
  and jsonb_typeof(payload->'reference') is not distinct from 'string' and coalesce(payload->>'reference' ~ '^[A-Za-z0-9_-]{1,80}$',false)),
 status text not null default 'queued' check(status in('queued','sending','sent','failed_retryable','failed_permanent','cancelled')),
 attempt_count integer not null default 0 check(attempt_count between 0 and 10),
 next_attempt_at timestamptz not null default clock_timestamp(),
 claimed_by uuid,
 lease_token uuid,
 lease_expires_at timestamptz,
 first_attempt_at timestamptz,
 provider_idempotency_key text not null unique,
 provider_request jsonb,
 provider_message_id text check(provider_message_id is null or (length(provider_message_id) between 1 and 200
  and provider_message_id ~ '^[A-Za-z0-9_-]+$')),
 last_error_class text check(last_error_class in('timeout','transport','rate_limited','provider_unavailable','provider_validation',
  'template_invalid','idempotency_conflict','provider_response','idempotency_window_expired','unknown','max_attempts','lease_expired')),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 completed_at timestamptz,
 check((status='sending')=(claimed_by is not null and lease_token is not null and lease_expires_at is not null)),
 check(status='sending' or (claimed_by is null and lease_token is null and lease_expires_at is null)),
 check((status in('sent','failed_permanent','cancelled'))=(completed_at is not null)),
 check((attempt_count=0)=(first_attempt_at is null))
);
create index outbox_due on msrc_outbox.messages(next_attempt_at,created_at,id) where status in('queued','failed_retryable');
create index outbox_expired_leases on msrc_outbox.messages(lease_expires_at,id) where status='sending';
create index outbox_terminal_retention on msrc_outbox.messages(completed_at,id) where status in('sent','failed_permanent','cancelled');
create index outbox_failures on msrc_outbox.messages(updated_at) where last_error_class is not null;
create table msrc_outbox.daily_attempts (
 utc_day date primary key,
 attempt_count integer not null check(attempt_count between 0 and 100000)
);

alter table msrc_outbox.settings enable row level security;
alter table msrc_outbox.settings force row level security;
alter table msrc_outbox.identities enable row level security;
alter table msrc_outbox.identities force row level security;
alter table msrc_outbox.messages enable row level security;
alter table msrc_outbox.messages force row level security;
alter table msrc_outbox.daily_attempts enable row level security;
alter table msrc_outbox.daily_attempts force row level security;
revoke all on all tables in schema msrc_outbox from public,anon,authenticated,service_role;

-- Future postgres-owned registration RPC calls this function in its own transaction.
-- It has no service/client EXECUTE grant: never enqueue in a second HTTP request.
create function msrc_outbox.enqueue(p_idempotency_key text,p_template_key text,p_template_version integer,
 p_locale text,p_recipient_email text,p_payload jsonb) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare v_key bytea;v_input bytea;v_identity msrc_outbox.identities%rowtype;v_created boolean;v_status text;
begin
 if current_user<>'postgres' then raise exception using errcode='42501',message='Outbox enqueue denied.';end if;
 if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_./:-]{1,200}$'
  or p_template_key is distinct from 'synthetic_notice' or p_template_version is distinct from 1
  or p_locale is null or p_locale not in('en','ar')
  or p_recipient_email is null or p_recipient_email !~ '^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$'
  or p_payload is null or jsonb_typeof(p_payload)<>'object'
  or p_payload <> jsonb_build_object('reference',p_payload->'reference')
  or jsonb_typeof(p_payload->'reference') is distinct from 'string'
  or p_payload->>'reference' !~ '^[A-Za-z0-9_-]{1,80}$' then
  raise exception using errcode='22023',message='Invalid synthetic outbox message.';
 end if;
 v_key:=sha256(convert_to(p_idempotency_key,'UTF8'));
 v_input:=sha256(convert_to(jsonb_build_array(p_template_key,p_template_version,p_locale,p_recipient_email,p_payload)::text,'UTF8'));
 insert into msrc_outbox.identities(key_hash,input_hash) values(v_key,v_input) on conflict do nothing returning * into v_identity;
 v_created:=found;
 if not v_created then
  -- Serialize with terminal purge so a concurrent duplicate always sees either
  -- the current message or its committed terminal tombstone, never a null status.
  select * into strict v_identity from msrc_outbox.identities where key_hash=v_key for update;
  if v_identity.input_hash<>v_input then raise exception using errcode='22023',message='Outbox idempotency conflict.';end if;
 else
  insert into msrc_outbox.messages(id,template_key,template_version,locale,recipient_email,payload,provider_idempotency_key)
   values(v_identity.id,p_template_key,p_template_version,p_locale,p_recipient_email,p_payload,'msrc-outbox/'||v_identity.id::text);
 end if;
 select status into v_status from msrc_outbox.messages where id=v_identity.id;
 return jsonb_build_object('id',v_identity.id,'status',coalesce(v_status,v_identity.terminal_status),'created',v_created);
end$$;
create function public.msrc_outbox_enqueue(p_idempotency_key text,p_template_key text,p_template_version integer,
 p_locale text,p_recipient_email text,p_payload jsonb) returns jsonb
 language sql security definer set search_path='' as $$
 select msrc_outbox.enqueue(p_idempotency_key,p_template_key,p_template_version,p_locale,p_recipient_email,p_payload);
$$;

create function msrc_outbox.backoff_seconds(p_attempt integer,p_base integer,p_max integer) returns integer
 language sql volatile security invoker set search_path='' as $$
 select least(p_max,ceil(p_base*power(2::numeric,greatest(0,least(p_attempt,10)-1))*(1+random()*0.25))::integer);
$$;

create function public.msrc_outbox_claim(p_worker_id uuid,p_batch_size integer,p_daily_cap integer) returns jsonb
 language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare s msrc_outbox.settings%rowtype;m msrc_outbox.messages%rowtype;v_now timestamptz:=clock_timestamp();
 v_day date:=(clock_timestamp() at time zone 'UTC')::date;v_count integer;v_limit integer;v_claimed integer:=0;v_result jsonb:='[]'::jsonb;
begin
 if p_worker_id is null or p_batch_size is null or p_batch_size not between 1 and 10
  or p_daily_cap is null or p_daily_cap not between 0 and 100000 then
  raise exception using errcode='22023',message='Invalid outbox claim.';
 end if;
 -- A single short settings lock also serializes UTC-day budget admission. No
 -- send/render/network operation occurs while database locks are held.
 select * into strict s from msrc_outbox.settings where singleton for update;
 if not s.delivery_enabled then return v_result;end if;
 v_now:=clock_timestamp();
 v_day:=(v_now at time zone 'UTC')::date;
 v_limit:=least(s.daily_cap,p_daily_cap);
 if v_limit=0 then return v_result;end if;
 insert into msrc_outbox.daily_attempts values(v_day,0) on conflict do nothing;
 select attempt_count into v_count from msrc_outbox.daily_attempts where utc_day=v_day for update;
 if v_count>=v_limit then return v_result;end if;
 for m in select * from msrc_outbox.messages
  where (status in('queued','failed_retryable') and next_attempt_at<=v_now)
   or (status='sending' and lease_expires_at<=v_now)
  order by next_attempt_at,created_at,id for update skip locked limit p_batch_size
 loop
  if m.attempt_count>=s.max_attempts or (m.first_attempt_at is not null
   and m.first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=v_now) then
   update msrc_outbox.messages set status='failed_permanent',completed_at=v_now,updated_at=v_now,
    last_error_class=case when m.attempt_count>=s.max_attempts then 'max_attempts' else 'idempotency_window_expired' end,
    claimed_by=null,lease_token=null,lease_expires_at=null where id=m.id;
   continue;
  end if;
  exit when v_count+v_claimed>=v_limit;
  update msrc_outbox.messages set status='sending',attempt_count=attempt_count+1,
   claimed_by=p_worker_id,lease_token=gen_random_uuid(),lease_expires_at=v_now+make_interval(secs=>s.lease_seconds),
   first_attempt_at=coalesce(first_attempt_at,v_now),updated_at=v_now,completed_at=null
   where id=m.id returning * into m;
  v_claimed:=v_claimed+1;
  v_result:=v_result||jsonb_build_array(jsonb_build_object('id',m.id,'template_key',m.template_key,
   'template_version',m.template_version,'locale',m.locale,'recipient_email',m.recipient_email,'payload',m.payload,
   'attempt_count',m.attempt_count,'lease_token',m.lease_token,'lease_expires_at',m.lease_expires_at,
   'provider_idempotency_key',m.provider_idempotency_key,'provider_request',m.provider_request,'first_attempt_at',m.first_attempt_at));
 end loop;
 update msrc_outbox.daily_attempts set attempt_count=attempt_count+v_claimed where utc_day=v_day;
 return v_result;
end$$;

create function public.msrc_outbox_prepare(p_id uuid,p_worker_id uuid,p_lease_token uuid,p_provider_request jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare m msrc_outbox.messages%rowtype;s msrc_outbox.settings%rowtype;
begin
 select * into strict s from msrc_outbox.settings where singleton;
 select * into m from msrc_outbox.messages where id=p_id for update;
 if not found or not s.delivery_enabled or m.status<>'sending' or m.claimed_by is distinct from p_worker_id
  or m.lease_token is distinct from p_lease_token or m.lease_expires_at<=clock_timestamp()
  or m.first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=clock_timestamp() then
  raise exception using errcode='55000',message='Outbox lease unavailable.';
 end if;
 if p_provider_request is null or jsonb_typeof(p_provider_request)<>'object'
  or p_provider_request<>jsonb_build_object('from',p_provider_request->'from','to',p_provider_request->'to','subject',p_provider_request->'subject',
   'text',p_provider_request->'text','html',p_provider_request->'html')
  or p_provider_request->>'from' is distinct from 'MSRC 2027 <no-reply@msrc2027.com>'
  or p_provider_request->'to' is distinct from jsonb_build_array(m.recipient_email)
  or jsonb_typeof(p_provider_request->'subject') is distinct from 'string'
  or jsonb_typeof(p_provider_request->'text') is distinct from 'string'
  or jsonb_typeof(p_provider_request->'html') is distinct from 'string'
  or length(p_provider_request->>'subject') not between 1 and 200
  or p_provider_request->>'subject' ~ '[\r\n]'
  or octet_length(p_provider_request::text)>65536 then
  raise exception using errcode='22023',message='Invalid outbox provider request.';
 end if;
 if m.provider_request is not null and m.provider_request<>p_provider_request then
  raise exception using errcode='22023',message='Outbox provider request is immutable.';
 end if;
 update msrc_outbox.messages set provider_request=p_provider_request,updated_at=clock_timestamp() where id=p_id;
 return p_provider_request;
end$$;

create function public.msrc_outbox_finish(p_id uuid,p_worker_id uuid,p_lease_token uuid,p_outcome text,
 p_provider_message_id text default null,p_error_class text default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare m msrc_outbox.messages%rowtype;s msrc_outbox.settings%rowtype;v_now timestamptz:=clock_timestamp();v_terminal boolean;v_status text;
begin
 if p_outcome is null or p_outcome not in('sent','retryable','permanent')
  or (p_provider_message_id is not null and (length(p_provider_message_id) not between 1 and 200 or p_provider_message_id !~ '^[A-Za-z0-9_-]+$'))
  or (p_error_class is not null and p_error_class not in('timeout','transport','rate_limited','provider_unavailable','provider_validation',
   'template_invalid','idempotency_conflict','provider_response','idempotency_window_expired','unknown'))
  or (p_outcome='sent' and (p_error_class is not null or p_provider_message_id is null)) or (p_outcome<>'sent' and p_provider_message_id is not null) then
  raise exception using errcode='22023',message='Invalid outbox result.';
 end if;
 select * into strict s from msrc_outbox.settings where singleton;
 select * into m from msrc_outbox.messages where id=p_id for update;
 if not found or m.status<>'sending' or m.claimed_by is distinct from p_worker_id
  or m.lease_token is distinct from p_lease_token or m.lease_expires_at<=v_now then
  return jsonb_build_object('acknowledged',false,'status',null);end if;
 if p_outcome='sent' and m.provider_request is null then
  raise exception using errcode='55000',message='Outbox provider request required.';
 end if;
 v_terminal:=p_outcome='permanent' or m.attempt_count>=s.max_attempts
  or m.first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=v_now;
 update msrc_outbox.messages set
  status=case when p_outcome='sent' then 'sent' when v_terminal then 'failed_permanent' else 'failed_retryable' end,
  provider_message_id=case when p_outcome='sent' then p_provider_message_id else null end,
  last_error_class=case when p_outcome='sent' then null when p_outcome='retryable' and m.attempt_count>=s.max_attempts then 'max_attempts'
   when p_outcome='retryable' and m.first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=v_now then 'idempotency_window_expired'
   else coalesce(p_error_class,'unknown') end,
  next_attempt_at=case when p_outcome='retryable' and not v_terminal
   then v_now+make_interval(secs=>msrc_outbox.backoff_seconds(m.attempt_count,s.backoff_base_seconds,s.backoff_max_seconds)) else next_attempt_at end,
  completed_at=case when p_outcome='sent' or v_terminal then v_now else null end,
  claimed_by=null,lease_token=null,lease_expires_at=null,updated_at=v_now where id=p_id returning status into v_status;
 return jsonb_build_object('acknowledged',true,'status',v_status);
end$$;

create function msrc_outbox.sweep() returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare s msrc_outbox.settings%rowtype;m msrc_outbox.messages%rowtype;v_now timestamptz:=statement_timestamp();
 v_released integer:=0;v_failed integer:=0;v_purged integer:=0;
begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native outbox sweep operator required.';
 end if;
 select * into strict s from msrc_outbox.settings where singleton;
 if not s.sweeps_enabled then return jsonb_build_object('released',0,'failed',0,'purged',0);end if;
 for m in select * from msrc_outbox.messages where (status='sending' and lease_expires_at<=v_now)
  or (status in('queued','failed_retryable') and (attempt_count>=s.max_attempts
   or first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=v_now))
  order by updated_at,id for update skip locked limit s.sweep_batch_size
 loop
  if m.attempt_count>=s.max_attempts or m.first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=v_now then
   update msrc_outbox.messages set status='failed_permanent',completed_at=v_now,updated_at=v_now,
    last_error_class=case when m.attempt_count>=s.max_attempts then 'max_attempts' else 'idempotency_window_expired' end,
    claimed_by=null,lease_token=null,lease_expires_at=null where id=m.id;
   v_failed:=v_failed+1;
  else
   update msrc_outbox.messages set status='failed_retryable',updated_at=v_now,
    next_attempt_at=v_now+make_interval(secs=>msrc_outbox.backoff_seconds(m.attempt_count,s.backoff_base_seconds,s.backoff_max_seconds)),
    last_error_class='lease_expired',claimed_by=null,lease_token=null,lease_expires_at=null where id=m.id;
   v_released:=v_released+1;
  end if;
 end loop;
 for m in select * from msrc_outbox.messages where status in('sent','failed_permanent','cancelled')
  and completed_at<v_now-make_interval(days=>s.terminal_retention_days)
  order by completed_at,id for update skip locked limit s.sweep_batch_size
 loop
  update msrc_outbox.identities set terminal_status=m.status where id=m.id;
  delete from msrc_outbox.messages where id=m.id;
  v_purged:=v_purged+1;
 end loop;
 delete from msrc_outbox.daily_attempts where utc_day<(v_now at time zone 'UTC')::date-s.terminal_retention_days;
 return jsonb_build_object('released',v_released,'failed',v_failed,'purged',v_purged);
end$$;

create function msrc_outbox.health() returns table(queued bigint,oldest_queued_age_seconds bigint,failures_last_24h bigint)
 language plpgsql stable security invoker set search_path='' as $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native outbox health operator required.';
 end if;
 return query select count(*) filter(where status in('queued','failed_retryable')),
  coalesce(greatest(0,floor(extract(epoch from statement_timestamp()-min(created_at) filter(where status in('queued','failed_retryable')))))::bigint,0::bigint),
  count(*) filter(where last_error_class is not null and updated_at>=statement_timestamp()-interval '24 hours')
  from msrc_outbox.messages;
end$$;

revoke all on all functions in schema msrc_outbox from public,anon,authenticated,service_role;
revoke all on function public.msrc_outbox_enqueue(text,text,integer,text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.msrc_outbox_claim(uuid,integer,integer) from public,anon,authenticated,service_role;
revoke all on function public.msrc_outbox_prepare(uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.msrc_outbox_finish(uuid,uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_outbox_enqueue(text,text,integer,text,text,jsonb) to service_role;
grant execute on function public.msrc_outbox_claim(uuid,integer,integer) to service_role;
grant execute on function public.msrc_outbox_prepare(uuid,uuid,uuid,jsonb) to service_role;
grant execute on function public.msrc_outbox_finish(uuid,uuid,uuid,text,text,text) to service_role;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('msrc-outbox-sweep','*/5 * * * *','select msrc_outbox.sweep();');
comment on table msrc_outbox.settings is 'ENG-046 candidate defaults require owner approval: delivery and sweeps false; zero daily budget; 120-second leases; five attempts; 60-second exponential backoff with up-to-25-percent jitter capped at 3600 seconds; 23-hour provider-safe retry window; 30-day terminal retention; bounded 100-row sweep every five minutes. No business email is authorized.';
comment on table msrc_outbox.identities is 'Indefinite minimal deduplication tombstones: SHA-256 logical key and canonical input digests, random message UUID and final status. No raw key, recipient, payload or provider request. Retention is a proposal requiring owner approval.';
comment on function msrc_outbox.enqueue(text,text,integer,text,text,jsonb) is 'Private same-transaction enqueue for future reviewed postgres-owned domain RPCs; currently synthetic_notice v1 and example.invalid only. A domain transaction rollback also rolls back its outbox identity and message.';
comment on function msrc_outbox.health() is 'Native postgres-only current-message aggregates; failures count messages with the latest classified failure in the last 24 hours, not total provider attempts. No addresses, payloads, keys, provider bodies or privileged API execution.';
