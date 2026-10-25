-- ENG-083. Participant account flow follow-up (owner request, 25 Oct 2026).
-- 1. A new email code for the same address waits 2 minutes (was 60 seconds).
-- 2. Staff can open one participant's complete record from the participants list.
begin;

create or replace function public.msrc_participant_email_begin(email text,purpose text,challenge_id uuid,code_hash text,email_hash text,ip_hash text,name text default null,privacy_version text default null)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 select u.id into actor from auth.users u where u.email=msrc_participant_email_begin.email for update;
 if actor is not null and (not msrc_participant.age_proven(actor) or not msrc_participant.within_verification_window(actor)) then
 return jsonb_build_object('state','denied');end if;
 -- ENG-083: one code per address every 2 minutes; the legacy limits (3 per 15 minutes) still apply.
 if exists(select 1 from msrc_participant.limit_events e where e.kind='issue_email' and e.subject_hash=msrc_participant_email_begin.email_hash
 and e.occurred_at>clock_timestamp()-interval '120 seconds') then return jsonb_build_object('state','denied');end if;
 return msrc_participant.legacy_email_begin(email,purpose,challenge_id,code_hash,email_hash,ip_hash,name,privacy_version);
end$$;

-- Full participant record for staff who can already list participants. The
-- identity document stays masked; the existing audited reveal flow is unchanged.
create function public.msrc_staff_participant_detail(edition_key text,target uuid) returns jsonb
 language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb;
begin
 if msrc_staff.authorize(edition_key,array['superAdmin','registrationWorkshopAdministrator'],false) is null then
 perform msrc_staff.record(edition_key,'participants_read',target,'denied');return jsonb_build_object('state','denied');end if;
 select jsonb_build_object(
 'actorId',p.actor_id,'name',p.name,'email',u.email,
 'status',case when a.state='suspended' then 'suspended' when u.email_confirmed_at is null then 'unverified' else 'verified' end,
 'createdAt',p.created_at,'verifiedAt',u.email_confirmed_at,'lastSignInAt',u.last_sign_in_at,
 'privacyVersion',p.privacy_version,'ageConfirmedAt',p.age_attested_at,
 'registration',(select jsonb_build_object('status',r.status,'createdAt',r.created_at,'decidedAt',r.decided_at,'identityMasked',r.identity_masked,
 'ticket',(select jsonb_build_object('reference',upper(substr(replace(t.id::text,'-',''),1,12)),'status',t.status,'issuedAt',t.issued_at) from msrc_registration.tickets t where t.request_id=r.id),
 'attendance',(select coalesce(jsonb_agg(jsonb_build_object('day',d.conference_day,'checkedInAt',d.checked_in_at,'method',d.method) order by d.conference_day),'[]'::jsonb)
 from msrc_registration.tickets t join msrc_registration.attendance d on d.ticket_id=t.id where t.request_id=r.id and d.undone_at is null))
 from msrc_registration.requests r where r.actor_id=p.actor_id and r.edition_key=edition_key),
 'workshops',(select coalesce(jsonb_agg(jsonb_build_object('title',w.title_en,'titleAr',w.title_ar,'startAt',w.start_at,'status',b.status,'requestedAt',b.requested_at,'checkedInAt',b.checked_in_at,'completedAt',b.completed_at) order by w.start_at,b.id),'[]'::jsonb)
 from msrc_workshops.bookings b join msrc_workshops.workshops w on w.id=b.workshop_id where b.actor_id=p.actor_id and w.edition_key=edition_key),
 'submissions',(select coalesce(jsonb_agg(jsonb_build_object('reference',s.reference,'title',s.document->>'title','status',s.status,'createdAt',s.created_at) order by s.created_at,s.id),'[]'::jsonb)
 from msrc_abstracts.submissions s where s.actor_id=p.actor_id and s.edition_key=edition_key),
 'competitions',(select coalesce(jsonb_agg(jsonb_build_object('kind',e.kind,'title',e.document->>'title','status',e.status,'isLead',r.is_lead,'confirmed',r.confirmed,'createdAt',e.created_at) order by e.created_at,e.id),'[]'::jsonb)
 from msrc_competitions.roster r join msrc_competitions.entries e on e.id=r.entry_id where r.actor_id=p.actor_id and e.edition_key=edition_key),
 'hackathonProfile',(select jsonb_build_object('university',h.university,'fieldOfStudy',h.field_of_study,'phone',h.phone,'enrolled',h.enrolled_in_saudi_university)
 from msrc_competitions.hackathon_profiles h where h.actor_id=p.actor_id and h.edition_key=edition_key),
 'certificates',(select coalesce(jsonb_agg(jsonb_build_object('kind',c.kind,'activity',c.activity,'status',c.status,'issuedAt',c.issued_at) order by c.issued_at nulls last,c.id),'[]'::jsonb)
 from msrc_certificates.certificates c where c.actor_id=p.actor_id and c.edition_key=edition_key))
 into result
 from msrc_participant.profiles p join auth.users u on u.id=p.actor_id join msrc_authorization.account_access a on a.actor_id=p.actor_id
 where p.actor_id=target and u.deleted_at is null;
 if result is null then return jsonb_build_object('state','not_found');end if;
 perform msrc_staff.record(edition_key,'participants_read',target,'allowed');
 return jsonb_build_object('state','ready','participant',result);
end$$;
revoke all on function public.msrc_staff_participant_detail(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.msrc_staff_participant_detail(text,uuid) to authenticated;

-- Own account details for the signed-in participant's profile page (no other person's data).
create function public.msrc_participant_account_details() returns jsonb
 language sql stable security definer set search_path='' as $$
 select jsonb_build_object('email',u.email,'createdAt',p.created_at) from auth.users u join msrc_participant.profiles p on p.actor_id=u.id
 where u.id=auth.uid() and p.state='verified' and u.deleted_at is null;
$$;
revoke all on function public.msrc_participant_account_details() from public,anon,authenticated,service_role;
grant execute on function public.msrc_participant_account_details() to authenticated;

notify pgrst,'reload schema';
commit;
