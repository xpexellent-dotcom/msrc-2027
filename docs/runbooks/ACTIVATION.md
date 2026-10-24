# Activation — 15 November 2026

Owner switch-on guide; prepared 22 October 2026. ENG-060; ORG-055/056/057;
AUTH-01–06, REG-01–08, EML-01–05, CHK-01–05, PRV-03/05/06, SEC-01/02/06,
INF-04–06 and REL-02/06. This document authorizes no hosted action by itself.
The owner performs these steps, or explicitly authorizes an operator to perform
the specific step. No migration, flag, setting, account or email was changed
while preparing this package.

The owner reports Supabase Pro, Vercel Pro and a paid Resend plan purchased on
22 October, **25 hosted migration versions through `20261022130000`**, all
participant/retention/outbox gates off and no registration settings row. Treat
that as the starting report; verify it before acting. Do not replay historical
migrations or the local foundation sample. The single new pending migration is
`20261022171108_staff_launch_readiness.sql`.

Use this guide for exact switches, [OPENING_NIGHT](OPENING_NIGHT.md) for the
release rota, go/no-go record and incident response, and
[participant activation](../features/PARTICIPANT_ACTIVATION_RUNBOOK.md) for
native Auth, privacy, retention export and restore prerequisites. Historical
ledger counts in that older runbook are not the current migration plan.

## A. Vercel environment checklist

1. Open the intended Vercel project → Settings → Environment Variables.
2. Work in **Production only**. Use Secret storage for the rows marked Yes.
   Never paste a value into chat, a receipt, source, a screenshot or command
   history. Do not pull production secrets into this repository.
3. Fill the missing configuration below while the flags remain `false` and
   both outbox caps remain `0`. Redeploy the reviewed source after changes;
   an environment edit does not update an existing deployment.
4. Review `/en/staff/launch-readiness` and `/ar/staff/launch-readiness` as a
   Super Admin. The page checks on the server and shows booleans, counts and
   approved settings summaries, never environment values. A valid key format
   does not prove that the credential belongs to the intended project.

**Already set** below means present in the owner's supplied inventory; no value
was read or verified. All other rows are missing according to that inventory.
For keys, copy the current **publishable** / **secret** key from the designated
Supabase project's API Keys page. Legacy `anon` / `service_role` JWT strings do
not match these readers. Use the same project for each boundary, but keep every
required variable name: the readers do not inherit another boundary's values.

| Name | Purpose | Secret? | Value source and exact accepted Production format | Already set? |
| --- | --- | --- | --- | --- |
| `STAFF_PORTAL_ENABLED` | Staff sign-in and console gate | No | Fixed `true` for the already authorized staff portal; only the exact lowercase `true` enables; `false` closes | Yes |
| `STAFF_PASSWORD_CHANGE_ENABLED` | Independent staff password-change gate | No | Keep its existing approved `true` or `false`; only `true` enables | Yes |
| `STAFF_SUPABASE_URL` | Staff Auth/RPC boundary | No | Supabase dashboard; exactly `https://ecemjggwlzqpjcwmchrl.supabase.co`, no trailing slash | Yes |
| `STAFF_SUPABASE_PUBLISHABLE_KEY` | Staff native Auth requests | No | Supabase dashboard; `^sb_publishable_[A-Za-z0-9_-]+$`; no `mock_only` | Yes |
| `STAFF_SUPABASE_SECRET_KEY` | Staff server RPC/admin boundary, registration decisions and readiness probes | Yes | Supabase dashboard; `^sb_secret_[A-Za-z0-9_-]+$`; no `mock_only` | Yes |
| `STAFF_AUTH_SECURITY_SECRET` | Staff cookies, action tokens and keyed abuse digests | Yes | Preserve installed key; generator `--include-existing` is for a new installation only; exactly 64 hexadecimal characters | Yes |
| `STAFF_AUTH_EMAIL_DAILY_LIMIT` | Staff invitation/code budget | No | Preserve approved positive decimal S, no sign/space/leading zero; reader `^[1-9]\d{0,6}$`, database maximum 100000; must equal `msrc_staff.policy.email_daily_limit` | Yes |
| `STAFF_EDITION_KEY` | Staff grants/settings scope | No | Existing approved persisted edition key, `^[a-z0-9][a-z0-9_-]{0,127}$`; never a synthetic edition | Yes |
| `PARTICIPANT_ACCOUNTS_ENABLED` | Participant account runtime gate | No | Fixed `false` during preparation; exact `true` only at B3 | No |
| `PARTICIPANT_SUPABASE_URL` | Participant Auth/RPC boundary; participant registration and own tickets reuse it | No | Supabase dashboard; exactly `https://ecemjggwlzqpjcwmchrl.supabase.co` | No |
| `PARTICIPANT_SUPABASE_PUBLISHABLE_KEY` | Participant native Auth requests | No | Supabase dashboard; `^sb_publishable_[A-Za-z0-9_-]+$`; no `mock_only` | No |
| `PARTICIPANT_SUPABASE_SECRET_KEY` | Participant server RPC/admin boundary | Yes | Supabase dashboard; `^sb_secret_[A-Za-z0-9_-]+$`; no `mock_only` | No |
| `PARTICIPANT_AUTH_SECURITY_SECRET` | Participant cookies, action tokens and abuse digests; registration reuses this boundary | Yes | Generate locally; exactly 64 hexadecimal characters, independent of other keys | No |
| `PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT` | Participant verification/reset budget P | No | Owner-approved positive decimal, same reader format as staff; use 1–100000 to fit the database; must equal `msrc_participant.policy.email_daily_limit` | No |
| `PARTICIPANT_EDITION_KEY` | Participant edition scope | No | Copy the reviewed `STAFF_EDITION_KEY`; same `^[a-z0-9][a-z0-9_-]{0,127}$` format and persisted edition | No |
| `REGISTRATION_ENABLED` | Participant registration, own status/actions and ticket runtime gate | No | Fixed `false` during preparation; exact `true` at B5 while database registration remains closed | No |
| `REGISTRATION_TICKET_SECRET` | Stable HMAC credential for tickets | Yes | Generate locally; exactly 64 hex; must differ from participant/staff security secrets | No |
| `RESEND_API_KEY` | Shared Contact, staff, participant and outbox email provider | Yes | Preserve verified Resend API key; `^re_[A-Za-z0-9_-]+$`, no `mock_only`; verified sending domain and sufficient permissions required | Yes |
| `OUTBOX_ENABLED` | Authenticated GET/POST drain route gate | No | Fixed `false` during preparation; exact `true` at B4 | No |
| `OUTBOX_RESEND_ENABLED` | Independent real-email adapter gate | No | Fixed `false` during preparation; exact `true` at B4 | No |
| `OUTBOX_SENDER` | Selects delivery adapter | No | Fixed `resend` for Production. `console` is rejected on Vercel | No |
| `OUTBOX_DAILY_CAP` | Maximum UTC-day attempts B; database and app smaller cap wins | No | Decimal digits only, numeric 0–100000; explicitly `0` until approved activation, then B below; an empty string is invalid | No |
| `OUTBOX_BATCH_SIZE` | Maximum messages claimed in one drain | No | Decimal integer 1–10; use existing engineering default `10`, subject to throughput rehearsal; absent defaults to 10, empty is invalid | No |
| `OUTBOX_TIME_BUDGET_MS` | Bounded worker time budget | No | Decimal integer 15000–20000; use existing engineering default `20000`; absent defaults to 20000, empty is invalid | No |
| `OUTBOX_SUPABASE_URL` | Outbox claim/prepare/finish and monitor boundary | No | Supabase dashboard; exactly `https://ecemjggwlzqpjcwmchrl.supabase.co` | No |
| `OUTBOX_SUPABASE_SECRET_KEY` | Server-only outbox RPC credential | Yes | Supabase dashboard; `^sb_secret_[A-Za-z0-9_-]+$` | No |
| `CRON_SECRET` | Drain Authorization Bearer authentication | Yes | Generate locally; 32–256 ASCII letters/digits/underscore/hyphen (`^[A-Za-z0-9_-]{32,256}$`); generated 64 hex fits | No |
| `HEALTH_SUPABASE_URL` | Independent database health probe | No | Supabase dashboard; use exactly `https://ecemjggwlzqpjcwmchrl.supabase.co`; reader accepts `^https://[a-z0-9]{20}\.supabase\.co$` | No |
| `HEALTH_SUPABASE_SECRET_KEY` | Server-only `msrc_health_check()` credential | Yes | Supabase dashboard; `^sb_secret_[A-Za-z0-9_-]+$` | No |
| `OUTBOX_MONITOR_SECRET` | Read-only outbox monitor Bearer authentication | Yes | Generate locally; `^[A-Za-z0-9_-]{32,256}$`, independent of `CRON_SECRET`; monitoring also requires `OUTBOX_SUPABASE_*` above | No |
| `CONTACT_DELIVERY_ENABLED` | Existing independent Contact gate | No | Preserve approved exact `true`/`false`; registration does not authorize changing it | Yes |
| `CONTACT_SUPABASE_URL` | Contact abuse-counter boundary | No | Supabase dashboard; exactly `https://ecemjggwlzqpjcwmchrl.supabase.co` | Yes |
| `CONTACT_SUPABASE_SECRET_KEY` | Contact server-only abuse-counter RPC | Yes | Supabase dashboard; `^sb_secret_[A-Za-z0-9_-]+$` | Yes |
| `CONTACT_SECURITY_SECRET` | Contact HMAC digests | Yes | Preserve installed key; initial-install generator `--include-existing` only; exactly 64 hex | Yes |

Optional Contact overrides are not required for registration. If absent/empty,
the established defaults apply. If configured, use decimal positive integers
without leading zeroes: `CONTACT_MINIMUM_FILL_SECONDS` 3–300 (default 3),
`CONTACT_IP_HOUR_LIMIT` and `CONTACT_EMAIL_HOUR_LIMIT` 1–60 (default 3),
`CONTACT_IP_DAY_LIMIT` and `CONTACT_EMAIL_DAY_LIMIT` 1–60 (default 10); each
hour limit must not exceed its day limit. All five are nonsecret, owner-approved
fixed settings and are **not already set** in the supplied inventory. Contact's
separate database hard cap is 60/day; these overrides do not raise that cap.

Vercel supplies `VERCEL=1` and `VERCEL_ENV=production`; do not set or spoof them.
Node/Next supply `NODE_ENV=production`. `ENABLE_EXPERIMENTAL_COREPACK` is already
set for the build, not an application credential. `DESIGN_PREVIEW_ENABLED` is
already set **only in Preview** and is rejected on Production. Leave all
`*_TEST_MODE`, `MSRC_AUTH_PREVIEW*`, `MSRC_ISOLATED_*`, `LOCAL_MEDIA_PREVIEW_ENABLED`
and synthetic harness settings absent on Vercel. Keep AI disabled.
`NEXT_PUBLIC_SUPABASE_*` belong to the legacy/general client helpers; active
staff and participant boundaries above do not require them. Do not add public
keys/flags as substitutes for the server configuration. There is no separate
registration Supabase key, scanner master secret, `RESEND_FROM`, or generic
registration action secret: these paths reuse the staff/participant boundaries.
The application fixes its auth/registration sender to
`MSRC 2027 <no-reply@msrc2027.com>`; verify this domain in Resend.

Configuration sources: `src/features/{participant-accounts,staff-portal}/config.server.ts`,
`src/features/contact/delivery-config.server.ts`,
`src/features/registration/ticket-crypto.server.ts`,
`src/lib/jobs/outbox-route.server.ts`, `src/lib/monitoring/health.server.ts`,
`src/lib/supabase/config.ts` and `.env.example`.

### Generate only the new keys

Run this yourself in a private local terminal, with terminal recording and
screen sharing off:

```powershell
node scripts/activation/generate-keys.mjs
```

The warning goes to stderr; stdout contains one `NAME=value` per line. The
script makes no network calls and writes no file by default. Copy each value
privately into the matching Vercel Production setting and your approved secret
custody store. For an explicitly chosen private export outside this repository:

```powershell
node scripts/activation/generate-keys.mjs --out C:\private-msrc-custody\activation.env
```

Choose an existing protected directory outside **all project checkouts**; the
script refuses an in-repository path, an existing output file, and a junction
that resolves into the repository. On Windows, verify the directory's ACLs
restrict access to the approved custodians; a file mode is not an ACL guarantee.
Do not redirect stdout into the repository.
`--include-existing` additionally generates staff/Contact keys for a new
installation. **Do not use those generated replacements for the already
installed staff/Contact keys.** Preserve ticket keys after first use; replacing them can invalidate existing tickets.
ORG-064 retires the registration identity keyring and reveal flow; do not generate
or configure identity encryption/HMAC keys for the new private-table contract.

### Approve the email budget before choosing positive caps

Official Resend documentation checked 22 October 2026 lists transactional Pro
at **50,000 emails/month** and Scale at **100,000/month** at their entry tiers.
Paid transactional plans have no provider daily quota. The actual purchased
tier and remaining monthly allocation must be read in the owner's dashboard.
[Resend pricing](https://resend.com/pricing),
[quota rules](https://resend.com/docs/knowledge-base/account-quotas-and-limits).

**Recommendation for owner approval:** an opening-day outbox cap **B=1000**
attempts and participant-auth cap **P=1000**, while retaining the existing
approved staff cap S. Use them only after confirming at least
`1000 + 1000 + S + 60 + other/inbound reserve + safety reserve` remains in the
paid monthly budget. These are engineering budgets, not attendance capacities.
The SQL examples below use 1000; if the owner approves another number, change
the matching Vercel and SQL value together. Recalculate after the opening day:
two 1000/day caps sustained for 31 days already exceed Pro's 50,000 allowance
before staff/Contact traffic. No monthly cap is enforced by this app.

Resend counts sent and received mail and each recipient toward quota. Its
published starting API rate is **10 requests/second per team**, shared across
keys; verify the actual team limit and overage/spend controls. Retry attempts
consume the application's outbox budget even when they do not deliver mail.
[Resend account limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits).

Vercel Pro supports up to 100 cron jobs per project and a one-minute minimum
interval. The checked-in drain is `*/5 * * * *` (five fields, UTC): GET
`/api/jobs/outbox/drain` every five minutes. Vercel sends
`Authorization: Bearer <CRON_SECRET>` automatically. The existing exact,
timing-safe authentication remains required; HEAD is inert. Deploying the cron
alone sends no mail while gates/caps are closed.
[Cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing),
[syntax and UTC](https://vercel.com/docs/cron-jobs),
[cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).

**Throughput is a go/no-go gate.** Ten messages per five-minute drain is at
most **120 attempts/hour**, often fewer under the time budget. A higher cap or
paid plan cannot increase that rate. Measure the expected receipt, approval and
offer backlog; retain the capacity warning and explicit decision in
[OPENING_NIGHT](OPENING_NIGHT.md#email-budget-and-throughput). The outbox drain
does not run offer expiry. Assign the documented expiry operator; do not promise
unattended hand-on timing from the mail cron.

## B. Ordered switch-on steps and SQL

### B0. Verify the target and apply only the pending readiness migration

Use the native `postgres` SQL Editor/connection. Verify the dashboard project
ref is `ecemjggwlzqpjcwmchrl` and TLS/connection custody is correct. The query
below returns only role and migration/configuration metadata:

```sql
select current_user, session_user, current_setting('role', true) as active_role;
select count(*) as applied_versions, max(version) as latest_version
from supabase_migrations.schema_migrations;
select enabled, privacy_version, email_daily_limit from msrc_participant.policy where singleton;
select enabled, unverified_days from msrc_participant.retention_policy where singleton;
select delivery_enabled, sweeps_enabled, daily_cap from msrc_outbox.settings where singleton;
select edition_key, enabled from msrc_registration.settings;
```

Before the new migration, expect the reported 25 versions / `20261022130000`,
closed policies, outbox false/false/0 and no registration settings row. Stop on
unexplained differences. Apply **only** the reviewed
`20261022171108_staff_launch_readiness.sql` using the established single-file
hosted protocol after exact-source CI, isolated rehearsal and owner approval.
Expected ledger afterward: 26 versions with that version once.

```sql
select count(*) = 1 as readiness_version_recorded
from supabase_migrations.schema_migrations where version = '20261022171108';
select to_regprocedure('public.msrc_staff_launch_readiness(text)') is not null as readiness_rpc_present;
```

Check both locale readiness pages in an actual Super Admin TOTP session.
Missing RPC means `area-not-ready`, not permission to bypass the check.
**Undo:** roll back an uncommitted migration transaction; after commit use the
reviewed forward-correction/restore procedure. Do not drop guards or erase the
ledger. There is no need to call the authenticated readiness RPC as SQL admin
or manufacture JWT claims to make it authorize.

For every switch transaction below, keep the role native `postgres`:

```sql
-- Run before each switch; all three results must be true.
select current_user = 'postgres' as current_operator_ok,
       session_user = 'postgres' as native_operator_ok,
       current_setting('role', true) in ('none', 'postgres') as role_ok;
```

No `SET ROLE`, service-key impersonation, fabricated Auth session, disabled
trigger or widened grant is part of this procedure. Cleanup/sweep/scheduler
functions explicitly enforce native roles. Registration settings saves need
the real Super Admin application session for authorization and immutable audit.

### B1. Enter registration settings through the console, still closed

1. As Super Admin, open **Registration settings** in the staff console.
2. Enter the approved edition's settings. Save through this screen; do not
   insert/update all settings with SQL and lose the audited save path.
3. Have a second reader verify the **complete** indicator and these values:

| Setting | Approved input / required decision |
| --- | --- |
| Attendance | Free, `payment_required=false`; manual approval still applies |
| General capacity | 2000, owner-entered per ORG-051/055; no migration seed |
| Terms | `v1.0`, ORG-057 |
| Early/priority start | 15 November 2026, 20:00 Riyadh (`2026-11-15T17:00:00Z`) |
| Early/priority end and general opening | 18 November 2026, 20:00 Riyadh (`2026-11-18T17:00:00Z`); both window pairs must be populated |
| Closing | 26 January 2027, 23:59 Riyadh (`2027-01-26T20:59:00Z`), ORG-057 |
| `offer_window_hours` | 24, ORG-056 |
| Conference days | `2027-01-27` and `2027-01-28`; separate scanner prerequisite |
| Minimum age | 18 |
| Legacy/remaining settings | Owner must supply `waitlist_offer_hours`, `confirm_seat_lead_days`, `confirm_seat_response_hours`, `places_remaining_threshold`; do not copy synthetic/default proposals. `default_workshop_capacity` remains optional; `payment_window_hours` is unnecessary for free attendance. |

The 24-hour offer decision is explicit for `offer_window_hours`; ask the owner
to approve the legacy `waitlist_offer_hours` value as well. Confirm-seat lead
and response durations remain unresolved and cannot be invented to pass the
complete indicator. Add the real early-access email list through its Super
Admin screen; it grants early submission only.

Check using the reviewed edition identifier (replace `<EDITION_KEY>` in every
example with the existing staff/participant key, not a guessed value):

```sql
select edition_key, enabled, msrc_registration.settings_complete(edition_key) as complete,
       terms_version, payment_required, general_capacity, offer_window_hours,
       priority_start_at at time zone 'Asia/Riyadh' as early_start_riyadh,
       priority_end_at at time zone 'Asia/Riyadh' as early_end_riyadh,
       general_opening_at at time zone 'Asia/Riyadh' as general_opening_riyadh,
       closing_at at time zone 'Asia/Riyadh' as closing_riyadh, conference_days
from msrc_registration.settings where edition_key = '<EDITION_KEY>';
```

Expect one row, complete true and enabled false. **Undo:** correct the saved
values through Registration settings; history remains. If an admissions pause
is necessary, use B5's disabling statement. Never delete the settings row.

### B2. Enable retention after export, restore and cleanup checks

Complete the linked participant runbook's approved holds/provider retention map,
named custodians, encrypted external ledger export, isolated restore/replay and
counts-only cleanup dry run first. Buying Pro does not complete those gates.
Inspect the existing cron jobs; do not create duplicate jobs or change their
cadence/batch as a side effect:

```sql
select enabled, unverified_days from msrc_participant.retention_policy where singleton;
select cleanup_schedule, cleanup_batch_size, staff_purge_schedule,
       history_purge_schedule, cron_history_days from msrc_participant.scheduler_settings where singleton;
select jobname, schedule, active, username = 'postgres' as owner_ok,
       database = current_database() as database_ok
from cron.job where jobname in ('msrc-participant-unverified-cleanup',
  'msrc-staff-abuse-purge', 'msrc-cron-history-purge', 'msrc-outbox-sweep');
select * from msrc_participant.scheduler_health();
```

After the owner signs off those results:

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_participant.retention_policy
set enabled = true, unverified_days = 30
where singleton returning enabled, unverified_days;
commit;
-- Check exactly one row: true, 30.
select enabled, unverified_days from msrc_participant.retention_policy where singleton;
```

**Undo further cleanup only if stopping**; already completed erasures cannot
be undone:

```sql
update msrc_participant.retention_policy set enabled = false where singleton returning enabled;
select enabled, unverified_days from msrc_participant.retention_policy where singleton;
```

After the next approved cleanup, verify scheduler health and the independently
stored ledger export. Missing export/restore proof means NO-GO for accounts.

### B3. Configure and enable participant accounts

Confirm native public signup remains disabled, the approved Send Email
suppression hook works, email/password and email confirmation are correctly
configured, minimum password length is 10, leaked-password protection is enabled
on Pro, and the measured shared-egress Auth limits pass. Follow the exact order
in [participant activation](../features/PARTICIPANT_ACTIVATION_RUNBOOK.md#numbered-owner-launch-steps).
Do not remove the suppression hook to test SMTP; this app sends its codes via
the Resend API. Complete privacy/location/recovery and inbox evidence too.

Set Vercel `PARTICIPANT_AUTH_EMAIL_DAILY_LIMIT` to the owner-approved P (1000
only if the recommendation was approved), with `PARTICIPANT_ACCOUNTS_ENABLED=false`.
Keep the existing staff limit unchanged; increasing it needs a coordinated
matching staff-policy update and staff smoke test.

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_participant.policy
set enabled = false, privacy_version = 'v1.0', email_daily_limit = 1000
where singleton returning enabled, privacy_version, email_daily_limit;
commit;
-- Check: false, v1.0, approved P (exactly matches Vercel).
select enabled, privacy_version, email_daily_limit from msrc_participant.policy where singleton;
```

**The exact value is `v1.0`, including `v`.** This matches
`currentPolicyVersion` in `src/content/policies.ts`. `1.0` fails the server's
exact comparison even if a database readiness function reports enabled.

In the owner's authorized account-UAT/opening window, enable the database:

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_participant.policy set enabled = true
where singleton and privacy_version = 'v1.0' and email_daily_limit = 1000
  and exists (select 1 from msrc_participant.retention_policy where singleton and enabled and unverified_days = 30)
returning enabled, privacy_version, email_daily_limit;
commit;
-- Check exactly one policy row and all required capability booleans.
select public.msrc_participant_status();
```

Set `PARTICIPANT_ACCOUNTS_ENABLED=true`, redeploy, verify the serving source
and readiness page, then use **an owner-controlled test email/alias distinct
from the owner's existing staff identity** to create one real test account
through the normal signup path. Participant/staff identity guards do not permit
turning the existing Super Admin login into a participant. Check receipt of the English code in
the inbox, verify it, sign in/out, and repeat the UI checks in Arabic. No
registration is open yet. This switch permits public account signup; there is
no owner-only production test bypass. Do it only in the approved window.

**Undo:** close the database gate immediately:

```sql
update msrc_participant.policy set enabled = false where singleton returning enabled;
select enabled, privacy_version, email_daily_limit from msrc_participant.policy where singleton;
```

Then set the Vercel participant flag false and redeploy; verify closed EN/AR
signup and sign-in paths on the serving deployment.
Keep retention governed separately; account closure does not restore erased
data or automatically stop retention. Retain the reviewed cap/version unless a
separate configuration rollback is required. Do not delete test accounts by SQL.

### B4. Enable transactional delivery and sweeps

ORG-057 already approves the six registration templates as worded. Verify the
actual Resend plan, verified sender, remaining quota, private inbox proof and
the approved B/P/S budget. Privately review any existing queued/retryable backlog
before enabling: old jobs can send on the next scheduled drain.

With SQL delivery still false, set Vercel `OUTBOX_ENABLED=true`,
`OUTBOX_RESEND_ENABLED=true`, `OUTBOX_SENDER=resend`, `OUTBOX_DAILY_CAP=1000`
(or approved B), batch 10, time budget 20000 and the keys from A. Redeploy and
verify the five-minute job and configured monitor. Then enable the database:

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_outbox.settings
set delivery_enabled = true, sweeps_enabled = true, daily_cap = 1000
where singleton returning delivery_enabled, sweeps_enabled, daily_cap;
commit;
-- Check exactly one row: true, true, approved B.
select delivery_enabled, sweeps_enabled, daily_cap, max_attempts, lease_seconds,
       retry_window_seconds, terminal_retention_days, sweep_batch_size
from msrc_outbox.settings where singleton;
select public.msrc_outbox_monitor();
```

Enabling sweeps releases expired leases, marks exhausted jobs and purges terminal
rows according to the existing reviewed settings. The postgres-owned
`msrc-outbox-sweep` job already runs every five minutes; its flag makes it active.
The Vercel drain and database sweep are different jobs. Review retained-history
and indefinite deduplication-tombstone policy before activation.

Check `/api/health` for `database=reachable` (runtime-only `not-configured` is
insufficient), the private `/api/jobs/outbox/health` aggregates with the monitor
secret in an Authorization header, and Vercel Cron invocation logs. Never put
secrets in URLs or copy headers/logged values into receipts. There is no durable
last-drain heartbeat in the database: the readiness page says unobservable and
the owner checks Vercel's latest invocation. An empty queue proves no inbox delivery.

**Undo delivery and sweeps**, preserving backlog and completed receipts:

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_outbox.settings
set delivery_enabled = false, sweeps_enabled = false, daily_cap = 0
where singleton returning delivery_enabled, sweeps_enabled, daily_cap;
commit;
select delivery_enabled, sweeps_enabled, daily_cap from msrc_outbox.settings where singleton;
```

Also set `OUTBOX_ENABLED=false`, `OUTBOX_RESEND_ENABLED=false`,
`OUTBOX_DAILY_CAP=0` and redeploy. Already accepted provider requests can still
arrive. This does not stop participant/staff/Contact mail; use their own gates
if the incident requires it. Do not rotate keys or delete queued messages.

### B5. Open registration last, on opening night

1. Complete every go/no-go row in [OPENING_NIGHT](OPENING_NIGHT.md#gono-go-record).
   Confirm the settings screen says complete, approved dates/capacity match,
   conference days exist, early-list count is reconciled, two Super Admins have
   authenticators, and staff access works. At least two registration approvers
   are recommended; at least one check-in staff member is required. Counts do
   not replace a named rota or rehearsal.
2. Set `REGISTRATION_ENABLED=true` and redeploy while SQL `enabled=false`.
   Check readiness and that participant registration remains closed.
3. At **15 November 2026, 20:00 Riyadh (17:00 UTC)**, after the owner records GO,
   run the following as the **last switch**. Replace `<EDITION_KEY>` first.
   Database time and the early-access email list still govern who may submit.

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
do $$
declare target_edition constant text := '<EDITION_KEY>'; changed integer;
begin
  if current_user <> 'postgres' or session_user <> 'postgres'
     or current_setting('role', true) not in ('none', 'postgres') then
    raise exception 'Native postgres operator required';
  end if;
  perform 1 from msrc_registration.settings where edition_key = target_edition for update;
  if not found or not msrc_registration.settings_complete(target_edition) then
    raise exception 'Registration settings are absent or incomplete';
  end if;
  update msrc_registration.settings s set enabled = true, updated_at = clock_timestamp()
  where s.edition_key = target_edition and not s.enabled
    and s.terms_version = 'v1.0' and s.payment_required = false
    and s.general_capacity = 2000 and s.offer_window_hours = 24
    and s.conference_days = array[date '2027-01-27', date '2027-01-28']
    and s.priority_start_at = timestamptz '2026-11-15 20:00:00+03'
    and s.early_access_start_at = s.priority_start_at
    and s.priority_end_at = timestamptz '2026-11-18 20:00:00+03'
    and s.early_access_end_at = s.priority_end_at and s.general_opening_at = s.priority_end_at
    and s.closing_at = timestamptz '2027-01-26 23:59:00+03'
    and clock_timestamp() >= s.priority_start_at and clock_timestamp() < s.closing_at
    and exists (select 1 from msrc_participant.policy p where p.singleton and p.enabled
      and p.privacy_version = 'v1.0' and p.email_daily_limit = 1000)
    and exists (select 1 from msrc_participant.retention_policy r where r.singleton and r.enabled and r.unverified_days = 30)
    and exists (select 1 from msrc_outbox.settings o where o.singleton and o.delivery_enabled and o.sweeps_enabled and o.daily_cap = 1000);
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Opening prerequisites changed; stop and recheck'; end if;
end $$;
select edition_key, enabled, msrc_registration.settings_complete(edition_key) as complete
from msrc_registration.settings where edition_key = '<EDITION_KEY>';
commit;
```

If the owner approved different P/B budgets, replace both `1000` comparisons
with those approved values before review/execution. Any failure rolls back;
do not weaken a failed condition to get an opening. If the result is uncertain,
read back the one edition row before repeating. Settings Save deliberately
rejects `enabled=true`; this final native-operator update is the supported
release procedure, with who/when/why recorded in the private release receipt.

Check the final readiness line is **Open**, then have the owner use the same
verified, early-listed email to request a seat. Confirm the received message,
have an authorized approver approve once, and confirm the approved inbox message
and own ticket/QR. An approved row or `sent` outbox status alone is not inbox
proof. Check both EN/AR ticket views without copying the QR into receipts.
An unlisted owned account must remain ineligible before general opening.

**Undo registration immediately if needed:**

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_registration.settings set enabled = false, updated_at = clock_timestamp()
where edition_key = '<EDITION_KEY>' returning edition_key, enabled, updated_at;
commit;
select edition_key, enabled from msrc_registration.settings where edition_key = '<EDITION_KEY>';
```

Require exactly one closed row, then set `REGISTRATION_ENABLED=false` and
redeploy. This also closes participant offer/cancel/ticket access. Staff queue
reads can still expire offers and hand seats onward; follow the full-freeze
procedure in OPENING_NIGHT when required. No clock/deadline is paused and no
committed request is erased. General opening on 18 November is time-driven;
repeat the go/no-go review and monitoring, not an unnecessary close/reopen.

## C. Final verification and no-go conditions

Keep one private receipt with time, serving SHA, applied migration version,
operator/reviewer, PASS/FAIL/BLOCKED and counts. Never include keys, participant
identifiers, addresses, cookies, codes, ticket credentials or email bodies.

| After step | Required evidence | Stop if |
| --- | --- | --- |
| A/B0 | Exact-source CI; pending migration reviewed/applied separately; staff EN/AR sign-in; no missing readiness RPC; health reaches the correct DB | Missing function, invalid environment, unexpected ledger/grants or wrong project |
| B1 | Saved complete settings, Riyadh readback, approved outstanding durations/threshold, early-list count, conference days | A required value is guessed, null, or inconsistent |
| B2 | Cleanup dry run, approved holds, external encrypted ledger, isolated restore/replay, scheduler owner/health | Export/restore evidence or native operator identity missing |
| B3 | Owner-email signup/code inbox/sign-in/out; EN/AR; native bypass denies; leaked-password and rate-limit proof | Budget/version mismatch, unexpected native email or wrong account/session behavior |
| B4 | Provider quota/sender approval, five-minute job authentication, recent invocation, monitor/queue trend and budget agreement | Backlog cannot meet accepted latency, repeated failures, no cron evidence or unapproved spending |
| B5 | Closed → Open readback; owned early-access request; authorized approval; received/approved inbox messages; stable own ticket | Unauthorized access, duplicate allocation/ticket, missing inbox message or broken ticket |
| Scanner rehearsal | Actual EN/AR desktop and physical phone camera/manual-reference checks; check-in role scope; repeated scan is idempotent; Super Admin correction audited | Missing days, unsupported camera without tested manual path, wrong role access or unresolved outage procedure |

Perform scanner acceptance/idempotency rehearsal with synthetic tickets on the
isolated approved test setup. Do not create January attendance on a real
production attendee merely to turn a checklist green: the scanner accepts a
selected configured day and writes real attendance. On Production, verify the
screen, camera permission/start/stop, day selection and role denial without
submitting a live ticket until an explicitly approved operational rehearsal.
If an owned test attendance entry is explicitly authorized, use the supported
Super Admin **Undo with reason** and verify audit; do not delete it with SQL.
Physical device, outage/backup and recovery checks remain human gates.

The readiness page is a read-only diagnostic. It neither flips switches nor
proves legal approval, inbox delivery, successful restore, usable authenticators,
staff availability or throughput. Resolve the remaining owner decisions before
GO: actual paid Resend tier/remaining budget and cap approval; required legacy
settings; named privacy/custody and rota; staging/native Auth/load evidence;
worker throughput; scanner entry-point/outage procedures; two-person recovery.
