-- AUTH-04/05, ROL-12, SEC-01/06. REVIEW ONLY; no hosted apply or live delivery.
-- Regular staff: password then an application email check. This never creates native AAL2.
-- Participants and strongest-across-editions Super Admin SMS MFA retain their policy.
create schema msrc_staff_email;
revoke all on schema msrc_staff_email from public, anon, authenticated, service_role;

create table msrc_staff_email.challenges (
  id uuid primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  session_id uuid not null,
  binding text not null check (binding ~ '^[0-9a-f]{64}$'),
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  state text not null default 'pending' check (state in ('pending','sent','verified','superseded','failed','locked','expired')),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  cooldown_until timestamptz,
  verified_at timestamptz,
  check (expires_at > created_at),
  check ((state='verified') = (verified_at is not null)),
  check (verified_at is null or verified_at >= created_at)
);
create index staff_email_actor_issued on msrc_staff_email.challenges(actor_id,created_at desc);
create index staff_email_ip_issued on msrc_staff_email.challenges(ip_hash,created_at desc);
create unique index staff_email_one_pending on msrc_staff_email.challenges(actor_id)
  where state in ('pending','sent');

create table msrc_staff_email.receipts (
  session_id uuid primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  challenge_id uuid not null unique references msrc_staff_email.challenges(id) on delete restrict,
  binding text not null check (binding ~ '^[0-9a-f]{64}$'),
  verified_at timestamptz not null
);
create table msrc_staff_email.audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  session_id uuid not null,
  challenge_id uuid not null,
  event text not null check (event in ('challenge.reserved','challenge.sent','challenge.failed','challenge.superseded',
    'challenge.denied','challenge.expired','challenge.locked','challenge.verified','receipt.created')),
  occurred_at timestamptz not null default statement_timestamp()
);
comment on table msrc_staff_email.challenges is
  'Private application check only. Keyed server HMACs, no plaintext OTP/IP or recipient; bounded synthetic delivery. No managed MFA/AAL2.';
comment on table msrc_staff_email.receipts is
  'Exact managed-session application proof, bound current managed email/user version/password AMR/all-edition grant state. No role or entitlement.';
comment on table msrc_staff_email.audit is
  'Append-only safe IDs and enum events only: never email, password, OTP, hash, token, IP, payload or provider message.';
alter table msrc_staff_email.challenges enable row level security;
alter table msrc_staff_email.challenges force row level security;
alter table msrc_staff_email.receipts enable row level security;
alter table msrc_staff_email.receipts force row level security;
alter table msrc_staff_email.audit enable row level security;
alter table msrc_staff_email.audit force row level security;
revoke all on all tables in schema msrc_staff_email from public, anon, authenticated, service_role;
revoke all on all sequences in schema msrc_staff_email from public, anon, authenticated, service_role;
alter default privileges in schema msrc_staff_email revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema msrc_staff_email revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema msrc_staff_email revoke execute on functions from public, anon, authenticated, service_role;

create function msrc_staff_email.audit_change() returns trigger
language plpgsql security invoker set search_path='' as $$
declare event_name text; safe_challenge_id uuid;
begin
  if current_user <> 'postgres' then raise exception using errcode='42501',message='Private security transition required.'; end if;
  if tg_table_name='receipts' then event_name := 'receipt.created'; safe_challenge_id := new.challenge_id;
  else safe_challenge_id := new.id;
    if tg_op='INSERT' then event_name := 'challenge.reserved';
    elsif new.state is distinct from old.state then
      event_name := case new.state when 'sent' then 'challenge.sent' when 'failed' then 'challenge.failed'
        when 'superseded' then 'challenge.superseded' when 'expired' then 'challenge.expired'
        when 'locked' then 'challenge.locked' when 'verified' then 'challenge.verified' end;
    elsif new.failed_attempts > old.failed_attempts then event_name := 'challenge.denied'; end if;
  end if;
  if event_name is not null then
    insert into msrc_staff_email.audit(actor_id,session_id,challenge_id,event)
    values(new.actor_id,new.session_id,safe_challenge_id,event_name);
  end if;
  return new;
end; $$;

-- Grant writers use the same account-first order as receipt/session checkers.
create function msrc_staff_email.lock_grant_change() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from msrc_authorization.account_access a where a.actor_id=new.actor_id for update;
  return new;
end; $$;
create trigger staff_email_role_change_lock before insert or update on msrc_authorization.role_grants
for each row execute function msrc_staff_email.lock_grant_change();
create trigger staff_email_challenge_audit after insert or update on msrc_staff_email.challenges
for each row execute function msrc_staff_email.audit_change();
create trigger staff_email_receipt_audit after insert or update on msrc_staff_email.receipts
for each row execute function msrc_staff_email.audit_change();
create function msrc_staff_email.guard_audit() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' and pg_trigger_depth() >= 2 and current_user='postgres' then return new; end if;
  raise exception using errcode='55000',message='Staff check audit is append-only.';
end; $$;
create trigger staff_email_audit_append_only before insert or update or delete on msrc_staff_email.audit
for each row execute function msrc_staff_email.guard_audit();
create trigger staff_email_audit_no_truncate before truncate on msrc_staff_email.audit
for each statement execute function msrc_authorization.prevent_history_truncate();

-- Trusted-current evidence only. Service RPC arguments establish no entitlement.
-- Native user updated_at is a conservative version: change-away/back cannot restore a receipt.
-- Native token refresh must preserve this version; the isolated integration suite checks it.
create function msrc_staff_email.basis(target_actor uuid,target_session uuid) returns jsonb
language plpgsql volatile security definer set search_path='' set timezone='UTC' as $$
declare
  observed_at timestamptz := clock_timestamp();
  account_row msrc_authorization.account_access%rowtype;
  user_row auth.users%rowtype;
  session_row auth.sessions%rowtype;
  policy_row msrc_sessions.policy%rowtype;
  state_row msrc_sessions.session_state%rowtype;
  password_at timestamptz;
  grant_fingerprint text;
  bound_fingerprint text;
  cutoff timestamptz;
begin
  select a.* into account_row from msrc_authorization.account_access a where a.actor_id=target_actor for update;
  if not found or account_row.state <> 'active' or not account_row.individually_identified then return null; end if;
  if not exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor
      and g.state='active' and g.role_name <> 'participant')
    or exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor
      and g.state='active' and g.role_name='superAdmin') then return null; end if;
  select u.* into user_row from auth.users u where u.id=target_actor for share;
  observed_at := clock_timestamp();
  if not found or user_row.deleted_at is not null or user_row.is_anonymous
    or (user_row.banned_until is not null and user_row.banned_until > observed_at)
    or user_row.email_confirmed_at is null or user_row.email_confirmed_at > observed_at
    or coalesce(btrim(user_row.email),'')='' then return null; end if;
  select s.* into session_row from auth.sessions s where s.id=target_session and s.user_id=target_actor for share;
  if not found then return null; end if;
  select p.* into policy_row from msrc_sessions.policy p where p.singleton;
  if not found then return null; end if;
  select s.* into state_row from msrc_sessions.session_state s where s.session_id=target_session for share;
  observed_at := clock_timestamp();
  if session_row.created_at > observed_at
    or (session_row.not_after is not null and session_row.not_after <= observed_at)
    or observed_at >= session_row.created_at+make_interval(secs=>policy_row.privileged_absolute_seconds) then return null; end if;
  if found and (state_row.actor_id <> target_actor or state_row.started_at <> session_row.created_at
      or state_row.revoked_at is not null or state_row.last_activity_at > observed_at) then return null; end if;
  if observed_at >= coalesce(state_row.last_activity_at,session_row.created_at)
    +make_interval(secs=>policy_row.privileged_idle_seconds) then return null; end if;
  select r.revoked_before into cutoff from msrc_sessions.actor_revocations r where r.actor_id=target_actor;
  if session_row.created_at <= cutoff then return null; end if;
  select max(a.updated_at::timestamptz) into password_at from auth.mfa_amr_claims a
    where a.session_id=target_session and a.authentication_method='password';
  if password_at is null or password_at < session_row.created_at or password_at > observed_at then return null; end if;
  select encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_object('id',g.id,'edition',g.edition_key,
    'role',g.role_name,'scope',g.scope_kind,'track',g.track,'target',g.scope_target,'state',g.state)
    order by g.id)::text,'[]'),'UTF8')),'hex') into grant_fingerprint
    from msrc_authorization.role_grants g where g.actor_id=target_actor;
  bound_fingerprint := encode(sha256(convert_to(jsonb_build_object('email',user_row.email,
    'confirmed',user_row.email_confirmed_at,'userVersion',user_row.updated_at,
    'passwordAt',password_at,'grantVersion',grant_fingerprint)::text,'UTF8')),'hex');
  return jsonb_build_object('binding',bound_fingerprint,'recipient',user_row.email,'passwordAt',password_at);
end; $$;

create function msrc_staff_email.valid_receipt(target_actor uuid,target_session uuid) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare evidence jsonb;
begin
  evidence := msrc_staff_email.basis(target_actor,target_session);
  if evidence is null then return false; end if;
  return exists(select 1 from msrc_staff_email.receipts r join msrc_staff_email.challenges c on c.id=r.challenge_id
    where r.actor_id=target_actor and r.session_id=target_session and r.binding=evidence->>'binding'
      and c.actor_id=target_actor and c.session_id=target_session and c.binding=r.binding
      and c.state='verified' and c.verified_at=r.verified_at and r.verified_at <= clock_timestamp()
      and r.verified_at >= (evidence->>'passwordAt')::timestamptz);
end; $$;

-- Keyed hashes are computed by the trusted server. No raw code enters SQL, audit or JSON.
create function public.msrc_staff_email_begin(actor_id uuid,session_id uuid,challenge_id uuid,code_hash text,ip_hash text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare evidence jsonb; observed_at timestamptz; expires_at timestamptz;
begin
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

create function public.msrc_staff_email_delivery(actor_id uuid,session_id uuid,challenge_id uuid,delivered boolean) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare evidence jsonb; challenge msrc_staff_email.challenges%rowtype;
begin
  if actor_id is null or session_id is null or challenge_id is null or delivered is null then return jsonb_build_object('state','denied'); end if;
  evidence := msrc_staff_email.basis(actor_id,session_id);
  if evidence is null then return jsonb_build_object('state','denied'); end if;
  select c.* into challenge from msrc_staff_email.challenges c
    where c.id=challenge_id and c.actor_id=actor_id and c.session_id=session_id for update;
  -- A lost success acknowledgement may leave the server unsure whether sent committed.
  -- Trusted cancellation closes pending OR sent evidence, but never an approved receipt.
  if not found or not (challenge.state='pending' or (not delivered and challenge.state='sent'))
    or challenge.binding <> evidence->>'binding'
    or clock_timestamp() >= challenge.expires_at then return jsonb_build_object('state','denied'); end if;
  update msrc_staff_email.challenges c set state=case when delivered then 'sent' else 'failed' end where c.id=challenge_id;
  return jsonb_build_object('state','ok');
end; $$;

create function public.msrc_staff_email_consume(actor_id uuid,session_id uuid,challenge_id uuid,code_hash text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare evidence jsonb; challenge msrc_staff_email.challenges%rowtype; observed_at timestamptz;
begin
  if actor_id is null or session_id is null or challenge_id is null or code_hash is null or code_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('state','denied','code','invalid_request'); end if;
  evidence := msrc_staff_email.basis(actor_id,session_id);
  if evidence is null then return jsonb_build_object('state','denied','code','ineligible'); end if;
  observed_at := clock_timestamp();
  if exists(select 1 from msrc_staff_email.challenges c where c.actor_id=actor_id and c.cooldown_until > observed_at) then
    return jsonb_build_object('state','denied','code','retry_limited'); end if;
  select c.* into challenge from msrc_staff_email.challenges c
    where c.id=challenge_id and c.actor_id=actor_id and c.session_id=session_id for update;
  observed_at := clock_timestamp();
  if not found or challenge.state <> 'sent' or challenge.binding <> evidence->>'binding' then
    return jsonb_build_object('state','denied','code','challenge_required'); end if;
  if observed_at >= challenge.expires_at then
    update msrc_staff_email.challenges c set state='expired' where c.id=challenge_id;
    return jsonb_build_object('state','denied','code','challenge_expired'); end if;
  if code_hash <> challenge.code_hash then
    update msrc_staff_email.challenges c set failed_attempts=c.failed_attempts+1,
      state=case when c.failed_attempts+1>=5 then 'locked' else c.state end,
      cooldown_until=case when c.failed_attempts+1>=5 then observed_at+interval '15 minutes' else c.cooldown_until end
      where c.id=challenge_id;
    return jsonb_build_object('state','denied','code',case when challenge.failed_attempts+1>=5 then 'retry_limited' else 'invalid_code' end);
  end if;
  update msrc_staff_email.challenges c set state='verified',verified_at=observed_at where c.id=challenge_id;
  insert into msrc_staff_email.receipts(session_id,actor_id,challenge_id,binding,verified_at)
    values(session_id,actor_id,challenge_id,challenge.binding,observed_at)
    on conflict on constraint receipts_pkey do update set actor_id=excluded.actor_id,challenge_id=excluded.challenge_id,
      binding=excluded.binding,verified_at=excluded.verified_at;
  return jsonb_build_object('state','verified','verifiedAt',observed_at);
end; $$;

revoke all on all functions in schema msrc_staff_email from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_email_begin(uuid,uuid,uuid,text,text),
  public.msrc_staff_email_delivery(uuid,uuid,uuid,boolean),public.msrc_staff_email_consume(uuid,uuid,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_email_begin(uuid,uuid,uuid,text,text),
  public.msrc_staff_email_delivery(uuid,uuid,uuid,boolean),public.msrc_staff_email_consume(uuid,uuid,uuid,text) to service_role;
comment on function public.msrc_staff_email_begin(uuid,uuid,uuid,text,text) is
  'Trusted server only: current regular-staff/password eligibility, approved bounded issuance reservation. Recipient is private server transport; never a browser result.';
comment on function public.msrc_staff_email_consume(uuid,uuid,uuid,text) is
  'Trusted server only: serial single-use latest application check; never native AAL2, grant, live delivery or operational activation.';


-- Additive replacement: prior deployed/review migration snapshots remain unchanged.
-- Current-clock policy decisions and activity must share the same guard after lock waits.
create or replace function msrc_sessions.guard_session_state() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if current_user <> 'postgres' then
    raise exception using errcode='42501',message='Session maintenance is restricted.';
  end if;
  if tg_op='DELETE' then
    raise exception using errcode='55000',message='Session history is immutable.';
  elsif tg_op='INSERT' then
    if not exists(select 1 from auth.sessions s where s.id=new.session_id and s.user_id=new.actor_id
      and s.created_at=new.started_at) or new.last_activity_at <> new.started_at or new.revoked_at is not null then
      raise exception using errcode='55000',message='Session origin must match managed evidence.';
    end if;
  elsif new.session_id is distinct from old.session_id or new.actor_id is distinct from old.actor_id
    or new.started_at is distinct from old.started_at or new.last_activity_at < old.last_activity_at
    or new.last_activity_at > clock_timestamp()
    or (old.revoked_at is not null and new is distinct from old) then
    raise exception using errcode='55000',message='Session origin and revocation are immutable.';
  end if;
  if tg_op='UPDATE' and old.revoked_at is null and new.revoked_at is not null then new.revoked_at := clock_timestamp(); end if;
  return new;
end; $$;

create or replace function msrc_sessions.guard_actor_revocation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if current_user <> 'postgres' or tg_op='DELETE' then
    raise exception using errcode='55000',message='Actor revocation history is restricted.';
  end if;
  if tg_op='UPDATE' and (new.actor_id is distinct from old.actor_id or new.revoked_before < old.revoked_before) then
    raise exception using errcode='55000',message='Revocation cutoff cannot move backwards.';
  end if;
  -- A native login created while this transition waited must also be revoked.
  new.revoked_before := clock_timestamp();
  new.performed_by_db_role := session_user;
  return new;
end; $$;

create or replace function msrc_sessions.own_context(edition_key text,record_activity boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  observed_at timestamptz := clock_timestamp();
  claims jsonb;
  caller_id uuid;
  sid uuid;
  managed auth.sessions%rowtype;
  state_row msrc_sessions.session_state%rowtype;
  policy_row msrc_sessions.policy%rowtype;
  account_row msrc_authorization.account_access%rowtype;
  factor_row auth.mfa_factors%rowtype;
  user_row auth.users%rowtype;
  privileged boolean := false;
  mfa_valid boolean := false;
  staff_email_valid boolean := false;
  authentication_tier text := 'participant';
  password_valid boolean := false;
  email_verified boolean := false;
  phone_verified boolean := false;
  password_at timestamptz;
  phone_mfa_at timestamptz;
  authenticated_at timestamptz;
  cutoff timestamptz;
  reason text;
  absolute_end timestamptz;
  idle_end timestamptz;
begin
  claims := auth.jwt();
  caller_id := auth.uid();
  if caller_id is null or edition_key is null or edition_key <> btrim(edition_key)
    or char_length(edition_key) not between 1 and 128
    or not exists(select 1 from msrc_authorization.edition_config e where e.edition_key=own_context.edition_key)
    or jsonb_typeof(claims->'exp') is distinct from 'number'
    or (claims->>'exp')::numeric <= extract(epoch from observed_at)
    or (claims->>'session_id') is null
    or (claims->>'session_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or (claims->>'sub')::uuid is distinct from caller_id then return null; end if;
  sid := (claims->>'session_id')::uuid;
  select a.* into account_row from msrc_authorization.account_access a where a.actor_id=caller_id for update;
  if not found then return null; end if;
  select s.* into managed from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id=sid and s.user_id=caller_id and s.created_at <= observed_at
      and (s.not_after is null or s.not_after > observed_at)
      and u.deleted_at is null
      and not u.is_anonymous and (u.banned_until is null or u.banned_until <= observed_at)
    for share of s,u;
  if not found then return null; end if;
  select u.* into user_row from auth.users u where u.id=caller_id;
  email_verified := user_row.email_confirmed_at is not null and coalesce(btrim(user_row.email),'') <> '';
  phone_verified := user_row.phone_confirmed_at is not null and coalesce(btrim(user_row.phone),'') <> '';
  select p.* into policy_row from msrc_sessions.policy p where p.singleton;
  if not found then return null; end if;
  -- A caller-controlled edition selector cannot downgrade the session's staff limits.
  -- Domain authorization/grant projections still remain edition-scoped elsewhere.
  privileged := exists(select 1 from msrc_authorization.role_grants g where g.actor_id=caller_id
    and g.state='active' and g.role_name <> 'participant');
  authentication_tier := case when exists(select 1 from msrc_authorization.role_grants g
    where g.actor_id=caller_id and g.state='active' and g.role_name='superAdmin') then 'super_admin'
    when privileged then 'staff' else 'participant' end;
  if authentication_tier='staff' then staff_email_valid := msrc_staff_email.valid_receipt(caller_id,sid); end if;
  insert into msrc_sessions.session_state(session_id,actor_id,started_at,last_activity_at)
  values(sid,caller_id,managed.created_at,managed.created_at) on conflict(session_id) do nothing;
  select s.* into state_row from msrc_sessions.session_state s where s.session_id=sid for update;
  observed_at := clock_timestamp();
  if managed.not_after is not null and managed.not_after <= observed_at
    or (claims->>'exp')::numeric <= extract(epoch from observed_at) then return null; end if;
  if state_row.actor_id <> caller_id or state_row.started_at <> managed.created_at
    or state_row.last_activity_at > observed_at then return null; end if;
  select r.revoked_before into cutoff from msrc_sessions.actor_revocations r where r.actor_id=caller_id;
  absolute_end := state_row.started_at + make_interval(secs => case when privileged
    then policy_row.privileged_absolute_seconds else policy_row.participant_absolute_seconds end);
  if privileged then idle_end := state_row.last_activity_at + make_interval(secs => policy_row.privileged_idle_seconds); end if;
  -- Signed provider AMR must prove password primary login in THIS managed session.
  -- Generic AAL2, primary phone/OTP and TOTP do not establish approved staff assurance.
  -- mfa/phone proves phone MFA; the trusted adapter fixes channel=sms. AMR alone
  -- cannot distinguish SMS from WhatsApp; SMS-only provider configuration is a release gate.
  select max(to_timestamp((a.item->>'timestamp')::double precision)) filter(where a.item->>'method'='password'),
    max(to_timestamp((a.item->>'timestamp')::double precision)) filter(where a.item->>'method'='mfa/phone'),
    max(to_timestamp((a.item->>'timestamp')::double precision)) filter(where a.item->>'method' in ('password','mfa/phone'))
    into password_at,phone_mfa_at,authenticated_at
    from jsonb_array_elements(case when jsonb_typeof(claims->'amr')='array' then claims->'amr' else '[]'::jsonb end) a(item)
    where jsonb_typeof(a.item->'timestamp')='number';
  password_valid := coalesce(floor(extract(epoch from password_at)) >= floor(extract(epoch from managed.created_at))
    and password_at <= observed_at,false);
  if managed.factor_id is not null then
    select f.* into factor_row from auth.mfa_factors f where f.id=managed.factor_id and f.user_id=caller_id for share;
  end if;
  mfa_valid := coalesce(password_valid and claims->>'aal'='aal2' and managed.aal::text='aal2'
    and factor_row.factor_type::text='phone' and factor_row.status::text='verified'
    and coalesce(btrim(factor_row.phone),'') <> ''
    and floor(extract(epoch from phone_mfa_at)) >= floor(extract(epoch from greatest(
      factor_row.created_at,factor_row.updated_at,managed.created_at,password_at)))
    and phone_mfa_at <= observed_at,false);
  if state_row.revoked_at is not null or managed.created_at <= cutoff then reason := 'session_revoked';
  elsif account_row.state <> 'active' then reason := 'account_suspended';
  elsif observed_at >= absolute_end then reason := 'absolute_expired';
  elsif privileged and observed_at >= idle_end then reason := 'idle_expired';
  elsif not email_verified or (not privileged and not phone_verified) then reason := 'account_verification_required';
  elsif not password_valid then reason := 'password_auth_required';
  elsif privileged and not account_row.individually_identified then reason := 'individual_identity_required';
  elsif authentication_tier='super_admin' and not mfa_valid then reason := 'mfa_required';
  elsif authentication_tier='staff' and not staff_email_valid then reason := 'staff_email_check_required';
  elsif coalesce(claims->>'aal','aal1') not in ('aal1','aal2') then return null;
  end if;
  if reason in ('absolute_expired','idle_expired') and state_row.revoked_at is null then
    update msrc_sessions.session_state set revoked_at=observed_at,revocation_cause='policy_expired' where session_id=sid;
  elsif reason is null and record_activity then
    update msrc_sessions.session_state set last_activity_at=observed_at where session_id=sid;
    state_row.last_activity_at := observed_at;
    if privileged then idle_end := observed_at + make_interval(secs => policy_row.privileged_idle_seconds); end if;
  end if;
  if staff_email_valid then
    select greatest(authenticated_at,r.verified_at) into authenticated_at
      from msrc_staff_email.receipts r where r.session_id=sid and r.actor_id=caller_id;
  end if;
  return jsonb_build_object('schemaVersion',1,'editionId',edition_key,
    'principal',jsonb_build_object('userId',caller_id,'sessionId',sid),'privileged',privileged,
    'sessionPolicySatisfied',reason is null,'reason',reason,'mfaValid',mfa_valid,
    'authenticationTier',authentication_tier,'staffEmailValid',staff_email_valid,
    'passwordValid',password_valid,'emailVerified',email_verified,'phoneVerified',phone_verified,
    'timing',jsonb_build_object('startedAt',state_row.started_at,'lastActivityAt',state_row.last_activity_at,
      'absoluteExpiresAt',absolute_end,'idleExpiresAt',idle_end,'authenticatedAt',authenticated_at),
    'policy',jsonb_build_object('participantAbsoluteSeconds',policy_row.participant_absolute_seconds,
      'privilegedIdleSeconds',policy_row.privileged_idle_seconds,'privilegedAbsoluteSeconds',policy_row.privileged_absolute_seconds,
      'recentAuthMaxAgeSeconds',policy_row.recent_auth_max_age_seconds,'warningLeadSeconds',policy_row.warning_lead_seconds),
    'operationalAccessReady',false,'privilegedAccessReady',false);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then return null;
end; $$;

-- Self-only authentication predicate for future restrictive RLS/storage checks.
-- It returns no entitlement: future features must also check readiness, role/scope and ownership.
create function public.msrc_second_step_satisfied() returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare own jsonb; configured_edition text;
begin
  if auth.uid() is null then return false; end if;
  select min(e.edition_key) into configured_edition from msrc_authorization.edition_config e;
  if configured_edition is null then return false; end if;
  own := msrc_sessions.own_context(configured_edition,false);
  return coalesce((own->>'sessionPolicySatisfied')::boolean,false);
end; $$;
revoke all on function public.msrc_second_step_satisfied() from public,anon,authenticated,service_role;
grant execute on function public.msrc_second_step_satisfied() to authenticated;
revoke all on all functions in schema msrc_staff_email from public,anon,authenticated,service_role;
comment on function public.msrc_second_step_satisfied() is
  'Self-only current authentication predicate, exact session lifetime/revocation/password and strongest all-edition policy. Application email checks do not create AAL2 or operational authority.';
comment on function public.msrc_session_context(text) is
  'Self current policy: participants verified email/phone; regular staff password+private email check; Super Admins password+phone MFA across editions. Readiness FALSE.';
comment on function public.msrc_access_context(text) is
  'Self-only metadata including strongest authentication tier and private email-check status. Session active/readiness FALSE; no authority reader or live grants.';

create or replace function public.msrc_access_context(edition_key text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  context jsonb;
  caller_id uuid;
  caller_session_id uuid;
  account_row msrc_authorization.account_access%rowtype;
  own_grants jsonb := '[]'::jsonb;
  mfa_valid boolean;
begin
  context := msrc_sessions.own_context(edition_key,false);
  if context is null or not (context->>'passwordValid')::boolean then return null; end if;
  -- Password-only staff metadata is available for future closed enrollment screens.
  -- Failed AAL2 or a lifecycle/verification denial cannot become a usable identity context.
  if context->>'reason' is not null and not ((context->>'reason'='mfa_required'
    and coalesce(auth.jwt()->>'aal','aal1')='aal1')
    or context->>'reason'='staff_email_check_required') then return null; end if;
  caller_id := (context#>>'{principal,userId}')::uuid;
  caller_session_id := (context#>>'{principal,sessionId}')::uuid;
  mfa_valid := (context->>'mfaValid')::boolean;
  select a.* into account_row from msrc_authorization.account_access a where a.actor_id=caller_id;
  if not found or account_row.state <> 'active' then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'actorId',g.actor_id,'editionId',g.edition_key,'role',g.role_name,'state','active',
    'scope',case g.scope_kind
      when 'edition' then jsonb_build_object('kind','edition')
      when 'track' then jsonb_build_object('kind','track','track',g.track,'trackId',g.scope_target)
      when 'assignment' then jsonb_build_object('kind','assignment','assignmentId',g.scope_target)
      when 'function' then jsonb_build_object('kind','function','functionId',g.scope_target)
      when 'resource' then jsonb_build_object('kind','resource','resourceId',g.scope_target)
    end
  ) order by g.id),'[]'::jsonb) into own_grants from msrc_authorization.role_grants g
  where g.actor_id=caller_id and g.edition_key=msrc_access_context.edition_key and g.state='active';
  return jsonb_build_object('schemaVersion',1,'editionId',edition_key,
    'principal',jsonb_build_object('userId',caller_id,'sessionId',caller_session_id),
    'actor',jsonb_build_object('id',caller_id,'state',account_row.state,
      'emailVerified',(context->>'emailVerified')::boolean,
      'phoneVerified',(context->>'phoneVerified')::boolean,
      'individuallyIdentified',account_row.individually_identified,
      'session',jsonb_build_object('id',caller_session_id,'active',false,'passwordVerified',true,
        'authenticationTier',context->>'authenticationTier','staffEmailVerified',(context->>'staffEmailValid')::boolean,
        'assurance',case when mfa_valid then 'aal2' else 'aal1' end,
        'factor',case when mfa_valid then 'sms' else null end)),
    'grants',own_grants,'operationalAccessReady',false,'privilegedAccessReady',false);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then return null;
end; $$;
alter function msrc_staff_email.audit_change() owner to postgres;
alter function msrc_staff_email.lock_grant_change() owner to postgres;
alter function msrc_staff_email.guard_audit() owner to postgres;
alter function msrc_staff_email.basis(uuid,uuid) owner to postgres;
alter function msrc_staff_email.valid_receipt(uuid,uuid) owner to postgres;
alter function public.msrc_staff_email_begin(uuid,uuid,uuid,text,text) owner to postgres;
alter function public.msrc_staff_email_delivery(uuid,uuid,uuid,boolean) owner to postgres;
alter function public.msrc_staff_email_consume(uuid,uuid,uuid,text) owner to postgres;
alter function public.msrc_second_step_satisfied() owner to postgres;
notify pgrst,'reload schema';
