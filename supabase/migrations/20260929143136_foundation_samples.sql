-- INF-02 / INF-04 / SEC-01 / SEC-02: M1 synthetic fixture, not operational data.
create table public.foundation_samples (
  id uuid primary key,
  label text not null check (char_length(label) between 1 and 160),
  is_public boolean not null default false
);

comment on table public.foundation_samples is
  'M1 synthetic development fixture only. No participant or conference data.';

alter table public.foundation_samples enable row level security;
alter table public.foundation_samples force row level security;

-- Do not depend on historical Supabase default grants, including privileged API access.
revoke all on table public.foundation_samples from public, anon, authenticated, service_role;
grant usage on schema public to anon, authenticated;
grant select on table public.foundation_samples to anon, authenticated;

create policy "Read public synthetic foundation samples"
  on public.foundation_samples
  for select
  to anon, authenticated
  using (is_public = true);

-- Deliberately no INSERT, UPDATE or DELETE policies or client write grants.
