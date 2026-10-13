# Participant cleanup scheduler — closed launch-readiness foundation

AUTH-08, PRV-04/05/08, SEC-02/06, INF-05, REL-06. Review-only source;
no hosted migration, account, delivery, setting or flag is changed by this work.

The owner must apply **20261008160137_participant_age_retention.sql first**, then
**20261013205046_participant_cleanup_scheduler.sql**, each independently through
the [activation runbook](PARTICIPANT_ACTIVATION_RUNBOOK.md). Never apply the sample
migration to hosted, or use `supabase db push` there. The dated hosted snapshot
must be rechecked by the owner immediately before either application.

The follow-on migration adds private forced-RLS `scheduler_settings` and
`retention_ledger` tables. No client, service-key or native Auth role can read them
or execute operator functions. Operator functions require both the current role
and original session identity to be `postgres`. Every function has an empty
search path. The sole new definer is a narrow, ungranted receipt trigger: existing
native verification flows retain their original evidence guard and record the
receipt atomically. There is no public RPC or network extension dependency.

## Candidate defaults requiring owner approval

| Private setting | Default | Purpose |
| --- | --- | --- |
| cleanup_schedule | `0 0 * * *` | Daily cleanup at midnight in the actual cron timezone; verify UTC before hosted approval |
| cleanup_batch_size | `100` | Bounded oldest-first batch; approve capacity and outage catch-up against expected demand |
| staff_purge_schedule | `15 * * * *` | Hourly removal of staff abuse-counter/login-attempt rows strictly older than 24 hours |
| history_purge_schedule | `30 0 * * *` | Daily purge of terminal cron history |
| cron_history_days | `7` | Keep recent terminal history; preserve running rows even if old |

The settings row is authoritative: an operator update atomically reschedules
the three named jobs as postgres in the same database. The existing Contact job
is preserved. Schedule changes do not enable retention or participant accounts.
The nominal daily cleanup interval can leave a delay after the 30-day deadline;
a daily batch of 100 can also build a backlog. The owner and privacy approver must
approve cadence/capacity/exception handling and prove the backlog stays within
their agreed deletion window before opening account collection.

`msrc-participant-unverified-cleanup` invokes `run_cleanup_job()`, which calls the
unchanged `cleanup_unverified(batch_size,false)` worker. While retention is false,
it returns closed aggregate counts and deletes nothing. The worker retains all
verification, authority, file-ownership, hold, locking and atomic erasure checks.
If any subject fails in a scheduled batch, the wrapper raises only a fixed safe
error; the whole batch rolls back and cron records failure. Do not retry a failed
batch blindly. Direct manual use of the older worker retains its original
per-subject failure evidence semantics.

`msrc-staff-abuse-purge` touches only `msrc_staff.limit_events` and
`msrc_staff.login_attempts`, never staff audit, authority or session evidence.
`msrc-cron-history-purge` removes old `succeeded`/`failed` rows across cron jobs,
using completion time (start time only if completion time is absent). This does
not erase provider logs, backups, the independent ledger or participant evidence.

`scheduler_health()` reports exactly job name, last run, last successful finish,
and failure count in the last 24 hours for every currently registered `msrc-*`
job, including misowned jobs requiring separate triage. It exposes no command,
exception/provider payload or personal data.
Times are limited to retained cron history: null or stale times require triage,
and absence of failures alone does not prove a job is running or a ledger was
exported. The owner must separately check job presence/active state and external
export freshness against the settings and an approved monitoring policy.

## Independent deletion / ever-verified ledger

Each receipt contains exactly `actor_id` (opaque UUID), `event` (`ever_verified`
or `account_erased`), and `occurred_at`. `(actor_id,event)` is the deduplication
key. Receipts are immutable and capture first observed verification or the actual
erasure timestamp. Verification backfill is marked by its observation time; it
does not invent a historical verification date. No name, email, credential,
digest, IP, age value, notice/proof ID or operational entitlement is exported.

`export_retention_ledger()` is postgres-only and defaults to the full snapshot.
After each cleanup and verification export cycle, merge a full snapshot into
the independently encrypted backup location and verify the durable write/hash.
Keep the existing outside ledger when the database is restored: merging an older
restored snapshot must never replace newer receipts. The optional `since` is
inclusive for timestamp ties, but timestamps alone can miss transactions that
commit late. Incremental exports require a separately approved serialization
protocol; the runbook's default full export avoids that gap.

This implements the database side only. External storage custody, encryption,
export automation, failure alerts, retention duration and restore replay remain
owner/privacy approval gates. No credentials or destination are invented.
The normal source guards deliberately reject unauthenticated external claims of
verification and ad hoc erasure; restore replay requires a reviewed procedure
on an isolated restore with access closed, proof that every external receipt was
reconciled, and staff regression/UAT before reopening. This PR creates no unsafe
trigger-disabling or direct-delete restoration shortcut.

Owner decisions to record before activation: accept or revise the candidate
cadences/batch/history retention; name the privacy approver and approve exception
and provider-log handling; approve external ledger retention/custody and full
export frequency; choose and rehearse the restore reconciliation procedure; and
approve actual shared email quotas, native rate limits and the human UAT window.

## Validation and release boundary

The new rollback-only SQL suite covers scheduled ownership/settings, closed and
enabled cleanup, dry run, protected subjects, failure rollback, exact purge
boundaries, minimal immutable export receipts, aggregate health and actual API
role denials. Existing participant catalogue assertions include the two new
private tables. Current observed local and exact-head CI results are in the
dated [progress note](../progress/2026-10-14-codex-participant-cleanup-scheduler.md)
and draft PR body. Synthetic CI is not hosted application or human approval.
