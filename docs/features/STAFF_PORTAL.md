# Closed staff portal foundation

BL-AUTH-01, BL-AUTH-05/06 staff parts, BL-RPT-01/03; AUTH-04/05,
ROL-01/07/10/12, ADM-01/02/04/05, LOC-01/03, SEC-01/02/06.
Organizer decisions: ORG-043/044/045 in [DECISIONS](../DECISIONS.md).

The portal is closed by default behind server-only `STAFF_PORTAL_ENABLED` and
independent private database readiness. Pages return 404 while the server gate
is closed; the API fails closed before inspecting credentials or constructing
providers. No public navigation link or staff sign-up exists. Staff use separate
encrypted HttpOnly cookies; participant cookies cannot authenticate staff. Staff
routes are noindex, excluded from robots and public analytics, and use an internal
shell. Non-review screens support EN/AR and RTL; reviewer/faculty-judge assessment
areas remain English-only. Unbuilt operational areas are permission-scoped
"coming soon" entries; they do not open their domain workflows.

## Authentication and membership

Native Supabase verifies password identity; private database evidence supplies
the current strongest tier across editions. Regular staff complete #25's exact
session email check. Super Admins enroll/verify native authenticator TOTP, using
a generated QR code with a manual setup alternative. The native session origin
is immutable: privileged idle expiry is 30 minutes and absolute expiry is eight
hours. Refresh does not restart either clock. Current account suspension, grant
history, session revocation, password changes and native factor state are checked
again on privileged requests. Client menus and JWT role labels are not authority.

Invitations use 256-bit random bearer tokens, stored only as keyed hashes. The
English email has one invitation link with the token in its fragment, a 72-hour
expiry and the existing `MSRC 2027 <no-reply@msrc2027.com>` sender. The browser
removes the fragment from history after reading it. Resends replace outstanding
links; revocation, expiry and consumed-link replay deny. Password setting uses a
private reservation bound to the exact actor/email and native transaction, then
requires a new password login and the appropriate second step. Public native
signup and alternate passwordless/recovery paths stay denied.

People/roles and immutable audit access require Super Admin assurance. The
participant account projection requires Super Admin or an edition-scoped
registration/workshop administrator. It searches only the private name/email
projection and shows status/creation time. There is no export API. The masking
component accepts a masked value; future full reveal must call the Super Admin
audited boundary. The current database has no registration identifier field, so
reveal records an unavailable result and returns no identifier. This does not
claim registration encryption/storage/retention has been built.

The minimum-two and self-protection controls run in the database, with serialized
role/status mutations. Recovery revokes sessions before native provider work;
only another Super Admin can reset a Super Admin's authenticator or account.
Provider failures preserve denial and an audit result. Audit projections exclude
passwords, native tokens, invitation digests, codes and provider payloads.

## Activation procedure — document only; not executed

Do not use a blanket hosted `db reset`, seed or migration push. A named operator
must inspect actual migration history, backups, the current exact SQL revisions
and native Auth guards before applying only the reviewed missing migrations.
The organizer reports only persisted authorization and Contact counters applied
today. The order below respects dependencies; application merge is separate from
hosted migration application.

| Order | Migration | State in this task |
| --- | --- | --- |
| Prerequisite | `20261002173712_persisted_authorization.sql` | Already applied per organizer; reverify, do not reapply |
| 1 (#25) | `20261002193800_staff_mfa_session_foundations.sql` | Pending; native session policy |
| 2 (#25) | `20261002233353_regular_staff_email_check.sql` | Pending; session email receipts and native guards |
| 3 (#25) | `20261003110812_authenticator_super_admin_policy.sql` | Pending; current strongest tier and TOTP |
| 4 (#25) | `20261003180734_readonly_authentication_context.sql` | Pending; readonly access evidence |
| Existing | `20261004114603_contact_abuse_counters.sql` | Already applied per organizer; independent, do not reapply |
| 5 (#39) | `20261004164034_participant_accounts.sql` | Pending; prerequisite identity/admission compatibility; accounts stay closed |
| 6 | `20261006224926_staff_portal_foundation.sql` | New review-only private staff foundation; policy defaults false |

`20260929143136_foundation_samples.sql` is a synthetic development fixture;
do not deploy its sample data to Production. Reconcile hosted history explicitly
rather than marking unexecuted migrations as applied. Review the existing narrow
SECURITY DEFINER advisor findings and every new ACL/forced-RLS finding without
widening grants to silence a warning. Verify denial using public/native endpoints
and stale signed sessions, not only the application interface.

Supply these variables privately in Vercel **Production only**, with the flag
false until bootstrap/UAT and database release readiness are approved:

| Variable | Required value |
| --- | --- |
| `STAFF_PORTAL_ENABLED` | Unset/false now; exactly `true` only at authorized activation |
| `STAFF_AUTH_SECURITY_SECRET` | Stable private random 32-byte secret encoded as 64 hex characters; custodied/rotated securely |
| `STAFF_SUPABASE_URL` | `https://ecemjggwlzqpjcwmchrl.supabase.co` |
| `STAFF_SUPABASE_PUBLISHABLE_KEY` | That project's modern `sb_publishable_...` key |
| `STAFF_SUPABASE_SECRET_KEY` | That project's private `sb_secret_...` key; never browser-bundled |
| `STAFF_EDITION_KEY` | The reviewed current edition identifier used by persisted grants |
| `STAFF_AUTH_EMAIL_DAILY_LIMIT` | Approved staff send cap, exactly matching `msrc_staff.policy.email_daily_limit` |
| `RESEND_API_KEY` | Existing verified-domain sending key, privately stored |

Never enable `STAFF_PORTAL_TEST_MODE` on Vercel. It accepts only the fixed loopback
synthetic app/provider and dummy credentials. Preview deployments must remain
closed; a production URL, public variable or client role cannot enable the portal.

Confirm native email/password authentication, email confirmation, disabled public
signup, anonymous/social/passwordless/phone/SMS entry, and the reviewed native
email/token suppression guards. Configure the managed **Send Email** database
hook to `msrc_participant.suppress_native_email(jsonb)`, whose new revision
suppresses native mail for both participant and reserved/admitted staff identities.
Keep its existing narrow `supabase_auth_admin` execution grant; verify that raw
staff recovery, magic-link, OTP, email-change and phone-change requests retain
no native tokens and reach no delivery provider. The app owns Resend invite/code delivery. Keep
participant and operational flags false; applying the participant prerequisite
does not approve participant activation or its pending retention cleanup. Set
the native password minimum to the approved ten-character policy during separate
activation and verify application ten-codepoint/72-byte validation, including
Arabic and legacy password sign-in. Verify sender domain/key custody and actual
Resend account quota without changing DNS in this implementation task.

Use the [operator bootstrap procedure](STAFF_BOOTSTRAP.md) and
[`scripts/bootstrap-first-staff.ts`](../../scripts/bootstrap-first-staff.ts), passing the
first designated person's verified email privately. The names/order are recorded
only in ORG-043; use the first person there for bootstrap and the second person
for the portal invitation. Supply a one-time strong password privately and require
authenticator enrollment on first sign-in. The first account can invite the second
through the portal; the second sets their own password and enrolls their own
authenticator. Confirm distinct account IDs, verified factors, active edition
Super Admin grants and mutual recovery before allowing wider administration.
No operator credential, person name or email belongs in the repository or logs.

Review `msrc_staff.policy` while disabled. Set its approved email cap, then enable
the staff database readiness only for the separately authorized bootstrap/rehearsal
window, followed by the server flag and redeploy. Existing generic operational
readiness remains false; staff portal readiness does not open any other domain.
The first-account bootstrap is one-time and must not be repurposed for recovery.

## Email volume and final gates

Each staff invitation/resend/account-recovery invitation consumes one email.
Each new regular staff password session needs one email code; resends add sends.
Super Admin TOTP login/enrollment/reset uses no email code; inviting the second
Super Admin still consumes one invitation. Bootstrap sends no email itself.
Forecast daily volume as invitations + invitation resends + regular-staff logins
+ code resends + account-recovery invitations. Add Contact, participant and all
other consumers to the same provider total. Source planning staff counts are not
approved demand or sending capacity.

On 7 October 2026, Resend's published Free limit is 100 emails per UTC day and
3,000 per month, with a team-wide initial rate of ten requests/second. Inbound
mail also consumes quota. Actual account plan/remaining quota must be verified
at activation. Contact's existing 60/day cap leaves at most 40/day for **all**
authentication/invitation and other consumers on Free. The staff cap is shared by
staff invitations and staff codes; separate keys do not create independent team
quota. Approve a combined daily/monthly forecast and sum of hard caps before
opening; this task purchases no plan. [Resend quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits).

Required final evidence: exact migration/ACL/RLS/native-Auth/concurrency tests,
approved processing/retention and identity-review recovery procedure, email cap
matching, verified sender/inbox receipt, two distinct enrolled Super Admins,
stale-session denial after role/status/reset changes, EN/AR mobile/keyboard/RTL/
axe/screen-reader UAT, and an actual mutual-recovery rehearsal. Recent-auth age
and timeout-warning policy remain independent unresolved settings from #25;
the current strongest assurance is required on every privileged portal action.
Do not describe synthetic browser/provider evidence as human inbox or recovery UAT.

Rollback: disable database staff readiness, set the server flag false and redeploy;
revoke staff sessions as authorized. Preserve immutable audit/migration history.
For a failed native reset, keep the target denied and let the other Super Admin
retry through the audited procedure. Schema removal or restoring grants requires
a separately reviewed corrective migration. Checks/receipts belong in PROGRESS.
