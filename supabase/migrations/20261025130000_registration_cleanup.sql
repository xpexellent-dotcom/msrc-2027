-- ENG-081. The legacy waitlist_offer_hours field is unused (offer_window_hours
-- governs offers), so it no longer gates registration readiness. The column is
-- kept for history and stays editable through the existing settings RPC.
begin;

create or replace function msrc_registration.settings_complete(edition text) returns boolean
 language sql stable security definer set search_path='' as $$
 select coalesce((select s.terms_version is not null and s.payment_required is not null and s.general_capacity is not null
 and s.early_access_start_at is not null and s.early_access_end_at is not null
 and s.priority_start_at is not null and s.priority_end_at is not null and s.general_opening_at is not null and s.closing_at is not null
 and s.confirm_seat_lead_days is not null and s.confirm_seat_response_hours is not null
 and s.places_remaining_threshold is not null and s.minimum_age=18 and (s.payment_required=false or s.payment_window_hours is not null)
 from msrc_registration.settings s where s.edition_key=edition),false);
$$;
comment on column msrc_registration.settings.waitlist_offer_hours is 'ENG-081: retired legacy field; not required for readiness. Offers use offer_window_hours.';

commit;
