-- ENG-054 / ORG-056; REG-02/03/04/06/07, CHK-01, EML-01/03/04/05,
-- ROL-02/07/10/12, SEC-01/02/06, PRV-03/05/06. REVIEW ONLY; no activation/seeds.
begin;
do $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
 raise exception using errcode='42501',message='Native migration operator required.';end if;
end$$;
create extension if not exists pgcrypto with schema extensions;

-- Credential IDs are independent random UUIDs, never participant/request IDs.
-- The recoverable secret is HMAC-derived from an application-only 256-bit key.
-- PostgreSQL receives that key transiently through a service-only RPC, stores
-- only the secret hash, and restores the transaction setting on every exit.
create table msrc_registration.tickets (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique references msrc_registration.requests(id) on delete restrict,
 secret_hash bytea not null check(octet_length(secret_hash)=32),
 status text not null default 'issued' check(status in('issued','revoked')),
 issued_at timestamptz not null default clock_timestamp(),
 revoked_at timestamptz,
 check((status='revoked')=(revoked_at is not null))
);
alter table msrc_registration.tickets enable row level security;
alter table msrc_registration.tickets force row level security;
revoke all on table msrc_registration.tickets from public,anon,authenticated,service_role;
comment on table msrc_registration.tickets is
 'Exactly one ticket per request, therefore per participant and edition. No raw secret, QR token, key, personal data or public lookup. Revocation is permanent; reissue policy and scanner validation remain later work.';

create function msrc_registration.ticket_secret(ticket_id uuid,application_secret text) returns text
 language plpgsql immutable security definer set search_path='' as $$
begin
 if ticket_id is null or application_secret is null or application_secret !~ '^[a-fA-F0-9]{64}$' then
 raise exception using errcode='55000',message='Ticket key unavailable.';end if;
 return encode(extensions.hmac(convert_to('msrc-ticket-v1:'||ticket_id::text,'UTF8'),decode(application_secret,'hex'),'sha256'),'hex');
end$$;

create function msrc_outbox.registration_message_valid(template text,version integer,locale text,recipient text,payload jsonb)
 returns boolean language plpgsql stable security invoker set search_path='' as $$
declare deadline timestamptz;
begin
 if version is distinct from 1 or locale is distinct from 'en' or recipient is null
 or length(recipient)>254 or recipient !~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
 or payload is null or jsonb_typeof(payload)<>'object' then return false;end if;
 if template in('registration_received','registration_approved','registration_waitlisted','registration_expired') then
 return payload='{}'::jsonb;end if;
 if template is distinct from 'registration_offered'
 or payload<>jsonb_build_object('offer_expires_at',payload->'offer_expires_at')
 or jsonb_typeof(payload->'offer_expires_at') is distinct from 'string'
 or coalesce(payload->>'offer_expires_at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?([+]00:00|Z)$' then return false;end if;
 begin deadline:=(payload->>'offer_expires_at')::timestamptz;
 exception when invalid_datetime_format or datetime_field_overflow then return false;end;
 return isfinite(deadline);
end$$;

alter table msrc_outbox.messages drop constraint messages_template_key_check;
alter table msrc_outbox.messages drop constraint messages_recipient_email_check;
alter table msrc_outbox.messages drop constraint messages_payload_check;
alter table msrc_outbox.messages add constraint outbox_template_input_check check (
 (template_key='synthetic_notice' and recipient_email ~ '^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$'
 and jsonb_typeof(payload)='object' and payload=jsonb_build_object('reference',payload->'reference')
 and jsonb_typeof(payload->'reference') is not distinct from 'string'
 and coalesce(payload->>'reference' ~ '^[A-Za-z0-9_-]{1,80}$',false))
 or msrc_outbox.registration_message_valid(template_key,template_version,locale,recipient_email,payload));

create or replace function msrc_outbox.enqueue(p_idempotency_key text,p_template_key text,p_template_version integer,
 p_locale text,p_recipient_email text,p_payload jsonb) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare v_key bytea;v_input bytea;v_identity msrc_outbox.identities%rowtype;v_created boolean;v_status text;synthetic_valid boolean;
begin
 if current_user<>'postgres' then raise exception using errcode='42501',message='Outbox enqueue denied.';end if;
 synthetic_valid:=coalesce(p_template_key='synthetic_notice' and p_template_version=1 and p_locale in('en','ar')
 and p_recipient_email ~ '^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$' and jsonb_typeof(p_payload)='object'
 and p_payload=jsonb_build_object('reference',p_payload->'reference')
 and jsonb_typeof(p_payload->'reference')='string' and p_payload->>'reference' ~ '^[A-Za-z0-9_-]{1,80}$',false);
 if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_./:-]{1,200}$'
 or not(synthetic_valid or msrc_outbox.registration_message_valid(p_template_key,p_template_version,p_locale,p_recipient_email,p_payload)) then
 raise exception using errcode='22023',message='Invalid outbox message.';end if;
 v_key:=sha256(convert_to(p_idempotency_key,'UTF8'));
 v_input:=sha256(convert_to(jsonb_build_array(p_template_key,p_template_version,p_locale,p_recipient_email,p_payload)::text,'UTF8'));
 insert into msrc_outbox.identities(key_hash,input_hash) values(v_key,v_input) on conflict do nothing returning * into v_identity;
 v_created:=found;
 if not v_created then
 select * into strict v_identity from msrc_outbox.identities where key_hash=v_key for update;
 if v_identity.input_hash<>v_input then raise exception using errcode='22023',message='Outbox idempotency conflict.';end if;
 else
 insert into msrc_outbox.messages(id,template_key,template_version,locale,recipient_email,payload,provider_idempotency_key)
 values(v_identity.id,p_template_key,p_template_version,p_locale,p_recipient_email,p_payload,'msrc-outbox/'||v_identity.id::text);
 end if;
 select status into v_status from msrc_outbox.messages where id=v_identity.id;
 return jsonb_build_object('id',v_identity.id,'status',coalesce(v_status,v_identity.terminal_status),'created',v_created);
end$$;

-- Registration templates have exactly one producer: the business transaction.
-- The generic service-only RPC cannot enqueue arbitrary registration messages.
create or replace function public.msrc_outbox_enqueue(p_idempotency_key text,p_template_key text,p_template_version integer,
 p_locale text,p_recipient_email text,p_payload jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
begin
 if p_template_key is distinct from 'synthetic_notice' then
 raise exception using errcode='22023',message='Business outbox producer required.';end if;
 return msrc_outbox.enqueue(p_idempotency_key,p_template_key,p_template_version,p_locale,p_recipient_email,p_payload);
end$$;

create function msrc_registration.ticket_and_email_event() returns trigger
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
create trigger registration_ticket_and_email after insert or update of status on msrc_registration.requests
 for each row execute function msrc_registration.ticket_and_email_event();

create function public.msrc_staff_registration_approve_tickets(edition_key text,session_claims jsonb,request_ids uuid[],ticket_secret text)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);
 previous_key text:=current_setting('msrc_registration.ticket_key',true);result jsonb;
begin
 perform msrc_registration.server_only();
 if ticket_secret is null or ticket_secret !~ '^[a-fA-F0-9]{64}$' then return jsonb_build_object('state','area_not_ready');end if;
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform set_config('msrc_registration.ticket_key',ticket_secret,true);
 result:=public.msrc_staff_registration_approve(edition_key,request_ids);
 exception when others then
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 perform set_config('msrc_registration.ticket_key',coalesce(previous_key,''),true);raise;
 end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
 perform set_config('msrc_registration.ticket_key',coalesce(previous_key,''),true);
 return result;
end$$;

create function public.msrc_registration_ticket(edition_key text,session_claims jsonb,ticket_secret text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;profile jsonb;
 ticket msrc_registration.tickets%rowtype;credential text;request_status text;
begin
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if not coalesce((select s.enabled from msrc_registration.settings s where s.edition_key=edition_key),false)
 or not msrc_participant.ready() or not msrc_registration.settings_complete(edition_key) then result:=jsonb_build_object('state','closed');
 else
 profile:=msrc_participant.observe_profile(edition_key);
 if profile is null or not msrc_participant.age_proven(auth.uid()) then result:=jsonb_build_object('state','denied');
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

revoke all on function msrc_registration.ticket_secret(uuid,text),msrc_registration.ticket_and_email_event()
 from public,anon,authenticated,service_role;
revoke all on function msrc_outbox.registration_message_valid(text,integer,text,text,jsonb)
 from public,anon,authenticated,service_role;
revoke all on function public.msrc_registration_ticket(text,jsonb,text),
 public.msrc_staff_registration_approve_tickets(text,jsonb,uuid[],text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_registration_ticket(text,jsonb,text),
 public.msrc_staff_registration_approve_tickets(text,jsonb,uuid[],text) to service_role;

-- Staff projections below expose status only; never a ticket ID or secret/hash.
create or replace function msrc_registration.staff_queue(edition text,search text,status_filter text) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;expiry jsonb;
begin
 expiry:=public.msrc_staff_registration_expire_offers(edition);
 if expiry->>'state'<>'updated' then return null;end if;
 select jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(q) order by q."createdAt" desc,q.id) from (
 select r.id,r.actor_id as "actorId",p.name,u.email,r.status,
 coalesce(d.active,false) as priority,r.created_at as "createdAt",r.decided_at as "decidedAt",
 r.offer_expires_at as "offerExpiresAt",r.identity_masked as "identityMasked",t.status as "ticketStatus"
 from msrc_registration.requests r
 join msrc_participant.profiles p on p.actor_id=r.actor_id
 join auth.users u on u.id=r.actor_id
 left join msrc_registration.tickets t on t.request_id=r.id
 left join msrc_registration.priority_designations d on d.edition_key=r.edition_key and d.actor_id=r.actor_id
 where r.edition_key=edition and (status_filter='all' or r.status=status_filter)
 and (search='' or strpos(lower(p.name),lower(search))>0 or strpos(lower(u.email),lower(search))>0)
 order by r.created_at desc,r.id limit 50) q),'[]'::jsonb),
 'counts',msrc_registration.staff_counts(edition)) into result;
 return result;
end$$;

create or replace function public.msrc_staff_registration_detail(edition_key text,request_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare request jsonb;history jsonb;expiry jsonb;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if request_id is null or msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 expiry:=public.msrc_staff_registration_expire_offers(edition_key);
 if expiry->>'state'<>'updated' then return jsonb_build_object('state','denied');end if;
 select to_jsonb(q) into request from (
 select r.id,r.actor_id as "actorId",p.name,u.email,r.status,
 coalesce(d.active,false) as priority,r.created_at as "createdAt",r.decided_at as "decidedAt",
 r.offer_expires_at as "offerExpiresAt",r.identity_masked as "identityMasked",t.status as "ticketStatus"
 from msrc_registration.requests r
 join msrc_participant.profiles p on p.actor_id=r.actor_id join auth.users u on u.id=r.actor_id
 left join msrc_registration.tickets t on t.request_id=r.id
 left join msrc_registration.priority_designations d on d.edition_key=r.edition_key and d.actor_id=r.actor_id
 where r.edition_key=edition_key and r.id=request_id) q;
 if request is null then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.at desc,q.id desc),'[]'::jsonb) into history from (
 select a.id,a.previous_status as "from",a.new_status as "to",a.occurred_at as at,p.name as "performerName"
 from msrc_registration.audit a left join msrc_staff.profiles p on p.actor_id=a.performer_id
 where a.edition_key=edition_key and a.request_id=request_id
 and a.event in ('request.approved','request.waitlisted','request.offered','request.offer_expired')) q;
 return jsonb_build_object('state','ready','detail',jsonb_build_object('request',request,'history',history));
end$$;

create or replace function public.msrc_staff_registration_approve(edition_key text,request_ids uuid[]) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare settings_row msrc_registration.settings%rowtype;request_row msrc_registration.requests%rowtype;
 held bigint;approved_count integer:=0;target_status text;decision_time timestamptz;expiry jsonb;
begin
 -- Role/status/recovery changes take the exclusive side of this authority lock.
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null
 or request_ids is null or cardinality(request_ids) not between 1 and 100 or array_ndims(request_ids)<>1
 or exists(select 1 from unnest(request_ids) id where id is null)
 or cardinality(request_ids)<>(select count(distinct id) from unnest(request_ids) id) then
 return jsonb_build_object('state','denied');end if;

 -- All staff allocation decisions serialize on the edition BEFORE counting seats.
 -- At the Data API's READ COMMITTED isolation, the following count sees the last
 -- allocator's committed result. Higher isolation is refused rather than allowing
 -- an earlier snapshot to miss a concurrent allocation after this row-lock wait.
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 select s.* into settings_row from msrc_registration.settings s where s.edition_key=edition_key for update;
 -- Session deadlines are rechecked after a potentially long lock wait.
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator']) is null then
 return jsonb_build_object('state','denied');end if;
 if settings_row.general_capacity is null then return jsonb_build_object('state','capacity_not_set');end if;
 if settings_row.payment_required is null
 or (settings_row.payment_required and settings_row.payment_window_hours is null) then
 return jsonb_build_object('state','payment_configuration_required');end if;

 -- Stale authenticated callers cannot approve a ticket without the service boundary.
 if coalesce(current_setting('msrc_registration.ticket_key',true),'') !~ '^[a-fA-F0-9]{64}$' then
 return jsonb_build_object('state','area_not_ready');end if;
 expiry:=public.msrc_staff_registration_expire_offers(edition_key);
 if expiry->>'state'<>'updated' then return jsonb_build_object('state','denied');end if;
 target_status:=case when settings_row.payment_required then 'approved_awaiting_payment' else 'approved' end;
 select count(*) into held from msrc_registration.requests r where r.edition_key=edition_key
 and r.status in ('approved','approved_awaiting_payment','offered','confirmed');
 for request_row in select r.* from msrc_registration.requests r
 where r.edition_key=edition_key and r.id=any(request_ids)
 order by r.created_at,r.id for update loop
 if request_row.status in ('pending_approval','waitlisted') and held<settings_row.general_capacity then
 decision_time:=clock_timestamp();
 update msrc_registration.requests r set status=target_status,decided_at=decision_time,updated_at=decision_time,
 payment_due_at=case when settings_row.payment_required then decision_time+make_interval(hours=>settings_row.payment_window_hours) else null end
 where r.id=request_row.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition_key,auth.uid(),request_row.actor_id,request_row.id,'request.approved','allowed',request_row.status,target_status);
 approved_count:=approved_count+1;held:=held+1;
 end if;
 end loop;
 -- Invalid-edition IDs, already-decided requests and capacity overflow are skipped.
 -- Overflow is NOT implicitly waitlisted and repeated approval is a complete no-op.
 return jsonb_build_object('state','updated','decided',jsonb_build_object('approved',approved_count,
 'waitlisted',0,'skipped',cardinality(request_ids)-approved_count),
 'registration',msrc_registration.staff_queue(edition_key,'','all'));
end$$;

comment on function msrc_outbox.enqueue(text,text,integer,text,text,jsonb) is
 'Private same-transaction producer. Registration v1 templates are DRAFT pending owner wording approval; real participant recipients are stored without enabling delivery. Existing delivery switches and zero daily cap remain untouched.';
notify pgrst,'reload schema';
commit;
