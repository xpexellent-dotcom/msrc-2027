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
| Corrected parent-layout local check | PASS: lint/types, 2,401 units / 61 files and 81-page build | `.tools/venue-layout-resilience-check.log`; four-line application correction retains the approved scene/input contract |
| Corrected parent-layout focused and full Chromium checks | PASS: focused six passes / two intentional skips; full 85 passes / 16 intentional skips across 101 cases; zero failures or retries | `.tools/venue-layout-focused.log`, `.tools/venue-layout-broad.log`; independent reflow/alignment and native-edge assertions remain strict |
| Corrected parent-layout Impeccable mechanical detector | PASS: no findings | `.tools/venue-layout-resilience-design-detect.json`; mechanical source review does not establish visual/hardware UAT |
| PR66 exact-head owned Preview | PASS: READY exact af9c63d, protected EN/AR GET 200 | `.tools/venue-layout-preview-http.json`; deployment dpl_HE5Q1azEYfxXxpgVfz6Tuo8aaprz matches the reviewed branch/source |
| Corrected-source supported WebKit checks | PASS: desktop eight / phone ten cases, zero retries | `.tools/venue-layout-webkit-desktop.log`, `.tools/venue-layout-webkit-phone.log`; CDP-only phone paths remain unsupported and NOT TESTED in WebKit |
| Corrected-source local Arabic-phone visual | PASS: authored 1151.67px / independent 1151.671875px gate; viewport reset | `.impeccable/review/venue-input-resilience/local-corrected-phone-ar.png`; local visual evidence, not final public/hardware UAT |
| PR66 exact-head CI | PASS: three workflows / ten substantive jobs / eleven checks / Vercel; public 675 passes / 57 skips / zero failures | `.tools/venue-layout-complete-af9c63d-2026-10-12T20-53-11-970Z.json`; exact reviewed af9c63d source |
| PR66 guarded merge and owned Production | PASS: merge 64fa6b7, equal reviewed/merged tree, READY exact Git/main source and both aliases | `.tools/venue-layout-merge.json`, `.tools/venue-scroll-layout-production-first.json`, `.tools/venue-layout-production-after-2026-10-12T20-56-43-869Z.json` |
| Corrected-source actual-public HTTP checks | PASS: 97/97 GET/HEAD checks, zero failures | `.tools/venue-layout-live-http.json`; serving SHA independently verifies exact 64fa6b7 merge |
| Corrected-source actual-public browser | PASS: 85 passes / 16 intentional skips / zero failures or retries across 101 cases | `.tools/venue-layout-live-browser.log`; published serving source 64fa6b7 |
| Corrected-source final actual-public CUA visual | PASS: native desktop hold/reversal/one release/continuation; Arabic-phone gate/Begin/compact map; viewport reset | `.impeccable/review/venue-input-resilience/live-final-desktop-receipt.json`, `live-final-phone-receipt.json` and screenshots; physical hardware remains untested |
| Independent push/main CI at corrected 64fa6b7 source | FAIL: eight of ten jobs pass; public 671 passes / 57 skips / four failures | `.tools/venue-layout-main-failed-totals-64fa6b7-2026-10-12T21-10-30-888Z.json`; shard 1 responsive-image navigation and shard 3 Venue phone charge-preservation failures remain separate |
| Charging-only anchoring correction and restoration coverage | PASS local complete/focused/full Chromium and prior 3dc hosted gate; fixture-only new-head gate PENDING | `.tools/venue-boundary-check.log`, `.tools/venue-boundary-focused.log`, `.tools/venue-boundary-broad.log`; scoped hero opt-out restores prior value/priority, while original Linux failures and passing Windows controls remain distinct |
| Focused matrix layout readiness correction | PASS: two EN/AR cases | `.tools/venue-boundary-matrix.log`; DOMContentLoaded plus the same font/layout assertions, routes, widths, screenshots and 30-second budget |
| PR67 exact-head owned Preview | PASS: READY exact 3dc37fc, protected EN/AR GET 200 | `.tools/venue-boundary-preview-http.json`; deployment dpl_35GgyENKhwnFefY11g966kSWbeoo, expected branch codex/venue-layout-charge-accounting |
| PR67 prior 3dc37fc exact-head CI | PASS: three workflows / ten substantive jobs / eleven checks / real Vercel; public 677 passes / 59 skips / zero failures across 736 cases | `.tools/venue-charge-complete-3dc37fc-2026-10-12T21-43-51-060Z.json`; this verifies 3dc only, not a forthcoming fixture-only head |
| PR67 scoped WebKit phone | PASS: ten of ten | `.tools/venue-boundary-webkit-phone.log`; CDP-only phone native-input paths remain unsupported and NOT TESTED in WebKit |
| PR67 original scoped WebKit desktop attempt | FAIL: nine passes / one Arabic authored-style restoration failure | `.tools/venue-boundary-webkit-desktop.log` and retained results; detached hero reads none !important rather than prior auto !important at venue-journey.spec.ts:1218 |
| PR67 WebKit cleanup diagnostic | PASS observed restoration: detached at 1452ms, exact prior style/ownership cleanup at 1490ms, stable for 60 frames | `.tools/venue-boundary-webkit-cleanup-diagnostic.json`, log and trace; identifies a readiness race in this flow, not a persistent leak; original nine-pass/one-failure run remains FAIL |
| PR67 exact detached-tuple polling correction | PASS: focused Chromium two / WebKit two; supported WebKit desktop ten of ten, zero retries in 44.6s | `.tools/venue-boundary-cleanup-chromium-focused.log`, `.tools/venue-boundary-cleanup-webkit-focused.log`, `.tools/venue-boundary-webkit-desktop-confirmed.log`; exact tuple retained, no timeout/retry/tolerance change |
| Fixture-only scoped lint/types | PASS: exact-fixture ESLint and TypeScript noEmit | Application code unchanged; forthcoming test-only head still needs fresh CI/Preview evidence |
| Corrective release/new-source public/visual verification | PENDING | Current public remains PR66/64fa6b7; root has not merged PR67 or changed serving source |
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
The corrected-source follow-up is published below; its actual-public browser and
final visual review pass. Independent main CI fails with diagnosis pending.
Physical iPhone Safari, Android and real screen readers remain NOT TESTED.
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
preserving earned progress and the approved framing/timeline. Local corrected-source
checks and the verified follow-up publication pass as recorded below. The original
PR65 final-verification failures remain historical evidence.

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
failed main receipt remains FAIL; the corrected focused/full local passes have
separate evidence below. Receipts:
`.tools/venue-input-main-failure-f07fea7-2026-10-12T20-28-16-428Z.json` and
`.tools/venue-input-main-failed-totals-f07fea7-2026-10-12T20-28-16-573Z.json`.

Corrected-source local checks, PR66 CI/Preview, guarded merge, owned Production
and actual-public HTTP checks pass below. Current publication is PR66/64fa6b7;
actual-public browser and final visual review pass; independent main CI fails
with diagnosis pending as recorded below;
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
PASS final corrected-source Chromium suite: 85 passes / 16 intentional skips /
zero failures or retries across 101 cases; `.tools/venue-layout-broad.log`.
PASS mechanical Impeccable detector: no findings,
`.tools/venue-layout-resilience-design-detect.json`. These are corrected-source
local receipts, separate from the preserved PR65 public failures.

[PR66](https://github.com/xpexellent-dotcom/msrc-2027/pull/66) reviewed head
`af9c63d043e73df6967b3f2d94e55a57cbb9dbfa` is frozen against base
`f07fea733864a83e866b624a6f89824df1154853` on
`codex/venue-entry-layout-resilience`. Owned READY Preview
`dpl_HE5Q1azEYfxXxpgVfz6Tuo8aaprz` matches that exact head and branch.
Protected EN/AR GETs return 200 with entry/collage/stage/Journey/control markers:
`.tools/venue-layout-preview-http.json` (20:42:51 UTC). No Production result is
inferred from those Preview responses.

Current supported WebKit cases PASS: desktop eight and phone ten, zero retries;
`.tools/venue-layout-webkit-desktop.log`, `.tools/venue-layout-webkit-phone.log`.
CDP-only phone native-input paths remain unsupported and NOT TESTED in WebKit.
Local corrected Arabic-phone CUA visual review passes: authored gate 1151.67px
agrees with independently measured 1151.671875px; viewport overrides are reset.
Screenshot: `.impeccable/review/venue-input-resilience/local-corrected-phone-ar.png`.

### Verified corrected-source publication, 12 October 2026

All three PR66 exact-head workflows, ten substantive jobs, eleven actual checks
and Vercel status PASS. Public CI totals: 675 passes / 57 intentional skips / zero
failures across 732 cases. Lint/types, 2,401 units / 61 files, 81-page build and
81 browser smoke checks pass. Contact 44, participant 88 + 4 skips and staff
102 + 8 skips pass; each disposable SQL job passes 1,023 assertions / 13 files
with clean advisors. Exact-head receipt:
`.tools/venue-layout-complete-af9c63d-2026-10-12T20-53-11-970Z.json`.

The guarded merge records actual main source
`64fa6b7d085634410a7c40ffc906a0770a9816aa`, parent f07fea7:
`.tools/venue-layout-merge.json`. Independent inspection confirms equal reviewed /
merged tree `d91731951117a4b038af56f2b2c8ff59ecf5c797`:
`.tools/venue-layout-main-64fa6b7-2026-10-12T20-56-18-785Z.json`.

Owned READY Production `dpl_6sFGkiyKNeya7vdqD3jeyTNs3ZXz` is Git/main at the
exact merge, expected project `prj_R1XVydvYu17VPSTM3lNb1trWw9u9` and team
`team_8DBVOTW6s9ihVkUP69COuwG8`, with www.msrc2027.com and msrc2027.com
aliases. Root's first proof and independent inspection agree:
`.tools/venue-scroll-layout-production-first.json`,
`.tools/venue-layout-production-after-2026-10-12T20-56-43-869Z.json`.
Read-only actual-public GET/HEAD checks PASS 97/97 with zero failures, and expected /
independently verified serving SHA both equal that merge:
`.tools/venue-layout-live-http.json` (20:56:39 UTC).

PASS final actual-public Venue suite: 85 passes / 16 intentional skips / zero
failures or retries across 101 cases; `.tools/venue-layout-live-browser.log`.
PASS final actual-public CUA visual review. Desktop native input holds Y591 at
charge 0.389, reverses to 0.164 at the same position, then releases once to Airport
Y1311/top -0.09375px. Native continuation reaches Y1419 with release count one.
Arabic-phone authored 1151.67px gate matches independently measured 1151.671875px;
shared Begin lands at Airport Y1911/top 365.921875px with readable compact-map
composition. Receipts:
`.impeccable/review/venue-input-resilience/live-final-desktop-receipt.json`,
`.impeccable/review/venue-input-resilience/live-final-phone-receipt.json`;
screenshots `live-final-held-glow.png`, `live-final-airport.png` and
`live-final-phone-ar.png`. Viewport overrides are reset. Application and test
source stay frozen; these supplemental documentation updates do not create
another commit. Physical iPhone Safari, Android and real screen readers remain
NOT TESTED; no operational activation or hosted-setting change is inferred.

### Independent main CI failures — diagnosis pending

Independent push/main CI at the same 64fa6b7 source FAILS: eight of ten substantive
jobs pass. Public totals are 671 passes / 57 intentional skips / four failures
across 732 cases. Preserve the complete result:
`.tools/venue-layout-main-failed-totals-64fa6b7-2026-10-12T21-10-30-888Z.json`.

Public shard 1 fails the EN/AR `conference-experience.spec.ts` responsive matrix
at load navigation to `/en/3mt` and `/ar/3mt`. Hosted trace inspection reports
HTML 200 followed by a decorative-image optimizer wait; the wait is distinguished
from aggregate matrix duration. Receipt:
`.tools/venue-layout-main-failure-64fa6b7-2026-10-12T21-04-55-430Z.json`.

Public shard 3 fails both EN/AR phone Venue header-reflow cases at
`tests/e2e/venue-journey.spec.ts:931`: charge-preservation expects 0.263 / 0.262
but receives 0.366 / 0.363 after the 31px header mutation. These are Venue-specific
failures, separate from shard 1's navigation wait; no fixture or application cause
is asserted before diagnosis. Receipt:
`.tools/venue-layout-main-shard3-failure-64fa6b7-2026-10-12T21-10-30-821Z.json`.

The scoped anchoring/readiness correction below awaits new-source verification. The owned
published source, exact-head PR CI and actual-public Venue checks above pass their
observed scenarios. They do not establish green independent main CI or full
overall release verification. Preserve the earlier PR65 failures and every
current failed result without retries, longer timeouts or weaker assertions.

### Charging-only anchoring and matrix readiness — 13 October 2026

Root's follow-up branch `codex/venue-layout-charge-accounting` starts from actual
published main `64fa6b7d085634410a7c40ffc906a0770a9816aa`. Source review identifies
why a 31px upstream shift can add roughly 31/300 charge: native scroll-anchor
compensation generates a scroll event, and scroll handling can run before parent
ResizeObserver delivery. The charging controller reads current Y against its
cached gate under recent touch intent, so layout compensation is counted as
earned movement before observation restores alignment. The event ordering is
supported by the [HTML rendering steps](https://html.spec.whatwg.org/multipage/webappapis.html#update-the-rendering)
and [CSS scroll anchoring draft](https://drafts.csswg.org/css-scroll-anchoring/#scroll-adjustment).
This is source/standards analysis of the saved Linux failure, not a newly observed
Windows reproduction.

| Priority | Before | Scoped correction | Why |
| --- | --- | --- | --- |
| 1 | A held overview can supply a browser anchor whose compensation earns charge | Own `overflow-anchor: none !important` on the shared hero only while charging; restore its exact prior inline value/priority on every exit and cleanup | Exclude layout compensation while preserving actual native wheel/touch displacement |
| 1 | Restoration and quiet charged reflow are not explicitly exercised | Add restoration coverage and a 200ms quiet pause before reflow | Verify unchanged earned charge, native controls and complete owned-style cleanup |
| 1 | The responsive geometry matrix waits for decorative images to finish loading | Wait for DOMContentLoaded, then the existing font and layout checks | Test its intended geometry readiness without masking the image optimizer wait |

The application correction leaves parent ResizeObserver measurement, observed-Y
baselines, native-fling accounting, persistent/reversible charge, thresholds and
the authored scene unchanged. The anchoring exclusion affects only the shared
overview during its charged hold; it adds no whole-site scroll lock or permanent
CSS rule. All state exits and effect cleanup restore the previous inline value
and priority. New restoration tests and the quiet-pause regression retain strict
charge/alignment assertions.

The old Windows server at 3211 passes both EN/AR phone reflow cases:
`.tools/venue-boundary-charge-before.log`. This is a passing control, NOT a new
red baseline or proof the Linux failure is fixed. The original Linux main trace
and `.tools/venue-layout-main-shard3-failure-64fa6b7-2026-10-12T21-10-30-821Z.json`
remain the failure evidence.

The matrix changes only `page.goto` readiness to DOMContentLoaded. Font waits,
routes, widths, overflow/heading assertions, screenshots and the 30-second budget
remain unchanged. Focused EN/AR matrix PASS: two cases;
`.tools/venue-boundary-matrix.log`. Original trace reconstruction is retained at
`.tools/venue-layout-main-matrix-trace-64fa-20261012-211254.json`. A separate
Production optimized 828px gallery JPEG returns HTTP 200, 37,860 bytes in 911ms;
that observation does not establish a fix for the self-hosted optimizer stall.
No retry, timeout increase or media replacement is added.

New-source complete/focused/full Chromium and owned Preview checks pass below.
Fixture-only new-head exact CI/Preview, guarded merge, owned Production and fresh
actual-public/visual verification are PENDING. Current public source remains PR66/64fa6b7. Earlier
local/PR/public passes and all failures stay preserved; physical devices and real
screen readers remain NOT TESTED. This documentation lane performs no source,
test, Git or hosted mutation.

### Corrected anchoring check, 13 October 2026

PASS complete new-source lint/types, 2,401 units in 61 files and 81-page build;
`.tools/venue-boundary-check.log`. PASS focused Chromium: 16 passed/four
intentional phone keyboard skips/zero failures or retries;
`.tools/venue-boundary-focused.log`. Reflow retains exact charge equality, current
1px boundary alignment and the original real native-input/release assertions.
Restoration covers authored inline value/priority through reversal, Escape,
Begin, Home/End and real client-navigation unmount. Mechanical Impeccable detector
has no findings, `.tools/venue-boundary-design-detect.json`. Final affected local
Chromium suite PASS: 87 passes / 18 intentional skips / zero failures or retries
across 105 cases; `.tools/venue-boundary-broad.log`. Original Linux failed traces
and passing Windows controls remain preserved separately.

[PR67](https://github.com/xpexellent-dotcom/msrc-2027/pull/67) reviewed head
`3dc37fc139230b33452a45248cb82639be50f8db` is frozen against base
`64fa6b7d085634410a7c40ffc906a0770a9816aa` on
`codex/venue-layout-charge-accounting`. Owned READY Preview
`dpl_35GgyENKhwnFefY11g966kSWbeoo` matches that exact source and expected branch.
Protected EN/AR GETs return 200 with entry/collage/stage/Journey/control markers:
`.tools/venue-boundary-preview-http.json` (21:35:11 UTC on 12 October).

The complete prior 3dc37fc exact-head hosted gate PASS: three workflows / ten
substantive jobs / eleven actual checks / real Vercel status, with public totals
677 passes / 59 intentional skips / zero failures across 736 cases:
`.tools/venue-charge-complete-3dc37fc-2026-10-12T21-43-51-060Z.json`.
This is evidence for the original head; it cannot verify the forthcoming fixture
commit. Scoped WebKit phone PASS: ten of ten;
`.tools/venue-boundary-webkit-phone.log`. Scoped WebKit desktop FAIL: nine passes /
one failure, zero retries; `.tools/venue-boundary-webkit-desktop.log`. The Arabic
authored-style restoration case at `tests/e2e/venue-journey.spec.ts:1218` reads
`{ connected: false, value: "none", priority: "important" }` where the prior
`auto !important` is expected. Preserve screenshots, context and trace under
`.tools/venue-boundary-webkit-desktop-results/`. This is an observed application
assertion failure; preserve it as FAIL even though the subsequent diagnostic
identifies a readiness race. Application code remains frozen at 3dc37fc.
Unsupported CDP-only phone native-input paths remain NOT TESTED in WebKit.
Root has not merged PR67 or changed public source PR66/64fa6b7.
Guarded merge, new-source Production identity, fresh public HTTP/browser and
visual verification remain PENDING. These supplemental local docs do not create
another commit or change frozen application/tests. Physical devices and real
screen readers remain NOT TESTED.

### WebKit authored-style cleanup readiness — 13 October 2026

The single instrumented Arabic WebKit diagnostic records route detachment at
1452ms: retained hero/stage are disconnected and live portal/glow/veil counts
are zero, while the detached hero still has `none !important`. At 1490ms,
the exact prior `auto !important` is restored, the stage ownership attributes and
authored gate are cleared, portal readiness is removed and charge is zero. Those
restored values persist for 60 rendered frames. Preserve
`.tools/venue-boundary-webkit-cleanup-diagnostic.json`,
`.tools/venue-boundary-webkit-cleanup-diagnostic.log` and
`.tools/venue-boundary-webkit-cleanup-diagnostic-trace.zip`. This demonstrates
post-detachment effect cleanup and a test-readiness race in the observed flow;
it does not erase the original failing desktop assertion or establish hardware UAT.

The test lane changes only the immediate detached tuple assertion to standard
`expect.poll` with the identical expected disconnected/value/priority tuple.
No timeout, retry, tolerance or application code change is added. Corrected
focused cleanup checks PASS: Chromium two of two and WebKit two of two;
`.tools/venue-boundary-cleanup-chromium-focused.log`,
`.tools/venue-boundary-cleanup-webkit-focused.log`. The complete supported WebKit
desktop check now PASS ten of ten, zero retries in 44.6s;
`.tools/venue-boundary-webkit-desktop-confirmed.log` and retained results.
WebKit phone remains PASS ten of ten. Root's exact-fixture ESLint and TypeScript
noEmit checks PASS. The original nine-pass/one-failure desktop log and diagnostic
remain preserved. Application
implementation stays frozen at 3dc37fc, and PR67 remains unmerged. A forthcoming
test-only commit will require fresh exact-head CI and owned Preview evidence;
the existing 3dc37fc receipts remain valid historical evidence but cannot verify
that future head. New-source guarded release/public checks remain PENDING.
