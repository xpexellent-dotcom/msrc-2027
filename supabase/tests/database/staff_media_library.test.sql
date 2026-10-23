-- ENG-062 / MED-01..04. Disposable synthetic rows; every change rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok((select public and file_size_limit=10485760 and allowed_mime_types=array['image/webp'] from storage.buckets where id='msrc-published-media'),'Public bucket accepts only bounded canonical WebP');
select ok((select not public and file_size_limit=10485760 from storage.buckets where id='msrc-media-drafts'),'Raw uploads and drafts use a private bounded bucket');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='msrc_content' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'Every media table has forced RLS');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated'),('service_role')) r(name)
 where n.nspname='msrc_content' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'All media tables are private even from service-role direct access');
select ok(not exists(select 1 from pg_proc p where (p.pronamespace='msrc_content'::regnamespace or p.proname like 'msrc_staff_media_%') and not('search_path=""'=any(p.proconfig))),'All media functions have empty search paths');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.proname like 'msrc_staff_media_%' and a.grantee in(0,'anon'::regrole)),'Anonymous and PUBLIC have no media RPC grants');
select ok(not has_function_privilege('authenticated','public.msrc_staff_media_upload_complete(text,uuid,jsonb,jsonb)','EXECUTE'),'Clients cannot claim successful image sanitization');
select ok(not has_function_privilege('authenticated','public.msrc_staff_media_upload_reject(text,uuid,jsonb)','EXECUTE'),'Clients cannot forge upload cleanup');
select ok(not has_function_privilege('authenticated','public.msrc_staff_media_transition_finish(text,uuid,jsonb,boolean)','EXECUTE'),'Clients cannot claim public Storage completion');
select ok(not exists(select 1 from pg_proc p where p.proname like 'msrc_staff_media_%'
 and (position('transaction_isolation' in p.prosrc)=0 or position('transaction_isolation' in p.prosrc)>position('pg_advisory_xact_lock_shared' in p.prosrc))),'Every media RPC rejects stale isolation before locking or authorization');
set local role anon;
select throws_ok($$select public.msrc_staff_media_list('synthetic-media')$$,'42501',null,'Anonymous cannot list metadata');
reset role;

-- A deliberately overbroad permissive policy cannot defeat the media boundaries.
create policy synthetic_media_permissive on storage.objects for all to anon,authenticated using(true) with check(true);
insert into storage.objects(bucket_id,name) values('msrc-media-drafts','synthetic-private.webp'),('msrc-published-media','synthetic-public.webp');
set local role authenticated;
select is((select count(*) from storage.objects where bucket_id='msrc-media-drafts'),0::bigint,'Authenticated cannot read private objects despite permissive overlap');
select is((select count(*) from storage.objects where bucket_id='msrc-published-media' and name='synthetic-public.webp'),1::bigint,'Published objects remain readable');
select throws_ok($$insert into storage.objects(bucket_id,name) values('msrc-media-drafts','synthetic-forged.webp')$$,'42501',null,'Direct private upload denied despite permissive overlap');
select throws_ok($$insert into storage.objects(bucket_id,name) values('msrc-published-media','synthetic-forged.webp')$$,'42501',null,'Direct public upload denied despite permissive overlap');
with changed as(update storage.objects set name='synthetic-replaced.webp' where bucket_id='msrc-published-media' returning id)
 select is(count(*),0::bigint,'Client cannot replace public files') from changed;
-- Storage's own statement-level protect_delete trigger normally rejects SQL
-- before RLS. This rollback-only metadata fixture enables its documented test
-- switch so this assertion independently proves the restrictive DELETE policy.
set local storage.allow_delete_query='true';
with changed as(delete from storage.objects where bucket_id='msrc-published-media' returning id)
 select is(count(*),0::bigint,'Client cannot delete public files') from changed;
set local storage.allow_delete_query='false';
select throws_ok($$select * from msrc_content.media_assets$$,'42501',null,'Private metadata is not directly readable');
reset role;
set local role anon;
select is((select count(*) from storage.objects where bucket_id='msrc-media-drafts'),0::bigint,'Anonymous cannot read private objects');
select throws_ok($$insert into storage.objects(bucket_id,name) values('msrc-published-media','synthetic-anon.webp')$$,'42501',null,'Anonymous cannot write public files');
reset role;

update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-media'),('synthetic-media-other');
select pg_temp.registration_staff_fixture(9600,'synthetic-media','contentMediaEditor');
select pg_temp.registration_staff_fixture(9601,'synthetic-media');
do $$declare role_name text;n integer:=9610;begin
 foreach role_name in array array['abstractReviewer','hackathonReviewer','threeMinuteThesisReviewer','scientificAdministrator',
 'judgingCommittee','facultyJudge','registrationWorkshopAdministrator','finance','checkInStaff','sponsorshipPr'] loop
 perform pg_temp.registration_staff_fixture(n,'synthetic-media',role_name);n:=n+1;end loop;
end$$;
create function pg_temp.media_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',case when n=0 then '{}' else pg_temp.registration_claims(n)::text end,true);end$$;
create function pg_temp.media_denials() returns setof text language plpgsql as $$declare n integer;begin
 foreach n in array array[0,9610,9611,9612,9613,9614,9615,9616,9617,9618,9619] loop
 perform pg_temp.media_claim(n);
 return next is(public.msrc_staff_media_list('synthetic-media')->>'state','denied','Wrong role cannot list media '||n);
 return next is(public.msrc_staff_media_upload_reserve('synthetic-media','image.png',24)->>'state','denied','Wrong role cannot reserve uploads '||n);
 return next is(public.msrc_staff_media_update('synthetic-media',gen_random_uuid(),1,'{"altEn":"forged"}'::jsonb)->>'state','denied','Wrong role cannot edit metadata '||n);
 return next is(public.msrc_staff_media_transition_begin('synthetic-media',gen_random_uuid(),1,'publish',gen_random_uuid())->>'state','denied','Wrong role cannot publish '||n);
 end loop;end$$;
select * from pg_temp.media_denials();
select pg_temp.media_claim(9601);
select is(public.msrc_staff_media_list('synthetic-media')->>'state','ready','Assured Super Admin may list media');
select pg_temp.media_claim(9600);
select is(public.msrc_staff_media_list('synthetic-media')->>'state','ready','Session-checked media editor may list media');
select is(public.msrc_staff_media_list('synthetic-media-other')->>'state','denied','Edition scope is enforced');
select is(public.msrc_staff_media_list('synthetic-media')->'assets','[]'::jsonb,'New library has no seeded assets');
select is(public.msrc_staff_media_upload_reserve('synthetic-media','image.png',0)->>'state','invalid','Zero byte upload refused');
select is(public.msrc_staff_media_upload_reserve('synthetic-media','image.png',10485761)->>'state','invalid','More than 10 MB refused');
select is(public.msrc_staff_media_upload_reserve('synthetic-media',E'bad\nname',12)->>'state','invalid','Control characters in filename refused');
do $$declare result jsonb;begin
 result:=public.msrc_staff_media_upload_reserve('synthetic-media','Synthetic image.png',10485760);
 if result->>'state'<>'reserved' then raise exception 'Synthetic media reservation failed';end if;
 perform set_config('synthetic.media_upload',result->>'uploadId',true);
 perform set_config('synthetic.media_claims',pg_temp.registration_claims(9600)::text,true);
end$$;
select is((select expires_at-created_at between interval '14 minutes 59 seconds' and interval '15 minutes 1 second' from msrc_content.media_uploads where id=current_setting('synthetic.media_upload')::uuid),true,'Application completion reservation is 15 minutes');
select is(public.msrc_staff_media_upload_complete('synthetic-media',current_setting('synthetic.media_upload')::uuid,current_setting('synthetic.media_claims')::jsonb,'{}'::jsonb)->>'state','invalid','Completion needs a prior exclusive processing claim');
select pg_temp.media_claim(9601);
select is(public.msrc_staff_media_upload_claim('synthetic-media',current_setting('synthetic.media_upload')::uuid)->>'state','not_found','Another editor cannot consume an upload reservation');
select pg_temp.media_claim(9600);
select is(public.msrc_staff_media_upload_claim('synthetic-media',current_setting('synthetic.media_upload')::uuid)->>'state','reserved','Original exact session claims processing once');
select is(public.msrc_staff_media_upload_claim('synthetic-media',current_setting('synthetic.media_upload')::uuid)->>'state','busy','A replay never starts a second processor');
select is(public.msrc_staff_media_upload_complete('synthetic-media',current_setting('synthetic.media_upload')::uuid,current_setting('synthetic.media_claims')::jsonb,
 '{"mime":"image/jpeg","size":40,"width":10,"height":10,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'::jsonb)->>'state','invalid','Service completion still enforces canonical image format');
set local role authenticated;
select throws_ok($$select public.msrc_staff_media_upload_complete('synthetic-media',current_setting('synthetic.media_upload')::uuid,current_setting('synthetic.media_claims')::jsonb,'{}'::jsonb)$$,'42501',null,'Client cannot assert safe image metadata');
reset role;
set local role service_role;
select is(public.msrc_staff_media_upload_complete('synthetic-media',current_setting('synthetic.media_upload')::uuid,current_setting('synthetic.media_claims')::jsonb,
 '{"mime":"image/webp","size":40,"width":10,"height":10,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'::jsonb)->>'state','created','Trusted service creates a sanitized draft');
reset role;
select is(public.msrc_staff_media_get('synthetic-media',current_setting('synthetic.media_upload')::uuid)->'asset'->>'state','draft','Ingested image starts draft');
select is((select public_path from msrc_content.media_assets where id=current_setting('synthetic.media_upload')::uuid),null::text,'Draft has no public path');
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,1,'publish',gen_random_uuid())->>'state','alt_required','Both alt languages are required to publish');
update msrc_content.media_assets set alt_en=E'\n\t'||chr(160),alt_ar='صورة',rights_confirmed=true,rights_evidence='Synthetic permission' where id=current_setting('synthetic.media_upload')::uuid;
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,1,'publish',gen_random_uuid())->>'state','alt_required','Whitespace and NBSP alone are not an English alt description');
update msrc_content.media_assets set alt_en='Synthetic image',rights_evidence=E'\n\r\t'||chr(160) where id=current_setting('synthetic.media_upload')::uuid;
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,1,'publish',gen_random_uuid())->>'state','rights_required','Whitespace and NBSP alone are not rights evidence');
update msrc_content.media_assets set alt_en='',alt_ar='',rights_confirmed=false,rights_evidence='' where id=current_setting('synthetic.media_upload')::uuid;
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,1,'{"altEn":"Synthetic photo","altAr":"صورة تجريبية","captionEn":"First line\nSecond line","focalX":25,"focalY":80}'::jsonb)->>'state','updated','Editor saves bilingual text, multiline captions and focal point');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,1,'{"altEn":"stale"}'::jsonb)->>'state','conflict','Stale edit cannot overwrite newer metadata');
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,2,'publish',gen_random_uuid())->>'state','rights_required','Publication requires media rights evidence');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,2,'{"rightsConfirmed":true,"rightsEvidence":"Synthetic permission fixture"}'::jsonb)->>'state','updated','Rights evidence is explicitly recorded');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,3,'{"focalX":101}'::jsonb)->>'state','invalid','Out-of-bounds focal point is refused');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,3,'{"storagePath":"forged"}'::jsonb)->>'state','invalid','Client cannot change storage path');
do $$begin perform set_config('synthetic.media_operation',gen_random_uuid()::text,true);end$$;
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,3,'publish',current_setting('synthetic.media_operation')::uuid)->>'state','reserved','Publish reserves exclusive external-operation permission');
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,3,'publish',current_setting('synthetic.media_operation')::uuid)->>'state','busy','Same operation cannot start another external executor');
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,3,'archive',gen_random_uuid())->>'state','busy','Archive cannot race an outstanding publish');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,3,'{"altEn":"while publishing"}'::jsonb)->>'state','busy','Metadata cannot change after publication approval');
select is((select state from msrc_content.media_assets where id=current_setting('synthetic.media_upload')::uuid),'draft','Begin alone never marks an object published');
set local role authenticated;
select throws_ok($$select public.msrc_staff_media_transition_finish('synthetic-media',current_setting('synthetic.media_operation')::uuid,current_setting('synthetic.media_claims')::jsonb,true)$$,'42501',null,'Client cannot forge completed publication');
reset role;
select is(public.msrc_staff_media_transition_finish('synthetic-media',current_setting('synthetic.media_operation')::uuid,current_setting('synthetic.media_claims')::jsonb,true)->>'state','updated','Service completion publishes after confirmed Storage writes');
select is((select state from msrc_content.media_assets where id=current_setting('synthetic.media_upload')::uuid),'published','Published state committed');
select is((select public_path from msrc_content.media_assets where id=current_setting('synthetic.media_upload')::uuid),
 'synthetic-media/'||current_setting('synthetic.media_upload')||'/'||current_setting('synthetic.media_operation')||'/image.webp','Each publication has a unique public path');
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,3,'publish',current_setting('synthetic.media_operation')::uuid)->>'state','completed','Completed operation replay is idempotent without executing Storage again');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,4,'{"altAr":""}'::jsonb)->>'state','alt_required','Published metadata cannot drop required Arabic alt');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,4,'{"altEn":"\n\t"}'::jsonb)->>'state','alt_required','Published alt cannot be replaced with blank multiline text');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,4,jsonb_build_object('rightsEvidence',E'\n\t'||chr(160)))->>'state','rights_required','Published rights evidence cannot be replaced with whitespace or NBSP');
select throws_ok($$update msrc_content.media_assets set alt_en=chr(160) where id=current_setting('synthetic.media_upload')::uuid$$,'23514',null,'Published table constraint independently rejects whitespace-only alt');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,4,'{"rightsConfirmed":false}'::jsonb)->>'state','rights_required','Published metadata cannot drop rights evidence');
select is(public.msrc_staff_media_list('synthetic-media','Synthetic','published')->>'total','1','Search and published picker filter return the asset');
select is(public.msrc_staff_media_list('synthetic-media','','draft')->'assets','[]'::jsonb,'State filter excludes published rows');
do $$begin perform set_config('synthetic.media_operation',gen_random_uuid()::text,true);end$$;
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,4,'unpublish',current_setting('synthetic.media_operation')::uuid)->>'state','reserved','Unpublish reserves public deletion');
select is(public.msrc_staff_media_transition_finish('synthetic-media',current_setting('synthetic.media_operation')::uuid,current_setting('synthetic.media_claims')::jsonb,false)->>'state','failed','Proven no-side-effect failure can close its operation');
select is((select state from msrc_content.media_assets where id=current_setting('synthetic.media_upload')::uuid),'published','Failed removal does not falsely unpublish metadata');
do $$begin perform set_config('synthetic.media_operation',gen_random_uuid()::text,true);end$$;
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,4,'unpublish',current_setting('synthetic.media_operation')::uuid)->>'state','reserved','New unpublish attempt may run after proven failure');
select is(public.msrc_staff_media_transition_finish('synthetic-media',current_setting('synthetic.media_operation')::uuid,current_setting('synthetic.media_claims')::jsonb,true)->>'state','updated','Confirmed public deletion returns to draft');
select is((select public_path from msrc_content.media_assets where id=current_setting('synthetic.media_upload')::uuid),null::text,'Unpublished metadata clears public path');
do $$begin perform set_config('synthetic.media_operation',gen_random_uuid()::text,true);end$$;
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,5,'archive',current_setting('synthetic.media_operation')::uuid)->>'state','reserved','Draft may be archived');
select is(public.msrc_staff_media_transition_finish('synthetic-media',current_setting('synthetic.media_operation')::uuid,current_setting('synthetic.media_claims')::jsonb,true)->>'state','updated','Archive commits after service cleanup');
select is(public.msrc_staff_media_transition_begin('synthetic-media',current_setting('synthetic.media_upload')::uuid,6,'publish',gen_random_uuid())->>'state','invalid_transition','Archived image cannot be accidentally republished');
select is(public.msrc_staff_media_update('synthetic-media',current_setting('synthetic.media_upload')::uuid,6,'{"altEn":"archived change"}'::jsonb)->>'state','invalid_transition','Archived metadata is immutable through editing');
select is((select count(*) from msrc_content.media_audit where asset_id=current_setting('synthetic.media_upload')::uuid and event='metadata.update'),2::bigint,'Each successful metadata change is audited exactly once');
select is((select count(*) from msrc_content.media_audit where asset_id=current_setting('synthetic.media_upload')::uuid and event='transition.complete'),3::bigint,'Publish, unpublish and archive have separate completion audits');
select ok(not exists(select 1 from msrc_content.media_audit where actor_id<>pg_temp.registration_actor(9600) or session_id<>pg_temp.registration_session(9600)),'Audit preserves exact actor and session');
select throws_ok($$update msrc_content.media_audit set event='upload.reject'$$,'55000',null,'Audit cannot be rewritten');
select throws_ok($$delete from msrc_content.media_audit$$,'55000',null,'Audit cannot be deleted');
select throws_ok($$truncate msrc_content.media_audit$$,'55000',null,'Audit cannot be truncated');

-- Dedupe never overwrites existing captions or resurrects an archived asset.
do $$declare result jsonb;begin result:=public.msrc_staff_media_upload_reserve('synthetic-media','duplicate.png',40);
 perform set_config('synthetic.media_duplicate',result->>'uploadId',true);end$$;
select is(public.msrc_staff_media_upload_claim('synthetic-media',current_setting('synthetic.media_duplicate')::uuid)->>'state','reserved','Duplicate candidate gets its own immutable raw path');
select is(public.msrc_staff_media_upload_complete('synthetic-media',current_setting('synthetic.media_duplicate')::uuid,current_setting('synthetic.media_claims')::jsonb,
 '{"mime":"image/webp","size":40,"width":10,"height":10,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}'::jsonb)->>'state','duplicate','Canonical SHA256 deduplicates within the edition');
select is((select count(*) from msrc_content.media_assets where edition_key='synthetic-media'),1::bigint,'Dedupe creates no duplicate metadata');
select is((select state from msrc_content.media_assets where id=current_setting('synthetic.media_upload')::uuid),'archived','Dedupe does not resurrect an archived image');
do $$declare result jsonb;begin result:=public.msrc_staff_media_upload_reserve('synthetic-media','unsafe.png',40);
 perform set_config('synthetic.media_reject',result->>'uploadId',true);end$$;
select is(public.msrc_staff_media_upload_claim('synthetic-media',current_setting('synthetic.media_reject')::uuid)->>'state','reserved','Unsafe bytes are processed privately');
select is(public.msrc_staff_media_upload_reject('synthetic-media',current_setting('synthetic.media_reject')::uuid,current_setting('synthetic.media_claims')::jsonb)->>'state','rejected','Service rejection consumes unsafe upload reservation');
select is(public.msrc_staff_media_upload_claim('synthetic-media',current_setting('synthetic.media_reject')::uuid)->>'state','expired','Rejected upload cannot be processed again');
do $$declare result jsonb;begin result:=public.msrc_staff_media_upload_reserve('synthetic-media','expired.png',40);
 perform set_config('synthetic.media_expired',result->>'uploadId',true);end$$;
update msrc_content.media_uploads set expires_at=clock_timestamp()-interval '1 second' where id=current_setting('synthetic.media_expired')::uuid;
select is(public.msrc_staff_media_upload_claim('synthetic-media',current_setting('synthetic.media_expired')::uuid)->>'state','expired','Provider token longevity cannot bypass the app claim deadline');

-- Abuse limits serialize per actor and cannot be bypassed through another edition.
select pg_temp.registration_staff_fixture(9620,'synthetic-media','contentMediaEditor');
select pg_temp.media_claim(9620);
do $$declare n integer;begin for n in 1..20 loop
 if public.msrc_staff_media_upload_reserve('synthetic-media','Synthetic quota.png',40)->>'state'<>'reserved' then raise exception 'Quota fixture failed';end if;
 end loop;end$$;
select is(public.msrc_staff_media_upload_reserve('synthetic-media','Twenty first.png',40)->>'state','limited','At most twenty reservations are issued per fifteen minutes');
select is((select count(*) from msrc_content.media_uploads where actor_id=pg_temp.registration_actor(9620)),20::bigint,'Refused upload creates no extra reservation');
select is((select count(*) from msrc_content.media_audit where actor_id=pg_temp.registration_actor(9620) and event='upload.reserve'),20::bigint,'Each issued reservation has an audit');
update msrc_content.media_uploads set created_at=clock_timestamp()-interval '16 minutes' where actor_id=pg_temp.registration_actor(9620);
select is(public.msrc_staff_media_upload_reserve('synthetic-media','Later.png',40)->>'state','reserved','Abuse window permits a later upload without weakening processing locks');
update msrc_staff.policy set enabled=false;
select is(public.msrc_staff_media_list('synthetic-media')->>'state','denied','Closed staff policy closes media tools');

select * from finish();
rollback;
