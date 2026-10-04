-- BL-AUTH-02/03/04/06/08. Disposable CI only; every synthetic setting/identity rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();

select has_schema('msrc_participant','Participant security evidence is private');
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='msrc_participant' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),
  10::bigint,'Every participant table forces RLS');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
  where has_schema_privilege(r.name,'msrc_participant','USAGE')),'API roles have no private-schema access');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
  cross join (values('anon'),('authenticated'),('service_role')) r(name)
  where n.nspname='msrc_participant' and c.relkind='r' and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),
  'No API role can read or forge participant records');
select is(public.msrc_participant_status(),'{"enabled":false,"privacyVersion":null,"emailDailyLimit":null}'::jsonb,
  'Migration defaults are closed, with no approved notice or email budget');
select is((select count(*) from msrc_participant.profiles),0::bigint,'No participant identity is seeded');
select is(public.msrc_participant_form_claim(repeat('a',64),repeat('b',64))->>'state','denied','Closed gate rejects POST admission');
select is(public.msrc_participant_signup_reserve('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'participant-one@example.invalid','Synthetic participant','synthetic-approved-notice')->>'state','denied','Closed gate rejects signup reservation');
set local role anon;
select throws_ok($$select public.msrc_participant_status()$$,'42501',null,'Anonymous cannot inspect private release configuration');
select throws_ok($$select public.msrc_participant_profile('synthetic-participant-2027')$$,'42501',null,'Anonymous cannot request a profile');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_participant_form_claim(repeat('a',64),repeat('b',64))$$,'42501',null,'Client cannot claim its own POST admission');
select throws_ok($$select public.msrc_participant_email_consume('participant-one@example.invalid','verify_email',gen_random_uuid(),repeat('a',64),gen_random_uuid(),repeat('b',64))$$,
  '42501',null,'Client cannot approve mailbox evidence');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-approved-notice';
select is(public.msrc_participant_form_claim(repeat('a',64),repeat('b',64))->>'state','denied','Enabled flag alone cannot bypass missing budget');
update msrc_participant.policy set email_daily_limit=100;
select is(public.msrc_participant_form_claim(repeat('a',64),repeat('b',64))->>'state','claimed','Configured gate admits one valid nonce');
select is(public.msrc_participant_form_claim(repeat('a',64),repeat('c',64))->>'state','denied','Nonce cannot replay from another IP');
do $$begin
  for i in 1..19 loop perform public.msrc_participant_form_claim(lpad(to_hex(i),64,'0'),repeat('b',64)); end loop;
end$$;
select is(public.msrc_participant_form_claim(repeat('d',64),repeat('b',64))->>'state','denied','Twenty POST claims exhaust the IP hour budget');

-- Native SQL maintenance is the existing synthetic fixture/bootstrap boundary.
-- Genuine native Auth connection denial is covered by managed integration.
-- A claimed admission never inherits the SQL-maintenance exception.
select throws_ok($$insert into auth.users(id,email,created_at,updated_at,is_anonymous,raw_app_meta_data)
  values('a1000000-0000-4000-8000-000000000099','native-unreserved@example.invalid',now(),now(),false,
    '{"msrcParticipantAdmission":"a2000000-0000-4000-8000-000000000099"}')$$,
  '42501','Participant admission required.','Native unreserved account creation is rejected');
select is(public.msrc_participant_signup_reserve('a1000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',
  'participant-one@example.invalid','Synthetic participant','synthetic-approved-notice')->>'state','reserved','Approved synthetic signup reserves exact actor/notice');
insert into auth.users(id,email,encrypted_password,created_at,updated_at,is_anonymous,raw_app_meta_data) values
  ('a1000000-0000-4000-8000-000000000001','participant-one@example.invalid','synthetic-managed-fixture-hash',now(),now(),false,
  '{"provider":"email","providers":["email"],"msrcParticipantAdmission":"a2000000-0000-4000-8000-000000000001"}');
select is((select count(*) from msrc_participant.profiles where actor_id='a1000000-0000-4000-8000-000000000001'),1::bigint,
  'Native insertion atomically creates only the admitted minimal profile');
select is((select count(*) from msrc_participant.notice_receipts where actor_id='a1000000-0000-4000-8000-000000000001'),1::bigint,
  'Admitted identity has an immutable exact-version notice receipt');
select ok(not (select raw_app_meta_data ? 'msrcParticipantAdmission' from auth.users where id='a1000000-0000-4000-8000-000000000001'),
  'Consumed admission marker is removed from native metadata');
select throws_ok($$update auth.users set email_confirmed_at=clock_timestamp() where id='a1000000-0000-4000-8000-000000000001'$$,
  '42501','Verified mailbox proof required.','Unverified account cannot be confirmed without a consumed code');
select throws_ok($$insert into auth.mfa_factors(id,user_id,friendly_name,factor_type,status,secret,created_at,updated_at)
  values(gen_random_uuid(),'a1000000-0000-4000-8000-000000000001','Synthetic forbidden participant TOTP','totp','unverified','synthetic',now(),now())$$,
  '42501','Participant MFA is unavailable.','Participant cannot enroll native authenticator MFA');

create function pg_temp.participant_issue(challenge uuid default 'a3000000-0000-4000-8000-000000000001',
  purpose text default 'verify_email',email text default 'participant-one@example.invalid',hash text default repeat('e',64),
  email_digest text default repeat('f',64)) returns jsonb language sql as $$
  select public.msrc_participant_email_begin(email,purpose,challenge,hash,email_digest,repeat('1',64),
    case when purpose='verify_email' then 'Legitimate mailbox owner' end,
    case when purpose='verify_email' then 'synthetic-approved-notice' end);
$$;
create function pg_temp.participant_consume(challenge uuid default 'a3000000-0000-4000-8000-000000000001',
  operation uuid default 'a4000000-0000-4000-8000-000000000001',hash text default repeat('e',64),
  purpose text default 'verify_email',email text default 'participant-one@example.invalid') returns jsonb language sql as $$
  select public.msrc_participant_email_consume(email,purpose,challenge,hash,operation,repeat('2',64));
$$;
select is(pg_temp.participant_issue()->>'state','issued','Unverified participant receives a private email challenge');
select is(pg_temp.participant_consume()->>'state','denied','Undelivered challenge is unusable');
select is(public.msrc_participant_email_delivery('a3000000-0000-4000-8000-000000000001',true)->>'state','ok','Provider acknowledgement activates a code');
select is(pg_temp.participant_consume(hash=>repeat('3',64))->>'state','denied','Incorrect code cannot grant identity mutation');
select is(pg_temp.participant_consume(purpose=>'reset_password')->>'state','denied','Verification code cannot reset a password');
select is(pg_temp.participant_consume(email=>'different@example.invalid')->>'state','denied','Code cannot target a different email/account');
select is(pg_temp.participant_consume()->>'state','consumed','Single correct current code grants one native transaction');
select is(pg_temp.participant_consume(operation=>'a4000000-0000-4000-8000-000000000002')->>'state','denied','Parallel/repeated consumption cannot grant a second transaction');
insert into msrc_authorization.edition_config(edition_key) values('synthetic-participant-2027'),('synthetic-participant-other');
select throws_ok($$insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
  values('a1000000-0000-4000-8000-000000000001','synthetic-participant-other','superAdmin','edition','Synthetic forbidden racing promotion')$$,
  '55000','Participant identity transition is pending.','Staff promotion cannot race an authorized participant reset/verification');
-- Mirrors native admin update ordering: confirmation THEN managed password,
-- inside ONE provider transaction. We never persist a plaintext password here.
update auth.users set email_confirmed_at=clock_timestamp() where id='a1000000-0000-4000-8000-000000000001';
update auth.users set encrypted_password='synthetic-managed-fixture-replacement' where id='a1000000-0000-4000-8000-000000000001';
select is((select state from msrc_participant.operations where id='a4000000-0000-4000-8000-000000000001'),'applied',
  'Native password mutation consumes the claimed transaction once');
select throws_ok($$update auth.users set encrypted_password='synthetic-forbidden-second-use' where id='a1000000-0000-4000-8000-000000000001'$$,
  '42501','Current mailbox proof required.','An applied permit cannot authorize another password mutation');
select is(public.msrc_participant_email_complete('a4000000-0000-4000-8000-000000000001',true)->>'state','completed','Only applied native identity completes verification');
select is((select name from msrc_participant.profiles where actor_id='a1000000-0000-4000-8000-000000000001'),'Legitimate mailbox owner',
  'Mailbox proof replaces a pre-hijacker name with the verified signup snapshot');
select is(public.msrc_participant_email_complete('a4000000-0000-4000-8000-000000000001',true)->>'state','denied','Completion cannot replay');

update auth.users set recovery_token='native-must-not-work',recovery_sent_at=clock_timestamp(),
  confirmation_token='native-must-not-confirm',confirmation_sent_at=clock_timestamp() where id='a1000000-0000-4000-8000-000000000001';
select ok((select recovery_token='' and recovery_sent_at is null and confirmation_token='' and confirmation_sent_at is null
  from auth.users where id='a1000000-0000-4000-8000-000000000001'),'Native recovery/confirmation credentials are stripped');
insert into auth.one_time_tokens(id,user_id,token_type,token_hash,relates_to,created_at,updated_at)
  values(gen_random_uuid(),'a1000000-0000-4000-8000-000000000001','recovery_token','native-must-not-work','participant-one@example.invalid',now(),now());
select is((select count(*) from auth.one_time_tokens where user_id='a1000000-0000-4000-8000-000000000001'),0::bigint,
  'Native token-hash links also cannot bypass private OTP protection');
select is(msrc_participant.suppress_native_email('{"user":{"id":"a1000000-0000-4000-8000-000000000001"}}'), '{}'::jsonb,
  'Suppressed native participant email returns generic success');
select is(msrc_participant.suppress_native_email('{"user":{"id":"a1000000-0000-4000-8000-000000000099"}}')#>>'{error,http_code}','403',
  'Other native email delivery remains denied');
select throws_ok($$update auth.users set email='unapproved-new-email@example.invalid' where id='a1000000-0000-4000-8000-000000000001'$$,
  '42501','Participant identity change is unavailable.','Native email change cannot bypass the approved recovery process');

-- Every private service RPC is unavailable to bearer-authenticated users.
set local role service_role;
select throws_ok($$select count(*) from msrc_participant.challenges$$,'42501',null,'Even service credentials cannot directly inspect protected code hashes');
reset role;
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(p.proacl) a
  where n.nspname='msrc_participant' and a.grantee=0),'Private helpers have no PUBLIC execute');

-- Exact password session receipt: native tokens alone and foreign sessions deny.
select is(public.msrc_participant_login_begin('a5000000-0000-4000-8000-000000000001',repeat('4',64),repeat('5',64))->>'state','allowed','Login attempt is privately reserved');
insert into auth.sessions(id,user_id,created_at,updated_at,aal) values
  ('a6000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',clock_timestamp(),clock_timestamp(),'aal1');
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at) values
  (gen_random_uuid(),'a6000000-0000-4000-8000-000000000001','password',clock_timestamp(),clock_timestamp());
create function pg_temp.participant_claims(actor text default 'a1000000-0000-4000-8000-000000000001',
  sid text default 'a6000000-0000-4000-8000-000000000001') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','session_id',sid,
    'aal','aal1','exp',floor(extract(epoch from clock_timestamp()+interval '1 hour')),
    'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',
      (select floor(extract(epoch from max(a.updated_at::timestamptz))) from auth.mfa_amr_claims a
        where a.session_id::text=sid and a.authentication_method='password'))))::text,true);
end$$;
do $$begin perform pg_temp.participant_claims(); end$$;
set local role authenticated;
select is(public.msrc_participant_profile('synthetic-participant-2027'),null::jsonb,'Native password token without private admission sees no profile');
select ok(public.msrc_session_context('synthetic-participant-2027') is not null,'Existing shared context initializes native history');
reset role;
select is(public.msrc_participant_login_finish('a5000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',
  'a6000000-0000-4000-8000-000000000001')->>'state','admitted','Verified participant exact managed password session is admitted');
set local role authenticated;
select is(public.msrc_participant_profile('synthetic-participant-2027')->>'name','Legitimate mailbox owner','Admitted session reads only its own profile');
select is(public.msrc_participant_profile('synthetic-participant-2027')->>'operationalAccessReady','false','Dashboard admission opens no operational workflow');
reset role;
do $$begin perform pg_temp.participant_claims(actor=>'a1000000-0000-4000-8000-000000000099'); end$$;
set local role authenticated;
select is(public.msrc_participant_profile('synthetic-participant-2027'),null::jsonb,'Another actor cannot reuse the admitted session');
reset role;
do $$begin perform pg_temp.participant_claims(); end$$;
update auth.users set encrypted_password='synthetic-owner-password-change' where id='a1000000-0000-4000-8000-000000000001';
set local role authenticated;
select is(public.msrc_participant_profile('synthetic-participant-2027'),null::jsonb,'Authorized native owner password change invalidates the old app receipt');
reset role;

-- Reset is a separate purpose and loses validity when native identity changes.
update msrc_participant.limit_events set occurred_at=occurred_at-interval '61 seconds' where kind='issue_email';
select is(pg_temp.participant_issue(challenge=>'a3000000-0000-4000-8000-000000000003',purpose=>'reset_password')->>'state','issued','Verified participant can request private password reset');
select is(public.msrc_participant_email_delivery('a3000000-0000-4000-8000-000000000003',true)->>'state','ok','Reset code needs provider acknowledgement');
update msrc_participant.challenges set created_at=statement_timestamp()-interval '10 minutes',expires_at=statement_timestamp()
  where id='a3000000-0000-4000-8000-000000000003';
select is(pg_temp.participant_consume(challenge=>'a3000000-0000-4000-8000-000000000003',operation=>'a4000000-0000-4000-8000-000000000003',purpose=>'reset_password')->>'state',
  'denied','Expiry at the boundary rejects reset');
select is((select state from msrc_participant.challenges where id='a3000000-0000-4000-8000-000000000003'),'expired','Expired credential stays expired');

-- Five failures stay exhausted, including after new requests from another IP.
update msrc_participant.limit_events set occurred_at=occurred_at-interval '16 minutes' where kind in ('issue_email','issue_ip');
select is(pg_temp.participant_issue(challenge=>'a3000000-0000-4000-8000-000000000004',purpose=>'reset_password')->>'state','issued','Another reset after the window can be issued');
select is(public.msrc_participant_email_delivery('a3000000-0000-4000-8000-000000000004',true)->>'state','ok','Latest reset is sent');
do $$begin for i in 1..5 loop
  perform pg_temp.participant_consume(challenge=>'a3000000-0000-4000-8000-000000000004',operation=>gen_random_uuid(),hash=>repeat('6',64),purpose=>'reset_password');
end loop; end$$;
select is((select failed_attempts from msrc_participant.challenges where id='a3000000-0000-4000-8000-000000000004'),5,'Five incorrect codes exhaust the challenge');
select is(pg_temp.participant_consume(challenge=>'a3000000-0000-4000-8000-000000000004',operation=>gen_random_uuid(),purpose=>'reset_password')->>'state',
  'denied','Correct code cannot revive an exhausted credential');
update msrc_participant.limit_events set occurred_at=occurred_at-interval '61 seconds' where kind='issue_email';
select is(pg_temp.participant_issue(challenge=>'a3000000-0000-4000-8000-000000000005',purpose=>'reset_password')->>'state','denied','Resend cannot bypass challenge cooldown');

-- Unknown addresses incur the same quota without manufacturing users.
select is(pg_temp.participant_issue(challenge=>gen_random_uuid(),purpose=>'reset_password',email=>'unknown@example.invalid',email_digest=>repeat('7',64))->>'state',
  'denied','Unknown recovery lookup cannot create an account or challenge');
select is((select count(*) from msrc_participant.limit_events where kind='issue_email' and subject_hash=repeat('7',64)),1::bigint,
  'Unknown recovery consumes the same account issuance quota');
select is((select count(*) from auth.users where email='unknown@example.invalid'),0::bigint,'Unknown recovery creates no managed identity');
do $$begin for i in 1..5 loop
  perform public.msrc_participant_login_begin(gen_random_uuid(),repeat('8',64),repeat('9',64));
end loop; end$$;
select is(public.msrc_participant_login_begin(gen_random_uuid(),repeat('8',64),repeat('0',64))->>'state','denied','Five pending/failed password attempts throttle across IPs');

update msrc_participant.policy set enabled=false;
select is(public.msrc_participant_login_begin(gen_random_uuid(),repeat('a',64),repeat('c',64))->>'state','denied','Closing DB gate prevents further login admission');
do $$begin perform pg_temp.participant_claims(); end$$;
set local role authenticated;
select is(public.msrc_participant_profile('synthetic-participant-2027'),null::jsonb,'Closed DB gate denies existing participant receipts');
reset role;
select * from finish();
rollback;
