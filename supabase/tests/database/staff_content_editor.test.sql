-- ENG-063. Synthetic content only; rollback leaves no editorial records.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_content' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'Every content table has forced RLS');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated'),('service_role')) r(name)
 where n.nspname='msrc_content' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No direct client or service-role access to content tables');
select ok(not exists(select 1 from pg_proc p where (p.pronamespace='msrc_content'::regnamespace or p.proname like 'msrc_staff_content_%' or p.proname='msrc_content_published')
 and not('search_path=""'=any(p.proconfig))),'Every content function fixes an empty search path');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname like 'msrc_staff_content_%' and a.grantee in(0,'anon'::regrole)),'No PUBLIC or anonymous staff RPC grant');
select ok(not has_function_privilege('authenticated','public.msrc_content_published(text,text)','EXECUTE'),'Published read is server-only');
select ok(has_function_privilege('service_role','public.msrc_content_published(text,text)','EXECUTE'),'Service role can read the published projection');
select ok(not exists(select 1 from pg_proc p where p.proname like 'msrc_staff_content_%'
 and (position('transaction_isolation' in p.prosrc)=0 or position('transaction_isolation' in p.prosrc)>position('pg_advisory_xact_lock_shared' in p.prosrc))),'Isolation guard runs before authorization and locks');
set local role anon;
select throws_ok($$select public.msrc_staff_content_list('synthetic-content','speakers')$$,'42501',null,'Anonymous cannot list drafts');
select throws_ok($$select public.msrc_content_published('synthetic-content','speakers')$$,'42501',null,'Anonymous cannot call the server read RPC');
reset role;
set local role authenticated;
select throws_ok($$select * from msrc_content.content_items$$,'42501',null,'Clients cannot read private drafts directly');
select throws_ok($$select public.msrc_content_published('synthetic-content','speakers')$$,'42501',null,'Authenticated clients cannot call server reads');
reset role;

update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-content'),('synthetic-content-other');
select pg_temp.registration_staff_fixture(9800,'synthetic-content','contentMediaEditor');
select pg_temp.registration_staff_fixture(9801,'synthetic-content');
select pg_temp.registration_staff_fixture(9802,'synthetic-content-other','contentMediaEditor');
do $$declare role_name text;n integer:=9810;begin
 foreach role_name in array array['abstractReviewer','hackathonReviewer','threeMinuteThesisReviewer','scientificAdministrator',
 'judgingCommittee','facultyJudge','registrationWorkshopAdministrator','finance','checkInStaff','sponsorshipPr'] loop
 perform pg_temp.registration_staff_fixture(n,'synthetic-content',role_name);n:=n+1;end loop;
end$$;
create function pg_temp.content_claim(n integer) returns void language plpgsql as $$begin
 perform set_config('request.jwt.claims',case when n=0 then '{}' else pg_temp.registration_claims(n)::text end,true);end$$;
create function pg_temp.content_denials() returns setof text language plpgsql as $$declare n integer;begin
 foreach n in array array[0,9802,9810,9811,9812,9813,9814,9815,9816,9817,9818,9819] loop
 perform pg_temp.content_claim(n);
 return next is(public.msrc_staff_content_list('synthetic-content','speakers')->>'state','denied','Wrong role/edition cannot list content '||n);
 return next is(public.msrc_staff_content_save('synthetic-content','speakers',null,0,'{}'::jsonb)->>'state','denied','Wrong role/edition cannot edit content '||n);
 return next is(public.msrc_staff_content_transition('synthetic-content',gen_random_uuid(),1,'publish')->>'state','denied','Wrong role/edition cannot publish content '||n);
 return next is(public.msrc_staff_content_reorder('synthetic-content','speakers','[]'::jsonb)->>'state','denied','Wrong role/edition cannot reorder content '||n);
 return next is(public.msrc_staff_content_history('synthetic-content',gen_random_uuid())->>'state','denied','Wrong role/edition cannot view history '||n);
 end loop;end$$;
select * from pg_temp.content_denials();
select pg_temp.content_claim(9801);
select is(public.msrc_staff_content_list('synthetic-content','speakers')->>'state','ready','Assured Super Admin may list content');
select pg_temp.content_claim(9800);
select is(public.msrc_staff_content_list('synthetic-content','speakers')->>'state','ready','Exact-session editor may list content');
select is(public.msrc_staff_content_list('synthetic-content','speakers')->'items','[]'::jsonb,'No content is seeded');
select is(public.msrc_content_published('synthetic-content','speakers')->'items','[]'::jsonb,'Empty publication collection exposes no drafts');
select is(public.msrc_staff_content_list('synthetic-content','unknown')->>'state','invalid','Unknown collection rejected');
select is(public.msrc_staff_content_save('synthetic-content','speakers',null,0,'{"privateField":"hidden"}'::jsonb)->>'state','invalid','Unexpected JSON keys rejected');
select is(public.msrc_staff_content_save('synthetic-content','speakers',null,0,'{"nameEn":null}'::jsonb)->>'state','invalid','Null text rejected');
select is(public.msrc_staff_content_save('synthetic-content','speakers',null,0,'{"url":"javascript:alert(1)"}'::jsonb)->>'state','invalid','Unsafe URL rejected');
select is(public.msrc_staff_content_save('synthetic-content','speakers',null,0,'{"url":"https://user:pass@example.invalid"}'::jsonb)->>'state','invalid','Credential-bearing URL rejected');
select is(public.msrc_staff_content_save('synthetic-content','speakers',null,0,'{"links":["http://example.invalid"]}'::jsonb)->>'state','invalid','External links require HTTPS');
select is(public.msrc_staff_content_save('synthetic-content','sessions',null,0,'{"day":"2027-02-30"}'::jsonb)->>'state','invalid','Nonexistent calendar date rejected');
select is(public.msrc_staff_content_save('synthetic-content','sessions',null,0,'{"startTime":"25:00"}'::jsonb)->>'state','invalid','Invalid Riyadh wall time rejected');
select is(public.msrc_staff_content_save('synthetic-content','speakers',null,0,jsonb_build_object('nameEn',repeat('a',501)))->>'state','invalid','Text is bounded');
select is(public.msrc_staff_content_save('synthetic-content','speakers',null,1,'{}'::jsonb)->>'state','conflict','Creation requires version zero');
select is(public.msrc_staff_content_save('synthetic-content','speakers',null,0,'{"assetId":"b8000000-0000-4000-8000-000000000001"}'::jsonb)->>'state','media_required','Unknown media cannot be attached');

create temporary table content_test_rows(key text primary key,id uuid);
insert into content_test_rows values('speaker',((public.msrc_staff_content_save('synthetic-content','speakers',null,0,
 '{"nameEn":"Synthetic speaker","titleEn":"Synthetic title"}'::jsonb)->'item')->>'id')::uuid);
create function pg_temp.content_id(key text) returns uuid language sql as $$select id from content_test_rows r where r.key=content_id.key$$;
create function pg_temp.content_version(key text) returns integer language sql as $$select version from msrc_content.content_items where id=pg_temp.content_id(key)$$;
create function pg_temp.content_fields(key text) returns jsonb language sql as $$select draft from msrc_content.content_items where id=pg_temp.content_id(key)$$;
create function pg_temp.content_transition(key text,action text,restore_version integer default null) returns jsonb language sql as $$
 select public.msrc_staff_content_transition('synthetic-content',pg_temp.content_id(key),pg_temp.content_version(key),action,restore_version)$$;
create function pg_temp.content_save(key text,patch jsonb) returns jsonb language sql as $$
 select public.msrc_staff_content_save('synthetic-content',(select collection from msrc_content.content_items where id=pg_temp.content_id(key)),
 pg_temp.content_id(key),pg_temp.content_version(key),pg_temp.content_fields(key)||patch)$$;

select is(pg_temp.content_version('speaker'),1,'Create starts at version one');
select is(pg_temp.content_fields('speaker')->'links','[]'::jsonb,'Sparse drafts receive complete field defaults');
select is(pg_temp.content_transition('speaker','publish')->>'state','translation_required','Arabic is required before speaker publication');
select is(pg_temp.content_version('speaker'),1,'Failed publish leaves draft version untouched');
select is(pg_temp.content_save('speaker','{"nameAr":"متحدث تجريبي","titleAr":"صفة تجريبية"}'::jsonb)->>'state','updated','Editor saves bilingual draft');
select is(public.msrc_staff_content_save('synthetic-content','speakers',pg_temp.content_id('speaker'),1,'{}'::jsonb)->>'state','conflict','Stale draft save cannot overwrite current work');
select is(pg_temp.content_transition('speaker','publish')->>'state','updated','Publish commits the validated snapshot');
select is((select published_version from msrc_content.content_items where id=pg_temp.content_id('speaker')),3,'Publish advances the version and current pointer');
select is(public.msrc_content_published('synthetic-content','speakers')->'items'->0->'fields'->>'nameEn','Synthetic speaker','Published projection contains approved fields');
select ok(not ((public.msrc_content_published('synthetic-content','speakers')->'items'->0->'fields') ?| array['assetId','permissionToDisplay','rightsEvidence','updatedAt']),'Published fields omit internal and private metadata');
select is((select after_value->>'publishedVersion' from msrc_content.content_audit where item_id=pg_temp.content_id('speaker') and version=3),'3','Publication audit records the committed public pointer');
select is(pg_temp.content_save('speaker','{"nameEn":"Unpublished change"}'::jsonb)->>'state','updated','Draft can diverge from public snapshot');
select is(public.msrc_content_published('synthetic-content','speakers')->'items'->0->'fields'->>'nameEn','Synthetic speaker','Saving a draft does not alter public content');
select is(pg_temp.content_transition('speaker','restore',2)->>'state','updated','Historical draft restores to a new version');
select is(pg_temp.content_version('speaker'),5,'Restore advances monotonically');
select is(pg_temp.content_fields('speaker')->>'nameEn','Synthetic speaker','Restore copies the exact historical draft');
select is((select published_version from msrc_content.content_items where id=pg_temp.content_id('speaker')),3,'Restoration does not publish');
select is(jsonb_array_length(public.msrc_staff_content_history('synthetic-content',pg_temp.content_id('speaker'))->'history'),5,'History records every successful mutation');
select is(public.msrc_staff_content_history('synthetic-content-other',pg_temp.content_id('speaker'))->>'state','denied','History cannot cross edition scope');
select is(pg_temp.content_transition('speaker','restore',999)->>'state','invalid','Unknown restore version rejected');
select ok(msrc_content.content_fields_valid('speakers','{"links":["https://example.invalid/@synthetic"]}'::jsonb),'HTTPS social profile path may contain an at-sign without credentials');
select throws_ok($$update msrc_content.content_publications set fields='{}'::jsonb$$,'55000',null,'Publication snapshots are immutable');
select throws_ok($$delete from msrc_content.content_versions$$,'55000',null,'Version history is append-only');
select throws_ok($$truncate msrc_content.content_audit$$,'55000',null,'Audit cannot be truncated');
select throws_ok($$update msrc_content.content_audit set event='forged'$$,'55000',null,'Audit cannot be rewritten');

insert into content_test_rows values('partner',((public.msrc_staff_content_save('synthetic-content','partners',null,0,
 '{"nameEn":"Synthetic partner","nameAr":"شريك تجريبي","tier":"partner"}'::jsonb)->'item')->>'id')::uuid);
select is(pg_temp.content_transition('partner','publish')->>'state','permission_required','Partner needs explicit display permission');
select is(pg_temp.content_save('partner','{"permissionToDisplay":true}'::jsonb)->>'state','updated','Display permission is recorded in draft');
select is(pg_temp.content_transition('partner','publish')->>'state','updated','Approved partner may publish');
select ok(not ((public.msrc_content_published('synthetic-content','partners')->'items'->0->'fields')?'permissionToDisplay'),'Permission audit checkbox remains internal');

insert into content_test_rows values('team',((public.msrc_staff_content_save('synthetic-content','team',null,0,
 '{"nameEn":"Synthetic member","nameAr":"عضو تجريبي","titleEn":"Synthetic role","titleAr":"دور تجريبي"}'::jsonb)->'item')->>'id')::uuid);
select is(pg_temp.content_transition('team','publish')->>'state','translation_required','Team publication requires bilingual group');
select is(pg_temp.content_save('team','{"groupEn":"Synthetic group","groupAr":"مجموعة تجريبية"}'::jsonb)->>'state','updated','Bilingual team group saved');
select is(pg_temp.content_transition('team','publish')->>'state','updated','Bilingual team member may publish');

insert into content_test_rows values('session',((public.msrc_staff_content_save('synthetic-content','sessions',null,0,
 jsonb_build_object('titleEn','Synthetic session','titleAr','جلسة تجريبية','day','2027-01-27','startTime','09:00','endTime','10:00','type','talk',
 'speakerIds',jsonb_build_array(pg_temp.content_id('speaker'))))->'item')->>'id')::uuid);
select is(pg_temp.content_transition('session','publish')->>'state','updated','Published speaker may join the programme session');
select is((select count(*) from msrc_content.content_session_speakers where session_id=pg_temp.content_id('session')),2::bigint,'Each session version retains relational speaker membership');
select is(pg_temp.content_transition('speaker','unpublish')->>'state','referenced','Live session prevents referenced speaker withdrawal');
select is(pg_temp.content_save('session','{"descriptionEn":"Needs Arabic"}'::jsonb)->>'state','updated','Incomplete translation may be saved as draft');
select is(pg_temp.content_transition('session','publish')->>'state','translation_required','Optional programme description needs Arabic when used');
select is(public.msrc_content_published('synthetic-content','sessions')->'items'->0->'fields'->>'descriptionEn','','Incomplete draft cannot change live description');
select is(pg_temp.content_transition('session','unpublish')->>'state','updated','Session withdrawal succeeds');
select is(pg_temp.content_transition('speaker','unpublish')->>'state','updated','Speaker may withdraw after session withdrawal');
select is(public.msrc_content_published('synthetic-content','speakers')->'items','[]'::jsonb,'Withdrawing last speaker leaves an empty collection for static fallback');
select is(pg_temp.content_save('session','{"descriptionAr":"وصف تجريبي"}'::jsonb)->>'state','updated','Arabic description saved');
select is(pg_temp.content_transition('session','publish')->>'state','invalid','Unpublished speaker cannot be newly published in a session');
select is(pg_temp.content_transition('speaker','publish')->>'state','updated','Speaker republish creates a new snapshot');
select is(pg_temp.content_save('session','{"startTime":"10:00","endTime":"09:00"}'::jsonb)->>'state','updated','Invalid interval can be kept as draft');
select is(pg_temp.content_transition('session','publish')->>'state','invalid','Programme end must follow start in Riyadh');
select is(pg_temp.content_save('session',jsonb_build_object('speakerIds',jsonb_build_array(pg_temp.content_id('partner'))))->>'state','invalid','Partner cannot masquerade as programme speaker');
select is(pg_temp.content_save('session',jsonb_build_object('speakerIds',jsonb_build_array(pg_temp.content_id('speaker'),pg_temp.content_id('speaker'))))->>'state','invalid','Duplicate speaker membership rejected');

insert into content_test_rows values('speaker2',((public.msrc_staff_content_save('synthetic-content','speakers',null,0,
 '{"nameEn":"Second synthetic","nameAr":"تجريبي ثان","titleEn":"Synthetic title","titleAr":"صفة تجريبية","sortOrder":7}'::jsonb)->'item')->>'id')::uuid);
select is(pg_temp.content_transition('speaker2','publish')->>'state','updated','Second speaker publishes');
select is(public.msrc_staff_content_reorder('synthetic-content','speakers',jsonb_build_array(jsonb_build_object('id',pg_temp.content_id('speaker2'),'version',pg_temp.content_version('speaker2'))))->>'state','conflict','Partial collection reorder fails atomically');
select is(public.msrc_staff_content_reorder('synthetic-content','speakers',jsonb_build_array(
 jsonb_build_object('id',pg_temp.content_id('speaker2'),'version',pg_temp.content_version('speaker2')),
 jsonb_build_object('id',pg_temp.content_id('speaker'),'version',1)))->>'state','conflict','Stale row blocks entire reorder');
select is(pg_temp.content_fields('speaker2')->>'sortOrder','7','Failed reorder changes no row');
select is(public.msrc_staff_content_reorder('synthetic-content','speakers',jsonb_build_array(
 jsonb_build_object('id',pg_temp.content_id('speaker2'),'version',pg_temp.content_version('speaker2')),
 jsonb_build_object('id',pg_temp.content_id('speaker'),'version',pg_temp.content_version('speaker'))))->>'state','updated','Complete current collection reorders');
select is(public.msrc_staff_content_list('synthetic-content','speakers')->'items'->0->>'id',pg_temp.content_id('speaker2')::text,'Staff sees the new draft order');
select is(public.msrc_content_published('synthetic-content','speakers')->'items'->0->>'id',pg_temp.content_id('speaker')::text,'Reorder does not change published order until Publish');
select is(pg_temp.content_transition('speaker','publish')->>'state','updated','First reordered speaker publishes');
select is(pg_temp.content_transition('speaker2','publish')->>'state','updated','Second reordered speaker publishes');
select is(public.msrc_content_published('synthetic-content','speakers')->'items'->0->>'id',pg_temp.content_id('speaker2')::text,'Published ordering follows explicit committed sort values');

insert into msrc_content.media_assets(id,edition_key,file_name,storage_path,mime,size,width,height,alt_en,alt_ar,rights_confirmed,rights_evidence,uploaded_by,sha256)
 values('b8000000-0000-4000-8000-000000000001','synthetic-content','Synthetic.png','synthetic-content/b8000000-0000-4000-8000-000000000001/image.webp',
 'image/webp',40,10,10,'Synthetic image','صورة تجريبية',true,'Private synthetic permission',pg_temp.registration_actor(9800),repeat('c',64));
select is(pg_temp.content_save('team','{"assetId":"b8000000-0000-4000-8000-000000000001"}'::jsonb)->>'state','media_required','Picker save rechecks current media publication');
insert into msrc_content.media_assets(id,edition_key,file_name,storage_path,mime,size,width,height,uploaded_by,sha256)
 values('b8000000-0000-4000-8000-000000000002','synthetic-content-other','Other.png','synthetic-content-other/b8000000-0000-4000-8000-000000000002/image.webp',
 'image/webp',40,10,10,pg_temp.registration_actor(9802),repeat('d',64));
select is(pg_temp.content_save('team','{"assetId":"b8000000-0000-4000-8000-000000000002"}'::jsonb)->>'state','media_required','Cross-edition media cannot be attached');
update msrc_content.media_assets set state='published',public_path='synthetic-content/synthetic-public/image.webp',published_at=clock_timestamp()
 where id='b8000000-0000-4000-8000-000000000001';
select is(pg_temp.content_save('team','{"assetId":"b8000000-0000-4000-8000-000000000001"}'::jsonb)->>'state','updated','Current published media may be attached to a draft');
select is(pg_temp.content_transition('team','publish')->>'state','updated','Published media is snapshotted');
select is(public.msrc_content_published('synthetic-content','team')->'items'->0->'media'->>'path','synthetic-content/synthetic-public/image.webp','Public projection returns only current published asset path');
select ok(not ((public.msrc_content_published('synthetic-content','team')->'items'->0->'media') ?| array['rightsEvidence','storagePath','uploadedBy','sha256']),'Media private evidence cannot leak through public projection');
select is(public.msrc_staff_media_transition_begin('synthetic-content','b8000000-0000-4000-8000-000000000001',1,'unpublish','b8000000-0000-4000-8000-000000000003')->>'state','reserved','Media withdrawal reserves its external operation');
select is(pg_temp.content_save('team','{}'::jsonb)->>'state','media_required','Stale picker selection cannot save while media withdrawal is pending');
select is(pg_temp.content_transition('team','publish')->>'state','media_required','Pending media withdrawal blocks content publication');
select is(public.msrc_staff_media_transition_finish('synthetic-content','b8000000-0000-4000-8000-000000000003',pg_temp.registration_claims(9800),true)->>'state','updated','Synthetic completed withdrawal removes media publication');
select is(public.msrc_content_published('synthetic-content','team')->'items'->0->'media','null'::jsonb,'Later media withdrawal removes public media projection');
select is(pg_temp.content_save('team','{}'::jsonb)->>'state','media_required','Stale picker selection cannot resave withdrawn media');
select is((select media->>'path' from msrc_content.content_publications where item_id=pg_temp.content_id('team') order by version desc limit 1),'synthetic-content/synthetic-public/image.webp','Withdrawal never rewrites immutable publication history');
select ok(not exists(select 1 from msrc_content.content_items i where i.version<>(select count(*) from msrc_content.content_versions v where v.item_id=i.id)),'Every successful content change has a version');
select ok(not exists(select 1 from msrc_content.content_versions v where not exists(select 1 from msrc_content.content_audit a where a.item_id=v.item_id and a.version=v.version)),'Every version has exactly one immutable audit event');
select ok(not exists(select 1 from msrc_content.content_audit where actor_id<>pg_temp.registration_actor(9800) or session_id<>pg_temp.registration_session(9800)),'Audit identifies the actual staff actor and exact native session');
set local role service_role;
select is(jsonb_array_length(public.msrc_content_published('synthetic-content','partners')->'items'),1,'Service-role-only public RPC works without staff claims');
select throws_ok($$select * from msrc_content.content_publications$$,'42501',null,'Service role cannot directly read snapshots');
reset role;
select pg_temp.registration_staff_fixture(9820,'synthetic-content','contentMediaEditor');
select pg_temp.content_claim(9820);
delete from msrc_staff_email.receipts where session_id=pg_temp.registration_session(9820);
select is(public.msrc_staff_content_list('synthetic-content','speakers')->>'state','denied','Missing exact-session email receipt denies editor access');

select * from finish();
rollback;
