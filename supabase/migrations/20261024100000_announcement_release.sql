-- ORG-063 / ENG-072. EML-01--05, SEC-01/02/06, ROL-10/12, AT-16.
-- Review only. No settings rows, hosted activation, cron or provider calls.
begin;

create table msrc_announcements.delivery_settings (
 edition_key text primary key references msrc_authorization.edition_config(edition_key) on delete restrict,
 layout_approved boolean not null default false,
 updated_at timestamptz not null default clock_timestamp()
);
-- This append-only operation receipt is also the approval/test audit. It keeps
-- no destination or authored content and deliberately has no parent FK, like
-- the existing operational audit, so announcement retention stays independent.
create table msrc_announcements.delivery_audit (
 actor_id uuid not null,operation_id uuid not null,edition_key text not null,
 session_id uuid not null,event text not null check(event in('layout_approval','self_test')),
 input_hash bytea not null check(octet_length(input_hash)=32),
 layout_approved boolean,announcement_id uuid,outbox_id uuid references msrc_outbox.identities(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 primary key(actor_id,operation_id),
 check((event='layout_approval' and layout_approved is not null and announcement_id is null and outbox_id is null)
 or(event='self_test' and layout_approved is null and announcement_id is not null and outbox_id is not null))
);
create index announcement_test_rate on msrc_announcements.delivery_audit(actor_id,created_at)
 where event='self_test';
alter table msrc_announcements.delivery_settings enable row level security;
alter table msrc_announcements.delivery_settings force row level security;
alter table msrc_announcements.delivery_audit enable row level security;
alter table msrc_announcements.delivery_audit force row level security;
revoke all on msrc_announcements.delivery_settings,msrc_announcements.delivery_audit from public,anon,authenticated,service_role;
create trigger announcement_delivery_audit_immutable before insert or update or delete on msrc_announcements.delivery_audit
 for each row execute function msrc_staff.audit_immutable();
create trigger announcement_delivery_audit_no_truncate before truncate on msrc_announcements.delivery_audit
 for each statement execute function msrc_staff.audit_immutable();

-- Existing rows receive NULL and keep their hold permanently. Only a newly
-- inserted reviewed publication or explicit self-test can carry provenance.
alter table msrc_outbox.messages add column announcement_delivery text
 check(announcement_delivery in('approved','self_test'));
alter table msrc_outbox.messages drop constraint announcement_draft_delivery_hold;
alter table msrc_outbox.messages add constraint announcement_delivery_approval_check check(
 (template_key<>'announcement' and announcement_delivery is null)
 or(template_key='announcement' and
 ((announcement_delivery is null and delivery_hold and status not in('sending','sent'))
 or(announcement_delivery is not null and announcement_delivery in('approved','self_test') and not delivery_hold))));
create function msrc_announcements.protect_delivery() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 if (old.template_key='announcement' or new.template_key='announcement') and
 (new.template_key,new.delivery_hold,new.announcement_delivery) is distinct from
 (old.template_key,old.delivery_hold,old.announcement_delivery) then
 raise exception using errcode='23514',message='Announcement delivery approval is immutable.';end if;
 return new;
end$$;
create trigger announcement_delivery_immutable before update on msrc_outbox.messages
 for each row execute function msrc_announcements.protect_delivery();

create function msrc_announcements.delivery_status(edition text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('state','ready',
 'layoutApproved',coalesce((select d.layout_approved from msrc_announcements.delivery_settings d where d.edition_key=edition),false),
 'deliveryEnabled',s.delivery_enabled,'dailyCap',s.daily_cap,'sweepsEnabled',s.sweeps_enabled)
 from msrc_outbox.settings s where s.singleton;
$$;
create function public.msrc_staff_announcement_delivery_status(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$begin
 perform msrc_announcements.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 return msrc_announcements.delivery_status(edition_key);
end$$;
create function public.msrc_staff_announcement_layout_approval(edition_key text,approved boolean,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare digest bytea;receipt msrc_announcements.delivery_audit%rowtype;begin
 perform msrc_announcements.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if approved is null or operation_id is null then return jsonb_build_object('state','invalid');end if;
 digest:=sha256(convert_to(jsonb_build_array('layout_approval',edition_key,approved)::text,'UTF8'));
 -- Operation identity is actor-global, including across editions and action types.
 perform pg_advisory_xact_lock(hashtextextended('announcement-delivery-actor:'||auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into receipt from msrc_announcements.delivery_audit d where d.actor_id=auth.uid() and d.operation_id=$3;
 if found then
 if receipt.input_hash<>digest then return jsonb_build_object('state','conflict');end if;
 return msrc_announcements.delivery_status(edition_key);end if;
 insert into msrc_announcements.delivery_settings(edition_key,layout_approved)
 values(edition_key,approved) on conflict on constraint delivery_settings_pkey
 do update set layout_approved=excluded.layout_approved,updated_at=clock_timestamp();
 insert into msrc_announcements.delivery_audit(actor_id,operation_id,edition_key,session_id,event,input_hash,layout_approved)
 values(auth.uid(),operation_id,edition_key,(auth.jwt()->>'session_id')::uuid,'layout_approval',digest,approved);
 return msrc_announcements.delivery_status(edition_key);
end$$;

-- A private producer for the exact saved announcement. The generic producer is
-- unchanged: generic announcement enqueue remains held. No API role can choose
-- provenance, destination, or an arbitrary payload through this helper.
create function msrc_announcements.enqueue(a msrc_announcements.announcements,recipient text,event_key text,self_test boolean default false) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare payload jsonb;key_digest bytea;input_digest bytea;identity_row msrc_outbox.identities%rowtype;
 created boolean;message_status text;approval text;begin
 if current_user<>'postgres' then raise exception using errcode='42501',message='Announcement enqueue denied.';end if;
 payload:=jsonb_build_object('subject_en',a.subject_en,'subject_ar',a.subject_ar,'body_en',a.body_en,'body_ar',a.body_ar);
 if event_key is null or event_key !~ '^[A-Za-z0-9_./:-]{1,200}$'
 or not msrc_announcements.message_valid('announcement',1,'en',recipient,payload) then
 raise exception using errcode='22023',message='Invalid announcement message.';end if;
 approval:=case when self_test then 'self_test' when coalesce((select d.layout_approved
 from msrc_announcements.delivery_settings d where d.edition_key=a.edition_key),false) then 'approved' end;
 key_digest:=sha256(convert_to(event_key,'UTF8'));
 input_digest:=sha256(convert_to(jsonb_build_array('announcement',1,'en',recipient,payload)::text,'UTF8'));
 insert into msrc_outbox.identities(key_hash,input_hash) values(key_digest,input_digest)
 on conflict do nothing returning * into identity_row;created:=found;
 if not created then
 select * into strict identity_row from msrc_outbox.identities i where i.key_hash=key_digest for update;
 if identity_row.input_hash<>input_digest then raise exception using errcode='22023',message='Outbox idempotency conflict.';end if;
 else
 insert into msrc_outbox.messages(id,template_key,template_version,locale,recipient_email,payload,provider_idempotency_key,delivery_hold,announcement_delivery)
 values(identity_row.id,'announcement',1,'en',recipient,payload,'msrc-outbox/'||identity_row.id::text,approval is null,approval);
 end if;
 select m.status into message_status from msrc_outbox.messages m where m.id=identity_row.id;
 return jsonb_build_object('id',identity_row.id,'status',coalesce(message_status,identity_row.terminal_status),'created',created);
end$$;

create or replace function msrc_announcements.publish(a msrc_announcements.announcements,p jsonb) returns msrc_announcements.announcements
 language plpgsql security definer set search_path='' as $$declare r jsonb;job jsonb;instant timestamptz:=clock_timestamp();begin
 for r in select value from jsonb_array_elements(p->'recipients') loop
 job:=msrc_announcements.enqueue(a,r->>'email','announcement/'||a.id::text||'/'||(r->>'actorId'));
 insert into msrc_announcements.recipients(announcement_id,actor_id,email,outbox_id,published_at)
 values(a.id,(r->>'actorId')::uuid,r->>'email',(job->>'id')::uuid,instant);
 insert into msrc_announcements.inbox(announcement_id,actor_id) values(a.id,(r->>'actorId')::uuid);
 end loop;
 update msrc_announcements.announcements q set state='sending',version=q.version+1,updated_at=instant,last_error=null where q.id=a.id returning * into a;
 perform msrc_announcements.record(a,'enqueued',jsonb_build_object('total',p->'total','emailState',
 case when coalesce((select d.layout_approved from msrc_announcements.delivery_settings d where d.edition_key=a.edition_key),false) then 'queued' else 'draft_held' end));
 return a;
end$$;

create function public.msrc_staff_announcement_test_send(edition_key text,announcement_id uuid,expected_version integer,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a msrc_announcements.announcements%rowtype;receipt msrc_announcements.delivery_audit%rowtype;
 digest bytea;recipient text;job jsonb;instant timestamptz;begin
 perform msrc_announcements.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if announcement_id is null or expected_version is null or expected_version<1 or operation_id is null then return jsonb_build_object('state','invalid');end if;
 digest:=sha256(convert_to(jsonb_build_array('self_test',edition_key,announcement_id,expected_version)::text,'UTF8'));
 perform pg_advisory_xact_lock(hashtextextended('announcement-delivery-actor:'||auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into receipt from msrc_announcements.delivery_audit d where d.actor_id=auth.uid() and d.operation_id=$4;
 if found then
 if receipt.input_hash<>digest then return jsonb_build_object('state','conflict');end if;
 return jsonb_build_object('state','queued','messageId',receipt.outbox_id);end if;
 select * into a from msrc_announcements.announcements q where q.id=$2 and q.edition_key=$1 for update;
 if a.id is null or a.version is distinct from expected_version or a.state<>'draft' then return jsonb_build_object('state','conflict');end if;
 -- Lock identity against concurrent email/verification changes. Destination is
 -- never accepted from a caller, draft, JWT email claim or user-editable metadata.
 select u.email into recipient from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null
 and u.deleted_at is null and not coalesce(u.is_anonymous,false) for share;
 if recipient is null or not msrc_announcements.message_valid('announcement',1,'en',recipient,
 jsonb_build_object('subject_en',a.subject_en,'subject_ar',a.subject_ar,'body_en',a.body_en,'body_ar',a.body_ar)) then
 return jsonb_build_object('state','denied');end if;
 instant:=clock_timestamp();
 if (select count(*) from msrc_announcements.delivery_audit d where d.actor_id=auth.uid()
 and d.event='self_test' and d.created_at>instant-interval '1 hour')>=3 then return jsonb_build_object('state','rate_limited');end if;
 job:=msrc_announcements.enqueue(a,recipient,'announcement-test/'||auth.uid()::text||'/'||operation_id::text,true);
 insert into msrc_announcements.delivery_audit(actor_id,operation_id,edition_key,session_id,event,input_hash,announcement_id,outbox_id,created_at)
 values(auth.uid(),operation_id,edition_key,(auth.jwt()->>'session_id')::uuid,'self_test',digest,a.id,(job->>'id')::uuid,instant);
 return jsonb_build_object('state','queued','messageId',job->'id');
end$$;

-- Preserve the existing lease/budget/fencing behavior. Announcements additionally
-- require sweeps_enabled; tests have no transport or budget bypass.
create or replace function public.msrc_outbox_claim(p_worker_id uuid,p_batch_size integer,p_daily_cap integer) returns jsonb
 language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare s msrc_outbox.settings%rowtype;m msrc_outbox.messages%rowtype;v_now timestamptz:=clock_timestamp();
 v_day date:=(clock_timestamp() at time zone 'UTC')::date;v_count integer;v_limit integer;v_claimed integer:=0;v_result jsonb:='[]'::jsonb;
begin
 if p_worker_id is null or p_batch_size is null or p_batch_size not between 1 and 10
 or p_daily_cap is null or p_daily_cap not between 0 and 100000 then
 raise exception using errcode='22023',message='Invalid outbox claim.';end if;
 select * into strict s from msrc_outbox.settings where singleton for update;
 if not s.delivery_enabled then return v_result;end if;
 v_now:=clock_timestamp();v_day:=(v_now at time zone 'UTC')::date;v_limit:=least(s.daily_cap,p_daily_cap);
 if v_limit=0 then return v_result;end if;
 insert into msrc_outbox.daily_attempts values(v_day,0) on conflict do nothing;
 select attempt_count into v_count from msrc_outbox.daily_attempts where utc_day=v_day for update;
 if v_count>=v_limit then return v_result;end if;
 for m in select * from msrc_outbox.messages
 where not delivery_hold and (template_key<>'announcement' or s.sweeps_enabled)
 and ((status in('queued','failed_retryable') and next_attempt_at<=v_now) or(status='sending' and lease_expires_at<=v_now))
 order by next_attempt_at,created_at,id for update skip locked limit p_batch_size loop
 if m.attempt_count>=s.max_attempts or(m.first_attempt_at is not null
 and m.first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=v_now) then
 update msrc_outbox.messages set status='failed_permanent',completed_at=v_now,updated_at=v_now,
 last_error_class=case when m.attempt_count>=s.max_attempts then 'max_attempts' else 'idempotency_window_expired' end,
 claimed_by=null,lease_token=null,lease_expires_at=null where id=m.id;continue;end if;
 exit when v_count+v_claimed>=v_limit;
 update msrc_outbox.messages set status='sending',attempt_count=attempt_count+1,
 claimed_by=p_worker_id,lease_token=gen_random_uuid(),lease_expires_at=v_now+make_interval(secs=>s.lease_seconds),
 first_attempt_at=coalesce(first_attempt_at,v_now),updated_at=v_now,completed_at=null where id=m.id returning * into m;
 v_claimed:=v_claimed+1;
 v_result:=v_result||jsonb_build_array(jsonb_build_object('id',m.id,'template_key',m.template_key,
 'template_version',m.template_version,'locale',m.locale,'recipient_email',m.recipient_email,'payload',m.payload,
 'attempt_count',m.attempt_count,'lease_token',m.lease_token,'lease_expires_at',m.lease_expires_at,
 'provider_idempotency_key',m.provider_idempotency_key,'provider_request',m.provider_request,'first_attempt_at',m.first_attempt_at,
 'announcement_delivery',m.announcement_delivery));
 end loop;
 update msrc_outbox.daily_attempts set attempt_count=attempt_count+v_claimed where utc_day=v_day;
 return v_result;
end$$;

-- Recheck the announcement sweep gate before freezing the provider request as
-- well, so disabling it between claim and prepare cannot start a new attempt.
create or replace function public.msrc_outbox_prepare(p_id uuid,p_worker_id uuid,p_lease_token uuid,p_provider_request jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare m msrc_outbox.messages%rowtype;s msrc_outbox.settings%rowtype;begin
 select * into strict s from msrc_outbox.settings where singleton;
 select * into m from msrc_outbox.messages where id=p_id for update;
 if not found or not s.delivery_enabled or m.status<>'sending' or m.claimed_by is distinct from p_worker_id
 or(m.template_key='announcement' and(not s.sweeps_enabled or m.delivery_hold or m.announcement_delivery is null))
 or m.lease_token is distinct from p_lease_token or m.lease_expires_at<=clock_timestamp()
 or m.first_attempt_at+make_interval(secs=>s.retry_window_seconds)<=clock_timestamp() then
 raise exception using errcode='55000',message='Outbox lease unavailable.';end if;
 if p_provider_request is null or jsonb_typeof(p_provider_request)<>'object'
 or p_provider_request<>jsonb_build_object('from',p_provider_request->'from','to',p_provider_request->'to','subject',p_provider_request->'subject',
 'text',p_provider_request->'text','html',p_provider_request->'html')
 or p_provider_request->>'from' is distinct from 'MSRC 2027 <no-reply@msrc2027.com>'
 or p_provider_request->'to' is distinct from jsonb_build_array(m.recipient_email)
 or jsonb_typeof(p_provider_request->'subject') is distinct from 'string'
 or jsonb_typeof(p_provider_request->'text') is distinct from 'string'
 or jsonb_typeof(p_provider_request->'html') is distinct from 'string'
 or length(p_provider_request->>'subject') not between 1 and 200
 or p_provider_request->>'subject' ~ '[\r\n]' or octet_length(p_provider_request::text)>65536 then
 raise exception using errcode='22023',message='Invalid outbox provider request.';end if;
 if m.provider_request is not null and m.provider_request<>p_provider_request then
 raise exception using errcode='22023',message='Outbox provider request is immutable.';end if;
 update msrc_outbox.messages set provider_request=p_provider_request,updated_at=clock_timestamp() where id=p_id;
 return p_provider_request;
end$$;

revoke all on all functions in schema msrc_announcements from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_announcement_delivery_status(text),
 public.msrc_staff_announcement_layout_approval(text,boolean,uuid),
 public.msrc_staff_announcement_test_send(text,uuid,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_announcement_delivery_status(text),
 public.msrc_staff_announcement_layout_approval(text,boolean,uuid),
 public.msrc_staff_announcement_test_send(text,uuid,integer,uuid) to authenticated;
comment on table msrc_announcements.delivery_settings is 'ORG-063: absent row/default false keeps publication held. Audited exact-session Super Admin approval only; no settings seeded.';
comment on column msrc_outbox.messages.announcement_delivery is 'ENG-072: immutable insertion provenance. NULL announcement jobs remain held forever; approved publication or own-address self-test still requires global outbox gates.';
notify pgrst,'reload schema';
commit;
