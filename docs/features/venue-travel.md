# Getting there — 5 October 2026

PR #41 follow-up; organizer decisions ORG-033/034. IDs: SCP-02, CFG-01,
LOC-01/03, ACC-01, PRV-01/07, CMS-04 and REL-01. This public information slice
does not alter registration, booking, approval, discount or payment logic.

## Presentation and privacy

Dates & venue now names the conference center in its full EN/AR location sentence.
Getting there uses the existing purple/ivory/lilac/gold design system, with original
inline SVG artwork delivered by the site's server. Separate phone/desktop geometry
keeps labels readable; geography remains north-up with the Red Sea to the west.
Arabic labels shape normally in RTL and are never reflected as image glyphs.
The map is explicitly not to scale and has a localized title/route text alternative.
It shows JED, the airport and Jeddah Al-Sulaymaniyah Haramain stations, KAU, the
conference center, road connections and the final taxi connection.

There is no iframe, map SDK/API key, external asset or map tracking. Links are plain
anchors rather than prefetching framework links, use `noopener noreferrer` and
`referrerPolicy="no-referrer"`, and open the selected provider only when activated.
Google/Apple destinations and Waze address search derive from the same English
venue name/address/locality/postcode, safely encoded as a single query value.
Waze search lets the visitor select the matching place; no coordinates/Place ID
are inferred. Existing site's own-origin production observability is unchanged.

Airport cards describe taxi/Uber/Careem, the Airport → Jeddah Al-Sulaymaniyah
Haramain connection followed by a taxi, and airport car rental. They publish no
distance, duration, price or timetable. Saudi local time is labelled UTC+3.
Confirmed dates, calendar, existing directions and pending session/door/room status
remain available. No new client state, event listener, animation or data fetch.

## Optional configuration

`ConferenceVenue` in `src/config/conference.ts` has these optional fields:

| Field | Type and purpose | Current value |
| --- | --- | --- |
| `travelTimes` | Partial record of `taxi`, `train`, `rental` → `{ en, ar }` guidance text. Only supplied, nonblank text for the selected locale renders on that mode's card. | Empty object |
| `atVenue.entryGate` | `{ en, ar }` entry-gate guidance | Unset |
| `atVenue.parking` | `{ en, ar }` parking guidance | Unset |
| `atVenue.entrances` | `{ en, ar }` entrance guidance | Unset |
| `atVenue.accessibility` | `{ en, ar }` accessibility guidance | Unset |
| `atVenue.prayerAreas` | `{ en, ar }` prayer-area guidance | Unset |
| `atVenue.food` | `{ en, ar }` food guidance | Unset |
| `atVenue.wifi` | `{ en, ar }` Wi-Fi guidance | Unset |
| `visaInformationUrl` | Official organizer-supplied URL; shared destination with localized link/accessible label | `null` |

The `atVenue` object is currently empty. The whole At the venue section stays hidden
unless at least one item has nonblank text in the current locale. Missing/blank Arabic
values do not fall back to English; there are no public placeholders. Organizers must
supply accurate bilingual guidance and verify an official visa URL before filling
these fields. Optional configuration does not infer accessibility/parking services.

## Primary references

- [Google Maps URL guide](https://developers.google.com/maps/documentation/urls/get-started),
  [Apple unified map URLs](https://developer.apple.com/documentation/mapkit/unified-map-urls),
  [Waze deep links](https://developers.google.com/waze/deeplinks): encoded address links.
- [Airport operator](https://www.kaia.sa/About-KAIA),
  [Saudi Press Agency on the airport railway station](https://www.spa.gov.sa/en/w2586844),
  [Haramain's Jeddah station](https://sar.hhr.sa/-/jeddah): airport and station names.
- [Airport transport page](https://www.kaia.sa/Parking-and-Transport) and
  [primary Souq7 issuer location brochure, page 6](https://souq7.sa/wp-content/uploads/2022/03/Souq-7-Brochure-AR.pdf):
  broad road/landmark topology only. Source distances/times are not reused.

## Verification and handoff

Observed on Node 24.21.0 / pnpm 11.19.0 using the local production build:

| Command/check | Result | Evidence and limits |
| --- | --- | --- |
| `pnpm check` | PASS | Lint, route types/TypeScript, 2,040 unit tests in 46 files and the 65-page build; exit 0. Repeated after the portrait-map correction. |
| `pnpm exec playwright test tests/e2e/dates-venue.spec.ts tests/e2e/venue-travel.spec.ts tests/e2e/organizer-public-decisions.spec.ts tests/e2e/public-shell.spec.ts --reporter=list,html,json` | PASS | Final affected run: 62 passed, two duplicate width-matrix skips, zero failed/flaky; exit 0. Includes dates/calendar/directions, localization, metadata, public copy, layout, keyboard and reduced motion. |
| Provider URL and optional-field unit tests | PASS | Reserved-character/Unicode query encoding cannot add another parameter; no coordinates invented. Empty/omitted/blank values, partial guidance, all seven venue fields and all three travel modes covered in EN/AR, with no English fallback for absent Arabic. |
| Third-party request regression | PASS | Four EN/AR phone/desktop tests record every request origin from before navigation through fonts/hydration, scrolling, map-button focus/Tab and local language navigation; the external request list remains empty. No iframe or external provider resource hints. Provider pages themselves are not opened. |
| SVG label bounds, campus containment and pin overlap | PASS | Checks actual rendered glyph bounds in EN/AR desktop/phone and at 320px; no map-label clipping or campus-label/pin overlap. |
| Axe on Dates & venue | PASS for automated violations | Four dedicated travel scans and existing dates-page scans have zero violations. Incomplete `aria-prohibited-attr` and `color-contrast` items remain recorded for manual assessment; this is not a complete WCAG certification. |
| Screenshots and browser inspection | PASS for this local build | Four final EN/AR phone/desktop full-page screenshots, visually reviewed with map closeups. agent-browser also verified both localized pages and expected navigation with no browser errors. |
| React/source/scope review; `git diff --check` | PASS | Static server components with stable keys; no added client state/effects/fetches, backend/permission changes or package/lock changes. |
| Physical devices, screen reader and actual external-provider routing | NOT TESTED | Viewport emulation and DOM/axe/visual review are the local evidence. No inferred coordinates or verified door-level routing. |
| Native database fixture suites | NOT TESTED locally | No schema/authorization changes; isolated hosted CI runs them independently. |

Visual review caught an initial portrait pin/campus-label overlap and a station label
crossing the rail line. The portrait canvas/campus spacing was revised and label lines
shortened, then `pnpm check` and the entire affected browser set rerun successfully.
Rendered geometry assertions preserve this recovery. Screenshot capture clears focus
and scrolls to the top only after all keyboard/privacy assertions; no checks were
weakened and no timeout/retry changes were made.

Ignored local evidence: `deliverables/venue-travel-2026-10-05/` contains the final
check/browser logs, JSON/HTML report, four screenshots, four axe JSON files,
`browser-evidence.json`, screenshot index and review ZIP. Hosted status is checked
for the exact pushed head in [PR #41 checks](https://github.com/xpexellent-dotcom/msrc-2027/pull/41/checks)
before task completion; its receipt is saved with this handoff and in the PR description.
Local passes do not establish hosted CI success. No merge/production publication.

## Rollback and next task

Revert the Getting there application/content/test change to remove the schematic,
travel links/cards and optional configuration. No database or hosted configuration
rollback is required. Retain the organizer decisions and full venue sentence.
Next: organizer review of EN/AR visuals; supply optional venue/visa details only
when confirmed. Session/door/room timings remain a separate decision.
