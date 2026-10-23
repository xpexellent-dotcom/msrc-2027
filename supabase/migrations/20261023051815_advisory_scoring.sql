-- AI-01--06 / ORG-040 / ENG-066. Pending local source only: no settings or activation seeded.
begin;

create table msrc_abstracts.advisory_settings (
 edition_key text primary key references msrc_authorization.edition_config(edition_key) on delete restrict,
 version integer not null check(version>0), configuration jsonb not null check(jsonb_typeof(configuration)='object')
);
create table msrc_abstracts.advisory_runs (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_abstracts.advisory_settings(edition_key) on delete restrict,
 operation_id uuid not null,actor_id uuid not null,input_hash text not null,configuration jsonb not null,
 abstract_count integer not null check(abstract_count>0),estimated_cost numeric not null check(estimated_cost>0),
 created_at timestamptz not null default clock_timestamp(),unique(edition_key,operation_id)
);
create table msrc_abstracts.advisory_jobs (
 id uuid primary key default gen_random_uuid(),run_id uuid not null references msrc_abstracts.advisory_runs(id) on delete restrict,
 edition_key text not null,submission_id uuid not null,submission_version integer not null,rubric_version integer not null,
 status text not null default 'queued' check(status in('queued','processing','completed','failed','discarded')),
 attempts integer not null default 0 check(attempts>=0),next_attempt_at timestamptz not null default clock_timestamp(),
 claimed_by uuid,lease_token uuid,lease_expires_at timestamptz,completed_at timestamptz,
 error_code text check(error_code in('provider_unavailable','rate_limited','provider_configuration','invalid_output','invalid_snapshot','identity_leak','configuration_changed','disabled','stale_snapshot','budget_exceeded','max_attempts','lease_expired')),
 unique(submission_id,submission_version,rubric_version),
 foreign key(submission_id,submission_version) references msrc_abstracts.packets(submission_id,submission_version) on delete restrict,
 foreign key(edition_key,rubric_version) references msrc_abstracts.settings_versions(edition_key,version) on delete restrict,
 check((status='processing')=(claimed_by is not null and lease_token is not null and lease_expires_at is not null))
);
create index advisory_job_claim on msrc_abstracts.advisory_jobs(edition_key,next_attempt_at,id) where status in('queued','processing');
create index advisory_job_run on msrc_abstracts.advisory_jobs(run_id,status);
create table msrc_abstracts.advisory_records (
 id uuid primary key default gen_random_uuid(),job_id uuid not null unique references msrc_abstracts.advisory_jobs(id) on delete restrict,
 scores jsonb not null check(jsonb_typeof(scores)='array'),model text not null,prompt_version text not null,
 created_at timestamptz not null default clock_timestamp()
);
create table msrc_abstracts.advisory_daily_usage (
 edition_key text not null references msrc_abstracts.advisory_settings(edition_key) on delete restrict,utc_day date not null,
 reserved_abstracts integer not null default 0 check(reserved_abstracts>=0),reserved_cost numeric not null default 0 check(reserved_cost>=0),
 attempt_count integer not null default 0 check(attempt_count>=0),attempt_cost numeric not null default 0 check(attempt_cost>=0),
 primary key(edition_key,utc_day)
);
comment on table msrc_abstracts.advisory_records is 'AI advisory, not a decision. Private separate immutable scores. No author projection; no scorecard or decision mutation.';
comment on table msrc_abstracts.advisory_jobs is 'Run ledger contains counts, bounded error codes and processing identifiers only; never provider prompts, scientific text or model outputs.';
comment on table msrc_abstracts.advisory_daily_usage is 'UTC-day conservative budget. Enqueue reserves all configured retry estimates; each dispatch also consumes a daily attempt/count estimate. This is an estimate, not provider billing.';
do $$declare t text;begin
 foreach t in array array['advisory_settings','advisory_runs','advisory_jobs','advisory_records','advisory_daily_usage'] loop
 execute format('alter table msrc_abstracts.%I enable row level security',t);
 execute format('alter table msrc_abstracts.%I force row level security',t);
 execute format('revoke all on msrc_abstracts.%I from public,anon,authenticated,service_role',t);
 if t in('advisory_runs','advisory_records') then
 execute format('create trigger advisory_append_only before insert or update or delete on msrc_abstracts.%I for each row execute function msrc_staff.audit_immutable()',t);
 execute format('create trigger advisory_no_truncate before truncate on msrc_abstracts.%I for each statement execute function msrc_staff.audit_immutable()',t);
 end if;end loop;end$$;

create function msrc_abstracts.advisory_defaults() returns jsonb language sql immutable security invoker set search_path='' as $$
 select '{"enabled":false,"reviewerVisible":false,"noticeReference":null,"evaluationReference":null,"operatingReference":null,"model":null,"maxTokens":null,"maxPerRun":null,"maxPerDay":null,"estimatedCostPerAbstract":null,"dailyCostCap":null,"currency":null,"maxAttempts":null}'::jsonb;
$$;
create function msrc_abstracts.advisory_configuration_valid(c jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare k text;begin
 if jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>8192
 or c<>msrc_abstracts.advisory_defaults()||c or exists(select 1 from jsonb_object_keys(c) x where not(msrc_abstracts.advisory_defaults()?x))
 or jsonb_typeof(c->'enabled') is distinct from 'boolean' or jsonb_typeof(c->'reviewerVisible') is distinct from 'boolean' then return false;end if;
 foreach k in array array['noticeReference','evaluationReference','operatingReference'] loop
 if c->k<>'null'::jsonb and (jsonb_typeof(c->k)<>'string' or char_length(btrim(c->>k)) not between 1 and 500) then return false;end if;
 end loop;
 if c->'model'<>'null'::jsonb and c->>'model'<>'deepseek-flash' then return false;end if;
 if c->'currency'<>'null'::jsonb and (jsonb_typeof(c->'currency')<>'string' or (c->>'currency')!~'^[A-Z]{3}$') then return false;end if;
 foreach k in array array['maxTokens','maxPerRun','maxPerDay','maxAttempts'] loop
 if c->k<>'null'::jsonb and (jsonb_typeof(c->k)<>'number' or (c->>k)!~'^[1-9][0-9]{0,5}$') then return false;end if;
 end loop;
 if (c->>'maxTokens')::integer>16384 or (c->>'maxPerRun')::integer>10000 or (c->>'maxPerDay')::integer>100000 or (c->>'maxAttempts')::integer>5
 or (c->>'maxPerRun')::integer>(c->>'maxPerDay')::integer then return false;end if;
 foreach k in array array['estimatedCostPerAbstract','dailyCostCap'] loop
 if c->k<>'null'::jsonb and (jsonb_typeof(c->k)<>'number' or (c->>k)::numeric<=0 or (c->>k)::numeric>1000000) then return false;end if;
 end loop;
 if c->>'enabled'='true' and exists(select 1 from jsonb_each(c) e where e.value='null'::jsonb) then return false;end if;
 if c->>'enabled'='true' and (c->>'estimatedCostPerAbstract')::numeric*(c->>'maxAttempts')::integer>(c->>'dailyCostCap')::numeric then return false;end if;
 return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;

create function public.msrc_staff_advisory_save_settings(edition_key text,expected_version integer,configuration jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.advisory_settings%rowtype;prior jsonb;is_super boolean;begin
 perform msrc_abstracts.guard();
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if expected_version is null or expected_version<0 or not msrc_abstracts.advisory_configuration_valid(configuration) then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('advisory:'||edition_key,0));
 select * into s from msrc_abstracts.advisory_settings q where q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if coalesce(s.version,0)<>expected_version then return jsonb_build_object('state','conflict');end if;
 prior:=coalesce(s.configuration,msrc_abstracts.advisory_defaults());
 if prior->'currency' is distinct from configuration->'currency'
 and exists(select 1 from msrc_abstracts.advisory_runs q where q.edition_key=edition_key) then return jsonb_build_object('state','conflict');end if;
 is_super:=msrc_staff.authorize(edition_key,array['superAdmin']) is not null;
 if not is_super and (configuration-array['maxPerRun','maxPerDay','estimatedCostPerAbstract','dailyCostCap','currency'])
 is distinct from (prior-array['maxPerRun','maxPerDay','estimatedCostPerAbstract','dailyCostCap','currency']) then return jsonb_build_object('state','denied');end if;
 insert into msrc_abstracts.advisory_settings values(edition_key,expected_version+1,configuration)
 on conflict on constraint advisory_settings_pkey do update set version=excluded.version,configuration=excluded.configuration;
 perform msrc_abstracts.record(edition_key,'advisory.settings_updated',null,jsonb_build_object('version',expected_version+1));
 return jsonb_build_object('state','updated','version',expected_version+1);
end$$;

create function msrc_abstracts.advisory_is_author(submission uuid,actor uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from msrc_abstracts.submissions s where s.id=submission and s.actor_id=actor)
 or exists(select 1 from msrc_abstracts.authors a join auth.users u on u.id=actor and lower(btrim(u.email))=lower(btrim(a.email)) where a.submission_id=submission);
$$;

create function public.msrc_staff_advisory_workspace(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.advisory_settings%rowtype;candidates jsonb;records jsonb;runs jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into s from msrc_abstracts.advisory_settings q where q.edition_key=edition_key;
 select coalesce(jsonb_agg(q.item order by q.reference),'[]'::jsonb) into candidates from (
 select a.reference,jsonb_build_object('id',a.id,'reference',a.reference,'submissionVersion',a.version,'rubricVersion',x.settings_version,'title',p.packet->>'title') item
 from msrc_abstracts.submissions a join msrc_abstracts.snapshots x on x.submission_id=a.id and x.version=a.version
 join msrc_abstracts.packets p on p.submission_id=a.id and p.submission_version=a.version
 where a.edition_key=edition_key and a.finalized_at is not null and a.status in('submitted','scientific_review')
 and not exists(select 1 from msrc_abstracts.advisory_jobs j where j.submission_id=a.id and j.submission_version=a.version and j.rubric_version=x.settings_version)
 order by a.reference limit 1000) q;
 select coalesce(jsonb_agg(q.item order by q.created_at desc),'[]'::jsonb) into records from (
 select r.created_at,jsonb_build_object('id',r.id,'reference',a.reference,'submissionVersion',j.submission_version,'rubricVersion',j.rubric_version,
 'model',r.model,'promptVersion',r.prompt_version,'createdAt',r.created_at,'rubric',v.configuration->'rubric','scores',r.scores) item
 from msrc_abstracts.advisory_records r join msrc_abstracts.advisory_jobs j on j.id=r.job_id
 join msrc_abstracts.submissions a on a.id=j.submission_id
 join msrc_abstracts.settings_versions v on v.edition_key=j.edition_key and v.version=j.rubric_version
 where j.edition_key=edition_key and not msrc_abstracts.advisory_is_author(j.submission_id,auth.uid()) order by r.created_at desc,r.id limit 100) q;
 select coalesce(jsonb_agg(q.item order by q.created_at desc),'[]'::jsonb) into runs from (
 select r.created_at,jsonb_build_object('id',r.id,'createdAt',r.created_at,'count',r.abstract_count,'estimatedCost',r.estimated_cost,'currency',r.configuration->>'currency',
 'completed',(select count(*) from msrc_abstracts.advisory_jobs j where j.run_id=r.id and j.status='completed'),
 'failed',(select count(*) from msrc_abstracts.advisory_jobs j where j.run_id=r.id and j.status in('failed','discarded')),
 'pending',(select count(*) from msrc_abstracts.advisory_jobs j where j.run_id=r.id and j.status in('queued','processing')),
 'errors',coalesce((select jsonb_agg(jsonb_build_object('code',e.error_code,'count',e.n)) from
 (select j.error_code,count(*) n from msrc_abstracts.advisory_jobs j where j.run_id=r.id and j.error_code is not null group by j.error_code) e),'[]'::jsonb)) item
 from msrc_abstracts.advisory_runs r where r.edition_key=edition_key order by r.created_at desc,r.id limit 50) q;
 return jsonb_build_object('state','ready','version',coalesce(s.version,0),'settings',coalesce(s.configuration,msrc_abstracts.advisory_defaults()),
 'eligibleCount',jsonb_array_length(candidates),'candidates',candidates,'records',records,'runs',runs);
end$$;

create function public.msrc_staff_advisory_start(edition_key text,operation_id uuid,submission_ids uuid[]) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.advisory_settings%rowtype;r msrc_abstracts.advisory_runs%rowtype;d msrc_abstracts.advisory_daily_usage%rowtype;
 item record;ids uuid[];input_hash text;n integer;estimate numeric;day date;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or submission_ids is null or cardinality(submission_ids) not between 1 and 1000 or array_position(submission_ids,null) is not null then return jsonb_build_object('state','invalid');end if;
 select array_agg(distinct x order by x) into ids from unnest(submission_ids) x;
 if cardinality(ids)<>cardinality(submission_ids) then return jsonb_build_object('state','invalid');end if;
 input_hash:=md5(ids::text);
 perform pg_advisory_xact_lock(hashtextextended('advisory:'||edition_key,0));
 select * into s from msrc_abstracts.advisory_settings q where q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into r from msrc_abstracts.advisory_runs q where q.edition_key=edition_key and q.operation_id=operation_id;
 if found then
 if r.actor_id<>auth.uid() or r.input_hash<>input_hash then return jsonb_build_object('state','conflict');end if;
 return jsonb_build_object('state','queued','runId',r.id,'count',r.abstract_count,'estimatedCost',r.estimated_cost);end if;
 if s.configuration is null or s.configuration->>'enabled'<>'true' or not msrc_abstracts.advisory_configuration_valid(s.configuration) then return jsonb_build_object('state','disabled');end if;
 n:=cardinality(ids);
 if n>(s.configuration->>'maxPerRun')::integer then return jsonb_build_object('state','budget_exceeded');end if;
 -- Lock current versions before checking FINALIZED and approved-packet eligibility.
 perform 1 from msrc_abstracts.submissions a where a.edition_key=edition_key and a.id=any(ids) order by a.id for share;
 if (select count(*) from msrc_abstracts.submissions a join msrc_abstracts.snapshots x on x.submission_id=a.id and x.version=a.version
 join msrc_abstracts.packets p on p.submission_id=a.id and p.submission_version=a.version
 where a.edition_key=edition_key and a.id=any(ids) and a.finalized_at is not null and a.status in('submitted','scientific_review'))<>n then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_abstracts.advisory_jobs j join msrc_abstracts.submissions a on a.id=j.submission_id and a.version=j.submission_version
 join msrc_abstracts.snapshots x on x.submission_id=a.id and x.version=a.version
 where a.id=any(ids) and j.rubric_version=x.settings_version) then return jsonb_build_object('state','conflict');end if;
 estimate:=n*(s.configuration->>'estimatedCostPerAbstract')::numeric*(s.configuration->>'maxAttempts')::integer;
 day:=(clock_timestamp() at time zone 'UTC')::date;
 insert into msrc_abstracts.advisory_daily_usage(edition_key,utc_day) values(edition_key,day) on conflict do nothing;
 select * into d from msrc_abstracts.advisory_daily_usage q where q.edition_key=edition_key and q.utc_day=day for update;
 if d.reserved_abstracts+n>(s.configuration->>'maxPerDay')::integer or d.reserved_cost+estimate>(s.configuration->>'dailyCostCap')::numeric then return jsonb_build_object('state','budget_exceeded');end if;
 insert into msrc_abstracts.advisory_runs(edition_key,operation_id,actor_id,input_hash,configuration,abstract_count,estimated_cost)
 values(edition_key,operation_id,auth.uid(),input_hash,s.configuration,n,estimate) returning * into r;
 for item in select a.id,a.version,x.settings_version from msrc_abstracts.submissions a join msrc_abstracts.snapshots x on x.submission_id=a.id and x.version=a.version where a.id=any(ids) order by a.id loop
 insert into msrc_abstracts.advisory_jobs(run_id,edition_key,submission_id,submission_version,rubric_version)
 values(r.id,edition_key,item.id,item.version,item.settings_version);end loop;
 update msrc_abstracts.advisory_daily_usage q set reserved_abstracts=q.reserved_abstracts+n,reserved_cost=q.reserved_cost+estimate where q.edition_key=edition_key and q.utc_day=day;
 perform msrc_abstracts.record(edition_key,'advisory.run_queued',r.id,jsonb_build_object('count',n));
 return jsonb_build_object('state','queued','runId',r.id,'count',n,'estimatedCost',estimate);
end$$;

create function public.msrc_advisory_worker_claim(p_worker_id uuid,p_batch_size integer) returns jsonb
 language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare s msrc_abstracts.advisory_settings%rowtype;j msrc_abstracts.advisory_jobs%rowtype;r msrc_abstracts.advisory_runs%rowtype;
 d msrc_abstracts.advisory_daily_usage%rowtype;packet jsonb;rubric jsonb;identity jsonb;locked_at timestamptz;now_at timestamptz;day date;result jsonb:='[]'::jsonb;begin
 perform msrc_abstracts.guard();
 if p_worker_id is null or p_batch_size is null or p_batch_size not between 1 and 10 then raise exception using errcode='22023',message='Invalid advisory claim.';end if;
 for s in select * from msrc_abstracts.advisory_settings q where q.configuration->>'enabled'='true' order by q.edition_key for update skip locked loop
 if not msrc_abstracts.advisory_configuration_valid(s.configuration) then continue;end if;
 now_at:=clock_timestamp();day:=(now_at at time zone 'UTC')::date;
 insert into msrc_abstracts.advisory_daily_usage(edition_key,utc_day) values(s.edition_key,day) on conflict do nothing;
 select * into d from msrc_abstracts.advisory_daily_usage q where q.edition_key=s.edition_key and q.utc_day=day for update;
 for j in select * from msrc_abstracts.advisory_jobs q where q.edition_key=s.edition_key
 and ((q.status='queued' and q.next_attempt_at<=now_at) or(q.status='processing' and q.lease_expires_at<=now_at))
 order by q.next_attempt_at,q.id for update skip locked limit p_batch_size loop
 select * into strict r from msrc_abstracts.advisory_runs q where q.id=j.run_id;
 if r.configuration is distinct from s.configuration then
 update msrc_abstracts.advisory_jobs q set status='discarded',error_code='configuration_changed',claimed_by=null,lease_token=null,lease_expires_at=null,completed_at=now_at where q.id=j.id;continue;end if;
 if j.attempts>=(r.configuration->>'maxAttempts')::integer then
 update msrc_abstracts.advisory_jobs q set status='failed',error_code='max_attempts',claimed_by=null,lease_token=null,lease_expires_at=null,completed_at=now_at where q.id=j.id;continue;end if;
 -- Identity remains server-only screening context, separated from the provider payload.
 -- The frozen document is authoritative even after a later author/profile change.
 select p.packet,v.configuration->'rubric',x.created_at,jsonb_build_object(
 'authorNames',(select coalesce(jsonb_agg(n order by n),'[]'::jsonb) from (
 select au->>'name' n from jsonb_array_elements(x.document->'authors') au
 union select pr.name from msrc_participant.profiles pr where pr.actor_id=a.actor_id
 union select pr.name from msrc_staff.profiles pr where pr.actor_id=a.actor_id) names where char_length(btrim(n))>0),
 'institutions',(select coalesce(jsonb_agg(n order by n),'[]'::jsonb) from (
 select distinct f n from jsonb_array_elements(x.document->'authors') au
 cross join lateral jsonb_array_elements_text(au->'affiliations') f) institutions where char_length(btrim(n))>0))
 into packet,rubric,locked_at,identity from msrc_abstracts.submissions a
 join msrc_abstracts.snapshots x on x.submission_id=a.id and x.version=a.version
 join msrc_abstracts.packets p on p.submission_id=a.id and p.submission_version=a.version
 join msrc_abstracts.settings_versions v on v.edition_key=a.edition_key and v.version=j.rubric_version
 where a.id=j.submission_id and a.edition_key=j.edition_key and a.version=j.submission_version and x.settings_version=j.rubric_version
 and a.finalized_at is not null and a.status in('submitted','scientific_review') for share of a;
 if not found then
 update msrc_abstracts.advisory_jobs q set status='discarded',error_code='stale_snapshot',claimed_by=null,lease_token=null,lease_expires_at=null,completed_at=now_at where q.id=j.id;continue;end if;
 -- Retries consume the daily dispatch cap too: never multiply a configured cap silently.
 exit when d.attempt_count>=(s.configuration->>'maxPerDay')::integer
 or d.attempt_cost+(r.configuration->>'estimatedCostPerAbstract')::numeric>(s.configuration->>'dailyCostCap')::numeric;
 update msrc_abstracts.advisory_jobs q set status='processing',attempts=q.attempts+1,claimed_by=p_worker_id,
 lease_token=gen_random_uuid(),lease_expires_at=now_at+interval '5 minutes',error_code=null where q.id=j.id returning * into j;
 update msrc_abstracts.advisory_daily_usage q set attempt_count=q.attempt_count+1,attempt_cost=q.attempt_cost+(r.configuration->>'estimatedCostPerAbstract')::numeric
 where q.edition_key=s.edition_key and q.utc_day=day returning * into d;
 result:=result||jsonb_build_array(jsonb_build_object('id',j.id,'leaseToken',j.lease_token,'runId',j.run_id,'submissionId',j.submission_id,
 'submissionVersion',j.submission_version,'rubricVersion',j.rubric_version,'title',packet->>'title','body',packet->'body','rubric',rubric,
 'configuration',r.configuration,'attempt',j.attempts,'lockedAt',locked_at,'identity',identity));
 exit when jsonb_array_length(result)>=p_batch_size;
 end loop;exit when jsonb_array_length(result)>=p_batch_size;end loop;
 return result;
end$$;

create function msrc_abstracts.advisory_result_valid(value jsonb,rubric jsonb,model text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare criterion jsonb;score jsonb;begin
 if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>600000
 or value<>jsonb_build_object('scores',value->'scores','model',value->'model','promptVersion',value->'promptVersion')
 or value->>'model' is distinct from model or jsonb_typeof(value->'model') is distinct from 'string'
 or jsonb_typeof(value->'promptVersion') is distinct from 'string' or (value->>'promptVersion')!~'^[A-Za-z0-9_.-]{1,100}$'
 or jsonb_typeof(value->'scores') is distinct from 'array' or jsonb_typeof(rubric) is distinct from 'array' then return false;end if;
 if jsonb_array_length(value->'scores')<>jsonb_array_length(rubric) or jsonb_array_length(rubric)=0
 or (select count(*)<>count(distinct v->>'criterionId') from jsonb_array_elements(value->'scores') v) then return false;end if;
 for criterion in select v from jsonb_array_elements(rubric) v loop
 select v into score from jsonb_array_elements(value->'scores') v where v->>'criterionId'=criterion->>'id';
 if not found or score<>jsonb_build_object('criterionId',score->'criterionId','value',score->'value','rationale',score->'rationale')
 or jsonb_typeof(score->'criterionId') is distinct from 'string' or jsonb_typeof(score->'value') is distinct from 'number'
 or jsonb_typeof(score->'rationale') is distinct from 'string' or char_length(btrim(score->>'rationale')) not between 1 and 1000 then return false;end if;
 if (score->>'value')::numeric<(criterion->>'min')::numeric or (score->>'value')::numeric>(criterion->>'max')::numeric then return false;end if;
 end loop;return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end$$;

create function public.msrc_advisory_worker_finish(p_worker_id uuid,p_job_id uuid,p_lease_token uuid,p_result jsonb,p_error_code text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.advisory_settings%rowtype;j msrc_abstracts.advisory_jobs%rowtype;r msrc_abstracts.advisory_runs%rowtype;
 edition text;rubric jsonb;error_code text;now_at timestamptz;begin
 perform msrc_abstracts.guard();
 if p_worker_id is null or p_job_id is null or p_lease_token is null or (p_result is null)=(p_error_code is null)
 or(p_error_code is not null and p_error_code not in('provider_unavailable','rate_limited','provider_configuration','invalid_output','invalid_snapshot','identity_leak','configuration_changed','disabled','stale_snapshot','budget_exceeded')) then return jsonb_build_object('state','invalid');end if;
 select q.edition_key into edition from msrc_abstracts.advisory_jobs q where q.id=p_job_id;
 select * into s from msrc_abstracts.advisory_settings q where q.edition_key=edition for update;
 select * into j from msrc_abstracts.advisory_jobs q where q.id=p_job_id for update;
 now_at:=clock_timestamp();
 if not found or j.status<>'processing' or j.claimed_by<>p_worker_id or j.lease_token<>p_lease_token or j.lease_expires_at<=now_at then return jsonb_build_object('state','stale');end if;
 select * into strict r from msrc_abstracts.advisory_runs q where q.id=j.run_id;
 perform 1 from msrc_abstracts.submissions a where a.id=j.submission_id and a.version=j.submission_version and a.status in('submitted','scientific_review') and a.finalized_at is not null for share;
 if s.configuration is distinct from r.configuration or s.configuration->>'enabled'<>'true' then error_code:='configuration_changed';
 elsif not found then error_code:='stale_snapshot';
 else error_code:=p_error_code;end if;
 if error_code is null then
 select v.configuration->'rubric' into rubric from msrc_abstracts.settings_versions v where v.edition_key=j.edition_key and v.version=j.rubric_version;
 if not msrc_abstracts.advisory_result_valid(p_result,rubric,r.configuration->>'model') then error_code:='invalid_output';end if;end if;
 if error_code is null then
 insert into msrc_abstracts.advisory_records(job_id,scores,model,prompt_version) values(j.id,p_result->'scores',p_result->>'model',p_result->>'promptVersion');
 update msrc_abstracts.advisory_jobs q set status='completed',completed_at=now_at,claimed_by=null,lease_token=null,lease_expires_at=null,error_code=null where q.id=j.id;
 return jsonb_build_object('state','completed');end if;
 if error_code in('provider_unavailable','rate_limited') and j.attempts<(r.configuration->>'maxAttempts')::integer then
 update msrc_abstracts.advisory_jobs q set status='queued',next_attempt_at=now_at+make_interval(secs=>least(900,30*power(2,j.attempts-1)::integer)),
 claimed_by=null,lease_token=null,lease_expires_at=null,error_code=error_code where q.id=j.id;
 return jsonb_build_object('state','retry');end if;
 update msrc_abstracts.advisory_jobs q set status=case when error_code in('configuration_changed','stale_snapshot') then 'discarded' else 'failed' end,
 completed_at=now_at,claimed_by=null,lease_token=null,lease_expires_at=null,error_code=error_code where q.id=j.id;
 return jsonb_build_object('state','failed');
end$$;

create function public.msrc_staff_advisory_reviewer(edition_key text,assignment_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare a msrc_abstracts.assignments%rowtype;advisory jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into a from msrc_abstracts.assignments q where q.id=assignment_id and q.edition_key=edition_key and q.reviewer_id=auth.uid() and q.status in('assigned','draft','completed');
 if not found or not msrc_abstracts.reviewer_eligible(edition_key,auth.uid()) or msrc_abstracts.has_conflict(edition_key,a.submission_id,auth.uid()) then return jsonb_build_object('state','denied');end if;
 if msrc_abstracts.advisory_is_author(a.submission_id,auth.uid()) then return jsonb_build_object('state','denied');end if;
 -- More conservative than AI-03's draft reveal: the independent review must be completed.
 if a.status<>'completed' or not exists(select 1 from msrc_abstracts.submissions q where q.id=a.submission_id and q.version=a.submission_version and q.status='scientific_review')
 then return jsonb_build_object('state','ready','advisory',null);end if;
 if not coalesce((select s.configuration->>'reviewerVisible'='true' from msrc_abstracts.advisory_settings s where s.edition_key=edition_key),false) then return jsonb_build_object('state','ready','advisory',null);end if;
 select jsonb_build_object('id',r.id,'reference',a2.reference,'submissionVersion',j.submission_version,'rubricVersion',j.rubric_version,
 'rubric',v.configuration->'rubric','scores',r.scores,'model',r.model,'promptVersion',r.prompt_version,'createdAt',r.created_at)
 into advisory from msrc_abstracts.advisory_records r join msrc_abstracts.advisory_jobs j on j.id=r.job_id
 join msrc_abstracts.submissions a2 on a2.id=j.submission_id
 join msrc_abstracts.settings_versions v on v.edition_key=j.edition_key and v.version=j.rubric_version
 where j.submission_id=a.submission_id and j.submission_version=a.submission_version and j.rubric_version=a.rubric_version;
 return jsonb_build_object('state','ready','advisory',advisory);
end$$;

create function public.msrc_staff_advisory_calibration(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare pairs jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(q.pair order by q.submission_id,q.submission_version,q.rubric_version,q.criterion_id),'[]'::jsonb) into pairs from (
 select j.submission_id,j.submission_version,j.rubric_version,ai->>'criterionId' criterion_id,
 jsonb_build_object('submissionId',j.submission_id,'submissionVersion',j.submission_version,'rubricVersion',j.rubric_version,
 'criterionId',ai->>'criterionId','min',(criterion->>'min')::numeric,'max',(criterion->>'max')::numeric,'aiScore',(ai->>'value')::numeric,'humanScore',avg((hs->>'value')::numeric)) pair
 from msrc_abstracts.advisory_records r join msrc_abstracts.advisory_jobs j on j.id=r.job_id
 join msrc_abstracts.settings_versions v on v.edition_key=j.edition_key and v.version=j.rubric_version
 cross join lateral jsonb_array_elements(r.scores) ai
 cross join lateral jsonb_array_elements(v.configuration->'rubric') criterion
 join msrc_abstracts.assignments a on a.submission_id=j.submission_id and a.submission_version=j.submission_version and a.rubric_version=j.rubric_version and a.status='completed'
 cross join lateral jsonb_array_elements(a.scorecard->'scores') hs
 where j.edition_key=edition_key and ai->>'criterionId'=criterion->>'id' and hs->>'criterionId'=ai->>'criterionId'
 and not msrc_abstracts.advisory_is_author(j.submission_id,auth.uid())
 and msrc_abstracts.reviewer_eligible(edition_key,a.reviewer_id) and not msrc_abstracts.has_conflict(edition_key,j.submission_id,a.reviewer_id)
 -- A sentinel above the response decoder's capacity rejects the whole cohort.
 -- No metrics may be calculated from a truncated subset of eligible pairs.
 group by j.submission_id,j.submission_version,j.rubric_version,ai,criterion limit 500001) q;
 if jsonb_array_length(pairs)>500000 then return jsonb_build_object('state','unavailable');end if;
 return jsonb_build_object('state','ready','pairs',pairs);
end$$;

revoke all on all functions in schema msrc_abstracts from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_advisory_workspace(text),public.msrc_staff_advisory_save_settings(text,integer,jsonb),
 public.msrc_staff_advisory_start(text,uuid,uuid[]),public.msrc_staff_advisory_reviewer(text,uuid),public.msrc_staff_advisory_calibration(text),
 public.msrc_advisory_worker_claim(uuid,integer),public.msrc_advisory_worker_finish(uuid,uuid,uuid,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_advisory_workspace(text),public.msrc_staff_advisory_save_settings(text,integer,jsonb),
 public.msrc_staff_advisory_start(text,uuid,uuid[]),public.msrc_staff_advisory_reviewer(text,uuid),public.msrc_staff_advisory_calibration(text) to authenticated;
grant execute on function public.msrc_advisory_worker_claim(uuid,integer),public.msrc_advisory_worker_finish(uuid,uuid,uuid,jsonb,text) to service_role;
notify pgrst,'reload schema';
commit;
