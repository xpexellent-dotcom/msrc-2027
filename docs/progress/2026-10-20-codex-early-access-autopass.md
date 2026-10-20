# Early-access list and automatic offer hand-on — backend receipt

20 October 2026. Existing worktree `C:\m\codex-early`, branch
`codex/early-access-autopass`, starting HEAD
`0dbfab640c47e68eb6522368d2e943d7115aa79d`. Changes remain uncommitted.
ENG-051 is appended at the end of DECISIONS; the planner owns ORG-056 and the
console UI. Requirements REG-01–08, ADM-01/02/04/05, ROL-07/10/12,
PRV-03/05/06, SEC-01/02/06 and TIM-01/02 apply.

No hosted migrations/settings, seeds, participant opening, communications, commits,
pushes or branches were made. No `.tsx`, `console-copy.ts`, `src/styles` or
`docs/PROGRESS.md` edits were made. Only the allowed `areas` labels changed in
`copy.ts` (EN “Early access”, AR “الوصول المبكر”).

## Files

- `supabase/migrations/20261020120000_early_access_list_autopass.sql` — the only
  new migration; earlier migrations are unchanged.
- `src/features/staff-portal/{ui-contract.ts,registration-contract.server.ts,
  handler.server.ts,validation.server.ts,security.server.ts,audit-labels.ts,
  menu.ts,copy.ts}` — additive API contracts, Super Admin gates, sanitized
  projections, bulk validation/body limits, audit labels and menu mapping.
- `supabase/tests/database/early_access_autopass.test.sql`,
  `registration.test.sql`, `staff_registration_offers_export.test.sql` — new SQL
  coverage, five-table RLS inventory and superseded expiry expectations.
- `tests/integration/staff-registration-concurrency.test.ts` — competing sweeps,
  expiry versus staff allocation, removal versus submission, isolation guards.
- `tests/unit/{staff-registration-queue.test.ts,staff-audit-labels.test.ts}` —
  handler/validation/projection/missing-function/security coverage and labels.
- `docs/DECISIONS.md`, `docs/features/REGISTRATION.md`, and this receipt.

## RPC signatures and behavior

All return `jsonb`; the three new staff RPCs grant execution only to authenticated
callers and independently require current Super Admin exact-session TOTP through
`msrc_staff.authorize`. They do not depend on participant registration being open.

| Signature | Success result |
| --- | --- |
| `public.msrc_staff_early_access(edition_key text, search text default '')` | `{state:'ready', earlyAccess:{entries:[...]}}` |
| `public.msrc_staff_early_access_add(edition_key text, emails text[])` | `{state:'updated', added:number, invalid:string[]}` |
| `public.msrc_staff_early_access_remove(edition_key text, entry_ids uuid[])` | `{state:'updated', removed:number}` |
| `public.msrc_staff_registration_expire_offers(edition_key text)` (updated, grants preserved) | `{state:'updated', expired:number, offered:number}` |

The private `msrc_registration.early_access_entries` table stores normalized
`lower(btrim(email))` email, stable UUID, edition, active state, adding/removing
staff IDs and timestamps. Emails have a basic shape check and 254-character
normalized bound; the table forces RLS, has indexed foreign keys and no client
grants. List search returns active entries newest first, capped at 200, with
verified participant-account and same-edition request indicators. It never
creates accounts. Active duplicates do nothing; re-adds reactivate the same ID.
`early_access.added` / `early_access.removed` audit rows contain the entry UUID,
performer and before/after active state, with no copied email or fake request.

Both context and submit require the participant's verified native Auth email for
list eligibility. The OR with existing `priority_active` applies only during
the configured priority window. Existing general-window, age, session, settings
and closed-feature gates remain. List mutations take the edition settings update
lock; submission takes its shared lock and rechecks context. Submission now
explicitly requires READ COMMITTED so an older snapshot cannot reuse revoked
eligibility after waiting. No workshop-priority designation is created.

Expiry serializes on the same settings row as allocation and rechecks current
staff authority after waiting. It expires recorded elapsed offers, then offers
at most that many released seats and only within remaining capacity, choosing
waitlisted requests by `created_at,id`. New deadlines use database time plus
the configured window; automatic expiry and offers have NULL performers.
No expiry means no automatic allocation of unrelated vacancies. Null window or
capacity prevents replacement offers; elapsed recorded offers still expire.
Repeated sweeps preserve timestamps and audit. Existing passive staff reads and
allocation paths trigger expiry; no background scheduler is added. Offers still
need the separate participant-acceptance and notification slices before release.

Approved date/free-attendance/duration values appear only as documentation and a
column comment, never seeds/defaults. The owner enters settings on the hosted
database separately; the older completeness fields are unchanged.

## Exact additive UI contract

```ts
// Added union members:
// StaffArea: "early-access"
// StaffAction: "early-access-add" | "early-access-remove"
export type StaffEarlyAccessEntry = {
  id: string;
  email: string;
  addedAt: string;
  addedByName: string | null;
  hasAccount: boolean;
  hasRequest: boolean;
};
// Added StaffPayload fields:
emails?: string[];
entryIds?: string[];
// Added StaffResponse fields:
earlyAccess?: { entries: StaffEarlyAccessEntry[] };
added?: number;
removed?: number;
invalid?: string[];
```

GET `?area=early-access&query=<search>` returns the existing `authenticated`
response with profile and `earlyAccess`. POST actions require the current form
token and existing origin/session safeguards. Add uses `emails`, remove uses
`entryIds`; each accepts 1–500 items. Email-shape failures are returned in
`invalid` as the original strings in input order while valid rows are applied.
Invalid container/types, more than 500 items, individual input strings above
512 UTF-16 code units, or NUL (not representable in PostgreSQL text) reject the
whole HTTP request with `invalid-input`. Normalized storage remains limited to
254 characters. Duplicate remove IDs are harmless. The JSON transport retains
8 KiB for old actions, with bounded exceptions of 768 KiB for add and 24 KiB for
remove so legitimate 500-item batches fit.

The UI must refresh its active query after add/remove, show `added` / `removed`
and partial `invalid` results, and let the Super Admin correct invalid entries.
Render missing account/request flags without implying invitations or email were
sent. Restrict the screen to Super Admins, handle HTTP 403 and HTTP 503
`area-not-ready` without losing the staff session, and keep entry emails private.
The existing no-store response headers remain. Automatic request-history rows
have NULL performers and use the existing “Automatic” presentation. Display
offer deadlines in Asia/Riyadh. Early access is request eligibility only and
must not promise workshop first pick or admission.

## Verification

Commands use `C:\m\tools\bin` first on PATH: Node `v24.21.0`, pnpm `11.19.0`.
Logs are retained under `.tools/early-access-autopass/`.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | PASS, exit 0 |
| `pnpm typecheck` | PASS, exit 0; Next route types generated, TypeScript clean |
| `pnpm exec vitest run` | FAIL: 3,018 passed, 2 failed, 68 files; both failures are EN/AR built-tool action-copy coverage in `staff-action-summary.test.ts` |
| Targeted queue/menu/audit-label tests | PASS: 309 cases in 3 files |
| `git diff --check` | PASS, exit 0 after review; new migration/test/receipt also checked for trailing whitespace |
| pgTAP, strict database lint, genuine database concurrency | BLOCKED locally: Docker executable/local Supabase unavailable; CI execution required |
| UI/browser and human UAT | NOT TESTED; planner integration required |
| Hosted application/activation | NOT TESTED / not performed |

The two full-suite failures expose the pending UI integration: the required
Super Admin `early-access` menu entry is present, but `copy.ts.toolActions` lacks
its EN/AR action-summary phrases. This backend task is explicitly allowed to edit
only `copy.ts.areas`, so those phrases and summary expectations are left for
Claude. The existing assertions were retained. No forbidden copy edits or test
exclusions were used to make the full suite green.

Final post-review lint and typecheck both passed again after the concurrency
suites were moved to independent top-level scopes. Static database review removed
an impossible fixture mutation blocked by the native-email security trigger and
added direct unverified-email helper, cross-edition/duplicate removal and private
audit-projection assertions. These are source-review corrections, not database
execution evidence. HEAD and branch remain unchanged; the final path review found
no edits to the excluded UI/style/progress files or earlier migrations.

Next: integrate Claude's screen and EN/AR action-summary copy, rerun the full
unit suite, then run the migration chain, strict database lint, pgTAP and the
existing isolated registration concurrency harness in disposable Linux CI.
The source remains closed and uncommitted for review.
