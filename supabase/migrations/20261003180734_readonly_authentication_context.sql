-- AUTH-04/05, ROL-12, SEC-01/06. Additive REVIEW ONLY; no hosted apply.
-- PostgREST table GET/HEAD runs in a read-only transaction. RLS predicates must
-- neither lock rows nor initialize/update clocks, receipts, revocations or audit.
-- Stable private observation preserves one statement snapshot. Concurrent
-- revocations affect the next statement; trusted mutations retain existing locks.
-- Missing initialized session state denies direct reads. The existing write RPC
-- still initializes original native history; refresh cannot restart it.

create function msrc_staff_email.observe_basis(target_actor uuid,target_session uuid) returns jsonb
language plpgsql stable security definer set search_path='' set timezone='UTC' as $$
declare
  observed_at timestamptz := clock_timestamp();
  account_row msrc_authorization.account_access%rowtype;
  user_row auth.users%rowtype;
  identity_row msrc_staff_email.identity_revision%rowtype;
  session_row auth.sessions%rowtype;
  policy_row msrc_sessions.policy%rowtype;
  state_row msrc_sessions.session_state%rowtype;
  password_at timestamptz;
  grant_fingerprint text;
  bound_fingerprint text;
  cutoff timestamptz;
begin
  select a.* into account_row from msrc_authorization.account_access a where a.actor_id=target_actor;
  if not found or account_row.state <> 'active' or not account_row.individually_identified then return null; end if;
  if not exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor
      and g.state='active' and g.role_name <> 'participant')
    or exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor
      and g.state='active' and g.role_name='superAdmin') then return null; end if;
  select u.* into user_row from auth.users u where u.id=target_actor;
  observed_at := clock_timestamp();
  if not found or user_row.deleted_at is not null or user_row.is_anonymous
    or (user_row.banned_until is not null and user_row.banned_until > observed_at)
    or user_row.email_confirmed_at is null or user_row.email_confirmed_at > observed_at
    or coalesce(btrim(user_row.email),'')='' then return null; end if;
  select r.* into identity_row from msrc_staff_email.identity_revision r where r.actor_id=target_actor;
  if not found then return null; end if;
  select s.* into session_row from auth.sessions s where s.id=target_session and s.user_id=target_actor;
  if not found then return null; end if;
  select p.* into policy_row from msrc_sessions.policy p where p.singleton;
  if not found then return null; end if;
  select s.* into state_row from msrc_sessions.session_state s where s.session_id=target_session;
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
  if password_at is null or password_at < session_row.created_at or password_at > observed_at
    or (identity_row.password_changed_at is not null and password_at < identity_row.password_changed_at) then return null; end if;
  select encode(sha256(convert_to(coalesce(jsonb_agg(jsonb_build_object('id',g.id,'edition',g.edition_key,
    'role',g.role_name,'scope',g.scope_kind,'track',g.track,'target',g.scope_target,'state',g.state)
    order by g.id)::text,'[]'),'UTF8')),'hex') into grant_fingerprint
    from msrc_authorization.role_grants g where g.actor_id=target_actor;
  bound_fingerprint := encode(sha256(convert_to(jsonb_build_object('email',user_row.email,
    'confirmed',user_row.email_confirmed_at,'identityRevision',identity_row.revision,
    'passwordAt',password_at,'grantVersion',grant_fingerprint)::text,'UTF8')),'hex');
  return jsonb_build_object('binding',bound_fingerprint,'recipient',user_row.email,'passwordAt',password_at);
end; $$;

create function msrc_staff_email.observe_valid_receipt(target_actor uuid,target_session uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare evidence jsonb;
begin
  evidence := msrc_staff_email.observe_basis(target_actor,target_session);
  if evidence is null then return false; end if;
  return exists(select 1 from msrc_staff_email.receipts r join msrc_staff_email.challenges c on c.id=r.challenge_id
    where r.actor_id=target_actor and r.session_id=target_session and r.binding=evidence->>'binding'
      and c.actor_id=target_actor and c.session_id=target_session and c.binding=r.binding
      and c.state='verified' and c.verified_at=r.verified_at and r.verified_at <= clock_timestamp()
      and r.verified_at >= (evidence->>'passwordAt')::timestamptz);
end; $$;

create function msrc_sessions.observe_context(edition_key text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
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
  password_at timestamptz;
  totp_mfa_at timestamptz;
  native_password_at timestamptz;
  native_totp_at timestamptz;
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
    or not exists(select 1 from msrc_authorization.edition_config e where e.edition_key=observe_context.edition_key)
    or jsonb_typeof(claims->'exp') is distinct from 'number'
    or (claims->>'exp')::numeric <= extract(epoch from observed_at)
    or (claims->>'session_id') is null
    or (claims->>'session_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or (claims->>'sub')::uuid is distinct from caller_id then return null; end if;
  sid := (claims->>'session_id')::uuid;
  select a.* into account_row from msrc_authorization.account_access a where a.actor_id=caller_id;
  if not found then return null; end if;
  select s.* into managed from auth.sessions s join auth.users u on u.id=s.user_id
    where s.id=sid and s.user_id=caller_id and s.created_at <= observed_at
      and (s.not_after is null or s.not_after > observed_at)
      and u.deleted_at is null
      and not u.is_anonymous and (u.banned_until is null or u.banned_until <= observed_at)
   ;
  if not found then return null; end if;
  select u.* into user_row from auth.users u where u.id=caller_id;
  email_verified := user_row.email_confirmed_at is not null and coalesce(btrim(user_row.email),'') <> '';
  select p.* into policy_row from msrc_sessions.policy p where p.singleton;
  if not found then return null; end if;
  -- A caller-controlled edition selector cannot downgrade the session's staff limits.
  -- Domain authorization/grant projections still remain edition-scoped elsewhere.
  privileged := exists(select 1 from msrc_authorization.role_grants g where g.actor_id=caller_id
    and g.state='active' and g.role_name <> 'participant');
  authentication_tier := case when exists(select 1 from msrc_authorization.role_grants g
    where g.actor_id=caller_id and g.state='active' and g.role_name='superAdmin') then 'super_admin'
    when privileged then 'staff' else 'participant' end;
  if authentication_tier='staff' then staff_email_valid := msrc_staff_email.observe_valid_receipt(caller_id,sid); end if;
  -- Observation cannot create native-origin or activity history. The trusted
  -- read-write context RPC initializes it before any protected direct read.
  select s.* into state_row from msrc_sessions.session_state s where s.session_id=sid;
  if not found then return null; end if;
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
  -- Super Admin assurance requires password followed by managed totp in THIS
  -- session, tied to the current verified authenticator-app factor. Generic AAL2,
  -- phone MFA and primary OTP are insufficient. Ordinary staff use private email
  -- receipts; participants require only current verified email and password.
  select max(to_timestamp((a.item->>'timestamp')::double precision)) filter(where a.item->>'method'='password'),
    max(to_timestamp((a.item->>'timestamp')::double precision)) filter(where a.item->>'method'='totp'),
    max(to_timestamp((a.item->>'timestamp')::double precision)) filter(where a.item->>'method' in ('password','totp'))
    into password_at,totp_mfa_at,authenticated_at
    from jsonb_array_elements(case when jsonb_typeof(claims->'amr')='array' then claims->'amr' else '[]'::jsonb end) a(item)
    where jsonb_typeof(a.item->'timestamp')='number';
  password_valid := coalesce(floor(extract(epoch from password_at)) >= floor(extract(epoch from managed.created_at))
    and password_at <= observed_at,false);
  if authentication_tier='staff' then
    password_valid := password_valid and exists(select 1 from msrc_staff_email.identity_revision r
      join auth.mfa_amr_claims a on a.session_id=sid and a.authentication_method='password'
      where r.actor_id=caller_id and a.updated_at::timestamptz >= managed.created_at
        and a.updated_at::timestamptz <= observed_at
        and (r.password_changed_at is null or a.updated_at::timestamptz >= r.password_changed_at));
  end if;
  if managed.factor_id is not null then
    select f.* into factor_row from auth.mfa_factors f where f.id=managed.factor_id and f.user_id=caller_id;
  end if;
  -- Native managed evidence retains sub-second precision unavailable in signed AMR.
  -- STABLE observation uses one statement snapshot for the same current session.
  select max(a.updated_at::timestamptz) filter(where a.authentication_method='password'),
    max(a.updated_at::timestamptz) filter(where a.authentication_method='totp')
    into native_password_at,native_totp_at
    from auth.mfa_amr_claims a where a.session_id=sid;
  -- Deadline checks use the current clock after reading the native evidence.
  observed_at := clock_timestamp();
  if managed.not_after is not null and managed.not_after <= observed_at
    or (claims->>'exp')::numeric <= extract(epoch from observed_at) then return null; end if;
  mfa_valid := coalesce(password_valid and claims->>'aal'='aal2' and managed.aal::text='aal2'
    and factor_row.factor_type::text='totp' and factor_row.status::text='verified'
    and native_password_at is not null and native_totp_at is not null
    and native_password_at >= managed.created_at and native_password_at <= observed_at
    and floor(extract(epoch from password_at)) = floor(extract(epoch from native_password_at))
    and floor(extract(epoch from totp_mfa_at)) = floor(extract(epoch from native_totp_at))
    and native_totp_at >= greatest(factor_row.created_at,factor_row.updated_at,managed.created_at,native_password_at)
    and native_totp_at <= observed_at
    and floor(extract(epoch from totp_mfa_at)) >= floor(extract(epoch from greatest(
      factor_row.created_at,factor_row.updated_at,managed.created_at,password_at)))
    and totp_mfa_at <= observed_at,false);
  if state_row.revoked_at is not null or managed.created_at <= cutoff then reason := 'session_revoked';
  elsif account_row.state <> 'active' then reason := 'account_suspended';
  elsif observed_at >= absolute_end then reason := 'absolute_expired';
  elsif privileged and observed_at >= idle_end then reason := 'idle_expired';
  elsif not email_verified then reason := 'account_verification_required';
  elsif not password_valid then reason := 'password_auth_required';
  elsif privileged and not account_row.individually_identified then reason := 'individual_identity_required';
  elsif authentication_tier='super_admin' and not mfa_valid then reason := 'mfa_required';
  elsif authentication_tier='staff' and not staff_email_valid then reason := 'staff_email_check_required';
  elsif coalesce(claims->>'aal','aal1') not in ('aal1','aal2') then return null;
  end if;
  if staff_email_valid then
    select greatest(authenticated_at,r.verified_at) into authenticated_at
      from msrc_staff_email.receipts r where r.session_id=sid and r.actor_id=caller_id;
  end if;
  return jsonb_build_object('schemaVersion',1,'editionId',edition_key,
    'principal',jsonb_build_object('userId',caller_id,'sessionId',sid),'privileged',privileged,
    'sessionPolicySatisfied',reason is null,'reason',reason,'mfaValid',mfa_valid,
    'authenticationTier',authentication_tier,'staffEmailValid',staff_email_valid,
    'passwordValid',password_valid,'emailVerified',email_verified,
    'timing',jsonb_build_object('startedAt',state_row.started_at,'lastActivityAt',state_row.last_activity_at,
      'absoluteExpiresAt',absolute_end,'idleExpiresAt',idle_end,'authenticatedAt',authenticated_at),
    'policy',jsonb_build_object('participantAbsoluteSeconds',policy_row.participant_absolute_seconds,
      'privilegedIdleSeconds',policy_row.privileged_idle_seconds,'privilegedAbsoluteSeconds',policy_row.privileged_absolute_seconds,
      'recentAuthMaxAgeSeconds',policy_row.recent_auth_max_age_seconds,'warningLeadSeconds',policy_row.warning_lead_seconds),
    'operationalAccessReady',false,'privilegedAccessReady',false);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then return null;
end; $$;

create or replace function public.msrc_second_step_satisfied() returns boolean
language plpgsql stable security definer set search_path='' as $$
declare own jsonb; configured_edition text;
begin
  if auth.uid() is null then return false; end if;
  select min(e.edition_key) into configured_edition from msrc_authorization.edition_config e;
  if configured_edition is null then return false; end if;
  own := msrc_sessions.observe_context(configured_edition);
  return coalesce((own->>'sessionPolicySatisfied')::boolean,false);
end; $$;

create function msrc_sessions.observe_access_context(edition_key text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  context jsonb;
  caller_id uuid;
  caller_session_id uuid;
  account_row msrc_authorization.account_access%rowtype;
  own_grants jsonb := '[]'::jsonb;
  mfa_valid boolean;
begin
  context := msrc_sessions.observe_context(edition_key);
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
  where g.actor_id=caller_id and g.edition_key=observe_access_context.edition_key and g.state='active';
  return jsonb_build_object('schemaVersion',1,'editionId',edition_key,
    'principal',jsonb_build_object('userId',caller_id,'sessionId',caller_session_id),
    'actor',jsonb_build_object('id',caller_id,'state',account_row.state,
      'emailVerified',(context->>'emailVerified')::boolean,
      'individuallyIdentified',account_row.individually_identified,
      'session',jsonb_build_object('id',caller_session_id,'active',false,'passwordVerified',true,
        'authenticationTier',context->>'authenticationTier','staffEmailVerified',(context->>'staffEmailValid')::boolean,
        'assurance',case when mfa_valid then 'aal2' else 'aal1' end,
        'factor',case when mfa_valid then 'totp' else null end)),
    'grants',own_grants,'operationalAccessReady',false,'privilegedAccessReady',false);
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then return null;
end; $$;

-- RLS role/scope predicates must use this STABLE projection together with the
-- STABLE second-step predicate. The existing VOLATILE write RPC remains intact:
-- its POST path initializes native-origin history for the server identity adapter.
create function public.msrc_read_access_context(edition_key text) returns jsonb
language sql stable security definer set search_path='' as $$
  select msrc_sessions.observe_access_context(edition_key);
$$;

alter function msrc_staff_email.observe_basis(uuid,uuid) owner to postgres;
alter function msrc_staff_email.observe_valid_receipt(uuid,uuid) owner to postgres;
alter function msrc_sessions.observe_context(text) owner to postgres;
alter function msrc_sessions.observe_access_context(text) owner to postgres;
alter function public.msrc_second_step_satisfied() owner to postgres;
alter function public.msrc_read_access_context(text) owner to postgres;
revoke all on function msrc_staff_email.observe_basis(uuid,uuid),
  msrc_staff_email.observe_valid_receipt(uuid,uuid),msrc_sessions.observe_context(text),
  msrc_sessions.observe_access_context(text)
  from public,anon,authenticated,service_role;
revoke all on function public.msrc_second_step_satisfied(),public.msrc_read_access_context(text)
  from public,anon,authenticated,service_role;
grant execute on function public.msrc_second_step_satisfied(),public.msrc_read_access_context(text) to authenticated;
comment on function msrc_sessions.observe_context(text) is
  'Private read-only statement-snapshot observation of initialized current native session, strongest tier, exact password/email receipt/TOTP and lifecycle deadlines. No locks, writes, grants or activity.';
comment on function public.msrc_second_step_satisfied() is
  'Self-only read-only authentication predicate for restrictive RLS. Initialized current exact session and complete second-step policy required; no role/scope/ownership entitlement or readiness.';
comment on function public.msrc_read_access_context(text) is
  'Self-only STABLE read-only own account/grant projection for RLS and GET, from the same statement snapshot as authentication evidence. Requires initialized native-origin state, keeps session active/readiness FALSE; never use the VOLATILE initialization RPC in read-only RLS.';
notify pgrst,'reload schema';
