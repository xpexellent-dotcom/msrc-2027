-- ENG-067. Pending owner application. MED-01..04, CMS-01..04, ARC-01, ROL-10,
-- LOC-01/03, SEC-01/02/06. No data seed or workflow activation.
begin;

alter table msrc_content.media_assets
 add column edition_year integer check(edition_year between 1900 and 2200),
 add column kind text not null default 'photograph' check(kind in('photograph','film')),
 add column display_order integer not null default 0 check(display_order>=0),
 add column video_path text,
 add column source_slug text check(source_slug ~ '^[a-z0-9][a-z0-9-]{0,199}$'),
 add column duration_seconds numeric check(duration_seconds>0 and duration_seconds<=86400),
 add constraint media_archive_video_path check(
  (kind='photograph' and video_path is null and duration_seconds is null)
  or (kind='film' and video_path is not null and video_path in(
   '/media/editions/2026/video-1-silent-v2.mp4','/media/editions/2026/video-2-silent-v2.mp4',
   '/media/editions/2026/video-3-silent-v2.mp4','/media/editions/2026/video-4-silent-v2.mp4')));
create unique index media_archive_source_slug on msrc_content.media_assets(edition_key,source_slug) where source_slug is not null;
create index media_archive_order on msrc_content.media_assets(edition_key,edition_year desc,display_order,id);

-- A reservation is durable, never an expiring lease. Only the initial reserve
-- result permits immutable external writes. An ambiguous Storage result leaves
-- the reservation pending for owner-reviewed reconciliation, as ordinary media.
create table msrc_content.site_media_imports (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_authorization.edition_config(edition_key),
 source_key text not null check(source_key ~ '^[a-z0-9][a-z0-9:._/-]{0,199}$'),
 actor_id uuid not null,session_id uuid not null,
 file_name text not null check(char_length(file_name) between 1 and 200 and file_name !~ '[[:cntrl:]]'),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 size integer not null check(size between 1 and 10485760),
 width integer not null check(width between 1 and 2560),height integer not null check(height between 1 and 2560),
 state text not null check(state in('pending','complete')),
 asset_id uuid references msrc_content.media_assets(id),
 created_at timestamptz not null default clock_timestamp(),completed_at timestamptz,exposed_at timestamptz,
 unique(edition_key,source_key),
 check((state='complete' and asset_id is not null and completed_at is not null)
 or (state='pending' and asset_id is null and completed_at is null)),
 check(exposed_at is null or state='complete')
);
create unique index site_media_one_pending_digest on msrc_content.site_media_imports(edition_key,sha256) where state='pending';
create table msrc_content.site_import_audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,actor_id uuid not null,session_id uuid not null,
 summary jsonb not null check(jsonb_typeof(summary)='object'),occurred_at timestamptz not null default clock_timestamp()
);
alter table msrc_content.site_media_imports enable row level security;
alter table msrc_content.site_media_imports force row level security;
alter table msrc_content.site_import_audit enable row level security;
alter table msrc_content.site_import_audit force row level security;
revoke all on msrc_content.site_media_imports,msrc_content.site_import_audit from public,anon,authenticated,service_role;
create trigger site_import_audit_immutable before insert or update or delete on msrc_content.site_import_audit
 for each row execute function msrc_staff.audit_immutable();
create trigger site_import_audit_no_truncate before truncate on msrc_content.site_import_audit
 for each statement execute function msrc_staff.audit_immutable();
alter table msrc_content.media_audit drop constraint media_audit_event_check;
alter table msrc_content.media_audit add constraint media_audit_event_check check(event in(
 'upload.reserve','upload.claim','upload.complete','upload.duplicate','upload.reject','metadata.update',
 'transition.reserve','transition.complete','transition.failed','archive.reorder','import.reserve','import.complete','import.duplicate'));
alter table msrc_content.content_items add column source_key text check(source_key ~ '^[a-z0-9][a-z0-9:._/-]{0,199}$');
create unique index content_site_import_source on msrc_content.content_items(edition_key,source_key) where source_key is not null;

create function msrc_content.media_fields_valid(fields jsonb) returns boolean
 language plpgsql immutable security invoker set search_path='' as $$
declare field_name text;value jsonb;number_value numeric;
begin
 if jsonb_typeof(fields) is distinct from 'object' or fields='{}'::jsonb then return false;end if;
 for field_name,value in select * from jsonb_each(fields) loop
 if field_name in('focalX','focalY') then
  if jsonb_typeof(value) is distinct from 'number' then return false;end if;
  if (value::text)::numeric not between 0 and 100 then return false;end if;
 elsif field_name='editionYear' then
  if value<>'null'::jsonb then
   if jsonb_typeof(value) is distinct from 'number' or value::text !~ '^[0-9]{4}$' then return false;end if;
   if (value::text)::integer not between 1900 and 2200 then return false;end if;
  end if;
 elsif field_name='displayOrder' then
  if jsonb_typeof(value) is distinct from 'number' or value::text !~ '^[0-9]{1,10}$' then return false;end if;
  if (value::text)::numeric>2147483647 then return false;end if;
 elsif field_name='durationSeconds' then
  if value<>'null'::jsonb then
   if jsonb_typeof(value) is distinct from 'number' then return false;end if;
   number_value:=(value::text)::numeric;if number_value<=0 or number_value>86400 then return false;end if;
  end if;
 elsif field_name='kind' then
  if jsonb_typeof(value) is distinct from 'string' or fields->>field_name not in('photograph','film') then return false;end if;
 elsif field_name='videoPath' then
  if value<>'null'::jsonb and (jsonb_typeof(value) is distinct from 'string' or fields->>field_name not in(
   '/media/editions/2026/video-1-silent-v2.mp4','/media/editions/2026/video-2-silent-v2.mp4',
   '/media/editions/2026/video-3-silent-v2.mp4','/media/editions/2026/video-4-silent-v2.mp4')) then return false;end if;
 elsif field_name='sourceSlug' then
  if value<>'null'::jsonb and (jsonb_typeof(value) is distinct from 'string' or fields->>field_name !~ '^[a-z0-9][a-z0-9-]{0,199}$') then return false;end if;
 elsif field_name='rightsConfirmed' then
  if jsonb_typeof(value) is distinct from 'boolean' then return false;end if;
 elsif field_name in('altEn','altAr','captionEn','captionAr','creditEn','creditAr','rightsEvidence') then
  if jsonb_typeof(value) is distinct from 'string' or translate(fields->>field_name,E'\t\r\n','') ~ '[[:cntrl:]]'
  or char_length(fields->>field_name)>(case when field_name in('captionEn','captionAr','rightsEvidence') then 2000 else 500 end) then return false;end if;
 else return false;end if;
 end loop;
 return true;
end$$;

create or replace function msrc_content.asset_projection(a msrc_content.media_assets) returns jsonb
 language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',a.id,'editionKey',a.edition_key,'fileName',a.file_name,'storagePath',a.storage_path,
 'publicPath',a.public_path,'mime',a.mime,'size',a.size,'width',a.width,'height',a.height,
 'altEn',a.alt_en,'altAr',a.alt_ar,'captionEn',a.caption_en,'captionAr',a.caption_ar,
 'creditEn',a.credit_en,'creditAr',a.credit_ar,'focalX',a.focal_x,'focalY',a.focal_y,
 'rightsConfirmed',a.rights_confirmed,'rightsEvidence',a.rights_evidence,'state',a.state,
 'uploadedBy',a.uploaded_by,'createdAt',a.created_at,'updatedAt',a.updated_at,
 'publishedAt',a.published_at,'archivedAt',a.archived_at,'sha256',a.sha256,'version',a.version,
 'busy',a.pending_operation_id is not null,'editionYear',a.edition_year,'kind',a.kind,'displayOrder',a.display_order,
 'videoPath',a.video_path,'sourceSlug',a.source_slug,'durationSeconds',a.duration_seconds);
$$;

drop function public.msrc_staff_media_list(text,text,text);
create function public.msrc_staff_media_list(edition_key text,search_query text default '',state_filter text default 'all',year_filter integer default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare assets jsonb;total bigint;years jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if search_query is null or char_length(search_query)>200 or state_filter is null or state_filter not in('all','draft','published','archived')
 or (year_filter is not null and year_filter not between 1900 and 2200) then return jsonb_build_object('state','invalid');end if;
 select count(*) into total from msrc_content.media_assets a where a.edition_key=edition_key
 and (state_filter='all' or a.state=state_filter) and (year_filter is null or a.edition_year=year_filter)
 and (search_query='' or strpos(lower(a.file_name||' '||a.alt_en||' '||a.alt_ar||' '||a.caption_en||' '||a.caption_ar),lower(search_query))>0);
 select coalesce(jsonb_agg(msrc_content.asset_projection(q::msrc_content.media_assets) order by q.edition_year desc nulls last,q.display_order,q.id),'[]'::jsonb) into assets from
 (select a.* from msrc_content.media_assets a where a.edition_key=edition_key and (state_filter='all' or a.state=state_filter)
 and (year_filter is null or a.edition_year=year_filter)
 and (search_query='' or strpos(lower(a.file_name||' '||a.alt_en||' '||a.alt_ar||' '||a.caption_en||' '||a.caption_ar),lower(search_query))>0)
 order by a.edition_year desc nulls last,a.display_order,a.id limit 100) q;
 select coalesce(jsonb_agg(y.edition_year order by y.edition_year desc),'[]'::jsonb) into years from
 (select distinct a.edition_year from msrc_content.media_assets a where a.edition_key=edition_key and a.edition_year is not null) y;
 return jsonb_build_object('state','ready','assets',assets,'total',total,'years',years);
end$$;

create or replace function public.msrc_staff_media_update(edition_key text,asset_id uuid,expected_version integer,fields jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_content.media_assets%rowtype;b msrc_content.media_assets%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if expected_version is null or not msrc_content.media_fields_valid(fields) then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('media-order:'||edition_key,0));
 select * into a from msrc_content.media_assets m where m.id=asset_id and m.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if a.id is null then return jsonb_build_object('state','not_found');end if;
 if a.pending_operation_id is not null then return jsonb_build_object('state','busy');end if;
 if a.version<>expected_version then return jsonb_build_object('state','conflict');end if;
 if a.state='archived' then return jsonb_build_object('state','invalid_transition');end if;
 b:=a;
 b.alt_en:=coalesce(btrim(fields->>'altEn',E' \t\r\n'),a.alt_en);b.alt_ar:=coalesce(btrim(fields->>'altAr',E' \t\r\n'),a.alt_ar);
 b.caption_en:=coalesce(btrim(fields->>'captionEn',E' \t\r\n'),a.caption_en);b.caption_ar:=coalesce(btrim(fields->>'captionAr',E' \t\r\n'),a.caption_ar);
 b.credit_en:=coalesce(btrim(fields->>'creditEn',E' \t\r\n'),a.credit_en);b.credit_ar:=coalesce(btrim(fields->>'creditAr',E' \t\r\n'),a.credit_ar);
 b.focal_x:=coalesce((fields->>'focalX')::numeric,a.focal_x);b.focal_y:=coalesce((fields->>'focalY')::numeric,a.focal_y);
 b.rights_confirmed:=coalesce((fields->>'rightsConfirmed')::boolean,a.rights_confirmed);b.rights_evidence:=coalesce(btrim(fields->>'rightsEvidence',E' \t\r\n'),a.rights_evidence);
 if fields?'editionYear' then b.edition_year:=(fields->>'editionYear')::integer;end if;
 b.kind:=coalesce(fields->>'kind',a.kind);b.display_order:=coalesce((fields->>'displayOrder')::integer,a.display_order);
 if fields?'videoPath' then b.video_path:=fields->>'videoPath';end if;
 if fields?'durationSeconds' then b.duration_seconds:=(fields->>'durationSeconds')::numeric;end if;
 -- The staff editor does not ask authors to manage technical duration values.
 -- Clear a formerly known duration when its film changes or becomes a photo.
 if not(fields?'durationSeconds') and (b.kind='photograph' or b.video_path is distinct from a.video_path) then b.duration_seconds:=null;end if;
 if fields?'sourceSlug' then b.source_slug:=fields->>'sourceSlug';end if;
 if (b.kind='photograph' and (b.video_path is not null or b.duration_seconds is not null))
 or (b.kind='film' and b.video_path is null) then return jsonb_build_object('state','invalid');end if;
 if b.source_slug is not null and exists(select 1 from msrc_content.media_assets m where m.edition_key=edition_key and m.source_slug=b.source_slug and m.id<>a.id) then return jsonb_build_object('state','conflict');end if;
 if b.state='published' and (not msrc_content.has_text(b.alt_en) or not msrc_content.has_text(b.alt_ar)) then return jsonb_build_object('state','alt_required');end if;
 if b.state='published' and (not b.rights_confirmed or not msrc_content.has_text(b.rights_evidence)) then return jsonb_build_object('state','rights_required');end if;
 update msrc_content.media_assets m set alt_en=b.alt_en,alt_ar=b.alt_ar,caption_en=b.caption_en,caption_ar=b.caption_ar,
 credit_en=b.credit_en,credit_ar=b.credit_ar,focal_x=b.focal_x,focal_y=b.focal_y,rights_confirmed=b.rights_confirmed,
 rights_evidence=b.rights_evidence,edition_year=b.edition_year,kind=b.kind,display_order=b.display_order,video_path=b.video_path,
 source_slug=b.source_slug,duration_seconds=b.duration_seconds,version=a.version+1,updated_at=clock_timestamp() where m.id=a.id returning * into b;
 perform msrc_content.record(edition_key,'metadata.update',a.id,null,null,msrc_content.asset_projection(a),msrc_content.asset_projection(b));
 return jsonb_build_object('state','updated','asset',msrc_content.asset_projection(b));
end$$;

create function public.msrc_staff_media_reorder(edition_key text,asset_id uuid,expected_version integer,direction text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_content.media_assets%rowtype;b msrc_content.media_assets%rowtype;old_value msrc_content.media_assets%rowtype;
 ids uuid[];position integer;target integer;row_id uuid;ordinal integer:=0;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if direction is null or direction not in('earlier','later') or expected_version is null or expected_version<1 then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('media-order:'||edition_key,0));
 select * into a from msrc_content.media_assets m where m.id=asset_id and m.edition_key=edition_key;
 if a.id is null then return jsonb_build_object('state','not_found');end if;
 -- Every row in the group is locked in UUID order, then projected in display
 -- order. Normalization also gives deterministic movement to tied positions.
 perform m.id from msrc_content.media_assets m where m.edition_key=edition_key and m.edition_year is not distinct from a.edition_year order by m.id for update;
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into a from msrc_content.media_assets m where m.id=asset_id;
 if a.version<>expected_version then return jsonb_build_object('state','conflict');end if;
 if exists(select 1 from msrc_content.media_assets m where m.edition_key=edition_key and m.edition_year is not distinct from a.edition_year and m.pending_operation_id is not null) then return jsonb_build_object('state','busy');end if;
 select array_agg(m.id order by m.display_order,m.id) into ids from msrc_content.media_assets m
 where m.edition_key=edition_key and m.edition_year is not distinct from a.edition_year;
 position:=array_position(ids,asset_id);target:=position+case direction when 'earlier' then -1 else 1 end;
 if target<1 or target>cardinality(ids) then return jsonb_build_object('state','updated','asset',msrc_content.asset_projection(a));end if;
 ids[position]:=ids[target];ids[target]:=asset_id;
 foreach row_id in array ids loop
 select * into strict old_value from msrc_content.media_assets m where m.id=row_id;
 if old_value.display_order<>ordinal or row_id in(asset_id,ids[position]) then
 update msrc_content.media_assets m set display_order=ordinal,version=m.version+1,updated_at=clock_timestamp() where m.id=row_id returning * into b;
 perform msrc_content.record(edition_key,'archive.reorder',row_id,null,null,msrc_content.asset_projection(old_value),msrc_content.asset_projection(b));
 end if;ordinal:=ordinal+1;
 end loop;
 select * into strict a from msrc_content.media_assets m where m.id=asset_id;
 return jsonb_build_object('state','updated','asset',msrc_content.asset_projection(a));
end$$;

create function public.msrc_media_published(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb;
begin
 perform msrc_registration.server_only();
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'slug',coalesce(a.source_slug,a.id::text),'sourceSlug',a.source_slug,
 'publicPath',a.public_path,'altEn',a.alt_en,'altAr',a.alt_ar,'captionEn',a.caption_en,'captionAr',a.caption_ar,
 'focalX',a.focal_x,'focalY',a.focal_y,'width',a.width,'height',a.height,'editionYear',a.edition_year,
 'kind',a.kind,'displayOrder',a.display_order,'videoPath',a.video_path,'durationSeconds',a.duration_seconds)
 order by a.edition_year desc,a.display_order,a.id),'[]'::jsonb) into result from msrc_content.media_assets a
 where a.edition_key=edition_key and a.state='published' and a.pending_operation_id is null and a.edition_year is not null
 and not exists(select 1 from msrc_content.site_media_imports i where i.id=a.id and i.exposed_at is null);
 return jsonb_build_object('items',result);
end$$;

create function public.msrc_staff_media_import_reserve(edition_key text,session_claims jsonb,source_key text,media jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
 r msrc_content.site_media_imports%rowtype;a msrc_content.media_assets%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then result:=jsonb_build_object('state','denied');
 elsif source_key is null or source_key !~ '^[a-z0-9][a-z0-9:._/-]{0,199}$' or jsonb_typeof(media) is distinct from 'object'
 or coalesce(media->>'sha256','') !~ '^[a-f0-9]{64}$' or jsonb_typeof(media->'fileName') is distinct from 'string'
 or char_length(media->>'fileName') not between 1 and 200 or (media->>'fileName') ~ '[[:cntrl:]]'
 or jsonb_typeof(media->'size') is distinct from 'number' or coalesce(media->>'size','') !~ '^[1-9][0-9]{0,7}$'
 or jsonb_typeof(media->'width') is distinct from 'number' or coalesce(media->>'width','') !~ '^[1-9][0-9]{0,3}$'
 or jsonb_typeof(media->'height') is distinct from 'number' or coalesce(media->>'height','') !~ '^[1-9][0-9]{0,3}$' then result:=jsonb_build_object('state','invalid');
 elsif (media->>'size')::integer>10485760 or (media->>'width')::integer>2560 or (media->>'height')::integer>2560 then result:=jsonb_build_object('state','invalid');
 else
 perform pg_advisory_xact_lock(hashtextextended('media-import:'||edition_key,0));
 perform pg_advisory_xact_lock(hashtextextended('media-dedupe:'||edition_key||':'||(media->>'sha256'),0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then result:=jsonb_build_object('state','denied');
 else
 select * into r from msrc_content.site_media_imports i where i.edition_key=edition_key and i.source_key=source_key;
 if r.id is not null then
 if r.state='pending' then result:=jsonb_build_object('state','busy');
 else select * into strict a from msrc_content.media_assets m where m.id=r.asset_id;
 result:=jsonb_build_object('state','duplicate','assetId',a.id,'asset',msrc_content.asset_projection(a),'sourceExisting',r.exposed_at is not null);end if;
 elsif exists(select 1 from msrc_content.site_media_imports i where i.edition_key=edition_key and i.sha256=(media->>'sha256') and i.state='pending') then result:=jsonb_build_object('state','busy');
 else
 select * into a from msrc_content.media_assets m where m.edition_key=edition_key and m.sha256=(media->>'sha256');
 insert into msrc_content.site_media_imports(edition_key,source_key,actor_id,session_id,file_name,sha256,size,width,height,state,asset_id,completed_at)
 values(edition_key,source_key,auth.uid(),(auth.jwt()->>'session_id')::uuid,media->>'fileName',media->>'sha256',(media->>'size')::integer,
 (media->>'width')::integer,(media->>'height')::integer,case when a.id is null then 'pending' else 'complete' end,a.id,case when a.id is not null then clock_timestamp() end) returning * into r;
 perform msrc_content.record(edition_key,case when a.id is null then 'import.reserve' else 'import.duplicate' end,a.id,null,r.id,null,jsonb_build_object('sourceKey',source_key,'importId',r.id));
 if a.id is not null then result:=jsonb_build_object('state','duplicate','assetId',a.id,'asset',msrc_content.asset_projection(a),'sourceExisting',false);
 else result:=jsonb_build_object('state','reserved','importId',r.id,'storagePath',edition_key||'/'||r.id::text||'/image.webp',
 'publicPath',edition_key||'/'||r.id::text||'/'||r.id::text||'/image.webp');end if;
 end if;end if;end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function public.msrc_staff_media_import_finish(edition_key text,session_claims jsonb,import_id uuid,fields jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
 r msrc_content.site_media_imports%rowtype;a msrc_content.media_assets%rowtype;duplicate boolean;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then result:=jsonb_build_object('state','denied');
 elsif not msrc_content.media_fields_valid(fields) then result:=jsonb_build_object('state','invalid');
 elsif not(msrc_content.has_text(fields->>'altEn') and msrc_content.has_text(fields->>'altAr')) then result:=jsonb_build_object('state','alt_required');
 elsif fields->>'rightsConfirmed' is distinct from 'true' or not msrc_content.has_text(fields->>'rightsEvidence') then result:=jsonb_build_object('state','rights_required');
 elsif (coalesce(fields->>'kind','photograph')='film' and fields->>'videoPath' is null)
 or (coalesce(fields->>'kind','photograph')='photograph' and (fields->>'videoPath' is not null or fields->>'durationSeconds' is not null)) then result:=jsonb_build_object('state','invalid');
 else
 perform pg_advisory_xact_lock(hashtextextended('media-import:'||edition_key,0));
 select * into r from msrc_content.site_media_imports i where i.id=import_id and i.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then result:=jsonb_build_object('state','denied');
 elsif r.id is null or r.actor_id<>auth.uid() or r.session_id<>(auth.jwt()->>'session_id')::uuid then result:=jsonb_build_object('state','not_found');
 elsif r.state='complete' then select * into strict a from msrc_content.media_assets m where m.id=r.asset_id;
 result:=jsonb_build_object('state','duplicate','assetId',a.id,'asset',msrc_content.asset_projection(a),'sourceExisting',r.exposed_at is not null);
 else
 perform pg_advisory_xact_lock(hashtextextended('media-dedupe:'||edition_key||':'||r.sha256,0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then result:=jsonb_build_object('state','denied');
 else
 select * into a from msrc_content.media_assets m where m.edition_key=edition_key and m.sha256=r.sha256;duplicate:=found;
 if not duplicate then
 if fields->>'sourceSlug' is not null and exists(select 1 from msrc_content.media_assets m where m.edition_key=edition_key and m.source_slug=fields->>'sourceSlug') then result:=jsonb_build_object('state','conflict');
 else
 insert into msrc_content.media_assets(id,edition_key,file_name,storage_path,public_path,mime,size,width,height,
 alt_en,alt_ar,caption_en,caption_ar,credit_en,credit_ar,focal_x,focal_y,rights_confirmed,rights_evidence,
 state,uploaded_by,published_at,sha256,edition_year,kind,display_order,video_path,source_slug,duration_seconds)
 values(r.id,edition_key,r.file_name,edition_key||'/'||r.id::text||'/image.webp',edition_key||'/'||r.id::text||'/'||r.id::text||'/image.webp',
 'image/webp',r.size,r.width,r.height,btrim(fields->>'altEn',E' \t\r\n'),btrim(fields->>'altAr',E' \t\r\n'),
 coalesce(fields->>'captionEn',''),coalesce(fields->>'captionAr',''),coalesce(fields->>'creditEn',''),coalesce(fields->>'creditAr',''),
 coalesce((fields->>'focalX')::numeric,50),coalesce((fields->>'focalY')::numeric,50),true,fields->>'rightsEvidence',
 'published',auth.uid(),clock_timestamp(),r.sha256,(fields->>'editionYear')::integer,coalesce(fields->>'kind','photograph'),
 coalesce((fields->>'displayOrder')::integer,0),fields->>'videoPath',fields->>'sourceSlug',(fields->>'durationSeconds')::numeric) returning * into a;
 end if;end if;
 if result is null then
 update msrc_content.site_media_imports i set state='complete',asset_id=a.id,completed_at=clock_timestamp() where i.id=r.id;
 perform msrc_content.record(edition_key,case when duplicate then 'import.duplicate' else 'import.complete' end,a.id,null,r.id,null,msrc_content.asset_projection(a));
 result:=jsonb_build_object('state',case when duplicate then 'duplicate' else 'created' end,'assetId',a.id,'asset',msrc_content.asset_projection(a),'unusedUpload',duplicate,'sourceExisting',false);
 end if;end if;end if;end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function msrc_content.team_layout_valid(layout jsonb) returns boolean
 language plpgsql immutable security invoker set search_path='' as $$
declare member jsonb;
begin
 if layout='null'::jsonb then return true;end if;
 if jsonb_typeof(layout) is distinct from 'object' then return false;end if;
 if exists(select 1 from jsonb_object_keys(layout) k where k not in('slug','committee','kind','parentSlug','noMembers','members'))
 or jsonb_typeof(layout->'slug') is distinct from 'string' or coalesce(layout->>'slug','') !~ '^[a-z0-9][a-z0-9-]{0,127}$'
 or coalesce(layout->>'committee','') not in('scientific','organization') or coalesce(layout->>'kind','') not in('head','lead','co-lead')
 or jsonb_typeof(layout->'noMembers') is distinct from 'boolean' or jsonb_typeof(layout->'members') is distinct from 'array'
 or not(layout?'parentSlug') then return false;end if;
 if layout->'parentSlug'<>'null'::jsonb and (jsonb_typeof(layout->'parentSlug') is distinct from 'string'
 or (layout->>'parentSlug') !~ '^[a-z0-9][a-z0-9-]{0,127}$') then return false;end if;
 if (layout->>'kind'='co-lead')<>(layout->>'parentSlug' is not null) then return false;end if;
 if jsonb_array_length(layout->'members')>100 then return false;end if;
 for member in select value from jsonb_array_elements(layout->'members') loop
 if jsonb_typeof(member) is distinct from 'object' then return false;end if;
 if exists(select 1 from jsonb_object_keys(member) k where k not in('nameEn','nameAr'))
 or jsonb_typeof(member->'nameEn') is distinct from 'string' or jsonb_typeof(member->'nameAr') is distinct from 'string'
 or not msrc_content.has_text(member->>'nameEn') or not msrc_content.has_text(member->>'nameAr')
 or char_length(member->>'nameEn')>500 or char_length(member->>'nameAr')>500
 or ((member->>'nameEn')||(member->>'nameAr')) ~ '[[:cntrl:]]' then return false;end if;
 end loop;
 return true;
end$$;

create or replace function msrc_content.content_defaults() returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select '{"nameEn":"","nameAr":"","titleEn":"","titleAr":"","affiliationEn":"","affiliationAr":"","bioEn":"","bioAr":"","descriptionEn":"","descriptionAr":"","groupEn":"","groupAr":"","roomEn":"","roomAr":"","day":"","startTime":"","endTime":"","type":"","tier":"","url":"","links":[],"assetId":null,"speakerIds":[],"sortOrder":0,"permissionToDisplay":false,"teamLayout":null}'::jsonb;
$$;

create or replace function msrc_content.content_fields_valid(collection_key text,fields jsonb) returns boolean
 language plpgsql stable security invoker set search_path='' as $$
declare field_name text;value text;f jsonb;max_length integer;day_value date;
begin
 if collection_key is null or collection_key not in('speakers','sessions','partners','team')
 or jsonb_typeof(fields) is distinct from 'object' or octet_length(fields::text)>131072 then return false;end if;
 if exists(select 1 from jsonb_object_keys(fields) k where not(msrc_content.content_defaults()?k)) then return false;end if;
 f:=msrc_content.content_defaults()||fields;
 if not msrc_content.team_layout_valid(f->'teamLayout') then return false;end if;
 if collection_key<>'team' and f->'teamLayout'<>'null'::jsonb then return false;end if;
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

create or replace function msrc_content.content_public_fields(collection_key text,f jsonb) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(k,v),'{}'::jsonb) from jsonb_each(f) e(k,v) where k=any(
 case collection_key
 when 'speakers' then array['nameEn','nameAr','titleEn','titleAr','affiliationEn','affiliationAr','bioEn','bioAr','links','sortOrder']
 when 'sessions' then array['titleEn','titleAr','descriptionEn','descriptionAr','roomEn','roomAr','day','startTime','endTime','type','speakerIds','sortOrder']
 when 'partners' then array['nameEn','nameAr','tier','url','sortOrder']
 when 'team' then array['nameEn','nameAr','titleEn','titleAr','groupEn','groupAr','descriptionEn','descriptionAr','url','teamLayout','sortOrder'] else array[]::text[] end);
$$;

create function public.msrc_staff_content_import(edition_key text,items jsonb,media_sources jsonb default '[]'::jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare entry jsonb;f jsonb;item_result jsonb;publish_result jsonb;existing_item msrc_content.content_items%rowtype;
 created integer:=0;existing integer:=0;item_id uuid;validation text;asset msrc_content.media_assets%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Content requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if jsonb_typeof(items) is distinct from 'array' then return jsonb_build_object('state','invalid');end if;
 if jsonb_array_length(items)>1000 then return jsonb_build_object('state','invalid');end if;
 if jsonb_typeof(media_sources) is distinct from 'array' then return jsonb_build_object('state','invalid');end if;
 if jsonb_array_length(media_sources)>1000 or exists(select 1 from jsonb_array_elements(media_sources) v where jsonb_typeof(v) is distinct from 'string'
 or (v#>>'{}') !~ '^[a-z0-9][a-z0-9:._/-]{0,199}$')
 or (select count(*)<>count(distinct v) from jsonb_array_elements_text(media_sources) v) then return jsonb_build_object('state','invalid');end if;
 for entry in select value from jsonb_array_elements(items) loop
 if jsonb_typeof(entry) is distinct from 'object' then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from jsonb_object_keys(entry) k where k not in('sourceKey','collection','fields'))
 or jsonb_typeof(entry->'sourceKey') is distinct from 'string' or (entry->>'sourceKey') !~ '^[a-z0-9][a-z0-9:._/-]{0,199}$'
 or coalesce(entry->>'collection','') not in('team','partners') or not msrc_content.content_fields_valid(entry->>'collection',entry->'fields') then return jsonb_build_object('state','invalid');end if;
 f:=msrc_content.content_defaults()||(entry->'fields');
 validation:=msrc_content.content_publish_validation(entry->>'collection',f);
 if validation<>'ready' then return jsonb_build_object('state',validation);end if;
 end loop;
 if (select count(*)<>count(distinct e->>'sourceKey') from jsonb_array_elements(items) e) then return jsonb_build_object('state','invalid');end if;
 -- Source completion and archive exposure serialize before the content lock.
 -- Publication never switches the archive to a partially uploaded first batch.
 perform pg_advisory_xact_lock(hashtextextended('media-import:'||edition_key,0));
 perform pg_advisory_xact_lock(hashtextextended('content-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if exists(select 1 from jsonb_array_elements_text(media_sources) s where not exists(
 select 1 from msrc_content.site_media_imports i where i.edition_key=edition_key and i.source_key=s)) then return jsonb_build_object('state','conflict');end if;
 if exists(select 1 from msrc_content.site_media_imports i where i.edition_key=edition_key and i.source_key in(select value from jsonb_array_elements_text(media_sources))
 and i.state<>'complete') then return jsonb_build_object('state','busy');end if;
 perform a.id from msrc_content.media_assets a where a.id in(select i.asset_id from msrc_content.site_media_imports i
 where i.edition_key=edition_key and i.source_key in(select value from jsonb_array_elements_text(media_sources))) order by a.id for update;
 if exists(select 1 from msrc_content.site_media_imports i join msrc_content.media_assets a on a.id=i.asset_id
 where i.edition_key=edition_key and i.source_key in(select value from jsonb_array_elements_text(media_sources))
 and i.exposed_at is null and (a.state<>'published' or a.pending_operation_id is not null)) then return jsonb_build_object('state','media_required');end if;
 -- Preflight the whole batch. Existing source keys are never republished or
 -- restored, including items an editor deliberately unpublished after import.
 for entry in select value from jsonb_array_elements(items) loop
 select * into existing_item from msrc_content.content_items i where i.edition_key=edition_key and i.source_key=entry->>'sourceKey';
 if existing_item.id is not null then
 if existing_item.collection<>entry->>'collection' then return jsonb_build_object('state','conflict');end if;
 else
 f:=msrc_content.content_defaults()||(entry->'fields');
 if f->>'assetId' is not null then
 select * into asset from msrc_content.media_assets a where a.id=(f->>'assetId')::uuid and a.edition_key=edition_key for update;
 if asset.id is null or asset.state<>'published' or asset.pending_operation_id is not null then return jsonb_build_object('state','media_required');end if;
 end if;end if;
 end loop;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 begin
 for entry in select value from jsonb_array_elements(items) loop
 select * into existing_item from msrc_content.content_items i where i.edition_key=edition_key and i.source_key=entry->>'sourceKey';
 if existing_item.id is not null then existing:=existing+1;
 else
 item_result:=public.msrc_staff_content_save(edition_key,entry->>'collection',null,0,entry->'fields');
 if item_result->>'state'<>'updated' then raise exception using errcode='P7501',message=coalesce(item_result->>'state','invalid');end if;
 item_id:=(item_result->'item'->>'id')::uuid;
 update msrc_content.content_items i set source_key=entry->>'sourceKey' where i.id=item_id;
 publish_result:=public.msrc_staff_content_transition(edition_key,item_id,(item_result->'item'->>'version')::integer,'publish');
 if publish_result->>'state'<>'updated' then raise exception using errcode='P7501',message=coalesce(publish_result->>'state','invalid');end if;
 created:=created+1;
 end if;end loop;
 update msrc_content.site_media_imports i set exposed_at=clock_timestamp() where i.edition_key=edition_key and i.exposed_at is null
 and i.source_key in(select value from jsonb_array_elements_text(media_sources));
 insert into msrc_content.site_import_audit(edition_key,actor_id,session_id,summary)
 values(edition_key,auth.uid(),(auth.jwt()->>'session_id')::uuid,jsonb_build_object('action','content.import','created',created,'existing',existing,'mediaSources',media_sources));
 exception when sqlstate 'P7501' then return jsonb_build_object('state',sqlerrm);end;
 return jsonb_build_object('state','ready','created',created,'existing',existing);
end$$;

-- These grants are explicit even though the containing schema is private.
revoke all on all functions in schema msrc_content from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_media_list(text,text,text,integer),public.msrc_staff_media_reorder(text,uuid,integer,text),
 public.msrc_media_published(text),public.msrc_staff_media_import_reserve(text,jsonb,text,jsonb),
 public.msrc_staff_media_import_finish(text,jsonb,uuid,jsonb),public.msrc_staff_content_import(text,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_media_list(text,text,text,integer),public.msrc_staff_media_reorder(text,uuid,integer,text),public.msrc_staff_content_import(text,jsonb,jsonb) to authenticated;
grant execute on function public.msrc_media_published(text),public.msrc_staff_media_import_reserve(text,jsonb,text,jsonb),
 public.msrc_staff_media_import_finish(text,jsonb,uuid,jsonb) to service_role;

commit;
