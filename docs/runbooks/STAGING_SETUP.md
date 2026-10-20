# Staging setup and load rehearsal — owner procedure

20 October 2026; ENG-056, ORG-055/056; INF-04–06, NFR-01–03, REG-01–08,
EML-01–05, AT-16 and REL-06. No cloud resources, migrations, seeds, monitors,
feature flags or email were changed by this task. All commands below are owner
steps, not an execution receipt. Use synthetic data only, never a production
backup, real attendee list or live credentials.

**O11 reconciliation:** no literal O11 note exists in the checked-out docs.
The existing staging notes are [OWNERSHIP_AND_SETUP](../OWNERSHIP_AND_SETUP.md),
[ARCHITECTURE: environments](../ARCHITECTURE.md) and
[BL-DEP-01 isolation](../backlog/23-deployment.md). The owner must attach/reconcile
the overnight-plan O11 decision before provisioning. Older notes describing
three Super Admins are superseded by ORG-043/044's two distinct accounts.

## 1. Record target, cost and execution prerequisites

Record reviewed source SHA, full migration SHA-256 manifest, staging-only project
name/ref, intended region, protected app origin, operator, billing owner and
teardown date privately. Confirm the existing Production project
`ecemjggwlzqpjcwmchrl` and all `msrc2027.com` hosts are excluded. The scripts
refuse these even when their allow pattern is supplied.

- Supabase: separate projects have separate compute cost. Current paid-project
  Micro pricing is $0.01344/hour (about $10/month); the organization's $10 compute
  credit may already cover Production. Storage/egress and other add-ons can add
  cost. Confirm the dashboard quote and an approved spend ceiling; a free tier
  may have different limits and cannot prove paid Production performance.
  [Compute pricing](https://supabase.com/docs/guides/platform/manage-your-usage/compute).
- Vercel: a Preview branch works across plans; a named Custom Environment needs
  Pro/Enterprise. Usage and any plan/extra-environment charges still apply.
  This guide uses branch-scoped Preview variables and does not require purchasing
  a custom environment. [Environments](https://vercel.com/docs/deployments/environments).
- Resend: this synthetic setup sends no email and needs no paid sending purchase.
  Opening night separately needs verified paid capacity and an adequate worker
  rate; see [OPENING_NIGHT](OPENING_NIGHT.md). Never use real Resend credentials
  to deliver to `@example.invalid`.
- Local owner workstation: Node 24, pnpm 11.19.0, installed Supabase CLI 2.118.0,
  native PostgreSQL `psql` with verified TLS/CA trust and access to the target.
  The seed requires native postgres, not a transaction pooler. Direct IPv6 may
  be unavailable on the workstation; use the project's Tokyo **session** pooler
  on port 5432 with its exact dashboard hostname if needed. The script accepts
  only an explicitly matched Tokyo pooler host. No Docker is needed for push or
  this seed; database test/restore tools have separate prerequisites.

Official Supabase, Vercel and Resend documentation linked here was checked on
20 October 2026. `pnpm exec supabase --version`, `db push --help` and
`migration list --help` were also checked against installed 2.118.0. First CLI
attempt was blocked by global telemetry-file permissions; documented
`DO_NOT_TRACK=1` allowed the read-only help commands. Do not upgrade the pinned
CLI or repair migration history merely because an update is offered.
[CLI telemetry](https://supabase.com/docs/guides/local-development/cli/getting-started#telemetry),
[CLI migration reference](https://supabase.com/docs/reference/cli/supabase-db-push).

## 2. Owner creates a separate Supabase project

1. In the approved organization dashboard, choose **New project**, name it
   clearly `msrc-staging-<run>`, set a unique private database password and review
   the displayed cost. Select specific **Northeast Asia (Tokyo),
   `ap-northeast-1`**, not a broad region that may resolve elsewhere. Confirm
   creation only as the authorized owner. [Regions](https://supabase.com/docs/guides/platform/regions).
2. Verify project status, region and unique ref after creation. Record the exact
   `https://<new-ref>.supabase.co` URL, project publishable/secret keys and native
   database connection in the private credential store. Keys must all belong to
   this new project. Do not connect the Supabase/Vercel integration to Production
   or automatically import its environment variables.
3. Keep signup closed, anonymous/social/phone entry disabled and real SMTP absent.
   Enable the email/password sign-in provider for seeded accounts while keeping
   the separate public **Allow new users to sign up** switch disabled; provider
   availability is not application readiness or public signup permission.
   Review the managed Auth hooks from
   [STAFF_ACTIVATION_CHECKLIST](../features/STAFF_ACTIVATION_CHECKLIST.md) and
   [participant activation](../features/PARTICIPANT_ACTIVATION_RUNBOOK.md),
   including the native Send Email suppression hook. Use synthetic fixtures
   without sending invitations. Configure staging-only site/redirect URLs if
   and when a reviewed staging Auth runtime is available.
4. Restrict project membership and network access to the named operators.
   Do not expose private `msrc_*` schemas via Data API. Check schema grants/RLS
   after migrations, rather than copying permissions from another project.

## 3. Replay all migrations in order on this fresh staging project only

This exact new-project replay is authorized as a **written preparation** by
Task 5, and is a staging exception to the older blanket hosted replay warning.
It is never the Production change procedure. Include the foundation sample
migration only in this disposable synthetic project; never add it to Production.
Do not run `db reset --linked`, `config push`, `migration repair`, or `--include-seed`.

Owner opens PowerShell in the reviewed checkout and privately sets
`MSRC_STAGING_CONFIRM=yes`, `MSRC_STAGING_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`
(a scoped owner token), and `SUPABASE_DB_PASSWORD`. No secrets belong in command history/receipts. The CLI's
explicit `--project-ref` avoids an old linked-project target.

```powershell
$env:PATH = 'C:\m\tools\bin;' + $env:PATH
$env:DO_NOT_TRACK = '1'
if ($env:MSRC_STAGING_PROJECT_REF -notmatch '^[a-z0-9]{20}$' -or
    $env:MSRC_STAGING_PROJECT_REF -eq 'ecemjggwlzqpjcwmchrl') { throw 'Wrong target' }
if ($env:MSRC_STAGING_CONFIRM -ne 'yes') { throw 'Staging confirmation required' }
Get-ChildItem supabase/migrations/*.sql | Sort-Object Name | Get-FileHash -Algorithm SHA256
pnpm exec supabase migration list --project-ref $env:MSRC_STAGING_PROJECT_REF
```

Require an empty remote ledger and an independently verified fresh staging
project. If not empty, stop and reconcile; do not mark versions applied to skip
errors. Then preview the **whole ordered set**, compare it to the local manifest,
and perform the owner-approved replay:

```powershell
pnpm exec supabase db push --project-ref $env:MSRC_STAGING_PROJECT_REF --dry-run --skip-vault
# Owner reviews the target and exact dry-run list before the next command.
pnpm exec supabase db push --project-ref $env:MSRC_STAGING_PROJECT_REF --skip-vault
pnpm exec supabase migration list --project-ref $env:MSRC_STAGING_PROJECT_REF
```

Stop on any nonzero exit code. The installed CLI applies pending versioned files
in order and records its ledger; all local and remote versions must match after
the push. This task's health migration is `20261020020245_operational_health.sql`,
which sorts before the hand-set afternoon task 1–4 timestamps and depends only
on the October 16 outbox migration. Do not rename historical migrations to move
it. [Supabase environment/migration procedure](https://supabase.com/docs/guides/deployment/managing-environments).

After migrations, configure the managed Auth **Send Email** database hook to the
final `msrc_participant.suppress_native_email(jsonb)` function, retaining its
reviewed `supabase_auth_admin` grants. Disable native security-notification email,
keep real SMTP absent and verify there is no fallback delivery. Do not configure
this function before it exists or blindly push the local config to hosted Auth.

Before seeding, run the repository's pgTAP, database lint and native integration
checks on disposable Linux CI at this exact source. Review managed Auth hook
compatibility on the new project. Native SQL seed compatibility remains a gate
until those checks execute; local unit tests alone are insufficient. Verify all
participant/staff/registration policy `enabled` values are false and outbox
delivery/sweeps false with daily cap zero. Preserve an error receipt and discard
the disposable project if partial setup is uncertain; do not repurpose Production.

The new focused `tests/integration/staging-seed.test.ts` is opt-in and is not
automatically enabled by the existing CI workflow. Claude must arrange its
isolated CI invocation after a fresh reset, using the existing managed-Auth
preparation/global setup and privately captured local secret as described in
that file. An ordinary green CI run with this test skipped does not clear the
native seed gate.

## 4. Owner creates the Vercel staging branch environment

1. Owner selects or creates the approved staging branch from the reviewed source.
   This task creates no branch or push. In the existing Vercel project, verify
   Production's branch/domains remain unchanged. Use the **Preview** environment
   scoped to that staging branch. A separate Vercel project is also possible,
   but does not remove the application runtime limits below.
2. Add each variable from `.env.example` explicitly for the staging branch,
   using only the new Supabase project's URL and corresponding keys. Do not
   select Production or inherit broad unscoped live secrets. Public
   `NEXT_PUBLIC_SUPABASE_*` values are publishable; all secret/service keys,
   identity/ticket/security keys and health keys are server-only. Generate
   independent staging secrets and use the synthetic edition in the manifest.
   [Branch-specific variables](https://vercel.com/docs/environment-variables).
3. Keep `PARTICIPANT_ACCOUNTS_ENABLED`, `STAFF_PORTAL_ENABLED`,
   `STAFF_PASSWORD_CHANGE_ENABLED`, `REGISTRATION_ENABLED`, `OUTBOX_ENABLED`,
   `OUTBOX_RESEND_ENABLED`, `CONTACT_DELIVERY_ENABLED`, `AI_ASSESSMENT_ENABLED`
   false and caps zero. Keep test-mode variables absent. Leave `RESEND_API_KEY`
   absent. Configure only staging `HEALTH_SUPABASE_*`, `OUTBOX_SUPABASE_*` and
   `OUTBOX_MONITOR_SECRET` if the owner authorizes read-only monitoring.
4. Deploy the branch under owner control. Use a hostname with a literal `staging`
   label, for example a Vercel branch hostname containing `-staging-`; copy its
   exact assigned URL. Never alias it under `msrc2027.com` for these scripts.
   Protect access using the team's available Deployment Protection mechanism,
   verify the existing non-Production `X-Robots-Tag: noindex, nofollow, noarchive`
   header from `next.config.ts`, and verify unauthenticated access is blocked.
   Check plan availability/cost rather than assuming protection covers all URLs.
5. Verify deployed SHA, Preview variable scope, closed workflows and
   `/api/health`. Follow [MONITORING](MONITORING.md). Automation protection uses
   a private header, never a URL token.
   [Vercel automation protection](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

**Hosted authenticated rehearsal is presently BLOCKED.**
`src/features/staff-portal/config.server.ts` and the participant equivalent
require the fixed Production project and apex/www origins; Preview cannot run
those flows. Local test-mode providers are fixed loopback mocks. Hosted
console/test email is also unavailable. A separately reviewed, narrowly
allowlisted staging runtime with synthetic mail capture is needed before steps
6–7 can exercise real hosted sign-in, email checking and registration. Do not
spoof Vercel Production or copy live credentials. This preparation intentionally
does not weaken those security boundaries.

## 5. Seed synthetic actors, early-access list and closed settings

The seed is `scripts/staging/seed.ts`, using shared offline guards in
`scripts/staging/guard.mjs`. It refuses production/subdomains, unconfirmed runs,
nonexact patterns, redirects, mismatched project/DB endpoints, enabled policies,
nonempty Auth/edition/request tables and an existing output directory. It never
opens a workflow or sends mail. Counts are bounded (1–5,000 participants,
1–10 approvers); two additional synthetic Super Admins are created.

Create `.tools/staging/settings.json` with every value deliberately entered.
The following is a **shape**, not runnable approved settings:

```json
{
  "termsVersion": "v1.0",
  "privacyVersion": "v1.0",
  "earlyOpeningAt": "<ISO instant with Z or +03:00>",
  "generalOpeningAt": "<later ISO instant>",
  "closingAt": "<later ISO instant>",
  "capacity": "<owner-entered staging integer>",
  "placesRemainingThreshold": "<owner-entered staging integer>",
  "confirmSeatLeadDays": "<owner-entered staging integer>",
  "confirmSeatResponseHours": "<owner-entered staging integer>"
}
```

Replace quoted numeric placeholders with integers. For a rehearsal happening
now, set the synthetic early opening in the recent past, general opening a few
minutes ahead and closing after the test; preserve `early < general < closing`.
Use explicit seconds/timezone. These are staging choices, never approved live
dates. The seed copies early/general boundaries to both legacy early and priority
pairs and fixes ORG-056 free attendance, offer/waitlist duration 24h and age 18.
The about-2,000 seat scenario is an assumption requiring owner confirmation;
the script has no capacity default. Confirm-seat legacy fields are required by
completeness but do not approve that later workflow.

Set inputs privately in the owner process (or an ignored, access-restricted env
file):

| Input | Required value |
| --- | --- |
| `MSRC_STAGING_CONFIRM` | exactly `yes` |
| `MSRC_STAGING_APP_URL` | exact protected HTTPS staging origin |
| `MSRC_STAGING_APP_ALLOW_PATTERN` | exact escaped anchored pattern for that origin |
| `MSRC_STAGING_SUPABASE_URL` | new project's HTTPS URL |
| `MSRC_STAGING_SUPABASE_ALLOW_PATTERN` | exact escaped anchored pattern for that origin |
| `MSRC_STAGING_PROJECT_REF` | new project's 20-character ref |
| `MSRC_STAGING_DATABASE_URL` | matching native postgres URI, explicit port 5432, database `/postgres`, percent-encoded credentials, no query/fragment; transport enforces TLS independently |
| `MSRC_STAGING_POOLER_HOST` | only if using the exact dashboard Tokyo session-pooler host |
| `MSRC_STAGING_SECRET_KEY` | this project's server-only `sb_secret_...` key |
| `MSRC_STAGING_PARTICIPANT_PASSWORD` | strong synthetic-only shared load password, 16+ characters and at most 72 UTF-8 bytes; never reused elsewhere |
| `PGSSLROOTCERT` | path to the target project's trusted CA certificate, obtained/verified via the owner dashboard; selects `verify-full` for native SQL |

The reused native SQL transport falls back to encryption-only `sslmode=require`
if `PGSSLROOTCERT` is absent. For this owner procedure supply the CA so hostname
and certificate verification use `verify-full`; do not suppress certificate errors.
[Supabase connection/TLS guidance](https://supabase.com/docs/guides/database/connecting-to-postgres).

Generate patterns offline, rather than broad regexes. Supply origins without a
trailing slash, path, query or fragment:

```powershell
$env:MSRC_STAGING_APP_ALLOW_PATTERN = node --input-type=module -e "import {stagingAllowPattern} from './scripts/staging/guard.mjs'; console.log(stagingAllowPattern(process.env.MSRC_STAGING_APP_URL));"
$env:MSRC_STAGING_SUPABASE_ALLOW_PATTERN = node --input-type=module -e "import {stagingAllowPattern} from './scripts/staging/guard.mjs'; console.log(stagingAllowPattern(process.env.MSRC_STAGING_SUPABASE_URL));"
node scripts/staging/seed.ts --execute --settings .tools/staging/settings.json --participants 500 --early-access 50 --approvers 3 --run-id rehearsal
```

500/50/3 are synthetic practice counts to confirm, not an approved roster.
All emails end in `@example.invalid`. The seed first inserts passwordless native
Auth fixtures following the CI fixture shape, uses managed Auth
`updateUserById` to set passwords, then inserts private profiles, age/policy
proofs, role grants, early-access entries and settings with all gates closed.
It does not disable triggers or persist passwords in SQL. Native fixture/schema
compatibility must be verified in disposable DB tests and a single-user staging
smoke check before a full seed. A smoke seed makes its project nonempty: use a
separate fresh disposable project or delete/recreate it before the full seed.
[Supabase admin update API](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).

Output is `.tools/staging/rehearsal/manifest.json` plus
`staff-credentials.json`; the manifest must say `state=complete` before use.
Participant password remains in the private environment. Staff credentials are
independent. `.tools` is ignored, but verify restrictive Windows ACLs manually;
POSIX mode 0600 alone is not a Windows access policy. Never paste credentials
or manifests into reports. Failure may leave inert partial Auth fixtures;
discard/recreate the disposable project and choose a fresh run ID rather than
rerunning against uncertain state.

## 6. Authenticated load run (after staging runtime prerequisites)

Use `scripts/load/opening-rush.ts` (Node 24 built-in fetch/undici, no k6 install).
It refuses production and requires the same exact staging confirmation/allow
pattern, a synthetic seed manifest and a genuinely authenticated synthetic staff
session. It does not forge auth claims or relax rate limits. See
[load instructions](../../scripts/load/README.md) for exact environment inputs,
sharding, result fields and commands.

Assumptions to confirm: about 2,000 seats, 500 submissions in the first 600s,
1,000 public page fetches, 30s status polling and staff batches of 25. These are
HTTP exercises, not browser LCP, asset rendering or real user measurements.
The older [BL-TST-06](../backlog/22-testing.md) 100-active/1,000-public and API
p95 ≤1s objectives remain separate evidence; a relaxed load threshold does not
silently supersede them.

The current participant POST limiter permits 20/IP/hour across login and submit.
At least about 50 genuinely distinct egress IPs are needed for 500 two-POST
journeys in a clean window; leave headroom for retries/preflight and provider
limits. Process sharding behind one NAT does not help. The owner must approve
a legitimate distributed generator budget or separately review the rate-limit
policy. Also run a shared-egress negative case to observe controlled denial;
label it as a failure-mode run, not a successful capacity test. Never forge
forwarded IP headers or treat expected 429s as successful submissions.

Owner records source/compute/region, seed size, opening instants, actual unique
egress, thresholds, every shard's report and observed DB/provider signals.
Require all shards' expected submissions, matching staff decisions, acceptable
latency/error rates and DB invariants (capacity, one request/ticket/event) before
calling the full test PASS. Keep delivery disabled; an email throughput test
requires the separately implemented synthetic sink and bounded worker plan.
End-to-end staging, rate-limit distribution and native Auth remain NOT TESTED
until actually run; no hosted load was performed by this task.

## 7. Rehearse and tear down

Complete [APPROVER_REHEARSAL](APPROVER_REHEARSAL.md), pause/restore drills and
[MONITORING](MONITORING.md). Save sanitized results, hashes, bugs and explicit
PASS/FAIL/BLOCKED decisions in the owner's evidence location.

Owner then stops generators, revokes synthetic sessions and staging automation
tokens, closes all staging gates, removes branch-specific Vercel secrets and
staging deployments/aliases or deletes the separately created staging project.
Verify the selected project/branch is staging, retain Production settings and
do not remove shared integration/domain resources. Revoke staging-only keys and
remove local credential files by their exact reviewed paths; no broad deletion
command is provided. Preserve only the agreed sanitized receipt.

In Supabase staging **Project Settings → General → Delete project**, verify
the ref/name one final time and complete the owner's confirmation. Deletion
is irreversible; keep only synthetic evidence/exports required for the receipt
before this step. Confirm disappearance and billing usage afterwards; already
incurred charges remain. Pausing is not equivalent to erasing fixtures/keys.
[Supabase deletion](https://supabase.com/docs/guides/platform/delete-project),
[compute billing](https://supabase.com/docs/guides/platform/manage-your-usage/compute).
