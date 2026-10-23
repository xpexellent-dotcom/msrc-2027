# Night-3 Task 4 — registration slice 5, confirm your seat

Date: 23 October 2026. Worktree: `C:\m\codex-night3`.
Starting HEAD: `b29c9e5dd20859b8140ff8d251e03d1693eda444` (clean before Task 4).
Authority: current owner task; ORG-055/056/057; ENG-049–058 and new ENG-064.
Requirements: REG-04/06/07, AT-05/06, ADM-02/04, EML-01–05,
SEC-01/02/06, TIM-01/02, LOC-01/03, ACC-01.

## Result and boundaries

Built on the existing Tasks 1–3. All work remains uncommitted. No branch, push,
hosted migration, settings seed, feature activation, real email or participant
opening. `docs/PROGRESS.md`, approved public legal text, the six approved email
bodies and `vercel.json` remain unchanged.

The Super Admin reviews the real eligible count, selects release or keep with
no default, and starts an immutable confirmation round. The opening threshold
uses the first configured conference date at midnight Asia/Riyadh minus the
owner-entered lead days. Lead zero is valid; there is no invented upper cutoff.
The preview binds recipients and timing configuration; stale previews require
review again. The dialog explains that later approved requests receive windows
under the same chosen policy and duration. Each request receives only one
window, and operation retries never reset its deadline.

Confirming changes approved to confirmed with the same ticket UUID, hash and
issuance timestamp. Releasing cancels/revokes and passes the seat through the
existing waitlist helper. Missed deadlines follow the selected policy: release
or keep the approved seat/ticket, with an explicit kept outcome. All mutations
are audited/idempotent under the settings lock with READ COMMITTED checked at
entry. Own ticket reads and online check-in also expire elapsed release-policy
windows, so cron delay cannot admit a revoked entitlement.

The specification search for `confirm` found no specific confirm-your-seat
nonresponse rule. ENG-064 records the owner's requested fallback, without
choosing a release policy on their behalf. No prices, capacities or business
timings are seeded or defaulted.

## Migration and RPCs

New pending migration: `20261023032624_registration_confirm_seat.sql`.
It adds forced-RLS, no-direct-API-access `confirmation_rounds` and
`confirmation_windows`, extends immutable operation/audit vocabularies, and
replaces existing projections and deadline hooks without widening their grants.

New RPCs, all returning `jsonb`:

```sql
-- authenticated transport; database requires current Super Admin TOTP
msrc_staff_registration_confirmation_preview(edition_key text)
msrc_staff_registration_confirmation_start(
  edition_key text, operation_id uuid, nonresponse_policy text, preview_token text)

-- service_role only; participant calls recheck verified own exact session
msrc_registration_confirm_seat(
  edition_key text, session_claims jsonb, request_id uuid, operation_id uuid)
msrc_registration_release_seat(
  edition_key text, session_claims jsonb, request_id uuid, operation_id uuid)
msrc_registration_confirmation_maintenance(edition_key text)
```

Existing signatures retained: staff queue/detail/expiry/readiness, participant
me/ticket/action/change, check-in, staff counts and ticket/email trigger.
Supabase function grants and empty search paths were reviewed against
[current function guidance](https://supabase.com/docs/guides/database/functions).
Lock/snapshot behavior was checked against
[PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).
These document checks do not substitute for database execution.

## Contract and interface additions

- Own SQL snapshot: `confirmationVersion:1` and
  `request.confirmation:null|{state:'awaiting'|'confirmed'|'released'|'kept',deadline}`.
  The HTTP registration object receives this projection without request IDs.
- Participant POST adds `confirm`/`release` to the existing exact
  `{action,operationId,formToken}` body. Origin/session token, ownership,
  verified account, age, runtime/database gates and rate limits are retained.
- Staff preview GET area: `registration-confirmation-preview`, returning
  `{eligibleCount,opensAt,responseHours,settingsReady,canStart,previewToken}`.
  Start POST action: `registration-confirmation-start` with `operationId`,
  `nonresponsePolicy`, `previewToken`, and existing `formToken`.
  Success returns `confirmationOpened`; stale/before-threshold outcomes are
  `operation-conflict` / `confirmation-not-due`.
- Queue filters: `confirmation_awaiting`, `confirmation_confirmed`,
  `confirmation_released`; counts: `confirmationAwaiting`,
  `confirmationConfirmed`, `confirmationReleased`. These are seat subsets.
  Detail/history labels cover opening, confirmation, release and kept outcomes.
- Launch readiness adds `confirmationSettingsSet`, `requiredRpcs.confirmation`,
  the confirmation settings check and entered lead/response values.
- Missing new RPCs and old projections show `area-not-ready`, preserving login.
- English-only DRAFT templates: `registration_confirm_seat` with persisted
  deadline and explicit policy; `registration_seat_released` with empty payload.
  Transactional enqueue includes window, audit, cancellation, ticket revocation
  and seat pass-on. Confirmation does not resend approval. Preview cards clearly
  separate six approved templates from the two drafts.

## Scheduler decision

No new scheduler. Explicit expiry from reads/actions is the correctness boundary;
the existing authenticated outbox drain advances already-authorized rounds before
claiming messages. Runtime outbox/accounts/registration gates and positive app cap
must permit it; SQL additionally checks registration/account policy and
`sweeps_enabled`. A missing new maintenance RPC reports `area-not-ready` while
existing outbox delivery continues. Other failures return an empty 503.

The daily source schedule remains unchanged. Current
[Vercel plan limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), checked
23 October 2026, require at most daily Hobby execution. Owner review of plan,
cadence, delivery caps and new draft wording remains required before activation.

## Executed checks

Logs and screenshots: `.tools/night3-confirm-seat/` (local, ignored artifacts).
Node v24.21.0 / pnpm 11.19.0 used from `C:\m\tools\bin` first on PATH.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm exec vitest run` | PASS 3,978 tests / 91 files |
| `pnpm build` | PASS; rebuilt after final CSS fix and before the final staff suite |
| `pnpm exec playwright test -c playwright.registration.config.ts` | PASS 390 tests, zero failures/skips/retries, 7.4 minutes |
| `pnpm exec playwright test -c playwright.staff.config.ts` | PASS 266 tests, zero failures/retries, 12 intentional desktop skips for mobile-only checks; 5.9 minutes |
| `git diff --check` | PASS after final source and receipt updates |
| pgTAP / database lint / integration concurrency | BLOCKED locally: no Docker; 90 new pgTAP assertions and six concurrency cases await disposable CI, not hosted execution |
| Physical devices, native readers, real inbox, hosted migration | NOT TESTED; no hosted actions authorized |

The participant suite includes 54 new confirmation scenarios across EN/AR
desktop/390/360px with axe, including ticket
continuity, release confirmation, both deadline policies, missing migration,
countdown-only behavior and rejected confirmation. Twelve new participant state
screenshots were captured. Desktop EN/AR and mobile AR awaiting plus mobile EN
confirmed were visually reviewed with no clipping or RTL issues.

The Windows Playwright runners did not terminate their own two test web-server
children after finishing all test cases. After verifying every case result,
only each run's two web-server PIDs from its log were stopped; the registration
runner then emitted its 390-pass summary and exited 0. The final staff runner
also exited 0 with 266 passed / 12 skipped. The two failed staff runs correctly
exited 1 with failure summaries. No owner app/port 3210 was touched.

Initial review corrections: source-generated SQL delimiter/payload corruption
was caught and repaired before database execution; lead-zero opening, outer
isolation guard and current-state cancellation timestamp were reviewed. The
first full unit run exposed an audit vocabulary fixture needing the new events;
it was repaired and the full suite passed. The first staff run reported 261
passed, five failed and 12 skipped: four confirmation cases needed their exact
combobox accessible-name locator, and the English settings page overflowed at
320px/200% text. The second run reported 265 passed, one failed and 12 skipped:
wrapping the legend had not fixed the overflow. Geometry then identified the
direct grid-child timing note: its long word plus padding forced a 258.828px
minimum into a 190px fieldset. One scoped `overflow-wrap:anywhere` rule on that
note fixes EN from 324px to 320px; AR remains 320px, both before and after keyboard
review. The ineffective legend change was removed. No assertions, retries or
timeouts were weakened. Failed logs, traces and screenshots remain in
`staff-playwright-initial.log`, `staff-playwright-second.log`, `initial-failures/`
and `second-failures/`; exact geometry is in `settings-overflow-geometry.json`.
Visual review centered the native start dialog explicitly against the global
CSS reset. The 16 new staff confirmation scenarios cover EN/AR desktop/mobile,
axe, policy selection, stale previews, missing RPCs and role restrictions.
EN/AR desktop and mobile dialogs and queues were visually reviewed.

The requested `git checkout -- .impeccable/review/` could not create the linked
worktree index lock because `.git` is read-only in this environment. No review
screenshots had changed: `git diff --quiet -- .impeccable/review/` returned 0 and
its path-specific status was empty. The same diff check confirmed that
`docs/PROGRESS.md` is untouched. No restore was needed.

## Owner / Claude handoff

- Review and approve the two new English drafts and Arabic interface wording.
- Enter confirmation settings and conference days through the existing settings
  process; select release/keep explicitly when starting. No operational choice
  is outstanding for this implementation.
- Claude must review the additive migration, its replaced expiry/ticket/check-in
  functions, ongoing-round scope, rollback/concurrency evidence and CI results
  before a separately authorized hosted replay. Database tests/lint are still
  release gates; local JavaScript/browser results are not database proof.
- Confirm scheduler cadence/plan and delivery budget before activating email.
  Review the existing anonymous/private access and real inbox release gates.
- Commit is left to Claude. This receipt replaces no historical evidence and
  does not edit `docs/PROGRESS.md`.

## File inventory

- `docs/DECISIONS.md`
- `docs/features/REGISTRATION.md`
- `docs/features/REGISTRATION_EMAILS.md`
- `docs/progress/2026-10-23-codex-night3-confirm-seat.md`
- `scripts/registration-ui-provider.mjs`
- `src/app/api/jobs/outbox/drain/route.ts`
- `src/features/registration/backend.server.ts`
- `src/features/registration/contracts.ts`
- `src/features/registration/my-registration.tsx`
- `src/features/registration/my-registration-copy.ts`
- `src/features/registration/my-registration-handler.server.ts`
- `src/features/registration/README.md`
- `src/features/staff-portal/audit-labels.ts`
- `src/features/staff-portal/confirmation-contract.server.ts`
- `src/features/staff-portal/confirmation-copy.ts`
- `src/features/staff-portal/confirmation-round.tsx`
- `src/features/staff-portal/console-copy.ts`
- `src/features/staff-portal/email-previews.server.ts`
- `src/features/staff-portal/email-previews-copy.ts`
- `src/features/staff-portal/email-previews-panel.tsx`
- `src/features/staff-portal/handler.server.ts`
- `src/features/staff-portal/launch-readiness-contract.server.ts`
- `src/features/staff-portal/launch-readiness-copy.ts`
- `src/features/staff-portal/launch-readiness-panel.tsx`
- `src/features/staff-portal/menu.ts`
- `src/features/staff-portal/registration-contract.server.ts`
- `src/features/staff-portal/registration-queue.tsx`
- `src/features/staff-portal/registration-settings-copy.ts`
- `src/features/staff-portal/staff-portal.tsx`
- `src/features/staff-portal/ui-contract.ts`
- `src/features/staff-portal/validation.server.ts`
- `src/lib/email/outbox.server.ts`
- `src/lib/jobs/outbox-route.server.ts`
- `src/lib/jobs/registration-confirmation.server.ts`
- `src/styles/participant-accounts.css`
- `src/styles/staff-console.css`
- `supabase/migrations/20261023032624_registration_confirm_seat.sql`
- `supabase/tests/database/registration_confirmation.test.sql`
- `supabase/tests/database/staff_registration_offers_export.test.sql`
- `supabase/tests/database/staff_registration_queue.test.sql`
- `tests/helpers/registration.ts`
- `tests/integration/staff-registration-concurrency.test.ts`
- `tests/registration-e2e/registration-confirmation.spec.ts`
- `tests/staff-e2e/email-previews.spec.ts`
- `tests/staff-e2e/fixtures/email-previews.json`
- `tests/staff-e2e/launch-readiness.spec.ts`
- `tests/staff-e2e/registration-confirmation.spec.ts`
- `tests/staff-e2e/staff-console.spec.ts`
- `tests/unit/__snapshots__/registration-emails.test.ts.snap`
- `tests/unit/my-registration.test.ts`
- `tests/unit/registration-confirmation-cron.test.ts`
- `tests/unit/registration-emails.test.ts`
- `tests/unit/staff-audit-labels.test.ts`
- `tests/unit/staff-email-previews.test.ts`
- `tests/unit/staff-launch-readiness.test.ts`
- `tests/unit/staff-registration-queue.test.ts`
