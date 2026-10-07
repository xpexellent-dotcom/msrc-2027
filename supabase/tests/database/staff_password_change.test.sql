-- BL-AUTH-05/06. Synthetic owner changes; all data and DDL test effects roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
set local timezone='UTC';
select no_plan();
select ok(not (public.msrc_staff_status()->>'passwordChangeEnabled')::boolean,'Own password change defaults independently closed');
select ok((select relrowsecurity and relforcerowsecurity from pg_class where oid='msrc_staff.password_changes'::regclass),'Owner reservations force RLS');
select is((select count(*) from pg_policies where schemaname='msrc_staff' and tablename='password_changes'),0::bigint,'No client policy exposes owner reservations');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
 where has_table_privilege(r.name,'msrc_staff.password_changes','SELECT,INSERT,UPDATE,DELETE')),'API roles cannot read or mutate owner reservations');
select ok(has_function_privilege('authenticated','public.msrc_staff_password_change_begin(text,uuid)','EXECUTE'),'Only actual authenticated owner can begin');
select ok(not has_function_privilege('service_role','public.msrc_staff_password_change_begin(text,uuid)','EXECUTE'),'Service key cannot invent owner assurance');
select ok(has_function_privilege('service_role','public.msrc_staff_password_change_result(uuid)','EXECUTE'),'Only trusted server can reconcile native outcome');
select ok(not has_function_privilege('authenticated','public.msrc_staff_password_change_result(uuid)','EXECUTE'),'Owner cannot terminalize another operation');
select ok(not has_function_privilege('anon','public.msrc_staff_password_change_begin(text,uuid)','EXECUTE'),'Anonymous owner change is denied');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='msrc_staff' and p.proname in ('password_change_guard','password_change_basis','native_password_change','complete_native_password_change'))
 and (not p.proconfig@>array['search_path=""'] or has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('service_role',p.oid,'EXECUTE'))),'Private functions have fixed search path and no API execute');
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
insert into msrc_authorization.edition_config(edition_key) values('synthetic-own-password'),('synthetic-own-other');
do $$declare n integer; actor uuid;sid uuid;factor uuid;begin
 for n in 1..14 loop
  actor:=('f5100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  sid:=('f5200000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  factor:=('f5300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at,encrypted_password,raw_app_meta_data,created_at,updated_at,is_anonymous)
   values(actor,'synthetic-owner-'||n||'@example.invalid',now(),'synthetic-original-hash','{"provider":"email","providers":["email"],"retained":"synthetic"}',now(),now(),false);
  insert into msrc_authorization.account_access(actor_id,state,individually_identified) values(actor,'active',true);
  insert into msrc_staff.profiles(actor_id,name) values(actor,'Synthetic owner '||n);
  insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
   values(actor,'synthetic-own-password',case when n=14 then 'finance' else 'superAdmin' end,'edition','Synthetic password test');
  if n<>14 then
   insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
    values(factor,actor,'totp','verified',now()-interval '5 minutes',now()-interval '5 minutes');
  end if;
  insert into auth.sessions(id,user_id,created_at,updated_at,aal,factor_id)
   values(sid,actor,date_trunc('second',now()-interval '45 seconds'),now(),case when n=14 then 'aal1'::auth.aal_level else 'aal2'::auth.aal_level end,case when n=14 then null else factor end);
  insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
   select gen_random_uuid(),sid,'password',created_at,created_at from auth.sessions where id=sid;
  if n<>14 then
   insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
    values(gen_random_uuid(),sid,'totp',date_trunc('second',now()-interval '20 seconds'),date_trunc('second',now()-interval '20 seconds'));
  end if;
 end loop;
end$$;
create function pg_temp.owner_claims(n integer,sid_override uuid default null) returns void language plpgsql as $$
declare actor uuid:=('f5100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
 sid uuid:=coalesce(sid_override,('f5200000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid);
begin
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'session_id',sid,'role','authenticated','aal',case when n=14 then 'aal1' else 'aal2' end,
  'exp',extract(epoch from now()+interval '1 hour'),'amr',(select jsonb_agg(jsonb_build_object('method',authentication_method,'timestamp',floor(extract(epoch from updated_at::timestamptz))))
  from auth.mfa_amr_claims where session_id=sid))::text,true);
end$$;
create function pg_temp.native_owner_change(n integer,operation uuid,delete_sessions boolean default true) returns void language plpgsql as $$
declare actor uuid:=('f5100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
begin
 -- Exact GoTrue Admin ordering: password first, Logout(all), AppData later.
 update auth.users set encrypted_password='synthetic-new-hash',updated_at=clock_timestamp() where id=actor;
 if delete_sessions then delete from auth.sessions where user_id=actor;end if;
 update auth.users set raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('msrcStaffPasswordChange',operation::text),updated_at=clock_timestamp() where id=actor;
 set constraints auth.staff_password_commit immediate;
 set constraints auth.staff_password_commit deferred;
end$$;
select pg_temp.owner_claims(1);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000001')->>'state','denied','Independent database flag closes even strong existing staff');
reset role;
update msrc_staff.policy set password_change_enabled=true;
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-other','f5400000-0000-4000-8000-000000000001')->>'state','denied','Another edition cannot authorize owner change');
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000001')->>'state','reserved','Fresh real-session password plus verified TOTP reserves owner change');
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000099')->>'state','denied','Concurrent or repeated begin cannot issue a second live reservation');
reset role;
select is((select expires_at-created_at from msrc_staff.password_changes where id='f5400000-0000-4000-8000-000000000001'),interval '2 minutes','Reservation lifetime is exactly two minutes');
select is((select session_id from msrc_staff.password_changes where id='f5400000-0000-4000-8000-000000000001'),'f5200000-0000-4000-8000-000000000001'::uuid,'Reservation binds the actual current session');
select throws_ok($$select pg_temp.native_owner_change(1,'f5400000-0000-4000-8000-000000000099')$$,'42501',null,'Wrong protected marker atomically rolls back native password and logout');
select is((select encrypted_password from auth.users where id='f5100000-0000-4000-8000-000000000001'),'synthetic-original-hash','Wrong marker leaves password intact');
select is((select count(*) from auth.sessions where user_id='f5100000-0000-4000-8000-000000000001'),1::bigint,'Wrong marker restores native sessions');
select throws_ok($$update auth.users set raw_app_meta_data=raw_app_meta_data||'{"msrcStaffPasswordChange":"f5400000-0000-4000-8000-000000000001"}' where id='f5100000-0000-4000-8000-000000000001'$$,'42501',null,'Marker before password is rejected, never stored');
select throws_ok($$update auth.users set encrypted_password='synthetic-new-hash',email='altered@example.invalid' where id='f5100000-0000-4000-8000-000000000001'$$,'42501',null,'Owner reservation cannot change email');
select throws_ok($$update auth.users set encrypted_password='synthetic-new-hash',raw_user_meta_data='{"changed":true}' where id='f5100000-0000-4000-8000-000000000001'$$,'42501',null,'Owner reservation cannot bundle profile changes');
select throws_ok($$update auth.users set encrypted_password='synthetic-new-hash',role='service_role' where id='f5100000-0000-4000-8000-000000000001'$$,'42501',null,'Owner reservation cannot change native role');
select throws_ok($$select pg_temp.native_owner_change(1,'f5400000-0000-4000-8000-000000000001',false)$$,'42501',null,'Commit requires native Admin all-session logout');
-- Password-only native operation provisionally enters, but commit without the
-- protected Admin AppData proof is forbidden and rolls every effect back.
create function pg_temp.unbound_native_change() returns void language plpgsql as $$begin
 update auth.users set encrypted_password='unbound-native-hash' where id='f5100000-0000-4000-8000-000000000001';
 delete from auth.sessions where user_id='f5100000-0000-4000-8000-000000000001';
 set constraints auth.staff_password_commit immediate;
end$$;
select throws_ok($$select pg_temp.unbound_native_change()$$,'42501',null,'Raw alternate native session cannot commit an actor-only reservation');
select is((select state from msrc_staff.password_changes where id='f5400000-0000-4000-8000-000000000001'),'pending','Failed transaction leaves no provisional consumed state');
select lives_ok($$select pg_temp.native_owner_change(1,'f5400000-0000-4000-8000-000000000001')$$,'Exact protected marker completes the same native transaction');
select is(public.msrc_staff_password_change_result('f5400000-0000-4000-8000-000000000001')->>'state','completed','Server reconciles actual committed completion');
select is((select encrypted_password from auth.users where id='f5100000-0000-4000-8000-000000000001'),'synthetic-new-hash','Only bound owner password changes');
select is((select raw_app_meta_data from auth.users where id='f5100000-0000-4000-8000-000000000001'),'{"provider":"email","providers":["email"],"retained":"synthetic"}'::jsonb,'Marker never persists and existing AppData is preserved exactly');
select is((select count(*) from auth.mfa_factors where user_id='f5100000-0000-4000-8000-000000000001' and status::text='verified'),1::bigint,'Existing TOTP factor is retained');
select is((select count(*) from auth.sessions where user_id='f5100000-0000-4000-8000-000000000001'),0::bigint,'All native sessions are revoked');
select ok(not exists(select 1 from msrc_sessions.session_state where actor_id='f5100000-0000-4000-8000-000000000001' and revoked_at is null),'All observed application sessions are revoked');
select is((select revision from msrc_staff_email.identity_revision where actor_id='f5100000-0000-4000-8000-000000000001'),2::bigint,'Native credential revision advances exactly once');
select is((select recovery_state from msrc_staff.profiles where actor_id='f5100000-0000-4000-8000-000000000001'),'none','Ordinary password change creates no lost-access hold');
select is((select count(*) from msrc_staff.admin_operations where target_actor_id='f5100000-0000-4000-8000-000000000001'),0::bigint,'Owner password change does not invoke peer reset');
select ok(exists(select 1 from msrc_staff.audit where actor_id=target_id and action='password_change' and result='completed'),'Owner completion is immutably audited');
select throws_ok($$select pg_temp.native_owner_change(1,'f5400000-0000-4000-8000-000000000001')$$,'42501',null,'Completed operation cannot replay');
set local role authenticated;
select is(public.msrc_session_context('synthetic-own-password'),null::jsonb,'Previous signed session loses all application access');
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000098')->>'state','denied','Old password/TOTP proof cannot reserve again');
reset role;
-- Failed/closed/interrupted provider work is terminalized without changing identity.
select pg_temp.owner_claims(2);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000002')->>'state','reserved','Second synthetic owner reserves');
reset role;
select is(public.msrc_staff_password_change_result('f5400000-0000-4000-8000-000000000002')->>'state','denied','Provider failure terminalizes unused reservation');
select is((select state from msrc_staff.password_changes where id='f5400000-0000-4000-8000-000000000002'),'failed','Failure is durable');
select throws_ok($$select pg_temp.native_owner_change(2,'f5400000-0000-4000-8000-000000000002')$$,'42501',null,'Failed operation cannot replay');
select is((select encrypted_password from auth.users where id='f5100000-0000-4000-8000-000000000002'),'synthetic-original-hash','Failed provider work preserves password');
-- Existing strong session may be valid for staff but not fresh enough for this operation.
update auth.sessions set created_at=date_trunc('second',now()-interval '3 minutes') where id='f5200000-0000-4000-8000-000000000003';
update auth.mfa_amr_claims set created_at=date_trunc('second',now()-interval '3 minutes'),updated_at=date_trunc('second',now()-interval '3 minutes')
 where session_id='f5200000-0000-4000-8000-000000000003' and authentication_method='password';
select pg_temp.owner_claims(3);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000003')->>'state','denied','Fresh TOTP cannot substitute for stale password authentication');
reset role;
select pg_temp.owner_claims(4);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000004')->>'state','reserved','Fourth owner reserves before closure');
reset role;
update msrc_staff.policy set password_change_enabled=false;
select throws_ok($$select pg_temp.native_owner_change(4,'f5400000-0000-4000-8000-000000000004')$$,'42501',null,'Closing independent flag blocks already reserved mutation');
select is(public.msrc_staff_password_change_result('f5400000-0000-4000-8000-000000000004')->>'state','denied','Closure failure terminalized');
update msrc_staff.policy set password_change_enabled=true;
select pg_temp.owner_claims(5);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000005')->>'state','reserved','Fifth owner reserves before authoritative role removal');
reset role;
select pg_temp.owner_claims(2);
update msrc_authorization.role_grants set state='revoked',revocation_reason='Synthetic permission test'
 where actor_id='f5100000-0000-4000-8000-000000000005' and role_name='superAdmin';
select throws_ok($$select pg_temp.native_owner_change(5,'f5400000-0000-4000-8000-000000000005')$$,'42501',null,'Immediate database role removal blocks stale owner operation');
select pg_temp.owner_claims(6);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000006')->>'state','reserved','Sixth owner reserves before recovery hold');
reset role;
insert into msrc_staff.admin_operations(id,performer_actor_id,target_actor_id,edition_key,action,expires_at)
 values('f5500000-0000-4000-8000-000000000006','f5100000-0000-4000-8000-000000000002','f5100000-0000-4000-8000-000000000006','synthetic-own-password','reset_account',now()+interval '5 minutes');
update msrc_staff.profiles set recovery_state='pending',recovery_action='reset_account',recovery_operation='f5500000-0000-4000-8000-000000000006'
 where actor_id='f5100000-0000-4000-8000-000000000006';
select throws_ok($$select pg_temp.native_owner_change(6,'f5400000-0000-4000-8000-000000000006')$$,'42501',null,'Protected owner marker cannot release or use a peer recovery hold');
select lives_ok($$update auth.users set encrypted_password='synthetic-peer-reset-hash' where id='f5100000-0000-4000-8000-000000000006'$$,'Stale owner reservation does not prevent authorized other-admin reset');
select is((select state from msrc_staff.password_changes where id='f5400000-0000-4000-8000-000000000006'),'failed','Peer recovery terminalizes the stale owner operation');
select is((select recovery_state from msrc_staff.profiles where actor_id='f5100000-0000-4000-8000-000000000006'),'pending','Peer recovery remains denied until its own legitimate completion');
select pg_temp.owner_claims(7);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000007')->>'state','reserved','Seventh owner reserves before factor revision');
reset role;
update auth.mfa_factors set updated_at=clock_timestamp() where id='f5300000-0000-4000-8000-000000000007';
select throws_ok($$select pg_temp.native_owner_change(7,'f5400000-0000-4000-8000-000000000007')$$,'42501',null,'Changed factor proof invalidates owner operation');
select pg_temp.owner_claims(8,'f5200000-0000-4000-8000-000000000009');
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000008')->>'state','denied','Another person native session cannot reserve owner change');
reset role;
-- An expired reservation is built as a synthetic private fixture, never by weakening timers.
insert into msrc_staff.password_changes(id,actor_id,session_id,edition_key,factor_id,factor_updated_at,identity_revision,password_at,totp_at,created_at,expires_at)
 select 'f5400000-0000-4000-8000-000000000009',u.id,s.id,'synthetic-own-password',f.id,f.updated_at,r.revision,
  s.created_at,date_trunc('second',now()-interval '20 seconds'),now()-interval '3 minutes',now()-interval '1 minute'
 from auth.users u join auth.sessions s on s.user_id=u.id join auth.mfa_factors f on f.id=s.factor_id join msrc_staff_email.identity_revision r on r.actor_id=u.id
 where u.id='f5100000-0000-4000-8000-000000000009';
select throws_ok($$select pg_temp.native_owner_change(9,'f5400000-0000-4000-8000-000000000009')$$,'42501',null,'Expired operation cannot commit even with fresh remaining native session');
select pg_temp.owner_claims(9);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000019')->>'state','reserved','Expired interrupted operation can be replaced by a newly authorized operation');
reset role;
select is((select state from msrc_staff.password_changes where id='f5400000-0000-4000-8000-000000000009'),'failed','Expired operation terminal transition is recorded');
select pg_temp.owner_claims(10);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000010')->>'state','reserved','Tenth owner reserves despite incomplete initial pairing');
select is(public.msrc_staff_admin_change('synthetic-own-password','f5100000-0000-4000-8000-000000000010','reset_account','{}','f5500000-0000-4000-8000-000000000010')->>'state','denied','Ordinary own change never authorizes self account recovery');
select is(public.msrc_staff_admin_change('synthetic-own-password','f5100000-0000-4000-8000-000000000010','reset_authenticator','{}','f5500000-0000-4000-8000-000000000010')->>'state','denied','Self authenticator reset remains prohibited');
reset role;
select throws_ok($$delete from auth.mfa_factors where id='f5300000-0000-4000-8000-000000000010'$$,'42501',null,'Owner reservation cannot delete authenticator');
select pg_temp.owner_claims(11);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000011')->>'state','reserved','Eleventh owner reserves');
reset role;
create function pg_temp.marker_with_mutation() returns void language plpgsql as $$begin
 update auth.users set encrypted_password='synthetic-new-hash' where id='f5100000-0000-4000-8000-000000000011';
 delete from auth.sessions where user_id='f5100000-0000-4000-8000-000000000011';
 update auth.users set raw_app_meta_data=raw_app_meta_data||'{"msrcStaffPasswordChange":"f5400000-0000-4000-8000-000000000011","escalation":true}'
  where id='f5100000-0000-4000-8000-000000000011';
end$$;
select throws_ok($$select pg_temp.marker_with_mutation()$$,'42501',null,'Protected marker may not bundle arbitrary AppData changes');
update msrc_staff_email.identity_revision set revision=revision+1,password_changed_at=clock_timestamp()
 where actor_id='f5100000-0000-4000-8000-000000000011';
select throws_ok($$select pg_temp.native_owner_change(11,'f5400000-0000-4000-8000-000000000011')$$,'42501',null,'Identity revision invalidates a previously issued owner proof');
select pg_temp.owner_claims(12);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000012')->>'state','reserved','Twelfth owner reserves for promoted participant regression');
reset role;
insert into msrc_participant.profiles(actor_id,name,privacy_version) values('f5100000-0000-4000-8000-000000000012','Synthetic promoted participant','synthetic-policy');
select lives_ok($$select pg_temp.native_owner_change(12,'f5400000-0000-4000-8000-000000000012')$$,'Promoted participant Super Admin can change own password while participant feature remains closed');
select ok(not (select enabled from msrc_participant.policy where singleton),'Participant workflow stays closed');
insert into msrc_authorization.edition_config(edition_key) values('synthetic-single-owner');
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values('f5100000-0000-4000-8000-000000000013','synthetic-single-owner','superAdmin','edition','Synthetic first-admin password change');
update auth.users set raw_app_meta_data=null where id='f5100000-0000-4000-8000-000000000013';
select pg_temp.owner_claims(13);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-single-owner','f5400000-0000-4000-8000-000000000013')->>'state','reserved','First sole Super Admin can perform ordinary password change with real TOTP');
reset role;
select lives_ok($$select pg_temp.native_owner_change(13,'f5400000-0000-4000-8000-000000000013')$$,'Ordinary sole-admin change preserves the authenticator without invoking recovery');
select is((select raw_app_meta_data from auth.users where id='f5100000-0000-4000-8000-000000000013'),null::jsonb,'Native NULL metadata is preserved exactly without retaining the marker');
select is(msrc_staff.active_super_admin_count('synthetic-single-owner'),1::bigint,'Sole-admin password change preserves existing account/grant minimum semantics');
do $$declare evidence jsonb;cid uuid:=gen_random_uuid();actor uuid:='f5100000-0000-4000-8000-000000000014';sid uuid:='f5200000-0000-4000-8000-000000000014';begin
 evidence:=msrc_staff_email.basis(actor,sid);
 insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at,state,verified_at)
  values(cid,actor,sid,evidence->>'binding',repeat('a',64),repeat('a',64),now()-interval '20 seconds',now()+interval '4 minutes','verified',now()-interval '10 seconds');
 insert into msrc_staff_email.receipts(session_id,actor_id,challenge_id,binding,verified_at)
  values(sid,actor,cid,evidence->>'binding',now()-interval '10 seconds');
end$$;
select pg_temp.owner_claims(14);
set local role authenticated;
select is(public.msrc_staff_profile('synthetic-own-password')->'roles','["finance"]'::jsonb,'Ordinary staff has genuine exact-session strongest email assurance');
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000014')->>'state','denied','Ordinary staff cannot use Super-Admin-only owner password change');
reset role;
select pg_temp.owner_claims(8);
delete from auth.mfa_amr_claims where session_id='f5200000-0000-4000-8000-000000000008' and authentication_method='totp';
select pg_temp.owner_claims(8);
set local role authenticated;
select is(public.msrc_staff_password_change_begin('synthetic-own-password','f5400000-0000-4000-8000-000000000018')->>'state','denied','Password without actual same-session TOTP is denied');
reset role;
select is((select bootstrap_pairing_completed from msrc_staff.policy where singleton),false,'Own password change does not satisfy or bypass initial pairing');
select is((select count(*) from msrc_staff.audit where action='password_change' and result='completed'),3::bigint,'Only exactly completed native operations produce success audits');
select ok(exists(select 1 from msrc_staff.audit where action='password_change' and result='failed'),'Failed operations are immutably audited');
select ok(not exists(select 1 from msrc_staff.audit where action='password_change' and details?|array['password','hash','token','code','secret','email','name']),'No password/TOTP/marker/native payload is audited');
select throws_ok($$delete from msrc_staff.password_changes$$,'55000',null,'Password operation history cannot be deleted');
select throws_ok($$truncate msrc_staff.password_changes$$,'55000',null,'Password operation history cannot be truncated');
select throws_ok($$update msrc_staff.password_changes set state='pending',completed_at=null,native_transaction=null where state='completed'$$,'55000',null,'Completed operation cannot be rearmed');
select * from finish();
rollback;
