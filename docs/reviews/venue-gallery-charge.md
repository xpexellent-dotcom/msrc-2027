# Venue header collage and charged entrance — ENG-034

User-approved direction on12 October2026, refined from annotated screenshots:
Program header proportions and typography; existing purple venue photos in an
overlapping right-side stack; left venue introduction, relocated campus map and
compact international/FAQ/Program guidance; centered Begin action. The scroll
entrance holds at the opening boundary, accumulates bottom glow and blur, then
bursts to Airport. Approved after explanation, with explicit blur/center correction.

| Before | After | Why |
| --- | --- | --- |
| Venue72svh minimum and extra top clearance | Program's content-driven padding/grid/display metrics | Consistent header structure |
| Four-photo card beside map below header | Overlapping header photos, native swipe on phones | Fit the annotated composition |
| Repeated lower guidance and Program section | Compact practical guidance beside map | Reduce repetition |
| Glow advances with ordinary scrolling | Boundary-only hold, buildup and release | Implement the requested entrance |

Mode remains Experience in the existing MSRC world. No new identity/assets,
map service, font package or runtime motion library. Four approved photographs,
campus/local city geometry, dates/travel/visa facts, bilingual semantics and
default-closed operations remain. Root and delegated lanes preserve unrelated
dirty phone-review receipts and unused media. Branch begins at verified main
`81efe6c76c45e61c581444f3dab83a81caf77a09`.

Motion purpose: one rare focal entrance, connecting an opening orientation to
the journey. Fine-pointer photos use220ms transform feedback with immediate
keyboard/reduced response. Charge uses normalized/capped wheel input120px/event,
480px total; a boundary-started single-finger gesture accumulates180px travel.
Only the stage layout blurs2px while charging and at most6px in the540ms strong
ease-out release. Bottom-origin gold/lilac light is viewport-fixed; no stage
transform/filter may establish its containing block. A bounded veil bridges
the release. The old sinusoidal map entry is removed, keeping one authored moment.

Input safeguards: attach nonpassive wheel/touch listeners only near the boundary;
ignore controls, native scrolling containers, horizontal intent, modifiers and
pinch. Never seize a native touch gesture late or fight a non-cancelable event.
Upward input, keyboard, Escape, focus, window loss, changed preferences/geometry
and unmount clear effects. Paused charge releases after800ms; persistent partial
input has a2400ms escape. No body overflow lock, root scroll-behavior rewrite,
touch-action:none or perpetual loop. The centered anchor stays visible/usable;
keyboard/reduced/short/enlarged/no-JS can enter directly. Successful entrance
releases the gate for this mount. Normal camera and chapter scrolling stays native.
The same-page fragment helper preserves query and bilingual fragment subscribers.

## Verification

- Initial tool invocation: BLOCKED before app checks because the bundled pnpm
  moved to11.25.0 while this project pins11.19.0. Selected exact11.19.0 with
  standard npm exec/npx package resolution; no global install, engine relaxation,
  manifest or lockfile change. Installed CLI help and version were inspected.
- Header lane scoped lint/whitespace: PASS. Full source build, meaningful scoped
  EN/AR gesture/accessibility regressions and batched desktop/phone visual review
  are pending. No final pass/commit/publication claim yet.
- Physical iPhone Safari/Android and real screen readers: NOT TESTED. Emulation
  and WebKit will be reported separately if run.

## Final local verification

- First full source check: lint/types PASS, units2,395/2,399 PASS with four FAIL
  because Journey-only SSR expected guidance explicitly moved to the opening.
  Its travel/arrival checks remain; two new full EN/AR Page SSR cases protect
  exact approved visa/UTC+3 wording once, location and Program/FAQ/no-embed rules.
  Fact coverage was relocated, not removed.
- Initial browser scope: PASS61/61 EN/AR desktop/tablet/phone, zero retries.
  First WebKit scope:9 PASS/one FAIL. Airport entry succeeded, but English Begin
  followed the full ordinary href, requesting a new document and losing query.
  Saved snapshots prove controller/effect readiness before tap. One instrumented
  native-tap diagnostic did not reproduce it: trusted primary button0/detail1,
  modifiers false, callback prevention, one fragment commit, correct focus/query
  and no second document request. Callback-level cause remains unknown.
- Begin now uses the intrinsic same-document fragment #journey-airport, so
  browser fallback preserves query and avoids reload. Only href-shape assertions
  change; strict URL, focus, charge and no-JS assertions remain. No retry,
  timing increase or readiness guess. Original artifacts are retained.
- Motion review fixes new pointer/focus/history interference and isolated
  overlay stacking. Body portals put glow/veil above incoming map content.
  Cleanup/bypass source review finds no remaining material defect. Touch tests
  start100px before the boundary; only the last160px approach is owned and
  non-cancelable pans stay native.
- PASS final pnpm check with exact11.19.0: lint/types,2,401 units in61 files and
  81-page build. Receipt: .tools/venue-charge-check-final.log.
- PASS final Chromium61/61, zero retries: .tools/venue-charge-browser-final.log.
  PASS final WebKit phone10/10, zero retries: .tools/venue-charge-webkit-final.log.
  Chromium covers charge/hold/reverse/pause/one burst, native camera progression,
  query/focus/no-JS, short/enlarged/reduced reading, photo promotion/swiping,
  hover corridors, tap/zoom/reset, fixed44px targets, locale/RTL, attribution/
  provider privacy and axe. WebKit covers Begin, layout/axe, map points,
  short/enlarged/reduced anchors and travel keyboard/privacy. Native touch
  charging is Chromium-tested; physical Safari is NOT TESTED.
- Batched desktop header/stage and Arabic phone visual round pass. Campus-map
  hover1.018/260ms is fine-pointer only, omitted under reduced motion. Final
  confirmation shows fragment-only Begin and clean Airport landing. Screenshots
  in .impeccable/review/venue-gallery-charge/: desktop-header.png, desktop-stage.png,
  phone-ar-header.png, phone-ar-stage.png, final-header.png and final-journey.png.

Commands: npx --yes --package=pnpm@11.19.0 pnpm check; scoped Playwright with
task-local Chromium/WebKit configs; one new native-tap recorder; git diff --check.
Failed artifacts/diagnostic stay separate. React checklist applied: static imports,
native semantics, stable subscriptions/ref-captured cleanup, no per-frame React
renders, no new dependency and passive scrolling outside the approved entry.
Code is ready for the requested local commit. No push, PR, merge or deployment
has run in this task. Physical-device/screen-reader UAT remains NOT TESTED.
