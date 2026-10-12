# Venue input resilience — ENG-038, 12 October 2026

Scope: make the approved Venue entrance reliable with ordinary desktop wheel and
trackpad input. Retain the complete overview, centered Begin action, EN/AR/RTL,
existing maps/photos/copy, persistent reversible charge and 850ms real-section
reveal. The starting published source was PR64 merge
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
| Supported WebKit phone/desktop checks | PASS: phone 10/desktop 6, zero retries; four CDP-only phone cases NOT TESTED in WebKit | `.tools/venue-input-resilience-webkit-phone.log`, `.tools/venue-input-resilience-webkit-desktop.log`; unsupported attempted paths fail at Chromium-only CDP setup, not an app assertion |
| Native slow-input confirmation | PASS: EN/AR 12px packets, partial pause/reversal, exact landing and native continuation | `.tools/venue-input-slow-final.json`, `.tools/venue-input-slow-final.log`; separate from fast/native-fling coverage |
| Final Impeccable mechanical detector | PASS: no findings | `.tools/venue-input-resilience-design-detect-final.json`; this is mechanical source review, not browser/UAT evidence |
| Local CUA visual confirmation | PASS: desktop fast entrance and Arabic-phone composition/details; viewport reset | `.impeccable/review/venue-input-resilience/`; local browser evidence, not physical hardware or final public visual proof |
| Exact-head PR CI and owned Preview | PASS at 5847ffa: three workflows/ten jobs/eleven actual checks/Vercel | `.tools/venue-input-complete-5847ffa-2026-10-12T20-10-55-673Z.json`; owned READY Preview and protected EN/AR HTTP 200 |
| Guarded merge and owned Production identity | PASS: PR65 merged as f07fea7; owned READY Git/main Production with both aliases | `.tools/venue-input-merge.json`, `.tools/venue-input-production-after-2026-10-12T20-16-54-518Z.json`; reviewed/merged tree equality independently verified |
| Actual public HTTP checks | PASS: 97/97 GET/HEAD, zero failures | `.tools/venue-input-live-http.json`; expected and independently verified serving SHA agree |
| Final 97-case actual-public browser run | FAIL: 79 passes / 16 intentional skips / two Arabic-phone failures, zero retries | `.tools/venue-input-live-browser.log` and retained result directory; independently measured held-gate alignment differs by 30.546875px and 31px |
| Independent push/main CI at f07fea7 | FAIL: nine of ten substantive jobs pass; public totals 670 passes / 57 skips / one failure | `.tools/venue-input-main-failure-f07fea7-2026-10-12T20-28-16-428Z.json`, `.tools/venue-input-main-failed-totals-f07fea7-2026-10-12T20-28-16-573Z.json`; separate Arabic-desktop Home/End test expects completed after a legitimate native return rearms approaching; corrected contract awaits new-source checks |
| Deterministic preceding-header reflow baseline | FAIL: four EN/AR desktop/phone cases, zero retries | `.tools/venue-header-reflow-public-before.log` and retained result directory; a 31px header-only mutation leaves overview dimensions unchanged and the authored gate stale |
| Parent-layout correction, follow-up release and final actual-public visual | PENDING | No corrected-source checks or publication pass is inferred from the PR65 receipts |
| Physical iPhone Safari, Android and real screen readers | NOT TESTED | Browser emulation/synthesized input does not establish hardware UAT |

No browser pass, hosted pass or publication is claimed before its actual result.
Root will append corrected-source checks, follow-up release and final public
results after completion. PR65 is published but its final verification failed.
Original failures and unrelated user work remain intact. No
commit, push, merge, hosted mutation or application/test edit is performed by
this documentation lane.

## Verified publication receipts — 12 October 2026

The input correction is published through
[PR65](https://github.com/xpexellent-dotcom/msrc-2027/pull/65). Reviewed head
`5847ffa0c43ef62d50295827ad7d933240caddb9` passes all three exact-head PR
workflows, ten substantive jobs, eleven actual checks and Vercel status. Public
CI totals are 671 passes / 57 intentional skips / zero failures across 728 cases.
Lint/types, 2,401 units in 61 files, 81 generated pages and 81 smoke checks pass;
Contact 44, participant 88 + 4 skips and staff 102 + 8 skips pass. All three disposable
SQL jobs pass 1,023 assertions in 13 files with clean schema/advisors. Complete
receipt: `.tools/venue-input-complete-5847ffa-2026-10-12T20-10-55-673Z.json`.

Owned READY Preview `dpl_4Zid3q2E98HGUZsG6rsQQmiHkAdM` matches the expected
project/team/repository/branch and exact reviewed source. Protected EN/AR GETs
return 200 with entry/collage/stage/Journey/control markers:
`.tools/venue-input-preview-http.json`. The single guarded merge confirms actual
merge `f07fea733864a83e866b624a6f89824df1154853`:
`.tools/venue-input-merge.json`. Independent main/PR inspection confirms equal
reviewed and merged trees `27c169b50775a7d487e7200b1cdd30cb70c29869`:
`.tools/venue-input-main-f07fea7-2026-10-12T20-16-04-431Z.json`.

Owned READY Production `dpl_avrZLkeoXi78JUTwHsNNYzpvFtKf` is source Git,
GitSource/main and metadata at that exact merge, expected project
`prj_R1XVydvYu17VPSTM3lNb1trWw9u9` and team
`team_8DBVOTW6s9ihVkUP69COuwG8`. Both www.msrc2027.com and msrc2027.com
point to that deployment. Identity receipt:
`.tools/venue-input-production-after-2026-10-12T20-16-54-518Z.json`.
Actual public read-only verification passes 97/97 GET/HEAD checks, zero failures:
`.tools/venue-input-live-http.json` (20:16:56 UTC). HTTP content alone is not
source proof; the independently verified serving SHA equals the expected merge.

Local supported WebKit cases pass: phone 10 and desktop 6. Preserve the raw phone
attempt's four CDP bootstrap failures; those Chromium-only native-input paths
remain NOT TESTED in WebKit, rather than being represented as passed. The EN/AR
native 12px probe preserves partial charge 0.317 through a pause, reduces it to 0.292
on reversal, then lands at Airport with native continuation. Receipt:
`.tools/venue-input-slow-final.json`. Bounded local CUA desktop-fast and Arabic
phone visual review passes; screenshots are retained under
`.impeccable/review/venue-input-resilience/`, and viewport overrides are reset.

Subsequent actual-public browser and independent push/main checks FAIL as recorded
below. Those failures do not erase the valid exact-head PR, deployment-identity,
HTTP or local receipts above; they prevent a full final-verification claim.
Final actual-public visual confirmation and the corrected-source follow-up remain
PENDING. Physical iPhone Safari, Android and real screen readers remain NOT TESTED.
No operational activation, hosted-setting change or hardware UAT is inferred.

## Final verification failure and parent-layout correction

The published f07fea7 browser run finishes with 79 passes / 16 intentional skips /
two failures across 97 cases, zero retries. Arabic-phone fresh natural touch fails
at `tests/e2e/venue-journey.spec.ts:855` with a 30.546875px held-gate difference;
persistent/reverse charge fails at line 892 with 31px. Preserve the actual-public
log, screenshots, contexts and traces in `.tools/venue-input-live-browser.log` and
`.tools/venue-input-live-browser-results/`. These are application alignment failures,
not fixture synchronization or unsupported-browser capability failures.

Inspection of the original failed trace by the test lane independently confirms
a stale authored gate of 1161.05px against the current 1130.453px boundary.
The preceding Arabic header changes height after
initialization while the overview's own dimensions remain unchanged. A resize
observer attached only to that overview cannot detect its shifted document
position. Four new deterministic EN/AR desktop/phone regressions against the
actual-public f07fea7 source all FAIL, zero retries: changing only the preceding
header by 31px keeps the overview dimensions unchanged and leaves the authored
gate stale by 31px. Preserve `.tools/venue-header-reflow-public-before.log` and
`.tools/venue-header-reflow-public-before-results/`. The loaded-font control in
`.tools/venue-live-ar-boundary-diagnostic.json` instead reports matching authored
1130.45px / independent 1130.453125px gates throughout native approach and ends
charging at Y1130; it does not reproduce the original late-layout race.

Root's four-line local correction on `codex/venue-entry-layout-resilience` observes
the parent hero layout and remeasures the absolute gate. The test lane's regression
checks approach and partial-charge reflow with independent 1px alignment assertions,
preserving earned progress and the approved framing/timeline. No final new-source
check or publication result is claimed yet.

| Priority | Before | Planned correction | Why |
| --- | --- | --- | --- |
| 1 | Overview-only size observation misses movement caused by the preceding header | Observe parent hero layout and remeasure the absolute hold boundary when it changes | Keep the held overview aligned after upstream reflow |
| 1 | Normal input tests do not deterministically move upstream layout after initialization | Add an EN/AR upstream-reflow regression with an independently measured boundary and the existing 1px assertions | Reproduce the real failure without weakening tests or adding retries |
| 1 | Earlier green local/PR checks can obscure later public failures | Verify the corrected source through a follow-up PR, exact-head CI, owned Production and fresh public checks | Establish evidence for the actual serving correction |

Independent push/main CI also fails at f07fea7: nine of ten substantive jobs pass,
with public totals of 670 passes / 57 intentional skips / one failure across 728
cases. Public shard 2's Arabic-desktop Home/End interruption check expects completed
at `tests/e2e/venue-journey.spec.ts:1061` but receives approaching. The test lane
confirms this is a separate state-contract mismatch: native Control+Home returns
well above the overview and legitimately rearms approaching. The corrected test
first waits for the actual native document edge, then requires Home approaching /
End completed. Exact alignment, single release, fragment/history, restored styles,
placeholder/inert cleanup and zero charge assertions remain strict. The original
failed main receipt remains FAIL; no corrected test pass is inferred. Receipts:
`.tools/venue-input-main-failure-f07fea7-2026-10-12T20-28-16-428Z.json` and
`.tools/venue-input-main-failed-totals-f07fea7-2026-10-12T20-28-16-573Z.json`.

Corrected-source checks, follow-up commit/PR, exact-head CI, owned serving proof,
fresh actual-public browser checks and final actual-public visual confirmation
are PENDING. Current publication remains PR65/f07fea7 until a verified follow-up;
these notes claim no new application, test, Git or hosted action by this lane.

### Corrected layout observation, 12 October 2026

The follow-up observes the shared `.venue-gallery-hero` as well as the stage with
the existing ResizeObserver and geometry fingerprint. A preceding header reflow
therefore refreshes the document-space boundary even when stage height is constant.
The existing hold, earned charge, scene, release timing and direct paths remain.
No additional document-wide observer or permanent animation loop is introduced.

PASS complete corrected-source check: lint/types, 2,401 units in 61 files and
81-page build; `.tools/venue-layout-resilience-check.log`. PASS focused Chromium:
six passed/two intentional phone keyboard skips/zero failures or retries; all
four upstream-reflow cases and two desktop terminal-key cases pass.
`.tools/venue-layout-focused.log`; original four public failures remain preserved.
PASS mechanical Impeccable detector: no findings,
`.tools/venue-layout-resilience-design-detect.json`. Full affected browser checks,
follow-up exact-head CI/Preview, Production and final public verification are
PENDING. Application and test source are frozen for that verification.
