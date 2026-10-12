# Venue input resilience — ENG-038, 12 October 2026

Scope: make the approved Venue entrance reliable with ordinary desktop wheel and
trackpad input. Retain the complete overview, centered Begin action, EN/AR/RTL,
existing maps/photos/copy, persistent reversible charge and 850ms real-section
reveal. The currently published source is PR64 merge
`47c1505b019daf1dcefa6fafa05d9e481e5ff8e3`, reviewed source
`2bd6f128fd96b810ab972e3b19e44447c93212c9`. Its prior receipts remain preserved.
ENG-035's UI publication authority persists after current checks and owned live
verification; no operational, hosted-setting, database, account or communication
change is authorized. Requirements: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03,
MED-01/04, PRV-03, REL-06.

## Audit and prioritized plan

Emil design engineering and Impeccable preserve the current visual world and its
single focal entrance. The new issue is input reliability rather than a redesign.
Earlier boundary, charge, scene and public checks passed their observed cases;
the organizer's report and new real-input cases establish missing coverage.

| Priority | Before | After | Why |
| --- | --- | --- | --- |
| 1 | Each wheel packet is capped at 80px, losing excess distance | Preserve full normalized earned effort | Coarse packets must equal the same distance in small samples |
| 1 | Non-cancelable packets are ignored and can cross the gate | Observe eligible intent and recover measured document crossings | Real compositor momentum must reach the entrance |
| 1 | Clamps overwrite the observation baseline before queued native movement is credited | Flush pending motion and distinguish owned writes | Prevent lost effort and double-counting |
| 1 | Fresh normal input cases are absent | Add single-packet and trusted native-fling EN/AR regressions | Reproduce the reported technique dependency |
| 2 | A large packet can skip visible buildup | Smooth the already-earned glow target in the held frame before release | Keep the authored feedback visible without inventing charge |
| 2 | Reverse input can lose its unused remainder | Drain charge and carry remaining upward distance | Leave the hold naturally in the same gesture |
| 2 | Completion prevents reapproach | Rearm only after a genuine return above the gate | Repeated normal visits to the opening should work |
| 2 | A rolling tail guard can extend indefinitely or catch reversal | Positive-stream, quiet and absolute deadlines | Preserve exact landing without creating a scroll trap |
| 2 | Observer callbacks can prematurely settle the scene | Compare actual geometry fingerprints first | Ignore benign/initial delivery |

## Public failure evidence

Read-only probes against the owned published 47c1505 source reproduce the report.
One large wheel packet sized to the gate plus 2000px is clipped to roughly 0.167
charge and never releases. A native 4000px gesture at speed 10000 emits 14 trusted
non-cancelable wheel packets; the page reaches scroll position 4000 while the
controller remains approaching. No test-only untrusted event is substituted for
this compositor/native input.

The new public regression run fails four active cases, EN/AR single large wheel
and native non-cancelable fling, with zero retries. Preserve
`.tools/venue-input-public-before.log` and all screenshots/contexts/traces in
`.tools/venue-input-public-before-results/`. These failures do not invalidate
the recorded earlier passes; they identify scenarios those checks did not cover.

## Scoped implementation

Only the entrance controller changes. The existing scene helper, geometry,
850ms timeline, fragment/focus helpers and provider/privacy boundaries remain.
Wheel delta mode is normalized to distance. The same 480px wheel and 300px touch
thresholds retain their existing meaning, but per-packet caps no longer discard
earned effort. Charge remains input-driven and persistent during a pause.

The displayed target converges over animation frames with elapsed-time smoothing.
Once full effort has been earned, the held overview first displays its glow and
then starts the existing reveal when rendered charge reaches 0.9, after at least
140ms from the first positive glow and three preceding held glow frames. This renders
previously earned input; a timer cannot add charge or complete an untouched hold.
Begin still invokes the same reveal directly. Reverse input subtracts effort;
any distance beyond zero carries the document above the gate in that same input.

Eligible wheel, touch and keyboard intent is recorded separately from observed
document movement. Native crossing recovery applies only to a recent eligible
session, preserving ordinary anchors, controls and scrollbar navigation. Owned
clamps/landing writes update the observation baseline synchronously and do not
earn or drain charge. A pending native displacement is flushed before another
input packet is consumed, so queued scroll-event ordering cannot lose the motion.
The active release maintains its held document position, then changes the guard
to the exact real Airport landing during handoff.

Only the initiating positive non-cancelable wheel tail can hold the settled
landing. Quiet 120ms, a fresh cancelable packet or reversal ends that protection;
an absolute deadline prevents extension beyond 350ms after visual completion.
Native movement well above gate-128 rearms the entrance, with hysteresis that
keeps ordinary Airport reversals from starting another release.

Explicit navigation/history, pointer manipulation, keyboard escapes, horizontal
intent, pinch and visibility changes clear stale intent. Geometry measurements
compare viewport, stage bounds, gate, header clearance and eligibility before
acting; initial and benign observer notifications cannot shortcut the timeline.
The original real-section placeholder, owned-style/inert restoration, accurate
scroll padding/margin landing, controlled fragment notification and focus policy
remain. No duplicate IDs/content, global body lock, whole-site gesture takeover,
new dependency, provider request, asset, factual claim or operational gate change.

## Verification and current status

| Check | Result | Evidence and limit |
| --- | --- | --- |
| New public baseline regressions | FAIL: four EN/AR cases, zero retries | `.tools/venue-input-public-before.log` and retained result directory |
| Complete local check before final tail-ordering correction | PASS: lint/types, 2,401 unit cases in 61 files, 81-page build | `.tools/venue-input-resilience-check-final.log`; the later narrow correction has separate scoped and browser proof |
| Final tail-ordering correction | PASS: scoped lint/types and 81-page build | `.tools/venue-input-resilience-build-final.log`; clear reverse/fresh completed intent before pending movement flush; source frozen for the final browser run |
| Mixed build/server browser attempt | NOT FINAL: nine passes/eight skips/three failures | `.tools/venue-input-resilience-focused.log`; two connection refusals followed the owned server stop; the Arabic reentry bootstrap used eight large packets over 1,444ms and legitimately continued after entry under the new full-distance contract; no complete pass is claimed |
| Stable-source perceptibility check | FAIL: ten passes/eight intentional skips/two failures, zero retries | `.tools/venue-input-resilience-focused-final.log`; both failures show only one captured positive held-glow frame, while release, precise landing, history and cleanup pass |
| Final held-glow bridge complete check | PASS: lint/types, 2,401 units/61 files, 81-page build | `.tools/venue-input-resilience-bridge-check.log`; explicit minimum visible buildup retains the strict two-observed-frame assertions; source frozen for new browser checks |
| Final native-retreat synchronization confirmation | PASS: four charged-entry cases, zero retries | `.tools/venue-input-resilience-retreat-confirmed.log`; additional-native-displacement readiness and exact alignment remain strict |
| Final affected local Chromium cases | PASS: 81 passed/16 intentional skips/zero failures or retries across97 cases | `.tools/venue-input-resilience-broad.log`; desktop/tablet/phone, EN/AR, fast native inputs, persistent/reverse charge, repeat entry, full scene/cleanup, no-JS and accessible/private controls |
| Scoped WebKit phone/desktop checks | RUNNING/PENDING | Separate browser-engine/capability evidence; no hardware claim |
| Final Impeccable mechanical detector | PASS: no findings | `.tools/venue-input-resilience-design-detect-final.json`; this is mechanical source review, not browser/UAT evidence |
| Final visual confirmation | PENDING | Source review is not a visual/gesture pass |
| Exact-head CI and owned Preview | PENDING | Prior PR64 checks are historical source evidence |
| Guarded publication and owned Production/live checks | PENDING | Live still serves 47c1505; no current release claim |
| Physical iPhone Safari, Android and real screen readers | NOT TESTED | Browser emulation/synthesized input does not establish hardware UAT |

No browser pass, hosted pass or publication is claimed before its actual result.
Root will append the final reviewed source, checks, serving identity and live
receipts. Original failures and unrelated user work remain intact. No commit,
push, merge, hosted mutation or application/test edit is performed by this
documentation lane.
