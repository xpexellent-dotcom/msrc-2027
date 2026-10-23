-- ENG-062 / MED-01..04, CMS-01, ROL-09/10/12, SEC-01/02/06, LOC-01/03.
-- Pending owner review/application. No staff activation, settings seed or mail.
begin;

create schema msrc_content;
revoke all on schema msrc_content from public,anon,authenticated,service_role;
create function msrc_content.has_text(value text) returns boolean
 language sql immutable security invoker set search_path='' as $$
 select coalesce(regexp_replace(value,'[[:space:]'||chr(160)||chr(65279)||']','','g')<>'',false);
$$;

-- Hosted Supabase always has Storage. The disposable local CI stack runs
-- without it by design (see scripts/ci-storage-fixture.ts), so the bucket and
-- policy DDL is skipped there and verified on hosted after application.
-- Restrictive policies still deny these buckets if a future unrelated permissive
-- policy grants broad storage access. Service-issued signed upload capabilities
-- target one immutable private raw path and bypass ordinary client insert RLS.
do $storage$
begin
 if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
  raise notice 'Storage is not installed; media buckets and policies skipped.';
  return;
 end if;
 execute $m$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('msrc-published-media','msrc-published-media',true,10485760,array['image/webp']),
 ('msrc-media-drafts','msrc-media-drafts',false,10485760,array['image/jpeg','image/png','image/webp','image/avif'])$m$;
 execute $m$create policy msrc_media_no_client_insert on storage.objects as restrictive for insert to anon,authenticated
 with check(bucket_id not in('msrc-published-media','msrc-media-drafts'))$m$;
 execute $m$create policy msrc_media_no_client_update on storage.objects as restrictive for update to anon,authenticated
 using(bucket_id not in('msrc-published-media','msrc-media-drafts'))
 with check(bucket_id not in('msrc-published-media','msrc-media-drafts'))$m$;
 execute $m$create policy msrc_media_no_client_delete on storage.objects as restrictive for delete to anon,authenticated
 using(bucket_id not in('msrc-published-media','msrc-media-drafts'))$m$;
 execute $m$create policy msrc_media_private_no_client_read on storage.objects as restrictive for select to anon,authenticated
 using(bucket_id<>'msrc-media-drafts')$m$;
 execute $m$create policy msrc_media_public_read on storage.objects for select to anon,authenticated
 using(bucket_id='msrc-published-media')$m$;
end
$storage$;

create table msrc_content.media_assets (
 id uuid primary key,
 edition_key text not null references msrc_authorization.edition_config(edition_key) on delete restrict,
 file_name text not null check(char_length(file_name) between 1 and 200 and file_name !~ '[[:cntrl:]]'),
 storage_path text not null unique,public_path text unique,
 mime text not null check(mime='image/webp'),size integer not null check(size between 1 and 10485760),
 width integer not null check(width between 1 and 2560),height integer not null check(height between 1 and 2560),
 alt_en text not null default '' check(char_length(alt_en)<=500 and translate(alt_en,E'\t\r\n','') !~ '[[:cntrl:]]'),
 alt_ar text not null default '' check(char_length(alt_ar)<=500 and translate(alt_ar,E'\t\r\n','') !~ '[[:cntrl:]]'),
 caption_en text not null default '' check(char_length(caption_en)<=2000 and translate(caption_en,E'\t\r\n','') !~ '[[:cntrl:]]'),
 caption_ar text not null default '' check(char_length(caption_ar)<=2000 and translate(caption_ar,E'\t\r\n','') !~ '[[:cntrl:]]'),
 credit_en text not null default '' check(char_length(credit_en)<=500 and translate(credit_en,E'\t\r\n','') !~ '[[:cntrl:]]'),
 credit_ar text not null default '' check(char_length(credit_ar)<=500 and translate(credit_ar,E'\t\r\n','') !~ '[[:cntrl:]]'),
 focal_x numeric not null default 50 check(focal_x between 0 and 100),
 focal_y numeric not null default 50 check(focal_y between 0 and 100),
 rights_confirmed boolean not null default false,
 rights_evidence text not null default '' check(char_length(rights_evidence)<=2000 and translate(rights_evidence,E'\t\r\n','') !~ '[[:cntrl:]]'),
 state text not null default 'draft' check(state in('draft','published','archived')),
 uploaded_by uuid not null,created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),published_at timestamptz,archived_at timestamptz,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),version integer not null default 1 check(version>0),
 pending_operation_id uuid,
 unique(edition_key,sha256),
 check(storage_path=edition_key||'/'||id::text||'/image.webp'),
 check((state='published' and public_path is not null and published_at is not null
 and msrc_content.has_text(alt_en) and msrc_content.has_text(alt_ar) and rights_confirmed and msrc_content.has_text(rights_evidence))
 or (state<>'published' and public_path is null)),
 check((state='archived')=(archived_at is not null))
);
create index media_assets_library on msrc_content.media_assets(edition_key,state,created_at desc,id);
create table msrc_content.media_uploads (
 id uuid primary key default gen_random_uuid(),
 edition_key text not null references msrc_authorization.edition_config(edition_key) on delete restrict,
 file_name text not null,claimed_size integer not null check(claimed_size between 1 and 10485760),
 actor_id uuid not null,session_id uuid not null,
 state text not null default 'pending' check(state in('pending','processing','complete','rejected')),
 asset_id uuid references msrc_content.media_assets(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null,
 completed_at timestamptz,
 check((state='complete')=(asset_id is not null))
);
create index media_uploads_actor on msrc_content.media_uploads(actor_id,created_at desc);
create table msrc_content.media_operations (
 id uuid primary key,asset_id uuid not null references msrc_content.media_assets(id) on delete restrict,
 edition_key text not null,actor_id uuid not null,session_id uuid not null,
 action text not null check(action in('publish','unpublish','archive')),
 source_version integer not null,public_path text,
 state text not null default 'pending' check(state in('pending','complete','failed')),
 created_at timestamptz not null default clock_timestamp(),completed_at timestamptz,
 check((state='pending')=(completed_at is null))
);
create unique index media_one_pending_operation on msrc_content.media_operations(asset_id) where state='pending';
alter table msrc_content.media_assets add constraint media_pending_operation_fk
 foreign key(pending_operation_id) references msrc_content.media_operations(id) on delete restrict;
create table msrc_content.media_audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,asset_id uuid,upload_id uuid,operation_id uuid,
 actor_id uuid not null,session_id uuid not null,
 event text not null check(event in('upload.reserve','upload.claim','upload.complete','upload.duplicate','upload.reject',
 'metadata.update','transition.reserve','transition.complete','transition.failed')),
 before_value jsonb,after_value jsonb,occurred_at timestamptz not null default clock_timestamp()
);
create index media_audit_history on msrc_content.media_audit(edition_key,occurred_at desc,id);
create trigger media_audit_immutable before insert or update or delete on msrc_content.media_audit
 for each row execute function msrc_staff.audit_immutable();
create trigger media_audit_no_truncate before truncate on msrc_content.media_audit
 for each statement execute function msrc_staff.audit_immutable();
do $$declare name text;begin
 foreach name in array array['media_assets','media_uploads','media_operations','media_audit'] loop
 execute format('alter table msrc_content.%I enable row level security',name);
 execute format('alter table msrc_content.%I force row level security',name);
 end loop;
end$$;
revoke all on all tables in schema msrc_content from public,anon,authenticated,service_role;
comment on table msrc_content.media_assets is
 'Private sanitized-image metadata. Published images alone enter the public bucket. sha256 hashes canonical stripped WebP; duplicates retain existing metadata. Focal points are 0..100 object-position percentages.';
comment on table msrc_content.media_operations is
 'Durable external-storage exclusion, never a lease. Only the first begin returns execution permission. Ambiguous provider errors keep the pending lock; owner-reviewed reconciliation must prove prior execution stopped before any recovery. Four public variants move together before service-only completion.';
comment on table msrc_content.media_uploads is
 'Private immutable raw upload reservations; signed URL lifetime is provider-fixed two hours, application claim expires after 15 minutes. Processing claims never expire or replay external writes. Raw and sanitized files never have client read/write policies.';

create function msrc_content.asset_projection(a msrc_content.media_assets) returns jsonb
 language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',a.id,'editionKey',a.edition_key,'fileName',a.file_name,'storagePath',a.storage_path,
 'publicPath',a.public_path,'mime',a.mime,'size',a.size,'width',a.width,'height',a.height,
 'altEn',a.alt_en,'altAr',a.alt_ar,'captionEn',a.caption_en,'captionAr',a.caption_ar,
 'creditEn',a.credit_en,'creditAr',a.credit_ar,'focalX',a.focal_x,'focalY',a.focal_y,
 'rightsConfirmed',a.rights_confirmed,'rightsEvidence',a.rights_evidence,'state',a.state,
 'uploadedBy',a.uploaded_by,'createdAt',a.created_at,'updatedAt',a.updated_at,
 'publishedAt',a.published_at,'archivedAt',a.archived_at,'sha256',a.sha256,'version',a.version,
 'busy',a.pending_operation_id is not null);
$$;
create function msrc_content.record(edition text,event_name text,asset uuid default null,upload uuid default null,
 operation uuid default null,before_data jsonb default null,after_data jsonb default null) returns void
 language sql security definer set search_path='' as $$
 insert into msrc_content.media_audit(edition_key,asset_id,upload_id,operation_id,actor_id,session_id,event,before_value,after_value)
 values(edition,asset,upload,operation,auth.uid(),(auth.jwt()->>'session_id')::uuid,event_name,before_data,after_data);
$$;

create function public.msrc_staff_media_list(edition_key text,search_query text default '',state_filter text default 'all') returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare assets jsonb;total bigint;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if search_query is null or char_length(search_query)>200 or state_filter is null or state_filter not in('all','draft','published','archived') then return jsonb_build_object('state','invalid');end if;
 select count(*) into total from msrc_content.media_assets a where a.edition_key=edition_key
 and (state_filter='all' or a.state=state_filter)
 and (search_query='' or strpos(lower(a.file_name||' '||a.alt_en||' '||a.alt_ar||' '||a.caption_en||' '||a.caption_ar),lower(search_query))>0);
 select coalesce(jsonb_agg(msrc_content.asset_projection(q::msrc_content.media_assets) order by q.created_at desc,q.id),'[]'::jsonb) into assets from
 (select a.* from msrc_content.media_assets a where a.edition_key=edition_key and (state_filter='all' or a.state=state_filter)
 and (search_query='' or strpos(lower(a.file_name||' '||a.alt_en||' '||a.alt_ar||' '||a.caption_en||' '||a.caption_ar),lower(search_query))>0)
 order by a.created_at desc,a.id limit 100) q;
 return jsonb_build_object('state','ready','assets',assets,'total',total);
end$$;
create function public.msrc_staff_media_get(edition_key text,asset_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_content.media_assets%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into a from msrc_content.media_assets m where m.id=asset_id and m.edition_key=edition_key;
 if not found then return jsonb_build_object('state','not_found');end if;
 return jsonb_build_object('state','ready','asset',msrc_content.asset_projection(a));
end$$;
create function public.msrc_staff_media_upload_reserve(edition_key text,file_name text,file_size integer) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare u msrc_content.media_uploads%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if file_name is null or file_name<>btrim(file_name) or char_length(file_name) not between 1 and 200 or file_name ~ '[[:cntrl:]]'
 or file_size is null or file_size not between 1 and 10485760 or edition_key !~ '^[a-zA-Z0-9_-]{1,80}$' then return jsonb_build_object('state','invalid');end if;
 -- Engineering abuse bound, not an editorial capacity or upload allowance.
 perform pg_advisory_xact_lock(hashtextextended('media-upload-rate:'||auth.uid()::text,0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if (select count(*) from msrc_content.media_uploads m where m.actor_id=auth.uid()
 and m.created_at>clock_timestamp()-interval '15 minutes')>=20 then return jsonb_build_object('state','limited');end if;
 insert into msrc_content.media_uploads(edition_key,file_name,claimed_size,actor_id,session_id,expires_at)
 values(edition_key,file_name,file_size,auth.uid(),(auth.jwt()->>'session_id')::uuid,clock_timestamp()+interval '15 minutes') returning * into u;
 perform msrc_content.record(edition_key,'upload.reserve',null,u.id);
 return jsonb_build_object('state','reserved','uploadId',u.id,'storagePath',edition_key||'/'||u.id::text||'/raw','expiresAt',u.expires_at);
end$$;
create function public.msrc_staff_media_upload_claim(edition_key text,upload_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare u msrc_content.media_uploads%rowtype;a msrc_content.media_assets%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into u from msrc_content.media_uploads m where m.id=upload_id and m.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if u.id is null or u.actor_id<>auth.uid() or u.session_id<>(auth.jwt()->>'session_id')::uuid then return jsonb_build_object('state','not_found');end if;
 if u.state='complete' then
 select * into strict a from msrc_content.media_assets m where m.id=u.asset_id;
 return jsonb_build_object('state','completed','asset',msrc_content.asset_projection(a));end if;
 if u.state='processing' then return jsonb_build_object('state','busy');end if;
 if u.state='rejected' or u.expires_at<=clock_timestamp() then return jsonb_build_object('state','expired');end if;
 update msrc_content.media_uploads m set state='processing' where m.id=u.id;
 perform msrc_content.record(edition_key,'upload.claim',null,u.id);
 return jsonb_build_object('state','reserved','uploadId',u.id,'storagePath',edition_key||'/'||u.id::text||'/raw',
 'sanitizedPath',edition_key||'/'||u.id::text||'/image.webp','fileName',u.file_name);
end$$;

create function public.msrc_staff_media_upload_complete(edition_key text,upload_id uuid,session_claims jsonb,media jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
 u msrc_content.media_uploads%rowtype;a msrc_content.media_assets%rowtype;duplicate boolean:=false;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then result:=jsonb_build_object('state','denied');
 else
 select * into u from msrc_content.media_uploads m where m.id=upload_id and m.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then result:=jsonb_build_object('state','denied');
 elsif u.id is null or u.actor_id<>auth.uid() or u.session_id<>(auth.jwt()->>'session_id')::uuid then result:=jsonb_build_object('state','not_found');
 elsif u.state='complete' then select * into strict a from msrc_content.media_assets m where m.id=u.asset_id;
 result:=jsonb_build_object('state','completed','asset',msrc_content.asset_projection(a));
 elsif u.state<>'processing' then result:=jsonb_build_object('state','invalid');
 elsif jsonb_typeof(media) is distinct from 'object' or media->>'mime' is distinct from 'image/webp'
 or coalesce(media->>'sha256','') !~ '^[a-f0-9]{64}$'
 or coalesce(media->>'size','') !~ '^[0-9]{1,8}$' or coalesce(media->>'width','') !~ '^[0-9]{1,4}$' or coalesce(media->>'height','') !~ '^[0-9]{1,4}$'
 then result:=jsonb_build_object('state','invalid');
 elsif (media->>'size')::integer not between 1 and 10485760 or (media->>'width')::integer not between 1 and 2560 or (media->>'height')::integer not between 1 and 2560 then result:=jsonb_build_object('state','invalid');
 else
 -- Serialize dedupe across different uploads without depending on a SELECT's
 -- stale statement snapshot after a conflicting INSERT waits.
 perform pg_advisory_xact_lock(hashtextextended('media-dedupe:'||edition_key||':'||(media->>'sha256'),0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then result:=jsonb_build_object('state','denied');
 else
 select * into a from msrc_content.media_assets m where m.edition_key=edition_key and m.sha256=(media->>'sha256');
 duplicate:=found;
 if not duplicate then
 insert into msrc_content.media_assets(id,edition_key,file_name,storage_path,mime,size,width,height,uploaded_by,sha256)
 values(u.id,edition_key,u.file_name,edition_key||'/'||u.id::text||'/image.webp',media->>'mime',(media->>'size')::integer,
 (media->>'width')::integer,(media->>'height')::integer,auth.uid(),media->>'sha256') returning * into a;
 end if;
 update msrc_content.media_uploads m set state='complete',asset_id=a.id,completed_at=clock_timestamp() where m.id=u.id;
 perform msrc_content.record(edition_key,case when duplicate then 'upload.duplicate' else 'upload.complete' end,a.id,u.id,null,null,msrc_content.asset_projection(a));
 result:=jsonb_build_object('state',case when duplicate then 'duplicate' else 'created' end,'asset',msrc_content.asset_projection(a));
 end if;end if;end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;
create function public.msrc_staff_media_upload_reject(edition_key text,upload_id uuid,session_claims jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;u msrc_content.media_uploads%rowtype;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then result:=jsonb_build_object('state','denied');
 else
 select * into u from msrc_content.media_uploads m where m.id=upload_id and m.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then result:=jsonb_build_object('state','denied');
 elsif u.id is null or u.actor_id<>auth.uid() or u.session_id<>(auth.jwt()->>'session_id')::uuid then result:=jsonb_build_object('state','not_found');
 elsif u.state='rejected' then result:=jsonb_build_object('state','rejected');
 elsif u.state<>'processing' then result:=jsonb_build_object('state','invalid');
 else
 update msrc_content.media_uploads m set state='rejected',completed_at=clock_timestamp() where m.id=u.id;
 perform msrc_content.record(edition_key,'upload.reject',null,u.id);
 result:=jsonb_build_object('state','rejected');end if;end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function public.msrc_staff_media_update(edition_key text,asset_id uuid,expected_version integer,fields jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_content.media_assets%rowtype;b msrc_content.media_assets%rowtype;key text;value jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if expected_version is null or jsonb_typeof(fields) is distinct from 'object' or fields='{}'::jsonb then return jsonb_build_object('state','invalid');end if;
 for key,value in select * from jsonb_each(fields) loop
 if key in('focalX','focalY') then
 if jsonb_typeof(value)<>'number' or (value::text)::numeric not between 0 and 100 then return jsonb_build_object('state','invalid');end if;
 elsif key='rightsConfirmed' then if jsonb_typeof(value)<>'boolean' then return jsonb_build_object('state','invalid');end if;
 elsif key in('altEn','altAr','captionEn','captionAr','creditEn','creditAr','rightsEvidence') then
 if jsonb_typeof(value)<>'string' or translate(fields->>key,E'\t\r\n','') ~ '[[:cntrl:]]'
 or char_length(fields->>key)>(case when key in('captionEn','captionAr','rightsEvidence') then 2000 else 500 end) then return jsonb_build_object('state','invalid');end if;
 else return jsonb_build_object('state','invalid');end if;
 end loop;
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
 if b.state='published' and (not msrc_content.has_text(b.alt_en) or not msrc_content.has_text(b.alt_ar)) then return jsonb_build_object('state','alt_required');end if;
 if b.state='published' and (not b.rights_confirmed or not msrc_content.has_text(b.rights_evidence)) then return jsonb_build_object('state','rights_required');end if;
 update msrc_content.media_assets m set alt_en=b.alt_en,alt_ar=b.alt_ar,caption_en=b.caption_en,caption_ar=b.caption_ar,
 credit_en=b.credit_en,credit_ar=b.credit_ar,focal_x=b.focal_x,focal_y=b.focal_y,rights_confirmed=b.rights_confirmed,
 rights_evidence=b.rights_evidence,version=a.version+1,updated_at=clock_timestamp() where m.id=a.id returning * into b;
 perform msrc_content.record(edition_key,'metadata.update',a.id,null,null,msrc_content.asset_projection(a),msrc_content.asset_projection(b));
 return jsonb_build_object('state','updated','asset',msrc_content.asset_projection(b));
end$$;
create function public.msrc_staff_media_transition_begin(edition_key text,asset_id uuid,expected_version integer,action text,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_content.media_assets%rowtype;o msrc_content.media_operations%rowtype;target text;target_path text;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or expected_version is null or action is null or action not in('publish','unpublish','archive') then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('media-operation:'||operation_id::text,0));
 select * into a from msrc_content.media_assets m where m.id=asset_id and m.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if a.id is null then return jsonb_build_object('state','not_found');end if;
 select * into o from msrc_content.media_operations m where m.id=operation_id;
 if o.id is not null then
 if o.asset_id<>a.id or o.actor_id<>auth.uid() or o.session_id<>(auth.jwt()->>'session_id')::uuid or o.action<>action or o.source_version<>expected_version then return jsonb_build_object('state','conflict');end if;
 if o.state='complete' then return jsonb_build_object('state','completed','asset',msrc_content.asset_projection(a));end if;
 return jsonb_build_object('state',case when o.state='pending' then 'busy' else 'failed' end);end if;
 if a.pending_operation_id is not null then return jsonb_build_object('state','busy');end if;
 if a.version<>expected_version then return jsonb_build_object('state','conflict');end if;
 if (action='publish' and a.state<>'draft') or (action='unpublish' and a.state<>'published') or (action='archive' and a.state='archived') then return jsonb_build_object('state','invalid_transition');end if;
 if action='publish' and (not msrc_content.has_text(a.alt_en) or not msrc_content.has_text(a.alt_ar)) then return jsonb_build_object('state','alt_required');end if;
 if action='publish' and (not a.rights_confirmed or not msrc_content.has_text(a.rights_evidence)) then return jsonb_build_object('state','rights_required');end if;
 target:=case action when 'publish' then 'published' when 'unpublish' then 'draft' else 'archived' end;
 target_path:=case when action='publish' then edition_key||'/'||a.id::text||'/'||operation_id::text||'/image.webp' else a.public_path end;
 insert into msrc_content.media_operations(id,asset_id,edition_key,actor_id,session_id,action,source_version,public_path)
 values(operation_id,a.id,edition_key,auth.uid(),(auth.jwt()->>'session_id')::uuid,action,a.version,target_path);
 update msrc_content.media_assets m set pending_operation_id=operation_id where m.id=a.id returning * into a;
 perform msrc_content.record(edition_key,'transition.reserve',a.id,null,operation_id,null,jsonb_build_object('action',action,'version',a.version));
 return jsonb_build_object('state','reserved','operationId',operation_id,'asset',msrc_content.asset_projection(a),
 'targetState',target,'publicPath',target_path);
end$$;
create function public.msrc_staff_media_transition_finish(edition_key text,operation_id uuid,session_claims jsonb,success boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;
 o msrc_content.media_operations%rowtype;a msrc_content.media_assets%rowtype;b msrc_content.media_assets%rowtype;target_id uuid;
begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Media requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin'],false) is null then result:=jsonb_build_object('state','denied');
 else
 select m.asset_id into target_id from msrc_content.media_operations m where m.id=operation_id and m.edition_key=edition_key;
 select * into a from msrc_content.media_assets m where m.id=target_id for update;
 select * into o from msrc_content.media_operations m where m.id=operation_id and m.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['contentMediaEditor','superAdmin']) is null then result:=jsonb_build_object('state','denied');
 elsif a.id is null or o.id is null or o.actor_id<>auth.uid() or o.session_id<>(auth.jwt()->>'session_id')::uuid then result:=jsonb_build_object('state','not_found');
 elsif success is null then result:=jsonb_build_object('state','invalid');
 elsif o.state<>'pending' then result:=jsonb_build_object('state',case when o.state='complete' then 'completed' else 'failed' end,'asset',msrc_content.asset_projection(a));
 elsif a.pending_operation_id is distinct from o.id or a.version<>o.source_version then result:=jsonb_build_object('state','conflict');
 else
 -- The service calls success only after all four Storage writes/deletions are
 -- confirmed. False means no effects occurred or compensation was proven; an
 -- uncertain network result MUST NOT release this reservation.
 if success then
 update msrc_content.media_assets m set state=case o.action when 'publish' then 'published' when 'unpublish' then 'draft' else 'archived' end,
 public_path=case when o.action='publish' then o.public_path else null end,
 published_at=case when o.action='publish' then clock_timestamp() else m.published_at end,
 archived_at=case when o.action='archive' then clock_timestamp() else null end,
 pending_operation_id=null,version=m.version+1,updated_at=clock_timestamp() where m.id=a.id returning * into b;
 else update msrc_content.media_assets m set pending_operation_id=null where m.id=a.id returning * into b;end if;
 update msrc_content.media_operations m set state=case when success then 'complete' else 'failed' end,completed_at=clock_timestamp() where m.id=o.id;
 perform msrc_content.record(edition_key,case when success then 'transition.complete' else 'transition.failed' end,a.id,null,o.id,msrc_content.asset_projection(a),msrc_content.asset_projection(b));
 result:=jsonb_build_object('state',case when success then 'updated' else 'failed' end,'asset',msrc_content.asset_projection(b));
 end if;end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

revoke all on all functions in schema msrc_content from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_media_list(text,text,text),public.msrc_staff_media_get(text,uuid),
 public.msrc_staff_media_upload_reserve(text,text,integer),public.msrc_staff_media_upload_claim(text,uuid),
 public.msrc_staff_media_upload_complete(text,uuid,jsonb,jsonb),public.msrc_staff_media_upload_reject(text,uuid,jsonb),
 public.msrc_staff_media_update(text,uuid,integer,jsonb),public.msrc_staff_media_transition_begin(text,uuid,integer,text,uuid),
 public.msrc_staff_media_transition_finish(text,uuid,jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_media_list(text,text,text),public.msrc_staff_media_get(text,uuid),
 public.msrc_staff_media_upload_reserve(text,text,integer),public.msrc_staff_media_upload_claim(text,uuid),
 public.msrc_staff_media_update(text,uuid,integer,jsonb),public.msrc_staff_media_transition_begin(text,uuid,integer,text,uuid) to authenticated;
grant execute on function public.msrc_staff_media_upload_complete(text,uuid,jsonb,jsonb),
 public.msrc_staff_media_upload_reject(text,uuid,jsonb),public.msrc_staff_media_transition_finish(text,uuid,jsonb,boolean) to service_role;
commit;
