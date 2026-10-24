-- ORG-065 / ENG-080. TRK-01, HAC-01..11, CFG-13; review-only, all release gates remain closed.
begin;
create table msrc_competitions.hackathon_profiles (
 edition_key text not null references msrc_authorization.edition_config(edition_key),actor_id uuid not null,
 university text not null,field_of_study text not null,phone text not null,enrolled_in_saudi_university boolean not null,
 proof_file_id uuid references msrc_competitions.files(id),primary key(edition_key,actor_id),
 check(length(btrim(university)) between 1 and 500),check(length(btrim(field_of_study)) between 1 and 500),check(phone ~ '^[+0-9() .-]{5,40}$')
);
create table msrc_competitions.hackathon_checks (
 entry_id uuid primary key references msrc_competitions.entries(id),integrity_flag boolean not null default false,
 committee_cleared boolean not null default false,manual_third_review boolean not null default false,
 withdrawn boolean not null default false,finalist_confirmed boolean not null default false
);
create table msrc_competitions.judging_concerns (
 id uuid primary key default gen_random_uuid(),entry_id uuid not null references msrc_competitions.entries(id),
 judge_id uuid not null,category text not null check(category in('originality','ethics','privacy','safety')),
 reason text not null check(length(btrim(reason))>0),created_at timestamptz not null default clock_timestamp()
);
create index hackathon_concerns_entry on msrc_competitions.judging_concerns(entry_id);
comment on table msrc_competitions.activity_evidence is 'HAC-11 finalist certificate evidence hook only; this module never issues certificates.';
alter table msrc_competitions.files drop constraint files_stage_check;
alter table msrc_competitions.files add constraint files_stage_check check(stage in('supporting','final','proof'));
alter table msrc_competitions.files add column owner_id uuid;
alter table msrc_competitions.assignments add column created_at timestamptz not null default clock_timestamp();
do $$declare t text;begin
 foreach t in array array['hackathon_profiles','hackathon_checks','judging_concerns'] loop
 execute format('alter table msrc_competitions.%I enable row level security',t);
 execute format('alter table msrc_competitions.%I force row level security',t);
 end loop;
end$$;
create trigger competitions_append_only before insert or update or delete on msrc_competitions.judging_concerns for each row execute function msrc_staff.audit_immutable();
create trigger competitions_no_truncate before truncate on msrc_competitions.judging_concerns for each statement execute function msrc_staff.audit_immutable();

create or replace function msrc_competitions.settings_defaults() returns jsonb language sql immutable security invoker set search_path='' as $$
 select '{"opensAt":null,"closesAt":null,"reviewDeadline":null,"eligibilityPolicy":null,"eligibilityEvidence":null,"participationLimits":null,"initialFilePolicy":null,"declarationPolicy":null,"pitchPromptStructure":null,"referencesAppendixPolicy":null,"duplicateParticipationPolicy":null,"membershipAfterSubmission":null,"memberConfirmationPolicy":null,"soloConsumesFinalistQuota":null,"finalistCapPerTrack":null,"selectionCriteria":null,"selectionScoreMin":null,"selectionScoreMax":null,"minimumReviews":null,"rankingTiePolicy":null,"finalRubric":null,"judgeCount":null,"finalTieRules":null,"crossPanelPolicy":null,"presentationRules":null,"finalMaterialPolicy":null,"activityEvidencePolicy":null,"requiredActivities":null,"certificateAwardPolicy":null,"feesIPPublicityPolicy":null,"preparationDeadlines":null,"originalityReviewPolicy":null,"soloTeamAwardPolicy":null, "thirdReviewDifference":null, "trackLabels":null, "trackDescriptions":null, "orientationDetails":null, "timetable":null, "whatsappSupportUrl":null, "finalDeckLockAt":null, "participantInstructions":null, "rosterConfirmationDeadline":null}'::jsonb;$$;

create function msrc_competitions.hackathon_defaults() returns jsonb language sql immutable security invoker set search_path='' as $$ select msrc_competitions.settings_defaults() || $json${"selectionCriteria":[{"id":"problem_relevance","label":"Problem Relevance & Potential Impact","min":1,"max":5,"questions":["Is the problem clear, significant, and aligned with the selected track?","If solved, would it meaningfully benefit the intended users?"],"scale":[{"score":5,"label":"Excellent","description":"Both guiding questions convincingly addressed; strong support."},{"score":4,"label":"Strong","description":"Both addressed well; only minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met, but some development is needed."},{"score":2,"label":"Weak","description":"Substantial gaps in explanation, justification or practicality."},{"score":1,"label":"Poor","description":"Criterion largely unaddressed or unsupported."}],"rubricVersion":"screening-v1"},{"id":"innovation_fit","label":"Innovation & Solution Fit","min":1,"max":5,"questions":["Does the proposed solution directly address the identified problem?","Does it offer meaningful novelty or improvement over existing approaches?"],"scale":[{"score":5,"label":"Excellent","description":"Both guiding questions convincingly addressed; strong support."},{"score":4,"label":"Strong","description":"Both addressed well; only minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met, but some development is needed."},{"score":2,"label":"Weak","description":"Substantial gaps in explanation, justification or practicality."},{"score":1,"label":"Poor","description":"Criterion largely unaddressed or unsupported."}],"rubricVersion":"screening-v1"},{"id":"feasibility_development","label":"Feasibility & Development Potential","min":1,"max":5,"questions":["Is the idea realistic considering likely requirements, resources, and barriers?","Is there a plausible pathway for further development?"],"scale":[{"score":5,"label":"Excellent","description":"Both guiding questions convincingly addressed; strong support."},{"score":4,"label":"Strong","description":"Both addressed well; only minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met, but some development is needed."},{"score":2,"label":"Weak","description":"Substantial gaps in explanation, justification or practicality."},{"score":1,"label":"Poor","description":"Criterion largely unaddressed or unsupported."}],"rubricVersion":"screening-v1"},{"id":"evidence_rationale","label":"Evidence & Rationale","min":1,"max":5,"questions":["Is the problem supported by credible research or other appropriate evidence?","Is there a sound rationale for why the proposed solution could work?"],"scale":[{"score":5,"label":"Excellent","description":"Both guiding questions convincingly addressed; strong support."},{"score":4,"label":"Strong","description":"Both addressed well; only minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met, but some development is needed."},{"score":2,"label":"Weak","description":"Substantial gaps in explanation, justification or practicality."},{"score":1,"label":"Poor","description":"Criterion largely unaddressed or unsupported."}],"rubricVersion":"screening-v1"}],"finalRubric":[{"id":"problem_need","label":"Problem & Need","min":1,"max":5,"questions":["Is the unmet need specific, significant and relevant to the track?","Are affected users, causes and context understood?"],"scale":[{"score":5,"label":"Excellent","description":"Convincing, well-supported; no material deficiency."},{"score":4,"label":"Strong","description":"Well addressed, with minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met; substantive gaps remain."},{"score":2,"label":"Weak","description":"Major deficiencies reduce confidence."},{"score":1,"label":"Poor","description":"Criterion largely unclear, unsupported or unaddressed."}],"anchors":[{"score":5,"description":"clear, significant need, users and causes"},{"score":3,"description":"relevant but incomplete context"},{"score":1,"description":"vague or unjustified need"}],"rubricVersion":"final-v1"},{"id":"evidence_rationale","label":"Evidence & Scientific Rationale","min":1,"max":5,"questions":["Do credible sources support the problem and key claims?","Is the approach justified, with uncertainties recognized?"],"scale":[{"score":5,"label":"Excellent","description":"Convincing, well-supported; no material deficiency."},{"score":4,"label":"Strong","description":"Well addressed, with minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met; substantive gaps remain."},{"score":2,"label":"Weak","description":"Major deficiencies reduce confidence."},{"score":1,"label":"Poor","description":"Criterion largely unclear, unsupported or unaddressed."}],"anchors":[{"score":5,"description":"credible support and justified mechanism"},{"score":3,"description":"some support but important gaps"},{"score":1,"description":"unsupported or misinterpreted claims"}],"rubricVersion":"final-v1"},{"id":"innovation_fit","label":"Innovation & Solution Fit","min":1,"max":5,"questions":["Does the idea offer meaningful improvement or originality?","Does it directly address the identified problem and users?"],"scale":[{"score":5,"label":"Excellent","description":"Convincing, well-supported; no material deficiency."},{"score":4,"label":"Strong","description":"Well addressed, with minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met; substantive gaps remain."},{"score":2,"label":"Weak","description":"Major deficiencies reduce confidence."},{"score":1,"label":"Poor","description":"Criterion largely unclear, unsupported or unaddressed."}],"anchors":[{"score":5,"description":"meaningful advancement with strong fit"},{"score":3,"description":"reasonable fit, limited differentiation"},{"score":1,"description":"poor fit or negligible added value"}],"rubricVersion":"final-v1"},{"id":"feasibility_implementation","label":"Feasibility & Implementation","min":1,"max":5,"questions":["Is there a realistic pathway, with resources and barriers considered?","Are stakeholders and relevant ethical or safety issues addressed?"],"scale":[{"score":5,"label":"Excellent","description":"Convincing, well-supported; no material deficiency."},{"score":4,"label":"Strong","description":"Well addressed, with minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met; substantive gaps remain."},{"score":2,"label":"Weak","description":"Major deficiencies reduce confidence."},{"score":1,"label":"Poor","description":"Criterion largely unclear, unsupported or unaddressed."}],"anchors":[{"score":5,"description":"realistic pathway, barriers and safeguards"},{"score":3,"description":"plausible but incomplete plan"},{"score":1,"description":"unrealistic or major barriers ignored"}],"rubricVersion":"final-v1"},{"id":"impact_sustainability","label":"Impact & Sustainability","min":1,"max":5,"questions":["Are the expected benefits credible and assessable?","Could the solution be maintained or adapted where appropriate?"],"scale":[{"score":5,"label":"Excellent","description":"Convincing, well-supported; no material deficiency."},{"score":4,"label":"Strong","description":"Well addressed, with minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met; substantive gaps remain."},{"score":2,"label":"Weak","description":"Major deficiencies reduce confidence."},{"score":1,"label":"Poor","description":"Criterion largely unclear, unsupported or unaddressed."}],"anchors":[{"score":5,"description":"credible benefits, measures and continuation"},{"score":3,"description":"plausible but weak measurement or plan"},{"score":1,"description":"overstated or unclear likely benefit"}],"rubricVersion":"final-v1"},{"id":"pitch_communication","label":"Pitch & Communication","min":1,"max":5,"questions":["Is the 5-minute presentation clear, coherent and concise?","Do visuals or demonstrations improve understanding?"],"scale":[{"score":5,"label":"Excellent","description":"Convincing, well-supported; no material deficiency."},{"score":4,"label":"Strong","description":"Well addressed, with minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met; substantive gaps remain."},{"score":2,"label":"Weak","description":"Major deficiencies reduce confidence."},{"score":1,"label":"Poor","description":"Criterion largely unclear, unsupported or unaddressed."}],"anchors":[{"score":5,"description":"concise, coherent and easy to follow"},{"score":3,"description":"understandable but uneven or crowded"},{"score":1,"description":"unclear or substantially disorganized"}],"rubricVersion":"final-v1"},{"id":"qa_defense","label":"Q&A & Defense","min":1,"max":5,"questions":["Are answers direct, accurate and logically defended?","Does the team acknowledge limitations and uncertainty?"],"scale":[{"score":5,"label":"Excellent","description":"Convincing, well-supported; no material deficiency."},{"score":4,"label":"Strong","description":"Well addressed, with minor gaps."},{"score":3,"label":"Adequate","description":"Core expectations met; substantive gaps remain."},{"score":2,"label":"Weak","description":"Major deficiencies reduce confidence."},{"score":1,"label":"Poor","description":"Criterion largely unclear, unsupported or unaddressed."}],"anchors":[{"score":5,"description":"accurate, reasoned answers; honest limits"},{"score":3,"description":"adequate with significant knowledge gaps"},{"score":1,"description":"inaccurate, evasive or poorly understood"}],"rubricVersion":"final-v1"}],"minimumReviews":2,"selectionScoreMin":1,"selectionScoreMax":5,"trackLabels":{"translating_research":{"en":"Evidence to Impact","ar":"من الدليل إلى الأثر"},"advancing_research":{"en":"Research Reimagined","ar":"البحث برؤية جديدة"}},"trackDescriptions":{"translating_research":{"en":"Transform existing scientific evidence into a practical, responsible solution to a healthcare problem. Beneficiaries may include patients, clinicians, healthcare organizations or health systems.","ar":"تحويل الأدلة العلمية القائمة إلى حل عملي ومسؤول لمشكلة صحية، بما يفيد المرضى أو الممارسين الصحيين أو المؤسسات والأنظمة الصحية."},"advancing_research":{"en":"Improve how medical and health research is conducted, organized, assessed, analyzed, communicated or applied. Beneficiaries are primarily researchers and research teams.","ar":"تحسين إجراء البحوث الطبية والصحية أو تنظيمها أو تقييمها أو تحليلها أو إيصال نتائجها أو تطبيقها، بما يفيد الباحثين والفرق البحثية أساسًا."}}}$json$::jsonb;$$;

create or replace function msrc_competitions.settings_valid(c jsonb) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;v jsonb;instant timestamptz;begin
 -- Older immutable 3MT configurations may omit newly introduced Hackathon keys.
 if jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>131072
 or exists(select 1 from jsonb_object_keys(c) x where not(msrc_competitions.settings_defaults()?x)) then return false;end if;
 for k,v in select * from jsonb_each(c) loop
 if v='null'::jsonb then continue;end if;
 if k in('opensAt','closesAt','reviewDeadline','finalDeckLockAt','rosterConfirmationDeadline') then
 if jsonb_typeof(v)<>'string' then return false;end if;
 begin instant:=(v#>>'{}')::timestamptz;exception when others then return false;end;
 if not isfinite(instant) then return false;end if;
 elsif k='soloConsumesFinalistQuota' then if jsonb_typeof(v)<>'boolean' then return false;end if;
 elsif k='thirdReviewDifference' then
 if jsonb_typeof(v)<>'number' or (v#>>'{}') !~ '^[1-9][0-9]?$' or (v#>>'{}')::integer>20 then return false;end if;
 elsif k in('trackLabels','trackDescriptions') then
 if jsonb_typeof(v)<>'object' or (select count(*) from jsonb_object_keys(v))<>2 or not(v?'translating_research' and v?'advancing_research') then return false;end if;
 if exists(select 1 from jsonb_each(v) x where jsonb_typeof(x.value)<>'object' or x.value<>jsonb_build_object('en',x.value->'en','ar',x.value->'ar') or jsonb_typeof(x.value->'en') is distinct from 'string' or jsonb_typeof(x.value->'ar') is distinct from 'string' or length(btrim(x.value->>'en'))=0 or length(btrim(x.value->>'ar'))=0) then return false;end if;
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
 or x - array['questions','scale','anchors','rubricVersion']<>jsonb_build_object('id',x->'id','label',x->'label','min',x->'min','max',x->'max')
 or jsonb_typeof(x->'id') is distinct from 'string' or coalesce(x->>'id','')!~'^[A-Za-z0-9_-]{1,60}$'
 or jsonb_typeof(x->'label') is distinct from 'string' or length(btrim(x->>'label'))=0
 or jsonb_typeof(x->'min') is distinct from 'number' or jsonb_typeof(x->'max') is distinct from 'number') then return false;end if;
 if exists(select 1 from jsonb_array_elements(v) x where (x->>'min')::numeric >= (x->>'max')::numeric)
 or (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(v) x) then return false;end if;
 end if;
 else if jsonb_typeof(v)<>'string' or length(btrim(v#>>'{}'))=0 then return false;end if;end if;end loop;
 if c->>'opensAt' is not null and c->>'closesAt' is not null and (c->>'opensAt')::timestamptz >= (c->>'closesAt')::timestamptz then return false;end if;
 if c->>'selectionScoreMin' is not null and c->>'selectionScoreMax' is not null and (c->>'selectionScoreMin')::numeric >= (c->>'selectionScoreMax')::numeric then return false;end if;
 if c->>'whatsappSupportUrl' is not null and c->>'whatsappSupportUrl' !~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9_-]+$' then return false;end if;
 return true;
end$$;

create or replace function msrc_competitions.stage_ready(c jsonb,kind text,stage text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;needed text[];begin
 if not msrc_competitions.settings_valid(c) or kind is null or stage is null or kind not in('hackathon','three_minute_thesis') then return false;end if;
 if stage='entry' then
 needed:=array['opensAt','closesAt','eligibilityPolicy','eligibilityEvidence','participationLimits','initialFilePolicy','declarationPolicy'];
 if kind='hackathon' then needed:=needed||array['pitchPromptStructure','referencesAppendixPolicy','duplicateParticipationPolicy','originalityReviewPolicy'];end if;
 elsif stage='selection' then
 if not msrc_competitions.stage_ready(c,kind,'entry') then return false;end if;
 needed:=array['reviewDeadline','selectionCriteria','selectionScoreMin','selectionScoreMax','minimumReviews','rankingTiePolicy'];
 if kind='hackathon' then needed:=needed||array['soloConsumesFinalistQuota','finalistCapPerTrack','thirdReviewDifference'];
 if c->>'minimumReviews' is not null and (c->>'minimumReviews')::integer>2 then return false;end if;end if;
 elsif stage='judging' then needed:=array['finalRubric','judgeCount','finalTieRules','crossPanelPolicy','presentationRules','activityEvidencePolicy','requiredActivities','certificateAwardPolicy','feesIPPublicityPolicy'];
 if kind='hackathon' then needed:=needed||array['preparationDeadlines','soloTeamAwardPolicy'];end if;
 elsif stage='final_material' then needed:=array['presentationRules','finalMaterialPolicy']; if kind='hackathon' then needed:=needed||array['finalDeckLockAt'];end if;
 elsif stage='membership' then needed:=array['membershipAfterSubmission','memberConfirmationPolicy']; if kind='hackathon' then needed:=needed||array['rosterConfirmationDeadline'];end if;
 else return false;end if;
 foreach k in array needed loop if c->k is null or c->k='null'::jsonb then return false;end if;end loop;
 if kind='hackathon' and stage='selection' and ((c->>'minimumReviews')::integer<>2 or (c->>'selectionScoreMin')::numeric<>1 or (c->>'selectionScoreMax')::numeric<>5 or jsonb_array_length(c->'selectionCriteria')<>4 or exists(select 1 from jsonb_array_elements(c->'selectionCriteria') x where (x->>'min')::numeric<>1 or (x->>'max')::numeric<>5)) then return false;end if;
 if kind='hackathon' and stage='judging' and ((c->>'judgeCount')::integer not between 3 and 5 or jsonb_array_length(c->'finalRubric')<>7 or exists(select 1 from jsonb_array_elements(c->'finalRubric') x where (x->>'min')::numeric<>1 or (x->>'max')::numeric<>5)) then return false;end if;
 if stage='selection' and exists(select 1 from jsonb_array_elements(c->'selectionCriteria') criterion where (criterion->>'min')::numeric<(c->>'selectionScoreMin')::numeric or (criterion->>'max')::numeric>(c->>'selectionScoreMax')::numeric) then return false;end if;
 return true;
end$$;

create or replace function msrc_competitions.participant_settings(edition text,competition text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('stageStates',msrc_competitions.stage_states(c,competition,coalesce(s.enabled,false) and coalesce(s.evidence_ready,false)),
 'pitchPrompt',c->'pitchPromptStructure','finalistCapPerTrack',c->'finalistCapPerTrack','filesReady',coalesce(s.files_ready,false),'trackLabels',c->'trackLabels','trackDescriptions',c->'trackDescriptions','applicationDeadline',c->'closesAt')
 from (select coalesce((select configuration from msrc_competitions.settings where edition_key=edition and kind=competition),case when competition='hackathon' then msrc_competitions.hackathon_defaults() else msrc_competitions.settings_defaults() end) c) x
 left join msrc_competitions.settings s on s.edition_key=edition and s.kind=competition;$$;

alter function msrc_competitions.document_valid(jsonb,text,boolean) rename to document_valid_v077;
create function msrc_competitions.document_valid(d jsonb,kind text,finalizing boolean) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;decl jsonb;begin
 if kind<>'hackathon' then return msrc_competitions.document_valid_v077(d,kind,finalizing);end if;
 if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>262144 then return false;end if;
 if not(d?'references') then return not finalizing and msrc_competitions.document_valid_v077(d,kind,false);end if;
 decl:=d->'declarations';
 if d<>jsonb_build_object('title',d->'title','pitch',d->'pitch','participationMode',d->'participationMode','track',d->'track','references',d->'references','links',d->'links','declarations',decl)
 or jsonb_typeof(decl) is distinct from 'object' or jsonb_typeof(d->'title') is distinct from 'string' or length(d->>'title')>2000
 or jsonb_typeof(d->'pitch') is distinct from 'string' or msrc_competitions.word_count(d->>'pitch')>300
 or jsonb_typeof(d->'references') is distinct from 'string' or jsonb_typeof(d->'links') is distinct from 'array'
 or jsonb_typeof(d->'participationMode') is distinct from 'string' or d->>'participationMode' not in('solo','team')
 or jsonb_typeof(d->'track') is distinct from 'string' or d->>'track' not in('translating_research','advancing_research') then return false;end if;
 if jsonb_array_length(d->'links')>5 or exists(select 1 from jsonb_array_elements(d->'links') x where jsonb_typeof(x)<>'string' or (x#>>'{}') !~ '^https://[^[:space:]]+$') then return false;end if;
 if (select count(*) from jsonb_object_keys(decl))<>14 then return false;end if;
 foreach k in array array['previouslyPresented','competitionEntered','prizeReceived','fundingReceived','commercialized','aiUsed','originalityPermissions','rulesAcknowledged','ethicsApplicable','mediaNoticeAcknowledged','authorityConfirmed'] loop
 if jsonb_typeof(decl->k) is distinct from 'boolean' then return false;end if;end loop;
 foreach k in array array['historyDetails','aiTools','teamContributions'] loop if jsonb_typeof(decl->k) is distinct from 'string' then return false;end if;end loop;
 if finalizing then
 if length(btrim(d->>'title'))=0 or msrc_competitions.word_count(d->>'pitch')=0 or length(btrim(decl->>'teamContributions'))=0 then return false;end if;
 foreach k in array array['originalityPermissions','rulesAcknowledged','mediaNoticeAcknowledged','authorityConfirmed'] loop if decl->k<>'true'::jsonb then return false;end if;end loop;
 if exists(select 1 from unnest(array['previouslyPresented','competitionEntered','prizeReceived','fundingReceived','commercialized']) flag(name) where decl->flag.name='true'::jsonb) and length(btrim(decl->>'historyDetails'))=0 then return false;end if;
 if decl->'aiUsed'='true'::jsonb and length(btrim(decl->>'aiTools'))=0 then return false;end if;
 end if;return true;
end$$;
create function msrc_competitions.profile_complete(edition text,actor uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from msrc_competitions.hackathon_profiles p where p.edition_key=edition and p.actor_id=actor and p.enrolled_in_saudi_university);$$;
create function msrc_competitions.profile_projection(edition text,actor uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('university',p.university,'fieldOfStudy',p.field_of_study,'phone',p.phone,'enrolledInSaudiUniversity',p.enrolled_in_saudi_university,'proofFileId',p.proof_file_id,'proofState',(select f.state from msrc_competitions.files f where f.id=p.proof_file_id),'complete',msrc_competitions.profile_complete(edition,actor)) from msrc_competitions.hackathon_profiles p where p.edition_key=edition and p.actor_id=actor;$$;

create or replace function msrc_competitions.roster_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare e msrc_competitions.entries%rowtype;begin
 if tg_op='DELETE' then
 select * into e from msrc_competitions.entries where id=old.entry_id for update;
 if e.kind='hackathon' and e.status<>'draft' and current_setting('msrc.hackathon_roster_committee',true) is distinct from e.id::text then raise exception using errcode='23514',message='Committee roster action required';end if;
 return old;end if;
 select * into e from msrc_competitions.entries where id=new.entry_id for update;
 if not found then raise exception using errcode='23503',message='Entry missing';end if;
 if e.kind='hackathon' then
 perform pg_advisory_xact_lock(hashtextextended('hackathon-member:'||e.edition_key||':'||new.actor_id::text,0));
 if exists(select 1 from msrc_competitions.roster r join msrc_competitions.entries q on q.id=r.entry_id where r.actor_id=new.actor_id and r.id<>new.id and q.id<>e.id and q.edition_key=e.edition_key and q.kind='hackathon') then raise exception using errcode='23514',message='One hackathon team per person';end if;
 if e.status<>'draft' and current_setting('msrc.hackathon_roster_committee',true) is distinct from e.id::text then raise exception using errcode='23514',message='Committee roster action required';end if;
 end if;
 if not exists(select 1 from auth.users u join msrc_participant.profiles p on p.actor_id=u.id join msrc_authorization.account_access a on a.actor_id=u.id
 where u.id=new.actor_id and lower(u.email)=lower(new.email) and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and p.state='verified' and a.state='active') then
 raise exception using errcode='23514',message='Roster requires verified accounts';end if;
 if new.is_lead<>(new.actor_id=e.lead_id) then raise exception using errcode='23514',message='Submitting lead mismatch';end if;
 if (select count(*) from msrc_competitions.roster r where r.entry_id=e.id and r.id<>new.id)>=(case when e.kind='three_minute_thesis' or e.document->>'participationMode'='solo' then 1 else 5 end) then
 raise exception using errcode='23514',message='Roster size exceeded';end if;
 return new;
end$$;

create function msrc_competitions.roster_delete_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare e msrc_competitions.entries%rowtype;begin
 select * into e from msrc_competitions.entries where id=old.entry_id for update;
 if e.kind='hackathon' and (old.is_lead or e.status<>'draft' and current_setting('msrc.hackathon_roster_committee',true) is distinct from e.id::text) then
 raise exception using errcode='23514',message='Committee roster action required';end if;
 return old;
end$$;
create trigger competitions_roster_delete_guard before delete on msrc_competitions.roster for each row execute function msrc_competitions.roster_delete_guard();
drop trigger competitions_roster_guard on msrc_competitions.roster;
create trigger competitions_roster_guard before insert or update or delete on msrc_competitions.roster for each row execute function msrc_competitions.roster_guard();

create or replace function msrc_competitions.projection(e msrc_competitions.entries) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',e.id,'kind',e.kind,'status',e.status,'version',e.version,'isLead',e.lead_id=auth.uid(),'invitationAccepted',exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and r.actor_id=auth.uid() and (r.is_lead or r.confirmed)),'document',e.document,
 'roster',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'email',r.email,'isLead',r.is_lead,'confirmed',r.confirmed) order by r.is_lead desc,r.id),'[]'::jsonb) from msrc_competitions.roster r where r.entry_id=e.id),
 'files',(select coalesce(jsonb_agg(jsonb_build_object('id',f.id,'name',f.name,'stage',f.stage) order by f.created_at,f.id),'[]'::jsonb) from msrc_competitions.files f where f.entry_id=e.id and f.stage<>'proof'),
 'outcome',(select o.outcome from msrc_competitions.outcomes o where o.entry_id=e.id)) || case when e.kind='hackathon' and e.status='accepted' and exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and r.actor_id=auth.uid()) and not exists(select 1 from msrc_competitions.hackathon_checks h where h.entry_id=e.id and h.withdrawn) then jsonb_build_object('finalistWorkspace',(select jsonb_build_object('orientationDetails',s.configuration->'orientationDetails','timetable',s.configuration->'timetable','whatsappSupportUrl',s.configuration->'whatsappSupportUrl','finalDeckLockAt',s.configuration->'finalDeckLockAt','participantInstructions',s.configuration->'participantInstructions','confirmed',coalesce((select h.finalist_confirmed from msrc_competitions.hackathon_checks h where h.entry_id=e.id),false)) from msrc_competitions.settings s where s.edition_key=e.edition_key and s.kind='hackathon')) else '{}'::jsonb end;$$;

create or replace function msrc_competitions.participant(edition text,competition text,action text,entry_id uuid,expected_version integer,d jsonb,operation_id uuid) returns jsonb
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
 'hackathonProfile',msrc_competitions.profile_projection(edition,auth.uid()),'entries',(select coalesce(jsonb_agg(msrc_competitions.projection(q) order by q.created_at desc,q.id),'[]'::jsonb) from msrc_competitions.entries q where q.edition_key=edition and (q.lead_id=auth.uid() or (q.kind='hackathon' or q.status='accepted') and exists(select 1 from msrc_competitions.roster r where r.entry_id=q.id and r.actor_id=auth.uid()))));end if;
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
 if competition='hackathon' and action='submit' then
 if exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and not msrc_competitions.profile_complete(edition,r.actor_id)) then return jsonb_build_object('state','profile_required');end if;
 if exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and not r.is_lead and not r.confirmed) then return jsonb_build_object('state','roster_incomplete');end if;end if;
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
 if competition='hackathon' then
 if not msrc_competitions.profile_complete(edition,auth.uid()) then return jsonb_build_object('state','profile_required');end if;
 if e.status='draft' then if msrc_competitions.stage_states(cfg.configuration,competition,true)->>'entry'<>'open' then return jsonb_build_object('state','closed');end if;
 elsif e.status='accepted' then if not msrc_competitions.stage_ready(cfg.configuration,competition,'membership') or clock_timestamp()>=(cfg.configuration->>'rosterConfirmationDeadline')::timestamptz then return jsonb_build_object('state','closed');end if;
 else return jsonb_build_object('state','closed');end if;
 else if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,competition,'membership') then return jsonb_build_object('state','closed');end if;end if;
 perform set_config('msrc.hackathon_roster_committee',e.id::text,true);
 update msrc_competitions.roster r set confirmed=true where r.entry_id=e.id and r.actor_id=auth.uid();
 result:=jsonb_build_object('state','confirmed','entry',msrc_competitions.projection(e));
 elsif action='file_reserve' then
 stage:=d->>'stage';
 if competition='hackathon' and stage='final' and (cfg.configuration->>'finalDeckLockAt' is null or clock_timestamp()>=(cfg.configuration->>'finalDeckLockAt')::timestamptz) then return jsonb_build_object('state','closed');end if;
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
 select jsonb_build_object('state','available','bucket','msrc-competition-files','path',f.object_path) into result from msrc_competitions.files f where f.id=(d->>'fileId')::uuid and f.entry_id=e.id and f.state='clean' and f.stage<>'proof';
 if result is null then return jsonb_build_object('state','unavailable');end if;
 else return jsonb_build_object('state','invalid');end if;
 perform msrc_competitions.record(edition,'participant.'||action,e.id,jsonb_build_object('version',e.version));
 if old.operation_id is null then insert into msrc_competitions.operations values(edition,auth.uid(),operation_id,input,result);end if;return result;
end$$;
-- Rebind the table constraint to the extended validator; legacy snapshots remain immutable.
alter table msrc_competitions.entries drop constraint competitions_document_valid;
alter table msrc_competitions.entries add constraint competitions_document_valid check(msrc_competitions.document_valid(document,kind,false));
alter table msrc_competitions.entries drop constraint entries_status_check;
alter table msrc_competitions.entries add constraint entries_status_check check(status in('draft','submitted','review','accepted','rejected','reserve','withdrawn'));
alter table msrc_competitions.decisions drop constraint decisions_outcome_check;
alter table msrc_competitions.decisions add constraint decisions_outcome_check check(outcome in('accepted','rejected','reserve'));

create function msrc_competitions.screening_total(card jsonb) returns numeric language sql immutable security invoker set search_path='' as $$
 select sum((s->>'value')::numeric) from jsonb_array_elements(card->'scores') s;$$;
create function msrc_competitions.administrative_ready(entry uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select e.eligibility='eligible' and (
 not exists(select 1 from unnest(array['previouslyPresented','competitionEntered','prizeReceived','fundingReceived','commercialized']) k where e.document->'declarations'->k='true'::jsonb)
 and not coalesce(h.integrity_flag,false) or coalesce(h.committee_cleared,false))
 from msrc_competitions.entries e left join msrc_competitions.hackathon_checks h on h.entry_id=e.id where e.id=entry;$$;
create function msrc_competitions.third_review_required(entry uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select coalesce(h.manual_third_review,false) or coalesce((select max(t.total)-min(t.total)>=(s.configuration->>'thirdReviewDifference')::numeric from (select msrc_competitions.screening_total(b->'scorecard') total from jsonb_array_elements(msrc_competitions.review_basis(e.id,e.version)) b join msrc_competitions.assignments a on a.id=(b->>'assignmentId')::uuid order by a.created_at,a.id limit 2) t having count(*)=2),false)
 from msrc_competitions.entries e join msrc_competitions.settings s on s.edition_key=e.edition_key and s.kind=e.kind left join msrc_competitions.hackathon_checks h on h.entry_id=e.id where e.id=entry;$$;
create function msrc_competitions.screening_ready(entry uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select e.eligibility='eligible' and jsonb_array_length(msrc_competitions.review_basis(e.id,e.version)) >= case when msrc_competitions.third_review_required(e.id) then 3 else 2 end
 and not exists(select 1 from msrc_competitions.assignments a where a.entry_id=e.id and a.entry_version=e.version and a.status='assigned')
 and (not exists(select 1 from unnest(array['previouslyPresented','competitionEntered','prizeReceived','fundingReceived','commercialized']) k where e.document->'declarations'->k='true'::jsonb)
 and not coalesce(h.integrity_flag,false) and not exists(select 1 from msrc_competitions.judging_concerns c where c.entry_id=e.id) or coalesce(h.committee_cleared,false))
 from msrc_competitions.entries e left join msrc_competitions.hackathon_checks h on h.entry_id=e.id where e.id=entry;$$;
create function msrc_competitions.screening_average(entry uuid) returns numeric language sql stable security invoker set search_path='' as $$
 select avg(msrc_competitions.screening_total(b->'scorecard')) from msrc_competitions.entries e cross join lateral jsonb_array_elements(msrc_competitions.review_basis(e.id,e.version)) b where e.id=entry;$$;
create function msrc_competitions.track_ranking(edition text,track_key text,reserve_only boolean default false) returns table(entry_id uuid,average_score numeric,rank bigint) language sql stable security invoker set search_path='' as $$
 select e.id,msrc_competitions.screening_average(e.id),rank() over(order by msrc_competitions.screening_average(e.id) desc)
 from msrc_competitions.entries e where e.edition_key=edition and e.kind='hackathon' and e.document->>'track'=track_key and e.status in('review','accepted','reserve') and msrc_competitions.screening_ready(e.id)
 and not exists(select 1 from msrc_competitions.hackathon_checks h where h.entry_id=e.id and h.withdrawn)
 and (not reserve_only or e.status in('review','reserve'));$$;
create function msrc_competitions.framework_projection(e msrc_competitions.entries) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('integrityFlag',coalesce(h.integrity_flag,false),'committeeCleared',coalesce(h.committee_cleared,false),'thirdReviewRequired',coalesce(msrc_competitions.third_review_required(e.id),false),
 'screeningAverage',msrc_competitions.screening_average(e.id),'reserveRank',(select t.rank from msrc_competitions.track_ranking(e.edition_key,e.document->>'track',true) t where t.entry_id=e.id),'finalistConfirmed',coalesce(h.finalist_confirmed,false)) from (select 1) x left join msrc_competitions.hackathon_checks h on h.entry_id=e.id;$$;

create function public.msrc_competitions_hackathon_action(edition_key text,session_claims jsonb,action text,entry_id uuid,expected_version integer,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare saved text:=current_setting('request.jwt.claims',true);cfg msrc_competitions.settings%rowtype;e msrc_competitions.entries%rowtype;old msrc_competitions.operations%rowtype;input bytea;result jsonb;file uuid;begin
 perform msrc_competitions.guard();perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 if not msrc_participant.ready() then result:=jsonb_build_object('state','closed');
 elsif msrc_participant.observe_profile(edition_key) is null or not msrc_participant.age_proven(auth.uid()) then result:=jsonb_build_object('state','denied');
 elsif action is null or action not in('profile','finalist_confirm','proof_reserve','proof_read','member_confirm') or operation_id is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>32768 then result:=jsonb_build_object('state','invalid');
 else
 perform pg_advisory_xact_lock(hashtextextended('competition-operation:'||edition_key||':'||auth.uid()::text||':'||operation_id::text,0));
 input:=sha256(convert_to(jsonb_build_array(action,entry_id,expected_version,payload)::text,'UTF8'));
 select * into old from msrc_competitions.operations o where o.edition_key=edition_key and o.actor_id=auth.uid() and o.operation_id=operation_id;
 if found then if old.input_hash<>input then result:=jsonb_build_object('state','conflict');else result:=old.result;end if;
 else
 select * into cfg from msrc_competitions.settings s where s.edition_key=edition_key and s.kind='hackathon' for update;
 if not found or not cfg.enabled or not cfg.evidence_ready then result:=jsonb_build_object('state','closed');
 elsif action='profile' then
 if msrc_competitions.stage_states(cfg.configuration,'hackathon',true)->>'entry'<>'open' then result:=jsonb_build_object('state','closed');
 elsif payload<>jsonb_build_object('university',payload->'university','fieldOfStudy',payload->'fieldOfStudy','phone',payload->'phone','enrolledInSaudiUniversity',payload->'enrolledInSaudiUniversity')
 or jsonb_typeof(payload->'university') is distinct from 'string' or jsonb_typeof(payload->'fieldOfStudy') is distinct from 'string' or jsonb_typeof(payload->'phone') is distinct from 'string' or jsonb_typeof(payload->'enrolledInSaudiUniversity') is distinct from 'boolean' then result:=jsonb_build_object('state','invalid');
 else
 insert into msrc_competitions.hackathon_profiles(edition_key,actor_id,university,field_of_study,phone,enrolled_in_saudi_university) values(edition_key,auth.uid(),btrim(payload->>'university'),btrim(payload->>'fieldOfStudy'),btrim(payload->>'phone'),(payload->>'enrolledInSaudiUniversity')::boolean)
 on conflict on constraint hackathon_profiles_pkey do update set university=excluded.university,field_of_study=excluded.field_of_study,phone=excluded.phone,enrolled_in_saudi_university=excluded.enrolled_in_saudi_university;
 result:=jsonb_build_object('state','profile_saved');end if;
 else
 select * into e from msrc_competitions.entries q where q.id=entry_id and q.edition_key=edition_key and q.kind='hackathon' for update;
 if not found or not exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and r.actor_id=auth.uid()) then result:=jsonb_build_object('state','denied');
 elsif e.version is distinct from expected_version then result:=jsonb_build_object('state','conflict');
 elsif action='member_confirm' then result:=msrc_competitions.participant(edition_key,'hackathon','member_confirm',entry_id,expected_version,'{}'::jsonb,operation_id);
 elsif action='finalist_confirm' then
 if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,'hackathon','membership') or clock_timestamp()>=(cfg.configuration->>'rosterConfirmationDeadline')::timestamptz then result:=jsonb_build_object('state','closed');
 elsif e.lead_id<>auth.uid() or exists(select 1 from msrc_competitions.roster r where r.entry_id=e.id and (not r.is_lead and not r.confirmed or not msrc_competitions.profile_complete(edition_key,r.actor_id))) then result:=jsonb_build_object('state','roster_incomplete');
 else insert into msrc_competitions.hackathon_checks(entry_id,finalist_confirmed) values(e.id,true) on conflict on constraint hackathon_checks_pkey do update set finalist_confirmed=true;result:=jsonb_build_object('state','finalist_confirmed');end if;
 elsif not cfg.files_ready or not msrc_competitions.profile_complete(edition_key,auth.uid()) then result:=jsonb_build_object('state','closed');
 elsif action='proof_reserve' then
 if jsonb_typeof(payload->'name') is distinct from 'string' or length(payload->>'name') not between 1 and 255 or (payload->>'name')~'[\\/\x00-\x1f]' or payload->>'mime' not in('application/pdf','image/png','image/jpeg') or coalesce(payload->>'size','') !~ '^[1-9][0-9]{0,7}$' or (payload->>'size')::bigint>26214400 then result:=jsonb_build_object('state','invalid');
 else file:=gen_random_uuid();insert into msrc_competitions.files(id,entry_id,name,stage,object_path,mime,byte_size,owner_id) values(file,e.id,payload->>'name','proof',edition_key||'/'||e.id::text||'/'||file::text,payload->>'mime',(payload->>'size')::bigint,auth.uid());
 update msrc_competitions.hackathon_profiles p set proof_file_id=file where p.edition_key=edition_key and p.actor_id=auth.uid();result:=jsonb_build_object('state','reserved','fileId',file,'bucket','msrc-competition-files','path',edition_key||'/'||e.id::text||'/'||file::text);end if;
 elsif action='proof_read' then
 select jsonb_build_object('state','available','bucket','msrc-competition-files','path',f.object_path) into result from msrc_competitions.files f where f.id=(payload->>'fileId')::uuid and f.entry_id=e.id and f.stage='proof' and f.owner_id=auth.uid() and f.state='clean';result:=coalesce(result,jsonb_build_object('state','unavailable'));
 end if;
 end if;
 if result->>'state' in('profile_saved','finalist_confirmed','reserved','available') then
 perform msrc_competitions.record(edition_key,'participant.hackathon.'||action,e.id,'{}'::jsonb);
 insert into msrc_competitions.operations values(edition_key,auth.uid(),operation_id,input,result);end if;
 end if;
 end if;
 exception when invalid_text_representation or numeric_value_out_of_range or check_violation then result:=jsonb_build_object('state','invalid');
 end;
 perform set_config('request.jwt.claims',coalesce(saved,''),true);return result;
 exception when others then perform set_config('request.jwt.claims',coalesce(saved,''),true);raise;
end$$;
create function msrc_competitions.framework_mutate(edition text,action text,payload jsonb,operation uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare e msrc_competitions.entries%rowtype;cfg msrc_competitions.settings%rowtype;old msrc_competitions.operations%rowtype;required text[];input bytea;result jsonb;actor uuid;member uuid;next_rank numeric;used integer;decision uuid;begin
 perform msrc_competitions.guard();
 required:=case when action='judge_concern' then array['facultyJudge'] when action in('committee_review','roster_change') then array['judgingCommittee','superAdmin'] when action='eligibility_flag' then array['registrationWorkshopAdministrator','superAdmin'] else array['scientificAdministrator','superAdmin'] end;
 if msrc_staff.authorize(edition,required) is null then return jsonb_build_object('state','denied');end if;
 if operation is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>32768 or coalesce(payload->>'expectedVersion','')!~'^[0-9]{1,9}$' or length(btrim(coalesce(payload->>'reason','')))=0 then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('competition-operation:'||edition||':'||auth.uid()::text||':'||operation::text,0));
 input:=sha256(convert_to(jsonb_build_array('hackathon',action,payload)::text,'UTF8'));
 select * into old from msrc_competitions.operations o where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=operation;
 if found then if old.input_hash<>input then return jsonb_build_object('state','conflict');end if;return old.result;end if;
 perform pg_advisory_xact_lock(hashtextextended('competition-settings:'||edition||':hackathon',0));
 select * into cfg from msrc_competitions.settings s where s.edition_key=edition and s.kind='hackathon' for update;
 if not found or not cfg.enabled or not cfg.evidence_ready then return jsonb_build_object('state','closed');end if;
 if action='judge_concern' then
 select a.entry_id into member from msrc_competitions.judge_assignments a where a.id=(payload->>'assignmentId')::uuid and a.judge_id=auth.uid() and a.version=(payload->>'expectedVersion')::integer and a.status in('assigned','completed');
 else member:=(payload->>'entryId')::uuid;end if;
 select * into e from msrc_competitions.entries q where q.id=member and q.edition_key=edition and q.kind='hackathon' for update;
 if not found or action<>'judge_concern' and e.version<>(payload->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 if msrc_staff.authorize(edition,required) is null then return jsonb_build_object('state','denied');end if;
 if action='eligibility_flag' then
 if e.status not in('submitted','review') then return jsonb_build_object('state','locked');end if;
 insert into msrc_competitions.hackathon_checks(entry_id,integrity_flag,committee_cleared) values(e.id,true,false) on conflict on constraint hackathon_checks_pkey do update set integrity_flag=true,committee_cleared=false;
 result:=jsonb_build_object('state','updated');
 elsif action='committee_review' then
 if payload->>'resolution' not in('clear','hold') or jsonb_typeof(payload->'integrityFlag') is distinct from 'boolean' then return jsonb_build_object('state','invalid');end if;
 insert into msrc_competitions.hackathon_checks(entry_id,integrity_flag,committee_cleared) values(e.id,(payload->>'integrityFlag')::boolean,payload->>'resolution'='clear') on conflict on constraint hackathon_checks_pkey do update set integrity_flag=excluded.integrity_flag,committee_cleared=excluded.committee_cleared;
 result:=jsonb_build_object('state','updated');
 elsif action='third_review' then
 if e.status not in('submitted','review') or e.eligibility<>'eligible' or not msrc_competitions.stage_ready(cfg.configuration,'hackathon','selection') then return jsonb_build_object('state','closed');end if;
 insert into msrc_competitions.hackathon_checks(entry_id,manual_third_review) values(e.id,true) on conflict on constraint hackathon_checks_pkey do update set manual_third_review=true;result:=jsonb_build_object('state','updated');
 elsif action='roster_change' then
 if e.status in('draft','withdrawn','rejected') or payload->>'change' not in('add','remove') or exists(select 1 from msrc_competitions.outcomes o where o.entry_id=e.id) then return jsonb_build_object('state','locked');end if;
 perform set_config('msrc.hackathon_roster_committee',e.id::text,true);
 if payload->>'change'='remove' then
 delete from msrc_competitions.roster r where r.entry_id=e.id and r.id=(payload->>'memberId')::uuid and not r.is_lead;
 if not found then return jsonb_build_object('state','invalid');end if;
 else
 select u.id into actor from auth.users u join msrc_participant.profiles p on p.actor_id=u.id join msrc_authorization.account_access a on a.actor_id=u.id where lower(u.email)=lower(btrim(payload->>'email')) and u.email_confirmed_at is not null and p.state='verified' and a.state='active' and not coalesce(u.is_anonymous,false);
 if actor is null or not msrc_competitions.profile_complete(edition,actor) then return jsonb_build_object('state','profile_required');end if;
 insert into msrc_competitions.roster(entry_id,actor_id,email) values(e.id,actor,lower(btrim(payload->>'email')));end if;
 update msrc_competitions.hackathon_checks h set finalist_confirmed=false where h.entry_id=e.id;
 result:=jsonb_build_object('state','updated');
 elsif action='withdraw' then
 if e.status<>'accepted' then return jsonb_build_object('state','invalid');end if;
 insert into msrc_competitions.hackathon_checks(entry_id,withdrawn) values(e.id,true) on conflict on constraint hackathon_checks_pkey do update set withdrawn=true,finalist_confirmed=false;
 update msrc_competitions.entries q set status='withdrawn' where q.id=e.id;result:=jsonb_build_object('state','updated');
 elsif action='reserve_offer' then
 if not msrc_competitions.stage_ready(cfg.configuration,'hackathon','selection') or e.status not in('review','reserve') or not msrc_competitions.screening_ready(e.id) then return jsonb_build_object('state','reviews_incomplete');end if;
 select count(*)::integer into used from msrc_competitions.entries q where q.edition_key=edition and q.kind='hackathon' and q.status='accepted' and q.document->>'track'=e.document->>'track';
 if used>=(cfg.configuration->>'finalistCapPerTrack')::integer then return jsonb_build_object('state','full');end if;
 select min(t.rank) into next_rank from msrc_competitions.track_ranking(edition,e.document->>'track',true) t;
 if not exists(select 1 from msrc_competitions.track_ranking(edition,e.document->>'track',true) t where t.entry_id=e.id and t.rank=next_rank) then return jsonb_build_object('state','not_next_reserve');end if;
 -- A tied first reserve requires an explicit, audited committee tie decision.
 if (select count(*) from msrc_competitions.track_ranking(edition,e.document->>'track',true) t where t.rank=next_rank)>1 and not exists(select 1 from msrc_competitions.decisions d where d.entry_id=e.id and length(btrim(coalesce(d.tie_resolution,'')))>0 and d.rank is not null) then return jsonb_build_object('state','tie_required');end if;
 insert into msrc_competitions.decisions(entry_id,entry_version,outcome,reason,rank,tie_resolution,settings_version,review_basis,actor_id) values(e.id,e.version,'accepted',payload->>'reason',next_rank::integer,payload->>'reason',cfg.version,msrc_competitions.review_basis(e.id,e.version),auth.uid()) returning id into decision;
 insert into msrc_competitions.publications(decision_id,actor_id) values(decision,auth.uid());
 update msrc_competitions.entries q set status='accepted' where q.id=e.id;result:=jsonb_build_object('state','selected');
 elsif action='judge_concern' then
 if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,'hackathon','judging') or msrc_competitions.has_conflict(e.id,auth.uid()) or payload->>'category' not in('originality','ethics','privacy','safety') then return jsonb_build_object('state','denied');end if;
 insert into msrc_competitions.judging_concerns(entry_id,judge_id,category,reason) values(e.id,auth.uid(),payload->>'category',payload->>'reason');
 insert into msrc_competitions.hackathon_checks(entry_id,integrity_flag,committee_cleared) values(e.id,true,false) on conflict on constraint hackathon_checks_pkey do update set integrity_flag=true,committee_cleared=false;
 result:=jsonb_build_object('state','updated');
 else return jsonb_build_object('state','invalid');end if;
 perform msrc_competitions.record(edition,'staff.hackathon.'||action,e.id,jsonb_build_object('reason',payload->>'reason','payload',payload,'roster',case when action='roster_change' then (select jsonb_agg(jsonb_build_object('actorId',r.actor_id,'memberId',r.id,'confirmed',r.confirmed) order by r.id) from msrc_competitions.roster r where r.entry_id=e.id) else null end));
 insert into msrc_competitions.operations values(edition,auth.uid(),operation,input,result);return result;
 exception when invalid_text_representation or numeric_value_out_of_range or check_violation or unique_violation then return jsonb_build_object('state','invalid');
end$$;


create or replace function msrc_competitions.packet_valid(packet jsonb,e msrc_competitions.entries) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare identity text;normal text;begin
 if jsonb_typeof(packet) is distinct from 'object' or packet - array['references','links']<>jsonb_build_object('title',packet->'title','pitch',packet->'pitch','narrative',packet->'narrative','track',packet->'track')
 or jsonb_typeof(packet->'title') is distinct from 'string' or jsonb_typeof(packet->'pitch') is distinct from 'string' or jsonb_typeof(packet->'narrative') is distinct from 'string'
 or length(btrim(packet->>'title'))=0 or octet_length(packet::text)>262144 then return false;end if;
 if e.kind='hackathon' and (packet->>'track' is distinct from e.document->>'track' or length(btrim(packet->>'pitch'))=0 or msrc_competitions.word_count(packet->>'pitch')>300 or packet->>'narrative'<>'') then return false;end if;
 if e.kind='three_minute_thesis' and (packet->'track'<>'null'::jsonb or length(btrim(packet->>'narrative'))=0 or packet->>'pitch'<>'') then return false;end if;
 if packet?'references' and jsonb_typeof(packet->'references') is distinct from 'string' then return false;end if;
 if packet?'links' then if jsonb_typeof(packet->'links') is distinct from 'array' or jsonb_array_length(packet->'links')>5 then return false;end if;
 if exists(select 1 from jsonb_array_elements(packet->'links') x where jsonb_typeof(x)<>'string' or (x#>>'{}') !~ '^https://[^[:space:]]+$') then return false;end if;end if;
 normal:=msrc_abstracts.normalized_affiliation(packet::text);
 -- Human sanitation attestation is additionally required; known roster identities cannot occur anywhere in the packet.
 for identity in
 select r.email from msrc_competitions.roster r where r.entry_id=e.id
 union select p.name from msrc_competitions.roster r join msrc_participant.profiles p on p.actor_id=r.actor_id where r.entry_id=e.id
 union select p.phone from msrc_competitions.roster r join msrc_competitions.hackathon_profiles p on p.actor_id=r.actor_id and p.edition_key=e.edition_key where r.entry_id=e.id
 union select p.university from msrc_competitions.roster r join msrc_competitions.hackathon_profiles p on p.actor_id=r.actor_id and p.edition_key=e.edition_key where r.entry_id=e.id
 union select e.document->>'presenter' where e.kind='three_minute_thesis'
 union select e.document->>'affiliation' where e.kind='three_minute_thesis' loop
 if length(msrc_abstracts.normalized_affiliation(identity))>0 and position(msrc_abstracts.normalized_affiliation(identity) in normal)>0 then return false;end if;end loop;
 return true;
end$$;

create or replace function public.msrc_staff_competitions_data(edition_key text,competition_type text,view text,entry_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_competitions.settings%rowtype;result jsonb;reviewer text;committee boolean;begin
 perform msrc_competitions.guard();
 if competition_type is null or competition_type not in('hackathon','three_minute_thesis') then return jsonb_build_object('state','invalid');end if;
 reviewer:=msrc_competitions.reviewer_role(competition_type);
 select * into cfg from msrc_competitions.settings s where s.edition_key=edition_key and s.kind=competition_type;
 if view='settings' then
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin','judgingCommittee'],false) is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready','version',coalesce(cfg.version,0),'settings',coalesce(cfg.configuration,case when competition_type='hackathon' then msrc_competitions.hackathon_defaults() else msrc_competitions.settings_defaults() end),'enabled',coalesce(cfg.enabled,false),'evidenceReady',coalesce(cfg.evidence_ready,false),'stageStates',msrc_competitions.stage_states(coalesce(cfg.configuration,msrc_competitions.settings_defaults()),competition_type,coalesce(cfg.enabled,false) and coalesce(cfg.evidence_ready,false)));
 elsif view='eligibility' and competition_type='hackathon' then
 if msrc_staff.authorize(edition_key,array['registrationWorkshopAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'status',e.status,'track',e.document->>'track','version',e.version,'title',e.document->>'title','document',e.document,'eligibility',e.eligibility,'assignedCount',null,'completedCount',null,'files','[]'::jsonb,'outcome',null,'framework',msrc_competitions.framework_projection(e),
 'roster',(select coalesce(jsonb_agg(jsonb_build_object('id',r.actor_id,'memberId',r.id,'email',r.email,'isLead',r.is_lead,'confirmed',r.confirmed,'profile',msrc_competitions.profile_projection(edition_key,r.actor_id)) order by r.is_lead desc,r.id),'[]'::jsonb) from msrc_competitions.roster r where r.entry_id=e.id)) order by e.created_at,e.id),'[]'::jsonb) into result from msrc_competitions.entries e where e.edition_key=edition_key and e.kind='hackathon' and e.status<>'draft';
 return jsonb_build_object('state','ready','entries',result);
 elsif view in('list','export') then
 committee:=msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null;
 if committee and (view='export' or msrc_staff.authorize(edition_key,array['judgingCommittee'],false) is null) then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'kind',e.kind,'status',e.status,'version',e.version,'title',e.document->>'title','track',e.document->>'track','document',e.document,'eligibility',e.eligibility,
 'assignedCount',case when committee then 0 else (select count(*) from msrc_competitions.assignments a where a.entry_id=e.id and a.entry_version=e.version and a.status in('assigned','completed') and not msrc_competitions.has_conflict(e.id,a.reviewer_id)) end,
 'completedCount',case when committee then 0 else jsonb_array_length(msrc_competitions.review_basis(e.id,e.version)) end,
 'roster',(select coalesce(jsonb_agg(jsonb_build_object('id',r.actor_id,'memberId',r.id,'email',case when committee and competition_type='hackathon' then '' else r.email end,'isLead',r.is_lead,'confirmed',r.confirmed) order by r.is_lead desc,r.id),'[]'::jsonb) from msrc_competitions.roster r where r.entry_id=e.id),
 'framework',case when competition_type='hackathon' then msrc_competitions.framework_projection(e)||case when committee then jsonb_build_object('screeningAverage',null,'reserveRank',null,'thirdReviewRequired',false) else '{}'::jsonb end else null end,'files',msrc_competitions.projection(e)->'files','outcome',(select o.outcome from msrc_competitions.outcomes o where o.entry_id=e.id),
 'rank',case when committee then null else (select d.rank from msrc_competitions.decisions d where d.entry_id=e.id order by d.created_at desc,d.id desc limit 1) end)
 ||case when committee then '{}'::jsonb else jsonb_build_object('decision',(select jsonb_build_object('id',d.id,'outcome',d.outcome,'rank',d.rank,'tieResolution',d.tie_resolution,'reason',d.reason,'published',exists(select 1 from msrc_competitions.publications p where p.decision_id=d.id)) from msrc_competitions.decisions d where d.entry_id=e.id order by d.created_at desc,d.id desc limit 1)) end
 ||case when committee then '{}'::jsonb else jsonb_build_object('reviewBasis',msrc_competitions.review_basis(e.id,e.version)) end order by e.created_at,e.id),'[]'::jsonb) into result from msrc_competitions.entries e where e.edition_key=edition_key and e.kind=competition_type and e.status<>'draft' and (not committee or e.status='accepted' or competition_type='hackathon');
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

create or replace function public.msrc_staff_competitions_mutate(edition_key text,competition_type text,action text,payload jsonb,operation_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare cfg msrc_competitions.settings%rowtype;e msrc_competitions.entries%rowtype;a msrc_competitions.assignments%rowtype;j msrc_competitions.judge_assignments%rowtype;decision msrc_competitions.decisions%rowtype;
 old msrc_competitions.operations%rowtype;input bytea;result jsonb;required text[];reviewer text;entry uuid;actor uuid;rubric jsonb;basis jsonb;outcome text;judge uuid;cap integer;used integer;begin
 perform msrc_competitions.guard();
 if competition_type='hackathon' and action in('committee_review','eligibility_flag','third_review','roster_change','withdraw','reserve_offer','judge_concern') then return msrc_competitions.framework_mutate(edition_key,action,payload,operation_id);end if;
 if competition_type is null or competition_type not in('hackathon','three_minute_thesis') or action is null or operation_id is null or jsonb_typeof(payload) is distinct from 'object' or octet_length(payload::text)>262144 then return jsonb_build_object('state','invalid');end if;
 if action not in('affiliations','file_read') and (jsonb_typeof(payload->'expectedVersion') is distinct from 'number' or coalesce(payload->>'expectedVersion','')!~'^[0-9]{1,9}$') then return jsonb_build_object('state','invalid');end if;
 reviewer:=msrc_competitions.reviewer_role(competition_type);
 required:=case when action='settings' then array['superAdmin'] when action='eligibility' and competition_type='hackathon' then array['registrationWorkshopAdministrator','superAdmin'] when action in('review','conflict','affiliations') then array[reviewer]
 when action in('judge','judge_conflict') then array['facultyJudge'] when action='file_read' then array['scientificAdministrator','superAdmin','judgingCommittee','facultyJudge','registrationWorkshopAdministrator'] when action in('panel','activity','outcome') then array['scientificAdministrator','superAdmin','judgingCommittee'] else array['scientificAdministrator','superAdmin'] end;
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
 if competition_type='hackathon' and exists(select 1 from msrc_competitions.files f where f.id=(payload->>'fileId')::uuid and f.entry_id=e.id and f.stage='proof') then
 if not cfg.files_ready then return jsonb_build_object('state','closed');end if;
 if msrc_staff.authorize(edition_key,array['registrationWorkshopAdministrator','superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select jsonb_build_object('state','ready','bucket','msrc-competition-files','path',f.object_path,'fileId',f.id) into result from msrc_competitions.files f where f.id=(payload->>'fileId')::uuid and f.entry_id=e.id and f.state='clean';
 if result is null then return jsonb_build_object('state','unavailable');end if;
 perform msrc_competitions.record(edition_key,'staff.proof_read',e.id,jsonb_build_object('fileId',payload->>'fileId'));return result;end if;
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
 if competition_type='hackathon' and not msrc_competitions.administrative_ready(e.id) then return jsonb_build_object('state','committee_review_required');end if;
 if not msrc_competitions.stage_ready(cfg.configuration,competition_type,'selection') or clock_timestamp()>=(cfg.configuration->>'reviewDeadline')::timestamptz then return jsonb_build_object('state','closed');end if;
 actor:=(payload->>'reviewerId')::uuid;
 if e.status not in('submitted','review') or e.eligibility<>'eligible' or not exists(select 1 from msrc_competitions.packets p where p.entry_id=e.id and p.entry_version=e.version) then return jsonb_build_object('state','packet_required');end if;
 if not msrc_competitions.eligible_staff(edition_key,actor,array[reviewer]) or not exists(select 1 from msrc_competitions.reviewer_profiles p where p.edition_key=edition_key and p.actor_id=actor) then return jsonb_build_object('state','denied');end if;
 if msrc_competitions.has_conflict(e.id,actor) then return jsonb_build_object('state','coi');end if;
 if exists(select 1 from msrc_competitions.assignments q where q.entry_id=e.id and q.entry_version=e.version and q.reviewer_id=actor) then return jsonb_build_object('state','duplicate');end if;
 if (select count(*) from msrc_competitions.assignments q where q.entry_id=e.id and q.entry_version=e.version and q.status in('assigned','completed') and not msrc_competitions.has_conflict(e.id,q.reviewer_id))>=(case when competition_type='hackathon' then case when msrc_competitions.third_review_required(e.id) then 3 else 2 end else (cfg.configuration->>'minimumReviews')::integer end) then return jsonb_build_object('state','full');end if;
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
 if coalesce(payload->>'outcome','') not in('accept','reject','reserve') or length(btrim(coalesce(payload->>'reason','')))=0 then return jsonb_build_object('state','invalid');end if;
 if payload->>'outcome'='accept' and (jsonb_typeof(payload->'rank') is distinct from 'number' or coalesce(payload->>'rank','')!~'^[1-9][0-9]{0,8}$' or length(btrim(coalesce(payload->>'tieResolution','')))=0) then return jsonb_build_object('state','invalid');end if;
 basis:=msrc_competitions.review_basis(e.id,e.version);
 if jsonb_array_length(basis)<(cfg.configuration->>'minimumReviews')::integer or competition_type='hackathon' and not msrc_competitions.screening_ready(e.id) then return jsonb_build_object('state','reviews_incomplete');end if;
 if competition_type='hackathon' and payload->>'outcome'='accept' then
 if not exists(select 1 from msrc_competitions.track_ranking(edition_key,e.document->>'track',false) t where t.entry_id=e.id and t.rank<=(cfg.configuration->>'finalistCapPerTrack')::integer) then return jsonb_build_object('state','not_next_reserve');end if;end if;
 outcome:=case payload->>'outcome' when 'accept' then 'accepted' when 'reserve' then 'reserve' else 'rejected' end;
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
 if true then
 select count(*)::integer into used from msrc_competitions.entries q where q.edition_key=edition_key and q.kind=competition_type and q.status='accepted' and q.document->>'track'=e.document->>'track' ;
 if used>=cap then return jsonb_build_object('state','full');end if;end if;end if;

 insert into msrc_competitions.publications(decision_id,actor_id) values(decision.id,auth.uid());
 update msrc_competitions.entries q set status=outcome where q.id=e.id;result:=jsonb_build_object('state','selected');
 elsif action='panel' then
 if e.status<>'accepted' or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'judging') or not msrc_competitions.stage_ready(cfg.configuration,competition_type,'final_material') then return jsonb_build_object('state','closed');end if;
 if competition_type='hackathon' and (not cfg.files_ready or not exists(select 1 from msrc_competitions.files f where f.entry_id=e.id and f.stage='final' and f.state='clean') or not coalesce((select h.finalist_confirmed from msrc_competitions.hackathon_checks h where h.entry_id=e.id),false)
 or exists(select 1 from msrc_competitions.judge_assignments ja join msrc_competitions.entries q on q.id=ja.entry_id where q.edition_key=edition_key and q.kind='hackathon' and q.document->>'track'<>e.document->>'track' and ja.judge_id::text in(select jsonb_array_elements_text(payload->'judgeIds')))) then return jsonb_build_object('state','panel_gate');end if;
 if jsonb_typeof(payload->'judgeIds') is distinct from 'array' or jsonb_array_length(payload->'judgeIds')<>(cfg.configuration->>'judgeCount')::integer then return jsonb_build_object('state','invalid');end if;
 if (select count(*)<>count(distinct x) from jsonb_array_elements_text(payload->'judgeIds') x) then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_competitions.judge_assignments q where q.entry_id=e.id) then return jsonb_build_object('state','locked');end if;
 if exists(select 1 from msrc_competitions.files f where f.entry_id=e.id and f.stage<>'proof' and f.state<>'clean') then return jsonb_build_object('state','evidence_gate');end if;
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
 if competition_type='hackathon' then
 if payload->>'outcome' not in('winner','finalist') then return jsonb_build_object('state','invalid');end if;
 if coalesce((select h.integrity_flag and not h.committee_cleared from msrc_competitions.hackathon_checks h where h.entry_id=e.id),false) then return jsonb_build_object('state','committee_review_required');end if;
 if payload->>'outcome'='winner' and exists(select 1 from msrc_competitions.outcomes o join msrc_competitions.entries q on q.id=o.entry_id where q.edition_key=edition_key and q.kind='hackathon' and q.document->>'track'=e.document->>'track' and o.outcome='winner') then return jsonb_build_object('state','full');end if;end if;
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

-- Only display labels and scope descriptions may cross the anonymous page boundary.
-- The server performs this read with a server-only key; no workflow configuration is exposed.
create function public.msrc_competitions_public_tracks(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb;begin
 perform msrc_competitions.guard();perform msrc_registration.server_only();
 select s.configuration into c from msrc_competitions.settings s where s.edition_key=msrc_competitions_public_tracks.edition_key and s.kind='hackathon';
 c:=coalesce(c,msrc_competitions.hackathon_defaults());
 return jsonb_build_object('translating_research',jsonb_build_object('label',coalesce(nullif(c->'trackLabels','null'::jsonb),msrc_competitions.hackathon_defaults()->'trackLabels')->'translating_research','description',coalesce(nullif(c->'trackDescriptions','null'::jsonb),msrc_competitions.hackathon_defaults()->'trackDescriptions')->'translating_research'),
 'advancing_research',jsonb_build_object('label',coalesce(nullif(c->'trackLabels','null'::jsonb),msrc_competitions.hackathon_defaults()->'trackLabels')->'advancing_research','description',coalesce(nullif(c->'trackDescriptions','null'::jsonb),msrc_competitions.hackathon_defaults()->'trackDescriptions')->'advancing_research'));
end$$;
revoke all on all tables in schema msrc_competitions from public,anon,authenticated,service_role;
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
