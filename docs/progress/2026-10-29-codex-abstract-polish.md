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


## abs3 review

29 October 2026. Independent review of PR #146 on the existing
`claude/abstract-page` branch at starting HEAD `8b4311b`; the initial tree was
clean. The owner's shortened hero intro (ending at “academic professionals.”)
and removal of the supervisor hint are preserved. The final binding common rule
supersedes the earlier commit request: changes remain uncommitted for Claude;
no branch was created and nothing was pushed.

Read AGENTS.md, project brief, relevant ORG/ENG decisions, progress context,
design guide, S1 abstract/localization/design/accessibility sections and all
requested research/form source files. ORG-068 / ENG-088 govern this slice;
ABS-01–04/07/08/12/13/15, DSN-01/02, LOC-01–03 and ACC-01 are preserved under
those recorded overrides. No new decision or migration is needed.
docs/DECISIONS.md and docs/PROGRESS.md are untouched.

### Opinion — ranked concrete issues

1. **Participant-facing messages expose release machinery.** “Database release”,
   incomplete “scientific settings” and confidential-evidence/virus-scanning
   dependencies read like an internal implementation report. Replace them with
   the actual participant consequence: submissions unavailable, session retained,
   or draft saved. Keep all underlying gates intact.
2. **Form hierarchy is too uniform.** Inputs inherit the same heavy weight as
   their labels, while section legends are only slightly larger. Increase the
   section-heading distinction and use regular-weight entered text. The broad
   legend selector also reaches nested co-author legends; scope it to each
   section's immediate legend so co-author groups retain their own hierarchy.
3. **Six desktop journey columns compress useful information.** At 1440px the
   original date ranges and longer step title wrap inside narrow columns, and
   supporting text is only 14px. Use three columns over two rows with 16px body
   text and more row space. Preserve the phone's native vertical timeline and
   Arabic reading order.
4. **Public headings and short introductions can be more formal and direct.**
   Conversational titles and the “To ensure a high standard…” preamble slow
   scanning. Use Presentation formats, Eligibility and Evaluation criteria with
   concise introductions. Preserve criterion names and all eligibility content.
5. **Keyboard and screen-reader guidance can be more explicit.** The dialog's
   native containment, Escape and focus return already work. Add a local,
   high-contrast focus ring; associate the title counter and ethics/registration
   helpers with their controls through aria-describedby. Do not alter checklist
   requirements or dialog behavior.
6. **The phone form still has a long preparation sequence.** Nine rules,
   guidance and the saved-draft card precede the editor; the one-chance warning
   and word-count guidance recur deliberately near the relevant actions/fields.
   This is readable but lengthy at 390px. Reconsidering that sequence or changing
   acknowledgement policy needs an owner content/interaction decision.

### Implemented

- Three-column desktop journey with larger supporting text, wider measures and
  clear row spacing; one-column phone timeline and logical RTL layout retained.
- Stronger responsive form section legends; separately styled nested co-author
  legends; bold labels and regular-weight input/select/textarea contents.
- Explicit purple keyboard focus outlines on dialog checkboxes and buttons.
- Accessible descriptions for the title word count and both ethics/registration
  helpers. Extended the existing review-flow regression with those descriptions
  and a synthetic English/LTR co-author at 320px / 200% text.
- Concise public headings, eligibility/evaluation intros, form introduction,
  preview instruction and availability messages, with matching DRAFT Arabic.
- Feature-note cross-reference added. CSS remains loaded through globals.css;
  no route stylesheet imports were added.

No rules, numbers, dates, limits, eligibility conditions, criterion names, long
oral/poster paragraphs, checklist items, three-winners statement, backend/API,
migrations, review guard, feature flags or operational settings were changed.
The preservation probe compares 26 protected EN/AR copy entries against HEAD
exactly: hero intro, both long paragraphs, winners, eligibility cards, checklist,
sections, word-limit explanations, criteria, rules and journey copy.

### Every wording change — old → new

The following 22 replacements are the complete wording diff. Arabic remains
**DRAFT**. The uploadGate entry is currently unused by the workspace; its wording
was aligned without adding a new visible notice or changing an upload gate.

| Surface / key | Old | New |
|---|---|---|
| Public EN / presentations | Two ways to share your research | Presentation formats |
| Public EN / eligibility | Who can take part | Eligibility |
| Public EN / eligibilityIntro | To ensure a high standard of academic and research quality, presenters must meet the following eligibility criteria: | Presenters must meet the following eligibility criteria: |
| Public EN / evaluation | How abstracts are evaluated | Evaluation criteria |
| Public EN / evaluationIntro | Eligible abstracts will be evaluated using a standardized scoring rubric based on the following criteria: | Eligible abstracts are assessed using a standardized scoring rubric: |
| Public AR DRAFT / presentations | طريقتان لمشاركة بحثك | صيغ العرض |
| Public AR DRAFT / eligibility | من يمكنه المشاركة؟ | الأهلية |
| Public AR DRAFT / eligibilityIntro | لضمان مستوى عالٍ من الجودة الأكاديمية والبحثية، يجب أن يستوفي مقدم العرض معايير الأهلية الآتية: | يجب أن يستوفي مقدم العرض معايير الأهلية الآتية: |
| Public AR DRAFT / evaluation | كيف تُقيَّم الملخصات؟ | معايير التقييم |
| Public AR DRAFT / evaluationIntro | ستُقيَّم الملخصات المؤهلة باستخدام نموذج تقييم موحّد يستند إلى المعايير الآتية: | تُقيَّم الملخصات المؤهلة باستخدام نموذج تقييم موحّد: |
| Form EN / lead | Prepare your English research abstract, save a draft, and review every detail before submitting. | Prepare your abstract in English. Save a draft and review it before submission. |
| Form EN / notReady | This workspace is awaiting its database release. Your sign-in is retained. | Abstract submissions are not yet available. You remain signed in. |
| Form EN / windowClosed | The submission window is closed or its scientific settings are incomplete. | Abstract submissions are currently closed. |
| Form EN / uploadGate | Uploads are unavailable. Ethics evidence and the similarity report require an approved virus-scanning and confidential evidence process before final submission can open. | File uploads and final submission are not yet available. |
| Form EN / previewNote | Check the complete preview before using your one submission chance. | Review all details before submitting. |
| Form EN / evidence_gate | Final submission is blocked pending the approved confidential evidence and virus-scanning process. Your draft is saved. | Final submission is not yet available. Your draft is saved. |
| Form AR DRAFT / lead | أعدّ ملخص بحثك باللغة الإنجليزية واحفظ مسودة وراجع جميع التفاصيل قبل التقديم. | أعدّ ملخصك باللغة الإنجليزية. احفظ مسودة وراجعها قبل التقديم. |
| Form AR DRAFT / notReady | هذه المساحة بانتظار إصدار قاعدة البيانات. لم يتم تسجيل خروجك. | تقديم الملخصات غير متاح بعد. ما زلت مسجّل الدخول. |
| Form AR DRAFT / windowClosed | فترة التقديم مغلقة أو لم تكتمل إعداداتها العلمية. | تقديم الملخصات مغلق حاليًا. |
| Form AR DRAFT / uploadGate | رفع الملفات غير متاح. يلزم اعتماد فحص الفيروسات وآلية الأدلة السرية قبل فتح التقديم النهائي. | رفع الملفات والتقديم النهائي غير متاحين بعد. |
| Form AR DRAFT / previewNote | راجع المعاينة الكاملة قبل استخدام فرصة التقديم الوحيدة. | راجع جميع التفاصيل قبل التقديم. |
| Form AR DRAFT / evidence_gate | التقديم النهائي متوقف لحين اعتماد آلية الأدلة السرية وفحص الفيروسات. حُفظت مسودتك. | التقديم النهائي غير متاح بعد. حُفظت مسودتك. |

### Recommended, not changed — owner decisions

- Decide whether the form's preparation sequence should be shorter on phones,
  particularly the repeated guidance and no-saved-drafts card when a blank editor
  is already open. The current rules-first arrangement and safeguards remain.
- Decide whether to shorten the long oral/poster and single-presenter paragraphs
  in a later content pass. They remain verbatim in this task.
- Obtain native Arabic review for the draft wording, including ethics guidance;
  do not treat this visual/technical review as translation approval.
- Reconcile the approved Terms with ORG-068 before release. Remove the temporary
  review surface before release under its existing removal gate. These are
  existing owner/release decisions, not changes made by abs3.

### Screenshots and visual review

Before and after captures use the same isolated development server at port 3236,
reduced motion and loaded local fonts. Both EN and AR were reviewed at 1440×1000
and 390×844, including the acknowledgement dialog and blank form through
`/abstracts/submit?review=1`. No hosted service or participant data was used.

`output/abs3/before/` and `output/abs3/after/` each contain 12 requested
full-page/public, viewport/dialog and full-page/form screenshots, plus 12 detail
captures (hero, journey, editor). Filenames are
`{en|ar}-{1440|390}-{public|dialog|form|hero|journey|editor}.png`.
There are 48 PNGs total, all ignored/untracked. Both form locales at both widths
have no document overflow. Capture scripts, JSON metadata, protected-copy proof,
wording extraction and raw check logs are also retained under output/abs3/.

### Validation

Node 24.21.0 / pnpm 11.19.0; every requested command was executed locally.

| Command | Observed result |
|---|---|
| `pnpm lint` | PASS — zero warnings; final recheck also passed |
| `pnpm typecheck` | PASS — route generation and TypeScript |
| `pnpm test` | PASS — 5,507 tests in 135 files |
| `pnpm build` | PASS — 140 generated pages; public EN/AR abstracts remain static, submission remains dynamic |
| `pnpm exec playwright test -c playwright.abstracts.config.ts` | PASS — 84 passed, zero skipped/failed/retries |
| `pnpm exec playwright test tests/e2e/participation-flow.spec.ts tests/e2e/private-csp.spec.ts tests/e2e/conference-experience.spec.ts tests/e2e/premium-interface.spec.ts` | PASS — 84 passed, six existing project skips, zero failed/retries |
| `pnpm exec playwright test -c playwright.contact.config.ts --project contact-desktop` | PASS — 42 passed, zero skipped/failed/retries |
| `node output/abs3/preservation.mjs` | PASS — 26 protected EN/AR entries match starting HEAD |
| `git diff --check` | PASS |

Browser total: 210 passed, six existing intentional project skips, zero failures
and no test retries. The six skips avoid repeating the desktop-driven
viewport/enlarged-text matrices in the mobile project. No port collision occurred.
The Windows runner again left its local servers alive after all test cases
completed. To complete teardown, only each suite's logged PIDs were stopped after
verifying their listening ports and all expected case results. The final suite
summaries and exit codes are all successful; cleanup evidence is retained in
output/abs3/*-server-cleanup.log. No other job's process was stopped.

All local fixtures are synthetic. Hosted database lint, pgTAP, integration and
concurrency execution, current CI, hosted preview/production, physical phones,
human screen-reader UAT and native Arabic approval are NOT TESTED in this UI
review. No hosted migration/configuration, participant workflow, real submission
or communication was activated. Next: owner/Claude reviews this local diff and
the before/after images, then handles the authorized commit and separate CI.
