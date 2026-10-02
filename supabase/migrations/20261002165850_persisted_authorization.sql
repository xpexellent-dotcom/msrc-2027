-- BL-SEC-01 / ROL-01..12 / SEC-01/02/06 / AUTH-04: persisted, CLOSED authority.
-- No edition, user, account activation, role grant, domain record or bucket is seeded.
-- AUTH-05 session lifecycle is a separate prerequisite: context cannot authorize work.
create schema msrc_authorization;
revoke all on schema msrc_authorization from public, anon, authenticated, service_role;

create table msrc_authorization.edition_config (
  edition_key text primary key check (edition_key = btrim(edition_key) and char_length(edition_key) between 1 and 128),
  created_at timestamptz not null default statement_timestamp()
);
comment on table msrc_authorization.edition_config is
  'Opaque authority scope only; not event dates, approval, annual data isolation or operational activation.';

create table msrc_authorization.account_access (
  actor_id uuid primary key references auth.users(id) on delete restrict,
  state text not null default 'suspended' check (state in ('active', 'suspended')),
  individually_identified boolean not null default false,
  created_at timestamptz not null default statement_timestamp()
);

create table msrc_authorization.role_grants (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references msrc_authorization.account_access(actor_id) on delete restrict,
  edition_key text not null references msrc_authorization.edition_config(edition_key) on delete restrict,
  role_name text not null check (role_name in (
    'participant', 'abstractReviewer', 'hackathonReviewer', 'threeMinuteThesisReviewer',
    'scientificAdministrator', 'judgingCommittee', 'facultyJudge',
    'registrationWorkshopAdministrator', 'finance', 'checkInStaff',
    'contentMediaEditor', 'sponsorshipPr', 'superAdmin'
  )),
  scope_kind text not null check (scope_kind in ('edition', 'track', 'assignment', 'function', 'resource')),
  track text,
  scope_target text,
  state text not null default 'active' check (state in ('active', 'revoked')),
  grant_reason text not null check (grant_reason = btrim(grant_reason) and char_length(grant_reason) between 1 and 500),
  granted_at timestamptz not null default statement_timestamp(),
  revoked_at timestamptz,
  revocation_reason text,
  constraint role_grant_scope_valid check (
    (scope_kind = 'edition' and track is null and scope_target is null)
    or (scope_kind = 'track' and track is not null and track in ('research', 'hackathon', 'threeMinuteThesis')
      and scope_target is not null and scope_target = btrim(scope_target) and char_length(scope_target) between 1 and 256)
    or (scope_kind in ('assignment', 'function', 'resource') and track is null
      and scope_target is not null and scope_target = btrim(scope_target) and char_length(scope_target) between 1 and 256)
  ),
  constraint role_grant_revocation_valid check (
    (state = 'active' and revoked_at is null and revocation_reason is null)
    or (state = 'revoked' and revoked_at is not null and revocation_reason is not null
      and revocation_reason = btrim(revocation_reason) and char_length(revocation_reason) between 1 and 500)
  )
);
create index role_grants_actor_edition_active on msrc_authorization.role_grants(actor_id, edition_key) where state = 'active';
create index role_grants_edition_key on msrc_authorization.role_grants(edition_key);
create unique index role_grants_active_scope_unique on msrc_authorization.role_grants
  (actor_id, edition_key, role_name, scope_kind, coalesce(track, ''), coalesce(scope_target, '')) where state = 'active';
comment on table msrc_authorization.role_grants is
  'Immutable scoped authority history. Database maintenance only; opaque scope references require future domain validation. No workflow activation.';

create table msrc_authorization.grant_audit (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references msrc_authorization.role_grants(id) on delete restrict,
  actor_id uuid not null,
  edition_key text not null,
  event text not null check (event in ('grant.created', 'grant.revoked')),
  role_name text not null,
  scope_kind text not null,
  track text,
  scope_target text,
  reason text not null,
  performed_by_db_role text not null,
  occurred_at timestamptz not null default statement_timestamp()
);
create index grant_audit_grant_id on msrc_authorization.grant_audit(grant_id);
comment on table msrc_authorization.grant_audit is
  'Append-only database-maintenance evidence, not website staff identity verification. No email, token, file content or reusable URL.';

alter table msrc_authorization.edition_config enable row level security;
alter table msrc_authorization.edition_config force row level security;
alter table msrc_authorization.account_access enable row level security;
alter table msrc_authorization.account_access force row level security;
alter table msrc_authorization.role_grants enable row level security;
alter table msrc_authorization.role_grants force row level security;
alter table msrc_authorization.grant_audit enable row level security;
alter table msrc_authorization.grant_audit force row level security;
revoke all on all tables in schema msrc_authorization from public, anon, authenticated, service_role;
revoke all on all sequences in schema msrc_authorization from public, anon, authenticated, service_role;
alter default privileges in schema msrc_authorization revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema msrc_authorization revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema msrc_authorization revoke execute on functions from public, anon, authenticated, service_role;
-- Intentionally no client RLS policy. The narrow own-context RPC is the only read.

create function msrc_authorization.maintain_role_grant()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  -- No client API mutation/activation path exists. Provider-owner maintenance must
  -- be reviewed and tied to a named human in the future staff/bootstrap runbook.
  if current_user <> 'postgres' or session_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'Authority maintenance is restricted.';
  end if;
  if tg_op = 'DELETE' then
    raise exception using errcode = '55000', message = 'Grant history is immutable.';
  elsif tg_op = 'INSERT' then
    if new.state <> 'active' or new.revoked_at is not null or new.revocation_reason is not null then
      raise exception using errcode = '55000', message = 'New grants must start active.';
    end if;
    new.granted_at := statement_timestamp();
  else
    if old.state <> 'active' or new.state <> 'revoked'
      or (to_jsonb(new) - array['state', 'revoked_at', 'revocation_reason'])
        is distinct from (to_jsonb(old) - array['state', 'revoked_at', 'revocation_reason']) then
      raise exception using errcode = '55000', message = 'Only irreversible grant revocation is permitted.';
    end if;
    new.revoked_at := statement_timestamp();
  end if;
  return new;
end;
$$;
create trigger maintain_role_grant before insert or update or delete on msrc_authorization.role_grants
  for each row execute function msrc_authorization.maintain_role_grant();

create function msrc_authorization.audit_role_grant()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user <> 'postgres' or session_user <> 'postgres' then
    raise exception using errcode = '42501', message = 'Authority maintenance is restricted.';
  end if;
  insert into msrc_authorization.grant_audit
    (grant_id, actor_id, edition_key, event, role_name, scope_kind, track, scope_target, reason, performed_by_db_role)
  values (new.id, new.actor_id, new.edition_key,
    case when tg_op = 'INSERT' then 'grant.created' else 'grant.revoked' end,
    new.role_name, new.scope_kind, new.track, new.scope_target,
    case when tg_op = 'INSERT' then new.grant_reason else new.revocation_reason end, session_user);
  return new;
end;
$$;
create trigger audit_role_grant after insert or update on msrc_authorization.role_grants
  for each row execute function msrc_authorization.audit_role_grant();

create function msrc_authorization.prevent_audit_change()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' and pg_trigger_depth() >= 2 and current_user = 'postgres' and session_user = 'postgres' then
    return new;
  end if;
  raise exception using errcode = '55000', message = 'Grant audit is append-only.';
end;
$$;
create trigger grant_audit_append_only before insert or update or delete on msrc_authorization.grant_audit
  for each row execute function msrc_authorization.prevent_audit_change();
create function msrc_authorization.prevent_history_truncate()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception using errcode = '55000', message = 'Authority history cannot be truncated.';
end;
$$;
create trigger role_grants_no_truncate before truncate on msrc_authorization.role_grants
  for each statement execute function msrc_authorization.prevent_history_truncate();
create trigger grant_audit_no_truncate before truncate on msrc_authorization.grant_audit
  for each statement execute function msrc_authorization.prevent_history_truncate();
revoke all on all functions in schema msrc_authorization from public, anon, authenticated, service_role;

-- Required narrow exception: definer reads unexposed authority + managed Auth.
-- All inputs are trusted provider claims except an opaque edition selector.
-- This function never returns resource/assignment facts or other actor identities.
create function public.msrc_access_context(edition_key text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  claims jsonb;
  caller_id uuid;
  caller_session_id uuid;
  session_claim text;
  session_row auth.sessions%rowtype;
  account_state text := 'suspended';
  individual boolean := false;
  mfa_valid boolean := false;
  own_grants jsonb := '[]'::jsonb;
begin
  if edition_key is null or edition_key <> btrim(edition_key)
    or char_length(edition_key) not between 1 and 128
    or not exists(select 1 from msrc_authorization.edition_config e where e.edition_key = msrc_access_context.edition_key) then
    return null;
  end if;
  claims := auth.jwt();
  caller_id := auth.uid();
  session_claim := claims->>'session_id';
  if caller_id is null or jsonb_typeof(claims) <> 'object'
    or (claims->>'sub')::uuid is distinct from caller_id
    or session_claim is null or session_claim !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or jsonb_typeof(claims->'exp') is distinct from 'number'
    or (claims->>'exp')::numeric <= extract(epoch from statement_timestamp()) then
    return null;
  end if;
  caller_session_id := session_claim::uuid;
  select s.* into session_row from auth.sessions s join auth.users u on u.id = s.user_id
  where s.id = caller_session_id and s.user_id = caller_id
    and (s.not_after is null or s.not_after > statement_timestamp())
    and u.deleted_at is null and u.email_confirmed_at is not null and u.email is not null and char_length(btrim(u.email)) > 0 and not u.is_anonymous
    and (u.banned_until is null or u.banned_until <= statement_timestamp());
  if not found then return null; end if;

  if claims->>'aal' = 'aal2' then
    select exists (
      select 1 from auth.mfa_factors f
      where f.id = session_row.factor_id and f.user_id = caller_id
        and f.factor_type::text = 'totp' and f.status::text = 'verified'
        and session_row.aal::text = 'aal2'
        and exists (
          select 1 from jsonb_array_elements(case when jsonb_typeof(claims->'amr') = 'array'
            then claims->'amr' else '[]'::jsonb end) a(item)
          where a.item->>'method' = 'totp' and jsonb_typeof(a.item->'timestamp') = 'number'
            and case when jsonb_typeof(a.item->'timestamp') = 'number' then (a.item->>'timestamp')::numeric else null end
              between greatest(floor(extract(epoch from f.created_at)), floor(extract(epoch from f.updated_at)))
                and floor(extract(epoch from statement_timestamp()))
        )
    ) into mfa_valid;
    -- Removed/reset/unverified/foreign factor or downgraded session invalidates old AAL2.
    if not mfa_valid then return null; end if;
  elsif coalesce(claims->>'aal', 'aal1') <> 'aal1' then
    return null;
  end if;

  select a.state, a.individually_identified into account_state, individual
  from msrc_authorization.account_access a where a.actor_id = caller_id;
  if not found then account_state := 'suspended'; individual := false; end if;
  if account_state = 'active' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'actorId', g.actor_id, 'editionId', g.edition_key, 'role', g.role_name, 'state', 'active',
      'scope', case g.scope_kind
        when 'edition' then jsonb_build_object('kind', 'edition')
        when 'track' then jsonb_build_object('kind', 'track', 'track', g.track, 'trackId', g.scope_target)
        when 'assignment' then jsonb_build_object('kind', 'assignment', 'assignmentId', g.scope_target)
        when 'function' then jsonb_build_object('kind', 'function', 'functionId', g.scope_target)
        when 'resource' then jsonb_build_object('kind', 'resource', 'resourceId', g.scope_target)
      end
    ) order by g.id), '[]'::jsonb) into own_grants
    from msrc_authorization.role_grants g
    where g.actor_id = caller_id and g.edition_key = msrc_access_context.edition_key and g.state = 'active';
  end if;
  return jsonb_build_object(
    'schemaVersion', 1, 'editionId', edition_key,
    'principal', jsonb_build_object('userId', caller_id, 'sessionId', caller_session_id),
    'actor', jsonb_build_object('id', caller_id, 'state', account_state,
      'emailVerified', true, 'individuallyIdentified', individual,
      'session', jsonb_build_object('id', caller_session_id, 'active', false,
        'assurance', case when mfa_valid then 'aal2' else 'aal1' end,
        'factor', case when mfa_valid then 'totp' else null end)),
    'grants', own_grants, 'operationalAccessReady', false, 'privilegedAccessReady', false
  );
exception when invalid_text_representation or numeric_value_out_of_range then
  return null;
end;
$$;
alter function public.msrc_access_context(text) owner to postgres;
revoke all on function public.msrc_access_context(text) from public, anon, authenticated, service_role;
grant execute on function public.msrc_access_context(text) to authenticated;
comment on function public.msrc_access_context(text) is
  'Own caller context only. All operational readiness and session active remain FALSE pending AUTH-05. Fixed definer exception; never a resource authority reader.';
notify pgrst, 'reload schema';
