-- AUTH-04/05, ROL-12, SEC-01/02: deliberate staff reads may renew idle time.
-- Review only. No hosted application or workflow activation is authorized.
-- Existing own_context and authorize guards retain native origin, eight-hour
-- absolute expiry, thirty-minute idle expiry, current grants and strongest proof.
-- Replace the existing authenticated RPC without adding any client grants.
-- Participant callers retain the exact pre-existing observation-only behavior.
create or replace function public.msrc_session_activity(edition_key text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
begin
  if exists(select 1 from msrc_staff.profiles where actor_id=auth.uid()) then
    return msrc_staff.authorize(edition_key,null,true);
  end if;
  return msrc_sessions.own_context(edition_key,false);
end;
$$;
comment on function public.msrc_session_activity(text) is
  'Exact-session staff activity only; no private schema/table grants; observers and refresh remain non-activity.';
