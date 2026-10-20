-- ORG-055/056 / ENG-053; REG-01/02/04/05, ADM-01/05, ROL-10/12, SEC-01/02/06.
-- Review only. No settings seed, workflow opening, notification or scheduler.
begin;

create table msrc_registration.settings_audit (
 id uuid primary key default gen_random_uuid(),
 edition_key text not null references msrc_registration.settings(edition_key) on delete restrict,
 operation_id uuid not null,
 performer_id uuid not null,
 request_changes jsonb not null check(jsonb_typeof(request_changes)='object'),
 changes jsonb not null check(jsonb_typeof(changes)='object'),
 occurred_at timestamptz not null default clock_timestamp(),
 unique(edition_key,operation_id)
);
create index registration_settings_audit_history on msrc_registration.settings_audit(edition_key,occurred_at desc,id desc);
alter table msrc_registration.settings_audit enable row level security;
alter table msrc_registration.settings_audit force row level security;
revoke all on table msrc_registration.settings_audit from public,anon,authenticated,service_role;
create trigger registration_settings_audit_immutable before insert or update or delete on msrc_registration.settings_audit
 for each row execute function msrc_staff.audit_immutable();
create trigger registration_settings_audit_no_truncate before truncate on msrc_registration.settings_audit
 for each statement execute function msrc_staff.audit_immutable();
comment on table msrc_registration.settings_audit is
 'Immutable Super Admin settings-save evidence and idempotency receipt. Only changed fields with before/after values; no participant data. Performer ID remains after account removal.';

create function msrc_registration.staff_settings_result(edition text) returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('settings',(select to_jsonb(s) from msrc_registration.settings s where s.edition_key=edition),
 'settingsComplete',msrc_registration.settings_complete(edition),'participantAccountsReady',msrc_participant.ready(),
 'history',(select coalesce(jsonb_agg(to_jsonb(q) order by q.at desc,q.id desc),'[]'::jsonb) from (
 select a.id,a.operation_id as "operationId",a.performer_id as "performerId",p.name as "performerName",
 a.occurred_at as at,a.changes from msrc_registration.settings_audit a
 left join msrc_staff.profiles p on p.actor_id=a.performer_id where a.edition_key=edition
 order by a.occurred_at desc,a.id desc limit 20) q));
$$;

create function public.msrc_staff_registration_settings(edition_key text) returns jsonb
 language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 if msrc_staff.authorize(edition_key,array['superAdmin'],false) is null then
 return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state','ready')||msrc_registration.staff_settings_result(edition_key);
end$$;

create function public.msrc_staff_registration_settings_save(edition_key text,changes jsonb,operation_id uuid) returns jsonb
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
 'confirm_seat_response_hours','payment_window_hours','enabled') then return jsonb_build_object('state','invalid');end if;
 if value='null'::jsonb then continue;end if;
 if field in ('enabled','payment_required') then
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
 payment_window_hours=excluded.payment_window_hours,updated_at=excluded.updated_at;
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

comment on table msrc_registration.settings is
 'Private per-edition policy. No migration seeds. Super Admin settings RPC validates complete settings, serializes with seat allocation and cannot enable registration. Workshop capacity remains separate.';
revoke all on function msrc_registration.staff_settings_result(text) from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_registration_settings(text),
 public.msrc_staff_registration_settings_save(text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_registration_settings(text),
 public.msrc_staff_registration_settings_save(text,jsonb,uuid) to authenticated;
commit;
