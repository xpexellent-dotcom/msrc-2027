-- BL-AUTH-01/05/06 staff, BL-RPT-01/03: reviewed CLOSED portal foundation.
-- Requires all preceding review migrations. No accounts, emails, editions or flags activated.
create schema msrc_staff;
revoke all on schema msrc_staff from public,anon,authenticated,service_role;
alter default privileges in schema msrc_staff revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema msrc_staff revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges in schema msrc_staff revoke execute on functions from public,anon,authenticated,service_role;
create table msrc_staff.policy (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 email_daily_limit integer check(email_daily_limit>0),
 bootstrap_completed boolean not null default false, bootstrap_pairing_completed boolean not null default false
);
insert into msrc_staff.policy(singleton) values(true);
create table msrc_staff.bootstrap_reservations (
 actor_id uuid primary key,email text not null,expires_at timestamptz not null default clock_timestamp()+interval '5 minutes',
 applied_at timestamptz,native_transaction xid8
);
create table msrc_staff.profiles (
 actor_id uuid primary key references auth.users(id) on delete restrict,
 name text not null check(char_length(btrim(name)) between 1 and 200),
 created_at timestamptz not null default clock_timestamp(),
 last_sign_in_at timestamptz
);
create table msrc_staff.invitations (
 id uuid primary key,edition_key text not null references msrc_authorization.edition_config(edition_key),
 email text not null check(email=lower(btrim(email)) and char_length(email) between 3 and 254),
 roles text[] not null,
 token_hash text not null check(token_hash~'^[a-f0-9]{64}$'),
 invited_by uuid not null references msrc_staff.profiles(actor_id),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,
 state text not null default 'pending' check(state in ('pending','claiming','accepted','revoked','expired')),
 delivered_at timestamptz,
 accepted_by uuid, recovery_operation uuid,
 check(expires_at=created_at+interval '72 hours')
);
create index staff_invitation_email on msrc_staff.invitations(email,created_at desc);
create index staff_invitation_edition on msrc_staff.invitations(edition_key,created_at desc);
create unique index staff_invitation_one_open on msrc_staff.invitations(email) where state in ('pending','claiming');
create table msrc_staff.admissions (
 id uuid primary key,invitation_id uuid not null unique references msrc_staff.invitations(id),
 actor_id uuid not null,email text not null,name text not null,
 existing boolean not null,
 expires_at timestamptz not null default clock_timestamp()+interval '5 minutes',
 state text not null default 'pending' check(state in ('pending','applied','completed','failed')),
 native_transaction xid8
);
create unique index staff_admission_one_pending on msrc_staff.admissions(actor_id) where state in ('pending','applied');
create table msrc_staff.admin_operations (
 id uuid primary key,performer_actor_id uuid not null,target_actor_id uuid not null,
 edition_key text not null,action text not null check(action in ('reset_authenticator','reset_account')),
 credential_applied boolean not null default false,native_transaction xid8,
 expires_at timestamptz not null default clock_timestamp()+interval '5 minutes',
 state text not null default 'pending' check(state in ('pending','completed','failed')),
 check(performer_actor_id<>target_actor_id)
);
alter table msrc_staff.invitations add constraint staff_invite_recovery_fk foreign key(recovery_operation) references msrc_staff.admin_operations(id);
create unique index staff_reset_one_pending on msrc_staff.admin_operations(target_actor_id) where state='pending';
create table msrc_staff.limit_events (
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('form','login','invite')),
 subject_hash text not null check(subject_hash~'^[a-f0-9]{64}$'),
 nonce_hash text check(nonce_hash~'^[a-f0-9]{64}$'),occurred_at timestamptz not null default clock_timestamp()
);
create index staff_limit_lookup on msrc_staff.limit_events(kind,subject_hash,occurred_at desc);
create unique index staff_form_once on msrc_staff.limit_events(nonce_hash) where kind='form';
create table msrc_staff.login_attempts (
 id uuid primary key,email_hash text not null,ip_hash text not null,
 created_at timestamptz not null default clock_timestamp(),
 state text not null default 'pending' check(state in ('pending','admitted','denied'))
);
create index staff_login_email on msrc_staff.login_attempts(email_hash,created_at desc);
create index staff_login_ip on msrc_staff.login_attempts(ip_hash,created_at desc);
create table msrc_staff.audit (
 id uuid primary key default gen_random_uuid(),actor_id uuid,target_id uuid,edition_key text,
 action text not null check(action in ('bootstrap','invite','invite_delivery','invite_revoke','invite_consume','invite_complete',
 'sign_in','set_roles','suspend','reactivate','revoke_sessions','reset_authenticator','reset_account','admin_complete',
 'people_read','audit_read','participants_read','identity_reveal','totp_enroll','totp_challenge','totp_verify')),
 result text not null check(result in ('allowed','denied','reserved','completed','failed','unavailable')),
 details jsonb not null default '{}' check(jsonb_typeof(details)='object' and not details ?| array['email','name','code','secret','password','token','hash','ip']),
 occurred_at timestamptz not null default clock_timestamp()
);
create index staff_audit_filter on msrc_staff.audit(edition_key,occurred_at desc);
comment on table msrc_staff.audit is 'Immutable UUID references and enum results only. No emails, names, passwords, tokens, keyed digests, codes, IPs or provider payloads.';
comment on schema msrc_staff is 'Private forced-RLS invite-only staff admission and reporting. No registration identity field or bulk-export API.';
do $$declare t text; begin
 foreach t in array array['policy','bootstrap_reservations','profiles','invitations','admissions','admin_operations','limit_events','login_attempts','audit'] loop
 execute format('alter table msrc_staff.%I enable row level security',t);
 execute format('alter table msrc_staff.%I force row level security',t);
 end loop;
end$$;
revoke all on all tables in schema msrc_staff from public,anon,authenticated,service_role;
revoke all on all sequences in schema msrc_staff from public,anon,authenticated,service_role;
create function msrc_staff.ready() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enabled and email_daily_limit is not null from msrc_staff.policy where singleton),false);
$$;
create function msrc_staff.roles_valid(roles text[]) returns boolean language sql immutable set search_path='' as $$
 select coalesce(cardinality(roles) between 1 and 12 and not exists(select 1 from unnest(roles) r where r is null or r not in
 ('abstractReviewer','hackathonReviewer','threeMinuteThesisReviewer','scientificAdministrator','judgingCommittee','facultyJudge',
 'registrationWorkshopAdministrator','finance','checkInStaff','contentMediaEditor','sponsorshipPr','superAdmin'))
 and cardinality(roles)=(select count(distinct r) from unnest(roles) r),false);
$$;
create function msrc_staff.audit_immutable() returns trigger language plpgsql security invoker set search_path='' as $$
#variable_conflict use_variable
 begin
 if tg_op<>'INSERT' or current_user<>'postgres' then raise exception using errcode='55000',message='Staff audit is append-only.'; end if;
 return new;
 end$$;
create trigger staff_audit_immutable before insert or update or delete on msrc_staff.audit for each row execute function msrc_staff.audit_immutable();
create trigger staff_audit_no_truncate before truncate on msrc_staff.audit for each statement execute function msrc_staff.audit_immutable();
create function msrc_staff.record(edition text,event text,target uuid,result text,performer uuid default null) returns void
 language sql security definer set search_path='' as $$
 insert into msrc_staff.audit(edition_key,action,target_id,result,actor_id) values(edition,event,target,result,coalesce(performer,auth.uid()));
$$;
-- Every privileged RPC reads the persisted current account/grants and strongest
-- native session evidence. JWT role names and user metadata are never consulted.
create function msrc_staff.active_super_admin_count(edition text) returns bigint
 language sql stable security definer set search_path='' as $$
 select count(distinct g.actor_id) from msrc_authorization.role_grants g
 join msrc_authorization.account_access a on a.actor_id=g.actor_id and a.state='active'
 join msrc_staff.profiles p on p.actor_id=g.actor_id
 where g.edition_key=edition and g.state='active' and g.role_name='superAdmin' and g.scope_kind='edition';
$$;
create function msrc_staff.enrolled_super_admin_count(edition text) returns bigint
 language sql stable security definer set search_path='' as $$
 select count(distinct g.actor_id) from msrc_authorization.role_grants g
 join msrc_authorization.account_access a on a.actor_id=g.actor_id and a.state='active'
 join msrc_staff.profiles p on p.actor_id=g.actor_id
 where g.edition_key=edition and g.state='active' and g.role_name='superAdmin' and g.scope_kind='edition'
 and exists(select 1 from auth.mfa_factors f where f.user_id=g.actor_id and f.factor_type::text='totp' and f.status::text='verified');
$$;
create function msrc_staff.authorize(edition text,required_roles text[] default null,record_activity boolean default true) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare context jsonb;
 begin
 if not msrc_staff.ready() or auth.uid() is null or not exists(select 1 from msrc_staff.profiles where actor_id=auth.uid()) then return null; end if;
 if not exists(select 1 from msrc_authorization.role_grants g where g.actor_id=auth.uid() and g.edition_key=edition
 and g.state='active' and g.role_name<>'participant'
 and (required_roles is null or (g.role_name=any(required_roles) and g.scope_kind='edition'))) then return null; end if;
 context:=msrc_sessions.own_context(edition,false);
 if context is null or not coalesce((context->>'sessionPolicySatisfied')::boolean,false)
 or context->>'authenticationTier' not in ('staff','super_admin') then return null; end if;
 if not exists(select 1 from msrc_authorization.role_grants g where g.actor_id=auth.uid() and g.edition_key=edition
 and g.state='active' and g.role_name<>'participant'
 and (required_roles is null or (g.role_name=any(required_roles) and g.scope_kind='edition'))) then return null; end if;
 if record_activity then
 context:=msrc_sessions.own_context(edition,true);
 if context is null or not coalesce((context->>'sessionPolicySatisfied')::boolean,false) then return null;end if;
 end if;
 return context;
 end$$;
create function msrc_staff.revoke(target uuid,performer uuid,cause text default 'security') returns void
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 begin
 insert into msrc_sessions.actor_revocations(actor_id,revoked_before,cause,performed_by_actor_id,performed_by_db_role)
 values(target,clock_timestamp(),cause,performer,session_user)
 on conflict(actor_id) do update set revoked_before=excluded.revoked_before,cause=excluded.cause,performed_by_actor_id=excluded.performed_by_actor_id;
 update msrc_sessions.session_state set revoked_at=clock_timestamp(),revocation_cause=cause where actor_id=target and revoked_at is null;
 end$$;
-- Narrow definer RPCs now maintain immutable grants. Tables remain ungranted and
-- every RPC rechecks actor assurance. Preserve historical restrictions and auditing.
create or replace function msrc_authorization.maintain_role_grant() returns trigger
 language plpgsql security invoker set search_path='' as $$
#variable_conflict use_variable
 begin
 if current_user<>'postgres' then raise exception using errcode='42501',message='Authority maintenance is restricted.'; end if;
 if tg_op='DELETE' then raise exception using errcode='55000',message='Grant history is immutable.';
 elsif tg_op='INSERT' then
 if new.state<>'active' or new.revoked_at is not null or new.revocation_reason is not null then raise exception using errcode='55000',message='New grants must start active.'; end if;
 new.granted_at:=statement_timestamp();
 else
 if old.state<>'active' or new.state<>'revoked' or (to_jsonb(new)-array['state','revoked_at','revocation_reason'])
 is distinct from (to_jsonb(old)-array['state','revoked_at','revocation_reason']) then raise exception using errcode='55000',message='Only irreversible grant revocation is permitted.'; end if;
 new.revoked_at:=statement_timestamp();
 end if;
 return new;
 end$$;
create or replace function msrc_authorization.audit_role_grant() returns trigger
 language plpgsql security invoker set search_path='' as $$
#variable_conflict use_variable
 begin
 if current_user<>'postgres' then raise exception using errcode='42501',message='Authority maintenance is restricted.'; end if;
 insert into msrc_authorization.grant_audit(grant_id,actor_id,edition_key,event,role_name,scope_kind,track,scope_target,reason,performed_by_db_role)
 values(new.id,new.actor_id,new.edition_key,case when tg_op='INSERT' then 'grant.created' else 'grant.revoked' end,
 new.role_name,new.scope_kind,new.track,new.scope_target,case when tg_op='INSERT' then new.grant_reason else new.revocation_reason end,session_user);
 return new;
 end$$;
create or replace function msrc_authorization.prevent_audit_change() returns trigger
 language plpgsql security invoker set search_path='' as $$
#variable_conflict use_variable
 begin
 if tg_op='INSERT' and pg_trigger_depth()>=2 and current_user='postgres' then return new; end if;
 raise exception using errcode='55000',message='Grant audit is append-only.';
 end$$;
-- Native Admin create/update requires a private consumed single-use invitation.
-- No public staff signup and no authorizing role markers in native metadata.
create function msrc_staff.native_identity_guard() returns trigger
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare admission msrc_staff.admissions%rowtype; relevant boolean;
 begin
 if tg_op='INSERT' then
 if exists(select 1 from msrc_staff.bootstrap_reservations b where b.actor_id=new.id and b.email=new.email
 and b.expires_at>clock_timestamp() and b.applied_at is null) and not exists(select 1 from msrc_staff.profiles)
 and not (select bootstrap_completed from msrc_staff.policy where singleton) then
 if new.email_confirmed_at is null or coalesce(new.encrypted_password,'')='' or coalesce(new.is_anonymous,false) then
 raise exception using errcode='42501',message='Bootstrap native prerequisites required.';end if;
 update msrc_staff.bootstrap_reservations set applied_at=clock_timestamp(),native_transaction=pg_current_xact_id() where actor_id=new.id;
 return new;
 end if;
 select a.* into admission from msrc_staff.admissions a where a.actor_id=new.id and a.state='pending' for update;
 if not found then return new; end if;
 relevant:=true;
 else
 select a.* into admission from msrc_staff.admissions a where a.actor_id=new.id and a.state='pending' for update;
 relevant:=new.email is distinct from old.email or new.email_confirmed_at is distinct from old.email_confirmed_at or new.encrypted_password is distinct from old.encrypted_password;
 if not relevant then return new; end if;
 if not found then
 if not exists(select 1 from msrc_staff.profiles p where p.actor_id=new.id) then return new; end if;
 if new.email is not distinct from old.email and new.email_confirmed_at is not distinct from old.email_confirmed_at
 and exists(select 1 from msrc_staff.admin_operations o where o.target_actor_id=new.id and o.action='reset_account'
 and o.state='pending' and o.expires_at>clock_timestamp()) then
 update msrc_staff.admin_operations set credential_applied=true,native_transaction=pg_current_xact_id() where target_actor_id=new.id and action='reset_account' and state='pending';
 return new; end if;
 raise exception using errcode='42501',message='Staff identity recovery requires another Super Admin.';
 end if;
 end if;
 if not msrc_staff.ready() or admission.expires_at<=clock_timestamp() or admission.email is distinct from new.email
 or new.email_confirmed_at is null or coalesce(new.encrypted_password,'')='' or coalesce(new.is_anonymous,false)
 or coalesce(new.phone,'')<>'' then raise exception using errcode='42501',message='Staff invitation admission required.'; end if;
 update msrc_staff.admissions set state='applied',native_transaction=pg_current_xact_id() where id=admission.id;
 return new;
 end$$;
create trigger a_staff_native_identity before insert or update on auth.users for each row execute function msrc_staff.native_identity_guard();
-- Preserve PR39 guards, while letting its participant identity be promoted only
-- through a private invitation. The staff guard above consumes native evidence.
create or replace function msrc_participant.admit_native_user() returns trigger
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare admission msrc_participant.admissions%rowtype; marker text;
begin
  if exists(select 1 from msrc_staff.admissions a where a.actor_id=new.id and a.state='applied' and a.native_transaction=pg_current_xact_id()) or exists(select 1 from msrc_staff.bootstrap_reservations b where b.actor_id=new.id and b.applied_at is not null and b.native_transaction=pg_current_xact_id()) then return new; end if;
  marker:=new.raw_app_meta_data->>'msrcParticipantAdmission';
  if marker is not null and marker !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception using errcode='42501',message='Participant admission required.'; end if;
  -- GoTrue Admin creates the user BEFORE applying requested app_metadata. The
  -- trusted server supplies its random actor UUID, pre-reserved privately. A
  -- marker can corroborate that reservation but is never its authority.
  select a.* into admission from msrc_participant.admissions a where a.actor_id=new.id for update;
  if not found and marker is null and session_user='postgres' then return new; end if;
  if not found or not msrc_participant.ready() or admission.actor_id<>new.id or admission.email is distinct from new.email
    or (marker is not null and admission.id<>marker::uuid)
    or admission.expires_at<=clock_timestamp() or admission.consumed_at is not null
    or admission.privacy_version is distinct from (select p.privacy_version from msrc_participant.policy p where p.singleton)
    or new.email_confirmed_at is not null or coalesce(new.phone,'')<>'' or coalesce(new.is_anonymous,false)
    or coalesce(new.encrypted_password,'')='' then
    raise exception using errcode='42501',message='Participant admission required.'; end if;
  new.raw_app_meta_data:=new.raw_app_meta_data-'msrcParticipantAdmission';
  -- The reservation ID is retained only privately until the AFTER insertion.
  update msrc_participant.admissions set consumed_at=clock_timestamp() where id=admission.id;
  return new;
end$$;
create or replace function msrc_participant.guard_native_identity() returns trigger
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare operation msrc_participant.operations%rowtype; revision bigint; relevant boolean; marker text;
begin
  if exists(select 1 from msrc_staff.admin_operations o where o.target_actor_id=new.id and o.action='reset_account' and o.state='pending' and o.expires_at>clock_timestamp()) and new.email is not distinct from old.email and new.email_confirmed_at is not distinct from old.email_confirmed_at then return new;end if;
  if exists(select 1 from msrc_staff.admissions a where a.actor_id=new.id and a.state='applied' and a.native_transaction=pg_current_xact_id()) or exists(select 1 from msrc_staff.bootstrap_reservations b where b.actor_id=new.id and b.applied_at is not null and b.native_transaction=pg_current_xact_id()) then return new; end if;
  if not exists(select 1 from msrc_participant.profiles p where p.actor_id=new.id) then return new; end if;
  -- GoTrue applies requested Admin app_metadata after inserting the admitted
  -- profile. Never retain a one-use reservation marker in native metadata.
  marker:=new.raw_app_meta_data->>'msrcParticipantAdmission';
  if marker is not null and not exists(select 1 from msrc_participant.admissions a
    where a.actor_id=new.id and a.id::text=marker and a.consumed_at is not null) then
    raise exception using errcode='42501',message='Participant admission required.'; end if;
  new.raw_app_meta_data:=new.raw_app_meta_data-'msrcParticipantAdmission';
  -- Native user updates first stage changes in *_change fields. Reject that
  -- attempt before stripping credentials so no delivery provider is reached.
  if coalesce(new.email_change,'')<>'' or coalesce(new.phone_change,'')<>'' then
    raise exception using errcode='42501',message='Participant identity change is unavailable.'; end if;
  new.confirmation_token:=''; new.confirmation_sent_at:=null;
  new.recovery_token:=''; new.recovery_sent_at:=null;
  new.email_change_token_current:=''; new.email_change_token_new:=''; new.email_change_sent_at:=null;
  new.email_change:=''; new.email_change_confirm_status:=0;
  new.phone_change:=''; new.phone_change_token:=''; new.phone_change_sent_at:=null;
  new.reauthentication_token:=''; new.reauthentication_sent_at:=null;
  if new.email is distinct from old.email or coalesce(new.phone,'')<>'' or new.phone_confirmed_at is not null then
    raise exception using errcode='42501',message='Participant identity change is unavailable.'; end if;
  relevant:=new.email_confirmed_at is distinct from old.email_confirmed_at or new.encrypted_password is distinct from old.encrypted_password;
  if not relevant then return new; end if;
  if not msrc_participant.ready() or not msrc_participant.participant_only(new.id) then
    raise exception using errcode='42501',message='Participant identity change is unavailable.'; end if;
  select o.* into operation from msrc_participant.operations o where o.actor_id=new.id and o.state in ('pending','applied') for update;
  if not found then
    if old.email_confirmed_at is null or new.email_confirmed_at is distinct from old.email_confirmed_at then
      raise exception using errcode='42501',message='Verified mailbox proof required.'; end if;
    -- Already verified native owners can change their password. Relevant native
    -- revision advances invalidate our old codes/receipts, including this session.
    return new;
  end if;
  select r.revision into revision from msrc_staff_email.identity_revision r where r.actor_id=new.id;
  if operation.state<>'pending' or operation.expires_at<=clock_timestamp() or operation.recipient<>new.email
    or (operation.transaction_id is not null and operation.transaction_id<>pg_current_xact_id())
    or (operation.transaction_id is null and operation.identity_revision is distinct from revision)
    or (operation.purpose='reset_password' and new.email_confirmed_at is distinct from old.email_confirmed_at)
    or (operation.purpose='verify_email' and old.email_confirmed_at is null and new.email_confirmed_at is null)
    or new.email_confirmed_at is null
    or coalesce(new.encrypted_password,'')='' then
    raise exception using errcode='42501',message='Current mailbox proof required.'; end if;
  update msrc_participant.operations set transaction_id=pg_current_xact_id() where id=operation.id;
  return new;
end$$;

create function msrc_staff.native_factor_guard() returns trigger
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare target uuid;
 begin
 target:=case when tg_op='DELETE' then old.user_id else new.user_id end;
 if not exists(select 1 from msrc_staff.profiles p where p.actor_id=target) then if tg_op='DELETE' then return old;else return new;end if;end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-totp:'||target::text,0));
 if tg_op='INSERT' and exists(select 1 from auth.mfa_factors f where f.user_id=target and f.status::text='verified') then
 raise exception using errcode='42501',message='Authenticator replacement requires another Super Admin.';end if;
 if tg_op='UPDATE' and old.status::text<>'verified' and new.status::text='verified'
 and exists(select 1 from auth.mfa_factors f where f.user_id=target and f.id<>new.id and f.status::text='verified') then
 raise exception using errcode='42501',message='Authenticator replacement requires another Super Admin.';end if;
 if tg_op='UPDATE' and old.status::text='verified' and (to_jsonb(new)->'secret') is distinct from (to_jsonb(old)->'secret') then
 raise exception using errcode='42501',message='Authenticator replacement requires another Super Admin.';end if;
 if tg_op='DELETE' and old.status::text='verified' and exists(select 1 from msrc_authorization.role_grants g
 where g.actor_id=target and g.state='active' and g.role_name='superAdmin')
 and not exists(select 1 from msrc_staff.admin_operations o where o.target_actor_id=target and o.state='pending'
 and o.expires_at>clock_timestamp()) then raise exception using errcode='42501',message='Authenticator reset requires another Super Admin.'; end if;
 if tg_op<>'DELETE' and (new.factor_type::text<>'totp' or not exists(select 1 from msrc_authorization.role_grants g
 where g.actor_id=target and g.state='active' and g.role_name='superAdmin')) then
 raise exception using errcode='42501',message='Only Super Admin authenticator enrollment is available.'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
 end$$;
create trigger staff_native_factor_guard before insert or update or delete on auth.mfa_factors for each row execute function msrc_staff.native_factor_guard();
create function public.msrc_staff_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',enabled,'emailDailyLimit',email_daily_limit) from msrc_staff.policy where singleton;
$$;
create function public.msrc_staff_form_claim(nonce_hash text,ip_hash text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 begin
 if not msrc_staff.ready() or nonce_hash is null or ip_hash is null or nonce_hash!~'^[a-f0-9]{64}$' or ip_hash!~'^[a-f0-9]{64}$' then return jsonb_build_object('state','denied'); end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-form:'||ip_hash,0));
 if (select count(*) from msrc_staff.limit_events e where e.kind='form' and e.subject_hash=ip_hash and e.occurred_at>clock_timestamp()-interval '1 hour')>=20 then return jsonb_build_object('state','denied'); end if;
 insert into msrc_staff.limit_events(kind,subject_hash,nonce_hash) values('form',ip_hash,nonce_hash) on conflict do nothing;
 if not found then return jsonb_build_object('state','denied'); end if;
 return jsonb_build_object('state','claimed');
 end$$;
create function public.msrc_staff_login_begin(attempt_id uuid,email_hash text,ip_hash text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 begin
 if not msrc_staff.ready() or email_hash is null or ip_hash is null or email_hash!~'^[a-f0-9]{64}$' or ip_hash!~'^[a-f0-9]{64}$' or attempt_id is null then return jsonb_build_object('state','denied'); end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-login',0));
 if (select count(*) from msrc_staff.login_attempts a where a.email_hash=msrc_staff_login_begin.email_hash and a.state in ('pending','denied') and a.created_at>clock_timestamp()-interval '15 minutes')>=5
 or (select count(*) from msrc_staff.login_attempts a where a.ip_hash=msrc_staff_login_begin.ip_hash and a.created_at>clock_timestamp()-interval '1 hour')>=20 then return jsonb_build_object('state','denied'); end if;
 insert into msrc_staff.login_attempts(id,email_hash,ip_hash) values(attempt_id,email_hash,ip_hash) on conflict do nothing;
 if not found then return jsonb_build_object('state','denied'); end if;
 return jsonb_build_object('state','reserved');
 end$$;
create function public.msrc_staff_login_finish(attempt_id uuid,actor_id uuid default null,session_id uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare attempt msrc_staff.login_attempts%rowtype; edition text;tier text;
 begin
 select a.* into attempt from msrc_staff.login_attempts a where a.id=attempt_id for update;
 if not found or attempt.state<>'pending' or attempt.created_at<=clock_timestamp()-interval '5 minutes' or not msrc_staff.ready() then return jsonb_build_object('state','denied'); end if;
 if actor_id is not null then perform 1 from msrc_authorization.account_access a where a.actor_id=msrc_staff_login_finish.actor_id and a.state='active' and a.individually_identified for update; end if;
 if not found or not exists(select 1 from msrc_staff.profiles p join auth.users u on u.id=p.actor_id
 join auth.sessions s on s.user_id=u.id and s.id=msrc_staff_login_finish.session_id
 join auth.mfa_amr_claims m on m.session_id=s.id and m.authentication_method='password'
 where p.actor_id=msrc_staff_login_finish.actor_id and u.email_confirmed_at is not null and u.deleted_at is null and not u.is_anonymous
 and (u.banned_until is null or u.banned_until<=clock_timestamp()) and (s.not_after is null or s.not_after>clock_timestamp())
 and m.updated_at::timestamptz>=s.created_at
 and not exists(select 1 from msrc_sessions.actor_revocations r where r.actor_id=u.id and s.created_at<=r.revoked_before)) then
 update msrc_staff.login_attempts set state='denied' where id=attempt_id;
 perform msrc_staff.record(null,'sign_in',actor_id,'denied',actor_id); return jsonb_build_object('state','denied'); end if;
 select g.edition_key into edition from msrc_authorization.role_grants g where g.actor_id=msrc_staff_login_finish.actor_id and g.state='active' and g.role_name<>'participant' order by g.edition_key limit 1;
 if edition is null then update msrc_staff.login_attempts set state='denied' where id=attempt_id;
 perform msrc_staff.record(null,'sign_in',actor_id,'denied',actor_id); return jsonb_build_object('state','denied'); end if;
 tier:=case when exists(select 1 from msrc_authorization.role_grants g where g.actor_id=msrc_staff_login_finish.actor_id and g.state='active' and g.role_name='superAdmin') then 'super_admin' else 'staff' end;
 update msrc_staff.login_attempts set state='admitted' where id=attempt_id;

 perform msrc_staff.record(edition,'sign_in',actor_id,'allowed',actor_id);
 return jsonb_build_object('state','admitted','editionKey',edition,'tier',tier);
 end$$;
create function public.msrc_staff_auth_event(actor_id uuid,session_id uuid,event text,result text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 begin
 if not msrc_staff.ready() or event not in ('totp_enroll','totp_challenge','totp_verify') or result not in ('allowed','denied','failed','completed')
 or not exists(select 1 from msrc_staff.profiles p join msrc_authorization.account_access a using(actor_id)
 join auth.sessions s on s.user_id=p.actor_id join auth.mfa_amr_claims m on m.session_id=s.id
 where p.actor_id=msrc_staff_auth_event.actor_id and s.id=msrc_staff_auth_event.session_id and a.state='active'
 and m.authentication_method='password' and m.updated_at::timestamptz>=s.created_at
 and s.created_at+interval '8 hours'>clock_timestamp()) then return jsonb_build_object('state','denied'); end if;
 if event='totp_verify' and result='completed' and exists(select 1 from auth.sessions s
 join auth.mfa_factors f on f.id=s.factor_id and f.user_id=s.user_id
 join auth.mfa_amr_claims m on m.session_id=s.id and m.authentication_method='totp'
 where s.id=session_id and s.user_id=actor_id and s.aal::text='aal2' and f.factor_type::text='totp' and f.status::text='verified'
 and m.updated_at::timestamptz>=greatest(f.created_at,f.updated_at,s.created_at))
 and exists(select 1 from msrc_authorization.role_grants g where g.actor_id=actor_id and g.state='active' and g.role_name='superAdmin'
 and msrc_staff.enrolled_super_admin_count(g.edition_key)>=2) then
 update msrc_staff.policy set bootstrap_pairing_completed=true where singleton;
 end if;
 perform msrc_staff.record(null,event,actor_id,result,actor_id);return jsonb_build_object('state','completed');
 end$$;
create function public.msrc_staff_profile(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare context jsonb; profile msrc_staff.profiles%rowtype;roles jsonb;
 begin
 context:=msrc_staff.authorize(edition_key,null,false);
 if context is null then return null; end if;
 update msrc_staff.profiles set last_sign_in_at=(context#>>'{timing,authenticatedAt}')::timestamptz where actor_id=auth.uid() and (last_sign_in_at is null or last_sign_in_at<(context#>>'{timing,authenticatedAt}')::timestamptz);
 select p.* into profile from msrc_staff.profiles p where p.actor_id=auth.uid();
 select coalesce(jsonb_agg(distinct g.role_name),'[]') into roles from msrc_authorization.role_grants g where g.actor_id=auth.uid() and g.edition_key=msrc_staff_profile.edition_key and g.state='active' and g.role_name<>'participant';
 context:=msrc_sessions.own_context(edition_key,false);
 if context is null or not coalesce((context->>'sessionPolicySatisfied')::boolean,false) then return null;end if;
 return jsonb_build_object('schemaVersion',1,'actorId',auth.uid(),'name',profile.name,'roles',roles,'session',context);
 end$$;
create function public.msrc_staff_invite_begin(edition_key text,email text,roles text[],invite_id uuid,token_hash text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare observed timestamptz:=clock_timestamp();performer uuid:=auth.uid();context jsonb;recovery uuid;
 begin
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 perform pg_advisory_xact_lock(hashtextextended('staff-email-volume',0));
 context:=msrc_staff.authorize(edition_key,array['superAdmin']);
 select o.id into recovery from msrc_staff.admin_operations o join auth.users u on u.id=o.target_actor_id where u.email=email and o.performer_actor_id=performer and o.edition_key=edition_key and o.action='reset_account' and o.state='completed' and o.expires_at>clock_timestamp() order by o.expires_at desc limit 1;
 if recovery is null then select i.recovery_operation into recovery from msrc_staff.invitations i where i.email=email and i.invited_by=performer and i.edition_key=edition_key and i.state='pending' and i.recovery_operation is not null order by i.created_at desc limit 1;end if;
 if context is null or (not (select bootstrap_pairing_completed from msrc_staff.policy where singleton) and msrc_staff.enrolled_super_admin_count(edition_key)<2 and roles is distinct from array['superAdmin']) or not msrc_staff.roles_valid(roles) or email is null or lower(btrim(email))<>email
 or char_length(email) not between 3 and 254 or token_hash is null or token_hash!~'^[a-f0-9]{64}$' or invite_id is null then
 perform msrc_staff.record(edition_key,'invite',invite_id,'denied');return jsonb_build_object('state','denied');end if;
 if exists(select 1 from auth.users u where u.email=msrc_staff_invite_begin.email and u.id=performer)
 or exists(select 1 from auth.users u join msrc_authorization.role_grants g on g.actor_id=u.id
 where u.email=msrc_staff_invite_begin.email and g.role_name='superAdmin' and g.state='active' and recovery is null)
 or exists(select 1 from msrc_staff.invitations i where i.email=msrc_staff_invite_begin.email and i.state='claiming')
 or ((select count(*) from msrc_staff.invitations i where i.created_at>clock_timestamp()-interval '24 hours')+(select count(*) from msrc_staff_email.challenges c join msrc_staff.profiles p on p.actor_id=c.actor_id where c.created_at>clock_timestamp()-interval '24 hours')) >= (select email_daily_limit from msrc_staff.policy where singleton) then
 perform msrc_staff.record(edition_key,'invite',invite_id,'denied');return jsonb_build_object('state','denied');end if;
 update msrc_staff.invitations set state='revoked' where msrc_staff.invitations.email=msrc_staff_invite_begin.email and state='pending';
 insert into msrc_staff.invitations(id,edition_key,email,roles,token_hash,invited_by,created_at,expires_at,recovery_operation)
 values(invite_id,edition_key,email,roles,token_hash,performer,observed,observed+interval '72 hours',recovery);
 perform msrc_staff.record(edition_key,'invite',invite_id,'reserved');
 return jsonb_build_object('state','reserved','invitationId',invite_id,'email',email,'expiresAt',observed+interval '72 hours');
 end$$;
create function public.msrc_staff_invite_delivery(invite_id uuid,delivered boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare invitation msrc_staff.invitations%rowtype;
 begin
 select i.* into invitation from msrc_staff.invitations i where i.id=invite_id for update;
 if not msrc_staff.ready() or not found or invitation.state<>'pending' or invitation.expires_at<=clock_timestamp() then return jsonb_build_object('state','denied');end if;
 update msrc_staff.invitations set delivered_at=case when delivered then clock_timestamp() end,state=case when delivered then 'pending' else 'revoked' end where id=invite_id;
 perform msrc_staff.record(invitation.edition_key,'invite_delivery',invite_id,case when delivered then 'completed' else 'failed' end,invitation.invited_by);
 return jsonb_build_object('state','completed');end$$;
create function public.msrc_staff_invite_revoke(edition_key text,invite_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 begin
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then perform msrc_staff.record(edition_key,'invite_revoke',invite_id,'denied');return jsonb_build_object('state','denied');end if;
 update msrc_staff.invitations set state='revoked' where id=invite_id and msrc_staff.invitations.edition_key=msrc_staff_invite_revoke.edition_key and state in ('pending','claiming');
 if not found then perform msrc_staff.record(edition_key,'invite_revoke',invite_id,'denied');return jsonb_build_object('state','denied');end if;
 update msrc_staff.admissions set state='failed' where invitation_id=invite_id and state in ('pending','applied');
 perform msrc_staff.record(edition_key,'invite_revoke',invite_id,'completed');return jsonb_build_object('state','completed');end$$;
create function public.msrc_staff_invite_consume(invite_id uuid,token_hash text,operation_id uuid,actor_id uuid,name text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare invitation msrc_staff.invitations%rowtype;target uuid; existing boolean;
 begin
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 select i.* into invitation from msrc_staff.invitations i where i.id=invite_id for update;
 if not msrc_staff.ready() or not found or invitation.state<>'pending' or invitation.delivered_at is null or invitation.expires_at<=clock_timestamp()
 or invitation.token_hash is distinct from token_hash or operation_id is null or actor_id is null or char_length(btrim(name)) not between 1 and 200 then
 perform msrc_staff.record(invitation.edition_key,'invite_consume',invite_id,'denied',null);return jsonb_build_object('state','denied');end if;
 select u.id into target from auth.users u where u.email=invitation.email and u.deleted_at is null;
 existing:=target is not null;target:=coalesce(target,actor_id);
 if exists(select 1 from msrc_staff.admissions a where a.actor_id=target and a.state in ('pending','applied'))
 or exists(select 1 from msrc_participant.operations o where o.actor_id=target and o.state in ('pending','applied') and o.expires_at>clock_timestamp()) then
 perform msrc_staff.record(invitation.edition_key,'invite_consume',invite_id,'denied',target);return jsonb_build_object('state','denied');end if;
 insert into msrc_staff.admissions(id,invitation_id,actor_id,email,name,existing) values(operation_id,invite_id,target,invitation.email,btrim(name),existing);
 update msrc_staff.invitations set state='claiming' where id=invite_id;
 perform msrc_staff.record(invitation.edition_key,'invite_consume',invite_id,'reserved',target);
 return jsonb_build_object('state','consumed','actorId',target,'email',invitation.email,'reservationId',operation_id,'existing',existing);
 end$$;
create function public.msrc_staff_invite_complete(operation_id uuid,succeeded boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare admission msrc_staff.admissions%rowtype; invitation msrc_staff.invitations%rowtype;r text;
 begin
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 select a.* into admission from msrc_staff.admissions a where a.id=operation_id;
 if not found then return jsonb_build_object('state','denied');end if;
 perform 1 from msrc_authorization.account_access a where a.actor_id=admission.actor_id for update;
 perform 1 from auth.users u where u.id=admission.actor_id for update;
 select a.* into admission from msrc_staff.admissions a where a.id=operation_id for update;
 select i.* into invitation from msrc_staff.invitations i where i.id=admission.invitation_id for update;
 if not msrc_staff.ready() or admission.state not in ('pending','applied') or invitation.state<>'claiming' then return jsonb_build_object('state','denied');end if;
 if not succeeded or admission.state<>'applied' or admission.expires_at<=clock_timestamp() or invitation.expires_at<=clock_timestamp() or not exists(select 1 from auth.users u
 where u.id=admission.actor_id and u.email=admission.email and u.email_confirmed_at is not null and coalesce(u.encrypted_password,'')<>'') then
 update msrc_staff.admissions set state='failed' where id=operation_id;update msrc_staff.invitations set state='revoked' where id=invitation.id;
 perform msrc_staff.record(invitation.edition_key,'invite_complete',admission.actor_id,'failed',admission.actor_id);return jsonb_build_object('state','denied');end if;
 insert into msrc_staff.profiles(actor_id,name) values(admission.actor_id,admission.name) on conflict(actor_id) do update set name=excluded.name;
 insert into msrc_authorization.account_access(actor_id,state,individually_identified) values(admission.actor_id,'active',true)
 on conflict(actor_id) do update set state='active',individually_identified=true;
 foreach r in array invitation.roles loop
 insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values(admission.actor_id,invitation.edition_key,r,'edition','Staff invitation accepted') on conflict do nothing;
 end loop;
 perform msrc_staff.revoke(admission.actor_id,invitation.invited_by);
 update msrc_staff.admissions set state='completed' where id=operation_id;
 update msrc_staff.invitations set state='accepted',accepted_by=admission.actor_id where id=invitation.id;
 perform msrc_staff.record(invitation.edition_key,'invite_complete',admission.actor_id,'completed',admission.actor_id);
 return jsonb_build_object('state','completed','actorId',admission.actor_id,'editionKey',invitation.edition_key);
 end$$;
-- All portal membership changes share one advisory transaction lock before account
-- locks. The guarded RPC returns denied audit rows instead of rolling them back.
-- These triggers additionally protect direct reviewed operator maintenance of portal
-- members; legacy non-portal synthetic fixtures retain the preceding contract.
create function msrc_staff.guard_super_admin_minimum() returns trigger
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare target uuid; edition text; current_count bigint;
 begin
 target:=case when tg_table_name='role_grants' then old.actor_id else old.actor_id end;
 if not exists(select 1 from msrc_staff.profiles p where p.actor_id=target) then return new;end if;
 if tg_table_name='role_grants' then if old.role_name<>'superAdmin' or old.state<>'active' or new.state<>'revoked' then return new;end if;
 else if old.state<>'active' or new.state<>'suspended' then return new;end if;end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 if auth.uid()=target then raise exception using errcode='42501',message='Self demotion or suspension is unavailable.';end if;
 for edition in select distinct g.edition_key from msrc_authorization.role_grants g where g.actor_id=target and g.role_name='superAdmin' and g.state='active' loop
 if tg_table_name='role_grants' then if edition<>old.edition_key then continue;end if;end if;
 current_count:=msrc_staff.active_super_admin_count(edition);
 if current_count<=2 then raise exception using errcode='55000',message='At least two active Super Admins are required.';end if;
 end loop;
 return new;
 end$$;
create trigger a_staff_sa_grant_minimum before update on msrc_authorization.role_grants for each row execute function msrc_staff.guard_super_admin_minimum();
create trigger a_staff_sa_account_minimum before update on msrc_authorization.account_access for each row execute function msrc_staff.guard_super_admin_minimum();
create function public.msrc_staff_admin_change(edition_key text,target_actor uuid,action text,roles text[] default '{}',operation_id uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare context jsonb;performer uuid:=auth.uid(); target_super boolean;count_active bigint;edition text;r text;before_roles jsonb;before_state text;
 begin
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 context:=msrc_staff.authorize(edition_key,array['superAdmin']);
 if context is null or (not (select bootstrap_pairing_completed from msrc_staff.policy where singleton) and msrc_staff.enrolled_super_admin_count(edition_key)<2 and action not in ('reset_account','reset_authenticator')) or target_actor is null or action not in ('set_roles','suspend','reactivate','revoke_sessions','reset_authenticator','reset_account')
 or not exists(select 1 from msrc_staff.profiles where actor_id=target_actor) or not exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor and g.edition_key=msrc_staff_admin_change.edition_key and g.role_name<>'participant') then
 if action in ('set_roles','suspend','reactivate','revoke_sessions','reset_authenticator','reset_account') then perform msrc_staff.record(edition_key,action,target_actor,'denied');end if;
 return jsonb_build_object('state','denied');end if;
 perform 1 from msrc_authorization.account_access a where a.actor_id=target_actor for update;
 select coalesce(jsonb_agg(distinct g.role_name),'[]') into before_roles from msrc_authorization.role_grants g where g.actor_id=target_actor and g.edition_key=msrc_staff_admin_change.edition_key and g.state='active' and g.role_name<>'participant';
 select a.state into before_state from msrc_authorization.account_access a where a.actor_id=target_actor;
 target_super:=exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor and g.edition_key=msrc_staff_admin_change.edition_key and g.role_name='superAdmin' and g.state='active');
 if (action='set_roles' and (roles is null or (cardinality(roles)>0 and not msrc_staff.roles_valid(roles))))
 or (target_actor=performer and (action in ('suspend','reset_authenticator','reset_account') or (action='set_roles' and target_super and not 'superAdmin'=any(roles))))
 or (action='reset_authenticator' and not exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor and g.role_name='superAdmin' and g.state='active')) then
 perform msrc_staff.record(edition_key,action,target_actor,'denied');return jsonb_build_object('state','denied');end if;
 if action='suspend' or (action='set_roles' and target_super and not 'superAdmin'=any(roles)) then
 for edition in select distinct g.edition_key from msrc_authorization.role_grants g where g.actor_id=target_actor and g.role_name='superAdmin' and g.state='active' loop
 if action='set_roles' and edition<>edition_key then continue;end if;
 count_active:=msrc_staff.active_super_admin_count(edition);
 if count_active<=2 then perform msrc_staff.record(edition_key,action,target_actor,'denied');return jsonb_build_object('state','denied');end if;
 end loop;
 end if;
 if action='set_roles' then
 update msrc_authorization.role_grants set state='revoked',revoked_at=clock_timestamp(),revocation_reason='Staff roles changed'
 where actor_id=target_actor and msrc_authorization.role_grants.edition_key=msrc_staff_admin_change.edition_key and state='active' and role_name<>'participant' and not role_name=any(roles);
 foreach r in array roles loop
 insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values(target_actor,edition_key,r,'edition','Staff roles changed') on conflict do nothing;
 end loop;
 elsif action='suspend' then update msrc_authorization.account_access set state='suspended' where actor_id=target_actor;
 elsif action='reactivate' then update msrc_authorization.account_access set state='active' where actor_id=target_actor;
 elsif action='revoke_sessions' then perform msrc_staff.revoke(target_actor,performer);
 else
 if operation_id is null or exists(select 1 from msrc_staff.admin_operations o where o.target_actor_id=target_actor and o.state='pending' and o.expires_at>clock_timestamp()) then
 perform msrc_staff.record(edition_key,action,target_actor,'denied');return jsonb_build_object('state','denied');end if;
 update msrc_staff.admin_operations set state='failed' where target_actor_id=target_actor and state='pending';
 insert into msrc_staff.admin_operations(id,performer_actor_id,target_actor_id,edition_key,action) values(operation_id,performer,target_actor,edition_key,action);
 perform msrc_staff.revoke(target_actor,performer,'factor_reset');
 insert into msrc_staff.audit(edition_key,action,target_id,result,actor_id,details) values(edition_key,action,target_actor,'reserved',performer,jsonb_build_object('reason','other_super_admin_requested'));return jsonb_build_object('state','reserved','operationId',operation_id);
 end if;
 insert into msrc_staff.audit(edition_key,action,target_id,result,actor_id,details) values(edition_key,action,target_actor,'completed',performer,jsonb_build_object('previousRoles',before_roles,'newRoles',case when action='set_roles' then to_jsonb(roles) else before_roles end,'previousStatus',before_state,'newStatus',case when action='suspend' then 'suspended' when action='reactivate' then 'active' else before_state end));
 return jsonb_build_object('state','completed');end$$;
create function public.msrc_staff_admin_operation(operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare operation msrc_staff.admin_operations%rowtype;email text;factors jsonb;roles jsonb;
 begin
 select o.* into operation from msrc_staff.admin_operations o where o.id=operation_id;
 if not msrc_staff.ready() or not found or operation.state<>'pending' or operation.expires_at<=clock_timestamp() then return jsonb_build_object('state','denied');end if;
 select u.email into email from auth.users u where u.id=operation.target_actor_id;
 select coalesce(jsonb_agg(f.id),'[]') into factors from auth.mfa_factors f where f.user_id=operation.target_actor_id and f.factor_type::text='totp';
 select coalesce(jsonb_agg(distinct g.role_name),'[]') into roles from msrc_authorization.role_grants g where g.actor_id=operation.target_actor_id and g.edition_key=operation.edition_key and g.state='active' and g.role_name<>'participant';
 return jsonb_build_object('state','reserved','operationId',operation.id,'actorId',operation.target_actor_id,'email',email,'factorIds',factors,'roles',roles,'action',operation.action,'editionKey',operation.edition_key);
 end$$;
create function public.msrc_staff_admin_complete(operation_id uuid,succeeded boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare operation msrc_staff.admin_operations%rowtype;
 begin
 select o.* into operation from msrc_staff.admin_operations o where o.id=operation_id for update;
 if not msrc_staff.ready() or not found or operation.state<>'pending' then return jsonb_build_object('state','denied');end if;
 succeeded:=coalesce(succeeded,false) and operation.expires_at>clock_timestamp() and (operation.action<>'reset_account' or operation.credential_applied)
 and not exists(select 1 from auth.mfa_factors f where f.user_id=operation.target_actor_id and f.factor_type::text='totp');
 update msrc_staff.admin_operations set state=case when succeeded then 'completed' else 'failed' end where id=operation_id;
 perform msrc_staff.record(operation.edition_key,'admin_complete',operation.target_actor_id,case when succeeded then 'completed' else 'failed' end,operation.performer_actor_id);
 return jsonb_build_object('state',case when succeeded then 'completed' else 'denied' end);
 end$$;
create function public.msrc_staff_people(edition_key text,search text default '') returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare rows jsonb;invitations jsonb;
 begin
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then perform msrc_staff.record(edition_key,'people_read',null,'denied');return null;end if;
 if char_length(search)>200 then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows from (select p.actor_id as "actorId",p.name,u.email,a.state as status,p.last_sign_in_at as "lastSignIn",
 (select coalesce(jsonb_agg(distinct g.role_name),'[]') from msrc_authorization.role_grants g where g.actor_id=p.actor_id and g.edition_key=msrc_staff_people.edition_key and g.state='active' and g.role_name<>'participant') as roles
 from msrc_staff.profiles p join auth.users u on u.id=p.actor_id join msrc_authorization.account_access a on a.actor_id=p.actor_id
 where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=p.actor_id and g.edition_key=msrc_staff_people.edition_key and g.role_name<>'participant')
 and (search='' or strpos(lower(p.name),lower(search))>0 or strpos(lower(u.email),lower(search))>0) order by p.created_at desc,p.actor_id limit 50) q;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into invitations from (select i.id,i.email,i.roles,
 case when i.state in ('pending','claiming') and i.expires_at<=clock_timestamp() then 'expired' when i.state='claiming' then 'pending' else i.state end as status,i.expires_at as "expiresAt"
 from msrc_staff.invitations i where i.edition_key=msrc_staff_people.edition_key and (search='' or strpos(lower(i.email),lower(search))>0) order by i.created_at desc limit 50) q;
 perform msrc_staff.record(edition_key,'people_read',null,'allowed');return jsonb_build_object('staff',rows,'invitations',invitations);end$$;
create function public.msrc_staff_audit(edition_key text,search text default '') returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare rows jsonb;
 begin
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then perform msrc_staff.record(edition_key,'audit_read',null,'denied');return null;end if;
 if char_length(search)>200 then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows from (select a.id,a.actor_id as "actorId",a.target_id as "targetId",a.action,a.result,a.occurred_at as "occurredAt",
 p.name as "actorName",t.name as "targetName",a.details from (
 select s.id,s.actor_id,s.target_id,s.action,s.result,s.occurred_at,s.details from msrc_staff.audit s where s.edition_key=msrc_staff_audit.edition_key
 or (s.edition_key is null and exists(select 1 from msrc_authorization.role_grants g where g.actor_id=coalesce(s.actor_id,s.target_id) and g.edition_key=msrc_staff_audit.edition_key))
 union all select g.id,null::uuid,g.actor_id,g.event,'completed',g.occurred_at,
 jsonb_build_object('role',g.role_name,'scope',g.scope_kind,'source','grant') from msrc_authorization.grant_audit g where g.edition_key=msrc_staff_audit.edition_key
 union all select s.id,s.performed_by_actor_id,s.actor_id,s.event,'completed',s.occurred_at,
 jsonb_build_object('cause',s.cause,'source','session') from msrc_sessions.security_audit s where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=s.actor_id and g.edition_key=msrc_staff_audit.edition_key)
 union all select e.id,e.actor_id,e.actor_id,e.event,case when e.event in ('challenge.failed','challenge.denied','challenge.expired','challenge.locked') then 'denied' else 'completed' end,e.occurred_at,
 jsonb_build_object('source','staff_email') from msrc_staff_email.audit e where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=e.actor_id and g.edition_key=msrc_staff_audit.edition_key)
 ) a left join msrc_staff.profiles p on p.actor_id=a.actor_id left join msrc_staff.profiles t on t.actor_id=a.target_id
 where search='' or strpos(lower(a.action||' '||a.result||' '||coalesce(p.name,'')||' '||coalesce(t.name,'')),lower(search))>0
 order by a.occurred_at desc,a.id limit 50) q;
 perform msrc_staff.record(edition_key,'audit_read',null,'allowed');return jsonb_build_object('rows',rows);end$$;
create function public.msrc_staff_participants(edition_key text,search text default '') returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare rows jsonb;
 begin
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then perform msrc_staff.record(edition_key,'participants_read',null,'denied');return null;end if;
 if char_length(search)>200 then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows from (select p.actor_id as "actorId",p.name,u.email,
 case when a.state='suspended' then 'suspended' when u.email_confirmed_at is null then 'unverified' else 'verified' end as status,p.created_at as "createdAt",null::text as "identityMasked"
 from msrc_participant.profiles p join auth.users u on u.id=p.actor_id join msrc_authorization.account_access a on a.actor_id=p.actor_id
 where u.deleted_at is null and (search='' or strpos(lower(p.name),lower(search))>0 or strpos(lower(u.email),lower(search))>0)
 order by p.created_at desc,p.actor_id limit 50) q;
 perform msrc_staff.record(edition_key,'participants_read',null,'allowed');return jsonb_build_object('rows',rows);end$$;
create function public.msrc_staff_identity_reveal(edition_key text,target_actor uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 begin
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then perform msrc_staff.record(edition_key,'identity_reveal',target_actor,'denied');return jsonb_build_object('state','denied');end if;
 -- The registration build owns the future identifier field, encryption and retention.
 -- This explicit audited boundary exists now, and never invents identity data.
 perform msrc_staff.record(edition_key,'identity_reveal',target_actor,'unavailable');return jsonb_build_object('state','unavailable');end$$;
-- Operator-only bootstrap: first native account already created with a privately
-- supplied email/random password. No native TOTP => every initial session requires
-- enrollment. Only invitation of the second is available while one SA exists.
create function msrc_staff.bootstrap_reserve(actor_id uuid,email text) returns void
 language plpgsql security invoker set search_path='' as $$
#variable_conflict use_variable
 begin
 if current_user<>'postgres' or session_user<>'postgres' then raise exception using errcode='42501',message='Named native operator required.';end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 if exists(select 1 from msrc_staff.profiles) or (select bootstrap_completed from msrc_staff.policy where singleton)
 or exists(select 1 from auth.users u where u.email=bootstrap_reserve.email) then raise exception using errcode='55000',message='Bootstrap is first-account only.';end if;
 insert into msrc_staff.bootstrap_reservations(actor_id,email) values(actor_id,lower(btrim(email)));
 end$$;
create function msrc_staff.bootstrap_first(actor_id uuid,edition_key text,name text) returns void
 language plpgsql security invoker set search_path='' as $$
#variable_conflict use_variable
 begin
 if current_user<>'postgres' or session_user<>'postgres' then raise exception using errcode='42501',message='Named native operator required.';end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 if exists(select 1 from msrc_staff.profiles) or (select bootstrap_completed from msrc_staff.policy where singleton)
 or not exists(select 1 from auth.users u where u.id=bootstrap_first.actor_id and u.email_confirmed_at is not null
 and coalesce(u.encrypted_password,'')<>'' and u.deleted_at is null and not u.is_anonymous)
 or exists(select 1 from auth.mfa_factors f where f.user_id=bootstrap_first.actor_id and f.status::text='verified') then
 raise exception using errcode='55000',message='First-account bootstrap prerequisites are not satisfied.';end if;
 insert into msrc_authorization.edition_config(edition_key) values(edition_key) on conflict do nothing;
 insert into msrc_staff.profiles(actor_id,name) values(actor_id,name);
 insert into msrc_authorization.account_access(actor_id,state,individually_identified) values(actor_id,'active',true) on conflict on constraint account_access_pkey do update set state='active',individually_identified=true;
 insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason) values(actor_id,edition_key,'superAdmin','edition','Named operator first-account bootstrap');
 update msrc_staff.policy set bootstrap_completed=true where singleton;
 perform msrc_staff.record(edition_key,'bootstrap',actor_id,'completed',actor_id);
 end$$;
create or replace function public.msrc_staff_email_begin(actor_id uuid,session_id uuid,challenge_id uuid,code_hash text,ip_hash text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare evidence jsonb; observed_at timestamptz; expires_at timestamptz;
begin
  if exists(select 1 from msrc_staff.profiles p where p.actor_id=actor_id) then
    if not msrc_staff.ready() then return jsonb_build_object('state','denied','code','ineligible');end if;
    perform pg_advisory_xact_lock(hashtextextended('staff-email-volume',0));
    if (select count(*) from msrc_staff.invitations i where i.created_at>clock_timestamp()-interval '24 hours')
      +(select count(*) from msrc_staff_email.challenges c join msrc_staff.profiles p on p.actor_id=c.actor_id where c.created_at>clock_timestamp()-interval '24 hours')
      >= (select email_daily_limit from msrc_staff.policy where singleton) then return jsonb_build_object('state','denied','code','retry_limited');end if;
  end if;
  if actor_id is null or session_id is null or challenge_id is null
    or code_hash is null or code_hash !~ '^[0-9a-f]{64}$' or ip_hash is null or ip_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('state','denied','code','invalid_request'); end if;
  evidence := msrc_staff_email.basis(actor_id,session_id);
  if evidence is null then return jsonb_build_object('state','denied','code','ineligible'); end if;
  if msrc_staff_email.valid_receipt(actor_id,session_id) then
    return jsonb_build_object('state','denied','code','already_verified'); end if;
  -- Account row lock serializes account reservations; this shared IP lock spans actors.
  perform pg_advisory_xact_lock(hashtextextended('msrc.staff.email.ip:'||ip_hash,0));
  -- Lock waits never freeze the clock or let expiry/rate decisions use request start.
  evidence := msrc_staff_email.basis(actor_id,session_id);
  if evidence is null then return jsonb_build_object('state','denied','code','ineligible'); end if;
  observed_at := clock_timestamp();
  if exists(select 1 from msrc_staff_email.challenges c where c.id=challenge_id) then
    return jsonb_build_object('state','denied','code','invalid_request'); end if;
  if exists(select 1 from msrc_staff_email.challenges c where c.actor_id=actor_id
      and (c.created_at > observed_at-interval '60 seconds' or c.cooldown_until > observed_at))
    or (select count(*) from msrc_staff_email.challenges c where c.actor_id=actor_id
      and c.created_at > observed_at-interval '15 minutes') >= 3
    or (select count(*) from msrc_staff_email.challenges c where c.actor_id=actor_id
      and c.created_at > observed_at-interval '24 hours') >= 10
    or (select count(*) from msrc_staff_email.challenges c where c.ip_hash=ip_hash
      and c.created_at > observed_at-interval '1 hour') >= 20 then
    return jsonb_build_object('state','denied','code','retry_limited'); end if;
  update msrc_staff_email.challenges c set state='superseded'
    where c.actor_id=actor_id and c.state in ('pending','sent');
  expires_at := observed_at+interval '5 minutes';
  insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at)
    values(challenge_id,actor_id,session_id,evidence->>'binding',code_hash,ip_hash,observed_at,expires_at);
  return jsonb_build_object('state','issued','challengeId',challenge_id,'recipient',evidence->>'recipient','expiresAt',expires_at);
end; $$;
revoke all on all functions in schema msrc_staff from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_status(),public.msrc_staff_form_claim(text,text),public.msrc_staff_login_begin(uuid,text,text),
 public.msrc_staff_login_finish(uuid,uuid,uuid),public.msrc_staff_auth_event(uuid,uuid,text,text),public.msrc_staff_profile(text),
 public.msrc_staff_invite_begin(text,text,text[],uuid,text),public.msrc_staff_invite_delivery(uuid,boolean),public.msrc_staff_invite_revoke(text,uuid),
 public.msrc_staff_invite_consume(uuid,text,uuid,uuid,text),public.msrc_staff_invite_complete(uuid,boolean),
 public.msrc_staff_admin_change(text,uuid,text,text[],uuid),public.msrc_staff_admin_operation(uuid),public.msrc_staff_admin_complete(uuid,boolean),
 public.msrc_staff_people(text,text),public.msrc_staff_audit(text,text),public.msrc_staff_participants(text,text),public.msrc_staff_identity_reveal(text,uuid)
 from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_status(),public.msrc_staff_form_claim(text,text),public.msrc_staff_login_begin(uuid,text,text),
 public.msrc_staff_login_finish(uuid,uuid,uuid),public.msrc_staff_auth_event(uuid,uuid,text,text),public.msrc_staff_invite_delivery(uuid,boolean),
 public.msrc_staff_invite_consume(uuid,text,uuid,uuid,text),public.msrc_staff_invite_complete(uuid,boolean),public.msrc_staff_admin_operation(uuid),public.msrc_staff_admin_complete(uuid,boolean)
 to service_role;
grant execute on function public.msrc_staff_profile(text),public.msrc_staff_invite_begin(text,text,text[],uuid,text),public.msrc_staff_invite_revoke(text,uuid),
 public.msrc_staff_admin_change(text,uuid,text,text[],uuid),public.msrc_staff_people(text,text),public.msrc_staff_audit(text,text),public.msrc_staff_participants(text,text),public.msrc_staff_identity_reveal(text,uuid)
 to authenticated;
