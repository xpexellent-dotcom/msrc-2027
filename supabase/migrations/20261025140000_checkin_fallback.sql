-- ENG-082 / CHK-05; ROL-08/10/12, SEC-01/02/06. Check-in outage fallback.
-- Online scanning stays the baseline. A Super Admin may export a minimal roster
-- before each day and later reconcile paper/offline records. No offline sync,
-- no settings seed, no workflow activation and no mail.
begin;

-- Offline rows carry the free-text name or initials written on the paper sheet.
alter table msrc_registration.attendance add column offline_recorder text
 check(offline_recorder is null or (offline_recorder=btrim(offline_recorder) and char_length(offline_recorder) between 1 and 80 and offline_recorder !~ '[[:cntrl:]]'));
alter table msrc_registration.attendance drop constraint attendance_method_check;
alter table msrc_registration.attendance add constraint attendance_method_check check(method in('scan','manual_code','offline'));
alter table msrc_registration.attendance add constraint attendance_offline_method_check check((method='offline')=(offline_recorder is not null));
comment on column msrc_registration.attendance.offline_recorder is
 'ENG-082: name or initials from the outage sheet. Present only for method offline; the uploading Super Admin is performer_id.';

alter table msrc_registration.attendance_audit drop constraint attendance_audit_event_check;
alter table msrc_registration.attendance_audit add constraint attendance_audit_event_check check(event in('checkin','undo','roster_export','offline_import'));
alter table msrc_registration.attendance_audit drop constraint attendance_audit_result_check;
alter table msrc_registration.attendance_audit add constraint attendance_audit_result_check check(result in('checked_in','already_checked_in','revoked','not_found','wrong_day','not_approved','invalid','rate_limited','unavailable','undone','already_undone','exported','previously_undone'));
alter table msrc_registration.attendance_audit drop constraint attendance_audit_method_check;
alter table msrc_registration.attendance_audit add constraint attendance_audit_method_check check(method is null or method in('scan','manual_code','offline'));

create table msrc_registration.offline_imports (
 operation_id uuid primary key, edition_key text not null, conference_day date not null, performer_id uuid not null,
 row_count integer not null check(row_count between 1 and 2000), outcomes jsonb not null check(jsonb_typeof(outcomes)='array'),
 counts jsonb not null check(jsonb_typeof(counts)='object'), created_at timestamptz not null default clock_timestamp()
);
comment on table msrc_registration.offline_imports is
 'ENG-082 idempotency receipts. Row positions and outcomes only; submitted references, times and recorder text are not retained here.';
create trigger registration_offline_imports_immutable before update or delete on msrc_registration.offline_imports
 for each row execute function msrc_staff.audit_immutable();
create trigger registration_offline_imports_no_truncate before truncate on msrc_registration.offline_imports
 for each statement execute function msrc_staff.audit_immutable();
alter table msrc_registration.offline_imports enable row level security;
alter table msrc_registration.offline_imports force row level security;
revoke all on table msrc_registration.offline_imports from public,anon,authenticated,service_role;

-- Shared entitlement rules: online scanning, the roster export and the offline
-- import all decide admission here so the three paths cannot drift apart.
create function msrc_registration.checkin_ticket_outcome(payment_required boolean,request_status text,ticket_status text) returns text
 language sql immutable security invoker set search_path='' as $$
 select case when ticket_status='revoked' or request_status in('cancelled','expired') then 'revoked'
 when request_status not in('approved','confirmed') or (request_status='approved' and payment_required is distinct from false) then 'not_approved'
 else 'eligible' end;
$$;
create function msrc_registration.checkin_attendee_active(target uuid) returns boolean
 language sql volatile security definer set search_path='' as $$
 select exists(select 1 from msrc_authorization.account_access a join auth.users u on u.id=a.actor_id
 join msrc_participant.profiles p on p.actor_id=a.actor_id where a.actor_id=target
 and a.state='active' and p.state='verified' and u.deleted_at is null and not u.is_anonymous
 and u.email_confirmed_at is not null and u.email_confirmed_at<=clock_timestamp() and coalesce(btrim(u.email),'')<>''
 and (u.banned_until is null or u.banned_until<=clock_timestamp())) and msrc_participant.age_proven(target);
$$;

create or replace function public.msrc_staff_checkin(edition_key text,ticket_token_or_reference text,conference_day date,entry_point text) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare settings_row msrc_registration.settings%rowtype;ticket_row msrc_registration.tickets%rowtype;
 request_row msrc_registration.requests%rowtype;attendance_row msrc_registration.attendance%rowtype;
 candidate_ids uuid[];credential text:=btrim(ticket_token_or_reference);point text:=nullif(btrim(entry_point),'');
 checkin_method text;ticket_uuid uuid;outcome text;
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
 select * into settings_row from msrc_registration.settings s where s.edition_key=edition_key for update;
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
 -- Validate the credential before causing any target transition. Settings remain
 -- exclusively locked through expiry and the eventual attendance insertion.
 perform msrc_registration.expire_confirmations(edition_key,request_row.id);
 select r.* into request_row from msrc_registration.requests r where r.id=request_row.id;
 select t.* into ticket_row from msrc_registration.tickets t where t.id=ticket_uuid;
 -- ENG-082: shared with the outage roster and offline import.
 outcome:=msrc_registration.checkin_ticket_outcome(settings_row.payment_required,request_row.status,ticket_row.status);
 if outcome<>'eligible' then
 return msrc_registration.checkin_result(edition_key,outcome,conference_day,point,checkin_method,ticket_row.id);end if;
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
 if not msrc_registration.checkin_attendee_active(request_row.actor_id) then
 return msrc_registration.checkin_result(edition_key,'not_approved',conference_day,point,checkin_method,ticket_row.id);end if;
 -- The target account locks may also wait; recheck the scanner's exact session.
 if msrc_staff.authorize(edition_key,array['superAdmin','checkInStaff']) is null then return jsonb_build_object('state','denied');end if;
 perform msrc_registration.expire_confirmations(edition_key,request_row.id);
 if exists(select 1 from msrc_registration.tickets t where t.id=ticket_row.id and t.status='revoked') then
 return msrc_registration.checkin_result(edition_key,'revoked',conference_day,point,checkin_method,ticket_row.id);end if;
 select * into attendance_row from msrc_registration.attendance a
 where a.ticket_id=ticket_row.id and a.conference_day=conference_day for update;
 if attendance_row.id is not null and attendance_row.undone_at is null then
 return msrc_registration.checkin_result(edition_key,'already_checked_in',conference_day,point,checkin_method,ticket_row.id,attendance_row.id);end if;
 if attendance_row.id is null then
 insert into msrc_registration.attendance(ticket_id,conference_day,performer_id,entry_point,method)
 values(ticket_row.id,conference_day,auth.uid(),point,checkin_method) returning * into attendance_row;
 else
 update msrc_registration.attendance a set checked_in_at=clock_timestamp(),performer_id=auth.uid(),entry_point=point,method=checkin_method,offline_recorder=null,
 undone_at=null,undone_by=null,undo_reason=null where a.id=attendance_row.id returning a.* into attendance_row;
 end if;
 return msrc_registration.checkin_result(edition_key,'checked_in',conference_day,point,checkin_method,ticket_row.id,attendance_row.id);
end$$;

create or replace function public.msrc_staff_attendance_summary(edition_key text,day date) returns jsonb
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
 'manualCode',count(*) filter(where a.method='manual_code'),'offline',count(*) filter(where a.method='offline')) into counts from msrc_registration.attendance a
 join msrc_registration.tickets t on t.id=a.ticket_id join msrc_registration.requests r on r.id=t.request_id
 where r.edition_key=edition_key and a.conference_day=day and a.undone_at is null;
 return jsonb_build_object('state','ready','conferenceDays',days,'day',day,'counts',counts);
end$$;

-- Minimal pre-day roster: manual reference and display name only. The same
-- entitlement helpers as online scanning decide who is listed; colliding
-- references are omitted because the manual path refuses them too.
create function public.msrc_staff_checkin_roster(edition_key text,day date) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare settings_row msrc_registration.settings%rowtype;rows jsonb;total integer;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Attendance requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 select * into settings_row from msrc_registration.settings s where s.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 if day is null or not coalesce(day=any(settings_row.conference_days),false) then return jsonb_build_object('state','wrong_day');end if;
 -- Apply lapsed confirmation deadlines first, exactly as a door scan would.
 perform msrc_registration.expire_confirmations(edition_key,null);
 with refs as (select t.id,t.status ticket_status,r.status request_status,r.actor_id,upper(substr(replace(t.id::text,'-',''),1,12)) reference,
 count(*) over(partition by upper(substr(replace(t.id::text,'-',''),1,12))) uses
 from msrc_registration.tickets t join msrc_registration.requests r on r.id=t.request_id where r.edition_key=edition_key)
 select coalesce(jsonb_agg(jsonb_build_object('reference',x.reference,'name',p.name) order by p.name,x.reference),'[]'::jsonb),count(*)
 into rows,total from refs x join msrc_participant.profiles p on p.actor_id=x.actor_id
 where x.uses=1 and msrc_registration.checkin_ticket_outcome(settings_row.payment_required,x.request_status,x.ticket_status)='eligible'
 and msrc_registration.checkin_attendee_active(x.actor_id);
 insert into msrc_registration.attendance_audit(edition_key,conference_day,performer_id,session_id,event,result,snapshot)
 values(edition_key,day,auth.uid(),(auth.jwt()->>'session_id')::uuid,'roster_export','exported',jsonb_build_object('count',total));
 return jsonb_build_object('state','ready','day',day,'rows',rows);
end$$;

-- Reconcile paper records after an outage. Each row runs the online lock order
-- and entitlement rules. Online attendance is never overwritten.
create function public.msrc_staff_checkin_offline_import(edition_key text,day date,operation_id uuid,entries jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare settings_row msrc_registration.settings%rowtype;receipt msrc_registration.offline_imports%rowtype;
 request_row msrc_registration.requests%rowtype;ticket_row msrc_registration.tickets%rowtype;attendance_row msrc_registration.attendance%rowtype;
 item jsonb;reference text;recorded text;recorder text;instant timestamptz;day_start timestamptz;checked timestamptz;
 candidate_ids uuid[];outcome text;outcomes jsonb:='[]'::jsonb;counts jsonb;
begin
 if current_setting('transaction_isolation')<>'read committed' then
 raise exception using errcode='25001',message='Attendance requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then return jsonb_build_object('state','denied');end if;
 if operation_id is null or day is null or jsonb_typeof(entries) is distinct from 'array'
 or jsonb_array_length(entries) not between 1 and 2000 then return jsonb_build_object('state','invalid');end if;
 select * into settings_row from msrc_registration.settings s where s.edition_key=edition_key for update;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then return jsonb_build_object('state','denied');end if;
 select * into receipt from msrc_registration.offline_imports o where o.operation_id=operation_id;
 if receipt.operation_id is not null then
 if receipt.edition_key<>edition_key or receipt.conference_day<>day or receipt.performer_id<>auth.uid() or receipt.row_count<>jsonb_array_length(entries) then
 return jsonb_build_object('state','conflict');end if;
 return jsonb_build_object('state','replayed','day',day,'outcomes',receipt.outcomes,'counts',receipt.counts);
 end if;
 instant:=clock_timestamp();day_start:=day::timestamp at time zone 'Asia/Riyadh';
 if not coalesce(day=any(settings_row.conference_days),false) or day_start>instant then return jsonb_build_object('state','wrong_day');end if;
 for item in select value from jsonb_array_elements(entries) loop
 request_row:=null;ticket_row:=null;attendance_row:=null;candidate_ids:=null;
 reference:=case when jsonb_typeof(item->'reference')='string' then upper(btrim(item->>'reference')) end;
 recorded:=case when jsonb_typeof(item->'time')='string' then btrim(item->>'time') end;
 recorder:=case when jsonb_typeof(item->'recorder')='string' then btrim(item->>'recorder') end;
 if case when jsonb_typeof(item)='object' then exists(select 1 from jsonb_object_keys(item) k where k not in('reference','time','recorder')) else true end
 or reference is null or reference !~ '^[A-F0-9]{12}$' or recorded is null or recorded !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
 or recorder is null or char_length(recorder) not between 1 and 80 or recorder ~ '[[:cntrl:]]' then outcome:='invalid';
 else
 -- Paper times are Riyadh wall-clock times on the selected day, never later than now.
 checked:=least((day::timestamp+recorded::time) at time zone 'Asia/Riyadh',instant);
 select array_agg(q.id) into candidate_ids from (select t.id from msrc_registration.tickets t
 join msrc_registration.requests r on r.id=t.request_id where r.edition_key=edition_key
 and upper(substr(replace(t.id::text,'-',''),1,12))=reference limit 2) q;
 if coalesce(cardinality(candidate_ids),0)<>1 then outcome:='not_found';
 else
 select r.* into request_row from msrc_registration.requests r join msrc_registration.tickets t on t.request_id=r.id
 where t.id=candidate_ids[1] and r.edition_key=edition_key for update of r;
 select * into ticket_row from msrc_registration.tickets t where t.id=candidate_ids[1] and t.request_id=request_row.id for update;
 perform msrc_registration.expire_confirmations(edition_key,request_row.id);
 select r.* into request_row from msrc_registration.requests r where r.id=request_row.id;
 select t.* into ticket_row from msrc_registration.tickets t where t.id=candidate_ids[1];
 outcome:=msrc_registration.checkin_ticket_outcome(settings_row.payment_required,request_row.status,ticket_row.status);
 if outcome='eligible' then
 begin
 perform 1 from msrc_authorization.account_access a where a.actor_id=request_row.actor_id for share nowait;
 perform 1 from auth.users u where u.id=request_row.actor_id for share nowait;
 perform 1 from msrc_participant.profiles p where p.actor_id=request_row.actor_id for share nowait;
 if not msrc_registration.checkin_attendee_active(request_row.actor_id) then outcome:='not_approved';end if;
 exception when lock_not_available then outcome:='unavailable';
 end;
 end if;
 if outcome='eligible' then
 select * into attendance_row from msrc_registration.attendance a where a.ticket_id=ticket_row.id and a.conference_day=day for update;
 if attendance_row.id is not null and attendance_row.undone_at is null then outcome:='already_checked_in';
 elsif attendance_row.id is not null then outcome:='previously_undone';
 else
 insert into msrc_registration.attendance(ticket_id,conference_day,checked_in_at,performer_id,method,offline_recorder)
 values(ticket_row.id,day,checked,auth.uid(),'offline',recorder) returning * into attendance_row;
 outcome:='checked_in';
 end if;
 end if;
 end if;
 end if;
 -- Unknown or malformed references are not retained, matching online scanning.
 insert into msrc_registration.attendance_audit(edition_key,attendance_id,ticket_id,conference_day,performer_id,session_id,event,result,method,snapshot)
 values(edition_key,attendance_row.id,ticket_row.id,day,auth.uid(),(auth.jwt()->>'session_id')::uuid,'offline_import',outcome,'offline',
 jsonb_strip_nulls(jsonb_build_object('operationId',operation_id,'attendance',case when attendance_row.id is not null then to_jsonb(attendance_row) end)));
 outcomes:=outcomes||to_jsonb(outcome);
 end loop;
 if msrc_staff.authorize(edition_key,array['superAdmin']) is null then raise exception using errcode='42501',message='Super Admin authority changed during import.';end if;
 select jsonb_object_agg(o,n) into counts from (select value#>>'{}' o,count(*) n from jsonb_array_elements(outcomes) group by 1) c;
 insert into msrc_registration.offline_imports(operation_id,edition_key,conference_day,performer_id,row_count,outcomes,counts)
 values(operation_id,edition_key,day,auth.uid(),jsonb_array_length(entries),outcomes,counts);
 return jsonb_build_object('state','ready','day',day,'outcomes',outcomes,'counts',counts);
end$$;

revoke all on function msrc_registration.checkin_ticket_outcome(boolean,text,text),msrc_registration.checkin_attendee_active(uuid)
 from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_checkin_roster(text,date),public.msrc_staff_checkin_offline_import(text,date,uuid,jsonb)
 from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_checkin_roster(text,date),public.msrc_staff_checkin_offline_import(text,date,uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
commit;
