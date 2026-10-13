-- AUTH-08, PRV-04/05/08, SEC-02/06, INF-05, REL-06.
-- REVIEW ONLY: this migration never enables participant or retention policies.
-- Private daily cadence/batch/history defaults require owner approval before hosted apply.
-- pg_cron only; no pg_net, HTTP, provider credentials or external writes.

do $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native scheduler operator required.';
 end if;
 if to_regprocedure('msrc_participant.cleanup_unverified(integer,boolean)') is null
  or to_regclass('msrc_participant.retention_policy') is null then
  raise exception using errcode='55000',message='Apply participant age retention first.';
 end if;
end$$;

create table msrc_participant.scheduler_settings (
 singleton boolean primary key default true check(singleton),
 cleanup_schedule text not null default '0 0 * * *' check(length(cleanup_schedule) between 1 and 64),
 cleanup_batch_size integer not null default 100 check(cleanup_batch_size between 1 and 1000),
 staff_purge_schedule text not null default '15 * * * *' check(length(staff_purge_schedule) between 1 and 64),
 history_purge_schedule text not null default '30 0 * * *' check(length(history_purge_schedule) between 1 and 64),
 cron_history_days integer not null default 7 check(cron_history_days between 1 and 365)
);
alter table msrc_participant.scheduler_settings enable row level security;
alter table msrc_participant.scheduler_settings force row level security;
revoke all on msrc_participant.scheduler_settings from public,anon,authenticated,service_role,supabase_auth_admin;
comment on table msrc_participant.scheduler_settings is 'Private candidate defaults for owner approval: daily midnight UTC cleanup, batch 100; hourly staff abuse purge at minute 15; daily history purge at 00:30 UTC; seven days of terminal cron history. Updating schedules atomically reschedules named jobs. This does not enable retention.';

-- Timestamped receipts allow exports after a database restore to recover both
-- irreversible erasure and the monotone ever-verified protection. The verification
-- timestamp is first observation, not a claim about an unknown historical time.
create table msrc_participant.retention_ledger (
 actor_id uuid not null references msrc_participant.subject_refs(actor_id) on delete restrict,
 event text not null check(event in('ever_verified','account_erased')),
 occurred_at timestamptz not null,
 primary key(actor_id,event)
);
create index participant_ledger_export on msrc_participant.retention_ledger(occurred_at,actor_id,event);
alter table msrc_participant.retention_ledger enable row level security;
alter table msrc_participant.retention_ledger force row level security;
revoke all on msrc_participant.retention_ledger from public,anon,authenticated,service_role,supabase_auth_admin;
comment on table msrc_participant.retention_ledger is 'Append-only pseudonymous export receipts: actor UUID, ever_verified/account_erased and first-observed verification or actual erasure timestamp only. No name, email, birth date, credentials, digests, IP, provider payload, notice/proof or operational data. This in-database ledger is not the independent encrypted copy required before restore access.';

create function msrc_participant.guard_retention_ledger() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 if current_user<>'postgres' or tg_op<>'INSERT' then
  raise exception using errcode='55000',message='Retention export evidence is immutable.';
 end if;
 if (new.event='ever_verified' and not exists(select 1 from msrc_participant.subject_refs s where s.actor_id=new.actor_id and s.ever_verified))
  or (new.event='account_erased' and not exists(select 1 from msrc_participant.subject_refs s where s.actor_id=new.actor_id and s.erased_at=new.occurred_at)) then
  raise exception using errcode='42501',message='Observed retention evidence required.';
 end if;
 return new;
end$$;
create trigger participant_ledger_immutable before insert or update or delete on msrc_participant.retention_ledger
 for each row execute function msrc_participant.guard_retention_ledger();
create trigger participant_ledger_no_truncate before truncate on msrc_participant.retention_ledger
 for each statement execute function msrc_participant.guard_retention_ledger();

create function msrc_participant.record_retention_ledger() returns trigger
 language plpgsql security definer set search_path='' as $$begin
 -- The existing subject guard verifies native evidence before this AFTER trigger.
 -- Native/application verification may have a non-postgres session, hence this
 -- narrow postgres-owned definer; there is no client EXECUTE grant or public RPC.
 if new.ever_verified then
  insert into msrc_participant.retention_ledger(actor_id,event,occurred_at)
   values(new.actor_id,'ever_verified',clock_timestamp()) on conflict do nothing;
 end if;
 if new.erased_at is not null then
  insert into msrc_participant.retention_ledger(actor_id,event,occurred_at)
   values(new.actor_id,'account_erased',new.erased_at) on conflict do nothing;
 end if;
 return new;
end$$;
create trigger participant_export_receipt after insert or update of ever_verified,erased_at on msrc_participant.subject_refs
 for each row execute function msrc_participant.record_retention_ledger();
insert into msrc_participant.retention_ledger(actor_id,event,occurred_at)
 select actor_id,'ever_verified',statement_timestamp() from msrc_participant.subject_refs where ever_verified;
insert into msrc_participant.retention_ledger(actor_id,event,occurred_at)
 select actor_id,'account_erased',erased_at from msrc_participant.subject_refs where erased_at is not null;

create function msrc_participant.export_retention_ledger(since timestamptz default '-infinity')
 returns table(actor_id uuid,event text,occurred_at timestamptz)
 language plpgsql stable security invoker set search_path='' as $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native ledger export operator required.';
 end if;
 if since is null then raise exception using errcode='22023',message='Ledger watermark required.';end if;
 return query select l.actor_id,l.event,l.occurred_at from msrc_participant.retention_ledger l
  where l.occurred_at>=since order by l.occurred_at,l.actor_id,l.event;
end$$;
comment on function msrc_participant.export_retention_ledger(timestamptz) is 'Native postgres-only minimal pseudonymous receipts. Export the full default snapshot after every cleanup and verification cycle to independently encrypted storage; merge by (actor_id,event), never replace a newer independent ledger with a restored older snapshot. Inclusive since protects boundary ties only: timestamp increments alone can miss late commits and require separately approved fencing. Backfilled ever_verified timestamps mean first observation.';

create function msrc_participant.run_cleanup_job() returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare settings msrc_participant.scheduler_settings%rowtype;result jsonb;
begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native cleanup operator required.';
 end if;
 select * into strict settings from msrc_participant.scheduler_settings where singleton;
 -- cleanup_unverified rechecks the independent false-by-default switch and every
 -- subject under its reviewed locks. Do not recreate or weaken that worker here.
 result:=msrc_participant.cleanup_unverified(settings.cleanup_batch_size,false);
 -- A successful SQL call with failed subjects is not a successful cron run.
 -- Roll back the entire scheduled batch and expose only a constant safe error;
 -- pg_cron records failure for operator health/triage. No automatic retry here.
 if (result->>'failed')::integer>0 then
  raise exception using errcode='55000',message='Cleanup batch failed; changes rolled back.';
 end if;
 return result;
end$$;

create function msrc_participant.purge_staff_abuse() returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare cutoff timestamptz:=statement_timestamp()-interval '24 hours';limits integer;attempts integer;
begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native purge operator required.';
 end if;
 -- Keep all rows exactly at the boundary; do not touch staff audit/session data.
 delete from msrc_staff.limit_events where occurred_at<cutoff;
 get diagnostics limits=row_count;
 delete from msrc_staff.login_attempts where created_at<cutoff;
 get diagnostics attempts=row_count;
 return jsonb_build_object('limitEvents',limits,'loginAttempts',attempts);
end$$;

create function msrc_participant.purge_cron_history() returns integer
 language plpgsql security invoker set search_path='' as $$
declare days integer;removed integer;
begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native history purge operator required.';
 end if;
 select cron_history_days into strict days from msrc_participant.scheduler_settings where singleton;
 -- Preserve active runs even if unusually old, and never erase the ledger here.
 delete from cron.job_run_details where status in('succeeded','failed')
  and coalesce(end_time,start_time)<statement_timestamp()-make_interval(days=>days);
 get diagnostics removed=row_count;
 return removed;
end$$;

create function msrc_participant.scheduler_health()
 returns table(job_name text,last_run timestamptz,last_success timestamptz,failures_last_24h bigint)
 language plpgsql stable security invoker set search_path='' as $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native scheduler health operator required.';
 end if;
 -- Names and aggregate times/counts only: no SQL commands, errors or return_message.
 return query select j.jobname::text,max(d.start_time),max(d.end_time) filter(where d.status='succeeded'),
  count(d.runid) filter(where d.status='failed' and coalesce(d.end_time,d.start_time)>=statement_timestamp()-interval '24 hours')
 from cron.job j left join cron.job_run_details d on d.jobid=j.jobid
 where j.jobname like 'msrc-%'
 group by j.jobid,j.jobname order by j.jobname;
end$$;
comment on function msrc_participant.scheduler_health() is 'Native postgres-only aggregate health of every currently registered msrc-* job, including Contact and any misowned job that needs separate ownership triage. NULL last times mean no retained run. Last-success evidence is limited to retained cron history; absence/staleness/failures require operator action. No command, identity or failure payload.';

create function msrc_participant.sync_scheduler_settings() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 if current_user<>'postgres' or session_user<>'postgres' then
  raise exception using errcode='42501',message='Native scheduler operator required.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('participant-cleanup-scheduler',0));
 perform cron.schedule('msrc-participant-unverified-cleanup',new.cleanup_schedule,'select msrc_participant.run_cleanup_job();');
 perform cron.schedule('msrc-staff-abuse-purge',new.staff_purge_schedule,'select msrc_participant.purge_staff_abuse();');
 perform cron.schedule('msrc-cron-history-purge',new.history_purge_schedule,'select msrc_participant.purge_cron_history();');
 if exists(select 1 from cron.job where jobname in('msrc-participant-unverified-cleanup','msrc-staff-abuse-purge','msrc-cron-history-purge')
  and (username<>'postgres' or database<>current_database())) then
  raise exception using errcode='42501',message='Scheduler ownership mismatch.';
 end if;
 return new;
end$$;
create trigger participant_scheduler_sync after insert or update on msrc_participant.scheduler_settings
 for each row execute function msrc_participant.sync_scheduler_settings();
insert into msrc_participant.scheduler_settings(singleton) values(true);

-- Revoke immediately within this migration transaction; no API-facing wrappers.
revoke all on function msrc_participant.guard_retention_ledger(),msrc_participant.record_retention_ledger(),
 msrc_participant.export_retention_ledger(timestamptz),msrc_participant.run_cleanup_job(),
 msrc_participant.purge_staff_abuse(),msrc_participant.purge_cron_history(),
 msrc_participant.scheduler_health(),msrc_participant.sync_scheduler_settings()
 from public,anon,authenticated,service_role,supabase_auth_admin;
