# Mobile homepage scrolling and design refinement

Date: 3 October 2026. Decision: ORG-011.
Requirements: SCP-01, DSN-01/02, ACC-01, LOC-01/03, CMS-04.

## Scope and starting evidence

The requester asked to improve Claude's mobile homepage navigation/design, especially
scrolling up and down, with creative freedom over presentation and headings. Latest
remote main c10b2c5 includes ORG-010, which removed the phone chapter bar and introduced
large centered, pinned word-by-word chapter titles. That is the implementation baseline.
The older original checkout has local documentation changes; all work uses the attached
managed worktree and preserves those changes.

At 390×844 with normal motion, a 72 px reverse scroll moved a settled programme title by
0 px. Its sticky stage and the other six stages continued to reserve their runways after
animation finished. With the refined copy, the baseline runways alone added 1,506 px.
This directly reproduces the reverse-scroll hold rather than inferring it from source.

## Change

- Animate each complete title lockup into its final position, preserving line breaks and
  language direction. Enlargement is bounded by the column width, up to 1.2×, and settles
  over 650 ms. Remove sticky pins, hidden title clones, individual word transforms, polling
  and all extra runway height. No text is hidden.
- Scroll quickly past a title or enter a fragment directly: use its natural layout.
  Scroll back: the heading moves with the document, without another hold. Record started
  titles so interrupted motion never replays after width/preference changes.
- Wait for fonts; observe natural heading-size changes for text zoom. Toolbar height-only
  changes do not reset title motion. Reduced motion, no JavaScript and wide screens keep
  static headings. Semantic h2 text provides one natural accessible name.
- Refine section titles: “Research connects us.”, “Choose your path.”,
  “Ideas take the stage.”, “Meet the speakers.”, “Inside MSRC 2026.”,
  “Further, together.” and “Before you arrive.”, with equivalent Arabic wording.
  Keep the hero headline and approved content claims.
- Dock the floating header after 48 px; undock below 8 px. This buffer avoids the old
  single-threshold oscillation. Measure the header card and preview banner, so menu height
  and phone anchor clearance follow actual text sizing. Refine menu spacing and control
  styling; keep keyboard focus, Escape and normal disclosure navigation.

Affected application files: chapter-titles.tsx, site-header.tsx, ui/section-heading.tsx,
the two homepage content files, chapter-titles.css and public-interface.css.
No package/lockfile change, migration, new data fields, backend integration or workflow
opening. Existing approved film/poster derivatives are unchanged.

## Verification

Initial checks: pnpm lint, pnpm typecheck, pnpm test (888/888) and pnpm build PASS.
Dev startup was verified with agent-browser: EN homepage meaningful content and expected
navigation rendered; no page error was reported. Playwright screenshots inspected for
English About/menu and Arabic programme; all seven stages measured as static in both
languages, with stage height equal to natural heading height, no page-width overflow and
unchanged page height after traversing all chapters.

Final application check: dot-source `scripts/use-local-node.ps1`, then `pnpm check`
under Node 24.21.0 PASS: zero lint warnings, type generation/type-check, 888 unit tests,
production build (40 pages). Initial exploratory commands used the system Node 25;
the supported Node 24 run is the final application evidence. Lockfile unchanged.

Production Chromium run:

```text
pnpm exec playwright test tests/e2e/chapter-titles.spec.ts
  tests/e2e/mobile-navigation.spec.ts tests/e2e/chapter-bar.spec.ts
  tests/e2e/qa-regressions.spec.ts tests/e2e/brand-motion.spec.ts
  tests/e2e/premium-interface.spec.ts tests/e2e/cinematic-film.spec.ts
  tests/e2e/public-shell.spec.ts
  --output=work/verification/mobile-homepage-polish/chromium-results
```

- 149 PASS, 29 intentional SKIP, 1 load/setup failure: `ERR_NO_BUFFER_SPACE` during
  the English direct-film preference case. No assertion failed. The isolated repeat
  of that exact case (`--project=chromium-desktop --workers=1 --repeat-each=3`) passed
  3/3. Do not call the broad run an uninterrupted green suite.
- An earlier run had 146 PASS/27 SKIP/2 teardown failures because a simultaneous agent
  test run shared Playwright's artifact directory. Separate output folders fixed that
  collision. Both failed cases passed in the subsequent production run.
- Every new mobile regression passed: seven chapters EN/AR, centered/clipped-text
  bounds, once-only settle, exact reverse-scroll movement, stable document/stage height,
  direct fragments, resize/motion interruptions, text-only 200% enlargement, header
  threshold reversals, menu hit targets/keyboard/Escape/focus, and 320×640 enlarged-menu
  bounds/final destination. Existing axe, native anchors/history/locale/film behavior,
  static no-JavaScript content, and closed-workflow boundaries were also exercised.
- Responsive screenshot matrix at 320, 375, 430, 768 and 1280 px, EN/AR: all ten
  layouts have document width equal to viewport width. Visually inspected EN 375 px
  participation, AR 320 px hero, EN 1280 px participation, plus EN About/menu and AR
  programme. No clipping or layout overlap observed in those inspected frames.

WebKit 26.6 desktop/iPhone-profile run under Node 24:

```text
pnpm exec playwright test --config=.tools/mobile-webkit.config.ts
  tests/e2e/chapter-titles.spec.ts tests/e2e/mobile-navigation.spec.ts
  tests/e2e/chapter-bar.spec.ts tests/e2e/qa-regressions.spec.ts
  tests/e2e/premium-interface.spec.ts
```

- 68 PASS, 18 intentional SKIP, 2 navigation-test failures: the test assumed a tap
  focused the button and Tab would focus the next link. An independent browser probe
  found Windows WebKit leaves body focused after tap, and skips links on Tab even after
  explicit button focus. The page's links are natively focusable and activatable.
- Corrected the test to retain Chromium's native Tab-order assertion and check explicit
  link focus plus Enter activation in Windows WebKit. No browser/system preference is
  forced and no app workaround changes native keyboard policy.
- Corrected iPhone navigation rerun: 6/6 PASS under Node 24, including EN/AR down/up
  menu operation, focus/Escape restoration, Enter navigation and 320 px/200% text.
  Command: the same WebKit config with only `mobile-navigation.spec.ts`,
  `--project=webkit-iphone` and a separate output folder.
- Final Chromium mobile run under Node 24: 18/18 PASS in 23 s for
  `chapter-titles.spec.ts` + `mobile-navigation.spec.ts`, with
  `--project=chromium-mobile --output=work/verification/mobile-homepage-polish/final-mobile-results`.
  Scoped ESLint on the corrected navigation test also PASS.
- All seven title journeys and the new interrupted-motion and 200% text checks passed
  in both languages on the iPhone profile. Static desktop behavior and existing native
  anchor/reveal/no-JavaScript/RTL checks passed.
- A first temporary WebKit config failed before starting tests because it inherited
  a relative cwd under `.tools`; corrected cwd to the project root.
  The local config extends the repository config with the Playwright `Desktop Safari`
  and `iPhone 13` devices, project-root webServer cwd and an isolated artifact directory.

## Limits and rollback

Physical iPhone/Android touch and actual Safari have NOT TESTED status until requester
review. Browser emulation does not establish physical-device performance or final brand
approval. No live deployment is part of this task; operational services stay closed.

Rollback: revert the presentation commit. There is no schema/configuration migration to
reverse. ORG-010's historical evidence remains intact for comparison.
