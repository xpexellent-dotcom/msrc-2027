# Venue opening and phone refinement — ENG-032

Scope: EN/AR public Venue presentation and map/gallery interactions. Retain the
accepted MSRC visual world, native scroll, approved facts, source map geometry,
photo provenance, closed workflows and existing public routes. No hosting settings,
new third-party requests, operational data, accounts, migrations or communications.

## Audit before editing

The supplied iPhone screenshots show a tall campus map outside the opening and
a pinned city map/control frame consuming nearly half the visible page. Passing
chapter text remains exposed in the floating-header gutter; a pin can overlap
map attribution. The desktop four-photo composition leaves no opening map space.

| Priority | Before | After | Why |
| --- | --- | --- | --- |
| 1 | Oversized phone map and vertical controls | Thin atlas plus horizontal fixed targets | Keeps reading and travel controls visible |
| 1 | Pins can collide with credits/furniture | Focal framing and rectangle exclusion | Protects map actions and attribution |
| 1 | Clear passing text above the pinned frame | Measured pinned-only blurred scrim | Softens overlap without blurring current copy |
| 2 | Four-photo grid and separate lower campus map | One native carousel beside the opening map | Fits both media elements in desktop composition |
| 2 | Waze and unwanted captions | Two explicit providers, captions removed | Matches the current organizer request |

## Implementation and verification boundary

Desktop opening has intro, campus map and one photographic card. Tablet uses an
intro row above two media columns; phones use native single-column flow and a
landscape campus map with complete baked labels/north/scale. Existing
`#venue-orientation` now identifies that opening map. All four photographs remain
available through native scroll/snap and 44px arrows. Keyboard changes are instant.

Normal phone atlas uses `clamp(11rem, calc(34svh - 4rem), 16rem)`; actual frame
budget is checked including chapter controls. Root-font enlargement and short
screens remove pinning and use a larger minimum so information points fit. Chapter
anchors use measured index height. Camera geometry stays LTR/north-up under RTL.
Points avoid controls, north indicator and credits. The nonmodal details panel,
native disclosures, press targets and focus lifecycle retain existing behavior.

Reduced motion removes interpolation; normal phones change chapter framing
immediately and reading flow fits a static overview to the usable map band.
The local top scrim has prefixed backdrop filtering and a plum fallback, appears
only while the compact frame is pinned and is omitted in forced colors.

Initial `pnpm check`: PASS lint/types, 2,399 units / 61 files, 81-page build.
Initial browser run is a diagnostic attempt, not final evidence: no-JS gesture
cadence awaited a disabled document's animation frame. Fixed the harness with
Node-side native-input pacing; no retries, assertion weakening or timeout increase.
Final source lint/types: PASS. Unit tests: PASS 2,399 / 61 files. Final production
build: PASS 81 pages. Scoped final Chromium browser run: PASS 49/49, zero retries,
covering desktop/tablet/phone, EN/AR, accessibility, privacy, native input,
reduced/enlarged/short states and no-JS. Receipts: `.tools/venue-hero-check.log`,
`venue-hero-unit-final.log`, `venue-hero-build-camera.log`,
`venue-hero-browser-confirmed.log`. Preview, CI and live receipts are pending.

Installed WebKit was additionally exercised. Its first attempt exposed a focal
band problem: the side north indicator reserved the full width, leaving too little
credit clearance on narrow screens. Only controls reserve the full focal band now;
the north indicator's actual rectangle remains excluded from pins. Explicit zero
tab indices preserve native provider-link keyboard order under WebKit defaults.
Tests also await actual completion of queued anchor navigation before the next
independent scroll. Only WebKit's exact unsupported `interactive-widget` warning
is excluded; application errors and all other console errors remain asserted.
The enlarged-English overflow was measured before the font observer restored
reading flow; tests now await that observable precondition before the unchanged
320px overflow assertion. Final WebKit phone checks: PASS 8/8, zero retries.
Final source check/build: PASS lint/types, 2,399 units / 61 files and 81 pages.
Receipts: `.tools/venue-hero-release-check.log`, `venue-hero-chromium-release.log`
(49/49), `venue-hero-webkit-release.log` (8/8). Original failures remain preserved.
No physical-device pass is claimed. Hosted release evidence is pending.

Subsequent diagnostics caught a 1rem anchor inset counted twice with global
scroll padding, and continuous compact camera travel moved the current Airport
pin into controls. Corrected anchor clearance; compact framing holds the current
stop until the final quarter of chapter progression, then travels smoothly.
Current EN/AR phone scroll/point/reduced checks: PASS 6/6. Native gallery gesture
delivery needed a stationary terminal sample before release; the same exact
one-card assertion now passes in four no-JS cases. Original failures preserved.

NOT TESTED: physical iPhone Safari toolbar/safe-area behavior, physical Android
and real screen readers. The organizer's screenshots establish the original
hardware defects; browser emulation does not establish a physical-device pass.
