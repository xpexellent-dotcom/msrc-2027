-- ENG-057 / Night-2 ACD; REG-02/04/06, ADM-01/02/05, DAT-03/04, ROL-07/10/12,
-- PRV-03/05/06, SEC-01/02/06. REVIEW ONLY; no settings or activation.
begin;

do $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
 raise exception using errcode='42501',message='Native migration operator required.';end if;
end$$;

alter table msrc_registration.audit drop constraint audit_event_check;
alter table msrc_registration.audit add constraint audit_event_check check(event in (
 'request.submitted','priority.set','priority.removed','identity.revealed',
 'request.approved','request.waitlisted','request.offered','request.offer_expired','registration.exported',
 'early_access.added','early_access.removed','request.offer_accepted','request.offer_declined','request.cancelled',
 'ticket.issued','ticket.revoked'));
alter table msrc_registration.audit add constraint registration_audit_ticket_check check (
 event not in('ticket.issued','ticket.revoked') or
 (result='allowed' and request_id is not null and target_actor is not null and performer_id is null
 and previous_status is null and new_status is null));
-- Tickets cannot be reissued, so each request has at most one of each event.
create unique index registration_audit_ticket_event on msrc_registration.audit(request_id,event)
 where event in('ticket.issued','ticket.revoked');

create function msrc_registration.ticket_audit_event() returns trigger
 language plpgsql security definer set search_path='' as $$
declare request_row msrc_registration.requests%rowtype;
begin
 select r.* into strict request_row from msrc_registration.requests r where r.id=new.request_id;
 if tg_op='INSERT' then
 insert into msrc_registration.audit(edition_key,target_actor,request_id,event,result,occurred_at)
 values(request_row.edition_key,request_row.actor_id,new.request_id,'ticket.issued','allowed',new.issued_at);
 end if;
 if new.status='revoked' and (tg_op='INSERT' or old.status is distinct from new.status) then
 insert into msrc_registration.audit(edition_key,target_actor,request_id,event,result,occurred_at)
 values(request_row.edition_key,request_row.actor_id,new.request_id,'ticket.revoked','allowed',new.revoked_at);
 end if;
 return new;
end$$;
revoke all on function msrc_registration.ticket_audit_event() from public,anon,authenticated,service_role;
create trigger registration_ticket_audit after insert or update of status on msrc_registration.tickets
 for each row execute function msrc_registration.ticket_audit_event();

-- Reconstruct only facts already retained in existing ticket records. Preserve
-- their exact timestamps; never infer historical request states or a staff actor.
-- This writes audit evidence only: no ticket issuance, request update or outbox.
insert into msrc_registration.audit(edition_key,target_actor,request_id,event,result,occurred_at)
 select r.edition_key,r.actor_id,t.request_id,'ticket.issued','allowed',t.issued_at
 from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
 on conflict(request_id,event) where event in('ticket.issued','ticket.revoked') do nothing;
insert into msrc_registration.audit(edition_key,target_actor,request_id,event,result,occurred_at)
 select r.edition_key,r.actor_id,t.request_id,'ticket.revoked','allowed',t.revoked_at
 from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id
 where t.status='revoked'
 on conflict(request_id,event) where event in('ticket.issued','ticket.revoked') do nothing;

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
 r.offer_expires_at as "offerExpiresAt",r.identity_masked as "identityMasked",t.status as "ticketStatus"
 from msrc_registration.requests r
 join msrc_participant.profiles p on p.actor_id=r.actor_id join auth.users u on u.id=r.actor_id
 left join msrc_registration.tickets t on t.request_id=r.id
 left join msrc_registration.priority_designations d on d.edition_key=r.edition_key and d.actor_id=r.actor_id
 where r.edition_key=edition_key and r.id=request_id) q;
 if request is null then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.at desc,q.id desc),'[]'::jsonb) into history from (
 select a.id,a.event,a.previous_status as "from",a.new_status as "to",a.occurred_at as at,
 case when a.event in('request.submitted','request.offer_accepted','request.offer_declined','request.cancelled') then 'participant'
 when a.performer_id is null then 'automatic' else 'staff' end as "actorKind",
 case when a.event not in('request.submitted','request.offer_accepted','request.offer_declined','request.cancelled')
 and a.performer_id is not null then p.name else null end as "performerName"
 from msrc_registration.audit a left join msrc_staff.profiles p on p.actor_id=a.performer_id
 where a.edition_key=edition_key and a.request_id=request_id and a.result='allowed'
 and a.target_actor=(request->>'actorId')::uuid
 and a.event in('request.submitted','request.approved','request.waitlisted','request.offered','request.offer_expired',
 'request.offer_accepted','request.offer_declined','request.cancelled','ticket.issued','ticket.revoked')) q;
 return jsonb_build_object('state','ready','historyVersion',1,'detail',jsonb_build_object('request',request,'history',history));
end$$;
revoke all on function public.msrc_staff_registration_detail(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_registration_detail(text,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
