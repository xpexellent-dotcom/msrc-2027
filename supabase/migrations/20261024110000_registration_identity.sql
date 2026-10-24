-- ORG-064 / ENG-073; ORG-039, REG-01/02/05, PRV-03/05/06, HAC-10.
-- Review only. No settings, feature activation or scheduler.
begin;
-- Historical encrypted requests remain valid; no keys or decryption in a migration.
-- Their identity is Not provided until separately resolved; new writes use only the private child table.
alter table msrc_registration.requests alter column document_type drop not null,
 alter column identity_envelope drop not null, alter column identity_hash drop not null,
 alter column identity_masked drop not null, alter column key_version drop not null;
create function msrc_registration.normalize_document(kind text,input text) returns text
 language sql immutable set search_path='' as $$
 with n as (select upper(translate(btrim(input),'٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹','01234567890123456789')) value)
 select case when char_length(input)<=64 and
 ((kind='national_id' and value ~ '^1[0-9]{9}$') or (kind='iqama' and value ~ '^2[0-9]{9}$')
 or (kind='passport' and value ~ '^[A-Z0-9]{5,20}$')) then value end from n;
$$;
create table msrc_registration.identity_documents (
 request_id uuid primary key references msrc_registration.requests(id) on delete cascade,
 edition_key text not null references msrc_registration.settings(edition_key) on delete restrict,
 document_type text not null, document_number text not null,
 constraint identity_document_valid check(msrc_registration.normalize_document(document_type,document_number) is not null
 and document_number=msrc_registration.normalize_document(document_type,document_number)),
 unique(edition_key,document_type,document_number)
);
alter table msrc_registration.identity_documents enable row level security;
alter table msrc_registration.identity_documents force row level security;
revoke all on msrc_registration.identity_documents from public,anon,authenticated,service_role;
create table msrc_registration.identity_retention_audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,
 deleted integer not null,legacy_cleared integer not null,created_at timestamptz not null default clock_timestamp()
);
alter table msrc_registration.identity_retention_audit enable row level security;
alter table msrc_registration.identity_retention_audit force row level security;
revoke all on msrc_registration.identity_retention_audit from public,anon,authenticated,service_role;
create trigger identity_retention_audit_immutable before insert or update or delete on msrc_registration.identity_retention_audit
 for each row execute function msrc_staff.audit_immutable();
create trigger identity_retention_audit_no_truncate before truncate on msrc_registration.identity_retention_audit
 for each statement execute function msrc_staff.audit_immutable();
create function msrc_registration.identity_retention_due(edition text) returns boolean
 language sql stable security definer set search_path='' as $$
 select coalesce(now()>(select (max(d)::timestamp+interval '1 year') at time zone 'Asia/Riyadh'
 from msrc_registration.settings s cross join lateral unnest(s.conference_days) d where s.edition_key=edition),false);
$$;
create function msrc_registration.purge_identity(edition text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare deleted_count integer:=0;legacy_count integer:=0;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration maintenance requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 perform 1 from msrc_registration.settings s where s.edition_key=edition for update;
 if not msrc_registration.identity_retention_due(edition) then
 return jsonb_build_object('deleted',0,'legacyCleared',0);end if;
 delete from msrc_registration.identity_documents i where i.request_id in
 (select x.request_id from msrc_registration.identity_documents x where x.edition_key=edition order by x.request_id limit 500 for update);
 get diagnostics deleted_count=row_count;
 -- Masks, dedupe hashes and historical ciphertext also have the same retention deadline.
 update msrc_registration.requests r set document_type=null,identity_envelope=null,identity_hash=null,identity_masked=null,key_version=null
 where r.id in(select x.id from msrc_registration.requests x where x.edition_key=edition
 and (x.identity_masked is not null or x.identity_envelope is not null or x.identity_hash is not null or x.document_type is not null or x.key_version is not null)
 order by x.id limit 500 for update);
 get diagnostics legacy_count=row_count;
 if deleted_count+legacy_count>0 then
 insert into msrc_registration.identity_retention_audit(edition_key,deleted,legacy_cleared) values(edition,deleted_count,legacy_count);end if;
 return jsonb_build_object('deleted',deleted_count,'legacyCleared',legacy_count);
end$$;
-- Disable the former encrypted submission contract, including stale servers.
create or replace function public.msrc_registration_submit(edition_key text,session_claims jsonb,document_type text,
 identity_envelope jsonb,identity_hash text,identity_masked text,key_version text,terms_version text) returns jsonb
 language sql security definer set search_path='' as $$select msrc_registration.server_only();select jsonb_build_object('state','denied');$$;
-- Remove the separate reveal flow. Detail is the sole plaintext read.
create or replace function public.msrc_staff_identity_reveal(edition_key text,target_actor uuid,reason text) returns jsonb
 language sql security definer set search_path='' as $$select jsonb_build_object('state','denied');$$;
create or replace function public.msrc_registration_submit(edition_key text,session_claims jsonb,document_type text,
 document_number text,terms_version text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare normalized text:=msrc_registration.normalize_document(document_type,document_number);previous_claims text:=current_setting('request.jwt.claims',true);context jsonb;r msrc_registration.requests%rowtype;result jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration submission requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 perform pg_advisory_xact_lock(hashtextextended('registration:'||edition_key||':'||auth.uid()::text,0));
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for share;
 context:=msrc_registration.context(edition_key);
 if msrc_registration.identity_retention_due(edition_key) then result:=jsonb_build_object('state','closed');
 elsif context->>'state'<>'open' then result:=jsonb_build_object('state',context->>'state');
 elsif context->'request'<>'null'::jsonb then result:=jsonb_build_object('state','submitted','request',context->'request');
 elsif terms_version is null or terms_version is distinct from context->>'termsVersion' or normalized is null then result:=jsonb_build_object('state','denied');
 else
 begin
 insert into msrc_registration.requests(edition_key,actor_id,terms_version,identity_masked)
 values(edition_key,auth.uid(),terms_version,'••••••'||right(normalized,4)) returning * into r;
 insert into msrc_registration.identity_documents(request_id,edition_key,document_type,document_number)
 values(r.id,edition_key,document_type,normalized);
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result)
 values(edition_key,auth.uid(),auth.uid(),r.id,'request.submitted','allowed');
 result:=jsonb_build_object('state','submitted','request',jsonb_build_object('id',r.id,'status',r.status,'createdAt',r.created_at));
 exception when unique_violation then result:=jsonb_build_object('state','conflict');
 when check_violation then result:=jsonb_build_object('state','denied');end;
 end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create or replace function public.msrc_staff_registration_detail(edition_key text,request_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare request jsonb;history jsonb;expiry jsonb;identity_data jsonb;
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
 select jsonb_build_object('documentType',i.document_type,'documentNumber',i.document_number) into identity_data
 from msrc_registration.identity_documents i where i.request_id=request_id and i.edition_key=edition_key
 and not msrc_registration.identity_retention_due(edition_key);
 return jsonb_build_object('identityVersion',1,'state','ready','historyVersion',1,'confirmationVersion',1,'detail',jsonb_build_object('request',request,'history',history,'identity',identity_data));
end$$;

create or replace function public.msrc_registration_confirmation_maintenance(edition_key text) returns jsonb
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
 perform msrc_registration.purge_identity(edition_key);
 opened:=msrc_registration.open_confirmation_windows(edition_key,null::uuid);
 result:=msrc_registration.expire_confirmations(edition_key,null::uuid);
 return result||jsonb_build_object('opened',opened);
end$$;


-- Preserve the readiness aggregate; require the new identity contract rather than the retired encrypted overload.
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
     and to_regprocedure('public.msrc_registration_submit(text,jsonb,text,text,text)') is not null
     and to_regclass('msrc_registration.identity_documents') is not null
     and to_regprocedure('msrc_registration.purge_identity(text)') is not null
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

revoke all on all functions in schema msrc_registration from public,anon,authenticated,service_role;
revoke all on function public.msrc_registration_submit(text,jsonb,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_registration_submit(text,jsonb,text,text,text) to service_role;
comment on table msrc_registration.identity_documents is 'ORG-064: identity verification only; ordinary authorized registration detail; purge one calendar year after final configured conference day. No profile/hackathon reuse.';
comment on column msrc_registration.requests.identity_envelope is 'Retired legacy ciphertext, never populated by the ORG-064 submit contract; cleared at the configured identity retention deadline. New identity lives in the private child table.';
notify pgrst,'reload schema';
commit;
