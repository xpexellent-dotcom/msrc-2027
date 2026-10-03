-- BL-SEC-01: ROL-01..12, AUTH-04, SEC-01/02/06, AT-02/09.
-- TEST ONLY. The schema, synthetic authority, policies and data are rolled back.
-- Never run this against a linked/hosted project. No operational migration,
-- auth account, bucket, storage object, signed URL, or production grant is created.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();

create schema authorization_contract_test;
revoke all on schema authorization_contract_test from public, anon, authenticated, service_role;
grant usage on schema authorization_contract_test to anon, authenticated;

create table authorization_contract_test.actors (
  user_id uuid primary key,
  active boolean not null default true,
  verified boolean not null default true,
  phone_verified boolean not null default true,
  individually_identified boolean not null default true
);
create table authorization_contract_test.sessions (
  session_id uuid primary key,
  user_id uuid not null references authorization_contract_test.actors,
  active boolean not null default true,
  assurance text not null default 'aal1',
  method text not null default 'none',
  -- Synthetic application receipt only; native managed email proof is tested separately.
  staff_email_verified boolean not null default false,
  password_verified boolean not null default true
);
create table authorization_contract_test.role_grants (
  user_id uuid not null references authorization_contract_test.actors,
  role_name text not null check (role_name in (
    'participant', 'abstractReviewer', 'hackathonReviewer', 'threeMinuteThesisReviewer',
    'scientificAdministrator', 'judgingCommittee', 'facultyJudge',
    'registrationWorkshopAdministrator', 'finance', 'checkInStaff',
    'contentMediaEditor', 'sponsorshipPr', 'superAdmin'
  )),
  edition_id text not null,
  track text,
  track_id text,
  resource_id text,
  assignment_id text,
  function_id text,
  state text not null default 'active' check (state in ('active', 'revoked'))
);
create table authorization_contract_test.assignments (
  id text unique,
  user_id uuid not null references authorization_contract_test.actors,
  resource_id text not null,
  edition_id text not null,
  track text not null,
  track_id text,
  kind text not null,
  state text not null default 'active' check (state in ('active', 'withdrawn')),
  conflicted boolean not null default false
);
create table authorization_contract_test.related_actors (
  resource_id text not null,
  user_id uuid not null references authorization_contract_test.actors,
  primary key (resource_id, user_id)
);
create table authorization_contract_test.owned_records (
  id text primary key,
  edition_id text not null,
  owner_id uuid not null references authorization_contract_test.actors,
  label text not null
);
-- Physically separate sanitized data: no identity, evidence, peer review or status.
create table authorization_contract_test.review_packets (
  id text primary key,
  edition_id text not null,
  track text not null,
  track_id text,
  scientific_text text not null,
  -- Trusted synthetic projector provenance, not a production author-domain lookup.
  -- An unresolved owner is denied without placing identity in the reviewer packet.
  ownership_established boolean not null default false
);
create table authorization_contract_test.identity_details (
  resource_id text primary key,
  owner_id uuid not null,
  synthetic_identity text not null
);
-- Generic purpose rows exercise duties without defining future domain fields/states.
create table authorization_contract_test.purpose_records (
  id text primary key,
  edition_id text not null,
  purpose text not null,
  safe_label text not null
);
-- Storage is disabled in local config. This is metadata-policy testing only;
-- Storage API, quarantine/scanning, signing and URL expiry require later feature tests.
create table authorization_contract_test.private_metadata (
  id text primary key,
  resource_id text not null,
  edition_id text not null,
  track text not null,
  track_id text,
  file_class text not null,
  cleared boolean not null,
  synthetic_object_key text not null,
  ownership_established boolean not null default false
);

do $$
declare relation_name text;
begin
  foreach relation_name in array array[
    'actors', 'sessions', 'role_grants', 'assignments', 'related_actors',
    'owned_records', 'review_packets', 'identity_details', 'purpose_records', 'private_metadata'
  ] loop
    execute format('alter table authorization_contract_test.%I enable row level security', relation_name);
    execute format('alter table authorization_contract_test.%I force row level security', relation_name);
    execute format('revoke all on authorization_contract_test.%I from public, anon, authenticated, service_role', relation_name);
    execute format('grant select on authorization_contract_test.%I to authenticated', relation_name);
  end loop;
end $$;

create policy actor_self on authorization_contract_test.actors for select to authenticated
  using (user_id = (select auth.uid()));
create policy session_self on authorization_contract_test.sessions for select to authenticated
  using (user_id = (select auth.uid()));
create policy grant_self on authorization_contract_test.role_grants for select to authenticated
  using (user_id = (select auth.uid()));
create policy assignment_self on authorization_contract_test.assignments for select to authenticated
  using (user_id = (select auth.uid()));
create policy related_self on authorization_contract_test.related_actors for select to authenticated
  using (user_id = (select auth.uid()));

create function authorization_contract_test.actor_ready(privileged boolean)
returns boolean language sql stable security invoker set search_path = '' as $$
  with required as (
    select case when exists(select 1 from authorization_contract_test.role_grants g
      where g.user_id=auth.uid() and g.state='active' and g.role_name='superAdmin') then 'super_admin'
      when privileged or exists(select 1 from authorization_contract_test.role_grants g
        where g.user_id=auth.uid() and g.state='active' and g.role_name<>'participant') then 'staff'
      else 'participant' end as tier
  )
  select auth.uid() is not null
    and exists (
      select 1 from authorization_contract_test.actors a
      where a.user_id = auth.uid() and a.active and a.verified and (required.tier<>'participant' or a.phone_verified)
        and (required.tier='participant' or a.individually_identified)
    )
    and exists (
      select 1 from authorization_contract_test.sessions s
      where s.user_id = auth.uid() and s.session_id::text = auth.jwt()->>'session_id' and s.active and s.password_verified
        and auth.jwt()->'amr' @> '[{"method":"password"}]'::jsonb
        and case when required.tier='super_admin' then (
          s.assurance = 'aal2' and s.method = 'sms'
          and auth.jwt()->>'aal' = 'aal2'
          and auth.jwt()->'amr' @> '[{"method":"password"},{"method":"mfa/phone"}]'::jsonb
        ) when required.tier='staff' then s.staff_email_verified and s.method='email_check'
        else true end
    ) from required;
$$;
create function authorization_contract_test.has_grant(
  required_role text, required_edition text, required_track text default null,
  required_track_id text default null, required_resource text default null,
  required_function text default null
) returns boolean language sql stable security invoker set search_path = '' as $$
  select authorization_contract_test.actor_ready(required_role <> 'participant')
    and exists (
      select 1 from authorization_contract_test.role_grants g
      where g.user_id = auth.uid() and g.role_name = required_role and g.state = 'active'
        and g.edition_id = required_edition
        and length(btrim(g.edition_id)) > 0 and length(btrim(required_edition)) > 0
        and ((g.track is null and g.track_id is null) or (
          g.track in ('research', 'hackathon', 'threeMinuteThesis')
          and length(btrim(g.track_id)) > 0 and length(btrim(required_track_id)) > 0
          and g.track = required_track and g.track_id = required_track_id
        ))
        and (g.resource_id is null or (length(btrim(g.resource_id)) > 0 and g.resource_id = required_resource))
        and (g.function_id is null or (length(btrim(g.function_id)) > 0 and g.function_id = required_function))
        and (required_role not in ('judgingCommittee', 'checkInStaff', 'contentMediaEditor')
          or length(btrim(g.resource_id)) > 0 or length(btrim(g.function_id)) > 0)
        and (g.assignment_id is null or (length(btrim(g.assignment_id)) > 0 and exists (
          select 1 from authorization_contract_test.assignments a
          where a.id = g.assignment_id and a.user_id = auth.uid()
            and a.resource_id = required_resource and a.edition_id = required_edition
            and a.track = required_track and a.track_id is not distinct from required_track_id
            and a.state = 'active'
            and a.kind = case
              when required_role in ('abstractReviewer', 'hackathonReviewer', 'threeMinuteThesisReviewer') then 'review'
              when required_role = 'facultyJudge' then 'eventJudge'
              else null end
        )))
    );
$$;
create function authorization_contract_test.is_assigned(
  required_resource text, required_edition text, required_track text,
  required_track_id text, required_kind text
) returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from authorization_contract_test.assignments a
    where a.user_id = auth.uid() and a.resource_id = required_resource
      and a.edition_id = required_edition and a.track = required_track
      and required_track in ('research', 'hackathon', 'threeMinuteThesis')
      and length(btrim(a.id)) > 0 and length(btrim(a.track_id)) > 0
      and length(btrim(required_track_id)) > 0
      and a.track_id is not distinct from required_track_id
      and a.kind = required_kind and a.state = 'active' and not a.conflicted
  ) and not exists (
    select 1 from authorization_contract_test.related_actors r
    where r.user_id = auth.uid() and r.resource_id = required_resource
  ) and not exists (
    select 1 from authorization_contract_test.assignments c
    where c.user_id = auth.uid() and c.resource_id = required_resource
      and c.edition_id = required_edition and c.track = required_track
      and c.track_id is not distinct from required_track_id and c.conflicted
  );
$$;
create function authorization_contract_test.purpose_role(purpose text)
returns text language sql immutable security invoker set search_path = '' as $$
  select case purpose
    when 'validationOutcome' then 'scientificAdministrator'
    when 'judgingReadiness' then 'judgingCommittee'
    when 'registrationOperation' then 'registrationWorkshopAdministrator'
    when 'financeOperation' then 'finance'
    when 'checkInEntry' then 'checkInStaff'
    when 'contentDraft' then 'contentMediaEditor'
    when 'sponsorInquiry' then 'sponsorshipPr'
    when 'roleAdministration' then 'superAdmin'
    else null end;
$$;

create policy own_read on authorization_contract_test.owned_records for select to authenticated
  using (owner_id = (select auth.uid())
    and authorization_contract_test.has_grant('participant', edition_id, null, null, id));
create policy own_update on authorization_contract_test.owned_records for update to authenticated
  using (owner_id = (select auth.uid())
    and authorization_contract_test.has_grant('participant', edition_id, null, null, id))
  with check (owner_id = (select auth.uid())
    and authorization_contract_test.has_grant('participant', edition_id, null, null, id));
create policy assigned_review on authorization_contract_test.review_packets for select to authenticated
  using (
    ownership_established and authorization_contract_test.has_grant(case track
      when 'research' then 'abstractReviewer'
      when 'hackathon' then 'hackathonReviewer'
      when 'threeMinuteThesis' then 'threeMinuteThesisReviewer'
      else null end, edition_id, track, track_id, id)
    and authorization_contract_test.is_assigned(id, edition_id, track, track_id, 'review')
  );
-- There is deliberately no identity_details client policy.
create policy permitted_purpose on authorization_contract_test.purpose_records for select to authenticated
  using (authorization_contract_test.has_grant(
    authorization_contract_test.purpose_role(purpose), edition_id, null, null, id, purpose));
create policy original_or_presentation on authorization_contract_test.private_metadata for select to authenticated
  using (cleared and (
    (file_class = 'administrativeOriginal'
      and authorization_contract_test.has_grant('superAdmin', edition_id, track, track_id, resource_id))
    or (file_class = 'presentation' and ownership_established
      and authorization_contract_test.has_grant('facultyJudge', edition_id, track, track_id, resource_id)
      and authorization_contract_test.is_assigned(resource_id, edition_id, track, track_id, 'eventJudge'))
  ));

create view authorization_contract_test.sanitized_review
  with (security_invoker = true, security_barrier = true) as
  select id, edition_id, track, track_id, scientific_text from authorization_contract_test.review_packets;
revoke all on authorization_contract_test.sanitized_review from public, anon, authenticated, service_role;
grant select on authorization_contract_test.sanitized_review to authenticated;
create function authorization_contract_test.read_review(required_id text)
returns table (id text, scientific_text text)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.scientific_text from authorization_contract_test.review_packets p where p.id = required_id;
$$;
revoke all on all functions in schema authorization_contract_test from public, anon, authenticated, service_role;
grant execute on all functions in schema authorization_contract_test to authenticated;

insert into authorization_contract_test.actors(user_id)
select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 15) n;
insert into authorization_contract_test.sessions(session_id, user_id,assurance,method,staff_email_verified)
select ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       case when n=13 then 'aal2' else 'aal1' end,
       case when n=13 then 'sms' when n between 2 and 12 then 'email_check' else 'none' end,
       n between 2 and 12 from generate_series(1, 15) n;
insert into authorization_contract_test.role_grants(user_id, role_name, edition_id)
select ('10000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid, role_name, 'synthetic-2027'
from (values
  (1, 'participant'), (2, 'abstractReviewer'), (3, 'hackathonReviewer'),
  (4, 'threeMinuteThesisReviewer'), (5, 'scientificAdministrator'), (6, 'judgingCommittee'),
  (7, 'facultyJudge'), (8, 'registrationWorkshopAdministrator'), (9, 'finance'),
  (10, 'checkInStaff'), (11, 'contentMediaEditor'), (12, 'sponsorshipPr'), (13, 'superAdmin'),
  (15, 'participant')
) as roles(n, role_name);
update authorization_contract_test.role_grants set track = 'research', track_id = 'research-alpha'
where role_name in ('abstractReviewer', 'facultyJudge');
update authorization_contract_test.role_grants set track = 'hackathon', track_id = 'hackathon-alpha'
where role_name = 'hackathonReviewer';
update authorization_contract_test.role_grants set track = 'threeMinuteThesis', track_id = 'thesis-alpha'
where role_name = 'threeMinuteThesisReviewer';
update authorization_contract_test.role_grants set resource_id = case role_name
  when 'judgingCommittee' then 'judging-one' when 'checkInStaff' then 'entry-one'
  when 'contentMediaEditor' then 'content-one' when 'sponsorshipPr' then 'sponsor-one' end
where role_name in ('judgingCommittee', 'checkInStaff', 'contentMediaEditor', 'sponsorshipPr');
update authorization_contract_test.role_grants set function_id = 'financeOperation' where role_name = 'finance';

insert into authorization_contract_test.owned_records values
  ('owned-one', 'synthetic-2027', '10000000-0000-4000-8000-000000000001', 'Synthetic own record'),
  ('owned-other', 'synthetic-2027', '10000000-0000-4000-8000-000000000015', 'Synthetic other record'),
  ('owned-old-edition', 'synthetic-2026', '10000000-0000-4000-8000-000000000001', 'Synthetic old edition');
insert into authorization_contract_test.review_packets values
  ('review-one', 'synthetic-2027', 'research', 'research-alpha', 'Synthetic English scientific text'),
  ('review-unassigned', 'synthetic-2027', 'research', 'research-alpha', 'Synthetic unassigned text'),
  ('review-wrong-track', 'synthetic-2027', 'research', 'research-beta', 'Synthetic different track'),
  ('review-old-edition', 'synthetic-2026', 'research', 'research-alpha', 'Synthetic old edition'),
  ('review-related', 'synthetic-2027', 'research', 'research-alpha', 'Synthetic related-author text'),
  ('hackathon-one', 'synthetic-2027', 'hackathon', 'hackathon-alpha', 'Synthetic project pitch'),
  ('thesis-one', 'synthetic-2027', 'threeMinuteThesis', 'thesis-alpha', 'Synthetic thesis text');
update authorization_contract_test.review_packets set ownership_established = true;
insert into authorization_contract_test.identity_details values
  ('review-one', '10000000-0000-4000-8000-000000000001', 'Synthetic identity must not reach reviewer');
insert into authorization_contract_test.assignments(user_id, resource_id, edition_id, track, track_id, kind)
values
  ('10000000-0000-4000-8000-000000000002', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'review'),
  ('10000000-0000-4000-8000-000000000002', 'review-wrong-track', 'synthetic-2027', 'research', 'research-beta', 'review'),
  ('10000000-0000-4000-8000-000000000002', 'review-old-edition', 'synthetic-2026', 'research', 'research-alpha', 'review'),
  ('10000000-0000-4000-8000-000000000002', 'review-related', 'synthetic-2027', 'research', 'research-alpha', 'review'),
  ('10000000-0000-4000-8000-000000000003', 'hackathon-one', 'synthetic-2027', 'hackathon', 'hackathon-alpha', 'review'),
  ('10000000-0000-4000-8000-000000000004', 'thesis-one', 'synthetic-2027', 'threeMinuteThesis', 'thesis-alpha', 'review'),
  ('10000000-0000-4000-8000-000000000007', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'eventJudge');
update authorization_contract_test.assignments set id = 'review-assignment-one'
where user_id = '10000000-0000-4000-8000-000000000002' and resource_id = 'review-one';
update authorization_contract_test.role_grants set assignment_id = 'review-assignment-one' where role_name = 'abstractReviewer';
update authorization_contract_test.assignments set id = 'review-related-assignment'
where user_id = '10000000-0000-4000-8000-000000000002' and resource_id = 'review-related';
update authorization_contract_test.assignments set id = resource_id || ':' || user_id::text || ':' || kind where id is null;
insert into authorization_contract_test.role_grants(user_id, role_name, edition_id, track, track_id, resource_id, assignment_id)
values ('10000000-0000-4000-8000-000000000002', 'abstractReviewer', 'synthetic-2027', 'research', 'research-alpha', 'review-related', 'review-related-assignment');
insert into authorization_contract_test.related_actors values
  ('review-one', '10000000-0000-4000-8000-000000000001'),
  ('review-related', '10000000-0000-4000-8000-000000000002');
insert into authorization_contract_test.purpose_records values
  ('validation-one', 'synthetic-2027', 'validationOutcome', 'Synthetic validation result without original'),
  ('judging-one', 'synthetic-2027', 'judgingReadiness', 'Synthetic assigned category readiness'),
  ('judging-other', 'synthetic-2027', 'judgingReadiness', 'Synthetic unrelated category'),
  ('registration-one', 'synthetic-2027', 'registrationOperation', 'Synthetic operational purpose'),
  ('finance-one', 'synthetic-2027', 'financeOperation', 'Synthetic financial purpose'),
  ('entry-one', 'synthetic-2027', 'checkInEntry', 'Synthetic minimum entry information'),
  ('entry-other', 'synthetic-2027', 'checkInEntry', 'Synthetic unrelated entry'),
  ('content-one', 'synthetic-2027', 'contentDraft', 'Synthetic assigned draft'),
  ('content-other', 'synthetic-2027', 'contentDraft', 'Synthetic unrelated draft'),
  ('sponsor-one', 'synthetic-2027', 'sponsorInquiry', 'Synthetic sponsor purpose'),
  ('grant-one', 'synthetic-2027', 'roleAdministration', 'Synthetic role administration purpose'),
  ('unknown-one', 'synthetic-2027', 'undefinedPurpose', 'Synthetic undefined purpose');
insert into authorization_contract_test.private_metadata values
  ('original-one', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'administrativeOriginal', true, 'synthetic-private/original'),
  ('original-old', 'review-one', 'synthetic-2026', 'research', 'research-alpha', 'administrativeOriginal', true, 'synthetic-private/old-original'),
  ('quarantined-one', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'administrativeOriginal', false, 'synthetic-private/quarantined'),
  ('presentation-one', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'presentation', true, 'synthetic-private/presentation'),
  ('presentation-other', 'review-unassigned', 'synthetic-2027', 'research', 'research-alpha', 'presentation', true, 'synthetic-private/unassigned-presentation');
update authorization_contract_test.private_metadata set ownership_established = true;

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where relnamespace = 'authorization_contract_test'::regnamespace and relkind = 'r'), 'All fixture tables enable and force RLS');
select ok(not exists(select 1 from pg_proc where pronamespace = 'authorization_contract_test'::regnamespace and prosecdef), 'No SECURITY DEFINER helper bypasses caller privileges');
select ok((select reloptions @> array['security_invoker=true', 'security_barrier=true'] from pg_class where oid = 'authorization_contract_test.sanitized_review'::regclass), 'Reviewer view uses invoker privileges and security barrier');
select columns_are('authorization_contract_test', 'review_packets', array['id', 'edition_id', 'track', 'track_id', 'scientific_text', 'ownership_established'], 'Review packet excludes identities, originals and peer review state');
select ok(not has_function_privilege('anon', 'authorization_contract_test.read_review(text)', 'execute'), 'Anonymous users have no RPC execution grant');
select ok(not has_table_privilege('authenticated', 'authorization_contract_test.role_grants', 'update'), 'Clients cannot update authority grants');
select ok(not has_table_privilege('authenticated', 'authorization_contract_test.sessions', 'update'), 'Clients cannot update trusted sessions');
select ok(not has_table_privilege('anon', 'authorization_contract_test.private_metadata', 'select'), 'Anonymous users have no confidential metadata read grant');
select ok(not has_table_privilege('authenticated', 'authorization_contract_test.private_metadata', 'insert'), 'Clients cannot upload or publish private objects through metadata grants');
select ok(not has_table_privilege('authenticated', 'authorization_contract_test.owned_records', 'update'), 'Write grants are absent independently of RLS');

set local role anon;
select throws_ok($$select * from authorization_contract_test.owned_records$$, '42501', 'permission denied for table owned_records', 'Anonymous direct table requests are denied');
select throws_ok($$select * from authorization_contract_test.sanitized_review$$, '42501', null, 'Anonymous view requests are denied');
select throws_ok($$select * from authorization_contract_test.read_review('review-one')$$, '42501', 'permission denied for function read_review', 'Anonymous RPC requests are denied');
reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000014","session_id":"20000000-0000-4000-8000-000000000014","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}],"user_metadata":{"role":"superAdmin"},"app_metadata":{"role":"superAdmin"}}';
set local role authenticated;
select is((select count(*) from authorization_contract_test.owned_records), 0::bigint, 'Authentication and forged role metadata do not grant owner access');
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Even stale app/JWT role claims cannot grant original access');
select ok(not authorization_contract_test.has_grant('undefinedRole', 'synthetic-2027'), 'Undefined roles default deny');
select is((select count(*) from authorization_contract_test.purpose_records), 0::bigint, 'Authenticated actor without grants receives no operational purpose rows');
reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","aal":"aal1","amr":[{"method":"password"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.owned_records order by id$$, $$values ('owned-one'::text)$$, 'Participant reads own scoped record without privileged MFA');
select is_empty($$select * from authorization_contract_test.owned_records where id = 'owned-other'$$, 'Changed record ID cannot expose another participant');
select is_empty($$select * from authorization_contract_test.owned_records where id = 'owned-old-edition'$$, 'Owned records in an ungranted edition remain denied');
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Participant ownership does not permit original evidence downloads');
select throws_ok($$update authorization_contract_test.owned_records set label = 'Forbidden' where id = 'owned-one'$$, '42501', 'permission denied for table owned_records', 'Owner writes are denied until explicitly granted');
select throws_ok($$update authorization_contract_test.role_grants set role_name = 'superAdmin'$$, '42501', 'permission denied for table role_grants', 'Participant cannot self-escalate trusted grants');
reset role;
-- Temporary write grant proves row policies independently. It also rolls back.
grant update on authorization_contract_test.owned_records to authenticated;
set local role authenticated;
select results_eq($$update authorization_contract_test.owned_records set label = 'Synthetic owner update' where id = 'owned-one' returning id$$, $$values ('owned-one'::text)$$, 'Explicitly granted participant can update their permitted row');
select is_empty($$update authorization_contract_test.owned_records set label = 'Forbidden' where id = 'owned-other' returning id$$, 'Cross-user writes remain denied by RLS after write grants');
select throws_ok($$update authorization_contract_test.owned_records set owner_id = '10000000-0000-4000-8000-000000000015' where id = 'owned-one'$$, '42501', 'new row violates row-level security policy for table "owned_records"', 'WITH CHECK prevents owner reassignment');
select throws_ok($$update authorization_contract_test.owned_records set edition_id = 'synthetic-2026' where id = 'owned-one'$$, '42501', 'new row violates row-level security policy for table "owned_records"', 'WITH CHECK prevents cross-edition reassignment');
reset role;

update authorization_contract_test.actors set phone_verified=false where user_id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from authorization_contract_test.owned_records),0::bigint,'Participant phone verification is required independently of email');
reset role;
update authorization_contract_test.actors set phone_verified=true where user_id='10000000-0000-4000-8000-000000000001';
update authorization_contract_test.sessions set password_verified=false where user_id='10000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from authorization_contract_test.owned_records),0::bigint,'Participant verification cannot replace password primary login');
reset role;
update authorization_contract_test.sessions set password_verified=true where user_id='10000000-0000-4000-8000-000000000001';

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","session_id":"20000000-0000-4000-8000-000000000002","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.review_packets order by id$$, $$values ('review-one'::text)$$, 'Abstract reviewer receives only a permitted assigned sanitized packet');
select ok(not authorization_contract_test.has_grant('abstractReviewer', 'synthetic-2027', 'research', 'research-alpha', 'review-unassigned'), 'Assignment-scoped grant cannot authorize another resource');
select is_empty($$select * from authorization_contract_test.review_packets where id = 'review-unassigned'$$, 'Unassigned direct ID denied');
select is_empty($$select * from authorization_contract_test.review_packets where id = 'review-wrong-track'$$, 'Assignment cannot override a different track grant');
select is_empty($$select * from authorization_contract_test.review_packets where id = 'review-old-edition'$$, 'Assignment cannot override a different edition grant');
select is_empty($$select * from authorization_contract_test.review_packets where id = 'review-related'$$, 'Related author or team membership prevents self-review');
select is((select count(*) from authorization_contract_test.identity_details), 0::bigint, 'Reviewer cannot retrieve identity-bearing base records');
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Reviewer receives no original or presentation object metadata');
select results_eq($$select id from authorization_contract_test.sanitized_review$$, $$values ('review-one'::text)$$, 'Invoker view preserves assigned-row RLS');
select results_eq($$select id from authorization_contract_test.read_review('review-one')$$, $$values ('review-one'::text)$$, 'Invoker RPC permits the same assigned sanitized row');
select is_empty($$select * from authorization_contract_test.read_review('review-unassigned')$$, 'Invoker RPC cannot bypass changed-ID RLS');
select throws_ok($$update authorization_contract_test.assignments set conflicted = false$$, '42501', 'permission denied for table assignments', 'Reviewer cannot clear conflict or assign themselves through SQL');
reset role;
update authorization_contract_test.review_packets set ownership_established = false where id = 'review-one';
set local role authenticated;
select is_empty($$select * from authorization_contract_test.review_packets where id = 'review-one'$$, 'Missing original-owner provenance denies otherwise assigned review access');
reset role;
update authorization_contract_test.review_packets set ownership_established = true where id = 'review-one';

update authorization_contract_test.assignments set conflicted = true where user_id = '10000000-0000-4000-8000-000000000002' and resource_id = 'review-one';
set local role authenticated;
select is_empty($$select * from authorization_contract_test.review_packets where id = 'review-one'$$, 'Conflict denies access with unchanged token');
reset role;
update authorization_contract_test.assignments set conflicted = false, state = 'withdrawn' where user_id = '10000000-0000-4000-8000-000000000002' and resource_id = 'review-one';
set local role authenticated;
select is_empty($$select * from authorization_contract_test.sanitized_review where id = 'review-one'$$, 'Withdrawn assignment also denies view access with unchanged token');
reset role;
update authorization_contract_test.assignments set state = 'active' where user_id = '10000000-0000-4000-8000-000000000002' and resource_id = 'review-one';
insert into authorization_contract_test.assignments(id, user_id, resource_id, edition_id, track, track_id, kind, state, conflicted)
values ('withdrawn-conflict', '10000000-0000-4000-8000-000000000002', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'review', 'withdrawn', true);
set local role authenticated;
select is_empty($$select * from authorization_contract_test.review_packets where id = 'review-one'$$, 'Active duplicate assignment cannot bypass an unresolved withdrawn conflict');
reset role;
delete from authorization_contract_test.assignments where id = 'withdrawn-conflict';
update authorization_contract_test.role_grants set track_id = null where user_id = '10000000-0000-4000-8000-000000000002';
set local role authenticated;
select ok(not authorization_contract_test.has_grant('abstractReviewer', 'synthetic-2027', 'research', null, 'review-one'), 'Missing track scope identifier cannot match a missing resource identifier');
reset role;
update authorization_contract_test.role_grants set track_id = 'research-alpha', assignment_id = '' where user_id = '10000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Empty assignment scope does not become edition-wide access');
reset role;
update authorization_contract_test.role_grants set assignment_id = case when resource_id = 'review-related' then 'review-related-assignment' else 'review-assignment-one' end where user_id = '10000000-0000-4000-8000-000000000002';
-- A separate correct-stage assignment cannot rescue a grant tied to another stage.
insert into authorization_contract_test.assignments(id, user_id, resource_id, edition_id, track, track_id, kind)
values ('wrong-stage-event', '10000000-0000-4000-8000-000000000002', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'eventJudge');
update authorization_contract_test.role_grants set assignment_id = 'wrong-stage-event' where user_id = '10000000-0000-4000-8000-000000000002';
set local role authenticated;
select is_empty($$select * from authorization_contract_test.review_packets where id = 'review-one'$$, 'Review grant tied to event assignment denies despite a separate valid review assignment');
reset role;
update authorization_contract_test.role_grants set assignment_id = case when resource_id = 'review-related' then 'review-related-assignment' else 'review-assignment-one' end where user_id = '10000000-0000-4000-8000-000000000002';
delete from authorization_contract_test.assignments where id = 'wrong-stage-event';

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000003","session_id":"20000000-0000-4000-8000-000000000003","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.review_packets$$, $$values ('hackathon-one'::text)$$, 'Hackathon reviewer receives only assigned project packet');
reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000004","session_id":"20000000-0000-4000-8000-000000000004","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.review_packets$$, $$values ('thesis-one'::text)$$, '3MT reviewer receives only distinct assigned thesis packet');
reset role;

set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000005","session_id":"20000000-0000-4000-8000-000000000005","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.purpose_records$$, $$values ('validation-one'::text)$$, 'Scientific administrator receives safe validation outcomes');
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Scientific administrator cannot retrieve original evidence metadata');
reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000006","session_id":"20000000-0000-4000-8000-000000000006","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.purpose_records$$, $$values ('judging-one'::text)$$, 'Judging committee is limited to its assigned readiness category');
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Judging committee does not inherit abstract reviewer privileges');
reset role;
update authorization_contract_test.role_grants set resource_id = null where role_name = 'judgingCommittee';
set local role authenticated;
select is((select count(*) from authorization_contract_test.purpose_records), 0::bigint, 'Edition-only judging grant cannot authorize all categories');
reset role;
update authorization_contract_test.role_grants set resource_id = 'judging-one' where role_name = 'judgingCommittee';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000007","session_id":"20000000-0000-4000-8000-000000000007","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.private_metadata$$, $$values ('presentation-one'::text)$$, 'Faculty judge receives only cleared assigned presentation metadata');
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Faculty judge does not inherit pre-event review access');
select ok(not authorization_contract_test.is_assigned('review-one', 'synthetic-2027', null, null, 'eventJudge'), 'Null track identifiers cannot form an event judging assignment');
reset role;
update authorization_contract_test.private_metadata set ownership_established = false where id = 'presentation-one';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Missing original-owner provenance denies assigned presentation access');
reset role;
update authorization_contract_test.private_metadata set ownership_established = true where id = 'presentation-one';
insert into authorization_contract_test.assignments(id, user_id, resource_id, edition_id, track, track_id, kind)
values ('wrong-stage-review', '10000000-0000-4000-8000-000000000007', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'review');
update authorization_contract_test.role_grants set assignment_id = 'wrong-stage-review' where role_name = 'facultyJudge';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Faculty grant tied to review assignment denies despite a separate valid event assignment');
reset role;
update authorization_contract_test.role_grants set assignment_id = null where role_name = 'facultyJudge';
delete from authorization_contract_test.assignments where id = 'wrong-stage-review';
update authorization_contract_test.assignments set track_id = null where user_id = '10000000-0000-4000-8000-000000000007';
update authorization_contract_test.private_metadata set track_id = null where id = 'presentation-one';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Malformed null assignment and material track identifiers remain denied');
reset role;
update authorization_contract_test.assignments set track_id = 'research-alpha' where user_id = '10000000-0000-4000-8000-000000000007';
update authorization_contract_test.private_metadata set track_id = 'research-alpha' where id = 'presentation-one';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000008","session_id":"20000000-0000-4000-8000-000000000008","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.purpose_records$$, $$values ('registration-one'::text)$$, 'Registration administrator receives only its operational purpose');
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Registration administrator cannot read scientific packets');
reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000009","session_id":"20000000-0000-4000-8000-000000000009","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.purpose_records$$, $$values ('finance-one'::text)$$, 'Finance receives only the financial purpose');
select ok(not authorization_contract_test.has_grant('finance', 'synthetic-2027', null, null, 'finance-one', 'differentFunction'), 'Function-scoped grant cannot authorize a different operational function');
select is((select count(*) from authorization_contract_test.identity_details), 0::bigint, 'Finance cannot export private identity-bearing profiles');
reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000010","session_id":"20000000-0000-4000-8000-000000000010","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.purpose_records$$, $$values ('entry-one'::text)$$, 'Check-in staff receives only assigned minimum entry purpose');
select is((select count(*) from authorization_contract_test.owned_records), 0::bigint, 'Check-in staff cannot browse participant records');
reset role;
update authorization_contract_test.role_grants set resource_id = null where role_name = 'checkInStaff';
set local role authenticated;
select is((select count(*) from authorization_contract_test.purpose_records), 0::bigint, 'Edition-only check-in grant cannot authorize every day or workshop');
reset role;
update authorization_contract_test.role_grants set resource_id = 'entry-one' where role_name = 'checkInStaff';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000011","session_id":"20000000-0000-4000-8000-000000000011","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.purpose_records$$, $$values ('content-one'::text)$$, 'Content editor receives only assigned draft purpose');
select ok(authorization_contract_test.purpose_role('publishMedia') is null, 'Content editing does not imply media publication approval');
reset role;
update authorization_contract_test.role_grants set resource_id = null where role_name = 'contentMediaEditor';
set local role authenticated;
select is((select count(*) from authorization_contract_test.purpose_records), 0::bigint, 'Edition-only editing grant cannot authorize every public draft');
reset role;
update authorization_contract_test.role_grants set resource_id = '' where role_name = 'contentMediaEditor';
set local role authenticated;
select is((select count(*) from authorization_contract_test.purpose_records), 0::bigint, 'Empty resource scope remains denied');
reset role;
update authorization_contract_test.role_grants set resource_id = 'content-one' where role_name = 'contentMediaEditor';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000012","session_id":"20000000-0000-4000-8000-000000000012","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.purpose_records$$, $$values ('sponsor-one'::text)$$, 'Sponsorship/PR receives only its permitted inquiry purpose');
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Sponsorship access never implies scientific access');
reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000013","session_id":"20000000-0000-4000-8000-000000000013","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select results_eq($$select id from authorization_contract_test.private_metadata$$, $$values ('original-one'::text)$$, 'Scoped MFA Super Admin receives cleared original evidence only');
select results_eq($$select id from authorization_contract_test.purpose_records$$, $$values ('grant-one'::text)$$, 'Super Admin has explicit role administration purpose, not all duties');
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Super Admin label does not imply reviewer assignments');
reset role;

-- Live-state changes below retain the exact same simulated access token.
update authorization_contract_test.role_grants set state = 'revoked' where user_id = '10000000-0000-4000-8000-000000000013';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Revoked grant denies original access with old token');
reset role;
update authorization_contract_test.role_grants set state = 'active' where user_id = '10000000-0000-4000-8000-000000000013';
update authorization_contract_test.sessions set active = false where user_id = '10000000-0000-4000-8000-000000000013';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Revoked current session denies unchanged-token access');
reset role;
update authorization_contract_test.sessions set active = true where user_id = '10000000-0000-4000-8000-000000000013';
update authorization_contract_test.actors set active = false where user_id = '10000000-0000-4000-8000-000000000013';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Suspended actor denies unchanged-token access');
reset role;
update authorization_contract_test.actors set active = true, individually_identified = false where user_id = '10000000-0000-4000-8000-000000000013';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Unidentified shared staff actor cannot use privileged grants');
reset role;
update authorization_contract_test.actors set individually_identified = true where user_id = '10000000-0000-4000-8000-000000000013';
update authorization_contract_test.sessions set assurance = 'aal1' where user_id = '10000000-0000-4000-8000-000000000013';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'JWT AAL2 claim cannot override a downgraded trusted session');
reset role;
update authorization_contract_test.sessions set assurance = 'aal2', method = 'email' where user_id = '10000000-0000-4000-8000-000000000013';
set local role authenticated;
select is((select count(*) from authorization_contract_test.private_metadata), 0::bigint, 'Email verification is not the required SMS second factor');
reset role;
update authorization_contract_test.sessions set method = 'sms' where user_id = '10000000-0000-4000-8000-000000000013';

update authorization_contract_test.sessions set staff_email_verified=false where user_id='10000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","session_id":"20000000-0000-4000-8000-000000000002","aal":"aal1","amr":[{"method":"password"}]}';
set local role authenticated;
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Reviewer password without trusted application email check receives no packet');
reset role;
update authorization_contract_test.sessions set staff_email_verified=true where user_id='10000000-0000-4000-8000-000000000002';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000002","session_id":"20000000-0000-4000-8000-000000000001","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
set local role authenticated;
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Another actor session ID cannot satisfy current identity');
reset role;
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","aal":"aal2","amr":[{"method":"password"},{"method":"mfa/phone"}]}';
insert into authorization_contract_test.role_grants(user_id, role_name, edition_id, track, track_id)
values ('10000000-0000-4000-8000-000000000001', 'abstractReviewer', 'synthetic-2027', 'research', 'research-alpha');
insert into authorization_contract_test.assignments(id, user_id, resource_id, edition_id, track, track_id, kind)
values ('owner-review-assignment', '10000000-0000-4000-8000-000000000001', 'review-one', 'synthetic-2027', 'research', 'research-alpha', 'review');
set local role authenticated;
select is((select count(*) from authorization_contract_test.owned_records), 0::bigint,
  'Adding a reviewer role requires the stronger staff check even for participant-owned records');
reset role;
-- Grant promotion requires fresh synthetic application proof before assessing the separate conflict boundary.
update authorization_contract_test.sessions set method='email_check',staff_email_verified=true
  where user_id='10000000-0000-4000-8000-000000000001';
set local request.jwt.claims = '{"sub":"10000000-0000-4000-8000-000000000001","session_id":"20000000-0000-4000-8000-000000000001","aal":"aal1","amr":[{"method":"password"}]}';
set local role authenticated;
select is((select count(*) from authorization_contract_test.review_packets), 0::bigint, 'Additive participant and reviewer grants cannot override own-work conflict');
select results_eq($$select id from authorization_contract_test.owned_records$$, $$values ('owned-one'::text)$$, 'Own-work review denial does not remove permitted participant access');
select is((select count(*) from authorization_contract_test.purpose_records), 0::bigint, 'Combined roles do not acquire unrelated operational purposes');
reset role;
update authorization_contract_test.actors set verified = false where user_id = '10000000-0000-4000-8000-000000000001';
set local role authenticated;
select is((select count(*) from authorization_contract_test.owned_records), 0::bigint, 'Unverified actor cannot use a participation grant');
reset role;

select is((select count(*) from public.foundation_samples), 2::bigint, 'Original M1 sample rows remain intact');
select ok(not has_table_privilege('authenticated', 'public.foundation_samples', 'update'), 'Original M1 client write denial remains intact');
select * from finish();
rollback;
