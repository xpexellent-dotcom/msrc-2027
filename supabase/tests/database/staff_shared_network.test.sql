-- AUTH-02/03, SEC-01/06; ENG-044. Synthetic fixtures only; all changes roll back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
update msrc_staff.policy set enabled=true,email_daily_limit=10000;

select ok(not has_function_privilege('anon','public.msrc_staff_form_claim(text,text)','execute'), 'Anonymous cannot reserve staff forms');
select ok(not has_function_privilege('authenticated','public.msrc_staff_login_begin(uuid,text,text)','execute'), 'Clients cannot reserve password attempts');
select ok(not has_function_privilege('authenticated','public.msrc_staff_email_begin(uuid,uuid,uuid,text,text)','execute'), 'Clients cannot issue staff email challenges');

-- A room of 100 accounts shares one HMAC IP. A pending attempt still counts
-- against its account so concurrent failures cannot outrun the limit.
create temporary table network_logins(outcome text);
insert into network_logins select public.msrc_staff_login_begin(gen_random_uuid(),
 lpad(to_hex(n),64,'0'),repeat('a',64))->>'state' from generate_series(1,100) n;
select is((select count(*) from network_logins where outcome='reserved'),100::bigint,'100 staff can sign in from one campus IP');
select is(public.msrc_staff_login_begin(gen_random_uuid(),repeat('b',64),repeat('a',64))->>'state','reserved','First per-account attempt reserved');
do $$begin for i in 1..4 loop perform public.msrc_staff_login_begin(gen_random_uuid(),repeat('b',64),repeat('a',64));end loop;end$$;
select is(public.msrc_staff_login_begin(gen_random_uuid(),repeat('b',64),repeat('c',64))->>'state','denied','Sixth attempt on one account denied even from another IP');
update msrc_staff.login_attempts set created_at=clock_timestamp()-interval '16 minutes' where email_hash=repeat('b',64);
select is(public.msrc_staff_login_begin(gen_random_uuid(),repeat('b',64),repeat('c',64))->>'state','reserved','Account unlocks after the rolling 15-minute window');
insert into msrc_staff.login_attempts(id,email_hash,ip_hash,state)
 select gen_random_uuid(),repeat('d',64),repeat('a',64),'admitted' from generate_series(1,195);
select is(public.msrc_staff_login_begin(gen_random_uuid(),repeat('e',64),repeat('a',64))->>'state','denied','Shared IP still has a finite 300/hour password ceiling');

insert into msrc_staff.limit_events(kind,subject_hash,nonce_hash)
 select 'form',repeat('f',64),lpad(to_hex(n),64,'0') from generate_series(1,11999) n;
select is(public.msrc_staff_form_claim(repeat('1',64),repeat('f',64))->>'state','claimed','12000th shared-IP mutation is admitted');
select is(public.msrc_staff_form_claim(repeat('2',64),repeat('f',64))->>'state','denied','12001st shared-IP mutation is denied');
select is(public.msrc_staff_form_claim(repeat('3',64),repeat('4',64))->>'state','claimed','Another network remains independent');
select is(public.msrc_staff_form_claim(repeat('3',64),repeat('4',64))->>'state','denied','Raised shared-IP allowance does not allow form-token replay');

insert into msrc_authorization.edition_config(edition_key) values('synthetic-shared-network-2027');
create temporary table network_staff(actor uuid,sid uuid,n integer);
insert into network_staff select gen_random_uuid(),gen_random_uuid(),n from generate_series(1,101) n;
insert into auth.users(id,email,email_confirmed_at,encrypted_password,created_at,updated_at,is_anonymous)
 select actor,'network-staff-'||n||'@example.invalid',now()-interval '1 day','synthetic-hash',now()-interval '1 day',now(),false from network_staff;
insert into msrc_authorization.account_access(actor_id,state,individually_identified) select actor,'active',true from network_staff;
insert into msrc_staff.profiles(actor_id,name) select actor,'Synthetic campus staff '||n from network_staff;
insert into msrc_authorization.role_grants(actor_id,edition_key,role_name,scope_kind,grant_reason)
 select actor,'synthetic-shared-network-2027','checkInStaff','edition','Synthetic shared network test' from network_staff;
insert into auth.sessions(id,user_id,created_at,updated_at,aal)
 select sid,actor,date_trunc('second',now()-interval '1 minute'),now(),'aal1' from network_staff;
insert into auth.mfa_amr_claims(id,session_id,authentication_method,created_at,updated_at)
 select gen_random_uuid(),sid,'password',date_trunc('second',now()-interval '30 seconds'),date_trunc('second',now()-interval '30 seconds') from network_staff;
create temporary table network_email(outcome text);
insert into network_email select public.msrc_staff_email_begin(actor,sid,gen_random_uuid(),repeat('a',64),repeat('5',64))->>'state'
 from network_staff where n<=100;
select is((select count(*) from network_email where outcome='issued'),100::bigint,'100 regular staff can receive their first email check from one IP');
select is((select public.msrc_staff_email_begin(actor,sid,gen_random_uuid(),repeat('a',64),repeat('6',64))->>'code' from network_staff where n=1),'retry_limited','60-second account resend delay survives an IP change');
update msrc_staff_email.challenges set created_at=clock_timestamp()-interval '61 seconds' where actor_id=(select actor from network_staff where n=1);
select is((select public.msrc_staff_email_begin(actor,sid,gen_random_uuid(),repeat('a',64),repeat('6',64))->>'state' from network_staff where n=1),'issued','A second code may issue after 60 seconds');
select is((select count(*) from msrc_staff_email.challenges where actor_id=(select actor from network_staff where n=1) and state='pending'),1::bigint,'Only newest email challenge remains pending');
update msrc_staff_email.challenges set created_at=clock_timestamp()-interval '61 seconds' where actor_id=(select actor from network_staff where n=1);
select is((select public.msrc_staff_email_begin(actor,sid,gen_random_uuid(),repeat('a',64),repeat('6',64))->>'state' from network_staff where n=1),'issued','Third account code is allowed within 15 minutes');
update msrc_staff_email.challenges set created_at=clock_timestamp()-interval '61 seconds' where actor_id=(select actor from network_staff where n=1);
select is((select public.msrc_staff_email_begin(actor,sid,gen_random_uuid(),repeat('a',64),repeat('7',64))->>'code' from network_staff where n=1),'retry_limited','Fourth account code is denied across IPs');
insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at,state)
 select gen_random_uuid(),actor,sid,repeat('a',64),repeat('a',64),repeat('8',64),clock_timestamp()-interval '1 hour',clock_timestamp()-interval '55 minutes','failed'
 from network_staff cross join generate_series(1,9) where n=2;
update msrc_staff_email.challenges set created_at=clock_timestamp()-interval '16 minutes' where actor_id=(select actor from network_staff where n=2) and state='pending';
select is((select public.msrc_staff_email_begin(actor,sid,gen_random_uuid(),repeat('a',64),repeat('9',64))->>'code' from network_staff where n=2),'retry_limited','Ten-per-rolling-day account email ceiling remains strict');
insert into msrc_staff_email.challenges(id,actor_id,session_id,binding,code_hash,ip_hash,created_at,expires_at,state)
 select gen_random_uuid(),actor,sid,repeat('a',64),repeat('a',64),repeat('5',64),clock_timestamp()-interval '2 minutes',clock_timestamp()+interval '3 minutes','failed'
 from network_staff cross join generate_series(1,200) where n=100;
select is((select public.msrc_staff_email_begin(actor,sid,gen_random_uuid(),repeat('a',64),repeat('5',64))->>'code' from network_staff where n=101),'retry_limited','301st shared-IP email issue is denied');

select * from finish();
rollback;
