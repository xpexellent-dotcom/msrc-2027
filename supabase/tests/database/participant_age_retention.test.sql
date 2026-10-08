-- ORG-041 / AUTH-08. Synthetic disposable fixtures only; all settings/data roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_participant' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),16::bigint,'All participant tables force RLS');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join (values('anon'),('authenticated'),('service_role'),('supabase_auth_admin')) r(name)
 where n.nspname='msrc_participant' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
 'Neither app nor native API credentials can read/forge retention data');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(p.proacl) a
 where n.nspname='msrc_participant' and (a.grantee=0 or (a.grantee in('anon'::regrole,'authenticated'::regrole,'service_role'::regrole,'supabase_auth_admin'::regrole)
  and p.oid<>'msrc_participant.suppress_native_email(jsonb)'::regprocedure))), 'Native suppression is the sole private API function exception');
select ok(not has_function_privilege('service_role','public.msrc_participant_signup_reserve(uuid,uuid,text,text,text)','EXECUTE'),
 'The old RPC cannot manufacture an adult attestation');
select is(msrc_participant.cleanup_unverified(),'{"state":"closed","scanned":0,"eligible":0,"deleted":0,"held":0,"failed":0}'::jsonb,
 'Cleanup is closed, aggregate-only and dry-run by default');
select is((select enabled from msrc_participant.retention_policy),false,'No cleanup activation is seeded');
select is((select unverified_days from msrc_participant.retention_policy),30,'The approved original-account retention clock is thirty days');
select ok(not msrc_participant.unknown_erasure_reference(),'Pinned native/app incoming FK inventory is completely reviewed before cleanup');
select is((select count(*) from cron.job where command like '%cleanup_unverified%'),0::bigint,'The migration installs no active or inactive cron job');
select throws_ok($$select msrc_participant.cleanup_unverified(1001,false)$$,'22023',null,'Oversized batches are rejected');
select throws_ok($$select msrc_participant.cleanup_unverified(0,false)$$,'22023',null,'Zero batches are rejected');
select throws_ok($$select msrc_participant.cleanup_unverified(1,null)$$,'22023',null,'A missing dry-run choice cannot delete');
set local role service_role;
select throws_ok($$select msrc_participant.cleanup_unverified(1,false)$$,'42501',null,'Service credentials cannot run the native worker');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-age-notice',email_daily_limit=1000;
select is(public.msrc_participant_signup_reserve('c9100000-0000-4000-8000-000000000099','c9200000-0000-4000-8000-000000000099',
 'closed-age@example.invalid','Synthetic adult','synthetic-age-notice',true)->>'state','denied','Participant flag cannot bypass an inactive cleanup foundation');
update msrc_participant.retention_policy set enabled=true;
select is(public.msrc_participant_signup_reserve('c9100000-0000-4000-8000-000000000099','c9200000-0000-4000-8000-000000000099',
 'closed-age@example.invalid','Synthetic adult','synthetic-age-notice',false)->>'state','denied','False attestation cannot reserve identity');
select is(public.msrc_participant_signup_reserve('c9100000-0000-4000-8000-000000000099','c9200000-0000-4000-8000-000000000099',
 'closed-age@example.invalid','Synthetic adult','synthetic-age-notice',null)->>'state','denied','NULL cannot be coerced to an adult declaration');

create function pg_temp.age_actor(n integer) returns uuid language sql immutable as $$select ('c9100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;$$;
create function pg_temp.age_admission(n integer) returns uuid language sql immutable as $$select ('c9200000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;$$;
create function pg_temp.age_email(n integer) returns text language sql immutable as $$select 'age-retention-'||n::text||'@example.invalid';$$;
create function pg_temp.age_fixture(n integer,age interval) returns uuid language plpgsql as $$
declare actor uuid:=pg_temp.age_actor(n);admission uuid:=pg_temp.age_admission(n);begin
 if public.msrc_participant_signup_reserve(actor,admission,pg_temp.age_email(n),'Synthetic adult','synthetic-age-notice',true)->>'state'<>'reserved' then
  raise exception 'Synthetic age admission failed';end if;
 insert into auth.users(id,email,encrypted_password,created_at,updated_at,is_anonymous,raw_app_meta_data)
  values(actor,pg_temp.age_email(n),'synthetic-native-hash',clock_timestamp()-age,clock_timestamp(),false,'{"provider":"email","providers":["email"]}');
 return actor;
end$$;
select pg_temp.age_fixture(1,interval '31 days');
select is(msrc_participant.retained_reason(pg_temp.age_actor(1)),null::text,'An ordinary pending native account has no retained-record exception');
select ok(msrc_participant.age_proven(pg_temp.age_actor(1)),'The native profile has a private timestamped strict-true proof');
select ok((select p.age_admission_id=a.id and p.age_attested_at=r.age_attested_at and r.age_confirmed and a.age_confirmed
 from msrc_participant.profiles p join msrc_participant.admissions a on a.actor_id=p.actor_id join msrc_participant.proof_refs r on r.id=a.id
 where p.actor_id=pg_temp.age_actor(1)),'Admission, immutable declaration and profile share the exact actor and reservation');
select ok((select s.native_created_at=u.created_at from msrc_participant.subject_refs s join auth.users u on u.id=s.actor_id where u.id=pg_temp.age_actor(1)),
 'The clock is the first native user origin, not admission or resend time');
select throws_ok($$update msrc_participant.subject_refs set native_created_at=clock_timestamp() where actor_id=pg_temp.age_actor(1)$$,
 '55000',null,'Observed retention origin cannot be extended');
select throws_ok($$update auth.users set created_at=clock_timestamp() where id=pg_temp.age_actor(1)$$,
 '55000',null,'Native origin cannot be backdated or renewed after observation');
select throws_ok($$update msrc_participant.proof_refs set age_confirmed=null,age_attested_at=null where id=pg_temp.age_admission(1)$$,
 '55000',null,'The declaration snapshot is immutable');
select throws_ok($$delete from msrc_participant.proof_refs where id=pg_temp.age_admission(1)$$,
 '55000',null,'The declaration snapshot cannot be removed');
select is(public.msrc_participant_email_begin(pg_temp.age_email(1),'verify_email',gen_random_uuid(),repeat('a',64),repeat('b',64),repeat('c',64),null,'synthetic-age-notice')->>'state',
 'denied','An expired never-verified identity cannot be revived by resend');
select throws_ok($$update auth.users set email_confirmed_at=clock_timestamp() where id=pg_temp.age_actor(1)$$,
 '42501','Participant verification period ended.','Native verification cannot outrun the thirty-day policy even before the worker runs');
select throws_ok($$delete from auth.users where id=pg_temp.age_actor(1)$$,'42501',null,'Native Admin/operator deletion alone is not the authorized cleanup protocol');
select throws_ok($$delete from msrc_participant.profiles where actor_id=pg_temp.age_actor(1)$$,'42501',null,'Profile erasure requires the atomic cleanup transaction');

-- Historical expired credentials are installed only as SQL fixtures, never by
-- extending a production admission/subject clock or bypassing verification.
insert into msrc_participant.challenges(id,actor_id,purpose,recipient,identity_revision,code_hash,email_hash,ip_hash,name,privacy_version,created_at,expires_at,state)
 values('c9300000-0000-4000-8000-000000000001',pg_temp.age_actor(1),'verify_email',pg_temp.age_email(1),1,repeat('a',64),repeat('b',64),repeat('c',64),'Synthetic adult','synthetic-age-notice',
  statement_timestamp()-interval '2 days',statement_timestamp()-interval '2 days'+interval '10 minutes','sent');
create temporary table receipt_snapshot as select to_jsonb(n) value from msrc_participant.notice_receipts n where actor_id=pg_temp.age_actor(1);
create temporary table audit_snapshot as select to_jsonb(a) value from msrc_participant.audit a where actor_id=pg_temp.age_actor(1);
insert into auth.audit_log_entries(id,payload,created_at,ip_address) values('c9400000-0000-4000-8000-000000000001',
 jsonb_build_object('actor_id','00000000-0000-0000-0000-000000000000','actor_username','service_role','action','user_signedup','log_type','team',
  'traits',jsonb_build_object('user_id',pg_temp.age_actor(1),'user_email',pg_temp.age_email(1),'user_phone','','provider','email')),clock_timestamp(),'192.0.2.1');
select is(msrc_participant.cleanup_unverified()->>'eligible','1','Dry-run finds the eligible original account');
select is(msrc_participant.cleanup_unverified()->>'deleted','0','Default dry-run never erases an identity');
select ok(exists(select 1 from auth.users where id=pg_temp.age_actor(1)),'Dry-run leaves the native identity');
select is((select count(*) from msrc_participant.cleanup_jobs),0::bigint,'Dry-run leaves no erasure job');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','1','Explicit enabled worker atomically erases the eligible account');
select ok(not exists(select 1 from auth.users where id=pg_temp.age_actor(1)) and not exists(select 1 from auth.identities where user_id=pg_temp.age_actor(1))
 and not exists(select 1 from msrc_participant.profiles where actor_id=pg_temp.age_actor(1)) and not exists(select 1 from msrc_participant.admissions where actor_id=pg_temp.age_actor(1))
 and not exists(select 1 from msrc_participant.challenges where actor_id=pg_temp.age_actor(1)) and not exists(select 1 from msrc_participant.operations where actor_id=pg_temp.age_actor(1)),
 'Native user and all account name/email/credential/recipient/code rows are absent');
select is((select jsonb_agg(to_jsonb(n)) from msrc_participant.notice_receipts n where actor_id=pg_temp.age_actor(1)),
 (select jsonb_agg(value) from receipt_snapshot),'Immutable consent snapshots are byte-for-byte unchanged');
select is((select jsonb_agg(to_jsonb(a)) from msrc_participant.audit a where actor_id=pg_temp.age_actor(1)),
 (select jsonb_agg(value) from audit_snapshot),'Immutable participant audit snapshots are unchanged');
select ok((select erased_at is not null and not ever_verified and erase_job is not null from msrc_participant.subject_refs where actor_id=pg_temp.age_actor(1)),
 'A minimal no-email no-code durable actor tombstone survives');
select is((select state from msrc_participant.cleanup_jobs where actor_id=pg_temp.age_actor(1)),'completed','Only a committed atomic deletion records completed');
select is((select count(*) from msrc_participant.retention_audit where actor_id=pg_temp.age_actor(1) and event='account.erased'),1::bigint,'Erasure records an immutable safe lifecycle event');
select ok((select payload::jsonb ? 'account_erased' and not (payload::jsonb ?|array['actor_username','actor_name'])
 and payload::jsonb#>>'{traits,user_email}' is null and ip_address='' from auth.audit_log_entries where id='c9400000-0000-4000-8000-000000000001'),
 'Native lifecycle audit keeps UUID/action/time without the erased email/name/IP');
select throws_ok($$update auth.audit_log_entries set payload=payload::jsonb||'{"actor_username":"restored@example.invalid"}'
 where id='c9400000-0000-4000-8000-000000000001'$$,'55000',null,'A late native audit update cannot restore account PII');
insert into auth.audit_log_entries(id,payload,created_at,ip_address) values('c9400000-0000-4000-8000-000000000002',
 jsonb_build_object('actor_id',pg_temp.age_actor(1),'actor_username',pg_temp.age_email(1),'action','user_confirmation_requested','log_type','user'),clock_timestamp(),'192.0.2.1');
select ok((select payload::jsonb ? 'account_erased' and not(payload::jsonb ? 'actor_username') and ip_address='' from auth.audit_log_entries where id='c9400000-0000-4000-8000-000000000002'),
 'A late audit insert cannot recreate erased personal data');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Worker replay performs no second erasure');
select is(public.msrc_participant_signup_reserve(pg_temp.age_actor(1),gen_random_uuid(),pg_temp.age_email(1),'Synthetic adult','synthetic-age-notice',true)->>'state',
 'denied','An erased actor cannot be reserved again');
select throws_ok($$insert into auth.users(id,email,created_at,updated_at,is_anonymous) values(pg_temp.age_actor(1),pg_temp.age_email(1),now(),now(),false)$$,
 '42501','Erased identity cannot be restored.','Even a native restore/insert cannot reintroduce a tombstoned actor');
select throws_ok($$update msrc_participant.subject_refs set erased_at=null,erase_job=null where actor_id=pg_temp.age_actor(1)$$,
 '55000',null,'A tombstone is irreversible');
select throws_ok($$update msrc_participant.cleanup_jobs set state='failed' where actor_id=pg_temp.age_actor(1)$$,
 '55000',null,'Completed erasure evidence cannot be rewritten');
select throws_ok($$delete from msrc_participant.retention_audit where actor_id=pg_temp.age_actor(1)$$,
 '55000',null,'Erasure audit cannot be deleted');

-- A populated unknown CASCADE FK must hold rather than silently delete a future
-- operational record. Removing the synthetic table allows the reviewed worker.
select pg_temp.age_fixture(2,interval '31 days');
create schema retention_fixture;
create table retention_fixture.future_operational_record(id integer primary key,actor uuid references auth.users(id) on delete cascade);
insert into retention_fixture.future_operational_record values(1,pg_temp.age_actor(2));
select is(msrc_participant.retained_reason(pg_temp.age_actor(2)),'unreviewed_foreign_key','Unknown cascading references fail closed before erasure');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Unknown cascades cannot delete/unlink operational records');
select is((select count(*) from retention_fixture.future_operational_record),1::bigint,'The future operational row is retained');
drop table retention_fixture.future_operational_record;
alter table msrc_participant.challenges add column future_retained_actor uuid references auth.users(id) on delete cascade;
select ok(msrc_participant.unknown_erasure_reference(),'A new FK column inside an otherwise known table also needs review');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Known table names cannot bypass retention for new cascading relationships');
alter table msrc_participant.challenges drop column future_retained_actor;

-- A genuine row-delete failure rolls back *all* PII erasure/native audit edits
-- for that actor while recording only bounded SQLSTATE and reason evidence.
create function pg_temp.reject_age_profile_delete() returns trigger language plpgsql as $$begin raise exception using errcode='55000',message='Synthetic erasure failure';end$$;
create trigger zz_synthetic_retention_failure before delete on msrc_participant.profiles for each row execute function pg_temp.reject_age_profile_delete();
select is(msrc_participant.cleanup_unverified(100,false)->>'failed','1','An actor erasure failure is terminal and observable');
select ok(exists(select 1 from auth.users where id=pg_temp.age_actor(2)) and exists(select 1 from msrc_participant.profiles where actor_id=pg_temp.age_actor(2))
 and exists(select 1 from msrc_participant.admissions where actor_id=pg_temp.age_actor(2)) and not exists(select 1 from msrc_participant.subject_refs where actor_id=pg_temp.age_actor(2) and erased_at is not null),
 'Failure restores the whole native/private account and leaves no tombstone');
select is((select state from msrc_participant.cleanup_jobs where actor_id=pg_temp.age_actor(2)),'failed','Failed actor has no completed erasure claim');
select is((select sqlstate from msrc_participant.cleanup_jobs where actor_id=pg_temp.age_actor(2)),'55000','The job exposes only allowlisted SQLSTATE, never exception text');
drop trigger zz_synthetic_retention_failure on msrc_participant.profiles;
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','1','A fresh authorized retry completes without replaying partial deletion');

select pg_temp.age_fixture(3,interval '29 days');
select pg_temp.age_fixture(4,interval '30 days');
select ok(msrc_participant.within_verification_window(pg_temp.age_actor(3)),'Twenty-nine-day origin still permits mailbox proof');
select ok(not msrc_participant.within_verification_window(pg_temp.age_actor(4)),'The exact thirty-day boundary is expired');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','1','Only the thirty-day boundary account is erased');
select ok(exists(select 1 from auth.users where id=pg_temp.age_actor(3)),'The younger never-verified actor is retained');

-- Native historical verified accounts, including an interrupted pending
-- profile, are not age-reclassified and never enter unverified cleanup.
insert into auth.users(id,email,encrypted_password,email_confirmed_at,created_at,updated_at,is_anonymous) values
 (pg_temp.age_actor(5),pg_temp.age_email(5),'synthetic-historical-hash',now()-interval '30 days',now()-interval '31 days',now(),false),
 (pg_temp.age_actor(6),pg_temp.age_email(6),'synthetic-historical-hash',now()-interval '30 days',now()-interval '31 days',now(),false);
insert into msrc_participant.profiles(actor_id,name,privacy_version,state) values
 (pg_temp.age_actor(5),'Historical verified','synthetic-age-notice','verified'),(pg_temp.age_actor(6),'Historical interrupted','synthetic-age-notice','pending');
select ok((select bool_and(ever_verified) from msrc_participant.subject_refs where actor_id in(pg_temp.age_actor(5),pg_temp.age_actor(6))),
 'Historical native confirmation permanently records ever-verified, including interruption');
select ok(not msrc_participant.age_proven(pg_temp.age_actor(5)),'Legacy missing declaration never implies approved age');
select ok(not msrc_participant.context_admitted(pg_temp.age_actor(5)),'Legacy unknown-age account cannot use generic persisted application context');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Verified and native-confirmed interrupted actors are never eligible');
select throws_ok($$update msrc_participant.subject_refs set ever_verified=false where actor_id=pg_temp.age_actor(5)$$,'55000',null,
 'Email verification cannot be forgotten for later deletion');

select pg_temp.age_fixture(7,interval '31 days');
insert into msrc_participant.retention_holds(actor_id,reason) values(pg_temp.age_actor(7),'legal');
select is(msrc_participant.retained_reason(pg_temp.age_actor(7)),'explicit_hold','An explicit retained legal/security/operational/support hold excludes erasure');
select pg_temp.age_fixture(8,interval '31 days');
insert into msrc_authorization.edition_config(edition_key) values('synthetic-age-retention-2027');
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 values(pg_temp.age_actor(8),'synthetic-age-retention-2027','participant','edition','Synthetic retained role');
select is(msrc_participant.retained_reason(pg_temp.age_actor(8)),'authority_history','Even a participant role indicates retained operational authority');
update msrc_authorization.role_grants set state='revoked',revocation_reason='Synthetic retention' where actor_id=pg_temp.age_actor(8);
select is(msrc_participant.retained_reason(pg_temp.age_actor(8)),'authority_history','Revoking a role cannot erase immutable operational history');
select pg_temp.age_fixture(9,interval '31 days');
insert into msrc_sessions.security_audit(actor_id,event,performed_by_db_role) values(pg_temp.age_actor(9),'session.observed','postgres');
select is(msrc_participant.retained_reason(pg_temp.age_actor(9)),'security_history','Retained session security evidence excludes deletion');
select pg_temp.age_fixture(10,interval '31 days');
insert into auth.audit_log_entries(id,payload,created_at,ip_address) values(gen_random_uuid(),
 jsonb_build_object('actor_id',pg_temp.age_actor(10),'actor_username',pg_temp.age_email(10),'action','login','log_type','account'),now(),'192.0.2.1');
select is(msrc_participant.retained_reason(pg_temp.age_actor(10)),'native_security_history','Native security audit is held rather than silently erased');
select pg_temp.age_fixture(11,interval '31 days');
insert into auth.audit_log_entries(id,payload,created_at,ip_address) values(gen_random_uuid(),
 jsonb_build_object('actor_id',pg_temp.age_actor(5),'actor_username',pg_temp.age_email(5),'action','user_signedup','log_type','team',
 'traits',jsonb_build_object('user_id',pg_temp.age_actor(11),'user_email',pg_temp.age_email(11))),now(),'192.0.2.1');
select is(msrc_participant.retained_reason(pg_temp.age_actor(11)),'native_security_history','Mixed-actor native evidence cannot be redacted as the target account');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Explicit, role, session, native-security and mixed-actor holds retain every identity');
select ok((select count(*)=5 from auth.users where id in(pg_temp.age_actor(7),pg_temp.age_actor(8),pg_temp.age_actor(9),pg_temp.age_actor(10),pg_temp.age_actor(11))),
 'All retained accounts still exist');

-- These jobs intentionally exclude native Storage initialization. Its optional
-- relation is recreated only as a rollback-only synthetic provider fixture;
-- the worker itself never creates/transfers/deletes Storage objects.
select ok(to_regclass('storage.objects') is null,'An Auth-only native stack needs no Storage schema to evaluate cleanup');
create schema if not exists storage;
create table storage.objects(id uuid primary key,owner uuid,owner_id text);
select pg_temp.age_fixture(12,interval '31 days');
insert into storage.objects values('c9500000-0000-4000-8000-000000000012',pg_temp.age_actor(12),null);
select is(msrc_participant.retained_reason(pg_temp.age_actor(12)),'storage_owner','The installed Storage owner UUID holds the account');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','An owned object prevents native user deletion');
update storage.objects set owner=null,owner_id=pg_temp.age_actor(12)::text;
select is(msrc_participant.retained_reason(pg_temp.age_actor(12)),'storage_owner','The current Storage text owner_id also holds the account');
alter table storage.objects drop column owner;
select throws_ok($$select msrc_participant.cleanup_unverified(100,false)$$,'42703',null,
 'An unreviewed Storage shape aborts cleanup rather than bypassing the ownership rule');
select ok(exists(select 1 from auth.users where id=pg_temp.age_actor(12)) and exists(select 1 from msrc_participant.profiles where actor_id=pg_temp.age_actor(12))
 and not exists(select 1 from msrc_participant.subject_refs where actor_id=pg_temp.age_actor(12) and erased_at is not null),
 'Unknown-provider-shape failure rolls back without any account erasure');
drop table storage.objects;
select is(msrc_participant.retained_reason(pg_temp.age_actor(12)),null::text,'Absent optional Storage cannot own objects');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','1','The same original unverified actor is eligible after the synthetic optional relation is removed');

-- These are real pinned native tables, not an empty-table allowlist exemption.
-- Any target-owned passkey/provisioning/recovery row must remain attached even
-- when the provider FK would otherwise CASCADE or SET NULL on native deletion.
select pg_temp.age_fixture(13,interval '31 days');
insert into auth.webauthn_credentials(id,user_id,credential_id,public_key) values
 ('c9700000-0000-4000-8000-000000000013',pg_temp.age_actor(13),decode('cafe0013','hex'),decode('cafe1013','hex'));
select ok(msrc_participant.retained_native_identity(pg_temp.age_actor(13)),'A target-owned native passkey credential is a retained identity');
select is(msrc_participant.retained_reason(pg_temp.age_actor(13)),'native_identity','Passkey credentials hold unverified cleanup');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Native passkey CASCADE cannot erase the owning account');
select ok(exists(select 1 from auth.users where id=pg_temp.age_actor(13)) and exists(select 1 from auth.webauthn_credentials
 where id='c9700000-0000-4000-8000-000000000013' and user_id=pg_temp.age_actor(13)), 'The passkey record and account remain attached');

select pg_temp.age_fixture(14,interval '31 days');
insert into auth.webauthn_challenges(id,user_id,challenge_type,session_data,expires_at) values
 ('c9700000-0000-4000-8000-000000000014',pg_temp.age_actor(14),'registration','{"synthetic":true}',statement_timestamp()+interval '1 minute');
select ok(msrc_participant.retained_native_identity(pg_temp.age_actor(14)),'A target-owned native passkey challenge is retained');
select is(msrc_participant.retained_reason(pg_temp.age_actor(14)),'native_identity','Passkey challenges hold unverified cleanup');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Native challenge CASCADE cannot erase the owning account');
select ok(exists(select 1 from auth.users where id=pg_temp.age_actor(14)) and exists(select 1 from auth.webauthn_challenges
 where id='c9700000-0000-4000-8000-000000000014' and user_id=pg_temp.age_actor(14)), 'The native challenge record and account remain attached');

select pg_temp.age_fixture(15,interval '31 days');
insert into auth.sso_providers(id,resource_id,created_at,updated_at,disabled) values
 ('c9700000-0000-4000-8000-000000000015','synthetic-retention-scim',statement_timestamp(),statement_timestamp(),true);
insert into auth.scim_users(id,sso_provider_id,user_id,resource) values
 ('c9800000-0000-4000-8000-000000000015','c9700000-0000-4000-8000-000000000015',pg_temp.age_actor(15),'{"userName":"synthetic-retention-scim","active":false}');
select ok(msrc_participant.retained_native_identity(pg_temp.age_actor(15)),'A target-owned native provisioning document is retained');
select is(msrc_participant.retained_reason(pg_temp.age_actor(15)),'native_identity','Inactive provisioning references still hold cleanup');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Native provisioning SET NULL cannot unlink retained operational identity');
select ok(exists(select 1 from auth.users where id=pg_temp.age_actor(15)) and exists(select 1 from auth.scim_users
 where id='c9800000-0000-4000-8000-000000000015' and user_id=pg_temp.age_actor(15)), 'The provisioning document and account remain attached');

-- Historical native maintenance observed only after these initial rows exist;
-- no immutable origin/profile/age proof is changed and no native guard disabled.
insert into auth.users(id,email,encrypted_password,created_at,updated_at,is_anonymous) values
 (pg_temp.age_actor(16),pg_temp.age_email(16),'synthetic-historical-hash',statement_timestamp()-interval '31 days',statement_timestamp(),false);
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at) values
 ('c9700000-0000-4000-8000-000000000016',pg_temp.age_actor(16),'totp','verified',statement_timestamp(),statement_timestamp());
insert into auth.mfa_recovery_code_sets(id,user_id,mfa_factor_id) values
 ('c9800000-0000-4000-8000-000000000016',pg_temp.age_actor(16),'c9700000-0000-4000-8000-000000000016');
insert into msrc_participant.profiles(actor_id,name,privacy_version,state) values
 (pg_temp.age_actor(16),'Synthetic historical native recovery','synthetic-age-notice','pending');
select ok(msrc_participant.retained_native_identity(pg_temp.age_actor(16)),'The native recovery set is independently detected as retained identity');
select is(msrc_participant.retained_reason(pg_temp.age_actor(16)),'native_identity','Historical native factor/recovery data remains a cleanup hold');
select is(msrc_participant.cleanup_unverified(100,false)->>'deleted','0','Native recovery-code CASCADE cannot erase the owning account');
select ok(exists(select 1 from auth.users where id=pg_temp.age_actor(16)) and exists(select 1 from auth.mfa_recovery_code_sets
 where id='c9800000-0000-4000-8000-000000000016' and user_id=pg_temp.age_actor(16)), 'The recovery-set record and account remain attached');
update msrc_participant.retention_policy set enabled=false;
select ok(not msrc_participant.ready(),'Independent cleanup closure closes database admission too');
select is(msrc_participant.cleanup_unverified(100,false)->>'state','closed','Closing cleanup does not mutate held identities');
select set_config('request.jwt.claims','{"sub":"malformed-user","role":"authenticated","session_id":"c9600000-0000-4000-8000-000000000001"}',true);
select is(public.msrc_session_context('synthetic-age-retention-2027'),null::jsonb,'Malformed native subject cannot produce a session context or exception');
select is(public.msrc_session_activity('synthetic-age-retention-2027'),null::jsonb,'Malformed native subject cannot produce an activity context');
select is(public.msrc_access_context('synthetic-age-retention-2027'),null::jsonb,'Malformed native subject cannot bypass the persisted authority perimeter');
select is(public.msrc_read_access_context('synthetic-age-retention-2027'),null::jsonb,'Malformed native subject cannot produce read authorization');
select is(msrc_sessions.observe_context('synthetic-age-retention-2027'),null::jsonb,'The private stable observer keeps fail-closed UUID parsing');
select is(public.msrc_participant_profile('synthetic-age-retention-2027'),null::jsonb,'Malformed native subject cannot reveal a participant profile');
select * from finish();
rollback;
