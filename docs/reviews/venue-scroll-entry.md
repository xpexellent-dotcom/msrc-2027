# Reliable Venue scroll entrance — ENG-037, 12 October 2026

Scope: correct the public EN/AR Venue entrance that normal approach scrolling
bypasses. Preserve the accepted visual composition, approved information,
self-hosted maps/media, north-up geography, explicit Google/Apple actions and
closed operational workflows. Current published baseline is PR63's merge
`79d0679d2eb59c0583658d4a5fda827fb781448a`, reviewed source
`80b5c2ce4449a5ddfa9bcf8472fe0341f4ea8637`. ENG-035's explicit publication
authority continues after new verification; it authorizes no hosted settings,
database changes, accounts, operational activation or real communications.
Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03, REL-06.

## Audit and prioritized plan before code

Emil design engineering and Impeccable retain the current Experience surface.
The authored moment is the passage from the held overview into the Airport
chapter; supporting controls and reading remain usable. The user's latest
explicit instruction supersedes the earlier decay and narrow touch defaults.

| Priority | Before | After | Why |
| --- | --- | --- | --- |
| 1 | Wheel listeners arm only within 55% of a viewport | Observe before the first gesture and predict the crossing | Large normal inputs must reach the hold |
| 1 | Overshoot is marked complete without a release | Separate approaching, charging, releasing and completed states | Completion must represent an actual entrance |
| 1 | Phone capture requires a start within 160px | Decide first-move ownership within a bounded two-viewport approach | Fast deliberate swipes can reach the same gate |
| 1 | Tests prealign the page to the gate | Fresh-page wheel/touch approaches from scroll position zero | Verify the visitor's real path |
| 2 | Charge decays after 800ms or escapes after 2.4s | Input alone adds charge; pauses retain it and reversal reduces it | The visitor controls the buildup |
| 2 | A short scroll jump substitutes for the requested scene | Reveal the real Journey over 850ms, then restore native flow | Preserve spatial continuity and the requested entrance |
| 2 | Temporary pinning can hide copy or reset completion | Own/restore reading opacity and preserve completed state on resize | Keep the reveal readable and prevent accidental reentry |

The before-fix reproduction fails all four active EN/AR wheel/touch cases,
with four intentional opposite-input project skips and zero retries. It begins
at document position zero and uses native input without boundary prealignment.
At 738px width, a single crossing wheel input passes the measured continuation
boundary by about 120px; the old state becomes complete with charge/glow zero.
At 412px width, ordinary touch approach followed by a larger swipe similarly
passes the boundary and falsely completes. Preserved source and exact geometry:
`.tools/venue-approach-before-receipt.json`; original failure log:
`.tools/venue-approach-before.log`. These are failures, not release evidence.

## Implementation and motion contract

`VenueJourneyEntry` holds effect and input state in refs/local effect variables;
there is no per-frame React render or new motion dependency. Its body-portaled
decorative light and veil stay viewport-bound above the incoming section,
without intercepting pointer input. The normal SSR/no-JS Begin fragment remains.
Desktop uses the complete measured overview below header clearance when it fits;
taller reading layouts reach their natural continuation boundary without clipping.

The global non-passive wheel observer is attached before the first gesture, but
consumes only the predicted entrance crossing, held charge and active release.
It normalizes delta mode and caps effort at 80px per event toward a 480px threshold.
Touch tracks the original identifier and chooses ownership on its first deliberate
vertical move only for a single-finger gesture begun within the two-viewport band.
The owned approach follows the remaining distance, then caps each charge sample
at 72px toward a 300px threshold. Horizontal intent, pinch, native text controls,
inner scrolling and genuinely non-cancelable pans retain their platform behavior.
No body overflow lock or global touch-action override is introduced.

Charge remains stationary through pauses. Only positive input adds effort;
reverse input subtracts effort and upward movement resumes when it is drained.
Visual interpolation follows the input target without advancing charge on a
timer. The gold/lilac bottom light communicates buildup. Existing keyboard/focus
and native navigation paths remain available; Home/End must win over an active
scene rather than be overwritten by a pending Airport landing.

`createVenueEntryScene` pins the real Journey behind a moving clipping edge and
inserts a placeholder matching its original flow height. No duplicate content or
IDs are generated. World countertranslation holds the incoming composition while
the atlas frame receives restrained parallax; its inner camera continues to own
geographic framing. The Airport reading parent is temporarily fully opaque so
the child heading reveal can be seen despite its previous offscreen fade state.
The helper restores only its owned inline properties, including their previous
priorities, inert state and transition longhands.

The 850ms scene uses the established on-screen movement curve
`cubic-bezier(.77,0,.175,1)`, a short heading reveal and bounded blur. Incoming
section blur begins at 4px and resolves before the end; outgoing copy blur peaks
at 3px. The decorative light's 12px blur is bounded to its own layer. After the
scene reaches its end, a short bounded input drain handles the existing gesture
tail; this does not increase charge or initiate another release. An already-owned
touch ends before native handling of the next gesture resumes.

Completion restores real document flow, remeasures the native Airport destination
including scroll padding/margin, synchronizes scroll and commits the fragment.
The internal fragment notification is guarded so it does not discard the active
owned touch. Passive scrolling does not move focus; Begin activation focuses the
destination. Duplicate activation during release does not create another scene.
Completed state survives later resize/enlargement. Reduced motion, forced colors,
short/enlarged reading and no-JS retain direct/native entry and readable content.
Navigation, preference changes, resize, document visibility and unmount restore
temporary scene styles, flow and effects; effect cleanup removes observers and
listeners. There is no animation loop left running at rest.

## Verification receipts and limits

| Check | Observed result | Evidence and limit |
| --- | --- | --- |
| Published-source fresh approach reproduction | FAIL: four active cases; four intentional skips | `.tools/venue-approach-before-receipt.json`; both languages and input types bypass the old gate |
| Interim full local check | PASS: lint/types, 2,401 units in 61 files, 81-page build | `.tools/venue-cinematic-entry-check.log`; precedes later small scene/controller corrections and is not final frozen-source proof |
| Build after those corrections | PASS: 81 generated pages | `.tools/venue-cinematic-entry-build.log`; does not establish final browser behavior |
| First targeted browser attempt | PARTIAL: 12 passed, four intentional skips, eight failed | `.tools/venue-scroll-entry-browser.log`; original failures and traces retained |
| Following targeted browser attempt | PARTIAL: 18 passed, four intentional skips, two phone charged-entry failures | `.tools/venue-scroll-entry-browser-fixed.log`; fresh wheel/touch approaches and Begin/duplicate/landing paths pass, but the complete targeted set is not green |
| Final entrance and affected Chromium regressions | PASS: 73 passed, eight intentional skips, zero failures/retries | `.tools/venue-scroll-entry-browser-final.log`; all three affected files across desktop/tablet/phone, including the corrected phone timing checks and native Home/End interruption |
| Final full local check | PASS: lint/types, 2,401 units/61 files and81-page build | `.tools/venue-scroll-entry-check-final.log`; final controller/scene source, with scoped lint of the frozen tests also passing |
| Scoped WebKit phone checks | PASS: 10/10, zero retries | `.tools/venue-scroll-entry-webkit-final.log`; EN/AR Begin, accessible content, compact map points, anchors and reduced motion; physical hardware remains NOT TESTED |
| Final visual confirmation, owned Preview and exact-head CI | PENDING | No current hosted pass is claimed |
| Guarded merge, owned Production identity and actual live verification | PENDING | Existing live baseline remains separate from this correction |
| Physical iPhone Safari, Android and real screen readers | NOT TESTED | Synthesized Chromium touch and browser emulation are not hardware evidence |

No assertion is represented as passed without its observed result. The original
failure receipts remain available; no retry or longer timeout is used to turn
incomplete evidence into a pass. Final receipts must state the actual reviewed
source and serving deployment before publication is reported complete.
