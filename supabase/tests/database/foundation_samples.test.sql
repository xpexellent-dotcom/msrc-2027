-- SEC-01 / SEC-02 / REL-06: test grants and RLS separately using synthetic rows.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(20);

truncate public.foundation_samples;
insert into public.foundation_samples (id, label, is_public)
values
  ('00000000-0000-4000-8000-000000000001', 'Synthetic public test sample', true),
  ('00000000-0000-4000-8000-000000000002', 'Synthetic hidden test sample', false);

select has_table('public', 'foundation_samples', 'The foundation fixture exists');
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class
   where oid = 'public.foundation_samples'::regclass),
  'RLS is enabled and forced'
);

set local role anon;
select is((select count(*) from public.foundation_samples), 1::bigint, 'Anonymous reads see only the public sample');
select is((select count(*) from public.foundation_samples where not is_public), 0::bigint, 'Anonymous direct queries cannot read hidden samples');
select throws_ok(
  $$insert into public.foundation_samples (id, label, is_public) values ('00000000-0000-4000-8000-000000000003', 'Forbidden', true)$$,
  '42501', 'permission denied for table foundation_samples', 'Anonymous INSERT is denied by grants'
);
select throws_ok(
  $$update public.foundation_samples set label = 'Forbidden'$$,
  '42501', 'permission denied for table foundation_samples', 'Anonymous UPDATE is denied by grants'
);
select throws_ok(
  $$delete from public.foundation_samples$$,
  '42501', 'permission denied for table foundation_samples', 'Anonymous DELETE is denied by grants'
);

reset role;
set local role authenticated;
select is((select count(*) from public.foundation_samples), 1::bigint, 'Authentication alone does not broaden reads');
select is((select count(*) from public.foundation_samples where not is_public), 0::bigint, 'Authenticated direct queries cannot read hidden samples');
select throws_ok(
  $$insert into public.foundation_samples (id, label, is_public) values ('00000000-0000-4000-8000-000000000003', 'Forbidden', true)$$,
  '42501', 'permission denied for table foundation_samples', 'Authenticated INSERT is denied by grants'
);
select throws_ok(
  $$update public.foundation_samples set label = 'Forbidden'$$,
  '42501', 'permission denied for table foundation_samples', 'Authenticated UPDATE is denied by grants'
);
select throws_ok(
  $$delete from public.foundation_samples$$,
  '42501', 'permission denied for table foundation_samples', 'Authenticated DELETE is denied by grants'
);
set local request.jwt.claims = '{"role":"authenticated","user_metadata":{"role":"super_admin","is_admin":true}}';
select is((select count(*) from public.foundation_samples where not is_public), 0::bigint, 'User-editable metadata cannot grant privileged access');

-- Grant writes only inside this transaction to prove that RLS denies them independently.
reset role;
grant insert, update, delete on public.foundation_samples to anon, authenticated;

set local role anon;
select throws_ok(
  $$insert into public.foundation_samples (id, label, is_public) values ('00000000-0000-4000-8000-000000000003', 'Forbidden', true)$$,
  '42501', 'new row violates row-level security policy for table "foundation_samples"', 'RLS independently blocks anonymous INSERT'
);
select is_empty($$update public.foundation_samples set label = 'Forbidden' returning id$$, 'RLS independently blocks anonymous UPDATE');
select is_empty($$delete from public.foundation_samples returning id$$, 'RLS independently blocks anonymous DELETE');

reset role;
set local role authenticated;
select throws_ok(
  $$insert into public.foundation_samples (id, label, is_public) values ('00000000-0000-4000-8000-000000000003', 'Forbidden', true)$$,
  '42501', 'new row violates row-level security policy for table "foundation_samples"', 'RLS independently blocks authenticated INSERT'
);
select is_empty($$update public.foundation_samples set label = 'Forbidden' returning id$$, 'RLS independently blocks authenticated UPDATE');
select is_empty($$delete from public.foundation_samples returning id$$, 'RLS independently blocks authenticated DELETE');

reset role;
select results_eq(
  $$select label from public.foundation_samples order by id$$,
  $$values ('Synthetic public test sample'::text), ('Synthetic hidden test sample'::text)$$,
  'Denied writes leave both samples unchanged'
);
select * from finish();
rollback;
