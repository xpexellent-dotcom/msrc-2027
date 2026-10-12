# ENG-033 Venue cinematic refinement — 12 October 2026

Scope: public Venue page and existing shared navigation. Preserve the accepted
MSRC brand, approved facts, all map/provider privacy and closed operational gates.
Publication authority continues from ENG-031; a checked source and owned serving
deployment must be verified again. Current baseline is PR61's merged
`ae55950f992180e0f643704c5d9127a4fdbb644a`. User work/earlier receipts preserved.
Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03.

## Audit and prioritized direction before code

| Priority | Before | After | Why |
| --- | --- | --- | --- |
| 1 | Ivory title beside two media elements | Existing venue photo as a purple-blurred header, Program display metrics | Restore clear page hierarchy |
| 1 | Left-aligned article through the map | Centered reading and reversible native-scroll fades | Focus the current arrival chapter |
| 1 | Thick perceived capsule rim and 64px height | 60px/1240px continuous glass, lower-alpha rim/material | Requested thinner, longer and clearer finish |
| 2 | Abrupt light-to-dark boundary | Brief expanding gold/lilac entry light and map framing | One authored journey entrance |
| 2 | Split title/media hierarchy | Two balanced map/gallery columns and centered Begin action | Make both imagery and directions useful |
| 2 | Separate oversized closing section | Centered international disclosure and end-aligned Program action | Reduce repeated hierarchy |

Motion thesis: the focal moment is the existing local city map arriving as the
light stage leaves the screen. Native scrolling drives framing and a bounded
nonflashing light expansion; no wheel/touch interception or scroll locking.
Continuity comes from camera travel and chapter text fading at the viewport
edges. Feedback retains stationary 44px controls and immediate keyboard response.
Budget: reuse the existing coalesced animation-frame update, three reading opacity
updates and one decorative transform/opacity. Existing abstract linework settles
once; no loop or new motion dependency. Reduced motion removes spatial entry and
copy fading. Keyboard/focus/open essentials, enlarged text, no-JS and print expose
fully readable copy. Phone map remains roughly one third of a normal portrait view.

## Implementation

The requested image URL resolves to the existing self-hosted
`/media/msrc-demo/king-faisal-venue.jpg`; no new asset/provider request is introduced.
Heading uses Manrope and Program's 700 weight/1.12 line-height/-0.035em tracking,
with the existing inverse keyword gradient. Arabic uses its independent font,
zero tracking and 1.5 line-height. Existing campus map labels/north/scale and
Google/Apple explicit outbound links remain; no Waze, duplicate dates or caption.

Light stage uses two columns above 800px and natural single-column phone flow.
The single native four-view gallery remains swipe/keyboard/no-JS operable.
The journey reading block is centered, reserving an actual map/popup column at
the side. The map still covers the desktop viewport; phone controls stay compact.
Chapter opacity derives from actual reading bounds; focus/keyboard/open essentials
restore full opacity. International guidance stays a native disclosure at the
bottom, not another promotional heading. Unannounced session information remains
accurate next to the existing Program destination.

Navigation: maximum1240px, minimum60px, vertical padding6px. Base material alpha
.64/.69/.66 (roughly10.4–11.1% less opaque); rim white .28 and innerhighlight .10.
Stationary gold .055/white .015 accents over deeper purple preserve calculated
ivory/champagne contrast: conservative minimum4.558:1 on an all-white backdrop
including maximum overlapping layers and 2.5% white grain. This is calculated
contrast; rendered review remains separate. No source interaction change, seam,
top-edge hover restoration, new navigation animation or smaller touch target.

## Verification receipts

Initial lint: FAIL one live-ref cleanup warning. Capture the decorative node
inside the effect; no lint suppression. Final checks pending.

First concurrent local browser attempt: Chromium64 passed /12 intentional skips /
9 failures; WebKit5 passed /3 failures. Preserved artifacts/logs retain the actual
failures. Six Chromium/two WebKit layout assertions still expected the explicitly
removed duplicate footer badge; the test now checks the registration destination
and exact pending schedule copy, while closed-route/operational coverage remains.
Visual review found dark breadcrumb inheritance and map shading over points;
scoped inverse text and a narrow reading scrim correct these. Desktop Begin now
subtracts global anchor padding so the atlas fills the viewport. Phone/reading-flow
clearance retains its measured behavior.

Centered reading exposed a real hover corridor collision at a near-top Airport
point. The camera now keeps that active point horizontally in the actual side
column, with half-pin-width plus24px foreground clearance; vertical travel and
the unchanged near-top/bridge assertions remain. The Arabic phone Zoom trace
shows document scroll moved4px while the fixed camera had already settled: touch
stopped momentum rather than activating Zoom. The harness waits for actual native
scroll-coordinate stability before sampling/tapping. No retry/longer timeout or
weaker zoom target assertion. The nav handoff trace proves the correct route was
requested, but required JS/image bodies stalled while browser engines/CUA competed;
one WebKit case exhausted its30s total budget after passing core actions. Final
engines run sequentially with one worker, retaining all assertion budgets.

Physical iPhone Safari, physical Android and real screen readers: NOT TESTED.
Browser emulation/WebKit does not establish hardware/browser-toolbar behavior.

Second Chromium run: 69 passed /12 intentional skips /4 failed, artifacts
preserved separately. The changed desktop anchor clearance exposed a real active
marker beneath the fixed header. Framing now keeps its top at header-height plus
24px, preserving the unchanged 360px native-scroll, 100–180px top/flip/hover-bridge
scenario. Native phone instrumentation reproduced the exact unchanged zoom
scale: correct Zoom touch/pointer targets but no compatibility click after the
synthetic flick. A stationary terminal sample before gesture lift delivers that
click and scale .329596→.411993. The vertical harness adopts that input cadence,
retaining >40px native forward/reverse movement and strict zoom/held44px checks.
No app Zoom-handler change, assertion weakening or increased timeout. Final
source check and sequential browser suites required after these corrections.

Final source check: PASS lint/types, 2,399 units /61 files, 81-page production
build. Receipt `.tools/venue-cinematic-release-check.log`. Native-input diagnostic:
`.tools/venue-cinematic-touch-diagnostic.json`. Final Chromium/WebKit and exact-head
CI/Preview/Production evidence pending; no final release claim at this revision.
