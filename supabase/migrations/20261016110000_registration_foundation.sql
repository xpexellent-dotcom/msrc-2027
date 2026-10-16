-- ORG-051 / ENG-043; REG-01/02/04/05, CHK-01/02, ADM-01/05, PRV-03/05/06.
-- REVIEW ONLY. Depends on 20261008160137, not the cleanup scheduler. Seeds no settings/data.
create schema msrc_registration;
revoke all on schema msrc_registration from public,anon,authenticated,service_role;
alter default privileges in schema msrc_registration revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema msrc_registration revoke all on sequences from public,anon,authenticated,service_role;
alter default privileges in schema msrc_registration revoke execute on functions from public,anon,authenticated,service_role;

create table msrc_registration.settings (
 edition_key text primary key references msrc_authorization.edition_config(edition_key) on delete restrict,
 enabled boolean not null default false,
 terms_version text check(terms_version is null or (terms_version=btrim(terms_version) and char_length(terms_version) between 1 and 128)),
 payment_required boolean,
 general_capacity integer check(general_capacity>0),
 default_workshop_capacity integer check(default_workshop_capacity>0),
 early_access_start_at timestamptz, early_access_end_at timestamptz,
 priority_start_at timestamptz, priority_end_at timestamptz,
 general_opening_at timestamptz, closing_at timestamptz,
 waitlist_offer_hours integer check(waitlist_offer_hours>0),
 confirm_seat_lead_days integer check(confirm_seat_lead_days>=0),
 confirm_seat_response_hours integer check(confirm_seat_response_hours>0),
 places_remaining_threshold integer check(places_remaining_threshold>=0),
 minimum_age integer check(minimum_age>=18),
 payment_window_hours integer check(payment_window_hours>0),
 updated_at timestamptz not null default clock_timestamp(),
 check(early_access_start_at<early_access_end_at),
 check(priority_start_at<priority_end_at),
 check(general_opening_at<closing_at),
 check(priority_end_at<=general_opening_at),
 check(early_access_end_at<=general_opening_at),
 check(early_access_start_at is null or isfinite(early_access_start_at)),
 check(early_access_end_at is null or isfinite(early_access_end_at)),
 check(priority_start_at is null or isfinite(priority_start_at)),
 check(priority_end_at is null or isfinite(priority_end_at)),
 check(general_opening_at is null or isfinite(general_opening_at)),
 check(closing_at is null or isfinite(closing_at))
);
comment on table msrc_registration.settings is 'Private per-edition policy and settings. No migration seed. Production NULLs close the gate; workshop capacity remains pending DR-CFG-07. No settings-update application API in slice 1.';

create table msrc_registration.requests (
 id uuid primary key default gen_random_uuid(),
 edition_key text not null references msrc_registration.settings(edition_key) on delete restrict,
 actor_id uuid not null references msrc_participant.profiles(actor_id) on delete restrict,
 status text not null default 'pending_approval' check(status in ('pending_approval','approved','approved_awaiting_payment','waitlisted','offered','confirmed','cancelled','expired')),
 terms_version text not null check(char_length(terms_version) between 1 and 128),
 terms_accepted_at timestamptz not null default clock_timestamp(),
 document_type text not null check(document_type in ('national_id','iqama','passport')),
 identity_envelope jsonb not null,
 identity_hash text not null check(identity_hash ~ '^[a-f0-9]{64}$'),
 identity_masked text not null check(identity_masked ~ '^•{6}([A-Z0-9]{4})?$'),
 key_version text not null check(key_version ~ '^[A-Za-z0-9_-]{1,32}$'),
 payment_due_at timestamptz,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 unique(actor_id,edition_key), unique(edition_key,identity_hash),
 check(jsonb_typeof(identity_envelope)='object' and identity_envelope ?& array['ciphertext','iv','authTag','keyVersion']
  and identity_envelope - array['ciphertext','iv','authTag','keyVersion']='{}'::jsonb
  and jsonb_typeof(identity_envelope->'ciphertext')='string' and jsonb_typeof(identity_envelope->'iv')='string'
  and jsonb_typeof(identity_envelope->'authTag')='string' and jsonb_typeof(identity_envelope->'keyVersion')='string'
  and identity_envelope->>'ciphertext' ~ '^[a-f0-9]{8,40}$' and length(identity_envelope->>'ciphertext')%2=0
  and identity_envelope->>'iv' ~ '^[a-f0-9]{24}$' and identity_envelope->>'authTag' ~ '^[a-f0-9]{32}$'
  and identity_envelope->>'keyVersion'=key_version),
 check(status<>'approved_awaiting_payment' or payment_due_at is not null)
);
create index registration_requests_edition on msrc_registration.requests(edition_key,created_at,id) include(status,actor_id);
comment on column msrc_registration.requests.identity_envelope is 'App AES-256-GCM only. AAD binds edition, actor, document type and key version. No plaintext identifier or encryption key enters PostgreSQL.';
comment on table msrc_registration.requests is 'Exactly one request per verified account per edition, stronger than active-only uniqueness. Slice 1 can insert pending_approval only. No seat/ticket/order state is implied.';

create table msrc_registration.priority_designations (
 edition_key text not null references msrc_registration.settings(edition_key) on delete restrict,
 actor_id uuid not null references msrc_participant.profiles(actor_id) on delete restrict,
 active boolean not null,
 reason text not null check(reason=btrim(reason) and char_length(reason) between 1 and 300 and reason !~ '[[:cntrl:]]'),
 designated_by uuid not null references msrc_staff.profiles(actor_id) on delete restrict,
 designated_at timestamptz not null default clock_timestamp(),
 removed_by uuid references msrc_staff.profiles(actor_id) on delete restrict,
 removed_at timestamptz,
 primary key(edition_key,actor_id),
 check((active and removed_at is null and removed_by is null) or (not active and removed_at is not null and removed_by is not null))
);
create index registration_priority_actor on msrc_registration.priority_designations(actor_id,edition_key) include(active);
create index registration_priority_designator on msrc_registration.priority_designations(designated_by);
create index registration_priority_remover on msrc_registration.priority_designations(removed_by);

create table msrc_registration.audit (
 id uuid primary key default gen_random_uuid(), edition_key text not null references msrc_registration.settings(edition_key) on delete restrict,
 performer_id uuid, target_actor uuid, request_id uuid references msrc_registration.requests(id) on delete restrict,
 event text not null check(event in ('request.submitted','priority.set','priority.removed','identity.revealed')),
 result text not null check(result in ('allowed','denied','unavailable')),
 previous_active boolean, new_active boolean,
 reason text check(reason is null or (reason=btrim(reason) and char_length(reason) between 1 and 300 and reason !~ '[[:cntrl:]]')),
 occurred_at timestamptz not null default clock_timestamp()
);
create index registration_audit_edition on msrc_registration.audit(edition_key,occurred_at,id);
create index registration_audit_request on msrc_registration.audit(request_id);
comment on table msrc_registration.audit is 'Immutable minimal evidence; performer/target opaque IDs intentionally not foreign keys, preserving evidence without adding participant-erasure dependencies. No identifier, ciphertext, hash or keys in audit.';
create trigger registration_audit_immutable before insert or update or delete on msrc_registration.audit
 for each row execute function msrc_staff.audit_immutable();
create trigger registration_audit_no_truncate before truncate on msrc_registration.audit
 for each statement execute function msrc_staff.audit_immutable();

alter table msrc_registration.settings enable row level security;
alter table msrc_registration.settings force row level security;
alter table msrc_registration.requests enable row level security;
alter table msrc_registration.requests force row level security;
alter table msrc_registration.priority_designations enable row level security;
alter table msrc_registration.priority_designations force row level security;
alter table msrc_registration.audit enable row level security;
alter table msrc_registration.audit force row level security;
revoke all on all tables in schema msrc_registration from public,anon,authenticated,service_role;

create function msrc_registration.settings_complete(edition text) returns boolean
 language sql stable security definer set search_path='' as $$
 select coalesce((select s.terms_version is not null and s.payment_required is not null and s.general_capacity is not null
 and s.early_access_start_at is not null and s.early_access_end_at is not null
 and s.priority_start_at is not null and s.priority_end_at is not null and s.general_opening_at is not null and s.closing_at is not null
 and s.waitlist_offer_hours is not null and s.confirm_seat_lead_days is not null and s.confirm_seat_response_hours is not null
 and s.places_remaining_threshold is not null and s.minimum_age=18 and (s.payment_required=false or s.payment_window_hours is not null)
 from msrc_registration.settings s where s.edition_key=edition),false);
$$;
-- DR-CFG-07 default_workshop_capacity is intentionally not a request gate: no workshop booking exists here.
-- A proof of 18+ cannot authorize a higher minimum_age; changing that policy closes this implementation.
create function msrc_registration.server_only() returns void
 language plpgsql security definer set search_path='' as $$begin
 if current_setting('role',true) is distinct from 'service_role'
 and not (session_user='postgres' and current_setting('role',true) in ('none','postgres')) then
 raise exception using errcode='42501',message='Server registration boundary required.';end if;
end$$;
create function msrc_registration.bind_claims(claims jsonb) returns boolean
 language plpgsql security definer set search_path='' as $$begin
 if jsonb_typeof(claims) is distinct from 'object' or claims->>'role' is distinct from 'authenticated'
 or coalesce(claims->>'sub','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
 or coalesce(claims->>'session_id','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
 or coalesce(claims->>'exp','') !~ '^[0-9]{1,12}$' then return false;end if;
 if (claims->>'exp')::numeric<=extract(epoch from clock_timestamp()) then return false;end if;
 perform set_config('request.jwt.claims',claims::text,true);return true;
end$$;
create function msrc_registration.priority_active(edition text,target_actor uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from msrc_registration.priority_designations p where p.edition_key=edition and p.actor_id=target_actor and p.active);
$$;
comment on function msrc_registration.priority_active(text,uuid) is 'Private server/database helper reserved for future workshop first-pick eligibility. No workshop allocation or client execution grant.';
create function msrc_registration.context(edition text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare s msrc_registration.settings%rowtype; profile jsonb; eligible boolean:=false; window_open boolean:=false;
 request jsonb; instant timestamptz:=clock_timestamp(); enabled boolean:=false;complete boolean;accounts_ready boolean;
begin
 select * into s from msrc_registration.settings where edition_key=edition;
 enabled:=coalesce(s.enabled,false);complete:=msrc_registration.settings_complete(edition);accounts_ready:=msrc_participant.ready();
 if enabled and complete and accounts_ready then
 profile:=msrc_participant.observe_profile(edition);
 eligible:=profile is not null and msrc_participant.age_proven(auth.uid());
 if eligible then
 window_open:=instant>=s.general_opening_at and instant<s.closing_at;
 if instant>=s.priority_start_at and instant<s.priority_end_at then
 window_open:=msrc_registration.priority_active(edition,auth.uid());
 end if;
 select jsonb_build_object('id',r.id,'status',r.status,'createdAt',r.created_at) into request
 from msrc_registration.requests r where r.edition_key=edition and r.actor_id=auth.uid();
 end if;
 end if;
 return jsonb_build_object('enabled',enabled,'participantAccountsReady',accounts_ready,'settingsComplete',complete,
 'eligible',eligible,'windowOpen',window_open,'state',case when not(enabled and complete and accounts_ready) then 'closed'
 when not eligible then 'denied' when not window_open then 'closed' else 'open' end,'termsVersion',s.terms_version,'request',request);
end$$;
create function public.msrc_registration_status(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
begin
 perform msrc_registration.server_only();
 return jsonb_build_object('enabled',coalesce((select s.enabled from msrc_registration.settings s where s.edition_key=edition_key),false),
 'participantAccountsReady',msrc_participant.ready(),'settingsComplete',msrc_registration.settings_complete(edition_key));
end$$;
create function public.msrc_registration_context(edition_key text,session_claims jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
begin
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_registration.context(edition_key);
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;
create function public.msrc_registration_submit(edition_key text,session_claims jsonb,document_type text,
 identity_envelope jsonb,identity_hash text,identity_masked text,key_version text,terms_version text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);context jsonb;r msrc_registration.requests%rowtype;result jsonb;
begin
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 -- Serialize one actor/edition before checking DB time/settings and writing. No unlocked preflight authorizes a mutation.
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 perform pg_advisory_xact_lock(hashtextextended('registration:'||edition_key||':'||auth.uid()::text,0));
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for share;
 context:=msrc_registration.context(edition_key);
 if context->>'state'<>'open' then result:=jsonb_build_object('state',context->>'state');
 elsif context->'request'<>'null'::jsonb then result:=jsonb_build_object('state','submitted','request',context->'request');
 elsif terms_version is null or terms_version is distinct from context->>'termsVersion' or document_type is null or identity_envelope is null
 or identity_hash is null or identity_masked is null or key_version is null then result:=jsonb_build_object('state','denied');
 else
 begin
 insert into msrc_registration.requests(edition_key,actor_id,terms_version,document_type,identity_envelope,identity_hash,identity_masked,key_version)
 values(edition_key,auth.uid(),terms_version,document_type,identity_envelope,identity_hash,identity_masked,key_version) returning * into r;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result)
 values(edition_key,auth.uid(),auth.uid(),r.id,'request.submitted','allowed');
 result:=jsonb_build_object('state','submitted','request',jsonb_build_object('id',r.id,'status',r.status,'createdAt',r.created_at));
 exception when unique_violation then result:=jsonb_build_object('state','conflict');
 when check_violation then result:=jsonb_build_object('state','denied');end;
 end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function public.msrc_registration_priority_set(edition_key text,session_claims jsonb,target_actor uuid,active boolean,reason text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);context jsonb;result jsonb;previous_active boolean;
begin
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 context:=msrc_staff.authorize(edition_key,array['superAdmin']);
 if context is null or active is null or target_actor is null or reason is null or reason<>btrim(reason) or char_length(reason) not between 1 and 300 or reason ~ '[[:cntrl:]]'
 or not exists(select 1 from msrc_participant.profiles p where p.actor_id=target_actor)
 or not exists(select 1 from msrc_registration.settings s where s.edition_key=edition_key) then
 if exists(select 1 from msrc_registration.settings s where s.edition_key=edition_key) then
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,event,result)
 values(edition_key,auth.uid(),target_actor,case when active is false then 'priority.removed' else 'priority.set' end,'denied');end if;
 result:=jsonb_build_object('state','denied');
 else
 perform pg_advisory_xact_lock(hashtextextended('registration:'||edition_key||':'||target_actor::text,0));
 select p.active into previous_active from msrc_registration.priority_designations p where p.edition_key=edition_key and p.actor_id=target_actor;
 insert into msrc_registration.priority_designations(edition_key,actor_id,active,reason,designated_by,removed_by,removed_at)
 values(edition_key,target_actor,active,reason,auth.uid(),case when not active then auth.uid() end,case when not active then clock_timestamp() end)
 on conflict on constraint priority_designations_pkey do update set active=excluded.active,reason=excluded.reason,
 designated_by=case when excluded.active then auth.uid() else msrc_registration.priority_designations.designated_by end,
 designated_at=case when excluded.active then clock_timestamp() else msrc_registration.priority_designations.designated_at end,
 removed_by=excluded.removed_by,removed_at=excluded.removed_at;
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,event,result,reason,previous_active,new_active)
 values(edition_key,auth.uid(),target_actor,case when active then 'priority.set' else 'priority.removed' end,'allowed',reason,previous_active,active);
 result:=jsonb_build_object('state','updated');end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

-- Existing staff authentication remains its own exact-session authenticated boundary.
-- The old no-reason stub retains safe unavailable/denied behavior for compatibility.
create function public.msrc_staff_identity_reveal(edition_key text,target_actor uuid,reason text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare r msrc_registration.requests%rowtype;allowed boolean;outcome text;
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 allowed:=msrc_staff.authorize(edition_key,array['superAdmin']) is not null and reason is not null
 and reason=btrim(reason) and char_length(reason) between 1 and 300 and reason !~ '[[:cntrl:]]';
 select * into r from msrc_registration.requests q where q.edition_key=edition_key and q.actor_id=target_actor;
 outcome:=case when not allowed then 'denied' when r.id is null then 'unavailable' else 'allowed' end;
 perform msrc_staff.record(edition_key,'identity_reveal',target_actor,outcome);
 if exists(select 1 from msrc_registration.settings s where s.edition_key=edition_key) then
 insert into msrc_registration.audit(edition_key,performer_id,target_actor,request_id,event,result,reason)
 values(edition_key,auth.uid(),target_actor,r.id,'identity.revealed',outcome,case when allowed then reason end);end if;
 if outcome<>'allowed' then return jsonb_build_object('state',outcome);end if;
 return jsonb_build_object('state','available','documentType',r.document_type,'identityEnvelope',r.identity_envelope);
end$$;
create or replace function public.msrc_staff_participants(edition_key text,search text default '') returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare rows jsonb;
begin
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 perform msrc_staff.record(edition_key,'participants_read',null,'denied');return null;end if;
 if char_length(search)>200 then return null;end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows from (select p.actor_id as "actorId",p.name,u.email,
 case when a.state='suspended' then 'suspended' when u.email_confirmed_at is null then 'unverified' else 'verified' end as status,
 p.created_at as "createdAt",r.identity_masked as "identityMasked"
 from msrc_participant.profiles p join auth.users u on u.id=p.actor_id join msrc_authorization.account_access a on a.actor_id=p.actor_id
 left join msrc_registration.requests r on r.actor_id=p.actor_id and r.edition_key=edition_key
 where u.deleted_at is null and (search='' or strpos(lower(p.name),lower(search))>0 or strpos(lower(u.email),lower(search))>0)
 order by p.created_at desc,p.actor_id limit 50) q;
 perform msrc_staff.record(edition_key,'participants_read',null,'allowed');return jsonb_build_object('rows',rows);
end$$;
revoke all on all functions in schema msrc_registration from public,anon,authenticated,service_role;
revoke all on function public.msrc_registration_status(text),public.msrc_registration_context(text,jsonb),
 public.msrc_registration_submit(text,jsonb,text,jsonb,text,text,text,text),public.msrc_registration_priority_set(text,jsonb,uuid,boolean,text)
 from public,anon,authenticated,service_role;
grant execute on function public.msrc_registration_status(text),public.msrc_registration_context(text,jsonb),
 public.msrc_registration_submit(text,jsonb,text,jsonb,text,text,text,text),public.msrc_registration_priority_set(text,jsonb,uuid,boolean,text) to service_role;
revoke all on function public.msrc_staff_identity_reveal(text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_identity_reveal(text,uuid,text) to authenticated;

-- Integrate the new RESTRICT references with the age-retention fail-closed
-- inventory. Keep the original pinned allowlist; recognize only these two exact
-- new constraints. Operational subjects are retained, never cascade-erased.
create or replace function msrc_participant.unknown_erasure_reference() returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
 where c.contype='f' and c.confrelid in('auth.users'::regclass,'msrc_participant.profiles'::regclass,'msrc_authorization.account_access'::regclass)
 and not (cardinality(c.conkey)=1 and cardinality(c.confkey)=1
 and (select a.attname from pg_attribute a where a.attrelid=c.conrelid and a.attnum=c.conkey[1])=case when n.nspname='auth' then 'user_id' else 'actor_id' end
 and (select a.attname from pg_attribute a where a.attrelid=c.confrelid and a.attnum=c.confkey[1])=case when c.confrelid='auth.users'::regclass then 'id' else 'actor_id' end
 and ((c.confrelid='auth.users'::regclass and ((n.nspname='auth' and t.relname in('identities','mfa_factors','sessions','refresh_tokens','one_time_tokens','flow_state','oauth_authorizations','oauth_consents',
 'webauthn_credentials','webauthn_challenges','scim_users','mfa_recovery_code_sets'))
 or (n.nspname,t.relname) in(('msrc_authorization','account_access'),('msrc_participant','profiles'),('msrc_staff','profiles'),('msrc_staff','password_changes'),
 ('msrc_sessions','session_state'),('msrc_sessions','actor_revocations'),('msrc_staff_email','identity_revision'),('msrc_staff_email','challenges'),('msrc_staff_email','receipts'))))
 or (c.confrelid='msrc_participant.profiles'::regclass and n.nspname='msrc_participant' and t.relname in('challenges','operations','session_receipts'))
 or (c.confrelid='msrc_authorization.account_access'::regclass and n.nspname='msrc_authorization' and t.relname='role_grants')
 or (c.confrelid='msrc_participant.profiles'::regclass and n.nspname='msrc_registration' and t.relname in('requests','priority_designations')
 and c.confdeltype='r' and c.confupdtype='a' and c.convalidated))));
$$;
-- Preserve the existing helper OID so previously parsed security/cleanup callers
-- keep the new retained-record boundary. Clone the old body, never rename it.
do $$declare definition text;begin
 definition:=pg_get_functiondef('msrc_participant.retained_reason(uuid)'::regprocedure);
 definition:=replace(definition,'FUNCTION msrc_participant.retained_reason(',
 'FUNCTION msrc_participant.registration_legacy_retained_reason(');
 execute definition;
end$$;
create or replace function msrc_participant.retained_reason(target_actor uuid) returns text
 language plpgsql volatile security definer set search_path='' as $$begin
 if msrc_participant.unknown_erasure_reference() then return 'unreviewed_foreign_key';end if;
 if exists(select 1 from msrc_registration.requests r where r.actor_id=target_actor) then return 'retained_account';end if;
 if exists(select 1 from msrc_registration.priority_designations p where p.actor_id=target_actor) then return 'retained_account';end if;
 return msrc_participant.registration_legacy_retained_reason(target_actor);
end$$;
revoke all on function msrc_participant.retained_reason(uuid),msrc_participant.registration_legacy_retained_reason(uuid)
 from public,anon,authenticated,service_role,supabase_auth_admin;
notify pgrst,'reload schema';
