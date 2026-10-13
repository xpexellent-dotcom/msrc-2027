# Reliable Venue scroll entrance — ENG-037, 12 October 2026

Scope: correct the public EN/AR Venue entrance that normal approach scrolling
bypasses. Preserve the accepted visual composition, approved information,
self-hosted maps/media, north-up geography, explicit Google/Apple actions and
closed operational workflows. The starting published baseline was PR63's merge
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
| Full local check and focused-keyboard follow-up | PASS: lint/types, 2,401 units/61 files and81-page build | `.tools/venue-scroll-entry-check-final.log`, then `.tools/venue-scroll-keyboard-check-final.log` after the final focused-anchor interruption correction |
| Scoped WebKit phone checks | PASS: 10/10, zero retries | `.tools/venue-scroll-entry-webkit-final.log`; EN/AR Begin, accessible content, compact map points, anchors and reduced motion; physical hardware remains NOT TESTED |
| Final focused keyboard/Begin regression | PASS: Chromium14 + two desktop-only phone skips; WebKit4/4, zero retries | `.tools/venue-scroll-keyboard-browser-confirmed.log`, `.tools/venue-scroll-keyboard-webkit-confirmed.log`; document and focused Begin support Home/End, with Chromium's native Ctrl+Home shortcut |
| Final exact-head PR CI and owned Preview | PASS at reviewed head 2bd6f12 | Three attempt-1 workflows, ten substantive jobs and ten actual Actions checks; owned READY Preview and protected EN/AR HTTP 200 |
| Guarded merge and owned Production identity | PASS: PR64 merged as 47c1505; owned READY Production serves that exact merge | `.tools/venue-scroll-2bd-merge.json`, `.tools/venue-scroll-merged-production-first.json`; both public aliases verified |
| Actual public HTTP verification | PASS: 97/97 GET/HEAD checks, zero failures | `.tools/venue-scroll-live-receipt.json`; independently verified serving SHA equals the merge |
| Current 81-case live browser run, push/main CI and final visual confirmation | PASS: 73 browser cases/eight intentional skips, zero failures/retries; three main workflows/ten jobs/ten checks; native live visual review | `.tools/venue-scroll-live-browser.log`, final joined47c1505 receipt and `.impeccable/review/venue-scroll-entry/live-*` |
| Physical iPhone Safari, Android and real screen readers | NOT TESTED | Synthesized Chromium touch and browser emulation are not hardware evidence |

No assertion is represented as passed without its observed result. The original
failure receipts remain available; no retry or longer timeout is used to turn
incomplete evidence into a pass. Final receipts must state the actual reviewed
source and serving deployment before publication is reported complete.

Final keyboard review found that a focused Begin anchor was treated as owning
Home/End even though these keys navigate the document. The final guard exempts
editable/inner scrolling controls, while restoring flow before the browser's
document command. The first optional WebKit desktop run passed Begin and ordinary
Home/End but failed Windows Ctrl+Home. A completed-scene native baseline proves
WebKit does not implement that shortcut:1548→1548, followed by plain Home→0
(`.tools/venue-native-wk-keys.jsonl`). Keep Home/End strict in both engines and
Ctrl+Home in Chromium; no browser shortcut polyfill, retry or timeout extension.
The14+4 focused reruns pass. Prior broader73-case and phone10-case receipts remain
dated baseline checks; the new head still requires its own complete hosted CI.

## Hosted timing failure and event-boundary correction

PR64 at5815ce4 must not publish: nine jobs succeeded but Arabic phone charged
entry failed a late residual-input assertion. Public totals:662 passed,49
intentional skips,one failure across712 cases. Lint/types,2,401 units,81-page
build/81 smoke, Contact44, participant88+4 skips and staff102+8 skips passed;
each disposable SQL job passed1,023 assertions in13 files with clean advisors.
Preserve the failed run38282679486/job114923492174 and artifact11763115076.

The exact CI trace proves the live release/scene/held-position checks passed.
After stationary touch completion, touchEnd and protocol-session turnover, the
next residual callback arrived688ms after an already-active release observation,
past its finish. This establishes a test synchronization defect; no application
failure is established. Evidence: `.tools/venue-scroll-5815-failed-trace-timing-20261012-173200.json`.

The test now records actual trusted wheel/touchmove capture and bubble phases.
It requires post-threshold initiating-gesture input to be cancelled while the
release is actually active, with unchanged position/history/release count and a
readable real scene. Phone samples remain in the original gesture; a wheel
follows one rendered animation frame. Remove time-racy later phase polling.
Retain850ms motion, >=800ms observed release, one history/release, exact native
Airport alignment, native continuation and full owned-style cleanup. No source,
suite, retry or timeout change. PASS lint/types and targeted12 cases/four
intentional skips, then final event-frame4/4, zero retries. Receipts:
`.tools/venue-scroll-event-phase-browser.log`, `.tools/venue-scroll-event-frame-confirmed.log`.
The new test-only head still requires fresh CI and owned deployment proof.

## Verified publication receipts — 12 October 2026

The correction is published through
[PR64](https://github.com/xpexellent-dotcom/msrc-2027/pull/64). Reviewed head
`2bd6f128fd96b810ab972e3b19e44447c93212c9` passes all three latest exact-head
PR workflows, ten substantive jobs and ten actual Actions checks, attempt1.
Public totals are 663 passes / 49 intentional skips / zero failures across 712 cases.
Core lint/types, 2,401 units in 61 files, 81 generated pages and 81 smoke checks pass.
Synthetic Contact 44, participant 88 + 4 skips and staff 102 + 8 skips pass. Each of the
three disposable SQL jobs passes 1,023 assertions in 13 files with clean schema and
advisor checks; this is CI evidence, not new hosted database execution.
Complete receipt:
`.tools/venue-scroll-complete-2bd6f12-2026-10-12T17-57-16-481Z.json`.

Owned READY Preview `dpl_Eu26mgij16pC3eUwrf7VUob8MiNb` matches the expected
project/team, repository, branch and exact reviewed source. Protected EN/AR GETs
return 200 with entrance/collage/stage/Journey/control markers:
`.tools/venue-scroll-2bd-preview-http.json`. Fresh owned Preview and PR/base
identity precede the single guarded merge. GitHub confirms actual merge
`47c1505b019daf1dcefa6fafa05d9e481e5ff8e3` in
`.tools/venue-scroll-2bd-merge.json`.

Owned READY Production `dpl_3WU9wQFKfxe54Gde8PbygaYtgMKZ` is source Git,
GitSource/main at that exact merge, expected project
`prj_R1XVydvYu17VPSTM3lNb1trWw9u9` and team
`team_8DBVOTW6s9ihVkUP69COuwG8`. Both www.msrc2027.com and msrc2027.com
resolve to this serving deployment. Production identity receipt:
`.tools/venue-scroll-merged-production-first.json` (17:59:17 UTC).
Actual public verification then passes 97/97 read-only GET/HEAD checks, zero
failures, with expected and independently verified serving SHA equal to the
merge: `.tools/venue-scroll-live-receipt.json` (18:00:19 UTC).

The actual-public affected Chromium suite passes 73 cases with eight intentional
skips and zero failures or retries across 81 cases:
`.tools/venue-scroll-live-browser.log`. This includes fresh EN/AR native wheel and
touch approaches, persistent/reversible charge, residual input during release,
partial-charge/duplicate Begin activation, keyboard interruption, precise native
landing, restored flow, reduced motion, responsive controls, accessible map points
and no-JavaScript paths. It runs against the verified public serving source above.

Native in-app browser visual review at 1440 x 900 begins at document position zero.
A four-page wheel input holds the complete overview at scroll position 644.
Additional input raises charge to 0.667 without changing that position; upward
input reduces it to 0.500. The threshold starts one release while position remains
644, then lands at position 1,544 with Airport top 0.015625px, completed state,
one release and zero temporary placeholders. A subsequent deliberate native input
advances to 1,904 without reentry. The captured overview is sharp and readable;
the side reading and map retain their final composition.

Arabic phone visual review at 412 x 839 confirms Begin starts that same release
once, lands below the compact map with no horizontal overflow, and leaves the
Airport detail control visibly readable and dismissible. These are browser
emulation receipts, not hardware UAT. Screenshots and observed positions:
`.impeccable/review/venue-scroll-entry/live-native-review.json` and `live-*.png`.
The temporary viewport override was reset and the actual public Venue tab retained.

Independent push/main CI passes all three workflows, ten substantive jobs and ten
actual checks, attempt1, at exact merge47c1505. Public totals are 663 passes,
49 intentional skips and zero failures across 712 cases. Core lint/types,
2,401 units/61 files,81-page build/81 smoke, Contact44, participant88+4 skips,
staff102+8 skips and each SQL1,023 assertions/13 files with clean advisors also pass.
Final reconciliation verifies merged/current main, the equal reviewed/merged tree
`b7a9a4eb6adc56129957571a3ee9d53edecf31ef`, owned serving target/both aliases and
actual-public results:
`.tools/venue-scroll-release-final-47c1505-2026-10-12T18-12-06-170Z.json`.

The previous failed attempts and dated interim passes remain intact. Physical
iPhone Safari, Android and real screen readers remain NOT TESTED. Publication
proof does not imply operational activation or hardware UAT. These final local
documentation receipts leave the verified published application/tests unchanged.
