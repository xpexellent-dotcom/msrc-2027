-- ENG-064 / REG-04/06/07, TIM-01/02, EML-01/03/04, SEC-01/02/06.
-- Review only. No settings seeds, activation, delivery or new scheduler.
-- v0.5 has no confirm-seat nonresponse rule: the Super Admin explicitly chooses
-- release_unconfirmed or keep_unconfirmed for each immutable round, without default.
begin;

create table msrc_registration.confirmation_rounds (
 id uuid primary key default gen_random_uuid(),
 edition_key text not null references msrc_registration.settings(edition_key) on delete restrict,
 operation_id uuid not null,
 performer_id uuid not null,
 nonresponse_policy text not null check(nonresponse_policy in('release_unconfirmed','keep_unconfirmed')),
 preview_token text not null check(preview_token ~ '^[a-f0-9]{64}$'),
 opened_count integer not null check(opened_count>=0),
 response_hours integer not null check(response_hours>0),
 first_day_at timestamptz not null check(isfinite(first_day_at)),
 started_at timestamptz not null default clock_timestamp(),
 unique(edition_key,operation_id)
);
create table msrc_registration.confirmation_windows (
 request_id uuid primary key references msrc_registration.requests(id) on delete restrict,
 round_id uuid not null references msrc_registration.confirmation_rounds(id) on delete restrict,
 opened_at timestamptz not null,
 deadline timestamptz not null check(isfinite(deadline)),
 state text not null check(state in('awaiting','confirmed','released','kept')),
 resolved_at timestamptz,
 check(deadline>opened_at),
 check((state='awaiting')=(resolved_at is null))
);
create index registration_confirmation_round_edition on msrc_registration.confirmation_rounds(edition_key,started_at desc,id);
create index registration_confirmation_window_round on msrc_registration.confirmation_windows(round_id);
create index registration_confirmation_deadlines on msrc_registration.confirmation_windows(deadline,request_id) where state='awaiting';
alter table msrc_registration.confirmation_rounds enable row level security;
alter table msrc_registration.confirmation_rounds force row level security;
alter table msrc_registration.confirmation_windows enable row level security;
alter table msrc_registration.confirmation_windows force row level security;
revoke all on msrc_registration.confirmation_rounds,msrc_registration.confirmation_windows from public,anon,authenticated,service_role;
create trigger registration_confirmation_round_immutable before insert or update or delete
 on msrc_registration.confirmation_rounds for each row execute function msrc_staff.audit_immutable();
create trigger registration_confirmation_round_no_truncate before truncate
 on msrc_registration.confirmation_rounds for each statement execute function msrc_staff.audit_immutable();

alter table msrc_registration.participant_operations drop constraint participant_operations_action_check;
alter table msrc_registration.participant_operations add constraint participant_operations_action_check
 check(action in('accept','decline','cancel','confirm','release'));
alter table msrc_registration.audit drop constraint audit_event_check;
alter table msrc_registration.audit add constraint audit_event_check check(event in (
 'request.submitted','priority.set','priority.removed','identity.revealed',
 'request.approved','request.waitlisted','request.offered','request.offer_expired','registration.exported',
 'early_access.added','early_access.removed','request.offer_accepted','request.offer_declined','request.cancelled',
 'ticket.issued','ticket.revoked','request.confirmation_opened','request.seat_confirmed',
 'request.seat_released','request.confirmation_kept'));
alter table msrc_registration.audit drop constraint registration_audit_transition_check;
alter table msrc_registration.audit add constraint registration_audit_transition_check check (
 (event='request.approved' and result='allowed' and previous_status in('pending_approval','waitlisted')
  and new_status in('approved','approved_awaiting_payment') and request_id is not null
  and previous_status is not null and new_status is not null)
 or (event='request.waitlisted' and result='allowed' and previous_status='pending_approval'
  and new_status='waitlisted' and request_id is not null and previous_status is not null and new_status is not null)
 or (event='request.offered' and result='allowed' and previous_status='waitlisted'
  and new_status='offered' and request_id is not null and previous_status is not null and new_status is not null)
 or (event='request.offer_expired' and result='allowed' and previous_status='offered'
  and new_status='expired' and request_id is not null and previous_status is not null and new_status is not null)
 or (event='request.offer_accepted' and result='allowed' and previous_status='offered' and new_status='approved'
  and request_id is not null and performer_id is not null and target_actor is not null
  and performer_id=target_actor and previous_status is not null and new_status is not null)
 or (event='request.offer_declined' and result='allowed' and previous_status='offered' and new_status='cancelled'
  and request_id is not null and performer_id is not null and target_actor is not null and performer_id=target_actor and reason is not null
  and previous_status is not null and new_status is not null)
 or (event='request.cancelled' and result='allowed' and previous_status in('pending_approval','waitlisted','offered','approved')
  and new_status='cancelled' and request_id is not null and performer_id is not null and target_actor is not null and performer_id=target_actor and reason is not null
  and previous_status is not null and new_status is not null)
 or (event in('request.confirmation_opened','request.confirmation_kept') and result='allowed'
  and previous_status='approved' and new_status='approved' and request_id is not null and target_actor is not null
  and previous_status is not null and new_status is not null and reason is not null)
 or (event='request.seat_confirmed' and result='allowed' and previous_status='approved' and new_status='confirmed'
  and request_id is not null and performer_id is not null and target_actor is not null and performer_id=target_actor
  and previous_status is not null and new_status is not null)
 or (event='request.seat_released' and result='allowed' and previous_status in('approved','confirmed') and new_status='cancelled'
  and request_id is not null and target_actor is not null and (performer_id is null or performer_id=target_actor)
  and previous_status is not null and new_status is not null and reason is not null)
 or (event not in('request.approved','request.waitlisted','request.offered','request.offer_expired',
  'request.offer_accepted','request.offer_declined','request.cancelled','request.confirmation_opened',
  'request.confirmation_kept','request.seat_confirmed','request.seat_released') and previous_status is null and new_status is null));

-- Private projection never contains policy actor IDs, email addresses or credentials.
create function msrc_registration.confirmation_projection(request_id uuid) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('state',w.state,'deadline',w.deadline)
 from msrc_registration.confirmation_windows w where w.request_id=$1;$$;

create function msrc_registration.confirmation_preview(edition text) returns jsonb
 language sql volatile security definer set search_path='' as $$
 with settings as (
  select s.*,((select min(d) from unnest(s.conference_days) d)::timestamp at time zone 'Asia/Riyadh') as first_day
  from msrc_registration.settings s where s.edition_key=edition
 ), eligible as (
  select r.id from msrc_registration.requests r where r.edition_key=edition and r.status='approved'
  and not exists(select 1 from msrc_registration.confirmation_windows w where w.request_id=r.id)
 ), projection as (
  select s.*,s.first_day-make_interval(days=>s.confirm_seat_lead_days) as opens_at,
  s.first_day is not null and s.confirm_seat_lead_days is not null and s.confirm_seat_response_hours is not null as ready
  from settings s
 )
 select jsonb_build_object('settingsReady',coalesce(p.ready,false),'eligibleCount',(select count(*) from eligible),
  'responseHours',p.confirm_seat_response_hours,'opensAt',p.opens_at,
  'canStart',coalesce(p.ready and (select count(*) from eligible)>0 and clock_timestamp()>=p.opens_at,false),
  'previewToken',case when p.ready then encode(sha256(convert_to(jsonb_build_array(
   p.edition_key,p.first_day,p.confirm_seat_lead_days,p.confirm_seat_response_hours,
   (select coalesce(jsonb_agg(e.id order by e.id),'[]'::jsonb) from eligible e))::text,'UTF8')),'hex') else null end)
 from (select 1) seed left join projection p on true;$$;

-- Caller has authority and the settings lock. An explicit round authorizes the
-- same snapshotted policy for later approvals. No undocumented upper cutoff.
create function msrc_registration.open_confirmation_windows(edition text,target_request uuid,performer uuid default null)
 returns integer language plpgsql security definer set search_path='' as $$
declare round_row msrc_registration.confirmation_rounds%rowtype;r msrc_registration.requests%rowtype;
 instant timestamptz;deadline timestamptz;recipient text;opened integer:=0;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform 1 from msrc_registration.settings s where s.edition_key=edition for update;
 select c.* into round_row from msrc_registration.confirmation_rounds c where c.edition_key=edition
 order by c.started_at desc,c.id desc limit 1;
 if round_row.id is null then return 0;end if;
 for r in select q.* from msrc_registration.requests q where q.edition_key=edition and q.status='approved'
 and (target_request is null or q.id=target_request)
 and not exists(select 1 from msrc_registration.confirmation_windows w where w.request_id=q.id)
 order by q.created_at,q.id for update loop
 instant:=clock_timestamp();deadline:=instant+make_interval(hours=>round_row.response_hours);
 insert into msrc_registration.confirmation_windows(request_id,round_id,opened_at,deadline,state)
 values(r.id,round_row.id,instant,deadline,'awaiting');
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status,reason)
 values(edition,performer,r.actor_id,r.id,'request.confirmation_opened','allowed','approved','approved',
  'Confirmation round policy: '||round_row.nonresponse_policy||'.');
 select u.email into strict recipient from auth.users u where u.id=r.actor_id and u.deleted_at is null and u.email_confirmed_at is not null;
 perform msrc_outbox.enqueue('registration/'||r.id::text||'/registration_confirm_seat','registration_confirm_seat',1,'en',recipient,
 jsonb_build_object('confirm_expires_at',to_char(deadline at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'nonresponse_policy',round_row.nonresponse_policy));
 opened:=opened+1;
 end loop;
 return opened;
end$$;

create function msrc_registration.expire_confirmations(edition text,target_request uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare r record;instant timestamptz;released integer:=0;kept integer:=0;offered integer;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform 1 from msrc_registration.settings s where s.edition_key=edition for update;
 instant:=clock_timestamp();
 for r in select q.id,q.actor_id,c.nonresponse_policy from msrc_registration.requests q
 join msrc_registration.confirmation_windows w on w.request_id=q.id
 join msrc_registration.confirmation_rounds c on c.id=w.round_id
 where q.edition_key=edition and (target_request is null or q.id=target_request)
 and q.status='approved' and w.state='awaiting' and w.deadline<=instant
 order by q.created_at,q.id for update of q,w loop
 if r.nonresponse_policy='release_unconfirmed' then
 update msrc_registration.confirmation_windows set state='released',resolved_at=instant where request_id=r.id;
 update msrc_registration.requests set status='cancelled',decided_at=instant,updated_at=instant where id=r.id;
 insert into msrc_registration.audit(edition_key,target_actor,request_id,event,result,previous_status,new_status,reason)
 values(edition,r.actor_id,r.id,'request.seat_released','allowed','approved','cancelled',
 'Confirmation deadline elapsed; Super Admin selected release_unconfirmed.');
 released:=released+1;
 else
 update msrc_registration.confirmation_windows set state='kept',resolved_at=instant where request_id=r.id;
 insert into msrc_registration.audit(edition_key,target_actor,request_id,event,result,previous_status,new_status,reason)
 values(edition,r.actor_id,r.id,'request.confirmation_kept','allowed','approved','approved',
 'Confirmation deadline elapsed; Super Admin selected keep_unconfirmed.');
 kept:=kept+1;
 end if;
 end loop;
 offered:=msrc_registration.pass_released_seats(edition,released);
 return jsonb_build_object('state','updated','released',released,'kept',kept,'offered',offered);
end$$;

create function public.msrc_staff_registration_confirmation_preview(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 perform 1 from msrc_registration.settings s where s.edition_key=$1 for update;
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready','confirmation',msrc_registration.confirmation_preview(edition_key));
end$$;

create function public.msrc_staff_registration_confirmation_start(edition_key text,operation_id uuid,nonresponse_policy text,preview_token text)
 returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare preview jsonb;round_row msrc_registration.confirmation_rounds%rowtype;opened integer;first_day timestamptz;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or nonresponse_policy is null or nonresponse_policy not in('release_unconfirmed','keep_unconfirmed')
 or preview_token is null or preview_token !~ '^[a-f0-9]{64}$' then return jsonb_build_object('state','conflict');end if;
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select c.* into round_row from msrc_registration.confirmation_rounds c where c.edition_key=edition_key and c.operation_id=operation_id;
 if found then
 if round_row.performer_id<>auth.uid() or round_row.nonresponse_policy<>nonresponse_policy or round_row.preview_token<>preview_token then
 return jsonb_build_object('state','conflict');end if;
 return jsonb_build_object('state','updated','opened',round_row.opened_count);end if;
 preview:=msrc_registration.confirmation_preview(edition_key);
 if not (preview->>'settingsReady')::boolean then return jsonb_build_object('state','area_not_ready');end if;
 if not (preview->>'canStart')::boolean then return jsonb_build_object('state','not_due');end if;
 if preview->>'previewToken'<>preview_token then return jsonb_build_object('state','conflict');end if;
 select min(d)::timestamp at time zone 'Asia/Riyadh' into first_day
 from msrc_registration.settings s cross join lateral unnest(s.conference_days) d where s.edition_key=edition_key;
 insert into msrc_registration.confirmation_rounds(edition_key,operation_id,performer_id,nonresponse_policy,preview_token,opened_count,response_hours,first_day_at)
 values(edition_key,operation_id,auth.uid(),nonresponse_policy,preview_token,(preview->>'eligibleCount')::integer,(preview->>'responseHours')::integer,first_day);
 opened:=msrc_registration.open_confirmation_windows(edition_key,null::uuid,auth.uid());
 return jsonb_build_object('state','updated','opened',opened);
end$$;

create function public.msrc_registration_confirmation_maintenance(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare result jsonb;opened integer;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 perform 1 from msrc_registration.settings s where s.edition_key=$1 for update;
 if not coalesce((select s.enabled from msrc_registration.settings s where s.edition_key=$1),false)
 or not msrc_participant.ready() or not coalesce((select s.sweeps_enabled from msrc_outbox.settings s where s.singleton),false) then
 return jsonb_build_object('state','closed');end if;
 opened:=msrc_registration.open_confirmation_windows(edition_key,null::uuid);
 result:=msrc_registration.expire_confirmations(edition_key,null::uuid);
 return result||jsonb_build_object('opened',opened);
end$$;

create function msrc_registration.participant_confirmation(edition text,session_claims jsonb,request_id uuid,operation_id uuid,action text)
 returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
 r msrc_registration.requests%rowtype;w msrc_registration.confirmation_windows%rowtype;
 receipt msrc_registration.participant_operations%rowtype;instant timestamptz;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 perform 1 from msrc_registration.settings s where s.edition_key=edition for update;
 if not coalesce((select s.enabled from msrc_registration.settings s where s.edition_key=edition),false) or not msrc_participant.ready() then
 result:=jsonb_build_object('state','closed');
 elsif request_id is null or operation_id is null or action is null or action not in('confirm','release')
 or not coalesce(msrc_registration.participant_current(edition),false) then result:=jsonb_build_object('state','denied');
 else
 select q.* into r from msrc_registration.requests q where q.edition_key=edition and q.actor_id=auth.uid() and q.id=request_id for update;
 if r.id is null then result:=jsonb_build_object('state','denied');else
 select o.* into receipt from msrc_registration.participant_operations o where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=operation_id;
 if found then
 if receipt.request_id<>request_id or receipt.action<>action then result:=jsonb_build_object('state','conflict');else result:=receipt.result;end if;
 else
 perform msrc_registration.expire_confirmations(edition,r.id);
 select q.* into r from msrc_registration.requests q where q.id=request_id;
 select c.* into w from msrc_registration.confirmation_windows c where c.request_id=request_id for update;
 if w.request_id is null then result:=jsonb_build_object('state','conflict');
 elsif action='confirm' and w.state in('released','kept') then result:=jsonb_build_object('state','expired');
 elsif action='confirm' and r.status='approved' and w.state='awaiting' then
 if not exists(select 1 from msrc_registration.tickets t where t.request_id=r.id and t.status='issued') then
 result:=jsonb_build_object('state','area_not_ready');else
 instant:=clock_timestamp();
 update msrc_registration.confirmation_windows c set state='confirmed',resolved_at=instant
 where c.request_id=r.id and c.state='awaiting' and c.deadline>clock_timestamp();
 if not found then perform msrc_registration.expire_confirmations(edition,r.id);result:=jsonb_build_object('state','expired');else
 update msrc_registration.requests q set status='confirmed',decided_at=instant,updated_at=instant where q.id=r.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition,auth.uid(),auth.uid(),r.id,'request.seat_confirmed','allowed','approved','confirmed');
 result:=jsonb_build_object('state','updated');end if;end if;
 elsif action='release' and r.status in('approved','confirmed') and w.state in('awaiting','confirmed','kept') then
 instant:=clock_timestamp();
 update msrc_registration.confirmation_windows c set state='released',resolved_at=instant where c.request_id=r.id;
 update msrc_registration.requests q set status='cancelled',decided_at=instant,updated_at=instant where q.id=r.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status,reason)
 values(edition,auth.uid(),auth.uid(),r.id,'request.seat_released','allowed',r.status,'cancelled','Participant cannot attend and released the seat.');
 perform msrc_registration.pass_released_seats(edition,1);
 result:=jsonb_build_object('state','updated');
 else result:=jsonb_build_object('state',case when w.state='released' then 'expired' else 'conflict' end);end if;
 if result->>'state'<>'area_not_ready' then
 insert into msrc_registration.participant_operations(edition_key,actor_id,operation_id,request_id,action,result)
 values(edition,auth.uid(),operation_id,request_id,action,result);end if;
 end if;end if;end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function public.msrc_registration_confirm_seat(edition_key text,session_claims jsonb,request_id uuid,operation_id uuid)
 returns jsonb language sql security definer set search_path='' as $$
 select msrc_registration.participant_confirmation(edition_key,session_claims,request_id,operation_id,'confirm');$$;
create function public.msrc_registration_release_seat(edition_key text,session_claims jsonb,request_id uuid,operation_id uuid)
 returns jsonb language sql security definer set search_path='' as $$
 select msrc_registration.participant_confirmation(edition_key,session_claims,request_id,operation_id,'release');$$;

create or replace function msrc_registration.participant_action(edition text,session_claims jsonb,request_id uuid,operation_id uuid,action text,ticket_secret text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);
 previous_key text:=current_setting('msrc_registration.ticket_key',true);result jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_registration.participant_change(edition,request_id,operation_id,action,ticket_secret);
 exception when others then
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 perform set_config('msrc_registration.ticket_key',coalesce(previous_key,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 perform set_config('msrc_registration.ticket_key',coalesce(previous_key,''),true);return result;
end$$;

-- New English templates are DRAFT. Existing ORG-057 wording and payloads stay unchanged.
create or replace function msrc_outbox.registration_message_valid(template text,version integer,locale text,recipient text,payload jsonb)
 returns boolean language plpgsql stable security invoker set search_path='' as $$
declare deadline timestamptz;
begin
 if version is distinct from 1 or locale is distinct from 'en' or recipient is null
 or length(recipient)>254 or recipient !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
 or payload is null or jsonb_typeof(payload)<>'object' then return false;end if;
 if template in('registration_received','registration_approved','registration_waitlisted','registration_expired','registration_cancelled','registration_seat_released') then
 return payload='{}'::jsonb;end if;
 if template='registration_confirm_seat' then
 if payload<>jsonb_build_object('confirm_expires_at',payload->'confirm_expires_at','nonresponse_policy',payload->'nonresponse_policy')
 or jsonb_typeof(payload->'confirm_expires_at') is distinct from 'string'
 or coalesce(payload->>'confirm_expires_at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?([+]00:00|Z)$'
 or jsonb_typeof(payload->'nonresponse_policy') is distinct from 'string'
 or coalesce(payload->>'nonresponse_policy','') not in('release_unconfirmed','keep_unconfirmed') then return false;end if;
 begin deadline:=(payload->>'confirm_expires_at')::timestamptz;
 exception when invalid_datetime_format or datetime_field_overflow then return false;end;
 return isfinite(deadline);
 end if;
 if template is distinct from 'registration_offered'
 or payload<>jsonb_build_object('offer_expires_at',payload->'offer_expires_at')
 or jsonb_typeof(payload->'offer_expires_at') is distinct from 'string'
 or coalesce(payload->>'offer_expires_at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?([+]00:00|Z)$' then return false;end if;
 begin deadline:=(payload->>'offer_expires_at')::timestamptz;
 exception when invalid_datetime_format or datetime_field_overflow then return false;end;
 return isfinite(deadline);
end$$;

create or replace function msrc_registration.ticket_and_email_event() returns trigger
 language plpgsql security definer set search_path='' as $$
declare template text;recipient text;payload jsonb:='{}'::jsonb;event_key text;ticket_id uuid;credential text;
begin
 if tg_op='UPDATE' and new.status is not distinct from old.status then return new;end if;
 if new.status='confirmed' or (new.status='approved' and exists(
 select 1 from msrc_registration.settings s where s.edition_key=new.edition_key and s.payment_required=false)) then
 -- Existing tickets stay identical through approved -> confirmed and retries.
 if not exists(select 1 from msrc_registration.tickets t where t.request_id=new.id) then
 ticket_id:=gen_random_uuid();
 credential:=msrc_registration.ticket_secret(ticket_id,current_setting('msrc_registration.ticket_key',true));
 insert into msrc_registration.tickets(id,request_id,secret_hash)
 values(ticket_id,new.id,sha256(convert_to(credential,'UTF8'))) on conflict(request_id) do nothing;
 if found then template:='registration_approved';end if;
 end if;
 elsif new.status in('cancelled','expired') then
 update msrc_registration.tickets set status='revoked',revoked_at=clock_timestamp()
 where request_id=new.id and status='issued';
 if new.status='expired' and tg_op='UPDATE' and old.status='offered' then template:='registration_expired';end if;
 if new.status='cancelled' then
 if exists(select 1 from msrc_registration.confirmation_windows w where w.request_id=new.id) then
 update msrc_registration.confirmation_windows set state='released',
 resolved_at=case when state='released' then resolved_at else clock_timestamp() end where request_id=new.id;
 template:='registration_seat_released';
 else template:='registration_cancelled';end if;
 end if;
 elsif new.status='pending_approval' and tg_op='INSERT' then template:='registration_received';
 elsif new.status='waitlisted' then template:='registration_waitlisted';
 elsif new.status='offered' and new.offer_expires_at is not null then
 template:='registration_offered';
 payload:=jsonb_build_object('offer_expires_at',to_char(new.offer_expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
 end if;
 if template is not null then
 select u.email into strict recipient from auth.users u
 where u.id=new.actor_id and u.deleted_at is null and u.email_confirmed_at is not null;
 event_key:='registration/'||new.id::text||'/'||template;
 -- Offer lifecycles are separate events; replay of the same transition is a no-op.
 if template in('registration_offered','registration_expired') then
 event_key:=event_key||'/'||(extract(epoch from new.offer_expires_at)*1000000)::bigint::text;
 end if;
 perform msrc_outbox.enqueue(event_key,template,1,'en',recipient,payload);
 end if;
 return new;
end$$;

-- Existing staff read/action sweep also advances the explicitly authorized round.
create or replace function public.msrc_staff_registration_expire_offers(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 perform msrc_registration.open_confirmation_windows(edition_key,null::uuid);
 perform msrc_registration.expire_confirmations(edition_key,null::uuid);
 return msrc_registration.expire_offers(edition_key,null::uuid);
end$$;

create or replace function msrc_registration.participant_me(edition text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare s msrc_registration.settings%rowtype;r msrc_registration.requests%rowtype;
 instant timestamptz;window_state text:='closed';opens_at timestamptz;eligible boolean:=false;
 request jsonb;held bigint;few_places boolean:=false;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration status requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 select * into s from msrc_registration.settings where edition_key=edition for update;
 if not coalesce(s.enabled,false) or not msrc_participant.ready() then return jsonb_build_object('state','closed');end if;
 if not coalesce(msrc_registration.participant_current(edition),false) then
 return jsonb_build_object('state','denied');end if;
 select * into r from msrc_registration.requests q where q.edition_key=edition and q.actor_id=auth.uid() for update;
 if r.id is not null then
 perform msrc_registration.expire_offers(edition,r.id);
 perform msrc_registration.open_confirmation_windows(edition,r.id);
 perform msrc_registration.expire_confirmations(edition,r.id);
 select * into r from msrc_registration.requests q where q.id=r.id;
 request:=jsonb_build_object('id',r.id,'status',r.status,'createdAt',r.created_at,'offerExpiresAt',r.offer_expires_at,'confirmation',msrc_registration.confirmation_projection(r.id));
 end if;
 instant:=clock_timestamp();
 if msrc_registration.settings_complete(edition) and instant<s.closing_at then
 if instant>=s.priority_start_at and instant<s.priority_end_at then
 window_state:='early_access';opens_at:=s.general_opening_at;
 eligible:=msrc_registration.early_access_active(edition,auth.uid()) or msrc_registration.priority_active(edition,auth.uid());
 elsif instant>=s.general_opening_at then window_state:='open';eligible:=true;
 else window_state:='scheduled';
 if instant<s.priority_start_at and (msrc_registration.early_access_active(edition,auth.uid())
 or msrc_registration.priority_active(edition,auth.uid())) then opens_at:=s.priority_start_at;
 else opens_at:=s.general_opening_at;end if;
 end if;
 end if;
 if s.places_remaining_threshold is not null and s.general_capacity is not null then
 select count(*) into held from msrc_registration.requests q where q.edition_key=edition
 and q.status in('approved','approved_awaiting_payment','offered','confirmed');
 few_places:=greatest(s.general_capacity-held,0)<=s.places_remaining_threshold;
 end if;
 return jsonb_build_object('state','ready','confirmationVersion',1,'request',request,
 'window',jsonb_build_object('state',window_state,'opensAt',opens_at,'eligible',eligible),
 'fewPlaces',few_places,'serverNow',instant);
end$$;

create or replace function public.msrc_registration_me(edition_key text,session_claims jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_registration.participant_me(edition_key);
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create or replace function msrc_registration.participant_change(edition text,request_id uuid,operation_id uuid,action text,ticket_secret text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_registration.settings%rowtype;r msrc_registration.requests%rowtype;
 receipt msrc_registration.participant_operations%rowtype;result jsonb;instant timestamptz;event text;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 if operation_id is null or request_id is null or action is null or action not in('accept','decline','cancel') then
 return jsonb_build_object('state','denied');end if;
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 select * into s from msrc_registration.settings where edition_key=edition for update;
 if not coalesce(s.enabled,false) or not msrc_participant.ready() then return jsonb_build_object('state','closed');end if;
 -- Observe exact-session admission again after the allocation lock wait. Neither
 -- the request ID nor the service's forwarded claims grant ownership by themselves.
 if not coalesce(msrc_registration.participant_current(edition),false) then
 return jsonb_build_object('state','denied');end if;
 select * into r from msrc_registration.requests q where q.edition_key=edition and q.actor_id=auth.uid() and q.id=request_id for update;
 if r.id is null then return jsonb_build_object('state','denied');end if;
 select * into receipt from msrc_registration.participant_operations o
 where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=operation_id;
 if found then
 if receipt.request_id<>request_id or receipt.action<>action then return jsonb_build_object('state','conflict');end if;
 return receipt.result;
 end if;
 perform msrc_registration.expire_confirmations(edition,r.id);
 select q.* into r from msrc_registration.requests q where q.id=request_id;
 -- Only an elapsed own offer may expire. Denied foreign actions have no effects.
 if r.status='offered' and r.offer_expires_at<=clock_timestamp() then
 perform msrc_registration.expire_offers(edition,r.id);
 result:=jsonb_build_object('state','expired');
 elsif action='accept' then
 if r.status<>'offered' then result:=jsonb_build_object('state',case when r.status='expired' then 'expired' else 'conflict' end);
 elsif r.offer_expires_at is null or s.payment_required is distinct from false
 or ticket_secret is null or ticket_secret !~ '^[a-fA-F0-9]{64}$' then result:=jsonb_build_object('state','area_not_ready');
 else
 perform set_config('msrc_registration.ticket_key',ticket_secret,true);
 instant:=clock_timestamp();
 -- Check at the actual transition, never using transaction/statement start time.
 if r.offer_expires_at<=instant then
 perform msrc_registration.expire_offers(edition,r.id);result:=jsonb_build_object('state','expired');
 else
 update msrc_registration.requests q set status='approved',decided_at=instant,updated_at=instant
 where q.id=r.id and q.offer_expires_at>clock_timestamp();
 if not found then
 perform msrc_registration.expire_offers(edition,r.id);result:=jsonb_build_object('state','expired');
 else
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition,auth.uid(),auth.uid(),r.id,'request.offer_accepted','allowed','offered','approved');
 result:=jsonb_build_object('state','updated');
 end if;
 end if;
 end if;
 elsif (action='decline' and r.status='offered')
 or (action='cancel' and r.status in('pending_approval','waitlisted','offered','approved')) then
 instant:=clock_timestamp();event:=case when action='decline' then 'request.offer_declined' else 'request.cancelled' end;
 update msrc_registration.requests q set status='cancelled',decided_at=instant,updated_at=instant where q.id=r.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status,reason)
 values(edition,auth.uid(),auth.uid(),r.id,event,'allowed',r.status,'cancelled',
 case when action='decline' then 'Participant declined the seat offer.' else 'Participant requested cancellation.' end);
 if r.status in('offered','approved') then perform msrc_registration.pass_released_seats(edition,1);end if;
 result:=jsonb_build_object('state','updated');
 else result:=jsonb_build_object('state',case when r.status='expired' then 'expired' else 'conflict' end);
 end if;
 -- Readiness failures can be retried once deployment configuration is repaired.
 if result->>'state'<>'area_not_ready' then
 insert into msrc_registration.participant_operations(edition_key,actor_id,operation_id,request_id,action,result)
 values(edition,auth.uid(),operation_id,request_id,action,result);
 end if;
 return result;
end$$;

-- An issued QR read cannot outlive a release-policy deadline.
create or replace function public.msrc_registration_ticket(edition_key text,session_claims jsonb,ticket_secret text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
 ticket msrc_registration.tickets%rowtype;credential text;request_status text;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for update;
 if not coalesce((select s.enabled from msrc_registration.settings s where s.edition_key=edition_key),false)
 or not msrc_participant.ready() then result:=jsonb_build_object('state','closed');
 else
 if not coalesce(msrc_registration.participant_current(edition_key),false) then result:=jsonb_build_object('state','denied');
 else
 perform msrc_registration.expire_confirmations(edition_key,r.id) from msrc_registration.requests r where r.edition_key=edition_key and r.actor_id=auth.uid();
 select t.* into ticket from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
 where r.edition_key=edition_key and r.actor_id=auth.uid() for share of t,r;
 select r.status into request_status from msrc_registration.requests r where r.id=ticket.request_id;
 if ticket.id is null then result:=jsonb_build_object('state','ready','ticket',null);
 elsif ticket.status='revoked' then
 result:=jsonb_build_object('state','ready','ticket',jsonb_build_object('status','revoked',
 'referenceCode',upper(substr(replace(ticket.id::text,'-',''),1,12)),'token',null));
 elsif request_status not in('approved','confirmed') or (request_status='approved' and not exists(
 select 1 from msrc_registration.settings s where s.edition_key=edition_key and s.payment_required=false)) then
 result:=jsonb_build_object('state','unavailable');
 elsif ticket_secret is null or ticket_secret !~ '^[a-fA-F0-9]{64}$' then result:=jsonb_build_object('state','unavailable');
 else
 credential:=msrc_registration.ticket_secret(ticket.id,ticket_secret);
 if sha256(convert_to(credential,'UTF8'))<>ticket.secret_hash then result:=jsonb_build_object('state','unavailable');
 else result:=jsonb_build_object('state','ready','ticket',jsonb_build_object('status','issued',
 'referenceCode',upper(substr(replace(ticket.id::text,'-',''),1,12)),'token','msrc1.'||ticket.id::text||'.'||credential));end if;
 end if;
 end if;
 end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

-- Online check-in enforces elapsed confirmation even if cron has not run.
create or replace function public.msrc_staff_checkin(edition_key text,ticket_token_or_reference text,conference_day date,entry_point text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare settings_row msrc_registration.settings%rowtype;ticket_row msrc_registration.tickets%rowtype;
 request_row msrc_registration.requests%rowtype;attendance_row msrc_registration.attendance%rowtype;
 candidate_ids uuid[];credential text:=btrim(ticket_token_or_reference);point text:=nullif(btrim(entry_point),'');
 checkin_method text;ticket_uuid uuid;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Attendance requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff'],false) is null then return jsonb_build_object('state','denied');end if;
 if not msrc_registration.checkin_rate_limit() then
 return msrc_registration.checkin_result(edition_key,'rate_limited',null,null,null);end if;
 if credential is null or char_length(credential) not between 1 and 110
 or (point is not null and (char_length(point)>120 or point ~ '[[:cntrl:]]')) then
 return msrc_registration.checkin_result(edition_key,'invalid',null,null,null);end if;
 if credential ~ '^msrc1\.[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.[a-f0-9]{64}$' then
 checkin_method:='scan';ticket_uuid:=split_part(credential,'.',2)::uuid;
 elsif upper(credential) ~ '^[A-F0-9]{12}$' then checkin_method:='manual_code';
 else return msrc_registration.checkin_result(edition_key,'not_found',conference_day,point,null);end if;
 -- Match the existing mutation lock order: settings, request, ticket. A cancel,
 -- revocation or owner day change cannot commit between entitlement and insert.
 select * into settings_row from msrc_registration.settings s where s.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff']) is null then return jsonb_build_object('state','denied');end if;
 if conference_day is null or not coalesce(conference_day=any(settings_row.conference_days),false) then
 return msrc_registration.checkin_result(edition_key,'wrong_day',conference_day,point,checkin_method);end if;
 if checkin_method='manual_code' then
 select array_agg(q.id) into candidate_ids from (select t.id from msrc_registration.tickets t
 join msrc_registration.requests r on r.id=t.request_id where r.edition_key=edition_key
 and upper(substr(replace(t.id::text,'-',''),1,12))=upper(credential) limit 2) q;
 -- A rare reference collision must never admit an arbitrary ticket.
 if coalesce(cardinality(candidate_ids),0)<>1 then
 return msrc_registration.checkin_result(edition_key,'not_found',conference_day,point,checkin_method);end if;
 ticket_uuid:=candidate_ids[1];end if;
 select r.* into request_row from msrc_registration.requests r join msrc_registration.tickets t on t.request_id=r.id
 where t.id=ticket_uuid and r.edition_key=edition_key for update of r;
 select * into ticket_row from msrc_registration.tickets t where t.id=ticket_uuid and t.request_id=request_row.id for update;
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff']) is null then return jsonb_build_object('state','denied');end if;
 if request_row.id is null or ticket_row.id is null or (checkin_method='scan'
 and sha256(convert_to(split_part(credential,'.',3),'UTF8'))<>ticket_row.secret_hash) then
 return msrc_registration.checkin_result(edition_key,'not_found',conference_day,point,checkin_method);end if;
 -- Validate the credential before causing any target transition. Settings remain
 -- exclusively locked through expiry and the eventual attendance insertion.
 perform msrc_registration.expire_confirmations(edition_key,request_row.id);
 select r.* into request_row from msrc_registration.requests r where r.id=request_row.id;
 select t.* into ticket_row from msrc_registration.tickets t where t.id=ticket_uuid;
 if ticket_row.status='revoked' or request_row.status in('cancelled','expired') then
 return msrc_registration.checkin_result(edition_key,'revoked',conference_day,point,checkin_method,ticket_row.id);end if;
 if request_row.status not in('approved','confirmed') or (request_row.status='approved' and settings_row.payment_required is distinct from false) then
 return msrc_registration.checkin_result(edition_key,'not_approved',conference_day,point,checkin_method,ticket_row.id);end if;
 -- The credential remains subject to current attendee account authority. No
 -- participant login/session is required at a door, but suspension, native bans,
 -- missing verification or missing adult admission must not confer attendance.
 -- authorize owns the scanner account row. NOWAIT avoids an account-lock cycle
 -- if two people with historic attendee records scan each other. Contention is
 -- retryable infrastructure unavailability, never a false admission decision.
 begin
 perform 1 from msrc_authorization.account_access a where a.actor_id=request_row.actor_id for share nowait;
 perform 1 from auth.users u where u.id=request_row.actor_id for share nowait;
 perform 1 from msrc_participant.profiles p where p.actor_id=request_row.actor_id for share nowait;
 exception when lock_not_available then
 return msrc_registration.checkin_result(edition_key,'unavailable',conference_day,point,checkin_method,ticket_row.id);
 end;
 if not exists(select 1 from msrc_authorization.account_access a join auth.users u on u.id=a.actor_id
 join msrc_participant.profiles p on p.actor_id=a.actor_id where a.actor_id=request_row.actor_id
 and a.state='active' and p.state='verified' and u.deleted_at is null and not u.is_anonymous
 and u.email_confirmed_at is not null and u.email_confirmed_at<=clock_timestamp() and coalesce(btrim(u.email),'')<>''
 and (u.banned_until is null or u.banned_until<=clock_timestamp())) or not msrc_participant.age_proven(request_row.actor_id) then
 return msrc_registration.checkin_result(edition_key,'not_approved',conference_day,point,checkin_method,ticket_row.id);end if;
 -- The target account locks may also wait; recheck the scanner's exact session.
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff']) is null then return jsonb_build_object('state','denied');end if;
 perform msrc_registration.expire_confirmations(edition_key,request_row.id);
 if exists(select 1 from msrc_registration.tickets t where t.id=ticket_row.id and t.status='revoked') then
 return msrc_registration.checkin_result(edition_key,'revoked',conference_day,point,checkin_method,ticket_row.id);end if;
 select * into attendance_row from msrc_registration.attendance a
 where a.ticket_id=ticket_row.id and a.conference_day=conference_day for update;
 if attendance_row.id is not null and attendance_row.undone_at is null then
 return msrc_registration.checkin_result(edition_key,'already_checked_in',conference_day,point,checkin_method,ticket_row.id,attendance_row.id);end if;
 if attendance_row.id is null then
 insert into msrc_registration.attendance(ticket_id,conference_day,performer_id,entry_point,method)
 values(ticket_row.id,conference_day,auth.uid(),point,checkin_method) returning * into attendance_row;
 else
 update msrc_registration.attendance a set checked_in_at=clock_timestamp(),performer_id=auth.uid(),entry_point=point,method=checkin_method,
 undone_at=null,undone_by=null,undo_reason=null where a.id=attendance_row.id returning a.* into attendance_row;
 end if;
 return msrc_registration.checkin_result(edition_key,'checked_in',conference_day,point,checkin_method,ticket_row.id,attendance_row.id);
end$$;

create or replace function msrc_registration.staff_queue(edition text,search text,status_filter text) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;expiry jsonb;
begin
 expiry:=public.msrc_staff_registration_expire_offers(edition);
 if expiry->>'state'<>'updated' then return null;end if;
 select jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(q) order by q."createdAt" desc,q.id) from (
 select r.id,r.actor_id as "actorId",p.name,u.email,r.status,
 coalesce(d.active,false) as priority,r.created_at as "createdAt",r.decided_at as "decidedAt",
 r.offer_expires_at as "offerExpiresAt",r.identity_masked as "identityMasked",t.status as "ticketStatus",msrc_registration.confirmation_projection(r.id) as confirmation
 from msrc_registration.requests r
 join msrc_participant.profiles p on p.actor_id=r.actor_id
 join auth.users u on u.id=r.actor_id
 left join msrc_registration.tickets t on t.request_id=r.id
 left join msrc_registration.priority_designations d on d.edition_key=r.edition_key and d.actor_id=r.actor_id
 where r.edition_key=edition and (status_filter='all' or r.status=status_filter
 or (status_filter='confirmation_awaiting' and r.status='approved' and exists(select 1 from msrc_registration.confirmation_windows w where w.request_id=r.id and w.state='awaiting'))
 or (status_filter='confirmation_confirmed' and r.status='confirmed' and exists(select 1 from msrc_registration.confirmation_windows w where w.request_id=r.id and w.state='confirmed'))
 or (status_filter='confirmation_released' and r.status='cancelled' and exists(select 1 from msrc_registration.confirmation_windows w where w.request_id=r.id and w.state='released')))
 and (search='' or strpos(lower(p.name),lower(search))>0 or strpos(lower(u.email),lower(search))>0)
 order by r.created_at desc,r.id limit 50) q),'[]'::jsonb),
 'counts',msrc_registration.staff_counts(edition)) into result;
 return result;
end$$;

create or replace function public.msrc_staff_registration(edition_key text,search text default '',status_filter text default 'all') returns jsonb
 language plpgsql security definer set search_path='' as $$
declare registration jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 -- authorize() locks account/session rows; take authority first, as mutations do.
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null
 or search is null or char_length(search)>200 or status_filter is null
 or status_filter not in ('all','pending_approval','approved','approved_awaiting_payment','waitlisted','offered','confirmed','cancelled','expired','confirmation_awaiting','confirmation_confirmed','confirmation_released') then
 return jsonb_build_object('state','denied');end if;
 registration:=msrc_registration.staff_queue(edition_key,search,status_filter);
 if registration is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready','confirmationVersion',1,'registration',registration);
end$$;

create or replace function msrc_registration.staff_counts(edition text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('confirmationAwaiting',(select count(*) from msrc_registration.confirmation_windows w join msrc_registration.requests r on r.id=w.request_id where r.edition_key=edition and r.status='approved' and w.state='awaiting'),
 'confirmationConfirmed',(select count(*) from msrc_registration.confirmation_windows w join msrc_registration.requests r on r.id=w.request_id where r.edition_key=edition and r.status='confirmed' and w.state='confirmed'),
 'confirmationReleased',(select count(*) from msrc_registration.confirmation_windows w join msrc_registration.requests r on r.id=w.request_id where r.edition_key=edition and r.status='cancelled' and w.state='released'),
 'pending',totals.pending,'approved',totals.held,
 'waitlisted',totals.waitlisted,'offered',totals.offered,'expired',totals.expired,'capacity',s.general_capacity,
 'remaining',case when s.general_capacity is null then null else greatest(s.general_capacity-totals.held,0) end)
 from (select count(*) filter(where r.status='pending_approval') as pending,
 count(*) filter(where r.status in ('approved','approved_awaiting_payment','offered','confirmed')) as held,
 count(*) filter(where r.status='waitlisted') as waitlisted,
 count(*) filter(where r.status='offered') as offered,count(*) filter(where r.status='expired') as expired
 from msrc_registration.requests r where r.edition_key=edition) totals
 left join msrc_registration.settings s on s.edition_key=edition;
$$;

create or replace function public.msrc_staff_registration_detail(edition_key text,request_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare request jsonb;history jsonb;expiry jsonb;
begin
 -- Expiry may allocate a replacement seat; guard isolation before any early exit.
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if request_id is null or msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 expiry:=public.msrc_staff_registration_expire_offers(edition_key);
 if expiry->>'state'<>'updated' then return jsonb_build_object('state','denied');end if;
 select to_jsonb(q) into request from (
 select r.id,r.actor_id as "actorId",p.name,u.email,r.status,
 coalesce(d.active,false) as priority,r.created_at as "createdAt",r.decided_at as "decidedAt",
 r.offer_expires_at as "offerExpiresAt",r.identity_masked as "identityMasked",t.status as "ticketStatus",msrc_registration.confirmation_projection(r.id) as confirmation
 from msrc_registration.requests r
 join msrc_participant.profiles p on p.actor_id=r.actor_id join auth.users u on u.id=r.actor_id
 left join msrc_registration.tickets t on t.request_id=r.id
 left join msrc_registration.priority_designations d on d.edition_key=r.edition_key and d.actor_id=r.actor_id
 where r.edition_key=edition_key and r.id=request_id) q;
 if request is null then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.at desc,q.id desc),'[]'::jsonb) into history from (
 select a.id,a.event,a.previous_status as "from",a.new_status as "to",a.occurred_at as at,
 case when a.event in('request.submitted','request.offer_accepted','request.offer_declined','request.cancelled','request.seat_confirmed') then 'participant'
 when a.event='request.seat_released' and a.performer_id is not null then 'participant'
 when a.performer_id is null then 'automatic' else 'staff' end as "actorKind",
 case when a.event not in('request.submitted','request.offer_accepted','request.offer_declined','request.cancelled','request.seat_confirmed')
 and a.event<>'request.seat_released' and a.performer_id is not null then p.name else null end as "performerName"
 from msrc_registration.audit a left join msrc_staff.profiles p on p.actor_id=a.performer_id
 where a.edition_key=edition_key and a.request_id=request_id and a.result='allowed'
 and a.target_actor=(request->>'actorId')::uuid
 and a.event in('request.submitted','request.approved','request.waitlisted','request.offered','request.offer_expired',
 'request.offer_accepted','request.offer_declined','request.cancelled','ticket.issued','ticket.revoked','request.confirmation_opened','request.confirmation_kept','request.seat_confirmed','request.seat_released')) q;
 return jsonb_build_object('state','ready','historyVersion',1,'confirmationVersion',1,'detail',jsonb_build_object('request',request,'history',history));
end$$;

create or replace function public.msrc_staff_launch_readiness(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare database_health boolean:=false;
begin
 -- A caller waiting behind authority changes must not retain an older snapshot.
 -- Keep this guard before authorization and every early return.
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception using errcode='25001',message='Launch readiness requires READ COMMITTED isolation.';
 end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then
  return jsonb_build_object('state','denied');
 end if;

 -- Execute only the constant no-data ping; never invoke a drain, sweep,
 -- participant status action, or mutable registration RPC to test its existence.
 if to_regprocedure('public.msrc_health_check()') is not null then
  begin
   execute 'select public.msrc_health_check()' into database_health;
  exception when undefined_function then database_health:=false;
  end;
 end if;

 return (
  with eligible_staff as (
   select distinct g.actor_id,g.role_name
   from msrc_authorization.role_grants g
   join msrc_authorization.account_access a on a.actor_id=g.actor_id
   join msrc_staff.profiles p on p.actor_id=g.actor_id
   join auth.users u on u.id=g.actor_id
   where g.edition_key=edition_key and g.state='active' and g.scope_kind='edition'
    and g.role_name<>'participant' and a.state='active' and a.individually_identified
    and p.recovery_state='none' and u.email_confirmed_at is not null
    and u.email_confirmed_at<=statement_timestamp() and u.deleted_at is null
    and not coalesce(u.is_anonymous,false)
    and (u.banned_until is null or u.banned_until<=statement_timestamp())
  ), role_counts as (
   select r.role_name,count(e.actor_id) as total
   from unnest(array['abstractReviewer','hackathonReviewer','threeMinuteThesisReviewer',
    'scientificAdministrator','judgingCommittee','facultyJudge',
    'registrationWorkshopAdministrator','finance','checkInStaff',
    'contentMediaEditor','sponsorshipPr','superAdmin']::text[]) r(role_name)
   left join eligible_staff e on e.role_name=r.role_name group by r.role_name
  ), authenticators as (
   select count(*) as total from eligible_staff e where e.role_name='superAdmin'
    and exists(select 1 from auth.mfa_factors f where f.user_id=e.actor_id
     and f.factor_type='totp' and f.status='verified'
     and f.created_at<=statement_timestamp() and f.updated_at<=statement_timestamp())
  )
  select jsonb_build_object(
   'state','ready',
   'participantAccountsEnabled',coalesce((select p.enabled from msrc_participant.policy p where p.singleton),false),
   'participantPolicyComplete',coalesce((select p.privacy_version='v1.0' and p.email_daily_limit>0
    from msrc_participant.policy p where p.singleton),false),
   'participantEmailDailyLimit',coalesce((select p.email_daily_limit from msrc_participant.policy p where p.singleton),0),
   'retentionEnabled',coalesce((select p.enabled from msrc_participant.retention_policy p where p.singleton),false),
   'outboxDeliveryEnabled',coalesce((select s.delivery_enabled from msrc_outbox.settings s where s.singleton),false),
   'outboxSweepsEnabled',coalesce((select s.sweeps_enabled from msrc_outbox.settings s where s.singleton),false),
   'outboxDailyCap',coalesce((select s.daily_cap from msrc_outbox.settings s where s.singleton),0),
   'registrationSettingsComplete',msrc_registration.settings_complete(edition_key),
   'registrationEnabled',coalesce((select s.enabled from msrc_registration.settings s where s.edition_key=edition_key),false),
   'confirmationSettingsSet',coalesce((select s.confirm_seat_lead_days is not null and s.confirm_seat_response_hours is not null and cardinality(s.conference_days)>0 from msrc_registration.settings s where s.edition_key=edition_key),false),
   'conferenceDaysSet',coalesce((select cardinality(s.conference_days)>0 from msrc_registration.settings s where s.edition_key=edition_key),false),
   'conferenceDayCount',coalesce((select cardinality(s.conference_days) from msrc_registration.settings s where s.edition_key=edition_key),0),
   'staffCounts',(select jsonb_object_agg(r.role_name,r.total) from role_counts r),
   'earlyAccessCount',(select count(*) from msrc_registration.early_access_entries e where e.edition_key=edition_key and e.active),
   'secondSuperAdminWithAuthenticator',(select a.total>=2 from authenticators a),
   'superAdminsWithAuthenticatorCount',(select a.total from authenticators a),
   'healthReady',coalesce(database_health,false),
   -- Vercel worker invocations have no durable run ledger in this database.
   -- Message timestamps are not evidence that the latest cron run succeeded.
   'lastOutboxDrainObservable',false,
   'requiredRpcs',jsonb_build_object(
    'confirmation',to_regprocedure('public.msrc_staff_registration_confirmation_preview(text)') is not null
     and to_regprocedure('public.msrc_staff_registration_confirmation_start(text,uuid,text,text)') is not null
     and to_regprocedure('public.msrc_registration_confirm_seat(text,jsonb,uuid,uuid)') is not null
     and to_regprocedure('public.msrc_registration_release_seat(text,jsonb,uuid,uuid)') is not null
     and to_regprocedure('public.msrc_registration_confirmation_maintenance(text)') is not null,
    'participantAccounts',to_regprocedure('public.msrc_participant_status()') is not null
     and to_regprocedure('public.msrc_participant_signup_reserve(uuid,uuid,text,text,text,boolean)') is not null
     and to_regprocedure('msrc_participant.run_cleanup_job()') is not null,
    'registration',to_regprocedure('public.msrc_registration_status(text)') is not null
     and to_regprocedure('public.msrc_registration_submit(text,jsonb,text,jsonb,text,text,text,text)') is not null
     and to_regprocedure('public.msrc_registration_me(text,jsonb)') is not null
     and to_regprocedure('public.msrc_registration_accept_offer(text,jsonb,uuid,uuid,text)') is not null
     and to_regprocedure('public.msrc_registration_decline_offer(text,jsonb,uuid,uuid)') is not null
     and to_regprocedure('public.msrc_registration_cancel(text,jsonb,uuid,uuid)') is not null,
    'registrationSettings',to_regprocedure('public.msrc_staff_registration_settings(text)') is not null
     and to_regprocedure('public.msrc_staff_registration_settings_save(text,jsonb,uuid)') is not null,
    'earlyAccess',to_regprocedure('public.msrc_staff_early_access(text,text)') is not null
     and to_regprocedure('public.msrc_staff_early_access_add(text,text[])') is not null
     and to_regprocedure('public.msrc_staff_early_access_remove(text,uuid[])') is not null,
    'tickets',to_regprocedure('public.msrc_registration_ticket(text,jsonb,text)') is not null
     and to_regprocedure('public.msrc_staff_registration_approve_tickets(text,jsonb,uuid[],text)') is not null,
    'checkIn',to_regprocedure('public.msrc_staff_checkin(text,text,date,text)') is not null
     and to_regprocedure('public.msrc_staff_checkin_undo(text,uuid,text)') is not null
     and to_regprocedure('public.msrc_staff_attendance_summary(text,date)') is not null
     and to_regprocedure('public.msrc_registration_attendance(text,jsonb)') is not null,
    'outbox',to_regprocedure('public.msrc_outbox_claim(uuid,integer,integer)') is not null
     and to_regprocedure('public.msrc_outbox_prepare(uuid,uuid,uuid,jsonb)') is not null
     and to_regprocedure('public.msrc_outbox_finish(uuid,uuid,uuid,text,text,text)') is not null
     and to_regprocedure('public.msrc_outbox_monitor()') is not null,
    'health',to_regprocedure('public.msrc_health_check()') is not null
   )
  )
 );
end$$;

revoke all on function msrc_registration.confirmation_projection(uuid),msrc_registration.confirmation_preview(text),
 msrc_registration.open_confirmation_windows(text,uuid,uuid),msrc_registration.expire_confirmations(text,uuid),
 msrc_registration.participant_confirmation(text,jsonb,uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_registration_confirmation_preview(text),
 public.msrc_staff_registration_confirmation_start(text,uuid,text,text),
 public.msrc_registration_confirmation_maintenance(text),public.msrc_registration_confirm_seat(text,jsonb,uuid,uuid),
 public.msrc_registration_release_seat(text,jsonb,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_registration_confirmation_preview(text),
 public.msrc_staff_registration_confirmation_start(text,uuid,text,text) to authenticated;
grant execute on function public.msrc_registration_confirmation_maintenance(text),
 public.msrc_registration_confirm_seat(text,jsonb,uuid,uuid),public.msrc_registration_release_seat(text,jsonb,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
