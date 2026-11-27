-- AUTH-07, ABS-01/12, HAC-01/10, TMT-01 and LOC-01/03.
begin;

-- Professional status completes the profile status field. The research
-- presenter and competition eligibility functions retain their existing rules.
alter table msrc_participant.profile_details
 drop constraint participant_profile_status,
 add constraint participant_profile_status check(student_status in('year_1','year_2','year_3','year_4','year_5','year_6','internship','clinical_placement','postgraduate','residency','faculty','consultant','specialist'));

create or replace function msrc_participant.profile_projection(target_actor uuid) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('institution',p.institution_other,'institutionId',p.institution_id,'institutionOther',p.institution_other,
 'studentStatus',p.student_status,'studentYear',null,'status',p.student_status,'professionalStatusesAvailable',true,
 'arabicName',p.arabic_name,'latinName',p.latin_name,'nationality',p.nationality,'gender',p.gender,'dateOfBirth',p.date_of_birth,
 'city',p.city,'phone',p.phone,'identityType',p.identity_type,'identityLast4',p.identity_last4,
 'specialtyInterests',coalesce(to_jsonb(p.specialty_interests),'[]'::jsonb),'avatarObject',p.avatar_object,'version',coalesce(p.version,0))
 from (select 1) seed left join msrc_participant.profile_details p on p.actor_id=target_actor;
$$;

create or replace function public.msrc_participant_profile_save(edition_key text,session_claims jsonb,profile_input jsonb,
 expected_version integer,avatar_object text default null,remove_avatar boolean default false) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;current_profile msrc_participant.profile_details%rowtype;
 target uuid;next_avatar text;k text;value text;birthday date;interests text[];identity_data jsonb;remove_identity boolean;
begin
 perform msrc_registration.server_only();
 begin
  if not msrc_participant.profile_authorize(edition_key,session_claims) then result:=jsonb_build_object('state','denied');
  else
   target:=auth.uid();
   select p.* into current_profile from msrc_participant.profile_details p where p.actor_id=target for update;
   if expected_version is null or expected_version<>coalesce(current_profile.version,0) then result:=jsonb_build_object('state','conflict');
   elsif jsonb_typeof(profile_input) is distinct from 'object' or octet_length(profile_input::text)>16384
    or remove_avatar is null or (remove_avatar and avatar_object is not null)
    or exists(select 1 from jsonb_object_keys(profile_input) field where field<>all(array['institutionId','institutionOther','status','arabicName','latinName','nationality','gender','dateOfBirth','city','phone','interests','identity','removeIdentity'])) then result:=jsonb_build_object('state','invalid');
   else
    begin
     -- All scalar values may be omitted/null for a partial save; supplied values
     -- remain fully validated. Raw identity numbers are not a permitted key.
     foreach k in array array['institutionId','institutionOther','status','arabicName','latinName','nationality','gender','dateOfBirth','city','phone'] loop
      -- Older clients and avatar-only RPCs omit the new key. Only an explicit
      -- Latin spelling or null changes it under the existing version guard.
      if k='latinName' and not profile_input?k then continue;end if;
      if profile_input?k and jsonb_typeof(profile_input->k) not in('null','string') then raise check_violation;end if;
      value:=nullif(btrim(profile_input->>k),'');
      if value ~ '[[:cntrl:]]' or char_length(value)>(case when k='city' then 80 else 160 end) then raise check_violation;end if;
      profile_input:=jsonb_set(profile_input,array[k],coalesce(to_jsonb(value),'null'::jsonb));
     end loop;
     if (profile_input->>'institutionId') is not null and (profile_input->>'institutionOther') is not null then raise check_violation;end if;
     if (profile_input->>'institutionId') is not null and not msrc_participant.profile_institution_valid(profile_input->>'institutionId') then raise check_violation;end if;
     if (profile_input->>'arabicName') is not null and ((profile_input->>'arabicName') !~ '[ء-يٮ-ۓ]' or (profile_input->>'arabicName') ~ '[A-Za-z]') then raise check_violation;end if;
     if (profile_input->>'latinName') is not null and not msrc_participant.profile_latin_name_valid(profile_input->>'latinName') then raise check_violation;end if;
     if (profile_input->>'status') is not null and (profile_input->>'status') not in('year_1','year_2','year_3','year_4','year_5','year_6','internship','clinical_placement','postgraduate','residency','faculty','consultant','specialist') then raise check_violation;end if;
     if (profile_input->>'nationality') is not null and not msrc_participant.profile_country_valid(profile_input->>'nationality') then raise check_violation;end if;
     if (profile_input->>'gender') is not null and (profile_input->>'gender') not in('male','female') then raise check_violation;end if;
     if (profile_input->>'phone') is not null and (profile_input->>'phone') !~ '^\+[1-9][0-9]{1,14}$' then raise check_violation;end if;
     if (profile_input->>'dateOfBirth') is not null then
      if (profile_input->>'dateOfBirth') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise check_violation;end if;
      birthday:=(profile_input->>'dateOfBirth')::date;
      if not isfinite(birthday) or birthday>(statement_timestamp() at time zone 'UTC')::date-interval '18 years' then raise check_violation;end if;
     end if;
     if jsonb_typeof(profile_input->'interests') is distinct from 'array' or jsonb_array_length(profile_input->'interests')>5
      or exists(select 1 from jsonb_array_elements(profile_input->'interests') interest where jsonb_typeof(interest)<>'string') then raise check_violation;end if;
     interests:=array(select jsonb_array_elements_text(profile_input->'interests'));
     if cardinality(interests)<>(select count(distinct interest) from unnest(interests) interest)
      or exists(select 1 from unnest(interests) interest where not exists(select 1 from jsonb_array_elements(msrc_participant.profile_specialties(edition_key)) specialty where specialty->>'id'=interest)) then raise check_violation;end if;
     if profile_input?'removeIdentity' and jsonb_typeof(profile_input->'removeIdentity')<>'boolean' then raise check_violation;end if;
     remove_identity:=coalesce((profile_input->>'removeIdentity')::boolean,false);
     identity_data:=nullif(profile_input->'identity','null'::jsonb);
     if identity_data is not null then
      if remove_identity or jsonb_typeof(identity_data)<>'object'
       or identity_data<>jsonb_build_object('type',identity_data->'type','envelope',identity_data->'envelope','lookup',identity_data->'lookup','last4',identity_data->'last4')
       or exists(select 1 from jsonb_each(identity_data) pair where jsonb_typeof(pair.value)<>'string')
       or (identity_data->>'type') not in('national_id','iqama','passport')
       or (identity_data->>'envelope') !~ '^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_+/=-]+:[A-Za-z0-9_+/=-]+:[A-Za-z0-9_+/=-]+$'
       or char_length(identity_data->>'envelope') not between 32 and 2048
       or (identity_data->>'lookup') !~ '^[a-f0-9]{64}$' or (identity_data->>'last4') !~ '^[A-Z0-9]{4}$' then raise check_violation;end if;
     end if;
     if avatar_object is not null and not exists(select 1 from msrc_participant.avatar_objects a
      where a.object_name=msrc_participant_profile_save.avatar_object and a.actor_id=target and a.edition_key=msrc_participant_profile_save.edition_key
      and a.state='staged' and a.expires_at>clock_timestamp()) then raise check_violation;end if;
     next_avatar:=case when remove_avatar then null else coalesce(avatar_object,current_profile.avatar_object) end;
     if current_profile.avatar_object is distinct from next_avatar then
      update msrc_participant.avatar_objects a set state='delete',expires_at=clock_timestamp() where a.object_name=current_profile.avatar_object and a.actor_id=target;
     end if;
     if avatar_object is not null then update msrc_participant.avatar_objects a set state='active' where a.object_name=avatar_object and a.actor_id=target and a.state='staged';end if;
     insert into msrc_participant.profile_details(actor_id,edition_key,institution_id,institution_other,student_status,arabic_name,latin_name,nationality,gender,date_of_birth,city,phone,
      specialty_interests,avatar_object,version,identity_type,identity_envelope,identity_lookup,identity_last4)
     values(target,edition_key,profile_input->>'institutionId',profile_input->>'institutionOther',profile_input->>'status',profile_input->>'arabicName',
      case when profile_input?'latinName' then profile_input->>'latinName' else current_profile.latin_name end,
      profile_input->>'nationality',profile_input->>'gender',birthday,profile_input->>'city',profile_input->>'phone',interests,next_avatar,coalesce(current_profile.version,0)+1,
      case when remove_identity then null else coalesce(identity_data->>'type',current_profile.identity_type) end,
      case when remove_identity then null else coalesce(identity_data->>'envelope',current_profile.identity_envelope) end,
      case when remove_identity then null else coalesce(identity_data->>'lookup',current_profile.identity_lookup) end,
      case when remove_identity then null else coalesce(identity_data->>'last4',current_profile.identity_last4) end)
     on conflict on constraint profile_details_pkey do update set
      institution_id=excluded.institution_id,institution_other=excluded.institution_other,student_status=excluded.student_status,arabic_name=excluded.arabic_name,latin_name=excluded.latin_name,
      nationality=excluded.nationality,gender=excluded.gender,date_of_birth=excluded.date_of_birth,city=excluded.city,phone=excluded.phone,
      specialty_interests=excluded.specialty_interests,avatar_object=excluded.avatar_object,version=excluded.version,updated_at=clock_timestamp(),
      identity_type=excluded.identity_type,identity_envelope=excluded.identity_envelope,identity_lookup=excluded.identity_lookup,identity_last4=excluded.identity_last4;
     result:=jsonb_build_object('state','ready','profile',msrc_participant.profile_projection(target),'specialties',msrc_participant.profile_specialties(edition_key));
    exception when check_violation or invalid_datetime_format or datetime_field_overflow or invalid_text_representation then result:=jsonb_build_object('state','invalid');
     when unique_violation then result:=jsonb_build_object('state','conflict');end;
   end if;
  end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

notify pgrst,'reload schema';
commit;
