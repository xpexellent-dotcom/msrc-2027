-- ENG-090 / ORG-069, ORG-068. ABS-04/10/11/12/15, REV-01--09.
-- Review only: no settings rows, activation, hosted apply, files, AI or delivery.
begin;

-- Not enabled by an earlier migration. Supabase lists pg_trgm as available.
-- Keep a shingle fallback for a Postgres installation without the extension.
do $$begin
 if exists(select 1 from pg_available_extensions where name='pg_trgm') then
  create extension if not exists pg_trgm with schema extensions;
 end if;
end$$;

create function msrc_abstracts.rubric_2027() returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select '[{"id":"significance","label":"Significance and Contribution","weight":20,"min":1,"max":4},
 {"id":"objectives","label":"Research Question and Objectives","weight":15,"min":1,"max":4},
 {"id":"methodology","label":"Methodology and Rigor","weight":20,"min":1,"max":4},
 {"id":"results","label":"Results and Alignment","weight":15,"min":1,"max":4},
 {"id":"conclusions","label":"Conclusions and Impact","weight":10,"min":1,"max":4},
 {"id":"clarity","label":"Clarity and Writing","weight":10,"min":1,"max":4},
 {"id":"structure","label":"Structure and Completeness","weight":10,"min":1,"max":4}]'::jsonb;
$$;
create function msrc_abstracts.weighted_total_2027(scores jsonb) returns numeric
 language plpgsql stable security invoker set search_path='' as $$
declare r jsonb;s jsonb;n numeric:=0;begin
 if jsonb_typeof(scores) is distinct from 'array' then return null;end if;
 if jsonb_array_length(scores)<>7 or (select count(*)<>count(distinct x->>'criterionId') from jsonb_array_elements(scores) x) then return null;end if;
 for r in select value from jsonb_array_elements(msrc_abstracts.rubric_2027()) loop
  select x into s from jsonb_array_elements(scores) x where x->>'criterionId'=r->>'id';
  if not found or s<>jsonb_build_object('criterionId',s->'criterionId','value',s->'value')
   or jsonb_typeof(s->'value') is distinct from 'number' then return null;end if;
  if (s->>'value')::numeric not between 1 and 4 or trunc((s->>'value')::numeric)<>(s->>'value')::numeric then return null;end if;
  n:=n+(r->>'weight')::numeric*((s->>'value')::numeric-1);
 end loop;
 return round(n/3,2);
end$$;
create function msrc_abstracts.review_settings_ready_2027(c jsonb) returns boolean
 language plpgsql stable security invoker set search_path='' as $$begin
 if not msrc_abstracts.settings_valid(c,false) then return false;end if;
 return coalesce(c->'rubric'=msrc_abstracts.rubric_2027() and c->>'reviewersPerAbstract'='2'
  and c->>'reviewDeadline' is not null and length(btrim(c->>'blindingPolicy'))>0
  and c->>'aggregationPolicy'='weighted_normalized_mean' and c->>'notApplicablePolicy'='all_required',false);
end$$;

create table msrc_abstracts.screening_settings (
 edition_key text not null references msrc_abstracts.settings(edition_key),version integer not null check(version>0),
 bands jsonb,similarity_threshold numeric check(similarity_threshold between 0 and 100),
 oral_capacity integer check(oral_capacity>=0),actor_id uuid not null,session_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),primary key(edition_key,version)
);
comment on table msrc_abstracts.screening_settings is 'ORG-069 provisional pilot settings, append-only. NO default row or active suggested bands. Similarity is a 0--100 signal, strictly below threshold. Capacity is optional and never inferred.';
create table msrc_abstracts.screenings (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null,submission_version integer not null,
 sequence integer not null check(sequence>0),status text not null check(status in('pending','passed','failed_correctable','failed_final')),
 actor_id uuid not null,session_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 operation_id uuid not null unique,input_hash bytea not null,input jsonb not null,note text not null,
 investigation boolean not null,investigation_note text not null,similarity_threshold numeric,similarity_matches jsonb not null,
 external_checked boolean not null,external_reference text not null,
 unique(submission_id,submission_version,sequence),
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version)
);
create table msrc_abstracts.screening_gates (
 screening_id uuid not null references msrc_abstracts.screenings(id),gate integer not null check(gate between 1 and 7),
 passed boolean,note text not null,actor_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 correctable boolean,primary key(screening_id,gate)
);
create table msrc_abstracts.additional_reviews (
 submission_id uuid not null,submission_version integer not null,required_reviews integer not null check(required_reviews between 3 and 5),
 expected_required integer not null check(expected_required between 2 and 4),
 actor_id uuid not null,session_id uuid not null,note text not null,operation_id uuid not null unique,
 created_at timestamptz not null default clock_timestamp(),primary key(submission_id,submission_version,required_reviews),
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version)
);
comment on table msrc_abstracts.additional_reviews is 'Human routing of borderline/disputed work through existing assignments. Initial pilot quorum is two; an explicit request can use the incumbent REV-02 one-to-five assignment range. No new slot capacity is inferred.';
alter table msrc_abstracts.assignments add column scoring_rule text check(scoring_rule='msrc2027_org069');
alter table msrc_abstracts.scorecard_versions add column scoring_rule text check(scoring_rule='msrc2027_org069');
comment on column msrc_abstracts.assignments.scoring_rule is 'NULL preserves legacy score history. Only newly submitted ORG-069 human cards count in the 2027 aggregate; immutable historical settings/scorecards are not rewritten.';
do $$declare t text;begin
 foreach t in array array['screening_settings','screenings','screening_gates','additional_reviews'] loop
  execute format('alter table msrc_abstracts.%I enable row level security',t);
  execute format('alter table msrc_abstracts.%I force row level security',t);
  execute format('create trigger abstract_append_only before insert or update or delete on msrc_abstracts.%I for each row execute function msrc_staff.audit_immutable()',t);
  execute format('create trigger abstract_no_truncate before truncate on msrc_abstracts.%I for each statement execute function msrc_staff.audit_immutable()',t);
 end loop;
end$$;
revoke all on msrc_abstracts.screening_settings,msrc_abstracts.screenings,msrc_abstracts.screening_gates,msrc_abstracts.additional_reviews from public,anon,authenticated,service_role;
create function msrc_abstracts.required_reviews_2027(submission uuid,submission_version integer default null) returns integer
 language sql stable security invoker set search_path='' as $$
 select coalesce((select max(r.required_reviews) from msrc_abstracts.additional_reviews r
  join msrc_abstracts.submissions s on s.id=r.submission_id
  where s.id=submission and r.submission_version=coalesce(required_reviews_2027.submission_version,s.version)),2);
$$;
create function public.msrc_staff_research_request_review(edition_key text,submission_id uuid,expected_required integer,required_reviews integer,note text,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;previous msrc_abstracts.additional_reviews%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if expected_required is null or expected_required not between 2 and 4 or required_reviews is null or required_reviews not between 3 and 5 or required_reviews<=expected_required
  or note is null or length(btrim(note)) not between 1 and 3000 or operation_id is null then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('abstract-additional-review:'||operation_id::text,0));
 perform 1 from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if s.id is null or s.finalized_at is null then return jsonb_build_object('state','unavailable');end if;
 select * into previous from msrc_abstracts.additional_reviews r where r.operation_id=operation_id;
 if found then
  if previous.submission_id<>s.id or previous.submission_version<>s.version or previous.actor_id<>auth.uid() or previous.required_reviews<>required_reviews or previous.expected_required<>expected_required or previous.note<>note then return jsonb_build_object('state','conflict');end if;
  return jsonb_build_object('state','updated');
 end if;
 if s.status not in('submitted','scientific_review') or not coalesce(msrc_abstracts.screening_current(s.id),false) then return jsonb_build_object('state','screening_required');end if;
 if msrc_abstracts.required_reviews_2027(s.id)<>expected_required then return jsonb_build_object('state','conflict');end if;
 insert into msrc_abstracts.additional_reviews(submission_id,submission_version,required_reviews,expected_required,actor_id,session_id,note,operation_id)
 values(s.id,s.version,required_reviews,expected_required,auth.uid(),(auth.jwt()->>'session_id')::uuid,note,operation_id);
 perform msrc_abstracts.record(edition_key,'review.additional_requested',s.id,jsonb_build_object('submissionVersion',s.version,'requiredReviews',required_reviews));
 return jsonb_build_object('state','updated');
end$$;

create function msrc_abstracts.screening_automatic(d jsonb) returns jsonb
 language plpgsql stable security invoker set search_path='' as $$
declare result jsonb:='[]'::jsonb;complete boolean;presenter jsonb;ethics boolean;registration boolean;begin
 result:=jsonb_build_array(jsonb_build_object('gate',1,'passed',msrc_abstracts.word_count(d->'body')<=350,'note','ORG-068: 350 words including six headings; title and authors excluded.'));
 select not exists(select 1 from unnest(array['background','objectives','methods','results','limitations','conclusion']) k
  where jsonb_typeof(d->'body'->k) is distinct from 'string' or msrc_abstracts.word_count(jsonb_build_object('background',d->'body'->>k))<=6) into complete;
 result:=result||jsonb_build_array(jsonb_build_object('gate',2,'passed',complete,'note','All six required sections must contain a countable token.'),
  jsonb_build_object('gate',3,'passed',msrc_abstracts.word_count(jsonb_build_object('background',d->'body'->>'results'))>6,'note','Existing at-least-one-result completeness rule; scientific validity is human reviewed.'));
 select a into presenter from jsonb_array_elements(coalesce(d->'authors','[]'::jsonb)) a where a->>'id'=d->>'presentingAuthorId';
 complete:=coalesce(btrim(presenter->>'name')<>'',false) and coalesce(presenter->>'email'~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$',false)
  and jsonb_typeof(presenter->'affiliations')='array' and jsonb_array_length(presenter->'affiliations')>0
  and not exists(select 1 from jsonb_array_elements_text(presenter->'affiliations') f where btrim(f)='')
  and coalesce(btrim(d->'supervisor'->>'fullName')<>'',false) and coalesce(d->'supervisor'->>'email'~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$',false)
  and not exists(select 1 from jsonb_array_elements(coalesce(d->'authors','[]'::jsonb)) a where coalesce(btrim(a->>'name'),'')='')
  and coalesce(btrim(d->>'specialtyId')<>'',false) and coalesce(btrim(d->>'studyTypeId')<>'',false)
  and (d->>'studyTypeId'<>'other' or coalesce(btrim(d->>'studyTypeOther')<>'',false))
  and msrc_abstracts.word_count(jsonb_build_object('background',d->>'title'))-6 between 1 and 20;
 result:=result||jsonb_build_array(jsonb_build_object('gate',4,'passed',coalesce(complete,false),'note','Presenter name/email/institution frozen from the authoritative profile; supervisor name/email, co-author names, specialty, title (20 words), study type.'));
 ethics:=case d->'ethics'->>'status'
  when 'approved' then coalesce(btrim(d->'ethics'->>'committee')<>'',false) and coalesce(btrim(d->'ethics'->>'reference')<>'',false)
  when 'exempt' then coalesce(btrim(d->'ethics'->>'reference')<>'',false) or coalesce(btrim(d->'ethics'->>'explanation')<>'',false)
  when 'not_required' then coalesce(btrim(d->'ethics'->>'explanation')<>'',false) else false end;
 registration:=case d->'registration'->>'status' when 'not_applicable' then true when 'registered' then
  coalesce(btrim(d->'registration'->>'registry')<>'',false) and coalesce(btrim(d->'registration'->>'number')<>'',false) else false end;
 return result||jsonb_build_array(jsonb_build_object('gate',5,'passed',ethics and registration,'note','ORG-068 ethics/registration completeness only. Staff confirmation is also required; confidential evidence remains Super Admin only.'));
end$$;
create function msrc_abstracts.similarity_text(d jsonb) returns text
 language sql immutable security invoker set search_path='' as $$
 select lower(concat_ws(' ',d->'body'->>'background',coalesce(d->'body'->>'objectives',d->'body'->>'aim'),d->'body'->>'methods',d->'body'->>'results',d->'body'->>'limitations',d->'body'->>'conclusion'));
$$;
create function msrc_abstracts.shingles(t text) returns table(shingle text)
 language sql immutable security invoker set search_path='' as $$
 with tokens as (select regexp_split_to_array(btrim(regexp_replace(lower(t),'[^a-z0-9]+',' ','g')),' +') words)
 select distinct array_to_string(words[i:least(i+2,cardinality(words))],' ') from tokens,
 lateral generate_series(1,greatest(1,cardinality(words)-2)) i where coalesce(words[1],'')<>'';
$$;
create function msrc_abstracts.shingle_similarity(a text,b text) returns numeric
 language sql immutable security invoker set search_path='' as $$
 with aa as(select shingle from msrc_abstracts.shingles(a)),bb as(select shingle from msrc_abstracts.shingles(b)),
 shared as(select shingle from aa intersect select shingle from bb),combined as(select shingle from aa union select shingle from bb)
 select coalesce(100.0*(select count(*) from shared)/nullif((select count(*) from combined),0),0);
$$;
create function msrc_abstracts.similarity_score(a text,b text) returns numeric
 language plpgsql stable security invoker set search_path='' as $$
declare extension_schema text;score numeric;begin
 select n.nspname into extension_schema from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pg_trgm';
 if found then execute format('select %I.similarity($1,$2)::numeric*100',extension_schema) into score using a,b;
 else
  score:=msrc_abstracts.shingle_similarity(a,b);
 end if;
 return score;
end$$;
create function msrc_abstracts.similarity_matches(submission uuid) returns jsonb
 language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'reference',m.reference,'title',m.title,'edition',m.edition_key,'version',m.version,'score',m.score) order by m.score desc,m.id),'[]'::jsonb)
 from (select other.id,other.reference,other.document->>'title' title,other.edition_key,other.version,
  msrc_abstracts.similarity_score(msrc_abstracts.similarity_text(x.document),msrc_abstracts.similarity_text(coalesce(ox.document,other.document))) score
  from msrc_abstracts.submissions s join msrc_abstracts.snapshots x on x.submission_id=s.id and x.version=s.version
  join msrc_abstracts.submissions other on other.id<>s.id
  left join msrc_abstracts.snapshots ox on ox.submission_id=other.id and ox.version=other.version
  where s.id=submission and (other.edition_key=s.edition_key or exists(
   select 1 from msrc_abstracts.decisions d join msrc_abstracts.publications p on p.decision_id=d.id where d.submission_id=other.id and d.outcome='accept'))
  order by score desc,other.id limit 5) m;
$$;
create function msrc_abstracts.screening_current(submission uuid) returns boolean
 language sql stable security invoker set search_path='' as $$
 select coalesce(r.status='passed' and not r.investigation and r.similarity_threshold is not distinct from cfg.similarity_threshold
  and cfg.similarity_threshold is not null and coalesce((msrc_abstracts.similarity_matches(s.id)->0->>'score')::numeric,0)<cfg.similarity_threshold,false)
 from msrc_abstracts.submissions s
 left join lateral(select q.* from msrc_abstracts.screenings q where q.submission_id=s.id and q.submission_version=s.version order by q.sequence desc limit 1) r on true
 left join lateral(select q.* from msrc_abstracts.screening_settings q where q.edition_key=s.edition_key order by q.version desc limit 1) cfg on true where s.id=submission;
$$;
create function msrc_abstracts.screening_gates_json(screening uuid) returns jsonb
 language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('gate',gate,'passed',passed,'note',note) order by gate),'[]'::jsonb) from msrc_abstracts.screening_gates where screening_id=screening;
$$;
create function msrc_abstracts.screening_projection(submission uuid) returns jsonb
 language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('sequence',coalesce(r.sequence,0),'status',coalesce(r.status,'pending'),
  'investigation',coalesce(r.investigation,false),'investigationNote',coalesce(r.investigation_note,''),'actorId',r.actor_id,'at',r.created_at,
  'gates',msrc_abstracts.screening_gates_json(r.id),'automatic',msrc_abstracts.screening_automatic(x.document),
  'ethicsNote',coalesce(r.input->'ethics'->>'note',''),'externalChecked',coalesce(r.external_checked,false),'externalReference',coalesce(r.external_reference,''),
  'similarityThreshold',cfg.similarity_threshold,'matches',msrc_abstracts.similarity_matches(s.id),'current',coalesce(msrc_abstracts.screening_current(s.id),false),
  'specialty',x.document->>'specialtyId','history',coalesce((select jsonb_agg(jsonb_build_object('sequence',h.sequence,'status',h.status,'investigation',h.investigation,
   'actorId',h.actor_id,'at',h.created_at,'note',h.note,'gates',msrc_abstracts.screening_gates_json(h.id)) order by h.sequence desc)
   from msrc_abstracts.screenings h where h.submission_id=s.id and h.submission_version=s.version),'[]'::jsonb))
 from msrc_abstracts.submissions s join msrc_abstracts.snapshots x on x.submission_id=s.id and x.version=s.version
 left join lateral(select q.* from msrc_abstracts.screenings q where q.submission_id=s.id and q.submission_version=s.version order by q.sequence desc limit 1) r on true
 left join lateral(select q.* from msrc_abstracts.screening_settings q where q.edition_key=s.edition_key order by q.version desc limit 1) cfg on true where s.id=submission;
$$;
create function msrc_abstracts.bands_valid(b jsonb) returns boolean
 language plpgsql stable security invoker set search_path='' as $$
declare k text;begin
 if b is null or b='null'::jsonb then return true;end if;
 if jsonb_typeof(b) is distinct from 'object' or b<>jsonb_build_object('oralMin',b->'oralMin','posterMin',b->'posterMin','borderlineMin',b->'borderlineMin','acceptanceMin',b->'acceptanceMin') then return false;end if;
 foreach k in array array['oralMin','posterMin','borderlineMin','acceptanceMin'] loop
  if jsonb_typeof(b->k) is distinct from 'number' then return false;end if;
  if (b->>k)::numeric not between 0 and 100 then return false;end if;
 end loop;
 return (b->>'oralMin')::numeric>(b->>'posterMin')::numeric and (b->>'posterMin')::numeric>(b->>'borderlineMin')::numeric and (b->>'acceptanceMin')::numeric<=(b->>'posterMin')::numeric;
end$$;
create function public.msrc_staff_research_screening_settings(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_abstracts.screening_settings%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into cfg from msrc_abstracts.screening_settings q where q.edition_key=edition_key order by q.version desc limit 1;
 return jsonb_build_object('state','ready','screeningSettings',jsonb_build_object('version',coalesce(cfg.version,0),'bands',cfg.bands,'similarityThreshold',cfg.similarity_threshold,'oralCapacity',cfg.oral_capacity));
end$$;
create function public.msrc_staff_research_save_screening_settings(edition_key text,expected_version integer,bands jsonb,similarity_threshold numeric,oral_capacity integer) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_abstracts.screening_settings%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if expected_version is null or expected_version<0 or not msrc_abstracts.bands_valid(bands) or similarity_threshold not between 0 and 100 or oral_capacity<0 then return jsonb_build_object('state','invalid');end if;
 perform 1 from msrc_abstracts.settings s where s.edition_key=edition_key for update;
 if not found then return jsonb_build_object('state','area_not_ready');end if;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into cfg from msrc_abstracts.screening_settings q where q.edition_key=edition_key order by q.version desc limit 1;
 if coalesce(cfg.version,0)<>expected_version then return jsonb_build_object('state','conflict');end if;
 insert into msrc_abstracts.screening_settings(edition_key,version,bands,similarity_threshold,oral_capacity,actor_id,session_id)
 values(edition_key,expected_version+1,nullif(bands,'null'::jsonb),similarity_threshold,oral_capacity,auth.uid(),(auth.jwt()->>'session_id')::uuid);
 perform msrc_abstracts.record(edition_key,'screening.settings_saved',null,jsonb_build_object('version',expected_version+1,'provisional',true));
 return public.msrc_staff_research_screening_settings(edition_key);
end$$;

create function public.msrc_staff_research_confirm_screening(edition_key text,submission_id uuid,expected_version integer,expected_sequence integer,operation_id uuid,screening jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;x msrc_abstracts.snapshots%rowtype;previous msrc_abstracts.screenings%rowtype;old msrc_abstracts.screenings%rowtype;
 cfg msrc_abstracts.screening_settings%rowtype;gates jsonb;g jsonb;j jsonb;k text;matches jsonb;passed boolean;failed boolean;pending boolean;
 id uuid;status text;digest bytea;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if expected_version is null or expected_sequence is null or expected_sequence<0 or operation_id is null or jsonb_typeof(screening) is distinct from 'object' or octet_length(screening::text)>24576 then return jsonb_build_object('state','invalid');end if;
 if screening<>jsonb_build_object('ethics',screening->'ethics','relevance',screening->'relevance','externalChecked',screening->'externalChecked','externalReference',screening->'externalReference',
  'similarityNote',screening->'similarityNote','failureDisposition',screening->'failureDisposition','note',screening->'note','investigation',screening->'investigation','investigationNote',screening->'investigationNote') then return jsonb_build_object('state','invalid');end if;
 foreach k in array array['externalReference','similarityNote','note','investigationNote'] loop
  if jsonb_typeof(screening->k) is distinct from 'string' or length(screening->>k)>(case when k='externalReference' then 1000 else 3000 end) then return jsonb_build_object('state','invalid');end if;
 end loop;
 if jsonb_typeof(screening->'externalChecked') is distinct from 'boolean' or jsonb_typeof(screening->'investigation') is distinct from 'boolean'
  or screening->>'externalChecked'='true' and btrim(screening->>'externalReference')=''
  or screening->>'investigation'='true' and btrim(screening->>'investigationNote')=''
  or screening->'failureDisposition'<>'null'::jsonb and btrim(screening->>'note')=''
  or not(screening->'failureDisposition'='null'::jsonb or screening->>'failureDisposition' in('correctable','final')) then return jsonb_build_object('state','invalid');end if;
 foreach k in array array['ethics','relevance'] loop
  j:=screening->k;
  if jsonb_typeof(j) is distinct from 'object' or j<>jsonb_build_object('passed',j->'passed','note',j->'note')
   or not(j->'passed'='null'::jsonb or jsonb_typeof(j->'passed')='boolean') or jsonb_typeof(j->'note') is distinct from 'string' or length(j->>'note')>3000
   or j->'passed'<>'null'::jsonb and btrim(j->>'note')='' then return jsonb_build_object('state','invalid');end if;
 end loop;
 -- All research mutations take the existing edition lock before the target lock.
 perform pg_advisory_xact_lock(hashtextextended('abstract-screening:'||operation_id::text,0));
 perform 1 from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if s.id is null or s.finalized_at is null then return jsonb_build_object('state','unavailable');end if;
 digest:=sha256(convert_to(jsonb_build_array(edition_key,submission_id,expected_version,expected_sequence,screening)::text,'UTF8'));
 select * into old from msrc_abstracts.screenings q where q.operation_id=operation_id;
 if found then
  if old.actor_id<>auth.uid() or old.input_hash<>digest then return jsonb_build_object('state','conflict');end if;
  return jsonb_build_object('state','updated');
 end if;
 if s.version<>expected_version then return jsonb_build_object('state','conflict');end if;
 if s.status not in('submitted','scientific_review') then return jsonb_build_object('state','locked');end if;
 select * into x from msrc_abstracts.snapshots q where q.submission_id=s.id and q.version=s.version;
 if x.submission_id is null then return jsonb_build_object('state','unavailable');end if;
 select * into previous from msrc_abstracts.screenings q where q.submission_id=s.id and q.submission_version=s.version order by q.sequence desc limit 1;
 if coalesce(previous.sequence,0)<>expected_sequence then return jsonb_build_object('state','conflict');end if;
 if previous.investigation and screening->>'investigation'='false' and btrim(screening->>'investigationNote')='' then return jsonb_build_object('state','invalid');end if;
 select * into cfg from msrc_abstracts.screening_settings q where q.edition_key=edition_key order by q.version desc limit 1;
 gates:=msrc_abstracts.screening_automatic(x.document);
 -- G5 requires BOTH automatic completeness and an explicit human confirmation.
 passed:=(gates->4->>'passed')::boolean;
 gates:=jsonb_set(gates,'{4}',jsonb_build_object('gate',5,'passed',case when not passed then false else (screening->'ethics'->>'passed')::boolean end,
  'note',(gates->4->>'note')||' '||(screening->'ethics'->>'note')));
 gates:=gates||jsonb_build_array(jsonb_build_object('gate',6,'passed',screening->'relevance'->'passed','note',screening->'relevance'->>'note'));
 matches:=msrc_abstracts.similarity_matches(s.id);
 passed:=case when cfg.similarity_threshold is null or screening->>'externalChecked'<>'true' then null
  else coalesce((matches->0->>'score')::numeric,0)<cfg.similarity_threshold end;
 gates:=gates||jsonb_build_array(jsonb_build_object('gate',7,'passed',passed,'note',case when cfg.similarity_threshold is null then 'Threshold not set. '
  when screening->>'externalChecked'<>'true' then 'External similarity report attestation required. ' else 'Internal similarity and external report attested. ' end||(screening->>'similarityNote')));
 select bool_or((v->>'passed')::boolean=false),bool_or(v->'passed'='null'::jsonb) into failed,pending from jsonb_array_elements(gates) v;
 if failed and screening->>'failureDisposition' is null and screening->>'investigation'<>'true' then return jsonb_build_object('state','invalid');end if;
 status:=case when failed and screening->>'failureDisposition' is null then 'pending'
  when failed then case screening->>'failureDisposition' when 'final' then 'failed_final' else 'failed_correctable' end
  when pending or screening->>'investigation'='true' then 'pending' else 'passed' end;
 insert into msrc_abstracts.screenings(submission_id,submission_version,sequence,status,actor_id,session_id,operation_id,input_hash,input,note,investigation,investigation_note,similarity_threshold,similarity_matches,external_checked,external_reference)
 values(s.id,s.version,expected_sequence+1,status,auth.uid(),(auth.jwt()->>'session_id')::uuid,operation_id,digest,screening,screening->>'note',
  (screening->>'investigation')::boolean,screening->>'investigationNote',cfg.similarity_threshold,matches,(screening->>'externalChecked')::boolean,screening->>'externalReference') returning screenings.id into id;
 for g in select value from jsonb_array_elements(gates) loop
  insert into msrc_abstracts.screening_gates(screening_id,gate,passed,note,actor_id,correctable)
  values(id,(g->>'gate')::integer,(g->>'passed')::boolean,g->>'note',auth.uid(),case when g->>'passed'='false' then screening->>'failureDisposition'='correctable' end);
 end loop;
 -- An immutable event for later supervisor-notification work; no job/email here.
 perform msrc_abstracts.record(edition_key,case when status='passed' then 'screening.passed' else 'screening.recorded' end,s.id,
  jsonb_build_object('screeningId',id,'submissionVersion',s.version,'sequence',expected_sequence+1,'status',status,'investigation',(screening->>'investigation')::boolean));
 return jsonb_build_object('state','updated');
end$$;

create function msrc_abstracts.provisional_band(mean numeric,reviews jsonb,bands jsonb,oral_available boolean default null) returns text
 language plpgsql immutable security invoker set search_path='' as $$
declare oral_quality boolean;begin
 if bands is null or bands='null'::jsonb then return 'settings_unset';end if;
 if mean is null or mean not between 0 and 100 or jsonb_typeof(reviews) is distinct from 'array' then return 'reviews_incomplete';end if;
 if jsonb_array_length(reviews)<2 or exists(select 1 from jsonb_array_elements(reviews) r where msrc_abstracts.weighted_total_2027(r->'scores') is null) then return 'reviews_incomplete';end if;
 select not exists(select 1 from jsonb_array_elements(reviews) r cross join lateral jsonb_array_elements(r->'scores') v
  where v->>'criterionId' in('methodology','results') and (v->>'value')::numeric<3) into oral_quality;
 if mean>=(bands->>'oralMin')::numeric and oral_quality and oral_available is distinct from false then return 'oral_candidate';end if;
 if mean>=(bands->>'posterMin')::numeric then return 'poster';end if;
 if mean>=(bands->>'borderlineMin')::numeric then return 'borderline';end if;
 return case when mean<(bands->>'acceptanceMin')::numeric then 'reject' else 'additional_review' end;
end$$;

-- Existing RPC adaptations follow below. No parallel assignment/decision workflow.
create function msrc_abstracts.recommendation_cohort(edition text) returns jsonb
 language sql stable security invoker set search_path='' as $$
 with cfg as (select q.* from msrc_abstracts.screening_settings q where q.edition_key=edition order by q.version desc limit 1),
 cohort as materialized (
  select q.id,q.status,coalesce(msrc_abstracts.screening_current(q.id),false) screened,
   (select r.status from msrc_abstracts.screenings r where r.submission_id=q.id and r.submission_version=q.version order by r.sequence desc limit 1) screening_status,
   coalesce((select r.investigation from msrc_abstracts.screenings r where r.submission_id=q.id and r.submission_version=q.version order by r.sequence desc limit 1),false) investigation,
   msrc_abstracts.review_summary(q.id) summary
  from msrc_abstracts.submissions q where q.edition_key=edition and q.finalized_at is not null),
 classified as materialized (
  select c.*,case when c.investigation then 'investigation' when c.screening_status='failed_final' then 'reject' when not c.screened then 'screening_required'
   else msrc_abstracts.provisional_band((c.summary->>'meanScore')::numeric,
    (select coalesce(jsonb_agg(r->'scorecard'),'[]'::jsonb) from jsonb_array_elements(c.summary->'reviews') r),cfg.bands,null) end band
  from cohort c left join cfg on true),
 oral_ranks as (
  select c.id,rank() over(order by (c.summary->>'meanScore')::numeric desc)-1 higher,
   count(*) over(partition by (c.summary->>'meanScore')::numeric) tied
  from classified c where c.band='oral_candidate' and c.status not in('rejected','withdrawn'))
 select coalesce(jsonb_object_agg(c.id::text,case
  when c.band='oral_candidate' and cfg.oral_capacity is not null and r.higher>=cfg.oral_capacity then 'poster'
  when c.band='oral_candidate' and cfg.oral_capacity is not null and r.higher+r.tied>cfg.oral_capacity then 'additional_review'
  else c.band end),'{}'::jsonb)
 from classified c left join oral_ranks r on r.id=c.id left join cfg on true;
$$;
comment on function msrc_abstracts.recommendation_cohort(text) is 'Provisional only. Materialized cohort computes each screening/summary once per list. All reviewers must satisfy the oral floors; capacity ties return to additional review, never UUID order.';
create function msrc_abstracts.recommended_band(submission uuid) returns text
 language sql stable security invoker set search_path='' as $$
 select msrc_abstracts.recommendation_cohort(s.edition_key)->>(s.id::text) from msrc_abstracts.submissions s where s.id=submission;
$$;

create or replace function public.msrc_staff_research_settings(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.settings%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into s from msrc_abstracts.settings q where q.edition_key=edition_key;
 return jsonb_build_object('state','ready','version',coalesce(s.version,0),'settings',coalesce(s.configuration,msrc_abstracts.settings_defaults())||jsonb_build_object('rubric',msrc_abstracts.rubric_2027()),
 'enabled',coalesce(s.enabled,false),'evidenceReady',coalesce(s.evidence_ready,false),'complete',coalesce(msrc_abstracts.review_settings_ready_2027(s.configuration),false));
end$$;

create or replace function public.msrc_staff_research_save_settings(edition_key text,expected_version integer,settings jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.settings%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if settings->'rubric' not in('[]'::jsonb,msrc_abstracts.rubric_2027()) or settings->>'reviewersPerAbstract' is not null and settings->>'reviewersPerAbstract'<>'2' then return jsonb_build_object('state','invalid');end if;
 settings:=settings||jsonb_build_object('rubric',msrc_abstracts.rubric_2027());
 if not msrc_abstracts.settings_valid(settings,false) or expected_version is null then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('abstract-settings:'||edition_key,0));
 select * into s from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if coalesce(s.version,0)<>expected_version then return jsonb_build_object('state','conflict');end if;
 if s.edition_key is null then insert into msrc_abstracts.settings(edition_key,version,configuration) values(edition_key,1,settings) returning * into s;
 else update msrc_abstracts.settings q set version=q.version+1,configuration=settings where q.edition_key=edition_key returning * into s;end if;
 insert into msrc_abstracts.settings_versions values(edition_key,s.version,settings);
 perform msrc_abstracts.record(edition_key,'settings.saved',null,jsonb_build_object('version',s.version));
 return public.msrc_staff_research_settings(edition_key);
end$$;

create or replace function msrc_abstracts.assign(edition text,submission uuid,reviewer uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare s msrc_abstracts.submissions%rowtype;c msrc_abstracts.settings%rowtype;a msrc_abstracts.assignments%rowtype;withdrawn_id uuid;begin
 select * into c from msrc_abstracts.settings where edition_key=edition for update;
 if msrc_staff.authorize(edition,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if not found or not msrc_abstracts.review_settings_ready_2027(c.configuration) then return jsonb_build_object('state','area_not_ready');end if;
 select * into s from msrc_abstracts.submissions where id=submission and edition_key=edition for update;
 if not found or s.status not in('submitted','scientific_review') then return jsonb_build_object('state','unavailable');end if;
 -- Finalized content is immutable. Each new assignment independently freezes the
 -- explicitly saved review configuration, which may be completed after submission.
 c.configuration:=c.configuration||jsonb_build_object('rubric',msrc_abstracts.rubric_2027(),'reviewersPerAbstract',msrc_abstracts.required_reviews_2027(s.id));
 if not coalesce(msrc_abstracts.screening_current(s.id),false) then return jsonb_build_object('state','screening_required');end if;
 if clock_timestamp()>=(c.configuration->>'reviewDeadline')::timestamptz then return jsonb_build_object('state','locked');end if;
 if not exists(select 1 from msrc_abstracts.packets p where p.submission_id=s.id and p.submission_version=s.version) then return jsonb_build_object('state','packet_required');end if;
 for withdrawn_id in update msrc_abstracts.assignments q set status='withdrawn',version=q.version+1
 where q.submission_id=s.id and q.submission_version=s.version and q.status in('assigned','draft','completed')
 and (not msrc_abstracts.reviewer_eligible(edition,q.reviewer_id) or msrc_abstracts.has_conflict(edition,s.id,q.reviewer_id)) returning q.id loop
 perform msrc_abstracts.record(edition,'review.withdrawn',withdrawn_id,jsonb_build_object('reason','Current eligibility or declared conflict'));end loop;
 if not msrc_abstracts.reviewer_eligible(edition,reviewer) then return jsonb_build_object('state','denied');end if;
 if msrc_abstracts.has_conflict(edition,s.id,reviewer) then return jsonb_build_object('state','coi');end if;
 if exists(select 1 from msrc_abstracts.assignments q where q.submission_id=s.id and q.submission_version=s.version and q.reviewer_id=reviewer) then return jsonb_build_object('state','duplicate');end if;
 if (select count(*) from msrc_abstracts.assignments q where q.submission_id=s.id and q.submission_version=s.version and q.status in('assigned','draft','completed')) >= (c.configuration->>'reviewersPerAbstract')::integer then return jsonb_build_object('state','full');end if;
 insert into msrc_abstracts.assignments(edition_key,submission_id,submission_version,rubric_version,reviewer_id,scoring_rule)
 values(edition,s.id,s.version,c.version,reviewer,'msrc2027_org069') returning * into a;
 update msrc_abstracts.submissions set status='scientific_review' where id=s.id;
 perform msrc_abstracts.record(edition,'review.assigned',a.id,jsonb_build_object('submissionId',s.id,'submissionVersion',s.version,'rubricVersion',c.version));
 return jsonb_build_object('state','assigned','assignmentId',a.id);
end$$;

create or replace function public.msrc_staff_research_assign(edition_key text,submission_id uuid,reviewer_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 return msrc_abstracts.assign(edition_key,submission_id,reviewer_id);end$$;

create or replace function public.msrc_staff_research_auto_assign(edition_key text,submission_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare reviewer uuid;result jsonb;assigned integer:=0;c msrc_abstracts.settings%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into c from msrc_abstracts.settings s where s.edition_key=edition_key for update;
 if not found or not msrc_abstracts.review_settings_ready_2027(c.configuration) then return jsonb_build_object('state','area_not_ready');end if;
 for reviewer in select r.actor_id from msrc_abstracts.reviewer_profiles r where r.edition_key=edition_key
 and msrc_abstracts.reviewer_eligible(edition_key,r.actor_id) and not msrc_abstracts.has_conflict(edition_key,submission_id,r.actor_id)
 and not exists(select 1 from msrc_abstracts.assignments a join msrc_abstracts.submissions s on s.id=a.submission_id where a.submission_id=submission_id and a.submission_version=s.version and a.reviewer_id=r.actor_id)
 order by (select count(*) from msrc_abstracts.assignments a where a.edition_key=edition_key and a.reviewer_id=r.actor_id and a.status in('assigned','draft','completed')),r.actor_id loop
 result:=msrc_abstracts.assign(edition_key,submission_id,reviewer);if result->>'state'='full' then exit;end if;
 if result->>'state'<>'assigned' then return result;end if;assigned:=assigned+1;end loop;
 perform msrc_abstracts.record(edition_key,'review.auto_assigned',submission_id,jsonb_build_object('assigned',assigned));
 return jsonb_build_object('state','assigned','count',assigned);
end$$;

create or replace function public.msrc_staff_research_prepare_packet(edition_key text,submission_id uuid,expected_version integer,packet jsonb,attestation boolean) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if not found or s.finalized_at is null then return jsonb_build_object('state','unavailable');end if;
 if s.version is distinct from expected_version then return jsonb_build_object('state','conflict');end if;
 if s.status not in('submitted','scientific_review') or not exists(select 1 from msrc_abstracts.snapshots x where x.submission_id=s.id and x.version=s.version) then return jsonb_build_object('state','unavailable');end if;
 if attestation is distinct from true or not msrc_abstracts.packet_valid(packet,s.document) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_abstracts.packets p where p.submission_id=s.id and p.submission_version=s.version) then return jsonb_build_object('state','locked');end if;
 insert into msrc_abstracts.packets values(s.id,s.version,packet,auth.uid(),clock_timestamp());
 perform msrc_abstracts.record(edition_key,'packet.prepared',s.id,jsonb_build_object('version',s.version));return jsonb_build_object('state','prepared');
end$$;

create or replace function public.msrc_staff_research_packet(edition_key text,assignment_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_abstracts.assignments%rowtype;p jsonb;c jsonb;is_reviewer boolean;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['abstractReviewer','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 is_reviewer:=msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is not null;
 select * into a from msrc_abstracts.assignments q where q.id=assignment_id and q.edition_key=edition_key and (not is_reviewer or q.reviewer_id=auth.uid());
 if not found then return jsonb_build_object('state','denied');end if;
 if is_reviewer and (a.status in('conflict','declined','withdrawn') or msrc_abstracts.has_conflict(edition_key,a.submission_id,auth.uid())) then return jsonb_build_object('state','denied');end if;
 select packet into p from msrc_abstracts.packets q where q.submission_id=a.submission_id and q.submission_version=a.submission_version;
 select configuration into c from msrc_abstracts.settings_versions v where v.edition_key=edition_key and v.version=a.rubric_version;
 perform msrc_abstracts.record(edition_key,'packet.read',a.id);
 return jsonb_build_object('state','ready','assignment',jsonb_build_object('id',a.id,'version',a.version,'status',a.status,'submissionVersion',a.submission_version,'rubricVersion',a.rubric_version),
 'packet',msrc_abstracts.packet_projection(p),'rubric',msrc_abstracts.rubric_2027(),'scorecard',case when is_reviewer and a.scoring_rule='msrc2027_org069' then a.scorecard else null end,
 'reviewPolicy',jsonb_build_object('deadline',c->'reviewDeadline','ongoingPolicy','ORG-068: completed research; analysis finished and manuscript written before submission.','requiredReviews',msrc_abstracts.required_reviews_2027(a.submission_id),'aggregationPolicy',c->'aggregationPolicy','notApplicablePolicy',c->'notApplicablePolicy'),
 'studyTemplate',case when p->>'studyTypeId'='case_report_series' then 'case_report' else 'research' end);
end$$;

create or replace function public.msrc_staff_research_scorecard(edition_key text,assignment_id uuid,expected_version integer,scorecard jsonb,submit boolean) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_abstracts.assignments%rowtype;c jsonb;criterion jsonb;score jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['abstractReviewer']) is null then return jsonb_build_object('state','denied');end if;
 perform 1 from msrc_abstracts.settings s where s.edition_key=edition_key for share;
 select * into a from msrc_abstracts.assignments q where q.id=assignment_id and q.edition_key=edition_key and q.reviewer_id=auth.uid() for update;
 if msrc_staff.authorize(edition_key,array['abstractReviewer']) is null then return jsonb_build_object('state','denied');end if;
 if not found then return jsonb_build_object('state','denied');end if;
 if a.version is distinct from expected_version then return jsonb_build_object('state','conflict');end if;
 select configuration into c from msrc_abstracts.settings_versions v where v.edition_key=edition_key and v.version=a.rubric_version;
 if c->>'reviewDeadline' is null then return jsonb_build_object('state','area_not_ready');end if;
 if not coalesce(msrc_abstracts.screening_current(a.submission_id),false) then return jsonb_build_object('state','screening_required');end if;
 c:=c||jsonb_build_object('rubric',msrc_abstracts.rubric_2027());
 if a.status not in('assigned','draft','completed') or clock_timestamp()>=(c->>'reviewDeadline')::timestamptz
 or not exists(select 1 from msrc_abstracts.submissions s where s.id=a.submission_id and s.version=a.submission_version and s.status='scientific_review') then return jsonb_build_object('state','locked');end if;
 if msrc_abstracts.has_conflict(edition_key,a.submission_id,auth.uid()) then return jsonb_build_object('state','coi');end if;
 if submit is null or jsonb_typeof(scorecard) is distinct from 'object' or scorecard<>jsonb_build_object('scores',scorecard->'scores','comments',scorecard->'comments','recommendation',scorecard->'recommendation')
 or jsonb_typeof(scorecard->'comments') is distinct from 'string' or char_length(scorecard->>'comments')>6000
 or not(coalesce(scorecard->>'recommendation','') in('accept','reject','revise') or (not submit and scorecard->'recommendation'='null'::jsonb))
 or jsonb_typeof(scorecard->'scores') is distinct from 'array' or (submit and jsonb_array_length(scorecard->'scores')<>jsonb_array_length(c->'rubric')) then return jsonb_build_object('state','invalid');end if;
 if (select count(*)<>count(distinct v->>'criterionId') from jsonb_array_elements(scorecard->'scores') v) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from jsonb_array_elements(scorecard->'scores') v where not exists(select 1 from jsonb_array_elements(c->'rubric') r where r->>'id'=v->>'criterionId')) then return jsonb_build_object('state','invalid');end if;
 for criterion in select value from jsonb_array_elements(c->'rubric') loop
 select v into score from jsonb_array_elements(scorecard->'scores') v where v->>'criterionId'=criterion->>'id';
 if not found then if submit then return jsonb_build_object('state','invalid');else continue;end if;end if;
 if score<>jsonb_build_object('criterionId',score->'criterionId','value',score->'value') or jsonb_typeof(score->'value') is distinct from 'number' then return jsonb_build_object('state','invalid');end if;
 if trunc((score->>'value')::numeric)<>(score->>'value')::numeric or (score->>'value')::numeric<(criterion->>'min')::numeric or (score->>'value')::numeric>(criterion->>'max')::numeric then return jsonb_build_object('state','invalid');end if;
 end loop;
 update msrc_abstracts.assignments q set scorecard=scorecard,scoring_rule='msrc2027_org069',score_total=case when submit then msrc_abstracts.weighted_total_2027(scorecard->'scores') end,status=case when submit then 'completed' else 'draft' end,version=q.version+1 where q.id=a.id returning * into a;
 insert into msrc_abstracts.scorecard_versions(assignment_id,version,scorecard,completed,score_total,scoring_rule)
 values(a.id,a.version,scorecard,submit,a.score_total,'msrc2027_org069');
 perform msrc_abstracts.record(edition_key,case when submit then 'review.completed' else 'review.saved' end,a.id,jsonb_build_object('version',a.version));
 return jsonb_build_object('state','updated','version',a.version);
end$$;

create or replace function msrc_abstracts.review_summary(submission uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare s msrc_abstracts.submissions%rowtype;reviews jsonb;completed integer;mean numeric;begin
 select * into s from msrc_abstracts.submissions where id=submission;
 select coalesce(jsonb_agg(jsonb_build_object('assignmentId',a.id,'submissionVersion',a.submission_version,'rubricVersion',a.rubric_version,'total',a.score_total,'scorecard',a.scorecard,'rubric',msrc_abstracts.rubric_2027()) order by a.id),'[]'::jsonb),count(*)::integer,avg(a.score_total)
 into reviews,completed,mean from msrc_abstracts.assignments a join msrc_abstracts.settings_versions v on v.edition_key=a.edition_key and v.version=a.rubric_version
 where a.submission_id=s.id and a.submission_version=s.version and a.status='completed' and a.scoring_rule='msrc2027_org069'
 and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id) and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id);
 return jsonb_build_object('requiredReviews',msrc_abstracts.required_reviews_2027(s.id),'completedReviews',completed,'meanScore',case when completed>=msrc_abstracts.required_reviews_2027(s.id) then mean end,'reviews',reviews);
end$$;

create or replace function msrc_abstracts.reviews_complete(submission uuid,version integer) returns boolean language sql stable security invoker set search_path='' as $$
 select count(a.id)>=msrc_abstracts.required_reviews_2027(submission,reviews_complete.version) from msrc_abstracts.submissions s
 join msrc_abstracts.snapshots x on x.submission_id=s.id and x.version=reviews_complete.version
 join msrc_abstracts.settings_versions v on v.edition_key=s.edition_key and v.version=x.settings_version
 left join msrc_abstracts.assignments a on a.submission_id=s.id and a.submission_version=x.version and a.status='completed' and a.scoring_rule='msrc2027_org069'
 and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id)
 and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)
 where s.id=submission group by v.configuration;
$$;

create or replace function msrc_abstracts.review_basis(submission uuid,version integer) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('submissionVersion',x.version,'settingsVersion',x.settings_version,'scoringRule','msrc2027_org069','requiredReviews',msrc_abstracts.required_reviews_2027(s.id,x.version),'screeningId',(select r.id from msrc_abstracts.screenings r where r.submission_id=s.id and r.submission_version=x.version order by r.sequence desc limit 1),'completed',
 coalesce((select jsonb_agg(jsonb_build_object('assignmentId',a.id,'scorecardVersion',a.version,'rubricVersion',a.rubric_version) order by a.id)
 from msrc_abstracts.assignments a where a.submission_id=s.id and a.submission_version=x.version and a.status='completed' and a.scoring_rule='msrc2027_org069'
 and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id)
 and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)),'[]'::jsonb))
 from msrc_abstracts.submissions s join msrc_abstracts.snapshots x on x.submission_id=s.id and x.version=review_basis.version where s.id=submission;
$$;

create or replace function public.msrc_staff_research_decision(edition_key text,submission_id uuid,expected_version integer,outcome text,reason text,instructions text,revision_deadline timestamptz) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;id uuid;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if outcome is null or outcome not in('accept','reject','revise') or reason is null or char_length(btrim(reason)) not between 1 and 3000
 or instructions is null or char_length(btrim(instructions)) not between 1 and 4000
 or (outcome='revise' and (revision_deadline is null or not isfinite(revision_deadline) or revision_deadline<=clock_timestamp()))
 or (outcome<>'revise' and revision_deadline is not null) then return jsonb_build_object('state','invalid');end if;
 -- Freeze the scientific basis against scorecard/response/profile mutations, using their common settings-first lock order.
 perform 1 from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if not found or s.finalized_at is null then return jsonb_build_object('state','unavailable');end if;
 if s.version is distinct from expected_version then return jsonb_build_object('state','conflict');end if;
 if s.status not in('submitted','scientific_review') or not exists(select 1 from msrc_abstracts.snapshots q where q.submission_id=s.id and q.version=s.version) then return jsonb_build_object('state','locked');end if;
 if outcome='revise' and revision_deadline<=clock_timestamp() then return jsonb_build_object('state','invalid');end if;
 if outcome<>'revise' then
  if exists(select 1 from msrc_abstracts.screenings r where r.submission_id=s.id and r.submission_version=s.version and r.investigation
   and r.sequence=(select max(q.sequence) from msrc_abstracts.screenings q where q.submission_id=s.id and q.submission_version=s.version)) then return jsonb_build_object('state','investigation_open');end if;
  if not (outcome='reject' and exists(select 1 from msrc_abstracts.screenings r where r.submission_id=s.id and r.submission_version=s.version and r.status='failed_final'
   and r.sequence=(select max(q.sequence) from msrc_abstracts.screenings q where q.submission_id=s.id and q.submission_version=s.version))) then
   if not coalesce(msrc_abstracts.screening_current(s.id),false) then return jsonb_build_object('state','screening_required');end if;
   if not coalesce(msrc_abstracts.reviews_complete(s.id,s.version),false) then return jsonb_build_object('state','reviews_incomplete');end if;
  end if;
 end if;
 insert into msrc_abstracts.decisions(submission_id,submission_version,outcome,reason,instructions,revision_deadline,actor_id,review_basis)
 values(s.id,s.version,outcome,reason,instructions,revision_deadline,auth.uid(),msrc_abstracts.review_basis(s.id,s.version)) returning decisions.id into id;
 perform msrc_abstracts.record(edition_key,'decision.prepared',id,jsonb_build_object('submissionId',s.id,'version',s.version));
 return jsonb_build_object('state','prepared','decisionId',id);
end$$;

create or replace function public.msrc_staff_research_batch(edition_key text,decision_ids uuid[],operation_id uuid,action text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare b msrc_abstracts.batches%rowtype;d msrc_abstracts.decisions%rowtype;s msrc_abstracts.submissions%rowtype;
 ids uuid[];preview jsonb:='[]'::jsonb;recipient text;total integer:=0;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or action is null or action not in('prepare','publish') or decision_ids is null or cardinality(decision_ids) not between 1 and 200
 or exists(select 1 from unnest(decision_ids) x where x is null) or (select count(*)<>count(distinct x) from unnest(decision_ids) x) then return jsonb_build_object('state','invalid');end if;
 select array_agg(x order by x) into ids from unnest(decision_ids) x;
 perform pg_advisory_xact_lock(hashtextextended('abstract-batch:'||operation_id::text,0));
 perform 1 from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into b from msrc_abstracts.batches q where q.id=operation_id;
 if found and (b.edition_key<>edition_key or b.decision_ids<>ids) then return jsonb_build_object('state','conflict');end if;
 if action='publish' and b.id is null then return jsonb_build_object('state','preview_required');end if;
 if action='publish' and (select count(*) from msrc_abstracts.publications p where p.batch_id=b.id)=cardinality(ids) then return jsonb_build_object('state','published','batchId',b.id,'count',cardinality(ids),'emailState','draft_held');end if;
 -- Lock every target in a stable order and validate the whole batch before any write.
 perform 1 from msrc_abstracts.submissions q join msrc_abstracts.decisions x on x.submission_id=q.id where x.id=any(ids) order by q.id for update of q;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if (select count(*) from msrc_abstracts.decisions x join msrc_abstracts.submissions q on q.id=x.submission_id where x.id=any(ids) and q.edition_key=edition_key)<>cardinality(ids)
 or (select count(*)<>count(distinct submission_id) from msrc_abstracts.decisions where id=any(ids)) then return jsonb_build_object('state','invalid');end if;
 for d in select * from msrc_abstracts.decisions q where q.id=any(ids) order by q.id loop
 select * into strict s from msrc_abstracts.submissions where id=d.submission_id;
 if s.version<>d.submission_version or s.status not in('submitted','scientific_review') or exists(select 1 from msrc_abstracts.publications p where p.decision_id=d.id)
 or exists(select 1 from msrc_abstracts.decisions newer where newer.submission_id=s.id and newer.submission_version=s.version and (newer.created_at,newer.id)>(d.created_at,d.id))
 or (d.outcome='revise' and d.revision_deadline<=clock_timestamp()) then return jsonb_build_object('state','conflict');end if;
 if d.outcome<>'revise' then
  if exists(select 1 from msrc_abstracts.screenings r where r.submission_id=s.id and r.submission_version=s.version and r.investigation
   and r.sequence=(select max(q.sequence) from msrc_abstracts.screenings q where q.submission_id=s.id and q.submission_version=s.version)) then return jsonb_build_object('state','investigation_open');end if;
  if not (d.outcome='reject' and exists(select 1 from msrc_abstracts.screenings r where r.submission_id=s.id and r.submission_version=s.version and r.status='failed_final'
   and r.sequence=(select max(q.sequence) from msrc_abstracts.screenings q where q.submission_id=s.id and q.submission_version=s.version))) then
   if not coalesce(msrc_abstracts.screening_current(s.id),false) then return jsonb_build_object('state','screening_required');end if;
   if not coalesce(msrc_abstracts.reviews_complete(s.id,s.version),false) then return jsonb_build_object('state','reviews_incomplete');end if;
  end if;
 end if;
 if d.review_basis is distinct from msrc_abstracts.review_basis(s.id,s.version) then return jsonb_build_object('state','conflict');end if;
 preview:=preview||jsonb_build_array(jsonb_build_object('id',d.id,'reference',s.reference,'outcome',d.outcome,'instructions',d.instructions,'revisionDeadline',d.revision_deadline));
 end loop;
 if b.id is null then insert into msrc_abstracts.batches values(operation_id,edition_key,ids,auth.uid(),clock_timestamp()) returning * into b;
 perform msrc_abstracts.record(edition_key,'batch.prepared',b.id,jsonb_build_object('count',cardinality(ids)));end if;
 if action='prepare' then return jsonb_build_object('state','prepared','batchId',b.id,'count',cardinality(ids),'decisions',preview);end if;
 for d in select * from msrc_abstracts.decisions q where q.id=any(ids) order by q.id loop
 select * into strict s from msrc_abstracts.submissions where id=d.submission_id;
 select email into strict recipient from auth.users where id=s.actor_id and email_confirmed_at is not null and deleted_at is null;
 perform msrc_abstracts.enqueue(d.id,recipient,jsonb_build_object('reference',s.reference,'outcome',d.outcome,'instructions',d.instructions,
 'revision_deadline',case when d.revision_deadline is not null then to_char(d.revision_deadline at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') end));
 insert into msrc_abstracts.publications values(d.id,b.id,clock_timestamp());
 update msrc_abstracts.submissions set status=case d.outcome when 'accept' then 'accepted' when 'reject' then 'rejected' else 'revision_requested' end,
 revision_deadline=d.revision_deadline,revision_instructions=case when d.outcome='revise' then d.instructions end,
 version=case when d.outcome='revise' then version+1 else version end where id=s.id;
 update msrc_abstracts.assignments q set status='withdrawn',version=q.version+1 where q.submission_id=s.id and q.status in('assigned','draft');
 perform msrc_abstracts.record(edition_key,'decision.published',d.id,jsonb_build_object('batchId',b.id));total:=total+1;
 end loop;
 return jsonb_build_object('state','published','batchId',b.id,'count',total,'emailState','draft_held');
end$$;

create or replace function public.msrc_staff_research_list(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 -- One statement snapshot: a concurrent finalization cannot appear in the list
 -- after the recommendation map was calculated without a corresponding band.
 with cohort_bands as materialized(select msrc_abstracts.recommendation_cohort(edition_key) bands)
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'reference',s.reference,'status',s.status,'version',s.version,'title',s.document->>'title','wordCount',s.word_count,
 'screeningStatus',coalesce((select r.status from msrc_abstracts.screenings r where r.submission_id=s.id and r.submission_version=s.version order by r.sequence desc limit 1),'pending'),'recommendedBand',(select bands from cohort_bands)->>(s.id::text),'packetReady',exists(select 1 from msrc_abstracts.packets p where p.submission_id=s.id and p.submission_version=s.version),
 'assignedCount',(select count(*) from msrc_abstracts.assignments a where a.submission_id=s.id and a.submission_version=s.version and a.status in('assigned','draft','completed') and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id) and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)),
 'completedCount',(select count(*) from msrc_abstracts.assignments a where a.submission_id=s.id and a.submission_version=s.version and a.status='completed' and a.scoring_rule='msrc2027_org069' and msrc_abstracts.reviewer_eligible(s.edition_key,a.reviewer_id) and not msrc_abstracts.has_conflict(s.edition_key,s.id,a.reviewer_id)
 ),
 'decision',(select jsonb_build_object('id',d.id,'outcome',d.outcome,'reason',d.reason,'instructions',d.instructions,'revisionDeadline',d.revision_deadline,
 'state',case when exists(select 1 from msrc_abstracts.publications p where p.decision_id=d.id) then 'published' else 'draft' end)
 from msrc_abstracts.decisions d where d.submission_id=s.id and d.submission_version=s.version order by d.created_at desc,d.id desc limit 1)) order by s.created_at,s.id),'[]'::jsonb)
 into result from msrc_abstracts.submissions s where s.edition_key=edition_key and s.finalized_at is not null;
 return jsonb_build_object('state','ready','submissions',result);
end$$;

create or replace function public.msrc_staff_research_submission(edition_key text,submission_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;packet jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key and q.finalized_at is not null;
 if not found then return jsonb_build_object('state','unavailable');end if;
 select p.packet into packet from msrc_abstracts.packets p where p.submission_id=s.id and p.submission_version=s.version;
 perform msrc_abstracts.record(edition_key,'submission.read',s.id);
 return jsonb_build_object('state','ready','submission',(msrc_abstracts.projection(s)-'document')||jsonb_build_object('document',msrc_abstracts.science_document(s.document)),
 'packet',case when packet is null then null else msrc_abstracts.packet_projection(packet) end,'screening',msrc_abstracts.screening_projection(s.id),'recommendedBand',msrc_abstracts.recommended_band(s.id),'packetVersion',case when packet is null then 0 else s.version end,'reviewSummary',msrc_abstracts.review_summary(s.id));
end$$;

revoke all on all functions in schema msrc_abstracts from public,anon,authenticated,service_role;
do $$declare p record;begin
 for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname in(
 'msrc_staff_research_screening_settings','msrc_staff_research_save_screening_settings','msrc_staff_research_confirm_screening','msrc_staff_research_request_review') loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',p.signature);
  execute format('grant execute on function %s to authenticated',p.signature);
 end loop;
end$$;
notify pgrst,'reload schema';
commit;
