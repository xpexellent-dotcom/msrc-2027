-- ORG-051 / ENG-043. Synthetic settings, identities and keys; rollback only.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
\ir ../support/registration-fixtures.psql
select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='msrc_registration' and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),4::bigint,'All four registration tables force RLS');
select is((select count(*) from pg_policies where schemaname='msrc_registration'),0::bigint,'No client RLS policies');
select ok(not exists(select 1 from (values('anon'),('authenticated'),('service_role')) r(name)
 where has_schema_privilege(r.name,'msrc_registration','USAGE')),'No API role has private schema access');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 cross join (values('anon'),('authenticated'),('service_role')) r(name) where n.nspname='msrc_registration' and c.relkind='r'
 and has_table_privilege(r.name,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')),'No API role can read or write registration tables');
select ok(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(c.relacl) a
 where n.nspname='msrc_registration' and a.grantee=0),'No PUBLIC table ACL');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(p.proacl) a
 where n.nspname='msrc_registration' and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)),'Private helper execution has no API or PUBLIC grants');
select ok(not exists(select 1 from pg_constraint c where c.contype='f' and c.connamespace='msrc_registration'::regnamespace
 and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and i.indpred is null
 and cardinality(c.conkey)=1 and i.indkey[0]=c.conkey[1])),'Every new foreign key has a covering index prefix');
select ok(not exists(select 1 from pg_proc p where p.pronamespace='msrc_registration'::regnamespace and p.prosecdef
 and not ('search_path=""'=any(p.proconfig))),'Every SECURITY DEFINER pins empty search_path');
select is((select count(*) from msrc_registration.settings),0::bigint,'Migration seeds no edition settings');
select is((select count(*) from msrc_registration.requests),0::bigint,'Migration seeds no requests or identity values');
select ok(not exists(select 1 from pg_proc p cross join lateral aclexplode(p.proacl) a
 where p.pronamespace='public'::regnamespace and p.proname like 'msrc_registration_%'
 and a.grantee in(0,'anon'::regrole,'authenticated'::regrole)),'New registration RPCs have no client or PUBLIC execution grants');
select is(public.msrc_registration_status('synthetic-registration')->>'enabled','false','Missing settings closes database registration');
set local role anon;
select throws_ok($$select public.msrc_registration_status('synthetic-registration')$$,'42501',null,'Anonymous cannot inspect registration policy');
reset role;
set local role authenticated;
select throws_ok($$select public.msrc_registration_context('synthetic-registration','{}')$$,'42501',null,'Client cannot forge service registration session claims');
select throws_ok($$select public.msrc_registration_priority_set('synthetic-registration','{}',gen_random_uuid(),true,'Synthetic')$$,'42501',null,'Client cannot assign priority');
reset role;

update msrc_participant.policy set enabled=true,privacy_version='synthetic-registration-notice',email_daily_limit=1000;
update msrc_participant.retention_policy set enabled=true;
update msrc_staff.policy set enabled=true,email_daily_limit=1000;
select pg_temp.registration_settings('synthetic-registration');
select pg_temp.registration_fixture(1,'synthetic-registration');
select pg_temp.registration_fixture(2,'synthetic-registration');
select pg_temp.registration_fixture(3,'synthetic-registration',false);
select pg_temp.registration_fixture(4,'synthetic-registration',true,false);
select pg_temp.registration_fixture(5,'synthetic-registration',false,true,interval '31 days');
select pg_temp.registration_staff_fixture(100,'synthetic-registration');
select pg_temp.registration_staff_fixture(101,'synthetic-registration');
select pg_temp.registration_staff_fixture(102,'synthetic-registration','finance');
select pg_temp.registration_staff_fixture(103,'synthetic-registration');
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(102)::text,true);end$$;
select ok(msrc_staff.authorize('synthetic-registration',array['finance']) is not null,'Wrong-role fixture has its genuine current exact-session regular-staff email assurance');
do $$begin perform set_config('request.jwt.claims','{}',true);end$$;
select ok(not msrc_participant.unknown_erasure_reference(),'Reviewed exact RESTRICT registration FKs preserve participant cleanup inventory');
select ok(msrc_registration.settings_complete('synthetic-registration'),'Synthetic request settings complete while unrelated pending workshop capacity remains NULL');
select throws_ok($$update msrc_registration.settings set closing_at='infinity'$$,'23514',null,'Infinite configuration is not an actual closing instant');
select is(public.msrc_registration_context('synthetic-registration',pg_temp.registration_claims(1))->>'state','open','Verified admitted adult inside general window may submit');
select is(public.msrc_registration_context('synthetic-registration',pg_temp.registration_claims(3))->>'state','denied','Unverified participant refused');
select is(public.msrc_registration_context('synthetic-registration',pg_temp.registration_claims(4))->>'state','denied','Participant lacking strict 18+ proof refused');
select ok((select u.email_confirmed_at is not null and p.state='verified' and not msrc_participant.age_proven(u.id)
 from auth.users u join msrc_participant.profiles p on p.actor_id=u.id where u.id=pg_temp.registration_actor(4)),'Missing-age fixture has a verified native email and verified profile');
select is(public.msrc_registration_context('synthetic-registration',pg_temp.registration_claims(100))->>'state','denied','Staff identity cannot submit as a participant');
select is(public.msrc_registration_context('synthetic-registration','{"sub":"invalid","role":"authenticated"}')->>'state','denied','Malformed claimed session refused');
select is(public.msrc_registration_context('synthetic-registration',pg_temp.registration_claims(1)||'{"session_id":"00000000-0000-4000-8000-000000000000"}') ->>'state','denied','Forged foreign session refused');
select is(current_setting('request.jwt.claims'),'{}','Forwarded claims restored after context checks');

-- Each required setting independently fails closed; restore only synthetic values.
create function pg_temp.registration_nulls() returns setof text language plpgsql as $$declare field text;snapshot jsonb;begin
 select to_jsonb(s) into snapshot from msrc_registration.settings s where edition_key='synthetic-registration';
 foreach field in array array['terms_version','payment_required','general_capacity','early_access_start_at','early_access_end_at',
 'priority_start_at','priority_end_at','general_opening_at','closing_at','waitlist_offer_hours','confirm_seat_lead_days',
 'confirm_seat_response_hours','places_remaining_threshold','minimum_age'] loop
 execute format('update msrc_registration.settings set %I=null where edition_key=''synthetic-registration''',field);
 return next ok(not msrc_registration.settings_complete('synthetic-registration'),'NULL '||field||' closes request gate');
 if public.msrc_registration_context('synthetic-registration',pg_temp.registration_claims(1))->>'state'<>'closed' then raise exception 'NULL gate must close';end if;
 execute format('update msrc_registration.settings set %I=(jsonb_populate_record(null::msrc_registration.settings,$1)).%I where edition_key=''synthetic-registration''',field,field) using snapshot;
 end loop;
end$$;
select * from pg_temp.registration_nulls();
update msrc_registration.settings set enabled=false;
select is(pg_temp.registration_submit('synthetic-registration',1)->>'state','closed','DB flag false refuses submission');
update msrc_registration.settings set enabled=true,payment_required=true;
select ok(not msrc_registration.settings_complete('synthetic-registration'),'Paid requests require configured payment window');
update msrc_registration.settings set payment_window_hours=19;
select ok(msrc_registration.settings_complete('synthetic-registration'),'Synthetic paid window completes settings without building payment');
update msrc_registration.settings set payment_required=false,payment_window_hours=null;
update msrc_participant.policy set enabled=false;
select is(pg_temp.registration_submit('synthetic-registration',1)->>'state','closed','Participant accounts database readiness required');
update msrc_participant.policy set enabled=true;
update msrc_registration.settings set general_opening_at=clock_timestamp()+interval '1 hour';
select is(pg_temp.registration_submit('synthetic-registration',1)->>'state','closed','Database time before opening refuses submission');
update msrc_registration.settings set general_opening_at=clock_timestamp()-interval '1 day',closing_at=clock_timestamp();
select is(pg_temp.registration_submit('synthetic-registration',1)->>'state','closed','Closing boundary and later refuse submission');
update msrc_registration.settings set closing_at=clock_timestamp()+interval '1 day',general_opening_at=clock_timestamp()+interval '1 hour',
 priority_start_at=clock_timestamp()-interval '1 hour',priority_end_at=clock_timestamp()+interval '30 minutes';
select is(pg_temp.registration_submit('synthetic-registration',1)->>'state','closed','Non-designated account refused during priority window');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(102),pg_temp.registration_actor(1),true,'Synthetic verified duty')->>'state','denied','Finance role cannot assign priority');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(1),pg_temp.registration_actor(1),true,'Self service')->>'state','denied','Participant cannot self-assign priority');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(100),pg_temp.registration_actor(1),true,'   ')->>'state','denied','Priority assignment needs a nonempty reason');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(100)||'{"aal":"aal1"}',pg_temp.registration_actor(1),true,'Synthetic duty')->>'state','denied','Super Admin JWT missing AAL2 cannot designate');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(100)||'{"session_id":"00000000-0000-4000-8000-000000000000"}',pg_temp.registration_actor(1),true,'Synthetic duty')->>'state','denied','Super Admin foreign native session cannot designate');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(100),pg_temp.registration_actor(1),true,'Synthetic owner verified designation')->>'state','updated','Exact assured Super Admin assigns designation');
select ok(msrc_registration.priority_active('synthetic-registration',pg_temp.registration_actor(1)),'Designation queryable privately for future workshops');
select is((select count(*) from msrc_registration.audit where event='priority.set' and result='allowed'),1::bigint,'Designation assignment audited once with actor/reason');
select is(pg_temp.registration_submit('synthetic-registration',1)->>'state','submitted','Designated adult accepted during priority window');
select is(pg_temp.registration_submit('synthetic-registration',1)->'request'->>'id',(select id::text from msrc_registration.requests where actor_id=pg_temp.registration_actor(1)),'Repeat submit returns same request');
select is((select count(*) from msrc_registration.requests where actor_id=pg_temp.registration_actor(1)),1::bigint,'One account has one edition request');
select is((select count(*) from msrc_registration.audit where event='request.submitted'),1::bigint,'Retry creates one immutable submission audit');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(100),pg_temp.registration_actor(1),false,'Synthetic designation withdrawn')->>'state','updated','Super Admin removes designation with reason');
select ok(not msrc_registration.priority_active('synthetic-registration',pg_temp.registration_actor(1)),'Removed designation no longer authorizes window');
select ok((select removed_at is not null and removed_by=pg_temp.registration_actor(100) from msrc_registration.priority_designations where actor_id=pg_temp.registration_actor(1)),'Removal has performer and timestamp');
select is((select count(*) from msrc_registration.audit where event='priority.removed' and result='allowed' and reason is not null),1::bigint,'Removal reason audited');
select ok((select previous_active is true and new_active is false from msrc_registration.audit where event='priority.removed' and result='allowed'),'Priority audit snapshots before and after removal');
select is(msrc_participant.retained_reason(pg_temp.registration_actor(1)),'retained_account','Registration uses the existing permitted retained-account cleanup reason');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(100),pg_temp.registration_actor(5),true,'Synthetic retained organizer history')->>'state','updated','Super Admin designation may preserve pending account operational history');
select is(msrc_participant.cleanup_unverified(100,false)->>'held','1','Expired never-verified designated account is held without cleanup job constraint failure');
select ok(exists(select 1 from msrc_participant.retention_audit where actor_id=pg_temp.registration_actor(5) and event='cleanup.held' and reason='retained_account'),'Held cleanup event records allowed retained-account reason');
update msrc_registration.settings set priority_start_at=clock_timestamp()-interval '3 days',priority_end_at=clock_timestamp()-interval '2 days',general_opening_at=clock_timestamp()-interval '1 day';
select is(public.msrc_registration_submit('synthetic-registration',pg_temp.registration_claims(2),'national_id',
 jsonb_build_object('ciphertext',repeat('ab',10),'iv',repeat('cd',12),'authTag',repeat('ef',16),'keyVersion','synthetic-v1','plaintext','FAKE0000'),
 repeat('c',64),'••••••0000','synthetic-v1','synthetic-terms')->>'state','denied','Envelope extra keys cannot smuggle plaintext into storage');
select is(public.msrc_registration_submit('synthetic-registration',pg_temp.registration_claims(2),'national_id',
 jsonb_build_object('ciphertext',null,'iv',repeat('cd',12),'authTag',repeat('ef',16),'keyVersion','synthetic-v1'),
 repeat('c',64),'••••••0000','synthetic-v1','synthetic-terms')->>'state','denied','JSON null cannot bypass encrypted-envelope field constraints');
select is(pg_temp.registration_submit('synthetic-registration',2)->>'state','conflict','Same keyed identifier hash refused across participant accounts');
select is(pg_temp.registration_submit('synthetic-registration',2,repeat('c',64))->>'state','submitted','General window accepts non-designated verified adult');
select is((select status from msrc_registration.requests where actor_id=pg_temp.registration_actor(2)),'pending_approval','Only pending request built in slice 1');
select is((select payment_due_at from msrc_registration.requests where actor_id=pg_temp.registration_actor(2)),null::timestamptz,'No payment deadline invented');
select ok(not (pg_temp.registration_submit('synthetic-registration',2,repeat('c',64))::text ~ 'ciphertext|identity_hash|identityMasked|0000'),'Participant result contains no identity or encrypted envelope');
select throws_ok($$update msrc_registration.audit set reason='tampered'$$,'55000',null,'Registration audit immutable');
select throws_ok($$truncate msrc_registration.audit$$,'55000',null,'Registration audit cannot truncate');

-- The database never decrypts; only an assured audited server reveal releases the envelope.
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(102)::text,true);end$$;
set local role authenticated;
select is(public.msrc_staff_identity_reveal('synthetic-registration','e7100000-0000-4000-8000-000000000001','Synthetic duty')->>'state','denied','Non-Super-Admin identity reveal denied');
reset role;
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(100)::text,true);end$$;
set local role authenticated;
select is(public.msrc_staff_identity_reveal('synthetic-registration','e7100000-0000-4000-8000-000000000001',null)->>'state','denied','Missing reveal reason denied');
select is(public.msrc_staff_identity_reveal('synthetic-registration','e7100000-0000-4000-8000-000000000001','  ')->>'state','denied','Blank reveal reason denied');
select is(public.msrc_staff_identity_reveal('synthetic-registration','e7100000-0000-4000-8000-000000000001','Synthetic identity support case')->>'state','available','Assured Super Admin with reason gets encrypted envelope');
select is(public.msrc_staff_participants('synthetic-registration','registration-1@')->'rows'->0->>'identityMasked','••••••0000','Staff ordinary projection contains masked display only');
select ok(not (public.msrc_staff_participants('synthetic-registration','registration-1@')::text ~ 'ciphertext|identity_hash|identityEnvelope'),'Staff ordinary projection excludes encrypted envelope and hash');
reset role;
select is((select count(*) from msrc_registration.audit where event='identity.revealed'),4::bigint,'Every reasoned reveal attempt, including denied, audited');
select is((select count(*) from msrc_staff.audit where action='identity_reveal'),4::bigint,'Existing staff immutable audit records every reveal attempt');
select is((select reason from msrc_registration.audit where event='identity.revealed' and result='allowed'),'Synthetic identity support case','Successful reveal records explicit reason');
select ok(not exists(select 1 from information_schema.columns where table_schema='msrc_registration' and column_name in('identity_number','document_number','plaintext')),'No plaintext identity database column');
do $$begin perform set_config('request.jwt.claims',pg_temp.registration_claims(100)::text,true);end$$;
select is(public.msrc_staff_admin_change('synthetic-registration',pg_temp.registration_actor(103),'set_roles',array['finance'])->>'state','completed','Another Super Admin removes grant through existing audited authority');
select is(public.msrc_registration_priority_set('synthetic-registration',pg_temp.registration_claims(103),pg_temp.registration_actor(2),true,'Stale grant attempt')->>'state','denied','Previously assured session cannot reuse revoked Super Admin grant');
select * from finish();
rollback;
