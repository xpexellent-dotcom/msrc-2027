# Task n10 — conference registration identity (ORG-064 / ENG-073)

Date: 24 October 2026. Worktree `C:\m\codex-n10`, existing branch
`claude/registration-identity`. Initial working tree was clean. Changes remain
uncommitted; no branches, commits, pushes or hosted changes were made.
`docs/PROGRESS.md` was not edited.

## Result and authority

Implemented the owner's simplified ORG-039 refinement, recorded only as ORG-064
and ENG-073 at the end of DECISIONS.md. Requirement mapping: REG-01/02/05,
PRV-03/05/06, SEC-01/02/06, LOC-01/03, ACC-01 and HAC-10.

The repository already contained the EN/AR identity form and an encrypted identity
payload embedded in requests, with a separate reasoned Super Admin reveal. This
change replaces that active path with the normal private-table baseline:

- Required document choice and number for new requests. National ID is ten ASCII
  digits starting 1, Iqama starts 2, passport is 5–20 Latin letters/digits.
  Arabic-Indic and Eastern Arabic-Indic digits normalize to ASCII; passport is
  uppercase. Both HTTP and SQL validate, without asserting independent verification.
- `msrc_registration.identity_documents` is keyed by registration request, with
  forced RLS, no client policies and no PUBLIC/anon/authenticated/service-role
  table grants. Nothing is added to profiles or hackathon records (HAC-10).
- Only the existing registration administrator / Super Admin request-detail
  authorization returns the full type and number. Lists and the existing Super
  Admin export keep their existing masked-only projection. Check-in/reviewer,
  public, ticket, QR, outbox/email, history and audit projections gain no number.
- Missing child records render “Not provided” / “غير مقدّم”. Existing requests
  stay valid and are not forced to recollect. Historical ciphertext is not
  decrypted or guessed; it remains in the old nullable fields until retention.
- Removed the application identity crypto module, reveal UI, identity key
  generation/config diagnostics and ticket reader's dependency on retired
  identity keys. Existing ordinary staff/session/TOTP requirements remain.

The form uses the short neutral EN/AR purpose line “used for identity verification
only”. The approved policy contains a verification-purpose table entry, but no
standalone equivalent sentence covering all three document choices was found.
Flag this UI wording for owner/native-Arabic review; published legal text was not
changed or re-approved by this task.

## Migration and contracts (review only)

`supabase/migrations/20261024110000_registration_identity.sql` adds the private
child store, normalized constraints and immutable counts-only retention audit.
It seeds no settings, dates, participants, keys or scheduler.

- New server-only `public.msrc_registration_submit(edition_key text,
  session_claims jsonb, document_type text, document_number text,
  terms_version text) returns jsonb`, EXECUTE granted only to service_role.
  Ownership comes from the verified/native exact session, never an input actor.
  READ COMMITTED, authority/account/actor/settings locks, readiness and the
  existing actor/edition idempotency remain. Child write and submission/audit /
  existing business triggers are one transaction; conflict rolls back that attempt.
- Old encrypted eight-argument submit returns denied. The reasoned three-argument
  `msrc_staff_identity_reveal` returns denied; there is no replacement reveal.
- Existing `msrc_staff_registration_detail(text,uuid)` adds `identityVersion:1`
  and `detail.identity:null|{documentType,documentNumber}`. Its ordinary role scope,
  expiry/seat locks and complete history remain. Strict projections reject leaked
  identifier fields in lists and malformed/extra detail fields. Launch readiness now checks the new submission signature and private identity
  maintenance capability instead of the retired overload. Missing RPCs or
  older detail capabilities give `area-not-ready`, preserving the signed-in session.
  Participant missing-new-signature handling uses RegistrationRpcMissingError.

## Retention

`msrc_registration.purge_identity(edition text)` runs from the existing guarded
registration confirmation maintenance RPC. No new scheduler. It locks the edition
settings and uses the final configured conference date plus one calendar year,
midnight Asia/Riyadh, strictly past the boundary. Unset days purge nothing.

Each invocation deletes at most 500 private identity rows and clears at most 500
legacy request identity-field sets, including ciphertext, digest, key version,
type and mask. Counts-only immutable audit has no participant/request/session IDs
or values. Other editions and registration status/history remain. Repeat runs
finish larger batches. New collection is closed after the retention boundary.

Existing runtime/participant/outbox sweep gates and maintenance invocation cadence
remain in force. Owner activation/operations must maintain an authorized cleanup
cadence; this task does not promise an active hosted scheduler or immediate backup
erasure. Existing backup expiry/restore review remains a release responsibility.

## Verification

| Status | Command / evidence |
| --- | --- |
| PASS | `pnpm lint` (whole repository); final scoped ESLint for changed integration/e2e files also passed |
| PASS | `pnpm typecheck` (Next route generation and `tsc --noEmit`), including final test changes |
| PASS | `pnpm test`: 106 files, 4,628 unit tests |
| PASS | `pnpm build`: 114 generated pages; operational routes retain their existing gates |
| PASS | `pnpm exec playwright test --config playwright.staff.config.ts tests/staff-e2e/staff-console.spec.ts tests/staff-e2e/staff-portal.spec.ts`: 94 passed, 2 intentional desktop skips, no retries |
| PASS (runner) | `pnpm exec playwright test --config playwright.registration.config.ts --workers=1`: 408 passed, zero failed, zero retries (10.4m); runner state file reports passed with an empty failedTests array. See PowerShell wrapper note below. |
| PASS | `git diff --check` after removing one test EOF blank line; final recheck passed |
| BLOCKED locally / NOT RUN | pgTAP, strict database lint (`--fail-on warning`), and genuine integration/concurrency execution: task environment has no local Docker; disposable Linux CI is authoritative |
| NOT TESTED / not performed | Hosted migration, settings/seeds, production flags/workflow opening, real email, live data, physical-device/native-reader UAT |

Initial two-worker registration run: **389 passed, 19 failed**. Eighteen new
validation cases used an unscoped alert selector, matching both the form error
and Next.js route announcer. Corrected the selector to the registration form;
retained the validation/error assertions, timeouts and zero retries. One existing
Arabic approved-cancellation case at 390px lost its confirmation during a status
refresh (`MyRegistration.refresh()` clears confirmation on resume/pageshow). No
identity code changes that behavior. The serial run separates final local evidence
from that earlier concurrent-run failure; CI must still exercise its configured
parallelism. No retries or longer timeouts were added.

The 13-case obsolete Super Admin reveal-control matrix was removed with its dead
menu helper; ordinary authorized detail, HTTP retirement denial and browser absence
of reveal controls supply the new coverage. The CI-only native test was also updated
to expect the retired HTTP action to deny without invoking the reveal RPC. During
this cleanup scoped ESLint first found the now-unused Role import; removing it
made that same check pass.

PowerShell wrapper note: redirecting native stderr into the final run log caused
the outer shell to report exit 1 for the NO_COLOR warning, despite the runner's
408-pass summary and `test-results/registration/.last-run.json` containing
`{"status":"passed","failedTests":[]}`. Reproduced independently: a Node process
that only writes synthetic stderr has native exit code 0, but this same Windows
PowerShell `*>` wrapper reports exit 1. The test result is PASS; the wrapper exit
is not represented as a clean command exit. Evidence: `.tools/n10/registration-final.log`
and `.tools/n10/shell-warning-probe.log`. No test assertions or timeouts were changed.

Windows runner shutdown note: after all 408/96 test cases had reported, the two
owned synthetic webserver pairs remained alive and prevented runner completion.
Stopped only the four PIDs printed by these task's initial webserver launches (and the two printed by the final serial run); the runners
then emitted the above observed results. No other job's server was touched.

Coverage added/prepared: format boundaries and both Arabic digit ranges, HTTP
ownership/forged fields/missing RPC preservation, strict staff detail projection,
masked list/no reveal, EN/AR actual form rejection and normalized submission at
desktop/390/360, pgTAP direct-grant denial/role scopes/own-session writes/legacy
missing identity/unset-before-after retention/other-edition isolation/idempotent
purge/count-only audit, and CI integration child-row idempotency, authorized
detail, settings-edit versus purge locking and isolation guards. Database tests
are written and reviewed, not represented as executed.

Synthetic screenshots generated under `.tools/journey-review/registration/after/`
and `.tools/staff-console/`. Visually inspected Arabic desktop/mobile form and
Arabic mobile staff detail; EN/AR browser tests also retain RTL, bounds, keyboard
and axe assertions. These are synthetic application evidence, not production UAT.

## Remaining and next task

Run disposable CI migration replay, pgTAP, strict SQL lint and registration/staff
integration suites on Claude's eventual committed revision. Keep all gates closed.
Review the neutral purpose line and historical encrypted-record treatment before
any separately authorized deployment. Investigate the existing cancellation /
resume-refresh test race under CI parallelism if it recurs. No live activation
or scheduler/configuration change is part of this handoff.
