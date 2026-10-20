# Task 3 — registration slice 4: QR ticket and transactional emails

Date: 20 October 2026. Workspace: `C:\m\codex-early`. Decision: ENG-054,
following ENG-053. Builds on Tasks 1–2 and ORG-055/056. Work is uncommitted;
no branch, commit, push, hosted migration/settings, real email or activation.
`docs/PROGRESS.md` is unchanged.

## Result and authority

Free approval atomically issues one ticket and queues a seat email; bulk approval
shares the same transaction/lock. Confirmation preserves an issued ticket or
issues a first ticket. Cancellation/expiry revoke it. A private participant page
renders an opaque local QR data URL with EN/AR chrome. Staff queue/details show
issued/revoked status without credentials. Five English DRAFT templates enqueue
atomically on their business events, including automatic offers and expiry.
O10 GET shares the existing timing-safe Bearer-authenticated outbox drain.

Requirement mapping and the explicit supersession of the old paid/confirmed-only
REG-03/07/AT-03 sequence are recorded in ENG-054. No acceptance flow exists in this
checkout: Task 4 must call through the same credential/transaction design when
it introduces offer acceptance. No scanner or permissive verify stub is added.

## Migration and RPC signatures

New review-only migration:
`supabase/migrations/20261020140000_registration_tickets_emails.sql`.
Adds private forced-RLS `msrc_registration.tickets`, unique by request, with
random UUID, SHA-256 secret hash, status and issuance/revocation timestamps.
Request uniqueness already enforces participant/edition uniqueness. Adds the
state trigger and extends the private outbox validator/producer. The generic
service enqueue API remains synthetic-only. Historical migrations are untouched.

```sql
public.msrc_staff_registration_approve_tickets(
  edition_key text, session_claims jsonb, request_ids uuid[], ticket_secret text
) returns jsonb -- service_role only
public.msrc_registration_ticket(
  edition_key text, session_claims jsonb, ticket_secret text
) returns jsonb -- service_role only
```

Existing staff queue/detail/approval signatures remain. Legacy approval fails
closed without private transaction key context; the new handler never falls
back to it. New approval binds server-verified native claims, reuses staff
exact-session assurance and the allocation lock, and restores transient key and
claims on success/failure. Ticket fetching rechecks own account/session, policy
and entitlement without requiring the submission window to still be open.

The ticket secret is HMAC-SHA-256 over the random ticket ID, with independent
server-only `REGISTRATION_TICKET_SECRET` (64 hex characters / 32 random bytes).
Only its SHA-256 hash is stored. Fetch reconstructs and hash-checks the token;
the application also checks the HMAC/reference before QR generation. Missing or
wrong key fails closed. Revoked credentials cannot be silently reissued. No
backfill or key generation/configuration was performed.

## Contract additions

- RPC ticket: `{state:'ready',ticket:null|{status,referenceCode,token}}`;
  `status` is `issued|revoked`; revoked token is null. Other states explicitly
  close/deny/report unavailable. The 12-character reference is a display aid.
- GET `/api/registration/ticket`: private/no-store
  `{state:'ready',ticket:null|{status,referenceCode,qrDataUrl}}`, or `closed`,
  `denied`, `area-not-ready`, `unavailable`. No raw token field in browser JSON.
- `/[locale]/registration/ticket`: EN/AR ticket page, sign-in/refresh, pending,
  revoked and missing-migration states; existing registration receipt links to it.
- Staff queue/detail adds `ticketStatus: null|'issued'|'revoked'`; old responses
  normalize missing fields to null. Neither staff endpoint exposes ticket IDs,
  hashes, tokens or QR images. Approval uses the new service transport.
- Templates v1: `registration_received`, `registration_approved`,
  `registration_offered`, `registration_waitlisted`, `registration_expired`.
  Payload is `{}` except offered `{offer_expires_at}`. Recipient comes from
  current verified native Auth email. The full DRAFT text is in
  [REGISTRATION_EMAILS.md](../features/REGISTRATION_EMAILS.md).
- GET `/api/jobs/outbox/drain` shares POST's exact Bearer `CRON_SECRET` boundary;
  HEAD is inert. Blank server-only environment names added to `.env.example`.

## Observed checks

All Node/pnpm commands put `C:\m\tools\bin` first on PATH. Node 24 and repository
pnpm 11.19.0 were used. Browser suites use their existing dedicated ports;
owner port 3210 was not used.

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm lint` | PASS | Full repository, zero warnings |
| `pnpm typecheck` | PASS | Route generation and TypeScript |
| `pnpm exec vitest run` | PASS | 3,171 tests, 71 files; five frozen email snapshots |
| `pnpm build` | PASS | Final build, 107 generated pages, private ticket/API routes present |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS | Final build: 142 passed, 8 intentional skips, zero retries; earlier run also 142/8 |
| `pnpm exec playwright test -c playwright.registration.config.ts` | PASS | Final build: 32 passed, zero skips/retries; 24 ticket cases + 8 existing request cases |
| `git diff --check` | PASS | No whitespace errors |
| `.impeccable/review/` screenshot hygiene | PASS | `git diff --quiet -- .impeccable/review/` exits 0; no tracked screenshot changes |
| `supabase test db --local supabase/tests/database/registration_tickets_emails.test.sql` | BLOCKED | 91 assertions prepared; DB connection refused at 127.0.0.1:54322 |
| `supabase db lint --local --schema msrc_registration,msrc_outbox --fail-on warning` | BLOCKED | Same unavailable local DB; Docker executable absent |
| Database integration races | BLOCKED locally | Guarded disposable Linux CI harness; one new concurrent-retry case and expanded final-seat assertions |
| Hosted migration, production/inbox, real device and human UAT | NOT TESTED | Outside authorized scope; no hosted writes or real messages |

pgTAP covers ticket/event uniqueness, bulk approval, permanent revocation,
rollback and injected outbox failure, current verified recipient, current
account/edition/session permissions, missing key, paid-vs-free entitlement,
automatic offers/expiry, closed delivery and staff projection privacy. Integration
assertions cover one final seat, one ticket/email under simultaneous retries and
settings/allocation serialization. These are source evidence until CI executes.

Unit checks cover the actual GET bridge, missing/wrong/unset secrets and use of
`timingSafeEqual`, disabled/zero-cap no work, template snapshots/deadline/escaping,
QR's lack of personal data, malformed/over-returned projections, revoked token
suppression, own-session refresh, missing migrations and service-only staff
approval transport. Browser checks include EN/AR, desktop/mobile, axe and staff
issued/revoked indicators.

Initial diagnostics were retained rather than counted as passes. First focused
staff tests exposed expected additive-field/transport fixture changes (six
failures), corrected to assert the new contract. Initial typecheck found two test
typing issues (qrcode overload and header union), corrected before final PASS.
Initial email tests reused a consumed mock Response; fixed to return a fresh
Response. First participant browser run used a build containing the earlier
missing-migration wording; four assertions failed, with the other 28 passing.
Final build includes the neutral current wording; all 32 cases pass on rerun.
No assertions, retries or timeouts were weakened.

Windows Playwright web-server teardown stalled after all test workers completed.
Only known test-owned provider/Next PIDs were stopped, identified from launch
output and their matching start times; no owner app or unrelated process was
touched. The first staff command then exited 0 and reported 142/8. An initial
local Supabase status probe hit sandboxed telemetry-file access; the database
agent reran actual DB checks with `SUPABASE_TELEMETRY_DISABLED=1`, which reached
the expected unavailable local DB. No local database test is claimed as passed.
The requested `git checkout -- .impeccable/review/` command was attempted but
the sandbox refused the external worktree Git index lock. No restore was needed:
read-only diff verification confirms that directory is unchanged.

Representative English desktop and Arabic mobile issued-ticket screenshots in
`test-results/registration/` were inspected: full QR visible, readable reference,
correct RTL alignment, no clipping/overlap. Failed-copy browser contexts were
retained locally under `.tools/task3-registration-first-run/` for review.
The final registration suite ran 20 axe scans (16 ticket states, 4 forms) with
zero violations. Final English desktop issued, Arabic mobile issued and Arabic
mobile missing-migration screenshots were re-inspected. Its final command
exited 0 after releasing only its verified test-owned servers.

## Owner questions and Claude review

1. Approve the full wording of all five DRAFT templates; offer acceptance UI is
   an activation prerequisite. Confirm sender/reply handling, test inbox results,
   provider budget and delivery monitoring through the existing outbox gates.
2. Confirm the Vercel plan. The repository records it as unresolved; official
   [plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing) permit Hobby
   only daily. `0 0 * * *` UTC is deployment-compatible and inert while off, but
   unsuitable for live 24-hour offers. Pro/Enterprise plus reviewed
   `*/5 * * * *` and delivery capacity are needed before activation.
3. Confirm independent ticket-key custody/restore handling. Rotation/reissue and
   reconciliation of any existing approved records need a separately reviewed
   operation. Never overwrite a live key expecting old credentials to survive.

Claude should review the migration's trigger/ACLs, transient key handling,
idempotency and new service approval transport, then run all database tests/lint
and race harness in disposable Linux CI before committing. Templates remain
DRAFT and all delivery/registration switches stay closed; daily caps remain zero.
Future check-in must validate live revocation, account and activity/day authority,
not just the HMAC or displayed status. Next implementation task: Task 4's participant
offer acceptance, with transactional confirmation/ticket/email integration.

## Changed files

The implementation changes the following groups; no historical migration or
`docs/PROGRESS.md` change is included:

- Database: new migration and `supabase/tests/database/registration_tickets_emails.test.sql`;
  updated registration, queue, offer/export and early-access pgTAP expectations;
  `supabase/tests/support/registration-fixtures.psql`;
  `tests/integration/staff-registration-concurrency.test.ts`.
- Participant: `src/features/registration/{backend.server,contracts,handler.server,registration-form}.ts[x]`;
  new `ticket-{crypto.server,handler.server,page-state.server,copy,card}.ts[x]`;
  `src/app/[locale]/(preview)/registration/ticket/page.tsx`;
  `src/app/api/registration/ticket/route.ts`; `src/styles/participant-accounts.css`.
- Staff: `src/features/staff-portal/{backend.server,handler.server,registration-contract.server,ui-contract,console-copy}.ts`
  and `registration-queue.tsx`.
- Outbox/config: `src/lib/email/outbox.server.ts`,
  `src/app/api/jobs/outbox/drain/route.ts`, `.env.example`, `vercel.json`.
- Tests: `tests/unit/{registration-ticket,registration-emails,outbox,staff-registration-queue}.test.ts`,
  `tests/unit/__snapshots__/registration-emails.test.ts.snap`,
  `tests/registration-e2e/registration-ticket.spec.ts`,
  `tests/staff-e2e/staff-console.spec.ts`, `playwright.registration.config.ts`,
  `scripts/registration-ui-provider.mjs`.
- Documentation: `docs/DECISIONS.md`, `docs/features/{REGISTRATION,REGISTRATION_EMAILS,EMAIL_OUTBOX}.md`,
  `src/features/registration/README.md`, `src/lib/jobs/README.md`, this receipt.
