# Task n21 — Complete your profile

27 October 2026 · ENG-086 / ORG-066 · `claude/participant-profile`
Workspace: `C:\m\codex-profile`, initially clean. Work is uncommitted.

Requirements: AUTH-05/06/07/08, PRV-02/03/04/05/06, SEC-01/02/06, LOC-01/03,
ACC-01. Owner-selected scope overrides the older AUTH-06 conditional institution
baseline only for these optional account fields. Decisions appended at the end of
`docs/DECISIONS.md` with the exact assigned numbers. `docs/PROGRESS.md` is unchanged.

Implemented the bilingual optional-profile card above ENG-084 next steps, four-item
progress, compact completed state and editor. Fields are private picture,
institution (trimmed, 160 characters), selected status/conditional medical year 1–6,
and up to five existing abstract-specialty IDs. The catalog is read from abstract
settings, including when abstract submission is closed; no specialty list is seeded.
Header and My MSRC use the private picture or initials. EN/AR, RTL, keyboard error
summary/focus, native controls, reduced motion and in-memory language-change drafts
are implemented. Drafts are account/version scoped and cleared on sign-out or denial.
An explicit clear-interests action also removes saved IDs that an organizer later
removes from the catalog, so invisible old choices cannot trap the editor.

The staff detail keeps ENG-083's two authorized roles and participant-target audit.
The new server route obtains a 60-second signed Storage URL and proxies the image,
preserving the existing CSP. Raw object paths/tokens never reach detail JSON.

The exact migration `20261027120000_participant_profile.sql` creates forced-RLS
private tables, no client table policies, a private avatar bucket with restrictive
client denials, and service-only session/ownership-checked RPCs. Save combines
scalar fields and avatar activation atomically; optimistic versions and native
account/session locks prevent stale/concurrent overwrite. Missing functions return
`area-not-ready`. API checks origin, session-bound form token, native identity,
absolute session deadline and persisted IP limits; multipart input is bounded.

The existing `sharp` dependency re-encodes valid JPEG/PNG/WebP input to metadata-free
WebP, rotates it correctly and bounds decoded dimensions/output size. Maximum input
is 2 MiB; invalid MIME/magic, malformed images and animation are rejected. No
fallback rejection due to missing metadata library was needed. Images bypass the
public optimizer and are served through authorized private/no-store routes.

Durable avatar reservations precede upload. Replacement/removal deletes old bytes
through Storage API; failures retain queued work. An ambiguous committed save cannot
cause its active avatar to be deleted. Account cascade deletion (including the
existing 30-day never-verified cleanup), configured one-year retention, abandoned
uploads and deleted pictures feed the same queue. Existing authenticated outbox
maintenance deletes a bounded batch and acknowledges afterward, independently of
the editing flag and mail cap. No scheduler was added/enabled. Future activation
must verify the retention job, outbox maintenance and actual byte deletion.

Privacy Policy v1.1 mirrors only the approved account/purpose/consent/retention
changes in EN/AR. Privacy v1.0 archives remain exact; Terms and registration Terms
acceptance stay v1.0. Signup acceptance now derives v1.1 from the approved privacy
notice. There is no separate app privacy-version environment variable; the hosted
participant policy's `privacy_version` readiness must match at future activation.
Deploying while hosted policy still requires v1.0 closes existing account readiness;
the owner must coordinate the hosted version before deployment. No hosted setting
is changed. The existing shared display effective date is
preserved under “change nothing else”; owner publication must verify that display.

Announcing the change and emailing account holders under Privacy Policy section 9
are owner actions. No email was sent by this task.

## Verification

Node `24.21.0`, pnpm `11.19.0`, existing lockfile/dependencies unchanged.

| Status | Command / evidence | Observed result |
| --- | --- | --- |
| PASS | `pnpm check` | Final combined run after the clear-interests recovery fix: lint, TypeScript, all 5,363 unit cases and the 136-page production build; exit 0. |
| PASS | `pnpm lint` | No warnings after correcting an unused projection binding. |
| PASS | `pnpm typecheck` | Generated route types and TypeScript. |
| PASS | `pnpm test` | Final combined run: 5,363 cases in 131 files. |
| PASS | `pnpm build` | Final production rebuild, 136 pages. |
| PASS | `pnpm exec vitest run tests/unit/participant-avatar.test.ts` | Three real SDK-transport tests: 60-second signing, private transport and invalid path/type denial. |
| PASS | `pnpm exec playwright test --config playwright.participant.config.ts` | 196 passed, four intentional skips, zero retries, exit 0 (12.8 minutes). |
| BLOCKED | `pnpm exec playwright test --config playwright.profile.config.ts` | Fixed port 3216 remained occupied on the initial correct-port attempt and one retry after more than two minutes. Twenty profile cases are prepared; the correct-port runs executed no cases and produced no screenshots. |
| BLOCKED (final rerun) | `pnpm exec playwright test --config playwright.staff-profile.config.ts` | Port 3220 occupied after waiting two minutes and one retry. First four cases reached/passed field/avatar/fallback/RTL/320px/200%-text/axe assertions, then failed an overly broad no-writes assertion: incumbent `action:activity` is expected. Fixture corrected to allow only that known action; full corrected success is not claimed. |
| BLOCKED | `pnpm exec playwright test tests/e2e/policies.spec.ts tests/e2e/participant-closed.spec.ts --project=chromium-desktop --project=chromium-mobile` | Fixed port 3210 occupied by another job on initial attempt and one retry after several minutes. No foreign process was stopped and no server reused. |
| BLOCKED locally / NOT RUN | `pnpm db:reset`, `pnpm db:lint`, `pnpm db:test` | CI-only per task; no local Docker/Postgres runtime. 77 pgTAP assertions written, including two conditional Storage checks (explicit skips on minimal no-Storage stacks). |
| BLOCKED locally / NOT RUN | `PARTICIPANT_PROFILE_DB_TESTS=true pnpm exec vitest run --config vitest.integration.config.ts tests/integration/participant-profile-concurrency.test.ts` | Six genuine two-connection cases written and wired into disposable CI: stale-version contention, committed avatar abandonment, waiting-session deletion, isolation guards and conference-date retention contention. |
| PASS | `git diff --check`; `git diff --exit-code -- docs/PROGRESS.md` | Whitespace clean; progress index untouched. |
| PASS | Browser JS search under `.next/static` | Zero JS files contain the server flag name `PARTICIPANT_PROFILE_ENABLED`. |
| NOT TESTED | CI, hosted migration/Storage/cleanup, real accounts, physical devices and native assistive technology | No hosted execution or activation authorized/performed. |

Initial checks caught the sharp MIME map's TypeScript index type and a test fixture
type; corrected before passing checks. The first full unit pass also exposed the
outbox zero-cap expectation: mail stays inert, while authorized private-file cleanup
must continue. The test now explicitly proves cleanup-only network access, with
mail counts zero. An initial profile browser configuration used port 3266, outside
the deliberately fixed test-auth origins, so it rendered closed; the suite now
shares the existing participant test port 3216 sequentially without widening auth.
The existing participant runner completed every assertion but hung during Windows
server teardown. Only its own tracked Next PID, verified against its original
launch/start time, was stopped; the runner then exited successfully. No foreign job
or shared server was stopped/reused.
The later profile suite still found port 3216 occupied after its required wait and
single retry. Parent-process metadata lookup is denied by Windows, so no untracked
remaining process was terminated. CI remains authoritative for that suite.
Staff first-attempt failure diagnostics are retained in
`.qa/staff-profile-first-attempt-errors.md`; English desktop and Arabic mobile
screenshots from that attempt were visually inspected. All staff authority and
signed-image transport unit tests pass; the corrected full browser run remains
blocked by the shared port.

## Handoff

`PARTICIPANT_PROFILE_ENABLED` remains absent/false by default. No hosted migration,
settings seed, workflow activation, scheduler change, real email, commit, push or
branch creation occurred. The owner/Claude can review the uncommitted diff and then
obtain CI database/security evidence. Before activation, confirm private Storage,
configured retention dates and working cleanup, hosted privacy-version readiness,
and human bilingual UAT. See [feature notes](../features/participant-profile.md).
