-- ENG-055. Synthetic participants/settings only; no external delivery; rollback.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='msrc_registration.participant_operations'::regclass),'Participant operation receipts force RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
 where has_table_privilege(r.name,'msrc_registration.participant_operations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No API role can access participant operation receipts');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.proname in('msrc_registration_me','msrc_registration_accept_offer','msrc_registration_decline_offer','msrc_registration_cancel')
 and p.pronamespace='public'::regnamespace and a.grantee in(0,'anon'::regrole,'authenticated'::regrole)),'All new participant RPCs deny direct browser execution');
select ok(has_function_privilege('service_role','public.msrc_registration_me(text,jsonb)','EXECUTE')
 and has_function_privilege('service_role','public.msrc_registration_accept_offer(text,jsonb,uuid,uuid,text)','EXECUTE')
 and has_function_privilege('service_role','public.msrc_registration_decline_offer(text,jsonb,uuid,uuid)','EXECUTE')
 and has_function_privilege('service_role','public.msrc_registration_cancel(text,jsonb,uuid,uuid)','EXECUTE'),'Only server role receives participant RPC execution');
select ok((select not delivery_enabled and not sweeps_enabled and daily_cap=0 from msrc_outbox.settings),'Self-service leaves real email closed');
select is((select count(*) from msrc_registration.participant_operations),0::bigint,'Migration creates no participant operation seeds');
select ok(msrc_outbox.registration_message_valid('registration_cancelled',1,'en','synthetic@example.invalid','{}'::jsonb),'Cancellation draft has a minimal English payload');
select ok(not msrc_outbox.registration_message_valid('registration_cancelled',1,'ar','synthetic@example.invalid','{}'::jsonb),'Cancellation draft rejects non-English transactional email');
select ok(not msrc_outbox.registration_message_valid('registration_cancelled',1,'en','synthetic@example.invalid','{"ticket":"secret"}'::jsonb),'Cancellation draft cannot contain ticket or identity data');

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-self-service');
select pg_temp.registration_settings('synthetic-self-other');
update msrc_registration.settings set offer_window_hours=24 where edition_key='synthetic-self-service';
do $$declare n integer;begin
 for n in 2101..2118 loop perform pg_temp.registration_fixture(n,'synthetic-self-service');end loop;
 perform pg_temp.registration_fixture(2119,'synthetic-self-service',false);
end$$;
select pg_temp.registration_staff_fixture(2201,'synthetic-self-service');
create function pg_temp.self_id(n integer) returns uuid language sql stable as $$
 select id from msrc_registration.requests where edition_key='synthetic-self-service' and actor_id=pg_temp.registration_actor(n);$$;
create function pg_temp.self_me(n integer) returns jsonb language sql as $$
 select public.msrc_registration_me('synthetic-self-service',pg_temp.registration_claims(n));$$;
create function pg_temp.self_action(action text,n integer,operation integer,target integer default null) returns jsonb language plpgsql as $$
declare id uuid:=pg_temp.self_id(coalesce(target,n));op uuid:=('e7400000-0000-4000-8000-'||lpad(operation::text,12,'0'))::uuid;
begin
 if action='accept' then return public.msrc_registration_accept_offer('synthetic-self-service',pg_temp.registration_claims(n),id,op,repeat('a',64));
 elsif action='decline' then return public.msrc_registration_decline_offer('synthetic-self-service',pg_temp.registration_claims(n),id,op);
 else return public.msrc_registration_cancel('synthetic-self-service',pg_temp.registration_claims(n),id,op);end if;
end$$;

select is(pg_temp.self_me(2101)->>'state','ready','Verified signed-in participant gets own status');
select is(pg_temp.self_me(2101)->'request','null'::jsonb,'Not requested is distinct from a pending request');
select is(pg_temp.self_me(2101)#>>'{window,state}','open','Current general window is open');
select is(pg_temp.self_me(2119)->>'state','denied','Unverified account cannot inspect own registration');
select is(pg_temp.self_me(2201)->>'state','denied','Staff identity cannot use participant self-service');
select is(public.msrc_registration_me('synthetic-self-service',pg_temp.registration_claims(2101)||'{"session_id":"00000000-0000-4000-8000-000000000000"}'::jsonb)->>'state','denied','Foreign native session is denied');
update msrc_registration.settings set general_opening_at=clock_timestamp()+interval '2 hours',
 priority_start_at=clock_timestamp()+interval '30 minutes',priority_end_at=clock_timestamp()+interval '1 hour' where edition_key='synthetic-self-service';
select is(pg_temp.self_me(2101)#>>'{window,state}','scheduled','Before opening, status is scheduled');
select is((pg_temp.self_me(2101)#>>'{window,opensAt}')::timestamptz,(select general_opening_at from msrc_registration.settings where edition_key='synthetic-self-service'),'Scheduled opening comes from settings');
update msrc_registration.settings set priority_start_at=clock_timestamp()-interval '1 hour' where edition_key='synthetic-self-service';
select is(pg_temp.self_me(2101)#>>'{window,state}','early_access','Early-access window is described to a participant without granting eligibility');
select is(pg_temp.self_me(2101)#>>'{window,eligible}','false','Non-listed participant cannot request during early access');
insert into msrc_registration.early_access_entries(edition_key,email,added_by) values('synthetic-self-service','registration-2101@example.invalid',pg_temp.registration_actor(2201));
select is(pg_temp.self_me(2101)#>>'{window,eligible}','true','Verified listed email has early-access eligibility');
update msrc_registration.settings set priority_start_at=clock_timestamp()-interval '3 days',priority_end_at=clock_timestamp()-interval '2 days',
 general_opening_at=clock_timestamp()-interval '1 day',closing_at=clock_timestamp()-interval '1 hour' where edition_key='synthetic-self-service';
select is(pg_temp.self_me(2101)#>>'{window,state}','closed','Elapsed submission window is closed');
update msrc_registration.settings set closing_at=clock_timestamp()+interval '1 day' where edition_key='synthetic-self-service';
do $$declare n integer;begin
 for n in 2101..2117 loop perform pg_temp.registration_submit('synthetic-self-service',n,md5(n::text)||md5(n::text));end loop;
end$$;
select is(pg_temp.self_me(2101)#>>'{request,status}','pending_approval','Own pending state is server-derived');
select ok(not (pg_temp.self_me(2101)::text ~ 'identity|ciphertext|capacity|remaining|position|registration-2102'),'Own status does not expose identifiers, exact capacity, queue position or another participant');
update msrc_registration.requests set status='offered',offer_expires_at=clock_timestamp()+interval '1 hour'
 where actor_id in(pg_temp.registration_actor(2101),pg_temp.registration_actor(2102),pg_temp.registration_actor(2103),pg_temp.registration_actor(2106),pg_temp.registration_actor(2111),pg_temp.registration_actor(2112));
update msrc_registration.requests set status='waitlisted',created_at=created_at-interval '1 day' where actor_id=pg_temp.registration_actor(2107);
update msrc_registration.requests set status='waitlisted' where actor_id in(pg_temp.registration_actor(2105),pg_temp.registration_actor(2108),pg_temp.registration_actor(2109),pg_temp.registration_actor(2110));
update msrc_registration.requests set status='approved' where actor_id in(pg_temp.registration_actor(2104),pg_temp.registration_actor(2113));

select is(pg_temp.self_action('accept',2102,1,2101)->>'state','denied','Another participant cannot accept someone else offer');
select is(pg_temp.self_action('decline',2102,2,2101)->>'state','denied','Another participant cannot decline someone else offer');
select is(pg_temp.self_action('cancel',2102,3,2101)->>'state','denied','Another participant cannot cancel someone else request');
select is((select count(*) from msrc_registration.participant_operations),0::bigint,'Foreign attempts create no receipts or request effects');
select is(public.msrc_registration_cancel('synthetic-self-other',pg_temp.registration_claims(2101),pg_temp.self_id(2101),gen_random_uuid())->>'state','denied','Cross-edition request cannot be cancelled');
select is(public.msrc_registration_accept_offer('synthetic-self-service',pg_temp.registration_claims(2101),pg_temp.self_id(2101),gen_random_uuid(),null)->>'state','area_not_ready','Missing ticket key refuses acceptance');
select is((select status from msrc_registration.requests where id=pg_temp.self_id(2101)),'offered','Missing ticket key preserves offer');
update msrc_registration.settings set payment_required=true where edition_key='synthetic-self-service';
select is(pg_temp.self_action('accept',2101,4)->>'state','area_not_ready','This free acceptance cannot bypass a paid policy');
update msrc_registration.settings set payment_required=false where edition_key='synthetic-self-service';
update msrc_registration.requests set offer_expires_at=null where id=pg_temp.self_id(2112);
select is(pg_temp.self_action('accept',2112,5)->>'state','area_not_ready','Legacy offer without a deadline cannot be accepted with an invented deadline');
update msrc_registration.requests set offer_expires_at=clock_timestamp()+interval '1 hour' where id=pg_temp.self_id(2112);
select is(public.msrc_registration_cancel('synthetic-self-service',pg_temp.registration_claims(2101),pg_temp.self_id(2101),null)->>'state','denied','Mutation requires an operation ID');

set local role anon;
select throws_ok($$select public.msrc_registration_me('synthetic-self-service','{}'::jsonb)$$,'42501',null,'Anonymous cannot call own status RPC');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_registration_accept_offer('synthetic-self-service','{}'::jsonb,gen_random_uuid(),gen_random_uuid(),repeat('a',64))$$,'42501',null,'Browser cannot forward arbitrary participant claims for acceptance');
select throws_ok($$select public.msrc_registration_cancel('synthetic-self-service','{}'::jsonb,gen_random_uuid(),gen_random_uuid())$$,'42501',null,'Browser cannot forward arbitrary participant claims for cancellation');
reset role;

select is(pg_temp.self_action('accept',2101,10)->>'state','updated','Offer accepts strictly before deadline');
select is((select status from msrc_registration.requests where id=pg_temp.self_id(2101)),'approved','Free acceptance approves request');
select is((select status from msrc_registration.tickets where request_id=pg_temp.self_id(2101)),'issued','Acceptance atomically issues ticket');
select is((select count(*) from msrc_outbox.messages where recipient_email='registration-2101@example.invalid' and template_key='registration_approved'),1::bigint,'Acceptance enqueues one seat email');
select is(pg_temp.self_action('accept',2101,10)->>'state','updated','Same operation replays successful acceptance');
select is(pg_temp.self_action('cancel',2101,10)->>'state','conflict','Operation ID cannot be reused for another action');
select is((select count(*) from msrc_registration.audit where request_id=pg_temp.self_id(2101) and event='request.offer_accepted'),1::bigint,'Acceptance retries create one audit');
select is((select count(*) from msrc_registration.tickets where request_id=pg_temp.self_id(2101)),1::bigint,'Acceptance retry creates no second ticket');
select is(current_setting('request.jwt.claims'),'{}','Participant mutation restores caller claims');
select is(current_setting('msrc_registration.ticket_key'),repeat('a',64),'Participant mutation restores prior ticket setting');

update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 microsecond' where id=pg_temp.self_id(2102);
select is(pg_temp.self_action('accept',2102,11)->>'state','expired','Offer cannot accept at or after deadline');
select is((select status from msrc_registration.requests where id=pg_temp.self_id(2102)),'expired','Late acceptance records authoritative expiry');
select is((select count(*) from msrc_registration.tickets where request_id=pg_temp.self_id(2102)),0::bigint,'Late acceptance issues no ticket');
select is((select status from msrc_registration.requests where id=pg_temp.self_id(2107)),'offered','Expiry automatically passes seat to oldest waitlisted request');
select is((select count(*) from msrc_outbox.messages where recipient_email='registration-2102@example.invalid' and template_key='registration_expired'),1::bigint,'Late acceptance queues expiry email once');
select is(pg_temp.self_action('accept',2102,11)->>'state','expired','Expired operation replay is idempotent');

select is(pg_temp.self_action('decline',2103,12)->>'state','updated','Participant may decline own live offer');
select is((select status from msrc_registration.requests where id=pg_temp.self_id(2103)),'cancelled','Declining records cancelled state');
select is((select count(*) from msrc_registration.audit where request_id=pg_temp.self_id(2103) and event='request.offer_declined' and reason is not null),1::bigint,'Decline is audited with participant and fixed reason');
select is((select count(*) from msrc_registration.audit where event='request.offered'),2::bigint,'Decline passes exactly one additional seat');
select is((select count(*) from msrc_outbox.messages where recipient_email='registration-2103@example.invalid' and template_key='registration_cancelled'),1::bigint,'Decline queues a minimal cancellation notice');
select is(pg_temp.self_action('decline',2103,12)->>'state','updated','Decline replay returns receipt');
select is((select count(*) from msrc_registration.audit where event='request.offered'),2::bigint,'Decline retry does not pass another seat');

select is(pg_temp.self_action('cancel',2114,13)->>'state','updated','Pending request may self-cancel');
select is(pg_temp.self_action('cancel',2110,14)->>'state','updated','Waitlisted request may self-cancel');
select is((select count(*) from msrc_registration.audit where event='request.offered'),2::bigint,'Pending and waitlist cancellation release no occupied seat');
select is(pg_temp.self_action('cancel',2106,15)->>'state','updated','Offered request may self-cancel');
select is((select count(*) from msrc_registration.audit where event='request.offered'),3::bigint,'Offer cancellation passes exactly one seat');
select is(pg_temp.self_action('cancel',2104,16)->>'state','updated','Approved request may self-cancel');
select is((select status from msrc_registration.tickets where request_id=pg_temp.self_id(2104)),'revoked','Approved cancellation revokes ticket atomically');
select ok((select revoked_at is not null from msrc_registration.tickets where request_id=pg_temp.self_id(2104)),'Revocation records its timestamp');
select is((select count(*) from msrc_registration.audit where event='request.offered'),4::bigint,'Approved cancellation passes exactly one seat');
select is((select count(*) from msrc_outbox.messages where recipient_email='registration-2104@example.invalid' and template_key='registration_cancelled'),1::bigint,'Approved cancellation queues one cancellation email');
select is(pg_temp.self_action('cancel',2104,16)->>'state','updated','Cancellation with same operation is idempotent');
select is(pg_temp.self_action('cancel',2104,17)->>'state','conflict','Second cancellation operation does not repeat transition');
select is((select count(*) from msrc_registration.audit where request_id=pg_temp.self_id(2104) and event='request.cancelled'),1::bigint,'Two cancellations create one cancellation audit');
select is((select count(*) from msrc_registration.audit where event='request.offered'),4::bigint,'Two cancellations do not over-offer');
select is(pg_temp.self_action('cancel',2102,18)->>'state','expired','Expired request cannot be cancelled as though active');
select is(pg_temp.self_action('decline',2115,19)->>'state','conflict','Pending request cannot decline a nonexistent offer');

-- Status expiration is server-authoritative and touches only the current owner.
update msrc_registration.requests set offer_expires_at=clock_timestamp()-interval '1 second' where id=pg_temp.self_id(2111);
select is(pg_temp.self_me(2111)#>>'{request,status}','expired','Status read expires caller elapsed offer');
select is((select count(*) from msrc_registration.audit where request_id=pg_temp.self_id(2111) and event='request.offer_expired'),1::bigint,'Status expiry is audited once');
select is(pg_temp.self_me(2111)#>>'{request,status}','expired','Repeated status read preserves expired state');

-- A closed submission window is not a closed existing-request management window.
update msrc_registration.settings set closing_at=clock_timestamp()-interval '1 hour' where edition_key='synthetic-self-service';
select is(pg_temp.self_action('accept',2112,20)->>'state','updated','Existing offer accepts after submission closes');
select is(pg_temp.self_action('cancel',2116,21)->>'state','updated','Existing pending request cancels after submission closes');
update msrc_registration.settings set enabled=false where edition_key='synthetic-self-service';
select is(pg_temp.self_action('cancel',2117,22)->>'state','closed','Database release flag closes mutations');
select is(pg_temp.self_me(2117)->>'state','closed','Database release flag closes projection');
update msrc_registration.settings set enabled=true,closing_at=clock_timestamp()+interval '1 day' where edition_key='synthetic-self-service';
update msrc_registration.settings set general_capacity=100,places_remaining_threshold=0 where edition_key='synthetic-self-service';
select is(pg_temp.self_me(2118)->>'fewPlaces','false','Places label absent above threshold');
update msrc_registration.settings set general_capacity=(select count(*)+2 from msrc_registration.requests where edition_key='synthetic-self-service' and status in('approved','approved_awaiting_payment','offered','confirmed')),
 places_remaining_threshold=2 where edition_key='synthetic-self-service';
select is(pg_temp.self_me(2118)->>'fewPlaces','true','Places label appears at threshold equality');
update msrc_registration.settings set places_remaining_threshold=null where edition_key='synthetic-self-service';
select is(pg_temp.self_me(2118)->>'fewPlaces','false','Unset threshold never produces a places label');
select is(public.msrc_registration_ticket('synthetic-self-service',pg_temp.registration_claims(2101),repeat('a',64))#>>'{ticket,status}',
 'issued','Existing approved ticket remains available with unset submission threshold');

-- Business effects roll back together if the durable outbox cannot accept them.
create function pg_temp.reject_cancellation_email() returns trigger language plpgsql as $$begin
 if new.template_key='registration_cancelled' and new.recipient_email='registration-2113@example.invalid' then
 raise exception using errcode='P0001',message='Synthetic outbox unavailable.';end if;return new;end$$;
create trigger synthetic_outbox_failure before insert on msrc_outbox.messages for each row execute function pg_temp.reject_cancellation_email();
select throws_ok($$select pg_temp.self_action('cancel',2113,23)$$,'P0001','Synthetic outbox unavailable.','Outbox failure rejects entire cancellation transaction');
select is((select status from msrc_registration.requests where id=pg_temp.self_id(2113)),'approved','Failed cancellation retains approved seat');
select is((select status from msrc_registration.tickets where request_id=pg_temp.self_id(2113)),'issued','Failed cancellation does not revoke ticket');
select is((select count(*) from msrc_registration.participant_operations where request_id=pg_temp.self_id(2113)),0::bigint,'Failed cancellation creates no receipt');
drop trigger synthetic_outbox_failure on msrc_outbox.messages;
update msrc_registration.settings set offer_window_hours=null where edition_key='synthetic-self-service';
update msrc_registration.requests set status='waitlisted' where id=pg_temp.self_id(2117);
select is(pg_temp.self_action('cancel',2113,23)->>'state','updated','Same operation retries after outbox recovery');
select is((select status from msrc_registration.requests where id=pg_temp.self_id(2117)),'waitlisted','Missing offer window releases the cancelled seat without inventing a replacement deadline');
select throws_ok($$update msrc_registration.participant_operations set action='cancel'$$,'55000',null,'Participant operation receipts are immutable');
select * from finish();
rollback;
