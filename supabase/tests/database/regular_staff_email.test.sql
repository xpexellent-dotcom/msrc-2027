-- Isolated CI only. Every identity, challenge, receipt, fixture policy and audit rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select has_schema('msrc_staff_email','Application email evidence lives in a private schema');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='msrc_staff_email' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),
  4::bigint,'All email evidence tables force RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
  where has_schema_privilege(r.name,'msrc_staff_email','USAGE')),'API roles have no private schema access');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
  cross join (values('challenges'),('receipts'),('audit'),('identity_revision')) t(name)
  where has_table_privilege(r.name,'msrc_staff_email.'||t.name,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
  'No API role has direct email evidence table grants');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join lateral aclexplode(p.proacl) a where n.nspname='msrc_staff_email' and a.grantee=0),
  'Private helpers have no PUBLIC execution');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
  where has_function_privilege(r.name,'msrc_staff_email.identity_changed()','EXECUTE')),
  'No API role can invoke the relevant identity transition helper');
select is((select count(*) from msrc_staff_email.challenges),0::bigint,'Migration installs no challenge fixtures');
select is((select count(*) from msrc_staff_email.receipts),0::bigint,'Migration installs no receipts');
select is((select count(*) from msrc_staff_email.audit),0::bigint,'Migration installs no audit rows');

insert into auth.users(id,email,email_confirmed_at,phone,phone_confirmed_at,created_at,updated_at,is_anonymous) values
 ('81000000-0000-4000-8000-000000000001','email-staff-one@example.invalid',now()-interval '1 day',null,null,now()-interval '1 day',now()-interval '1 day',false),
 ('81000000-0000-4000-8000-000000000002','email-staff-two@example.invalid',now()-interval '1 day',null,null,now()-interval '1 day',now()-interval '1 day',false),
 ('81000000-0000-4000-8000-000000000003','email-participant@example.invalid',now()-interval '1 day','+15550008103',now()-interval '1 day',now()-interval '1 day',now()-interval '1 day',false);
insert into msrc_authorization.edition_config(edition_key) values('synthetic-email-2027'),('synthetic-email-other');
insert into msrc_authorization.account_access(actor_id,state,individually_identified) values
 ('81000000-0000-4000-8000-000000000001','active',true),
 ('81000000-0000-4000-8000-000000000002','active',true),
 ('81000000-0000-4000-8000-000000000003','active',true);
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason) values
 ('81000000-0000-4000-8000-000000000001','synthetic-email-2027','contentMediaEditor','edition','Synthetic email test'),
 ('81000000-0000-4000-8000-000000000002','synthetic-email-2027','checkInStaff','edition','Synthetic email test'),
 ('81000000-0000-4000-8000-000000000003','synthetic-email-2027','participant','edition','Synthetic email test');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
 ('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001',now()-interval '1 minute',now(),'aal1'),
 ('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000002',now()-interval '1 minute',now(),'aal1'),
 ('82000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000003',now()-interval '1 minute',now(),'aal1'),
 ('82000000-0000-4000-8000-000000000004','81000000-0000-4000-8000-000000000001',now()-interval '1 minute',now(),'aal1');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
  select gen_random_uuid(),s.id,'password',now()-interval '50 seconds',now()-interval '50 seconds'
  from auth.sessions s where s.id::text like '82000000-%';

create function pg_temp.email_claims(actor text default '81000000-0000-4000-8000-000000000001',
  sid text default '82000000-0000-4000-8000-000000000001') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sid,
    'aal','aal1','exp',floor(extract(epoch from now()+interval '1 hour')),
    'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',
      (select floor(extract(epoch from max(a.updated_at::timestamptz))) from auth.mfa_amr_claims a
        where a.session_id::text=sid and a.authentication_method='password'))))::text,true);
end; $$;
create function pg_temp.email_issue(sid text default '82000000-0000-4000-8000-000000000001',
  challenge text default '83000000-0000-4000-8000-000000000001') returns jsonb language sql as $$
  select public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000001',sid::uuid,challenge::uuid,repeat('a',64),repeat('b',64));
$$;
create function pg_temp.email_consume(challenge text default '83000000-0000-4000-8000-000000000001',
  supplied_hash text default repeat('a',64)) returns jsonb language sql as $$
  select public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',challenge::uuid,supplied_hash);
$$;

set local role anon;
select throws_ok($$select pg_temp.email_issue()$$,'42501',null,'Anonymous cannot issue application checks');
select throws_ok($$select public.msrc_second_step_satisfied()$$,'42501',null,'Anonymous cannot call private-evidence predicate');
reset role;
do $$begin perform pg_temp.email_claims(); end$$;
set local role authenticated;
select throws_ok($$select pg_temp.email_issue()$$,'42501',null,'Password-only client cannot issue service evidence');
select throws_ok($$select pg_temp.email_consume()$$,'42501',null,'Client cannot approve its own receipt');
select throws_ok($$select public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001',true)$$,
  '42501',null,'Client cannot claim that email was sent');
select is(public.msrc_session_context('synthetic-email-2027')->>'reason','staff_email_check_required','Password alone denies regular staff');
select is(public.msrc_session_context('synthetic-email-other')->>'authenticationTier','staff','A different edition cannot downgrade staff');
select is(public.msrc_second_step_satisfied(),false,'Password-only direct RLS predicate denies');
reset role;

-- A protected synthetic table models the same predicate future feature and Storage RLS must use.
create table public.synthetic_email_rls(owner_id uuid not null,payload text not null);
insert into public.synthetic_email_rls values('81000000-0000-4000-8000-000000000001','Synthetic protected row');
alter table public.synthetic_email_rls enable row level security;
alter table public.synthetic_email_rls force row level security;
grant select on public.synthetic_email_rls to authenticated;
create policy fixture_owner on public.synthetic_email_rls for select to authenticated using(owner_id=(select auth.uid()));
create policy fixture_check on public.synthetic_email_rls as restrictive for select to authenticated
  using((select public.msrc_second_step_satisfied()));
set local role authenticated;
select is((select count(*) from public.synthetic_email_rls),0::bigint,'Direct database password token sees no protected row');
reset role;
set local role service_role;
select throws_ok($$select count(*) from msrc_staff_email.challenges$$,'42501',null,'Service role cannot read hashed code rows');
select throws_ok($$select count(*) from msrc_staff_email.identity_revision$$,'42501',null,'Service role cannot read or forge the relevant identity revision');
select is(pg_temp.email_issue()->>'recipient','email-staff-one@example.invalid','Service issue derives current verified recipient from Auth');
select is(pg_temp.email_consume()->>'code','challenge_required','No receipt before confirmed delivery');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001',true)->>'state',
  'ok','Trusted delivery records only a sent challenge');
select is(public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','83000000-0000-4000-8000-000000000001',repeat('a',64))->>'code',
  'challenge_required','Another actor/session cannot consume the challenge');
select is(public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000001',repeat('a',64))->>'code',
  'challenge_required','Another session of the same actor cannot consume the challenge');
select is(pg_temp.email_consume(supplied_hash=>repeat('c',64))->>'code','invalid_code','Incorrect keyed hash fails');
reset role;
alter table msrc_staff_email.audit add constraint synthetic_email_audit_failure check (event <> 'receipt.created') not valid;
set local role service_role;
select throws_ok($$select pg_temp.email_consume()$$,'23514',null,'Audit failure denies receipt and rolls back code consumption');
reset role;
select is((select state from msrc_staff_email.challenges where id='83000000-0000-4000-8000-000000000001'),'sent','Audit failure leaves the challenge unconsumed');
select is((select count(*) from msrc_staff_email.receipts),0::bigint,'Audit failure installs no approval');
alter table msrc_staff_email.audit drop constraint synthetic_email_audit_failure;
set local role service_role;
select is(pg_temp.email_consume()->>'state','verified','Exact server proof consumes once and creates receipt');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001',false)->>'state','denied','A consumed receipt cannot be cancelled as a delivery failure');
select is(pg_temp.email_consume()->>'code','challenge_required','Consumed challenge cannot replay');
select is(pg_temp.email_issue(challenge=>'83000000-0000-4000-8000-000000000099')->>'code','already_verified','An assured session does not repeatedly send email');
reset role;
select is((select failed_attempts from msrc_staff_email.challenges where id='83000000-0000-4000-8000-000000000001'),1,'Denied attempt committed instead of rolling back');
select is((select state from msrc_staff_email.challenges where id='83000000-0000-4000-8000-000000000001'),
  'verified','Delivery cancellation cannot rewrite already verified evidence');
set local role authenticated;
select ok(public.msrc_session_context('synthetic-email-2027') @>
  '{"authenticationTier":"staff","staffEmailValid":true,"mfaValid":false,"sessionPolicySatisfied":true,"operationalAccessReady":false,"privilegedAccessReady":false}'::jsonb,
  'Application email receipt permits closed policy at native AAL1');
select is(public.msrc_access_context('synthetic-email-2027')#>>'{actor,session,assurance}','aal1','Application email proof never becomes Supabase AAL2');
select is(public.msrc_access_context('synthetic-email-2027')#>>'{actor,session,staffEmailVerified}','true','Own context describes separate application proof');
select is((select count(*) from public.synthetic_email_rls),1::bigint,'Valid receipt enables only the synthetic owner RLS fixture');
reset role;

-- Model a committed delivery acknowledgement that was lost before the trusted server received it.
-- Cancellation must close the sent challenge; no client or raw OTP is involved.
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000090',repeat('a',64),repeat('b',64))->>'state','issued','Lost-ack regression reserves isolated staff evidence');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000090',true)->>'state','ok','Success acknowledgement may commit before transport fails');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000090',false)->>'state','ok','Trusted failure recovery cancels sent evidence after an uncertain acknowledgement');
select is(public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000090',repeat('a',64))->>'code','challenge_required','Cancelled sent evidence cannot produce a receipt');
reset role;
select is((select count(*) from msrc_staff_email.receipts where actor_id='81000000-0000-4000-8000-000000000002'),
  0::bigint,'Lost-ack recovery installs no approval');
-- Clock acceleration keeps this regression independent of the later exact quota fixtures.
update msrc_staff_email.challenges set created_at=now()-interval '25 hours',expires_at=now()-interval '1495 minutes'
  where id='83000000-0000-4000-8000-000000000090';

-- Refresh preserves the same session and user/password/grant versions.
update auth.sessions set updated_at=now(),refreshed_at=now() where id='82000000-0000-4000-8000-000000000001';
create temporary table synthetic_revision_before as select revision from msrc_staff_email.identity_revision
  where actor_id='81000000-0000-4000-8000-000000000001';
update auth.users set updated_at=clock_timestamp(),last_sign_in_at=clock_timestamp(),
  raw_user_meta_data='{"synthetic_display":"fixture"}' where id='81000000-0000-4000-8000-000000000001';
select is((select revision from msrc_staff_email.identity_revision where actor_id='81000000-0000-4000-8000-000000000001'),
  (select revision from synthetic_revision_before),'Native refresh/sign-in/metadata timestamps do not rotate relevant proof');
update auth.users set email=email,email_confirmed_at=email_confirmed_at,encrypted_password=encrypted_password
  where id='81000000-0000-4000-8000-000000000001';
select is((select revision from msrc_staff_email.identity_revision where actor_id='81000000-0000-4000-8000-000000000001'),
  (select revision from synthetic_revision_before),'Updating relevant columns without changing their values preserves revision');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),true,'Refresh metadata cannot erase or extend exact-session receipt');
reset role;
do $$begin perform pg_temp.email_claims(sid=>'82000000-0000-4000-8000-000000000004'); end$$;
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'A fresh password session must perform its own email check');
reset role;
update auth.users set updated_at=clock_timestamp(),last_sign_in_at=clock_timestamp()
  where id='81000000-0000-4000-8000-000000000001';
do $$begin perform pg_temp.email_claims(); end$$;
set local role authenticated;
select is(public.msrc_second_step_satisfied(),true,'Another session sign-in timestamp cannot revoke an existing successful session');
reset role;

-- Native profile/email version prevents change-away/back from resurrecting proof.
update auth.users set email='changed-staff@example.invalid',updated_at=now() where id='81000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Current managed email change revokes proof');
reset role;
update auth.users set email='email-staff-one@example.invalid',updated_at=now()+interval '1 microsecond' where id='81000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Changing email back cannot restore a prior version');
reset role;
select is((select revision from msrc_staff_email.identity_revision where actor_id='81000000-0000-4000-8000-000000000001'),
  (select revision+2 from synthetic_revision_before),'Relevant revision records both email changes even when the original value is restored');

-- Synthetic fixture clock changes only; ordinary API roles have no table access.
update msrc_staff_email.challenges set created_at=now()-interval '2 minutes'
  where actor_id='81000000-0000-4000-8000-000000000001';
set local role service_role;
select is(pg_temp.email_issue(challenge=>'83000000-0000-4000-8000-000000000002')->>'state','issued','Changed managed version needs a new server-bound challenge');
select is(pg_temp.email_issue(challenge=>'83000000-0000-4000-8000-000000000003')->>'code','retry_limited','Account resend waits 60 seconds');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000002',false)->>'state',
  'ok','Transport failure records failed delivery');
select is(pg_temp.email_consume(challenge=>'83000000-0000-4000-8000-000000000002')->>'code','challenge_required','Failed email cannot create receipt');
reset role;
update msrc_staff_email.challenges set created_at=now()-interval '2 minutes' where id='83000000-0000-4000-8000-000000000002';
set local role service_role;
select is(pg_temp.email_issue(challenge=>'83000000-0000-4000-8000-000000000003')->>'state','issued','Delivery retry remains possible within account cap');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000003',true)->>'state','ok','Retry has its own confirmed delivery');
reset role;
update msrc_staff_email.challenges set created_at=now()-interval '2 minutes' where id='83000000-0000-4000-8000-000000000003';
set local role service_role;
select is(pg_temp.email_issue(challenge=>'83000000-0000-4000-8000-000000000010')->>'code','retry_limited','Three account reservations per 15 minutes deny a fourth even after resend wait');
reset role;
update msrc_staff_email.challenges set created_at=now()-interval '20 minutes',expires_at=now()+interval '4 minutes'
  where actor_id='81000000-0000-4000-8000-000000000001';
set local role service_role;
select is(pg_temp.email_issue(challenge=>'83000000-0000-4000-8000-000000000004')->>'state','issued','A resend replaces an outstanding challenge');
select is(pg_temp.email_consume(challenge=>'83000000-0000-4000-8000-000000000003')->>'code','challenge_required','Replaced challenge is denied even with its correct hash');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000004',true)->>'state','ok','Replacement becomes sent');
select is(pg_temp.email_consume(challenge=>'83000000-0000-4000-8000-000000000004',supplied_hash=>repeat('c',64))->>'code','invalid_code','Failed attempt one denies');
select is(pg_temp.email_consume(challenge=>'83000000-0000-4000-8000-000000000004',supplied_hash=>repeat('c',64))->>'code','invalid_code','Failed attempt two denies');
select is(pg_temp.email_consume(challenge=>'83000000-0000-4000-8000-000000000004',supplied_hash=>repeat('c',64))->>'code','invalid_code','Failed attempt three denies');
select is(pg_temp.email_consume(challenge=>'83000000-0000-4000-8000-000000000004',supplied_hash=>repeat('c',64))->>'code','invalid_code','Failed attempt four denies');
select is(pg_temp.email_consume(challenge=>'83000000-0000-4000-8000-000000000004',supplied_hash=>repeat('c',64))->>'code','retry_limited','Fifth failure locks and starts 15-minute account cooldown');
select is(pg_temp.email_consume(challenge=>'83000000-0000-4000-8000-000000000004')->>'code','retry_limited','Correct code cannot bypass active cooldown');
select is(pg_temp.email_issue(sid=>'82000000-0000-4000-8000-000000000004',challenge=>'83000000-0000-4000-8000-000000000005')->>'code','retry_limited','New password session cannot evade account cooldown');
reset role;

-- Role promotion overrides email proof across editions; role changes cannot revive it.
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
  values('81000000-0000-4000-8000-000000000001','synthetic-email-other','superAdmin','edition','Synthetic cross-edition promotion');
set local role authenticated;
select is(public.msrc_session_context('synthetic-email-2027')->>'authenticationTier','super_admin','Strongest Super Admin role in another edition dominates');
select is(public.msrc_session_context('synthetic-email-2027')->>'reason','mfa_required','Email proof cannot satisfy Super Admin SMS MFA');
select is(public.msrc_second_step_satisfied(),false,'Cross-edition Super Admin AAL1 fails direct RLS predicate');
reset role;
set local role service_role;
select is(pg_temp.email_issue(challenge=>'83000000-0000-4000-8000-000000000006')->>'code','ineligible','Super Admin cannot issue the weaker email path');
reset role;
update msrc_authorization.role_grants set state='revoked',revoked_at=now(),revocation_reason='Synthetic demotion'
  where actor_id='81000000-0000-4000-8000-000000000001' and role_name='superAdmin' and state='active';
select is(msrc_staff_email.valid_receipt('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001'),false,
  'Removing Super Admin role does not revive an earlier grant-version receipt');

-- Fixed trusted counter fixtures exercise shared account/day and IP/hour bounds.
insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at,state)
  select gen_random_uuid(),'81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
    repeat('d',64),repeat('a',64),repeat('e',64),now()-interval '2 hours',now()-interval '115 minutes','failed'
  from generate_series(1,10);
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000011',repeat('a',64),repeat('b',64))->>'code','retry_limited','Ten per-account reservations per rolling day deny an eleventh');
reset role;
update msrc_staff_email.challenges set created_at=now()-interval '25 hours',expires_at=now()-interval '1495 minutes'
  where actor_id='81000000-0000-4000-8000-000000000002';
insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at,state)
  select gen_random_uuid(),'81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',
    repeat('d',64),repeat('a',64),repeat('9',64),now()-interval '2 minutes',now()+interval '3 minutes','failed'
  from generate_series(1,20);
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000011',repeat('a',64),repeat('9',64))->>'code','retry_limited','Shared IP cap denies another actor without its own recent issues');
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000012',repeat('a',64),repeat('b',64))->>'state','issued','An eligible uncapped account/IP reserves its own challenge');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000012',true)->>'state','ok','Second staff delivery records sent');
reset role;
update msrc_staff_email.challenges set created_at=now()-interval '6 minutes',expires_at=now()-interval '1 minute'
  where id='83000000-0000-4000-8000-000000000012';
set local role service_role;
select is(public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000012',repeat('a',64))->>'code','challenge_expired','Expired email check denies even a correct digest');
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000013',repeat('a',64),repeat('b',64))->>'state','issued','Expiry permits a bounded fresh attempt');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000013',true)->>'state','ok','Fresh attempt delivery succeeds');
select is(public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000013',repeat('a',64))->>'state','verified','Second regular staff gets an exact-session receipt');
reset role;
do $$begin perform pg_temp.email_claims('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002'); end$$;
set local role authenticated;
select is(public.msrc_second_step_satisfied(),true,'Second staff current proof passes');
reset role;
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
  values('81000000-0000-4000-8000-000000000002','synthetic-email-other','sponsorshipPr','edition','Synthetic regular-staff role change');
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'New regular-staff grant invalidates an existing receipt');
reset role;
update msrc_authorization.role_grants set state='revoked',revoked_at=now(),revocation_reason='Synthetic role revocation'
  where actor_id='81000000-0000-4000-8000-000000000002' and role_name='sponsorshipPr' and state='active';
set local role authenticated;
select is(public.msrc_second_step_satisfied(),false,'Grant removal cannot restore an older grant-version receipt');
select is(public.msrc_session_logout('synthetic-email-2027'),true,'Existing logout revokes custom email session');
select is(public.msrc_second_step_satisfied(),false,'Logout cannot reuse a verified email receipt');
reset role;
update msrc_authorization.account_access set state='suspended' where actor_id='81000000-0000-4000-8000-000000000002';
update msrc_authorization.account_access set state='active' where actor_id='81000000-0000-4000-8000-000000000002';
select is(msrc_staff_email.valid_receipt('81000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002'),false,
  'Suspension/re-enabling never restores an old email receipt');
select lives_ok($$do $transition$
begin
  perform pg_sleep(0.02);
  update msrc_authorization.account_access set state='suspended' where actor_id='81000000-0000-4000-8000-000000000002';
  if not exists(select 1 from msrc_sessions.actor_revocations where actor_id='81000000-0000-4000-8000-000000000002'
      and revoked_before > statement_timestamp()) then
    raise exception 'Synthetic revocation must use the actual transition clock.';
  end if;
end;
$transition$;$$,'A delayed suspension derives its cutoff after statement start');

-- Independent relevant-field/password fixture: Auth owns the managed user row,
-- while the trigger writes only secret-free private revision metadata.
insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,is_anonymous,encrypted_password)
  values('81000000-0000-4000-8000-000000000004','email-revision@example.invalid',now()-interval '1 day',
    now()-interval '1 day',now(),false,'synthetic-password-version-a');
select ok((select revision=1 and password_changed_at is null from msrc_staff_email.identity_revision
  where actor_id='81000000-0000-4000-8000-000000000004'),'Identity insertion initializes metadata without pretending a password mutation occurred');
insert into msrc_authorization.account_access(actor_id,state,individually_identified)
  values('81000000-0000-4000-8000-000000000004','active',true);
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
  values('81000000-0000-4000-8000-000000000004','synthetic-email-2027','contentMediaEditor','edition','Synthetic relevant revision fixture');
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
  values('82000000-0000-4000-8000-000000000005','81000000-0000-4000-8000-000000000004',now()-interval '1 minute',now(),'aal1');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
  values(gen_random_uuid(),'82000000-0000-4000-8000-000000000005','password',now()-interval '50 seconds',now()-interval '50 seconds');
delete from msrc_staff_email.identity_revision where actor_id='81000000-0000-4000-8000-000000000004';
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000091',repeat('a',64),repeat('7',64))->>'code','ineligible','Missing relevant revision fails closed rather than accepting generic user timestamps');
reset role;
-- Trusted isolated fixture repair, before this actor has any custom receipt.
insert into msrc_staff_email.identity_revision(actor_id,revision,password_changed_at)
  values('81000000-0000-4000-8000-000000000004',1,null);
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000091',repeat('a',64),repeat('7',64))->>'state','issued','Relevant revision fixture begins with current native password');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000091',true)->>'state','ok','Relevant revision fixture confirms synthetic delivery');
select is(public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000091',repeat('a',64))->>'state','verified','Relevant revision fixture creates its first receipt');
reset role;
-- The isolated pgTAP postgres connection is intentionally unable to SET ROLE
-- supabase_auth_admin. Inspect its ACL; genuine managed-API mutations separately
-- exercise the native role and SECURITY DEFINER trigger in integration CI.
select ok(not has_schema_privilege('supabase_auth_admin','msrc_staff_email','USAGE')
  and not has_table_privilege('supabase_auth_admin','msrc_staff_email.identity_revision','SELECT,INSERT,UPDATE,DELETE'),
  'Native Auth role has no direct private revision access and uses only the scoped trigger');
update auth.users set email_confirmed_at=null where id='81000000-0000-4000-8000-000000000004';
update auth.users set email_confirmed_at=now()-interval '1 day' where id='81000000-0000-4000-8000-000000000004';
select is((select revision from msrc_staff_email.identity_revision where actor_id='81000000-0000-4000-8000-000000000004'),
  3::bigint,'Native confirmation away/back increments protected revision through its scoped trigger');
select is(msrc_staff_email.valid_receipt('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005'),
  false,'Restoring confirmation cannot restore the prior receipt');
update msrc_staff_email.challenges set created_at=now()-interval '2 minutes'
  where id='83000000-0000-4000-8000-000000000091';
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000092',repeat('a',64),repeat('7',64))->>'state','issued','New confirmation revision requires a fresh bounded email check');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000092',true)->>'state','ok','Fresh confirmation-bound fixture delivery succeeds');
select is(public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000092',repeat('a',64))->>'state','verified','Fresh confirmation-bound proof recovers independently');
reset role;
update auth.users set encrypted_password='synthetic-password-version-b',updated_at=clock_timestamp()
  where id='81000000-0000-4000-8000-000000000004';
select ok((select revision=4 and password_changed_at > now() from msrc_staff_email.identity_revision
  where actor_id='81000000-0000-4000-8000-000000000004'),'Password mutation records its serialized current clock without retaining password material');
do $$begin perform pg_temp.email_claims('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005'); end$$;
set local role authenticated;
select ok(public.msrc_session_context('synthetic-email-2027') @>
  '{"passwordValid":false,"staffEmailValid":false,"sessionPolicySatisfied":false,"reason":"password_auth_required"}'::jsonb,
  'Managed password mutation invalidates the old password session and email receipt');
reset role;
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000093',repeat('a',64),repeat('7',64))->>'code','ineligible','An earlier password AMR cannot request a new email check after password mutation');
reset role;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
  values('82000000-0000-4000-8000-000000000006','81000000-0000-4000-8000-000000000004',clock_timestamp(),clock_timestamp(),'aal1');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
  values(gen_random_uuid(),'82000000-0000-4000-8000-000000000006','password',clock_timestamp(),clock_timestamp());
update msrc_staff_email.challenges set created_at=now()-interval '2 minutes'
  where id='83000000-0000-4000-8000-000000000092';
do $$begin perform pg_temp.email_claims('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000006'); end$$;
set local role authenticated;
select is(public.msrc_session_context('synthetic-email-2027')->>'reason','staff_email_check_required','Fresh password after mutation requires its own email check');
reset role;
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000006',
  '83000000-0000-4000-8000-000000000093',repeat('a',64),repeat('7',64))->>'state','issued','Fresh native password proof recovers after mutation');
select is(public.msrc_staff_email_delivery('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000006',
  '83000000-0000-4000-8000-000000000093',true)->>'state','ok','Fresh password-bound delivery succeeds');
select is(public.msrc_staff_email_consume('81000000-0000-4000-8000-000000000004','82000000-0000-4000-8000-000000000006',
  '83000000-0000-4000-8000-000000000093',repeat('a',64))->>'state','verified','Fresh password plus new exact-session email proof recovers');
reset role;
set local role authenticated;
select is(public.msrc_second_step_satisfied(),true,'Recovered staff proof passes only the closed authentication predicate');
reset role;
select is((select array_agg(column_name::text order by ordinal_position) from information_schema.columns
  where table_schema='msrc_staff_email' and table_name='identity_revision'),
  array['actor_id','revision','password_changed_at']::text[],'Relevant revision schema retains no identity destinations or credential material');
insert into auth.users(id,email,created_at,updated_at,is_anonymous)
  values('81000000-0000-4000-8000-000000000005','revision-delete@example.invalid',now(),now(),false);
delete from auth.users where id='81000000-0000-4000-8000-000000000005';
select is((select count(*) from msrc_staff_email.identity_revision where actor_id='81000000-0000-4000-8000-000000000005'),
  0::bigint,'Current revision metadata does not independently prevent native identity deletion');

do $$begin perform pg_temp.email_claims('81000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000003'); end$$;
set local role authenticated;
select ok(public.msrc_session_context('synthetic-email-2027') @> '{"authenticationTier":"participant","staffEmailValid":false,"mfaValid":false,"sessionPolicySatisfied":true}'::jsonb,
  'Participants still require verified email and phone without an extra login step');
reset role;
set local role service_role;
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000003','82000000-0000-4000-8000-000000000003',
  '83000000-0000-4000-8000-000000000007',repeat('a',64),repeat('b',64))->>'code','ineligible','Participant cannot acquire staff application proof');
select is(public.msrc_staff_email_begin('81000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000007','123456',repeat('b',64))->>'code','invalid_request','SQL never accepts raw OTP input');
reset role;
select ok(not exists(select 1 from information_schema.columns where table_schema='msrc_staff_email' and table_name='audit'
  and column_name in ('email','recipient','code','code_hash','ip_hash','payload','password','token')),'Audit schema excludes secrets and personal destinations');
select throws_ok($$update msrc_staff_email.audit set event='challenge.failed'$$,'55000',null,'Audit rows cannot be edited');
select throws_ok($$truncate msrc_staff_email.audit$$,'55000',null,'Audit rows cannot be truncated');
select ok((select not operational_access_ready and not privileged_access_ready from msrc_sessions.policy where singleton),
  'Successful synthetic authentication never opens operational or privileged readiness');

select * from finish();
rollback;
