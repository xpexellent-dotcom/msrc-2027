-- ENG-063 / CMS-01/02/04, ROL-09/10/12, LOC-01/03, SEC-01/02/06.
-- Review-only. No content seed, settings change or hosted activation.
begin;

create table msrc_content.content_items (
 id uuid primary key default gen_random_uuid(),
 edition_key text not null references msrc_authorization.edition_config(edition_key) on delete restrict,
 collection text not null check(collection in('speakers','sessions','partners','team')),
 version integer not null check(version>0),draft jsonb not null check(jsonb_typeof(draft)='object'),
 published_version integer,created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),unique(id,edition_key)
);
create index content_items_collection on msrc_content.content_items(edition_key,collection,id);
create table msrc_content.content_versions (
 item_id uuid not null references msrc_content.content_items(id) on delete restrict,
 version integer not null check(version>0),action text not null check(action in('create','save','publish','unpublish','restore','reorder')),
 fields jsonb not null check(jsonb_typeof(fields)='object'),
 actor_id uuid not null,session_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 primary key(item_id,version)
);
create table msrc_content.content_publications (
 item_id uuid not null,version integer not null,fields jsonb not null check(jsonb_typeof(fields)='object'),
 media jsonb,created_at timestamptz not null default clock_timestamp(),
 primary key(item_id,version),foreign key(item_id,version) references msrc_content.content_versions(item_id,version) on delete restrict
);
alter table msrc_content.content_items add constraint content_current_publication_fk
 foreign key(id,published_version) references msrc_content.content_publications(item_id,version) on delete restrict;
create table msrc_content.content_session_speakers (
 session_id uuid not null,version integer not null,speaker_id uuid not null references msrc_content.content_items(id) on delete restrict,
 position integer not null check(position>=0),primary key(session_id,version,speaker_id),
 unique(session_id,version,position),
 foreign key(session_id,version) references msrc_content.content_versions(item_id,version) on delete restrict
);
create index content_speaker_references on msrc_content.content_session_speakers(speaker_id,session_id,version);
create table msrc_content.content_audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,item_id uuid not null,
 version integer not null,event text not null,actor_id uuid not null,session_id uuid not null,
 before_value jsonb,after_value jsonb not null,occurred_at timestamptz not null default clock_timestamp(),
 foreign key(item_id,version) references msrc_content.content_versions(item_id,version) on delete restrict,
 unique(item_id,version)
);
create index content_audit_history on msrc_content.content_audit(edition_key,occurred_at desc,id);
do $$declare table_name text;begin
 foreach table_name in array array['content_items','content_versions','content_publications','content_session_speakers','content_audit'] loop
 execute format('alter table msrc_content.%I enable row level security',table_name);
 execute format('alter table msrc_content.%I force row level security',table_name);
 if table_name<>'content_items' then
 execute format('create trigger content_append_only before insert or update or delete on msrc_content.%I for each row execute function msrc_staff.audit_immutable()',table_name);
 execute format('create trigger content_no_truncate before truncate on msrc_content.%I for each statement execute function msrc_staff.audit_immutable()',table_name);
 end if;end loop;
end$$;
revoke all on msrc_content.content_items,msrc_content.content_versions,msrc_content.content_publications,
 msrc_content.content_session_speakers,msrc_content.content_audit from public,anon,authenticated,service_role;
comment on table msrc_content.content_items is 'Mutable drafts and an explicit immutable publication pointer. Collections contain no seeded people, dates or sponsor claims.';
comment on table msrc_content.content_publications is 'Append-only approved public snapshots. Draft edits, restoration and reordering do not change the live pointer. Media reads additionally respect current withdrawal.';
comment on table msrc_content.content_session_speakers is 'Immutable many-to-many speaker membership for every programme revision. Current published references prevent withdrawing an in-use speaker.';

create function msrc_content.content_defaults() returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select '{"nameEn":"","nameAr":"","titleEn":"","titleAr":"","affiliationEn":"","affiliationAr":"","bioEn":"","bioAr":"","descriptionEn":"","descriptionAr":"","groupEn":"","groupAr":"","roomEn":"","roomAr":"","day":"","startTime":"","endTime":"","type":"","tier":"","url":"","links":[],"assetId":null,"speakerIds":[],"sortOrder":0,"permissionToDisplay":false}'::jsonb;
$$;
create function msrc_content.content_fields_valid(collection_key text,fields jsonb) returns boolean
 language plpgsql stable security invoker set search_path='' as $$
declare field_name text;value text;f jsonb;max_length integer;day_value date;
begin
 if collection_key is null or collection_key not in('speakers','sessions','partners','team')
 or jsonb_typeof(fields) is distinct from 'object' or octet_length(fields::text)>131072 then return false;end if;
 if exists(select 1 from jsonb_object_keys(fields) k where not(msrc_content.content_defaults()?k)) then return false;end if;
 f:=msrc_content.content_defaults()||fields;
 foreach field_name in array array['nameEn','nameAr','titleEn','titleAr','affiliationEn','affiliationAr','bioEn','bioAr',
 'descriptionEn','descriptionAr','groupEn','groupAr','roomEn','roomAr','day','startTime','endTime','type','tier','url'] loop
 if jsonb_typeof(f->field_name) is distinct from 'string' then return false;end if;
 value:=f->>field_name;max_length:=case when field_name in('bioEn','bioAr','descriptionEn','descriptionAr') then 6000 when field_name='url' then 2000 else 500 end;
 if char_length(value)>max_length or translate(value,E'\t\r\n','') ~ '[[:cntrl:]]' then return false;end if;
 end loop;
 if jsonb_typeof(f->'sortOrder') is distinct from 'number' or (f->>'sortOrder') !~ '^[0-9]{1,7}$'
 or (f->>'sortOrder')::integer>1000000 or jsonb_typeof(f->'permissionToDisplay') is distinct from 'boolean' then return false;end if;
 if f->'assetId'<>'null'::jsonb and (jsonb_typeof(f->'assetId') is distinct from 'string'
 or (f->>'assetId') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$') then return false;end if;
 if jsonb_typeof(f->'links') is distinct from 'array' or jsonb_typeof(f->'speakerIds') is distinct from 'array' then return false;end if;
 if jsonb_array_length(f->'links')>10 or jsonb_array_length(f->'speakerIds')>50 then return false;end if;
 if exists(select 1 from jsonb_array_elements(f->'links') v where jsonb_typeof(v)<>'string'
 or char_length(v#>>'{}')>2000 or (v#>>'{}') !~* '^https://[^/@[:space:]<>"\\]+([/?#][^[:space:]<>"\\]*)?$')
 or ((f->>'url')<>'' and (f->>'url') !~* '^https://[^/@[:space:]<>"\\]+([/?#][^[:space:]<>"\\]*)?$') then return false;end if;
 if exists(select 1 from jsonb_array_elements(f->'speakerIds') v where jsonb_typeof(v)<>'string'
 or (v#>>'{}') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$')
 or (select count(*)<>count(distinct lower(v)) from jsonb_array_elements_text(f->'speakerIds') v) then return false;end if;
 if collection_key<>'sessions' and jsonb_array_length(f->'speakerIds')>0 then return false;end if;
 if (f->>'type') not in('','talk','panel','workshop','break','other') or (f->>'tier') not in('','platinum','gold','silver','partner') then return false;end if;
 if (f->>'startTime')<>'' and (f->>'startTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false;end if;
 if (f->>'endTime')<>'' and (f->>'endTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then return false;end if;
 if (f->>'day')<>'' then
 if (f->>'day') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return false;end if;
 begin day_value:=(f->>'day')::date;exception when datetime_field_overflow or invalid_datetime_format then return false;end;
 if to_char(day_value,'YYYY-MM-DD')<>f->>'day' then return false;end if;
 end if;
 return true;
end$$;

create function msrc_content.content_publish_validation(collection_key text,f jsonb) returns text
 language plpgsql stable security invoker set search_path='' as $$
declare prefix text;
begin
 if not msrc_content.content_fields_valid(collection_key,f) then return 'invalid';end if;
 -- Optional bilingual fields must be supplied in both languages if used.
 foreach prefix in array array['name','title','affiliation','bio','description','group','room'] loop
 if msrc_content.has_text(f->>(prefix||'En'))<>msrc_content.has_text(f->>(prefix||'Ar')) then return 'translation_required';end if;
 end loop;
 if collection_key in('speakers','partners','team') and not(msrc_content.has_text(f->>'nameEn') and msrc_content.has_text(f->>'nameAr')) then return 'translation_required';end if;
 if collection_key in('speakers','sessions','team') and not(msrc_content.has_text(f->>'titleEn') and msrc_content.has_text(f->>'titleAr')) then return 'translation_required';end if;
 if collection_key='team' and not(msrc_content.has_text(f->>'groupEn') and msrc_content.has_text(f->>'groupAr')) then return 'translation_required';end if;
 if collection_key='partners' then
 if (f->>'tier') not in('platinum','gold','silver','partner') then return 'invalid';end if;
 if f->>'permissionToDisplay'<>'true' then return 'permission_required';end if;
 end if;
 if collection_key='sessions' and ((f->>'day')='' or (f->>'startTime')='' or (f->>'endTime')=''
 or (f->>'startTime')>=(f->>'endTime') or (f->>'type') not in('talk','panel','workshop','break','other')) then return 'invalid';end if;
 return 'ready';
end$$;

create function msrc_content.content_projection(i msrc_content.content_items) returns jsonb
 language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',i.id,'collection',i.collection,'version',i.version,'publishedVersion',i.published_version,'draft',i.draft,'updatedAt',i.updated_at);
$$;
create function msrc_content.content_public_fields(collection_key text,f jsonb) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from jsonb_each(f) e(k,v) where k=any(
 case collection_key
 when 'speakers' then array['nameEn','nameAr','titleEn','titleAr','affiliationEn','affiliationAr','bioEn','bioAr','links','sortOrder']
 when 'sessions' then array['titleEn','titleAr','descriptionEn','descriptionAr','roomEn','roomAr','day','startTime','endTime','type','speakerIds','sortOrder']
 when 'partners' then array['nameEn','nameAr','tier','url','sortOrder']
 when 'team' then array['nameEn','nameAr','titleEn','titleAr','groupEn','groupAr','sortOrder'] else array[]::text[] end);
$$;
create function msrc_content.content_record(i msrc_content.content_items,event_name text,before_data jsonb) returns void
 language plpgsql security definer set search_path='' as $$begin
 insert into msrc_content.content_versions(item_id,version,action,fields,actor_id,session_id)
 values(i.id,i.version,event_name,i.draft,auth.uid(),(auth.jwt()->>'session_id')::uuid);
 if i.collection='sessions' then
 insert into msrc_content.content_session_speakers(session_id,version,speaker_id,position)
 select i.id,i.version,v::uuid,(ordinality-1)::integer from jsonb_array_elements_text(i.draft->'speakerIds') with ordinality e(v,ordinality);
 end if;
 insert into msrc_content.content_audit(edition_key,item_id,version,event,actor_id,session_id,before_value,after_value)
 values(i.edition_key,i.id,i.version,event_name,auth.uid(),(auth.jwt()->>'session_id')::uuid,before_data,msrc_content.content_projection(i));
end$$;

create function public.msrc_staff_content_list(edition_key text,collection_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Content requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if collection_key is null or collection_key not in('speakers','sessions','partners','team') then return jsonb_build_object('state','invalid');end if;
 select coalesce(jsonb_agg(msrc_content.content_projection(i) order by (i.draft->>'sortOrder')::integer,i.id),'[]'::jsonb)
 into result from msrc_content.content_items i where i.edition_key=edition_key and i.collection=collection_key;
 return jsonb_build_object('state','ready','items',result);
end$$;
create function public.msrc_staff_content_save(edition_key text,collection_key text,item_id uuid,expected_version integer,fields jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare i msrc_content.content_items%rowtype;before_data jsonb;f jsonb;asset msrc_content.media_assets%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Content requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if not msrc_content.content_fields_valid(collection_key,fields) or expected_version is null or expected_version<0 then return jsonb_build_object('state','invalid');end if;
 f:=msrc_content.content_defaults()||fields;
 perform pg_advisory_xact_lock(hashtextextended('content-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if f->>'assetId' is not null then
 select * into asset from msrc_content.media_assets a where a.id=(f->>'assetId')::uuid and a.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if asset.id is null or asset.state<>'published' or asset.pending_operation_id is not null then return jsonb_build_object('state','media_required');end if;
 end if;
 if exists(select 1 from jsonb_array_elements_text(f->'speakerIds') v where not exists(select 1 from msrc_content.content_items s
 where s.id=v::uuid and s.edition_key=edition_key and s.collection='speakers')) then return jsonb_build_object('state','invalid');end if;
 if item_id is null then
 if expected_version<>0 then return jsonb_build_object('state','conflict');end if;
 -- Payload/abuse bound only; this is not an event attendance capacity.
 if (select count(*) from msrc_content.content_items c where c.edition_key=edition_key and c.collection=collection_key)>=1000 then return jsonb_build_object('state','limited');end if;
 insert into msrc_content.content_items(edition_key,collection,version,draft) values(edition_key,collection_key,1,f) returning * into i;
 perform msrc_content.content_record(i,'create',null);
 else
 select * into i from msrc_content.content_items c where c.id=item_id and c.edition_key=edition_key and c.collection=collection_key for update;
 if i.id is null or i.version<>expected_version then return jsonb_build_object('state','conflict');end if;
 before_data:=msrc_content.content_projection(i);
 update msrc_content.content_items c set version=c.version+1,draft=f,updated_at=clock_timestamp() where c.id=i.id returning * into i;
 perform msrc_content.content_record(i,'save',before_data);
 end if;
 return jsonb_build_object('state','updated','item',msrc_content.content_projection(i));
end$$;

create function public.msrc_staff_content_transition(edition_key text,item_id uuid,expected_version integer,action text,restore_version integer default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare i msrc_content.content_items%rowtype;before_data jsonb;f jsonb;validation text;media jsonb;asset msrc_content.media_assets%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Content requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if action is null or action not in('publish','unpublish','restore') or expected_version is null or expected_version<1 then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('content-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into i from msrc_content.content_items c where c.id=item_id and c.edition_key=edition_key for update;
 if i.id is null or i.version<>expected_version then return jsonb_build_object('state','conflict');end if;
 before_data:=msrc_content.content_projection(i);f:=i.draft;
 if action='restore' then
 select v.fields into f from msrc_content.content_versions v where v.item_id=i.id and v.version=restore_version;
 if f is null then return jsonb_build_object('state','invalid');end if;
 elsif action='unpublish' then
 if i.collection='speakers' and exists(select 1 from msrc_content.content_session_speakers link
 join msrc_content.content_items s on s.id=link.session_id and s.published_version=link.version where link.speaker_id=i.id) then return jsonb_build_object('state','referenced');end if;
 elsif action='publish' then
 validation:=msrc_content.content_publish_validation(i.collection,f);
 if validation<>'ready' then return jsonb_build_object('state',validation);end if;
 if exists(select 1 from jsonb_array_elements_text(f->'speakerIds') v where not exists(select 1 from msrc_content.content_items s
 where s.id=v::uuid and s.edition_key=edition_key and s.collection='speakers' and s.published_version is not null)) then return jsonb_build_object('state','invalid');end if;
 if f->>'assetId' is not null then
 select * into asset from msrc_content.media_assets a where a.id=(f->>'assetId')::uuid and a.edition_key=edition_key for update;
 if asset.id is null or asset.state<>'published' or asset.pending_operation_id is not null then return jsonb_build_object('state','media_required');end if;
 -- Only approved public metadata enters the snapshot; no storagePath, actor or rights evidence.
 media:=jsonb_build_object('path',asset.public_path,'altEn',asset.alt_en,'altAr',asset.alt_ar,'width',asset.width,'height',asset.height,'focalX',asset.focal_x,'focalY',asset.focal_y);
 end if;
 end if;
 -- Recheck exact-session authority after any asset row wait.
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 update msrc_content.content_items c set version=c.version+1,draft=f,
 published_version=case when action='unpublish' then null else c.published_version end,updated_at=clock_timestamp() where c.id=i.id returning * into i;
 -- Versions must exist before immutable publications and their current pointer.
 if action='publish' then
 i.published_version:=i.version;
 perform msrc_content.content_record(i,action,before_data);
 insert into msrc_content.content_publications(item_id,version,fields,media) values(i.id,i.version,msrc_content.content_public_fields(i.collection,f),media);
 update msrc_content.content_items c set published_version=i.version where c.id=i.id returning * into i;
 else perform msrc_content.content_record(i,action,before_data);end if;
 return jsonb_build_object('state','updated','item',msrc_content.content_projection(i));
end$$;

create function public.msrc_staff_content_history(edition_key text,item_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Content requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if not exists(select 1 from msrc_content.content_items i where i.id=item_id and i.edition_key=edition_key) then return jsonb_build_object('state','conflict');end if;
 select coalesce(jsonb_agg(jsonb_build_object('version',v.version,'action',v.action,'fields',v.fields,'createdAt',v.created_at) order by v.version desc),'[]'::jsonb)
 into result from (select h.* from msrc_content.content_versions h where h.item_id=item_id order by h.version desc limit 1000) v;
 return jsonb_build_object('state','ready','history',result);
end$$;
create function public.msrc_staff_content_reorder(edition_key text,collection_key text,items jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare entry jsonb;i msrc_content.content_items%rowtype;before_data jsonb;position integer:=0;result jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Content requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if collection_key is null or collection_key not in('speakers','sessions','partners','team') or jsonb_typeof(items) is distinct from 'array' then return jsonb_build_object('state','invalid');end if;
 if jsonb_array_length(items)>1000 or exists(select 1 from jsonb_array_elements(items) e where jsonb_typeof(e) is distinct from 'object'
 or coalesce(e->>'id','') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
 or jsonb_typeof(e->'version') is distinct from 'number' or coalesce(e->>'version','') !~ '^[1-9][0-9]{0,8}$')
 or (select count(*)<>count(distinct lower(e->>'id')) from jsonb_array_elements(items) e) then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('content-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 -- Complete-collection CAS prevents partial reorder, stale create and lost edits.
 if jsonb_array_length(items)<>(select count(*) from msrc_content.content_items c where c.edition_key=edition_key and c.collection=collection_key)
 or exists(select 1 from jsonb_array_elements(items) e where not exists(select 1 from msrc_content.content_items c
 where c.id=(e->>'id')::uuid and c.edition_key=edition_key and c.collection=collection_key and c.version=(e->>'version')::integer)) then return jsonb_build_object('state','conflict');end if;
 for entry in select value from jsonb_array_elements(items) loop
 select * into strict i from msrc_content.content_items c where c.id=(entry->>'id')::uuid for update;
 before_data:=msrc_content.content_projection(i);
 update msrc_content.content_items c set version=c.version+1,draft=jsonb_set(c.draft,'{sortOrder}',to_jsonb(position)),updated_at=clock_timestamp() where c.id=i.id returning * into i;
 perform msrc_content.content_record(i,'reorder',before_data);position:=position+1;
 end loop;
 select coalesce(jsonb_agg(msrc_content.content_projection(c) order by (c.draft->>'sortOrder')::integer,c.id),'[]'::jsonb)
 into result from msrc_content.content_items c where c.edition_key=edition_key and c.collection=collection_key;
 return jsonb_build_object('state','updated','items',result);
end$$;

create function public.msrc_content_published(edition_key text,collection_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb;
begin
 perform msrc_registration.server_only();
 if collection_key is null or collection_key not in('speakers','sessions','partners','team') then return jsonb_build_object('items','[]'::jsonb);end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'collection',i.collection,'version',p.version,'fields',p.fields,
 'media',case when a.state='published' and a.pending_operation_id is null and a.public_path=(p.media->>'path') then p.media else null end)
 order by (p.fields->>'sortOrder')::integer,i.id),'[]'::jsonb) into result
 from msrc_content.content_items i join msrc_content.content_publications p on p.item_id=i.id and p.version=i.published_version
 left join msrc_content.content_versions v on v.item_id=p.item_id and v.version=p.version
 left join msrc_content.media_assets a on a.id=(v.fields->>'assetId')::uuid and a.edition_key=i.edition_key
 where i.edition_key=edition_key and i.collection=collection_key;
 return jsonb_build_object('items',result);
end$$;

revoke all on all functions in schema msrc_content from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_content_list(text,text),public.msrc_staff_content_save(text,text,uuid,integer,jsonb),
 public.msrc_staff_content_transition(text,uuid,integer,text,integer),public.msrc_staff_content_history(text,uuid),
 public.msrc_staff_content_reorder(text,text,jsonb),public.msrc_content_published(text,text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_content_list(text,text),public.msrc_staff_content_save(text,text,uuid,integer,jsonb),
 public.msrc_staff_content_transition(text,uuid,integer,text,integer),public.msrc_staff_content_history(text,uuid),
 public.msrc_staff_content_reorder(text,text,jsonb) to authenticated;
grant execute on function public.msrc_content_published(text,text) to service_role;
commit;
