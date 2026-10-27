-- ENG-086 / ORG-066. AUTH-05/06/07/08, PRV-02/03/04/05/06, SEC-01/02/06.
-- Review only: no hosted apply, workflow activation, dates, settings or mail.
begin;

create table msrc_participant.profile_details (
 actor_id uuid primary key references msrc_participant.profiles(actor_id) on delete cascade,
 edition_key text not null references msrc_authorization.edition_config(edition_key) on delete restrict,
 institution text check(institution is null or (institution=btrim(institution) and char_length(institution) between 1 and 160 and institution !~ '[[:cntrl:]]')),
 student_status text check(student_status in('medical_student','intern','resident','faculty','other')),
 student_year integer,
 specialty_interests text[] not null default '{}'::text[] check(cardinality(specialty_interests)<=5 and case when cardinality(specialty_interests)=0 then true when array_ndims(specialty_interests)=1 and array_lower(specialty_interests,1)=1 then array_position(specialty_interests,null) is null else false end),
 avatar_object text unique,
 version integer not null check(version>0),
 consent_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check((student_status='medical_student' and student_year between 1 and 6) or (student_status is distinct from 'medical_student' and student_year is null)),
 check(student_status is distinct from 'medical_student' or student_year is not null)
);
-- This registry survives account erasure only until Storage API deletion has
-- succeeded. A staged object is registered BEFORE upload, covering process loss.
create table msrc_participant.avatar_objects (
 object_name text primary key check(object_name ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$'),
 actor_id uuid not null,
 edition_key text not null references msrc_authorization.edition_config(edition_key) on delete restrict,
 state text not null check(state in('staged','active','delete')),
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default clock_timestamp()+interval '10 minutes'
);
create index participant_profile_edition on msrc_participant.profile_details(edition_key,actor_id);
create index participant_avatar_cleanup on msrc_participant.avatar_objects(state,expires_at,object_name);
create index participant_avatar_actor on msrc_participant.avatar_objects(actor_id);
create unique index participant_avatar_active on msrc_participant.avatar_objects(actor_id) where state='active';
alter table msrc_participant.profile_details enable row level security;
alter table msrc_participant.profile_details force row level security;
alter table msrc_participant.avatar_objects enable row level security;
alter table msrc_participant.avatar_objects force row level security;
revoke all on msrc_participant.profile_details,msrc_participant.avatar_objects from public,anon,authenticated,service_role;
comment on table msrc_participant.profile_details is 'ORG-066: optional, consent-based private profile fields; no public directory. Deleted with account and no later than one year after configured conference end.';

do $storage$begin
 if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
  raise notice 'Storage absent in disposable native Auth stack; avatar bucket DDL skipped.';return;
 end if;
 execute $ddl$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('participant-avatars','participant-avatars',false,2097152,array['image/webp'])$ddl$;
 execute $ddl$create policy participant_avatar_no_client_read on storage.objects as restrictive for select to anon,authenticated using(bucket_id<>'participant-avatars')$ddl$;
 execute $ddl$create policy participant_avatar_no_client_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'participant-avatars')$ddl$;
 execute $ddl$create policy participant_avatar_no_client_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'participant-avatars') with check(bucket_id<>'participant-avatars')$ddl$;
 execute $ddl$create policy participant_avatar_no_client_delete on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'participant-avatars')$ddl$;
end$storage$;

create function msrc_participant.profile_projection(target_actor uuid) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('institution',p.institution,'studentStatus',p.student_status,'studentYear',p.student_year,
 'specialtyInterests',coalesce(to_jsonb(p.specialty_interests),'[]'::jsonb),'avatarObject',p.avatar_object,'version',coalesce(p.version,0))
 from (select 1) seed left join msrc_participant.profile_details p on p.actor_id=target_actor;
$$;
create function msrc_participant.profile_specialties(edition text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select coalesce((select s.configuration->'specialties' from msrc_abstracts.settings s where s.edition_key=edition),'[]'::jsonb);
$$;
create function msrc_participant.profile_expired(edition text) returns boolean
 language sql stable security definer set search_path='' as $$
 select coalesce((select max(d)::timestamp at time zone 'Asia/Riyadh' from msrc_registration.settings s,
 unnest(s.conference_days) d where s.edition_key=edition)+interval '1 year'<=statement_timestamp(),false);
$$;
create function msrc_participant.profile_authorize(edition text,claims jsonb) returns boolean
 language plpgsql security definer set search_path='' as $$begin
 perform msrc_registration.server_only();
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception using errcode='25001',message='READ COMMITTED required.';end if;
 if not msrc_registration.bind_claims(claims) then return false;end if;
 -- Serializes creation, replacement, removal and retries for this participant.
 perform pg_advisory_xact_lock(hashtextextended('participant-profile:'||auth.uid()::text,0));
 return msrc_registration.participant_current(edition) and not msrc_participant.profile_expired(edition);
end$$;

create function public.msrc_participant_profile_read(edition_key text,session_claims jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
begin
 perform msrc_registration.server_only();
 begin
  if not msrc_participant.profile_authorize(edition_key,session_claims) then result:=jsonb_build_object('state','denied');
  else result:=jsonb_build_object('state','ready','profile',msrc_participant.profile_projection(auth.uid()),'specialties',msrc_participant.profile_specialties(edition_key),'sessionDeadline',msrc_participant.observe_profile(edition_key)#>>'{session,timing,absoluteExpiresAt}');end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function public.msrc_participant_profile_avatar_reserve(edition_key text,session_claims jsonb,object_name text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
begin
 perform msrc_registration.server_only();
 begin
  if not msrc_participant.profile_authorize(edition_key,session_claims) then result:=jsonb_build_object('state','denied');
  elsif object_name is null or object_name !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$' then result:=jsonb_build_object('state','invalid');
  elsif exists(select 1 from msrc_participant.avatar_objects a where a.object_name=msrc_participant_profile_avatar_reserve.object_name) then result:=jsonb_build_object('state','conflict');
  elsif (select count(*) from msrc_participant.avatar_objects a where a.actor_id=auth.uid() and a.state='staged' and a.expires_at>clock_timestamp())>=5 then result:=jsonb_build_object('state','denied');
  else
   insert into msrc_participant.avatar_objects(object_name,actor_id,edition_key,state) values(object_name,auth.uid(),edition_key,'staged');
   result:=jsonb_build_object('state','reserved');
  end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

-- A lost RPC response is not proof that save rolled back. Only an atomic
-- staged-to-delete transition authorizes eager removal of a failed upload.
create function public.msrc_participant_profile_avatar_abandon(edition_key text,session_claims jsonb,object_name text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;object_state text;
begin
 perform msrc_registration.server_only();
 begin
  if not msrc_participant.profile_authorize(edition_key,session_claims) then result:=jsonb_build_object('state','denied');
  else
   select a.state into object_state from msrc_participant.avatar_objects a
    where a.object_name=msrc_participant_profile_avatar_abandon.object_name and a.actor_id=auth.uid()
    and a.edition_key=msrc_participant_profile_avatar_abandon.edition_key for update;
   if object_state='active' then result:=jsonb_build_object('state','active');
   elsif object_state in('staged','delete') then
    update msrc_participant.avatar_objects a set state='delete',expires_at=clock_timestamp()
     where a.object_name=msrc_participant_profile_avatar_abandon.object_name and a.actor_id=auth.uid();
    result:=jsonb_build_object('state','queued');
   else result:=jsonb_build_object('state','denied');end if;
  end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function public.msrc_participant_profile_save(edition_key text,session_claims jsonb,institution text,student_status text,
 student_year integer,specialty_interests text[],expected_version integer,avatar_object text default null,remove_avatar boolean default false) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;current_profile msrc_participant.profile_details%rowtype;
 target uuid;next_avatar text;clean_institution text:=nullif(btrim(institution),'');
begin
 perform msrc_registration.server_only();
 begin
  if not msrc_participant.profile_authorize(edition_key,session_claims) then result:=jsonb_build_object('state','denied');
  else
   target:=auth.uid();
   select p.* into current_profile from msrc_participant.profile_details p where p.actor_id=target for update;
   if expected_version is null or expected_version<>coalesce(current_profile.version,0) then result:=jsonb_build_object('state','conflict');
   elsif char_length(clean_institution)>160 or clean_institution ~ '[[:cntrl:]]'
    or (student_status is not null and student_status not in('medical_student','intern','resident','faculty','other'))
    or (student_status='medical_student' and (student_year is null or student_year not between 1 and 6))
    or (student_status is distinct from 'medical_student' and student_year is not null)
    or specialty_interests is null or cardinality(specialty_interests)>5 or (cardinality(specialty_interests)>0 and (array_ndims(specialty_interests)<>1 or array_lower(specialty_interests,1)<>1)) or exists(select 1 from unnest(specialty_interests) v where v is null)
    or cardinality(specialty_interests)<>(select count(distinct v) from unnest(specialty_interests) v)
    or exists(select 1 from unnest(specialty_interests) v where not exists(select 1 from jsonb_array_elements(msrc_participant.profile_specialties(edition_key)) s where s->>'id'=v))
    or remove_avatar is null or (remove_avatar and avatar_object is not null)
    then result:=jsonb_build_object('state','invalid');
   elsif avatar_object is not null and not exists(select 1 from msrc_participant.avatar_objects a
    where a.object_name=msrc_participant_profile_save.avatar_object and a.actor_id=target and a.edition_key=msrc_participant_profile_save.edition_key
    and a.state='staged' and a.expires_at>clock_timestamp()) then result:=jsonb_build_object('state','invalid');
   else
    next_avatar:=case when remove_avatar then null else coalesce(avatar_object,current_profile.avatar_object) end;
    if current_profile.avatar_object is distinct from next_avatar then
     update msrc_participant.avatar_objects a set state='delete',expires_at=clock_timestamp()
      where a.object_name=current_profile.avatar_object and a.actor_id=target;
    end if;
    if avatar_object is not null then
     update msrc_participant.avatar_objects a set state='active' where a.object_name=avatar_object and a.actor_id=target and a.state='staged';
    end if;
    insert into msrc_participant.profile_details(actor_id,edition_key,institution,student_status,student_year,specialty_interests,avatar_object,version)
    values(target,edition_key,clean_institution,student_status,student_year,specialty_interests,next_avatar,coalesce(current_profile.version,0)+1)
    on conflict on constraint profile_details_pkey do update set institution=excluded.institution,student_status=excluded.student_status,
     student_year=excluded.student_year,specialty_interests=excluded.specialty_interests,avatar_object=excluded.avatar_object,
     version=excluded.version,updated_at=clock_timestamp();
    result:=jsonb_build_object('state','ready','profile',msrc_participant.profile_projection(target),'specialties',msrc_participant.profile_specialties(edition_key));
   end if;
  end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function public.msrc_participant_profile_avatar_register(edition_key text,session_claims jsonb,object_name text,expected_version integer) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare p jsonb;
begin
 p:=public.msrc_participant_profile_read(edition_key,session_claims);
 if p->>'state'<>'ready' then return p;end if;
 return public.msrc_participant_profile_save(edition_key,session_claims,p#>>'{profile,institution}',p#>>'{profile,studentStatus}',
 (p#>>'{profile,studentYear}')::integer,array(select jsonb_array_elements_text(p#>'{profile,specialtyInterests}')),expected_version,object_name,false);
end$$;
create function public.msrc_participant_profile_avatar_remove(edition_key text,session_claims jsonb,expected_version integer) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare p jsonb;
begin
 p:=public.msrc_participant_profile_read(edition_key,session_claims);
 if p->>'state'<>'ready' then return p;end if;
 return public.msrc_participant_profile_save(edition_key,session_claims,p#>>'{profile,institution}',p#>>'{profile,studentStatus}',
 (p#>>'{profile,studentYear}')::integer,array(select jsonb_array_elements_text(p#>'{profile,specialtyInterests}')),expected_version,null,true);
end$$;

create function msrc_participant.profile_erasure() returns trigger
 language plpgsql security definer set search_path='' as $$begin
 update msrc_participant.avatar_objects a set state='delete',expires_at=clock_timestamp() where a.actor_id=old.actor_id;
 return old;
end$$;
create trigger participant_profile_erasure before delete on msrc_participant.profile_details for each row execute function msrc_participant.profile_erasure();
-- Also covers staged uploads when an account has not yet saved scalar fields.
create trigger participant_profile_account_erasure before delete on msrc_participant.profiles for each row execute function msrc_participant.profile_erasure();

-- The exact reviewed CASCADE FK must not disable the existing fail-closed
-- erasure inventory. Keep every incumbent allowance and reject unrelated FKs.
do $$declare definition text;begin
 definition:=pg_get_functiondef('msrc_participant.unknown_erasure_reference()'::regprocedure);
 if strpos(definition,'''challenges'',''operations'',''session_receipts''')=0 then
  raise exception 'Participant erasure inventory changed; reconcile profile FK explicitly.';end if;
 definition:=replace(definition,'''challenges'',''operations'',''session_receipts''','''challenges'',''operations'',''session_receipts'',''profile_details''');
 execute definition;
end$$;

create function msrc_participant.profile_retention() returns integer
 language plpgsql security definer set search_path='' as $$
declare total integer:=0;erased integer;edition text;
begin
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception using errcode='25001',message='READ COMMITTED required.';end if;
 if not coalesce((select r.enabled from msrc_participant.retention_policy r where r.singleton),false) then return 0;end if;
 for edition in select p.edition_key from msrc_participant.profile_details p
  union select a.edition_key from msrc_participant.avatar_objects a where a.state<>'delete' order by edition_key loop
  -- Settings editors serialize on this row. Recheck conference end using a fresh
  -- statement after the lock; an extension committed while waiting must win.
  perform 1 from msrc_registration.settings s where s.edition_key=edition for share;
  if not msrc_participant.profile_expired(edition) then continue;end if;
  delete from msrc_participant.profile_details p where p.edition_key=edition;
  get diagnostics erased=row_count;total:=total+erased;
  update msrc_participant.avatar_objects a set state='delete',expires_at=clock_timestamp()
   where a.edition_key=edition and a.state<>'delete';
 end loop;
 update msrc_participant.avatar_objects a set state='delete',expires_at=clock_timestamp()
 where a.state='staged' and a.expires_at<=clock_timestamp();
 return total;
end$$;
create function public.msrc_participant_profile_cleanup(batch_size integer default 100) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare erased integer;objects jsonb;
begin
 perform msrc_registration.server_only();
 if batch_size is null or batch_size not between 1 and 1000 then return jsonb_build_object('state','invalid');end if;
 erased:=msrc_participant.profile_retention();
 -- Staging expiry and already-authorized removal are always drained; the
 -- retention switch gates only automatic retention-driven personal erasure.
 update msrc_participant.avatar_objects a set state='delete' where a.state='staged' and a.expires_at<=clock_timestamp();
 select coalesce(jsonb_agg(q.object_name),'[]'::jsonb) into objects from
 (select a.object_name from msrc_participant.avatar_objects a where a.state='delete' order by a.expires_at,a.object_name limit batch_size) q;
 return jsonb_build_object('state','ready','erased',erased,'objects',objects);
end$$;
create function public.msrc_participant_profile_avatar_deleted(object_name text) returns jsonb
 language plpgsql security definer set search_path='' as $$begin
 perform msrc_registration.server_only();
 delete from msrc_participant.avatar_objects a where a.object_name=msrc_participant_profile_avatar_deleted.object_name and a.state='delete';
 return jsonb_build_object('state','ready');
end$$;
create function public.msrc_participant_profile_avatar_deleted_many(object_names text[]) returns jsonb
 language plpgsql security definer set search_path='' as $$begin
 perform msrc_registration.server_only();
 if object_names is null or cardinality(object_names)>100 or (cardinality(object_names)>0 and array_ndims(object_names)<>1)
  or exists(select 1 from unnest(object_names) v where v is null or v !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.webp$') then
  return jsonb_build_object('state','invalid');end if;
 delete from msrc_participant.avatar_objects a where a.object_name=any(object_names) and a.state='delete';
 return jsonb_build_object('state','ready');
end$$;

-- Extend the existing audited detail RPC without changing its identity, grants,
-- authorization checks, masked identity or the rest of its projection.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.msrc_staff_participant_detail(text,uuid)'::regprocedure);
 definition:=replace(definition,'''actorId'',p.actor_id,''name'',p.name,''email'',u.email,',
 '''actorId'',p.actor_id,''name'',p.name,''email'',u.email,''optionalProfile'',msrc_participant.profile_projection(p.actor_id)||jsonb_build_object(''specialties'',msrc_participant.profile_specialties(edition_key)),');
 if strpos(definition,'''optionalProfile'',msrc_participant.profile_projection(p.actor_id)')=0 then raise exception 'Staff participant detail changed; reconcile profile projection.';end if;
 execute definition;
end$$;

-- Existing disabled scheduler gains the profile retention pass. Storage bytes
-- are removed by the server worker through the Storage API, then acknowledged.
do $$declare definition text;begin
 definition:=pg_get_functiondef('msrc_participant.run_cleanup_job()'::regprocedure);
 definition:=replace(definition,'result:=msrc_participant.cleanup_unverified(settings.cleanup_batch_size,false);',
 'perform msrc_participant.profile_retention(); result:=msrc_participant.cleanup_unverified(settings.cleanup_batch_size,false);');
 if strpos(definition,'perform msrc_participant.profile_retention()')=0 then raise exception 'Participant cleanup job changed; reconcile profile retention.';end if;
 execute definition;
end$$;

revoke all on function msrc_participant.profile_projection(uuid),msrc_participant.profile_specialties(text),msrc_participant.profile_expired(text),
 msrc_participant.profile_authorize(text,jsonb),msrc_participant.profile_erasure(),msrc_participant.profile_retention()
 from public,anon,authenticated,service_role,supabase_auth_admin;
revoke all on function public.msrc_participant_profile_read(text,jsonb),public.msrc_participant_profile_save(text,jsonb,text,text,integer,text[],integer,text,boolean),
 public.msrc_participant_profile_avatar_reserve(text,jsonb,text),public.msrc_participant_profile_avatar_register(text,jsonb,text,integer),
 public.msrc_participant_profile_avatar_remove(text,jsonb,integer),public.msrc_participant_profile_avatar_abandon(text,jsonb,text),
 public.msrc_participant_profile_cleanup(integer),public.msrc_participant_profile_avatar_deleted(text),public.msrc_participant_profile_avatar_deleted_many(text[])
 from public,anon,authenticated,service_role;
grant execute on function public.msrc_participant_profile_read(text,jsonb),public.msrc_participant_profile_save(text,jsonb,text,text,integer,text[],integer,text,boolean),
 public.msrc_participant_profile_avatar_reserve(text,jsonb,text),public.msrc_participant_profile_avatar_register(text,jsonb,text,integer),
 public.msrc_participant_profile_avatar_remove(text,jsonb,integer),public.msrc_participant_profile_avatar_abandon(text,jsonb,text),
 public.msrc_participant_profile_cleanup(integer),public.msrc_participant_profile_avatar_deleted(text),public.msrc_participant_profile_avatar_deleted_many(text[])
 to service_role;
notify pgrst,'reload schema';
commit;
