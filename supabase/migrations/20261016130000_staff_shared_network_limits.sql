-- AUTH-02/03, SEC-01/06; ENG-044. Review only: no hosted activation.
-- Shared campus network allowance: 100 active staff at one activity plus one action/minute and
-- three sign-ins/email issues per hour each. This is an engineering sizing
-- scenario, not an approved staff count or an email delivery budget.
-- Account controls, newest-code rule, rolling windows, HMAC-only subjects,
-- replay prevention, serialization and email daily-budget gate are unchanged.
-- Existing private tables remain forced-RLS with no client table grants.
begin;
create or replace function public.msrc_staff_form_claim(nonce_hash text,ip_hash text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 begin
 if not msrc_staff.ready() or nonce_hash is null or ip_hash is null or nonce_hash!~'^[a-f0-9]{64}$' or ip_hash!~'^[a-f0-9]{64}$' then return jsonb_build_object('state','denied'); end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-form:'||ip_hash,0));
 if (select count(*) from msrc_staff.limit_events e where e.kind='form' and e.subject_hash=ip_hash and e.occurred_at>clock_timestamp()-interval '1 hour')>=12000 then return jsonb_build_object('state','denied'); end if;
 insert into msrc_staff.limit_events(kind,subject_hash,nonce_hash) values('form',ip_hash,nonce_hash) on conflict do nothing;
 if not found then return jsonb_build_object('state','denied'); end if;
 return jsonb_build_object('state','claimed');
 end$$;
create or replace function public.msrc_staff_login_begin(attempt_id uuid,email_hash text,ip_hash text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 begin
 if not msrc_staff.ready() or email_hash is null or ip_hash is null or email_hash!~'^[a-f0-9]{64}$' or ip_hash!~'^[a-f0-9]{64}$' or attempt_id is null then return jsonb_build_object('state','denied'); end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-login',0));
 if (select count(*) from msrc_staff.login_attempts a where a.email_hash=msrc_staff_login_begin.email_hash and a.state in ('pending','denied') and a.created_at>clock_timestamp()-interval '15 minutes')>=5
 or (select count(*) from msrc_staff.login_attempts a where a.ip_hash=msrc_staff_login_begin.ip_hash and a.created_at>clock_timestamp()-interval '1 hour')>=300 then return jsonb_build_object('state','denied'); end if;
 insert into msrc_staff.login_attempts(id,email_hash,ip_hash) values(attempt_id,email_hash,ip_hash) on conflict do nothing;
 if not found then return jsonb_build_object('state','denied'); end if;
 return jsonb_build_object('state','reserved');
 end$$;
create or replace function public.msrc_staff_email_begin(actor_id uuid,session_id uuid,challenge_id uuid,code_hash text,ip_hash text) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare evidence jsonb; observed_at timestamptz; expires_at timestamptz;
begin
  if exists(select 1 from msrc_staff.profiles p where p.actor_id=actor_id) then
    if not msrc_staff.ready() then return jsonb_build_object('state','denied','code','ineligible');end if;
    perform pg_advisory_xact_lock(hashtextextended('staff-email-volume',0));
    if (select count(*) from msrc_staff.invitations i where i.created_at>clock_timestamp()-interval '24 hours')
      +(select count(*) from msrc_staff_email.challenges c join msrc_staff.profiles p on p.actor_id=c.actor_id where c.created_at>clock_timestamp()-interval '24 hours')
      >= (select email_daily_limit from msrc_staff.policy where singleton) then return jsonb_build_object('state','denied','code','retry_limited');end if;
  end if;
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
      and c.created_at > observed_at-interval '1 hour') >= 300 then
    return jsonb_build_object('state','denied','code','retry_limited'); end if;
  update msrc_staff_email.challenges c set state='superseded'
    where c.actor_id=actor_id and c.state in ('pending','sent');
  expires_at := observed_at+interval '5 minutes';
  insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at)
    values(challenge_id,actor_id,session_id,evidence->>'binding',code_hash,ip_hash,observed_at,expires_at);
  return jsonb_build_object('state','issued','challengeId',challenge_id,'recipient',evidence->>'recipient','expiresAt',expires_at);
end; $$;
revoke all on function public.msrc_staff_form_claim(text,text),
 public.msrc_staff_login_begin(uuid,text,text),public.msrc_staff_email_begin(uuid,uuid,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.msrc_staff_form_claim(text,text),
 public.msrc_staff_login_begin(uuid,text,text),public.msrc_staff_email_begin(uuid,uuid,uuid,text,text)
 to service_role;
commit;
