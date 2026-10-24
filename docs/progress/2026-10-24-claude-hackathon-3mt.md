# Task n14 — Hackathon and Three Minute Thesis

24 October 2026. Branch inspected: `claude/hackathon-3mt`; worktree
`C:\m\codex-n14`. Starting Git status was clean. Work stays uncommitted.
Decision ENG-077; migration `20261024150000_hackathon_3mt.sql`.
Requirements TRK-01, HAC-01–11, TMT-01–02, CFG-13; LOC-01/02/03 and SEC/PRV
boundaries from AGENTS.md apply. `docs/PROGRESS.md` is untouched.

## Delivered

- Private forced-RLS competition tables with no client table/schema policies or
  grants. Participant RPCs use the registration service-role/verified-claims
  bridge; staff calls use exact native sessions and persisted role authority.
  READ COMMITTED guards, actor-scoped idempotency, optimistic draft versions,
  settings/entry locks and immutable snapshots/audit follow abstracts patterns.
- Separate Hackathon and postgraduate 3MT forms/settings/stages. Hackathon has
  solo exactly one, teams at most five including the lead, the two exact HAC-02
  tracks, the shared frozen Unicode 300-word pitch counter and originality
  declarations. 3MT does not inherit the abstract/Hackathon word limit. No
  national-ID/phone, automatic matching, AI check or prize-distribution workflow.
- Verified-account email roster lookup, duplicate-safe invitations, separate
  committee acceptance and post-acceptance member confirmation. Initial review
  does not require later confirmation. Invitees cannot read unaccepted projects.
  No invitation email is queued or delivered by this slice.
- Eligibility, human-sanitized blinded packets, conflict/affiliation checks, two
  independent Hackathon reviewer assignments, versioned drafts and locked final
  cards. Selection requires configured criteria/scale/quorum/solo accounting/cap.
  Staff manually record rank and tie-rule application; no weights/aggregation or
  no-ties policy is invented. Prepared decisions require a separate explicit
  publication, with fresh policy/review-basis checks and transactional capacity.
- Separate closed-panel final cards, no pre-event review projection to judges,
  final-material freeze, individual participant activity evidence and recorded
  outcomes. No certificates, payments or awards are issued here.
- Private supporting/final files with server-authorized scoped signed transfers,
  quarantine and clean-only reads. Actor technical admission budget: 60 new
  mutations/minute, separate from authentication budgets. File grants revalidate
  current policy on replay. Upload is non-upsert; final panel creation requires
  clean files and freezes later uploads. Scanner completion is service-only.
- Participant `/en|ar/entries`, staff `/en|ar/staff/competitions`, English-only
  `/en/reviewer/competitions` and `/en/judge/competitions`. Arabic scoring routes
  redirect to English. EN/AR shells preserve English/LTR scientific fields.
  Staff settings visibly retain null/unset policies; no UI can enable release
  gates. Missing RPCs show `area-not-ready` without ending sign-in.
- Private CSP and analytics exclusions cover the new routes. Only the gated entry
  document allows its exact Storage origin. Authorized CSV exports protect
  spreadsheet formula-leading content. Public Hackathon/3MT pages remain closed.

## Verification

Runtime observed: Node `v24.21.0`, pnpm `11.19.0`; existing locked application
dependencies, no application dependency installation or lockfile change.

| Check | Observed result |
| --- | --- |
| `pnpm lint` | PASS on final source, after fixing staff Link/ref findings |
| `pnpm typecheck` | PASS on final source (`next typegen && tsc --noEmit`) |
| `pnpm test` | PASS on final source: 4,786 tests in 109 files |
| `pnpm build` | PASS on final source: optimized Next.js build, 122 generated pages |
| `pnpm exec playwright test --config playwright.competitions.config.ts` | BLOCKED: port `3218/health` occupied on first attempt at 00:09 UTC and the single delayed retry after 00:13 UTC; no other job stopped or port changed |
| `pnpm exec playwright test --config playwright.competitions-staff.config.ts` | PASS: 16 desktop/mobile EN/AR staff and English reviewer/judge scenarios, zero retries; scoring-shell follow-up below |
| `git diff --check` | PASS; CRLF-to-LF advisory for appended decisions is informational |
| `pnpm db:test` (pgTAP) | BLOCKED locally: no local Docker/Supabase stack; prepared SQL assertions require disposable CI |
| `pnpm db:lint` (`--fail-on warning`) | BLOCKED locally: requires disposable CI; `msrc_competitions` added to the schema allowlist |
| `COMPETITIONS_DB_TESTS=true pnpm exec vitest run --config vitest.integration.config.ts tests/integration/competition-concurrency.test.ts` | NOT TESTED locally: three genuine multi-connection proofs are restricted to unlinked loopback Linux GitHub CI |
| Hosted migrations/settings, real mail, participant opening, production UAT | NOT TESTED / not performed; not authorized |

The initial full unit run caught the intentionally strict public-folder analytics
inventory for `entries`. It now explicitly classifies the route as private and
checks discarded participant/reviewer/judge analytics events. The assertions were
retained. Browser providers are explicitly synthetic loopback fixtures and are
not database, permission, concurrency, native-auth or production evidence.

Prepared CI coverage includes pgTAP for roster/solo bounds, two tracks, exact word
count, SQL null guards, blinding/conflicts, own assignment access, unset stages,
distinct 3MT schema, individual activity evidence, immutable records, private file
permissions and replay. Three real transaction tests cover identical operation
deduplication, stale draft writes and the last configured finalist place during
concurrent decision publications. Both new Playwright suites are wired into the
existing participant/staff CI jobs; database concurrency is wired into Foundation
CI after a disposable reset.

The migration has 141 prepared pgTAP assertions. An additional temporary ignored
PGlite 0.5.11 harness (`node .tools/n14-pglite/smoke.mjs --flows`) PASSed migration
syntax and 179 statements against **stub** incumbent auth/participant functions
and an assertion shim. Its initial run caught two missing CASE-expression
parentheses; both were corrected. This is not real Supabase, pgTAP, strict SQL
lint, native session or concurrent database evidence. No application package or
lockfile changed for this temporary syntax tool.

Screenshot review found the public header overlaying the new reviewer/judge
workspace and a nested main landmark. Exact scoring routes now use the private
staff shell and one main landmark; twelve route-render tests protect the boundary.
The affected desktop/mobile English scoring cases were rerun after the final
build with `pnpm exec playwright test --config playwright.competitions-staff.config.ts --grep 'reviewer Arabic|judge Arabic'`.
Final scoring capture inspection and command completion are recorded below.
The first Windows browser run completed all sixteen scenarios but waited during
server teardown; only its own two logged server PIDs were stopped, after which
Playwright exited 0. No unrelated/shared server was touched.

Final scoring follow-up: PASS, four cases, zero retries, exit 0 after stopping
only that completed run's two logged server PIDs during Windows teardown.
The new heading/one-main/no-public-header/footer assertions and axe pass. Final
mobile judge and reviewer captures were visually inspected; the overlay is gone
and scoring/file/conflict controls fit at 360px. Representative desktop and mobile
captures are preserved in [the visual receipt](../reviews/2026-10-24-hackathon-3mt/README.md).
Physical devices, WebKit, native-reader review and real assistive technology are
NOT TESTED in this task. The 24 prepared participant browser cases require CI
because the specified local port remained occupied after the permitted retry.

## Activation blockers and next task

Every unresolved business policy is preserved in ENG-077, with no default values.
`COMPETITIONS_ENABLED` remains absent/off; per-kind enabled/evidence/files gates
remain false with no seeds or RPC/UI activator. Existing account/privacy/age/
retention/authentication gates remain independent. Policy text records authorized
human decisions; eligibility, policy application and manual ranking still need
operator review and human UAT. Configuration presence is not approval evidence.

File scanning integration and operational evidence are pending. The PDF/PNG/JPEG
allowlist and 25 MiB limit are technical transport bounds, not approved file rules.
[Supabase's signed upload API](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)
issues upload capabilities; non-upsert, quarantine and panel freeze protect
immutable material. Read capabilities use the official
[signed URL API](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl)
with a 60-second technical lifetime. No scanner or production Storage flow was
exercised locally. Approved file policy and scanning must precede enabling files.

Next: run the full migration reset, strict lint, pgTAP and the concurrency proofs
in disposable CI; review EN/AR and English scoring browser receipts; obtain the
organizer policies and independent release evidence before any activation. Claude
owns the requested commit/review handoff. No commits, pushes, new branches,
hosted changes or live messages were made by this task.
## Task n15 ? CI staff browser race follow-up, 24 October 2026

Root cause: the synthetic staff provider read the clock independently for
lastActivityAt and idleExpiresAt. Crossing a millisecond boundary violated the
session parser's exact idle-expiry invariant, so authority failed closed before
either queue loading or scorecard mutation. The initial CI-mode local staff run
reproduced the same denied-save symptom in the mobile settings case (15 passed,
1 failed). An advancing-clock diagnostic deterministically produced an invalid
1,800,001 ms idle interval before the fix and the required 1,800,000 ms afterward.
The provider now captures one activity instant and derives expiry from that value
and SESSION_POLICY. Zero scores were already preserved; production authorization,
assertions, timeouts, retries and worker counts are unchanged.

The participant baseline also failed all four EN/AR desktop/mobile over-limit
cases on the second pitch fill: exact getByLabel matching included the nested
textarea's updated text. The pitch now has an explicit span/aria-labelledby
reference. The existing .competition-error text-filter assertion is unchanged.

Validation on Windows, Node 24.21.0 / pnpm 11.19.0:
- PASS: pnpm build (before reproduction and after the fix), pnpm lint,
  pnpm exec tsc --noEmit, pnpm exec vitest run (109 files, 4,786 tests),
  and git diff --check.
- PASS: two consecutive verification rounds, each running
  pnpm exec playwright test --config playwright.competitions-staff.config.ts
  (16/16 each) followed by --config playwright.competitions.config.ts
  (24/24 each), with CI=1 and NEXT_TELEMETRY_DISABLED=1, two workers and
  zero retries. All four commands exited 0. Windows server teardown required
  stopping only each completed run's own logged provider/Next PIDs after every
  case finished; no in-flight test or unrelated process was stopped.

Linux GitHub execution remains NOT TESTED on these uncommitted edits; Claude's
next step is commit/review and CI verification. No push or hosted change was
performed. docs/PROGRESS.md is untouched.
