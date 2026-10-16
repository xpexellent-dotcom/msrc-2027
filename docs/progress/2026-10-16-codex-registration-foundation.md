# 16 October 2026 — Registration slice 1 (ships CLOSED)

REG-01–08, AUTH-01/06, CHK-01/02, ADM-01–05, DAT-03/04, API-01–03,
TIM-01/02, PRV-03/05/06, SEC-01/02/06, LOC-01/03, ACC-01, REL-02/06.

Implemented locally on the existing `codex/registration-foundation` branch from
`2406a17`. No branch creation, commit, push, PR, hosted database access/application,
Vercel variable, real identity, account or email was performed. The owner/planner
reviews, reruns checks, commits and opens the PR. This O9 note leaves
`docs/PROGRESS.md` untouched.

## Delivered source

- ORG-051 reconciles the confirmed general capacity, waiting list, early access,
  countdown, confirm-seat and organizing-team/volunteer priority. It distinguishes
  pending workshop capacity, proposed synthetic values and undecided prices/windows.
  ENG-043 records database deadline authority, single-RPC seat claim/confirm in
  future slices, durable outbox in slice 2, encryption/key custody and priority.
- Updated DR-CFG-01/07 explanatory text. Added BL-REG-06–11 and BL-ABS-09, with
  seven new CSV rows. All **165 original CSV rows remain byte-for-byte identical**;
  existing registration issue statuses are preserved. Existing DECISIONS content
  is an unchanged prefix; ENG-042/BL-AI-01/package/lockfile overlap is untouched.
- Four private forced-RLS registration tables: nullable per-edition settings,
  requests, priority designations and immutable audit. Migrations seed no settings.
  Public registration RPCs are service-role only; private tables/helpers have no
  API-role grants. Verified native identity is checked by the application and
  exact-session/current account/immutable 18+ evidence is checked again in SQL.
- The actor/edition transaction lock makes retries return the same request and
  orders designation removal against submission. A settings row lock and a fresh
  database clock close requests after waiting across a deadline. This slice only
  inserts `pending_approval`, allocating no seat or payment entitlement.
- Identity numbers use server-only AES-256-GCM, random 12-byte IVs, 16-byte tags,
  versioned keys and edition/account/document/version AAD. A separate HMAC-SHA-256
  secret supports edition/type duplicate detection across accounts. Database
  backups contain ciphertext without these application keys. Four-character
  passports are fully masked; longer values expose only the final four characters.
- Only a current Super Admin can set/remove the private per-edition priority flag,
  with a reason, performer, timestamps and old/new audit snapshots. It is checked
  during the configured priority window and available to future workshop SQL;
  no workshop behavior or public volunteer copy is added.
- Staff lists receive masks only. The existing identity-reveal boundary gains a
  reason-bearing Super Admin overload, shared authority locking and immutable
  staff/registration audit before releasing an encrypted envelope to the server.
  The server decrypts only that envelope; ordinary responses exclude plaintext,
  ciphertext, digest and keys. Legacy reasonless calls cannot reveal a number.
- Existing participant-retention helpers recognize only the reviewed new RESTRICT
  references. Registration/priority history uses the already-permitted
  `retained_account` reason. The helper OID is preserved and unexpected FKs remain
  denied; an expired designated never-verified account has a SQL hold regression.
- EN/AR request form reuses existing fields/buttons, Arabic RTL and LTR document
  entry, the current Terms and immutable account age proof. Neutral receipt:
  “Your seat request is in. We'll email you.” No inline email/outbox is built.
  CSRF is bound to origin/account/session; separate per-attempt IP quota claims
  permit identical retries without weakening database uniqueness.
- Participant native-token refresh retains the exact actor/session and original
  absolute deadline. RSC only observes; client restoration shows no identity
  fields until readiness succeeds. Registration stays noindex and is excluded
  from analytics/Speed Insights.
- Only registration can pass the generic workflow gate, and only with the exact
  private flag plus database settings/policy/readiness/eligibility/time evidence.
  With the flag absent the API retains its original **503** closed payload and
  the page its existing closed presentation (**HTTP 200**). Other workflow gates
  remain hard-closed, including with their environment flags true.

Design, settings/null rules, named-custody reference, rotation, restore drill and
the five-slice rollout are in [REGISTRATION](../features/REGISTRATION.md).

## Owner migration list

`supabase/migrations/20261016110000_registration_foundation.sql` is **pending —
owner applies with the hosted change routine; requires
`20261008160137_participant_age_retention.sql` first**. It does not depend on the
cleanup-scheduler migration, despite sorting after `20261013205046`. Reconcile
actual hosted history and backup/restore evidence rather than replaying prior
versions or using a blanket push/reset. No application or policy activation here.

New private configuration names, blank in `.env.example`: `REGISTRATION_ENABLED`,
`REGISTRATION_IDENTITY_ENCRYPTION_KEYS`,
`REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION`, and
`REGISTRATION_IDENTITY_HMAC_SECRET`. No real key was generated or configured.
Cipher keys and HMAC secret each require independent 32-byte CSPRNG generation;
Production Sensitive custody/offline recovery and both named custodians' acceptance
remain gates. Identifier purge by **28 January 2028** is a later PR.

## Observed checks

Runtime: Node **24.21.0**, pnpm **11.19.0**, with `C:\m\tools\bin` prepended to PATH.
Existing dependencies built successfully; package/lockfile were not edited.

| Check | Actual result |
| --- | --- |
| `pnpm exec eslint . --max-warnings=0` | PASS, exit 0, zero warnings |
| `pnpm typecheck` | PASS, exit 0, generated route types and TypeScript |
| `pnpm test` | PASS, **2,517 tests in 63 files**, exit 0 |
| Clean `.next` removal, then `pnpm build` | PASS, exit 0, **81 generated pages**; registration is dynamic |
| Closed browser checks, EN/AR desktop/mobile plus generic workflow denial | PASS, **14 cases**, exit 0; axe **0 violations** |
| `pnpm exec playwright test --config playwright.registration.config.ts` | PASS, **8 cases**, **17.6 s**, exit 0; EN/AR desktop/mobile keyboard, RTL/LTR, bounds, noindex, duplicate retries, stale-session restoration, correct Terms link; axe **0 violations**, no HTTP 500 responses or final `NoFallbackError` logs |
| Public registration copy grep/content scan | PASS, **98 EN/AR string values**, **0 forbidden matches** for approval/approve/discount/prices/capacity/currency or supplied capacity/threshold figures, including Arabic equivalents; approved legal files excluded |
| Backlog/overlap checks | PASS, **165** original CSV rows unchanged, **7** new rows, ORG-051/ENG-043 each once; protected PR86/policy/progress files unchanged |
| Changed-file documentation links | PASS, **85 relative links**, **0 missing targets** across **43 changed files** |
| `git diff --check` | PASS, exit 0 |
| `pnpm db:test` | **BLOCKED locally**, exit 1 before execution: Supabase CLI telemetry write under the user profile returns EPERM; Docker command is also unavailable |
| `pnpm exec supabase db advisors --local --type performance --level warn --fail-on error` | **BLOCKED locally**, exit 1 on the same CLI telemetry restriction; no advisor result claimed |
| SQL migration/reset/strict lint/RLS/ACL/FK checks | **BLOCKED locally**, **90 planned pgTAP assertions** written, none executed here |
| Database concurrency and persisted-envelope rotation | **BLOCKED locally**, **4 integration cases** written, none executed here |
| Genuine managed Auth + registration DB/browser end-to-end composition | **BLOCKED locally**; loopback browser results do not establish this proof |
| Hosted CI, migration, flags, real custody/backup restore, purge, real email, human/native-reader/device/assistive-tech UAT | **NOT TESTED / NOT PERFORMED** by this task |

The enabled provider is a loopback-only synthetic substitute for database/native
Auth responses. The browser still exercises actual SSR, API, encryption, cookie,
CSRF, form, retry and refresh code. It does not prove database/native Auth security.
Encryption round-trip, HMAC scope, masking, tamper/context denial and older-version
decryption after rotation pass in the unit suite; the real persisted-envelope
proof remains one of the four blocked integration cases. JSON transport in that
test is not a full backup/restore drill.

CI now separately lints `msrc_registration`, runs performance advisors, and runs
registration concurrency/rotation after its own disposable database reset using:
`REGISTRATION_DB_TESTS=true pnpm exec vitest run --config vitest.integration.config.ts tests/integration/registration-concurrency.test.ts`.
This avoids singleton policy/global Super Admin fixture overlap with existing
parallel suites. The ordinary shared integration run intentionally skips these
four cases; the dedicated CI step executes them. Hosted CI has not run here.

Preserved findings: an initial test-table TypeScript inference error was corrected.
Review corrected a database/UI mask mismatch, complete exposure of a four-character
passport suffix, retention hold-reason compatibility, and cached-function OID
preservation. Browser diagnostics found a real refreshed-form Terms link using
the initial undefined version: Next logged `NoFallbackError` for prefetch of
`/en/terms/undefined` or `/ar/terms/undefined` despite successful assertions. The
link now uses the refreshed version, with an explicit `/terms/v1.0` regression and
HTTP-500 response checks. No retries, weakened assertions or longer timeouts were
added. Windows Playwright teardown required stopping only the known Next/provider
processes launched for the tests after assertions completed; exit-zero completion
was observed. This is a runner limitation, not unattended clean teardown proof.

Closed command: `pnpm exec playwright test tests/e2e/registration-closed.spec.ts tests/e2e/closed-workflows.spec.ts --project chromium-desktop --project chromium-mobile`
— **14 passed in 30.3 s, exit 0**. This receipt used the fresh build before the
one-line refreshed Terms-link correction; the closed path is unchanged. The
eight enabled cases above were rerun on the final rebuilt source. Four final
synthetic screenshots are under
`test-results/registration/registration-{desktop|mobile}-{en|ar}-form.png`;
EN desktop and AR mobile were visually inspected by the implementer.

## Exact public copy changes

| Locale/location | Before | After |
| --- | --- | --- |
| EN step | Register and pay | Reserve your seat |
| AR step | سجّل وأتمّ الدفع | احجز مقعدك |
| EN account detail | Create your account and verify your email. You can then register and pay when registration opens. | Create your account and verify your email. You can then reserve your seat when registration opens. |
| AR account detail | أنشئ حسابك وتحقّق من بريدك الإلكتروني. يمكنك بعدها التسجيل والدفع عند فتح التسجيل. | أنشئ حسابك وتحقّق من بريدك الإلكتروني. يمكنك بعدها حجز مقعدك عند فتح التسجيل. |
| EN closed detail | Registration dates, prices and attendance details will be announced before registration opens. | Registration dates and attendance details will be announced before registration opens. |
| AR closed detail | ستُعلن مواعيد التسجيل والأسعار وتفاصيل الحضور قبل فتح التسجيل. | ستُعلن مواعيد التسجيل وتفاصيل الحضور قبل فتح التسجيل. |
| EN planning detail | 27–28 January 2027 · King Faisal Conference Center, King Abdulaziz University, Jeddah. The registration window and prices are to be announced. | 27–28 January 2027 · King Faisal Conference Center, King Abdulaziz University, Jeddah. The registration window will be announced. |
| AR planning detail | ٢٧–٢٨ يناير ٢٠٢٧ · مركز الملك فيصل للمؤتمرات، جامعة الملك عبدالعزيز، جدة. ستُعلن فترة التسجيل والأسعار لاحقًا. | ٢٧–٢٨ يناير ٢٠٢٧ · مركز الملك فيصل للمؤتمرات، جامعة الملك عبدالعزيز، جدة. ستُعلن فترة التسجيل لاحقًا. |

No policy source was edited. The existing approved photography notice is reused;
no new legal text or volunteer publicity is introduced.

## Files changed

- Configuration/CI: `.env.example`, `.github/workflows/ci.yml`,
  `playwright.registration.config.ts`, `scripts/registration-ui-provider.mjs`.
- Docs: `docs/DECISIONS.md`, `docs/backlog/DECISION_REQUIRED.md`,
  `docs/backlog/10-registration.md`, `docs/backlog/07-abstract-submission.md`,
  `docs/backlog/ISSUE_INDEX.csv`, `docs/features/REGISTRATION.md`,
  `docs/features/STAFF_PORTAL.md`, this progress note.
- Participant/public/server: `src/app/[locale]/(preview)/registration/page.tsx`,
  `src/app/api/workflows/[workflow]/route.ts`, `src/content/conference-experiences.ts`,
  `src/lib/workflows.server.ts`, `src/lib/vercel-observability.ts`, and new
  `src/features/registration/{backend.server,contracts,handler.server,identity-crypto.server,page-state.server,registration-copy,registration-form,security.server}.{ts,tsx}`
  (eight actual files, extensions as appropriate).
- Staff: `src/features/staff-portal/{copy,handler.server,identity-document,staff-portal,ui-contract,validation.server}.{ts,tsx}`
  (six actual files), plus the updated reason-bearing native staff reveal fixture
  in `tests/staff-native/staff-portal.test.ts`.
- DB/tests: the new migration above, `supabase/tests/database/registration.test.sql`,
  `supabase/tests/support/registration-fixtures.psql`,
  `tests/integration/registration-concurrency.test.ts`,
  `tests/unit/{foundation,staff-portal-backend,vercel-observability,registration-identity,registration-request}.test.ts`,
  `tests/e2e/registration-closed.spec.ts`, and
  `tests/registration-e2e/registration-request.spec.ts`.

## Remaining decisions and next work

Organizer answers remain: free versus paid and any required finance contract;
all opening/priority/early-access instants and lifecycle durations/thresholds;
priority qualifications, roster verification and responsible operator; early-access
groups/proof; 50 workshop seats per workshop or total and catalog/count; queue,
offer/confirm-seat consequences; and acceptance of actual key custody/restore
evidence. Published Terms govern existing refunds wording.

Next: planner/QA reviews this diff, runs disposable SQL/concurrency/advisor checks
and the browser receipts, then commits/opens the PR. Slice 2 is the durable outbox
and jobs. This handoff authorizes no hosted action or opening of registration.
