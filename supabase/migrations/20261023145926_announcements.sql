-- ENG-067 / ORG-059. EML-01--05, ADM-02, ROL-10/12, SEC-01/02/06,
-- LOC-01/03, PRV-03/05. Review only: no settings, flags, delivery or cron seed.
begin;
create schema msrc_announcements;
revoke all on schema msrc_announcements from public,anon,authenticated,service_role;
alter default privileges in schema msrc_announcements revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema msrc_announcements revoke execute on functions from public,anon,authenticated,service_role;

create table msrc_announcements.announcements (
 id uuid primary key default gen_random_uuid(),
 edition_key text not null references msrc_authorization.edition_config(edition_key) on delete restrict,
 subject_en text not null,subject_ar text not null,body_en text not null,body_ar text not null,
 segments text[] not null check(cardinality(segments) between 1 and 11),
 state text not null default 'draft' check(state in('draft','scheduled','sending','sent','cancelled')),
 created_by uuid not null,created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),version integer not null default 1 check(version>0),
 scheduled_at timestamptz,preview_token text,authorized_by uuid,authorized_session uuid,
 sent_at timestamptz,last_error text check(last_error is null or last_error in('audience_changed','author_no_longer_authorized')),
 check(scheduled_at is null or isfinite(scheduled_at)),
 check(preview_token is null or preview_token ~ '^[a-f0-9]{64}$')
);
create index announcements_edition on msrc_announcements.announcements(edition_key,created_at desc,id);
create index announcements_due on msrc_announcements.announcements(scheduled_at,id) where state='scheduled';
create table msrc_announcements.recipients (
 announcement_id uuid not null references msrc_announcements.announcements(id) on delete restrict,
 actor_id uuid not null,email text not null,outbox_id uuid not null unique references msrc_outbox.identities(id) on delete restrict,
 published_at timestamptz not null default clock_timestamp(),primary key(announcement_id,actor_id)
);
create index announcement_recipients_actor on msrc_announcements.recipients(actor_id,published_at desc,announcement_id);
create table msrc_announcements.inbox (
 announcement_id uuid not null,actor_id uuid not null,read_at timestamptz,
 primary key(announcement_id,actor_id),foreign key(announcement_id,actor_id)
 references msrc_announcements.recipients(announcement_id,actor_id) on delete restrict
);
create table msrc_announcements.operations (
 edition_key text not null,actor_id uuid not null,operation_id uuid not null,
 announcement_id uuid not null references msrc_announcements.announcements(id) on delete restrict,
 input_hash bytea not null,created_at timestamptz not null default clock_timestamp(),
 primary key(edition_key,actor_id,operation_id)
);
create index announcement_operations_target on msrc_announcements.operations(announcement_id);
create table msrc_announcements.audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,announcement_id uuid not null,
 actor_id uuid,session_id uuid,event text not null check(event in('created','edited','previewed','scheduled','enqueued','cancelled','schedule_blocked','sent')),
 details jsonb not null default '{}'::jsonb,created_at timestamptz not null default clock_timestamp()
);
create index announcement_audit_edition on msrc_announcements.audit(edition_key,created_at,id);
do $$declare t text;begin
 foreach t in array array['announcements','recipients','inbox','operations','audit'] loop
 execute format('alter table msrc_announcements.%I enable row level security',t);
 execute format('alter table msrc_announcements.%I force row level security',t);
 if t in('recipients','operations','audit') then
 execute format('create trigger announcement_append_only before insert or update or delete on msrc_announcements.%I for each row execute function msrc_staff.audit_immutable()',t);
 execute format('create trigger announcement_no_truncate before truncate on msrc_announcements.%I for each statement execute function msrc_staff.audit_immutable()',t);
 end if;end loop;
end$$;
revoke all on all tables in schema msrc_announcements from public,anon,authenticated,service_role;

create function msrc_announcements.guard() returns void language plpgsql security invoker set search_path='' as $$begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Announcements require READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
end$$;
create function msrc_announcements.record(a msrc_announcements.announcements,event_name text,details jsonb default '{}'::jsonb) returns void
 language sql security definer set search_path='' as $$
 insert into msrc_announcements.audit(edition_key,announcement_id,actor_id,session_id,event,details)
 values(a.edition_key,a.id,auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,event_name,details);
$$;
create function msrc_announcements.text_valid(value text,subject boolean) returns boolean
 language sql immutable security invoker set search_path='' as $$
 -- Match JavaScript trim and UTF-16 string length, including astral characters.
 select coalesce(char_length(translate(value,U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF',''))>0
 and char_length(value)+regexp_count(value,U&'[\+010000-\+10FFFF]')<=case when subject then 90 else 3500 end
 and (case when subject then value else translate(value,E'\t\r\n','') end) !~ '[[:cntrl:]]'
 and value !~* '<[!/?a-z][^>]*>',false);
$$;
create function msrc_announcements.message_valid(template text,version integer,locale text,recipient text,payload jsonb) returns boolean
 language sql stable security invoker set search_path='' as $$
 select coalesce(template='announcement' and version=1 and locale='en'
 and char_length(recipient)<=254 and recipient ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
 and jsonb_typeof(payload)='object'
 and payload=jsonb_build_object('subject_en',payload->'subject_en','subject_ar',payload->'subject_ar','body_en',payload->'body_en','body_ar',payload->'body_ar')
 and jsonb_typeof(payload->'subject_en')='string' and jsonb_typeof(payload->'subject_ar')='string'
 and jsonb_typeof(payload->'body_en')='string' and jsonb_typeof(payload->'body_ar')='string'
 and msrc_announcements.text_valid(payload->>'subject_en',true) and msrc_announcements.text_valid(payload->>'subject_ar',true)
 and msrc_announcements.text_valid(payload->>'body_en',false) and msrc_announcements.text_valid(payload->>'body_ar',false),false);
$$;
-- Source segments only. No invented workshop, hackathon or attendance sources.
-- Every address must still belong to a verified, undeleted active account.
create function msrc_announcements.audience(edition text) returns table(segment text,actor_id uuid,email text)
 language sql stable security definer set search_path='' as $$
 with eligible as (
 select u.id,u.email from auth.users u join msrc_authorization.account_access a on a.actor_id=u.id and a.state='active'
 where u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false)
 and char_length(u.email)<=254 and u.email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
 ), members as (
 select 'verified_participants'::text segment,p.actor_id from msrc_participant.profiles p
 where p.state='verified' and msrc_participant.participant_only(p.actor_id)
 union all select case r.status when 'pending_approval' then 'registration_pending'
 when 'approved_awaiting_payment' then 'registration_approved' else 'registration_'||r.status end,r.actor_id
 from msrc_registration.requests r where r.edition_key=edition
 and r.status in('pending_approval','approved','approved_awaiting_payment','confirmed','waitlisted','offered')
 union all select 'abstract_submitters',s.actor_id from msrc_abstracts.submissions s
 where s.edition_key=edition and s.finalized_at is not null
 union all select 'accepted_presenters',s.actor_id from msrc_abstracts.submissions s
 where s.edition_key=edition and s.status='accepted'
 union all select 'active_staff',g.actor_id from msrc_authorization.role_grants g
 join msrc_staff.profiles p on p.actor_id=g.actor_id
 where g.edition_key=edition and g.state='active' and g.role_name<>'participant'
 union all select 'reviewers',g.actor_id from msrc_authorization.role_grants g
 join msrc_staff.profiles p on p.actor_id=g.actor_id
 where g.edition_key=edition and g.state='active' and g.role_name in('abstractReviewer','hackathonReviewer','threeMinuteThesisReviewer')
 union all select 'checkin_staff',g.actor_id from msrc_authorization.role_grants g
 join msrc_staff.profiles p on p.actor_id=g.actor_id
 where g.edition_key=edition and g.state='active' and g.role_name='checkInStaff'
 ) select distinct m.segment,e.id,e.email from members m join eligible e on e.id=m.actor_id;
$$;
-- A single statement materializes the recipient identity/email membership and
-- per-segment counts. Both preview and send hash exactly that value and version.
create function msrc_announcements.preview(a msrc_announcements.announcements) returns jsonb
 language sql stable security definer set search_path='' as $$
 with membership as materialized (
 select * from msrc_announcements.audience(a.edition_key) x where x.segment=any(a.segments)
 ), recipients as (select distinct actor_id,email from membership), data as (
 select coalesce((select jsonb_agg(jsonb_build_object('actorId',r.actor_id,'email',r.email) order by r.actor_id) from recipients r),'[]'::jsonb) as recipients,
 coalesce((select jsonb_agg(jsonb_build_object('segment',s.segment,'count',(select count(*) from membership m where m.segment=s.segment)) order by s.segment)
 from unnest(a.segments) s(segment)),'[]'::jsonb) as segments
 ) select jsonb_build_object('previewToken',encode(sha256(convert_to(jsonb_build_array(a.id,a.version,a.subject_en,a.subject_ar,a.body_en,a.body_ar,a.segments,d.recipients,d.segments)::text,'UTF8')),'hex'),
 'total',jsonb_array_length(d.recipients),'segments',d.segments,'recipients',d.recipients,
 'samples',coalesce((select jsonb_agg(left(r.email,1)||'***@'||left(split_part(r.email,'@',2),1)||'***' order by r.actor_id)
 from (select * from recipients order by actor_id limit 5) r),'[]'::jsonb)) from data d;
$$;
create function msrc_announcements.projection(a msrc_announcements.announcements) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',a.id,'editionKey',a.edition_key,'subjectEn',a.subject_en,'subjectAr',a.subject_ar,
 'bodyEn',a.body_en,'bodyAr',a.body_ar,'segments',a.segments,'state',a.state,'version',a.version,
 'createdAt',a.created_at,'updatedAt',a.updated_at,'scheduledAt',a.scheduled_at,'sentAt',a.sent_at,'lastError',a.last_error,
 'recipientCount',count(r.actor_id),'sentCount',count(r.actor_id) filter(where coalesce(m.status,i.terminal_status)='sent'),
 'failedCount',count(r.actor_id) filter(where coalesce(m.status,i.terminal_status) in('failed_retryable','failed_permanent')))
 from msrc_announcements.recipients r left join msrc_outbox.identities i on i.id=r.outbox_id
 left join msrc_outbox.messages m on m.id=r.outbox_id where r.announcement_id=a.id;
$$;
create function msrc_announcements.protect_content() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if tg_op='DELETE' or tg_op='TRUNCATE' then raise exception using errcode='55000',message='Announcement history is immutable.';end if;
 if old.state in('sending','sent','cancelled') and (new.subject_en,new.subject_ar,new.body_en,new.body_ar,new.segments,new.edition_key,new.created_by,new.created_at)
 is distinct from (old.subject_en,old.subject_ar,old.body_en,old.body_ar,old.segments,old.edition_key,old.created_by,old.created_at) then
 raise exception using errcode='55000',message='Published announcement content is immutable.';end if;
 return new;
end$$;
create trigger announcement_content_guard before update or delete on msrc_announcements.announcements for each row execute function msrc_announcements.protect_content();
create trigger announcement_no_truncate before truncate on msrc_announcements.announcements for each statement execute function msrc_announcements.protect_content();

alter table msrc_outbox.messages drop constraint outbox_template_input_check;
alter table msrc_outbox.messages add constraint outbox_template_input_check check(
 (template_key='synthetic_notice' and recipient_email~'^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$' and jsonb_typeof(payload)='object'
 and payload=jsonb_build_object('reference',payload->'reference') and jsonb_typeof(payload->'reference') is not distinct from 'string' and coalesce(payload->>'reference'~'^[A-Za-z0-9_-]{1,80}$',false))
 or msrc_outbox.registration_message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_abstracts.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_announcements.message_valid(template_key,template_version,locale,recipient_email,payload));
alter table msrc_outbox.messages add constraint announcement_draft_delivery_hold check(template_key<>'announcement' or(delivery_hold and status not in('sending','sent')));

-- Extend the one private producer, preserving existing registration semantics,
-- durable deduplication and provider keys. The generic public producer continues
-- to reject every business template. DRAFT announcement jobs always hold delivery.
create or replace function msrc_outbox.enqueue(p_idempotency_key text,p_template_key text,p_template_version integer,
 p_locale text,p_recipient_email text,p_payload jsonb) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare v_key bytea;v_input bytea;v_identity msrc_outbox.identities%rowtype;v_created boolean;v_status text;synthetic_valid boolean;
begin
 if current_user<>'postgres' then raise exception using errcode='42501',message='Outbox enqueue denied.';end if;
 synthetic_valid:=coalesce(p_template_key='synthetic_notice' and p_template_version=1 and p_locale in('en','ar')
 and p_recipient_email ~ '^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$' and jsonb_typeof(p_payload)='object'
 and p_payload=jsonb_build_object('reference',p_payload->'reference')
 and jsonb_typeof(p_payload->'reference')='string' and p_payload->>'reference' ~ '^[A-Za-z0-9_-]{1,80}$',false);
 if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_./:-]{1,200}$'
 or not(synthetic_valid or msrc_outbox.registration_message_valid(p_template_key,p_template_version,p_locale,p_recipient_email,p_payload)
 or msrc_announcements.message_valid(p_template_key,p_template_version,p_locale,p_recipient_email,p_payload)) then
 raise exception using errcode='22023',message='Invalid outbox message.';end if;
 v_key:=sha256(convert_to(p_idempotency_key,'UTF8'));
 v_input:=sha256(convert_to(jsonb_build_array(p_template_key,p_template_version,p_locale,p_recipient_email,p_payload)::text,'UTF8'));
 insert into msrc_outbox.identities(key_hash,input_hash) values(v_key,v_input) on conflict do nothing returning * into v_identity;
 v_created:=found;
 if not v_created then
 select * into strict v_identity from msrc_outbox.identities where key_hash=v_key for update;
 if v_identity.input_hash<>v_input then raise exception using errcode='22023',message='Outbox idempotency conflict.';end if;
 else
 insert into msrc_outbox.messages(id,template_key,template_version,locale,recipient_email,payload,provider_idempotency_key,delivery_hold)
 values(v_identity.id,p_template_key,p_template_version,p_locale,p_recipient_email,p_payload,'msrc-outbox/'||v_identity.id::text,p_template_key='announcement');
 end if;
 select status into v_status from msrc_outbox.messages where id=v_identity.id;
 return jsonb_build_object('id',v_identity.id,'status',coalesce(v_status,v_identity.terminal_status),'created',v_created);
end$$;

create function public.msrc_staff_announcements_list(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_announcements.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready','announcements',coalesce((select jsonb_agg(msrc_announcements.projection(a) order by a.created_at desc,a.id) from
 (select * from msrc_announcements.announcements q where q.edition_key=$1 order by q.created_at desc,q.id limit 100) a),'[]'::jsonb),
 'segments',coalesce((select jsonb_agg(segment order by segment) from(select distinct segment from msrc_announcements.audience(edition_key)) s),'[]'::jsonb));
end$$;
create function public.msrc_staff_announcement_save(edition_key text,input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a msrc_announcements.announcements%rowtype;target uuid;expected integer;selected text[];begin
 perform msrc_announcements.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>65536
 or exists(select 1 from jsonb_object_keys(input) k where k not in('id','expectedVersion','subjectEn','subjectAr','bodyEn','bodyAr','segments'))
 or jsonb_typeof(input->'expectedVersion') is distinct from 'number'
 or not coalesce((input->>'expectedVersion') ~ '^[0-9]{1,9}$',false)
 or jsonb_typeof(input->'subjectEn') is distinct from 'string' or jsonb_typeof(input->'subjectAr') is distinct from 'string'
 or jsonb_typeof(input->'bodyEn') is distinct from 'string' or jsonb_typeof(input->'bodyAr') is distinct from 'string'
 or not msrc_announcements.text_valid(input->>'subjectEn',true) or not msrc_announcements.text_valid(input->>'subjectAr',true)
 or not msrc_announcements.text_valid(input->>'bodyEn',false) or not msrc_announcements.text_valid(input->>'bodyAr',false)
 or jsonb_typeof(input->'segments') is distinct from 'array' then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from jsonb_array_elements(input->'segments') x where jsonb_typeof(x)<>'string') then return jsonb_build_object('state','invalid');end if;
 select array_agg(s order by s) into selected from jsonb_array_elements_text(input->'segments') s;
 if selected is null or cardinality(selected) not between 1 and 11 or cardinality(selected)<>(select count(distinct x) from unnest(selected) x)
 or exists(select 1 from unnest(selected) x where x not in('verified_participants','registration_pending','registration_approved','registration_confirmed','registration_waitlisted','registration_offered','abstract_submitters','accepted_presenters','reviewers','checkin_staff','active_staff')) then return jsonb_build_object('state','invalid');end if;
 expected:=(input->>'expectedVersion')::integer;
 if input->>'id' is not null then
 if (input->>'id') !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then return jsonb_build_object('state','invalid');end if;
 target:=(input->>'id')::uuid;end if;
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if target is null then
 if expected<>0 then return jsonb_build_object('state','conflict');end if;
 insert into msrc_announcements.announcements(edition_key,subject_en,subject_ar,body_en,body_ar,segments,created_by)
 values(edition_key,input->>'subjectEn',input->>'subjectAr',input->>'bodyEn',input->>'bodyAr',selected,auth.uid()) returning * into a;
 perform msrc_announcements.record(a,'created');
 else
 select * into a from msrc_announcements.announcements q where q.id=target and q.edition_key=$1 for update;
 if a.id is null or a.version<>expected or a.state not in('draft','scheduled') then return jsonb_build_object('state','conflict');end if;
 update msrc_announcements.announcements q set subject_en=input->>'subjectEn',subject_ar=input->>'subjectAr',body_en=input->>'bodyEn',body_ar=input->>'bodyAr',
 segments=selected,state='draft',version=q.version+1,updated_at=clock_timestamp(),last_error=null,preview_token=null,scheduled_at=null,
 authorized_by=null,authorized_session=null where q.id=a.id returning * into a;
 perform msrc_announcements.record(a,'edited');end if;
 return jsonb_build_object('state','updated','announcement',msrc_announcements.projection(a));
end$$;
create function public.msrc_staff_announcement_preview(edition_key text,announcement_id uuid,expected_version integer) returns jsonb
 language plpgsql security definer set search_path='' as $$declare a msrc_announcements.announcements%rowtype;p jsonb;begin
 perform msrc_announcements.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into a from msrc_announcements.announcements q where q.id=announcement_id and q.edition_key=$1 for update;
 if a.id is null or a.version is distinct from expected_version or a.state<>'draft' then return jsonb_build_object('state','conflict');end if;
 p:=msrc_announcements.preview(a);
 perform msrc_announcements.record(a,'previewed',jsonb_build_object('total',p->'total'));
 return jsonb_build_object('state','ready','preview',p-'recipients');
end$$;

-- The caller holds the edition lock and has already compared its preview against
-- this exact materialized membership. No second live query can change the set.
create function msrc_announcements.publish(a msrc_announcements.announcements,p jsonb) returns msrc_announcements.announcements
 language plpgsql security definer set search_path='' as $$declare r jsonb;job jsonb;instant timestamptz:=clock_timestamp();begin
 for r in select value from jsonb_array_elements(p->'recipients') loop
 job:=msrc_outbox.enqueue('announcement/'||a.id::text||'/'||(r->>'actorId'),'announcement',1,'en',r->>'email',
 jsonb_build_object('subject_en',a.subject_en,'subject_ar',a.subject_ar,'body_en',a.body_en,'body_ar',a.body_ar));
 insert into msrc_announcements.recipients(announcement_id,actor_id,email,outbox_id,published_at)
 values(a.id,(r->>'actorId')::uuid,r->>'email',(job->>'id')::uuid,instant);
 insert into msrc_announcements.inbox(announcement_id,actor_id) values(a.id,(r->>'actorId')::uuid);
 end loop;
 update msrc_announcements.announcements q set state='sending',version=q.version+1,updated_at=instant,last_error=null where q.id=a.id returning * into a;
 perform msrc_announcements.record(a,'enqueued',jsonb_build_object('total',p->'total','emailState','draft_held'));
 return a;
end$$;
create function public.msrc_staff_announcement_send(edition_key text,announcement_id uuid,expected_version integer,preview_token text,operation_id uuid,scheduled_at timestamptz default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a msrc_announcements.announcements%rowtype;o msrc_announcements.operations%rowtype;p jsonb;digest bytea;begin
 perform msrc_announcements.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or preview_token is null or preview_token !~ '^[a-f0-9]{64}$' or expected_version is null
 or (scheduled_at is not null and not isfinite(scheduled_at)) then return jsonb_build_object('state','invalid');end if;
 digest:=sha256(convert_to(jsonb_build_array('send',announcement_id,expected_version,preview_token,scheduled_at)::text,'UTF8'));
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into o from msrc_announcements.operations x where x.edition_key=$1 and x.actor_id=auth.uid() and x.operation_id=$5;
 if found then
 if o.input_hash<>digest then return jsonb_build_object('state','conflict');end if;
 select * into strict a from msrc_announcements.announcements x where x.id=o.announcement_id;
 return jsonb_build_object('state','updated','announcement',msrc_announcements.projection(a));end if;
 select * into a from msrc_announcements.announcements x where x.edition_key=$1 and x.id=announcement_id for update;
 if a.id is null or a.version<>expected_version or a.state<>'draft' then return jsonb_build_object('state','conflict');end if;
 p:=msrc_announcements.preview(a);
 if p->>'previewToken'<>preview_token then return jsonb_build_object('state','conflict');end if;
 if (p->>'total')::integer=0 then return jsonb_build_object('state','invalid');end if;
 if scheduled_at is not null and scheduled_at<=clock_timestamp() then return jsonb_build_object('state','not_due');end if;
 update msrc_announcements.announcements x set preview_token=$4,scheduled_at=$6,authorized_by=auth.uid(),authorized_session=(auth.jwt()->>'session_id')::uuid,
 last_error=null where x.id=a.id returning * into a;
 if scheduled_at is null then a:=msrc_announcements.publish(a,p);
 else update msrc_announcements.announcements x set state='scheduled',version=x.version+1,updated_at=clock_timestamp() where x.id=a.id returning * into a;
 perform msrc_announcements.record(a,'scheduled',jsonb_build_object('total',p->'total','scheduledAt',scheduled_at));end if;
 insert into msrc_announcements.operations(edition_key,actor_id,operation_id,announcement_id,input_hash) values(edition_key,auth.uid(),operation_id,a.id,digest);
 return jsonb_build_object('state','updated','announcement',msrc_announcements.projection(a));
end$$;
create function public.msrc_staff_announcement_cancel(edition_key text,announcement_id uuid,expected_version integer,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a msrc_announcements.announcements%rowtype;o msrc_announcements.operations%rowtype;digest bytea;begin
 perform msrc_announcements.guard();
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or expected_version is null then return jsonb_build_object('state','invalid');end if;
 digest:=sha256(convert_to(jsonb_build_array('cancel',announcement_id,expected_version)::text,'UTF8'));
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition_key,0));
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into o from msrc_announcements.operations x where x.edition_key=$1 and x.actor_id=auth.uid() and x.operation_id=$4;
 if found then
 if o.input_hash<>digest then return jsonb_build_object('state','conflict');end if;
 select * into strict a from msrc_announcements.announcements x where x.id=o.announcement_id;
 return jsonb_build_object('state','updated','announcement',msrc_announcements.projection(a));end if;
 select * into a from msrc_announcements.announcements x where x.edition_key=$1 and x.id=announcement_id for update;
 if a.id is null or a.version<>expected_version or a.state not in('draft','scheduled') then return jsonb_build_object('state','conflict');end if;
 update msrc_announcements.announcements x set state='cancelled',version=x.version+1,updated_at=clock_timestamp() where x.id=a.id returning * into a;
 perform msrc_announcements.record(a,'cancelled');
 insert into msrc_announcements.operations(edition_key,actor_id,operation_id,announcement_id,input_hash) values(edition_key,auth.uid(),operation_id,a.id,digest);
 return jsonb_build_object('state','updated','announcement',msrc_announcements.projection(a));
end$$;

create function public.msrc_announcements_maintenance(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a msrc_announcements.announcements%rowtype;p jsonb;total integer:=0;blocked integer:=0;begin
 perform msrc_announcements.guard();perform msrc_registration.server_only();
 if not msrc_staff.ready() or not msrc_participant.ready()
 or not coalesce((select s.sweeps_enabled from msrc_outbox.settings s where s.singleton),false) then return jsonb_build_object('state','closed');end if;
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition_key,0));
 for a in select * from msrc_announcements.announcements x where x.edition_key=$1 and x.state='scheduled' and x.scheduled_at<=clock_timestamp() order by x.scheduled_at,x.id for update limit 20 loop
 -- A schedule is a recorded SA authorization, not a perpetual session. The due
 -- action rechecks current account/grant/recovery status; no synthetic JWT.
 if not exists(select 1 from msrc_authorization.role_grants g join msrc_authorization.account_access x on x.actor_id=g.actor_id
 where g.actor_id=a.authorized_by and g.edition_key=$1 and g.state='active' and g.role_name='superAdmin' and g.scope_kind='edition' and x.state='active')
 or msrc_staff.recovery_blocked(a.authorized_by) then
 update msrc_announcements.announcements x set state='draft',scheduled_at=null,version=x.version+1,updated_at=clock_timestamp(),last_error='author_no_longer_authorized' where x.id=a.id returning * into a;
 blocked:=blocked+1;perform msrc_announcements.record(a,'schedule_blocked',jsonb_build_object('reason',a.last_error));continue;end if;
 -- Scheduling increments version once. Hash the version the SA previewed.
 a.version:=a.version-1;p:=msrc_announcements.preview(a);a.version:=a.version+1;
 if p->>'previewToken' is distinct from a.preview_token or (p->>'total')::integer=0 then
 update msrc_announcements.announcements x set state='draft',scheduled_at=null,version=x.version+1,updated_at=clock_timestamp(),last_error='audience_changed' where x.id=a.id returning * into a;
 blocked:=blocked+1;perform msrc_announcements.record(a,'schedule_blocked',jsonb_build_object('reason',a.last_error));continue;end if;
 a:=msrc_announcements.publish(a,p);total:=total+1;
 end loop;
 for a in select * from msrc_announcements.announcements x where x.edition_key=$1 and x.state='sending'
 and exists(select 1 from msrc_announcements.recipients r where r.announcement_id=x.id)
 and not exists(select 1 from msrc_announcements.recipients r join msrc_outbox.identities i on i.id=r.outbox_id
 left join msrc_outbox.messages m on m.id=r.outbox_id where r.announcement_id=x.id and coalesce(m.status,i.terminal_status) is distinct from 'sent') for update loop
 update msrc_announcements.announcements x set state='sent',sent_at=clock_timestamp(),updated_at=clock_timestamp(),version=x.version+1 where x.id=a.id returning * into a;
 perform msrc_announcements.record(a,'sent');end loop;
 return jsonb_build_object('state','updated','started',total,'needsReview',blocked);
end$$;

create function public.msrc_participant_announcements(edition_key text,session_claims jsonb,announcement_id uuid default null,mark_read boolean default false) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_announcements.guard();perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 if not msrc_participant.ready() then result:=jsonb_build_object('state','closed');
 elsif not coalesce(msrc_registration.participant_current(edition_key),false) then result:=jsonb_build_object('state','denied');
 elsif mark_read and (announcement_id is null or not exists(select 1 from msrc_announcements.inbox i join msrc_announcements.announcements a on a.id=i.announcement_id where a.edition_key=$1 and i.actor_id=auth.uid() and i.announcement_id=$3)) then result:=jsonb_build_object('state','denied');
 else
 if mark_read then update msrc_announcements.inbox i set read_at=coalesce(i.read_at,clock_timestamp()) where i.actor_id=auth.uid() and i.announcement_id=$3;end if;
 select jsonb_build_object('state','ready','announcements',coalesce(jsonb_agg(jsonb_build_object('id',x.id,'subjectEn',x.subject_en,'subjectAr',x.subject_ar,
 'bodyEn',x.body_en,'bodyAr',x.body_ar,'publishedAt',x.published_at,'readAt',x.read_at) order by x.published_at desc,x.id),'[]'::jsonb)) into result from (
 select a.id,a.subject_en,a.subject_ar,a.body_en,a.body_ar,r.published_at,i.read_at from msrc_announcements.inbox i
 join msrc_announcements.recipients r on r.announcement_id=i.announcement_id and r.actor_id=i.actor_id
 join msrc_announcements.announcements a on a.id=i.announcement_id
 where i.actor_id=auth.uid() and a.edition_key=$1 and ($3 is null or mark_read or a.id=$3)
 order by r.published_at desc,a.id limit 100) x;
 end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

revoke all on all functions in schema msrc_announcements from public,anon,authenticated,service_role;
do $$declare p record;begin
 for p in select oid::regprocedure signature from pg_proc where pronamespace='public'::regnamespace
 and (proname like 'msrc_staff_announcement_%' or proname='msrc_staff_announcements_list') loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',p.signature);
 execute format('grant execute on function %s to authenticated',p.signature);end loop;
end$$;
revoke all on function public.msrc_announcements_maintenance(text),public.msrc_participant_announcements(text,jsonb,uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.msrc_announcements_maintenance(text),public.msrc_participant_announcements(text,jsonb,uuid,boolean) to service_role;
comment on table msrc_announcements.announcements is 'ORG-059 essential conference communications; no opt-out or preferences. Plain text EN/AR content. DRAFT email layout remains held pending owner approval; no hosted activation.';
comment on table msrc_announcements.recipients is 'Immutable live-at-send account/address snapshot. Private delivery identity only; no public attendee directory. Retention requires owner review before activation.';
comment on function public.msrc_announcements_maintenance(text) is 'Existing authenticated outbox drain only, no new scheduler. Due audiences must exactly match the SA preview or return to draft for review. Recorded SA authorization is rechecked against current account, edition grant and recovery status.';
notify pgrst,'reload schema';
commit;
