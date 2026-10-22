# Monitoring plan — owner configuration only

ENG-056; NFR-01–03, EML-05, INF-04–06, SEC-02/06. No monitors, paid resources,
provider settings or hosted flags are created by this document. The owner fills
the rota and configures an existing low-cost service or an authorized operator
probe. Proposed intervals/thresholds below require review after staging results.

## Exact probes

Production examples use the existing canonical site; staging substitutes the
single reviewed protected staging origin from [STAGING_SETUP](STAGING_SETUP.md).
Probe paths exactly, without redirects to another host and without query secrets.

| URL / request | Expected signal | Suggested frequency |
| --- | --- | --- |
| `GET https://msrc2027.com/api/health` | 200 JSON `status=ok`, `scope=runtime-health`, with `database=not-configured` before health database configuration or `database=reachable` after a successful ping. Configured but missing RPC returns 503 `database=not-ready`; other configuration/DB faults return 503 `database=unavailable`. No provider/SQL details. | 60s; alert after 2 consecutive failures, recover after 2 successes. |
| `GET https://msrc2027.com/en` | 200 HTML, conference page marker, expected host/TLS; record latency. | 60s. |
| `GET https://msrc2027.com/ar` | 200 HTML, Arabic locale/RTL marker and expected host/TLS. | 5min, plus before GO and after any deployment. |
| `GET https://msrc2027.com/api/jobs/outbox/health` with `Authorization: Bearer <OUTBOX_MONITOR_SECRET>` in a private header | 200 aggregate JSON described below. Never log secret or response headers containing credentials. | 60s during rush, 5min otherwise. |
| `/api/registration/me` | **Do not use as an uptime probe.** It is session-bound and can expire the viewer's offer and hand a seat onward. Anonymous denial only demonstrates a gate, not database/registration readiness. | No automated production polling. Exercise synthetic authenticated status in the staging load runner; manual own-account checks only under the release plan. |
| `/api/jobs/outbox/drain` | **Do not use for uptime.** GET/POST can send mail and spend quota. HEAD intentionally returns 404 and proves no drain health. | Observe scheduled invocation logs; do not invoke merely to test uptime. |

The new health migration is
`supabase/migrations/20261020160000_operational_health.sql`. It grants only
`service_role` the public wrappers `msrc_health_check() returns boolean` and
`msrc_outbox_monitor() returns jsonb`; `anon`/`authenticated` have no execution.
No private schema/table is exposed. Review/apply through the relevant staging or
Production procedure before enabling database probes. The runtime uptime probe
can be configured before this migration or its health database environment.

`/api/health` uses independent server-only `HEALTH_SUPABASE_URL` and
`HEALTH_SUPABASE_SECRET_KEY`. It makes a bounded constant-query RPC rather than
scanning application data. Its three configuration/failure states are:

| Condition | HTTP / JSON body | Meaning |
| --- | --- | --- |
| Both health settings absent or empty | 200 `{ "status": "ok", "scope": "runtime-health", "database": "not-configured" }` | The runtime answered; no database call or database readiness claim is made. Other Supabase settings do not enable this probe. |
| Valid health settings; RPC absent/stale (`PGRST202`, HTTP 404) | 503 `{ "status": "unavailable", "scope": "runtime-health", "database": "not-ready" }` | Review the health migration and Data API schema cache. |
| Partial/invalid health settings, timeout, unreachable DB, invalid payload or another DB error | 503 `{ "status": "unavailable", "scope": "runtime-health", "database": "unavailable" }` | Investigate configuration or reachability. Nonempty whitespace settings are invalid. |

A successful configured ping returns 200
`{ "status": "ok", "scope": "runtime-health", "database": "reachable" }`.
All responses are `no-store`. Runtime-only monitoring accepts `not-configured`
on day one. Once database monitoring is intentionally configured, require
`database=reachable` as its success marker so accidental removal of both
settings does not silently weaken that monitor. Reachability through the Data
API does not certify schema readiness, auth, email or every business gate.
Pages can remain available while the configured probe returns 503.

The outbox health route uses `OUTBOX_SUPABASE_URL`,
`OUTBOX_SUPABASE_SECRET_KEY` and a new independent `OUTBOX_MONITOR_SECRET`
(32–256 ASCII letters/digits/underscore/hyphen). It works with delivery off.
Absent monitor secret configuration returns 404; absent/wrong Bearer secret 401;
an authenticated request with absent/invalid database configuration returns 503;
missing monitor RPC returns 503 `area-not-ready`; other DB faults return 503
`unavailable`. Responses are `no-store`. Never give the monitor the database
service key or the drain's `CRON_SECRET`.

Successful JSON contains `status`, `counts` for `queued`, `sending`, `sent`,
`failed_retryable`, `failed_permanent`, `cancelled`, and
`oldestPendingAgeSeconds` (zero if none). It contains no names, addresses,
identifiers, message bodies, provider IDs or credentials. Counts cover retained
rows, so purging changes terminal totals. Oldest pending age measures creation
age of queued/retryable jobs, not just jobs currently due. Sending jobs are
counted separately and are not included in that age.

This endpoint is read-only but counts retained rows; use the modest interval
above and measure its latency. If growth makes scans expensive, review a
pre-aggregated signal, rather than increasing monitor frequency. A 200 means
the query succeeded, not that the queue is healthy. No drain heartbeat is
persisted by this change: correlate invocation logs and queue-age trends.

## Alert rules and private routing

| Proposed condition | Route / action |
| --- | --- |
| Public or DB probe fails twice, or public response has wrong body/redirect/TLS | Application operator + release lead; backup if unacknowledged for 5min. Compare both signals before declaring total outage. |
| Outbox 401/404/503 twice | Email watcher + application operator. Verify secret/configuration/migration; no automated drain/retry. |
| Any new permanent failure or growing retryable count across 3 polls | Email watcher checks classified provider failures and remaining quota; escalate to lead if offers may be affected. |
| Oldest pending age exceeds 10min, or pending queue rises for 10min while delivery is meant to be on | Email watcher checks budget, scheduler and throughput; compare with agreed service objective. Delivery-off staging deliberately queues messages and must not generate production pages. |
| Sending rows persist beyond the configured 120s lease plus 2 monitor intervals | DB/email operators inspect sweep state and drain failures. Aggregate count alone cannot prove these are the same rows; use a restricted native diagnostic before intervention. |
| No successful drain invocation for twice the **approved** cadence plus execution margin | Application operator checks Vercel Cron/logs; HTTP health alone does not prove scheduler execution. Current daily schedule cannot satisfy a five-minute expectation. |
| API latency/error rate breaches agreed load baseline, connections/CPU/IO sustained near measured capacity | DB/application operators reduce concurrent manual work and use [incident responses](OPENING_NIGHT.md). Do not invent an automatic compute upgrade. |

Use the owner's existing private operations channel and named primary/backup
contacts; names and routing addresses are TBD. Alert only metadata: environment,
path, bounded status, aggregate counts, UTC/Riyadh time and private incident link.
Do not include session cookies, query bodies or participant data. Test alert
delivery and acknowledgement with a labelled synthetic incident before T−1 day.
No messages are sent by this task. Participant notifications remain email-only.

## Dashboards to keep open

- **Vercel:** correct project/deployment and source SHA; Observability request
  volume, latency, errors, function timeouts and resource usage; filtered runtime
  logs for health/staff/registration/outbox; Cron Jobs invocation status/schedule.
  Check Usage/plan limits and provider status separately. Extra observability
  retention/features can cost money; use existing plan capabilities first.
  [Observability](https://vercel.com/docs/observability),
  [cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing).
- **Supabase:** correct project/region; Reports/Database CPU, RAM, IO/disk,
  active/max connections; query performance and lock waits; Auth/API error
  trends and Logs Explorer; backups/restore evidence. Metrics export is an
  alternative for an existing monitoring stack, not a request to provision one.
  [Metrics](https://supabase.com/docs/guides/observability/metrics),
  [database monitoring](https://supabase.com/docs/guides/database/inspect).
- **Resend:** account Usage/plan remaining quota and team rate limit; API logs
  filtered 429/5xx and Emails delivery/bounce status. `sent` in our outbox means
  provider acceptance, not inbox delivery. Correlate privately; do not export
  recipient lists into incident receipts.
  [Usage limits](https://resend.com/docs/api-reference/rate-limit),
  [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).

For protected staging, use the provider's automation-bypass **header** in secret
storage, independent of the app monitor secret. Do not make staging public to
permit a probe or place secrets in URLs.
[Vercel automation protection](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

## Verification before enabling alerts

1. Before configuring health database settings, verify the runtime probe returns
   200 `database=not-configured`. For a database monitor, apply the reviewed
   migration, configure only target-specific health secrets and verify 200
   `database=reachable` on staging. A missing RPC must return 503
   `database=not-ready`; unreachable DB and partial/invalid settings must return
   503 `database=unavailable`.
2. Verify outbox unauthorized requests deny and correct-secret responses have
   only aggregates. Repeat with delivery off; no jobs change state or send.
3. Exercise controlled test faults via the test harness or disposable staging
   configuration: bad monitor key, unavailable DB, absent RPC, queue growth and
   missing scheduler invocation. Restore configuration and verify recovery.
4. Check only intended recipients receive the synthetic monitor alert. Record
   tested channels, response time and remaining gaps. Rehearse the pause runbook.

Current local endpoint tests establish handler/contract behavior. Native SQL
execution, dashboard setup, real alerts, staging load and production probes are
separate owner/CI evidence; none is implied by this plan.
