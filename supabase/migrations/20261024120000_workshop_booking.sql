-- ENG-074; WKS-01..07, CHK-03, CRT-01. Review only: no seed or activation.
begin;
create schema msrc_workshops;
revoke all on schema msrc_workshops from public,anon,authenticated,service_role;
alter default privileges in schema msrc_workshops revoke all on tables from public,anon,authenticated,service_role;
alter default privileges in schema msrc_workshops revoke execute on functions from public,anon,authenticated,service_role;

create table msrc_workshops.settings (
 edition_key text primary key references msrc_authorization.edition_config(edition_key) on delete restrict,
 enabled boolean not null default false,hold_hours integer check(hold_hours between 1 and 8760),
 offer_hours integer check(offer_hours between 1 and 8760),mock_payment_enabled boolean not null default false
);
create table msrc_workshops.workshops (
 id uuid primary key default gen_random_uuid(),edition_key text not null references msrc_workshops.settings(edition_key) on delete restrict,
 version integer not null default 1 check(version>0),published boolean not null default false,removed boolean not null default false,
 title_en text,title_ar text,description_en text,description_ar text,instructor text,instructor_actor_id uuid,
 room text,start_at timestamptz,end_at timestamptz,capacity integer check(capacity>0),
 eligibility_en text,eligibility_ar text,eligibility_rule text check(eligibility_rule in('confirmed_registration','priority')),
 price_minor integer check(price_minor>=0),currency text check(currency ~ '^[A-Z]{3}$'),booking_deadline timestamptz,
 transfer_buffer_minutes integer check(transfer_buffer_minutes between 0 and 1440),
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp(),
 check(start_at is null or isfinite(start_at)),check(end_at is null or isfinite(end_at)),
 check(booking_deadline is null or isfinite(booking_deadline)),check(start_at<end_at),check(booking_deadline<=start_at),
 check(title_en is null or char_length(title_en) between 1 and 200),check(title_ar is null or char_length(title_ar) between 1 and 200),
 check(description_en is null or char_length(description_en) between 1 and 5000),check(description_ar is null or char_length(description_ar) between 1 and 5000),
 check(instructor is null or char_length(instructor) between 1 and 200),check(room is null or char_length(room) between 1 and 200),
 check(eligibility_en is null or char_length(eligibility_en) between 1 and 1000),check(eligibility_ar is null or char_length(eligibility_ar) between 1 and 1000)
);
create index workshop_edition on msrc_workshops.workshops(edition_key,start_at,id);
create table msrc_workshops.bookings (
 id uuid primary key default gen_random_uuid(),workshop_id uuid not null references msrc_workshops.workshops(id) on delete restrict,
 actor_id uuid not null,status text not null check(status in('held','approved','waitlisted','offered','confirmed','declined','cancelled','expired')),
 requested_at timestamptz not null default clock_timestamp(),expires_at timestamptz,approved_at timestamptz,approved_by uuid,
 payment_kind text check(payment_kind in('mock','free','full_discount')),paid_at timestamptz,
 checked_in_at timestamptz,checked_in_by uuid,completed_at timestamptz,completed_by uuid,
 unique(workshop_id,actor_id),check(expires_at is null or isfinite(expires_at)),
 check((approved_at is null)=(approved_by is null)),check((checked_in_at is null)=(checked_in_by is null)),
 check((completed_at is null)=(completed_by is null)),check(completed_at is null or checked_in_at is not null),
 check(status not in('held','approved','offered') or expires_at is not null),
 check(status<>'confirmed' or (approved_at is not null and paid_at is not null and payment_kind is not null))
);
create index workshop_booking_actor on msrc_workshops.bookings(actor_id,workshop_id);
create index workshop_booking_queue on msrc_workshops.bookings(workshop_id,requested_at,id) include(status,expires_at);
create table msrc_workshops.reservations (
 id uuid primary key default gen_random_uuid(),workshop_id uuid not null references msrc_workshops.workshops(id) on delete restrict,
 seats integer not null check(seats>0),reason text not null check(char_length(btrim(reason)) between 1 and 300),
 release_at timestamptz not null check(isfinite(release_at)),released_at timestamptz,created_by uuid not null,
 created_at timestamptz not null default clock_timestamp()
);
create index workshop_reservation_workshop on msrc_workshops.reservations(workshop_id,release_at) where released_at is null;
create table msrc_workshops.discounts (
 booking_id uuid primary key references msrc_workshops.bookings(id) on delete restrict,
 validated_by uuid not null,validated_at timestamptz not null default clock_timestamp(),
 reason text not null check(char_length(btrim(reason)) between 1 and 300),redeemed_at timestamptz
);
create table msrc_workshops.orders (
 id uuid primary key default gen_random_uuid(),booking_id uuid not null unique references msrc_workshops.bookings(id) on delete restrict,
 kind text not null check(kind in('mock','free','full_discount')),price_minor integer not null check(price_minor>=0),
 due_minor integer not null check(due_minor>=0 and due_minor<=price_minor),currency text not null check(currency ~ '^[A-Z]{3}$'),
 settled_at timestamptz not null default clock_timestamp(),actor_id uuid not null,
 check(kind='mock' or due_minor=0)
);
comment on table msrc_workshops.orders is 'Immutable separate order/settlement snapshot. Mock is synthetic only and never a real payment receipt; free/full-discount orders have zero due amount.';
create table msrc_workshops.conflicts (
 id uuid primary key default gen_random_uuid(),booking_id uuid not null references msrc_workshops.bookings(id) on delete restrict,
 other_booking_id uuid not null references msrc_workshops.bookings(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),resolved_at timestamptz,reason text,
 check(booking_id<other_booking_id)
);
create index workshop_conflict_booking on msrc_workshops.conflicts(booking_id,resolved_at);
create index workshop_conflict_other on msrc_workshops.conflicts(other_booking_id,resolved_at);
create unique index workshop_conflict_active on msrc_workshops.conflicts(booking_id,other_booking_id) where resolved_at is null;
create table msrc_workshops.operations (
 edition_key text not null,actor_id uuid not null,operation_id uuid not null,input_hash bytea not null,result jsonb not null,
 created_at timestamptz not null default clock_timestamp(),primary key(edition_key,actor_id,operation_id)
);
create table msrc_workshops.audit (
 id uuid primary key default gen_random_uuid(),edition_key text not null,workshop_id uuid,booking_id uuid,
 performer_id uuid,session_id uuid,event text not null,reason text,snapshot jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default clock_timestamp()
);
create index workshop_audit_history on msrc_workshops.audit(edition_key,occurred_at,id);
do $$declare t text;begin foreach t in array array['settings','workshops','bookings','reservations','discounts','orders','conflicts','operations','audit'] loop
 execute format('alter table msrc_workshops.%I enable row level security',t);
 execute format('alter table msrc_workshops.%I force row level security',t);
 if t in('operations','orders','audit') then
 execute format('create trigger workshop_append_only before insert or update or delete on msrc_workshops.%I for each row execute function msrc_staff.audit_immutable()',t);
 execute format('create trigger workshop_no_truncate before truncate on msrc_workshops.%I for each statement execute function msrc_staff.audit_immutable()',t);
 end if;end loop;end$$;
revoke all on all tables in schema msrc_workshops from public,anon,authenticated,service_role;
comment on schema msrc_workshops is 'ENG-074 closed booking allocations and CHK-03 evidence. No public names, schedule builder, survey answers or certificates.';

create function msrc_workshops.guard(edition text) returns void language plpgsql security definer set search_path='' as $$begin
 if current_setting('transaction_isolation')<>'read committed' then raise exception using errcode='25001',message='Workshop allocation requires READ COMMITTED isolation.';end if;
 perform pg_advisory_xact_lock_shared(hashtextextended('staff-portal-authority',0));
 -- Same registration policy lock serializes conference cancellation/confirmation and workshop entitlement checks.
 perform 1 from msrc_registration.settings s where s.edition_key=edition for update;
 perform pg_advisory_xact_lock(hashtextextended('workshops-edition:'||edition,0));
 perform 1 from msrc_workshops.settings s where s.edition_key=edition for update;
end$$;
create function msrc_workshops.record(edition text,workshop uuid,booking uuid,event_name text,reason_text text default null,snapshot jsonb default '{}'::jsonb)
 returns void language sql security definer set search_path='' as $$
 insert into msrc_workshops.audit(edition_key,workshop_id,booking_id,performer_id,session_id,event,reason,snapshot)
 values(edition,workshop,booking,auth.uid(),nullif(auth.jwt()->>'session_id','')::uuid,event_name,reason_text,snapshot);
$$;
create function msrc_workshops.ready(w msrc_workshops.workshops) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(not w.removed and w.published and w.title_en is not null and w.title_ar is not null
 and w.description_en is not null and w.description_ar is not null and w.instructor is not null and w.room is not null
 and w.start_at is not null and w.end_at is not null and w.capacity is not null and w.eligibility_en is not null
 and w.eligibility_ar is not null and w.eligibility_rule is not null and w.price_minor is not null and w.currency is not null
 and w.booking_deadline is not null and w.transfer_buffer_minutes is not null
 and exists(select 1 from msrc_workshops.settings s where s.edition_key=w.edition_key and s.enabled and s.hold_hours is not null and s.offer_hours is not null)
 and msrc_participant.ready(),false);
$$;
create function msrc_workshops.eligible(w msrc_workshops.workshops,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(exists(select 1 from msrc_registration.requests r join msrc_authorization.account_access a on a.actor_id=r.actor_id
 join auth.users u on u.id=r.actor_id join msrc_participant.profiles p on p.actor_id=r.actor_id
 where r.edition_key=w.edition_key and r.actor_id=actor and r.status='confirmed' and a.state='active'
 and u.email_confirmed_at is not null and u.deleted_at is null and not coalesce(u.is_anonymous,false)
 and p.state='verified' and msrc_participant.age_proven(actor) and msrc_participant.participant_only(actor))
 and (w.eligibility_rule='confirmed_registration' or (w.eligibility_rule='priority' and msrc_registration.priority_active(w.edition_key,actor))),false);
$$;
create function msrc_workshops.allocations(workshop uuid) returns integer language sql stable security definer set search_path='' as $$
 select ((select count(*) from msrc_workshops.bookings b where b.workshop_id=workshop
 and (b.status='confirmed' or (b.status in('held','approved','offered') and b.expires_at>clock_timestamp())))
 +coalesce((select sum(r.seats) from msrc_workshops.reservations r where r.workshop_id=workshop and r.released_at is null and r.release_at>clock_timestamp()),0))::integer;
$$;
create function msrc_workshops.overlaps(a msrc_workshops.workshops,b msrc_workshops.workshops) returns boolean
 language sql immutable security invoker set search_path='' as $$
 select a.start_at < b.end_at+make_interval(mins=>greatest(coalesce(a.transfer_buffer_minutes,0),coalesce(b.transfer_buffer_minutes,0)))
 and b.start_at < a.end_at+make_interval(mins=>greatest(coalesce(a.transfer_buffer_minutes,0),coalesce(b.transfer_buffer_minutes,0)));
$$;
create function msrc_workshops.has_overlap(w msrc_workshops.workshops,actor uuid,except_booking uuid default null) returns boolean
 language sql stable security definer set search_path='' as $$
 select exists(select 1 from msrc_workshops.bookings b join msrc_workshops.workshops other on other.id=b.workshop_id
 where b.actor_id=actor and other.edition_key=w.edition_key and b.id is distinct from except_booking and b.workshop_id<>w.id
 and (b.status='confirmed' or (b.status in('held','approved') and b.expires_at>clock_timestamp()))
 and msrc_workshops.overlaps(w,other));
$$;
create function msrc_workshops.workshop_projection(w msrc_workshops.workshops) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',w.id,'version',w.version,'published',w.published,'removed',w.removed,
 'titleEn',w.title_en,'titleAr',w.title_ar,'descriptionEn',w.description_en,'descriptionAr',w.description_ar,'instructor',w.instructor,
 'room',w.room,'startAt',w.start_at,'endAt',w.end_at,'capacity',w.capacity,'remaining',case when w.capacity is null then null else greatest(0,w.capacity-msrc_workshops.allocations(w.id)) end,
 'eligibilityEn',w.eligibility_en,'eligibilityAr',w.eligibility_ar,'eligibilityRule',w.eligibility_rule,'priceMinor',w.price_minor,'currency',w.currency,
 'bookingDeadline',w.booking_deadline,'transferBufferMinutes',w.transfer_buffer_minutes,'ready',msrc_workshops.ready(w) and w.booking_deadline>clock_timestamp());
$$;
create function msrc_workshops.booking_projection(b msrc_workshops.bookings) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',b.id,'workshopId',b.workshop_id,'status',case when b.status in('held','approved','offered') and b.expires_at<=clock_timestamp() then 'expired' else b.status end,'requestedAt',b.requested_at,'expiresAt',b.expires_at,
 'approvedAt',b.approved_at,'checkedInAt',b.checked_in_at,'completedAt',b.completed_at,
 'fullDiscount',exists(select 1 from msrc_workshops.discounts d where d.booking_id=b.id),
 'conflict',exists(select 1 from msrc_workshops.conflicts c where (c.booking_id=b.id or c.other_booking_id=b.id) and c.resolved_at is null));
$$;

create function msrc_workshops.message_valid(template text,version integer,locale text,recipient text,payload jsonb) returns boolean
 language sql stable security invoker set search_path='' as $$
 select coalesce(template='workshop_notice' and version=1 and locale='en' and char_length(recipient)<=254
 and recipient ~ '^[A-Za-z0-9.!#$%&''*+/=?^_`{|}~-]{1,64}@[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?([.][A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$'
 and jsonb_typeof(payload)='object' and payload=jsonb_build_object('event',payload->'event','workshop_title',payload->'workshop_title','booking_id',payload->'booking_id','deadline',payload->'deadline')
 and payload->>'event' in('requested','waitlisted','approved','declined','expired','offered','offer_accepted','confirmed','cancelled','removed','time_changed','capacity_changed','conflict','extended')
 and jsonb_typeof(payload->'workshop_title')='string' and char_length(payload->>'workshop_title') between 1 and 200
 and payload->>'booking_id' ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
 and (payload->'deadline'='null'::jsonb or (jsonb_typeof(payload->'deadline')='string'
 and payload->>'deadline' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?Z$')),false);
$$;
alter table msrc_outbox.messages drop constraint outbox_template_input_check;
alter table msrc_outbox.messages add constraint outbox_template_input_check check(
 (template_key='synthetic_notice' and recipient_email~'^[A-Za-z0-9._%+-]{1,64}@example[.]invalid$' and jsonb_typeof(payload)='object'
 and payload=jsonb_build_object('reference',payload->'reference') and jsonb_typeof(payload->'reference') is not distinct from 'string' and coalesce(payload->>'reference'~'^[A-Za-z0-9_-]{1,80}$',false))
 or msrc_outbox.registration_message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_abstracts.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_announcements.message_valid(template_key,template_version,locale,recipient_email,payload)
 or msrc_workshops.message_valid(template_key,template_version,locale,recipient_email,payload));
alter table msrc_outbox.messages add constraint workshop_draft_delivery_hold check(template_key<>'workshop_notice' or (delivery_hold and status not in('sending','sent')));
create function msrc_workshops.enqueue(b msrc_workshops.bookings,event_name text) returns void language plpgsql security definer set search_path='' as $$
declare recipient text;title text;payload jsonb;outbox_id uuid:=gen_random_uuid();begin
 select u.email,w.title_en into recipient,title from auth.users u join msrc_workshops.workshops w on w.id=b.workshop_id
 where u.id=b.actor_id and u.email_confirmed_at is not null and u.deleted_at is null;
 if recipient is null or title is null then return;end if;
 payload:=jsonb_build_object('event',event_name,'workshop_title',title,'booking_id',b.id,'deadline',
 case when b.expires_at is not null then to_char(b.expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') else null end);
 if not msrc_workshops.message_valid('workshop_notice',1,'en',recipient,payload) then return;end if;
 -- Private producer: business transition, immutable identity and held job commit together.
 insert into msrc_outbox.identities(id,key_hash,input_hash) values(outbox_id,sha256(convert_to('workshop/'||outbox_id::text,'UTF8')),
 sha256(convert_to(jsonb_build_array('workshop_notice',1,'en',recipient,payload)::text,'UTF8')));
 insert into msrc_outbox.messages(id,template_key,template_version,locale,recipient_email,payload,provider_idempotency_key,delivery_hold)
 values(outbox_id,'workshop_notice',1,'en',recipient,payload,'msrc-outbox/'||outbox_id::text,true);
end$$;
create function msrc_workshops.reconcile_conflicts(edition text) returns void language plpgsql security definer set search_path='' as $$
declare pair record;affected_booking msrc_workshops.bookings%rowtype;begin
 update msrc_workshops.conflicts c set resolved_at=clock_timestamp(),reason='No active schedule conflict remains'
 from msrc_workshops.bookings a,msrc_workshops.bookings b,msrc_workshops.workshops wa,msrc_workshops.workshops wb
 where c.booking_id=a.id and c.other_booking_id=b.id and wa.id=a.workshop_id and wb.id=b.workshop_id and wa.edition_key=edition
 and c.resolved_at is null and (not msrc_workshops.overlaps(wa,wb)
 or not (a.status='confirmed' or (a.status in('held','approved') and a.expires_at>clock_timestamp()))
 or not (b.status='confirmed' or (b.status in('held','approved') and b.expires_at>clock_timestamp())));
 for pair in select a.id first_id,b.id second_id,a.workshop_id from msrc_workshops.bookings a
 join msrc_workshops.bookings b on b.actor_id=a.actor_id and a.id<b.id
 join msrc_workshops.workshops wa on wa.id=a.workshop_id join msrc_workshops.workshops wb on wb.id=b.workshop_id
 where wa.edition_key=edition and wb.edition_key=edition and msrc_workshops.overlaps(wa,wb)
 and (a.status='confirmed' or (a.status in('held','approved') and a.expires_at>clock_timestamp()))
 and (b.status='confirmed' or (b.status in('held','approved') and b.expires_at>clock_timestamp()))
 and not exists(select 1 from msrc_workshops.conflicts c where c.booking_id=a.id and c.other_booking_id=b.id and c.resolved_at is null) loop
 insert into msrc_workshops.conflicts(booking_id,other_booking_id) values(pair.first_id,pair.second_id);
 perform msrc_workshops.record(edition,pair.workshop_id,pair.first_id,'conflict.created',null,jsonb_build_object('otherBookingId',pair.second_id));
 for affected_booking in select * from msrc_workshops.bookings x where x.id in(pair.first_id,pair.second_id) loop perform msrc_workshops.enqueue(affected_booking,'conflict');end loop;
 end loop;
end$$;
create function msrc_workshops.sweep(edition text) returns jsonb language plpgsql security definer set search_path='' as $$
declare w msrc_workshops.workshops%rowtype;b msrc_workshops.bookings%rowtype;r msrc_workshops.reservations%rowtype;
 expired integer:=0;offered integer:=0;released integer:=0;offer_hours integer;begin
 select s.offer_hours into offer_hours from msrc_workshops.settings s where s.edition_key=edition;
 for b in select candidate.* from msrc_workshops.bookings candidate join msrc_workshops.workshops workshop_record on workshop_record.id=candidate.workshop_id
 where workshop_record.edition_key=edition and candidate.status in('held','approved','offered') and candidate.expires_at<=clock_timestamp() order by candidate.requested_at,candidate.id limit 500 for update of candidate loop
 update msrc_workshops.bookings x set status='expired' where x.id=b.id returning * into b;
 expired:=expired+1;perform msrc_workshops.record(edition,b.workshop_id,b.id,'booking.expired');perform msrc_workshops.enqueue(b,'expired');
 end loop;
 for r in select candidate.* from msrc_workshops.reservations candidate join msrc_workshops.workshops workshop_record on workshop_record.id=candidate.workshop_id
 where workshop_record.edition_key=edition and candidate.released_at is null and candidate.release_at<=clock_timestamp() limit 500 for update of candidate loop
 update msrc_workshops.reservations x set released_at=clock_timestamp() where x.id=r.id;
 released:=released+1;perform msrc_workshops.record(edition,r.workshop_id,null,'reservation.expired',r.reason,to_jsonb(r));
 end loop;
 perform msrc_workshops.reconcile_conflicts(edition);
 for w in select * from msrc_workshops.workshops x where x.edition_key=edition and not x.removed and x.published order by x.id loop
 if not msrc_workshops.ready(w) or w.booking_deadline<=clock_timestamp() then continue;end if;
 while msrc_workshops.allocations(w.id)<w.capacity and offered<500 loop
 select b0.* into b from msrc_workshops.bookings b0 where b0.workshop_id=w.id and b0.status='waitlisted'
 and msrc_workshops.eligible(w,b0.actor_id) and not msrc_workshops.has_overlap(w,b0.actor_id,b0.id)
 order by b0.requested_at,b0.id limit 1 for update;
 if b.id is null then exit;end if;
 update msrc_workshops.bookings x set status='offered',expires_at=least(w.booking_deadline,clock_timestamp()+make_interval(hours=>offer_hours)) where x.id=b.id returning * into b;
 offered:=offered+1;perform msrc_workshops.record(edition,w.id,b.id,'booking.offered');perform msrc_workshops.enqueue(b,'offered');
 end loop;end loop;
 return jsonb_build_object('state','updated','expired',expired,'offered',offered,'released',released);
end$$;

create function public.msrc_workshop_public_read(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_registration.server_only();
 return jsonb_build_object('state','ready','workshops',coalesce((select jsonb_agg(msrc_workshops.workshop_projection(w) order by w.start_at,w.id)
 from msrc_workshops.workshops w where w.edition_key=$1 and w.published and not w.removed),'[]'::jsonb));
end$$;
create function msrc_workshops.participant_read(edition text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if msrc_participant.observe_profile(edition) is null then return jsonb_build_object('state','denied');end if;
 return jsonb_build_object('state',case when exists(select 1 from msrc_workshops.settings s where s.edition_key=edition and s.enabled and s.hold_hours is not null and s.offer_hours is not null) then 'ready' else 'closed' end,
 'serverNow',clock_timestamp(),'mockPaymentEnabled',coalesce((select s.mock_payment_enabled from msrc_workshops.settings s where s.edition_key=edition),false),
 'workshops',coalesce((select jsonb_agg(msrc_workshops.workshop_projection(w) order by w.start_at,w.id) from msrc_workshops.workshops w where w.edition_key=edition
 and ((w.published and not w.removed) or exists(select 1 from msrc_workshops.bookings b where b.workshop_id=w.id and b.actor_id=auth.uid()))),'[]'::jsonb),
 'bookings',coalesce((select jsonb_agg(msrc_workshops.booking_projection(b) order by b.requested_at,b.id) from msrc_workshops.bookings b
 join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=edition and b.actor_id=auth.uid()),'[]'::jsonb));
end$$;
create function public.msrc_workshop_participant_read(edition_key text,session_claims jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_registration.server_only();if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_workshops.participant_read(edition_key);
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;
create function msrc_workshops.participant_mutate(edition text,input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare action text:=input->>'action';op uuid;w msrc_workshops.workshops%rowtype;b msrc_workshops.bookings%rowtype;
 cached msrc_workshops.operations%rowtype;digest bytea;result jsonb;hours integer;event_name text;begin
 perform msrc_workshops.guard(edition);
 -- Reuse registration's locked native-session boundary, including current JWT/native/absolute deadlines.
 if not coalesce(msrc_registration.participant_current(edition),false) then return jsonb_build_object('state','denied');end if;
 if jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>2048 or action is null
 or action not in('request','waitlist','accept_offer','decline_offer','cancel','mock_pay','redeem_discount')
 or coalesce(input->>'operationId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
 or exists(select 1 from jsonb_object_keys(input) k where k not in('action','operationId','workshopId','bookingId')) then return jsonb_build_object('state','invalid');end if;
 op:=(input->>'operationId')::uuid;digest:=sha256(convert_to(input::text,'UTF8'));
 select * into cached from msrc_workshops.operations o where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=op;
 if cached.operation_id is not null then return case when cached.input_hash=digest then cached.result else jsonb_build_object('state','conflict') end;end if;
 if not exists(select 1 from msrc_workshops.settings s where s.edition_key=edition and s.enabled and s.hold_hours is not null and s.offer_hours is not null) then return jsonb_build_object('state','closed');end if;
 perform msrc_workshops.sweep(edition);
 if action in('request','waitlist') then
 if coalesce(input->>'workshopId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return jsonb_build_object('state','invalid');end if;
 select * into w from msrc_workshops.workshops x where x.id=(input->>'workshopId')::uuid and x.edition_key=edition for update;
 if w.id is null then return jsonb_build_object('state','not_found');end if;
 select * into b from msrc_workshops.bookings x where x.workshop_id=w.id and x.actor_id=auth.uid() for update;
 if b.id is not null then
 result:=jsonb_build_object('state','updated','booking',msrc_workshops.booking_projection(b));
 insert into msrc_workshops.operations(edition_key,actor_id,operation_id,input_hash,result) values(edition,auth.uid(),op,digest,result);
 return result;end if;
 if not msrc_workshops.ready(w) or w.booking_deadline<=clock_timestamp() then return jsonb_build_object('state','closed');end if;
 if not msrc_workshops.eligible(w,auth.uid()) then return jsonb_build_object('state','denied');end if;
 if action='request' then
 if msrc_workshops.has_overlap(w,auth.uid()) then return jsonb_build_object('state','conflict');end if;
 -- A bounded cross-workshop sweep cannot let a newcomer jump an older eligible queue.
 if exists(select 1 from msrc_workshops.bookings queued where queued.workshop_id=w.id and queued.status='waitlisted'
 and msrc_workshops.eligible(w,queued.actor_id) and not msrc_workshops.has_overlap(w,queued.actor_id,queued.id)) then return jsonb_build_object('state','full');end if;
 if msrc_workshops.allocations(w.id)>=w.capacity then return jsonb_build_object('state','full');end if;
 select s.hold_hours into hours from msrc_workshops.settings s where s.edition_key=edition;
 insert into msrc_workshops.bookings(workshop_id,actor_id,status,expires_at) values(w.id,auth.uid(),'held',least(w.booking_deadline,clock_timestamp()+make_interval(hours=>hours))) returning * into b;
 else
 insert into msrc_workshops.bookings(workshop_id,actor_id,status) values(w.id,auth.uid(),'waitlisted') returning * into b;
 end if;
 event_name:=case when action='waitlist' then 'waitlisted' else 'requested' end;
 else
 if coalesce(input->>'bookingId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return jsonb_build_object('state','invalid');end if;
 select b0.* into b from msrc_workshops.bookings b0 join msrc_workshops.workshops w0 on w0.id=b0.workshop_id
 where b0.id=(input->>'bookingId')::uuid and b0.actor_id=auth.uid() and w0.edition_key=edition for update of b0;
 if b.id is null then return jsonb_build_object('state','not_found');end if;
 select * into w from msrc_workshops.workshops x where x.id=b.workshop_id for update;
 if action in('cancel','decline_offer') then
 if action='decline_offer' and b.status<>'offered' then return jsonb_build_object('state','invalid');end if;
 if b.status in('cancelled','declined','expired') then
 result:=jsonb_build_object('state','updated','booking',msrc_workshops.booking_projection(b));
 insert into msrc_workshops.operations(edition_key,actor_id,operation_id,input_hash,result) values(edition,auth.uid(),op,digest,result);
 return result;end if;
 update msrc_workshops.bookings x set status=case when action='cancel' then 'cancelled' else 'declined' end where x.id=b.id returning * into b;event_name:='cancelled';
 else
 if b.status='expired' or b.expires_at<=clock_timestamp() then return jsonb_build_object('state','expired');end if;
 if not msrc_workshops.ready(w) or w.booking_deadline<=clock_timestamp() then return jsonb_build_object('state','closed');end if;
 if not msrc_workshops.eligible(w,auth.uid()) then return jsonb_build_object('state','denied');end if;
 if msrc_workshops.has_overlap(w,auth.uid(),b.id) then return jsonb_build_object('state','conflict');end if;
 if action='accept_offer' then
 if b.status<>'offered' then return jsonb_build_object('state','invalid');end if;
 select s.hold_hours into hours from msrc_workshops.settings s where s.edition_key=edition;
 update msrc_workshops.bookings x set status='held',expires_at=least(w.booking_deadline,clock_timestamp()+make_interval(hours=>hours)) where x.id=b.id returning * into b;event_name:='offer_accepted';
 else
 if b.status<>'approved' or b.approved_at is null then return jsonb_build_object('state','denied');end if;
 if action='mock_pay' then
 if not coalesce((select s.mock_payment_enabled from msrc_workshops.settings s where s.edition_key=edition),false) then return jsonb_build_object('state','closed');end if;
 insert into msrc_workshops.orders(booking_id,kind,price_minor,due_minor,currency,actor_id) values(b.id,'mock',w.price_minor,w.price_minor,w.currency,auth.uid());
 update msrc_workshops.bookings x set status='confirmed',payment_kind='mock',paid_at=clock_timestamp() where x.id=b.id returning * into b;
 else
 if w.price_minor<>0 and not exists(select 1 from msrc_workshops.discounts d where d.booking_id=b.id and d.redeemed_at is null) then return jsonb_build_object('state','denied');end if;
 update msrc_workshops.discounts d set redeemed_at=clock_timestamp() where d.booking_id=b.id and d.redeemed_at is null;
 insert into msrc_workshops.orders(booking_id,kind,price_minor,due_minor,currency,actor_id) values(b.id,case when w.price_minor=0 then 'free' else 'full_discount' end,w.price_minor,0,w.currency,auth.uid());
 update msrc_workshops.bookings x set status='confirmed',payment_kind=case when w.price_minor=0 then 'free' else 'full_discount' end,paid_at=clock_timestamp() where x.id=b.id returning * into b;
 end if;event_name:='confirmed';end if;end if;end if;
 perform msrc_workshops.record(edition,w.id,b.id,'booking.'||event_name,null,msrc_workshops.booking_projection(b));perform msrc_workshops.enqueue(b,event_name);
 perform msrc_workshops.sweep(edition);
 select * into b from msrc_workshops.bookings x where x.id=b.id;
 result:=jsonb_build_object('state','updated','booking',msrc_workshops.booking_projection(b));
 insert into msrc_workshops.operations(edition_key,actor_id,operation_id,input_hash,result) values(edition,auth.uid(),op,digest,result);
 return result;
end$$;
create function public.msrc_workshop_participant_mutate(edition_key text,session_claims jsonb,input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous_claims text:=current_setting('request.jwt.claims',true);result jsonb;begin
 perform msrc_registration.server_only();if not msrc_registration.bind_claims(session_claims) then return jsonb_build_object('state','denied');end if;
 begin result:=msrc_workshops.participant_mutate(edition_key,input);
 exception when others then perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);raise;end;
 perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);return result;
end$$;

create function msrc_workshops.capacity_guard() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.capacity is distinct from old.capacity and (new.capacity is null or new.capacity<msrc_workshops.allocations(old.id))
 and msrc_workshops.allocations(old.id)>0 then raise exception using errcode='23514',message='Capacity cannot be lower than active allocations.';end if;
 return new;
end$$;
create trigger workshop_capacity_guard before update of capacity on msrc_workshops.workshops for each row execute function msrc_workshops.capacity_guard();
create function public.msrc_staff_workshop_read(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare manager boolean;scanner boolean;begin
 perform msrc_workshops.guard(edition_key);
 manager:=msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is not null;
 scanner:=msrc_staff.authorize(edition_key,array['checkInStaff'],false) is not null;
 if not(manager or scanner) then return jsonb_build_object('state','denied');end if;
 if msrc_staff.authorize(edition_key) is null then return jsonb_build_object('state','denied');end if;
 if msrc_participant.ready() and coalesce((select s.enabled from msrc_workshops.settings s where s.edition_key=$1),false) then perform msrc_workshops.sweep(edition_key);end if;
 return jsonb_build_object('state','ready','canManage',manager,
 'policy',case when manager then coalesce((select jsonb_build_object('enabled',s.enabled,'holdHours',s.hold_hours,'offerHours',s.offer_hours,'mockPaymentEnabled',s.mock_payment_enabled)
 from msrc_workshops.settings s where s.edition_key=$1),jsonb_build_object('enabled',false,'holdHours',null,'offerHours',null,'mockPaymentEnabled',false)) else null end,
 'workshops',coalesce((select jsonb_agg(msrc_workshops.workshop_projection(w)||jsonb_build_object('instructorActorId',case when manager then w.instructor_actor_id else null end,
 'canManage',manager,'canCheckin',manager or scanner,'canComplete',manager or coalesce(w.instructor_actor_id=auth.uid(),false)) order by w.start_at,w.id)
 from msrc_workshops.workshops w where w.edition_key=$1),'[]'::jsonb),
 'bookings',coalesce((select jsonb_agg(msrc_workshops.booking_projection(b)||jsonb_build_object('actorId',b.actor_id) order by b.requested_at,b.id)
 from msrc_workshops.bookings b join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=$1),'[]'::jsonb),
 'reservations',case when manager then coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'workshopId',r.workshop_id,'seats',r.seats,'releaseAt',r.release_at,'reason',r.reason,'releasedAt',r.released_at) order by r.created_at,r.id)
 from msrc_workshops.reservations r join msrc_workshops.workshops w on w.id=r.workshop_id where w.edition_key=$1 and r.released_at is null and r.release_at>clock_timestamp()),'[]'::jsonb) else '[]'::jsonb end,
 'conflicts',case when manager then coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'bookingId',c.booking_id,'otherBookingId',c.other_booking_id,'createdAt',c.created_at,'resolvedAt',c.resolved_at,'reason',c.reason) order by c.created_at,c.id)
 from msrc_workshops.conflicts c join msrc_workshops.bookings b on b.id=c.booking_id join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=$1),'[]'::jsonb) else '[]'::jsonb end);
end$$;

create function msrc_workshops.staff_mutate(edition text,input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare action text:=input->>'action';reason text:=nullif(btrim(input->>'reason'),'');op uuid;digest bytea;cached msrc_workshops.operations%rowtype;
 w msrc_workshops.workshops%rowtype;previous msrc_workshops.workshops%rowtype;b msrc_workshops.bookings%rowtype;r msrc_workshops.reservations%rowtype;
 fields jsonb;policy jsonb;expected integer;until_at timestamptz;result jsonb;manager boolean;sa boolean;changed_time boolean;changed_capacity boolean;
begin
 perform msrc_workshops.guard(edition);
 manager:=msrc_staff.authorize(edition,array['superAdmin','registrationWorkshopAdministrator'],false) is not null;
 sa:=msrc_staff.authorize(edition,array['superAdmin'],false) is not null;
 if not manager and action not in('checkin','complete') then return jsonb_build_object('state','denied');end if;
 if not manager and msrc_staff.authorize(edition,array['checkInStaff'],false) is null then return jsonb_build_object('state','denied');end if;
 if msrc_staff.authorize(edition) is null then return jsonb_build_object('state','denied');end if;
 if jsonb_typeof(input) is distinct from 'object' or octet_length(input::text)>65536 or action is null
 or action not in('save_workshop','save_policy','approve','decline','cancel','extend','reserve','release_reservation','offer_next','remove','resolve_conflict','checkin','complete','validate_discount')
 or coalesce(input->>'operationId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'
 or exists(select 1 from jsonb_object_keys(input) k where k not in('action','operationId','reason','workshop','policy','bookingId','workshopId','reservationId','expiresAt','seats','releaseAt'))
 or (reason is not null and (char_length(reason)>300 or reason ~ '[[:cntrl:]]')) then return jsonb_build_object('state','invalid');end if;
 op:=(input->>'operationId')::uuid;digest:=sha256(convert_to(input::text,'UTF8'));
 select * into cached from msrc_workshops.operations o where o.edition_key=edition and o.actor_id=auth.uid() and o.operation_id=op;
 if cached.operation_id is not null then return case when cached.input_hash=digest then cached.result else jsonb_build_object('state','conflict') end;end if;
 if action not in('save_policy','save_workshop','reserve','release_reservation','remove','resolve_conflict','cancel')
 and (not msrc_participant.ready() or not coalesce((select s.enabled from msrc_workshops.settings s where s.edition_key=edition),false)) then
 return jsonb_build_object('state','closed');end if;
 if action='save_policy' then
 if not sa then return jsonb_build_object('state','denied');end if;
 policy:=input->'policy';
 if jsonb_typeof(policy) is distinct from 'object' or reason is null
 or exists(select 1 from jsonb_object_keys(policy) k where k not in('enabled','holdHours','offerHours','mockPaymentEnabled'))
 or jsonb_typeof(policy->'enabled') is distinct from 'boolean' or jsonb_typeof(policy->'mockPaymentEnabled') is distinct from 'boolean'
 or not (policy ?& array['enabled','holdHours','offerHours','mockPaymentEnabled'])
 or (policy->'holdHours'<>'null'::jsonb and coalesce(policy->>'holdHours','') !~ '^[0-9]{1,4}$')
 or (policy->'offerHours'<>'null'::jsonb and coalesce(policy->>'offerHours','') !~ '^[0-9]{1,4}$') then return jsonb_build_object('state','invalid');end if;
 -- Activation remains a separately reviewed operator action; the preparatory staff editor cannot open gates.
 if ((policy->>'enabled')::boolean and not coalesce((select s.enabled from msrc_workshops.settings s where s.edition_key=edition),false))
 or ((policy->>'mockPaymentEnabled')::boolean and not coalesce((select s.mock_payment_enabled from msrc_workshops.settings s where s.edition_key=edition),false)) then
 return jsonb_build_object('state','closed');end if;
 insert into msrc_workshops.settings(edition_key,enabled,hold_hours,offer_hours,mock_payment_enabled)
 values(edition,(policy->>'enabled')::boolean,(policy->>'holdHours')::integer,(policy->>'offerHours')::integer,(policy->>'mockPaymentEnabled')::boolean)
 on conflict on constraint settings_pkey do update set enabled=excluded.enabled,hold_hours=excluded.hold_hours,offer_hours=excluded.offer_hours,mock_payment_enabled=excluded.mock_payment_enabled;
 perform msrc_workshops.record(edition,null,null,'policy.changed',reason,policy);
 elsif action='save_workshop' then
 fields:=input->'workshop';
 if jsonb_typeof(fields) is distinct from 'object' or reason is null
 or exists(select 1 from jsonb_object_keys(fields) k where k not in('id','version','published','titleEn','titleAr','descriptionEn','descriptionAr','instructor','instructorActorId','room','startAt','endAt','capacity','eligibilityEn','eligibilityAr','eligibilityRule','priceMinor','currency','bookingDeadline','transferBufferMinutes'))
 or coalesce(fields->>'version','') !~ '^[0-9]{1,9}$' or jsonb_typeof(fields->'published') is distinct from 'boolean' then return jsonb_build_object('state','invalid');end if;
 expected:=(fields->>'version')::integer;
 if fields->>'id' is not null then
 if fields->>'id' !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return jsonb_build_object('state','invalid');end if;
 select * into previous from msrc_workshops.workshops x where x.id=(fields->>'id')::uuid and x.edition_key=edition for update;
 if previous.id is null then return jsonb_build_object('state','not_found');end if;
 if previous.version<>expected or previous.removed then return jsonb_build_object('state','conflict');end if;
 elsif expected<>0 then return jsonb_build_object('state','conflict');end if;
 -- JSON conversion is inside the bounded validation exception block below.
 w:=jsonb_populate_record(null::msrc_workshops.workshops,jsonb_build_object('title_en',fields->'titleEn','title_ar',fields->'titleAr',
 'description_en',fields->'descriptionEn','description_ar',fields->'descriptionAr','instructor',fields->'instructor','instructor_actor_id',fields->'instructorActorId',
 'room',fields->'room','start_at',fields->'startAt','end_at',fields->'endAt','capacity',fields->'capacity','eligibility_en',fields->'eligibilityEn',
 'eligibility_ar',fields->'eligibilityAr','eligibility_rule',fields->'eligibilityRule','price_minor',fields->'priceMinor','currency',fields->'currency',
 'booking_deadline',fields->'bookingDeadline','transfer_buffer_minutes',fields->'transferBufferMinutes','published',fields->'published'));
 if exists(select 1 from unnest(array[w.title_en,w.title_ar,w.description_en,w.description_ar,w.instructor,w.room,w.eligibility_en,w.eligibility_ar]) t
 where t is not null and (t<>btrim(t) or t='' or translate(t,E'\n\r\t','') ~ '[[:cntrl:]]')) then return jsonb_build_object('state','invalid');end if;
 if w.instructor_actor_id is not null and not exists(select 1 from msrc_staff.profiles p join msrc_authorization.role_grants g on g.actor_id=p.actor_id
 join msrc_authorization.account_access a on a.actor_id=p.actor_id and a.state='active'
 where p.actor_id=w.instructor_actor_id and g.edition_key=edition and g.state='active' and g.scope_kind='edition'
 and g.role_name in('superAdmin','registrationWorkshopAdministrator','checkInStaff')) then return jsonb_build_object('state','invalid');end if;
 -- Retain a usable bilingual title for every affected-user notice, including cancellation of historical bookings.
 if previous.id is not null and (w.title_en is null or w.title_ar is null)
 and exists(select 1 from msrc_workshops.bookings x where x.workshop_id=previous.id) then return jsonb_build_object('state','conflict');end if;
 if previous.id is not null and msrc_workshops.allocations(previous.id)>0 then
 if w.capacity is null or w.capacity<msrc_workshops.allocations(previous.id) then return jsonb_build_object('state','capacity_below_allocations');end if;
 if w.start_at is null or w.end_at is null or w.transfer_buffer_minutes is null then return jsonb_build_object('state','conflict');end if;
 end if;
 if not exists(select 1 from msrc_workshops.settings s where s.edition_key=edition) then
 -- Creating a draft may establish only a disabled, otherwise entirely unset policy.
 insert into msrc_workshops.settings(edition_key) values(edition);end if;
 if previous.id is null then
 insert into msrc_workshops.workshops(edition_key,published,title_en,title_ar,description_en,description_ar,instructor,instructor_actor_id,room,start_at,end_at,capacity,eligibility_en,eligibility_ar,eligibility_rule,price_minor,currency,booking_deadline,transfer_buffer_minutes)
 values(edition,w.published,w.title_en,w.title_ar,w.description_en,w.description_ar,w.instructor,w.instructor_actor_id,w.room,w.start_at,w.end_at,w.capacity,w.eligibility_en,w.eligibility_ar,w.eligibility_rule,w.price_minor,w.currency,w.booking_deadline,w.transfer_buffer_minutes) returning * into w;
 else
 changed_time:=(previous.start_at,previous.end_at,previous.transfer_buffer_minutes) is distinct from (w.start_at,w.end_at,w.transfer_buffer_minutes);
 changed_capacity:=previous.capacity is distinct from w.capacity;
 update msrc_workshops.workshops x set published=w.published,title_en=w.title_en,title_ar=w.title_ar,description_en=w.description_en,description_ar=w.description_ar,instructor=w.instructor,instructor_actor_id=w.instructor_actor_id,
 room=w.room,start_at=w.start_at,end_at=w.end_at,capacity=w.capacity,eligibility_en=w.eligibility_en,eligibility_ar=w.eligibility_ar,eligibility_rule=w.eligibility_rule,
 price_minor=w.price_minor,currency=w.currency,booking_deadline=w.booking_deadline,transfer_buffer_minutes=w.transfer_buffer_minutes,version=x.version+1,updated_at=clock_timestamp()
 where x.id=previous.id returning * into w;
 for b in select * from msrc_workshops.bookings x where x.workshop_id=w.id and x.status in('held','approved','offered','confirmed','waitlisted') loop
 if changed_time then perform msrc_workshops.enqueue(b,'time_changed');end if;
 if changed_capacity then perform msrc_workshops.enqueue(b,'capacity_changed');end if;
 end loop;
 end if;
 perform msrc_workshops.record(edition,w.id,null,'workshop.saved',reason,jsonb_build_object('before',to_jsonb(previous),'after',to_jsonb(w)));
 perform msrc_workshops.reconcile_conflicts(edition);
 elsif action in('reserve','offer_next','remove') then
 if coalesce(input->>'workshopId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return jsonb_build_object('state','invalid');end if;
 select * into w from msrc_workshops.workshops x where x.id=(input->>'workshopId')::uuid and x.edition_key=edition for update;
 if w.id is null then return jsonb_build_object('state','not_found');end if;
 if action='reserve' then
 if reason is null or coalesce(input->>'seats','') !~ '^[0-9]{1,9}$' or input->>'releaseAt' is null then return jsonb_build_object('state','invalid');end if;
 until_at:=(input->>'releaseAt')::timestamptz;
 if not isfinite(until_at) or until_at<=clock_timestamp() or w.capacity is null or (input->>'seats')::integer<1 then return jsonb_build_object('state','invalid');end if;
 perform msrc_workshops.sweep(edition);
 if msrc_workshops.allocations(w.id)+(input->>'seats')::integer>w.capacity then return jsonb_build_object('state','full');end if;
 insert into msrc_workshops.reservations(workshop_id,seats,reason,release_at,created_by) values(w.id,(input->>'seats')::integer,reason,until_at,auth.uid()) returning * into r;
 perform msrc_workshops.record(edition,w.id,null,'reservation.created',reason,to_jsonb(r));
 elsif action='remove' then
 if reason is null then return jsonb_build_object('state','invalid');end if;
 update msrc_workshops.workshops x set removed=true,published=false,version=x.version+1,updated_at=clock_timestamp() where x.id=w.id;
 for b in select * from msrc_workshops.bookings x where x.workshop_id=w.id and x.status in('held','approved','offered','confirmed','waitlisted') for update loop
 update msrc_workshops.bookings x set status='cancelled' where x.id=b.id returning * into b;
 perform msrc_workshops.record(edition,w.id,b.id,'booking.removed',reason,msrc_workshops.booking_projection(b));perform msrc_workshops.enqueue(b,'removed');end loop;
 update msrc_workshops.reservations x set released_at=clock_timestamp() where x.workshop_id=w.id and x.released_at is null;
 perform msrc_workshops.record(edition,w.id,null,'workshop.removed',reason,to_jsonb(w));
 end if;
 elsif action='release_reservation' then
 if reason is null or coalesce(input->>'reservationId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return jsonb_build_object('state','invalid');end if;
 select r0.* into r from msrc_workshops.reservations r0 join msrc_workshops.workshops w0 on w0.id=r0.workshop_id where r0.id=(input->>'reservationId')::uuid and w0.edition_key=edition for update of r0;
 if r.id is null then return jsonb_build_object('state','not_found');end if;
 update msrc_workshops.reservations x set released_at=coalesce(x.released_at,clock_timestamp()) where x.id=r.id;
 perform msrc_workshops.record(edition,r.workshop_id,null,'reservation.released',reason,to_jsonb(r));
 else
 if coalesce(input->>'bookingId','') !~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' then return jsonb_build_object('state','invalid');end if;
 select b0.* into b from msrc_workshops.bookings b0 join msrc_workshops.workshops w0 on w0.id=b0.workshop_id where b0.id=(input->>'bookingId')::uuid and w0.edition_key=edition for update of b0;
 if b.id is null then return jsonb_build_object('state','not_found');end if;
 select * into w from msrc_workshops.workshops x where x.id=b.workshop_id for update;
 if action='complete' and not(manager or coalesce(w.instructor_actor_id=auth.uid(),false)) then return jsonb_build_object('state','denied');end if;
 if action in('approve','decline','extend','validate_discount') and (b.status not in('held','approved') or b.expires_at<=clock_timestamp()) then return jsonb_build_object('state','expired');end if;
 if action='approve' then
 if not msrc_workshops.eligible(w,b.actor_id) then return jsonb_build_object('state','denied');end if;
 if msrc_workshops.has_overlap(w,b.actor_id,b.id) then return jsonb_build_object('state','conflict');end if;
 update msrc_workshops.bookings x set status='approved',approved_at=coalesce(x.approved_at,clock_timestamp()),approved_by=coalesce(x.approved_by,auth.uid()) where x.id=b.id returning * into b;
 perform msrc_workshops.enqueue(b,'approved');
 elsif action in('decline','cancel','resolve_conflict') then
 if reason is null then return jsonb_build_object('state','invalid');end if;
 if action='resolve_conflict' and not exists(select 1 from msrc_workshops.conflicts c where (c.booking_id=b.id or c.other_booking_id=b.id) and c.resolved_at is null) then return jsonb_build_object('state','not_found');end if;
 update msrc_workshops.bookings x set status=case when action='decline' then 'declined' else 'cancelled' end where x.id=b.id returning * into b;
 perform msrc_workshops.enqueue(b,case when action='decline' then 'declined' else 'cancelled' end);
 elsif action='extend' then
 if reason is null or input->>'expiresAt' is null then return jsonb_build_object('state','invalid');end if;
 until_at:=(input->>'expiresAt')::timestamptz;
 if not isfinite(until_at) or until_at<=b.expires_at or w.booking_deadline is null or until_at>w.booking_deadline then return jsonb_build_object('state','invalid');end if;
 update msrc_workshops.bookings x set expires_at=until_at where x.id=b.id returning * into b;perform msrc_workshops.enqueue(b,'extended');
 elsif action='validate_discount' then
 if reason is null then return jsonb_build_object('state','invalid');end if;
 if exists(select 1 from msrc_workshops.discounts d where d.booking_id=b.id) then return jsonb_build_object('state','conflict');end if;
 insert into msrc_workshops.discounts(booking_id,validated_by,reason) values(b.id,auth.uid(),reason);
 elsif action='checkin' then
 if b.status<>'confirmed' or w.removed or not msrc_workshops.eligible(w,b.actor_id) then return jsonb_build_object('state','denied');end if;
 if exists(select 1 from msrc_workshops.conflicts c where (c.booking_id=b.id or c.other_booking_id=b.id) and c.resolved_at is null) then return jsonb_build_object('state','conflict');end if;
 update msrc_workshops.bookings x set checked_in_at=coalesce(x.checked_in_at,clock_timestamp()),checked_in_by=coalesce(x.checked_in_by,auth.uid()) where x.id=b.id returning * into b;
 elsif action='complete' then
 if b.status<>'confirmed' or b.checked_in_at is null or w.removed then return jsonb_build_object('state','denied');end if;
 if exists(select 1 from msrc_workshops.conflicts c where (c.booking_id=b.id or c.other_booking_id=b.id) and c.resolved_at is null) then return jsonb_build_object('state','conflict');end if;
 update msrc_workshops.bookings x set completed_at=coalesce(x.completed_at,clock_timestamp()),completed_by=coalesce(x.completed_by,auth.uid()) where x.id=b.id returning * into b;
 end if;
 perform msrc_workshops.record(edition,w.id,b.id,'booking.'||action,reason,msrc_workshops.booking_projection(b));
 end if;
 perform msrc_workshops.sweep(edition);
 result:=jsonb_build_object('state','updated');
 if w.id is not null then select * into w from msrc_workshops.workshops x where x.id=w.id;end if;
 if b.id is not null then select * into b from msrc_workshops.bookings x where x.id=b.id;end if;
 if w.id is not null then result:=result||jsonb_build_object('workshop',msrc_workshops.workshop_projection(w));end if;
 if b.id is not null then result:=result||jsonb_build_object('booking',msrc_workshops.booking_projection(b));end if;
 insert into msrc_workshops.operations(edition_key,actor_id,operation_id,input_hash,result) values(edition,auth.uid(),op,digest,result);
 return result;
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range or check_violation or not_null_violation then
 return jsonb_build_object('state','invalid');
end$$;
create function public.msrc_staff_workshop_mutate(edition_key text,input jsonb) returns jsonb language sql security definer set search_path='' as $$
 select msrc_workshops.staff_mutate(edition_key,input);
$$;
create function public.msrc_workshop_maintenance(edition_key text) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_registration.server_only();perform msrc_workshops.guard(edition_key);
 if not msrc_participant.ready() or not coalesce((select s.enabled from msrc_workshops.settings s where s.edition_key=$1),false)
 or not coalesce((select s.sweeps_enabled from msrc_outbox.settings s where s.singleton),false) then return jsonb_build_object('state','closed');end if;
 return msrc_workshops.sweep(edition_key);
end$$;
create function msrc_workshops.completion_evidence(edition text,actor uuid,workshop uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('workshopId',w.id,'bookingId',b.id,'bookingConfirmed',b.status='confirmed','checkedInAt',b.checked_in_at,'checkedInBy',b.checked_in_by,
 'completedAt',b.completed_at,'completedBy',b.completed_by,'conflict',exists(select 1 from msrc_workshops.conflicts c where (c.booking_id=b.id or c.other_booking_id=b.id) and c.resolved_at is null),
 'participationEvidenceComplete',b.status='confirmed' and not w.removed and b.checked_in_at is not null and b.completed_at is not null
 and not exists(select 1 from msrc_workshops.conflicts c where (c.booking_id=b.id or c.other_booking_id=b.id) and c.resolved_at is null))
 from msrc_workshops.bookings b join msrc_workshops.workshops w on w.id=b.workshop_id where w.edition_key=edition and w.id=workshop and b.actor_id=actor;
$$;
create function public.msrc_workshop_completion_evidence(edition_key text,actor_id uuid,workshop_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$begin
 perform msrc_registration.server_only();return msrc_workshops.completion_evidence(edition_key,actor_id,workshop_id);
end$$;
comment on function public.msrc_workshop_completion_evidence(text,uuid,uuid) is 'CRT-01 workshop completion evidence for trusted certificates module. Confirmed booking + check-in + authorized completion; never implies survey completion or certificate eligibility. No two-day conference-certificate prerequisite.';
revoke all on all functions in schema msrc_workshops from public,anon,authenticated,service_role;
revoke all on function public.msrc_staff_workshop_read(text),public.msrc_staff_workshop_mutate(text,jsonb),
 public.msrc_workshop_public_read(text),public.msrc_workshop_participant_read(text,jsonb),public.msrc_workshop_participant_mutate(text,jsonb,jsonb),
 public.msrc_workshop_maintenance(text),public.msrc_workshop_completion_evidence(text,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_workshop_read(text),public.msrc_staff_workshop_mutate(text,jsonb) to authenticated;
grant execute on function public.msrc_workshop_public_read(text),public.msrc_workshop_participant_read(text,jsonb),public.msrc_workshop_participant_mutate(text,jsonb,jsonb),
 public.msrc_workshop_maintenance(text),public.msrc_workshop_completion_evidence(text,uuid,uuid) to service_role;
notify pgrst,'reload schema';
commit;
