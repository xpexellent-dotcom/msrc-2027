-- ENG-056, NFR-01..03, REL-02/06, SEC-02/06, EML-04/05.
-- Read-only observability only. No scheduler, workflow switch or delivery change.
do $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native migration operator required.';
 end if;
end$$;

-- The public route calls this constant query through the Data API. Reaching an
-- API gateway is insufficient: the function must actually execute in Postgres.
create function public.msrc_health_check() returns boolean
 language sql stable security invoker set search_path='' as $$select true$$;

-- One snapshot/scan, no claims, locks, sweeps or per-message data. The SECURITY
-- DEFINER boundary is needed because the private forced-RLS tables deliberately
-- have no API grants, including service_role. Only the service role may execute.
create function public.msrc_outbox_monitor() returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'counts',jsonb_build_object(
   'queued',count(*) filter(where status='queued'),
   'sending',count(*) filter(where status='sending'),
   'sent',count(*) filter(where status='sent'),
   'failed_retryable',count(*) filter(where status='failed_retryable'),
   'failed_permanent',count(*) filter(where status='failed_permanent'),
   'cancelled',count(*) filter(where status='cancelled')),
  'oldestPendingAgeSeconds',coalesce(greatest(0,floor(extract(epoch from
   statement_timestamp()-min(created_at) filter(where status in('queued','failed_retryable')))))::bigint,0::bigint))
 from msrc_outbox.messages;
$$;

revoke all on function public.msrc_health_check() from public,anon,authenticated,service_role;
revoke all on function public.msrc_outbox_monitor() from public,anon,authenticated,service_role;
grant execute on function public.msrc_health_check() to service_role;
grant execute on function public.msrc_outbox_monitor() to service_role;

comment on function public.msrc_health_check() is 'Service-only no-data reachability query. Does not certify migrations, authorization, settings, workflow readiness or provider delivery.';
comment on function public.msrc_outbox_monitor() is 'Service-only read-only aggregate for the independently secret-protected monitor. Counts six retained-message states and oldest queued/retryable age only. No personal data, claims, delivery or maintenance.';
