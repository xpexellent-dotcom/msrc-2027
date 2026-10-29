# abs2 — Research competition polish and temporary owner review

29 October 2026. Worktree `C:/m/codex-abstract`, branch `claude/abstract-page`,
starting HEAD `74c6b90`, PR #146. The tree was clean before this task.

## Scope and authority

Implements the current owner's abs2 request on top of ORG-068 / ENG-088.
Requirements ABS-01–04/07/08/12/13/15, DSN-01/02, LOC-01–03 and ACC-01 retain the
recorded ORG-068 overrides. No new decision number or migration was introduced;
`docs/DECISIONS.md` and `docs/PROGRESS.md` were not edited. The later binding task
instruction says Claude commits this work; it takes precedence over the earlier
request to commit. Changes remain uncommitted, with no branch creation or push.

Read the project brief, relevant ORG/ENG decisions, progress context, design guide,
abstract feature note, S1 abstract/review/design/localization/accessibility rules,
research components, submission workspace/copy/state, route pages and styles.
The older 300-word/ongoing/two-per-PI baseline is superseded by ORG-068 for this
research form. No rule or long owner paragraph was rewritten.

## Implemented

- Removed the public preparation and rules sections. Both submit/draft CTAs open
  a native labelled acknowledgement dialog with all eight original checklist
  points as independent checkboxes. Continue stays disabled until every item is
  checked; reopening resets acknowledgements. Cancel/Escape restore focus to the
  initiating link; explicit forward/reverse Tab wrapping retains contained focus.
  The background scroll lock is restored on close/unmount. Links remain real
  form destinations without JavaScript; other CTA states retain their behavior.
- Moved the nine unchanged rules above the workspace in a numbered Submission
  rules panel, in English and Arabic. The intro, rules, field groups, bold labels,
  live word counter and actions use coordinated purple/ivory surfaces and rules.
  Scientific content remains English/LTR in the Arabic interface.
- Replaced the plain oral/poster cards with one complementary editorial spread:
  large Roman markers, labelled formats and original inline SVG lectern/poster
  studies. A designed distinction band contains the unchanged three-winners
  statement. Decoration is hidden from assistive technology, forced colors and
  print. Mobile stacks in reading order; Arabic uses logical layout properties.
- Added TEMPORARY server-only `?review=1` guard for preview/development, with an
  explicit production veto. A fresh synthetic ready state is returned before
  session/configuration/database reads. The full blank form opens immediately.
  Save/autosave/preview/finalize use mounted component state only; reload clears
  it. A persistent sticky banner above the rules identifies the simulation.
  Public review CTAs preserve the query, and allowed public review URLs are
  noindex. The private form remains noindex in every mode.
- All research/form/shared account CSS is loaded through `globals.css` imports.
  Removed direct imports of those styles from the affected public/form routes
  and five account/registration consumers of the now-global account stylesheet.
- Added production/query unit proofs and dialog/review/no-JS/rules/presentation
  browser regressions. Separate local servers keep review-only preview tests
  isolated from the incumbent synthetic participant adapter's Vercel veto.
  The programme navigation test now waits for the existing `data-hydrated` marker
  rather than treating an always-enabled anchor as client readiness.

## Wording receipt — old → new

**Existing wording replacements: none.** All long paragraphs, checklist items,
eligibility, limits, supervisor requirements, criteria names, nine rules and
three-winners wording are byte-for-byte unchanged. “Before you start” moved from
public section to dialog heading; “Submission rules” moved to the form panel.
The following additions are the complete new interface wording (Arabic DRAFT):

| Old | New English | New Arabic draft |
|---|---|---|
| Absent | Confirm that you have each item ready before continuing. | أكّد جاهزية كل بند قبل المتابعة. |
| Absent | Continue to the form | المتابعة إلى النموذج |
| Absent | Cancel | إلغاء |
| Absent | Draft translation — for review | ترجمة أولية — للمراجعة |
| Absent | Format I | الصيغة الأولى |
| Absent | Format II | الصيغة الثانية |
| Absent | Research distinction | التميّز البحثي |
| Absent | Review mode — preview only. Nothing is saved or submitted. | وضع المراجعة — للمعاينة فقط. لا يُحفظ أي شيء ولا يُقدَّم أي طلب. |

`draftTranslation` displays only in the Arabic dialog; its English equivalent is
provided for parity. The synthetic review identity is “Review Presenter”,
“reviewer@example.test”, “Synthetic Review Institution”; these are clearly labelled
review data and create no person/affiliation claim. No thresholds, dates, prices,
prizes, capacities, weights or operational defaults were added.

## Review instructions and removal

On an existing Vercel preview, open `/en/abstracts?review=1` or
`/ar/abstracts?review=1`, acknowledge the checklist and continue. Direct review
forms are `/en/abstracts/submit?review=1` and `/ar/abstracts/submit?review=1`.
No hosted configuration change is needed. Repeated/other query values do not
activate review. `VERCEL_ENV=production` always ignores it, even alongside
`NODE_ENV=development`. Ordinary paths retain all incumbent workflow gates.

This TEMPORARY mode must be removed before release. The feature note contains
exact removal scope (server synthetic helper, query/CTA/metadata wiring, local
workspace mutations, banner and review test server). Reading server query
parameters makes public `/abstracts` dynamic temporarily; restore its static
signature when removing review support. Production indexing stays unchanged.

## Validation

All requested commands were run locally on Node 24.21.0 / pnpm 11.19.0.
No framework retries were enabled. Raw browser logs and failed receipts are
retained under `output/abs2/`; the final full real-user result is not green.

| Command | Result |
|---|---|
| `pnpm lint` | PASS — zero warnings, final source recheck |
| `pnpm typecheck` | PASS — generated route types and TypeScript, final source recheck |
| `pnpm test` | PASS — 5,506 tests, 135 files |
| `pnpm build` | PASS — 140 generated pages, after all CSS import cleanup |
| `$env:ABS2_CAPTURE='1'; pnpm exec playwright test -c playwright.abstracts.config.ts` | PASS — 88 cases, final source; includes banner viewport and 320px/200% form bounds, plus 12 refreshed captures |
| `pnpm exec playwright test tests/e2e/premium-interface.spec.ts tests/e2e/chapter-bar.spec.ts tests/e2e/pathway-track-nav.spec.ts tests/e2e/conference-experience.spec.ts tests/e2e/participation-artwork.spec.ts --output output/abs2/journey-final-results` | PASS — 116 passed, 50 intentional project skips, zero failures |
| `pnpm exec playwright test -c playwright.contact.config.ts --project contact-desktop` | PASS — 42 cases in the final isolated run; initial font resource failure retained below |
| `$env:REAL_USER_MEDIA_BASE_URL='http://127.0.0.1:3210'; pnpm exec playwright test -c playwright.real-user.config.ts` | FAIL — 645 passed, 22 intentional skips, 8 failed: six native WebKit playback cases plus two pre-hydration programme tests; diagnostics below |
| `pnpm exec playwright test -c playwright.real-user.config.ts --grep "rapid programme" --output output/abs2/program-navigation-final-results` | PASS — 10 cases after the readiness correction, EN/AR across all five browser/device profiles |
| Isolated WebKit 26.6 dialog probe, EN/AR at 390px | PASS — 2 journeys: all items required, Tab/Shift+Tab containment, Escape, pointer focus return and scroll restoration; `output/abs2/webkit-dialog-check.json` |
| `git diff --check` | PASS — final diff |

The complete 675-case matrix was not repeated after the test-only hydration
correction; its original eight failures remain reported above. The targeted
10-case rerun validates the correction across all five engine/device profiles.
Six native playback checks remain unresolved on this Windows runtime.
The local Windows runner left its web-server processes alive after cases
completed; only this task's logged PIDs, verified against their listening ports,
were stopped to finish teardown and obtain the final summaries. No active case
was interrupted in these final runs and no other job's server was stopped.

Earlier diagnostics are retained here rather than described as passing:

- Initial lint failed on the relative `window.location.assign` rule. Continue now
  resolves the form URL against the current origin before full document navigation,
  preserving the private form CSP boundary. Full lint subsequently passed.
- Initial browser run exposed Chromium native-dialog Tab moving to browser chrome
  at the boundary and an invalid `<aside role="status">`. Explicit boundary focus
  wrapping and a neutral status container fixed the issues without removing checks.
- That run was interrupted when a test-harness error was identified: setting the
  existing participant test server to preview correctly rejected its loopback-only
  adapter. The final harness retains its original environment and runs review
  checks on a separate preview server with both operational flags false. No
  application readiness or security gate was relaxed.
- First Contact attempt encountered `net::ERR_NO_BUFFER_SPACE` loading the local
  Inter font: 41 passed and one failed. Its console/network assertion remains
  intact; the final isolated full suite passes all 42 with no test changes.
- First journey run: 112 passed, 50 intentional skips and four failures from the
  old public-page zero-input assertion. The acknowledgement's sixteen checkboxes
  live in two closed native dialogs. The updated assertion still prohibits forms,
  textareas and inputs outside these dialogs, and verifies only checkbox controls
  inside closed dialogs. Other closed journey assertions and the zero-write check
  remain unchanged. Diagnostic traces/logs remain under `output/abs2/`.
- First real-user attempt was interrupted after native media error code 4 in both
  desktop WebKit film cases. The incumbent test documents a possible loopback
  TLS limitation and an existing `REAL_USER_MEDIA_BASE_URL` option. The complete
  rerun uses `REAL_USER_MEDIA_BASE_URL=http://127.0.0.1:3210` only for the native
  film page; other checks still use the HTTPS proxy. This option does **not** fix
  native decoding on this machine. No decoder, playback, console or network
  assertions were relaxed. Original artifacts remain in `output/abs2/real-user-tls-*`.
- Read-only isolation verifies public CSP permits media, HTTP 200 and ranged 206
  bodies match all local assets byte-for-byte, and MP4/WebM fail in WebKit even
  from full response blobs. Identical existing synthetic WebM bytes in a data URL
  on `about:blank` decode in Chromium (320×180, readyState 4, no error) but fail
  in WebKit (0×0, readyState 0, networkState 3, error 4). This isolates an actual
  Windows WebKit runtime decoding failure from the application, CSP, TLS and HTTP
  transport; the precise internal decoder/OS cause is unidentified. Evidence:
  `output/abs2/webkit-native-media-diagnostic.md` (Playwright 1.63.0, WebKit
  artifact 2359, Node 24.21.0). No application or test changes were made for it.
- Two additional real-user failures came from programme search entered before
  hydration. Traces show `ready()` completed while `#programme[data-hydrated]`
  was still false: iPhone Arabic at 497707 and fill at 497971; iPad English at
  644098 and fill at 644315. Its old `toBeEnabled()` target was an anchor, which
  never becomes disabled. The corrected setup waits for the existing hydration
  marker within the same 15-second readiness budget. Rapid day clicks, search,
  rotation, clear and state-preservation assertions are retained. Evidence:
  `output/abs2/program-readiness-diagnostic.md`; targeted rerun result follows.

## Screenshots and visual review

`output/abs2/` is untracked and must not be committed; `/output/` is now ignored
to protect the captures and diagnostic traces from accidental staging.
Twelve requested captures:
`{en,ar}-{desktop,390}-{public,dialog,form}.png` (desktop 1440×1000; mobile
390×844). Public/form are full-page, dialog is a viewport capture. Public captures
use ordinary `/abstracts`; dialogs use the allowed review query. The form captures
use `/abstracts/submit?review=1`. Inspection crops/logs are also untracked.

All eight public/form captures (EN/AR, desktop/390px) were visually inspected via
detailed crops, plus desktop EN and 390px Arabic dialogs: clear weight hierarchy,
aligned panels, readable fields/counters/actions, mirrored RTL, LTR scientific
inputs, no observed clipping/overflow, fully readable checklist and visible Arabic
draft marker. Browser tests additionally check 320px/200% form bounds and the
banner's actual viewport position after scrolling through finalization.

A structured comparison against starting HEAD confirms all 38 existing research
copy keys in **each** locale are unchanged (including nested arrays/long owner
paragraphs); only six new dialog/format keys were added per locale. Evidence:
`output/abs2/copy-invariants.json`.

## Boundaries, blockers and next task

No hosted Supabase changes, migration application, Vercel environment changes,
settings, participant communications, workflow activation or real submissions.
Local browser fixtures are synthetic and establish no database/production proof.
CI remains authoritative for database lint, pgTAP and concurrency; local Docker
is unavailable and those checks were NOT TESTED in this UI task. Actual preview
hosting and physical devices/screen-reader/native Arabic approval are NOT TESTED.

Next: owner reviews the design/new microcopy and Arabic draft using the preview
links after the authorized commit/push; obtain authoritative CI playback evidence
on a working decoder and remove temporary review mode before release. Existing legal/evidence,
hosted migration/configuration and activation gates in the feature note remain.

## CI follow-up (Claude)

CI on 074c213 failed two public checks. `/abstracts` had become dynamic because it
read the review query on the server, breaking the SSG baseline in
`private-csp.spec.ts`; and `participation-flow.spec.ts` still expected nine rules
on the public page. The public page is static again: the build-time production
veto (`abstractReviewCtaAllowed`) is passed down and the CTA reads `?review=1` in
the browser. The form page keeps the full server guard. Without JavaScript the
public CTA keeps its normal destination. Local: lint, typecheck, build PASS;
unit 26 PASS; abstracts suite 84 PASS; private-csp + participation-flow 28 PASS
(4 skipped); conference-experience + premium-interface 56 PASS (2 skipped).
