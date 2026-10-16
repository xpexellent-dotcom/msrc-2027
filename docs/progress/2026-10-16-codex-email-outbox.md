# Registration slice 2: closed durable email outbox

16 October 2026. BL-FND-04/05, BL-DEP-08; EML-01 through EML-05,
API-01/02/03, ERR-01/02, DAT-03/04, LOC-03, SEC-02/06. ENG-046.

## Scope and starting evidence

Implemented in the existing clean `codex/email-outbox` worktree at
`7da658b27641f631e2f99c8fbfc9d5503f028b7e`. This was newer than the task's stated
`2406a17` base; no reset, branch creation, commit, push or PR operation occurred.
The migration directory initially ended at `20261013205046`; no unmerged
registration/staff/CSP migration or source was imported. Existing public,
Contact, authentication, staff and participant source paths are preserved.
As requested by O9, `docs/PROGRESS.md` is unchanged.

Read the project instructions/brief/decisions/progress, foundation/deployment
backlogs, EML/API/ERR/DAT requirements and source baseline sections, incumbent
email adapters, Contact caps/expiry, participant cleanup scheduler and feature
runbooks. Applied relevant Supabase/Postgres and Vercel Functions skill guidance.
Verified the current official Resend idempotency and Vercel scheduling contracts.

## Delivered design

- One additive migration: `supabase/migrations/20261016140000_email_outbox.sql`.
  Depends only on main. Four private forced-RLS tables, no API-role table/schema
  grants, four postgres-owned service-role-only public RPCs with empty search
  paths, covering due/lease/retention/error indexes, and native-postgres-only
  sweep/aggregate health functions.
- Same-transaction private enqueue plus a server-only standalone enqueue API;
  duplicate logical keys resolve to one identity/message, conflicting inputs
  fail, transaction rollback removes the identity and message. Purged terminal
  payloads retain minimal hash deduplication tombstones.
- Versioned English-only synthetic template, reserved EN/AR locale, exact
  variables, synthetic `@example.invalid` recipients enforced in SQL and TS.
  No registration producer, business template, UI or authentication integration.
- One-message-at-a-time claims with `FOR UPDATE SKIP LOCKED`, leases and fresh
  fencing tokens. The worker persists the exact provider request before sending;
  completion requires the same live lease. Frozen requests/keys survive a crash
  after provider acceptance. Provider acceptance is not inbox delivery.
- Console, injected in-memory test and separately flagged Production Resend
  senders. HTTP attempts are bounded and have no internal retry; classification
  stores allowlisted error classes only. No provider response body is retained
  or logged. Console output and route responses contain counts only.
- POST `/api/jobs/outbox/drain`: closed flag before request inspection, fixed-size
  SHA-256 digest comparison with `timingSafeEqual`, empty 404/401 denials and empty
  503 on unavailable configuration/storage. GET/HEAD stay unavailable. No Vercel
  schedule, `pg_net`, environment file/value or hosted setting is installed.
- Atomic, nonrefundable UTC-day attempt accounting uses the lower SQL/app cap.
  Contact's 60/day and staff's 36/day remain independent existing allocations;
  this slice does not create a shared provider-wide ledger or change Contact.
- `msrc-outbox-sweep` runs local SQL as postgres every five minutes but returns
  without mutation while `sweeps_enabled=false`. It releases expired leases,
  exhausts unsafe messages and purges old terminal payloads in bounded batches.
- ENG-046, a complete feature/runbook note, notes added only to BL-FND-04/05,
  and a minimal CI step to lint the private schema. Existing `db:test` and
  `db:integration` discovery includes the new tests automatically.

## Proposed settings; owner approval still required

| Setting | Closed/proposed default |
| --- | --- |
| SQL delivery / sweeps | Both off |
| SQL daily cap / app daily cap | Both zero |
| Attempts / lease | Five / 120 seconds |
| Backoff | 60-second exponential base, up to 25% positive jitter, 3,600-second ceiling |
| Automatic retry horizon | 23 hours from the first claim/charged attempt |
| Run limits | At most ten messages, 20 seconds; reserve 15 seconds before starting another attempt |
| Sweep | At most 100 state changes plus 100 terminal purges per five-minute invocation |
| Terminal payload retention | 30 days, a local retention proposal aligned with the Privacy Policy's Resend period |
| Hash tombstone retention | Indefinite proposal; digests remain potentially linkable pseudonymous evidence |

These are engineering defaults, not approved participant sending policy. Paid
participant capacity, coordinated provider allocation and privacy/location gates
remain separate. Do not enable sweeps until local retention/tombstone policy is
approved. Database pause/cap zero stops new claims; an in-flight provider call
can still complete.

## Official contracts verified

[Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys):
`POST /emails` accepts an `Idempotency-Key` of up to 256 characters, retains it
for 24 hours, and returns the prior result for identical retries. Changed-content
409 conflicts are permanent; concurrent-key 409 responses may be retried.
The 23-hour horizon leaves a conservative margin; after that, uncertain sends
require reconciliation and cannot be automatically assigned a fresh key.
This is not an unlimited exactly-once delivery guarantee.

[Vercel Cron](https://vercel.com/docs/cron-jobs) calls production routes by GET.
[Minute scheduling](https://vercel.com/docs/cron-jobs/usage-and-pricing) needs
Pro/Enterprise; Hobby is daily. [CRON_SECRET](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
is forwarded as a Bearer header. Consequently O10 requires a later same-auth
GET bridge before Vercel can invoke the shipped POST-only contract.

## Observed checks

PATH prepended with `C:\m\tools\bin`. Observed Node `v24.21.0`, pnpm `11.19.0`.
No dependency or lockfile changes.

| Check | Observed result |
| --- | --- |
| `pnpm exec eslint . --max-warnings=0` | PASS, exit 0, no warnings; final full pass after test additions. |
| `pnpm typecheck` | PASS, Next route type generation plus TypeScript, exit 0. |
| `pnpm test` | PASS, 2,491 tests in 62 files; final full run 06:47 local tool time. |
| `pnpm exec vitest run tests/unit/outbox.test.ts` | PASS, 89 tests; included in full suite above. |
| `pnpm build` | PASS, optimized Next.js 16.3.8 build, 81 generated static pages, new dynamic outbox route present. |
| `git diff --check` | PASS, exit 0. |
| `pnpm db:test` | BLOCKED before SQL execution: CLI telemetry write to the restricted user profile fails with EPERM; Docker is also absent from PATH/unavailable. Zero SQL tests executed locally. |
| `pnpm db:integration` | BLOCKED at configuration loading: no running loopback Supabase stack/settings. Zero integration cases executed locally. |
| Migration reset / DB lint / security advisors / actual pg_cron execution | NOT TESTED locally; require the disposable Linux database job. No CI run was created here. |
| Playwright / human inbox or device UAT | NOT TESTED; no UI change, server, browser or real mail was started. |
| Hosted migration/configuration, live provider request, real recipients | NOT PERFORMED. |

The first intermediate typecheck found a nullable test-fixture return; the
fixture was narrowed and subsequent full typecheck/build passed. Review also
found that a retryable provider error could exhaust the database attempt limit
while the summary still counted it as retryable. Completion now returns the
persisted status; regression coverage verifies permanent exhaustion is reported
correctly. Earlier test counts (2,440 and 2,480) are not the final receipt.

The command policy rejected recursive `.next` removal. Instead, after verifying
both absolute paths stayed inside the workspace, moved the old cache to ignored
`.tools/outbox-prior-next-20261016` and built from an absent `.next`. The final
validation repeats the fresh-cache build, retaining its previous cache in
`.tools/outbox-next-before-final-validation-20261016`. Both backups are local
only. No user's server was stopped or port taken.

## Acceptance coverage prepared for CI

`supabase/tests/database/email_outbox.test.sql`: **87 pgTAP assertions written,
zero executed locally**. Covers closed defaults, postgres ownership/search paths,
forced RLS, zero grants and direct denied clients, same-key deduplication and
input conflicts, transaction rollback, cap admission, backoff/jitter bounds,
lease expiry/reclaim, stale fencing, immutable snapshots, maximum attempts,
23-hour horizon, disabled sweeps, bounded terminal retention/exact boundary,
cancelled tombstones and aggregate-only operator health denial.

`tests/integration/outbox-concurrency.test.ts`: **seven cases written, zero
executed locally**. Covers duplicate concurrent enqueue; overlapping claim
transactions; separately locked row skipping; concurrent daily-cap admission;
actual database plus test-provider crash recovery; parallel durable drains;
anonymous Data API and forged authenticated metadata denial. Strict runner
checks prohibit hosted/linked execution and require the disposable Linux CI.

The **89 passing TypeScript cases** cover template variables/recipient isolation,
reserved locale/English mail, request idempotency, transient and permanent HTTP
classification, timeout/backoff outcome, a crash between provider acceptance and
acknowledgment, overlapping synthetic drains, stale completion, run/cap/horizon
limits, RPC transport/fencing/snapshot validation, closed/secret/configuration
denial, production Resend gating and counts-only responses. The constant-time
test invokes the real comparison through a spy and confirms all ten credential
cases reach it with two 32-byte buffers; it is not a wall-clock timing benchmark.

## O10 and next handoff

No owner decision is inferred. The exact seven-step future activation procedure,
both trigger options, monitor/pause commands and guarded manual replay are in
[EMAIL_OUTBOX.md](../features/EMAIL_OUTBOX.md#o10-drain-trigger-options-and-exact-recommended-steps).
Recommended sequence: approve O10/budget/settings/operator; obtain green DB
receipts and apply only the reviewed migration as postgres with gates off; add
and test the protected GET bridge; privately configure Production Sensitive/
Secret credentials; add the minute cron in a separate reviewed deployment;
verify synthetic behavior before enabling approved caps/sweeps; observe actual
invocations/health before opening any future producer. The pg_cron-to-HTTP
alternative would require a separate `pg_net`/secret review and is not installed.

Claude's next task is to review this diff, execute disposable database checks,
rerun required checks, and then handle commits/PR creation. Remaining owner
questions: O10 trigger/runtime choice, paid participant allocation and daily
cap, retry/lease/run/sweep proposals, 30-day local retention and indefinite
minimal tombstones. Delivery/bounce callbacks, failure administration, business
templates/producers, synthetic volume scenarios and human inbox UAT remain
later BL-FND-05/BL-DEP-08/domain gates. Registration and other workflows stay closed.
