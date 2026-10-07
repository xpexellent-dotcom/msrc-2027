-- ORG-044: a failed/interrupted provider reservation never releases staff access.
-- Genuine managed identity evidence is represented synthetically; all rows roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
update msrc_staff.policy set enabled=true,email_daily_limit=1000,bootstrap_pairing_completed=true;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-staff-recovery-2027');
insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous) values
 ('e7100000-0000-4000-8000-000000000001','recovery-target@example.invalid',now(),'synthetic-old-password',now(),now(),false),
 ('e7100000-0000-4000-8000-000000000002','recovery-performer@example.invalid',now(),'synthetic-other-password',now(),now(),false);
insert into msrc_authorization.account_access(actor_id,state,individually_identified) values
 ('e7100000-0000-4000-8000-000000000001','active',true),('e7100000-0000-4000-8000-000000000002','active',true);
insert into msrc_staff.profiles(actor_id,name) values
 ('e7100000-0000-4000-8000-000000000001','Synthetic recovery target'),('e7100000-0000-4000-8000-000000000002','Synthetic other Super Admin');
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason) values
 ('e7100000-0000-4000-8000-000000000001','synthetic-staff-recovery-2027','superAdmin','edition','Synthetic recovery fixture'),
 ('e7100000-0000-4000-8000-000000000002','synthetic-staff-recovery-2027','superAdmin','edition','Synthetic recovery fixture');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values
 ('e7300000-0000-4000-8000-000000000001','e7100000-0000-4000-8000-000000000001','totp','verified',now()-interval '5 minutes',now()-interval '5 minutes'),
 ('e7300000-0000-4000-8000-000000000002','e7100000-0000-4000-8000-000000000002','totp','verified',now()-interval '5 minutes',now()-interval '5 minutes');
insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id) values
 ('e7200000-0000-4000-8000-000000000002','e7100000-0000-4000-8000-000000000002',date_trunc('second',now()-interval '2 minutes'),now(),'aal2','e7300000-0000-4000-8000-000000000002');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),id,'password',created_at,created_at from auth.sessions where id='e7200000-0000-4000-8000-000000000002';
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at) values
 (gen_random_uuid(),'e7200000-0000-4000-8000-000000000002','totp',date_trunc('second',now()-interval '30 seconds'),date_trunc('second',now()-interval '30 seconds'));
create function pg_temp.recovery_claims(actor uuid default 'e7100000-0000-4000-8000-000000000002',sid uuid default 'e7200000-0000-4000-8000-000000000002',aal text default 'aal2') returns void
 language plpgsql security definer set search_path='' as $$begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sid,'aal',aal,
 'exp',extract(epoch from clock_timestamp()+interval '1 hour'),'amr',(select jsonb_agg(jsonb_build_object('method',authentication_method,'timestamp',floor(extract(epoch from updated_at::timestamptz)))) from auth.mfa_amr_claims where session_id=sid))::text,true);
 end$$;
do $$begin perform pg_temp.recovery_claims();end$$;
set local role authenticated;
select is(public.msrc_staff_admin_change('synthetic-staff-recovery-2027','e7100000-0000-4000-8000-000000000001','reset_account','{}','e7400000-0000-4000-8000-000000000001')->>'state','reserved','Other Super Admin reserves an account reset');
reset role;
select is((select recovery_state from msrc_staff.profiles where actor_id='e7100000-0000-4000-8000-000000000001'),'pending','Persistent denial is committed before provider work');
delete from auth.mfa_factors where user_id='e7100000-0000-4000-8000-000000000001';
select is((select count(*) from auth.mfa_factors where user_id='e7100000-0000-4000-8000-000000000001'),0::bigint,'Actual factor deletion can succeed before credential rotation');
select is(public.msrc_staff_admin_complete('e7400000-0000-4000-8000-000000000001',false)->>'state','denied','Failed credential phase cannot acknowledge successful recovery');
select is((select encrypted_password from auth.users where id='e7100000-0000-4000-8000-000000000001'),'synthetic-old-password','Counterexample retains the old credential after partial provider failure');
select is((select recovery_state from msrc_staff.profiles where actor_id='e7100000-0000-4000-8000-000000000001'),'failed','Failure retains a durable recovery hold');
update msrc_staff.admin_operations set expires_at=clock_timestamp()-interval '1 minute' where id='e7400000-0000-4000-8000-000000000001';
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('e7200000-0000-4000-8000-000000000001','e7100000-0000-4000-8000-000000000001',clock_timestamp(),clock_timestamp(),'aal1');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),id,'password',created_at,created_at from auth.sessions where id='e7200000-0000-4000-8000-000000000001';
do $$begin perform pg_temp.recovery_claims('e7100000-0000-4000-8000-000000000001','e7200000-0000-4000-8000-000000000001','aal1');end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-staff-recovery-2027'),null::jsonb,'Fresh old-password identity has no privileged session context after expiry');
select is(public.msrc_session_activity('synthetic-staff-recovery-2027'),null::jsonb,'Activity cannot resurrect recovery-held authority');
select is(public.msrc_access_context('synthetic-staff-recovery-2027'),null::jsonb,'Generic current grant context denies recovery-held actor');
select is(public.msrc_read_access_context('synthetic-staff-recovery-2027'),null::jsonb,'Readonly persisted authority also denies recovery-held actor');
select is(public.msrc_staff_profile('synthetic-staff-recovery-2027'),null::jsonb,'Staff dashboard profile denies the fresh native identity');
reset role;
select is(public.msrc_staff_login_begin('e7500000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64))->>'state','reserved','Password attempt is enumeration-safe before identity validation');
select is(public.msrc_staff_login_finish('e7500000-0000-4000-8000-000000000001','e7100000-0000-4000-8000-000000000001','e7200000-0000-4000-8000-000000000001')->>'state','denied','Application password admission denies held staff identity');
select throws_ok($$insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values(gen_random_uuid(),'e7100000-0000-4000-8000-000000000001','totp','unverified',now(),now())$$,'42501',null,'No self re-enrollment after provider failure and operation expiry');
select throws_ok($$insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 values(gen_random_uuid(),'e7200000-0000-4000-8000-000000000001','totp',clock_timestamp(),clock_timestamp())$$,'42501',null,'Held native identity cannot gain a TOTP verification proof even without a factor-row update');
update auth.sessions set refreshed_at=clock_timestamp(),updated_at=clock_timestamp() where id='e7200000-0000-4000-8000-000000000001';
select ok(msrc_staff.recovery_blocked('e7100000-0000-4000-8000-000000000001'),'Native token refresh cannot clear durable denial');
do $$begin perform pg_temp.recovery_claims();end$$;
set local role authenticated;
select is(public.msrc_staff_admin_change('synthetic-staff-recovery-2027','e7100000-0000-4000-8000-000000000001','reactivate')->>'state','completed','Other admin may retain the active account without releasing recovery');
select is(public.msrc_staff_admin_change('synthetic-staff-recovery-2027','e7100000-0000-4000-8000-000000000001','set_roles',array['superAdmin','finance'])->>'state','completed','Role maintenance does not implicitly release recovery');
select is(public.msrc_staff_admin_change('synthetic-staff-recovery-2027','e7100000-0000-4000-8000-000000000001','reset_authenticator','{}',gen_random_uuid())->>'state','denied','Factor-only retry cannot downgrade an incomplete account reset');
select is(public.msrc_staff_admin_change('synthetic-staff-recovery-2027','e7100000-0000-4000-8000-000000000001','reset_account','{}','e7400000-0000-4000-8000-000000000002')->>'state','reserved','Other admin can retry the required full recovery mode');
reset role;
select ok(msrc_staff.recovery_blocked('e7100000-0000-4000-8000-000000000001'),'Reactivation, role change and retry retain denial');
-- Interrupted retry: no provider completion callback. Expiry still cannot clear it.
update msrc_staff.admin_operations set expires_at=clock_timestamp()-interval '1 minute' where id='e7400000-0000-4000-8000-000000000002';
select throws_ok($$insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values(gen_random_uuid(),'e7100000-0000-4000-8000-000000000001','totp','unverified',now(),now())$$,'42501',null,'Interrupted recovery remains held beyond its reservation deadline');
set local role authenticated;
select is(public.msrc_staff_admin_change('synthetic-staff-recovery-2027','e7100000-0000-4000-8000-000000000001','reset_account','{}','e7400000-0000-4000-8000-000000000003')->>'state','reserved','Interrupted reservation can be replaced by a newly authorized retry');
reset role;
select ok(exists(select 1 from msrc_staff.audit where target_id='e7100000-0000-4000-8000-000000000001' and action='admin_complete' and result='failed'),'Terminal interrupted/failure transitions retain immutable audit evidence');
update auth.users set encrypted_password='synthetic-rotated-password' where id='e7100000-0000-4000-8000-000000000001';
select is(public.msrc_staff_admin_complete('e7400000-0000-4000-8000-000000000003',true)->>'state','completed','Actual native credential rotation completes the current full recovery operation');
select is((select recovery_state from msrc_staff.profiles where actor_id='e7100000-0000-4000-8000-000000000001'),'awaiting_invitation','Completed full reset retains denial until its fresh invitation is accepted');
select is(public.msrc_staff_admin_complete('e7400000-0000-4000-8000-000000000002',true)->>'state','denied','Late previous completion cannot clear the latest hold');
update msrc_staff.admin_operations set expires_at=clock_timestamp()-interval '1 minute' where id='e7400000-0000-4000-8000-000000000003';
set local role authenticated;
select is(public.msrc_staff_invite_begin('synthetic-staff-recovery-2027','recovery-target@example.invalid',array['superAdmin'],'e7600000-0000-4000-8000-000000000001',repeat('c',64))->>'state','reserved','Recovery invitation can be issued after completed provider reservation expiry');
reset role;
select is(public.msrc_staff_invite_delivery('e7600000-0000-4000-8000-000000000001',false)->>'state','completed','Delivery failure invalidates its link');
select ok(msrc_staff.recovery_blocked('e7100000-0000-4000-8000-000000000001'),'Failed recovery email does not release the hold');
set local role authenticated;
select is(public.msrc_staff_invite_begin('synthetic-staff-recovery-2027','recovery-target@example.invalid',array['superAdmin'],'e7600000-0000-4000-8000-000000000002',repeat('d',64))->>'state','reserved','Other admin can issue a replacement after delivery failure');
select is(public.msrc_staff_invite_revoke('synthetic-staff-recovery-2027','e7600000-0000-4000-8000-000000000002')->>'state','completed','Recovery link can be explicitly revoked');
reset role;
select ok(msrc_staff.recovery_blocked('e7100000-0000-4000-8000-000000000001'),'Revocation does not release recovery denial');
set local role authenticated;
select is(public.msrc_staff_invite_begin('synthetic-staff-recovery-2027','recovery-target@example.invalid',array['superAdmin'],'e7600000-0000-4000-8000-000000000003',repeat('e',64))->>'state','reserved','Other admin can issue the current valid fresh recovery link');
reset role;
select is(public.msrc_staff_invite_delivery('e7600000-0000-4000-8000-000000000003',true)->>'state','completed','Fresh recovery link delivery is acknowledged');
select is(public.msrc_staff_invite_consume('e7600000-0000-4000-8000-000000000003',repeat('e',64),'e7700000-0000-4000-8000-000000000003',gen_random_uuid(),'Synthetic recovered staff')->>'state','consumed','Only the current linked invitation reserves native password setting');
update auth.users set encrypted_password='synthetic-invite-password' where id='e7100000-0000-4000-8000-000000000001';
select is(public.msrc_staff_invite_complete('e7700000-0000-4000-8000-000000000003',true)->>'state','completed','Verified current native invitation completion releases the account recovery hold');
select ok(not msrc_staff.recovery_blocked('e7100000-0000-4000-8000-000000000001'),'Successful linked invitation permits mandatory fresh authenticator enrollment');
select lives_ok($$insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values('e7300000-0000-4000-8000-000000000003','e7100000-0000-4000-8000-000000000001','totp','unverified',now(),now())$$,'Legitimate recovery can enroll a new authenticator');
-- A separately approved factor-only recovery remains a valid recovery path.
set local role authenticated;
select is(public.msrc_staff_admin_change('synthetic-staff-recovery-2027','e7100000-0000-4000-8000-000000000001','reset_authenticator','{}','e7400000-0000-4000-8000-000000000004')->>'state','reserved','After full recovery completes, factor-only reset can be authorized independently');
reset role;
delete from auth.mfa_factors where user_id='e7100000-0000-4000-8000-000000000001';
select is(public.msrc_staff_admin_complete('e7400000-0000-4000-8000-000000000004',true)->>'state','completed','Successful factor-only provider completion releases only its own hold');
select ok(not msrc_staff.recovery_blocked('e7100000-0000-4000-8000-000000000001'),'Legitimate factor-only recovery can return to fresh enrollment');
select is(msrc_staff.active_super_admin_count('synthetic-staff-recovery-2027'),2::bigint,'Recovery never suspends accounts or reduces the active Super Admin minimum');
select * from finish();
rollback;
