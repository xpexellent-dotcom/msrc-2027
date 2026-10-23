-- ENG-064. Synthetic rollback-only proof; never run against hosted data.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_registration' and c.relname in('confirmation_rounds','confirmation_windows')
 and not(c.relrowsecurity and c.relforcerowsecurity)),'Every confirmation table forces RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) role(name)
 cross join (values('confirmation_rounds'),('confirmation_windows')) object(name)
 where has_table_privilege(role.name,'msrc_registration.'||object.name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'Confirmation records have no API table grants');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.pronamespace='public'::regnamespace and p.proname in('msrc_registration_confirm_seat','msrc_registration_release_seat','msrc_registration_confirmation_maintenance')
 and a.grantee in(0,'anon'::regrole,'authenticated'::regrole)),'Participant and maintenance entrypoints are server-only');
select ok(not exists(select 1 from pg_proc p where p.pronamespace='msrc_registration'::regnamespace and p.proname like '%confirmation%'
 and p.prosecdef and not coalesce(p.proconfig @> array['search_path=""'],false)),'Private confirmation functions have empty search paths');
select is((select count(*) from msrc_registration.confirmation_rounds),0::bigint,'Migration starts no round');
select ok((select not delivery_enabled and not sweeps_enabled and daily_cap=0 from msrc_outbox.settings),'Migration leaves delivery closed');
select ok(msrc_outbox.registration_message_valid('registration_confirm_seat',1,'en','synthetic@example.invalid',
 '{"confirm_expires_at":"2027-01-01T00:00:00Z","nonresponse_policy":"keep_unconfirmed"}'::jsonb),'DRAFT invitation validates explicit keep policy');
select ok(not msrc_outbox.registration_message_valid('registration_confirm_seat',1,'en','synthetic@example.invalid',
 '{"confirm_expires_at":"2027-01-01T00:00:00Z"}'::jsonb),'Invitation requires explicit deadline policy');
select ok(not msrc_outbox.registration_message_valid('registration_confirm_seat',1,'ar','synthetic@example.invalid',
 '{"confirm_expires_at":"2027-01-01T00:00:00Z","nonresponse_policy":"release_unconfirmed"}'::jsonb),'Transactional invitation remains English');
select ok(not msrc_outbox.registration_message_valid('registration_confirm_seat',1,'en','synthetic@example.invalid',
 '{"confirm_expires_at":"2027-02-30T00:00:00Z","nonresponse_policy":"release_unconfirmed"}'::jsonb),'Invalid calendar date is refused');
select ok(msrc_outbox.registration_message_valid('registration_seat_released',1,'en','synthetic@example.invalid','{}'::jsonb),'Released template has minimal payload');

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-confirmation');
update msrc_registration.settings set conference_days=array[(clock_timestamp() at time zone 'Asia/Riyadh')::date+1,(clock_timestamp() at time zone 'Asia/Riyadh')::date+2],offer_window_hours=24,general_capacity=5
 where edition_key='synthetic-confirmation';
do $$declare n integer;begin for n in 7101..7112 loop perform pg_temp.registration_fixture(n,'synthetic-confirmation');end loop;end$$;
select pg_temp.registration_fixture(7113,'synthetic-confirmation',false);
select pg_temp.registration_staff_fixture(7201,'synthetic-confirmation');
select pg_temp.registration_staff_fixture(7202,'synthetic-confirmation','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(7203,'synthetic-confirmation','checkInStaff');
-- Sessions were created in prior statements, before observe_context authorization.
do $$declare n integer;begin for n in 7101..7112 loop perform pg_temp.registration_submit('synthetic-confirmation',n,md5(n::text)||md5(n::text));end loop;end$$;
update msrc_registration.requests set status='approved' where actor_id in(pg_temp.registration_actor(7101),pg_temp.registration_actor(7102),
 pg_temp.registration_actor(7103),pg_temp.registration_actor(7107),pg_temp.registration_actor(7108));
update msrc_registration.requests set status='waitlisted',created_at=created_at-interval '1 day' where actor_id=pg_temp.registration_actor(7105);
update msrc_registration.requests set status='waitlisted' where actor_id=pg_temp.registration_actor(7106);
create function pg_temp.confirm_id(n integer) returns uuid language sql stable as $$
 select id from msrc_registration.requests where edition_key='synthetic-confirmation' and actor_id=pg_temp.registration_actor(n);$$;
create function pg_temp.confirm_action(action text,n integer,op integer,target integer default null) returns jsonb language plpgsql as $$
declare request uuid:=pg_temp.confirm_id(coalesce(target,n));operation uuid:=('e7900000-0000-4000-8000-'||lpad(op::text,12,'0'))::uuid;
begin
 if action='confirm' then return public.msrc_registration_confirm_seat('synthetic-confirmation',pg_temp.registration_claims(n),request,operation);
 else return public.msrc_registration_release_seat('synthetic-confirmation',pg_temp.registration_claims(n),request,operation);end if;
end$$;
create temporary table confirmation_original_tickets as select * from msrc_registration.tickets;

select set_config('request.jwt.claims',pg_temp.registration_claims(7202)::text,true);
select is(public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')->>'state','denied','Registration administrator cannot preview a Super Admin round');
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation',gen_random_uuid(),'release_unconfirmed',repeat('a',64))->>'state','denied','Registration administrator cannot start a round');
select set_config('request.jwt.claims',pg_temp.registration_claims(7201)::text,true);
select is(public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')#>>'{confirmation,eligibleCount}','5','Preview counts actual approved recipients');
select is((public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')#>>'{confirmation,opensAt}')::timestamptz,
 (((clock_timestamp() at time zone 'Asia/Riyadh')::date+1)::timestamp at time zone 'Asia/Riyadh')-interval '3 days','Opening threshold uses earliest conference date at Riyadh midnight');
select set_config('synthetic.confirm_preview',public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')#>>'{confirmation,previewToken}',true);
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation',gen_random_uuid(),null,current_setting('synthetic.confirm_preview'))->>'state','conflict','Missing nonresponse policy has no default');
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation',gen_random_uuid(),'release_unconfirmed',repeat('0',64))->>'state','conflict','Stale recipient preview refuses the send');
update msrc_registration.settings set confirm_seat_response_hours=12 where edition_key='synthetic-confirmation';
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation',gen_random_uuid(),'release_unconfirmed',current_setting('synthetic.confirm_preview'))->>'state','conflict','Changing response duration invalidates an otherwise valid preview token');
update msrc_registration.settings set confirm_seat_response_hours=11 where edition_key='synthetic-confirmation';
select set_config('request.jwt.claims',(pg_temp.registration_claims(7201)||jsonb_build_object('aal','aal1','amr','[]'::jsonb))::text,true);
select is(public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')->>'state','denied','Super Admin without exact-session TOTP cannot preview the round');
select set_config('request.jwt.claims',pg_temp.registration_claims(7201)::text,true);
update msrc_registration.settings set confirm_seat_lead_days=0 where edition_key='synthetic-confirmation';
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation',gen_random_uuid(),'release_unconfirmed',current_setting('synthetic.confirm_preview'))->>'state','not_due','Round refuses to open before configured threshold');
update msrc_registration.settings set confirm_seat_lead_days=3 where edition_key='synthetic-confirmation';
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation','e7900000-0000-4000-8000-000000000001','release_unconfirmed',current_setting('synthetic.confirm_preview'))->>'opened','5','Start transaction opens all five approved windows');
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation','e7900000-0000-4000-8000-000000000001','release_unconfirmed',current_setting('synthetic.confirm_preview'))->>'opened','5','Same round operation replays its receipt');
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation','e7900000-0000-4000-8000-000000000001','keep_unconfirmed',current_setting('synthetic.confirm_preview'))->>'state','conflict','Operation cannot change chosen policy');
select is((select count(*) from msrc_registration.confirmation_rounds where edition_key='synthetic-confirmation'),1::bigint,'Retry creates one immutable round');
select ok((select bool_and(deadline-opened_at=interval '11 hours') from msrc_registration.confirmation_windows),'Each deadline starts at its actual window opening');
select is((select count(*) from msrc_outbox.messages where template_key='registration_confirm_seat'),5::bigint,'One invitation is enqueued per request');
select is(public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')#>>'{confirmation,canStart}','false','Zero eligible recipients cannot start an empty round');
select is(public.msrc_staff_registration('synthetic-confirmation','','confirmation_awaiting')#>>'{registration,counts,confirmationAwaiting}','5','Queue exposes confirmation awaiting count');
select is(public.msrc_registration_me('synthetic-confirmation',pg_temp.registration_claims(7101))->>'confirmationVersion','1','Own projection identifies confirmation capability');
select is(public.msrc_registration_me('synthetic-confirmation',pg_temp.registration_claims(7101))#>>'{request,confirmation,state}','awaiting','Own status exposes only own active window');

select is(pg_temp.confirm_action('confirm',7102,2,7101)->>'state','denied','Foreign participant cannot confirm another request');
select is(pg_temp.confirm_action('release',7102,3,7101)->>'state','denied','Foreign participant cannot release another request');
select is(public.msrc_registration_confirm_seat('synthetic-confirmation',pg_temp.registration_claims(7113),pg_temp.confirm_id(7101),gen_random_uuid())->>'state','denied','Never verified account cannot confirm');
select is(public.msrc_registration_confirm_seat('synthetic-confirmation',pg_temp.registration_claims(7101)||jsonb_build_object('session_id',gen_random_uuid()),pg_temp.confirm_id(7101),gen_random_uuid())->>'state','denied','Unknown native session cannot confirm');
select is(public.msrc_registration_confirm_seat('synthetic-confirmation',pg_temp.registration_claims(7101)||'{"exp":0}'::jsonb,pg_temp.confirm_id(7101),gen_random_uuid())->>'state','denied','Expired native token cannot confirm');
set local role authenticated;
select throws_ok($$select public.msrc_registration_confirm_seat('synthetic-confirmation','{}'::jsonb,gen_random_uuid(),gen_random_uuid())$$,'42501',null,'Browser cannot forge service-only confirmation claims');
reset role;
select is(pg_temp.confirm_action('confirm',7101,10)->>'state','updated','Participant confirms before the deadline');
select is(pg_temp.confirm_action('confirm',7101,10)->>'state','updated','Same confirmation operation is idempotent');
select is(pg_temp.confirm_action('release',7101,10)->>'state','conflict','Operation cannot switch from confirmation to release');
select is((select status from msrc_registration.requests where id=pg_temp.confirm_id(7101)),'confirmed','Confirmation updates approved to confirmed');
select ok((select t.id=o.id and t.secret_hash=o.secret_hash and t.issued_at=o.issued_at and t.status='issued'
 from msrc_registration.tickets t join confirmation_original_tickets o on o.request_id=t.request_id where t.request_id=pg_temp.confirm_id(7101)),'Confirmation preserves exact ticket UUID, hash and issuance time');
select is((select count(*) from msrc_outbox.messages where template_key='registration_approved' and recipient_email='registration-7101@example.invalid'),1::bigint,'Confirmation does not resend approval email');
select is((select count(*) from msrc_registration.audit where request_id=pg_temp.confirm_id(7101) and event='request.seat_confirmed'),1::bigint,'Repeated confirmation writes one audit');
select is(pg_temp.confirm_action('release',7102,11)->>'state','updated','Participant releases an approved seat');
select is(pg_temp.confirm_action('release',7102,11)->>'state','updated','Release replay is idempotent');
select is((select status from msrc_registration.requests where id=pg_temp.confirm_id(7105)),'offered','Released seat passes to oldest waitlisted request');
select is((select status from msrc_registration.requests where id=pg_temp.confirm_id(7106)),'waitlisted','Replay never passes a second seat');
select is((select status from msrc_registration.tickets where request_id=pg_temp.confirm_id(7102)),'revoked','Release revokes the existing ticket');
select is((select count(*) from msrc_outbox.messages where recipient_email='registration-7102@example.invalid' and template_key='registration_seat_released'),1::bigint,'Release enqueues exactly one released email');
select is((select count(*) from msrc_outbox.messages where recipient_email='registration-7102@example.invalid' and template_key='registration_cancelled'),0::bigint,'Release does not duplicate the old cancellation email');

update msrc_registration.confirmation_windows set opened_at=clock_timestamp()-interval '2 hours',deadline=clock_timestamp()-interval '1 hour' where request_id=pg_temp.confirm_id(7103);
select is(pg_temp.confirm_action('confirm',7103,12)->>'state','expired','Confirmation at or after deadline cannot win');
select is((select status from msrc_registration.requests where id=pg_temp.confirm_id(7103)),'cancelled','Explicit release policy cancels elapsed approval');
select is((select status from msrc_registration.requests where id=pg_temp.confirm_id(7106)),'offered','Elapsed confirmation passes one released seat to waitlist');
select is(msrc_registration.expire_confirmations('synthetic-confirmation',pg_temp.confirm_id(7103))->>'released','0','Deadline expiry is idempotent');
select is((select count(*) from msrc_registration.audit where request_id=pg_temp.confirm_id(7103) and event='request.seat_released' and performer_id is null),1::bigint,'Automatic release has one automatic audit with reason');

update msrc_registration.confirmation_windows set opened_at=clock_timestamp()-interval '2 hours',deadline=clock_timestamp()-interval '1 hour' where request_id=pg_temp.confirm_id(7107);
select is(public.msrc_registration_ticket('synthetic-confirmation',pg_temp.registration_claims(7107),repeat('a',64))#>>'{ticket,status}','revoked','Direct ticket read expires an elapsed release-policy window');
update msrc_registration.confirmation_windows set opened_at=clock_timestamp()-interval '2 hours',deadline=clock_timestamp()-interval '1 hour' where request_id=pg_temp.confirm_id(7108);
select set_config('request.jwt.claims',pg_temp.registration_claims(7203)::text,true);
select is(public.msrc_staff_checkin('synthetic-confirmation',(select upper(substr(replace(id::text,'-',''),1,12)) from msrc_registration.tickets where request_id=pg_temp.confirm_id(7108)),(clock_timestamp() at time zone 'Asia/Riyadh')::date+1,'Synthetic confirmation gate')->>'state','revoked','Check-in expires elapsed confirmation before admission');
select is((select count(*) from msrc_registration.attendance a join msrc_registration.tickets t on t.id=a.ticket_id where t.request_id=pg_temp.confirm_id(7108)),0::bigint,'Elapsed QR cannot produce attendance');

-- A new explicit keep round snapshots policy/duration; settings edits cannot
-- retroactively change existing windows. No fallback policy is invented.
update msrc_registration.requests set status='approved' where id=pg_temp.confirm_id(7104);
select set_config('request.jwt.claims',pg_temp.registration_claims(7201)::text,true);
select set_config('synthetic.keep_preview',public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')#>>'{confirmation,previewToken}',true);
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation','e7900000-0000-4000-8000-000000000020','keep_unconfirmed',current_setting('synthetic.keep_preview'))->>'opened','1','Super Admin explicitly selects keep for new recipients');
update msrc_registration.confirmation_windows set opened_at=clock_timestamp()-interval '2 hours',deadline=clock_timestamp()-interval '1 hour' where request_id=pg_temp.confirm_id(7104);
select is(public.msrc_registration_me('synthetic-confirmation',pg_temp.registration_claims(7104))#>>'{request,confirmation,state}','kept','Own read applies chosen keep policy');
select is((select status from msrc_registration.requests where id=pg_temp.confirm_id(7104)),'approved','Keep policy retains approved registration');
select is((select status from msrc_registration.tickets where request_id=pg_temp.confirm_id(7104)),'issued','Keep policy retains the issued ticket');
select is(pg_temp.confirm_action('confirm',7104,21)->>'state','expired','Keep policy does not invent late confirmation');
select is(public.msrc_registration_cancel('synthetic-confirmation',pg_temp.registration_claims(7104),pg_temp.confirm_id(7104),'e7900000-0000-4000-8000-000000000022')->>'state','updated','Participant can still cancel a kept seat');
select is((select state from msrc_registration.confirmation_windows where request_id=pg_temp.confirm_id(7104)),'released','Generic cancellation also updates confirmation projection');
select is(pg_temp.confirm_action('release',7101,23)->>'state','updated','A confirmed participant can subsequently release their seat');
select is((select status from msrc_registration.tickets where request_id=pg_temp.confirm_id(7101)),'revoked','Release after confirmation revokes same ticket');

update msrc_registration.requests set status='approved' where id=pg_temp.confirm_id(7109);
select is(public.msrc_registration_confirmation_maintenance('synthetic-confirmation')->>'state','closed','Default-off sweeps prevent cron state changes');
select ok(not exists(select 1 from msrc_registration.confirmation_windows where request_id=pg_temp.confirm_id(7109)),'Closed maintenance creates no late window');
update msrc_outbox.settings set sweeps_enabled=true;
select is(public.msrc_registration_confirmation_maintenance('synthetic-confirmation')->>'opened','1','Existing drain maintenance opens later approved windows after explicit round');
select is((select c.nonresponse_policy from msrc_registration.confirmation_rounds c join msrc_registration.confirmation_windows w on w.round_id=c.id where w.request_id=pg_temp.confirm_id(7109)),'keep_unconfirmed','Later approval receives explicit latest round policy');
select is(public.msrc_registration_confirmation_maintenance('synthetic-confirmation')->>'opened','0','Maintenance opening is idempotent');
create function pg_temp.fail_confirmation_release() returns trigger language plpgsql as $$begin
 if new.template_key='registration_seat_released' and new.recipient_email='registration-7109@example.invalid' then
 raise exception using errcode='P0001',message='Synthetic release enqueue failure';end if;return new;end$$;
create trigger synthetic_confirmation_release_failure before insert on msrc_outbox.messages for each row execute function pg_temp.fail_confirmation_release();
select throws_ok($$select pg_temp.confirm_action('release',7109,24)$$,'P0001','Synthetic release enqueue failure','Release enqueue failure aborts cancellation and revocation');
select is((select status from msrc_registration.requests where id=pg_temp.confirm_id(7109)),'approved','Failed release retains registration');
select is((select status from msrc_registration.tickets where request_id=pg_temp.confirm_id(7109)),'issued','Failed release retains ticket');
select is((select state from msrc_registration.confirmation_windows where request_id=pg_temp.confirm_id(7109)),'awaiting','Failed release retains active window');
select ok(not exists(select 1 from msrc_registration.participant_operations where request_id=pg_temp.confirm_id(7109)),'Failed release writes no operation receipt');
select ok(not exists(select 1 from msrc_registration.audit where request_id=pg_temp.confirm_id(7109) and event in('ticket.revoked','request.seat_released')),'Failed release writes no revocation or release audit');
drop trigger synthetic_confirmation_release_failure on msrc_outbox.messages;
select is(public.msrc_staff_launch_readiness('synthetic-confirmation')->>'confirmationSettingsSet','true','Launch readiness observes configured timing');
select is(public.msrc_staff_launch_readiness('synthetic-confirmation')#>>'{requiredRpcs,confirmation}','true','Launch readiness observes full confirmation RPC set');
select is(public.msrc_staff_registration_detail('synthetic-confirmation',pg_temp.confirm_id(7101))->>'confirmationVersion','1','Staff detail projects confirmation capability and events');
select ok(exists(select 1 from jsonb_array_elements(public.msrc_staff_registration_detail('synthetic-confirmation',pg_temp.confirm_id(7101))#>'{detail,history}') h
 where h->>'event'='request.seat_confirmed' and h->>'actorKind'='participant'),'Staff timeline includes participant confirmation');

-- Lead zero remains valid on the first day; no undocumented upper cutoff.
update msrc_registration.settings set conference_days=array[(clock_timestamp() at time zone 'Asia/Riyadh')::date,(clock_timestamp() at time zone 'Asia/Riyadh')::date+1],confirm_seat_lead_days=0 where edition_key='synthetic-confirmation';
update msrc_registration.requests set status='approved' where id=pg_temp.confirm_id(7110);
select is(public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')#>>'{confirmation,canStart}','true','Zero lead days permits opening on the first conference day');
-- Failed enqueue rolls back round, window and audit together.
create function pg_temp.fail_confirmation_enqueue() returns trigger language plpgsql as $$begin
 if new.template_key='registration_confirm_seat' and new.recipient_email='registration-7110@example.invalid' then
 raise exception using errcode='P0001',message='Synthetic confirmation enqueue failure';end if;return new;end$$;
create trigger synthetic_confirmation_enqueue_failure before insert on msrc_outbox.messages for each row execute function pg_temp.fail_confirmation_enqueue();
select set_config('synthetic.fail_preview',public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')#>>'{confirmation,previewToken}',true);
select throws_ok($$select public.msrc_staff_registration_confirmation_start('synthetic-confirmation','e7900000-0000-4000-8000-000000000030','release_unconfirmed',current_setting('synthetic.fail_preview'))$$,'P0001','Synthetic confirmation enqueue failure','Outbox failure aborts the entire confirmation round');
select ok(not exists(select 1 from msrc_registration.confirmation_windows where request_id=pg_temp.confirm_id(7110)),'Failed enqueue leaves no confirmation window');
select ok(not exists(select 1 from msrc_registration.confirmation_rounds where operation_id='e7900000-0000-4000-8000-000000000030'),'Failed enqueue leaves no round receipt');
select ok(not exists(select 1 from msrc_registration.audit where request_id=pg_temp.confirm_id(7110) and event='request.confirmation_opened'),'Failed enqueue leaves no confirmation audit');
drop trigger synthetic_confirmation_enqueue_failure on msrc_outbox.messages;
update msrc_registration.requests set status='approved' where id=pg_temp.confirm_id(7112);
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation','e7900000-0000-4000-8000-000000000031','release_unconfirmed',current_setting('synthetic.fail_preview'))->>'state','conflict','A newly approved recipient invalidates the previously shown exact recipient preview');
update msrc_registration.settings set confirm_seat_response_hours=null where edition_key='synthetic-confirmation';
select is(public.msrc_staff_registration_confirmation_preview('synthetic-confirmation')#>>'{confirmation,settingsReady}','false','Missing timing closes round readiness');
select is(public.msrc_staff_registration_confirmation_start('synthetic-confirmation',gen_random_uuid(),'release_unconfirmed',current_setting('synthetic.fail_preview'))->>'state','area_not_ready','Missing settings refuse an invented response window');
select * from finish();
rollback;
