-- ENG-074; WKS-01..07, CHK-03, CRT-01. Synthetic/rollback only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
\ir ../support/workshop-fixtures.psql

select is((select count(*) from msrc_workshops.settings),0::bigint,'No workshop settings seeded');
select is((select count(*) from msrc_workshops.workshops),0::bigint,'No dates/prices/capacities seeded');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='msrc_workshops' and c.relkind='r' and not(c.relrowsecurity and c.relforcerowsecurity)),'All workshop tables force RLS');
select is((select count(*) from pg_policies where schemaname='msrc_workshops'),0::bigint,'No client table policies');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name) where has_schema_privilege(r.name,'msrc_workshops','USAGE')),'No API private schema usage');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join (values('anon'),('authenticated'),('service_role')) r(name)
 where n.nspname='msrc_workshops' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No API direct table access');
select ok(not exists(select 1 from pg_proc p where p.pronamespace='msrc_workshops'::regnamespace and p.prosecdef and not('search_path=""'=any(p.proconfig))),'Definers pin empty search_path');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a where p.pronamespace='msrc_workshops'::regnamespace and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),'All private helpers ungranted');
select ok(not has_function_privilege('authenticated','public.msrc_workshop_participant_mutate(text,jsonb,jsonb)','EXECUTE'),'Participant RPC cannot accept forged client claims');
select ok(has_function_privilege('service_role','public.msrc_workshop_participant_mutate(text,jsonb,jsonb)','EXECUTE'),'Participant transport service-only');
set local role anon;
select throws_ok($$select public.msrc_staff_workshop_read('synthetic-workshops')$$,'42501',null,'Anonymous staff read denied');
select throws_ok($$select public.msrc_workshop_participant_read('synthetic-workshops','{}'::jsonb)$$,'42501',null,'Anonymous participant read denied');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_workshop_completion_evidence('synthetic-workshops',gen_random_uuid(),gen_random_uuid())$$,'42501',null,'Completion evidence not a client directory');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
update msrc_outbox.settings set sweeps_enabled=true;
select pg_temp.registration_settings('synthetic-workshops');
select pg_temp.workshop_settings('synthetic-workshops');
do $$declare n integer;begin for n in 7411..7418 loop perform pg_temp.registration_fixture(n,'synthetic-workshops');end loop;end$$;
select pg_temp.registration_staff_fixture(7491,'synthetic-workshops');
select pg_temp.registration_staff_fixture(7492,'synthetic-workshops','registrationWorkshopAdministrator');
select pg_temp.registration_staff_fixture(7493,'synthetic-workshops','checkInStaff');
select pg_temp.registration_staff_fixture(7494,'synthetic-workshops','abstractReviewer');
select pg_temp.registration_staff_fixture(7495,'synthetic-workshops','checkInStaff');
insert into msrc_authorization.edition_config(edition_key) values('synthetic-workshop-drafts');
select pg_temp.registration_staff_fixture(7496,'synthetic-workshop-drafts');
select is(pg_temp.workshop_staff('synthetic-workshop-drafts',7496,jsonb_build_object('action','save_policy','reason','Synthetic closed preparation',
 'policy',jsonb_build_object('enabled',false,'holdHours',null,'offerHours',null,'mockPaymentEnabled',false)))->>'state','updated','Closed workshop preparation does not require seeded registration settings');
select is(pg_temp.workshop_staff('synthetic-workshop-drafts',7496,jsonb_build_object('action','save_workshop','reason','Synthetic empty draft',
 'workshop',jsonb_build_object('id',null,'version',0,'published',false)))->>'state','updated','Draft editor preserves entirely unset operational values');
select is(pg_temp.workshop_staff('synthetic-workshop-drafts',7496,jsonb_build_object('action','save_policy','reason','Synthetic activation refusal',
 'policy',jsonb_build_object('enabled',true,'holdHours',7,'offerHours',3,'mockPaymentEnabled',false)))->>'state','closed','Staff RPC cannot activate closed workflow');
select is(pg_temp.workshop_staff('synthetic-workshop-drafts',7496,jsonb_build_object('action','save_policy','reason','Synthetic mock activation refusal',
 'policy',jsonb_build_object('enabled',false,'holdHours',7,'offerHours',3,'mockPaymentEnabled',true)))->>'state','closed','Staff RPC cannot activate mock payment');
select is(public.msrc_workshop_public_read('synthetic-workshop-drafts')->'workshops','[]'::jsonb,'Private unfinished drafts never appear publicly');
do $$declare n integer;begin for n in 7411..7417 loop
 perform pg_temp.registration_submit('synthetic-workshops',n,md5(n::text)||md5(n::text));end loop;end$$;
update msrc_registration.requests set status='confirmed' where edition_key='synthetic-workshops' and actor_id<>pg_temp.registration_actor(7417);
select pg_temp.workshop_fixture('synthetic-workshops',1,0,1);
select pg_temp.workshop_fixture('synthetic-workshops',2,1,2);
select pg_temp.workshop_fixture('synthetic-workshops',3,0,2);
select pg_temp.workshop_fixture('synthetic-workshops',4,4,2);
select pg_temp.workshop_fixture('synthetic-workshops',5,6,1);

create function pg_temp.workshop_null_gates() returns setof text language plpgsql as $$declare field text;snapshot jsonb;begin
 select to_jsonb(w) into snapshot from msrc_workshops.workshops w where id=pg_temp.workshop_id(1);
 foreach field in array array['title_en','title_ar','description_en','description_ar','instructor','room','start_at','end_at','capacity',
 'eligibility_en','eligibility_ar','eligibility_rule','price_minor','currency','booking_deadline','transfer_buffer_minutes'] loop
 execute format('update msrc_workshops.workshops set %I=null where id=$1',field) using pg_temp.workshop_id(1);
 return next ok(not (select msrc_workshops.ready(w) from msrc_workshops.workshops w where w.id=pg_temp.workshop_id(1)),'Unset '||field||' keeps booking closed');
 execute format('update msrc_workshops.workshops set %I=(jsonb_populate_record(null::msrc_workshops.workshops,$1)).%I where id=$2',field,field) using snapshot,pg_temp.workshop_id(1);
 end loop;
end$$;
select * from pg_temp.workshop_null_gates();

select is(pg_temp.workshop_request('synthetic-workshops',7417,1)->>'state','denied','Unconfirmed registration cannot request');
select is(pg_temp.workshop_request('synthetic-workshops',7418,1)->>'state','denied','Missing registration cannot request');
select is(public.msrc_workshop_participant_mutate('synthetic-workshops',pg_temp.registration_claims(7411)||jsonb_build_object('session_id',pg_temp.registration_session(7412)),
 jsonb_build_object('action','request','operationId',gen_random_uuid(),'workshopId',pg_temp.workshop_id(1)))->>'state','denied','Foreign native session cannot request on another participant identity');
update auth.sessions set not_after=clock_timestamp()-interval '1 second' where id=pg_temp.registration_session(7411);
select is(pg_temp.workshop_request('synthetic-workshops',7411,1)->>'state','denied','Expired native session denied even with unexpired forwarded claims');
update auth.sessions set not_after=null where id=pg_temp.registration_session(7411);
select is(public.msrc_workshop_participant_read('synthetic-workshops',pg_temp.registration_claims(7494))->>'state','denied','Reviewer cannot become participant');
select is(pg_temp.workshop_staff('synthetic-workshops',7494,jsonb_build_object('action','remove','workshopId',pg_temp.workshop_id(1),'reason','Synthetic removal'))->>'state','denied','Reviewer cannot manage workshop');
select is(pg_temp.workshop_staff('synthetic-workshops',7493,jsonb_build_object('action','remove','workshopId',pg_temp.workshop_id(1),'reason','Synthetic removal'))->>'state','denied','Check-in staff cannot manage workshop');
select is(pg_temp.workshop_staff('synthetic-workshops',7492,jsonb_build_object('action','save_policy','policy',jsonb_build_object('enabled',true,'holdHours',7,'offerHours',3,'mockPaymentEnabled',true),'reason','Synthetic policy'))->>'state','denied','Only Super Admin sets policy');
update msrc_workshops.settings set hold_hours=null;
select is(pg_temp.workshop_request('synthetic-workshops',7411,1)->>'state','closed','Unset hold window closes booking');
update msrc_workshops.settings set hold_hours=7;
update msrc_workshops.workshops set price_minor=null where id=pg_temp.workshop_id(1);
select is(pg_temp.workshop_request('synthetic-workshops',7411,1)->>'state','closed','Unset price closes booking');
update msrc_workshops.workshops set price_minor=1700 where id=pg_temp.workshop_id(1);
select is(pg_temp.workshop_request('synthetic-workshops',7411,1)->>'state','updated','First valid server request gets hold');
select is((select status from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(1)),'held','Manual approval remains required');
select is(pg_temp.workshop_request('synthetic-workshops',7412,1)->>'state','full','Last seat cannot allocate twice');
select is(msrc_workshops.allocations(pg_temp.workshop_id(1)),1,'Exactly one last-seat allocation');
select ok((select requested_at<=expires_at and expires_at<=clock_timestamp()+interval '7 hours' from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(1)),'Server time and configured hold window');
select is(pg_temp.workshop_booking('synthetic-workshops',7411,1,'mock_pay')->>'state','denied','Mock payment cannot bypass approval');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7493,7411,1,'approve')->>'state','denied','Check-in cannot approve');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7411,1,'validate_discount',jsonb_build_object('reason','Synthetic full discount evidence'))->>'state','updated','Authorized staff validates full discount');
select is(pg_temp.workshop_booking('synthetic-workshops',7411,1,'redeem_discount')->>'state','denied','Full discount cannot bypass manual approval');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7411,1,'approve')->>'state','updated','Manager approves within window');
select is(pg_temp.workshop_booking('synthetic-workshops',7411,1,'redeem_discount')->>'state','updated','Validated full discount confirms after approval');
select is((select status from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(1)),'confirmed','Confirmed allocation retained');
select ok((select redeemed_at is not null from msrc_workshops.discounts),'Full discount redemption recorded transactionally');
select is((select count(*) from msrc_workshops.orders where kind='full_discount' and price_minor=1700 and due_minor=0),1::bigint,'Full discount keeps a distinct immutable order with configured-price snapshot');

select is(pg_temp.workshop_request('synthetic-workshops',7411,3)->>'state','conflict','Overlapping hold/confirmed workshop refused');
select is(pg_temp.workshop_request('synthetic-workshops',7411,2)->>'state','updated','Adjacent workshops allowed at zero buffer');
select is(pg_temp.workshop_request('synthetic-workshops',7411,3,'waitlist')->>'state','updated','Overlapping waitlist allowed');
select is((select status from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(3)),'waitlisted','Conflicting waitlist not auto offered');
select is(pg_temp.workshop_request('synthetic-workshops',7412,1,'waitlist')->>'state','updated','Full workshop supports waitlist without charge');
select is((select count(*) from msrc_workshops.orders o join msrc_workshops.bookings b on b.id=o.booking_id where b.actor_id=pg_temp.registration_actor(7412)),0::bigint,'Waitlist entry creates no order or charge');
select is(pg_temp.workshop_request('synthetic-workshops',7413,1,'waitlist')->>'state','updated','Next waitlist request recorded');
select is(pg_temp.workshop_booking('synthetic-workshops',7411,1,'cancel')->>'state','updated','Cancellation releases seat');
select is((select status from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(1) and actor_id=pg_temp.registration_actor(7412)),'offered','First eligible server request offered first');
select is((select status from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(1) and actor_id=pg_temp.registration_actor(7413)),'waitlisted','Later request cannot leapfrog offer');
select is(pg_temp.workshop_request('synthetic-workshops',7412,3)->>'state','updated','Offer is not yet a conflicting active hold');
select is(pg_temp.workshop_booking('synthetic-workshops',7412,1,'accept_offer')->>'state','conflict','Offer acceptance rechecks overlap created after offer');
select is(pg_temp.workshop_booking('synthetic-workshops',7412,3,'cancel')->>'state','updated','Conflicting hold may be cancelled');
update msrc_registration.requests set status='cancelled' where actor_id=pg_temp.registration_actor(7412);
select is(pg_temp.workshop_booking('synthetic-workshops',7412,1,'accept_offer')->>'state','denied','Offer acceptance rechecks registration eligibility');
update msrc_registration.requests set status='confirmed' where actor_id=pg_temp.registration_actor(7412);
select is(pg_temp.workshop_booking('synthetic-workshops',7412,1,'decline_offer')->>'state','updated','Declined offer releases capacity');
select is(pg_temp.workshop_booking('synthetic-workshops',7413,1,'accept_offer')->>'state','updated','Next eligible offer can be accepted');
select is((select status from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(1) and actor_id=pg_temp.registration_actor(7413)),'held','Accepted offer requires fresh manual approval');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7413,1,'extend',jsonb_build_object('expiresAt',clock_timestamp()+interval '8 hours'))->>'state','invalid','Hold extension needs reason');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7413,1,'extend',jsonb_build_object('expiresAt',clock_timestamp()+interval '8 hours','reason','Synthetic documented extension'))->>'state','updated','Authorized reasoned extension');
update msrc_workshops.bookings set expires_at=clock_timestamp()-interval '1 second' where workshop_id=pg_temp.workshop_id(1) and actor_id=pg_temp.registration_actor(7413);
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7413,1,'approve')->>'state','expired','Expired hold cannot be approved');
select is(public.msrc_workshop_maintenance('synthetic-workshops')->>'state','updated','Existing maintenance expires holds');
select is((select status from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(1) and actor_id=pg_temp.registration_actor(7413)),'expired','Hold expires persistently');

select is(pg_temp.workshop_staff('synthetic-workshops',7492,jsonb_build_object('action','reserve','workshopId',pg_temp.workshop_id(5),'seats',1,'releaseAt',clock_timestamp()+interval '1 hour'))->>'state','invalid','Reserved seats require reason');
select is(pg_temp.workshop_staff('synthetic-workshops',7492,jsonb_build_object('action','reserve','workshopId',pg_temp.workshop_id(5),'seats',1,'releaseAt',clock_timestamp()+interval '1 hour','reason','Synthetic reserved place'))->>'state','updated','Reasoned reservation allocates seat');
select is(pg_temp.workshop_request('synthetic-workshops',7414,5)->>'state','full','Staff reservation counts against capacity');
select throws_ok($$update msrc_workshops.workshops set capacity=null where id=pg_temp.workshop_id(5)$$,'23514',null,'Capacity NULL cannot erase allocation bound');
select is(pg_temp.workshop_staff('synthetic-workshops',7492,jsonb_build_object('action','reserve','workshopId',pg_temp.workshop_id(5),'seats',1,'releaseAt',clock_timestamp()+interval '1 hour','reason','Synthetic duplicate'))->>'state','full','Reservation cannot oversubscribe');
update msrc_workshops.reservations set release_at=clock_timestamp()-interval '1 second' where workshop_id=pg_temp.workshop_id(5);
select is(public.msrc_workshop_maintenance('synthetic-workshops')->>'released','1','Reservation deadline automatically releases');
select is(pg_temp.workshop_request('synthetic-workshops',7414,5)->>'state','updated','Released reservation seat becomes bookable');

select is(pg_temp.workshop_request('synthetic-workshops',7415,4)->>'state','updated','Separate activity hold');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7415,4,'approve')->>'state','updated','Separate manual approval');
update msrc_workshops.settings set mock_payment_enabled=false;
select is(pg_temp.workshop_booking('synthetic-workshops',7415,4,'mock_pay')->>'state','closed','Mock payment independently closed');
update msrc_workshops.settings set mock_payment_enabled=true;
select is(pg_temp.workshop_booking('synthetic-workshops',7415,4,'mock_pay')->>'state','updated','Mock confirms only approved nonoverlapping booking');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7493,7415,4,'complete')->>'state','denied','Scanner is not implicitly authorized instructor');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7415,4,'complete')->>'state','denied','Completion requires workshop check-in');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7493,7415,4,'checkin')->>'state','updated','Check-in staff records workshop activity');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7493,7415,4,'complete')->>'state','denied','Unassigned scanner still cannot confirm completion after legitimate check-in');
select is((select completed_at from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(4) and actor_id=pg_temp.registration_actor(7415)),null::timestamptz,'Unauthorized completion leaves evidence unchanged');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7493,7415,4,'checkin')->>'state','updated','Repeat check-in does not duplicate credit');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7415,4,'complete')->>'state','updated','Organizer confirms explicit completion');
select ok((public.msrc_workshop_completion_evidence('synthetic-workshops',pg_temp.registration_actor(7415),pg_temp.workshop_id(4))->>'participationEvidenceComplete')::boolean,'Certificate module can read complete workshop evidence separately');
select pg_temp.workshop_fixture('synthetic-workshops',6,5,2);
select is(pg_temp.workshop_request('synthetic-workshops',7415,6)->>'state','updated','Adjacent second confirmed activity starts with hold');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7415,6,'approve')->>'state','updated','Second activity manually approved');
select is(pg_temp.workshop_booking('synthetic-workshops',7415,6,'mock_pay')->>'state','updated','Adjacent activity can confirm');
select is(pg_temp.workshop_edit('synthetic-workshops',7492,6,jsonb_build_object('startAt','2040-01-01T13:30:00Z','endAt','2040-01-01T14:30:00Z'))->>'state','updated','Audited schedule edit can create a resolution case');
select is((select count(*) from msrc_workshops.conflicts where resolved_at is null),1::bigint,'Schedule overlap enters explicit conflict resolution list');
select ok(not(public.msrc_workshop_completion_evidence('synthetic-workshops',pg_temp.registration_actor(7415),pg_temp.workshop_id(4))->>'participationEvidenceComplete')::boolean,'Unresolved conflict blocks future certificate evidence');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7493,7415,6,'checkin')->>'state','conflict','Unresolved conflict cannot acquire check-in credit');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7415,6,'resolve_conflict',jsonb_build_object('reason','Synthetic participant agreed cancellation'))->>'state','updated','Reasoned cancellation resolves schedule conflict');
select is((select count(*) from msrc_workshops.conflicts where resolved_at is null),0::bigint,'Resolution preserves history and clears active conflict');
select is(pg_temp.workshop_request('synthetic-workshops',7416,4)->>'state','updated','Second capacity allocation created');
select is(pg_temp.workshop_edit('synthetic-workshops',7492,4,jsonb_build_object('capacity',1))->>'state','capacity_below_allocations','Editor cannot reduce below live allocations');
select throws_ok($$update msrc_workshops.workshops set capacity=1 where id=pg_temp.workshop_id(4)$$,'23514',null,'Database capacity guard also protects direct operator mistakes');
select is(pg_temp.workshop_edit('synthetic-workshops',7492,4,jsonb_build_object('capacity',3))->>'state','updated','Capacity may increase with audit and notice');
select is(pg_temp.workshop_edit('synthetic-workshops',7492,4,jsonb_build_object('titleEn',null))->>'state','conflict','Workshop with booking history cannot lose its notification title');
select ok(exists(select 1 from msrc_outbox.messages where template_key='workshop_notice' and payload->>'event'='time_changed' and delivery_hold),'Affected schedule-change users get held email');
select ok(exists(select 1 from msrc_outbox.messages where template_key='workshop_notice' and payload->>'event'='capacity_changed' and delivery_hold),'Affected capacity-change users get held email');
select is(pg_temp.workshop_edit('synthetic-workshops',7492,4,jsonb_build_object('instructorActorId',pg_temp.registration_actor(7495)))->>'state','updated','Organizer explicitly assigns a real instructor actor');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7416,4,'approve')->>'state','updated','Instructor evidence fixture has manual approval');
select is(pg_temp.workshop_booking('synthetic-workshops',7416,4,'mock_pay')->>'state','updated','Instructor evidence fixture has confirmed mock settlement');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7493,7416,4,'checkin')->>'state','updated','Instructor evidence fixture has workshop check-in');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7495,7416,4,'complete')->>'state','updated','Assigned assured instructor may confirm completion');
select is((select completed_by from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(4) and actor_id=pg_temp.registration_actor(7416)),pg_temp.registration_actor(7495),'Completion preserves individually authorized instructor identity');
select pg_temp.workshop_fixture('synthetic-workshops',7,5,2);
update msrc_workshops.workshops set transfer_buffer_minutes=15 where id=pg_temp.workshop_id(7);
select is(pg_temp.workshop_request('synthetic-workshops',7415,7)->>'state','conflict','Configured transfer buffer blocks otherwise adjacent slots');
select is(pg_temp.workshop_staff('synthetic-workshops',7492,jsonb_build_object('action','remove','workshopId',pg_temp.workshop_id(5),'reason','Synthetic organizer removal'))->>'state','updated','Workshop removal is explicit and audited');
select is((select status from msrc_workshops.bookings where workshop_id=pg_temp.workshop_id(5) and actor_id=pg_temp.registration_actor(7414)),'cancelled','Workshop removal cancels affected allocation');
select ok(exists(select 1 from msrc_outbox.messages where template_key='workshop_notice' and payload->>'event'='removed' and delivery_hold),'Workshop removal queues affected-user draft notice');
select pg_temp.workshop_fixture('synthetic-workshops',8,8,1);
update msrc_workshops.workshops set price_minor=0 where id=pg_temp.workshop_id(8);
select is(pg_temp.workshop_request('synthetic-workshops',7412,8)->>'state','updated','Explicitly configured free workshop requests a provisional hold');
select is(pg_temp.workshop_booking('synthetic-workshops',7412,8,'redeem_discount')->>'state','denied','Zero price still cannot bypass manual approval');
select is(pg_temp.workshop_staff_booking('synthetic-workshops',7492,7412,8,'approve')->>'state','updated','Free workshop manually approved');
select is(pg_temp.workshop_booking('synthetic-workshops',7412,8,'redeem_discount')->>'state','updated','Configured zero price confirms only after approval');
select ok(exists(select 1 from msrc_workshops.orders o join msrc_workshops.bookings b on b.id=o.booking_id where b.workshop_id=pg_temp.workshop_id(8) and o.kind='free' and o.price_minor=0 and o.due_minor=0),'Free confirmation has its separate zero-due order snapshot');
select ok(not(public.msrc_workshop_completion_evidence('synthetic-workshops',pg_temp.registration_actor(7414),pg_temp.workshop_id(5))->>'participationEvidenceComplete')::boolean,'Held booking cannot create completion evidence');
select ok(not(public.msrc_workshop_completion_evidence('synthetic-workshops',pg_temp.registration_actor(7415),pg_temp.workshop_id(4)) ? 'surveyAnswers'),'No survey answers linked to participation evidence');
select ok(not (public.msrc_workshop_public_read('synthetic-workshops')::text ~ 'actorId|checkedIn|completedBy|registration-7415'),'Public read never exposes participant names/identities');
select ok(exists(select 1 from msrc_outbox.messages where template_key='workshop_notice' and delivery_hold and status='queued'),'Workshop transactional messages queued held DRAFT');
select throws_ok($$update msrc_outbox.messages set delivery_hold=false where template_key='workshop_notice'$$,'23514',null,'DRAFT delivery cannot be unheld');
select throws_ok($$update msrc_workshops.audit set event='tampered'$$,'55000',null,'Workshop audit immutable');
select throws_ok($$delete from msrc_workshops.audit$$,'55000',null,'Workshop audit cannot delete');
select throws_ok($$truncate msrc_workshops.audit$$,'55000',null,'Workshop audit cannot truncate');
select throws_ok($$update msrc_workshops.operations set result='{}'::jsonb$$,'55000',null,'Idempotency outcomes immutable');
select throws_ok($$update msrc_workshops.orders set price_minor=0$$,'55000',null,'Settled workshop order snapshots immutable');
select * from finish();
rollback;
