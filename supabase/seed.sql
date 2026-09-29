-- INF-02 / INF-04: generic synthetic fixtures only. Never seed real participants.
insert into public.foundation_samples (id, label, is_public)
values
  ('00000000-0000-4000-8000-000000000001', 'Synthetic public foundation sample', true),
  ('00000000-0000-4000-8000-000000000002', 'Synthetic hidden foundation sample', false)
on conflict (id) do update
set label = excluded.label, is_public = excluded.is_public;
