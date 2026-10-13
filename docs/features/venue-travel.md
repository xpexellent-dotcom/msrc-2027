# Getting there — 5 October 2026

## Current input resilience follow-up — ENG-038, 12 October 2026

13 October follow-up: current public source remains PR66/64fa6b7. Source review
identifies scroll-anchor compensation being credited as input before parent
ResizeObserver delivery during partial charge. On
`codex/venue-layout-charge-accounting`, the shared hero now owns
`overflow-anchor: none !important` only while charging; every exit and effect
cleanup restore the prior inline value/priority. Parent observation and genuine
native displacement accounting remain unchanged. Restoration/quiet-reflow tests
are added; the old Windows baseline passes two cases and is not a new failure
reproducer. Original Linux main failures remain primary evidence. New-source
lint/types, 2,401-unit/61-file and 81-page build checks PASS. Focused entrance
checks PASS 16 cases with four intentional phone keyboard skips, zero retries;
`.tools/venue-boundary-check.log` and `.tools/venue-boundary-focused.log`.
Final affected local Chromium checks PASS: 87 passes / 18 intentional skips /
zero failures or retries across 105 cases; `.tools/venue-boundary-broad.log`.
PR67 reviewed head `3dc37fc139230b33452a45248cb82639be50f8db` is frozen against
base `64fa6b7d085634410a7c40ffc906a0770a9816aa`. Owned READY exact-head Preview
`dpl_35GgyENKhwnFefY11g966kSWbeoo` passes protected EN/AR GET 200;
`.tools/venue-boundary-preview-http.json`. The complete prior 3dc37fc hosted gate
PASS: three workflows / ten jobs / eleven checks / real Vercel status, with
public 677 passes / 59 skips / zero failures across 736 cases;
`.tools/venue-charge-complete-3dc37fc-2026-10-12T21-43-51-060Z.json`.
Scoped WebKit phone PASS ten of ten. Preserve the original desktop FAIL with
nine passes / one Arabic detached authored-style restoration failure
at `tests/e2e/venue-journey.spec.ts:1218` (`none !important` read where prior
`auto !important` is expected). The instrumented diagnostic confirms detachment at
1452ms followed by exact restoration/ownership cleanup at 1490ms, stable for 60
frames: a test-readiness race in this flow, not a persistent leak. The test lane
uses standard `expect.poll` for the same exact detached tuple, with no increased
timeout, retry or tolerance. Corrected cleanup checks PASS Chromium two / WebKit
two, and confirmed scoped WebKit desktop PASS ten of ten, zero retries in 44.6s;
`.tools/venue-boundary-cleanup-chromium-focused.log`,
`.tools/venue-boundary-cleanup-webkit-focused.log`,
`.tools/venue-boundary-webkit-desktop-confirmed.log`. Exact-fixture ESLint and
TypeScript noEmit checks PASS. Original failure/diagnostic logs:
`.tools/venue-boundary-webkit-phone.log`, `.tools/venue-boundary-webkit-desktop.log`
and `.tools/venue-boundary-webkit-cleanup-diagnostic.json`. Application code remains
frozen at 3dc37fc; the forthcoming test-only commit needs fresh CI/Preview proof.
Root has not merged PR67 or changed public source 64fa6b7;
corrective release/new-source public/visual verification are PENDING.
PR: https://github.com/xpexellent-dotcom/msrc-2027/pull/67.
The separate matrix readiness change waits for DOMContentLoaded plus
the same fonts/layout assertions; its two EN/AR focused cases PASS with routes,
widths, screenshots and the 30-second budget intact. The self-hosted image optimizer
stall is not claimed fixed. Audit: `docs/reviews/venue-input-resilience.md`.

The corrected layout observation also watches the shared intro, catching header
reflow that moves the overview without resizing it. Its complete lint/types,
2,401-unit/61-file and 81-page build check passes. Six focused browser cases pass
with two intentional phone keyboard skips, retaining all exact alignment,
single-release, history and cleanup assertions. The final 101-case corrected-source
Chromium run passes 85 cases with 16 intentional skips, zero failures or retries;
`.tools/venue-layout-broad.log`. PR66 reviewed head
`af9c63d043e73df6967b3f2d94e55a57cbb9dbfa`, base
`f07fea733864a83e866b624a6f89824df1154853`, is frozen; the application fix is
four lines observing the parent layout. Owned READY exact-head Preview
`dpl_HE5Q1azEYfxXxpgVfz6Tuo8aaprz` passes protected EN/AR GET 200;
`.tools/venue-layout-preview-http.json`. Current supported WebKit desktop eight /
phone ten checks PASS, zero retries; CDP-only phone input remains NOT TESTED in
WebKit. Local corrected Arabic-phone visual review passes with matching authored /
independent gates (1151.67px / 1151.671875px), and the viewport is reset.

PR66 is guarded-merged as `64fa6b7d085634410a7c40ffc906a0770a9816aa`, with
equal reviewed/merged tree `d91731951117a4b038af56f2b2c8ff59ecf5c797`.
All three exact-head workflows, ten substantive jobs, eleven actual checks and
Vercel status PASS; public totals: 675 passes / 57 intentional skips / zero failures
across 732 cases. Owned READY Production `dpl_6sFGkiyKNeya7vdqD3jeyTNs3ZXz`
serves Git/main at that exact merge on both public aliases; independent source
proof agrees and 97/97 actual-public GET/HEAD checks pass. The final 101-case
actual-public browser suite passes 85 cases / 16 intentional skips with zero
failures or retries; `.tools/venue-layout-live-browser.log`. Final live CUA desktop
hold/reversal/single release/native continuation and Arabic-phone Begin/map visual
review pass, with viewport reset; `.impeccable/review/venue-input-resilience/live-final-*`.

Independent push/main CI FAILS: eight of ten jobs pass, with public totals of
671 passes / 57 skips / four failures. Shard 1's EN/AR responsive matrix waits for
decorative image optimization after HTML 200; shard 3's EN/AR phone Venue reflow
test reports a charge change after the 31px header mutation. The latter is a
Venue-specific failure; the charge-only anchoring correction above awaits
new-source verification.
Public serving/Venue passes do not establish full main CI or overall release
verification. All earlier PR65 failures remain preserved.
PR: https://github.com/xpexellent-dotcom/msrc-2027/pull/66.

The organizer's fast desktop report exposed bypassed or undercharged entry.
The published correction preserves full normalized earned effort, recovers eligible
native crossings from actual scroll movement, excludes owned clamps and flushes
pending movement before consuming another packet. Reverse input carries remaining
upward distance naturally. The held overview displays earned glow before the same
850ms real-Journey reveal; no extra overview scroll range or new dependency is added.
A bounded positive wheel tail protects the exact landing while reversal/fresh
gestures stay responsive; a genuine return above the gate rearms entry. Existing
map/scene geometry, approved facts, EN/AR/RTL, controls and direct accessibility
paths remain authoritative.

Earlier PR65 local lint/types, 2,401 units/61 files and 81-page build PASS, along with 81
affected Chromium cases/16 intentional skips and supported WebKit phone 10/desktop 6.
Four CDP-only phone paths are NOT TESTED in WebKit. Native slow 12px EN/AR probes
and local desktop-fast/Arabic-phone visual review pass; viewport reset.
PR65 reviewed head `5847ffa0c43ef62d50295827ad7d933240caddb9` is merged as
`f07fea733864a83e866b624a6f89824df1154853`, with equal reviewed/merged trees.
All three PR workflows, ten jobs, eleven actual checks and Vercel pass; public
CI totals: 671 passes/57 intentional skips/zero failures. Owned exact-head Preview
is READY. Owned READY Production `dpl_avrZLkeoXi78JUTwHsNNYzpvFtKf` serves
Git/main at the exact merge on both public aliases; 97 public GET/HEAD checks pass.
Final verification FAILS despite those valid publication receipts: the actual-public
browser run finishes with 79 passes / 16 intentional skips / two Arabic-phone held-gate
failures, zero retries. The preceding Arabic header reflows after initialization;
the overview keeps the same size but moves, leaving its cached gate about 31px stale.
Four deterministic EN/AR desktop/phone public regressions reproduce the 31px stale
gate after a preceding-header-only mutation, zero retries. The narrow local
correction observes the parent hero layout and adds upstream-reflow coverage with
independent 1px alignment assertions. Independent
push/main CI also FAILS: nine of ten jobs pass, with a separate Arabic-desktop
Home/End interruption failure in public shard 2; public totals are 670 passes /
57 skips / one failure. Native Control+Home legitimately rearms approaching after
returning above the opening; the test lane now waits for the document edge and
asserts Home approaching / End completed with the existing cleanup/history checks.
Corrected-source local checks, PR66 CI/Preview, merge, Production and public HTTP
checks pass as recorded above; current published source is 64fa6b7. Its current
actual-public browser and CUA visual checks pass; independent main CI fails with
diagnosis pending as recorded above. Authority applies only to public
UI; operational workflows/settings/data remain untouched. Physical devices and
screen readers remain NOT TESTED. Audit and retained failure evidence:
`docs/reviews/venue-input-resilience.md`. IDs: SCP-02, DSN-01/02, ACC-01,
LOC-01/02/03, MED-01/04, PRV-03, REL-06.

## Published Venue entrance correction — ENG-037, 12 October 2026

The latest organizer instruction replaces the unreliable approach gate with a
scroll-powered hold, persistent charge and one 850ms reveal of the real Journey.
The centered Begin action uses the same scene; reduced-motion and short/enlarged
reading retain direct entry. Wheel input is observed before approach. A touch
gesture may own the bounded final approach only when its first move is deliberate,
single-finger, cancelable and begun within two viewports of the measured gate.
Pauses do not add or remove charge; reversal reduces it. The incoming section's
flow placeholder, temporary pinning, heading reveal and restrained atlas parallax
restore before the exact native Airport landing. Normal journey scrolling,
map controls, disclosures, EN/AR/RTL, keyboard escapes and pinch zoom remain.

This changes the public entrance interaction only. The current self-hosted campus
and city geometry, attribution, selected venue photographs, Google/Apple outbound
actions, approved travel/arrival guidance and closed operational workflows remain.
No provider request, dependency, operational flag or new public fact is added.
Published through PR64: reviewed head
`2bd6f128fd96b810ab972e3b19e44447c93212c9` merged as
`47c1505b019daf1dcefa6fafa05d9e481e5ff8e3`. All three exact-head PR workflows,
ten substantive jobs and ten actual checks pass. Owned READY Preview and
protected EN/AR HTTP 200 match that reviewed source. Owned READY Production
`dpl_3WU9wQFKfxe54Gde8PbygaYtgMKZ` serves the exact merge from Git/main on
both public aliases; 97 actual public GET/HEAD checks pass. The actual-public
affected browser suite passes 73 cases with eight intentional skips, zero failures
and zero retries. Independent merged/main CI passes all three workflows, ten jobs
and ten real checks. Native live desktop visual review confirms the stationary
hold, reversible glow, one precise Airport landing and native continuation;
Arabic phone emulation confirms the compact map and readable interactive details.
The viewport override was reset. Physical Safari/Android and real screen readers
remain NOT TESTED. The published source remains frozen; supplemental final receipts
do not alter it or open operational workflows.
Audit, preserved failures and receipts: `docs/reviews/venue-scroll-entry.md`.
IDs: SCP-02, DSN-01/02, ACC-01, LOC-01/02/03, MED-01/04, PRV-03, REL-06.

The original 5 October implementation and dated verification below are preserved
as history; later decisions supersede its static schematic and Waze presentation.

PR #41 follow-ups; organizer decisions ORG-033–036. IDs: SCP-02, CFG-01,
LOC-01/03, ACC-01, PRV-01/07, CMS-04 and REL-01. This public information slice
does not alter registration, booking, approval, discount or payment logic.

## Presentation and privacy

Dates & venue names King Faisal Conference Center in its full EN/AR location
sentence. Getting there uses the existing purple/ivory/lilac/gold design system,
with original inline SVG artwork delivered by the site's server. Separate phone
and desktop layouts keep labels readable. Geography is north up with the Red Sea
to the west in both locales; Arabic text shapes in RTL without reflecting glyphs
or geographic positions. The localized alternative explains the landmarks and
arrival options, and the caption explicitly states that the map is not to scale.

JED and its Haramain station share one marker. The railway extends south to
Jeddah Al-Sulaymaniyah; the venue pin and its adjacent label sit in the KAU campus
area. Abdullah Sulayman St is the only named road, from the approved address;
other main roads are unlabelled. The schematic conveys general orientation,
not a precise driving route. No inferred coordinates, distances or train schedules.

There is no iframe, map SDK/API key, external asset or map tracking. Map links
are plain anchors, use `noopener noreferrer` and `referrerPolicy="no-referrer"`,
and open the provider only when activated. Google/Apple destinations and Waze
address search derive from the same venue name/address/locality/postcode, encoded
as one query value. Waze search lets the visitor select the matching place.
Existing site's own-origin production observability is unchanged.

Airport cards describe taxi/Uber/Careem, Airport → Jeddah Al-Sulaymaniyah Haramain
followed by a taxi, and airport car rental. The organizer-confirmed 35–40-minute
car estimate appears on taxi and rental only. Six confirmed venue items cover
entry gate, QR ticket, accessible parking, organizer accessibility support, prayer
areas/food and potentially unreliable Wi-Fi. The localized contact-form phrase is
an internal link. Parking does not imply step-free or lift access in the building.

International attendees see Saudi local time (UTC+3) and the organizer's explicit
visa responsibility/no invitation-letter policy. There is no visa-link field or link.
Confirmed dates, calendar, original directions and pending session/door/room status
remain. No new client state, event listener, animation or data fetch.

## Typed configuration

`ConferenceVenue` in `src/config/conference.ts` retains optional fields so only
supplied, nonblank guidance in the selected locale renders:

| Field | Type and purpose | Current value |
| --- | --- | --- |
| `travelTimes.taxi` / `travelTimes.rental` | `{ en, ar }` guidance for the corresponding card | Confirmed 35–40-minute car estimate |
| `travelTimes.train` | Optional `{ en, ar }` guidance | Absent; no duration rendered |
| `atVenue.entryGate` | Main Gate (Wing Gate) / بوابة الطير guidance | Confirmed; no university-gate checks |
| `atVenue.ticket` | Conference entrance QR-ticket guidance | Confirmed; save on phone |
| `atVenue.parking` | Parking guidance | Confirmed; includes accessible spaces |
| `atVenue.accessibility` | Organizer support guidance | Confirmed; contact phrase linked by locale |
| `atVenue.onSite` | Prayer areas and food | Confirmed |
| `atVenue.wifi` | Wi-Fi reliability and offline ticket guidance | Confirmed |

The At the venue section hides if all values are absent/blank in the current
locale; there are no placeholders or English fallback for missing Arabic.
Accessibility guidance inserts a link only where the localized contact-form phrase
occurs in supplied text. ORG-035 removes the earlier optional visa URL entirely.
These organizer-supplied public facts do not open any operational workflow.

## Primary references

- [Google Maps URL guide](https://developers.google.com/maps/documentation/urls/get-started),
  [Apple unified map URLs](https://developer.apple.com/documentation/mapkit/unified-map-urls),
  [Waze deep links](https://developers.google.com/waze/deeplinks): encoded address links.
- [Airport operator](https://www.kaia.sa/About-KAIA),
  [Saudi Press Agency on the airport railway station](https://www.spa.gov.sa/en/w2586844),
  [Haramain's Jeddah station](https://sar.hhr.sa/-/jeddah): airport and station names.
- Current organizer decisions ORG-035/036 supersede the original schematic and
  optional-field state. The approved address supplies the sole named road.

## Verification and handoff

Observed on Node 24.21.0 / pnpm 11.19.0 against the final local production build:

| Command/check | Result | Evidence and limits |
| --- | --- | --- |
| `pnpm check` | PASS | Lint, route types/TypeScript, 2,042 unit tests in 46 files and 65-page build; exit 0. Repeated after the north-marker correction. |
| `pnpm exec playwright test tests/e2e/dates-venue.spec.ts tests/e2e/venue-travel.spec.ts tests/e2e/organizer-public-decisions.spec.ts tests/e2e/public-shell.spec.ts --reporter=list,html,json` | PASS | Final run: 62 passed, two duplicate width-matrix skips, zero failed/flaky; exit 0. Existing dates, calendar, directions, copy/privacy, keyboard, RTL, enlarged-text and reduced-motion assertions retained. |
| Approved copy/config and map URLs | PASS | Independent verbatim organizer fixtures check all six items, exactly two taxi/rental estimates, no train estimate, exact visa policy with no link and localized contact links. Empty/omitted/blank/partial values stay hidden without English fallback; reserved-character/Unicode destinations cannot inject query parameters. |
| SVG geometry | PASS | Actual whole-label boxes and shaped-line boxes do not overlap independent labels; sampled line segments plus stroke width do not cross text. ViewBox bounds, campus-label/pin containment, positive horizontal transform and explicit LTR SVG preserve geography. EN/AR phone matrix: 320/360/390/430px; desktop also checked. |
| Third-party request regression | PASS | Four EN/AR phone/desktop tests monitor all request origins from before navigation through fonts/hydration, scrolling, map-link focus/Tab and local language changes; the external list is empty. No iframe or provider resource hints; no provider link activated. |
| Axe on Dates & venue | PASS for automated violations | Four dedicated travel scans and existing affected-page scans have zero violations. Incomplete `aria-prohibited-attr` and `color-contrast` items are retained for manual assessment; this is not complete WCAG certification. |
| Screenshots/browser inspection | PASS for this local build | Four EN/AR phone/desktop full-page screenshots, visually reviewed with map closeups. agent-browser inspected both localized pages/navigation without browser errors. |
| React/source/scope review and `git diff --check` | PASS | Pure static server rendering, stable keys, escaped guidance text and normal anchors; no client state/effect/fetch, backend/permission or package/lock changes. |
| Physical devices, screen reader and external-provider routing | NOT TESTED | Viewport emulation, DOM/axe and visual inspection are local evidence; no door-level route accuracy inferred. |
| Native database fixtures | NOT TESTED locally | No database/authorization change; isolated hosted CI runs these checks independently. |

The first browser run caught the phone north letter intersecting the coast in both
locales. Moving the north cue into the sea area corrected it, then `pnpm check`
and the entire affected browser set passed. No assertion was weakened, no retry
added and no timeout increased. Screenshot capture resets focus/scroll only after
keyboard and full-page reading/privacy assertions.

Ignored evidence: `deliverables/venue-confirmed-2026-10-05/` contains final logs,
JSON/HTML report, four screenshots, four axe JSON files, browser evidence and review
ZIP. First-failure reports/traces are retained there; earlier PR #41 evidence remains
under `deliverables/venue-travel-2026-10-05/`.

Hosted status is checked for the exact pushed head in
[PR #41 checks](https://github.com/xpexellent-dotcom/msrc-2027/pull/41/checks)
before task completion; its receipt is saved with the local handoff and PR description.
Local passes do not establish hosted CI success. No merge or production publication.

## Rollback and next task

Revert the current application/content/test change to restore the earlier guidance
and schematic. No database or hosted configuration rollback is required. Retain
the organizer decision log. Next: organizer visual review and any separately
confirmed session/door/room details.
