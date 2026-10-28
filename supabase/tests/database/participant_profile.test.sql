-- ENG-086/087 / ORG-066/067. Disposable synthetic data, rollback only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok((select bool_and(c.relrowsecurity and c.relforcerowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_participant' and c.relname in('profile_details','avatar_objects')),'Both private profile tables force RLS');
select is((select count(*) from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_participant' and c.relname in('profile_details','avatar_objects')),0::bigint,'Private profile tables have no client policies');
select ok(not has_table_privilege('authenticated','msrc_participant.profile_details','SELECT')
 and not has_table_privilege('service_role','msrc_participant.profile_details','UPDATE'),'No direct client or service table grants');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname like 'msrc_participant_profile_%'
 and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE')
 or not has_function_privilege('service_role',p.oid,'EXECUTE'))),'All profile RPCs are server-only');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where
 (n.nspname='public' and p.proname like 'msrc_participant_profile_%' or n.nspname='msrc_participant' and p.proname like 'profile_%')
 and not coalesce(p.proconfig @> array['search_path=""'],false)),'Profile functions pin an empty search path');
select ok(not msrc_participant.unknown_erasure_reference(),'Reviewed profile FK preserves existing cleanup inventory');
create function pg_temp.profile_storage_assertions() returns setof text language plpgsql as $$
declare private_bucket boolean;
begin
 if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
  return query select skip('Storage absent in minimal disposable native-Auth stack; full Storage checks need a Storage-enabled stack',2);return;
 end if;
 execute $sql$select not b.public and b.file_size_limit=2097152 and b.allowed_mime_types=array['image/webp']
 from storage.buckets b where b.id='participant-avatars'$sql$ into private_bucket;
 return next ok(coalesce(private_bucket,false),'Avatar bucket is private and stores only bounded re-encoded WebP');
 return next is((select count(*) from pg_policy p where p.polrelid=to_regclass('storage.objects') and not p.polpermissive
  and p.polname in('participant_avatar_no_client_read','participant_avatar_no_client_insert','participant_avatar_no_client_update','participant_avatar_no_client_delete')),
  4::bigint,'Restrictive Storage policies deny all direct client operations even if unrelated broad policies exist');
end$$;
select * from pg_temp.profile_storage_assertions();

-- Concise scalar/invalid-input fixtures; production saves use the v2 JSON contract.
create function pg_temp.profile_save(edition text,claims jsonb,institution text,status text,retired_year integer,interests text[],version integer,avatar text default null,remove_avatar boolean default false) returns jsonb
 language sql as $$
 select public.msrc_participant_profile_save(edition,claims,jsonb_build_object('institutionOther',institution,'status',status,'interests',to_jsonb(interests))
  ||case when retired_year is null then '{}'::jsonb else jsonb_build_object('year',retired_year) end,version,avatar,remove_avatar);$$;


update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-profile');
insert into msrc_abstracts.settings(edition_key,version,configuration) values('synthetic-profile',1,
 '{"specialties":[{"id":"synthetic-a","label":"Synthetic specialty A"},{"id":"synthetic-b","label":"Synthetic specialty B"},{"id":"synthetic-c","label":"Synthetic specialty C"},{"id":"synthetic-d","label":"Synthetic specialty D"},{"id":"synthetic-e","label":"Synthetic specialty E"},{"id":"synthetic-f","label":"Synthetic specialty F"}]}'::jsonb);
select pg_temp.registration_fixture(8601,'synthetic-profile');
select pg_temp.registration_fixture(8602,'synthetic-profile');
select pg_temp.registration_fixture(8603,'synthetic-profile',false);
select pg_temp.registration_staff_fixture(8691,'synthetic-profile');
select pg_temp.registration_staff_fixture(8692,'synthetic-profile','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(8693,'synthetic-profile','checkInStaff');

select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))->>'state','ready','Verified admitted participant can read their own profile');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))#>>'{profile,version}','0','Empty profile starts at version zero');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))#>'{profile,specialtyInterests}','[]'::jsonb,'Empty interests are an array');
select is(jsonb_array_length(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))->'specialties'),6,'Uses configured abstract specialties even while abstracts are disabled');
select ok((public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))->>'sessionDeadline')::timestamptz>statement_timestamp(),'Read includes enforced session deadline');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8603))->>'state','denied','Unverified participants cannot read optional profiles');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8691))->>'state','denied','Staff cannot impersonate participants through server RPC');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601)||jsonb_build_object('session_id',pg_temp.registration_session(8602)))->>'state','denied','Another participant session cannot authorize the actor');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601)||'{"exp":0}'::jsonb)->>'state','denied','Expired token claims fail closed');

set local role authenticated;
select throws_ok($$select public.msrc_participant_profile_read('synthetic-profile','{}'::jsonb)$$,'42501',null,'Direct client profile RPC is denied');
reset role;
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),'  Synthetic University  ','year_3',null,array['synthetic-a','synthetic-b'],0)->>'state','ready','Saves all optional scalar fields');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))#>>'{profile,institution}','Synthetic University','Institution is trimmed');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8602))#>>'{profile,institution}',null,'Second participant reads only their own empty data');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),'stale',null,null,'{}'::text[],0)->>'state','conflict','Stale concurrent save cannot overwrite committed values');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))#>>'{profile,institution}','Synthetic University','Conflict leaves the saved profile intact');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),repeat('x',161),'internship',null,'{}'::text[],1)->>'state','invalid','Institution length is enforced by SQL');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),E'bad\ntext','internship',null,'{}'::text[],1)->>'state','invalid','Institution control characters are rejected');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,'unknown',null,'{}'::text[],1)->>'state','invalid','Status enum is enforced');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,'medical_student',null,'{}'::text[],1)->>'state','invalid','Retired medical_student enum is rejected');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,'medical_student',7,'{}'::text[],1)->>'state','invalid','Retired status/year input is rejected');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,'internship',1,'{}'::text[],1)->>'state','invalid','Retired year field is rejected');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,null,1,'{}'::text[],1)->>'state','invalid','Retired year field cannot accompany omitted status');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,null,null,array['invented'],1)->>'state','invalid','Interests must come from the existing configured specialty list');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,null,null,array['synthetic-a','synthetic-a'],1)->>'state','invalid','Duplicate interests cannot inflate progress');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,null,null,array['synthetic-a','synthetic-b','synthetic-c','synthetic-d','synthetic-e','synthetic-f'],1)->>'state','invalid','At most five interests');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,null,null,array[null::text],1)->>'state','invalid','Null interest values are invalid');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),null,null,null,array[['synthetic-a','synthetic-b']],1)->>'state','invalid','Interests must be a one-dimensional list');

-- Durable reservation precedes bytes; only this participant can attach it.
select is(public.msrc_participant_profile_avatar_reserve('synthetic-profile',pg_temp.registration_claims(8601),'../unsafe.webp')->>'state','invalid','Avatar object path cannot escape the private registry');
select is(public.msrc_participant_profile_avatar_reserve('synthetic-profile',pg_temp.registration_claims(8601),'f8600000-0000-4000-8000-000000000001.webp')->>'state','reserved','Upload is durably registered before Storage upload');
select is(public.msrc_participant_profile_avatar_register('synthetic-profile',pg_temp.registration_claims(8602),'f8600000-0000-4000-8000-000000000001.webp',0)->>'state','invalid','A different participant cannot attach a reserved avatar');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),'Synthetic University','year_3',null,array['synthetic-a'],1,'f8600000-0000-4000-8000-000000000001.webp',false)->>'state','ready','Fields and registered avatar commit atomically');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))#>>'{profile,avatarObject}','f8600000-0000-4000-8000-000000000001.webp','Own private projection contains only registered object');
select is(public.msrc_participant_profile_avatar_abandon('synthetic-profile',pg_temp.registration_claims(8601),'f8600000-0000-4000-8000-000000000001.webp')->>'state','active','A lost successful save response cannot authorize deletion of the active avatar');
select is(public.msrc_participant_profile_avatar_deleted_many(array['f8600000-0000-4000-8000-000000000001.webp'])->>'state','ready','Deletion acknowledgements are idempotent and queue-only');
select is((select state from msrc_participant.avatar_objects where object_name='f8600000-0000-4000-8000-000000000001.webp'),'active','Bulk acknowledgement never discards an active registration');
select is(public.msrc_participant_profile_avatar_reserve('synthetic-profile',pg_temp.registration_claims(8601),'f8600000-0000-4000-8000-000000000002.webp')->>'state','reserved','Replacement receives an independent immutable path');
select is(public.msrc_participant_profile_avatar_register('synthetic-profile',pg_temp.registration_claims(8601),'f8600000-0000-4000-8000-000000000002.webp',2)->>'state','ready','Replacement switches the avatar');
select is((select state from msrc_participant.avatar_objects where object_name='f8600000-0000-4000-8000-000000000001.webp'),'delete','Replacement queues old bytes for Storage API removal');
select is(public.msrc_participant_profile_avatar_remove('synthetic-profile',pg_temp.registration_claims(8601),2)->>'state','conflict','Stale removal cannot delete a newer avatar');
select is(public.msrc_participant_profile_avatar_remove('synthetic-profile',pg_temp.registration_claims(8601),3)->>'state','ready','Participant can remove the picture');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))#>>'{profile,avatarObject}',null,'Removed avatar immediately disappears from private projection');
select is((select state from msrc_participant.avatar_objects where object_name='f8600000-0000-4000-8000-000000000002.webp'),'delete','Removal queues actual object deletion');
select is(public.msrc_participant_profile_cleanup(0)->>'state','invalid','Cleanup is bounded');
select ok((public.msrc_participant_profile_cleanup(1)->'objects') ? 'f8600000-0000-4000-8000-000000000001.webp','Worker exposes only queued paths within bounded batch');
select is(public.msrc_participant_profile_avatar_deleted('f8600000-0000-4000-8000-000000000001.webp')->>'state','ready','Storage worker acknowledges a successful byte removal');
select ok(not exists(select 1 from msrc_participant.avatar_objects where object_name='f8600000-0000-4000-8000-000000000001.webp'),'Deletion acknowledgement clears private registry');
select is(public.msrc_participant_profile_avatar_reserve('synthetic-profile',pg_temp.registration_claims(8601),'f8600000-0000-4000-8000-000000000003.webp')->>'state','reserved','Failed-upload fixture is staged durably');
select is(public.msrc_participant_profile_avatar_abandon('synthetic-profile',pg_temp.registration_claims(8602),'f8600000-0000-4000-8000-000000000003.webp')->>'state','denied','Another participant cannot abandon an upload');
select is(public.msrc_participant_profile_avatar_abandon('synthetic-profile',pg_temp.registration_claims(8601),'f8600000-0000-4000-8000-000000000003.webp')->>'state','queued','Failed staged upload can be safely queued for eager deletion');
select is(public.msrc_participant_profile_avatar_deleted_many(array['../unsafe.webp'])->>'state','invalid','Bulk byte-removal acknowledgement validates immutable paths');
select is(public.msrc_participant_profile_avatar_deleted_many(array['f8600000-0000-4000-8000-000000000002.webp','f8600000-0000-4000-8000-000000000003.webp'])->>'state','ready','One bounded bulk acknowledgement clears successful worker deletes');
select ok(not exists(select 1 from msrc_participant.avatar_objects where object_name in('f8600000-0000-4000-8000-000000000002.webp','f8600000-0000-4000-8000-000000000003.webp')),'Bulk acknowledgement clears only the queued registry rows');

-- Existing role boundary and immutable audit apply to the new projection too.
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(8693)::text,true);end$$;
select is(public.msrc_staff_participant_detail('synthetic-profile',pg_temp.registration_actor(8601))->>'state','denied','Check-in staff still cannot see optional profile fields');
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(8692)::text,true);end$$;
select is(public.msrc_staff_participant_detail('synthetic-profile',pg_temp.registration_actor(8601))#>>'{participant,optionalProfile,institution}','Synthetic University','Existing registration administrator can see optional profile');
select ok(exists(select 1 from msrc_staff.audit where action='participants_read' and target_id=pg_temp.registration_actor(8601) and result='allowed'),'Staff profile detail read uses the existing participant-target audit');
do $$begin perform set_config('request.jwt.claims','{}',true);end$$;

-- A pending account can never use the API but historical/imported optional data
-- still follows its original thirty-day cleanup proof and queues stored bytes.
select pg_temp.registration_fixture(8610,'synthetic-profile',false,true,interval '31 days');
insert into msrc_participant.profile_details(actor_id,edition_key,institution_other,version)
 values(pg_temp.registration_actor(8610),'synthetic-profile','Synthetic abandoned profile',1);
insert into msrc_participant.avatar_objects(object_name,actor_id,edition_key,state)
 values('f8600000-0000-4000-8000-000000000010.webp',pg_temp.registration_actor(8610),'synthetic-profile','staged');
select is(msrc_participant.retained_reason(pg_temp.registration_actor(8610)),null::text,'Optional profile does not create a retention hold');
select ok((msrc_participant.cleanup_unverified(100,false)->>'deleted')::integer>=1,'Original thirty-day worker erases an eligible unverified account');
select ok(not exists(select 1 from msrc_participant.profile_details where actor_id=pg_temp.registration_actor(8610)),'Account erasure cascades optional scalar data');
select is((select state from msrc_participant.avatar_objects where actor_id=pg_temp.registration_actor(8610)),'delete','Account erasure queues even unfinished upload bytes');

-- Automatic profile expiry uses configured conference end and the independent
-- retention gate; the owner has not authorized a hosted schedule or activation.
select pg_temp.registration_settings('synthetic-profile-expired');
select pg_temp.registration_fixture(8620,'synthetic-profile-expired');
insert into msrc_participant.profile_details(actor_id,edition_key,institution_other,version)
 values(pg_temp.registration_actor(8620),'synthetic-profile-expired','Synthetic retention data',1);
insert into msrc_participant.avatar_objects(object_name,actor_id,edition_key,state)
 values('f8600000-0000-4000-8000-000000000020.webp',pg_temp.registration_actor(8620),'synthetic-profile-expired','active');
update msrc_participant.profile_details set avatar_object='f8600000-0000-4000-8000-000000000020.webp' where actor_id=pg_temp.registration_actor(8620);
update msrc_registration.settings set conference_days=array[(current_date-interval '2 years')::date,(current_date-interval '2 years'+interval '1 day')::date] where edition_key='synthetic-profile-expired';
update msrc_participant.retention_policy set enabled=false;
select is(msrc_participant.profile_retention(),0,'Disabled retention does not erase optional profiles');
select ok(exists(select 1 from msrc_participant.profile_details where actor_id=pg_temp.registration_actor(8620)),'Closed retention preserves scalar data');
update msrc_participant.retention_policy set enabled=true;
select is(msrc_participant.profile_retention(),1,'Enabled retention erases optional profile one year after configured conference end');
select ok(not exists(select 1 from msrc_participant.profile_details where actor_id=pg_temp.registration_actor(8620)),'Expired optional fields are deleted');
select is((select state from msrc_participant.avatar_objects where actor_id=pg_temp.registration_actor(8620)),'delete','Expired picture is queued for Storage API removal');
select is(public.msrc_participant_profile_read('synthetic-profile-expired',pg_temp.registration_claims(8620))->>'state','denied','Expired optional profile cannot be recollected for that edition');
select ok(exists(select 1 from auth.users where id=pg_temp.registration_actor(8620)),'Profile retention does not bypass retained-account safeguards');

-- A failed server process cannot strand a privately uploaded staging object.
insert into msrc_participant.avatar_objects(object_name,actor_id,edition_key,state,expires_at)
 values('f8600000-0000-4000-8000-000000000030.webp',pg_temp.registration_actor(8602),'synthetic-profile','staged',clock_timestamp()-interval '1 minute');
select ok((public.msrc_participant_profile_cleanup(100)->'objects') ? 'f8600000-0000-4000-8000-000000000030.webp','Expired staged upload is reclaimed durably');
select is(pg_temp.profile_save('synthetic-profile',pg_temp.registration_claims(8601),'  ',null,null,'{}'::text[],4)->>'state','ready','All optional scalar fields can be withdrawn');
select is(public.msrc_participant_profile_read('synthetic-profile',pg_temp.registration_claims(8601))#>>'{profile,institution}',null,'Blank institution removes the optional value');

select * from finish();
rollback;
