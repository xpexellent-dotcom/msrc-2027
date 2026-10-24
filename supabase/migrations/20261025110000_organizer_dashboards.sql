-- ENG-079 / ADM-01..05. Review only: no hosted changes, settings or activation.
begin;

create table msrc_staff.reporting_audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,
 actor_id uuid not null,session_id uuid not null,
 action text not null check(action in('participant.find','export.generate')),
 row_count bigint not null check(row_count>=0),
 filters jsonb not null default '{}'::jsonb check(jsonb_typeof(filters)='object'
 and filters-array['module','kind','status','queryKind','actor','action','from','to','offset']='{}'::jsonb),
 occurred_at timestamptz not null default clock_timestamp()
);
alter table msrc_staff.reporting_audit enable row level security;
alter table msrc_staff.reporting_audit force row level security;
revoke all on msrc_staff.reporting_audit from public,anon,authenticated,service_role;
create index reporting_audit_history on msrc_staff.reporting_audit(edition_key,occurred_at desc,id);
create trigger reporting_audit_immutable before insert or update or delete on msrc_staff.reporting_audit
 for each row execute function msrc_staff.audit_immutable();
create trigger reporting_audit_no_truncate before truncate on msrc_staff.reporting_audit
 for each statement execute function msrc_staff.audit_immutable();
comment on table msrc_staff.reporting_audit is 'ADM-02/03/04 immutable reporting receipts. Counts and validated enum/date/opaque-actor filters only; never lookup text, names, emails, exported rows, manuscripts, feedback, credentials or document identifiers. Existing owner audit-retention runbook applies.';

create function msrc_staff.reporting_guard() returns void language plpgsql security invoker set search_path='' as $$begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Staff reporting requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
end$$;

-- Edition-wide module authority follows existing operational RPCs. Narrow grants
-- never become edition authority. Reviewers receive only their own assignments.
create function msrc_staff.reporting_modules(edition text) returns text[] language plpgsql security definer set search_path='' as $$
declare modules text[]:='{}'::text[];begin
 if msrc_staff.authorize(edition,null,false) is null then return modules;end if;
 if msrc_staff.authorize(edition,array['superAdmin'],false) is not null then
 return array['registrations','accounts','orders','submissions','reviews','accepted','workshops','attendance','certificates','announcements','hackathon','three_minute_thesis','email_failures'];end if;
 if msrc_staff.authorize(edition,array['registrationWorkshopAdministrator'],false) is not null then
 modules:=modules||array['registrations','workshops','attendance','certificates'];end if;
 if msrc_staff.authorize(edition,array['checkInStaff'],false) is not null then modules:=modules||array['workshops','attendance'];end if;
 if msrc_staff.authorize(edition,array['finance'],false) is not null then modules:=modules||array['orders'];end if;
 if msrc_staff.authorize(edition,array['scientificAdministrator'],false) is not null then
 modules:=modules||array['submissions','reviews','accepted','hackathon','three_minute_thesis'];end if;
 if msrc_staff.authorize(edition,array['judgingCommittee'],false) is not null then
 modules:=modules||array['accepted','hackathon','three_minute_thesis'];end if;
 if exists(select 1 from msrc_authorization.role_grants g where g.actor_id=auth.uid() and g.edition_key=edition and g.state='active'
 and g.role_name in('abstractReviewer','hackathonReviewer','threeMinuteThesisReviewer','facultyJudge')) then modules:=modules||array['reviews'];end if;
 return array(select distinct m from unnest(modules) m order by m);
end$$;

create function msrc_staff.reporting_review_scope(edition text,roles text[],track_name text,assignment_id uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from msrc_authorization.role_grants g where g.actor_id=auth.uid() and g.edition_key=edition and g.state='active'
 and g.role_name=any(roles) and (g.scope_kind='edition' or (g.scope_kind='assignment' and g.scope_target=assignment_id::text)
 or (g.scope_kind='track' and g.track=track_name and g.scope_target=track_name)));
$$;

-- Participant accounts are platform-wide; there is no participant role grant.
-- An account belongs to an edition's reporting scope once it holds any record there.
create function msrc_staff.reporting_edition_participant(target uuid,edition text) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from msrc_registration.requests r where r.actor_id=target and r.edition_key=edition)
 or exists(select 1 from msrc_abstracts.submissions s where s.actor_id=target and s.edition_key=edition)
 or exists(select 1 from msrc_competitions.entries e where e.lead_id=target and e.edition_key=edition)
 or exists(select 1 from msrc_competitions.roster r join msrc_competitions.entries e on e.id=r.entry_id where r.actor_id=target and e.edition_key=edition)
 or exists(select 1 from msrc_workshops.bookings b join msrc_workshops.workshops w on w.id=b.workshop_id where b.actor_id=target and w.edition_key=edition);
$$;

create function msrc_staff.reporting_status_valid(module_name text,status_name text) returns boolean
 language sql immutable security invoker set search_path='' as $$
 select status_name='all' or case module_name
 when 'registrations' then status_name=any(array['pending_approval','approved','approved_awaiting_payment','waitlisted','offered','confirmed','cancelled','expired'])
 when 'accounts' then status_name=any(array['pending','verified'])
 when 'orders' then status_name='mock_settled'
 when 'submissions' then status_name=any(array['draft','submitted','scientific_review','revision_requested','revision_expired','accepted','rejected','withdrawn'])
 when 'reviews' then status_name=any(array['assigned','draft','completed','declined','conflict','withdrawn'])
 when 'accepted' then status_name='accepted'
 when 'workshops' then status_name=any(array['held','approved','waitlisted','offered','confirmed','declined','cancelled','expired'])
 when 'attendance' then status_name ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
 when 'certificates' then status_name=any(array['pending','issued','revoked','replaced'])
 when 'announcements' then status_name=any(array['draft','scheduled','sending','sent','cancelled'])
 when 'hackathon' then status_name=any(array['draft','submitted','review','accepted','rejected'])
 when 'three_minute_thesis' then status_name=any(array['draft','submitted','review','accepted','rejected'])
 when 'email_failures' then status_name=any(array['failed_retryable','failed_permanent']) else false end;
$$;

-- These references contain neither a credential nor a download/verification code.
create function msrc_staff.reporting_records(edition text,module_name text)
 returns table(reference text,status text,actor_id uuid) language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare science boolean:=msrc_staff.authorize(edition,array['superAdmin','scientificAdministrator'],false) is not null;begin
 if module_name='registrations' then return query select r.id::text,r.status,r.actor_id from msrc_registration.requests r where r.edition_key=edition;
 elsif module_name='accounts' then return query select p.actor_id::text,p.state,p.actor_id from msrc_participant.profiles p where msrc_staff.reporting_edition_participant(p.actor_id,edition);
 elsif module_name='orders' then return query select o.id::text,'mock_settled'::text,o.actor_id from msrc_workshops.orders o join msrc_workshops.bookings b on b.id=o.booking_id join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=edition and o.kind='mock';
 elsif module_name='submissions' then return query select coalesce(s.reference,s.id::text),s.status,s.actor_id from msrc_abstracts.submissions s where s.edition_key=edition;
 elsif module_name='reviews' then
 return query select a.id::text,a.status,a.reviewer_id from msrc_abstracts.assignments a where a.edition_key=edition and (science or (a.reviewer_id=auth.uid() and msrc_staff.reporting_review_scope(edition,array['abstractReviewer'],'research',a.id)))
 union all select a.id::text,a.status,a.reviewer_id from msrc_competitions.assignments a join msrc_competitions.entries e on e.id=a.entry_id where e.edition_key=edition and (science or (a.reviewer_id=auth.uid() and msrc_staff.reporting_review_scope(edition,array[case when e.kind='hackathon' then 'hackathonReviewer' else 'threeMinuteThesisReviewer' end],case when e.kind='hackathon' then 'hackathon' else 'threeMinuteThesis' end,a.id)))
 union all select a.id::text,a.status,a.judge_id from msrc_competitions.judge_assignments a join msrc_competitions.entries e on e.id=a.entry_id where e.edition_key=edition and (science or (a.judge_id=auth.uid() and msrc_staff.reporting_review_scope(edition,array['facultyJudge'],case when e.kind='hackathon' then 'hackathon' else 'threeMinuteThesis' end,a.id)));
 elsif module_name='accepted' then
 return query select coalesce(s.reference,s.id::text),s.status,s.actor_id from msrc_abstracts.submissions s where s.edition_key=edition and s.status='accepted' and science
 union all select e.id::text,e.status,e.lead_id from msrc_competitions.entries e where e.edition_key=edition and e.status='accepted';
 elsif module_name='workshops' then return query select b.id::text,b.status,b.actor_id from msrc_workshops.bookings b join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=edition;
 elsif module_name='attendance' then return query select a.id::text,a.conference_day::text,r.actor_id from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id join msrc_registration.requests r on r.id=t.request_id where r.edition_key=edition and a.undone_at is null;
 elsif module_name='certificates' then return query select c.id::text,c.status,c.actor_id from msrc_certificates.certificates c where c.edition_key=edition;
 elsif module_name='announcements' then return query select a.id::text,a.state,null::uuid from msrc_announcements.announcements a where a.edition_key=edition;
 elsif module_name in('hackathon','three_minute_thesis') then return query select e.id::text,e.status,e.lead_id from msrc_competitions.entries e where e.edition_key=edition and e.kind=module_name and (science or e.status='accepted');
 elsif module_name='email_failures' then return query select i.id::text,coalesce(i.terminal_status,m.status),null::uuid from msrc_outbox.identities i left join msrc_outbox.messages m on m.id=i.id where coalesce(i.terminal_status,m.status) in('failed_retryable','failed_permanent') and exists(select 1 from msrc_announcements.recipients r join msrc_announcements.announcements a on a.id=r.announcement_id where r.outbox_id=i.id and a.edition_key=edition);
 end if;
end$$;

-- Fixed partitions include zero cells. If any member is small, suppress every
-- member of that partition: no published total/complement can reconstruct it.
create function msrc_staff.reporting_cells(edition text,modules text[])
 returns table(module text,dimension text,value text,n bigint) language plpgsql volatile security definer set search_path='' as $$
#variable_conflict use_variable
declare science boolean:=msrc_staff.authorize(edition,array['superAdmin','scientificAdministrator'],false) is not null;begin
 if 'registrations'=any(modules) then return query select 'registrations'::text,'status'::text,v.s,count(r.id) from unnest(array['pending_approval','approved','approved_awaiting_payment','waitlisted','offered','confirmed','cancelled','expired']) v(s) left join msrc_registration.requests r on r.edition_key=edition and r.status=v.s group by v.s;end if;
 if 'accounts'=any(modules) then return query select 'accounts'::text,'status'::text,'verified'::text,count(p.actor_id) from msrc_participant.profiles p join auth.users u on u.id=p.actor_id where p.state='verified' and u.email_confirmed_at is not null and u.deleted_at is null and msrc_staff.reporting_edition_participant(p.actor_id,edition);end if;
 if 'orders'=any(modules) then
 return query select 'orders'::text,'status'::text,'mock_settled'::text,count(o.id) from msrc_workshops.orders o join msrc_workshops.bookings b on b.id=o.booking_id join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=edition and o.kind='mock';
 return query select 'orders'::text,'status'::text,'mock_exceptions'::text,count(c.id) from msrc_workshops.conflicts c where c.resolved_at is null and exists(select 1 from msrc_workshops.orders o join msrc_workshops.bookings b on b.id=o.booking_id join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=edition and o.kind='mock' and b.id in(c.booking_id,c.other_booking_id));end if;
 if 'submissions'=any(modules) then
 return query select 'submissions'::text,'stage'::text,v.s,count(s.id) from unnest(array['draft','submitted','scientific_review','revision_requested','revision_expired','accepted','rejected','withdrawn']) v(s) left join msrc_abstracts.submissions s on s.edition_key=edition and s.status=v.s group by v.s;
 return query select 'submissions'::text,'track'::text,'research'::text,count(s.id) from msrc_abstracts.submissions s where s.edition_key=edition;
 return query select 'submissions'::text,'specialty'::text,c.v->>'id',count(s.id) from msrc_abstracts.settings cfg cross join lateral jsonb_array_elements(coalesce(cfg.configuration->'specialties','[]'::jsonb)) c(v) left join msrc_abstracts.submissions s on s.edition_key=edition and s.document->>'specialtyId'=c.v->>'id' where cfg.edition_key=edition group by c.v->>'id';end if;
 if 'reviews'=any(modules) then
 return query select 'reviews'::text,'research'::text,v.s,count(a.id) from unnest(array['assigned','draft','completed','declined','conflict','withdrawn']) v(s) left join msrc_abstracts.assignments a on a.edition_key=edition and a.status=v.s and (science or (a.reviewer_id=auth.uid() and msrc_staff.reporting_review_scope(edition,array['abstractReviewer'],'research',a.id))) group by v.s;
 return query select 'reviews'::text,k.kind,v.s,count(a.id) from unnest(array['hackathon','three_minute_thesis']) k(kind) cross join unnest(array['assigned','completed','conflict','declined']) v(s) left join msrc_competitions.entries e on e.edition_key=edition and e.kind=k.kind left join msrc_competitions.assignments a on a.entry_id=e.id and a.status=v.s and (science or (a.reviewer_id=auth.uid() and msrc_staff.reporting_review_scope(edition,array[case when k.kind='hackathon' then 'hackathonReviewer' else 'threeMinuteThesisReviewer' end],case when k.kind='hackathon' then 'hackathon' else 'threeMinuteThesis' end,a.id))) group by k.kind,v.s;
 return query select 'reviews'::text,'judging'::text,v.s,count(a.id) from unnest(array['assigned','completed','conflict']) v(s) left join msrc_competitions.entries e on e.edition_key=edition left join msrc_competitions.judge_assignments a on a.entry_id=e.id and a.status=v.s and (science or (a.judge_id=auth.uid() and msrc_staff.reporting_review_scope(edition,array['facultyJudge'],case when e.kind='hackathon' then 'hackathon' else 'threeMinuteThesis' end,a.id))) group by v.s;end if;
 if 'accepted'=any(modules) then
 if science then return query select 'accepted'::text,'track'::text,'research'::text,count(s.id) from msrc_abstracts.submissions s where s.edition_key=edition and s.status='accepted';end if;
 return query select 'accepted'::text,'track'::text,k.kind,count(e.id) from unnest(array['hackathon','three_minute_thesis']) k(kind) left join msrc_competitions.entries e on e.edition_key=edition and e.kind=k.kind and e.status='accepted' group by k.kind;end if;
 if 'workshops'=any(modules) then return query select 'workshops'::text,'status'::text,v.s,count(b.id) from unnest(array['held','approved','waitlisted','offered','confirmed','declined','cancelled','expired']) v(s) left join msrc_workshops.workshops w on w.edition_key=edition left join msrc_workshops.bookings b on b.workshop_id=w.id and b.status=v.s group by v.s;end if;
 if 'attendance'=any(modules) then return query select 'attendance'::text,'day'::text,d.day::text,count(a.id) from msrc_registration.settings cfg cross join lateral unnest(cfg.conference_days) d(day) left join msrc_registration.requests r on r.edition_key=edition left join msrc_registration.tickets t on t.request_id=r.id left join msrc_registration.attendance a on a.ticket_id=t.id and a.conference_day=d.day and a.undone_at is null where cfg.edition_key=edition group by d.day;end if;
 if 'certificates'=any(modules) then
 return query select 'certificates'::text,'status'::text,v.s,count(c.id) from unnest(array['pending','issued','revoked','replaced']) v(s) left join msrc_certificates.certificates c on c.edition_key=edition and c.status=v.s group by v.s;
 return query select 'certificates'::text,'eligibility'::text,'eligible_conference'::text,count(r.id) from msrc_registration.requests r where r.edition_key=edition and coalesce((msrc_certificates.eligibility(edition,r.actor_id,'conference',null)->>'eligible')::boolean,false);
 return query select 'certificates'::text,'eligibility'::text,'eligible_workshop'::text,count(b.id) from msrc_workshops.bookings b join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=edition and coalesce((msrc_certificates.eligibility(edition,b.actor_id,'workshop',b.workshop_id)->>'eligible')::boolean,false);end if;
 if 'announcements'=any(modules) then
 return query select 'announcements'::text,'stage'::text,v.s,count(a.id) from unnest(array['draft','scheduled','sending','sent','cancelled']) v(s) left join msrc_announcements.announcements a on a.edition_key=edition and a.state=v.s group by v.s;
 return query select 'announcements'::text,'delivery'::text,v.s,count(r.outbox_id) from unnest(array['queued','sending','sent','failed_retryable','failed_permanent','cancelled']) v(s) left join msrc_announcements.announcements a on a.edition_key=edition left join msrc_announcements.recipients r on r.announcement_id=a.id and exists(select 1 from msrc_outbox.identities i left join msrc_outbox.messages m on m.id=i.id where i.id=r.outbox_id and coalesce(i.terminal_status,m.status)=v.s) group by v.s;end if;
 if 'hackathon'=any(modules) or 'three_minute_thesis'=any(modules) then return query select k.kind,'stage'::text,v.s,count(e.id) from unnest(array['hackathon','three_minute_thesis']) k(kind) cross join unnest(case when science then array['draft','submitted','review','accepted','rejected'] else array['accepted'] end) v(s) left join msrc_competitions.entries e on e.edition_key=edition and e.kind=k.kind and e.status=v.s where k.kind=any(modules) group by k.kind,v.s;end if;
 if 'email_failures'=any(modules) then return query select 'email_failures'::text,'status'::text,v.s,count(r.reference) from unnest(array['failed_retryable','failed_permanent']) v(s) left join msrc_staff.reporting_records(edition,'email_failures') r on r.status=v.s group by v.s;end if;
end$$;

create function public.msrc_staff_dashboard(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare modules text[];cells jsonb;super_admin boolean;begin
 perform msrc_staff.reporting_guard();
 if msrc_staff.authorize(edition_key,null,false) is null then return jsonb_build_object('state','denied');end if;
 modules:=msrc_staff.reporting_modules(edition_key);
 super_admin:=msrc_staff.authorize(edition_key,array['superAdmin'],false) is not null;
 with raw as materialized(select * from msrc_staff.reporting_cells(edition_key,modules)),safe as (
 select r.*,min(r.n) over(partition by r.module,r.dimension) as smallest from raw r)
 select coalesce(jsonb_agg(jsonb_build_object('module',s.module,'dimension',s.dimension,'value',s.value,'count',case when super_admin or s.smallest>=5 then s.n else null end) order by s.module,s.dimension,s.value),'[]'::jsonb) into cells from safe s;
 return jsonb_build_object('state','ready','dashboard',jsonb_build_object('cells',cells,'modules',to_jsonb(modules),'suppressionThreshold',5));
end$$;

create function public.msrc_staff_dashboard_find(edition_key text,query text) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare matches jsonb;query_kind text;begin
 perform msrc_staff.reporting_guard();
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if query is null or char_length(query) not between 1 and 254 or query<>btrim(query) or query ~ '[[:cntrl:]]' then return jsonb_build_object('state','invalid');end if;
 query_kind:=case when strpos(query,'@')>0 then 'email' else 'reference' end;
 with records as materialized(
 select 'accounts'::text module,r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'accounts') r
 union all select 'registrations',r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'registrations') r
 union all select 'orders',r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'orders') r
 union all select 'submissions',r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'submissions') r
 union all select 'workshops',r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'workshops') r
 union all select 'attendance',r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'attendance') r
 union all select 'certificates',r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'certificates') r
 union all select 'hackathon',r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'hackathon') r
 union all select 'three_minute_thesis',r.reference,r.status,r.actor_id from msrc_staff.reporting_records(edition_key,'three_minute_thesis') r
 union all select e.kind,e.id::text,e.status,r.actor_id from msrc_competitions.roster r join msrc_competitions.entries e on e.id=r.entry_id
 where e.edition_key=edition_key and r.actor_id<>e.lead_id),
 matched as (select p.actor_id,p.name,u.email from msrc_participant.profiles p join auth.users u on u.id=p.actor_id
 where msrc_staff.reporting_edition_participant(p.actor_id,edition_key)
 and ((query_kind='email' and lower(u.email)=lower(query)) or (query_kind='reference' and (lower(p.actor_id::text)=lower(query) or exists(select 1 from records r where r.actor_id=p.actor_id and lower(r.reference)=lower(query))
 or exists(select 1 from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id where r.edition_key=edition_key and r.actor_id=p.actor_id and upper(substr(replace(t.id::text,'-',''),1,12))=upper(query))))) order by p.actor_id limit 20)
 select coalesce(jsonb_agg(jsonb_build_object('actorId',p.actor_id,'name',p.name,'email',p.email,'records',coalesce((select jsonb_agg(jsonb_build_object('module',r.module,'reference',r.reference,'status',r.status) order by r.module,r.reference) from records r where r.actor_id=p.actor_id),'[]'::jsonb)) order by p.actor_id),'[]'::jsonb) into matches from matched p;
 insert into msrc_staff.reporting_audit(edition_key,actor_id,session_id,action,row_count,filters)
 values(edition_key,auth.uid(),(auth.jwt()->>'session_id')::uuid,'participant.find',jsonb_array_length(matches),jsonb_build_object('queryKind',query_kind));
 return jsonb_build_object('state','ready','matches',matches);
end$$;

create function public.msrc_staff_dashboard_export(edition_key text,module_filter text,export_kind text default 'aggregate',status_filter text default 'all') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare modules text[];rows jsonb;columns jsonb;dashboard jsonb;begin
 perform msrc_staff.reporting_guard();
 if msrc_staff.authorize(edition_key,null,false) is null then return jsonb_build_object('state','denied');end if;
 modules:=msrc_staff.reporting_modules(edition_key);
 if module_filter is null or (module_filter<>'all' and not module_filter=any(modules)) or export_kind is null or export_kind not in('aggregate','operational','personal') or status_filter is null or not msrc_staff.reporting_status_valid(module_filter,status_filter) then return jsonb_build_object('state','denied');end if;
 if export_kind='personal' and msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if export_kind='aggregate' then
 if status_filter<>'all' then return jsonb_build_object('state','invalid');end if;
 dashboard:=public.msrc_staff_dashboard(edition_key);
 select coalesce(jsonb_agg(jsonb_build_array(c->>'module',c->>'dimension',c->>'value',c->'count') order by c->>'module',c->>'dimension',c->>'value'),'[]'::jsonb) into rows from jsonb_array_elements(dashboard->'dashboard'->'cells') c where module_filter='all' or c->>'module'=module_filter;
 columns:='["module","dimension","value","count"]'::jsonb;
 else
 if module_filter='all' then return jsonb_build_object('state','invalid');end if;
 select coalesce(jsonb_agg(case when export_kind='personal' then jsonb_build_array(module_filter,r.reference,r.status,r.actor_id,p.name,u.email) else jsonb_build_array(module_filter,r.reference,r.status) end order by r.reference,r.status),'[]'::jsonb) into rows
 from msrc_staff.reporting_records(edition_key,module_filter) r left join msrc_participant.profiles p on p.actor_id=r.actor_id left join auth.users u on u.id=r.actor_id where status_filter='all' or r.status=status_filter;
 columns:=case when export_kind='personal' then '["module","reference","status","actorId","name","email"]'::jsonb else '["module","reference","status"]'::jsonb end;
 end if;
 if jsonb_array_length(rows)>100000 then return jsonb_build_object('state','too_large');end if;
 -- Receipt is committed in the same transaction as the authorized snapshot. No
 -- export data, exact lookup query, ciphertext or reusable file URL is retained.
 insert into msrc_staff.reporting_audit(edition_key,actor_id,session_id,action,row_count,filters)
 values(edition_key,auth.uid(),(auth.jwt()->>'session_id')::uuid,'export.generate',jsonb_array_length(rows),jsonb_build_object('module',module_filter,'kind',export_kind,'status',status_filter));
 return jsonb_build_object('state','ready','columns',columns,'rows',rows);
end$$;

-- No joins to identities enrich audit events. Each branch projects only fields
-- already in its source table; credentials/digests are intentionally omitted.
create function public.msrc_staff_dashboard_audit(edition_key text,module_filter text default 'all',actor_filter uuid default null,action_filter text default '',from_at timestamptz default null,to_at timestamptz default null,offset_rows integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare events jsonb;more boolean;begin
 perform msrc_staff.reporting_guard();
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if module_filter is null or module_filter not in('all','security','authorization','sessions','staff_email','participant','participant_retention','registrations','registration_settings','attendance','media','content','site_import','submissions','announcements','announcement_retention','announcement_delivery','identity_retention','workshops','certificates','hackathon','three_minute_thesis','competitions','reporting')
 or action_filter is null or action_filter !~ '^[A-Za-z0-9_.-]{0,100}$' or (from_at is not null and not isfinite(from_at)) or (to_at is not null and not isfinite(to_at)) or from_at>to_at or offset_rows is null or offset_rows not between 0 and 10000 then return jsonb_build_object('state','invalid');end if;
 with timeline as (
 select a.id::text id,'security'::text module,a.actor_id,a.target_id,a.action,a.result,a.occurred_at at,a.details from msrc_staff.audit a where a.edition_key=edition_key
 union all select a.id::text,'authorization',null::uuid,a.actor_id,a.event,'allowed',a.occurred_at,jsonb_build_object('role',a.role_name,'scope',a.scope_kind,'reason',a.reason) from msrc_authorization.grant_audit a where a.edition_key=edition_key
 union all select a.id::text,'sessions',a.performed_by_actor_id,a.actor_id,a.event,'recorded',a.occurred_at,jsonb_build_object('cause',a.cause) from msrc_sessions.security_audit a where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=a.actor_id and g.edition_key=edition_key)
 union all select a.id::text,'staff_email',a.actor_id,null::uuid,a.event,'recorded',a.occurred_at,'{}'::jsonb from msrc_staff_email.audit a where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=a.actor_id and g.edition_key=edition_key)
 union all select a.id::text,'participant',a.actor_id,null::uuid,a.event,'recorded',a.occurred_at,'{}'::jsonb from msrc_participant.audit a where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=a.actor_id and g.edition_key=edition_key)
 union all select a.id::text,'participant_retention',null::uuid,a.actor_id,a.event,'recorded',a.occurred_at,jsonb_build_object('reason',a.reason) from msrc_participant.retention_audit a where exists(select 1 from msrc_authorization.role_grants g where g.actor_id=a.actor_id and g.edition_key=edition_key)
 union all select a.id::text,'registrations',a.performer_id,a.request_id,a.event,a.result,a.occurred_at,to_jsonb(a)-array['id','edition_key','performer_id','target_actor','request_id','event','result','occurred_at'] from msrc_registration.audit a where a.edition_key=edition_key
 union all select a.id::text,'registration_settings',a.performer_id,null::uuid,'settings.saved','allowed',a.occurred_at,jsonb_build_object('changes',a.changes) from msrc_registration.settings_audit a where a.edition_key=edition_key
 union all select a.id::text,'attendance',a.performer_id,a.attendance_id,a.event,a.result,a.occurred_at,jsonb_build_object('day',a.conference_day,'reason',a.reason,'snapshot',a.snapshot) from msrc_registration.attendance_audit a where a.edition_key=edition_key
 union all select a.id::text,'media',a.actor_id,a.asset_id,a.event,'recorded',a.occurred_at,jsonb_build_object('before',a.before_value,'after',a.after_value) from msrc_content.media_audit a where a.edition_key=edition_key
 union all select a.id::text,'content',a.actor_id,a.item_id,a.event,'recorded',a.occurred_at,jsonb_build_object('before',a.before_value,'after',a.after_value) from msrc_content.content_audit a where a.edition_key=edition_key
 union all select a.id::text,'site_import',a.actor_id,null::uuid,'site.imported','recorded',a.occurred_at,a.summary from msrc_content.site_import_audit a where a.edition_key=edition_key
 union all select a.id::text,'submissions',a.actor_id,a.target_id,a.event,'recorded',a.created_at,a.details from msrc_abstracts.audit a where a.edition_key=edition_key
 union all select a.id::text,'announcements',a.actor_id,a.announcement_id,a.event,'recorded',a.created_at,a.details from msrc_announcements.audit a where a.edition_key=edition_key
 union all select a.id::text,'announcement_retention',null::uuid,null::uuid,'retention.completed','recorded',a.created_at,to_jsonb(a)-array['id','edition_key','created_at'] from msrc_announcements.retention_audit a where a.edition_key=edition_key
 union all select a.operation_id::text,'announcement_delivery',a.actor_id,a.announcement_id,a.event,'recorded',a.created_at,jsonb_build_object('layoutApproved',a.layout_approved) from msrc_announcements.delivery_audit a where a.edition_key=edition_key
 union all select a.id::text,'identity_retention',null::uuid,null::uuid,'retention.completed','recorded',a.created_at,jsonb_build_object('deleted',a.deleted,'legacyCleared',a.legacy_cleared) from msrc_registration.identity_retention_audit a where a.edition_key=edition_key
 union all select a.id::text,'workshops',a.performer_id,coalesce(a.booking_id,a.workshop_id),a.event,'recorded',a.occurred_at,jsonb_build_object('reason',a.reason,'snapshot',a.snapshot) from msrc_workshops.audit a where a.edition_key=edition_key
 union all select a.id::text,'certificates',a.performer_id,a.certificate_id,a.event,'recorded',a.occurred_at,jsonb_build_object('reason',a.reason,'snapshot',a.snapshot) from msrc_certificates.audit a where a.edition_key=edition_key
 union all select a.id::text,coalesce(e.kind,'competitions'),a.actor_id,a.target_id,a.event,'recorded',a.created_at,a.details from msrc_competitions.audit a left join msrc_competitions.entries e on e.id=a.target_id where a.edition_key=edition_key
 union all select a.id::text,'reporting',a.actor_id,null::uuid,a.action,'allowed',a.occurred_at,jsonb_build_object('count',a.row_count,'filters',a.filters) from msrc_staff.reporting_audit a where a.edition_key=edition_key),
 page as materialized(select * from timeline t where (module_filter='all' or t.module=module_filter) and (actor_filter is null or t.actor_id=actor_filter) and (action_filter='' or t.action=action_filter) and (from_at is null or t.at>=from_at) and (to_at is null or t.at<to_at) order by t.at desc,t.module,t.id desc limit 101 offset offset_rows)
 select coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'module',p.module,'actorId',p.actor_id,'targetId',p.target_id,'action',p.action,'result',p.result,'at',p.at,'details',p.details) order by p.at desc,p.module,p.id desc) from (select * from page order by at desc,module,id desc limit 100) p),'[]'::jsonb),(select count(*)>100 from page) into events,more;
 -- A timeline read creates no new timeline rows: offset paging stays read-only.
 return jsonb_build_object('state','ready','events',events,'hasMore',more);
end$$;

revoke all on function msrc_staff.reporting_guard(),msrc_staff.reporting_modules(text),msrc_staff.reporting_review_scope(text,text[],text,uuid),msrc_staff.reporting_status_valid(text,text),msrc_staff.reporting_edition_participant(uuid,text),msrc_staff.reporting_records(text,text),msrc_staff.reporting_cells(text,text[]) from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_dashboard(text),public.msrc_staff_dashboard_find(text,text),public.msrc_staff_dashboard_export(text,text,text,text),public.msrc_staff_dashboard_audit(text,text,uuid,text,timestamptz,timestamptz,integer) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_dashboard(text),public.msrc_staff_dashboard_find(text,text),public.msrc_staff_dashboard_export(text,text,text,text),public.msrc_staff_dashboard_audit(text,text,uuid,text,timestamptz,timestamptz,integer) to authenticated;
commit;
