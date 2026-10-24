-- ENG-078; REV-06/07/10, ABS-08, ROL-06, CFG-04, DAT-02.
-- Review-only additive migration. No settings seed, activation, upload or delivery.
begin;
create schema msrc_research_event;
revoke all on schema msrc_research_event from public,anon,authenticated,service_role;
create table msrc_research_event.settings (
 edition_key text primary key references msrc_authorization.edition_config(edition_key),
 version integer not null check(version>0),configuration jsonb not null,
 enabled boolean not null default false,evidence_ready boolean not null default false
);
create table msrc_research_event.settings_versions (
 edition_key text not null references msrc_research_event.settings(edition_key),version integer not null,configuration jsonb not null,
 primary key(edition_key,version)
);
create table msrc_research_event.allocations (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references msrc_abstracts.submissions(id),
 submission_version integer not null,format text not null check(format in('oral','poster')),actor_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version)
);
create index research_event_allocations_submission on msrc_research_event.allocations(submission_id,created_at desc,id desc);
create table msrc_research_event.allocation_publications (
 allocation_id uuid primary key references msrc_research_event.allocations(id),actor_id uuid not null,published_at timestamptz not null default clock_timestamp()
);
create table msrc_research_event.categories (
 submission_id uuid primary key references msrc_abstracts.submissions(id),submission_version integer not null,category_id text not null,
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version)
);
create table msrc_research_event.assignments (
 id uuid primary key default gen_random_uuid(),edition_key text not null,submission_id uuid not null references msrc_abstracts.submissions(id),
 submission_version integer not null,category_id text not null,judge_id uuid not null,settings_version integer not null,
 version integer not null default 1 check(version>0),status text not null default 'assigned' check(status in('assigned','draft','completed','conflict','withdrawn')),
 scorecard jsonb,foreign key(edition_key,settings_version) references msrc_research_event.settings_versions(edition_key,version),
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version)
);
create unique index research_event_active_judge on msrc_research_event.assignments(submission_id,judge_id) where status<>'withdrawn';
create index research_event_judge_queue on msrc_research_event.assignments(edition_key,judge_id,status);
create index research_event_assignment_settings on msrc_research_event.assignments(edition_key,settings_version);
create table msrc_research_event.scorecard_versions (
 assignment_id uuid not null references msrc_research_event.assignments(id),version integer not null,scorecard jsonb,status text not null,
 primary key(assignment_id,version)
);
create table msrc_research_event.conflicts (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references msrc_abstracts.submissions(id),judge_id uuid not null,reason text not null,
 created_at timestamptz not null default clock_timestamp(),unique(submission_id,judge_id)
);
create table msrc_research_event.awards (
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references msrc_abstracts.submissions(id),
 submission_version integer not null,category_id text not null,label text not null,reason text not null,tie_resolution text not null,
 judging_basis jsonb not null,configuration jsonb not null,actor_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version)
);
create index research_event_awards_category on msrc_research_event.awards(category_id);
create index research_event_awards_submission on msrc_research_event.awards(submission_id);
-- Correct prepared outcomes by appending a replacement or withdrawal; never rewrite history.
create table msrc_research_event.award_changes (
 award_id uuid primary key references msrc_research_event.awards(id),replacement_id uuid references msrc_research_event.awards(id),
 actor_id uuid not null,reason text not null,created_at timestamptz not null default clock_timestamp(),
 check(award_id is distinct from replacement_id)
);
create index research_event_award_changes_replacement on msrc_research_event.award_changes(replacement_id);
create table msrc_research_event.supervisors (
 id uuid primary key default gen_random_uuid(),award_id uuid not null references msrc_research_event.awards(id),actor_id uuid not null,
 name text not null,affiliation text not null,email text not null,confirmed boolean not null check(confirmed),created_at timestamptz not null default clock_timestamp()
);
create index research_event_supervisors_award on msrc_research_event.supervisors(award_id,created_at desc,id desc);
create table msrc_research_event.confirmations (
 award_id uuid primary key references msrc_research_event.awards(id),supervisor_id uuid not null references msrc_research_event.supervisors(id),
 actor_id uuid not null,validation_reason text not null,confirmed_at timestamptz not null default clock_timestamp()
);
create index research_event_confirmations_supervisor on msrc_research_event.confirmations(supervisor_id);
create table msrc_research_event.award_publications (
 award_id uuid primary key references msrc_research_event.confirmations(award_id),actor_id uuid not null,published_at timestamptz not null default clock_timestamp()
);
create table msrc_research_event.operations (
 edition_key text not null,actor_id uuid not null,operation_id uuid not null,input_hash bytea not null,result jsonb not null,
 primary key(edition_key,actor_id,operation_id)
);
create table msrc_research_event.audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,actor_id uuid,session_id uuid,event text not null,target_id uuid,
 details jsonb not null default '{}'::jsonb,created_at timestamptz not null default clock_timestamp()
);
create index research_event_audit_edition on msrc_research_event.audit(edition_key,created_at,id);
do $$declare t text;begin
 foreach t in array array['settings','settings_versions','allocations','allocation_publications','categories','assignments','scorecard_versions','conflicts','awards','award_changes','supervisors','confirmations','award_publications','operations','audit'] loop
 execute format('alter table msrc_research_event.%I enable row level security',t);
 execute format('alter table msrc_research_event.%I force row level security',t);
 if t not in('settings','categories','assignments') then
 execute format('create trigger research_event_append_only before insert or update or delete on msrc_research_event.%I for each row execute function msrc_staff.audit_immutable()',t);
 execute format('create trigger research_event_no_truncate before truncate on msrc_research_event.%I for each statement execute function msrc_staff.audit_immutable()',t);
 end if;end loop;end$$;
revoke all on all tables in schema msrc_research_event from public,anon,authenticated,service_role;
comment on column msrc_research_event.settings.enabled is 'Independent closed release gate; no application RPC changes this value.';
comment on column msrc_research_event.settings.evidence_ready is 'Independent privacy, operating and rubric approval gate. Final-material uploads remain in the existing closed abstract stage-two gate; this schema exposes no files.';
comment on table msrc_research_event.supervisors is 'ABS-08: private selected-winner-only details and participant confirmation. No judge or ordinary committee projection returns supervisor details.';

create function msrc_research_event.defaults() returns jsonb language sql immutable security invoker set search_path='' as $$
 select '{"rubric":[],"judgeCount":null,"tieRule":null,"categories":[],"lockAt":null,"supervisorDeadline":null,"supervisorEvidence":null}'::jsonb;
$$;
create function msrc_research_event.settings_valid(c jsonb,complete boolean) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare v jsonb;k text;instant timestamptz;begin
 if jsonb_typeof(c) is distinct from 'object' or c<>msrc_research_event.defaults()||c or octet_length(c::text)>131072
 or exists(select 1 from jsonb_object_keys(c) x where not(msrc_research_event.defaults()?x)) then return false;end if;
 foreach k in array array['rubric','categories'] loop
 if jsonb_typeof(c->k) is distinct from 'array' or jsonb_array_length(c->k)>100 then return false;end if;
 if complete and jsonb_array_length(c->k)=0 then return false;end if;
 if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(c->k) x) then return false;end if;
 for v in select value from jsonb_array_elements(c->k) loop
 if jsonb_typeof(v) is distinct from 'object' or coalesce(v->>'id','')!~'^[A-Za-z0-9_-]{1,60}$'
 or jsonb_typeof(v->'label') is distinct from 'string' or length(btrim(v->>'label')) not between 1 and 500 then return false;end if;
 if k='categories' then if v<>jsonb_build_object('id',v->'id','label',v->'label') then return false;end if;
 else
 if v<>jsonb_build_object('id',v->'id','label',v->'label','min',v->'min','max',v->'max') or jsonb_typeof(v->'min') is distinct from 'number'
 or jsonb_typeof(v->'max') is distinct from 'number' then return false;end if;
 if (v->>'min')::numeric >= (v->>'max')::numeric then return false;end if;end if;end loop;end loop;
 if c->'judgeCount' <> 'null'::jsonb then
 if jsonb_typeof(c->'judgeCount') is distinct from 'number' or c->>'judgeCount'!~'^[1-9][0-9]{0,2}$' then return false;end if;
 elsif complete then return false;end if;
 foreach k in array array['tieRule','supervisorEvidence'] loop
 if c->k='null'::jsonb then if complete and k='tieRule' then return false;end if;
 elsif jsonb_typeof(c->k) is distinct from 'string' or length(btrim(c->>k)) not between 1 and 6000 then return false;end if;end loop;
 foreach k in array array['lockAt','supervisorDeadline'] loop
 if c->k='null'::jsonb then if complete and k='lockAt' then return false;end if;
 else
 if jsonb_typeof(c->k) is distinct from 'string' then return false;end if;
 begin instant:=(c->>k)::timestamptz;exception when others then return false;end;
 if not isfinite(instant) then return false;end if;end if;end loop;
 return true;
end$$;

create function msrc_research_event.participant(edition text,action text,award uuid,details jsonb,operation uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg msrc_research_event.settings%rowtype;w msrc_research_event.awards%rowtype;s msrc_abstracts.submissions%rowtype;old msrc_research_event.operations%rowtype;input bytea;result jsonb;begin
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 if not msrc_participant.ready() then return jsonb_build_object('state','closed');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 select * into cfg from msrc_research_event.settings q where q.edition_key=edition;
 if cfg.edition_key is null or not cfg.enabled or not cfg.evidence_ready then return jsonb_build_object('state','closed');end if;
 if action='me' then
 return jsonb_build_object('state','ready','entries',(select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'title',q.document->>'title','reference',q.reference,
 'presentationFormat',(select a.format from msrc_research_event.allocations a join msrc_research_event.allocation_publications p on p.allocation_id=a.id
 where a.submission_id=q.id and a.submission_version=q.version order by p.published_at desc,a.id desc limit 1),
 'award',(select jsonb_build_object('label',a.label,'categoryId',a.category_id) from msrc_research_event.awards a join msrc_research_event.award_publications p on p.award_id=a.id where a.submission_id=q.id and a.submission_version=q.version
 and not exists(select 1 from msrc_research_event.award_changes x where x.award_id=a.id)),
 'supervisorRequest',(select jsonb_build_object('awardId',a.id,'deadline',a.configuration->>'supervisorDeadline','evidence',a.configuration->>'supervisorEvidence',
 'details',(select jsonb_build_object('name',z.name,'affiliation',z.affiliation,'email',z.email,'confirmed',z.confirmed) from msrc_research_event.supervisors z where z.award_id=a.id order by z.created_at desc,z.id desc limit 1))
 from msrc_research_event.awards a where a.submission_id=q.id and a.submission_version=q.version and a.configuration->>'supervisorDeadline' is not null and a.configuration->>'supervisorEvidence' is not null
 and not exists(select 1 from msrc_research_event.award_changes x where x.award_id=a.id)
 and not exists(select 1 from msrc_research_event.confirmations c where c.award_id=a.id))) order by q.reference,q.id),'[]'::jsonb)
 from msrc_abstracts.submissions q where q.edition_key=edition and q.actor_id=auth.uid() and msrc_research_event.accepted(q)));
 end if;
 if action<>'supervisor' or operation is null or award is null then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('research-event:'||edition,0));
 if not msrc_participant.ready() or msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 select * into cfg from msrc_research_event.settings q where q.edition_key=edition for share;
 if cfg.edition_key is null or not cfg.enabled or not cfg.evidence_ready then return jsonb_build_object('state','closed');end if;
 input:=sha256(convert_to(jsonb_build_array(action,award,details)::text,'UTF8'));
 select * into old from msrc_research_event.operations o where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=operation;
 if found then if old.input_hash<>input then return jsonb_build_object('state','conflict');end if;return old.result;end if;
 select * into w from msrc_research_event.awards q where q.id=award;
 select * into s from msrc_abstracts.submissions q where q.id=w.submission_id and q.edition_key=edition and q.actor_id=auth.uid() for update;
 if not found or not msrc_research_event.accepted(s) or s.version<>w.submission_version then return jsonb_build_object('state','denied');end if;
 if exists(select 1 from msrc_research_event.award_changes q where q.award_id=w.id) then return jsonb_build_object('state','conflict');end if;
 if exists(select 1 from msrc_research_event.confirmations q where q.award_id=w.id) then return jsonb_build_object('state','locked');end if;
 if w.configuration->>'supervisorDeadline' is null or w.configuration->>'supervisorEvidence' is null then return jsonb_build_object('state','settings_incomplete');end if;
 if clock_timestamp()>=(w.configuration->>'supervisorDeadline')::timestamptz then return jsonb_build_object('state','locked');end if;
 if jsonb_typeof(details) is distinct from 'object' or details<>jsonb_build_object('name',details->'name','affiliation',details->'affiliation','email',details->'email','confirmed',details->'confirmed')
 or jsonb_typeof(details->'name') is distinct from 'string' or length(btrim(details->>'name')) not between 1 and 500
 or jsonb_typeof(details->'affiliation') is distinct from 'string' or length(btrim(details->>'affiliation')) not between 1 and 500
 or jsonb_typeof(details->'email') is distinct from 'string' or length(details->>'email')>254 or details->>'email'!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
 or details->'confirmed' is distinct from 'true'::jsonb then return jsonb_build_object('state','invalid');end if;
 insert into msrc_research_event.supervisors(award_id,actor_id,name,affiliation,email,confirmed) values(w.id,auth.uid(),btrim(details->>'name'),btrim(details->>'affiliation'),lower(btrim(details->>'email')),true);
 perform msrc_research_event.record(edition,'participant.supervisor',w.id,jsonb_build_object('operationId',operation));
 result:=jsonb_build_object('state','saved');insert into msrc_research_event.operations values(edition,auth.uid(),operation,input,result);return result;
end$$;
create function msrc_research_event.admin(edition text) returns boolean language sql volatile security invoker set search_path='' as $$
 select msrc_staff.authorize(edition,array['superAdmin','scientificAdministrator'],false) is not null;
$$;
create function msrc_research_event.committee(edition text,category text default null) returns boolean language sql volatile security invoker set search_path='' as $$
 select msrc_research_event.admin(edition) or (msrc_staff.authorize(edition,null,false) is not null and exists(
 select 1 from msrc_authorization.role_grants g where g.actor_id=auth.uid() and g.edition_key=edition and g.state='active' and g.role_name='judgingCommittee'
 and (g.scope_kind='edition' or g.scope_kind='resource' and (category is null or g.scope_target='research-category:'||category))));
$$;
create function msrc_research_event.accepted(s msrc_abstracts.submissions) returns boolean language sql stable security invoker set search_path='' as $$
 select s.status='accepted' and exists(select 1 from msrc_abstracts.decisions d join msrc_abstracts.publications p on p.decision_id=d.id
 where d.submission_id=s.id and d.submission_version=s.version and d.outcome='accept');
$$;
create function msrc_research_event.conflicted(edition text,submission uuid,judge uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select msrc_abstracts.has_conflict(edition,submission,judge) or exists(select 1 from msrc_research_event.conflicts c where c.submission_id=submission and c.judge_id=judge)
 or exists(select 1 from msrc_abstracts.assignments a where a.submission_id=submission and a.reviewer_id=judge);
$$;
create function msrc_research_event.record(edition text,event_name text,target uuid,details jsonb default '{}'::jsonb) returns void language sql security definer set search_path='' as $$
 insert into msrc_research_event.audit(edition_key,actor_id,session_id,event,target_id,details)
 values(edition,auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,event_name,target,details);
$$;
create function msrc_research_event.basis(edition text,category text) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('assignmentId',a.id,'submissionId',a.submission_id,'version',a.version,'settingsVersion',a.settings_version,
 'rubric',v.configuration->'rubric','scorecard',a.scorecard) order by a.id),'[]'::jsonb)
 from msrc_research_event.assignments a join msrc_abstracts.submissions s on s.id=a.submission_id and s.version=a.submission_version
 join msrc_research_event.settings_versions v on v.edition_key=a.edition_key and v.version=a.settings_version
 where a.edition_key=edition and a.category_id=category and a.status='completed' and msrc_research_event.accepted(s)
 and msrc_competitions.eligible_staff(edition,a.judge_id,array['facultyJudge']) and not msrc_research_event.conflicted(edition,a.submission_id,a.judge_id);
$$;
create function msrc_research_event.category_complete(edition text,category text,c jsonb) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from msrc_research_event.categories cat join msrc_abstracts.submissions s on s.id=cat.submission_id and s.version=cat.submission_version
 where s.edition_key=edition and cat.category_id=category and msrc_research_event.accepted(s)) and not exists(
 select 1 from msrc_research_event.categories cat join msrc_abstracts.submissions s on s.id=cat.submission_id and s.version=cat.submission_version
 where s.edition_key=edition and cat.category_id=category and msrc_research_event.accepted(s) and
 (select count(*) from msrc_research_event.assignments a where a.submission_id=s.id and a.submission_version=s.version and a.status='completed'
 and msrc_competitions.eligible_staff(edition,a.judge_id,array['facultyJudge']) and not msrc_research_event.conflicted(edition,s.id,a.judge_id))<>(c->>'judgeCount')::integer);
$$;

create function public.msrc_staff_research_event_read(edition_key text,view text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_research_event.settings%rowtype;result jsonb;begin
 perform msrc_abstracts.guard();
 select * into cfg from msrc_research_event.settings q where q.edition_key=edition_key;
 if view='settings' then
 if not msrc_research_event.committee(edition_key) then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready','version',coalesce(cfg.version,0),'settings',coalesce(cfg.configuration,msrc_research_event.defaults()),'enabled',coalesce(cfg.enabled,false),
 'ready',coalesce(cfg.enabled,false) and coalesce(cfg.evidence_ready,false) and msrc_research_event.settings_valid(coalesce(cfg.configuration,msrc_research_event.defaults()),true));
 elsif view='list' then
 if not msrc_research_event.committee(edition_key) then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'version',s.version,'reference',s.reference,'title',s.document->>'title',
 'allocation',(select jsonb_build_object('id',a.id,'format',a.format,'published',exists(select 1 from msrc_research_event.allocation_publications p where p.allocation_id=a.id))
 from msrc_research_event.allocations a where a.submission_id=s.id and a.submission_version=s.version order by a.created_at desc,a.id desc limit 1),
 'categoryId',cat.category_id,'judgingBasis',(select coalesce(jsonb_agg(jsonb_build_object('assignmentId',a.id,'judgeId',a.judge_id,'scorecard',a.scorecard,'rubric',v.configuration->'rubric') order by a.id),'[]'::jsonb)
 from msrc_research_event.assignments a join msrc_research_event.settings_versions v on v.edition_key=a.edition_key and v.version=a.settings_version
 where a.submission_id=s.id and a.submission_version=s.version and a.status='completed' and msrc_competitions.eligible_staff(edition_key,a.judge_id,array['facultyJudge']) and not msrc_research_event.conflicted(edition_key,s.id,a.judge_id)),
 'assignments',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'judgeId',a.judge_id,'version',a.version,'status',a.status) order by a.id),'[]'::jsonb)
 from msrc_research_event.assignments a where a.submission_id=s.id and a.submission_version=s.version),
 'award',(select jsonb_build_object('id',w.id,'categoryId',w.category_id,'label',w.label,'reason',w.reason,'tieResolution',w.tie_resolution,
 'status',case when exists(select 1 from msrc_research_event.award_publications p where p.award_id=w.id) then 'published'
 when exists(select 1 from msrc_research_event.confirmations f where f.award_id=w.id) then 'confirmed' else 'winner_pending_supervisor' end,
 'supervisorReady',exists(select 1 from msrc_research_event.supervisors z where z.award_id=w.id and z.confirmed),
 'supervisor',case when msrc_research_event.admin(edition_key) then (select jsonb_build_object('name',z.name,'affiliation',z.affiliation,'email',z.email,'confirmed',z.confirmed)
 from msrc_research_event.supervisors z where z.award_id=w.id order by z.created_at desc,z.id desc limit 1) else null end)
 from msrc_research_event.awards w where w.submission_id=s.id and w.submission_version=s.version
 and not exists(select 1 from msrc_research_event.award_changes x where x.award_id=w.id))) order by s.reference,s.id),'[]'::jsonb) into result
 from msrc_abstracts.submissions s left join msrc_research_event.categories cat on cat.submission_id=s.id and cat.submission_version=s.version
 where s.edition_key=edition_key and msrc_research_event.accepted(s) and (msrc_research_event.admin(edition_key) or msrc_staff.authorize(edition_key,array['judgingCommittee'],false) is not null
 or cat.category_id is not null and msrc_research_event.committee(edition_key,cat.category_id));
 return jsonb_build_object('state','ready','entries',result);
 elsif view='judge_queue' then
 if msrc_staff.authorize(edition_key,array['facultyJudge'],false) is null then return jsonb_build_object('state','denied');end if;
 if cfg.edition_key is null or not cfg.enabled or not cfg.evidence_ready or not msrc_research_event.settings_valid(cfg.configuration,true) then return jsonb_build_object('state','closed');end if;
 -- Independent event packet: no pre-event cards, reviewer assignments, evidence or author details are returned.
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'submissionId',s.id,'title',snap.document->>'title','version',a.version,'status',a.status,'categoryId',a.category_id,
 'lockAt',v.configuration->>'lockAt','rubric',v.configuration->'rubric','packet',jsonb_build_object('title',snap.document->>'title','body',
 concat_ws(E'\n\n','Background: '||(snap.document->'body'->>'background'),'Aim: '||(snap.document->'body'->>'aim'),'Methods: '||(snap.document->'body'->>'methods'),
 'Results: '||(snap.document->'body'->>'results'),'Conclusion: '||(snap.document->'body'->>'conclusion'))),'scorecard',a.scorecard) order by a.id),'[]'::jsonb) into result
 from msrc_research_event.assignments a join msrc_abstracts.submissions s on s.id=a.submission_id and s.version=a.submission_version
 join msrc_abstracts.snapshots snap on snap.submission_id=s.id and snap.version=s.version
 join msrc_research_event.settings_versions v on v.edition_key=a.edition_key and v.version=a.settings_version
 where a.edition_key=edition_key and a.judge_id=auth.uid() and a.status in('assigned','draft','completed') and s.status='accepted'
 and not msrc_research_event.conflicted(edition_key,s.id,auth.uid());
 return jsonb_build_object('state','ready','assignments',result);
 end if;return jsonb_build_object('state','invalid');
end$$;

create function public.msrc_staff_research_event_write(edition_key text,action text,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_research_event.settings%rowtype;s msrc_abstracts.submissions%rowtype;a msrc_research_event.assignments%rowtype;
 old msrc_research_event.operations%rowtype;w msrc_research_event.awards%rowtype;sup msrc_research_event.supervisors%rowtype;
 input bytea;result jsonb;category text;target uuid;label text;basis jsonb;replacement uuid;begin
 perform msrc_abstracts.guard();
 if action is null or operation_id is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>131072 then return jsonb_build_object('state','invalid');end if;
 if action in('judge','conflict') then
 if msrc_staff.authorize(edition_key,array['facultyJudge'],false) is null then return jsonb_build_object('state','denied');end if;
 elsif action in('settings','allocate','publish_allocation','confirm_award','publish_award') then
 if not msrc_research_event.admin(edition_key) then return jsonb_build_object('state','denied');end if;
 elsif action not in('assign','reassign','prepare_award','withdraw_award') or not msrc_research_event.committee(edition_key) then return jsonb_build_object('state','denied');end if;
 perform pg_advisory_xact_lock(hashtextextended('research-event:'||edition_key,0));
 -- This edition lock serializes settings, category cohorts, scorecards, publications and winner supervision.
 if msrc_staff.authorize(edition_key,null,false) is null then return jsonb_build_object('state','denied');end if;
 if action in('judge','conflict') then
 if msrc_staff.authorize(edition_key,array['facultyJudge'],false) is null then return jsonb_build_object('state','denied');end if;
 elsif action in('settings','allocate','publish_allocation','confirm_award','publish_award') then
 if not msrc_research_event.admin(edition_key) then return jsonb_build_object('state','denied');end if;
 elsif not msrc_research_event.committee(edition_key) then return jsonb_build_object('state','denied');end if;
 input:=sha256(convert_to(jsonb_build_array(action,payload)::text,'UTF8'));
 select * into old from msrc_research_event.operations o where o.edition_key=edition_key and o.actor_id=auth.uid() and o.operation_id=operation_id;
 if found then if old.input_hash<>input then return jsonb_build_object('state','conflict');end if;return old.result;end if;
 select * into cfg from msrc_research_event.settings q where q.edition_key=edition_key for update;
 if action='settings' then
 if coalesce(cfg.version,0) is distinct from (payload->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 if not msrc_research_event.settings_valid(payload->'settings',false) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_research_event.assignments q where q.edition_key=edition_key)
 and (cfg.configuration-array['supervisorDeadline','supervisorEvidence']) is distinct from ((payload->'settings')-array['supervisorDeadline','supervisorEvidence']) then return jsonb_build_object('state','locked');end if;
 if cfg.edition_key is null then insert into msrc_research_event.settings(edition_key,version,configuration) values(edition_key,1,payload->'settings') returning * into cfg;
 else update msrc_research_event.settings q set version=q.version+1,configuration=payload->'settings' where q.edition_key=edition_key returning * into cfg;end if;
 insert into msrc_research_event.settings_versions values(edition_key,cfg.version,cfg.configuration);
 result:=jsonb_build_object('state','updated');
 else
 if cfg.edition_key is null or not cfg.enabled or not cfg.evidence_ready then return jsonb_build_object('state','closed');end if;
 if action in('judge','conflict') then
 select * into a from msrc_research_event.assignments q where q.id=(payload->>'assignmentId')::uuid and q.edition_key=edition_key and q.judge_id=auth.uid() for update;
 if not found then return jsonb_build_object('state','denied');end if;target:=a.submission_id;
 else target:=(payload->>'submissionId')::uuid;end if;
 select * into s from msrc_abstracts.submissions q where q.id=target and q.edition_key=edition_key for update;
 if not found or not msrc_research_event.accepted(s) then return jsonb_build_object('state','denied');end if;
 if action not in('judge','conflict') and s.version is distinct from (payload->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 if action='allocate' then
 if coalesce(payload->>'format','') not in('oral','poster') then return jsonb_build_object('state','invalid');end if;
 insert into msrc_research_event.allocations(submission_id,submission_version,format,actor_id) values(s.id,s.version,payload->>'format',auth.uid());
 result:=jsonb_build_object('state','prepared');
 elsif action='publish_allocation' then
 if not exists(select 1 from msrc_research_event.allocations q where q.id=(payload->>'allocationId')::uuid and q.submission_id=s.id and q.submission_version=s.version
 and q.id=(select z.id from msrc_research_event.allocations z where z.submission_id=s.id and z.submission_version=s.version order by z.created_at desc,z.id desc limit 1)) then return jsonb_build_object('state','conflict');end if;
 if exists(select 1 from msrc_research_event.allocation_publications p where p.allocation_id=(payload->>'allocationId')::uuid) then return jsonb_build_object('state','locked');end if;
 insert into msrc_research_event.allocation_publications values((payload->>'allocationId')::uuid,auth.uid(),clock_timestamp());result:=jsonb_build_object('state','published');
 elsif action in('assign','reassign') then
 if not msrc_research_event.settings_valid(cfg.configuration,true) or clock_timestamp()>=(cfg.configuration->>'lockAt')::timestamptz then return jsonb_build_object('state','closed');end if;
 category:=payload->>'categoryId';
 if action='reassign' then
 select * into a from msrc_research_event.assignments q where q.id=(payload->>'assignmentId')::uuid and q.submission_id=s.id for update;
 if not found or a.status not in('conflict','withdrawn') then return jsonb_build_object('state','invalid');end if;category:=a.category_id;end if;
 if not msrc_research_event.committee(edition_key,category) then return jsonb_build_object('state','denied');end if;
 if not exists(select 1 from jsonb_array_elements(cfg.configuration->'categories') c where c->>'id'=category) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_research_event.awards q join msrc_research_event.confirmations f on f.award_id=q.id
 join msrc_abstracts.submissions z on z.id=q.submission_id where z.edition_key=edition_key and q.category_id=category) then return jsonb_build_object('state','locked');end if;
 if exists(select 1 from msrc_research_event.categories q where q.submission_id=s.id and (q.category_id<>category or q.submission_version<>s.version)) then return jsonb_build_object('state','conflict');end if;
 if not msrc_competitions.eligible_staff(edition_key,(payload->>'judgeId')::uuid,array['facultyJudge']) then return jsonb_build_object('state','denied');end if;
 if msrc_research_event.conflicted(edition_key,s.id,(payload->>'judgeId')::uuid) then return jsonb_build_object('state','coi');end if;
 if exists(select 1 from msrc_research_event.assignments q where q.submission_id=s.id and q.judge_id=(payload->>'judgeId')::uuid and q.status<>'withdrawn') then return jsonb_build_object('state','duplicate');end if;
 if (select count(*) from msrc_research_event.assignments q where q.submission_id=s.id and q.status in('assigned','draft','completed')) >= (cfg.configuration->>'judgeCount')::integer then return jsonb_build_object('state','full');end if;
 insert into msrc_research_event.categories values(s.id,s.version,category) on conflict on constraint categories_pkey do nothing;
 insert into msrc_research_event.assignments(edition_key,submission_id,submission_version,category_id,judge_id,settings_version)
 values(edition_key,s.id,s.version,category,(payload->>'judgeId')::uuid,cfg.version);
 result:=jsonb_build_object('state','assigned');
 elsif action in('judge','conflict') then
 if a.version is distinct from (payload->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 if a.submission_version<>s.version or a.status in('conflict','withdrawn') then return jsonb_build_object('state','denied');end if;
 if action='conflict' then
 if jsonb_typeof(payload->'reason') is distinct from 'string' or length(btrim(payload->>'reason')) not between 1 and 3000 then return jsonb_build_object('state','invalid');end if;
 insert into msrc_research_event.conflicts(submission_id,judge_id,reason) values(s.id,auth.uid(),payload->>'reason');
 update msrc_research_event.assignments q set status='conflict',version=q.version+1 where q.id=a.id returning * into a;
 else
 if msrc_research_event.conflicted(edition_key,s.id,auth.uid()) then return jsonb_build_object('state','coi');end if;
 if not msrc_research_event.settings_valid(cfg.configuration,true) or clock_timestamp()>=(cfg.configuration->>'lockAt')::timestamptz
 or exists(select 1 from msrc_research_event.awards q join msrc_research_event.confirmations f on f.award_id=q.id
 join msrc_abstracts.submissions z on z.id=q.submission_id where z.edition_key=edition_key and q.category_id=a.category_id) then return jsonb_build_object('state','locked');end if;
 if jsonb_typeof(payload->'submit') is distinct from 'boolean' or not msrc_competitions.scorecard_valid(payload->'scorecard',cfg.configuration->'rubric',(payload->>'submit')::boolean) then return jsonb_build_object('state','invalid');end if;
 update msrc_research_event.assignments q set version=q.version+1,scorecard=payload->'scorecard',status=case when payload->>'submit'='true' then 'completed' else 'draft' end where q.id=a.id returning * into a;
 end if;
 insert into msrc_research_event.scorecard_versions values(a.id,a.version,a.scorecard,a.status);result:=jsonb_build_object('state','updated');
 elsif action='prepare_award' then
 category:=payload->>'categoryId';
 if not msrc_research_event.committee(edition_key,category) then return jsonb_build_object('state','denied');end if;
 if not msrc_research_event.settings_valid(cfg.configuration,true) then return jsonb_build_object('state','closed');end if;
 if cfg.configuration->>'supervisorDeadline' is null or cfg.configuration->>'supervisorEvidence' is null then return jsonb_build_object('state','settings_incomplete');end if;
 if clock_timestamp()>=(cfg.configuration->>'supervisorDeadline')::timestamptz then return jsonb_build_object('state','locked');end if;
 if jsonb_typeof(payload->'reason') is distinct from 'string' or length(btrim(payload->>'reason')) not between 1 and 6000
 or jsonb_typeof(payload->'tieResolution') is distinct from 'string' or length(btrim(payload->>'tieResolution')) not between 1 and 6000 then return jsonb_build_object('state','invalid');end if;
 if not exists(select 1 from msrc_research_event.categories q where q.submission_id=s.id and q.submission_version=s.version and q.category_id=category) then return jsonb_build_object('state','invalid');end if;
 if not msrc_research_event.category_complete(edition_key,category,cfg.configuration) then return jsonb_build_object('state','reviews_incomplete');end if;
 select * into w from msrc_research_event.awards q where q.submission_id=s.id
 and not exists(select 1 from msrc_research_event.award_changes x where x.award_id=q.id);
 if exists(select 1 from msrc_research_event.confirmations f where f.award_id=w.id) then return jsonb_build_object('state','locked');end if;
 select c->>'label' into label from jsonb_array_elements(cfg.configuration->'categories') c where c->>'id'=category;
 basis:=msrc_research_event.basis(edition_key,category);
 insert into msrc_research_event.awards(submission_id,submission_version,category_id,label,reason,tie_resolution,judging_basis,configuration,actor_id)
 values(s.id,s.version,category,label,payload->>'reason',payload->>'tieResolution',basis,cfg.configuration,auth.uid()) returning id into replacement;
 if w.id is not null then insert into msrc_research_event.award_changes(award_id,replacement_id,actor_id,reason) values(w.id,replacement,auth.uid(),payload->>'reason');end if;
 result:=jsonb_build_object('state','prepared');
 elsif action='withdraw_award' then
 select * into w from msrc_research_event.awards q where q.id=(payload->>'awardId')::uuid and q.submission_id=s.id and q.submission_version=s.version;
 if not found then return jsonb_build_object('state','denied');end if;
 if not msrc_research_event.committee(edition_key,w.category_id) then return jsonb_build_object('state','denied');end if;
 if exists(select 1 from msrc_research_event.award_changes x where x.award_id=w.id) then return jsonb_build_object('state','conflict');end if;
 if exists(select 1 from msrc_research_event.confirmations f where f.award_id=w.id) then return jsonb_build_object('state','locked');end if;
 if jsonb_typeof(payload->'reason') is distinct from 'string' or length(btrim(payload->>'reason')) not between 1 and 6000 then return jsonb_build_object('state','invalid');end if;
 insert into msrc_research_event.award_changes(award_id,actor_id,reason) values(w.id,auth.uid(),payload->>'reason');result:=jsonb_build_object('state','withdrawn');
 elsif action in('confirm_award','publish_award') then
 select * into w from msrc_research_event.awards q where q.id=(payload->>'awardId')::uuid and q.submission_id=s.id and q.submission_version=s.version;
 if not found then return jsonb_build_object('state','denied');end if;
 if exists(select 1 from msrc_research_event.award_changes x where x.award_id=w.id) then return jsonb_build_object('state','conflict');end if;
 if not msrc_research_event.category_complete(edition_key,w.category_id,w.configuration) or w.judging_basis<>msrc_research_event.basis(edition_key,w.category_id) then return jsonb_build_object('state','reviews_incomplete');end if;
 if w.configuration->>'supervisorDeadline' is null or w.configuration->>'supervisorEvidence' is null then return jsonb_build_object('state','settings_incomplete');end if;
 if action='confirm_award' then
 if jsonb_typeof(payload->'validationReason') is distinct from 'string' or length(btrim(payload->>'validationReason')) not between 1 and 3000 then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_research_event.confirmations q where q.award_id=w.id) then return jsonb_build_object('state','locked');end if;
 select * into sup from msrc_research_event.supervisors q where q.award_id=w.id and q.actor_id=s.actor_id and q.confirmed order by q.created_at desc,q.id desc limit 1;
 if not found then return jsonb_build_object('state','supervisor_required');end if;
 -- Authorized confirmation also records administrator validation of the private participant-confirmed details.
 insert into msrc_research_event.confirmations values(w.id,sup.id,auth.uid(),payload->>'validationReason',clock_timestamp());result:=jsonb_build_object('state','confirmed');
 else
 if not exists(select 1 from msrc_research_event.confirmations q where q.award_id=w.id) then return jsonb_build_object('state','confirmation_required');end if;
 if exists(select 1 from msrc_research_event.award_publications q where q.award_id=w.id) then return jsonb_build_object('state','locked');end if;
 insert into msrc_research_event.award_publications values(w.id,auth.uid(),clock_timestamp());result:=jsonb_build_object('state','published');end if;
 else return jsonb_build_object('state','invalid');end if;
 end if;
 perform msrc_research_event.record(edition_key,'staff.'||action,target,jsonb_build_object('operationId',operation_id));
 insert into msrc_research_event.operations values(edition_key,auth.uid(),operation_id,input,result);return result;
exception when invalid_text_representation or numeric_value_out_of_range or check_violation or not_null_violation then return jsonb_build_object('state','invalid');
end$$;

create function msrc_research_event.forward(edition text,claims jsonb,action text,award uuid,details jsonb,operation uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_abstracts.guard();perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_research_event.participant(edition,action,award,details,operation);
 exception when others then perform set_config('request.jwt.claims',coalesce(saved,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(saved,''),true);return result;
end$$;
create function public.msrc_research_event_me(edition_key text,session_claims jsonb) returns jsonb language sql security definer set search_path='' as $$
 select msrc_research_event.forward(edition_key,session_claims,'me',null,null,null);
$$;
create function public.msrc_research_event_supervisor(edition_key text,session_claims jsonb,award_id uuid,details jsonb,operation_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select msrc_research_event.forward(edition_key,session_claims,'supervisor',award_id,details,operation_id);
$$;
revoke all on all functions in schema msrc_research_event from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_research_event_read(text,text),public.msrc_staff_research_event_write(text,text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_research_event_read(text,text),public.msrc_staff_research_event_write(text,text,jsonb,uuid) to authenticated;
revoke all on function public.msrc_research_event_me(text,jsonb),public.msrc_research_event_supervisor(text,jsonb,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_research_event_me(text,jsonb),public.msrc_research_event_supervisor(text,jsonb,uuid,jsonb,uuid) to service_role;
commit;
