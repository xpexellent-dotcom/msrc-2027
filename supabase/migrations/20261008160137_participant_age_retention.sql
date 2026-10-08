-- AUTH-01/08, ORG-041, PRV-02/04/05/08. REVIEW ONLY; all live gates stay closed.
-- 18+ is an explicit self-attestation, never a DOB or verified-age claim.
-- No scheduler, hosted configuration, account, credentials or delivery is created.

create table msrc_participant.retention_policy (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 unverified_days integer not null default 30 check(unverified_days=30)
);
insert into msrc_participant.retention_policy(singleton) values(true);
create table msrc_participant.subject_refs (
 actor_id uuid primary key,
 native_created_at timestamptz,
 ever_verified boolean not null default false,
 erased_at timestamptz,
 erase_job uuid
);
create index participant_unverified_origin on msrc_participant.subject_refs(native_created_at,actor_id)
 where not ever_verified and erased_at is null;
create table msrc_participant.proof_refs (
 id uuid primary key,
 actor_id uuid not null references msrc_participant.subject_refs(actor_id) on delete restrict,
 kind text not null check(kind in('admission','challenge')),
 created_at timestamptz not null,
 age_confirmed boolean check(age_confirmed is null or age_confirmed),
 age_attested_at timestamptz,
 check((age_confirmed is true)=(age_attested_at is not null)),
 check(kind='admission' or (age_confirmed is null and age_attested_at is null))
);
create index participant_proof_actor on msrc_participant.proof_refs(actor_id);
create table msrc_participant.retention_holds (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references msrc_participant.subject_refs(actor_id) on delete restrict,
 reason text not null check(reason in('legal','security','operational','support')),
 created_at timestamptz not null default clock_timestamp(),
 released_at timestamptz
);
create index participant_hold_actor on msrc_participant.retention_holds(actor_id) where released_at is null;
create table msrc_participant.cleanup_jobs (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null unique references msrc_participant.subject_refs(actor_id) on delete restrict,
 native_created_at timestamptz not null,
 state text not null check(state in('running','completed','held','failed')),
 native_transaction xid8,
 created_at timestamptz not null default clock_timestamp(),
 completed_at timestamptz,
 reason text check(reason is null or reason='retained_reference_or_failure'),
 sqlstate text check(sqlstate is null or sqlstate ~ '^[A-Z0-9]{5}$')
);
alter table msrc_participant.subject_refs add constraint participant_erasure_job foreign key(erase_job)
 references msrc_participant.cleanup_jobs(id) on delete restrict;
create table msrc_participant.retention_audit (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null,
 job_id uuid references msrc_participant.cleanup_jobs(id) on delete restrict,
 event text not null check(event in('account.erased','cleanup.held','cleanup.failed')),
 reason text check(reason is null or reason in('explicit_hold','authority_history','retained_account','staff_history','security_history','native_identity','storage_owner','native_security_history','unreviewed_foreign_key','retained_reference_or_failure')),
 occurred_at timestamptz not null default clock_timestamp()
);
comment on table msrc_participant.subject_refs is 'Minimal private immutable subject origin/ever-verification and erasure tombstone. No Auth FK, name, email, credentials, code, digest, DOB or operational entitlement. Latest ledger reconciliation is required before restoring access from a backup.';
comment on table msrc_participant.proof_refs is 'Immutable opaque consent/age proof anchors. Existing legacy proofs have unknown age; never fabricate an adult declaration. Preserves original notice UUID references after authorized personal-data erasure.';
comment on table msrc_participant.retention_policy is 'Independent reviewed operator switch. FALSE by default, no scheduler installed. Signup requires enabled cleanup foundation; activation additionally needs reviewed scheduling, recovery and restore-suppression evidence.';
comment on table msrc_participant.retention_audit is 'Append-only UUID/event/reason evidence only, never personal values, codes, digests, credentials or provider payloads.';

-- Retarget immutable consent references without changing any receipt snapshot.
insert into msrc_participant.subject_refs(actor_id,native_created_at,ever_verified)
 select p.actor_id,u.created_at,u.email_confirmed_at is not null or p.state='verified'
  or exists(select 1 from msrc_participant.operations o where o.actor_id=p.actor_id
   and o.purpose='verify_email' and o.state in('applied','completed'))
 from msrc_participant.profiles p join auth.users u on u.id=p.actor_id;
insert into msrc_participant.subject_refs(actor_id)
 select actor_id from msrc_participant.admissions on conflict do nothing;
insert into msrc_participant.proof_refs(id,actor_id,kind,created_at)
 select id,actor_id,'admission',created_at from msrc_participant.admissions;
insert into msrc_participant.proof_refs(id,actor_id,kind,created_at)
 select id,actor_id,'challenge',created_at from msrc_participant.challenges;
alter table msrc_participant.notice_receipts drop constraint notice_receipts_actor_id_fkey;
alter table msrc_participant.notice_receipts drop constraint notice_receipts_admission_id_fkey;
alter table msrc_participant.notice_receipts drop constraint notice_receipts_challenge_id_fkey;
alter table msrc_participant.notice_receipts add foreign key(actor_id) references msrc_participant.subject_refs(actor_id) on delete restrict;
alter table msrc_participant.notice_receipts add foreign key(admission_id) references msrc_participant.proof_refs(id) on delete restrict;
alter table msrc_participant.notice_receipts add foreign key(challenge_id) references msrc_participant.proof_refs(id) on delete restrict;
alter table msrc_participant.admissions add column age_confirmed boolean;
alter table msrc_participant.profiles add column age_admission_id uuid references msrc_participant.proof_refs(id) on delete restrict;
alter table msrc_participant.profiles add column age_attested_at timestamptz;
alter table msrc_participant.profiles add check((age_admission_id is null)=(age_attested_at is null));

do $$declare t text;begin
 foreach t in array array['retention_policy','subject_refs','proof_refs','retention_holds','cleanup_jobs','retention_audit'] loop
  execute format('alter table msrc_participant.%I enable row level security',t);
  execute format('alter table msrc_participant.%I force row level security',t);
 end loop;
end$$;

-- Immutable origin is observed once from native Auth, never from metadata or
-- mutable challenge/profile clocks. Verification is monotone even if the
-- provider commits before application completion is interrupted.
create function msrc_participant.guard_subject_ref() returns trigger
 language plpgsql security definer set search_path='' as $$begin
 if current_user<>'postgres' or tg_op in('DELETE','TRUNCATE') then
  raise exception using errcode='55000',message='Retention evidence is immutable.';end if;
 if tg_op='UPDATE' and (new.actor_id<>old.actor_id or (old.native_created_at is not null and new.native_created_at is distinct from old.native_created_at)
  or (old.ever_verified and not new.ever_verified) or (old.erased_at is not null and new is distinct from old)) then
  raise exception using errcode='55000',message='Retention evidence is monotone.';end if;
 if new.native_created_at is not null and (tg_op='INSERT' or old.native_created_at is null)
  and not exists(select 1 from auth.users u where u.id=new.actor_id and u.created_at=new.native_created_at) then
  raise exception using errcode='42501',message='Native origin required.';end if;
 if new.ever_verified and (tg_op='INSERT' or not old.ever_verified)
  and not exists(select 1 from auth.users u where u.id=new.actor_id and u.email_confirmed_at is not null)
  and not exists(select 1 from msrc_participant.profiles p where p.actor_id=new.actor_id and p.state='verified') then
  raise exception using errcode='42501',message='Native verification evidence required.';end if;
 if new.erased_at is not null and (tg_op='INSERT' or old.erased_at is null) and not exists(
  select 1 from msrc_participant.cleanup_jobs j where j.id=new.erase_job and j.actor_id=new.actor_id
   and j.state='running' and j.native_transaction=pg_current_xact_id() and session_user='postgres') then
  raise exception using errcode='42501',message='Atomic cleanup proof required.';end if;
 return new;
end$$;
create trigger participant_subject_monotone before insert or update or delete on msrc_participant.subject_refs
 for each row execute function msrc_participant.guard_subject_ref();
create trigger participant_subject_no_truncate before truncate on msrc_participant.subject_refs
 for each statement execute function msrc_participant.guard_subject_ref();

create function msrc_participant.age_proven(target_actor uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from msrc_participant.profiles p join msrc_participant.proof_refs r on r.id=p.age_admission_id
  join msrc_participant.subject_refs s on s.actor_id=p.actor_id
  where p.actor_id=target_actor and r.actor_id=p.actor_id and r.kind='admission' and r.age_confirmed is true
   and p.age_attested_at=r.age_attested_at and s.native_created_at is not null and s.erased_at is null);
$$;
create function msrc_participant.within_verification_window(target_actor uuid) returns boolean
 language sql volatile security definer set search_path='' as $$
 select exists(select 1 from msrc_participant.subject_refs s join auth.users u on u.id=s.actor_id
  where s.actor_id=target_actor and s.erased_at is null and s.native_created_at=u.created_at
  and (s.ever_verified or u.email_confirmed_at is not null or s.native_created_at+interval '30 days'>clock_timestamp()));
$$;
create function msrc_participant.guard_age_admission() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare admission msrc_participant.admissions%rowtype;
 begin
 if exists(select 1 from msrc_participant.subject_refs s where s.actor_id=new.id and s.erased_at is not null) then
  raise exception using errcode='42501',message='Erased identity cannot be restored.';end if;
 select a.* into admission from msrc_participant.admissions a where a.actor_id=new.id for update;
 if found and (not msrc_participant.ready() or admission.age_confirmed is not true or not exists(
  select 1 from msrc_participant.proof_refs r where r.id=admission.id and r.actor_id=new.id and r.kind='admission'
   and r.age_confirmed is true and r.age_attested_at=admission.created_at)
  or new.created_at is null or new.created_at>clock_timestamp()) then
  raise exception using errcode='42501',message='Explicit adult admission required.';end if;
 return new;
end$$;
create trigger a00_participant_age_admission before insert on auth.users
 for each row execute function msrc_participant.guard_age_admission();
create function msrc_participant.anchor_profile_age() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare admission msrc_participant.admissions%rowtype;
 begin
 if tg_op='UPDATE' then
  if new.age_admission_id is distinct from old.age_admission_id or new.age_attested_at is distinct from old.age_attested_at
   or new.created_at is distinct from old.created_at then raise exception using errcode='55000',message='Admission origin is immutable.';end if;
  return new;
 end if;
 select a.* into admission from msrc_participant.admissions a where a.actor_id=new.actor_id and a.consumed_at is not null;
 if found and admission.age_confirmed is true then
  new.age_admission_id:=admission.id;new.age_attested_at:=admission.created_at;
 elsif new.age_admission_id is not null or new.age_attested_at is not null then
  raise exception using errcode='42501',message='Private adult admission required.';
 end if;
 return new;
end$$;
create trigger participant_profile_age before insert or update on msrc_participant.profiles
 for each row execute function msrc_participant.anchor_profile_age();
create function msrc_participant.observe_profile_retention() returns trigger
 language plpgsql security definer set search_path='' as $$begin
 insert into msrc_participant.subject_refs(actor_id,native_created_at,ever_verified)
  select new.actor_id,u.created_at,u.email_confirmed_at is not null or new.state='verified' from auth.users u where u.id=new.actor_id
  on conflict(actor_id) do update set native_created_at=coalesce(msrc_participant.subject_refs.native_created_at,excluded.native_created_at),
   ever_verified=msrc_participant.subject_refs.ever_verified or excluded.ever_verified;
 return new;
end$$;
create trigger participant_profile_retention after insert or update of state on msrc_participant.profiles
 for each row execute function msrc_participant.observe_profile_retention();
create function msrc_participant.observe_native_retention() returns trigger
 language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from msrc_participant.profiles p where p.actor_id=new.id) then
  insert into msrc_participant.subject_refs(actor_id,native_created_at,ever_verified)
   values(new.id,new.created_at,new.email_confirmed_at is not null)
   on conflict(actor_id) do update set native_created_at=coalesce(msrc_participant.subject_refs.native_created_at,excluded.native_created_at),
    ever_verified=msrc_participant.subject_refs.ever_verified or excluded.ever_verified;
 end if;return new;
end$$;
create trigger zz_participant_native_origin after insert or update of email_confirmed_at on auth.users
 for each row execute function msrc_participant.observe_native_retention();
create function msrc_participant.guard_native_retention() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare subject msrc_participant.subject_refs%rowtype;
 begin
 select s.* into subject from msrc_participant.subject_refs s where s.actor_id=new.id;
 if not found or subject.native_created_at is null then return new;end if;
 if new.created_at is distinct from subject.native_created_at or subject.erased_at is not null then
  raise exception using errcode='55000',message='Native retention origin is immutable.';end if;
 -- Invitation/recovery is a separate staff protocol, always excluded from
 -- participant cleanup. Do not interfere with the existing peer safeguards.
 if msrc_staff.native_identity_owned(new.id) then return new;end if;
 if old.email_confirmed_at is null and new.email_confirmed_at is not null and not subject.ever_verified
  and subject.native_created_at+interval '30 days'<=clock_timestamp() then
  raise exception using errcode='42501',message='Participant verification period ended.';end if;
 if (new.email_confirmed_at is distinct from old.email_confirmed_at or new.encrypted_password is distinct from old.encrypted_password)
  and (not msrc_participant.ready() or not msrc_participant.age_proven(new.id)) then
  raise exception using errcode='42501',message='Current participant admission required.';end if;
 return new;
end$$;
create trigger a01_participant_retention before update on auth.users
 for each row execute function msrc_participant.guard_native_retention();
revoke all on all tables in schema msrc_participant from public,anon,authenticated,service_role,supabase_auth_admin;
revoke all on all sequences in schema msrc_participant from public,anon,authenticated,service_role,supabase_auth_admin;

create function msrc_participant.guard_proof_ref() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 if tg_op<>'INSERT' or current_user<>'postgres' then raise exception using errcode='55000',message='Proof anchors are immutable.';end if;
 return new;
end$$;
create trigger participant_proof_immutable before insert or update or delete on msrc_participant.proof_refs
 for each row execute function msrc_participant.guard_proof_ref();
create trigger participant_proof_no_truncate before truncate on msrc_participant.proof_refs
 for each statement execute function msrc_participant.guard_proof_ref();
create trigger participant_retention_audit_immutable before insert or update or delete on msrc_participant.retention_audit
 for each row execute function msrc_participant.audit_immutable();
create trigger participant_retention_audit_no_truncate before truncate on msrc_participant.retention_audit
 for each statement execute function msrc_participant.audit_immutable();

create function msrc_participant.anchor_private_proof() returns trigger
 language plpgsql security definer set search_path='' as $$begin
 if tg_table_name='admissions' then
  insert into msrc_participant.subject_refs(actor_id) values(new.actor_id) on conflict do nothing;
  insert into msrc_participant.proof_refs(id,actor_id,kind,created_at,age_confirmed,age_attested_at)
   values(new.id,new.actor_id,'admission',new.created_at,case when new.age_confirmed is true then true else null end,
    case when new.age_confirmed is true then new.created_at else null end);
 elsif tg_table_name='challenges' then
  insert into msrc_participant.proof_refs(id,actor_id,kind,created_at) values(new.id,new.actor_id,'challenge',new.created_at);
 else raise exception using errcode='42501';end if;
 return new;
end$$;
create trigger participant_admission_proof after insert on msrc_participant.admissions
 for each row execute function msrc_participant.anchor_private_proof();
create trigger participant_challenge_proof after insert on msrc_participant.challenges
 for each row execute function msrc_participant.anchor_private_proof();

create or replace function msrc_participant.ready() returns boolean
 language sql stable security definer set search_path='' as $$
 select coalesce((select enabled and privacy_version is not null and email_daily_limit is not null
  from msrc_participant.policy where singleton),false)
  and coalesce((select enabled from msrc_participant.retention_policy where singleton),false);
$$;
create or replace function public.msrc_participant_status() returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',p.enabled,'privacyVersion',p.privacy_version,'emailDailyLimit',p.email_daily_limit,
  'ageEnforcementReady',true,'retentionEnforcementReady',true,'cleanupEnabled',r.enabled)
 from msrc_participant.policy p cross join msrc_participant.retention_policy r where p.singleton and r.singleton;
$$;
create or replace function public.msrc_participant_signup_reserve(actor_id uuid,reservation_id uuid,email text,name text,privacy_version text)
 returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('state','denied');$$;
create function public.msrc_participant_signup_reserve(actor_id uuid,reservation_id uuid,email text,name text,privacy_version text,age_confirmed boolean)
 returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare observed_at timestamptz;
begin
 if age_confirmed is not true or not msrc_participant.ready() or actor_id is null or reservation_id is null
  or email is null or email<>lower(btrim(email)) or char_length(email) not between 3 and 254
  or name is null or name<>btrim(name) or char_length(name) not between 1 and 120
  or privacy_version is distinct from (select p.privacy_version from msrc_participant.policy p where p.singleton)
  or exists(select 1 from auth.users u where u.email=email)
  or exists(select 1 from msrc_participant.subject_refs s where s.actor_id=actor_id and s.erased_at is not null)
 then return jsonb_build_object('state','denied');end if;
 observed_at:=clock_timestamp();
 insert into msrc_participant.admissions(id,actor_id,email,name,privacy_version,created_at,expires_at,age_confirmed)
  values(reservation_id,actor_id,email,name,privacy_version,observed_at,observed_at+interval '2 minutes',true) on conflict do nothing;
 if not found then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','reserved','actorId',actor_id,'reservationId',reservation_id);
end$$;

-- Keep the reviewed rate limits/one-use native operation and session policy
-- bodies unchanged. The narrow entry wrappers add the installed adult proof
-- and original verification deadline; named public arguments remain stable.
alter function public.msrc_participant_email_begin(text,text,uuid,text,text,text,text,text) set schema msrc_participant;
alter function msrc_participant.msrc_participant_email_begin(text,text,uuid,text,text,text,text,text) rename to legacy_email_begin;
create function public.msrc_participant_email_begin(email text,purpose text,challenge_id uuid,code_hash text,email_hash text,ip_hash text,name text default null,privacy_version text default null)
 returns jsonb language plpgsql security definer set search_path='' as $$
 declare actor uuid;
 begin
 select u.id into actor from auth.users u where u.email=msrc_participant_email_begin.email for update;
 if actor is not null and (not msrc_participant.age_proven(actor) or not msrc_participant.within_verification_window(actor)) then
  return jsonb_build_object('state','denied');end if;
 return msrc_participant.legacy_email_begin(email,purpose,challenge_id,code_hash,email_hash,ip_hash,name,privacy_version);
end$$;
alter function public.msrc_participant_email_consume(text,text,uuid,text,uuid,text) set schema msrc_participant;
alter function msrc_participant.msrc_participant_email_consume(text,text,uuid,text,uuid,text) rename to legacy_email_consume;
create function public.msrc_participant_email_consume(email text,purpose text,challenge_id uuid,code_hash text,operation_id uuid,ip_hash text)
 returns jsonb language plpgsql security definer set search_path='' as $$
 declare actor uuid;
 begin
 select u.id into actor from auth.users u where u.email=msrc_participant_email_consume.email for update;
 if actor is not null and (not msrc_participant.age_proven(actor) or not msrc_participant.within_verification_window(actor)) then
  return jsonb_build_object('state','denied');end if;
 return msrc_participant.legacy_email_consume(email,purpose,challenge_id,code_hash,operation_id,ip_hash);
end$$;
alter function public.msrc_participant_login_finish(uuid,uuid,uuid) set schema msrc_participant;
alter function msrc_participant.msrc_participant_login_finish(uuid,uuid,uuid) rename to legacy_login_finish;
create function public.msrc_participant_login_finish(attempt_id uuid,actor_id uuid default null,session_id uuid default null)
 returns jsonb language plpgsql security definer set search_path='' as $$begin
 if actor_id is not null and not msrc_participant.age_proven(actor_id) then return jsonb_build_object('state','denied');end if;
 return msrc_participant.legacy_login_finish(attempt_id,actor_id,session_id);
end$$;
alter function msrc_participant.observe_profile(text) rename to legacy_observe_profile;
create function msrc_participant.observe_profile(edition_key text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$begin
 if not msrc_participant.age_proven(auth.uid()) then return null;end if;
 return msrc_participant.legacy_observe_profile(edition_key);
 exception when invalid_text_representation then return null;
 end;
$$;
create or replace function public.msrc_participant_profile(edition_key text) returns jsonb
 language sql stable security definer set search_path='' as $$select msrc_participant.observe_profile(edition_key);$$;

-- All general persisted context paths also fail closed for a legacy unknown-
-- age participant. Staff promotion remains governed by its independent native
-- admission and current strongest all-edition authority contract.
create function msrc_participant.context_admitted(target_actor uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select not exists(select 1 from msrc_participant.profiles p where p.actor_id=target_actor)
  or exists(select 1 from msrc_staff.profiles p where p.actor_id=target_actor)
  or (msrc_participant.ready() and msrc_participant.age_proven(target_actor));
$$;
-- Copy, then replace the original OID so existing RLS/public/internal callers
-- retain the new perimeter. Only the function name/implicit argument-label is
-- changed in the reviewed pre-existing body; no assurance logic is weakened.
do $$declare definition text;begin
 definition:=pg_get_functiondef('msrc_sessions.own_context(text,boolean)'::regprocedure);
 definition:=replace(definition,'FUNCTION msrc_sessions.own_context(','FUNCTION msrc_sessions.age_legacy_own_context(');
 definition:=replace(definition,'own_context.edition_key','age_legacy_own_context.edition_key');
 execute definition;
 definition:=pg_get_functiondef('msrc_sessions.observe_context(text)'::regprocedure);
 definition:=replace(definition,'FUNCTION msrc_sessions.observe_context(','FUNCTION msrc_sessions.age_legacy_observe_context(');
 definition:=replace(definition,'observe_context.edition_key','age_legacy_observe_context.edition_key');
 execute definition;
end$$;
create or replace function msrc_sessions.own_context(edition_key text,record_activity boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$begin
 if not msrc_participant.context_admitted(auth.uid()) then return null;end if;
 return msrc_sessions.age_legacy_own_context(edition_key,record_activity);
 exception when invalid_text_representation then return null;
end$$;
create or replace function msrc_sessions.observe_context(edition_key text) returns jsonb
 language plpgsql stable security definer set search_path='' as $$begin
 if not msrc_participant.context_admitted(auth.uid()) then return null;end if;
 return msrc_sessions.age_legacy_observe_context(edition_key);
 exception when invalid_text_representation then return null;
 end;
$$;
create or replace function public.msrc_session_context(edition_key text) returns jsonb
 language sql security definer set search_path='' as $$select msrc_sessions.own_context(edition_key,false);$$;
create or replace function public.msrc_session_activity(edition_key text) returns jsonb
 language sql security definer set search_path='' as $$select msrc_sessions.own_context(edition_key,false);$$;

create function msrc_participant.cleanup_authorized(target_actor uuid) returns boolean
 language sql volatile security definer set search_path='' as $$
 select session_user='postgres' and exists(select 1 from msrc_participant.cleanup_jobs j
  where j.actor_id=target_actor and j.state='running' and j.native_transaction=pg_current_xact_id());
$$;
create function msrc_participant.guard_cleanup_job() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 if current_user<>'postgres' or session_user<>'postgres' or tg_op in('DELETE','TRUNCATE') then
  raise exception using errcode='42501',message='Native cleanup maintenance only.';end if;
 if tg_op='UPDATE' and (old.state='completed' or new.id<>old.id or new.actor_id<>old.actor_id
  or new.native_created_at<>old.native_created_at or new.created_at<>old.created_at) then
  raise exception using errcode='55000',message='Cleanup evidence is immutable.';end if;
 return new;
end$$;
create trigger participant_cleanup_job_guard before insert or update or delete on msrc_participant.cleanup_jobs
 for each row execute function msrc_participant.guard_cleanup_job();
create trigger participant_cleanup_job_no_truncate before truncate on msrc_participant.cleanup_jobs
 for each statement execute function msrc_participant.guard_cleanup_job();
create function msrc_participant.guard_retention_hold() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 if current_user<>'postgres' or session_user<>'postgres' or tg_op in('DELETE','TRUNCATE') then
  raise exception using errcode='42501',message='Retention maintenance only.';end if;
 if tg_op='UPDATE' and (old.released_at is not null or new.released_at is null
  or (to_jsonb(new)-'released_at') is distinct from (to_jsonb(old)-'released_at')) then
  raise exception using errcode='55000',message='Retention hold history is immutable.';end if;
 perform 1 from auth.users u where u.id=new.actor_id for update;
 if not found then raise exception using errcode='42501',message='Existing native subject required.';end if;
 return new;
end$$;
create trigger participant_hold_guard before insert or update or delete on msrc_participant.retention_holds
 for each row execute function msrc_participant.guard_retention_hold();
create trigger participant_hold_no_truncate before truncate on msrc_participant.retention_holds
 for each statement execute function msrc_participant.guard_retention_hold();

-- The same authority lock is used by invite/role/recovery paths. A worker takes
-- it first, then account→native with SKIP LOCKED, never waits user→account against an
-- existing account→user session/promotion lock order.
create function msrc_participant.guard_retention_reference() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare target uuid;
 begin
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 if tg_table_schema='msrc_authorization' then target:=new.actor_id;
 elsif tg_table_name='invitations' then select u.id into target from auth.users u where u.email=new.email;
 else target:=new.actor_id;end if;
 if target is not null then
  perform 1 from auth.users u where u.id=target for key share;
  if exists(select 1 from msrc_participant.subject_refs s where s.actor_id=target and s.erased_at is not null) then
   raise exception using errcode='42501',message='Erased subject cannot gain retained access.';end if;
 end if;return new;
end$$;
create trigger a00_participant_retention_grant before insert or update on msrc_authorization.role_grants
 for each row execute function msrc_participant.guard_retention_reference();
create trigger a00_participant_retention_invite before insert on msrc_staff.invitations
 for each row execute function msrc_participant.guard_retention_reference();

create function msrc_participant.native_audit_mentions(payload jsonb,target_actor uuid,email text) returns boolean
 language sql immutable set search_path='' as $$
 select coalesce(payload->>'actor_id'=target_actor::text or payload#>>'{traits,user_id}'=target_actor::text
  or payload#>>'{traits,user_email}'=email or payload->>'actor_username'=email,false);
$$;
create function msrc_participant.erased_native_audit(payload jsonb,target_actor uuid) returns jsonb
 language sql immutable set search_path='' as $$
 select jsonb_build_object('actor_id',payload->'actor_id','action',payload->'action','log_type',payload->'log_type',
  'traits',jsonb_build_object('user_id',target_actor),'account_erased',true);
$$;
create function msrc_participant.native_audit_owned(payload jsonb,target_actor uuid) returns boolean
 language sql immutable set search_path='' as $$
 -- Pinned GoTrue2.197 requireAdmin constructs a zero-ID service actor whose
 -- username is the actual service role. An identified other actor is retained,
 -- never redacted as if its personal/security evidence belonged to this subject.
 select case when jsonb_typeof(payload) is distinct from 'object'
  or (payload->'traits' is not null and payload->'traits'<>'null'::jsonb and jsonb_typeof(payload->'traits')<>'object') then false else
 coalesce((payload->>'actor_id'=target_actor::text or
  (payload->>'actor_id'='00000000-0000-0000-0000-000000000000' and payload->>'actor_username'='service_role'))
  and (payload#>>'{traits,user_id}' is null or payload#>>'{traits,user_id}'=target_actor::text)
  and not exists(select 1 from jsonb_object_keys(payload) k where k not in('actor_id','actor_via_sso','actor_username','actor_name','action','log_type','traits','account_erased'))
  and not exists(select 1 from jsonb_object_keys(coalesce(nullif(payload->'traits','null'::jsonb),'{}')) k where k not in('user_id','user_email','user_phone','provider')),false) end;
$$;
-- A provider audit INSERT begun before erasure must finish before the worker,
-- or wait and lose its personal fields after the durable tombstone commits.
create function msrc_participant.guard_native_audit_erasure() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare target_text text;target uuid;
 begin
 if tg_op='UPDATE' and coalesce((old.payload::jsonb->>'account_erased')='true',false)
  and to_jsonb(new) is distinct from to_jsonb(old) then
  raise exception using errcode='55000',message='Erased native audit cannot regain personal data.';end if;
 target_text:=coalesce(new.payload#>>'{traits,user_id}',new.payload->>'actor_id');
 if target_text !~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return new;end if;
 target:=target_text::uuid;
 if not exists(select 1 from msrc_participant.subject_refs s where s.actor_id=target and s.native_created_at is not null) then return new;end if;
 perform 1 from auth.users u where u.id=target for key share;
 if exists(select 1 from msrc_participant.subject_refs s where s.actor_id=target and s.erased_at is not null) then
  if not msrc_participant.native_audit_owned(new.payload::jsonb,target) then
   raise exception using errcode='42501',message='Mixed erased native audit is unavailable.';end if;
  new.payload:=msrc_participant.erased_native_audit(new.payload::jsonb,target);new.ip_address:='';end if;
 return new;
end$$;
create trigger participant_native_audit_erasure before insert or update on auth.audit_log_entries
 for each row execute function msrc_participant.guard_native_audit_erasure();

create function msrc_participant.unknown_erasure_reference() returns boolean
 language sql stable security definer set search_path='' as $$
 -- An unreviewed CASCADE/SET NULL FK must not silently erase or detach future
 -- operational records. Any new incoming FK closes erasure until its ownership
 -- and retention rule is separately reviewed, even if no current row uses it.
 select exists(select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
  where c.contype='f' and c.confrelid in('auth.users'::regclass,'msrc_participant.profiles'::regclass,'msrc_authorization.account_access'::regclass)
  and not (cardinality(c.conkey)=1 and cardinality(c.confkey)=1
   and (select a.attname from pg_attribute a where a.attrelid=c.conrelid and a.attnum=c.conkey[1])=
    case when n.nspname='auth' then 'user_id' else 'actor_id' end
   and (select a.attname from pg_attribute a where a.attrelid=c.confrelid and a.attnum=c.confkey[1])=
    case when c.confrelid='auth.users'::regclass then 'id' else 'actor_id' end
   and ((c.confrelid='auth.users'::regclass and (
   (n.nspname='auth' and t.relname in('identities','mfa_factors','sessions','refresh_tokens','one_time_tokens','flow_state','oauth_authorizations','oauth_consents','web_authn_credentials'))
   or (n.nspname,t.relname) in(('msrc_authorization','account_access'),('msrc_participant','profiles'),('msrc_staff','profiles'),('msrc_staff','password_changes'),
    ('msrc_sessions','session_state'),('msrc_sessions','actor_revocations'),('msrc_staff_email','identity_revision'),('msrc_staff_email','challenges'),('msrc_staff_email','receipts'))))
   or (c.confrelid='msrc_participant.profiles'::regclass and n.nspname='msrc_participant' and t.relname in('challenges','operations','session_receipts'))
   or (c.confrelid='msrc_authorization.account_access'::regclass and n.nspname='msrc_authorization' and t.relname='role_grants'))));
$$;

create function msrc_participant.retained_reason(target_actor uuid) returns text
 language plpgsql volatile security definer set search_path='' as $$
 declare native_email text;storage_owned boolean;storage_relation regclass;
 begin
 select u.email into native_email from auth.users u where u.id=target_actor;
 if msrc_participant.unknown_erasure_reference() then return 'unreviewed_foreign_key';end if;
 if exists(select 1 from msrc_participant.retention_holds h where h.actor_id=target_actor and h.released_at is null) then return 'explicit_hold';end if;
 if exists(select 1 from msrc_authorization.role_grants g where g.actor_id=target_actor) then return 'authority_history';end if;
 if exists(select 1 from msrc_authorization.account_access a where a.actor_id=target_actor and (a.individually_identified or a.state<>'active')) then return 'retained_account';end if;
 if exists(select 1 from msrc_staff.profiles p where p.actor_id=target_actor)
  or exists(select 1 from msrc_staff.bootstrap_reservations b where b.actor_id=target_actor or b.email=native_email)
  or exists(select 1 from msrc_staff.invitations i where i.email=native_email or i.accepted_by=target_actor or i.invited_by=target_actor)
  or exists(select 1 from msrc_staff.admissions a where a.actor_id=target_actor or a.email=native_email)
  or exists(select 1 from msrc_staff.admin_operations o where o.target_actor_id=target_actor or o.performer_actor_id=target_actor)
  or exists(select 1 from msrc_staff.password_changes o where o.actor_id=target_actor)
  or exists(select 1 from msrc_staff.audit a where a.actor_id=target_actor or a.target_id=target_actor) then return 'staff_history';end if;
 if exists(select 1 from msrc_sessions.session_state s where s.actor_id=target_actor)
  or exists(select 1 from msrc_sessions.actor_revocations r where r.actor_id=target_actor)
  or exists(select 1 from msrc_sessions.security_audit a where a.actor_id=target_actor or a.performed_by_actor_id=target_actor)
  or exists(select 1 from msrc_staff_email.challenges c where c.actor_id=target_actor)
  or exists(select 1 from msrc_staff_email.receipts r where r.actor_id=target_actor)
  or exists(select 1 from msrc_staff_email.audit a where a.actor_id=target_actor) then return 'security_history';end if;
 if exists(select 1 from auth.mfa_factors f where f.user_id=target_actor)
  or exists(select 1 from auth.identities i where i.user_id=target_actor and i.provider<>'email') then return 'native_identity';end if;
 -- Storage is deliberately absent from minimal native-Auth CI stacks. When
 -- installed, its actual owner/owner_id records remain a mandatory hold. This
 -- catalog-bound read avoids adding or changing optional provider schemas.
 storage_relation:=to_regclass('storage.objects');
 if storage_relation is not null then
  execute format('select exists(select 1 from %s o where o.owner=$1 or o.owner_id=$1::text)',storage_relation)
   into storage_owned using target_actor;
  if storage_owned then return 'storage_owner';end if;
 end if;
 if exists(select 1 from auth.audit_log_entries a where msrc_participant.native_audit_mentions(a.payload::jsonb,target_actor,native_email)
  and (coalesce(a.payload->>'action','') not in('user_signedup','user_confirmation_requested','user_repeated_signup')
   or not msrc_participant.native_audit_owned(a.payload::jsonb,target_actor))) then return 'native_security_history';end if;
 return null;
end$$;

create function msrc_participant.guard_personal_erasure() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare target uuid;
 begin
 if tg_op='TRUNCATE' then raise exception using errcode='55000',message='Personal rows require actor cleanup proof.';end if;
 target:=old.actor_id;
 if not msrc_participant.cleanup_authorized(target) then raise exception using errcode='42501',message='Atomic participant cleanup required.';end if;
 return old;
end$$;
do $$declare t text;begin
 foreach t in array array['profiles','admissions','challenges','operations','session_receipts'] loop
  execute format('create trigger participant_personal_erasure before delete on msrc_participant.%I for each row execute function msrc_participant.guard_personal_erasure()',t);
  execute format('create trigger participant_personal_no_truncate before truncate on msrc_participant.%I for each statement execute function msrc_participant.guard_personal_erasure()',t);
 end loop;
end$$;
create function msrc_participant.guard_native_delete() returns trigger
 language plpgsql security definer set search_path='' as $$
 declare subject msrc_participant.subject_refs%rowtype;
 begin
 select s.* into subject from msrc_participant.subject_refs s where s.actor_id=old.id;
 if not found or subject.native_created_at is null then return old;end if;
 if not msrc_participant.cleanup_authorized(old.id) or subject.ever_verified or subject.erased_at is not null
  or old.email_confirmed_at is not null or old.created_at<>subject.native_created_at
  or subject.native_created_at+interval '30 days'>clock_timestamp() or msrc_participant.retained_reason(old.id) is not null then
  raise exception using errcode='42501',message='Authorized never-verified cleanup required.';end if;
 return old;
end$$;
create trigger a00_participant_native_delete before delete on auth.users
 for each row execute function msrc_participant.guard_native_delete();

create function msrc_participant.cleanup_unverified(batch_size integer default 100,dry_run boolean default true) returns jsonb
 language plpgsql security definer set search_path='' as $$
 declare actor auth.users%rowtype;subject msrc_participant.subject_refs%rowtype;candidate uuid;job uuid;reason text;error_state text;
  scanned integer:=0;eligible integer:=0;deleted integer:=0;held integer:=0;failed integer:=0;
 begin
 if current_user<>'postgres' or session_user<>'postgres' then raise exception using errcode='42501',message='Native cleanup operator required.';end if;
 if batch_size is null or batch_size not between 1 and 1000 or dry_run is null then
  raise exception using errcode='22023',message='Bounded cleanup parameters required.';end if;
 if not coalesce((select enabled from msrc_participant.retention_policy where singleton),false) then
  return jsonb_build_object('state','closed','scanned',0,'eligible',0,'deleted',0,'held',0,'failed',0);end if;
 perform pg_advisory_xact_lock(hashtextextended('staff-portal-authority',0));
 for candidate in select u.id from auth.users u join msrc_participant.subject_refs s on s.actor_id=u.id
  join msrc_participant.profiles p on p.actor_id=u.id
  where not s.ever_verified and s.erased_at is null and p.state='pending' and u.email_confirmed_at is null
   and s.native_created_at=u.created_at and s.native_created_at+interval '30 days'<=clock_timestamp()
  order by s.native_created_at,u.id limit batch_size loop
  -- Session checkers and grant promotion use account→native. Both locks skip
  -- busy subjects; verification uses native→operation only. Never invert the
  -- account lock order just because a native scan can use SKIP LOCKED.
  perform 1 from msrc_authorization.account_access a where a.actor_id=candidate for update skip locked;
  if not found and exists(select 1 from msrc_authorization.account_access a where a.actor_id=candidate) then continue;end if;
  select u.* into actor from auth.users u where u.id=candidate for update skip locked;
  if not found then continue;end if;
  scanned:=scanned+1;
  select s.* into subject from msrc_participant.subject_refs s where s.actor_id=actor.id for update;
  -- The fresh statement rechecks after the native-row lock, including a
  -- verification that committed while the scan was waiting elsewhere.
  if subject.ever_verified or subject.erased_at is not null or exists(select 1 from auth.users u where u.id=actor.id and u.email_confirmed_at is not null)
   or not exists(select 1 from msrc_participant.profiles p where p.actor_id=actor.id and p.state='pending') then continue;end if;
  reason:=msrc_participant.retained_reason(actor.id);
  if reason is not null then held:=held+1;
   if not dry_run then insert into msrc_participant.retention_audit(actor_id,event,reason) values(actor.id,'cleanup.held',reason);end if;
   continue;end if;
  eligible:=eligible+1;if dry_run then continue;end if;
  insert into msrc_participant.cleanup_jobs(actor_id,native_created_at,state,native_transaction)
   values(actor.id,subject.native_created_at,'running',pg_current_xact_id())
   on conflict(actor_id) do update set state='running',native_transaction=excluded.native_transaction,completed_at=null,reason=null,sqlstate=null
   returning id into job;
  begin
   -- Retain only opaque native audit references/actions/times, erasing account
   -- personal payload/IP fields. Provider-exported logs/backups remain subject
   -- to their separately reviewed retention and restore reconciliation.
   update auth.audit_log_entries a set payload=msrc_participant.erased_native_audit(a.payload::jsonb,actor.id),ip_address=''
    where msrc_participant.native_audit_mentions(a.payload::jsonb,actor.id,actor.email);
   delete from msrc_participant.login_attempts l where l.email_hash in(select c.email_hash from msrc_participant.challenges c where c.actor_id=actor.id);
   delete from msrc_participant.limit_events e where e.kind='issue_email' and e.subject_hash in(select c.email_hash from msrc_participant.challenges c where c.actor_id=actor.id);
   delete from msrc_participant.session_receipts r where r.actor_id=actor.id;
   delete from msrc_participant.operations o where o.actor_id=actor.id;
   delete from msrc_participant.challenges c where c.actor_id=actor.id;
   delete from msrc_participant.admissions a where a.actor_id=actor.id;
   delete from msrc_participant.profiles p where p.actor_id=actor.id;
   delete from msrc_authorization.account_access a where a.actor_id=actor.id;
   delete from auth.users u where u.id=actor.id;
   update msrc_participant.subject_refs s set erased_at=clock_timestamp(),erase_job=job where s.actor_id=actor.id;
   update msrc_participant.cleanup_jobs j set state='completed',completed_at=clock_timestamp() where j.id=job;
   insert into msrc_participant.retention_audit(actor_id,job_id,event) values(actor.id,job,'account.erased');
   deleted:=deleted+1;
  exception when others then
   get stacked diagnostics error_state=returned_sqlstate;
   update msrc_participant.cleanup_jobs j set state='failed',completed_at=clock_timestamp(),reason='retained_reference_or_failure',sqlstate=error_state where j.id=job;
   insert into msrc_participant.retention_audit(actor_id,job_id,event,reason) values(actor.id,job,'cleanup.failed','retained_reference_or_failure');
   failed:=failed+1;
  end;
 end loop;
 return jsonb_build_object('state',case when dry_run then 'preview' else 'completed' end,'scanned',scanned,'eligible',eligible,'deleted',deleted,'held',held,'failed',failed);
end$$;
comment on function msrc_participant.cleanup_unverified(integer,boolean) is 'Native postgres-only bounded atomic worker. Dry-run by default, independent FALSE gate, no scheduler. Never delete verified/staff/invited/retained subjects; unknown FK failures roll back all erasure for that actor. Aggregate result only. Latest erasure/ever-verification ledger reconciliation is mandatory before backup restore access.';

revoke all on all functions in schema msrc_participant from public,anon,authenticated,service_role,supabase_auth_admin;
grant execute on function msrc_participant.suppress_native_email(jsonb) to supabase_auth_admin;
revoke all on function msrc_sessions.age_legacy_own_context(text,boolean),msrc_sessions.age_legacy_observe_context(text),msrc_sessions.own_context(text,boolean),msrc_sessions.observe_context(text) from public,anon,authenticated,service_role;
revoke all on function public.msrc_participant_signup_reserve(uuid,uuid,text,text,text),public.msrc_participant_signup_reserve(uuid,uuid,text,text,text,boolean),
 public.msrc_participant_email_begin(text,text,uuid,text,text,text,text,text),public.msrc_participant_email_consume(text,text,uuid,text,uuid,text),public.msrc_participant_login_finish(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_participant_signup_reserve(uuid,uuid,text,text,text,boolean),public.msrc_participant_email_begin(text,text,uuid,text,text,text,text,text),
 public.msrc_participant_email_consume(text,text,uuid,text,uuid,text),public.msrc_participant_login_finish(uuid,uuid,uuid) to service_role;
notify pgrst,'reload schema';
