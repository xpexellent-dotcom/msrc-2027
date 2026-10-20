# Synthetic staging opening exercise

ENG-056; REG-01–08, DAT-03/04, SEC-01/02/06 and NFR-01–03. Owner-run preparation only.
No load has been sent to a hosted project. No setting, delivery switch, migration or
resource is changed by this runner. Complete [STAGING_SETUP](../../docs/runbooks/STAGING_SETUP.md)
and its outstanding staging-runtime gates first.

The repository has Node 24 and no k6 dependency. `opening-rush.ts` uses Node's built-in
`fetch`, which uses undici, and native TypeScript stripping; no package or lockfile
change is needed. Official references checked 20 October 2026:
[Node fetch](https://nodejs.org/api/globals.html#fetch) and
[Node 24 TypeScript](https://nodejs.org/docs/latest-v24.x/api/typescript.html#type-stripping).
It drives HTTP/API work, not browser JavaScript, images or video download performance.

## Current blockers and sizing assumptions

The current app permits approved production origins and isolated localhost test
fixtures; a new staging hostname is not an authenticated runtime automatically.
Staging origin support and safe staging email capture need a separate reviewed
implementation before this hosted exercise can pass. A `closed`, invalid-origin,
missing-RPC or unauthenticated preflight is **BLOCKED**, never performance evidence.
Keep these controls in place; do not copy production keys or inject sessions.

The proposed scenario is **500 new requests over 10 minutes**, **1,000 public HTML
views** over that interval, participant status reads every **30 seconds**, and staff
queue reads every **10 seconds**, approving batches of up to **25**. Approximately
**2,000 seats** is the capacity scenario to confirm with the owner; the runner never
writes capacity. The seed requires an explicit capacity. An engineering p95 target
of **1 second** (the existing BL-TST-06 target) and zero HTTP/application failures is configurable and needs owner
acceptance; these are not established production measurements or promises.

The existing `msrc_participant_form_claim` enforces **20 participant POSTs per IP per
rolling hour** (`20261004164034_participant_accounts.sql`). Real sign-in and submit
consume two POSTs per actor, so a fresh single egress can exercise at most ten
participants. Fifty worker processes on one machine still share this allowance.
For 500 submissions with unchanged controls, use at least **50 genuinely different
egress IPs**, each with ten fresh actors and no earlier quota consumption; allow more
margin for rehearsal activity. Securely prearrange owner-controlled runners and
their cost, or record the full test as blocked. This task does not provision them.
The runner never sets `x-vercel-forwarded-for`, alters limits or retries a 429.
The owner should separately assess whether 20 POSTs/hour is suitable for a shared
campus network. Rate-limit exhaustion is not database capacity evidence.

## One small end-to-end run

1. Use an isolated, fully seeded staging project. The manifest must say `version:1`,
   `state:"complete"`, carry `editionKey:"staging-<runId>"`, and match both the app and
   Supabase URLs. Only distinct `@example.invalid` actors and `SYN…` passport values
   are accepted. Use new fixture actors without previous registration requests.
2. Set the owner's staging general opening shortly in the future (all instants use
   an explicit UTC offset). Choose the runner opening 1–2 minutes ahead, allowing
   preflight. For the early-access exercise, choose the early opening and include
   only list-eligible actors; run a separate noneligible refusal case manually.
3. In the staging browser, sign in as a seeded **regular Registration and workshops
   administrator**, using its password and exact-session email check. Copy only its
   `__Host-msrc-staff=<value>` cookie pair from browser developer tools into the local
   private environment file. The runner rejects Super Admin sessions, unseeded
   actor IDs and staff without the role. Never copy a production cookie, TOTP or
   native JWT. Do not publish screenshots containing the cookie. Do not use the
   browser session concurrently while the driver may rotate its cookie.
4. Create `.tools/staging/load.env` locally, with access restricted to the operator.
   `.tools/` is already ignored. Fill the placeholders below; do not commit this file.
   The regular-expression allow values must be the exact escaped origins, with
   `^` and `$`, not wildcard patterns. The app hostname must contain a `staging`
   component. The known production Supabase project and every `msrc2027.com`
   hostname are always refused.

```dotenv
MSRC_STAGING_CONFIRM=yes
MSRC_LOAD_URL=https://<owner-staging-host>
MSRC_STAGING_APP_ALLOW_PATTERN=^https://<exact-host-with-escaped-dots>$
MSRC_STAGING_SUPABASE_URL=https://<staging-project-ref>.supabase.co
MSRC_STAGING_SUPABASE_ALLOW_PATTERN=^https://<staging-project-ref>\.supabase\.co$
MSRC_LOAD_MANIFEST=.tools/staging/<run-id>/manifest.json
MSRC_STAGING_PARTICIPANT_PASSWORD=<same-secret-used-only-for-seeded-participants>
MSRC_LOAD_STAFF_COOKIE=__Host-msrc-staff=<authenticated-synthetic-regular-staff-cookie>
MSRC_LOAD_OPEN_AT=<future-ISO-instant-with-Z-or-offset>
MSRC_LOAD_ROLE=combined
MSRC_LOAD_PARTICIPANTS=5
MSRC_LOAD_DURATION_SECONDS=60
MSRC_LOAD_PUBLIC_VIEWS=20
MSRC_LOAD_SHARDS=1
MSRC_LOAD_SHARD=0
```

5. Run from the repository in PowerShell; dependencies must already be installed:

```powershell
$env:PATH = 'C:\m\tools\bin;' + $env:PATH
node --env-file=.tools/staging/load.env scripts/load/opening-rush.ts > .tools/staging/load-result.json
$LASTEXITCODE
```

Progress goes to stderr, a personal-data-free JSON receipt to stdout. Secret values
stay in memory and local private files. The runner follows no HTTP redirects,
including Vercel deployment-protection/login redirects. If deployment protection
prevents access, follow the owner's reviewed staging access policy; this runner
supports an existing staging automation credential as described below. Ctrl+C stops generating traffic; already
completed submissions/approvals stay committed. Inspect and discard this disposable
fixture rather than blindly rerunning against the same actors. Revoke the copied
staff session using normal staff controls and remove the private cookie after use.

For a protected Vercel deployment, prefer an existing short-lived local OIDC token
for that staging project, supplied privately as `MSRC_LOAD_VERCEL_OIDC_TOKEN`.
The runner sends it only in `x-vercel-trusted-oidc-idp-token` to the exact allowlisted
app origin. Alternatively, an existing owner-authorized staging automation secret
can be supplied as `MSRC_LOAD_VERCEL_BYPASS_SECRET` (or
`VERCEL_AUTOMATION_BYPASS_SECRET`); it is sent only in
`x-vercel-protection-bypass`. Supply one credential type at a time. Neither is
written into URLs or receipts, and redirects remain refused. Deployment access
does not replace app origin gates, login, role or session assurance. Preserve
Deployment Protection; no protection-setting change or secret creation is performed
here. The bypass also affects Vercel's system/bot checks, so a bypassed result does
not prove those controls' visitor experience. See the official
[automation header documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
and [Trusted Sources](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources).

## Full scenario and adverse cases

After the smoke case passes, use a fresh fixture and quota allowance. For the full
scenario set `MSRC_LOAD_PARTICIPANTS=500`, `MSRC_LOAD_DURATION_SECONDS=600` and
`MSRC_LOAD_PUBLIC_VIEWS=1000`. On fifty distinct participant egresses, set
`MSRC_LOAD_ROLE=participants`, `MSRC_LOAD_SHARDS=50` and a unique
`MSRC_LOAD_SHARD=0` through `49`; use the same manifest and opening instant.
Staff cookies are unnecessary on these workers. Worker `i` handles global indices
whose remainder modulo 50 is `i`, so accounts and public views do not overlap.

Run one additional operator process with `MSRC_LOAD_ROLE=staff`, the same global
participant count/opening/duration, and a fresh synthetic regular staff cookie.
Staff-only mode does not log participants in or generate public views. Its queue
loop only approves pending rows whose email belongs to the selected manifest
participants. A second independently authenticated seeded approver can be used in
a separate process for concurrent approval stress; record skipped duplicate
decisions and verify the database invariants below. Never share one cookie across
processes. Staff sweeps finish shortly after the nominal interval to catch late
arrivals; a backlog that remains needs investigation, not an automatic PASS.

After all driver work finishes, staff/combined mode makes one final bounded queue
read and fails if any returned pending request belongs to the selected manifest.
`remainingPending` records that count; `null` means not checked (participant-only
mode, blocked preflight or a failed final read). This is a snapshot of the bounded
queue response, not a database-wide count. Inspect all committed results when
reconciling concurrent workers; a later submission still requires owner review.

Use the general-opening window for the full run. Before opening, the driver signs
in and checks each actor's own status. At its scheduled opening arrival it obtains
the real registration form token, waits **2.1 seconds** for the existing anti-bot
minimum, and posts the current server terms version plus a synthetic document.
It polls `/api/registration/me` before/after submission. That GET can expire an
elapsed offer and pass a released seat onward, so it is not an inert uptime check.
This design adds 2.1 seconds plus network time to scheduled submission starts;
inspect measured throughput rather than treating the configured count as achieved.

Run two separately labelled failure exercises without relaxing controls:

- **Shared egress:** eleven fresh participants on one otherwise unused IP consume
  eleven login claims, leaving nine submissions within the 20/hour allowance.
  Expected result is FAIL with 429/`limited`, zero retry storm and no duplicate
  requests. Prior activity can make the limit appear sooner. This expected negative
  receipt does not pass the ordinary load gate.
- **Seat contention:** a fresh tiny staging capacity explicitly entered by the
  owner, more synthetic requests than seats, and two distinct seeded staff sessions
  approving concurrently. Compare successful/overflow/skipped decisions and inspect
  the stored requests/tickets/outbox. Do not reuse production capacity or claim this
  small exercise proves the full 500-request burst.

## Interpreting the JSON receipt

`outcome` is PASS, FAIL or BLOCKED. A guard refusal prints a generic/local input
error and exits 1 before traffic; preflight failures produce a BLOCKED receipt.
PASS exits 0. Every other outcome exits 1. The receipt contains no emails,
document values, session cookies, tokens, request IDs or response bodies.

`metrics` separates `login`, `participant_status`, `registration_form`,
`registration_submit`, `public_page`, `staff_queue` and `staff_approve`, with counts,
failures, p50/p95/max elapsed milliseconds, HTTP codes and response states. HTTP 200
with the wrong application state fails. HTTP `0` means a transport/timeout failure;
429 is preserved separately. Inspect p95 by operation; do not average p95 values
across workers. Compare worker maxima or retain a separate telemetry capture for a
proper aggregate percentile. `counters` records actual successful submissions and
staff decision totals. Compare all shard receipts by run ID/opening and check no
shard is missing or duplicated before summing counts.

A PASS only covers one driver/shard's configured scenario. The owner records the
accepted thresholds, exact source revision, project/compute tier, actual egress
count, achieved submissions/second, error states and recovery time alongside it.
Before accepting the overall gate, verify on the staging database:

- Total committed new requests equals distinct successful synthetic participants;
  no actor/edition or identity duplicates exist.
- Seat-holding states (`approved`, `approved_awaiting_payment`, `offered`,
  `confirmed`) never exceed configured capacity, including concurrent approvers.
- Every newly free-approved request has exactly one private ticket; no credentials
  are copied into the receipt; approval retries do not create extra tickets.
- Received/approved outbox events are atomically present and deduplicated;
  provider delivery remains disabled. Outbox counts agree with the simulated
  transitions, with no real recipients. Exercise delivery separately through an
  approved staging sink after that support exists.
- Inspect Supabase connection/CPU/lock waits and Vercel latency/errors during the
  peak. A 429, closed origin, pending staff email check or missing migration is an
  application gate/limit failure and must not be hidden as low database latency.

Optional bounded knobs: `MSRC_LOAD_POLL_SECONDS` (default 30),
`MSRC_LOAD_STAFF_POLL_SECONDS` (10), `MSRC_LOAD_BATCH_SIZE` (25, maximum 100),
`MSRC_LOAD_P95_MS` (1000), `MSRC_LOAD_TIMEOUT_MS` (15000). A 2000ms override is an
explicit deviation from BL-TST-06, not the normal pass gate. Record deviations in the
receipt; changing a threshold cannot retroactively turn an earlier failed run into
a pass. Preserve failed receipts and run another fresh scenario after any fix.
