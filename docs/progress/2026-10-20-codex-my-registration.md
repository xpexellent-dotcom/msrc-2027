# Task 4 — Participant My registration (O9)

20 October 2026. ENG-055; ORG-055/056. Requirements REG-01–08, DAT-03/04,
EML-01–05, SEC-01/02/06, PRV-03/05/06, TIM-01/02, LOC-01/03, ACC-01.

Implemented on top of tasks 1–3 in `C:\m\codex-early`; initial worktree was clean.
All changes remain uncommitted. No branch, commit, push, hosted migration,
settings seed, feature activation or real email was performed. `docs/PROGRESS.md`
is unchanged. ENG-054 was highest before reserving ENG-055 at the end of DECISIONS.

## Result and contracts

- The existing participant registration route now renders My registration from
  an authorized server projection. It covers not-requested windows/list eligibility,
  pending approval, waitlisted, offered, approved, cancelled and expired, with
  EN/AR, RTL, Riyadh timestamps, mobile controls, ticket QR/reference and support.
  The existing closed public journey remains behind disabled gates.
- Accept, decline and confirm-before-cancel go through the private HTTP/server
  boundary. Offer acceptance uses database time under the settings lock and
  atomically issues Task 3's ticket and approval email. Decline/cancellation
  atomically revoke credentials, audit, enqueue the DRAFT cancellation email,
  and hand only the released seat to the next waitlisted participant.
- Database operation receipts bind edition, verified actor, request, action and
  operation ID. Same-operation retries replay; distinct/reused operations cannot
  repeat transitions or hand on an extra seat. Client inputs cannot select a
  participant/request, provide claims or a secret, or choose a resulting status.
- No waitlist position, exact remaining count or capacity leaves the server.
  `fewPlacesLeft` is derived only when the threshold is set and remaining is at
  or below it. General-registration REG-05 does not inherit WKS-01's explicit
  public workshop-seat-count requirement.
- Existing requests/tickets remain available after submissions close or collection
  settings become incomplete; independent registration/account/privacy/session
  gates remain enforced. No settings completeness or collection gate is weakened.
- Missing migrations give `area-not-ready` with valid sessions preserved, including
  the original request form and ticket path. Countdown zero only refreshes the
  server state; it never approves or expires a request in client state.

Migration: `supabase/migrations/20261020150000_participant_registration_self_service.sql`.
The CLI-generated migration was ordered after Task 3's `20261020140000` dependency.
New service-role-only RPC signatures (all return `jsonb`):

```sql
msrc_registration_me(edition_key text, session_claims jsonb)
msrc_registration_accept_offer(edition_key text, session_claims jsonb,
  request_id uuid, operation_id uuid, ticket_secret text)
msrc_registration_decline_offer(edition_key text, session_claims jsonb,
  request_id uuid, operation_id uuid)
msrc_registration_cancel(edition_key text, session_claims jsonb,
  request_id uuid, operation_id uuid)
```

The migration also updates the existing staff expiry implementation to use the
shared hand-on helper, updates the ticket reader's collection-settings gate,
and extends the existing transactional email trigger/validator. New private
`msrc_registration.participant_operations` is forced-RLS and immutable; client
and service roles have no direct table privileges.

`MyRegistrationResponse`, `MyRegistration`, `ParticipantRegistrationStatus`,
`RegistrationWindow` and `RegistrationAction` are added in the TS contracts.
GET `/api/registration/me` returns ready `registration`, `window`,
`fewPlacesLeft`, `serverTime`, session-bound `formToken` and private `ticket`, or
an explicit error/readiness state. POST accepts exactly
`{action:'accept'|'decline'|'cancel', operationId, formToken}`. Success returns
a fresh canonical projection; HTTP 409 returns the projection with
`outcome:'expired'|'conflict'`. Database request IDs remain server-only.
The reusable action CSRF token expires after 30 minutes; collection retains its
separate anti-bot token. Existing participant mutation rate limits apply.

## Changed files

- `src/app/[locale]/(preview)/registration/page.tsx`
- `src/app/api/registration/me/route.ts` (new)
- `src/features/registration/my-registration.tsx`, `my-registration-copy.ts`,
  `my-registration-handler.server.ts`, `my-registration-page-state.server.ts` (new)
- `src/features/registration/contracts.ts`, `backend.server.ts`, `security.server.ts`,
  `handler.server.ts`, `page-state.server.ts`, `registration-form.tsx`,
  `registration-copy.ts`, `ticket-handler.server.ts`, `README.md`
- `src/features/participant-accounts/participant-page.tsx`, `participant-form.tsx`
- `src/styles/participant-accounts.css`, `src/lib/email/outbox.server.ts`
- The migration above; `supabase/tests/database/registration_participant.test.sql`
  (new); `supabase/tests/database/registration.test.sql`
- `tests/integration/staff-registration-concurrency.test.ts`
- `tests/unit/my-registration.test.ts` (new); `registration-request.test.ts`,
  `registration-ticket.test.ts`, `registration-emails.test.ts`,
  `__snapshots__/registration-emails.test.ts.snap`
- `scripts/registration-ui-provider.mjs`,
  `tests/registration-e2e/registration-status.spec.ts` (new),
  `tests/registration-e2e/registration-request.spec.ts`
- `docs/DECISIONS.md`, `docs/features/REGISTRATION.md`,
  `docs/features/REGISTRATION_EMAILS.md`, this receipt

## Observed checks

All commands use `C:\m\tools\bin` first on PATH: Node `v24.21.0`, pnpm `11.19.0`.
Logs are under `.tools/task4-my-registration/` unless stated otherwise.

| Check | Result | Evidence |
| --- | --- | --- |
| `pnpm lint` | PASS | `lint-final.log`; zero warnings/errors |
| `pnpm typecheck` | PASS | `typecheck-final.log`; route generation and TypeScript |
| `pnpm exec vitest run` | PASS | `vitest-final.log`; 3,245 tests / 72 files |
| `pnpm build` | PASS | `build-final.log`; 107/107 generated pages, including dynamic My registration API/page |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS | `staff-playwright-final.log`; 142 passed, 8 intentional skips, no retries, after the fresh final build |
| `pnpm exec playwright test -c playwright.registration.config.ts` | PASS | 132 passed, no retries; 116 axe scans with zero violations |
| `pnpm exec playwright test -c playwright.participant.config.ts` | PASS | `participant-playwright.log`; 62 passed, 4 intentional desktop/tablet skips, no retries; run sequentially after registration on port 3216 |
| `git diff --check` | PASS | Repeated after implementation and receipt updates; no whitespace errors |
| pgTAP | BLOCKED | 93 new assertions written; local Docker/Supabase unavailable, CI execution required |
| Strict database lint | BLOCKED | No local database; must run in disposable CI |
| Integration concurrency | BLOCKED | Five new contention cases written; command below fails before collection |

Attempted integration command:
`pnpm exec vitest run --config vitest.integration.config.ts tests/integration/staff-registration-concurrency.test.ts`.
Exit 1 before collection: “Local fixture tests require a running local Supabase
stack and its loopback settings.” Output: `.qa/task4-registration/integration-db-blocked.log`.
The five cases cover acceptance winning expiry, expiry winning acceptance,
same-operation double cancellation, distinct-operation double cancellation,
and session expiry while waiting for the settings lock. This is authored coverage,
not a claim that PostgreSQL executed it locally.

The browser boundary is the existing loopback synthetic provider, with real
Next SSR, private handlers, native-session transport and server QR rendering.
No browser test uses hosted Auth/database or real participants. Each visible
registration/window state was covered in EN/AR desktop/mobile with axe and
overflow checks. Keyboard confirmation/keep-focus, no-JavaScript SSR, countdown,
late acceptance, operation retries, ticket revocation, stale native-session
refresh and missing read/write RPC recovery are included. Representative EN/AR
desktop/mobile offered/approved screenshots were visually inspected; state/window
captures are in `test-results/registration/`. Physical devices and real assistive
technology are NOT TESTED.

Earlier failures are retained: first lint found synchronous-effect refresh
handling; the first registration run had 116 passes and 8 failures exposing focus
restoration to a detached button. The final implementation uses the newly mounted
action controls, and all eight assertions pass without retries or longer timeouts.
`registration-playwright-first.log` and `registration-first-run-focus-error.md`
retain that evidence. An intermediate typecheck caught the Button component's
ref contract; the fix scopes focus lookup to its actual action container instead
of changing the shared Button API.

Windows Playwright web-server teardown stalled after the tests completed. Only
the verified owned fixture listeners (registered test ports and processes created
at suite launch) were stopped to let the runners report their exit status. No
owner app on port 3210 was used or stopped. No temporary config was needed.

Requested `git checkout -- .impeccable/review/` was attempted, but the sandbox
cannot create the linked worktree's Git index lock outside the writable root.
No files in `.impeccable/review/` were regenerated by these suites: both
`git status --short -- .impeccable/review/` and its quiet diff verify no changes,
so no screenshot restoration remains necessary.

## Owner / Claude review and remaining gates

- Review the new migration and run pgTAP, strict database lint and integration
  tests in disposable Linux CI before any hosted application. In particular,
  review shared expiry hand-on, exact-session lock rechecks, trigger atomicity,
  immutable receipts and the own-ticket reader's settings gate.
- Review EN/AR wording and the sixth DRAFT English template
  `registration_cancelled` in `REGISTRATION_EMAILS.md`. No new behavior decision
  is needed to finish this local slice; wording approval remains a delivery gate.
- The existing staff detail history filters staff allocation events. New
  participant acceptance/decline/cancellation events are immutable in the global
  audit but are not added to that staff detail timeline by this participant task.
- Keep existing authentication, privacy, migration, ticket-key custody, email
  delivery/budget and human UAT release gates closed. Confirm-your-seat, payment,
  workshops, ticket scanning and a scheduler for unattended offer expiry remain
  separate work; viewing an elapsed own offer now performs its authorized expiry.
- Next: Claude reviews this uncommitted diff and the CI database evidence. No
  commit, push, migration application or activation is authorized by this receipt.
