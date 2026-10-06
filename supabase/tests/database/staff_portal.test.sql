-- BL-AUTH-01/05/06 and BL-RPT-01/03. Synthetic private fixtures roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select has_schema('msrc_staff','Portal state is isolated in a private schema');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='msrc_staff'
 and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),9::bigint,'Every private portal table enables and forces RLS');
select is((select count(*) from pg_policies where schemaname='msrc_staff'),0::bigint,'No client policy exposes staff tables');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name) where has_schema_privilege(r.name,'msrc_staff','USAGE')),'No API role can use the private schema');
select ok(not (public.msrc_staff_status()->>'enabled')::boolean,'Database portal starts closed');
select is(public.msrc_staff_status()->>'emailDailyLimit',null::text,'No email budget invented');
select is((select count(*) from msrc_staff.profiles),0::bigint,'No real or synthetic staff seeded by the migration');
insert into msrc_staff.audit(action,result) values('bootstrap','denied');
select throws_ok($$update msrc_staff.audit set result='allowed'$$,'55000',null,'Audit mutation denied even to native operator');
select throws_ok($$truncate msrc_staff.audit$$,'55000',null,'Audit truncation denied');
select ok(msrc_staff.roles_valid(array['finance','checkInStaff']),'Typed distinct staff roles accepted');
select ok(not msrc_staff.roles_valid(array['participant']),'Participant cannot be invited as staff');
select ok(not msrc_staff.roles_valid(array['superAdmin','superAdmin']),'Duplicate roles rejected');
select ok(not msrc_staff.roles_valid('{}'),'Invitations require a role');
set local role anon;
select throws_ok($$select public.msrc_staff_profile('synthetic-portal-2027')$$,'42501',null,'Anonymous callers cannot read staff profiles');
select throws_ok($$select public.msrc_staff_invite_consume(gen_random_uuid(),repeat('a',64),gen_random_uuid(),gen_random_uuid(),'Synthetic')$$,'42501',null,'Public bearer cannot consume invitations directly');
reset role;
set local role authenticated;
select is(public.msrc_staff_profile('synthetic-portal-2027'),null::jsonb,'Closed route database read returns nothing');
select throws_ok($$select public.msrc_staff_status()$$,'42501',null,'Ordinary users cannot read private operational status');
select throws_ok($$select msrc_staff.bootstrap_reserve(gen_random_uuid(),'synthetic@example.invalid')$$,'42501',null,'Website caller cannot bootstrap');
reset role;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-portal-2027'),('synthetic-portal-other');
insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous) values
 ('a1000000-0000-4000-8000-000000000001','portal-sa-one@example.invalid',now(),'synthetic-hash',now(),now(),false),
 ('a1000000-0000-4000-8000-000000000002','portal-sa-two@example.invalid',now(),'synthetic-hash',now(),now(),false),
 ('a1000000-0000-4000-8000-000000000003','portal-registration@example.invalid',now(),'synthetic-hash',now(),now(),false),
 ('a1000000-0000-4000-8000-000000000004','portal-finance@example.invalid',now(),'synthetic-hash',now(),now(),false),
 ('a1000000-0000-4000-8000-000000000005','portal-participant@example.invalid',null,'synthetic-hash',now(),now(),false),
 ('a1000000-0000-4000-8000-000000000006','portal-other-edition@example.invalid',now(),'synthetic-hash',now(),now(),false);
insert into msrc_authorization.account_access(actor_id,state,individually_identified)
 select id,'active',true from auth.users where id::text like 'a1000000%';
insert into msrc_staff.profiles(actor_id,name) select id,'Synthetic staff '||right(id::text,1) from auth.users where id::text like 'a1000000%' and right(id::text,1)<>'5';
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason) values
 ('a1000000-0000-4000-8000-000000000001','synthetic-portal-2027','superAdmin','edition','Synthetic staff test'),
 ('a1000000-0000-4000-8000-000000000002','synthetic-portal-2027','superAdmin','edition','Synthetic staff test'),
 ('a1000000-0000-4000-8000-000000000003','synthetic-portal-2027','registrationWorkshopAdministrator','edition','Synthetic staff test'),
 ('a1000000-0000-4000-8000-000000000004','synthetic-portal-2027','finance','edition','Synthetic staff test'),
 ('a1000000-0000-4000-8000-000000000006','synthetic-portal-other','finance','edition','Synthetic staff test');
insert into msrc_participant.profiles(actor_id,name,privacy_version) values('a1000000-0000-4000-8000-000000000005','Synthetic participant','synthetic-policy');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values
 ('a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','totp','verified',now()-interval '5 minutes',now()-interval '5 minutes'),
 ('a3000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','totp','verified',now()-interval '5 minutes',now()-interval '5 minutes');
insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id) values
 ('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',date_trunc('second',now()-interval '2 minutes'),now(),'aal2','a3000000-0000-4000-8000-000000000001'),
 ('a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002',date_trunc('second',now()-interval '2 minutes'),now(),'aal2','a3000000-0000-4000-8000-000000000002'),
 ('a2000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000003',date_trunc('second',now()-interval '2 minutes'),now(),'aal1',null),
 ('a2000000-0000-4000-8000-000000000004','a1000000-0000-4000-8000-000000000004',date_trunc('second',now()-interval '2 minutes'),now(),'aal1',null);
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),id,'password',created_at,created_at from auth.sessions where id::text like 'a2000000%';
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),id,'totp',date_trunc('second',now()-interval '30 seconds'),date_trunc('second',now()-interval '30 seconds') from auth.sessions where id::text like 'a2000000%' and aal::text='aal2';
create function pg_temp.portal_claims(suffix text default '1') returns void language plpgsql as $$
 declare actor text:='a1000000-0000-4000-8000-00000000000'||suffix;sid text:='a2000000-0000-4000-8000-00000000000'||suffix;
 begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sid,
 'aal',case when suffix in ('1','2') then 'aal2' else 'aal1' end,'exp',extract(epoch from now()+interval '1 hour'),
 'amr',(select jsonb_agg(jsonb_build_object('method',authentication_method,'timestamp',floor(extract(epoch from updated_at::timestamptz)))) from auth.mfa_amr_claims where session_id::text=sid))::text,true);
 end$$;
do $$begin perform pg_temp.portal_claims();end$$;
set local role authenticated;
select is(public.msrc_staff_profile('synthetic-portal-2027')->'roles','["superAdmin"]'::jsonb,'Portal uses live persisted roles and strongest verified native TOTP');
select is(public.msrc_staff_admin_change('synthetic-portal-2027','a1000000-0000-4000-8000-000000000001','set_roles',array['finance'])->>'state','denied','Own Super Admin demotion denied');
select is(public.msrc_staff_admin_change('synthetic-portal-2027','a1000000-0000-4000-8000-000000000001','suspend')->>'state','denied','Self suspension denied');
select is(public.msrc_staff_admin_change('synthetic-portal-2027','a1000000-0000-4000-8000-000000000001','reset_authenticator','{}',gen_random_uuid())->>'state','denied','Self authenticator reset denied');
select is(public.msrc_staff_admin_change('synthetic-portal-2027','a1000000-0000-4000-8000-000000000002','set_roles',array['finance'])->>'state','denied','Two-Super-Admin minimum prevents demotion');
select is(public.msrc_staff_admin_change('synthetic-portal-2027','a1000000-0000-4000-8000-000000000002','suspend')->>'state','denied','Two-Super-Admin minimum prevents suspension');
select is(public.msrc_staff_admin_change('synthetic-portal-2027','a1000000-0000-4000-8000-000000000006','suspend')->>'state','denied','Other-edition target cannot be managed');
select is(public.msrc_staff_identity_reveal('synthetic-portal-2027','a1000000-0000-4000-8000-000000000005')->>'state','unavailable','Explicit reveal does not invent the future registration identity field');
select is(public.msrc_staff_participants('synthetic-portal-2027','portal-participant')->'rows'->0->>'status','unverified','Internal list distinguishes unverified accounts');
select is(public.msrc_staff_participants('synthetic-portal-2027','portal-participant')->'rows'->0->>'identityMasked',null::text,'No national identifier is collected or projected now');
select is(public.msrc_staff_invite_begin('synthetic-portal-2027','portal-invite@example.invalid',array['finance'],'a4000000-0000-4000-8000-000000000001',repeat('a',64))->>'state','reserved','Super Admin can reserve a 72-hour invitation');
reset role;
select is((select expires_at-created_at from msrc_staff.invitations where id='a4000000-0000-4000-8000-000000000001'),interval '72 hours','Invitation expiration is exactly 72 hours');
select is(public.msrc_staff_invite_delivery('a4000000-0000-4000-8000-000000000001',true)->>'state','completed','Delivery acknowledgement audited');
select is(public.msrc_staff_invite_consume('a4000000-0000-4000-8000-000000000001',repeat('b',64),gen_random_uuid(),gen_random_uuid(),'Synthetic invitee')->>'state','denied','Wrong token denied without consuming invitation');
select is(public.msrc_staff_invite_consume('a4000000-0000-4000-8000-000000000001',repeat('a',64),'a5000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000009','Synthetic invitee')->>'state','consumed','Correct single-use token reserves native admission');
select is(public.msrc_staff_invite_consume('a4000000-0000-4000-8000-000000000001',repeat('a',64),gen_random_uuid(),gen_random_uuid(),'Synthetic invitee')->>'state','denied','Consumed token cannot replay');
set local role authenticated;
select is(public.msrc_staff_invite_revoke('synthetic-portal-2027','a4000000-0000-4000-8000-000000000001')->>'state','completed','Revocation cancels claiming invitation');
reset role;
select is((select state from msrc_staff.admissions where id='a5000000-0000-4000-8000-000000000001'),'failed','Revocation invalidates reserved native admission');
select is(public.msrc_staff_invite_complete('a5000000-0000-4000-8000-000000000001',true)->>'state','denied','A revoked reservation cannot grant roles');
insert into msrc_staff.invitations(id,edition_key,email,roles,token_hash,invited_by,created_at,expires_at,delivered_at)
 values('a4000000-0000-4000-8000-000000000002','synthetic-portal-2027','portal-expired@example.invalid',array['finance'],repeat('a',64),'a1000000-0000-4000-8000-000000000001',now()-interval '73 hours',now()-interval '1 hour',now()-interval '73 hours');
select is(public.msrc_staff_invite_consume('a4000000-0000-4000-8000-000000000002',repeat('a',64),gen_random_uuid(),gen_random_uuid(),'Synthetic')->>'state','denied','Expired invitation denied');
select ok(exists(select 1 from msrc_staff.audit where action='set_roles' and result='denied'),'Guard denials persist in immutable audit');
select ok(exists(select 1 from msrc_staff.audit where action='identity_reveal' and result='unavailable'),'Explicit reveal attempts are audited');
select throws_ok($$delete from auth.mfa_factors where user_id='a1000000-0000-4000-8000-000000000001'$$,'42501',null,'Native factor deletion cannot bypass other-admin recovery');
select throws_ok($$update auth.users set encrypted_password='changed-synthetic-hash' where id='a1000000-0000-4000-8000-000000000001'$$,'42501',null,'Native password reset cannot bypass other-admin recovery');
select throws_ok($$insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
 values(gen_random_uuid(),'a1000000-0000-4000-8000-000000000001','totp','unverified',now(),now())$$,'42501',null,'Password-only native enrollment cannot replace an existing Super Admin authenticator');
-- Exact-session regular staff receipts are required; no metadata/JWT role spoofing.
do $$begin perform pg_temp.portal_claims('4');end$$;
set local role authenticated;
select is(public.msrc_staff_people('synthetic-portal-2027'),null::jsonb,'Finance cannot read staff roster');
select is(public.msrc_staff_participants('synthetic-portal-2027'),null::jsonb,'Finance cannot read participant identities');
select is(public.msrc_staff_identity_reveal('synthetic-portal-2027','a1000000-0000-4000-8000-000000000005')->>'state','denied','Non-Super-Admin reveal denied and audited');
select is(public.msrc_staff_profile('synthetic-portal-2027'),null::jsonb,'Password-only staff cannot enter portal');
reset role;
select is(msrc_staff.active_super_admin_count('synthetic-portal-2027'),2::bigint,'Guarded denied actions retain exactly two active Super Admins');
-- Native invited creation can stage unconfirmed INSERT then same-transaction
-- confirmation. Until completion no staff profile/grant is admitted.
insert into msrc_staff.invitations(id,edition_key,email,roles,token_hash,invited_by,created_at,expires_at,delivered_at)
 values('a4000000-0000-4000-8000-000000000003','synthetic-portal-2027','portal-staged@example.invalid',array['finance'],repeat('c',64),'a1000000-0000-4000-8000-000000000001',now(),now()+interval '72 hours',now());
select is(public.msrc_staff_invite_consume('a4000000-0000-4000-8000-000000000003',repeat('c',64),'a5000000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000009','Synthetic staged invitee')->>'state','consumed','Delivered invitation reserves exact native identity');
select lives_ok($$insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous)
 values('a1000000-0000-4000-8000-000000000009','portal-staged@example.invalid',null,'synthetic-managed-hash',now(),now(),false)$$,'Invited native INSERT may precede email confirmation');
select ok(not exists(select 1 from msrc_staff.profiles where actor_id='a1000000-0000-4000-8000-000000000009'),'Staged native creation does not admit a profile');
select lives_ok($$update auth.users set email_confirmed_at=now() where id='a1000000-0000-4000-8000-000000000009'$$,'Same native invitation transaction confirms mailbox');
select is(public.msrc_staff_invite_complete('a5000000-0000-4000-8000-000000000003',true)->>'state','completed','Only completed confirmed native identity receives invited edition roles');
select ok(exists(select 1 from msrc_authorization.role_grants where actor_id='a1000000-0000-4000-8000-000000000009' and edition_key='synthetic-portal-2027' and role_name='finance' and state='active'),'Accepted staff roles remain edition-scoped');
-- Every role is checked with genuine exact-session email assurance, so server
-- denials prove the permission boundary rather than merely missing MFA.
create temp table portal_role_matrix(role text,actor uuid,sid uuid);
do $$declare r text;n integer:=0;target uuid;sid uuid;cid uuid;evidence jsonb;begin
 foreach r in array array['abstractReviewer','hackathonReviewer','threeMinuteThesisReviewer','scientificAdministrator','judgingCommittee','facultyJudge','registrationWorkshopAdministrator','finance','checkInStaff','contentMediaEditor','sponsorshipPr'] loop
 n:=n+1;target:=('c1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;sid:=('c2000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;cid:=gen_random_uuid();
 insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous) values(target,'portal-matrix-'||n||'@example.invalid',now(),'synthetic-hash',now(),now(),false);
 insert into msrc_authorization.account_access(actor_id,state,individually_identified) values(target,'active',true);
 insert into msrc_staff.profiles(actor_id,name) values(target,'Synthetic matrix staff '||n);
 insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason) values(target,'synthetic-portal-2027',r,'edition','Synthetic matrix');
 insert into auth.sessions(id,user_id,created_at,updated_at,aal) values(sid,target,date_trunc('second',now()-interval '2 minutes'),now(),'aal1');
 insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at) select gen_random_uuid(),id,'password',created_at,created_at from auth.sessions where id=sid;
 evidence:=msrc_staff_email.basis(target,sid);
 insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at,state,verified_at)
 values(cid,target,sid,evidence->>'binding',repeat('a',64),repeat('a',64),now()-interval '1 minute',now()+interval '4 minutes','verified',now()-interval '30 seconds');
 insert into msrc_staff_email.receipts(session_id,actor_id,challenge_id,binding,verified_at) values(sid,target,cid,evidence->>'binding',now()-interval '30 seconds');
 insert into portal_role_matrix values(r,target,sid);
 end loop;
end$$;
create function pg_temp.matrix_claims(target uuid,sid uuid) returns void language plpgsql security definer set search_path='' as $$
 begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',target,'role','authenticated','session_id',sid,'aal','aal1',
 'exp',extract(epoch from clock_timestamp()+interval '1 hour'),'amr',(select jsonb_agg(jsonb_build_object('method',authentication_method,'timestamp',floor(extract(epoch from updated_at::timestamptz)))) from auth.mfa_amr_claims where session_id=sid))::text,true);
 end$$;
create function pg_temp.check_matrix(role_name text,target uuid,sid uuid) returns setof text language plpgsql as $$
 begin
 perform pg_temp.matrix_claims(target,sid);
 return next ok(public.msrc_staff_profile('synthetic-portal-2027')->'roles' @> to_jsonb(array[role_name]),role_name||' can read its own current-role profile with session email assurance');
 return next is(public.msrc_staff_people('synthetic-portal-2027'),null::jsonb,role_name||' cannot read People');
 return next is(public.msrc_staff_audit('synthetic-portal-2027'),null::jsonb,role_name||' cannot read audit');
 return next is(public.msrc_staff_admin_change('synthetic-portal-2027','a1000000-0000-4000-8000-000000000004','suspend')->>'state','denied',role_name||' cannot manage security');
 return next is(public.msrc_staff_participants('synthetic-portal-2027') is not null,role_name='registrationWorkshopAdministrator',role_name||' receives only its permitted participant-list boundary');
 end$$;
grant select on portal_role_matrix to authenticated;
set local role authenticated;
select checks from portal_role_matrix m cross join lateral pg_temp.check_matrix(m.role,m.actor,m.sid) checks;
reset role;
-- Background status/area polling must not renew the idle clock.
do $$begin perform pg_temp.portal_claims();end$$;
create temp table observed_clock as select last_activity_at from msrc_sessions.session_state where session_id='a2000000-0000-4000-8000-000000000001';
set local role authenticated;
select ok(public.msrc_staff_profile('synthetic-portal-2027') is not null,'Background profile observation stays authorized before expiry');
select ok(public.msrc_staff_people('synthetic-portal-2027') is not null,'Background roster observation stays authorized before expiry');
select ok(public.msrc_staff_audit('synthetic-portal-2027') is not null,'Background audit observation stays authorized before expiry');
select ok(public.msrc_staff_participants('synthetic-portal-2027') is not null,'Background participant observation stays authorized before expiry');
reset role;
select is((select last_activity_at from msrc_sessions.session_state where session_id='a2000000-0000-4000-8000-000000000001'),(select last_activity_at from observed_clock),'All background GET projections preserve idle activity evidence');
insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id) values
 ('a2000000-0000-4000-8000-000000000007','a1000000-0000-4000-8000-000000000001',date_trunc('second',now()-interval '31 minutes'),now(),'aal2','a3000000-0000-4000-8000-000000000001'),
 ('a2000000-0000-4000-8000-000000000008','a1000000-0000-4000-8000-000000000001',date_trunc('second',now()-interval '8 hours'),now(),'aal2','a3000000-0000-4000-8000-000000000001');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),id,'password',created_at,created_at from auth.sessions where id in ('a2000000-0000-4000-8000-000000000007','a2000000-0000-4000-8000-000000000008');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),id,'totp',date_trunc('second',now()-interval '30 seconds'),date_trunc('second',now()-interval '30 seconds') from auth.sessions where id in ('a2000000-0000-4000-8000-000000000007','a2000000-0000-4000-8000-000000000008');
do $$begin perform pg_temp.matrix_claims('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000007');
 perform set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,'{aal}','"aal2"')::text,true);end$$;
set local role authenticated;
select is(public.msrc_staff_profile('synthetic-portal-2027'),null::jsonb,'Portal profile denied after privileged idle expiry');
select is(public.msrc_staff_people('synthetic-portal-2027'),null::jsonb,'Background roster cannot resurrect expired idle session');
reset role;
do $$begin perform pg_temp.matrix_claims('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000008');
 perform set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,'{aal}','"aal2"')::text,true);end$$;
set local role authenticated;
select is(public.msrc_staff_profile('synthetic-portal-2027'),null::jsonb,'Portal profile denied at eight-hour absolute expiry');
reset role;
select * from finish();
rollback;
