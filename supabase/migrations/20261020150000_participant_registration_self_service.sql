-- ENG-055 / ORG-055/056. REG-02/04/05/06, CHK-01, EML-01/03, SEC-01/02/06.
-- Review only. No settings seed, hosted change, email delivery or activation.
begin;

create table msrc_registration.participant_operations (
 edition_key text not null references msrc_registration.settings(edition_key) on delete restrict,
 actor_id uuid not null,
 operation_id uuid not null,
 request_id uuid not null references msrc_registration.requests(id) on delete restrict,
 action text not null check(action in('accept','decline','cancel')),
 result jsonb not null check(jsonb_typeof(result)='object'),
 created_at timestamptz not null default clock_timestamp(),
 primary key(edition_key,actor_id,operation_id)
);
create index registration_participant_operations_request on msrc_registration.participant_operations(request_id);
alter table msrc_registration.participant_operations enable row level security;
alter table msrc_registration.participant_operations force row level security;
revoke all on table msrc_registration.participant_operations from public,anon,authenticated,service_role;
create trigger registration_participant_operations_immutable before insert or update or delete
 on msrc_registration.participant_operations for each row execute function msrc_staff.audit_immutable();
create trigger registration_participant_operations_no_truncate before truncate
 on msrc_registration.participant_operations for each statement execute function msrc_staff.audit_immutable();
comment on table msrc_registration.participant_operations is
 'Private immutable operation receipts, scoped to the verified actor and edition. No credential, identity, email or ticket data.';

alter table msrc_registration.audit drop constraint audit_event_check;
alter table msrc_registration.audit add constraint audit_event_check check(event in (
 'request.submitted','priority.set','priority.removed','identity.revealed',
 'request.approved','request.waitlisted','request.offered','request.offer_expired','registration.exported',
 'early_access.added','early_access.removed','request.offer_accepted','request.offer_declined','request.cancelled'));
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
 or (event not in('request.approved','request.waitlisted','request.offered','request.offer_expired',
  'request.offer_accepted','request.offer_declined','request.cancelled') and previous_status is null and new_status is null));

-- Callers hold the edition settings row lock. Only the number of seats released
-- by this transaction may pass on; pre-existing spare capacity creates no offer.
create function msrc_registration.pass_released_seats(edition text,released integer) returns integer
 language plpgsql security definer set search_path='' as $$
declare s msrc_registration.settings%rowtype;r msrc_registration.requests%rowtype;
 held bigint;offered integer:=0;instant timestamptz;
begin
 if released is null or released<=0 then return 0;end if;
 select * into s from msrc_registration.settings where edition_key=edition for update;
 if s.offer_window_hours is null or s.general_capacity is null then return 0;end if;
 select count(*) into held from msrc_registration.requests q where q.edition_key=edition
 and q.status in('approved','approved_awaiting_payment','offered','confirmed');
 for r in select q.* from msrc_registration.requests q where q.edition_key=edition and q.status='waitlisted'
 order by q.created_at,q.id for update loop
 exit when offered>=released or held>=s.general_capacity;
 instant:=clock_timestamp();
 update msrc_registration.requests q set status='offered',decided_at=instant,updated_at=instant,
 offer_expires_at=instant+make_interval(hours=>s.offer_window_hours) where q.id=r.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition,null::uuid,r.actor_id,r.id,'request.offered','allowed','waitlisted','offered');
 offered:=offered+1;held:=held+1;
 end loop;
 return offered;
end$$;

-- target_request NULL is used only by the authorized staff expiry entrypoint.
-- Participant reads/actions expire only their own request after ownership checks.
create function msrc_registration.expire_offers(edition text,target_request uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare r msrc_registration.requests%rowtype;instant timestamptz;expired integer:=0;offered integer;
begin
 perform 1 from msrc_registration.settings s where s.edition_key=edition for update;
 instant:=clock_timestamp();
 for r in select q.* from msrc_registration.requests q where q.edition_key=edition
 and (target_request is null or q.id=target_request) and q.status='offered' and q.offer_expires_at<=instant
 order by q.created_at,q.id for update loop
 update msrc_registration.requests q set status='expired',decided_at=instant,updated_at=instant where q.id=r.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition,null::uuid,r.actor_id,r.id,'request.offer_expired','allowed','offered','expired');
 expired:=expired+1;
 end loop;
 offered:=msrc_registration.pass_released_seats(edition,expired);
 return jsonb_build_object('state','updated','expired',expired,'offered',offered);
end$$;

create or replace function public.msrc_staff_registration_expire_offers(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 return msrc_registration.expire_offers(edition_key,null::uuid);
end$$;

create function msrc_registration.participant_current(edition text) returns boolean
 language plpgsql security definer set search_path='' as $$
declare profile jsonb;instant timestamptz;native_deadline timestamptz;
begin
 if not msrc_registration.bind_claims(current_setting('request.jwt.claims',true)::jsonb) then return false;end if;
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 select s.not_after into native_deadline from auth.sessions s
 where s.id=(auth.jwt()->>'session_id')::uuid and s.user_id=auth.uid() for share;
 if not found then return false;end if;
 perform 1 from msrc_sessions.session_state s
 where s.session_id=(auth.jwt()->>'session_id')::uuid and s.actor_id=auth.uid() for share;
 profile:=msrc_participant.observe_profile(edition);instant:=clock_timestamp();
 return profile is not null and msrc_participant.age_proven(auth.uid())
 and (profile#>>'{session,timing,absoluteExpiresAt}')::timestamptz>instant
 and (native_deadline is null or native_deadline>instant)
 and (auth.jwt()->>'exp')::numeric>extract(epoch from instant);
end$$;

create function msrc_registration.participant_me(edition text) returns jsonb
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
 select * into r from msrc_registration.requests q where q.id=r.id;
 request:=jsonb_build_object('id',r.id,'status',r.status,'createdAt',r.created_at,'offerExpiresAt',r.offer_expires_at);
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
 return jsonb_build_object('state','ready','request',request,
 'window',jsonb_build_object('state',window_state,'opensAt',opens_at,'eligible',eligible),
 'fewPlaces',few_places,'serverNow',instant);
end$$;

create function public.msrc_registration_me(edition_key text,session_claims jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
begin
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_registration.participant_me(edition_key);
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function msrc_registration.participant_change(edition text,request_id uuid,operation_id uuid,action text,ticket_secret text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_registration.settings%rowtype;r msrc_registration.requests%rowtype;
 receipt msrc_registration.participant_operations%rowtype;result jsonb;instant timestamptz;event text;
begin
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

create function msrc_registration.participant_action(edition text,session_claims jsonb,request_id uuid,operation_id uuid,action text,ticket_secret text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);
 previous_key text:=current_setting('msrc_registration.ticket_key',true);result jsonb;
begin
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_registration.participant_change(edition,request_id,operation_id,action,ticket_secret);
 exception when others then
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 perform set_config('msrc_registration.ticket_key',coalesce(previous_key,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 perform set_config('msrc_registration.ticket_key',coalesce(previous_key,''),true);return result;
end$$;

create function public.msrc_registration_accept_offer(edition_key text,session_claims jsonb,request_id uuid,operation_id uuid,ticket_secret text) returns jsonb
 language sql security definer set search_path='' as $$
 select msrc_registration.participant_action(edition_key,session_claims,request_id,operation_id,'accept',ticket_secret);$$;
create function public.msrc_registration_decline_offer(edition_key text,session_claims jsonb,request_id uuid,operation_id uuid) returns jsonb
 language sql security definer set search_path='' as $$
 select msrc_registration.participant_action(edition_key,session_claims,request_id,operation_id,'decline',null::text);$$;
create function public.msrc_registration_cancel(edition_key text,session_claims jsonb,request_id uuid,operation_id uuid) returns jsonb
 language sql security definer set search_path='' as $$
 select msrc_registration.participant_action(edition_key,session_claims,request_id,operation_id,'cancel',null::text);$$;

revoke all on function msrc_registration.pass_released_seats(text,integer),msrc_registration.expire_offers(text,uuid),
 msrc_registration.participant_current(text),msrc_registration.participant_me(text),msrc_registration.participant_change(text,uuid,uuid,text,text),
 msrc_registration.participant_action(text,jsonb,uuid,uuid,text,text) from public,anon,authenticated,service_role;
revoke all on function public.msrc_registration_me(text,jsonb),
 public.msrc_registration_accept_offer(text,jsonb,uuid,uuid,text),
 public.msrc_registration_decline_offer(text,jsonb,uuid,uuid),public.msrc_registration_cancel(text,jsonb,uuid,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.msrc_registration_me(text,jsonb),
 public.msrc_registration_accept_offer(text,jsonb,uuid,uuid,text),
 public.msrc_registration_decline_offer(text,jsonb,uuid,uuid),public.msrc_registration_cancel(text,jsonb,uuid,uuid) to service_role;

-- Cancellation uses the same transactional, English-only business producer.
create or replace function msrc_outbox.registration_message_valid(template text,version integer,locale text,recipient text,payload jsonb)
 returns boolean language plpgsql stable security invoker set search_path='' as $$
declare deadline timestamptz;
begin
 if version is distinct from 1 or locale is distinct from 'en' or recipient is null
 or length(recipient)>254 or recipient !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
 or payload is null or jsonb_typeof(payload)<>'object' then return false;end if;
 if template in('registration_received','registration_approved','registration_waitlisted','registration_expired','registration_cancelled') then
 return payload='{}'::jsonb;end if;
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
 if new.status='cancelled' then template:='registration_cancelled';end if;
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

-- Existing ticket access survives closed/incomplete submission-window settings.
-- Take the allocation lock first, matching cancellation's request->ticket order.
create or replace function public.msrc_registration_ticket(edition_key text,session_claims jsonb,ticket_secret text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
 ticket msrc_registration.tickets%rowtype;credential text;request_status text;
begin
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for share;
 if not coalesce((select s.enabled from msrc_registration.settings s where s.edition_key=edition_key),false)
 or not msrc_participant.ready() then result:=jsonb_build_object('state','closed');
 else
 if not coalesce(msrc_registration.participant_current(edition_key),false) then result:=jsonb_build_object('state','denied');
 else
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

notify pgrst,'reload schema';
commit;
