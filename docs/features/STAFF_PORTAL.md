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

ORG-055 adds the closed [registration queue backend](REGISTRATION.md#staff-queue-slice-3--org-055)
and exact UI contract for the parallel console branch: registration reads and
approval/waitlisting for registrars/Super Admins, organizing-team priority only for
Super Admins, and aggregate home counts scoped to readable areas. Existing staff
gates and session guarantees remain mandatory. Participant registration does not
open as a consequence. The backend-only worktree needs the planner's EN/AR screen,
menu and client changes before its expanded contract can typecheck/build with UI.

## Authentication and membership

Native Supabase verifies password identity; private database evidence supplies
the current strongest tier across editions. Regular staff complete #25's exact
session email check. Super Admins enroll/verify native authenticator TOTP, using
a generated QR code with a manual setup alternative. The native session origin
is immutable: privileged idle expiry is 30 minutes and absolute expiry is eight
hours. Refresh does not restart origin or count as activity. Current account suspension, grant
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
component accepts a masked value; full reveal calls the Super Admin audited
boundary. The original staff migration has no registration identifier field.
The separate closed [registration foundation](REGISTRATION.md) adds protected
storage, masked projection and a reason-bearing reveal overload in its own pending
migration. Until that independently reviewed change is applied and data exists,
no identifier is available. Legacy reasonless calls never return a number.
Registration activation and its later purge/backup/restore gates remain separate.

The minimum-two and self-protection controls run in the database, with serialized
role/status mutations. Recovery revokes sessions before native provider work;
only another Super Admin can reset a Super Admin's authenticator or account.
Recovery commits a private persistent hold before calling the provider. The hold
denies portal password admission, current and readonly session/authority contexts,
staff email assurance and native authenticator enrollment/verification. A native
password may still prove identity; it cannot grant staff access. Failure, an
interrupted callback, token refresh, role maintenance, account reactivation, or
expiry of the five-minute provider reservation never releases the hold.

The other Super Admin can retry the same recovery mode with a new operation.
An incomplete account reset cannot be downgraded to a factor-only reset while
the old password may remain valid. A successful factor-only reset allows fresh
authenticator enrollment. A successful full account reset stays held until the
current operation's fresh single-use invitation completes native password setting;
failed delivery, invitation revocation/expiry and older completion callbacks keep
access denied. The current operation pointer is checked under the serialized
authority/account locks. Recovery does not suspend accounts or reduce the active
Super Admin minimum. Expired interrupted operations receive a terminal audit when
the other administrator authorizes a retry. Provider failures preserve an audit result. Audit projections exclude
passwords, native tokens, invitation digests, codes and provider payloads.

## 16 October hardening — local implementation, pending release

[ENG-044](../DECISIONS.md#eng-044--staff-sessions-and-shared-network-hardening-16-october-2026)
records the current request and limits. Periodic real navigation and user input
report activity through an explicit same-origin, CSRF-protected POST while the
native session, current assurance and both deadlines remain valid. Ordinary
background polling/status reads only observe; they cannot keep an abandoned
session alive. The required regression is two hours of read-only staff work with
periodic navigation/interaction, alongside 30-minute inactivity and eight-hour
absolute expiry. This does not open an operational module.
The POST uses the existing `msrc_session_activity` RPC/execute ACL with current
staff authorization; participant activity retains its existing non-touching
context. No new client execute or private schema/table grant is introduced.

Privileged actions persist provider-rotated tokens in the encrypted cookie.
Refresh failure denies authority. Sign-out validates the request origin, clears
the local cookie even with a stale form token, exhausted rate limits, closed
readiness or unavailable provider/database, and tries database and provider
revocation independently. An expired access token may refresh only for that
revocation. Without valid application configuration, the dedicated same-origin
logout header clears the two fixed cookie names without credential inspection
or provider construction; remote revocation cannot then be attempted. Failed
remote revocation is a partial remote outcome; local sign-out still completes.

| Abuse boundary | Current bound | Rationale |
| --- | --- | --- |
| Form admissions / IP | 12,000 / rolling hour | 100 synthetic staff × [one activity report + one administrative action]/minute. |
| Password attempts / IP | 300 / rolling hour | 100 synthetic staff × three sign-in/reconnect attempts/hour. |
| Email-code issues / IP | 300 / rolling hour | The same campus cohort can complete its exact-session checks. |
| Password failures / account | Five / 15 minutes | Shared-network allowance must not loosen account protection. |
| Email-code issues / account | 60-second resend; three/15 minutes; ten/rolling 24 hours | Existing ORG-015 account quotas remain strict across sessions/IPs. |
| Wrong email or authenticator codes / account | Five failures, then 15-minute cooldown | Durable account lockout; the window's end permits retry without removing the required second step. |

The IP figures describe engineering abuse capacity, not an approved roster,
delivery budget or provider quota. Daily combined delivery caps remain separate.
No raw IP, password, code, authenticator secret or provider payload enters audit.
Failed password attempts appear in the existing Super-Admin-only audit view with
time, outcome and an opaque account reference when safely known, including EN/AR
labels. Other staff roles and anonymous requests remain denied.

A TOTP lockout does not reset the authenticator. Wait out the 15-minute window
and retry with the current valid code. For a lost authenticator or account access,
use the existing other-Super-Admin recovery procedure above and in the activation
checklist; no self-service or email fallback is added. Portal attempts enforce
this account counter; wrong codes sent directly to managed Auth are governed by
the provider's own controls and are not counted by the portal. The native guard
denies successful direct proof while the portal cooldown is active. Native abuse
limits and direct-endpoint verification remain independent hosted release gates.
Staff audit retention uses
the [owner procedure](STAFF_BACKUP_RESTORE.md#staff-audit-deletion-by-28-january-2028--owner-procedure-not-executed)
and [object-specific advisor baseline](PARTICIPANT_ACTIVATION_RUNBOOK.md#advisor-baseline-and-evidence-status).
Hosted migrations/settings, invitations and real delivery remain unperformed by
this task. Exact observed checks are in
[the O9 note](../progress/2026-10-16-codex-staff-hardening.md).

## Activation procedure — document only; not executed

This section retains the original preparation checkpoint. The later
[ORG-046 authorization](../DECISIONS.md#org-046--authorized-restricted-first-admin-production-setup-7-october-2026)
and [execution record](STAFF_SETUP_EXECUTION.md) supersede its pending state only
for actions actually performed and verified. Wider paired-admin and operational
release requirements remain outstanding.

Use the [operator activation checklist](STAFF_ACTIVATION_CHECKLIST.md) for an
individual action and evidence requirement for every migration and release gate.
PR #43 is merged; merged application code does not apply hosted migrations or
authorize opening either staff gate. The 7 October read-only verification receipts
are recorded in [PROGRESS](../PROGRESS.md).

Do not use a blanket hosted `db reset`, seed or migration push. A named operator
must inspect actual migration history, backups, the current exact SQL revisions
and native Auth guards before applying only the reviewed missing migrations.
Read-only hosted history on 7 October confirms only persisted authorization and
Contact counters applied. The order below respects dependencies; application merge
is separate from hosted migration application.

| Order | Migration | State in this task |
| --- | --- | --- |
| Prerequisite | `20261002173712_persisted_authorization.sql` | Already applied per organizer; reverify, do not reapply |
| 1 (#25) | `20261002193800_staff_mfa_session_foundations.sql` | Pending; native session policy |
| 2 (#25) | `20261002233353_regular_staff_email_check.sql` | Pending; session email receipts and native guards |
| 3 (#25) | `20261003110812_authenticator_super_admin_policy.sql` | Pending; current strongest tier and TOTP |
| 4 (#25) | `20261003180734_readonly_authentication_context.sql` | Pending; readonly access evidence |
| Existing | `20261004114603_contact_abuse_counters.sql` | Already applied per organizer; independent, do not reapply |
| 5 (#39) | `20261004164034_participant_accounts.sql` | Pending; prerequisite identity/admission compatibility; accounts stay closed |
| 6 (#43) | `20261006224926_staff_portal_foundation.sql` | Pending after code merge; private staff policy defaults false |

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
