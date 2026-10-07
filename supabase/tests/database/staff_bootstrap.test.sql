-- BL-AUTH-01 native Admin creation is staged before email confirmation.
-- Only a privately reserved first actor may enter; all fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select lives_ok($$select msrc_staff.bootstrap_reserve('d8100000-0000-4000-8000-000000000001','staged-bootstrap@example.invalid')$$,'Native operator reserves exact first-account identity');
select lives_ok($$insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous)
 values('d8100000-0000-4000-8000-000000000001','staged-bootstrap@example.invalid',null,'synthetic-managed-hash',now(),now(),false)$$,'Reserved native INSERT may precede managed email confirmation');
select is((select count(*) from msrc_staff.profiles),0::bigint,'Native creation alone cannot admit a staff profile');
select is(msrc_participant.suppress_native_email('{"user":{"id":"d8100000-0000-4000-8000-000000000001"}}'),'{}'::jsonb,'Reserved staged bootstrap suppresses native mail before admission');
select throws_ok($$select msrc_staff.bootstrap_first('d8100000-0000-4000-8000-000000000001','synthetic-bootstrap-2027','Synthetic bootstrap staff')$$,'55000',null,'Unconfirmed native identity cannot complete bootstrap');
select lives_ok($$update auth.users set email_confirmed_at=now() where id='d8100000-0000-4000-8000-000000000001'$$,'Same native transaction can finish requested mailbox confirmation');
select lives_ok($$select msrc_staff.bootstrap_first('d8100000-0000-4000-8000-000000000001','synthetic-bootstrap-2027','Synthetic bootstrap staff')$$,'Confirmed managed identity completes first-account authority');
select is(msrc_staff.active_super_admin_count('synthetic-bootstrap-2027'),1::bigint,'Bootstrap creates only the first individually identified Super Admin');
select is(msrc_staff.enrolled_super_admin_count('synthetic-bootstrap-2027'),0::bigint,'Bootstrap creates no authenticator; enrollment remains mandatory');
select ok(not (public.msrc_staff_status()->>'enabled')::boolean,'Bootstrap leaves the portal database gate closed');
select throws_ok($$select msrc_staff.bootstrap_reserve(gen_random_uuid(),'another-bootstrap@example.invalid')$$,'55000',null,'Completed bootstrap cannot create another native account');
select throws_ok($$update auth.users set email='different-bootstrap@example.invalid' where id='d8100000-0000-4000-8000-000000000001'$$,'42501',null,'Completed staff identity cannot mutate without other-admin recovery');
select * from finish();
rollback;
