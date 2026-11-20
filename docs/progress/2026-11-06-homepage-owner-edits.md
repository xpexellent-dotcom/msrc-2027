# Homepage v2 owner edits round three

6 November 2026. Worktree C:/m/codex-home1. Starting branch claude/mobile-immersive-home and HEAD f871063. Changes are uncommitted.

## Delivery

| Item | Status | Observed implementation |
| --- | --- | --- |
| 1 Logo | DONE | Trimmed 192px transparent seal PNGs, unoptimized eager shared URLs, 40px physical size, live LTR Fraunces 600 wordmark and retained spoken home name. Both tones preload eagerly. |
| 2 Header | DEVIATED | Whole Option B bar, section-tone IntersectionObserver, sole 14px blur, solid fallbacks. Foreground and tint switch atomically because continuous interpolation produced an actual 4.35 contrast failure. Border and shadow retain 180ms transitions, disabled with reduced motion. |
| 3 Reserve | DONE | Shared hydrated disclosure in header, hero and closing. Native sign-in link without JavaScript. Existing signed-in profile action preserved. Phone menu has existing-label Sign up. |
| 4 Label | DONE | Only desktop/phone navigation uses Abstracts and الملخصات. |
| 5 Background controls | DONE | Removed visible background controls and copy. Finite videos retain final frame, pause offscreen, preserve posters/failure handling. Belt pauses on hover/touch/offscreen and remains static under reduced motion. User-started film retains controls. |
| 6 Month | DONE | April 2027 / أبريل ٢٠٢٧, null exact days, separate Riyadh April-start countdown target, no day-card/calendar links, calendar route 404, Event JSON-LD omitted. Protected legal wording and independent approved deadlines remain as detailed below. |
| 7 Paths | DONE | Five photos, individual phone/desktop focal positions, brand badges, opaque status pills and vignette. Hackathon source already cuts a standing person's head at its source boundary. No crop can restore that source area. |
| 8 Legacy | DONE | Full-width audience image and even purple scrim. Homepage container grows to 90rem at 1680px. Shared header/section/footer edges. |
| 9 Polish | DONE | Consistent badges, photo borders, radii, popover surfaces, phone spacing and small-screen wordmark fitting. Existing structure/copy/fonts retained. |

## Scope and source

Read AGENTS.md, docs/PROJECT_BRIEF.md, docs/DECISIONS.md, docs/PROGRESS.md, docs/DESIGN_GUIDE.md and relevant requirements/source. Inspected the three owner mockups first. Original seal sources and the high-resolution brand page were reviewed. Original tone-specific transparent seals were selected because their gold/white treatment matches the required dark/light bar tones. New derivatives are approximately 34.9KB and 30.9KB. No dependency added.

Node v24.21.0 and pnpm 11.19.0. The initial worktree contained incumbent untracked identity PNG/WebP assets and icons. They were preserved. Only ORG-073 and ENG-095 were appended. Their conflict log explicitly covers ENG-028 compaction, ENG-094's one-element iOS blur exception, AGENTS background controls and the superseded January conference days. The dedicated receipt overrides the ordinary progress-file update instruction.

The header's original 60px geometry is preserved. Interior pages start light over their existing ivory top clearance. A one-pixel observer band at the bar centre detects underlying dark/light sections without a scroll handler. The footer wordmark fits the existing 280px / 200% text case.

The month-only change also updates metadata, OG, FAQ, experiences, participation guidance, outbox rendering and the organizer workbook. Timed organizer imports are blocked until exact days exist. Historical workbook labels remain parseable without assigning dates. Generic all-day calendar/Event serialization keeps its synthetic test coverage.

## Verification

| Command | Result | Passed | Skipped | Failed | Flaky |
| --- | --- | ---: | ---: | ---: | ---: |
| `pnpm lint` | PASS | — | — | 0 | — |
| `pnpm typecheck` | PASS | — | — | 0 | — |
| `pnpm test` | PASS | 5660 in 144 files | — | 0 | — |
| `pnpm build` | PASS | — | — | 0 | — |
| `pnpm exec playwright test --config playwright.config.ts` | PASS | 922 | 170 | 0 | 0 |
| `pnpm exec playwright test --config playwright.home-preview.config.ts` | PASS | 16 | 0 | 0 | 0 |
| `pnpm exec playwright test --config playwright.content.config.ts` | PASS | 60 | 0 | 0 | 0 |
| `pnpm exec playwright test --config playwright.auth.config.ts` | PASS | 81 | 0 | 0 | 0 |
| `pnpm exec playwright test --config playwright.participant.config.ts` | PASS | 212 | 4 | 0 | 0 |
| `pnpm exec playwright test --config playwright.abstracts.config.ts` | PASS | 106 | 2 | 0 | 0 |
| `pnpm exec playwright test --config playwright.registration.config.ts` | PASS | 408 | 0 | 0 | 0 |
| `pnpm exec playwright test --config playwright.profile.config.ts` | PASS | 28 | 0 | 0 | 0 |
| `pnpm exec playwright test --config playwright.certificates.config.ts` | PASS | 24 | 0 | 0 | 0 |
| `pnpm exec playwright test --config playwright.competitions.config.ts` | PASS | 36 | 0 | 0 | 0 |
| `pnpm exec playwright test --config playwright.contact.config.ts` | PASS | 210 | 0 | 0 | 0 |
| `pnpm exec playwright test --config playwright.real-user.config.ts --project=chrome-chromium --project=android-chromium` | PASS | 145 | 5 | 0 | 0 |

Feature build commands

- PASS `node scripts/build-home-preview-e2e.ts`, exit 0, completed 2026-11-06T13:59:07.109Z.
- PASS `node scripts/build-content-e2e.ts`, exit 0, completed 2026-11-06T14:00:07.977Z.
- PASS `node scripts/build-home-preview-e2e.ts`, exit 0, completed 2026-11-06T15:01:55.240Z.
- PASS `node scripts/build-content-e2e.ts`, exit 0, completed 2026-11-06T15:02:53.980Z.

Final application/test source hash from the complete default run is 8dc0c290337920bec4491d90e064656e9412eb86fa036e6b97a1add92686a3cb. Core commands finished at 2026-11-06T14:44:49.538Z. Application and test source has stayed frozen since that build. Subsequent edits are receipt/evidence files only. Each completed browser run records its own source hash in runs.jsonl.

Suites ran one at a time. The ignored runner calls the installed Playwright CLI with the original config and list/JSON reporters, plus a completion-only reporter. Windows webServer teardown otherwise hangs on taskkill tree permission failures. After every test case finishes, the wrapper stops only listeners on that suite's known local ports, allowing Playwright to write its normal final report and exit. No test timeout, retry policy, assertion or config was weakened. A busy requested port waits three minutes before one retry.

Logs, JSON reports, source hashes and exact command equivalents are under .tools/home-v2/round3. Core logs are final-lint.log, final-typecheck.log, final-test.log and final-build.log. Feature builds have extra-builds.jsonl and pipeline-console-final.log. Browser reports use the suite name. Test artifacts are local synthetic/config-gated executions.

Earlier diagnostic execution is superseded. The first full default run had 868 passed, 170 skipped and 54 failed before owner-behavior retargeting and fixes. default-3 had 18 passed / 8 skipped and default-6 had 18 passed / 6 skipped before later source edits. The subsequent default-7 run had 915 passed, 170 skipped and seven failed. Six failures were stale one-photo / closing-pause assertions and one was Chromium ERR_NO_BUFFER_SPACE during navigation. Those owner-changed assertions were retargeted and the full default run repeated. The first home-preview run passed 16 tests before four later test-only edits. The first content run exposed synthetic date selectors that relied on the old exact-day mapping and was repeated after retargeting. Application source stayed unchanged through these test-only corrections. default-2, default-4 and default-5 were interrupted while correcting the implementation and are not completion evidence. Earlier core/capture/contrast runs preceded later edits. The current screenshots and contrast measurements were captured after the final application edit and before four later Playwright-only assertion/selector corrections. The final core run and all final matrix entries use the post-correction source. Only the final logs and current screenshots are acceptance evidence.

Physical iPhone reload/memory checks and deployed production gating are NOT TESTED. Real email delivery, hosted migrations and live workflow activation are outside this local task.

## Visual and contrast evidence

Ran `node .tools/home-v2/round3/capture.mjs`, `node .tools/home-v2/round3/contrast.mjs` and `node .tools/home-v2/round3/review-assets.mjs` against the final local production build on port 3293. Also ran node .tools/home-v2/round3/contrast-wide.mjs after the final browser suites, measuring 1,710 additional hero-header samples across all eight widths in both locales. Ran node .tools/home-v2/round3/contrast-white-frame.mjs as a separate synthetic full-white media stress check at all eight widths in both locales, retaining the actual hero scrims and header glass. Its 90 samples have a minimum 5.59:1 ratio. Actual video-frame sampling has a minimum 7.08:1. All contrast commands exited zero. Screenshots cover both locales at 320, 390, 430, 768, 1024, 1440, 1920 and 2560, plus 1680 checks, normal/reduced motion, forced colors and reduced transparency. Section crops temporarily hide the fixed header to inspect faces. Separate viewport/header states retain it. All image decoding finishes before capture.

The capture command produced 324 primary JPEG states, 16 five-photo crop sheets, plus layout/header review sheets and 2x/3x seal screenshots. All 16 homepage width/locale geometry records have zero horizontal overflow. The four reduced-transparency emulations report a solid rgb(31, 25, 48) header surface and no backdrop filter. The unsupported-backdrop fallback has source-level CSS checks. A browser without backdrop-filter support was NOT TESTED.

Visual review corrected the Hackathon badge and arrow that covered faces, the desktop/phone 3MT focal position, initial interior tone and small-screen footer overflow. The 3MT image uses an undistorted 250% physical-left-anchored frame with 35% phone and 40% desktop vertical focus. The Hackathon source boundary limitation remains disclosed above. The supplied people photos themselves are unchanged.

Start with [phone hero](../../.tools/home-v2/round3/en-390-hero.jpg), [phone paths](../../.tools/home-v2/round3/en-390-paths.jpg), [Arabic paths](../../.tools/home-v2/round3/ar-390-paths.jpg), [desktop paths](../../.tools/home-v2/round3/en-1440-paths.jpg), [wide Legacy](../../.tools/home-v2/round3/en-2560-legacy.jpg), [seat choices](../../.tools/home-v2/round3/en-390-popover.jpg) and [Arabic menu](../../.tools/home-v2/round3/ar-390-menu.jpg). [Full screenshot index](../../.tools/home-v2/round3/INDEX.md).

Contrast samples use WCAG sRGB relative luminance across 2,946 rendered samples. Glyph painting is hidden while retaining actual rendered backgrounds and foreground alpha. Samples cover every card's text bounds at all seven required card widths in both locales, each second of the hero video through its full duration at all eight requested widths in both locales, light sections, Legacy/closing, and initial/scrolled headers on all seven requested interior routes. Rounded-pill border areas and decorative icon outlines are excluded. The site CSP nonce is reused for measurement styles. CSP remains enforced.

| Rendered area | Minimum ratio |
| --- | ---: |
| card .pathway-name | 6.98:1 |
| card .pathway-kicker | 8.88:1 |
| card .path-tile-description | 10.07:1 |
| card .status-badge | 12.20:1 |
| header-dark-frame | 7.08:1 |
| header-light | 11.36:1 |
| header-legacy | 5.24:1 |
| header-closing | 5.88:1 |
| interior-participate | 12.28:1 |
| interior-participate-scrolled | 7.66:1 |
| interior-abstracts | 12.28:1 |
| interior-abstracts-scrolled | 8.29:1 |
| interior-team | 12.28:1 |
| interior-team-scrolled | 7.33:1 |
| interior-sponsors | 12.28:1 |
| interior-sponsors-scrolled | 12.28:1 |
| interior-contact | 12.28:1 |
| interior-contact-scrolled | 6.30:1 |
| interior-dates-venue | 12.28:1 |
| interior-dates-venue-scrolled | 6.79:1 |
| interior-sign-in | 12.28:1 |
| interior-sign-in-scrolled | 10.86:1 |
| header-white-frame-bound | 5.59:1 |

The continuous color interpolation experiment produced an actual axe finding of 4.35:1. Foreground and tint now switch together, keeping the original axe assertion intact. The default catalogue hydration test and Venue stepper assertions were not retargeted. The iOS CSS budget permits exactly .axiom-header .header-glass with standard/prefixed 14px declarations and forbids every other positive backdrop-filter declaration.

## January text intentionally preserved

src/content/policies.ts is byte-for-byte unchanged across all approved and historical versions. Exact event-date sentences follow. Repeated occurrences across policy versions are deduplicated here.

> This Privacy Policy explains how personal information is collected, used, shared and protected for the 5th Medical Students Research Conference (MSRC 2027), held at King Faisal Conference Center, King Abdulaziz University, Jeddah, on 27–28 January 2027.

> توضح سياسة الخصوصية هذه كيفية جمع البيانات الشخصية واستخدامها ومشاركتها وحمايتها لأغراض المؤتمر الخامس لأبحاث طلاب الطب (MSRC ٢٠٢٧)، الذي يُعقد في مركز الملك فيصل للمؤتمرات بجامعة الملك عبدالعزيز في جدة، يومي ٢٧–٢٨ يناير ٢٠٢٧.

> These Terms and Conditions apply to the website www.msrc2027.com and to participation in the 5th Medical Students Research Conference (MSRC 2027), held at King Faisal Conference Center, King Abdulaziz University, Jeddah, on 27–28 January 2027.

> تسري هذه الشروط والأحكام على الموقع www.msrc2027.com وعلى المشاركة في المؤتمر الخامس لأبحاث طلاب الطب (MSRC ٢٠٢٧)، الذي يُعقد في مركز الملك فيصل للمؤتمرات بجامعة الملك عبدالعزيز في جدة، يومي ٢٧–٢٨ يناير ٢٠٢٧.

Exact January retention entries are also preserved

> Deleted one year after the conference (by 28 January 2028)

> Two years from the conference date (until 28 January 2029), so certificates can be verified

> تُحذف بعد سنة واحدة من المؤتمر (بحلول ٢٨ يناير ٢٠٢٨)

> سنتان من تاريخ المؤتمر (حتى ٢٨ يناير ٢٠٢٩)، لإتاحة التحقق من الشهادات

The active and historical legal policies need organizer/legal reconciliation with April. Their dates were not treated as plain display copy.

The separate ORG-057 registration closing announcement remains 26 January 2027 at 23:59 Asia/Riyadh. Approved abstract roadmap milestones remain 2, 7 and 10 January 2027. These are independent deadlines, so no replacements were invented. Locale month-formatting tables, synthetic test deadlines and historical workbook aliases retain January where appropriate. The staff/certificate authorization and retention logic is unchanged. The staff email-preview sample retains its synthetic 24 January 2027 confirmation deadline, displayed as Confirmation deadline: 24 January 2027 at 20:00 (Asia/Riyadh).

## Test retargeting inventory

Each existing modified test/fixture is listed below with its owner-change reason and touched old/current titles. A replaced title represents retargeted behavior within the same file. Removed assertion groups concern compact header behavior, exact-day calendar/day links, background pause controls or icon-only cards. Independent keyboard, permissions, failure, offline, CSP, filter and journey-stepper assertions remain.


### tests/content-e2e/program-schedule.spec.ts

With null conference days, the published synthetic 27 January session keeps its authored ISO day instead of mapping to day1. Native GET-filter navigation uses that fixture day. All URL, result-count, category and room assertions remain.

- Retargeted or retained title `${locale}: native schedule links and GET filters work without JavaScript`

### tests/content-e2e/published-content.spec.ts

The published synthetic session retains its authored ISO date with null conference days. Select its actual fixture date instead of the removed day1 mapping. Speaker, session detail, media, permission and axe assertions remain.

- Retargeted or retained title `${locale}: public collection fallback or published programme and speakers`

### tests/e2e/axiom-city.spec.ts

Closing background has finite playback and no pause UI. Closing reserve opens account choices. Header no longer compacts.

- Replaced former title `${locale} Jeddah video loads only on approach and supports real keyboard playback`
- Retargeted or retained title `${preference.name} keeps the Jeddah poster without a video request`
- Retargeted or retained title `"missing IntersectionObserver leaves a readable Jeddah poster without a runtime error"`
- Retargeted or retained title `${locale} Jeddah video loads in view, pauses off-screen and rests after one play`

### tests/e2e/axiom-navigation.spec.ts

Owner replaced compact-on-scroll navigation with the whole tone-aware bar and replaced the signed-out action link with a disclosure. Pointer, keyboard, dropdown and native scrolling checks remain.

- Replaced former title `${locale} seamless desktop header returns on upward scroll and keyboard focus, never pointer approach`
- Retargeted or retained title `${locale} keyboard-expanded navigation keeps its target when switching to a pointer click`
- Retargeted or retained title `${locale} Participate navigation revealed by upward scroll stays open through the gap and every option`
- Retargeted or retained title `${locale} navigation lists all five paths and the closed registration destination`
- Retargeted or retained title `${locale} whole desktop glass bar changes tone and keeps keyboard access while scrolling`

### tests/e2e/brand-motion.spec.ts

Signed-out desktop reserve is a disclosure after hydration, while the phone menu remains a native sign-in link.

- Retargeted or retained title `${locale} an anchor followed by a page visit retains the hash and query on Back`

### tests/e2e/cinematic-film.spec.ts

Background pause preference no longer exists. The deliberate film keeps its controls and returns to finite background playback.

- Replaced former title `"cinema respects the visitor's paused background state after a deliberate viewing"`
- Retargeted or retained title `"cinema retains its controls and returns to finite background playback"`

### tests/e2e/conference-experience.spec.ts

Calendar downloads disappear while exact conference days are unset.

- Retargeted or retained title `${locale} public destinations render without participant writes or invented published records`

### tests/e2e/countdown.spec.ts

Countdown targets Riyadh midnight at the start of April. Zero settles to month text without invented Day 1/Day 2 claims. No-JS, clock rollover, visibility, timer semantics and layout remain checked.

- Retargeted or retained title `${locale} homepage clock counts to the Riyadh date boundary and remains read-only`
- Retargeted or retained title `${locale} clock refreshes after tab suspension and keeps complete values`
- Replaced former title `${locale} confirmed dates remain readable without JavaScript`
- Retargeted or retained title `${locale} month announcement remains readable without JavaScript`

### tests/e2e/dates-venue.spec.ts

Month replaces exact days. Program date links are absent and the calendar endpoint returns 404. Reserve is a disclosure.

- Replaced former title `${locale} venue introduces four views and Program date links select the corresponding conference day`
- Retargeted or retained title `${locale} Venue shows its gallery and practical information with pending times and accessible layout`
- Replaced former title `${locale} Add to calendar downloads one all-day event for the confirmed days`
- Retargeted or retained title `${locale} venue introduces four views and Program keeps exact days unset`
- Retargeted or retained title `${locale} calendar stays unavailable while exact days are unset`

### tests/e2e/design-media-interaction.spec.ts

Empty background space has no pause overlay. Reserve opens the sign-in/sign-up choices.

- Replaced former title `${locale} empty hero space pauses the film while copy and links stay usable`
- Retargeted or retained title `${locale} empty hero space keeps finite motion while copy and seat choices stay usable`

### tests/e2e/design-motion-refinement.spec.ts

Desktop reserve uses disclosure keyboard order. Phone menu remains a link. Existing focus and motion assertions are retained.

- Retargeted or retained title `${locale} keyboard anchors and routes keep focus and history without arrival motion`

### tests/e2e/design-system.spec.ts

Synthetic background follows finite playback, reduced motion and poster/error fallbacks with no background pause button. Header reserve uses the disclosure.

- Retargeted or retained title `"disabled and loading demonstrations cannot trigger operations"`
- Replaced former title `"synthetic video controls pause, resume and fall back after an asset failure"`
- Retargeted or retained title `"synthetic background video respects preferences and falls back after an asset failure"`

### tests/e2e/helpers/header-navigation.ts

Shared public-navigation helper checks the always-visible whole desktop bar instead of triggering removed compaction. tests/helpers/header.ts is unchanged.

Shared helper, setup, fixture or parameter changes apply to its callers.

### tests/e2e/home-v2.spec.ts

Five photographic tiles replace icon-only assumptions, backgrounds lose pause controls, and wide shared edges now expand at 1680. Title matrix extends through 2560.

- Replaced former title `${locale} v2 title is exactly two lines from 320 to 1920 and its gradient crosses both`
- Retargeted or retained title `${locale} v2 header, title, actions, chapters and footer share the content edge`
- Retargeted or retained title `${locale} v2 bento has one named route per tile and reflows with enlarged text`
- Replaced former title `${locale} v2 public controls are rounded rectangles and official logos sit on purple`
- Retargeted or retained title `${locale} v2 iOS materials, image sizes and phone positioning stay within budget`
- Retargeted or retained title `${locale} review fixes keep phone rails, footer and dark focus readable`
- Retargeted or retained title `${locale} v2 title is exactly two lines from 320 to 2560 and its gradient crosses both`
- Retargeted or retained title `${locale} v2 public controls are rounded rectangles with shared seals and glass navigation`

### tests/e2e/homepage-polish.spec.ts

Month announcement and finite backgrounds replace exact-day and pause-control assumptions.

- Retargeted or retained title `${locale} homepage ${viewport.width} ${motion}: compact cards, one-item rail and film controls`

### tests/e2e/mobile-navigation.spec.ts

Navigation-only Abstracts label and removed compact state replace the former assertions. Keyboard, menu geometry and focus checks remain.

- Retargeted or retained title `${locale} mobile header stays settled during small scroll reversals`

### tests/e2e/participant-journey.spec.ts

Navigation helper expects Abstracts in EN and the existing Arabic abstracts term. Page and pathway titles keep their names.

- Retargeted or retained title `${locale} ${width}px ${route || "home"} participant entry at normal and 200% text`

### tests/e2e/participation-flow.spec.ts

Reserve opens existing account routes and navigation uses Abstracts. Participation content and closed actions retain their checks.

- Retargeted or retained title `${locale} reserve actions lead to sign in and abstract naming is consistent`

### tests/e2e/premium-interface.spec.ts

Five photographic paths replace the old one-photo assertion. Whole bar replaces compact geometry and the closing reserve link upgrades to the shared disclosure.

- Retargeted or retained title `${locale} cinematic homepage has a hero countdown, floating navigation and decorative photographs`
- Retargeted or retained title `"the opening headline and navigation appear while footage is still loading"`

### tests/e2e/private-csp.spec.ts

CSP check exercises the new reserve disclosure and existing sign-in destination instead of the removed direct participate action.

- Retargeted or retained title `${locale} public documents keep their baseline policy across static and published content routes`

### tests/e2e/program-card.spec.ts

Four locale/motion journeys through exact-day links are replaced by four month/no-invented-destination cases. Exact days are null. Existing independent program filter tests remain.

- Replaced former title `${locale} programme date card scrolls, focuses and preserves the selected day (${reducedMotion})`
- Retargeted or retained title `${locale} programme month card has no invented day destinations (${reducedMotion})`

### tests/e2e/public-media.spec.ts

Removed background pause/Play targets and persistent manual pause state are replaced by finite final-frame retention, offscreen/tab pause, preference and poster/autoplay-denial checks. User-started film playback remains checked.

- Replaced former title `${locale} public film selects one responsive source and keyboard pause freezes its frame`
- Replaced former title `"public film pauses when hidden, resumes when visible, and preserves an explicit pause"`
- Replaced former title `${locale} browser autoplay denial keeps a manual Play control and recovers without an asset failure`
- Retargeted or retained title `${locale} background film selects one responsive source and rests on its final frame`
- Retargeted or retained title `"finite background film pauses when hidden and resumes before completion"`
- Retargeted or retained title `${locale} background autoplay denial keeps the poster and allows deliberate film viewing`

### tests/e2e/public-shell.spec.ts

Header signed-out reserve now exposes account choices. Existing link destinations remain checked.

- Retargeted or retained title `${locale} homepage is readable without opening a workflow`

### tests/e2e/qa-regressions.spec.ts

New reserve disclosure replaces direct navigation. Countdown expectation uses the month announcement.

- Retargeted or retained title `"a portrait phone keeps the header in view while reading down"`

### tests/e2e/real-user-lifecycle.spec.ts

Background pause controls have been removed. Offline, rotation, BFCache, visibility and reduced-motion coverage remain.

- Retargeted or retained title `${locale} countdown updates after time passes and a suspended tab returns`

### tests/e2e/real-user-links.spec.ts

Reserve route behavior and navigation-only Abstracts label reflect owner changes.

- Retargeted or retained title `"sitemap destinations, internal links, previews, icons and calendar have usable responses"`

### tests/e2e/real-user-media.spec.ts

Manual background pause no longer exists. Rotation, offline/visibility recovery and reduced-motion coverage use finite playback and assert no pause controls.

- Replaced former title `${locale} film preserves explicit pause through rotation, offline recovery and visibility changes`
- Retargeted or retained title `${locale} background film preserves recovery through rotation, offline and visibility changes`

### tests/home-preview-e2e/home-preview.spec.ts

Illustrative belt no longer has a visible pause control. Tests assert hover/touch/offscreen pauses, reduced motion and the next keyboard target.

- Replaced former title `${locale} preview belt is illustrative, controllable and paused off-screen`
- Retargeted or retained title `${locale} preview social placeholders are visible and add no keyboard stop`
- Retargeted or retained title `${locale} preview belt is illustrative and pauses on hover, touch and off-screen`

### tests/participant-e2e/participant-accounts.spec.ts

Signed-out desktop action opens the shared account choices before sign-in. Signed-in profile/picture/initials assertions and phone-menu access remain.

- Retargeted or retained title `${locale} header action opens sign in, which offers sign up, and becomes My profile once signed in`

### tests/registration-e2e/participant-entry.spec.ts

Registration entry now uses the actual Attend pathway because the hero reserve opens account choices. Account/verification/registration permission assertions remain.

- Retargeted or retained title `${locale} first visitor reaches registration after creating and verifying an account`

### tests/staff-e2e/fixtures/email-previews.json

Only conference-date display in preview bodies changes to April. Independent synthetic offer/confirmation deadlines remain.

### tests/unit/__snapshots__/registration-emails.test.ts.snap

Expected EN/AR conference-date display changes to April. Other email copy and delivery/recipient gates remain.

### tests/unit/calendar.test.ts

Existing all-day serialization tests use explicitly synthetic confirmed-date config. Actual null-date behavior has separate new coverage.

Shared helper, setup, fixture or parameter changes apply to its callers.

### tests/unit/conference-dates.test.ts

Countdown component tests pass the new separate countdown target. Generic historical date helpers retain their fixtures and assertions.

- Retargeted or retained title `"renders useful static dates rather than freezing a live count into cached HTML"`
- Retargeted or retained title `"preserves the server-provided date text despite different browser ICU range spacing"`

### tests/unit/content-intake.test.ts

Workbook day choices become generic Day 1/Day 2. Timed synthetic parsing explicitly injects fixture dates. New coverage rejects invented instants with actual null dates.

- Retargeted or retained title `"adds Approved/Draft and conference-day dropdowns and whole-number seat validation"`
- Retargeted or retained title `"keeps optional fields null and a speaker without a photo valid"`
- Retargeted or retained title `"reports missing required fields, invalid choices and malformed IDs in plain language and blocks the row"`
- Retargeted or retained title `"blocks invented session instants while conference days are unset"`

### tests/unit/design-contracts.test.ts

Logo asset contract points to the new trimmed shared seal derivative.

- Retargeted or retained title `"retains every required bilingual public destination without inventing assets"`

### tests/unit/fixtures/registration-email-english.json

Only conference-date display changes to April. The synthetic 24 January confirmation deadline remains.

### tests/unit/foundation.test.ts

Actual config contract now requires null dates, localized April labels and a separate countdown target.

- Retargeted or retained title `"records calendar days and the venue while keeping prices, capacities, and regions unset"`

### tests/unit/home-v2-css.test.ts

ENG-094 backdrop budget becomes exactly one permitted selector at 14px. All other positive backdrop declarations remain forbidden.

- Retargeted or retained title `"allows exactly the header glass to blur, with no other site backdrop blur (ENG-095)"`

### tests/unit/page-descriptions.test.ts

Approved month announcement replaces the superseded exact-day description.

- Retargeted or retained title `"prefixes the confirmed dates, venue and Jeddah in each language"`

### tests/unit/registration-emails.test.ts

Rendered conference-date line uses the month. Recipient, lifecycle, immutable-payload and escaping assertions are preserved.

- Retargeted or retained title `"renders complete English and Arabic with the banner for %s"`

### tests/unit/structured-data.test.ts

Existing exact Event serialization tests use explicit synthetic dates. New actual-config test requires Event omission while days are unset.

Shared helper, setup, fixture or parameter changes apply to its callers.


### New regression coverage

- tests/e2e/home-owner-round3.spec.ts covers EN/AR reserve choices, bounds, 44px targets, focus return, Escape/outside close, layout stability, no-JS native links and forced-colors.
- tests/unit/home-owner-round3.test.ts covers actual null-date calendar/Event omission plus the separate countdown target before, at and after zero.

## Final integrity

PASS. Branch remains claude/mobile-immersive-home, HEAD f871063e4b4e759bd2e8e2109625151e58d48ae0. Every final browser suite has the same application/test source hash 8dc0c290337920bec4491d90e064656e9412eb86fa036e6b97a1add92686a3cb. All twelve final configurations exited zero, with zero failed or flaky cases. docs/PROGRESS.md, src/lib/journey-stepper.ts, src/content/policies.ts, tests/helpers/header.ts, the unchanged catalogue hydration/stepper specs and pnpm-lock.yaml match HEAD bytes. The prior decisions bytes are preserved and only ORG-073 / ENG-095 headings are appended. No identity asset is deleted. git diff --check passes.

The mandated command git checkout -- .impeccable/review/venue-journey/ was attempted and returned BLOCKED because the linked worktree index.lock is outside the writable root and permission was denied. The four overwritten JPGs were restored with exact binary git show HEAD:path blobs, using fs.writeFileSync without touching the Git index. All four hashes match HEAD and git diff for that directory is empty. The source file and stepper tests remain unchanged. Evidence is in final-audit.log and final-integrity.json.

The final source hash and protected-file results were checked after all suites completed. Work remains uncommitted. Incumbent untracked identity files are preserved. Local test providers used synthetic records. No hosted resources, deployment, workflow flags or real communications were changed.

## Remaining owner checks

- Recheck the header blur and reload/memory behavior on a physical iPhone.
- Reconcile the preserved January legal event/retention wording and independent approved deadlines.
- Review the final crop sheets, including the Hackathon source boundary limitation.

The moving illustrative belt retains the explicit owner-directed WCAG 2.2.2 trade-off in ORG-073. Hosted release gates remain separate from this local front-end evidence.

## Planner review follow-up (6 November 2026)

Screenshot review found the path tiles inconsistent: Attend's badge floated mid-photo with two arrows, Hackathon's badge and arrow sat in different corners, and Attend shared Research's icon. All tiles now use one layout: brand badge at the top inline-end, arrow at the bottom inline-end (Attend keeps only its "Explore this pathway" arrow, and the small-tile arrows are hidden under 360px so they cannot touch the status pill). Attend uses `13-collaboration`.

Rerun on final source: `pnpm build` PASS; `pnpm lint` PASS; `pnpm typecheck` PASS; `pnpm test` PASS, 5,660; `pnpm exec playwright test` PASS, 922 passed / 170 skipped / 0 failed. Tile captures reviewed at EN 320/390/1440 and AR 320. The other suites ran before this CSS and icon-only change and were not rerun.

## Reserve pop-up (6 November 2026)

This follow-up supersedes the earlier Reserve disclosure receipts. Starting branch:
claude/mobile-immersive-home, HEAD c25191b528889c5749408a0946dda17a9f4cde4c.
The stopped run left a native-dialog implementation and test edits uncommitted;
those relevant edits were retained and corrected for the latest owner clarification.
Incumbent untracked identity exports were preserved.

ORG-073 and ENG-095 are amended in place. Only navigation Reserve actions open the
shared native showModal() dialog: desktop header or phone menu, with the menu
removed synchronously first. Hero and closing actions are ordinary localized
Participate links. Existing headerAction and ENG-085/086 signed-in profile behavior
remain unchanged. The dialog reuses brand-identity's seal, participantCopy's
newHereBody/signIn/signUp and existing bilingual title/close labels. Gold and
outlined choices have equal widths and 56px minimum heights. Close is 44px.

Native modality contains focus and handles Escape; initial focus goes to Sign in.
Close, Escape and outside-rectangle backdrop clicks restore desktop trigger focus
or the surviving phone menu toggle. There is no blur dismissal, scroll handler,
body scroll lock, added dependency or backdrop blur. The page scrollbar is retained.
Logical close positioning, mirrored shared arrows, 16px gutters, short-viewport
internal overflow, a gentle 180ms open animation, reduced-motion and forced-colors
fallbacks cover LOC-01, ACC-01 and DSN-02; AUTH-01 workflow flags remain closed.
Old reserve-seat-panel markup/CSS and the redundant phone sign-up link are removed.

Retargeted tests (only affected selectors, roles and destinations):

| Files under tests/e2e unless stated | Change |
| --- | --- |
| axiom-navigation, dates-venue, premium-interface, public-shell | Header dialog semantics; updated hero link selectors; phone button focus and dialog choice activation. |
| brand-motion, design-motion-refinement, design-system, participation-flow, private-csp | Follow navigation trigger into the native dialog, then activate Sign in. Preserve navigation/focus/CSP checks. |
| axiom-city, design-media-interaction, participant-journey, participation-flow, home-v2 | Hero/closing use Participate links; retain media, bounds, reading and pathway assertions. |
| mobile-menu-panel, mobile-navigation, conference-experience | Phone Reserve is the first button/focus target; menu closes before the dialog opens. |
| home-owner-round3 | EN/AR header and phone opening, both destinations, native modality and focus containment, Escape/close/backdrop plus focus return, stable wordmark bounds, 320/390/1024/1440 and 667x320 landscape, 44px targets, no-JS header fallback, forced colors, reduced motion and axe while open. Captures are written once by the desktop project to avoid concurrent overwrites. |
| tests/participant-e2e/participant-accounts | Signed-out navigation enters the dialog; existing synthetic sign-in, My profile, initials/avatar assertions retained. |

Initial investigation: an interrupted default run exposed the old first-link
keyboard assertion in conference-experience. The analogous public-shell and
mobile-navigation expectations were corrected without relaxing focus assertions.
The targeted home-owner-round3 run completed all 16 cases successfully. Windows
server cleanup needed an explicit stop of its own loopback Next process after
all cases finished. The final matrix below is rerun sequentially on final source.

Screenshot evidence is in .tools/home-v2/round4/. No commit, push, branch,
deployment, hosted setting, live email, workflow activation, docs/PROGRESS.md edit
or journey-stepper.ts edit is authorized or performed.

Intermediate verification findings: two interrupted default runs exposed stale
first-link focus assumptions (including the 200% participant journey). Those
assertions now target the Reserve button and keep the original focus/bounds
requirements. Lint also caught a syntax error in a test edit; it was corrected
before the final full matrix. No retries or assertion timeouts were added.

The first final-source real-user run with its configured two workers reported
144 passed / 5 skipped / 1 failed. The failure was page.goto before document load,
net::ERR_NO_BUFFER_SPACE, on Android EN /program in the pre-hydration navigation
case (real-user-navigation.spec.ts:91). The same case passed in AR. Its original
log and copied trace remain in .tools/home-v2/round4/real-user.log and
.tools/home-v2/round4/real-user-initial-failure-trace.zip. An unchanged-source full serial rerun uses --workers=1 to reduce local
socket pressure; its result is recorded below. No application or test source is
changed for this environmental rerun.

### Final-source verification matrix

Commands ran one suite at a time, with zero configured retries. Logs are under
.tools/home-v2/round4/; results.json records exact exit codes and elapsed seconds.

| Command | Result | Observed evidence |
| --- | --- | --- |
| `pnpm lint` | PASS | clean; 42s |
| `pnpm typecheck` | PASS | clean; 5s |
| `pnpm test` | PASS | 5,660 passed; 24s |
| `pnpm build` | PASS | production build completed; 12s |
| `pnpm exec playwright test` | PASS | 926 passed / 170 skipped; 1164s |
| `pnpm exec playwright test --config playwright.participant.config.ts` | PASS | 212 passed / 4 skipped; 611s |
| `pnpm exec playwright test --config playwright.auth.config.ts` | PASS | 81 passed; 64s |
| `pnpm exec playwright test --config playwright.contact.config.ts --project contact-safari` | PASS | 42 passed; 238s |
| `node scripts/build-home-preview-e2e.ts` | PASS | isolated build completed; 14s |
| `pnpm exec playwright test --config playwright.home-preview.config.ts` | PASS | 16 passed; 29s |
| `pnpm exec playwright test --config playwright.real-user.config.ts --project chrome-chromium --project android-chromium` | FAIL (see explanation) | 144 passed / 5 skipped / 1 ERR_NO_BUFFER_SPACE before page load; 209s |
| `pnpm exec playwright test --config playwright.real-user.config.ts --project chrome-chromium --project android-chromium --workers=1` | PASS | 145 passed / 5 skipped; 388s |
| `pnpm exec playwright test --config .tools/home-v2/round4/dialog-webkit.config.ts` | FAIL (see explanation) | temporary launcher cwd error before tests; 1s |
| `pnpm exec playwright test --config .tools/home-v2/round4/dialog-webkit.config.ts` | PASS | 8 passed; both links, EN/AR, desktop/iPhone emulation, Escape and focus return; 31s |

The optional WebKit launcher initially resolved node_modules relative to its
.tools directory and failed before tests. Its temporary config now explicitly
uses the workspace cwd; the corrected run passes all eight cases. This modifies
no tracked configuration. Its first log is preserved as
dialog-webkit-launcher-failure.log.

Local Windows Playwright server-tree cleanup did not terminate the loopback Next
servers on its own. The local cleanup helper waited until every test result was
received, then stopped only that suite's own loopback server PIDs. Each passing
suite exited zero. Commands, PIDs and result totals are preserved in
local-server-cleanup.log. Test retries, timeouts, assertions and tracked runners
were not changed for this environment workaround.

### Screenshots and visual review

PASS for settled layout review. Final canonical PNGs are
{en,ar}-reserve-{320,390,1024,1440}-{motion,reduce}.png in .tools/home-v2/round4/.
Each phone capture opens through the phone menu; 1024 and 1440 open through the
header. Phone height is 844px, desktop height 900px. Additional 667x320 landscape
captures include a -choices image after native internal scrolling reaches both
links. The final eight normal-preference width/locale captures and reduced-motion
390/1440 captures were opened and visually reviewed. Seal, text, choice separation,
mirrored arrows, close position and viewport bounds are readable and contained.

Commands: node .tools/home-v2/round4/capture.mjs; node
.tools/home-v2/round4/capture-webkit.mjs; node
.tools/home-v2/round4/capture-settled.mjs. All completed with exit zero.
The final canonical files use Chromium and Playwright animations: disabled for
stable, settled layout snapshots; they do not prove hardware motion performance.
Their geometry, locale, motion preference and trigger are recorded in
capture-evidence-settled.json. Earlier engine samples are retained in
chromium-captures/ and webkit-captures/.

Visual limitation: unfrozen motion captures intermittently omitted painted
layers, particularly the seal and parts of button surfaces in wider Arabic
views. This also occurred in a WebKit capture. Native DOM hit testing, visibility,
bounds and scroll offsets stayed correct, and unchanged fresh captures could
render correctly. Runtime-only probes compared animation endpoints, disabled
animation, overflow, header blur and paused video without isolating a reliable
CSS cause. These probes made no source changes. paint-debug.json,
paint-variants.json and ar-paint/variant PNGs retain this evidence. An optional
full-Chromium-channel launch probe was BLOCKED by spawn UNKNOWN in this runtime.
Do not describe this as confirmed fixed on physical devices. Physical iPhone
motion, reload/memory behavior and assistive-technology testing remain NOT TESTED;
these are the next manual review items. Static screenshots pass; they do not
close this hardware check.

### Final integrity

PASS: node .tools/home-v2/round4/final-integrity.mjs; git diff --check.
Branch remains claude/mobile-immersive-home; HEAD remains
c25191b528889c5749408a0946dda17a9f4cde4c. Application/test source hash is
aac383c942472c8a442717790e6882d689dcd3272c75cc33d75838de91bec6d3,
unchanged across the final verification and diagnostics. docs/PROGRESS.md,
src/lib/journey-stepper.ts, src/content/policies.ts and pnpm-lock.yaml match HEAD.
All four overwritten .impeccable/review/venue-journey JPGs were restored from
exact binary HEAD blobs without touching the worktree index and match HEAD.
Incumbent untracked identity exports remain present. The only decision entries
amended are ORG-073 and ENG-095. Work is uncommitted. No hosted changes, commits,
pushes, deployments, paid resources, live workflow activation or real participant
communications occurred.

### CI follow-up: staff routes (6 November 2026)

CI failed `tests/staff-password-e2e/password-change.spec.ts` at a820be1: the closed dialog's seal image rendered on private staff routes, which have no Reserve trigger. `ReserveSeatProvider` now takes `enabled`, and `SiteShell` omits the dialog on those routes. After `pnpm build`, staff-password passed 26 (2 skipped); server-closed and database-closed gates passed 6 each; `home-owner-round3` + `mobile-navigation` passed 24 (8 skipped); staff-profile passed 4 on the pre-rebuild server; lint and typecheck passed. The rest of the staff workflow is confirmed by CI.

### Stat numbers (7 November 2026)

Owner feedback from a real iPhone: the stat numbers were hard to read. `.history-count` now uses the bold interface font (DM Sans; Noto Sans Arabic in Arabic) instead of the display font. The count-up is unchanged and was sampled running (1,362+ up to 4,007+). `--t-stat-compact` drops to 24cqi so Arabic fits at 280px with doubled text. `pnpm build`, Vitest 5,660, and `home-v2`, `homepage-polish`, `editorial-motion` (95 passed, 43 skipped) pass. Layout options are mock-ups only and are not in the code.
