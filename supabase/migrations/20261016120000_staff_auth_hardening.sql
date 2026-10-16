-- AUTH-04/05, ADM-05, SEC-01/06: pending owner-reviewed staff hardening.
-- Five failed authenticator entries lock an account for fifteen minutes, matching
-- the email check. A single short reservation serializes concurrent provider work.
alter table msrc_staff.audit drop constraint audit_action_check;
alter table msrc_staff.audit add constraint audit_action_check check(action in (
 'bootstrap','invite','invite_delivery','invite_revoke','invite_consume','invite_complete',
 'sign_in','set_roles','suspend','reactivate','revoke_sessions','reset_authenticator','reset_account','admin_complete',
 'people_read','audit_read','participants_read','identity_reveal','totp_enroll','totp_challenge','totp_verify','password_change',
 'totp_locked','totp_unlocked','password_sign_in'));

create table msrc_staff.totp_account_limits (
 actor_id uuid primary key references msrc_staff.profiles(actor_id) on delete restrict,
 failed_attempts integer not null default 0 check(failed_attempts between 0 and 5),
 cooldown_until timestamptz,
 check((failed_attempts=5)=(cooldown_until is not null))
);
create table msrc_staff.totp_attempts (
 id uuid primary key,actor_id uuid not null references msrc_staff.profiles(actor_id) on delete restrict,
 session_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null,state text not null default 'pending' check(state in ('pending','completed','failed')),
 check(expires_at=created_at+interval '30 seconds')
);
create unique index staff_totp_one_pending on msrc_staff.totp_attempts(actor_id) where state='pending';
alter table msrc_staff.totp_account_limits enable row level security;
alter table msrc_staff.totp_account_limits force row level security;
alter table msrc_staff.totp_attempts enable row level security;
alter table msrc_staff.totp_attempts force row level security;
revoke all on msrc_staff.totp_account_limits,msrc_staff.totp_attempts from public,anon,authenticated,service_role;

-- Service-only input is corroborated against current managed password identity,
-- immutable session clocks/revocation and persisted strongest-tier grants.
create function msrc_staff.totp_eligible(target_actor uuid,target_session uuid) returns boolean
 language sql volatile security definer set search_path='' as $$
 select msrc_staff.ready() and not msrc_staff.recovery_blocked(target_actor) and exists(
 select 1 from msrc_staff.profiles p join msrc_authorization.account_access a using(actor_id)
 join auth.users u on u.id=p.actor_id join auth.sessions s on s.user_id=p.actor_id
 join msrc_sessions.policy policy on policy.singleton
 join auth.mfa_amr_claims m on m.session_id=s.id and m.authentication_method='password'
 left join msrc_staff_email.identity_revision r on r.actor_id=p.actor_id
 left join msrc_sessions.session_state state on state.session_id=s.id
 where p.actor_id=target_actor and s.id=target_session and a.state='active' and a.individually_identified
 and u.email_confirmed_at is not null and u.email_confirmed_at<=clock_timestamp() and u.deleted_at is null and not u.is_anonymous
 and (u.banned_until is null or u.banned_until<=clock_timestamp())
 and s.created_at<=clock_timestamp() and (s.not_after is null or s.not_after>clock_timestamp())
 and s.created_at+make_interval(secs=>policy.privileged_absolute_seconds)>clock_timestamp()
 and coalesce(state.last_activity_at,s.created_at)+make_interval(secs=>policy.privileged_idle_seconds)>clock_timestamp()
 and (state.session_id is null or (state.actor_id=target_actor and state.started_at=s.created_at and state.revoked_at is null and state.last_activity_at<=clock_timestamp()))
 and m.updated_at::timestamptz>=s.created_at and m.updated_at::timestamptz<=clock_timestamp()
 and (r.password_changed_at is null or m.updated_at::timestamptz>=r.password_changed_at)
 and not exists(select 1 from msrc_sessions.actor_revocations rev where rev.actor_id=p.actor_id and s.created_at<=rev.revoked_before)
 and exists(select 1 from msrc_authorization.role_grants g where g.actor_id=p.actor_id and g.state='active' and g.role_name='superAdmin'));
$$;

create function msrc_staff.totp_failure(target_actor uuid) returns boolean
 language plpgsql security definer set search_path='' as $$
 declare failures integer;
 begin
 update msrc_staff.totp_account_limits set failed_attempts=least(failed_attempts+1,5),
 cooldown_until=case when failed_attempts+1>=5 then clock_timestamp()+interval '15 minutes' else null end
 where actor_id=target_actor returning failed_attempts into failures;
 perform msrc_staff.record(null,'totp_verify',target_actor,'failed',target_actor);
 if failures=5 then perform msrc_staff.record(null,'totp_locked',target_actor,'denied',target_actor);end if;
 return failures=5;
 end$$;

create function public.msrc_staff_totp_begin(actor_id uuid,session_id uuid,attempt_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare limits msrc_staff.totp_account_limits%rowtype;pending msrc_staff.totp_attempts%rowtype;observed timestamptz;
 begin
 if actor_id is null or session_id is null or attempt_id is null then return jsonb_build_object('state','denied');end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-totp-attempt:'||actor_id::text,0));
 if not msrc_staff.totp_eligible(actor_id,session_id) then return jsonb_build_object('state','denied');end if;
 insert into msrc_staff.totp_account_limits(actor_id) values(actor_id) on conflict on constraint totp_account_limits_pkey do nothing;
 select l.* into limits from msrc_staff.totp_account_limits l where l.actor_id=msrc_staff_totp_begin.actor_id for update;
 observed:=clock_timestamp();
 if limits.cooldown_until>observed then return jsonb_build_object('state','limited');end if;
 if limits.cooldown_until is not null then
 update msrc_staff.totp_account_limits set failed_attempts=0,cooldown_until=null where totp_account_limits.actor_id=msrc_staff_totp_begin.actor_id;
 perform msrc_staff.record(null,'totp_unlocked',actor_id,'completed',actor_id);
 end if;
 select t.* into pending from msrc_staff.totp_attempts t where t.actor_id=msrc_staff_totp_begin.actor_id and t.state='pending';
 if found then
 if pending.expires_at>observed then return jsonb_build_object('state','limited');end if;
 -- Unknown/interrupted provider outcomes consume a failure instead of allowing
 -- restart/new-session requests to bypass the account budget.
 update msrc_staff.totp_attempts set state='failed' where id=pending.id;
 if msrc_staff.totp_failure(actor_id) then return jsonb_build_object('state','limited');end if;
 end if;
 if exists(select 1 from msrc_staff.totp_attempts t where t.id=attempt_id) then return jsonb_build_object('state','denied');end if;
 observed:=clock_timestamp();
 insert into msrc_staff.totp_attempts(id,actor_id,session_id,created_at,expires_at) values(attempt_id,actor_id,session_id,observed,observed+interval '30 seconds');
 return jsonb_build_object('state','reserved');
 end$$;

create function public.msrc_staff_totp_finish(actor_id uuid,session_id uuid,attempt_id uuid,succeeded boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare attempt msrc_staff.totp_attempts%rowtype;valid boolean;
 begin
 if actor_id is null or session_id is null or attempt_id is null then return jsonb_build_object('state','denied');end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-totp-attempt:'||actor_id::text,0));
 select t.* into attempt from msrc_staff.totp_attempts t where t.id=attempt_id for update;
 if not found or attempt.actor_id<>actor_id or attempt.session_id<>session_id or attempt.state<>'pending' then return jsonb_build_object('state','denied');end if;
 valid:=coalesce(succeeded,false) and attempt.expires_at>clock_timestamp() and msrc_staff.totp_eligible(actor_id,session_id)
 and not exists(select 1 from msrc_staff.totp_account_limits l where l.actor_id=msrc_staff_totp_finish.actor_id and l.cooldown_until>clock_timestamp())
 and exists(select 1 from auth.sessions s join auth.mfa_factors f on f.id=s.factor_id and f.user_id=s.user_id
 join auth.mfa_amr_claims m on m.session_id=s.id and m.authentication_method='totp'
 where s.id=session_id and s.user_id=actor_id and s.aal::text='aal2' and f.factor_type::text='totp' and f.status::text='verified'
 and m.updated_at::timestamptz>=greatest(f.created_at,f.updated_at,s.created_at));
 update msrc_staff.totp_attempts set state=case when valid then 'completed' else 'failed' end where id=attempt_id;
 if not valid then return jsonb_build_object('state',case when msrc_staff.totp_failure(actor_id) then 'limited' else 'failed' end);end if;
 update msrc_staff.totp_account_limits set failed_attempts=0,cooldown_until=null where totp_account_limits.actor_id=msrc_staff_totp_finish.actor_id;
 -- Preserve bootstrap pairing and native proof checks from the existing event.
 return public.msrc_staff_auth_event(actor_id,session_id,'totp_verify','completed');
 end$$;

-- Deny raw native successful TOTP proof while the application account is locked.
-- This adds to the durable recovery guard without changing its existing checks.
create function msrc_staff.native_totp_lock_guard() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare target uuid;
 begin
 if new.authentication_method<>'totp' then return new;end if;
 select s.user_id into target from auth.sessions s where s.id=new.session_id;
 if not exists(select 1 from msrc_staff.profiles p where p.actor_id=target) then return new;end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-totp-attempt:'||target::text,0));
 if exists(select 1 from msrc_staff.totp_account_limits l where l.actor_id=target and l.cooldown_until>clock_timestamp()) then
 raise exception using errcode='42501',message='Authenticator attempts are temporarily locked.';end if;
 return new;
 end$$;
create trigger staff_native_totp_lock_guard before insert or update on auth.mfa_amr_claims for each row execute function msrc_staff.native_totp_lock_guard();

-- Resolve only existing staff identifiers; submitted email is transient input.
-- No provider payload, password, IP or digest is copied into the audit record.
-- A failed attempt is deliberately not asserted to be a wrong password: native
-- credential rejection and a null provider result share the generic outcome.
create function public.msrc_staff_login_failure(attempt_id uuid,attempted_email text,edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
 declare attempt msrc_staff.login_attempts%rowtype;known_actor uuid;
 begin
 if not msrc_staff.ready() or attempted_email is null or char_length(attempted_email)>254
 or not exists(select 1 from msrc_authorization.edition_config e where e.edition_key=msrc_staff_login_failure.edition_key)
 then return jsonb_build_object('state','denied');end if;
 select a.* into attempt from msrc_staff.login_attempts a where a.id=attempt_id for update;
 if not found or attempt.state<>'pending' or attempt.created_at<=clock_timestamp()-interval '5 minutes' then return jsonb_build_object('state','denied');end if;
 select p.actor_id into known_actor from msrc_staff.profiles p join auth.users u on u.id=p.actor_id
 where lower(u.email)=lower(btrim(attempted_email)) and exists(select 1 from msrc_authorization.role_grants g
 where g.actor_id=p.actor_id and g.edition_key=msrc_staff_login_failure.edition_key and g.role_name<>'participant') limit 1;
 update msrc_staff.login_attempts set state='denied' where id=attempt_id;
 -- A rejected password identifies only the attempted account; it does not
 -- authenticate an actor, even if the caller has unrelated JWT claims.
 insert into msrc_staff.audit(edition_key,action,target_id,result) values(edition_key,'password_sign_in',known_actor,'failed');
 return jsonb_build_object('state','denied');
 end$$;

revoke all on function msrc_staff.totp_eligible(uuid,uuid),msrc_staff.totp_failure(uuid),msrc_staff.native_totp_lock_guard() from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_totp_begin(uuid,uuid,uuid),public.msrc_staff_totp_finish(uuid,uuid,uuid,boolean),public.msrc_staff_login_failure(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_totp_begin(uuid,uuid,uuid),public.msrc_staff_totp_finish(uuid,uuid,uuid,boolean),public.msrc_staff_login_failure(uuid,text,text) to service_role;
notify pgrst,'reload schema';
