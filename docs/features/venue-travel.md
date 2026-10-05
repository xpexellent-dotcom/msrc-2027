# Getting there — 5 October 2026

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
