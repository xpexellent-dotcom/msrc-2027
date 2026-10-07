-- BL-AUTH-05/06, AUTH-04/05, SEC-01/06. Ordinary authenticated OWNER password
-- change is separate from lost-access recovery. No user/factor/email is seeded.
-- Both this independent database gate and the server gate default closed.
alter table msrc_staff.policy add column password_change_enabled boolean not null default false;
alter table msrc_staff.audit drop constraint audit_action_check;
alter table msrc_staff.audit add constraint audit_action_check check(action in (
 'bootstrap','invite','invite_delivery','invite_revoke','invite_consume','invite_complete',
 'sign_in','set_roles','suspend','reactivate','revoke_sessions','reset_authenticator','reset_account','admin_complete',
 'people_read','audit_read','participants_read','identity_reveal','totp_enroll','totp_challenge','totp_verify','password_change'));

create table msrc_staff.password_changes (
 id uuid primary key, actor_id uuid not null references auth.users(id) on delete restrict,
 session_id uuid not null, edition_key text not null references msrc_authorization.edition_config(edition_key),
 factor_id uuid not null, factor_updated_at timestamptz not null,
 identity_revision bigint not null check(identity_revision>0),
 password_at timestamptz not null, totp_at timestamptz not null,
 created_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 state text not null default 'pending' check(state in ('pending','applying','confirmed','completed','failed')),
 native_transaction xid8, completed_at timestamptz,
 check(expires_at=created_at+interval '2 minutes'),
 check((state in ('applying','confirmed','completed'))=(native_transaction is not null)),
 check((state in ('completed','failed'))=(completed_at is not null))
);
create unique index staff_password_one_pending on msrc_staff.password_changes(actor_id)
 where state in ('pending','applying','confirmed');
alter table msrc_staff.password_changes enable row level security;
alter table msrc_staff.password_changes force row level security;
revoke all on msrc_staff.password_changes from public,anon,authenticated,service_role;
comment on table msrc_staff.password_changes is 'Private two-minute owner reservation. No password/hash, token, email, TOTP secret/code or signed claims. Same native transaction must confirm a protected transient marker before committing.';

create function msrc_staff.password_change_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if current_user<>'postgres' then raise exception using errcode='42501',message='Private password-change maintenance required.';end if;
 if tg_op in ('DELETE','TRUNCATE') then raise exception using errcode='55000',message='Password-change history is immutable.';end if;
 if tg_op='INSERT' then
  if new.state<>'pending' or new.native_transaction is not null or new.completed_at is not null then
   raise exception using errcode='55000',message='Initial password reservation required.';end if;
 elsif (to_jsonb(new)-array['state','native_transaction','completed_at'])
   is distinct from (to_jsonb(old)-array['state','native_transaction','completed_at'])
  or not ((old.state='pending' and new.state in ('applying','failed'))
   or (old.state='applying' and new.state='confirmed') or (old.state='confirmed' and new.state='completed'))
  or (old.native_transaction is not null and new.native_transaction is distinct from old.native_transaction) then
  raise exception using errcode='55000',message='Monotonic password-change transition required.';
 end if;
 return new;
end$$;
create trigger staff_password_change_guard before insert or update or delete on msrc_staff.password_changes
 for each row execute function msrc_staff.password_change_guard();
create trigger staff_password_change_no_truncate before truncate on msrc_staff.password_changes
 for each statement execute function msrc_staff.password_change_guard();

-- Native Auth already owns the user row while entering its BEFORE trigger.
-- NOWAIT authority locks prevent inversion with account->user context checkers:
-- contention rejects the write, without retries or weakened assurance.
create function msrc_staff.password_change_basis(target_actor uuid,target_session uuid,edition text)
 returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s auth.sessions%rowtype; f auth.mfa_factors%rowtype;
 a msrc_authorization.account_access%rowtype; p msrc_staff.profiles%rowtype;
 r msrc_staff_email.identity_revision%rowtype; lifecycle msrc_sessions.session_state%rowtype;
 password_at timestamptz;totp_at timestamptz; observed_at timestamptz;
 cutoff timestamptz; policy msrc_sessions.policy%rowtype;
begin
 perform 1 from msrc_staff.policy where singleton and enabled and email_daily_limit is not null and password_change_enabled for share nowait;
 if not found then return null;end if;
 select x.* into a from msrc_authorization.account_access x where x.actor_id=target_actor for share nowait;
 if not found or a.state<>'active' or not a.individually_identified then return null;end if;
 select x.* into p from msrc_staff.profiles x where x.actor_id=target_actor for share nowait;
 if not found or p.recovery_state<>'none' then return null;end if;
 perform 1 from msrc_authorization.role_grants g where g.actor_id=target_actor and g.edition_key=edition
  and g.role_name='superAdmin' and g.scope_kind='edition' and g.state='active' for share nowait;
 if not found then return null;end if;
 select x.* into s from auth.sessions x where x.id=target_session and x.user_id=target_actor for share nowait;
 if not found or s.aal::text<>'aal2' then return null;end if;
 select x.* into f from auth.mfa_factors x where x.id=s.factor_id and x.user_id=target_actor for share nowait;
 if not found or f.factor_type::text<>'totp' or f.status::text<>'verified' then return null;end if;
 select x.* into r from msrc_staff_email.identity_revision x where x.actor_id=target_actor;
 if not found then return null;end if;
 select x.* into lifecycle from msrc_sessions.session_state x where x.session_id=target_session for share nowait;
 if not found or lifecycle.actor_id<>target_actor or lifecycle.started_at<>s.created_at or lifecycle.revoked_at is not null then return null;end if;
 select x.* into policy from msrc_sessions.policy x where x.singleton;
 select x.revoked_before into cutoff from msrc_sessions.actor_revocations x where x.actor_id=target_actor;
 select max(x.updated_at::timestamptz) filter(where x.authentication_method='password'),
  max(x.updated_at::timestamptz) filter(where x.authentication_method='totp') into password_at,totp_at
  from auth.mfa_amr_claims x where x.session_id=target_session;
 observed_at:=clock_timestamp();
 if password_at is null or totp_at is null or password_at<s.created_at
  or password_at<observed_at-interval '2 minutes' or password_at>observed_at
  or totp_at<greatest(password_at,f.created_at,f.updated_at,s.created_at)
  or totp_at<observed_at-interval '2 minutes' or totp_at>observed_at
  or (r.password_changed_at is not null and password_at<r.password_changed_at)
  or (s.not_after is not null and s.not_after<=observed_at) or s.created_at<=cutoff
  or lifecycle.last_activity_at>observed_at
  or observed_at>=lifecycle.started_at+make_interval(secs=>policy.privileged_absolute_seconds)
  or observed_at>=lifecycle.last_activity_at+make_interval(secs=>policy.privileged_idle_seconds)
  or not exists(select 1 from auth.users u where u.id=target_actor and u.email_confirmed_at is not null
   and coalesce(u.encrypted_password,'')<>'' and u.deleted_at is null and not u.is_anonymous
   and coalesce(u.phone,'')='' and (u.banned_until is null or u.banned_until<=observed_at)) then return null;end if;
 return jsonb_build_object('revision',r.revision,'factorId',f.id,'factorUpdatedAt',f.updated_at,
  'passwordAt',password_at,'totpAt',totp_at);
exception when lock_not_available then return null;
end$$;

create function public.msrc_staff_password_change_begin(edition_key text,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare context jsonb; basis jsonb; actor uuid:=auth.uid();sid uuid;observed_at timestamptz;
begin
 if not msrc_staff.ready() or not (select password_change_enabled from msrc_staff.policy where singleton) then
  perform msrc_staff.record(edition_key,'password_change',actor,'denied',actor);
  return jsonb_build_object('state','denied');end if;
 context:=msrc_staff.authorize(edition_key,array['superAdmin'],false);
 if context is not null then sid:=(context#>>'{principal,sessionId}')::uuid;end if;
 if operation_id is null or context is null then
  perform msrc_staff.record(edition_key,'password_change',actor,'denied',actor);
  return jsonb_build_object('state','denied');end if;
 basis:=msrc_staff.password_change_basis(actor,sid,edition_key);
 if basis is null then perform msrc_staff.record(edition_key,'password_change',actor,'denied',actor);
  return jsonb_build_object('state','denied');end if;
 -- authorize locks the owner's account before any reservation lock. Concurrent
 -- begins for the same owner cannot create two live operations.
 update msrc_staff.password_changes set state='failed',completed_at=clock_timestamp()
  where actor_id=actor and state='pending' and expires_at<=clock_timestamp();
 if found then perform msrc_staff.record(edition_key,'password_change',actor,'failed',actor);end if;
 if exists(select 1 from msrc_staff.password_changes o where o.id=operation_id or (o.actor_id=actor and o.state in ('pending','applying','confirmed'))) then
  perform msrc_staff.record(edition_key,'password_change',actor,'denied',actor);return jsonb_build_object('state','denied');end if;
 observed_at:=clock_timestamp();
 insert into msrc_staff.password_changes(id,actor_id,session_id,edition_key,factor_id,factor_updated_at,identity_revision,password_at,totp_at,created_at,expires_at)
 values(operation_id,actor,sid,edition_key,(basis->>'factorId')::uuid,(basis->>'factorUpdatedAt')::timestamptz,
  (basis->>'revision')::bigint,(basis->>'passwordAt')::timestamptz,(basis->>'totpAt')::timestamptz,observed_at,observed_at+interval '2 minutes');
 perform msrc_staff.record(edition_key,'password_change',actor,'reserved',actor);
 return jsonb_build_object('state','reserved','operationId',operation_id,'actorId',actor,'sessionId',sid);
end$$;

-- Protected app_metadata is merely one-use transport from the server's native
-- Admin call. It is never persisted, read by a browser, or used for role grants.
-- GoTrue v2.197 writes password, deletes sessions, THEN writes app_metadata;
-- a deferred constraint proves both statements belonged to the SAME transaction.
create function msrc_staff.native_password_change() returns trigger
 language plpgsql security definer set search_path='' as $$
declare operation msrc_staff.password_changes%rowtype; basis jsonb;
 marker text:=new.raw_app_meta_data->>'msrcStaffPasswordChange';
 -- Generated confirmed_at is NULL in BEFORE-row NEW, then recomputed from the
 -- unchanged email/phone confirmation inputs. Those inputs remain compared.
 ignored text[]:=array['encrypted_password','updated_at','confirmed_at','confirmation_token','confirmation_sent_at','recovery_token','recovery_sent_at',
  'email_change_token_current','email_change_token_new','email_change_sent_at','email_change','email_change_confirm_status',
  'phone_change','phone_change_token','phone_change_sent_at','reauthentication_token','reauthentication_sent_at'];
begin
 if marker is not null then
  if tg_op<>'UPDATE' or marker!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   raise exception using errcode='42501',message='Bound owner password change required.';end if;
  select o.* into operation from msrc_staff.password_changes o where o.id=marker::uuid and o.actor_id=new.id for update;
  if not found or operation.state<>'applying' or operation.native_transaction<>pg_current_xact_id()
   or operation.expires_at<=clock_timestamp()
   or new.encrypted_password is distinct from old.encrypted_password
   or (new.raw_app_meta_data-'msrcStaffPasswordChange') is distinct from coalesce(nullif(old.raw_app_meta_data,'null'::jsonb),'{}'::jsonb)
   or (to_jsonb(new)-array['raw_app_meta_data','updated_at','confirmed_at']) is distinct from (to_jsonb(old)-array['raw_app_meta_data','updated_at','confirmed_at']) then
   raise exception using errcode='42501',message='Bound owner password change required.';end if;
  new.raw_app_meta_data:=old.raw_app_meta_data;
  update msrc_staff.password_changes set state='confirmed' where id=operation.id;
  return new;
 end if;
 if tg_op<>'UPDATE' then return new;end if;
 select o.* into operation from msrc_staff.password_changes o where o.actor_id=new.id and o.state in ('applying','confirmed') for update;
 if found then raise exception using errcode='42501',message='Only the bound confirmation statement is permitted.';end if;
 if new.encrypted_password is not distinct from old.encrypted_password then return new;end if;
 select o.* into operation from msrc_staff.password_changes o where o.actor_id=new.id and o.state='pending' for update;
 if not found then return new;end if; -- Existing invitation/peer recovery guards still own those paths.
 if msrc_staff.recovery_blocked(new.id) then
  update msrc_staff.password_changes set state='failed',completed_at=clock_timestamp() where id=operation.id;
  perform msrc_staff.record(operation.edition_key,'password_change',operation.actor_id,'failed',operation.actor_id);
  return new; -- A stale owner reservation must never obstruct authorized peer recovery.
 end if;
 basis:=msrc_staff.password_change_basis(operation.actor_id,operation.session_id,operation.edition_key);
 if basis is null or operation.expires_at<=clock_timestamp()
  or (basis->>'revision')::bigint<>operation.identity_revision
  or (basis->>'factorId')::uuid<>operation.factor_id
  or (basis->>'factorUpdatedAt')::timestamptz<>operation.factor_updated_at
  or (basis->>'passwordAt')::timestamptz<>operation.password_at or (basis->>'totpAt')::timestamptz<>operation.totp_at
  or coalesce(new.encrypted_password,'')=''
  or (to_jsonb(new)-ignored) is distinct from (to_jsonb(old)-ignored)
  or coalesce(new.confirmation_token,'')<>'' or new.confirmation_sent_at is not null
  or coalesce(new.recovery_token,'')<>'' or new.recovery_sent_at is not null
  or coalesce(new.email_change_token_current,'')<>'' or coalesce(new.email_change_token_new,'')<>'' or new.email_change_sent_at is not null
  or coalesce(new.email_change,'')<>'' or coalesce(new.email_change_confirm_status,0)<>0
  or coalesce(new.phone_change,'')<>'' or coalesce(new.phone_change_token,'')<>'' or new.phone_change_sent_at is not null
  or coalesce(new.reauthentication_token,'')<>'' or new.reauthentication_sent_at is not null then
  raise exception using errcode='42501',message='Current fresh owner password proof required.';end if;
 update msrc_staff.password_changes set state='applying',native_transaction=pg_current_xact_id() where id=operation.id;
 return new;
end$$;
create trigger a0_staff_password_change before insert or update on auth.users for each row execute function msrc_staff.native_password_change();

create function msrc_staff.complete_native_password_change() returns trigger
 language plpgsql security definer set search_path='' as $$
declare operation msrc_staff.password_changes%rowtype;
begin
 if new.encrypted_password is not distinct from old.encrypted_password then return null;end if;
 select o.* into operation from msrc_staff.password_changes o
  where o.actor_id=new.id and o.native_transaction=pg_current_xact_id() and o.state in ('applying','confirmed') for update;
 if not found then return null;end if;
 if operation.state<>'confirmed' or operation.expires_at<=clock_timestamp()
  or not msrc_staff.ready() or not (select password_change_enabled from msrc_staff.policy where singleton)
  or msrc_staff.recovery_blocked(operation.actor_id)
  or not exists(select 1 from msrc_authorization.account_access a where a.actor_id=operation.actor_id and a.state='active' and a.individually_identified)
  or not exists(select 1 from msrc_authorization.role_grants g where g.actor_id=operation.actor_id and g.edition_key=operation.edition_key
   and g.role_name='superAdmin' and g.scope_kind='edition' and g.state='active')
  or not exists(select 1 from auth.mfa_factors f where f.id=operation.factor_id and f.user_id=operation.actor_id
   and f.factor_type::text='totp' and f.status::text='verified' and f.updated_at=operation.factor_updated_at)
  or not exists(select 1 from msrc_staff_email.identity_revision r where r.actor_id=operation.actor_id
   and r.revision=operation.identity_revision+1 and r.password_changed_at>=operation.created_at)
  or exists(select 1 from auth.sessions s where s.user_id=operation.actor_id)
  or exists(select 1 from auth.users u where u.id=operation.actor_id and u.raw_app_meta_data?'msrcStaffPasswordChange') then
  raise exception using errcode='42501',message='Atomic bound owner password completion required.';end if;
 perform msrc_staff.revoke(operation.actor_id,operation.actor_id,'security');
 update msrc_staff.password_changes set state='completed',completed_at=clock_timestamp() where id=operation.id;
 perform msrc_staff.record(operation.edition_key,'password_change',operation.actor_id,'completed',operation.actor_id);
 return null;
end$$;
create constraint trigger staff_password_commit after update on auth.users deferrable initially deferred
 for each row execute function msrc_staff.complete_native_password_change();

-- Post-attempt reconciliation is service-only. A rolled-back/unused reservation
-- is terminalized, so a failed or interrupted provider attempt cannot be replayed.
create function public.msrc_staff_password_change_result(operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare operation msrc_staff.password_changes%rowtype;
begin
 select o.* into operation from msrc_staff.password_changes o where o.id=operation_id for update;
 if not found then return jsonb_build_object('state','denied');end if;
 if operation.state='pending' then
  update msrc_staff.password_changes set state='failed',completed_at=clock_timestamp() where id=operation_id;
  perform msrc_staff.record(operation.edition_key,'password_change',operation.actor_id,'failed',operation.actor_id);
 end if;
 return jsonb_build_object('state',case when operation.state='completed' then 'completed' else 'denied' end,
  'operationId',operation.id,'actorId',operation.actor_id,'sessionId',operation.session_id);
end$$;

create or replace function public.msrc_staff_status() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',enabled,'emailDailyLimit',email_daily_limit,'passwordChangeEnabled',password_change_enabled)
 from msrc_staff.policy where singleton;
$$;

-- Preserve the complete invitation/peer-recovery perimeter; only the earlier
-- provisional native trigger may admit this same-transaction owner operation.
create or replace function msrc_staff.native_identity_guard() returns trigger
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare admission msrc_staff.admissions%rowtype; bootstrap msrc_staff.bootstrap_reservations%rowtype;relevant boolean;
 begin
 if tg_op='UPDATE' and exists(select 1 from msrc_staff.password_changes o where o.actor_id=new.id and o.state in ('applying','confirmed') and o.native_transaction=pg_current_xact_id()) then return new;end if;
 if tg_op='INSERT' then
 if exists(select 1 from msrc_staff.bootstrap_reservations b where b.actor_id=new.id and b.email=new.email
 and b.expires_at>clock_timestamp() and b.applied_at is null) and not exists(select 1 from msrc_staff.profiles)
 and not (select bootstrap_completed from msrc_staff.policy where singleton) then
 -- GoTrue inserts before applying the requested email confirmation. The exact
 -- private reservation authorizes creation; bootstrap_first checks completion.
 if coalesce(new.encrypted_password,'')='' or coalesce(new.is_anonymous,false) or coalesce(new.phone,'')<>'' then
 raise exception using errcode='42501',message='Bootstrap native prerequisites required.';end if;
 update msrc_staff.bootstrap_reservations set applied_at=clock_timestamp(),native_transaction=pg_current_xact_id() where actor_id=new.id;
 return new;
 end if;
 select a.* into admission from msrc_staff.admissions a where a.actor_id=new.id and a.state='pending' for update;
 if not found then return new; end if;
 relevant:=true;
 else
 relevant:=new.email is distinct from old.email or new.email_confirmed_at is distinct from old.email_confirmed_at or new.encrypted_password is distinct from old.encrypted_password;
 if not relevant then return new; end if;
 select b.* into bootstrap from msrc_staff.bootstrap_reservations b where b.actor_id=new.id and b.applied_at is not null;
 if found and not exists(select 1 from msrc_staff.profiles p where p.actor_id=new.id) then
 if bootstrap.native_transaction<>pg_current_xact_id() or bootstrap.expires_at<=clock_timestamp()
 or bootstrap.email is distinct from new.email or coalesce(new.encrypted_password,'')='' or coalesce(new.is_anonymous,false)
 or coalesce(new.phone,'')<>'' then raise exception using errcode='42501',message='Bound native bootstrap transaction required.';end if;
 return new;end if;
 select a.* into admission from msrc_staff.admissions a where a.actor_id=new.id and a.state in ('pending','applied') for update;
 if found and admission.state='applied' and admission.native_transaction<>pg_current_xact_id() then
 raise exception using errcode='42501',message='Bound native invitation transaction required.';end if;
 if not found then
 if not exists(select 1 from msrc_staff.profiles p where p.actor_id=new.id) then return new; end if;
 if new.email is not distinct from old.email and new.email_confirmed_at is not distinct from old.email_confirmed_at
 and exists(select 1 from msrc_staff.admin_operations o join msrc_staff.profiles p on p.actor_id=o.target_actor_id
 where o.target_actor_id=new.id and o.action='reset_account' and o.state='pending' and o.expires_at>clock_timestamp()
 and p.recovery_operation=o.id and p.recovery_state='pending') then
 update msrc_staff.admin_operations set credential_applied=true,native_transaction=pg_current_xact_id() where target_actor_id=new.id and action='reset_account' and state='pending';
 return new; end if;
 raise exception using errcode='42501',message='Staff identity recovery requires another Super Admin.';
 end if;
 end if;
 if msrc_staff.recovery_blocked(new.id) and not exists(select 1 from msrc_staff.profiles p
 join msrc_staff.invitations i on i.id=admission.invitation_id
 join msrc_staff.admin_operations o on o.id=i.recovery_operation
 where p.actor_id=new.id and p.recovery_state='awaiting_invitation' and p.recovery_action='reset_account'
 and p.recovery_operation=i.recovery_operation and o.state='completed' and i.state='claiming') then
 raise exception using errcode='42501',message='Current approved recovery invitation required.';end if;
 if not msrc_staff.ready() or admission.expires_at<=clock_timestamp() or admission.email is distinct from new.email
 or (tg_op='UPDATE' and new.email_confirmed_at is null) or coalesce(new.encrypted_password,'')='' or coalesce(new.is_anonymous,false)
 or coalesce(new.phone,'')<>'' then raise exception using errcode='42501',message='Staff invitation admission required.'; end if;
 update msrc_staff.admissions set state='applied',native_transaction=pg_current_xact_id() where id=admission.id;
 return new;
 end$$;

create or replace function msrc_participant.guard_native_identity() returns trigger
language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare operation msrc_participant.operations%rowtype; revision bigint; relevant boolean; marker text;
begin
  if exists(select 1 from msrc_staff.password_changes o where o.actor_id=new.id and o.state in ('applying','confirmed') and o.native_transaction=pg_current_xact_id()) then return new;end if;
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

revoke all on function msrc_staff.password_change_guard(),msrc_staff.password_change_basis(uuid,uuid,text),msrc_staff.native_password_change(),msrc_staff.complete_native_password_change() from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_password_change_begin(text,uuid),public.msrc_staff_password_change_result(uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_password_change_begin(text,uuid) to authenticated;
grant execute on function public.msrc_staff_password_change_result(uuid) to service_role;
notify pgrst, 'reload schema';
