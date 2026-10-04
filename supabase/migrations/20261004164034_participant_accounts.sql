-- BL-AUTH-02/03/04/06/08; AUTH-01/02/03/05/06, ORG-016/019, PRV-01/02.
-- REVIEW ONLY. No hosted apply, approved legal text, identity, mail or activation.
-- Supabase owns password hashing. Only keyed OTP/IP/email digests enter our tables.
create schema msrc_participant;
revoke all on schema msrc_participant from public,anon,authenticated,service_role;
alter default privileges in schema msrc_participant revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema msrc_participant revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges in schema msrc_participant revoke execute on functions from public,anon,authenticated,service_role;

create table msrc_participant.policy (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false,
  privacy_version text check(privacy_version is null or (privacy_version=btrim(privacy_version) and char_length(privacy_version) between 1 and 128)),
  email_daily_limit integer check(email_daily_limit is null or email_daily_limit between 1 and 100000)
);
insert into msrc_participant.policy(singleton) values(true);
comment on table msrc_participant.policy is 'Reviewed release configuration only. FALSE/null/null defaults; privacy_version must identify genuinely approved EN/AR notice. Email budget is shared-provider capacity, never an approval or public capacity claim.';

create table msrc_participant.admissions (
  id uuid primary key, actor_id uuid not null unique,
  email text not null check(email=lower(btrim(email)) and char_length(email) between 3 and 254),
  name text not null check(name=btrim(name) and char_length(name) between 1 and 120),
  privacy_version text not null,
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);
create table msrc_participant.profiles (
  actor_id uuid primary key references auth.users(id) on delete restrict,
  name text not null check(name=btrim(name) and char_length(name) between 1 and 120),
  privacy_version text not null,
  state text not null default 'pending' check(state in ('pending','verified')),
  created_at timestamptz not null default clock_timestamp()
);
create table msrc_participant.notice_receipts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references msrc_participant.profiles(actor_id) on delete restrict,
  privacy_version text not null,
  accepted_at timestamptz not null,
  admission_id uuid references msrc_participant.admissions(id) on delete restrict,
  challenge_id uuid,
  check((admission_id is null) <> (challenge_id is null))
);
create table msrc_participant.challenges (
  id uuid primary key,
  actor_id uuid not null references msrc_participant.profiles(actor_id) on delete restrict,
  purpose text not null check(purpose in ('verify_email','reset_password')),
  recipient text not null,
  identity_revision bigint not null,
  code_hash text not null check(code_hash ~ '^[a-f0-9]{64}$'),
  email_hash text not null check(email_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text not null check(ip_hash ~ '^[a-f0-9]{64}$'),
  name text, privacy_version text,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  state text not null default 'pending' check(state in ('pending','sent','consumed','superseded','expired','failed','locked')),
  failed_attempts integer not null default 0 check(failed_attempts between 0 and 5),
  cooldown_until timestamptz,
  check(expires_at=created_at+interval '10 minutes'),
  check((purpose='verify_email' and name is not null and privacy_version is not null) or (purpose='reset_password' and name is null and privacy_version is null))
);
create index participant_challenge_actor on msrc_participant.challenges(actor_id,created_at desc);
create index participant_challenge_day on msrc_participant.challenges(created_at);
create unique index participant_challenge_newest on msrc_participant.challenges(actor_id,purpose) where state in ('pending','sent');
alter table msrc_participant.notice_receipts add foreign key(challenge_id) references msrc_participant.challenges(id) on delete restrict;
create table msrc_participant.operations (
  id uuid primary key,
  actor_id uuid not null references msrc_participant.profiles(actor_id) on delete restrict,
  challenge_id uuid not null unique references msrc_participant.challenges(id) on delete restrict,
  purpose text not null check(purpose in ('verify_email','reset_password')),
  recipient text not null,
  identity_revision bigint not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  transaction_id xid8,
  applied_at timestamptz,
  state text not null default 'pending' check(state in ('pending','applied','completed','failed')),
  check(expires_at=created_at+interval '2 minutes'),
  check(state not in ('applied','completed') or applied_at is not null)
);
create unique index participant_one_operation on msrc_participant.operations(actor_id) where state in ('pending','applied');
create table msrc_participant.limit_events (
  id bigint generated always as identity primary key,
  kind text not null check(kind in ('form','issue_email','issue_ip','consume_ip')),
  subject_hash text not null check(subject_hash ~ '^[a-f0-9]{64}$'),
  nonce_hash text check(nonce_hash is null or nonce_hash ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz not null default clock_timestamp()
);
create unique index participant_form_single_use on msrc_participant.limit_events(nonce_hash) where kind='form';
create index participant_limits_lookup on msrc_participant.limit_events(kind,subject_hash,occurred_at desc);
create table msrc_participant.login_attempts (
  id uuid primary key,
  email_hash text not null check(email_hash ~ '^[a-f0-9]{64}$'),
  ip_hash text not null check(ip_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  state text not null default 'pending' check(state in ('pending','failed','admitted'))
);
create index participant_login_email on msrc_participant.login_attempts(email_hash,created_at desc);
create index participant_login_ip on msrc_participant.login_attempts(ip_hash,created_at desc);
create table msrc_participant.session_receipts (
  session_id uuid primary key,
  actor_id uuid not null references msrc_participant.profiles(actor_id) on delete restrict,
  identity_revision bigint not null,
  native_started_at timestamptz not null,
  password_at timestamptz not null,
  admitted_at timestamptz not null default clock_timestamp()
);
create index participant_receipt_actor on msrc_participant.session_receipts(actor_id);
create table msrc_participant.audit (
  id uuid primary key default gen_random_uuid(), actor_id uuid, session_id uuid, challenge_id uuid,
  event text not null check(event in ('account.created','challenge.issued','challenge.sent','challenge.failed','challenge.consumed','identity.applied','identity.completed','identity.failed','session.admitted')),
  occurred_at timestamptz not null default clock_timestamp()
);
comment on table msrc_participant.audit is 'Append-only safe UUIDs/enums only: never email, name, code, password, token, keyed digest, IP, provider payload or legal text.';
comment on table msrc_participant.operations is 'Private one-use mailbox proof authorizes a single native Auth transaction. No app_metadata mutation nonce; no custom password hash; grant promotion waits until completion/expiry.';

do $$declare t text; begin
  foreach t in array array['policy','admissions','profiles','notice_receipts','challenges','operations','limit_events','login_attempts','session_receipts','audit'] loop
    execute format('alter table msrc_participant.%I enable row level security',t);
    execute format('alter table msrc_participant.%I force row level security',t);
  end loop;
end$$;
revoke all on all tables in schema msrc_participant from public,anon,authenticated,service_role;
revoke all on all sequences in schema msrc_participant from public,anon,authenticated,service_role;

create function msrc_participant.ready() returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce((select enabled and privacy_version is not null and email_daily_limit is not null from msrc_participant.policy where singleton),false);
$$;
create function msrc_participant.participant_only(target_actor uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select not exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor and g.state='active' and g.role_name<>'participant');
$$;
create function msrc_participant.audit_immutable() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op<>'INSERT' or current_user<>'postgres' then raise exception using errcode='55000',message='Security evidence is append-only.'; end if;
  return new;
end$$;
create trigger participant_audit_immutable before insert or update or delete on msrc_participant.audit for each row execute function msrc_participant.audit_immutable();
create trigger participant_notice_immutable before update or delete on msrc_participant.notice_receipts for each row execute function msrc_participant.audit_immutable();
create trigger participant_audit_no_truncate before truncate on msrc_participant.audit for each statement execute function msrc_participant.audit_immutable();
create trigger participant_notice_no_truncate before truncate on msrc_participant.notice_receipts for each statement execute function msrc_participant.audit_immutable();

-- Native Auth owns its user row. NEVER lock account_access/session/grant rows here.
-- Conditional admission preserves existing independently managed staff identities.
create function msrc_participant.admit_native_user() returns trigger
language plpgsql security definer set search_path='' as $$
declare admission msrc_participant.admissions%rowtype; marker text;
begin
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
create function msrc_participant.create_native_profile() returns trigger
language plpgsql security definer set search_path='' as $$
declare admission msrc_participant.admissions%rowtype;
begin
  select a.* into admission from msrc_participant.admissions a where a.actor_id=new.id and a.consumed_at is not null;
  if not found then return new; end if;
  insert into msrc_participant.profiles(actor_id,name,privacy_version) values(new.id,admission.name,admission.privacy_version);
  insert into msrc_participant.notice_receipts(actor_id,privacy_version,accepted_at,admission_id)
    values(new.id,admission.privacy_version,admission.created_at,admission.id);
  insert into msrc_authorization.account_access(actor_id,state,individually_identified) values(new.id,'active',false);
  insert into msrc_participant.audit(actor_id,event) values(new.id,'account.created');
  return new;
end$$;
create trigger participant_native_admission before insert on auth.users for each row execute function msrc_participant.admit_native_user();
create trigger participant_native_profile after insert on auth.users for each row execute function msrc_participant.create_native_profile();

-- A suppression hook returns generic success. Strip native email credentials,
-- including OTT rows used by native GET /verify, so suppression is not a bypass.
create function msrc_participant.guard_native_identity() returns trigger
language plpgsql security definer set search_path='' as $$
declare operation msrc_participant.operations%rowtype; revision bigint; relevant boolean; marker text;
begin
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
create function msrc_participant.apply_native_operation() returns trigger
language plpgsql security definer set search_path='' as $$
declare operation msrc_participant.operations%rowtype;
begin
  if new.encrypted_password is not distinct from old.encrypted_password then return new; end if;
  select o.* into operation from msrc_participant.operations o where o.actor_id=new.id and o.state='pending'
    and o.transaction_id=pg_current_xact_id() for update;
  if not found then return new; end if;
  update msrc_participant.operations set state='applied',applied_at=clock_timestamp() where id=operation.id;
  insert into msrc_participant.audit(actor_id,challenge_id,event) values(new.id,operation.challenge_id,'identity.applied');
  return new;
end$$;
create function msrc_participant.suppress_native_token() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from msrc_participant.profiles p where p.actor_id=new.user_id) then return null; end if;
  return new;
end$$;
create trigger participant_identity_guard before update on auth.users for each row execute function msrc_participant.guard_native_identity();
create trigger participant_operation_applied after update of encrypted_password on auth.users for each row execute function msrc_participant.apply_native_operation();
create trigger participant_native_token_guard before insert on auth.one_time_tokens for each row execute function msrc_participant.suppress_native_token();

create function msrc_participant.guard_native_factor() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from msrc_participant.profiles p where p.actor_id=new.user_id)
    and (new.factor_type::text<>'totp' or not exists(select 1 from msrc_authorization.role_grants g
      where g.actor_id=new.user_id and g.state='active' and g.role_name='superAdmin')) then
    raise exception using errcode='42501',message='Participant MFA is unavailable.';
  end if;
  return new;
end$$;
create trigger participant_native_factor_guard before insert or update on auth.mfa_factors for each row execute function msrc_participant.guard_native_factor();

create function msrc_participant.suppress_native_email(event jsonb) returns jsonb
language sql stable security definer set search_path='' as $$
  select case when exists(select 1 from msrc_participant.profiles p where p.actor_id::text=event#>>'{user,id}')
    then '{}'::jsonb else jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Native email delivery is unavailable.')) end;
$$;
revoke all on function msrc_participant.suppress_native_email(jsonb) from public,anon,authenticated,service_role;
grant usage on schema msrc_participant to supabase_auth_admin;
grant execute on function msrc_participant.suppress_native_email(jsonb) to supabase_auth_admin;
comment on function msrc_participant.suppress_native_email(jsonb) is 'Configure as managed Send Email hook ONLY with reviewed participant native token guards. Generic suppression avoids native recovery enumeration; no mail/provider writes. Application Resend owns participant codes.';

-- Retain existing account_access→user lock order used by session checkers.
-- Native Auth takes user→operation and never account_access, avoiding a cycle.
create function msrc_participant.guard_grant_promotion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.state='active' and new.role_name<>'participant'
    and exists(select 1 from msrc_participant.profiles p where p.actor_id=new.actor_id) then
    perform 1 from msrc_authorization.account_access a where a.actor_id=new.actor_id for update;
    perform 1 from auth.users u where u.id=new.actor_id for update;
    if exists(select 1 from msrc_participant.operations o where o.actor_id=new.actor_id and o.state in ('pending','applied')
      and o.expires_at>clock_timestamp()) then
      raise exception using errcode='55000',message='Participant identity transition is pending.'; end if;
  end if;
  return new;
end$$;
create trigger participant_grant_promotion before insert or update on msrc_authorization.role_grants for each row execute function msrc_participant.guard_grant_promotion();

create function public.msrc_participant_status() returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('enabled',enabled,'privacyVersion',privacy_version,'emailDailyLimit',email_daily_limit)
    from msrc_participant.policy where singleton;
$$;
create function public.msrc_participant_form_claim(nonce_hash text,ip_hash text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare observed_at timestamptz;
begin
  if not msrc_participant.ready() or nonce_hash is null or nonce_hash !~ '^[a-f0-9]{64}$' or ip_hash is null or ip_hash !~ '^[a-f0-9]{64}$' then return jsonb_build_object('state','denied'); end if;
  perform pg_advisory_xact_lock(hashtextextended('msrc.participant.form:'||ip_hash,0));
  observed_at:=clock_timestamp();
  if exists(select 1 from msrc_participant.limit_events e where e.kind='form' and e.nonce_hash=nonce_hash)
    or (select count(*) from msrc_participant.limit_events e where e.kind='form' and e.subject_hash=ip_hash and e.occurred_at>observed_at-interval '1 hour')>=20 then return jsonb_build_object('state','denied'); end if;
  insert into msrc_participant.limit_events(kind,subject_hash,nonce_hash,occurred_at) values('form',ip_hash,nonce_hash,observed_at) on conflict do nothing;
  if not found then return jsonb_build_object('state','denied'); end if;
  return jsonb_build_object('state','claimed');
end$$;
create function public.msrc_participant_signup_reserve(actor_id uuid,reservation_id uuid,email text,name text,privacy_version text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare observed_at timestamptz;
begin
  if not msrc_participant.ready() or actor_id is null or reservation_id is null or email is null or email<>lower(btrim(email))
    or char_length(email) not between 3 and 254 or name is null or name<>btrim(name) or char_length(name) not between 1 and 120
    or privacy_version is distinct from (select p.privacy_version from msrc_participant.policy p where p.singleton) then return jsonb_build_object('state','denied'); end if;
  if exists(select 1 from auth.users u where u.email=email) then return jsonb_build_object('state','denied'); end if;
  observed_at:=clock_timestamp();
  insert into msrc_participant.admissions(id,actor_id,email,name,privacy_version,created_at,expires_at)
    values(reservation_id,actor_id,email,name,privacy_version,observed_at,observed_at+interval '2 minutes') on conflict do nothing;
  if not found then return jsonb_build_object('state','denied'); end if;
  return jsonb_build_object('state','reserved','actorId',actor_id,'reservationId',reservation_id);
end$$;

create function public.msrc_participant_email_begin(email text,purpose text,challenge_id uuid,code_hash text,email_hash text,ip_hash text,name text default null,privacy_version text default null) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare observed_at timestamptz; actor auth.users%rowtype; profile msrc_participant.profiles%rowtype;
  revision bigint; budget integer; day_start timestamptz;
begin
  if not msrc_participant.ready() or email is null or email<>lower(btrim(email)) or purpose not in ('verify_email','reset_password')
    or challenge_id is null or code_hash is null or code_hash !~ '^[a-f0-9]{64}$' or email_hash is null or email_hash !~ '^[a-f0-9]{64}$'
    or ip_hash is null or ip_hash !~ '^[a-f0-9]{64}$' then return jsonb_build_object('state','denied'); end if;
  perform pg_advisory_xact_lock(hashtextextended('msrc.participant.issue.email:'||email_hash,0));
  perform pg_advisory_xact_lock(hashtextextended('msrc.participant.issue.ip:'||ip_hash,0));
  observed_at:=clock_timestamp();
  if exists(select 1 from msrc_participant.limit_events e where e.kind='issue_email' and e.subject_hash=email_hash and e.occurred_at>observed_at-interval '60 seconds')
    or (select count(*) from msrc_participant.limit_events e where e.kind='issue_email' and e.subject_hash=email_hash and e.occurred_at>observed_at-interval '15 minutes')>=3
    or (select count(*) from msrc_participant.limit_events e where e.kind='issue_ip' and e.subject_hash=ip_hash and e.occurred_at>observed_at-interval '1 hour')>=20 then return jsonb_build_object('state','denied'); end if;
  -- Unknown addresses cost the SAME email/IP quota without creating an account.
  insert into msrc_participant.limit_events(kind,subject_hash,occurred_at) values('issue_email',email_hash,observed_at),('issue_ip',ip_hash,observed_at);
  select u.* into actor from auth.users u where u.email=email and u.deleted_at is null and not u.is_anonymous for update;
  if not found or (actor.banned_until is not null and actor.banned_until>clock_timestamp()) or not msrc_participant.participant_only(actor.id)
    or not exists(select 1 from msrc_authorization.account_access a where a.actor_id=actor.id and a.state='active') then return jsonb_build_object('state','denied'); end if;
  select p.* into profile from msrc_participant.profiles p where p.actor_id=actor.id;
  if not found or exists(select 1 from msrc_participant.operations o where o.actor_id=actor.id and o.state in ('pending','applied') and o.expires_at>clock_timestamp()) then return jsonb_build_object('state','denied'); end if;
  if purpose='verify_email' then
    -- Resend retains the latest signup snapshot without collecting another name.
    name:=coalesce(name,(select c.name from msrc_participant.challenges c where c.actor_id=actor.id
      and c.purpose='verify_email' order by c.created_at desc limit 1),profile.name);
    -- A lost Admin-to-profile completion can leave native email confirmed while
    -- the private profile remains pending. A FRESH proof plus owner-chosen
    -- password repairs that handoff; native confirmation alone grants no access.
    if profile.state<>'pending' or name is null or name<>btrim(name) or char_length(name) not between 1 and 120
      or privacy_version is distinct from (select p.privacy_version from msrc_participant.policy p where p.singleton) then return jsonb_build_object('state','denied'); end if;
  elsif actor.email_confirmed_at is null or profile.state<>'verified' or name is not null or privacy_version is not null then return jsonb_build_object('state','denied'); end if;
  if exists(select 1 from msrc_participant.challenges c where c.actor_id=actor.id and c.cooldown_until>clock_timestamp()) then return jsonb_build_object('state','denied'); end if;
  select r.revision into revision from msrc_staff_email.identity_revision r where r.actor_id=actor.id;
  if revision is null then return jsonb_build_object('state','denied'); end if;
  -- One fixed budget lock also serializes requests spanning UTC midnight.
  perform pg_advisory_xact_lock(hashtextextended('msrc.participant.delivery',0));
  observed_at:=clock_timestamp();
  day_start:=(observed_at at time zone 'UTC')::date at time zone 'UTC';
  select p.email_daily_limit into budget from msrc_participant.policy p where p.singleton;
  if not msrc_participant.ready() or (select count(*) from msrc_participant.challenges c where c.created_at>=day_start)>=budget
    or exists(select 1 from msrc_participant.challenges c where c.id=challenge_id) then return jsonb_build_object('state','denied'); end if;
  update msrc_participant.challenges c set state='superseded' where c.actor_id=actor.id and c.purpose=purpose and c.state in ('pending','sent');
  insert into msrc_participant.challenges(id,actor_id,purpose,recipient,identity_revision,code_hash,email_hash,ip_hash,name,privacy_version,created_at,expires_at)
    values(challenge_id,actor.id,purpose,actor.email,revision,code_hash,email_hash,ip_hash,name,privacy_version,observed_at,observed_at+interval '10 minutes');
  insert into msrc_participant.audit(actor_id,challenge_id,event) values(actor.id,challenge_id,'challenge.issued');
  return jsonb_build_object('state','issued','challengeId',challenge_id,'recipient',actor.email,'expiresAt',observed_at+interval '10 minutes');
end$$;

create function public.msrc_participant_email_delivery(challenge_id uuid,delivered boolean) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare challenge msrc_participant.challenges%rowtype; actor uuid;
begin
  if challenge_id is null or delivered is null then return jsonb_build_object('state','denied'); end if;
  select c.actor_id into actor from msrc_participant.challenges c where c.id=challenge_id;
  if actor is null then return jsonb_build_object('state','denied'); end if;
  perform 1 from auth.users u where u.id=actor for update;
  select c.* into challenge from msrc_participant.challenges c where c.id=challenge_id for update;
  if not msrc_participant.ready() or challenge.expires_at<=clock_timestamp() or not (challenge.state='pending' or (not delivered and challenge.state='sent'))
    or not msrc_participant.participant_only(actor) or not exists(select 1 from msrc_staff_email.identity_revision r where r.actor_id=actor and r.revision=challenge.identity_revision) then return jsonb_build_object('state','denied'); end if;
  update msrc_participant.challenges c set state=case when delivered then 'sent' else 'failed' end where c.id=challenge_id;
  insert into msrc_participant.audit(actor_id,challenge_id,event) values(actor,challenge_id,case when delivered then 'challenge.sent' else 'challenge.failed' end);
  return jsonb_build_object('state','ok');
end$$;

create function public.msrc_participant_email_consume(email text,purpose text,challenge_id uuid,code_hash text,operation_id uuid,ip_hash text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare actor auth.users%rowtype; challenge msrc_participant.challenges%rowtype; observed_at timestamptz;
begin
  if not msrc_participant.ready() or email is null or email<>lower(btrim(email)) or purpose not in ('verify_email','reset_password')
    or challenge_id is null or operation_id is null or code_hash is null or code_hash !~ '^[a-f0-9]{64}$' or ip_hash is null or ip_hash !~ '^[a-f0-9]{64}$' then return jsonb_build_object('state','denied'); end if;
  -- Consume uses a different IP lock from issuance and never takes account locks.
  perform pg_advisory_xact_lock(hashtextextended('msrc.participant.consume.ip:'||ip_hash,0));
  observed_at:=clock_timestamp();
  if (select count(*) from msrc_participant.limit_events e where e.kind='consume_ip' and e.subject_hash=ip_hash and e.occurred_at>observed_at-interval '15 minutes')>=30 then return jsonb_build_object('state','denied'); end if;
  insert into msrc_participant.limit_events(kind,subject_hash,occurred_at) values('consume_ip',ip_hash,observed_at);
  select u.* into actor from auth.users u where u.email=email and u.deleted_at is null and not u.is_anonymous for update;
  if not found or (actor.banned_until is not null and actor.banned_until>clock_timestamp()) or not msrc_participant.participant_only(actor.id)
    or not exists(select 1 from msrc_authorization.account_access a where a.actor_id=actor.id and a.state='active') then return jsonb_build_object('state','denied'); end if;
  update msrc_participant.operations o set state='failed' where o.actor_id=actor.id and o.state in ('pending','applied') and o.expires_at<=clock_timestamp();
  select c.* into challenge from msrc_participant.challenges c where c.id=challenge_id and c.actor_id=actor.id and c.purpose=purpose for update;
  observed_at:=clock_timestamp();
  if not found or challenge.state<>'sent' or challenge.recipient<>actor.email
    or not exists(select 1 from msrc_staff_email.identity_revision r where r.actor_id=actor.id and r.revision=challenge.identity_revision)
    or exists(select 1 from msrc_participant.operations o where o.actor_id=actor.id and o.state in ('pending','applied'))
    or (purpose='verify_email' and (not exists(select 1 from msrc_participant.profiles p where p.actor_id=actor.id and p.state='pending')
      or challenge.privacy_version is distinct from (select p.privacy_version from msrc_participant.policy p where p.singleton)))
    or (purpose='reset_password' and (actor.email_confirmed_at is null or not exists(select 1 from msrc_participant.profiles p where p.actor_id=actor.id and p.state='verified'))) then return jsonb_build_object('state','denied'); end if;
  if observed_at>=challenge.expires_at then update msrc_participant.challenges c set state='expired' where c.id=challenge_id; return jsonb_build_object('state','denied'); end if;
  if challenge.cooldown_until>observed_at then return jsonb_build_object('state','denied'); end if;
  if challenge.code_hash<>code_hash then
    update msrc_participant.challenges c set failed_attempts=c.failed_attempts+1,
      state=case when c.failed_attempts+1>=5 then 'locked' else c.state end,
      cooldown_until=case when c.failed_attempts+1>=5 then observed_at+interval '15 minutes' else null end where c.id=challenge_id;
    return jsonb_build_object('state','denied');
  end if;
  insert into msrc_participant.operations(id,actor_id,challenge_id,purpose,recipient,identity_revision,created_at,expires_at)
    values(operation_id,actor.id,challenge_id,purpose,actor.email,challenge.identity_revision,observed_at,observed_at+interval '2 minutes') on conflict do nothing;
  if not found then return jsonb_build_object('state','denied'); end if;
  update msrc_participant.challenges c set state='consumed' where c.id=challenge_id;
  insert into msrc_participant.audit(actor_id,challenge_id,event) values(actor.id,challenge_id,'challenge.consumed');
  return jsonb_build_object('state','consumed','operationId',operation_id,'actorId',actor.id,'recipient',actor.email);
end$$;

create function public.msrc_participant_email_complete(operation_id uuid,succeeded boolean) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare operation msrc_participant.operations%rowtype; actor auth.users%rowtype; challenge msrc_participant.challenges%rowtype; actor_id uuid;
begin
  if operation_id is null or succeeded is null then return jsonb_build_object('state','denied'); end if;
  select o.actor_id into actor_id from msrc_participant.operations o where o.id=operation_id;
  if actor_id is null then return jsonb_build_object('state','denied'); end if;
  select u.* into actor from auth.users u where u.id=actor_id for update;
  select o.* into operation from msrc_participant.operations o where o.id=operation_id for update;
  if operation.state not in ('pending','applied') then return jsonb_build_object('state','denied'); end if;
  if not succeeded or not msrc_participant.ready() or operation.state<>'applied' or operation.expires_at<=clock_timestamp()
    or actor.email<>operation.recipient or actor.email_confirmed_at is null or actor.deleted_at is not null or actor.is_anonymous
    or (actor.banned_until is not null and actor.banned_until>clock_timestamp()) or not msrc_participant.participant_only(actor.id)
    or not exists(select 1 from msrc_staff_email.identity_revision r where r.actor_id=actor.id and r.revision>operation.identity_revision)
    or not exists(select 1 from msrc_authorization.account_access a where a.actor_id=actor.id and a.state='active') then
    update msrc_participant.operations set state='failed' where id=operation_id;
    insert into msrc_participant.audit(actor_id,challenge_id,event) values(actor.id,operation.challenge_id,'identity.failed');
    return jsonb_build_object('state','failed');
  end if;
  if operation.purpose='verify_email' then
    select c.* into challenge from msrc_participant.challenges c where c.id=operation.challenge_id;
    if challenge.privacy_version is distinct from (select p.privacy_version from msrc_participant.policy p where p.singleton) then
      update msrc_participant.operations set state='failed' where id=operation_id; return jsonb_build_object('state','failed'); end if;
    update msrc_participant.profiles p set name=challenge.name,privacy_version=challenge.privacy_version,state='verified' where p.actor_id=actor.id;
    insert into msrc_participant.notice_receipts(actor_id,privacy_version,accepted_at,challenge_id)
      values(actor.id,challenge.privacy_version,challenge.created_at,challenge.id);
  end if;
  update msrc_participant.operations set state='completed' where id=operation_id;
  insert into msrc_participant.audit(actor_id,challenge_id,event) values(actor.id,operation.challenge_id,'identity.completed');
  return jsonb_build_object('state','completed');
end$$;

create function public.msrc_participant_login_begin(attempt_id uuid,email_hash text,ip_hash text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare observed_at timestamptz;
begin
  if not msrc_participant.ready() or attempt_id is null or email_hash is null or email_hash !~ '^[a-f0-9]{64}$'
    or ip_hash is null or ip_hash !~ '^[a-f0-9]{64}$' then return jsonb_build_object('state','denied'); end if;
  perform pg_advisory_xact_lock(hashtextextended('msrc.participant.login.email:'||email_hash,0));
  perform pg_advisory_xact_lock(hashtextextended('msrc.participant.login.ip:'||ip_hash,0));
  observed_at:=clock_timestamp();
  if (select count(*) from msrc_participant.login_attempts a where a.email_hash=email_hash and a.state in ('pending','failed') and a.created_at>observed_at-interval '15 minutes')>=5
    or (select count(*) from msrc_participant.login_attempts a where a.ip_hash=ip_hash and a.created_at>observed_at-interval '1 hour')>=20 then return jsonb_build_object('state','denied'); end if;
  insert into msrc_participant.login_attempts(id,email_hash,ip_hash,created_at) values(attempt_id,email_hash,ip_hash,observed_at) on conflict do nothing;
  if not found then return jsonb_build_object('state','denied'); end if;
  return jsonb_build_object('state','allowed','attemptId',attempt_id);
end$$;
create function public.msrc_participant_login_finish(attempt_id uuid,actor_id uuid default null,session_id uuid default null) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare attempt msrc_participant.login_attempts%rowtype; actor auth.users%rowtype; native auth.sessions%rowtype;
  revision msrc_staff_email.identity_revision%rowtype; password_at timestamptz; observed_at timestamptz;
begin
  if attempt_id is null then return jsonb_build_object('state','denied'); end if;
  if actor_id is not null then select u.* into actor from auth.users u where u.id=actor_id for share; end if;
  select a.* into attempt from msrc_participant.login_attempts a where a.id=attempt_id for update;
  observed_at:=clock_timestamp();
  if not found or attempt.state<>'pending' or attempt.created_at<=observed_at-interval '2 minutes' then return jsonb_build_object('state','denied'); end if;
  update msrc_participant.login_attempts set state='failed' where id=attempt_id;
  if not msrc_participant.ready() or actor_id is null or session_id is null or actor.id is null or actor.deleted_at is not null or actor.is_anonymous
    or actor.email_confirmed_at is null or (actor.banned_until is not null and actor.banned_until>observed_at)
    or not msrc_participant.participant_only(actor_id) or not exists(select 1 from msrc_participant.profiles p where p.actor_id=actor_id and p.state='verified')
    or not exists(select 1 from msrc_authorization.account_access a where a.actor_id=actor_id and a.state='active')
    or exists(select 1 from msrc_participant.operations o where o.actor_id=actor_id and o.state in ('pending','applied') and o.expires_at>observed_at) then return jsonb_build_object('state','denied'); end if;
  select s.* into native from auth.sessions s where s.id=session_id and s.user_id=actor_id for share;
  observed_at:=clock_timestamp();
  if not found or native.created_at>observed_at or native.created_at<attempt.created_at or native.created_at+interval '72 hours'<=observed_at
    or (native.not_after is not null and native.not_after<=observed_at)
    or exists(select 1 from msrc_sessions.actor_revocations r where r.actor_id=actor_id and native.created_at<=r.revoked_before)
    or exists(select 1 from msrc_sessions.session_state s where s.session_id=session_id and s.revoked_at is not null) then return jsonb_build_object('state','denied'); end if;
  select r.* into revision from msrc_staff_email.identity_revision r where r.actor_id=actor_id;
  select max(a.updated_at::timestamptz) into password_at from auth.mfa_amr_claims a where a.session_id=session_id and a.authentication_method='password';
  if revision.actor_id is null or password_at is null or password_at<native.created_at or password_at>observed_at
    or (revision.password_changed_at is not null and password_at<revision.password_changed_at) then return jsonb_build_object('state','denied'); end if;
  insert into msrc_participant.session_receipts(session_id,actor_id,identity_revision,native_started_at,password_at)
    values(session_id,actor_id,revision.revision,native.created_at,password_at) on conflict do nothing;
  if not found then return jsonb_build_object('state','denied'); end if;
  update msrc_participant.login_attempts set state='admitted' where id=attempt_id;
  insert into msrc_participant.audit(actor_id,session_id,event) values(actor_id,session_id,'session.admitted');
  return jsonb_build_object('state','admitted');
end$$;

create function msrc_participant.observe_profile(edition_key text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare context jsonb; receipt msrc_participant.session_receipts%rowtype; profile msrc_participant.profiles%rowtype;
  actor uuid:=auth.uid(); sid uuid; revision bigint;
begin
  if not msrc_participant.ready() or actor is null or not msrc_participant.participant_only(actor) then return null; end if;
  context:=msrc_sessions.observe_context(edition_key);
  if context is null or context->>'authenticationTier'<>'participant' or not coalesce((context->>'sessionPolicySatisfied')::boolean,false)
    or not coalesce((context->>'passwordValid')::boolean,false) or not coalesce((context->>'emailVerified')::boolean,false) then return null; end if;
  sid:=(context#>>'{principal,sessionId}')::uuid;
  select p.* into profile from msrc_participant.profiles p where p.actor_id=actor and p.state='verified';
  if not found then return null; end if;
  select r.revision into revision from msrc_staff_email.identity_revision r where r.actor_id=actor;
  select r.* into receipt from msrc_participant.session_receipts r where r.actor_id=actor and r.session_id=sid and r.identity_revision=revision;
  if not found or receipt.native_started_at is distinct from (context#>>'{timing,startedAt}')::timestamptz
    or exists(select 1 from msrc_participant.operations o where o.actor_id=actor and o.state in ('pending','applied') and o.expires_at>statement_timestamp()) then return null; end if;
  return jsonb_build_object('schemaVersion',1,'name',profile.name,'accountState','verified','session',context,'operationalAccessReady',false);
end$$;
create function public.msrc_participant_profile(edition_key text) returns jsonb
language sql stable security definer set search_path='' as $$ select msrc_participant.observe_profile(edition_key); $$;
comment on function public.msrc_participant_profile(text) is 'Own exact admitted native-password session only; current verified email/revision, strongest all-edition role, shared 72-hour absolute policy. No actor parameter, operational action or grant.';

revoke all on all functions in schema msrc_participant from public,anon,authenticated,service_role;
-- The hook is the sole native-provider callable helper; no table grants.
grant execute on function msrc_participant.suppress_native_email(jsonb) to supabase_auth_admin;
revoke all on function public.msrc_participant_status(),public.msrc_participant_form_claim(text,text),
  public.msrc_participant_signup_reserve(uuid,uuid,text,text,text),public.msrc_participant_email_begin(text,text,uuid,text,text,text,text,text),
  public.msrc_participant_email_delivery(uuid,boolean),public.msrc_participant_email_consume(text,text,uuid,text,uuid,text),
  public.msrc_participant_email_complete(uuid,boolean),public.msrc_participant_login_begin(uuid,text,text),
  public.msrc_participant_login_finish(uuid,uuid,uuid),public.msrc_participant_profile(text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_participant_status(),public.msrc_participant_form_claim(text,text),
  public.msrc_participant_signup_reserve(uuid,uuid,text,text,text),public.msrc_participant_email_begin(text,text,uuid,text,text,text,text,text),
  public.msrc_participant_email_delivery(uuid,boolean),public.msrc_participant_email_consume(text,text,uuid,text,uuid,text),
  public.msrc_participant_email_complete(uuid,boolean),public.msrc_participant_login_begin(uuid,text,text),
  public.msrc_participant_login_finish(uuid,uuid,uuid) to service_role;
grant execute on function public.msrc_participant_profile(text) to authenticated;
notify pgrst,'reload schema';
