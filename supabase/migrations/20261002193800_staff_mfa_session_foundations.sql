-- BL-AUTH-05/06 / AUTH-04/05 / ROL-12 / SEC-01/06. REVIEW ONLY: never applied hosted by this task.
-- No managed identity, edition, grant, factor or application session is seeded.
create schema msrc_sessions;
revoke all on schema msrc_sessions from public, anon, authenticated, service_role;

create table msrc_sessions.policy (
  singleton boolean primary key default true check (singleton),
  participant_absolute_seconds integer not null check (participant_absolute_seconds between 1 and 259200),
  privileged_idle_seconds integer not null check (privileged_idle_seconds between 1 and 1800),
  privileged_absolute_seconds integer not null check (privileged_absolute_seconds between 1 and 28800),
  recent_auth_max_age_seconds integer check (recent_auth_max_age_seconds > 0),
  warning_lead_seconds integer check (warning_lead_seconds > 0),
  operational_access_ready boolean not null default false check (not operational_access_ready),
  privileged_access_ready boolean not null default false check (not privileged_access_ready)
);
insert into msrc_sessions.policy(singleton,participant_absolute_seconds,privileged_idle_seconds,privileged_absolute_seconds)
values (true,259200,1800,28800);
comment on table msrc_sessions.policy is 'Approved 72h participant absolute; 30min idle/8h absolute staff. Recent auth and warning lead unset; readiness cannot open in this foundation.';

create table msrc_sessions.session_state (
  session_id uuid primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  started_at timestamptz not null,
  last_activity_at timestamptz not null,
  revoked_at timestamptz,
  revocation_cause text check (revocation_cause in ('logout','suspension','factor_reset','policy_expired','security')),
  constraint session_times_valid check (last_activity_at >= started_at),
  constraint session_revocation_valid check ((revoked_at is null and revocation_cause is null)
    or (revoked_at is not null and revocation_cause is not null))
);
create index session_state_actor on msrc_sessions.session_state(actor_id);
comment on table msrc_sessions.session_state is 'Server-observed lifecycle. No Auth session FK: provider logout must remain able to delete its session. Immutable origin; token refresh is not activity.';

create table msrc_sessions.actor_revocations (
  actor_id uuid primary key references auth.users(id) on delete restrict,
  revoked_before timestamptz not null,
  cause text not null check (cause in ('suspension','factor_reset','security')),
  performed_by_actor_id uuid,
  performed_by_db_role text not null
);
comment on table msrc_sessions.actor_revocations is 'Irreversible session-origin cutoff, including unobserved old sessions. No factor reset operation or recovery approval is implemented.';

create table msrc_sessions.security_audit (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in ('session.observed','session.revoked','actor.sessions.revoked')),
  actor_id uuid not null,
  session_id uuid,
  cause text check (cause in ('logout','suspension','factor_reset','policy_expired','security')),
  performed_by_actor_id uuid,
  performed_by_db_role text not null,
  occurred_at timestamptz not null default statement_timestamp()
);
create index security_audit_actor on msrc_sessions.security_audit(actor_id);
comment on table msrc_sessions.security_audit is 'Append-only safe identity references and enum causes. No email, password, token, factor secret, OTP, payload or free-form content.';

alter table msrc_sessions.policy enable row level security;
alter table msrc_sessions.policy force row level security;
alter table msrc_sessions.session_state enable row level security;
alter table msrc_sessions.session_state force row level security;
alter table msrc_sessions.actor_revocations enable row level security;
alter table msrc_sessions.actor_revocations force row level security;
alter table msrc_sessions.security_audit enable row level security;
alter table msrc_sessions.security_audit force row level security;
revoke all on all tables in schema msrc_sessions from public, anon, authenticated, service_role;
revoke all on all sequences in schema msrc_sessions from public, anon, authenticated, service_role;
alter default privileges in schema msrc_sessions revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema msrc_sessions revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema msrc_sessions revoke execute on functions from public, anon, authenticated, service_role;

create function msrc_sessions.guard_session_state() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'postgres' then
    raise exception using errcode='42501', message='Session maintenance is restricted.';
  end if;
  if tg_op = 'DELETE' then
    raise exception using errcode='55000', message='Session history is immutable.';
  elsif tg_op = 'INSERT' then
    if not exists(select 1 from auth.sessions s where s.id=new.session_id and s.user_id=new.actor_id
      and s.created_at=new.started_at) or new.last_activity_at <> new.started_at
      or new.revoked_at is not null then
      raise exception using errcode='55000', message='Session origin must match managed evidence.';
    end if;
  elsif new.session_id is distinct from old.session_id or new.actor_id is distinct from old.actor_id
    or new.started_at is distinct from old.started_at or new.last_activity_at < old.last_activity_at
    or new.last_activity_at > statement_timestamp()
    or (old.revoked_at is not null and new is distinct from old) then
    raise exception using errcode='55000', message='Session origin and revocation are immutable.';
  end if;
  if tg_op='UPDATE' and old.revoked_at is null and new.revoked_at is not null then
    new.revoked_at := statement_timestamp();
  end if;
  return new;
end; $$;
create trigger session_state_guard before insert or update or delete on msrc_sessions.session_state
for each row execute function msrc_sessions.guard_session_state();

create function msrc_sessions.audit_session_state() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='INSERT' or (old.revoked_at is null and new.revoked_at is not null) then
    insert into msrc_sessions.security_audit(event,actor_id,session_id,cause,performed_by_actor_id,performed_by_db_role)
    values (case when tg_op='INSERT' then 'session.observed' else 'session.revoked' end,
      new.actor_id,new.session_id,new.revocation_cause,
      case when session_user='postgres' then null else auth.uid() end,session_user);
  end if;
  return new;
end; $$;
create trigger session_state_audit after insert or update on msrc_sessions.session_state
for each row execute function msrc_sessions.audit_session_state();

create function msrc_sessions.guard_actor_revocation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'postgres' or tg_op='DELETE' then
    raise exception using errcode='55000', message='Actor revocation history is restricted.';
  end if;
  if tg_op='UPDATE' and (new.actor_id is distinct from old.actor_id or new.revoked_before < old.revoked_before) then
    raise exception using errcode='55000', message='Revocation cutoff cannot move backwards.';
  end if;
  new.revoked_before := statement_timestamp();
  new.performed_by_db_role := session_user;
  return new;
end; $$;
create trigger actor_revocation_guard before insert or update or delete on msrc_sessions.actor_revocations
for each row execute function msrc_sessions.guard_actor_revocation();

create function msrc_sessions.audit_actor_revocation() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into msrc_sessions.security_audit(event,actor_id,cause,performed_by_actor_id,performed_by_db_role)
  values ('actor.sessions.revoked',new.actor_id,new.cause,new.performed_by_actor_id,session_user);
  return new;
end; $$;
create trigger actor_revocation_audit after insert or update on msrc_sessions.actor_revocations
for each row execute function msrc_sessions.audit_actor_revocation();

create function msrc_sessions.guard_audit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op='INSERT' and pg_trigger_depth() >= 2 and current_user='postgres' then return new; end if;
  raise exception using errcode='55000', message='Security audit is append-only.';
end; $$;
create trigger security_audit_append_only before insert or update or delete on msrc_sessions.security_audit
for each row execute function msrc_sessions.guard_audit();
create trigger security_audit_no_truncate before truncate on msrc_sessions.security_audit
for each statement execute function msrc_authorization.prevent_history_truncate();
create trigger session_state_no_truncate before truncate on msrc_sessions.session_state
for each statement execute function msrc_authorization.prevent_history_truncate();
create trigger actor_revocations_no_truncate before truncate on msrc_sessions.actor_revocations
for each statement execute function msrc_authorization.prevent_history_truncate();

-- Suspension also invalidates sessions not yet observed by the application. Re-enabling
-- an account cannot restore a pre-suspension bearer. Lock ordering starts with account.
create function msrc_sessions.account_suspension() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.state='suspended' and old.state is distinct from new.state then
    insert into msrc_sessions.actor_revocations(actor_id,revoked_before,cause,performed_by_actor_id,performed_by_db_role)
    values (new.actor_id,statement_timestamp(),'suspension',auth.uid(),session_user)
    on conflict(actor_id) do update set revoked_before=excluded.revoked_before,cause=excluded.cause,
      performed_by_actor_id=excluded.performed_by_actor_id;
    update msrc_sessions.session_state set revoked_at=statement_timestamp(),revocation_cause='suspension'
    where actor_id=new.actor_id and revoked_at is null;
  end if;
  return new;
end; $$;
create trigger account_access_suspend_sessions after update on msrc_authorization.account_access
for each row execute function msrc_sessions.account_suspension();

-- Private attribution contract only. PostgreSQL can supply actor IDs, so this is NOT
-- verified human operator identity. Consequential maintenance remains unconditionally
-- closed with readiness FALSE/recent authentication unset; no factor deletion/recovery.
create function msrc_sessions.revoke_actor_sessions(target_actor_id uuid,performer_actor_id uuid,
  performer_session_id uuid,revocation_cause text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'postgres' or session_user <> 'postgres' then
    raise exception using errcode='42501', message='Session maintenance is restricted.';
  end if;
  if revocation_cause='factor_reset' then
    raise exception using errcode='55000', message='Factor recovery procedure is not configured.';
  end if;
  if revocation_cause <> 'security' or revocation_cause is null
    or not exists(select 1 from msrc_authorization.account_access a
      join auth.sessions s on s.user_id=a.actor_id and s.id=performer_session_id
      join auth.mfa_factors f on f.id=s.factor_id and f.user_id=a.actor_id
      join auth.users u on u.id=a.actor_id
      where a.actor_id=performer_actor_id and a.state='active' and a.individually_identified
        and s.aal::text='aal2' and f.factor_type::text='totp' and f.status::text='verified'
        and s.created_at > statement_timestamp()-interval '8 hours'
        and (s.not_after is null or s.not_after > statement_timestamp())
        and u.deleted_at is null and not u.is_anonymous
        and (u.banned_until is null or u.banned_until <= statement_timestamp())
        and exists(select 1 from msrc_authorization.role_grants g where g.actor_id=a.actor_id
          and g.role_name='superAdmin' and g.state='active')) then
    raise exception using errcode='42501', message='Verified named maintenance actor is required.';
  end if;
  if not exists(select 1 from msrc_sessions.policy p where p.singleton and p.privileged_access_ready
    and p.recent_auth_max_age_seconds is not null) then
    raise exception using errcode='55000', message='Consequential session maintenance is closed.';
  end if;
  perform 1 from msrc_authorization.account_access a where a.actor_id=target_actor_id for update;
  if not found then raise exception using errcode='42501',message='Account is unavailable.'; end if;
  insert into msrc_sessions.actor_revocations(actor_id,revoked_before,cause,performed_by_actor_id,performed_by_db_role)
  values (target_actor_id,statement_timestamp(),revocation_cause,performer_actor_id,session_user)
  on conflict(actor_id) do update set revoked_before=excluded.revoked_before,cause=excluded.cause,
    performed_by_actor_id=excluded.performed_by_actor_id;
  update msrc_sessions.session_state set revoked_at=statement_timestamp(),revocation_cause=revoke_actor_sessions.revocation_cause
  where actor_id=target_actor_id and revoked_at is null;
end; $$;

-- Internal self-bound checker. Caller cannot supply identity, origin, activity timestamp,
-- policy or assurance. Public wrappers choose whether a successful application action
-- counts as activity; context reads and provider refresh never do.
create function msrc_sessions.own_context(edition_key text,record_activity boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  observed_at timestamptz := statement_timestamp();
  claims jsonb;
  caller_id uuid;
  sid uuid;
  managed auth.sessions%rowtype;
  state_row msrc_sessions.session_state%rowtype;
  policy_row msrc_sessions.policy%rowtype;
  account_row msrc_authorization.account_access%rowtype;
  factor_row auth.mfa_factors%rowtype;
  privileged boolean := false;
  mfa_valid boolean := false;
  totp_at timestamptz;
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
      and u.deleted_at is null and u.email_confirmed_at is not null and u.email is not null and btrim(u.email) <> ''
      and not u.is_anonymous and (u.banned_until is null or u.banned_until <= observed_at)
    for share of s,u;
  if not found then return null; end if;
  select p.* into policy_row from msrc_sessions.policy p where p.singleton;
  if not found then return null; end if;
  -- A caller-controlled edition selector cannot downgrade the session's staff limits.
  -- Domain authorization/grant projections still remain edition-scoped elsewhere.
  privileged := exists(select 1 from msrc_authorization.role_grants g where g.actor_id=caller_id
    and g.state='active' and g.role_name <> 'participant');
  insert into msrc_sessions.session_state(session_id,actor_id,started_at,last_activity_at)
  values(sid,caller_id,managed.created_at,managed.created_at) on conflict(session_id) do nothing;
  select s.* into state_row from msrc_sessions.session_state s where s.session_id=sid for update;
  if state_row.actor_id <> caller_id or state_row.started_at <> managed.created_at
    or state_row.last_activity_at > observed_at then return null; end if;
  select r.revoked_before into cutoff from msrc_sessions.actor_revocations r where r.actor_id=caller_id;
  absolute_end := state_row.started_at + make_interval(secs => case when privileged
    then policy_row.privileged_absolute_seconds else policy_row.participant_absolute_seconds end);
  if privileged then idle_end := state_row.last_activity_at + make_interval(secs => policy_row.privileged_idle_seconds); end if;
  select max(to_timestamp((a.item->>'timestamp')::double precision)) filter(where a.item->>'method'='totp'),
    max(to_timestamp((a.item->>'timestamp')::double precision)) filter(where a.item->>'method' in ('password','totp'))
    into totp_at,authenticated_at
    from jsonb_array_elements(case when jsonb_typeof(claims->'amr')='array' then claims->'amr' else '[]'::jsonb end) a(item)
    where jsonb_typeof(a.item->'timestamp')='number';
  if managed.factor_id is not null then
    select f.* into factor_row from auth.mfa_factors f where f.id=managed.factor_id and f.user_id=caller_id for share;
  end if;
  mfa_valid := coalesce(claims->>'aal'='aal2' and managed.aal::text='aal2'
    and factor_row.factor_type::text='totp' and factor_row.status::text='verified'
    and floor(extract(epoch from totp_at)) >= floor(extract(epoch from greatest(factor_row.created_at,factor_row.updated_at,managed.created_at)))
    and totp_at <= observed_at,false);
  if state_row.revoked_at is not null or managed.created_at <= cutoff then reason := 'session_revoked';
  elsif account_row.state <> 'active' then reason := 'account_suspended';
  elsif observed_at >= absolute_end then reason := 'absolute_expired';
  elsif privileged and observed_at >= idle_end then reason := 'idle_expired';
  elsif privileged and not account_row.individually_identified then reason := 'individual_identity_required';
  elsif (privileged or claims->>'aal'='aal2') and not mfa_valid then reason := 'mfa_required';
  elsif coalesce(claims->>'aal','aal1') not in ('aal1','aal2') then return null;
  end if;
  if reason in ('absolute_expired','idle_expired') and state_row.revoked_at is null then
    update msrc_sessions.session_state set revoked_at=observed_at,revocation_cause='policy_expired' where session_id=sid;
  elsif reason is null and record_activity then
    update msrc_sessions.session_state set last_activity_at=observed_at where session_id=sid;
    state_row.last_activity_at := observed_at;
    if privileged then idle_end := observed_at + make_interval(secs => policy_row.privileged_idle_seconds); end if;
  end if;
  return jsonb_build_object('schemaVersion',1,'editionId',edition_key,
    'principal',jsonb_build_object('userId',caller_id,'sessionId',sid),'privileged',privileged,
    'sessionPolicySatisfied',reason is null,'reason',reason,'mfaValid',mfa_valid,
    'timing',jsonb_build_object('startedAt',state_row.started_at,'lastActivityAt',state_row.last_activity_at,
      'absoluteExpiresAt',absolute_end,'idleExpiresAt',idle_end,'authenticatedAt',authenticated_at),
    'policy',jsonb_build_object('participantAbsoluteSeconds',policy_row.participant_absolute_seconds,
      'privilegedIdleSeconds',policy_row.privileged_idle_seconds,'privilegedAbsoluteSeconds',policy_row.privileged_absolute_seconds,
      'recentAuthMaxAgeSeconds',policy_row.recent_auth_max_age_seconds,'warningLeadSeconds',policy_row.warning_lead_seconds),
    'operationalAccessReady',false,'privilegedAccessReady',false);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then return null;
end; $$;

create function public.msrc_session_context(edition_key text) returns jsonb
language sql volatile security definer set search_path = '' as $$
  select msrc_sessions.own_context(edition_key,false);
$$;
create function public.msrc_session_activity(edition_key text) returns jsonb
language sql volatile security definer set search_path = '' as $$
  -- No operational domain is released; arbitrary API heartbeats are not user activity.
  -- A future successful authorized domain mutation may invoke the PRIVATE checker with
  -- record_activity=true in the same transaction. Never grant that primitive to clients.
  select msrc_sessions.own_context(edition_key,false);
$$;
create function public.msrc_session_logout(edition_key text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare context jsonb;
begin
  context := msrc_sessions.own_context(edition_key,false);
  if context is null then return false; end if;
  update msrc_sessions.session_state set revoked_at=statement_timestamp(),revocation_cause='logout'
  where session_id=(context#>>'{principal,sessionId}')::uuid and actor_id=auth.uid() and revoked_at is null;
  return true;
end; $$;
comment on function public.msrc_session_context(text) is 'Own session policy observation only; no idle touch, no resource facts, readiness FALSE.';
comment on function public.msrc_session_activity(text) is 'Closed activity foundation: observations only, no heartbeat touch. Future authorized domain mutations must use the private locked checker.';
alter function public.msrc_session_context(text) owner to postgres;
alter function public.msrc_session_activity(text) owner to postgres;
alter function public.msrc_session_logout(text) owner to postgres;
revoke all on all functions in schema msrc_sessions from public, anon, authenticated, service_role;
revoke all on function public.msrc_session_context(text),public.msrc_session_activity(text),public.msrc_session_logout(text) from public, anon, authenticated, service_role;
grant execute on function public.msrc_session_context(text),public.msrc_session_activity(text),public.msrc_session_logout(text) to authenticated;
notify pgrst,'reload schema';
