-- ENG-050; REG-02/04/05, ADM-01/02/05, ROL-07/10/12, PRV-03/05/06.
-- Review only. No settings seeds, participant opening, email producer or scheduler.
begin;

alter table msrc_registration.settings add column offer_window_hours integer check(offer_window_hours>0);
comment on column msrc_registration.settings.offer_window_hours is
 'Unapproved staff-offer duration. NULL with no default refuses offers; the legacy waitlist_offer_hours is not a fallback.';
alter table msrc_registration.requests add column offer_expires_at timestamptz check(offer_expires_at is null or isfinite(offer_expires_at));
comment on column msrc_registration.requests.offer_expires_at is
 'Database-time deadline for new timed offers. Legacy offered rows without a deadline conservatively retain their seat.';
comment on column msrc_registration.requests.decided_at is
 'Time of the latest staff approval, waitlist, offer or explicit expiry transition; idempotent repeats leave it unchanged.';
create index registration_requests_offer_expiry on msrc_registration.requests(edition_key,offer_expires_at,id)
 where status='offered' and offer_expires_at is not null;

alter table msrc_registration.audit add column row_count bigint;
alter table msrc_registration.audit drop constraint audit_event_check;
alter table msrc_registration.audit add constraint audit_event_check check(event in (
 'request.submitted','priority.set','priority.removed','identity.revealed',
 'request.approved','request.waitlisted','request.offered','request.offer_expired','registration.exported'));
alter table msrc_registration.audit drop constraint registration_audit_transition_check;
alter table msrc_registration.audit add constraint registration_audit_transition_check check (
 (event='request.approved' and result='allowed' and previous_status in ('pending_approval','waitlisted')
  and new_status in ('approved','approved_awaiting_payment') and request_id is not null
  and previous_status is not null and new_status is not null)
 or (event='request.waitlisted' and result='allowed' and previous_status='pending_approval'
  and new_status='waitlisted' and request_id is not null and previous_status is not null and new_status is not null)
 or (event='request.offered' and result='allowed' and previous_status='waitlisted'
  and new_status='offered' and request_id is not null and previous_status is not null and new_status is not null)
 or (event='request.offer_expired' and result='allowed' and previous_status='offered'
  and new_status='expired' and request_id is not null and previous_status is not null and new_status is not null)
 or (event not in ('request.approved','request.waitlisted','request.offered','request.offer_expired')
  and previous_status is null and new_status is null));
alter table msrc_registration.audit add constraint registration_audit_export_check check (
 (event='registration.exported' and result='allowed' and row_count is not null and row_count>=0
  and request_id is null and target_actor is null and performer_id is not null)
 or (event<>'registration.exported' and row_count is null));

-- Explicit, idempotent expiry is part of a staff read/allocation transaction.
-- It releases only elapsed, recorded offers. The performer is NULL: expiry is automatic,
-- not a decision by whichever staff member's read happened to trigger it.
-- Staff select the next request; this
-- does not automatically offer a replacement or implement participant acceptance.
create function public.msrc_staff_registration_expire_offers(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare request_row msrc_registration.requests%rowtype;expiry_time timestamptz;expired_count integer:=0;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for update;
 -- Passive reads must not extend session activity; they still recheck deadlines
 -- and authority after any settings-row wait before mutating or projecting data.
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 expiry_time:=clock_timestamp();
 for request_row in select r.* from msrc_registration.requests r
 where r.edition_key=edition_key and r.status='offered' and r.offer_expires_at<=expiry_time
 order by r.created_at,r.id for update loop
 update msrc_registration.requests r set status='expired',decided_at=expiry_time,updated_at=expiry_time
 where r.id=request_row.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition_key,null,request_row.actor_id,request_row.id,'request.offer_expired','allowed','offered','expired');
 expired_count:=expired_count+1;
 end loop;
 return jsonb_build_object('state','updated','expired',expired_count);
end$$;

-- Pure internal projection: callers expire offers in a prior PL/pgSQL statement
-- under the edition lock, so this query sees those committed-in-transaction writes.
-- approved retains ENG-049's aggregate meaning: all four seat-holding states.
create or replace function msrc_registration.staff_counts(edition text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('pending',totals.pending,'approved',totals.held,
 'waitlisted',totals.waitlisted,'offered',totals.offered,'expired',totals.expired,'capacity',s.general_capacity,
 'remaining',case when s.general_capacity is null then null else greatest(s.general_capacity-totals.held,0) end)
 from (select count(*) filter(where r.status='pending_approval') as pending,
 count(*) filter(where r.status in ('approved','approved_awaiting_payment','offered','confirmed')) as held,
 count(*) filter(where r.status='waitlisted') as waitlisted,
 count(*) filter(where r.status='offered') as offered,count(*) filter(where r.status='expired') as expired
 from msrc_registration.requests r where r.edition_key=edition) totals
 left join msrc_registration.settings s on s.edition_key=edition;
$$;

create or replace function msrc_registration.staff_queue(edition text,search text,status_filter text) returns jsonb
 language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;expiry jsonb;
begin
 expiry:=public.msrc_staff_registration_expire_offers(edition);
 if expiry->>'state'<>'updated' then return null;end if;
 select jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(q) order by q."createdAt" desc,q.id) from (
 select r.id,r.actor_id as "actorId",p.name,u.email,r.status,
 coalesce(d.active,false) as priority,r.created_at as "createdAt",r.decided_at as "decidedAt",
 r.offer_expires_at as "offerExpiresAt",r.identity_masked as "identityMasked"
 from msrc_registration.requests r
 join msrc_participant.profiles p on p.actor_id=r.actor_id
 join auth.users u on u.id=r.actor_id
 left join msrc_registration.priority_designations d on d.edition_key=r.edition_key and d.actor_id=r.actor_id
 where r.edition_key=edition and (status_filter='all' or r.status=status_filter)
 and (search='' or strpos(lower(p.name),lower(search))>0 or strpos(lower(u.email),lower(search))>0)
 order by r.created_at desc,r.id limit 50) q),'[]'::jsonb),
 'counts',msrc_registration.staff_counts(edition)) into result;
 return result;
end$$;

create or replace function public.msrc_staff_registration(edition_key text,search text default '',status_filter text default 'all') returns jsonb
 language plpgsql security definer set search_path='' as $$
declare registration jsonb;
begin
 -- authorize() locks account/session rows; take authority first, as mutations do.
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null
 or search is null or char_length(search)>200 or status_filter is null
 or status_filter not in ('all','pending_approval','approved','approved_awaiting_payment','waitlisted','offered','confirmed','cancelled','expired') then
 return jsonb_build_object('state','denied');end if;
 registration:=msrc_registration.staff_queue(edition_key,search,status_filter);
 if registration is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready','registration',registration);
end$$;

create function public.msrc_staff_registration_detail(edition_key text,request_id uuid) returns jsonb
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
 r.offer_expires_at as "offerExpiresAt",r.identity_masked as "identityMasked"
 from msrc_registration.requests r
 join msrc_participant.profiles p on p.actor_id=r.actor_id join auth.users u on u.id=r.actor_id
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

create function public.msrc_staff_registration_offer(edition_key text,request_ids uuid[]) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare settings_row msrc_registration.settings%rowtype;request_row msrc_registration.requests%rowtype;
 held bigint;offered_count integer:=0;decision_time timestamptz;expiry jsonb;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null
 or request_ids is null or cardinality(request_ids) not between 1 and 100 or array_ndims(request_ids)<>1
 or exists(select 1 from unnest(request_ids) id where id is null)
 or cardinality(request_ids)<>(select count(distinct id) from unnest(request_ids) id) then
 return jsonb_build_object('state','denied');end if;
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 select s.* into settings_row from msrc_registration.settings s where s.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator']) is null then
 return jsonb_build_object('state','denied');end if;
 -- Do not infer duration from the older, unrelated completeness placeholder.
 if settings_row.offer_window_hours is null then return jsonb_build_object('state','offer_window_not_set');end if;
 if settings_row.general_capacity is null then return jsonb_build_object('state','capacity_not_set');end if;
 expiry:=public.msrc_staff_registration_expire_offers(edition_key);
 if expiry->>'state'<>'updated' then return jsonb_build_object('state','denied');end if;
 select count(*) into held from msrc_registration.requests r where r.edition_key=edition_key
 and r.status in ('approved','approved_awaiting_payment','offered','confirmed');
 for request_row in select r.* from msrc_registration.requests r
 where r.edition_key=edition_key and r.id=any(request_ids)
 order by r.created_at,r.id for update loop
 if request_row.status='waitlisted' and held<settings_row.general_capacity then
 decision_time:=clock_timestamp();
 update msrc_registration.requests r set status='offered',decided_at=decision_time,updated_at=decision_time,
 offer_expires_at=decision_time+make_interval(hours=>settings_row.offer_window_hours) where r.id=request_row.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition_key,auth.uid(),request_row.actor_id,request_row.id,'request.offered','allowed','waitlisted','offered');
 offered_count:=offered_count+1;held:=held+1;
 end if;
 end loop;
 return jsonb_build_object('state','updated','decided',jsonb_build_object('approved',0,'waitlisted',0,
 'offered',offered_count,'skipped',cardinality(request_ids)-offered_count),
 'registration',msrc_registration.staff_queue(edition_key,'','all'));
end$$;

create function public.msrc_staff_registration_export(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare rows jsonb;expiry jsonb;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then
 return jsonb_build_object('state','denied');end if;
 expiry:=public.msrc_staff_registration_expire_offers(edition_key);
 -- Export requires the Super Admin's existing exact-session TOTP assurance again
 -- after the shared allocation lock wait. No decryption RPC is called here.
 if expiry->>'state'<>'updated' or msrc_staff.authorize(edition_key,array['superAdmin'],false) is null
 or not exists(select 1 from msrc_registration.settings s where s.edition_key=edition_key) then
 return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q."createdAt" desc,q.name,q.email),'[]'::jsonb) into rows from (
 select p.name,u.email,r.status,coalesce(d.active,false) as priority,
 r.created_at as "createdAt",r.decided_at as "decidedAt",r.identity_masked as "identityMasked"
 from msrc_registration.requests r join msrc_participant.profiles p on p.actor_id=r.actor_id
 join auth.users u on u.id=r.actor_id
 left join msrc_registration.priority_designations d on d.edition_key=r.edition_key and d.actor_id=r.actor_id
 where r.edition_key=edition_key) q;
 insert into msrc_registration.audit(edition_key,performer_id,event,result,row_count)
 values(edition_key,auth.uid(),'registration.exported','allowed',jsonb_array_length(rows));
 return jsonb_build_object('state','ready','rows',rows);
end$$;

-- Approval must see released timed holds before allocating another seat.
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

-- Summary expiry is a prior statement so the subsequent counts see its writes.
create or replace function public.msrc_staff_summary(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare summary jsonb:='{}'::jsonb;total bigint;audit_total bigint;expiry jsonb;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,null,false) is null then return jsonb_build_object('state','denied');end if;
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is not null then
 expiry:=public.msrc_staff_registration_expire_offers(edition_key);
 if expiry->>'state'<>'updated' then return jsonb_build_object('state','denied');end if;
 select count(*) into total from msrc_participant.profiles p join auth.users u on u.id=p.actor_id
 join msrc_authorization.account_access a on a.actor_id=p.actor_id where u.deleted_at is null;
 summary:=summary||jsonb_build_object('registration',msrc_registration.staff_counts(edition_key),'participants',total);
 end if;
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is not null then
 select count(*) into total from msrc_staff.profiles p join auth.users u on u.id=p.actor_id
 join msrc_authorization.account_access a on a.actor_id=p.actor_id
 where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=p.actor_id
 and g.edition_key=edition_key and g.role_name<>'participant');
 summary:=summary||jsonb_build_object('staff',total);
 select count(*) into total from msrc_registration.priority_designations d where d.edition_key=edition_key and d.active;
 summary:=summary||jsonb_build_object('priority',total);
 -- Match the existing audit area's edition/global-event visibility, including the
 -- new registration source. Count all events, not only the area's latest 50 rows.
 select count(*) into audit_total from (
 select s.id from msrc_staff.audit s where s.occurred_at>clock_timestamp()-interval '24 hours' and
 (s.edition_key=edition_key or (s.edition_key is null and exists(select 1 from msrc_authorization.role_grants g
 where g.actor_id=coalesce(s.actor_id,s.target_id) and g.edition_key=edition_key)))
 union all select g.id from msrc_authorization.grant_audit g where g.edition_key=edition_key and g.occurred_at>clock_timestamp()-interval '24 hours'
 union all select s.id from msrc_sessions.security_audit s where s.occurred_at>clock_timestamp()-interval '24 hours'
 and exists(select 1 from msrc_authorization.role_grants g where g.actor_id=s.actor_id and g.edition_key=edition_key)
 union all select e.id from msrc_staff_email.audit e where e.occurred_at>clock_timestamp()-interval '24 hours'
 and exists(select 1 from msrc_authorization.role_grants g where g.actor_id=e.actor_id and g.edition_key=edition_key)
 union all select r.id from msrc_registration.audit r where r.edition_key=edition_key and r.occurred_at>clock_timestamp()-interval '24 hours'
 ) events;
 summary:=summary||jsonb_build_object('auditLast24h',audit_total);
 end if;
 return jsonb_build_object('state','ready','summary',summary);
end$$;

-- Include the minimal export row count in the existing Super Admin audit area.
create or replace function public.msrc_staff_audit(edition_key text,search text default '') returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare rows jsonb;
begin
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then
 perform msrc_staff.record(edition_key,'audit_read',null,'denied');return null;end if;
 if search is null or char_length(search)>200 then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into rows from (
 select a.id,a.actor_id as "actorId",a.target_id as "targetId",a.action,a.result,a.occurred_at as "occurredAt",
 p.name as "actorName",coalesce(t.name,participant.name) as "targetName",a.details from (
 select s.id,s.actor_id,s.target_id,s.action,s.result,s.occurred_at,s.details from msrc_staff.audit s where s.edition_key=edition_key
 or (s.edition_key is null and exists(select 1 from msrc_authorization.role_grants g where g.actor_id=coalesce(s.actor_id,s.target_id) and g.edition_key=edition_key))
 union all select g.id,null::uuid,g.actor_id,g.event,'completed',g.occurred_at,
 jsonb_build_object('role',g.role_name,'scope',g.scope_kind,'source','grant') from msrc_authorization.grant_audit g where g.edition_key=edition_key
 union all select s.id,s.performed_by_actor_id,s.actor_id,s.event,'completed',s.occurred_at,
 jsonb_build_object('cause',s.cause,'source','session') from msrc_sessions.security_audit s where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=s.actor_id and g.edition_key=edition_key)
 union all select e.id,e.actor_id,e.actor_id,e.event,case when e.event in ('challenge.failed','challenge.denied','challenge.expired','challenge.locked') then 'denied' else 'completed' end,e.occurred_at,
 jsonb_build_object('source','staff_email') from msrc_staff_email.audit e where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=e.actor_id and g.edition_key=edition_key)
 union all select r.id,r.performer_id,r.target_actor,r.event,r.result,r.occurred_at,
 jsonb_build_object('source','registration','requestId',r.request_id,'previousStatus',r.previous_status,'newStatus',r.new_status,
 'previousActive',r.previous_active,'newActive',r.new_active,'reason',r.reason)
 ||case when r.event='registration.exported' then jsonb_build_object('rowCount',r.row_count) else '{}'::jsonb end
 from msrc_registration.audit r where r.edition_key=edition_key
 ) a left join msrc_staff.profiles p on p.actor_id=a.actor_id left join msrc_staff.profiles t on t.actor_id=a.target_id
 left join msrc_participant.profiles participant on participant.actor_id=a.target_id
 where search='' or strpos(lower(a.action||' '||a.result||' '||coalesce(p.name,'')||' '||coalesce(t.name,participant.name,'')),lower(search))>0
 order by a.occurred_at desc,a.id limit 50) q;
 perform msrc_staff.record(edition_key,'audit_read',null,'allowed');return jsonb_build_object('rows',rows);
end$$;

-- No direct-table or private-helper grants. The new RPCs reuse native authenticated
-- staff sessions; service-role credentials cannot bypass their staff authorization.
revoke all on function msrc_registration.staff_counts(text),msrc_registration.staff_queue(text,text,text)
 from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_registration_expire_offers(text),
 public.msrc_staff_registration_detail(text,uuid),public.msrc_staff_registration_offer(text,uuid[]),
 public.msrc_staff_registration_export(text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_registration_expire_offers(text),
 public.msrc_staff_registration_detail(text,uuid),public.msrc_staff_registration_offer(text,uuid[]),
 public.msrc_staff_registration_export(text) to authenticated;
notify pgrst,'reload schema';
commit;
