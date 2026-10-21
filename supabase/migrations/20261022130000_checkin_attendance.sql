-- ENG-058 / BL-CHK, BL-ATT; CHK-01..05, CRT-01, ROL-08/10/12, SEC-01/02/06.
-- Review only: no settings seed, workflow activation, offline acceptance or mail.
begin;

create function msrc_registration.conference_days_valid(days date[]) returns boolean
 language sql immutable security invoker set search_path='' as $$
 select days is null or (array_ndims(days)=1 and array_lower(days,1)=1 and cardinality(days) between 1 and 31
 and not exists(select 1 from unnest(days) d where d is null or not isfinite(d) or d<date '0001-01-01' or d>date '9999-12-31')
 and days=(select array_agg(distinct d order by d) from unnest(days) d));
$$;
alter table msrc_registration.settings add column conference_days date[]
 check(msrc_registration.conference_days_valid(conference_days));
comment on column msrc_registration.settings.conference_days is
 'Nullable owner-entered ascending unique dates; never seeded. Separate scanner readiness, not registration completeness or certificate eligibility.';

create table msrc_registration.attendance (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references msrc_registration.tickets(id) on delete restrict,
 conference_day date not null check(isfinite(conference_day)),
 checked_in_at timestamptz not null default clock_timestamp(),
 performer_id uuid not null,
 entry_point text check(entry_point is null or (entry_point=btrim(entry_point) and char_length(entry_point) between 1 and 120 and entry_point !~ '[[:cntrl:]]')),
 method text not null check(method in('scan','manual_code')),
 undone_at timestamptz, undone_by uuid, undo_reason text,
 unique(ticket_id,conference_day),
 check((undone_at is null and undone_by is null and undo_reason is null)
 or (undone_at is not null and undone_by is not null and undo_reason is not null and undo_reason=btrim(undo_reason)
 and char_length(undo_reason) between 1 and 300 and undo_reason !~ '[[:cntrl:]]'))
);
create index registration_attendance_day on msrc_registration.attendance(conference_day,ticket_id) where undone_at is null;
create index registration_ticket_reference on msrc_registration.tickets((upper(substr(replace(id::text,'-',''),1,12))));
comment on table msrc_registration.tickets is
 'One private credential per request. Only secret hash is stored; staff scan verifies ENG-054 v1 token hash, with authorized manual reference lookup. Permanent revocation and no automatic reissue.';
comment on table msrc_registration.attendance is
 'One row per ticket and conference day. Undo preserves the row. Re-entry reuses its ID; immutable audit snapshots retain every original check-in and correction. No certificate or workshop completion is inferred.';

create table msrc_registration.attendance_audit (
 id uuid primary key default gen_random_uuid(), edition_key text not null,
 attendance_id uuid, ticket_id uuid, conference_day date, performer_id uuid not null,
 session_id uuid not null, event text not null check(event in('checkin','undo')),
 result text not null check(result in('checked_in','already_checked_in','revoked','not_found','wrong_day','not_approved','invalid','rate_limited','unavailable','undone','already_undone')),
 entry_point text, method text check(method is null or method in('scan','manual_code')),
 reason text, snapshot jsonb, occurred_at timestamptz not null default clock_timestamp()
);
create index registration_attendance_audit_history on msrc_registration.attendance_audit(edition_key,occurred_at,id);
create index registration_attendance_audit_correction on msrc_registration.attendance_audit(attendance_id,occurred_at,id);
comment on table msrc_registration.attendance_audit is
 'Append-only authorized scanner outcomes and full original attendance/correction snapshots. No token, secret/hash, participant identity or submitted unknown reference is logged. Opaque performer/session IDs preserve accountability.';
create trigger registration_attendance_audit_immutable before insert or update or delete on msrc_registration.attendance_audit
 for each row execute function msrc_staff.audit_immutable();
create trigger registration_attendance_audit_no_truncate before truncate on msrc_registration.attendance_audit
 for each statement execute function msrc_staff.audit_immutable();

create table msrc_registration.checkin_limits (
 session_id uuid primary key, actor_id uuid not null,
 window_started_at timestamptz not null, attempts integer not null check(attempts between 1 and 120)
);
comment on table msrc_registration.checkin_limits is
 'Online mutation abuse bound: 120 check-in/undo attempts per native staff session per 60 seconds. Engineering limit, not conference capacity. No ticket/reference retained.';
alter table msrc_registration.attendance enable row level security;
alter table msrc_registration.attendance force row level security;
alter table msrc_registration.attendance_audit enable row level security;
alter table msrc_registration.attendance_audit force row level security;
alter table msrc_registration.checkin_limits enable row level security;
alter table msrc_registration.checkin_limits force row level security;
revoke all on table msrc_registration.attendance,msrc_registration.attendance_audit,msrc_registration.checkin_limits
 from public,anon,authenticated,service_role;

create function msrc_registration.checkin_rate_limit() returns boolean
 language plpgsql security definer set search_path='' as $$
declare sid uuid:=(auth.jwt()->>'session_id')::uuid;instant timestamptz;row_value msrc_registration.checkin_limits%rowtype;
begin
 insert into msrc_registration.checkin_limits(session_id,actor_id,window_started_at,attempts)
 values(sid,auth.uid(),clock_timestamp(),1) on conflict(session_id) do nothing;
 if found then return true;end if;
 select * into strict row_value from msrc_registration.checkin_limits where session_id=sid for update;
 instant:=clock_timestamp();
 if row_value.actor_id<>auth.uid() then return false;end if;
 if row_value.window_started_at+interval '60 seconds'<=instant then
 update msrc_registration.checkin_limits set window_started_at=instant,attempts=1 where session_id=sid;return true;end if;
 if row_value.attempts>=120 then return false;end if;
 update msrc_registration.checkin_limits set attempts=attempts+1 where session_id=sid;return true;
end$$;

create function msrc_registration.checkin_result(edition text,outcome text,day date,point text,checkin_method text,
 ticket uuid default null,attendance uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare row_value msrc_registration.attendance%rowtype;detail jsonb;
begin
 if attendance is not null then select * into row_value from msrc_registration.attendance a where a.id=attendance;end if;
 insert into msrc_registration.attendance_audit(edition_key,attendance_id,ticket_id,conference_day,performer_id,session_id,event,result,entry_point,method,snapshot)
 values(edition,attendance,ticket,day,auth.uid(),(auth.jwt()->>'session_id')::uuid,'checkin',outcome,point,checkin_method,
 case when row_value.id is not null then to_jsonb(row_value) end);
 if row_value.id is null then return jsonb_build_object('state',outcome);end if;
 detail:=jsonb_build_object('id',row_value.id,'conferenceDay',row_value.conference_day,
 'checkedInAt',row_value.checked_in_at,'performerId',row_value.performer_id,
 'performerName',(select p.name from msrc_staff.profiles p where p.actor_id=row_value.performer_id),
 'entryPoint',row_value.entry_point,'method',row_value.method);
 return jsonb_build_object('state',outcome,'attendance',detail);
end$$;

create function public.msrc_staff_checkin(edition_key text,ticket_token_or_reference text,conference_day date,entry_point text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare settings_row msrc_registration.settings%rowtype;ticket_row msrc_registration.tickets%rowtype;
 request_row msrc_registration.requests%rowtype;attendance_row msrc_registration.attendance%rowtype;
 candidate_ids uuid[];credential text:=btrim(ticket_token_or_reference);point text:=nullif(btrim(entry_point),'');
 checkin_method text;ticket_uuid uuid;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Attendance requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff'],false) is null then return jsonb_build_object('state','denied');end if;
 if not msrc_registration.checkin_rate_limit() then
 return msrc_registration.checkin_result(edition_key,'rate_limited',null,null,null);end if;
 if credential is null or char_length(credential) not between 1 and 110
 or (point is not null and (char_length(point)>120 or point ~ '[[:cntrl:]]')) then
 return msrc_registration.checkin_result(edition_key,'invalid',null,null,null);end if;
 if credential ~ '^msrc1\.[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.[a-f0-9]{64}$' then
 checkin_method:='scan';ticket_uuid:=split_part(credential,'.',2)::uuid;
 elsif upper(credential) ~ '^[A-F0-9]{12}$' then checkin_method:='manual_code';
 else return msrc_registration.checkin_result(edition_key,'not_found',conference_day,point,null);end if;
 -- Match the existing mutation lock order: settings, request, ticket. A cancel,
 -- revocation or owner day change cannot commit between entitlement and insert.
 select * into settings_row from msrc_registration.settings s where s.edition_key=edition_key for share;
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff']) is null then return jsonb_build_object('state','denied');end if;
 if conference_day is null or not coalesce(conference_day=any(settings_row.conference_days),false) then
 return msrc_registration.checkin_result(edition_key,'wrong_day',conference_day,point,checkin_method);end if;
 if checkin_method='manual_code' then
 select array_agg(q.id) into candidate_ids from (select t.id from msrc_registration.tickets t
 join msrc_registration.requests r on r.id=t.request_id where r.edition_key=edition_key
 and upper(substr(replace(t.id::text,'-',''),1,12))=upper(credential) limit 2) q;
 -- A rare reference collision must never admit an arbitrary ticket.
 if coalesce(cardinality(candidate_ids),0)<>1 then
 return msrc_registration.checkin_result(edition_key,'not_found',conference_day,point,checkin_method);end if;
 ticket_uuid:=candidate_ids[1];end if;
 select r.* into request_row from msrc_registration.requests r join msrc_registration.tickets t on t.request_id=r.id
 where t.id=ticket_uuid and r.edition_key=edition_key for update of r;
 select * into ticket_row from msrc_registration.tickets t where t.id=ticket_uuid and t.request_id=request_row.id for update;
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff']) is null then return jsonb_build_object('state','denied');end if;
 if request_row.id is null or ticket_row.id is null or (checkin_method='scan'
 and sha256(convert_to(split_part(credential,'.',3),'UTF8'))<>ticket_row.secret_hash) then
 return msrc_registration.checkin_result(edition_key,'not_found',conference_day,point,checkin_method);end if;
 if ticket_row.status='revoked' or request_row.status in('cancelled','expired') then
 return msrc_registration.checkin_result(edition_key,'revoked',conference_day,point,checkin_method,ticket_row.id);end if;
 if request_row.status not in('approved','confirmed') or (request_row.status='approved' and settings_row.payment_required is distinct from false) then
 return msrc_registration.checkin_result(edition_key,'not_approved',conference_day,point,checkin_method,ticket_row.id);end if;
 -- The credential remains subject to current attendee account authority. No
 -- participant login/session is required at a door, but suspension, native bans,
 -- missing verification or missing adult admission must not confer attendance.
 -- authorize owns the scanner account row. NOWAIT avoids an account-lock cycle
 -- if two people with historic attendee records scan each other. Contention is
 -- retryable infrastructure unavailability, never a false admission decision.
 begin
 perform 1 from msrc_authorization.account_access a where a.actor_id=request_row.actor_id for share nowait;
 perform 1 from auth.users u where u.id=request_row.actor_id for share nowait;
 perform 1 from msrc_participant.profiles p where p.actor_id=request_row.actor_id for share nowait;
 exception when lock_not_available then
 return msrc_registration.checkin_result(edition_key,'unavailable',conference_day,point,checkin_method,ticket_row.id);
 end;
 if not exists(select 1 from msrc_authorization.account_access a join auth.users u on u.id=a.actor_id
 join msrc_participant.profiles p on p.actor_id=a.actor_id where a.actor_id=request_row.actor_id
 and a.state='active' and p.state='verified' and u.deleted_at is null and not u.is_anonymous
 and u.email_confirmed_at is not null and u.email_confirmed_at<=clock_timestamp() and coalesce(btrim(u.email),'')<>''
 and (u.banned_until is null or u.banned_until<=clock_timestamp())) or not msrc_participant.age_proven(request_row.actor_id) then
 return msrc_registration.checkin_result(edition_key,'not_approved',conference_day,point,checkin_method,ticket_row.id);end if;
 -- The target account locks may also wait; recheck the scanner's exact session.
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff']) is null then return jsonb_build_object('state','denied');end if;
 select * into attendance_row from msrc_registration.attendance a
 where a.ticket_id=ticket_row.id and a.conference_day=conference_day for update;
 if attendance_row.id is not null and attendance_row.undone_at is null then
 return msrc_registration.checkin_result(edition_key,'already_checked_in',conference_day,point,checkin_method,ticket_row.id,attendance_row.id);end if;
 if attendance_row.id is null then
 insert into msrc_registration.attendance(ticket_id,conference_day,performer_id,entry_point,method)
 values(ticket_row.id,conference_day,auth.uid(),point,checkin_method) returning * into attendance_row;
 else
 update msrc_registration.attendance a set checked_in_at=clock_timestamp(),performer_id=auth.uid(),entry_point=point,method=checkin_method,
 undone_at=null,undone_by=null,undo_reason=null where a.id=attendance_row.id returning a.* into attendance_row;
 end if;
 return msrc_registration.checkin_result(edition_key,'checked_in',conference_day,point,checkin_method,ticket_row.id,attendance_row.id);
end$$;

create function public.msrc_staff_checkin_undo(edition_key text,attendance_id uuid,reason text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare attendance_row msrc_registration.attendance%rowtype;ticket_uuid uuid;request_uuid uuid;outcome text;before_row jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Attendance requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if not msrc_registration.checkin_rate_limit() then outcome:='rate_limited';
 elsif attendance_id is null or reason is null or reason<>btrim(reason) or char_length(reason) not between 1 and 300 or reason ~ '[[:cntrl:]]' then outcome:='invalid';
 else
 perform 1 from msrc_registration.settings s where s.edition_key=edition_key for share;
 select t.id,r.id into ticket_uuid,request_uuid from msrc_registration.attendance a
 join msrc_registration.tickets t on t.id=a.ticket_id join msrc_registration.requests r on r.id=t.request_id
 where a.id=attendance_id and r.edition_key=edition_key;
 if ticket_uuid is not null then
 perform 1 from msrc_registration.requests r where r.id=request_uuid for update;
 perform 1 from msrc_registration.tickets t where t.id=ticket_uuid for update;
 select * into attendance_row from msrc_registration.attendance a where a.id=attendance_id for update;
 end if;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if attendance_row.id is null then outcome:='not_found';
 elsif attendance_row.undone_at is not null then outcome:='already_undone';
 else
 before_row:=to_jsonb(attendance_row);outcome:='undone';
 update msrc_registration.attendance a set undone_at=clock_timestamp(),undone_by=auth.uid(),undo_reason=reason where a.id=attendance_id;
 end if;
 end if;
 insert into msrc_registration.attendance_audit(edition_key,attendance_id,ticket_id,conference_day,performer_id,session_id,event,result,reason,snapshot)
 values(edition_key,attendance_row.id,ticket_uuid,attendance_row.conference_day,auth.uid(),(auth.jwt()->>'session_id')::uuid,
 'undo',outcome,case when outcome in('undone','already_undone','not_found') then reason end,before_row);
 return jsonb_build_object('state',outcome);
end$$;

create function public.msrc_staff_attendance_summary(edition_key text,day date) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare days date[];counts jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Attendance requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 -- Passive counter polling must never extend the scanner session's idle limit.
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff'],false) is null then return jsonb_build_object('state','denied');end if;
 select s.conference_days into days from msrc_registration.settings s where s.edition_key=edition_key;
 if day is not null and not coalesce(day=any(days),false) then return jsonb_build_object('state','wrong_day');end if;
 select jsonb_build_object('checkedIn',count(*),'scan',count(*) filter(where a.method='scan'),
 'manualCode',count(*) filter(where a.method='manual_code')) into counts from msrc_registration.attendance a
 join msrc_registration.tickets t on t.id=a.ticket_id join msrc_registration.requests r on r.id=t.request_id
 where r.edition_key=edition_key and a.conference_day=day and a.undone_at is null;
 return jsonb_build_object('state','ready','conferenceDays',days,'day',day,'counts',counts);
end$$;

create function public.msrc_registration_attendance(edition_key text,session_claims jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;days date[];enabled boolean;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Attendance requires READ COMMITTED isolation.';end if;
 perform msrc_registration.server_only();
 if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 select s.conference_days,s.enabled into days,enabled from msrc_registration.settings s where s.edition_key=edition_key for share;
 if not coalesce(enabled,false) or not msrc_participant.ready() then result:=jsonb_build_object('state','closed');
 elsif not coalesce(msrc_registration.participant_current(edition_key),false) then result:=jsonb_build_object('state','denied');
 else
 result:=jsonb_build_object('state','ready','days',(select coalesce(jsonb_agg(jsonb_build_object('conferenceDay',d,
 'checkedInAt',(select a.checked_in_at from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id
 join msrc_registration.requests r on r.id=t.request_id where r.edition_key=edition_key and r.actor_id=auth.uid()
 and a.conference_day=d and a.undone_at is null)) order by d),'[]'::jsonb) from unnest(days) d));
 end if;
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

revoke all on function msrc_registration.conference_days_valid(date[]),msrc_registration.checkin_rate_limit(),
 msrc_registration.checkin_result(text,text,date,text,text,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_checkin(text,text,date,text),public.msrc_staff_checkin_undo(text,uuid,text),
 public.msrc_staff_attendance_summary(text,date),public.msrc_registration_attendance(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_checkin(text,text,date,text),public.msrc_staff_checkin_undo(text,uuid,text),
 public.msrc_staff_attendance_summary(text,date) to authenticated;
grant execute on function public.msrc_registration_attendance(text,jsonb) to service_role;

-- Extend owner settings without changing completeness, activation or save idempotency.
create or replace function public.msrc_staff_registration_settings_save(edition_key text,changes jsonb,operation_id uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare previous_row msrc_registration.settings%rowtype;candidate msrc_registration.settings%rowtype;
 receipt msrc_registration.settings_audit%rowtype;field text;value jsonb;before_values jsonb;after_values jsonb;
 delta jsonb:='{}'::jsonb;held bigint;
begin
 -- Reject stale transaction snapshots before authorization, validation or replay
 -- can return, and before taking any authority/session/settings locks.
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Registration settings maintenance requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then
 return jsonb_build_object('state','denied');end if;
 if operation_id is null or jsonb_typeof(changes) is distinct from 'object' or changes='{}'::jsonb then
 return jsonb_build_object('state','invalid');end if;
 if changes->'enabled'='true'::jsonb then return jsonb_build_object('state','enable_not_allowed_here');end if;
 for field,value in select * from jsonb_each(changes) loop
 if field not in ('terms_version','payment_required','general_capacity','priority_start_at','priority_end_at',
 'early_access_start_at','early_access_end_at','general_opening_at','closing_at','offer_window_hours',
 'places_remaining_threshold','minimum_age','waitlist_offer_hours','confirm_seat_lead_days',
 'confirm_seat_response_hours','payment_window_hours','enabled','conference_days') then return jsonb_build_object('state','invalid');end if;
 if value='null'::jsonb then continue;end if;
 if field='conference_days' then
 if jsonb_typeof(value)<>'array' then return jsonb_build_object('state','invalid');end if;
 if jsonb_array_length(value) not between 1 and 31 or exists(select 1 from jsonb_array_elements(value) d
 where jsonb_typeof(d)<>'string' or (d#>>'{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then
 return jsonb_build_object('state','invalid');end if;
 elsif field in ('enabled','payment_required') then
 if jsonb_typeof(value)<>'boolean' then return jsonb_build_object('state','invalid');end if;
 elsif field in ('general_capacity','offer_window_hours','places_remaining_threshold','minimum_age',
 'waitlist_offer_hours','confirm_seat_lead_days','confirm_seat_response_hours','payment_window_hours') then
 if jsonb_typeof(value)<>'number' or value::text !~ '^-?[0-9]+$' then return jsonb_build_object('state','invalid');end if;
 else
 if jsonb_typeof(value)<>'string' then return jsonb_build_object('state','invalid');end if;
 if field<>'terms_version' and (changes->>field) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}([.][0-9]{1,6})?)?(Z|[+-][0-9]{2}:[0-9]{2})$' then
 return jsonb_build_object('state','invalid');end if;
 end if;
 end loop;
 if changes ? 'minimum_age' and changes->'minimum_age' is distinct from '18'::jsonb then
 return jsonb_build_object('state','invalid');end if;
 -- Existing rows use exactly the allocation lock. Initial creation also locks
 -- the edition parent, then repeats the lookup to serialize two first saves.
 select s.* into previous_row from msrc_registration.settings s where s.edition_key=edition_key for update;
 if not found then
 perform 1 from msrc_authorization.edition_config e where e.edition_key=edition_key for update;
 if not found then return jsonb_build_object('state','denied');end if;
 select s.* into previous_row from msrc_registration.settings s where s.edition_key=edition_key for update;
 end if;
 -- A settings lock can wait behind allocation. Recheck native exact-session
 -- assurance, session deadlines and role authority before any mutation.
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select a.* into receipt from msrc_registration.settings_audit a
 where a.edition_key=edition_key and a.operation_id=operation_id;
 if found then
 if receipt.performer_id<>auth.uid() or receipt.request_changes<>changes then
 return jsonb_build_object('state','operation_conflict');end if;
 return jsonb_build_object('state','updated','operationId',operation_id)||msrc_registration.staff_settings_result(edition_key);
 end if;

 begin
 candidate:=jsonb_populate_record(previous_row,changes);
 candidate.edition_key:=edition_key;
 candidate.enabled:=case when previous_row.edition_key is null then false else previous_row.enabled end;
 if changes ? 'enabled' then
 if changes->'enabled' is distinct from 'false'::jsonb then return jsonb_build_object('state','invalid');end if;
 candidate.enabled:=false;end if;
 candidate.minimum_age:=18;
 -- ENG-053: the old unused early-access pair remains a completeness gate.
 -- Preserve one owner-entered early window by mapping it to the priority pair.
 if (changes ? 'early_access_start_at' and candidate.early_access_start_at is distinct from candidate.priority_start_at)
 or (changes ? 'early_access_end_at' and candidate.early_access_end_at is distinct from candidate.priority_end_at) then
 return jsonb_build_object('state','invalid');end if;
 candidate.early_access_start_at:=candidate.priority_start_at;
 candidate.early_access_end_at:=candidate.priority_end_at;
 candidate.updated_at:=clock_timestamp();
 if candidate.general_capacity is null or candidate.general_capacity<=0 then return jsonb_build_object('state','invalid');end if;
 select count(*) into held from msrc_registration.requests r where r.edition_key=edition_key
 and r.status in ('approved','approved_awaiting_payment','offered','confirmed');
 if candidate.general_capacity<held then return jsonb_build_object('state','capacity_below_held');end if;

 -- Table CHECKs are authoritative. The subtransaction rolls the entire save
 -- back for invalid input or an incomplete merged configuration, including a
 -- new settings row. No incomplete draft or automatic opening is persisted.
 insert into msrc_registration.settings select (candidate).*
 on conflict on constraint settings_pkey do update set
 enabled=excluded.enabled,terms_version=excluded.terms_version,payment_required=excluded.payment_required,
 general_capacity=excluded.general_capacity,early_access_start_at=excluded.early_access_start_at,
 early_access_end_at=excluded.early_access_end_at,priority_start_at=excluded.priority_start_at,
 priority_end_at=excluded.priority_end_at,general_opening_at=excluded.general_opening_at,closing_at=excluded.closing_at,
 offer_window_hours=excluded.offer_window_hours,places_remaining_threshold=excluded.places_remaining_threshold,
 minimum_age=excluded.minimum_age,waitlist_offer_hours=excluded.waitlist_offer_hours,
 confirm_seat_lead_days=excluded.confirm_seat_lead_days,confirm_seat_response_hours=excluded.confirm_seat_response_hours,
 payment_window_hours=excluded.payment_window_hours,conference_days=excluded.conference_days,updated_at=excluded.updated_at;
 if not msrc_registration.settings_complete(edition_key) then
 raise exception using errcode='23514',message='Registration settings must be complete.';end if;
 before_values:=coalesce(to_jsonb(previous_row),'{}'::jsonb);
 after_values:=to_jsonb(candidate)-array['edition_key','updated_at'];
 for field,value in select * from jsonb_each(after_values) loop
 if coalesce(before_values->field,'null'::jsonb) is distinct from value then
 delta:=delta||jsonb_build_object(field,jsonb_build_object('before',before_values->field,'after',value));end if;
 end loop;
 insert into msrc_registration.settings_audit(edition_key,operation_id,performer_id,request_changes,changes)
 values(edition_key,operation_id,auth.uid(),changes,delta);
 exception when check_violation or not_null_violation or invalid_text_representation or numeric_value_out_of_range
 or invalid_datetime_format or datetime_field_overflow then return jsonb_build_object('state','invalid');
 end;
 return jsonb_build_object('state','updated','operationId',operation_id)||msrc_registration.staff_settings_result(edition_key);
end$$;


notify pgrst,'reload schema';
commit;
