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

## First hosted attempt — preserved failure

PR 61 head `6d0aafd8e879b291069d49d300f7aba67f36b61e` reached owned READY
Preview and passed nine substantive release jobs. Public browser shard 3 failed
the English 200% text assertion (324px content / 320px viewport). Its preserved
trace shows `data-reading-flow=false` at that immediate measurement, after the
font mutation. The Dates fixture now explicitly waits for the font observer's
natural-flow state before the same strict width assertion, matching the Journey
fixture's verified readiness condition. No retry, larger timeout or tolerance
change. New-head release checks are required; the failed attempt is not a pass.

Correction validation: PASS scoped ESLint and all six EN/AR Dates layout cases
across desktop, tablet and phone, zero retries. Receipt:
`.tools/venue-hero-font-readiness.log`. Application code is unchanged by this
test readiness correction; new-head CI still must pass before publication.

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

## Final publication receipt — 12 October 2026, 02:14 UTC

[PR 61](https://github.com/xpexellent-dotcom/msrc-2027/pull/61) final reviewed
head `daf3dc447efa3e87ef39044c61214ae3d603b4c5`: PASS all three workflows,
ten substantive jobs, eleven checks and Vercel. Public browser CI totals:
639 passed / 41 intentional skips / zero failures / 680 cases. Foundation:
2,399 units / 61 files, 81-page build and 81 route smoke checks. Contact: 44.
Participants: 88 passed / four skipped. Staff: 102 passed / eight skipped.
All three disposable SQL executions: 1,023 assertions / 13 files, clean schema
and advisors. These are CI database receipts, not local or hosted database changes.

Owned Preview `dpl_4S5zJntYC5XGWiBwrMPm1UjiGzzC` was READY at the exact
reviewed head. Existing authenticated CUA inspection passed desktop and EN/AR
phone opening/details. No Deployment Protection settings changed.

Authorized squash merge: `ae55950f992180e0f643704c5d9127a4fdbb644a`.
Reviewed head and merged main share source tree
`6ed82bd4467a15a74b06a5c576030c112430f689`.
Owned Production `dpl_5B8DrZPwmkq4szRrzuPhqDRdb3Qg` is READY at that merge;
metadata and gitSource agree, owner/project identities match, and both public
aliases point to it. Checked 02:08:02 UTC. No source edits followed the merge.

Final actual public verification: PASS 97/97 read-only GET/HEAD checks, including
hero map/no removed copy/no Waze, public assets and closed operational boundaries.
PASS all 49 scoped Chromium live desktop/tablet/phone browser cases in EN/AR,
zero retries, covering native gallery input, chapter scrolling/reversal, point
details, fixed controls, keyboard, privacy, reduced/enlarged/short layouts and
no-JS. Final CUA visual review confirms the desktop opening and a native phone
point tap; screenshots saved as `live-desktop.png` and `live-phone.png` under
`.impeccable/review/venue-hero-phone/`. Temporary viewport override reset.

Receipts: `.tools/venue-hero-hosted-daf3dc4-final.json`,
`venue-hero-ci-totals-daf3dc4.json`, `venue-hero-preview-daf3dc4.json`,
`venue-hero-production-after.json`, `venue-hero-live-final.json`,
`venue-hero-live-browser.log`. Earlier failures remain preserved and are not
represented as passes. Final receipt append is local only to preserve the
tested/released source. Physical-device/Safari toolbar and real screen-reader
UAT remain NOT TESTED; there are no outstanding code/release failures.
