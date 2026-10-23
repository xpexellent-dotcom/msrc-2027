-- Synthetic media/content only. No Storage writes; every SQL change rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select has_column('msrc_content','media_assets','edition_year','Archive year exists');
select col_type_is('msrc_content','media_assets','edition_year','integer','Archive year is integer');
select has_column('msrc_content','media_assets','kind','Archive kind exists');
select has_column('msrc_content','media_assets','display_order','Archive order exists');
select has_column('msrc_content','media_assets','video_path','Static film path exists');
select has_column('msrc_content','media_assets','source_slug','Archive slug survives import');
select has_column('msrc_content','media_assets','duration_seconds','Film duration survives import');
select has_column('msrc_content','content_items','source_key','Content import has durable identity');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_content' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'All content/import tables force RLS');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join (values('anon'),('authenticated'),('service_role')) r(name)
 where n.nspname='msrc_content' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No direct table access including imports');
select ok(not exists(select 1 from pg_proc p where (p.pronamespace='msrc_content'::regnamespace or p.proname in(
 'msrc_media_published','msrc_staff_media_import_reserve','msrc_staff_media_import_finish','msrc_staff_content_import','msrc_staff_media_reorder'))
 and not('search_path=""'=any(p.proconfig))),'All import/archive functions have empty search paths');
select ok(has_function_privilege('service_role','public.msrc_media_published(text)','EXECUTE'),'Server may read published archive');
select ok(not has_function_privilege('authenticated','public.msrc_media_published(text)','EXECUTE'),'Clients cannot call public projection RPC');
select ok(not has_function_privilege('anon','public.msrc_media_published(text)','EXECUTE'),'Anonymous cannot call projection RPC');
select ok(not has_function_privilege('authenticated','public.msrc_staff_media_import_reserve(text,jsonb,text,jsonb)','EXECUTE'),'Client cannot reserve trusted server import');
select ok(not has_function_privilege('authenticated','public.msrc_staff_media_import_finish(text,jsonb,uuid,jsonb)','EXECUTE'),'Client cannot assert Storage completion');
select ok(has_function_privilege('authenticated','public.msrc_staff_content_import(text,jsonb,jsonb)','EXECUTE'),'Session-authenticated content import route exists');
set local role anon;
select throws_ok($$select public.msrc_staff_content_import('synthetic-site-import','[]'::jsonb)$$,'42501',null,'Anonymous cannot import content');
reset role;

update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-site-import'),('synthetic-site-other');
select pg_temp.registration_staff_fixture(10300,'synthetic-site-import');
select pg_temp.registration_staff_fixture(10301,'synthetic-site-import','contentMediaEditor');
select pg_temp.registration_staff_fixture(10302,'synthetic-site-import');
select pg_temp.registration_staff_fixture(10303,'synthetic-site-other');
create function pg_temp.site_media(n integer) returns jsonb language sql immutable as $$
 select jsonb_build_object('fileName','Synthetic image.webp','mime','image/webp','sha256',lpad(to_hex(n),64,'0'),'size',40,'width',10,'height',10);$$;
create function pg_temp.site_fields(year integer default 2026,item_position integer default 0) returns jsonb language sql immutable as $$
 select jsonb_build_object('altEn','Synthetic archive','altAr','صورة تجريبية','captionEn','Synthetic caption','captionAr','وصف تجريبي',
 'rightsConfirmed',true,'rightsEvidence','Synthetic organizer consent evidence','editionYear',year,'kind','photograph',
 'displayOrder',item_position,'videoPath',null,'focalX',42,'focalY',37);$$;
create function pg_temp.site_team(name text,asset uuid default null) returns jsonb language sql immutable as $$
 select jsonb_build_object('nameEn',name,'nameAr','اسم تجريبي','titleEn','Synthetic role','titleAr','دور تجريبي',
 'groupEn','Synthetic committee','groupAr','لجنة تجريبية','assetId',asset,'sortOrder',0,
 'teamLayout',jsonb_build_object('slug','synthetic-person','committee','scientific','kind','head','parentSlug',null,'noMembers',false,
 'members',jsonb_build_array(jsonb_build_object('nameEn','Synthetic member','nameAr','عضو تجريبي'))));$$;
create function pg_temp.site_batch(key text,name text,asset uuid default null) returns jsonb language sql immutable as $$
 select jsonb_build_array(jsonb_build_object('sourceKey',key,'collection','team','fields',pg_temp.site_team(name,asset)));$$;

select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10301),'archive-editor',pg_temp.site_media(10300))->>'state','denied','Media editor cannot run organizer import');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10303),'archive-wrong-edition',pg_temp.site_media(10300))->>'state','denied','Super Admin from another edition cannot import');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import','{}'::jsonb,'archive-forged',pg_temp.site_media(10300))->>'state','denied','Missing exact-session identity is denied');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'bad source key',pg_temp.site_media(10300))->>'state','invalid','Malformed import key refused');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-bad-size',pg_temp.site_media(10300)||'{"size":10485761}'::jsonb)->>'state','invalid','Oversize canonical file refused');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-bad-width',pg_temp.site_media(10300)||'{"width":2561}'::jsonb)->>'state','invalid','Oversize canonical dimensions refused');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-bad-hash',pg_temp.site_media(10300)||'{"sha256":"forged"}'::jsonb)->>'state','invalid','Malformed digest refused');
do $$declare r jsonb;begin
 r:=public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-first',pg_temp.site_media(10300));
 if r->>'state'<>'reserved' then raise exception 'Synthetic import did not reserve';end if;
 perform set_config('synthetic.site_import_id',r->>'importId',true);
 perform set_config('synthetic.site_storage_path',r->>'storagePath',true);
 perform set_config('synthetic.site_public_path',r->>'publicPath',true);
end$$;
select is(current_setting('synthetic.site_storage_path'),'synthetic-site-import/'||current_setting('synthetic.site_import_id')||'/image.webp','Private sanitized path is server controlled');
select is(current_setting('synthetic.site_public_path'),'synthetic-site-import/'||current_setting('synthetic.site_import_id')||'/'||current_setting('synthetic.site_import_id')||'/image.webp','Publication uses unique immutable path');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-first',pg_temp.site_media(10300))->>'state','busy','Replay cannot start another Storage executor');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-second-same-hash',pg_temp.site_media(10300))->>'state','busy','Two source keys cannot concurrently write the same digest');
select is(public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10301),current_setting('synthetic.site_import_id')::uuid,pg_temp.site_fields())->>'state','denied','Editor cannot finish an import');
select is(public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10302),current_setting('synthetic.site_import_id')::uuid,pg_temp.site_fields())->>'state','not_found','Another Super Admin session cannot finish reservation');
select is(public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10300),current_setting('synthetic.site_import_id')::uuid,pg_temp.site_fields()||'{"altAr":""}'::jsonb)->>'state','alt_required','Import publication needs Arabic alt text');
select is(public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10300),current_setting('synthetic.site_import_id')::uuid,pg_temp.site_fields()||'{"rightsConfirmed":false}'::jsonb)->>'state','rights_required','Import needs explicit rights evidence');
select is(public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10300),current_setting('synthetic.site_import_id')::uuid,pg_temp.site_fields()||'{"kind":"film","videoPath":"https://example.invalid/film.mp4"}'::jsonb)->>'state','invalid','External film URLs are forbidden');
select is(public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10300),current_setting('synthetic.site_import_id')::uuid,pg_temp.site_fields()||'{"editionYear":2201}'::jsonb)->>'state','invalid','Invalid archive years refused');
select is(public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10300),current_setting('synthetic.site_import_id')::uuid,pg_temp.site_fields()||'{"sourceSlug":"synthetic-archive-first"}'::jsonb)->>'state','created','Trusted completion creates published canonical asset');
select is(public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10300),current_setting('synthetic.site_import_id')::uuid,pg_temp.site_fields()||'{"altEn":"Must not overwrite"}'::jsonb)->>'state','duplicate','Completion replay preserves original metadata');
select is((select version from msrc_content.media_assets where id=current_setting('synthetic.site_import_id')::uuid),1,'Replayed import does not increment asset version');
select is((select alt_en from msrc_content.media_assets where id=current_setting('synthetic.site_import_id')::uuid),'Synthetic archive','Replayed import does not overwrite edits');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-first',pg_temp.site_media(10300))->>'assetId',current_setting('synthetic.site_import_id'),'Source key is idempotent after completion');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-alias',pg_temp.site_media(10300))->>'assetId',current_setting('synthetic.site_import_id'),'Canonical SHA256 deduplicates another source');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-alias',pg_temp.site_media(10300))->>'sourceExisting','false','An unexposed hash alias still requires metadata review on every attempt');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-first',pg_temp.site_media(10300))->>'sourceExisting','false','A completed but unexposed original still requires parity validation');
select is((select count(*) from msrc_content.media_assets where edition_key='synthetic-site-import'),1::bigint,'Import aliases never duplicate asset records');
select is((select count(*) from msrc_content.media_audit where asset_id=current_setting('synthetic.site_import_id')::uuid and event='import.complete'),1::bigint,'Import completion is audited exactly once');
select is(public.msrc_media_published('synthetic-site-import')->'items','[]'::jsonb,'Completed images remain hidden until the whole import is finalized');
select set_config('request.jwt.claims',pg_temp.registration_claims(10300)::text,true);
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-pending',pg_temp.site_media(10302))->>'state','reserved','Another image can still be in flight');
select is(public.msrc_staff_content_import('synthetic-site-import','[]'::jsonb,'["archive-first","archive-pending"]'::jsonb)->>'state','busy','Incomplete source prevents activation of the whole archive');
select is(public.msrc_media_published('synthetic-site-import')->'items','[]'::jsonb,'Incomplete first batch retains the public fallback');
select is(public.msrc_staff_content_import('synthetic-site-import',jsonb_build_array(jsonb_build_object('sourceKey','team-invalid-activation','collection','team',
 'fields',pg_temp.site_team('Synthetic invalid')||'{"titleAr":""}'::jsonb)),'["archive-first"]'::jsonb)->>'state','translation_required','Invalid roster prevents archive activation');
select is(public.msrc_media_published('synthetic-site-import')->'items','[]'::jsonb,'Failed content batch cannot expose a partial archive');
select is(public.msrc_staff_content_import('synthetic-site-import','[]'::jsonb,'["archive-first"]'::jsonb)->>'state','ready','A complete valid import exposes its archive atomically');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-first',pg_temp.site_media(10300))->>'sourceExisting','true','A finalized source is an idempotent rerun even after later edits');
set local role service_role;
select is(jsonb_array_length(public.msrc_media_published('synthetic-site-import')->'items'),1,'Public projection returns published archive');
select is(public.msrc_media_published('synthetic-site-import')->'items'->0->>'slug','synthetic-archive-first','Public slug survives import');
select ok(not((public.msrc_media_published('synthetic-site-import')->'items'->0)?|array['storagePath','rightsEvidence','sha256','uploadedBy','sourceKey']),'Public projection excludes private metadata');
select is(public.msrc_media_published('synthetic-site-other')->'items','[]'::jsonb,'Public projection is edition-scoped');
reset role;

do $$declare r jsonb;begin
 r:=public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'team-photo',pg_temp.site_media(10301));
 perform set_config('synthetic.site_team_import',r->>'importId',true);
 r:=public.msrc_staff_media_import_finish('synthetic-site-import',pg_temp.registration_claims(10300),(r->>'importId')::uuid,pg_temp.site_fields(null));
 if r->>'state'<>'created' then raise exception 'Synthetic roster image import failed';end if;
end$$;
select is(jsonb_array_length(public.msrc_media_published('synthetic-site-import')->'items'),1,'Team photo without archive year stays out of Media page');
select set_config('request.jwt.claims',pg_temp.registration_claims(10301)::text,true);
select is(public.msrc_staff_content_import('synthetic-site-import',pg_temp.site_batch('team-synthetic','Synthetic person'))->>'state','denied','Editor role cannot invoke site content import');
select set_config('request.jwt.claims',pg_temp.registration_claims(10300)::text,true);
select is(public.msrc_staff_content_import('synthetic-site-other','[]'::jsonb)->>'state','denied','Content import enforces edition scope');
select is(public.msrc_staff_content_import('synthetic-site-import',pg_temp.site_batch('team-missing-translation','Synthetic person')||
 jsonb_build_array(jsonb_build_object('sourceKey','team-invalid','collection','team','fields',pg_temp.site_team('Synthetic invalid')||'{"titleAr":""}'::jsonb)))->>'state','translation_required','Invalid member blocks the complete batch');
select is((select count(*) from msrc_content.content_items where edition_key='synthetic-site-import'),0::bigint,'Batch preflight leaves no partially imported content');
select is(public.msrc_staff_content_import('synthetic-site-import',pg_temp.site_batch('team-missing-asset','Synthetic person',gen_random_uuid()))->>'state','media_required','Roster publication requires published same-edition image');
select is(public.msrc_staff_content_import('synthetic-site-import',jsonb_build_array(jsonb_build_object('sourceKey','partner-unapproved','collection','partners',
 'fields',jsonb_build_object('nameEn','Synthetic partner','nameAr','شريك تجريبي','tier','partner','permissionToDisplay',false))))->>'state','permission_required','Existing sponsor publish approval rules remain enforced');
select is(public.msrc_staff_content_import('synthetic-site-import',pg_temp.site_batch('team-synthetic','Synthetic person',current_setting('synthetic.site_team_import')::uuid),'["archive-first","team-photo"]'::jsonb)->>'created','1','Published roster item imports and exposes its complete photo sources');
select is(public.msrc_staff_content_import('synthetic-site-import',pg_temp.site_batch('team-synthetic','Must not replace',current_setting('synthetic.site_team_import')::uuid))->>'existing','1','Content source key deduplicates subsequent imports');
select is((select count(*) from msrc_content.content_publications p join msrc_content.content_items i on i.id=p.item_id where i.edition_key='synthetic-site-import'),1::bigint,'Idempotent import creates one immutable publication');
select is(public.msrc_content_published('synthetic-site-import','team')->'items'->0->'fields'->>'nameEn','Synthetic person','Repeat does not replace published name');
select is(public.msrc_content_published('synthetic-site-import','team')->'items'->0->'fields'->'teamLayout'->'members'->0->>'nameAr','عضو تجريبي','Bilingual committee hierarchy survives public snapshot');
select ok(public.msrc_content_published('synthetic-site-import','team')->'items'->0->'media' is not null,'Published roster links sanitized imported image');
select is((select count(*) from msrc_content.content_audit a join msrc_content.content_items i on i.id=a.item_id where i.source_key='team-synthetic'),2::bigint,'Create and publish receive immutable content audits');
select is((select count(*) from msrc_content.site_import_audit where edition_key='synthetic-site-import'),3::bigint,'Successful activation, roster import and repeat are audited');
select is(msrc_content.team_layout_valid('{"slug":"synthetic","committee":"scientific","kind":"head","parentSlug":null,"noMembers":false,"members":[{"nameEn":"English only"}]}'::jsonb),false,'Layout member translations are required');
select is(msrc_content.team_layout_valid('{"slug":"synthetic","committee":"unknown","kind":"head","parentSlug":null,"noMembers":false,"members":[]}'::jsonb),false,'Unknown committee layouts refused');
select is(msrc_content.content_fields_valid('partners',msrc_content.content_defaults()||jsonb_build_object('teamLayout',pg_temp.site_team('Synthetic')->'teamLayout')),false,'Team hierarchy cannot leak into another collection');

select is(public.msrc_staff_media_update('synthetic-site-import',current_setting('synthetic.site_import_id')::uuid,1,'{"kind":"film","videoPath":"/media/editions/2026/video-1-silent-v2.mp4","durationSeconds":6.7}'::jsonb)->>'state','updated','Staff can select allowlisted static film and duration');
select is(public.msrc_media_published('synthetic-site-import')->'items'->0->>'kind','film','Published archive reflects edited film kind');
select is(public.msrc_staff_media_update('synthetic-site-import',current_setting('synthetic.site_import_id')::uuid,2,'{"videoPath":"/media/editions/2026/../private.mp4"}'::jsonb)->>'state','invalid','Traversal paths are denied');
select is(public.msrc_staff_media_update('synthetic-site-import',current_setting('synthetic.site_import_id')::uuid,2,'{"kind":"photograph"}'::jsonb)->>'state','invalid','Photograph cannot retain film metadata');
select is(public.msrc_staff_media_update('synthetic-site-import',current_setting('synthetic.site_import_id')::uuid,2,'{"kind":"photograph","videoPath":null}'::jsonb)->>'state','updated','Staff editor may convert an imported film without a duration control');
select is((select duration_seconds from msrc_content.media_assets where id=current_setting('synthetic.site_import_id')::uuid),null::numeric,'Photograph conversion clears imported film duration');
select is(public.msrc_staff_media_update('synthetic-site-import',current_setting('synthetic.site_import_id')::uuid,3,'{"displayOrder":2147483648}'::jsonb)->>'state','invalid','Overflow order is rejected before casting');
select is(public.msrc_staff_media_update('synthetic-site-import',current_setting('synthetic.site_team_import')::uuid,1,'{"editionYear":2025,"displayOrder":7}'::jsonb)->>'state','updated','Staff assigns archive year and order');
select is(public.msrc_staff_media_list('synthetic-site-import','all','all',2026)->>'total','0','Search and year filter compose');
select is(public.msrc_staff_media_list('synthetic-site-import','','all',2026)->>'total','1','Year filter returns only matching group');
select is(public.msrc_staff_media_list('synthetic-site-import','','all',2026)->'years','[2026,2025]'::jsonb,'All populated years remain filter choices');
select is(public.msrc_staff_media_list('synthetic-site-import','','all',1800)->>'state','invalid','Year filter validates range');
select is(public.msrc_staff_media_update('synthetic-site-import',current_setting('synthetic.site_team_import')::uuid,2,'{"editionYear":2026,"displayOrder":1}'::jsonb)->>'state','updated','Second image joins same reorder group');
select is(public.msrc_staff_media_reorder('synthetic-site-import',current_setting('synthetic.site_team_import')::uuid,3,'earlier')->>'state','updated','Reorder moves within one year');
select is(public.msrc_media_published('synthetic-site-import')->'items'->0->>'id',current_setting('synthetic.site_team_import'),'Public order follows the staff reorder');
select is(public.msrc_staff_media_update('synthetic-site-import',current_setting('synthetic.site_import_id')::uuid,3,'{"captionEn":"stale"}'::jsonb)->>'state','conflict','Reorder invalidates stale neighbor edits');
select is((select count(*) from msrc_content.media_audit where edition_key='synthetic-site-import' and event='archive.reorder'),2::bigint,'Both moved rows are audited');
select is(public.msrc_staff_media_reorder('synthetic-site-import',current_setting('synthetic.site_team_import')::uuid,3,'later')->>'state','conflict','Stale reorder cannot undo a committed order');
select set_config('synthetic.site_exposure_time',(select exposed_at::text from msrc_content.site_media_imports where id=current_setting('synthetic.site_import_id')::uuid),true);
select is(public.msrc_staff_media_transition_begin('synthetic-site-import',current_setting('synthetic.site_import_id')::uuid,4,'unpublish','e7600000-0000-4000-8000-000000010399')->>'state','reserved','Imported images use ordinary withdrawal reservation');
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_media_published('synthetic-site-import')->'items') i
 where i->>'id'=current_setting('synthetic.site_import_id')),'Public read excludes an image being withdrawn');
select is(public.msrc_staff_media_transition_finish('synthetic-site-import','e7600000-0000-4000-8000-000000010399',pg_temp.registration_claims(10300),true)->>'state','updated','Imported image withdraws after trusted Storage completion');
select ok(not exists(select 1 from jsonb_array_elements(public.msrc_media_published('synthetic-site-import')->'items') i
 where i->>'id'=current_setting('synthetic.site_import_id')),'Public read excludes an unpublished archive image');
select is(public.msrc_staff_media_import_reserve('synthetic-site-import',pg_temp.registration_claims(10300),'archive-first',pg_temp.site_media(10300))->>'state','duplicate','Repeated import recognizes withdrawn media');
select is((select state from msrc_content.media_assets where id=current_setting('synthetic.site_import_id')::uuid),'draft','Repeated import never republishes deliberately withdrawn media');

-- Withdrawal remains authoritative over imported publication; a repeated import
-- never restores an intentionally removed team item.
do $$declare i msrc_content.content_items%rowtype;r jsonb;begin
 select * into strict i from msrc_content.content_items where edition_key='synthetic-site-import' and source_key='team-synthetic';
 r:=public.msrc_staff_content_transition('synthetic-site-import',i.id,i.version,'unpublish');
 if r->>'state'<>'updated' then raise exception 'Synthetic unpublish failed';end if;
end$$;
select is(public.msrc_staff_content_import('synthetic-site-import',pg_temp.site_batch('team-synthetic','Must remain withdrawn'),'["archive-first","team-photo"]'::jsonb)->>'existing','1','Repeat of the complete manifest recognizes withdrawn content and media');
select is(public.msrc_content_published('synthetic-site-import','team')->'items','[]'::jsonb,'Repeat does not republish a withdrawn item');
select is((select exposed_at::text from msrc_content.site_media_imports where id=current_setting('synthetic.site_import_id')::uuid),current_setting('synthetic.site_exposure_time'),'Repeat never resets the original exposure time');
select is((select state from msrc_content.media_assets where id=current_setting('synthetic.site_import_id')::uuid),'draft','Full manifest reimport preserves deliberate media withdrawal');

select * from finish();
rollback;
