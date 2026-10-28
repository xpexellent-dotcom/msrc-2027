-- ENG-087 / ORG-067. AUTH-05/06/07/08, ABS-01, HAC-01/03/10,
-- TMT-01, PRV-02/03/04/05/06, SEC-01/02/06, LOC-01/03, ACC-01.
-- Review only. No hosted apply, policy-version setting, activation or mail.
begin;

alter table msrc_participant.profile_details
 add column institution_id text check(institution_id is null or institution_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 add column institution_other text check(institution_other is null or (institution_other=btrim(institution_other) and char_length(institution_other) between 1 and 160 and institution_other !~ '[[:cntrl:]]')),
 add column arabic_name text check(arabic_name is null or (arabic_name=btrim(arabic_name) and char_length(arabic_name) between 1 and 160 and arabic_name !~ '[[:cntrl:]]' and arabic_name ~ '[ء-يٮ-ۓ]' and arabic_name !~ '[A-Za-z]')),
 add column nationality text check(nationality is null or nationality ~ '^[A-Z]{2}$'),
 add column gender text check(gender in('male','female')),
 add column date_of_birth date check(date_of_birth is null or isfinite(date_of_birth)),
 add column city text check(city is null or (city=btrim(city) and char_length(city) between 1 and 80 and city !~ '[[:cntrl:]]')),
 add column phone text check(phone is null or phone ~ '^\+[1-9][0-9]{1,14}$'),
 add column identity_type text check(identity_type in('national_id','iqama','passport')),
 add column identity_envelope text,
 add column identity_lookup text,
 add column identity_last4 text,
 add constraint profile_institution_choice check(institution_id is null or institution_other is null),
 add constraint profile_identity_complete check(
  (identity_type is null and identity_envelope is null and identity_lookup is null and identity_last4 is null)
  or (identity_type is not null and identity_envelope is not null and identity_lookup is not null and identity_last4 is not null
   and char_length(identity_envelope) between 32 and 2048 and identity_envelope ~ '^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_+/=-]+:[A-Za-z0-9_+/=-]+:[A-Za-z0-9_+/=-]+$'
   and identity_lookup ~ '^[a-f0-9]{64}$' and identity_last4 ~ '^[A-Z0-9]{4}$'));

-- Remove only the legacy status/year checks; preserve all unrelated constraints.
do $$declare constraint_name text;begin
 for constraint_name in select c.conname from pg_constraint c
 where c.conrelid='msrc_participant.profile_details'::regclass and c.contype='c'
 and (pg_get_constraintdef(c.oid) like '%student_status%' or pg_get_constraintdef(c.oid) like '%student_year%') loop
  execute format('alter table msrc_participant.profile_details drop constraint %I',constraint_name);
 end loop;
end$$;
update msrc_participant.profile_details set institution_other=institution,
 student_status=case when student_status='medical_student' and student_year between 1 and 6 then 'year_'||student_year::text
  when student_status='intern' then 'internship' when student_status='resident' then 'residency'
  when student_status='faculty' then 'faculty' else null end,
 student_year=null;
alter table msrc_participant.profile_details add constraint participant_profile_status
 check(student_status in('year_1','year_2','year_3','year_4','year_5','year_6','internship','clinical_placement','postgraduate','residency','faculty'));
create unique index participant_profile_identity_lookup on msrc_participant.profile_details(edition_key,identity_lookup) where identity_lookup is not null;
comment on table msrc_participant.profile_details is 'ORG-067: private participant profile; partially savable, complete before abstract/hackathon/3MT submission. Existing account erasure cascade and conference-end-plus-one-year retention cover all columns.';
comment on column msrc_participant.profile_details.phone is 'ORG-067 contact data only. Never authentication, verification, SMS, WhatsApp, or a public directory.';
comment on column msrc_participant.profile_details.identity_envelope is 'Server AES-256-GCM envelope using REGISTRATION_IDENTITY_* keys; no plaintext identity number is accepted, projected, logged or exported by profile RPCs.';
comment on column msrc_participant.profile_details.identity_lookup is 'Server HMAC-SHA256 for identity uniqueness/lookup; never returned in participant or staff projections.';

create or replace function msrc_participant.profile_projection(target_actor uuid) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('institution',p.institution_other,'institutionId',p.institution_id,'institutionOther',p.institution_other,
 'studentStatus',p.student_status,'studentYear',null,'status',p.student_status,
 'arabicName',p.arabic_name,'nationality',p.nationality,'gender',p.gender,'dateOfBirth',p.date_of_birth,
 'city',p.city,'phone',p.phone,'identityType',p.identity_type,'identityLast4',p.identity_last4,
 'specialtyInterests',coalesce(to_jsonb(p.specialty_interests),'[]'::jsonb),'avatarObject',p.avatar_object,'version',coalesce(p.version,0))
 from (select 1) seed left join msrc_participant.profile_details p on p.actor_id=target_actor;
$$;
alter table msrc_participant.profile_details drop column institution,drop column student_year;

-- Mirrors the Ministry-backed content list (accessed 2026-10-28).
create function msrc_participant.profile_institution_valid(institution text) returns boolean
 language sql immutable security invoker set search_path='' as $$
 select institution=any(array['umm-al-qura','islamic-university-madinah','imam-muhammad-bin-saud','king-saud','king-abdulaziz','king-fahd-petroleum-minerals','king-faisal','king-khalid','qassim','taibah','taif','hail','jazan','jouf','al-baha','tabuk','najran','northern-border','princess-nourah','king-saud-health-sciences','imam-abdulrahman-bin-faisal','prince-sattam','shaqra','majmaah','saudi-electronic','jeddah','bisha','king-abdullah-science-technology','hafr-al-batin','arab-open','business-technology','prince-sultan','fahad-bin-sultan','prince-mohammad-bin-fahd','prince-mugrin','alfaisal','al-yamamah','dar-al-uloom','effat','dar-al-hekma','riyadh-elm','al-maarefa','mustaqbal','sulaiman-al-rajhi','ibn-sina','batterjee-medical','al-riyada-health','al-rayan','inaya-medical','al-ghad-medical','vision-jeddah','vision-riyadh','buraydah-colleges','saad-nursing-health','fakeeh-medical','mohammed-al-mana-medical','northern-nursing','almoosa-health']);
$$;
create function msrc_participant.profile_country_valid(country text) returns boolean
 language sql immutable security invoker set search_path='' as $$
 select country=any(string_to_array('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW',' '));
$$;
create function msrc_participant.profile_complete(actor uuid,edition text) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from msrc_participant.profile_details p where p.actor_id=actor and p.edition_key=edition
  and not msrc_participant.profile_expired(edition)
  and p.avatar_object is not null and exists(select 1 from msrc_participant.avatar_objects a where a.object_name=p.avatar_object and a.actor_id=actor and a.edition_key=edition and a.state='active')
  and (msrc_participant.profile_institution_valid(p.institution_id) or p.institution_other is not null) and p.student_status is not null
  and p.arabic_name is not null and p.arabic_name ~ '[ء-يٮ-ۓ]' and p.arabic_name !~ '[A-Za-z]' and msrc_participant.profile_country_valid(p.nationality) and p.gender is not null
  and p.date_of_birth is not null and p.date_of_birth<=(statement_timestamp() at time zone 'UTC')::date-interval '18 years'
  and p.city is not null and p.phone is not null and p.identity_type is not null and p.identity_envelope is not null
  and (jsonb_array_length(msrc_participant.profile_specialties(edition))=0
   or exists(select 1 from unnest(p.specialty_interests) interest join jsonb_array_elements(msrc_participant.profile_specialties(edition)) specialty on specialty->>'id'=interest)));
$$;
-- Same lock as partial saves, followed by fresh READ COMMITTED statements. A
-- removal committed while submit waits must be observed before any snapshot.
create function msrc_participant.profile_submission_gate(actor uuid,edition text) returns boolean
 language plpgsql security definer set search_path='' as $$begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='READ COMMITTED required.';end if;
 -- Abstract finalization already owns this settings row. Every other
 -- submission must acquire it BEFORE the profile lock to avoid a cross-type
 -- cycle with an abstract finalization for the same participant.
 perform 1 from msrc_abstracts.settings s where s.edition_key=edition for share;
 perform pg_advisory_xact_lock(hashtextextended('participant-profile:'||actor::text,0));
 perform 1 from msrc_participant.profile_details p where p.actor_id=actor and p.edition_key=edition for share;
 return msrc_participant.profile_complete(actor,edition);
end$$;
create function public.msrc_participant_profile_complete(edition_key text,session_claims jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
begin
 perform msrc_registration.server_only();
 begin
  if not msrc_participant.profile_authorize(edition_key,session_claims) then result:=jsonb_build_object('state','denied');
  else result:=jsonb_build_object('state','ready','complete',msrc_participant.profile_complete(auth.uid(),edition_key));end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function public.msrc_participant_profile_save(edition_key text,session_claims jsonb,profile_input jsonb,
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
    or exists(select 1 from jsonb_object_keys(profile_input) field where field<>all(array['institutionId','institutionOther','status','arabicName','nationality','gender','dateOfBirth','city','phone','interests','identity','removeIdentity'])) then result:=jsonb_build_object('state','invalid');
   else
    begin
     -- All scalar values may be omitted/null for a partial save; supplied values
     -- remain fully validated. Raw identity numbers are not a permitted key.
     foreach k in array array['institutionId','institutionOther','status','arabicName','nationality','gender','dateOfBirth','city','phone'] loop
      if profile_input?k and jsonb_typeof(profile_input->k) not in('null','string') then raise check_violation;end if;
      value:=nullif(btrim(profile_input->>k),'');
      if value ~ '[[:cntrl:]]' or char_length(value)>(case when k='city' then 80 else 160 end) then raise check_violation;end if;
      profile_input:=jsonb_set(profile_input,array[k],coalesce(to_jsonb(value),'null'::jsonb));
     end loop;
     if (profile_input->>'institutionId') is not null and (profile_input->>'institutionOther') is not null then raise check_violation;end if;
     if (profile_input->>'institutionId') is not null and not msrc_participant.profile_institution_valid(profile_input->>'institutionId') then raise check_violation;end if;
     if (profile_input->>'arabicName') is not null and ((profile_input->>'arabicName') !~ '[ء-يٮ-ۓ]' or (profile_input->>'arabicName') ~ '[A-Za-z]') then raise check_violation;end if;
     if (profile_input->>'status') is not null and (profile_input->>'status') not in('year_1','year_2','year_3','year_4','year_5','year_6','internship','clinical_placement','postgraduate','residency','faculty') then raise check_violation;end if;
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
     insert into msrc_participant.profile_details(actor_id,edition_key,institution_id,institution_other,student_status,arabic_name,nationality,gender,date_of_birth,city,phone,
      specialty_interests,avatar_object,version,identity_type,identity_envelope,identity_lookup,identity_last4)
     values(target,edition_key,profile_input->>'institutionId',profile_input->>'institutionOther',profile_input->>'status',profile_input->>'arabicName',
      profile_input->>'nationality',profile_input->>'gender',birthday,profile_input->>'city',profile_input->>'phone',interests,next_avatar,coalesce(current_profile.version,0)+1,
      case when remove_identity then null else coalesce(identity_data->>'type',current_profile.identity_type) end,
      case when remove_identity then null else coalesce(identity_data->>'envelope',current_profile.identity_envelope) end,
      case when remove_identity then null else coalesce(identity_data->>'lookup',current_profile.identity_lookup) end,
      case when remove_identity then null else coalesce(identity_data->>'last4',current_profile.identity_last4) end)
     on conflict on constraint profile_details_pkey do update set
      institution_id=excluded.institution_id,institution_other=excluded.institution_other,student_status=excluded.student_status,arabic_name=excluded.arabic_name,
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

-- Avatar-only changes preserve all scalars and the protected stored identity.
create function msrc_participant.profile_save_input(profile jsonb) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('institutionId',profile->'institutionId','institutionOther',profile->'institutionOther','status',profile->'studentStatus',
 'arabicName',profile->'arabicName','nationality',profile->'nationality','gender',profile->'gender','dateOfBirth',profile->'dateOfBirth',
 'city',profile->'city','phone',profile->'phone','interests',profile->'specialtyInterests','identity',null,'removeIdentity',false);
$$;
create or replace function public.msrc_participant_profile_avatar_register(edition_key text,session_claims jsonb,object_name text,expected_version integer) returns jsonb
 language plpgsql security definer set search_path='' as $$declare p jsonb;begin
 p:=public.msrc_participant_profile_read(edition_key,session_claims);
 if p->>'state'<>'ready' then return p;end if;
 return public.msrc_participant_profile_save(edition_key,session_claims,msrc_participant.profile_save_input(p->'profile'),expected_version,object_name,false);
end$$;
create or replace function public.msrc_participant_profile_avatar_remove(edition_key text,session_claims jsonb,expected_version integer) returns jsonb
 language plpgsql security definer set search_path='' as $$declare p jsonb;begin
 p:=public.msrc_participant_profile_read(edition_key,session_claims);
 if p->>'state'<>'ready' then return p;end if;
 return public.msrc_participant_profile_save(edition_key,session_claims,msrc_participant.profile_save_input(p->'profile'),expected_version,null,true);
end$$;
drop function public.msrc_participant_profile_save(text,jsonb,text,text,integer,text[],integer,text,boolean);

-- Patch only the submission branches, retaining authorization, ownership,
-- idempotency receipts, windows, evidence gates and immutable snapshot behavior.
do $$declare definition text;needle text;begin
 definition:=pg_get_functiondef('msrc_abstracts.participant(text,text,uuid,integer,jsonb,uuid)'::regprocedure);
 needle:='elsif action=''finalize'' then';
 if strpos(definition,needle)=0 then raise exception 'Abstract submission branch changed; reconcile ENG-087 gate.';end if;
 definition:=replace(definition,needle,needle||E'\n if not msrc_participant.profile_submission_gate(auth.uid(),edition) then return jsonb_build_object(''state'',''profile_incomplete'');end if;');
 execute definition;
 definition:=pg_get_functiondef('msrc_competitions.participant(text,text,text,uuid,integer,jsonb,uuid)'::regprocedure);
 needle:='if competition=''hackathon'' and action=''submit'' then';
 if strpos(definition,needle)=0 then raise exception 'Competition submission branch changed; reconcile ENG-087 gate.';end if;
 definition:=replace(definition,needle,E'if action=''submit'' and not msrc_participant.profile_submission_gate(auth.uid(),edition) then return jsonb_build_object(''state'',''profile_incomplete'');end if;\n '||needle);
 execute definition;
end$$;

-- No new table/FK: the reviewed profile_details cascade inventory and existing
-- profile_retention/run_cleanup_job path erase every new personal column, the
-- envelope and HMAC together. Staff detail already calls profile_projection
-- only inside its existing authorized participants_read audit boundary.
revoke all on function msrc_participant.profile_institution_valid(text),msrc_participant.profile_country_valid(text),msrc_participant.profile_complete(uuid,text),
 msrc_participant.profile_submission_gate(uuid,text),msrc_participant.profile_save_input(jsonb)
 from public,anon,authenticated,service_role,supabase_auth_admin;
revoke all on function public.msrc_participant_profile_complete(text,jsonb),public.msrc_participant_profile_save(text,jsonb,jsonb,integer,text,boolean)
 from public,anon,authenticated,service_role;
grant execute on function public.msrc_participant_profile_complete(text,jsonb),public.msrc_participant_profile_save(text,jsonb,jsonb,integer,text,boolean) to service_role;
notify pgrst,'reload schema';
commit;
