-- ENG-077 / TRK-01, HAC-01..11, TMT-01..02, CFG-13.
-- Review-only migration. No settings, people, notifications or operational activation.
begin;
create schema msrc_competitions;
revoke all on schema msrc_competitions from public,anon,authenticated,service_role;

create table msrc_competitions.settings (
 edition_key text not null references msrc_authorization.edition_config(edition_key),
 kind text not null check(kind in('hackathon','three_minute_thesis')),version integer not null check(version>0),
 configuration jsonb not null,enabled boolean not null default false,evidence_ready boolean not null default false,
 files_ready boolean not null default false,primary key(edition_key,kind)
);
create table msrc_competitions.settings_versions (
 edition_key text not null,kind text not null,version integer not null,configuration jsonb not null,
 primary key(edition_key,kind,version),foreign key(edition_key,kind) references msrc_competitions.settings(edition_key,kind)
);
create table msrc_competitions.entries (
 id uuid primary key default gen_random_uuid(),edition_key text not null,kind text not null,
 lead_id uuid not null,version integer not null check(version>0),document jsonb not null,
 status text not null default 'draft' check(status in('draft','submitted','review','accepted','rejected')),
 eligibility text not null default 'pending' check(eligibility in('pending','eligible','ineligible')),
 submitted_at timestamptz,created_at timestamptz not null default clock_timestamp(),
 foreign key(edition_key,kind) references msrc_competitions.settings(edition_key,kind)
);
create index competitions_owner on msrc_competitions.entries(edition_key,lead_id,kind);
create table msrc_competitions.roster (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null references msrc_competitions.entries(id),
 actor_id uuid not null,email text not null,is_lead boolean not null default false,
 confirmed boolean not null default false,unique(entry_id,actor_id),unique(entry_id,email)
);
create index competitions_roster_actor on msrc_competitions.roster(actor_id,entry_id);
create table msrc_competitions.snapshots (
 entry_id uuid not null references msrc_competitions.entries(id),version integer not null,
 settings_version integer not null,document jsonb not null,roster jsonb not null,files jsonb not null,
 created_at timestamptz not null default clock_timestamp(),primary key(entry_id,version)
);
create table msrc_competitions.files (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null references msrc_competitions.entries(id),
 name text not null,stage text not null check(stage in('supporting','final')),object_path text not null unique,
 mime text not null,byte_size bigint not null check(byte_size between 1 and 26214400),
 state text not null default 'quarantine' check(state in('quarantine','clean','rejected')),
 created_at timestamptz not null default clock_timestamp()
);
create table msrc_competitions.packets (
 entry_id uuid not null,entry_version integer not null,packet jsonb not null,prepared_by uuid not null,
 primary key(entry_id,entry_version),foreign key(entry_id,entry_version) references msrc_competitions.snapshots(entry_id,version)
);
create table msrc_competitions.reviewer_profiles (
 edition_key text not null,actor_id uuid not null,affiliations text[] not null,
 primary key(edition_key,actor_id)
);
create table msrc_competitions.assignments (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null,entry_version integer not null,
 reviewer_id uuid not null,settings_version integer not null,version integer not null default 1,
 status text not null default 'assigned' check(status in('assigned','completed','conflict','declined')),
 scorecard jsonb,unique(entry_id,entry_version,reviewer_id),
 foreign key(entry_id,entry_version) references msrc_competitions.packets(entry_id,entry_version)
);
create index competitions_assignment_reviewer on msrc_competitions.assignments(reviewer_id,entry_id);
create table msrc_competitions.review_versions (
 assignment_id uuid not null references msrc_competitions.assignments(id),version integer not null,
 scorecard jsonb not null,status text not null,primary key(assignment_id,version)
);
create table msrc_competitions.decisions (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null,entry_version integer not null,
 outcome text not null check(outcome in('accepted','rejected')),reason text not null,rank integer check(rank>0),tie_resolution text,settings_version integer not null,
 review_basis jsonb not null,actor_id uuid not null,created_at timestamptz not null default clock_timestamp(),
 foreign key(entry_id,entry_version) references msrc_competitions.snapshots(entry_id,version)
);
create table msrc_competitions.publications (
 decision_id uuid primary key references msrc_competitions.decisions(id),actor_id uuid not null,
 published_at timestamptz not null default clock_timestamp()
);
create table msrc_competitions.judging_materials (
 entry_id uuid not null,entry_version integer not null,files jsonb not null,actor_id uuid not null,
 primary key(entry_id,entry_version),foreign key(entry_id,entry_version) references msrc_competitions.snapshots(entry_id,version)
);
create table msrc_competitions.judge_assignments (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null,entry_version integer not null,
 judge_id uuid not null,settings_version integer not null,version integer not null default 1,
 status text not null default 'assigned' check(status in('assigned','completed','conflict')),
 scorecard jsonb,unique(entry_id,entry_version,judge_id),
 foreign key(entry_id,entry_version) references msrc_competitions.snapshots(entry_id,version)
);
create index competitions_judge_actor on msrc_competitions.judge_assignments(judge_id,entry_id);
create table msrc_competitions.judge_versions (
 assignment_id uuid not null references msrc_competitions.judge_assignments(id),version integer not null,
 scorecard jsonb not null,status text not null,primary key(assignment_id,version)
);
create table msrc_competitions.activity_evidence (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null references msrc_competitions.entries(id),
 participant_id uuid not null,activity text not null,evidence text not null,actor_id uuid not null,
 created_at timestamptz not null default clock_timestamp(),unique(entry_id,participant_id,activity)
);
create table msrc_competitions.outcomes (
 entry_id uuid primary key references msrc_competitions.entries(id),outcome text not null,reason text not null,
 judging_basis jsonb not null,actor_id uuid not null,created_at timestamptz not null default clock_timestamp()
);
create table msrc_competitions.operations (
 edition_key text not null,actor_id uuid not null,operation_id uuid not null,input_hash bytea not null,result jsonb not null,
 primary key(edition_key,actor_id,operation_id)
);
create table msrc_competitions.mutation_limits (
 actor_id uuid primary key,window_started_at timestamptz not null,used integer not null check(used between 1 and 61)
);
comment on table msrc_competitions.mutation_limits is 'Technical actor admission budget: 60 new participant competition mutations per minute. Reads and operation retries do not consume the authentication form/email quota.';
create table msrc_competitions.audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,actor_id uuid,session_id uuid,
 event text not null,target_id uuid,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default clock_timestamp()
);
create index competitions_audit_edition on msrc_competitions.audit(edition_key,created_at,id);
do $$declare t text;begin
 foreach t in array array['settings','settings_versions','entries','roster','snapshots','files','packets','reviewer_profiles','assignments','review_versions','decisions','publications','judging_materials','judge_assignments','judge_versions','activity_evidence','outcomes','operations','mutation_limits','audit'] loop
 execute format('alter table msrc_competitions.%I enable row level security',t);
 execute format('alter table msrc_competitions.%I force row level security',t);
 if t in('settings_versions','snapshots','packets','review_versions','decisions','publications','judging_materials','judge_versions','activity_evidence','outcomes','operations','audit') then
 execute format('create trigger competitions_append_only before insert or update or delete on msrc_competitions.%I for each row execute function msrc_staff.audit_immutable()',t);
 execute format('create trigger competitions_no_truncate before truncate on msrc_competitions.%I for each statement execute function msrc_staff.audit_immutable()',t);
 end if;end loop;end$$;
revoke all on all tables in schema msrc_competitions from public,anon,authenticated,service_role;
comment on column msrc_competitions.settings.enabled is 'Release gate. No participant or staff RPC activates this workflow.';
comment on column msrc_competitions.settings.evidence_ready is 'Release gate for approved eligibility, privacy, storage and operating evidence; no UI setter.';
comment on column msrc_competitions.settings.files_ready is 'Release gate for private file storage, scanning and review; no UI setter.';

create function msrc_competitions.guard() returns void language plpgsql security invoker set search_path='' as $$begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Competitions require READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
end$$;
create function msrc_competitions.record(edition text,event_name text,target uuid,details jsonb default '{}'::jsonb) returns void language sql security definer set search_path='' as $$
 insert into msrc_competitions.audit(edition_key,actor_id,session_id,event,target_id,details)
 values(edition,auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,event_name,target,details);$$;
-- TRK-01 reuses the audited Unicode word tokenizer, not abstract scientific rules.
create function msrc_competitions.word_count(pitch text) returns integer language sql immutable security invoker set search_path='' as $$
 select msrc_abstracts.word_count(jsonb_build_object('background',coalesce(pitch,'')));$$;
create function msrc_competitions.settings_defaults() returns jsonb language sql immutable security invoker set search_path='' as $$
 select '{"opensAt":null,"closesAt":null,"reviewDeadline":null,"eligibilityPolicy":null,"eligibilityEvidence":null,"participationLimits":null,"initialFilePolicy":null,"declarationPolicy":null,"pitchPromptStructure":null,"referencesAppendixPolicy":null,"duplicateParticipationPolicy":null,"membershipAfterSubmission":null,"memberConfirmationPolicy":null,"soloConsumesFinalistQuota":null,"finalistCapPerTrack":null,"selectionCriteria":null,"selectionScoreMin":null,"selectionScoreMax":null,"minimumReviews":null,"rankingTiePolicy":null,"finalRubric":null,"judgeCount":null,"finalTieRules":null,"crossPanelPolicy":null,"presentationRules":null,"finalMaterialPolicy":null,"activityEvidencePolicy":null,"requiredActivities":null,"certificateAwardPolicy":null,"feesIPPublicityPolicy":null,"preparationDeadlines":null,"originalityReviewPolicy":null,"soloTeamAwardPolicy":null}'::jsonb;$$;
create function msrc_competitions.settings_valid(c jsonb) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;v jsonb;instant timestamptz;begin
 if jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>131072 or c<>msrc_competitions.settings_defaults()||c
 or exists(select 1 from jsonb_object_keys(c) x where not(msrc_competitions.settings_defaults()?x)) then return false;end if;
 for k,v in select * from jsonb_each(c) loop
 if v='null'::jsonb then continue;end if;
 if k in('opensAt','closesAt','reviewDeadline') then
 if jsonb_typeof(v)<>'string' then return false;end if;
 begin instant:=(v#>>'{}')::timestamptz;exception when others then return false;end;
 if not isfinite(instant) then return false;end if;
 elsif k='soloConsumesFinalistQuota' then if jsonb_typeof(v)<>'boolean' then return false;end if;
 elsif k in('finalistCapPerTrack','minimumReviews','judgeCount') then
 if jsonb_typeof(v)<>'number' or (v#>>'{}') !~ '^[1-9][0-9]{0,3}$' then return false;end if;
 elsif k in('selectionScoreMin','selectionScoreMax') then if jsonb_typeof(v)<>'number' then return false;end if;
 elsif k in('selectionCriteria','finalRubric','requiredActivities') then
 if jsonb_typeof(v)<>'array' or jsonb_array_length(v)=0 then return false;end if;
 if k='requiredActivities' then
 if exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'string' or length(btrim(x#>>'{}'))=0) then return false;end if;
 if (select count(*)<>count(distinct x) from jsonb_array_elements_text(v) x) then return false;end if;
 else
 if exists(select 1 from jsonb_array_elements(v) x where jsonb_typeof(x)<>'object'
 or x<>jsonb_build_object('id',x->'id','label',x->'label','min',x->'min','max',x->'max')
 or jsonb_typeof(x->'id') is distinct from 'string' or coalesce(x->>'id','')!~'^[A-Za-z0-9_-]{1,60}$'
 or jsonb_typeof(x->'label') is distinct from 'string' or length(btrim(x->>'label'))=0
 or jsonb_typeof(x->'min') is distinct from 'number' or jsonb_typeof(x->'max') is distinct from 'number') then return false;end if;
 if exists(select 1 from jsonb_array_elements(v) x where (x->>'min')::numeric >= (x->>'max')::numeric)
 or (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(v) x) then return false;end if;
 end if;
 else if jsonb_typeof(v)<>'string' or length(btrim(v#>>'{}'))=0 then return false;end if;end if;end loop;
 if c->>'opensAt' is not null and c->>'closesAt' is not null and (c->>'opensAt')::timestamptz >= (c->>'closesAt')::timestamptz then return false;end if;
 if c->>'selectionScoreMin' is not null and c->>'selectionScoreMax' is not null and (c->>'selectionScoreMin')::numeric >= (c->>'selectionScoreMax')::numeric then return false;end if;
 return true;
end$$;
create function msrc_competitions.stage_ready(c jsonb,kind text,stage text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;needed text[];begin
 if not msrc_competitions.settings_valid(c) or kind is null or stage is null or kind not in('hackathon','three_minute_thesis') then return false;end if;
 if stage='entry' then
 needed:=array['opensAt','closesAt','eligibilityPolicy','eligibilityEvidence','participationLimits','initialFilePolicy','declarationPolicy'];
 if kind='hackathon' then needed:=needed||array['pitchPromptStructure','referencesAppendixPolicy','duplicateParticipationPolicy','originalityReviewPolicy'];end if;
 elsif stage='selection' then
 if not msrc_competitions.stage_ready(c,kind,'entry') then return false;end if;
 needed:=array['reviewDeadline','selectionCriteria','selectionScoreMin','selectionScoreMax','minimumReviews','rankingTiePolicy'];
 if kind='hackathon' then needed:=needed||array['soloConsumesFinalistQuota','finalistCapPerTrack'];
 if c->>'minimumReviews' is not null and (c->>'minimumReviews')::integer>2 then return false;end if;end if;
 elsif stage='judging' then needed:=array['finalRubric','judgeCount','finalTieRules','crossPanelPolicy','presentationRules','activityEvidencePolicy','requiredActivities','certificateAwardPolicy','feesIPPublicityPolicy'];
 if kind='hackathon' then needed:=needed||array['preparationDeadlines','soloTeamAwardPolicy'];end if;
 elsif stage='final_material' then needed:=array['presentationRules','finalMaterialPolicy'];
 elsif stage='membership' then needed:=array['membershipAfterSubmission','memberConfirmationPolicy'];
 else return false;end if;
 foreach k in array needed loop if c->k is null or c->k='null'::jsonb then return false;end if;end loop;
 if stage='selection' and exists(select 1 from jsonb_array_elements(c->'selectionCriteria') criterion where (criterion->>'min')::numeric<(c->>'selectionScoreMin')::numeric or (criterion->>'max')::numeric>(c->>'selectionScoreMax')::numeric) then return false;end if;
 return true;
end$$;
create function msrc_competitions.stage_states(c jsonb,kind text,enabled boolean) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_object_agg(stage,case when not msrc_competitions.stage_ready(c,kind,stage) then 'not_ready'
 when not enabled then 'closed' when stage='entry' and not(clock_timestamp()>=(c->>'opensAt')::timestamptz and clock_timestamp()<(c->>'closesAt')::timestamptz) then 'closed'
 when stage='selection' and clock_timestamp()>=(c->>'reviewDeadline')::timestamptz then 'closed' else 'open' end)
 from unnest(array['entry','selection','judging','final_material','membership']) stage;$$;
create function msrc_competitions.participant_settings(edition text,competition text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('stageStates',msrc_competitions.stage_states(c,competition,coalesce(s.enabled,false) and coalesce(s.evidence_ready,false)),
 'pitchPrompt',c->'pitchPromptStructure','finalistCapPerTrack',c->'finalistCapPerTrack','filesReady',coalesce(s.files_ready,false))
 from (select coalesce((select configuration from msrc_competitions.settings where edition_key=edition and kind=competition),msrc_competitions.settings_defaults()) c) x
 left join msrc_competitions.settings s on s.edition_key=edition and s.kind=competition;$$;
create function msrc_competitions.document_valid(d jsonb,kind text,finalizing boolean) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;decl jsonb;begin
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>262144 then return false;end if;
 decl:=d->'declarations';if jsonb_typeof(decl) is distinct from 'object' then return false;end if;
 if kind='hackathon' then
 if d<>jsonb_build_object('title',d->'title','pitch',d->'pitch','participationMode',d->'participationMode','track',d->'track','declarations',decl)
 or jsonb_typeof(d->'participationMode') is distinct from 'string' or jsonb_typeof(d->'track') is distinct from 'string' or d->>'participationMode' not in('solo','team') or d->>'track' not in('translating_research','advancing_research')
 or jsonb_typeof(d->'pitch') is distinct from 'string' or msrc_competitions.word_count(d->>'pitch')>300 then return false;end if;
 if decl<>jsonb_build_object('newIdea',decl->'newIdea','notPreviouslyEntered',decl->'notPreviouslyEntered','notPrizeWinning',decl->'notPrizeWinning','notFunded',decl->'notFunded','notCommerciallyLaunched',decl->'notCommerciallyLaunched','authorityConfirmed',decl->'authorityConfirmed') then return false;end if;
 if finalizing and msrc_competitions.word_count(d->>'pitch')=0 then return false;end if;
 elsif kind='three_minute_thesis' then
 if d<>jsonb_build_object('title',d->'title','narrative',d->'narrative','presenter',d->'presenter','affiliation',d->'affiliation','declarations',decl)
 or decl<>jsonb_build_object('postgraduate',decl->'postgraduate','authorityConfirmed',decl->'authorityConfirmed') then return false;end if;
 foreach k in array array['narrative','presenter','affiliation'] loop
 if jsonb_typeof(d->k) is distinct from 'string' or finalizing and length(btrim(d->>k))=0 then return false;end if;end loop;
 else return false;end if;
 if jsonb_typeof(d->'title') is distinct from 'string' or length(d->>'title')>2000 or finalizing and length(btrim(d->>'title'))=0 then return false;end if;
 if exists(select 1 from jsonb_each(decl) x where jsonb_typeof(x.value)<>'boolean' or finalizing and x.value<>'true'::jsonb) then return false;end if;
 return true;
end$$;
alter table msrc_competitions.entries add constraint competitions_document_valid check(msrc_competitions.document_valid(document,kind,false));
create function msrc_competitions.roster_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare e msrc_competitions.entries%rowtype;begin
 select * into e from msrc_competitions.entries where id=new.entry_id for update;
 if not found then raise exception using errcode='23503',message='Entry missing';end if;
 if not exists(select 1 from auth.users u join msrc_participant.profiles p on p.actor_id=u.id join msrc_authorization.account_access a on a.actor_id=u.id
 where u.id=new.actor_id and lower(u.email)=lower(new.email) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and p.state='verified' and a.state='active') then
 raise exception using errcode='23514',message='Roster requires verified accounts';end if;
 if new.is_lead<>(new.actor_id=e.lead_id) then raise exception using errcode='23514',message='Submitting lead mismatch';end if;
 if (select count(*) from msrc_competitions.roster r where r.entry_id=e.id and r.id<>new.id)>=(case when e.kind='three_minute_thesis' or e.document->>'participationMode'='solo' then 1 else 5 end) then
 raise exception using errcode='23514',message='Roster size exceeded';end if;
 return new;
end$$;
create trigger competitions_roster_guard before insert or update on msrc_competitions.roster for each row execute function msrc_competitions.roster_guard();
create function msrc_competitions.projection(e msrc_competitions.entries) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',e.id,'kind',e.kind,'status',e.status,'version',e.version,'document',e.document,
 'roster',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'email',r.email,'isLead',r.is_lead,'confirmed',r.confirmed) order by r.is_lead desc,r.id),'[]'::jsonb) from msrc_competitions.roster r where r.entry_id=e.id),
 'files',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'stage',f.stage) order by f.created_at,f.id),'[]'::jsonb) from msrc_competitions.files f where f.entry_id=e.id),
 'outcome',(select o.outcome from msrc_competitions.outcomes o where o.entry_id=e.id));$$;

create function public.msrc_competitions_status(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_competitions.guard();perform msrc_registration.server_only();
 return jsonb_build_object('enabled',exists(select 1 from msrc_competitions.settings s where s.edition_key=msrc_competitions_status.edition_key and s.enabled));
end$$;
create function msrc_competitions.participant(edition text,competition text,action text,entry_id uuid,expected_version integer,d jsonb,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_competitions.settings%rowtype;e msrc_competitions.entries%rowtype;old msrc_competitions.operations%rowtype;budget msrc_competitions.mutation_limits%rowtype;
 result jsonb;input bytea;member uuid;email text;file uuid;stage text;begin
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 if not msrc_participant.ready() then return jsonb_build_object('state','closed');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 if action='me' then
 return jsonb_build_object('state','ready','settings',jsonb_build_object('hackathon',msrc_competitions.participant_settings(edition,'hackathon'),'three_minute_thesis',msrc_competitions.participant_settings(edition,'three_minute_thesis')),
 'entries',(select coalesce(jsonb_agg(msrc_competitions.projection(q) order by q.created_at desc,q.id),'[]'::jsonb) from msrc_competitions.entries q where q.edition_key=edition and (q.lead_id=auth.uid() or q.status='accepted' and exists(select 1 from msrc_competitions.roster r where r.entry_id=q.id and r.actor_id=auth.uid()))));end if;
 if competition is null or competition not in('hackathon','three_minute_thesis') or action is null or operation_id is null or expected_version is null or expected_version<0 then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('competition-operation:'||edition||':'||auth.uid()::text||':'||operation_id::text,0));
 input:=sha256(convert_to(jsonb_build_array(competition,action,entry_id,expected_version,d)::text,'UTF8'));
 select * into old from msrc_competitions.operations o where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=operation_id;
 if found then if old.input_hash<>input then return jsonb_build_object('state','conflict');end if;
 if action not in('file_reserve','file_read') then return old.result;end if;end if;
 if old.operation_id is null and action<>'file_read' then
 insert into msrc_competitions.mutation_limits values(auth.uid(),clock_timestamp(),1)
 on conflict on constraint mutation_limits_pkey do update set
 window_started_at=case when msrc_competitions.mutation_limits.window_started_at<=clock_timestamp()-interval '1 minute' then clock_timestamp() else msrc_competitions.mutation_limits.window_started_at end,
 used=case when msrc_competitions.mutation_limits.window_started_at<=clock_timestamp()-interval '1 minute' then 1 else least(61,msrc_competitions.mutation_limits.used+1) end returning * into budget;
 if budget.used>60 then
 if not exists(select 1 from msrc_competitions.audit aa where aa.actor_id=auth.uid() and aa.event='mutation.limited' and aa.created_at>=budget.window_started_at) then perform msrc_competitions.record(edition,'mutation.limited',null);end if;
 return jsonb_build_object('state','limited');end if;end if;
 select * into cfg from msrc_competitions.settings q where q.edition_key=edition and q.kind=competition for update;
 if not found or not cfg.enabled or not cfg.evidence_ready then return jsonb_build_object('state','closed');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 if entry_id is not null then
 select * into e from msrc_competitions.entries q where q.id=entry_id and q.edition_key=edition and q.kind=competition for update;
 if not found or (e.lead_id<>auth.uid() and not(action='member_confirm' and exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and r.actor_id=auth.uid()))) then return jsonb_build_object('state','denied');end if;
 if e.version<>expected_version then return jsonb_build_object('state','conflict');end if;
 elsif action<>'save' or expected_version<>0 then return jsonb_build_object('state','invalid');end if;
 if action in('save','submit','member_invite','member_remove') then
 if e.id is not null and e.status<>'draft' then return jsonb_build_object('state','locked');end if;
 if msrc_competitions.stage_states(cfg.configuration,competition,true)->>'entry'<>'open' then return jsonb_build_object('state','closed');end if;
 end if;
 if action='save' then
 if not msrc_competitions.document_valid(d,competition,false) then return jsonb_build_object('state','invalid');end if;
 if e.id is not null and d->>'participationMode'='solo' and (select count(*) from msrc_competitions.roster r where r.entry_id=e.id)>1 then return jsonb_build_object('state','invalid');end if;
 if e.id is null then
 insert into msrc_competitions.entries(edition_key,kind,lead_id,version,document) values(edition,competition,auth.uid(),1,d) returning * into e;
 insert into msrc_competitions.roster(entry_id,actor_id,email,is_lead) select e.id,u.id,lower(u.email),true from auth.users u where u.id=auth.uid();
 else update msrc_competitions.entries q set document=d,version=q.version+1 where q.id=e.id returning * into e;end if;
 result:=jsonb_build_object('state','saved','entry',msrc_competitions.projection(e));
 elsif action='submit' then
 if not msrc_competitions.document_valid(e.document,competition,true) then return jsonb_build_object('state','invalid');end if;
 perform 1 from msrc_authorization.account_access a join msrc_competitions.roster r on r.actor_id=a.actor_id where r.entry_id=e.id order by a.actor_id for share of a;
 perform 1 from auth.users u join msrc_competitions.roster r on r.actor_id=u.id where r.entry_id=e.id order by u.id for share of u;
 if exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and not exists(select 1 from auth.users u join msrc_participant.profiles p on p.actor_id=u.id join msrc_authorization.account_access aa on aa.actor_id=u.id where u.id=r.actor_id and lower(u.email)=r.email and u.email_confirmed_at is not null and p.state='verified' and aa.state='active' and not coalesce(u.is_anonymous,false))) then return jsonb_build_object('state','denied');end if;
 if not exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and r.actor_id=e.lead_id and r.is_lead)
 or (e.kind='three_minute_thesis' or e.document->>'participationMode'='solo') and (select count(*) from msrc_competitions.roster r where r.entry_id=e.id)<>1 then return jsonb_build_object('state','invalid');end if;
 -- A team member may not join multiple submitted team projects. Solo/cross-mode policy remains a setting.
 if e.document->>'participationMode'='team' and exists(select 1 from msrc_competitions.roster r join msrc_competitions.roster r2 on r2.actor_id=r.actor_id join msrc_competitions.entries e2 on e2.id=r2.entry_id where r.entry_id=e.id and e2.edition_key=edition and e2.id<>e.id and e2.status<>'draft' and e2.document->>'participationMode'='team') then return jsonb_build_object('state','conflict');end if;
 if exists(select 1 from msrc_competitions.files f where f.entry_id=e.id and f.stage='supporting' and f.state<>'clean') then return jsonb_build_object('state','evidence_gate');end if;
 update msrc_competitions.entries q set status='submitted',submitted_at=clock_timestamp() where q.id=e.id returning * into e;
 result:=msrc_competitions.projection(e);
 insert into msrc_competitions.snapshots(entry_id,version,settings_version,document,roster,files) values(e.id,e.version,cfg.version,e.document,result->'roster',result->'files');
 result:=jsonb_build_object('state','submitted','entry',result);
 elsif action='member_invite' then
 if competition<>'hackathon' or e.document->>'participationMode'<>'team' or jsonb_typeof(d->'email') is distinct from 'string' then return jsonb_build_object('state','invalid');end if;
 email:=lower(btrim(d->>'email'));
 select u.id into member from auth.users u join msrc_participant.profiles p on p.actor_id=u.id join msrc_authorization.account_access a on a.actor_id=u.id where lower(u.email)=email and u.email_confirmed_at is not null and p.state='verified' and a.state='active' and not coalesce(u.is_anonymous,false);
 -- A single response prevents mailbox/account enumeration. No email or project disclosure.
 if member is null then return jsonb_build_object('state','invalid');end if;
 if not exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and r.actor_id=member) then
 if (select count(*) from msrc_competitions.roster r where r.entry_id=e.id)>=5 then return jsonb_build_object('state','full');end if;
 insert into msrc_competitions.roster(entry_id,actor_id,email) values(e.id,member,email);
 update msrc_competitions.entries q set version=q.version+1 where q.id=e.id returning * into e;end if;
 result:=jsonb_build_object('state','invited','entry',msrc_competitions.projection(e));
 elsif action='member_remove' then
 if e.document->>'participationMode'<>'team' then return jsonb_build_object('state','invalid');end if;
 delete from msrc_competitions.roster r where r.entry_id=e.id and r.id=(d->>'memberId')::uuid and not r.is_lead;
 update msrc_competitions.entries q set version=q.version+1 where q.id=e.id returning * into e;
 result:=jsonb_build_object('state','saved','entry',msrc_competitions.projection(e));
 elsif action='member_confirm' then
 if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,competition,'membership') then return jsonb_build_object('state','closed');end if;
 update msrc_competitions.roster r set confirmed=true where r.entry_id=e.id and r.actor_id=auth.uid();
 result:=jsonb_build_object('state','confirmed','entry',msrc_competitions.projection(e));
 elsif action='file_reserve' then
 stage:=d->>'stage';
 if not cfg.files_ready or stage is null or stage not in('supporting','final') or stage='supporting' and e.status<>'draft'
 or stage='final' and (e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,competition,'final_material') or exists(select 1 from msrc_competitions.judge_assignments ja where ja.entry_id=e.id) or exists(select 1 from msrc_competitions.outcomes o where o.entry_id=e.id)) then return jsonb_build_object('state','closed');end if;
 if jsonb_typeof(d->'name') is distinct from 'string' or jsonb_typeof(d->'mime') is distinct from 'string' or length(d->>'name') not between 1 and 255 or (d->>'name')~'[\\/\x00-\x1f]' or d->>'mime' not in('application/pdf','image/png','image/jpeg') or coalesce(d->>'size','') !~ '^[1-9][0-9]{0,7}$' or (d->>'size')::bigint>26214400 then return jsonb_build_object('state','invalid');end if;
 if old.operation_id is not null then
 if not exists(select 1 from msrc_competitions.files f where f.id=(old.result->>'fileId')::uuid and f.entry_id=e.id and f.state='quarantine') then return jsonb_build_object('state','locked');end if;
 return old.result;end if;
 file:=gen_random_uuid();
 insert into msrc_competitions.files(id,entry_id,name,stage,object_path,mime,byte_size) values(file,e.id,d->>'name',stage,edition||'/'||e.id::text||'/'||file::text,d->>'mime',(d->>'size')::bigint);
 result:=jsonb_build_object('state','reserved','fileId',file,'bucket','msrc-competition-files','path',edition||'/'||e.id::text||'/'||file::text);
 elsif action='file_read' then
 if not cfg.files_ready then return jsonb_build_object('state','closed');end if;
 select jsonb_build_object('state','available','bucket','msrc-competition-files','path',f.object_path) into result from msrc_competitions.files f where f.id=(d->>'fileId')::uuid and f.entry_id=e.id and f.state='clean';
 if result is null then return jsonb_build_object('state','unavailable');end if;
 else return jsonb_build_object('state','invalid');end if;
 perform msrc_competitions.record(edition,'participant.'||action,e.id,jsonb_build_object('version',e.version));
 if old.operation_id is null then insert into msrc_competitions.operations values(edition,auth.uid(),operation_id,input,result);end if;return result;
end$$;
create function msrc_competitions.forward(edition text,claims jsonb,competition text,action text,entry_id uuid,expected_version integer,d jsonb,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare saved text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_competitions.guard();perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_competitions.participant(edition,competition,action,entry_id,expected_version,d,operation_id);
 exception when others then perform set_config('request.jwt.claims',coalesce(saved,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(saved,''),true);return result;
end$$;
create function public.msrc_competitions_me(edition_key text,session_claims jsonb) returns jsonb language sql security definer set search_path='' as $$
 select msrc_competitions.forward(edition_key,session_claims,null,'me',null,null,null,null);$$;
create function public.msrc_competitions_save_draft(edition_key text,session_claims jsonb,competition_type text,entry_id uuid,expected_version integer,document jsonb,operation_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select msrc_competitions.forward(edition_key,session_claims,competition_type,'save',entry_id,expected_version,document,operation_id);$$;
create function public.msrc_competitions_submit(edition_key text,session_claims jsonb,competition_type text,entry_id uuid,expected_version integer,operation_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select msrc_competitions.forward(edition_key,session_claims,competition_type,'submit',entry_id,expected_version,null,operation_id);$$;
create function public.msrc_competitions_member_action(edition_key text,session_claims jsonb,competition_type text,entry_id uuid,expected_version integer,action text,email text,member_id uuid,operation_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select msrc_competitions.forward(edition_key,session_claims,competition_type,'member_'||action,entry_id,expected_version,jsonb_build_object('email',email,'memberId',member_id),operation_id);$$;
create function public.msrc_competitions_file_action(edition_key text,session_claims jsonb,competition_type text,entry_id uuid,expected_version integer,action text,file_id uuid,metadata jsonb,operation_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select msrc_competitions.forward(edition_key,session_claims,competition_type,'file_'||action,entry_id,expected_version,coalesce(metadata,'{}'::jsonb)||jsonb_build_object('fileId',file_id),operation_id);$$;

-- Files stay private and quarantined. No client Storage policies and no participant scan bypass.
do $storage$
begin
 if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
  raise notice 'Storage is not installed; competition bucket and policy skipped.';
  return;
 end if;
 execute $m$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('msrc-competition-files','msrc-competition-files',false,26214400,array['application/pdf','image/png','image/jpeg'])$m$;
 execute $m$create policy msrc_competitions_no_client_objects on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'msrc-competition-files') with check(bucket_id<>'msrc-competition-files')$m$;
end$storage$;
create function public.msrc_competitions_scan_result(file_id uuid,clean boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare entry uuid;edition text;object_path text;byte_size bigint;mime text;present boolean;begin
 perform msrc_competitions.guard();perform msrc_registration.server_only();
 -- Scanner integration is intentionally unavailable until the independent files release gate is evidenced.
 select f.object_path,f.byte_size,f.mime into object_path,byte_size,mime from msrc_competitions.files f join msrc_competitions.entries e on e.id=f.entry_id
 join msrc_competitions.settings s on s.edition_key=e.edition_key and s.kind=e.kind where f.id=file_id and s.files_ready and f.state='quarantine'
 and not exists(select 1 from msrc_competitions.judge_assignments ja where ja.entry_id=e.id);
 if not found or to_regclass('storage.objects') is null then return jsonb_build_object('state','closed');end if;
 -- Dynamic so installs without Storage still compile and lint; the object must match the reserved file exactly.
 execute 'select exists(select 1 from storage.objects o where o.bucket_id=''msrc-competition-files'' and o.name=$1 and (o.metadata->>''size'')::bigint=$2 and o.metadata->>''mimetype''=$3)'
 into present using object_path,byte_size,mime;
 if not present then return jsonb_build_object('state','closed');end if;
 update msrc_competitions.files f set state=case when clean then 'clean' else 'rejected' end where f.id=file_id;
 select e.id,e.edition_key into entry,edition from msrc_competitions.files f join msrc_competitions.entries e on e.id=f.entry_id where f.id=file_id;
 perform msrc_competitions.record(edition,'file.scan_result',entry,jsonb_build_object('fileId',file_id,'state',case when clean then 'clean' else 'rejected' end));
 return jsonb_build_object('state','updated');
end$$;

create function msrc_competitions.reviewer_role(kind text) returns text language sql immutable security invoker set search_path='' as $$
 select case kind when 'hackathon' then 'hackathonReviewer' when 'three_minute_thesis' then 'threeMinuteThesisReviewer' end;$$;
create function msrc_competitions.eligible_staff(edition text,actor uuid,roles text[]) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from msrc_authorization.role_grants g join msrc_authorization.account_access a on a.actor_id=g.actor_id
 join msrc_staff.profiles p on p.actor_id=g.actor_id where g.edition_key=edition and g.actor_id=actor and g.state='active' and g.scope_kind='edition'
 and g.role_name=any(roles) and a.state='active' and a.individually_identified and not msrc_staff.recovery_blocked(actor));$$;
create function msrc_competitions.has_conflict(entry uuid,actor uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from msrc_competitions.roster r where r.entry_id=entry and r.actor_id=actor)
 or exists(select 1 from msrc_competitions.assignments a where a.entry_id=entry and a.reviewer_id=actor and a.status='conflict')
 or exists(select 1 from msrc_competitions.entries e join msrc_competitions.reviewer_profiles r on r.edition_key=e.edition_key and r.actor_id=actor
 cross join lateral unnest(r.affiliations) f where e.id=entry and e.kind='three_minute_thesis'
 and msrc_abstracts.normalized_affiliation(f)=msrc_abstracts.normalized_affiliation(e.document->>'affiliation'));$$;
create function msrc_competitions.packet_valid(packet jsonb,e msrc_competitions.entries) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare identity text;normal text;begin
 if jsonb_typeof(packet) is distinct from 'object' or packet<>jsonb_build_object('title',packet->'title','pitch',packet->'pitch','narrative',packet->'narrative','track',packet->'track')
 or jsonb_typeof(packet->'title') is distinct from 'string' or jsonb_typeof(packet->'pitch') is distinct from 'string' or jsonb_typeof(packet->'narrative') is distinct from 'string'
 or length(btrim(packet->>'title'))=0 or octet_length(packet::text)>262144 then return false;end if;
 if e.kind='hackathon' and (packet->>'track' is distinct from e.document->>'track' or length(btrim(packet->>'pitch'))=0 or msrc_competitions.word_count(packet->>'pitch')>300 or packet->>'narrative'<>'') then return false;end if;
 if e.kind='three_minute_thesis' and (packet->'track'<>'null'::jsonb or length(btrim(packet->>'narrative'))=0 or packet->>'pitch'<>'') then return false;end if;
 normal:=msrc_abstracts.normalized_affiliation(packet::text);
 -- Human sanitation attestation is additionally required; known roster identities cannot occur anywhere in the packet.
 for identity in
 select r.email from msrc_competitions.roster r where r.entry_id=e.id
 union select p.name from msrc_competitions.roster r join msrc_participant.profiles p on p.actor_id=r.actor_id where r.entry_id=e.id
 union select e.document->>'presenter' where e.kind='three_minute_thesis'
 union select e.document->>'affiliation' where e.kind='three_minute_thesis' loop
 if length(msrc_abstracts.normalized_affiliation(identity))>0 and position(msrc_abstracts.normalized_affiliation(identity) in normal)>0 then return false;end if;end loop;
 return true;
end$$;
create function msrc_competitions.scorecard_valid(card jsonb,rubric jsonb,complete boolean) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare score jsonb;criterion jsonb;begin
 if jsonb_typeof(card) is distinct from 'object' or card<>jsonb_build_object('scores',card->'scores','comments',card->'comments')
 or jsonb_typeof(card->'scores') is distinct from 'array' or jsonb_typeof(card->'comments') is distinct from 'string' or octet_length(card::text)>65536 or jsonb_typeof(rubric)<>'array' then return false;end if;
 if (select count(*)<>count(distinct x->>'criterionId') from jsonb_array_elements(card->'scores') x) then return false;end if;
 if complete and jsonb_array_length(card->'scores')<>jsonb_array_length(rubric) then return false;end if;
 for score in select * from jsonb_array_elements(card->'scores') loop
 if jsonb_typeof(score)<>'object' or score<>jsonb_build_object('criterionId',score->'criterionId','value',score->'value') or jsonb_typeof(score->'value') is distinct from 'number' then return false;end if;
 select x into criterion from jsonb_array_elements(rubric) x where x->>'id'=score->>'criterionId';
 if criterion is null or (score->>'value')::numeric<(criterion->>'min')::numeric or (score->>'value')::numeric>(criterion->>'max')::numeric then return false;end if;end loop;
 return true;
end$$;
create function msrc_competitions.review_basis(entry uuid,entry_version integer) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('assignmentId',a.id,'version',a.version,'scorecard',a.scorecard,'settingsVersion',a.settings_version,'rubric',v.configuration->'selectionCriteria') order by a.id),'[]'::jsonb)
 from msrc_competitions.assignments a join msrc_competitions.entries e on e.id=a.entry_id join msrc_competitions.settings_versions v on v.edition_key=e.edition_key and v.kind=e.kind and v.version=a.settings_version where a.entry_id=entry and a.entry_version=review_basis.entry_version
 and a.status='completed' and msrc_competitions.eligible_staff(e.edition_key,a.reviewer_id,array[msrc_competitions.reviewer_role(e.kind)]) and not msrc_competitions.has_conflict(e.id,a.reviewer_id);$$;

create function public.msrc_staff_competitions_data(edition_key text,competition_type text,view text,entry_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_competitions.settings%rowtype;result jsonb;reviewer text;committee boolean;begin
 perform msrc_competitions.guard();
 if competition_type is null or competition_type not in('hackathon','three_minute_thesis') then return jsonb_build_object('state','invalid');end if;
 reviewer:=msrc_competitions.reviewer_role(competition_type);
 select * into cfg from msrc_competitions.settings s where s.edition_key=edition_key and s.kind=competition_type;
 if view='settings' then
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin','judgingCommittee'],false) is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready','version',coalesce(cfg.version,0),'settings',coalesce(cfg.configuration,msrc_competitions.settings_defaults()),'enabled',coalesce(cfg.enabled,false),'evidenceReady',coalesce(cfg.evidence_ready,false),'stageStates',msrc_competitions.stage_states(coalesce(cfg.configuration,msrc_competitions.settings_defaults()),competition_type,coalesce(cfg.enabled,false) and coalesce(cfg.evidence_ready,false)));
 elsif view in('list','export') then
 committee:=msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null;
 if committee and (view='export' or msrc_staff.authorize(edition_key,array['judgingCommittee'],false) is null) then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'status',e.status,'version',e.version,'title',e.document->>'title','track',e.document->>'track','document',e.document,'eligibility',e.eligibility,
 'assignedCount',case when committee then 0 else (select count(*) from msrc_competitions.assignments a where a.entry_id=e.id and a.entry_version=e.version and a.status in('assigned','completed') and not msrc_competitions.has_conflict(e.id,a.reviewer_id)) end,
 'completedCount',case when committee then 0 else jsonb_array_length(msrc_competitions.review_basis(e.id,e.version)) end,
 'roster',(select coalesce(jsonb_agg(jsonb_build_object('id',r.actor_id,'memberId',r.id,'email',r.email,'isLead',r.is_lead,'confirmed',r.confirmed) order by r.is_lead desc,r.id),'[]'::jsonb) from msrc_competitions.roster r where r.entry_id=e.id),
 'files',msrc_competitions.projection(e)->'files','outcome',(select o.outcome from msrc_competitions.outcomes o where o.entry_id=e.id),
 'rank',case when committee then null else (select d.rank from msrc_competitions.decisions d where d.entry_id=e.id order by d.created_at desc,d.id desc limit 1) end)
 ||case when committee then '{}'::jsonb else jsonb_build_object('decision',(select jsonb_build_object('id',d.id,'outcome',d.outcome,'rank',d.rank,'tieResolution',d.tie_resolution,'reason',d.reason,'published',exists(select 1 from msrc_competitions.publications p where p.decision_id=d.id)) from msrc_competitions.decisions d where d.entry_id=e.id order by d.created_at desc,d.id desc limit 1)) end
 ||case when committee then '{}'::jsonb else jsonb_build_object('reviewBasis',msrc_competitions.review_basis(e.id,e.version)) end order by e.created_at,e.id),'[]'::jsonb) into result from msrc_competitions.entries e where e.edition_key=edition_key and e.kind=competition_type and e.status<>'draft' and (not committee or e.status='accepted');
 if view='export' then perform msrc_competitions.record(edition_key,'staff.export',null,jsonb_build_object('kind',competition_type));end if;
 return jsonb_build_object('state','ready','entries',result);
 elsif view in('queue','packet') then
 if msrc_staff.authorize(edition_key,array[reviewer],false) is null then return jsonb_build_object('state','denied');end if;
 if cfg.edition_key is null or not cfg.enabled or not cfg.evidence_ready or msrc_competitions.stage_states(cfg.configuration,competition_type,true)->>'selection'<>'open' then return jsonb_build_object('state','closed');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'entryId',e.id,'version',a.version,'status',a.status,'title',p.packet->>'title','packet',p.packet,'rubric',v.configuration->'selectionCriteria','scorecard',a.scorecard) order by a.id),'[]'::jsonb) into result
 from msrc_competitions.assignments a join msrc_competitions.entries e on e.id=a.entry_id and e.version=a.entry_version
 join msrc_competitions.packets p on p.entry_id=a.entry_id and p.entry_version=a.entry_version
 join msrc_competitions.settings_versions v on v.edition_key=e.edition_key and v.kind=e.kind and v.version=a.settings_version
 where e.edition_key=edition_key and e.kind=competition_type and e.status='review' and a.reviewer_id=auth.uid() and a.status in('assigned','completed') and not msrc_competitions.has_conflict(e.id,auth.uid()) and (entry_id is null or e.id=entry_id or a.id=entry_id);
 return jsonb_build_object('state','ready','assignments',result);
 elsif view in('judge_queue','judge_packet') then
 if msrc_staff.authorize(edition_key,array['facultyJudge'],false) is null then return jsonb_build_object('state','denied');end if;
 if cfg.edition_key is null or not cfg.enabled or not cfg.evidence_ready or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'judging') then return jsonb_build_object('state','closed');end if;
 -- HAC-06/09: this projection never joins or returns pre-event assignments, cards, ranks or decisions.
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'entryId',e.id,'version',a.version,'status',a.status,'title',s.document->>'title',
 'packet',jsonb_build_object('title',s.document->>'title','pitch',coalesce(s.document->>'pitch',''),'narrative',coalesce(s.document->>'narrative',''),'track',s.document->'track'),
 'rubric',v.configuration->'finalRubric','scorecard',a.scorecard,'files',(select coalesce(jsonb_agg(jsonb_build_object('id',ff->'id','name',ff->'name')),'[]'::jsonb) from jsonb_array_elements(m.files) ff)) order by a.id),'[]'::jsonb) into result
 from msrc_competitions.judge_assignments a join msrc_competitions.entries e on e.id=a.entry_id and e.version=a.entry_version
 join msrc_competitions.snapshots s on s.entry_id=a.entry_id and s.version=a.entry_version
 join msrc_competitions.judging_materials m on m.entry_id=a.entry_id and m.entry_version=a.entry_version
 join msrc_competitions.settings_versions v on v.edition_key=e.edition_key and v.kind=e.kind and v.version=a.settings_version
 where e.edition_key=edition_key and e.kind=competition_type and e.status='accepted' and a.judge_id=auth.uid() and a.status in('assigned','completed') and not msrc_competitions.has_conflict(e.id,auth.uid()) and (entry_id is null or e.id=entry_id or a.id=entry_id);
 return jsonb_build_object('state','ready','assignments',result);
 end if;return jsonb_build_object('state','invalid');
end$$;

create function public.msrc_staff_competitions_mutate(edition_key text,competition_type text,action text,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_competitions.settings%rowtype;e msrc_competitions.entries%rowtype;a msrc_competitions.assignments%rowtype;j msrc_competitions.judge_assignments%rowtype;decision msrc_competitions.decisions%rowtype;
 old msrc_competitions.operations%rowtype;input bytea;result jsonb;required text[];reviewer text;entry uuid;actor uuid;rubric jsonb;basis jsonb;outcome text;judge uuid;cap integer;used integer;begin
 perform msrc_competitions.guard();
 if competition_type is null or competition_type not in('hackathon','three_minute_thesis') or action is null or operation_id is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>262144 then return jsonb_build_object('state','invalid');end if;
 if action not in('affiliations','file_read') and (jsonb_typeof(payload->'expectedVersion') is distinct from 'number' or coalesce(payload->>'expectedVersion','')!~'^[0-9]{1,9}$') then return jsonb_build_object('state','invalid');end if;
 reviewer:=msrc_competitions.reviewer_role(competition_type);
 required:=case when action='settings' then array['superAdmin'] when action in('review','conflict','affiliations') then array[reviewer]
 when action in('judge','judge_conflict') then array['facultyJudge'] when action='file_read' then array['scientificAdministrator','superAdmin','judgingCommittee','facultyJudge'] when action in('panel','activity','outcome') then array['scientificAdministrator','superAdmin','judgingCommittee'] else array['scientificAdministrator','superAdmin'] end;
 if msrc_staff.authorize(edition_key,required) is null then return jsonb_build_object('state','denied');end if;
 perform pg_advisory_xact_lock(hashtextextended('competition-operation:'||edition_key||':'||auth.uid()::text||':'||operation_id::text,0));
 input:=sha256(convert_to(jsonb_build_array(competition_type,action,payload)::text,'UTF8'));
 select * into old from msrc_competitions.operations o where o.edition_key=edition_key and o.actor_id=auth.uid() and o.operation_id=operation_id;
 if found then if old.input_hash<>input then return jsonb_build_object('state','conflict');end if;if action<>'file_read' then return old.result;end if;end if;
 perform pg_advisory_xact_lock(hashtextextended('competition-settings:'||edition_key||':'||competition_type,0));
 select * into cfg from msrc_competitions.settings s where s.edition_key=edition_key and s.kind=competition_type for update;
 if msrc_staff.authorize(edition_key,required) is null then return jsonb_build_object('state','denied');end if;
 if action='settings' then
 if not msrc_competitions.settings_valid(payload->'settings') or coalesce(cfg.version,0)<>(payload->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 if cfg.edition_key is null then insert into msrc_competitions.settings(edition_key,kind,version,configuration) values(edition_key,competition_type,1,payload->'settings') returning * into cfg;
 else update msrc_competitions.settings s set configuration=payload->'settings',version=s.version+1 where s.edition_key=edition_key and s.kind=competition_type returning * into cfg;end if;
 insert into msrc_competitions.settings_versions values(edition_key,competition_type,cfg.version,cfg.configuration);
 result:=jsonb_build_object('state','updated');
 elsif action='affiliations' then
 if jsonb_typeof(payload->'affiliations') is distinct from 'array' or jsonb_array_length(payload->'affiliations')=0 or exists(select 1 from jsonb_array_elements(payload->'affiliations') x where jsonb_typeof(x)<>'string' or length(btrim(x#>>'{}'))=0) then return jsonb_build_object('state','invalid');end if;
 insert into msrc_competitions.reviewer_profiles values(edition_key,auth.uid(),array(select jsonb_array_elements_text(payload->'affiliations')))
 on conflict on constraint reviewer_profiles_pkey do update set affiliations=excluded.affiliations;
 update msrc_competitions.assignments q set status='conflict',version=q.version+1 where q.reviewer_id=auth.uid() and exists(select 1 from msrc_competitions.entries x where x.id=q.entry_id and x.edition_key=edition_key and msrc_competitions.has_conflict(x.id,auth.uid()));
 result:=jsonb_build_object('state','updated');
 else
 if cfg.edition_key is null or not cfg.enabled or not cfg.evidence_ready then return jsonb_build_object('state','closed');end if;
 if action in('review','conflict') then
 select * into a from msrc_competitions.assignments q where q.id=(payload->>'assignmentId')::uuid and q.reviewer_id=auth.uid() for update;
 if not found then return jsonb_build_object('state','denied');end if;entry:=a.entry_id;
 elsif action in('judge','judge_conflict') then
 select * into j from msrc_competitions.judge_assignments q where q.id=(payload->>'assignmentId')::uuid and q.judge_id=auth.uid() for update;
 if not found then return jsonb_build_object('state','denied');end if;entry:=j.entry_id;
 else entry:=(payload->>'entryId')::uuid;end if;
 select * into e from msrc_competitions.entries q where q.id=entry and q.edition_key=edition_key and q.kind=competition_type for update;
 if not found then return jsonb_build_object('state','denied');end if;
 if action not in('review','conflict','judge','judge_conflict','file_read') and e.version<>(payload->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 if action='file_read' then
 if not cfg.files_ready then return jsonb_build_object('state','closed');end if;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then
 if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'final_material') then return jsonb_build_object('state','denied');end if;
 if msrc_staff.authorize(edition_key,array['judgingCommittee'],false) is null and not exists(select 1 from msrc_competitions.judge_assignments ja join msrc_competitions.judging_materials jm on jm.entry_id=ja.entry_id and jm.entry_version=ja.entry_version where ja.entry_id=e.id and ja.entry_version=e.version and ja.judge_id=auth.uid() and ja.status in('assigned','completed') and not msrc_competitions.has_conflict(e.id,auth.uid()) and exists(select 1 from jsonb_array_elements(jm.files) ff where ff->>'id'=payload->>'fileId')) then return jsonb_build_object('state','denied');end if;
 end if;
 select jsonb_build_object('state','ready','bucket','msrc-competition-files','path',f.object_path,'fileId',f.id) into result from msrc_competitions.files f where f.entry_id=e.id and f.id=(payload->>'fileId')::uuid and f.state='clean'
 and (msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is not null or f.stage='final');
 if result is null then return jsonb_build_object('state','unavailable');end if;
 elsif action='eligibility' then
 if e.status<>'submitted' or payload->>'eligibility' not in('eligible','ineligible') or length(btrim(coalesce(payload->>'reason','')))=0 then return jsonb_build_object('state','invalid');end if;
 update msrc_competitions.entries q set eligibility=payload->>'eligibility' where q.id=e.id;result:=jsonb_build_object('state','updated');
 elsif action='prepare_packet' then
 if e.status<>'submitted' or e.eligibility<>'eligible' or payload->>'attestation'<>'true' or not msrc_competitions.packet_valid(payload->'packet',e) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_competitions.packets p where p.entry_id=e.id and p.entry_version=e.version) then return jsonb_build_object('state','locked');end if;
 insert into msrc_competitions.packets values(e.id,e.version,payload->'packet',auth.uid());result:=jsonb_build_object('state','prepared');
 elsif action='assign' then
 if not msrc_competitions.stage_ready(cfg.configuration,competition_type,'selection') or clock_timestamp()>=(cfg.configuration->>'reviewDeadline')::timestamptz then return jsonb_build_object('state','closed');end if;
 actor:=(payload->>'reviewerId')::uuid;
 if e.status not in('submitted','review') or e.eligibility<>'eligible' or not exists(select 1 from msrc_competitions.packets p where p.entry_id=e.id and p.entry_version=e.version) then return jsonb_build_object('state','packet_required');end if;
 if not msrc_competitions.eligible_staff(edition_key,actor,array[reviewer]) or not exists(select 1 from msrc_competitions.reviewer_profiles p where p.edition_key=edition_key and p.actor_id=actor) then return jsonb_build_object('state','denied');end if;
 if msrc_competitions.has_conflict(e.id,actor) then return jsonb_build_object('state','coi');end if;
 if exists(select 1 from msrc_competitions.assignments q where q.entry_id=e.id and q.entry_version=e.version and q.reviewer_id=actor) then return jsonb_build_object('state','duplicate');end if;
 if (select count(*) from msrc_competitions.assignments q where q.entry_id=e.id and q.entry_version=e.version and q.status in('assigned','completed') and not msrc_competitions.has_conflict(e.id,q.reviewer_id))>=(case when competition_type='hackathon' then 2 else (cfg.configuration->>'minimumReviews')::integer end) then return jsonb_build_object('state','full');end if;
 insert into msrc_competitions.assignments(entry_id,entry_version,reviewer_id,settings_version) values(e.id,e.version,actor,cfg.version);
 update msrc_competitions.entries q set status='review' where q.id=e.id;result:=jsonb_build_object('state','assigned');
 elsif action in('review','conflict') then
 if e.status<>'review' or a.entry_version<>e.version or a.status in('conflict','declined') or msrc_competitions.has_conflict(e.id,auth.uid()) then return jsonb_build_object('state','denied');end if;
 if action='review' and a.status='completed' then return jsonb_build_object('state','locked');end if;
 if not msrc_competitions.stage_ready(cfg.configuration,competition_type,'selection') then return jsonb_build_object('state','closed');end if;
 if a.version<>(payload->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 select v.configuration into rubric from msrc_competitions.settings_versions v where v.edition_key=edition_key and v.kind=competition_type and v.version=a.settings_version;
 if not msrc_competitions.stage_ready(rubric,competition_type,'selection') or clock_timestamp()>=(rubric->>'reviewDeadline')::timestamptz then return jsonb_build_object('state','closed');end if;
 if action='conflict' then
 if length(btrim(coalesce(payload->>'reason','')))=0 then return jsonb_build_object('state','invalid');end if;
 update msrc_competitions.assignments q set status='conflict',version=q.version+1 where q.id=a.id;
 else
 if not msrc_competitions.scorecard_valid(payload->'scorecard',rubric->'selectionCriteria',coalesce((payload->>'submit')::boolean,false)) then return jsonb_build_object('state','invalid');end if;
 update msrc_competitions.assignments q set scorecard=payload->'scorecard',version=q.version+1,status=case when payload->>'submit'='true' then 'completed' else 'assigned' end where q.id=a.id returning * into a;
 insert into msrc_competitions.review_versions values(a.id,a.version,a.scorecard,a.status);end if;
 result:=jsonb_build_object('state','updated');
 elsif action='select' then
 if e.status<>'review' or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'selection') then return jsonb_build_object('state','closed');end if;
 if coalesce(payload->>'outcome','') not in('accept','reject') or length(btrim(coalesce(payload->>'reason','')))=0 then return jsonb_build_object('state','invalid');end if;
 if payload->>'outcome'='accept' and (jsonb_typeof(payload->'rank') is distinct from 'number' or coalesce(payload->>'rank','')!~'^[1-9][0-9]{0,8}$' or length(btrim(coalesce(payload->>'tieResolution','')))=0) then return jsonb_build_object('state','invalid');end if;
 basis:=msrc_competitions.review_basis(e.id,e.version);
 if jsonb_array_length(basis)<(cfg.configuration->>'minimumReviews')::integer or competition_type='hackathon' and (select count(*) from msrc_competitions.assignments q where q.entry_id=e.id and q.entry_version=e.version and q.status in('assigned','completed') and msrc_competitions.eligible_staff(edition_key,q.reviewer_id,array[reviewer]) and not msrc_competitions.has_conflict(e.id,q.reviewer_id))<>2 then return jsonb_build_object('state','reviews_incomplete');end if;
 outcome:=case payload->>'outcome' when 'accept' then 'accepted' else 'rejected' end;
 insert into msrc_competitions.decisions(entry_id,entry_version,outcome,reason,rank,tie_resolution,settings_version,review_basis,actor_id) values(e.id,e.version,outcome,payload->>'reason',nullif(payload->>'rank','')::integer,payload->>'tieResolution',cfg.version,basis,auth.uid()) returning * into decision;
 result:=jsonb_build_object('state','prepared','decisionId',decision.id);
 elsif action='publish_selection' then
 if e.status<>'review' or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'selection') then return jsonb_build_object('state','closed');end if;
 select * into decision from msrc_competitions.decisions dd where dd.id=(payload->>'decisionId')::uuid and dd.entry_id=e.id and dd.entry_version=e.version;
 if not found or decision.settings_version<>cfg.version or decision.review_basis<>msrc_competitions.review_basis(e.id,e.version)
 or decision.id<>(select dd.id from msrc_competitions.decisions dd where dd.entry_id=e.id order by dd.created_at desc,dd.id desc limit 1) then return jsonb_build_object('state','conflict');end if;
 outcome:=decision.outcome;
 if outcome='accepted' and competition_type='hackathon' then
 cap:=(cfg.configuration->>'finalistCapPerTrack')::integer;
 if e.document->>'participationMode'='team' or (cfg.configuration->>'soloConsumesFinalistQuota')::boolean then
 select count(*)::integer into used from msrc_competitions.entries q where q.edition_key=edition_key and q.kind=competition_type and q.status='accepted' and q.document->>'track'=e.document->>'track' and (q.document->>'participationMode'='team' or (cfg.configuration->>'soloConsumesFinalistQuota')::boolean);
 if used>=cap then return jsonb_build_object('state','full');end if;end if;end if;

 insert into msrc_competitions.publications(decision_id,actor_id) values(decision.id,auth.uid());
 update msrc_competitions.entries q set status=outcome where q.id=e.id;result:=jsonb_build_object('state','selected');
 elsif action='panel' then
 if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'judging') or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'final_material') then return jsonb_build_object('state','closed');end if;
 if jsonb_typeof(payload->'judgeIds') is distinct from 'array' or jsonb_array_length(payload->'judgeIds')<>(cfg.configuration->>'judgeCount')::integer then return jsonb_build_object('state','invalid');end if;
 if (select count(*)<>count(distinct x) from jsonb_array_elements_text(payload->'judgeIds') x) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_competitions.judge_assignments q where q.entry_id=e.id) then return jsonb_build_object('state','locked');end if;
 if exists(select 1 from msrc_competitions.files f where f.entry_id=e.id and f.state<>'clean') then return jsonb_build_object('state','evidence_gate');end if;
 for judge in select x::uuid from jsonb_array_elements_text(payload->'judgeIds') x loop
 if not msrc_competitions.eligible_staff(edition_key,judge,array['facultyJudge']) or msrc_competitions.has_conflict(e.id,judge)
 or exists(select 1 from msrc_competitions.assignments q where q.entry_id=e.id and q.reviewer_id=judge) then return jsonb_build_object('state','coi');end if;end loop;
 insert into msrc_competitions.judging_materials(entry_id,entry_version,files,actor_id) select e.id,e.version,coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'path',f.object_path,'mime',f.mime,'size',f.byte_size)),'[]'::jsonb),auth.uid() from msrc_competitions.files f where f.entry_id=e.id and f.stage='final' and f.state='clean';
 insert into msrc_competitions.judge_assignments(entry_id,entry_version,judge_id,settings_version) select e.id,e.version,x::uuid,cfg.version from jsonb_array_elements_text(payload->'judgeIds') x;
 result:=jsonb_build_object('state','assigned');
 elsif action in('judge','judge_conflict') then
 if e.status<>'accepted' or j.entry_version<>e.version or j.status='conflict' or msrc_competitions.has_conflict(e.id,auth.uid()) or exists(select 1 from msrc_competitions.outcomes o where o.entry_id=e.id) then return jsonb_build_object('state','denied');end if;
 if action='judge' and j.status='completed' then return jsonb_build_object('state','locked');end if;
 if not msrc_competitions.stage_ready(cfg.configuration,competition_type,'judging') then return jsonb_build_object('state','closed');end if;
 if j.version<>(payload->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 select v.configuration into rubric from msrc_competitions.settings_versions v where v.edition_key=edition_key and v.kind=competition_type and v.version=j.settings_version;
 if not msrc_competitions.stage_ready(rubric,competition_type,'judging') then return jsonb_build_object('state','closed');end if;
 if action='judge_conflict' then
 if length(btrim(coalesce(payload->>'reason','')))=0 then return jsonb_build_object('state','invalid');end if;
 update msrc_competitions.judge_assignments q set status='conflict',version=q.version+1 where q.id=j.id;
 else
 if not msrc_competitions.scorecard_valid(payload->'scorecard',rubric->'finalRubric',coalesce((payload->>'submit')::boolean,false)) then return jsonb_build_object('state','invalid');end if;
 update msrc_competitions.judge_assignments q set scorecard=payload->'scorecard',version=q.version+1,status=case when payload->>'submit'='true' then 'completed' else 'assigned' end where q.id=j.id returning * into j;
 insert into msrc_competitions.judge_versions values(j.id,j.version,j.scorecard,j.status);end if;result:=jsonb_build_object('state','updated');
 elsif action='activity' then
 if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'judging') then return jsonb_build_object('state','closed');end if;
 select r.actor_id into actor from msrc_competitions.roster r where r.entry_id=e.id and (r.actor_id=(payload->>'participantId')::uuid or r.id=(payload->>'participantId')::uuid);
 if not exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and r.actor_id=actor) or not exists(select 1 from jsonb_array_elements_text(cfg.configuration->'requiredActivities') x where x=payload->>'activity') or length(btrim(coalesce(payload->>'evidence','')))=0 then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_competitions.activity_evidence aa where aa.entry_id=e.id and aa.participant_id=actor and aa.activity=payload->>'activity') then return jsonb_build_object('state','duplicate');end if;
 insert into msrc_competitions.activity_evidence(entry_id,participant_id,activity,evidence,actor_id) values(e.id,actor,payload->>'activity',payload->>'evidence',auth.uid());result:=jsonb_build_object('state','updated');
 elsif action='outcome' then
 if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'judging') then return jsonb_build_object('state','closed');end if;
 if exists(select 1 from msrc_competitions.outcomes o where o.entry_id=e.id) then return jsonb_build_object('state','locked');end if;
 if length(btrim(coalesce(payload->>'outcome','')))=0 or length(btrim(coalesce(payload->>'reason','')))=0 then return jsonb_build_object('state','invalid');end if;
 if (select count(*) from msrc_competitions.judge_assignments q where q.entry_id=e.id and q.entry_version=e.version and q.status='completed' and msrc_competitions.eligible_staff(edition_key,q.judge_id,array['facultyJudge']) and not msrc_competitions.has_conflict(e.id,q.judge_id))<>(cfg.configuration->>'judgeCount')::integer then return jsonb_build_object('state','reviews_incomplete');end if;
 if exists(select 1 from msrc_competitions.roster r cross join jsonb_array_elements_text(cfg.configuration->'requiredActivities') activity where r.entry_id=e.id and not exists(select 1 from msrc_competitions.activity_evidence v where v.entry_id=e.id and v.participant_id=r.actor_id and v.activity=activity)) then return jsonb_build_object('state','evidence_gate');end if;
 select jsonb_agg(jsonb_build_object('assignmentId',q.id,'version',q.version,'settingsVersion',q.settings_version,'scorecard',q.scorecard) order by q.id) into basis from msrc_competitions.judge_assignments q where q.entry_id=e.id and q.status='completed';
 insert into msrc_competitions.outcomes(entry_id,outcome,reason,judging_basis,actor_id) values(e.id,payload->>'outcome',payload->>'reason',basis,auth.uid());result:=jsonb_build_object('state','recorded');
 else return jsonb_build_object('state','invalid');end if;
 end if;
 perform msrc_competitions.record(edition_key,'staff.'||action,e.id,jsonb_build_object('kind',competition_type,'payload',payload));
 if old.operation_id is null then insert into msrc_competitions.operations values(edition_key,auth.uid(),operation_id,input,result);end if;return result;
exception when invalid_text_representation or numeric_value_out_of_range or check_violation then return jsonb_build_object('state','invalid');
end$$;


revoke all on all functions in schema msrc_competitions from public,anon,authenticated,service_role;
do $$declare p record;begin
 for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'msrc_competitions_%' loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',p.signature);
 execute format('grant execute on function %s to service_role',p.signature);end loop;
 for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace and proname like 'msrc_staff_competitions_%' loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',p.signature);
 execute format('grant execute on function %s to authenticated',p.signature);end loop;
end$$;
commit;
