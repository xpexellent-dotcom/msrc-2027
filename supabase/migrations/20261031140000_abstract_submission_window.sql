-- ENG-092 / ORG-058/068/069; ABS-09/11/12/15, CFG-03/10, TIM-01/02.
-- Review only. No settings seeds, activation, storage or scanning infrastructure.
begin;

create function msrc_abstracts.window_status(edition text) returns jsonb
 language sql volatile security invoker set search_path='' as $$
 select jsonb_build_object('version',coalesce(s.version,0),'enabled',coalesce(s.enabled,false),
 'opensAt',to_char((s.configuration->>'opensAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'closesAt',to_char((s.configuration->>'closesAt')::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'observedAt',to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
 'evidenceReady',coalesce(s.evidence_ready,false),
 'similarityReady',((select q.similarity_threshold from msrc_abstracts.screening_settings q where q.edition_key=edition order by q.version desc limit 1) is not null),
 'participantEnabled',coalesce(p.enabled,false),'privacyReady',p.privacy_version is not null,
 'privacyVersion',p.privacy_version,'emailDailyLimit',p.email_daily_limit,
 'emailReady',p.email_daily_limit is not null,'retentionReady',coalesce(r.enabled,false))
 from (values(1)) seed(n) left join msrc_abstracts.settings s on s.edition_key=edition
 left join msrc_participant.policy p on p.singleton left join msrc_participant.retention_policy r on r.singleton;
$$;
create function public.msrc_staff_research_window(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$begin
 perform msrc_abstracts.guard();
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready','window',msrc_abstracts.window_status(edition_key));
end$$;

create function public.msrc_staff_research_save_window(edition_key text,expected_version integer,opens_at text,closes_at text,accept_submissions boolean) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.settings%rowtype;c jsonb;begin
 perform msrc_abstracts.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if expected_version is null or expected_version<0 or accept_submissions is null
 or (opens_at is null)<>(closes_at is null) or accept_submissions and opens_at is null then return jsonb_build_object('state','invalid');end if;
 -- Text transport must carry explicit UTC; reject ambiguous/local/offset inputs.
 if opens_at is not null then
 if opens_at !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$'
 or closes_at !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$' then return jsonb_build_object('state','invalid');end if;
 begin
 if left(opens_at,19)<>to_char(opens_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS')
 or left(closes_at,19)<>to_char(closes_at::timestamptz at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS') then return jsonb_build_object('state','invalid');end if;
 if closes_at::timestamptz<=opens_at::timestamptz then return jsonb_build_object('state','invalid');end if;
 exception when invalid_datetime_format or datetime_field_overflow then return jsonb_build_object('state','invalid');end;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('abstract-settings:'||edition_key,0));
 select * into s from msrc_abstracts.settings q where q.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if coalesce(s.version,0)<>expected_version then return jsonb_build_object('state','conflict');end if;
 c:=coalesce(s.configuration,msrc_abstracts.settings_defaults())||jsonb_build_object('opensAt',opens_at,'closesAt',closes_at);
 if not msrc_abstracts.settings_valid(c,false) then return jsonb_build_object('state','invalid');end if;
 if s.edition_key is null then insert into msrc_abstracts.settings(edition_key,version,configuration,enabled) values(edition_key,1,c,accept_submissions) returning * into s;
 else update msrc_abstracts.settings q set configuration=c,enabled=accept_submissions,version=q.version+1 where q.edition_key=edition_key returning * into s;end if;
 insert into msrc_abstracts.settings_versions values(edition_key,s.version,c);
 perform msrc_abstracts.record(edition_key,'window.saved',null,jsonb_build_object('version',s.version,'enabled',s.enabled,'opensAt',opens_at,'closesAt',closes_at,'timezone','Asia/Riyadh','storage','UTC'));
 return public.msrc_staff_research_window(edition_key);
end$$;

-- The staff RPC never changes evidence_ready. Similarity-report uploads remain
-- required by ABS-09/11; ethics and study registration use ORG-068 references.
comment on column msrc_abstracts.settings.evidence_ready is 'ENG-092: closed for ABS-09/11 private similarity-report uploads, quarantine, virus scanning and validation/release evidence. ORG-068 ethics and trial registration are text references. No staff RPC changes this gate. ABS-15 confidentiality remains Super Admin only.';

revoke all on function msrc_abstracts.window_status(text) from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_research_window(text),public.msrc_staff_research_save_window(text,integer,text,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_research_window(text),public.msrc_staff_research_save_window(text,integer,text,text,boolean) to authenticated;

-- Remaining replacements below retain incumbent contracts, locks and grants.

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
 -- Legacy clients may change window dates only with Super Admin authority and explicit UTC.
 if ((settings->'opensAt') is distinct from (coalesce(s.configuration,msrc_abstracts.settings_defaults())->'opensAt')
 or (settings->'closesAt') is distinct from (coalesce(s.configuration,msrc_abstracts.settings_defaults())->'closesAt')) then
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if exists(select 1 from unnest(array['opensAt','closesAt']) k where settings->>k is not null and settings->>k !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+]00:00)$') then return jsonb_build_object('state','invalid');end if;
 end if;
 if coalesce(s.version,0)<>expected_version then return jsonb_build_object('state','conflict');end if;
 if s.edition_key is null then insert into msrc_abstracts.settings(edition_key,version,configuration) values(edition_key,1,settings) returning * into s;
 else update msrc_abstracts.settings q set version=q.version+1,configuration=settings where q.edition_key=edition_key returning * into s;end if;
 insert into msrc_abstracts.settings_versions values(edition_key,s.version,settings);
 perform msrc_abstracts.record(edition_key,'settings.saved',null,jsonb_build_object('version',s.version,'enabled',s.enabled,'opensAt',settings->'opensAt','closesAt',settings->'closesAt'));
 return public.msrc_staff_research_settings(edition_key);
end$$;

create or replace function msrc_abstracts.participant_settings(edition text) returns jsonb language sql volatile security invoker set search_path='' as $$
 select jsonb_build_object('specialties',c->'specialties','studyTypes',c->'studyTypes','keywordCount',c->'keywordCount','opensAt',c->'opensAt','closesAt',c->'closesAt',
 'correspondingAuthorPolicy',c->'correspondingAuthorPolicy','windowState',case when not msrc_abstracts.submission_settings_ready(c) or not coalesce(s.evidence_ready,false) or not msrc_participant.ready() or not ((select t.similarity_threshold from msrc_abstracts.screening_settings t where t.edition_key=edition order by t.version desc limit 1) is not null) then 'not_ready'
 when coalesce(s.enabled,false) and clock_timestamp()>=(c->>'opensAt')::timestamptz and clock_timestamp()<(c->>'closesAt')::timestamptz then 'open' else 'closed' end)
 from (select coalesce((select configuration from msrc_abstracts.settings where edition_key=edition),msrc_abstracts.settings_defaults()) c) x
 left join msrc_abstracts.settings s on s.edition_key=edition;
$$;

create or replace function msrc_abstracts.participant(edition text,action text,submission_id uuid,expected_version integer,d jsonb,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_abstracts.settings%rowtype;s msrc_abstracts.submissions%rowtype;result jsonb;previous msrc_abstracts.operations%rowtype;budget msrc_abstracts.mutation_limits%rowtype;
 input bytea;reference_number bigint;window_open boolean;begin
 perform 1 from msrc_authorization.account_access a where a.actor_id=auth.uid() for share;
 perform 1 from auth.users u where u.id=auth.uid() for share;
 if not msrc_participant.ready() then return jsonb_build_object('state','closed');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 if action='me' then
 select coalesce(jsonb_agg(msrc_abstracts.projection(q) order by q.created_at desc,q.id),'[]'::jsonb) into result from msrc_abstracts.submissions q where q.edition_key=edition and q.actor_id=auth.uid();
 return jsonb_build_object('state','ready','settings',msrc_abstracts.participant_settings(edition),'submissions',result,'presenter',msrc_abstracts.presenter(auth.uid(),edition));end if;
 if operation_id is null or expected_version is null or expected_version<0 then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('abstract-operation:'||edition||':'||auth.uid()::text||':'||operation_id::text,0));
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 input:=sha256(convert_to(jsonb_build_array(action,submission_id,expected_version,d)::text,'UTF8'));
 select * into previous from msrc_abstracts.operations o where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=operation_id;
 if found then if previous.input_hash<>input then return jsonb_build_object('state','conflict');end if;return previous.result;end if;
 insert into msrc_abstracts.mutation_limits values(auth.uid(),clock_timestamp(),1)
 on conflict on constraint mutation_limits_pkey do update set
 window_started_at=case when msrc_abstracts.mutation_limits.window_started_at<=clock_timestamp()-interval '1 minute' then clock_timestamp() else msrc_abstracts.mutation_limits.window_started_at end,
 used=case when msrc_abstracts.mutation_limits.window_started_at<=clock_timestamp()-interval '1 minute' then 1 else least(61,msrc_abstracts.mutation_limits.used+1) end returning * into budget;
 if budget.used>60 then
 if not exists(select 1 from msrc_abstracts.audit a where a.actor_id=auth.uid() and a.event='mutation.limited' and a.created_at>=budget.window_started_at) then
 perform msrc_abstracts.record(edition,'mutation.limited',null);end if;return jsonb_build_object('state','limited');end if;
 -- Settings and window are re-read after lock acquisition. This serializes settings, finalization and edition references.
 select * into cfg from msrc_abstracts.settings q where q.edition_key=edition for update;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 if cfg.edition_key is null or not cfg.enabled or not msrc_abstracts.submission_settings_ready(cfg.configuration) or msrc_participant.profile_expired(edition) then return jsonb_build_object('state','closed');end if;
 window_open:=clock_timestamp()>=(cfg.configuration->>'opensAt')::timestamptz and clock_timestamp()<(cfg.configuration->>'closesAt')::timestamptz;
 if submission_id is not null then
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition and q.actor_id=auth.uid() for update;
 if not found then return jsonb_build_object('state','denied');end if;
 if s.version<>expected_version then return jsonb_build_object('state','conflict');end if;

 if s.status<>'draft' and s.finalized_at is null then return jsonb_build_object('state','locked');end if;

 elsif expected_version<>0 or action<>'save' then return jsonb_build_object('state','invalid');end if;
 if msrc_participant.observe_profile(edition) is null or not msrc_participant.age_proven(auth.uid()) then return jsonb_build_object('state','denied');end if;
 window_open:=clock_timestamp()>=(cfg.configuration->>'opensAt')::timestamptz and clock_timestamp()<(cfg.configuration->>'closesAt')::timestamptz;
 if not window_open then return jsonb_build_object('state','closed');end if;
 -- Actor/edition locking serializes independent operation ids, single-draft creation
 -- and chance consumption. The settings-row lock is acquired first throughout.
 perform pg_advisory_xact_lock(hashtextextended('abstract-participant:'||edition||':'||auth.uid()::text,0));
 if action='finalize' then
 if not msrc_participant.profile_submission_gate(auth.uid(),edition) then return jsonb_build_object('state','profile_incomplete');end if;
 if not msrc_abstracts.presenter_eligible(auth.uid(),edition) then return jsonb_build_object('state','presenter_ineligible');end if;
 end if;
 if exists(select 1 from msrc_abstracts.submissions q where q.edition_key=edition and q.actor_id=auth.uid() and q.finalized_at is not null) then return jsonb_build_object('state','submission_used');end if;
 if action='save' then
 if not msrc_abstracts.document_valid(d,cfg.configuration,false) then return jsonb_build_object('state','invalid');end if;
 d:=msrc_abstracts.bind_presenter(d,auth.uid(),edition);
 if not msrc_abstracts.document_valid(d,cfg.configuration,false) then return jsonb_build_object('state','invalid');end if;
 if s.id is null and exists(select 1 from msrc_abstracts.submissions q where q.edition_key=edition and q.actor_id=auth.uid() and q.status='draft') then return jsonb_build_object('state','conflict');end if;
 if s.id is null then
 insert into msrc_abstracts.submissions(edition_key,actor_id,version,document,word_count) values(edition,auth.uid(),1,d,msrc_abstracts.word_count(d->'body')) returning * into s;
 else update msrc_abstracts.submissions q set document=d,word_count=msrc_abstracts.word_count(d->'body'),version=q.version+1 where q.id=s.id returning * into s;end if;
 perform msrc_abstracts.record(edition,'draft.saved',s.id,jsonb_build_object('version',s.version));
 result:=jsonb_build_object('state','saved','submission',msrc_abstracts.projection(s));
 elsif action='finalize' then
 s.document:=msrc_abstracts.bind_presenter(s.document,auth.uid(),edition);
 if not msrc_abstracts.document_valid(s.document,cfg.configuration,true) then return jsonb_build_object('state','invalid');end if;
 if not cfg.evidence_ready then return jsonb_build_object('state','evidence_gate');end if;
 if not ((select t.similarity_threshold from msrc_abstracts.screening_settings t where t.edition_key=edition order by t.version desc limit 1) is not null) then return jsonb_build_object('state','closed');end if;
 if s.reference is null then update msrc_abstracts.settings q set next_reference=q.next_reference+1 where q.edition_key=edition returning next_reference-1 into reference_number;end if;
 update msrc_abstracts.submissions q set status='submitted',finalized_at=coalesce(q.finalized_at,clock_timestamp()),pi_key=null,document=s.document,word_count=msrc_abstracts.word_count(s.document->'body'),
 reference=coalesce(q.reference,edition||'-ABS-'||lpad(reference_number::text,6,'0')),revision_deadline=null,revision_instructions=null where q.id=s.id returning * into s;
 insert into msrc_abstracts.snapshots(submission_id,version,document,word_count,settings_version) values(s.id,s.version,s.document,s.word_count,cfg.version);
 insert into msrc_abstracts.authors(submission_id,submission_version,position,author_id,name,email,affiliations)
 select s.id,s.version,ordinality::integer,(a->>'id')::uuid,a->>'name',a->>'email',array(select jsonb_array_elements_text(a->'affiliations')) from jsonb_array_elements(s.document->'authors') with ordinality x(a,ordinality);
 update msrc_abstracts.assignments q set status='withdrawn',version=q.version+1 where q.submission_id=s.id and q.submission_version<>s.version and q.status in('assigned','draft');
 perform msrc_abstracts.record(edition,'submission.finalized',s.id,jsonb_build_object('version',s.version,'wordCount',s.word_count));
 result:=jsonb_build_object('state','finalized','submission',msrc_abstracts.projection(s));
 else return jsonb_build_object('state','invalid');end if;
 insert into msrc_abstracts.operations values(edition,auth.uid(),operation_id,input,result);return result;
end$$;

create or replace function public.msrc_abstracts_status(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
begin
 perform msrc_abstracts.guard();perform msrc_registration.server_only();
 return jsonb_build_object('documentVersion',2,'enabled',coalesce((select enabled from msrc_abstracts.settings s where s.edition_key=edition_key),false),
 'settingsComplete',coalesce((select msrc_abstracts.submission_settings_ready(configuration) and evidence_ready from msrc_abstracts.settings s where s.edition_key=edition_key),false),
 'evidenceGate','similarity_upload_and_virus_scanning_pending','window',msrc_abstracts.window_status(edition_key));
end$$;
notify pgrst,'reload schema';
commit;
