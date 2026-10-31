-- ENG-091 / ORG-040 / ORG-069 / AI-01..06 / EML-04. Source only, no activation.
begin;

create function msrc_abstracts.advisory_gates_valid(g jsonb) returns boolean
 language plpgsql stable security invoker set search_path='' as $$
declare v jsonb;begin
 if jsonb_typeof(g) is distinct from 'array' then return false;end if;
 if jsonb_array_length(g)<>6 or (select count(distinct x->>'gate') from jsonb_array_elements(g) x)<>6 then return false;end if;
 for v in select value from jsonb_array_elements(g) loop
  if v<>jsonb_build_object('gate',v->'gate','observation',v->'observation')
   or jsonb_typeof(v->'gate') is distinct from 'number' or (v->>'gate')!~'^[1-6]$'
   or jsonb_typeof(v->'observation') is distinct from 'string' or length(btrim(v->>'observation')) not between 1 and 1000
   or (v->>'observation')~'[[:cntrl:]]' then return false;end if;
 end loop;return true;
end$$;
create function msrc_abstracts.advisory_total(scores jsonb) returns numeric language sql immutable security invoker set search_path='' as $$
 select msrc_abstracts.weighted_total_2027((select jsonb_agg(jsonb_build_object('criterionId',v->'criterionId','value',v->'value')) from jsonb_array_elements(case when jsonb_typeof(scores)='array' then scores else '[]'::jsonb end) v));
$$;
alter table msrc_abstracts.advisory_records add column gate_observations jsonb
 check(gate_observations is null or msrc_abstracts.advisory_gates_valid(gate_observations));
alter table msrc_abstracts.advisory_records add column suggested_total numeric
 generated always as (msrc_abstracts.advisory_total(scores)) stored;

-- Separate staff confirmations extend the advisory record. They are never review
-- assignments, human scorecards, reviewer counts, bands or scientific decisions.
create table msrc_abstracts.advisory_confirmations (
 id uuid primary key default gen_random_uuid(), advisory_id uuid not null references msrc_abstracts.advisory_records(id),
 item_key text not null check(item_key in('G1','G2','G3','G4','G5','G6','significance','objectives','methodology','results','conclusions','clarity','structure')),
 value jsonb not null,actor_id uuid not null,session_id uuid not null,operation_id uuid not null,
 screening_id uuid references msrc_abstracts.screenings(id),marker text not null default 'AI-assisted' check(marker='AI-assisted'),
 created_at timestamptz not null default clock_timestamp(),unique(operation_id,item_key)
);
alter table msrc_abstracts.advisory_confirmations enable row level security;
alter table msrc_abstracts.advisory_confirmations force row level security;
revoke all on msrc_abstracts.advisory_confirmations from public,anon,authenticated,service_role;
create trigger advisory_confirmation_immutable before insert or update or delete on msrc_abstracts.advisory_confirmations
 for each row execute function msrc_staff.audit_immutable();
create trigger advisory_confirmation_no_truncate before truncate on msrc_abstracts.advisory_confirmations
 for each statement execute function msrc_staff.audit_immutable();

create function public.msrc_staff_advisory_confirm_item(edition_key text,advisory_id uuid,item_key text,score integer,note text,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare j msrc_abstracts.advisory_jobs%rowtype;old msrc_abstracts.advisory_confirmations%rowtype;v jsonb;begin
 perform msrc_abstracts.guard();
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null or msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is not null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or score is null or score not between 1 and 4 or note is null or length(btrim(note)) not between 1 and 1000
  or not exists(select 1 from jsonb_array_elements(msrc_abstracts.rubric_2027()) r where r->>'id'=item_key) then return jsonb_build_object('state','invalid');end if;
 perform 1 from msrc_abstracts.settings s where s.edition_key=edition_key for update;
 select q.* into j from msrc_abstracts.advisory_jobs q join msrc_abstracts.advisory_records r on r.job_id=q.id
  where r.id=advisory_id and r.gate_observations is not null and q.edition_key=edition_key;
 perform 1 from msrc_abstracts.submissions s where s.id=j.submission_id and s.version=j.submission_version and s.status in('submitted','scientific_review') for update;
 if not found or msrc_abstracts.advisory_is_author(j.submission_id,auth.uid()) then return jsonb_build_object('state','stale_snapshot');end if;
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null or msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is not null then return jsonb_build_object('state','denied');end if;
 v:=jsonb_build_object('score',score,'note',note);
 select * into old from msrc_abstracts.advisory_confirmations c where c.operation_id=operation_id and c.item_key=item_key;
 if found then
  if old.actor_id<>auth.uid() or old.advisory_id<>advisory_id or old.value<>v then return jsonb_build_object('state','conflict');end if;
  return jsonb_build_object('state','updated');end if;
 insert into msrc_abstracts.advisory_confirmations(advisory_id,item_key,value,actor_id,session_id,operation_id)
 values(advisory_id,item_key,v,auth.uid(),(auth.jwt()->>'session_id')::uuid,operation_id);
 perform msrc_abstracts.record(edition_key,'advisory.human_confirmed',advisory_id,jsonb_build_object('item',item_key,'marker','AI-assisted'));
 return jsonb_build_object('state','updated');
end$$;

create function public.msrc_staff_advisory_confirm_screening(edition_key text,submission_id uuid,expected_version integer,expected_sequence integer,operation_id uuid,screening jsonb,advisory_id uuid,items text[]) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare j msrc_abstracts.advisory_jobs%rowtype;r msrc_abstracts.advisory_records%rowtype;answer jsonb;screen uuid;k text;begin
 perform msrc_abstracts.guard();
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin']) is null or msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is not null then return jsonb_build_object('state','denied');end if;
 if items is null or cardinality(items) not between 1 and 6 or array_position(items,null) is not null
  or exists(select 1 from unnest(items) selected(item_key) where selected.item_key not in('G1','G2','G3','G4','G5','G6'))
  or (select count(*)<>count(distinct selected.item_key) from unnest(items) selected(item_key)) then return jsonb_build_object('state','invalid');end if;
 perform pg_advisory_xact_lock(hashtextextended('abstract-screening:'||operation_id::text,0));
 perform 1 from msrc_abstracts.settings s where s.edition_key=edition_key for update;
 select * into r from msrc_abstracts.advisory_records q where q.id=advisory_id and q.gate_observations is not null;
 select * into j from msrc_abstracts.advisory_jobs q where q.id=r.job_id and q.edition_key=edition_key and q.submission_id=submission_id and q.submission_version=expected_version;
 if j.id is null or msrc_abstracts.advisory_is_author(submission_id,auth.uid()) then return jsonb_build_object('state','denied');end if;
 -- The human still supplies every gate judgement and G7 attestation. AI only
 -- contributes individually copied observations; deterministic G1-G4 stay fixed.
 screening:=jsonb_set(screening,'{note}',to_jsonb((screening->>'note')||' AI-assisted ['||advisory_id::text||'] '||array_to_string(items,',')));
 answer:=public.msrc_staff_research_confirm_screening(edition_key,submission_id,expected_version,expected_sequence,operation_id,screening);
 if answer->>'state'<>'updated' then return answer;end if;
 select id into screen from msrc_abstracts.screenings q where q.operation_id=operation_id and q.actor_id=auth.uid();
 foreach k in array items loop
  insert into msrc_abstracts.advisory_confirmations(advisory_id,item_key,value,actor_id,session_id,operation_id,screening_id)
  values(advisory_id,k,jsonb_build_object('observation',(select g->>'observation' from jsonb_array_elements(r.gate_observations) g where 'G'||(g->>'gate')=k)),auth.uid(),(auth.jwt()->>'session_id')::uuid,operation_id,screen)
  on conflict on constraint advisory_confirmations_operation_id_item_key_key do nothing;
 end loop;
 return answer;
end$$;

-- Supervisor messages use the existing durable identity, lease and audit ledgers.
-- No release switch is introduced. Even opening global delivery cannot release it.
create function msrc_abstracts.supervisor_message_valid(template text,version integer,locale text,recipient text,p jsonb) returns boolean
 language sql immutable security invoker set search_path='' as $$
 select coalesce(template='abstract_supervisor' and version=1 and locale='en' and length(recipient)<=254
  and recipient~'^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
  and jsonb_typeof(p)='object' and p=jsonb_build_object('supervisor_name',p->'supervisor_name','abstract_title',p->'abstract_title','presenter_name',p->'presenter_name')
  and not exists(select 1 from jsonb_each(case when jsonb_typeof(p)='object' then p else '{}'::jsonb end) v where jsonb_typeof(v.value)<>'string' or length(btrim(v.value#>>'{}')) not between 1 and (case v.key when 'abstract_title' then 6000 else 500 end) or (v.value#>>'{}')~'[[:cntrl:]]'),false);
$$;
alter table msrc_outbox.messages add constraint supervisor_draft_delivery_hold
 check(template_key<>'abstract_supervisor' or(delivery_hold and status not in('sending','sent')));

create table msrc_abstracts.supervisor_notifications (
 edition_key text not null,submission_id uuid not null,submission_version integer not null,
 screening_id uuid not null references msrc_abstracts.screenings(id),outbox_id uuid not null unique references msrc_outbox.identities(id),
 created_at timestamptz not null default clock_timestamp(),primary key(edition_key,submission_id,submission_version),
 foreign key(submission_id,submission_version) references msrc_abstracts.snapshots(submission_id,version)
);
alter table msrc_abstracts.supervisor_notifications enable row level security;
alter table msrc_abstracts.supervisor_notifications force row level security;
revoke all on msrc_abstracts.supervisor_notifications from public,anon,authenticated,service_role;
create trigger supervisor_notification_immutable before insert or update or delete on msrc_abstracts.supervisor_notifications
 for each row execute function msrc_staff.audit_immutable();
create trigger supervisor_notification_no_truncate before truncate on msrc_abstracts.supervisor_notifications
 for each statement execute function msrc_staff.audit_immutable();

create function msrc_abstracts.supervisor_event() returns trigger language plpgsql security invoker set search_path='' as $$
declare s msrc_abstracts.submissions%rowtype;x msrc_abstracts.snapshots%rowtype;r msrc_abstracts.screenings%rowtype;
 recipient text;p jsonb;key bytea;digest bytea;i msrc_outbox.identities%rowtype;begin
 if new.event<>'screening.passed' then return new;end if;
 select * into r from msrc_abstracts.screenings where id=(new.details->>'screeningId')::uuid;
 select * into s from msrc_abstracts.submissions where id=new.target_id;
 if r.id is null or r.submission_id<>s.id or r.submission_version<>s.version or r.actor_id is distinct from new.actor_id
  or new.actor_id is distinct from auth.uid() or r.session_id is distinct from new.session_id or s.edition_key<>new.edition_key or r.status<>'passed' or r.investigation or not coalesce(msrc_abstracts.screening_current(s.id),false) then return new;end if;
 if exists(select 1 from msrc_abstracts.supervisor_notifications n where n.submission_id=s.id and n.submission_version=s.version) then return new;end if;
 select * into strict x from msrc_abstracts.snapshots where submission_id=s.id and version=s.version;
 recipient:=x.document->'supervisor'->>'email';
 p:=jsonb_build_object('supervisor_name',x.document->'supervisor'->>'fullName','abstract_title',x.document->>'title',
  'presenter_name',(select a->>'name' from jsonb_array_elements(x.document->'authors') a where a->>'id'=x.document->>'presentingAuthorId'));
 if not msrc_abstracts.supervisor_message_valid('abstract_supervisor',1,'en',recipient,p) then
  perform msrc_abstracts.record(s.edition_key,'supervisor.notification_blocked',s.id,jsonb_build_object('reason','invalid_snapshot','submissionVersion',s.version));return new;end if;
 key:=sha256(convert_to('abstract-supervisor/'||s.edition_key||'/'||s.id::text||'/'||s.version::text,'UTF8'));
 digest:=sha256(convert_to(jsonb_build_array('abstract_supervisor',1,'en',recipient,p)::text,'UTF8'));
 insert into msrc_outbox.identities(key_hash,input_hash) values(key,digest) on conflict do nothing returning * into i;
 if not found then select * into strict i from msrc_outbox.identities where key_hash=key for update;
  if i.input_hash<>digest then raise exception using errcode='22023',message='Supervisor outbox conflict.';end if;
 else
  insert into msrc_outbox.messages(id,template_key,template_version,locale,recipient_email,payload,provider_idempotency_key,delivery_hold)
  values(i.id,'abstract_supervisor',1,'en',recipient,p,'msrc-outbox/'||i.id::text,true);
 end if;
 insert into msrc_abstracts.supervisor_notifications values(s.edition_key,s.id,s.version,r.id,i.id,clock_timestamp());
 perform msrc_abstracts.record(s.edition_key,'supervisor.notification_queued',s.id,jsonb_build_object('submissionVersion',s.version,'outboxId',i.id,'delivery','draft_held'));
 return new;
end$$;
create trigger supervisor_screening_event after insert on msrc_abstracts.audit for each row execute function msrc_abstracts.supervisor_event();

create function msrc_abstracts.supervisor_eligible(message_id uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from msrc_abstracts.supervisor_notifications n
  join msrc_abstracts.submissions s on s.id=n.submission_id and s.edition_key=n.edition_key and s.version=n.submission_version
  join msrc_abstracts.snapshots x on x.submission_id=s.id and x.version=s.version
  join msrc_outbox.messages m on m.id=n.outbox_id
  where n.outbox_id=message_id and s.status in('submitted','scientific_review','accepted') and msrc_abstracts.screening_current(s.id)
  and m.recipient_email=x.document->'supervisor'->>'email'
  and m.payload=jsonb_build_object('supervisor_name',x.document->'supervisor'->>'fullName','abstract_title',x.document->>'title',
   'presenter_name',(select a->>'name' from jsonb_array_elements(x.document->'authors') a where a->>'id'=x.document->>'presentingAuthorId')));
$$;
create function msrc_abstracts.supervisor_send_guard() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.template_key='abstract_supervisor' and (new.status='sending' or new.provider_request is not null)
  and not msrc_abstracts.supervisor_eligible(new.id) then raise exception using errcode='55000',message='Supervisor notification no longer eligible.';end if;
 return new;
end$$;
create trigger supervisor_send_eligibility before update on msrc_outbox.messages for each row execute function msrc_abstracts.supervisor_send_guard();

create function public.msrc_staff_advisory_submission(edition_key text,submission_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.submissions%rowtype;a jsonb;notification text;confirmations jsonb;enabled boolean;begin
 perform msrc_abstracts.guard();
 if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null or msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is not null then return jsonb_build_object('state','denied');end if;
 select * into s from msrc_abstracts.submissions q where q.id=submission_id and q.edition_key=edition_key;
 if not found or msrc_abstracts.advisory_is_author(submission_id,auth.uid()) then return jsonb_build_object('state','denied');end if;
 enabled:=coalesce((select (q.configuration->>'enabled')::boolean from msrc_abstracts.advisory_settings q where q.edition_key=edition_key),false);
 select jsonb_build_object('id',r.id,'reference',s.reference,'submissionVersion',j.submission_version,'rubricVersion',j.rubric_version,
  'model',r.model,'promptVersion',r.prompt_version,'createdAt',r.created_at,'rubric',msrc_abstracts.rubric_2027(),'scores',r.scores,'gates',r.gate_observations,'total',r.suggested_total)
 into a from msrc_abstracts.advisory_jobs j join msrc_abstracts.advisory_records r on r.job_id=j.id
 where j.submission_id=s.id and j.submission_version=s.version and r.gate_observations is not null;
 select case when m.delivery_hold then 'draft_held' else coalesce(m.status,i.terminal_status) end into notification
 from msrc_abstracts.supervisor_notifications n join msrc_outbox.identities i on i.id=n.outbox_id left join msrc_outbox.messages m on m.id=i.id
 where n.submission_id=s.id and n.submission_version=s.version;
 if notification is not null and not coalesce(msrc_abstracts.screening_current(s.id),false) then notification:='ineligible';end if;
 select coalesce(jsonb_agg(jsonb_build_object('item',c.item_key,'actorId',c.actor_id,'advisoryId',c.advisory_id,'marker',c.marker,'at',c.created_at,'value',c.value) order by c.created_at),'[]'::jsonb)
 into confirmations from msrc_abstracts.advisory_confirmations c join msrc_abstracts.advisory_records r on r.id=c.advisory_id
 join msrc_abstracts.advisory_jobs j on j.id=r.job_id where j.submission_id=s.id and j.submission_version=s.version;
 return jsonb_build_object('state','ready','enabled',enabled,'advisory',a,'notification',coalesce(notification,'not_queued'),'confirmations',confirmations);
end$$;

-- Reviewer visibility is deliberately staff-only, even after submitting a card.
create or replace function public.msrc_staff_advisory_reviewer(edition_key text,assignment_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$begin
 perform msrc_abstracts.guard();
 -- ENG-091: advisories are staff-only, so reviewers are always denied whatever the target.
 if edition_key is null or assignment_id is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','denied');
end$$;

create or replace function msrc_abstracts.advisory_configuration_valid(c jsonb) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare k text;begin
 if jsonb_typeof(c) is distinct from 'object' or octet_length(c::text)>8192
 or c<>msrc_abstracts.advisory_defaults()||c or exists(select 1 from jsonb_object_keys(c) x where not(msrc_abstracts.advisory_defaults()?x))
 or c->>'reviewerVisible' is distinct from 'false' or jsonb_typeof(c->'enabled') is distinct from 'boolean' or jsonb_typeof(c->'reviewerVisible') is distinct from 'boolean' then return false;end if;
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

create or replace function public.msrc_advisory_worker_claim(p_worker_id uuid,p_batch_size integer) returns jsonb
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
 select msrc_abstracts.packet_projection(p.packet),msrc_abstracts.rubric_2027(),x.created_at,jsonb_build_object(
 'authorNames',(select coalesce(jsonb_agg(n order by n),'[]'::jsonb) from (
 select au->>'name' n from jsonb_array_elements(x.document->'authors') au
 union select x.document->'supervisor'->>'fullName'
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
 'specialtyId',packet->'specialtyId','studyTypeId',packet->'studyTypeId','studyTypeOther',coalesce(packet->'studyTypeOther','""'::jsonb),'analysisComplete',coalesce(packet->'analysisComplete',to_jsonb(packet->>'completionStatus'='completed')),
 'configuration',r.configuration,'attempt',j.attempts,'lockedAt',locked_at,'identity',identity));
 exit when jsonb_array_length(result)>=p_batch_size;
 end loop;exit when jsonb_array_length(result)>=p_batch_size;end loop;
 return result;
end$$;

create or replace function msrc_abstracts.advisory_result_valid(value jsonb,rubric jsonb,model text) returns boolean language plpgsql stable security invoker set search_path='' as $$
declare criterion jsonb;score jsonb;begin
 if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>600000
 or value<>jsonb_build_object('scores',value->'scores','model',value->'model','promptVersion',value->'promptVersion','gates',value->'gates','total',value->'total')
 or value->>'model' is distinct from model or jsonb_typeof(value->'model') is distinct from 'string'
 or jsonb_typeof(value->'promptVersion') is distinct from 'string' or (value->>'promptVersion')!~'^[A-Za-z0-9_.-]{1,100}$'
 or jsonb_typeof(value->'scores') is distinct from 'array' or jsonb_typeof(rubric) is distinct from 'array' then return false;end if;
 if not msrc_abstracts.advisory_gates_valid(value->'gates') or value->>'promptVersion'<>'staff-advisory-org069-v2' or msrc_abstracts.advisory_total(value->'scores') is null or jsonb_typeof(value->'total') is distinct from 'number' or (value->>'total')::numeric is distinct from msrc_abstracts.advisory_total(value->'scores') then return false;end if;
 if rubric is distinct from msrc_abstracts.rubric_2027() then return false;end if;
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

create or replace function public.msrc_advisory_worker_finish(p_worker_id uuid,p_job_id uuid,p_lease_token uuid,p_result jsonb,p_error_code text) returns jsonb
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
 select msrc_abstracts.rubric_2027() into rubric from msrc_abstracts.settings_versions v where v.edition_key=j.edition_key and v.version=j.rubric_version;
 if not msrc_abstracts.advisory_result_valid(p_result,rubric,r.configuration->>'model') then error_code:='invalid_output';end if;end if;
 if error_code is null then
 insert into msrc_abstracts.advisory_records(job_id,scores,model,prompt_version,gate_observations) values(j.id,p_result->'scores',p_result->>'model',p_result->>'promptVersion',p_result->'gates');
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

create or replace function public.msrc_staff_advisory_workspace(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare s msrc_abstracts.advisory_settings%rowtype;candidates jsonb;records jsonb;runs jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null or msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is not null then return jsonb_build_object('state','denied');end if;
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
 'model',r.model,'promptVersion',r.prompt_version,'createdAt',r.created_at,'rubric',case when r.gate_observations is null then v.configuration->'rubric' else msrc_abstracts.rubric_2027() end,'scores',r.scores,'gates',r.gate_observations,'total',r.suggested_total) item
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

alter table msrc_outbox.messages drop constraint outbox_template_input_check;
alter table msrc_outbox.messages add constraint outbox_template_input_check check(
 (template_key='synthetic_notice' and recipient_email~'^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$' and jsonb_typeof(payload)='object'
 and payload=jsonb_build_object('reference',payload->'reference') and jsonb_typeof(payload->'reference') is not distinct from 'string' and coalesce(payload->>'reference'~'^[A-Za-z0-9_-]{1,80}$',false))
 or msrc_outbox.registration_message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_abstracts.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_announcements.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_workshops.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_certificates.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_abstracts.supervisor_message_valid(template_key,template_version,locale,recipient_email,payload));

create or replace function public.msrc_staff_advisory_calibration(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare pairs jsonb;begin
 perform msrc_abstracts.guard();if msrc_staff.authorize(edition_key,array['scientificAdministrator','superAdmin'],false) is null or msrc_staff.authorize(edition_key,array['abstractReviewer'],false) is not null then return jsonb_build_object('state','denied');end if;
 select coalesce(jsonb_agg(q.pair order by q.submission_id,q.submission_version,q.rubric_version,q.criterion_id),'[]'::jsonb) into pairs from (
 select j.submission_id,j.submission_version,j.rubric_version,ai->>'criterionId' criterion_id,
 jsonb_build_object('submissionId',j.submission_id,'submissionVersion',j.submission_version,'rubricVersion',j.rubric_version,
 'criterionId',ai->>'criterionId','min',(criterion->>'min')::numeric,'max',(criterion->>'max')::numeric,'aiScore',(ai->>'value')::numeric,'humanScore',avg((hs->>'value')::numeric)) pair
 from msrc_abstracts.advisory_records r join msrc_abstracts.advisory_jobs j on j.id=r.job_id
 join msrc_abstracts.settings_versions v on v.edition_key=j.edition_key and v.version=j.rubric_version
 cross join lateral jsonb_array_elements(r.scores) ai
 cross join lateral jsonb_array_elements(case when r.gate_observations is null then v.configuration->'rubric' else msrc_abstracts.rubric_2027() end) criterion
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
revoke all on function public.msrc_staff_advisory_submission(text,uuid),public.msrc_staff_advisory_confirm_item(text,uuid,text,integer,text,uuid),public.msrc_staff_advisory_confirm_screening(text,uuid,integer,integer,uuid,jsonb,uuid,text[]) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_advisory_submission(text,uuid),public.msrc_staff_advisory_confirm_item(text,uuid,text,integer,text,uuid),public.msrc_staff_advisory_confirm_screening(text,uuid,integer,integer,uuid,jsonb,uuid,text[]) to authenticated;
notify pgrst,'reload schema';
commit;
