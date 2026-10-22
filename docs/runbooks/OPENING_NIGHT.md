# Opening-night owner runbook

Prepared 20 October 2026; ENG-056, ORG-055/056, REG-01–08, INF-04–06,
NFR-01–03, EML-01–05 and REL-02/06. Preparation only. Every hosted action below
is for the owner during a separately authorized release; none was performed by
this task. Record operator names privately; the rota is not yet supplied.

22 October activation update (ENG-060): use [ACTIVATION](ACTIVATION.md) for the
ordered environment/SQL switches, current owner-reported migration baseline,
ORG-057 email wording approval and the five-minute Pro cron. This runbook remains
the release coordination and incident companion; older unknown-plan wording is
superseded by the owner's paid-plan report, not live account verification.

ORG-056 sets early access to **15 November 2026, 20:00 Asia/Riyadh** and general
opening to **18 November 2026, 20:00 Asia/Riyadh** (17:00 UTC each). Repeat this
timeline for each opening. Enter those instants in reviewed settings; do not copy
the staging dates. Attendance is free; every request still needs approval.

## Timeline and responsibility

| Time | Owner action and evidence |
| --- | --- |
| T−7 days | Name release lead, database operator, application operator, email watcher, approver lead, communications owner, and backups. Confirm two distinct active Super Admins and recovery custody. Reconcile source SHA, migration manifest, O11 staging costs and paid provider plans. |
| T−6 to T−4 days | Complete [staging setup](STAGING_SETUP.md), native Auth/staging runtime prerequisites, synthetic load and failure runs. Complete [approver rehearsal](APPROVER_REHEARSAL.md). Preserve failed receipts as well as passing ones. |
| T−3 days | Review EN/AR settings and opening time conversion with a second reader; verify early-access list privately. Confirm capacity and remaining required settings. Approve all English transactional wording; no DRAFT template is cleared by this runbook. |
| T−2 days | Rehearse protected backup/restore, pause, deployment rollback, other-Super-Admin recovery, monitor notification and escalation. Agree actual response thresholds and on-call acknowledgement time. |
| T−1 day | Freeze unrelated changes; confirm exact serving SHA/CI, migrations and plan quotas. Review outbox throughput calculation below. Secure fresh backup and storage-object evidence. Test delivery only under separate owner authorization. |
| T−60 min | Join the private operations channel, assign watcher coverage through T+2h, check provider incidents, current dashboards and fresh backups. Approvers sign in and complete their own email checks. Verify the correct edition and current gate states. |
| T−15 min | Release lead records every go/no-go row below. Missing evidence means NO-GO. Read opening time back in Riyadh and UTC; verify no maintenance or conflicting deployment is planned. |
| T−5 min | Owner performs only the approved activation packet; monitor actual deployed flags, database readiness and delivery caps. Keep early/general time enforcement in the database. Prepare an unsent pause notice. |
| T=20:00 | Watch one authorized real journey, then the aggregate rate, database latency, errors, queue and delivery evidence. Approvers follow the rehearsed batch size and refresh after each result. Do not run the synthetic load tool against production. |
| T+5, +15, +30 min | Compare submissions, pending decisions, held seats and outbox trend against expectations. Reconcile partial batches and conflicts. Release lead decides whether to pause. |
| T+60 min | Rotate approvers/watchers without shared accounts; verify session renewal and fresh email checks. Review quota remaining, retries and oldest pending email. |
| T+2h | Record incident/checkpoint receipt, current gates/counts and next shift. Maintain expiry/offer monitoring beyond the rush; offers last 24 hours. Do not leave automatic hand-on without an accountable expiry operator. |

## Go/no-go record

Every row needs PASS, time, evidence link and accountable reviewer. This document
is not a green readiness checklist.

- Reviewed migrations applied in the approved **Production single-migration
  protocol**, with exact ledger/hash, grant/RLS, native Auth, permission,
  concurrency and regression evidence. Missing RPC/`area-not-ready` is NO-GO.
  Use [participant activation](../features/PARTICIPANT_ACTIVATION_RUNBOOK.md),
  not the fresh-staging replay procedure.
- Settings saved and second-reader reviewed: free attendance, confirmed capacity
  (2,000 owner-entered per ORG-051/055), approved terms version, both early-window
  pairs, general opening, closing time, 24-hour offer window, age 18, threshold
  and required legacy waitlist/confirm-seat values. Resolve pending values rather
  than inventing them. Check early-access list, ticket key custody and audit.
- [Staff readiness](../features/STAFF_ACTIVATION_CHECKLIST.md) and participant
  activation checklist green, two Super Admins enrolled, native email suppressed
  on forbidden paths, approved auth delivery/privacy/location/recovery evidence.
- Outbox templates approved; actual paid Resend plan, remaining monthly quota,
  team rate limit, sender verification and authorized inbox test recorded.
  `OUTBOX_ENABLED`, `OUTBOX_RESEND_ENABLED`, app cap and database
  `msrc_outbox.settings.delivery_enabled/daily_cap` independently verified at the
  authorized opening. Authentication and Contact budgets are separate consumers.
- Fresh protected backup **and demonstrated restore** completed; storage bytes
  backed up separately. Confirm recovery point and rollback that preserves new
  requests. Database backups exclude Storage objects.
  [Supabase backup limits](https://supabase.com/docs/guides/platform/backups).
- Staging load passed at the reviewed source, equivalent intended compute and
  bounded quotas, with actual participant/staff paths and synthetic mail sink.
  The current Preview/Auth and one-egress rate-limit blockers must be resolved;
  a public-page-only pass or mock suite does not meet this gate.
- Approvers rehearsed in EN/AR; CSV access, mistakes, session expiry and recovery
  covered. Monitoring routing tested and acknowledged; primary/backup names set.
- Pause and rollback rehearsed; owner explicitly records GO for this window.

### Email budget and throughput

Read actual Resend account usage before choosing any cap. Let the approved
outbox attempt budget be `B`; allow for retries, existing backlog, receipt and
approval/offer messages, and other workflows. Require `B + reserved auth +
Contact + other sends + safety reserve` within the remaining paid allocation.
Set both app and SQL outbox caps to the reviewed budget; the smaller wins and
each attempt consumes budget. Paid plans may lack a provider daily limit, but
the application still needs a finite daily cap. Resend currently publishes Pro
at $20/month for 50,000 emails and no daily limit; verify the actual account,
overages and invoice before purchase. The team API rate limit is shared across
keys, and quota exhaustion differs from rate limiting.
[Pricing](https://resend.com/pricing), [limits](https://resend.com/docs/api-reference/rate-limit).

**Capacity warning:** the current worker claims at most 10 messages per call.
The shipped `vercel.json` now uses `*/5 * * * *`, based on the owner's Vercel Pro
purchase report. A five-minute cron processes at most 120 attempts/hour;
one-minute invocation would be at most 600/hour, before errors.
500 received + 500 approved messages in ten minutes would need about 100
attempts/minute to keep up. This is a planning example, not approved traffic.
A paid Resend plan alone does not solve this bottleneck. Review and measure a
bounded higher-throughput worker/trigger plan before GO; do not remove caps or
add an unbounded manual loop. Hobby cron is daily; Pro/Enterprise can run every
minute. [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).

Automatic hand-on is transactional when expiry is invoked by staff registration
reads/actions or the affected participant's status/action. It is **not** a
background expiry scheduler. The outbox cron only drains mail. Assign an operator
to refresh the queue during the offer period, or separately implement and verify
an authorized expiry trigger before promising prompt unattended hand-on.

## Who watches what

| Role, name to fill privately | Watch and escalation |
| --- | --- |
| Release lead + backup | GO/NO-GO, incident log, pause/resume decision; receives all critical alerts. |
| Application operator | Public EN/AR probes, `/api/health`, serving SHA, Vercel errors/timeouts/rollback; escalates to lead. |
| Database operator | Supabase CPU/memory/IO/connections, slow queries/locks and auth failures; executes reviewed pause/repair. |
| Email watcher | Outbox ages/states and drain invocations, Resend acceptance/delivery/bounces/quota; distinguishes accepted from delivered. |
| Approver lead | Pending/held counts, batch results, mistakes, session problems and hand-on refresh duty. |
| Communications owner | Adapts drafts below, obtains lead approval and publishes via existing authorized channel. |

See [MONITORING](MONITORING.md) for exact URLs and proposed thresholds.

## Known failures and exact response

| Signal | Response |
| --- | --- |
| Database slow / health 503 | Application operator confirms 2 failures and compares public page. DB operator checks connections, lock wait and slow-query dashboards; stop load/retry amplification. Reduce approver batch concurrency. If requests cannot be safely accepted, pause below. Do not restart/drop data or raise connection counts blindly. Identify blocker before an authorized targeted intervention; save incident timings, not payloads. |
| Email delayed / backlog grows | Check last drain invocation, 401/404/5xx, both caps, SQL delivery switch, due times, leases, provider 429/5xx and actual remaining quota. Preserve jobs/idempotency keys. Never replay uncertain sends with new keys or reset attempt counts. Reconcile provider acceptance before manual retry; the automatic retry horizon is 23h. Pause new offers/registration if deadlines cannot be communicated safely. DRAFT wording or absent paid capacity is NO-GO. |
| Wrong settings | Pause admissions first. Super Admin opens Registration settings, reviews the before/after diff, saves a complete correction and another reader verifies Riyadh instants. UI cannot enable registration or lower capacity below held seats. Do not alter existing deadlines or audit rows manually. Reconcile affected requests/offers, then lead authorizes resume. |
| Site down | Check Vercel deployment and provider incident, DNS/TLS from an independent probe and `/en` plus `/ar`. Roll back only to a verified compatible deployment with unchanged secrets/DB contracts. Do not run down migrations or restore away new registrations. Owner approves the outage draft. |
| Approver locked out | Stop repeated guesses; check actual cooldown and wait the approved 15 minutes for wrong-code lockout. Fresh password session then newest email code; do not share sessions. If mail is unavailable, use another already-authorized approver/Super Admin. A Super Admin checks role, edition, suspension and recovery hold privately; never bypass exact-session email assurance. |
| Super Admin authenticator lost | The **other** active Super Admin signs in with their own TOTP, verifies the person's identity under the approved procedure, uses People → reset authenticator (or full account reset if required), and checks audit. Recovery revokes sessions and keeps a hold on provider failure. Retry the same recovery mode through the UI; do not clear the hold/SQL-delete a factor. Both admins unavailable: NO-GO/escalate to documented institutional recovery; no self/email fallback or bootstrap reuse. |

## Safe pause and resume

For an admissions pause, the authorized DB operator first verifies the target
project, actual edition and current settings, then executes this reviewed shape
in the SQL editor as native `postgres`. Replace the placeholder with the reviewed
edition key. **It only disables.** A zero-row result or timeout is not a pause.

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_registration.settings
set enabled = false, updated_at = clock_timestamp()
where edition_key = '<REVIEWED_EDITION_KEY>'
returning edition_key, enabled, updated_at;
commit;
```

Read back `enabled=false` and test that new submission is closed. This takes the
same settings-row lock as allocation; transactions committed before the pause
remain real records and must be reconciled. Record who/when/why externally.
Set `REGISTRATION_ENABLED=false` in the authorized Vercel environment and redeploy
as the additional application barrier. Verify serving deployment and closed EN/AR
journeys. Do not rotate identity/ticket keys or erase requests to pause.

This also closes participant offer/cancel/ticket access: it is not a new-request-only
switch. Staff queue reads can still expire offers and hand seats onward even when
`settings.enabled=false`; stop approver queue refresh/actions if a full allocation
freeze is needed. For an enforceable full freeze, additionally disable
`msrc_staff.policy.enabled` (after recording its prior value), close
`STAFF_PORTAL_ENABLED` and redeploy; this closes **all staff** and must be directed
by the incident lead. Account for already-running transactions. Do not represent
the admissions switch as a universal freeze or promise that offer clocks stop.

For that explicitly chosen full-freeze path, the verified native operator uses
the same bounded transaction routine and confirms exactly one policy row:

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_staff.policy set enabled = false where singleton returning enabled;
commit;
```

If email itself must stop, independently set SQL outbox `delivery_enabled=false`
and `daily_cap=0` and close `OUTBOX_ENABLED`/app cap. Already handed-off provider
requests may still complete. Retain backlog for reconciliation.

```sql
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
update msrc_outbox.settings set delivery_enabled = false, daily_cap = 0
where singleton returning delivery_enabled, daily_cap;
commit;
```

Resume only after the cause is fixed, affected deadlines/messages are reconciled,
settings and tests are rechecked, and the lead records authorization. Restore
only recorded approved values through the release packet; UI Save alone cannot
open registration. No automatic resume or deadline extension is implied.

## Owner communications — DRAFT, do not send automatically

**Pause, EN:** Registration is temporarily paused while we resolve a technical
issue. If you already submitted a request, please retain your request reference
and wait for our update before trying again. We will post an update at
[owner-approved time and channel].

**Pause, AR:** تم إيقاف التسجيل مؤقتًا لمعالجة مشكلة تقنية. إذا سبق لك إرسال طلب،
يرجى الاحتفاظ بمرجع طلبك وانتظار تحديثنا قبل المحاولة مجددًا. سننشر تحديثًا في
[الوقت والقناة المعتمدان من المنظّم].

**Email delay, English transactional draft:** Your notification may be delayed.
Please sign in and check My registration for your current status. Do not submit
a duplicate request. [Owner-reviewed instruction for any affected offer deadline.]

**Resume, EN:** Registration is available again. Please sign in to check your
current status before submitting another request. [Owner-approved deadline update,
only if separately decided.]

**Resume, AR:** أصبح التسجيل متاحًا مجددًا. يرجى تسجيل الدخول للتحقق من حالة طلبك
قبل إرسال طلب آخر. [تحديث الموعد، إذا اعتمده المنظّم بقرار مستقل.]

**Internal handover draft:** [Time Riyadh/UTC], [incident/reference], [current
gate states], [aggregate impact], [action and reviewer], [next check], [next
owner]. No participant data, keys, sessions or recovery codes in chat or receipts.
