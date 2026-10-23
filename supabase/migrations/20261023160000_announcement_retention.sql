-- ORG-062 / ENG-071. Pending owner-reviewed migration; no scheduler/settings seed.
begin;

-- Private transaction/target capability, following participant cleanup_jobs.
-- No caller-set GUC can authorize deletion. Rows exist only during the purge.
create table msrc_announcements.retention_targets (
 announcement_id uuid primary key, native_transaction xid8 not null
);
create table msrc_announcements.retention_audit (
 id uuid primary key default gen_random_uuid(), edition_key text not null,
 announcements integer not null, recipients integer not null, inbox integer not null,
 operations integer not null, created_at timestamptz not null default clock_timestamp()
);
alter table msrc_announcements.retention_targets enable row level security;
alter table msrc_announcements.retention_targets force row level security;
alter table msrc_announcements.retention_audit enable row level security;
alter table msrc_announcements.retention_audit force row level security;
revoke all on msrc_announcements.retention_targets,msrc_announcements.retention_audit from public,anon,authenticated,service_role;
create trigger announcement_retention_audit_immutable before insert or update or delete on msrc_announcements.retention_audit
 for each row execute function msrc_staff.audit_immutable();
create trigger announcement_retention_audit_no_truncate before truncate on msrc_announcements.retention_audit
 for each statement execute function msrc_staff.audit_immutable();

create function msrc_announcements.retention_authorized(target uuid) returns boolean
 language sql volatile security definer set search_path='' as $$
 select exists(select 1 from msrc_announcements.retention_targets t
 where t.announcement_id=target and t.native_transaction=pg_current_xact_id());
$$;
create function msrc_announcements.retention_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 if tg_op='DELETE' and current_user='postgres' then
  if msrc_announcements.retention_authorized(old.announcement_id) then return old;end if;
 end if;
 if tg_op='INSERT' and current_user='postgres' then return new;end if;
 raise exception using errcode='55000',message='Announcement snapshot history is immutable.';
end$$;
drop trigger announcement_append_only on msrc_announcements.recipients;
drop trigger announcement_append_only on msrc_announcements.operations;
create trigger announcement_append_only before insert or update or delete on msrc_announcements.recipients
 for each row execute function msrc_announcements.retention_guard();
create trigger announcement_append_only before insert or update or delete on msrc_announcements.operations
 for each row execute function msrc_announcements.retention_guard();
create function msrc_announcements.inbox_retention_guard() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 if tg_op='DELETE' and current_user='postgres' then
  if msrc_announcements.retention_authorized(old.announcement_id) then return old;end if;
 end if;
 raise exception using errcode='55000',message='Announcement inbox requires retention purge.';
end$$;
create trigger announcement_inbox_delete before delete on msrc_announcements.inbox
 for each row execute function msrc_announcements.inbox_retention_guard();
create trigger announcement_inbox_no_truncate before truncate on msrc_announcements.inbox
 for each statement execute function msrc_announcements.inbox_retention_guard();

create or replace function msrc_announcements.protect_content() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if tg_op='DELETE' and current_user='postgres' then
  if msrc_announcements.retention_authorized(old.id) then return old;end if;
 end if;
 if tg_op='DELETE' or tg_op='TRUNCATE' then raise exception using errcode='55000',message='Announcement history is immutable.';end if;
 if old.state in('sending','sent','cancelled') and (new.subject_en,new.subject_ar,new.body_en,new.body_ar,new.segments,new.edition_key,new.created_by,new.created_at)
 is distinct from (old.subject_en,old.subject_ar,old.body_en,old.body_ar,old.segments,old.edition_key,old.created_by,old.created_at) then
 raise exception using errcode='55000',message='Published announcement content is immutable.';end if;
 return new;
end$$;

create function msrc_announcements.purge_retained(edition text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare cutoff timestamptz;targets uuid[];na integer:=0;nr integer:=0;ni integer:=0;no integer:=0;
begin
 perform msrc_announcements.guard();perform msrc_registration.server_only();
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition,0));
 -- Do not race a settings edit that extends/removes the conference days.
 perform 1 from msrc_registration.settings s where s.edition_key=edition for share;
 -- Last configured date plus one calendar year, at Riyadh midnight. No days: no purge.
 select (max(d)::timestamp+interval '1 year') at time zone 'Asia/Riyadh' into cutoff
 from msrc_registration.settings s cross join lateral unnest(s.conference_days) d where s.edition_key=edition;
 if cutoff is null or now()<=cutoff then
  return jsonb_build_object('announcements',0,'recipients',0,'inbox',0,'operations',0);
 end if;
 select array_agg(x.id) into targets from (
 select a.id from msrc_announcements.announcements a where a.edition_key=edition order by a.created_at,a.id limit 20 for update
 ) x;
 if targets is null then return jsonb_build_object('announcements',0,'recipients',0,'inbox',0,'operations',0);end if;
 insert into msrc_announcements.retention_targets select t,pg_current_xact_id() from unnest(targets) t;
 -- Bound actual child rows, not merely announcements (one audience may be large).
 delete from msrc_announcements.inbox i where (i.announcement_id,i.actor_id) in
 (select x.announcement_id,x.actor_id from msrc_announcements.inbox x where x.announcement_id=any(targets) order by x.announcement_id,x.actor_id limit 500);
 get diagnostics ni=row_count;
 delete from msrc_announcements.recipients r where (r.announcement_id,r.actor_id) in
 (select x.announcement_id,x.actor_id from msrc_announcements.recipients x where x.announcement_id=any(targets)
 and not exists(select 1 from msrc_announcements.inbox i where i.announcement_id=x.announcement_id and i.actor_id=x.actor_id)
 order by x.announcement_id,x.actor_id limit 500);
 get diagnostics nr=row_count;
 delete from msrc_announcements.operations o where (o.edition_key,o.actor_id,o.operation_id) in
 (select x.edition_key,x.actor_id,x.operation_id from msrc_announcements.operations x where x.announcement_id=any(targets)
 order by x.announcement_id,x.actor_id,x.operation_id limit 500);
 get diagnostics no=row_count;
 delete from msrc_announcements.announcements a where a.id=any(targets)
 and not exists(select 1 from msrc_announcements.recipients r where r.announcement_id=a.id)
 and not exists(select 1 from msrc_announcements.operations o where o.announcement_id=a.id);
 get diagnostics na=row_count;
 delete from msrc_announcements.retention_targets t where t.announcement_id=any(targets);
 insert into msrc_announcements.retention_audit(edition_key,announcements,recipients,inbox,operations) values(edition,na,nr,ni,no);
 return jsonb_build_object('announcements',na,'recipients',nr,'inbox',ni,'operations',no);
end$$;

-- Audience and maintenance replacements follow, preserving existing signatures.

create or replace function msrc_announcements.audience(edition text) returns table(segment text,actor_id uuid,email text)
 language sql stable security definer set search_path='' as $$
 with eligible as (
 select u.id,u.email from auth.users u
 where u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false)
 and char_length(u.email)<=254 and u.email ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
 ), members as (
 select 'verified_participants'::text segment,e.id actor_id from eligible e
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
 ) select distinct m.segment,e.id,e.email from members m join eligible e on e.id=m.actor_id
 where (m.segment='verified_participants' and not exists(select 1 from msrc_authorization.account_access a where a.actor_id=e.id and a.state<>'active'))
 or exists(select 1 from msrc_authorization.account_access a where a.actor_id=e.id and a.state='active');
$$;

create or replace function public.msrc_announcements_maintenance(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare a msrc_announcements.announcements%rowtype;p jsonb;total integer:=0;blocked integer:=0;purged jsonb;cutoff timestamptz;begin
 perform msrc_announcements.guard();perform msrc_registration.server_only();
 if not msrc_staff.ready() or not msrc_participant.ready()
 or not coalesce((select s.sweeps_enabled from msrc_outbox.settings s where s.singleton),false) then return jsonb_build_object('state','closed');end if;
 perform pg_advisory_xact_lock(hashtextextended('announcements-edition:'||edition_key,0));
 purged:=msrc_announcements.purge_retained(edition_key);
 select (max(d)::timestamp+interval '1 year') at time zone 'Asia/Riyadh' into cutoff
 from msrc_registration.settings s cross join lateral unnest(s.conference_days) d where s.edition_key=$1;
 if cutoff is not null and now()>cutoff then return jsonb_build_object('state','updated','started',0,'needsReview',0,'retention',purged);end if;
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
 return jsonb_build_object('state','updated','started',total,'needsReview',blocked,'retention',purged);
end$$;


revoke all on all functions in schema msrc_announcements from public,anon,authenticated,service_role;
comment on table msrc_announcements.recipients is 'ORG-062: deleted with inbox and announcements one year after the last configured conference day. Outbox follows its independent policy.';
notify pgrst,'reload schema';
commit;
