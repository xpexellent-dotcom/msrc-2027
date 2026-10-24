-- ENG-075; CRT-01..06, AT-14. Review only. No settings, questions or activation seeds.
begin;
create schema msrc_certificates;
revoke all on schema msrc_certificates from public,anon,authenticated,service_role;
alter default privileges in schema msrc_certificates revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema msrc_certificates revoke execute on functions from public,anon,authenticated,service_role;

create table msrc_certificates.settings (
 edition_key text primary key references msrc_authorization.edition_config(edition_key) on delete restrict,
 enabled boolean not null default false,surveys_enabled boolean not null default false,
 unlinking_approved boolean not null default false,
 feedback_retention_days integer check(feedback_retention_days between 1 and 3650),
 download_retention_days integer check(download_retention_days between 1 and 3650),
 verification_retention_days integer check(verification_retention_days between 1 and 36500)
);
create table msrc_certificates.surveys (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_certificates.settings(edition_key) on delete restrict,
 kind text not null check(kind in('conference','workshop')),workshop_id uuid references msrc_workshops.workshops(id) on delete restrict,
 title_en text not null check(char_length(btrim(title_en)) between 1 and 200),title_ar text not null check(char_length(btrim(title_ar)) between 1 and 200),
 version integer not null default 1 check(version>0),published boolean not null default false,deadline timestamptz,
 questions jsonb not null default '[]'::jsonb check(jsonb_typeof(questions)='array' and jsonb_array_length(questions)<=40),
 check((kind='conference' and workshop_id is null) or (kind='workshop' and workshop_id is not null)),check(deadline is null or isfinite(deadline))
);
create unique index certificate_general_survey on msrc_certificates.surveys(edition_key) where kind='conference';
create unique index certificate_workshop_survey on msrc_certificates.surveys(workshop_id) where kind='workshop';
-- S2: only categorical survey/question identifiers, a value and a coarse date.
-- Deliberately no response ID, account FK, request/operation key, sequence, token,
-- actor, IP, precise timestamp or grouping key. No FK path from this table to actors.
create table msrc_certificates.answers (
 survey_id uuid not null,question_id text not null,value jsonb not null,answer_date date not null default (clock_timestamp() at time zone 'Asia/Riyadh')::date,
 check(jsonb_typeof(value) in('string','number')),check(isfinite(answer_date))
);
create index certificate_answers_survey on msrc_certificates.answers(survey_id,question_id,answer_date);
-- Completion has neither response IDs nor timestamps; retries use actor+survey only.
create table msrc_certificates.completions (
 survey_id uuid not null references msrc_certificates.surveys(id) on delete restrict,
 actor_id uuid not null references msrc_participant.profiles(actor_id) on delete restrict,
 primary key(survey_id,actor_id)
);
create table msrc_certificates.templates (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_certificates.settings(edition_key) on delete restrict,
 kind text not null check(kind in('conference','workshop')),version integer not null default 1 check(version>0),
 title_en text not null,title_ar text not null,signature text,
 approved boolean not null default false,approved_by uuid,approved_at timestamptz,
 unique(edition_key,kind),check(char_length(btrim(title_en)) between 1 and 200),check(char_length(btrim(title_ar)) between 1 and 200),
 check(signature is null or char_length(btrim(signature)) between 1 and 200),
 check((not approved and approved_by is null and approved_at is null) or (approved and approved_by is not null and approved_at is not null and signature is not null))
);
create table msrc_certificates.batches (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_certificates.settings(edition_key) on delete restrict,
 template_id uuid not null references msrc_certificates.templates(id) on delete restrict,workshop_id uuid,
 released_by uuid not null,released_at timestamptz not null default clock_timestamp(),template_snapshot jsonb not null
);
create table msrc_certificates.certificates (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_certificates.settings(edition_key) on delete restrict,
 actor_id uuid not null references msrc_participant.profiles(actor_id) on delete restrict,
 batch_id uuid not null references msrc_certificates.batches(id) on delete restrict,
 kind text not null check(kind in('conference','workshop')),workshop_id uuid,recipient_name text not null,
 certificate_type text not null,edition text not null,activity text not null,signature text not null,
 code text not null unique default (replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')) check(code~'^[a-f0-9]{64}$'),
 status text not null default 'pending' check(status in('pending','issued','revoked','replaced')),
 replaces_id uuid unique references msrc_certificates.certificates(id) on delete restrict,
 issued_at timestamptz,pdf bytea,download_until timestamptz,verify_until timestamptz,
 worker_id uuid,lease_token uuid,lease_until timestamptz,
 check((kind='conference' and workshop_id is null) or (kind='workshop' and workshop_id is not null)),
 check(pdf is null or (octet_length(pdf) between 8 and 1048576 and substring(pdf from 1 for 5)=convert_to('%PDF-','UTF8'))),
 check(status<>'issued' or (issued_at is not null and download_until is not null and verify_until is not null)),
 check((worker_id is null and lease_token is null and lease_until is null) or (worker_id is not null and lease_token is not null and lease_until is not null))
);
create unique index certificate_current_conference on msrc_certificates.certificates(edition_key,actor_id) where kind='conference' and status in('pending','issued');
create unique index certificate_current_workshop on msrc_certificates.certificates(workshop_id,actor_id) where kind='workshop' and status in('pending','issued');
create index certificate_actor on msrc_certificates.certificates(edition_key,actor_id);
create index certificate_generation_due on msrc_certificates.certificates(lease_until,id) where status='pending';
create table msrc_certificates.corrections (
 id uuid primary key default gen_random_uuid(),certificate_id uuid not null references msrc_certificates.certificates(id) on delete restrict,
 requested_name text not null check(char_length(btrim(requested_name)) between 1 and 120 and requested_name !~ '[[:cntrl:]]'),
 status text not null default 'pending' check(status in('pending','approved','rejected')),decided_by uuid,reason text,
 check((status='pending' and decided_by is null) or (status<>'pending' and decided_by is not null and reason is not null))
);
create unique index certificate_pending_correction on msrc_certificates.corrections(certificate_id) where status='pending';
create table msrc_certificates.operations (
 edition_key text not null,actor_id uuid not null,operation_id uuid not null,input_hash bytea not null,result jsonb not null,
 primary key(edition_key,actor_id,operation_id)
);
create table msrc_certificates.audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,certificate_id uuid,performer_id uuid,session_id uuid,
 event text not null,reason text,snapshot jsonb not null default '{}'::jsonb,occurred_at timestamptz not null default clock_timestamp()
);
create table msrc_certificates.verify_limits (
 key_hash text primary key check(key_hash~'^[a-f0-9]{64}$'),window_start timestamptz not null,attempts integer not null check(attempts between 1 and 31)
);
do $$declare t text;begin foreach t in array array['settings','surveys','answers','completions','templates','batches','certificates','corrections','operations','audit','verify_limits'] loop
 execute format('alter table msrc_certificates.%I enable row level security',t);
 execute format('alter table msrc_certificates.%I force row level security',t);
 if t in('batches','operations','audit') then
 execute format('create trigger certificate_append_only before insert or update or delete on msrc_certificates.%I for each row execute function msrc_staff.audit_immutable()',t);
 execute format('create trigger certificate_no_truncate before truncate on msrc_certificates.%I for each statement execute function msrc_staff.audit_immutable()',t);
 end if;end loop;end$$;
revoke all on all tables in schema msrc_certificates from public,anon,authenticated,service_role;
comment on table msrc_certificates.answers is 'CRT-02 S2 unlinked per-question feedback. No retained response grouping, actor mapping, request key or precise timestamp. Never log submission arguments or response bodies. Free text can self-identify; warn and reject detected identifiers before activation.';
comment on schema msrc_certificates is 'CRT-01..06 ordinary conference/workshop only. Role/competition certificates require separately approved evidence rules and release paths; no hours field or accreditation claim.';

create function msrc_certificates.guard(edition_key text) returns void language plpgsql security definer set search_path='' as $$begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Certificates require READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 perform 1 from msrc_registration.settings s where s.edition_key=$1 for update;
 perform pg_advisory_xact_lock(hashtextextended('workshops-edition:'||edition_key,0));
 perform pg_advisory_xact_lock(hashtextextended('certificates-edition:'||edition_key,0));
 perform 1 from msrc_certificates.settings s where s.edition_key=$1 for update;
end$$;
create function msrc_certificates.record(edition_key text,certificate_id uuid,event_name text,reason_text text default null,snapshot jsonb default '{}'::jsonb)
 returns void language sql security definer set search_path='' as $$
 insert into msrc_certificates.audit(edition_key,certificate_id,performer_id,session_id,event,reason,snapshot)
 values($1,$2,auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,event_name,reason_text,snapshot);
$$;
create function msrc_certificates.ready(edition_key text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select s.enabled and s.unlinking_approved and s.feedback_retention_days is not null and s.download_retention_days is not null
 and s.verification_retention_days is not null from msrc_certificates.settings s where s.edition_key=$1),false) and msrc_participant.ready();
$$;
create function msrc_certificates.questions_valid(questions jsonb) returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare q jsonb;o jsonb;ids text[]:='{}'::text[];option_ids text[];begin
 if jsonb_typeof(questions) is distinct from 'array' or jsonb_array_length(questions)>40 then return false;end if;
 for q in select value from jsonb_array_elements(questions) loop
 if jsonb_typeof(q)<>'object' or coalesce(q->>'id','') !~ '^[A-Za-z0-9_-]{1,64}$' or (q->>'id')=any(ids)
 or coalesce(q->>'type','') not in('rating_scale','single_choice','short_text') or jsonb_typeof(q->'required') is distinct from 'boolean'
 or coalesce(char_length(btrim(q->>'labelEn')),0) not between 1 and 500 or coalesce(char_length(btrim(q->>'labelAr')),0) not between 1 and 500
 or q - array['id','type','labelEn','labelAr','required','scaleMin','scaleMax','options']<>'{}'::jsonb then return false;end if;
 ids:=array_append(ids,q->>'id');
 if q->>'type'='rating_scale' then
 if q-array['id','type','labelEn','labelAr','required','scaleMin','scaleMax']<>'{}'::jsonb
 or coalesce(q->>'scaleMin','') !~ '^[0-9]{1,3}$' or coalesce(q->>'scaleMax','') !~ '^[0-9]{1,3}$'
 or (q->>'scaleMin')::integer>=(q->>'scaleMax')::integer or (q->>'scaleMax')::integer>100 then return false;end if;
 elsif q->>'type'='single_choice' then
 if q-array['id','type','labelEn','labelAr','required','options']<>'{}'::jsonb or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options') not between 2 and 20 then return false;end if;
 option_ids:='{}'::text[];
 for o in select value from jsonb_array_elements(q->'options') loop
 if coalesce(o->>'value','') !~ '^[A-Za-z0-9_-]{1,64}$' or (o->>'value')=any(option_ids)
 or coalesce(char_length(btrim(o->>'labelEn')),0) not between 1 and 200 or coalesce(char_length(btrim(o->>'labelAr')),0) not between 1 and 200
 or o-array['value','labelEn','labelAr']<>'{}'::jsonb then return false;end if;
 option_ids:=array_append(option_ids,o->>'value');end loop;
 elsif q-array['id','type','labelEn','labelAr','required']<>'{}'::jsonb then return false;
 end if;end loop;return true;
end$$;
create function msrc_certificates.eligibility(edition_key text,actor_id uuid,kind text,workshop_id uuid default null) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare reasons text[]:='{}'::text[];days date[];evidence jsonb;survey uuid;activity text;recipient text;begin
 select p.name into recipient from msrc_participant.profiles p where p.actor_id=$2;
 if not exists(select 1 from msrc_authorization.account_access a join auth.users u on u.id=a.actor_id join msrc_participant.profiles p on p.actor_id=a.actor_id
 where a.actor_id=$2 and a.state='active' and p.state='verified' and u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false)
 and (u.banned_until is null or u.banned_until<=clock_timestamp()) and msrc_participant.age_proven($2) and msrc_participant.participant_only($2)) then
 reasons:=array_append(reasons,'configuration_required');end if;
 if kind='conference' then
 activity:='Full Two-Day Conference Attendance';
 select s.conference_days into days from msrc_registration.settings s where s.edition_key=$1;
 if cardinality(days) is distinct from 2 then reasons:=array_append(reasons,'configuration_required');
 elsif (select count(distinct a.conference_day) from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
 join msrc_registration.requests r on r.id=t.request_id where r.edition_key=$1 and r.actor_id=$2 and t.status<>'revoked'
 and r.status in('approved','confirmed') and a.undone_at is null and a.conference_day=any(days)
 and (r.status='confirmed' or exists(select 1 from msrc_registration.settings s where s.edition_key=$1 and s.payment_required=false)))<>2 then
 reasons:=array_append(reasons,'both_days_required');end if;
 select s.id into survey from msrc_certificates.surveys s where s.edition_key=$1 and s.kind='conference';
 if not exists(select 1 from msrc_certificates.completions c where c.survey_id=survey and c.actor_id=$2) then reasons:=array_append(reasons,'general_survey_required');end if;
 elsif kind='workshop' then
 select w.title_en into activity from msrc_workshops.workshops w where w.id=$4 and w.edition_key=$1;
 evidence:=msrc_workshops.completion_evidence($1,$2,$4);
 if coalesce((evidence->>'bookingConfirmed')::boolean,false)=false then reasons:=array_append(reasons,'confirmed_booking_required');end if;
 if evidence->>'checkedInAt' is null then reasons:=array_append(reasons,'workshop_checkin_required');end if;
 if evidence->>'completedAt' is null then reasons:=array_append(reasons,'workshop_completion_required');end if;
 if coalesce((evidence->>'conflict')::boolean,false) or activity is null or exists(select 1 from msrc_workshops.workshops w where w.id=$4 and w.removed) then reasons:=array_append(reasons,'configuration_required');end if;
 select s.id into survey from msrc_certificates.surveys s where s.workshop_id=$4 and s.edition_key=$1;
 if not exists(select 1 from msrc_certificates.completions c where c.survey_id=survey and c.actor_id=$2) then reasons:=array_append(reasons,'workshop_survey_required');end if;
 else reasons:=array_append(reasons,'configuration_required');end if;
 return jsonb_build_object('actorId',actor_id,'recipientName',recipient,'kind',kind,'workshopId',workshop_id,'activity',coalesce(activity,''),'eligible',cardinality(reasons)=0,'reasons',to_jsonb(reasons));
end$$;
create function msrc_certificates.survey_projection(s msrc_certificates.surveys) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',s.id,'kind',s.kind,'workshopId',s.workshop_id,'titleEn',s.title_en,'titleAr',s.title_ar,
 'version',s.version,'published',s.published,'deadline',s.deadline,'questions',s.questions,
 'completionCount',(select count(*) from msrc_certificates.completions c where c.survey_id=s.id));
$$;
create function msrc_certificates.certificate_projection(c msrc_certificates.certificates) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',c.id,'recipientName',c.recipient_name,'kind',c.kind,'activity',c.activity,'edition',c.edition,'status',c.status,'code',c.code,
 'correction',(select jsonb_build_object('id',r.id,'requestedName',r.requested_name,'status',r.status) from msrc_certificates.corrections r where r.certificate_id=c.id order by (r.status='pending') desc,r.id limit 1));
$$;
create function msrc_certificates.projection(edition_key text,actor_id uuid default null) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('state','ready','settings',coalesce((select jsonb_build_object('enabled',s.enabled,'surveysEnabled',s.surveys_enabled,'unlinkingApproved',s.unlinking_approved,
 'feedbackRetentionDays',s.feedback_retention_days,'downloadRetentionDays',s.download_retention_days,'verificationRetentionDays',s.verification_retention_days)
 from msrc_certificates.settings s where s.edition_key=$1),jsonb_build_object('enabled',false,'surveysEnabled',false,'unlinkingApproved',false,'feedbackRetentionDays',null,'downloadRetentionDays',null,'verificationRetentionDays',null)),
 'surveys',coalesce((select jsonb_agg(case when $2 is null then msrc_certificates.survey_projection(s) else (msrc_certificates.survey_projection(s)-'completionCount')||jsonb_build_object('completed',exists(select 1 from msrc_certificates.completions c where c.survey_id=s.id and c.actor_id=$2)) end order by s.kind,s.id)
 from msrc_certificates.surveys s where s.edition_key=$1 and ($2 is null or s.published)),'[]'::jsonb),
 'templates',case when $2 is null then coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'kind',t.kind,'titleEn',t.title_en,'titleAr',t.title_ar,'signature',coalesce(t.signature,''),'approved',t.approved,'version',t.version) order by t.kind)
 from msrc_certificates.templates t where t.edition_key=$1),'[]'::jsonb) else '[]'::jsonb end,
 'eligibility',coalesce((select jsonb_agg(case when $2 is null then e.value else e.value-'actorId' end order by p.actor_id,e.value->>'kind',e.value->>'workshopId') from msrc_participant.profiles p
 cross join lateral (select msrc_certificates.eligibility($1,p.actor_id,'conference',null) value
 union all select msrc_certificates.eligibility($1,p.actor_id,'workshop',b.workshop_id) from msrc_workshops.bookings b join msrc_workshops.workshops w on w.id=b.workshop_id where b.actor_id=p.actor_id and w.edition_key=$1) e
 where ($2 is null or p.actor_id=$2) and ($2 is not null or exists(select 1 from msrc_registration.requests r where r.actor_id=p.actor_id and r.edition_key=$1) or exists(select 1 from msrc_workshops.bookings b join msrc_workshops.workshops w on w.id=b.workshop_id where b.actor_id=p.actor_id and w.edition_key=$1))
 and ($2 is not null or not exists(select 1 from msrc_certificates.certificates c where c.edition_key=$1 and c.actor_id=p.actor_id
 and c.kind=e.value->>'kind' and c.workshop_id is not distinct from nullif(e.value->>'workshopId','')::uuid and c.status in('pending','issued')))),'[]'::jsonb),
 'certificates',coalesce((select jsonb_agg(msrc_certificates.certificate_projection(c) order by c.id) from msrc_certificates.certificates c where c.edition_key=$1 and ($2 is null or c.actor_id=$2)),'[]'::jsonb),
 'workshops',case when $2 is null then coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'titleEn',w.title_en,'titleAr',w.title_ar) order by w.id) from msrc_workshops.workshops w where w.edition_key=$1 and not w.removed),'[]'::jsonb) else '[]'::jsonb end);
$$;
create function public.msrc_staff_certificates_read(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_certificates.guard(edition_key);
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 return msrc_certificates.projection(edition_key);
end$$;

create function msrc_certificates.staff_manage(edition_key text,input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare action text:=input->>'action';sa boolean;op uuid;digest bytea;cached msrc_certificates.operations%rowtype;result jsonb;
 fields jsonb;s msrc_certificates.surveys%rowtype;t msrc_certificates.templates%rowtype;c msrc_certificates.certificates%rowtype;
 correction msrc_certificates.corrections%rowtype;batch uuid;workshop uuid;candidate record;e jsonb;count integer:=0;reason text:=nullif(btrim(input->>'reason'),'');begin
 perform msrc_certificates.guard(edition_key);
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then return jsonb_build_object('state','denied');end if;
 sa:=msrc_staff.authorize(edition_key,array['superAdmin'],false) is not null;
 if action in('settings','saveTemplate','approveTemplate','release','approveCorrection') and not sa then return jsonb_build_object('state','denied');end if;
 if coalesce(input->>'operationId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return jsonb_build_object('state','invalid');end if;
 op:=(input->>'operationId')::uuid;digest:=sha256(convert_to(input::text,'UTF8'));
 select * into cached from msrc_certificates.operations o where o.edition_key=$1 and o.actor_id=auth.uid() and o.operation_id=op;
 if cached.operation_id is not null then return case when cached.input_hash=digest then cached.result else jsonb_build_object('state','conflict') end;end if;
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator']) is null then return jsonb_build_object('state','denied');end if;
 insert into msrc_certificates.settings(edition_key) values(edition_key) on conflict on constraint settings_pkey do nothing;
 if action='settings' then
 fields:=input->'settings';
 -- Staff preparation cannot activate either closed workflow; activation is a separate owner gate.
 if coalesce((fields->>'enabled')::boolean,false) or coalesce((fields->>'surveysEnabled')::boolean,false) then return jsonb_build_object('state','closed');end if;
 update msrc_certificates.settings x set enabled=false,surveys_enabled=false,unlinking_approved=coalesce((fields->>'unlinkingApproved')::boolean,false),
 feedback_retention_days=(fields->>'feedbackRetentionDays')::integer,download_retention_days=(fields->>'downloadRetentionDays')::integer,
 verification_retention_days=(fields->>'verificationRetentionDays')::integer where x.edition_key=$1;
 result:=jsonb_build_object('state','saved');
 elsif action='saveSurvey' then
 fields:=input->'survey';
 if fields->>'kind' not in('conference','workshop') or not msrc_certificates.questions_valid(fields->'questions') then return jsonb_build_object('state','invalid');end if;
 workshop:=nullif(fields->>'workshopId','')::uuid;
 if fields->>'kind'='workshop' and not exists(select 1 from msrc_workshops.workshops w where w.id=workshop and w.edition_key=$1 and not w.removed) then return jsonb_build_object('state','invalid');end if;
 select * into s from msrc_certificates.surveys x where x.id=nullif(fields->>'id','')::uuid and x.edition_key=$1 for update;
 if s.id is null and coalesce((fields->>'version')::integer,0)<>0 then return jsonb_build_object('state','conflict');end if;
 if s.id is not null and (s.version<>(fields->>'version')::integer or exists(select 1 from msrc_certificates.completions x where x.survey_id=s.id)) then return jsonb_build_object('state','conflict');end if;
 if coalesce((fields->>'published')::boolean,false) and (jsonb_array_length(fields->'questions')=0 or fields->>'deadline' is null) then return jsonb_build_object('state','invalid');end if;
 if s.id is null then
 insert into msrc_certificates.surveys(edition_key,kind,workshop_id,title_en,title_ar,questions,published,deadline)
 values(edition_key,fields->>'kind',workshop,fields->>'titleEn',fields->>'titleAr',fields->'questions',coalesce((fields->>'published')::boolean,false),(fields->>'deadline')::timestamptz) returning * into s;
 else
 if s.kind<>fields->>'kind' or s.workshop_id is distinct from workshop then return jsonb_build_object('state','invalid');end if;
 update msrc_certificates.surveys x set title_en=fields->>'titleEn',title_ar=fields->>'titleAr',questions=fields->'questions',published=coalesce((fields->>'published')::boolean,false),deadline=(fields->>'deadline')::timestamptz,version=x.version+1 where x.id=s.id returning * into s;
 end if;result:=jsonb_build_object('state','saved','surveyId',s.id);
 elsif action='saveTemplate' then
 fields:=input->'template';if fields->>'kind' not in('conference','workshop') then return jsonb_build_object('state','invalid');end if;
 select * into t from msrc_certificates.templates x where x.id=nullif(fields->>'id','')::uuid and x.edition_key=$1 for update;
 if t.id is null and coalesce((fields->>'version')::integer,0)<>0 then return jsonb_build_object('state','conflict');end if;
 if t.id is not null and (t.version<>(fields->>'version')::integer or t.kind<>fields->>'kind') then return jsonb_build_object('state','conflict');end if;
 if t.id is null then insert into msrc_certificates.templates(edition_key,kind,title_en,title_ar,signature)
 values(edition_key,fields->>'kind',fields->>'titleEn',fields->>'titleAr',nullif(btrim(fields->>'signature'),'')) returning * into t;
 else update msrc_certificates.templates x set title_en=fields->>'titleEn',title_ar=fields->>'titleAr',signature=nullif(btrim(fields->>'signature'),''),version=x.version+1,approved=false,approved_at=null,approved_by=null where x.id=t.id returning * into t;end if;
 result:=jsonb_build_object('state','saved','templateId',t.id);
 elsif action='approveTemplate' then
 select * into t from msrc_certificates.templates x where x.id=(input->>'templateId')::uuid and x.edition_key=$1 for update;
 if coalesce(input->>'expectedVersion','') !~ '^[1-9][0-9]{0,8}$' or t.version is distinct from (input->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 if t.id is null or t.signature is null then return jsonb_build_object('state','invalid');end if;
 update msrc_certificates.templates x set approved=true,approved_by=auth.uid(),approved_at=clock_timestamp() where x.id=t.id;
 result:=jsonb_build_object('state','saved');
 elsif action='release' then
 if not msrc_certificates.ready(edition_key) then return jsonb_build_object('state','closed');end if;
 select * into t from msrc_certificates.templates x where x.id=(input->>'templateId')::uuid and x.edition_key=$1 for update;
 if coalesce(input->>'expectedVersion','') !~ '^[1-9][0-9]{0,8}$' or t.version is distinct from (input->>'expectedVersion')::integer then return jsonb_build_object('state','conflict');end if;
 if t.id is null or not t.approved then return jsonb_build_object('state','approval_required');end if;
 workshop:=nullif(input->>'workshopId','')::uuid;
 if (t.kind='conference' and workshop is not null) or (t.kind='workshop' and not exists(select 1 from msrc_workshops.workshops w where w.id=workshop and w.edition_key=$1 and not w.removed)) then return jsonb_build_object('state','invalid');end if;
 insert into msrc_certificates.batches(edition_key,template_id,workshop_id,released_by,template_snapshot) values(edition_key,t.id,workshop,auth.uid(),to_jsonb(t)) returning id into batch;
 for candidate in select p.actor_id,p.name from msrc_participant.profiles p join msrc_authorization.account_access a on a.actor_id=p.actor_id
 join auth.users u on u.id=p.actor_id where a.state='active' and p.state='verified' and u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false)
 and (u.banned_until is null or u.banned_until<=clock_timestamp()) and msrc_participant.age_proven(p.actor_id) and msrc_participant.participant_only(p.actor_id) order by p.actor_id for share of p,a,u loop
 e:=msrc_certificates.eligibility(edition_key,candidate.actor_id,t.kind,workshop);
 if (e->>'eligible')::boolean and not exists(select 1 from msrc_certificates.certificates x where x.edition_key=$1 and x.actor_id=candidate.actor_id and x.kind=t.kind and x.workshop_id is not distinct from workshop and x.status in('pending','issued')) then
 insert into msrc_certificates.certificates(edition_key,actor_id,batch_id,kind,workshop_id,recipient_name,certificate_type,edition,activity,signature)
 values(edition_key,candidate.actor_id,batch,t.kind,workshop,candidate.name,t.title_en,edition_key,e->>'activity',t.signature) returning * into c;
 perform msrc_certificates.record(edition_key,c.id,'certificate.prepared',null,jsonb_build_object('batchId',batch));count:=count+1;end if;end loop;
 result:=jsonb_build_object('state','released','batchId',batch,'count',count);
 elsif action='revoke' then
 select * into c from msrc_certificates.certificates x where x.id=(input->>'certificateId')::uuid and x.edition_key=$1 for update;
 if c.id is null or c.status not in('issued','pending') or reason is null or char_length(reason)>500 then return jsonb_build_object('state','invalid');end if;
 update msrc_certificates.certificates x set status='revoked',worker_id=null,lease_token=null,lease_until=null where x.id=c.id;
 perform msrc_certificates.record(edition_key,c.id,'certificate.revoked',reason,jsonb_build_object('previousStatus',c.status));result:=jsonb_build_object('state','revoked');
 elsif action in('approveCorrection','rejectCorrection') then
 select r.* into correction from msrc_certificates.corrections r join msrc_certificates.certificates x on x.id=r.certificate_id where r.id=(input->>'correctionId')::uuid and x.edition_key=$1 for update of r;
 select * into c from msrc_certificates.certificates x where x.id=correction.certificate_id for update;
 if correction.id is null or correction.status<>'pending' or c.status<>'issued' or reason is null or char_length(reason)>500 then return jsonb_build_object('state','invalid');end if;
 if action='approveCorrection' then
 if not msrc_certificates.ready(edition_key) then return jsonb_build_object('state','closed');end if;
 update msrc_certificates.certificates x set status='replaced' where x.id=c.id;
 insert into msrc_certificates.certificates(edition_key,actor_id,batch_id,kind,workshop_id,recipient_name,certificate_type,edition,activity,signature,replaces_id)
 values(c.edition_key,c.actor_id,c.batch_id,c.kind,c.workshop_id,correction.requested_name,c.certificate_type,c.edition,c.activity,c.signature,c.id);
 result:=jsonb_build_object('state','reissued');
 else result:=jsonb_build_object('state','saved');end if;
 update msrc_certificates.corrections r set status=case when action='approveCorrection' then 'approved' else 'rejected' end,decided_by=auth.uid(),reason=reason where r.id=correction.id;
 perform msrc_certificates.record(edition_key,c.id,'correction.'||action,reason,jsonb_build_object('correctionId',correction.id));
 else return jsonb_build_object('state','invalid');end if;
 perform msrc_certificates.record(edition_key,null,action,reason,result);
 insert into msrc_certificates.operations(edition_key,actor_id,operation_id,input_hash,result) values(edition_key,auth.uid(),op,digest,result);
 return result;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range or check_violation or not_null_violation or unique_violation then return jsonb_build_object('state','invalid');
end$$;
create function public.msrc_staff_certificates_manage(edition_key text,input jsonb) returns jsonb language sql security definer set search_path='' as $$select msrc_certificates.staff_manage($1,$2);$$;

create function msrc_certificates.participant_read(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_certificates.guard(edition_key);
 if not coalesce(msrc_registration.participant_current(edition_key),false) then return jsonb_build_object('state','denied');end if;
 if not msrc_certificates.ready(edition_key) then return jsonb_build_object('state','closed');end if;
 return msrc_certificates.projection(edition_key,auth.uid());
end$$;
create function msrc_certificates.participant_manage(edition_key text,input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare action text:=input->>'action';s msrc_certificates.surveys%rowtype;q jsonb;v jsonb;answers jsonb:=input->'answers';actor uuid;name text;email text;c msrc_certificates.certificates%rowtype;begin
 perform msrc_certificates.guard(edition_key);
 if not coalesce(msrc_registration.participant_current(edition_key),false) then return jsonb_build_object('state','denied');end if;
 actor:=auth.uid();if not msrc_certificates.ready(edition_key) then return jsonb_build_object('state','closed');end if;
 if action='submitSurvey' then
 select * into s from msrc_certificates.surveys x where x.id=(input->>'surveyId')::uuid and x.edition_key=$1 for update;
 if s.id is null then return jsonb_build_object('state','not_found');end if;
 if exists(select 1 from msrc_certificates.completions x where x.survey_id=s.id and x.actor_id=actor) then return jsonb_build_object('state','completed');end if;
 if not s.published or s.deadline is null or s.deadline<=clock_timestamp() or jsonb_array_length(s.questions)=0
 or not exists(select 1 from msrc_certificates.settings x where x.edition_key=$1 and x.surveys_enabled) then return jsonb_build_object('state','closed');end if;
 if (s.kind='conference' and not exists(select 1 from msrc_registration.requests r where r.edition_key=$1 and r.actor_id=actor and r.status in('approved','confirmed')))
 or (s.kind='workshop' and not exists(select 1 from msrc_workshops.bookings b where b.workshop_id=s.workshop_id and b.actor_id=actor and b.status='confirmed')) then return jsonb_build_object('state','denied');end if;
 if jsonb_typeof(answers) is distinct from 'object' or exists(select 1 from jsonb_object_keys(answers) k where not exists(select 1 from jsonb_array_elements(s.questions) x where x->>'id'=k)) then return jsonb_build_object('state','invalid');end if;
 select p.name,u.email into name,email from msrc_participant.profiles p join auth.users u on u.id=p.actor_id where p.actor_id=actor;
 for q in select value from jsonb_array_elements(s.questions) loop
 v:=answers->(q->>'id');
 if v is null or v='null'::jsonb or v='""'::jsonb then if (q->>'required')::boolean then return jsonb_build_object('state','invalid');end if;continue;end if;
 if q->>'type'='rating_scale' then
 if jsonb_typeof(v)<>'number' or v::text !~ '^-?[0-9]{1,3}$' or (v::text)::integer<(q->>'scaleMin')::integer or (v::text)::integer>(q->>'scaleMax')::integer then return jsonb_build_object('state','invalid');end if;
 elsif q->>'type'='single_choice' then
 if jsonb_typeof(v)<>'string' or not exists(select 1 from jsonb_array_elements(q->'options') o where o->>'value'=v#>>'{}') then return jsonb_build_object('state','invalid');end if;
 else
 if jsonb_typeof(v)<>'string' or char_length(v#>>'{}')>1000 or (v#>>'{}')~'[[:cntrl:]]'
 or (v#>>'{}')~*'([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|[0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})'
 or (v#>>'{}')~*'(^|[^[:alnum:]_])(([a-f0-9]{1,4}:){7}[a-f0-9]{1,4}|([a-f0-9]{1,4}:){1,7}:[a-f0-9:]{0,39}|::[a-f0-9:]{0,39})($|[^[:alnum:]_])'
 or (char_length(name)>=3 and strpos(lower(v#>>'{}'),lower(name))>0) or strpos(lower(v#>>'{}'),lower(email))>0 then return jsonb_build_object('state','identifying_text');end if;
 end if;end loop;
 -- No caller operation ID, input hash, response ID, audit or timestamp survives.
 -- Both inserts commit atomically; the separately keyed completion makes retry a no-op.
 insert into msrc_certificates.completions(survey_id,actor_id) values(s.id,actor);
 for q in select value from jsonb_array_elements(s.questions) loop
 v:=answers->(q->>'id');if v is not null and v<>'null'::jsonb and v<>'""'::jsonb then
 insert into msrc_certificates.answers(survey_id,question_id,value) values(s.id,q->>'id',v);end if;end loop;
 return jsonb_build_object('state','completed');
 elsif action='requestCorrection' then
 select * into c from msrc_certificates.certificates x where x.id=(input->>'certificateId')::uuid and x.actor_id=actor and x.edition_key=$1 for update;
 if c.id is null or c.status<>'issued' then return jsonb_build_object('state','not_found');end if;
 if exists(select 1 from msrc_certificates.corrections r where r.certificate_id=c.id and r.status='pending') then return jsonb_build_object('state','saved');end if;
 insert into msrc_certificates.corrections(certificate_id,requested_name) values(c.id,btrim(input->>'requestedName'));
 perform msrc_certificates.record(edition_key,c.id,'correction.requested');return jsonb_build_object('state','saved');
 end if;return jsonb_build_object('state','invalid');
exception when invalid_text_representation or check_violation or not_null_violation then return jsonb_build_object('state','invalid');
end$$;
create function public.msrc_certificates_participant_read(edition_key text,session_claims jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_registration.server_only();if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_certificates.participant_read(edition_key);exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;
create function public.msrc_certificates_participant_manage(edition_key text,session_claims jsonb,input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_registration.server_only();if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_certificates.participant_manage(edition_key,input);exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function msrc_certificates.message_valid(template text,version integer,locale text,recipient text,payload jsonb) returns boolean language sql immutable security invoker set search_path='' as $$
 select coalesce(template='certificate_notice' and version=1 and locale='en' and char_length(recipient)<=254
 and recipient ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
 and jsonb_typeof(payload)='object' and payload=jsonb_build_object('certificate_id',payload->'certificate_id','certificate_type',payload->'certificate_type','edition',payload->'edition','activity',payload->'activity')
 and payload->>'certificate_id'~'^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
 and jsonb_typeof(payload->'certificate_type')='string' and char_length(payload->>'certificate_type') between 1 and 200
 and jsonb_typeof(payload->'edition')='string' and char_length(payload->>'edition') between 1 and 200
 and jsonb_typeof(payload->'activity')='string' and char_length(payload->>'activity') between 1 and 200,false);
$$;
alter table msrc_outbox.messages drop constraint outbox_template_input_check;
alter table msrc_outbox.messages add constraint outbox_template_input_check check(
 (template_key='synthetic_notice' and recipient_email~'^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$' and jsonb_typeof(payload)='object'
 and payload=jsonb_build_object('reference',payload->'reference') and jsonb_typeof(payload->'reference') is not distinct from 'string' and coalesce(payload->>'reference'~'^[A-Za-z0-9_-]{1,80}$',false))
 or msrc_outbox.registration_message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_abstracts.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_announcements.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_workshops.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_certificates.message_valid(template_key,template_version,locale,recipient_email,payload));
alter table msrc_outbox.messages add constraint certificate_draft_delivery_hold check(template_key<>'certificate_notice' or (delivery_hold and status not in('sending','sent')));
create function msrc_certificates.enqueue(c msrc_certificates.certificates) returns void language plpgsql security definer set search_path='' as $$
declare recipient text;payload jsonb;outbox_id uuid:=gen_random_uuid();begin
 select u.email into recipient from auth.users u where u.id=c.actor_id and u.email_confirmed_at is not null and u.deleted_at is null;
 payload:=jsonb_build_object('certificate_id',c.id,'certificate_type',c.certificate_type,'edition',c.edition,'activity',c.activity);
 if not msrc_certificates.message_valid('certificate_notice',1,'en',recipient,payload) then raise exception using errcode='22023',message='Certificate delivery address unavailable.';end if;
 insert into msrc_outbox.identities(id,key_hash,input_hash) values(outbox_id,sha256(convert_to('certificate/'||c.id::text,'UTF8')),sha256(convert_to(jsonb_build_array('certificate_notice',1,'en',recipient,payload)::text,'UTF8')));
 insert into msrc_outbox.messages(id,template_key,template_version,locale,recipient_email,payload,provider_idempotency_key,delivery_hold)
 values(outbox_id,'certificate_notice',1,'en',recipient,payload,'msrc-outbox/'||outbox_id::text,true);
end$$;
create function public.msrc_certificates_generation_claim(worker_id uuid,batch_size integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare c msrc_certificates.certificates%rowtype;result jsonb:='[]'::jsonb;begin
 perform msrc_registration.server_only();if worker_id is null or batch_size is null or batch_size not between 1 and 10 then return result;end if;
 perform msrc_certificates.maintain();
 for c in select x.* from msrc_certificates.certificates x where x.status='pending' and (x.lease_until is null or x.lease_until<=clock_timestamp())
 and msrc_certificates.ready(x.edition_key) and coalesce((msrc_certificates.eligibility(x.edition_key,x.actor_id,x.kind,x.workshop_id)->>'eligible')::boolean,false)
 order by x.id for update skip locked limit batch_size loop
 update msrc_certificates.certificates x set worker_id=$1,lease_token=gen_random_uuid(),lease_until=clock_timestamp()+interval '5 minutes' where x.id=c.id returning * into c;
 result:=result||jsonb_build_array(jsonb_build_object('id',c.id,'leaseToken',c.lease_token,'recipientName',c.recipient_name,'certificateType',c.certificate_type,'edition',c.edition,'activity',c.activity,'code',c.code,'signature',c.signature));end loop;
 return result;
end$$;
create function public.msrc_certificates_generation_finish(certificate_id uuid,worker_id uuid,lease_token uuid,pdf_base64 text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c msrc_certificates.certificates%rowtype;settings msrc_certificates.settings%rowtype;data bytea;begin
 perform msrc_registration.server_only();
 select x.edition_key into c.edition_key from msrc_certificates.certificates x where x.id=$1;
 if c.edition_key is null then return jsonb_build_object('state','denied');end if;
 perform msrc_certificates.guard(c.edition_key);
 select * into c from msrc_certificates.certificates x where x.id=$1 for update;
 if not msrc_certificates.ready(c.edition_key) or c.status<>'pending' or c.worker_id is distinct from $2 or c.lease_token is distinct from $3 or c.lease_until<=clock_timestamp() then return jsonb_build_object('state','denied');end if;
 perform 1 from msrc_authorization.account_access a where a.actor_id=c.actor_id for share;
 perform 1 from auth.users u where u.id=c.actor_id for share;
 perform 1 from msrc_participant.profiles p where p.actor_id=c.actor_id for share;
 if not coalesce((msrc_certificates.eligibility(c.edition_key,c.actor_id,c.kind,c.workshop_id)->>'eligible')::boolean,false)
 or not exists(select 1 from msrc_authorization.account_access a join auth.users u on u.id=a.actor_id join msrc_participant.profiles p on p.actor_id=a.actor_id
 where a.actor_id=c.actor_id and a.state='active' and p.state='verified' and u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false)
 and (u.banned_until is null or u.banned_until<=clock_timestamp()) and msrc_participant.age_proven(c.actor_id) and msrc_participant.participant_only(c.actor_id)) then
 return jsonb_build_object('state','ineligible');end if;
 if pdf_base64 is null or char_length(pdf_base64)>1398104 then return jsonb_build_object('state','invalid');end if;
 data:=decode(pdf_base64,'base64');if octet_length(data) not between 8 and 1048576 or substring(data from 1 for 5)<>convert_to('%PDF-','UTF8') then return jsonb_build_object('state','invalid');end if;
 select * into settings from msrc_certificates.settings s where s.edition_key=c.edition_key;
 update msrc_certificates.certificates x set pdf=data,status='issued',issued_at=clock_timestamp(),download_until=clock_timestamp()+make_interval(days=>settings.download_retention_days),
 verify_until=clock_timestamp()+make_interval(days=>settings.verification_retention_days),worker_id=null,lease_token=null,lease_until=null where x.id=c.id returning * into c;
 perform msrc_certificates.enqueue(c);perform msrc_certificates.record(c.edition_key,c.id,'certificate.issued');return jsonb_build_object('state','issued');
exception when invalid_parameter_value or check_violation then return jsonb_build_object('state','invalid');end$$;
create function public.msrc_certificates_download(edition_key text,session_claims jsonb,certificate_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_registration.server_only();if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform msrc_certificates.guard(edition_key);
 if not coalesce(msrc_registration.participant_current(edition_key),false) or not msrc_certificates.ready(edition_key) then result:=jsonb_build_object('state','denied');
 else select jsonb_build_object('state','ready','pdfBase64',replace(encode(c.pdf,'base64'),E'\n','')) into result from msrc_certificates.certificates c
 where c.id=$3 and c.edition_key=$1 and c.actor_id=auth.uid() and c.status='issued' and c.download_until>clock_timestamp();end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return coalesce(result,jsonb_build_object('state','not_found'));
end$$;
create function public.msrc_certificates_verify(code text,rate_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare attempts integer;c msrc_certificates.certificates%rowtype;begin
 perform msrc_registration.server_only();if coalesce(rate_key,'') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('state','unavailable');end if;
 -- Only an HMAC abuse bucket is retained, never the code, actor, request or response.
 delete from msrc_certificates.verify_limits v where v.key_hash in(select x.key_hash from msrc_certificates.verify_limits x where x.window_start<clock_timestamp()-interval '1 day' limit 100);
 insert into msrc_certificates.verify_limits(key_hash,window_start,attempts) values(rate_key,clock_timestamp(),1)
 on conflict on constraint verify_limits_pkey do update set attempts=case when msrc_certificates.verify_limits.window_start<=clock_timestamp()-interval '1 minute' then 1 else least(31,msrc_certificates.verify_limits.attempts+1) end,
 window_start=case when msrc_certificates.verify_limits.window_start<=clock_timestamp()-interval '1 minute' then clock_timestamp() else msrc_certificates.verify_limits.window_start end returning verify_limits.attempts into attempts;
 if attempts>30 then return jsonb_build_object('state','rate_limited');end if;
 if coalesce(code,'') !~ '^[a-f0-9]{64}$' then return jsonb_build_object('state','not_found');end if;
 select * into c from msrc_certificates.certificates x where x.code=$1 and x.status<>'pending' and x.verify_until>clock_timestamp()
 and exists(select 1 from msrc_certificates.settings s where s.edition_key=x.edition_key and s.enabled);
 if c.id is null then return jsonb_build_object('state','not_found');end if;
 return jsonb_build_object('recipient_name',c.recipient_name,'certificate_type',c.certificate_type,'edition',c.edition,'activity',c.activity,'validity',case c.status when 'issued' then 'valid' else c.status end);
end$$;

-- Preserve immutable PDF/evidence snapshots and original public revocation status.
create function msrc_certificates.protect_certificate() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if tg_op='DELETE' then raise exception using errcode='42501',message='Certificate history is immutable.';end if;
 if (to_jsonb(new)-array['status','pdf','issued_at','download_until','verify_until','worker_id','lease_token','lease_until'])
 is distinct from (to_jsonb(old)-array['status','pdf','issued_at','download_until','verify_until','worker_id','lease_token','lease_until'])
 or (old.pdf is not null and new.pdf is distinct from old.pdf and not(new.pdf is null and old.download_until<=clock_timestamp()
 and current_setting('msrc_certificates.retention',true)=txid_current()::text)) or (old.status in('revoked','replaced') and new.status<>old.status)
 or (old.status='issued' and new.status='pending') or (old.status='pending' and new.status='issued' and new.pdf is null) then raise exception using errcode='42501',message='Certificate snapshot is immutable.';end if;
 return new;end$$;
create trigger certificate_snapshot before update or delete on msrc_certificates.certificates for each row execute function msrc_certificates.protect_certificate();
create trigger certificate_no_truncate before truncate on msrc_certificates.certificates for each statement execute function msrc_staff.audit_immutable();

create function msrc_certificates.maintain() returns jsonb language plpgsql security definer set search_path='' as $$
declare feedback_count integer;pdf_count integer;begin
 -- Bounded counts-only privacy maintenance. No survey completion or request linkage.
 delete from msrc_certificates.answers a where a.ctid in(select x.ctid from msrc_certificates.answers x
 join msrc_certificates.surveys s on s.id=x.survey_id join msrc_certificates.settings p on p.edition_key=s.edition_key
 where p.feedback_retention_days is not null and x.answer_date<(clock_timestamp() at time zone 'Asia/Riyadh')::date-p.feedback_retention_days limit 1000);
 get diagnostics feedback_count=row_count;
 perform set_config('msrc_certificates.retention',txid_current()::text,true);
 update msrc_certificates.certificates c set pdf=null where c.id in(select x.id from msrc_certificates.certificates x
 where x.pdf is not null and x.download_until<=clock_timestamp() order by x.id for update skip locked limit 20);
 get diagnostics pdf_count=row_count;
 perform set_config('msrc_certificates.retention','',true);
 return jsonb_build_object('state','updated','feedbackPurged',feedback_count,'pdfsPurged',pdf_count);
end$$;
create function public.msrc_certificates_maintenance() returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_registration.server_only();return msrc_certificates.maintain();
end$$;

revoke all on all functions in schema msrc_certificates from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_certificates_read(text),public.msrc_staff_certificates_manage(text,jsonb),
 public.msrc_certificates_participant_read(text,jsonb),public.msrc_certificates_participant_manage(text,jsonb,jsonb),public.msrc_certificates_download(text,jsonb,uuid),
 public.msrc_certificates_verify(text,text),public.msrc_certificates_generation_claim(uuid,integer),public.msrc_certificates_generation_finish(uuid,uuid,uuid,text),public.msrc_certificates_maintenance() from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_certificates_read(text),public.msrc_staff_certificates_manage(text,jsonb) to authenticated;
grant execute on function public.msrc_certificates_participant_read(text,jsonb),public.msrc_certificates_participant_manage(text,jsonb,jsonb),public.msrc_certificates_download(text,jsonb,uuid),
 public.msrc_certificates_verify(text,text),public.msrc_certificates_generation_claim(uuid,integer),public.msrc_certificates_generation_finish(uuid,uuid,uuid,text),public.msrc_certificates_maintenance() to service_role;
notify pgrst,'reload schema';
commit;
