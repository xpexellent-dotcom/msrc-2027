# Durable email outbox and job foundation

Current extension (23 October 2026, ORG-059/ENG-067): all eight registration
templates and abstract decision outcomes render a brand-art PNG banner, complete
English text, a divider and complete Arabic text. Subjects include both languages;
the Arabic HTML block is RTL. Every new bilingual participant composition is
**DRAFT pending owner approval** and the worker blocks delivery even for an older
frozen request under the same key. Template keys/versions and persisted `locale`
`en` remain unchanged; no migration or new RPC is needed. Existing frozen requests
remain immutable. See [REGISTRATION_EMAILS](REGISTRATION_EMAILS.md) and
[ABSTRACT_REVIEW](ABSTRACT_REVIEW.md) for owner previews and approval gates.

Registration slice 4 previously added business templates, atomic registration
producers and an authenticated GET cron bridge. The slice-2 account below is
historical where it describes synthetic-only producers or unavailable GET.
Delivery remains off, both caps remain zero, and no hosted activation is
authorized by these source changes.

BL-FND-04/05, BL-DEP-08; EML-01 through EML-05, API-01/02/03,
ERR-01/02, DAT-03/04, LOC-03, SEC-02/06. Engineering decision: ENG-046.
Registration slice 2 of 5, 16 October 2026. This is a closed, trigger-agnostic
foundation for review; it does not open registration, authentication email or
any other operational workflow.

ORG-055 staff queue slice 3 deliberately adds no producer here. Approval/waitlist
notification enqueue is slice 4 work: reviewed English business templates,
recipient policy and enqueue in the same database transaction as the decision,
behind the existing closed switches. `synthetic_notice` is not a participant
notification and is not reused for approval or waitlist decisions.

## Boundary

The only producer/template exercised here is synthetic: `synthetic_notice`,
version `1`, with a single `reference` variable. Recipients must end in
`@example.invalid`, enforced in both SQL and TypeScript, including the closed
Resend adapter. This slice cannot send participant notices by setting flags.
Future confirmation, ticket, waitlist, confirm-your-seat and decision templates,
approved content, recipient policy and domain event producers need their own
review. ORG-059 supersedes the original English-only rule for participant-facing
emails: the renderer includes English then Arabic, independently of persisted
`locale`. Staff/reviewer/faculty-judge emails, staff session email checks and
Contact delivery stay English-only. `synthetic_notice` is an internal fixture,
not a participant template, and retains its existing English text.

No Contact code or delivery behavior changes. Contact retains its existing
one-attempt, 60-admissions-per-UTC-day path and has no durable queue. Staff's
existing 36/day allocation is separate. Neither is a shared provider-wide
outbox ledger. A future Contact migration would need an explicit content/
retention review, transactional enqueue in place of inline sending, revised
visitor retry/status behavior and coordinated quota accounting. Do not silently
redirect existing Contact requests into this queue.

Owner decision **O10 (drain trigger) remains unresolved**. There is no Vercel
`crons` entry, deployment/environment edit, hosted migration application, paid
plan purchase or real email in this implementation. The SQL scheduler performs
database state maintenance only. It neither sends mail nor invokes HTTP;
`pg_net` is neither installed nor required.

## Data and transaction contract

`msrc_outbox` is private. Its tables have enabled and forced RLS and no client
grants. Narrow public RPC wrappers are service-role-only, have an empty
`search_path` and qualified object references. Backend credentials stay in
server-only modules. A service-role key is broader than one RPC; named custody
and environment separation remain required before activation.

A message identity stores a unique hash of the event idempotency key and a
canonical input hash. Its message stores a stable message ID, template key
and version, locale, the one necessary destination address, template variables,
status, attempt count, due time, lease owner/expiry, provider ID, bounded error
class and timestamps. It stores no credentials, tokens, raw provider responses,
manuscripts, survey answers, national IDs or complete domain records. The
synthetic variable is a bounded alphanumeric/underscore/hyphen reference, not
free text. Treat destination and payload as private personal data when future
real templates are approved; backups have their own retention requirements.

The server-only enqueue API validates before calling
`public.msrc_outbox_enqueue`. Repeating one event
key produces one message; a changed request under the same key is a conflict,
not an edit. Retained deduplication tombstones (`msrc_outbox.identities`)
prevent terminal-row purging from making that event sendable again. They retain
key/input SHA-256 digests, random message UUID and final status, with no raw key,
address or variables. Digests can still be linkable pseudonymous evidence;
indefinite retention is a proposal rather than a claim that hashing removes
every privacy concern. Event keys must be opaque and contain no
email, name or other personal information. Tombstone retention is a separate
owner-reviewed minimization decision; deleting them weakens deduplication.

Future reviewed `postgres`-owned registration RPCs must call
`msrc_outbox.enqueue(text,text,integer,text,text,jsonb)` **inside the
same PostgreSQL transaction** as the authorized registration state transition
and audit write. Use a stable domain-event identity such as an opaque event
UUID, with template version and intended recipient fixed for that event. An
enqueue failure rolls the entire operation back. A rolled-back registration
must leave neither a queue row nor a tombstone. Calling the HTTP enqueue RPC
after committing registration is two transactions and cannot provide this
guarantee. A queued message means accepted for processing, not sent or delivered.

This is an email implementation of the durable job contract. Other assessment,
scan, certificate or export workers are separate domain slices; this does not
introduce a generic arbitrary-payload execution API.

## State, claims and retries

| State | Meaning and next transition |
| --- | --- |
| `queued` | Accepted; eligible when due and permitted by the daily budget. |
| `sending` | Claimed with a bounded lease; only its current owner can prepare/finish. |
| `sent` | Sender/provider accepted the request. Inbox delivery is unproven. |
| `failed_retryable` | A bounded retry is scheduled with backoff. |
| `failed_permanent` | Validation/configuration conflict, exhausted attempts or expired safe retry horizon; operator attention. |
| `cancelled` | Operator stopped the message; it is not claimable. |

Claims use `FOR UPDATE SKIP LOCKED`, a small batch and an expiring lease.
Concurrent runs claim disjoint rows. Preparing and finishing use the exact
lease owner as a fencing condition, so a late former worker cannot overwrite a
new claim. A drainer does not extend its lease. Expired claims can become due
again, while max-attempt and provider-idempotency safety checks still apply.

Rendering is server-side and versioned. Before any provider attempt, the
worker persists the immutable request snapshot, including From, destination,
subject and body. Retries reuse that snapshot and provider key across
deployments. A changed sender/template body under a reused key is not a safe
retry. Console output and route summaries exclude addresses, payloads and
provider response bodies; the in-memory test sender captures synthetic data
only and is never selectable through the hosted route.

Timeouts, network failures, rate limits, provider 5xx and a simultaneous request
with the same provider key are retryable. Ordinary validation/authentication
4xx failures and a reused key with different content are permanent. Errors are
stored as allowlisted classes; do not persist response bodies or diagnostics
that can contain recipient data. Backoff is exponential, adds bounded positive
jitter and never exceeds its configured ceiling. Exhaustion stops automatic
delivery rather than resetting the attempt counter.

The UTC-day cap reserves an attempt atomically before claiming. Every attempt
consumes budget, including failure, timeout and an interrupted claim; there is
no refund. Both the database cap and the run's server configuration apply, with
the lower limit winning. A retry is another charged attempt. This conservative
accounting bounds provider requests, not the number of delivered messages.
Setting either cap to zero stops new claims. The default is zero because no
participant allocation has been approved. The reported 100/day free plan,
Contact's 60 and staff's 36 are not a launch allocation for registration;
participant volume needs an approved paid plan and coordinated provider budget.

## Resend idempotency: verified limits

Verified against official documentation on 16 October 2026:

- [`POST /emails` supports `Idempotency-Key`](https://resend.com/docs/dashboard/emails/idempotency-keys),
  up to 256 characters. Repeating an identical request within 24 hours returns
  the original result without another send.
- On that page, `409 invalid_idempotent_request` means the key was reused with
  different content; `409 concurrent_idempotent_requests` permits a later retry.
- [Resend error codes](https://resend.com/docs/api-reference/errors) distinguish
  invalid requests from throttling and internal failures. Classify the bounded
  error name/status without retaining the provider response.

Provider deduplication is time-limited. This implementation proposes a
**23-hour automatic retry horizon from the first claim/charged attempt**, leaving
margin before Resend's 24-hour expiry. After that horizon it stops for manual
reconciliation; it never assumes a fresh key makes an uncertain send safe.
A crash after provider acceptance but before `sent` can be retried safely with
the frozen request/key inside the horizon. Database leases alone cannot prevent
that external-side-effect gap, and this is not a promise of exactly-once
delivery forever. Resend acceptance also does not establish inbox delivery.

## Settings proposed for owner approval

All defaults below are engineering proposals, not organizer-approved live
policy. The database settings are private; change them only as the native
authorized database operator after review. No values are added to environment
files by this slice.

| Control | Closed/proposed default | Purpose |
| --- | --- | --- |
| SQL `delivery_enabled` | Off | Independently denies claims. |
| SQL `sweeps_enabled` | Off | Scheduled maintenance returns without mutation. |
| SQL `daily_cap` / `OUTBOX_DAILY_CAP` | `0` / `0` | No allocation; lower limit applies. |
| SQL `max_attempts` | `5` | Bounded retries, then permanent failure. |
| SQL `backoff_base_seconds` / `backoff_max_seconds` | `60` / `3600` | Exponential retry spacing. |
| Jitter | Up to an additional `25%`, within the ceiling | Avoid synchronized retries. |
| SQL `lease_seconds` | `120` | Recover interrupted claims; exceeds the run budget. |
| `OUTBOX_BATCH_SIZE` | `10`, maximum `10` | Small claim batch. |
| `OUTBOX_TIME_BUDGET_MS` | `20000`, maximum `20000` | Bounded run; leaves unstarted work recoverable. |
| SQL `retry_window_seconds` | `82800` (23 hours) | Stops before 24-hour provider-key expiry. |
| SQL `terminal_retention_days` | `30` | Proposal aligned with approved Privacy Policy's Resend sent-email period; local outbox retention still needs approval. |
| SQL `sweep_batch_size` / cadence | `100` / every five minutes | Bounded state/purge work, off by default. |

Other server-only configuration names are `OUTBOX_ENABLED`,
`OUTBOX_RESEND_ENABLED`, `OUTBOX_SENDER`, `CRON_SECRET`,
`OUTBOX_SUPABASE_URL`, `OUTBOX_SUPABASE_SECRET_KEY` and the existing
`RESEND_API_KEY`. Exactly `OUTBOX_ENABLED=true` is needed for the HTTP route.
Console is the development/CI sender; Resend additionally requires its explicit
flag and Production environment. Invalid/missing configuration fails closed.
The `test` sender is dependency-injected in tests only. Do not reuse production
credentials in local/Preview environments.

The private settings row is `msrc_outbox.settings`. Migration
`supabase/migrations/20261016140000_email_outbox.sql` is additive, later than the
reserved registration migrations and depends only on main's existing patterns;
it does not depend on an unmerged registration migration. Its `msrc-outbox-sweep`
pg_cron job runs `msrc_outbox.sweep()` at `*/5 * * * *`, owned by `postgres`,
and is inert while `sweeps_enabled` is false. It releases expired leases, stops
exhausted messages and purges old terminal rows according to the private settings. The
retention period does not authorize deletion of business/audit records. The
aggregate `msrc_outbox.health()` function reports queue depth, oldest queued age and failures
in the last 24 hours; it exposes no recipient, variables or provider body and
is native-`postgres`-only, not executable by `anon`, `authenticated` or
`service_role`. Failures means retained messages whose latest classified
failure is within 24 hours, not a complete attempt/event history.

## O10: drain trigger options and exact recommended steps

The shipped route is **POST `/api/jobs/outbox/drain`**. When closed it returns
404; otherwise a missing/wrong Bearer secret returns 401 without detail.
Authentication compares fixed-length digests using Node's constant-time
comparison. Successful responses contain counts only and are not cached.
Completion returns the persisted database status, so an exhausted retry counts
as a permanent failure even when its provider error was transient.
GET is deliberately unavailable in this slice.

Recommended, awaiting O10: Vercel Cron invokes a protected application handler;
pg_cron handles only database state sweeps. Vercel Cron calls production URLs
using **GET**, so its scheduler cannot directly invoke the current POST-only
route. The activation change must first add a GET bridge to the same protected
handler with the identical closed flag, constant-time Bearer check, caps and
lease fencing. Do not add an unauthenticated redirect or put a secret in a URL.
[Vercel Cron overview](https://vercel.com/docs/cron-jobs).

After explicit owner approval, in a separate activation change:

1. Record O10, approved runtime/budget, quota allocation, retry/retention settings
   and accountable operator. Confirm **Vercel Pro or Enterprise** for a
   per-minute schedule; Hobby supports daily jobs only. Confirm the separately
   approved paid Resend capacity before any participant producer/recipient
   policy is opened. [Cron plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
2. Obtain passing disposable-database migration, grant/RLS, concurrency and
   failure receipts, then review/apply only the outbox migration as native
   `postgres`; keep delivery and sweeps off. Do not apply unmerged registration
   migrations or reset/seed a hosted database. Verify cron ownership and that
   client RPC/health access is denied.
3. Implement and test the protected GET bridge described above; retain POST
   for the protected manual/other-trigger contract. Keep the synthetic-only
   recipient/template boundary until a separate domain delivery review.
4. In the approved Vercel project's **Settings → Environment Variables**, add
   `CRON_SECRET` as **Sensitive / Secret** and **Production only**. Generate a
   high-entropy random value privately: this route requires 32–256 ASCII
   alphanumeric/underscore/hyphen characters, exceeding Vercel's minimum
   recommendation. Never paste it into chat, source, URLs, logs or this runbook.
   Add the approved server-only Supabase credentials, sender flags and caps in
   the same protected settings. Vercel sends `Authorization: Bearer` using
   `CRON_SECRET`. New values require a deployment. Current docs call write-only
   Sensitive values **Secret**; legacy Sensitive values remain supported.
   [Cron authentication](https://vercel.com/docs/cron-jobs/manage-cron-jobs),
   [Secret variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables).
5. In that separately reviewed change, add one `vercel.json` cron entry whose
   `path` is `/api/jobs/outbox/drain` and `schedule` is `* * * * *`; deploy it to
   Production with the flags still closed. Inspect Vercel **Cron Jobs** to
   verify the path/schedule and production deployment. Nothing is scheduled by
   the present slice.
6. In local/disposable CI only, use console/test delivery and synthetic records
   to verify closed/secret denial, counts-only output, overlapping calls, cap
   exhaustion, interrupted leases and a frozen-key retry. Console/test senders
   are unavailable on hosted routes. With owner authorization, configure matching
   SQL/app caps and enable only this foundation; enable sweeps separately after
   the retention proposal is approved. Real inbox/Reply-To/bounce testing,
   callback handling and recipient expansion belong to BL-DEP-08/domain gates.
7. Observe actual invocations, health and failures before opening a producer.
   Vercel does not retry failed cron invocations and may overlap invocations;
   subsequent scheduled runs plus database claims provide recovery. Retain
   failure receipts and inspect provider state before any uncertain replay.
   [Cron behavior](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

Alternative, not recommended: pg_cron can invoke an HTTP sender through
`pg_net` plus separately secured credentials/network handling. That adds an
extension and secret-management surface, still needs the same route guards,
caps and leases, and does not improve provider idempotency. It needs a separate
owner decision, migration, operational review and tests. This slice installs
no `pg_net`, database HTTP call or drain schedule. See
[Supabase Cron](https://supabase.com/docs/guides/cron).

## Operator runbook

**Monitor:** use native `postgres` with read-only aggregate/ownership checks:

```sql
select * from msrc_outbox.health();
select delivery_enabled,sweeps_enabled,daily_cap,max_attempts,lease_seconds,
       backoff_base_seconds,backoff_max_seconds,retry_window_seconds,
       terminal_retention_days,sweep_batch_size
from msrc_outbox.settings where singleton;
select jobname,username,database,schedule,active
from cron.job where jobname='msrc-outbox-sweep';
```

Inspect queued age, retry/permanent failure counts, remaining UTC-day budget,
sweep switch and the last actual run. Counts do not establish delivery. Avoid
exporting addresses/payloads into ordinary logs or dashboards. An operator
failure dashboard and authenticated provider delivery/bounce callbacks remain
future work; there is no client-facing queue listing in this slice.

**Pause:** as native `postgres`, run
`update msrc_outbox.settings set delivery_enabled=false where singleton;`
or set the approved cap to zero first for an
immediate stop to new claims. Already-running provider calls may complete;
record and reconcile them. Disable the Vercel cron after O10 activation if
needed. The application flag is a redeploy switch, not an instantaneous kill
switch. Sweeps have a separate off switch and may remain off during an incident.
Do not delete messages/tombstones to pause work.

**Replay safely:** an authorized native database operator first pauses new
claims, records the reason/event identity and checks the immutable request,
first claim/charged-attempt time, provider ID and error class. For an uncertain
timeout/crash, reconcile provider acceptance before acting. Within the safety
horizon a same-key/same-snapshot retry is eligible; preserve its key, frozen
payload and attempts. Beyond that horizon, or after provider acceptance, do
not reset attempts or issue a new key as a routine retry. Confirm delivery state
privately with the provider and record an explicit owner decision for any new
business notification. Correct a permanent validation/template problem through
a separately reviewed new event/template version only when the original cannot
still deliver. No replay console or broad replay API is opened here.

For a retained `failed_permanent` message only, the following is the narrow
native-`postgres` requeue procedure. Bind `reviewed_message_id` privately in
psql; it is a reviewed UUID, never an address or recipient-supplied value. First
record a reviewed operator incident/change receipt with the reason, provider
reconciliation result and message UUID. It must prove either no completed
original request or a safe identical-key retry inside the remaining horizon.
An `idempotency_conflict` class alone is insufficient evidence: a concurrent
request may be retryable, whereas changed-content conflicts are permanent.
Never use this procedure to bypass validation, the attempt maximum, a purged
message/tombstone or an expired horizon, or to turn an accepted original into
a second business notification. A retained `sent` message is never eligible.

```sql
begin;
-- Hold the pause/settings row stable for this reviewed operation.
select delivery_enabled from msrc_outbox.settings where singleton for update;

with eligible as (
  select m.id
  from msrc_outbox.messages m cross join msrc_outbox.settings s
  where s.singleton and not s.delivery_enabled
    and m.id=:'reviewed_message_id'::uuid
    and m.status='failed_permanent'
    and m.last_error_class in ('timeout','transport','rate_limited',
      'provider_unavailable','provider_response','idempotency_conflict')
    and m.attempt_count < s.max_attempts
    and m.first_attempt_at is not null
    and m.first_attempt_at + make_interval(secs=>s.retry_window_seconds)
        > clock_timestamp()
    and m.provider_request is not null and m.provider_message_id is null
    and m.claimed_by is null and m.lease_token is null
    and m.lease_expires_at is null
  for update of m
)
update msrc_outbox.messages m
set status='failed_retryable',next_attempt_at=clock_timestamp(),
    completed_at=null,claimed_by=null,lease_token=null,lease_expires_at=null,
    updated_at=clock_timestamp()
from eligible e where m.id=e.id
returning m.id,m.status,m.attempt_count;
-- Commit only if exactly the reviewed one row returned; otherwise ROLLBACK.
```

The operator executes `COMMIT;` only after that one-row check and adds the
observed result to the incident/change receipt. Zero rows means **BLOCKED**;
roll back and investigate without improvising a wider predicate or resetting
attempts. Preserve `attempt_count`, `first_attempt_at`, provider key and frozen
request. Resume only the previously approved cap/switch and observe the next
attempt. The database does not create a new organizer audit record for native
SQL, so the reviewed operator receipt is mandatory for this procedure.

**Retention:** enable sweeps only after owner approval of the proposed local
30-day retention and tombstone policy. Purging terminal messages retains minimal
deduplication evidence; it does not erase provider/inbox copies or backups.
Restore operations must preserve/reconcile deduplication and provider evidence
before claims resume, or an old restored row could repeat an external effect.

## Verification and remaining work

Exact commands/results are recorded in
[the per-task progress receipt](../progress/2026-10-16-codex-email-outbox.md).
Local Docker/Supabase is unavailable: migration/pgTAP and real database
concurrency execution are **BLOCKED locally**, prepared for disposable Linux CI.
TypeScript tests use synthetic recipients and an in-memory/intercepted sender.
No hosted execution, real mail or participant flow is implied by a passing unit
test or build.

Remaining gates: O10; approval of cap/retry/lease/sweep/retention/tombstone
proposals; paid participant email allocation; production credential custody;
provider/privacy/transfer and delivery evidence; domain producers/templates;
failure administration; delivery/bounce callbacks; required synthetic volume
scenarios; human inbox/client UAT. The current task makes no organizer decision
under ORG-052 and does not complete all of BL-FND-05 or BL-DEP-08.
