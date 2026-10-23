-- ENG-060 / O9; REG-01..08, ROL-10/12, SEC-01/02/06, INF-04..06.
-- Read-only owner checklist. No settings, users, invitations, delivery or seeds.
begin;

create function public.msrc_staff_launch_readiness(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare database_health boolean:=false;
begin
 -- A caller waiting behind authority changes must not retain an older snapshot.
 -- Keep this guard before authorization and every early return.
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception using errcode='25001',message='Launch readiness requires READ COMMITTED isolation.';
 end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then
  return jsonb_build_object('state','denied');
 end if;

 -- Execute only the constant no-data ping; never invoke a drain, sweep,
 -- participant status action, or mutable registration RPC to test its existence.
 if to_regprocedure('public.msrc_health_check()') is not null then
  begin
   execute 'select public.msrc_health_check()' into database_health;
  exception when undefined_function then database_health:=false;
  end;
 end if;

 return (
  with eligible_staff as (
   select distinct g.actor_id,g.role_name
   from msrc_authorization.role_grants g
   join msrc_authorization.account_access a on a.actor_id=g.actor_id
   join msrc_staff.profiles p on p.actor_id=g.actor_id
   join auth.users u on u.id=g.actor_id
   where g.edition_key=edition_key and g.state='active' and g.scope_kind='edition'
    and g.role_name<>'participant' and a.state='active' and a.individually_identified
    and p.recovery_state='none' and u.email_confirmed_at is not null
    and u.email_confirmed_at<=statement_timestamp() and u.deleted_at is null
    and not coalesce(u.is_anonymous,false)
    and (u.banned_until is null or u.banned_until<=statement_timestamp())
  ), role_counts as (
   select r.role_name,count(e.actor_id) as total
   from unnest(array['abstractReviewer','hackathonReviewer','threeMinuteThesisReviewer',
    'scientificAdministrator','judgingCommittee','facultyJudge',
    'registrationWorkshopAdministrator','finance','checkInStaff',
    'contentMediaEditor','sponsorshipPr','superAdmin']::text[]) r(role_name)
   left join eligible_staff e on e.role_name=r.role_name group by r.role_name
  ), authenticators as (
   select count(*) as total from eligible_staff e where e.role_name='superAdmin'
    and exists(select 1 from auth.mfa_factors f where f.user_id=e.actor_id
     and f.factor_type='totp' and f.status='verified'
     and f.created_at<=statement_timestamp() and f.updated_at<=statement_timestamp())
  )
  select jsonb_build_object(
   'state','ready',
   'participantAccountsEnabled',coalesce((select p.enabled from msrc_participant.policy p where p.singleton),false),
   'participantPolicyComplete',coalesce((select p.privacy_version='v1.0' and p.email_daily_limit>0
    from msrc_participant.policy p where p.singleton),false),
   'participantEmailDailyLimit',coalesce((select p.email_daily_limit from msrc_participant.policy p where p.singleton),0),
   'retentionEnabled',coalesce((select p.enabled from msrc_participant.retention_policy p where p.singleton),false),
   'outboxDeliveryEnabled',coalesce((select s.delivery_enabled from msrc_outbox.settings s where s.singleton),false),
   'outboxSweepsEnabled',coalesce((select s.sweeps_enabled from msrc_outbox.settings s where s.singleton),false),
   'outboxDailyCap',coalesce((select s.daily_cap from msrc_outbox.settings s where s.singleton),0),
   'registrationSettingsComplete',msrc_registration.settings_complete(edition_key),
   'registrationEnabled',coalesce((select s.enabled from msrc_registration.settings s where s.edition_key=edition_key),false),
   'conferenceDaysSet',coalesce((select cardinality(s.conference_days)>0 from msrc_registration.settings s where s.edition_key=edition_key),false),
   'conferenceDayCount',coalesce((select cardinality(s.conference_days) from msrc_registration.settings s where s.edition_key=edition_key),0),
   'staffCounts',(select jsonb_object_agg(r.role_name,r.total) from role_counts r),
   'earlyAccessCount',(select count(*) from msrc_registration.early_access_entries e where e.edition_key=edition_key and e.active),
   'secondSuperAdminWithAuthenticator',(select a.total>=2 from authenticators a),
   'superAdminsWithAuthenticatorCount',(select a.total from authenticators a),
   'healthReady',coalesce(database_health,false),
   -- Vercel worker invocations have no durable run ledger in this database.
   -- Message timestamps are not evidence that the latest cron run succeeded.
   'lastOutboxDrainObservable',false,
   'requiredRpcs',jsonb_build_object(
    'participantAccounts',to_regprocedure('public.msrc_participant_status()') is not null
     and to_regprocedure('public.msrc_participant_signup_reserve(uuid,uuid,text,text,text,boolean)') is not null
     and to_regprocedure('msrc_participant.run_cleanup_job()') is not null,
    'registration',to_regprocedure('public.msrc_registration_status(text)') is not null
     and to_regprocedure('public.msrc_registration_submit(text,jsonb,text,jsonb,text,text,text,text)') is not null
     and to_regprocedure('public.msrc_registration_me(text,jsonb)') is not null
     and to_regprocedure('public.msrc_registration_accept_offer(text,jsonb,uuid,uuid,text)') is not null
     and to_regprocedure('public.msrc_registration_decline_offer(text,jsonb,uuid,uuid)') is not null
     and to_regprocedure('public.msrc_registration_cancel(text,jsonb,uuid,uuid)') is not null,
    'registrationSettings',to_regprocedure('public.msrc_staff_registration_settings(text)') is not null
     and to_regprocedure('public.msrc_staff_registration_settings_save(text,jsonb,uuid)') is not null,
    'earlyAccess',to_regprocedure('public.msrc_staff_early_access(text,text)') is not null
     and to_regprocedure('public.msrc_staff_early_access_add(text,text[])') is not null
     and to_regprocedure('public.msrc_staff_early_access_remove(text,uuid[])') is not null,
    'tickets',to_regprocedure('public.msrc_registration_ticket(text,jsonb,text)') is not null
     and to_regprocedure('public.msrc_staff_registration_approve_tickets(text,jsonb,uuid[],text)') is not null,
    'checkIn',to_regprocedure('public.msrc_staff_checkin(text,text,date,text)') is not null
     and to_regprocedure('public.msrc_staff_checkin_undo(text,uuid,text)') is not null
     and to_regprocedure('public.msrc_staff_attendance_summary(text,date)') is not null
     and to_regprocedure('public.msrc_registration_attendance(text,jsonb)') is not null,
    'outbox',to_regprocedure('public.msrc_outbox_claim(uuid,integer,integer)') is not null
     and to_regprocedure('public.msrc_outbox_prepare(uuid,uuid,uuid,jsonb)') is not null
     and to_regprocedure('public.msrc_outbox_finish(uuid,uuid,uuid,text,text,text)') is not null
     and to_regprocedure('public.msrc_outbox_monitor()') is not null,
    'health',to_regprocedure('public.msrc_health_check()') is not null
   )
  )
 );
end$$;

revoke all on function public.msrc_staff_launch_readiness(text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_launch_readiness(text) to authenticated;
comment on function public.msrc_staff_launch_readiness(text) is
 'Super Admin exact-session TOTP checklist. Boolean/count leaves only after authorization; distinct currently active edition-granted staff, verified TOTP factors and scoped early-access counts. No settings mutation, mail, row identities, dates or secret values. RPC presence and database ping do not certify provider delivery or hosted migration contents.';
commit;
