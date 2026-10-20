-- ORG-056 / ENG-051; REG-01/02/04/05, ADM-01/02/05, ROL-10/12, PRV-03/05/06.
-- Review only. No settings seeds, participant opening, notification or scheduler.
begin;

create function msrc_registration.early_access_email_valid(value text) returns boolean
 language sql immutable security definer set search_path='' as $$
 select coalesce(char_length(value) between 3 and 254
 and value ~ '^[^[:space:]@<>]+@[^[:space:]@<>]+[.][^[:space:]@<>]+$'
 and value !~ '[[:cntrl:]]',false);
$$;

create table msrc_registration.early_access_entries (
 id uuid primary key default gen_random_uuid(),
 edition_key text not null references msrc_registration.settings(edition_key) on delete restrict,
 email text not null check(email=lower(btrim(email)) and msrc_registration.early_access_email_valid(email)),
 added_by uuid not null references msrc_staff.profiles(actor_id) on delete restrict,
 added_at timestamptz not null default clock_timestamp(),
 active boolean not null default true,
 removed_by uuid references msrc_staff.profiles(actor_id) on delete restrict,
 removed_at timestamptz,
 unique(edition_key,email),
 check((active and removed_at is null and removed_by is null)
 or (not active and removed_at is not null and removed_by is not null))
);
create index registration_early_access_active on msrc_registration.early_access_entries(edition_key,added_at desc,id)
 where active;
create index registration_early_access_adder on msrc_registration.early_access_entries(added_by);
create index registration_early_access_remover on msrc_registration.early_access_entries(removed_by);
alter table msrc_registration.early_access_entries enable row level security;
alter table msrc_registration.early_access_entries force row level security;
revoke all on table msrc_registration.early_access_entries from public,anon,authenticated,service_role;
comment on table msrc_registration.early_access_entries is
 'Private Super Admin email list, including people without accounts. Only verified native participant email matches confer request-window access. No workshop priority or public directory.';

alter table msrc_registration.audit add column early_access_entry_id uuid;
comment on column msrc_registration.audit.early_access_entry_id is
 'Opaque list row ID only; deliberately no email, email hash or participant reference in early-access audit evidence.';
alter table msrc_registration.audit drop constraint audit_event_check;
alter table msrc_registration.audit add constraint audit_event_check check(event in (
 'request.submitted','priority.set','priority.removed','identity.revealed',
 'request.approved','request.waitlisted','request.offered','request.offer_expired','registration.exported',
 'early_access.added','early_access.removed'));
alter table msrc_registration.audit add constraint registration_audit_early_access_check check (
 (event in ('early_access.added','early_access.removed') and result='allowed'
 and early_access_entry_id is not null and performer_id is not null and target_actor is null and request_id is null
 and reason is null and previous_active is not null and new_active is not null
 and ((event='early_access.added' and previous_active=false and new_active=true)
 or (event='early_access.removed' and previous_active=true and new_active=false)))
 or (event not in ('early_access.added','early_access.removed') and early_access_entry_id is null));

create function msrc_registration.early_access_active(edition text,target_actor uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u
 join msrc_participant.profiles p on p.actor_id=u.id
 join msrc_registration.early_access_entries e on e.edition_key=edition and e.email=lower(btrim(u.email)) and e.active
 where u.id=target_actor and u.email_confirmed_at is not null and u.deleted_at is null);
$$;
comment on function msrc_registration.early_access_active(text,uuid) is
 'Private request-window eligibility only. Native verified email is authoritative; no metadata, client claim or workshop priority is accepted.';

create function public.msrc_staff_early_access(edition_key text,search text default '') returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare entries jsonb;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null
 or search is null or char_length(search)>200
 or not exists(select 1 from msrc_registration.settings s where s.edition_key=edition_key) then
 return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q."addedAt" desc,q.id),'[]'::jsonb) into entries from (
 select e.id,e.email,e.added_at as "addedAt",staff.name as "addedByName",
 exists(select 1 from auth.users u join msrc_participant.profiles p on p.actor_id=u.id
 where lower(btrim(u.email))=e.email and u.email_confirmed_at is not null and u.deleted_at is null) as "hasAccount",
 exists(select 1 from auth.users u join msrc_participant.profiles p on p.actor_id=u.id
 join msrc_registration.requests r on r.actor_id=u.id and r.edition_key=e.edition_key
 where lower(btrim(u.email))=e.email and u.email_confirmed_at is not null and u.deleted_at is null) as "hasRequest"
 from msrc_registration.early_access_entries e left join msrc_staff.profiles staff on staff.actor_id=e.added_by
 where e.edition_key=edition_key and e.active and (search='' or strpos(e.email,lower(btrim(search)))>0)
 order by e.added_at desc,e.id limit 200) q;
 return jsonb_build_object('state','ready','earlyAccess',jsonb_build_object('entries',entries));
end$$;

create function public.msrc_staff_early_access_add(edition_key text,emails text[]) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare raw_email text;normalized_email text;entry msrc_registration.early_access_entries%rowtype;
 added_count integer:=0;invalid_emails text[]:=array[]::text[];changed_at timestamptz;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null
 or emails is null or cardinality(emails) not between 1 and 500 or array_ndims(emails)<>1
 or exists(select 1 from unnest(emails) value where value is null) then
 return jsonb_build_object('state','denied');end if;
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Early access maintenance requires READ COMMITTED isolation.';end if;
 -- Participant submit takes FOR SHARE on this same row before its final context.
 -- A committed removal or add is therefore seen after any submit lock wait.
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for update;
 if not found then return jsonb_build_object('state','denied');end if;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then
 return jsonb_build_object('state','denied');end if;
 foreach raw_email in array emails loop
 normalized_email:=lower(btrim(raw_email));
 if not msrc_registration.early_access_email_valid(normalized_email) then
 invalid_emails:=array_append(invalid_emails,raw_email);continue;
 end if;
 select e.* into entry from msrc_registration.early_access_entries e
 where e.edition_key=edition_key and e.email=normalized_email for update;
 if entry.id is not null and entry.active then continue;end if;
 changed_at:=clock_timestamp();
 if entry.id is null then
 insert into msrc_registration.early_access_entries(edition_key,email,added_by,added_at)
 values(edition_key,normalized_email,auth.uid(),changed_at) returning * into entry;
 else
 update msrc_registration.early_access_entries e set active=true,added_by=auth.uid(),added_at=changed_at,
 removed_by=null,removed_at=null where e.id=entry.id;
 end if;
 insert into msrc_registration.audit(edition_key,performer_id,early_access_entry_id,event,result,previous_active,new_active)
 values(edition_key,auth.uid(),entry.id,'early_access.added','allowed',false,true);
 added_count:=added_count+1;
 end loop;
 return jsonb_build_object('state','updated','added',added_count,'invalid',to_jsonb(invalid_emails));
end$$;

create function public.msrc_staff_early_access_remove(edition_key text,entry_ids uuid[]) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare entry msrc_registration.early_access_entries%rowtype;removed_count integer:=0;changed_at timestamptz;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null
 or entry_ids is null or cardinality(entry_ids) not between 1 and 500 or array_ndims(entry_ids)<>1
 or exists(select 1 from unnest(entry_ids) id where id is null) then
 return jsonb_build_object('state','denied');end if;
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Early access maintenance requires READ COMMITTED isolation.';end if;
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for update;
 if not found then return jsonb_build_object('state','denied');end if;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then
 return jsonb_build_object('state','denied');end if;
 for entry in select e.* from msrc_registration.early_access_entries e
 where e.edition_key=edition_key and e.id=any(entry_ids) and e.active order by e.id for update loop
 changed_at:=clock_timestamp();
 update msrc_registration.early_access_entries e set active=false,removed_by=auth.uid(),removed_at=changed_at where e.id=entry.id;
 insert into msrc_registration.audit(edition_key,performer_id,early_access_entry_id,event,result,previous_active,new_active)
 values(edition_key,auth.uid(),entry.id,'early_access.removed','allowed',true,false);
 removed_count:=removed_count+1;
 end loop;
 return jsonb_build_object('state','updated','removed',removed_count);
end$$;

create or replace function msrc_registration.context(edition text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare s msrc_registration.settings%rowtype;profile jsonb;eligible boolean:=false;window_open boolean:=false;
 request jsonb;instant timestamptz;enabled boolean:=false;complete boolean;accounts_ready boolean;
begin
 select * into s from msrc_registration.settings where edition_key=edition;
 enabled:=coalesce(s.enabled,false);complete:=msrc_registration.settings_complete(edition);accounts_ready:=msrc_participant.ready();
 if enabled and complete and accounts_ready then
 profile:=msrc_participant.observe_profile(edition);
 eligible:=profile is not null and msrc_participant.age_proven(auth.uid());
 if eligible then
 -- Observe current database time after any participant/session lock wait.
 instant:=clock_timestamp();
 window_open:=instant>=s.general_opening_at and instant<s.closing_at;
 if instant>=s.priority_start_at and instant<s.priority_end_at then
 window_open:=msrc_registration.priority_active(edition,auth.uid())
 or msrc_registration.early_access_active(edition,auth.uid());
 end if;
 select jsonb_build_object('id',r.id,'status',r.status,'createdAt',r.created_at) into request
 from msrc_registration.requests r where r.edition_key=edition and r.actor_id=auth.uid();
 end if;
 end if;
 return jsonb_build_object('enabled',enabled,'participantAccountsReady',accounts_ready,'settingsComplete',complete,
 'eligible',eligible,'windowOpen',window_open,'state',case when not(enabled and complete and accounts_ready) then 'closed'
 when not eligible then 'denied' when not window_open then 'closed' else 'open' end,'termsVersion',s.terms_version,'request',request);
end$$;

-- Preserve the existing service-only boundary and claims restoration. Recheck the
-- new email eligibility inside submit, after the lock shared with list maintenance.
create or replace function public.msrc_registration_submit(edition_key text,session_claims jsonb,document_type text,
 identity_envelope jsonb,identity_hash text,identity_masked text,key_version text,terms_version text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);context jsonb;r msrc_registration.requests%rowtype;result jsonb;
begin
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration submission requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 perform pg_advisory_xact_lock(hashtextextended('registration:'||edition_key||':'||auth.uid()::text,0));
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for share;
 context:=msrc_registration.context(edition_key);
 if context->>'state'<>'open' then result:=jsonb_build_object('state',context->>'state');
 elsif context->'request'<>'null'::jsonb then result:=jsonb_build_object('state','submitted','request',context->'request');
 elsif terms_version is null or terms_version is distinct from context->>'termsVersion' or document_type is null or identity_envelope is null
 or identity_hash is null or identity_masked is null or key_version is null then result:=jsonb_build_object('state','denied');
 else
 begin
 insert into msrc_registration.requests(edition_key,actor_id,terms_version,document_type,identity_envelope,identity_hash,identity_masked,key_version)
 values(edition_key,auth.uid(),terms_version,document_type,identity_envelope,identity_hash,identity_masked,key_version) returning * into r;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result)
 values(edition_key,auth.uid(),auth.uid(),r.id,'request.submitted','allowed');
 result:=jsonb_build_object('state','submitted','request',jsonb_build_object('id',r.id,'status',r.status,'createdAt',r.created_at));
 exception when unique_violation then result:=jsonb_build_object('state','conflict');
 when check_violation then result:=jsonb_build_object('state','denied');end;
 end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

comment on column msrc_registration.settings.offer_window_hours is
 'ORG-056 approves 24 hours, entered by the owner. No default or migration seed. NULL refuses staff offers and automatic replacement; legacy waitlist_offer_hours is not a fallback.';

create or replace function public.msrc_staff_registration_expire_offers(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare settings_row msrc_registration.settings%rowtype;request_row msrc_registration.requests%rowtype;
 expiry_time timestamptz;offer_time timestamptz;expired_count integer:=0;offered_count integer:=0;held bigint;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration allocation requires READ COMMITTED isolation.';end if;
 select s.* into settings_row from msrc_registration.settings s where s.edition_key=edition_key for update;
 -- Passive reads never extend activity; authority/deadlines are rechecked after waiting.
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 return jsonb_build_object('state','denied');end if;
 expiry_time:=clock_timestamp();
 for request_row in select r.* from msrc_registration.requests r
 where r.edition_key=edition_key and r.status='offered' and r.offer_expires_at<=expiry_time
 order by r.created_at,r.id for update loop
 update msrc_registration.requests r set status='expired',decided_at=expiry_time,updated_at=expiry_time where r.id=request_row.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition_key,null::uuid,request_row.actor_id,request_row.id,'request.offer_expired','allowed','offered','expired');
 expired_count:=expired_count+1;
 end loop;
 -- A free seat alone never triggers offers: replace only seats released by THIS
 -- expiry call. Unknown policy/capacity suppresses replacements, not recorded expiry.
 if expired_count>0 and settings_row.offer_window_hours is not null and settings_row.general_capacity is not null then
 select count(*) into held from msrc_registration.requests r where r.edition_key=edition_key
 and r.status in ('approved','approved_awaiting_payment','offered','confirmed');
 for request_row in select r.* from msrc_registration.requests r
 where r.edition_key=edition_key and r.status='waitlisted'
 order by r.created_at,r.id for update loop
 exit when offered_count>=expired_count or held>=settings_row.general_capacity;
 offer_time:=clock_timestamp();
 update msrc_registration.requests r set status='offered',decided_at=offer_time,updated_at=offer_time,
 offer_expires_at=offer_time+make_interval(hours=>settings_row.offer_window_hours) where r.id=request_row.id;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,previous_status,new_status)
 values(edition_key,null::uuid,request_row.actor_id,request_row.id,'request.offered','allowed','waitlisted','offered');
 offered_count:=offered_count+1;held:=held+1;
 end loop;
 end if;
 return jsonb_build_object('state','updated','expired',expired_count,'offered',offered_count);
end$$;

-- Show the opaque list row reference in the existing private audit area.
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
 ||case when r.event='registration.exported' then jsonb_build_object('rowCount',r.row_count)
 when r.event in ('early_access.added','early_access.removed') then jsonb_build_object('earlyAccessEntryId',r.early_access_entry_id)
 else '{}'::jsonb end
 from msrc_registration.audit r where r.edition_key=edition_key
 ) a left join msrc_staff.profiles p on p.actor_id=a.actor_id left join msrc_staff.profiles t on t.actor_id=a.target_id
 left join msrc_participant.profiles participant on participant.actor_id=a.target_id
 where search='' or strpos(lower(a.action||' '||a.result||' '||coalesce(p.name,'')||' '||coalesce(t.name,participant.name,'')),lower(search))>0
 order by a.occurred_at desc,a.id limit 50) q;
 perform msrc_staff.record(edition_key,'audit_read',null,'allowed');return jsonb_build_object('rows',rows);
end$$;

-- Preserve existing RPC grants; new helpers and table have no client access.
revoke all on function msrc_registration.early_access_email_valid(text),msrc_registration.early_access_active(text,uuid)
 from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_early_access(text,text),public.msrc_staff_early_access_add(text,text[]),
 public.msrc_staff_early_access_remove(text,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_early_access(text,text),public.msrc_staff_early_access_add(text,text[]),
 public.msrc_staff_early_access_remove(text,uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
