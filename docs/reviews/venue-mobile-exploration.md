# Venue mobile exploration — ENG-031

The desktop visual direction is accepted. Refine it rather than replace it.
The primary task is finding an arrival option and navigating the venue on a phone.

| Before | After | Why |
| --- | --- | --- |
| Width below 1200 disables the camera and hides marker context | Compact sticky map, native scroll camera, tappable stop details and zoom/reset | Mobile receives real exploration |
| City and venue names repeated in multiple paragraphs and facts | Short chapter headings, one venue/address group, concise travel summaries | Reduce cognitive load |
| Three transport and six arrival bodies expanded | Native closed disclosures with clear summaries | Details remain findable without filling the screen |
| Every large reading block has the same visual weight | Subtle chapter opacity transitions, immediate keyboard/reduced-motion response | Explain progression without moving reading text |

Keep the four selected photographs, existing Manrope/Noto fonts, purple/ivory/
champagne palette, local north-up OSM geometry and three provider destinations.
No wheel/touch interception, auto-advance or additional pause controls. No-JS
anchors and ordinary disclosures remain useful. Short/enlarged views retain
reading flow and functional map controls; physical hardware availability is a
reported verification limit, not permission to omit touch behavior.

Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/03, MED-01/04, PRV-03. Approved
times, route choices, ticket/gate/parking/accessibility/on-site/Wi-Fi and visa
responsibility remain accessible. Publication is explicitly authorized by the
current request after final-head tests, preview review and owned live proof.

## Implementation and local verification

One sticky frame contains the phone atlas and chapter controls, avoiding competing
bottom constraints. Scroll uses passive listeners and a single animation frame;
camera framing uses actual atlas dimensions. Point selection opens a bounded
nonmodal sheet. Keyboard activation focuses its heading; Close/Escape restores
the marker/current chapter. A world-boundary check closes the sheet on exit
without passive focus movement. Zoom changes map framing only. Arabic maintains
physical north-up geography and localizes controls/reading direction.

Copy is shorter in both languages. Details open by native disclosure, without
removing approved times, six arrival facts, visa responsibility or map providers.
Inactive reading remains legible at .7 opacity (200ms); focus, keyboard, reduced
motion, enlarged reading and print restore full opacity. No autoplay controls,
scroll locks, external map SDK or undocumented travel claims were added.

Observed local results on 12 October:

- `pnpm check`: PASS lint/types, 2,399 units in 61 files, 81-page build.
- `playwright test tests/e2e/venue-journey.spec.ts tests/e2e/dates-venue.spec.ts
  tests/e2e/venue-travel.spec.ts --config .tools/venue-journey-browser.config.ts
  --reporter=list`: PASS all 49 (24 journey, 21 dates/venue, four travel).
- Initial 38/11 receipt retained: four stale selectors now distinguish chapter
  links from enhanced map buttons; two phone reversals now exercise native touch
  rather than mouse wheels; four sheet lifecycle defects corrected; one genuine
  Arabic phone target overlap fixed by the combined sticky frame. Assertions,
  timeouts and zero retries remain intact.
- Scoped detector: 62 advisory palette/type findings; zero primary findings.
- CUA captures: EN phone transport, AR phone arrival, desktop gallery and journey.
  Independent review disposition: SHIP for reviewed source/captures.
- NOT TESTED: physical devices, WebKit and real screen readers. Browser automation
  is evidence for the tested Chromium environments, not hardware certification.

Hosted CI, owned Preview, merge and owned Production/live results are separate
release evidence; this local receipt does not claim them complete.

## Publication and pressed-target correction

PR 59 passed all three workflows at b17011a (639 public passes / 41 intentional
skips) and was published as 45facf1. Owned Production and both aliases matched;
97 read-only live checks passed. The live phone run found one transient geometry
failure: press feedback scaled a 44px button to 43.45px during release. Correct
that behavior by scaling only its SVG, keeping the button's hit region fixed.
Reset and Close regression checks hold Space and require native active-state,
rendered-frame 44px bounds before releasing, as well as retaining every rest-state
and native-touch assertion. Keyboard and reduced motion respond immediately.
The original 3-pass/1-fail live receipt remains preserved, not called a pass.

Final correction: PR 60 head 43f28ee passed all three workflows, ten jobs,
eleven checks and Vercel (639 public passes / 41 intentional skips / zero retries).
Protected Preview automation is BLOCKED at Vercel Authentication; existing
authenticated CUA review confirms 44px steady regions without access-setting
changes. Merge 32e8e03 has an identical source tree. Owned READY Production
dpl_9WQMiuzrpgor6sjdu21CNbi5soRn serves both public aliases at that merge.
Final public verification: 97/97 read-only checks and 4/4 EN/AR phone interaction
cases PASS, including held-button geometry. Final live screenshot is preserved.
Physical devices/WebKit/real screen readers remain NOT TESTED. This receipt is
appended locally and in the PR description, retaining the immutable released head.
