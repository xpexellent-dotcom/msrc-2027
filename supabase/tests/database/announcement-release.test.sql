-- ORG-063 / ENG-072. Disposable rollback-only release and own-address tests.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql

select is((select count(*) from msrc_announcements.delivery_settings),0::bigint,'Migration seeds no layout approval');
select ok((select not delivery_enabled and not sweeps_enabled and daily_cap=0 from msrc_outbox.settings),'All existing delivery defaults remain off');
select ok(not exists(select 1 from pg_class c where c.oid in('msrc_announcements.delivery_settings'::regclass,'msrc_announcements.delivery_audit'::regclass)
 and not(c.relrowsecurity and c.relforcerowsecurity)),'Approval settings and audit force RLS');
select ok(not exists(select 1 from(values('anon'),('authenticated'),('service_role')) r(name)
 where has_table_privilege(name,'msrc_announcements.delivery_settings','SELECT,INSERT,UPDATE,DELETE')
 or has_table_privilege(name,'msrc_announcements.delivery_audit','SELECT,INSERT,UPDATE,DELETE')),'API roles cannot directly edit approval or audit');
select ok(not exists(select 1 from pg_proc p where p.proname in('msrc_staff_announcement_delivery_status','msrc_staff_announcement_layout_approval','msrc_staff_announcement_test_send')
 and not(p.prosecdef and coalesce(p.proconfig @>array['search_path=""'],false))),'New RPCs use empty definer search paths');
set local role anon;
select throws_ok($$select public.msrc_staff_announcement_layout_approval('synthetic-release',true,gen_random_uuid())$$,'42501',null,'Anonymous approval RPC denied');
select throws_ok($$select public.msrc_staff_announcement_test_send('synthetic-release',gen_random_uuid(),1,gen_random_uuid())$$,'42501',null,'Anonymous test RPC denied');
reset role;
set local role service_role;
select throws_ok($$select public.msrc_staff_announcement_layout_approval('synthetic-release',true,gen_random_uuid())$$,'42501',null,'Service role has no staff approval bypass');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-release');
select pg_temp.registration_staff_fixture(9950,'synthetic-release');
select pg_temp.registration_staff_fixture(9951,'synthetic-release');
select pg_temp.registration_staff_fixture(9952,'synthetic-release','contentMediaEditor');
select pg_temp.registration_fixture(9953,'synthetic-release');
insert into msrc_announcements.delivery_settings(edition_key) values('synthetic-release');
select is((select layout_approved from msrc_announcements.delivery_settings where edition_key='synthetic-release'),false,'Explicit setting row defaults off');
select set_config('request.jwt.claims',pg_temp.registration_claims(9952)::text,true);
select is(public.msrc_staff_announcement_delivery_status('synthetic-release')->>'state','denied','Ordinary staff cannot read release controls');
select is(public.msrc_staff_announcement_layout_approval('synthetic-release',true,gen_random_uuid())->>'state','denied','Ordinary staff cannot approve layout');
select is(public.msrc_staff_announcement_test_send('synthetic-release',gen_random_uuid(),1,gen_random_uuid())->>'state','denied','Ordinary staff cannot send a self-test');
select set_config('request.jwt.claims',pg_temp.registration_claims(9953)::text,true);
select is(public.msrc_staff_announcement_layout_approval('synthetic-release',true,gen_random_uuid())->>'state','denied','Participant cannot approve layout');
select set_config('request.jwt.claims',(pg_temp.registration_claims(9950)||'{"aal":"aal1"}'::jsonb)::text,true);
select is(public.msrc_staff_announcement_layout_approval('synthetic-release',true,gen_random_uuid())->>'state','denied','Super Admin without exact assured session denied');
select set_config('request.jwt.claims',pg_temp.registration_claims(9950)::text,true);
select is(public.msrc_staff_announcement_delivery_status('synthetic-release')->>'layoutApproved','false','Release status reports layout off');
select is(public.msrc_staff_announcement_delivery_status('synthetic-release')->>'deliveryEnabled','false','Release status reports global delivery off');
select is(public.msrc_staff_announcement_layout_approval('synthetic-release',null,gen_random_uuid())->>'state','invalid','Null approval is invalid');

create temporary table release_results(key text primary key,value jsonb);
create function pg_temp.release_input() returns jsonb language sql immutable as $$
 select jsonb_build_object('expectedVersion',0,'subjectEn','Synthetic release notice','subjectAr','إعلان تجريبي',
 'bodyEn',E'Synthetic first paragraph\n\nSynthetic second paragraph','bodyAr','نص تجريبي','segments',array['active_staff']);$$;
create function pg_temp.release_id(name text) returns uuid language sql stable as $$
 select (value#>>'{announcement,id}')::uuid from release_results where key=name;$$;
insert into release_results values('held',public.msrc_staff_announcement_save('synthetic-release',pg_temp.release_input()));
insert into release_results values('heldPreview',public.msrc_staff_announcement_preview('synthetic-release',pg_temp.release_id('held'),1));
select is(public.msrc_staff_announcement_send('synthetic-release',pg_temp.release_id('held'),1,
 (select value#>>'{preview,previewToken}' from release_results where key='heldPreview'),gen_random_uuid())->>'state','updated','Publication still works while layout unapproved');
select ok(not exists(select 1 from msrc_outbox.messages where template_key='announcement' and(not delivery_hold or announcement_delivery is not null)),'Layout off gives all new publications the incumbent hold');
insert into release_results values('draft',public.msrc_staff_announcement_save('synthetic-release',pg_temp.release_input()));
insert into release_results values('test1',public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('draft'),1,'e7900000-0000-4000-8000-000000009950'));
select is((select value->>'state' from release_results where key='test1'),'queued','Super Admin can queue a saved-draft preview before layout approval');
select is((select recipient_email from msrc_outbox.messages where id=(select(value->>'messageId')::uuid from release_results where key='test1')),
 'registration-staff-9950@example.invalid','Self-test goes only to the acting Super Admin current verified address');
select ok((select not delivery_hold and announcement_delivery='self_test' from msrc_outbox.messages
 where id=(select(value->>'messageId')::uuid from release_results where key='test1')),'Self-test has explicit insertion provenance without bypassing global switches');
select is((select payload from msrc_outbox.messages where id=(select(value->>'messageId')::uuid from release_results where key='test1')),
 jsonb_build_object('subject_en','Synthetic release notice','subject_ar','إعلان تجريبي','body_en',E'Synthetic first paragraph\n\nSynthetic second paragraph','body_ar','نص تجريبي'),'Self-test freezes the exact saved bilingual composition');
select is((select count(*) from msrc_announcements.recipients where announcement_id=pg_temp.release_id('draft')),0::bigint,'Self-test creates no recipients');
select is((select count(*) from msrc_announcements.inbox where announcement_id=pg_temp.release_id('draft')),0::bigint,'Self-test creates no inbox rows');
select is((select state from msrc_announcements.announcements where id=pg_temp.release_id('draft')),'draft','Self-test never publishes the selected draft');
select is(public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('draft'),1,'e7900000-0000-4000-8000-000000009950'),
 (select value from release_results where key='test1'),'Self-test retry returns the original message');
select is((select count(*) from msrc_announcements.delivery_audit where event='self_test'),1::bigint,'Self-test retry writes no duplicate audit or quota admission');
select is(public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('held'),1,'e7900000-0000-4000-8000-000000009950')->>'state','conflict','Reused test operation with different input conflicts');
select is(public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('draft'),2,gen_random_uuid())->>'state','conflict','Stale saved version cannot be tested');
select is(public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('held'),2,gen_random_uuid())->>'state','conflict','Published content cannot be used as selected draft');
select is(public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('draft'),1,gen_random_uuid())->>'state','queued','Second hourly test queues');
select is(public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('draft'),1,gen_random_uuid())->>'state','queued','Third hourly test queues');
select is(public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('draft'),1,gen_random_uuid())->>'state','rate_limited','Fourth hourly test is capped');
select is(public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('draft'),1,'e7900000-0000-4000-8000-000000009950')->>'state','queued','Idempotent retry works after reaching rate limit');
select is((select count(*) from msrc_announcements.delivery_audit where event='self_test'),3::bigint,'Only admitted tests have audit receipts');
select ok((select bool_and(session_id=pg_temp.registration_session(9950) and actor_id=pg_temp.registration_actor(9950)) from msrc_announcements.delivery_audit),'Test audit binds actor and exact session');
select throws_ok($$update msrc_announcements.delivery_audit set event='layout_approval'$$,'55000',null,'Release audit is immutable');
select throws_ok($$delete from msrc_announcements.delivery_audit$$,'55000',null,'Release audit cannot be removed');

select is(public.msrc_staff_announcement_layout_approval('synthetic-release',true,'e7900000-0000-4000-8000-000000009951')->>'layoutApproved','true','Assured Super Admin may explicitly approve layout');
select is((select count(*) from msrc_announcements.delivery_audit where event='layout_approval'),1::bigint,'Approval is audited');
select ok((select layout_approved and actor_id=pg_temp.registration_actor(9950) and session_id=pg_temp.registration_session(9950)
 from msrc_announcements.delivery_audit where event='layout_approval'),'Approval audit retains approved state and exact actor/session');
select is(public.msrc_staff_announcement_layout_approval('synthetic-release',true,'e7900000-0000-4000-8000-000000009951')->>'layoutApproved','true','Approval retry is idempotent');
select is((select count(*) from msrc_announcements.delivery_audit where event='layout_approval'),1::bigint,'Approval retry creates no duplicate audit');
select is(public.msrc_staff_announcement_layout_approval('synthetic-release',false,'e7900000-0000-4000-8000-000000009951')->>'state','conflict','Approval operation cannot be reused with different decision');
select ok(not exists(select 1 from msrc_outbox.messages m join msrc_announcements.recipients r on r.outbox_id=m.id
 where r.announcement_id=pg_temp.release_id('held') and(not m.delivery_hold or m.announcement_delivery is not null)),'Approval never silently releases already-held messages');
select throws_ok($$update msrc_outbox.messages set delivery_hold=false where template_key='announcement' and announcement_delivery is null$$,
 '23514',null,'Old held messages cannot be unlocked accidentally');
select throws_ok($$update msrc_outbox.messages set delivery_hold=false,announcement_delivery='approved' where template_key='announcement' and announcement_delivery is null$$,
 '23514',null,'Old held messages cannot acquire new approval provenance');
insert into release_results values('approvedPreview',public.msrc_staff_announcement_preview('synthetic-release',pg_temp.release_id('draft'),1));
select is(public.msrc_staff_announcement_send('synthetic-release',pg_temp.release_id('draft'),1,
 (select value#>>'{preview,previewToken}' from release_results where key='approvedPreview'),gen_random_uuid())->>'state','updated','New publication after approval enqueues normally');
select ok((select bool_and(not m.delivery_hold and m.announcement_delivery='approved') from msrc_outbox.messages m
 join msrc_announcements.recipients r on r.outbox_id=m.id where r.announcement_id=pg_temp.release_id('draft')),'New approved messages have no delivery hold');
select ok((select not delivery_enabled and not sweeps_enabled and daily_cap=0 from msrc_outbox.settings),'Layout approval changes no global outbox gate');
select is(public.msrc_outbox_claim(gen_random_uuid(),10,100),'[]'::jsonb,'No test or publication can claim while global delivery is off');
update msrc_outbox.settings set delivery_enabled=true;
select is(public.msrc_outbox_claim(gen_random_uuid(),10,100),'[]'::jsonb,'Zero database cap still blocks tests and publications');
update msrc_outbox.settings set daily_cap=100;
select is(public.msrc_outbox_claim(gen_random_uuid(),10,100),'[]'::jsonb,'Announcement claims require global sweeps enabled');
update msrc_outbox.settings set sweeps_enabled=true;
select is(public.msrc_outbox_claim(gen_random_uuid(),10,0),'[]'::jsonb,'Zero runtime cap still blocks tests and publications');
insert into release_results values('claim',public.msrc_outbox_claim(gen_random_uuid(),1,1));
select is(jsonb_array_length((select value from release_results where key='claim')),1,'Approved/test messages become claimable only under global switches and budget');
select ok((select value#>>'{0,announcement_delivery}' in('approved','self_test') from release_results where key='claim'),'Claim response carries insertion provenance to the worker');
select is(public.msrc_outbox_claim(gen_random_uuid(),10,1),'[]'::jsonb,'Self-tests consume the ordinary global attempt budget');
select ok(not exists(select 1 from msrc_outbox.messages m join msrc_announcements.recipients r on r.outbox_id=m.id
 where r.announcement_id=pg_temp.release_id('held') and m.attempt_count<>0),'Held-era messages remain unclaimed after approval and global enablement');
update msrc_outbox.settings set sweeps_enabled=false;
select throws_ok($$select public.msrc_outbox_prepare((value#>>'{0,id}')::uuid,
 (select claimed_by from msrc_outbox.messages where id=(value#>>'{0,id}')::uuid),(value#>>'{0,lease_token}')::uuid,'{}'::jsonb)
 from release_results where key='claim'$$,'55000',null,'Disabling sweeps between claim and prepare blocks a new announcement attempt');
select is(public.msrc_staff_announcement_layout_approval('synthetic-release',false,gen_random_uuid())->>'layoutApproved','false','Super Admin can revoke approval for future publications with audit');
insert into release_results values('afterRevocation',public.msrc_staff_announcement_save('synthetic-release',pg_temp.release_input()));
insert into release_results values('afterRevocationPreview',public.msrc_staff_announcement_preview('synthetic-release',pg_temp.release_id('afterRevocation'),1));
select is(public.msrc_staff_announcement_send('synthetic-release',pg_temp.release_id('afterRevocation'),1,
 (select value#>>'{preview,previewToken}' from release_results where key='afterRevocationPreview'),gen_random_uuid())->>'state','updated','Publication while approval is revoked remains supported');
select ok((select bool_and(m.delivery_hold and m.announcement_delivery is null) from msrc_outbox.messages m
 join msrc_announcements.recipients r on r.outbox_id=m.id where r.announcement_id=pg_temp.release_id('afterRevocation')),'Revoked approval holds all subsequently published messages');

select set_config('request.jwt.claims',(pg_temp.registration_claims(9951)||jsonb_build_object('email','forged@example.invalid'))::text,true);
insert into release_results values('otherAdminDraft',public.msrc_staff_announcement_save('synthetic-release',pg_temp.release_input()));
insert into release_results values('otherAdminTest',public.msrc_staff_announcement_test_send('synthetic-release',pg_temp.release_id('otherAdminDraft'),1,gen_random_uuid()));
select is((select recipient_email from msrc_outbox.messages where id=(select(value->>'messageId')::uuid from release_results where key='otherAdminTest')),
 'registration-staff-9951@example.invalid','Second Super Admin gets own separate quota and Auth address, never a forged JWT email');
-- Staff identity changes are blocked by the recovery guard, so assert the verified-address requirement structurally.
select ok(position('u.email_confirmed_at is not null' in (select p.prosrc from pg_proc p where p.oid='public.msrc_staff_announcement_test_send(text,uuid,integer,uuid)'::regprocedure))>0,'An unverified acting address cannot receive a test');
select * from finish();
rollback;
