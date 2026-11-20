# home1 — immersive mobile homepage, 4 November 2026

Owner direction: ORG-071. Implementation: ENG-093. Requirements: DSN-01/02,
ACC-01, LOC-01/03, MED-01/04, CFG-12. Worktree `C:/m/codex-home1`, existing
branch `claude/mobile-immersive-home`, starting HEAD
`13469ade8be45e77833abf3f02b52939146c605c`. Changes remain uncommitted.
The task's final common rule takes precedence over the earlier progress-index
request: `docs/PROGRESS.md` is untouched.

**Result:** homepage implementation and its automated acceptance checks pass.
The complete Chromium gate is **FAIL**: isolated verification still reproduces
four assertions in the unchanged Venue stepper tests. ENG-039 is untouched, as
required. The broader regression gate must not be described as green.

## Implemented

- Full mobile photo/colour chapter rhythm, giant headings, arrow orbs and the
  exact R1–R14 rendering removals. Content keys, metadata/JSON-LD lead and honesty
  qualifiers remain. The Step inside cue now targets `#participate`.
- Five native sticky pathway tiles, progressively enhanced with a named CSS
  view timeline. Toolbar compensation, keyboard-only focus raise, whole-tile
  links, static reduced-motion/short-screen modes and a 43-line content-fit gate.
- Unboxed mobile benefits, full-bleed artwork and venue, the purple speaker
  curtain at every width, natural community/closing photos and FAQ orbs.
- Existing desktop layout and track navigation, including the side-by-side venue
  copy and heading with its wide photo below. No desktop venue fallback needed.
- Decision records, [feature note](../features/mobile-immersive-home.md), updated
  existing regressions and new immersive-home browser/unit coverage.

## Commands and observed results

| Command / inspection | Observed result |
| --- | --- |
| `git status --short`; `git branch --show-current`; `git rev-parse HEAD` | PASS: initially clean; expected branch and base above. |
| Read `AGENTS.md`, PROJECT_BRIEF, DECISIONS, PROGRESS, DESIGN_GUIDE and relevant requirements/source/styles/tests | PASS: retained authority, native scroll, EN/AR, media and operational boundaries. |
| `git log --all --oneline -S ORG-071 -- docs/DECISIONS.md`; same for ENG-093 | PASS: no prior collisions across known local/remote-tracking refs. No fetch. |
| `node --version`; `pnpm --version` | PASS: v24.21.0 / 11.19.0; installed dependencies reused, no new dependencies. |
| `pnpm lint` | PASS, exit 0, including the final fixture changes. Generated report JavaScript was moved under ignored `.tools/` before linting. Final log: `.qa-lint-delivery.log`. |
| `pnpm typecheck` | PASS, exit 0, including the final fixture changes; Next route generation and TypeScript. Final log: `.qa-types-delivery.log`. |
| `pnpm test` | PASS, exit 0: 139 files / 5,643 tests; final implementation run 25.71s. |
| `pnpm exec vitest run tests/unit/immersive-home.test.ts tests/unit/approved-design-publication.test.ts` | PASS: 2 files / 13 tests. Gate tests use focused browser-boundary doubles because jsdom is absent and this task forbids new dependencies; Playwright exercises actual DOM geometry. |
| `pnpm build` | PASS, exit 0, production build. |
| `pnpm exec playwright test immersive-home.spec.ts chapter-titles.spec.ts homepage-polish.spec.ts design-media-interaction.spec.ts --project=chromium-mobile` (first build) | Initial result: 26 passed / 20 intentional project skips / 8 failed. Failures drove the fixes below; final rerun results follow. |
| `pnpm exec playwright test --project=chromium-desktop --project=chromium-tablet --project=chromium-mobile` | Initial complete run interrupted after two obsolete visible-text assertions included the new hidden 3MT accessible name. Bounds retained; visible text is checked independently. |
| Same complete Chromium command with `--workers=4` | Intermediate runs exposed the settled film-control drift and unbodied-row assertion described below, then unchanged Venue gesture/frame failures. They were interrupted for final fixes or the normal two-worker run; they are not green full-suite receipts. |
| `pnpm exec playwright test --project=chromium-desktop --project=chromium-tablet --project=chromium-mobile` (final sources, default two workers) | **FAIL**, exit 1: **896 passed / 175 intentional skips / 7 failed**, 21.7m, all 1,078 outcomes recorded. All 20 immersive acceptance cases and the homepage-specific regressions pass. Failure details and isolated results below. |
| `node scripts/build-content-e2e.ts` | PASS, exit 0, including a final rebuild after the film-control fix: published, empty and down synthetic-provider production builds. The script restored tracked TypeScript configuration afterward. |
| `pnpm exec playwright test -c playwright.content.config.ts` | First run: 59 passed / 1 artifact-close failure (missing trace), caused by the concurrent standard runner clearing the parent output directory. No assertion failed. |
| `pnpm exec playwright test -c playwright.content.config.ts --output=.tools/home-immersive/content-results` | **PASS**, exit 0: **60 passed**, 8.8m, including published SpeakerCard contrast on the purple surface. An intermediate two-worker run was stopped before the final source rebuild. |
| `pnpm exec playwright test -c .tools/home-immersive/playwright-target.config.ts immersive-home.spec.ts` | PASS: all 20 dedicated EN/AR immersive gates (1.5m), including pixel contrast, axe, whole-tile links, focus, fit gate and arrival timing. |
| Focused reflow run through the same temporary configuration | PASS: 2 EN/AR narrow/200% text tests (8.1s). |
| `pnpm exec playwright test -c .tools/home-immersive/playwright-focused.config.ts` | PASS: 40 tests (1.5m): all homepage-polish matrices, unchanged design-media-interaction desktop/mobile, six responsive journeys and two track reflow cases. |
| `pnpm exec playwright test -c .tools/home-immersive/playwright-followup.config.ts m2-components.spec.ts --project=chromium-desktop` | **PASS**, exit 0: **15 passed**, 18.4s, with native-close and scheduled-scroll completion boundaries. |
| Same follow-up configuration, `venue-journey-stepper.spec.ts --project=chromium-desktop` | **FAIL**, exit 1: **14 passed / 2 skipped / 4 failed**, 1.8m, one worker and no competing browser suites. Production stepper and its tests remain unchanged. |
| Same follow-up configuration, `conference-experience.spec.ts --project=chromium-mobile --grep "en public destinations render"` | **PASS**, exit 0: **1 passed**, 3.9s, fresh browser; the earlier resource-buffer error does not recur. |
| Built CSS scan across `.next/static/**/*.css` for `animation-timeline`, `exit-crossing`, `view-timeline-name`, `100lvh` | PASS: all four survive production minification. |
| `$env:HOME_REVIEW_URL='http://127.0.0.1:3211'; node .qa/home-immersive/capture.mjs`; final resume with `$env:HOME_CAPTURE_ONLY='desktop-ar,reduced-en,reduced-ar'` | PASS: 118 final viewport PNGs and complete metrics manifest. EN/AR 390×844 mobile, EN/AR 1440×900 desktop and EN/AR reduced-motion mobile; every section and deck mid-transition covered. Ignored helper later moved to `.tools/home-immersive/capture.mjs`. |
| `node .qa/home-immersive/contacts.mjs` | PASS: six contact sheets generated from the final capture manifest, all reviewed along with individual section/card images. Helper now in `.tools/home-immersive/`. |
| `git diff --check` | PASS, including final docs and fixture changes. |
| `git diff --quiet -- docs/PROGRESS.md src/content/ package.json pnpm-lock.yaml src/lib/journey-stepper.ts tests/e2e/venue-journey-stepper.spec.ts` | PASS, exit 0: all named files remain unchanged. Branch and HEAD still match the starting state; no commits or staging. |

The first typecheck/build encountered a newly added test's `Node.remove` typing;
the test now uses `parentNode?.removeChild`, and later typecheck/build pass.
PowerShell stderr redirection reported a nonzero wrapper result even when initial
Vitest/build output completed successfully; final commands used `cmd.exe` and
their successful exit codes were observed. The first Playwright run stalled
after all case outcomes during Windows server teardown; stopping only its
identified test-server process released the runner and produced the full summary.
No unrelated process was stopped.

The existing Venue suite writes four JPEGs directly into tracked
`.impeccable/review/venue-journey/` paths. Their test-generated versions were
preserved in `.tools/home-immersive/generated-venue-review/`, then the four
original binaries were restored byte-for-byte from the unchanged HEAD. The
review-artifact diff is empty; no incumbent review image is part of this change.

## Visual and regression fixes

- Strengthened focus-reset selectors to override the timeline selectors; a
  focused covered tile must be unscaled, undimmed and opaque.
- Removed the inherited accent underline's 1–2px overhang without changing
  desktop heading sizes; narrow-heading and long-word bounds remain intact.
- Added a responsive hero-layout minimum so flex bottom alignment has actual
  space. EN/AR h1 bottoms are about 432/454px at 390×844. With the retained
  countdown and visible cue, the whole hero naturally scrolls beyond the first
  viewport (about 1,094/1,119px), and the lower controls remain in normal flow.
- Strengthened the venue photo's middle scrim where the English kicker crosses
  a lighter part of the photograph. The initial 3.95:1 background sample required
  this change. The sampler also now excludes the status dot and decorative
  hairline foreground when measuring pixels behind text.
- Kept the explicit film Play/recovery button at viewport centre through hover
  and press. The inherited gold-button lift previously moved it by exactly 2px
  after its transition settled. The original media-interaction test is unchanged;
  hero films, posters, scrims and HeroScrollStage are unchanged.
- For benefit rows without bodies, the unchanged centred icon can be taller than
  its heading. Body-bottom-space assertions now apply to the three rows that
  retain paragraphs, while every row keeps the original ≤18px padding and
  ≥25.6px heading bounds. Visible-text range tests exclude only the intentionally
  hidden 3MT accessible-name span; visible 3MT remains checked.
- Split the existing 27-page responsive test into three independent width cases,
  preserving all nine routes, all assertions and screenshots, the 30-second
  default and zero retries. The former combined journey timed out under parallel
  load. The final six EN/AR cases all pass without a timeout increase.
- The showcase anchor fixture now waits for its scheduled scroll call before
  changing motion preference. Its dialog fixture waits for the actual native
  close event before reopening. Original smooth/instant, focus, dialog, axe and
  keyboard assertions remain. No production dialog change or retry is added.
- Independent rendered inspection: no transformed/positioned element between
  tile and link creates a smaller stretched-link containing block; sticky
  ancestors have visible overflow; Program and Speakers meet at exactly 0px.
- History height at 360/390/412px: EN 262/269/250px, AR 217/224/227px, below the
  unchanged 350px bound. Hero header-to-editorial clearance exceeds 16px at
  360×640. Date and city stay stacked; the cue label and 48px ring remain visible.
- The capped 1000px venue photo is mildly soft but acceptable at its approved
  height. Keep it. The existing closing source is naturally soft; retain
  `filter: none` and add no blur. No alternate media is introduced.
- All 118 captured viewports have zero horizontal overflow. Reduced-motion
  captures show static, unscaled cards. No additional visual defect remained in
  the six final contact sheets. Temporary QA scripts and generated reports live
  under ignored `.tools/` so generated JavaScript is not part of source lint.

## Limits and next handoff

The final full-run failures were three desktop showcase cases, three desktop
Venue stepper cases and one mobile conference/media journey. One showcase
navigation and the media journey reported `net::ERR_NO_BUFFER_SPACE`. The other
showcase cases exposed event-order races in their fixtures; the synchronization
fixes above pass the entire desktop showcase spec in isolation. The same fixture
changes also pass in the full mobile run.

The remaining reproducible blocker is Venue, for both EN and AR:

- `single slow notches and trackpad inertia each move one stop`: expected `city`,
  observed `arrival` after the trackpad burst.
- `a move eases continuously and the camera follows every frame`: expected more
  than 12 moving frames, observed 12.

These failures persist with one worker, so they are not claimed to be resolved
parallel-load flakes. Neither `src/lib/journey-stepper.ts` nor
`tests/e2e/venue-journey-stepper.spec.ts` changes in this worktree. The new styles
are scoped to `.homepage-journey`, which the Dates/Venue route does not render.
No baseline rebuild was used to establish when these failures originated.
Investigate this separate Venue/test-environment issue before claiming the full
repository regression gate passes; do not silently change ENG-039 in this slice.

Read-only saved-trace diagnostics, with no additional browser run:

- Frame traces: median rAF interval 50ms in both locales; mean about 55.8ms EN
  and 54.9ms AR (roughly 18 FPS). Both have 12 moving samples and 12 distinct
  moving-camera values. Saved in `.qa/home-immersive/venue-trace-metrics.json`.
  The host's observed cadence explains why the moving-frame-count gate is short.
- Trackpad traces: the 70 wheel API calls have median call-start gaps about
  63.2ms, maxima 188.5ms EN / 203.9ms AR, and 10 gaps over the stepper's 170ms
  quiet window in each locale. These are Playwright API call-start gaps, not
  measured DOM wheel-event delivery times; they suggest a fixture-timing issue
  without proving the production gesture cause. Saved in
  `.qa/home-immersive/venue-trackpad-trace-metrics.json`.

NOT TESTED: WebKit/iOS Safari sticky/lvh toolbar behaviour, Safari 26 scroll
timelines, real Android Chrome toolbar collapse, Firefox's no-timeline stack,
pre-hydration and no-JavaScript deck behaviour, physical devices and real
assistive technology. The documented pre-hydration/no-JavaScript fit gap remains.

No commit, push, branch creation, PR or Vercel deployment/preview was performed:
the binding task instruction leaves changes uncommitted for Claude. No hosted
database, operational flag, payment setting or participant communication changed.
The next handoff is Claude's review/commit and any separately authorized preview
and physical-browser checks.
